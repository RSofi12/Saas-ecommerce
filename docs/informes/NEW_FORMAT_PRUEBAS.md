# CAPÍTULO V. PRUEBAS Y RESULTADOS
### FashionStore — Plataforma E-Commerce SaaS Multitenant
**Materia:** Sistemas de Información 2 — S2-2026  
**Docente:** MSc. Ing. Angélica Garzón Cuéllar  
**Enfoque Metodológico:** Pruebas Dirigidas por Casos de Uso (*Use Case-Driven Testing* — ICONIX Process)  
**Alcance Técnico:** Casos de Uso Oficiales de 1ra, 2da y 3ra Presentación (`CU01` al `CU25`)

---

## 5.1. Plan de pruebas

### 5.1.1. Enfoque Metodológico
El aseguramiento de la calidad de **FashionStore** adopta el enfoque formal de **Pruebas Dirigidas por Casos de Uso (*Use Case-Driven Testing*)** inherente a la metodología **ICONIX (UML 2.5+)**. Bajo esta disciplina de ingeniería de software, las pruebas no son concebidas de manera aislada al final del desarrollo, sino que derivan de forma determinista y trazable a partir de:
1. **Las Fichas Descriptivas de Caso de Uso:** Extracción directa del Flujo Básico (escenarios de éxito) y los Flujos Alternativos (escenarios de excepción y contingencia).
2. **Los Diagramas de Robustez (BCE):** Cada bifurcación condicional, validación de frontera (`Boundary`) o regla de negocio gobernada por un objeto **Controlador** (`Controller`) da origen a un caso de prueba formal. Los bucles de repetición y las validaciones parten estrictamente del Controlador hacia las Entidades o Fronteras.
3. **Los Diagramas de Secuencia y Clases:** Verificación de las invocaciones a métodos, signaturas de funciones y persistencia en entidades relacionales (`Entity`).
4. **Las Políticas de Negocio Inviolables (P-Ten-01 a P-Ten-05):** Cumplimiento matemático de cuotas de suscripción SaaS, cobro obligatorio de diferencia por talla ($\\Delta > 0$), retención operativa en devoluciones (20%-50%), despacho condicionado a pago confirmado con Stripe y exclusividad de cobro en efectivo al operar en contingencia offline.

### 5.1.2. Objetivo
Validar de forma exhaustiva la exactitud funcional, integridad transaccional, seguridad multitenant y rendimiento operativo de los 25 Casos de Uso que componen los tres hitos de evaluación académica (`CU01` al `CU25`), comprobando prioritariamente:
- **Hito 1 (CU01 a CU10):** Registro de empresas (*tenants*), gobernanza de suscripciones SaaS, control estricto de cuotas de sucursales, autenticación JWT con claims de empresa, catálogo multimoneda y facetado con diferenciación de precios por talla, descarga local de catálogo a IndexedDB/SQLite, compra virtual con pasarela Stripe y reserva online con bloqueo temporal de stock.
- **Hito 2 (CU11 a CU18):** Operación en contingencia desconectada (*offline-first*), idempotencia centralizada ante reconexiones inestables (`sync_operations`), gestión y resolución reactiva de sobreventas/quiebres de stock, y ejecución estricta de políticas de cambio por talla y devolución con retención del 20% al 50%.
- **Hito 3 (CU19 a CU25):** Geolocalización móvil con OpenStreetMap y ruteo multimodal con OpenRouteService, asistencia gerencial por voz y lenguaje natural con Google Gemini 2.5 Flash RAG, exportación documental ejecutiva a PDF (ReportLab) y Excel (openpyxl con fórmulas vivas), pipeline completo de Machine Learning (dataset sintético estocástico, demanda predictiva supervisada *RandomForest* y segmentación no supervisada *K-Means RFM+D*) y Dashboard Ejecutivo unificado.

### 5.1.3. Alcance del Plan
El plan cubre todas las capas arquitectónicas del ecosistema tecnológico:
* **Capa Backend (FastAPI + SQLAlchemy + PostgreSQL 15):** 7 paquetes de dominio (`p0` a `p6`), forzado del aislamiento multitenant mediante inyección de dependencias `tenant_id`, transacciones ACID con bloqueos pesimistas `with_for_update()`.
* **Capa Web Frontend (Angular 21 PWA):** Componentes reactivos, Service Worker con estrategia Cache-First / Network-First, base de datos local IndexedDB y diseño modular con TailwindCSS y Spartan UI.
* **Capa Móvil (Flutter / Dart):** Base de datos relacional local SQLite (`sqflite`), renderizado de mapas vectoriales WGS84, sensor de cámara y geolocalización GPS.
* **Integraciones Externas:** Pasarela Stripe (tarjetas y webhooks criptográficos), OpenRouteService (GeoJSON de ruteo vehicular/peatonal) y Google Gemini API (RAG contextualizado con PostgreSQL).
* **Pipeline de Machine Learning:** Algoritmos de Scikit-Learn (`RandomForestRegressor`, `KMeans`, `StandardScaler`) y síntesis de series temporales textiles con NumPy y Pandas.

### 5.1.4. Herramientas de Prueba
| Herramienta | Tipo | Propósito en el Proyecto |
| :--- | :--- | :--- |
| **Pytest** | Automatizada Backend | Ejecución de pruebas unitarias, transaccionales, de endpoints REST y de aislamiento multitenant en FastAPI. |
| **Postman / Newman** | Pruebas de API | Verificación de contratos JSON Schemas, inyección de tokens JWT Bearer, simulación de idempotencia y webhooks. |
| **DevTools (Chrome/Edge)** | Emulación de Red | Simulación de desconexión forzada (*Offline Mode*), auditoría de Service Workers e inspección de almacenes IndexedDB. |
| **Emulador Android / Flutter Driver** | Pruebas Móviles | Comprobación de persistencia en SQLite (`sqflite`), simulación de coordenadas GPS y renderizado en OpenStreetMap. |
| **Stripe CLI / Mock Sandbox** | Pasarela de Pagos | Emulación de cobros exitosos (`succeeded`), pagos pendientes y fallidos, y disparo de webhooks de prueba. |
| **Scikit-Learn Evaluator** | Métricas ML | Validación de métricas de precisión ($R^2 \ge 0.80$, MAE, RMSE) y coeficientes de Silhouette para clustering. |

---

## 5.2. Pruebas funcionales

### 5.2.1. Técnica Aplicada
Se aplica la técnica formal de **Pruebas de Caja Negra (*Black-Box Testing*)** basada en la especificación funcional, contratos de interfaz y partición de equivalencia (*Equivalence Partitioning*) junto con análisis de valores límite (*Boundary Value Analysis*). El sistema es evaluado estrictamente desde sus fronteras visibles (endpoints HTTP de API REST, vistas web PWA y pantallas móviles de Flutter) sin asumir premisas internas que no formen parte del contrato de diseño.

### 5.2.2. Estructura de Evaluación (ICONIX)
Para cada uno de los 25 Casos de Uso se evalúan de forma canónica las siguientes vertientes:
1. **Prueba de Camino Feliz (*Sunny Day*):** Flujo normal de éxito donde las precondiciones se satisfacen, la Frontera recibe entradas válidas, el Controlador coordina con las Entidades de dominio, se asienta la persistencia en base de datos y se cumple la Postcondición en la Frontera.
2. **Prueba de Caminos Alternativos y Excepciones (*Rainy Day*):** Escenarios de error inducido, validación de fronteras, entradas malformadas o contingencias de negocio, donde el Controlador intercepta la anomalía, aborta la transacción, preserva intacto el modelo de datos y emite una alerta determinista al usuario.
3. **Prueba de Gobernanza / Políticas / Resiliencia (*Edge Cases*):** Aislamiento multitenant riguroso entre empresas competidoras, verificación de cuotas por suscripción SaaS (Plan Básico vs. Profesional) e idempotencia transaccional.

### 5.2.3. Cobertura Funcional
Abarca el 100% de los 7 paquetes de dominio de la plataforma:
- **`p0_saas_plataforma`:** CU01 (Empresas/Tenants) y CU02 (Planes y Cuotas).
- **`p1_gestion_usuarios_acceso`:** CU03 (Autenticación JWT Multitenant) y CU04 (Sucursales con Cuotas).
- **`p2_gestion_productos_catalogo`:** CU05 (Prendas y Precios por Talla) y CU06 (Catálogo Online Facetado).
- **`p3_gestion_inventario_disponibilidad`:** CU07 (Sincronización a IndexedDB/SQLite) y CU08 (Catálogo Offline).
- **`p4_gestion_compras_reservas`:** CU09 (Compras con Stripe), CU10 (Reservas Online con Sweeper), CU11 (Reservas Offline) y CU12 (Conflictos de Reservas Expiradas).
- **`p5_gestion_ventas_pos`:** CU13 (Ventas POS Offline), CU14 (Outbox Local), CU15 (Sincronización con Idempotencia), CU16 (Conflictos de Quiebre de Stock), CU17 (Cambios por Talla) y CU18 (Devoluciones con Retención).
- **`p6_inteligencia_analitica`:** CU19 (Geolocalización OSM/ORS), CU20 (Gemini RAG con Voz), CU21 (Reportes PDF/Excel), CU22 (Dataset Sintético ML), CU23 (Demanda Predictiva RF), CU24 (Segmentación K-Means) y CU25 (Dashboard Ejecutivo).

---

## 5.3. Pruebas de integración

Las pruebas de integración verifican la interacción armónica, integridad de contratos y resiliencia entre dos o más subsistemas desacoplados:
1. **Frontend PWA / Móvil Flutter $\\leftrightarrow$ Backend FastAPI:** Validación del flujo de autorización HTTP con inyección de cabeceras `Bearer <JWT>`, verificación de expiración de sesiones y consistencia de esquemas Pydantic / TypeScript.
2. **PWA / Móvil $\\leftrightarrow$ IndexedDB / SQLite Local:** Validación del ciclo de serialización, lectura instantánea desconectada y almacenamiento transaccional local.
3. **Bandeja Outbox Local $\\leftrightarrow$ Endpoint Central de Sincronización (`/api/sales/offline/batch-sync`):** Inyección de lotes transaccionales con validación previa de duplicidad en la tabla `sync_operations` para garantizar idempotencia.
4. **Pasarela Stripe $\\leftrightarrow$ Módulo de Compras (CU09):** Flujo asíncrono donde la orden pasa a `PAGADA` y genera orden de despacho `DSP-YYYYMMDD-XXXX` únicamente tras recibir el webhook criptográfico `payment_intent.succeeded`.
5. **Sweeper Worker $\\leftrightarrow$ Inventario Central (CU10):** Tarea asíncrona periódica de barrido de reservas caducadas ($expires\_at \le now()$), liberando automáticamente las existencias comprometidas.
6. **Módulo Cartográfico $\\leftrightarrow$ OpenRouteService API (CU19):** Llamadas REST de geocodificación inversa y ruteo sobre OpenStreetMap con trazado de polilíneas y cálculo de distancias métricas y tiempos de traslado estimados (ETA).
7. **Motor de Voz y RAG $\\leftrightarrow$ Google Gemini 2.5 Flash (CU20):** Captura de audio, consulta de métricas reales en PostgreSQL, inyección en el prompt (*grounding*) y generación de respuesta en lenguaje natural estructurado en menos de 2.5 segundos.
8. **Generadores Documentales $\\leftrightarrow$ ReportLab / openpyxl (CU21):** Generación de documentos PDF editorialmente tipografiados con `NumberedCanvas` ("Página X de Y") y libros de cálculo Excel XLSX con formato moneda y fórmulas `=SUM(...)`.
9. **Pipeline de Modelos ML $\\leftrightarrow$ PostgreSQL Analytics (CU22 a CU25):** Extracción de transacciones textiles, ajuste estacional con `RandomForestRegressor`, segmentación no supervisada `KMeans` y persistencia de métricas consumidas en tiempo real por el Dashboard Ejecutivo.

---

## 5.4. Corrección de errores

Durante el desarrollo integral del sistema, se aplicó un ciclo metódico de detección, análisis de causa raíz y remediación definitiva. A continuación se detallan los incidentes críticos resueltos a lo largo de las presentaciones:

| Incidente Crítico | Causa Raíz Identificada | Remediación Arquitectónica Aplicada |
| :--- | :--- | :--- |
| **Incidente 1: Sincronización duplicada ante reconexión inestable (CU15)** | Ante pérdidas intermitentes de señal, una terminal reintentaba el envío del mismo lote antes de procesar el ACK, provocando duplicidad de ventas. | Se implementó el control transaccional estricto con consulta previa de `operation_uuid` contra la tabla `sync_operations`. Si el registro ya existe, el backend confirma de inmediato sin duplicar asientos contables ni inventario. |
| **Incidente 2: Fuga de contexto multitenant en consultas analíticas (CU21/CU25)** | Consultas SQL de agregación omitían el filtro de empresa en subconsultas complejas de agrupamiento. | Se forzó la inyección de dependencias `get_current_tenant` en FastAPI, asegurando que toda consulta incorpore obligatoriamente la cláusula `WHERE tenant_id = :tenant_id` en todas sus subconsultas. |
| **Incidente 3: Omisión de cobro de diferencia en cambio de prendas por talla (CU17)** | El POS permitía consolidar el cambio de una prenda de menor valor por otra más costosa sin validar que el cliente hubiese abonado la diferencia. | Se programó una guarda transaccional en el controlador backend: si $\\Delta > 0$ y `difference_paid == False`, la operación se rechaza con código `HTTP 400 Bad Request`. En frontend, el botón de confirmación se bloquea reactivamente. |
| **Incidente 4: Error en total de páginas en reportes PDF extensos (CU21)** | El generador PDF de ReportLab calculaba el total de páginas de forma estática en la primera pasada, arrojando numeración errónea ("Página 1 de 0"). | Se implementó la clase `NumberedCanvas` de dos pasadas, la cual intercepta el evento de cierre de página y computa matemáticamente el número total de hojas antes de renderizar el pie de página ("Página X de Y"). |
| **Incidente 5: Fallo del Dashboard Ejecutivo en empresas con Plan Básico (CU25)** | El dashboard consultaba de forma obligatoria las tablas de Machine Learning (`demand_forecasts`), provocando errores de denegación de privilegios para suscriptores básicos. | Se instauró un mecanismo de degradación grácil: el backend evalúa el claim `has_ai_access`; si es falso, retorna `has_ml_access: False` y devuelve las métricas financieras estándar sin interrupción ni error 500. |
| **Incidente 6: Desbloqueo indebido de stock en reservas canceladas manualmente (CU10)** | Al cancelar una reserva expirada, se restaba stock disponible general en lugar de liberar el stock comprometido. | Se corrigió la lógica en `reservation_service.py`: la cancelación resta la cantidad de `reserved_quantity` sin decrementar `available_quantity`, restaurando el balance físico exacto. |

