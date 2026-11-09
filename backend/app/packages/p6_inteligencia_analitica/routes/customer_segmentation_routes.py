from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p6_inteligencia_analitica.schemas.customer_segmentation_schema import (
    CustomerSegmentListResponse,
    SegmentationScatterResponse,
    SegmentationTrainRequest,
    SegmentationTrainResponse,
)
from app.packages.p6_inteligencia_analitica.services.customer_segmentation_service import (
    CustomerSegmentationService,
)
from app.utils.response import response

router = APIRouter(prefix="/ml/customer-segmentation", tags=["ML Customer Segmentation (CU24)"])


@router.post(
    "/train",
    status_code=status.HTTP_200_OK,
    summary="Entrenar o recalibrar modelo K-Means de segmentación de clientes (CU24)",
)
def train_customer_segmentation(
    payload: SegmentationTrainRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Entrena el algoritmo K-Means no supervisado sobre la cartera de clientes del tenant,
    evaluando vectores de comportamiento RFM+D (Recencia, Frecuencia, Monto y Devoluciones).
    Exige Plan Profesional o Empresarial activo (has_ai_access=True) y rol directivo.
    """
    if current_user.rol not in ["administrador", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores o superadministradores pueden calibrar y entrenar la segmentación de clientes.",
        )

    result = CustomerSegmentationService.train_segmentation(
        db=db,
        tenant_id=current_user.tenant_id,
        request=payload,
    )

    return response(
        status_code=status.HTTP_200_OK,
        message="Segmentación K-Means de clientes ejecutada y persistida exitosamente.",
        data=result.model_dump(),
    )


@router.get(
    "/status",
    status_code=status.HTTP_200_OK,
    summary="Consultar estado y métricas del último modelo de clustering activo",
)
def get_segmentation_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna la telemetría del modelo de clustering vigente: Silhouette Score,
    Inercia, perfiles configurados y fecha de última ejecución.
    """
    if current_user.rol not in ["administrador", "superadmin", "encargado"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No cuenta con permisos para consultar la telemetría de segmentación.",
        )

    status_data = CustomerSegmentationService.get_status(db, current_user.tenant_id)

    return response(
        status_code=status.HTTP_200_OK,
        message="Estado de segmentación analítica obtenido exitosamente.",
        data=status_data,
    )


@router.get(
    "/scatter-points",
    status_code=status.HTTP_200_OK,
    summary="Obtener puntos RFM+D de clientes para el gráfico de dispersión 2D",
)
def get_scatter_points(
    limit: int = Query(300, ge=10, le=1000, description="Cantidad máxima de puntos a proyectar"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna coordenadas de clientes (Frecuencia vs Monto en Bs con tasa de retorno y clúster)
    para renderizado dinámico en la gráfica de dispersión del frontend.
    """
    if current_user.rol not in ["administrador", "superadmin", "encargado"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No cuenta con permisos para consultar datos de dispersión analítica.",
        )

    scatter_data = CustomerSegmentationService.get_scatter_points(
        db=db,
        tenant_id=current_user.tenant_id,
        limit=limit,
    )

    return response(
        status_code=status.HTTP_200_OK,
        message="Puntos de dispersión analítica obtenidos exitosamente.",
        data=scatter_data.model_dump(),
    )


@router.get(
    "/customers",
    status_code=status.HTTP_200_OK,
    summary="Listado paginado de clientes clasificados por clúster",
)
def get_segmented_customers(
    cluster_id: Optional[int] = Query(None, description="Filtrar por ID de clúster específico (0 a K-1)"),
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(20, ge=1, le=100, description="Registros por página"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permite explorar los clientes individuales asociados a cada clúster
    con sus métricas RFM+D para acciones de marketing focalizadas.
    """
    if current_user.rol not in ["administrador", "superadmin", "encargado"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No cuenta con permisos para consultar clientes segmentados.",
        )

    customers_data = CustomerSegmentationService.get_customers_in_segment(
        db=db,
        tenant_id=current_user.tenant_id,
        cluster_id=cluster_id,
        page=page,
        page_size=page_size,
    )

    return response(
        status_code=status.HTTP_200_OK,
        message="Listado de clientes segmentados obtenido exitosamente.",
        data=customers_data.model_dump(),
    )
