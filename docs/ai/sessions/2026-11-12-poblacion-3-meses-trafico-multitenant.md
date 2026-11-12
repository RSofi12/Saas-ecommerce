# Sesión: 2026-11-12 - Población Integral de la Base de Datos con 3 Meses de Tráfico Operacional Realista Multitenant

## 1. Alcance y Motivación
- **Solicitud del Usuario:** Poblar la base de datos con un tráfico realista de 3 meses de uso continuo del proyecto, enriqueciendo el catálogo de prendas e imágenes (que anteriormente solo contaba con ~50-60 prendas en un solo tenant) para **todos los tenants activos** del ecosistema SaaS (`Boutique Elegance`, `Moda Urbana` y `Boutique París S.R.L.`), con datos estrictamente realistas (marcas, modelos, fotografías reales, nombres bolivianos y cumplimiento riguroso de políticas de negocio).
- **Periodo Cronológico de Tráfico:** 90 días (del 13 de agosto al 11 de noviembre de 2026).

---

## 2. Componentes y Scripts Implementados

### 2.1 Poblador Vectorizado Nativo ([`backend/populate_traffic_fast.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/populate_traffic_fast.py))
- Implementación de script de alto rendimiento con `psycopg2.extras.execute_values` que inserta en PostgreSQL miles de tuplas multi-row en batches de red optimizados, evitando la sobrecarga de round-trips ORM.
- **Catálogo Textil Realista:**
  - Extraído desde [`backend/styles.csv`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/styles.csv) y [`backend/images.csv`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/backend/images.csv).
  - Prendas asignadas según perfil comercial:
    * `Boutique Elegance` (75 productos): Prendas de alta costura, vestidos de gala, camisas de lino, blazers ejecutivos.
    * `Moda Urbana` (75 productos): Streetwear, jeans denim, chaquetas bomber, sudaderas hoodie, tops urbanos.
    * `Boutique París S.R.L.` (75 productos): Moda formal internacional, vestidos de cóctel, sastrería y faldas plisadas.
  - Generadas variantes diferenciadas por talla (XS, S, M, L, XL, 28, 30, 32, 34, 36) y color (Negro, Blanco, Azul Marino, Rojo, Verde Oliva, Beige, Gris, Rosa, Marrón), con política de precios diferenciados para tallas mayores (L/XL a +Bs 15.00) y SKUs formalizados.
- **Inventario por Sucursal:**
  - Despliegue de stock físico para las 17 sucursales de los 3 tenants (5 en Elegance, 1 en Urbana, 11 en París).
- **Cartera de Clientes Bolivianos:**
  - 90 clientes registrados con nombres reales bolivianos (apellidos cruceños, cochabambinos y paceños), teléfonos, correos y perfiles corporales en `user_body_profiles`.
- **Tráfico Transaccional de 90 Días:**
  - Ventas POS distribuidas con multiplicador de fin de semana (1.8x) y picos de quincena/fin de mes (1.35x).
  - Ventas de contingencia offline (16% de las ventas en efectivo) con hash UUIDv4 e inserción en `sync_operations`.
  - Pedidos online con despacho Stripe, pasarela simulada y códigos `DSP-YYYYMMDD-XXXX`.
  - Cambios de talla (CU17) con abono obligatorio de diferencia de precio.
  - Devoluciones operativas (CU18) con retenciones del 20% al 50% y emisión de Notas de Crédito `NC-YYYYMMDD-XXXX`.
  - Reservas de mostrador y online (CU10/11/12) gestionadas y atendidas.

---

## 3. Balance Estadístico Final Consolidado en Base de Datos

| Métrica / Entidad | Volumen Poblado en Base de Datos |
| :--- | :--- |
| **Prendas en Catálogo (`products`)** | **225 productos únicos** (75 por tenant) |
| **Variantes con Fotografía (`product_variants`)** | **757 variantes activas** con imágenes CDN reales |
| **Registros de Stock (`inventory`)** | **5,207 posiciones de inventario** |
| **Ventas POS Totales (`sales`)** | **5,582 transacciones de venta** |
| **Prendas Facturadas (`sale_items`)** | **8,488 ítems vendidos** |
| **Operaciones Offline (`sync_operations`)** | **438 registros de contingencia e idempotencia** |
| **Cambios de Prenda por Talla (`garment_exchanges`)** | **259 cambios con abono de diferencia (CU17)** |
| **Devoluciones de Prenda (`garment_returns`)** | **171 notas de crédito formales (CU18, retención 20%-50%)** |
| **Pedidos Online (`orders`)** | **81 pedidos Stripe con tracking `DSP-...` (CU09)** |
| **Reservas de Mostrador (`reservations`)** | **438 reservas gestionadas (CU10/CU11/CU12)** |

### Desglose Comercial por Empresa:
- **Boutique Elegance:** 75 productos | 160 variantes | 1,900 ventas | **Bs 618,653.30 netos** | 95 cambios | 68 devoluciones.
- **Moda Urbana:** 75 productos | 300 variantes | 1,043 ventas | **Bs 263,320.90 netos** | 58 cambios | 42 devoluciones.
- **Boutique París S.R.L.:** 75 productos | 297 variantes | 2,585 ventas | **Bs 1,557,293.80 netos** | 106 cambios | 61 devoluciones.

