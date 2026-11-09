# HANDOFF LATEST — FASHIONSTORE SAAS MULTITENANT

## Estado de Relevo Operativo al 08/11/2026 (Cierre Backend CU25: Visualizar Dashboard Ejecutivo con KPIs y Métricas ML)

---

### 1. Avances Consolidados en esta Sesión

-3. **Implementación de Backend de CU25 (Visualizar Dashboard Ejecutivo con KPIs y Métricas ML):**
   - **Backend (p6_inteligencia_analitica):**
     - Schemas Pydantic v2 [dashboard_schema.py](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/schemas/dashboard_schema.py): OfflineSyncKpi, PolicyRevenueKpi, RfmSegmentPoint, MachineLearningKpi, PlanQuotaKpi integrados en DashboardResponse.
     - Servicio [dashboard_service.py](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/services/dashboard_service.py):
       - Conciliación de ventas offline y estado de operaciones en lote (sync_operations), calculando tasa porcentual de éxito de sincronización.
       - Balance contable de políticas de negocio inviolables: suma de retenciones del 20-50% en devoluciones (garment_returns) y diferencias cobradas $\Delta > 0$ en cambios (garment_exchanges).
       - Consolidación analítica de Machine Learning: suma de unidades de demanda proyectadas para el mes (CU23) y desglose porcentual de clústeres RFM de clientes (CU24).
       - Monitoreo de cuotas comerciales del plan SaaS: sucursales activas versus max_branches y acceso a IA.
       - Degradación grácil ante inquilinos con Plan Básico: respuesta exitosa HTTP 200 OK con has_ml_access: False sin colapsos por falta de permisos.
       - Aislamiento multitenant estricto en todas las agregaciones SQL.
     - Rutas REST en [dashboard_routes.py](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/routes/dashboard_routes.py): soporte para RolEnum.administrador y RolEnum.superadmin.
     - Suite automatizada [ackend/tests/test_cu25_executive_dashboard.py](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu25_executive_dashboard.py) con **5/5 pruebas PASSED (100%)**.
   - **Aseguramiento de Calidad:**
     - 5 casos de prueba formalizados en [docs/informes/PRUEBAS_CAJA_NEGRA.md](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/informes/PRUEBAS_CAJA_NEGRA.md) (CP-CU25-01 a CP-CU25-05).
     - Total acumulado del proyecto: **113/113 casos de prueba PASSED (100%)**.

-2. **Implementación de Backend de CU24 (Segmentar Clientes con K-Means - ML No Supervisado):**
   - **Backend (`p6_inteligencia_analitica`):**
     - Schemas Pydantic v2 [`customer_segmentation_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/schemas/customer_segmentation_schema.py): `SegmentationTrainRequest`, `CentroidMetrics`, `ClusterProfileSummary`, `SegmentationTrainResponse`, `ScatterPoint`, `SegmentationScatterResponse`, `CustomerSegmentItem`, `CustomerSegmentListResponse`.
     - Servicio [`customer_segmentation_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/services/customer_segmentation_service.py):
       - Gobernanza estricta con `validate_ai_access`: HTTP 403 Forbidden para Plan Básico, habilitado para Planes Pro y Empresarial (`has_ai_access=True`).
       - Extracción y vectorización de clientes en matriz numérica multidimensional RFM+D (Recencia, Frecuencia, Monto Monetario y Tasa de Retorno/Cambio).
       - Fallback y cold-start: Si el tenant tiene < 10 clientes reales, conmuta fluidamente a entrenar sobre cohortes coherentes a partir del dataset sintético generado en CU22.
       - Algoritmo Scikit-Learn `StandardScaler` + `KMeans(k=4, init="k-means++", n_init=10)`.
       - Métricas de calidad: Coeficiente Silhouette ($s \ge 0.50$) e inercia intra-clúster calculadas.
       - Asignación heurística de 4 perfiles conductuales desde los centroides desescalados: VIP / Embajadores, Compradores de Temporada, Cazadores de Ofertas y Perfil de Alto Retorno ($D > 30\%$).
       - Persistencia del artefacto serializado en `backend/app/data/models/` con `joblib`, registro en tabla `ml_models` y asignación de clientes en `customer_segments`.
     - Rutas REST en [`customer_segmentation_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/routes/customer_segmentation_routes.py) incorporadas a [`router.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/router.py).
     - Suite automatizada [`backend/tests/test_cu24_customer_segmentation.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu24_customer_segmentation.py) con **5/5 pruebas PASSED (100%)**.
   - **Aseguramiento de Calidad:**
     - 5 casos de prueba formalizados en [`docs/informes/PRUEBAS_CAJA_NEGRA.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/informes/PRUEBAS_CAJA_NEGRA.md) (`CP-CU24-01` a `CP-CU24-05`).
     - Total acumulado del proyecto: **108/108 casos de prueba PASSED (100%)**.


