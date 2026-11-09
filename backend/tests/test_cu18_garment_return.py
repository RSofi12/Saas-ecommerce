import sys
from pathlib import Path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
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
from app.packages.p2_gestion_productos_catalogo.models.category import Category
from app.packages.p2_gestion_productos_catalogo.models.product import Product
from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p2_gestion_productos_catalogo.schemas.catalog_enums import ProductStatusEnum
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory import Inventory
from app.packages.p4_gestion_compras_reservas.schemas.order_schema import PaymentMethodEnum, PaymentStatusEnum
from app.packages.p5_gestion_ventas_pos.models.garment_return import GarmentReturn
from app.packages.p5_gestion_ventas_pos.models.sale import Sale
from app.packages.p5_gestion_ventas_pos.models.sale_item import SaleItem
from app.packages.p5_gestion_ventas_pos.schemas.sales_schema import SaleStatusEnum
from app.schemas.enums import RolEnum

client = TestClient(app)


class TestCU18GarmentReturn:
    """
    Suite de integración para CU18:
    Procesar Devolución de Prenda con Retención Operativa (20%-50%) y Nota de Crédito.
    Cumple la Política de Negocio 2 (P-Ten-03):
    - Retención obligatoria del 20% al 50%.
    - Reembolso neto del 50% al 80% (vía Nota de Crédito Digital o Efectivo).
    - Etiqueta textil intacta (good_with_tags) y plazo de devolución vigente.
    - Reingreso físico de inventario (+1) en la sucursal.
    """

    @pytest.fixture(scope="class")
    def setup_data(self):
        with SessionLocal() as db:
            unique_tag = uuid.uuid4().hex[:6]

            # 1. Empresa / Tenant Elegance (Aplica 30% de retención y 7 días máximo)
            tenant_elegance = Company(
                id=uuid.uuid4(),
                name=f"Boutique Elegance CU18 {unique_tag}",
                business_name=f"Boutique Elegance CU18 {unique_tag} SRL",
                subdomain=f"elegance-cu18-{unique_tag}",
                nit_rut=f"NIT-ELEGANCE-{unique_tag}",
                status="ACTIVO",
            )
            # Tenant Urbana (Aplica 20% de retención y 15 días máximo)
            tenant_urbana = Company(
                id=uuid.uuid4(),
                name=f"Moda Urbana CU18 {unique_tag}",
                business_name=f"Moda Urbana CU18 {unique_tag} SRL",
                subdomain=f"urbana-cu18-{unique_tag}",
                nit_rut=f"NIT-URBANA-{unique_tag}",
                status="ACTIVO",
            )
            db.add_all([tenant_elegance, tenant_urbana])
            db.commit()

            # 2. Plan y Suscripción
            plan = db.query(Plan).filter(Plan.code == "pro").first()
            if not plan:
                plan = Plan(
                    name="PROFESIONAL",
                    code="pro",
                    price_monthly=Decimal("99.00"),
                    max_branches=10,
                )
                db.add(plan)
                db.commit()

            sub = Subscription(
                company_id=tenant_elegance.id,
                plan_id=plan.id,
                status="ACTIVA",
            )
            db.add(sub)
            db.commit()

            # 3. Sucursal Elegance
            branch = Branch(
                id=uuid.uuid4(),
                name=f"Sucursal Central CU18 {unique_tag}",
                city="Santa Cruz",
                address="Av. San Martín 456",
                phone="77788899",
                tenant_id=tenant_elegance.id,
                is_active=True,
            )
            db.add(branch)
            db.commit()

            # 4. Cajero y Cliente
            cashier = User(
                id=uuid.uuid4(),
                name="Carlos Cajero",
                email=f"cajero_cu18_{unique_tag}@elegance.com",
                hashed_password="test_hash",
                rol=RolEnum.cajero,
                tenant_id=tenant_elegance.id,
                branch_id=branch.id,
                is_active=True,
            )
            customer = User(
                id=uuid.uuid4(),
                name="Lucia Cliente",
                email=f"lucia_cu18_{unique_tag}@gmail.com",
                hashed_password="test_hash",
                rol=RolEnum.cliente,
                tenant_id=tenant_elegance.id,
                is_active=True,
            )
            db.add_all([cashier, customer])
            db.commit()

            # 5. Catálogo de productos y variantes
            cat = Category(
                name=f"Vestidos Devolucion {unique_tag}",
            )
            db.add(cat)
            db.commit()

            prod = Product(
                name=f"Vestido Gala Seda {unique_tag}",
                description="Vestido para devolución",
                tenant_id=tenant_elegance.id,
                category_id=cat.id,
            )
            db.add(prod)
            db.commit()

            # Variante comprada por Bs 100.00
            var_item = ProductVariant(
                product_id=prod.id,
                tenant_id=tenant_elegance.id,
                sku=f"VEST-GALA-{unique_tag}",
                price=Decimal("100.00"),
                status=ProductStatusEnum.active,
            )
            db.add(var_item)
            db.commit()

            # Inventario inicial en 5 unidades
            inv = Inventory(
                variant_id=var_item.id,
                branch_id=branch.id,
                tenant_id=tenant_elegance.id,
                quantity=5,
                reserved_quantity=0,
            )
            db.add(inv)
            db.commit()

            # 6. Venta reciente (comprada hace 2 días, dentro del plazo de 7 días)
            sale = Sale(
                tenant_id=tenant_elegance.id,
                branch_id=branch.id,
                user_id=customer.id,
                status=SaleStatusEnum.completed,
                payment_method=PaymentMethodEnum.cash,
                payment_status=PaymentStatusEnum.paid,
                subtotal=Decimal("100.00"),
                total_amount=Decimal("100.00"),
                currency="bs",
            )
            db.add(sale)
            db.commit()

            sale_item = SaleItem(
                tenant_id=tenant_elegance.id,
                sale_id=sale.id,
                variant_id=var_item.id,
                product_id=prod.id,
                product_name=prod.name,
                variant_sku=var_item.sku,
                quantity=1,
                unit_price=Decimal("100.00"),
                line_total=Decimal("100.00"),
            )
            db.add(sale_item)
            db.commit()

            # 7. Venta vencida (hace 20 días, superando el plazo máximo)
            sale_expired = Sale(
                tenant_id=tenant_elegance.id,
                branch_id=branch.id,
                user_id=customer.id,
                status=SaleStatusEnum.completed,
                payment_method=PaymentMethodEnum.cash,
                payment_status=PaymentStatusEnum.paid,
                subtotal=Decimal("100.00"),
                total_amount=Decimal("100.00"),
                currency="bs",
                created_at=datetime.now(timezone.utc) - timedelta(days=20),
            )
            db.add(sale_expired)
            db.commit()

            sale_expired_item = SaleItem(
                tenant_id=tenant_elegance.id,
                sale_id=sale_expired.id,
                variant_id=var_item.id,
                product_id=prod.id,
                product_name=prod.name,
                variant_sku=var_item.sku,
                quantity=1,
                unit_price=Decimal("100.00"),
                line_total=Decimal("100.00"),
            )
            db.add(sale_expired_item)
            db.commit()

            # 8. Venta para tenant Moda Urbana (con prenda a Bs 200)
            prod_urbana = Product(
                name=f"Pantalón Jean Urbano {unique_tag}",
                description="Jean urbano",
                tenant_id=tenant_urbana.id,
                category_id=cat.id,
            )
            db.add(prod_urbana)
            db.commit()

            var_urbana = ProductVariant(
                product_id=prod_urbana.id,
                tenant_id=tenant_urbana.id,
                sku=f"JEAN-URB-{unique_tag}",
                price=Decimal("200.00"),
                status=ProductStatusEnum.active,
            )
            db.add(var_urbana)
            db.commit()

            sale_urbana = Sale(
                tenant_id=tenant_urbana.id,
                branch_id=branch.id,
                user_id=customer.id,
                status=SaleStatusEnum.completed,
                payment_method=PaymentMethodEnum.cash,
                payment_status=PaymentStatusEnum.paid,
                subtotal=Decimal("200.00"),
                total_amount=Decimal("200.00"),
                currency="bs",
            )
            db.add(sale_urbana)
            db.commit()

            sale_urbana_item = SaleItem(
                tenant_id=tenant_urbana.id,
                sale_id=sale_urbana.id,
                variant_id=var_urbana.id,
                product_id=prod_urbana.id,
                product_name=prod_urbana.name,
                variant_sku=var_urbana.sku,
                quantity=1,
                unit_price=Decimal("200.00"),
                line_total=Decimal("200.00"),
            )
            db.add(sale_urbana_item)
            db.commit()

            data = {
                "tenant_elegance_id": tenant_elegance.id,
                "tenant_urbana_id": tenant_urbana.id,
                "branch_id": branch.id,
                "cashier_id": cashier.id,
                "cashier_email": cashier.email,
                "cat_id": cat.id,
                "sale_id": sale.id,
                "sale_expired_id": sale_expired.id,
                "sale_urbana_id": sale_urbana.id,
                "variant_id": var_item.id,
                "variant_urbana_id": var_urbana.id,
            }

        yield data

        # Cleanup
        with SessionLocal() as db:
            db.query(GarmentReturn).filter(GarmentReturn.tenant_id.in_([data["tenant_elegance_id"], data["tenant_urbana_id"]])).delete(synchronize_session=False)
            db.query(SaleItem).filter(SaleItem.sale_id.in_([data["sale_id"], data["sale_expired_id"], data["sale_urbana_id"]])).delete(synchronize_session=False)
            db.query(Sale).filter(Sale.id.in_([data["sale_id"], data["sale_expired_id"], data["sale_urbana_id"]])).delete(synchronize_session=False)
            db.query(Inventory).filter(Inventory.branch_id == data["branch_id"]).delete(synchronize_session=False)
            db.query(ProductVariant).filter(ProductVariant.tenant_id.in_([data["tenant_elegance_id"], data["tenant_urbana_id"]])).delete(synchronize_session=False)
            db.query(Product).filter(Product.tenant_id.in_([data["tenant_elegance_id"], data["tenant_urbana_id"]])).delete(synchronize_session=False)
            db.query(Category).filter(Category.id == data["cat_id"]).delete(synchronize_session=False)
            db.query(User).filter(User.tenant_id.in_([data["tenant_elegance_id"], data["tenant_urbana_id"]])).delete(synchronize_session=False)
            db.query(Branch).filter(Branch.id == data["branch_id"]).delete(synchronize_session=False)
            db.query(Subscription).filter(Subscription.company_id == data["tenant_elegance_id"]).delete(synchronize_session=False)
            db.query(Company).filter(Company.id.in_([data["tenant_elegance_id"], data["tenant_urbana_id"]])).delete(synchronize_session=False)
            db.commit()

    def _get_cashier_token(self, setup_data, tenant_id=None):
        t_id = tenant_id if tenant_id else setup_data["tenant_elegance_id"]
        return create_access_token(
            data={
                "sub": str(setup_data["cashier_id"]),
                "email": setup_data["cashier_email"],
                "rol": RolEnum.cajero.value,
                "tenant_id": str(t_id),
                "branch_id": str(setup_data["branch_id"]),
            }
        )

    def test_01_quote_return_with_30_percent_retention(self, setup_data):
        """
        Cotización en Boutique Elegance:
        Retención del 30% (Bs 30.00) sobre prenda de Bs 100.00, con reembolso neto de Bs 70.00.
        """
        token = self._get_cashier_token(setup_data)

        resp = client.post(
            "/api/returns/quote",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "sale_id": str(setup_data["sale_id"]),
                "variant_id": str(setup_data["variant_id"]),
            },
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert Decimal(str(data["original_item_amount"])) == Decimal("100.00")
        assert Decimal(str(data["retention_percentage"])) == Decimal("30.00")
        assert Decimal(str(data["retention_amount"])) == Decimal("30.00")
        assert Decimal(str(data["refund_amount"])) == Decimal("70.00")
        assert data["max_return_days"] == 7

    def test_02_quote_return_with_20_percent_retention(self, setup_data):
        """
        Cotización en Moda Urbana:
        Retención del 20% (Bs 40.00) sobre prenda de Bs 200.00, con reembolso neto de Bs 160.00.
        """
        token = self._get_cashier_token(setup_data, tenant_id=setup_data["tenant_urbana_id"])

        resp = client.post(
            "/api/returns/quote",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "sale_id": str(setup_data["sale_urbana_id"]),
                "variant_id": str(setup_data["variant_urbana_id"]),
            },
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert Decimal(str(data["original_item_amount"])) == Decimal("200.00")
        assert Decimal(str(data["retention_percentage"])) == Decimal("20.00")
        assert Decimal(str(data["retention_amount"])) == Decimal("40.00")
        assert Decimal(str(data["refund_amount"])) == Decimal("160.00")
        assert data["max_return_days"] == 15

    def test_03_process_return_credit_note_success(self, setup_data):
        """
        Devolución exitosa con emisión de Nota de Crédito Digital (Modalidad Recomendada):
        - Retiene 30% (Bs 30.00), reembolsa Bs 70.00.
        - Genera código NC-YYYYMMDD-XXXX.
        - Reingresa stock físico de la prenda (+1) de 5 a 6 unidades.
        - Persiste registro en garment_returns.
        """
        token = self._get_cashier_token(setup_data)

        resp = client.post(
            "/api/returns",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "sale_id": str(setup_data["sale_id"]),
                "variant_id": str(setup_data["variant_id"]),
                "condition": "good_with_tags",
                "refund_method": "NOTA_CREDITO",
                "reason": "Talla no convino al cliente",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["statusCode"] == 201
        data = body["data"]
        assert data["refund_method"] == "NOTA_CREDITO"
        assert data["credit_note_code"] is not None
        assert data["credit_note_code"].startswith("NC-")
        assert Decimal(str(data["retention_amount"])) == Decimal("30.00")
        assert Decimal(str(data["refund_amount"])) == Decimal("70.00")

        # Verificar reingreso atómico a stock de inventario (5 -> 6)
        with SessionLocal() as db:
            inv = db.query(Inventory).filter(
                Inventory.variant_id == setup_data["variant_id"],
                Inventory.branch_id == setup_data["branch_id"],
            ).first()
            assert inv.quantity == 6

    def test_04_process_return_cash_success(self, setup_data):
        """
        Devolución con reembolso en efectivo en mostrador (Moda Urbana):
        - Retiene 20% (Bs 40.00), reembolsa Bs 160.00 en efectivo.
        - credit_note_code es None.
        - Reingresa la prenda devuelta al stock de la sucursal.
        """
        token = self._get_cashier_token(setup_data, tenant_id=setup_data["tenant_urbana_id"])

        resp = client.post(
            "/api/returns",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "sale_id": str(setup_data["sale_urbana_id"]),
                "variant_id": str(setup_data["variant_urbana_id"]),
                "condition": "good_with_tags",
                "refund_method": "EFECTIVO",
                "reason": "Preferencia de efectivo",
            },
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["refund_method"] == "EFECTIVO"
        assert data["credit_note_code"] is None
        assert Decimal(str(data["retention_amount"])) == Decimal("40.00")
        assert Decimal(str(data["refund_amount"])) == Decimal("160.00")

    def test_05_return_fails_if_damaged_or_no_tags(self, setup_data):
        """
        Regla de condición física: Si la prenda está usada o no tiene etiqueta,
        la devolución se rechaza (HTTP 400) sin alterar stock ni emitir nota de crédito.
        """
        token = self._get_cashier_token(setup_data)

        resp = client.post(
            "/api/returns",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "sale_id": str(setup_data["sale_id"]),
                "variant_id": str(setup_data["variant_id"]),
                "condition": "damaged_or_no_tags",
                "refund_method": "NOTA_CREDITO",
            },
        )
        assert resp.status_code == 400
        body = resp.json()
        assert "etiqueta textil intacta" in (body.get("message") or body.get("detail") or "")

    def test_06_return_fails_if_expired_deadline(self, setup_data):
        """
        Plazo legal vencido: Venta realizada hace 20 días supera el límite de 7 días de Elegance.
        El controlador debe rechazar la devolución con HTTP 400.
        """
        token = self._get_cashier_token(setup_data)

        resp = client.post(
            "/api/returns",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "sale_id": str(setup_data["sale_expired_id"]),
                "variant_id": str(setup_data["variant_id"]),
                "condition": "good_with_tags",
                "refund_method": "NOTA_CREDITO",
            },
        )
        assert resp.status_code == 400
        body = resp.json()
        assert "plazo legal para devoluciones ha expirado" in (body.get("message") or body.get("detail") or "")

    def test_07_multitenant_isolation(self, setup_data):
        """
        Aislamiento multitenant: Un cajero de otra empresa no puede devolver ventas ajenas.
        """
        foreign_id = uuid.uuid4()
        with SessionLocal() as db:
            foreign_co = Company(
                id=foreign_id,
                name=f"Empresa Foranea {foreign_id.hex[:6]}",
                business_name=f"Empresa Foranea {foreign_id.hex[:6]} SRL",
                subdomain=f"foranea-{foreign_id.hex[:6]}",
                nit_rut=f"NIT-FORANEA-{foreign_id.hex[:6]}",
                status="ACTIVO",
            )
            foreign_br = Branch(
                id=uuid.uuid4(),
                name=f"Sucursal Foranea {foreign_id.hex[:6]}",
                city="La Paz",
                address="Av. 6 de Agosto 789",
                phone="77711122",
                tenant_id=foreign_id,
                is_active=True,
            )
            foreign_cashier = User(
                id=uuid.uuid4(),
                name="Cajero Foraneo",
                email=f"cajero_{foreign_id.hex[:6]}@foranea.com",
                hashed_password="test_hash",
                rol=RolEnum.cajero,
                tenant_id=foreign_id,
                branch_id=foreign_br.id,
                is_active=True,
            )
            db.add_all([foreign_co, foreign_br, foreign_cashier])
            db.commit()

            foreign_token = create_access_token(
                data={
                    "sub": str(foreign_cashier.id),
                    "email": foreign_cashier.email,
                    "rol": RolEnum.cajero.value,
                    "tenant_id": str(foreign_id),
                    "branch_id": str(foreign_br.id),
                }
            )

        try:
            resp = client.post(
                "/api/returns",
                headers={"Authorization": f"Bearer {foreign_token}"},
                json={
                    "sale_id": str(setup_data["sale_id"]),
                    "variant_id": str(setup_data["variant_id"]),
                    "condition": "good_with_tags",
                    "refund_method": "NOTA_CREDITO",
                },
            )
            assert resp.status_code == 404
        finally:
            with SessionLocal() as db:
                db.query(User).filter(User.id == foreign_cashier.id).delete(synchronize_session=False)
                db.query(Branch).filter(Branch.id == foreign_br.id).delete(synchronize_session=False)
                db.query(Company).filter(Company.id == foreign_id).delete(synchronize_session=False)
                db.commit()

    def test_08_list_returns_history(self, setup_data):
        """
        Verifica que el endpoint GET /api/returns devuelva el historial auditado del tenant.
        """
        token = self._get_cashier_token(setup_data)

        resp = client.get(
            "/api/returns",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["statusCode"] == 200
        assert len(body["data"]) >= 1
        for r in body["data"]:
            assert r["tenant_id"] == str(setup_data["tenant_elegance_id"])
