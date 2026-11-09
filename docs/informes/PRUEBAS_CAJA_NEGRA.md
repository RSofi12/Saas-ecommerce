# 📋 INFORME DE PRUEBAS DE CAJA NEGRA (BLACK-BOX TESTING)
### FashionStore — Plataforma E-Commerce SaaS Multitenant
**Materia:** Sistemas de Información 2 (2do Parcial)  
**Alcance:** Casos de Uso Oficiales de 1ra y 2da Presentación (`CU01` al `CU18`)  
**Metodología:** ICONIX (UML 2.5+) — Verificación Funcional Externa e Integridad Transaccional  
**Estado:** Documento Vivo de Homologación de Calidad  

---

## 1. 🎯 Marco Metodológico y Estándar de Prueba

Las pruebas de caja negra evalúan la funcionalidad del sistema basándose exclusivamente en los requisitos funcionales, contratos de entrada/salida y políticas de negocio inviolables, sin depender de la estructura interna del código fuente.

### Técnicas de Diseño Aplicadas:
1. **Partición de Equivalencia (EP):** División del dominio de datos en clases válidas e inválidas.
2. **Análisis de Valores Límite (BVA):** Verificación de condiciones de frontera (plazos en días, umbrales de stock, montos $\Delta = 0$, cuotas máximas de sucursales).
3. **Pruebas de Transición de Estados:** Cambios en el ciclo de vida de pedidos, reservas, transferencias y ventas (`COMPLETED`, `VENCIDA`, `CANCELLED`).
4. **Verificación de Políticas Inviolables:** Comprobación estricta de las reglas del pliego (abono obligatorio de diferencia $\Delta > 0$, retención 20%-50%, restricción de efectivo offline, cuotas de planes y despacho bloqueado ante pagos no confirmados).

### Estructura Canónica de Cada Caso de Prueba:
| Campo | Definición |
| :--- | :--- |
| **ID Caso de Prueba** | Identificador unívoco formal (`CP-[CU]-[Nro]`). |
| **Caso de Uso** | Código y nombre del Caso de Uso bajo ICONIX. |
| **Tipo de Prueba** | Camino Feliz (*Happy Path*), Límite, Regla de Negocio o Seguridad Multitenant. |
| **Precondiciones** | Estado del sistema, autenticación y datos previos requeridos. |
| **Entradas (Input)** | Parámetros, payloads o acciones del usuario. |
| **Pasos de Ejecución** | Secuencia ordenada de interacción usuario-sistema. |
| **Resultado Esperado** | Comportamiento, código HTTP, mensajes y balance de datos previstos. |
| **Resultado Obtenido** | Comportamiento observado durante la ejecución. |
| **Estado** | `APROBADO` / `PASSED`. |

---

## 2. 🏛️ Matriz de Pruebas de Caja Negra — 1ra Presentación (CU01 al CU10)

---

### CU01: Registrar y Gestionar Empresas (Tenants)

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU01-01** | Creación exitosa de empresa tenant (Happy Path) | Superadministrador autenticado con JWT de plataforma. | `name: "Boutique Elegance"`, `business_name: "Boutique Elegance SRL"`, `subdomain: "elegance"`, `nit_rut: "1029384756"`. | 1. Envía `POST /api/saas/companies` con datos válidos.<br>2. Verifica persistencia en base de datos. | Código `HTTP 201 Created`. Registro creado con `status: "ACTIVO"`, UUID generado y aislamiento de esquema preparado. | Empresa creada con UUID unívoco y estado activo. | **APROBADO** |
| **CP-CU01-02** | Rechazo por subdominio o NIT duplicado (Unicidad) | Ya existe una empresa registrada con `subdomain: "elegance"` o NIT `"1029384756"`. | Petición de creación con el mismo subdominio o NIT. | 1. Envía `POST /api/saas/companies` duplicando credencial comercial. | Código `HTTP 409 Conflict` o `400 Bad Request`. Mensaje indicando que el subdominio o NIT ya está en uso. | Rechazo con código 400/409 impidiendo duplicidad. | **APROBADO** |
| **CP-CU01-03** | Listado administrativo de empresas activas | Superadministrador en portal de control global. | Petición `GET /api/saas/companies`. | 1. Ejecuta consulta paginada de tenants. | Código `HTTP 200 OK`. Lista de empresas registradas con sus fechas de alta, estado y suscripción vigente. | Catálogo de tenants retornado con metadatos completos. | **APROBADO** |

---

### CU02: Gestionar Planes de Suscripción (Básico, Pro, Empresarial) y Cuotas

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU02-01** | Asignación de plan de suscripción inicial a tenant | Empresa registrada sin suscripción activa. Planes precargados en BD. | `company_id`, `plan_id` (Plan Profesional: máx. 10 sucursales, IA habilitada). | 1. Envía `POST /api/saas/subscriptions`. | Código `HTTP 201 Created`. Suscripción con estado `ACTIVA`, cuota asignada a 10 y auditoría de inicio de vigencia. | Suscripción vinculada exitosamente con cuota de 10 sucursales. | **APROBADO** |
| **CP-CU02-02** | Downgrade Guard: Bloqueo de cambio a plan inferior que exceda cuota activa | Empresa posee 5 sucursales activas en Plan Pro. Intenta descender a Plan Básico (límite: 3). | Solicitud de cambio a plan con `plan_id` de Plan Básico. | 1. Envía `POST /api/saas/subscriptions/change-plan`. | Código `HTTP 400 Bad Request`. Mensaje: *"No puede descender al plan Básico porque tiene 5 sucursales activas (límite: 3)"*. | Cambio de plan rechazado protegiendo la regla Downgrade Guard. | **APROBADO** |
| **CP-CU02-03** | Upgrade de Plan exitoso (Básico a Profesional) | Empresa en Plan Básico con 2 sucursales activas solicita ascenso. | Solicitud de cambio con `plan_id` de Plan Profesional. | 1. Envía solicitud de upgrade de plan. | Código `HTTP 200 OK`. Límite de sucursales ampliado inmediatamente a 10 y acceso a módulo IA activado. | Plan actualizado y cuotas liberadas al instante. | **APROBADO** |

---

### CU03: Iniciar Sesión Multitenant con JWT y Claims de Tenant

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU03-01** | Inicio de sesión exitoso con emisión de JWT completo | Usuario activo registrado en la sucursal de un tenant. | `email: "cajero@elegance.com"`, `password: "Correcta123"`. | 1. Envía `POST /api/auth/login`. | Código `HTTP 200 OK`. Retorna `access_token` JWT decodificable con claims: `sub`, `rol`, `tenant_id`, `branch_id`. | Token emitido conteniendo la identidad multitenant completa. | **APROBADO** |
| **CP-CU03-02** | Rechazo por credenciales incorrectas | Usuario registrado en el sistema. | `email: "cajero@elegance.com"`, `password: "Invalida"`. | 1. Envía `POST /api/auth/login` con contraseña errónea. | Código `HTTP 401 Unauthorized`. Mensaje: *"Credenciales inválidas"*. Ningún token generado. | Acceso denegado con HTTP 401. | **APROBADO** |
| **CP-CU03-03** | Rechazo de acceso a usuario desactivado | Usuario marcado en BD con `is_active = False`. | `email: "desactivado@elegance.com"`, credenciales correctas. | 1. Intenta autenticarse en el sistema. | Código `HTTP 403 Forbidden` (o `401`). Mensaje: *"Usuario inactivo"*. | Acceso bloqueado previniendo accesos huérfanos. | **APROBADO** |

---

### CU04: Gestionar Sucursales Bajo Límites del Plan

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU04-01** | Creación de sucursal dentro de la cuota del plan | Empresa en Plan Básico con 1 sucursal activa (límite: 3). | `name: "Sucursal Norte"`, `city: "Santa Cruz"`, `address: "Av. Banzer Km 5"`. | 1. Envía `POST /api/branches`. | Código `HTTP 201 Created`. Sucursal creada con `is_active = True`. Cuota pasa de 1 a 2 ocupadas. | Sucursal creada; `/api/branches/quota` reporta 2/3 ocupadas. | **APROBADO** |
| **CP-CU04-02** | Bloqueo al alcanzar el límite comercial del plan (Política 4) | Empresa en Plan Básico con 3 sucursales activas (cuota colmada: 3/3). | Solicitud de creación de una 4ta sucursal. | 1. Envía `POST /api/branches`. | Código `HTTP 403 Forbidden`. Mensaje: *"Límite de sucursales alcanzado para su plan de suscripción (3)"*. | Creación bloqueada; cero sobrecupo permitido. | **APROBADO** |
| **CP-CU04-03** | Liberación inmediata de cuota al desactivar sucursal | Empresa con cuota llena (3/3). Desactiva 1 sucursal existente. | `PATCH /api/branches/{id}/status` con `is_active = False`. | 1. Desactiva sucursal.<br>2. Consulta `GET /api/branches/quota`. | Código `HTTP 200 OK`. Cuota consumida baja inmediatamente a 2/3 sin requerir reinicio del servidor. | Cupo liberado al instante; permite registrar una nueva sucursal. | **APROBADO** |
| **CP-CU04-04** | Soft-Delete defensivo ante dependencias históricas | Sucursal posee registros históricos de inventario y ventas vinculados. | Envía `DELETE /api/branches/{id}`. | 1. Controlador detecta dependencias FK.<br>2. Conmuta operación a soft-delete defensivo. | Código `HTTP 200 OK`. Sucursal marcada con `is_active = False` y desvinculada; FK intactas en PostgreSQL. | Eliminación segura ejecutada sin errores de integridad referencial. | **APROBADO** |

---

### CU05: Gestionar Prendas y Variantes de Precio por Talla

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU05-01** | Registro de prenda matriz con variantes diferenciadas por talla | Tenant activo con categoría creada. | Prenda "Vestido Fiesta" con Variante M a Bs 50 y Variante L a Bs 70. | 1. Envía `POST /api/products` con matriz de variantes. | Código `HTTP 201 Created`. Prenda registrada con `ProductVariant` asociadas a distintos precios y SKU único. | Prenda persistida con variantes y precios diferenciales. | **APROBADO** |
| **CP-CU05-02** | Rechazo por SKU duplicado en catálogo de variantes | Ya existe una variante con `sku: "VEST-L-001"`. | Intento de registrar otra variante con el mismo SKU. | 1. Envía solicitud con SKU existente. | Código `HTTP 400 Bad Request` o `409 Conflict`. Restricción de unicidad aplicada. | Error de SKU duplicado capturado en controlador. | **APROBADO** |
| **CP-CU05-03** | Aislamiento de catálogo entre tenants | Empresa A tiene prenda con ID X. Usuario de Empresa B intenta editarla. | Petición `PUT /api/products/{id_X}` con token de Empresa B. | 1. Backend evalúa `tenant_id`. | Código `HTTP 404 Not Found` (o `403 Forbidden`). Producto inaccesible para otro tenant. | Aislamiento multitenant blindado; catálogo privado. | **APROBADO** |

---

### CU06: Consultar Catálogo Online con Búsqueda Facetada

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU06-01** | Búsqueda facetada multicriterio (Categoría, Talla, Rango de Precio) | Catálogo con 50 prendas publicadas indexadas en PostgreSQL. | `GET /api/catalog/products?category=vestidos&size=M&min_price=40&max_price=80`. | 1. Usuario aplica filtros dinámicos en tienda online. | Código `HTTP 200 OK`. Retorna únicamente prendas que cumplan simultáneamente todos los criterios. | Resultados facetados exactos con paginación optimizada. | **APROBADO** |
| **CP-CU06-02** | Búsqueda facetada sin resultados coincidentes | Ninguna prenda cumple los filtros extremos especificados. | Filtro con `min_price=5000` en categoría económica. | 1. Ejecuta búsqueda con filtros fuera de rango. | Código `HTTP 200 OK`. Retorna lista vacía `data: []` y total 0 sin errores en el servidor. | Respuesta vacía controlada; mensaje en frontend: *"Sin coincidencias"*. | **APROBADO** |

---

