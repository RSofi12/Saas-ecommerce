# logica del CU17: Schemas para Cambio de Prenda por Talla/Modelo con Cobro de Diferencia y Validación de Estado
import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class GarmentConditionEnum(str, Enum):
    good_with_tags = "good_with_tags"
    damaged_or_no_tags = "damaged_or_no_tags"


class ExchangeQuoteRequest(BaseModel):
    sale_id: uuid.UUID = Field(..., description="ID de la venta original")
    original_variant_id: uuid.UUID = Field(..., description="ID de la variante que se desea cambiar")
    new_variant_id: uuid.UUID = Field(..., description="ID de la nueva variante seleccionada")


class ExchangeQuoteResponse(BaseModel):
    sale_id: uuid.UUID
    branch_id: uuid.UUID
    original_variant_id: uuid.UUID
    original_product_name: str
    original_variant_sku: str
    original_unit_price: Decimal
    new_variant_id: uuid.UUID
    new_product_name: str
    new_variant_sku: str
    new_unit_price: Decimal
    price_difference: Decimal  # Delta = new_unit_price - original_unit_price
    requires_payment: bool     # True si Delta > 0
    available_stock_new: int


class GarmentExchangeCreate(BaseModel):
    sale_id: uuid.UUID = Field(..., description="ID de la venta original")
    original_variant_id: uuid.UUID = Field(..., description="ID de la variante a devolver")
    new_variant_id: uuid.UUID = Field(..., description="ID de la nueva variante a entregar")
    condition: GarmentConditionEnum = Field(
        default=GarmentConditionEnum.good_with_tags,
        description="Condición física de la prenda con etiqueta textil",
    )
    difference_paid: bool = Field(
        default=False,
        description="Confirmación obligatoria si Delta > 0 (Política de Negocio 1)",
    )
    payment_method: Optional[str] = Field(
        default=None,
        description="Método de pago de la diferencia (efectivo, tarjeta, etc.)",
    )
    notes: Optional[str] = Field(
        default=None,
        description="Notas u observaciones del cajero sobre el cambio",
    )


class GarmentExchangeResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    branch_id: uuid.UUID
    cashier_id: uuid.UUID
    sale_id: uuid.UUID
    original_variant_id: uuid.UUID
    new_variant_id: uuid.UUID
    price_difference: Decimal
    difference_paid: bool
    payment_method: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
