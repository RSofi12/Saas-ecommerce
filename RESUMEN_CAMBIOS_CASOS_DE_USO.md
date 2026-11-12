# RESUMEN INTEGRAL DE CAMBIOS Y ESPECIFICACIONES DE CASOS DE USO
### FashionStore SaaS Multitenant — Sistemas 2 (2026)

Este documento detalla exhaustivamente todos los cambios, mejoras, políticas de negocio e implementaciones técnicas incorporadas en los **25 Casos de Uso** del sistema para las plataformas **Web PC** y **PWA App**, abarcando la arquitectura Backend (FastAPI + PostgreSQL Neon), Frontend (Angular 21 PWA), persistencia local en IndexedDB y algoritmos analíticos.

---

## 1. PAQUETE 0: PLATAFORMA SAAS, PLANES Y MULTITENANT (CU01 – CU04)

### [CU01] Registrar y Gestionar Empresas (Tenants)
* **Objetivo:** Registro centralizado de boutiques y empresas del rubro textil bajo un esquema SaaS multitenant.
* **Cambios Backend:**
  - Validación de subdominio único (`subdomain`) para aislamiento de acceso por empresa.
  - Inyección obligatoria de la clave foránea `tenant_id UUID NOT NULL REFERENCES companies(id)` en toda consulta y entidad del sistema.
  - Creación automática de sucursal principal ("Casa Matriz") al registrar una nueva empresa.
* **Cambios Frontend:**
  - Formulario de alta en modal reactivo para el Superadmin con validación de NIT/RUT y datos fiscales.
  - Vista de tarjetas de tenants con métricas de sucursales activas y estado de cuenta.

### [CU02] Gestionar Planes de Suscripción y Cuotas
* **Objetivo:** Configuración de límites operativos de la plataforma según el plan contratado:
  - **Plan Básico:** Hasta 2 sucursales, sin acceso a IA generativa.
  - **Plan Profesional:** Hasta 10 sucursales, acceso completo al módulo de IA y analítica predictiva.
  - **Plan Empresarial:** Sucursales ilimitadas y soporte dedicado.
* **Cambios Backend:**
  - Servicio `quota_service.py` que intercepta la creación de sucursales y consumo de APIs de IA para validar que el tenant no exceda los límites de su suscripción activa.
* **Cambios Frontend:**
  - Tarjetas interactivas de planes con desglose visual de características y precios en el panel Superadmin.

### [CU03] Autenticación y Control de Acceso por Roles (RBAC)
* **Objetivo:** Inicio de sesión seguro con JWT y soporte de fallback de contraseñas.
* **Cambios Implementados:**
  - Generación de token JWT con claim explícito de `tenant_id`, `rol` y `branch_id`.
  - Soporte de verificación unificada en `app/auth/hash.py` que admite coincidencia directa en texto plano para el ambiente de evaluación académica (`Tiendafashion123!`) con fallback seguro a Bcrypt.
  - Todos los 307 usuarios de prueba fueron estandarizados a la contraseña única `Tiendafashion123!`.

### [CU04] Gestionar Sucursales y Downgrade Guard
* **Objetivo:** Control del ciclo de vida de las tiendas físicas con blindaje contra degradación de planes.
* **Regla Inviolable (Downgrade Guard):**
  - Si una empresa intenta cambiar de Plan Profesional a Básico teniendo más de 2 sucursales activas, el backend rechaza la transacción con HTTP 400 Bad Request: *"No puede degradar al plan Básico mientras tenga 3 o más sucursales activas. Debe desactivar sucursales excedentes antes de continuar"*.
* **Cambios Frontend:**
  - Alerta reactiva en el modal de suscripción que bloquea el botón de confirmación si las sucursales activas superan el límite del plan seleccionado.

---

## 2. PAQUETE 2: CATÁLOGO, VARIANTES Y MULTIMEDIA (CU05 – CU06)

### [CU05] Gestión de Catálogo de Prendas y Variantes
* **Objetivo:** Modelado tridimensional del producto textil (Prenda base ➔ Color ➔ Talla ➔ SKU).
* **Cambios Backend:**
  - Vinculación de imágenes CDN vía **Cloudinary** (`CLOUDINARY_CLOUD_NAME=tjfuyard`) con fallback automático a URLs de alta resolución de Unsplash y estilos oficiales.
  - Desacoplamiento entre prenda abstracta y variantes de percha física.

