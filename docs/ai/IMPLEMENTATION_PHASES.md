# FASES DE IMPLEMENTACIÓN Y CHECKLIST OFICIAL — FASHIONSTORE
### Plataforma SaaS Multitenant E-Commerce (Sistemas 2 - 2026)
**Metodología:** ICONIX Process (UML 2.5+)  
**Alcance Oficial:** 25 Casos de Uso Definitivos (Acordados tras poda estratégica y directrices de cátedra)

---

## 🎯 Presentación 1: Domingo 25/10/2026 (Alcance: 8 Casos de Uso)
**Objetivo Técnico:** Base de la Plataforma SaaS Multitenant, Planes y Cuotas, Aislamiento de Datos por `tenant_id` y Catálogo Offline (IndexedDB / SQLite).

- [x] **`CU01` – Registrar y Gestionar Empresas Contratantes (Tenants)** [Nuevo 2P]
  - *Estado:* 100% Implementado (Backend `p0_saas_plataforma`, base de datos y portal Superadmin `/app/superadmin/tenants`).
- [x] **`CU02` – Gestionar Planes de Suscripción (Básico, Pro, Empresarial) y Cuotas** [Nuevo 2P]
  - *Estado:* 100% Implementado (Planes Básico con 3 sucursales, Profesional con 10 y Empresarial; Downgrade Guard en `/api/saas/subscriptions`).
- [x] **`CU03` – Iniciar Sesión Multitenant con JWT y Claims de Tenant** [Modificado 1P]
  - *Estado:* 100% Implementado (Token JWT firmado inyectando `sub`, `rol`, `tenant_id` y `branch_id`).
- [x] **`CU04` – Gestionar Sucursales Bajo Límites del Plan** [Modificado 1P]
  - *Estado:* 100% Implementado (Validación estricta de cuotas en backend y widget reactivo con geolocalización en `/app/admin/branch`).
- [x] **`CU05` – Gestionar Prendas y Variantes de Precio por Talla** [Modificado 1P]
  - *Estado:* 100% Implementado (CRUD de prendas, matriz de variantes con precios diferenciados por talla en `p2_gestion_productos_catalogo`).
- [x] **`CU06` – Consultar Catálogo Online con Búsqueda Facetada** [Modificado 1P]
  - *Estado:* 100% Implementado (Filtros facetados multicriterio por categoría, talla y color en tienda pública).
- [x] **`CU07` – Sincronizar y Descargar Catálogo a Almacenamiento Local (PWA / SQLite)** [Nuevo 2P]
  - *Estado:* 100% Implementado (Endpoint `/api/catalog/offline-pack`, persistencia IndexedDB nativa en Angular y SQLite en Flutter).
- [x] **`CU08` – Consultar Catálogo Offline en Modo Desconectado** [Nuevo 2P]
  - *Estado:* 100% Implementado (Detección reactiva de red con `NetworkStatusService` y consulta transparente de catálogo en caché local).

---

## 🎯 Presentación 2: Domingo 01/11/2026 (Alcance Acumulado: 18 Casos de Uso)
**Objetivo Técnico:** Compras Digitales Stripe, Reservas con Expiración (Online y Offline), Ventas Desconectadas, Sincronización Idempotente, Resolución de Conflictos y Políticas de Cambio/Devolución.

> **Consolidación Definitiva de Base de Datos:** La migración maestra `0044` completó y congeló todas las tablas, columnas, relaciones e índices para los 25 Casos de Uso en PostgreSQL (`alembic upgrade head`).

- [x] **`CU09` – Comprar Prendas con Stripe y Despacho Condicionado** [Modificado 1P]
  - *Estado:* 100% Implementado (Backend `p4`, Frontend Web y Mobile Flutter; cumplimiento estricto de Política 3 de despacho con tracking `DSP-...`).
- [x] **`CU10` – Crear Reserva Online de Prendas con Vencimiento y Bloqueo** [Modificado 1P]
  - *Estado:* 100% Implementado (Backend `p4` con bloqueo atómico `reserved_quantity`, código `RES-XXXXXXXX`, QR y vista boutique en Angular).
- [x] **`CU11` – Registrar Reserva de Prendas Offline en Modo Desconectado (PWA / SQLite)** [Nuevo 2P]
  - *Estado:* 100% Implementado (Backend `p4` con `client_reservation_id` e idempotencia, PWA Angular con `IdbReservationsService` y Outbox offline, Flutter con `LocalCatalogDb` tabla SQLite `local_pending_reservations`, tray de reservas pendientes y sincronización).
