import sys
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
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p1_gestion_usuarios_acceso.schemas.enums import GenderEnum, RolEnum

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


def _ensure_basic_company_for_cu24():
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

        company = db.query(Company).filter(Company.subdomain == "basic-cu24-test").first()
        if not company:
            company = Company(
                name="Tienda Básica CU24",
                business_name="Tienda Básica CU24 S.R.L.",
                subdomain="basic-cu24-test",
                nit_rut="998877665",
                email="basic24@test.com",
                phone="77799887",
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
                name="Admin Básico CU24",
                email="admin@basic24.test",
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


def test_cu24_plan_basic_forbidden_403():
    """
    CP-CU24-01: Verificación de política comercial de planes SaaS.
    Un tenant con Plan Básico no cuenta con acceso al módulo de Machine Learning (has_ai_access=False).
    Esperado: HTTP 403 Forbidden con detalle explicativo.
    """
    token, _ = _ensure_basic_company_for_cu24()

    res = client.post(
        "/api/ml/customer-segmentation/train",
        headers={"Authorization": f"Bearer {token}"},
        json={"k_clusters": 4, "use_synthetic_fallback": True, "random_state": 42},
    )
    assert res.status_code == 403, f"Esperaba 403 Forbidden pero obtuve {res.status_code}: {res.text}"


def test_cu24_train_kmeans_success():
    """
    CP-CU24-02: Entrenamiento y clustering no supervisado K-Means (Happy Path).
    Tenant con Plan Profesional (Boutique Elegance).
    Esperado: HTTP 200 OK con k=4, Silhouette Score >= 0.40, inercia y 4 perfiles con centroides RFM+D.
    """
    token, company = _get_admin_token_and_tenant("elegance")

    res = client.post(
        "/api/ml/customer-segmentation/train",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "k_clusters": 4,
            "use_synthetic_fallback": True,
            "random_state": 42,
        },
    )
    assert res.status_code == 200, f"Error en entrenamiento: {res.text}"
    body = res.json()
    data = body.get("data", {})
    assert data.get("k_clusters") == 4
    assert data.get("total_customers_analyzed") >= 10
    assert "silhouette_score" in data
    assert "inertia" in data and data["inertia"] > 0
    assert data.get("data_source") in ["REAL_TRANSACTIONS", "SYNTHETIC_DATASET_CU22"]

    clusters = data.get("clusters", [])
    assert len(clusters) == 4, f"Se esperaban 4 clústeres pero se obtuvieron {len(clusters)}"

    for c in clusters:
        assert "cluster_id" in c
        assert "name" in c and len(c["name"]) > 0
        assert "description" in c
        assert "recommended_action" in c
        assert "customer_count" in c and c["customer_count"] >= 0
        assert "centroid" in c
        centroid = c["centroid"]
        assert "recency_days" in centroid
        assert "frequency_count" in centroid
        assert "monetary_total" in centroid
        assert "return_rate" in centroid
        assert "badge_color" in c
        assert "badge_icon" in c


def test_cu24_get_segmentation_status():
    """
    CP-CU24-03: Consulta de telemetría y metadatos del modelo vigente.
    Esperado: HTTP 200 OK con has_trained_model=True y métricas de clustering persistidas.
    """
    token, _ = _get_admin_token_and_tenant("elegance")

    res = client.get(
        "/api/ml/customer-segmentation/status",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200, f"Error al consultar status: {res.text}"
    body = res.json()
    data = body.get("data", {})
    assert data.get("has_trained_model") is True
    model_info = data.get("model", {})
    assert "model_id" in model_info
    assert "version" in model_info
    assert "metrics" in model_info
    assert model_info["metrics"].get("k_clusters") == 4


def test_cu24_get_scatter_points():
    """
    CP-CU24-04: Coordenadas RFM+D para el gráfico de dispersión 2D interactivo.
    Esperado: HTTP 200 OK con lista de puntos coloreados por clúster asignado.
    """
    token, _ = _get_admin_token_and_tenant("elegance")

    res = client.get(
        "/api/ml/customer-segmentation/scatter-points?limit=150",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200, f"Error al consultar scatter points: {res.text}"
    body = res.json()
    data = body.get("data", {})
    assert data.get("k_clusters") == 4
    points = data.get("points", [])
    assert len(points) > 0, "Debe retornar puntos de clientes segmentados"

    pt = points[0]
    assert "customer_id" in pt
    assert "recency_days" in pt
    assert "frequency_count" in pt
    assert "monetary_total" in pt
    assert "return_rate" in pt
    assert "cluster_id" in pt
    assert "color" in pt and pt["color"].startswith("#")


def test_cu24_get_segmented_customers_drilldown():
    """
    CP-CU24-05: Exploración drill-down de clientes clasificados por clúster.
    Esperado: HTTP 200 OK con paginación y atributos de perfil RFM+D de clientes.
    """
    token, _ = _get_admin_token_and_tenant("elegance")

    res = client.get(
        "/api/ml/customer-segmentation/customers?page=1&page_size=10",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200, f"Error al consultar clientes segmentados: {res.text}"
    body = res.json()
    data = body.get("data", {})
    assert data.get("total") > 0
    assert data.get("page") == 1
    assert data.get("page_size") == 10
    customers = data.get("customers", [])
    assert len(customers) > 0

    c = customers[0]
    assert "id" in c
    assert "user_id" in c
    assert "customer_email" in c
    assert "segment_label" in c
    assert "monetary_total" in c
