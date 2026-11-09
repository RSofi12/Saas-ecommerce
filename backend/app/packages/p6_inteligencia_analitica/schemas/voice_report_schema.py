from __future__ import annotations

from typing import Any, Literal
from uuid import UUID
from pydantic import BaseModel, Field


class VoiceQueryRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Consulta gerencial en lenguaje natural dictada o escrita",
        examples=["¿Cuánto vendimos esta semana y cuáles fueron las prendas más pedidas?"],
    )
    branch_id: UUID | None = Field(
        default=None,
        description="ID opcional de sucursal para acotar el análisis contextual",
    )


class ExecutiveKPICard(BaseModel):
    title: str
    value: str
    trend: str | None = None
    status: Literal["positive", "warning", "negative", "neutral"] = "neutral"
    detail: str | None = None


class VoiceReportResponse(BaseModel):
    query: str
    report_type: str = Field(
        ...,
        description="Tipo de reporte clasificado: 'sales', 'inventory', 'policy_returns', 'executive_general'",
    )
    executive_summary: str = Field(
        ...,
        description="Síntesis gerencial en texto claro para lectura en pantalla",
    )
    speech_text: str = Field(
        ...,
        description="Locución ejecutiva sintetizada optimizada para lectura en voz alta (TTS)",
    )
    kpis: list[ExecutiveKPICard] = Field(
        default_factory=list,
        description="Tarjetas métricas clave destacadas",
    )
    data_preview: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Registros tabulares estructurados para visualización en el dashboard",
    )
    engine_used: Literal["gemini_rag", "heuristic_fallback"] = Field(
        default="gemini_rag",
        description="Motor analítico que generó la respuesta ejecutiva",
    )


class VoiceCapabilitiesResponse(BaseModel):
    tenant_id: UUID
    company_name: str
    plan_name: str
    plan_code: str
    has_ai_access: bool
    status: str
    message: str
