import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toast } from '@spartan-ng/brain/sonner';

import { Plan } from '../../../core/models/company.model';
import { CompanyService } from '../../../core/services/company.service';
import { PlanFormModalComponent } from '../components/plan-form-modal.component';

@Component({
  selector: 'app-plans-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PlanFormModalComponent],
  template: `
    <div class="space-y-8 p-6 lg:p-10 max-w-7xl mx-auto">
      
      <!-- HEADER CON RESUMEN Y NAVEGACIÓN DE PESTAÑAS -->
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Portal Master SaaS • CU02
            </span>
            <h1 class="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Catálogo de Planes y Cuotas Comerciales
            </h1>
            <p class="text-sm text-slate-500 mt-1">
              Configuración de límites de sucursales físicas, tarifas mensuales y gobernanza técnica de Inteligencia Artificial.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              (click)="openCreateModal()"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Nuevo Plan Comercial</span>
            </button>
          </div>
        </div>

        <!-- NAVEGACIÓN SUPERIOR ENTRE MÓDULOS DEL MASTER SAAS -->
        <div class="flex items-center gap-2 border-b border-slate-200 text-sm font-medium">
          <a
            routerLink="/app/superadmin/tenants"
            class="pb-3 px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors"
          >
            Empresas Contratantes
          </a>
          <a
            routerLink="/app/superadmin/plans"
            class="pb-3 px-1 border-b-2 border-slate-900 text-slate-900 font-semibold"
          >
            Planes & Cuotas SaaS
          </a>
        </div>
      </div>

      <!-- TARJETAS DE MÉTRICAS (KPIs TIPO TASTE-SKILL) -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p class="text-xs font-medium text-slate-500">Planes Activos</p>
          <p class="text-2xl font-bold text-slate-900 mt-2">{{ activePlansCount() }} <span class="text-xs font-normal text-slate-400">/ {{ plans().length }}</span></p>
          <p class="text-[11px] text-slate-400 mt-1">Disponibles para contratación</p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p class="text-xs font-medium text-slate-500">Cuota Máx. de Sucursales</p>
          <p class="text-2xl font-bold text-slate-900 mt-2">{{ maxBranchCeiling() }} <span class="text-xs font-normal text-slate-400">sedes</span></p>
          <p class="text-[11px] text-slate-400 mt-1">Límite superior configurado</p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p class="text-xs font-medium text-slate-500">Rango de Precios</p>
          <p class="text-2xl font-bold text-slate-900 mt-2">\${{ minPrice() }} - \${{ maxPrice() }}</p>
          <p class="text-[11px] text-slate-400 mt-1">USD mensual de suscripción</p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p class="text-xs font-medium text-slate-500">Planes con IA & ML</p>
          <p class="text-2xl font-bold text-violet-700 mt-2">{{ aiPlansCount() }}</p>
          <p class="text-[11px] text-slate-400 mt-1">Habilitan Gemini y analítica</p>
        </div>
      </div>

      <!-- BARRA DE CONTROL Y FILTROS -->
      <div class="flex items-center justify-between gap-4">
        <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium">
          <button
            type="button"
            (click)="showOnlyActive.set(false)"
            class="rounded-md px-3 py-1.5 transition-colors cursor-pointer"
            [ngClass]="!showOnlyActive() ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'"
          >
            Todos los Planes ({{ plans().length }})
          </button>
          <button
            type="button"
            (click)="showOnlyActive.set(true)"
            class="rounded-md px-3 py-1.5 transition-colors cursor-pointer"
            [ngClass]="showOnlyActive() ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'"
          >
            Solo Activos ({{ activePlansCount() }})
          </button>
        </div>

        <button
          type="button"
          (click)="loadPlans()"
          class="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <svg class="w-3.5 h-3.5" [ngClass]="loading() ? 'animate-spin' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Actualizar</span>
        </button>
      </div>

      <!-- GRID DE TARJETAS DE PLANES COMERCIALES -->
      @if (loading()) {
        <div class="p-16 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
          <svg class="animate-spin h-6 w-6 mx-auto mb-2 text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          Consultando catálogo de planes...
        </div>
      } @else if (filteredPlans().length === 0) {
        <div class="p-16 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
          No hay planes comerciales registrados con el filtro actual.
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (plan of filteredPlans(); track plan.id) {
            <div
              class="flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-xs transition-all hover:shadow-md"
              [ngClass]="plan.is_active ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-75'"
            >
              <div>
                <!-- CABECERA DE TARJETA -->
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="flex items-center gap-2">
                      <h3 class="text-lg font-bold text-slate-900 tracking-tight">{{ plan.name }}</h3>
                      <span class="font-mono text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {{ plan.code }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1 min-h-[36px] line-clamp-2">
                      {{ plan.description || 'Sin descripción comercial asignada.' }}
                    </p>
                  </div>

                  @if (plan.is_active) {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Activo
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                      <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      En Pausa
                    </span>
                  }
                </div>

                <!-- PRECIO -->
                <div class="mt-4 pt-4 border-t border-slate-100 flex items-baseline gap-1">
                  <span class="text-3xl font-extrabold tracking-tight text-slate-900">
                    \${{ plan.price_monthly }}
                  </span>
                  <span class="text-xs font-medium text-slate-400">/ mes (USD)</span>
                </div>

                <!-- ESPECIFICACIONES TÉCNICAS Y CUOTAS -->
                <div class="mt-5 space-y-2.5 text-xs">
                  <!-- Sucursales -->
                  <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span class="text-slate-600 font-medium">Cuota Sucursales Físicas:</span>
                    <strong class="font-semibold text-slate-900">
                      Hasta {{ plan.max_branches }} sedes
                    </strong>
                  </div>

                  <!-- IA & ML -->
                  <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span class="text-slate-600 font-medium">Módulo IA & Analítica:</span>
                    @if (plan.has_ai_access) {
                      <span class="inline-flex items-center gap-1 font-semibold text-violet-700">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Gemini RAG + ML
                      </span>
                    } @else {
                      <span class="text-slate-400">No incluido</span>
                    }
                  </div>

                  <!-- Operaciones Offline -->
                  <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span class="text-slate-600 font-medium">PWA Offline & Sincronización:</span>
                    <strong class="font-semibold text-slate-800">UUIDv4 Nativo</strong>
                  </div>
                </div>
              </div>

              <!-- FOOTER DE ACCIONES -->
              <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  (click)="togglePlanActive(plan)"
                  class="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
                  [ngClass]="plan.is_active 
                    ? 'border-slate-200 text-slate-600 hover:bg-slate-50' 
                    : 'border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50'"
                >
                  {{ plan.is_active ? 'Pausar Plan' : 'Activar Plan' }}
                </button>

                <button
                  type="button"
                  (click)="openEditModal(plan)"
                  class="inline-flex items-center gap-1 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Editar Plan</span>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- MODAL DE CREACIÓN / EDICIÓN -->
      <app-plan-form-modal
        [isOpen]="isModalOpen()"
        [planToEdit]="selectedPlan()"
        (close)="isModalOpen.set(false)"
        (saved)="onPlanSaved($event)"
      />

    </div>
  `,
})
export class PlansPageComponent implements OnInit {
  private readonly companyService = inject(CompanyService);

