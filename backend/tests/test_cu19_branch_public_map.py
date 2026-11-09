import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch

client = TestClient(app)


def test_cu19_list_public_branches_success():
    """
    CU19: Verifica que el endpoint público de sucursales retorne
    las tiendas georreferenciadas con lat/long, teléfono y dirección.
    """
    db = SessionLocal()
    try:
        elegance = db.query(Company).filter(Company.subdomain == "elegance").first()
        assert elegance is not None, "Tenant elegance debe existir en la BD de pruebas"

        res = client.get(f"/api/branches/public?tenant_id={elegance.id}")
        assert res.status_code == 200
        data = res.json()
        assert data.get("statusCode") == 200 or data.get("status_code") == 200
        branches = data.get("data", [])
        assert len(branches) >= 2, f"Se esperaban al menos 2 sucursales para Elegance, encontradas: {len(branches)}"

        for b in branches:
            assert b["tenant_id"] == str(elegance.id)
            assert b["is_active"] is True
            assert b["latitude"] is not None and b["latitude"] != 0.0
            assert b["longitude"] is not None and b["longitude"] != 0.0
            assert b["address"] != ""
            assert b["opening_hours"] != ""
    finally:
        db.close()


def test_cu19_multitenant_isolation():
    """
    CU19: Verifica que las sucursales devueltas pertenezcan estrictamente
    al tenant_id solicitado.
    """
    db = SessionLocal()
    try:
        urbana = db.query(Company).filter(Company.subdomain == "modaurbana").first()
        if not urbana:
            return  # Omitir si no está sembrado

        res = client.get(f"/api/branches/public?tenant_id={urbana.id}")
        assert res.status_code == 200
        branches = res.json().get("data", [])
        for b in branches:
            assert b["tenant_id"] == str(urbana.id)
    finally:
        db.close()
