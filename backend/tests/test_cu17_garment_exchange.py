import uuid
from datetime import datetime, timezone
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

try:
    from backend.main import app
except ModuleNotFoundError:
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
from app.packages.p5_gestion_ventas_pos.models.garment_exchange import GarmentExchange
from app.packages.p5_gestion_ventas_pos.models.sale import Sale
from app.packages.p5_gestion_ventas_pos.models.sale_item import SaleItem
from app.packages.p5_gestion_ventas_pos.schemas.sales_schema import SaleStatusEnum
from app.schemas.enums import RolEnum

client = TestClient(app)


class TestCU17GarmentExchange:
    """
    Suite de integración para CU17:
    Procesar Cambio de Prenda por Talla/Modelo con Cobro de Diferencia y Validación de Estado.
    Cumple la Política de Negocio 1 (P-Ten-01): Si Delta > 0, el cambio SOLO se consolida si abona la diferencia.
    """

    @pytest.fixture(scope="class")
    def setup_data(self):
        with SessionLocal() as db:
            unique_tag = uuid.uuid4().hex[:6]

            # 1. Empresa / Tenant
            tenant = Company(
                id=uuid.uuid4(),
                name=f"Boutique Elegance CU17 {unique_tag}",
                business_name=f"Boutique Elegance CU17 {unique_tag} SRL",
                subdomain=f"elegance-cu17-{unique_tag}",
                nit_rut=f"NIT-CU17-{unique_tag}",
                status="ACTIVO",
            )
            db.add(tenant)
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
                company_id=tenant.id,
                plan_id=plan.id,
                status="ACTIVA",
            )
            db.add(sub)
            db.commit()

            # 3. Sucursal
            branch = Branch(
                id=uuid.uuid4(),
                name=f"Sucursal Central CU17 {unique_tag}",
                city="Santa Cruz",
                address="Av. Ballivián 123",
                phone="77712345",
                tenant_id=tenant.id,
                is_active=True,
            )
            db.add(branch)
            db.commit()

            # 4. Cajero y Administrador
            cashier = User(
                id=uuid.uuid4(),
                name="Carla Cajera",
                email=f"cajero_{unique_tag}@elegance.com",
                hashed_password="test_hash",
                rol=RolEnum.cajero,
                tenant_id=tenant.id,
                branch_id=branch.id,
                is_active=True,
            )
            db.add(cashier)

            # Cliente comprador
            customer = User(
                id=uuid.uuid4(),
                name="Sofia Cliente",
                email=f"cliente_{unique_tag}@gmail.com",
                hashed_password="test_hash",
                rol=RolEnum.cliente,
                tenant_id=tenant.id,
                is_active=True,
            )
            db.add(customer)
            db.commit()

            # 5. Catálogo de productos y variantes
            cat = Category(
                name=f"Vestidos Elegance {unique_tag}",
            )
            db.add(cat)
            db.commit()

            prod = Product(
                name=f"Vestido Seda Fiesta {unique_tag}",
                description="Vestido de noche importado",
                tenant_id=tenant.id,
                category_id=cat.id,
            )
            db.add(prod)
            db.commit()

            # Variante 1: Talla M (Precio Bs 50.00) -> Original
            var_orig = ProductVariant(
                product_id=prod.id,
                tenant_id=tenant.id,
                sku=f"VEST-M-{unique_tag}",
                price=Decimal("50.00"),
                status=ProductStatusEnum.active,
            )
            # Variante 2: Talla L (Precio Bs 70.00) -> Mayor precio (+Bs 20)
            var_higher = ProductVariant(
                product_id=prod.id,
                tenant_id=tenant.id,
                sku=f"VEST-L-{unique_tag}",
                price=Decimal("70.00"),
                status=ProductStatusEnum.active,
            )
            # Variante 3: Talla S (Precio Bs 50.00) -> Mismo precio (Delta = 0)
            var_same = ProductVariant(
                product_id=prod.id,
                tenant_id=tenant.id,
                sku=f"VEST-S-{unique_tag}",
                price=Decimal("50.00"),
                status=ProductStatusEnum.active,
            )
            # Variante 4: Sin Stock (Precio Bs 80.00)
            var_out_of_stock = ProductVariant(
                product_id=prod.id,
                tenant_id=tenant.id,
                sku=f"VEST-XL-{unique_tag}",
                price=Decimal("80.00"),
                status=ProductStatusEnum.active,
            )
            db.add_all([var_orig, var_higher, var_same, var_out_of_stock])
            db.commit()

            # 6. Inventario en la sucursal
            inv_orig = Inventory(
                variant_id=var_orig.id,
                branch_id=branch.id,
                tenant_id=tenant.id,
                quantity=10,
                reserved_quantity=0,
            )
            inv_higher = Inventory(
                variant_id=var_higher.id,
                branch_id=branch.id,
                tenant_id=tenant.id,
                quantity=5,
                reserved_quantity=0,
            )
            inv_same = Inventory(
                variant_id=var_same.id,
                branch_id=branch.id,
                tenant_id=tenant.id,
                quantity=3,
                reserved_quantity=0,
            )
            inv_out = Inventory(
                variant_id=var_out_of_stock.id,
                branch_id=branch.id,
                tenant_id=tenant.id,
                quantity=0,
                reserved_quantity=0,
            )
            db.add_all([inv_orig, inv_higher, inv_same, inv_out])
            db.commit()

            # 7. Venta original donde se compró la variante Talla M a Bs 50
            sale = Sale(
                tenant_id=tenant.id,
                branch_id=branch.id,
                user_id=customer.id,
                status=SaleStatusEnum.completed,
                payment_method=PaymentMethodEnum.cash,
                payment_status=PaymentStatusEnum.paid,
                subtotal=Decimal("50.00"),
                total_amount=Decimal("50.00"),
                currency="bs",
            )
            db.add(sale)
            db.commit()

            sale_item = SaleItem(
                tenant_id=tenant.id,
                sale_id=sale.id,
                variant_id=var_orig.id,
                product_id=prod.id,
                product_name=prod.name,
                variant_sku=var_orig.sku,
                quantity=1,
                unit_price=Decimal("50.00"),
                line_total=Decimal("50.00"),
            )
            db.add(sale_item)
            db.commit()

            data = {
                "tenant_id": tenant.id,
                "branch_id": branch.id,
                "cashier_id": cashier.id,
                "cashier_email": cashier.email,
                "cat_id": cat.id,
                "sale_id": sale.id,
                "var_orig_id": var_orig.id,
                "var_higher_id": var_higher.id,
                "var_same_id": var_same.id,
                "var_out_id": var_out_of_stock.id,
            }

        yield data

        # Cleanup
        with SessionLocal() as db:
            db.query(GarmentExchange).filter(GarmentExchange.tenant_id == data["tenant_id"]).delete(synchronize_session=False)
            db.query(SaleItem).filter(SaleItem.sale_id == data["sale_id"]).delete(synchronize_session=False)
            db.query(Sale).filter(Sale.id == data["sale_id"]).delete(synchronize_session=False)
            db.query(Inventory).filter(Inventory.branch_id == data["branch_id"]).delete(synchronize_session=False)
            db.query(ProductVariant).filter(ProductVariant.tenant_id == data["tenant_id"]).delete(synchronize_session=False)
            db.query(Product).filter(Product.tenant_id == data["tenant_id"]).delete(synchronize_session=False)
            db.query(Category).filter(Category.id == data["cat_id"]).delete(synchronize_session=False)
            db.query(User).filter(User.tenant_id == data["tenant_id"]).delete(synchronize_session=False)
            db.query(Branch).filter(Branch.id == data["branch_id"]).delete(synchronize_session=False)
            db.query(Subscription).filter(Subscription.company_id == data["tenant_id"]).delete(synchronize_session=False)
            db.query(Company).filter(Company.id == data["tenant_id"]).delete(synchronize_session=False)
            db.commit()

    def _get_cashier_token(self, setup_data):
        return create_access_token(
            data={
                "sub": str(setup_data["cashier_id"]),
                "email": setup_data["cashier_email"],
                "rol": RolEnum.cajero.value,
                "tenant_id": str(setup_data["tenant_id"]),
                "branch_id": str(setup_data["branch_id"]),
            }
        )

    def test_01_quote_exchange_price_difference_calculation(self, setup_data):
        """
        Cotiza la diferencia Delta:
        - Variante M (Bs 50) a L (Bs 70) => Delta = +20, requires_payment = True
        - Variante M (Bs 50) a S (Bs 50) => Delta = 0, requires_payment = False
        """
        token = self._get_cashier_token(setup_data)

        # Caso Delta > 0 (+20 Bs)
        resp_higher = client.post(
            "/api/exchanges/quote",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "sale_id": str(setup_data["sale_id"]),
                "original_variant_id": str(setup_data["var_orig_id"]),
                "new_variant_id": str(setup_data["var_higher_id"]),
            },
        )
        assert resp_higher.status_code == 200
        data_higher = resp_higher.json()["data"]
        assert Decimal(str(data_higher["price_difference"])) == Decimal("20.00")
        assert data_higher["requires_payment"] is True
        assert data_higher["available_stock_new"] == 5

        # Caso Delta = 0 (Mismo precio)
        resp_same = client.post(
            "/api/exchanges/quote",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "sale_id": str(setup_data["sale_id"]),
                "original_variant_id": str(setup_data["var_orig_id"]),
                "new_variant_id": str(setup_data["var_same_id"]),
            },
        )
        assert resp_same.status_code == 200
        data_same = resp_same.json()["data"]
        assert Decimal(str(data_same["price_difference"])) == Decimal("0.00")
        assert data_same["requires_payment"] is False

    def test_02_exchange_with_higher_price_fails_when_difference_is_not_paid(self, setup_data):
        """
        POLÍTICA DE NEGOCIO 1 (Inviolable):
        Si Delta > 0 (Bs 20) y difference_paid=False, el controlador DEBE rechazar el cambio (HTTP 400).
        El inventario físico no debe modificarse.
        """
        token = self._get_cashier_token(setup_data)

        # Intento de procesar sin pagar la diferencia
        resp = client.post(
            "/api/exchanges",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "sale_id": str(setup_data["sale_id"]),
                "original_variant_id": str(setup_data["var_orig_id"]),
                "new_variant_id": str(setup_data["var_higher_id"]),
                "condition": "good_with_tags",
                "difference_paid": False,
                "notes": "Cliente no quiso pagar diferencia",
            },
        )
        assert resp.status_code == 400
        body = resp.json()
        assert "abona la diferencia de precio" in (body.get("message") or body.get("detail") or "")

        # Verificar que el stock no fue alterado
        with SessionLocal() as db:
            inv_orig = db.query(Inventory).filter(
                Inventory.variant_id == setup_data["var_orig_id"],
                Inventory.branch_id == setup_data["branch_id"],
            ).first()
            inv_higher = db.query(Inventory).filter(
                Inventory.variant_id == setup_data["var_higher_id"],
                Inventory.branch_id == setup_data["branch_id"],
            ).first()
            assert inv_orig.quantity == 10
            assert inv_higher.quantity == 5

    def test_03_exchange_with_higher_price_succeeds_when_difference_is_paid(self, setup_data):
        """
        Si Delta > 0 y difference_paid=True:
        El cambio se consolida exitosamente (201 Created),
        reingresando +1 a la prenda original (10 -> 11) y descontando -1 de la nueva (5 -> 4).
        """
        token = self._get_cashier_token(setup_data)

        resp = client.post(
            "/api/exchanges",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "sale_id": str(setup_data["sale_id"]),
                "original_variant_id": str(setup_data["var_orig_id"]),
                "new_variant_id": str(setup_data["var_higher_id"]),
                "condition": "good_with_tags",
                "difference_paid": True,
                "payment_method": "efectivo",
                "notes": "Cambio de talla M por L con abono en efectivo de Bs 20",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["statusCode"] == 201
        exchange_data = body["data"]
        assert exchange_data["status"] == "COMPLETED"
        assert Decimal(str(exchange_data["price_difference"])) == Decimal("20.00")
        assert exchange_data["difference_paid"] is True

        # Verificar balances de inventario actualizados atómicamente
        with SessionLocal() as db:
            inv_orig = db.query(Inventory).filter(
                Inventory.variant_id == setup_data["var_orig_id"],
                Inventory.branch_id == setup_data["branch_id"],
            ).first()
            inv_higher = db.query(Inventory).filter(
                Inventory.variant_id == setup_data["var_higher_id"],
                Inventory.branch_id == setup_data["branch_id"],
            ).first()
            assert inv_orig.quantity == 11  # Reingresó la talla M
            assert inv_higher.quantity == 4  # Salió la talla L

    def test_04_exchange_same_price_succeeds_without_requiring_payment(self, setup_data):
        """
        Si Delta = 0, el cambio se consolida directamente sin requerir pago previo.
        """
        token = self._get_cashier_token(setup_data)

        resp = client.post(
            "/api/exchanges",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "sale_id": str(setup_data["sale_id"]),
                "original_variant_id": str(setup_data["var_orig_id"]),
                "new_variant_id": str(setup_data["var_same_id"]),
                "condition": "good_with_tags",
                "difference_paid": False,
                "notes": "Cambio por talla S del mismo precio",
            },
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["status"] == "COMPLETED"
        assert Decimal(str(data["price_difference"])) == Decimal("0.00")
        assert data["difference_paid"] is True

        with SessionLocal() as db:
            inv_same = db.query(Inventory).filter(
                Inventory.variant_id == setup_data["var_same_id"],
                Inventory.branch_id == setup_data["branch_id"],
            ).first()
            assert inv_same.quantity == 2  # De 3 bajó a 2

    def test_05_exchange_fails_if_damaged_or_no_tags(self, setup_data):
        """
        Regla de condición de prenda: Si está usada o sin etiqueta, se rechaza inmediatamente (HTTP 400).
        """
        token = self._get_cashier_token(setup_data)

        resp = client.post(
            "/api/exchanges",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "sale_id": str(setup_data["sale_id"]),
                "original_variant_id": str(setup_data["var_orig_id"]),
                "new_variant_id": str(setup_data["var_same_id"]),
                "condition": "damaged_or_no_tags",
                "difference_paid": True,
            },
        )
        assert resp.status_code == 400
        body = resp.json()
        assert "etiqueta textil intacta" in (body.get("message") or body.get("detail") or "")

    def test_06_exchange_fails_if_new_variant_out_of_stock(self, setup_data):
        """
        Si la variante nueva no tiene existencias disponibles en la sucursal, se rechaza (HTTP 400).
        """
        token = self._get_cashier_token(setup_data)

        resp = client.post(
            "/api/exchanges",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "sale_id": str(setup_data["sale_id"]),
                "original_variant_id": str(setup_data["var_orig_id"]),
                "new_variant_id": str(setup_data["var_out_id"]),
                "condition": "good_with_tags",
                "difference_paid": True,
            },
        )
        assert resp.status_code == 400
        body = resp.json()
        assert "No hay existencias disponibles" in (body.get("message") or body.get("detail") or "")

    def test_07_multitenant_isolation(self, setup_data):
        """
        Aislamiento multitenant: Un cajero de otra empresa no puede operar sobre ventas ajenas.
        """
        foreign_id = uuid.uuid4()
        with SessionLocal() as db:
            foreign_co = Company(
                id=foreign_id,
                name=f"Otra Empresa {foreign_id.hex[:6]}",
                business_name=f"Otra Empresa {foreign_id.hex[:6]} SRL",
                subdomain=f"otra-{foreign_id.hex[:6]}",
                nit_rut=f"NIT-OTRA-{foreign_id.hex[:6]}",
                status="ACTIVO",
            )
            foreign_br = Branch(
                id=uuid.uuid4(),
                name=f"Sucursal Ajena {foreign_id.hex[:6]}",
                city="Cochabamba",
                address="Av. Heroínas 456",
                phone="77799999",
                tenant_id=foreign_id,
                is_active=True,
            )
            foreign_cashier = User(
                id=uuid.uuid4(),
                name="Cajero Ajeno",
                email=f"cajero_{foreign_id.hex[:6]}@otra.com",
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
                "/api/exchanges",
                headers={"Authorization": f"Bearer {foreign_token}"},
                json={
                    "sale_id": str(setup_data["sale_id"]),
                    "original_variant_id": str(setup_data["var_orig_id"]),
                    "new_variant_id": str(setup_data["var_same_id"]),
                    "condition": "good_with_tags",
                    "difference_paid": True,
                },
            )
            assert resp.status_code == 404
        finally:
            with SessionLocal() as db:
                db.query(User).filter(User.id == foreign_cashier.id).delete(synchronize_session=False)
                db.query(Branch).filter(Branch.id == foreign_br.id).delete(synchronize_session=False)
                db.query(Company).filter(Company.id == foreign_id).delete(synchronize_session=False)
                db.commit()

    def test_08_list_exchanges_history(self, setup_data):
        """
        Verifica que el endpoint GET /api/exchanges retorne el historial auditado del tenant.
        """
        token = self._get_cashier_token(setup_data)

        resp = client.get(
            "/api/exchanges",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["statusCode"] == 200
        assert len(body["data"]) >= 2
        for ex in body["data"]:
            assert ex["tenant_id"] == str(setup_data["tenant_id"])
