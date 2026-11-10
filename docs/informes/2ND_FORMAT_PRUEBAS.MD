# CAPÍTULO V. PRUEBAS Y RESULTADOS
### FashionStore — Plataforma E-Commerce SaaS Multitenant
**Materia:** Sistemas de Información 2 — S2-2026
**Docente:** MSc. Ing. Angélica Garzón Cuéllar
**Enfoque Metodológico:** Pruebas Dirigidas por Casos de Uso (*Use Case-Driven Testing* — ICONIX Process)
**Alcance Técnico:** Homologación Nuclear de los 25 Casos de Uso Oficiales (`CU01` al `CU25`)

## 5.1. Plan de pruebas

### 5.1.1. Enfoque Metodológico
El aseguramiento de calidad de **FashionStore** sigue el paradigma de **Pruebas Dirigidas por Casos de Uso (*Use Case-Driven Testing*)** propio de la metodología **ICONIX (UML 2.5+)**. Este enfoque garantiza la trazabilidad matemática bidireccional entre la especificación y la implementación:
1. **Fichas Descriptivas de Caso de Uso:** Definen el contrato funcional base a través de sus flujos normales y alternativos.
2. **Diagramas de Robustez (BCE):** Cada caso de prueba valida la interacción en la Frontera (`Boundary`), la regla de decisión o bucle centralizado en el objeto `Controller` y el impacto en las `Entities` relacionales.
3. **Políticas de Negocio Inviolables (P-Ten-01 a P-Ten-05):** Verificación estricta de las reglas del pliego: cobro de diferencia en cambio por talla ($\\Delta > 0$), retención del 20% al 50% en devoluciones, límite de sucursales según plan SaaS, pago confirmado con Stripe antes del despacho y exclusividad de efectivo en contingencia offline.

### 5.1.2. Objetivo
Validar la solidez funcional, el blindaje multitenant y la resiliencia operativa de los 25 Casos de Uso del sistema mediante una prueba nuclear de alta criticidad por cada caso de uso:
* **Hito 1 (CU01 al CU10):** Aislamiento entre empresas suscriptoras, gobernanza de planes comerciales, control de límites de sucursales, precios de prendas según talla, persistencia offline inicial en IndexedDB/SQLite, pagos con tarjeta mediante Stripe y reservas online con temporizador de expiración.
* **Hito 2 (CU11 al CU18):** Operación en modo desconectado (*offline-first*), idempotencia en sincronización por lotes (`sync_operations`), gestión de quiebres de inventario mediante prendas sustitutas o notas de crédito, y liquidación de cambios y devoluciones respetando las políticas de tienda.
* **Hito 3 (CU19 al CU25):** Geolocalización de sucursales y trazado de rutas con OpenStreetMap y OpenRouteService, asistencia ejecutiva por voz con Gemini 2.5 Flash RAG, exportación editorial a PDF y Excel con fórmulas activas, síntesis estocástica de datasets textiles, modelos predictivos supervisados (*RandomForest*) y segmentación conductual (*K-Means*).

### 5.1.3. Alcance del Plan
El plan cubre la totalidad de los paquetes de dominio del sistema:
* **Backend (FastAPI + SQLAlchemy + PostgreSQL 15):** 7 paquetes de dominio (`p0` a `p6`), transacciones ACID protegidas con `with_for_update()` y forzado del claim `tenant_id`.
* **Frontend Web (Angular 21 PWA):** Service Workers, reactividad local en IndexedDB y componentes estilizados con TailwindCSS y Spartan UI.
* **Aplicación Móvil (Flutter):** Almacenamiento local SQLite (`sqflite`), sensor de geolocalización GPS y renderizado de mapas vectoriales WGS84.
* **Servicios Analíticos y Terceros:** Pasarela Stripe, OpenRouteService API, Google Gemini 2.5 Flash API y modelos de Scikit-Learn.

### 5.1.4. Herramientas de Prueba
| **Herramienta** | **Tipo** | **Propósito en el Proyecto** |
| :--- | :--- | :--- |
| **Pytest** | Automatizada | Verificación de controladores, transacciones ACID y aislamiento multitenant en FastAPI. |
| **Postman / Newman** | Pruebas de API | Validación de schemas JSON, cabeceras Bearer JWT y simulación de idempotencia. |
| **DevTools (Chrome/Firefox)** | Emulación de Red | Simulación de desconexión forzada (*Offline Mode*) e inspección de IndexedDB. |
| **Emulador Android / Flutter Driver** | Pruebas Móviles | Comprobación de persistencia en SQLite (`sqflite`) y geolocalización. |
| **Stripe Sandbox** | Pasarela de Pagos | Simulación de cobros confirmados y disparo de webhooks `payment_intent.succeeded`. |
| **Scikit-Learn Evaluator** | Métricas ML | Validación de métricas de ajuste ($R^2 \ge 0.80$, MAE, RMSE) y clustering K-Means. |

## 5.2. Pruebas funcionales

### 5.2.1. Técnica Aplicada
Se utiliza la técnica formal de **Pruebas de Caja Negra (*Black-Box Testing*)** basada en la partición de equivalencia y análisis de valores límite. Las pruebas evalúan las interfaces públicas del sistema sin asumir precondiciones internas no declaradas.

### 5.2.2. Matriz Comparativa de Cobertura Funcional por Paquetes de Dominio (ICONIX)
La siguiente tabla sinóptica sintetiza la homologación de los 25 requisitos funcionales y casos de uso del sistema frente a los objetivos de control gobernados por los Controladores del modelo ICONIX:

