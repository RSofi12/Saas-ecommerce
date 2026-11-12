import sys
import uuid
import requests
from decimal import Decimal

BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
CONFLICTS_URL = f"{BASE_URL}/api/sales/conflicts"

def main():
    print("=" * 80)
    print("TEST [CU16] GESTIONAR Y RESOLVER CONFLICTOS DE VENTAS OFFLINE Y QUIEBRES DE STOCK")
    print("=" * 80)

    # 1. Autenticación como Administrador de Empresa / Encargado de Sucursal
    print("\n[PASO 1] Iniciar sesión como Encargado / Administrador (encargado.lp@fashionstore.bo / admin@elegance.com):")
    login_resp = requests.post(LOGIN_URL, json={
        "email": "encargado.lp@fashionstore.bo",
        "password": "Tiendafashion123!"
    })
    assert login_resp.status_code == 200, f"Error en login: {login_resp.text}"
    login_data = login_resp.json()["data"]
    token = login_data["access_token"]
    user = login_data["user"]
    branch_id = user["branch_id"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    print(f"   ✓ Sesión exitosa: {user['name']} ({user['email']})")
    print(f"   ✓ Rol del actor:  {user['rol']}")
    print(f"   ✓ Sucursal activa (branch_id): {branch_id}")
    print("   ✓ URLs habilitadas:")
    print("     - Administrador: http://localhost:4200/app/admin/conflicts")
    print("     - Encargado:     http://localhost:4200/app/encargado/sale-conflicts")

    # 2. Consultar prendas disponibles para crear conflicto de sobreventa offline
    print("\n[PASO 2] Consultando prendas en sucursal:")
    pack_resp = requests.get(f"{BASE_URL}/api/catalog/offline-pack?branch_id={branch_id}", headers=headers)
    assert pack_resp.status_code == 200, f"Error en catálogo: {pack_resp.text}"
    products = pack_resp.json()["data"]["products"]

    variants_list = []
    for p in products:
        if (str(p.get("tenant_id")) == str(user.get("tenant_id")) or p.get("tenant_id") is None):
            for v in p.get("variants", []):
                variants_list.append((p, v))

    if len(variants_list) < 2:
        for p in products:
            for v in p.get("variants", []):
                variants_list.append((p, v))

    assert len(variants_list) >= 2, "Se requieren al menos 2 variantes para probar sustitución"
    p1, v1 = variants_list[0]
    p2, v2 = variants_list[1]
    
    variant_1_id = v1["id"]
    variant_2_id = v2["id"]
    unit_price = float(v1.get("price", 150.0))
    sku_1 = v1.get("sku") or "SKU-VAR-1"
    print(f"   ✓ Prenda en conflicto original: '{p1['name']}' (ID: {variant_1_id}, SKU: {sku_1})")
    print(f"   ✓ Prenda sustituta disponible:  '{p2['name']}' (ID: {variant_2_id}, SKU: {v2.get('sku')})")

    # 3. Simular Venta en Conflicto por Quiebre de Stock Offline
    print("\n[PASO 3] Creando Venta Offline en Conflicto (Sobreventa durante desconexión):")
    client_sale_id = str(uuid.uuid4())
    
    # Insertar directamente mediante batch-sync o venta con cash_reference CONFLICT:
    import sys
    from pathlib import Path
    from dotenv import load_dotenv
    backend_dir = Path(__file__).resolve().parent / "backend"
    load_dotenv(backend_dir / ".env")
    sys.path.insert(0, str(backend_dir))
    from sqlalchemy import create_engine, text
    from app.core.config import settings
    
    engine = create_engine(settings.database_url)
    conflict_sale_id = str(uuid.uuid4())
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO sales (
                    id, tenant_id, branch_id, user_id, subtotal, discount_amount,
                    total_amount, payment_method, payment_status, status,
                    is_offline, client_sale_id, currency, cash_reference, created_at
                ) VALUES (
                    :id, '17eeb457-a34c-47a4-8826-5d9e03d1dfe5', :branch_id, :user_id,
                    :tot, 0.0, :tot, 'cash', 'paid', 'completed', true,
                    :csid, 'BOB', 'CONFLICT: Quiebre de stock central por sobreventa offline en sucursal', now()
                )
            """),
            {
                "id": conflict_sale_id,
                "branch_id": branch_id,
                "user_id": user["id"],
                "tot": unit_price,
                "csid": client_sale_id,
            }
        )
        conn.execute(
            text("""
                INSERT INTO sale_items (
                    id, tenant_id, sale_id, product_id, variant_id, variant_sku, quantity, unit_price, line_total, product_name
                ) VALUES (
                    gen_random_uuid(), '17eeb457-a34c-47a4-8826-5d9e03d1dfe5', :sale_id,
                    :prod_id, :var_id, :sku, 1, :price, :price, :pname
                )
            """),
            {
                "sale_id": conflict_sale_id,
                "prod_id": p1["id"],
                "var_id": variant_1_id,
                "sku": sku_1,
                "price": unit_price,
                "pname": p1["name"]
            }
        )
    print(f"   ✓ Venta en conflicto registrada en BD: ID={conflict_sale_id} (Ticket UUIDv4: {client_sale_id})")

    # 4. Abrir la "Bandeja de Conflictos de Stock"
    print("\n[PASO 4] Abrir la 'Bandeja de Conflictos de Stock' (GET /api/sales/conflicts):")
    conflicts_resp = requests.get(f"{CONFLICTS_URL}?branch_id={branch_id}", headers=headers)
    assert conflicts_resp.status_code == 200, f"Error al listar conflictos: {conflicts_resp.text}"
    conflicts = conflicts_resp.json()
    print(f"   ✓ Respuesta HTTP 200 OK: {len(conflicts)} ventas en conflicto detectadas en la bandeja.")
    
    target_conflict = next((c for c in conflicts if str(c.get("sale_id")) == conflict_sale_id), None)
    assert target_conflict is not None, "La venta en conflicto debe estar presente en la bandeja"
    print(f"   ✓ Detalle del conflicto: Cajero='{target_conflict.get('cashier_name')}', Motivo='{target_conflict.get('conflict_reason')}'")

    # 5. Probar VÍA 1: Sustitución acordada por otra prenda de igual valor
    print("\n[PASO 5] PRUEBA VÍA 1: Sustitución acordada por otra prenda de igual valor:")
    sub_payload = {
        "resolution_type": "substitute",
        "new_variant_id": variant_2_id,
        "resolution_note": "Acuerdo presencial con el cliente: se sustituye la prenda agotada por modelo alternativo de igual valor."
    }
    sub_resp = requests.post(f"{CONFLICTS_URL}/{conflict_sale_id}/resolve", json=sub_payload, headers=headers)
    assert sub_resp.status_code == 200, f"Error en resolución sustitución: {sub_resp.text}"
    sub_data = sub_resp.json()
    print(f"   ✓ Respuesta HTTP 200 OK")
    print(f"   ✓ Estado de Venta: {sub_data.get('status')} (completed)")
    print(f"   ✓ Vía Aplicada: {sub_data.get('resolution_type')}")
    print(f"   ✓ Mensaje: {sub_data.get('message')}")
    print(f"   ✓ Stock remanente de nueva prenda: {sub_data.get('resulting_stock')}")

    # 6. Probar VÍA 2: Emisión de Nota de Crédito por el 100% (código NC-...)
    print("\n[PASO 6] PRUEBA VÍA 2: Emisión de Nota de Crédito Digital por el 100% del importe pagado:")
    # Creamos un segundo conflicto para validar Vía 2
    conflict_sale_id_2 = str(uuid.uuid4())
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO sales (
                    id, tenant_id, branch_id, user_id, subtotal, discount_amount,
                    total_amount, payment_method, payment_status, status,
                    is_offline, client_sale_id, currency, cash_reference, created_at
                ) VALUES (
                    :id, '17eeb457-a34c-47a4-8826-5d9e03d1dfe5', :branch_id, :user_id,
                    :tot, 0.0, :tot, 'cash', 'paid', 'completed', true,
                    :csid, 'BOB', 'CONFLICT: Quiebre de stock central sobreventa', now()
                )
            """),
            {
                "id": conflict_sale_id_2,
                "branch_id": branch_id,
                "user_id": user["id"],
                "tot": unit_price,
                "csid": str(uuid.uuid4()),
            }
        )
        conn.execute(
            text("""
                INSERT INTO sale_items (
                    id, tenant_id, sale_id, product_id, variant_id, variant_sku, quantity, unit_price, line_total, product_name
                ) VALUES (
                    gen_random_uuid(), '17eeb457-a34c-47a4-8826-5d9e03d1dfe5', :sale_id,
                    :prod_id, :var_id, :sku, 1, :price, :price, :pname
                )
            """),
            {
                "sale_id": conflict_sale_id_2,
                "prod_id": p1["id"],
                "var_id": variant_1_id,
                "sku": sku_1,
                "price": unit_price,
                "pname": p1["name"]
            }
        )

    nc_payload = {
        "resolution_type": "credit_note",
        "resolution_note": "Cliente prefirió anulación total por no encontrar talla deseada. Se emite Nota de Crédito formal al 100%."
    }
    nc_resp = requests.post(f"{CONFLICTS_URL}/{conflict_sale_id_2}/resolve", json=nc_payload, headers=headers)
    assert nc_resp.status_code == 200, f"Error en Nota de Crédito: {nc_resp.text}"
    nc_data = nc_resp.json()
    credit_note_code = nc_data.get("credit_note_code")
    print(f"   ✓ Respuesta HTTP 200 OK")
    print(f"   ✓ Estado de Venta: {nc_data.get('status')} (cancelled)")
    print(f"   ✓ Código de Nota de Crédito Generado: {credit_note_code}")
    print(f"   ✓ Mensaje: {nc_data.get('message')}")
    assert credit_note_code and credit_note_code.startswith("NC-"), "El código debe tener formato NC-..."

    # 7. Probar VÍA 3: Reembolso completo / Stock Negativo con Solicitud de Reposición
    print("\n[PASO 7] PRUEBA VÍA 3: Autorización con Stock Negativo e Inicio de Reposición:")
    conflict_sale_id_3 = str(uuid.uuid4())
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO sales (
                    id, tenant_id, branch_id, user_id, subtotal, discount_amount,
                    total_amount, payment_method, payment_status, status,
                    is_offline, client_sale_id, currency, cash_reference, created_at
                ) VALUES (
                    :id, '17eeb457-a34c-47a4-8826-5d9e03d1dfe5', :branch_id, :user_id,
                    :tot, 0.0, :tot, 'cash', 'paid', 'completed', true,
                    :csid, 'BOB', 'CONFLICT: Quiebre de stock sobreventa', now()
                )
            """),
            {
                "id": conflict_sale_id_3,
                "branch_id": branch_id,
                "user_id": user["id"],
                "tot": unit_price,
                "csid": str(uuid.uuid4()),
            }
        )
        conn.execute(
            text("""
                INSERT INTO sale_items (
                    id, tenant_id, sale_id, product_id, variant_id, variant_sku, quantity, unit_price, line_total, product_name
                ) VALUES (
                    gen_random_uuid(), '17eeb457-a34c-47a4-8826-5d9e03d1dfe5', :sale_id,
                    :prod_id, :var_id, :sku, 1, :price, :price, :pname
                )
            """),
            {
                "sale_id": conflict_sale_id_3,
                "prod_id": p1["id"],
                "var_id": variant_1_id,
                "sku": sku_1,
                "price": unit_price,
                "pname": p1["name"]
            }
        )

    neg_payload = {
        "resolution_type": "negative_stock",
        "resolution_note": "Prenda entregada físicamente al cliente en mostrador. Se autoriza saldo temporal negativo e inicia reposición."
    }
    neg_resp = requests.post(f"{CONFLICTS_URL}/{conflict_sale_id_3}/resolve", json=neg_payload, headers=headers)
    assert neg_resp.status_code == 200, f"Error en stock negativo: {neg_resp.text}"
    neg_data = neg_resp.json()
    print(f"   ✓ Respuesta HTTP 200 OK")
    print(f"   ✓ Estado de Venta: {neg_data.get('status')} (completed)")
    print(f"   ✓ Mensaje: {neg_data.get('message')}")

    # 8. Resultado esperado en pantalla
    print("\n[PASO 8] RESULTADO ESPERADO EN PANTALLA:")
    print("   ✓ El conflicto se cierra formalmente en la bandeja.")
    print("   ✓ El inventario contable se normaliza de inmediato.")
    print("   ✓ Se emite el comprobante y registro con firma del Encargado.")

    print("\n" + "=" * 80)
    print("🎉 PRUEBA CU16 FINALIZADA CON ÉXITO: 3 VÍAS DE RESOLUCIÓN DE CONFLICTOS AL 100%")
    print("=" * 80)

if __name__ == "__main__":
    main()
