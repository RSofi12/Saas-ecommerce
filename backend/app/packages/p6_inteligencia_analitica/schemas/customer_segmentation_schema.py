from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SegmentationTrainRequest(BaseModel):
    k_clusters: int = Field(default=4, ge=2, le=8, description="Número de clústeres a formar con K-Means (default 4)")
    use_synthetic_fallback: bool = Field(default=True, description="Usar dataset sintético de CU22 si existen < 10 clientes con historial real")
    random_state: int = Field(default=42, description="Semilla aleatoria para reproducibilidad de centroides")


class CentroidMetrics(BaseModel):
    recency_days: float = Field(..., description="Días promedio desde la última compra")
    frequency_count: float = Field(..., description="Frecuencia promedio de compras")
    monetary_total: float = Field(..., description="Gasto monetario acumulado promedio en Bs")
    return_rate: float = Field(..., description="Tasa promedio de cambios y devoluciones (0.0 a 1.0)")


class ClusterProfileSummary(BaseModel):
    cluster_id: int
    name: str
    description: str
    recommended_action: str
    customer_count: int
    percentage: float
    centroid: CentroidMetrics
    badge_color: str
    badge_icon: str


class SegmentationTrainResponse(BaseModel):
    model_id: str
    model_version: str
    tenant_id: str
    trained_at: datetime
    total_customers_analyzed: int
    k_clusters: int
    silhouette_score: float
    inertia: float
    data_source: str
    clusters: List[ClusterProfileSummary]


class ScatterPoint(BaseModel):
    customer_id: str
    customer_name: Optional[str] = None
    recency_days: float
    frequency_count: float
    monetary_total: float
    return_rate: float
    cluster_id: int
    cluster_name: str
    color: str


class SegmentationScatterResponse(BaseModel):
    tenant_id: str
    k_clusters: int
    total_points: int
    silhouette_score: float
    points: List[ScatterPoint]


class CustomerSegmentItem(BaseModel):
    id: str
    user_id: str
    customer_name: str
    customer_email: str
    cluster_id: int
    segment_label: str
    recency_days: Optional[int] = None
    frequency_count: Optional[int] = None
    monetary_total: Optional[float] = None
    return_rate: Optional[float] = None
    assigned_at: Optional[datetime] = None


class CustomerSegmentListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    cluster_id: Optional[int] = None
    customers: List[CustomerSegmentItem]
