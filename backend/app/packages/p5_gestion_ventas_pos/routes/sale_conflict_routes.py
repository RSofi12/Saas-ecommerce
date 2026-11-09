# logica del CU16: Rutas API REST para Gestión y Resolución de Conflictos de Ventas Offline
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_branch_id, get_current_payload, require_roles
from app.core.database import get_db
from app.schemas.enums import RolEnum
from app.packages.p5_gestion_ventas_pos.schemas.sale_conflict_schema import (
    SaleConflictRead,
    SaleConflictResolveRequest,
    SaleConflictResolveResponse,
)
from app.packages.p5_gestion_ventas_pos.services.sale_conflict_service import (
    list_branch_sale_conflicts,
    resolve_sale_conflict,
)
from app.utils.response import response

router = APIRouter(prefix="/sales/conflicts", tags=["Sale Conflicts (CU16)"])


@router.get("", response_model=list[SaleConflictRead])
async def list_conflicts_endpoint(
    db: Session = Depends(get_db),
    current_payload: dict = Depends(require_roles(RolEnum.administrador, RolEnum.encargado)),
    current_branch_id: Optional[UUID] = Depends(get_current_branch_id),
    branch_id: Optional[UUID] = Query(default=None),
):
    """
    Lista las ventas offline de mostrador que entraron en conflicto por quiebre de stock central.
    Acceso exclusivo para el Encargado de Sucursal o Administrador del Tenant.
    """
    raw_tenant_id = current_payload.get("tenant_id")
    if not raw_tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tenant_id ausente en el token")
    tenant_id = UUID(str(raw_tenant_id))

    is_admin = current_payload.get("rol") == RolEnum.administrador.value
    resolved_branch_id = branch_id if is_admin and branch_id else current_branch_id
    if not resolved_branch_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="branch_id es requerido para auditar la bandeja de conflictos.",
        )

    conflicts = list_branch_sale_conflicts(db, resolved_branch_id, tenant_id)
    return conflicts


@router.post("/{sale_id}/resolve", response_model=SaleConflictResolveResponse)
async def resolve_conflict_endpoint(
    sale_id: UUID,
    req: SaleConflictResolveRequest,
    db: Session = Depends(get_db),
    current_payload: dict = Depends(require_roles(RolEnum.administrador, RolEnum.encargado)),
    current_branch_id: Optional[UUID] = Depends(get_current_branch_id),
    branch_id: Optional[UUID] = Query(default=None),
):
    """
    Resuelve el quiebre de stock de una venta offline adoptando una de 3 estrategias:
    - negative_stock: autoriza la venta asentando saldo temporal negativo e inicia reposición.
    - substitute: sustituye por otra prenda/variante disponible en tienda.
    - credit_note: anula contablemente la venta y emite Nota de Crédito digital al cliente.
    """
    raw_tenant_id = current_payload.get("tenant_id")
    if not raw_tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tenant_id ausente en el token")
    tenant_id = UUID(str(raw_tenant_id))

    raw_user_id = current_payload.get("sub")
    if not raw_user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="sub ausente en el token")
    user_id = UUID(str(raw_user_id))

    is_admin = current_payload.get("rol") == RolEnum.administrador.value
    resolved_branch_id = branch_id if is_admin and branch_id else current_branch_id
    if not resolved_branch_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="branch_id es requerido para resolver la incidencia de sucursal.",
        )

    res = resolve_sale_conflict(
        db=db,
        sale_id=sale_id,
        payload=req,
        manager_user_id=user_id,
        tenant_id=tenant_id,
        branch_id=resolved_branch_id,
    )
    return res