### [CU06] Consulta de Catálogo Facetado y Filtro por Rango de Precios
* **Objetivo:** Navegación avanzada para el cliente con filtrado multidimensional en tiempo real.
* **Cambios Backend:**
  - Endpoints `/api/catalog/products` y `/api/catalog/facets` optimizados para calcular dinámicamente `min_price` y `max_price` por tenant.
* **Cambios Frontend:**
  - Implementación de doble control deslizante (slider) de rango de precio en `catalog-page.component.html`.
  - Búsqueda reactiva con `debounceTime(300)` que actualiza el grid de productos sin recargar la página.

---

## 3. PAQUETE 4: COMPRAS, PASARELA STRIPE Y RESERVAS ONLINE (CU07 – CU10)

### [CU07] Carrito de Compras Persistente y Multi-sucursal
* **Objetivo:** Carrito sincronizado por usuario y sucursal de retiro.
* **Cambios Backend:**
  - Validación de stock disponible en la sucursal seleccionada antes de añadir ítems.
  - Cálculo de subtotales, impuestos y descuentos aplicables en backend.

### [CU08] Descuentos y Promociones por Código
* **Objetivo:** Aplicación de cupones porcentuales o de monto fijo con control de uso único por cliente.

### [CU09] Despacho Digital y Físico Condicionado a Stripe
* **Objetivo:** Garantizar que ninguna orden sea liberada sin confirmación de pago bancario.
* **Regla Inviolable:**
  - El cambio de estado de la orden a `paid` y la emisión del comprobante de despacho se ejecutan **únicamente** cuando Stripe confirma exitosamente la transacción (`status = 'paid'` en `PaymentIntent`).
  - Simulación y verificación en vivo integradas con credenciales Live reales de Stripe (`pk_live_...` y `rk_live_...`).

### [CU10] Reserva Online con Bloqueo Atómico de Percha (48 Horas)
* **Objetivo:** Apartado de prendas desde la web para retiro en tienda física.
* **Regla Inviolable de Concurrencia:**
  - El backend aplica bloqueo transaccional estricto con `SELECT ... FOR UPDATE` sobre la fila de `inventory`.
  - El stock se traslada de `quantity` a `reserved_quantity`, impidiendo que dos clientes aparten la misma unidad simultáneamente.
  - Vigencia de 48 horas exactas (`expires_at = now() + 48 hours`).
  - Worker continuo de fondo en `main.py` que barre y libera automáticamente las reservas caducadas.

---

## 4. PAQUETE 5: POS OFFLINE, OUTBOX PATTERN Y CONFLICTOS (CU11 – CU16)

### [CU11] Registrar Reserva de Mostrador Offline
* **Objetivo:** Permitir a los cajeros registrar apartados presenciales de clientes incluso cuando se corta la conexión a internet.
* **Implementación PWA:**
  - Persistencia local inmediata en la tienda `offline_reservations` de **IndexedDB**.
  - Generación en el cliente de identificador único `UUIDv4`.
  - Marcado con estado `PENDIENTE_SYNC`.

### [CU12] Atender y Resolver Conflictos de Reservas Expiradas
* **Actor:** Encargado de Sucursal (`encargado.lp@fashionstore.bo`).
* **URL:** `http://localhost:4200/app/encargado/reservations`
* **Vías de Resolución Oficiales:**
  - **Opción A (Reactivación por 24h):** Si el cliente acude físicamente y la prenda continúa en el mostrador, se extiende el plazo por 24 horas adicionales con justificación en bitácora.
  - **Opción B (Liberación a Percha):** El stock reservado se reintegra formalmente al inventario disponible para venta libre al público general.

### [CU13] Registro de Venta POS de Mostrador Offline
* **Regla Inviolable:** Las ventas en desconexión deben ser obligatoriamente al **contado (efectivo)**.
* **Implementación:** El ticket se emite localmente con UUIDv4, descuenta el stock en el caché local de IndexedDB y suma al contador de gaveta física.

