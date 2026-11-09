# logica del CU18: Schemas para Devolución de Prendas con Retención Operativa y Nota de Crédito
import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.packages.p5_gestion_ventas_pos.schemas.exchange_schema import GarmentConditionEnum


class RefundMethodEnum(str, Enum):
    nota_credito = "NOTA_CREDITO"
    efectivo = "EFECTIVO"


class ReturnQuoteRequest(BaseModel):
    sale_id: uuid.UUID = Field(..., description="ID de la venta original")
    variant_id: uuid.UUID = Field(..., description="ID de la variante que se desea devolver")


class ReturnQuoteResponse(BaseModel):
    sale_id: uuid.UUID
    branch_id: uuid.UUID
    variant_id: uuid.UUID
    product_name: str
    variant_sku: str
    original_item_amount: Decimal
    retention_percentage: Decimal    # Tasa R: 20.00% a 50.00%
    retention_amount: Decimal        # Monto retenido por costos operativos
    refund_amount: Decimal           # Monto neto a reembolsar (50% a 80%)
    max_return_days: int
    days_elapsed: int
    policy_tenant_name: str


class GarmentReturnCreate(BaseModel):
    sale_id: uuid.UUID = Field(..., description="ID de la venta original")
    variant_id: uuid.UUID = Field(..., description="ID de la variante a devolver")
    condition: GarmentConditionEnum = Field(
        default=GarmentConditionEnum.good_with_tags,
        description="Condición física de la prenda con etiqueta textil intacta",
    )
    refund_method: RefundMethodEnum = Field(
        default=RefundMethodEnum.nota_credito,
        description="Modalidad de reembolso (NOTA_CREDITO recomendada o EFECTIVO)",
    )
    reason: Optional[str] = Field(
        default=None,
        description="Motivo de la devolución manifestado por el cliente",
    )


class GarmentReturnResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    branch_id: uuid.UUID
    cashier_id: uuid.UUID
    sale_id: uuid.UUID
    variant_id: uuid.UUID
    quantity: int
    original_item_amount: Decimal
    retention_percentage: Decimal
    retention_amount: Decimal
    refund_amount: Decimal
    refund_method: str
    credit_note_code: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
