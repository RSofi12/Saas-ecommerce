import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertTriangle,
  lucideArrowRight,
  lucideCalendar,
  lucideCheckCircle2,
  lucideChevronLeft,
  lucideChevronRight,
  lucideCrown,
  lucideDatabase,
  lucideFilter,
  lucideInfo,
  lucideRefreshCw,
  lucideSearch,
  lucideSlidersHorizontal,
  lucideSparkles,
  lucideTag,
  lucideTrendingUp,
  lucideUsers,
} from '@ng-icons/lucide';

import {
  ClusterProfileSummary,
  CustomerSegmentItem,
  ScatterPoint,
  SegmentationStatusData,
  SegmentationTrainResponse,
} from '../../shared/models/customer-segmentation.model';
import { CustomerSegmentationApiService } from '../../shared/services/customer-segmentation-api.service';
import { SessionService } from '../../shared/services/session.service';

interface SvgPoint extends ScatterPoint {
  svgX: number;
  svgY: number;
}

@Component({
  selector: 'app-admin-ml-segmentation-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  providers: [
    provideIcons({
      lucideAlertTriangle,
      lucideArrowRight,
      lucideCalendar,
      lucideCheckCircle2,
      lucideChevronLeft,
      lucideChevronRight,
      lucideCrown,
      lucideDatabase,
      lucideFilter,
      lucideInfo,
      lucideRefreshCw,
      lucideSearch,
      lucideSlidersHorizontal,
      lucideSparkles,
      lucideTag,
      lucideTrendingUp,
      lucideUsers,
    }),
  ],
  templateUrl: './admin-ml-segmentation-page.component.html',
  styleUrls: ['./admin-ml-segmentation-page.component.css'],
})
export class AdminMlSegmentationPageComponent implements OnInit {
  private readonly segmentationApi = inject(CustomerSegmentationApiService);
  protected readonly session = inject(SessionService);

  // Estados reactivos principales
  protected readonly isLoading = signal<boolean>(true);
  protected readonly isTraining = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly statusData = signal<SegmentationStatusData | null>(null);
  protected readonly trainResponse = signal<SegmentationTrainResponse | null>(null);
  protected readonly rawPoints = signal<ScatterPoint[]>([]);

  // Filtros de navegación y drill-down
  protected readonly selectedClusterId = signal<number | null>(null);
  protected readonly customerSearch = signal<string>('');
  protected readonly customersList = signal<CustomerSegmentItem[]>([]);
  protected readonly totalCustomers = signal<number>(0);
  protected readonly currentPage = signal<number>(1);
  protected readonly pageSize = 15;

  // Parámetros de calibración K-Means
  protected kClusters = 4;
  protected useSyntheticFallback = true;
  protected randomState = 42;

  // Tooltip interactivo del gráfico de dispersión
  protected readonly hoveredPoint = signal<ScatterPoint | null>(null);
  protected tooltipX = 0;
  protected tooltipY = 0;

  // Dimensiones del canvas SVG
  protected readonly svgWidth = 600;
  protected readonly svgHeight = 320;
  private readonly padding = { top: 25, right: 30, bottom: 45, left: 60 };

  // Computeds
  protected readonly hasActiveModel = computed(() => {
    return Boolean(
      this.trainResponse() ||
      (this.statusData()?.has_trained_model && this.statusData()?.model)
    );
  });

  protected readonly activeProfiles = computed<ClusterProfileSummary[]>(() => {
    if (this.trainResponse()?.clusters?.length) {
      return this.trainResponse()!.clusters;
    }
    return this.statusData()?.model?.metrics?.profiles ?? [];
  });

  protected readonly silhouetteScore = computed<number>(() => {
    if (this.trainResponse()) {
      return this.trainResponse()!.silhouette_score;
    }
    return this.statusData()?.model?.metrics?.silhouette_score ?? 0.50;
  });

  protected readonly inertiaValue = computed<number>(() => {
    if (this.trainResponse()) {
      return this.trainResponse()!.inertia;
    }
    return this.statusData()?.model?.metrics?.inertia ?? 0;
  });

  protected readonly analyzedCount = computed<number>(() => {
    if (this.trainResponse()) {
      return this.trainResponse()!.total_customers_analyzed;
    }
    return this.statusData()?.model?.metrics?.total_customers ?? 0;
  });

  protected readonly dataSourceLabel = computed<string>(() => {
    const src = this.trainResponse()?.data_source ?? this.statusData()?.model?.metrics?.data_source;
    if (src === 'REAL_TRANSACTIONS') return 'Transacciones Reales';
    if (src === 'SYNTHETIC_DATASET_CU22') return 'Dataset Sintético (CU22)';
    return 'Calibración Analítica';
  });

  // Mapeo de puntos proyectados a coordenadas SVG
  protected readonly projectedSvgPoints = computed<SvgPoint[]>(() => {
    const points = this.rawPoints();
    if (!points.length) return [];

    let maxF = 1;
    let maxM = 100;
    for (const p of points) {
      if (p.frequency_count > maxF) maxF = p.frequency_count;
      if (p.monetary_total > maxM) maxM = p.monetary_total;
    }

    // Agregar un 10% de margen superior para legibilidad
    maxF = Math.ceil(maxF * 1.1) || 10;
    maxM = Math.ceil(maxM * 1.1) || 1000;

    const plotW = this.svgWidth - this.padding.left - this.padding.right;
    const plotH = this.svgHeight - this.padding.top - this.padding.bottom;

    return points.map((p) => {
      const svgX = this.padding.left + (p.frequency_count / maxF) * plotW;
      const svgY = this.padding.top + plotH - (p.monetary_total / maxM) * plotH;
      return {
        ...p,
        svgX: Math.round(svgX * 10) / 10,
        svgY: Math.round(svgY * 10) / 10,
      };
    });
  });

