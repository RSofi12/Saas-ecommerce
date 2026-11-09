import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { toast } from '@spartan-ng/brain/sonner';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideActivity,
  lucideAlertTriangle,
  lucideArrowRight,
  lucideBarChart3,
  lucideBrainCircuit,
  lucideBuilding2,
  lucideCalendar,
  lucideCheckCircle2,
  lucideCircleDollarSign,
  lucideClock,
  lucideCrown,
  lucideDatabase,
  lucideDownload,
  lucideLayers,
  lucideRefreshCw,
  lucideScale,
  lucideShieldCheck,
  lucideSparkles,
  lucideTrendingUp,
  lucideUsers,
  lucideWifi,
  lucideWifiOff,
} from '@ng-icons/lucide';

import { HlmBadgeImports } from '../../../components/badge/src';
import { HlmButton } from '../../../components/button/src';
import { HlmCardImports } from '../../../components/card/src';
import { HlmInputImports } from '../../../components/input/src';
import { HlmSelectImports } from '../../../components/select/src';
import { OnBrowserDirective } from '@spartan-ng/helm/utils';
import { AreaChartComponent, BarChartComponent, DonutChartComponent } from 'angular-chrts';
import type { BulletLegendItemInterface } from '@unovis/ts';
import { getErrorMessage } from '../../../core/utils/http-error.util';
import { CatalogBranch } from '../../shared/models/catalog.model';
import {
  DashboardData,
  DashboardPeriod,
  DashboardQuery,
  OfflineSyncKpi,
  PolicyRevenueKpi,
  MachineLearningKpi,
  PlanQuotaKpi,
  RfmSegmentDistributionPoint,
} from '../../shared/models/dashboard.model';
import { CatalogApiService } from '../../shared/services/catalog-api.service';
import { DashboardApiService } from '../../shared/services/dashboard-api.service';
import { SessionService } from '../../shared/services/session.service';

type MovementTab = 'income' | 'outcome' | 'transfers';
export type DashboardViewMode = 'all' | 'finance' | 'offline' | 'ml';

@Component({
  selector: 'app-admin-home-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NgIcon,
    HlmButton,
    OnBrowserDirective,
    AreaChartComponent,
    BarChartComponent,
    DonutChartComponent,
    ...HlmBadgeImports,
    ...HlmCardImports,
    ...HlmInputImports,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({
      lucideActivity,
      lucideAlertTriangle,
      lucideArrowRight,
      lucideBarChart3,
      lucideBrainCircuit,
      lucideBuilding2,
      lucideCalendar,
      lucideCheckCircle2,
      lucideCircleDollarSign,
      lucideClock,
      lucideCrown,
      lucideDatabase,
      lucideDownload,
      lucideLayers,
      lucideRefreshCw,
      lucideScale,
      lucideShieldCheck,
      lucideSparkles,
      lucideTrendingUp,
      lucideUsers,
      lucideWifi,
      lucideWifiOff,
    }),
  ],
  templateUrl: './admin-home-page.component.html',
})
export class AdminHomePageComponent {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly dashboardApi = inject(DashboardApiService);
  protected readonly session = inject(SessionService);

  // View navigation tabs
  protected readonly viewMode = signal<DashboardViewMode>('all');

  protected readonly branches = signal<CatalogBranch[]>([]);
  protected readonly selectedBranchId = signal('');
  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');
  protected readonly period = signal<DashboardPeriod>('day');

  protected readonly activeMovementTab = signal<MovementTab>('income');
  protected readonly movementTabs: Array<{ key: MovementTab; label: string }> = [
    { key: 'income', label: 'Entradas' },
    { key: 'outcome', label: 'Salidas' },
    { key: 'transfers', label: 'Traspasos' },
  ];

  protected readonly loading = signal(false);
  protected readonly exporting = signal(false);

