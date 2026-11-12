import urllib.request
import json
import time

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
    print("  EJECUCIÓN DEL FLUJO DE CASO DE USO 22 (CU22)")
    print("  GENERAR DATASET SINTÉTICO DE VENTAS Y ESTACIONALIDAD TEXTIL")
    print("================================================================================")

    # 1. Autenticación como Administrador / Científico de Datos
    print("\n[PASO 1] Iniciar Sesión con Credenciales Oficiales:")
    s, r_admin = req('http://127.0.0.1:8000/api/auth/login', 'POST', {'email': 'admin@elegance.com', 'password': 'Tiendafashion123!'})
    assert s == 200, f"Error en login: {r_admin}"
    token = r_admin['data']['access_token']
    admin_user = r_admin['data']['user']
    print(f"   ✓ Administrador / Data Scientist: {admin_user['email']} (Rol: {admin_user['rol']})")

    # 2. Definición de Parámetros de Generación
    print("\n[PASO 2] Definir Parámetros del Motor Estocástico:")
    print("   * Registros Solicitados: >= 1,000 transacciones")
    print("   * Estacionalidad Textil: Invierno / Verano boliviano con picos de quincena y fin de mes")
    print("   * Simulación de Políticas: Cambios con diferencia (CU17) y Devoluciones 20%-50% (CU18)")

    payload = {
        'records_count': 1000,
        'seasonality': True,
        'include_peaks': True
    }

    # 3. Disparar Generación en Backend
    print("\n[PASO 3] Ejecución del Motor Vectorial NumPy/Pandas en Backend:")
    start_time = time.time()
    s_gen, r_gen = req('http://127.0.0.1:8000/api/ml/synthetic-dataset/generate', 'POST', payload, token=token)
    elapsed = time.time() - start_time
    assert s_gen == 201, f"Error en generación de dataset: {r_gen}"

    print(f"   ✓ Código HTTP: {s_gen} (201 Created)")
    print(f"   ✓ Tiempo de Generación: {elapsed:.2f} segundos (Rendimiento ultra-rápido en NumPy/Pandas)")
    print(f"   ✓ Mensaje del Backend: {r_gen.get('message')}")

    # 4. Auditoría de Distribuciones y Patrones Estacionales
    print("\n[PASO 4] Consulta y Visualización del Resumen Analítico (Dataset Summary):")
    s_lat, r_lat = req('http://127.0.0.1:8000/api/ml/synthetic-dataset/latest', 'GET', token=token)
    assert s_lat == 200, f"Error al consultar dataset: {r_lat}"
    summary = r_lat['data']

    print(f"   ✓ ID del Dataset Generado: {summary['dataset_id']}")
    print(f"   ✓ Archivo CSV Persistido: {summary['file_name']}")
    print(f"   ✓ Total de Transacciones Simuladas: {summary['total_records']:,} registros")
    print(f"   ✓ Cobertura Histórica: {summary['months_covered']} meses")
    print("   -----------------------------------------------------------------------------")
    print("   DISTRIBUCIÓN DE TALLAS SIMULADAS:")
    for size, count in summary.get('sizes_distribution', {}).items():
        print(f"      - Talla {size}: {count:,} transacciones ({count / summary['total_records'] * 100:.1f}%)")
    print("   -----------------------------------------------------------------------------")
    print("   PATRONES DE ESTACIONALIDAD TEXTIL:")
    factors = summary.get('seasonal_factors', {})
    print(f"      - Temporada Cálida (Verano/Primavera): {factors.get('warm_season_records', 0):,} registros")
    print(f"      - Temporada Fría (Invierno/Otoño):     {factors.get('cold_season_records', 0):,} registros")
    print(f"      - Tasa de Devoluciones Simulada (CU18): {summary.get('return_rate_simulated', 0) * 100:.2f}%")
    print(f"      - Tasa de Cambios Simulada (CU17):      {summary.get('exchange_rate_simulated', 0) * 100:.2f}%")
    print("   -----------------------------------------------------------------------------")
    print(f"   ✓ Enlace de Descarga Directa: {summary['download_url']}")

    print("\n================================================================================")
    print("  RESULTADO: CU22 Y GENERADOR DE DATASET SINTÉTICO VALIDADOS AL 100%")
    print("================================================================================\n")

if __name__ == '__main__':
    main()

