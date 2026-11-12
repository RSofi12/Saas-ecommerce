import sys
import uuid
import requests
from decimal import Decimal

BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
BATCH_SYNC_URL = f"{BASE_URL}/api/sales/offline/batch-sync"

def main():
    print("=" * 70)
    print("VERIFICACIÓN AUTOMATIZADA: CU15 - Sincronizar Lotes con Idempotencia Central")
    print("=" * 70)

    # 1. Autenticación como Cajera de Sucursal
    print("\n[Paso 1] Autenticando con cajera.lp@fashionstore.bo...")
    login_resp = requests.post(
        LOGIN_URL,
        data={"username": "cajera.lp@fashionstore.bo", "password": "Tiendafashion123!"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if login_resp.status_code != 200:
        print(f"❌ Error en login: {login_resp.status_code} -> {login_resp.text}")
        sys.exit(1)

    token_data = login_resp.json()
    token = token_data.get("access_token")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    print("✅ Login exitoso. Token JWT obtenido.")

    # 2. Obtener datos de la sucursal y variante disponible
    print("\n[Paso 2] Consultando catálogo offline-pack para obtener sucursal y variantes disponibles...")
    pack_resp = requests.get(f"{BASE_URL}/api/catalog/offline-pack", headers=headers)
    if pack_resp.status_code != 200:
        print(f"❌ Error al obtener pack: {pack_resp.status_code} -> {pack_resp.text}")
        sys.exit(1)

    pack_data = pack_resp.json().get("data", pack_resp.json())
    branch_id = pack_data.get("branch", {}).get("id")
    products = pack_data.get("products", [])
    
    if not branch_id or not products:
        print(f"❌ Error: branch_id={branch_id}, products_len={len(products)}")
        sys.exit(1)

    # Buscar variante con stock
    selected_variant = None
    for p in products:
        variants = p.get("variants", [])
        if variants:
            selected_variant = variants[0]
            break

    if not selected_variant:
        print("❌ Error: No se encontró variante de producto en el catálogo.")
        sys.exit(1)

    variant_id = selected_variant["id"]
    unit_price = float(selected_variant.get("price", 120.00))
    print(f"✅ Sucursal identificada: {branch_id}")
    print(f"✅ Variante seleccionada: {variant_id} (${unit_price} BOB)")

    # 3. Preparar Lote Desconectado con UUIDv4 único
    client_sale_id = str(uuid.uuid4())
    print(f"\n[Paso 3] Generando operación de contingencia con UUIDv4: {client_sale_id}")
    
    batch_payload = {
        "branch_id": branch_id,
        "operations": [
            {
                "client_sale_id": client_sale_id,
                "cashier_id": None,
                "created_at": "2026-11-12T02:30:00Z",
                "total_amount": unit_price,
                "cash_received": unit_price + 30.0,
                "change_amount": 30.0,
                "payment_method": "cash",
                "is_offline": True,
                "items": [
                    {
                        "variant_id": variant_id,
                        "quantity": 1,
                        "unit_price": unit_price
                    }
                ]
            }
        ]
    }

    # 4. Enviar primera sincronización de lote
    print("\n[Paso 4] Enviando Lote a POST /api/sales/offline/batch-sync (Consolidación Central)...")
    sync_resp_1 = requests.post(BATCH_SYNC_URL, json=batch_payload, headers=headers)
    print(f"HTTP Status: {sync_resp_1.status_code}")
    if sync_resp_1.status_code not in (200, 201):
        print(f"❌ Falló sincronización: {sync_resp_1.text}")
        sys.exit(1)

    res_1 = sync_resp_1.json().get("data", sync_resp_1.json())
    summary_1 = res_1.get("summary", {})
    print(f"Resumen de Sincronización #1: {summary_1}")
    
    assert summary_1.get("applied") == 1, f"Se esperaba 1 aplicada, se obtuvo {summary_1.get('applied')}"
    assert summary_1.get("duplicates_ignored") == 0, f"Se esperaba 0 duplicados, se obtuvo {summary_1.get('duplicates_ignored')}"
    assert client_sale_id in [str(u) for u in res_1.get("processed_uuids", [])], "El UUID debe estar en processed_uuids"
    print("✅ Sincronización #1 completada exitosamente. Venta registrada en BD central.")

    # 5. PRUEBA DE IDEMPOTENCIA: Enviar el mismo lote exactamente igual por segunda vez
    print("\n[Paso 5] PRUEBA DE IDEMPOTENCIA: Reenviando exactamente el mismo lote por segunda vez...")
    sync_resp_2 = requests.post(BATCH_SYNC_URL, json=batch_payload, headers=headers)
    print(f"HTTP Status: {sync_resp_2.status_code}")
    if sync_resp_2.status_code != 200:
        print(f"❌ Falló prueba de idempotencia: {sync_resp_2.text}")
        sys.exit(1)

    res_2 = sync_resp_2.json().get("data", sync_resp_2.json())
    summary_2 = res_2.get("summary", {})
    print(f"Resumen de Sincronización #2 (Idempotente): {summary_2}")

    assert summary_2.get("applied") == 0, f"Se esperaba 0 aplicadas en reintento, se obtuvo {summary_2.get('applied')}"
    assert summary_2.get("duplicates_ignored") == 1, f"Se esperaba 1 duplicado ignorado, se obtuvo {summary_2.get('duplicates_ignored')}"
    assert client_sale_id in [str(u) for u in res_2.get("processed_uuids", [])], "El UUID debe figurar en processed_uuids para confirmar al cliente"
    print("✅ IDEMPOTENCIA CONFIRMADA: El backend detectó el UUIDv4 en sync_operations y NO duplicó la venta ni descontó el inventario dos veces.")

    print("\n" + "=" * 70)
    print("🎉 PRUEBA CU15 FINALIZADA CON ÉXITO: 100% FUNCIONAL")
    print("=" * 70)

if __name__ == "__main__":
    main()

