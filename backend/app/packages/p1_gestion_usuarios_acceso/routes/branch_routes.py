from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles, get_current_branch_id
from app.core.database import get_db
from app.packages.p1_gestion_usuarios_acceso.schemas.branch_schema import (
    BranchActiveUpdate,
    BranchCreate,
    BranchQuotaOut,
    BranchRead,
    BranchUpdate,
)
from app.packages.p1_gestion_usuarios_acceso.services.branch_service import (
    create_branch,
    delete_branch,
    get_branch_quota,
    get_branches,
    set_branch_active,
    update_branch,
)
from app.schemas.enums import RolEnum
from app.utils.response import response


router = APIRouter(prefix="/branches", tags=["Branches"])


def _extract_tenant_id(current_user: dict) -> UUID | None:
    tenant_id_str = current_user.get("tenant_id")
    if not tenant_id_str:
        return None
    try:
        return UUID(str(tenant_id_str))
    except (ValueError, TypeError):
        return None


@router.get("/quota", response_model=None, summary="Obtener cuota y límite de sucursales según plan comercial")
async def get_branch_quota_route(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(RolEnum.administrador)),
):
    tenant_id = _extract_tenant_id(current_user)
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario administrador no tiene una empresa asignada",
        )

    quota = get_branch_quota(db, tenant_id)
    return response(
        status_code=status.HTTP_200_OK,
        message="Cuota de sucursales obtenida exitosamente",
        data=BranchQuotaOut(**quota).model_dump(),
    )


@router.get("/public", summary="Listar sucursales públicas activas para clientes y mapa (CU19)")
async def list_public_branches_route(
    db: Session = Depends(get_db),
    tenant_id: UUID | None = None,
):
    branches = [b for b in get_branches(db, tenant_id=tenant_id) if b.is_active]
    branches_data = [BranchRead.model_validate(b).model_dump() for b in branches]
    return response(
        status_code=status.HTTP_200_OK,
        message="Sucursales públicas obtenidas exitosamente",
        data=branches_data,
    )


@router.get("/", summary="Listar sucursales filtradas por tenant")
async def list_branches_route(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(RolEnum.administrador)),
    current_branch_id: UUID | None = Depends(get_current_branch_id),
):
    tenant_id = _extract_tenant_id(current_user)
    branches = get_branches(db, current_branch_id, tenant_id=tenant_id)
    branches_data = [BranchRead.model_validate(branch).model_dump() for branch in branches]
    return response(
        status_code=status.HTTP_200_OK,
        message="Sucursales obtenidas exitosamente",
        data=branches_data,
    )


@router.post("/", status_code=status.HTTP_201_CREATED, summary="Crear nueva sucursal validando límites del plan")
async def create_branch_route(
    branch: BranchCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(RolEnum.administrador)),
    current_branch_id: UUID | None = Depends(get_current_branch_id),
):
    if current_branch_id is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes crear sucursales desde una sucursal asignada",
        )

    tenant_id = _extract_tenant_id(current_user)
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario administrador no tiene una empresa asignada",
        )

    try:
        db_branch = create_branch(db, branch, tenant_id=tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    branch_data = BranchRead.model_validate(db_branch).model_dump()
    return response(
        status_code=status.HTTP_201_CREATED,
        message="Sucursal creada exitosamente",
        data=branch_data,
    )


@router.put("/{branch_id}", summary="Actualizar información y coordenadas de sucursal")
async def update_branch_route(
    branch_id: UUID,
    branch_data: BranchUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(RolEnum.administrador)),
    current_branch_id: UUID | None = Depends(get_current_branch_id),
):
    if current_branch_id is not None and current_branch_id != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar esta sucursal",
        )

    tenant_id = _extract_tenant_id(current_user)
    try:
        updated_branch = update_branch(db, branch_id, branch_data, tenant_id=tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not updated_branch:
        raise HTTPException(status_code=404, detail=f"Sucursal con id {branch_id} no encontrada")

    return response(
        status_code=status.HTTP_200_OK,
        message="Sucursal actualizada exitosamente",
        data=BranchRead.model_validate(updated_branch).model_dump(),
    )


@router.patch("/{branch_id}/active", summary="Activar o desactivar sucursal bajo límites del plan")
async def update_branch_active_route(
    branch_id: UUID,
    active_data: BranchActiveUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(RolEnum.administrador)),
    current_branch_id: UUID | None = Depends(get_current_branch_id),
):
    if current_branch_id is not None and current_branch_id != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar esta sucursal",
        )

    tenant_id = _extract_tenant_id(current_user)
    try:
        updated_branch = set_branch_active(db, branch_id, active_data.is_active, tenant_id=tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not updated_branch:
        raise HTTPException(status_code=404, detail=f"Sucursal con id {branch_id} no encontrada")

    return response(
        status_code=status.HTTP_200_OK,
        message="Estado de sucursal actualizado exitosamente",
        data=BranchRead.model_validate(updated_branch).model_dump(),
    )


@router.delete("/{branch_id}", summary="Eliminar sucursal del tenant")
async def delete_branch_route(
    branch_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(RolEnum.administrador)),
    current_branch_id: UUID | None = Depends(get_current_branch_id),
):
    if current_branch_id is not None and current_branch_id != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar esta sucursal",
        )

    tenant_id = _extract_tenant_id(current_user)
    try:
        deleted = delete_branch(db, branch_id, tenant_id=tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not deleted:
        raise HTTPException(status_code=404, detail=f"Sucursal con id {branch_id} no encontrada")

    return response(
        status_code=status.HTTP_200_OK,
        message="Sucursal eliminada exitosamente",
        data={"id": str(branch_id)},
    )