| **Paquete** | **Módulo / Requisito** | **Caso de Uso** | **Objetivo de Prueba (Garantía del Controlador)** | **Tipo de Prueba** | **Resultado** |
| :---: | :--- | :---: | :--- | :---: | :---: |
| **p0** | RF01: Registro de Tenants | CU01 | Creación de empresa con UUID único, estado ACTIVO y aislamiento inicial de datos. | Sunny Day | Satisfactorio |
| **p0** | RF02: Planes y Cuotas SaaS | CU02 | Asignación de plan de suscripción y configuración de cuotas máximas de sucursales. | Sunny Day | Satisfactorio |
| **p1** | RF03: Autenticación Multitenant | CU03 | Emisión de token JWT conteniendo claims obligatorios `tenant_id` y `branch_id`. | Sunny Day | Satisfactorio |
| **p1** | RF04: Sucursales Bajo Límites | CU04 | Bloqueo estricto de creación al alcanzar el límite comercial del plan (Política 4). | Rainy Day | Satisfactorio |
| **p2** | RF05: Catálogo y Precios por Talla | CU05 | Registro de prenda con diferenciación de precios unitarios según la talla (S a Bs 80, L a Bs 95). | Sunny Day | Satisfactorio |
| **p2** | RF06: Búsqueda Facetada Online | CU06 | Filtrado multicriterio en tiempo real por categoría, talla y precio en PostgreSQL. | Sunny Day | Satisfactorio |
| **p3** | RF07: Sincronización Local Catálogo | CU07 | Descarga y persistencia íntegra del catálogo en el almacén IndexedDB de la PWA. | Sunny Day | Satisfactorio |
| **p3** | RF08: Catálogo Desconectado | CU08 | Conmutación reactiva e inmediata a caché local ante pérdida de conexión a Internet. | Sunny Day | Satisfactorio |
| **p4** | RF09: Checkout Virtual con Stripe | CU09 | Pago confirmado con tarjeta y generación de orden de despacho (Política 3). | Sunny Day | Satisfactorio |
| **p4** | RF10: Reserva Online con Bloqueo | CU10 | Creación de reserva con bloqueo atómico de stock físico y temporizador de 48 horas. | Sunny Day | Satisfactorio |
| **p4** | RF11: Reserva Offline Local | CU11 | Registro de reserva en contingencia con UUIDv4 local y decremento de stock en IndexedDB. | Sunny Day | Satisfactorio |
| **p4** | RF12: Conflictos de Reservas | CU12 | Resolución de reserva expirada sin stock ofreciendo prenda sustituta con selector visual. | Rainy Day | Satisfactorio |
| **p5** | RF13: Venta POS Offline en Efectivo | CU13 | Facturación presencial desconectada en efectivo con impresión térmica de 80mm (Política 5). | Sunny Day | Satisfactorio |
| **p5** | RF14: Bandeja Outbox Local | CU14 | Auditoría de gaveta física local y control de reintentos granulares en PWA. | Sunny Day | Satisfactorio |
| **p5** | RF15: Sincronización e Idempotencia | CU15 | Intercepción de lotes duplicados en `sync_operations` garantizando cero doble cobro. | Rainy Day | Satisfactorio |
| **p5** | RF16: Quiebres de Stock Offline | CU16 | Solución de sobreventa mediante emisión de Nota de Crédito digital por el 100% del abono. | Rainy Day | Satisfactorio |
| **p5** | RF17: Cambio de Prenda por Talla | CU17 | Liquidación de cambio exigiendo el cobro de la diferencia positiva $\\Delta > 0$ (Política 1). | Sunny Day | Satisfactorio |
| **p5** | RF18: Devolución con Retención | CU18 | Procesamiento de devolución aplicando retención del 30% y emitiendo Nota de Crédito (Política 2). | Sunny Day | Satisfactorio |
| **p6** | RF19: Rutas y Mapas OSM/ORS | CU19 | Trazado multimodal de ruta (vehicular y a pie) con cálculo de distancia y tiempo (ETA). | Sunny Day | Satisfactorio |
| **p6** | RF20: Reportes Ejecutivos por Voz | CU20 | Consulta gerencial por voz procesada con Gemini 2.5 Flash RAG sobre ventas reales. | Sunny Day | Satisfactorio |
| **p6** | RF21: Exportación PDF y Excel | CU21 | Emisión editorial a PDF apaisado con `NumberedCanvas` ("Página X de Y") y Excel con fórmulas. | Sunny Day | Satisfactorio |
| **p6** | RF22: Dataset Sintético ML | CU22 | Síntesis estocástica vectorial de transacciones textiles con estacionalidad boliviana. | Sunny Day | Satisfactorio |
| **p6** | RF23: Predicción de Demanda RF | CU23 | Inferencia de demanda futura por talla con *RandomForestRegressor* ($R^2 \ge 0.84$). | Sunny Day | Satisfactorio |
| **p6** | RF24: Segmentación K-Means | CU24 | Agrupamiento no supervisado de clientes en 4 perfiles conductuales según RFM+D. | Sunny Day | Satisfactorio |
| **p6** | RF25: Dashboard Ejecutivo | CU25 | Panel directivo consolidando ventas, contingencias offline, ingresos por políticas y KPIs ML. | Sunny Day | Satisfactorio |

## 5.3. Pruebas de integración

Las pruebas de integración homologan la interoperabilidad y consistencia entre componentes desacoplados:
1. **Frontend PWA / Móvil $\\leftrightarrow$ Backend API:** Validación del ciclo de autorización HTTP (`Bearer <JWT>`) forzando el claim `tenant_id` en todas las transacciones.
2. **Bandeja Outbox $\\leftrightarrow$ Endpoint Central (`/api/sales/offline/batch-sync`):** Inyección de lotes transaccionales desde IndexedDB/SQLite verificando idempotencia centralizada en `sync_operations`.
3. **Pasarela Stripe $\\leftrightarrow$ Despacho Logístico (CU09):** Flujo asíncrono donde la orden pasa a `PAGADA` y genera la orden de despacho únicamente tras recibir la confirmación criptográfica de Stripe.
4. **Módulo Cartográfico $\\leftrightarrow$ API OpenRouteService (CU19):** Comunicación REST para recepción de polilíneas GeoJSON, cálculo métrico de distancias y tiempos de traslado estimados (ETA).
5. **Agente Asistente $\\leftrightarrow$ Google Gemini 2.5 Flash RAG (CU20):** Recuperación de contexto estructurado desde PostgreSQL, inyección en el prompt (*grounding*) y respuesta en lenguaje natural en $< 2.5$ segundos.
6. **Pipeline Analítico $\\leftrightarrow$ Dashboard Ejecutivo (CU22 a CU25):** Sincronización continua de previsiones de demanda y segmentos de clientes consumidos por el panel directivo.

## 5.4. Corrección de errores

Durante el ciclo de pruebas integrales se resolvieron los siguientes incidentes críticos de arquitectura:

| **Incidente Crítico** | **Causa Raíz Identificada** | **Remediación Arquitectónica Aplicada** |
| :--- | :--- | :--- |
| **Sincronización duplicada ante reconexión inestable (CU15)** | Terminales offline reintentaban el envío del lote antes de recibir el primer ACK de red, arriesgando doble asiento de venta. | Se estableció la validación transaccional obligatoria de `operation_uuid` contra la tabla `sync_operations`. Si el registro ya existe, el backend confirma de inmediato sin duplicar operaciones contables ni stock. |
| **Fuga de contexto multitenant en reportes analíticos (CU21/CU25)** | Subconsultas SQL complejas de agregación omitían el filtro de empresa. | Se implementó la inyección obligatoria de dependencia `get_current_tenant` en FastAPI, asegurando que toda consulta aplique forzosamente `WHERE tenant_id = :tenant_id`. |
| **Omisión de cobro de diferencia en cambio de prendas (CU17)** | La interfaz permitía consolidar el cambio de una prenda por otra de mayor valor sin validar que el cliente abonara la diferencia. | Se programó una guarda transaccional en el controlador backend: si $\\Delta > 0$ y `difference_paid == False`, la petición se rechaza con código `HTTP 400 Bad Request`. En frontend el botón de confirmación se bloquea reactivamente. |
| **Error en numeración de páginas en reportes PDF extensos (CU21)** | El generador PDF calculaba la cantidad total de páginas de forma estática en la primera pasada, arrojando numeración errónea ("Página 1 de 0"). | Se integró la clase `NumberedCanvas` de ReportLab, la cual pospone la impresión del encabezado y pie de página al método `save()`, calculando matemáticamente el total exacto de páginas ("Página X de Y"). |
| **Caída en Dashboard Ejecutivo ante empresas en Plan Básico (CU25)** | El dashboard consultaba de forma obligatoria las tablas de Machine Learning, arrojando excepciones no controladas para suscriptores básicos. | Se instauró una estrategia de degradación grácil: el backend evalúa el claim `has_ai_access`; si es falso, retorna `has_ml_access: False` y devuelve las métricas estándar sin error 500. |

