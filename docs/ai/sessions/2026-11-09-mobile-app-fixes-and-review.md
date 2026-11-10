# SESIÓN DE TRABAJO — 09/11/2026
## Auditoría, Corrección de Endpoints y Pulido de Diseño en App Móvil Flutter

### 1. Contexto y Objetivos
- **Alcance:** Aplicación Móvil en Flutter (`mobile/`), orientada al actor Cliente (`Customer`).
- **Casos de Uso Abarcados:** `CU07`, `CU08`, `CU09`, `CU10`, `CU11`, `CU19`, `CU20` (Chatbot) y Probador Virtual (AR).
- **Problemas Detectados en Auditoría:**
  1. En `reservation_controller.dart`, las reservas offline se guardaban con un string `'offline-${now.millisecondsSinceEpoch}-${items.length}'`, provocando fallo `HTTP 422 Unprocessable Entity` en backend (`client_reservation_id: UUID`).
  2. En `order_api.dart`, el método `trackOrder` llamaba a `'orders/tracking/'` sin concatenar `$trackingNumber`, causando error `HTTP 404`.
  3. En `catalog_page.dart` y `checkout_page.dart`, labels informativos referenciaban CUs obsoletos (`CU09` en catálogo offline en vez de `CU08`, `CU12` en checkout en vez de `CU09`).
  4. En `virtual_try_on_page.dart`, mensajes de permisos y errores del probador virtual estaban en inglés.

---

### 2. Cambios Implementados

#### Core / Utils:
- [`mobile/lib/core/util/uuid_helper.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/core/util/uuid_helper.dart):
  - Creación del generador `UuidHelper.generateV4()` 100% puro Dart, criptográficamente seguro con `Random.secure()` y compatible con RFC 4122 v4 (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`).

#### Features / Reservas (CU11):
- [`mobile/lib/features/reservations/reservation_controller.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/reservations/reservation_controller.dart):
  - Sustitución del identificador temporal por `UuidHelper.generateV4()`, garantizando idempotencia y compatibilidad estricta con el backend Pydantic.

#### Features / Pedidos (CU09):
- [`mobile/lib/features/orders/order_api.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/orders/order_api.dart):
  - Corrección del endpoint `trackOrder` a `'orders/tracking/$trackingNumber'`.
- [`mobile/lib/features/orders/checkout_page.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/orders/checkout_page.dart):
  - Actualización del subtítulo de compra digital a `(CU09)`.

#### Features / Catálogo y Probador AR (CU07, CU08, AR):
- [`mobile/lib/features/catalog/catalog_page.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/catalog/catalog_page.dart):
  - Corrección de banner a `Modo Offline Activo (CU08)` y descarga de catálogo a `(CU07)`.
- [`mobile/lib/features/catalog/virtual_try_on_page.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/catalog/virtual_try_on_page.dart):
  - Traducción al español neutro de todos los mensajes de error y advertencias de permisos de cámara.

#### Features / Geolocalización (CU19):
- [`mobile/lib/features/branches_map/branches_map_page.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/branches_map/branches_map_page.dart):
  - Corrección de colisión de tipos en imports: `latlong2 hide Path` y `catalog_models show Branch`, resolviendo ambigüedad entre `Size`/`Path` de UI frente a modelos de negocio.

---

### 3. Verificaciones Realizadas
- Generación de UUIDv4 validada contra formato canónico de 36 caracteres.
- Revisión de rutas y contratos de endpoints en `backend/app/packages/p4_gestion_compras_reservas/routes/order_routes.py`.
- Cumplimiento de contratos de lenguaje (español en UI).