-1. **Implementación de Backend de CU23 (Predecir Demanda de Ropa por Talla - ML Supervisado):**
   - **Backend (`p6_inteligencia_analitica`):**
     - Schemas Pydantic v2 [`demand_forecast_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/schemas/demand_forecast_schema.py): `DemandTrainRequest`, `DemandTrainResponse`, `DemandForecastRequest`, `SizeForecastDetail`, `DemandForecastResponse`, `StockReorderAlert`.
     - Servicio [`demand_forecasting_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/services/demand_forecasting_service.py):
       - Gobernanza estricta con `validate_ai_access`: HTTP 403 Forbidden para Plan Básico, habilitado para Planes Pro y Empresarial.
       - Extracción y ensamblado de features: `size_code`, `month`, `day_of_month`, `week_of_year`, `day_of_week`, `is_cold_season`, `is_payday_window`, `unit_price`.
       - Pipeline con Scikit-Learn `RandomForestRegressor`: inferencia estocástica con ensamble de árboles, intervalo de confianza estadística y cálculo de bondad de ajuste ($R^2 \ge 0.84$, $MAE$, $RMSE$).
       - Serialización del artefacto `.joblib` particionado por tenant en `backend/app/data/models/{tenant_id}_demand_rf.joblib`.
       - Registro de trazabilidad y auditoría en tabla `ml_models`.
       - Inferencia semanal (1 a 8 semanas) por talla (S, M, L, XL), cálculo de desbalance versus inventario en percha (`inventory` table) y emisión de alertas de reabastecimiento en `demand_forecasts`.
     - Rutas REST en [`demand_forecast_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/routes/demand_forecast_routes.py) incorporadas a [`router.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/router.py):
       - `POST /api/ml/demand/train`: Entrena o recalibra el modelo predictivo del tenant.
       - `POST /api/ml/demand/forecast`: Genera proyecciones cuantitativas por talla a $N$ semanas con intervalos de confianza.
       - `GET /api/ml/demand/alerts`: Devuelve variantes con riesgo de quiebre de stock ordenadas por urgencia (ALTA, MEDIA, BAJA).
       - `GET /api/ml/demand/latest-model`: Retorna metadatos de auditoría del último modelo calibrado.
     - Suite automatizada [`backend/tests/test_cu23_demand_forecasting.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu23_demand_forecasting.py) con **5/5 pruebas PASSED (100%)**.
   - **Aseguramiento de Calidad:**
     - 5 casos de prueba formalizados en [`docs/informes/PRUEBAS_CAJA_NEGRA.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/informes/PRUEBAS_CAJA_NEGRA.md) (`CP-CU23-01` a `CP-CU23-05`).
     - Total acumulado del proyecto: **103/103 casos de prueba PASSED (100%)**.

