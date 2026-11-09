import uuid
import pytest

try:
    from backend.main import app
except ModuleNotFoundError:
    from main import app

from app.core.database import SessionLocal
from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p0_saas_plataforma.models.plan import Plan
from app.packages.p0_saas_plataforma.models.subscription import Subscription
from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch
from app.packages.p1_gestion_usuarios_acceso.schemas.branch_schema import BranchCreate, BranchUpdate
from app.packages.p1_gestion_usuarios_acceso.services.branch_service import (
    create_branch,
    delete_branch,
    get_branch_quota,
    set_branch_active,
    update_branch,
)
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory import Inventory
from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p2_gestion_productos_catalogo.models.product import Product
from app.packages.p2_gestion_productos_catalogo.models.category import Category


class TestCU04BranchQuotaRelease:
    """
    Suite de verificación para CU04:
    Verifica que al desactivar o eliminar una sucursal, la cuota en get_branch_quota()
    se libere inmediatamente en la base de datos sin requerir reinicio del servidor.
    """

    @pytest.fixture(scope="class", autouse=True)
    def setup_tenant_and_plan(self):
        with SessionLocal() as db:
            # Obtener o crear plan básico con max_branches = 3
            plan = db.query(Plan).filter(Plan.code == "BASICO").first()
            if not plan:
                plan = Plan(
                    name="Plan Básico",
                    code="BASICO",
                    price_monthly=29.0,
                    max_branches=3,
                    has_ai_access=False,
                )
                db.add(plan)
                db.flush()

            # Crear Tenant de prueba aislado
            company = Company(
                name=f"Empresa Cuota {uuid.uuid4().hex[:6]}",
                subdomain=f"cuota-{uuid.uuid4().hex[:6]}",
                business_name="Cuota Test Corp",
                nit_rut=f"102030{uuid.uuid4().hex[:4]}",
                email=f"admin_{uuid.uuid4().hex[:6]}@cuotatest.com",
            )
            db.add(company)
            db.flush()

            # Suscripción activa al Plan Básico (límite 3 sucursales)
            subscription = Subscription(
                company_id=company.id,
                plan_id=plan.id,
                status="ACTIVA",
            )
            db.add(subscription)
            db.commit()

            company_id = company.id
            plan_id = plan.id

        yield {"company_id": company_id, "plan_id": plan_id}

        # Cleanup
        with SessionLocal() as db:
            db.query(Inventory).filter(Inventory.branch_id.in_(
                db.query(Branch.id).filter(Branch.tenant_id == company_id)
            )).delete(synchronize_session=False)
            db.query(Branch).filter(Branch.tenant_id == company_id).delete(synchronize_session=False)
            db.query(Subscription).filter(Subscription.company_id == company_id).delete(synchronize_session=False)
            db.query(Company).filter(Company.id == company_id).delete(synchronize_session=False)
            db.commit()

    def test_01_initial_quota_is_empty(self, setup_tenant_and_plan):
        tenant_id = setup_tenant_and_plan["company_id"]
        with SessionLocal() as db:
            quota = get_branch_quota(db, tenant_id)
            assert quota["max_branches"] == 3
            assert quota["current_active_branches"] == 0
            assert quota["remaining_slots"] == 3
            assert quota["can_create_branch"] is True

    def test_02_reach_quota_limit(self, setup_tenant_and_plan):
        tenant_id = setup_tenant_and_plan["company_id"]
        with SessionLocal() as db:
            # Crear 3 sucursales activas (tope del plan básico)
            for i in range(1, 4):
                b = create_branch(
                    db,
                    BranchCreate(
                        name=f"Sucursal Activa {i}",
                        city="Santa Cruz",
                        is_active=True,
                    ),
                    tenant_id=tenant_id,
                )
                assert b.id is not None

            quota = get_branch_quota(db, tenant_id)
            assert quota["current_active_branches"] == 3
            assert quota["remaining_slots"] == 0
            assert quota["can_create_branch"] is False

            # Intentar crear una 4ta sucursal activa debe fallar
            with pytest.raises(ValueError, match="Límite de sucursales alcanzado"):
                create_branch(
                    db,
                    BranchCreate(
                        name="Sucursal Excedente 4",
                        city="La Paz",
                        is_active=True,
                    ),
                    tenant_id=tenant_id,
                )

    def test_03_deactivating_branch_releases_quota_immediately(self, setup_tenant_and_plan):
        tenant_id = setup_tenant_and_plan["company_id"]
        with SessionLocal() as db:
            # Seleccionar una sucursal activa
            branch = db.query(Branch).filter(Branch.tenant_id == tenant_id, Branch.is_active.is_(True)).first()
            assert branch is not None

            # Desactivar sucursal (is_active = False)
            updated = set_branch_active(db, branch.id, is_active=False, tenant_id=tenant_id)
            assert updated.is_active is False

            # La cuota DEBE reflejar la liberación inmediatamente (2 activas, 1 slot libre)
            quota = get_branch_quota(db, tenant_id)
            assert quota["current_active_branches"] == 2
            assert quota["remaining_slots"] == 1
            assert quota["can_create_branch"] is True

            # Ahora debe permitir crear una nueva sucursal activa aprovechando el slot liberado
            new_b = create_branch(
                db,
                BranchCreate(name="Sucursal Tras Desactivacion", city="Cochabamba", is_active=True),
                tenant_id=tenant_id,
            )
            assert new_b.id is not None

            # Cuota vuelve a estar llena
            quota_after = get_branch_quota(db, tenant_id)
            assert quota_after["current_active_branches"] == 3
            assert quota_after["can_create_branch"] is False

    def test_04_reactivating_when_full_is_rejected(self, setup_tenant_and_plan):
        tenant_id = setup_tenant_and_plan["company_id"]
        with SessionLocal() as db:
            # Buscar la sucursal inactiva del test anterior
            inactive_branch = db.query(Branch).filter(Branch.tenant_id == tenant_id, Branch.is_active.is_(False)).first()
            assert inactive_branch is not None

            # Intentar reactivarla cuando el cupo ya está lleno (3/3) debe fallar
            with pytest.raises(ValueError, match="Límite de sucursales alcanzado"):
                set_branch_active(db, inactive_branch.id, is_active=True, tenant_id=tenant_id)

    def test_05_delete_branch_without_dependencies_releases_quota(self, setup_tenant_and_plan):
        tenant_id = setup_tenant_and_plan["company_id"]
        with SessionLocal() as db:
            # Tomar una sucursal activa sin inventario
            branch = db.query(Branch).filter(Branch.tenant_id == tenant_id, Branch.is_active.is_(True)).first()
            assert branch is not None
            branch_id = branch.id

            # Eliminar físicamente
            deleted = delete_branch(db, branch_id, tenant_id=tenant_id)
            assert deleted is True

            # Verificar que ya no existe físicamente
            exists = db.query(Branch).filter(Branch.id == branch_id).first()
            assert exists is None

            # La cuota debe liberarse inmediatamente
            quota = get_branch_quota(db, tenant_id)
            assert quota["current_active_branches"] == 2
            assert quota["remaining_slots"] == 1
            assert quota["can_create_branch"] is True

    def test_06_delete_branch_with_historical_dependencies_soft_deletes_and_releases_quota(self, setup_tenant_and_plan):
        tenant_id = setup_tenant_and_plan["company_id"]
        with SessionLocal() as db:
            # Tomar una sucursal activa
            branch = db.query(Branch).filter(Branch.tenant_id == tenant_id, Branch.is_active.is_(True)).first()
            assert branch is not None

            # Simular un registro de inventario dependiente para disparar restricción FK
            category = db.query(Category).first()
            if not category:
                category = Category(name=f"Cat {uuid.uuid4().hex[:6]}")
                db.add(category)
                db.flush()

            prod = db.query(Product).filter(Product.tenant_id == tenant_id).first()
            if not prod:
                prod = Product(name="Test Prod", tenant_id=tenant_id, category_id=category.id)
                db.add(prod)
                db.flush()

            variant = db.query(ProductVariant).filter(ProductVariant.product_id == prod.id).first()
            if not variant:
                variant = ProductVariant(product_id=prod.id, tenant_id=tenant_id, sku=f"SKU-{uuid.uuid4().hex[:6]}", price=100.0)
                db.add(variant)
                db.flush()

            inv = Inventory(
                variant_id=variant.id,
                branch_id=branch.id,
                quantity=10,
                reserved_quantity=0,
            )
            db.add(inv)
            db.commit()

            # Intentar eliminar la sucursal: debido a la FK en inventories,
            # delete_branch() ejecuta el fallback defensivo (soft-delete is_active=False)
            deleted = delete_branch(db, branch.id, tenant_id=tenant_id)
            assert deleted is True

            # Confirmar que la sucursal se preservó pero pasó a inactiva
            db_branch = db.query(Branch).filter(Branch.id == branch.id).first()
            assert db_branch is not None
            assert db_branch.is_active is False

            # La cuota debe quedar liberada inmediatamente
            quota = get_branch_quota(db, tenant_id)
            assert quota["current_active_branches"] == 1
            assert quota["remaining_slots"] == 2
            assert quota["can_create_branch"] is True
