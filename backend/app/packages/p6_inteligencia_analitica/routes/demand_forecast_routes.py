from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p6_inteligencia_analitica.models.ml_model import MLModel
from app.packages.p6_inteligencia_analitica.schemas.demand_forecast_schema import (
    DemandForecastRequest,
    DemandTrainRequest,
)
from app.packages.p6_inteligencia_analitica.services.demand_forecasting_service import (
    DemandForecastingService,
)
from app.utils.response import response

router = APIRouter(prefix="/ml/demand", tags=["ML Demand Forecasting (CU23)"])


@router.post(
    "/train",
    status_code=status.HTTP_200_OK,
    summary="Entrenar o recalibrar el modelo de regresión de demanda (CU23)",
)
def train_demand_model(
    payload: DemandTrainRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Entrena el modelo supervisado RandomForestRegressor utilizando los datos de ventas
    reales o sintéticos (CU22) del tenant autenticado.
    Aislamiento multitenant estricto y validación de suscripción (Plan Pro/Empresarial).
    """
    if current_user.rol not in ["administrador", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores o directivos pueden entrenar modelos analíticos.",
        )

    result = DemandForecastingService.train_model(
        db=db,
        tenant_id=current_user.tenant_id,
        request=payload,
    )

    return response(
        status_code=status.HTTP_200_OK,
        message="Modelo predictivo de demanda entrenado exitosamente.",
        data=result.model_dump(),
    )


@router.post(
    "/forecast",
    status_code=status.HTTP_200_OK,
    summary="Proyectar demanda de ropa por talla a 1-8 semanas (CU23)",
)
def forecast_demand(
    payload: DemandForecastRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Genera la inferencia cuantitativa de unidades demandadas por talla (S, M, L, XL),
    intervalos de confianza estadísticos y cálculo de desbalance con respecto al inventario actual.
    """
    if current_user.rol not in ["administrador", "superadmin", "encargado"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No cuenta con permisos para consultar proyecciones ejecutivas de demanda.",
        )

    result = DemandForecastingService.forecast_demand(
        db=db,
        tenant_id=current_user.tenant_id,
        request=payload,
    )

    return response(
        status_code=status.HTTP_200_OK,
        message="Proyección de demanda generada exitosamente.",
        data=result.model_dump(),
    )


@router.get(
    "/alerts",
    status_code=status.HTTP_200_OK,
    summary="Obtener alertas de reabastecimiento preventivo por quiebre proyectado",
)
def get_demand_stock_alerts(
    branch_id: Optional[UUID] = Query(None, description="Filtrar por sucursal específica"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna el listado priorizado de variantes textiles con riesgo inminente de quiebre
    de stock en base a la demanda estimada del próximo periodo.
    """
    if current_user.rol not in ["administrador", "superadmin", "encargado"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para acceder a las alertas de reposición.",
        )

    alerts = DemandForecastingService.get_stock_alerts(
        db=db,
        tenant_id=current_user.tenant_id,
        branch_id=branch_id,
    )

    return response(
        status_code=status.HTTP_200_OK,
        message="Alertas de stock obtenidas exitosamente.",
        data=[a.model_dump() for a in alerts],
    )


@router.get(
    "/latest-model",
    status_code=status.HTTP_200_OK,
    summary="Consultar estado y métricas del último modelo de demanda calibrado",
)
def get_latest_demand_model(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Devuelve los metadatos de auditoría y rendimiento (R2, MAE, RMSE) del modelo
    vigente del tenant.
    """
    latest = (
        db.query(MLModel)
        .filter(
            MLModel.tenant_id == current_user.tenant_id,
            MLModel.model_type == "DEMAND_REGRESSION",
        )
        .order_by(MLModel.trained_at.desc())
        .first()
    )

    if not latest:
        return response(
            status_code=status.HTTP_200_OK,
            message="No existe un modelo de demanda entrenado previamente para este tenant.",
            data=None,
        )

    return response(
        status_code=status.HTTP_200_OK,
        message="Metadatos del modelo predictivo obtenidos exitosamente.",
        data={
            "id": str(latest.id),
            "name": latest.name,
            "version": latest.version,
            "metrics": latest.metrics,
            "model_path": latest.model_path,
            "is_active": latest.is_active,
            "trained_at": latest.trained_at.isoformat(),
        },
    )