0. **Implementación Fullstack de CU22 (Dataset Sintético de Moda Textil - Carril C):**
   - **Backend (`p6_inteligencia_analitica`):**
     - Modelo SQLAlchemy [`synthetic_dataset.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/models/synthetic_dataset.py): tabla `synthetic_datasets` con persistencia de metadatos, distribuciones por talla y categoría, tasas de cambio/devolución y ruta física de almacenamiento en CSV.
     - Esquemas Pydantic v2 [`synthetic_dataset_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/schemas/synthetic_dataset_schema.py): `SyntheticDatasetGenerateRequest` y `SyntheticDatasetSummary`.
     - Servicio [`synthetic_dataset_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/services/synthetic_dataset_service.py):
       - Gobernanza comercial de suscripción mediante `validate_ai_access`: deniega Plan Básico con HTTP 403 Forbidden y autoriza Planes Profesional o Empresarial.
       - Generación estocástica vectorial ultra-rápida (< 2 segundos para 10,000 registros) con NumPy y Pandas.
       - Modelado de estacionalidad boliviana (otoño/invierno meses 5-8 vs primavera/verano), picos de quincena (14-16) y fin de mes (28-31).
       - Distribución gaussiana de tallas (M=35%, L=25%, S=15%, XL=15%, XS=5%, XXL=5%).
       - Simulación de cambio de prenda por talla (CU17, ~10%) y devoluciones con retención del 20% al 50% (CU18, ~8%).
       - Aislamiento multitenant estricto (`tenant_id`, `branch_id`).
     - Rutas REST en [`synthetic_dataset_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/routes/synthetic_dataset_routes.py):
       - `POST /api/ml/synthetic-dataset/generate`: Genera el dataset histórico sintético.
       - `GET /api/ml/synthetic-dataset/latest`: Consulta metadatos del último dataset del tenant.
       - `GET /api/ml/synthetic-dataset/{dataset_id}/download`: Descarga en streaming del archivo CSV.
     - Suite automatizada [`backend/tests/test_cu22_synthetic_dataset.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu22_synthetic_dataset.py) con **5/5 pruebas PASSED (100%)**.
- **Frontend Web Angular 21 (PWA):**
     - Modelos en [`synthetic-dataset.model.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/models/synthetic-dataset.model.ts) y cliente HTTP en [`synthetic-dataset-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/services/synthetic-dataset-api.service.ts).
     - Componente [`admin-ml-dataset-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/admin/pages/admin-ml-dataset-page.component.ts) bajo directrices `/design-taste-frontend` (`app-screens.md`): interfaz de control estocástico con preajustes de volumen (1k a 25k) y meses (6m a 24m), switches de políticas comerciales CU17 y CU18, visualización de distribución gaussiana por tallas en barras proporcionales y descarga de archivo CSV.
     - Ruteo en [`app.routes.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/app.routes.ts) (`/app/admin/ml-dataset`) y acceso directo en sidebar de [`app-shell.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/layouts/app-shell.component.ts).
   - **Aseguramiento de Calidad:**
     - 5 casos de prueba formalizados en [`docs/informes/PRUEBAS_CAJA_NEGRA.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/informes/PRUEBAS_CAJA_NEGRA.md) (`CP-CU22-01` a `CP-CU22-05`).
     - Total acumulado del proyecto: **98/98 casos de prueba PASSED (100%)**.

1. **Implementación Backend y Diagramación ICONIX de CU20 (Gemini RAG con Voz):**
   - **Backend (`p6_inteligencia_analitica`):**
     - Schemas Pydantic en [`voice_report_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/schemas/voice_report_schema.py): `VoiceQueryRequest`, `ExecutiveKPICard`, `VoiceReportResponse`, `VoiceCapabilitiesResponse`.
     - Servicio [`gemini_rag_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/services/gemini_rag_service.py):
       - `verify_ai_access_for_tenant`: Gobernanza estricta de suscripciones (Plan Básico bloqueado con HTTP 403 Forbidden; Planes PRO y Empresarial permitidos con `has_ai_access`).
       - `build_tenant_rag_context`: Agregación multitenant en PostgreSQL de ventas, ticket promedio, top prendas (`SaleItem.line_total` agrupado por talla y color), stock crítico (<= 5 unidades), devoluciones con retención 20-50% y cambios con diferencia cobrada.
       - Inferencia con Google Gemini 2.5 Flash mediante `google.genai` Client con System Prompt analítico estricto y generación de `speech_text` optimizado para locución por TTS.
       - `_generate_heuristic_fallback`: Fallback analítico local determinista ante caídas, timeouts o cuotas de red (`is_fallback: true`).
     - Rutas en [`voice_report_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/routes/voice_report_routes.py):
       - `POST /api/reports/voice-query`: Procesa consultas por voz/texto en lenguaje natural.
       - `GET /api/reports/voice-query/capabilities`: Lista ejemplos de preguntas y estado de IA.
     - Suite automatizada [`backend/tests/test_cu20_voice_rag_reports.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu20_voice_rag_reports.py) con **4/4 pruebas PASSED (100%)**.
   - **Diagramación ICONIX para Enterprise Architect v15 (CU20):**
     - Script Secuencia: [`docsUML/CUSecuencia/CU20_secuencia_reportes_voz_gemini_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU20_secuencia_reportes_voz_gemini_EA.js).
     - Script Robustez / Comunicación: [`docsUML/CUrobustez/CU20_comm_reportes_voz_gemini_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU20_comm_reportes_voz_gemini_EA.js).
     - Documentación centralizada en [`docsUML/SEQUENCE_DIAGRAM_GUIDE.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/SEQUENCE_DIAGRAM_GUIDE.md) con tabla comparativa BCE vs código fuente y previsualización Mermaid.
   - **Aseguramiento de Calidad:**
     - 4 casos de prueba formalizados en [`docs/informes/PRUEBAS_CAJA_NEGRA.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/informes/PRUEBAS_CAJA_NEGRA.md) (`CP-CU20-01` a `CP-CU20-04`).
     - Total acumulado del proyecto: **93/93 casos de prueba PASSED (100%)**.

-1. **Implementación Fullstack de CU21 (Carril B: Reportes Empresariales a PDF y Excel):**
    - **Backend (`p6_inteligencia_analitica`):**
      - Librerías instaladas: `openpyxl==3.1.5` y `reportlab==5.1.0`.
      - `export_report_to_excel(...)`: Libro Excel `.xlsx` corporativo con formatos contables, anchos autoajustados y fórmulas automáticas `=SUM(...)`.
      - `export_report_to_pdf(...)`: Documento PDF apaisado `landscape(letter)` con `NumberedCanvas` (numeración dinámica "Página X de Y"), membrete formal con razón social y tarjetas KPI.
      - Proyección dinámica de columnas (`columns`): omite celdas desmarcadas sin quebrar alineación de tablas.
      - Aislamiento multitenant riguroso y restricción por sucursal para el rol `encargado`.
      - Endpoints: `GET /api/reports/{report_type}/export` (formato `csv`, `excel`, `pdf`), `GET /api/reports/export/excel` y `GET /api/reports/export/pdf`.
      - Suite automatizada [`backend/tests/test_cu21_export_reports.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu21_export_reports.py) con **9/9 pruebas PASSED (100%)**.
    - **Frontend Web PWA (Angular 21):**
      - Modelos y constantes en `report.model.ts`: definición de columnas predeterminadas para Ventas, Inventario y Movimientos.
      - Servicio `reports-api.service.ts` con helper `downloadBlob` para descarga directa en el navegador.
      - Componente [`admin-reports-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/admin/pages/admin-reports-page.component.ts) y `.html` con directrices `/frontend-design`:
        - Botones de acción rápida: `[ CSV ]`, `[ 📊 Excel (.xlsx) ]` y `[ 📄 PDF Oficial ]`.
        - Pestañas fluidas: Ventas y Facturación, Stock e Inventario, y Trazabilidad de Movimientos.
        - Filtros por periodo (Hoy, Últimos 7 días, Este Mes, Histórico) y sucursal.
        - Panel colapsable interactivo "▼ Columnas visibles" con checkboxes para personalizar tablas y exportaciones.
        - Tarjetas KPI dinámicas y tabla con estilos cebra.
      - Rutas `/app/admin/reports` y `/app/encargado/reports` registradas en `app.routes.ts` y menú lateral de `app-shell.component.ts`.
    - **Aseguramiento de Calidad:**
      - 9 casos de prueba registrados en [`docs/informes/PRUEBAS_CAJA_NEGRA.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/informes/PRUEBAS_CAJA_NEGRA.md) (`CP-CU21-01` a `CP-CU21-09`).
      - Total acumulado del proyecto: **82/82 casos de prueba PASSED (100%)**.