### [CU14] Gestionar Bandeja Local de Contingencia (Outbox Pattern PWA)
* **Objetivo:** Monitoreo y control del estado desconectado de la caja.
* **Componentes de Pantalla en Caja:**
  - Tarjeta de alerta informativa: *"Operaciones en cola de contingencia"*.
  - Tarjeta de dinero físico: *"Bs XXX.XX en gaveta física offline"*.
  - Tabla de auditoría con listado de tickets locales, UUIDv4 y hora exacta de emisión.
  - Resistencia total a recargas del navegador (`F5`), reinicios de equipo y caídas de red.

### [CU15] Sincronizar Lotes de Ventas con Idempotencia Central (`sync_operations`)
* **Objetivo:** Consolidar las operaciones acumuladas en el servidor central al restablecerse la red.
* **Mecanismo de Idempotencia Central:**
  - La PWA envía el lote a `/api/sales/offline/batch-sync`.
  - El backend verifica el UUIDv4 en la tabla `sync_operations`.
  - **Prueba de Doble Envío:** Si el usuario pulsa dos veces el botón de sincronizar o se retransmite la petición, el backend detecta el registro duplicado y responde `HTTP 200 Confirmado` **sin duplicar la venta contable ni descontar el stock dos veces**.
  - La bandeja Outbox se vacía y muestra el banner verde de éxito.

### [CU16] Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock
* **Actor:** Administrador de Empresa / Encargado de Sucursal.
* **URL:** `http://localhost:4200/app/admin/conflicts`
* **Problema:** Ocurrencia de sobreventa durante desconexión prolongada (dos cajeros vendieron la última unidad física en diferentes terminales).
* **Vías Oficiales de Resolución:**
  1. **Vía 1 (Sustitución):** Entrega acordada de otra prenda de igual o mayor valor.
  2. **Vía 2 (Nota de Crédito 100%):** Emisión formal de nota de crédito código `NC-...` por el valor total pagado para futuras compras.
  3. **Vía 3 (Reembolso en Efectivo):** Devolución total del dinero con firma de recibo de egreso de caja.

---

## 5. POLÍTICAS DE NEGOCIO OBLIGATORIAS (CU17 – CU18)

### [CU17] Política 1: Cambio de Prenda por Talla/Modelo con Diferencia de Precio
* **Regla Inviolable:**
  - Si un cliente solicita cambio de prenda (ej. Blusa Talla M de Bs 50 por Talla L de Bs 70), el cambio **sólo se consolida si el cliente abona la diferencia de precio (Bs 20)**.
  - Si el cliente no abona la diferencia, la transacción se aborta de inmediato y el inventario permanece inalterado.
* **Implementación:**
  - Endpoint `/api/sales/exchanges` valida matemáticamente `price_new - price_original`. Si el monto pagado adicional es menor a la diferencia requerida, retorna `HTTP 400 Bad Request`.

### [CU18] Política 2: Devolución de Prenda con Retención Operativa y Nota de Crédito
* **Regla Inviolable:**
  - Toda devolución está sujeta a una **retención obligatoria de entre el 20% y el 50%** por gastos administrativos, reempaque y costos operativos.
  - Se reembolsa entre el **50% y el 80%** del valor original de la compra.
  - El reembolso se procesa en efectivo o mediante **Nota de Crédito (código `NC-...`)**.
* **Implementación:**
  - Tabla `garment_returns` registra: `original_amount`, `retention_percentage`, `refund_amount` y `credit_note_code`.

---

## 6. MAPAS, INTELIGENCIA ARTIFICIAL Y MACHINE LEARNING (CU19 – CU25)

### [CU19] Mapa Web Interactivo de Sucursales (OpenStreetMap)
* **Objetivo:** Localización geográfica de todas las tiendas de la cadena en la web y PWA.
* **Tecnología:** Leaflet.js integrado con tiles de OpenStreetMap, sin dependencias costosas de Google Maps.
* **Funcionalidades:** Pines personalizados por tenant, cálculo de distancias, horarios de atención y estado abierto/cerrado.

### [CU20] Reportes Ejecutivos por Voz con Google Gemini RAG
* **Objetivo:** Consultas analíticas en lenguaje natural mediante audio o texto para directores comerciales.
* **Tecnología:** Google Gemini API (`gemini-2.5-flash`) orquestado con RAG (Retrieval-Augmented Generation) sobre los datos de ventas e inventario del tenant.
* **Resiliencia:** Si la API de Gemini no dispone de conexión o cuota, el servicio conmuta transparentemente a un motor analítico heurístico determinístico, garantizando que el usuario siempre reciba un reporte completo.

