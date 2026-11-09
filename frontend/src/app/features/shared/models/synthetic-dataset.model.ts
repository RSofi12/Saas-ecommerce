export interface SyntheticDatasetGenerateRequest {
  total_records: number;
  months_covered: number;
  include_returns: boolean;
  include_exchanges: boolean;
  random_seed?: number | null;
}

export interface SyntheticDatasetSummary {
  dataset_id: string;
  tenant_id: string;
  file_name: string;
  total_records: number;
  months_covered: number;
  categories_included: string[];
  sizes_distribution: Record<string, number>;
  categories_distribution: Record<string, number>;
  seasonal_factors: Record<string, number>;
  total_sales_simulated: number;
  return_rate_simulated: number;
  exchange_rate_simulated: number;
  download_url: string;
  created_at: string;
}

export interface LatestDatasetResponse {
  dataset_id: string;
  tenant_id: string;
  file_name: string;
  total_records: number;
  months_covered: number;
  categories_included: string[];
  sizes_distribution: Record<string, number>;
  seasonal_factors: Record<string, number>;
  return_rate_simulated: number;
  exchange_rate_simulated: number;
  download_url: string;
  created_at: string;
}
