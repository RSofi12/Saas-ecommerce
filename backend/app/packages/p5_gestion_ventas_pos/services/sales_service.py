from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import String, or_
from sqlalchemy.orm import Session

from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory import Inventory
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory_movement import InventoryMovement
from app.packages.p4_gestion_compras_reservas.models.order import Order
from app.packages.p2_gestion_productos_catalogo.models.product import Product
from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p4_gestion_compras_reservas.models.reservation import Reservation
from app.packages.p4_gestion_compras_reservas.models.reservation_item import ReservationItem
from app.packages.p5_gestion_ventas_pos.models.sale import Sale
from app.packages.p5_gestion_ventas_pos.models.sale_item import SaleItem
from app.packages.p5_gestion_ventas_pos.models.sync_operation import SyncOperation
from app.packages.p2_gestion_productos_catalogo.models.size import Size
from app.packages.p2_gestion_productos_catalogo.models.color import Color
from app.packages.p4_gestion_compras_reservas.schemas.order_schema import PaymentMethodEnum, PaymentStatusEnum
from app.packages.p5_gestion_ventas_pos.schemas.sales_schema import (
    BatchSyncItemResult,
    BatchSyncRequest,
    BatchSyncResponse,
    BatchSyncSummary,
    SaleCreate,
    SaleItemRead,
    SaleRead,
    SaleStatusEnum,
    SaleTypeEnum,
)
from app.packages.p2_gestion_productos_catalogo.schemas.catalog_enums import ProductStatusEnum
from app.packages.p3_gestion_inventario_disponibilidad.schemas.inventory_schema import InventoryMovementTypeEnum
from app.packages.p4_gestion_compras_reservas.schemas.reservation_schema import ReservationStatusEnum
from app.packages.p4_gestion_compras_reservas.services.reservation_service import transition_reservation
from app.packages.p4_gestion_compras_reservas.services.pricing_service import discounted_price, discount_amount
from app.services.notification_service import notify_low_stock, notify_reservation_event


def _get_inventory_for_update(db: Session, variant_id, branch_id) -> Inventory | None:
    return (
        db.query(Inventory)
        .filter(Inventory.variant_id == variant_id, Inventory.branch_id == branch_id)
        .with_for_update()
        .first()
    )


def _get_sale_for_branch(db: Session, sale_id: UUID, branch_id: UUID) -> Sale | None:
    return db.query(Sale).filter(Sale.id == sale_id, Sale.branch_id == branch_id).first()


def _get_reservation_for_branch(db: Session, reservation_id: UUID, branch_id: UUID) -> Reservation | None:
    return (
        db.query(Reservation)
        .filter(Reservation.id == reservation_id, Reservation.branch_id == branch_id)
        .with_for_update()
        .first()
    )


def _sale_items_query(db: Session, sale_id: UUID):
    return (
        db.query(
            SaleItem.id.label("id"),
            SaleItem.sale_id.label("sale_id"),
            SaleItem.variant_id.label("variant_id"),
            SaleItem.quantity.label("quantity"),
            SaleItem.unit_price.label("unit_price"),
            ProductVariant.price.label("original_unit_price"),
            Product.discount_type.label("discount_type"),
            Product.discount_value.label("discount_value"),
            Product.id.label("product_id"),
            Product.name.label("product_name"),
            ProductVariant.sku.label("variant_sku"),
            ProductVariant.size_id.label("size_id"),
            ProductVariant.color_id.label("color_id"),
            ProductVariant.image_url.label("image_url"),
            ProductVariant.image_public_id.label("image_public_id"),
            Size.name.label("size_name"),
            Color.name.label("color_name"),
        )
        .join(ProductVariant, ProductVariant.id == SaleItem.variant_id)
        .join(Product, Product.id == ProductVariant.product_id)
        .outerjoin(Size, Size.id == ProductVariant.size_id)
        .outerjoin(Color, Color.id == ProductVariant.color_id)
        .filter(SaleItem.sale_id == sale_id)
        .order_by(SaleItem.id.asc())
        .all()
    )


