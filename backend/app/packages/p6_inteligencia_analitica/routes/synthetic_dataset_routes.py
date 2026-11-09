from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p6_inteligencia_analitica.schemas.synthetic_dataset_schema import (
    SyntheticDatasetGenerateRequest,
    SyntheticDatasetSummary,
)
from app.packages.p6_inteligencia_analitica.services.synthetic_dataset_service import (
    SyntheticDatasetService,
)
from app.utils.response import response

router = APIRouter(prefix="/ml/synthetic-dataset", tags=["ML Synthetic Dataset (CU22)"])


@router.post(
    "/generate",
    status_code=status.HTTP_201_CREATED,
    summary="Generar Dataset Sintético de Ventas y Estacionalidad (CU22)",
)
def generate_synthetic_dataset(
    payload: SyntheticDatasetGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Genera un conjunto de datos transaccionales sintéticos históricos (>= 1,000 registros)
    para el tenant del usuario autenticado, modelando estacionalidad textil, distribución
    gaussiana de tallas, picos de venta quincenales y tasas de cambio/devolución.
    Requiere que el tenant cuente con suscripción activa a Plan Profesional o Empresarial (has_ai_access=True).
    """
    if current_user.rol not in ["administrador", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores de tienda o superadministradores pueden calibrar y generar datasets.",
        )

    summary = SyntheticDatasetService.generate_dataset(
        db=db,
        tenant_id=current_user.tenant_id,
        request=payload,
        generated_by=current_user.id,
    )

    return response(
        status_code=status.HTTP_201_CREATED,
        message="Dataset sintético de ventas y estacionalidad generado exitosamente.",
        data=summary.model_dump(),
    )


@router.get(
    "/latest",
    summary="Consultar metadatos del último dataset sintético generado",
)
def get_latest_dataset(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    latest = SyntheticDatasetService.get_latest_dataset(db, current_user.tenant_id)
    if not latest:
        return response(
            status_code=status.HTTP_200_OK,
            message="No se ha generado ningún dataset sintético para esta empresa aún.",
            data=None,
        )

    return response(
        status_code=status.HTTP_200_OK,
        message="Último dataset sintético obtenido exitosamente.",
        data={
            "dataset_id": str(latest.id),
            "tenant_id": str(latest.tenant_id),
            "file_name": latest.file_name,
            "total_records": latest.total_records,
            "months_covered": latest.months_covered,
            "categories_included": latest.categories_included,
            "sizes_distribution": latest.sizes_distribution,
            "seasonal_factors": latest.seasonal_factors,
            "return_rate_simulated": float(latest.return_rate_simulated),
            "exchange_rate_simulated": float(latest.exchange_rate_simulated),
            "download_url": f"/api/ml/synthetic-dataset/{latest.id}/download",
            "created_at": latest.created_at.isoformat() if latest.created_at else None,
        },
    )


@router.get(
    "/{dataset_id}/download",
    summary="Descargar archivo CSV del dataset sintético",
)
def download_dataset(
    dataset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    file_path, file_name = SyntheticDatasetService.get_dataset_file(
        db=db,
        tenant_id=current_user.tenant_id,
        dataset_id=dataset_id,
    )

    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type="text/csv",
    )