---

## 5.5. Resultados de las pruebas (Hitos: 1ra, 2da y 3ra Presentación)

La ejecución rigurosa del plan de pruebas sobre los 25 Casos de Uso oficiales de la plataforma FashionStore arrojó una efectividad del 100% en los entornos de homologación:

### 1. Métricas Cuantitativas de Ejecución
* **Casos de Uso Evaluados:** 25 de 25 Casos de Uso oficiales (`CU01` al `CU25`) $\\rightarrow$ **100% de cobertura del proyecto**.
* **Total de Casos de Prueba Formalizados y Ejecutados:** **72 casos de prueba de caja negra**.
  - **Hito 1ra Presentación (`CU01` al `CU10`):** 27 casos de prueba (15 Sunny Day, 9 Rainy Day / Gobernanza, 3 Resiliencia).
  - **Hito 2da Presentación (`CU11` al `CU18`):** 24 casos de prueba (10 Sunny Day, 10 Rainy Day / Políticas, 4 Resiliencia e Idempotencia).
  - **Hito 3ra Presentación (`CU19` al `CU25`):** 21 casos de prueba (11 Sunny Day, 7 Rainy Day / Gobernanza SaaS, 3 Resiliencia y Degradación Grácil).
* **Casos de Prueba Aprobados:** **72 / 72 (100% de éxito operativo)**.
* **Casos de Prueba Fallidos / Bloqueantes:** **0**.

### 2. Validación de Requisitos No Funcionales Críticos
* **Aislamiento Multitenant (RNF-02):** Se crearon y operaron concurrentemente múltiples empresas de prueba (`Boutique Elegance`, `Moda Urbana SRL`). Se verificó que los tokens JWT de un tenant son absolutamente rechazados al consultar sucursales, prendas, pedidos, reportes o modelos analíticos de otra empresa.
* **Control de Cuotas de Suscripción (RNF-01 / CU02, CU04):** El backend bloqueó de forma determinista la creación de una cuarta sucursal en tenants de Plan Básico (límite: 3), respondiendo con código `HTTP 403 Forbidden` y mensaje descriptivo de cuota colmada.
* **Idempotencia Transaccional (RNF-04 / CU15):** El reenvío simulado de lotes ya sincronizados fue interceptado al 100% por la tabla `sync_operations`, con cero duplicidad de ventas contables ni mermas duplicadas en inventario.
* **Persistencia Offline Local (RNF-03 / CU07, CU08, CU13, CU14):** Tras forzar desconexión física de red y reiniciar el navegador y app móvil, la totalidad del catálogo y las ventas locales encoladas permanecieron intactas y operativas en IndexedDB y SQLite.
* **Gobernanza de Módulos de Inteligencia (RNF-01 / CU20, CU22, CU23, CU24, CU25):** Las peticiones a modelos de IA Generativa y Machine Learning por parte de suscriptores básicos fueron bloqueadas limpiamente con HTTP 403 o respondidas con degradación grácil.
* **Rendimiento de Consultas y Reportes (RNF-09 / CU06, CU21):** Las búsquedas facetadas arrojaron tiempos de respuesta promedio de 72 ms, la exportación de hojas de cálculo Excel tomó 210 ms y la emisión de reportes PDF de alta fidelidad se completó en 340 ms.

---
## 5.6. Casos de prueba detallados (1ra Presentación: CU01 al CU10)

### CU01: Registrar y Gestionar Empresas (Tenants)

#### Prueba 1: Creación Exitosa de Empresa Tenant con Aislamiento Inicial (Sunny Day)

| Caso de uso 01 | Registrar y Gestionar Empresas (Tenants) |
| :--- | :--- |
| **Descripción** | Permite al Superadministrador de la plataforma dar de alta a una nueva empresa suscriptora (tenant), validando la unicidad del subdominio y NIT, asignando un identificador UUIDv4 único y preparando el aislamiento de datos. |
| **Precondiciones** | a) Superadministrador autenticado con token JWT de plataforma global.<br>b) Subdominio y NIT sin registro previo en la base de datos central. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Acceder al panel de **"Gestión SaaS"** $\\rightarrow$ **"Empresas"** y presionar **"Nueva Empresa"**. | Se despliega el formulario modal de registro de empresa tenant. | Satisfactorio |
| 2 | Ingresar datos: Nombre Comercial: *"Boutique Elegance"*, Razón Social: *"Elegance SRL"*, Subdominio: *"elegance"*, NIT: *"1029384756"*. | La interfaz valida reactivamente la estructura del subdominio (solo minúsculas y guiones). | Satisfactorio |
| 3 | Presionar botón **"Registrar Empresa"**. | Se emite petición `POST /api/saas/companies` con el payload de datos. | Satisfactorio |
| 4 | Evaluar la respuesta del backend. | Código `HTTP 201 Created`. Se genera UUIDv4, estado `ACTIVO` y metadatos de auditoría. | Satisfactorio |
| 5 | Verificar la lista general de empresas. | *"Boutique Elegance"* figura en la tabla con su badge verde de estado activo. | Satisfactorio |

| Responsable | Superadministrador de Plataforma |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Rechazo por Subdominio o NIT Duplicado (Rainy Day - Unicidad)

| Caso de uso 01 | Restricción de Unicidad Comercial: Subdominio o NIT Duplicado |
| :--- | :--- |
| **Descripción** | Comprueba que el sistema intercepte y rechace el intento de registrar una empresa con un subdominio o NIT que ya pertenezca a otra entidad registrada. |
| **Precondiciones** | a) Existe previamente una empresa con `subdomain: "elegance"` y `nit_rut: "1029384756"`. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Completar el formulario de alta ingresando el subdominio existente *"elegance"*. | El frontend detecta la colisión o el usuario procede a enviar el formulario. | Satisfactorio |
| 2 | Enviar solicitud de creación al endpoint `POST /api/saas/companies`. | El backend ejecuta la verificación de unicidad en la tabla `companies`. | Satisfactorio |
| 3 | Evaluar la respuesta devuelta por el servidor. | Código `HTTP 409 Conflict` (o `400 Bad Request`) con mensaje: *"El subdominio ya está registrado"*. | Satisfactorio |
| 4 | Comprobar el estado de la base de datos. | Ningún registro duplicado o huérfano es insertado en la base de datos. | Satisfactorio |

| Responsable | QA Tester / Ingeniero Backend |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Consulta Paginada y Auditoría de Empresas Registradas (Sunny Day)

| Caso de uso 01 | Exploración Paginada y Auditoría de Empresas en Plataforma |
| :--- | :--- |
| **Descripción** | Permite consultar de forma paginada la lista general de tenants registrados, auditando su plan activo, fecha de expiración y sucursales habilitadas. |
| **Precondiciones** | a) Múltiples empresas registradas en la plataforma SaaS. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Navegar a la tabla de **"Empresas Tenants"** en el portal global. | Se emite `GET /api/saas/companies?page=1&limit=10`. | Satisfactorio |
| 2 | Inspeccionar la respuesta de datos devuelta. | Código `HTTP 200 OK`. Retorna metadatos: `total`, `page`, `limit` y array de empresas. | Satisfactorio |
| 3 | Validar la información de cada fila. | Muestra Razón Social, subdominio, plan de suscripción actual y fecha de alta formal. | Satisfactorio |

| Responsable | Superadministrador de Plataforma |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU02: Gestionar Planes de Suscripción (Básico, Pro, Empresarial) y Cuotas

#### Prueba 1: Asignación Inicial de Plan Profesional con Cuota de 10 Sucursales (Sunny Day)

| Caso de uso 02 | Asignación Inicial de Plan de Suscripción a Tenant |
| :--- | :--- |
| **Descripción** | Permite vincular a un tenant recién creado un plan de suscripción comercial (Plan Profesional), configurando la cuota máxima permitida de 10 sucursales y habilitando el acceso a módulos de IA. |
| **Precondiciones** | a) Empresa registrada sin suscripción activa vinculada.<br>b) Catálogo de planes precargado en la base de datos central. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar la empresa en el panel y pulsar **"Asignar Plan"**. | Se despliega el selector de planes comerciales: Básico, Profesional y Empresarial. | Satisfactorio |
| 2 | Elegir **"Plan Profesional"** (Límite: 10 sucursales, IA: Habilitada) y confirmar. | Se emite `POST /api/saas/subscriptions` con `company_id` y `plan_id`. | Satisfactorio |
| 3 | Evaluar la respuesta del servidor. | Código `HTTP 201 Created`. Suscripción con estado `ACTIVA`, cuota fijada a 10 e `is_active: True`. | Satisfactorio |
| 4 | Consultar la cuota de la empresa mediante `GET /api/branches/quota`. | Retorna `max_branches: 10`, `current_branches: 0`, `has_ai_access: True`. | Satisfactorio |

| Responsable | Superadministrador de Plataforma |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Bloqueo de Downgrade que Exceda la Cuota Activa - Downgrade Guard (Rainy Day - Política SaaS)

| Caso de uso 02 | Cumplimiento de Regla Downgrade Guard: Bloqueo de Descenso de Plan |
| :--- | :--- |
| **Descripción** | Valida que el sistema impida a una empresa descender a un plan de menor categoría (Plan Básico, límite: 3 sucursales) si actualmente posee un número de sucursales activas superior a dicho límite (ej. 5 sucursales). |
| **Precondiciones** | a) Empresa con Plan Profesional que cuenta con 5 sucursales activas en PostgreSQL. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | En la gestión de suscripciones de la empresa, seleccionar **"Cambiar a Plan Básico"**. | La interfaz advierte que el plan tiene un límite estricto de 3 sucursales. | Satisfactorio |
| 2 | Intentar forzar el cambio enviando `POST /api/saas/subscriptions/change-plan`. | El controlador backend audita el conteo de sucursales activas (`active_count = 5`). | Satisfactorio |
| 3 | Evaluar la respuesta emitida por el backend. | Código `HTTP 400 Bad Request` con mensaje: *"No puede descender al plan Básico: tiene 5 sucursales activas (límite: 3)"*. | Satisfactorio |
| 4 | Verificar el estado de la suscripción. | La empresa permanece en Plan Profesional con sus 5 sucursales 100% operativas. | Satisfactorio |

| Responsable | QA Tester / Ingeniero Backend |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Ascenso Exitoso de Plan (Upgrade) con Ampliación Inmediata de Cuotas (Sunny Day)

| Caso de uso 02 | Upgrade Exitoso de Plan con Liberación Inmediata de Recursos |
| :--- | :--- |
| **Descripción** | Permite a una empresa en Plan Básico con 3 sucursales ascender a Plan Profesional, liberando de inmediato el cupo hasta 10 sucursales y activando el acceso a módulos de IA sin requerir reinicio del servidor. |
| **Precondiciones** | a) Empresa en Plan Básico con cuota copada (3/3 sucursales ocupadas). |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Solicitar ascenso comercial a **"Plan Profesional"**. | Se emite la petición `POST /api/saas/subscriptions/upgrade`. | Satisfactorio |
| 2 | Evaluar la respuesta del servidor. | Código `HTTP 200 OK`. Plan actualizado a Profesional y vigencia renovada. | Satisfactorio |
| 3 | Verificar el endpoint de cuotas `/api/branches/quota`. | La cuota se actualiza inmediatamente a `3/10` y `has_ai_access` pasa a `True`. | Satisfactorio |

| Responsable | Superadministrador de Plataforma |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU03: Iniciar Sesión Multitenant con JWT y Claims de Tenant

#### Prueba 1: Autenticación Exitosa con Emisión de Token JWT Multitenant (Sunny Day)

| Caso de uso 03 | Iniciar Sesión Multitenant con JWT y Claims de Tenant |
| :--- | :--- |
| **Descripción** | Permite a un usuario autenticarse en el sistema con su correo y contraseña, recibiendo un token JWT que encapsula de forma criptográfica la identidad del usuario, su rol, el `tenant_id` y su `branch_id` asignado. |
| **Precondiciones** | a) Usuario registrado y activo (`is_active: True`) perteneciente a una empresa y sucursal. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a la pantalla de Login e ingresar credenciales válidas. | Se capturan los datos de inicio de sesión. | Satisfactorio |
| 2 | Presionar el botón **"Iniciar Sesión"**. | El cliente emite `POST /api/auth/login` con email y contraseña. | Satisfactorio |
| 3 | Evaluar la respuesta del backend. | Código `HTTP 200 OK`. Retorna `access_token` JWT firmado con algoritmo HMAC-SHA256. | Satisfactorio |
| 4 | Decodificar y verificar el payload del token JWT. | Contiene claims obligatorios: `sub` (User UUID), `rol`, `tenant_id` (Company UUID) y `branch_id`. | Satisfactorio |
| 5 | Comprobar redirección en el frontend. | El usuario es redirigido a su panel de trabajo según su rol (Cajero, Encargado, Administrador). | Satisfactorio |

| Responsable | Usuario del Sistema / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Rechazo Determinista ante Credenciales Inválidas (Rainy Day - Seguridad)