def _serialize_sale(db: Session, sale: Sale) -> SaleRead:
    item_rows = _sale_items_query(db, sale.id)
    items = []
    for row in item_rows:
        data = row._mapping
        line_total = Decimal(str(data["unit_price"])) * int(data["quantity"])
        original_price = Decimal(str(data["original_unit_price"]))
        line_discount = discount_amount(original_price, data["discount_type"], data["discount_value"])
        items.append(
            SaleItemRead.model_validate(
                {
                    **data,
                    "discount_amount": line_discount,
                    "line_total": line_total,
                }
            ).model_dump()
        )

    branch_name = db.query(Branch.name).filter(Branch.id == sale.branch_id).scalar() or str(sale.branch_id)

    return SaleRead.model_validate(
        {
            "id": sale.id,
            "branch_id": sale.branch_id,
            "branch_name": branch_name,
            "type": SaleTypeEnum.in_person,
            "user_id": sale.user_id,
            "reservation_id": sale.reservation_id,
            "client_sale_id": sale.client_sale_id,
            "is_offline": sale.is_offline or False,
            "synced_at": sale.synced_at,
            "status": sale.status,
            "payment_method": sale.payment_method,
            "payment_status": sale.payment_status,
            "cash_reference": sale.cash_reference,
            "subtotal": sale.subtotal,
            "discount_amount": sale.discount_amount,
            "total_amount": sale.total_amount,
            "currency": sale.currency,
            "created_at": sale.created_at,
            "updated_at": sale.updated_at,
            "items": items,
        }
    )


def _resolve_items(db: Session, payload: SaleCreate, branch_id: UUID):
    normalized_items: dict[UUID, int] = defaultdict(int)

    if payload.reservation_id:
        reservation = _get_reservation_for_branch(db, payload.reservation_id, branch_id)
        if not reservation:
            raise ValueError("Reserva no encontrada para esta sucursal")
        if reservation.status in {ReservationStatusEnum.cancelled, ReservationStatusEnum.expired}:
            raise ValueError("La reserva no puede convertirse en venta")

        for item in reservation.items:
            normalized_items[item.variant_id] += item.quantity
    else:
        for item in payload.items:
            normalized_items[item.variant_id] += item.quantity

    if not normalized_items:
        raise ValueError("La venta no tiene items")

    return normalized_items


