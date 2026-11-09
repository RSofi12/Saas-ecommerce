# Registro de Sesión: 2026-11-01 — Implementación del CU17: Política Inviolable de Cambio de Prenda por Talla/Modelo con Cobro de Diferencia

## 1. Caso de Uso Abordado
- **CU17: Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Validación de Estado.**
- **Clasificación:** Nuevo del 2do Parcial — Bloque C (Políticas Comerciales y Postventa).
- **Alineación con Política de Negocio 1 (P-Ten-01):** Si el cliente solicita cambiar una prenda por otra talla o modelo de mayor precio ($\Delta > 0$), el cambio se consolida **única y exclusivamente si el cliente abona la diferencia de precio** en caja (`difference_paid = True`). Si no la abona, la transacción se cancela y no se altera el inventario.

---

## 2. Componentes de Backend Implementados

Ubicados en el paquete profundo [`backend/app/packages/p5_gestion_ventas_pos/`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/):

### 2.1. Schemas Pydantic v2
* **[`schemas/exchange_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/schemas/exchange_schema.py):**
  - Identificado con `# logica del CU17`.
  - `GarmentConditionEnum`: `good_with_tags`, `damaged_or_no_tags`.
  - `ExchangeQuoteRequest`: `sale_id`, `original_variant_id`, `new_variant_id`.
  - `ExchangeQuoteResponse`: Desglose de precios, SKU, cálculo de `price_difference` ($\Delta$), bandera `requires_payment` y `available_stock_new`.
  - `GarmentExchangeCreate`: Datos para procesamiento con validación de `difference_paid`, `condition`, `payment_method` y `notes`.
  - `GarmentExchangeResponse`: Modelo serializado para respuestas de API y auditoría.

### 2.2. Capa de Servicios
* **[`services/exchange_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/services/exchange_service.py):**
  - Identificado con `# logica del CU17`.
  - `quote_garment_exchange()`: Verifica existencia de venta en el tenant, pertenencia del ítem, vigencia del plazo de cambio (máx. 30 días), cálculo de $\Delta$ y stock físico en sucursal.
  - `process_garment_exchange()`:
    - Valida condición física (`good_with_tags`), rechazando con HTTP 400 ante prendas usadas o sin etiqueta.
    - Aplica la **Política 1**: Si $\Delta > 0$ y `difference_paid = False`, rechaza con HTTP 400.
    - Bloqueo transaccional `with_for_update()` en inventario de sucursal.
    - Reingreso de +1 a la variante original y descuento de -1 a la variante nueva.
    - Persistencia en tabla `garment_exchanges` con estado `COMPLETED`.
  - `list_garment_exchanges()`: Historial filtrado por tenant y sucursal.

### 2.3. Controladores y Rutas API
* **[`routes/exchange_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/routes/exchange_routes.py):**
  - Identificado con `# logica del CU17`.
  - `POST /api/exchanges/quote`: Cotización previa de diferencia y stock.
  - `POST /api/exchanges`: Ejecución del cambio de prenda (roles: `administrador`, `encargado`, `cajero`).
  - `GET /api/exchanges`: Historial de cambios realizados.
* **[`router.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/router.py):**
  - Montado del sub-router `exchange_routes`.

---

## 3. Pruebas y Verificaciones

### Suite Automatizada:
* Archivo creado: [`backend/tests/test_cu17_garment_exchange.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu17_garment_exchange.py)
* **Casos cubiertos (8/8 PASSED):**
  1. `test_01_quote_exchange_price_difference_calculation`: Cálculo preciso de $\Delta > 0$ y $\Delta = 0$.
  2. `test_02_exchange_with_higher_price_fails_when_difference_is_not_paid`: Rechazo (HTTP 400) al intentar cambio de mayor precio sin abonar diferencia; inventario intacto.
  3. `test_03_exchange_with_higher_price_succeeds_when_difference_is_paid`: Consolidación exitosa con abono, actualización atómica (+1 / -1) y registro en `garment_exchanges`.
  4. `test_04_exchange_same_price_succeeds_without_requiring_payment`: Cambio por prenda del mismo precio sin requerir pago adicional.
  5. `test_05_exchange_fails_if_damaged_or_no_tags`: Rechazo inmediato si la prenda está usada o sin etiqueta.
  6. `test_06_exchange_fails_if_new_variant_out_of_stock`: Rechazo transaccional ante quiebre de stock de la nueva talla.
  7. `test_07_multitenant_isolation`: Rechazo con HTTP 404 al intentar operar sobre ventas de otro tenant.
  8. `test_08_list_exchanges_history`: Auditoría histórica del tenant.
* **Resultado:** `8 passed in 50.39s`.
* **Prueba de Regresión (CU04 + CU10):** `10 passed in 28.55s`.
