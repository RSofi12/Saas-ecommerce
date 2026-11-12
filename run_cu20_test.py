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
    print("  EJECUCIÓN DEL FLUJO DE CASO DE USO 20 (CU20)")
    print("  CONSULTAR REPORTES EJECUTIVOS MEDIANTE VOZ E IA GENERATIVA (GEMINI RAG)")
    print("================================================================================")

    # 1. Autenticación como Tenant Admin
    print("\n[PASO 1] Iniciar Sesión con Credenciales Oficiales:")
    s, r_admin = req('http://127.0.0.1:8000/api/auth/login', 'POST', {'email': 'admin@elegance.com', 'password': 'Tiendafashion123!'})
    assert s == 200, f"Error en login: {r_admin}"
    token = r_admin['data']['access_token']
    admin_user = r_admin['data']['user']
    print(f"   ✓ Administrador: {admin_user['email']} (Rol: {admin_user['rol']})")

    # 2. Verificación de Capacidades y Plan SaaS
    print("\n[PASO 2] Validación de Cuota y Permisos de IA (Plan Profesional/Empresarial):")
    s_cap, r_cap = req('http://127.0.0.1:8000/api/reports/voice-query/capabilities', token=token)
    assert s_cap == 200, f"Error en capacidades: {r_cap}"
    cap = r_cap['data']
    print(f"   ✓ Empresa: {cap['company_name']}")
    print(f"   ✓ Plan Comercial: {cap['plan_name']} ({cap['plan_code']})")
    print(f"   ✓ Acceso a IA Generativa: {cap['has_ai_access']}")
    print(f"   ✓ Estado del Módulo: {cap['message']}")
    assert cap['has_ai_access'] is True, "El plan de la empresa debe tener acceso a IA generativa"

    # 3. Procesamiento de Consulta por Voz / Lenguaje Natural
    prompt_query = "¿Cuáles son las prendas más vendidas del último mes agrupadas por sucursal?"
    print(f"\n[PASO 3] Envío de Consulta en Lenguaje Natural:")
    print(f"   -> Voz capturada / Texto: \"{prompt_query}\"")

    query_payload = {'query': prompt_query}
    s_query, r_query = req('http://127.0.0.1:8000/api/reports/voice-query', 'POST', query_payload, token=token)
    assert s_query == 200, f"Error en procesamiento RAG: {r_query}"
    report = r_query['data']

    # 4. Resultados Generados en Pantalla
    print("\n[PASO 4] Resultados Generados por el Asistente IA:")
    print("   -----------------------------------------------------------------------------")
    print("   1) RESPUESTA EXPLICATIVA EN LENGUAJE NATURAL (SÍNTESIS EJECUTIVA):")
    print(f"      \"{report['executive_summary']}\"")
    print("   -----------------------------------------------------------------------------")

    print("   2) TARJETAS DE INDICADORES CLAVE (KPIs):")
    for kpi in report.get('kpis', []):
        trend_str = f" ({kpi['trend']})" if kpi.get('trend') else ""
        print(f"      * {kpi['title']}: {kpi['value']}{trend_str}")
    print("   -----------------------------------------------------------------------------")

    print(f"   3) TABLA CON DATOS REALES CONSOLIDADOS ({len(report.get('data_preview', []))} registros encontrados):")
    for idx, row in enumerate(report.get('data_preview', [])[:5], start=1):
        prod = row.get('producto') or row.get('nombre')
        talla = row.get('talla') or 'N/A'
        color = row.get('color') or 'N/A'
        qty = row.get('unidades_vendidas') or row.get('cantidad') or 0
        total = row.get('monto_total') or 0.0
        print(f"      {idx}. {prod} [Talla {talla} | Color {color}] — {qty} uds — Bs {total:.2f}")
    print("   -----------------------------------------------------------------------------")

    print("   4) LOCUCIÓN POR VOZ (TEXT-TO-SPEECH):")
    print(f"      Audio Síntesis listo para reproducción Web Speech API:")
    print(f"      \"{report.get('speech_text')}\"")
    print("   -----------------------------------------------------------------------------")

    print("\n================================================================================")
    print("  RESULTADO: CU20 Y ASISTENTE GEMINI RAG VALIDADOS AL 100%")
    print("================================================================================\n")

if __name__ == '__main__':
    main()
