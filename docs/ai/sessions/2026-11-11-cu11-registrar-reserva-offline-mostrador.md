# Sesión: 2026-11-11 - Implementación y Validación CU11 (Registrar Reserva de Prendas Offline en Mostrador)

## 1. Identificación del Caso de Uso
- **Caso de Uso:** `[CU11] Registrar Reserva de Prendas Offline en Mostrador`
- **Actores:** Cajero de Sucursal (`cajera.lp@fashionstore.bo` / `Tiendafashion123!`), Cliente Presencial
- **Rol:** `RolEnum.cajero`
- **Tenant:** Boutique Elegance (`17eeb457-a34c-47a4-8826-5d9e03d1dfe5`)
- **Sucursal:** Sucursal La Paz (`8ba6f37b-10d8-4fde-8b39-a1eee44f1922`)
- **URL de Acceso:** `http://localhost:4200/app/cajero/caja` (Pestaña "Reservas de Mostrador")

---

## 2. Cambios y Nuevos Componentes Implementados

### Frontend (Angular 21 PWA):
- **Archivo:** [`frontend/src/app/core/offline/idb-reservations.service.ts`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/frontend/src/app/core/offline/idb-reservations.service.ts)
  - Unificación retrocompatible de interfaces `PendingReservationItem` y `PendingOfflineReservation`.
  - Soporte de almacenamiento de contingencia para reservas presenciales de mostrador con UUIDv4 (`client_reservation_id`), `reservation_code` (`RES-OFF-XXXXXXXX`), datos del cliente presencial (`customer_name`, `customer_phone`, `customer_email`), prendas apartadas, fecha de retiro (`visit_date`), vencimiento y estados `PENDIENTE_SYNC`, `SINCRONIZADA` y `ERROR`.
- **Archivo:** [`frontend/src/app/features/cajero/pages/caja-page.component.ts`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/frontend/src/app/features/cajero/pages/caja-page.component.ts)
  - Inyección de `IdbReservationsService` y `ReservationApiService`.
  - Conmutador de 3 pestañas: `activeTab = signal<'tpv' | 'reservas' | 'outbox'>('tpv')`.
  - Métodos: `selectResProduct`, `selectResVariant`, `apartarPrendaLocalmente`, `syncOfflineReservations`, `removeOfflineReservation` y `closeResReceiptModal`.
  - Generación de contingencia: `crypto.randomUUID()`, `RES-OFF-XXXXXXXX` y guardado atómico en cola local.
- **Archivo:** [`frontend/src/app/features/cajero/pages/caja-page.component.html`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/frontend/src/app/features/cajero/pages/caja-page.component.html)
  - Pestaña **"Reservas de Mostrador"** en el nav de caja con badge reactivo de reservas en espera.
  - Formulario de apartado de prendas de 2 columnas:
    * Columna izquierda: Selección interactiva de prenda y talla del catálogo offline cacheado.
    * Columna derecha: Ficha del cliente presencial (Nombre, Teléfono, Fecha de Retiro, Cantidad) y botón de acción: `⚡ Apartar Prenda Localmente`.
  - Tabla de historial de reservas en cola local con estado `PENDIENTE_SYNC` / `Sincronizada`.
  - Modal de Comprobante Térmico de Apartado con leyenda reglamentaria: *“Reserva Offline - Sujeta a sincronización al reanudar conexión”*.

### Backend (FastAPI / `p4_gestion_compras_reservas`):
- **Archivo:** [`backend/app/packages/p4_gestion_compras_reservas/routes/reservation_routes.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/backend/app/packages/p4_gestion_compras_reservas/routes/reservation_routes.py)
  - Ampliación de roles autorizados en `POST /api/reservations/` para admitir `RolEnum.cajero`, `RolEnum.encargado` y `RolEnum.administrador` además de `RolEnum.cliente`, posibilitando el registro y sincronización de apartados presenciales de mostrador.
  - Validación de idempotencia nativa en `create_reservation` mediante `client_reservation_id`: si la reserva con ese UUIDv4 ya fue registrada previamente, responde confirmando la entidad sin duplicar el bloqueo en `reserved_quantity`.

---

## 3. Verificación Automatizada

- **Script:** [`run_cu11_test.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/run_cu11_test.py)
- **Resultados:**
  1. Sesión iniciada con `cajera.lp@fashionstore.bo`.
  2. Simulación offline: banner ámbar `[MODO DESCONECTADO (OFFLINE-FIRST)]` y navegación a pestaña `[Reservas de Mostrador]`.
  3. Prenda local seleccionada: `ADIDAS Women Whalf Striper White Top` (Talla M).
  4. Formulario completado para cliente presencial `Carlos Mendoza`, teléfono `77123456`, retiro para fecha proyectada.
  5. Clic en `Apartar Prenda Localmente`:
     - UUIDv4 generado: `2ebe05b8-99b7-44ac-a430-a6a289e63f79`.
     - Código de contingencia: `RES-OFF-FB542FBD`.
     - Guardado en cola local de IndexedDB con estado `PENDIENTE_SYNC`.
  6. Comprobante térmico emitido en pantalla con leyenda sagrada.
  7. Restablecimiento de conexión y sincronización con `POST /api/reservations/`:
     - HTTP 201 OK. Reserva consolidada en BD PostgreSQL central.
  8. Prueba de Idempotencia: reenvío inmediato con el mismo `client_reservation_id` responde HTTP 201 confirmando la reserva sin alterar ni duplicar el inventario reservado.
  - Resultado: **100% PASSED** (Exit code 0).