| Caso de uso 03 | Denegación de Acceso ante Credenciales Erróneas |
| :--- | :--- |
| **Descripción** | Valida que el sistema rechace el acceso y no genere ningún token de autenticación cuando la contraseña o correo no coincidan con los registros en base de datos. |
| **Precondiciones** | a) Usuario registrado con contraseña legítima en el sistema. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Ingresar correo registrado pero ingresar contraseña errónea. | Se envían credenciales al endpoint de autenticación. | Satisfactorio |
| 2 | Presionar **"Iniciar Sesión"**. | Se emite `POST /api/auth/login`. | Satisfactorio |
| 3 | Evaluar la respuesta del servidor. | Código `HTTP 401 Unauthorized` con mensaje: *"Credenciales de acceso inválidas"*. | Satisfactorio |
| 4 | Comprobar el almacenamiento local del cliente. | Ningún token es almacenado en localStorage, sessionStorage ni cookies. | Satisfactorio |

| Responsable | QA Tester / Ingeniero de Seguridad |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Bloqueo de Acceso a Usuario Desactivado (Rainy Day - Auditoría)

| Caso de uso 03 | Bloqueo de Acceso a Cuentas Desactivadas en la Empresa |
| :--- | :--- |
| **Descripción** | Comprueba que si un usuario fue dado de baja administrativamente (`is_active = False`), el sistema impida el inicio de sesión incluso si suministra la contraseña correcta. |
| **Precondiciones** | a) Usuario con estado `is_active = False` en PostgreSQL. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Ingresar credenciales correctas de la cuenta desactivada. | Se emite petición de login al backend. | Satisfactorio |
| 2 | Evaluar la respuesta del backend. | Código `HTTP 403 Forbidden` (o `401 Unauthorized`) con mensaje: *"Usuario desactivado o inactivo"*. | Satisfactorio |
| 3 | Confirmar denegación de acceso. | El sistema impide el ingreso y no emite ningún token de acceso. | Satisfactorio |

| Responsable | Administrador de Empresa / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU04: Gestionar Sucursales Bajo Límites del Plan

#### Prueba 1: Creación Exitosa de Sucursal dentro de la Cuota Contratada (Sunny Day)

| Caso de uso 04 | Gestionar Sucursales Bajo Límites del Plan |
| :--- | :--- |
| **Descripción** | Permite al Administrador de una empresa registrar una nueva sucursal física con sus datos de geolocalización, siempre que el número total de sucursales activas no exceda el límite del plan. |
| **Precondiciones** | a) Empresa en Plan Básico con 1 sucursal activa (límite contratado: 3 sucursales).<br>b) Token de Administrador con `tenant_id` válido. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a **"Configuración"** $\\rightarrow$ **"Sucursales"** y pulsar **"Agregar Sucursal"**. | Se abre el formulario de registro de sucursal. | Satisfactorio |
| 2 | Completar datos: Nombre: *"Sucursal Norte"*, Ciudad: *"Santa Cruz"*, Latitud: `-17.7833`, Longitud: `-63.1821`. | Se validan coordenadas y obligatoriedad de campos. | Satisfactorio |
| 3 | Presionar botón **"Guardar Sucursal"**. | Se emite `POST /api/branches` con el payload de datos. | Satisfactorio |
| 4 | Evaluar la respuesta del backend. | Código `HTTP 201 Created`. Sucursal creada con `is_active: True` vinculada al `tenant_id`. | Satisfactorio |
| 5 | Consultar `/api/branches/quota`. | La cuota consumida se incrementa de 1 a 2 ocupadas sobre el límite de 3. | Satisfactorio |

| Responsable | Administrador de Empresa |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Bloqueo Estricto al Alcanzar el Límite Comercial del Plan (Rainy Day - Política 4)

| Caso de uso 04 | Cumplimiento de Política P-Ten-04: Bloqueo de Límite de Sucursales |
| :--- | :--- |
| **Descripción** | Valida que el sistema rechace de manera determinante la creación de una sucursal adicional si la empresa ya alcanzó el límite máximo de sucursales activas de su plan de suscripción. |
| **Precondiciones** | a) Empresa en Plan Básico con 3 sucursales activas registradas (cuota colmada: 3/3). |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Intentar registrar una 4ta sucursal en el panel administrativo. | El frontend advierte: *"Ha alcanzado el límite de 3 sucursales de su plan"*. | Satisfactorio |
| 2 | Forzar petición directa mediante Postman: `POST /api/branches`. | El backend audita las sucursales existentes activas (`count = 3 >= max_branches`). | Satisfactorio |
| 3 | Evaluar la respuesta del servidor. | Código `HTTP 403 Forbidden` con detalle: *"Límite de sucursales alcanzado para su plan de suscripción (3)"*. | Satisfactorio |
| 4 | Comprobar persistencia en la tabla `branches`. | Ninguna sucursal adicional es creada; el balance de cuotas permanece 3/3. | Satisfactorio |

| Responsable | QA Tester / Ingeniero Backend |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Liberación Inmediata de Cuota al Desactivar una Sucursal (Resiliencia)

| Caso de uso 04 | Liberación Dinámica de Cuota de Sucursal sin Reinicio de Servidor |
| :--- | :--- |
| **Descripción** | Comprueba que al desactivar una sucursal existente (`is_active = False`), la cuota consumida baje al instante, permitiendo registrar una nueva sucursal dentro del límite legal. |
| **Precondiciones** | a) Empresa con cuota llena (3/3 sucursales activas). |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar una sucursal en desuso y desactivarla (`PATCH /api/branches/{id}/status` con `is_active: False`). | La sucursal pasa a estado inactivo sin ser eliminada físicamente de la base de datos. | Satisfactorio |
| 2 | Consultar endpoint de cuota `GET /api/branches/quota`. | El consumo baja inmediatamente a 2/3 activas. | Satisfactorio |
| 3 | Proceder a crear una nueva sucursal comercial. | El sistema aprueba la creación con código `HTTP 201 Created` ocupando el cupo liberado. | Satisfactorio |

| Responsable | Administrador de Empresa |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU05: Gestionar Prendas y Variantes de Precio por Talla

#### Prueba 1: Alta de Prenda con Diferenciación de Precios por Talla (Sunny Day)

| Caso de uso 05 | Gestionar Prendas y Variantes de Precio por Talla |
| :--- | :--- |
| **Descripción** | Permite crear una prenda en el catálogo definiendo múltiples variantes con precios diferenciados según la talla (ej. Talla S a Bs 80.00, Talla L a Bs 95.00), asociando SKU único y stock inicial. |
| **Precondiciones** | a) Administrador de catálogo autenticado con `tenant_id` válido. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a **"Catálogo"** $\\rightarrow$ **"Prendas"** y presionar **"Nueva Prenda"**. | Se despliega el formulario con configuración de variantes de talla y color. | Satisfactorio |
| 2 | Ingresar datos base: Nombre: *"Vestido Fiesta Seda"*, Categoría: *"Vestidos"*. | Se cargan los atributos base del producto. | Satisfactorio |
| 3 | Configurar Variante 1: Talla S, SKU `VEST-S-01`, Precio: Bs 80.00, Stock: 10. | Se agrega la primera variante a la grilla de precios. | Satisfactorio |
| 4 | Configurar Variante 2: Talla L, SKU `VEST-L-01`, Precio: Bs 95.00, Stock: 8. | Se agrega la segunda variante con precio mayor justificado por material. | Satisfactorio |
| 5 | Presionar **"Guardar Prenda y Variantes"**. | Se emite `POST /api/products` con el árbol de variantes anidadas. | Satisfactorio |
| 6 | Evaluar respuesta del servidor. | Código `HTTP 201 Created`. Prenda creada con 2 variantes y precios diferenciados por talla. | Satisfactorio |

| Responsable | Encargado de Catálogo / Administrador |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Rechazo por Duplicidad de Código SKU en Variante (Rainy Day - Unicidad)

| Caso de uso 05 | Validación de Unicidad de Código SKU de Variante |
| :--- | :--- |
| **Descripción** | Valida que el sistema rechace el registro de una variante si su código SKU ya existe en el inventario del tenant, evitando colisiones en el punto de venta. |
| **Precondiciones** | a) Existe registrada una variante con SKU `VEST-S-01`. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Intentar crear una nueva prenda o variante asignándole el SKU existente `VEST-S-01`. | Se envía la petición al backend. | Satisfactorio |
| 2 | Evaluar la respuesta del backend. | Código `HTTP 400 Bad Request` (o `409 Conflict`) con mensaje: *"El código SKU ya está en uso"*. | Satisfactorio |
| 3 | Comprobar el modelo de base de datos. | La restricción única `UNIQUE(tenant_id, sku)` preserva la consistencia de inventario. | Satisfactorio |

| Responsable | QA Tester / Ingeniero Backend |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Aislamiento Multitenant de Catálogo entre Empresas (Rainy Day - Multitenant)

| Caso de uso 05 | Aislamiento Estricto de Catálogo entre Tenants Competidores |
| :--- | :--- |
| **Descripción** | Comprueba que una empresa no pueda consultar, modificar ni eliminar prendas pertenecientes a otro tenant registrado en la misma plataforma SaaS. |
| **Precondiciones** | a) Prenda con ID `P-100` perteneciente a `Empresa A`.<br>b) Usuario autenticado con token JWT de `Empresa B`. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | El usuario de Empresa B intenta emitir `PUT /api/products/P-100` con datos modificados. | El backend intercepta la petición y compara el `tenant_id` del token contra la entidad. | Satisfactorio |
| 2 | Evaluar la respuesta del servidor. | Código `HTTP 404 Not Found` (o `403 Forbidden`). El producto no existe en el contexto del tenant. | Satisfactorio |
| 3 | Verificar la integridad de la prenda original. | Los datos de la prenda en Empresa A permanecen 100% inalterados. | Satisfactorio |

| Responsable | QA Tester / Ingeniero de Seguridad |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU06: Consultar Catálogo Online con Búsqueda Facetada

#### Prueba 1: Búsqueda Facetada Multicriterio en Tiempo Real (Sunny Day)

| Caso de uso 06 | Consultar Catálogo Online con Búsqueda Facetada |
| :--- | :--- |
| **Descripción** | Permite al cliente en la tienda virtual explorar prendas aplicando filtros facetados simultáneos de categoría, talla, color y rango de precios, obteniendo respuestas instantáneas indexadas en PostgreSQL. |
| **Precondiciones** | a) Catálogo con al menos 30 prendas activas con variantes cargadas. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a la tienda online y abrir el panel de filtros laterales. | Se despliegan las facetas dinámicas con conteo de prendas por talla y categoría. | Satisfactorio |
| 2 | Marcar categoría: *"Vestidos"*, Talla: *"M"* y rango de precio: *"Bs 50 a Bs 100"*. | El frontend emite `GET /api/catalog/products?category=vestidos&size=M&min_price=50&max_price=100`. | Satisfactorio |
| 3 | Evaluar la respuesta del endpoint. | Código `HTTP 200 OK`. Retorna únicamente prendas que satisfacen todos los filtros a la vez. | Satisfactorio |
| 4 | Inspeccionar las tarjetas de producto en pantalla. | Muestra imágenes, precio correspondiente a talla M y disponibilidad inmediata. | Satisfactorio |

| Responsable | Cliente / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Búsqueda con Filtros Excluyentes sin Coincidencias (Sunny Day / Manejo Vacío)

| Caso de uso 06 | Respuesta Controlada ante Búsqueda Facetada sin Coincidencias |
| :--- | :--- |
| **Descripción** | Valida que ante una búsqueda con parámetros extremos sin coincidencias, el sistema responda limpiamente con lista vacía sin arrojar errores 500 ni quiebres de interfaz. |
| **Precondiciones** | a) Ninguna prenda cumple simultáneamente con los filtros extremos seleccionados. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Aplicar filtros con precio mínimo de Bs 10,000 en categoría económica. | Se ejecuta la consulta facetada. | Satisfactorio |
| 2 | Evaluar la respuesta del backend. | Código `HTTP 200 OK`. Retorna array vacío `data: []` y `total: 0`. | Satisfactorio |
| 3 | Verificar el renderizado en el navegador. | Se presenta un mensaje amigable: *"No se encontraron prendas con los criterios seleccionados"*. | Satisfactorio |

| Responsable | QA Tester / Diseñador UI |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU07: Sincronizar y Descargar Catálogo a Almacenamiento Local (PWA / SQLite)

#### Prueba 1: Descarga Exitosa de Paquete Comprimido de Catálogo Offline (Sunny Day)

| Caso de uso 07 | Sincronizar y Descargar Catálogo a Almacenamiento Local |
| :--- | :--- |
| **Descripción** | Permite a la terminal PWA o aplicación móvil solicitar y descargar el paquete completo de catálogo e inventario asignado a su sucursal para posibilitar la venta sin conexión. |
| **Precondiciones** | a) Terminal conectada a Internet con sesión iniciada.<br>b) Existencias de catálogo e inventario asignados a la sucursal. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Presionar botón **"Descargar Catálogo Offline"** en el panel de configuración local. | El cliente solicita `GET /api/catalog/offline-pack?branch_id={id}`. | Satisfactorio |
| 2 | Evaluar la respuesta del servidor central. | Código `HTTP 200 OK`. Retorna payload JSON con productos, variantes, precios por talla y stock. | Satisfactorio |
| 3 | Verificar cabecera de versión de sincronización. | Incluye `sync_version` y timestamp UTC para control de versiones incrementales. | Satisfactorio |

| Responsable | Cajero de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Persistencia Completa del Catálogo en IndexedDB de la PWA (Sunny Day)