  // Ticks para los ejes de la gráfica
  protected readonly xTicks = computed(() => {
    let maxF = 1;
    for (const p of this.rawPoints()) {
      if (p.frequency_count > maxF) maxF = p.frequency_count;
    }
    maxF = Math.ceil(maxF * 1.1) || 10;
    const plotW = this.svgWidth - this.padding.left - this.padding.right;
    const step = Math.max(1, Math.round(maxF / 4));
    const ticks = [];
    for (let f = 0; f <= maxF; f += step) {
      const x = this.padding.left + (f / maxF) * plotW;
      ticks.push({ val: f, x });
    }
    return ticks;
  });

  protected readonly yTicks = computed(() => {
    let maxM = 100;
    for (const p of this.rawPoints()) {
      if (p.monetary_total > maxM) maxM = p.monetary_total;
    }
    maxM = Math.ceil(maxM * 1.1) || 1000;
    const plotH = this.svgHeight - this.padding.top - this.padding.bottom;
    const step = Math.round(maxM / 4);
    const ticks = [];
    for (let m = 0; m <= maxM; m += step) {
      const y = this.padding.top + plotH - (m / maxM) * plotH;
      ticks.push({ val: m >= 1000 ? `${(m / 1000).toFixed(1)}k` : `${m}`, y });
    }
    return ticks;
  });

  // Filtrado reactivo de clientes para la tabla
  protected readonly filteredCustomers = computed(() => {
    const list = this.customersList();
    const query = this.customerSearch().toLowerCase().trim();
    if (!query) return list;
    return list.filter(
      (c) =>
        c.customer_name?.toLowerCase().includes(query) ||
        c.customer_email?.toLowerCase().includes(query) ||
        c.segment_label?.toLowerCase().includes(query),
    );
  });

  ngOnInit(): void {
    this.loadInitialData();
  }

  protected loadInitialData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.segmentationApi.getStatus().subscribe({
      next: (res) => {
        if (res.data) {
          this.statusData.set(res.data);
          if (res.data.has_trained_model) {
            this.loadScatterAndCustomers();
          } else {
            this.isLoading.set(false);
          }
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 403) {
          this.errorMessage.set(
            'El módulo de Machine Learning (K-Means) requiere una suscripción activa a Plan Profesional o Empresarial.',
          );
        }
      },
    });
  }

  protected loadScatterAndCustomers(): void {
    this.segmentationApi.getScatterPoints(250).subscribe({
      next: (res) => {
        if (res.data?.points) {
          this.rawPoints.set(res.data.points);
        }
        this.loadCustomersPage(1);
      },
      error: () => {
        this.loadCustomersPage(1);
      },
    });
  }

  protected loadCustomersPage(page: number): void {
    this.currentPage.set(page);
    const clusterId = this.selectedClusterId() ?? undefined;
    this.segmentationApi.getCustomers(clusterId, page, this.pageSize).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.data) {
          this.customersList.set(res.data.customers);
          this.totalCustomers.set(res.data.total);
        }
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  protected handleTrainSegmentation(): void {
    if (this.isTraining()) return;

    this.isTraining.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.segmentationApi
      .trainSegmentation({
        k_clusters: this.kClusters,
        use_synthetic_fallback: this.useSyntheticFallback,
        random_state: this.randomState,
      })
      .subscribe({
        next: (res) => {
          this.isTraining.set(false);
          if (res.data) {
            this.trainResponse.set(res.data);
            this.successMessage.set(
              `Segmentación K-Means ejecutada con éxito. ${res.data.total_customers_analyzed} clientes agrupados en ${res.data.k_clusters} perfiles conductuales.`,
            );
            this.loadScatterAndCustomers();
          }
        },
        error: (err) => {
          this.isTraining.set(false);
          const detail =
            err.error?.detail ||
            err.error?.message ||
            'Error al ejecutar la segmentación K-Means. Verifique la conexión con el servidor.';
          this.errorMessage.set(detail);
        },
      });
  }

  protected selectCluster(clusterId: number | null): void {
    this.selectedClusterId.set(clusterId);
    this.loadCustomersPage(1);
  }

  protected onPointHover(pt: ScatterPoint | null, event?: MouseEvent): void {
    this.hoveredPoint.set(pt);
    if (pt && event) {
      const containerRect = (event.target as SVGElement).closest('svg')?.getBoundingClientRect();
      if (containerRect) {
        this.tooltipX = event.clientX - containerRect.left + 12;
        this.tooltipY = event.clientY - containerRect.top - 20;
      }
    }
  }

  protected getBadgeColorClass(color: string): string {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'blue':
        return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      case 'amber':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'rose':
        return 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      default:
        return 'bg-muted text-foreground border-border';
    }
  }

  protected getBadgeDotClass(color: string): string {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500';
      case 'blue':
        return 'bg-blue-500';
      case 'amber':
        return 'bg-amber-500';
      case 'rose':
        return 'bg-rose-500';
      default:
        return 'bg-gray-400';
    }
  }
}
