from uuid import UUID
from sqlalchemy.orm import Session

from app.models.branch import Branch
from app.packages.p0_saas_plataforma.models.plan import Plan
from app.packages.p0_saas_plataforma.models.subscription import Subscription


class QuotaExceededException(Exception):
    def __init__(self, message: str, current_count: int, max_allowed: int):
        self.message = message
        self.current_count = current_count
        self.max_allowed = max_allowed
        super().__init__(self.message)


class FeatureNotAllowedException(Exception):
    def __init__(self, message: str, required_plan: str):
        self.message = message
        self.required_plan = required_plan
        super().__init__(self.message)


def get_active_subscription(db: Session, company_id: UUID) -> Subscription | None:
    return (
        db.query(Subscription)
        .filter(
            Subscription.company_id == company_id,
            Subscription.status.in_(["ACTIVA", "active", "trialing"]),
        )
        .first()
    )


def validate_branch_quota(db: Session, company_id: UUID) -> tuple[int, int]:
    """
    Valida si la empresa puede crear una nueva sucursal segun su plan de suscripcion.
    - Plan Basico: maximo 3 sucursales.
    - Plan Profesional: maximo 10 sucursales.
    - Plan Empresarial: maximo 223 sucursales.
    Lanza QuotaExceededException si ya alcanzo el limite.
    """
    subscription = get_active_subscription(db, company_id)
    if not subscription or not subscription.plan:
        max_branches = 3  # Por defecto cuota minima basica
    else:
        max_branches = subscription.plan.max_branches

    # Contar sucursales activas de este tenant
    active_branches_count = (
        db.query(Branch)
        .filter(Branch.tenant_id == company_id, Branch.is_active.is_(True))
        .count()
    )

    if active_branches_count >= max_branches:
        plan_name = subscription.plan.name if subscription and subscription.plan else "Basico"
        raise QuotaExceededException(
            message=f"Limite de sucursales alcanzado para el plan {plan_name}. "
                    f"Activas: {active_branches_count}, Permitidas: {max_branches}. "
                    "Actualice su plan de suscripcion para habilitar mas sucursales.",
            current_count=active_branches_count,
            max_allowed=max_branches,
        )

    return active_branches_count, max_branches


def validate_ai_access(db: Session, company_id: UUID) -> bool:
    """
    Valida si la empresa tiene habilitado el modulo de IA y analitica predictiva.
    - Plan Basico: Sin IA.
    - Plan Profesional y Empresarial: Con IA (Gemini RAG y Machine Learning).
    """
    subscription = get_active_subscription(db, company_id)
    if not subscription or not subscription.plan or not subscription.plan.has_ai_access:
        raise FeatureNotAllowedException(
            message="El modulo de Inteligencia Artificial (Gemini y Machine Learning) "
                    "requiere una suscripcion activa a Plan Profesional o Empresarial.",
            required_plan="PROFESIONAL",
        )
    return True
