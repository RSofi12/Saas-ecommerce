from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DemandTrainRequest(BaseModel):
    """Parámetros de entrenamiento del modelo de regresión (CU23)."""
    use_synthetic: bool = Field(
        True,
        description="Si es True, utiliza datos sintéticos de CU22 cuando las ventas reales del tenant son menores a 100 registros.",
    )
    test_size: float = Field(
        0.20,
        ge=0.10,
        le=0.40,
        description="Proporción del conjunto de evaluación (10% a 40%).",
    )
    n_estimators: int = Field(
        100,
        ge=20,
        le=300,
        description="Número de árboles en el bosque aleatorio (RandomForest).",
    )
    max_depth: Optional[int] = Field(
        12,
        ge=3,
        le=30,
        description="Profundidad máxima de los árboles para prevenir overfitting.",
    )


class DemandTrainResponse(BaseModel):
    """Resultado del entrenamiento y métricas de validación."""
    model_id: UUID
    model_version: str
    algorithm: str = "RandomForestRegressor"
    records_trained: int
    features_used: List[str]
    metrics: Dict[str, float]
    trained_at: datetime
    is_active: bool
    message: str


class DemandForecastRequest(BaseModel):
    """Petición de inferencia de demanda por prenda y horizonte temporal."""
    product_id: UUID = Field(..., description="UUID de la prenda a consultar.")
    branch_id: Optional[UUID] = Field(None, description="Sucursal específica (opcional, si es None proyecta a nivel empresa).")
    weeks_ahead: int = Field(4, ge=1, le=8, description="Horizonte de predicción en semanas (1 a 8).")
    confidence_level: float = Field(0.95, ge=0.80, le=0.99, description="Nivel de confianza estadística.")


class SizeForecastDetail(BaseModel):
    """Desglose de demanda proyectada y balance de stock para una talla específica."""
    size: str
    variant_id: Optional[UUID] = None
    sku: Optional[str] = None
    current_stock: int
    predicted_weekly_demand: List[float]
    total_predicted_units: int
    confidence_lower: int
    confidence_upper: int
    recommended_reorder: int
    stock_status: str  # "AGOTADO", "CRITICO", "BAJO", "OPTIMO", "SOBRESTOCK"


class DemandForecastResponse(BaseModel):
    """Respuesta consolidada de inferencia de demanda para la vista ejecutiva."""
    product_id: UUID
    product_name: str
    category_name: str
    branch_id: Optional[UUID] = None
    branch_name: Optional[str] = None
    weeks_ahead: int
    model_version: str
    model_r2: float
    forecast_by_size: List[SizeForecastDetail]
    total_projected_demand: int
    critical_variants_count: int
    generated_at: datetime


class StockReorderAlert(BaseModel):
    """Alerta preventiva de reabastecimiento por quiebre inminente de stock proyectado."""
    variant_id: UUID
    product_id: UUID
    product_name: str
    sku: str
    size: str
    branch_id: Optional[UUID] = None
    branch_name: Optional[str] = None
    current_stock: int
    projected_demand_next_month: int
    recommended_reorder_units: int
    urgency: str  # "ALTA", "MEDIA", "BAJA"
