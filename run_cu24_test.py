import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_cu24():
    print("=" * 80)
    print("TEST [CU24] SEGMENTAR CLIENTES CON K-MEANS (ML NO SUPERVISADO)")
    print("=" * 80)

    # 1. Login
    print("\n[1] Autenticando como Administrador (admin@elegance.com)...")
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@elegance.com",
        "password": "Tiendafashion123!"
    })
    assert login_resp.status_code == 200, f"Error en login: {login_resp.text}"
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("-> Autenticado exitosamente.")

    # 2. Status previo
    print("\n[2] Consultando estado previo del modelo de segmentación...")
    status_resp = requests.get(f"{BASE_URL}/api/ml/customer-segmentation/status", headers=headers)
    print(f"-> Status HTTP: {status_resp.status_code}")
    print(f"-> Status JSON: {json.dumps(status_resp.json(), indent=2)}")

    # 3. Entrenar K-Means con k=4 y datos sintéticos
    print("\n[3] Ejecutando entrenamiento K-Means con k=4 y datos sintéticos...")
    train_payload = {
        "k_clusters": 4,
        "use_synthetic_data": True,
        "random_state": 42
    }
    train_resp = requests.post(f"{BASE_URL}/api/ml/customer-segmentation/train", json=train_payload, headers=headers)
    print(f"-> Train HTTP Status: {train_resp.status_code}")
    assert train_resp.status_code == 200, f"Error en train: {train_resp.text}"
    
    train_data = train_resp.json().get("data", train_resp.json())
    print(f"-> Modelo entrenado con éxito.")
    print(f"   Métricas:")
    print(f"   - Silhouette Score: {train_data.get('silhouette_score')}")
    print(f"   - Inercia (WCSS):   {train_data.get('inertia')}")
    print(f"   - Clientes totales: {train_data.get('total_customers')}")
    
    clusters = train_data.get("clusters", [])
    print(f"\n[4] Verificando los 4 Clústeres Conductuales RFM+D identificados:")
    for c in clusters:
        cent = c.get('centroid', {})
        print(f"   * Clúster {c.get('cluster_id')}: {c.get('name')}")
        print(f"     - Descripción: {c.get('description')}")
        print(f"     - Clientes asignados: {c.get('customer_count')} ({c.get('percentage')}%)")
        print(f"     - Promedios RFM+D: Recencia={cent.get('recency_days')}d, Frecuencia={cent.get('frequency_count')}, Gasto=Bs {cent.get('monetary_total')}, Tasa Retorno={(cent.get('return_rate') or 0)*100:.1f}%")
        print(f"     - Recomendación: {c.get('recommended_action')}")

    assert len(clusters) == 4, f"Se esperaban 4 clústeres, se recibieron {len(clusters)}"

    # 4. Obtener datos del Scatter Plot 2D (/scatter-points)
    print("\n[5] Obteniendo proyección 2D para visualización (Scatter Plot)...")
    scatter_resp = requests.get(f"{BASE_URL}/api/ml/customer-segmentation/scatter-points", headers=headers)
    assert scatter_resp.status_code == 200, f"Error en scatter: {scatter_resp.text}"
    scatter_data = scatter_resp.json().get("data", scatter_resp.json())
    
    points = scatter_data.get("points", [])
    print(f"-> Total puntos proyectados: {scatter_data.get('total_points')} (Recibidos: {len(points)})")
    print(f"-> Silhouette Score en scatter: {scatter_data.get('silhouette_score')}")
    assert len(points) > 0, "No se recibieron puntos de dispersión"
    
    # Muestra de puntos por clúster
    for sample_p in points[:3]:
        print(f"   * Cliente: {sample_p.get('customer_name')} -> Clúster {sample_p.get('cluster_id')} ({sample_p.get('cluster_name')}) [Color: {sample_p.get('color')}]")
        print(f"     Coord: Frecuencia={sample_p.get('frequency_count')}, Monto=Bs {sample_p.get('monetary_total')}, Recencia={sample_p.get('recency_days')}d, Retorno={(sample_p.get('return_rate') or 0)*100:.1f}%")

    # 5. Obtener detalle de clientes en un clúster
    print("\n[6] Consultando listado de clientes asignados al Clúster 0...")
    cust_resp = requests.get(f"{BASE_URL}/api/ml/customer-segmentation/customers?cluster_id=0&page=1&page_size=5", headers=headers)
    assert cust_resp.status_code == 200, f"Error en listado de clientes: {cust_resp.text}"
    cust_data = cust_resp.json().get("data", cust_resp.json())
    cust_list = cust_data.get("items", cust_data.get("customers", []))
    print(f"-> Clientes recuperados en Clúster 0: {len(cust_list)} (Total en clúster: {cust_data.get('total')})")
    assert len(cust_list) > 0, "No se recuperaron clientes para el Clúster 0"
    if cust_list:
        sample = cust_list[0]
        print(f"   Ejemplo de cliente: {sample.get('customer_name')} ({sample.get('customer_email')})")
        print(f"   Segmento: {sample.get('segment_label')} (Clúster {sample.get('cluster_id')})")
        print(f"   RFM: Recencia {sample.get('recency_days')}d, {sample.get('frequency_count')} compras, Bs {sample.get('monetary_total')}, Tasa retorno {(sample.get('return_rate') or 0)*100:.1f}%")
    print(f"-> Clientes recuperados en Clúster 0: {len(cust_list)} (Total en clúster: {cust_data.get('total')})")
    if cust_list:
        sample = cust_list[0]
        print(f"   Ejemplo de cliente: {sample.get('customer_name')} ({sample.get('customer_email')})")
        print(f"   RFM: Recencia {sample.get('recency_days')}d, {sample.get('frequency')} compras, Bs {sample.get('monetary_total')}, {sample.get('return_count')} devoluciones")

    print("\n" + "=" * 80)
    print(">>> CASO DE USO 24 (K-MEANS ML NO SUPERVISADO) VALIDADO EXITOSAMENTE AL 100% <<<")
    print("=" * 80)

if __name__ == "__main__":
    test_cu24()
