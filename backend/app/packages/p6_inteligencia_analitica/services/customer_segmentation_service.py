import math
import os
import random
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

import joblib
import numpy as np
import pandas as pd
from fastapi import HTTPException, status
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session

from app.core.database import engine
from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p0_saas_plataforma.services.quota_service import (
    FeatureNotAllowedException,
    validate_ai_access,
)
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p1_gestion_usuarios_acceso.schemas.enums import GenderEnum, RolEnum
from app.packages.p5_gestion_ventas_pos.models.garment_exchange import GarmentExchange
from app.packages.p5_gestion_ventas_pos.models.garment_return import GarmentReturn
from app.packages.p5_gestion_ventas_pos.models.sale import Sale
from app.packages.p5_gestion_ventas_pos.schemas.sales_schema import SaleStatusEnum
from app.packages.p6_inteligencia_analitica.models.customer_segment import CustomerSegment
from app.packages.p6_inteligencia_analitica.models.ml_model import MLModel
from app.packages.p6_inteligencia_analitica.models.synthetic_dataset import SyntheticDataset
from app.packages.p6_inteligencia_analitica.schemas.customer_segmentation_schema import (
    CentroidMetrics,
    ClusterProfileSummary,
    CustomerSegmentItem,
    CustomerSegmentListResponse,
    ScatterPoint,
    SegmentationScatterResponse,
    SegmentationTrainRequest,
    SegmentationTrainResponse,
)

MODELS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "data",
    "models",
)


def _ensure_tables_exist():
    """Garantiza la creación idempotente de tablas para clustering."""
    MLModel.__table__.create(bind=engine, checkfirst=True)
    CustomerSegment.__table__.create(bind=engine, checkfirst=True)


