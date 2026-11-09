# Bitácora de Sesión: CU19 — Geolocalización de Sucursales y Trazado de Rutas (OpenStreetMap / ORS en Flutter)
**Fecha:** 03 de Noviembre de 2026  
**Fase:** Presentación 3 (Sistemas 2)  
**Alcance:** Backend (`p1_gestion_usuarios_acceso`), Base de Datos (`seed_saas.py`), Mobile Flutter (`mobile/`)  
**Metodología:** ICONIX Process (UML 2.5+)  

---

## 1. Caso de Uso Implementado
- **`CU19: Localizar Sucursales y Trazar Rutas (OpenStreetMap / ORS)` [Nuevo 2P - 100%]**:
  - Permite a los clientes de la boutique localizar en un mapa interactivo renderizado con OpenStreetMap las tiendas físicas activas de la empresa contratante (*tenant*).
  - Trazado de rutas de navegación multimodal (vehicular `driving-car` y peatonal `foot-walking`) desde la posición GPS actual del usuario hasta la sucursal seleccionada.
  - Estimación en tiempo real de distancia métrica/kilométrica y tiempo estimado de llegada (ETA).
  - Consulta de detalles de la sucursal: dirección exacta, teléfono de contacto y horarios de atención.

---

## 2. Modificaciones en Backend (FastAPI + PostgreSQL)

1. **Endpoint Público de Sucursales (`backend/app/packages/p1_gestion_usuarios_acceso/routes/branch_routes.py`):**
   - Agregado `@router.get("/public")` con soporte para consulta sin credenciales administrativas.
   - Filtro obligatorio por `tenant_id` (vía parámetro de consulta o header multitenant) garantizando aislamiento total.
   - Retorno estructurado con coordenadas geográficas (`latitude`, `longitude`), dirección física, teléfono y horarios de apertura.

2. **Georreferenciación en Población de Datos (`backend/seed_saas.py`):**
   - Siembra de coordenadas métricas reales en Santa Cruz de la Sierra para *Boutique Elegance*:
     - **Sucursal Central:** `-17.7833215, -63.1821408` (Calle René Moreno #245).
     - **Sucursal Equipetrol:** `-17.7658120, -63.1952400` (Av. San Martín esq. Calle 7 Este).
     - **Sucursal Ventura Mall:** `-17.7542100, -63.1990300` (4to Anillo esq. Av. San Martín).
   - Coordenadas para *Moda Urbana* en Cochabamba: `-17.3935000, -66.1570000`.

3. **Pruebas Automatizadas de Backend (`backend/tests/test_cu19_branch_public_map.py`):**
   - `test_cu19_list_public_branches_success`: Verifica listado público, formato de coordenadas y presencia de atributos comerciales.
   - `test_cu19_multitenant_isolation`: Valida que las sucursales de un tenant no sean visibles para otro.
   - Resultado: **2/2 PASSED (100%)**.

---

## 3. Implementación en Aplicación Móvil (Flutter / Dart)

1. **Configuración de Dependencias y Permisos:**
   - `mobile/pubspec.yaml`: Agregadas librerías `flutter_map: ^7.0.2` y `latlong2: ^0.9.1`.
   - `mobile/android/app/src/main/AndroidManifest.xml`: Declarados permisos `ACCESS_FINE_LOCATION` y `ACCESS_COARSE_LOCATION`.

2. **Capa de Dominio y Modelos:**
   - `mobile/lib/features/catalog/catalog_models.dart`:
     - Enriquecido modelo `Branch` con `address`, `phone`, `openingHours`, `latitude`, `longitude` y getter booleano `hasCoordinates`.
   - `mobile/lib/features/branches_map/routing_models.dart`:
     - Modelo `RouteInfo` con decodificación de coordenadas GeoJSON, formateo inteligente de distancia (`m` o `km`) y duración (`min` u `h`).

3. **Servicio de Ruteo Híbrido Desacoplado (`mobile/lib/features/branches_map/routing_service.dart`):**
   - **Nivel 1 (OSRM Público):** Consume `router.project-osrm.org` para perfiles `driving` y `walking` sin exigir API Key privativa.
   - **Nivel 2 (OpenRouteService Oficial):** Soporta inyección de API Key institucional de ORS (`api.openrouteservice.org`).
   - **Nivel 3 (Fallback Geodésico Haversine):** Cálculo de distancia ortodrómica radial ante caídas de red o fallos externos, con trazado geodésico y estimación de tiempo.

4. **Controlador y UI Móvil (`frontend-design`):**
   - `mobile/lib/features/branches_map/branches_map_controller.dart`:
     - Manejo reactivo de posición GPS del dispositivo, selección de boutique, cálculo de ruta asíncrono y alternancia de perfiles de viaje.
   - `mobile/lib/features/branches_map/branches_map_page.dart`:
     - Mapa interactivo OpenStreetMap con paleta midnight/champagne gold.
     - Marcadores de boutiques con icono estilizado y pulso radiante.
     - Selector flotante de modo de transporte (`driving` / `walking`).
     - Tarjeta modal inferior con información de la boutique, distancia, tiempo de viaje y botón "¿Cómo llegar?".
   - `mobile/lib/app/routes.dart`: Registro de ruta nombrada `AppRoutes.branchesMap = '/branches-map'`.
   - `mobile/lib/features/management/management_page.dart`: Acceso directo para clientes y directivos a "Nuestras boutiques".
   - `mobile/test/routing_service_test.dart`: Suite de pruebas unitarias móviles para el servicio de ruteo.

---

## 4. Verificación y Resultados de Pruebas
- Backend pytest: `backend/tests/test_cu19_branch_public_map.py` -> **2/2 PASSED (100%)**.
- Flutter unit tests: `mobile/test/routing_service_test.dart` -> **4/4 PASSED (100%)**.
- Seed de base de datos ejecutado con éxito en PostgreSQL.
