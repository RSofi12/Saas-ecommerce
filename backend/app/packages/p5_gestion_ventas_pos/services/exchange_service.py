# logica del CU17: Servicio de Negocio para Cotización y Procesamiento Transaccional de Cambio de Prenda
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory import Inventory
from app.packages.p5_gestion_ventas_pos.models.garment_exchange import GarmentExchange
from app.packages.p5_gestion_ventas_pos.models.sale import Sale
from app.packages.p5_gestion_ventas_pos.models.sale_item import SaleItem
from app.packages.p5_gestion_ventas_pos.schemas.exchange_schema import (
    ExchangeQuoteRequest,
    ExchangeQuoteResponse,
    GarmentConditionEnum,
    GarmentExchangeCreate,
)


MAX_EXCHANGE_DAYS_DEFAULT = 30


def quote_garment_exchange(
    db: Session,
    tenant_id: UUID,
    branch_id: UUID,
    req: ExchangeQuoteRequest,
) -> ExchangeQuoteResponse:
    """
    Cotiza el cambio de una prenda calculando la diferencia de precio (Delta)
    y validando existencias de la nueva variante en la sucursal.
    """
    # 1. Validar que la venta exista y pertenezca al tenant (admite Sale.id o client_sale_id)
    sale = (
        db.query(Sale)
        .filter(
            or_(Sale.id == req.sale_id, Sale.client_sale_id == req.sale_id),
            Sale.tenant_id == tenant_id,
        )
        .first()
    )
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La venta original no fue encontrada para este tenant.",
        )
    resolved_sale_id = sale.id

    # 2. Validar que la prenda original esté en la venta
    sale_item = (
        db.query(SaleItem)
        .filter(
            SaleItem.sale_id == resolved_sale_id,
            SaleItem.variant_id == req.original_variant_id,
        )
        .first()
    )
    if not sale_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La variante original no pertenece a la venta especificada.",
        )

    # 3. Validar plazo de cambio
    now = datetime.now(timezone.utc)
    sale_date = sale.created_at
    if sale_date.tzinfo is None:
        sale_date = sale_date.replace(tzinfo=timezone.utc)

    days_elapsed = (now - sale_date).days
    if days_elapsed > MAX_EXCHANGE_DAYS_DEFAULT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El plazo para cambios ha expirado ({days_elapsed} días transcurridos, máximo permitido: {MAX_EXCHANGE_DAYS_DEFAULT} días).",
        )

    # 4. Validar la nueva variante
    new_variant = (
        db.query(ProductVariant)
        .filter(ProductVariant.id == req.new_variant_id)
        .first()
    )
    if not new_variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La nueva variante seleccionada no existe en el catálogo.",
        )

    # 5. Obtener stock disponible de la nueva variante en la sucursal
    inv_new = (
        db.query(Inventory)
        .filter(
            Inventory.variant_id == req.new_variant_id,
            Inventory.branch_id == branch_id,
        )
        .first()
    )
    available_stock = (inv_new.quantity - inv_new.reserved_quantity) if inv_new else 0

    # 6. Calcular Delta: Precio Nueva Variante - Precio Pagado Original
    new_price = Decimal(str(new_variant.price))
    original_price = Decimal(str(sale_item.unit_price))
    delta = new_price - original_price
    requires_payment = delta > Decimal("0.00")

    return ExchangeQuoteResponse(
        sale_id=sale.id,
        branch_id=branch_id,
        original_variant_id=sale_item.variant_id,
        original_product_name=sale_item.product_name,
        original_variant_sku=sale_item.variant_sku,
        original_unit_price=original_price,
        new_variant_id=new_variant.id,
        new_product_name=new_variant.product.name if new_variant.product else "Prenda",
        new_variant_sku=new_variant.sku,
        new_unit_price=new_price,
        price_difference=delta,
        requires_payment=requires_payment,
        available_stock_new=available_stock,
    )