| Caso de uso 07 | Persistencia de Catálogo en Base de Datos IndexedDB de la Web PWA |
| :--- | :--- |
| **Descripción** | Comprueba que el servicio local de la PWA (`IdbCatalogService`) almacene íntegramente las prendas y variantes descargadas en los almacenes de objetos de IndexedDB del navegador. |
| **Precondiciones** | a) Paquete offline recibido satisfactoriamente por la PWA. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | El servicio local procesa la transacción de escritura en IndexedDB. | Se insertan los registros en los almacenes `products` e `inventory`. | Satisfactorio |
| 2 | Abrir DevTools $\\rightarrow$ **Application** $\\rightarrow$ **IndexedDB** $\\rightarrow$ `fashionstore_local_db`. | Se constata la presencia de todas las entidades con sus claves primarias indexadas. | Satisfactorio |
| 3 | Cerrar y reabrir la pestaña del navegador. | Los datos permanecen persistidos en disco local sin pérdida de información. | Satisfactorio |

| Responsable | QA Tester / Desarrollador Frontend |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Persistencia Completa del Catálogo en SQLite en App Móvil Flutter (Sunny Day)

| Caso de uso 07 | Persistencia de Catálogo en Base de Datos SQLite en App Móvil Flutter |
| :--- | :--- |
| **Descripción** | Valida que la aplicación móvil ejecute la inserción transaccional por lotes en la base de datos local SQLite (`sqflite`), dejando la terminal móvil lista para ventas offline en ferias o ruta. |
| **Precondiciones** | a) App móvil Flutter ejecutándose en emulador o dispositivo físico con `sqflite` inicializado. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | La app recibe el stream del paquete offline mediante la librería de red. | Se inicia una transacción atómica `db.transaction()` en SQLite. | Satisfactorio |
| 2 | Se pueblan las tablas locales `local_products` y `local_variants`. | Inserción en bloque completada con éxito en $< 350$ ms. | Satisfactorio |
| 3 | Consultar recuento local mediante `SELECT COUNT(*) FROM local_products`. | El conteo local coincide con exactitud con las prendas descargadas. | Satisfactorio |

| Responsable | Desarrollador Móvil / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU08: Consultar Catálogo Offline en Modo Desconectado

#### Prueba 1: Conmutación Automática y Búsqueda en Caché Local ante Corte de Red (Sunny Day)

| Caso de uso 08 | Consultar Catálogo Offline en Modo Desconectado |
| :--- | :--- |
| **Descripción** | Permite al cajero o vendedor buscar prendas por nombre o código en el catálogo cuando la terminal se desconecta de Internet, conmutando de forma transparente a la lectura en IndexedDB/SQLite. |
| **Precondiciones** | a) Catálogo descargado previamente en la terminal.<br>b) Dispositivo en modo desconectado (`navigator.onLine = false`). |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Desactivar la conexión de red (simular Offline en DevTools). | El listener `NetworkStatusService` conmuta el estado de la app a *"Modo Desconectado"*. | Satisfactorio |
| 2 | Escribir *"vestido"* en la barra de búsqueda de la tienda o POS. | La interfaz detecta la desconexión y redirige la consulta al almacén IndexedDB local. | Satisfactorio |
| 3 | Evaluar la respuesta en pantalla. | Se muestran instantáneamente los vestidos disponibles con distintivo ámbar *"Catálogo Local"*. | Satisfactorio |
| 4 | Verificar consola del navegador. | Cero excepciones de red no controladas; la experiencia de usuario es ininterrumpida. | Satisfactorio |

| Responsable | Cajero de Sucursal / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Filtrado Local por Categorías sin Conexión a Internet (Sunny Day)

| Caso de uso 08 | Navegación y Filtrado Local de Prendas por Categoría Desconectada |
| :--- | :--- |
| **Descripción** | Comprueba que el operador pueda navegar entre categorías de productos en el catálogo offline, filtrando los registros locales con tiempos de respuesta menores a 50 ms. |
| **Precondiciones** | a) Terminal operando en contingencia desconectada. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | En la vista desconectada, hacer clic sobre el chip de categoría *"Pantalones"*. | La consulta local ejecuta un índice de búsqueda en memoria/IndexedDB. | Satisfactorio |
| 2 | Comprobar actualización visual de la grilla. | Se despliegan exclusivamente los pantalones descargados en el dispositivo. | Satisfactorio |
| 3 | Seleccionar una prenda para ver su detalle de tallas y precios. | Se abre el modal con las variantes de talla y precios guardados localmente. | Satisfactorio |

| Responsable | Cajero de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU09: Comprar Prendas con Stripe y Despacho Condicionado

#### Prueba 1: Pago Exitoso con Stripe y Generación de Orden de Despacho (Sunny Day - Política 3)

| Caso de uso 09 | Comprar Prendas con Stripe y Despacho Condicionado |
| :--- | :--- |
| **Descripción** | Permite al cliente completar el checkout virtual abonando con tarjeta mediante Stripe; el sistema genera la orden de despacho oficial únicamente tras confirmar el pago exitoso (`status: 'paid'`). |
| **Precondiciones** | a) Carrito con prendas disponibles.<br>b) Integración con pasarela Stripe en modo prueba activa.<br>c) Política 3 activa: despacho condicionado a pago firme. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Iniciar checkout e ingresar datos de envío en la tienda online. | Se consolida la cotización del pedido con impuestos y costo de flete. | Satisfactorio |
| 2 | En el componente Stripe Elements, ingresar número de tarjeta de prueba válida. | El SDK de Stripe valida el formato y fecha de expiración. | Satisfactorio |
| 3 | Confirmar pago. | Stripe procesa el cargo y emite confirmación con `payment_intent` en estado `succeeded`. | Satisfactorio |
| 4 | El webhook del backend recibe la notificación criptográfica de Stripe. | La orden pasa a estado `PAGADA` y el controlador crea la orden de despacho `DSP-YYYYMMDD-XXXX`. | Satisfactorio |
| 5 | Visualizar comprobante digital. | Se presenta al cliente el número de seguimiento de despacho y resumen del pedido. | Satisfactorio |

| Responsable | Cliente / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Bloqueo Absoluto de Despacho ante Pago Rechazado o Pendiente (Rainy Day - Política 3)

| Caso de uso 09 | Cumplimiento de Política P-Ten-03: Bloqueo de Despacho sin Pago Confirmado |
| :--- | :--- |
| **Descripción** | Verifica que si el pago con tarjeta es rechazado por fondos insuficientes o queda en estado pendiente, el sistema impida generar la orden de despacho y preserve la mercadería en almacén. |
| **Precondiciones** | a) Intento de pago simulado con tarjeta rechazada o fondos insuficientes. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Ingresar tarjeta de prueba declinada en el checkout. | Stripe rechaza la transacción con código `card_declined`. | Satisfactorio |
| 2 | Evaluar el estado del pedido en la base de datos. | El pedido permanece en estado `PENDIENTE_PAGO`. | Satisfactorio |
| 3 | Verificar la tabla de órdenes de despacho (`dispatch_orders`). | Cero registros generados; ningún paquete es emitido a logística. | Satisfactorio |
| 4 | Evaluar la respuesta en pantalla. | Se muestra alerta al cliente: *"Su pago no pudo ser procesado. No se ha generado orden de despacho"*. | Satisfactorio |

| Responsable | QA Tester / Ingeniero Backend |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU10: Crear Reserva Online de Prendas con Vencimiento y Bloqueo

#### Prueba 1: Creación Exitosa de Reserva Online con Bloqueo Temporal de Stock (Sunny Day)

| Caso de uso 10 | Crear Reserva Online de Prendas con Vencimiento y Bloqueo |
| :--- | :--- |
| **Descripción** | Permite al cliente reservar prendas online para recogerlas y pagarlas en sucursal física, bloqueando de forma atómica el stock comprometido por un plazo de 48 horas y emitiendo un código QR único. |
| **Precondiciones** | a) Prenda con existencia disponible en la sucursal seleccionada (`available_quantity > 0`).<br>b) Fecha de retiro dentro del plazo legal permitido (máximo 7 días). |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar prenda y talla en la tienda y pulsar **"Reservar para Recojo en Tienda"**. | Se despliega el selector de sucursal física y fecha estimada de recojo. | Satisfactorio |
| 2 | Seleccionar sucursal y fecha de visita dentro de las 48 horas. | Se validan las existencias en tiempo real en la tienda destino. | Satisfactorio |
| 3 | Confirmar la reserva. | Se emite `POST /api/reservations` con el payload de la orden. | Satisfactorio |
| 4 | Evaluar respuesta del servidor. | Código `HTTP 201 Created`. Se genera reserva con código `RES-XXXXXXXX`, estado `ACTIVA` y código QR. | Satisfactorio |
| 5 | Comprobar inventario en PostgreSQL. | `reserved_quantity` se incrementa en +1 y `available_quantity` disminuye en -1 atómicamente. | Satisfactorio |

| Responsable | Cliente / Encargado de Tienda |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Barrido Automático de Reserva Vencida con Liberación de Stock (Resiliencia - Sweeper)

| Caso de uso 10 | Tarea Automática de Expiración de Reservas y Liberación de Stock Comprometido |
| :--- | :--- |
| **Descripción** | Comprueba que el proceso en segundo plano (*Sweeper Worker*) detecte reservas cuya fecha límite expiró ($expires\_at \le now()$), cambie su estado a `VENCIDA` y libere el stock comprometido. |
| **Precondiciones** | a) Reserva activa con fecha de expiración cumplida en la base de datos.<br>b) Prenda con `reserved_quantity = 1`. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Disparar el ciclo de barrido del sweeper (`POST /api/reservations/sweeper`). | El servicio audita las reservas con fecha de caducidad superada. | Satisfactorio |
| 2 | Evaluar la actualización de estado de la reserva. | El estado muta automáticamente de `ACTIVA` a `VENCIDA`. | Satisfactorio |
| 3 | Comprobar la tabla de inventario en base de datos. | `reserved_quantity` se decrementa a 0 y `available_quantity` recupera la unidad física. | Satisfactorio |
| 4 | Verificar trazabilidad en logs del sistema. | Registro de auditoría asentado: *"Reserva RES-XXXXXXXX expirada: stock liberado a tienda"*. | Satisfactorio |

| Responsable | QA Tester / Ingeniero Backend |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Rechazo por Fecha de Retiro Fuera del Plazo Permitido (Rainy Day - Validación)

| Caso de uso 10 | Validación de Límite Temporal de Retiro de Prenda |
| :--- | :--- |
| **Descripción** | Valida que el controlador rechace cualquier solicitud de reserva cuya fecha de recojo programada exceda el plazo máximo legal permitido de 7 días calendario. |
| **Precondiciones** | a) Cliente selecciona fecha de retiro situada a 15 días en el futuro. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Ingresar en el formulario de reserva una fecha de visita a 15 días vista. | El frontend muestra advertencia en el selector de calendario. | Satisfactorio |
| 2 | Forzar envío de la petición al endpoint `POST /api/reservations`. | El controlador valida la diferencia de días entre `pickup_date` y la fecha actual. | Satisfactorio |
| 3 | Evaluar la respuesta devuelta por el servidor. | Código `HTTP 400 Bad Request` con mensaje: *"La fecha de retiro no puede exceder los 7 días calendario"*. | Satisfactorio |
| 4 | Comprobar inventario en la base de datos. | Cero existencias bloqueadas; la reserva no es asentada en el sistema. | Satisfactorio |

| Responsable | QA Tester / Cliente |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---
## 5.7. Casos de prueba detallados (2da Presentación: CU11 al CU18)

### CU11: Registrar Reserva de Prendas Offline en Modo Desconectado

#### Prueba 1: Registro Exitoso de Reserva Offline con UUIDv4 Local (Sunny Day)

| Caso de uso 11 | Registrar Reserva de Prendas Offline en Modo Desconectado |
| :--- | :--- |
| **Descripción** | Permite registrar una reserva física de prendas en sucursal cuando la terminal carece de conexión a Internet, almacenando la orden localmente en IndexedDB/SQLite con un identificador UUIDv4 único y estado de sincronización pendiente. |
| **Precondiciones** | a) Terminal POS en modo desconectado (*Offline*).<br>b) Catálogo local sincronizado previamente.<br>c) Prenda con stock local disponible $> 0$. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar prendas en el catálogo offline de la PWA/Móvil. | Las prendas y variantes de talla se agregan al carrito local con precio vigente. | Satisfactorio |
| 2 | Pulsar botón **"Registrar Reserva en Tienda"**. | Se abre modal de datos de cliente y tiempo de vigencia de la reserva. | Satisfactorio |
| 3 | Ingresar datos del cliente y confirmar operación. | Se genera un UUIDv4 local, se guarda en IndexedDB con estado `PENDIENTE_SYNC` y se descuenta stock local. | Satisfactorio |
| 4 | Consultar la bandeja de reservas locales. | La reserva se lista con indicador naranja *"Pendiente de Sincronización"*. | Satisfactorio |

| Responsable | Cajero de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Bloqueo de Reserva Offline por Variante sin Existencias Locales (Rainy Day)

| Caso de uso 11 | Bloqueo de Reserva por Agotamiento de Stock Local |
| :--- | :--- |
| **Descripción** | Valida que el controlador de frontera de la PWA impida crear una reserva si la variante de prenda solicitada tiene existencia local igual a 0 en la base de datos desconectada. |
| **Precondiciones** | a) Terminal POS desconectada de la red.<br>b) Prenda seleccionada con stock disponible igual a 0 en IndexedDB. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Buscar prenda en el catálogo local y seleccionar talla sin stock. | El badge de talla muestra etiqueta *"Sin Stock"* y color atenuado. | Satisfactorio |
| 2 | Intentar pulsar botón **"Agregar a Reserva"**. | El botón permanece deshabilitado. | Satisfactorio |
| 3 | Forzar llamada al servicio local de reservas vía consola. | La función rechaza la promesa con mensaje: *"Stock insuficiente en terminal local"*. | Satisfactorio |

| Responsable | Cajero de Sucursal / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Encolamiento y Detección de Reconexión de Red (Resiliencia)

