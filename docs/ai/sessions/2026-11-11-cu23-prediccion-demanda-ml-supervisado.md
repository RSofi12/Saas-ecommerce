# Sesión 2026-11-11: Verificación Integral del CU23 (Predecir Demanda de Ropa por Talla - ML Supervisado)

## 1. Alcance
- **Caso de Uso:** `[CU23] PREDECIR DEMANDA DE ROPA POR TALLA (ML SUPERVISADO)`.
- **Actor:** Administrador de Empresa (`admin@elegance.com`).
- **Ruta de Acceso Web:** `http://localhost:4200/app/admin/demand-forecast` o accesible desde `http://localhost:4200/app/admin/analytics`.
- **Objetivo:** Verificar la ejecución del modelo de Machine Learning supervisado (`RandomForestRegressor` de Scikit-Learn) para la predicción de demanda de prendas en horizontes temporales de 1 a 8 semanas, evaluando métricas cuantitativas ($R^2$, MAE, RMSE), el desglose por tallas (S, M, L, XL) frente a existencias reales, y el cálculo de alertas preventivas de reabastecimiento ante déficit proyectado.

## 2. Componentes Fullstack Verificados
- **Backend:**
  - `POST /api/ml/demand/train`: Entrenamiento y calibración del ensamble de árboles `RandomForestRegressor` sobre transacciones históricas o sintéticas.
  - `POST /api/ml/demand/forecast`: Inferencia predictiva por prenda, horizonte de semanas y nivel de confianza estadística (95%).
  - `GET /api/ml/demand/alerts`: Detección proactiva de quiebres de inventario comparando la demanda proyectada con `Inventory.quantity`.
  - `GET /api/ml/demand/latest-model`: Consulta del estado del modelo serializado en `.joblib`.
- **Frontend PWA:**
  - Componente [`AdminDemandForecastPageComponent`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/frontend/src/app/features/admin/pages/admin-demand-forecast-page.component.ts) en `/app/admin/demand-forecast` con gráficas predictivas y tarjetas de métricas.

## 3. Resultados de la Prueba End-to-End (`run_cu23_test.py`)
- **Autenticación:** Administrador `admin@elegance.com` autenticado exitosamente (HTTP 200).
- **Entrenamiento:** Modelo entrenado exitosamente con 100 estimadores (`RandomForestRegressor`), arrojando MAE de 0.51 unidades.
- **Inferencia (4 semanas):** Prenda seleccionada `ADIDAS Women Whalf Striper White Top`. Demanda estimada consolidada con intervalos de confianza y balance de percha.
- **Alertas de Stock:** Verificación del servicio de alertas preventivas contra stock físico de sucursales.