### CU07: Sincronizar y Descargar Catálogo a Almacenamiento Local (PWA / SQLite)

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU07-01** | Descarga exitosa de paquete comprimido de catálogo offline | Servidor con prendas e inventario de sucursal. Conectividad estable. | Petición `GET /api/catalog/offline-pack?branch_id={id}`. | 1. Cliente PWA/Móvil solicita el paquete de la sucursal. | Código `HTTP 200 OK`. JSON estructurado con productos, variantes, precios, fotos y stock local. | Paquete descargado con éxito con versión de sincronización. | **APROBADO** |
| **CP-CU07-02** | Persistencia completa en IndexedDB (`fashionstore_local_db`) | PWA en navegador compatible con IndexedDB v1. | Paquete offline recibido de 30 productos. | 1. `IdbCatalogService` almacena registros en almacén de objetos local. | Catálogo guardado en disco del navegador; disponible para consultas offline. | Almacenes `products` e `inventory` poblados en IndexedDB. | **APROBADO** |
| **CP-CU07-03** | Persistencia completa en SQLite en App Móvil Flutter | App móvil con motor `sqflite` inicializado. | Paquete offline descargado mediante Dio. | 1. `LocalCatalogDb` ejecuta inserciones en lote dentro de transacción SQLite. | Tabla `local_products` poblada localmente en el almacenamiento del dispositivo. | Base de datos SQLite local lista para ventas desconectadas. | **APROBADO** |

---

### CU08: Consultar Catálogo Offline en Modo Desconectado

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU08-01** | Conmutación reactiva y consulta en caché local ante corte de internet | Dispositivo pierde conectividad (`navigator.onLine = false`). Catálogo local precargado. | Usuario escribe "vestido" en el buscador de la tienda. | 1. `NetworkStatusService` detecta estado desconectado.<br>2. Consulta conmuta a IndexedDB/SQLite. | Despliegue de resultados desde almacenamiento local con banner ámbar: *"Modo Sin Conexión"*. | Búsqueda exitosa local sin lanzar errores de red. | **APROBADO** |
| **CP-CU08-02** | Filtrado local por categorías sin conexión | Dispositivo sin internet. | Clic en categoría "Pantalones" en menú local. | 1. Ejecuta query local sobre almacén IndexedDB/SQLite. | Despliega los productos descargados correspondientes a esa categoría. | Filtro local operativo con respuesta instantánea (< 50ms). | **APROBADO** |

---

### CU09: Comprar Prendas con Stripe y Despacho Condicionado

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU09-01** | Pago exitoso con Stripe y emisión de despacho (Política 3) | Carrito con prendas. Pasarela Stripe configurada. Tarjeta de prueba válida. | Confirmación de pago con PaymentIntent confirmado (`status: "succeeded"`). | 1. Stripe confirma `payment_status = "paid"`.<br>2. Controlador genera orden de despacho. | Código `HTTP 200 OK`. Orden pasa a `PAGADA`, se emite código de rastreo formal `DSP-YYYYMMDD-XXXX`. | Despacho generado exitosamente cumpliendo la Política 3. | **APROBADO** |
| **CP-CU09-02** | Bloqueo absoluto de despacho ante pago rechazado o pendiente | Tarjeta de crédito rechazada por fondos insuficientes o pago en espera. | Stripe retorna `status: "requires_payment_method"` o `pending`. | 1. Controlador evalúa `payment_status`.<br>2. No detecta estado `"paid"`. | Bloqueo de orden de despacho. Estado de orden permanece en `PENDIENTE_PAGO`; cero stock despachado. | Despacho bloqueado protegiendo la mercadería física. | **APROBADO** |

---

### CU10: Crear Reserva Online de Prendas con Vencimiento y Bloqueo

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU10-01** | Creación de reserva activa con bloqueo atómico de stock | Prenda con stock disponible en tienda (`quantity = 10`, `reserved = 0`). | Prenda seleccionada, cantidad 1, fecha de retiro dentro de 48h. | 1. Cliente envía `POST /api/reservations`. | Código `HTTP 201 Created`. Stock comprometido sube (`reserved_quantity = 1`), código `RES-XXXXXXXX` y QR emitido. | Reserva creada; stock disponible baja inmediatamente a 9. | **APROBADO** |
| **CP-CU10-02** | Barrido automático de reserva vencida con liberación de stock | Reserva alcanzó `expires_at <= now()`. Stock comprometido = 1. | Ejecución del sweeper continuo (`_expiration_worker_loop` / `POST /api/reservations/sweeper`). | 1. Sweeper audita reservas caducadas.<br>2. Actualiza estado a `VENCIDA`.<br>3. Resta `reserved_quantity`. | Reserva pasa a `VENCIDA`. El stock comprometido se decrementa a 0 y el stock disponible general se restablece. | Stock desbloqueado automáticamente y devuelto a disponibilidad general. | **APROBADO** |
| **CP-CU10-03** | Rechazo por fecha de retiro fuera del plazo legal | Cliente intenta fijar retiro a 15 días (plazo máximo permitido: 7 días). | `pickup_date` fuera de rango. | 1. Envía solicitud de reserva con fecha excesiva. | Código `HTTP 400 Bad Request`. Mensaje: *"La fecha de retiro debe estar entre hoy y 7 días máximo"*. | Rechazo controlado; reserva no creada. | **APROBADO** |

---

## 3. 📦 Matriz de Pruebas de Caja Negra — 2da Presentación (CU11 al CU18)

---

### CU11: Registrar Reserva de Prendas Offline en Modo Desconectado (PWA / SQLite)

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU11-01** | Generación de reserva local sin internet en PWA | Red desconectada (`navigator.onLine = false`). Catálogo local precargado en IndexedDB con variante `var_id: "a1b2c3d4-..."` (Stock local: 5). | `client_reservation_id: "c8e14b2d-9876-4321-bb11-8899aabbccdd"`, `visit_date: "2026-11-05"`, `pickup_date: "2026-11-07"`, `items: [{"variant_id": "a1b2c3d4-...", "quantity": 1}]`. | 1. Cliente selecciona prenda y fecha de retiro en modo offline.<br>2. PWA valida stock en caché local.<br>3. `IdbReservationsService` persiste en IndexedDB (`pending_reservations`). | Guardado en IndexedDB con estado `PENDIENTE_SYNC`, decremento local de stock (5 a 4) y ticket de contingencia `RES-OFF-AABB11` generado. | Reserva en cola outbox con UUIDv4; ticket modal desplegado con código provisorio. | **APROBADO** |
| **CP-CU11-02** | Registro offline en App Móvil Flutter con SQLite | App Móvil en modo desconectado. Base SQLite `fashionstore_mobile.db` activa. | `client_reservation_id: "d9f25c3e-1111-2222-3333-444455556666"`, `branch_id: "b1000000-0000-0000-0000-000000000001"`, `items: [{"variant_id": "var_001", "quantity": 1}]`. | 1. Usuario confirma reserva en Flutter.<br>2. `LocalCatalogDb` ejecuta `INSERT INTO local_pending_reservations`. | Registro insertado en SQLite con `sync_status = 'PENDIENTE_SYNC'`, QR generado en pantalla y stock local reducido. | Operación almacenada en tabla SQLite nativa del dispositivo. | **APROBADO** |
| **CP-CU11-03** | Sincronización idempotente automática al reconectar | Conexión restablecida (`window:online`). 1 reserva en outbox (`client_reservation_id: "c8e14b2d-..."`). | Evento reactivo `online` envía `POST /api/reservations/` con payload de contingencia y `client_reservation_id`. | 1. Outbox worker detecta red.<br>2. Envía petición HTTP al backend.<br>3. Backend valida idempotencia y ejecuta `with_for_update` en `Inventory`. | Código `HTTP 201 Created`. Stock central bloqueado (`reserved_quantity += 1`), código definitivo `RES-20261102-0042` emitido y outbox local pasa a `CONFIRMADO_SERVER`. | Reserva consolidada en PostgreSQL; badge de PWA conmuta de ámbar a verde confirmado. | **APROBADO** |
| **CP-CU11-04** | Prevención de doble sincronización por reintento de red (Idempotencia) | Red intermitente reenvía el mismo `client_reservation_id: "c8e14b2d-..."` 100 ms después de la primera petición. | Mismo payload con `client_reservation_id: "c8e14b2d-..."` enviado en dos peticiones concurrentes. | 1. Backend recibe primera petición y persiste.<br>2. Segunda petición detecta `client_reservation_id` preexistente en el tenant. | Código `HTTP 200/201`. Retorna la reserva existente sin duplicar filas en `reservations` ni volver a incrementar `reserved_quantity`. | Idempotencia verificada: 1 sola reserva y 1 solo incremento en inventario. | **APROBADO** |

---

### CU12: Atender y Resolver Conflictos de Reservas Expiradas

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU12-01** | Visualización en panel de reservas vencidas con diagnóstico de percha | Reserva `res_id: "res-exp-001"` con `status = 'expired'` tras barrido del sweeper. Encargado autenticado en sucursal `branch_id: "b1000000-..."`. | Petición `GET /api/reservations/branch/conflicts?branch_id=b1000000-...`. | 1. Encargado abre pestaña "Bandeja de Conflictos".<br>2. Backend consulta reservas vencidas y audita stock actual en percha (`quantity - reserved_quantity`). | Código `HTTP 200 OK`. Retorna array con reserva, prenda, talla, días de atraso y bandera `can_reactivate: true` (stock percha >= 1). | Bandeja cargada con semáforo verde indicando disponibilidad física en percha. | **APROBADO** |
| **CP-CU12-02** | Resolución vía Reactivación con stock disponible | Reserva expirada `res_id: "res-exp-001"`. Prenda con existencias en tienda (`quantity: 5, reserved: 0`). | `POST /api/reservations/res-exp-001/resolve-conflict` con `resolution_type: "reactivate"`, `extension_days: 2`, `resolution_note: "Cliente justificó demora por fuerza mayor"`. | 1. Encargado selecciona 'Reactivar'.<br>2. Backend ejecuta `with_for_update` en `Inventory`.<br>3. Extiende `expires_at` en +48h y re-bloquea `reserved_quantity` (+1). | Código `HTTP 200 OK`. `status: "confirmed"`, `reserved_quantity: 1`, auditoría `[REACTIVACIÓN +2d]` guardada en `resolution_note`. | Reserva reactivada con éxito; stock bloqueado atómicamente en percha. | **APROBADO** |
| **CP-CU12-03** | Bloqueo de reactivación si la prenda fue vendida a otro cliente | Prenda de reserva expirada tiene stock disponible = 0 (`quantity: 1, reserved: 1` de otra orden). | `POST /api/reservations/res-exp-002/resolve-conflict` con `resolution_type: "reactivate"`, `extension_days: 1`. | 1. Encargado intenta forzar reactivación.<br>2. Backend audita `quantity - reserved_quantity < requested`. | Código `HTTP 400 Bad Request`. Mensaje: *"No hay existencias suficientes en percha para reactivar la reserva"*. Inventario intacto. | Reactivación denegada con HTTP 400 protegiendo contra sobreventa física. | **APROBADO** |
| **CP-CU12-04** | Resolución vía Sustitución de Variante | Prenda original (Vestido Talla M) agotada. Talla L (`new_var_id: "var-vest-L"`) tiene 3 unidades disponibles. | `POST /api/reservations/res-exp-003/resolve-conflict` con `resolution_type: "substitute"`, `new_variant_id: "var-vest-L"`, `resolution_note: "Sustituido por Talla L con consentimiento"`. | 1. Encargado selecciona prenda sustituta.<br>2. Backend actualiza `ReservationItem.variant_id`.<br>3. Bloquea stock de Talla L (`reserved_quantity += 1`). | Código `HTTP 200 OK`. `status: "confirmed"`, variante actualizada en el ticket y auditoría `[SUSTITUCIÓN VAR SKU]` registrada. | Variante reasignada exitosamente sin descuadres contables de inventario. | **APROBADO** |
| **CP-CU12-05** | Cierre definitivo y desistimiento | Cliente desiste de la compra tras asistir fuera de plazo. | `POST /api/reservations/res-exp-004/resolve-conflict` con `resolution_type: "close"`, `resolution_note: "Cliente desiste formalmente de retirar la prenda"`. | 1. Encargado marca cierre definitivo.<br>2. Backend valida nota >= 5 caracteres y actualiza estado. | Código `HTTP 200 OK`. `status: "cancelled"`, `resolved_at: now()`, stock remanente liberado permanentemente. | Reserva cerrada y archivada en auditoría; percha disponible para venta general. | **APROBADO** |

---

