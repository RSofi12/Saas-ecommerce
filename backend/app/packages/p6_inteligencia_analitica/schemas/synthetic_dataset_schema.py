from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SyntheticDatasetGenerateRequest(BaseModel):
    total_records: int = Field(default=10000, ge=1000, le=100000, description="Volumen de registros a simular (1,000 a 100,000)")
    months_covered: int = Field(default=24, ge=6, le=36, description="Meses históricos a modelar (6 a 36 meses)")
    random_seed: int | None = Field(default=42, description="Semilla pseudoaleatoria para reproducibilidad experimental")
    include_returns: bool = Field(default=True, description="Incluir devoluciones con retención 20%-50% (CU18)")
    include_exchanges: bool = Field(default=True, description="Incluir cambios con cobro de diferencia (CU17)")

    model_config = ConfigDict(from_attributes=True)


class SyntheticDatasetSummary(BaseModel):
    dataset_id: UUID
    tenant_id: UUID
    file_name: str
    total_records: int
    months_covered: int
    date_range: dict[str, str]
    total_sales_simulated: float
    sizes_distribution: dict[str, int]
    categories_distribution: dict[str, int]
    return_rate_simulated: float
    exchange_rate_simulated: float
    download_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
