import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/models/api.model';
import {
  SyntheticDatasetGenerateRequest,
  SyntheticDatasetSummary,
  LatestDatasetResponse,
} from '../models/synthetic-dataset.model';

@Injectable({ providedIn: 'root' })
export class SyntheticDatasetApiService {
  private readonly api = inject(ApiService);

  generateDataset(payload: SyntheticDatasetGenerateRequest): Observable<ApiResponse<SyntheticDatasetSummary>> {
    return this.api.post<ApiResponse<SyntheticDatasetSummary>>('/ml/synthetic-dataset/generate', payload);
  }

  getLatestDataset(): Observable<ApiResponse<LatestDatasetResponse | null>> {
    return this.api.get<ApiResponse<LatestDatasetResponse | null>>('/ml/synthetic-dataset/latest');
  }

  downloadDataset(datasetId: string): Observable<Blob> {
    return this.api.get<Blob>(`/ml/synthetic-dataset/${datasetId}/download`, {
      responseType: 'blob' as const,
    });
  }

  downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
