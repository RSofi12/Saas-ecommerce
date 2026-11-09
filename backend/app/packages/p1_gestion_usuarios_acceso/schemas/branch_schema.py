from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class BranchCreate(BaseModel):
    name: str
    city: str
    address: str = ""
    phone: str = ""
    opening_hours: str = "09:00 - 20:00"
    latitude: float = -17.7833
    longitude: float = -63.1821
    is_default: bool = False
    is_active: bool = True


class BranchRead(BaseModel):
    id: UUID
    tenant_id: UUID | None = None
    name: str
    city: str
    address: str = ""
    phone: str = ""
    opening_hours: str = "09:00 - 20:00"
    latitude: float = -17.7833
    longitude: float = -63.1821
    is_default: bool
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {
        "from_attributes": True,
    }


class BranchUpdate(BaseModel):
    name: str
    city: str
    address: str = ""
    phone: str = ""
    opening_hours: str = "09:00 - 20:00"
    latitude: float = -17.7833
    longitude: float = -63.1821
    is_default: bool = False
    is_active: bool = True


class BranchActiveUpdate(BaseModel):
    is_active: bool


class BranchQuotaOut(BaseModel):
    plan_name: str
    plan_code: str
    max_branches: int
    current_active_branches: int
    remaining_slots: int
    can_create_branch: bool
    has_ai_access: bool = False
    subscription_status: str = "ACTIVA"
    end_date: datetime | None = None
