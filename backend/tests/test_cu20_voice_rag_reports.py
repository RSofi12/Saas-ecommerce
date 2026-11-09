import sys
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(backend_dir / ".env")

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from unittest.mock import patch

from fastapi.testclient import TestClient
from main import app
from app.auth.jwt import create_access_token
from app.core.database import SessionLocal
from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p0_saas_plataforma.models.plan import Plan
from app.packages.p0_saas_plataforma.models.subscription import Subscription
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p1_gestion_usuarios_acceso.schemas.enums import RolEnum

client = TestClient(app)


def _get_admin_token_and_tenant(subdomain: str = "elegance"):
    db = SessionLocal()
    try:
        company = db.query(Company).filter(Company.subdomain == subdomain).first()
        assert company is not None, f"Company {subdomain} debe existir"

        user = (
            db.query(User)
            .filter(User.tenant_id == company.id, User.rol == RolEnum.administrador)
            .first()
        )
        assert user is not None, f"Usuario admin de {subdomain} debe existir"

        token = create_access_token(
            {
                "sub": str(user.id),
                "rol": "administrador",
                "tenant_id": str(company.id),
                "branch_id": str(user.branch_id) if user.branch_id else None,
            }
        )
        return token, company
    finally:
        db.close()


def test_cu20_capabilities_endpoint():
    """
    CU20: Verifica que el endpoint de capacidades retorne el estado de IA del plan.
    Boutique Elegance cuenta con Plan Profesional (has_ai_access = True).
    """
    token, company = _get_admin_token_and_tenant("elegance")

    res = client.get(
        "/api/reports/voice-query/capabilities",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200, f"Error inesperado: {res.text}"
    data = res.json().get("data", {})
    assert data.get("tenant_id") == str(company.id)
    assert data.get("has_ai_access") is True
    assert data.get("status") == "active"


def test_cu20_voice_query_success():
    """
    CU20: Realiza una consulta ejecutiva por lenguaje natural / voz.
    Debe retornar executive_summary, speech_text (locución), kpis y data_preview.
    """
    token, company = _get_admin_token_and_tenant("elegance")

    payload = {
        "query": "¿Cuáles son las prendas más vendidas y cuánto hemos facturado en total?",
    }

    res = client.post(
        "/api/reports/voice-query",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200, f"Error en voice-query: {res.text}"
    body = res.json()
    assert body.get("statusCode") == 200 or body.get("status_code") == 200

    report = body.get("data", {})
    assert "executive_summary" in report and len(report["executive_summary"]) > 10
    assert "speech_text" in report and len(report["speech_text"]) > 10
    assert "kpis" in report and isinstance(report["kpis"], list)
    assert len(report["kpis"]) >= 1
    assert report.get("engine_used") in ("gemini_rag", "heuristic_fallback")


def test_cu20_voice_query_blocked_on_basic_plan():
    """
    CU20: Valida la Política de Negocio donde el Plan Básico tiene
    bloqueado el acceso a la IA Generativa (debe responder HTTP 403 Forbidden).
    """
    db = SessionLocal()
    try:
        # Localizamos el plan básico o creamos/actualizamos una suscripción temporalmente a un plan sin IA
        company = db.query(Company).filter(Company.subdomain == "modaurbana").first()
        assert company is not None

        # Aseguramos que la suscripción de modaurbana tenga un plan sin acceso a IA
        sub = (
            db.query(Subscription)
            .filter(Subscription.company_id == company.id, Subscription.status == "ACTIVA")
            .first()
        )
        if sub and sub.plan:
            original_ai_access = sub.plan.has_ai_access
            try:
                sub.plan.has_ai_access = False
                db.commit()

                token, _ = _get_admin_token_and_tenant("modaurbana")
                res = client.post(
                    "/api/reports/voice-query",
                    json={"query": "¿Cuánto stock nos queda en tienda?"},
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert res.status_code == 403 or (
                    res.json().get("statusCode") == 403 or res.json().get("status_code") == 403
                ), f"Se esperaba 403 para Plan Básico, recibido: {res.status_code}"
                detail = res.json().get("message", "") or res.json().get("error", "")
                assert "IA Generativa" in detail or "Plan" in detail or "no incluye" in detail
            finally:
                sub.plan.has_ai_access = original_ai_access
                db.commit()
    finally:
        db.close()


def test_cu20_heuristic_fallback_resilience():
    """
    CU20: Simula indisponibilidad o falla de Gemini API y verifica
    que el sistema conmute transparentemente al motor analítico heurístico local.
    """
    token, _ = _get_admin_token_and_tenant("elegance")

    with patch(
        "app.packages.p6_inteligencia_analitica.services.gemini_rag_service._call_gemini_rag_sync",
        side_effect=Exception("Google Gemini API Simulated Timeout / 429 Quota Exceeded"),
    ):
        res = client.post(
            "/api/reports/voice-query",
            json={"query": "¿Cuánto hemos retenido en devoluciones y cuáles son los cambios?"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json().get("data", {})
        assert data.get("engine_used") == "heuristic_fallback"
        assert "retención" in data.get("executive_summary", "").lower() or "devoluciones" in data.get("executive_summary", "").lower()
        assert len(data.get("kpis", [])) >= 2
