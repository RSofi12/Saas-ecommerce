import uuid
from datetime import datetime, timedelta, timezone
import pytest

try:
    from backend.main import app
except ModuleNotFoundError:
    from main import app

from app.core.database import SessionLocal
from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p0_saas_plataforma.models.plan import Plan
from app.packages.p0_saas_plataforma.models.subscription import Subscription
from app.packages.p1_gestion_usuarios_acceso.services.branch_service import get_branch_quota


class TestCU02SubscriptionManagement:
    """
    Suite de verificación formal para CU02:
    - Ciclo de vida completo de suscripciones (Asignar, Actualizar fechas, Estado VENCIDA y Renovación).
    - Comprobación de que una suscripción VENCIDA restringe la creación de sucursales en get_branch_quota.
    - Cuotas del Plan Empresarial hasta 223 sucursales.
    """

    @pytest.fixture(scope="class")
    def test_company_and_plans(self):
        with SessionLocal() as db:
            # Plan Básico
            plan_basic = db.query(Plan).filter(Plan.code == "test_basic").first()
            if not plan_basic:
                plan_basic = Plan(
                    name="Test Básico",
                    code="test_basic",
                    max_branches=3,
                    price_monthly=29.0,
                    has_ai_access=False,
                    is_active=True,
                )
                db.add(plan_basic)

            # Plan Empresarial
            plan_ent = db.query(Plan).filter(Plan.code == "test_enterprise").first()
            if not plan_ent:
                plan_ent = Plan(
                    name="Test Empresarial",
                    code="test_enterprise",
                    max_branches=223,
                    price_monthly=199.0,
                    has_ai_access=True,
                    is_active=True,
                )
                db.add(plan_ent)

            # Tenant
            company = Company(
                name=f"Boutique Test CU02 {uuid.uuid4().hex[:6]}",
                subdomain=f"sub-cu02-{uuid.uuid4().hex[:6]}",
                business_name="Boutique CU02 S.A.",
                nit_rut=f"908070{uuid.uuid4().hex[:4]}",
                email=f"admin_{uuid.uuid4().hex[:6]}@boutiquecu02.com",
            )
            db.add(company)
            db.commit()
            db.refresh(plan_basic)
            db.refresh(plan_ent)
            db.refresh(company)

            yield {
                "company_id": company.id,
                "basic_id": plan_basic.id,
                "ent_id": plan_ent.id,
            }

    def test_01_assign_initial_subscription_with_end_date(self, test_company_and_plans):
        with SessionLocal() as db:
            company_id = test_company_and_plans["company_id"]
            basic_id = test_company_and_plans["basic_id"]

            end_date = datetime.now(timezone.utc) + timedelta(days=30)
            sub = Subscription(
                company_id=company_id,
                plan_id=basic_id,
                start_date=datetime.now(timezone.utc),
                end_date=end_date,
                status="ACTIVA",
            )
            db.add(sub)
            db.commit()
            db.refresh(sub)

            assert sub.status == "ACTIVA"
            assert sub.plan.name == "Test Básico"
            assert sub.end_date is not None

            # Validar cuota
            quota = get_branch_quota(db, company_id)
            assert quota["plan_name"] == "Test Básico"
            assert quota["max_branches"] == 3
            assert quota["can_create_branch"] is True
            assert quota["subscription_status"] == "ACTIVA"

    def test_02_simulate_expired_subscription_restricts_quota(self, test_company_and_plans):
        with SessionLocal() as db:
            company_id = test_company_and_plans["company_id"]
            sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
            assert sub is not None

            # Simulamos que la suscripción ha vencido
            sub.end_date = datetime.now(timezone.utc) - timedelta(days=1)
            sub.status = "VENCIDA"
            db.commit()

            # Verificamos que get_branch_quota bloquea la creación y reporta VENCIDA
            quota = get_branch_quota(db, company_id)
            assert quota["subscription_status"] == "VENCIDA"
            assert quota["can_create_branch"] is False
            assert quota["remaining_slots"] == 0

    def test_03_simulate_renewal_restores_active_quota(self, test_company_and_plans):
        with SessionLocal() as db:
            company_id = test_company_and_plans["company_id"]
            sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
            assert sub is not None

            # Simulamos renovación administrativa por 1 año
            sub.end_date = datetime.now(timezone.utc) + timedelta(days=365)
            sub.status = "ACTIVA"
            db.commit()

            # Verificamos que la cuota se restablece
            quota = get_branch_quota(db, company_id)
            assert quota["subscription_status"] == "ACTIVA"
            assert quota["can_create_branch"] is True
            assert quota["remaining_slots"] == 3

    def test_04_upgrade_to_enterprise_plan_with_223_branches(self, test_company_and_plans):
        with SessionLocal() as db:
            company_id = test_company_and_plans["company_id"]
            ent_id = test_company_and_plans["ent_id"]

            sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
            sub.plan_id = ent_id
            db.commit()

            quota = get_branch_quota(db, company_id)
            assert quota["max_branches"] == 223
            assert quota["has_ai_access"] is True
            assert quota["can_create_branch"] is True
