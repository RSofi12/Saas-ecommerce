import uuid
from datetime import date, timedelta
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

try:
    from backend.main import app
except ModuleNotFoundError:
    from main import app

from app.core.database import SessionLocal
from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p2_gestion_productos_catalogo.models.category import Category
from app.packages.p2_gestion_productos_catalogo.models.product import Product
from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p2_gestion_productos_catalogo.schemas.catalog_enums import ProductStatusEnum
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory import Inventory
from app.packages.p4_gestion_compras_reservas.models.reservation import Reservation
from app.packages.p4_gestion_compras_reservas.models.reservation_item import ReservationItem
from app.packages.p4_gestion_compras_reservas.schemas.reservation_schema import (
    ReservationCreate,
    ReservationItemCreate,
    ReservationStatusEnum,
)
from app.packages.p4_gestion_compras_reservas.services.expiration_service import run_expiration_sweep
from app.packages.p4_gestion_compras_reservas.services.reservation_service import (
    create_reservation,
    expire_due_reservations,
)
from app.schemas.enums import RolEnum
from app.auth.jwt import create_access_token
from app.models.notification import Notification

client = TestClient(app)


class TestCU10ReservationExpirationSweeper:
    """
    Suite de verificación para CU10:
    Verifica que las reservas vencidas (expires_at <= today) sean detectadas por el mecanismo
    de expiración (servicio y endpoint sweeper) y liberen automáticamente el stock bloqueado
    (reserved_quantity) devolviéndolo a disponibilidad general.
    """

    @pytest.fixture(scope="class", autouse=True)
    def setup_data(self):
        with SessionLocal() as db:
            # 1. Tenant
            tenant = Company(
                name=f"Tenant CU10 {uuid.uuid4().hex[:6]}",
                subdomain=f"cu10-{uuid.uuid4().hex[:6]}",
                business_name="CU10 Boutique SRL",
                nit_rut=f"203040{uuid.uuid4().hex[:4]}",
                email=f"admin_cu10_{uuid.uuid4().hex[:6]}@test.com",
            )
            db.add(tenant)
            db.flush()

            # 2. Sucursal
            branch = Branch(
                name=f"Sucursal CU10 {uuid.uuid4().hex[:6]}",
                city="Santa Cruz",
                is_active=True,
                tenant_id=tenant.id,
            )
            db.add(branch)
            db.flush()

            # 3. Usuario Administrador y Cliente
            admin_user = User(
                name="Admin CU10",
                email=f"admin_{uuid.uuid4().hex[:6]}@cu10.com",
                hashed_password="hashed_pw_test",
                rol=RolEnum.administrador,
                tenant_id=tenant.id,
            )
            db.add(admin_user)

            client_user = User(
                name="Cliente CU10",
                email=f"cliente_{uuid.uuid4().hex[:6]}@cu10.com",
                hashed_password="hashed_pw_test",
                rol=RolEnum.cliente,
                tenant_id=tenant.id,
            )
            db.add(client_user)
            db.flush()

            # 4. Producto, Categoría y Variante
            cat = db.query(Category).first()
            if not cat:
                cat = Category(name=f"Cat CU10 {uuid.uuid4().hex[:4]}")
                db.add(cat)
                db.flush()

            prod = Product(name="Vestido Elegance CU10", tenant_id=tenant.id, category_id=cat.id)
            db.add(prod)
            db.flush()

            variant = ProductVariant(
                product_id=prod.id,
                tenant_id=tenant.id,
                sku=f"SKU-CU10-{uuid.uuid4().hex[:6]}",
                price=150.0,
                status=ProductStatusEnum.active,
            )
            db.add(variant)
            db.flush()

            # 5. Inventario Inicial: 20 unidades físicas, 0 reservadas
            inv = Inventory(
                variant_id=variant.id,
                branch_id=branch.id,
                quantity=20,
                reserved_quantity=0,
            )
            db.add(inv)
            db.commit()

            data = {
                "tenant_id": tenant.id,
                "branch_id": branch.id,
                "admin_id": admin_user.id,
                "admin_email": admin_user.email,
                "client_id": client_user.id,
                "variant_id": variant.id,
            }

        yield data

        # Cleanup
        with SessionLocal() as db:
            res_ids = [r.id for r in db.query(Reservation.id).filter(Reservation.branch_id == data["branch_id"]).all()]
            if res_ids:
                db.query(ReservationItem).filter(ReservationItem.reservation_id.in_(res_ids)).delete(synchronize_session=False)
                db.query(Reservation).filter(Reservation.id.in_(res_ids)).delete(synchronize_session=False)
            db.query(Inventory).filter(Inventory.branch_id == data["branch_id"]).delete(synchronize_session=False)
            db.query(ProductVariant).filter(ProductVariant.id == data["variant_id"]).delete(synchronize_session=False)
            db.query(Product).filter(Product.tenant_id == data["tenant_id"]).delete(synchronize_session=False)
            db.query(Notification).filter(Notification.user_id.in_([data["admin_id"], data["client_id"]])).delete(synchronize_session=False)
            db.query(User).filter(User.tenant_id == data["tenant_id"]).delete(synchronize_session=False)
            db.query(Branch).filter(Branch.id == data["branch_id"]).delete(synchronize_session=False)
            db.query(Company).filter(Company.id == data["tenant_id"]).delete(synchronize_session=False)
            db.commit()

    def test_01_create_reservation_locks_stock(self, setup_data):
        """
        Crea una reserva online activa (válida a futuro) y verifica que se comprometa stock
        en reserved_quantity.
        """
        tenant_id = setup_data["tenant_id"]
        branch_id = setup_data["branch_id"]
        client_id = setup_data["client_id"]
        variant_id = setup_data["variant_id"]

        with SessionLocal() as db:
            payload = ReservationCreate(
                branch_id=branch_id,
                visit_date=date.today() + timedelta(days=2),
                items=[ReservationItemCreate(variant_id=variant_id, quantity=4)],
            )
            res = create_reservation(db, client_id, payload, tenant_id=tenant_id)
            assert res["status"] == ReservationStatusEnum.pending.value
            assert res["expires_at"] == date.today() + timedelta(days=3)

            inv = db.query(Inventory).filter(
                Inventory.variant_id == variant_id,
                Inventory.branch_id == branch_id,
            ).first()
            assert inv.reserved_quantity == 4
            available = inv.quantity - inv.reserved_quantity
            assert available == 16  # 20 - 4

    def test_02_expiration_sweep_releases_stock_for_expired_reservation(self, setup_data):
        """
        Crea una reserva forzando expires_at <= hoy (ayer) para simular vencimiento.
        Ejecuta run_expiration_sweep() y verifica:
        1. Estado cambia a 'expired'.
        2. reserved_quantity decrementa a 0 (restituyendo las existencias al stock general disponible).
        """
        tenant_id = setup_data["tenant_id"]
        branch_id = setup_data["branch_id"]
        client_id = setup_data["client_id"]
        variant_id = setup_data["variant_id"]

        with SessionLocal() as db:
            # Crear reserva ya vencida
            expired_res = Reservation(
                tenant_id=tenant_id,
                branch_id=branch_id,
                user_id=client_id,
                visit_date=date.today() - timedelta(days=2),
                expires_at=date.today() - timedelta(days=1),
                status=ReservationStatusEnum.pending,
                total_amount=Decimal("300.00"),
            )
            db.add(expired_res)
            db.flush()

            db.add(
                ReservationItem(
                    tenant_id=tenant_id,
                    reservation_id=expired_res.id,
                    variant_id=variant_id,
                    quantity=5,
                    unit_price=Decimal("150.00"),
                )
            )

            # Ajustar inventario para simular que esas 5 piezas estaban bloqueadas
            inv = db.query(Inventory).filter(
                Inventory.variant_id == variant_id,
                Inventory.branch_id == branch_id,
            ).first()
            inv.reserved_quantity = 5
            db.commit()

            # Ejecutar barrido de expiración
            results = run_expiration_sweep(db)
            assert results["expired_reservations_count"] >= 1

            # Verificar que la reserva ahora está expirada
            db.refresh(expired_res)
            assert expired_res.status == ReservationStatusEnum.expired

            # Verificar que el stock comprometido se liberó a 0
            db.refresh(inv)
            assert inv.reserved_quantity == 0
            available = inv.quantity - inv.reserved_quantity
            assert available == 20

    def test_03_sweeper_endpoint_execution(self, setup_data):
        """
        Verifica que el endpoint POST /api/reservations/sweeper ejecute el barrido
        y devuelva respuesta 200 con el conteo de entidades caducadas.
        """
        tenant_id = setup_data["tenant_id"]
        admin_id = setup_data["admin_id"]
        admin_email = setup_data["admin_email"]

        # Generar token de administrador
        token = create_access_token(
            data={
                "sub": str(admin_id),
                "email": admin_email,
                "rol": RolEnum.administrador.value,
                "tenant_id": str(tenant_id),
            }
        )

        resp = client.post(
            "/api/reservations/sweeper",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["statusCode"] == 200
        assert "data" in body
        assert "expired_reservations_count" in body["data"]
        assert "total_expired" in body["data"]

    def test_04_unexpired_reservations_are_not_affected(self, setup_data):
        """
        Verifica que una reserva vigente a futuro no sea afectada por el barrido.
        """
        tenant_id = setup_data["tenant_id"]
        branch_id = setup_data["branch_id"]
        client_id = setup_data["client_id"]
        variant_id = setup_data["variant_id"]

        with SessionLocal() as db:
            future_res = Reservation(
                tenant_id=tenant_id,
                branch_id=branch_id,
                user_id=client_id,
                visit_date=date.today() + timedelta(days=3),
                expires_at=date.today() + timedelta(days=4),
                status=ReservationStatusEnum.pending,
                total_amount=Decimal("150.00"),
            )
            db.add(future_res)
            db.flush()

            db.add(
                ReservationItem(
                    tenant_id=tenant_id,
                    reservation_id=future_res.id,
                    variant_id=variant_id,
                    quantity=3,
                    unit_price=Decimal("150.00"),
                )
            )

            inv = db.query(Inventory).filter(
                Inventory.variant_id == variant_id,
                Inventory.branch_id == branch_id,
            ).first()
            inv.reserved_quantity = 3
            db.commit()

            # Correr el barrido
            run_expiration_sweep(db)

            # La reserva debe permanecer en 'pending'
            db.refresh(future_res)
            assert future_res.status == ReservationStatusEnum.pending

            # El stock comprometido debe permanecer bloqueado en 3
            db.refresh(inv)
            assert inv.reserved_quantity == 3
