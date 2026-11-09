# logica del CU18: Servicio de Negocio para Cotización y Procesamiento de Devoluciones
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Tuple
from uuid import UUID
import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory import Inventory
from app.packages.p5_gestion_ventas_pos.models.garment_return import GarmentReturn
from app.packages.p5_gestion_ventas_pos.models.sale import Sale
from app.packages.p5_gestion_ventas_pos.models.sale_item import SaleItem
from app.packages.p5_gestion_ventas_pos.schemas.exchange_schema import GarmentConditionEnum
from app.packages.p5_gestion_ventas_pos.schemas.return_schema import (
    GarmentReturnCreate,
    RefundMethodEnum,
    ReturnQuoteRequest,
    ReturnQuoteResponse,
)


def _get_tenant_return_policy(company: Company) -> Tuple[Decimal, int, str]:
    """
    Determina la tasa de retención operativa R (20%-50%) y el plazo máximo en días
    según la política comercial formal de cada tenant (P-Ten-03).
    - Boutique Elegance: 30% retención, 7 días máximo.
    - Moda Urbana / Estándar: 20% retención, 15 días máximo.
    """
    comp_name = (company.name or "").lower()
    comp_sub = (company.subdomain or "").lower()

    if "elegance" in comp_name or "elegance" in comp_sub:
        retention = Decimal("30.00")
        max_days = 7
        policy_label = "Boutique Elegance (Retención 30%, Plazo 7 días)"
    elif "urbana" in comp_name or "urbana" in comp_sub:
        retention = Decimal("20.00")
        max_days = 15
        policy_label = "Moda Urbana (Retención 20%, Plazo 15 días)"
    else:
        # Default seguro de plataforma: 20% de retención y 15 días
        retention = Decimal("20.00")
        max_days = 15
        policy_label = "Plataforma Estándar (Retención 20%, Plazo 15 días)"

    # Regla Inviolable: R debe mantenerse estrictamente entre 20% y 50%
    if retention < Decimal("20.00"):
        retention = Decimal("20.00")
    elif retention > Decimal("50.00"):
        retention = Decimal("50.00")

    return retention, max_days, policy_label


def generate_credit_note_code() -> str:
    """
    Genera un código unívoco y formal de Nota de Crédito Digital: NC-YYYYMMDD-XXXX
    """
    now = datetime.now(timezone.utc)
    date_part = now.strftime("%Y%m%d")
    random_part = uuid.uuid4().hex[:4].upper()
    return f"NC-{date_part}-{random_part}"


