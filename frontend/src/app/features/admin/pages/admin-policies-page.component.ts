import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PolicyService } from '../../../core/services/policy.service';
import { PlatformPoliciesData } from '../../../core/models/policy.model';
import { PoliciesModalComponent } from '../../shared/components/policies-modal.component';

@Component({
  selector: 'app-admin-policies-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PoliciesModalComponent],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Header de la Página -->
      <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div class="flex items-center gap-2">
            <span class="inline-flex size-8 items-center justify-center rounded-xl bg-slate-900 text-white text-sm font-bold shadow-sm">§</span>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">Políticas y Términos Comerciales</h1>
          </div>
          <p class="text-sm text-slate-500 mt-1">
            Gobernanza de reglas de dominio, políticas de cambio/devolución y marco normativo SaaS FashionStore.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="isModalOpen.set(true)"
            class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Vista Previa para Clientes
          </button>
        </div>
      </header>

      <!-- Banner de Advertencia de Dominio Inviolable -->
      <div class="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 sm:p-5 text-sky-950 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div class="rounded-xl bg-sky-100 p-2.5 text-sky-800 shrink-0">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="flex-1 text-xs leading-relaxed">
          <p class="font-bold text-sm text-sky-900">Políticas Codificadas en el Motor del Sistema</p>
          <p class="text-sky-800 mt-0.5">
            Las reglas comerciales de cambios, devoluciones con retención operativa y cobros por Stripe se aplican de forma
            automatizada e inquebrantable en los controladores del backend para proteger la liquidez y trazabilidad de su boutique.
          </p>
        </div>
      </div>

      <!-- Grid de Políticas Comerciales -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Tarjeta 1: P-Ten-01 Cambios de Prenda por Talla -->
        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <header class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div class="flex items-center gap-2.5">
              <span class="rounded-lg bg-sky-100 px-2.5 py-1 font-mono text-xs font-bold text-sky-800">
                {{ policies()?.cambios_de_prenda?.codigo }}
              </span>
              <h2 class="font-bold text-slate-900 text-sm">Cambio de Prenda y Diferencia (CU17)</h2>
            </div>
            <span class="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {{ policies()?.cambios_de_prenda?.plazos }}
            </span>
          </header>

          <div class="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div class="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
              <p class="font-semibold text-slate-800 mb-1">Cobro Obligatorio de Diferencia de Precio:</p>
              <p>{{ policies()?.cambios_de_prenda?.regla_precio_mayor }}</p>
            </div>

            <div class="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
              <p class="font-semibold text-slate-800 mb-1">Prenda de Menor o Igual Precio:</p>
              <p>{{ policies()?.cambios_de_prenda?.regla_precio_menor_o_igual }}</p>
            </div>

            <div class="rounded-xl bg-amber-50/70 border border-amber-200 p-3 text-amber-900">
              <p class="font-bold text-[11px] mb-0.5">Inspección Física Obligatoria (P-Ten-02):</p>
              <p class="text-[11px]">{{ policies()?.cambios_de_prenda?.inspeccion_fisica }}</p>
            </div>
          </div>
        </section>

        <!-- Tarjeta 2: P-Ten-03 Devoluciones y Retención -->
        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <header class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div class="flex items-center gap-2.5">
              <span class="rounded-lg bg-emerald-100 px-2.5 py-1 font-mono text-xs font-bold text-emerald-800">
                {{ policies()?.devoluciones_y_reembolsos?.codigo }}
              </span>
              <h2 class="font-bold text-slate-900 text-sm">Devoluciones y Retención (CU18)</h2>
            </div>
            <span class="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {{ policies()?.devoluciones_y_reembolsos?.plazos }}
            </span>
          </header>

          <div class="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div class="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
              <p class="font-semibold text-slate-800 mb-1">Tasa de Retención Operativa (20% - 50%):</p>
              <p>{{ policies()?.devoluciones_y_reembolsos?.retencion_operativa }}</p>
            </div>

            <div class="rounded-xl bg-emerald-50 border border-emerald-200 p-3 font-mono text-center text-xs font-bold text-emerald-900">
              {{ policies()?.devoluciones_y_reembolsos?.calculo_reembolso }}
            </div>

            <div class="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
              <p class="font-semibold text-slate-800 mb-1">Modalidad de Reembolso Preferida:</p>
              <p>{{ policies()?.devoluciones_y_reembolsos?.modalidad_reembolso }}</p>
            </div>
          </div>
        </section>

        <!-- Tarjeta 3: P-Ten-04 / 05 Despacho Stripe y Ventas Offline -->
        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <header class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div class="flex items-center gap-2.5">
              <span class="rounded-lg bg-indigo-100 px-2.5 py-1 font-mono text-xs font-bold text-indigo-800">
                {{ policies()?.pagos_y_despacho?.codigo }}
              </span>
              <h2 class="font-bold text-slate-900 text-sm">Despacho Digital y Operaciones Offline</h2>
            </div>
          </header>

          <div class="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div class="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
              <p class="font-semibold text-slate-800 mb-1">Despacho Condicionado a Pago en Stripe (CU09):</p>
              <p>{{ policies()?.pagos_y_despacho?.despacho_digital }}</p>
            </div>

            <div class="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
              <p class="font-semibold text-slate-800 mb-1">Ventas Desconectadas en Efectivo (CU13):</p>
              <p>{{ policies()?.pagos_y_despacho?.ventas_offline }}</p>
            </div>

            <div class="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
              <p class="font-semibold text-slate-800 mb-1">Caducidad de Reservas (CU10/CU12):</p>
              <p>{{ policies()?.reservas_de_stock?.tiempo_reserva }}</p>
            </div>
          </div>
        </section>

        <!-- Tarjeta 4: P-SaaS-01 Términos y Cuotas de Suscripción -->
        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <header class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div class="flex items-center gap-2.5">
              <span class="rounded-lg bg-purple-100 px-2.5 py-1 font-mono text-xs font-bold text-purple-800">
                {{ policies()?.terminos_saas_fashionstore?.codigo }}
              </span>
              <h2 class="font-bold text-slate-900 text-sm">Gobernanza y Cuotas SaaS FashionStore</h2>
            </div>
            <a routerLink="/app/admin/branch" class="text-xs text-primary font-semibold hover:underline">
              Ver cuotas de sucursales →
            </a>
          </header>

          <div class="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div class="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <p class="font-bold text-slate-900">Básico</p>
                <p class="text-[10px] text-slate-500 mt-1">Hasta 3 sucursales. Sin IA.</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <p class="font-bold text-slate-900">Profesional</p>
                <p class="text-[10px] text-slate-500 mt-1">Hasta 10 sucursales con IA Generativa.</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <p class="font-bold text-slate-900">Empresarial</p>
                <p class="text-[10px] text-slate-500 mt-1">Hasta 223 sucursales + soporte VIP.</p>
              </div>
            </div>

            <div class="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
              <p class="font-semibold text-slate-800 mb-1">Aislamiento Multitenant (P-SaaS-03):</p>
              <p>{{ policies()?.terminos_saas_fashionstore?.aislamiento_multitenant }}</p>
            </div>

            <div class="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
              <p class="font-semibold text-slate-800 mb-1">Copias de Seguridad (P-SaaS-02):</p>
              <p>{{ policies()?.terminos_saas_fashionstore?.respaldos }}</p>
            </div>
          </div>
        </section>

      </div>

      <!-- Modal de Previsualización -->
      <app-policies-modal
        [isOpen]="isModalOpen()"
        (close)="isModalOpen.set(false)"
      />
    </div>
  `,
})
export class AdminPoliciesPageComponent implements OnInit {
  private readonly policyService = inject(PolicyService);

  protected readonly policies = signal<PlatformPoliciesData | null>(null);
  protected readonly isModalOpen = signal(false);

  ngOnInit(): void {
    this.policies.set(this.policyService.getDefaultPolicies());
    this.policyService.getPolicies().subscribe({
      next: (data) => this.policies.set(data),
      error: () => this.policies.set(this.policyService.getDefaultPolicies()),
    });
  }
}
