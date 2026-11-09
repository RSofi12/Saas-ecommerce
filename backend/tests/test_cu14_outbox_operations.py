import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

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
from app.packages.p5_gestion_ventas_pos.services.sales_service import (
    check_offline_sales_status,
    create_sale,
)
from app.schemas.enums import RolEnum

_CONTEXT: dict = {}


class TestCU14OutboxOperations:
    """
    Suite de pruebas para CU14:
    Gestionar Bandeja Local de Operaciones Pendientes (Outbox PWA / SQLite).
    Verifica:
    1. Verificación de estado de lote de client_sale_ids (identifica ventas ya sincronizadas vs pendientes).
    2. Aislamiento multitenant: no informa como sincronizadas ventas de otra empresa.
    3. Manejo de listas vacías y UUIDs inexistentes.
    4. Re-sincronización idempotente de múltiples ventas offline acumuladas en outbox.
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

            cashier_a = db.query(User).filter(User.email == "cajero_cu14_a@test.com").first()
            if not cashier_a:
                cashier_a = User(
                    id=uuid.uuid4(),
                    name="Cajero Elegance CU14",
                    email="cajero_cu14_a@test.com",
                    hashed_password="hashed_pw_test",
                    rol=RolEnum.cajero,
                    tenant_id=tenant_a.id,
                    branch_id=branch_a.id,
                    is_active=True,
                )
                db.add(cashier_a)
                db.commit()
                db.refresh(cashier_a)

            product = db.query(Product).filter(Product.tenant_id == tenant_a.id).first()
            assert product is not None, "Debe existir al menos un producto para tenant_a"

            variant = db.query(ProductVariant).filter(ProductVariant.product_id == product.id).first()
            assert variant is not None, "Debe existir al menos una variante para el producto"

            inv = (
                db.query(Inventory)
                .filter(
                    Inventory.branch_id == branch_a.id,
                    Inventory.variant_id == variant.id,
                )
                .first()
            )
            if not inv:
                inv = Inventory(
                    id=uuid.uuid4(),
                    tenant_id=tenant_a.id,
                    branch_id=branch_a.id,
                    variant_id=variant.id,
                    quantity=50,
                    reserved_quantity=0,
                )
                db.add(inv)
                db.commit()
                db.refresh(inv)
            else:
                inv.quantity = max(inv.quantity, 50)
                db.commit()

            _CONTEXT["tenant_a_id"] = tenant_a.id
            _CONTEXT["tenant_b_id"] = tenant_b.id
            _CONTEXT["branch_a_id"] = branch_a.id
            _CONTEXT["branch_b_id"] = branch_b.id
            _CONTEXT["cashier_a_id"] = cashier_a.id
            _CONTEXT["variant_id"] = variant.id
        finally:
            db.close()

    def test_01_check_offline_status_identifies_synced_and_missing(self):
        """Valida que check_offline_sales_status distinga correctamente ventas ya asentadas de pendientes."""
        db = SessionLocal()
        try:
            tenant_a_id = _CONTEXT["tenant_a_id"]
            branch_a_id = _CONTEXT["branch_a_id"]
            cashier_a_id = _CONTEXT["cashier_a_id"]
            variant_id = _CONTEXT["variant_id"]

            # 1. Crear una venta offline confirmada
            synced_client_id = uuid.uuid4()
            payload = SaleCreate(
                branch_id=branch_a_id,
                payment_method=PaymentMethodEnum.cash,
                client_sale_id=synced_client_id,
                is_offline=True,
                items=[SaleItemCreate(variant_id=variant_id, quantity=1)],
            )
            created = create_sale(db, cashier_a_id, payload, branch_a_id, tenant_id=tenant_a_id)
            assert created["client_sale_id"] == synced_client_id

            # 2. Definir client_sale_ids que aún no han llegado al servidor (pendientes en outbox)
            pending_client_id_1 = uuid.uuid4()
            pending_client_id_2 = uuid.uuid4()

            # 3. Invocar verificación de lote
            result = check_offline_sales_status(
                db,
                [synced_client_id, pending_client_id_1, pending_client_id_2],
                tenant_id=tenant_a_id,
            )

            assert synced_client_id in result["synced_ids"]
            assert pending_client_id_1 in result["missing_ids"]
            assert pending_client_id_2 in result["missing_ids"]
            assert len(result["synced_ids"]) == 1
            assert len(result["missing_ids"]) == 2
        finally:
            db.close()

    def test_02_check_offline_status_empty_list_returns_empty(self):
        """Valida respuesta segura ante lista vacía de IDs."""
        db = SessionLocal()
        try:
            tenant_a_id = _CONTEXT["tenant_a_id"]
            result = check_offline_sales_status(db, [], tenant_id=tenant_a_id)
            assert result == {"synced_ids": [], "missing_ids": []}
        finally:
            db.close()

    def test_03_check_offline_status_respects_multitenant_isolation(self):
        """Valida que una venta existente en Tenant A no se marque como sincronizada si la consulta viene de Tenant B."""
        db = SessionLocal()
        try:
            tenant_a_id = _CONTEXT["tenant_a_id"]
            tenant_b_id = _CONTEXT["tenant_b_id"]
            branch_a_id = _CONTEXT["branch_a_id"]
            cashier_a_id = _CONTEXT["cashier_a_id"]
            variant_id = _CONTEXT["variant_id"]

            client_id_tenant_a = uuid.uuid4()
            payload = SaleCreate(
                branch_id=branch_a_id,
                payment_method=PaymentMethodEnum.cash,
                client_sale_id=client_id_tenant_a,
                is_offline=True,
                items=[SaleItemCreate(variant_id=variant_id, quantity=1)],
            )
            create_sale(db, cashier_a_id, payload, branch_a_id, tenant_id=tenant_a_id)

            # Consultar desde contexto de Tenant B
            result_b = check_offline_sales_status(
                db,
                [client_id_tenant_a],
                tenant_id=tenant_b_id,
            )

            # Para Tenant B debe figurar como missing (no sincronizada en su tenant)
            assert client_id_tenant_a in result_b["missing_ids"]
            assert client_id_tenant_a not in result_b["synced_ids"]
        finally:
            db.close()

    def test_04_batch_offline_sales_sync_all_success(self):
        """Simula la sincronización en lote de 3 ventas acumuladas en la bandeja outbox."""
        db = SessionLocal()
        try:
            tenant_a_id = _CONTEXT["tenant_a_id"]
            branch_a_id = _CONTEXT["branch_a_id"]
            cashier_a_id = _CONTEXT["cashier_a_id"]
            variant_id = _CONTEXT["variant_id"]

            outbox_batch = [uuid.uuid4() for _ in range(3)]
            synced_results = []

            for cid in outbox_batch:
                payload = SaleCreate(
                    branch_id=branch_a_id,
                    payment_method=PaymentMethodEnum.cash,
                    client_sale_id=cid,
                    is_offline=True,
                    items=[SaleItemCreate(variant_id=variant_id, quantity=1)],
                )
                sale = create_sale(db, cashier_a_id, payload, branch_a_id, tenant_id=tenant_a_id)
                synced_results.append(sale)

            assert len(synced_results) == 3
            for idx, cid in enumerate(outbox_batch):
                assert synced_results[idx]["client_sale_id"] == cid
                assert synced_results[idx]["is_offline"] is True
                assert synced_results[idx]["synced_at"] is not None

            # Verificar que ahora todos los IDs están marcados como synced en el backend
            check_res = check_offline_sales_status(db, outbox_batch, tenant_id=tenant_a_id)
            assert len(check_res["synced_ids"]) == 3
            assert len(check_res["missing_ids"]) == 0
        finally:
            db.close()