## 5.5. Resultados de las pruebas

La ejecución integral del plan de pruebas sobre los 25 Casos de Uso oficiales de FashionStore arrojó una efectividad del 100%:

### 1. Métricas Cuantitativas de Ejecución
* **Casos de Uso Evaluados:** 25 de 25 Casos de Uso oficiales (`CU01` al `CU25`) $\\rightarrow$ **100% de cobertura del sistema**.
* **Casos de Prueba Nucleares Ejecutados:** **25 casos de prueba de caja negra formalizados**.
* **Casos de Prueba Aprobados:** **25 / 25 (100% de éxito operativo)**.
* **Casos de Prueba Fallidos / Bloqueantes:** **0**.

### 2. Validación de Requisitos No Funcionales Críticos
* **Aislamiento Multitenant (RNF-02):** Se comprobó que un token JWT emitido para una empresa es estrictamente rechazado al intentar consultar o modificar recursos de otra empresa suscriptora.
* **Control de Cuotas de Suscripción (RNF-01 / CU04):** El backend bloqueó de forma determinista la creación de sucursales excedentes en tenants de Plan Básico, respondiendo con código `HTTP 403 Forbidden`.
* **Idempotencia Transaccional (RNF-04 / CU15):** La inyección forzada de lotes duplicados fue absorbida sin generar duplicidad de ventas ni descuentos adicionales de inventario.
* **Persistencia Offline Local (RNF-03 / CU07, CU08, CU13):** La descarga local y la operación desconectada preservaron los datos intactos en IndexedDB y SQLite tras reiniciar navegadores y dispositivos.
* **Rendimiento de Operaciones (RNF-09 / CU06, CU21):** Las búsquedas facetadas se completaron en menos de 80 ms y la generación de reportes PDF de alta fidelidad tomó menos de 350 ms.

## 5.6. Casos de prueba detallados (Los 25 Casos de Uso oficiales)

### CU01: Registrar y Gestionar Empresas (Tenants)
**Prueba 1: Creación Exitosa de Empresa Tenant con Aislamiento Inicial (Sunny Day)**

| **Caso de uso 01** | **Registrar y Gestionar Empresas (Tenants)** |
| :--- | :--- |
| **Descripción** | Permite al Superadministrador dar de alta a una nueva empresa suscriptora (tenant), validando la unicidad del subdominio y NIT, asignando un identificador UUIDv4 único y preparando el aislamiento de datos. |
| **Precondiciones** | a) Superadministrador autenticado con token JWT de plataforma global.<br>b) Subdominio y NIT sin registro previo en la base de datos central. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Acceder al panel de **"Gestión SaaS"** $\\rightarrow$ **"Empresas"** y presionar **"Nueva Empresa"**. | Se despliega el formulario modal de registro de empresa tenant. | Satisfactorio |
| 2 | Ingresar datos: Nombre Comercial: *"Boutique Elegance"*, Razón Social: *"Elegance SRL"*, Subdominio: *"elegance"*, NIT: *"1029384756"*. | La interfaz valida reactivamente la estructura del subdominio (solo minúsculas y guiones). | Satisfactorio |
| 3 | Presionar botón **"Registrar Empresa"**. | Se emite petición `POST /api/saas/companies` con el payload de datos. | Satisfactorio |
| 4 | Evaluar la respuesta del backend. | Código `HTTP 201 Created`. Se genera UUIDv4, estado `ACTIVO` y metadatos de auditoría. | Satisfactorio |
| 5 | Verificar la lista general de empresas. | *"Boutique Elegance"* figura en la tabla con su badge verde de estado activo. | Satisfactorio |

| **Responsable** | Superadministrador de Plataforma |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU02: Gestionar Planes de Suscripción (Básico, Pro, Empresarial) y Cuotas
**Prueba 1: Asignación Inicial de Plan Profesional con Cuota de 10 Sucursales (Sunny Day)**

| **Caso de uso 02** | **Gestionar Planes de Suscripción y Cuotas** |
| :--- | :--- |
| **Descripción** | Permite vincular a un tenant recién creado un plan de suscripción comercial (Plan Profesional), configurando la cuota máxima permitida de 10 sucursales y habilitando el acceso a módulos de IA. |
| **Precondiciones** | a) Empresa registrada sin suscripción activa vinculada.<br>b) Catálogo de planes precargado en la base de datos central. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar la empresa en el panel y pulsar **"Asignar Plan"**. | Se despliega el selector de planes comerciales: Básico, Profesional y Empresarial. | Satisfactorio |
| 2 | Elegir **"Plan Profesional"** (Límite: 10 sucursales, IA: Habilitada) y confirmar. | Se emite `POST /api/saas/subscriptions` con `company_id` y `plan_id`. | Satisfactorio |
| 3 | Evaluar la respuesta del servidor. | Código `HTTP 201 Created`. Suscripción con estado `ACTIVA`, cuota fijada a 10 e `is_active: True`. | Satisfactorio |
| 4 | Consultar la cuota de la empresa mediante `GET /api/branches/quota`. | Retorna `max_branches: 10`, `current_branches: 0`, `has_ai_access: True`. | Satisfactorio |

| **Responsable** | Superadministrador de Plataforma |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU03: Iniciar Sesión Multitenant con JWT y Claims de Tenant
**Prueba 1: Autenticación Exitosa con Emisión de Token JWT Multitenant (Sunny Day)**

| **Caso de uso 03** | **Iniciar Sesión Multitenant con JWT y Claims de Tenant** |
| :--- | :--- |
| **Descripción** | Permite a un usuario autenticarse en el sistema con su correo y contraseña, recibiendo un token JWT que encapsula de forma criptográfica la identidad del usuario, su rol, el `tenant_id` y su `branch_id` asignado. |
| **Precondiciones** | a) Usuario registrado y activo (`is_active: True`) perteneciente a una empresa y sucursal. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a la pantalla de Login e ingresar credenciales válidas. | Se capturan los datos de inicio de sesión. | Satisfactorio |
| 2 | Presionar el botón **"Iniciar Sesión"**. | El cliente emite `POST /api/auth/login` con email y contraseña. | Satisfactorio |
| 3 | Evaluar la respuesta del backend. | Código `HTTP 200 OK`. Retorna `access_token` JWT firmado con algoritmo HMAC-SHA256. | Satisfactorio |
| 4 | Decodificar y verificar el payload del token JWT. | Contiene claims obligatorios: `sub` (User UUID), `rol`, `tenant_id` (Company UUID) y `branch_id`. | Satisfactorio |
| 5 | Comprobar redirección en el frontend. | El usuario es redirigido a su panel de trabajo según su rol (Cajero, Encargado, Administrador). | Satisfactorio |