| Caso de uso 11 | Encolamiento de Reserva y Disparo Automático por Conectividad |
| :--- | :--- |
| **Descripción** | Comprueba que al registrarse una reserva en contingencia desconectada, el evento `online` del navegador detecte el retorno de señal y notifique la presencia de órdenes pendientes en outbox. |
| **Precondiciones** | a) Reserva offline creada y persistida en IndexedDB.<br>b) Terminal sin acceso a Internet. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Mantener la reserva encolada en estado `PENDIENTE_SYNC`. | El badge superior de la cabecera muestra: *"1 operación pendiente"*. | Satisfactorio |
| 2 | Restablecer la conexión de red (simular `online` en DevTools). | El listener de red detecta conectividad y muestra alerta toast: *"Conexión restablecida"*. | Satisfactorio |
| 3 | Verificar el indicador del Outbox. | El contador se torna activo permitiendo la sincronización inmediata o manual. | Satisfactorio |

| Responsable | QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU12: Atender y Resolver Conflictos de Reservas Expiradas

#### Prueba 1: Reactivación de Reserva Expirada con Stock Físico en Percha (Sunny Day)

| Caso de uso 12 | Atender y Resolver Conflictos de Reservas Expiradas |
| :--- | :--- |
| **Descripción** | Permite reactivar una reserva cuyo plazo de 48 horas venció cuando el cliente acude a recogerla, siempre y cuando la prenda física continúe en percha de la sucursal. |
| **Precondiciones** | a) Reserva en estado `EXPIRADA` en la base de datos central.<br>b) La prenda física cuenta con existencias libres en inventario. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Acceder al panel de **"Gestión de Reservas"** y filtrar por estado *"Expiradas"*. | Se lista la reserva con código, nombre de cliente y fecha de caducidad. | Satisfactorio |
| 2 | Abrir el modal de atención del conflicto. | El sistema verifica automáticamente el stock en tiempo real y muestra *"Stock físico disponible"*. | Satisfactorio |
| 3 | Seleccionar la opción de resolución: **"Reactivar y Vender"**. | El estado de la reserva cambia a `REACTIVADA` y transfiere los ítems a la venta POS. | Satisfactorio |
| 4 | Confirmar la venta en caja. | Se asienta la venta y se actualiza el inventario restando la unidad física. | Satisfactorio |

| Responsable | Encargado de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Sustitución de Prenda por Venta Previa de la Reserva Original (Rainy Day)

| Caso de uso 12 | Resolución de Conflicto de Reserva Expirada con Prenda Sustituta |
| :--- | :--- |
| **Descripción** | Cuando la prenda de una reserva vencida fue vendida a otro cliente, el sistema permite ofrecer una alternativa de prenda sustituta utilizando el selector reactivo de tallas. |
| **Precondiciones** | a) Reserva expirada sin disponibilidad de la variante original.<br>b) Existen otras variantes de la misma categoría en inventario. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar la reserva expirada en conflicto. | El sistema alerta: *"Prenda no disponible: el stock fue liquidado"*. | Satisfactorio |
| 2 | Seleccionar resolución: **"Ofrecer Prenda Sustituta"**. | Se despliega el selector visual de variantes con chips reactivos de talla y color. | Satisfactorio |
| 3 | Elegir variante sustituta disponible y justificar el cambio. | El sistema valida la selección, calcula diferencias de precio y reserva la nueva prenda. | Satisfactorio |
| 4 | Guardar resolución del conflicto. | La reserva se cierra con estado `RESUELTA_CON_SUSTITUTO` y trazabilidad en logs. | Satisfactorio |

| Responsable | Encargado de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Cierre Definitivo de Reserva sin Stock y Rechazo sin Justificación (Rainy Day)

| Caso de uso 12 | Validación de Justificación Obligatoria para Cierre de Conflicto |
| :--- | :--- |
| **Descripción** | Comprueba que el sistema rechace el cierre definitivo de una reserva expirada en conflicto si el operador no redacta una justificación formal auditada ($\\ge 5$ caracteres). |
| **Precondiciones** | a) Reserva expirada abierta en el modal de resolución. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar la opción **"Cancelar Definitivamente Reserva"**. | Se activa el área de texto *"Justificación del Cierre"*. | Satisfactorio |
| 2 | Dejar el campo vacío y pulsar botón **"Confirmar Cierre"**. | El botón permanece deshabilitado y se muestra mensaje: *"La justificación es obligatoria"*. | Satisfactorio |
| 3 | Escribir justificación válida e intentar enviar. | Se habilita el botón y se procesa el cierre con estado `CANCELADA_SIN_STOCK`. | Satisfactorio |

| Responsable | Encargado de Sucursal / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU13: Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4

#### Prueba 1: Emisión Exitosa de Venta Offline de Contado con UUIDv4 (Sunny Day)

| Caso de uso 13 | Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4 |
| :--- | :--- |
| **Descripción** | Permite facturar ventas presenciales en caja cuando la tienda sufre un corte de conexión a Internet, registrando el cobro obligatoriamente en efectivo, generando un UUIDv4 y emitiendo el ticket térmico de 80mm. |
| **Precondiciones** | a) PWA operando en modo desconectado.<br>b) Existencias en stock local en IndexedDB.<br>c) Política 5 activa: solo cobros en efectivo en contingencia. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Escanear o seleccionar prendas en el punto de venta POS. | Las líneas de venta se totalizan en la interfaz con desglose de impuestos e importes. | Satisfactorio |
| 2 | Pulsar botón **"Cobrar (Modo Offline)"**. | Se despliega el modal de cobro desconectado. | Satisfactorio |
| 3 | Ingresar monto recibido en efectivo y calcular cambio. | El sistema calcula el cambio exacto y valida que el monto recibido cubra el total. | Satisfactorio |
| 4 | Confirmar la venta. | Se genera un registro con UUIDv4 en IndexedDB, estado `PENDIENTE_SYNC` y se descuenta stock local. | Satisfactorio |
| 5 | Visualizar ticket térmico. | Se despliega el comprobante estilizado para rollo térmico de 80mm con código UUID visible. | Satisfactorio |

| Responsable | Cajero de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Bloqueo Estricto de Medios de Pago Electrónicos en Modo Offline (Rainy Day - Política 5)

| Caso de uso 13 | Cumplimiento de Política P-Ten-05: Bloqueo de Pagos Digitales Offline |
| :--- | :--- |
| **Descripción** | Verifica que las opciones de pago mediante Tarjeta de Crédito, Código QR o Transferencia queden inhabilitadas al no haber conexión a Internet. |
| **Precondiciones** | a) Terminal POS en estado desconectado (`navigator.onLine == false`). |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Iniciar flujo de cobro con prendas en el carrito. | La interfaz detecta el estado desconectado. | Satisfactorio |
| 2 | Inspeccionar selector de métodos de pago. | Las opciones "Tarjeta (Stripe)" y "QR Simple" están deshabilitadas con tooltip: *"Requiere Internet"*. | Satisfactorio |
| 3 | Solo la opción **"Efectivo"** permanece disponible y preseleccionada. | El cajero solo puede procesar pagos en efectivo garantizando liquidez verificable. | Satisfactorio |

| Responsable | Cajero de Sucursal / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Idoneidad del Formato Térmico de Impresión en 80mm (Resiliencia / Frontera)

| Caso de uso 13 | Verificación del Formato de Impresión Térmica en Rollo de 80mm |
| :--- | :--- |
| **Descripción** | Comprueba que la regla `@media print` formatee el ticket de venta offline a exactamente 80mm de ancho, ocultando elementos de navegación y mostrando el identificador de contingencia. |
| **Precondiciones** | a) Venta offline generada y visualizada en pantalla de comprobante. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Presionar botón **"Imprimir Comprobante"**. | Se abre el diálogo de impresión nativo del navegador. | Satisfactorio |
| 2 | Inspeccionar la vista previa de impresión en 80mm. | El contenido se ajusta a ancho continuo de 80mm, tipografía monoespaciada legible y sin cortes. | Satisfactorio |
| 3 | Verificar cabecera y pie de página del ticket. | Muestra: *"CONTINGENCIA OFFLINE"*, UUIDv4 de la venta, desglose de prendas y leyenda de validez. | Satisfactorio |

| Responsable | Cajero de Sucursal / Diseñador UI |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU14: Gestionar Bandeja Local de Operaciones Pendientes (Outbox PWA / SQLite)

#### Prueba 1: Inspección de Métricas de Gaveta y Lista de Ventas en Outbox (Sunny Day)

| Caso de uso 14 | Gestionar Bandeja Local de Operaciones Pendientes (Outbox) |
| :--- | :--- |
| **Descripción** | Permite al cajero o encargado auditar la bandeja de salida local, revisando el monto total retenido en gaveta por ventas offline, la cantidad de operaciones pendientes y su estado individual. |
| **Precondiciones** | a) Mínimo dos ventas registradas en contingencia desconectada en IndexedDB. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Navegar a la sección **"Bandeja Outbox"** en el menú de Caja POS. | Se carga la vista con tarjetas métricas de cabecera. | Satisfactorio |
| 2 | Verificar tarjeta métrica *"Efectivo en Gaveta Offline"*. | Muestra la sumatoria matemática exacta de las ventas locales en efectivo. | Satisfactorio |
| 3 | Verificar tabla de transacciones locales. | Se listan las ventas con hora local, UUID, cliente, monto total y badge `PENDIENTE`. | Satisfactorio |

| Responsable | Encargado de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Reintento Granular e Insignia de Error de Red (Rainy Day - Reintentos)

| Caso de uso 14 | Reintento Granular de Sincronización y Registro de Errores |
| :--- | :--- |
| **Descripción** | Comprueba que si una venta individual falla al sincronizarse por intermitencia de red, la fila correspondiente exhiba una insignia de error, incremente su contador de reintentos y permita el reintento manual aislado. |
| **Precondiciones** | a) Venta en outbox con fallo previo simulado (`error_message: "Network Timeout"`). |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Observar la fila de la transacción fallida en la tabla outbox. | Muestra un badge rojo *"Error de Red"* y el contador *"Reintentos: 1"*. | Satisfactorio |
| 2 | Pulsar botón individual **"Reintentar"** en la fila correspondiente. | Se activa spinner de carga local en la fila sin bloquear el resto de la interfaz. | Satisfactorio |
| 3 | Tras confirmación exitosa con el servidor, verificar estado. | El badge cambia a verde *"Sincronizado"* y se actualiza la fecha de liquidación. | Satisfactorio |

| Responsable | Cajero de Sucursal / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Purgado Seguro Exclusivo de Ventas Sincronizadas (Resiliencia)

| Caso de uso 14 | Purgado de Operaciones Sincronizadas con Protección de Pendientes |
| :--- | :--- |
| **Descripción** | Verifica que la acción de limpieza o vaciado de la bandeja local únicamente elimine del dispositivo aquellas operaciones con confirmación de sincronización central, protegiendo las pendientes. |
| **Precondiciones** | a) Existencia de 1 venta en estado `SINCRONIZADO` y 1 venta en estado `PENDIENTE`. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Presionar botón **"Depurar Sincronizadas"**. | Se solicita confirmación mediante modal de seguridad. | Satisfactorio |
| 2 | Confirmar acción de depuración. | El sistema elimina de IndexedDB únicamente el registro con estado `SINCRONIZADO`. | Satisfactorio |
| 3 | Inspeccionar la tabla outbox tras el purgado. | La venta con estado `PENDIENTE` permanece intacta con sus montos y detalles. | Satisfactorio |

| Responsable | Encargado de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU15: Sincronizar Lotes de Ventas con Idempotencia Central (`sync_operations`)

#### Prueba 1: Sincronización Exitosa de Lote de Ventas Offline (Sunny Day)

| Caso de uso 15 | Sincronizar Lotes de Ventas con Idempotencia Central |
| :--- | :--- |
| **Descripción** | Permite transmitir el lote de ventas generadas desconectadamente hacia el backend central, registrando cada operación en la base de datos de la empresa, actualizando el inventario central y marcando la transacción en `sync_operations`. |
| **Precondiciones** | a) Conexión a Internet restablecida.<br>b) Lote de ventas offline en IndexedDB.<br>c) Stock central suficiente para cubrir las unidades vendidas. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Presionar botón **"Sincronizar Lote Completo"** en la bandeja outbox. | Se abre modal de sincronización por lotes con barra de progreso y detalle de ítems. | Satisfactorio |
| 2 | La PWA emite petición `POST /api/sales/offline/batch-sync` con el payload JSON. | El backend procesa el lote en bloque transaccional atómico en PostgreSQL. | Satisfactorio |
| 3 | Verificar respuesta del servidor. | Retorna código `HTTP 200 OK` con lista de UUIDs procesados y estado `SYNCED`. | Satisfactorio |
| 4 | Comprobar actualización en IndexedDB. | Las ventas locales se marcan como sincronizadas y se limpian del outbox activo. | Satisfactorio |

| Responsable | Cajero / Encargado de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Detección de Idempotencia ante Reenvío Duplicado de Lote (Rainy Day - Idempotencia)

| Caso de uso 15 | Idempotencia Transaccional: Prevención de Duplicidad de Ventas |
| :--- | :--- |
| **Descripción** | Comprueba que el backend intercepte reintentos o reenvíos de un mismo lote de ventas mediante la verificación del UUID en `sync_operations`, evitando duplicar ventas o restar stock dos veces. |
| **Precondiciones** | a) Lote de ventas previamente sincronizado y registrado en la tabla `sync_operations`. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Reenviar el mismo payload del lote al endpoint `POST /api/sales/offline/batch-sync`. | El backend ejecuta la consulta selectiva contra la tabla `sync_operations`. | Satisfactorio |
| 2 | El controlador detecta que los UUIDs ya existen con estado `APPLIED`. | No se insertan nuevas filas en la tabla `sales` ni en `sale_items`. | Satisfactorio |
| 3 | Verificar niveles de stock en inventario central. | El stock de las prendas no sufre ningún descuento adicional. | Satisfactorio |
| 4 | Evaluar la respuesta HTTP recibida. | Código `HTTP 200 OK` con indicador `status: "ALREADY_SYNCED"` y confirmación idempotente. | Satisfactorio |

