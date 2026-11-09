from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.packages.p0_saas_plataforma.models.plan import Plan
from app.packages.p0_saas_plataforma.models.subscription import Subscription
from app.packages.p0_saas_plataforma.schemas.plan_schema import (
    PlanCreate,
    PlanRead,
    PlanUpdate,
    PlanStatusUpdate,
)
from app.utils.response import response

router = APIRouter(prefix="/saas/plans", tags=["SaaS Plans"])


@router.get("", summary="Listar planes comerciales disponibles")
def list_plans(
    include_inactive: bool = Query(False, description="Incluir planes inactivos (Superadmin)"),
    db: Session = Depends(get_db),
):
    query = db.query(Plan)
    if not include_inactive:
        query = query.filter(Plan.is_active.is_(True))

    plans = query.order_by(Plan.price_monthly.asc()).all()

    # Si la base de datos no tiene planes aun, sembramos los tres oficiales de catedra
    if not plans:
        basic = Plan(
            name="BASICO",
            code="basic",
            description="Plan esencial para boutiques individuales. Incluye hasta 3 sucursales activas y gestión estándar de inventario y ventas POS.",
            max_branches=3,
            has_ai_access=False,
            price_monthly=29.00,
        )
        pro = Plan(
            name="PROFESIONAL",
            code="pro",
            description="Plan avanzado para marcas en expansión. Incluye hasta 10 sucursales activas, analítica predictiva y asistente de voz con Gemini IA.",
            max_branches=10,
            has_ai_access=True,
            price_monthly=99.00,
        )
        enterprise = Plan(
            name="EMPRESARIAL",
            code="enterprise",
            description="Plan corporativo para grandes cadenas y franquicias. Incluye hasta 223 sucursales activas, analítica predictiva avanzada, Gemini IA y copias de seguridad continuas.",
            max_branches=223,
            has_ai_access=True,
            price_monthly=199.00,
        )
        db.add_all([basic, pro, enterprise])
        db.commit()
        plans = [basic, pro, enterprise]
    else:
        # Aseguramos que el plan enterprise tenga hasta 223 sucursales si aún conservaba el default anterior
        enterprise_plan = next((p for p in plans if p.code == "enterprise"), None)
        if enterprise_plan and enterprise_plan.max_branches < 223:
            enterprise_plan.max_branches = 223
            enterprise_plan.description = "Plan corporativo para grandes cadenas y franquicias. Incluye hasta 223 sucursales activas, analítica predictiva avanzada, Gemini IA y copias de seguridad continuas."
            db.commit()
            db.refresh(enterprise_plan)

    data = [PlanRead.model_validate(p).model_dump() for p in plans]
    return response(
        status_code=status.HTTP_200_OK,
        message="Planes obtenidos exitosamente",
        data=data,
    )


@router.get("/{plan_id}", summary="Obtener detalle de un plan comercial")
def get_plan(plan_id: UUID, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan con ID '{plan_id}' no encontrado",
        )
    return response(
        status_code=status.HTTP_200_OK,
        message="Plan obtenido exitosamente",
        data=PlanRead.model_validate(plan).model_dump(),
    )


@router.post("", summary="Crear un nuevo plan comercial (Superadmin)")
def create_plan(plan_in: PlanCreate, db: Session = Depends(get_db)):
    existing = db.query(Plan).filter(Plan.code == plan_in.code.strip().lower()).first()
    if existing:
        return response(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=f"El plan con código '{plan_in.code}' ya existe",
            data=None,
        )

    plan = Plan(
        name=plan_in.name.strip(),
        code=plan_in.code.strip().lower(),
        description=plan_in.description,
        max_branches=plan_in.max_branches,
        has_ai_access=plan_in.has_ai_access,
        price_monthly=plan_in.price_monthly,
        is_active=plan_in.is_active,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    return response(
        status_code=status.HTTP_201_CREATED,
        message="Plan creado exitosamente",
        data=PlanRead.model_validate(plan).model_dump(),
    )


@router.put("/{plan_id}", summary="Actualizar un plan comercial existente (Superadmin)")
def update_plan(plan_id: UUID, plan_in: PlanUpdate, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan con ID '{plan_id}' no encontrado",
        )

    if plan_in.name is not None:
        plan.name = plan_in.name.strip()
    if plan_in.description is not None:
        plan.description = plan_in.description
    if plan_in.max_branches is not None:
        plan.max_branches = plan_in.max_branches
    if plan_in.has_ai_access is not None:
        plan.has_ai_access = plan_in.has_ai_access
    if plan_in.price_monthly is not None:
        plan.price_monthly = plan_in.price_monthly
    if plan_in.is_active is not None:
        plan.is_active = plan_in.is_active

    db.commit()
    db.refresh(plan)

    return response(
        status_code=status.HTTP_200_OK,
        message="Plan actualizado exitosamente",
        data=PlanRead.model_validate(plan).model_dump(),
    )


@router.patch("/{plan_id}/status", summary="Cambiar estado activo/inactivo de un plan (Superadmin)")
def update_plan_status(plan_id: UUID, body: PlanStatusUpdate, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan con ID '{plan_id}' no encontrado",
        )

    plan.is_active = body.is_active
    db.commit()
    db.refresh(plan)

    state_label = "activado" if plan.is_active else "desactivado"
    return response(
        status_code=status.HTTP_200_OK,
        message=f"Plan {state_label} exitosamente",
        data=PlanRead.model_validate(plan).model_dump(),
    )


@router.delete("/{plan_id}", summary="Eliminar o desactivar plan comercial (Superadmin)")
def delete_plan(plan_id: UUID, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan con ID '{plan_id}' no encontrado",
        )

    # Validar si tiene suscripciones vinculadas
    linked_subs = db.query(Subscription).filter(Subscription.plan_id == plan_id).count()
    if linked_subs > 0:
        # Desactivación preventiva para proteger integridad referencial
        plan.is_active = False
        db.commit()
        db.refresh(plan)
        return response(
            status_code=status.HTTP_200_OK,
            message=f"El plan tiene {linked_subs} suscripciones vinculadas. Se ha desactivado en lugar de eliminar.",
            data=PlanRead.model_validate(plan).model_dump(),
        )

    db.delete(plan)
    db.commit()
    return response(
        status_code=status.HTTP_200_OK,
        message="Plan comercial eliminado exitosamente",
        data=None,
    )
