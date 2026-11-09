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
from app.packages.p5_gestion_ventas_pos.models.sale import Sale
from app.packages.p5_gestion_ventas_pos.models.sync_operation import SyncOperation
from app.packages.p5_gestion_ventas_pos.schemas.sales_schema import (
    BatchSyncItemSchema,
    BatchSyncOperationSchema,
    BatchSyncRequest,
)
from app.packages.p5_gestion_ventas_pos.services.sales_service import batch_sync_offline_sales
from app.schemas.enums import RolEnum

_CONTEXT: dict = {}


class TestCU15BatchSyncIdempotency:
    """
    Suite de pruebas para CU15:
    Sincronizar Lotes de Ventas con Idempotencia Central (sync_operations).
    Verifica:
    1. Sincronización exitosa en bloque (batch) de múltiples ventas offline.
    2. Idempotencia estricta: reenvío del mismo lote no duplica ventas ni descuenta stock dos veces.
    3. Lote mixto con operaciones ya procesadas y nuevas.
    4. Aislamiento multitenant por tenant_id.
    5. Manejo de lotes vacíos y validación de branch_id.
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
            assert branch_a is not None, "Sucursal activa de Tenant A debe existir"

            branch_b = db.query(Branch).filter(Branch.tenant_id == tenant_b.id, Branch.is_active == True).first()
            assert branch_b is not None, "Sucursal activa de Tenant B debe existir"

            cashier_a = db.query(User).filter(User.email == "cajero_cu15_a@test.com").first()
            if not cashier_a:
                cashier_a = User(
                    id=uuid.uuid4(),
                    name="Cajero Elegance CU15",
                    email="cajero_cu15_a@test.com",
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
                    quantity=100,
                    reserved_quantity=0,
                )
                db.add(inv)
                db.commit()
                db.refresh(inv)
            else:
                inv.quantity = 100
                db.commit()

            _CONTEXT["tenant_a_id"] = tenant_a.id
            _CONTEXT["tenant_b_id"] = tenant_b.id
            _CONTEXT["branch_a_id"] = branch_a.id
            _CONTEXT["branch_b_id"] = branch_b.id
            _CONTEXT["cashier_a_id"] = cashier_a.id
            _CONTEXT["variant_id"] = variant.id
            _CONTEXT["variant_price"] = variant.price
        finally:
            db.close()

    def test_batch_sync_happy_path(self):
        """
        CP-CU15-01: Sincronización exitosa de lote con 2 ventas offline.
        Verifica decremento de inventario e inserción en sync_operations y sales.
        """
        db = SessionLocal()
        try:
            sale_uuid_1 = uuid.uuid4()
            sale_uuid_2 = uuid.uuid4()

            inv_before = (
                db.query(Inventory.quantity)
                .filter(
                    Inventory.branch_id == _CONTEXT["branch_a_id"],
                    Inventory.variant_id == _CONTEXT["variant_id"],
                )
                .scalar()
            )

            payload = BatchSyncRequest(
                branch_id=_CONTEXT["branch_a_id"],
                operations=[
                    BatchSyncOperationSchema(
                        client_sale_id=sale_uuid_1,
                        cashier_id=_CONTEXT["cashier_a_id"],
                        total_amount=Decimal("140.00"),
                        payment_method="cash",
                        is_offline=True,
                        items=[
                            BatchSyncItemSchema(
                                variant_id=_CONTEXT["variant_id"],
                                quantity=2,
                                unit_price=Decimal("70.00"),
                            )
                        ],
                    ),
                    BatchSyncOperationSchema(
                        client_sale_id=sale_uuid_2,
                        cashier_id=_CONTEXT["cashier_a_id"],
                        total_amount=Decimal("70.00"),
                        payment_method="cash",
                        is_offline=True,
                        items=[
                            BatchSyncItemSchema(
                                variant_id=_CONTEXT["variant_id"],
                                quantity=1,
                                unit_price=Decimal("70.00"),
                            )
                        ],
                    ),
                ],
            )

            res = batch_sync_offline_sales(
                db=db,
                payload=payload,
                tenant_id=_CONTEXT["tenant_a_id"],
                current_user_id=_CONTEXT["cashier_a_id"],
            )

            assert res.status == "success"
            assert res.summary.total_received == 2
            assert res.summary.applied == 2
            assert res.summary.duplicates_ignored == 0
            assert sale_uuid_1 in res.processed_uuids
            assert sale_uuid_2 in res.processed_uuids

            # Verificar decremento de 3 unidades en inventario
            inv_after = (
                db.query(Inventory.quantity)
                .filter(
                    Inventory.branch_id == _CONTEXT["branch_a_id"],
                    Inventory.variant_id == _CONTEXT["variant_id"],
                )
                .scalar()
            )
            assert inv_after == inv_before - 3

            # Verificar registro en sync_operations
            sync_records = (
                db.query(SyncOperation)
                .filter(
                    SyncOperation.tenant_id == _CONTEXT["tenant_a_id"],
                    SyncOperation.client_operation_id.in_([str(sale_uuid_1), str(sale_uuid_2)]),
                )
                .all()
            )
            assert len(sync_records) == 2
            assert all(r.status == "PROCESADO" for r in sync_records)

            _CONTEXT["sale_uuid_1"] = sale_uuid_1
            _CONTEXT["sale_uuid_2"] = sale_uuid_2
        finally:
            db.close()

    def test_batch_sync_idempotency_duplicate_resend(self):
        """
        CP-CU15-02: Garantía de Idempotencia Central.
        Reenvío del mismo lote exacto ya sincronizado no duplica ventas ni descuenta stock.
        """
        db = SessionLocal()
        try:
            sale_uuid_1 = _CONTEXT["sale_uuid_1"]
            sale_uuid_2 = _CONTEXT["sale_uuid_2"]

            inv_before = (
                db.query(Inventory.quantity)
                .filter(
                    Inventory.branch_id == _CONTEXT["branch_a_id"],
                    Inventory.variant_id == _CONTEXT["variant_id"],
                )
                .scalar()
            )

            sales_count_before = (
                db.query(Sale)
                .filter(Sale.client_sale_id.in_([sale_uuid_1, sale_uuid_2]))
                .count()
            )
            assert sales_count_before == 2

            payload = BatchSyncRequest(
                branch_id=_CONTEXT["branch_a_id"],
                operations=[
                    BatchSyncOperationSchema(
                        client_sale_id=sale_uuid_1,
                        cashier_id=_CONTEXT["cashier_a_id"],
                        total_amount=Decimal("140.00"),
                        payment_method="cash",
                        is_offline=True,
                        items=[
                            BatchSyncItemSchema(
                                variant_id=_CONTEXT["variant_id"],
                                quantity=2,
                                unit_price=Decimal("70.00"),
                            )
                        ],
                    ),
                    BatchSyncOperationSchema(
                        client_sale_id=sale_uuid_2,
                        cashier_id=_CONTEXT["cashier_a_id"],
                        total_amount=Decimal("70.00"),
                        payment_method="cash",
                        is_offline=True,
                        items=[
                            BatchSyncItemSchema(
                                variant_id=_CONTEXT["variant_id"],
                                quantity=1,
                                unit_price=Decimal("70.00"),
                            )
                        ],
                    ),
                ],
            )

            res = batch_sync_offline_sales(
                db=db,
                payload=payload,
                tenant_id=_CONTEXT["tenant_a_id"],
                current_user_id=_CONTEXT["cashier_a_id"],
            )

            assert res.status == "success"
            assert res.summary.total_received == 2
            assert res.summary.applied == 0
            assert res.summary.duplicates_ignored == 2
            assert res.summary.conflicts == 0

            # El inventario debe permanecer intacto
            inv_after = (
                db.query(Inventory.quantity)
                .filter(
                    Inventory.branch_id == _CONTEXT["branch_a_id"],
                    Inventory.variant_id == _CONTEXT["variant_id"],
                )
                .scalar()
            )
            assert inv_after == inv_before

            # Cero ventas adicionales creadas
            sales_count_after = (
                db.query(Sale)
                .filter(Sale.client_sale_id.in_([sale_uuid_1, sale_uuid_2]))
                .count()
            )
            assert sales_count_after == 2
        finally:
            db.close()

    def test_batch_sync_mixed_batch(self):
        """
        CP-CU15-03: Lote Mixto con transacciones repetidas y nuevas.
        Solo las nuevas aplican inserción y descuento de existencias.
        """
        db = SessionLocal()
        try:
            sale_uuid_duplicate = _CONTEXT["sale_uuid_1"]
            sale_uuid_new = uuid.uuid4()

            inv_before = (
                db.query(Inventory.quantity)
                .filter(
                    Inventory.branch_id == _CONTEXT["branch_a_id"],
                    Inventory.variant_id == _CONTEXT["variant_id"],
                )
                .scalar()
            )

            payload = BatchSyncRequest(
                branch_id=_CONTEXT["branch_a_id"],
                operations=[
                    BatchSyncOperationSchema(
                        client_sale_id=sale_uuid_duplicate,
                        cashier_id=_CONTEXT["cashier_a_id"],
                        total_amount=Decimal("140.00"),
                        payment_method="cash",
                        is_offline=True,
                        items=[
                            BatchSyncItemSchema(
                                variant_id=_CONTEXT["variant_id"],
                                quantity=2,
                                unit_price=Decimal("70.00"),
                            )
                        ],
                    ),
                    BatchSyncOperationSchema(
                        client_sale_id=sale_uuid_new,
                        cashier_id=_CONTEXT["cashier_a_id"],
                        total_amount=Decimal("70.00"),
                        payment_method="cash",
                        is_offline=True,
                        items=[
                            BatchSyncItemSchema(
                                variant_id=_CONTEXT["variant_id"],
                                quantity=1,
                                unit_price=Decimal("70.00"),
                            )
                        ],
                    ),
                ],
            )

            res = batch_sync_offline_sales(
                db=db,
                payload=payload,
                tenant_id=_CONTEXT["tenant_a_id"],
                current_user_id=_CONTEXT["cashier_a_id"],
            )

            assert res.summary.total_received == 2
            assert res.summary.applied == 1
            assert res.summary.duplicates_ignored == 1
            assert sale_uuid_duplicate in res.processed_uuids
            assert sale_uuid_new in res.processed_uuids

            # Solo debe haberse descontado 1 unidad (la de la venta nueva)
            inv_after = (
                db.query(Inventory.quantity)
                .filter(
                    Inventory.branch_id == _CONTEXT["branch_a_id"],
                    Inventory.variant_id == _CONTEXT["variant_id"],
                )
                .scalar()
            )
            assert inv_after == inv_before - 1
        finally:
            db.close()

    def test_batch_sync_multitenant_isolation(self):
        """
        CP-CU15-04: Aislamiento Multitenant Estricto.
        Intento de sincronizar contra sucursal ajena a la empresa autenticada es rechazado.
        """
        db = SessionLocal()
        try:
            foreign_sale_uuid = uuid.uuid4()
            payload = BatchSyncRequest(
                branch_id=_CONTEXT["branch_b_id"],  # Sucursal de Moda Urbana
                operations=[
                    BatchSyncOperationSchema(
                        client_sale_id=foreign_sale_uuid,
                        cashier_id=_CONTEXT["cashier_a_id"],
                        total_amount=Decimal("70.00"),
                        payment_method="cash",
                        is_offline=True,
                        items=[
                            BatchSyncItemSchema(
                                variant_id=_CONTEXT["variant_id"],
                                quantity=1,
                                unit_price=Decimal("70.00"),
                            )
                        ],
                    )
                ],
            )

            # Intentar sincronizar sucursal B bajo tenant A debe fallar
            with pytest.raises(ValueError, match="no pertenece a la empresa"):
                batch_sync_offline_sales(
                    db=db,
                    payload=payload,
                    tenant_id=_CONTEXT["tenant_a_id"],
                    current_user_id=_CONTEXT["cashier_a_id"],
                )
        finally:
            db.close()

    def test_batch_sync_empty_operations(self):
        """
        Lote vacío responde exitosamente con contadores en cero.
        """
        db = SessionLocal()
        try:
            payload = BatchSyncRequest(
                branch_id=_CONTEXT["branch_a_id"],
                operations=[],
            )
            res = batch_sync_offline_sales(
                db=db,
                payload=payload,
                tenant_id=_CONTEXT["tenant_a_id"],
                current_user_id=_CONTEXT["cashier_a_id"],
            )
            assert res.status == "success"
            assert res.summary.total_received == 0
            assert res.summary.applied == 0
            assert res.summary.duplicates_ignored == 0
        finally:
            db.close()