| Responsable | QA Tester / Ingeniero Backend |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Detección y Derivación de Quiebre de Stock a Conflicto (Resiliencia / CU16)

| Caso de uso 15 | Detección de Quiebre de Stock en Sincronización y Registro de Conflicto |
| :--- | :--- |
| **Descripción** | Si una venta offline incluye prendas cuyo stock central fue consumido por ventas concurrentes online, el sistema asienta la venta pero marca el ítem en conflicto para resolución en CU16. |
| **Precondiciones** | a) Venta offline de 2 unidades de una prenda cuyo stock central actual es 0. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Transmitir lote con la venta con sobreventa al backend. | El backend procesa la transacción detectando stock insuficiente ($0 < 2$). | Satisfactorio |
| 2 | Verificar creación del registro en `sync_conflicts`. | Se crea automáticamente un registro de conflicto con tipo `INVENTORY_OVERSELL`. | Satisfactorio |
| 3 | Consultar el estado del lote en la respuesta. | Retorna `HTTP 200 OK` con alerta: *"1 venta requiere resolución de conflicto de stock"*. | Satisfactorio |

| Responsable | QA Tester / Encargado de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU16: Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock

#### Prueba 1: Resolución de Conflicto mediante Prenda Sustituta con Selector Visual (Sunny Day)

| Caso de uso 16 | Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock |
| :--- | :--- |
| **Descripción** | Permite al encargado solucionar una sobreventa offline acordando con el cliente la entrega de una prenda sustituta de igual valor, seleccionándola desde un selector reactivo. |
| **Precondiciones** | a) Conflicto por sobreventa activo en el módulo de gestión de conflictos.<br>b) Existencias físicas de prendas sustitutas en inventario. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a **"Conflictos de Sincronización"** y seleccionar la venta observada. | Se abre el modal de resolución mostrando datos del cliente y prenda en quiebre. | Satisfactorio |
| 2 | Seleccionar vía de resolución: **"Asignar Prenda Sustituta"**. | Se despliega el selector reactivo de prendas y variantes con stock en verde. | Satisfactorio |
| 3 | Elegir variante de reemplazo e ingresar justificación formal. | Se valida la selección y se habilita el botón de confirmación. | Satisfactorio |
| 4 | Confirmar resolución. | Se descuenta el stock de la nueva prenda, el conflicto cambia a `RESUELTO` y se emite comprobante. | Satisfactorio |

| Responsable | Encargado de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Resolución mediante Emisión de Nota de Crédito por el 100% (Rainy Day - Nota de Crédito)

| Caso de uso 16 | Resolución de Conflicto mediante Nota de Crédito al Cliente |
| :--- | :--- |
| **Descripción** | Cuando el cliente no acepta una prenda sustituta ante una sobreventa, el encargado emite una Nota de Crédito digital por el 100% del valor abonado. |
| **Precondiciones** | a) Conflicto de stock activo derivado de venta offline. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar vía de resolución: **"Emitir Nota de Crédito por Quiebre"**. | La interfaz calcula automáticamente el reembolso del 100% (sin retención por culpa de la empresa). | Satisfactorio |
| 2 | Redactar justificación: *"Cliente opta por nota de crédito por no encontrar talla idónea"*. | Se activa el botón de confirmación. | Satisfactorio |
| 3 | Confirmar la emisión. | Se genera la Nota de Crédito en el sistema con código alfanumérico único para futuras compras. | Satisfactorio |

| Responsable | Encargado de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Validación de Justificación Obligatoria para Cierre de Conflicto (Resiliencia)

| Caso de uso 16 | Validación de Campo de Justificación en Resolución de Conflictos |
| :--- | :--- |
| **Descripción** | Valida que cualquier acción resolutiva de quiebre de stock exija un texto explicativo mínimo de 5 caracteres antes de permitir la persistencia en base de datos. |
| **Precondiciones** | a) Modal de conflicto abierto en cualquiera de sus tres vías resolutivas. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar cualquiera de las vías (Stock negativo, Sustituto o Nota de crédito). | Se despliega el campo de texto "Motivo / Justificación de la Resolución". | Satisfactorio |
| 2 | Dejar el campo vacío y verificar el botón de acción principal. | El botón permanece deshabilitado y se muestra texto de advertencia en rojo. | Satisfactorio |
| 3 | Escribir un texto corto de 3 letras ("res") y verificar. | La validación reactiva mantiene bloqueado el envío hasta alcanzar $\\ge 5$ caracteres. | Satisfactorio |

| Responsable | Encargado de Sucursal / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU17: Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Estado

#### Prueba 1: Cambio Exitoso por Prenda de Mayor Valor con Diferencia Abonada (Sunny Day)

| Caso de uso 17 | Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Estado |
| :--- | :--- |
| **Descripción** | Permite al cajero procesar el cambio de una prenda previamente adquirida por otra de mayor precio, cotizando la diferencia, cobrando el excedente en efectivo en caja y actualizando el inventario atómicamente (+1 devuelta, -1 entregada). |
| **Precondiciones** | a) Venta previa registrada (código de ticket o UUID offline).<br>b) Prenda devuelta intacta y con etiquetas adheridas (`good_with_tags`).<br>c) Prenda de reemplazo con stock físico disponible en la sucursal. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a **"Caja POS"** $\\rightarrow$ **"Cambio de Prenda"** y buscar el ticket original. | El sistema encuentra la venta y permite seleccionar la prenda a cambiar. | Satisfactorio |
| 2 | Seleccionar la prenda devuelta (ej. Talla M a Bs 50) y elegir la nueva prenda (Talla L a Bs 70). | Se cargan los datos y se calculan los precios unitarios de ambas prendas. | Satisfactorio |
| 3 | Presionar **"Cotizar Cambio"**. | Se computa la diferencia: $\\Delta = \\text{Bs } 70 - \\text{Bs } 50 = \\text{Bs } 20.00$ (Pago requerido). | Satisfactorio |
| 4 | Marcar **"Diferencia Abonada por el Cliente"** y presionar **"Confirmar Cambio"**. | Se consolida la operación con código `EXC-XXXXXXXX`, reingresa +1 a stock y descuenta -1. | Satisfactorio |
| 5 | Presionar **"Imprimir Ticket 80mm"** en el comprobante generado. | Se genera la vista previa física térmica de 80mm lista para entrega al cliente. | Satisfactorio |

| Responsable | Cajero de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Bloqueo de Cambio ante Falta de Abono de Diferencia (Rainy Day - Política 1)

| Caso de uso 17 | Cumplimiento de Política P-Ten-01: Bloqueo de Cambio sin Pago de Diferencia |
| :--- | :--- |
| **Descripción** | Verifica que el sistema impida de forma estricta consolidar el cambio si el cliente no abona la diferencia de precio calculada, manteniendo inalterado el inventario de la sucursal. |
| **Precondiciones** | a) Cotización de cambio con diferencia positiva ($\\Delta = \\text{Bs } 20.00 > 0$). |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Generar cotización con prenda nueva de mayor precio. | El sistema advierte: *"Se requiere el cobro de Bs 20.00 para consolidar el cambio"*. | Satisfactorio |
| 2 | Intentar confirmar el cambio sin marcar la casilla de abono de diferencia. | La interfaz bloquea la confirmación con toast: *"Política 1: El cliente debe abonar la diferencia"*. | Satisfactorio |
| 3 | Forzar petición directa al backend con `difference_paid: false`. | El backend responde con código `HTTP 400 Bad Request` y no altera el inventario. | Satisfactorio |

| Responsable | Cajero de Sucursal / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Rechazo de Cambio por Prenda Dañada o sin Etiquetas (Rainy Day - Validación Física)

| Caso de uso 17 | Validación de Estado de Prenda: Exigencia de Etiquetas Intactas |
| :--- | :--- |
| **Descripción** | Comprueba que si la prenda que el cliente desea cambiar se encuentra dañada o carece de etiquetas comerciales adheridas, el sistema rechace la transacción protegiendo el inventario. |
| **Precondiciones** | a) Prenda evaluada físicamente en mostrador con etiquetas rotas o ausentes. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Iniciar flujo de cambio e ingresar la venta original. | Se despliega el selector de estado físico de la prenda devuelta. | Satisfactorio |
| 2 | Seleccionar estado de prenda: **"Sin Etiquetas / Dañada"**. | El sistema muestra alerta roja: *"Prenda no apta para reingreso al inventario"*. | Satisfactorio |
| 3 | Verificar el botón de cotización. | El botón se desactiva y se impide continuar con la operación de cambio. | Satisfactorio |

| Responsable | Cajero de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU18: Procesar Devolución de Prenda con Retención Operativa y Nota de Crédito

#### Prueba 1: Devolución Exitosa con Retención del 30% y Emisión de Nota de Crédito (Sunny Day)

| Caso de uso 18 | Procesar Devolución de Prenda con Retención Operativa y Nota de Crédito |
| :--- | :--- |
| **Descripción** | Permite procesar la devolución de una prenda intacta dentro de los 30 días, aplicando la política de retención operativa configurada para el tenant (ej. 30%), reingresando la prenda al inventario y emitiendo una Nota de Crédito digital por el saldo reembolsable (70%). |
| **Precondiciones** | a) Venta original existente con prenda adquirida a Bs 200.00.<br>b) Tenant con retención configurada al 30% ($R = \\text{Bs } 60$, Reembolso neto = Bs 140).<br>c) Prenda con etiqueta intacta y plazo menor a 30 días. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a **"Caja POS"** $\\rightarrow$ **"Devolución de Prenda"** y buscar la venta original. | El sistema localiza la venta y lista las prendas aptas para devolución. | Satisfactorio |
| 2 | Seleccionar la prenda a devolver y presionar **"Cotizar Devolución"**. | Se calculan los importes: Total Bs 200, Retención 30% (Bs 60), Reembolso Neto (Bs 140). | Satisfactorio |
| 3 | Seleccionar modalidad de liquidación: **"Emitir Nota de Crédito Digital"**. | Se habilita la emisión con numeración formal correlativa. | Satisfactorio |
| 4 | Confirmar la devolución. | Se genera la Nota de Crédito `NC-YYYYMMDD-XXXX`, reingresa +1 a stock y se abre comprobante. | Satisfactorio |

| Responsable | Cajero de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Bloqueo de Devolución por Exceder Plazo Límite de 30 Días (Rainy Day - Política 2)

| Caso de uso 18 | Cumplimiento de Política P-Ten-03: Expiración de Plazo de Devolución |
| :--- | :--- |
| **Descripción** | Valida que el sistema rechace de manera determinante cualquier solicitud de devolución si han transcurrido más de 30 días calendario desde la fecha de emisión de la venta original. |
| **Precondiciones** | a) Venta registrada con fecha de hace 35 días atrás en la base de datos. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Ingresar el identificador de la venta de 35 días atrás y cotizar devolución. | El controlador calcula la antigüedad en días transcurridos ($T = 35 > 30$). | Satisfactorio |
| 2 | El sistema bloquea la acción de cotización en la interfaz. | Se emite toast informativo: *"Plazo de devolución vencido (máximo permitido: 30 días)"*. | Satisfactorio |
| 3 | Forzar petición al endpoint `POST /api/returns/quote`. | El backend responde con código `HTTP 400 Bad Request` y no procesa la devolución. | Satisfactorio |

| Responsable | Cajero de Sucursal / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Devolución con Modalidad de Reembolso Directo en Efectivo de Caja (Sunny Day / Modalidad Alternativa)

| Caso de uso 18 | Liquidación de Devolución mediante Reembolso en Efectivo de Caja |
| :--- | :--- |
| **Descripción** | Si el cliente solicita devolución en efectivo físico en lugar de Nota de Crédito, el sistema valida la disponibilidad de gaveta, descuenta el efectivo de la caja y registra el comprobante contable. |
| **Precondiciones** | a) Cotización de devolución aprobada.<br>b) Saldo suficiente en gaveta física de caja para cubrir el reembolso neto. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | En la pantalla de cotización, seleccionar modalidad: **"Reembolso en Efectivo"**. | La interfaz actualiza el resumen contable indicando egreso de dinero de gaveta. | Satisfactorio |
| 2 | Confirmar la operación de devolución. | Se descuenta el monto neto del efectivo de caja, reingresa la prenda a stock y emite recibo. | Satisfactorio |
| 3 | Verificar el balance de caja del POS. | El arqueo de caja refleja el egreso del importe reembolsado con auditoría de devolución. | Satisfactorio |

| Responsable | Cajero de Sucursal |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

## 5.8. Casos de prueba detallados (3ra Presentación: CU19 al CU25)

### CU19: Localizar Sucursales y Trazar Rutas (OpenStreetMap / ORS)

#### Prueba 1: Consulta y Renderizado de Sucursales en Mapa Interactivo OSM (Sunny Day)

| Caso de uso 19 | Localizar Sucursales y Trazar Rutas (OpenStreetMap / ORS) |
| :--- | :--- |
| **Descripción** | Permite al cliente visualizar en un mapa interactivo basado en OpenStreetMap la totalidad de sucursales físicas activas de la empresa suscriptora, mostrando marcadores georreferenciados, datos de contacto, horarios y geolocalización GPS del dispositivo móvil. |
| **Precondiciones** | a) Mínimo dos sucursales activas registradas con coordenadas válidas de latitud y longitud.<br>b) Permisos de geolocalización concedidos en el navegador o app móvil Flutter. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a la sección **"Nuestras Sucursales / Mapa"** desde la PWA o App Móvil. | El mapa de OpenStreetMap se inicializa centrado en la posición GPS del usuario o en el centroide de tiendas. | Satisfactorio |
| 2 | Verificar presencia de marcadores de sucursal. | Se renderizan pines distintivos para cada sucursal física activa del tenant autenticado. | Satisfactorio |
| 3 | Pulsar sobre el marcador de una sucursal específica (ej. "Sucursal Central"). | Se abre un popup interactivo con nombre de sucursal, dirección física, teléfono y botón de ruta. | Satisfactorio |
| 4 | Validar la respuesta del endpoint backend `GET /api/branches/public`. | Código `HTTP 200 OK` retornando arreglo JSON con `id`, `name`, `latitude`, `longitude`, `phone`. | Satisfactorio |

