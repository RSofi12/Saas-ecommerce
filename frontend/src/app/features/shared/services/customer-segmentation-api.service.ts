import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/models/api.model';
import {
  CustomerSegmentListResponse,
  SegmentationScatterResponse,
  SegmentationStatusData,
  SegmentationTrainRequest,
  SegmentationTrainResponse,
} from '../models/customer-segmentation.model';

@Injectable({ providedIn: 'root' })
export class CustomerSegmentationApiService {
  private readonly api = inject(ApiService);

  trainSegmentation(payload: SegmentationTrainRequest): Observable<ApiResponse<SegmentationTrainResponse>> {
    return this.api.post<ApiResponse<SegmentationTrainResponse>>('/ml/customer-segmentation/train', payload);
  }

  getStatus(): Observable<ApiResponse<SegmentationStatusData>> {
    return this.api.get<ApiResponse<SegmentationStatusData>>('/ml/customer-segmentation/status');
  }

  getScatterPoints(limit: number = 300): Observable<ApiResponse<SegmentationScatterResponse>> {
    return this.api.get<ApiResponse<SegmentationScatterResponse>>(`/ml/customer-segmentation/scatter-points?limit=${limit}`);
  }

  getCustomers(
    clusterId?: number,
    page: number = 1,
    pageSize: number = 20,
  ): Observable<ApiResponse<CustomerSegmentListResponse>> {
    const params: string[] = [`page=${page}`, `page_size=${pageSize}`];
    if (clusterId !== undefined && clusterId !== null) {
      params.push(`cluster_id=${clusterId}`);
    }
    return this.api.get<ApiResponse<CustomerSegmentListResponse>>(
      `/ml/customer-segmentation/customers?${params.join('&')}`,
    );
  }
}
