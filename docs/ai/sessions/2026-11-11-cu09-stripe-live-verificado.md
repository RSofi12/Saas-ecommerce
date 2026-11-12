# Sesión 2026-11-11: Verificación Integral del CU09 Conectado a Stripe Live

## 1. Alcance
- **Caso de Uso:** `[CU09] COMPRAR PRENDAS CON STRIPE Y DESPACHO CONDICIONADO (POLÍTICA 3)`.
- **Actores:**
  - Cliente Comprador (`cliente01.demo@fashionstore.bo`)
  - Administrador de Despacho (`admin@elegance.com`)
- **Objetivo:** Ejecutar el flujo completo de checkout conectándose con la API real de Stripe mediante las nuevas llaves oficiales (Publishable y Secret Key), validando la creación de la sesión de pago (PaymentIntent), el bloqueo estricto del despacho sin pago y la posterior aprobación con guía de rastreo `DSP-YYYYMMDD-XXXX`.

## 2. Ajustes Realizados
- **Configuración Stripe:**
  - Se configuró la clave secreta `rk_live_...` en [`backend/.env`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/.env).
  - Se configuró la clave pública `pk_live_...` en [`frontend/src/environments/environment.ts`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/frontend/src/environments/environment.ts) y [`backend/.env`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/.env).
- **Resiliencia en Creación de Payment Intent:**
  - En [`backend/app/packages/p4_gestion_compras_reservas/services/order_service.py`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/backend/app/packages/p4_gestion_compras_reservas/services/order_service.py), se incorporó fallback automático a `payment_method_types=['card']` con idempotency key diferenciada en caso de que la cuenta no tenga métodos automáticos configurados para USD en el Dashboard de Stripe.

## 3. Resultados de la Prueba End-to-End (`run_cu09_test.py`)
1. **Autenticación:**
   - Cliente `cliente01.demo@fashionstore.bo` (HTTP 200).
   - Administrador `admin@elegance.com` (HTTP 200).
2. **Carrito:**
   - Prenda agregada al carrito con éxito (HTTP 201).
3. **Checkout con Stripe:**
   - Sesión Stripe generada exitosamente (HTTP 201).
   - `order_id`: `bb925149-e9ac-4ac0-8f1c-19eea51ff19a`.
   - `payment_intent_id`: `pi_3UamzqGmMrXC5go21NhsB5gJ`.
   - `client_secret`: `pi_3UamzqGmMrXC5go21NhsB5...`.
4. **Validación de Regla Sagrada (Política 3):**
   - Intento de despacho con estado `pending`: **Rechazado con HTTP 400 Bad Request**.
   - Mensaje del backend: `"Despacho bloqueado por Política de Negocio 3: El pedido debe estar pagado (payment_status = 'paid') en Stripe para autorizar el despacho de prendas. Estado actual: 'pending'"`.
5. **Confirmación y Despacho:**
   - Confirmación de pago: `payment_status = 'paid'` (HTTP 200).
   - Autorización de despacho: Aprobado (HTTP 200).
   - Código de rastreo formal emitido: `DSP-20261112-AEC9`.
   - Estado de fulfillment: `dispatched`.
6. **Consulta Pública / Cliente:**
   - Tracking público `/api/orders/tracking/DSP-20261112-AEC9`: Estado `dispatched` con dirección de entrega y timestamp exacto.

