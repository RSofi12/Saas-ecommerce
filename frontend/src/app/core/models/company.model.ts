export interface Plan {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  max_branches: number;
  has_ai_access: boolean;
  price_monthly: number;
  is_active: boolean;
}

export interface PlanCreateDto {
  name: string;
  code: string;
  description?: string | null;
  max_branches: number;
  has_ai_access: boolean;
  price_monthly: number;
  is_active?: boolean;
}

export interface PlanUpdateDto {
  name?: string;
  description?: string | null;
  max_branches?: number;
  has_ai_access?: boolean;
  price_monthly?: number;
  is_active?: boolean;
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  start_date: string;
  end_date?: string | null;
  status: 'ACTIVA' | 'VENCIDA' | 'CANCELADA' | string;
  plan?: Plan;
}

export interface SubscriptionAssignDto {
  company_id: string;
  plan_id: string;
  start_date?: string;
  end_date?: string | null;
  status?: string;
}

export interface SubscriptionUpdateDto {
  plan_id?: string;
  start_date?: string;
  end_date?: string | null;
  status?: string;
}

export interface Company {
  id: string;
  name: string;
  business_name: string;
  nit_rut: string;
  subdomain: string;
  status: 'ACTIVO' | 'SUSPENDIDO';
  email?: string | null;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
  current_plan_name?: string;
  current_plan_code?: string;
}

export interface CompanyCreateDto {
  name: string;
  business_name: string;
  nit_rut: string;
  subdomain: string;
  email?: string;
  phone?: string;
  plan_code: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
}

export interface ApiResponse<T> {
  status_code: number;
  message: string;
  data: T;
}
