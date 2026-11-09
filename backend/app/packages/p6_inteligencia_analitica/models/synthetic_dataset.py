import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class SyntheticDataset(Base):
    """
    Registro y metadatos de conjuntos de datos sintéticos generados (CU22).
    Permite a cada tenant calibrar y alimentar los modelos de Machine Learning
    (Predicción de demanda CU23 y Segmentación K-Means CU24).
    """
    __tablename__ = "synthetic_datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    total_records = Column(Integer, nullable=False)
    months_covered = Column(Integer, nullable=False, default=24)
    categories_included = Column(JSON, nullable=False)
    sizes_distribution = Column(JSON, nullable=False)
    seasonal_factors = Column(JSON, nullable=False)
    return_rate_simulated = Column(Numeric(5, 4), nullable=False)
    exchange_rate_simulated = Column(Numeric(5, 4), nullable=False)
    generated_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    company = relationship("Company")
    user = relationship("User")