def process_garment_exchange(
    db: Session,
    tenant_id: UUID,
    branch_id: UUID,
    cashier_id: UUID,
    req: GarmentExchangeCreate,
) -> GarmentExchange:
    """
    Procesa transaccionalmente el cambio de prenda aplicando de forma inviolable
    la Política 1: si Delta > 0 y difference_paid es False, aborta la operación.
    Reingresa la prenda original (+1) y egresa la nueva prenda (-1) de Inventory.
    """
    # 1. Validar condición física de la prenda
    if req.condition != GarmentConditionEnum.good_with_tags:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Política de Cambio: La prenda debe contar con su etiqueta textil intacta y no presentar señales de uso o desgaste.",
        )

    # 2. Validar venta y pertenencia (admite Sale.id o client_sale_id)
    sale = (
        db.query(Sale)
        .filter(
            or_(Sale.id == req.sale_id, Sale.client_sale_id == req.sale_id),
            Sale.tenant_id == tenant_id,
        )
        .first()
    )
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La venta original no fue encontrada para este tenant.",
        )
    resolved_sale_id = sale.id

    # 3. Validar ítem de la venta original
    sale_item = (
        db.query(SaleItem)
        .filter(
            SaleItem.sale_id == resolved_sale_id,
            SaleItem.variant_id == req.original_variant_id,
        )
        .first()
    )
    if not sale_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La variante original no pertenece a la venta especificada.",
        )

    # 4. Validar plazo de cambio
    now = datetime.now(timezone.utc)
    sale_date = sale.created_at
    if sale_date.tzinfo is None:
        sale_date = sale_date.replace(tzinfo=timezone.utc)

    if (now - sale_date).days > MAX_EXCHANGE_DAYS_DEFAULT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El plazo para cambios ha expirado (máximo permitido: {MAX_EXCHANGE_DAYS_DEFAULT} días).",
        )

    # 5. Obtener nueva variante y calcular diferencia
    new_variant = (
        db.query(ProductVariant)
        .filter(ProductVariant.id == req.new_variant_id)
        .first()
    )
    if not new_variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La nueva variante seleccionada no existe en el catálogo.",
        )

    new_price = Decimal(str(new_variant.price))
    original_price = Decimal(str(sale_item.unit_price))
    delta = new_price - original_price

    # 6. POLÍTICA DE NEGOCIO 1 (INVIOLABLE):
    # Si la nueva prenda tiene mayor precio, el cambio SOLO se consolida si abona la diferencia
    if delta > Decimal("0.00") and not req.difference_paid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Política de Cambio: La nueva prenda tiene mayor precio (Δ > 0). El cambio solo puede consolidarse si el cliente abona la diferencia de precio.",
        )

    # 7. Validar y descontar stock disponible de la nueva variante (bloqueo FOR UPDATE)
    inv_new = (
        db.query(Inventory)
        .filter(
            Inventory.variant_id == req.new_variant_id,
            Inventory.branch_id == branch_id,
        )
        .with_for_update()
        .first()
    )
    if not inv_new or (inv_new.quantity - inv_new.reserved_quantity) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay existencias disponibles de la nueva variante en esta sucursal.",
        )

    # 8. Reingresar stock de la variante original devuelta (bloqueo FOR UPDATE)
    inv_orig = (
        db.query(Inventory)
        .filter(
            Inventory.variant_id == req.original_variant_id,
            Inventory.branch_id == branch_id,
        )
        .with_for_update()
        .first()
    )
    if not inv_orig:
        # Si no existía el registro de inventario en esta sucursal, se inicializa
        inv_orig = Inventory(
            variant_id=req.original_variant_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
            quantity=0,
            reserved_quantity=0,
            minimum_stock=0,
        )
        db.add(inv_orig)

    # Actualización atómica de existencias físicas
    inv_new.quantity -= 1
    inv_orig.quantity += 1

    # 9. Crear el registro de auditoría de cambio
    exchange = GarmentExchange(
        tenant_id=tenant_id,
        branch_id=branch_id,
        cashier_id=cashier_id,
        sale_id=sale.id,
        original_variant_id=req.original_variant_id,
        new_variant_id=req.new_variant_id,
        price_difference=delta,
        difference_paid=True if delta <= Decimal("0.00") else req.difference_paid,
        payment_method=req.payment_method if delta > Decimal("0.00") else "NO_REQUIRED",
        status="COMPLETED",
        notes=req.notes,
    )
    db.add(exchange)
    db.commit()
    db.refresh(exchange)

    return exchange


def list_garment_exchanges(
    db: Session,
    tenant_id: UUID,
    branch_id: Optional[UUID] = None,
) -> List[GarmentExchange]:
    """
    Lista el historial de cambios de prenda por tenant y sucursal.
    """
    query = db.query(GarmentExchange).filter(GarmentExchange.tenant_id == tenant_id)
    if branch_id:
        query = query.filter(GarmentExchange.branch_id == branch_id)
    return query.order_by(GarmentExchange.created_at.desc()).all()
