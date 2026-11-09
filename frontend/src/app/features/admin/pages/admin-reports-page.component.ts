import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toast } from '@spartan-ng/brain/sonner';

import { HlmBadgeImports } from '../../../components/badge/src';
import { HlmButton } from '../../../components/button/src';
import { HlmCardImports } from '../../../components/card/src';
import { getErrorMessage } from '../../../core/utils/http-error.util';
import { CatalogBranch } from '../../shared/models/catalog.model';
import {
  INVENTORY_REPORT_COLUMNS,
  InventoryReportRow,
  MOVEMENTS_REPORT_COLUMNS,
  MovementReportRow,
  ReportColumnDef,
  ReportExportFormat,
  ReportQuery,
  ReportSummary,
  ReportType,
  SALES_REPORT_COLUMNS,
  SalesReportRow,
} from '../../shared/models/report.model';
import { CatalogApiService } from '../../shared/services/catalog-api.service';
import { ReportsApiService } from '../../shared/services/reports-api.service';
import { SessionService } from '../../shared/services/session.service';
import { VoiceAssistantModalComponent } from '../components/voice-assistant-modal.component';

@Component({
  selector: 'app-admin-reports-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HlmButton,
    HlmCardImports,
    HlmBadgeImports,
    VoiceAssistantModalComponent,
  ],
  templateUrl: './admin-reports-page.component.html',
})
export class AdminReportsPageComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly session = inject(SessionService);

  readonly showVoiceAssistant = signal<boolean>(false);
  readonly activeTab = signal<ReportType>('sales');
  readonly loading = signal<boolean>(false);
  readonly exporting = signal<boolean>(false);
  readonly exportingFormat = signal<ReportExportFormat | null>(null);

  // Filters
  readonly branchId = signal<string>('');
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly searchTerm = signal<string>('');
  readonly datePreset = signal<'today' | 'last7days' | 'thisMonth' | 'all'>('all');

  // Column Selector state
  readonly showColumnSelector = signal<boolean>(false);
  readonly selectedColumnsMap = signal<Record<ReportType, string[]>>({
    sales: SALES_REPORT_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.key),
    inventory: INVENTORY_REPORT_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.key),
    movements: MOVEMENTS_REPORT_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.key),
  });

  // Data
  readonly branches = signal<CatalogBranch[]>([]);
  readonly summary = signal<ReportSummary | null>(null);
  readonly salesRows = signal<SalesReportRow[]>([]);
  readonly inventoryRows = signal<InventoryReportRow[]>([]);
  readonly movementsRows = signal<MovementReportRow[]>([]);

  readonly isAdmin = computed(() => this.session.userRole() === 'administrador');
  readonly isEncargado = computed(() => this.session.userRole() === 'encargado');

  readonly currentColumnsDef = computed<ReportColumnDef[]>(() => {
    switch (this.activeTab()) {
      case 'sales':
        return SALES_REPORT_COLUMNS;
      case 'inventory':
        return INVENTORY_REPORT_COLUMNS;
      case 'movements':
        return MOVEMENTS_REPORT_COLUMNS;
    }
  });

  readonly currentSelectedColumns = computed<string[]>(() => {
    return this.selectedColumnsMap()[this.activeTab()] || [];
  });

  readonly filteredSalesRows = computed<SalesReportRow[]>(() => {
    const q = this.searchTerm().toLowerCase().trim();
    if (!q) return this.salesRows();
    return this.salesRows().filter(
      (r) =>
        r.product_name?.toLowerCase().includes(q) ||
        r.variant_sku?.toLowerCase().includes(q) ||
        r.branch_name?.toLowerCase().includes(q) ||
        r.payment_method?.toLowerCase().includes(q),
    );
  });

  readonly filteredInventoryRows = computed<InventoryReportRow[]>(() => {
    const q = this.searchTerm().toLowerCase().trim();
    if (!q) return this.inventoryRows();
    return this.inventoryRows().filter(
      (r) =>
        r.product_name?.toLowerCase().includes(q) ||
        r.variant_sku?.toLowerCase().includes(q) ||
        r.branch_name?.toLowerCase().includes(q),
    );
  });

  readonly filteredMovementsRows = computed<MovementReportRow[]>(() => {
    const q = this.searchTerm().toLowerCase().trim();
    if (!q) return this.movementsRows();
    return this.movementsRows().filter(
      (r) =>
        r.product_name?.toLowerCase().includes(q) ||
        r.variant_sku?.toLowerCase().includes(q) ||
        r.branch_name?.toLowerCase().includes(q) ||
        r.movement_type?.toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    if (this.isEncargado()) {
      const userBranch = this.session.user()?.branch_id;
      if (userBranch) {
        this.branchId.set(userBranch);
      }
    }
    this.loadBranches();
    this.fetchReport();
  }

  loadBranches(): void {
    this.catalogApi.listPublicBranches().subscribe({
      next: (res) => {
        if (res.data) {
          this.branches.set(res.data);
        }
      },
      error: () => {
        // silently fallback
      },
    });
  }

  setTab(tab: ReportType): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.searchTerm.set('');
    this.fetchReport();
  }

  toggleColumn(key: string): void {
    const tab = this.activeTab();
    const current = [...this.selectedColumnsMap()[tab]];
    const idx = current.indexOf(key);
    if (idx >= 0) {
      if (current.length === 1) {
        toast.warning('Debe mantener al menos una columna visible');
        return;
      }
      current.splice(idx, 1);
    } else {
      current.push(key);
    }
    this.selectedColumnsMap.update((map) => ({ ...map, [tab]: current }));
  }

  selectAllColumns(): void {
    const tab = this.activeTab();
    const all = this.currentColumnsDef().map((c) => c.key);
    this.selectedColumnsMap.update((map) => ({ ...map, [tab]: all }));
  }

  resetDefaultColumns(): void {
    const tab = this.activeTab();
    const defaults = this.currentColumnsDef().filter((c) => c.defaultSelected).map((c) => c.key);
    this.selectedColumnsMap.update((map) => ({ ...map, [tab]: defaults }));
  }

  isColumnVisible(key: string): boolean {
    return this.currentSelectedColumns().includes(key);
  }

  setQuickDate(preset: 'today' | 'last7days' | 'thisMonth' | 'all'): void {
    this.datePreset.set(preset);
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (preset === 'today') {
      this.fromDate.set(todayStr);
      this.toDate.set(todayStr);
    } else if (preset === 'last7days') {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 7);
      const pastMm = String(past7.getMonth() + 1).padStart(2, '0');
      const pastDd = String(past7.getDate()).padStart(2, '0');
      this.fromDate.set(`${past7.getFullYear()}-${pastMm}-${pastDd}`);
      this.toDate.set(todayStr);
    } else if (preset === 'thisMonth') {
      this.fromDate.set(`${yyyy}-${mm}-01`);
      this.toDate.set(todayStr);
    } else {
      this.fromDate.set('');
      this.toDate.set('');
    }
    this.fetchReport();
  }

  onFilterChange(): void {
    this.datePreset.set('all');
    this.fetchReport();
  }

  fetchReport(): void {
    this.loading.set(true);
    const query: ReportQuery = {
      branch_id: this.branchId() || null,
      from_date: this.fromDate() || null,
      to_date: this.toDate() || null,
      q: this.searchTerm() || null,
    };

    const tab = this.activeTab();
    if (tab === 'sales') {
      this.reportsApi.getSalesReport(query).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.data) {
            this.summary.set(res.data.summary);
            this.salesRows.set(res.data.rows);
          }
        },
        error: (err) => {
          this.loading.set(false);
          toast.error(getErrorMessage(err, 'Error al cargar reporte de ventas'));
        },
      });
    } else if (tab === 'inventory') {
      this.reportsApi.getInventoryReport(query).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.data) {
            this.summary.set(res.data.summary);
            this.inventoryRows.set(res.data.rows);
          }
        },
        error: (err) => {
          this.loading.set(false);
          toast.error(getErrorMessage(err, 'Error al cargar reporte de inventario'));
        },
      });
    } else {
      this.reportsApi.getMovementsReport(query).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.data) {
            this.summary.set(res.data.summary);
            this.movementsRows.set(res.data.rows);
          }
        },
        error: (err) => {
          this.loading.set(false);
          toast.error(getErrorMessage(err, 'Error al cargar reporte de movimientos'));
        },
      });
    }
  }

  exportReport(format: ReportExportFormat): void {
    this.exporting.set(true);
    this.exportingFormat.set(format);

    const tab = this.activeTab();
    const query: ReportQuery = {
      branch_id: this.branchId() || null,
      from_date: this.fromDate() || null,
      to_date: this.toDate() || null,
      q: this.searchTerm() || null,
    };

    const selectedCols = this.currentSelectedColumns();
    const extension = format === 'excel' ? 'xlsx' : format;
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `reporte-${tab}-${dateStamp}.${extension}`;

    toast.info(`Generando archivo ${format.toUpperCase()}...`);

    this.reportsApi.exportReport(tab, format, query, selectedCols).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        this.exportingFormat.set(null);
        this.reportsApi.downloadBlob(blob, filename);
        toast.success(`Reporte ${filename} descargado exitosamente`);
      },
      error: (err) => {
        this.exporting.set(false);
        this.exportingFormat.set(null);
        toast.error(getErrorMessage(err, `Error al exportar reporte a ${format.toUpperCase()}`));
      },
    });
  }

  formatMovementType(type: string): string {
    const map: Record<string, string> = {
      income: 'Ingreso (+)',
      outcome: 'Salida (-)',
      transfer_in: 'Traslado Entrada (+)',
      transfer_out: 'Traslado Salida (-)',
    };
    return map[type] || type;
  }

  openVoiceAssistant(): void {
    this.showVoiceAssistant.set(true);
  }

  closeVoiceAssistant(): void {
    this.showVoiceAssistant.set(false);
  }
}
