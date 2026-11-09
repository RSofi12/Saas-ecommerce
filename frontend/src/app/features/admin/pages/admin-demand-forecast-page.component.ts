import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideActivity,
  lucideAlertTriangle,
  lucideArrowRight,
  lucideBoxes,
  lucideCalendar,
  lucideCheckCircle2,
  lucideChevronDown,
  lucideDatabase,
  lucideInfo,
  lucideLayers,
  lucidePackage,
  lucideRefreshCw,
  lucideSearch,
  lucideSlidersHorizontal,
  lucideSparkles,
  lucideTrendingUp,
} from '@ng-icons/lucide';

import {
  DemandForecastRequest,
  DemandForecastResponse,
  DemandTrainRequest,
  DemandTrainResponse,
  LatestDemandModelResponse,
  SizeForecastDetail,
  StockReorderAlert,
} from '../../shared/models/demand-forecast.model';
import { DemandForecastApiService } from '../../shared/services/demand-forecast-api.service';
import { CatalogApiService } from '../../shared/services/catalog-api.service';
import { SessionService } from '../../shared/services/session.service';
import { CatalogBranch, CatalogProduct } from '../../shared/models/catalog.model';
import { getErrorMessage } from '../../../core/utils/http-error.util';

@Component({
  selector: 'app-admin-demand-forecast-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  providers: [
    provideIcons({
      lucideActivity,
      lucideAlertTriangle,
      lucideArrowRight,
      lucideBoxes,
      lucideCalendar,
      lucideCheckCircle2,
      lucideChevronDown,
      lucideDatabase,
      lucideInfo,
      lucideLayers,
      lucidePackage,
      lucideRefreshCw,
      lucideSearch,
      lucideSlidersHorizontal,
      lucideSparkles,
      lucideTrendingUp,
    }),
  ],
  templateUrl: './admin-demand-forecast-page.component.html',
  styleUrls: ['./admin-demand-forecast-page.component.css'],
})
export class AdminDemandForecastPageComponent implements OnInit {
  private readonly forecastApi = inject(DemandForecastApiService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly session = inject(SessionService);

  // Estados de navegación por pestañas
  protected readonly activeTab = signal<'forecast' | 'alerts' | 'training'>('forecast');

  // Estados de carga y feedback
  protected readonly isLoading = signal(false);
  protected readonly isForecasting = signal(false);
  protected readonly isTraining = signal(false);
  protected readonly isLoadingAlerts = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // Filtros y parámetros de inferencia
  protected readonly products = signal<CatalogProduct[]>([]);
  protected readonly branches = signal<CatalogBranch[]>([]);
  protected readonly selectedProductId = signal<string>('');
  protected readonly selectedBranchId = signal<string | null>(null);
  protected readonly weeksAhead = signal<number>(4);
  protected readonly productSearch = signal<string>('');

  // Parámetros de calibración/entrenamiento del modelo
  protected readonly nEstimators = signal<number>(60);
  protected readonly maxDepth = signal<number>(10);
  protected readonly useSynthetic = signal<boolean>(true);

  // Resultados reactivos
  protected readonly forecastResult = signal<DemandForecastResponse | null>(null);
  protected readonly stockAlerts = signal<StockReorderAlert[]>([]);
  protected readonly activeModel = signal<LatestDemandModelResponse | null>(null);

  // Filtro de productos para autocompletado/dropdown
  protected readonly filteredProducts = computed(() => {
    const q = this.productSearch().toLowerCase().trim();
    if (!q) return this.products();
    return this.products().filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)),
    );
  });

  // Prenda seleccionada
  protected readonly selectedProduct = computed(() => {
    const pid = this.selectedProductId();
    return this.products().find((p) => p.id === pid) ?? null;
  });

  // Alertas críticas (con urgencia ALTA)
  protected readonly highUrgencyCount = computed(() => {
    return this.stockAlerts().filter((a) => a.urgency === 'ALTA').length;
  });

  ngOnInit(): void {
    this.loadCatalogDependencies();
    this.loadActiveModel();
    this.loadStockAlerts();
  }

  protected setTab(tab: 'forecast' | 'alerts' | 'training'): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (tab === 'alerts' && this.stockAlerts().length === 0) {
      this.loadStockAlerts();
    }
    if (tab === 'training' && !this.activeModel()) {
      this.loadActiveModel();
    }
  }

  protected loadCatalogDependencies(): void {
    this.isLoading.set(true);

    this.catalogApi.listProducts().subscribe({
      next: (res) => {
        const items = res.data ?? [];
        this.products.set(items);
        if (items.length > 0 && !this.selectedProductId()) {
          this.selectedProductId.set(items[0].id);
          this.executeForecast();
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(getErrorMessage(err, 'Error al cargar el catálogo de prendas.'));
        this.isLoading.set(false);
      },
    });

    this.catalogApi.listPublicBranches().subscribe({
      next: (res) => {
        this.branches.set(res.data ?? []);
      },
      error: () => {},
    });
  }

  protected loadActiveModel(): void {
    this.forecastApi.getLatestModel().subscribe({
      next: (res) => {
        this.activeModel.set(res.data ?? null);
      },
      error: () => {},
    });
  }

  protected loadStockAlerts(): void {
    this.isLoadingAlerts.set(true);
    this.forecastApi.getStockAlerts(this.selectedBranchId()).subscribe({
      next: (res) => {
        this.stockAlerts.set(res.data ?? []);
        this.isLoadingAlerts.set(false);
      },
      error: (err) => {
        this.errorMessage.set(getErrorMessage(err, 'Error al consultar las alertas de stock.'));
        this.isLoadingAlerts.set(false);
      },
    });
  }

  protected onProductSelect(productId: string): void {
    this.selectedProductId.set(productId);
    this.executeForecast();
  }

  protected setWeeksAhead(weeks: number): void {
    this.weeksAhead.set(weeks);
    this.executeForecast();
  }

  protected executeForecast(): void {
    const pid = this.selectedProductId();
    if (!pid) return;

    this.isForecasting.set(true);
    this.errorMessage.set(null);

    const payload: DemandForecastRequest = {
      product_id: pid,
      branch_id: this.selectedBranchId() || null,
      weeks_ahead: this.weeksAhead(),
      confidence_level: 0.95,
    };

    this.forecastApi.forecastDemand(payload).subscribe({
      next: (res) => {
        this.forecastResult.set(res.data ?? null);
        this.isForecasting.set(false);
      },
      error: (err) => {
        this.errorMessage.set(getErrorMessage(err, 'Error al calcular la predicción de demanda.'));
        this.isForecasting.set(false);
      },
    });
  }

  protected trainModel(): void {
    this.isTraining.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload: DemandTrainRequest = {
      use_synthetic: this.useSynthetic(),
      n_estimators: this.nEstimators(),
      max_depth: this.maxDepth(),
      test_size: 0.20,
    };

    this.forecastApi.trainModel(payload).subscribe({
      next: (res) => {
        const data = res.data;
        if (data) {
          this.successMessage.set(
            `Modelo entrenado exitosamente con ${data.records_trained} registros. Coeficiente de determinación R² = ${(data.metrics.r2 * 100).toFixed(1)}%.`,
          );
          this.loadActiveModel();
          if (this.selectedProductId()) {
            this.executeForecast();
          }
        }
        this.isTraining.set(false);
      },
      error: (err) => {
        this.errorMessage.set(getErrorMessage(err, 'Error al entrenar el modelo de machine learning.'));
        this.isTraining.set(false);
      },
    });
  }

  // Helpers de visualización y estado
  protected getStockBadgeClass(status: string): string {
    switch (status) {
      case 'AGOTADO':
        return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900';
      case 'CRITICO':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900';
      case 'BAJO':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900';
      case 'OPTIMO':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900';
      case 'SOBRESTOCK':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900';
      default:
        return 'bg-stone-50 text-stone-700 dark:bg-stone-800 dark:text-stone-300';
    }
  }

  protected getUrgencyBadgeClass(urgency: string): string {
    switch (urgency) {
      case 'ALTA':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-semibold';
      case 'MEDIA':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
      default:
        return 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border border-stone-200 dark:border-stone-700';
    }
  }

  protected getMaxDemandValue(forecasts: SizeForecastDetail[]): number {
    if (!forecasts || forecasts.length === 0) return 20;
    const maxPred = Math.max(...forecasts.map((f) => f.total_predicted_units));
    const maxStock = Math.max(...forecasts.map((f) => f.current_stock));
    return Math.max(maxPred, maxStock, 15);
  }
}
