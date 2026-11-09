import sys
import uuid
from decimal import Decimal
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(backend_dir / ".env")

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from main import app
from app.auth.jwt import create_access_token
from app.core.database import SessionLocal
from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p0_saas_plataforma.models.plan import Plan
from app.packages.p0_saas_plataforma.models.subscription import Subscription
from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p1_gestion_usuarios_acceso.schemas.enums import RolEnum, GenderEnum
from app.packages.p2_gestion_productos_catalogo.models.product import Product
from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p5_gestion_ventas_pos.models.garment_exchange import GarmentExchange
from app.packages.p5_gestion_ventas_pos.models.garment_return import GarmentReturn
from app.packages.p5_gestion_ventas_pos.models.sale import Sale
from app.packages.p5_gestion_ventas_pos.models.sync_operation import SyncOperation
from app.packages.p6_inteligencia_analitica.models.customer_segment import CustomerSegment
from app.packages.p6_inteligencia_analitica.models.demand_forecast import DemandForecast
from app.packages.p6_inteligencia_analitica.models.ml_model import MLModel

client = TestClient(app)


def _get_admin_token_and_tenant(subdomain: str = "elegance"):
    db = SessionLocal()
    try:
        company = db.query(Company).filter(Company.subdomain == subdomain).first()
        assert company is not None, f"Company {subdomain} debe existir"

        user = (
            db.query(User)
            .filter(User.tenant_id == company.id, User.rol == RolEnum.administrador)
            .first()
        )
        assert user is not None, f"Usuario admin de {subdomain} debe existir"

        token = create_access_token(
            {
                "sub": str(user.id),
                "rol": "administrador",
                "tenant_id": str(company.id),
                "branch_id": str(user.branch_id) if user.branch_id else None,
            }
        )
        return token, company, user
    finally:
        db.close()


