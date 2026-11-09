# Bitácora de Sesión: 2026-11-03 — Implementación de CU15 (Sincronizar Lotes de Ventas con Idempotencia Central en sync_operations)

### Metadatos
- **Fecha:** 2026-11-03
- **Caso de Uso:** `CU15: Sincronizar Lotes de Ventas con Idempotencia Central (sync_operations)`
- **Autor/Rol:** Arquitecto de Software / Fullstack AI Assistant
- **Módulo Afectado:** `p5_gestion_ventas_pos` (Backend) y `/app/cajero/caja` (Frontend Web PWA)
- **Estado:** 100% Implementado y Verificado (Backend, Frontend y Pruebas de Caja Negra)

---

## 1. 🎯 Objetivo del Caso de Uso
Consolidar de manera atómica, tolerante a fallos de red y estrictamente idempotente los lotes de transacciones de venta generadas offline en los terminales POS (PWA/SQLite) mediante el endpoint centralizado `POST /api/sales/offline/batch-sync`.
Garantizar que ningún reintento por problemas de comunicación duplique ventas ni descuente inventario por segunda vez, asentando cada UUIDv4 en la tabla `sync_operations` y desacoplando cleanly la sobreventa concurrente para el tratamiento asistido en `CU16`.

---

## 2. 🛠️ Cambios Implementados

### A. Backend (`backend/app/packages/p5_gestion_ventas_pos/`)
1. **Esquemas Pydantic v2 ([`sales_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/sales_schema.py)):**
   - `BatchSyncItemSchema`: validación de `variant_id`, `quantity > 0` y `unit_price`.
   - `BatchSyncOperationSchema`: validación de `client_sale_id` (UUIDv4), `total_amount > 0`, `is_offline = True` y cumplimiento incondicional de la **Política 5** (pago en efectivo exclusivo: `payment_method == "cash"`).
   - `BatchSyncRequest`: sucursal y lista de operaciones en lote.
   - `BatchSyncSummary`: conteo consolidado de `total_received`, `applied`, `duplicates_ignored` y `conflicts`.
   - `BatchSyncItemResult` y `BatchSyncResponse`: detalle y reporte por UUID.
   - Exportación limpia en `schemas/__init__.py`.

2. **Capa de Servicio ([`sales_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/sales_service.py)):**
   - Función `batch_sync_offline_sales(db, payload, tenant_id)`:
     - Validación contra `SyncOperation.client_operation_id` y `Sale.client_sale_id` en el ámbito exclusivo del `tenant_id`.
     - Si ya existe el UUID: respuesta inmediata `duplicate_ignored`, suma a `duplicates_ignored` y retorno en `processed_uuids` sin alterar stock.
     - Bloqueo pesimista `with_for_update()` sobre cada fila de `Inventory` por variante.
     - Si hay stock suficiente: crea `Sale` con `is_offline = True`, descuenta stock, crea `SaleItem`, crea `InventoryMovement` (`outcome`) y persiste `SyncOperation` con `status = "PROCESADA"`.
     - Si hay quiebre de stock sobrevenido (sobreventa en contingencia): aplica la venta reconociendo la entrega física, lleva el stock a negativo (-1) para trazabilidad de reposición, marca `is_conflict = True`, asienta `SyncOperation` con `status = "EN_CONFLICTO"` y reporta en `conflict_uuids` para conciliación asistida en `CU16`.
   - Exportación en `services/__init__.py`.

3. **Ruta API ([`sales_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/routes/sales_routes.py)):**
   - Endpoint `POST /api/sales/offline/batch-sync` documentado con respuesta `ApiResponse[BatchSyncResponse]`.

4. **Suite de Pruebas Unitarias ([`backend/tests/test_cu15_batch_sync_idempotency.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu15_batch_sync_idempotency.py)):**
   - `test_batch_sync_happy_path`: sincronización atómica exitosa de lote.
   - `test_batch_sync_idempotency_duplicate_resend`: reenvío del mismo lote no duplica ventas ni descuenta stock.
   - `test_batch_sync_mixed_batch`: lote mixto (nuevas + duplicadas).
   - `test_batch_sync_multitenant_isolation`: aislamiento estricto entre tenants.
   - `test_batch_sync_empty_operations`: validación de lote vacío.

### B. Frontend Web PWA Angular ([`frontend/src/app/features/cajero/pages/`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/))
1. **Modelos y API ([`sale.model.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/models/sale.model.ts) y [`sales-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/services/sales-api.service.ts)):**
   - Definición de tipos `BatchSyncItem`, `BatchSyncOperation`, `BatchSyncRequest`, `BatchSyncSummary`, `BatchSyncItemResult`, `BatchSyncResponse`.
   - Método `batchSyncSales(payload: BatchSyncRequest): Observable<ApiResponse<BatchSyncResponse>>`.

2. **Controlador POS ([`caja-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.ts)):**
   - Refactorización de `syncAllPending()` para despachar el lote unificado al endpoint `/api/sales/offline/batch-sync`.
   - Conciliación reactiva en memoria local: para cada UUID procesado, invoca `IdbSalesService.markAsSynced(uuid)`.
   - Manejo de estados de conflicto y error mediante `lastBatchSyncSummary` y `lastBatchSyncDetails`.

3. **Template HTML ([`caja-page.component.html`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.html)):**
   - Aplicación estricta de directrices `/frontend-design`:
   - Panel de auditoría de sincronización de lote con 4 tarjetas de métricas claras: Recibidos, Consolidadas, Duplicados Descartados (Idempotencia) y Conflictos de Stock.
   - Tabla interactiva con desglose por UUID, badge de estado en el servidor y mensaje de auditoría.
   - Botón de cierre y persistencia visual limpia sin distracciones.

---

## 3. 🧪 Pruebas y Verificaciones Ejecutadas

1. **Backend Tests (Pytest):**
   ```powershell
   backend/.venv/Scripts/pytest.exe backend/tests/test_cu15_batch_sync_idempotency.py backend/tests/test_cu13_offline_pos_sales.py backend/tests/test_cu14_outbox_operations.py -v
   ```
   **Resultado:** 14/14 passed (100%) en 11.56s.

2. **Frontend Type-check:**
   ```powershell
   ./frontend/node_modules/.bin/tsc.cmd -p ./frontend/tsconfig.app.json --noEmit
   ```
   **Resultado:** 0 errores de compilación TypeScript.

3. **Informe de Pruebas de Caja Negra ([`PRUEBAS_CAJA_NEGRA.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/informes/PRUEBAS_CAJA_NEGRA.md)):**
   - Actualizado a 70 casos de prueba formalizados al 100% de aprobación.
   - Ficha técnica completa de CU15 en estructura canónica de 8 columnas (`CP-CU15-01` a `CP-CU15-04`).

---

## 4. 🚀 Comandos de Despliegue / Verificación
```powershell
# Backend
cd backend
.venv\Scripts\pytest tests\test_cu15_batch_sync_idempotency.py -v

# Frontend
cd frontend
./node_modules/.bin/tsc.cmd -p tsconfig.app.json --noEmit
```
