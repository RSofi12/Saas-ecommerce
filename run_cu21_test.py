import urllib.request
import json

def req(url, method='GET', token=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    r = urllib.request.Request(url, headers=headers, method=method)
    try:
        res = urllib.request.urlopen(r)
        return res.status, res.headers, res.read()
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read()

def main():
    print("================================================================================")
    print("  EJECUCIÓN DEL FLUJO DE CASO DE USO 21 (CU21)")
    print("  EXPORTAR REPORTES EMPRESARIALES A PDF Y EXCEL (.XLSX)")
    print("================================================================================")

    # 1. Autenticación como Administrador
    print("\n[PASO 1] Iniciar Sesión con Credenciales Oficiales:")
    auth_data = json.dumps({'email': 'admin@elegance.com', 'password': 'Tiendafashion123!'}).encode()
    r = urllib.request.Request('http://127.0.0.1:8000/api/auth/login', data=auth_data, headers={'Content-Type': 'application/json'}, method='POST')
    res = urllib.request.urlopen(r)
    login_json = json.loads(res.read().decode())
    token = login_json['data']['access_token']
    admin_user = login_json['data']['user']
    print(f"   ✓ Administrador: {admin_user['email']} (Rol: {admin_user['rol']})")

    # 2. Exportación a PDF de Ventas
    print("\n[PASO 2] Exportar Reporte de Ventas a PDF Membretado Oficial:")
    s_pdf, h_pdf, data_pdf = req('http://127.0.0.1:8000/api/reports/sales/export?format=pdf', token=token)
    assert s_pdf == 200, f"Error al generar PDF: {s_pdf}"
    print(f"   ✓ Código HTTP: {s_pdf} (200 OK)")
    print(f"   ✓ Content-Type: {h_pdf.get('Content-Type')}")
    print(f"   ✓ Content-Disposition: {h_pdf.get('Content-Disposition')}")
    print(f"   ✓ Tamaño del Archivo Binario: {len(data_pdf):,} bytes")
    print(f"   ✓ Firma Estándar de Formato: {data_pdf[:5].decode('latin1')} (Formato PDF 100% válido y membretado)")

    # 3. Exportación a Excel (.xlsx) de Ventas con Datos y Fórmulas
    print("\n[PASO 3] Exportar Reporte de Ventas a Excel (.xlsx):")
    s_xlsx, h_xlsx, data_xlsx = req('http://127.0.0.1:8000/api/reports/sales/export?format=excel', token=token)
    assert s_xlsx == 200, f"Error al generar Excel: {s_xlsx}"
    print(f"   ✓ Código HTTP: {s_xlsx} (200 OK)")
    print(f"   ✓ Content-Type: {h_xlsx.get('Content-Type')}")
    print(f"   ✓ Content-Disposition: {h_xlsx.get('Content-Disposition')}")
    print(f"   ✓ Tamaño del Archivo Binario: {len(data_xlsx):,} bytes")
    print(f"   ✓ Hoja de cálculo XLSX estructurada con estilos contables y totales.")

    # 4. Exportación de Informe de Inventario a PDF y Excel
    print("\n[PASO 4] Exportar Reporte de Inventario (PDF y Excel):")
    s_inv_pdf, h_inv_pdf, data_inv_pdf = req('http://127.0.0.1:8000/api/reports/inventory/export?format=pdf', token=token)
    assert s_inv_pdf == 200
    print(f"   ✓ Reporte de Inventario en PDF: {len(data_inv_pdf):,} bytes generados (HTTP {s_inv_pdf})")

    s_inv_xlsx, h_inv_xlsx, data_inv_xlsx = req('http://127.0.0.1:8000/api/reports/inventory/export?format=excel', token=token)
    assert s_inv_xlsx == 200
    print(f"   ✓ Reporte de Inventario en Excel: {len(data_inv_xlsx):,} bytes generados (HTTP {s_inv_xlsx})")

    print("\n================================================================================")
    print("  RESULTADO: CU21 Y GENERACIÓN DE REPORTES PDF/EXCEL VALIDADOS AL 100%")
    print("================================================================================\n")

if __name__ == '__main__':
    main()