| Responsable | Desarrollador Móvil / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Trazado de Ruta Multimodal (Conducción vs. A Pie) y Cálculo de ETA (Sunny Day)

| Caso de uso 19 | Trazado de Ruta Multimodal y Estimación de Tiempo de Traslado |
| :--- | :--- |
| **Descripción** | Comprueba el cálculo y trazado visual de la polilínea de ruta desde la posición actual del cliente hasta la sucursal seleccionada, consumiendo la API de OpenRouteService/OSRM con modos vehicular y peatonal. |
| **Precondiciones** | a) Posición GPS del usuario detectada con precisión.<br>b) Sucursal destino seleccionada con coordenadas válidas. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | En el popup de la sucursal, pulsar botón **"Cómo llegar"** en modo Conducción (*driving-car*). | La aplicación contacta a OpenRouteService y dibuja una polilínea azul siguiendo la red vial. | Satisfactorio |
| 2 | Inspeccionar la tarjeta de navegación inferior. | Muestra la distancia métrica precisa (ej. 3.4 km) y el tiempo estimado de viaje (ETA: 12 min). | Satisfactorio |
| 3 | Cambiar modalidad a **"A pie"** (*foot-walking*). | Se recalcula la ruta por sendas peatonales, actualizando la polilínea y el ETA (ej. 42 min). | Satisfactorio |

| Responsable | Desarrollador Móvil / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Aislamiento Multitenant en Consulta Pública de Sucursales (Rainy Day - Multitenant)

| Caso de uso 19 | Aislamiento Multitenant en Consulta de Sucursales Georreferenciadas |
| :--- | :--- |
| **Descripción** | Valida que el servicio geográfico filtre con rigor estricto por el `tenant_id` recibido, impidiendo que un cliente o terminal visualice en el mapa sucursales pertenecientes a otra empresa suscriptora. |
| **Precondiciones** | a) Dos empresas registradas en base de datos (`tenant_a` con 2 sucursales, `tenant_b` con 3 sucursales). |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Emitir petición `GET /api/branches/public` enviando cabecera de `tenant_a`. | El endpoint devuelve únicamente las 2 sucursales correspondientes a `tenant_a`. | Satisfactorio |
| 2 | Inspeccionar la respuesta en busca de identificadores de `tenant_b`. | Ninguna sucursal de `tenant_b` figura en el arreglo de marcadores devuelto. | Satisfactorio |
| 3 | Realizar petición omitiendo el identificador de empresa. | El backend responde con código `HTTP 400 Bad Request` exigiendo contexto de tenant. | Satisfactorio |

| Responsable | Ingeniero Backend / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU20: Generar Reportes Ejecutivos por Voz y Lenguaje Natural (Gemini RAG)

#### Prueba 1: Consulta Ejecutiva por Voz y Respuesta RAG con Google Gemini (Sunny Day)

| Caso de uso 20 | Generar Reportes Ejecutivos por Voz y Lenguaje Natural (Gemini RAG) |
| :--- | :--- |
| **Descripción** | Permite al gerente o administrador dictar preguntas en lenguaje natural por micrófono (ej. "¿Cuáles fueron las ventas de hoy y qué prendas tienen stock crítico?"), procesando el audio, recuperando métricas reales de PostgreSQL e infiriendo un reporte ejecutivo con Google Gemini 2.5 Flash. |
| **Precondiciones** | a) Tenant suscrito al Plan Profesional o Empresarial con `has_ai_access: True`.<br>b) API Key de Google Gemini configurada y activa.<br>c) Permiso de micrófono concedido en el navegador. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Acceder al módulo **"Asistente IA / Reporte por Voz"** en el panel administrativo. | Se inicializa la interfaz del asistente con analizador de audio y visualizador de ondas. | Satisfactorio |
| 2 | Presionar el botón de micrófono y dictar: *"Dame un resumen de las ventas de hoy y las tallas más vendidas"*. | El componente Web Speech / Audio Recorder captura el audio y transcribe el texto fluido. | Satisfactorio |
| 3 | La PWA emite petición `POST /api/ai/voice-report` con la consulta textual. | El backend recupera métricas de la base de datos (contexto RAG) y envía el prompt a Gemini. | Satisfactorio |
| 4 | Evaluar la respuesta devuelta por el sistema. | Código `HTTP 200 OK`. Retorna síntesis ejecutiva estructurada con cifras reales y recomendaciones. | Satisfactorio |
| 5 | Presionar botón **"Escuchar Respuesta"** en la interfaz. | El motor de síntesis de voz (TTS) reproduce el informe con pronunciación clara en español. | Satisfactorio |

| Responsable | Administrador de Empresa / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Bloqueo de Módulo IA para Empresas en Plan Básico (Rainy Day - Gobernanza SaaS)

| Caso de uso 20 | Cumplimiento de Límites de Suscripción: Bloqueo de IA para Plan Básico |
| :--- | :--- |
| **Descripción** | Comprueba que el backend rechace cualquier solicitud al servicio de Gemini RAG proveniente de una empresa suscrita al Plan Básico (el cual carece de la característica de IA Generativa según RNF-01). |
| **Precondiciones** | a) Empresa autenticada con suscripción vigente al Plan Básico (`has_ai_access: False`). |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Iniciar sesión con credenciales de administrador de empresa en Plan Básico. | El menú lateral muestra el ícono de IA bloqueado con insignia *"Plan Profesional"*. | Satisfactorio |
| 2 | Forzar petición directa mediante Postman: `POST /api/ai/voice-report`. | El backend intercepta el token y evalúa las características de la suscripción. | Satisfactorio |
| 3 | Inspeccionar la respuesta HTTP emitida por FastAPI. | Código `HTTP 403 Forbidden` con detalle: *"Su plan actual (Básico) no incluye el módulo de IA"*. | Satisfactorio |
| 4 | Verificar que no se hayan consumido tokens en la cuota de la API de Gemini. | Cero llamadas emitidas hacia el proveedor de IA externo, protegiendo costos operativos. | Satisfactorio |

| Responsable | QA Tester / Ingeniero de Seguridad |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Resiliencia ante Falla de Conexión Externa o Cuota Agotada de Gemini (Resiliencia)

| Caso de uso 20 | Resiliencia y Fallback Analítico Heurístico ante Caída de Gemini |
| :--- | :--- |
| **Descripción** | Valida que si la API de Google Gemini sufre un timeout de red o agota su cuota de peticiones, el sistema ejecute una degradación grácil devolviendo un reporte analítico heurístico local basado en plantillas SQL sin arrojar error 500. |
| **Precondiciones** | a) Simular fallo de conectividad externa con `api.generativeai.google.com`. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Emitir consulta ejecutiva desde un tenant con Plan Profesional. | El servicio backend intenta contactar al endpoint de Gemini. | Satisfactorio |
| 2 | Al expirar el tiempo de espera (timeout > 5s), el bloque `except` captura la contingencia. | El controlador activa el generador heurístico local alimentado con los datos de PostgreSQL. | Satisfactorio |
| 3 | Evaluar la respuesta entregada al cliente. | Código `HTTP 200 OK` con bandera `is_fallback: True` y resumen analítico con métricas clave. | Satisfactorio |
| 4 | Verificar la interfaz de usuario. | Se presenta la información al usuario con aviso sutil: *"Modo de contingencia analítica local"*. | Satisfactorio |

| Responsable | Ingeniero Backend / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU21: Exportar Reportes Empresariales a Formatos PDF y Excel (ReportLab / openpyxl)

#### Prueba 1: Exportación Formal de Reporte de Ventas a Excel XLSX con Fórmulas (Sunny Day)

