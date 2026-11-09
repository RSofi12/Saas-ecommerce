import { Injectable, inject } from '@angular/core';

import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/models/api.model';
import { Reservation } from '../models/reservation.model';
import {
  BatchSyncRequest,
  BatchSyncResponse,
  CreateSaleRequest,
  ExchangeQuoteResponse,
  GarmentExchange,
  GarmentReturn,
  ReturnQuoteResponse,
  SaleConflict,
  SaleConflictResolveRequest,
  SaleConflictResolveResponse,
  SaleResponse,
  SalesListResponse,
} from '../models/sale.model';

@Injectable({ providedIn: 'root' })
export class SalesApiService {
  private readonly api = inject(ApiService);

  listBranchSales(branchId?: string) {
    const query = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    return this.api.get<SalesListResponse>(`/sales/branch${query}`);
  }

  getSale(saleId: string, branchId?: string) {
    const query = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    return this.api.get<SaleResponse>(`/sales/${saleId}${query}`);
  }

  createSale(payload: CreateSaleRequest) {
    return this.api.post<SaleResponse>('/sales', payload);
  }

  searchReservation(reservationId: string, branchId?: string) {
    const query = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    return this.api.get<ApiResponse<Reservation>>(`/reservations/branch/${reservationId}${query}`);
  }

  // CU17: Métodos de Cambio de Prenda
  quoteExchange(payload: { sale_id: string; original_variant_id: string; new_variant_id: string }, branchId?: string) {
    const query = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    return this.api.post<ApiResponse<ExchangeQuoteResponse>>(`/exchanges/quote${query}`, payload);
  }

  processExchange(
    payload: {
      sale_id: string;
      original_variant_id: string;
      new_variant_id: string;
      condition?: string;
      difference_paid?: boolean;
      payment_method?: string | null;
      notes?: string | null;
    },
    branchId?: string
  ) {
    const query = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    return this.api.post<ApiResponse<GarmentExchange>>(`/exchanges${query}`, payload);
  }

  // CU18: Métodos de Devolución de Prenda con Retención Operativa
  quoteReturn(payload: { sale_id: string; variant_id: string }, branchId?: string) {
    const query = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    return this.api.post<ApiResponse<ReturnQuoteResponse>>(`/returns/quote${query}`, payload);
  }

  processReturn(
    payload: {
      sale_id: string;
      variant_id: string;
      condition?: string;
      refund_method: string;
      reason?: string | null;
    },
    branchId?: string
  ) {
    const query = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    return this.api.post<ApiResponse<GarmentReturn>>(`/returns${query}`, payload);
  }

  // CU14: Verificación de estado de operaciones offline en Outbox
  checkOfflineStatus(clientSaleIds: string[]) {
    return this.api.post<ApiResponse<{ synced_ids: string[]; missing_ids: string[] }>>(
      '/sales/offline/check-status',
      { client_sale_ids: clientSaleIds }
    );
  }

  // CU15: Sincronización de Lotes de Ventas Offline con Idempotencia Central
  batchSyncSales(payload: BatchSyncRequest) {
    return this.api.post<ApiResponse<BatchSyncResponse>>('/sales/offline/batch-sync', payload);
  }

  // CU16: Gestión y Resolución de Conflictos de Ventas Offline (Quiebres de Stock)
  listSaleConflicts(branchId?: string) {
    const query = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    return this.api.get<ApiResponse<SaleConflict[]>>(`/sales/conflicts${query}`);
  }

  resolveSaleConflict(saleId: string, payload: SaleConflictResolveRequest, branchId?: string) {
    const query = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    return this.api.post<ApiResponse<SaleConflictResolveResponse>>(
      `/sales/conflicts/${encodeURIComponent(saleId)}/resolve${query}`,
      payload
    );
  }
}
