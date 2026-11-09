# Bitácora de Sesión: 2026-11-02 — Implementación Fullstack de Suite POS: CU13 (Venta Desconectada en Efectivo) y CU18 (Devolución con Retención Operativa y Nota de Crédito)

**Fecha:** 2 de Noviembre de 2026  
**Autor:** Agente Antigravity / Senior Software Architect  
**Casos de Uso:**  
- `CU13: Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4` (Presentación 2 - Bloque B)  
- `CU18: Procesar Devolución de Prenda con Retención Operativa (20%–50%) y Nota de Crédito` (Presentación 2 - Bloque C)  
**Estado:** 100% Implementados, Verificados en Backend y Frontend, con Pruebas Automatizadas y Modelado UML en Enterprise Architect v15.

---

## 1. Alcance y Políticas de Negocio Aplicadas

Durante esta jornada se consolidó la operatividad integral de mostrador para el punto de venta (POS) físico y multitenant, integrando dos pilares comerciales y normativos:

### A. Política Comercial 5 (Ventas Offline en Efectivo - CU13)
1. **Cobro Exclusivo en Efectivo:**
   - Toda venta ejecutada en modo desconectado debe cobrarse estrictamente en efectivo (`cash`).
   - La API y esquemas Pydantic rechazan de forma inviolable cualquier intento de pago electrónico o tarjeta en modo offline (`HTTP 422 Unprocessable Entity`).
2. **Idempotencia Transaccional Central por UUIDv4:**
   - La PWA genera un identificador único de contingencia (`client_sale_id: UUIDv4`) en el cliente.
   - Si la red cae o se reintenta el envío de la misma venta, el backend detecta el `client_sale_id` existente y confirma la transacción sin duplicar ventas ni re-descontar inventario.
3. **Persistencia Local en Navegador (IndexedDB):**
   - Servicio `IdbSalesService` (`fashionstore_local_db` v2) con almacén `pending_offline_sales`.

### B. Política Comercial 2 (Devoluciones con Retención Operativa - CU18 / P-Ten-03)
1. **Retención Operativa por Tenant:**
   - La plataforma restringe la tasa de retención $R$ al rango $[20\%, 50\%]$.
   - Boutique Elegance: $R = 30\%$, reembolso neto al cliente $70\%$, plazo máx. 7 días.
   - Moda Urbana: $R = 20\%$, reembolso neto al cliente $80\%$, plazo máx. 15 días.
   - Por defecto: $R = 20\%$, plazo máx. de 30 días.
2. **Condición de Prenda Inviolable:**
   - Solo se aceptan prendas en estado intacto con etiqueta original adherida (`good_with_tags`). Prendas usadas o sin etiqueta son rechazadas (`HTTP 400 Bad Request`).
3. **Reingreso Físico Atómico de Stock:**
   - Reingreso de la prenda devuelta a la tabla `inventory` (`quantity += 1`) con bloqueo pesimista (`with_for_update`) contra condiciones de carrera.
4. **Modalidades de Liquidación:**
   - **Nota de Crédito Digital:** Emisión de código único formal `NC-YYYYMMDD-XXXX`.
   - **Efectivo en Mostrador:** Reembolso inmediato de caja.
5. **Auditoría y Trazabilidad:**
   - Registro en la tabla `garment_returns` vinculada a venta, sucursal, usuario y tenant.

---

## 2. Modificaciones en Backend (`p5_gestion_ventas_pos`)

### A. Schemas Pydantic v2
* [`backend/app/packages/p5_gestion_ventas_pos/schemas/sales_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/sales_schema.py):
  - Inclusión de `client_sale_id: UUID | None`, `is_offline: bool` y `synced_at: datetime | None`.
  - Validador `@field_validator('payment_method')` que exige `cash` si `is_offline = True`.
* [`backend/app/packages/p5_gestion_ventas_pos/schemas/return_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/return_schema.py):
  - `RefundMethodEnum`: `NOTA_CREDITO`, `EFECTIVO`.
  - `ReturnQuoteRequest`, `ReturnQuoteResponse`, `GarmentReturnCreate`, `GarmentReturnResponse`.

### B. Servicios de Dominio
* [`backend/app/packages/p5_gestion_ventas_pos/services/sales_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/sales_service.py):
  - Detección de duplicados por `client_sale_id` y `tenant_id` para garantizar idempotencia.
* [`backend/app/packages/p5_gestion_ventas_pos/services/return_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/return_service.py):
  - `_get_tenant_return_policy(company)`, `generate_credit_note_code(tenant_id)`.
  - `quote_garment_return(...)`: Cotización en vivo con validación de tenant y desglose $R$.
  - `process_garment_return(...)`: Transacción atómica completa con `with_for_update`, validación de `good_with_tags`, plazo de devolución e inserción en `garment_returns`.

### C. Endpoints REST y Montaje
* [`backend/app/packages/p5_gestion_ventas_pos/routes/sales_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/routes/sales_routes.py): Rutas de venta con soporte offline e idempotencia.
* [`backend/app/packages/p5_gestion_ventas_pos/routes/return_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/routes/return_routes.py):
  - `POST /api/returns/quote`: Cotización previa de retención y reembolso.
  - `POST /api/returns`: Procesamiento de la devolución y emisión de nota de crédito / efectivo.
  - `GET /api/returns`: Listado histórico de devoluciones con filtro por sucursal.
