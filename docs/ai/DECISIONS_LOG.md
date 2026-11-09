# DECISIONS LOG — FASHIONSTORE SAAS MULTITENANT

## Registro Histórico de Decisiones de Arquitectura y Negocio

### Registro 01: 2026-10-20
* **Decisión:** Reestructuración de la base de código del backend de *Package by Layer* a **Arquitectura por Paquetes de Dominio (Módulos Profundos)**.
* **Motivo:** La estructura original horizontal (`models/`, `routes/`, `schemas/`, `services/`) provocaba dispersión (*lack of locality*) e impedía la evolución hacia SaaS sin generar acoplamientos inmanejables.
* **Impacto:** Creación de los paquetes `p1_gestion_usuarios_acceso`, `p2_gestion_productos_catalogo`, `p3_gestion_inventario_disponibilidad`, `p4_gestion_compras_reservas`, `p5_gestion_ventas_pos` y `p6_inteligencia_analitica`. Montaje limpio en `main.py` y conservación de *shims* para retrocompatibilidad total.

### Registro 02: 2026-10-20
* **Decisión:** Desacoplamiento estricto de los archivos `__init__.py` raíz de cada paquete.
* **Motivo:** Al importar rutas dentro del `__init__.py` raíz de cada paquete, cualquier importación de un modelo desde otro paquete forzaba la carga prematura de dependencias FastAPI y controladores, desatando dependencias circulares complejas.
* **Impacto:** Los `__init__.py` raíz se mantienen vacíos o únicamente con docstring. El archivo maestro `main.py` importa explícitamente desde `.router` de cada paquete. Compilación limpia y 96 endpoints OpenAPI validados.

### Registro 03: 2026-10-24
* **Decisión:** Adopción de la lista unificada de **28 Casos de Uso (12 modificados del 1er parcial + 16 nuevos/extras del 2do parcial)** bajo la metodología ICONIX.
* **Motivo:** La docente indicó explícitamente que el segundo examen parcial no es un sistema nuevo desde cero, sino una evolución. Esta lista de 28 CU preserva formalmente los logros del 1er parcial (vestidor virtual AR, compra digital con Stripe, catálogo por atributos) adaptándolos a multitenancy, e incorpora los desafíos obligatorios (PWA offline, Flutter con SQLite, idempotencia, sync, cambios de prenda y ML).
* **Impacto:** Trazabilidad completa con los Requisitos Funcionales del examen sin perder los componentes ya construidos.

### Registro 04: 2026-10-24
* **Decisión:** Regla de modelado estricta para diagramas de robustez ICONIX: **los ciclos (loops), validaciones y flujos alternativos nacen obligatoriamente en el objeto Controlador**.
* **Motivo:** Directriz técnica de la docente en clase. La frontera (*Boundary*) solo recibe la intención del actor y la traslada; el controlador evalúa la regla de negocio y decide si invoca una frontera de éxito o una frontera de error.
* **Impacto:** Homogeneidad y rigor metodológico en todos los diagramas de robustez del informe.

### Registro 05: 2026-10-24
* **Decisión:** Política de negocio para **Cambios de Prendas con Diferencia de Precio (CU19)**.
* **Motivo:** Explicación de la docente: al cambiar una talla o modelo por otro de mayor precio (ej. talla M a Bs 50 por talla L a Bs 70), el cambio se consolida **única y exclusivamente si el cliente abona la diferencia de precio** (Bs 20). Si no abona, el cambio se cancela y se restituye la prenda o el monto.
* **Impacto:** Modelo `garment_exchanges` con campos `price_difference`, `difference_paid (bool)` y lógica de validación previa al movimiento de stock.

### Registro 06: 2026-10-24
* **Decisión:** Política de negocio para **Devoluciones de Prendas y Reembolso (CU20)**.
* **Motivo:** Regla comercial del pliego: ante la devolución de una prenda dentro del plazo, la empresa retiene entre el 20% y el 50% por acondicionamiento y gastos operativos, y devuelve al cliente entre el 50% y el 80% del importe pagado.
* **Impacto:** Modelo `garment_returns` con cálculo automático de retención y emisión de comprobante / nota de crédito.

### Registro 07: 2026-10-24
* **Decisión:** Incorporación de **OpenStreetMap / OpenRouteService en Flutter (CU21)** como aporte extra de geolocalización.
* **Motivo:** Cumplir el requerimiento de "Aportes propios" del pliego (Pág. 5) y enriquecer la experiencia móvil permitiendo ubicar sucursales físicas y calcular distancias sin depender de servicios privativos.
* **Impacto:** Integración del paquete `flutter_map` y capa de servicios de mapa en la aplicación móvil.

### Registro 08: 2026-10-24
* **Decisión:** Adopción del sistema de memoria viva en `docs/ai/` y de bitácoras obligatorias en `docs/ai/sessions/`.
* **Motivo:** Asegurar la continuidad operativa de los agentes de IA y los desarrolladores entre sesiones, registrando bitácoras técnicas únicamente cuando se modifique código o persistencia.
* **Impacto:** Creación de `AGENTS.md` y estructura de relevos `HANDOFF_LATEST.md`, `CURRENT_STATE.md` e `IMPLEMENTATION_PHASES.md`.

### Registro 09: 2026-10-24
* **Decisión:** Estandarización del nombre del paquete SaaS en español: `p0_saas_plataforma`.
* **Motivo:** Mantener coherencia idiomática absoluta con el resto de paquetes de dominio del backend (`p1_gestion_usuarios_acceso`, `p2_gestion_productos_catalogo`, etc.).
* **Impacto:** Creación del paquete `backend/app/packages/p0_saas_plataforma/` conteniendo los modelos `Company`, `Plan`, `Subscription`, esquemas Pydantic v2, servicios de tenant y validación de cuotas (`quota_service.py`), router `p0_router` montado en `backend/main.py`, y dependencia de contexto multitenant en `backend/app/core/tenant_context.py`.

