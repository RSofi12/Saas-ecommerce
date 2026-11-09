import { ApiResponse } from '../../../core/models/api.model';
import { PaymentMethodEnum, PaymentStatusEnum } from './order.model';

export type ReportType = 'sales' | 'inventory' | 'movements';
export type ReportExportFormat = 'csv' | 'excel' | 'pdf';

export interface ReportColumnDef {
  key: string;
  label: string;
  defaultSelected: boolean;
}

export const SALES_REPORT_COLUMNS: ReportColumnDef[] = [
  { key: 'branch_name', label: 'Sucursal', defaultSelected: true },
  { key: 'product_name', label: 'Producto', defaultSelected: true },
  { key: 'variant_sku', label: 'SKU / Talla', defaultSelected: true },
  { key: 'type', label: 'Canal', defaultSelected: true },
  { key: 'quantity_sold', label: 'Cantidad', defaultSelected: true },
  { key: 'gross_sales', label: 'Total (Bs.)', defaultSelected: true },
  { key: 'payment_method', label: 'Método Pago', defaultSelected: true },
  { key: 'payment_status', label: 'Estado Pago', defaultSelected: false },
  { key: 'sale_status', label: 'Estado Venta', defaultSelected: false },
];

export const INVENTORY_REPORT_COLUMNS: ReportColumnDef[] = [
  { key: 'branch_name', label: 'Sucursal', defaultSelected: true },
  { key: 'product_name', label: 'Producto', defaultSelected: true },
  { key: 'variant_sku', label: 'SKU / Talla', defaultSelected: true },
  { key: 'quantity', label: 'Stock Físico', defaultSelected: true },
  { key: 'reserved_quantity', label: 'Reservado', defaultSelected: true },
  { key: 'available_quantity', label: 'Disponible', defaultSelected: true },
];

export const MOVEMENTS_REPORT_COLUMNS: ReportColumnDef[] = [
  { key: 'branch_name', label: 'Sucursal', defaultSelected: true },
  { key: 'product_name', label: 'Producto', defaultSelected: true },
  { key: 'variant_sku', label: 'SKU / Talla', defaultSelected: true },
  { key: 'movement_type', label: 'Tipo Movimiento', defaultSelected: true },
  { key: 'quantity', label: 'Unidades Movidas', defaultSelected: true },
  { key: 'movements_count', label: 'Transacciones', defaultSelected: true },
];

export interface ReportQuery {
  branch_id?: string | null;
  product_id?: string | null;
  variant_id?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  q?: string | null;
}

export interface ReportSummary {
  total_orders?: number;
  total_sales?: string;
  total_units?: number;
  average_ticket?: string;
  total_lines?: number;
  total_stock?: number;
  total_reserved?: number;
  total_available?: number;
  total_units_moved?: number;
}

export interface SalesReportRow {
  branch_id: string;
  branch_name: string;
  type: 'venta presencial' | 'venta virtual';
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_sku: string;
  quantity_sold: number;
  gross_sales: string;
  payment_method?: PaymentMethodEnum | null;
  payment_status?: PaymentStatusEnum | null;
  sale_status?: string | null;
}

export interface InventoryReportRow {
  branch_id: string;
  branch_name: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_sku: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
}

export interface MovementReportRow {
  branch_id: string;
  branch_name: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_sku: string;
  movement_type: 'income' | 'outcome' | 'transfer_in' | 'transfer_out';
  quantity: number;
  movements_count: number;
}

export interface ReportPayload<T> {
  summary: ReportSummary;
  rows: T[];
}

export type SalesReportResponse = ApiResponse<ReportPayload<SalesReportRow>>;
export type InventoryReportResponse = ApiResponse<ReportPayload<InventoryReportRow>>;
export type MovementsReportResponse = ApiResponse<ReportPayload<MovementReportRow>>;
export type ReportResponse = SalesReportResponse | InventoryReportResponse | MovementsReportResponse;

export interface NaturalReportPayload {
  report_type: ReportType;
  format: 'pdf' | 'html' | 'csv';
  columns?: string[];
  filters: ReportQuery;
  interpretation: string;
  report: ReportPayload<SalesReportRow> | ReportPayload<InventoryReportRow> | ReportPayload<MovementReportRow>;
}

export type NaturalReportResponse = ApiResponse<NaturalReportPayload>;

export interface ExecutiveKPICard {
  title: string;
  value: string;
  subtext?: string | null;
  trend?: 'up' | 'down' | 'neutral' | null;
  color?: string | null;
}

export interface VoiceReportResponse {
  query: string;
  executive_summary: string;
  speech_text: string;
  kpis: ExecutiveKPICard[];
  data_preview: Array<Record<string, any>>;
  model_used: string;
  is_fallback: boolean;
  generated_at: string;
}

export interface VoiceCapabilitiesResponse {
  ai_available: boolean;
  model: string;
  language: string;
  supported_topics: string[];
  suggested_queries: string[];
}