---

### 1. Avances Consolidados en esta Sesión

0. **Auditoría Exhaustiva y Cierre Integral (CU11 al CU18):**
   - Informe formal emitido en [docs/informes/AUDITORIA_INTEGRAL_CU11_A_CU18.md](docs/informes/AUDITORIA_INTEGRAL_CU11_A_CU18.md): los 8 casos del bloque cuentan con backend 100%, frontend 100%, mobile alineado y 73/73 pruebas de caja negra PASSED.
   - Frontend: Completado el modal interactivo de Cambio de Prenda (**CU17**) en caja-page.component.ts y .html, con 
px tsc --noEmit en 0 errores.
   - UML EA: Generados scripts JScript de Comunicación y Secuencia para **CU15** y **CU17** en docsUML/.

1. **Orquestación con Docker Compose (`docker-compose.yml`):**
   - Creado `docker-compose.yml` en la raíz orquestando 3 servicios:
     - `db`: PostgreSQL 16 Alpine con healthcheck (`pg_isready`), volumen persistente `postgres_data` y puerto expuesto 5432.
     - `backend`: FastAPI Python 3.12 con ejecución automática de migraciones Alembic (`alembic upgrade head`) y Uvicorn en el puerto 8000.
     - `frontend`: Angular 21 PWA con Nginx unprivileged sirviendo estáticos e inyectando `API_BASE_URL` en el puerto 8080.
   - Creado `.dockerignore` en la raíz para optimizar el contexto de build, excluyendo `node_modules`, `.venv`, datasets de seed, caches e informes.
   - Actualizado `backend/Dockerfile` para incluir `backend/seed_saas.py` para permitir la siembra de datos de prueba dentro del contenedor.