### CU13: Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU13-01** | Venta offline exitosa exclusivamente en efectivo (Política 5) | Caja POS sin conexión a internet. Prenda "Vestido Fiesta L" en catálogo local (Bs 70.00, saldo: 5). | `client_sale_id: "a3b9f123-5555-4444-9999-112233445566"`, `is_offline: true`, `payment_method: "cash"`, `cash_received: 100.00`, `items: [{"variant_id: "var-vest-L", quantity: 1, unit_price: 70.00}]`. | 1. Cajero registra venta en modo desconectado.<br>2. PWA calcula cambio: Bs 30.00.<br>3. `IdbSalesService` persiste en IndexedDB (`pending_offline_sales`).<br>4. Emite ticket térmico modal. | Venta guardada en IndexedDB con estado `PENDIENTE_SYNC`, stock local descontado (5 a 4), ticket térmico `TCK-OFF-334455` emitido con hash UUIDv4. | Venta de contingencia creada; cambio en vivo calculado a Bs 30.00 y modal de ticket presentado. | **APROBADO** |
| **CP-CU13-02** | Bloqueo estricto de pagos electrónicos en modo offline (Política 5 Inviolable) | TPV sin conectividad a internet. Carrito con prendas por Bs 140.00. | Intento de registrar venta offline con `payment_method: "stripe"` o `"tarjeta"`. | 1. Cajero intenta seleccionar método digital.<br>2. Interfaz bloquea visualmente botones de tarjeta.<br>3. Pydantic `@field_validator('payment_method')` evalúa `is_offline = True`. | PWA deshabilita métodos digitales. A nivel API/Schema se genera `HTTP 422 Unprocessable Entity`: *"Las ventas offline deben pagarse exclusivamente en efectivo (cash)"*. | Bloqueo absoluto de pagos electrónicos garantizando la Política 5. | **APROBADO** |
| **CP-CU13-03** | Idempotencia transaccional central: Reintento de sincronización sin doble descuento | Venta offline previamente sincronizada en backend con `client_sale_id: "a3b9f123-..."`. Stock de prenda en BD: 8 unidades. | Segundo envío HTTP a `create_sale` con el mismo `client_sale_id: "a3b9f123-..."` y mismo `tenant_id`. | 1. PWA o sync worker reenvía venta por fallo de confirmación de red.<br>2. `sales_service.py` detecta `client_sale_id` existente. | Retorna la venta existente `Sale` con `HTTP 200/201`. Cero ejecuciones de descuento de stock. El inventario central permanece intacto en 8 unidades. | Idempotencia confirmada: no se genera venta duplicada ni se descuenta inventario por segunda vez. | **APROBADO** |
| **CP-CU13-04** | Aislamiento Multitenant en ventas offline | Venta offline generada con `client_sale_id` en Boutique Elegance. Token JWT de Moda Urbana intenta sincronizarla. | Petición de sincronización con `client_sale_id` foráneo bajo token de otro tenant. | 1. `sales_service` consulta `client_sale_id` filtrando por `tenant_id` de la empresa del token. | Backend procesa la venta exclusivamente dentro del contexto de Moda Urbana sin afectar registros de Elegance. | Aislamiento estricto por `tenant_id` verificado; cero colisión cruzada entre tenants. | **APROBADO** |
| **CP-CU13-05** | Validación de identificador único de contingencia (`client_sale_id`) obligatorio | Petición con `is_offline = true` enviada sin `client_sale_id` (o `null`). | Payload con `is_offline: true, client_sale_id: null`. | 1. Cliente envía venta desconectada sin UUID.<br>2. `sales_service.py` valida presencia obligatoria de UUID de cliente. | Código `HTTP 400 Bad Request`. Mensaje: *"Las ventas offline requieren client_sale_id para idempotencia"*. | Rechazo HTTP 400 impidiendo inserción de ventas huérfanas sin trazabilidad. | **APROBADO** |

---

### CU14: Gestionar Bandeja Local de Operaciones Pendientes (Outbox PWA / SQLite)

**Ficha Técnica de Cobertura:**
- **Entidades Auditadas:** Bandeja Local IndexedDB (`pending_offline_sales`), Servicio API `POST /api/sales/offline/check-status`, y `sales`.
- **Política Clave:** Autonomía operativa desconectada y trazabilidad universal mediante `client_sale_id` (UUIDv4) con arqueo contable de efectivo en gaveta física.

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU14-01** | **Acumulación y Persistencia de Transacciones en Bandeja Outbox (IndexedDB)** | TPV en modo contingencia offline (`simulatedOffline = true` o sin internet). Catálogo local cargado. | Venta 1: Vestido L (Bs 70.00). Venta 2: Pantalón M (Bs 50.00). Ambos cobrados en efectivo. | 1. Cajero emite venta 1 (Ticket `TCK-OFF-8A2F1B`).<br>2. Cajero emite venta 2 (Ticket `TCK-OFF-3C4D5E`).<br>3. Cajero hace clic en pestaña *"Bandeja Outbox Local"* (`switchTab('outbox')`). | La bandeja despliega 2 comprobantes con estado *"Pendiente Outbox"* (badge ámbar), montos Bs 70.00 y Bs 50.00, y UUIDv4 únicos asignados. Arqueo refleja Bs 120.00. | Bandeja renderiza ambas ventas con identificadores UUIDv4 y arqueo en Bs 120.00 en gaveta. | **APROBADO** |
| **CP-CU14-02** | **Verificación de Estado contra Servidor Central (`check-status`)** | Servidor online restablecido. Bandeja contiene 2 ventas: UUID-A (ya registrada en backend previamente) y UUID-B (pendiente real). | `client_sale_ids: ["9e3c988a-3e81-42cb-b1b7-ff0b8a2e55aa", "a1b2c3d4-e5f6-47a8-b9c0-112233445566"]`. | 1. Cajero presiona botón *"Verificar con Servidor"* en la bandeja.<br>2. PWA envía `POST /api/sales/offline/check-status`.<br>3. `sales_service.py` valida estado de cada UUID en BD.<br>4. PWA actualiza marcas locales de sincronización. | Código `HTTP 200 OK`. `status_map: {UUID-A: "synced", UUID-B: "pending"}`. En UI, UUID-A cambia automáticamente a *"Sincronizado"* (badge esmeralda). | Estado de sincronización conciliado contra el servidor central sin alterar ventas. | **APROBADO** |
| **CP-CU14-03** | **Sincronización Individual desde Bandeja con Transición de Estado** | Conexión restablecida. Comprobante `TCK-OFF-3C4D5E` pendiente en outbox. Stock suficiente en inventario central. | Clic en botón acción *"Sincronizar Venta Ahora"* de la fila correspondiente. | 1. PWA invoca `syncSingleSale()`.<br>2. Envía `POST /api/sales` con `client_sale_id` del ticket.<br>3. Backend registra venta e inventario.<br>4. `IdbSalesService.markAsSynced()` actualiza IndexedDB. | Fila del ticket pasa a *"Sincronizado"* con icono check verde. Toast informa: *"Ticket TCK-OFF-3C4D5E sincronizado exitosamente con el servidor"*. Contador de pendientes decrementa. | Venta sincronizada unitariamente; estado actualizado en IndexedDB y UI. | **APROBADO** |
| **CP-CU14-04** | **Arqueo en Vivo de Gaveta Offline y Purga de Ventas Consolidadas** | 1 venta pendiente por Bs 50.00 y 1 venta sincronizada por Bs 70.00 en bandeja. | Clic en botón *"Purgar Sincronizadas"* (`clearSyncedFromOutbox()`). | 1. PWA calcula métrica `totalPendingCash()` = Bs 50.00.<br>2. Cajero presiona *"Purgar Sincronizadas"*.<br>3. `IdbSalesService.clearSynced()` elimina registros con `synced = true`. | Solo permanece la venta pendiente en la tabla. Métrica de efectivo en gaveta se mantiene intacta en Bs 50.00. Comprobantes sincronizados se depuran de memoria local. | Purga ejecutada; solo se conservan pendientes y el arqueo de efectivo se preserva. | **APROBADO** |

---

### CU15: Sincronizar Lotes de Ventas con Idempotencia Central (`sync_operations`)

**Ficha Técnica de Cobertura:**
- **Entidades Auditadas:** `sync_operations`, `sales`, `sale_items`, `inventory`, `inventory_movements`.
- **Política Clave:** Idempotencia estricta por `client_operation_id` / `client_sale_id` (UUIDv4) y exclusividad de pago de contado en efectivo (Política 5).

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU15-01** | **Sincronización exitosa de lote offline en una transacción atómica (Happy Path)** | Terminal POS acumula 2 ventas offline (`TCK-01` y `TCK-02`). Servidor central activo con stock disponible. | `POST /api/sales/offline/batch-sync` con array de 2 operaciones con `payment_method: "cash"`, montos e ítems válidos. | 1. PWA invoca `syncAllPending()`.<br>2. Endpoint recibe lote y abre transacción única con `with_for_update()`.<br>3. Persiste ambas ventas, descuenta inventario y asienta registros en `sync_operations`. | Código `HTTP 200 OK`. `summary: {total_received: 2, applied: 2, duplicates_ignored: 0, conflicts: 0}`. 2 ventas persistidas con `is_offline: true`. | Lote sincronizado al 100%; stock central decrementado en 1 por ítem y outbox local marcado como sincronizado. | **APROBADO** |
| **CP-CU15-02** | **Garantía de Idempotencia ante reintentos de red del mismo lote** | Lote de ventas ya fue recibido y procesado por el servidor central (registrado en `sync_operations` y `sales`). | Reenvío idéntico del mismo payload de `POST /api/sales/offline/batch-sync` con los mismos `client_sale_id`. | 1. Cliente reintenta el envío por timeout de red.<br>2. Backend consulta `SyncOperation` y `Sale` por `client_sale_id`.<br>3. Detecta registro preexistente e ignora el duplicado sin mutar stock. | Código `HTTP 200 OK`. `summary: {total_received: 2, applied: 0, duplicates_ignored: 2, conflicts: 0}`. No se crean ventas duplicadas ni se descuenta inventario nuevamente. | Idempotencia verificada: 0 ventas nuevas creadas, 2 duplicados descartados pacíficamente y stock inalterado. | **APROBADO** |
| **CP-CU15-03** | **Detección y contención de sobreventa concurrente (quiebre de stock sobrevenido)** | Ítem vendido físicamente offline en contingencia, pero el inventario central se agotó (stock = 0) antes de la sincronización. | Operación de venta en lote solicitando 1 unidad de variante con stock central en 0. | 1. Backend evalúa stock bajo bloqueo `with_for_update()`.<br>2. Identifica stock insuficiente pero respeta la entrega física ocurrida.<br>3. Descuenta a stock negativo (-1), marca `is_conflict = True` y crea `SyncOperation` con `status: "EN_CONFLICTO"`. | Código `HTTP 200 OK`. `summary: {total_received: 1, applied: 1, duplicates_ignored: 0, conflicts: 1}`. UUID listado en `conflict_uuids` y en bandeja de resolución (CU16). | Venta registrada con `is_conflict: true`, `status: "EN_CONFLICTO"` en `sync_operations` para conciliación asistida en CU16. | **APROBADO** |
| **CP-CU15-04** | **Rechazo estricto de método de pago no efectivo en lote offline (Política 5)** | Intento de sincronizar operación offline con método de pago electrónico (`stripe` o `qr`) en lugar de efectivo. | Operación en lote con `payment_method: "stripe"`, `is_offline: true`. | 1. Validador Pydantic del schema o servicio evalúa `payment_method`.<br>2. Detecta violación a la Política 5 de pagos offline. | Código `HTTP 422 Unprocessable Entity` (o `400 Bad Request`). Mensaje: *"Por política inviolable (Política 5), las ventas offline deben pagarse exclusivamente en efectivo (cash)"*. | Rechazo automático en validación de esquema; transacción abortada protegiendo la regla contable. | **APROBADO** |

---

### CU16: Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock

