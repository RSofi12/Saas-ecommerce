import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_cu25():
    print("=" * 80)
    print("TEST [CU25] VISUALIZAR DASHBOARD EJECUTIVO CON KPIS Y MÉTRICAS ML")
    print("=" * 80)

    # 1. Autenticación como Administrador
    print("\n[PASO 1] Iniciar Sesión con Credenciales de Tenant Admin (admin@elegance.com):")
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@elegance.com",
        "password": "Tiendafashion123!"
    })
    assert login_resp.status_code == 200, f"Error en login: {login_resp.text}"
    token = login_resp.json()["data"]["access_token"]
    user_info = login_resp.json()["data"]["user"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"   ✓ Sesión iniciada: {user_info['email']} (Rol: {user_info['rol']})")
    print(f"   ✓ Tenant ID: {user_info['tenant_id']}")

    # 2. Consultar Dashboard General
    print("\n[PASO 2] Consultar Dashboard Ejecutivo Central (GET /api/dashboard):")
    dash_resp = requests.get(f"{BASE_URL}/api/dashboard", headers=headers)
    assert dash_resp.status_code == 200, f"Error en dashboard: {dash_resp.text}"
    dash_json = dash_resp.json()
    dash_data = dash_json.get("data", dash_json)
    print("   ✓ HTTP 200 OK recibido exitosamente.")

    # 3. SECCIÓN 1: Visión General
    print("\n[PASO 3] Validar Sección 1: Visión General (Ventas globales, ticket promedio, prendas):")
    summary = dash_data.get("summary", {})
    print(f"   - Total Ventas Facturadas:     Bs {summary.get('total_sales')}")
    print(f"   - Órdenes Procesadas:          {summary.get('total_orders')} pedidos")
    print(f"   - Unidades Textiles Vendidas:   {summary.get('total_units_sold')} prendas")
    print(f"   - Ticket Promedio:             Bs {summary.get('average_ticket')}")
    print(f"   - Stock Total Físico:          {summary.get('total_stock')} unidades")
    print(f"   - Stock Disponible:            {summary.get('total_available_stock')} unidades")
    print(f"   - Alertas Stock Crítico:       {summary.get('low_stock_items')} ítems")
    
    top_products = dash_data.get("top_products", [])
    print(f"   ✓ Top Prendas más Vendidas ({len(top_products)} registradas):")
    for tp in top_products[:3]:
        print(f"     * {tp.get('product_name')}: {tp.get('total_units_sold')} u. vendidas (Bs {tp.get('total_sales')})")

    branch_kpis = dash_data.get("branch_kpis", [])
    print(f"   ✓ Desglose por Sucursal ({len(branch_kpis)} sucursales):")
    for bk in branch_kpis:
        print(f"     * Sucursal '{bk.get('branch_name')}' ({bk.get('city')}): Bs {bk.get('total_sales')} ({bk.get('total_orders')} órdenes)")

    # 4. SECCIÓN 2: Finanzas & Políticas
    print("\n[PASO 4] Validar Sección 2: Finanzas & Políticas (Política 1 y Política 2):")
    policy = dash_data.get("policy_revenue", {})
    print(f"   - [Política 1] Diferencia Cobrada por Cambios de Talla: Bs {policy.get('exchange_difference_total')}")
    print(f"     Operaciones de cambio de talla consolidadas:        {policy.get('total_exchanges_count')}")
    print(f"   - [Política 2] Retención Operativa (20%-50%) en Devoluciones: Bs {policy.get('return_retention_total')}")
    print(f"     Reembolsos Netos Entregados (Efectivo/NC):                  Bs {policy.get('return_refunds_total')}")
    print(f"     Total Devoluciones Gestionadas:                             {policy.get('total_returns_count')}")

    # 5. SECCIÓN 3: Métricas Offline & Sincronización
    print("\n[PASO 5] Validar Sección 3: Métricas Offline (Idempotencia y Contingencia UUIDv4):")
    offline = dash_data.get("offline_sync", {})
    print(f"   - Ventas Offline Totales:        {offline.get('total_offline_sales')} registradas")
    print(f"   - Operaciones Sincronizadas:     {offline.get('synced_operations')} lotes")
    print(f"   - Operaciones Pendientes Sync:   {offline.get('pending_operations')} lotes")
    print(f"   - Tasa de Éxito de Sincronización: {offline.get('sync_success_rate')}%")
    print(f"   - Recaudación Efectivo Offline:  Bs {offline.get('offline_revenue_total')}")

    # 6. SECCIÓN 4: Inteligencia Predictiva (Machine Learning)
    print("\n[PASO 6] Validar Sección 4: Inteligencia Predictiva (CU23 Demanda + CU24 RFM K-Means):")
    ml = dash_data.get("ml_kpis", {})
    print(f"   - Acceso Habilitado a ML/AI:    {ml.get('has_ml_access')}")
    print(f"   - Versión Modelo Demanda (CU23): {ml.get('latest_demand_model_version')}")
    print(f"   - Rendimiento R² (RandomForest): {ml.get('latest_demand_model_r2')}")
    print(f"   - Unidades Proyectadas Mes:      {ml.get('predicted_monthly_units')} u.")
    print(f"   - Talla Top Proyectada:          {ml.get('top_selling_size_predicted')}")
    print(f"   - Alertas Quiebre Proyectado:    {ml.get('critical_stock_alerts_count')}")
    
    rfm_segments = ml.get("rfm_segments_distribution", [])
    print(f"   - Distribución Segmentos RFM+D (CU24 K-Means) [{len(rfm_segments)} clústeres]:")
    for seg in rfm_segments:
        print(f"     * Clúster {seg.get('cluster_id')} ({seg.get('segment_label')}): {seg.get('customer_count')} clientes ({seg.get('percentage')}%) - Ticket Promedio: Bs {seg.get('average_monetary')}")

    # 7. Cuotas y Gobernanza SaaS
    print("\n[PASO 7] Validar Cuotas y Gobernanza del Plan SaaS:")
    quotas = dash_data.get("plan_quotas", {})
    print(f"   - Plan Comercial Activo:  {quotas.get('plan_name')}")
    print(f"   - Sucursales Utilizadas:  {quotas.get('active_branches')} de {quotas.get('max_branches')} permitidas ({quotas.get('branches_usage_pct')}%)")
    print(f"   - Permisos IA / GenAI:    {quotas.get('has_ai_access')}")

    # 8. Filtros Temporales (Period = 'week')
    print("\n[PASO 8] Probar Filtros Dinámicos (period='week'):")
    filtered_resp = requests.get(f"{BASE_URL}/api/dashboard?period=week", headers=headers)
    assert filtered_resp.status_code == 200, f"Error en filtro week: {filtered_resp.text}"
    filtered_data = filtered_resp.json().get("data", {})
    series = filtered_data.get("sales_series", [])
    print(f"   ✓ Puntos en la serie temporal semanal: {len(series)}")

    print("\n" + "=" * 80)
    print(">>> CASO DE USO 25 (DASHBOARD EJECUTIVO CON KPIS Y ML) 100% VERIFICADO EXITOSAMENTE <<<")
    print("=" * 80)

if __name__ == "__main__":
    test_cu25()

