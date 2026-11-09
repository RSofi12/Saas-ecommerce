from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session

from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p0_saas_plataforma.models.plan import Plan
from app.packages.p0_saas_plataforma.models.subscription import Subscription
from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch
from app.packages.p2_gestion_productos_catalogo.models.product import Product
from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory import Inventory
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory_movement import InventoryMovement
from app.packages.p3_gestion_inventario_disponibilidad.schemas.inventory_schema import InventoryMovementTypeEnum
from app.packages.p4_gestion_compras_reservas.models.reservation import Reservation
from app.packages.p4_gestion_compras_reservas.schemas.reservation_schema import ReservationStatusEnum
from app.packages.p5_gestion_ventas_pos.models.garment_exchange import GarmentExchange
from app.packages.p5_gestion_ventas_pos.models.garment_return import GarmentReturn
from app.packages.p5_gestion_ventas_pos.models.sale import Sale
from app.packages.p5_gestion_ventas_pos.models.sale_item import SaleItem
from app.packages.p5_gestion_ventas_pos.models.sync_operation import SyncOperation
from app.packages.p6_inteligencia_analitica.models.customer_segment import CustomerSegment
from app.packages.p6_inteligencia_analitica.models.demand_forecast import DemandForecast
from app.packages.p6_inteligencia_analitica.models.ml_model import MLModel
from app.packages.p6_inteligencia_analitica.schemas.dashboard_schema import (
    DashboardBranchKpi,
    DashboardBranchMovementPoint,
    DashboardInventoryPoint,
    DashboardMovementPoint,
    DashboardProductKpi,
    DashboardQuery,
    DashboardResponse,
    DashboardSeriesPoint,
    DashboardSummary,
    MachineLearningKpi,
    OfflineSyncKpi,
    PlanQuotaKpi,
    PolicyRevenueKpi,
    RfmSegmentPoint,
)


def _date_range(filters: DashboardQuery):
    start = datetime.combine(filters.from_date, datetime.min.time()) if filters.from_date else None
    end = datetime.combine(filters.to_date + timedelta(days=1), datetime.min.time()) if filters.to_date else None
    return start, end


def _period_label(column, period: str):
    return func.to_char(func.date_trunc(period, column), 'YYYY-MM-DD')


def _collect_rows(rows, key_field: str) -> dict:
    return {str(getattr(row, key_field)): row._mapping for row in rows}


def _compute_offline_sync_kpi(
    db: Session,
    tenant_id: UUID | None,
    branch_id: UUID | None,
    start: datetime | None,
    end: datetime | None,
) -> OfflineSyncKpi:
    offline_sales_q = db.query(
        func.count(Sale.id).label('total_count'),
        func.coalesce(func.sum(Sale.total_amount), 0).label('total_rev'),
    ).filter(Sale.is_offline.is_(True))

    if tenant_id:
        offline_sales_q = offline_sales_q.filter(Sale.tenant_id == tenant_id)
    if branch_id:
        offline_sales_q = offline_sales_q.filter(Sale.branch_id == branch_id)
    if start:
        offline_sales_q = offline_sales_q.filter(Sale.created_at >= start)
    if end:
        offline_sales_q = offline_sales_q.filter(Sale.created_at < end)
    offline_sales_row = offline_sales_q.one()

    total_offline_sales = int(offline_sales_row.total_count or 0)
    offline_revenue_total = Decimal(str(offline_sales_row.total_rev or 0))

    sync_q = db.query(
        SyncOperation.status,
        func.count(SyncOperation.id).label('count'),
    )
    if tenant_id:
        sync_q = sync_q.filter(SyncOperation.tenant_id == tenant_id)
    if start:
        sync_q = sync_q.filter(SyncOperation.created_at >= start)
    if end:
        sync_q = sync_q.filter(SyncOperation.created_at < end)
    sync_rows = sync_q.group_by(SyncOperation.status).all()

    synced_ops = sum(r.count for r in sync_rows if str(r.status).upper() in ('PROCESADO', 'COMPLETED', 'EXITOSO', 'PROCESSED'))
    pending_ops = sum(r.count for r in sync_rows if str(r.status).upper() not in ('PROCESADO', 'COMPLETED', 'EXITOSO', 'PROCESSED'))
    total_ops = synced_ops + pending_ops
    sync_rate = round((synced_ops / total_ops) * 100.0, 1) if total_ops > 0 else 100.0

    return OfflineSyncKpi(
        total_offline_sales=total_offline_sales,
        synced_operations=synced_ops,
        pending_operations=pending_ops,
        sync_success_rate=sync_rate,
        offline_revenue_total=offline_revenue_total,
    )