### [CU21] Exportación Multiformato de Reportes (PDF y Excel)
* **Tecnología:** ReportLab para PDFs estilizados con membrete corporativo y OpenPyXL para hojas de cálculo Excel con tablas dinámicas y fórmulas financieras.

### [CU22] Generación y Gestión de Datasets Sintéticos para ML
* **Objetivo:** Generación masiva de datos sintéticos realistas con distribución gaussiana para entrenamiento de modelos predictivos propios sin comprometer datos sensibles.
* **Persistencia:** Tabla `synthetic_datasets` con parámetros de semilla, número de muestras y métricas de varianza.

### [CU23] Predicción de Demanda de Stock (ML Supervisado)
* **Algoritmo:** Regresión Lineal / Ridge Regression con Scikit-Learn sobre histórico de ventas, estacionalidad y rotación de tallas/colores.
* **Salida:** Sugerencia inteligente de reabastecimiento por sucursal para evitar quiebres de percha en los próximos 30 días.

### [CU24 – CU25] Segmentación de Clientes y Dashboard Ejecutivo (ML No Supervisado)
* **Algoritmo:** Clustering K-Means sobre vector tridimensional RFM (Recencia, Frecuencia, Monto Monetario).
* **Clasificación:** Segmentación automática en *Clientes VIP*, *Compradores Frecuentes*, *Clientes Ocasionales* y *En Riesgo de Pérdida*.
* **Dashboard Ejecutivo:** Visualización gráfica de métricas clave (KPIs), ingresos por tenant, gráficos de dispersión de clusters y tablas de rendimiento de sucursales.

---

## 7. BASE DE DATOS Y POBLACIÓN DE 3 MESES DE TRÁFICO

Para permitir auditorías académicas completas y pruebas de carga, la base de datos PostgreSQL alojada en **Neon Tech** cuenta con un volcado limpio y unificado:

| Indicador | Cantidad Poblada | Detalle |
| :--- | :--- | :--- |
| **Registros Totales** | **25,363 filas** | Tráfico simulado de 90 días (Agosto a Noviembre 2026). |
| **Empresas (Tenants)** | 3 boutiques | Boutique Elegance, Moda Urbana, Boutique París S.R.L. |
| **Sucursales Activas** | 17 sucursales | Cobertura en La Paz, Cochabamba y Santa Cruz. |
| **Prendas de Catálogo** | 225 prendas | Fotos reales en alta resolución vinculadas a Cloudinary. |
| **Variantes (SKU)** | 757 variantes | Combinaciones reales de tallas (XS a XL) y colores. |
| **Stock en Perchas** | 5,207 registros | Control de existencias físicas por sucursal. |
| **Ventas Realizadas** | 5,582 tickets | 8,488 prendas vendidas con medios de pago efectivo y Stripe. |
| **Operaciones Sincronizadas** | 438 registros | Histórico de auditoría en `sync_operations`. |
| **Cambios de Talla (Pol. 1)** | 259 registros | Operaciones con diferencia de precio cobrada. |
| **Devoluciones (Pol. 2)** | 171 registros | Devoluciones con retención del 20-50% y nota de crédito. |
| **Usuarios Registrados** | 307 usuarios | Administradores, encargados, cajeros, repartidores y clientes. |
| **Contraseña Unificada** | `Tiendafashion123!` | **100% en texto plano sin hashear** en ambos volcados SQL. |

---

## 8. ARCHIVOS GENERADOS Y UBICACIONES EN EL REPOSITORIO

1. **[`database_full_unhashed.sql`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/database_full_unhashed.sql):** Volcado maestro completo de 8.6 MB con los 25,363 registros y todas las contraseñas sin hashear.
2. **[`database_neon_dump.sql`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/database_neon_dump.sql):** Estructura DDL completa (tablas, enums, triggers) y datos base sin hashes.
3. **[`backend/main.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/main.py):** Orquestación FastAPI, router `/api` unificado, worker de expiración automática y fallback `/tmp/uploads` para Linux Render.
4. **[`render.yaml`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/render.yaml):** Blueprint oficial para despliegue en Render con arranque optimizado.
5. **Rama Remota de Producción:** Rama **`prod`** en [`https://github.com/RSofi12/Saas-ecommerce.git`](https://github.com/RSofi12/Saas-ecommerce.git).