def _ensure_basic_company_for_cu25():
    db = SessionLocal()
    try:
        basic_plan = db.query(Plan).filter(Plan.code == "basic").first()
        if not basic_plan:
            basic_plan = Plan(
                name="Plan Básico",
                code="basic",
                max_branches=2,
                has_ai_access=False,
                price_monthly=Decimal("29.00"),
                is_active=True,
            )
            db.add(basic_plan)
            db.commit()
            db.refresh(basic_plan)
        else:
            basic_plan.has_ai_access = False
            db.commit()

        basic_company = (
            db.query(Company).filter(Company.subdomain == "boutique-basica-cu25").first()
        )
        if not basic_company:
            basic_company = Company(
                name="Boutique Básica CU25",
                business_name="Boutique Básica CU25 S.R.L.",
                nit_rut="8881234025",
                subdomain="boutique-basica-cu25",
                status="ACTIVO",
                email="contacto@basic25.com",
            )
            db.add(basic_company)
            db.commit()
            db.refresh(basic_company)

        sub = (
            db.query(Subscription)
            .filter(
                Subscription.company_id == basic_company.id,
                Subscription.status == "ACTIVA",
            )
            .first()
        )
        if not sub:
            sub = Subscription(
                company_id=basic_company.id,
                plan_id=basic_plan.id,
                status="ACTIVA",
            )
            db.add(sub)
            db.commit()

        user = (
            db.query(User)
            .filter(User.tenant_id == basic_company.id, User.email == "admin@basic25.com")
            .first()
        )
        if not user:
            user = User(
                email="admin@basic25.com",
                hashed_password="hashed_dummy_password",
                name="Admin Básico",
                rol=RolEnum.administrador,
                gender=GenderEnum.masculino,
                tenant_id=basic_company.id,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_access_token(
            {
                "sub": str(user.id),
                "rol": "administrador",
                "tenant_id": str(basic_company.id),
                "branch_id": None,
            }
        )
        return token, basic_company
    finally:
        db.close()


def test_cu25_executive_dashboard_happy_path():
    """CP-CU25-01: Consulta de Dashboard Ejecutivo con agregación y cuotas SaaS."""
    token, company, user = _get_admin_token_and_tenant("elegance")

    response = client.get(
        "/api/dashboard?period=day",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, f"Error: {response.text}"
    body = response.json()
    assert body["statusCode"] == 200
    data = body["data"]

    # Validar presencia de bloques ejecutivos completos
    assert "summary" in data
    assert "offline_sync" in data
    assert "policy_revenue" in data
    assert "ml_kpis" in data
    assert "plan_quotas" in data
    assert "sales_series" in data
    assert "branch_kpis" in data

    # Validar cuotas del plan
    quotas = data["plan_quotas"]
    assert quotas["active_branches"] >= 1
    assert quotas["max_branches"] >= 1
    assert quotas["has_ai_access"] is True


def test_cu25_offline_sync_and_policies_kpis():
    """CP-CU25-02: Conciliación de métricas offline y políticas de cambio/devolución."""
    token, company, user = _get_admin_token_and_tenant("elegance")
    db = SessionLocal()
    try:
        branch = db.query(Branch).filter(Branch.tenant_id == company.id).first()
        assert branch is not None

        # 1. Sembrar una venta offline de contingencia
        sale_id = uuid.uuid4()
        offline_sale = Sale(
            id=sale_id,
            tenant_id=company.id,
            branch_id=branch.id,
            user_id=user.id,
            client_sale_id=uuid.uuid4(),
            payment_method="cash",
            total_amount=Decimal("150.00"),
            is_offline=True,
        )
        db.add(offline_sale)
        db.flush()

        # 2. Sembrar una operación sincronizada
        sync_op = SyncOperation(
            tenant_id=company.id,
            client_operation_id=f"test-sync-{uuid.uuid4().hex[:12]}",
            operation_type="VENTA_OFFLINE",
            payload={"test": True},
            status="PROCESADO",
        )
        db.add(sync_op)

        # 3. Sembrar una devolución con retención del 30% (Política 2)
        variant = db.query(ProductVariant).filter(ProductVariant.tenant_id == company.id).first()
        if variant:
            ret = GarmentReturn(
                tenant_id=company.id,
                branch_id=branch.id,
                cashier_id=user.id,
                sale_id=sale_id,
                variant_id=variant.id,
                quantity=1,
                original_item_amount=Decimal("100.00"),
                retention_percentage=Decimal("30.00"),
                retention_amount=Decimal("30.00"),
                refund_amount=Decimal("70.00"),
                refund_method="NOTA_CREDITO",
                credit_note_code=f"NC-{uuid.uuid4().hex[:8].upper()}",
            )
            db.add(ret)

            # 4. Sembrar un cambio de prenda con cobro de diferencia (Política 1)
            exc = GarmentExchange(
                tenant_id=company.id,
                branch_id=branch.id,
                cashier_id=user.id,
                sale_id=sale_id,
                original_variant_id=variant.id,
                new_variant_id=variant.id,
                price_difference=Decimal("25.00"),
                difference_paid=True,
                payment_method="EFECTIVO",
                status="COMPLETED",
            )
            db.add(exc)

        db.commit()
    finally:
        db.close()

    response = client.get(
        "/api/dashboard?period=day",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()["data"]

    # Verificación de métricas calculadas
    offline = data["offline_sync"]
    assert offline["total_offline_sales"] >= 1
    assert offline["synced_operations"] >= 1
    assert offline["sync_success_rate"] > 0.0

    policy = data["policy_revenue"]
    assert Decimal(str(policy["return_retention_total"])) >= Decimal("30.00")
    assert Decimal(str(policy["exchange_difference_total"])) >= Decimal("25.00")


def test_cu25_ml_kpis_integration():
    """CP-CU25-03: Integración de métricas analíticas de Machine Learning (CU23 y CU24)."""
    token, company, user = _get_admin_token_and_tenant("elegance")
    db = SessionLocal()
    try:
        branch = db.query(Branch).filter(Branch.tenant_id == company.id).first()
        variant = db.query(ProductVariant).filter(ProductVariant.tenant_id == company.id).first()

        # Sembrar pronóstico de demanda de CU23
        if variant:
            df = DemandForecast(
                tenant_id=company.id,
                variant_id=variant.id,
                branch_id=branch.id if branch else None,
                forecast_period="W01-2026",
                predicted_units=42,
                confidence_lower=38,
                confidence_upper=46,
                algorithm_used="RandomForestRegressor",
            )
            db.add(df)

        # Sembrar segmento de cliente de CU24
        seg = CustomerSegment(
            tenant_id=company.id,
            user_id=user.id,
            cluster_id=0,
            segment_label="Clientes VIP",
            recency_days=5,
            frequency_count=12,
            monetary_total=Decimal("850.00"),
            return_rate=Decimal("5.00"),
        )
        db.add(seg)
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/api/dashboard?period=day",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    ml = data["ml_kpis"]

    assert ml["has_ml_access"] is True
    assert ml["predicted_monthly_units"] >= 42
    assert len(ml["rfm_segments_distribution"]) >= 1
    vip_cluster = next((s for s in ml["rfm_segments_distribution"] if s["segment_label"] == "Clientes VIP"), None)
    assert vip_cluster is not None
    assert vip_cluster["customer_count"] >= 1


def test_cu25_basic_plan_graceful_ml_handling():
    """CP-CU25-04: Manejo seguro ante Plan Básico sin acceso a ML (degradación grácil)."""
    token, basic_company = _ensure_basic_company_for_cu25()

    response = client.get(
        "/api/dashboard?period=day",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()["data"]

    # Debe retornar 200 OK sin fallar con 500, pero indicando que no tiene acceso a ML
    assert data["ml_kpis"]["has_ml_access"] is False
    assert data["plan_quotas"]["has_ai_access"] is False
    assert "BASIC" in data["plan_quotas"]["plan_name"].upper()


def test_cu25_multitenant_strict_isolation():
    """CP-CU25-05: Aislamiento multitenant estricto en la agregación de métricas."""
    token_elegance, comp_elegance, _ = _get_admin_token_and_tenant("elegance")
    token_basic, comp_basic = _ensure_basic_company_for_cu25()

    res_elegance = client.get("/api/dashboard", headers={"Authorization": f"Bearer {token_elegance}"})
    res_basic = client.get("/api/dashboard", headers={"Authorization": f"Bearer {token_basic}"})

    assert res_elegance.status_code == 200
    assert res_basic.status_code == 200

    data_el = res_elegance.json()["data"]
    data_ba = res_basic.json()["data"]

    # Las sucursales del tenant elegancia no deben aparecer en la empresa básica
    branch_ids_el = {b["branch_id"] for b in data_el["branch_kpis"]}
    branch_ids_ba = {b["branch_id"] for b in data_ba["branch_kpis"]}

    assert len(branch_ids_el.intersection(branch_ids_ba)) == 0, "No debe haber cruce de sucursales entre tenants"