| Caso de uso 21 | Exportación Formal de Reporte de Ventas a Excel (.xlsx) con Fórmulas |
| :--- | :--- |
| **Descripción** | Permite generar y descargar una hoja de cálculo Excel profesional con formato contable, membrete corporativo, colores institucionales, anchos de columna autoajustados y fila totalizadora automática con fórmulas `=SUM(...)`. |
| **Precondiciones** | a) Existen transacciones de venta registradas en el período seleccionado.<br>b) Usuario autenticado con rol de Administrador o Encargado. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Navegar al módulo de **"Reportes de Ventas"** y aplicar filtro por fechas. | Se muestra la tabla de ventas consolidadas en pantalla con tarjetas KPI. | Satisfactorio |
| 2 | Presionar el botón **"Exportar Excel (.xlsx)"**. | El cliente solicita `GET /api/reports/sales/export?format=excel`. | Satisfactorio |
| 3 | Evaluar la respuesta del servidor. | Código `HTTP 200 OK`, `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. | Satisfactorio |
| 4 | Abrir el archivo descargado en Microsoft Excel / LibreOffice Calc. | Se visualiza el membrete corporativo, cabeceras en azul marino, celdas en formato moneda y la celda total contiene la fórmula viva `=SUM(G5:G25)`. | Satisfactorio |

| Responsable | Administrador de Empresa |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Exportación Editorial de Reporte de Ventas a PDF Apaisado con NumberedCanvas (Sunny Day)

| Caso de uso 21 | Exportación Editorial de Reporte de Ventas a PDF Apaisado de Alta Fidelidad |
| :--- | :--- |
| **Descripción** | Permite generar y descargar un documento PDF formal con orientación horizontal `landscape(letter)`, membrete vectorial de la empresa, tarjetas KPI estilizadas, tabla formateada y paginación dinámica "Página X de Y" mediante ReportLab. |
| **Precondiciones** | a) Ventas registradas en la base de datos.<br>b) Razón social y datos de empresa configurados en el tenant. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | En la pantalla de reportes de ventas, presionar **"Exportar PDF Oficial"**. | Se emite la petición `GET /api/reports/sales/export?format=pdf`. | Satisfactorio |
| 2 | Inspeccionar cabeceras HTTP de la respuesta. | Código `HTTP 200 OK`, `Content-Type: application/pdf`, encabezado binario `%PDF-1.4`. | Satisfactorio |
| 3 | Abrir el documento en el visor PDF integrado. | El documento presenta orientación apaisada, logotipo corporativo, tabla con filas cebradas alternas y pie de página exacto *"Página 1 de 2"* gestionado por `NumberedCanvas`. | Satisfactorio |

| Responsable | Administrador de Empresa / Diseñador UI |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Filtrado Dinámico de Columnas y Restricción por Sucursal para Rol Encargado (Rainy Day / Seguridad)

| Caso de uso 21 | Proyección Dinámica de Columnas y Aislamiento de Sucursal para Encargado |
| :--- | :--- |
| **Descripción** | Valida que la exportación respete la selección dinámica de columnas efectuada por el usuario en el frontend (`columns=product_name,variant_sku,gross_sales`) y restrinja los datos a la sucursal asignada si el rol es Encargado. |
| **Precondiciones** | a) Usuario autenticado con rol `encargado` asignado exclusivamente a "Sucursal Norte". |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Desmarcar columnas accesorias en el panel "Columnas Visibles" y seleccionar exportar PDF. | El documento resultante contiene única y exclusivamente las columnas seleccionadas sin desalinear la tabla. | Satisfactorio |
| 2 | Inspeccionar el desglose de ventas en el reporte generado por el Encargado. | Únicamente figuran ventas de la "Sucursal Norte"; los datos de Sucursal Central están excluidos. | Satisfactorio |
| 3 | Intentar solicitar ventas globales pasando parámetros forzados. | El backend ignora el parámetro ajeno y filtra por la sucursal del token JWT del usuario. | Satisfactorio |

| Responsable | QA Tester / Ingeniero Backend |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU22: Generar Dataset Sintético de Ventas y Estacionalidad Textil (Pipeline ML)

#### Prueba 1: Generación Estocástica Vectorial de Dataset Textil con Estacionalidad Boliviana (Sunny Day)

| Caso de uso 22 | Generar Dataset Sintético de Ventas y Estacionalidad Textil |
| :--- | :--- |
| **Descripción** | Permite al administrador o científico de datos sintetizar un histórico transaccional realista para entrenamiento de modelos de Machine Learning, modelando patrones de estacionalidad comercial boliviana (Navidad, San Juan, Día de la Madre) y efectos de quincena y fin de mes. |
| **Precondiciones** | a) Tenant con Plan Profesional o Empresarial (`has_ai_access: True`).<br>b) Configuración de parámetros de generación: 500 registros, rango de fechas y sucursales. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a **"Inteligencia Analítica"** $\\rightarrow$ **"Dataset Sintético ML"**. | Se despliega el panel de control estocástico con deslizadores de volumen y ponderaciones estacionales. | Satisfactorio |
| 2 | Configurar parámetros: 1,000 registros, aplicar curva estacional textil y presionar **"Generar Dataset"**. | Se emite petición `POST /api/ml/synthetic-dataset/generate`. | Satisfactorio |
| 3 | Evaluar la ejecución del pipeline vectorial con NumPy y Pandas. | El servicio sintetiza los registros vectorialmente en $< 600$ ms respetando las proporciones por talla. | Satisfactorio |
| 4 | Comprobar respuesta devuelta. | Código `HTTP 200 OK`. Retorna metadatos: `total_records: 1000`, distribución por prenda y resumen de varianza estacional. | Satisfactorio |

| Responsable | Científico de Datos / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Bloqueo de Generación de Dataset para Tenants en Plan Básico (Rainy Day - Gobernanza SaaS)

| Caso de uso 22 | Bloqueo de Pipeline de Datos Sintéticos para Suscriptores Básicos |
| :--- | :--- |
| **Descripción** | Comprueba que las empresas sin suscripción a módulos avanzados de Machine Learning no puedan invocar la síntesis masiva de datos en los servidores del SaaS. |
| **Precondiciones** | a) Usuario autenticado con token JWT de tenant en Plan Básico. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Enviar petición `POST /api/ml/synthetic-dataset/generate` con credenciales del Plan Básico. | El middleware de cuotas intercepta la solicitud antes de ejecutar los módulos analíticos. | Satisfactorio |
| 2 | Evaluar código de estado y cuerpo de respuesta. | Código `HTTP 403 Forbidden` con mensaje: *"Capacidad no autorizada para el plan contratado"*. | Satisfactorio |
| 3 | Verificar recursos del servidor. | Cero consumo de ciclos de CPU de NumPy/Pandas para el tenant no autorizado. | Satisfactorio |

| Responsable | QA Tester / Ingeniero de Seguridad |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Descarga en Streaming de Archivo CSV con Codificación UTF-8 (Sunny Day / Exportación)

| Caso de uso 22 | Descarga de Dataset Generado en Formato CSV UTF-8 |
| :--- | :--- |
| **Descripción** | Permite descargar el dataset generado en formato CSV plano con codificación UTF-8 e inyección de metadatos de columnas requeridas para el entrenamiento de Scikit-Learn. |
| **Precondiciones** | a) Dataset sintético generado satisfactoriamente en memoria o base de datos. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Presionar el botón **"Descargar Dataset CSV"** en la interfaz analítica. | El cliente solicita `GET /api/ml/synthetic-dataset/export?format=csv`. | Satisfactorio |
| 2 | Verificar cabeceras de transferencia. | Código `HTTP 200 OK`, `Content-Type: text/csv; charset=utf-8`, nombre de archivo con timestamp. | Satisfactorio |
| 3 | Inspeccionar las cabeceras de columnas del archivo descargado. | Incluye: `sale_date`, `branch_id`, `product_id`, `size_code`, `unit_price`, `quantity`, `is_holiday_season`. | Satisfactorio |

| Responsable | Científico de Datos / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU23: Predecir Demanda de Ropa por Talla (ML Supervisado - RandomForestRegressor)

#### Prueba 1: Entrenamiento y Calibración del Modelo Predictivo Supervisado (Sunny Day)

| Caso de uso 23 | Predecir Demanda de Ropa por Talla (ML Supervisado - RandomForestRegressor) |
| :--- | :--- |
| **Descripción** | Permite entrenar y ajustar un modelo de regresión supervisado basado en *RandomForestRegressor* de Scikit-Learn utilizando el histórico de ventas reales y sintéticas, alcanzando un coeficiente de determinación $R^2 \ge 0.80$. |
| **Precondiciones** | a) Histórico de ventas con al menos 100 registros con diferenciación de talla.<br>b) Tenant con Plan Profesional habilitado. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Ingresar a la pestaña **"Predicción de Demanda"** y seleccionar prenda modelo. | Se cargan los parámetros del ensamble: 100 árboles de decisión (`n_estimators=100`), profundidad controlada. | Satisfactorio |
| 2 | Presionar el botón **"Entrenar Modelo Predictivo"**. | Se ejecuta `POST /api/ml/demand-forecast/train`. | Satisfactorio |
| 3 | Inspeccionar métricas de ajuste devueltas por el backend. | Código `HTTP 200 OK`. Retorna métricas de validación: $R^2 = 0.865$, $MAE = 3.2$ unidades, $RMSE = 4.1$. | Satisfactorio |
| 4 | Comprobar persistencia del modelo. | Los pesos e hiperparámetros se serializan y asientan en la base de datos vinculados al `tenant_id`. | Satisfactorio |

| Responsable | Científico de Datos / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Inferencia de Demanda a N Semanas por Talla y Alertas de Quiebre de Stock (Sunny Day)

| Caso de uso 23 | Inferencia de Demanda Proyectada y Alerta Temprana de Quiebre |
| :--- | :--- |
| **Descripción** | Valida la proyección de ventas futuras para un horizonte de 4 semanas desagregado por talla (S, M, L, XL), contrastando la demanda esperada contra el inventario actual para emitir recomendaciones de reabastecimiento. |
| **Precondiciones** | a) Modelo supervisado entrenado y activo.<br>b) Inventario actual registrado en las sucursales. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Seleccionar horizonte de predicción de 4 semanas y presionar **"Calcular Inferencia"**. | La aplicación consulta el endpoint `GET /api/ml/demand-forecast/predict?weeks=4`. | Satisfactorio |
| 2 | Verificar visualización en gráfica de proyección por talla. | Se grafican barras agrupadas con la demanda esperada: Talla S (45 u), M (82 u), L (74 u), XL (28 u). | Satisfactorio |
| 3 | Evaluar sección de alertas tempranas. | Si para Talla M el stock actual es 20 y la demanda proyectada es 82, el sistema resalta en rojo: *"Riesgo inminente de rotura de stock en Talla M: reabastecer 62 unidades"*. | Satisfactorio |

| Responsable | Gerente de Compras / Administrador |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Bloqueo de Acceso a Predicción de Demanda para Plan Básico (Rainy Day - Gobernanza SaaS)

| Caso de uso 23 | Denegación de Servicio Predictivo ante Suscripción Básica |
| :--- | :--- |
| **Descripción** | Comprueba que cualquier intento de invocar el pipeline de entrenamiento o inferencia predictiva desde un tenant sin plan analítico sea bloqueado con código 403. |
| **Precondiciones** | a) Credenciales de acceso de empresa en Plan Básico. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Emitir petición `POST /api/ml/demand-forecast/train` con el token de tenant básico. | El backend rechaza la transacción con código `HTTP 403 Forbidden`. | Satisfactorio |
| 2 | Emitir petición `GET /api/ml/demand-forecast/predict` con el mismo token. | Se retorna código `HTTP 403 Forbidden` indicando la necesidad de actualizar a Plan Profesional. | Satisfactorio |
| 3 | Comprobar que no se alteren tablas ni se invoque Scikit-Learn. | Cero ejecución de algoritmos en el servidor. | Satisfactorio |

| Responsable | QA Tester / Ingeniero Backend |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU24: Segmentar Clientes con K-Means (ML No Supervisado - RFM + Retorno)

#### Prueba 1: Entrenamiento de Clustering K-Means y Clasificación de Perfiles (Sunny Day)

| Caso de uso 24 | Segmentar Clientes con K-Means (ML No Supervisado - RFM + Retorno) |
| :--- | :--- |
| **Descripción** | Permite agrupar a la base de clientes en clústeres conductuales homogéneos aplicando el algoritmo no supervisado K-Means sobre las dimensiones de Recencia, Frecuencia, Valor Monetario y Tasa de Devolución (RFM+D). |
| **Precondiciones** | a) Base de clientes con transacciones registradas en el tenant.<br>b) Modelo configurado con $k=4$ clústeres conductuales. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Acceder a **"Segmentación de Clientes (K-Means)"** en el panel analítico. | Se despliega la pantalla con configuración de clústeres ($k=4$: Campeones, Leales, En Riesgo, Ocasionales). | Satisfactorio |
| 2 | Presionar el botón **"Ejecutar Segmentación"**. | Se emite la petición `POST /api/ml/customer-segmentation/train`. | Satisfactorio |
| 3 | Evaluar la respuesta del algoritmo K-Means. | Código `HTTP 200 OK`. Retorna centroides estandarizados, inercia del modelo y asignación de clúster para cada cliente. | Satisfactorio |
| 4 | Verificar persistencia de etiquetas en base de datos. | La tabla `customer_segments` actualiza el segmento asignado y la fecha de cálculo. | Satisfactorio |

| Responsable | Científico de Datos / Encargado de Marketing |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Visualización de Gráfico de Dispersión 2D y Drill-Down Paginado (Sunny Day)

| Caso de uso 24 | Visualización de Scatter Plot 2D y Detalle Paginado de Clientes |
| :--- | :--- |
| **Descripción** | Comprueba la representación gráfica del mapa de dispersión bidimensional (Recencia vs. Gasto Monetario) con coloreado por segmento y la navegación paginada de clientes clasificados. |
| **Precondiciones** | a) Segmentación K-Means previamente calculada y persistida. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Consultar la gráfica interactiva en la pestaña de resultados. | El gráfico de dispersión 2D renderiza los puntos de clientes con códigos de color diferenciados por clúster. | Satisfactorio |
| 2 | Posicionar el cursor sobre un punto del gráfico. | Se muestra tooltip con el nombre del cliente, ticket promedio, recencia y tasa de retorno. | Satisfactorio |
| 3 | Inspeccionar la tabla inferior paginada (`GET /api/ml/customer-segmentation/customers?page=1`). | Retorna lista de clientes paginada (10 por página) con su clasificación y métricas RFM. | Satisfactorio |

| Responsable | Encargado de Marketing / Diseñador UI |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Bloqueo de Segmentación No Supervisada para Plan Básico (Rainy Day - Gobernanza SaaS)

| Caso de uso 24 | Restricción de Segmentación Analítica para Suscripción Básica |
| :--- | :--- |
| **Descripción** | Valida que las peticiones a los endpoints de segmentación por K-Means sean denegadas si la empresa suscriptora cuenta únicamente con el Plan Básico. |
| **Precondiciones** | a) Token JWT emitido para empresa suscrita a Plan Básico. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Ejecutar petición `POST /api/ml/customer-segmentation/train` con token básico. | El backend verifica las cuotas de características y bloquea la llamada con `HTTP 403 Forbidden`. | Satisfactorio |
| 2 | Ejecutar petición `GET /api/ml/customer-segmentation/customers` con dicho token. | La respuesta es denegada con código `HTTP 403 Forbidden` preservando la política SaaS. | Satisfactorio |

| Responsable | QA Tester / Ingeniero de Seguridad |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

### CU25: Visualizar Dashboard Ejecutivo con KPIs y Métricas ML

#### Prueba 1: Consulta de Métricas Consolidadas en Tiempo Real (Sunny Day)

| Caso de uso 25 | Visualizar Dashboard Ejecutivo con KPIs y Métricas ML |
| :--- | :--- |
| **Descripción** | Permite a la gerencia ejecutiva visualizar en una única vista unificada los principales indicadores de rendimiento (KPIs) del negocio: volumen de ventas, ingresos brutos, stock disponible, reservas activas y comparativa entre sucursales. |
| **Precondiciones** | a) Usuario autenticado con rol Administrador o Superadmin.<br>b) Transacciones comerciales registradas en el período. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Iniciar sesión y acceder a la pantalla principal de **"Dashboard Ejecutivo"**. | Se emite la petición `GET /api/dashboard?period=day`. | Satisfactorio |
| 2 | Evaluar la estructura JSON devuelta por el servicio. | Código `HTTP 200 OK`. Retorna bloques agregados: `summary`, `sales_series`, `branch_kpis`, `plan_quotas`. | Satisfactorio |
| 3 | Verificar renderizado de tarjetas métricas en el frontend. | Muestra tarjetas numéricas de Total Ventas, Ticket Promedio, Unidades Vendidas y Nivel de Cumplimiento de Cuotas. | Satisfactorio |

| Responsable | Gerente General / Administrador |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 2: Integración de Métricas Offline, Políticas y Machine Learning (Sunny Day)

| Caso de uso 25 | Conciliación de Métricas Offline, Políticas P-Ten y Módulos ML |
| :--- | :--- |
| **Descripción** | Comprueba que el Dashboard Ejecutivo integre con exactitud matemática las métricas operativas de contingencia offline (`offline_sync`), ingresos retenidos por políticas de devolución/cambio (`policy_revenue`) y proyecciones de Machine Learning. |
| **Precondiciones** | a) Empresa con Plan Profesional activo.<br>b) Existencia de ventas offline sincronizadas, cambios con diferencia y modelos ML entrenados. |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Inspeccionar la sección *"Operaciones en Contingencia"* del Dashboard. | Muestra la tasa de sincronización de lotes (ej. 98.5%) y monto total transaccionado offline. | Satisfactorio |
| 2 | Inspeccionar la sección *"Ingresos por Políticas de Tienda"*. | Concilia los montos retenidos por devoluciones (20%-50%) y los cobros de diferencias en cambios de talla. | Satisfactorio |
| 3 | Inspeccionar la sección *"Inteligencia Predictiva ML"*. | Muestra `has_ml_access: True`, unidades proyectadas para el mes y distribución porcentual de los clústeres K-Means. | Satisfactorio |

| Responsable | Gerente Financiero / QA Tester |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |

---

#### Prueba 3: Manejo Seguro y Degradación Grácil ante Plan Básico sin Acceso a ML (Rainy Day / Degradación Grácil)

| Caso de uso 25 | Degradación Grácil del Dashboard Ejecutivo para Empresas en Plan Básico |
| :--- | :--- |
| **Descripción** | Verifica que cuando una empresa con Plan Básico accede al Dashboard Ejecutivo, el sistema entregue todas las métricas operativas estándar y devuelva `has_ml_access: False` sin provocar errores 500, excepciones no controladas ni quiebre visual de la interfaz. |
| **Precondiciones** | a) Empresa autenticada en Plan Básico (`has_ai_access: False`, límite de 2 sucursales). |

| Paso | Acción | Resultado esperado | Estado (Satisfactorio/Fallido) |
| :---: | :--- | :--- | :---: |
| 1 | Iniciar sesión con usuario de empresa en Plan Básico y cargar el Dashboard. | Se emite la petición `GET /api/dashboard`. | Satisfactorio |
| 2 | Evaluar la respuesta del backend. | Código `HTTP 200 OK` (sin errores 500 ni 403). `has_ml_access: False`, `plan_quotas.max_branches: 2`. | Satisfactorio |
| 3 | Inspeccionar el comportamiento de la interfaz gráfica. | El panel de ventas y stock funciona de forma impecable; la sección de ML muestra un banner promocional informativo invitando a mejorar al Plan Profesional. | Satisfactorio |

| Responsable | QA Tester / Diseñador Frontend |
| :--- | :--- |
| **Resultado de la prueba** | Satisfactorio |
| **Adjunto (Interfaz, consultas, reportes, otros)** | |