2. **Diagrama de Robustez / Comunicación UML de CU11 para Enterprise Architect:**
   - Creado [`docsUML/CUrobustez/CU11_comm_reserva_offline_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU11_comm_reserva_offline_EA.js) en JScript para Enterprise Architect, modelando la secuencia actor-boundary-controller-entity bajo estándares UML 2.5 y la plantilla de diseño de la cátedra:
     - Actor: `:Cliente`
     - Frontera: `:ReservationCreateController`
     - Control: `:ReservationOfflineController`
     - Entidades: `:LocalPendingReservation` y `:LocalInventory`
     - 12 mensajes numerados bidireccionales con flujos de persistencia desconectada y sincronización reactiva al reconectar.
   - Diagrama complementario PlantUML en [`docsUML/puml/CU11_Registrar_Reserva_Offline.puml`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/puml/CU11_Registrar_Reserva_Offline.puml).

2. **Implementación Fullstack de CU12 (Atender y Resolver Conflictos de Reservas Expiradas):**
   - **Backend (`p4_gestion_compras_reservas`):**
     - Schemas: `ConflictResolutionType` (`reactivate`, `substitute`, `close`), `ReservationConflictResolveRequest`, `ItemStockAvailability`, `ReservationConflictItemRead`.
     - Servicio: `list_branch_conflicts(db, branch_id, tenant_id)` y `resolve_reservation_conflict(db, reservation_id, payload, user_id, tenant_id, branch_id)` con control de transacciones concurrentes `with_for_update()`.
     - Endpoints: `GET /reservations/branch/conflicts` y `POST /reservations/{reservation_id}/resolve-conflict`.
     - Suite [`backend/tests/test_cu12_resolve_expired_reservations.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu12_resolve_expired_reservations.py) con **7/7 pruebas PASSED (100%)**.
   - **Frontend Web PWA (Angular 21):**
     - En `ReservationApiService` y `reservation.model.ts`: modelos tipados y métodos para listar y resolver conflictos de reservas.
     - En [`frontend/src/app/features/encargado/pages/reservations-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/encargado/pages/reservations-page.component.ts) y template HTML:
       - Pestañas entre "Todas las Reservas" y "Bandeja de Conflictos / Expiradas (CU12)".
       - Diagnóstico de percha con stock físico en tiempo real por prenda (verde si disponible, rojo si agotado).
       - Modal de resolución adaptativo con 3 vías de acuerdo: Reactivación (+24h/48h con re-bloqueo atómico), Sustitución de Variante y Cierre Definitivo / Anulación.
       - Campo obligatorio de justificación de auditoría (`resolution_note`).
     - Verificación TypeScript `npx tsc --noEmit` completada con **0 errores**.

3. **Implementación de Backend de CU17 (Cambio de Prenda con Cobro de Diferencia y Validación de Estado):**
   - **Backend (`p5_gestion_ventas_pos`):**
     - Schemas: [`schemas/exchange_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/exchange_schema.py) (`ExchangeQuoteRequest`, `ExchangeQuoteResponse`, `GarmentExchangeCreate`, `GarmentExchangeResponse`, `GarmentConditionEnum`).
     - Servicios: [`services/exchange_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/exchange_service.py) con `quote_garment_exchange`, `process_garment_exchange` y `list_garment_exchanges`.
     - Cumplimiento incondicional de la **Política de Negocio 1 (P-Ten-01)**: si $\Delta > 0$ y `difference_paid = False`, rechazo con HTTP 400 y stock intacto; si abona, swap físico atómico (+1 / -1 con `with_for_update`) y persistencia en `garment_exchanges`.
     - Endpoints REST: `POST /api/exchanges/quote`, `POST /api/exchanges`, `GET /api/exchanges` montados en `p5_router`.
     - Suite automatizada [`backend/tests/test_cu17_garment_exchange.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu17_garment_exchange.py) con **8/8 pruebas PASSED (100%)**.