  protected readonly plans = signal<Plan[]>([]);
  protected readonly loading = signal(false);
  protected readonly showOnlyActive = signal(false);

  protected readonly isModalOpen = signal(false);
  protected readonly selectedPlan = signal<Plan | null>(null);

  protected readonly filteredPlans = computed(() => {
    const list = this.plans();
    if (this.showOnlyActive()) {
      return list.filter((p) => p.is_active);
    }
    return list;
  });

  protected readonly activePlansCount = computed(() => {
    return this.plans().filter((p) => p.is_active).length;
  });

  protected readonly maxBranchCeiling = computed(() => {
    const list = this.plans();
    if (!list.length) return 0;
    return Math.max(...list.map((p) => p.max_branches));
  });

  protected readonly minPrice = computed(() => {
    const list = this.plans();
    if (!list.length) return 0;
    return Math.min(...list.map((p) => Number(p.price_monthly)));
  });

  protected readonly maxPrice = computed(() => {
    const list = this.plans();
    if (!list.length) return 0;
    return Math.max(...list.map((p) => Number(p.price_monthly)));
  });

  protected readonly aiPlansCount = computed(() => {
    return this.plans().filter((p) => p.has_ai_access).length;
  });

  ngOnInit(): void {
    this.loadPlans();
  }

  protected loadPlans(): void {
    this.loading.set(true);
    // Solicitamos todos los planes (incluyendo inactivos para el superadmin)
    this.companyService.getPlans(true).subscribe({
      next: (data) => {
        this.plans.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        toast.error('Error al cargar la lista de planes comerciales');
      },
    });
  }

  protected openCreateModal(): void {
    this.selectedPlan.set(null);
    this.isModalOpen.set(true);
  }

  protected openEditModal(plan: Plan): void {
    this.selectedPlan.set(plan);
    this.isModalOpen.set(true);
  }

  protected togglePlanActive(plan: Plan): void {
    const nextState = !plan.is_active;
    this.companyService.togglePlanStatus(plan.id, nextState).subscribe({
      next: (updated) => {
        toast.success(`Plan ${updated.name} ${updated.is_active ? 'activado' : 'pausado'}`);
        this.loadPlans();
      },
      error: () => {
        toast.error('No se pudo actualizar el estado del plan');
      },
    });
  }

  protected onPlanSaved(plan: Plan): void {
    this.loadPlans();
  }
}
