import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface PublicBranch {
  id: string;
  tenant_id: string;
  name: string;
  city: string;
  address?: string | null;
  phone?: string | null;
  opening_hours?: string | null;
  latitude: number;
  longitude: number;
  is_default: boolean;
  is_active: boolean;
}

declare const L: any;

@Component({
  selector: 'app-branches-map-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './branches-map-page.component.html',
})
export class BranchesMapPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly http = inject(HttpClient);

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  protected readonly branches = signal<PublicBranch[]>([]);
  protected readonly selectedBranch = signal<PublicBranch | null>(null);
  protected readonly loading = signal(true);

  private map: any = null;
  private markers: any[] = [];

  ngOnInit(): void {
    this.loadBranches();
  }

  ngAfterViewInit(): void {
    // Wait for DOM and Leaflet script
    setTimeout(() => {
      this.initMap();
    }, 300);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private loadBranches(): void {
    const url = `${environment.apiBaseUrl}/branches/public`;
    this.http.get<{ data: PublicBranch[] }>(url).subscribe({
      next: (res) => {
        const list = res.data || [];
        this.branches.set(list);
        this.loading.set(false);
        this.renderMarkers();
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private initMap(): void {
    if (typeof L === 'undefined' || !this.mapContainer) {
      return;
    }

    if (this.map) return;

    // Center in Santa Cruz de la Sierra, Bolivia
    this.map = L.map(this.mapContainer.nativeElement).setView([-17.7833, -63.1821], 13);

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores',
    }).addTo(this.map);

    this.renderMarkers();
  }

  private renderMarkers(): void {
    if (!this.map || typeof L === 'undefined') return;

    // Clear old markers
    for (const m of this.markers) {
      this.map.removeLayer(m);
    }
    this.markers = [];

    const list = this.branches();
    if (!list.length) return;

    const bounds = L.latLngBounds([]);

    for (const b of list) {
      if (b.latitude && b.longitude) {
        const marker = L.marker([b.latitude, b.longitude]).addTo(this.map);

        const popupContent = `
          <div style="font-family: inherit; min-width: 200px; padding: 4px;">
            <strong style="color: #0f172a; font-size: 14px; display: block; margin-bottom: 4px;">${b.name}</strong>
            <div style="font-size: 12px; color: #475569; margin-bottom: 2px;">📍 ${b.address || b.city}</div>
            <div style="font-size: 12px; color: #475569; margin-bottom: 2px;">🕒 ${b.opening_hours || '09:00 - 20:00'}</div>
            <div style="font-size: 12px; color: #0284c7;">📞 ${b.phone || 'Sin teléfono'}</div>
          </div>
        `;
        marker.bindPopup(popupContent);
        marker.on('click', () => {
          this.selectedBranch.set(b);
        });

        this.markers.push(marker);
        bounds.extend([b.latitude, b.longitude]);
      }
    }

    if (this.markers.length > 0) {
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }

  protected focusBranch(b: PublicBranch): void {
    this.selectedBranch.set(b);
    if (this.map && b.latitude && b.longitude) {
      this.map.setView([b.latitude, b.longitude], 16, { animate: true });
      // Find matching marker and open popup
      for (const m of this.markers) {
        const pos = m.getLatLng();
        if (Math.abs(pos.lat - b.latitude) < 0.0001 && Math.abs(pos.lng - b.longitude) < 0.0001) {
          m.openPopup();
          break;
        }
      }
    }
  }
}
