# Sesión de Desarrollo — 04 de Noviembre de 2026: Backend y Diagramas UML ICONIX para CU20 (Reportes Ejecutivos por Voz con Gemini RAG)

## 1. Alcance y Caso de Uso Abordado
- **Caso de Uso:** `CU20: Generar Reportes Ejecutivos por Voz y Lenguaje Natural (Gemini RAG)`
- **Presentación:** 3ra Presentación (Sistemas 2)
- **Módulos / Paquetes Afectados:**
  - Backend: `backend/app/packages/p6_inteligencia_analitica/`
  - Modelado ICONIX EA: `docsUML/CUSecuencia/` y `docsUML/CUrobustez/`
  - Guías y Aseguramiento: `docsUML/SEQUENCE_DIAGRAM_GUIDE.md` y `docs/informes/PRUEBAS_CAJA_NEGRA.md`

---

## 2. Cambios Implementados en el Backend

### 2.1 Schemas Pydantic (`voice_report_schema.py`)
- `VoiceQueryRequest`: payload con `query: str`, `branch_id: UUID | None`, `include_audio_hints: bool`.
- `ExecutiveKPICard`: tarjeta de KPI estructurada (`title`, `value`, `subtext`, `trend`, `color`).
- `VoiceReportResponse`: objeto de respuesta completo con `executive_summary`, `speech_text` (texto redactado para TTS), `kpis` (lista de `ExecutiveKPICard`), `data_preview`, `model_used`, `is_fallback`, `generated_at`.
- `VoiceCapabilitiesResponse`: lista de preguntas sugeridas y estado de disponibilidad de IA.

### 2.2 Servicio de Inferencia y Ensamble RAG (`gemini_rag_service.py`)
- `verify_ai_access_for_tenant`: Verifica empresa y plan. Si el plan no tiene `has_ai_access = True` (Plan Básico), arroja `VoiceReportException(403, "El Plan Básico contratado no incluye acceso al módulo de IA Generativa...")`.
- `build_tenant_rag_context`:
  - Aislamiento multitenant riguroso por `tenant_id`.
  - Ventas completadas (`Sale.status == SaleStatusEnum.completed`), ingresos totales y ticket promedio.
  - Top prendas vendidas agrupadas por `Product.name`, `Size.name` y `Color.name`, totalizando `SaleItem.line_total` y unidades.
  - Existencias críticas (`Inventory.quantity <= 5`) por sucursal.
  - Políticas de postventa: devoluciones con retención (20%-50%) y cambios con diferencia de precio cobrada.
- `_call_gemini_rag_sync`:
  - Utiliza el nuevo SDK oficial `google.genai.Client` con modelo `gemini-2.5-flash`.
  - System instruction especializada en retail textil de moda, obligando a responder en JSON estructurado conforme a `VoiceReportResponse`.
- `_generate_heuristic_fallback`:
  - Motor local determinista de contingencia.
  - En caso de caída de internet, timeout o cuota excedida de la API externa (429), genera el resumen y KPIs locales con `is_fallback = True`, evitando cualquier error 500.

### 2.3 Rutas REST FastAPI (`voice_report_routes.py` y `router.py`)
- `POST /api/reports/voice-query`: Invoca el pipeline RAG y retorna `VoiceReportResponse`.
- `GET /api/reports/voice-query/capabilities`: Retorna sugerencias ejecutivas.
- Montado en el prefijo del paquete `/api/reports`.

---

## 3. Pruebas Automatizadas y Calidad de Software

- **Archivo de pruebas:** `backend/tests/test_cu20_voice_rag_reports.py`
- **Resultados de ejecución:**
  ```bash
  backend\.venv\Scripts\pytest.exe -c backend/pytest.ini backend/tests/test_cu20_voice_rag_reports.py -v
  ======================= 4 passed, 6 warnings in 42.22s ========================
  ```
  1. `test_cu20_capabilities_endpoint`: **PASSED** (200 OK, ejemplos sugeridos entregados).
  2. `test_cu20_voice_query_success`: **PASSED** (200 OK, llamada a Gemini API en vivo exitosa).
  3. `test_cu20_voice_query_blocked_on_basic_plan`: **PASSED** (403 Forbidden estricto para Plan Básico).
  4. `test_cu20_heuristic_fallback_resilience`: **PASSED** (200 OK conmutación a fallback ante error/timeout).

- **Total Acumulado de Pruebas de Caja Negra:** 93/93 casos PASSED (100%) en `docs/informes/PRUEBAS_CAJA_NEGRA.md`.

---

## 4. Diagramación ICONIX para Enterprise Architect v15

1. **Script de Secuencia (`docsUML/CUSecuencia/CU20_secuencia_reportes_voz_gemini_EA.js`):**
   - Participantes BCE: Actor (`AdministradorTenant`), Boundary (`ReportsPageComponent`, `VoiceAssistantModalComponent`, `WebSpeechAPI_Recognition`, `WebSpeechAPI_Synthesis`), Control (`VoiceReportRoutes`, `GeminiRagService`, `Google_GeminiClient`), Entity (`Plan`, `PostgreSQL_TenantData`).
   - Flujo secuencial estricto con numeración jerárquica y fragmentos `alt` para control de plan y fallback.
2. **Script de Robustez / Comunicación (`docsUML/CUrobustez/CU20_comm_reportes_voz_gemini_EA.js`):**
   - Paréntesis vacíos `()` en cada acción.
   - Validaciones en controladores de dominio.
3. **Guía Técnica de Diagramas:**
   - Registrado en `docsUML/SEQUENCE_DIAGRAM_GUIDE.md` con tabla comparativa de componentes y preview Mermaid.