| **Responsable** | Usuario del Sistema / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU04: Gestionar Sucursales Bajo Límites del Plan
**Prueba 1: Bloqueo Estricto al Alcanzar el Límite Comercial del Plan (Rainy Day - Política 4)**

| **Caso de uso 04** | **Cumplimiento de Política P-Ten-04: Bloqueo de Límite de Sucursales** |
| :--- | :--- |
| **Descripción** | Valida que el sistema rechace de manera determinante la creación de una sucursal adicional si la empresa ya alcanzó el límite máximo de sucursales activas de su plan de suscripción. |
| **Precondiciones** | a) Empresa en Plan Básico con 3 sucursales activas registradas (cuota colmada: 3/3). |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Intentar registrar una 4ta sucursal en el panel administrativo. | El frontend advierte: *"Ha alcanzado el límite de 3 sucursales de su plan"*. | Satisfactorio |
| 2 | Forzar petición directa mediante Postman: `POST /api/branches`. | El backend audita las sucursales existentes activas (`count = 3 >= max_branches`). | Satisfactorio |
| 3 | Evaluar la respuesta del servidor. | Código `HTTP 403 Forbidden` con detalle: *"Límite de sucursales alcanzado para su plan de suscripción (3)"*. | Satisfactorio |
| 4 | Comprobar persistencia en la tabla `branches`. | Ninguna sucursal adicional es creada; el balance de cuotas permanece 3/3. | Satisfactorio |

| **Responsable** | QA Tester / Ingeniero Backend |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU05: Gestionar Prendas y Variantes de Precio por Talla
**Prueba 1: Alta de Prenda con Diferenciación de Precios por Talla (Sunny Day)**

| **Caso de uso 05** | **Gestionar Prendas y Variantes de Precio por Talla** |
| :--- | :--- |
| **Descripción** | Permite crear una prenda en el catálogo definiendo múltiples variantes con precios diferenciados según la talla (ej. Talla S a Bs 80.00, Talla L a Bs 95.00), asociando SKU único y stock inicial. |
| **Precondiciones** | a) Administrador de catálogo autenticado con `tenant_id` válido. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a **"Catálogo"** $\\rightarrow$ **"Prendas"** y presionar **"Nueva Prenda"**. | Se despliega el formulario con configuración de variantes de talla y color. | Satisfactorio |
| 2 | Ingresar datos base: Nombre: *"Vestido Fiesta Seda"*, Categoría: *"Vestidos"*. | Se cargan los atributos base del producto. | Satisfactorio |
| 3 | Configurar Variante 1: Talla S, SKU `VEST-S-01`, Precio: Bs 80.00, Stock: 10. | Se agrega la primera variante a la grilla de precios. | Satisfactorio |
| 4 | Configurar Variante 2: Talla L, SKU `VEST-L-01`, Precio: Bs 95.00, Stock: 8. | Se agrega la segunda variante con precio mayor justificado por material. | Satisfactorio |
| 5 | Presionar **"Guardar Prenda y Variantes"**. | Se emite `POST /api/products` con el árbol de variantes anidadas. | Satisfactorio |
| 6 | Evaluar respuesta del servidor. | Código `HTTP 201 Created`. Prenda creada con 2 variantes y precios diferenciados por talla. | Satisfactorio |

| **Responsable** | Encargado de Catálogo / Administrador |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU06: Consultar Catálogo Online con Búsqueda Facetada
**Prueba 1: Búsqueda Facetada Multicriterio en Tiempo Real (Sunny Day)**

| **Caso de uso 06** | **Consultar Catálogo Online con Búsqueda Facetada** |
| :--- | :--- |
| **Descripción** | Permite al cliente en la tienda virtual explorar prendas aplicando filtros facetados simultáneos de categoría, talla, color y rango de precios, obteniendo respuestas instantáneas indexadas en PostgreSQL. |
| **Precondiciones** | a) Catálogo con al menos 30 prendas activas con variantes cargadas. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a la tienda online y abrir el panel de filtros laterales. | Se despliegan las facetas dinámicas con conteo de prendas por talla y categoría. | Satisfactorio |
| 2 | Marcar categoría: *"Vestidos"*, Talla: *"M"* y rango de precio: *"Bs 50 a Bs 100"*. | El frontend emite `GET /api/catalog/products?category=vestidos&size=M&min_price=50&max_price=100`. | Satisfactorio |
| 3 | Evaluar la respuesta del endpoint. | Código `HTTP 200 OK`. Retorna únicamente prendas que satisfacen todos los filtros a la vez. | Satisfactorio |
| 4 | Inspeccionar las tarjetas de producto en pantalla. | Muestra imágenes, precio correspondiente a talla M y disponibilidad inmediata. | Satisfactorio |

| **Responsable** | Cliente / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU07: Sincronizar y Descargar Catálogo a Almacenamiento Local (PWA / SQLite)
**Prueba 1: Persistencia Completa del Catálogo en IndexedDB de la PWA (Sunny Day)**

| **Caso de uso 07** | **Persistencia de Catálogo en Base de Datos IndexedDB de la Web PWA** |
| :--- | :--- |
| **Descripción** | Comprueba que el servicio local de la PWA (`IdbCatalogService`) descargue y almacene íntegramente las prendas y variantes en los almacenes de objetos de IndexedDB del navegador. |
| **Precondiciones** | a) Paquete offline recibido satisfactoriamente por la PWA desde `/api/catalog/offline-pack`. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Presionar botón **"Descargar Catálogo Offline"** en el panel de configuración local. | El cliente solicita `GET /api/catalog/offline-pack?branch_id={id}`. | Satisfactorio |
| 2 | El servicio local procesa la transacción de escritura en IndexedDB. | Se insertan los registros en los almacenes `products` e `inventory`. | Satisfactorio |
| 3 | Abrir DevTools $\\rightarrow$ **Application** $\\rightarrow$ **IndexedDB** $\\rightarrow$ `fashionstore_local_db`. | Se constata la presencia de todas las entidades con sus claves primarias indexadas. | Satisfactorio |
| 4 | Cerrar y reabrir la pestaña del navegador. | Los datos permanecen persistidos en disco local sin pérdida de información. | Satisfactorio |

| **Responsable** | QA Tester / Desarrollador Frontend |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU08: Consultar Catálogo Offline en Modo Desconectado
**Prueba 1: Conmutación Automática y Búsqueda en Caché Local ante Corte de Red (Sunny Day)**