* [`backend/app/packages/p5_gestion_ventas_pos/router.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/router.py): Montaje unificado de `sales_router` y `return_router`.

---

## 3. Modificaciones en Frontend Web PWA (Angular 21)

* **Servicio de Almacenamiento Local:**
  - [`frontend/src/app/core/offline/idb-sales.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/offline/idb-sales.service.ts): Gestión IndexedDB para cola de ventas desconectadas.
* **Modelos y API:**
  - [`frontend/src/app/features/shared/models/sale.model.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/models/sale.model.ts) y [`frontend/src/app/features/shared/services/sales-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/services/sales-api.service.ts): Modelos de venta offline, cotización y procesamiento de devoluciones.
* **Componente de Caja POS (`/app/cajero/caja` con `/frontend-design`):**
  - **Ventas Desconectadas (CU13):**
    - Indicador de estado de red reactivo (`NetworkStatusService`).
    - Bloqueo visual de métodos electrónicos en desconexión, forzando Efectivo.
    - Calculadora en vivo de efectivo recibido y cambio a devolver con atajos (+Bs 20, +Bs 50, +Bs 100, +Bs 200).
    - Generación de UUIDv4 en cliente y modal de comprobante térmico de contingencia (`TCK-OFF-XXXXXX`).
  - **Devoluciones de Prendas (CU18):**
    - Botón "Devolución" en cabecera del POS.
    - Modal de búsqueda de venta original, inspección de etiquetas y cotizador interactivo en tiempo real con tarjeta de desglose financiero ($R=20\%-50\%$, Reembolso Neto).
    - Selector de modalidad de liquidación (`Nota de Crédito` o `Efectivo en Caja`).
    - Modal de comprobante boutique con visualización de Nota de Crédito digital (`NC-YYYYMMDD-XXXX`).
  - Verificación TypeScript: `npx tsc --noEmit` completada con **0 errores**.

---

## 4. Modelado UML para Enterprise Architect v15 (JScript)

Se crearon y actualizaron los scripts oficiales bajo el estándar ICONIX de la cátedra con arquitectura BCE pura:

1. **CU11 (Reserva Offline):**
   - [`docsUML/CUrobustez/CU11_comm_reserva_offline_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU11_comm_reserva_offline_EA.js)
   - [`docsUML/CUSecuencia/CU11_secuencia_reserva_offline_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU11_secuencia_reserva_offline_EA.js)
2. **CU12 (Conflictos de Reservas Expiradas):**
   - [`docsUML/CUrobustez/CU12_comm_resolver_conflictos_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU12_comm_resolver_conflictos_EA.js)
   - [`docsUML/CUSecuencia/CU12_secuencia_resolver_conflictos_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU12_secuencia_resolver_conflictos_EA.js)
3. **CU18 (Devolución de Prenda con Retención y Nota de Crédito):**
   - [`docsUML/CUrobustez/CU18_comm_devolucion_prenda_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU18_comm_devolucion_prenda_EA.js)
   - [`docsUML/CUSecuencia/CU18_secuencia_devolucion_prenda_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU18_secuencia_devolucion_prenda_EA.js)
   - **Actores:** `Cliente` (iniciador presencial y decisor) y `Cajero` (operador POS y verificador físico).
   - **Fronteras:** `CajaPageComponent`, `ModalDevolucionPrenda`, `ModalComprobanteNotaCredito`.
   - **Controladores:** `ReturnRoutes` (API REST FastAPI) y `ReturnService` (Servicio de Dominio).
   - **Entidades:** `Sale`, `Company`, `Inventory`, `GarmentReturn`.

---

## 5. Pruebas y Verificaciones

1. **Suite CU13 (Ventas Offline):**
   - Archivo: [`backend/tests/test_cu13_offline_pos_sales.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu13_offline_pos_sales.py)
   - Pruebas (5/5 PASSED):
     - `test_01_create_online_sale_success`: PASSED
     - `test_02_offline_sale_rejects_non_cash_payment`: PASSED (HTTP 422)
     - `test_03_create_offline_cash_sale_success`: PASSED
     - `test_04_idempotent_offline_sync_does_not_double_deduct_inventory`: PASSED
     - `test_05_multitenant_isolation_and_missing_client_id_validation`: PASSED

2. **Suite CU18 (Devolución con Retención):**
   - Archivo: [`backend/tests/test_cu18_garment_return.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu18_garment_return.py)
   - Pruebas (8/8 PASSED):
     - `test_01_quote_return_with_30_percent_retention`: PASSED
     - `test_02_quote_return_with_20_percent_retention`: PASSED
     - `test_03_process_return_credit_note_success`: PASSED
     - `test_04_process_return_cash_success`: PASSED
     - `test_05_return_fails_if_damaged_or_no_tags`: PASSED (HTTP 400)
     - `test_06_return_fails_if_expired_deadline`: PASSED (HTTP 400)
     - `test_07_multitenant_isolation`: PASSED
     - `test_08_list_returns_history`: PASSED

3. **Suite de Regresión Completa:**
   - 26 tests en total ejecutados (`test_cu04`, `test_cu10`, `test_cu17`, `test_cu18`): **26/26 PASSED in 15.41s**.
