import { ApiResponse } from '../../../core/models/api.model';

export interface AdminBranch {
  id: string;
  tenant_id?: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  opening_hours: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BranchQuota {
  plan_name: string;
  plan_code: string;
  max_branches: number;
  current_active_branches: number;
  remaining_slots: number;
  can_create_branch: boolean;
  has_ai_access?: boolean;
  subscription_status?: string;
  end_date?: string | null;
}

export interface CreateBranchRequest {
  name: string;
  city: string;
  address?: string;
  phone?: string;
  opening_hours?: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
  is_active?: boolean;
}

export interface UpdateBranchRequest {
  name: string;
  city: string;
  address?: string;
  phone?: string;
  opening_hours?: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
  is_active: boolean;
}

export interface UpdateBranchActiveRequest {
  is_active: boolean;
}

export type BranchListResponse = ApiResponse<AdminBranch[]>;
export type BranchQuotaResponse = ApiResponse<BranchQuota>;