  protected readonly dashboard = signal<DashboardData>({
    filters: {},
    summary: {
      total_sales: '0.00',
      total_orders: 0,
      total_units_sold: 0,
      average_ticket: '0.00',
      total_stock: 0,
      total_available_stock: 0,
      low_stock_items: 0,
      total_reservations: 0,
      pending_reservations: 0,
      confirmed_reservations: 0,
      attended_reservations: 0,
      cancelled_reservations: 0,
    },
    sales_series: [],
    movement_series: [],
    movement_by_branch: [],
    branch_kpis: [],
    top_products: [],
    low_stock: [],
    offline_sync: {
      total_offline_sales: 0,
      total_offline_revenue: '0.00',
      synced_operations: 0,
      pending_operations: 0,
      failed_operations: 0,
      sync_success_rate: 100,
    },
    policy_revenue: {
      return_retention_total: '0.00',
      return_refund_total: '0.00',
      returns_count: 0,
      exchange_difference_total: '0.00',
      exchanges_count: 0,
    },
    ml_kpis: {
      has_ml_access: true,
      predicted_monthly_units: 0,
      rfm_segments_distribution: [],
      critical_stockout_alerts_count: 0,
      active_demand_model_version: 'v1.0 (RandomForest)',
      active_clustering_model_version: 'v1.0 (K-Means RFM)',
    },
    plan_quotas: {
      plan_name: 'Plan Profesional',
      plan_code: 'pro',
      active_branches: 1,
      max_branches: 10,
      quota_usage_percent: 10,
      has_ai_access: true,
    },
  });

  // Select labels helpers
  protected readonly branchSelectLabel = (branchId: string | null | undefined): string => {
    if (!branchId) return 'Todas las sucursales';
    const branch = this.branches().find((item) => item.id === branchId);
    return branch ? `${branch.name} - ${branch.city}` : branchId;
  };

  protected readonly periodSelectLabel = (p: DashboardPeriod | null | undefined): string =>
    ({ day: 'Día', week: 'Semana', month: 'Mes' }[p ?? 'day']);

  protected readonly branchLabel = computed(() => {
    const branchId = this.selectedBranchId();
    if (!branchId) return 'Todas las sucursales';
    return this.branches().find((branch) => branch.id === branchId)?.name ?? branchId;
  });

  // Deep modular getters for the new CU25 KPI blocks
  protected readonly offlineSync = computed<OfflineSyncKpi>(() => {
    return this.dashboard().offline_sync ?? {
      total_offline_sales: 0,
      total_offline_revenue: '0.00',
      synced_operations: 0,
      pending_operations: 0,
      failed_operations: 0,
      sync_success_rate: 100,
    };
  });

  protected readonly policyRevenue = computed<PolicyRevenueKpi>(() => {
    return this.dashboard().policy_revenue ?? {
      return_retention_total: '0.00',
      return_refund_total: '0.00',
      returns_count: 0,
      exchange_difference_total: '0.00',
      exchanges_count: 0,
    };
  });

  protected readonly mlKpis = computed<MachineLearningKpi>(() => {
    return this.dashboard().ml_kpis ?? {
      has_ml_access: true,
      predicted_monthly_units: 0,
      rfm_segments_distribution: [],
      critical_stockout_alerts_count: 0,
    };
  });

  protected readonly planQuotas = computed<PlanQuotaKpi>(() => {
    return this.dashboard().plan_quotas ?? {
      plan_name: 'Plan Profesional',
      plan_code: 'pro',
      active_branches: 1,
      max_branches: 10,
      quota_usage_percent: 10,
      has_ai_access: true,
    };
  });

  // Total net income protected by commercial policies (P1 + P2)
  protected readonly netPolicyGain = computed<number>(() => {
    const ret = Number(this.policyRevenue().return_retention_total || 0);
    const diff = Number(this.policyRevenue().exchange_difference_total || 0);
    return Number((ret + diff).toFixed(2));
  });

  // Charts data
  protected readonly salesCategories: Record<string, BulletLegendItemInterface> = {
    sales: { name: 'Ventas (Bs)', color: '#0284c7' },
  };

