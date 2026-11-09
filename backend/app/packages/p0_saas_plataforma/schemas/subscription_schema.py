from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from app.packages.p0_saas_plataforma.schemas.plan_schema import PlanRead


class SubscriptionBase(BaseModel):
    plan_id: UUID
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: str = Field("ACTIVA", pattern=r"^(ACTIVA|VENCIDA|CANCELADA)$")


class SubscriptionCreate(SubscriptionBase):
    company_id: UUID


class SubscriptionUpdate(BaseModel):
    plan_id: UUID | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: str | None = Field(None, pattern=r"^(ACTIVA|VENCIDA|CANCELADA)$")


class SubscriptionRead(BaseModel):
    id: UUID
    company_id: UUID
    plan_id: UUID
    start_date: datetime
    end_date: datetime | None = None
    status: str
    plan: PlanRead | None = None

    model_config = {"from_attributes": True}
