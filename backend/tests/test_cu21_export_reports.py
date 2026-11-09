import sys
from pathlib import Path

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import io
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
import openpyxl
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db
from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p0_saas_plataforma.models.plan import Plan
from app.packages.p0_saas_plataforma.models.subscription import Subscription
from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p1_gestion_usuarios_acceso.schemas.enums import RolEnum
from app.packages.p2_gestion_productos_catalogo.models.category import Category
from app.packages.p2_gestion_productos_catalogo.models.product import Product
from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p2_gestion_productos_catalogo.schemas.catalog_enums import ProductStatusEnum
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory import Inventory
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory_movement import InventoryMovement
from app.packages.p3_gestion_inventario_disponibilidad.schemas.inventory_schema import InventoryMovementTypeEnum
from app.packages.p4_gestion_compras_reservas.models.order import Order
from app.packages.p4_gestion_compras_reservas.models.order_item import OrderItem
from app.packages.p5_gestion_ventas_pos.models.sale import Sale
from app.packages.p5_gestion_ventas_pos.models.sale_item import SaleItem
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
def setup_cu21_data(db_session):
    tag = uuid.uuid4().hex[:6]

    # 1. Tenant
    tenant_a = Company(
        id=uuid.uuid4(),
        name=f"Boutique ReportLab Test {tag}",
        business_name=f"Boutique ReportLab Test {tag} SRL",
        nit_rut=f"NIT-REP-{tag}",
        subdomain=f"rep-{tag}",
        status="ACTIVO",
    )
    db_session.add(tenant_a)
    db_session.commit()

    # 2. Branches
    branch_a1 = Branch(
        id=uuid.uuid4(),
        tenant_id=tenant_a.id,
        name=f"Sucursal Central Reportes {tag}",
        city="La Paz",
        address="Av. Arce 123",
        phone="77711223",
        is_default=True,
        is_active=True,
    )
    branch_a2 = Branch(
        id=uuid.uuid4(),
        tenant_id=tenant_a.id,
        name=f"Sucursal Sur Reportes {tag}",
        city="La Paz",
        address="Calle 21 Calacoto",
        phone="77744556",
        is_default=False,
        is_active=True,
    )
    db_session.add_all([branch_a1, branch_a2])
    db_session.commit()

    # 3. Category & Products
    cat = Category(name=f"Moda Femenina {tag}")
    db_session.add(cat)
    db_session.commit()

    prod1 = Product(
        id=uuid.uuid4(),
        tenant_id=tenant_a.id,
        name="Vestido Seda Noche",
        category_id=cat.id,
    )
    prod2 = Product(
        id=uuid.uuid4(),
        tenant_id=tenant_a.id,
        name="Blusa Lino Verano",
        category_id=cat.id,
    )
    db_session.add_all([prod1, prod2])
    db_session.commit()

    # 4. Variants
    var1 = ProductVariant(
        id=uuid.uuid4(),
        product_id=prod1.id,
        tenant_id=tenant_a.id,
        sku=f"SKU-SED-M-{tag}",
        price=Decimal("200.00"),
        status=ProductStatusEnum.active,
    )
    var2 = ProductVariant(
        id=uuid.uuid4(),
        product_id=prod2.id,
        tenant_id=tenant_a.id,
        sku=f"SKU-LIN-S-{tag}",
        price=Decimal("100.00"),
        status=ProductStatusEnum.active,
    )
    db_session.add_all([var1, var2])
    db_session.commit()

    # 5. Inventory
    inv1 = Inventory(
        id=uuid.uuid4(),
        tenant_id=tenant_a.id,
        branch_id=branch_a1.id,
        variant_id=var1.id,
        quantity=50,
        reserved_quantity=5,
    )
    inv2 = Inventory(
        id=uuid.uuid4(),
        tenant_id=tenant_a.id,
        branch_id=branch_a2.id,
        variant_id=var2.id,
        quantity=30,
        reserved_quantity=2,
    )
    db_session.add_all([inv1, inv2])

    # 6. Inventory Movements
    mov1 = InventoryMovement(
        id=uuid.uuid4(),
        branch_id=branch_a1.id,
        variant_id=var1.id,
        movement_type=InventoryMovementTypeEnum.income.value,
        quantity=50,
    )
    db_session.add(mov1)

    # 6b. Users
    user1 = User(
        id=uuid.uuid4(),
        name="Cajero Reportes",
        email=f"cajero_{tag}@test.com",
        hashed_password="fakehash",
        rol=RolEnum.cajero,
        tenant_id=tenant_a.id,
        branch_id=branch_a1.id,
        is_active=True,
    )
    admin_user = User(
        id=uuid.uuid4(),
        name="Admin Reportes",
        email=f"admin_{tag}@test.com",
        hashed_password="fakehash",
        rol=RolEnum.administrador,
        tenant_id=tenant_a.id,
        is_active=True,
    )
    manager_user = User(
        id=uuid.uuid4(),
        name="Encargado Reportes",
        email=f"encargado_{tag}@test.com",
        hashed_password="fakehash",
        rol=RolEnum.encargado,
        tenant_id=tenant_a.id,
        branch_id=branch_a1.id,
        is_active=True,
    )
    db_session.add_all([user1, admin_user, manager_user])
    db_session.commit()

    # 7. Sales POS
    sale1 = Sale(
        id=uuid.uuid4(),
        tenant_id=tenant_a.id,
        branch_id=branch_a1.id,
        user_id=user1.id,
        payment_method="cash",
        payment_status="paid",
        status="completed",
        total_amount=Decimal("400.00"),
    )
    db_session.add(sale1)
    db_session.flush()

    s_item1 = SaleItem(
        id=uuid.uuid4(),
        sale_id=sale1.id,
        product_id=prod1.id,
        product_name=prod1.name,
        variant_id=var1.id,
        variant_sku=var1.sku,
        quantity=2,
        unit_price=Decimal("200.00"),
        line_total=Decimal("400.00"),
    )
    db_session.add(s_item1)

    db_session.commit()

    return {
        "tenant_id": tenant_a.id,
        "company_name": tenant_a.name,
        "branch_a1_id": branch_a1.id,
        "branch_a2_id": branch_a2.id,
        "admin_user_id": admin_user.id,
        "manager_user_id": manager_user.id,
    }


