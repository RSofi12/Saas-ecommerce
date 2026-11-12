# Sesión: 2026-11-11 - Verificación y Validación CU16: Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock

## 1. Caso de Uso Verificado
- **[CU16] GESTIONAR Y RESOLVER CONFLICTOS DE VENTAS OFFLINE Y QUIEBRES DE STOCK**
- **Actores:** Administrador de Empresa (`admin@elegance.com`) / Encargado de Sucursal (`encargado.lp@fashionstore.bo`).
- **URLs de Acceso:**
  - `http://localhost:4200/app/admin/conflicts` (Redirigido y soportado directamente en el router admin).
  - `http://localhost:4200/app/encargado/sale-conflicts`.

---

## 2. Cambios y Alineación Implementada

### 2.1 Frontend (Angular 21 PWA)
- **Ruta de Administrador:** En [`frontend/src/app/app.routes.ts`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/frontend/src/app/app.routes.ts), se mapeó la ruta `conflicts` y `sale-conflicts` apuntando a `SaleConflictsPageComponent` bajo el rol admin.
- **Tarjetas y Vías de Resolución Oficiales:** En [`frontend/src/app/features/encargado/pages/sale-conflicts-page.component.html`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/frontend/src/app/features/encargado/pages/sale-conflicts-page.component.html), se alinearon las 3 vías reglamentarias:
  - **Vía 1: Sustitución Acordada (`substitute`):** Permite seleccionar prenda sustituta disponible de igual valor.
  - **Vía 2: Nota de Crédito al 100% (`credit_note`):** Emite código formal `NC-YYYYMMDD-XXXX` por el 100% del importe pagado.
  - **Vía 3: Reembolso Completo / Stock Negativo con Reposición (`negative_stock`):** Ajusta stock contable y emite orden de reposición física.
  - Campo de justificación obligatoria con validación reactiva (mínimo 5 caracteres).

### 2.2 Backend (FastAPI / PostgreSQL)
- Verificado el servicio [`backend/app/packages/p5_gestion_ventas_pos/services/sale_conflict_service.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/sale_conflict_service.py):
  - `list_branch_sale_conflicts`: Identifica ventas offline con estado o referencia de colisión por sobreventa.
  - `resolve_sale_conflict`: Ejecuta la resolución transaccional de acuerdo a las 3 vías oficiales con actualización inmediata de stock e histórico.
- Validado endpoint `POST /api/sales/conflicts/{sale_id}/resolve` y `GET /api/sales/conflicts`.

---

## 3. Pruebas y Resultados
Script automatizado ejecutado: [`run_cu16_test.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/run_cu16_test.py)
- **Paso 1:** Autenticación como Encargado de Sucursal (`encargado.lp@fashionstore.bo`) y verificación de rol y sucursal.
- **Paso 2:** Obtención de prendas del catálogo para simulación de sobreventa y sustituto.
- **Paso 3:** Registro de venta de contingencia en conflicto en base de datos.
- **Paso 4:** Listado en bandeja de conflictos (HTTP 200 OK, 1 conflicto detectado).
- **Paso 5:** Resolución **Vía 1 (Sustitución Acordada)** -> Venta pasa a `completed`, stock remanente descontado a 13 unidades.
- **Paso 6:** Resolución **Vía 2 (Nota de Crédito 100%)** -> Venta pasa a `cancelled`, código `NC-20261112-910F` generado con reembolso del 100% sin penalización operativa.
- **Paso 7:** Resolución **Vía 3 (Stock Negativo con Solicitud de Reposición)** -> Venta autorizada y completada con orden de reposición.
- **Resultado:** 100% PASSED (Exit code 0).