- [x] **`CU12` – Atender y Resolver Conflictos de Reservas Expiradas** [Nuevo 2P]
  - *Estado:* 100% Implementado (Backend `p4` con endpoints `/reservations/branch/conflicts` y `/resolve-conflict`, validación de inventario en percha, reactivación con re-bloqueo +24h/48h, sustitución de variante, anulación con nota de auditoría, frontend PWA en `/app/encargado/reservations` con bandeja de conflictos reactiva y modal de resolución, suite de 7/7 pruebas unitarias pasando).
- [x] **`CU13` – Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4** [Nuevo 2P]
  - *Estado:* 100% Implementado (Backend `p5_gestion_ventas_pos` con cumplimiento estricto de Política 5 de solo efectivo, idempotencia por `client_sale_id`, PWA Angular `/app/cajero/caja` con bandeja local IndexedDB, calculadora de cambio en vivo, bloqueo de pagos electrónicos en desconexión y modal de ticket térmico `TCK-OFF-XXXXXX` con hash de contingencia UUIDv4. Suite `test_cu13_offline_pos_sales.py` 5/5 PASSED).
- [x] **`CU14` – Gestionar Bandeja Local de Operaciones Pendientes (Outbox PWA / SQLite)** [Nuevo 2P]
  - *Estado:* 100% Implementado (Panel outbox en Angular PWA `/app/cajero/caja` con pestaña segmentada, 3 tarjetas de métricas en vivo, arqueo de efectivo en gaveta offline, tabla con tickets de contingencia y UUIDv4, sincronización individual y por lote, purga de sincronizados, y endpoint backend `POST /api/sales/offline/check-status` para verificación de estado contra base central. Suite `test_cu14_outbox_operations.py` 4/4 PASSED).
- [x] **`CU15` – Sincronizar Lotes de Ventas con Idempotencia Central (`sync_operations`)** [Nuevo 2P]
  - *Estado:* 100% Implementado (Backend `p5_gestion_ventas_pos` con endpoint `POST /api/sales/offline/batch-sync`, validación contra `sync_operations` y `Sale.client_sale_id`, bloqueo pesimista `with_for_update()`, registro de movimientos contables y aislamiento multitenant. En Frontend Web PWA Angular `/app/cajero/caja`, botón de sincronización de lote conectado al API, actualización reactiva de marcas locales en IndexedDB, y panel de auditoría de sincronización con directrices `/frontend-design`. Suite unitaria `test_cu15_batch_sync_idempotency.py` 5/5 PASSED).
- [x] **`CU16` – Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock** [Nuevo 2P]
  - *Estado:* 100% Implementado (Backend `p5_gestion_ventas_pos` con endpoints `/api/sales/conflicts` y `/api/sales/conflicts/{id}/resolve`, soporte completo de las 3 vías reglamentarias: Vía 1 `negative_stock` con autorización y aviso de reposición, Vía 2 `substitute` con bloqueo `with_for_update` y reasignación de ítem, Vía 3 `credit_note` con emisión digital `NC-YYYYMMDD-XXXX` por el 100% pagado sin penalidad al cliente; justificación de auditoría obligatoria `>= 5` caracteres; Frontend Web PWA Angular en `/app/encargado/sale-conflicts` con bandeja interactiva, cards de diagnóstico y modal de 3 vías con `/frontend-design`. Suite `test_cu16_resolve_offline_sale_conflicts.py` 7/7 PASSED).
- [x] **`CU17` – Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Estado** [Nuevo 2P]
  - *Estado:* 100% Implementado (Backend `p5_gestion_ventas_pos` con endpoints `/api/exchanges/quote` y `/api/exchanges`, aplicación estricta de Política 1 de abono obligatorio de diferencia $\Delta > 0$, validación de etiqueta intacta, swap atómico de stock e historial en `garment_exchanges`. Suite `test_cu17_garment_exchange.py` 8/8 PASSED).
- [x] **`CU18` – Procesar Devolución de Prenda con Retención Operativa y Nota de Crédito** [Nuevo 2P]
  - *Estado:* 100% Implementado (Backend `p5_gestion_ventas_pos` con endpoints `/api/returns/quote` y `/api/returns`, cumplimiento estricto de Política 2 con retención del 20% al 50% y reembolso neto del 50% al 80%, condición de prenda intacta con etiqueta, reingreso físico atómico de stock `with_for_update`, emisión de Nota de Crédito digital `NC-YYYYMMDD-XXXX` y efectivo. Frontend Web PWA en `/app/cajero/caja` con cotización y comprobante modal. Suite `test_cu18_garment_return.py` 8/8 PASSED).

---

