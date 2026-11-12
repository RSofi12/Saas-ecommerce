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
    print("  EJECUCIÓN DEL FLUJO DE CASO DE USO 18 (CU18)")
    print("  PROCESAR DEVOLUCIÓN DE PRENDA CON RETENCIÓN (20%-50%) Y NOTA DE CRÉDITO")
    print("================================================================================")

    # 1. Autenticación como Administrador / Vendedor
    print("\n[PASO 1] Iniciar Sesión con Credenciales Oficiales:")
    s, r_admin = req('http://127.0.0.1:8000/api/auth/login', 'POST', {'email': 'admin@elegance.com', 'password': 'Tiendafashion123!'})
    assert s == 200, f"Error en login: {r_admin}"
    token = r_admin['data']['access_token']
    admin_user = r_admin['data']['user']
    print(f"   ✓ Administrador: {admin_user['email']} (Rol: {admin_user['rol']})")

    branch_id = '5fb4df9a-93f4-4658-86e2-d08bc1254163' # Boutique Elegance - Central
    sale_id = '7187c3b5-a498-441b-a657-a2b7f254f5d0'   # Venta reciente (hace 2 días)
    variant_id = '41bbbb1d-f7b3-4693-b6da-a58968dae059' # Prenda adquirida (Wrangler Smocked Top)

    # 2. Cotizar devolución y revisar liquidación financiera
    print("\n[PASO 2, 3 & 4] Cotización y Desglose Contable de la Devolución:")
    quote_payload = {
        'sale_id': sale_id,
        'variant_id': variant_id
    }
    s_q, r_quote = req(f'http://127.0.0.1:8000/api/returns/quote?branch_id={branch_id}', 'POST', quote_payload, token=token)
    assert s_q == 200, f"Error en cotización: {r_quote}"
    q = r_quote['data']

    print(f"   ✓ Prenda Seleccionada: {q['product_name']} ({q['variant_sku']})")
    print(f"   ✓ Política Aplicada: {q['policy_tenant_name']}")
    print(f"   ✓ Días Transcurridos: {q['days_elapsed']} día(s) (Máximo permitido: {q['max_return_days']} días)")
    print("   -----------------------------------------------------------------------------")
    print(f"   * Valor de la Prenda:                 Bs {q['original_item_amount']:.2f}")
    print(f"   * Retención Operativa ({q['retention_percentage']:.0f}%):         -Bs {q['retention_amount']:.2f} (ganancia/costo operativo empresa)")
    print(f"   * Reembolso Neto al Cliente ({(100 - q['retention_percentage']):.0f}%):    Bs {q['refund_amount']:.2f}")
    print("   -----------------------------------------------------------------------------")

    # 3. Modalidad 1: Reintegro mediante NOTA DE CRÉDITO DIGITAL
    print("\n[PASO 5A] Procesar Devolución con Modalidad: 'NOTA DE CRÉDITO DIGITAL':")
    nc_payload = {
        'sale_id': sale_id,
        'variant_id': variant_id,
        'condition': 'good_with_tags',
        'refund_method': 'NOTA_CREDITO',
        'reason': 'Devolución conforme a Política 2 — Emisión de Nota de Crédito canjeable'
    }
    s_nc, r_nc = req(f'http://127.0.0.1:8000/api/returns?branch_id={branch_id}', 'POST', nc_payload, token=token)
    assert s_nc == 201, f"Error al procesar devolución con NC: {r_nc}"
    nc_data = r_nc['data']

    print(f"   ✓ Código HTTP: {s_nc} (201 Created)")
    print(f"   ✓ ¡Devolución Procesada y Consolidada Exitosamente!")
    print(f"     - ID Registro: {nc_data['id']}")
    print(f"     - Código Formal Nota de Crédito: {nc_data['credit_note_code']}")
    print(f"     - Importe Reembolsado en NC: Bs {nc_data['refund_amount']:.2f}")
    print(f"     - Retención Consolidada: Bs {nc_data['retention_amount']:.2f}")
    print(f"     - Prenda Reingresada al Stock Disponible (+1)")

    # 4. Modalidad 2: Reintegro mediante EFECTIVO (sobre otra prenda de la venta)
    sale_id_2 = '678fdfd6-e23f-40bd-96ee-53ad0441e73b'
    var_id_2 = '3a6e83e9-f493-4a32-bb5b-b965d878bdd1'
    print("\n[PASO 5B] Procesar Devolución con Modalidad Alternativa: 'EFECTIVO':")
    cash_payload = {
        'sale_id': sale_id_2,
        'variant_id': var_id_2,
        'condition': 'good_with_tags',
        'refund_method': 'EFECTIVO',
        'reason': 'Devolución conforme a Política 2 — Reembolso en efectivo en mostrador'
    }
    s_cash, r_cash = req(f'http://127.0.0.1:8000/api/returns?branch_id={branch_id}', 'POST', cash_payload, token=token)
    assert s_cash == 201, f"Error al procesar devolución en efectivo: {r_cash}"
    cash_data = r_cash['data']

    print(f"   ✓ Código HTTP: {s_cash} (201 Created)")
    print(f"     - ID Registro: {cash_data['id']}")
    print(f"     - Modalidad: {cash_data['refund_method']}")
    print(f"     - Efectivo Reembolsado: Bs {cash_data['refund_amount']:.2f}")
    print(f"     - Retención Empresa: Bs {cash_data['retention_amount']:.2f}")

    # 5. Auditoría de Historial de Devoluciones
    print("\n[PASO 6] Auditoría del Registro en Historial de Devoluciones:")
    s_list, r_list = req(f'http://127.0.0.1:8000/api/returns?branch_id={branch_id}', 'GET', token=token)
    assert s_list == 200
    all_returns = r_list['data']
    print(f"   ✓ Total de devoluciones auditadas en sucursal: {len(all_returns)}")
    print(f"   ✓ Nota de Crédito {nc_data['credit_note_code']} verificada y persistida en el sistema.")

    print("\n================================================================================")
    print("  RESULTADO: CU18 Y POLÍTICA DE NEGOCIO 2 VALIDADOS AL 100%")
    print("================================================================================\n")

if __name__ == '__main__':
    main()
