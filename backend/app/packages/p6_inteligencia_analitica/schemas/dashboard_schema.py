from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


DashboardPeriod = Literal['day', 'week', 'month']


class DashboardQuery(BaseModel):
    branch_id: UUID | None = None
    from_date: date | None = None
    to_date: date | None = None
    period: DashboardPeriod = 'day'


class DashboardSummary(BaseModel):
    total_sales: Decimal = Decimal('0.00')
    total_orders: int = 0
    total_units_sold: int = 0
    average_ticket: Decimal = Decimal('0.00')
    total_stock: int = 0
    total_available_stock: int = 0
    low_stock_items: int = 0
    total_reservations: int = 0
    pending_reservations: int = 0
    confirmed_reservations: int = 0
    attended_reservations: int = 0
    cancelled_reservations: int = 0


class DashboardBranchKpi(BaseModel):
    branch_id: UUID
    branch_name: str
    city: str
    total_sales: Decimal = Decimal('0.00')
    total_orders: int = 0
    total_units_sold: int = 0
    total_stock: int = 0
    total_available_stock: int = 0


class DashboardProductKpi(BaseModel):
    product_id: UUID
    product_name: str
    total_units_sold: int = 0
    total_sales: Decimal = Decimal('0.00')
    total_stock: int = 0
    total_available_stock: int = 0


class DashboardSeriesPoint(BaseModel):
    label: str
    sales: Decimal = Decimal('0.00')
    orders: int = 0
    units: int = 0


class DashboardMovementPoint(BaseModel):
    label: str
    income: int = 0
    outcome: int = 0
    transfer_in: int = 0
    transfer_out: int = 0


class DashboardBranchMovementPoint(BaseModel):
    branch_id: UUID
    branch_name: str
    income: int = 0
    outcome: int = 0
    transfer_in: int = 0
    transfer_out: int = 0


class DashboardInventoryPoint(BaseModel):
    branch_name: str
    product_name: str
    variant_sku: str
    quantity: int = 0
    reserved_quantity: int = 0
    available_quantity: int = 0


# ============================================================================
# CU25: Métricas Ejecutivas Avanzadas (Offline, Políticas, ML y Cuotas SaaS)
# ============================================================================

class OfflineSyncKpi(BaseModel):
    total_offline_sales: int = 0
    synced_operations: int = 0
    pending_operations: int = 0
    sync_success_rate: float = 100.0
    offline_revenue_total: Decimal = Decimal('0.00')


class PolicyRevenueKpi(BaseModel):
    return_retention_total: Decimal = Decimal('0.00')
    return_refunds_total: Decimal = Decimal('0.00')
    total_returns_count: int = 0
    exchange_difference_total: Decimal = Decimal('0.00')
    total_exchanges_count: int = 0


class RfmSegmentPoint(BaseModel):
    segment_label: str
    cluster_id: int
    customer_count: int
    percentage: float
    average_monetary: Decimal = Decimal('0.00')
    average_recency_days: float = 0.0


class MachineLearningKpi(BaseModel):
    has_ml_access: bool = False
    latest_demand_model_version: str | None = None
    latest_demand_model_r2: float | None = None
    predicted_monthly_units: int = 0
    critical_stock_alerts_count: int = 0
    top_selling_size_predicted: str | None = None
    rfm_segments_distribution: list[RfmSegmentPoint] = Field(default_factory=list)


class PlanQuotaKpi(BaseModel):
    plan_name: str = "Plan Básico"
    active_branches: int = 1
    max_branches: int = 3
    branches_usage_pct: float = 33.3
    has_ai_access: bool = False


class DashboardResponse(BaseModel):
    filters: DashboardQuery = Field(default_factory=DashboardQuery)
    summary: DashboardSummary
    offline_sync: OfflineSyncKpi = Field(default_factory=OfflineSyncKpi)
    policy_revenue: PolicyRevenueKpi = Field(default_factory=PolicyRevenueKpi)
    ml_kpis: MachineLearningKpi = Field(default_factory=MachineLearningKpi)
    plan_quotas: PlanQuotaKpi = Field(default_factory=PlanQuotaKpi)
    sales_series: list[DashboardSeriesPoint]
    movement_series: list[DashboardMovementPoint]
    movement_by_branch: list[DashboardBranchMovementPoint]
    branch_kpis: list[DashboardBranchKpi]
    top_products: list[DashboardProductKpi]
    low_stock: list[DashboardInventoryPoint]
