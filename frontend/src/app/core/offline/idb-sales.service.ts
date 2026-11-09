import { Injectable, inject } from '@angular/core';
import { NetworkStatusService } from './network-status.service';

export interface PendingOfflineSaleItem {
  variant_id: string;
  product_name: string;
  variant_sku: string;
  size_name?: string | null;
  color_name?: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface PendingOfflineSale {
  client_sale_id: string; // UUIDv4
  sale_code: string; // TCK-OFF-XXXXXXXX
  branch_id: string;
  branch_name: string;
  cashier_id: string;
  cashier_name: string;
  payment_method: 'cash';
  cash_received: number;
  change_amount: number;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  created_at: string;
  synced: boolean;
  synced_at?: string | null;
  sync_error?: string | null;
  error?: string | null;
  retry_count?: number;
  last_retry_at?: string | null;
  items: PendingOfflineSaleItem[];
}

const STORAGE_KEY = 'fashionstore_pending_pos_sales';

@Injectable({ providedIn: 'root' })
export class IdbSalesService {
  private readonly network = inject(NetworkStatusService);

  getPending(): PendingOfflineSale[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getPendingOnly(): PendingOfflineSale[] {
    return this.getPending().filter((p) => !p.synced);
  }

  getSyncedOnly(): PendingOfflineSale[] {
    return this.getPending().filter((p) => p.synced);
  }

  getTotalPendingCash(): number {
    return this.getPendingOnly().reduce((acc, sale) => acc + (sale.total_amount || 0), 0);
  }

  savePending(item: PendingOfflineSale): void {
    const list = this.getPending();
    const existingIndex = list.findIndex((p) => p.client_sale_id === item.client_sale_id);
    if (existingIndex >= 0) {
      list[existingIndex] = item;
    } else {
      list.unshift(item);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  removePending(clientSaleId: string): void {
    const list = this.getPending().filter((p) => p.client_sale_id !== clientSaleId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  markAsSynced(clientSaleId: string): void {
    const list = this.getPending();
    const item = list.find((p) => p.client_sale_id === clientSaleId);
    if (item) {
      item.synced = true;
      item.synced_at = new Date().toISOString();
      item.sync_error = null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  }

  markAsError(clientSaleId: string, error: string): void {
    const list = this.getPending();
    const item = list.find((p) => p.client_sale_id === clientSaleId);
    if (item) {
      item.sync_error = error;
      item.retry_count = (item.retry_count || 0) + 1;
      item.last_retry_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  }

  incrementRetry(clientSaleId: string, error?: string): void {
    const list = this.getPending();
    const item = list.find((p) => p.client_sale_id === clientSaleId);
    if (item) {
      item.retry_count = (item.retry_count || 0) + 1;
      item.last_retry_at = new Date().toISOString();
      if (error) {
        item.sync_error = error;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  }

  resetError(clientSaleId: string): void {
    const list = this.getPending();
    const item = list.find((p) => p.client_sale_id === clientSaleId);
    if (item) {
      item.sync_error = null;
      item.error = null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  }

  getPendingCount(): number {
    return this.getPending().filter((p) => !p.synced).length;
  }

  clearSynced(): void {
    const list = this.getPending().filter((p) => !p.synced);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