  protected readonly salesChartData = computed(() =>
    this.dashboard().sales_series.map((point) => ({
      ...point,
      sales: Number(point.sales || 0),
    }))
  );

  protected readonly topProductsChartData = computed(() =>
    this.dashboard().top_products.map((product) => ({
      label: product.product_name,
      sales: Number(product.total_sales || 0),
    }))
  );

  protected readonly branchPerformanceChartData = computed(() =>
    this.dashboard().branch_kpis.map((branch) => ({
      label: branch.branch_name,
      sales: Number(branch.total_sales || 0),
    }))
  );

  protected readonly movementDistribution = computed(() => {
    const totals = new Map<string, { name: string; value: number }>();
    for (const point of this.dashboard().movement_by_branch) {
      const tab = this.activeMovementTab();
      const rawValue =
        tab === 'transfers'
          ? Number(point.transfer_in || 0) + Number(point.transfer_out || 0)
          : Number(point[tab] || 0);
      const value = Number.isFinite(rawValue) ? Math.max(rawValue, 0) : 0;
      const key = point.branch_id || point.branch_name;
      if (!key || value === 0) continue;
      const current = totals.get(key);
      if (current) current.value += value;
      else totals.set(key, { name: point.branch_name || key, value });
    }
    return [...totals.entries()].map(([key, item]) => ({ key, ...item }));
  });

  protected readonly movementDonutData = computed(() =>
    this.movementDistribution().map((item) => item.value)
  );

  protected readonly movementDonutCategories = computed<Record<string, BulletLegendItemInterface>>(() =>
    Object.fromEntries(
      this.movementDistribution().map((item, index) => [
        item.key,
        {
          name: item.name,
          color: ['#0284c7', '#0d9488', '#e11d48', '#8b5cf6', '#d97706'][index % 5],
        },
      ])
    )
  );

  // Dynamic visual helper for RFM clusters
  protected readonly segmentMeta = (label: string): { badgeClass: string; barColor: string; description: string } => {
    const l = label.toLowerCase();
    if (l.includes('vip') || l.includes('embajador')) {
      return {
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        barColor: 'bg-amber-500',
        description: 'Máxima frecuencia y recurrencia. Trato preferencial.',
      };
    }
    if (l.includes('temporada')) {
      return {
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        barColor: 'bg-sky-500',
        description: 'Compras en colecciones de invierno / verano.',
      };
    }
    if (l.includes('oferta') || l.includes('descuento')) {
      return {
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        barColor: 'bg-emerald-500',
        description: 'Sensibles a promociones y liquidaciones de catálogo.',
      };
    }
    if (l.includes('retorno') || l.includes('devolucion')) {
      return {
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        barColor: 'bg-rose-500',
        description: 'Alta tasa de cambios / devoluciones. Asistir en tallaje.',
      };
    }
    return {
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
      barColor: 'bg-slate-600',
      description: 'Clientes estándar de la boutique.',
    };
  };

  constructor() {
    void this.loadData();
  }

  protected setViewMode(mode: DashboardViewMode): void {
    this.viewMode.set(mode);
  }

  protected async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      await this.loadDashboard();
      toast.success('Dashboard ejecutivo actualizado en tiempo real.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async applyFilters(): Promise<void> {
    this.loading.set(true);
    try {
      await this.loadDashboard();
      toast.success('Filtros aplicados.');
    } finally {
      this.loading.set(false);
    }
  }

  protected onBranchChange(value: string | null | undefined): void {
    this.selectedBranchId.set(value ?? '');
  }

  protected setActiveMovementTab(tab: MovementTab): void {
    this.activeMovementTab.set(tab);
  }

  protected onPeriodChange(value: DashboardPeriod | null | undefined): void {
    if (value === 'day' || value === 'week' || value === 'month') {
      this.period.set(value);
    }
  }

  protected onFromDateChange(event: Event): void {
    this.fromDate.set((event.target as HTMLInputElement).value);
  }

  protected onToDateChange(event: Event): void {
    this.toDate.set((event.target as HTMLInputElement).value);
  }

