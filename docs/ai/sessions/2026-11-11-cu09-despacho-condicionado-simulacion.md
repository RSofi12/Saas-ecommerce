# Sesión: 2026-11-11 — Caso de Uso 9 (CU09): Despacho Condicionado a Pago Stripe y Atajos de Simulación

**Fecha:** 11 de Noviembre de 2026  
**Caso de Uso:** CU09 (Comprar prendas con Stripe y despacho condicionado — Política de Negocio 3)  
**Alcance:** Backend, Frontend Angular PWA y Suite Automatizada de Verificación  

---

## 1. Resumen de la Tarea
Se verificó y habilitó el flujo completo del Caso de Uso 9 (CU09) con cumplimiento estricto de la **Política de Negocio 3** (prohibición de despachar pedidos sin confirmación previa de pago):
1. **Verificación de la Regla Inviolable (Política 3):**
   - Cuando un pedido con entrega a domicilio (`ENVIO_DOMICILIO`) tiene estado `payment_status = 'pending'`, el backend bloquea cualquier intento de despacho con **HTTP 400 Bad Request**:
     `"Despacho bloqueado por Política de Negocio 3: El pedido debe estar pagado (payment_status = 'paid') en Stripe para autorizar el despacho de prendas. Estado actual: 'pending'"`.
   - En Frontend, la tarjeta de despacho muestra el estado ámbar `"Despacho Bloqueado (Política 3)"` y el botón permanece deshabilitado (`disabled`).
2. **Salto de Pasarela y Simulación de Pago:**
   - Se ajustó el endpoint de simulación `POST /api/payments/test-confirm-order/{order_id}` para permitir la transición a `payment_status = 'paid'` tanto para perfiles administrativos como clientes en modo de prueba.
   - Tras la confirmación del pago, el Administrador/Encargado ejecuta `POST /api/orders/{order_id}/dispatch` obteniendo **HTTP 200 OK** y la generación del código formal de rastreo `DSP-YYYYMMDD-XXXX` (ej. `DSP-20261112-074F`).
3. **Atajos Interactivos en el Frontend (`cart-page`):**
   - Para agilizar pruebas y defensas académicas en localhost sin depender de credenciales bancarias externas de Stripe, se añadieron 2 botones de prueba en la interfaz del carrito:
     - `🔒 1. Crear Pedido Pendiente (Auditar Bloqueo Política 3)`
     - `⚡ 2. Crear Pedido y Confirmar Pago (Saltar Pasarela)`
4. **Habilitación de Vista de Órdenes para Rol Administrador:**
   - Se extendió el endpoint `GET /api/orders/branch` para que usuarios con rol `administrador` o `superadmin` puedan visualizar todas las órdenes de su tenant en `/app/admin/orders` sin requerir asignación directa de sucursal.

---

## 2. Archivos Modificados
- [`backend/app/packages/p4_gestion_compras_reservas/routes/order_routes.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p4_gestion_compras_reservas/routes/order_routes.py)
- [`backend/app/packages/p4_gestion_compras_reservas/services/order_service.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p4_gestion_compras_reservas/services/order_service.py)
- [`backend/app/packages/p4_gestion_compras_reservas/services/cart_service.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p4_gestion_compras_reservas/services/cart_service.py)
- [`backend/app/packages/p4_gestion_compras_reservas/routes/payment_routes.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p4_gestion_compras_reservas/routes/payment_routes.py)
- [`frontend/src/app/features/shared/services/checkout-api.service.ts`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/frontend/src/app/features/shared/services/checkout-api.service.ts)
- [`frontend/src/app/features/cliente/pages/cart-page.component.ts`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/frontend/src/app/features/cliente/pages/cart-page.component.ts)
- [`frontend/src/app/features/cliente/pages/cart-page.component.html`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/frontend/src/app/features/cliente/pages/cart-page.component.html)
- [`run_cu09_test.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/run_cu09_test.py)

---

## 3. Pruebas y Resultados
- **Ejecución del Runner Integral (`run_cu09_test.py`):**
  - Autenticación con `cliente01.demo@fashionstore.bo` y `admin@elegance.com`: **HTTP 200 OK**.
  - Creación de orden con `ENVIO_DOMICILIO`: Orden `a03cdc20-33a5-43cd-8c96-4e3b52241231` creada en estado `pending`.
  - Intento de despacho sin pago: **HTTP 400 Bad Request — Política 3 bloqueada**.
  - Simulación de pago Stripe: **HTTP 200 OK — payment_status transiciona a 'paid'**.
  - Reintento de despacho: **HTTP 200 OK — Guía generada `DSP-20261112-074F`**.
  - Consulta pública de rastreo (`/api/orders/tracking/DSP-20261112-074F`): **HTTP 200 OK**.
- **Compilación Frontend Angular:**
  - Compilación en caliente completada limpiamente en 0.609s.

