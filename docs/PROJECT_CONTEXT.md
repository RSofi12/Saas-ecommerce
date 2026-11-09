# CONTEXTO DEL PROYECTO: FASHIONSTORE (SaaS MULTITENANT)
### Plataforma de Comercio Electrónico Multitienda con Soporte Offline, Geolocalización e Inteligencia Analítica
**Materia:** Sistemas de Información 2 (2do Parcial)  
**Metodología Oficial:** ICONIX (UML 2.5+)  
**Arquitectura:** Módulos Profundos (*Deep Modules*) & Limpia / Hexagonal

---

## 1. Visión General del Producto

**FashionStore** es una solución de software como servicio (**SaaS B2B2C**) orientada a la industria de la moda, calzado y confección textil. Permite que múltiples empresas de moda (*tenants*) gestionen de forma aislada, segura y centralizada sus catálogos, sucursales físicas, inventarios multisede, puntos de venta (POS) físicos con capacidad de venta desconectada (*offline-first*), reservas con vencimiento y comercio electrónico digital con pasarelas de pago internacionales y análisis predictivo de demanda con Inteligencia Artificial.

---

## 2. Problemática y Justificación

Las cadenas de boutiques y tiendas de ropa enfrentan tres barreras críticas en sus operaciones diarias:
1. **Caídas de Conectividad en Tiendas Físicas:** Cuando se interrumpe el servicio de Internet en los centros comerciales o sucursales, los sistemas de facturación tradicionales se paralizan, perdiendo ventas y generando colas.
2. **Complejidad en Políticas de Cambio y Devolución:** En prendas de vestir, las variaciones de corte, tela y talla frecuentemente alteran el precio final (por ejemplo, una talla *M* a Bs 50 frente a una talla *L* o especial a Bs 70). Gestionar el cobro de la diferencia de precio, retenciones operativas por logística inversa (20% al 50%) y devoluciones parciales (50% al 80%) suele provocar desajustes de caja e inventario.
3. **Falta de Inteligencia Operativa y Multisede:** Las decisiones de reabastecimiento entre sucursales se toman a ciegas por falta de modelos predictivos de demanda y segmentación de clientes, mientras que los clientes finales carecen de herramientas móviles para localizar sucursales en mapa y probar prendas en tiempo real.

FashionStore resuelve estos problemas combinando una arquitectura web progresiva (**PWA**) y móvil (**Flutter**) desconectada, sincronización idempotente con UUIDs, aislamiento multitenant riguroso a nivel de base de datos y un módulo de IA generativa y analítica predictiva.

---

## 3. Alcance del Sistema (2do Parcial)

El alcance del segundo parcial unifica y amplía la plataforma en **7 dimensiones clave**, estructuradas bajo **25 Casos de Uso oficiales**:

### A. Modelo SaaS Multitenant y Suscripciones (Paquete 1)
- Separación lógica estricta mediante `tenant_id UUID` en todas las tablas transaccionales.
- Suscripción por planes con límites forzados por el backend:
  - **Plan Básico:** Hasta 3 sucursales activas, sin módulo de IA Generativa.
  - **Plan Profesional:** Hasta 10 sucursales activas, acceso completo a IA generativa y analítica predictiva.
  - **Plan Empresarial:** Hasta 25 sucursales activas, acceso ilimitado a IA y copias de seguridad continuas.
- Autenticación unificada con JWT conteniendo claims de usuario, rol y `tenant_id`.

### B. Catálogo de Ropa con Variantes y Filtros Avanzados (Paquete 2)
- Gestión de productos con múltiples variantes jerárquicas: modelo, color, material y tallas (XS, S, M, L, XL, XXL).
- Precios diferenciados por variante/talla cuando la confección o material lo requiera.
- Catálogo online con búsqueda facetada, filtros por categoría, rango de precios y stock en tiempo real.

### C. Inventario Multisede y Persistencia Offline (Paquete 3)
- Control de stock físico diferenciado por sucursal (`branch_inventory`).
- Registro y autorización de transferencias de mercadería entre sucursales.
- **Modo Desconectado (PWA y Mobile):** Descarga y almacenamiento en caché del catálogo completo en almacenamiento local estructurado (**IndexedDB** en navegadores web / PWA y **SQLite** en la app móvil Flutter).
- Consulta y visualización del catálogo en modo avión o sin red celular.

### D. Compras Digitales y Reservas con Vencimiento (Paquete 4)
- Carrito de compras web y móvil con checkout integrado a **Stripe** (pagos con tarjeta y confirmación vía webhooks).
- **Política de Despacho:** Los envíos y entregas de prendas se autorizan únicamente cuando la pasarela Stripe confirma el cobro exitoso (`status = 'paid'`).
- Módulo de reservas de prendas (online o presencial) con apartado de stock temporal y resolución automática de reservas vencidas tras el tiempo límite establecido por la tienda.

