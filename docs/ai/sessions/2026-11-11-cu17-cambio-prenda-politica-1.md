# Sesión 2026-11-11: Verificación Integral del CU17 (Cambio de Prenda con Cobro de Diferencia y Política 1)

## 1. Alcance
- **Caso de Uso:** `[CU17] PROCESAR CAMBIO DE PRENDA POR TALLA CON COBRO DE DIFERENCIA (POLÍTICA 1)`.
- **Actor:** Administrador de Empresa / Vendedor de Mostrador (`admin@elegance.com`).
- **Objetivo:** Ejecutar la verificación rigurosa del flujo de cambio de prenda por talla o modelo con diferencia de precio (Delta > 0), validando la Política de Negocio 1 (inviolable: si no se abona la diferencia, se aborta y no se altera inventario; si se abona, se ejecuta swap atómico de inventario y se genera comprobante formal).

## 2. Ajustes Realizados
- **Verificación de Endpoints API:**
  - `POST /api/exchanges/quote`: Cotización en tiempo real calculando `price_difference` y existencias en la sucursal.
  - `POST /api/exchanges`: Procesamiento transaccional de cambio con validación de condición textil (`good_with_tags`) y abono de diferencia (`difference_paid`).
  - `GET /api/exchanges`: Consulta del historial de auditoría de cambios.

## 3. Resultados de la Prueba End-to-End (`run_cu17_test.py`)
1. **Autenticación:**
   - Administrador `admin@elegance.com` autenticado con rol `administrador` (HTTP 200).
2. **Selección y Cotización:**
   - Prenda original adquirida: `Aneri Women Jazz Brown Kurta` (SKU `MYN-27089`) a Bs 94.00.
   - Prenda nueva solicitada: `Vishudh Women Red Printed Kurta` (SKU `MYN-24406`) a Bs 124.00.
   - Liquidación automática: Diferencia a pagar = `+Bs 30.00` (`requires_payment = True`).
   - Stock disponible en sucursal central: verificado y suficiente.
3. **Validación de la Regla Sagrada (Política 1):**
   - Intento de consolidación con `difference_paid = False`:
     - **Rechazado con HTTP 400 Bad Request**.
     - Mensaje del backend: `"Política de Cambio: La nueva prenda tiene mayor precio (Δ > 0). El cambio solo puede consolidarse si el cliente abona la diferencia de precio."`
     - Stock no se altera y la operación queda cancelada.
4. **Consolidación del Cambio con Abono:**
   - Se ingresa abono de `Bs 30.00` en `EFECTIVO` (`difference_paid = True`).
   - **Aprobado con HTTP 201 Created**.
   - Comprobante formal emitido: `ID: 568373b0-edca-4a4e-be66-8ceb5b91aa7a`.
   - Swap atómico de inventario ejecutado (+1 en stock de prenda devuelta, -1 en stock de prenda entregada).
   - Comprobante registrado en auditoría (`GET /api/exchanges`).