def _create_sale_from_items(
    db: Session,
    branch_id: UUID,
    user_id: UUID,
    payload: SaleCreate,
    normalized_items: dict[UUID, int],
    tenant_id: UUID | None = None,
):
    reservation = None
    reservation_should_adjust_inventory = False
    if payload.reservation_id:
        reservation = _get_reservation_for_branch(db, payload.reservation_id, branch_id)
        if not reservation:
            raise ValueError("Reserva no encontrada para esta sucursal")
        reservation_should_adjust_inventory = reservation.status in {ReservationStatusEnum.pending, ReservationStatusEnum.confirmed}

    sale = Sale(
        tenant_id=tenant_id,
        branch_id=branch_id,
        user_id=user_id,
        reservation_id=payload.reservation_id,
        client_sale_id=payload.client_sale_id,
        is_offline=payload.is_offline,
        synced_at=datetime.now(timezone.utc) if payload.is_offline else None,
        status=SaleStatusEnum.completed,
        payment_method=payload.payment_method,
        payment_status=PaymentStatusEnum.paid,
        cash_reference=payload.cash_reference,
        subtotal=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        total_amount=Decimal("0.00"),
        currency="usd",
    )
    db.add(sale)
    db.flush()

    subtotal = Decimal("0.00")
    discount_total = Decimal("0.00")
    for variant_id, quantity in normalized_items.items():
        inventory = _get_inventory_for_update(db, variant_id, branch_id)
        if not inventory:
            raise ValueError("No existe inventario para la variante seleccionada")

        variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
        if not variant or variant.status != ProductStatusEnum.active:
            raise ValueError("Variante no disponible para la venta")

        if payload.reservation_id and reservation_should_adjust_inventory:
            reserved_quantity = int(inventory.reserved_quantity or 0)
            stock_quantity = int(inventory.quantity or 0)
            if stock_quantity < quantity:
                raise ValueError("No hay stock suficiente para completar la venta")
            if reserved_quantity < quantity:
                raise ValueError("La reserva ya no tiene stock suficiente")
            inventory.reserved_quantity = reserved_quantity - quantity
            inventory.quantity = stock_quantity - quantity
            movement_note = f"Venta presencial desde reserva {payload.reservation_id}"
        elif payload.reservation_id:
            movement_note = f"Venta presencial desde reserva {payload.reservation_id}"
        else:
            available = max((inventory.quantity or 0) - (inventory.reserved_quantity or 0), 0)
            if quantity > available:
                raise ValueError("No hay stock suficiente para completar la venta")
            inventory.quantity = (inventory.quantity or 0) - quantity
            movement_note = "Venta presencial offline" if payload.is_offline else "Venta presencial"

        original_price = Decimal(str(variant.price))
        unit_price = discounted_price(original_price, variant.product.discount_type, variant.product.discount_value)
        discount_total += discount_amount(original_price, variant.product.discount_type, variant.product.discount_value) * quantity
        line_total = unit_price * quantity
        subtotal += original_price * quantity
        db.add(
            SaleItem(
                tenant_id=tenant_id,
                sale_id=sale.id,
                variant_id=variant_id,
                quantity=quantity,
                unit_price=unit_price,
                line_total=line_total,
                product_id=variant.product_id,
                product_name=variant.product.name if variant.product else str(variant.product_id),
                variant_sku=variant.sku,
                size_id=variant.size_id,
                color_id=variant.color_id,
                image_url=variant.image_url,
                image_public_id=variant.image_public_id,
            )
        )
        if not payload.reservation_id or reservation_should_adjust_inventory:
            db.add(
                InventoryMovement(
                    variant_id=variant_id,
                    branch_id=branch_id,
                    movement_type=InventoryMovementTypeEnum.outcome,
                    quantity=quantity,
                    note=movement_note,
                    created_by=user_id,
                )
            )

    sale.subtotal = subtotal
    sale.discount_amount = discount_total
    sale.total_amount = max(subtotal - discount_total, Decimal("0.00"))

    if reservation:
        if reservation.status in {ReservationStatusEnum.pending, ReservationStatusEnum.confirmed}:
            transition_reservation(reservation, ReservationStatusEnum.attended)

    return sale


def create_sale(db: Session, user_id: UUID, payload: SaleCreate, branch_id: UUID, tenant_id: UUID | None = None):
    # Idempotencia: Si ya existe una venta con este client_sale_id, retornarla sin duplicar
    if payload.client_sale_id:
        existing = db.query(Sale).filter(Sale.client_sale_id == payload.client_sale_id).first()
        if existing:
            if tenant_id and existing.tenant_id and existing.tenant_id != tenant_id:
                raise ValueError("Acceso denegado: este comprobante pertenece a otra empresa")
            return _serialize_sale(db, existing).model_dump()

    try:
        normalized_items = _resolve_items(db, payload, branch_id)
        with db.begin_nested():
            sale = _create_sale_from_items(db, branch_id, user_id, payload, normalized_items, tenant_id=tenant_id)
        db.commit()
        db.refresh(sale)
        for variant_id in normalized_items:
            inventory = _get_inventory_for_update(db, variant_id, branch_id)
            if inventory:
                notify_low_stock(db, inventory)
        if payload.reservation_id:
            reservation = db.query(Reservation).filter(Reservation.id == payload.reservation_id).first()
            if reservation and reservation.status == ReservationStatusEnum.attended:
                notify_reservation_event(db, reservation.id, reservation.user_id, reservation.status.value)
        return _serialize_sale(db, sale).model_dump()
    except Exception:
        db.rollback()
        raise