def _get_auth_headers(tenant_id, user_id, rol="administrador", branch_id=None):
    from app.auth.jwt import create_access_token
    token_data = {
        "sub": str(user_id),
        "email": f"test-{rol}@fashionstore.com",
        "rol": rol,
        "tenant_id": str(tenant_id),
    }
    if branch_id:
        token_data["branch_id"] = str(branch_id)
    token = create_access_token(data=token_data)
    return {"Authorization": f"Bearer {token}"}


def test_sales_report_json_preview(setup_cu21_data):
    headers = _get_auth_headers(setup_cu21_data["tenant_id"], setup_cu21_data["admin_user_id"])
    response = client.get("/api/reports/sales", headers=headers)
    assert response.status_code == 200
    res = response.json()
    assert res.get("status_code") == 200 or "data" in res
    data = res["data"]
    assert "summary" in data
    assert "rows" in data
    assert len(data["rows"]) >= 1


def test_export_sales_report_csv(setup_cu21_data):
    headers = _get_auth_headers(setup_cu21_data["tenant_id"], setup_cu21_data["admin_user_id"])
    response = client.get("/api/reports/sales/export?format=csv", headers=headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert 'attachment; filename="sales-report.csv"' in response.headers["content-disposition"]
    text = response.text
    assert "product_name" in text or "Prenda" in text or "branch_name" in text


def test_export_sales_report_excel(setup_cu21_data):
    headers = _get_auth_headers(setup_cu21_data["tenant_id"], setup_cu21_data["admin_user_id"])
    response = client.get("/api/reports/sales/export/excel", headers=headers)
    assert response.status_code == 200
    assert "spreadsheetml" in response.headers["content-type"]
    assert 'attachment; filename="sales-report.xlsx"' in response.headers["content-disposition"]
    
    # Verify valid Excel workbook
    wb = openpyxl.load_workbook(io.BytesIO(response.content))
    assert len(wb.sheetnames) >= 1
    sheet = wb.active
    # Row 1 should have company name
    assert "Boutique ReportLab Test" in str(sheet["A1"].value)


def test_export_sales_report_pdf(setup_cu21_data):
    headers = _get_auth_headers(setup_cu21_data["tenant_id"], setup_cu21_data["admin_user_id"])
    response = client.get("/api/reports/sales/export/pdf", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert 'attachment; filename="sales-report.pdf"' in response.headers["content-disposition"]
    # Verify PDF magic bytes
    assert response.content[:4] == b"%PDF"


def test_export_dynamic_columns_selection(setup_cu21_data):
    headers = _get_auth_headers(setup_cu21_data["tenant_id"], setup_cu21_data["admin_user_id"])
    cols = "branch_name,product_name,gross_sales"
    response = client.get(f"/api/reports/sales/export/excel?columns={cols}", headers=headers)
    assert response.status_code == 200
    wb = openpyxl.load_workbook(io.BytesIO(response.content))
    sheet = wb.active
    # Row 4 is header row
    header_vals = [sheet.cell(row=4, column=i).value for i in range(1, 4)]
    assert "Sucursal" in header_vals[0]
    assert "Prenda" in header_vals[1]
    assert "Total Ventas" in header_vals[2]
    # Column 4 should be None
    assert sheet.cell(row=4, column=4).value is None


def test_export_inventory_report_pdf_and_excel(setup_cu21_data):
    headers = _get_auth_headers(setup_cu21_data["tenant_id"], setup_cu21_data["admin_user_id"])
    
    # Excel
    resp_xlsx = client.get("/api/reports/inventory/export/excel", headers=headers)
    assert resp_xlsx.status_code == 200
    assert "spreadsheetml" in resp_xlsx.headers["content-type"]
    
    # PDF
    resp_pdf = client.get("/api/reports/inventory/export/pdf", headers=headers)
    assert resp_pdf.status_code == 200
    assert resp_pdf.content[:4] == b"%PDF"


def test_export_movements_report_pdf_and_excel(setup_cu21_data):
    headers = _get_auth_headers(setup_cu21_data["tenant_id"], setup_cu21_data["admin_user_id"])
    
    # Excel
    resp_xlsx = client.get("/api/reports/movements/export/excel", headers=headers)
    assert resp_xlsx.status_code == 200
    assert "spreadsheetml" in resp_xlsx.headers["content-type"]
    
    # PDF
    resp_pdf = client.get("/api/reports/movements/export/pdf", headers=headers)
    assert resp_pdf.status_code == 200
    assert resp_pdf.content[:4] == b"%PDF"


def test_export_encargado_scoped_to_branch(setup_cu21_data):
    # Encargado of branch_a1
    headers = _get_auth_headers(
        setup_cu21_data["tenant_id"],
        setup_cu21_data["manager_user_id"],
        rol="encargado",
        branch_id=setup_cu21_data["branch_a1_id"],
    )
    # Encargado attempts to ask for branch_a2
    response = client.get(f"/api/reports/sales?branch_id={setup_cu21_data['branch_a2_id']}", headers=headers)
    assert response.status_code == 200
    res = response.json()
    # The server overrides branch_id with branch_a1
    for r in res["data"]["rows"]:
        assert str(r["branch_id"]) == str(setup_cu21_data["branch_a1_id"])


def test_export_empty_date_range_produces_valid_files(setup_cu21_data):
    headers = _get_auth_headers(setup_cu21_data["tenant_id"], setup_cu21_data["admin_user_id"])
    # Future dates with 0 sales
    future_from = (date.today() + timedelta(days=365)).isoformat()
    future_to = (date.today() + timedelta(days=370)).isoformat()
    
    # Excel empty
    resp_xlsx = client.get(f"/api/reports/sales/export/excel?from_date={future_from}&to_date={future_to}", headers=headers)
    assert resp_xlsx.status_code == 200
    wb = openpyxl.load_workbook(io.BytesIO(resp_xlsx.content))
    assert wb.active is not None
    
    # PDF empty
    resp_pdf = client.get(f"/api/reports/sales/export/pdf?from_date={future_from}&to_date={future_to}", headers=headers)
    assert resp_pdf.status_code == 200
    assert resp_pdf.content[:4] == b"%PDF"