  // Export structured summary to CSV
  protected exportExecutiveReport(): void {
    this.exporting.set(true);
    try {
      const summary = this.dashboard().summary;
      const offline = this.offlineSync();
      const policy = this.policyRevenue();
      const ml = this.mlKpis();
      const quota = this.planQuotas();

      const csvRows = [
        ['REPORTE EJECUTIVO - FASHIONSTORE SAAS MULTITENANT'],
        ['Fecha de Emisión', new Date().toLocaleString('es-BO')],
        ['Sucursal', this.branchLabel()],
        ['Periodo', this.periodSelectLabel(this.period())],
        [],
        ['--- 1. VENTAS & INGRESOS GLOBALES ---'],
        ['Ventas Totales (Bs)', summary.total_sales],
        ['Ordenes Totales', summary.total_orders],
        ['Unidades Vendidas', summary.total_units_sold],
        ['Ticket Promedio (Bs)', summary.average_ticket],
        [],
        ['--- 2. CONCILIACION OFFLINE (CU13/CU15) ---'],
        ['Total Ventas Offline', offline.total_offline_sales],
        ['Monto en Gaveta Offline (Bs)', offline.total_offline_revenue],
        ['Operaciones Sincronizadas', offline.synced_operations],
        ['Operaciones Pendientes', offline.pending_operations],
        ['Tasa de Exito Sync (%)', `${offline.sync_success_rate}%`],
        [],
        ['--- 3. INGRESOS POR POLITICAS COMERCIALES (P1/P2) ---'],
        ['Retenciones por Devolucion (20-50%) (Bs)', policy.return_retention_total],
        ['Devoluciones Realizadas', policy.returns_count],
        ['Diferencias por Cambio de Prenda Cobradas (Bs)', policy.exchange_difference_total],
        ['Cambios de Prenda Realizados', policy.exchanges_count],
        ['Beneficio Neto por Politicas (Bs)', this.netPolicyGain().toFixed(2)],
        [],
        ['--- 4. INTELIGENCIA PREDICTIVA ML (CU23/CU24) ---'],
        ['Acceso a Modulo ML', ml.has_ml_access ? 'HABILITADO' : 'NO DISPONIBLE'],
        ['Demanda Proyectada Mes (Prendas)', ml.predicted_monthly_units],
        ['Alertas Criticas de Quiebre Prevenidas', ml.critical_stockout_alerts_count],
        [],
        ['--- 5. GOBERNANZA SAAS Y CUOTAS (CU02/CU04) ---'],
        ['Plan Suscrito', quota.plan_name],
        ['Sucursales Activas', quota.active_branches],
        ['Limite de Sucursales', quota.max_branches],
        ['Uso de Capacidad (%)', `${quota.quota_usage_percent}%`],
      ];

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `Dashboard_Ejecutivo_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Reporte ejecutivo CSV exportado exitosamente.');
    } catch {
      toast.error('Ocurrió un error al exportar el reporte.');
    } finally {
      this.exporting.set(false);
    }
  }

  private async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const branchesResponse = await firstValueFrom(this.catalogApi.listPublicBranches());
      this.branches.set(branchesResponse.data ?? []);

      if (!this.selectedBranchId()) {
        const defaultBranch =
          this.branches().find((branch) => branch.is_default) ?? this.branches()[0] ?? null;
        this.selectedBranchId.set(defaultBranch?.id ?? '');
      }

      await this.loadDashboard();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo cargar el dashboard.'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDashboard(): Promise<void> {
    try {
      const response = await firstValueFrom(this.dashboardApi.getDashboard(this.filters()));
      if (response.data) {
        this.dashboard.set(response.data);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo cargar el dashboard ejecutivo.'));
    }
  }

  private filters(): DashboardQuery {
    return {
      branch_id: this.selectedBranchId() || null,
      from_date: this.fromDate() || null,
      to_date: this.toDate() || null,
      period: this.period(),
    };
  }
}