def list_sales_by_branch(db: Session, branch_id: UUID | None = None, user_id: UUID | None = None, tenant_id: UUID | None = None):
    query = db.query(Sale)
    if tenant_id is not None:
        query = query.filter(Sale.tenant_id == tenant_id)
    if branch_id is not None:
        query = query.filter(Sale.branch_id == branch_id)
    if user_id is not None:
        query = query.filter(Sale.user_id == user_id)
    sales = [_serialize_sale(db, sale).model_dump() for sale in query.order_by(Sale.created_at.desc()).all()]

    orders_query = db.query(Order).filter(Order.status == "paid", Order.pickup_branch_id.is_not(None))
    if tenant_id is not None:
        orders_query = orders_query.filter(Order.tenant_id == tenant_id)
    if branch_id is not None:
        orders_query = orders_query.filter(Order.pickup_branch_id == branch_id)
    orders = []
    for order in orders_query.order_by(Order.created_at.desc()).all():
        branch_name = db.query(Branch.name).filter(Branch.id == order.pickup_branch_id).scalar() or str(order.pickup_branch_id)
        orders.append(SaleRead.model_validate({
            "id": order.id,
            "branch_id": order.pickup_branch_id,
            "branch_name": branch_name,
            "type": SaleTypeEnum.online,
            "user_id": order.user_id,
            "reservation_id": None,
            "client_sale_id": None,
            "is_offline": False,
            "synced_at": None,
            "status": SaleStatusEnum.completed,
            "payment_method": order.payment_method,
            "payment_status": order.payment_status,
            "cash_reference": order.cash_reference,
            "subtotal": order.subtotal,
            "discount_amount": order.discount_amount,
            "total_amount": order.total_amount,
            "currency": order.currency,
            "created_at": order.created_at,
            "updated_at": order.updated_at,
            "items": [{
                "id": item.id, "sale_id": order.id, "variant_id": item.variant_id, "quantity": item.quantity,
                "unit_price": item.unit_price, "original_unit_price": item.unit_price, "discount_amount": Decimal("0.00"),
                "line_total": item.line_total, "product_id": item.product_id, "product_name": item.product_name,
                "variant_sku": item.variant_sku, "size_id": item.size_id, "color_id": item.color_id,
                "size_name": item.size_id and db.query(Size.name).filter(Size.id == item.size_id).scalar(),
                "color_name": item.color_id and db.query(Color.name).filter(Color.id == item.color_id).scalar(),
                "image_url": item.image_url, "image_public_id": item.image_public_id,
            } for item in order.items],
        }).model_dump())
    return sorted(sales + orders, key=lambda sale: sale["created_at"], reverse=True)


def get_sale(db: Session, branch_id: UUID | None, sale_id: UUID | str, user_id: UUID | None = None, tenant_id: UUID | None = None):
    parsed_uuid = None
    if isinstance(sale_id, UUID):
        parsed_uuid = sale_id
    elif isinstance(sale_id, str):
        try:
            parsed_uuid = UUID(sale_id.strip())
        except Exception:
            parsed_uuid = None

    if parsed_uuid:
        query = db.query(Sale).filter(or_(Sale.id == parsed_uuid, Sale.client_sale_id == parsed_uuid))
    else:
        raw_str = str(sale_id).strip()
        query = db.query(Sale).filter(
            or_(
                Sale.cash_reference.ilike(f"%{raw_str}%"),
                Sale.id.cast(String).ilike(f"%{raw_str}%"),
            )
        )

    if tenant_id is not None:
        query = query.filter(Sale.tenant_id == tenant_id)
    if branch_id is not None:
        query = query.filter(Sale.branch_id == branch_id)
    if user_id is not None:
        query = query.filter(Sale.user_id == user_id)
    sale = query.first()
    if not sale:
        return None
    return _serialize_sale(db, sale).model_dump()


