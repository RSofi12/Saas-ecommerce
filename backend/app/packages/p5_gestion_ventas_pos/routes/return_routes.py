# logica del CU18: Rutas API REST para Devoluciones y Notas de Crédito
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_branch_id, get_current_payload, require_roles
from app.core.database import get_db
from app.schemas.enums import RolEnum
from app.packages.p5_gestion_ventas_pos.schemas.return_schema import (
    GarmentReturnCreate,
    GarmentReturnResponse,
    ReturnQuoteRequest,
)
from app.packages.p5_gestion_ventas_pos.services.return_service import (
    list_garment_returns,
    process_garment_return,
    quote_garment_return,
)
from app.utils.response import response

router = APIRouter(prefix="/returns", tags=["Garment Returns"])


@router.post("/quote")
async def quote_return_endpoint(
    req: ReturnQuoteRequest,
    db: Session = Depends(get_db),
    current_payload: dict = Depends(require_roles(RolEnum.administrador, RolEnum.encargado, RolEnum.cajero)),
    current_branch_id: Optional[UUID] = Depends(get_current_branch_id),
    branch_id: Optional[UUID] = Query(default=None),
):
    """
    Cotiza la devolución calculando la retención operativa (20% al 50%) y el reembolso neto.
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
            detail="branch_id es requerido para cotizar la devolución en la sucursal.",
        )

    quote = quote_garment_return(db, tenant_id, resolved_branch_id, req)
    return response(
        status_code=200,
        message="Cotización de devolución y retención operativa calculada exitosamente",
        data=quote.model_dump(),
    )


@router.post("")
async def process_return_endpoint(
    req: GarmentReturnCreate,
    db: Session = Depends(get_db),
    current_payload: dict = Depends(require_roles(RolEnum.administrador, RolEnum.encargado, RolEnum.cajero)),
    current_branch_id: Optional[UUID] = Depends(get_current_branch_id),
    branch_id: Optional[UUID] = Query(default=None),
):
    """
    Procesa transaccionalmente la devolución aplicando la retención operativa reglamentaria,
    reingresando la prenda al stock y emitiendo Nota de Crédito o reembolso en efectivo.
    """
    raw_tenant_id = current_payload.get("tenant_id")
    if not raw_tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tenant_id ausente en el token")
    tenant_id = UUID(str(raw_tenant_id))
    cashier_id = UUID(str(current_payload["sub"]))

    is_admin = current_payload.get("rol") == RolEnum.administrador.value
    resolved_branch_id = branch_id if is_admin and branch_id else current_branch_id
    if not resolved_branch_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="branch_id es requerido para procesar la devolución en la sucursal.",
        )

    ret = process_garment_return(
        db=db,
        tenant_id=tenant_id,
        branch_id=resolved_branch_id,
        cashier_id=cashier_id,
        req=req,
    )
    return_out = GarmentReturnResponse.model_validate(ret)
    return response(
        status_code=201,
        message="Devolución procesada y registrada exitosamente",
        data=return_out.model_dump(),
    )


@router.get("")
async def list_returns_endpoint(
    db: Session = Depends(get_db),
    current_payload: dict = Depends(require_roles(RolEnum.administrador, RolEnum.encargado, RolEnum.cajero)),
    current_branch_id: Optional[UUID] = Depends(get_current_branch_id),
    branch_id: Optional[UUID] = Query(default=None),
):
    """
    Lista el historial de devoluciones procesadas para el tenant/sucursal.
    """
    raw_tenant_id = current_payload.get("tenant_id")
    if not raw_tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tenant_id ausente en el token")
    tenant_id = UUID(str(raw_tenant_id))

    is_admin = current_payload.get("rol") == RolEnum.administrador.value
    resolved_branch_id = branch_id if is_admin and branch_id else current_branch_id

    returns = list_garment_returns(db, tenant_id, resolved_branch_id)
    serialized = [GarmentReturnResponse.model_validate(r).model_dump() for r in returns]
    return response(
        status_code=200,
        message="Historial de devoluciones obtenido exitosamente",
        data=serialized,
    )
