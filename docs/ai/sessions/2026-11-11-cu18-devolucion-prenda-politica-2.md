# Sesión 2026-11-11: Verificación Integral del CU18 (Devolución de Prenda con Retención y Nota de Crédito)

## 1. Alcance
- **Caso de Uso:** `[CU18] PROCESAR DEVOLUCIÓN DE PRENDA CON RETENCIÓN (20%-50%) Y NOTA DE CRÉDITO (POLÍTICA 2)`.
- **Actor:** Administrador de Empresa / Vendedor de Mostrador (`admin@elegance.com`).
- **Objetivo:** Verificar la ejecución del flujo de devolución de prendas conforme a la Política de Negocio 2 (retención legal del 20% al 50% por costos operativos, reembolso neto del 50% al 80%, reingreso físico de la prenda al inventario y emisión de Nota de Crédito Digital formal `NC-YYYYMMDD-XXXX` o efectivo).

## 2. Ajustes Realizados
- **Verificación de Endpoints API:**
  - `POST /api/returns/quote`: Cotización financiera previa que desglosa el valor original, porcentaje de retención del tenant (30% en Boutique Elegance), monto de retención y monto neto reembolsable.
  - `POST /api/returns`: Procesamiento de la devolución con validación de condición (`good_with_tags`), reingreso atómico al inventario disponible (`+1`), y generación de código unívoco de Nota de Crédito `NC-YYYYMMDD-XXXX`.
  - `GET /api/returns`: Auditoría e historial de devoluciones por tenant y sucursal.

## 3. Resultados de la Prueba End-to-End (`run_cu18_test.py`)
1. **Autenticación:**
   - Administrador `admin@elegance.com` autenticado con rol `administrador` (HTTP 200).
2. **Cotización y Desglose Financiero (Política 2):**
   - Venta original seleccionada: `7187c3b5-a498-441b-a657-a2b7f254f5d0`.
   - Prenda a devolver: `Wrangler Women White Smocked Top` (SKU `MYN-41401`).
   - Valor original de la prenda: **Bs 109.00**.
   - Retención operativa aplicada: **30.00%** (**-Bs 32.70** para la empresa).
   - Reembolso neto al cliente: **70.00%** (**Bs 76.30**).
   - Plazo legal verificado: 2 días transcurridos de un máximo de 7 días.
3. **Modalidad 1 — Nota de Crédito Digital:**
   - Procesamiento con `refund_method = NOTA_CREDITO`.
   - Estado HTTP 201 Created.
   - Código unívoco emitido: `NC-20261112-F85D` por **Bs 76.30**.
   - Prenda reingresada al stock físico de la sucursal.
4. **Modalidad 2 — Reintegro en Efectivo:**
   - Procesamiento alternativo con `refund_method = EFECTIVO`.
   - Estado HTTP 201 Created con desglose de caja.
5. **Auditoría e Historial:**
   - Historial en `/api/returns` auditado con 16 devoluciones registradas y la Nota de Crédito persistida.

