# SESIÓN 2026-10-31: Poda Estratégica a 25 Casos de Uso, Políticas de Negocio y Configuración de Planes SaaS

---

## 1. Casos de Uso Involucrados
- **Consolidación General:** Reestructuración de la lista de Casos de Uso oficiales de 28 a **25 Casos de Uso definitivos**, eliminando redundancias y alineando al 100% con los 6 Retos del Examen de Sistemas 2 ([`docs/informes/Ex_Parcial_2_Sistemas-2.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/informes/Ex_Parcial_2_Sistemas-2.md)).
- **`CU02: Gestionar Planes de Suscripción y Cuotas de Sucursales`:**
  - Actualización de cuota de sucursales en Plan Básico: pasa de 2 a **3 sucursales activas**.
  - Inclusión oficial del **Plan Empresarial** (código `enterprise`, hasta 25 sucursales, IA completa, backup continuo).
- **`CU17: Registrar Cambio de Prenda por Talla y Cobro de Diferencia`:**
  - Consolidación de la regla de negocio: cobro obligatorio de diferencia de precio ($\Delta$) si la nueva prenda/talla tiene precio superior.
- **`CU18: Registrar Devolución de Prendas con Retención Operativa y Emisión de Nota de Crédito`:**
  - Formalización del mecanismo de retención (20%-50%) y emisión de Nota de Crédito Digital (`NC-YYYYMMDD-XXXX`) como Modalidad B de liquidación.

---

## 2. Cambios en Código Backend
- **Rutas de Planes ([`backend/app/packages/p0_saas_plataforma/routes/plan_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/routes/plan_routes.py)):**
  - Actualizada la siembra en memoria de planes oficiales:
    - BÁSICO: `max_branches = 3`, Bs 29/mes.
    - PROFESIONAL: `max_branches = 10`, Bs 99/mes, acceso a IA.
    - EMPRESARIAL: `max_branches = 25`, Bs 199/mes, acceso a IA y backup continuo.
- **Servicio de Tenants ([`backend/app/packages/p0_saas_plataforma/services/tenant_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/services/tenant_service.py)):**
  - Función `get_default_or_by_code_plan` actualizada para reconocer `enterprise` / `empresarial` con cuota de 25 sucursales y `basic` con cuota de 3 sucursales.
- **Servicio de Cuotas ([`backend/app/packages/p0_saas_plataforma/services/quota_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/services/quota_service.py)):**
  - Mensaje de excepción y fallback actualizado a cuota básica de 3 sucursales.
- **Script de Siembra SaaS ([`backend/seed_saas.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/seed_saas.py)):**
  - Actualización automática de `basic_plan.max_branches = 3`.
  - Agregada la creación / verificación del plan `enterprise` en la base de datos PostgreSQL.

---

## 3. Documentación Oficial Sincronizada
- [`docs/BUSINESS_POLICIES.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/BUSINESS_POLICIES.md): Redacción integral de políticas de gobernanza SaaS, políticas comerciales para los 2 tenants de prueba, especificación del formato de Nota de Crédito y diseño de checkboxes de consentimiento.
- [`docs/ACTORS_AND_USE_CASES.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ACTORS_AND_USE_CASES.md): Matriz de 25 CUs numerados secuencialmente, robustez ICONIX, trazas a tablas SQL (congeladas en migración `0044`).
- [`docs/ai/DECISIONS_LOG.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/DECISIONS_LOG.md): Registro 15 asentado.
- [`docs/ai/IMPLEMENTATION_PHASES.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/IMPLEMENTATION_PHASES.md): Checklist de entregas reordenado (P1: 8 CUs, P2: 10 CUs, P3: 7 CUs).
- [`docs/ai/CURRENT_STATE.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/CURRENT_STATE.md): Estado actualizado con 10 CUs 100% listos.
- [`docs/ai/NEXT_STEPS.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/NEXT_STEPS.md): Hoja de ruta para el bloque offline de la 2da presentación.
- [`docs/ai/HANDOFF_LATEST.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/HANDOFF_LATEST.md): Relevo operativo al 31/10/2026.

---

## 4. Comandos a Ejecutar al Iniciar Base de Datos
Cuando se levante el servicio PostgreSQL:
```bash
cd backend
.venv/Scripts/python.exe seed_saas.py
```
Este comando sincronizará en la tabla `plans` los 3 planes actualizados (`basic` con 3 sucursales, `pro` con 10, `enterprise` con 25).