### Registro 10: 2026-10-25
* **Decisión:** Sincronización e Idempotencia Offline con `offline-pack` y `offline-sync` (CU08/CU09).
* **Motivo:** Facilitar la descarga del catálogo completo por tenant en un paquete snapshot JSON unificado y garantizar la persistencia de operaciones creadas sin conexión con deduplicación por `client_operation_id`.
* **Impacto:** Migración `0041_add_tenant_and_offline_tables.py` que incorpora `tenant_id` a `products`, `product_variants` e `inventory`, crea tablas `offline_operations` y `catalog_cache`. Endpoints `GET /api/catalog/offline-pack` y `POST /api/catalog/offline-sync`.


### Registro 11: 2026-10-25
* **Decisión:** Enforzamiento estricto de `tenant_id` y persistencia transaccional con `db.commit()` en el Catálogo Multitenant (CU06 / CU07).
* **Motivo:** Auditoría de arquitectura detectó dos fallas críticas en el commit anterior: (1) Ausencia de aislamiento en endpoints de catálogo, pues `create_product`, `update_product`, `delete_product` y `list_admin_products` no recibían ni filtraban por `tenant_id`, provocando fuga cruzada de datos entre empresas. (2) Ausencia de `db.commit()` en las funciones de `catalog_service.py` (usaban `with db.begin_nested():` sin consolidar), provocando que las prendas creadas se revirtieran silenciosamente en cada petición HTTP. Adicionalmente, la migración `0041` no se había ejecutado en PostgreSQL.
* **Impacto:**
  - Ejecución formal de `alembic upgrade head` (revisión 0041 aplicada en base de datos).
  - Inyección de `tenant_id` obligatorio en todas las mutaciones del catálogo.
  - Consolidación transaccional con `db.commit()` para asegurar que las prendas persistan formalmente en PostgreSQL.
  - Suite [`test_cu06_cu07_multitenant_catalog.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu06_cu07_multitenant_catalog.py) con 4/4 pruebas unitarias e integración pasando.

### Registro 12: 2026-10-27
* **Decisión:** Despacho Condicionado a Pago Confirmado en Stripe y Tracking Unificado (CU12 - Política 3).
* **Motivo:** El pliego y las Políticas de Negocio Inviolables (Política 3) exigen que el despacho físico o la entrega digital se efectúen única y exclusivamente cuando el pago en la pasarela Stripe esté confirmado (`payment_status = 'paid'`). Adicionalmente, era mandatorio extender el modelo de datos para soportar modalidades de entrega (`RETIRO_TIENDA` vs `ENVIO_DOMICILIO`), número de guía (`tracking_number`), auditoría de despacho (`dispatched_at`, `dispatched_by`) y aislamiento SaaS con `tenant_id`.
* **Impacto:**
  - Migración Alembic `0043_add_order_tenant_and_dispatch.py` aplicada exitosamente en PostgreSQL.
  - Ampliación de enum `fulfillmentstatusenum` en PostgreSQL (`ready_for_dispatch`, `dispatched`, `delivered`).
  - Implementación de `POST /api/orders/{order_id}/dispatch` con bloqueo estricto por Política 3 y `GET /api/orders/tracking/{tracking_number}` para trazabilidad pública del pedido.
  - Generación de código de rastreo formal `DSP-YYYYMMDD-XXXX` al procesar webhook `payment_intent.succeeded`.
  - Suite automatizada `test_cu12_stripe_conditioned_dispatch.py` con 5/5 pruebas aprobadas al 100%.

  - Inyección y extracción mandatoria de `tenant_id` desde el JWT verificado en `catalog_routes.py`.
  - Soporte de precios diferenciados por talla en `ProductVariant` asociados al tenant.
  - Inclusión de `db.commit()` en `create_product()`, `update_product()` y `delete_product()`.
  - Serialización de `tenant_id` en `ProductRead` y `ProductVariantRead`.
  - Filtro opcional por `tenant_id` en `GET /api/catalog/products` para tiendas públicas.
  - Creación de la suite de pruebas de aislamiento multitenant `backend/tests/test_cu06_cu07_multitenant_catalog.py` con 4/4 pruebas pasando en verde.

### Registro 12 (2026-10-25) — Blindaje Multitenant y Consulta Multisede de Disponibilidad de Inventario (CU10)
- **Problema Detectado:**
  1. `get_consolidated_stock()` y `get_branch_stock()` en `inventory_service.py` no filtraban por `tenant_id`, mezclando inventarios de diferentes empresas en consultas administrativas y reportes.
  2. El endpoint `/api/catalog/availability` exigía obligatoriamente `branch_id`, impidiendo al cliente consultar la disponibilidad global o multisede de una prenda/variante en las diferentes tiendas de la marca.
  3. En la interfaz web de cliente (`ProductDetailPageComponent`), no existía mecanismo visual para consultar disponibilidad en sucursales físicas.
  4. La carpeta `scratch/` en la raíz del repositorio contenía scripts temporales de depuración que violaban las directrices de limpieza del proyecto.
- **Decisión y Solución Técnica:**
  - Se eliminó la carpeta `scratch/` de la raíz del repositorio.
  - Se refactorizó `get_consolidated_stock(db, tenant_id=None)` y `get_branch_stock(db, branch_id, tenant_id=None)` para filtrar estrictamente por empresa.
  - En `inventory_routes.py`, se extrae el claim `tenant_id` del JWT en `/consolidated` y se valida la pertenencia de la sucursal en `/branches/{branch_id}` evitando fugas multitenant.
  - Se potenció `GET /api/catalog/availability`: si se omite `branch_id`, devuelve el desglose de stock de todas las sucursales activas del tenant (`quantity`, `reserved_quantity`, `available_quantity = max(quantity - reserved, 0)`) y el total consolidado; si se especifica `branch_id`, preserva el contrato histórico de sucursal única para compatibilidad absoluta.
  - En Frontend (`ProductDetailPageComponent`), se diseñó un modal responsivo bajo lineamientos de `frontend-design`: resumen de red de tiendas, estados visuales por colores (disponible >5, últimas unidades 1-5, sin stock), dirección con geolocalización, teléfono y horario de atención.
  - Creación de la suite de pruebas unitarias y de integración `backend/tests/test_cu10_stock_availability.py` (4/4 pruebas aprobadas) y validación de 18 pruebas de regresión en verde.

### Registro 13 (2026-10-25) — Motor de Catálogo Offline en IndexedDB y Detección Reactiva de Conectividad (CU08 / CU09 / CU06 / CU07)
- **Problema Detectado:**
  1. El backend contaba con endpoints `/api/catalog/offline-pack` y `/api/catalog/offline-sync`, pero la aplicación Angular PWA carecía completamente de capa de persistencia local en cliente (IndexedDB).
  2. En modo desconectado (falla de red o modo avión), el catálogo público simplemente fallaba con error HTTP, sin mecanismo de conmutación transparente a caché ni indicador visual de estado.
  3. En el catálogo administrativo (CU06), la matriz de variantes carecía de jerarquía visual intuitiva para definir precios diferenciados por talla/color.
- **Decisión y Solución Técnica:**
  - Se implementó `IdbCatalogService` (`src/app/core/offline/idb-catalog.service.ts`) nativo sobre la API de IndexedDB del navegador (`fashionstore_local_db` v1), con almacenes para `catalog_products` y `catalog_meta` (timestamp de sincronización, total de ítems, versión).
  - Se implementó `NetworkStatusService` (`src/app/core/offline/network-status.service.ts`) con señales reactivas `isOnline`, `simulatedOffline`, `effectiveOnline`, escuchando eventos `online`/`offline` de `window` y permitiendo simulación de contingencia desde la interfaz.
  - En `CatalogPageComponent` (CU07/CU08/CU09), se configuró degradación elegante: si la red falla o está en modo desconectado, consulta automáticamente IndexedDB, aplicando motor de filtrado en memoria (búsqueda por texto, categoría, talla y color) y desplegando un banner contextual ámbar/pizarra con fecha del último snapshot.
  - Se añadió botón explícito para descargar/refrescar el catálogo local (CU08) con badge dinámico de conteo de prendas en caché.
  - En `AdminCatalogPageComponent` (CU06), se refinó la interfaz con la skill `frontend-design`: numeración clara de variantes (`#1`, `#2`), contenedor sutil con borde definido, textos de ayuda conceptuales para el precio por talla y acciones de eliminación fluidas.
  - Formato estricto ICONIX en flujos alternativos referenciando puntos del flujo principal (`2. A1:`, `4. A2:`, etc.).


### Registro 12: 2026-10-26
* **Decisión:** Implementación formal del ciclo de vida de **Traslados de Mercadería entre Sucursales (CU11)** con estados `EN_TRANSITO`, `COMPLETADO` y `CANCELADO`, y persistencia desacoplada del balance instantáneo de inventario.
* **Motivo:** En el 1er Parcial, los traspasos se realizaban como un swap inmediato de saldos en `/api/inventory/movements/transfer`. Para el 2do Parcial y la metodología ICONIX, el movimiento físico de prendas entre tiendas requiere trazabilidad temporal estricta: descuento preventivo en origen para evitar sobreventas, retención de la mercadería en tránsito sin afectar la disponibilidad de la sucursal receptora, y confirmación formal mediante acta de recepción en destino (`COMPLETADO`) o restitución a origen ante anulación (`CANCELADO`).
* **Impacto:**
  - Migración `0042_add_inventory_transfers.py` con tablas `inventory_transfers` e `inventory_transfer_items`.
  - Endpoints REST en `p3_gestion_inventario_disponibilidad` (`POST /api/inventory/transfers`, `GET /api/inventory/transfers`, `POST /api/inventory/transfers/{id}/receive`, `POST /api/inventory/transfers/{id}/cancel`).
  - Frontend Web Angular 21 en [`transfers-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/encargado/pages/transfers-page.component.ts) disponible en `/app/encargado/transfers` y `/app/admin/transfers`.
  - Suite automatizada de pruebas unitarias y de integración ([`test_cu11_inventory_transfers.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu11_inventory_transfers.py)) con 5/5 pruebas PASSED.


