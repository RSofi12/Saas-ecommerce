import { Injectable, inject } from '@angular/core';
import { CreateReservationRequest, Reservation } from '../../features/shared/models/reservation.model';
import { NetworkStatusService } from './network-status.service';

export interface PendingOfflineReservationItem {
  variant_id: string;
  product_name: string;
  variant_sku?: string;
  size_name?: string | null;
  color_name?: string | null;
  unit_price: number;
  quantity: number;
}

export interface PendingReservationItem {
  client_reservation_id: string;
  payload: CreateReservationRequest;
  reservation_code?: string;
  branch_id?: string;
  branch_name?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  visit_date?: string;
  expires_at?: string;
  items_summary: string;
  total_estimated: number;
  created_at: string;
  synced: boolean;
  synced_at?: string | null;
  sync_error?: string | null;
  status?: 'PENDIENTE_SYNC' | 'SINCRONIZADA' | 'ERROR';
  items?: PendingOfflineReservationItem[];
}

export type PendingOfflineReservation = PendingReservationItem;

const STORAGE_KEY = 'fashionstore_pending_reservations';

@Injectable({ providedIn: 'root' })
export class IdbReservationsService {
  private readonly network = inject(NetworkStatusService);

  getPending(): PendingReservationItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getPendingOnly(): PendingReservationItem[] {
    return this.getPending().filter((p) => !p.synced);
  }

  getSyncedOnly(): PendingReservationItem[] {
    return this.getPending().filter((p) => p.synced);
  }

  savePending(item: PendingReservationItem): void {
    const list = this.getPending();
    const existingIndex = list.findIndex((p) => p.client_reservation_id === item.client_reservation_id);
    if (existingIndex >= 0) {
      list[existingIndex] = item;
    } else {
      list.unshift(item);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  markAsSynced(clientReservationId: string): void {
    const list = this.getPending();
    const target = list.find((p) => p.client_reservation_id === clientReservationId);
    if (target) {
      target.synced = true;
      target.status = 'SINCRONIZADA';
      target.synced_at = new Date().toISOString();
      target.sync_error = null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  }

  markAsError(clientReservationId: string, error: string): void {
    const list = this.getPending();
    const target = list.find((p) => p.client_reservation_id === clientReservationId);
    if (target) {
      target.status = 'ERROR';
      target.sync_error = error;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  }

  removePending(clientReservationId: string): void {
    const list = this.getPending().filter((p) => p.client_reservation_id !== clientReservationId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}