# =========================================================================
# LÓGICA DEL CU14: Verificación de Estado y Arqueo de Operaciones Outbox
# =========================================================================
def check_offline_sales_status(
    db: Session,
    client_sale_ids: list[UUID],
    tenant_id: UUID | None = None,
) -> dict[str, list[UUID]]:
    """
    Verifica un lote de identificadores de ventas offline (UUIDv4) contra la base de datos central.
    Permite a la bandeja Outbox determinar instantáneamente qué comprobantes ya fueron asentados
    en el servidor y cuáles continúan pendientes de sincronización.
    """
    if not client_sale_ids:
        return {"synced_ids": [], "missing_ids": []}

    query = db.query(Sale.client_sale_id).filter(Sale.client_sale_id.in_(client_sale_ids))
    if tenant_id is not None:
        query = query.filter(Sale.tenant_id == tenant_id)

    found_rows = query.all()
    synced_set = {row[0] for row in found_rows if row[0] is not None}
    missing_list = [cid for cid in client_sale_ids if cid not in synced_set]

    return {
        "synced_ids": list(synced_set),
        "missing_ids": missing_list,
    }


# =========================================================================
# LÓGICA DEL CU15: Sincronización de Lotes con Idempotencia (sync_operations)
# =========================================================================
def batch_sync_offline_sales(
    db: Session,
    payload: BatchSyncRequest,
    tenant_id: UUID,
    current_user_id: UUID | None = None,
) -> BatchSyncResponse:
    """
    Sincronización en lote de ventas desconectadas con idempotencia central mediante sync_operations (CU15).
    Garantiza que transacciones reenviadas por latencia o pérdida de confirmación no dupliquen
    ventas ni descuenten existencias de inventario dos veces.
    """
    total_received = len(payload.operations)
    if total_received == 0:
        return BatchSyncResponse(
            status="success",
            summary=BatchSyncSummary(
                total_received=0,
                applied=0,
                duplicates_ignored=0,
                conflicts=0,
            ),
            processed_uuids=[],
            conflict_uuids=[],
            details=[],
        )

    # 1. Validar sucursal perteneciente al tenant
    branch = db.query(Branch).filter(Branch.id == payload.branch_id, Branch.tenant_id == tenant_id).first()
    if not branch:
        raise ValueError("Sucursal no encontrada o no pertenece a la empresa autenticada.")

    # 2. Consultar operaciones existentes para idempotencia
    client_ids = [op.client_sale_id for op in payload.operations]

    existing_sync_ops = {
        row[0]
        for row in db.query(SyncOperation.client_operation_id)
        .filter(
            SyncOperation.tenant_id == tenant_id,
            SyncOperation.client_operation_id.in_([str(cid) for cid in client_ids]),
        )
        .all()
    }
    existing_sales = {
        row[0]
        for row in db.query(Sale.client_sale_id)
        .filter(Sale.tenant_id == tenant_id, Sale.client_sale_id.in_(client_ids))
        .all()
        if row[0] is not None
    }
    already_processed_ids = existing_sync_ops.union({str(sid) for sid in existing_sales})

    applied = 0
    duplicates_ignored = 0
    conflicts = 0
    processed_uuids: list[UUID] = []
    conflict_uuids: list[UUID] = []
    details: list[BatchSyncItemResult] = []

    now_utc = datetime.now(timezone.utc)

    for op in payload.operations:
        op_uuid_str = str(op.client_sale_id)

        # Regla de Idempotencia: Si ya fue procesado, se ignora sin error ni doble descuento
        if op_uuid_str in already_processed_ids:
            duplicates_ignored += 1
            processed_uuids.append(op.client_sale_id)
            details.append(
                BatchSyncItemResult(
                    client_sale_id=op.client_sale_id,
                    status="duplicate_ignored",
                    message="Operación previamente procesada e idempotente.",
                )
            )
            continue

        # Regla Política 5: Solo efectivo
        payment_method_norm = (op.payment_method or "cash").strip().lower()
        if payment_method_norm not in ("cash", "efectivo"):
            raise ValueError(f"Venta offline {op.client_sale_id} rechazada: pago debe ser en efectivo.")

        # Verificar inventario y descontar con bloqueo pesimista
        is_conflict = False
        items_to_persist = []
        for item in op.items:
            variant = (
                db.query(ProductVariant)
                .join(Product, Product.id == ProductVariant.product_id)
                .filter(ProductVariant.id == item.variant_id, Product.tenant_id == tenant_id)
                .first()
            )
            if not variant:
                raise ValueError(f"Variante de producto {item.variant_id} no encontrada en el catálogo.")

            unit_price = item.unit_price if item.unit_price is not None else variant.price
            items_to_persist.append((variant, item.quantity, unit_price))

            inventory = _get_inventory_for_update(db, item.variant_id, payload.branch_id)
            if not inventory:
                inventory = Inventory(
                    tenant_id=tenant_id,
                    branch_id=payload.branch_id,
                    variant_id=item.variant_id,
                    quantity=0,
                )
                db.add(inventory)
                db.flush()

            if inventory.quantity < item.quantity:
                is_conflict = True
                inventory.quantity -= item.quantity
            else:
                inventory.quantity -= item.quantity

            mov = InventoryMovement(
                variant_id=item.variant_id,
                branch_id=payload.branch_id,
                movement_type=InventoryMovementTypeEnum.outcome,
                quantity=item.quantity,
                note=f"Sincronización Batch Venta Offline Ticket {op_uuid_str[:8].upper()}",
                created_by=op.cashier_id or current_user_id,
            )
            db.add(mov)

        # Crear venta
        sale_created_at = op.created_at or now_utc
        new_sale = Sale(
            tenant_id=tenant_id,
            branch_id=payload.branch_id,
            user_id=op.cashier_id or current_user_id,
            total_amount=op.total_amount,
            subtotal=op.total_amount,
            discount_amount=Decimal("0.00"),
            payment_method=PaymentMethodEnum.cash,
            payment_status=PaymentStatusEnum.paid,
            status=SaleStatusEnum.completed,
            is_offline=True,
            client_sale_id=op.client_sale_id,
            synced_at=now_utc,
            created_at=sale_created_at,
            currency="BOB",
            cash_reference=f"Offline Batch Sync - Ticket {op_uuid_str[:8].upper()}",
        )
        db.add(new_sale)
        db.flush()

        # Crear ítems de venta
        for variant, qty, price in items_to_persist:
            line_total = price * qty
            sale_item = SaleItem(
                tenant_id=tenant_id,
                sale_id=new_sale.id,
                variant_id=variant.id,
                quantity=qty,
                unit_price=price,
                line_total=line_total,
                product_id=variant.product_id,
                product_name=variant.product.name if variant.product else str(variant.product_id),
                variant_sku=variant.sku,
                size_id=variant.size_id,
                color_id=variant.color_id,
                image_url=variant.image_url,
                image_public_id=variant.image_public_id,
            )
            db.add(sale_item)

        # Registrar en sync_operations para blindar idempotencia
        sync_op = SyncOperation(
            tenant_id=tenant_id,
            client_operation_id=op_uuid_str,
            operation_type="SALE_OFFLINE",
            payload=op.model_dump(mode="json"),
            status="EN_CONFLICTO" if is_conflict else "PROCESADO",
            synced_at=now_utc,
        )
        db.add(sync_op)
        already_processed_ids.add(op_uuid_str)

        if is_conflict:
            conflicts += 1
            conflict_uuids.append(op.client_sale_id)
            details.append(
                BatchSyncItemResult(
                    client_sale_id=op.client_sale_id,
                    status="conflict",
                    sale_id=new_sale.id,
                    message="Venta sincronizada con advertencia de quiebre de stock concurrente.",
                )
            )
        else:
            applied += 1
            details.append(
                BatchSyncItemResult(
                    client_sale_id=op.client_sale_id,
                    status="applied",
                    sale_id=new_sale.id,
                    message="Venta sincronizada exitosamente.",
                )
            )

        processed_uuids.append(op.client_sale_id)

    db.commit()

    return BatchSyncResponse(
        status="success",
        summary=BatchSyncSummary(
            total_received=total_received,
            applied=applied,
            duplicates_ignored=duplicates_ignored,
            conflicts=conflicts,
        ),
        processed_uuids=processed_uuids,
        conflict_uuids=conflict_uuids,
        details=details,
    )