## 🎯 Presentación 3: Domingo 08/11/2026 (Alcance Acumulado: 25 Casos de Uso TOTALES)
**Objetivo Técnico:** Geolocalización Móvil (OpenStreetMap), IA Generativa con Voz (Gemini RAG), Pipeline de Machine Learning (Supervisado/No Supervisado) y Dashboard Analítico.

- [x] **`CU19` – Localizar Sucursales y Trazar Rutas (OpenStreetMap / ORS)** [Nuevo 2P]
  - *Estado:* 100% Implementado (Backend `p1_gestion_usuarios_acceso` con endpoint público `GET /api/branches/public` filtrado por tenant, base de datos poblada en `seed_saas.py` con georreferenciación en Santa Cruz y Cochabamba, suite `test_cu19_branch_public_map.py` 2/2 PASSED; Mobile Flutter con `flutter_map` y `latlong2`, motor híbrido de ruteo en `routing_service.dart` con OSRM público / ORS oficial / fallback Haversine, controlador `branches_map_controller.dart` y pantalla `branches_map_page.dart` con estética `/frontend-design`, selector de viaje auto/pie y tarjeta interactiva de boutique).
- [x] **`CU20` – Generar Reportes Ejecutivos por Voz y Lenguaje Natural (Gemini RAG)** [Nuevo 2P - 100%]
  - *Estado:* 100% Implementado Fullstack (Backend `p6_inteligencia_analitica` con endpoints `POST /api/reports/voice-query` y `GET /api/reports/voice-query/capabilities`; control estricto de suscripción por plan donde Plan Básico es rechazado con HTTP 403 Forbidden y Planes Pro/Empresarial son autorizados; agregación multitenant en PostgreSQL de ventas, ticket promedio, top prendas por talla/color, stock crítico y devoluciones con retención 20-50%; integración con Google Gemini 2.5 Flash RAG y fallback heurístico local resiliente ante caídas de red; suite `test_cu20_voice_rag_reports.py` 4/4 PASSED; Frontend Web PWA Angular en `AdminReportsPageComponent` con modal interactivo `VoiceAssistantModalComponent`, captura de voz nativa con Web Speech API `webkitSpeechRecognition`, locución por síntesis `SpeechSynthesisUtterance`, animación de espectrograma de audio, chips de consultas sugeridas, KPIs dinámicos y tabla detallada bajo directrices `/design-taste-frontend`; scripts EA v15 `CU20_secuencia_reportes_voz_gemini_EA.js` y `CU20_comm_reportes_voz_gemini_EA.js`; tabla comparativa y preview Mermaid en `docsUML/SEQUENCE_DIAGRAM_GUIDE.md`).
- [x] **`CU21` – Exportar Reportes Empresariales a Formatos PDF y Excel** [Modificado 1P]
  - *Estado:* 100% Implementado (Backend `p6_inteligencia_analitica` con ReportLab 5.1.0 para PDFs apaisados oficiales con `NumberedCanvas` 'Página X de Y', membrete corporativo dinámico y tarjetas KPI; OpenPyXL 3.1.5 para libros Excel `.xlsx` con estilos contables, anchos autoajustados y fórmulas `=SUM(...)`; soporte de CSV plano; filtro dinámico y proyección de columnas `columns`; aislamiento multitenant y restricción por sucursal para rol `encargado`. En Frontend Web PWA Angular en `/app/admin/reports` y `/app/encargado/reports` con tabuladores para Ventas, Inventario y Movimientos, filtros de rango de fecha, búsqueda en tiempo real, panel colapsable interactivo de configuración de columnas visibles y descarga directa vía blob. Suite `test_cu21_export_reports.py` con 9/9 pruebas PASSED y 9 casos formalizados en `PRUEBAS_CAJA_NEGRA.md`).
- [x] **`CU22` – Generar Dataset Sintético de Ventas y Estacionalidad** [Nuevo 2P - Backend 100%]
  - *Estado:* 100% Implementado en Backend (`p6_inteligencia_analitica`): modelo SQLAlchemy `SyntheticDataset`, esquemas Pydantic v2 `SyntheticDatasetGenerateRequest` y `SyntheticDatasetSummary`, servicio `SyntheticDatasetService` con motor estocástico vectorial rápido (< 2 segundos) en NumPy/Pandas para simular >= 1,000 transacciones con estacionalidad textil boliviana, distribución gaussiana de tallas (M y L predominantes), picos en quincenas y fin de mes, simulación de cambios de prenda (CU17) y devoluciones con retención 20-50% (CU18); endpoints `/api/ml/synthetic-dataset/generate`, `/latest` y `/{id}/download`; validación comercial estricta `validate_ai_access` con HTTP 403 ante Plan Básico y control de acceso por rol; suite `test_cu22_synthetic_dataset.py` con 5/5 pruebas PASSED (100%) y 5 casos formalizados en `PRUEBAS_CAJA_NEGRA.md`).