| **Caso de uso 08** | **Consultar Catálogo Offline en Modo Desconectado** |
| :--- | :--- |
| **Descripción** | Permite al cajero o vendedor buscar prendas por nombre o código en el catálogo cuando la terminal se desconecta de Internet, conmutando de forma transparente a la lectura en IndexedDB/SQLite. |
| **Precondiciones** | a) Catálogo descargado previamente en la terminal.<br>b) Dispositivo en modo desconectado (`navigator.onLine = false`). |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Desactivar la conexión de red (simular Offline en DevTools). | El listener `NetworkStatusService` conmuta el estado de la app a *"Modo Desconectado"*. | Satisfactorio |
| 2 | Escribir *"vestido"* en la barra de búsqueda de la tienda o POS. | La interfaz detecta la desconexión y redirige la consulta al almacén IndexedDB local. | Satisfactorio |
| 3 | Evaluar la respuesta en pantalla. | Se muestran instantáneamente los vestidos disponibles con distintivo ámbar *"Catálogo Local"*. | Satisfactorio |
| 4 | Verificar consola del navegador. | Cero excepciones de red no controladas; la experiencia de usuario es ininterrumpida. | Satisfactorio |

| **Responsable** | Cajero de Sucursal / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU09: Comprar Prendas con Stripe y Despacho Condicionado
**Prueba 1: Pago Exitoso con Stripe y Generación de Orden de Despacho (Sunny Day - Política 3)**

| **Caso de uso 09** | **Comprar Prendas con Stripe y Despacho Condicionado** |
| :--- | :--- |
| **Descripción** | Permite al cliente completar el checkout virtual abonando con tarjeta mediante Stripe; el sistema genera la orden de despacho oficial únicamente tras confirmar el pago exitoso (`status: 'paid'`). |
| **Precondiciones** | a) Carrito con prendas disponibles.<br>b) Integración con pasarela Stripe en modo prueba activa.<br>c) Política 3 activa: despacho condicionado a pago firme. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Iniciar checkout e ingresar datos de envío en la tienda online. | Se consolida la cotización del pedido con impuestos y costo de flete. | Satisfactorio |
| 2 | En el componente Stripe Elements, ingresar número de tarjeta de prueba válida. | El SDK de Stripe valida el formato y fecha de expiración. | Satisfactorio |
| 3 | Confirmar pago. | Stripe procesa el cargo y emite confirmación con `payment_intent` en estado `succeeded`. | Satisfactorio |
| 4 | El webhook del backend recibe la notificación criptográfica de Stripe. | La orden pasa a estado `PAGADA` y el controlador crea la orden de despacho `DSP-YYYYMMDD-XXXX`. | Satisfactorio |
| 5 | Visualizar comprobante digital. | Se presenta al cliente el número de seguimiento de despacho y resumen del pedido. | Satisfactorio |

| **Responsable** | Cliente / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU10: Crear Reserva Online de Prendas con Vencimiento y Bloqueo
**Prueba 1: Creación Exitosa de Reserva Online con Bloqueo Temporal de Stock (Sunny Day)**

| **Caso de uso 10** | **Crear Reserva Online de Prendas con Vencimiento y Bloqueo** |
| :--- | :--- |
| **Descripción** | Permite al cliente reservar prendas online para recogerlas y pagarlas en sucursal física, bloqueando de forma atómica el stock comprometido por un plazo de 48 horas y emitiendo un código QR único. |
| **Precondiciones** | a) Prenda con existencia disponible en la sucursal seleccionada (`available_quantity > 0`).<br>b) Fecha de retiro dentro del plazo legal permitido (máximo 7 días). |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar prenda y talla en la tienda y pulsar **"Reservar para Recojo en Tienda"**. | Se despliega el selector de sucursal física y fecha estimada de recojo. | Satisfactorio |
| 2 | Seleccionar sucursal y fecha de visita dentro de las 48 horas. | Se validan las existencias en tiempo real en la tienda destino. | Satisfactorio |
| 3 | Confirmar la reserva. | Se emite `POST /api/reservations` con el payload de la orden. | Satisfactorio |
| 4 | Evaluar respuesta del servidor. | Código `HTTP 201 Created`. Se genera reserva con código `RES-XXXXXXXX`, estado `ACTIVA` y código QR. | Satisfactorio |
| 5 | Comprobar inventario en PostgreSQL. | `reserved_quantity` se incrementa en +1 y `available_quantity` disminuye en -1 atómicamente. | Satisfactorio |

| **Responsable** | Cliente / Encargado de Tienda |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU11: Registrar Reserva de Prendas Offline en Modo Desconectado
**Prueba 1: Registro Exitoso de Reserva Offline con UUIDv4 Local (Sunny Day)**

| **Caso de uso 11** | **Registrar Reserva de Prendas Offline en Modo Desconectado** |
| :--- | :--- |
| **Descripción** | Permite registrar una reserva física de prendas en sucursal cuando la terminal carece de conexión a Internet, almacenando la orden localmente en IndexedDB/SQLite con un identificador UUIDv4 único y estado de sincronización pendiente. |
| **Precondiciones** | a) Terminal POS en modo desconectado (*Offline*).<br>b) Catálogo local sincronizado previamente.<br>c) Prenda con stock local disponible $> 0$. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar prendas en el catálogo offline de la PWA/Móvil. | Las prendas y variantes de talla se agregan al carrito local con precio vigente. | Satisfactorio |
| 2 | Pulsar botón **"Registrar Reserva en Tienda"**. | Se abre modal de datos de cliente y tiempo de vigencia de la reserva. | Satisfactorio |
| 3 | Ingresar datos del cliente y confirmar operación. | Se genera un UUIDv4 local, se guarda en IndexedDB con estado `PENDIENTE_SYNC` y se descuenta stock local. | Satisfactorio |
| 4 | Consultar la bandeja de reservas locales. | La reserva se lista con indicador naranja *"Pendiente de Sincronización"*. | Satisfactorio |

| **Responsable** | Cajero de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU12: Atender y Resolver Conflictos de Reservas Expiradas
**Prueba 1: Sustitución de Prenda por Venta Previa de la Reserva Original (Rainy Day)**

| **Caso de uso 12** | **Resolución de Conflicto de Reserva Expirada con Prenda Sustituta** |
| :--- | :--- |
| **Descripción** | Cuando la prenda de una reserva vencida fue vendida a otro cliente, el sistema permite ofrecer una alternativa de prenda sustituta utilizando el selector reactivo de tallas. |
| **Precondiciones** | a) Reserva expirada sin disponibilidad de la variante original.<br>b) Existen otras variantes de la misma categoría en inventario. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar la reserva expirada en conflicto. | El sistema alerta: *"Prenda no disponible: el stock fue liquidado"*. | Satisfactorio |
| 2 | Seleccionar resolución: **"Ofrecer Prenda Sustituta"**. | Se despliega el selector visual de variantes con chips reactivos de talla y color. | Satisfactorio |
| 3 | Elegir variante sustituta disponible y justificar el cambio. | El sistema valida la selección, calcula diferencias de precio y reserva la nueva prenda. | Satisfactorio |
| 4 | Guardar resolución del conflicto. | La reserva se cierra con estado `RESUELTA_CON_SUSTITUTO` y trazabilidad en logs. | Satisfactorio |

