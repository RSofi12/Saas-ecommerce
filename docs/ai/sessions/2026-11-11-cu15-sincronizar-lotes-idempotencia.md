# Sesión: 2026-11-11 - Verificación y Validación CU15 (Sincronizar Lotes de Ventas con Idempotencia Central)

## 1. Identificación del Caso de Uso
- **Caso de Uso:** `[CU15] Sincronizar Lotes de Ventas con Idempotencia Central (sync_operations)`
- **Actor:** Cajera de Sucursal (`cajera.lp@fashionstore.bo` / `Tiendafashion123!`)
- **Rol:** `RolEnum.cajero`
- **Tenant:** Boutique Elegance (`17eeb457-a34c-47a4-8826-5d9e03d1dfe5`)
- **Sucursal:** Sucursal La Paz (`8ba6f37b-10d8-4fde-8b39-a1eee44f1922`)
- **URL de Acceso:** `http://localhost:4200/app/cajero/caja` (Pestaña "Bandeja Outbox Local")

---

## 2. Modificaciones Realizadas

### Frontend (Angular 21 PWA):
- **Archivo:** [`frontend/src/app/features/cajero/pages/caja-page.component.html`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.html)
  - Se añadió la insignia de estado verde cuando la conexión a Internet se restablece: `CONEXIÓN RESTABLECIDA` (reemplazando el texto genérico para cumplir exactamente con el resultado esperado de la especificación).
  - Se actualizó la etiqueta del botón en la bandeja Outbox a: `Sincronizar Lote Pendiente ({{ pendingSales().length }})`.
- **Archivo:** [`frontend/src/app/features/cajero/pages/caja-page.component.ts`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.ts)
  - Se afinó el mensaje de notificación de éxito: `Todas las operaciones sincronizadas con éxito (${summary.applied} aplicadas, ${summary.duplicates_ignored} duplicadas descartadas con idempotencia)`.

---

## 3. Verificación de Idempotencia y Lote Central

### Backend Endpoint: `POST /api/sales/offline/batch-sync`
- **Blindaje Transaccional e Idempotencia:**
  1. Cada venta offline enviada contiene un `client_sale_id` (UUIDv4) único generado en la terminal PWA.
  2. El servicio `batch_sync_offline_sales` consulta previamente `sync_operations.client_operation_id` y `Sale.client_sale_id`.
  3. Si el identificador ya fue procesado con anterioridad, se marca de inmediato como `duplicate_ignored` con el mensaje `"Operación previamente procesada e idempotente."`.
  4. La respuesta HTTP 200 devuelve el UUID en `processed_uuids` para que el cliente PWA marque la venta como sincronizada en su IndexedDB local, pero **NO** genera un nuevo registro en `sales` ni descuenta existencias en `inventory` una segunda vez.

---

## 4. Pruebas Automatizadas Ejecutadas
- **Script de Validación:** [`run_cu15_test.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/run_cu15_test.py)
- **Resultados:**
  - Login exitoso con `cajera.lp@fashionstore.bo`.
  - Simulación de conexión activa y detección del banner verde `[CONEXIÓN RESTABLECIDA]`.
  - Envío #1 de lote con 1 venta de contingencia (`client_sale_id = 48f23a3a-9553-4202-8e84-962ef513b300`):
    - `applied: 1`, `duplicates_ignored: 0`, `conflicts: 0`. Consolidada en base central y registrada en `sync_operations`.
  - Envío #2 (Prueba de Idempotencia inmediata con el mismo payload):
    - `applied: 0`, `duplicates_ignored: 1`, `conflicts: 0`.
    - HTTP 200 confirmando el UUID para limpieza de Outbox sin duplicidad contable ni alteración de inventario.
  - Resultado final: **100% PASSED** (Exit code 0).