def _compute_policy_revenue_kpi(
    db: Session,
    tenant_id: UUID | None,
    branch_id: UUID | None,
    start: datetime | None,
    end: datetime | None,
) -> PolicyRevenueKpi:
    returns_q = db.query(
        func.count(GarmentReturn.id).label('total_count'),
        func.coalesce(func.sum(GarmentReturn.retention_amount), 0).label('total_retention'),
        func.coalesce(func.sum(GarmentReturn.refund_amount), 0).label('total_refund'),
    )
    if tenant_id:
        returns_q = returns_q.filter(GarmentReturn.tenant_id == tenant_id)
    if branch_id:
        returns_q = returns_q.filter(GarmentReturn.branch_id == branch_id)
    if start:
        returns_q = returns_q.filter(GarmentReturn.created_at >= start)
    if end:
        returns_q = returns_q.filter(GarmentReturn.created_at < end)
    returns_row = returns_q.one()

    exchanges_q = db.query(
        func.count(GarmentExchange.id).label('total_count'),
        func.coalesce(func.sum(GarmentExchange.price_difference), 0).label('total_diff'),
    ).filter(GarmentExchange.difference_paid.is_(True))

    if tenant_id:
        exchanges_q = exchanges_q.filter(GarmentExchange.tenant_id == tenant_id)
    if branch_id:
        exchanges_q = exchanges_q.filter(GarmentExchange.branch_id == branch_id)
    if start:
        exchanges_q = exchanges_q.filter(GarmentExchange.created_at >= start)
    if end:
        exchanges_q = exchanges_q.filter(GarmentExchange.created_at < end)
    exchanges_row = exchanges_q.one()

    return PolicyRevenueKpi(
        return_retention_total=Decimal(str(returns_row.total_retention or 0)),
        return_refunds_total=Decimal(str(returns_row.total_refund or 0)),
        total_returns_count=int(returns_row.total_count or 0),
        exchange_difference_total=Decimal(str(exchanges_row.total_diff or 0)),
        total_exchanges_count=int(exchanges_row.total_count or 0),
    )


def _compute_ml_kpis(
    db: Session,
    tenant_id: UUID | None,
    branch_id: UUID | None,
    has_ai_access: bool,
) -> MachineLearningKpi:
    if not has_ai_access or not tenant_id:
        return MachineLearningKpi(has_ml_access=False)

    latest_model = (
        db.query(MLModel)
        .filter(
            MLModel.tenant_id == tenant_id,
            MLModel.is_active.is_(True),
            MLModel.model_type.ilike('%demand%'),
        )
        .order_by(MLModel.trained_at.desc())
        .first()
    )
    latest_version = latest_model.version if latest_model else None
    latest_r2 = None
    if latest_model and isinstance(latest_model.metrics, dict):
        latest_r2 = float(latest_model.metrics.get('r2', 0.0) or 0.0)

    forecast_q = db.query(
        func.coalesce(func.sum(DemandForecast.predicted_units), 0).label('total_units'),
        func.count(DemandForecast.id).label('alerts_count'),
    ).filter(DemandForecast.tenant_id == tenant_id)
    if branch_id:
        forecast_q = forecast_q.filter(DemandForecast.branch_id == branch_id)
    forecast_row = forecast_q.one()
    predicted_units = int(forecast_row.total_units or 0)
    alerts_count = int(forecast_row.alerts_count or 0)

    top_forecast = (
        db.query(DemandForecast)
        .filter(DemandForecast.tenant_id == tenant_id)
        .order_by(DemandForecast.predicted_units.desc())
        .first()
    )
    top_size = None
    if top_forecast and top_forecast.variant and hasattr(top_forecast.variant, 'size') and top_forecast.variant.size:
        top_size = top_forecast.variant.size.name
    elif top_forecast:
        top_size = "M"

    seg_rows = (
        db.query(
            CustomerSegment.cluster_id,
            CustomerSegment.segment_label,
            func.count(CustomerSegment.id).label('cust_count'),
            func.coalesce(func.avg(CustomerSegment.monetary_total), 0).label('avg_monetary'),
            func.coalesce(func.avg(CustomerSegment.recency_days), 0).label('avg_recency'),
        )
        .filter(CustomerSegment.tenant_id == tenant_id)
        .group_by(CustomerSegment.cluster_id, CustomerSegment.segment_label)
        .order_by(CustomerSegment.cluster_id.asc())
        .all()
    )
    total_customers = sum(r.cust_count for r in seg_rows)
    rfm_segments = [
        RfmSegmentPoint(
            segment_label=r.segment_label,
            cluster_id=r.cluster_id,
            customer_count=r.cust_count,
            percentage=round((r.cust_count / total_customers) * 100.0, 1) if total_customers > 0 else 0.0,
            average_monetary=Decimal(str(round(r.avg_monetary, 2))),
            average_recency_days=round(float(r.avg_recency), 1),
        )
        for r in seg_rows
    ]

    return MachineLearningKpi(
        has_ml_access=True,
        latest_demand_model_version=latest_version,
        latest_demand_model_r2=latest_r2,
        predicted_monthly_units=predicted_units,
        critical_stock_alerts_count=alerts_count,
        top_selling_size_predicted=top_size,
        rfm_segments_distribution=rfm_segments,
    )


