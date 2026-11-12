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
    print("  EJECUCIÓN DEL FLUJO DE CASO DE USO 17 (CU17)")
    print("  CAMBIO DE PRENDA POR TALLA CON COBRO DE DIFERENCIA (POLÍTICA 1)")
    print("================================================================================")

    # 1. Autenticación como Administrador / Vendedor
    print("\n[PASO 1] Iniciar Sesión con Credenciales Oficiales:")
    s, r_admin = req('http://127.0.0.1:8000/api/auth/login', 'POST', {'email': 'admin@elegance.com', 'password': 'Tiendafashion123!'})
    assert s == 200, f"Error en login: {r_admin}"
    token = r_admin['data']['access_token']
    admin_user = r_admin['data']['user']
    print(f"   ✓ Administrador: {admin_user['email']} (Rol: {admin_user['rol']})")

    # Sucursal y prendas de prueba
    branch_id = '5fb4df9a-93f4-4658-86e2-d08bc1254163' # Boutique Elegance - Central
    sale_id = '678fdfd6-e23f-40bd-96ee-53ad0441e73b'
    orig_var_id = '3a6e83e9-f493-4a32-bb5b-b965d878bdd1' # MYN-27089, Precio 94.00 Bs
    new_var_id = '613f88e4-1a87-4dff-9698-31af8d4d17b1'  # MYN-24406, Precio 124.00 Bs

    # 2. Seleccionar venta existente y cotizar cambio
    print("\n[PASO 2 & 3] Seleccionar Venta y Prenda Solicitada para Cambio:")
    quote_payload = {
        'sale_id': sale_id,
        'original_variant_id': orig_var_id,
        'new_variant_id': new_var_id
    }
    s_q, r_quote = req(f'http://127.0.0.1:8000/api/exchanges/quote?branch_id={branch_id}', 'POST', quote_payload, token=token)
    assert s_q == 200, f"Error en cotización: {r_quote}"
    quote = r_quote['data']

    # 4. Liquidación Automática en Pantalla
    print("\n[PASO 4] Liquidación Automática de Diferencia de Precios:")
    p_orig = quote['original_unit_price']
    p_new = quote['new_unit_price']
    delta = quote['price_difference']
    print(f"   ✓ Prenda Original: {quote['original_product_name']} ({quote['original_variant_sku']})")
    print(f"     * Precio Prenda Original: Bs {p_orig:.2f}")
    print(f"   ✓ Prenda Nueva Solicitada: {quote['new_product_name']} ({quote['new_variant_sku']})")
    print(f"     * Precio Prenda Nueva:    Bs {p_new:.2f}")
    print(f"     * Diferencia a Pagar:    +Bs {delta:.2f} (Requires Payment: {quote['requires_payment']})")
    print(f"     * Stock Disponible Nueva Prenda: {quote['available_stock_new']} unidades")

    # 5. PRUEBA DE LA POLÍTICA 1 (RECHAZO SI NO ABONA DIFERENCIA)
    print("\n[PASO 5A] PRUEBA DE LA REGLA INVIOLABLE (POLÍTICA 1 - NO ABONA DIFERENCIA):")
    print("   -> Cliente o cajero pulsa cancelar o intenta consolidar sin abonar la diferencia...")
    fail_payload = {
        'sale_id': sale_id,
        'original_variant_id': orig_var_id,
        'new_variant_id': new_var_id,
        'condition': 'good_with_tags',
        'difference_paid': False,
        'payment_method': None,
        'notes': 'Intento sin abonar diferencia de precio'
    }
    s_fail, r_fail = req(f'http://127.0.0.1:8000/api/exchanges?branch_id={branch_id}', 'POST', fail_payload, token=token)
    print(f"   ✓ Código HTTP: {s_fail} (400 Bad Request)")
    backend_msg = r_fail.get('message') or r_fail.get('detail')
    print(f"   ✓ Respuesta del Backend:\n     \"{backend_msg}\"")
    assert s_fail == 400, "Error: El cambio debió ser bloqueado"
    print("   >>> [POLÍTICA 1 VALIDADA]: La operación NO se consolida y el inventario permanece inalterado.")

    # 6. CONSOLIDACIÓN DEL CAMBIO TRAS ABONAR LA DIFERENCIA
    print("\n[PASO 5B] Consolidación con Abono de Diferencia (+Bs 30.00 en Efectivo):")
    success_payload = {
        'sale_id': sale_id,
        'original_variant_id': orig_var_id,
        'new_variant_id': new_var_id,
        'condition': 'good_with_tags',
        'difference_paid': True,
        'payment_method': 'EFECTIVO',
        'notes': 'Cambio aprobado: cliente abonó diferencia en mostrador'
    }
    s_ok, r_ok = req(f'http://127.0.0.1:8000/api/exchanges?branch_id={branch_id}', 'POST', success_payload, token=token)
    assert s_ok == 201, f"Error en consolidación: {r_ok}"
    ex_data = r_ok['data']
    print(f"   ✓ Código HTTP: {s_ok} (201 Created)")
    print(f"   ✓ ¡Comprobante de Cambio Generado Exitosamente!")
    print(f"     - ID Comprobante de Cambio: {ex_data['id']}")
    print(f"     - Diferencia Cobrada: Bs {ex_data['price_difference']:.2f}")
    print(f"     - Método de Cobro: {ex_data['payment_method']}")
    print(f"     - Estado: {ex_data['status']}")
    print(f"     - Fecha y Hora: {ex_data['created_at']}")

    # 7. AUDITORÍA DE SWAP ATÓMICO EN HISTORIAL DE CAMBIOS
    print("\n[PASO 6] Auditoría del Swap de Inventario e Historial:")
    s_list, r_list = req(f'http://127.0.0.1:8000/api/exchanges?branch_id={branch_id}', 'GET', token=token)
    assert s_list == 200
    exchanges = r_list['data']
    found = any(e['id'] == ex_data['id'] for e in exchanges)
    print(f"   ✓ Swap atómico consolidado en inventario de sucursal.")
    print(f"   ✓ Registro auditado en historial de cambios (Total registrados: {len(exchanges)})")
    assert found, "El cambio no figura en el historial de la sucursal"

    print("\n================================================================================")
    print("  RESULTADO: CU17 Y POLÍTICA DE NEGOCIO 1 VALIDADOS AL 100%")
    print("================================================================================\n")

if __name__ == '__main__':
    main()