### E. Punto de Venta (POS), Sincronización y Políticas de Negocio (Paquete 5)
- **POS Online:** Venta directa con facturación inmediata y descuento de stock en base de datos central.
- **POS Offline (Contingencia sin Red):**
  - Generación de transacciones locales con identificadores únicos universales (**UUIDv4**).
  - **Restricción comercial:** Venta offline habilitada **únicamente de contado (efectivo)**.
  - Bandeja local de operaciones pendientes con contador visual para el cajero.
  - Sincronización por lotes (*batch sync*) con el backend mediante la tabla de auditoría `sync_operations` para garantizar **idempotencia transaccional** (cero ventas duplicadas).
- **Políticas de Negocio Inviolables:**
  - **Cambio de Prenda (CU17):** Al solicitar cambio por otra talla/prenda con diferencia de precio (ej. M a Bs 50 por L a Bs 70), el cambio se consolida **exclusivamente si el cliente paga la diferencia de precio**. Si el cliente no acepta pagar la diferencia, el sistema cancela la operación y restituye la prenda o el importe original.
  - **Devolución de Prenda (CU18):** La tienda aplica una retención del 20% al 50% por concepto de gastos operativos, inspección y desinfección textil, reembolsando entre el 50% y el 80% del valor abonado (vía reintegro monetario o vale de compra/nota de crédito).

### F. Geolocalización Móvil y Probador Virtual (Paquete 6)
- Integración de mapas 100% de código abierto en Flutter: **OpenStreetMap** con renderizado vectorial y cálculo de rutas óptimas hacia sucursales cercanas mediante la API de **OpenRouteService**.
- Probador Virtual con Realidad Aumentada (**AR**) en la aplicación móvil para superposición de prendas sobre el usuario.

### G. Inteligencia Artificial y Analítica Predictiva (Paquete 7)
- **IA Generativa Asistida por Voz (Gemini API):** Los administradores pueden solicitar balances, resúmenes de venta y stock mediante comandos de voz o texto en lenguaje natural, recibiendo respuestas contextualizadas y generación de reportes ejecutivos en PDF/Excel.
- **Machine Learning Supervisado:** Algoritmo de regresión/clasificación entrenado con dataset sintético de ventas y estacionalidad para predecir la demanda futura por talla y categoría de ropa.
- **Machine Learning No Supervisado:** Algoritmo de agrupamiento **K-Means** para segmentar clientes en función de su ticket promedio, frecuencia de compra y preferencia de categorías.
- Dashboard ejecutivo con KPIs comerciales en tiempo real.

---

## 4. Stack Tecnológico Unificado

| Capa / Subsistema | Tecnologías Empleadas | Propósito y Justificación |
| :--- | :--- | :--- |
| **Backend API** | Python 3.10+ / FastAPI / Pydantic v2 | Alto rendimiento asíncrono, validación estricta de esquemas y documentación OpenAPI automática. |
| **ORM & Migraciones**| SQLAlchemy 2.0 / Alembic | Mapeo objeto-relacional robusto y control de versiones del esquema de base de datos. |
| **Base de Datos Central**| PostgreSQL 15+ | Soporte de transacciones ACID, índices JSONB, tipos nativos UUID y alta concurrencia. |
| **Frontend Web / PWA** | Angular 21 / TypeScript / TailwindCSS | Aplicación web progresiva con Service Worker, Web App Manifest y componentes Spartan UI. |
| **Almacenamiento Local Web**| IndexedDB (`idb` wrapper) | Almacenamiento persistente transaccional en el navegador del cliente para catálogo y ventas offline. |
| **Aplicación Móvil** | Flutter 3.x / Dart | Experiencia nativa multiplataforma (Android/iOS) con rendimiento fluido a 60 fps. |
| **Almacenamiento Local Móvil**| SQLite (`sqflite`) | Base de datos embebida relacional y transaccional en el dispositivo móvil. |
| **Mapas & Rutas Móviles**| OpenStreetMap + OpenRouteService | Alternativa libre, personalizable y sin costos de licenciamiento para navegación geográfica hacia sucursales. |
| **Pasarela de Pagos** | Stripe API (SDK Python + Stripe Elements) | Procesamiento seguro de pagos digitales con tarjeta y confirmación desacoplada vía webhooks. |
| **Inteligencia Artificial**| Google Gemini API + Scikit-Learn + NumPy | Consultas en lenguaje natural con soporte de voz, modelos de demanda (Supervisado) y clustering K-Means (No Supervisado). |

---

## 5. Metodología de Desarrollo: ICONIX

El proyecto sigue rigurosamente el proceso unificado ágil **ICONIX**, reduciendo la sobrecarga documental pero garantizando la trazabilidad entre los requisitos y el código:

```
[Requisitos Funcionales] 
       │
       ▼
[Fichas de Casos de Uso] (Precondición, Flujo Básico, Alternativas, Postcondición)
       │
       ▼
[Análisis de Robustez] (Fronteras <<boundary>>, Controles <<control>>, Entidades <<entity>>)
       │  * Regla ICONIX: Loops y rutas alternativas parten SIEMPRE del Control.
       ▼
[Diagramas de Secuencia] (Asignación de métodos y mensajes técnicos a clases)
       │
       ▼
[Diagrama de Clases & Código Fuente] (FastAPI, SQLAlchemy, Angular, Flutter)
```
