import { ApiResponse } from '../../../core/models/api.model';

export type DashboardPeriod = 'day' | 'week' | 'month';

export interface DashboardQuery {
  branch_id?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  period?: DashboardPeriod;
}

export interface DashboardSummary {
  total_sales: string;
  total_orders: number;
  total_units_sold: number;
  average_ticket: string;
  total_stock: number;
  total_available_stock: number;
  low_stock_items: number;
  total_reservations: number;
  pending_reservations: number;
  confirmed_reservations: number;
  attended_reservations: number;
  cancelled_reservations: number;
}

export interface DashboardBranchKpi {
  branch_id: string;
  branch_name: string;
  city: string;
  total_sales: string;
  total_orders: number;
  total_units_sold: number;
  total_stock: number;
  total_available_stock: number;
}

export interface DashboardProductKpi {
  product_id: string;
  product_name: string;
  total_units_sold: number;
  total_sales: string;
  total_stock: number;
  total_available_stock: number;
}

export interface DashboardSeriesPoint {
  label: string;
  sales: string;
  orders: number;
  units: number;
}

export interface DashboardMovementPoint {
  label: string;
  income: number;
  outcome: number;
  transfer_in: number;
  transfer_out: number;
}

export interface DashboardBranchMovementPoint {
  branch_id: string;
  branch_name: string;
  income: number;
  outcome: number;
  transfer_in: number;
  transfer_out: number;
}

export interface DashboardInventoryPoint {
  branch_name: string;
  product_name: string;
  variant_sku: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
}


export interface OfflineSyncKpi {
  total_offline_sales: number;
  total_offline_revenue: string | number;
  synced_operations: number;
  pending_operations: number;
  failed_operations: number;
  sync_success_rate: number;
}

export interface PolicyRevenueKpi {
  return_retention_total: string | number;
  return_refund_total: string | number;
  returns_count: number;
  exchange_difference_total: string | number;
  exchanges_count: number;
}

export interface RfmSegmentDistributionPoint {
  segment_label: string;
  customer_count: number;
  percentage: number;
}

export interface MachineLearningKpi {
  has_ml_access: boolean;
  predicted_monthly_units: number;
  rfm_segments_distribution: RfmSegmentDistributionPoint[];
  critical_stockout_alerts_count: number;
  active_demand_model_version?: string | null;
  active_clustering_model_version?: string | null;
}

export interface PlanQuotaKpi {
  plan_name: string;
  plan_code: string;
  active_branches: number;
  max_branches: number;
  quota_usage_percent: number;
  has_ai_access: boolean;
}

export interface DashboardData {
  filters: DashboardQuery;
  summary: DashboardSummary;
  sales_series: DashboardSeriesPoint[];
  movement_series: DashboardMovementPoint[];
  movement_by_branch: DashboardBranchMovementPoint[];
  branch_kpis: DashboardBranchKpi[];
  top_products: DashboardProductKpi[];
  low_stock: DashboardInventoryPoint[];
  offline_sync?: OfflineSyncKpi;
  policy_revenue?: PolicyRevenueKpi;
  ml_kpis?: MachineLearningKpi;
  plan_quotas?: PlanQuotaKpi;
}

export type DashboardResponse = ApiResponse<DashboardData>;
