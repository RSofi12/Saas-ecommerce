import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { toast } from '@spartan-ng/brain/sonner';

import { HlmBadgeImports } from '../../../components/badge/src';
import { HlmCardImports } from '../../../components/card/src';
import { HlmInputImports } from '../../../components/input/src';
import { HlmTextareaImports } from '../../../components/textarea/src';
import { getErrorMessage } from '../../../core/utils/http-error.util';
import { CatalogProduct } from '../../shared/models/catalog.model';
import { CatalogApiService } from '../../shared/services/catalog-api.service';
import { SessionService } from '../../shared/services/session.service';
import {
  SaleConflict,
  SaleConflictResolutionType,
  SaleConflictResolveRequest,
} from '../../shared/models/sale.model';
import { SalesApiService } from '../../shared/services/sales-api.service';

@Component({
  selector: 'app-sale-conflicts-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ...HlmBadgeImports,
    ...HlmCardImports,
    ...HlmInputImports,
    ...HlmTextareaImports,
  ],
  templateUrl: './sale-conflicts-page.component.html',
})
export class SaleConflictsPageComponent {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly salesApi = inject(SalesApiService);
  private readonly session = inject(SessionService);

  protected readonly conflicts = signal<SaleConflict[]>([]);
  protected readonly branchProducts = signal<CatalogProduct[]>([]);
  protected readonly loadingBranchProducts = signal<boolean>(false);
  protected readonly loading = signal<boolean>(false);
  protected readonly resolving = signal<boolean>(false);

  // Modal de resolución
  protected readonly isModalOpen = signal<boolean>(false);
  protected readonly selectedConflict = signal<SaleConflict | null>(null);
  protected readonly resolutionType = signal<SaleConflictResolutionType>('negative_stock');
  protected readonly resolutionNote = signal<string>('');
  protected readonly substituteVariantId = signal<string>('');

  protected readonly totalAmountInConflict = computed(() => {
    return this.conflicts().reduce((sum, c) => sum + (c.total_amount || 0), 0);
  });

  protected readonly isNoteValid = computed(() => {
    return (this.resolutionNote() || '').trim().length >= 5;
  });

  protected readonly canSubmit = computed(() => {
    if (!this.isNoteValid() || this.resolving()) return false;
    if (this.resolutionType() === 'substitute') {
      return (this.substituteVariantId() || '').trim().length > 0;
    }
    return true;
  });

  constructor() {
    void this.loadConflicts();
  }

  async loadConflicts(): Promise<void> {
    this.loading.set(true);
    try {
      const branchId = this.session.user()?.branch_id ?? undefined;
      const resp = await firstValueFrom(this.salesApi.listSaleConflicts(branchId));
      this.conflicts.set(resp.data ?? []);
    } catch (err) {
      toast.error('Error al cargar conflictos', {
        description: getErrorMessage(err, 'No se pudo sincronizar la bandeja de quiebres.'),
      });
    } finally {
      this.loading.set(false);
    }
  }

  async loadBranchProducts(): Promise<void> {
    const branchId = this.session.user()?.branch_id ?? undefined;
    this.loadingBranchProducts.set(true);
    try {
      const resp = await firstValueFrom(this.catalogApi.listProducts({ branch_id: branchId }));
      this.branchProducts.set((resp.data ?? []) as CatalogProduct[]);
    } catch {
      this.branchProducts.set([]);
    } finally {
      this.loadingBranchProducts.set(false);
    }
  }

  openResolutionModal(conflict: SaleConflict): void {
    this.selectedConflict.set(conflict);
    this.resolutionType.set('negative_stock');
    this.resolutionNote.set('');
    this.substituteVariantId.set('');
    this.isModalOpen.set(true);
    if (this.branchProducts().length === 0) {
      void this.loadBranchProducts();
    }
  }

  closeModal(): void {
    if (this.resolving()) return;
    this.isModalOpen.set(false);
    this.selectedConflict.set(null);
  }

  async submitResolution(): Promise<void> {
    const conflict = this.selectedConflict();
    if (!conflict || !this.canSubmit()) return;

    this.resolving.set(true);
    try {
      const payload: SaleConflictResolveRequest = {
        resolution_type: this.resolutionType(),
        resolution_note: this.resolutionNote().trim(),
        new_variant_id:
          this.resolutionType() === 'substitute' ? this.substituteVariantId().trim() : null,
      };

      const branchId = this.session.user()?.branch_id ?? undefined;
      const resp = await firstValueFrom(
        this.salesApi.resolveSaleConflict(conflict.sale_id, payload, branchId)
      );

      const result = resp.data;
      const msg = result?.message || 'Conflicto resuelto exitosamente.';

      if (this.resolutionType() === 'credit_note' && result?.credit_note_code) {
        toast.success('Nota de Crédito Emitida', {
          description: `Código: ${result.credit_note_code}. Reembolso al 100% para compras futuras.`,
        });
      } else if (this.resolutionType() === 'negative_stock') {
        toast.success('Autorización Registrada', {
          description: `Venta autorizada con saldo negativo (${result?.resulting_stock ?? -1}). Solicitud de reposición despachada.`,
        });
      } else {
        toast.success('Prenda Sustituida', {
          description: msg,
        });
      }

      this.closeModal();
      await this.loadConflicts();
    } catch (err) {
      toast.error('Fallo en la resolución', {
        description: getErrorMessage(err, 'No fue posible aplicar la resolución seleccionada.'),
      });
    } finally {
      this.resolving.set(false);
    }
  }
}
