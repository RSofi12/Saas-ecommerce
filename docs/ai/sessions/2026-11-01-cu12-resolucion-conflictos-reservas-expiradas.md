# Registro de Sesión: 2026-11-01 — CU11 Diagrama de Robustez EA y CU12 Resolución de Conflictos de Reservas Expiradas

### Contexto General
- **Proyecto:** FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2 - 2026).
- **Metodología:** ICONIX Process (UML 2.5+).
- **Casos de Uso abordados:**
  - `CU11: Registrar Reserva de Prendas Offline en Modo Desconectado (PWA / SQLite)` (Diagrama de Robustez / Comunicación UML en JScript para Enterprise Architect).
  - `CU12: Atender y Resolver Conflictos de Reservas Expiradas` (Implementación Fullstack Backend + Frontend Web PWA + Suite de Pruebas).

---

## 1. Artefactos y Diagramas UML de CU11
- Se elaboró el script JScript para Enterprise Architect [`docsUML/CUrobustez/CU11_comm_reserva_offline_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU11_comm_reserva_offline_EA.js), reproduciendo con precisión el diagrama de comunicación de referencia de la cátedra:
  - **Actores y Objetos Estereotipados:**
    - `:Cliente` (Actor)
    - `:ReservationCreateController` (Boundary)
    - `:ReservationOfflineController` (Control)
    - `:LocalPendingReservation` (Entity)
    - `:LocalInventory` (Entity)
  - **Mensajes de Comunicación (1 a 12):**
    - 1: `solicitarCreacionReserva(cartItems, visitDate)`
    - 2: `verificarConectividad()`
    - 3: `retornarEstadoOffline()`
    - 4: `solicitarGuardadoOffline(clientReservationId, items)`
    - 5: `consultarStockLocal(variantId, branchId)`
    - 6: `retornarStockDisponible(stockLocal)`
    - 7: `guardarReservaPendiente(clientReservationId, status='PENDIENTE_SYNC')`
    - 8: `confirmarPersistenciaLocal(uuid)`
    - 9: `mostrarNotificacionModoOffline(ticketTemporal)`
    - 10: `detectarReconexionInternet()`
    - 11: `sincronizarReservasPendientes(batchReservas)`
    - 12: `actualizarEstadoSincronizado('CONFIRMADO_SERVER')`
- Archivo complementario en PlantUML: [`docsUML/puml/CU11_Registrar_Reserva_Offline.puml`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/puml/CU11_Registrar_Reserva_Offline.puml).

---

## 2. Implementación Fullstack de CU12

### Backend (`p4_gestion_compras_reservas`)
- **Schemas (`reservation_schema.py`):**
  - Enum `ConflictResolutionType`: `reactivate`, `substitute`, `close`.
  - Schema `ReservationConflictResolveRequest`: campos `resolution_type`, `extended_days` (1 a 7), `substitute_variant_id` (opcional UUID) y `notes` (obligatorio, min 5 chars).
  - Schemas de disponibilidad: `ItemStockAvailability` y `ReservationConflictItemRead`.
- **Servicio (`reservation_service.py`):**
  - `list_branch_conflicts(db, branch_id, tenant_id)`: consulta reservas vencidas o en conflicto de la sucursal, computando en tiempo real si cada prenda cuenta con stock en percha (`available_quantity >= requested_quantity`) y habilitando la bandera `can_reactivate`.
  - `resolve_reservation_conflict(db, reservation_id, payload, user_id, tenant_id, branch_id)`:
    - Bloqueo transaccional seguro con `selectinload(Reservation.items)` y `with_for_update()`.
    - **Reactivar:** valida stock remanente en tienda. Si hay stock suficiente, incrementa `reserved_quantity`, pasa estado a `confirmed`, extiende `expires_at = today + extended_days` y registra notas de auditoría. Si no hay stock, lanza excepción explícita.
    - **Sustituir:** verifica variante sustituta y stock disponible, libera reservas previas, reasigna item a la nueva variante, reserva su stock e incrementa vigencia.
    - **Cierre definitivo:** libera cualquier residuo de reserva y marca la reserva como `cancelled` con justificación en `resolution_note`.
- **Rutas (`reservation_routes.py`):**
  - `GET /api/reservations/branch/conflicts`: listado de conflictos para Encargado/Admin.
  - `POST /api/reservations/{reservation_id}/resolve-conflict`: endpoint de resolución atómica.

### Frontend Web PWA (Angular 21)
- **Modelos y Servicio (`reservation.model.ts` y `reservation-api.service.ts`):**
  - Tipos `ReservationConflictItem`, `ItemStockAvailability`, `ReservationConflictResolveRequest`.
  - Métodos `listBranchConflicts()` y `resolveConflict()`.
- **Componente y Plantilla (`reservations-page.component.ts` y `.html`):**
  - Navegación por pestañas: *Todas las Reservas* vs *Bandeja de Conflictos / Expiradas (CU12)*.
  - Indicadores visuales en tiempo real del stock en percha de la sucursal (badge verde si hay stock para reactivar, badge rojo si la prenda fue vendida).
  - Modal adaptativo de resolución con selector de acuerdos:
    1. Reactivar Apartado (+24h/48h) (deshabilitado si no hay stock físico).
    2. Sustituir por otra variante/talla.
    3. Cierre Definitivo / Anular.
  - Campo mandatorio de Justificación de Auditoría para registrar en base de datos.
  - Notificaciones reactivas con Sonner Toast y diseño fluido acorde a la paleta de la plataforma (Montserrat, `#191c21`, esmeralda y coral).

---

## 3. Pruebas y Verificaciones Ejecutadas
1. **Backend Tests:**
   - Comando: `.venv/Scripts/pytest.exe tests/test_cu12_resolve_expired_reservations.py -v`
   - Resultado: **7/7 pruebas aprobadas (100% PASSED)** en 22.45s:
     - `test_01_sweeper_expires_overdue_reservations_and_releases_stock` PASSED
     - `test_02_list_conflicts_shows_stock_availability` PASSED
     - `test_03_resolve_reactivate_success_when_stock_available` PASSED
     - `test_04_resolve_reactivate_fails_when_stock_exhausted` PASSED
     - `test_05_resolve_substitute_success` PASSED
     - `test_06_resolve_close_definitively_with_audit_notes` PASSED
     - `test_07_tenant_isolation_cross_access_prevented` PASSED
2. **Frontend Type Check:**
   - Comando: `npx tsc --noEmit`
   - Resultado: **0 errores de compilación**.

---

## 4. Estado Acumulado del Proyecto
- **Casos de Uso Implementados:** 12 de 25 (`CU01` al `CU12`).
- **Siguiente Caso de Uso:** `CU13: Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4`.
