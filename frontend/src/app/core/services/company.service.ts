import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import {
  ApiResponse,
  Company,
  CompanyCreateDto,
  Plan,
  PlanCreateDto,
  PlanUpdateDto,
  Subscription,
  SubscriptionAssignDto,
  SubscriptionUpdateDto,
} from '../models/company.model';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly api = inject(ApiService);

  getCompanies(statusFilter?: string): Observable<Company[]> {
    const query = statusFilter && statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    return this.api.get<ApiResponse<Company[]>>(`/saas/companies${query}`).pipe(
      map((res) => res.data || []),
    );
  }

  getCompanyById(id: string): Observable<Company> {
    return this.api.get<ApiResponse<Company>>(`/saas/companies/${id}`).pipe(
      map((res) => res.data),
    );
  }

  getPlans(includeInactive: boolean = false): Observable<Plan[]> {
    const query = includeInactive ? '?include_inactive=true' : '';
    return this.api.get<ApiResponse<Plan[]>>(`/saas/plans${query}`).pipe(
      map((res) => res.data || []),
    );
  }

  getPlanById(id: string): Observable<Plan> {
    return this.api.get<ApiResponse<Plan>>(`/saas/plans/${id}`).pipe(
      map((res) => res.data),
    );
  }

  createPlan(dto: PlanCreateDto): Observable<Plan> {
    return this.api.post<ApiResponse<Plan>>('/saas/plans', dto).pipe(
      map((res) => res.data),
    );
  }

  updatePlan(id: string, dto: PlanUpdateDto): Observable<Plan> {
    return this.api.put<ApiResponse<Plan>>(`/saas/plans/${id}`, dto).pipe(
      map((res) => res.data),
    );
  }

  togglePlanStatus(id: string, isActive: boolean): Observable<Plan> {
    return this.api.patch<ApiResponse<Plan>>(`/saas/plans/${id}/status`, { is_active: isActive }).pipe(
      map((res) => res.data),
    );
  }

  deletePlan(id: string): Observable<Plan | null> {
    return this.api.delete<ApiResponse<Plan | null>>(`/saas/plans/${id}`).pipe(
      map((res) => res.data),
    );
  }

  createCompany(dto: CompanyCreateDto): Observable<{ company: Company; initial_admin_id?: string }> {
    return this.api.post<ApiResponse<{ company: Company; initial_admin_id?: string }>>('/saas/companies', dto).pipe(
      map((res) => res.data),
    );
  }

  updateCompanyStatus(id: string, status: 'ACTIVO' | 'SUSPENDIDO'): Observable<Company> {
    return this.api.patch<ApiResponse<Company>>(`/saas/companies/${id}/status`, { status }).pipe(
      map((res) => res.data),
    );
  }

  getCompanySubscription(companyId: string): Observable<Subscription | null> {
    return this.api.get<ApiResponse<Subscription | null>>(`/saas/subscriptions/company/${companyId}`).pipe(
      map((res) => res.data || null),
    );
  }

  assignSubscription(dto: SubscriptionAssignDto): Observable<Subscription> {
    return this.api.post<ApiResponse<Subscription>>('/saas/subscriptions', dto).pipe(
      map((res) => res.data),
    );
  }

  updateSubscription(subscriptionId: string, dto: SubscriptionUpdateDto): Observable<Subscription> {
    return this.api.put<ApiResponse<Subscription>>(`/saas/subscriptions/${subscriptionId}`, dto).pipe(
      map((res) => res.data),
    );
  }
}