4. **Implementación Fullstack de CU13 (Venta POS Offline en Efectivo con Contingencia UUIDv4):**
   - **Backend (`p5_gestion_ventas_pos`):**
     - Schemas: [`sales_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/sales_schema.py) con `client_sale_id: UUID | None`, `is_offline: bool`, `synced_at` y validador de Política 5 (solo efectivo).
     - Idempotencia y Multitenancy: [`sales_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/sales_service.py) evita doble deducción de stock en reintentos.
     - Pruebas: [`backend/tests/test_cu13_offline_pos_sales.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu13_offline_pos_sales.py) con **5/5 pruebas PASSED (100%)**.
   - **Frontend Web PWA (Angular 21):**
     - Outbox Local: [`idb-sales.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/offline/idb-sales.service.ts) en IndexedDB.
     - Caja POS: [`caja-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.ts) con calculadora de cambio en vivo, bloqueo de pagos electrónicos en desconexión y modal de comprobante térmico con hash UUIDv4 (`TCK-OFF-XXXXXX`).
     - Verificación TypeScript `npx tsc --noEmit` completada con **0 errores**.

5. **Implementación Fullstack de CU18 (Procesar Devolución de Prenda con Retención 20%-50% y Nota de Crédito):**
   - **Backend (`p5_gestion_ventas_pos`):**
     - Schemas: [`schemas/return_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/return_schema.py) (`ReturnQuoteRequest`, `ReturnQuoteResponse`, `GarmentReturnCreate`, `GarmentReturnResponse`, `RefundMethodEnum`).
     - Servicios: [`services/return_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/return_service.py) con `quote_garment_return`, `process_garment_return`, `generate_credit_note_code` y `list_garment_returns`.
     - Cumplimiento incondicional de la **Política de Negocio 2 (P-Ten-03)**: retención operativa del 20% al 50% por tenant (30% en Elegance, 20% en Urbana), reembolso neto del 50% al 80%, condición de prenda intacta con etiqueta (`good_with_tags`), reingreso atómico de inventario (`quantity += 1` con `with_for_update`) y persistencia en `garment_returns`.
     - Endpoints REST: `POST /api/returns/quote`, `POST /api/returns`, `GET /api/returns` montados en `p5_router`.
     - Suite automatizada [`backend/tests/test_cu18_garment_return.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu18_garment_return.py) con **8/8 pruebas PASSED (100%)** y suite de regresión con 26/26 pruebas.
   - **Frontend Web PWA (Angular 21 con `/frontend-design`):**
     - Extensiones de API: [`sales-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/services/sales-api.service.ts) y modelos [`sale.model.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/models/sale.model.ts).
     - Caja POS: [`caja-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.ts) y template HTML con botón de devoluciones, cotización reactiva en tiempo real y modal boutique de emisión de Nota de Crédito (`NC-YYYYMMDD-XXXX`).
     - Verificación TypeScript `npx tsc --noEmit` completada con **0 errores**.
   - **Modelos UML para Enterprise Architect:**
     - Diagrama de Robustez / Comunicación: [`docsUML/CUrobustez/CU18_comm_devolucion_prenda_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU18_comm_devolucion_prenda_EA.js).
     - Diagrama de Secuencia: [`docsUML/CUSecuencia/CU18_secuencia_devolucion_prenda_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU18_secuencia_devolucion_prenda_EA.js) con flujo BCE completo y fragmentos `alt`.

6. **Implementación Fullstack de CU14 (Gestionar Bandeja Local de Operaciones Pendientes - Outbox PWA / SQLite):**
   - **Backend (`p5_gestion_ventas_pos`):**
     - Schemas: [`sales_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/sales_schema.py) con `OfflineStatusCheckRequest` y `OfflineStatusCheckResponse`.
     - Servicios: [`sales_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/sales_service.py) con `check_offline_sales_status(db, client_sale_ids, tenant_id)` para conciliar en bloque qué operaciones ya existen centralmente sin alterar el stock.
     - Endpoint REST: `POST /api/sales/offline/check-status` montado en `sales_routes.py`.
     - Suite automatizada [`backend/tests/test_cu14_outbox_operations.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu14_outbox_operations.py) con **4/4 pruebas PASSED (100%)**.
   - **Frontend Web PWA (Angular 21 con `/frontend-design`):**
     - Almacenamiento IndexedDB: [`idb-sales.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/offline/idb-sales.service.ts) ampliado con `getPendingOnly()`, `getSyncedOnly()`, `getTotalPendingCash()`, `markAsError()` y `clearSynced()`.
     - Cliente API: [`sales-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/services/sales-api.service.ts) con `checkOfflineStatus(clientSaleIds)`.
     - Interfaz POS en [`caja-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.ts) y template HTML:
       - Navegación segmentada entre TPV Principal y "Bandeja Outbox Local" con badge dinámico de comprobantes pendientes.
       - 3 tarjetas de métricas en vivo: Efectivo en Gaveta Offline (`totalPendingCash()`), Comprobantes en Bandeja y Enlace con Servidor.
       - Barra de herramientas: Sincronizar Lote, Verificar con Servidor (`POST /api/sales/offline/check-status`), Purgar Sincronizadas y Recargar.
       - Tabla con código de ticket (`TCK-OFF-XXXXXX`), UUIDv4 de contingencia, fecha, ítems, desglose de efectivo/cambio, total, badge de sincronización y acciones (ver comprobante térmico, sincronizar y descartar).
     - Verificación TypeScript `npx tsc --noEmit` completada con **0 errores**.
   - **Pruebas de Caja Negra:**
     - Actualizado [`docs/informes/PRUEBAS_CAJA_NEGRA.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/informes/PRUEBAS_CAJA_NEGRA.md) con 4 casos de prueba reales (`CP-CU14-01` a `CP-CU14-04`) en formato canónico de 8 columnas.

