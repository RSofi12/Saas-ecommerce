import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_cu06_price_range_filtering():
    """Verifica que el catálogo público (CU06) soporte búsqueda facetada por rango de precios."""
    # 1. Obtener lista completa
    resp_all = client.get("/api/catalog/products")
    assert resp_all.status_code == 200
    all_data = resp_all.json()["data"]
    assert len(all_data) > 0

    # 2. Filtrar por precio mínimo (ej. 100)
    resp_min = client.get("/api/catalog/products?min_price=100")
    assert resp_min.status_code == 200
    min_data = resp_min.json()["data"]
    for product in min_data:
        active_prices = [float(v["price"]) for v in product["variants"] if v.get("status") == "active"]
        assert any(p >= 100 for p in active_prices)

    # 3. Filtrar por precio máximo (ej. 80)
    resp_max = client.get("/api/catalog/products?max_price=80")
    assert resp_max.status_code == 200
    max_data = resp_max.json()["data"]
    for product in max_data:
        active_prices = [float(v["price"]) for v in product["variants"] if v.get("status") == "active"]
        assert any(p <= 80 for p in active_prices)

    # 4. Filtrar por rango acotado (ej. 50 a 120)
    resp_range = client.get("/api/catalog/products?min_price=50&max_price=120")
    assert resp_range.status_code == 200
    range_data = resp_range.json()["data"]
    for product in range_data:
        active_prices = [float(v["price"]) for v in product["variants"] if v.get("status") == "active"]
        assert any(50 <= p <= 120 for p in active_prices)

