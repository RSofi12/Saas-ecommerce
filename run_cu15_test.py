import sys
import uuid
import requests
from decimal import Decimal

BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
BATCH_SYNC_URL = f"{BASE_URL}/api/sales/offline/batch-sync"

def main():
    print("=" * 80)
    print("TEST [CU15] SINCRONIZAR LOTES DE VENTAS CON IDEMPOTENCIA CENTRAL (sync_operations)")
    print("=" * 80)

    # 1. Autenticación como Cajera de Sucursal
    print("\n[PASO 1] Iniciar sesión en la PWA con la cuenta de cajera (cajera.lp@fashionstore.bo):")
    login_resp = requests.post(LOGIN_URL, json={
        "email": "cajera.lp@fashionstore.bo",
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
    print(f"   ✓ Sucursal asignada (branch_id): {branch_id}")

    # 2. RESTABLECER CONEXIÓN A INTERNET
    print("\n[PASO 2] RESTABLECE LA CONEXIÓN A INTERNET:")
    print("   ✓ En DevTools (F12) -> pestaña Network -> conmutar a 'No throttling' (Online)")
    print("   ✓ El banner del POS cambia inmediatamente a verde:")
    print("     [CONEXIÓN RESTABLECIDA]")
    print("   ✓ El terminal se encuentra conectado con el servidor central.")

    # 3. Consultar variante del catálogo offline-pack perteneciente al tenant
    print("\n[PASO 3] Consultando prendas disponibles en sucursal para generar venta de contingencia:")
    pack_resp = requests.get(f"{BASE_URL}/api/catalog/offline-pack?branch_id={branch_id}", headers=headers)
    assert pack_resp.status_code == 200, f"Error al obtener pack: {pack_resp.text}"
    pack_data = pack_resp.json().get("data", pack_resp.json())
    products = pack_data.get("products", [])
    
    selected_product = None
    selected_variant = None
    for p in products:
        if (str(p.get("tenant_id")) == str(user.get("tenant_id")) or p.get("tenant_id") is None) and p.get("variants"):
            if "Jealous" in p.get("name", "") or "ADIDAS" in p.get("name", ""):
                selected_product = p
                selected_variant = p["variants"][0]
                break

    if not selected_variant:
        for p in products:
            if p.get("variants"):
                selected_product = p
                selected_variant = p["variants"][0]
                break

    assert selected_variant is not None, "Debe existir al menos una variante con stock"
    variant_id = selected_variant["id"]
    unit_price = float(selected_variant.get("price", 120.00))
    print(f"   ✓ Prenda seleccionada: '{selected_product['name']}'")
    print(f"   ✓ Variante ID: {variant_id} - Precio unitario: Bs {unit_price:.2f}")

    # 4. Generar Venta en Outbox con UUIDv4 de contingencia
    client_sale_id = str(uuid.uuid4())
    print(f"\n[PASO 4] Venta offline retenida en bandeja Outbox local (IndexedDB):")
    print(f"   ✓ UUIDv4 de contingencia (client_sale_id): {client_sale_id}")
    print(f"   ✓ Monto Total: Bs {unit_price:.2f} (Efectivo entregado: Bs {unit_price + 30.0:.2f}, Cambio: Bs 30.00)")
    print(f"   ✓ Pestaña activa: 'Bandeja Outbox Local'")
    print(f"   ✓ Botón en pantalla: 'Sincronizar Lote Pendiente (1)'")

    batch_payload = {
        "branch_id": branch_id,
        "operations": [
            {
                "client_sale_id": client_sale_id,
                "cashier_id": user["id"],
                "created_at": "2026-11-12T03:10:00Z",
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

    # 5. En la pestaña Outbox, hacer clic en "Sincronizar Lote Pendiente"
    print("\n[PASO 5] En la pestaña Outbox, clic en 'Sincronizar Lote Pendiente':")
    print(f"   ✓ Viaja payload a POST /api/sales/offline/batch-sync con 1 operación...")
    sync_resp_1 = requests.post(BATCH_SYNC_URL, json=batch_payload, headers=headers)
    assert sync_resp_1.status_code in (200, 201), f"Error en batch-sync: {sync_resp_1.text}"
    
    res_1 = sync_resp_1.json().get("data", sync_resp_1.json())
    summary_1 = res_1.get("summary", {})
    print(f"   ✓ Respuesta HTTP {sync_resp_1.status_code} OK")
    print(f"   ✓ Resumen consolidado: total={summary_1.get('total_received')}, aplicadas={summary_1.get('applied')}, duplicadas={summary_1.get('duplicates_ignored')}, conflictos={summary_1.get('conflicts')}")
    assert summary_1.get("applied") == 1, f"Se esperaba 1 venta aplicada, se obtuvo {summary_1.get('applied')}"
    assert summary_1.get("duplicates_ignored") == 0, "No debe haber duplicados en el primer envío"
    assert client_sale_id in [str(u) for u in res_1.get("processed_uuids", [])], "El UUID debe estar en processed_uuids"
    print("   ✓ Venta de contingencia consolidada en el servidor central (PostgreSQL/Neon) con registro en sync_operations.")

    # 6. PRUEBA DE IDEMPOTENCIA: Clic inmediato por segunda vez en el botón de sincronización
    print("\n[PASO 6] PRUEBA DE IDEMPOTENCIA:")
    print("   ✓ Haz clic inmediatamente una segunda vez en el botón de sincronización...")
    print("   ✓ Reenviando exactamente el mismo lote con el mismo UUIDv4:")
    sync_resp_2 = requests.post(BATCH_SYNC_URL, json=batch_payload, headers=headers)
    assert sync_resp_2.status_code == 200, f"Error en idempotencia batch-sync: {sync_resp_2.text}"

    res_2 = sync_resp_2.json().get("data", sync_resp_2.json())
    summary_2 = res_2.get("summary", {})
    print(f"   ✓ Respuesta HTTP {sync_resp_2.status_code} OK")
    print(f"   ✓ Resumen de Idempotencia: total={summary_2.get('total_received')}, aplicadas={summary_2.get('applied')}, duplicadas_ignoradas={summary_2.get('duplicates_ignored')}, conflictos={summary_2.get('conflicts')}")
    
    # Validaciones sagradas de idempotencia
    assert summary_2.get("applied") == 0, f"CRÍTICO: No debe aplicar ninguna venta nueva (se esperaba 0, se obtuvo {summary_2.get('applied')})"
    assert summary_2.get("duplicates_ignored") == 1, f"CRÍTICO: Se esperaba 1 venta duplicada ignorada (se obtuvo {summary_2.get('duplicates_ignored')})"
    assert client_sale_id in [str(u) for u in res_2.get("processed_uuids", [])], "El backend debe confirmar processed_uuids para que el cliente vacíe su Outbox"
    
    detail_2 = res_2.get("details", [{}])[0]
    print(f"   ✓ Detalle de la operación duplicada: status='{detail_2.get('status')}', message='{detail_2.get('message')}'")
    assert detail_2.get("status") == "duplicate_ignored"

    # 7. Resultado esperado en pantalla
    print("\n[PASO 7] Resultado Esperado en Pantalla:")
    print("   ✓ El backend detecta el UUIDv4 duplicado contra sync_operations y responde HTTP 200")
    print("     confirmando la operación SIN duplicar la venta ni descontar dos veces el inventario.")
    print("   ✓ La bandeja Outbox se vacía en IndexedDB y marca en pantalla:")
    print("     'Todas las operaciones sincronizadas con éxito'")

    print("\n" + "=" * 80)
    print("🎉 PRUEBA CU15 FINALIZADA CON ÉXITO: IDEMPOTENCIA CENTRAL Y OUTBOX AL 100%")
    print("=" * 80)

if __name__ == "__main__":
    main()
