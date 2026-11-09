import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertTriangle,
  lucideCalendar,
  lucideCheckCircle2,
  lucideDatabase,
  lucideDownload,
  lucideLayers,
  lucideRefreshCw,
  lucideSlidersHorizontal,
  lucideSparkles,
  lucideTrendingUp,
} from '@ng-icons/lucide';

import {
  SyntheticDatasetGenerateRequest,
  SyntheticDatasetSummary,
  LatestDatasetResponse,
} from '../../shared/models/synthetic-dataset.model';
import { SyntheticDatasetApiService } from '../../shared/services/synthetic-dataset-api.service';
import { SessionService } from '../../shared/services/session.service';

@Component({
  selector: 'app-admin-ml-dataset-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  providers: [
    provideIcons({
      lucideAlertTriangle,
      lucideCalendar,
      lucideCheckCircle2,
      lucideDatabase,
      lucideDownload,
      lucideLayers,
      lucideRefreshCw,
      lucideSlidersHorizontal,
      lucideSparkles,
      lucideTrendingUp,
    }),
  ],
  templateUrl: './admin-ml-dataset-page.component.html',
  styleUrls: ['./admin-ml-dataset-page.component.css'],
})
export class AdminMlDatasetPageComponent implements OnInit {
  private readonly datasetApi = inject(SyntheticDatasetApiService);
  private readonly session = inject(SessionService);

  // Estados de interfaz y carga
  protected readonly isGenerating = signal(false);
  protected readonly isLoadingLatest = signal(true);
  protected readonly isDownloading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // Parámetros reactivos del formulario
  protected totalRecords = signal<number>(10000);
  protected monthsCovered = signal<number>(12);
  protected includeReturns = signal<boolean>(true);
  protected includeExchanges = signal<boolean>(true);
  protected useRandomSeed = signal<boolean>(true);
  protected randomSeed = signal<number>(42);

  // Dataset actual o último generado
  protected readonly currentDataset = signal<SyntheticDatasetSummary | LatestDatasetResponse | null>(null);

  // Cálculo de porcentajes para gráfico de distribución de tallas
  protected readonly sizeDistributionList = computed(() => {
    const ds = this.currentDataset();
    if (!ds || !ds.sizes_distribution) return [];

    const total = ds.total_records || 1;
    const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    
    return order.map((sizeKey) => {
      const count = ds.sizes_distribution[sizeKey] || 0;
      const pct = Math.round((count / total) * 100);
      return {
        size: sizeKey,
        count,
        percentage: pct,
        isPredominant: sizeKey === 'M' || sizeKey === 'L',
      };
    });
  });

  // Datos de estacionalidad
  protected readonly seasonalFactors = computed(() => {
    const ds = this.currentDataset();
    if (!ds || !ds.seasonal_factors) return null;
    return ds.seasonal_factors;
  });

  protected readonly coldSeasonRecords = computed(() => {
    const sf = this.seasonalFactors();
    return sf ? sf['cold_season_records'] || 0 : 0;
  });

  protected readonly warmSeasonRecords = computed(() => {
    const sf = this.seasonalFactors();
    return sf ? sf['warm_season_records'] || 0 : 0;
  });

  ngOnInit(): void {
    this.loadLatestDataset();
  }

  // Carga inicial del último dataset persistido para este tenant
  protected loadLatestDataset(): void {
    this.isLoadingLatest.set(true);
    this.errorMessage.set(null);

    this.datasetApi.getLatestDataset().subscribe({
      next: (res) => {
        this.isLoadingLatest.set(false);
        if (res.data) {
          this.currentDataset.set(res.data);
        }
      },
      error: (err) => {
        this.isLoadingLatest.set(false);
        if (err.status === 403) {
          this.errorMessage.set(
            'El módulo de Machine Learning requiere una suscripción activa a Plan Profesional o Empresarial. Su tenant actual no tiene acceso de IA habilitado.'
          );
        }
      },
    });
  }

  // Preajustes rápidos de volumen de datos
  protected setRecordsPreset(n: number): void {
    this.totalRecords.set(n);
  }

  // Preajustes rápidos de meses históricos
  protected setMonthsPreset(m: number): void {
    this.monthsCovered.set(m);
  }

  // Generación estocástica invocando al backend
  protected onGenerateDataset(): void {
    this.isGenerating.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload: SyntheticDatasetGenerateRequest = {
      total_records: Number(this.totalRecords()),
      months_covered: Number(this.monthsCovered()),
      include_returns: this.includeReturns(),
      include_exchanges: this.includeExchanges(),
      random_seed: this.useRandomSeed() ? Number(this.randomSeed()) : null,
    };

    this.datasetApi.generateDataset(payload).subscribe({
      next: (res) => {
        this.isGenerating.set(false);
        if (res.data) {
          this.currentDataset.set(res.data);
          this.successMessage.set(
            `¡Dataset de ${res.data.total_records.toLocaleString()} transacciones generado con éxito en el servidor!`
          );
        }
      },
      error: (err) => {
        this.isGenerating.set(false);
        const detail =
          err?.error?.message ||
          err?.error?.detail ||
          'Ocurrió un error al procesar la simulación estocástica.';
        this.errorMessage.set(detail);
      },
    });
  }

  // Descarga del CSV en streaming
  protected onDownloadCsv(): void {
    const ds = this.currentDataset();
    if (!ds) return;

    this.isDownloading.set(true);
    this.datasetApi.downloadDataset(ds.dataset_id).subscribe({
      next: (blob) => {
        this.isDownloading.set(false);
        this.datasetApi.downloadBlob(blob, ds.file_name);
      },
      error: () => {
        this.isDownloading.set(false);
        this.errorMessage.set('No se pudo descargar el archivo CSV desde el servidor.');
      },
    });
  }
}
