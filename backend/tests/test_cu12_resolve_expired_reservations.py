import os
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p2_gestion_productos_catalogo.models.product import Product
from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory import Inventory
from app.packages.p4_gestion_compras_reservas.models.reservation import Reservation
from app.packages.p4_gestion_compras_reservas.models.reservation_item import ReservationItem
from app.packages.p4_gestion_compras_reservas.schemas.reservation_schema import (
    ConflictResolutionType,
    ReservationConflictResolveRequest,
    ReservationStatusEnum,
)
from app.packages.p4_gestion_compras_reservas.services.reservation_service import (
    expire_due_reservations,
    list_branch_conflicts,
    resolve_reservation_conflict,
)
from app.schemas.enums import RolEnum

_CONTEXT: dict = {}


class TestCU12ResolveExpiredReservations:
    """
    Suite de pruebas para CU12:
    Atender y Resolver Conflictos de Reservas Expiradas.
    Verifica liberación automática por vencimiento, detección de factibilidad de stock,
    reactivación (+24h), sustitución de prenda, anulación definitiva y aislamiento multitenant.
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

            manager_a = db.query(User).filter(User.email == "encargado_cu12_a@test.com").first()
            if not manager_a:
                manager_a = User(
                    id=uuid.uuid4(),
                    name="Encargado Elegance CU12",
                    email="encargado_cu12_a@test.com",
                    hashed_password="hashed_pw_test",
                    rol=RolEnum.encargado,
                    tenant_id=tenant_a.id,
                    branch_id=branch_a.id,
                    is_active=True,
                )
                db.add(manager_a)
                db.commit()
                db.refresh(manager_a)

            client_a = db.query(User).filter(User.email == "cliente_cu12_a@test.com").first()
            if not client_a:
                client_a = User(
                    id=uuid.uuid4(),
                    name="Cliente Elegance CU12",
                    email="cliente_cu12_a@test.com",
                    hashed_password="hashed_pw_test",
                    rol=RolEnum.cliente,
                    tenant_id=tenant_a.id,
                    branch_id=branch_a.id,
                    is_active=True,
                )
                db.add(client_a)
                db.commit()
                db.refresh(client_a)

            prod_a = db.query(Product).filter(Product.tenant_id == tenant_a.id).first()
            assert prod_a is not None, "Debe existir al menos un producto para Elegance"

            variants = db.query(ProductVariant).filter(ProductVariant.product_id == prod_a.id).all()
            assert len(variants) >= 2, "Se requieren al menos 2 variantes para probar reactivación y sustitución"
            var_1, var_2 = variants[0], variants[1]

            inv_1 = db.query(Inventory).filter(Inventory.variant_id == var_1.id, Inventory.branch_id == branch_a.id).first()
            if not inv_1:
                inv_1 = Inventory(id=uuid.uuid4(), variant_id=var_1.id, branch_id=branch_a.id, quantity=10, reserved_quantity=0)
                db.add(inv_1)
            else:
                inv_1.quantity = 10
                inv_1.reserved_quantity = 0

            inv_2 = db.query(Inventory).filter(Inventory.variant_id == var_2.id, Inventory.branch_id == branch_a.id).first()
            if not inv_2:
                inv_2 = Inventory(id=uuid.uuid4(), variant_id=var_2.id, branch_id=branch_a.id, quantity=5, reserved_quantity=0)
                db.add(inv_2)
            else:
                inv_2.quantity = 5
                inv_2.reserved_quantity = 0

            db.commit()

            # Guardar valores escalares (UUIDs) para evitar DetachedInstanceError
            _CONTEXT["tenant_a_id"] = tenant_a.id
            _CONTEXT["tenant_b_id"] = tenant_b.id
            _CONTEXT["branch_a_id"] = branch_a.id
            _CONTEXT["branch_b_id"] = branch_b.id
            _CONTEXT["manager_a_id"] = manager_a.id
            _CONTEXT["client_a_id"] = client_a.id
            _CONTEXT["var_1_id"] = var_1.id
            _CONTEXT["var_2_id"] = var_2.id
        finally:
            db.close()

    def test_01_sweeper_expires_overdue_reservations_and_releases_stock(self):
        """Verifica que el sweeper expire reservas vencidas y decremente reserved_quantity al stock disponible."""
        db = SessionLocal()
        try:
            branch_a_id = _CONTEXT["branch_a_id"]
            tenant_a_id = _CONTEXT["tenant_a_id"]
            client_a_id = _CONTEXT["client_a_id"]
            var_1_id = _CONTEXT["var_1_id"]

            yesterday = date.today() - timedelta(days=1)
            res_id = uuid.uuid4()
            res = Reservation(
                id=res_id,
                tenant_id=tenant_a_id,
                branch_id=branch_a_id,
                user_id=client_a_id,
                visit_date=yesterday,
                expires_at=yesterday,
                status=ReservationStatusEnum.confirmed,
                total_amount=Decimal("150.00"),
                )
            item = ReservationItem(
                id=uuid.uuid4(),
                tenant_id=tenant_a_id,
                reservation_id=res_id,
                variant_id=var_1_id,
                quantity=2,
                unit_price=Decimal("75.00"),
            )
            db.add(res)
            db.add(item)

            inv = db.query(Inventory).filter(Inventory.variant_id == var_1_id, Inventory.branch_id == branch_a_id).first()
            inv.reserved_quantity = 2
            db.commit()

            expired_list = expire_due_reservations(db)
            expired_ids = [str(r.id) for r in expired_list]
            assert str(res_id) in expired_ids, "La reserva vencida debió ser expirada por el sweeper"

            db.refresh(res)
            assert res.status == ReservationStatusEnum.expired

            db.refresh(inv)
            assert inv.reserved_quantity == 0, "El stock reservado debió ser liberado a 0"

            _CONTEXT["expired_res_id"] = res_id
        finally:
            db.close()

    def test_02_list_conflicts_shows_stock_availability(self):
        """Verifica que la consulta de conflictos para el Encargado retorne can_reactivate=True cuando hay stock."""
        db = SessionLocal()
        try:
            branch_a_id = _CONTEXT["branch_a_id"]
            tenant_a_id = _CONTEXT["tenant_a_id"]
            conflicts = list_branch_conflicts(db, branch_a_id, tenant_id=tenant_a_id)

            assert len(conflicts) > 0, "Debe existir al menos un conflicto de reserva"
            target = next((c for c in conflicts if str(c["id"]) == str(_CONTEXT["expired_res_id"])), None)
            assert target is not None, "La reserva expirada debe aparecer en la lista de conflictos"
            assert target["can_reactivate"] is True, "can_reactivate debe ser True porque hay 10 unidades físicas en tienda"
            assert len(target["items_stock"]) > 0
            assert target["items_stock"][0]["available_quantity"] >= 2
        finally:
            db.close()

    def test_03_resolve_reactivate_success_when_stock_available(self):
        """Verifica que el Encargado pueda reactivar una reserva expirada extendiendo el plazo +24h."""
        db = SessionLocal()
        try:
            res_id = _CONTEXT["expired_res_id"]
            manager_a_id = _CONTEXT["manager_a_id"]
            tenant_a_id = _CONTEXT["tenant_a_id"]
            branch_a_id = _CONTEXT["branch_a_id"]
            var_1_id = _CONTEXT["var_1_id"]

            payload = ReservationConflictResolveRequest(
                resolution_type=ConflictResolutionType.reactivate,
                extended_days=1,
                notes="Cliente asistió con demora de 3 horas; se reactiva el apartado acordado.",
            )

            result = resolve_reservation_conflict(
                db=db,
                reservation_id=res_id,
                payload=payload,
                user_id=manager_a_id,
                tenant_id=tenant_a_id,
                branch_id=branch_a_id,
            )

            assert result is not None
            assert result["status"] == ReservationStatusEnum.confirmed.value
            assert result["resolution_note"] is not None
            assert "[REACTIVACIÓN +1d]" in result["resolution_note"]
            assert result["expires_at"] == date.today() + timedelta(days=1)

            inv = db.query(Inventory).filter(Inventory.variant_id == var_1_id, Inventory.branch_id == branch_a_id).first()
            assert inv.reserved_quantity == 2, "El stock reservado debió re-incrementarse a 2 unidades"
        finally:
            db.close()

    def test_04_resolve_reactivate_fails_when_stock_exhausted(self):
        """Verifica que si la prenda fue vendida tras la expiración, el backend rechace la reactivación con error."""
        db = SessionLocal()
        try:
            branch_a_id = _CONTEXT["branch_a_id"]
            tenant_a_id = _CONTEXT["tenant_a_id"]
            client_a_id = _CONTEXT["client_a_id"]
            manager_a_id = _CONTEXT["manager_a_id"]
            var_1_id = _CONTEXT["var_1_id"]

            yesterday = date.today() - timedelta(days=2)
            res_id = uuid.uuid4()
            res = Reservation(
                id=res_id,
                tenant_id=tenant_a_id,
                branch_id=branch_a_id,
                user_id=client_a_id,
                visit_date=yesterday,
                expires_at=yesterday,
                status=ReservationStatusEnum.expired,
                total_amount=Decimal("100.00"),
                )
            item = ReservationItem(
                id=uuid.uuid4(),
                tenant_id=tenant_a_id,
                reservation_id=res_id,
                variant_id=var_1_id,
                quantity=10,
                unit_price=Decimal("10.00"),
            )
            db.add(res)
            db.add(item)

            inv = db.query(Inventory).filter(Inventory.variant_id == var_1_id, Inventory.branch_id == branch_a_id).first()
            inv.quantity = 2
            inv.reserved_quantity = 2
            db.commit()

            payload = ReservationConflictResolveRequest(
                resolution_type=ConflictResolutionType.reactivate,
                extended_days=1,
                notes="Intento forzar reactivación sin stock disponible en percha.",
            )

            with pytest.raises(ValueError) as excinfo:
                resolve_reservation_conflict(
                    db=db,
                    reservation_id=res_id,
                    payload=payload,
                    user_id=manager_a_id,
                    tenant_id=tenant_a_id,
                    branch_id=branch_a_id,
                )

            assert "No es posible reactivar la reserva" in str(excinfo.value)
            assert "no cuenta con stock disponible" in str(excinfo.value)
        finally:
            db.close()

    def test_05_resolve_substitute_success(self):
        """Verifica que el Encargado pueda sustituir la prenda por otra talla o variante disponible."""
        db = SessionLocal()
        try:
            branch_a_id = _CONTEXT["branch_a_id"]
            tenant_a_id = _CONTEXT["tenant_a_id"]
            client_a_id = _CONTEXT["client_a_id"]
            manager_a_id = _CONTEXT["manager_a_id"]
            var_1_id = _CONTEXT["var_1_id"]
            var_2_id = _CONTEXT["var_2_id"]

            yesterday = date.today() - timedelta(days=1)
            res_id = uuid.uuid4()
            res = Reservation(
                id=res_id,
                tenant_id=tenant_a_id,
                branch_id=branch_a_id,
                user_id=client_a_id,
                visit_date=yesterday,
                expires_at=yesterday,
                status=ReservationStatusEnum.expired,
                total_amount=Decimal("50.00"),
                )
            item = ReservationItem(
                id=uuid.uuid4(),
                tenant_id=tenant_a_id,
                reservation_id=res_id,
                variant_id=var_1_id,
                quantity=1,
                unit_price=Decimal("50.00"),
            )
            db.add(res)
            db.add(item)
            db.commit()

            payload = ReservationConflictResolveRequest(
                resolution_type=ConflictResolutionType.substitute,
                substitute_variant_id=var_2_id,
                extended_days=2,
                notes="Cliente aceptó cambio de talla M a L por encontrarse disponible.",
            )

            result = resolve_reservation_conflict(
                db=db,
                reservation_id=res_id,
                payload=payload,
                user_id=manager_a_id,
                tenant_id=tenant_a_id,
                branch_id=branch_a_id,
            )

            assert result is not None
            assert result["status"] == ReservationStatusEnum.confirmed.value
            assert "[SUSTITUCIÓN VAR" in result["resolution_note"]
            assert result["items"][0]["variant_id"] == var_2_id

            inv_2 = db.query(Inventory).filter(Inventory.variant_id == var_2_id, Inventory.branch_id == branch_a_id).first()
            assert inv_2.reserved_quantity == 1
        finally:
            db.close()

    def test_06_resolve_close_definitively_with_audit_notes(self):
        """Verifica la anulación definitiva del conflicto cuando el cliente desiste o no hay solución."""
        db = SessionLocal()
        try:
            branch_a_id = _CONTEXT["branch_a_id"]
            tenant_a_id = _CONTEXT["tenant_a_id"]
            client_a_id = _CONTEXT["client_a_id"]
            manager_a_id = _CONTEXT["manager_a_id"]
            var_1_id = _CONTEXT["var_1_id"]

            res_id = uuid.uuid4()
            res = Reservation(
                id=res_id,
                tenant_id=tenant_a_id,
                branch_id=branch_a_id,
                user_id=client_a_id,
                visit_date=date.today(),
                expires_at=date.today(),
                status=ReservationStatusEnum.expired,
                total_amount=Decimal("80.00"),
                )
            item = ReservationItem(
                id=uuid.uuid4(),
                tenant_id=tenant_a_id,
                reservation_id=res_id,
                variant_id=var_1_id,
                quantity=1,
                unit_price=Decimal("80.00"),
            )
            db.add(res)
            db.add(item)
            db.commit()

            payload = ReservationConflictResolveRequest(
                resolution_type=ConflictResolutionType.close,
                notes="Cliente se comunicó para desistir de la compra por viaje.",
            )

            result = resolve_reservation_conflict(
                db=db,
                reservation_id=res_id,
                payload=payload,
                user_id=manager_a_id,
                tenant_id=tenant_a_id,
                branch_id=branch_a_id,
            )

            assert result is not None
            assert result["status"] == ReservationStatusEnum.cancelled.value
            assert "[CIERRE DEFINITIVO]" in result["resolution_note"]
        finally:
            db.close()

    def test_07_tenant_isolation_cross_access_prevented(self):
        """Verifica que un encargado de Tenant A no pueda consultar ni resolver reservas de Tenant B."""
        db = SessionLocal()
        try:
            tenant_a_id = _CONTEXT["tenant_a_id"]
            tenant_b_id = _CONTEXT["tenant_b_id"]
            branch_b_id = _CONTEXT["branch_b_id"]
            manager_a_id = _CONTEXT["manager_a_id"]

            res_b = db.query(Reservation).filter(Reservation.tenant_id == tenant_b_id).first()
            if not res_b:
                res_b = Reservation(
                    id=uuid.uuid4(),
                    tenant_id=tenant_b_id,
                    branch_id=branch_b_id,
                    user_id=manager_a_id,
                    visit_date=date.today(),
                    expires_at=date.today(),
                    status=ReservationStatusEnum.expired,
                    total_amount=Decimal("50.00"),
                    )
                db.add(res_b)
                db.commit()

            payload = ReservationConflictResolveRequest(
                resolution_type=ConflictResolutionType.close,
                notes="Intento de acceso cruzado no autorizado.",
            )

            result = resolve_reservation_conflict(
                db=db,
                reservation_id=res_b.id,
                payload=payload,
                user_id=manager_a_id,
                tenant_id=tenant_a_id,
                branch_id=None,
            )
            assert result is None, "El aislamiento multitenant debe impedir resolver reservas de otra empresa"
        finally:
            db.close()
