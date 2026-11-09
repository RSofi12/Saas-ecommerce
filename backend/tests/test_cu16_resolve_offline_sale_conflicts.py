import sys
from pathlib import Path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import uuid
from datetime import datetime, timezone
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
from app.packages.p5_gestion_ventas_pos.models.sync_operation import SyncOperation
from app.packages.p5_gestion_ventas_pos.schemas.sales_schema import SaleStatusEnum
from app.schemas.enums import RolEnum

client = TestClient(app)


class TestCU16ResolveOfflineSaleConflicts:
    """
    Suite de pruebas de integración para CU16:
    Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock Central.
    RF-37 (Detección de quiebre) y RF-38 (Resolución gerencial en 3 vías):
    - Vía 1: Autorización con stock negativo y solicitud de reposición.
    - Vía 2: Sustitución por variante/talla alternativa con stock disponible.
    - Vía 3: Anulación formal y emisión de Nota de Crédito digital (100% reembolso).
    - Justificación de auditoría obligatoria (min_length=5).
    - Aislamiento multitenant estricto (HTTP 404).
    """

    @pytest.fixture(scope="class")
    def setup_data(self):
        with SessionLocal() as db:
            unique_tag = uuid.uuid4().hex[:6]

            # 1. Empresa Principal (Boutique Elegance) y Secundaria (Moda Urbana)
            tenant_a = Company(
                id=uuid.uuid4(),
                name=f"Elegance Boutique CU16 {unique_tag}",
                business_name=f"Elegance Boutique CU16 {unique_tag} SRL",
                subdomain=f"elegance-cu16-{unique_tag}",
                nit_rut=f"NIT-ELEGANCE-{unique_tag}",
                status="ACTIVO",
            )
            tenant_b = Company(
                id=uuid.uuid4(),
                name=f"Moda Urbana CU16 {unique_tag}",
                business_name=f"Moda Urbana CU16 {unique_tag} SRL",
                subdomain=f"urbana-cu16-{unique_tag}",
                nit_rut=f"NIT-URBANA-{unique_tag}",
                status="ACTIVO",
            )
            db.add_all([tenant_a, tenant_b])
            db.commit()

            # 2. Sucursales
            branch_a = Branch(
                id=uuid.uuid4(),
                name=f"Sucursal Central CU16 {unique_tag}",
                city="Santa Cruz",
                address="Av. Monseñor Rivero 123",
                phone="70011223",
                tenant_id=tenant_a.id,
                is_active=True,
            )
            branch_b = Branch(
                id=uuid.uuid4(),
                name=f"Sucursal Urbana CU16 {unique_tag}",
                city="La Paz",
                address="Calle Sagárnaga 456",
                phone="70099887",
                tenant_id=tenant_b.id,
                is_active=True,
            )
            db.add_all([branch_a, branch_b])
            db.commit()

            # 3. Usuarios: Encargado Tenant A, Cajero Tenant A, Encargado Tenant B
            encargado_a = User(
                id=uuid.uuid4(),
                name="Carlos Encargado A",
                email=f"encargado_a_{unique_tag}@fashionstore.com",
                hashed_password="hashed_secret",
                rol=RolEnum.encargado,
                tenant_id=tenant_a.id,
                branch_id=branch_a.id,
                is_active=True,
            )
            cajero_a = User(
                id=uuid.uuid4(),
                name="María Cajera A",
                email=f"cajero_a_{unique_tag}@fashionstore.com",
                hashed_password="hashed_secret",
                rol=RolEnum.cajero,
                tenant_id=tenant_a.id,
                branch_id=branch_a.id,
                is_active=True,
            )
            encargado_b = User(
                id=uuid.uuid4(),
                name="Roberto Encargado B",
                email=f"encargado_b_{unique_tag}@fashionstore.com",
                hashed_password="hashed_secret",
                rol=RolEnum.encargado,
                tenant_id=tenant_b.id,
                branch_id=branch_b.id,
                is_active=True,
            )
            db.add_all([encargado_a, cajero_a, encargado_b])
            db.commit()

            # 4. Catálogo y Variantes
            cat = Category(
                id=uuid.uuid4(),
                name=f"Colección Verano CU16 {unique_tag}",
            )
            db.add(cat)
            db.commit()

            prod = Product(
                id=uuid.uuid4(),
                tenant_id=tenant_a.id,
                category_id=cat.id,
                name="Vestido Seda Noche",
                description="Vestido de gala",
            )
            db.add(prod)
            db.commit()

            # Variante original vendida offline (quedará en stock 0)
            var_orig = ProductVariant(
                id=uuid.uuid4(),
                product_id=prod.id,
                tenant_id=tenant_a.id,
                sku=f"VEST-NOCHE-M-{unique_tag}",
                price=Decimal("150.00"),
                status=ProductStatusEnum.active,
            )
            # Variante sustituta con stock disponible (ej. Talla L)
            var_subst = ProductVariant(
                id=uuid.uuid4(),
                product_id=prod.id,
                tenant_id=tenant_a.id,
                sku=f"VEST-NOCHE-L-{unique_tag}",
                price=Decimal("150.00"),
                status=ProductStatusEnum.active,
            )
            # Variante sustituta pero agotada
            var_exhausted = ProductVariant(
                id=uuid.uuid4(),
                product_id=prod.id,
                tenant_id=tenant_a.id,
                sku=f"VEST-NOCHE-XL-{unique_tag}",
                price=Decimal("150.00"),
                status=ProductStatusEnum.active,
            )
            db.add_all([var_orig, var_subst, var_exhausted])
            db.commit()

            # 5. Inventario central:
            # - var_orig tiene stock 0 (quiebre por sobreventa central)
            # - var_subst tiene stock 3
            # - var_exhausted tiene stock 0
            inv_orig = Inventory(
                tenant_id=tenant_a.id,
                branch_id=branch_a.id,
                variant_id=var_orig.id,
                quantity=0,
            )
            inv_subst = Inventory(
                tenant_id=tenant_a.id,
                branch_id=branch_a.id,
                variant_id=var_subst.id,
                quantity=3,
            )
            inv_exhausted = Inventory(
                tenant_id=tenant_a.id,
                branch_id=branch_a.id,
                variant_id=var_exhausted.id,
                quantity=0,
            )
            db.add_all([inv_orig, inv_subst, inv_exhausted])
            db.commit()

            # 6. Ventas offline que colisionaron al sincronizar (Marcadas con CONFLICT:OUT_OF_STOCK)
            # Conflicto 1 (para probar Vía 1: negative_stock)
            sale_conf_1 = Sale(
                id=uuid.uuid4(),
                tenant_id=tenant_a.id,
                branch_id=branch_a.id,
                user_id=cajero_a.id,
                client_sale_id=uuid.uuid4(),
                is_offline=True,
                status=SaleStatusEnum.completed,
                payment_method=PaymentMethodEnum.cash,
                payment_status=PaymentStatusEnum.paid,
                cash_reference="CONFLICT:Quiebre de stock central (Sobreventa durante desconexión)",
                subtotal=Decimal("150.00"),
                total_amount=Decimal("150.00"),
            )
            # Conflicto 2 (para probar Vía 2: substitute)
            sale_conf_2 = Sale(
                id=uuid.uuid4(),
                tenant_id=tenant_a.id,
                branch_id=branch_a.id,
                user_id=cajero_a.id,
                client_sale_id=uuid.uuid4(),
                is_offline=True,
                status=SaleStatusEnum.completed,
                payment_method=PaymentMethodEnum.cash,
                payment_status=PaymentStatusEnum.paid,
                cash_reference="CONFLICT:Existencias centrales agotadas en la nube",
                subtotal=Decimal("150.00"),
                total_amount=Decimal("150.00"),
            )
            # Conflicto 3 (para probar Vía 3: credit_note)
            sale_conf_3 = Sale(
                id=uuid.uuid4(),
                tenant_id=tenant_a.id,
                branch_id=branch_a.id,
                user_id=cajero_a.id,
                client_sale_id=uuid.uuid4(),
                is_offline=True,
                status=SaleStatusEnum.completed,
                payment_method=PaymentMethodEnum.cash,
                payment_status=PaymentStatusEnum.paid,
                cash_reference="CONFLICT:Agotamiento absoluto de inventario",
                subtotal=Decimal("150.00"),
                total_amount=Decimal("150.00"),
            )
            db.add_all([sale_conf_1, sale_conf_2, sale_conf_3])
            db.commit()

            item_1 = SaleItem(
                sale_id=sale_conf_1.id,
                variant_id=var_orig.id,
                quantity=1,
                unit_price=Decimal("150.00"),
                line_total=Decimal("150.00"),
                product_id=prod.id,
                product_name=prod.name,
                variant_sku=var_orig.sku,
                tenant_id=tenant_a.id,
            )
            item_2 = SaleItem(
                sale_id=sale_conf_2.id,
                variant_id=var_orig.id,
                quantity=1,
                unit_price=Decimal("150.00"),
                line_total=Decimal("150.00"),
                product_id=prod.id,
                product_name=prod.name,
                variant_sku=var_orig.sku,
                tenant_id=tenant_a.id,
            )
            item_3 = SaleItem(
                sale_id=sale_conf_3.id,
                variant_id=var_orig.id,
                quantity=1,
                unit_price=Decimal("150.00"),
                line_total=Decimal("150.00"),
                product_id=prod.id,
                product_name=prod.name,
                variant_sku=var_orig.sku,
                tenant_id=tenant_a.id,
            )
            db.add_all([item_1, item_2, item_3])
            db.commit()

            # Tokens JWT
            token_encargado_a = create_access_token(
                data={
                    "sub": str(encargado_a.id),
                    "email": encargado_a.email,
                    "rol": encargado_a.rol.value,
                    "tenant_id": str(tenant_a.id),
                    "branch_id": str(branch_a.id),
                }
            )
            token_encargado_b = create_access_token(
                data={
                    "sub": str(encargado_b.id),
                    "email": encargado_b.email,
                    "rol": encargado_b.rol.value,
                    "tenant_id": str(tenant_b.id),
                    "branch_id": str(branch_b.id),
                }
            )

            return {
                "tenant_a_id": tenant_a.id,
                "tenant_b_id": tenant_b.id,
                "branch_a_id": branch_a.id,
                "branch_b_id": branch_b.id,
                "cajero_a_id": cajero_a.id,
                "token_encargado_a": token_encargado_a,
                "token_encargado_b": token_encargado_b,
                "sale_conf_1_id": sale_conf_1.id,
                "sale_conf_2_id": sale_conf_2.id,
                "sale_conf_3_id": sale_conf_3.id,
                "prod_id": prod.id,
                "var_orig_id": var_orig.id,
                "var_subst_id": var_subst.id,
                "var_exhausted_id": var_exhausted.id,
            }

    def test_01_list_branch_sale_conflicts(self, setup_data):
        """
        CP-CU16-01: El Encargado consulta la bandeja de ventas en conflicto.
        Debe listar las 3 ventas offline colisionadas con su stock central actual (0).
        """
        headers = {"Authorization": f"Bearer {setup_data['token_encargado_a']}"}
        resp = client.get(
            f"/api/sales/conflicts?branch_id={setup_data['branch_a_id']}",
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert len(data) >= 3

        first = next(c for c in data if c["sale_id"] == str(setup_data["sale_conf_1_id"]))
        assert first["branch_name"] is not None
        assert first["total_amount"] == "150.00"
        assert len(first["items"]) == 1
        assert first["items"][0]["central_stock_available"] == 0

    def test_02_resolve_via_negative_stock(self, setup_data):
        """
        CP-CU16-02: Resolución Vía 1: Autorizar con stock negativo y solicitud de reposición.
        La prenda física ya se entregó. El stock central baja de 0 a -1 y la venta se consolida.
        """
        headers = {"Authorization": f"Bearer {setup_data['token_encargado_a']}"}
        payload = {
            "resolution_type": "negative_stock",
            "resolution_note": "Prenda entregada físicamente en mostrador; se solicita reposición a almacén central.",
        }
        resp = client.post(
            f"/api/sales/conflicts/{setup_data['sale_conf_1_id']}/resolve?branch_id={setup_data['branch_a_id']}",
            json=payload,
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["status"] == "completed"
        assert data["resolution_type"] == "negative_stock"
        assert data["resulting_stock"] == -1
        assert "reposición" in data["message"].lower()

        # Verificar en base de datos
        with SessionLocal() as db:
            inv = db.query(Inventory).filter_by(
                variant_id=setup_data["var_orig_id"],
                branch_id=setup_data["branch_a_id"],
            ).first()
            assert inv.quantity == -1
            sale = db.query(Sale).filter_by(id=setup_data["sale_conf_1_id"]).first()
            assert sale.cash_reference.startswith("RESOLVED:NEGATIVE_STOCK")

    def test_03_resolve_via_variant_substitution(self, setup_data):
        """
        CP-CU16-03: Resolución Vía 2: Sustitución por variante disponible.
        Cliente acepta cambio por Talla L (stock 3). Se descuenta a 2 y se reasigna la prenda.
        """
        headers = {"Authorization": f"Bearer {setup_data['token_encargado_a']}"}
        payload = {
            "resolution_type": "substitute",
            "new_variant_id": str(setup_data["var_subst_id"]),
            "resolution_note": "Cliente contactado por teléfono; aceptó sustitución por Talla L disponible.",
        }
        resp = client.post(
            f"/api/sales/conflicts/{setup_data['sale_conf_2_id']}/resolve?branch_id={setup_data['branch_a_id']}",
            json=payload,
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["status"] == "completed"
        assert data["resolution_type"] == "substitute"
        assert data["resulting_stock"] == 2  # Era 3, se vendió 1 -> queda 2

        # Verificar en base de datos
        with SessionLocal() as db:
            inv_subst = db.query(Inventory).filter_by(
                variant_id=setup_data["var_subst_id"],
                branch_id=setup_data["branch_a_id"],
            ).first()
            assert inv_subst.quantity == 2
            sale = db.query(Sale).filter_by(id=setup_data["sale_conf_2_id"]).first()
            assert str(setup_data["var_subst_id"]) in sale.cash_reference

    def test_04_resolve_via_credit_note(self, setup_data):
        """
        CP-CU16-04: Resolución Vía 3: Anulación contable y emisión de Nota de Crédito Digital.
        La venta pasa a 'cancelled' y se genera código NC-YYYYMMDD-XXXX por el 100% pagado.
        """
        headers = {"Authorization": f"Bearer {setup_data['token_encargado_a']}"}
        payload = {
            "resolution_type": "credit_note",
            "resolution_note": "Cliente solicita anulación total; se emite Nota de Crédito digital para compras futuras.",
        }
        resp = client.post(
            f"/api/sales/conflicts/{setup_data['sale_conf_3_id']}/resolve?branch_id={setup_data['branch_a_id']}",
            json=payload,
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["status"] == "cancelled"
        assert data["resolution_type"] == "credit_note"
        assert data["credit_note_code"] is not None
        assert data["credit_note_code"].startswith("NC-")

        # Verificar en base de datos la existencia de GarmentReturn
        with SessionLocal() as db:
            ret = db.query(GarmentReturn).filter_by(sale_id=setup_data["sale_conf_3_id"]).first()
            assert ret is not None
            assert ret.refund_amount == Decimal("150.00")
            assert ret.retention_percentage == Decimal("0.00")  # Cero retención al cliente
            assert ret.credit_note_code == data["credit_note_code"]

    def test_05_substitute_fails_if_no_stock_for_new_variant(self, setup_data):
        """
        Intento de sustitución por variante con stock 0 debe ser rechazado con HTTP 400.
        """
        # Crear un conflicto temporal para probar el fallo
        with SessionLocal() as db:
            temp_sale = Sale(
                id=uuid.uuid4(),
                tenant_id=setup_data["tenant_a_id"],
                branch_id=setup_data["branch_a_id"],
                user_id=setup_data["cajero_a_id"],
                client_sale_id=uuid.uuid4(),
                is_offline=True,
                status=SaleStatusEnum.completed,
                payment_method=PaymentMethodEnum.cash,
                payment_status=PaymentStatusEnum.paid,
                cash_reference="CONFLICT:Stock agotado",
                subtotal=Decimal("150.00"),
                total_amount=Decimal("150.00"),
            )
            db.add(temp_sale)
            db.commit()
            temp_item = SaleItem(
                sale_id=temp_sale.id,
                variant_id=setup_data["var_orig_id"],
                quantity=1,
                unit_price=Decimal("150.00"),
                line_total=Decimal("150.00"),
                product_id=setup_data["prod_id"],
                product_name="Vestido Seda Noche",
                variant_sku="VEST-NOCHE-TEMP",
                tenant_id=setup_data["tenant_a_id"],
            )
            db.add(temp_item)
            db.commit()
            temp_id = temp_sale.id

        headers = {"Authorization": f"Bearer {setup_data['token_encargado_a']}"}
        payload = {
            "resolution_type": "substitute",
            "new_variant_id": str(setup_data["var_exhausted_id"]),  # Stock 0
            "resolution_note": "Intento de sustitución por prenda agotada.",
        }
        resp = client.post(
            f"/api/sales/conflicts/{temp_id}/resolve?branch_id={setup_data['branch_a_id']}",
            json=payload,
            headers=headers,
        )
        assert resp.status_code == 400
        error_msg = resp.json().get("message") or resp.json().get("detail", "")
        assert "No hay existencias suficientes" in error_msg

    def test_06_resolution_requires_audit_note_min_5_chars(self, setup_data):
        """
        Regla de Auditoría: Se rechaza cualquier resolución con nota de menos de 5 caracteres.
        """
        headers = {"Authorization": f"Bearer {setup_data['token_encargado_a']}"}
        payload = {
            "resolution_type": "negative_stock",
            "resolution_note": "ok",  # Demasiado corta (< 5)
        }
        resp = client.post(
            f"/api/sales/conflicts/{setup_data['sale_conf_1_id']}/resolve?branch_id={setup_data['branch_a_id']}",
            json=payload,
            headers=headers,
        )
        assert resp.status_code == 422

    def test_07_multitenant_isolation(self, setup_data):
        """
        Encargado de Tenant B no debe poder ver ni resolver conflictos de Tenant A.
        """
        headers = {"Authorization": f"Bearer {setup_data['token_encargado_b']}"}
        # Intentar listar conflictos de branch_a bajo token de Tenant B
        resp = client.get(
            f"/api/sales/conflicts?branch_id={setup_data['branch_a_id']}",
            headers=headers,
        )
        assert resp.status_code == 200
        # Debe retornar lista vacía porque branch_a no pertenece a Tenant B
        assert len(resp.json()) == 0

        # Intentar resolver venta de Tenant A bajo token de Tenant B -> HTTP 404
        payload = {
            "resolution_type": "negative_stock",
            "resolution_note": "Intento no autorizado de resolución cruzada.",
        }
        resp_resolve = client.post(
            f"/api/sales/conflicts/{setup_data['sale_conf_1_id']}/resolve?branch_id={setup_data['branch_a_id']}",
            json=payload,
            headers=headers,
        )
        assert resp_resolve.status_code == 404
