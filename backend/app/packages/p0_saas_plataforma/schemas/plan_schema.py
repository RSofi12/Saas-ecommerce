from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field


class PlanBase(BaseModel):
    name: str = Field(..., max_length=50)
    code: str = Field(..., max_length=30)
    description: str | None = None
    max_branches: int = Field(..., ge=1)
    has_ai_access: bool = False
    price_monthly: Decimal = Field(..., ge=0)
    is_active: bool = True


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    name: str | None = Field(None, max_length=50)
    description: str | None = None
    max_branches: int | None = Field(None, ge=1)
    has_ai_access: bool | None = None
    price_monthly: Decimal | None = Field(None, ge=0)
    is_active: bool | None = None


class PlanStatusUpdate(BaseModel):
    is_active: bool


class PlanRead(PlanBase):
    id: UUID

    model_config = {"from_attributes": True}