class CustomerSegmentationService:
    """
    Servicio de Machine Learning No Supervisado (CU24).
    Segmenta la cartera de clientes de la tienda mediante K-Means sobre vectores
    de comportamiento RFM+D (Recencia, Frecuencia, Monto Monetario y Tasa de Retorno/Cambio).
    """

    @classmethod
    def train_segmentation(
        cls,
        db: Session,
        tenant_id: UUID,
        request: SegmentationTrainRequest,
    ) -> SegmentationTrainResponse:
        _ensure_tables_exist()

        # 1. Validación de suscripción del SaaS (Plan Pro / Empresarial)
        try:
            validate_ai_access(db, tenant_id)
        except FeatureNotAllowedException as e:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=e.message,
            )

        # 2. Extracción de vectores de características de clientes
        customer_records, data_source = cls._extract_customer_features(
            db=db,
            tenant_id=tenant_id,
            use_synthetic_fallback=request.use_synthetic_fallback,
            random_state=request.random_state,
        )

        n_samples = len(customer_records)
        k = request.k_clusters
        if n_samples < k:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La cantidad de clientes disponibles ({n_samples}) es menor que el número de clústeres solicitados ({k}).",
            )

        # 3. Preparación de matriz numérica (R, F, M, D)
        feature_matrix = np.array([
            [
                float(rec["recency_days"]),
                float(rec["frequency_count"]),
                float(rec["monetary_total"]),
                float(rec["return_rate"]),
            ]
            for rec in customer_records
        ], dtype=float)

        # 4. Estandarización con StandardScaler
        scaler = StandardScaler()
        scaled_features = scaler.fit_transform(feature_matrix)

        # 5. Algoritmo K-Means con k-means++
        kmeans = KMeans(
            n_clusters=k,
            init="k-means++",
            n_init=10,
            random_state=request.random_state,
        )
        labels = kmeans.fit_predict(scaled_features)

        # 6. Cálculo de métricas de calidad (Silhouette score e Inercia)
        unique_labels = np.unique(labels)
        if len(unique_labels) > 1 and n_samples > k:
            sil_score = float(round(silhouette_score(scaled_features, labels), 4))
        else:
            sil_score = 0.50

        inertia_val = float(round(kmeans.inertia_, 2))

        # 7. Asignación de perfiles de negocio e interpretación de centroides
        unscaled_centroids = []
        for cluster_idx in range(k):
            mask = (labels == cluster_idx)
            if np.any(mask):
                centroid_mean = feature_matrix[mask].mean(axis=0)
            else:
                centroid_mean = np.zeros(4)
            unscaled_centroids.append(centroid_mean)

        profiles_summary = cls._assign_cluster_profiles(
            k=k,
            unscaled_centroids=unscaled_centroids,
            labels=labels,
            total_customers=n_samples,
        )

        # 8. Persistir modelo activo en `ml_models`
        os.makedirs(MODELS_DIR, exist_ok=True)
        model_version = f"kmeans-v{datetime.now().strftime('%Y%m%d%H%M')}"
        model_filename = f"kmeans_segmentation_{tenant_id}_{uuid.uuid4().hex[:8]}.joblib"
        model_path = os.path.join(MODELS_DIR, model_filename)

        model_artifacts = {
            "scaler": scaler,
            "kmeans": kmeans,
            "profiles": [p.model_dump() for p in profiles_summary],
            "k_clusters": k,
            "silhouette_score": sil_score,
            "inertia": inertia_val,
        }
        joblib.dump(model_artifacts, model_path)

        # Desactivar modelos anteriores del tenant
        db.query(MLModel).filter(
            MLModel.tenant_id == tenant_id,
            MLModel.model_type == "KMEANS_CLUSTERING",
        ).update({"is_active": False})

        ml_model = MLModel(
            tenant_id=tenant_id,
            name=f"Segmentación K-Means ({k} Clusters)",
            model_type="KMEANS_CLUSTERING",
            version=model_version,
            metrics={
                "k_clusters": k,
                "silhouette_score": sil_score,
                "inertia": inertia_val,
                "total_customers": n_samples,
                "data_source": data_source,
                "profiles": [p.model_dump() for p in profiles_summary],
            },
            model_path=model_path,
            is_active=True,
        )
        db.add(ml_model)

        # 9. Actualizar asignaciones en `customer_segments`
        db.query(CustomerSegment).filter(CustomerSegment.tenant_id == tenant_id).delete()

        cluster_name_map = {p.cluster_id: p.name for p in profiles_summary}

        for idx, rec in enumerate(customer_records):
            assigned_cluster = int(labels[idx])
            segment_row = CustomerSegment(
                tenant_id=tenant_id,
                user_id=rec["user_id"],
                cluster_id=assigned_cluster,
                segment_label=cluster_name_map.get(assigned_cluster, f"Cluster {assigned_cluster}"),
                recency_days=int(round(rec["recency_days"])),
                frequency_count=int(rec["frequency_count"]),
                monetary_total=Decimal(str(round(rec["monetary_total"], 2))),
                return_rate=Decimal(str(round(rec["return_rate"], 2))),
            )
            db.add(segment_row)

        db.commit()
        db.refresh(ml_model)

        return SegmentationTrainResponse(
            model_id=str(ml_model.id),
            model_version=model_version,
            tenant_id=str(tenant_id),
            trained_at=ml_model.trained_at or datetime.now(),
            total_customers_analyzed=n_samples,
            k_clusters=k,
            silhouette_score=sil_score,
            inertia=inertia_val,
            data_source=data_source,
            clusters=profiles_summary,
        )

    @classmethod
    def get_status(cls, db: Session, tenant_id: UUID) -> Dict[str, Any]:
        """Obtiene el estado del último modelo de clustering entrenado."""
        _ensure_tables_exist()
        active_model = (
            db.query(MLModel)
            .filter(
                MLModel.tenant_id == tenant_id,
                MLModel.model_type == "KMEANS_CLUSTERING",
                MLModel.is_active.is_(True),
            )
            .order_by(MLModel.trained_at.desc())
            .first()
        )
        if not active_model:
            return {
                "has_trained_model": False,
                "model": None,
            }

        return {
            "has_trained_model": True,
            "model": {
                "model_id": str(active_model.id),
                "name": active_model.name,
                "version": active_model.version,
                "trained_at": active_model.trained_at.isoformat() if active_model.trained_at else None,
                "metrics": active_model.metrics,
            },
        }

    @classmethod
    def get_scatter_points(
        cls,
        db: Session,
        tenant_id: UUID,
        limit: int = 300,
    ) -> SegmentationScatterResponse:
        """Retorna coordenadas RFM+D de clientes para el gráfico de dispersión 2D."""
        _ensure_tables_exist()

        active_model = (
            db.query(MLModel)
            .filter(
                MLModel.tenant_id == tenant_id,
                MLModel.model_type == "KMEANS_CLUSTERING",
                MLModel.is_active.is_(True),
            )
            .order_by(MLModel.trained_at.desc())
            .first()
        )

        segments = (
            db.query(CustomerSegment, User)
            .join(User, CustomerSegment.user_id == User.id)
            .filter(CustomerSegment.tenant_id == tenant_id)
            .limit(limit)
            .all()
        )

        color_palette = {
            0: "#10b981",  # emerald
            1: "#3b82f6",  # blue
            2: "#f59e0b",  # amber
            3: "#ef4444",  # rose/red
            4: "#8b5cf6",  # purple
            5: "#06b6d4",  # cyan
        }

        points: List[ScatterPoint] = []
        for seg, usr in segments:
            cid = seg.cluster_id
            points.append(
                ScatterPoint(
                    customer_id=str(seg.user_id),
                    customer_name=usr.name or usr.email.split("@")[0],
                    recency_days=float(seg.recency_days or 0),
                    frequency_count=float(seg.frequency_count or 0),
                    monetary_total=float(seg.monetary_total or 0.0),
                    return_rate=float(seg.return_rate or 0.0),
                    cluster_id=cid,
                    cluster_name=seg.segment_label,
                    color=color_palette.get(cid % len(color_palette), "#6b7280"),
                )
            )

        k_clusters = 4
        sil_score = 0.50
        if active_model and active_model.metrics:
            k_clusters = active_model.metrics.get("k_clusters", 4)
            sil_score = active_model.metrics.get("silhouette_score", 0.50)

        return SegmentationScatterResponse(
            tenant_id=str(tenant_id),
            k_clusters=k_clusters,
            total_points=len(points),
            silhouette_score=sil_score,
            points=points,
        )

    @classmethod
    def get_customers_in_segment(
        cls,
        db: Session,
        tenant_id: UUID,
        cluster_id: Optional[int] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> CustomerSegmentListResponse:
        """Consulta paginada de clientes clasificados por segmento."""
        _ensure_tables_exist()

        query = (
            db.query(CustomerSegment, User)
            .join(User, CustomerSegment.user_id == User.id)
            .filter(CustomerSegment.tenant_id == tenant_id)
        )

        if cluster_id is not None:
            query = query.filter(CustomerSegment.cluster_id == cluster_id)

        total_count = query.count()
        offset = (page - 1) * page_size
        results = query.order_by(CustomerSegment.monetary_total.desc()).offset(offset).limit(page_size).all()

        items = [
            CustomerSegmentItem(
                id=str(seg.id),
                user_id=str(seg.user_id),
                customer_name=usr.name or usr.email.split("@")[0],
                customer_email=usr.email,
                cluster_id=seg.cluster_id,
                segment_label=seg.segment_label,
                recency_days=seg.recency_days,
                frequency_count=seg.frequency_count,
                monetary_total=float(seg.monetary_total) if seg.monetary_total else None,
                return_rate=float(seg.return_rate) if seg.return_rate else None,
                assigned_at=seg.assigned_at,
            )
            for seg, usr in results
        ]

        return CustomerSegmentListResponse(
            total=total_count,
            page=page,
            page_size=page_size,
            cluster_id=cluster_id,
            customers=items,
        )

    # =========================================================================
    # Métodos Internos de Extracción y Perfilamiento
    # =========================================================================

    @classmethod
    def _extract_customer_features(
        cls,
        db: Session,
        tenant_id: UUID,
        use_synthetic_fallback: bool,
        random_state: int,
    ) -> Tuple[List[Dict[str, Any]], str]:
        """
        Extrae o computa las 4 variables RFM+D para cada cliente del tenant.
        Si la cantidad de clientes reales con compras es inferior a 10, conmuta
        hacia el dataset sintético calibrado en CU22 o genera cohortes sintéticas asistidas.
        """
        # Consulta transacciones reales
        sales = (
            db.query(Sale)
            .filter(
                Sale.tenant_id == tenant_id,
                Sale.status == SaleStatusEnum.completed,
            )
            .all()
        )

        # Mapeo por usuario
        customer_sales: Dict[UUID, List[Sale]] = {}
        for s in sales:
            if s.user_id:
                customer_sales.setdefault(s.user_id, []).append(s)

        # Si tenemos al menos 10 clientes con compras reales, usamos datos reales
        if len(customer_sales) >= 10:
            now = datetime.now()
            records = []
            for uid, user_sales in customer_sales.items():
                dates = [s.created_at for s in user_sales if s.created_at]
                max_date = max(dates) if dates else now
                recency = max(1, (now - max_date).days)
                frequency = len(user_sales)
                monetary = sum(float(s.total_amount) for s in user_sales)

                # Devoluciones y cambios vinculados a las ventas de este usuario
                sale_ids = [s.id for s in user_sales]
                returns_count = db.query(GarmentReturn).filter(GarmentReturn.sale_id.in_(sale_ids)).count()
                exchanges_count = db.query(GarmentExchange).filter(GarmentExchange.original_sale_id.in_(sale_ids)).count()

                return_rate = min(1.0, (returns_count + exchanges_count) / max(1, frequency))

                records.append({
                    "user_id": uid,
                    "recency_days": recency,
                    "frequency_count": frequency,
                    "monetary_total": monetary,
                    "return_rate": return_rate,
                })
            return records, "REAL_TRANSACTIONS"

        # Conmutación a Fallback Sintético (CU22)
        if use_synthetic_fallback:
            return cls._build_features_from_synthetic_or_stochastic(db, tenant_id, random_state)

        # Si no se permite fallback y no hay suficientes datos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El tenant cuenta con solo {len(customer_sales)} clientes con ventas reales. Se requieren al menos 10 o habilitar 'use_synthetic_fallback'.",
        )

    @classmethod
    def _build_features_from_synthetic_or_stochastic(
        cls,
        db: Session,
        tenant_id: UUID,
        random_state: int,
    ) -> Tuple[List[Dict[str, Any]], str]:
        """
        Construye una cohorte estructurada de clientes (~50 clientes) a partir
        del dataset sintético exportado por CU22 o genera perfiles probabilísticos textiles.
        """
        latest_dataset = (
            db.query(SyntheticDataset)
            .filter(SyntheticDataset.tenant_id == tenant_id)
            .order_by(SyntheticDataset.created_at.desc())
            .first()
        )

        n_cohort = 50
        users = cls._ensure_customer_users(db, tenant_id, n_cohort)
        np.random.seed(random_state)
        random.seed(random_state)

        # Si existe el CSV de CU22, extraemos distribuciones de precios y políticas
        avg_price = 120.0
        return_rate_base = 0.12
        if latest_dataset and latest_dataset.file_path and os.path.exists(latest_dataset.file_path):
            try:
                df = pd.read_csv(latest_dataset.file_path)
                if not df.empty and "total_price" in df.columns:
                    avg_price = float(df["total_price"].mean())
                    return_rate_base = float(df["has_return"].mean() + df["has_exchange"].mean())
            except Exception:
                pass

        records = []
        for i, u in enumerate(users):
            # 4 Arquetipos conductuales de moda textil
            archetype = i % 4
            if archetype == 0:  # VIP / Embajadores
                recency = int(np.random.randint(2, 25))
                frequency = int(np.random.randint(12, 35))
                monetary = round(frequency * avg_price * float(np.random.uniform(1.4, 2.5)), 2)
                return_rate = round(float(np.random.uniform(0.01, 0.08)), 2)
            elif archetype == 1:  # Compradores de Temporada
                recency = int(np.random.randint(15, 60))
                frequency = int(np.random.randint(5, 14))
                monetary = round(frequency * avg_price * float(np.random.uniform(0.9, 1.3)), 2)
                return_rate = round(float(np.random.uniform(0.05, 0.15)), 2)
            elif archetype == 2:  # Cazadores de Ofertas
                recency = int(np.random.randint(45, 150))
                frequency = int(np.random.randint(1, 5))
                monetary = round(frequency * avg_price * float(np.random.uniform(0.5, 0.85)), 2)
                return_rate = round(float(np.random.uniform(0.02, 0.12)), 2)
            else:  # Perfil de Alto Retorno / Cambios de Talla Frecuentes
                recency = int(np.random.randint(10, 45))
                frequency = int(np.random.randint(6, 18))
                monetary = round(frequency * avg_price * float(np.random.uniform(1.0, 1.5)), 2)
                return_rate = round(float(np.random.uniform(0.40, 0.75)), 2)

            records.append({
                "user_id": u.id,
                "recency_days": recency,
                "frequency_count": frequency,
                "monetary_total": monetary,
                "return_rate": return_rate,
            })

        return records, "SYNTHETIC_DATASET_CU22"

    @classmethod
    def _ensure_customer_users(
        cls,
        db: Session,
        tenant_id: UUID,
        needed_count: int = 50,
    ) -> List[User]:
        """Asegura la existencia de registros de clientes para satisfacer FK en PostgreSQL."""
        existing = (
            db.query(User)
            .filter(User.tenant_id == tenant_id, User.rol == RolEnum.cliente)
            .limit(needed_count)
            .all()
        )
        if len(existing) >= needed_count:
            return existing

        to_create = needed_count - len(existing)
        new_users = []
        for i in range(to_create):
            idx = len(existing) + i + 1
            u = User(
                name=f"Cliente {idx}",
                email=f"cliente{idx}_{tenant_id.hex[:6]}@fashionstore.test",
                hashed_password="mock_password_hash",
                gender=GenderEnum.femenino if i % 2 == 0 else GenderEnum.masculino,
                rol=RolEnum.cliente,
                tenant_id=tenant_id,
                is_active=True,
            )
            db.add(u)
            new_users.append(u)

        db.commit()
        for nu in new_users:
            db.refresh(nu)

        return existing + new_users

    @classmethod
    def _assign_cluster_profiles(
        cls,
        k: int,
        unscaled_centroids: List[np.ndarray],
        labels: np.ndarray,
        total_customers: int,
    ) -> List[ClusterProfileSummary]:
        """
        Asigna nombres, descripciones y acciones comerciales a cada clúster basándose
        en las coordenadas medias de sus centroides en el espacio RFM+D original.
        """
        profiles: List[ClusterProfileSummary] = []

        # Arreglos de centroides
        # [R, F, M, D]
        centroids_arr = np.array(unscaled_centroids)
        r_vals = centroids_arr[:, 0]
        f_vals = centroids_arr[:, 1]
        m_vals = centroids_arr[:, 2]
        d_vals = centroids_arr[:, 3]

        # Índices ordenados por métricas dominantes
        high_return_idx = int(np.argmax(d_vals))
        high_monetary_idx = int(np.argmax(m_vals))

        remaining = [i for i in range(k) if i not in [high_return_idx, high_monetary_idx]]
        if remaining:
            high_recency_idx = remaining[int(np.argmax(r_vals[remaining]))]
        else:
            high_recency_idx = -1

        assigned_indices = {
            high_return_idx: "HIGH_RETURN",
            high_monetary_idx: "VIP",
        }
        if high_recency_idx >= 0:
            assigned_indices[high_recency_idx] = "OFFERS"

        for cluster_id in range(k):
            count = int(np.sum(labels == cluster_id))
            pct = round((count / max(1, total_customers)) * 100, 1)
            c = unscaled_centroids[cluster_id]

            centroid_metric = CentroidMetrics(
                recency_days=round(float(c[0]), 1),
                frequency_count=round(float(c[1]), 1),
                monetary_total=round(float(c[2]), 2),
                return_rate=round(float(c[3]), 3),
            )

            profile_type = assigned_indices.get(cluster_id, "SEASON")

            if profile_type == "HIGH_RETURN" and float(c[3]) >= 0.25:
                name = "Perfil de Alto Retorno"
                description = "Clientes con frecuencia moderada pero tasa de devolución o cambio de talla superior al 30%."
                action = "Asistencia personalizada de tallas en probador virtual AR y recordatorio de política de retención 20-50%."
                badge_color = "rose"
                badge_icon = "AlertTriangle"
            elif profile_type == "VIP":
                name = "Clientes VIP / Embajadores"
                description = "Clientes leales con el mayor gasto acumulado y frecuencia de compra sostenida en el año."
                action = "Invitaciones exclusivas a preventas privadas, catálogo de alta gama y atención preferencial."
                badge_color = "emerald"
                badge_icon = "Crown"
            elif profile_type == "OFFERS":
                name = "Cazadores de Ofertas"
                description = "Clientes sensibles al precio con alta recencia (días sin comprar) y menor ticket promedio."
                action = "Campañas de saldo de inventario, descuentos por liquidación y cupones de reactivación."
                badge_color = "amber"
                badge_icon = "Tag"
            else:
                name = "Compradores de Temporada"
                description = "Compras concentradas en cambios de estación (otoño/invierno o primavera/verano)."
                action = "Notificaciones push al lanzamiento de nuevas colecciones textiles y promociones estacionales."
                badge_color = "blue"
                badge_icon = "Calendar"

            profiles.append(
                ClusterProfileSummary(
                    cluster_id=cluster_id,
                    name=name,
                    description=description,
                    recommended_action=action,
                    customer_count=count,
                    percentage=pct,
                    centroid=centroid_metric,
                    badge_color=badge_color,
                    badge_icon=badge_icon,
                )
            )

        return profiles
