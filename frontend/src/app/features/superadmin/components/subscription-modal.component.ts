import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toast } from '@spartan-ng/brain/sonner';

import { Company, Plan, Subscription, SubscriptionAssignDto, SubscriptionUpdateDto } from '../../../core/models/company.model';
import { CompanyService } from '../../../core/services/company.service';

@Component({
  selector: 'app-subscription-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen && company) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        (keydown.escape)="onClose()"
      >
        <!-- BACKDROP -->
        <div
          class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          (click)="onClose()"
        ></div>

        <!-- MODAL CARD -->
        <div
          class="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 transition-all text-slate-800"
          (click)="$event.stopPropagation()"
        >
          <!-- HEADER -->
          <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                CU02 • Gobernanza de Suscripciones & Vigencias
              </span>
              <h2 id="modal-title" class="text-xl font-bold text-slate-900 mt-0.5">
                Suscripción: {{ company.name }}
              </h2>
              <p class="text-xs text-slate-500">
                Subdominio: <code class="font-mono font-semibold text-slate-700">{{ company.subdomain }}.fashionstore.app</code>
              </p>
            </div>

            <button
              type="button"
              (click)="onClose()"
              class="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- BODY -->
          <div class="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

            <!-- ESTADO ACTUAL Y VIGENCIA -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan Actual</p>
                    @if (currentSubscription()) {
                      <span
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
                        [ngClass]="{
                          'bg-emerald-100 text-emerald-800 border border-emerald-200': currentSubscription()?.status === 'ACTIVA',
                          'bg-amber-100 text-amber-800 border border-amber-200': currentSubscription()?.status === 'VENCIDA',
                          'bg-rose-100 text-rose-800 border border-rose-200': currentSubscription()?.status === 'CANCELADA'
                        }"
                      >
                        {{ currentSubscription()?.status }}
                      </span>
                    }
                  </div>

                  <p class="text-lg font-bold text-slate-900 mt-1">
                    @if (loadingSubscription()) {
                      <span class="text-sm font-normal text-slate-400">Consultando suscripción...</span>
                    } @else if (currentSubscription()?.plan) {
                      {{ currentSubscription()?.plan?.name }}
                      <span class="text-xs font-normal text-slate-500">
                        (\${{ currentSubscription()?.plan?.price_monthly }}/mes)
                      </span>
                    } @else {
                      <span class="text-sm text-amber-600 font-medium">Sin suscripción registrada</span>
                    }
                  </p>

                  @if (currentSubscription()?.end_date) {
                    <p class="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Vencimiento: <strong>{{ currentSubscription()?.end_date | date:'dd/MM/yyyy' }}</strong></span>
                    </p>
                  } @else if (currentSubscription()) {
                    <p class="text-xs text-slate-400 mt-1">Vigencia indefinida (sin fecha de caducidad fijada)</p>
                  }
                </div>

                @if (currentSubscription()?.plan) {
                  <div class="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 text-xs">
                    <span class="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700">
                      Cuota: <strong>Máx. {{ currentSubscription()?.plan?.max_branches }} sucursales</strong>
                    </span>
                    <span
                      class="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-medium"
                      [ngClass]="currentSubscription()?.plan?.has_ai_access ? 'text-violet-700' : 'text-slate-500'"
                    >
                      {{ currentSubscription()?.plan?.has_ai_access ? 'IA & Analítica Activa' : 'Sin IA' }}
                    </span>
                  </div>
                }
              </div>
            </div>

            <!-- GESTIÓN DE VIGENCIA Y SIMULACIÓN ADMINISTRATIVA (CÁTEDRA 9.5) -->
            <div class="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Vigencia y Simulación de Suscripción (Punto 9.5 Examen)
                  </h3>
                  <p class="text-[11px] text-slate-500">
                    Configura la fecha de caducidad y estado para simular renovaciones o vencimientos.
                  </p>
                </div>
              </div>

              <!-- SELECTOR DE FECHA Y ESTADO -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    [(ngModel)]="endDateInput"
                    class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                  <p class="text-[10px] text-slate-400 mt-0.5">Dejar vacío para vigencia continua</p>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 mb-1">
                    Estado de Suscripción
                  </label>
                  <select
                    [(ngModel)]="selectedStatus"
                    class="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 cursor-pointer bg-white"
                  >
                    <option value="ACTIVA">ACTIVA (Operativa)</option>
                    <option value="VENCIDA">VENCIDA (Bloqueada)</option>
                    <option value="CANCELADA">CANCELADA (Baja)</option>
                  </select>
                  <p class="text-[10px] text-slate-400 mt-0.5">Regula el acceso comercial en POS y sucursales</p>
                </div>
              </div>

              <!-- BOTONES DE SIMULACIÓN RÁPIDA PARA DEFENSA -->
              <div class="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <span class="text-[11px] font-semibold text-slate-500 mr-1">Simulación rápida:</span>

                <button
                  type="button"
                  (click)="simulateRenewalDays(30)"
                  class="px-2.5 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  +30 Días (Mensual)
                </button>

                <button
                  type="button"
                  (click)="simulateRenewalDays(365)"
                  class="px-2.5 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  +1 Año (Anual)
                </button>

                <button
                  type="button"
                  (click)="simulateExpiration()"
                  class="px-2.5 py-1 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  Simular Vencimiento
                </button>
              </div>
            </div>

            <!-- SELECTOR DE PLAN DESTINO -->
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Selecciona el Plan Destino
              </label>

              @if (loadingPlans()) {
                <div class="py-6 text-center text-xs text-slate-400">
                  Cargando planes comerciales...
                </div>
              } @else {
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  @for (plan of plans(); track plan.id) {
                    <div
                      (click)="selectedPlanId.set(plan.id)"
                      class="relative rounded-xl border-2 p-3.5 cursor-pointer transition-all flex flex-col justify-between"
                      [ngClass]="{
                        'border-slate-900 bg-slate-50/70 shadow-xs': selectedPlanId() === plan.id,
                        'border-slate-200 bg-white hover:border-slate-300': selectedPlanId() !== plan.id
                      }"
                    >
                      <div>
                        <div class="flex items-start justify-between">
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                            [ngClass]="{
                              'bg-purple-100 text-purple-800': plan.code === 'enterprise',
                              'bg-amber-100 text-amber-800': plan.code === 'pro',
                              'bg-slate-200 text-slate-700': plan.code === 'basic'
                            }">
                            {{ plan.name }}
                          </span>

                          <input
                            type="radio"
                            name="target_plan"
                            [value]="plan.id"
                            [checked]="selectedPlanId() === plan.id"
                            class="mt-0.5 h-3.5 w-3.5 text-slate-900 focus:ring-slate-900 border-slate-300"
                          />
                        </div>

                        <div class="text-lg font-bold text-slate-900 mt-2">
                          \${{ plan.price_monthly }}
                          <span class="text-[11px] font-normal text-slate-500">/mes</span>
                        </div>

                        <p class="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {{ plan.description || 'Configuración comercial' }}
                        </p>
                      </div>

                      <div class="mt-3 pt-2 border-t border-slate-100 text-[11px] space-y-1 text-slate-600">
                        <div class="flex items-center gap-1">
                          <span class="text-emerald-600 font-bold">✓</span>
                          <span>Hasta <strong>{{ plan.max_branches }}</strong> sedes</span>
                        </div>
                        <div class="flex items-center gap-1">
                          @if (plan.has_ai_access) {
                            <span class="text-violet-600 font-bold">✓</span>
                            <span class="font-medium text-violet-800">IA & ML</span>
                          } @else {
                            <span class="text-slate-300">✕</span>
                            <span class="text-slate-400">Sin IA</span>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- MENSAJE DE ERROR / DOWNGRADE GUARD -->
            @if (errorMessage()) {
              <div class="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                <svg class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div class="flex-1">
                  <p class="font-bold">Restricción de Negocio (Downgrade Guard):</p>
                  <p class="mt-0.5">{{ errorMessage() }}</p>
                </div>
              </div>
            }

          </div>

          <!-- FOOTER -->
          <div class="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              (click)="onClose()"
              class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="onSubmit()"
              [disabled]="saving() || !selectedPlanId()"
              class="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              @if (saving()) {
                <svg class="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Guardando Suscripción...</span>
              } @else {
                <span>Confirmar y Guardar Suscripción</span>
              }
            </button>
          </div>

        </div>
      </div>
    }
  `,
})
export class SubscriptionModalComponent implements OnChanges {
  private readonly companyService = inject(CompanyService);

  @Input() isOpen = false;
  @Input() company: Company | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<Subscription>();

  protected readonly plans = signal<Plan[]>([]);
  protected readonly currentSubscription = signal<Subscription | null>(null);
  protected readonly selectedPlanId = signal<string>('');
  protected readonly loadingPlans = signal<boolean>(false);
  protected readonly loadingSubscription = signal<boolean>(false);
  protected readonly saving = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected endDateInput: string = '';
  protected selectedStatus: string = 'ACTIVA';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.company) {
      this.resetModal();
      this.loadData();
    }
  }

  private resetModal(): void {
    this.selectedPlanId.set('');
    this.errorMessage.set(null);
    this.currentSubscription.set(null);
    this.endDateInput = '';
    this.selectedStatus = 'ACTIVA';
  }

  private loadData(): void {
    if (!this.company) return;

    this.loadingPlans.set(true);
    this.companyService.getPlans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.loadingPlans.set(false);
      },
      error: () => {
        this.loadingPlans.set(false);
        toast.error('No se pudieron cargar los planes comerciales');
      },
    });

    this.loadingSubscription.set(true);
    this.companyService.getCompanySubscription(this.company.id).subscribe({
      next: (sub) => {
        this.currentSubscription.set(sub);
        if (sub?.plan_id) {
          this.selectedPlanId.set(sub.plan_id);
        }
        if (sub?.status) {
          this.selectedStatus = sub.status;
        }
        if (sub?.end_date) {
          // Extraer formato YYYY-MM-DD para el input type="date"
          this.endDateInput = sub.end_date.substring(0, 10);
        } else {
          this.endDateInput = '';
        }
        this.loadingSubscription.set(false);
      },
      error: () => {
        this.loadingSubscription.set(false);
      },
    });
  }

  protected simulateRenewalDays(days: number): void {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    this.endDateInput = targetDate.toISOString().substring(0, 10);
    this.selectedStatus = 'ACTIVA';
    toast.info(`Vigencia simulada por ${days} días (${this.endDateInput})`);
  }

  protected simulateExpiration(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.endDateInput = yesterday.toISOString().substring(0, 10);
    this.selectedStatus = 'VENCIDA';
    toast.warning('Suscripción simulada como VENCIDA para pruebas de restricción');
  }

  protected onClose(): void {
    this.close.emit();
  }

  protected onSubmit(): void {
    if (!this.company || !this.selectedPlanId()) return;

    this.saving.set(true);
    this.errorMessage.set(null);

    const formattedEndDate = this.endDateInput
      ? new Date(this.endDateInput + 'T23:59:59Z').toISOString()
      : null;

    const currentSub = this.currentSubscription();

    // Si la suscripción ya existe y no cambió de plan, actualizamos vigencia y estado directamente
    if (currentSub?.id && currentSub.plan_id === this.selectedPlanId()) {
      const updateDto: SubscriptionUpdateDto = {
        end_date: formattedEndDate,
        status: this.selectedStatus,
      };

      this.companyService.updateSubscription(currentSub.id, updateDto).subscribe({
        next: (sub) => {
          this.saving.set(false);
          toast.success('Vigencia y estado de suscripción actualizados');
          this.updated.emit(sub);
          this.onClose();
        },
        error: (err) => {
          this.saving.set(false);
          const detail = err?.error?.detail || err?.error?.message || 'Error al actualizar suscripción';
          this.errorMessage.set(detail);
          toast.error(detail);
        },
      });
    } else {
      // Cambio de plan o asignación inicial
      const assignDto: SubscriptionAssignDto = {
        company_id: this.company.id,
        plan_id: this.selectedPlanId(),
        end_date: formattedEndDate,
        status: this.selectedStatus,
      };

      this.companyService.assignSubscription(assignDto).subscribe({
        next: (sub) => {
          this.saving.set(false);
          toast.success(`Plan ${sub.plan?.name || ''} asignado exitosamente`);
          this.updated.emit(sub);
          this.onClose();
        },
        error: (err) => {
          this.saving.set(false);
          const detail = err?.error?.detail || err?.error?.message || 'Error al asignar plan';
          this.errorMessage.set(detail);
          toast.error(detail);
        },
      });
    }
  }
}
