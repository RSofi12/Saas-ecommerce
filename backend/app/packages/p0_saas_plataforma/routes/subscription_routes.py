from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.core.database import get_db
from app.packages.p0_saas_plataforma.models.subscription import Subscription
from app.packages.p0_saas_plataforma.models.plan import Plan
from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p0_saas_plataforma.schemas.subscription_schema import (
    SubscriptionCreate,
    SubscriptionRead,
    SubscriptionUpdate,
)
from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch
from app.utils.response import response

router = APIRouter(prefix="/saas/subscriptions", tags=["SaaS Subscriptions"])


@router.get("/company/{company_id}", summary="Obtener suscripción más reciente de una empresa")
def get_company_subscription(company_id: UUID, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa {company_id} no encontrada",
        )

    # Buscamos la suscripción más reciente de la empresa (sea ACTIVA, VENCIDA o de prueba)
    sub = (
        db.query(Subscription)
        .filter(Subscription.company_id == company_id)
        .order_by(Subscription.created_at.desc(), Subscription.start_date.desc())
        .first()
    )
    if not sub:
        return response(
            status_code=status.HTTP_200_OK,
            message="La empresa no cuenta con una suscripción",
            data=None,
        )

    return response(
        status_code=status.HTTP_200_OK,
        message="Suscripción de la empresa obtenida exitosamente",
        data=SubscriptionRead.model_validate(sub).model_dump(),
    )


@router.post("", summary="Asignar o cambiar suscripción de una empresa")
def assign_subscription(sub_in: SubscriptionCreate, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == sub_in.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa {sub_in.company_id} no encontrada",
        )

    plan = db.query(Plan).filter(Plan.id == sub_in.plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan {sub_in.plan_id} no encontrado",
        )

    # Validar que si se degrada el plan, la empresa no tenga más sucursales activas que el nuevo límite
    active_branches = (
        db.query(Branch)
        .filter(Branch.tenant_id == company.id, Branch.is_active.is_(True))
        .count()
    )
    if active_branches > plan.max_branches:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede cambiar al plan {plan.name}. La empresa tiene {active_branches} sucursales activas y el plan permite un máximo de {plan.max_branches}.",
        )

    # Marcar suscripciones anteriores activas o no canceladas como CANCELADA
    prev_subs = (
        db.query(Subscription)
        .filter(
            Subscription.company_id == company.id,
            Subscription.status != "CANCELADA",
        )
        .all()
    )
    for s in prev_subs:
        s.status = "CANCELADA"

    # Crear nueva suscripción con fechas y estado provisto
    new_sub = Subscription(
        company_id=company.id,
        plan_id=plan.id,
        start_date=sub_in.start_date if sub_in.start_date else func.now(),
        end_date=sub_in.end_date,
        status=sub_in.status,
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    return response(
        status_code=status.HTTP_201_CREATED,
        message=f"Plan {plan.name} asignado exitosamente a la empresa",
        data=SubscriptionRead.model_validate(new_sub).model_dump(),
    )


@router.put("/{subscription_id}", summary="Actualizar vigencia o estado de una suscripción (Superadmin)")
def update_subscription(
    subscription_id: UUID,
    sub_in: SubscriptionUpdate,
    db: Session = Depends(get_db),
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Suscripción {subscription_id} no encontrada",
        )

    if sub_in.plan_id and sub_in.plan_id != sub.plan_id:
        plan = db.query(Plan).filter(Plan.id == sub_in.plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plan {sub_in.plan_id} no encontrado",
            )
        # Downgrade check
        active_branches = (
            db.query(Branch)
            .filter(Branch.tenant_id == sub.company_id, Branch.is_active.is_(True))
            .count()
        )
        if active_branches > plan.max_branches:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede cambiar al plan {plan.name}. La empresa tiene {active_branches} sucursales activas y el plan permite un máximo de {plan.max_branches}.",
            )
        sub.plan_id = plan.id

    if sub_in.start_date is not None:
        sub.start_date = sub_in.start_date
    if sub_in.end_date is not None:
        sub.end_date = sub_in.end_date
    if sub_in.status is not None:
        sub.status = sub_in.status

    db.commit()
    db.refresh(sub)

    return response(
        status_code=status.HTTP_200_OK,
        message="Suscripción actualizada exitosamente",
        data=SubscriptionRead.model_validate(sub).model_dump(),
    )
