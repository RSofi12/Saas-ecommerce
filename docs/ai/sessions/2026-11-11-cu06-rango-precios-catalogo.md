# Sesión: 2026-11-11 — Caso de Uso 6 (CU06): Rango de Precios en Búsqueda Facetada

**Fecha:** 11 de Noviembre de 2026  
**Caso de Uso:** CU06 (Consultar catálogo interactivo y disponibilidad con búsqueda facetada)  
**Alcance:** Backend, Frontend Angular PWA e IndexedDB Offline  

---

## 1. Resumen de la Tarea
En cumplimiento de la especificación oficial de **CU06** (especificada en `docs/ACTORS_AND_USE_CASES.md`, sección *Búsqueda Facetada con Rango de Precios*), se integró el filtrado dinámico por rango de precios (`min_price` y `max_price`) en toda la cadena arquitectónica:
1. **Backend (`p2_gestion_productos_catalogo`):**
   - Servicio [`catalog_service.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/services/catalog_service.py): Se añadieron los parámetros opcionales `min_price` y `max_price` en `list_public_products`. Se evalúa la comparación `Decimal(str(variant.price)) >= Decimal(str(min_price))` y `<= Decimal(str(max_price))`.
   - Endpoint [`catalog_routes.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/routes/catalog_routes.py): Ruta `GET /api/catalog/products` recibe `min_price: float | None` y `max_price: float | None`.
2. **Caché Offline IndexedDB (`IdbCatalogService`):**
   - [`idb-catalog.service.ts`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/frontend/src/app/core/offline/idb-catalog.service.ts): Soporte para filtros `min_price` y `max_price` en `getOfflineProducts()` para consultas sin conexión.
3. **Frontend Angular PWA:**
   - [`catalog-page.component.ts`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/frontend/src/app/features/cliente/pages/catalog-page.component.ts): Se ampliaron los campos reactivos del formulario `form` (`min_price`, `max_price`), la propagación en `search()`, `loadFromIndexedDb()` y el restablecimiento en `resetFilters()`.
   - [`catalog-page.component.html`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/frontend/src/app/features/cliente/pages/catalog-page.component.html): Se agregaron inputs numéricos estilizados con prefijo de moneda (`Bs`) en una cuadrícula equilibrada de 6 columnas junto a un botón interactivo para "Limpiar" filtros.

---

## 2. Archivos Modificados
- [`backend/app/packages/p2_gestion_productos_catalogo/services/catalog_service.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/services/catalog_service.py)
- [`backend/app/packages/p2_gestion_productos_catalogo/routes/catalog_routes.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/routes/catalog_routes.py)
- [`frontend/src/app/core/offline/idb-catalog.service.ts`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/frontend/src/app/core/offline/idb-catalog.service.ts)
- [`frontend/src/app/features/cliente/pages/catalog-page.component.ts`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/frontend/src/app/features/cliente/pages/catalog-page.component.ts)
- [`frontend/src/app/features/cliente/pages/catalog-page.component.html`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/frontend/src/app/features/cliente/pages/catalog-page.component.html)
- [`backend/tests/test_cu06_price_range_filter.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/tests/test_cu06_price_range_filter.py)

---

## 3. Pruebas y Verificación
- **Prueba API Directa con Python:**
  - Sin filtro: 51 productos.
  - `min_price=100`: 36 productos coincidentes.
  - `max_price=80`: 7 productos coincidentes.
  - `min_price=50 & max_price=120`: 22 productos coincidentes.
- **Suite Automatizada Pytest:**
  - `pytest tests/test_cu06_price_range_filter.py` -> **1 passed in 11.37s (100% PASSED)**.
- **Compilación Frontend Angular:**
  - Hot reload completado exitosamente sin errores de compilación ni tipos (`0.836 seconds`).

