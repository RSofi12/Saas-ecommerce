import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uuid
from decimal import Decimal

import pytest
from app.core.database import SessionLocal
from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p2_gestion_productos_catalogo.models.product import Product
from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory import Inventory
from app.packages.p4_gestion_compras_reservas.schemas.order_schema import PaymentMethodEnum
from app.packages.p5_gestion_ventas_pos.models.sale import Sale
from app.packages.p5_gestion_ventas_pos.schemas.sales_schema import SaleCreate, SaleItemCreate
from app.packages.p5_gestion_ventas_pos.services.sales_service import create_sale
from app.schemas.enums import RolEnum

_CONTEXT: dict = {}


class TestCU13OfflinePosSales:
    """
    Suite de pruebas para CU13:
    Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4.
    Verifica:
    1. Registro exitoso de venta offline con client_sale_id UUIDv4, payment_method='cash', deducción de inventario y trazabilidad synced_at.
    2. Cumplimiento de Política 5: rechazo de pagos no efectivo en ventas offline.
    3. Idempotencia transaccional: reenvío del mismo client_sale_id retorna venta existente sin duplicar registros ni doble deducción de stock.
    4. Aislamiento multitenant: rechazo de client_sale_id perteneciente a otra empresa.
    5. Validación de stock insuficiente en percha local.
    """

    @classmethod
    @pytest.fixture(scope="class", autouse=True)
    def setup_data(cls):
        db = SessionLocal()
        try:
            tenant_a = db.query(Company).filter(Company.subdomain == "elegance").first()
            assert tenant_a is not None, "Tenant Boutique Elegance debe existir"

            tenant_b = db.query(Company).filter(Company.subdomain == "modaurbana").first()
            assert tenant_b is not None, "Tenant Moda Urbana debe existir"

            branch_a = db.query(Branch).filter(Branch.tenant_id == tenant_a.id, Branch.is_active == True).first()
            branch_b = db.query(Branch).filter(Branch.tenant_id == tenant_b.id, Branch.is_active == True).first()

            cashier_a = db.query(User).filter(User.email == "cajero_cu13_a@test.com").first()
            if not cashier_a:
                cashier_a = User(
                    id=uuid.uuid4(),
                    name="Cajero Elegance CU13",
                    email="cajero_cu13_a@test.com",
                    hashed_password="hashed_pw_test",
                    rol=RolEnum.cajero,
                    tenant_id=tenant_a.id,
                    branch_id=branch_a.id,
                    is_active=True,
                )
                db.add(cashier_a)
                db.commit()
                db.refresh(cashier_a)

            prod_a = db.query(Product).filter(Product.tenant_id == tenant_a.id).first()
            assert prod_a is not None, "Debe existir al menos un producto para Elegance"

            variants = db.query(ProductVariant).filter(ProductVariant.product_id == prod_a.id).all()
            assert len(variants) >= 2, "Se requieren al menos 2 variantes"
            var_1, var_2 = variants[0], variants[1]

            inv_1 = db.query(Inventory).filter(Inventory.variant_id == var_1.id, Inventory.branch_id == branch_a.id).first()
            if not inv_1:
                inv_1 = Inventory(id=uuid.uuid4(), variant_id=var_1.id, branch_id=branch_a.id, quantity=20, reserved_quantity=0)
                db.add(inv_1)
            else:
                inv_1.quantity = 20
                inv_1.reserved_quantity = 0

            db.commit()

            _CONTEXT["tenant_a_id"] = tenant_a.id
            _CONTEXT["tenant_b_id"] = tenant_b.id
            _CONTEXT["branch_a_id"] = branch_a.id
            _CONTEXT["branch_b_id"] = branch_b.id
            _CONTEXT["cashier_a_id"] = cashier_a.id
            _CONTEXT["var_1_id"] = var_1.id
            _CONTEXT["var_2_id"] = var_2.id
        finally:
            db.close()

    def test_01_create_offline_sale_cash_success(self):
        """Verifica que una venta POS offline en efectivo se registre exitosamente con UUIDv4 y descuente inventario."""
        db = SessionLocal()
        try:
            tenant_a_id = _CONTEXT["tenant_a_id"]
            branch_a_id = _CONTEXT["branch_a_id"]
            cashier_a_id = _CONTEXT["cashier_a_id"]
            var_1_id = _CONTEXT["var_1_id"]

            inv_before = db.query(Inventory).filter(Inventory.variant_id == var_1_id, Inventory.branch_id == branch_a_id).first()
            initial_stock = inv_before.quantity

            client_sale_id = uuid.uuid4()
            payload = SaleCreate(
                branch_id=branch_a_id,
                payment_method=PaymentMethodEnum.cash,
                cash_reference="Efectivo recibido Bs 200.00 / Cambio Bs 50.00",
                client_sale_id=client_sale_id,
                is_offline=True,
                items=[SaleItemCreate(variant_id=var_1_id, quantity=2)],
            )

            result = create_sale(
                db=db,
                user_id=cashier_a_id,
                payload=payload,
                branch_id=branch_a_id,
                tenant_id=tenant_a_id,
            )

            assert result is not None
            assert result["client_sale_id"] == client_sale_id
            assert result["is_offline"] is True
            assert result["synced_at"] is not None
            assert result["payment_method"] == "cash"
            assert result["status"] == "completed"

            # Verificar que el stock se haya descontado en 2 unidades
            inv_after = db.query(Inventory).filter(Inventory.variant_id == var_1_id, Inventory.branch_id == branch_a_id).first()
            assert inv_after.quantity == initial_stock - 2

            _CONTEXT["existing_client_sale_id"] = client_sale_id
        finally:
            db.close()

    def test_02_offline_sale_rejects_non_cash_payment(self):
        """Verifica la Política 5: ventas offline deben rechazar cualquier medio de pago que no sea efectivo."""
        branch_a_id = _CONTEXT["branch_a_id"]
        var_1_id = _CONTEXT["var_1_id"]

        with pytest.raises(ValueError) as excinfo:
            SaleCreate(
                branch_id=branch_a_id,
                payment_method=PaymentMethodEnum.stripe,
                client_sale_id=uuid.uuid4(),
                is_offline=True,
                items=[SaleItemCreate(variant_id=var_1_id, quantity=1)],
            )

        assert "Política 5" in str(excinfo.value) or "efectivo" in str(excinfo.value)

    def test_03_idempotent_duplicate_client_sale_id(self):
        """Verifica que el reenvío del mismo client_sale_id no duplique ventas ni descuente inventario por segunda vez."""
        db = SessionLocal()
        try:
            tenant_a_id = _CONTEXT["tenant_a_id"]
            branch_a_id = _CONTEXT["branch_a_id"]
            cashier_a_id = _CONTEXT["cashier_a_id"]
            var_1_id = _CONTEXT["var_1_id"]
            client_sale_id = _CONTEXT["existing_client_sale_id"]

            inv_before = db.query(Inventory).filter(Inventory.variant_id == var_1_id, Inventory.branch_id == branch_a_id).first()
            stock_before = inv_before.quantity

            payload = SaleCreate(
                branch_id=branch_a_id,
                payment_method=PaymentMethodEnum.cash,
                client_sale_id=client_sale_id,
                is_offline=True,
                items=[SaleItemCreate(variant_id=var_1_id, quantity=2)],
            )

            result = create_sale(
                db=db,
                user_id=cashier_a_id,
                payload=payload,
                branch_id=branch_a_id,
                tenant_id=tenant_a_id,
            )

            assert result is not None
            assert result["client_sale_id"] == client_sale_id

            # El stock no debe haber disminuido otra vez
            inv_after = db.query(Inventory).filter(Inventory.variant_id == var_1_id, Inventory.branch_id == branch_a_id).first()
            assert inv_after.quantity == stock_before, "La idempotencia debe impedir descontar el stock dos veces"

            # El conteo de ventas con ese client_sale_id debe ser estrictamente 1
            count = db.query(Sale).filter(Sale.client_sale_id == client_sale_id).count()
            assert count == 1, "No debe duplicarse la venta en base de datos"
        finally:
            db.close()

    def test_04_tenant_isolation_cross_access_prevented(self):
        """Verifica que un intento de usar un client_sale_id de otra empresa sea rechazado con error."""
        db = SessionLocal()
        try:
            tenant_b_id = _CONTEXT["tenant_b_id"]
            branch_b_id = _CONTEXT["branch_b_id"]
            cashier_a_id = _CONTEXT["cashier_a_id"]
            var_2_id = _CONTEXT["var_2_id"]
            client_sale_id = _CONTEXT["existing_client_sale_id"]

            payload = SaleCreate(
                branch_id=branch_b_id,
                payment_method=PaymentMethodEnum.cash,
                client_sale_id=client_sale_id,
                is_offline=True,
                items=[SaleItemCreate(variant_id=var_2_id, quantity=1)],
            )

            with pytest.raises(ValueError) as excinfo:
                create_sale(
                    db=db,
                    user_id=cashier_a_id,
                    payload=payload,
                    branch_id=branch_b_id,
                    tenant_id=tenant_b_id,
                )

            assert "pertenece a otra empresa" in str(excinfo.value)
        finally:
            db.close()

    def test_05_insufficient_stock_fails(self):
        """Verifica que si la cantidad vendida excede el stock físico, la venta sea rechazada."""
        db = SessionLocal()
        try:
            tenant_a_id = _CONTEXT["tenant_a_id"]
            branch_a_id = _CONTEXT["branch_a_id"]
            cashier_a_id = _CONTEXT["cashier_a_id"]
            var_1_id = _CONTEXT["var_1_id"]

            payload = SaleCreate(
                branch_id=branch_a_id,
                payment_method=PaymentMethodEnum.cash,
                client_sale_id=uuid.uuid4(),
                is_offline=True,
                items=[SaleItemCreate(variant_id=var_1_id, quantity=9999)],
            )

            with pytest.raises(ValueError) as excinfo:
                create_sale(
                    db=db,
                    user_id=cashier_a_id,
                    payload=payload,
                    branch_id=branch_a_id,
                    tenant_id=tenant_a_id,
                )

            assert "No hay stock suficiente" in str(excinfo.value)
        finally:
            db.close()
