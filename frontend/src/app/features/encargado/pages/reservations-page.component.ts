import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import type { Observable } from 'rxjs';

import { toast } from '@spartan-ng/brain/sonner';

import { HlmBadgeImports } from '../../../components/badge/src';
import { HlmButton } from '../../../components/button/src';
import { HlmCardImports } from '../../../components/card/src';
import { HlmTable } from '../../../components/table/src';
import { getErrorMessage } from '../../../core/utils/http-error.util';
import { requestWithToast } from '../../../core/utils/request-toast.util';
import { CatalogBranch, CatalogProduct } from '../../shared/models/catalog.model';
import {
  ConflictResolutionType,
  Reservation,
  ReservationConflictItem,
  ReservationConflictResolveRequest,
} from '../../shared/models/reservation.model';
import { CatalogApiService } from '../../shared/services/catalog-api.service';
import { ReservationApiService } from '../../shared/services/reservation-api.service';
import { SessionService } from '../../shared/services/session.service';

@Component({
  selector: 'app-encargado-reservations-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmButton, HlmTable, ...HlmBadgeImports, ...HlmCardImports],
  templateUrl: './reservations-page.component.html',
})
export class ReservationsPageComponent {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly reservationApi = inject(ReservationApiService);
  private readonly session = inject(SessionService);

  protected readonly branches = signal<CatalogBranch[]>([]);
  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly conflicts = signal<ReservationConflictItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly activeTab = signal<'all' | 'conflicts'>('all');

  protected readonly selectedReservationId = signal<string | null>(null);
  protected readonly updatingReservationId = signal<string | null>(null);

  // Modal de resolución de conflictos (CU12)
  protected readonly selectedConflict = signal<ReservationConflictItem | null>(null);
  protected readonly resolutionType = signal<ConflictResolutionType>('reactivate');
  protected readonly extendedDays = signal<number>(1);
  protected readonly substituteVariantId = signal<string>('');
  protected readonly resolutionNotes = signal<string>('');
  protected readonly resolving = signal(false);
  protected readonly sweeping = signal(false);
  protected readonly branchProducts = signal<CatalogProduct[]>([]);
  protected readonly loadingBranchProducts = signal(false);

  constructor() {
    void this.loadData();
  }

  protected get branchId(): string | null {
    return this.session.user()?.branch_id ?? null;
  }

  protected get total(): number {
    return this.reservations().length;
  }

  protected get pending(): number {
    return this.reservations().filter((item) => item.status === 'pending' || item.status === 'confirmed').length;
  }

  protected get expired(): number {
    return this.reservations().filter((item) => item.status === 'expired').length;
  }

  protected get conflictsCount(): number {
    return this.conflicts().filter((item) => item.status === 'expired').length;
  }

  protected get selectedReservation(): Reservation | null {
    const selectedId = this.selectedReservationId();
    if (!selectedId) return null;
    return this.reservations().find((reservation) => reservation.id === selectedId) ?? null;
  }

  protected canActOn(reservation: Reservation): boolean {
    return reservation.status === 'pending' || reservation.status === 'confirmed';
  }

  protected branchName(branchId: string | null | undefined): string {
    if (!branchId) return 'Sin sucursal';
    return this.branches().find((branch) => branch.id === branchId)?.name ?? 'Sucursal';
  }