def _compute_plan_quota_kpi(db: Session, tenant_id: UUID | None) -> PlanQuotaKpi:
    if not tenant_id:
        return PlanQuotaKpi()

    active_sub = (
        db.query(Subscription)
        .filter(
            Subscription.company_id == tenant_id,
            Subscription.status == 'ACTIVA',
        )
        .first()
    )
    plan = active_sub.plan if active_sub else None
    plan_name = plan.name if plan else "Plan Básico"
    max_branches = int(plan.max_branches) if plan and plan.max_branches else 3
    has_ai = bool(plan.has_ai_access) if plan else False

    active_branches = (
        db.query(Branch)
        .filter(
            Branch.tenant_id == tenant_id,
            Branch.is_active.is_(True),
        )
        .count()
    )
    usage_pct = round((active_branches / max_branches) * 100.0, 1) if max_branches > 0 else 0.0

    return PlanQuotaKpi(
        plan_name=plan_name,
        active_branches=active_branches,
        max_branches=max_branches,
        branches_usage_pct=usage_pct,
        has_ai_access=has_ai,
    )


def get_dashboard(
    db: Session,
    filters: DashboardQuery,
    tenant_id: UUID | None = None,
) -> DashboardResponse:
    start, end = _date_range(filters)

    sales_total_row = (
        db.query(
            func.coalesce(func.sum(Sale.total_amount), 0).label('total_sales'),
            func.count(Sale.id).label('total_orders'),
        )
    )
    if tenant_id:
        sales_total_row = sales_total_row.filter(Sale.tenant_id == tenant_id)
    if filters.branch_id:
        sales_total_row = sales_total_row.filter(Sale.branch_id == filters.branch_id)
    if start:
        sales_total_row = sales_total_row.filter(Sale.created_at >= start)
    if end:
        sales_total_row = sales_total_row.filter(Sale.created_at < end)
    sales_total_row = sales_total_row.one()

    sales_units_row = (
        db.query(func.coalesce(func.sum(SaleItem.quantity), 0).label('total_units_sold'))
        .join(Sale, Sale.id == SaleItem.sale_id)
    )
    if tenant_id:
        sales_units_row = sales_units_row.filter(Sale.tenant_id == tenant_id)
    if filters.branch_id:
        sales_units_row = sales_units_row.filter(Sale.branch_id == filters.branch_id)
    if start:
        sales_units_row = sales_units_row.filter(Sale.created_at >= start)
    if end:
        sales_units_row = sales_units_row.filter(Sale.created_at < end)
    sales_units_row = sales_units_row.one()

    total_sales = Decimal(str(sales_total_row.total_sales or 0))
    total_orders = int(sales_total_row.total_orders or 0)
    total_units_sold = int(sales_units_row.total_units_sold or 0)

    inventory_aggregate = db.query(
        func.coalesce(func.sum(Inventory.quantity), 0).label('total_stock'),
        func.coalesce(func.sum(Inventory.quantity - Inventory.reserved_quantity), 0).label('total_available_stock'),
        func.coalesce(func.sum(case((Inventory.quantity <= Inventory.reserved_quantity, 1), else_=0)), 0).label('low_stock_items'),
    )
    if tenant_id:
        inventory_aggregate = inventory_aggregate.filter(or_(Inventory.tenant_id == tenant_id, Inventory.tenant_id.is_(None)))
    if filters.branch_id:
        inventory_aggregate = inventory_aggregate.filter(Inventory.branch_id == filters.branch_id)
    inventory_row = inventory_aggregate.one()

    reservation_aggregate = db.query(
        func.count(Reservation.id).label('total_reservations'),
        func.coalesce(func.sum(case((Reservation.status == ReservationStatusEnum.pending, 1), else_=0)), 0).label('pending_reservations'),
        func.coalesce(func.sum(case((Reservation.status == ReservationStatusEnum.confirmed, 1), else_=0)), 0).label('confirmed_reservations'),
        func.coalesce(func.sum(case((Reservation.status == ReservationStatusEnum.attended, 1), else_=0)), 0).label('attended_reservations'),
        func.coalesce(func.sum(case((Reservation.status == ReservationStatusEnum.cancelled, 1), else_=0)), 0).label('cancelled_reservations'),
    )
    if tenant_id:
        reservation_aggregate = reservation_aggregate.filter(Reservation.tenant_id == tenant_id)
    if filters.branch_id:
        reservation_aggregate = reservation_aggregate.filter(Reservation.branch_id == filters.branch_id)
    if start:
        reservation_aggregate = reservation_aggregate.filter(Reservation.created_at >= start)
    if end:
        reservation_aggregate = reservation_aggregate.filter(Reservation.created_at < end)
    reservation_row = reservation_aggregate.one()

    sales_period = _period_label(Sale.created_at, filters.period)
    sales_series_query = db.query(
        sales_period.label('label'),
        func.coalesce(func.sum(Sale.total_amount), 0).label('sales'),
        func.count(Sale.id).label('orders'),
    )
    if tenant_id:
        sales_series_query = sales_series_query.filter(Sale.tenant_id == tenant_id)
    if filters.branch_id:
        sales_series_query = sales_series_query.filter(Sale.branch_id == filters.branch_id)
    if start:
        sales_series_query = sales_series_query.filter(Sale.created_at >= start)
    if end:
        sales_series_query = sales_series_query.filter(Sale.created_at < end)
    sales_series_rows = sales_series_query.group_by(sales_period).order_by(sales_period).all()

    sales_units_series_query = db.query(
        sales_period.label('label'),
        func.coalesce(func.sum(SaleItem.quantity), 0).label('units'),
    ).join(Sale, Sale.id == SaleItem.sale_id)
    if tenant_id:
        sales_units_series_query = sales_units_series_query.filter(Sale.tenant_id == tenant_id)
    if filters.branch_id:
        sales_units_series_query = sales_units_series_query.filter(Sale.branch_id == filters.branch_id)
    if start:
        sales_units_series_query = sales_units_series_query.filter(Sale.created_at >= start)
    if end:
        sales_units_series_query = sales_units_series_query.filter(Sale.created_at < end)
    sales_units_series_rows = sales_units_series_query.group_by(sales_period).order_by(sales_period).all()
    sales_units_map = _collect_rows(sales_units_series_rows, 'label')

    movement_period = _period_label(InventoryMovement.created_at, filters.period)
    movement_series_query = db.query(
        movement_period.label('label'),
        func.coalesce(func.sum(case((InventoryMovement.movement_type == InventoryMovementTypeEnum.income, InventoryMovement.quantity), else_=0)), 0).label('income'),
        func.coalesce(func.sum(case((InventoryMovement.movement_type == InventoryMovementTypeEnum.outcome, InventoryMovement.quantity), else_=0)), 0).label('outcome'),
        func.coalesce(func.sum(case((InventoryMovement.movement_type == InventoryMovementTypeEnum.transfer_in, InventoryMovement.quantity), else_=0)), 0).label('transfer_in'),
        func.coalesce(func.sum(case((InventoryMovement.movement_type == InventoryMovementTypeEnum.transfer_out, InventoryMovement.quantity), else_=0)), 0).label('transfer_out'),
    ).join(Branch, Branch.id == InventoryMovement.branch_id)
    if tenant_id:
        movement_series_query = movement_series_query.filter(Branch.tenant_id == tenant_id)
    if filters.branch_id:
        movement_series_query = movement_series_query.filter(InventoryMovement.branch_id == filters.branch_id)
    if start:
        movement_series_query = movement_series_query.filter(InventoryMovement.created_at >= start)
    if end:
        movement_series_query = movement_series_query.filter(InventoryMovement.created_at < end)
    movement_series_rows = movement_series_query.group_by(movement_period).order_by(movement_period).all()

    movement_by_branch_query = db.query(
        InventoryMovement.branch_id.label('branch_id'),
        Branch.name.label('branch_name'),
        func.coalesce(func.sum(case((InventoryMovement.movement_type == InventoryMovementTypeEnum.income, InventoryMovement.quantity), else_=0)), 0).label('income'),
        func.coalesce(func.sum(case((InventoryMovement.movement_type == InventoryMovementTypeEnum.outcome, InventoryMovement.quantity), else_=0)), 0).label('outcome'),
        func.coalesce(func.sum(case((InventoryMovement.movement_type == InventoryMovementTypeEnum.transfer_in, InventoryMovement.quantity), else_=0)), 0).label('transfer_in'),
        func.coalesce(func.sum(case((InventoryMovement.movement_type == InventoryMovementTypeEnum.transfer_out, InventoryMovement.quantity), else_=0)), 0).label('transfer_out'),
    ).join(Branch, Branch.id == InventoryMovement.branch_id)
    if tenant_id:
        movement_by_branch_query = movement_by_branch_query.filter(Branch.tenant_id == tenant_id)
    if filters.branch_id:
        movement_by_branch_query = movement_by_branch_query.filter(InventoryMovement.branch_id == filters.branch_id)
    if start:
        movement_by_branch_query = movement_by_branch_query.filter(InventoryMovement.created_at >= start)
    if end:
        movement_by_branch_query = movement_by_branch_query.filter(InventoryMovement.created_at < end)
    movement_by_branch_rows = movement_by_branch_query.group_by(InventoryMovement.branch_id, Branch.name).order_by(Branch.name.asc()).all()

    branch_sales_amount_query = db.query(
        Sale.branch_id.label('branch_id'),
        func.coalesce(func.sum(Sale.total_amount), 0).label('total_sales'),
        func.count(Sale.id).label('total_orders'),
    )
    if tenant_id:
        branch_sales_amount_query = branch_sales_amount_query.filter(Sale.tenant_id == tenant_id)
    if filters.branch_id:
        branch_sales_amount_query = branch_sales_amount_query.filter(Sale.branch_id == filters.branch_id)
    if start:
        branch_sales_amount_query = branch_sales_amount_query.filter(Sale.created_at >= start)
    if end:
        branch_sales_amount_query = branch_sales_amount_query.filter(Sale.created_at < end)
    branch_sales_amount_rows = branch_sales_amount_query.group_by(Sale.branch_id).all()

    branch_sales_units_query = db.query(
        Sale.branch_id.label('branch_id'),
        func.coalesce(func.sum(SaleItem.quantity), 0).label('total_units_sold'),
    ).join(Sale, Sale.id == SaleItem.sale_id)
    if tenant_id:
        branch_sales_units_query = branch_sales_units_query.filter(Sale.tenant_id == tenant_id)
    if filters.branch_id:
        branch_sales_units_query = branch_sales_units_query.filter(Sale.branch_id == filters.branch_id)
    if start:
        branch_sales_units_query = branch_sales_units_query.filter(Sale.created_at >= start)
    if end:
        branch_sales_units_query = branch_sales_units_query.filter(Sale.created_at < end)
    branch_sales_units_rows = branch_sales_units_query.group_by(Sale.branch_id).all()

    branch_sales_map = {str(row.branch_id): row._mapping for row in branch_sales_amount_rows}
    branch_sales_units_map = {str(row.branch_id): row._mapping for row in branch_sales_units_rows}

    branch_inventory_query = db.query(
        Inventory.branch_id.label('branch_id'),
        func.coalesce(func.sum(Inventory.quantity), 0).label('total_stock'),
        func.coalesce(func.sum(Inventory.quantity - Inventory.reserved_quantity), 0).label('total_available_stock'),
    )
    if tenant_id:
        branch_inventory_query = branch_inventory_query.filter(or_(Inventory.tenant_id == tenant_id, Inventory.tenant_id.is_(None)))
    if filters.branch_id:
        branch_inventory_query = branch_inventory_query.filter(Inventory.branch_id == filters.branch_id)
    branch_inventory_rows = branch_inventory_query.group_by(Inventory.branch_id).all()
    branch_inventory_map = {str(row.branch_id): row._mapping for row in branch_inventory_rows}

    branch_rows = []
    branch_query = db.query(Branch.id, Branch.name, Branch.city)
    if tenant_id:
        branch_query = branch_query.filter(Branch.tenant_id == tenant_id)
    if filters.branch_id:
        branch_query = branch_query.filter(Branch.id == filters.branch_id)
    for branch in branch_query.order_by(Branch.name.asc()).all():
        sales_data = branch_sales_map.get(str(branch.id), {})
        units_data = branch_sales_units_map.get(str(branch.id), {})
        inventory_data = branch_inventory_map.get(str(branch.id), {})
        branch_rows.append(
            DashboardBranchKpi(
                branch_id=branch.id,
                branch_name=branch.name,
                city=branch.city,
                total_sales=Decimal(str(sales_data.get('total_sales', 0) or 0)),
                total_orders=int(sales_data.get('total_orders', 0) or 0),
                total_units_sold=int(units_data.get('total_units_sold', 0) or 0),
                total_stock=int(inventory_data.get('total_stock', 0) or 0),
                total_available_stock=int(inventory_data.get('total_available_stock', 0) or 0),
            )
        )

    product_sales_query = db.query(
        Product.id.label('product_id'),
        Product.name.label('product_name'),
        func.coalesce(func.sum(SaleItem.quantity), 0).label('total_units_sold'),
        func.coalesce(func.sum(SaleItem.line_total), 0).label('total_sales'),
    ).join(Sale, Sale.id == SaleItem.sale_id).join(ProductVariant, ProductVariant.id == SaleItem.variant_id).join(Product, Product.id == ProductVariant.product_id)
    if tenant_id:
        product_sales_query = product_sales_query.filter(Product.tenant_id == tenant_id)
    if filters.branch_id:
        product_sales_query = product_sales_query.filter(Sale.branch_id == filters.branch_id)
    if start:
        product_sales_query = product_sales_query.filter(Sale.created_at >= start)
    if end:
        product_sales_query = product_sales_query.filter(Sale.created_at < end)
    product_sales_rows = product_sales_query.group_by(Product.id, Product.name).all()
    product_sales_map = {str(row.product_id): row._mapping for row in product_sales_rows}

    product_inventory_query = (
        db.query(
            Product.id.label('product_id'),
            func.coalesce(func.sum(Inventory.quantity), 0).label('total_stock'),
            func.coalesce(func.sum(Inventory.quantity - Inventory.reserved_quantity), 0).label('total_available_stock'),
        )
        .join(ProductVariant, ProductVariant.product_id == Product.id)
        .join(Inventory, Inventory.variant_id == ProductVariant.id)
    )
    if tenant_id:
        product_inventory_query = product_inventory_query.filter(Product.tenant_id == tenant_id)
    if filters.branch_id:
        product_inventory_query = product_inventory_query.filter(Inventory.branch_id == filters.branch_id)
    product_inventory_rows = product_inventory_query.group_by(Product.id).all()
    product_inventory_map = {str(row.product_id): row._mapping for row in product_inventory_rows}

    product_rows = []
    product_query = db.query(Product.id, Product.name)
    if tenant_id:
        product_query = product_query.filter(Product.tenant_id == tenant_id)
    for product in product_query.order_by(Product.name.asc()).all():
        sales_data = product_sales_map.get(str(product.id), {})
        inventory_data = product_inventory_map.get(str(product.id), {})
        product_rows.append(
            DashboardProductKpi(
                product_id=product.id,
                product_name=product.name,
                total_units_sold=int(sales_data.get('total_units_sold', 0) or 0),
                total_sales=Decimal(str(sales_data.get('total_sales', 0) or 0)),
                total_stock=int(inventory_data.get('total_stock', 0) or 0),
                total_available_stock=int(inventory_data.get('total_available_stock', 0) or 0),
            )
        )
    product_rows.sort(key=lambda item: (item.total_sales, item.total_units_sold), reverse=True)
    product_rows = product_rows[:10]

    low_stock_query = (
        db.query(
            Branch.name.label('branch_name'),
            Product.name.label('product_name'),
            ProductVariant.sku.label('variant_sku'),
            Inventory.quantity.label('quantity'),
            Inventory.reserved_quantity.label('reserved_quantity'),
            (Inventory.quantity - Inventory.reserved_quantity).label('available_quantity'),
        )
        .join(ProductVariant, ProductVariant.id == Inventory.variant_id)
        .join(Product, Product.id == ProductVariant.product_id)
        .outerjoin(Branch, Branch.id == Inventory.branch_id)
        .filter(Inventory.quantity <= Inventory.reserved_quantity)
    )
    if tenant_id:
        low_stock_query = low_stock_query.filter(Product.tenant_id == tenant_id)
    if filters.branch_id:
        low_stock_query = low_stock_query.filter(Inventory.branch_id == filters.branch_id)
    low_stock_rows = low_stock_query.order_by(Branch.name.asc().nullslast(), Product.name.asc(), ProductVariant.sku.asc()).limit(8).all()

    summary = DashboardSummary(
        total_sales=total_sales,
        total_orders=total_orders,
        total_units_sold=total_units_sold,
        average_ticket=(total_sales / total_orders) if total_orders else Decimal('0.00'),
        total_stock=int(inventory_row.total_stock or 0),
        total_available_stock=int(inventory_row.total_available_stock or 0),
        low_stock_items=int(inventory_row.low_stock_items or 0),
        total_reservations=int(reservation_row.total_reservations or 0),
        pending_reservations=int(reservation_row.pending_reservations or 0),
        confirmed_reservations=int(reservation_row.confirmed_reservations or 0),
        attended_reservations=int(reservation_row.attended_reservations or 0),
        cancelled_reservations=int(reservation_row.cancelled_reservations or 0),
    )

    # Cálculo de los 4 nuevos bloques de KPIs ejecutivos de CU25
    plan_quotas = _compute_plan_quota_kpi(db, tenant_id)
    offline_sync = _compute_offline_sync_kpi(db, tenant_id, filters.branch_id, start, end)
    policy_revenue = _compute_policy_revenue_kpi(db, tenant_id, filters.branch_id, start, end)
    ml_kpis = _compute_ml_kpis(db, tenant_id, filters.branch_id, plan_quotas.has_ai_access)

    return DashboardResponse(
        filters=filters,
        summary=summary,
        offline_sync=offline_sync,
        policy_revenue=policy_revenue,
        ml_kpis=ml_kpis,
        plan_quotas=plan_quotas,
        sales_series=[
            DashboardSeriesPoint(
                label=row.label,
                sales=Decimal(str(row.sales or 0)),
                orders=int(row.orders or 0),
                units=int(sales_units_map.get(str(row.label), {}).get('units', 0) or 0),
            )
            for row in sales_series_rows
        ],
        movement_series=[
            DashboardMovementPoint(
                label=row.label,
                income=int(row.income or 0),
                outcome=int(row.outcome or 0),
                transfer_in=int(row.transfer_in or 0),
                transfer_out=int(row.transfer_out or 0),
            )
            for row in movement_series_rows
        ],
        movement_by_branch=[
            DashboardBranchMovementPoint(
                branch_id=row.branch_id,
                branch_name=row.branch_name,
                income=int(row.income or 0),
                outcome=int(row.outcome or 0),
                transfer_in=int(row.transfer_in or 0),
                transfer_out=int(row.transfer_out or 0),
            )
            for row in movement_by_branch_rows
        ],
        branch_kpis=branch_rows,
        top_products=product_rows,
        low_stock=[DashboardInventoryPoint.model_validate(row._mapping) for row in low_stock_rows],
    )
