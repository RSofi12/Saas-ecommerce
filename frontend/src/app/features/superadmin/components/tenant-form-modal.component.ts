import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toast } from '@spartan-ng/brain/sonner';

import { CompanyService } from '../../../core/services/company.service';
import { Company, CompanyCreateDto } from '../../../core/models/company.model';

@Component({
  selector: 'app-tenant-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    @if (isOpen) {
      <div 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
        (click)="handleBackdropClick($event)"
      >
        <div 
          class="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200 text-slate-900"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
            <div>
              <h2 class="text-xl font-bold tracking-tight text-slate-900">Registrar Nueva Empresa</h2>
              <p class="text-xs text-slate-500 mt-0.5">Aprovisionamiento de tenant SaaS y creación de cuenta administradora</p>
            </div>
            <button 
              type="button" 
              (click)="close.emit()" 
              class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Cerrar modal"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Formulario -->
          <form [formGroup]="form" (ngSubmit)="submit()" class="p-6 space-y-6">
            
            <!-- SECCIÓN 1: DATOS DE LA EMPRESA (TENANT) -->
            <div class="space-y-4">
              <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">1. Datos Comerciales de la Empresa</h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-slate-700">Nombre Comercial *</label>
                  <input 
                    type="text" 
                    formControlName="name" 
                    placeholder="ej. Boutique Elegance"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                    (input)="syncSubdomain($event)"
                  />
                  @if (f['name'].touched && f['name'].invalid) {
                    <p class="text-xs text-rose-500">El nombre comercial es obligatorio.</p>
                  }
                </div>

                <div class="space-y-1">
                  <label class="block text-xs font-medium text-slate-700">Razón Social Oficial *</label>
                  <input 
                    type="text" 
                    formControlName="business_name" 
                    placeholder="ej. Boutique Elegance S.R.L."
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                  @if (f['business_name'].touched && f['business_name'].invalid) {
                    <p class="text-xs text-rose-500">La razón social es obligatoria.</p>
                  }
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-slate-700">NIT / Identificación Fiscal *</label>
                  <input 
                    type="text" 
                    formControlName="nit_rut" 
                    placeholder="ej. 1020304050"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                  @if (f['nit_rut'].touched && f['nit_rut'].invalid) {
                    <p class="text-xs text-rose-500">Ingresa un NIT válido.</p>
                  }
                </div>

                <div class="space-y-1">
                  <label class="block text-xs font-medium text-slate-700">Subdominio Único (Slug) *</label>
                  <div class="relative flex items-center">
                    <input 
                      type="text" 
                      formControlName="subdomain" 
                      placeholder="elegance"
                      class="w-full rounded-lg border border-slate-200 pl-3 pr-28 py-2 text-sm text-slate-800 placeholder-slate-400 font-mono focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                    />
                    <span class="absolute right-3 text-xs text-slate-400 font-mono pointer-events-none">.fashionstore.app</span>
                  </div>
                  @if (f['subdomain'].touched && f['subdomain'].invalid) {
                    <p class="text-xs text-rose-500">Solo letras minúsculas, números y guiones (sin espacios).</p>
                  }
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-slate-700">Correo Electrónico de Contacto</label>
                  <input 
                    type="email" 
                    formControlName="email" 
                    placeholder="contacto@empresa.com"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>

                <div class="space-y-1">
                  <label class="block text-xs font-medium text-slate-700">Teléfono / WhatsApp</label>
                  <input 
                    type="text" 
                    formControlName="phone" 
                    placeholder="+591 70011223"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>
              </div>
            </div>

            <!-- SECCIÓN 2: PLAN DE SUSCRIPCIÓN COMERCIAL -->
            <div class="space-y-3">
              <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">2. Plan de Suscripción Inicial</h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <!-- Plan Básico -->
                <label 
                  class="relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all"
                  [ngClass]="f['plan_code'].value === 'basic' ? 'border-slate-900 bg-slate-50/60 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-300'"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-sm text-slate-900">Plan Básico</span>
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">$29 / mes</span>
                  </div>
                  <p class="text-xs text-slate-500 mt-2">Para tiendas emergentes con catálogo digital y POS offline.</p>
                  <ul class="mt-3 space-y-1 text-xs text-slate-600">
                    <li class="flex items-center gap-1.5 font-medium text-slate-700">
                      <span class="text-emerald-600 font-bold">✓</span> Hasta 2 sucursales activas
                    </li>
                    <li class="flex items-center gap-1.5 text-slate-400">
                      <span class="text-slate-400">✕</span> Sin módulo de IA Generativa
                    </li>
                  </ul>
                  <input type="radio" formControlName="plan_code" value="basic" class="sr-only" />
                </label>

                <!-- Plan Profesional -->
                <label 
                  class="relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all"
                  [ngClass]="f['plan_code'].value === 'pro' ? 'border-slate-900 bg-slate-50/60 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-300'"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-sm text-slate-900">Plan Profesional</span>
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">$99 / mes</span>
                  </div>
                  <p class="text-xs text-slate-500 mt-2">Cadenas textiles con analítica avanzada e IA generativa.</p>
                  <ul class="mt-3 space-y-1 text-xs text-slate-600">
                    <li class="flex items-center gap-1.5 font-medium text-slate-700">
                      <span class="text-emerald-600 font-bold">✓</span> Hasta 10 sucursales activas
                    </li>
                    <li class="flex items-center gap-1.5 font-medium text-indigo-700">
                      <span class="text-indigo-600 font-bold">✓</span> Gemini API por Voz y Predicción ML
                    </li>
                  </ul>
                  <input type="radio" formControlName="plan_code" value="pro" class="sr-only" />
                </label>

                <!-- Plan Empresarial -->
                <label 
                  class="relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all"
                  [ngClass]="f['plan_code'].value === 'enterprise' ? 'border-slate-900 bg-slate-50/60 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-300'"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-sm text-slate-900">Plan Empresarial</span>
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">$199 / mes</span>
                  </div>
                  <p class="text-xs text-slate-500 mt-2">Grandes retailers textiles, franquicias y multitienda.</p>
                  <ul class="mt-3 space-y-1 text-xs text-slate-600">
                    <li class="flex items-center gap-1.5 font-medium text-slate-700">
                      <span class="text-emerald-600 font-bold">✓</span> Hasta 20 sucursales activas
                    </li>
                    <li class="flex items-center gap-1.5 font-medium text-amber-800">
                      <span class="text-amber-600 font-bold">✓</span> Suite completa IA, ML y Soporte 24/7
                    </li>
                  </ul>
                  <input type="radio" formControlName="plan_code" value="enterprise" class="sr-only" />
                </label>
              </div>
            </div>

            <!-- SECCIÓN 3: CUENTA DE ADMINISTRADOR INICIAL -->
            <div class="space-y-4 pt-2 border-t border-slate-100">
              <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">3. Administrador General del Tenant</h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-slate-700">Nombre del Encargado *</label>
                  <input 
                    type="text" 
                    formControlName="admin_name" 
                    placeholder="Valeria Morales"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                  @if (f['admin_name'].touched && f['admin_name'].invalid) {
                    <p class="text-xs text-rose-500">Requerido.</p>
                  }
                </div>

                <div class="space-y-1">
                  <label class="block text-xs font-medium text-slate-700">Correo Electrónico (Login) *</label>
                  <input 
                    type="email" 
                    formControlName="admin_email" 
                    placeholder="admin@empresa.com"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                  @if (f['admin_email'].touched && f['admin_email'].invalid) {
                    <p class="text-xs text-rose-500">Correo inválido.</p>
                  }
                </div>

                <div class="space-y-1">
                  <label class="block text-xs font-medium text-slate-700">Contraseña Inicial *</label>
                  <input 
                    type="password" 
                    formControlName="admin_password" 
                    placeholder="Mín. 8 caracteres"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                  @if (f['admin_password'].touched && f['admin_password'].invalid) {
                    <p class="text-xs text-rose-500">Mínimo 8 caracteres.</p>
                  }
                </div>
              </div>
            </div>

            <!-- Footer con Acciones -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                (click)="close.emit()" 
                class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                [disabled]="submitting()"
                class="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                @if (submitting()) {
                  <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Aprovisionando...</span>
                } @else {
                  <span>Aprovisionar Empresa</span>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class TenantFormModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<Company>();

  private readonly fb = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);

  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    business_name: ['', [Validators.required, Validators.minLength(2)]],
    nit_rut: ['', [Validators.required, Validators.minLength(3)]],
    subdomain: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    email: ['', [Validators.email]],
    phone: [''],
    plan_code: ['basic' as 'basic' | 'pro' | 'enterprise', [Validators.required]],
    admin_name: ['', [Validators.required, Validators.minLength(2)]],
    admin_email: ['', [Validators.required, Validators.email]],
    admin_password: ['', [Validators.required, Validators.minLength(8)]],
  });

  get f() {
    return this.form.controls;
  }

  protected handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  protected syncSubdomain(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!this.form.controls.subdomain.dirty && input.value) {
      const generated = input.value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      this.form.controls.subdomain.setValue(generated);
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      toast.error('Corrige los campos obligatorios antes de continuar.');
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const dto: CompanyCreateDto = {
      name: raw.name.trim(),
      business_name: raw.business_name.trim(),
      nit_rut: raw.nit_rut.trim(),
      subdomain: raw.subdomain.trim().toLowerCase(),
      email: raw.email?.trim() || undefined,
      phone: raw.phone?.trim() || undefined,
      plan_code: raw.plan_code,
      admin_name: raw.admin_name.trim(),
      admin_email: raw.admin_email.trim().toLowerCase(),
      admin_password: raw.admin_password,
    };

    this.companyService.createCompany(dto).subscribe({
      next: (res) => {
        this.submitting.set(false);
        toast.success(`Empresa '${res.company.name}' aprovisionada con éxito.`);
        this.form.reset({ plan_code: 'basic' });
        this.created.emit(res.company);
        this.close.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        const detail = err.error?.detail || err.error?.message || 'Error al aprovisionar la empresa.';
        toast.error(detail);
      },
    });
  }
}
