# Sesión de Trabajo: 2026-11-11 - Downgrade Guard de Suscripciones SaaS (CU02/CU04)

## 1. Motivo y Diagnóstico
- **Consulta del usuario:** Se reportó que al intentar degradar un tenant de Plan Profesional a Plan Básico, no se visualizó restricción de cuota de sucursales activas.
- **Diagnóstico:**
  - Al revisar la imagen adjunta por el usuario, el modal abierto correspondía a **Boutique París S.R.L.** (`boutique-par-s-s-r-l`), la cual posee **0 sucursales activas**; por ende, cualquier plan (incluso Básico con cuota de 2 sedes) era permitido legítimamente.
  - El tenant con **3 sucursales activas** es **Boutique Elegance** (`elegance`).
  - Aunque el Backend ya contaba con la validación de negocio en `POST /saas/subscriptions` y `PUT /saas/subscriptions/{id}` retornando HTTP 400 Bad Request, en el Frontend el modal no mostraba de forma anticipada las sucursales activas del tenant ni advertía visualmente qué planes estaban bloqueados por exceder la cuota antes de intentar enviar el formulario.

## 2. Cambios Implementados

### Backend (FastAPI / Pydantic)
- **`backend/app/packages/p0_saas_plataforma/schemas/subscription_schema.py`:**
  - Se agregó el campo `active_branches_count: int | None = 0` al esquema `SubscriptionRead`.
- **`backend/app/packages/p0_saas_plataforma/routes/subscription_routes.py`:**
  - En el endpoint `GET /saas/subscriptions/company/{company_id}`, se calcula dinámicamente el conteo de sucursales activas (`db.query(Branch).filter(Branch.tenant_id == company_id, Branch.is_active.is_(True)).count()`) y se adjunta a la respuesta serializada.

### Frontend Web (Angular 21)
- **`frontend/src/app/core/models/company.model.ts`:**
  - Se actualizó la interfaz `Subscription` incorporando la propiedad opcional `active_branches_count?: number`.
- **`frontend/src/app/features/superadmin/components/subscription-modal.component.ts`:**
  - **Indicador de Sucursales:** Se añadió en el resumen superior del modal la tarjeta `Sedes Activas: X sucursales` para visibilidad inmediata del estado del tenant.
  - **Detección Preventiva de Downgrade:** Al seleccionar un plan que tenga `max_branches < activeBranchesCount`:
    - Se despliega una etiqueta visual en la tarjeta del plan: `Excede cuota`.
    - La tarjeta se resalta en tono de advertencia/restricción (`border-rose-300 bg-rose-50/40`).
    - Se emite de inmediato el banner de advertencia `Restricción de Negocio (Downgrade Guard)` indicando la cantidad de sedes activas y la cuota máxima permitida.
    - Se desactiva el botón de guardado `[disabled]="isSubmitDisabled()"` y se previene el submit en cliente como doble capa de seguridad ante el backend.

## 3. Pruebas y Verificación
- API `GET /api/saas/subscriptions/company/{elegance_id}` retorna: `Plan: PROFESIONAL`, `active_branches_count: 3`.
- Intento de degradación en Backend hacia `Plan Básico` (max 2): responde HTTP 400 con mensaje explicativo `"No se puede cambiar al plan BASICO. La empresa tiene 3 sucursales activas y el plan permite un máximo de 2."`
- Compilación del frontend Angular 21: Exitosa en 0.9 segundos.

