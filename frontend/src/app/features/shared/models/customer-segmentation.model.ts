export interface CentroidMetrics {
  recency_days: number;
  frequency_count: number;
  monetary_total: number;
  return_rate: number;
}

export interface ClusterProfileSummary {
  cluster_id: number;
  name: str;
  description: string;
  recommended_action: string;
  customer_count: number;
  percentage: number;
  centroid: CentroidMetrics;
  badge_color: string;
  badge_icon: string;
}

export type str = string;

export interface SegmentationTrainRequest {
  k_clusters: number;
  use_synthetic_fallback: boolean;
  random_state: number;
}

export interface SegmentationTrainResponse {
  model_id: string;
  model_version: string;
  tenant_id: string;
  trained_at: string;
  total_customers_analyzed: number;
  k_clusters: number;
  silhouette_score: number;
  inertia: number;
  data_source: string;
  clusters: ClusterProfileSummary[];
}

export interface ScatterPoint {
  customer_id: string;
  customer_name?: string;
  recency_days: number;
  frequency_count: number;
  monetary_total: number;
  return_rate: number;
  cluster_id: number;
  cluster_name: string;
  color: string;
}

export interface SegmentationScatterResponse {
  tenant_id: string;
  k_clusters: number;
  total_points: number;
  silhouette_score: number;
  points: ScatterPoint[];
}

export interface CustomerSegmentItem {
  id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  cluster_id: number;
  segment_label: string;
  recency_days?: number;
  frequency_count?: number;
  monetary_total?: number;
  return_rate?: number;
  assigned_at?: string;
}

export interface CustomerSegmentListResponse {
  total: number;
  page: number;
  page_size: number;
  cluster_id?: number;
  customers: CustomerSegmentItem[];
}

export interface SegmentationStatusData {
  has_trained_model: boolean;
  model?: {
    model_id: string;
    name: string;
    version: string;
    trained_at?: string;
    metrics?: {
      k_clusters: number;
      silhouette_score: number;
      inertia: number;
      total_customers: number;
      data_source: string;
      profiles: ClusterProfileSummary[];
    };
  };
}