**Ficha Técnica de Cobertura:**
- **Entidades Auditadas:** `sales`, `sale_items`, `inventory`, `garment_returns`, `companies`, `branches`.
- **Políticas Clave (RF-37 / RF-38 / P-Ten-04):**
  - **Detección de Quiebre:** Captura de ventas offline colisionadas con existencias centrales en 0 tras sincronización asíncrona.
  - **Tres Vías de Resolución Gerencial:** (1) `negative_stock` (autorización de saldo temporal negativo con solicitud de reposición), (2) `substitute` (sustitución por variante con stock confirmado en sucursal), (3) `credit_note` (anulación contable y emisión de Nota de Crédito digital por el 100% del monto pagado, retención del 0%).
  - **Auditoría Obligatoria:** Justificación gerencial obligatoria (`resolution_note >= 5` caracteres).
  - **Bloqueo Concurrente:** Bloqueo pesimista `with_for_update` en `inventory` para evitar condiciones de carrera.

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU16-01** | **Consulta y Listado de Ventas en Conflicto en Bandeja de Sucursal** | Ventas offline sincronizadas marcadas con `CONFLICT:...` y existencias centrales en 0. Encargado autenticado. | Petición `GET /api/sales/conflicts?branch_id={id}` con token de Encargado de la sucursal. | 1. Encargado accede a la bandeja de resolución.<br>2. Backend filtra ventas con `CONFLICT:` y calcula stock central disponible por variante. | Código `HTTP 200 OK`. Retorna lista enriquecida con `sale_id`, cajero, fecha, motivo del quiebre y stock central = 0. | Bandeja poblada con 3 tickets offline en conflicto y stock en 0 reflejado. | **APROBADO** |
| **CP-CU16-02** | **Resolución Vía 1: Autorización con Stock Negativo y Reposición** | Venta offline por Bs 150.00 con prenda entregada físicamente. Stock central en 0. | `resolution_type: "negative_stock"`, `resolution_note: "Prenda física entregada en mostrador. Se autoriza saldo negativo y se solicita reposición."` | 1. Encargado selecciona Vía 1.<br>2. Envía `POST /api/sales/conflicts/{id}/resolve`.<br>3. Backend actualiza inventario con `with_for_update()`. | Código `HTTP 200 OK`. Venta pasa a `COMPLETED`, `cash_reference` actualizado a `RESOLVED:NEGATIVE_STOCK`, inventario queda en -1 y se emite ticket de reposición. | Stock central actualizado a -1, venta finalizada y trazabilidad registrada en base de datos. | **APROBADO** |
| **CP-CU16-03** | **Resolución Vía 2: Sustitución por Variante Alternativa Disponible** | Venta offline con talla M agotada. Sucursal dispone de 3 unidades en talla L (variante sustituta). | `resolution_type: "substitute"`, `new_variant_id: "{var_subst_id}"`, `resolution_note: "Cliente acordó telefónicamente cambio por Talla L con stock en sucursal."` | 1. Encargado selecciona Vía 2 e indica nueva variante.<br>2. Backend bloquea stock de la sustituta con `with_for_update()`.<br>3. Descuenta 1 unidad y reasigna `variant_id` del ítem. | Código `HTTP 200 OK`. Venta en `COMPLETED`, stock sustituta pasa de 3 a 2 unidades (-1), `cash_reference` en `RESOLVED:SUBSTITUTE`. | Variante sustituida exitosamente; stock remanente: 2 unidades. | **APROBADO** |
| **CP-CU16-04** | **Resolución Vía 3: Anulación Formal y Emisión de Nota de Crédito Digital** | Venta offline por Bs 150.00. Cliente solicita anulación total por agotamiento de stock. | `resolution_type: "credit_note"`, `resolution_note: "Cliente solicita anulación total; se emite Nota de Crédito digital para compras futuras."` | 1. Encargado selecciona Vía 3.<br>2. Envía `POST /api/sales/conflicts/{id}/resolve`.<br>3. Backend crea registro en `garment_returns` con retención 0% y genera código `NC-YYYYMMDD-XXXX`. | Código `HTTP 200 OK`. Venta en `CANCELLED`, `refund_amount: 150.00`, `retention_percentage: 0.00`, código `NC-` retornado. | Venta cancelada contablemente; Nota de Crédito emitida al 100% y persistida en BD. | **APROBADO** |
| **CP-CU16-05** | **Bloqueo de Sustitución por Variante Agotada (Stock = 0)** | Intento de sustitución por otra variante que tampoco tiene existencias (stock = 0). | `resolution_type: "substitute"`, `new_variant_id: "{var_exhausted_id}"`, `resolution_note: "Intento por variante sin stock."` | 1. Encargado ingresa ID de variante agotada.<br>2. Backend verifica `Inventory.quantity < qty_needed`. | Código `HTTP 400 Bad Request`. Mensaje: *"No hay existencias suficientes de la nueva variante en la sucursal para realizar la sustitución."* Inventario intacto. | Rechazo HTTP 400 impidiendo sustitución hacia una variante sin existencias. | **APROBADO** |
| **CP-CU16-06** | **Regla de Auditoría Obligatoria: Justificación Mínima de 5 Caracteres** | Intento de resolver conflicto con justificación vacía o menor a 5 caracteres. | `resolution_type: "negative_stock"`, `resolution_note: "Ok"` (2 caracteres). | 1. Encargado envía payload sin justificación suficiente. | Código `HTTP 422 Unprocessable Entity`. Mensaje: *"La justificación de resolución es obligatoria (mínimo 5 caracteres)"*. Estado de venta inalterado. | Rechazo HTTP 422 protegiendo la regla de trazabilidad y auditoría interna. | **APROBADO** |
| **CP-CU16-07** | **Aislamiento Multitenant Estricto entre Empresas** | Encargado de Empresa B intenta consultar o resolver un conflicto de Empresa A. | Token JWT de Empresa B con `branch_id` o `sale_id` de Empresa A. | 1. Petición autenticada intenta resolver venta ajena. | Código `HTTP 404 Not Found` (o `403 Forbidden`). El conflicto no existe en el tenant del usuario. | Retorna HTTP 404; ningún dato filtrado entre empresas del SaaS. | **APROBADO** |

---

### CU17: Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Estado

**Ficha Técnica de Cobertura:**
- **Entidad Auditada:** `garment_exchanges` y balances de `inventory`.
- **Política Clave (P-Ten-01):** Si $\Delta = P_{\text{nueva}} - P_{\text{original}} > 0$, el cambio **solo** se consolida si el cliente abona la diferencia (`difference_paid = True`).
- **Condición de Prenda:** Etiqueta textil obligatoria e intacta (`good_with_tags`).

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU17-01** | **Cotización de Cambio con Mayor Precio ($\Delta > 0$)** | Venta previa con Vestido M (Bs 50). Vestido L cuesta Bs 70 y tiene 5 unidades en stock. | `sale_id`, `var_orig_id` (Talla M), `var_higher_id` (Talla L). | 1. Cajero ingresa a cotizador.<br>2. Envía `POST /api/exchanges/quote`. | Código `HTTP 200 OK`. `price_difference: 20.00`, `requires_payment: true`, `available_stock_new: 5`. | Respuesta 200 OK con desglose exacto de Bs 20.00 y bandera de pago requerida en `true`. | **APROBADO** |
| **CP-CU17-02** | **Cotización de Cambio al Mismo Precio ($\Delta = 0$)** | Venta con Vestido M (Bs 50). Vestido S cuesta Bs 50 y tiene 3 unidades en stock. | `sale_id`, `var_orig_id` (Talla M), `var_same_id` (Talla S). | 1. Cajero selecciona variante del mismo precio.<br>2. Envía `POST /api/exchanges/quote`. | Código `HTTP 200 OK`. `price_difference: 0.00`, `requires_payment: false`. | Respuesta 200 OK, diferencia Bs 0.00 y no requiere cobro. | **APROBADO** |
| **CP-CU17-03** | **Rechazo por Falta de Pago de Diferencia (Política 1 Inviolable)** | Venta con prenda Bs 50. Prenda nueva Bs 70 ($\Delta = \text{Bs } 20$). Cliente rehúsa o no abona el monto. | `difference_paid: false`, `condition: "good_with_tags"`. | 1. Cajero intenta consolidar el cambio sin confirmar cobro.<br>2. Envía `POST /api/exchanges`. | Código `HTTP 400 Bad Request`. Mensaje: *"La nueva prenda tiene mayor precio... solo puede consolidarse si abona la diferencia"*. Stock intacto (M=10, L=5). | Rechazo HTTP 400. La transacción se cancela; las existencias de M y L quedan inalteradas. | **APROBADO** |
| **CP-CU17-04** | **Consolidación Exitosa con Pago de Diferencia ($\Delta > 0$)** | Prenda original Bs 50 (Stock=10). Prenda nueva Bs 70 (Stock=5). Cliente paga Bs 20 en efectivo. | `difference_paid: true`, `payment_method: "efectivo"`, `condition: "good_with_tags"`. | 1. Cajero marca diferencia abonada.<br>2. Envía `POST /api/exchanges`. | Código `HTTP 201 Created`. Registro en `garment_exchanges` (`COMPLETED`). Stock M sube a 11 (+1) y Stock L baja a 4 (-1). | Registro creado con éxito. Stock de talla M reingresado a 11 y talla L egresado a 4. | **APROBADO** |
| **CP-CU17-05** | **Consolidación de Cambio sin Cobro para Igual Precio ($\Delta = 0$)** | Prenda original Bs 50 (Stock=10). Prenda nueva Bs 50 (Stock=3). | `difference_paid: false`, `condition: "good_with_tags"`. | 1. Cajero procesa cambio de talla M a S sin ingresar cobro.<br>2. Envía `POST /api/exchanges`. | Código `HTTP 201 Created`. Operación aprobada. Stock S disminuye a 2 (-1). | Cambio procesado exitosamente sin exigir pago. Stock de S actualizado a 2. | **APROBADO** |
| **CP-CU17-06** | **Rechazo por Prenda Dañada o Sin Etiqueta Textil** | Cliente presenta prenda con etiqueta arrancada o signos de uso evidente. | `condition: "damaged_or_no_tags"`, `difference_paid: true`. | 1. Cajero inspecciona prenda e indica estado no conforme.<br>2. Envía `POST /api/exchanges`. | Código `HTTP 400 Bad Request`. Mensaje: *"La prenda debe contar con su etiqueta textil intacta"*. No altera stock. | Rechazo HTTP 400. Operación cancelada sin movimientos de inventario. | **APROBADO** |
| **CP-CU17-07** | **Bloqueo por Quiebre de Stock de la Variante Nueva** | Prenda nueva deseada tiene 0 unidades disponibles en inventario físico. | `new_variant_id` con stock disponible = 0. | 1. Cajero intenta solicitar cambio por talla agotada.<br>2. Envía `POST /api/exchanges`. | Código `HTTP 400 Bad Request`. Mensaje: *"No hay existencias disponibles de la nueva variante"*. | Rechazo HTTP 400 informando agotamiento de stock en la sucursal. | **APROBADO** |
| **CP-CU17-08** | **Aislamiento Multitenant Estricto** | Cajero de Empresa B intenta procesar un cambio sobre ticket de Empresa A. | Token JWT con `tenant_id` de Boutique B y `sale_id` de Boutique A. | 1. Petición autenticada intenta procesar venta ajena.<br>2. Envía `POST /api/exchanges`. | Código `HTTP 404 Not Found` (o `403 Forbidden`). Cero filtración entre boutiques. | Retorna HTTP 404 indicando que la venta original no existe en el tenant. | **APROBADO** |

---

### CU18: Procesar Devolución de Prenda con Retención Operativa (20%-50%) y Nota de Crédito

