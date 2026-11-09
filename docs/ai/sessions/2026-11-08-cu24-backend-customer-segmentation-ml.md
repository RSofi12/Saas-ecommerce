# Sesión de Trabajo: 2026-11-08 — Implementación Backend de CU24 (Segmentación de Clientes K-Means)

## 1. 🎯 Alcance y Caso de Uso Abordado
- **Caso de Uso:** `CU24 – Segmentar Clientes con K-Means (ML No Supervisado)` (Carril C: Machine Learning Pipeline).
- **Rol de Negocio:** Permite a los Administradores de Tenant con suscripción activa a **Plan Profesional o Empresarial** (`has_ai_access=True`) agrupar automáticamente la clientela del tenant en clústeres conductuales homogéneos a partir de vectores **RFM+D** (Recencia, Frecuencia, Valor Monetario y Tasa de Retorno/Cambio vinculada a las Políticas CU17 y CU18).
- **Modelado No Supervisado:**
  - Variables de entrada normalizadas con `StandardScaler`:
    1. **Recencia ($R$):** Días transcurridos desde su última compra.
    2. **Frecuencia ($F$):** Conteo de compras acumuladas.
    3. **Monto Monetario ($M$):** Gasto acumulado neto en Bolivianos (Bs).
    4. **Tasa de Retorno ($D$):** Ratio de operaciones con devolución (CU18) o cambio de talla (CU17) respecto al total.
  - Algoritmo: `KMeans(n_clusters=4, init='k-means++', n_init=10, random_state=42)`.
  - Métricas de calidad: Coeficiente Silhouette ($s \ge 0.50$) e Inercia intra-cluster.
  - Perfiles de negocio inferidos dinámicamente a partir de los centroides desnormalizados:
    - 👑 *Clientes VIP / Embajadores:* Máximo valor monetario y frecuencia sostenida.
    - 🌦️ *Compradores de Temporada:* Frecuencia moderada ligada a cambios de colección textil.
    - 🏷️ *Cazadores de Ofertas:* Mayor recencia y menor ticket promedio.
    - ⚠️ *Perfil de Alto Retorno:* Tasa de devolución o cambio $> 30\%$.

---

## 2. 🛠️ Cambios Realizados en Backend (`backend/app/packages/p6_inteligencia_analitica/`)

1. **Esquemas Pydantic v2 (`schemas/customer_segmentation_schema.py`):**
   - `SegmentationTrainRequest`: Parámetros `k_clusters` (default 4), `use_synthetic_fallback` (default True), `random_state` (default 42).
   - `CentroidMetrics` y `ClusterProfileSummary`: Metadatos de centroides, conteo de clientes, porcentajes, badges temáticos y acciones de marketing recomendadas.
   - `SegmentationTrainResponse`: Respuesta de telemetría completa del entrenamiento.
   - `ScatterPoint` y `SegmentationScatterResponse`: Coordenadas $R, F, M, D$ y colores hex para el renderizado del gráfico de dispersión en el frontend.
   - `CustomerSegmentItem` y `CustomerSegmentListResponse`: Estructura paginada para la inspección drill-down de clientes por clúster.

2. **Servicio de Dominio (`services/customer_segmentation_service.py`):**
   - `CustomerSegmentationService.train_segmentation`:
     - Validación comercial de suscripción con `validate_ai_access(db, tenant_id)`, convirtiendo `FeatureNotAllowedException` en `HTTP 403 Forbidden` defensivo.
     - Extracción de vectores RFM+D de compras reales (`Sale`, `GarmentReturn`, `GarmentExchange`).
     - Resiliencia y cold-start: Si hay $< 10$ clientes reales, conmuta fluidamente a generar cohortes coherentes a partir del dataset sintético generado en CU22.
     - Estandarización con `StandardScaler` y ajuste de `KMeans(k=4)`.
     - Interpretación heurística de centroides para asignar perfiles de negocio y badges visuales.
     - Serialización y persistencia del pipeline en `backend/app/data/models/` mediante `joblib`.
     - Auditoría en tabla `ml_models` (`model_type='KMEANS_CLUSTERING'`) y actualización de asignaciones en `customer_segments`.
   - `get_status`: Recupera la telemetría del modelo activo.
   - `get_scatter_points`: Provee puntos proyectados para el frontend.
   - `get_customers_in_segment`: Consulta paginada con join a `User`.

3. **Rutas REST (`routes/customer_segmentation_routes.py` y `router.py`):**
   - `POST /api/ml/customer-segmentation/train`: Calibrar y entrenar clustering. Requiere roles `administrador` o `superadmin`.
   - `GET /api/ml/customer-segmentation/status`: Consultar estado del modelo.
   - `GET /api/ml/customer-segmentation/scatter-points`: Puntos para gráfico 2D.
   - `GET /api/ml/customer-segmentation/customers`: Listado paginado de clientes por segmento.
   - Registrado en `p6_router` en [`router.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/router.py).

---

## 3. 🧪 Pruebas Automatizadas y Aseguramiento de Calidad

- **Suite Pytest:** [`backend/tests/test_cu24_customer_segmentation.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu24_customer_segmentation.py)
  - `test_cu24_plan_basic_forbidden_403`: **PASSED** (HTTP 403 ante Plan Básico sin acceso a IA)
  - `test_cu24_train_kmeans_success`: **PASSED** (Happy Path con $k=4$, Silhouette Score, inercia y 4 perfiles)
  - `test_cu24_get_segmentation_status`: **PASSED** (Recuperación de telemetría y modelo activo)
  - `test_cu24_get_scatter_points`: **PASSED** (Coordenadas de dispersión 2D con colores por clúster)
  - `test_cu24_get_segmented_customers_drilldown`: **PASSED** (Exploración paginada de clientes por clúster)
- **Resultado:** **5 passed, 7 warnings in 56.87s (100% OK)**.
- **Informe de Caja Negra:** Incorporado en [`docs/informes/PRUEBAS_CAJA_NEGRA.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/informes/PRUEBAS_CAJA_NEGRA.md) (`CP-CU24-01` a `CP-CU24-05`).

---

## 4. 📋 Próximos Pasos Inmediatos
- **`CU24` – Frontend Web PWA (Angular 21):**
  - Implementar la vista interactiva de segmentación en `/app/admin/ml-segmentation`.
  - Tarjetas de métricas Silhouette/Inercia, gráfico de dispersión (Frecuencia vs Gasto), selector de clústeres y tabla de clientes por perfil.
