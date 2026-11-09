# Bitácora de Sesión: 2026-11-02 — Implementación CU14 (Gestionar Bandeja Local de Operaciones Pendientes - Outbox PWA / SQLite)

### 1. Caso de Uso Implementado
- **`CU14`: Gestionar Bandeja Local de Operaciones Pendientes (Outbox PWA / SQLite)**
- **Módulos Afectados:** Backend (`p5_gestion_ventas_pos`), Frontend Web PWA (Angular 21 en `/app/cajero/caja`), Almacenamiento IndexedDB y Suites de Pruebas.

---

### 2. Cambios en Backend (`p5_gestion_ventas_pos`)
- **Schemas (`sales_schema.py`):**
  - Creado `OfflineStatusCheckRequest`: recibe lista de `client_sale_ids: list[UUID]`.
  - Creado `OfflineStatusCheckResponse`: retorna `status_map: dict[str, str]` asociando cada UUID con `'synced'` o `'pending'`.
  - Exportados en `schemas/__init__.py`.
- **Servicios (`sales_service.py`):**
  - Implementado `check_offline_sales_status(db, client_sale_ids, tenant_id)`: consulta rápida para reconciliación en bloque de estado sin mutar stock ni ventas.
  - Exportado en `services/__init__.py`.
- **Rutas (`sales_routes.py`):**
  - Implementado endpoint `POST /api/sales/offline/check-status` autenticado y filtrado estrictamente por `tenant_id`.
- **Pruebas Automatizadas:**
  - Creada suite [`backend/tests/test_cu14_outbox_operations.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu14_outbox_operations.py) cubriendo:
    1. Retorno de estado `pending` para ventas no existentes en backend.
    2. Retorno de estado `synced` para ventas ya consolidadas.
    3. Manejo de lotes mixtos.
    4. Aislamiento multitenant estricto (previene inferir estado entre empresas diferentes).
  - Resultado: **4/4 pruebas PASSED (100%)**.

---

### 3. Cambios en Frontend Web PWA (Angular 21)
- **Almacenamiento Local IndexedDB ([`idb-sales.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/offline/idb-sales.service.ts)):**
  - Agregados métodos auxiliares: `getPendingOnly()`, `getSyncedOnly()`, `getTotalPendingCash()`, `markAsError()`, `clearSynced()`.
- **Servicio API ([`sales-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/services/sales-api.service.ts)):**
  - Implementado `checkOfflineStatus(clientSaleIds: string[])`.
- **Componente y Plantilla ([`caja-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.ts) & [`caja-page.component.html`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.html)):**
  - Navegación segmentada entre TPV Principal y Bandeja Outbox Local con badge dinámico de comprobantes en cola.
  - 3 tarjetas de métricas en vivo: Efectivo en Gaveta Offline (`totalPendingCash()`), Comprobantes en Bandeja y Estado de Conexión.
  - Barra de herramientas con sincronización de lote (`syncAllPending()`), verificación con servidor (`checkOutboxStatusWithServer()`), purga de comprobantes sincronizados (`clearSyncedFromOutbox()`) y recarga.
  - Tabla de comprobantes con visualización de ticket (`TCK-OFF-XXXXXX`), UUIDv4 select-all, prendas, cobro de efectivo, cambio entregado, total y acciones (ver ticket térmico, sincronizar individual y descartar).
  - Estado vacío elegante cuando la bandeja está limpia.
- **Verificación de Compilación:**
  - Ejecutado `npx tsc --noEmit` en `frontend/`: **0 errores de compilación**.

---

### 4. Pruebas de Caja Negra Actualizadas
- En [`docs/informes/PRUEBAS_CAJA_NEGRA.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/informes/PRUEBAS_CAJA_NEGRA.md):
  - Actualizada la sección del `CU14` con 4 casos de prueba reales en formato canónico de 8 columnas (`CP-CU14-01` a `CP-CU14-04`).
  - Total consolidado: 69 casos de prueba formalizados (100% aprobados).

---

### 5. Comandos de Verificación
- Backend:
  ```bash
  cd backend
  .venv/Scripts/pytest.exe tests/test_cu14_outbox_operations.py
  ```
- Frontend:
  ```bash
  cd frontend
  npx tsc --noEmit
  ```