def quote_garment_return(
    db: Session,
    tenant_id: UUID,
    branch_id: UUID,
    req: ReturnQuoteRequest,
) -> ReturnQuoteResponse:
    """
    Cotiza financieramente la devolución de una prenda aplicando la retención
    operativa (20% al 50%) según la política comercial del tenant.
    """
    company = db.query(Company).filter(Company.id == tenant_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa tenant no encontrada.",
        )

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

    # 2. Validar que la prenda esté en la venta original
    sale_item = (
        db.query(SaleItem)
        .filter(
            SaleItem.sale_id == resolved_sale_id,
            SaleItem.variant_id == req.variant_id,
        )
        .first()
    )
    if not sale_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La prenda especificada no pertenece a la venta indicada.",
        )

    # 3. Validar plazo de devolución
    retention_pct, max_days, policy_label = _get_tenant_return_policy(company)
    now = datetime.now(timezone.utc)
    sale_date = sale.created_at
    if sale_date.tzinfo is None:
        sale_date = sale_date.replace(tzinfo=timezone.utc)

    days_elapsed = (now - sale_date).days
    if days_elapsed > max_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El plazo legal para devoluciones ha expirado ({days_elapsed} días transcurridos, máximo permitido: {max_days} días).",
        )

    # 4. Cálculo financiero: Retención y Reembolso Neto
    original_price = Decimal(str(sale_item.unit_price))
    retention_factor = retention_pct / Decimal("100.00")
    retention_amount = (original_price * retention_factor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    refund_amount = original_price - retention_amount

    return ReturnQuoteResponse(
        sale_id=sale.id,
        branch_id=branch_id,
        variant_id=sale_item.variant_id,
        product_name=sale_item.product_name,
        variant_sku=sale_item.variant_sku,
        original_item_amount=original_price,
        retention_percentage=retention_pct,
        retention_amount=retention_amount,
        refund_amount=refund_amount,
        max_return_days=max_days,
        days_elapsed=days_elapsed,
        policy_tenant_name=policy_label,
    )


def process_garment_return(
    db: Session,
    tenant_id: UUID,
    branch_id: UUID,
    cashier_id: UUID,
    req: GarmentReturnCreate,
) -> GarmentReturn:
    """
    Procesa transaccionalmente la devolución de la prenda:
    - Valida etiqueta intacta (good_with_tags)
    - Aplica retención del 20% al 50%
    - Reingresa la prenda (+1) al inventario físico con bloqueo FOR UPDATE
    - Genera código de Nota de Crédito si aplica
    - Persiste en garment_returns
    """
    company = db.query(Company).filter(Company.id == tenant_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa tenant no encontrada.",
        )

    # 1. Validar condición física con etiqueta intacta
    if req.condition != GarmentConditionEnum.good_with_tags:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Política de Devolución: La prenda debe contar con su etiqueta textil intacta y no presentar señales de uso o desgaste.",
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
            SaleItem.variant_id == req.variant_id,
        )
        .first()
    )
    if not sale_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La prenda especificada no pertenece a la venta indicada.",
        )

    # 4. Validar plazo de devolución
    retention_pct, max_days, _ = _get_tenant_return_policy(company)
    now = datetime.now(timezone.utc)
    sale_date = sale.created_at
    if sale_date.tzinfo is None:
        sale_date = sale_date.replace(tzinfo=timezone.utc)

    days_elapsed = (now - sale_date).days
    if days_elapsed > max_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El plazo legal para devoluciones ha expirado ({days_elapsed} días transcurridos, máximo permitido: {max_days} días).",
        )

    # 5. Cálculo financiero de retención y reembolso neto
    original_price = Decimal(str(sale_item.unit_price))
    retention_factor = retention_pct / Decimal("100.00")
    retention_amount = (original_price * retention_factor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    refund_amount = original_price - retention_amount

    # 6. Generación de código de Nota de Crédito si el método es NOTA_CREDITO
    credit_note_code = None
    if req.refund_method == RefundMethodEnum.nota_credito:
        credit_note_code = generate_credit_note_code()

    # 7. Reingreso de stock físico al inventario de la sucursal (bloqueo FOR UPDATE)
    inv = (
        db.query(Inventory)
        .filter(
            Inventory.variant_id == req.variant_id,
            Inventory.branch_id == branch_id,
        )
        .with_for_update()
        .first()
    )
    if not inv:
        inv = Inventory(
            variant_id=req.variant_id,
            branch_id=branch_id,
            tenant_id=tenant_id,
            quantity=0,
            reserved_quantity=0,
            minimum_stock=0,
        )
        db.add(inv)

    inv.quantity += 1

    # 8. Registro de auditoría en garment_returns
    garment_return = GarmentReturn(
        tenant_id=tenant_id,
        branch_id=branch_id,
        cashier_id=cashier_id,
        sale_id=sale.id,
        variant_id=req.variant_id,
        quantity=1,
        original_item_amount=original_price,
        retention_percentage=retention_pct,
        retention_amount=retention_amount,
        refund_amount=refund_amount,
        refund_method=req.refund_method.value,
        credit_note_code=credit_note_code,
        reason=req.reason,
    )
    db.add(garment_return)
    db.commit()
    db.refresh(garment_return)

    return garment_return


def list_garment_returns(
    db: Session,
    tenant_id: UUID,
    branch_id: Optional[UUID] = None,
) -> List[GarmentReturn]:
    """
    Lista el historial de devoluciones procesadas para el tenant/sucursal.
    """
    query = db.query(GarmentReturn).filter(GarmentReturn.tenant_id == tenant_id)
    if branch_id:
        query = query.filter(GarmentReturn.branch_id == branch_id)
    return query.order_by(GarmentReturn.created_at.desc()).all()