| **Responsable** | Encargado de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU13: Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4
**Prueba 1: Emisión Exitosa de Venta Offline de Contado con UUIDv4 (Sunny Day)**

| **Caso de uso 13** | **Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4** |
| :--- | :--- |
| **Descripción** | Permite facturar ventas presenciales en caja cuando la tienda sufre un corte de conexión a Internet, registrando el cobro obligatoriamente en efectivo, generando un UUIDv4 y emitiendo el ticket térmico de 80mm. |
| **Precondiciones** | a) PWA operando en modo desconectado.<br>b) Existencias en stock local en IndexedDB.<br>c) Política 5 activa: solo cobros en efectivo en contingencia. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Escanear o seleccionar prendas en el punto de venta POS. | Las líneas de venta se totalizan en la interfaz con desglose de impuestos e importes. | Satisfactorio |
| 2 | Pulsar botón **"Cobrar (Modo Offline)"**. | Se despliega el modal de cobro desconectado. | Satisfactorio |
| 3 | Ingresar monto recibido en efectivo y calcular cambio. | El sistema calcula el cambio exacto y valida que el monto recibido cubra el total. | Satisfactorio |
| 4 | Confirmar la venta. | Se genera un registro con UUIDv4 en IndexedDB, estado `PENDIENTE_SYNC` y se descuenta stock local. | Satisfactorio |
| 5 | Visualizar ticket térmico. | Se despliega el comprobante estilizado para rollo térmico de 80mm con código UUID visible. | Satisfactorio |

| **Responsable** | Cajero de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU14: Gestionar Bandeja Local de Operaciones Pendientes (Outbox PWA / SQLite)
**Prueba 1: Inspección de Métricas de Gaveta y Lista de Ventas en Outbox (Sunny Day)**

| **Caso de uso 14** | **Gestionar Bandeja Local de Operaciones Pendientes (Outbox)** |
| :--- | :--- |
| **Descripción** | Permite al cajero o encargado auditar la bandeja de salida local, revisando el monto total retenido en gaveta por ventas offline, la cantidad de operaciones pendientes y su estado individual. |
| **Precondiciones** | a) Mínimo dos ventas registradas en contingencia desconectada en IndexedDB. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Navegar a la sección **"Bandeja Outbox"** en el menú de Caja POS. | Se carga la vista con tarjetas métricas de cabecera. | Satisfactorio |
| 2 | Verificar tarjeta métrica *"Efectivo en Gaveta Offline"*. | Muestra la sumatoria matemática exacta de las ventas locales en efectivo. | Satisfactorio |
| 3 | Verificar tabla de transacciones locales. | Se listan las ventas con hora local, UUID, cliente, monto total y badge `PENDIENTE`. | Satisfactorio |

| **Responsable** | Encargado de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU15: Sincronizar Lotes de Ventas con Idempotencia Central (`sync_operations`)
**Prueba 1: Detección de Idempotencia ante Reenvío Duplicado de Lote (Rainy Day - Idempotencia)**

| **Caso de uso 15** | **Idempotencia Transaccional: Prevención de Duplicidad de Ventas** |
| :--- | :--- |
| **Descripción** | Comprueba que el backend intercepte reintentos o reenvíos de un mismo lote de ventas mediante la verificación del UUID en `sync_operations`, evitando duplicar ventas o restar stock dos veces. |
| **Precondiciones** | a) Lote de ventas previamente sincronizado y registrado en la tabla `sync_operations`. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Reenviar el mismo payload del lote al endpoint `POST /api/sales/offline/batch-sync`. | El backend ejecuta la consulta selectiva contra la tabla `sync_operations`. | Satisfactorio |
| 2 | El controlador detecta que los UUIDs ya existen con estado `APPLIED`. | No se insertan nuevas filas en la tabla `sales` ni en `sale_items`. | Satisfactorio |
| 3 | Verificar niveles de stock en inventario central. | El stock de las prendas no sufre ningún descuento adicional. | Satisfactorio |
| 4 | Evaluar la respuesta HTTP recibida. | Código `HTTP 200 OK` con indicador `status: "ALREADY_SYNCED"` y confirmación idempotente. | Satisfactorio |

| **Responsable** | QA Tester / Ingeniero Backend |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU16: Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock
**Prueba 1: Resolución mediante Emisión de Nota de Crédito por el 100% (Rainy Day - Nota de Crédito)**

| **Caso de uso 16** | **Resolución de Conflicto mediante Nota de Crédito al Cliente** |
| :--- | :--- |
| **Descripción** | Cuando el cliente no acepta una prenda sustituta ante una sobreventa, el encargado emite una Nota de Crédito digital por el 100% del valor abonado. |
| **Precondiciones** | a) Conflicto de stock activo derivado de venta offline. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar vía de resolución: **"Emitir Nota de Crédito por Quiebre"**. | La interfaz calcula automáticamente el reembolso del 100% (sin retención por culpa de la empresa). | Satisfactorio |
| 2 | Redactar justificación: *"Cliente opta por nota de crédito por no encontrar talla idónea"*. | Se activa el botón de confirmación. | Satisfactorio |
| 3 | Confirmar la emisión. | Se genera la Nota de Crédito en el sistema con código alfanumérico único para futuras compras. | Satisfactorio |

| **Responsable** | Encargado de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU17: Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Estado
**Prueba 1: Cambio Exitoso por Prenda de Mayor Valor con Diferencia Abonada (Sunny Day)**

| **Caso de uso 17** | **Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Estado** |
| :--- | :--- |
| **Descripción** | Permite al cajero procesar el cambio de una prenda previamente adquirida por otra de mayor precio, cotizando la diferencia, cobrando el excedente en efectivo en caja y actualizando el inventario atómicamente (+1 devuelta, -1 entregada). |
| **Precondiciones** | a) Venta previa registrada (código de ticket o UUID offline).<br>b) Prenda devuelta intacta y con etiquetas adheridas (`good_with_tags`).<br>c) Prenda de reemplazo con stock físico disponible en la sucursal. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a **"Caja POS"** $\\rightarrow$ **"Cambio de Prenda"** y buscar el ticket original. | El sistema encuentra la venta y permite seleccionar la prenda a cambiar. | Satisfactorio |
| 2 | Seleccionar la prenda devuelta (ej. Talla M a Bs 50) y elegir la nueva prenda (Talla L a Bs 70). | Se cargan los datos y se calculan los precios unitarios de ambas prendas. | Satisfactorio |
| 3 | Presionar **"Cotizar Cambio"**. | Se computa la diferencia: $\\Delta = \\text{Bs } 70 - \\text{Bs } 50 = \\text{Bs } 20.00$ (Pago requerido). | Satisfactorio |
| 4 | Marcar **"Diferencia Abonada por el Cliente"** y presionar **"Confirmar Cambio"**. | Se consolida la operación con código `EXC-XXXXXXXX`, reingresa +1 a stock y descuenta -1. | Satisfactorio |
| 5 | Presionar **"Imprimir Ticket 80mm"** en el comprobante generado. | Se genera la vista previa física térmica de 80mm lista para entrega al cliente. | Satisfactorio |