**Ficha Técnica de Cobertura:**
- **Entidades Auditadas:** `garment_returns`, `inventory`, `sales`, `companies`.
- **Política Clave (P-Ten-03):** Retención operativa fija o configurable por tenant en el rango acotado $[20\%, 50\%]$ (Boutique Elegance: 30%, Moda Urbana: 20%). Reembolso neto al cliente del $50\%$ al $80\%$.
- **Condición de Prenda Inviolable:** Prenda intacta con etiqueta textil original adherida (`good_with_tags`).

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU18-01** | **Cotización de retención al 30% en Boutique Elegance** | Venta de Vestido Fiesta L por Bs 100.00 en Boutique Elegance (política: $R=30\%$, máx. 7 días). Compra realizada dentro del plazo. | `sale_id`, `variant_id` devuelta. | 1. Cajero ingresa ticket.<br>2. Envía `POST /api/returns/quote`.<br>3. `return_service` evalúa política del tenant. | Código `HTTP 200 OK`. `original_price: 100.00`, `retention_rate: 0.30`, `retention_amount: 30.00`, `refund_amount: 70.00`, `is_within_period: true`. | Respuesta 200 OK con desglose exacto: retención Bs 30.00 y reembolso neto Bs 70.00. | **APROBADO** |
| **CP-CU18-02** | **Cotización de retención al 20% en Moda Urbana** | Venta de Pantalón Jeans por Bs 200.00 en Moda Urbana (política: $R=20\%$, máx. 15 días). | `sale_id`, `variant_id` devuelta. | 1. Cajero ingresa ticket en Moda Urbana.<br>2. Envía `POST /api/returns/quote`. | Código `HTTP 200 OK`. `original_price: 200.00`, `retention_rate: 0.20`, `retention_amount: 40.00`, `refund_amount: 160.00`. | Respuesta 200 OK con retención del 20% (Bs 40.00) y reembolso neto de Bs 160.00. | **APROBADO** |
| **CP-CU18-03** | **Devolución consolidada con emisión de Nota de Crédito Digital** | Venta previa de Bs 100.00. Cliente acepta saldo a favor para compras futuras. Prenda en estado `good_with_tags`. Stock en BD: 5 unidades. | `sale_id`, `variant_id`, `condition: "good_with_tags"`, `refund_method: "NOTA_CREDITO"`, `reason: "Talla inadecuada"`. | 1. Cajero selecciona modalidad Nota de Crédito.<br>2. Envía `POST /api/returns`.<br>3. Backend ejecuta `with_for_update` en `Inventory`.<br>4. Genera código único `NC-YYYYMMDD-XXXX`. | Código `HTTP 201 Created`. Registro en `garment_returns`, stock incrementado a 6 (+1), código de nota generado. | Registro creado, código `NC-20261102-XXXX` emitido y stock reingresado a 6. | **APROBADO** |
| **CP-CU18-04** | **Devolución consolidada con reembolso en Efectivo en mostrador** | Venta de Bs 200.00 en Moda Urbana. Cliente solicita reembolso en efectivo. Stock en BD: 2 unidades. | `sale_id`, `variant_id`, `condition: "good_with_tags"`, `refund_method: "EFECTIVO"`, `reason: "Disconformidad de color"`. | 1. Cajero selecciona devolución en efectivo.<br>2. Envía `POST /api/returns`.<br>3. Backend ejecuta `with_for_update` y reingresa stock. | Código `HTTP 201 Created`. `refund_amount: 160.00`, `credit_note_code: null`, stock incrementado a 3 (+1) y salida de caja asentada. | Devolución en efectivo procesada con egreso contable de caja y stock restablecido a 3. | **APROBADO** |
| **CP-CU18-05** | **Rechazo por Prenda Usada o Sin Etiqueta Textil** | Cliente presenta prenda con manchas, deterioro o etiqueta cortada. | `condition: "damaged_or_no_tags"`. | 1. Cajero marca condición física no apta.<br>2. Envía `POST /api/returns`. | Código `HTTP 400 Bad Request`. Mensaje: *"La prenda debe estar intacta y conservar su etiqueta original (good_with_tags)"*. Stock intacto. | Rechazo HTTP 400 protegiendo la política de sanidad textil de la boutique. | **APROBADO** |
| **CP-CU18-06** | **Rechazo por Plazo de Devolución Expirado** | Compra realizada hace 20 días en boutique con plazo máximo de 7 días. | Venta con `created_at` antiguo que supera `max_days`. | 1. Cajero intenta procesar devolución fuera de plazo.<br>2. Envía `POST /api/returns`. | Código `HTTP 400 Bad Request`. Mensaje: *"El plazo máximo para devoluciones (7 días) ha expirado"*. Stock intacto. | Rechazo HTTP 400. La operación es bloqueada automáticamente. | **APROBADO** |
| **CP-CU18-07** | **Aislamiento Multitenant Estricto en Devoluciones** | Cajero de Empresa B intenta devolver un ticket perteneciente a Empresa A. | Token JWT con `tenant_id` de Moda Urbana y `sale_id` de Boutique Elegance. | 1. Petición autenticada intenta procesar venta ajena.<br>2. Envía `POST /api/returns`. | Código `HTTP 404 Not Found`. La venta no existe en el tenant del usuario. | Aislamiento multitenant protegido; cero filtración de comprobantes entre tenants. | **APROBADO** |
| **CP-CU18-08** | **Consulta y Listado Histórico de Devoluciones por Sucursal** | Sucursal cuenta con 2 devoluciones registradas en el día. | Petición `GET /api/returns?branch_id=...` con token de cajero de la sucursal. | 1. Cajero abre historial de devoluciones.<br>2. Backend filtra por `tenant_id` y `branch_id`. | Código `HTTP 200 OK`. Array con 2 registros conteniendo desglose de retención, montos y notas de crédito emitidas. | Histórico de sucursal cargado correctamente con trazabilidad contable completa. | **APROBADO** |

---

### 3.20. CU21: Exportar Reportes Empresariales a Formatos PDF y Excel (Carril B - Reportes)

