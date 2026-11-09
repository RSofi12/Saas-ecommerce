import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field


class SaleConflictResolutionTypeEnum(str, Enum):
    NEGATIVE_STOCK = "negative_stock"
    SUBSTITUTE = "substitute"
    CREDIT_NOTE = "credit_note"


class SaleConflictItemRead(BaseModel):
    item_id: uuid.UUID
    variant_id: uuid.UUID
    product_name: str
    size: str
    color: str
    quantity: int
    unit_price: Decimal
    central_stock_available: int


class SaleConflictRead(BaseModel):
    sale_id: uuid.UUID
    client_sale_id: uuid.UUID | None = None
    created_at: datetime
    cashier_name: str
    branch_id: uuid.UUID
    branch_name: str
    total_amount: Decimal
    conflict_reason: str
    items: list[SaleConflictItemRead] = Field(default_factory=list)


class SaleConflictResolveRequest(BaseModel):
    resolution_type: SaleConflictResolutionTypeEnum
    new_variant_id: uuid.UUID | None = None
    resolution_note: str = Field(..., min_length=5, description="Justificación obligatoria de auditoría para resolver el conflicto")
    refund_method: str | None = None


class SaleConflictResolveResponse(BaseModel):
    sale_id: uuid.UUID
    status: str
    resolution_type: SaleConflictResolutionTypeEnum
    resolution_note: str
    resulting_stock: int | None = None
    credit_note_code: str | None = None
    resolved_at: datetime
    message: str