  protected reservationStatusLabel(status: Reservation['status']): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmada';
      case 'attended': return 'Atendida';
      case 'purchase_pending': return 'Compra pendiente';
      case 'sold': return 'Vendida';
      case 'not_sold': return 'No comprada';
      case 'cancelled': return 'Cancelada';
      case 'expired': return 'Vencida / En Conflicto';
      default: return status;
    }
  }

  protected reservationStatusClass(status: Reservation['status']): string {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'confirmed': return 'bg-sky-100 text-sky-700';
      case 'attended': return 'bg-emerald-100 text-emerald-700';
      case 'purchase_pending': return 'bg-violet-100 text-violet-700';
      case 'sold': return 'bg-emerald-100 text-emerald-700';
      case 'not_sold': return 'bg-slate-100 text-slate-700';
      case 'cancelled': return 'bg-rose-100 text-rose-700';
      case 'expired': return 'bg-rose-100 text-rose-800 font-semibold';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  protected async refresh(): Promise<void> {
    await this.loadReservations();
    await this.loadConflicts();
  }

  protected async triggerSweeper(): Promise<void> {
    this.sweeping.set(true);
    try {
      const resp = await firstValueFrom(this.reservationApi.runSweeper());
      const data = resp.data;
      const count = data?.expired_reservations ?? 0;
      toast.success(
        count > 0
          ? `Barrido completado: ${count} reserva(s) vencida(s) liberadas y stock devuelto a inventario.`
          : 'Barrido ejecutado: No se encontraron reservas pendientes vencidas en este momento.'
      );
      await this.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo ejecutar el barrido de reservas vencidas.'));
    } finally {
      this.sweeping.set(false);
    }
  }

  protected selectReservation(reservation: Reservation): void {
    this.selectedReservationId.set(reservation.id);
  }

  protected closeReservationModal(): void {
    this.selectedReservationId.set(null);
  }

  // --- CU12: Métodos de Gestión y Resolución de Conflictos ---
  protected openResolveModal(conflict: ReservationConflictItem): void {
    this.selectedConflict.set(conflict);
    this.resolutionType.set(conflict.can_reactivate ? 'reactivate' : 'substitute');
    this.extendedDays.set(1);
    this.substituteVariantId.set('');
    this.resolutionNotes.set('');
    if (this.branchProducts().length === 0) {
      void this.loadBranchProducts();
    }
  }

  protected closeResolveModal(): void {
    this.selectedConflict.set(null);
    this.resolving.set(false);
  }

  protected async submitConflictResolution(): Promise<void> {
    const conflict = this.selectedConflict();
    if (!conflict) return;

    const notes = this.resolutionNotes().trim();
    if (!notes || notes.length < 5) {
      toast.error('Debe ingresar una justificación detallada de al menos 5 caracteres.');
      return;
    }

    if (this.resolutionType() === 'substitute' && !this.substituteVariantId().trim()) {
      toast.error('Debe especificar el identificador de la variante de prenda sustituta.');
      return;
    }

    const payload: ReservationConflictResolveRequest = {
      resolution_type: this.resolutionType(),
      extended_days: Number(this.extendedDays()),
      substitute_variant_id: this.resolutionType() === 'substitute' ? this.substituteVariantId().trim() : null,
      notes,
    };

    this.resolving.set(true);
    try {
      const resp = await firstValueFrom(
        this.reservationApi.resolveConflict(conflict.id, payload, this.branchId ?? undefined)
      );
      toast.success(
        this.resolutionType() === 'close'
          ? 'Conflicto cerrado y reserva anulada correctamente.'
          : 'Reserva reactivada y stock reservado con éxito.'
      );
      this.closeResolveModal();
      await this.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Error al resolver el conflicto de reserva expirada.'));
    } finally {
      this.resolving.set(false);
    }
  }

  protected async confirmArrival(reservation: Reservation): Promise<void> {
    await this.runAction(reservation.id, 'Confirmando llegada...', 'Llegada confirmada.', 'No se pudo confirmar la llegada.', () =>
      this.reservationApi.confirmArrival(reservation.id, this.branchId ?? undefined));
  }

  protected async attendReservation(reservation: Reservation): Promise<void> {
    await this.runAction(reservation.id, 'Atendiendo reserva...', 'Reserva atendida.', 'No se pudo atender la reserva.', () =>
      this.reservationApi.attendReservation(reservation.id, this.branchId ?? undefined));
  }

  protected async cancelReservation(reservation: Reservation): Promise<void> {
    await this.runAction(reservation.id, 'Cancelando reserva...', 'Reserva cancelada.', 'No se pudo cancelar la reserva.', () =>
      this.reservationApi.cancelBranchReservation(reservation.id, this.branchId ?? undefined));
  }

  private async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const [branches] = await Promise.all([firstValueFrom(this.catalogApi.listPublicBranches())]);
      this.branches.set(branches.data ?? []);
      await Promise.all([this.loadReservations(), this.loadConflicts()]);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron cargar las reservas de sucursal.'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadReservations(): Promise<void> {
    const branchId = this.branchId;
    if (!branchId) {
      this.reservations.set([]);
      return;
    }

    try {
      const response = await firstValueFrom(this.reservationApi.listBranchReservations(branchId));
      this.reservations.set((response.data ?? []) as Reservation[]);
      if (this.selectedReservationId() && !this.reservations().some((reservation) => reservation.id === this.selectedReservationId())) {
        this.selectedReservationId.set(null);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron cargar las reservas.'));
      this.reservations.set([]);
    }
  }

  private async loadConflicts(): Promise<void> {
    const branchId = this.branchId;
    if (!branchId) {
      this.conflicts.set([]);
      return;
    }

    try {
      const response = await firstValueFrom(this.reservationApi.listBranchConflicts(branchId));
      this.conflicts.set((response.data ?? []) as ReservationConflictItem[]);
    } catch {
      // Endpoint puede no tener conflictos
      this.conflicts.set([]);
    }
  }

  private async loadBranchProducts(): Promise<void> {
    const branchId = this.branchId;
    this.loadingBranchProducts.set(true);
    try {
      const resp = await firstValueFrom(
        this.catalogApi.listProducts({ branch_id: branchId ?? undefined })
      );
      this.branchProducts.set((resp.data ?? []) as CatalogProduct[]);
    } catch {
      this.branchProducts.set([]);
    } finally {
      this.loadingBranchProducts.set(false);
    }
  }

  private async runAction(
    reservationId: string,
    loadingMessage: string,
    successMessage: string,
    errorMessage: string,
    executor: () => Observable<unknown>,
  ): Promise<void> {
    this.updatingReservationId.set(reservationId);
    try {
      await requestWithToast(executor(), {
        loading: loadingMessage,
        success: successMessage,
        error: errorMessage,
      });
      await this.refresh();
    } catch {
      // toast handled by requestWithToast
    } finally {
      this.updatingReservationId.set(null);
    }
  }
}