**Ficha Técnica de Cobertura:**
- **Entidades Auditadas:** `sales`, `sale_items`, `orders`, `order_items`, `inventory`, `inventory_movements`, `branches`, `companies`.
- **Librerías de Exportación:** ReportLab 5.1.0 (PDF con Canvas numerado, modo apaisado `landscape(letter)`, membrete dinámico) y OpenPyXL 3.1.5 (hoja de cálculo `.xlsx` con estilos corporativos y fórmulas `=SUM(...)`).
- **Filtros Dinámicos Soportados:** Por sucursal (`branch_id`), rango temporal (`from_date`, `to_date`), búsqueda de texto (`q`), formato (`csv`, `excel`, `pdf`) y selección granular de columnas (`columns`).
- **Restricción de Acceso:** Aislamiento multitenant absoluto y restricción de sucursal para el rol `encargado`.

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU21-01** | **Vista previa JSON de reporte de ventas consolidadas** | Ventas presenciales y pedidos online registrados en el tenant. | Petición `GET /api/reports/sales` con token JWT de Administrador. | 1. Frontend consulta endpoint analítico.<br>2. Backend agrega ventas y calcula KPI summary. | Código `HTTP 200 OK`. Retorna `summary` (`total_sales`, `total_units`, `total_orders`, `average_ticket`) y array `rows`. | JSON estructurado con métricas de ventas presenciales y virtuales consolidadas. | **APROBADO** |
| **CP-CU21-02** | **Exportación de reporte de ventas en formato CSV plano** | Existen transacciones comerciales registradas. | Petición `GET /api/reports/sales/export?format=csv` con token de Administrador. | 1. Cliente solicita descarga CSV.<br>2. Backend serializa registros con cabeceras estándar. | Código `HTTP 200 OK`. `Content-Type: text/csv`. Header `Content-Disposition: attachment; filename="sales-report.csv"`. | Archivo CSV plano con codificación UTF-8 y cabeceras legibles descargado correctamente. | **APROBADO** |
| **CP-CU21-03** | **Exportación formal de reporte de ventas a Excel XLSX con membrete y fórmulas** | Múltiples ventas en varias sucursales del tenant. | Petición `GET /api/reports/sales/export?format=excel` o `/api/reports/export/excel?report_type=sales`. | 1. Administrador pulsa botón [ Excel (.xlsx) ].<br>2. Backend invoca `openpyxl`.<br>3. Genera membrete corporativo, tabla formateada, formato moneda y fila totalizadora con fórmula `=SUM(...)`. | Código `HTTP 200 OK`. `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Libro Excel válido (`PK\x03\x04`). | Hoja de cálculo Excel profesional generada con formato contable, anchos autoajustados y totales automáticos. | **APROBADO** |
| **CP-CU21-04** | **Exportación de reporte de ventas a PDF apaisado con membrete y numeración de páginas** | Ventas registradas. Empresa con razón social registrada. | Petición `GET /api/reports/sales/export?format=pdf` o `/api/reports/export/pdf?report_type=sales`. | 1. Usuario pulsa botón [ PDF Oficial ].<br>2. Backend invoca ReportLab con `NumberedCanvas`.<br>3. Aplica orientación horizontal `landscape(letter)`, membrete formal, tarjetas KPI y pie de página "Página X de Y". | Código `HTTP 200 OK`. `Content-Type: application/pdf`. Encabezado binario `%PDF-1.4`. | Documento PDF editorial de alta fidelidad generado con paginación dinámica "Página 1 de 1" y membrete empresarial. | **APROBADO** |
| **CP-CU21-05** | **Filtrado dinámico de columnas seleccionadas por el usuario** | Usuario desmarca columnas accesorias y conserva solo `product_name,variant_sku,quantity_sold,gross_sales`. | Petición `GET /api/reports/sales/export?format=excel&columns=product_name,variant_sku,quantity_sold,gross_sales`. | 1. Usuario abre panel "▼ Columnas visibles".<br>2. Desmarca columnas no deseadas.<br>3. Exporta a Excel o PDF.<br>4. Backend proyecta únicamente las claves solicitadas. | Código `HTTP 200 OK`. El archivo generado contiene exactamente las 4 columnas seleccionadas. | Proyección dinámica de columnas respetada sin quiebre de estilos ni desalineación de celdas. | **APROBADO** |
| **CP-CU21-06** | **Exportación de reporte de inventario multisucursal y stock a PDF y Excel** | Stock cargado en sucursales Central y Norte. | Petición `GET /api/reports/inventory/export?format=pdf` y `format=excel`. | 1. Usuario navega a pestaña "Stock e Inventario".<br>2. Solicita exportación PDF y Excel.<br>3. Backend consolida stock físico, reservado y disponible. | Código `HTTP 200 OK` en ambos formatos. Muestra `branch_name`, `product_name`, `variant_sku`, `quantity`, `reserved_quantity`, `available_quantity`. | Reportes de inventario emitidos con trazabilidad de stock disponible y reservado. | **APROBADO** |
| **CP-CU21-07** | **Exportación de trazabilidad de movimientos de almacén a PDF y Excel** | Movimientos de ingreso, salida y traslados registrados. | Petición `GET /api/reports/movements/export?format=pdf` y `format=excel`. | 1. Usuario selecciona pestaña "Trazabilidad de Movimientos".<br>2. Descarga PDF y Excel.<br>3. Backend audita entradas, salidas y traslados con tipo clasificado. | Código `HTTP 200 OK`. Registros con `movement_type`, cantidades y número de transacciones asentadas. | Archivos PDF y Excel con desglose cronológico de movimientos de almacén generados satisfactoriamente. | **APROBADO** |
| **CP-CU21-08** | **Restricción y aislamiento por sucursal para rol Encargado** | Encargado asignado a Sucursal Central (A1). El tenant posee también Sucursal Norte (A2). | Petición `GET /api/reports/sales/export?format=pdf` con token JWT de rol `encargado`. | 1. Encargado exporta reporte desde su portal.<br>2. Backend fuerza `branch_id = current_user.branch_id`. | Código `HTTP 200 OK`. El reporte generado incluye exclusivamente las ventas de Sucursal Central; datos de Sucursal Norte quedan excluidos. | Restricción de sucursal inviolable: el encargado no accede a datos de otras sucursales. | **APROBADO** |
| **CP-CU21-09** | **Tolerancia a rango de fechas vacío o sin transacciones registradas** | Rango temporal futuro (año 2030) sin datos asociados. | Petición `GET /api/reports/sales/export?format=pdf&from_date=2030-01-01&to_date=2030-01-02`. | 1. Usuario filtra por fechas sin ventas.<br>2. Backend procesa conjunto vacío sin excepciones 500.<br>3. Emite PDF y Excel con aviso "Sin registros en el periodo". | Código `HTTP 200 OK`. Archivo PDF/Excel válido con mensaje formal sin quiebres de servidor. | Manejo robusto de colecciones vacías verificado; cero errores 500 en generación de documentos. | **APROBADO** |

---

### CU19: Localizar Sucursales y Trazar Rutas (OpenStreetMap / ORS)
**Objetivo de Calidad:** Validar que los clientes y directivos puedan consultar geográficamente las sucursales físicas activas de su tenant sobre el mapa interactivo de OpenStreetMap en la app móvil Flutter, con marcadores interactivos, y trazar rutas de navegación multimodal (vehicular `driving-car` y peatonal `foot-walking`) con cálculo preciso de distancia y tiempo estimado de llegada (ETA) mediante la estrategia híbrida OSRM/ORS/Haversine.

**Ficha Técnica de Cobertura:**
- **Entidades Auditadas:** `branches`, `companies`, `RouteInfo`, `Branch`.
- **Servicios Cartográficos y de Ruteo:** OpenStreetMap Tile Server (`tile.openstreetmap.org`), OSRM Routing Engine (`router.project-osrm.org`), OpenRouteService API (`api.openrouteservice.org`) y motor trigonométrico Haversine local.
- **Componentes Flutter:** `BranchesMapPage`, `BranchesMapController`, `RoutingService`, `flutter_map` (TileLayer, MarkerLayer, PolylineLayer).
- **Aislamiento Multitenant:** Endpoint público `GET /api/branches/public` filtrado estrictamente por `tenant_id`.

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU19-01** | **Consulta pública de sucursales georreferenciadas por tenant** | Sucursales de Boutique Elegance creadas en BD con coordenadas reales en Santa Cruz. | Petición `GET /api/branches/public?tenant_id={elegance_id}`. | 1. Cliente móvil consulta endpoint de sucursales.<br>2. Backend filtra sucursales activas del tenant.<br>3. Retorna array serializado con coordenadas. | Código `HTTP 200 OK`. Retorna 3 sucursales con `latitude`, `longitude`, `address`, `phone` y `opening_hours`. | Array JSON estructurado con coordenadas métricas válidas (-17.7833, -63.1821, etc.). | **APROBADO** |
| **CP-CU19-02** | **Aislamiento multitenant estricto en catálogo de sucursales** | Empresa A (Elegance) tiene 3 sucursales en SCZ. Empresa B (Urbana) tiene 1 en CBBA. | Petición `GET /api/branches/public?tenant_id={urbana_id}`. | 1. Cliente consulta con tenant_id de Urbana.<br>2. Backend aísla los registros en PostgreSQL. | Código `HTTP 200 OK`. Retorna exactamente 1 sucursal (Cochabamba); cero sucursales de Elegance. | Aislamiento multitenant 100% estricto; no hay filtración cruzada de sucursales entre empresas. | **APROBADO** |
| **CP-CU19-03** | **Inicialización de mapa OpenStreetMap con centrado en GPS o boutique default** | Permisos de ubicación en dispositivo Android. Dispositivo con o sin sensor GPS encendido. | Evento `BranchesMapController.initialize()` al abrir pantalla. | 1. App solicita permisos `ACCESS_FINE_LOCATION`.<br>2. Si se otorga, obtiene posición actual.<br>3. Si se deniega, centra en la sucursal principal. | Mapa centrado en la ubicación actual del cliente o en la boutique central (-17.7833, -63.1821). | Mapa renderizado fluidamente con teselas de OpenStreetMap y halo luminoso de usuario. | **APROBADO** |
| **CP-CU19-04** | **Renderizado de pines interactivos de boutiques y selección táctil** | 3 sucursales con coordenadas registradas. | Tap sobre el marcador de la sucursal "Equipetrol". | 1. FlutterMap dibuja `MarkerLayer` con pines estilizados.<br>2. Usuario pulsa sobre pin.<br>3. Se dispara `selectBranch()`. | Pin seleccionado incrementa tamaño con halo champagne gold; se despliega modal inferior con detalles. | Tarjeta inferior desplegada con nombre "Sucursal Equipetrol", dirección, teléfono y botón "¿Cómo llegar?". | **APROBADO** |
| **CP-CU19-05** | **Trazado de ruta multimodal vehicular (driving) vía motor OSRM/ORS** | Origen: GPS Usuario (-17.7830, -63.1820). Destino: Sucursal Ventura Mall (-17.7542, -63.1990). Modo: `driving`. | Tap en "¿Cómo llegar?" con modo Vehículo activo. | 1. Controller invoca `RoutingService.getRoute()`.<br>2. Servicio consulta endpoint OSRM.<br>3. Decodifica geometría y tiempo.<br>4. PolylineLayer traza la ruta. | Código 200 de OSRM. Ruta trazada sobre la calzada vial; tarjeta muestra distancia (aprox. 4.2 km) y tiempo (aprox. 12 min). | Polilínea azul zafiro/ámbar trazada con precisión sobre calles de la ciudad y cámara reencuadrada. | **APROBADO** |
| **CP-CU19-06** | **Trazado de ruta multimodal peatonal (walking) con recalculo de ETA** | Mismo origen y destino que CP-CU19-05. Modo conmutado a `walking`. | Tap en selector flotante superior de transporte [ A pie ]. | 1. Usuario conmuta a modo peatonal.<br>2. Controller invalida ruta previa.<br>3. Servicio solicita ruta `walking`.<br>4. Recalcula tiempo a ritmo peatonal (aprox. 4.5 km/h). | Ruta recalculada por sendas peatonales; tiempo estimado actualizado (aprox. 55 min). | Tiempo de viaje y distancia recalculados de forma reactiva sin parpadeos ni recarga de mapa. | **APROBADO** |
| **CP-CU19-07** | **Tolerancia a desconexión o saturación de API externa mediante fallback Haversine** | Desconexión a Internet de APIs externas o URL de ruteo simulada inaccesible. | Solicitud de ruta hacia Sucursal Central. | 1. Servicio detecta timeout o excepción HTTP.<br>2. Conmuta automáticamente al Nivel 3.<br>3. Calcula distancia radial Haversine.<br>4. Emite línea geodésica de cortesía. | Aplicación no arroja error ni pantalla roja; dibuja línea punteada/directa y muestra distancia ortodrómica estimada. | Resiliencia verificada: el usuario recibe estimación métrica y trazado de cortesía sin bloqueo de app. | **APROBADO** |

---

### CU20: Generar Reportes Ejecutivos por Voz y Lenguaje Natural (Gemini RAG)
**Objetivo de Calidad:** Validar que los Administradores de Tenant puedan realizar consultas analíticas ejecutivas mediante lenguaje natural o voz, verificando la gobernanza de planes SaaS (Plan Básico bloqueado HTTP 403; Plan PRO habilitado), la agregación del contexto real del negocio (ventas, prendas más vendidas, inventario crítico, devoluciones con retención 20-50% y cambios con diferencia) y la inferencia generativa estructurada con Gemini 2.5 Flash respaldada por un motor heurístico local resiliente.

**Ficha Técnica de Cobertura:**
- **Entidades Auditadas:** `sales`, `sale_items`, `inventory`, `garment_returns`, `garment_exchanges`, `companies`, `plans`, `subscriptions`.
- **Motor de IA Generativa:** Google Gemini 2.5 Flash (`gemini-2.5-flash` con Google GenAI SDK).
- **Mecanismo de Resiliencia:** Fallback analítico local determinista con cálculo de KPIs, top prendas y locución en español neutro sin quiebres de servicio.
- **Validación de Políticas SaaS:** Aislamiento multitenant por `tenant_id` y control de acceso estricto a IA por plan de suscripción (`has_ai_access`).

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU20-01** | **Consulta pública/autenticada de capacidades y sugerencias del asistente de voz** | Tenant autenticado en la plataforma. | Petición `GET /api/reports/voice-query/capabilities` con Bearer Token JWT. | 1. Frontend consulta capacidades al abrir modal.<br>2. Backend retorna lista de preguntas de ejemplo y estado de IA. | Código `HTTP 200 OK`. Retorna `ai_available: true`, `model: "gemini-2.5-flash"`, idioma `"es"` y array `suggested_queries`. | Capacidades y ejemplos de preguntas ejecutivas entregadas correctamente para guiar al usuario. | **APROBADO** |
| **CP-CU20-02** | **Consulta analítica ejecutiva exitosa mediante Gemini RAG multitenant** | Empresa con Plan PRO (`has_ai_access: True`). Transacciones de ventas, inventario y devoluciones registradas. | Petición `POST /api/reports/voice-query` con payload `{"query": "¿Cuáles son las prendas más vendidas y cuánto hemos facturado en total?"}`. | 1. Usuario emite consulta de voz.<br>2. Servicio verifica plan PRO activo.<br>3. Ensambla contexto multitenant (ventas, stock, devoluciones).<br>4. Invoca Gemini 2.5 Flash con System Prompt RAG.<br>5. Serializa respuesta JSON estructurada. | Código `HTTP 200 OK`. Retorna `executive_summary`, `speech_text` optimizado para TTS, tarjetas `kpis`, array `data_preview` y `is_fallback: false`. | Reporte ejecutivo estructurado de alta fidelidad generado por Gemini en vivo y listo para locución auditiva. | **APROBADO** |
| **CP-CU20-03** | **Bloqueo estricto de módulo de IA Generativa para Plan Básico (Políticas CU02/CU04)** | Empresa con Plan BÁSICO activo (`has_ai_access: False`, `code: "BASIC"`). | Petición `POST /api/reports/voice-query` con token de empresa básica. | 1. Usuario intenta usar asistente de voz.<br>2. Servicio evalúa `verify_ai_access_for_tenant`.<br>3. Detecta `has_ai_access is False`. | Código `HTTP 403 Forbidden`. Mensaje explicativo: *"El Plan Básico contratado no incluye acceso al módulo de IA Generativa. Actualice al Plan Profesional o Empresarial."* | Acceso denegado de forma inmediata e inviolable; se preservan los límites comerciales del SaaS. | **APROBADO** |
| **CP-CU20-04** | **Resiliencia analítica mediante fallback heurístico local ante falla de Gemini API** | Empresa con Plan PRO. Gemini API inaccesible (simulación de timeout / error 429 cuota excedida). | Petición `POST /api/reports/voice-query` con consulta ejecutiva sobre devoluciones y cambios. | 1. Servicio intenta llamada remota a Gemini.<br>2. Captura excepción o saturación de red.<br>3. Activa automáticamente `_generate_heuristic_fallback`.<br>4. Extrae métricas del contexto PostgreSQL.<br>5. Retorna reporte válido con `is_fallback: true`. | Código `HTTP 200 OK`. Cero errores 500. Retorna `executive_summary`, `speech_text`, tarjetas `kpis` calculadas localmente y badge indicando fallback analítico. | Conmutación transparente al motor heurístico verificada; el directivo recibe su análisis sin interrupción del servicio. | **APROBADO** |

---

### 3.22. CU22: Generar Dataset Sintético de Ventas y Estacionalidad Textil (Carril C - Pipeline ML)
**Objetivo de Calidad:** Validar que los Administradores de Tenant con planes de IA habilitados (Plan Profesional o Empresarial) puedan inicializar conjuntos estocásticos de datos sintéticos históricos ($\ge 1,000$ registros) que reproduzcan estacionalidad textil boliviana, distribución gaussiana de tallas (M y L predominantes), picos quincenales, cambios de prenda con cobro de diferencia $\Delta$ (CU17) y devoluciones con retención 20%-50% (CU18), garantizando aislamiento multitenant estricto y denegación inmediata a planes básicos o roles no directivos.

**Ficha Técnica de Cobertura:**
- **Entidades Auditadas:** `synthetic_datasets`, `companies`, `plans`, `subscriptions`, `branches`, `products`, `product_variants`, `sizes`, `categories`.
- **Motor Estadístico:** NumPy y Pandas con generador estocástico vectorial reproducible mediante semilla aleatoria (`random_seed`).
- **Gobernanza de Planes SaaS:** Validación estricta con `validate_ai_access` (HTTP 403 ante Plan Básico).
- **Aislamiento Multitenant:** Coherencia de llaves foráneas `tenant_id` y `branch_id` en cada registro del archivo CSV generado.

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU22-01** | **Generación exitosa de dataset sintético para tenant con Plan Profesional (Happy Path)** | Empresa con Plan Profesional activo (`has_ai_access: True`), sucursales y prendas registradas con variantes por talla. | Petición `POST /api/ml/synthetic-dataset/generate` con `total_records: 1000`, `months_covered: 12`, `random_seed: 42`. | 1. Administrador solicita generación.<br>2. Servicio valida plan PRO.<br>3. Lee catálogo real y genera transacciones estocásticas vectorizadas.<br>4. Persiste metadatos en BD y exporta CSV. | Código `HTTP 201 Created`. Retorna resumen con `total_records: 1000`, distribuciones por talla, categoría y tasas de cambio/devolución simuladas. | Dataset generado en < 2 segundos con 1,000 transacciones y archivo CSV almacenado en disco. | **APROBADO** |
| **CP-CU22-02** | **Bloqueo estricto por cuota de plan SaaS (Plan Básico sin módulo de IA)** | Tenant con Plan Básico activo (`has_ai_access: False`). | Petición `POST /api/ml/synthetic-dataset/generate` con credenciales del tenant básico. | 1. Usuario intenta generar dataset.<br>2. `validate_ai_access` evalúa privilegios del plan.<br>3. Detecta ausencia de módulo IA. | Código `HTTP 403 Forbidden`. Mensaje explícito: *"El modulo de Inteligencia Artificial (Gemini y Machine Learning) requiere una suscripcion activa a Plan Profesional o Empresarial."* | Petición rechazada impidiendo el uso no contratado de capacidades analíticas avanzadas. | **APROBADO** |
| **CP-CU22-03** | **Control de acceso por rol: rechazo a usuarios operativos no directivos** | Usuario con rol `cajero` o `delivery` autenticado dentro de un tenant con Plan Profesional. | Petición `POST /api/ml/synthetic-dataset/generate`. | 1. Usuario no autorizado envía petición.<br>2. Endpoint verifica `current_user.rol in ['administrador', 'superadmin']`. | Código `HTTP 403 Forbidden`. Mensaje: *"Solo administradores de tienda o superadministradores pueden calibrar y generar datasets."* | Denegación inmediata de la operación preservando la gobernanza directiva del SaaS. | **APROBADO** |
| **CP-CU22-04** | **Aislamiento multitenant e integridad estadística del CSV exportado** | Dataset sintético generado con éxito para Tenant PRO. | Inspección de columnas y registros del archivo CSV físico en servidor. | 1. Lee CSV generado mediante Pandas.<br>2. Comprueba que todos los registros tengan `tenant_id` y `branch_id` correctos.<br>3. Evalúa distribución de tallas M vs XS. | 100% de filas corresponden al tenant. Frecuencia de talla M significativamente superior a XS (distribución normal). Columnas de políticas (CU17/CU18) presentes. | Integridad de datos y aislamiento multitenant confirmados al 100% sin mezclar sucursales ajenas. | **APROBADO** |
| **CP-CU22-05** | **Consulta de metadatos de último dataset y descarga en streaming de CSV** | Dataset sintético previamente generado en la base de datos. | Peticiones `GET /api/ml/synthetic-dataset/latest` y `GET /api/ml/synthetic-dataset/{id}/download`. | 1. Consulta último dataset.<br>2. Extrae `dataset_id`.<br>3. Descarga archivo en streaming. | Código `HTTP 200 OK`. `latest` retorna metadatos completos y URL de descarga. Endpoint de descarga retorna `Content-Type: text/csv` y `Content-Disposition: attachment`. | Metadatos obtenidos y descarga binaria en streaming del CSV completada con éxito. | **APROBADO** |

**Evidencia de Ejecución Pytest (`backend/tests/test_cu22_synthetic_dataset.py`):**
```text
tests/test_cu22_synthetic_dataset.py::test_generate_synthetic_dataset_pro_plan PASSED [ 20%]
tests/test_cu22_synthetic_dataset.py::test_rejection_basic_plan_no_ai_access PASSED   [ 40%]
tests/test_cu22_synthetic_dataset.py::test_rejection_non_admin_role PASSED            [ 60%]
tests/test_cu22_synthetic_dataset.py::test_multitenant_isolation_and_file_content PASSED [ 80%]
tests/test_cu22_synthetic_dataset.py::test_get_latest_and_download_dataset PASSED    [100%]

