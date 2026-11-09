from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.core.database import get_db
from app.packages.p1_gestion_usuarios_acceso.schemas.enums import RolEnum
from app.packages.p6_inteligencia_analitica.schemas.voice_report_schema import (
    VoiceQueryRequest,
)
from app.packages.p6_inteligencia_analitica.services.gemini_rag_service import (
    VoiceReportException,
    get_voice_capabilities,
    process_voice_query,
)
from app.utils.response import response

router = APIRouter(prefix="/reports/voice-query", tags=["Voice Reports & Gemini RAG"])


def _resolve_tenant_id(
    current_user: dict,
    x_tenant_id: str | None = None,
) -> UUID:
    """
    Resuelve el tenant_id garantizando aislamiento de datos:
    1. Si el JWT claim contiene 'tenant_id', se prioriza.
    2. En caso de superadmin o ausencia en claim, lee el header 'X-Tenant-ID'.
    """
    token_tenant = current_user.get("tenant_id")
    if token_tenant:
        try:
            return UUID(str(token_tenant))
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El claim 'tenant_id' en el token no es un UUID válido.",
            ) from exc

    if x_tenant_id:
        try:
            return UUID(x_tenant_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El header 'X-Tenant-ID' debe ser un UUID válido.",
            ) from exc

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Se requiere identificar la empresa contratante vía token JWT o header 'X-Tenant-ID'.",
    )


@router.post("", summary="Procesar consulta ejecutiva por voz o texto con Gemini RAG")
async def process_voice_query_endpoint(
    request: VoiceQueryRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(RolEnum.administrador, RolEnum.superadmin)),
    x_tenant_id: str | None = Header(None, alias="X-Tenant-ID"),
):
    tenant_id = _resolve_tenant_id(current_user, x_tenant_id)

    try:
        report = await process_voice_query(
            db=db,
            tenant_id=tenant_id,
            query=request.query,
            branch_id=request.branch_id,
        )
        return response(
            status_code=status.HTTP_200_OK,
            message="Reporte ejecutivo generado exitosamente.",
            data=report.model_dump(mode="json"),
        )
    except VoiceReportException as err:
        return response(
            status_code=err.status_code,
            message=err.detail,
            error=err.detail,
        )
    except HTTPException:
        raise
    except Exception as exc:
        return response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Error inesperado al procesar el reporte ejecutivo.",
            error=str(exc),
        )


@router.get("/capabilities", summary="Verificar capacidades y plan de IA del tenant")
def check_voice_capabilities_endpoint(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(RolEnum.administrador, RolEnum.superadmin)),
    x_tenant_id: str | None = Header(None, alias="X-Tenant-ID"),
):
    tenant_id = _resolve_tenant_id(current_user, x_tenant_id)

    try:
        caps = get_voice_capabilities(db=db, tenant_id=tenant_id)
        return response(
            status_code=status.HTTP_200_OK,
            message="Capacidades de IA recuperadas exitosamente.",
            data=caps.model_dump(mode="json"),
        )
    except VoiceReportException as err:
        return response(
            status_code=err.status_code,
            message=err.detail,
            error=err.detail,
        )
