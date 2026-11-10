import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { PolicyService } from '../../../core/services/policy.service';
import { PlatformPoliciesData } from '../../../core/models/policy.model';

@Component({
  selector: 'app-policies-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div 
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
        (click)="handleBackdropClick($event)"
      >
        <div 
          class="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-slate-200 text-slate-900 overflow-hidden"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="inline-flex size-7 items-center justify-center rounded-lg bg-slate-900 text-white text-xs font-bold">§</span>
                <h2 class="text-lg font-bold tracking-tight text-slate-900">Políticas y Términos Oficiales</h2>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">Normativa comercial de {{ tenantName }} y términos de la plataforma SaaS FashionStore</p>
            </div>
            <button 
              type="button" 
              (click)="closeModal()" 
              class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
              aria-label="Cerrar modal"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Pestañas de Navegación -->
          <div class="flex border-b border-slate-200 bg-white px-6 pt-2">
            <button
              type="button"
              (click)="activeTab.set('tienda')"
              [class.border-slate-900]="activeTab() === 'tienda'"
              [class.text-slate-900]="activeTab() === 'tienda'"
              [class.font-bold]="activeTab() === 'tienda'"
              [class.border-transparent]="activeTab() !== 'tienda'"
              [class.text-slate-500]="activeTab() !== 'tienda'"
              class="border-b-2 px-4 py-2.5 text-xs font-medium transition-colors hover:text-slate-900"
            >
              Políticas Comerciales (Tienda)
            </button>
            <button
              type="button"
              (click)="activeTab.set('saas')"
              [class.border-slate-900]="activeTab() === 'saas'"
              [class.text-slate-900]="activeTab() === 'saas'"
              [class.font-bold]="activeTab() === 'saas'"
              [class.border-transparent]="activeTab() !== 'saas'"
              [class.text-slate-500]="activeTab() !== 'saas'"
              class="border-b-2 px-4 py-2.5 text-xs font-medium transition-colors hover:text-slate-900"
            >
              Términos SaaS FashionStore
            </button>
          </div>

          <!-- Contenido Scrolleable -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-700">
            @if (activeTab() === 'tienda') {
              <!-- 1. CAMBIOS DE PRENDA -->
              <article class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <header class="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div class="flex items-center gap-2">
                    <span class="rounded bg-sky-100 px-2 py-0.5 font-mono text-[11px] font-bold text-sky-800">{{ policies()?.cambios_de_prenda?.codigo }}</span>
                    <h3 class="font-bold text-slate-900 text-sm">{{ policies()?.cambios_de_prenda?.titulo }}</h3>
                  </div>
                  <span class="text-xs text-slate-500">{{ policies()?.cambios_de_prenda?.plazos }}</span>
                </header>
                
                <div class="space-y-2 text-xs leading-relaxed text-slate-600">
                  <p class="font-medium text-slate-800">
                    <strong>Regla de Cobro de Diferencia:</strong>
                    {{ policies()?.cambios_de_prenda?.regla_precio_mayor }}
                  </p>
                  <p>
                    <strong>Prenda igual o menor precio:</strong>
                    {{ policies()?.cambios_de_prenda?.regla_precio_menor_o_igual }}
                  </p>
                  <div class="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900">
                    <strong>Inspección física obligatoria (P-Ten-02):</strong>
                    {{ policies()?.cambios_de_prenda?.inspeccion_fisica }}
                  </div>
                </div>
              </article>

              <!-- 2. DEVOLUCIONES Y NOTAS DE CRÉDITO -->
              <article class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <header class="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div class="flex items-center gap-2">
                    <span class="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800">{{ policies()?.devoluciones_y_reembolsos?.codigo }}</span>
                    <h3 class="font-bold text-slate-900 text-sm">{{ policies()?.devoluciones_y_reembolsos?.titulo }}</h3>
                  </div>
                  <span class="text-xs text-slate-500">{{ policies()?.devoluciones_y_reembolsos?.plazos }}</span>
                </header>

                <div class="space-y-2 text-xs leading-relaxed text-slate-600">
                  <p>
                    <strong>Retención Operativa:</strong>
                    {{ policies()?.devoluciones_y_reembolsos?.retencion_operativa }}
                  </p>
                  <div class="rounded-lg bg-slate-100 p-2.5 font-mono text-center text-xs text-slate-800">
                    {{ policies()?.devoluciones_y_reembolsos?.calculo_reembolso }}
                  </div>
                  <p>
                    <strong>Modalidad de Emisión:</strong>
                    {{ policies()?.devoluciones_y_reembolsos?.modalidad_reembolso }}
                  </p>
                </div>
              </article>

              <!-- 3. PAGOS Y DESPACHOS -->
              <article class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <header class="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div class="flex items-center gap-2">
                    <span class="rounded bg-indigo-100 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-800">{{ policies()?.pagos_y_despacho?.codigo }}</span>
                    <h3 class="font-bold text-slate-900 text-sm">{{ policies()?.pagos_y_despacho?.titulo }}</h3>
                  </div>
                </header>

                <div class="space-y-2 text-xs leading-relaxed text-slate-600">
                  <p>
                    <strong>Despacho contra Stripe Confirmado:</strong>
                    {{ policies()?.pagos_y_despacho?.despacho_digital }}
                  </p>
                  <p>
                    <strong>Contingencia Offline en Caja:</strong>
                    {{ policies()?.pagos_y_despacho?.ventas_offline }}
                  </p>
                  <p>
                    <strong>Caducidad de Reservas (CU10/CU12):</strong>
                    {{ policies()?.reservas_de_stock?.tiempo_reserva }}
                  </p>
                </div>
              </article>
            } @else {
              <!-- TÉRMINOS SAAS FASHIONSTORE -->
              <article class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                <header class="border-b border-slate-200 pb-2">
                  <span class="rounded bg-purple-100 px-2 py-0.5 font-mono text-[11px] font-bold text-purple-800">{{ policies()?.terminos_saas_fashionstore?.codigo }}</span>
                  <h3 class="font-bold text-slate-900 text-sm mt-1">{{ policies()?.terminos_saas_fashionstore?.titulo }}</h3>
                </header>

                <div class="space-y-3 text-xs leading-relaxed text-slate-600">
                  <div>
                    <h4 class="font-bold text-slate-800 mb-1.5 uppercase tracking-wider text-[11px]">1. Niveles de Cuotas Comerciales por Plan</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div class="rounded-lg border border-slate-200 bg-white p-2.5">
                        <p class="font-bold text-slate-900">Plan Básico</p>
                        <p class="text-[11px] text-slate-500 mt-1">{{ policies()?.terminos_saas_fashionstore?.cuotas_por_plan?.plan_basico }}</p>
                      </div>
                      <div class="rounded-lg border border-slate-200 bg-white p-2.5">
                        <p class="font-bold text-slate-900">Plan Profesional</p>
                        <p class="text-[11px] text-slate-500 mt-1">{{ policies()?.terminos_saas_fashionstore?.cuotas_por_plan?.plan_profesional }}</p>
                      </div>
                      <div class="rounded-lg border border-slate-200 bg-white p-2.5">
                        <p class="font-bold text-slate-900">Plan Empresarial</p>
                        <p class="text-[11px] text-slate-500 mt-1">{{ policies()?.terminos_saas_fashionstore?.cuotas_por_plan?.plan_empresarial }}</p>
                      </div>
                    </div>
                  </div>

                  <div class="rounded-lg bg-white border border-slate-200 p-3">
                    <p class="font-bold text-slate-800 mb-1">Aislamiento Multitenant Estricto (P-SaaS-03):</p>
                    <p>{{ policies()?.terminos_saas_fashionstore?.aislamiento_multitenant }}</p>
                  </div>

                  <div class="rounded-lg bg-white border border-slate-200 p-3">
                    <p class="font-bold text-slate-800 mb-1">Políticas de Respaldo y Continuidad (P-SaaS-02):</p>
                    <p>{{ policies()?.terminos_saas_fashionstore?.respaldos }}</p>
                  </div>
                </div>
              </article>
            }
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end border-t border-slate-100 bg-slate-50/80 px-6 py-3">
            <button
              type="button"
              (click)="closeModal()"
              class="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800 transition-colors"
            >
              He leído y comprendido
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PoliciesModalComponent implements OnInit {
  private readonly policyService = inject(PolicyService);

  @Input() isOpen = false;
  @Input() defaultTab: 'tienda' | 'saas' = 'tienda';
  @Input() tenantName = 'la Boutique';
  @Output() close = new EventEmitter<void>();

  protected readonly activeTab = signal<'tienda' | 'saas'>('tienda');
  protected readonly policies = signal<PlatformPoliciesData | null>(null);

  ngOnInit(): void {
    this.activeTab.set(this.defaultTab);
    this.policies.set(this.policyService.getDefaultPolicies());
    this.policyService.getPolicies().subscribe({
      next: (data) => this.policies.set(data),
      error: () => this.policies.set(this.policyService.getDefaultPolicies()),
    });
  }

  protected handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  protected closeModal(): void {
    this.close.emit();
  }
}
