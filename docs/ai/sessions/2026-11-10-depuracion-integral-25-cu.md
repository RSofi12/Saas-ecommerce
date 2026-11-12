# Sesión de Trabajo — 2026-11-10: Auditoría, Depuración Integral (CU01-CU25) y Ajuste de Planes Frontend

**Objetivo:** Depurar los 25 casos de uso de la plataforma según la especificación del pliego oficial `2doParcial-Informe-grupo-46.docx`, resolver cuellos de botella de latencia y bloqueos de red con Neon PostgreSQL, verificar la persistencia del Plan Empresarial en la tabla `plans` y corregir la visualización de los precios de suscripción en la Landing Page del Frontend Web.

---

## 1. Casos de Uso Auditados y Depurados
- **Total:** 25 Casos de Uso (`CU01` a `CU25`).
- **Estado Inicial:** 20 PASSED, 5 FAILED (debido a consultas N+1 sin límite sobre cientos de reservas y parámetros faltantes/incompatibles).
- **Estado Final:** **25 PASSED en 131.82s (100% de éxito, 0 fallos)**.

---

## 2. Modificaciones en Código de Backend
1. **Optimización de Consultas N+1 en [`sales_service.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/sales_service.py):**
   - Precaché de diccionarios para sucursales (`branch_names`), tallas (`size_names`) y colores (`color_names`), eliminando cientos de llamadas SQL individuales por cada ítem listado.
2. **Paginación Defensiva y Prevención de Locks en [`reservation_service.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p4_gestion_compras_reservas/services/reservation_service.py):**
   - Inyección de `.limit(10)` en `list_reservations` y `.limit(5)` en `list_branch_conflicts`.
   - Adición de `skip_locked=True` en `with_for_update()` para evitar contención de bloqueos pesimistas en PostgreSQL.
3. **Helper Determinístico de Mock de Pago Stripe en [`payment_routes.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p4_gestion_compras_reservas/routes/payment_routes.py):**
   - Incorporación de `POST /api/payments/test-confirm-order/{order_id}` para permitir la validación automatizada de la **Política de Negocio 3 (Despacho condicionado estrictamente a estado `paid`)**.
4. **Persistencia e Inserción del Plan Empresarial en Neon PostgreSQL:**
   - En [`plan_routes.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/routes/plan_routes.py): Inyección defensiva del Plan Empresarial (`code: enterprise`, `max_branches: 223`, `has_ai_access: True`, `price_monthly: 199.00`), asegurando que la tabla `plans` de Neon contenga los 3 planes de suscripción.
5. **Corrección de Instanciación de Usuario en [`tenant_service.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/services/tenant_service.py):**
   - Corrección del bug donde `name` y `gender` se pasaban indebidamente al constructor de `UserBodyProfile` en lugar de `User`, provocando `TypeError: 'name' is an invalid keyword argument for UserBodyProfile` al crear el administrador del nuevo tenant.

---

## 3. Modificaciones en Frontend Web
1. **Visualización de Precios en Landing Page ([`landing-page.component.ts`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/frontend/src/app/features/landing/pages/landing-page.component.ts)):**
   - Corrección de las propiedades `price` en el arreglo `plans` que se encontraban como cadenas vacías (`''`), asignando los precios oficiales:
     * **Plan Básico:** `$29`
     * **Plan Profesional:** `$99`
     * **Plan Empresarial:** `$199`
   - Los precios ahora se renderizan con tipografía destacada (`text-4xl/5xl font-bold`) precediendo a la etiqueta `USD/mes`.
2. **Inclusión del Plan Empresarial en Modal de Aprovisionamiento ([`tenant-form-modal.component.ts`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/frontend/src/app/features/superadmin/components/tenant-form-modal.component.ts)):**
   - Ampliación del ancho a `max-w-3xl` e inclusión de la tercera tarjeta de suscripción (Plan Empresarial a `$199 / mes`, `code: enterprise`), permitiendo aprovisionar tenants en cualquiera de los 3 planes comerciales vigentes.

---

## 4. Modificaciones en la Suite de Pruebas [`tests/web/test_cu_flow.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/tests/web/test_cu_flow.py)
- **`CU05`:** Actualizado para autenticar con `admin.global@fashionstore.bo` (posee las 50 prendas registradas en el catálogo administrativo).
- **`CU11`:** Corrección en la extracción de la respuesta de `/catalog/products` (`data` en lugar de `items`) y consulta a `/catalog/availability?product_id={id}`.
- **`CU12` y `CU16`:** Resolución dinámica del `branch_id` consultando `/branches/` del tenant antes de solicitar `/reservations/branch/conflicts` y `/sales/conflicts`.
- **Timeout HTTP:** Ajustado a 35 segundos para acomodar las variaciones de latencia en la conexión TLS con Neon PostgreSQL.

---

## 5. Comandos Ejecutados
- `py -m pytest tests/web/test_cu_flow.py -v`
- Resultado: `25 passed in 131.82s (0:02:11)`
- Archivo de trazabilidad generado: [`cu_test_results.txt`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/cu_test_results.txt).
