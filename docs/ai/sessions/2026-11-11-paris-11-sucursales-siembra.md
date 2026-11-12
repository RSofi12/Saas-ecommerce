# Sesión de Trabajo: 2026-11-11 - Provisión y Siembra Integral de 11 Sucursales Activas para Boutique París S.R.L.

## 1. Objetivo de la Sesión
- Aprovisionar **11 sucursales activas** para **Boutique París S.R.L.** (`boutique-par-s-s-r-l`) con el fin de superar el límite de 10 sedes del Plan Profesional y verificar con rigor el Downgrade Guard (CU02/CU04).
- Poblar íntegramente las tablas relacionales correspondientes (inventario, personal, ventas POS, cambios, devoluciones, reservas e interacciones ML) para reflejar la actividad operativa de una cadena corporativa multinacional.

## 2. Datos y Movimientos Aprovisionados (Neon PostgreSQL)

### A. Suscripción Verificada
- **Plan Activo:** `EMPRESARIAL` (Cupo de hasta 223 sucursales físicas y suite completa de IA/ML).

### B. 11 Sucursales Físicas Activas (`branches`)
1. *Boutique París - Central Monseñor Rivero* (Santa Cruz)
2. *Boutique París - Ventura Mall Luxury* (Santa Cruz)
3. *Boutique París - Las Brisas Mall* (Santa Cruz)
4. *Boutique París - Equipetrol Norte* (Santa Cruz)
5. *Boutique París - Calacoto Plaza* (La Paz)
6. *Boutique París - San Miguel* (La Paz)
7. *Boutique París - Sopocachi Boulevard* (La Paz)
8. *Boutique París - El Prado Central* (Cochabamba)
9. *Boutique París - Cala Cala* (Cochabamba)
10. *Boutique París - Plaza 25 de Mayo* (Sucre)
11. *Boutique París - El Molino* (Tarija)
*Todas con `is_active = True` y `tenant_id = '1de16f02-c5c5-4b27-a1ba-9f52a183d110'`.*

### C. Inventario Físico (`inventory`)
- **660 registros de stock** (11 sucursales x 60 variantes de prendas de catálogo).
- Stock inicial asignado entre 30 y 95 unidades por variante con reserva y stock mínimo reglamentario.

### D. Clientes y Personal (`users`)
- **15 clientes recurrentes** creados y asociados al tenant con `rol = 'cliente'`.
- **22 cajeros/vendedores** creados y distribuidos equitativamente (2 por cada sucursal) con correos `@fashionstore.bo` y `rol = 'cajero'`.

### E. Ventas Comerciales POS (`sales` & `sale_items`)
- **110 ventas POS completadas** (10 por sucursal) con detalle de ítems, precios reales, llaves de idempotencia (`IDEM-POS-PARIS-...`), fechas escalonadas en los últimos 40 días y modo `is_offline = true`.

### F. Postventa (CU19 y CU20)
- **11 cambios de prenda (CU19 - `garment_exchanges`):** 1 por sucursal, con diferencia de precio cobrada en caja (`difference_paid = True`, `COMPLETED`).
- **11 devoluciones (CU20 - `garment_returns`):** 1 por sucursal, aplicando retención del 30% y emitiendo notas de crédito formales (`NC-PARIS-...`).

### G. Reservaciones e Inteligencia Analítica
- **22 reservaciones (`reservations`):** 2 por sucursal con estados válidos en el catálogo de reservas.
- **400 interacciones para ML (`user_product_interactions`):** Eventos ponderados de visualización, carrito y compra por sucursal.

## 3. Verificación de Restricciones (Downgrade Guard)
- `GET /api/saas/subscriptions/company/{paris_id}`: Retorna `Plan: EMPRESARIAL`, `active_branches_count: 11`.
- Intento de degradar al Plan Profesional (máx 10 sedes): **Rechazado con HTTP 400 Bad Request** (`"No se puede cambiar al plan PROFESIONAL. La empresa tiene 11 sucursales activas y el plan permite un máximo de 10."`).
- Intento de degradar al Plan Básico (máx 2 sedes): **Rechazado con HTTP 400 Bad Request**.
- En Frontend, el modal bloquea ambas opciones y marca la insignia preventiva `Excede cuota`.
