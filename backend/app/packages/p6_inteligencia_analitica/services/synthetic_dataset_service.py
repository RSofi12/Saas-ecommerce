import io
import os
import random
import uuid
from datetime import datetime, timedelta
from typing import Any, Tuple
from uuid import UUID

import numpy as np
import pandas as pd
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import engine
from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p0_saas_plataforma.services.quota_service import (
    FeatureNotAllowedException,
    validate_ai_access,
)
from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch
from app.packages.p2_gestion_productos_catalogo.models.category import Category
from app.packages.p2_gestion_productos_catalogo.models.product import Product
from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p2_gestion_productos_catalogo.models.size import Size
from app.packages.p6_inteligencia_analitica.models.synthetic_dataset import SyntheticDataset
from app.packages.p6_inteligencia_analitica.schemas.synthetic_dataset_schema import (
    SyntheticDatasetGenerateRequest,
    SyntheticDatasetSummary,
)

SYNTHETIC_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data", "synthetic")


def _ensure_synthetic_table_exists():
    """Garantiza idempotencia en base de datos si la tabla synthetic_datasets no fue creada previamente."""
    SyntheticDataset.__table__.create(bind=engine, checkfirst=True)


class SyntheticDatasetService:

    @staticmethod
    def generate_dataset(
        db: Session,
        tenant_id: UUID,
        request: SyntheticDatasetGenerateRequest,
        generated_by: UUID | None = None,
    ) -> SyntheticDatasetSummary:
        _ensure_synthetic_table_exists()

        # 1. Validar cuota comercial de suscripción (Plan Profesional o Empresarial)
        try:
            validate_ai_access(db, tenant_id)
        except FeatureNotAllowedException as e:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=e.message,
            )

        # 2. Consultar entidades reales del tenant
        company = db.query(Company).filter(Company.id == tenant_id).first()
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Empresa no encontrada en la plataforma SaaS.",
            )

        branches = (
            db.query(Branch)
            .filter(Branch.tenant_id == tenant_id, Branch.is_active.is_(True))
            .all()
        )
        if not branches:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe registrar al menos una sucursal activa antes de generar el dataset sintético.",
            )

        products = (
            db.query(Product)
            .filter(Product.tenant_id == tenant_id)
            .all()
        )
        if not products:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe registrar productos en su catálogo antes de generar datos sintéticos.",
            )

        product_ids = [p.id for p in products]
        variants = (
            db.query(ProductVariant)
            .filter(ProductVariant.product_id.in_(product_ids))
            .all()
        )
        if not variants:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe registrar variantes por talla para sus productos antes de simular transacciones.",
            )

        # Mapa de categorías y tallas para estacionalidad y distribución
        category_ids = list(set([p.category_id for p in products if p.category_id]))
        categories = db.query(Category).filter(Category.id.in_(category_ids)).all() if category_ids else []
        cat_map = {c.id: c.name for c in categories}
        prod_map = {p.id: p for p in products}

        size_ids = list(set([v.size_id for v in variants if v.size_id]))
        sizes = db.query(Size).filter(Size.id.in_(size_ids)).all() if size_ids else []
        size_map = {s.id: s.name for s in sizes}

        # Tasa de retención por tenant (por defecto 0.30 si no está configurada)
        retention_rate = float(getattr(company, "return_retention_rate", 0.30) or 0.30)

        # 3. Inicialización estocástica
        if request.random_seed is not None:
            np.random.seed(request.random_seed)
            random.seed(request.random_seed)

        n = request.total_records
        end_date = datetime.now()
        start_date = end_date - timedelta(days=request.months_covered * 30.5)
        total_seconds = int((end_date - start_date).total_seconds())

        # Vector de fechas con ponderación de quincena y fin de semana
        random_seconds = np.random.uniform(0, total_seconds, size=n).astype(int)
        generated_dates = [start_date + timedelta(seconds=int(s)) for s in random_seconds]

        # Ajuste fino: favorecer quincenas (días 14, 15, 16) y fin de mes (28 a 31)
        adjusted_dates = []
        for dt in generated_dates:
            day = dt.day
            # Quincenas y fin de mes tienen más probabilidad
            if random.random() < 0.35 and day not in [14, 15, 16, 28, 29, 30, 31]:
                # sesgar hacia quincena o fin de mes
                new_day = random.choice([14, 15, 16, 28, 29, 30])
                try:
                    dt = dt.replace(day=new_day)
                except ValueError:
                    pass
            adjusted_dates.append(dt)

        # Distribución normal/gaussiana de tallas
        # M y L concentran el mayor volumen
        size_weights = {
            "XS": 0.05,
            "S": 0.15,
            "M": 0.35,
            "L": 0.25,
            "XL": 0.15,
            "XXL": 0.05,
        }

        # Preparar lista de opciones de variantes con pesos estacionales
        variant_records = []
        for v in variants:
            prod = prod_map.get(v.product_id)
            prod_name = prod.name if prod else "Prenda"
            cat_name = cat_map.get(prod.category_id, "General") if prod else "General"
            size_raw = size_map.get(v.size_id) if v.size_id else getattr(v, "size", None)
            size_upper = (size_raw or "M").strip().upper()
            base_size_weight = size_weights.get(size_upper, 0.20)
            unit_price = float(v.price) if v.price and float(v.price) > 0 else 50.0

            variant_records.append({
                "variant_id": str(v.id),
                "variant_sku": v.sku,
                "size": size_upper,
                "product_id": str(prod.id) if prod else str(v.product_id),
                "product_name": prod_name,
                "category_name": cat_name,
                "unit_price": unit_price,
                "base_size_weight": base_size_weight,
            })

        # Mapeo de sucursales
        branch_options = [{"id": str(b.id), "name": b.name} for b in branches]

        rows = []
        for i in range(n):
            dt = adjusted_dates[i]
            month = dt.month

            # Clasificación de temporada (Bolivia / Hemisferio Sur)
            is_cold_season = month in [5, 6, 7, 8]
            season_str = "cold_autumn_winter" if is_cold_season else "warm_spring_summer"

            # Ponderación estacional según categoría
            variant_choice = random.choice(variant_records)
            cat_lower = variant_choice["category_name"].lower()
            prod_lower = variant_choice["product_name"].lower()

            # En invierno, abrigos/chompas tienen más probabilidad de ser seleccionados
            if is_cold_season and any(term in cat_lower or term in prod_lower for term in ["abrigo", "chompa", "invierno", "saco", "chaqueta"]):
                if random.random() < 0.4:
                    # reafirmar selección de prenda de abrigo
                    pass
            elif not is_cold_season and any(term in cat_lower or term in prod_lower for term in ["vestido", "polera", "verano", "short", "falda"]):
                if random.random() < 0.4:
                    pass

            branch = random.choice(branch_options)
            qty = int(np.random.choice([1, 2, 3, 4], p=[0.75, 0.18, 0.05, 0.02]))
            unit_price = variant_choice["unit_price"]
            total_price = round(unit_price * qty, 2)

            # Día de quincena o fin de mes
            is_payday = 1 if dt.day in [14, 15, 16, 28, 29, 30, 31] else 0

            # Simulación de Cambio de Prenda (CU17): ~10% probabilidad
            has_exchange = 0
            exchange_diff = 0.0
            if request.include_exchanges and random.random() < 0.10:
                has_exchange = 1
                # Si cambia por otra variante de mayor precio, abona diferencia delta
                alt_variant = random.choice(variant_records)
                diff = alt_variant["unit_price"] - unit_price
                exchange_diff = round(max(0.0, diff * qty), 2)

            # Simulación de Devolución de Prenda con Retención (CU18): ~8% probabilidad
            has_return = 0
            retention_amt = 0.0
            refund_amt = 0.0
            if request.include_returns and random.random() < 0.08:
                has_return = 1
                retention_amt = round(total_price * retention_rate, 2)
                refund_amt = round(total_price - retention_amt, 2)

            rows.append({
                "transaction_id": str(uuid.uuid4()),
                "date": dt.strftime("%Y-%m-%d %H:%M:%S"),
                "year": dt.year,
                "month": dt.month,
                "day": dt.day,
                "day_of_week": dt.weekday(),
                "tenant_id": str(tenant_id),
                "branch_id": branch["id"],
                "branch_name": branch["name"],
                "product_id": variant_choice["product_id"],
                "product_name": variant_choice["product_name"],
                "category_name": variant_choice["category_name"],
                "variant_id": variant_choice["variant_id"],
                "variant_sku": variant_choice["variant_sku"],
                "size": variant_choice["size"],
                "unit_price": unit_price,
                "quantity": qty,
                "total_price": total_price,
                "season": season_str,
                "is_payday_window": is_payday,
                "has_exchange": has_exchange,
                "exchange_difference_paid": exchange_diff,
                "has_return": has_return,
                "return_retention_amount": retention_amt,
                "return_refund_amount": refund_amt,
            })

        # 4. Crear DataFrame con Pandas
        df = pd.DataFrame(rows)
        df.sort_values(by="date", inplace=True)

        # 5. Persistir archivo CSV
        os.makedirs(SYNTHETIC_DATA_DIR, exist_ok=True)
        file_tag = uuid.uuid4().hex[:8]
        file_name = f"synthetic_dataset_{tenant_id}_{file_tag}.csv"
        file_path = os.path.join(SYNTHETIC_DATA_DIR, file_name)
        df.to_csv(file_path, index=False, encoding="utf-8")

        # 6. Calcular métricas estadísticas de distribución
        total_sales_simulated = float(df["total_price"].sum())
        sizes_dist = {str(k): int(v) for k, v in df["size"].value_counts().items()}
        cat_dist = {str(k): int(v) for k, v in df["category_name"].value_counts().items()}
        return_rate = float(df["has_return"].mean())
        exchange_rate = float(df["has_exchange"].mean())

        date_min = str(df["date"].min())
        date_max = str(df["date"].max())

        # 7. Registrar en tabla de auditoría PostgreSQL
        db_dataset = SyntheticDataset(
            tenant_id=tenant_id,
            file_name=file_name,
            file_path=file_path,
            total_records=n,
            months_covered=request.months_covered,
            categories_included=cat_dist,
            sizes_distribution=sizes_dist,
            seasonal_factors={"cold_season_records": int((df["season"] == "cold_autumn_winter").sum()), "warm_season_records": int((df["season"] == "warm_spring_summer").sum())},
            return_rate_simulated=return_rate,
            exchange_rate_simulated=exchange_rate,
            generated_by=generated_by,
        )
        db.add(db_dataset)
        db.commit()
        db.refresh(db_dataset)

        download_url = f"/api/ml/synthetic-dataset/{db_dataset.id}/download"

        return SyntheticDatasetSummary(
            dataset_id=db_dataset.id,
            tenant_id=tenant_id,
            file_name=file_name,
            total_records=n,
            months_covered=request.months_covered,
            date_range={"min_date": date_min, "max_date": date_max},
            total_sales_simulated=round(total_sales_simulated, 2),
            sizes_distribution=sizes_dist,
            categories_distribution=cat_dist,
            return_rate_simulated=round(return_rate, 4),
            exchange_rate_simulated=round(exchange_rate, 4),
            download_url=download_url,
            created_at=db_dataset.created_at,
        )

    @staticmethod
    def get_latest_dataset(db: Session, tenant_id: UUID) -> SyntheticDataset | None:
        _ensure_synthetic_table_exists()
        return (
            db.query(SyntheticDataset)
            .filter(SyntheticDataset.tenant_id == tenant_id)
            .order_by(SyntheticDataset.created_at.desc())
            .first()
        )

    @staticmethod
    def get_dataset_file(db: Session, tenant_id: UUID, dataset_id: UUID) -> Tuple[str, str]:
        _ensure_synthetic_table_exists()
        dataset = (
            db.query(SyntheticDataset)
            .filter(SyntheticDataset.id == dataset_id, SyntheticDataset.tenant_id == tenant_id)
            .first()
        )
        if not dataset or not os.path.exists(dataset.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Archivo de dataset sintético no encontrado en el servidor.",
            )
        return dataset.file_path, dataset.file_name
