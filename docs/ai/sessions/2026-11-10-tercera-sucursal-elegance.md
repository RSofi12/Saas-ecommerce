# Sesión de Trabajo: 2026-11-10 - Alta y Siembra Operativa de la 3ra Sucursal de Boutique Elegance

## 1. Objetivo de la Sesión
- Aprovisionar una tercera sucursal activa para el tenant **Boutique Elegance** (`elegance`), que cuenta con suscripción al **Plan Profesional** (límite de hasta 10 sucursales físicas).
- Sembrar registros operativos y transaccionales realistas y coherentes en todas las tablas relacionales para que la nueva sucursal opere con la misma dinámica que las preexistentes (*Central* y *Equipetrol*).

## 2. Cambios y Datos Sembrados (PostgreSQL Neon)

### A. Nueva Sucursal Aprovisionada
- **Nombre:** `Boutique Elegance - Ventura Mall`
- **ID:** `3d9265af-bc1c-414c-b1e8-d560dc463aa7`
- **Tenant:** `Boutique Elegance` (`17eeb457-a34c-47a4-8826-5d9e03d1dfe5`)
- **Ciudad:** Santa Cruz
- **Dirección:** Av. San Martín y 4to Anillo, Ventura Mall, Nivel 2, Local 214
- **Teléfono:** +591 3 3458920
- **Estado:** `is_active = True`

### B. Inventario y Catálogo (`inventory`)
- Se sembró stock físico para **las 60 variantes de prendas** registradas del tenant.
- Cantidades iniciales asignadas entre **40 y 120 unidades** por variante, con `minimum_stock = 5` y `reserved_quantity = 0`.

### C. Personal Asignado (`users`)
- Se crearon y asignaron 3 cajeros operativos:
  1. `Camila Suárez` (`camila.suarez.vm@fashionstore.bo`)
  2. `Lucas Montenegro` (`lucas.montenegro.vm@fashionstore.bo`)
  3. `Valeria Justiniano` (`valeria.justiniano.vm@fashionstore.bo`)

### D. Movimientos Comerciales y POS (`sales` & `sale_items`)
- **50 Ventas POS** registradas con estado `completed`, medio de pago `cash`, referencias de caja (`POS-VM-1001` a `POS-VM-1050`), UUIDv4 de cliente, llaves de idempotencia y sincronización offline (`is_offline = true`).
- **Sale Items** vinculados detallando prendas, SKU, talla, color, precio unitario y subtotal.

### E. Casos de Uso de Postventa (CU19 y CU20)
- **Cambios de Prenda (CU19 - `garment_exchanges`):** 6 registros con `difference_paid = True` y estado `COMPLETED` conforme a la política comercial de abono en caja.
- **Devoluciones de Prenda (CU20 - `garment_returns`):** 5 registros aplicando retención operativa del 30% y emisión de notas de crédito formales (`NC-VM-202600` a `NC-VM-202604`).

### F. Reservas e Inteligencia Analítica
- **Reservas (`reservations`):** 15 registros con fechas de visita y estados válidos en el enum (`confirmed`, `attended`, `not_sold`).
- **Interacciones para Modelos de Recomendación (`user_product_interactions`):** 300 interacciones ponderadas (`view`, `cart_add`, `purchase`) para el motor de filtrado colaborativo y Gemini IA.

## 3. Estado Verificado
- **Boutique Elegance:** 3 sucursales activas (*Central*, *Equipetrol*, *Ventura Mall*).
- **Moda Urbana:** 1 sucursal activa (*Casco Viejo*).
- **Boutique París S.R.L.:** 0 sucursales activas.

