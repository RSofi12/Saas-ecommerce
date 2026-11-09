export interface DemandTrainRequest {
  use_synthetic?: boolean;
  test_size?: number;
  n_estimators?: number;
  max_depth?: number;
}

export interface DemandTrainResponse {
  model_id: string;
  model_version: string;
  algorithm: string;
  records_trained: number;
  features_used: string[];
  metrics: {
    r2: number;
    mae: number;
    rmse: number;
    [key: string]: number;
  };
  trained_at: string;
  is_active: boolean;
  message: string;
}

export interface DemandForecastRequest {
  product_id: string;
  branch_id?: string | null;
  weeks_ahead: number;
  confidence_level?: number;
}

export interface SizeForecastDetail {
  size: string;
  variant_id?: string | null;
  sku?: string | null;
  current_stock: number;
  predicted_weekly_demand: number[];
  total_predicted_units: number;
  confidence_lower: number;
  confidence_upper: number;
  recommended_reorder: number;
  stock_status: 'AGOTADO' | 'CRITICO' | 'BAJO' | 'OPTIMO' | 'SOBRESTOCK';
}

export interface DemandForecastResponse {
  product_id: string;
  product_name: string;
  category_name: string;
  branch_id?: string | null;
  branch_name?: string | null;
  weeks_ahead: number;
  model_version: string;
  model_r2: number;
  forecast_by_size: SizeForecastDetail[];
  total_projected_demand: number;
  critical_variants_count: number;
  generated_at: string;
}

export interface StockReorderAlert {
  variant_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  size: string;
  branch_id?: string | null;
  branch_name?: string | null;
  current_stock: number;
  projected_demand_next_month: number;
  recommended_reorder_units: number;
  urgency: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface LatestDemandModelResponse {
  id: string;
  name: string;
  version: string;
  metrics: {
    r2: number;
    mae: number;
    rmse: number;
    records?: number;
  };
  model_path?: string;
  is_active: boolean;
  trained_at: string;
}
