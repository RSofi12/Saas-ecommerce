# Sesión de Desarrollo: Implementación Fullstack de CU11 (Registrar Reserva de Prendas Offline en PWA / SQLite)

- **Fecha:** 2026-11-01
- **Caso de Uso:** `CU11: Registrar Reserva de Prendas Offline en Modo Desconectado (PWA / SQLite)`
- **Autor / Rol:** Antigravity (Senior Architect)
- **Fase:** Presentación 2 (Bloque A — Reservas Offline y Expiración)

---

## 1. Contexto y Objetivos
Implementación completa del **Caso de Uso 11** para habilitar la reserva de prendas en modo desconectado tanto en la Progressive Web App (Angular 21) como en la aplicación móvil nativa (Flutter / Dart), garantizando:
1. Persistencia local transaccional inmediata en almacenamiento del cliente (IndexedDB / SQLite).
2. Generación e inyección de UUIDv4 local (`client_reservation_id`) para idempotencia absoluta ante reintentos de red.
3. Bandeja Outbox de reservas pendientes de sincronización con indicadores visuales reactivos (tono ámbar / alerta offline).
4. Sincronización masiva o automática al restablecer conectividad con el backend FastAPI (`POST /reservations/`), respetando el bloqueo atómico `reserved_quantity` con `with_for_update()`.

---

## 2. Modificaciones Realizadas

### A. Backend (`backend/app/packages/p4_gestion_compras_reservas/`)
- Verificado y blindado el endpoint `POST /reservations/` con `ReservationCreateRequest`:
  - Acepta `client_reservation_id: Optional[UUID] = None`.
  - Verifica duplicidad en PostgreSQL: si la reserva ya existe para ese `client_reservation_id`, devuelve la reserva existente sin duplicar bloqueos de inventario ni crear registros espurios.
  - Bloqueo transaccional de stock con `select(...).with_for_update()`.
  - Cálculo de caducidad automática a 24 horas y asignación de código amigable `RES-XXXXXXXX` y payload QR.

### B. Frontend Web PWA (`frontend/src/app/`)
- Módulo `IdbReservationsService` (`idb-reservations.service.ts`):
  - Almacena borradores de reserva en IndexedDB (`fashionstore_reservations_db`) con estado `PENDIENTE_SYNC`.
- Páginas de reservas (`reservations-page` y `my-reservations-page`):
  - Integración reactiva con `NetworkStatusService`: cuando el navegador detecta `isOnline === false`, conmuta las reservas al almacenamiento local y despliega el banner Outbox con botón de sincronización.
  - Verificación TypeScript: 0 errores (`npx tsc --noEmit`).

### C. Aplicación Móvil (`mobile/lib/`)
- **`mobile/lib/core/storage/local_catalog_db.dart`:**
  - Creación de tabla SQLite `local_pending_reservations`:
    - Columnas: `client_reservation_id`, `branch_id`, `branch_name`, `visit_date`, `items_json`, `total_amount`, `item_count`, `created_at`, `sync_status`.
    - Métodos: `savePendingReservation()`, `getPendingReservations()`, `deletePendingOffline()`, `clearPendingReservations()`.
- **`mobile/lib/features/reservations/reservation_models.dart`:**
  - Extensión de `Reservation` con campos `reservationCode`, `qrPayload` y `clientReservationId`.
  - Nueva clase inmutable `PendingOfflineReservation` con métodos `toMap()` y `fromMap()`.
- **`mobile/lib/features/reservations/reservation_api.dart`:**
  - Inclusión del parámetro opcional `clientReservationId` en la llamada HTTP POST.
- **`mobile/lib/features/reservations/reservation_controller.dart`:**
  - Inyección de `LocalCatalogDb` (con manejo seguro headless para tests).
  - Propiedad reactiva `List<PendingOfflineReservation> pendingReservations` y bandera `isSyncing`.
  - Métodos: `saveOfflineReservation()`, `loadPendingOffline()`, `syncAllPending()`, `deletePendingOffline()`.
- **`mobile/lib/features/reservations/reservation_create_page.dart`:**
  - Acción "Guardar reserva offline" para registrar el apartado directamente en SQLite en ausencia de red.
- **`mobile/lib/features/reservations/reservations_page.dart`:**
  - Componente `_PendingOfflineSection` (Outbox card con estética ámbar) que muestra las reservas pendientes almacenadas localmente.
  - Botón de sincronización con spinner integrado.
  - Despliegue de código de reserva `reservation.reservationCode` en cada card.
- **`mobile/test/`:**
  - Actualización de `reservation_models_test.dart`, `reservation_controller_test.dart` y `reservations_page_test.dart` para soportar `clientReservationId` y navegación en tests de widgets.

---

## 3. Pruebas y Verificaciones Ejecutadas

1. **Backend Tests:**
   - Comando: `cd backend; .venv/Scripts/pytest.exe tests/test_cu13_reservations_with_expiration.py`
   - Resultado: **7 passed in 13.39s (100%)**.
2. **Mobile Tests (Flutter):**
   - Comando: `cd mobile; flutter test test/reservation_models_test.dart test/reservation_controller_test.dart test/reservations_page_test.dart`
   - Resultado: **8 passed in 59s (100%)**.
3. **Frontend Typecheck (Angular 21):**
   - Comando: `cd frontend; npx tsc --noEmit`
   - Resultado: **0 errores**.

---

## 4. Próximos Pasos Inmediatos
- Continuar con `CU12: Atender y Resolver Conflictos de Reservas Expiradas`:
  - Servicio cron / endpoint de expiración de reservas.
  - Panel para Encargado de Sucursal para liberar inventario expirado a stock general.