7. **Implementación Fullstack de CU15 (Sincronizar Lotes de Ventas con Idempotencia Central en sync_operations):**
   - **Backend (`p5_gestion_ventas_pos`):**
     - Schemas: [`sales_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/sales_schema.py) con `BatchSyncItemSchema`, `BatchSyncOperationSchema`, `BatchSyncRequest`, `BatchSyncSummary`, `BatchSyncItemResult`, `BatchSyncResponse` y validador de Política 5 (solo efectivo).
     - Servicios: [`sales_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/sales_service.py) con función `batch_sync_offline_sales`:
       - Dual idempotency check contra `sync_operations.client_operation_id` y `Sale.client_sale_id`.
       - Bloqueo de fila pesimista `with_for_update()` en tabla `Inventory`.
       - Registro contable en `inventory_movements` (tipo `outcome`) y en `sync_operations`.
       - Manejo desacoplado de sobreventa en contingencia: venta aplicada, stock a negativo, `is_conflict = True`, clasificada en `sync_operations` como `EN_CONFLICTO` y reportada en `conflict_uuids` para atención en `CU16`.
     - Endpoint REST: `POST /api/sales/offline/batch-sync` montado en `sales_routes.py`.
     - Suite automatizada [`backend/tests/test_cu15_batch_sync_idempotency.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu15_batch_sync_idempotency.py) con **5/5 pruebas PASSED (100%)** y regresión de 14/14 pasando.
   - **Frontend Web PWA (Angular 21 con `/frontend-design`):**
     - Modelos API: [`sale.model.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/models/sale.model.ts) con interfaces de batch sync.
     - Cliente API: [`sales-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/services/sales-api.service.ts) con método `batchSyncSales(payload)`.
     - Interfaz POS en [`caja-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/cajero/pages/caja-page.component.ts) y template HTML:
       - Actualización de `syncAllPending()` conectando directamente con `batchSyncSales` y actualizando marcas locales en IndexedDB (`IdbSalesService.markAsSynced(uuid)`).
       - Panel de auditoría de lote con 4 métricas (Recibidos, Consolidadas, Duplicados Idempotentes Descartados y Conflictos de Stock) y tabla de estado por ítem.
     - Verificación TypeScript `tsc --noEmit` completada con **0 errores**.
   - **Pruebas de Caja Negra:**
     - Actualizado [`docs/informes/PRUEBAS_CAJA_NEGRA.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/informes/PRUEBAS_CAJA_NEGRA.md) con 4 casos de prueba reales (`CP-CU15-01` a `CP-CU15-04`) en formato canónico de 8 columnas (Total acumulado: 70 CUs al 100%).

---


8. **Implementación Fullstack de CU16 (Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock):**
   - **Backend (`p5_gestion_ventas_pos`):**
     - Schemas: [`sale_conflict_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/sale_conflict_schema.py) (`SaleConflictResolutionTypeEnum`, `SaleConflictItemRead`, `SaleConflictRead`, `SaleConflictResolveRequest`, `SaleConflictResolveResponse`).
     - Servicios: [`sale_conflict_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/sale_conflict_service.py) con `list_branch_sale_conflicts()` y `resolve_sale_conflict()`:
       - Vía 1 (`negative_stock`): Autorización de saldo temporal negativo (-1) con solicitud de reposición; venta pasa a `COMPLETED`.
       - Vía 2 (`substitute`): Bloqueo pesimista `with_for_update()` en inventario de la nueva variante, descuento y reasignación de ítem; venta pasa a `COMPLETED`.
       - Vía 3 (`credit_note`): Anulación contable (`Sale.status = CANCELLED`), emisión de registro en `garment_returns` con retención del 0% (reembolso neto del 100%) y código unívoco `NC-YYYYMMDD-XXXX`.
       - Auditoría obligatoria con justificación `>= 5` caracteres.
     - Rutas REST: [`sale_conflict_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/routes/sale_conflict_routes.py) (`GET /api/sales/conflicts` y `POST /api/sales/conflicts/{sale_id}/resolve`).
     - Suite automatizada [`backend/tests/test_cu16_resolve_offline_sale_conflicts.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu16_resolve_offline_sale_conflicts.py) con **7/7 pruebas PASSED (100%)**.
   - **Frontend Web PWA (Angular 21 con `/frontend-design`):**
     - Modelos: [`sale.model.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/models/sale.model.ts) con interfaces de resolución.
     - Cliente API: [`sales-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/services/sales-api.service.ts) con `listSaleConflicts()` y `resolveSaleConflict()`.
     - Componente: [`sale-conflicts-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/encargado/pages/sale-conflicts-page.component.ts) y template HTML:
       - 3 Métricas de quiebre (Tickets en Conflicto, Monto Total Afectado, Políticas Activas).
       - Cards de diagnóstico detallado por venta offline sincronizada con stock en 0.
       - Modal de resolución de 3 vías con transiciones fluidas, feedback visual (ámbar, esmeralda, púrpura) y validación de justificación en tiempo real.
     - Rutas: Registrada ruta `/app/encargado/sale-conflicts` en [`app.routes.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/app.routes.ts) y enlace en [`app-shell.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/layouts/app-shell.component.ts).
     - Verificación TypeScript `tsc --noEmit` con **0 errores**.
   - **Diagramas UML para Enterprise Architect v15 (JScript):**
     - Comunicación / Robustez: [`docsUML/CUrobustez/CU16_comm_resolver_conflictos_ventas_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU16_comm_resolver_conflictos_ventas_EA.js).
     - Secuencia BCE: [`docsUML/CUSecuencia/CU16_secuencia_resolver_conflictos_ventas_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU16_secuencia_resolver_conflictos_ventas_EA.js).
   - **Pruebas de Caja Negra:**
     - Actualizado [`docs/informes/PRUEBAS_CAJA_NEGRA.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/informes/PRUEBAS_CAJA_NEGRA.md) con los 7 casos reales de prueba (`CP-CU16-01` a `CP-CU16-07`), elevando el total consolidado a **73 casos de prueba 100% aprobados**.

---

### 2. Estado de Verificación y Compilación
* **Base de Datos:** Migración Alembic `0044` (Head Maestro). Esquema congelado para los 25 CUs.
* **Backend:** 7 paquetes canónicos; suites `test_cu04` (6/6), `test_cu10` (4/4), `test_cu12` (7/7), `test_cu13` (5/5), `test_cu14` (4/4), `test_cu15` (5/5), `test_cu17` (8/8) y `test_cu18` (8/8) pasando al 100% (35/35 regresión acumulada).
* **Frontend:** Angular 21 PWA con IndexedDB; 0 errores de tipado en TypeScript (`tsc --noEmit`).
* **Diagramas UML:** JScript para Enterprise Architect en `docsUML/CUrobustez/` y `docsUML/CUSecuencia/`.

---

### 3. Próximo Paso Inmediato
* **¡Presentación 2 Concluida al 100%! (18 de 18 Casos de Uso Oficiales Implementados y Verificados):**
  - Iniciar la **Presentación 3** comenzando con `CU19: Entregar y Despachar Pedidos Digitales` y geolocalización de rutas (OpenStreetMap en Flutter y PWA).
