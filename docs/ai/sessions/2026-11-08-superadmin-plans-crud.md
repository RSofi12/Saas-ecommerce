# Sesión de Desarrollo — 08 de Noviembre de 2026: Gobernanza Completa de Suscripciones y Cuotas SaaS (CU02 & CU04)

## 1. Alcance y Caso de Uso Abordado
- **Casos de Uso:**
  - `CU02: Gestionar Planes de Suscripción y Cuotas Comerciales` (Superadmin)
  - `CU04: Gestionar Sucursales Bajo Límites del Plan` (Tenant Admin)
- **Presentación:** 2da y 3ra Presentación (Sistemas 2)
- **Normativa Oficial:** Sección 9.4 y 9.5 del pliego oficial de examen (`docs/informes/Ex_Parcial_2_Sistemas-2.md`).
- **Capas Afectadas:** Backend FastAPI (`p0_saas_plataforma`, `p1_gestion_usuarios_acceso`) y Frontend Web Angular 21 (PWA).

---

## 2. Cambios Implementados en Backend

1. **Gestión de Planes Comerciales (`p0_saas_plataforma`):**
   - Endpoints completos CRUD en [`plan_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/routes/plan_routes.py): `GET /saas/plans?include_inactive=true`, `GET /saas/plans/{id}`, `POST /saas/plans`, `PUT /saas/plans/{id}`, `PATCH /saas/plans/{id}/status`, `DELETE /saas/plans/{id}`.
   - Techo máximo de sucursales del Plan EMPRESARIAL actualizado a **223 sucursales**.
2. **Gestión de Vigencias y Estado de Suscripción (`p0_saas_plataforma`):**
   - Esquemas [`subscription_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/schemas/subscription_schema.py): soporte para `start_date`, `end_date`, `status` (`ACTIVA`, `VENCIDA`, `CANCELADA`) en `SubscriptionCreate` y `SubscriptionUpdate`.
   - Endpoint `PUT /saas/subscriptions/{subscription_id}` en [`subscription_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/routes/subscription_routes.py) para actualizar vigencia y estado con protección de degradación (*Downgrade Guard*).
   - `GET /saas/subscriptions/company/{id}` retorna la suscripción más reciente para permitir al Superadmin auditar planes vencidos.
3. **Gobernanza Técnica de Cuotas en Sucursales (`p1_gestion_usuarios_acceso`):**
   - En [`branch_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/services/branch_service.py) y [`branch_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/schemas/branch_schema.py):
     - `get_branch_quota` expone `has_ai_access`, `subscription_status` y `end_date`.
     - Si la suscripción se encuentra `VENCIDA`, `can_create_branch` se evalúa inmediatamente a `False` y `remaining_slots` a `0`.

---

## 3. Cambios Implementados en Frontend Web (Angular 21)

1. **Módulo de Gestión de Planes Master SaaS (`/app/superadmin/plans`):**
   - Vista [`plans-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/superadmin/pages/plans-page.component.ts) bajo directrices `/design-taste-frontend` (`app-screens.md`).
   - Modal reactivo [`plan-form-modal.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/superadmin/components/plan-form-modal.component.ts).
   - Pestañas superiores en [`tenants-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/superadmin/pages/tenants-page.component.ts) y enlace en la barra lateral de [`app-shell.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/layouts/app-shell.component.ts).
2. **Modal de Suscripción con Simulación Administrativa ([`subscription-modal.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/superadmin/components/subscription-modal.component.ts)):**
   - Visualización del plan actual, vigencia y estado (`ACTIVA`, `VENCIDA`, `CANCELADA`).
   - Selector interactivo de fecha de vencimiento (`end_date`) y estado.
   - **Botones de Simulación Rápida de Defensa (Cátedra 9.5):**
     - `+30 Días (Mensual)`: Fija `end_date = hoy + 30 días` y `status = ACTIVA`.
     - `+1 Año (Anual)`: Fija `end_date = hoy + 365 días` y `status = ACTIVA`.
     - `Simular Vencimiento`: Fija `end_date = ayer` y `status = VENCIDA` para demostrar el bloqueo ante la docente.
3. **Widget Visual de Cuota en Panel del Tenant Admin ([`admin-branch-page.component.html`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/admin/pages/admin-branch-page.component.html)):**
   - Tarjeta ejecutiva con consumo porcentual y honesto de sucursales.
   - Badges sobrios de Plan Comercial, Estado de Suscripción (`Activa` vs `Vencida`), y facultad de IA (`Gemini RAG + ML`).
   - Banner de advertencia adaptativo cuando la cuota está copada o cuando la suscripción ha vencido.

---

## 4. Verificación y Calidad de Pruebas

- **Backend Pytest:**
  - [`backend/tests/test_cu04_branch_quota_release.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu04_branch_quota_release.py): **6/6 pruebas PASSED (100%)**.
  - [`backend/tests/test_cu02_subscription_management.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu02_subscription_management.py): **4/4 pruebas PASSED (100%)**.
