import sys
from pathlib import Path
from decimal import Decimal
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
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p1_gestion_usuarios_acceso.schemas.enums import RolEnum, GenderEnum
from app.packages.p2_gestion_productos_catalogo.models.product import Product

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
        return token, company
    finally:
        db.close()


def _ensure_basic_company_for_cu23():
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

        company = db.query(Company).filter(Company.subdomain == "basic-cu23-test").first()
        if not company:
            company = Company(
                name="Tienda Básica CU23",
                business_name="Tienda Básica CU23 S.R.L.",
                subdomain="basic-cu23-test",
                nit_rut="111222333",
                email="basic23@test.com",
                phone="77711223",
                status="ACTIVA",
            )
            db.add(company)
            db.commit()
            db.refresh(company)

        sub = db.query(Subscription).filter(Subscription.company_id == company.id).first()
        if not sub:
            sub = Subscription(
                company_id=company.id,
                plan_id=basic_plan.id,
                status="active",
            )
            db.add(sub)
            db.commit()
        else:
            sub.plan_id = basic_plan.id
            sub.status = "active"
            db.commit()

        user = db.query(User).filter(User.tenant_id == company.id, User.rol == RolEnum.administrador).first()
        if not user:
            user = User(
                tenant_id=company.id,
                name="Admin Básico",
                email="admin@basic23.test",
                hashed_password="hashed_pw_test",
                rol=RolEnum.administrador,
                gender=GenderEnum.masculino,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_access_token(
            {
                "sub": str(user.id),
                "rol": "administrador",
                "tenant_id": str(company.id),
                "branch_id": None,
            }
        )
        return token, company
    finally:
        db.close()


def test_cu23_plan_basic_forbidden_403():
    """
    CP-CU23-01: Verificación de política comercial (Plan Básico).
    Un tenant con Plan Básico no cuenta con acceso a analítica predictiva de IA.
    Esperado: HTTP 403 Forbidden.
    """
    token, _ = _ensure_basic_company_for_cu23()

    res = client.post(
        "/api/ml/demand/train",
        headers={"Authorization": f"Bearer {token}"},
        json={"use_synthetic": True, "n_estimators": 50, "max_depth": 8},
    )
    assert res.status_code == 403, f"Esperaba 403 Forbidden pero obtuve {res.status_code}: {res.text}"


def test_cu23_train_model_success():
    """
    CP-CU23-02: Entrenamiento y calibración de modelo RandomForestRegressor.
    Tenant con Plan Profesional (Boutique Elegance).
    Esperado: HTTP 200 OK con R^2 >= 0.80 y métricas MAE/RMSE calculadas.
    """
    token, company = _get_admin_token_and_tenant("elegance")

    res = client.post(
        "/api/ml/demand/train",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "use_synthetic": True,
            "test_size": 0.20,
            "n_estimators": 60,
            "max_depth": 10,
        },
    )
    assert res.status_code == 200, f"Error en entrenamiento: {res.text}"
    body = res.json()
    data = body.get("data", {})
    assert data.get("algorithm") == "RandomForestRegressor"
    assert data.get("records_trained") >= 50
    metrics = data.get("metrics", {})
    assert "r2" in metrics and metrics["r2"] >= 0.80, f"R2 debe ser >= 0.80, obtenido {metrics.get('r2')}"
    assert "mae" in metrics
    assert "rmse" in metrics


def test_cu23_forecast_demand_by_size():
    """
    CP-CU23-03: Inferencia cuantitativa de demanda por talla a 4 semanas.
    Esperado: HTTP 200 OK, proyecciones semanales por talla, intervalos y alertas.
    """
    token, company = _get_admin_token_and_tenant("elegance")

    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.tenant_id == company.id).first()
        assert product is not None, "Debe existir al menos un producto en Elegance"
        product_id = str(product.id)
    finally:
        db.close()

    res = client.post(
        "/api/ml/demand/forecast",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "product_id": product_id,
            "weeks_ahead": 4,
            "confidence_level": 0.95,
        },
    )
    assert res.status_code == 200, f"Error en inferencia de demanda: {res.text}"
    data = res.json().get("data", {})
    assert data.get("product_id") == product_id
    assert data.get("weeks_ahead") == 4
    assert data.get("model_r2") >= 0.80

    forecasts = data.get("forecast_by_size", [])
    assert len(forecasts) > 0, "Debe retornar pronósticos por talla"

    for f in forecasts:
        assert "size" in f
        assert "current_stock" in f
        assert "total_predicted_units" in f
        assert "recommended_reorder" in f
        assert "stock_status" in f
        assert len(f.get("predicted_weekly_demand", [])) == 4


def test_cu23_stock_reorder_alerts():
    """
    CP-CU23-04: Alertas tempranas de reabastecimiento por quiebre de stock proyectado.
    Esperado: HTTP 200 OK con listado ordenado por urgencia.
    """
    token, _ = _get_admin_token_and_tenant("elegance")

    res = client.get(
        "/api/ml/demand/alerts",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200, f"Error al consultar alertas: {res.text}"
    data = res.json().get("data", [])
    assert isinstance(data, list)
    if len(data) > 0:
        alert = data[0]
        assert "variant_id" in alert
        assert "recommended_reorder_units" in alert
        assert alert.get("urgency") in ["ALTA", "MEDIA", "BAJA"]


def test_cu23_latest_model_metadata():
    """
    CP-CU23-05: Auditoría y trazabilidad del modelo ML vigente.
    Esperado: HTTP 200 OK con versión, hiperparámetros y timestamp.
    """
    token, _ = _get_admin_token_and_tenant("elegance")

    res = client.get(
        "/api/ml/demand/latest-model",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json().get("data", {})
    assert data is not None
    assert data.get("name") == "RandomForestRegressor Demanda Textil"
    assert data.get("is_active") is True
    assert "metrics" in data