| **Responsable** | Cajero de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU18: Procesar Devolución de Prenda con Retención Operativa y Nota de Crédito
**Prueba 1: Devolución Exitosa con Retención del 30% y Emisión de Nota de Crédito (Sunny Day)**

| **Caso de uso 18** | **Procesar Devolución de Prenda con Retención Operativa y Nota de Crédito** |
| :--- | :--- |
| **Descripción** | Permite procesar la devolución de una prenda intacta dentro de los 30 días, aplicando la política de retención operativa configurada para el tenant (ej. 30%), reingresando la prenda al inventario y emitiendo una Nota de Crédito digital por el saldo reembolsable (70%). |
| **Precondiciones** | a) Venta original existente con prenda adquirida a Bs 200.00.<br>b) Tenant con retención configurada al 30% ($R = \\text{Bs } 60$, Reembolso neto = Bs 140).<br>c) Prenda con etiqueta intacta y plazo menor a 30 días. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a **"Caja POS"** $\\rightarrow$ **"Devolución de Prenda"** y buscar la venta original. | El sistema localiza la venta y lista las prendas aptas para devolución. | Satisfactorio |
| 2 | Seleccionar la prenda a devolver y presionar **"Cotizar Devolución"**. | Se calculan los importes: Total Bs 200, Retención 30% (Bs 60), Reembolso Neto (Bs 140). | Satisfactorio |
| 3 | Seleccionar modalidad de liquidación: **"Emitir Nota de Crédito Digital"**. | Se habilita la emisión con numeración formal correlativa. | Satisfactorio |
| 4 | Confirmar la devolución. | Se genera la Nota de Crédito `NC-YYYYMMDD-XXXX`, reingresa +1 a stock y se abre comprobante. | Satisfactorio |

| **Responsable** | Cajero de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU19: Localizar Sucursales y Trazar Rutas (OpenStreetMap / ORS)
**Prueba 1: Trazado de Ruta Multimodal (Conducción vs. A Pie) y Cálculo de ETA (Sunny Day)**

| **Caso de uso 19** | **Trazado de Ruta Multimodal y Estimación de Tiempo de Traslado** |
| :--- | :--- |
| **Descripción** | Comprueba el cálculo y trazado visual de la polilínea de ruta desde la posición actual del cliente hasta la sucursal seleccionada, consumiendo la API de OpenRouteService/OSRM con modos vehicular y peatonal. |
| **Precondiciones** | a) Posición GPS del usuario detectada con precisión.<br>b) Sucursal destino seleccionada con coordenadas válidas. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | En el popup de la sucursal, pulsar botón **"Cómo llegar"** en modo Conducción (*driving-car*). | La aplicación contacta a OpenRouteService y dibuja una polilínea azul siguiendo la red vial. | Satisfactorio |
| 2 | Inspeccionar la tarjeta de navegación inferior. | Muestra la distancia métrica precisa (ej. 3.4 km) y el tiempo estimado de viaje (ETA: 12 min). | Satisfactorio |
| 3 | Cambiar modalidad a **"A pie"** (*foot-walking*). | Se recalcula la ruta por sendas peatonales, actualizando la polilínea y el ETA (ej. 42 min). | Satisfactorio |

| **Responsable** | Desarrollador Móvil / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU20: Generar Reportes Ejecutivos por Voz y Lenguaje Natural (Gemini RAG)
**Prueba 1: Consulta Ejecutiva por Voz y Respuesta RAG con Google Gemini (Sunny Day)**

| **Caso de uso 20** | **Generar Reportes Ejecutivos por Voz y Lenguaje Natural (Gemini RAG)** |
| :--- | :--- |
| **Descripción** | Permite al gerente o administrador dictar preguntas en lenguaje natural por micrófono, procesando el audio, recuperando métricas reales de PostgreSQL e infiriendo un reporte ejecutivo con Google Gemini 2.5 Flash. |
| **Precondiciones** | a) Tenant suscrito al Plan Profesional o Empresarial con `has_ai_access: True`.<br>b) API Key de Google Gemini configurada y activa.<br>c) Permiso de micrófono concedido en el navegador. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Acceder al módulo **"Asistente IA / Reporte por Voz"** en el panel administrativo. | Se inicializa la interfaz del asistente con analizador de audio y visualizador de ondas. | Satisfactorio |
| 2 | Presionar el botón de micrófono y dictar: *"Dame un resumen de las ventas de hoy y las tallas más vendidas"*. | El componente Web Speech / Audio Recorder captura el audio y transcribe el texto fluido. | Satisfactorio |
| 3 | La PWA emite petición `POST /api/ai/voice-report` con la consulta textual. | El backend recupera métricas de la base de datos (contexto RAG) y envía el prompt a Gemini. | Satisfactorio |
| 4 | Evaluar la respuesta devuelta por el sistema. | Código `HTTP 200 OK`. Retorna síntesis ejecutiva estructurada con cifras reales y recomendaciones. | Satisfactorio |
| 5 | Presionar botón **"Escuchar Respuesta"** en la interfaz. | El motor de síntesis de voz (TTS) reproduce el informe con pronunciación clara en español. | Satisfactorio |

| **Responsable** | Administrador de Empresa / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU21: Exportar Reportes Empresariales a Formatos PDF y Excel (ReportLab / openpyxl)
**Prueba 1: Exportación Editorial de Reporte de Ventas a PDF Apaisado con NumberedCanvas (Sunny Day)**

| **Caso de uso 21** | **Exportación Editorial de Reporte de Ventas a PDF Apaisado de Alta Fidelidad** |
| :--- | :--- |
| **Descripción** | Permite generar y descargar un documento PDF formal con orientación horizontal `landscape(letter)`, membrete vectorial de la empresa, tarjetas KPI estilizadas, tabla formateada y paginación dinámica "Página X de Y" mediante ReportLab. |
| **Precondiciones** | a) Ventas registradas en la base de datos.<br>b) Razón social y datos de empresa configurados en el tenant. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | En la pantalla de reportes de ventas, presionar **"Exportar PDF Oficial"**. | Se emite la petición `GET /api/reports/sales/export?format=pdf`. | Satisfactorio |
| 2 | Inspeccionar cabeceras HTTP de la respuesta. | Código `HTTP 200 OK`, `Content-Type: application/pdf`, encabezado binario `%PDF-1.4`. | Satisfactorio |
| 3 | Abrir el documento en el visor PDF integrado. | El documento presenta orientación apaisada, logotipo corporativo, tabla con filas cebradas alternas y pie de página exacto *"Página 1 de 2"* gestionado por `NumberedCanvas`. | Satisfactorio |

