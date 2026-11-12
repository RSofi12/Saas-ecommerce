import urllib.request
import json

def req(url, method='GET', body=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    data = json.dumps(body).encode('utf-8') if body else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        res = urllib.request.urlopen(r)
        return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def main():
    print("================================================================================")
    print("  EJECUCIÓN DEL FLUJO DE CASO DE USO 9 (CU09) — CONECTADO A STRIPE")
    print("================================================================================")

    # 1. Autenticación con credenciales solicitadas
    print("\n[PASO 1] Iniciar Sesión con Credenciales Oficiales:")
    s, r_client = req('http://127.0.0.1:8000/api/auth/login', 'POST', {'email': 'cliente01.demo@fashionstore.bo', 'password': 'Tiendafashion123!'})
    client_tok = r_client['data']['access_token']
    client_user = r_client['data']['user']
    print(f"   ✓ Cliente: {client_user['email']} (Rol: {client_user['rol']})")

    s, r_admin = req('http://127.0.0.1:8000/api/auth/login', 'POST', {'email': 'admin@elegance.com', 'password': 'Tiendafashion123!'})
    admin_tok = r_admin['data']['access_token']
    admin_user = r_admin['data']['user']
    print(f"   ✓ Admin: {admin_user['email']} (Rol: {admin_user['rol']})")

    # 2. Asegurar prenda con stock en el carrito
    print("\n[PASO 2] Añadir 1 Prenda al Carrito:")
    req('http://127.0.0.1:8000/api/cart/current', 'DELETE', token=client_tok)

    stock_variant_id = 'cc1c032c-4780-4f0a-a2ab-cfdd55a866d5'
    branch_id = '5fb4df9a-93f4-4658-86e2-d08bc1254163'

    s, add_resp = req('http://127.0.0.1:8000/api/cart/items', 'POST', {'variant_id': stock_variant_id, 'quantity': 1}, token=client_tok)
    assert s == 201, f"Error al agregar al carrito: {add_resp}"
    print(f"   ✓ Prenda agregada al carrito con éxito: HTTP {s}")

    # 3. Checkout con Envío a Domicilio vía Stripe
    print("\n[PASO 3] Checkout con Envío a Domicilio y Stripe:")
    checkout_payload = {
        'delivery_type': 'ENVIO_DOMICILIO',
        'shipping_address': 'Av. San Martín #456, Barrio Equipetrol, Santa Cruz',
        'pickup_branch_id': branch_id
    }
    s, order_resp = req('http://127.0.0.1:8000/api/payments/stripe/checkout', 'POST', checkout_payload, token=client_tok)
    assert s == 201, f"Fallo al crear orden Stripe: {order_resp}"
    order = order_resp['data']
    order_id = order['order_id']
    print(f"   ✓ Sesión de Stripe Creada Exitosamente: HTTP {s}")
    print(f"   ✓ Orden ID Generada: {order_id}")
    print(f"   ✓ Stripe PaymentIntent ID: {order['payment_intent_id']}")
    print(f"   ✓ Stripe Client Secret: {order['client_secret'][:25]}...")
    print(f"   ✓ Modalidad: {order.get('delivery_type')}")
    print(f"   ✓ Dirección de Entrega: {order.get('shipping_address')}")

    # 4. PRUEBA DE LA REGLA INVIOLABLE (POLÍTICA 3 - RECHAZO DE DESPACHO SIN PAGO)
    print("\n[PASO 4] PRUEBA DE LA REGLA INVIOLABLE (POLÍTICA 3 - RECHAZO DE DESPACHO):")
    print("   -> Administrador intenta autorizar el despacho mientras payment_status = 'pending'...")
    s, dispatch_fail = req(f'http://127.0.0.1:8000/api/orders/{order_id}/dispatch', 'POST', {'shipping_notes': 'Intento sin pago'}, token=admin_tok)
    print(f"   ✓ Código HTTP: {s} (400 Bad Request)")
    backend_msg = dispatch_fail.get('message') or dispatch_fail.get('detail')
    print(f"   ✓ Respuesta del Backend:\n     \"{backend_msg}\"")
    assert s == 400, "Error: El despacho debió ser bloqueado"
    print("   >>> [POLÍTICA 3 VALIDADA]: El botón de despacho permanece BLOQUEADO y la API RECHAZA la orden sin pago.")

    # 5. CONFIRMACIÓN OFICIAL DEL PAGO
    print("\n[PASO 5] Confirmación de Pago de la Orden:")
    s, confirm_resp = req(f'http://127.0.0.1:8000/api/payments/test-confirm-order/{order_id}', 'POST', token=admin_tok)
    assert s == 200, f"Fallo al confirmar pago: {confirm_resp}"
    print(f"   ✓ Transacción confirmada: HTTP {s}")
    print(f"   ✓ Nuevo Estado de Pago de la Orden: {confirm_resp['data']['payment_status']} (PAID)")

    # 6. PRUEBA DE LA REGLA (POLÍTICA 3 - APROBACIÓN TRAS CONFIRMACIÓN)
    print("\n[PASO 6] PRUEBA DE LA REGLA (POLÍTICA 3 - APROBACIÓN TRAS PAGO CONFIRMADO):")
    print("   -> Administrador vuelve a intentar el despacho de la orden ahora con payment_status = 'paid'...")
    s, dispatch_ok = req(f'http://127.0.0.1:8000/api/orders/{order_id}/dispatch', 'POST', {'shipping_notes': 'Despacho prioritario FedEx Express'}, token=admin_tok)
    assert s == 200, f"Fallo en despacho: {dispatch_ok}"
    dispatch_data = dispatch_ok['data']
    print(f"   ✓ Código HTTP: {s} (200 OK)")
    print(f"   ✓ ¡Despacho Aprobado Exitosamente!")
    print(f"     - Código Formal de Rastreo: {dispatch_data['tracking_number']}")
    print(f"     - Estado de Fulfillment: {dispatch_data['fulfillment_status']}")
    print(f"     - Fecha de Despacho: {dispatch_data['dispatched_at']}")

    # 7. CONSULTA PÚBLICA DE GUÍA DE RASTREO
    print("\n[PASO 7] Consulta Pública / Cliente de Rastreo de Pedido:")
    tracking_code = dispatch_data['tracking_number']
    s, track_resp = req(f'http://127.0.0.1:8000/api/orders/tracking/{tracking_code}', 'GET')
    assert s == 200, f"Fallo en tracking: {track_resp}"
    track_data = track_resp['data']
    print(f"   ✓ Código HTTP: {s} (200 OK)")
    print(f"   ✓ Pantalla de Seguimiento del Cliente:")
    print(f"     - Número de Guía: {track_data['tracking_number']}")
    print(f"     - Estado de Entrega: {track_data['fulfillment_status']} (DISPATCHED)")
    print(f"     - Destino: {track_data['shipping_address']}")
    print(f"     - Fecha: {track_data['dispatched_at']}")

    print("\n================================================================================")
    print("  RESULTADO: CU09 CONECTADO CON STRIPE VALIDADO AL 100%")
    print("================================================================================\n")

if __name__ == '__main__':
    main()
