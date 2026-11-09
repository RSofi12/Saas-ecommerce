import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/models/api.model';
import {
  DemandForecastRequest,
  DemandForecastResponse,
  DemandTrainRequest,
  DemandTrainResponse,
  LatestDemandModelResponse,
  StockReorderAlert,
} from '../models/demand-forecast.model';

@Injectable({ providedIn: 'root' })
export class DemandForecastApiService {
  private readonly api = inject(ApiService);

  trainModel(payload: DemandTrainRequest): Observable<ApiResponse<DemandTrainResponse>> {
    return this.api.post<ApiResponse<DemandTrainResponse>>('/ml/demand/train', payload);
  }

  forecastDemand(payload: DemandForecastRequest): Observable<ApiResponse<DemandForecastResponse>> {
    return this.api.post<ApiResponse<DemandForecastResponse>>('/ml/demand/forecast', payload);
  }

  getStockAlerts(branchId?: string | null): Observable<ApiResponse<StockReorderAlert[]>> {
    const params = branchId ? { branch_id: branchId } : undefined;
    return this.api.get<ApiResponse<StockReorderAlert[]>>('/ml/demand/alerts', { params });
  }

  getLatestModel(): Observable<ApiResponse<LatestDemandModelResponse | null>> {
    return this.api.get<ApiResponse<LatestDemandModelResponse | null>>('/ml/demand/latest-model');
  }
}
