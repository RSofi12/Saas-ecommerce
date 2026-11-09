import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p2_gestion_productos_catalogo.models.color import Color
from app.packages.p2_gestion_productos_catalogo.models.product import Product
from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p2_gestion_productos_catalogo.models.size import Size
from app.packages.p2_gestion_productos_catalogo.models.color import Color
from app.packages.p2_gestion_productos_catalogo.models.size import Size
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory import Inventory
from app.packages.p5_gestion_ventas_pos.models.garment_return import GarmentReturn
from app.packages.p5_gestion_ventas_pos.models.sale import Sale
from app.packages.p5_gestion_ventas_pos.models.sale_item import SaleItem
from app.packages.p5_gestion_ventas_pos.models.sync_operation import SyncOperation
from app.packages.p5_gestion_ventas_pos.schemas.sale_conflict_schema import (
    SaleConflictItemRead,
    SaleConflictRead,
    SaleConflictResolutionTypeEnum,
    SaleConflictResolveRequest,
    SaleConflictResolveResponse,
)
from app.packages.p5_gestion_ventas_pos.schemas.sales_schema import SaleStatusEnum
from app.packages.p5_gestion_ventas_pos.services.return_service import generate_credit_note_code


def list_branch_sale_conflicts(
    db: Session,
    branch_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> list[SaleConflictRead]:
    """
    Lista las ventas offline sincronizadas que entraron en estado de conflicto
    por quiebre de stock central (sobreventa durante desconexión) para una sucursal dada.
    """
    # 1. Obtener IDs de ventas marcadas en conflicto directo o via sync_operations
    conflict_sales = (
        db.query(Sale)
        .filter(
            Sale.tenant_id == tenant_id,
            Sale.branch_id == branch_id,
            or_(
                Sale.cash_reference.like("CONFLICT:%"),
                Sale.cash_reference == "EN_CONFLICTO",
            ),
        )
        .order_by(Sale.created_at.desc())
        .all()
    )

    # 2. Mapear a esquema de lectura enriquecido
    results: list[SaleConflictRead] = []

    for s in conflict_sales:
        cashier = db.query(User).filter(User.id == s.user_id).first()
        cashier_name = cashier.name if (cashier and cashier.name) else "Cajero POS"
        
        branch = db.query(Branch).filter(Branch.id == s.branch_id).first()
        branch_name = branch.name if branch else "Sucursal"

        items_read: list[SaleConflictItemRead] = []
        for it in s.items:
            variant = db.query(ProductVariant).filter(ProductVariant.id == it.variant_id).first()
            prod_name = it.product_name or "Prenda"
            size = "Estándar"
            color = "Estándar"
            if variant:
                if variant.size_id:
                    sz = db.query(Size).filter(Size.id == variant.size_id).first()
                    if sz and sz.name:
                        size = sz.name
                if variant.color_id:
                    cl = db.query(Color).filter(Color.id == variant.color_id).first()
                    if cl and cl.name:
                        color = cl.name
                if not it.product_name:
                    prod = db.query(Product).filter(Product.id == variant.product_id).first()
                    if prod and prod.name:
                        prod_name = prod.name

            inv = (
                db.query(Inventory)
                .filter(Inventory.variant_id == it.variant_id, Inventory.branch_id == branch_id)
                .first()
            )
            central_avail = inv.quantity if inv else 0

            items_read.append(
                SaleConflictItemRead(
                    item_id=it.id,
                    variant_id=it.variant_id,
                    product_name=prod_name,
                    size=size,
                    color=color,
                    quantity=it.quantity,
                    unit_price=Decimal(str(it.unit_price)),
                    central_stock_available=central_avail,
                )
            )

        # Parsear razón legible
        raw_reason = s.cash_reference or "Quiebre de stock central detectado al sincronizar"
        if raw_reason.startswith("CONFLICT:"):
            conflict_reason = raw_reason.replace("CONFLICT:", "").strip()
        else:
            conflict_reason = raw_reason

        results.append(
            SaleConflictRead(
                sale_id=s.id,
                client_sale_id=s.client_sale_id,
                created_at=s.created_at,
                cashier_name=cashier_name,
                branch_id=s.branch_id,
                branch_name=branch_name,
                total_amount=Decimal(str(s.total_amount)),
                conflict_reason=conflict_reason,
                items=items_read,
            )
        )

    return results


def resolve_sale_conflict(
    db: Session,
    sale_id: uuid.UUID,
    payload: SaleConflictResolveRequest,
    manager_user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    branch_id: uuid.UUID,
) -> SaleConflictResolveResponse:
    """
    Ejecuta una de las 3 vías de resolución reglamentarias para ventas en conflicto (CU16):
    1. NEGATIVE_STOCK: Autoriza con stock negativo y solicita reposición. Venta pasa a COMPLETED.
    2. SUBSTITUTE: Sustituye la prenda por otra variante con stock disponible. Venta pasa a COMPLETED.
    3. CREDIT_NOTE: Cancela la venta y emite Nota de Crédito digital al cliente. Venta pasa a CANCELLED.
    """
    # 1. Auditoría obligatoria de justificación (mínimo 5 caracteres)
    note_clean = (payload.resolution_note or "").strip()
    if len(note_clean) < 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La justificación de auditoría es obligatoria y debe contener al menos 5 caracteres.",
        )

    # 2. Localizar la venta garantizando aislamiento multitenant estricto
    sale = (
        db.query(Sale)
        .filter(
            Sale.id == sale_id,
            Sale.tenant_id == tenant_id,
        )
        .first()
    )
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La venta indicada no existe o no pertenece a su empresa (tenant).",
        )

    # 3. Validar que la venta efectivamente se encuentre en conflicto
    ref = sale.cash_reference or ""
    if not (ref.startswith("CONFLICT:") or ref == "EN_CONFLICTO"):
        if ref.startswith("RESOLVED:"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta venta ya fue resuelta previamente y no presenta conflicto pendiente.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La venta no está marcada en estado de conflicto.",
        )

    now = datetime.now(timezone.utc)
    resulting_stock: int | None = None
    credit_note_code: str | None = None
    msg: str = ""

    # =========================================================================
    # VÍA 1: Autorizar con Stock Negativo (La prenda física ya se entregó)
    # =========================================================================
    if payload.resolution_type == SaleConflictResolutionTypeEnum.NEGATIVE_STOCK:
        for it in sale.items:
            inv = (
                db.query(Inventory)
                .filter(
                    Inventory.variant_id == it.variant_id,
                    Inventory.branch_id == sale.branch_id,
                )
                .with_for_update()
                .first()
            )
            if not inv:
                # Si no existía registro previo en la sucursal, se inicializa con el saldo negativo
                inv = Inventory(
                    tenant_id=tenant_id,
                    branch_id=sale.branch_id,
                    variant_id=it.variant_id,
                    quantity=-it.quantity,
                )
                db.add(inv)
                resulting_stock = -it.quantity
            else:
                inv.quantity -= it.quantity
                resulting_stock = inv.quantity

        sale.status = SaleStatusEnum.completed
        sale.cash_reference = f"RESOLVED:NEGATIVE_STOCK | {note_clean}"
        msg = f"Venta autorizada con stock resultante de {resulting_stock}. Se registró solicitud de reposición."

    # =========================================================================
    # VÍA 2: Sustitución por Variante Alternativa Disponible
    # =========================================================================
    elif payload.resolution_type == SaleConflictResolutionTypeEnum.SUBSTITUTE:
        if not payload.new_variant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe indicar la nueva variante para realizar la sustitución.",
            )

        if not sale.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La venta no contiene prendas para sustituir.",
            )

        target_item = sale.items[0]
        qty_needed = target_item.quantity

        # Bloquear inventario de la nueva variante en la sucursal
        new_inv = (
            db.query(Inventory)
            .filter(
                Inventory.variant_id == payload.new_variant_id,
                Inventory.branch_id == sale.branch_id,
            )
            .with_for_update()
            .first()
        )
        if not new_inv or new_inv.quantity < qty_needed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay existencias suficientes de la nueva variante en la sucursal para realizar la sustitución.",
            )

        # Descontar stock de la nueva variante y reasignar item
        new_inv.quantity -= qty_needed
        resulting_stock = new_inv.quantity
        target_item.variant_id = payload.new_variant_id

        sale.status = SaleStatusEnum.completed
        sale.cash_reference = f"RESOLVED:SUBSTITUTE | new_var:{payload.new_variant_id} | {note_clean}"
        msg = f"Prenda sustituida exitosamente por variante {payload.new_variant_id}. Stock remanente: {resulting_stock}."

    # =========================================================================
    # VÍA 3: Anulación Contable y Emisión de Nota de Crédito Digital
    # =========================================================================
    elif payload.resolution_type == SaleConflictResolutionTypeEnum.CREDIT_NOTE:
        credit_note_code = generate_credit_note_code()
        
        # Registrar documento formal de devolución con Nota de Crédito por el 100% (cero retención al cliente)
        variant_id_ref = sale.items[0].variant_id if sale.items else None
        item_amount = Decimal(str(sale.total_amount))
        garment_return = GarmentReturn(
            tenant_id=tenant_id,
            branch_id=sale.branch_id,
            cashier_id=manager_user_id,
            sale_id=sale.id,
            variant_id=variant_id_ref,
            quantity=sale.items[0].quantity if sale.items else 1,
            original_item_amount=item_amount,
            retention_percentage=Decimal("0.00"),
            retention_amount=Decimal("0.00"),
            refund_amount=item_amount,
            refund_method="NOTA_CREDITO",
            credit_note_code=credit_note_code,
            reason=f"Anulación por quiebre de stock central offline: {note_clean}",
        )
        db.add(garment_return)

        sale.status = SaleStatusEnum.cancelled
        sale.cash_reference = f"RESOLVED:CREDIT_NOTE | {credit_note_code} | {note_clean}"
        msg = f"Venta anulada formalmente. Se emitió la Nota de Crédito Digital {credit_note_code} por Bs {sale.total_amount}."

    # 4. Actualizar tabla sync_operations si corresponde
    if sale.client_sale_id:
        sync_op = (
            db.query(SyncOperation)
            .filter(
                SyncOperation.client_operation_id == str(sale.client_sale_id),
                SyncOperation.tenant_id == tenant_id,
            )
            .first()
        )
        if sync_op:
            sync_op.status = "PROCESADO" if sale.status == SaleStatusEnum.completed else "ANULADO"

    db.commit()

    return SaleConflictResolveResponse(
        sale_id=sale.id,
        status=sale.status.value,
        resolution_type=payload.resolution_type,
        resolution_note=note_clean,
        resulting_stock=resulting_stock,
        credit_note_code=credit_note_code,
        resolved_at=now,
        message=msg,
    )
