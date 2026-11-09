# logica del CU17: Rutas API REST para Cotización y Ejecución de Cambio de Prenda
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_branch_id, get_current_payload, require_roles
from app.core.database import get_db
from app.schemas.enums import RolEnum
from app.packages.p5_gestion_ventas_pos.schemas.exchange_schema import (
    ExchangeQuoteRequest,
    GarmentExchangeCreate,
    GarmentExchangeResponse,
)
from app.packages.p5_gestion_ventas_pos.services.exchange_service import (
    list_garment_exchanges,
    process_garment_exchange,
    quote_garment_exchange,
)
from app.utils.response import response

router = APIRouter(prefix="/exchanges", tags=["Garment Exchanges"])


@router.post("/quote")
async def quote_exchange_endpoint(
    req: ExchangeQuoteRequest,
    db: Session = Depends(get_db),
    current_payload: dict = Depends(require_roles(RolEnum.administrador, RolEnum.encargado, RolEnum.cajero)),
    current_branch_id: Optional[UUID] = Depends(get_current_branch_id),
    branch_id: Optional[UUID] = Query(default=None),
):
    """
    Cotiza el cambio de prenda calculando la diferencia Delta y verificando el stock disponible.
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
            detail="branch_id es requerido para cotizar el stock en sucursal.",
        )

    quote = quote_garment_exchange(db, tenant_id, resolved_branch_id, req)
    return response(
        status_code=200,
        message="Cotización de cambio de prenda calculada exitosamente",
        data=quote.model_dump(),
    )


@router.post("")
async def process_exchange_endpoint(
    req: GarmentExchangeCreate,
    db: Session = Depends(get_db),
    current_payload: dict = Depends(require_roles(RolEnum.administrador, RolEnum.encargado, RolEnum.cajero)),
    current_branch_id: Optional[UUID] = Depends(get_current_branch_id),
    branch_id: Optional[UUID] = Query(default=None),
):
    """
    Procesa transaccionalmente el cambio de prenda aplicando la Política 1:
    Si Delta > 0, requiere confirmación de pago de diferencia.
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
            detail="branch_id es requerido para procesar el cambio en la sucursal.",
        )

    exchange = process_garment_exchange(
        db=db,
        tenant_id=tenant_id,
        branch_id=resolved_branch_id,
        cashier_id=cashier_id,
        req=req,
    )
    exchange_out = GarmentExchangeResponse.model_validate(exchange)
    return response(
        status_code=201,
        message="Cambio de prenda procesado y consolidado exitosamente",
        data=exchange_out.model_dump(),
    )


@router.get("")
async def list_exchanges_endpoint(
    db: Session = Depends(get_db),
    current_payload: dict = Depends(require_roles(RolEnum.administrador, RolEnum.encargado, RolEnum.cajero)),
    current_branch_id: Optional[UUID] = Depends(get_current_branch_id),
    branch_id: Optional[UUID] = Query(default=None),
):
    """
    Lista el historial de cambios de prendas registrados para el tenant/sucursal.
    """
    raw_tenant_id = current_payload.get("tenant_id")
    if not raw_tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="tenant_id ausente en el token")
    tenant_id = UUID(str(raw_tenant_id))

    is_admin = current_payload.get("rol") == RolEnum.administrador.value
    resolved_branch_id = branch_id if is_admin and branch_id else current_branch_id

    exchanges = list_garment_exchanges(db, tenant_id, resolved_branch_id)
    serialized = [GarmentExchangeResponse.model_validate(ex).model_dump() for ex in exchanges]
    return response(
        status_code=200,
        message="Historial de cambios obtenido exitosamente",
        data=serialized,
    )
