from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.packages.p0_saas_plataforma.models.subscription import Subscription
from app.packages.p0_saas_plataforma.models.plan import Plan
from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p1_gestion_usuarios_acceso.schemas.branch_schema import (
    BranchCreate,
    BranchUpdate,
)


def get_branch_quota(db: Session, tenant_id: UUID) -> dict:
    """
    Obtiene el uso y límite de sucursales activas según el plan de suscripción del tenant,
    así como sus facultades técnicas (IA, vigencia y estado).
    """
    subscription = (
        db.query(Subscription)
        .filter(
            Subscription.company_id == tenant_id,
            Subscription.status.in_(["ACTIVA", "active", "trialing"]),
        )
        .first()
    )

    if not subscription:
        # Consultamos si existe una suscripción reciente vencida o inactiva
        recent_sub = (
            db.query(Subscription)
            .filter(Subscription.company_id == tenant_id)
            .order_by(Subscription.created_at.desc(), Subscription.start_date.desc())
            .first()
        )
        if recent_sub and recent_sub.plan:
            plan_name = recent_sub.plan.name
            plan_code = recent_sub.plan.code
            max_branches = recent_sub.plan.max_branches
            has_ai_access = bool(recent_sub.plan.has_ai_access)
            subscription_status = recent_sub.status
            end_date = recent_sub.end_date
        else:
            plan_name = "Sin Plan"
            plan_code = "NONE"
            max_branches = 0
            has_ai_access = False
            subscription_status = "SIN_PLAN"
            end_date = None
        is_sub_valid = False
    else:
        plan_name = subscription.plan.name if subscription.plan else "Sin Plan"
        plan_code = subscription.plan.code if subscription.plan else "NONE"
        max_branches = subscription.plan.max_branches if subscription.plan else 0
        has_ai_access = bool(subscription.plan.has_ai_access) if subscription.plan else False
        subscription_status = subscription.status
        end_date = subscription.end_date
        is_sub_valid = True

    active_branches = (
        db.query(Branch)
        .filter(Branch.tenant_id == tenant_id, Branch.is_active.is_(True))
        .count()
    )

    remaining = max(0, max_branches - active_branches) if is_sub_valid else 0
    can_create = (active_branches < max_branches) and is_sub_valid

    return {
        "plan_name": plan_name,
        "plan_code": plan_code,
        "max_branches": max_branches,
        "current_active_branches": active_branches,
        "remaining_slots": remaining,
        "can_create_branch": can_create,
        "has_ai_access": has_ai_access,
        "subscription_status": subscription_status,
        "end_date": end_date,
    }


def validate_branch_quota(db: Session, tenant_id: UUID) -> None:
    """
    Valida si el tenant puede crear o activar una nueva sucursal.
    Lanza ValueError si se excede la cuota permitida por el plan.
    """
    quota = get_branch_quota(db, tenant_id)
    if not quota["can_create_branch"]:
        raise ValueError(
            f"Límite de sucursales alcanzado ({quota['current_active_branches']}/{quota['max_branches']}). "
            f"Tu plan actual '{quota['plan_name']}' no permite más sucursales activas. "
            "Actualiza al Plan Profesional para habilitar hasta 10 sucursales."
        )


def create_branch(db: Session, branch: BranchCreate, tenant_id: UUID | None = None) -> Branch:
    if tenant_id and branch.is_active:
        validate_branch_quota(db, tenant_id)

    if branch.is_default and tenant_id:
        # Desmarcar otras sucursales por defecto del tenant
        db.query(Branch).filter(Branch.tenant_id == tenant_id, Branch.is_default.is_(True)).update(
            {Branch.is_default: False}, synchronize_session=False
        )

    db_branch = Branch(
        name=branch.name,
        city=branch.city,
        address=branch.address,
        phone=branch.phone,
        opening_hours=branch.opening_hours,
        latitude=branch.latitude,
        longitude=branch.longitude,
        is_default=branch.is_default,
        is_active=branch.is_active,
        tenant_id=tenant_id,
    )
    db.add(db_branch)
    db.commit()
    db.refresh(db_branch)
    return db_branch


def get_branches(db: Session, branch_id: UUID | None = None, tenant_id: UUID | None = None) -> list[Branch]:
    query = select(Branch)
    if tenant_id is not None:
        query = query.where(Branch.tenant_id == tenant_id)
    if branch_id is not None:
        query = query.where(Branch.id == branch_id)
    result = db.execute(query.order_by(Branch.name.asc()))
    return list(result.scalars().all())


def update_branch(db: Session, branch_id: UUID, update_data: BranchUpdate, tenant_id: UUID | None = None) -> Branch | None:
    query = db.query(Branch).filter(Branch.id == branch_id)
    if tenant_id is not None:
        query = query.filter(Branch.tenant_id == tenant_id)
    branch = query.first()
    if not branch:
        return None

    # Si se está activando una sucursal que estaba inactiva, validar cuota
    if update_data.is_active and not branch.is_active and tenant_id:
        validate_branch_quota(db, tenant_id)

    if update_data.is_default and tenant_id:
        db.query(Branch).filter(
            Branch.tenant_id == tenant_id,
            Branch.id != branch_id,
            Branch.is_default.is_(True),
        ).update({Branch.is_default: False}, synchronize_session=False)

    branch.name = update_data.name
    branch.city = update_data.city
    branch.address = update_data.address
    branch.phone = update_data.phone
    branch.opening_hours = update_data.opening_hours
    branch.latitude = update_data.latitude
    branch.longitude = update_data.longitude
    branch.is_default = update_data.is_default
    branch.is_active = update_data.is_active

    if not update_data.is_active and branch.is_default:
        branch.is_default = False

    db.commit()
    db.refresh(branch)
    return branch


def delete_branch(db: Session, branch_id: UUID, tenant_id: UUID | None = None) -> bool:
    query = db.query(Branch).filter(Branch.id == branch_id)
    if tenant_id is not None:
        query = query.filter(Branch.tenant_id == tenant_id)
    branch = query.first()
    if not branch:
        return False

    try:
        db.query(User).filter(User.branch_id == branch.id).update({User.branch_id: None}, synchronize_session=False)
        db.delete(branch)
        db.commit()
        return True
    except Exception:
        db.rollback()
        # Fallback de preservación de auditoría contable (SaaS multitenant):
        # Si la sucursal tiene registros vinculados (inventario, ventas, reservas),
        # PostgreSQL restringe el borrado físico por FK. En su lugar, se desactiva (soft-delete),
        # liberando inmediatamente la cuota del plan en /api/branches/quota.
        try:
            branch = db.query(Branch).filter(Branch.id == branch_id).first()
            if branch:
                db.query(User).filter(User.branch_id == branch.id).update({User.branch_id: None}, synchronize_session=False)
                branch.is_active = False
                branch.is_default = False
                db.commit()
                return True
        except Exception:
            db.rollback()
        raise ValueError("No se pudo eliminar la sucursal")


def set_branch_active(db: Session, branch_id: UUID, is_active: bool, tenant_id: UUID | None = None) -> Branch | None:
    query = db.query(Branch).filter(Branch.id == branch_id)
    if tenant_id is not None:
        query = query.filter(Branch.tenant_id == tenant_id)
    branch = query.first()
    if not branch:
        return None

    if is_active and not branch.is_active and tenant_id:
        validate_branch_quota(db, tenant_id)

    branch.is_active = is_active
    if not is_active and branch.is_default:
        branch.is_default = False
    db.commit()
    db.refresh(branch)
    return branch
