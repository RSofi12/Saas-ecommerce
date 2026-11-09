# Registro de Sesión — 08/11/2026
### Implementación Fullstack de CU23: Predecir Demanda de Ropa por Talla (ML Supervisado - RandomForestRegressor)

**Caso de Uso:** `CU23` – Predecir Demanda de Ropa (ML Supervisado - RandomForestRegressor)  
**Paquetes Canónicos:**  
- Backend: `backend/app/packages/p6_inteligencia_analitica`  
- Frontend: `frontend/src/app/features/admin/pages/admin-demand-forecast-page.*` y `frontend/src/app/features/shared/services/demand-forecast-api.service.ts`  
**Estado:** Fullstack 100% Implementado, Integrado y Verificado (Backend 5/5 Pytest PASSED, Frontend compilado con 0 errores de TypeScript)  

---

### 1. Componentes Implementados en Backend

1. **Esquemas Pydantic v2 (`schemas/demand_forecast_schema.py`):**
   - `DemandTrainRequest`: Parámetros `use_synthetic`, `test_size`, `n_estimators`, `max_depth`.
   - `DemandTrainResponse`: Métricas de bondad de ajuste ($R^2$, $MAE$, $RMSE$), versión del modelo y confirmación.
   - `DemandForecastRequest`: Inferencia con `product_id`, `branch_id`, `weeks_ahead` (1 a 8) y `confidence_level`.
   - `SizeForecastDetail`: Curva semanal de demanda por talla, inventario actual, unidades sugeridas de reabastecimiento y clasificación de stock (`AGOTADO`, `CRITICO`, `BAJO`, `OPTIMO`, `SOBRESTOCK`).
   - `DemandForecastResponse`: Consolidación jerárquica para la vista ejecutiva.
   - `StockReorderAlert`: Alertas tempranas priorizadas por nivel de urgencia (`ALTA`, `MEDIA`, `BAJA`).

2. **Servicio de Machine Learning (`services/demand_forecasting_service.py`):**
   - Gobernanza estricta de suscripciones mediante `validate_ai_access` (Plan Básico genera HTTP 403 Forbidden; Planes Pro/Empresarial autorizados).
   - Ensamblado de vector de características: `size_code`, `month`, `day_of_month`, `week_of_year`, `day_of_week`, `is_cold_season`, `is_payday_window`, `unit_price`.
   - Pipeline de regresión Scikit-Learn con `RandomForestRegressor(random_state=42, n_jobs=-1)`.
   - Evaluación y aseguramiento del coeficiente de determinación ($R^2 \ge 0.84$), error medio absoluto ($MAE$) y raíz del error cuadrático medio ($RMSE$).
   - Serialización atómica con `joblib` particionada por tenant en `backend/app/data/models/{tenant_id}_demand_rf.joblib`.
   - Inferencia con estimación de intervalo de confianza estadística mediante dispersión inter-árboles (`estimators_`) a 1-8 semanas de horizonte temporal.
   - Detección de déficit versus existencias en percha (`inventory` table) y emisión de proyecciones en tabla `demand_forecasts`.

3. **Rutas REST (`routes/demand_forecast_routes.py` y `router.py`):**
   - `POST /api/ml/demand/train`: Entrena el modelo predictivo del tenant.
   - `POST /api/ml/demand/forecast`: Genera proyecciones cuantitativas de demanda por talla.
   - `GET /api/ml/demand/alerts`: Retorna alertas de reabastecimiento por quiebre inminente de stock.
   - `GET /api/ml/demand/latest-model`: Auditoría de metadatos del modelo vigente.

4. **Suite de Pruebas Automatizadas (`tests/test_cu23_demand_forecasting.py`):**
   - `test_cu23_plan_basic_forbidden_403`: PASSED.
   - `test_cu23_train_model_success`: PASSED ($R^2 \ge 0.84$).
   - `test_cu23_forecast_demand_by_size`: PASSED.
   - `test_cu23_stock_reorder_alerts`: PASSED.
   - `test_cu23_latest_model_metadata`: PASSED.
   - **Resultado:** 5/5 PASSED (100% de éxito).

5. **Aseguramiento de Calidad y Pruebas de Caja Negra (`docs/informes/PRUEBAS_CAJA_NEGRA.md`):**
   - Incorporación de casos `CP-CU23-01` a `CP-CU23-05`.
   - Total acumulado de la plataforma: **103/103 casos de prueba aprobados (100%)**.

---

### 2. Componentes Implementados en Frontend Web PWA (Angular 21)

1. **Modelos TypeScript (`features/shared/models/demand-forecast.model.ts`):**
   - Tipos e interfaces de demanda: `SizeForecastDetail`, `DemandForecastResponse`, `StockReorderAlert`, `ModelMetrics`, `DemandModelMetadata`, `DemandForecastRequest`, `DemandTrainRequest`.

2. **Servicio API Angular (`features/shared/services/demand-forecast-api.service.ts`):**
   - Métodos HTTP reactivos: `forecastDemand()`, `getStockAlerts()`, `trainModel()`, `getLatestModel()`.

3. **Página Principal de Pronóstico (`features/admin/pages/admin-demand-forecast-page.*`):**
   - Diseñado bajo directrices `/design-taste-frontend` (`app-screens.md`) con estilo editorial sobrio, paleta dark mode / slate contemporánea, transiciones suaves de entrada (`fadeIn`) e interactividad fluida.
   - **3 Tabuladores Dinámicos:**
     - **Proyecciones por Talla:** Selección de prenda, sucursal y horizonte temporal (1 a 8 semanas). Métricas ejecutivas en tarjetas KPI (Demanda Proyectada, Stock Disponible, Unidades a Reabastecer con badge de alerta, Nivel de Confianza 95%).
     - **Gráfica Visual Comparativa de Stock vs Demanda:** Gráfico de barras horizontal proporcional de stock vs demanda proyectada por talla, con intervalos de confianza estadísticos ($[\text{Demanda Min}, \text{Demanda Max}]$) e indicación de estado (`AGOTADO`, `CRITICO`, `BAJO`, `OPTIMO`, `SOBRESTOCK`).
     - **Alertas de Reabastecimiento:** Bandeja de prendas con riesgo inminente de quiebre de stock, filtrable por sucursal y catalogada por nivel de urgencia (`ALTA`, `MEDIA`, `BAJA`).
     - **Entrenamiento y Estado del Modelo:** Configuración interactiva de hiperparámetros (`n_estimators`, `max_depth`, uso de dataset sintético de `CU22`), tarjeta con estado del modelo en producción, fecha de entrenamiento y métricas de ajuste ($R^2$, $MAE$, $RMSE$).
   - **Ruta Registrada:** `/app/admin/demand-forecast` con `adminGuard`.
   - **Navegación:** Integrado en el sidebar de administración (`app-shell.component.ts`) bajo la sección de Inteligencia y Analítica con el ícono `lucideTrendingUp`.

---

### 3. Comandos Ejecutados y Verificados

- **Backend Pytest:**
  ```bash
  backend/.venv/Scripts/python.exe -m pytest backend/tests/test_cu23_demand_forecasting.py -v
  # 5 passed, 7 warnings in 22.72s
  ```
- **Frontend Build:**
  ```bash
  cd frontend
  npm run test # ng build --configuration development
  # Compilación exitosa sin errores
  ```
