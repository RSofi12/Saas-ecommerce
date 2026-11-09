import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toast } from '@spartan-ng/brain/sonner';

import { Plan, PlanCreateDto, PlanUpdateDto } from '../../../core/models/company.model';
import { CompanyService } from '../../../core/services/company.service';

@Component({
  selector: 'app-plan-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-modal-title"
        (keydown.escape)="onClose()"
      >
        <!-- BACKDROP -->
        <div
          class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          (click)="onClose()"
        ></div>

        <!-- MODAL CARD -->
        <div
          class="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 transition-all text-slate-800"
          (click)="$event.stopPropagation()"
        >
          <!-- HEADER -->
          <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                CU02 • Catálogo Maestro de Planes SaaS
              </span>
              <h2 id="plan-modal-title" class="text-xl font-bold text-slate-900 mt-0.5">
                {{ isEditing ? 'Editar Plan Comercial' : 'Crear Nuevo Plan Comercial' }}
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">
                Define las cuotas técnicas de sucursales, precios y acceso a capacidades de IA.
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

          <!-- FORM BODY -->
          <form (ngSubmit)="onSubmit()" class="p-6 space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Nombre -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nombre Comercial <span class="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="formData.name"
                  name="name"
                  required
                  placeholder="Ej. EMPRESARIAL"
                  class="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <!-- Código -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Código Identificador <span class="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="formData.code"
                  name="code"
                  required
                  [disabled]="isEditing"
                  placeholder="Ej. enterprise"
                  class="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 font-mono disabled:bg-slate-100 disabled:text-slate-500 focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                />
              </div>
            </div>

            <!-- Descripción -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Descripción y Alcance del Plan
              </label>
              <textarea
                [(ngModel)]="formData.description"
                name="description"
                rows="2"
                placeholder="Detalle de beneficios para la boutique..."
                class="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
              ></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Cuota de Sucursales -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Cuota Máx. Sucursales <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <input
                    type="number"
                    [(ngModel)]="formData.max_branches"
                    name="max_branches"
                    min="1"
                    max="1000"
                    required
                    class="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                  <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">sedes</span>
                </div>
                <p class="text-[11px] text-slate-400 mt-1">Límite duro de sedes físicas activas (ej. 223)</p>
              </div>

              <!-- Precio Mensual -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Tarifa Mensual (USD) <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    [(ngModel)]="formData.price_monthly"
                    name="price_monthly"
                    min="0"
                    step="0.01"
                    required
                    class="w-full rounded-lg border border-slate-200 pl-8 pr-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>
                <p class="text-[11px] text-slate-400 mt-1">Facturación mensual de referencia</p>
              </div>
            </div>

            <!-- TOGGLES DE POLÍTICA Y ESTADO -->
            <div class="space-y-3 pt-2 border-t border-slate-100">
              <!-- Toggle IA -->
              <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  [(ngModel)]="formData.has_ai_access"
                  name="has_ai_access"
                  class="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-slate-900">Acceso a Inteligencia Artificial & ML</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200/60">
                      Gemini + ML
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Habilita reportes ejecutivos por voz (CU20), predicción de demanda de stock (CU23) y segmentación K-Means (CU24).
                  </p>
                </div>
              </label>

              <!-- Toggle Activo -->
              <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  [(ngModel)]="formData.is_active"
                  name="is_active"
                  class="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <div>
                  <span class="text-sm font-semibold text-slate-900">Plan Comercial Activo</span>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Permite que nuevas empresas contraten este plan o que las existentes se actualicen a él.
                  </p>
                </div>
              </label>
            </div>

            <!-- FOOTER ACCIONES -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                (click)="onClose()"
                class="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                [disabled]="isSubmitting()"
                class="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold shadow-xs hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                @if (isSubmitting()) {
                  <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Guardando...</span>
                } @else {
                  <span>{{ isEditing ? 'Guardar Cambios' : 'Crear Plan' }}</span>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class PlanFormModalComponent implements OnChanges {
  private readonly companyService = inject(CompanyService);

  @Input() isOpen = false;
  @Input() planToEdit: Plan | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Plan>();

  protected readonly isSubmitting = signal(false);

  protected get isEditing(): boolean {
    return !!this.planToEdit;
  }

  protected formData = {
    name: '',
    code: '',
    description: '',
    max_branches: 3,
    price_monthly: 29.00,
    has_ai_access: false,
    is_active: true,
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['planToEdit'] || changes['isOpen']) {
      if (this.planToEdit) {
        this.formData = {
          name: this.planToEdit.name,
          code: this.planToEdit.code,
          description: this.planToEdit.description || '',
          max_branches: this.planToEdit.max_branches,
          price_monthly: Number(this.planToEdit.price_monthly),
          has_ai_access: this.planToEdit.has_ai_access,
          is_active: this.planToEdit.is_active,
        };
      } else {
        this.resetForm();
      }
    }
  }

  private resetForm(): void {
    this.formData = {
      name: '',
      code: '',
      description: '',
      max_branches: 3,
      price_monthly: 29.00,
      has_ai_access: false,
      is_active: true,
    };
  }

  protected onClose(): void {
    this.close.emit();
  }

  protected onSubmit(): void {
    if (!this.formData.name.trim() || !this.formData.code.trim()) {
      toast.error('Nombre y código del plan son obligatorios');
      return;
    }

    if (this.formData.max_branches < 1) {
      toast.error('La cuota de sucursales debe ser al menos 1');
      return;
    }

    this.isSubmitting.set(true);

    if (this.isEditing && this.planToEdit) {
      const updateDto: PlanUpdateDto = {
        name: this.formData.name.trim(),
        description: this.formData.description.trim() || null,
        max_branches: this.formData.max_branches,
        price_monthly: this.formData.price_monthly,
        has_ai_access: this.formData.has_ai_access,
        is_active: this.formData.is_active,
      };

      this.companyService.updatePlan(this.planToEdit.id, updateDto).subscribe({
        next: (updatedPlan) => {
          this.isSubmitting.set(false);
          toast.success(`Plan ${updatedPlan.name} actualizado exitosamente`);
          this.saved.emit(updatedPlan);
          this.onClose();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const detail = err?.error?.detail || err?.error?.message || 'Error al actualizar el plan';
          toast.error(detail);
        },
      });
    } else {
      const createDto: PlanCreateDto = {
        name: this.formData.name.trim(),
        code: this.formData.code.trim().toLowerCase(),
        description: this.formData.description.trim() || null,
        max_branches: this.formData.max_branches,
        price_monthly: this.formData.price_monthly,
        has_ai_access: this.formData.has_ai_access,
        is_active: this.formData.is_active,
      };

      this.companyService.createPlan(createDto).subscribe({
        next: (newPlan) => {
          this.isSubmitting.set(false);
          toast.success(`Plan ${newPlan.name} creado exitosamente`);
          this.saved.emit(newPlan);
          this.onClose();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const detail = err?.error?.detail || err?.error?.message || 'Error al crear el plan';
          toast.error(detail);
        },
      });
    }
  }
}