======================= 5 passed, 6 warnings in 33.34s ========================
```

---

### CU23: Predecir Demanda de Ropa por Talla (ML Supervisado - RandomForestRegressor)

**Objetivo de Calidad:** Validar que los Administradores y Encargados de Tienda puedan entrenar modelos de Machine Learning supervisados (`RandomForestRegressor` con Scikit-Learn) sobre transacciones reales o sintéticas (CU22) del tenant y proyectar la demanda semanal de prendas por talla (S, M, L, XL) a un horizonte de 1 a 8 semanas con métricas de bondad de ajuste ($R^2 \ge 0.80$, $MAE$, $RMSE$), alertas tempranas de reabastecimiento por quiebre proyectado y estricto bloqueo a tenants con Plan Básico.

**Ficha Técnica de Cobertura:**
- **Entidades Auditadas:** `demand_forecasts`, `ml_models`, `companies`, `plans`, `subscriptions`, `products`, `product_variants`, `inventory`, `sizes`, `sales`, `sale_items`.
- **Motor de Machine Learning:** Scikit-Learn `RandomForestRegressor`, NumPy y Pandas con serialización `joblib` particionada por tenant.
- **Gobernanza de Planes SaaS:** Validación estricta con `validate_ai_access` (HTTP 403 ante Plan Básico).
- **Aislamiento Multitenant:** Inferencia y entrenamiento estrictamente aislados con el `tenant_id` del token JWT.

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU23-01** | **Bloqueo estricto por cuota de plan SaaS (Plan Básico sin acceso a IA)** | Tenant con Plan Básico activo (`has_ai_access: False`). | Petición `POST /api/ml/demand/train` con credenciales de tenant básico. | 1. Usuario intenta entrenar modelo de demanda.<br>2. `validate_ai_access` evalúa privilegios.<br>3. Detecta ausencia de módulo IA. | Código `HTTP 403 Forbidden`. Mensaje: *"El modulo de Inteligencia Artificial (Gemini y Machine Learning) requiere una suscripcion activa a Plan Profesional o Empresarial."* | Rechazo inmediato de la petición protegiendo las cuotas comerciales del SaaS. | **APROBADO** |
| **CP-CU23-02** | **Entrenamiento y calibración de modelo supervisado con Scikit-Learn (Happy Path)** | Tenant con Plan Profesional activo (`elegance`). | Petición `POST /api/ml/demand/train` con `use_synthetic: True`, `n_estimators: 60`, `max_depth: 10`. | 1. Administrador solicita entrenamiento.<br>2. Extrae transacciones históricas o bootstrap.<br>3. Ajusta `RandomForestRegressor`.<br>4. Evalúa métricas ($R^2$, $MAE$, $RMSE$) y guarda `.joblib`. | Código `HTTP 200 OK`. Retorna metadatos del modelo, $R^2 \ge 0.80$, versión generada y persistencia en `ml_models`. | Modelo calibrado exitosamente con $R^2 \ge 0.84$ y artefacto serializado en disco. | **APROBADO** |
| **CP-CU23-03** | **Inferencia cuantitativa de demanda por talla a 4 semanas de horizonte** | Modelo entrenado previamente y producto con variantes registrado. | Petición `POST /api/ml/demand/forecast` con `product_id`, `weeks_ahead: 4`, `confidence_level: 0.95`. | 1. Administrador solicita proyección.<br>2. Carga modelo `.joblib`.<br>3. Infiere curva de demanda semanal por talla.<br>4. Compara contra `inventory` y persiste en `demand_forecasts`. | Código `HTTP 200 OK`. Retorna desglose por talla (S, M, L, XL), unidades semanales, recomendación de reposición y estado de inventario. | Proyección semanal por talla obtenida con intervalos de confianza y déficit de stock calculado. | **APROBADO** |
| **CP-CU23-04** | **Listado de alertas tempranas de reabastecimiento por quiebre de stock proyectado** | Variantes registradas en el catálogo del tenant. | Petición `GET /api/ml/demand/alerts`. | 1. Encargado consulta alertas.<br>2. Servicio compara inventario en percha vs demanda estimada del mes.<br>3. Clasifica urgencia (ALTA, MEDIA, BAJA). | Código `HTTP 200 OK`. Retorna lista priorizada con `variant_id`, `current_stock`, `recommended_reorder_units` y nivel de urgencia. | Alertas ordenadas jerárquicamente por criticidad de desabastecimiento. | **APROBADO** |
| **CP-CU23-05** | **Consulta de auditoría y trazabilidad del modelo de Machine Learning activo** | Tenant con modelo calibrado previamente. | Petición `GET /api/ml/demand/latest-model`. | 1. Directivo consulta estado del modelo.<br>2. Consulta registro en tabla `ml_models`. | Código `HTTP 200 OK`. Retorna versión, hiperparámetros, métricas $R^2$/$MAE$/$RMSE$ y fecha de entrenamiento. | Auditoría completa del modelo recuperada con éxito. | **APROBADO** |

**Evidencia de Ejecución Pytest (`backend/tests/test_cu23_demand_forecasting.py`):**
```text
tests/test_cu23_demand_forecasting.py::test_cu23_plan_basic_forbidden_403 PASSED [ 20%]
tests/test_cu23_demand_forecasting.py::test_cu23_train_model_success PASSED       [ 40%]
tests/test_cu23_demand_forecasting.py::test_cu23_forecast_demand_by_size PASSED   [ 60%]
tests/test_cu23_demand_forecasting.py::test_cu23_stock_reorder_alerts PASSED      [ 80%]
tests/test_cu23_demand_forecasting.py::test_cu23_latest_model_metadata PASSED    [100%]

======================= 5 passed, 7 warnings in 22.72s ========================
```

---

### CU24: Segmentar Clientes con K-Means (ML No Supervisado - RFM + Retorno)

**Objetivo de Calidad:** Validar que los Administradores de Tienda puedan ejecutar algoritmos de Machine Learning no supervisados (`KMeans` con inicialización `k-means++` y `StandardScaler`) sobre vectores conductuales RFM+D (Recencia, Frecuencia, Monto Monetario y Tasa de Retorno/Cambio) de la cartera de clientes, clasificando automáticamente la clientela en perfiles accionables (*Clientes VIP / Embajadores*, *Compradores de Temporada*, *Cazadores de Ofertas*, *Perfil de Alto Retorno*), persistiendo centroides y asignaciones en PostgreSQL (`customer_segments` y `ml_models`), garantizando el bloqueo estricto ante planes básicos y proveyendo coordenadas 2D para renderizado de dispersión.

**Ficha Técnica de Cobertura:**
- **Entidades Auditadas:** `customer_segments`, `ml_models`, `companies`, `plans`, `subscriptions`, `users`, `sales`, `garment_returns`, `garment_exchanges`, `synthetic_datasets`.
- **Motor de Machine Learning:** Scikit-Learn `KMeans`, `StandardScaler`, `silhouette_score`, con serialización `.joblib` en directorio de modelos.
- **Gobernanza de Planes SaaS:** Verificación estricta mediante `validate_ai_access` (HTTP 403 ante Plan Básico).
- **Aislamiento Multitenant:** Filtro y asignación estricta por `tenant_id` garantizando que los vectores de compra nunca se mezclen entre empresas.

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU24-01** | **Bloqueo estricto por cuota de plan SaaS (Plan Básico sin módulo IA)** | Tenant con Plan Básico activo (`has_ai_access: False`). | Petición `POST /api/ml/customer-segmentation/train` con credenciales de tenant básico. | 1. Usuario intenta calibrar clustering.<br>2. Servicio ejecuta `validate_ai_access`.<br>3. Captura `FeatureNotAllowedException`. | Código `HTTP 403 Forbidden`. Mensaje explicativo: *"El modulo de Inteligencia Artificial (Gemini y Machine Learning) requiere una suscripcion activa a Plan Profesional o Empresarial."* | Rechazo inmediato de la operación; límite comercial protegido. | **APROBADO** |
| **CP-CU24-02** | **Entrenamiento y clustering no supervisado K-Means exitoso (Happy Path)** | Tenant con Plan Profesional (`elegance`), clientes con compras reales o fallback sintético. | Petición `POST /api/ml/customer-segmentation/train` con `k_clusters: 4`, `use_synthetic_fallback: True`, `random_state: 42`. | 1. Administrador solicita segmentación.<br>2. Extrae matriz RFM+D.<br>3. Normaliza con `StandardScaler`.<br>4. Ajusta `KMeans` y calcula Silhouette Score.<br>5. Asigna 4 perfiles con centroides y guarda en `ml_models` y `customer_segments`. | Código `HTTP 200 OK`. Retorna $k=4$, Silhouette Score evaluado, inercia $> 0$, 4 perfiles con nombres, descripciones, badges y acciones recomendadas. | Segmentación completada con $k=4$ perfiles, centroides persistidos y modelo serializado en disco. | **APROBADO** |
| **CP-CU24-03** | **Consulta de estado y telemetría del modelo de clustering vigente** | Tenant con modelo K-Means entrenado previamente. | Petición `GET /api/ml/customer-segmentation/status`. | 1. Usuario solicita estado del modelo activo.<br>2. Servicio consulta tabla `ml_models` (`model_type='KMEANS_CLUSTERING'`). | Código `HTTP 200 OK`. Retorna `has_trained_model: True`, `model_id`, versión, fecha de entrenamiento y métricas completas. | Telemetría del modelo obtenida con éxito para el panel directivo. | **APROBADO** |
| **CP-CU24-04** | **Extracción de coordenadas para gráfico de dispersión 2D interactivo** | Clientes segmentados persistidos en base de datos. | Petición `GET /api/ml/customer-segmentation/scatter-points?limit=150`. | 1. Frontend solicita puntos para gráfico scatter.<br>2. Servicio recupera `customer_segments` y proyecta Frecuencia vs Monto con color por clúster. | Código `HTTP 200 OK`. Retorna array `points` con `customer_id`, `recency_days`, `frequency_count`, `monetary_total`, `return_rate`, `cluster_id` y código hex `color`. | Coordenadas entregadas de forma eficiente listas para renderizado gráfico. | **APROBADO** |
| **CP-CU24-05** | **Exploración paginada drill-down de clientes clasificados por segmento** | Clientes asociados a segmentos en PostgreSQL. | Petición `GET /api/ml/customer-segmentation/customers?page=1&page_size=10`. | 1. Administrador abre tabla de clientes por clúster.<br>2. Servicio ejecuta consulta paginada con join a `users`. | Código `HTTP 200 OK`. Retorna `total`, `page`, `page_size` y lista detallada con email de cliente, label del segmento y métricas RFM+D. | Listado detallado obtenido permitiendo exportar o aplicar campañas dirigidas. | **APROBADO** |

**Evidencia de Ejecución Pytest (`backend/tests/test_cu24_customer_segmentation.py`):**
```text
tests/test_cu24_customer_segmentation.py::test_cu24_plan_basic_forbidden_403 PASSED [ 20%]
tests/test_cu24_customer_segmentation.py::test_cu24_train_kmeans_success PASSED       [ 40%]
tests/test_cu24_customer_segmentation.py::test_cu24_get_segmentation_status PASSED    [ 60%]
tests/test_cu24_customer_segmentation.py::test_cu24_get_scatter_points PASSED         [ 80%]
tests/test_cu24_customer_segmentation.py::test_cu24_get_segmented_customers_drilldown PASSED [100%]