### Registro 14: 2026-10-28 — Consolidación Definitiva del Esquema de Base de Datos para Todos los Casos de Uso (Migración 0044)
* **Decisión:** Congelar y unificar el modelo de datos de PostgreSQL para los 28 Casos de Uso del sistema mediante una única migración maestra (`0044_complete_database_schema_all_use_cases.py`), eliminando la necesidad de futuras migraciones DDL parciales en lo que resta del desarrollo.
* **Motivo:** Evitar la fragmentación de migraciones de Alembic a medida que se implementan los casos de uso restantes (CU13 a CU28), prevenir inconsistencias o dependencias circulares entre paquetes de dominio, y garantizar que los contratos de datos de Backend, Web Frontend y Mobile Flutter queden establecidos con absoluta certeza.
* **Impacto:**
  - Migración `0044` aplicada exitosamente en PostgreSQL (`alembic upgrade head`).
  - Extensión de aislamiento multitenant: Claves foráneas e índices `tenant_id` aplicados a `reservations`, `reservation_items`, `sales`, `sale_items`, `conversations`, `conversation_messages`, `promotion_codes` y `promotion_code_usages`.
  - Tablas de Políticas de Negocio Inviolables creadas: `garment_exchanges` (CU19: Política 1) y `garment_returns` (CU20: Política 2).
  - Tabla de Sincronización e Idempotencia creada: `sync_operations` (CU18: `client_operation_id UNIQUE`).
  - Tablas de Inteligencia Artificial y Machine Learning creadas: `ml_models`, `demand_forecasts` (CU26) y `customer_segments` (CU27).
  - Trazabilidad y contingencia offline: Columnas `client_sale_id UUID UNIQUE`, `is_offline BOOLEAN`, `synced_at`, `idempotency_key` en `sales`; `resolved_at`, `resolved_by`, `resolution_note` en `reservations`.
  - Creación de modelos canónicos en paquetes de dominio (`p4`, `p5`, `p6`) con shims de compatibilidad en `app/models/` y verificación de introspección ORM al 100%.
  - Matriz completa de correspondencia Casos de Uso vs Tablas documentada en [`docs/ACTORS_AND_USE_CASES.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ACTORS_AND_USE_CASES.md) (Sección 3).


### Registro 15: 2026-10-31 — Poda Estratégica, Reestructuración a 25 Casos de Uso y Ajuste de Cuotas Comerciales
* **Decisión:** 
  1. Reducir y depurar el alcance oficial de 28 a **25 Casos de Uso definitivos**, eliminando redundancias estrictas del 1er parcial que ya están implementadas y no reciben cambios en el 2P (Perfil de Usuario, Traslados de Mercadería, Probador Virtual AR, Consulta de Stock básica y POS Online clásico).
  2. Incorporar formalmente los requerimientos del pliego y directrices de cátedra:
     - `CU11: Registrar Reserva de Prendas Offline en Modo Desconectado (PWA / SQLite)`.
     - `CU16: Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock`.
  3. Renumerar correlativamente de `CU01` a `CU25` sin saltos numéricos, manteniendo la trazabilidad con los 7 paquetes de dominio (`p0_saas_plataforma` a `p6_inteligencia_analitica`).
  4. Ampliar los planes de suscripción SaaS a 3 niveles: **Plan BÁSICO (hasta 3 sucursales activas)**, **Plan PROFESIONAL (hasta 10 sucursales con IA)** y **Plan EMPRESARIAL (ilimitadas con backup en tiempo real)**.
  5. Formalizar las políticas comerciales para los tenants de prueba (Boutique Elegance: 30% retención, 15 días; Moda Urbana: 20% retención, 30 días) y los mecanismos de consentimiento de Términos y Condiciones mediante checkboxes obligatorios en Frontend.
* **Motivo:** Cumplir las directrices académicas impartidas en clase por la docente, enfocar el esfuerzo en los 6 Desafíos de alto valor del 2do parcial y dotar al proyecto de consistencia arquitectónica y documental intachable.
* **Impacto:**
  - Actualización de `docs/ACTORS_AND_USE_CASES.md`, `docs/BUSINESS_POLICIES.md`, `docs/ai/IMPLEMENTATION_PHASES.md` y `docs/ai/CURRENT_STATE.md`.
  - Cero roturas en la base de datos (la migración `0044` ya contiene todas las tablas necesarias).
  - Trazabilidad del 100% de los Requisitos Funcionales y No Funcionales.

### Registro 16: 2026-11-01 — Liberación Inmediata de Cuota y Desactivación Defensiva en Sucursales (CU04)
* **Decisión:** 
  1. Implementar mecanismo de desactivación defensiva (*soft-delete*) en `delete_branch()`: si la sucursal posee registros históricos contables o de inventario vinculados, la operación conmuta automáticamente a desactivación (`is_active = False`, `is_default = False`), desvinculando usuarios asignados sin romper restricciones FK de PostgreSQL.
  2. Unificar la consulta de suscripción en `quota_service.py` y `branch_service.py` (`company_id`, estatus `ACTIVA`, `active`, `trialing`).
  3. Asegurar que `/api/branches/quota` calcule la cuota en tiempo real sobre la base de datos sin intermediarios en caché de proceso.
* **Motivo:** Prevenir bloqueos por clave foránea al eliminar sucursales con movimientos históricos, y garantizar que al desactivar o eliminar una sucursal el cupo se libere de forma instantánea sin requerir reinicio del servidor FastAPI.
* **Impacto:**
  - Modificación en [`backend/app/packages/p1_gestion_usuarios_acceso/services/branch_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/services/branch_service.py) y [`backend/app/packages/p0_saas_plataforma/services/quota_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/services/quota_service.py).
  - Creación de suite automatizada [`backend/tests/test_cu04_branch_quota_release.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu04_branch_quota_release.py) con 6/6 pruebas aprobadas.

