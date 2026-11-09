import os
import uuid
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth.jwt import create_access_token
from app.core.config import settings
from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p0_saas_plataforma.models.plan import Plan
from app.packages.p0_saas_plataforma.models.subscription import Subscription
from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p2_gestion_productos_catalogo.models.category import Category
from app.packages.p2_gestion_productos_catalogo.models.color import Color
from app.packages.p2_gestion_productos_catalogo.models.product import Product
from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p2_gestion_productos_catalogo.models.size import Size
from app.packages.p2_gestion_productos_catalogo.schemas.catalog_enums import ProductStatusEnum
from main import app

client = TestClient(app)

TEST_DB_URL = settings.database_url
engine = create_engine(TEST_DB_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module")
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def setup_cu22_data(db_session):
    tag = uuid.uuid4().hex[:6]

    # 1. Planes
    plan_pro = db_session.query(Plan).filter(Plan.code == "pro").first()
    if not plan_pro:
        plan_pro = Plan(
            name="PROFESIONAL",
            code="pro",
            max_branches=10,
            has_ai_access=True,
            price_monthly=Decimal("99.00"),
            is_active=True,
        )
        db_session.add(plan_pro)

    plan_basic = db_session.query(Plan).filter(Plan.code == "basic").first()
    if not plan_basic:
        plan_basic = Plan(
            name="BASICO",
            code="basic",
            max_branches=3,
            has_ai_access=False,
            price_monthly=Decimal("29.00"),
            is_active=True,
        )
        db_session.add(plan_basic)

    db_session.commit()

    # 2. Tenant Pro (con IA y retención del 30%)
    tenant_pro = Company(
        name=f"Boutique Elegance ML {tag}",
        business_name=f"Boutique Elegance SRL {tag}",
        subdomain=f"elegance-ml-{tag}",
        nit_rut=f"90{tag[:6]}",
        email=f"valeria-ml-{tag}@elegance.com",
        phone="71234567",
        status="ACTIVO",
    )
    db_session.add(tenant_pro)
    db_session.commit()

    sub_pro = Subscription(
        company_id=tenant_pro.id,
        plan_id=plan_pro.id,
        status="ACTIVA",
    )
    db_session.add(sub_pro)

    # 3. Tenant Básico (sin IA, para probar rechazo de cuota de plan)
    tenant_basic = Company(
        name=f"Moda Basica Sin IA {tag}",
        business_name=f"Moda Basica SRL {tag}",
        subdomain=f"basica-noia-{tag}",
        nit_rut=f"80{tag[:6]}",
        email=f"pedro-noia-{tag}@basica.com",
        phone="71234568",
        status="ACTIVO",
    )
    db_session.add(tenant_basic)
    db_session.commit()

    sub_basic = Subscription(
        company_id=tenant_basic.id,
        plan_id=plan_basic.id,
        status="ACTIVA",
    )
    db_session.add(sub_basic)

    # 4. Usuarios
    admin_user = User(
        name="Admin Elegance Pro",
        email=f"admin-pro-{tag}@elegance.com",
        hashed_password="fakehashedpassword",
        rol="administrador",
        tenant_id=tenant_pro.id,
        is_active=True,
    )
    db_session.add(admin_user)

    cashier_user = User(
        name="Cajero Elegance Pro",
        email=f"cajero-pro-{tag}@elegance.com",
        hashed_password="fakehashedpassword",
        rol="cajero",
        tenant_id=tenant_pro.id,
        is_active=True,
    )
    db_session.add(cashier_user)

    admin_basic_user = User(
        name="Admin Basico No IA",
        email=f"admin-noia-{tag}@basica.com",
        hashed_password="fakehashedpassword",
        rol="administrador",
        tenant_id=tenant_basic.id,
        is_active=True,
    )
    db_session.add(admin_basic_user)

    # 5. Sucursal Tenant Pro
    branch_pro = Branch(
        name=f"Sucursal Central ML {tag}",
        address="Av. Ballivian #1234",
        city="La Paz",
        phone="22789012",
        tenant_id=tenant_pro.id,
        is_active=True,
    )
    db_session.add(branch_pro)

    # 6. Tallas, Colores, Categorías y Productos Tenant Pro
    sizes = {}
    for s_name in ["XS", "S", "M", "L", "XL", "XXL"]:
        s_obj = db_session.query(Size).filter(Size.name == s_name).first()
        if not s_obj:
            s_obj = Size(name=s_name)
            db_session.add(s_obj)
            db_session.commit()
        sizes[s_name] = s_obj

    color_obj = db_session.query(Color).filter(Color.name == "Negro").first()
    if not color_obj:
        color_obj = Color(name="Negro", hex_code="#000000")
        db_session.add(color_obj)
        db_session.commit()

    cat_invierno = Category(name=f"Abrigos y Chompas {tag}")
    cat_verano = Category(name=f"Vestidos de Fiesta {tag}")
    db_session.add_all([cat_invierno, cat_verano])
    db_session.commit()

    prod_abrigo = Product(
        name="Abrigo de Lana Andina",
        description="Abrigo térmico para temporada fría",
        category_id=cat_invierno.id,
        tenant_id=tenant_pro.id,
    )
    prod_vestido = Product(
        name="Vestido Seda Verano",
        description="Vestido fresco floral",
        category_id=cat_verano.id,
        tenant_id=tenant_pro.id,
    )
    db_session.add_all([prod_abrigo, prod_vestido])
    db_session.commit()

    # Variantes por Talla
    variants = [
        # Abrigo tallas
        ProductVariant(product_id=prod_abrigo.id, tenant_id=tenant_pro.id, size_id=sizes["S"].id, color_id=color_obj.id, sku=f"ABR-S-{tag}", price=Decimal("180.00"), status=ProductStatusEnum.active),
        ProductVariant(product_id=prod_abrigo.id, tenant_id=tenant_pro.id, size_id=sizes["M"].id, color_id=color_obj.id, sku=f"ABR-M-{tag}", price=Decimal("180.00"), status=ProductStatusEnum.active),
        ProductVariant(product_id=prod_abrigo.id, tenant_id=tenant_pro.id, size_id=sizes["L"].id, color_id=color_obj.id, sku=f"ABR-L-{tag}", price=Decimal("200.00"), status=ProductStatusEnum.active),
        ProductVariant(product_id=prod_abrigo.id, tenant_id=tenant_pro.id, size_id=sizes["XL"].id, color_id=color_obj.id, sku=f"ABR-XL-{tag}", price=Decimal("210.00"), status=ProductStatusEnum.active),
        # Vestido tallas
        ProductVariant(product_id=prod_vestido.id, tenant_id=tenant_pro.id, size_id=sizes["XS"].id, color_id=color_obj.id, sku=f"VES-XS-{tag}", price=Decimal("110.00"), status=ProductStatusEnum.active),
        ProductVariant(product_id=prod_vestido.id, tenant_id=tenant_pro.id, size_id=sizes["M"].id, color_id=color_obj.id, sku=f"VES-M-{tag}", price=Decimal("120.00"), status=ProductStatusEnum.active),
        ProductVariant(product_id=prod_vestido.id, tenant_id=tenant_pro.id, size_id=sizes["L"].id, color_id=color_obj.id, sku=f"VES-L-{tag}", price=Decimal("130.00"), status=ProductStatusEnum.active),
    ]
    db_session.add_all(variants)
    db_session.commit()

    return {
        "tenant_pro_id": tenant_pro.id,
        "tenant_basic_id": tenant_basic.id,
        "admin_pro_id": admin_user.id,
        "cashier_pro_id": cashier_user.id,
        "admin_basic_id": admin_basic_user.id,
        "branch_pro_id": branch_pro.id,
    }


def _get_auth_headers(tenant_id, user_id, rol="administrador"):
    token_data = {
        "sub": str(user_id),
        "email": f"test-{rol}@fashionstore.com",
        "rol": rol,
        "tenant_id": str(tenant_id),
    }
    token = create_access_token(data=token_data)
    return {"Authorization": f"Bearer {token}"}


def test_generate_synthetic_dataset_pro_plan(setup_cu22_data):
    """Generación exitosa de dataset sintético para tenant con Plan Profesional (has_ai_access=True)."""
    headers = _get_auth_headers(setup_cu22_data["tenant_pro_id"], setup_cu22_data["admin_pro_id"])
    payload = {
        "total_records": 1000,
        "months_covered": 12,
        "random_seed": 42,
        "include_returns": True,
        "include_exchanges": True,
    }
    response = client.post("/api/ml/synthetic-dataset/generate", json=payload, headers=headers)
    assert response.status_code == 201
    res = response.json()
    assert res.get("status_code") == 201 or "data" in res
    data = res["data"]
    assert "dataset_id" in data
    assert data["total_records"] == 1000
    assert data["total_sales_simulated"] > 0
    assert "sizes_distribution" in data
    assert "categories_distribution" in data
    assert data["return_rate_simulated"] > 0
    assert data["exchange_rate_simulated"] > 0


def test_rejection_basic_plan_no_ai_access(setup_cu22_data):
    """Rechazo con HTTP 403 cuando el tenant tiene Plan Básico (sin módulo de IA)."""
    headers = _get_auth_headers(setup_cu22_data["tenant_basic_id"], setup_cu22_data["admin_basic_id"])
    payload = {
        "total_records": 1000,
        "months_covered": 12,
    }
    response = client.post("/api/ml/synthetic-dataset/generate", json=payload, headers=headers)
    assert response.status_code == 403
    msg = response.json().get("message") or response.json().get("detail", "")
    assert "Inteligencia Artificial" in msg or "suscripcion" in msg.lower()


def test_rejection_non_admin_role(setup_cu22_data):
    """Rechazo con HTTP 403 cuando un cajero intenta calibrar y generar el dataset sintético."""
    headers = _get_auth_headers(setup_cu22_data["tenant_pro_id"], setup_cu22_data["cashier_pro_id"], rol="cajero")
    payload = {"total_records": 1000}
    response = client.post("/api/ml/synthetic-dataset/generate", json=payload, headers=headers)
    assert response.status_code == 403


def test_multitenant_isolation_and_file_content(setup_cu22_data):
    """Verifica que el CSV generado pertenezca estrictamente al tenant_id y contenga los campos requeridos."""
    import pandas as pd
    from app.packages.p6_inteligencia_analitica.services.synthetic_dataset_service import SyntheticDatasetService

    db = TestingSessionLocal()
    try:
        latest = SyntheticDatasetService.get_latest_dataset(db, setup_cu22_data["tenant_pro_id"])
        assert latest is not None
        assert os.path.exists(latest.file_path)

        df = pd.read_csv(latest.file_path)
        assert len(df) == 1000

        # Verificación estricta de aislamiento multitenant
        assert (df["tenant_id"] == str(setup_cu22_data["tenant_pro_id"])).all()
        assert (df["branch_id"] == str(setup_cu22_data["branch_pro_id"])).all()

        # Verificación de columnas de negocio (CU17 y CU18)
        assert "has_return" in df.columns
        assert "return_retention_amount" in df.columns
        assert "has_exchange" in df.columns
        assert "exchange_difference_paid" in df.columns
        assert "season" in df.columns
        assert "is_payday_window" in df.columns

        # Distribución normal de tallas: M debe tener más registros que XS
        size_counts = df["size"].value_counts()
        assert size_counts.get("M", 0) > size_counts.get("XS", 0)
    finally:
        db.close()


def test_get_latest_and_download_dataset(setup_cu22_data):
    """Consulta de metadatos del último dataset y descarga en streaming del archivo CSV."""
    headers = _get_auth_headers(setup_cu22_data["tenant_pro_id"], setup_cu22_data["admin_pro_id"])
    
    # 1. Consultar latest
    response = client.get("/api/ml/synthetic-dataset/latest", headers=headers)
    assert response.status_code == 200
    res = response.json()
    data = res["data"]
    assert data is not None
    assert "dataset_id" in data
    dataset_id = data["dataset_id"]

    # 2. Descargar CSV
    dl_response = client.get(f"/api/ml/synthetic-dataset/{dataset_id}/download", headers=headers)
    assert dl_response.status_code == 200
    assert "text/csv" in dl_response.headers.get("content-type", "")
    assert f'attachment; filename="{data["file_name"]}"' in dl_response.headers.get("content-disposition", "")
    assert len(dl_response.content) > 1000
