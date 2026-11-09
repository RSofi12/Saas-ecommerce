from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.packages.p4_gestion_compras_reservas.schemas.order_schema import PaymentMethodEnum, PaymentStatusEnum


class SaleStatusEnum(str, Enum):
    completed = "completed"
    cancelled = "cancelled"


class SaleTypeEnum(str, Enum):
    in_person = "venta presencial"
    online = "venta virtual"


class SaleItemCreate(BaseModel):
    variant_id: UUID
    quantity: int = Field(gt=0)


class SaleCreate(BaseModel):
    branch_id: UUID | None = None
    reservation_id: UUID | None = None
    payment_method: PaymentMethodEnum = PaymentMethodEnum.cash
    cash_reference: str | None = None
    client_sale_id: UUID | None = None
    is_offline: bool = False
    items: list[SaleItemCreate] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_items_or_reservation(self):
        if self.is_offline and self.payment_method != PaymentMethodEnum.cash:
            raise ValueError("Por política de seguridad contable (Política 5), las ventas en modo offline deben ser exclusivamente en efectivo (cash).")
        if self.reservation_id:
            raise ValueError("CU18 no permite ventas asociadas a reservas")
        if self.payment_method != PaymentMethodEnum.cash:
            raise ValueError("Las ventas directas solo aceptan efectivo")
        if not self.items:
            raise ValueError("La venta no tiene items")
        return self


class SaleItemRead(BaseModel):
    id: UUID
    sale_id: UUID
    variant_id: UUID
    quantity: int
    unit_price: Decimal
    original_unit_price: Decimal | None = None
    discount_amount: Decimal = Decimal("0.00")
    line_total: Decimal
    product_id: UUID
    product_name: str
    variant_sku: str
    size_id: UUID | None = None
    color_id: UUID | None = None
    size_name: str | None = None
    color_name: str | None = None
    image_url: str | None = None
    image_public_id: str | None = None

    model_config = {"from_attributes": True}


class SaleRead(BaseModel):
    id: UUID
    branch_id: UUID
    branch_name: str
    type: SaleTypeEnum
    user_id: UUID
    reservation_id: UUID | None = None
    client_sale_id: UUID | None = None
    is_offline: bool = False
    synced_at: datetime | None = None
    status: SaleStatusEnum
    payment_method: PaymentMethodEnum
    payment_status: PaymentStatusEnum
    cash_reference: str | None = None
    subtotal: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    currency: str
    created_at: datetime
    updated_at: datetime | None = None
    items: list[SaleItemRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


# =========================================================================
# LÓGICA DEL CU14: Esquemas de Verificación de Estado Outbox
# =========================================================================
class OfflineStatusCheckRequest(BaseModel):
    client_sale_ids: list[UUID] = Field(default_factory=list)


class OfflineStatusCheckResponse(BaseModel):
    synced_ids: list[UUID] = Field(default_factory=list)
    missing_ids: list[UUID] = Field(default_factory=list)


# =========================================================================
# LÓGICA DEL CU15: Sincronización de Lotes con Idempotencia (sync_operations)
# =========================================================================
class BatchSyncItemSchema(BaseModel):
    variant_id: UUID
    quantity: int = Field(gt=0)
    unit_price: Decimal | None = None


class BatchSyncOperationSchema(BaseModel):
    client_sale_id: UUID
    cashier_id: UUID | None = None
    created_at: datetime | None = None
    total_amount: Decimal = Field(gt=0)
    cash_received: Decimal | None = None
    change_amount: Decimal | None = None
    payment_method: str = "cash"
    is_offline: bool = True
    items: list[BatchSyncItemSchema] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_payment_method(self):
        norm = (self.payment_method or "").strip().lower()
        if norm not in ("cash", "efectivo"):
            raise ValueError(
                "Por política inviolable (Política 5), las ventas offline deben pagarse exclusivamente en efectivo (cash)."
            )
        return self


class BatchSyncRequest(BaseModel):
    branch_id: UUID
    operations: list[BatchSyncOperationSchema] = Field(default_factory=list)


class BatchSyncSummary(BaseModel):
    total_received: int
    applied: int
    duplicates_ignored: int
    conflicts: int


class BatchSyncItemResult(BaseModel):
    client_sale_id: UUID
    status: str
    sale_id: UUID | None = None
    message: str | None = None


class BatchSyncResponse(BaseModel):
    status: str
    summary: BatchSyncSummary
    processed_uuids: list[UUID] = Field(default_factory=list)
    conflict_uuids: list[UUID] = Field(default_factory=list)
    details: list[BatchSyncItemResult] = Field(default_factory=list)