### Registro 17: 2026-11-01 — Barrido Continuo de Reservas Vencidas y Desbloqueo Automático de Stock (CU10)
* **Decisión:**
  1. Consolidar el barrido periódico de expiración de reservas en una función unificada y atómica `run_expiration_sweep(db)` dentro de `expiration_service.py`, encargada de barrer reservas vencidas (`expires_at <= today`), órdenes pendientes vencidas y reservas transferidas a carrito que superaron su ventana de gracia (15 min).
  2. Habilitar ejecución dual del sweeper:
     - **Background Worker asíncrono continuo** en `main.py` mediante `_expiration_worker_loop()` que ejecuta una pasada inmediata al levantar el servidor y luego revisiones cada 60 segundos sin bloquear el event loop de FastAPI ni la API REST.
     - **Endpoint administrativo seguro** `POST /api/reservations/sweeper` restringido a roles `administrador` y `encargado`, para forzar barridos bajo demanda, pruebas automatizadas o ejecución vía cron externo / webhook.
  3. Reemplazar `joinedload()` por `selectinload(Reservation.items)` en queries con `with_for_update(skip_locked=True)` para evitar fallos de PostgreSQL (`FOR UPDATE cannot be applied to the nullable side of an outer join`).
* **Motivo:** Cumplir estrictamente la política de negocio del CU10 y el pliego de Sistemas 2: las reservas online comprometen stock físico (`reserved_quantity`); al expirar el plazo fijado por la tienda sin que el cliente complete la compra, el inventario retenido debe liberarse de inmediato a disponibilidad general (`quantity - reserved_quantity`) de forma desatendida y confiable.
* **Impacto:**
  - Archivos actualizados: [`backend/app/packages/p4_gestion_compras_reservas/services/expiration_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p4_gestion_compras_reservas/services/expiration_service.py), [`backend/app/packages/p4_gestion_compras_reservas/services/reservation_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p4_gestion_compras_reservas/services/reservation_service.py), [`backend/app/packages/p4_gestion_compras_reservas/routes/reservation_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p4_gestion_compras_reservas/routes/reservation_routes.py), [`backend/main.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/main.py).
  - Suite de pruebas de integración [`backend/tests/test_cu10_reservation_expiration_sweeper.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu10_reservation_expiration_sweeper.py) con 4/4 pruebas PASSED.

### Registro 18: 2026-11-01 — Protocolo de Resolución de Conflictos para Reservas Expiradas (CU12)
* **Decisión:**
  1. Implementar la API y la lógica de negocio de resolución de discrepancias en `p4_gestion_compras_reservas` (`GET /reservations/branch/conflicts` y `POST /reservations/{id}/resolve-conflict`) con 3 estrategias explícitas:
     - `reactivate`: Extiende la vigencia (+24h a +72h) y re-bloquea las unidades requeridas en `reserved_quantity`, condicionado a que el inventario remanente en percha (`quantity - reserved_quantity >= requested`) sea suficiente.
     - `substitute`: Reasigna la reserva a otra variante disponible (ej. cambio de talla M por L o modelo análogo), liberando la reserva previa y bloqueando la nueva variante.
     - `close`: Cierre definitivo y anulación de la reserva ante desistimiento o falta de prendas aptas.
  2. Exigir justificación obligatoria (`notes` mínimo 5 caracteres) y registrar auditoría en `resolved_at`, `resolved_by` y `resolution_note` con prefijos normalizados (`[REACTIVACIÓN +Nd]`, `[SUSTITUCIÓN VAR SKU]`, `[CIERRE DEFINITIVO]`).
  3. Enriquecer la interfaz web del Encargado (`/app/encargado/reservations`) con una pestaña dedicada "Bandeja de Conflictos / Expiradas (CU12)", diagnósticos visuales de stock físico en percha y modal de resolución con bloqueo condicional si no hay stock disponible.
* **Motivo:** Cuando una reserva expira, el sweeper del CU10 libera inmediatamente el stock para no congelar la mercadería. Si el cliente asiste con retraso justificado, el Encargado debe poder resolver el conflicto en mostrador de manera asistida y auditable sin provocar descuadres de inventario ni sobreventas físicas.
* **Impacto:**
  - Schemas y servicios en `backend/app/packages/p4_gestion_compras_reservas`.
  - Frontend Web PWA en [`frontend/src/app/features/encargado/pages/reservations-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/encargado/pages/reservations-page.component.ts).
  - Suite [`backend/tests/test_cu12_resolve_expired_reservations.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu12_resolve_expired_reservations.py) con 7/7 pruebas aprobadas.

### Registro 19: 2026-11-01 — Política Inviolable de Cambio de Prenda por Talla/Modelo con Cobro de Diferencia (CU17)
* **Decisión:**
  1. Implementar la API y la lógica transaccional de cambio de prendas en `p5_gestion_ventas_pos` con endpoints `POST /api/exchanges/quote`, `POST /api/exchanges` y `GET /api/exchanges`.
  2. Aplicar de forma estricta e inviolable la **Política Comercial 1 (P-Ten-01)**:
     - Si la nueva prenda tiene mayor precio que la original ($\Delta > 0$), el cambio se consolida **única y exclusivamente si el cliente abona la diferencia** en caja (`difference_paid = True`).
     - Si no se confirma el pago, la operación es rechazada con `HTTP 400 Bad Request` y el inventario no sufre alteración alguna.
     - Si $\Delta = 0$, el cambio procede directamente sin requerir pago adicional.
  3. Exigir validación previa de condición física de la prenda (`good_with_tags`): si está dañada o carece de etiqueta textil intacta, se cancela el cambio.
  4. Realizar el swap físico de inventario atómico en la misma transacción: incremento de existencias (+1) en la prenda original reingresada y decremento (-1) en la nueva prenda entregada con bloqueo preventivo de concurrencia (`with_for_update`).
  5. Registro de auditoría persistido en la tabla `garment_exchanges` (congelada bajo la migración `0044`).
* **Motivo:** Exigencia formal de las políticas de negocio del pliego de Sistemas 2 y garantía de preservación del margen comercial e integridad del inventario de cada tenant.
* **Impacto:**
  - Nuevos módulos creados con tags `# logica del CU17`:
    - [`backend/app/packages/p5_gestion_ventas_pos/schemas/exchange_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/exchange_schema.py)
    - [`backend/app/packages/p5_gestion_ventas_pos/services/exchange_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/exchange_service.py)
    - [`backend/app/packages/p5_gestion_ventas_pos/routes/exchange_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/routes/exchange_routes.py)
  - Montado en [`backend/app/packages/p5_gestion_ventas_pos/router.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/router.py).
  - Suite de integración [`backend/tests/test_cu17_garment_exchange.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu17_garment_exchange.py) con 8/8 pruebas PASSED (100%).


### Registro 20: 2026-11-02 — Orquestación de Entorno con Docker Compose y Paridad de Despliegue
* **Decisión:**
  1. Crear archivo [`docker-compose.yml`](file:///c:/Users/PERSONAL/ecommerce-SI2/docker-compose.yml) en la raíz para orquestar los 3 servicios fundamentales: PostgreSQL 16 (`db`), FastAPI Uvicorn (`backend`) y Angular Nginx (`frontend`).
  2. Implementar arranque resiliente con `healthcheck` en PostgreSQL (`pg_isready`) y ejecución automática de migraciones (`alembic upgrade head`) en el contenedor backend previo al inicio de Uvicorn.
  3. Crear [`.dockerignore`](file:///c:/Users/PERSONAL/ecommerce-SI2/.dockerignore) en la raíz para excluir directorios pesados (`node_modules`, `.angular`, `.venv`, `.git`, datasets de seed e informes), acelerando radicalmente el tiempo de construcción de imágenes.
  4. Garantizar compatibilidad dual: el desarrollador puede seguir levantando el entorno ligero nativo en dos terminales (`uvicorn` + `npm start`) para bajo consumo de RAM, o levantar el stack completo en Docker para pruebas y staging.
* **Motivo:** Asegurar paridad y reproducibilidad entre el entorno de desarrollo y los despliegues en la nube (Render / Railway).
* **Impacto:**
  - Archivos creados: [`docker-compose.yml`](file:///c:/Users/PERSONAL/ecommerce-SI2/docker-compose.yml) y [`.dockerignore`](file:///c:/Users/PERSONAL/ecommerce-SI2/.dockerignore).
  - Archivo actualizado: [`backend/Dockerfile`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/Dockerfile).

### Registro 21: 2026-11-02 — Venta POS Offline en Efectivo con Contingencia UUIDv4 (CU13)
* **Decisión:**
  1. Enriquecer los esquemas y servicios de venta POS en `p5_gestion_ventas_pos` para admitir ventas offline con atributos `client_sale_id: UUID | None`, `is_offline: bool` y `synced_at: datetime | None`.
  2. Aplicar de forma estricta la **Política Comercial 5 (Ventas Offline)**:
     - Las ventas realizadas en modo desconectado deben ser única y exclusivamente en **efectivo** (`cash`).
     - Todo intento de registrar una venta offline con método electrónico (tarjeta, Stripe, transferencia) se rechaza a nivel de validación Pydantic (`HTTP 422`).
  3. Soportar **Idempotencia Transaccional por UUIDv4**: al sincronizar o reenviar una venta con `client_sale_id` existente en el mismo tenant, el backend confirma la venta preexistente sin volver a descontar existencias de inventario ni generar duplicidad de facturación.
  4. En el frontend Web PWA (`/app/cajero/caja`), implementar bandeja outbox IndexedDB (`idb-sales.service.ts`), calculadora de cambio de efectivo, bloqueo visual de métodos electrónicos en desconexión y emisión de comprobante térmico de contingencia (`TCK-OFF-XXXXXX`) con hash UUIDv4.
* **Motivo:** Cumplimiento de los requisitos de contingencia desconectada en tienda física y resguardo contra descuadres de inventario por reintentos de red.
* **Impacto:**
  - Backend: [`sales_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/sales_schema.py), [`sales_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/sales_service.py), [`sales_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/routes/sales_routes.py).
  - Frontend: [`idb-sales.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/offline/idb-sales.service.ts), [`caja-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.ts), [`caja-page.component.html`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.html).
  - Pruebas: [`test_cu13_offline_pos_sales.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu13_offline_pos_sales.py) con 5/5 PASSED.

### Registro 22: 2026-11-02 — Política Inviolable de Devolución de Prenda con Retención Operativa (20%–50%) y Nota de Crédito (CU18)
* **Decisión:**
  1. Implementar la arquitectura transaccional de devolución de prendas en `p5_gestion_ventas_pos` con endpoints `POST /api/returns/quote`, `POST /api/returns` y `GET /api/returns`.
  2. Aplicar de forma estricta la **Política Comercial 2 (P-Ten-03)**:
     - Retención operativa fija o configurable por tenant en el rango acotado de **20% a 50%** (ej. 30% en Boutique Elegance, 20% en Moda Urbana).
     - Reembolso neto al cliente equivalente al **50% a 80%** del valor pagado.
     - Métodos de reembolso permitidos: `NOTA_CREDITO` (por defecto, generando código digital trazable `NC-YYYYMMDD-XXXX`) o `EFECTIVO` (en mostrador).
  3. Exigir validación de condición de prenda: la devolución se procesa **únicamente si la prenda está intacta y conserva la etiqueta original adherida** (`condition = 'good_with_tags'`). Si la prenda está usada o sin etiqueta, se rechaza la operación (`HTTP 400`).
  4. Validar ventana temporal de devolución (`max_days`) parametrizada por política de la empresa (ej. 7 a 15 días tras la compra).
  5. Reingreso de stock atómico: incremento físico (`quantity += 1`) en la tabla `inventory` utilizando bloqueo pesimista de fila (`with_for_update`) para evitar carreras concurrentes.
  6. En el frontend Web PWA (`/app/cajero/caja`), implementar modal de cotización previa con desglose en tiempo real, selector de método de liquidación y modal de emisión de Nota de Crédito digital con estética boutique.
* **Motivo:** Exigencia formal de las políticas de negocio del pliego de Sistemas 2 y garantía de preservación del margen comercial contra costos de reacondicionamiento y peritaje textil.
* **Impacto:**
  - Backend: [`return_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/return_schema.py), [`return_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/return_service.py), [`return_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/routes/return_routes.py).
  - Frontend: [`sale.model.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/models/sale.model.ts), [`sales-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/services/sales-api.service.ts), [`caja-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.ts), [`caja-page.component.html`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.html).
  - Pruebas: [`backend/tests/test_cu18_garment_return.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu18_garment_return.py) con 8/8 PASSED y regresión completa 26/26 PASSED.

### Registro 23: 2026-11-02 — Gestión de Bandeja Local de Operaciones Pendientes (Outbox PWA / SQLite - CU14)
* **Decisión:**
  1. Diseñar el patrón Outbox en el frontend Angular PWA (`CajaPageComponent`) desacoplando la terminal de cobro activa del repositorio de sincronización local persistido en IndexedDB (`IdbSalesService`).
  2. Implementar endpoint ligero de conciliación de estado en backend `POST /api/sales/offline/check-status` en `p5_gestion_ventas_pos`:
     - Permite al cliente enviar una lista de `client_sale_ids` (UUIDv4) para verificar su presencia en la base de datos central.
     - Retorna un mapa asociativo `{uuid: 'synced' | 'pending'}` filtrado estrictamente por `tenant_id`, sin generar ventas ni modificar existencias de inventario.
  3. En la interfaz Web PWA (`/app/cajero/caja`):
     - Navegación por pestañas con contador dinámico de transacciones en contingencia.
     - Tres tarjetas métricas de arqueo en tiempo real: Efectivo en Gaveta Offline (`totalPendingCash`), Comprobantes en cola y Estado de conectividad.
     - Tabla interactiva con desglose de tickets, hash UUIDv4, prendas, montos y botones de acción (ver comprobante térmico, sincronización individual, purga de sincronizados y sincronización por lote).
* **Motivo:** Requerimiento formal de tolerancia a desconexión y auditoría de arqueo físico de caja para la 2da Presentación de Sistemas 2.
* **Impacto:**
  - Backend: [`sales_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/sales_schema.py), [`sales_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/sales_service.py), [`sales_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/routes/sales_routes.py).
  - Frontend: [`idb-sales.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/offline/idb-sales.service.ts), [`sales-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/services/sales-api.service.ts), [`caja-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.ts), [`caja-page.component.html`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.html).
  - Pruebas: [`backend/tests/test_cu14_outbox_operations.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu14_outbox_operations.py) con 4/4 PASSED y verificación TypeScript con 0 errores.

### Registro 25: 2026-11-03 — Gestión y Resolución de Conflictos de Ventas Offline y Quiebres de Stock (CU16)
* **Decisión:**
  1. Diseñar el módulo de conciliación gerencial para sobreventas ocurridas durante operaciones offline en `p5_gestion_ventas_pos`:
     - Endpoint `GET /api/sales/conflicts`: Lista las ventas marcadas con `CONFLICT:...` para la sucursal del Encargado, calculando en tiempo real las existencias centrales de cada variante y el motivo del quiebre.
     - Endpoint `POST /api/sales/conflicts/{sale_id}/resolve`: Aplica una de las 3 vías reglamentarias bajo control de acceso de rol `encargado` o `administrador`.
  2. Implementación de las **3 Vías Reglamentarias de Resolución (RF-37 / RF-38)**:
     - **Vía 1 (`negative_stock`):** Reconoce la entrega física previa al cliente en mostrador; descuenta el inventario central dejando el saldo temporalmente negativo (-1) para cuadrar con el balance de tienda y emite solicitud de reposición prioritaria. La venta pasa a `COMPLETED`.
     - **Vía 2 (`substitute`):** Permite al Encargado reasignar el ítem vendido a una variante o talla disponible en la sucursal. Utiliza bloqueo pesimista `with_for_update()` sobre `Inventory` para garantizar que la nueva variante posea stock suficiente; descuenta la unidad y actualiza `target_item.variant_id`. La venta pasa a `COMPLETED`.
     - **Vía 3 (`credit_note`):** En caso de agotamiento absoluto insalvable o preferencia del cliente, ejecuta anulación contable de la venta (`Sale.status = CANCELLED`). Genera formalmente un registro en `garment_returns` con retención del 0% (`retention_percentage = 0.00`, reembolso neto del 100%) y emite un código digital unívoco `NC-YYYYMMDD-XXXX`.
  3. **Auditoría Obligatoria Inviolable:** Validación en Pydantic y en servicio exigiendo una justificación gerencial (`resolution_note`) de al menos 5 caracteres no vacíos para fines de trazabilidad tributaria y peritaje contable.
  4. En Frontend Web PWA Angular (`/app/encargado/sale-conflicts`):
     - Componente [`sale-conflicts-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/encargado/pages/sale-conflicts-page.component.ts) bajo directrices `/frontend-design`.
     - 3 Tarjetas de métricas superiores (Conflictos Pendientes, Monto Retenido/Afectado, Resumen de Políticas).
     - Cards de diagnóstico detallado por ticket de contingencia con badges de quiebre.
     - Modal adaptativo de 3 vías con feedback visual diferenciado (ámbar, esmeralda, púrpura), inputs reactivos y contador de caracteres de auditoría.
* **Motivo:** Requerimiento formal del pliego oficial de Sistemas 2 (CU16) para el tratamiento de sobreventas en retail omnicanal cuando la venta física de mostrador colisiona con el inventario central.
* **Impacto:**
  - Backend: [`sale_conflict_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/sale_conflict_schema.py), [`sale_conflict_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/sale_conflict_service.py), [`sale_conflict_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/routes/sale_conflict_routes.py).
  - Frontend: [`sale.model.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/models/sale.model.ts), [`sales-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/services/sales-api.service.ts), [`sale-conflicts-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/encargado/pages/sale-conflicts-page.component.ts), [`sale-conflicts-page.component.html`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/encargado/pages/sale-conflicts-page.component.html), [`app.routes.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/app.routes.ts), [`app-shell.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/layouts/app-shell.component.ts).
  - Pruebas: [`backend/tests/test_cu16_resolve_offline_sale_conflicts.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu16_resolve_offline_sale_conflicts.py) con 7/7 PASSED (100%) y TypeScript compilado con 0 errores.

### Registro 26: 2026-11-03 — Geolocalización de Sucursales y Trazado de Rutas con OpenStreetMap / ORS (CU19)
* **Decisión:**
  1. **Estrategia Híbrida de Ruteo sin Dependencias Bloqueantes:**
     - Diseñar [`routing_service.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/branches_map/routing_service.dart) con arquitectura desacoplada de 3 niveles:
       - **Nivel 1 (OSRM Público sobre OpenStreetMap):** Consume `router.project-osrm.org` (`driving` y `walking`) sin requerir API Key obligatoria para la defensa del proyecto y evaluación docente.
       - **Nivel 2 (OpenRouteService Oficial):** Admite inyección de API Key de ORS (`api.openrouteservice.org`) si se configura, con decodificación de polilíneas GeoJSON.
       - **Nivel 3 (Fallback Geodésico Haversine):** Si no hay conectividad externa o ambos proveedores están inaccesibles, calcula la distancia ortodrómica radial y dibuja una línea directa de cortesía, estimando tiempos de viaje basados en velocidades promedio (40 km/h auto, 4.5 km/h a pie).
  2. **Consumo de Sucursales con Aislamiento Multitenant:**
     - Implementar endpoint público y optimizado en backend: `GET /api/branches/public` en `p1_gestion_usuarios_acceso/routes/branch_routes.py`.
     - Permite a la app móvil Flutter obtener las sucursales del tenant autenticado o seleccionado con sus coordenadas (`latitude`, `longitude`), dirección, teléfono y horarios de apertura.
  3. **Población Geográfica en Seed (`seed_saas.py`):**
     - Georreferenciadas con precisión métrica real las 3 sucursales de *Boutique Elegance* en Santa Cruz de la Sierra (Central René Moreno, Equipetrol Av. San Martín, Ventura Mall 4to Anillo) y la sucursal de *Moda Urbana* en Cochabamba.
  4. **Diseño Frontend Mobile de Alta Gama (`frontend-design`):**
     - Componente [`branches_map_page.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/branches_map/branches_map_page.dart) con paleta midnight/champagne gold, pines personalizados con halo radiante, selector flotante de modo de transporte (`driving` / `walking`), tarjeta modal inferior de detalle con botón "¿Cómo llegar?" y trazado de polilíneas interactivas con `flutter_map`.
* **Motivo:** Cumplimiento del pliego de Sistemas 2 (CU19 de la 3ra Presentación) para geolocalización de sucursales físicas y asistencia de navegación multimodal para clientes en la app Flutter sin incurrir en cuotas privativas ni fallos por falta de llaves en la evaluación.
* **Impacto:**
  - Backend: [`branch_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/routes/branch_routes.py), [`seed_saas.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/seed_saas.py), [`test_cu19_branch_public_map.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu19_branch_public_map.py) (2/2 PASSED).
  - Mobile Flutter: [`pubspec.yaml`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/pubspec.yaml), [`AndroidManifest.xml`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/android/app/src/main/AndroidManifest.xml), [`catalog_models.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/catalog/catalog_models.dart), [`routing_models.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/branches_map/routing_models.dart), [`routing_service.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/branches_map/routing_service.dart), [`branches_map_controller.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/branches_map/branches_map_controller.dart), [`branches_map_page.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/branches_map/branches_map_page.dart), [`routes.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/app/routes.dart), [`management_page.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/management/management_page.dart), [`routing_service_test.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/test/routing_service_test.dart).





### Registro 28: 2026-11-08 — Machine Learning No Supervisado: Segmentación K-Means RFM+D y Asignación Heurística de Perfiles (CU24)
* **Decisión:**
  1. **Modelado Vectorial Multidimensional RFM+D:**
     - Se definió el vector de entrada para clustering de clientes combinando las métricas de recencia, frecuencia y gasto monetario con la tasa de retorno de producto: $[R, F, M, D]$, donde $D = \frac{\text{devoluciones (CU18)} + \text{cambios de talla (CU17)}}{\text{frecuencia de compra}}$.
     - Normalización obligatoria mediante `StandardScaler` de Scikit-Learn antes de computar distancias euclidianas.
  2. **Pipeline de Clustering $k$-Means e Inferencia de Perfiles:**
     - Algoritmo: `KMeans(n_clusters=4, init='k-means++', n_init=10, random_state=42)`.
     - Evaluación de calidad en tiempo real con Coeficiente Silhouette ($s \ge 0.50$) e Inercia intra-clúster.
     - Asignación dinámica de perfiles de negocio a partir de los centroides desescalados:
       - *Clientes VIP / Embajadores:* Máximo valor $M$ y alta frecuencia $F$.
       - *Compradores de Temporada:* Frecuencia moderada y baja recencia en cambios de estación.
       - *Cazadores de Ofertas:* Alta recencia $R$ y ticket promedio moderado/bajo.
       - *Perfil de Alto Retorno:* Tasa $D > 30\%$, con acciones orientadas a probador virtual y políticas de retención.
  3. **Resiliencia ante Datos Escasos (Cold Start con CU22):**
     - Si el tenant cuenta con $< 10$ clientes con ventas reales, el servicio conmuta transparentemente a generar cohortes coherentes basadas en el dataset sintético exportado en CU22, garantizando que el clustering funcione desde el primer día de suscripción.
  4. **Gobernanza de Planes y Persistencia:**
     - Validación defensiva mediante `validate_ai_access` (HTTP 403 Forbidden para Plan Básico).
     - Serialización `.joblib` en `backend/app/data/models/`, auditoría en `ml_models` y persistencia en `customer_segments`.
* **Motivo:** Cumplimiento de los requisitos `RF-53` y `RF-54` de la 3ra Presentación y requerimiento del pliego de Sistemas 2 sobre analítica no supervisada.
* **Impacto:**
  - Archivos creados: [`customer_segmentation_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/schemas/customer_segmentation_schema.py), [`customer_segmentation_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/services/customer_segmentation_service.py), [`customer_segmentation_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/routes/customer_segmentation_routes.py).
  - Integración en [`router.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/router.py).
  - Suite de pruebas de caja negra [`test_cu24_customer_segmentation.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu24_customer_segmentation.py) con **5/5 pruebas PASSED (100%)**.