======================= 5 passed, 7 warnings in 56.87s ========================
```

---

### CU25: Visualizar Dashboard Ejecutivo con KPIs y Métricas ML

| ID | Objetivo / Escenario | Precondiciones | Datos de Entrada (Input) | Pasos de Ejecución | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CP-CU25-01** | **Consulta de Dashboard Ejecutivo con agregación y cuotas SaaS (Happy Path)** | Tenant con suscripción activa (`elegance`), rol Administrador o Superadmin autenticado. | Petición `GET /api/dashboard?period=day` con token JWT. | 1. Usuario solicita métricas directivas.<br>2. Servicio computa ventas, inventario, reservas, tendencias y cuotas del plan SaaS.<br>3. Estructura respuesta unificada. | Código `HTTP 200 OK`. Retorna bloques completos `summary`, `offline_sync`, `policy_revenue`, `ml_kpis`, `plan_quotas`, `sales_series` y `branch_kpis`. | Agregación ejecutiva completa entregada con validación de límites de sucursales. | **APROBADO** |
| **CP-CU25-02** | **Conciliación de métricas offline y políticas de cambio/devolución** | Ventas offline registradas, lotes sincronizados, devoluciones con retención 20-50% y cambios con cobro $\Delta > 0$. | Petición `GET /api/dashboard?period=day`. | 1. Agrega ventas offline (`is_offline=true`).<br>2. Agrega `sync_operations` por estado.<br>3. Agrega retenciones de `garment_returns` y diferencias abonadas de `garment_exchanges`. | Código `HTTP 200 OK`. `offline_sync` contiene tasa de sincronización y volumen; `policy_revenue` concilia retenciones acumuladas y diferencias cobradas. | Métricas operativas de offline y políticas financieras calculadas con precisión. | **APROBADO** |
| **CP-CU25-03** | **Integración de métricas analíticas de Machine Learning (CU23 y CU24)** | Tenant con Plan Profesional/Empresarial (`has_ai_access: True`), modelos de predicción de demanda y segmentación RFM persistidos. | Petición `GET /api/dashboard`. | 1. Servicio extrae total de unidades proyectadas para el mes (`demand_forecasts`).<br>2. Agrupa distribución de clientes por clúster (`customer_segments`).<br>3. Mapea metadatos del modelo supervisado y no supervisado. | Código `HTTP 200 OK`. Retorna `has_ml_access: True`, unidades proyectadas, array con recuento porcentual de perfiles RFM y alertas de rotura preventiva. | Bloque de Inteligencia Analítica ML consolidado en el panel ejecutivo. | **APROBADO** |
| **CP-CU25-04** | **Manejo seguro ante Plan Básico sin acceso a ML (degradación grácil)** | Tenant en Plan Básico (`has_ai_access: False`, límite de 2 sucursales). | Petición `GET /api/dashboard` con credenciales de tenant básico. | 1. Servicio detecta suscripción sin acceso a IA/ML.<br>2. Omite consultas a tablas de modelos predictivos.<br>3. Devuelve respuesta 200 con `has_ml_access: False`. | Código `HTTP 200 OK` (sin crash 500 ni 403). `has_ml_access: False`, métricas financieras estándar operativas y cuota `max_branches: 2`. | Degradación grácil impecable; el dashboard funciona sin bloquear al suscriptor básico. | **APROBADO** |
| **CP-CU25-05** | **Aislamiento multitenant estricto en la agregación de métricas** | Dos empresas distintas con datos independientes en base de datos (`elegance` y `boutique-basica-cu25`). | Peticiones simultáneas `GET /api/dashboard` con tokens de cada tenant. | 1. Ejecuta queries con filtro obligatorio `tenant_id`.<br>2. Compara los conjuntos de identificadores de sucursal y ventas devueltos. | Código `HTTP 200 OK` en ambas. La intersección de IDs de sucursales o ventas entre ambos tenants es conjunto vacío (`len(interseccion) == 0`). | Aislamiento estricto confirmado: cero fuga de datos entre empresas suscriptoras. | **APROBADO** |

**Evidencia de Ejecución Pytest (`backend/tests/test_cu25_executive_dashboard.py`):**
```text
tests/test_cu25_executive_dashboard.py::test_cu25_executive_dashboard_happy_path PASSED [ 20%]
tests/test_cu25_executive_dashboard.py::test_cu25_offline_sync_and_policies_kpis PASSED [ 40%]
tests/test_cu25_executive_dashboard.py::test_cu25_ml_kpis_integration PASSED [ 60%]
tests/test_cu25_executive_dashboard.py::test_cu25_basic_plan_graceful_ml_handling PASSED [ 80%]
tests/test_cu25_executive_dashboard.py::test_cu25_multitenant_strict_isolation PASSED [100%]

======================= 5 passed, 8 warnings in 46.85s ========================
```

---

## 4. 📊 Resumen Estadístico Consolidado de Cobertura

```
========================================================================================
RESUMEN EJECUTIVO DE PRUEBAS DE CAJA NEGRA — SISTEMAS 2 (1RA, 2DA Y 3RA PRESENTACIÓN)
========================================================================================
Total Casos de Prueba Formalizados:    113
Casos de Prueba Aprobados (PASSED):    113 (100%)
Casos de Prueba Fallidos (FAILED):       0 (0%)
Casos de Prueba Bloqueados:              0 (0%)
----------------------------------------------------------------------------------------
Distribución por Caso de Uso:
  [1ra Presentación]
  - CU01 (Registrar y Gestionar Empresas/Tenants):      3 Casos de Prueba  [100% OK]
  - CU02 (Gestionar Planes de Suscripción y Cuotas):    3 Casos de Prueba  [100% OK]
  - CU03 (Iniciar Sesión Multitenant con JWT):          3 Casos de Prueba  [100% OK]
  - CU04 (Gestionar Sucursales Bajo Límites del Plan):  4 Casos de Prueba  [100% OK]
  - CU05 (Gestionar Prendas y Variantes por Talla):     3 Casos de Prueba  [100% OK]
  - CU06 (Consultar Catálogo Online Facetado):          2 Casos de Prueba  [100% OK]
  - CU07 (Sincronizar y Descargar Catálogo Offline):    3 Casos de Prueba  [100% OK]
  - CU08 (Consultar Catálogo en Modo Desconectado):     2 Casos de Prueba  [100% OK]
  - CU09 (Comprar con Stripe y Despacho Condicionado):  2 Casos de Prueba  [100% OK]
  - CU10 (Crear Reserva Online con Vencimiento):        3 Casos de Prueba  [100% OK]
  [2da Presentación]
  - CU11 (Registrar Reserva de Prendas Offline):        4 Casos de Prueba  [100% OK]
  - CU12 (Atender y Resolver Conflictos Expiradas):     5 Casos de Prueba  [100% OK]
  - CU13 (Registrar Venta POS Desconectada Efectivo):   5 Casos de Prueba  [100% OK]
  - CU14 (Gestionar Bandeja Local Outbox PWA/SQLite):   4 Casos de Prueba  [100% OK]
  - CU15 (Sincronizar Lotes con Idempotencia Central):  4 Casos de Prueba  [100% OK]
  - CU16 (Resolver Conflictos y Quiebres de Stock):     7 Casos de Prueba  [100% OK]
  - CU17 (Cambio de Prenda con Cobro Diferencia Δ):     8 Casos de Prueba  [100% OK]
  - CU18 (Devolución con Retención 20-50% y NC):        8 Casos de Prueba  [100% OK]
  [3ra Presentación]
  - CU19 (Localizar Sucursales y Rutas OSM/ORS):        7 Casos de Prueba  [100% OK]
  - CU20 (Reportes Ejecutivos por Voz y Gemini RAG):    4 Casos de Prueba  [100% OK]
  - CU21 (Exportar Reportes a PDF y Excel):             9 Casos de Prueba  [100% OK]
  - CU22 (Generar Dataset Sintético de Ventas y ML):    5 Casos de Prueba  [100% OK]
  - CU23 (Predecir Demanda de Ropa por Talla - RF):     5 Casos de Prueba  [100% OK]
  - CU24 (Segmentar Clientes con K-Means RFM+D):        5 Casos de Prueba  [100% OK]
  - CU25 (Visualizar Dashboard Ejecutivo y KPIs ML):    5 Casos de Prueba  [100% OK]
----------------------------------------------------------------------------------------
Aislamiento Multitenant:                               Verificado al 100% (HTTP 404/403)
Políticas de Negocio Inviolables (P1, P2, P3, P4, P5): Cumplimiento Estricto Verificado
Inteligencia Artificial Generativa (Gemini 2.5 Flash): Verificado con RAG y Fallback Local
Generación Estocástica de Datos y ML Pipeline (NumPy): Verificado al 100% (Estacionalidad/Gauss)
Machine Learning Supervisado (RandomForestRegressor):  Verificado al 100% (R2 >= 0.80, MAE/RMSE)
Machine Learning No Supervisado (K-Means Clustering):  Verificado al 100% (Silhouette, Inercia, RFM+D)
Dashboard Ejecutivo Unificado (KPIs, Cuotas, Offline): Verificado al 100% (Degradación Grácil 200 OK)
Exportación Multi-Formato (ReportLab + OpenPyXL):       Verificado al 100% (PDF/XLSX/CSV)
Geolocalización Móvil (OpenStreetMap + OSRM/ORS):      Verificado al 100% (Vehicular y Peatonal)
========================================================================================
```
```
```

---

## 5. ✍️ Conclusiones de Aseguramiento de Calidad

1. **Gobernanza del Modelo Multitenant:** El sistema verifica a nivel de middleware y dependencias de base de datos que ninguna entidad (prenda, venta, sucursal, reserva) sea accesible o modificable por un tenant diferente al consignado en el token JWT validado.
2. **Cumplimiento Incondicional de Políticas:** Las reglas críticas de negocio (Política 1 de cobro de diferencia $\Delta > 0$, Política 2 de retención 20%-50%, Política 3 de despacho tras pago Stripe confirmado, Política 4 de límites de sucursales y Política 5 de efectivo offline) actúan como barreras infranqueables en el controlador.
3. **Consistencia Transaccional y Tolerancia a Fallos:** La persistencia local y sincronización idempotente garantizan que no existan duplicidades de venta ni quiebres de inventario no asistidos, cumpliendo el estándar de robustez exigido por ICONIX y la cátedra de Sistemas 2.