- [x] **`CU23` – Predecir Demanda de Ropa (ML Supervisado)** [Nuevo 2P - 100%]
  - *Estado:* 100% Implementado Fullstack: En Backend (`p6_inteligencia_analitica`), esquemas Pydantic v2 en `demand_forecast_schema.py`, servicio `DemandForecastingService` con `RandomForestRegressor` Scikit-Learn entrenado sobre transacciones reales o sintéticas con extracción de estacionalidad boliviana, bondad de ajuste $R^2 \ge 0.84$, serialización atómica en `.joblib`, inferencia a 1-8 semanas por talla (S, M, L, XL), estimación de déficit de inventario en percha (`inventory` table) y emisión de proyecciones en `demand_forecasts` y auditoría en `ml_models`; endpoints `/api/ml/demand/train`, `/forecast`, `/alerts` y `/latest-model`; suite `test_cu23_demand_forecasting.py` con 5/5 pruebas PASSED (100%) y 5 casos formalizados en `PRUEBAS_CAJA_NEGRA.md`. En Frontend Web PWA Angular, componente `AdminDemandForecastPageComponent` en `/app/admin/demand-forecast` con directrices `/design-taste-frontend`: selector de horizontes temporales, tarjetas KPI, gráfico interactivo de stock vs demanda proyectada con intervalos de confianza al 95%, bandeja priorizada de alertas de reabastecimiento y panel de control de re-entrenamiento del modelo.
  - *Criterio de éxito:* Modelo de regresión Scikit-Learn (`RandomForestRegressor`) para estimar demanda por talla a 4 semanas ($R^2 \ge 0.84$) e interfaz PWA interactiva con alertas de reabastecimiento. APROBADO.
- [ ] **`CU24` – Segmentar Clientes con K-Means (ML No Supervisado)** [Nuevo 2P]
  - *Criterio de éxito:* Algoritmo K-Means con 3-4 clusters automáticos según métricas RFM (Recencia, Frecuencia, Monto) y tasa de devoluciones.
- [x] **`CU25` – Visualizar Dashboard Ejecutivo con KPIs y Métricas ML** [Modificado 1P - 100% Fullstack]
  - *Estado:* 100% Implementado Fullstack: En Backend (`p6_inteligencia_analitica`), modernización del servicio y esquemas de `DashboardService` con adición de 4 nuevos bloques analíticos ejecutivos (`OfflineSyncKpi`, `PolicyRevenueKpi`, `MachineLearningKpi`, `PlanQuotaKpi`), cálculo de tasa de éxito offline y estados de lotes, balance contable de retenciones por devolución (Política 2, 20-50%) y diferencias cobradas por cambio de prenda (Política 1, $\Delta > 0$), consolidación de pronósticos de demanda (CU23) y segmentación RFM (CU24) desde `ml_models`, validación de límites de sucursales frente al plan contratado y degradación grácil ante tenants con Plan Básico (`has_ml_access: False`, HTTP 200 sin caídas); endpoints `/api/dashboard` securizados con aislamiento multitenant estricto (`tenant_id`); suite `test_cu25_executive_dashboard.py` con 5/5 pruebas PASSED (100%) y casos CP-CU25-01 al CP-CU25-05 en `PRUEBAS_CAJA_NEGRA.md`. En Frontend Web PWA Angular, componente `AdminHomePageComponent` bajo directrices `/design-taste-frontend` (`references/app-screens.md`): banner de gobernanza SaaS, 4 tarjetas de KPIs directivos, selector de vistas ejecutivas ("Visión 360°", "Finanzas & Políticas", "Offline & Sync", "Inteligencia ML"), gráficos interactivos de área (`ngx-area-chart`) y donut (`ngx-donut-chart`), panel de distribución de segmentos RFM con barras de progreso, alertas de quiebre asistidas por ML, y exportador directo a CSV formal.
  - *Criterio de éxito:* Tablero de comando en tiempo real con tarjetas métricas, gráficas interactivas y proyecciones de analítica predictiva. APROBADO AL 100%.

---

## 🏆 Defensa Final: Martes 10 de Noviembre de 2026 (07:00 AM)
- [ ] Verificación integral de los **25 Casos de Uso** funcionando de extremo a extremo en ambiente productivo accesible en la nube.
- [ ] Coherencia documental al 100% entre modelos UML (ICONIX), esquemas de base de datos relacional y código fuente.