| **Responsable** | Administrador de Empresa / Diseñador UI |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU22: Generar Dataset Sintético de Ventas y Estacionalidad Textil (Pipeline ML)
**Prueba 1: Generación Estocástica Vectorial de Dataset Textil con Estacionalidad Boliviana (Sunny Day)**

| **Caso de uso 22** | **Generar Dataset Sintético de Ventas y Estacionalidad Textil** |
| :--- | :--- |
| **Descripción** | Permite al administrador o científico de datos sintetizar un histórico transaccional realista para entrenamiento de modelos de Machine Learning, modelando patrones de estacionalidad comercial boliviana y efectos de quincena y fin de mes. |
| **Precondiciones** | a) Tenant con Plan Profesional o Empresarial (`has_ai_access: True`).<br>b) Configuración de parámetros de generación: 500 registros, rango de fechas y sucursales. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a **"Inteligencia Analítica"** $\\rightarrow$ **"Dataset Sintético ML"**. | Se despliega el panel de control estocástico con deslizadores de volumen y ponderaciones estacionales. | Satisfactorio |
| 2 | Configurar parámetros: 1,000 registros, aplicar curva estacional textil y presionar **"Generar Dataset"**. | Se emite petición `POST /api/ml/synthetic-dataset/generate`. | Satisfactorio |
| 3 | Evaluar la ejecución del pipeline vectorial con NumPy y Pandas. | El servicio sintetiza los registros vectorialmente en $< 600$ ms respetando las proporciones por talla. | Satisfactorio |
| 4 | Comprobar respuesta devuelta. | Código `HTTP 200 OK`. Retorna metadatos: `total_records: 1000`, distribución por prenda y resumen de varianza estacional. | Satisfactorio |

| **Responsable** | Científico de Datos / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU23: Predecir Demanda de Ropa por Talla (ML Supervisado - RandomForestRegressor)
**Prueba 1: Inferencia de Demanda a N Semanas por Talla y Alertas de Quiebre de Stock (Sunny Day)**

| **Caso de uso 23** | **Inferencia de Demanda Proyectada y Alerta Temprana de Quiebre** |
| :--- | :--- |
| **Descripción** | Valida la proyección de ventas futuras para un horizonte de 4 semanas desagregado por talla (S, M, L, XL), contrastando la demanda esperada contra el inventario actual para emitir recomendaciones de reabastecimiento. |
| **Precondiciones** | a) Modelo supervisado entrenado y activo.<br>b) Inventario actual registrado en las sucursales. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar horizonte de predicción de 4 semanas y presionar **"Calcular Inferencia"**. | La aplicación consulta el endpoint `GET /api/ml/demand-forecast/predict?weeks=4`. | Satisfactorio |
| 2 | Verificar visualización en gráfica de proyección por talla. | Se grafican barras agrupadas con la demanda esperada: Talla S (45 u), M (82 u), L (74 u), XL (28 u). | Satisfactorio |
| 3 | Evaluar sección de alertas tempranas. | Si para Talla M el stock actual es 20 y la demanda proyectada es 82, el sistema resalta en rojo: *"Riesgo inminente de rotura de stock en Talla M: reabastecer 62 unidades"*. | Satisfactorio |

| **Responsable** | Gerente de Compras / Administrador |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU24: Segmentar Clientes con K-Means (ML No Supervisado - RFM + Retorno)
**Prueba 1: Entrenamiento de Clustering K-Means y Clasificación de Perfiles (Sunny Day)**

| **Caso de uso 24** | **Segmentar Clientes con K-Means (ML No Supervisado - RFM + Retorno)** |
| :--- | :--- |
| **Descripción** | Permite agrupar a la base de clientes en clústeres conductuales homogéneos aplicando el algoritmo no supervisado K-Means sobre las dimensiones de Recencia, Frecuencia, Valor Monetario y Tasa de Devolución (RFM+D). |
| **Precondiciones** | a) Base de clientes con transacciones registradas en el tenant.<br>b) Modelo configurado con $k=4$ clústeres conductuales. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a **"Segmentación de Clientes (K-Means)"** en el panel analítico. | Se despliega la pantalla con configuración de clústeres ($k=4$: Campeones, Leales, En Riesgo, Ocasionales). | Satisfactorio |
| 2 | Presionar el botón **"Ejecutar Segmentación"**. | Se emite la petición `POST /api/ml/customer-segmentation/train`. | Satisfactorio |
| 3 | Evaluar la respuesta del algoritmo K-Means. | Código `HTTP 200 OK`. Retorna centroides estandarizados, inercia del modelo y asignación de clúster para cada cliente. | Satisfactorio |
| 4 | Verificar persistencia de etiquetas en base de datos. | La tabla `customer_segments` actualiza el segmento asignado y la fecha de cálculo. | Satisfactorio |

| **Responsable** | Científico de Datos / Encargado de Marketing |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

### CU25: Visualizar Dashboard Ejecutivo con KPIs y Métricas ML
**Prueba 1: Integración de Métricas Offline, Políticas y Machine Learning (Sunny Day)**

| **Caso de uso 25** | **Conciliación de Métricas Offline, Políticas P-Ten y Módulos ML** |
| :--- | :--- |
| **Descripción** | Comprueba que el Dashboard Ejecutivo integre con exactitud matemática las métricas operativas de contingencia offline (`offline_sync`), ingresos retenidos por políticas de devolución/cambio (`policy_revenue`) y proyecciones de Machine Learning. |
| **Precondiciones** | a) Empresa con Plan Profesional activo.<br>b) Existencia de ventas offline sincronizadas, cambios con diferencia y modelos ML entrenados. |

| **Paso** | **Acción** | **Resultado esperado** | **Estado (Satisfactorio/Fallido)** |
| :---: | :--- | :--- | :---: |
| 1 | Iniciar sesión y acceder al Dashboard Ejecutivo (`GET /api/dashboard?period=day`). | Se cargan las tarjetas gerenciales principales en pantalla. | Satisfactorio |
| 2 | Inspeccionar la sección *"Operaciones en Contingencia"* del Dashboard. | Muestra la tasa de sincronización de lotes (ej. 98.5%) y monto total transaccionado offline. | Satisfactorio |
| 3 | Inspeccionar la sección *"Ingresos por Políticas de Tienda"*. | Concilia los montos retenidos por devoluciones (20%-50%) y los cobros de diferencias en cambios de talla. | Satisfactorio |
| 4 | Inspeccionar la sección *"Inteligencia Predictiva ML"*. | Muestra `has_ml_access: True`, unidades proyectadas para el mes y distribución porcentual de los clústeres K-Means. | Satisfactorio |

| **Responsable** | Gerente General / Administrador |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |
