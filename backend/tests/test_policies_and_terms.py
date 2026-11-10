import pytest

from app.packages.p0_saas_plataforma.routes.company_routes import get_saas_policies
from app.packages.p6_inteligencia_analitica.services.chatbot_service import (
    _static_context,
    _fallback,
    ChatIntent,
)


def test_get_saas_policies_function():
    """Verifica que la función del endpoint retorne el JSON oficial de políticas con HTTP 200."""
    res = get_saas_policies()
    assert res.status_code == 200
    # Decodificar el contenido del JSONResponse
    import json
    payload = json.loads(res.body.decode("utf-8"))
    assert payload["message"] == "Políticas comerciales y términos SaaS obtenidos correctamente"
    data = payload["data"]
    assert "cambios_de_prenda" in data
    assert "devoluciones_y_reembolsos" in data
    assert "pagos_y_despacho" in data
    assert "terminos_saas_fashionstore" in data

    # Validar códigos de políticas oficiales de la cátedra
    assert data["cambios_de_prenda"]["codigo"] == "P-Ten-01"
    assert data["devoluciones_y_reembolsos"]["codigo"] == "P-Ten-03"
    assert "P-Ten-04" in data["pagos_y_despacho"]["codigo"]
    assert data["terminos_saas_fashionstore"]["codigo"] == "P-SaaS-01"


def test_chatbot_policies_context():
    """Verifica que el chatbot cargue las políticas reales y que su fallback no falle con estructuras anidadas."""
    context = _static_context(ChatIntent.POLITICAS, "¿Cuáles son las políticas de devolución?")
    assert "knowledge" in context
    knowledge = context["knowledge"]
    assert "cambios_de_prenda" in knowledge
    assert "devoluciones_y_reembolsos" in knowledge

    # Comprobar que el fallback aplana correctamente sin errores
    fallback_text = _fallback(ChatIntent.POLITICAS, context)
    assert "Información sobre políticas y términos:" in fallback_text
    assert "P-Ten-01" in fallback_text
    assert "P-Ten-03" in fallback_text
