# GUÍA DE DIAGRAMAS DE SECUENCIA Y MAPEO AL CÓDIGO FUENTE
### FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
**Metodología:** ICONIX Process (UML 2.5+)  
**Directorio de Modelos:** `docsUML/CUSecuencia/` y `docsUML/CUrobustez/`  

Este documento centraliza la especificación técnica, el mapeo de componentes BCE contra el código fuente implementado y la previsualización interactiva en Mermaid para cada uno de los diagramas de secuencia del sistema.

---

## Índice de Casos de Uso Documentados
1. [CU01: Registrar y Gestionar Empresas Tenants (SaaS Multitenant)](#cu01-registrar-y-gestionar-empresas-tenants)
2. [CU02: Gestionar Planes de Suscripción y Cuotas Comerciales](#cu02-gestionar-planes-de-suscripción-y-cuotas-comerciales)
3. [CU03: Iniciar Sesión Multitenant con JWT y Claims](#cu03-iniciar-sesión-multitenant-con-jwt-y-claims)
4. [CU04: Gestionar Sucursales y Validar Límites de Plan](#cu04-gestionar-sucursales-y-validar-límites-de-plan)
5. [CU19: Localizar Sucursales y Trazar Rutas (OpenStreetMap / ORS en Flutter)](#cu19-localizar-sucursales-y-trazar-rutas-openstreetmap--ors)
6. [CU20: Generar Reportes Ejecutivos por Voz y Lenguaje Natural (Gemini RAG)](#cu20-generar-reportes-ejecutivos-por-voz-y-lenguaje-natural-gemini-rag)
7. [CU21: Exportar Reportes Empresariales a Formatos PDF y Excel](#cu21-exportar-reportes-empresariales-a-formatos-pdf-y-excel)
8. [CU23: Predecir Demanda de Ropa por Talla (ML Supervisado - RandomForest)](#cu23-predecir-demanda-de-ropa-por-talla-ml-supervisado---randomforest)

---

## CU19: Localizar Sucursales y Trazar Rutas (OpenStreetMap / ORS)

### 1. Ficha Técnica y Scripts Enterprise Architect
- **Script Secuencia (JScript):** [`docsUML/CUSecuencia/CU19_secuencia_localizar_sucursales_rutas_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU19_secuencia_localizar_sucursales_rutas_EA.js)
- **Script Robustez / Comunicación (JScript):** [`docsUML/CUrobustez/CU19_comm_localizar_sucursales_rutas_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU19_comm_localizar_sucursales_rutas_EA.js)
- **Alcance Arquitectónico:** Frontend Móvil Flutter (`mobile/`) + Backend FastAPI (`p1_gestion_usuarios_acceso`).

### 2. Tabla Comparativa: Componentes ICONIX vs Flujo del Código Fuente

| Rol BCE | Componente en Diagrama UML | Elemento en Código Fuente | Métodos / Operaciones Invocadas | Responsabilidad en el Flujo |
| :--- | :--- | :--- | :--- | :--- |
| **Actor** | `Cliente` | Usuario Móvil / `Customer` | Interacción táctil en pantalla | Inicia la navegación, concede permisos de GPS, selecciona boutique y escoge modo de viaje. |
| **Boundary** | `:ManagementPage` | [`management_page.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/management/management_page.dart) | `Navigator.pushNamed(AppRoutes.branchesMap)` | Portal de gestión y boutiques donde se ubica la tarjeta de acceso a "Nuestras boutiques". |
| **Boundary** | `:BranchesMapPage` | [`branches_map_page.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/branches_map/branches_map_page.dart) | `initState()`, `_buildFloatingModeSelector()`, `_buildBranchDetailsCard()` | Renderiza el widget `FlutterMap` con `TileLayer`, `MarkerLayer`, `PolylineLayer`, selector y tarjeta de boutique. |
| **Controller** | `:BranchesMapController` | [`branches_map_controller.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/branches_map/branches_map_controller.dart) | `initialize()`, `_initLocation()`, `selectBranch()`, `setTravelMode()`, `calculateRoute()` | Coordina reactivamente la obtención del GPS, filtrado de sucursales activas, selección y solicitud de ruta. |
| **Controller** | `:CatalogApi` | [`catalog_api.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/catalog/catalog_api.dart) | `getBranches({tenantId})` | Cliente HTTP móvil en Flutter que despacha la petición al backend central. |
| **Controller** | `:BranchRoutes` | [`branch_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/routes/branch_routes.py) | `@router.get("/public")` | Endpoint REST público en FastAPI con inyección y validación de `tenant_id`. |
| **Controller** | `:BranchService` | [`branch_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/services/branch_service.py) | `get_public_branches(db, tenant_id)` | Controlador de dominio backend que consulta y serializa las sucursales con coordenadas. |
| **Boundary (Ext)** | `:OpenStreetMapServer` | Servidor CDN OpenStreetMap | `TileLayer(urlTemplate: "https://tile.openstreetmap.org/...")` | Suministra dinámicamente las teselas raster cartográficas según coordenadas y nivel de zoom. |
| **Boundary (Ext)** | `:OSRM_RoutingEngine` | API Pública OSRM / OpenRouteService | `GET /route/v1/{mode}/{coords}?overview=full&geometries=geojson` | Calcula la geometría vial real de la ruta, distancia total en metros y duración en segundos. |
| **Controller** | `:RoutingService` | [`routing_service.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/branches_map/routing_service.dart) | `getRoute()`, `_parseOsrmResponse()`, `_buildHaversineFallback()` | Motor híbrido de 3 niveles: OSRM público sin API Key, ORS oficial inyectable y fallback geodésico Haversine. |
| **Entity** | `:Branch` | [`catalog_models.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/catalog/catalog_models.dart) / [`branch_model.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/models/branch_model.py) | `hasCoordinates`, `latitude`, `longitude`, `address`, `phone` | Representa la sucursal física en base de datos PostgreSQL y en la memoria móvil. |
| **Entity** | `:RouteInfo` | [`routing_models.dart`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/lib/features/branches_map/routing_models.dart) | `formattedDistance`, `formattedDuration`, `points` | Objeto de valor móvil que encapsula la polilínea decodificada y las métricas formateadas. |

### 3. Previsualización del Diagrama de Secuencia (Mermaid UML)

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as :Cliente
    participant UI_Mgmt as :ManagementPage
    participant UI_Map as :BranchesMapPage
    participant Ctrl_Map as :BranchesMapController
    participant Ctrl_Api as :CatalogApi
    participant Ctrl_Routes as :BranchRoutes
    participant Ctrl_Svc as :BranchService
    participant Ent_Branch as :Branch
    participant GW_OSM as :OpenStreetMapServer
    participant Ctrl_RouteSvc as :RoutingService
    participant GW_OSRM as :OSRM_RoutingEngine
    participant Ent_Route as :RouteInfo

    %% FASE 1: Navegación e Inicialización
    Cliente->>UI_Mgmt: tapNuestrasBoutiques()
    UI_Mgmt->>UI_Map: pushNamed('/branches-map')
    UI_Map->>Ctrl_Map: initialize()

    %% FASE 2: Geolocalización GPS
    alt Permiso GPS Concedido
        Ctrl_Map->>Ctrl_Map: _initLocation() [requestPermission()]
        Ctrl_Map->>Ctrl_Map: getCurrentPosition() -> LatLng(userLat, userLng)
    else Permiso GPS Denegado
        Ctrl_Map->>Ctrl_Map: defaultFallbackPosition() -> LatLng(-17.7833, -63.1821)
    end

    %% FASE 3: Consulta Multitenant de Sucursales
    Ctrl_Map->>Ctrl_Api: getBranches(tenant_id)
    Ctrl_Api->>Ctrl_Routes: GET /api/branches/public?tenant_id={id}
    Ctrl_Routes->>Ctrl_Svc: get_public_branches(tenant_id)
    Ctrl_Svc->>Ent_Branch: filter(tenant_id, is_active=True)
    Ent_Branch-->>Ctrl_Svc: return(branch_records)
    Ctrl_Svc-->>Ctrl_Routes: return(List<BranchPublicDTO>)
    Ctrl_Routes-->>Ctrl_Api: return(200 OK, branches_json)
    Ctrl_Api-->>Ctrl_Map: return(List<Branch>)
    Ctrl_Map->>Ctrl_Map: filter(Branch.hasCoordinates == true)
    Ctrl_Map-->>UI_Map: notifyListeners()

    %% FASE 4: Renderizado de Mapa y Pines
    UI_Map->>GW_OSM: TileLayer.loadTiles(zoom, x, y)
    GW_OSM-->>UI_Map: return(osm_tiles_png)
    loop Por cada sucursal con coordenadas
        UI_Map->>UI_Map: MarkerLayer.add(Marker(point, iconBoutique, halo))
    end

    %% FASE 5: Selección de Sucursal y Consulta de Información
    Cliente->>UI_Map: tapMarker(branch)
    UI_Map->>Ctrl_Map: selectBranch(branch)
    Ctrl_Map-->>UI_Map: notifyListeners()
    UI_Map-->>Cliente: renderModalDetalle(nombre, dirección, teléfono, horario)

    %% FASE 6: Selección de Transporte y Cálculo de Ruta
    Cliente->>UI_Map: selectTravelMode(driving | walking)
    UI_Map->>Ctrl_Map: setTravelMode(mode)
    Cliente->>UI_Map: tapComoLlegar()
    UI_Map->>Ctrl_Map: calculateRoute()
    Ctrl_Map->>Ctrl_RouteSvc: getRoute(origin, destination, mode)

    %% FASE 7: Estrategia Híbrida de Ruteo
    alt Nivel 1: OSRM Público Disponible
        Ctrl_RouteSvc->>GW_OSRM: GET /route/v1/{mode}/{coords}?overview=full&geometries=geojson
        GW_OSRM-->>Ctrl_RouteSvc: return(200 OK, osrm_json)
        Ctrl_RouteSvc->>Ctrl_RouteSvc: _parseOsrmResponse(json, mode)
    else Nivel 2: OpenRouteService Oficial Configurado
        Ctrl_RouteSvc->>Ctrl_RouteSvc: _queryOrsApi(origin, destination, mode)
    else Nivel 3: Fallback por Desconexión / Timeout
        Ctrl_RouteSvc->>Ctrl_RouteSvc: _buildHaversineFallback(origin, destination, mode)
    end

    Ctrl_RouteSvc->>Ent_Route: create(points, distanceMeters, durationSeconds, mode)
    Ent_Route-->>Ctrl_RouteSvc: return(routeInfo)
    Ctrl_RouteSvc-->>Ctrl_Map: return(RouteInfo)

    %% FASE 8: Trazado de Polilínea y Presentación de Métricas
    Ctrl_Map->>Ctrl_Map: fitCamera(origin, destination)
    Ctrl_Map-->>UI_Map: notifyListeners()
    UI_Map->>UI_Map: PolylineLayer.draw(route.points, color, width)
    UI_Map-->>Cliente: renderRutaYMetricas(formattedDistance, formattedDuration)
```

---

## CU21: Exportar Reportes Empresariales a Formatos PDF y Excel

### 1. Ficha Técnica y Scripts Enterprise Architect
- **Script Secuencia (JScript):** [`docsUML/CUSecuencia/CU21_secuencia_exportacion_reportes_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU21_secuencia_exportacion_reportes_EA.js)
- **Script Robustez / Comunicación (JScript):** [`docsUML/CUrobustez/CU21_comm_exportacion_reportes_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU21_comm_exportacion_reportes_EA.js)
- **Alcance Arquitectónico:** Frontend Web Angular 21 PWA (`frontend/`) + Backend FastAPI (`p6_inteligencia_analitica`).

### 2. Tabla Comparativa: Componentes ICONIX vs Flujo del Código Fuente

| Capa / Etapa | Componente / Archivo Físico | Función / Endpoint Implementado | Responsabilidad Técnica |
| :--- | :--- | :--- | :--- |
| **Actor** | `Administrador` / `Encargado` | Navegador Web / PWA | Parametriza filtros, selecciona columnas y pulsa exportar. |
| **Boundary (UI)** | [`admin-reports-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/admin/pages/admin-reports-page.component.ts) | `setTab()`, `toggleColumn()`, `setQuickDate()`, `exportReport(format)` | Gestión reactiva de estado, panel colapsable de columnas y visualización en tabla. |
| **Boundary (API)**| [`reports-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/services/reports-api.service.ts) | `exportReport(type, format, query, columns)` / `downloadBlob()` | Inyección de query params (`columns`), petición HTTP con `responseType: 'blob'` y trigger de descarga `<a>`. |
| **Router REST** | [`report_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/routes/report_routes.py) | `GET /api/reports/{report_type}/export`<br>`GET /api/reports/export/excel`<br>`GET /api/reports/export/pdf` | Autenticación JWT, control de rol (fuerza `branch_id` para `encargado`), parseo de `columns` y streaming binario. |
| **Controller Dominio** | [`report_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/services/report_service.py) | `export_report(db, tenant_id, report_type, format, selected_columns, ...)` | Orquestación de consultas analíticas y bifurcación hacia el motor ofimático correspondiente. |
| **Consultas SQL** | [`report_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/services/report_service.py) | `get_sales_report()`<br>`get_inventory_report()`<br>`get_movements_report()` | Agregaciones SQL agrupadas por sucursal, producto y variante con filtros temporales. |
| **Motor Excel** | [`report_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/services/report_service.py) | `export_report_to_excel(...)` con `openpyxl` | Generación de libro `.xlsx`, membrete corporativo, estilos de celda, proyección de columnas y fórmulas vivas `=SUM(...)`. |
| **Motor PDF** | [`report_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/services/report_service.py) | `export_report_to_pdf(...)` con `reportlab` | Documento apaisado `landscape(letter)`, `NumberedCanvas` (*"Página X de Y"*), tarjetas KPI y tablas cebra. |
| **Entidades BD** | `Sale`, `SaleItem`, `Inventory`, `InventoryMovement`, `Company` | Tablas en PostgreSQL 15+ | Entidades de dominio particionadas bajo estricto aislamiento por `tenant_id`. |
| **Respuesta HTTP**| `StreamingResponse` (FastAPI / Starlette) | `Content-Type: application/pdf`<br>`application/vnd.openxmlformats...` | Streaming binario en memoria vía `io.BytesIO` sin almacenamiento temporal en disco. |

### 3. Previsualización del Diagrama de Secuencia (Mermaid UML)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as :Administrador / :Encargado
    participant UI_Page as :AdminReportsPageComponent
    participant UI_Api as :ReportsApiService
    participant Ctrl_Routes as :ReportRoutes
    participant Ctrl_Service as :ReportService
    participant Ent_Company as :Company
    participant Ent_Domain as :Sale / :Inventory / :InventoryMovement
    participant Engine as :ReportExportEngine

    %% FASE 1: Acceso y Carga Inicial de Vista Previa
    Admin->>UI_Page: accederSeccionReportes()
    UI_Page->>UI_Api: fetchReport(defaultQuery)
    UI_Api->>Ctrl_Routes: GET /api/reports/sales
    Ctrl_Routes->>Ctrl_Service: get_sales_report(db, tenant_id)
    Ctrl_Service->>Ent_Domain: filter(tenant_id, date_range)
    Ent_Domain-->>Ctrl_Service: return { summary, rows }
    Ctrl_Service-->>Ctrl_Routes: return { summary, rows }
    Ctrl_Routes-->>UI_Api: return ApiResponse<SalesReportPayload>
    UI_Api-->>UI_Page: return Observable<SalesReportResponse>
    UI_Page->>UI_Page: renderizarVistaPreviaYTarjetasKPI()

    %% FASE 2: Configuración de Filtros y Columnas Visibles
    Admin->>UI_Page: configurarFiltrosYColumnas(tab, preset, columns)
    UI_Page->>UI_Page: toggleColumn(key) / setQuickDate()
    UI_Page->>UI_Page: actualizarTablaYColumnasVisibles()

    %% FASE 3: Solicitud de Exportación Formal
    Admin->>UI_Page: exportReport(format: 'pdf' | 'excel' | 'csv')
    UI_Page->>UI_Api: exportReport(tab, format, query, selectedCols)
    UI_Api->>Ctrl_Routes: GET /api/reports/{type}/export?format={format}&columns={cols}
    Ctrl_Routes->>Ctrl_Routes: validarTokenJWT(claims)

    alt Rol Encargado
        Ctrl_Routes->>Ctrl_Routes: forzar_sucursal(branch_id = current_user.branch_id)
    else Rol Administrador
        Ctrl_Routes->>Ctrl_Routes: permitir_multisucursal(branch_id = query.branch_id)
    end

    Ctrl_Routes->>Ctrl_Routes: parsearColumnasSeleccionadas(columns)
    Ctrl_Routes->>Ent_Company: get_company_by_tenant_id(tenant_id)
    Ent_Company-->>Ctrl_Routes: return(company_data)

    %% FASE 4: Agregación de Datos Multitenant
    Ctrl_Routes->>Ctrl_Service: export_report(db, tenant_id, report_type, format, selected_columns)

    alt Dominio Ventas (sales)
        Ctrl_Service->>Ent_Domain: get_sales_report(db, tenant_id, branch_id, dates)
        Ent_Domain-->>Ctrl_Service: return { summary, rows }
    else Dominio Inventario (inventory)
        Ctrl_Service->>Ent_Domain: get_inventory_report(db, tenant_id, branch_id, q)
        Ent_Domain-->>Ctrl_Service: return { summary, rows }
    else Dominio Movimientos (movements)
        Ctrl_Service->>Ent_Domain: get_movements_report(db, tenant_id, branch_id, dates)
        Ent_Domain-->>Ctrl_Service: return { summary, rows }
    end

    %% FASE 5: Generación Documental Ofimática
    Ctrl_Service->>Engine: despacharGeneradorDocumental(format, summary, rows, selected_columns)

    alt Formato Excel (openpyxl)
        Ctrl_Service->>Engine: export_report_to_excel(type, summary, rows, company_name, selected_columns)
        loop Para cada columna en selected_columns
            Engine->>Engine: renderizarFilaConEstiloYFormatoMoneda()
        end
        Engine->>Engine: insertarFormulaSumatoriaExcel(=SUM(...))
        Engine-->>Ctrl_Service: return (file_io, filename, application/vnd.openxmlformats)
    else Formato PDF (reportlab)
        Ctrl_Service->>Engine: export_report_to_pdf(type, summary, rows, company_name, selected_columns)
        Engine->>Engine: compilarDocumentoConNumberedCanvas(landscape(letter), cebra_styles)
        opt rows.length == 0
            Engine->>Engine: renderizarAvisoSinRegistrosEnPeriodo()
        end
        Engine-->>Ctrl_Service: return (file_io, filename, application/pdf)
    else Formato CSV Plano
        Ctrl_Service->>Ctrl_Service: generarCSVStream(selected_columns)
        Ctrl_Service-->>Ctrl_Service: return (file_io, filename, text/csv)
    end

    %% FASE 6: Streaming Binario y Descarga
    Ctrl_Service-->>Ctrl_Routes: return (file_io, filename, media_type)
    Ctrl_Routes-->>UI_Api: StreamingResponse(content=file_io, headers={'Content-Disposition': filename})
    UI_Api-->>UI_Page: return Observable<Blob>
    UI_Page->>UI_Page: downloadBlob(blob, filename)
    UI_Page-->>Admin: notificarDescargaExitosa(toast.success)
```

---

## CU20: Generar Reportes Ejecutivos por Voz y Lenguaje Natural (Gemini RAG)

### 1. Ficha Técnica y Scripts Enterprise Architect
- **Script Secuencia (JScript):** [`docsUML/CUSecuencia/CU20_secuencia_reportes_voz_gemini_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU20_secuencia_reportes_voz_gemini_EA.js)
- **Script Robustez / Comunicación (JScript):** [`docsUML/CUrobustez/CU20_comm_reportes_voz_gemini_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU20_comm_reportes_voz_gemini_EA.js)
- **Alcance Arquitectónico:** Frontend Web Angular PWA (`frontend/src/app/`) + Backend FastAPI (`p6_inteligencia_analitica`) + Google Gemini 2.5 Flash + Web Speech API.

### 2. Tabla Comparativa: Componentes ICONIX vs Flujo del Código Fuente

| Rol BCE | Componente en Diagrama UML | Elemento en Código Fuente | Métodos / Operaciones Invocadas | Responsabilidad en el Flujo |
| :--- | :--- | :--- | :--- | :--- |
| **Actor** | `:AdministradorTenant` | Usuario Administrador de Boutique | `clickBotonAsistenteVoz()`, `dictarConsultaVoz()` | Inicia la consulta ejecutiva mediante dictado por voz o texto natural en la PWA. |
| **Boundary** | `:ReportsPageComponent` | [`admin-reports-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/admin/pages/admin-reports-page.component.ts) | `openVoiceAssistant()`, `closeVoiceAssistant()` | Contenedor principal de reportes que aloja el botón de activación del asistente. |
| **Boundary** | `:VoiceAssistantModalComponent` | [`voice-assistant-modal.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/admin/components/voice-assistant-modal.component.ts) | `startListening()`, `submitQuery()`, `toggleSpeech()`, `resetConversation()` | Interfaz modal con espectrograma animado de audio, transcripción reactiva, chips y visualización de KPIs. |
| **Boundary (Nativo)** | `:WebSpeechAPI_Recognition` | `window.webkitSpeechRecognition` | `recognition.start()`, `recognition.onresult`, `recognition.onend` | Captura el stream de audio del micrófono y realiza transcripción a texto en tiempo real (`lang: 'es-BO'`). |
| **Boundary (Nativo)** | `:WebSpeechAPI_Synthesis` | `window.speechSynthesis` | `speechSynthesis.speak(utterance)`, `speechSynthesis.cancel()` | Reproduce auditivamente la locución sintetizada del resumen ejecutivo devuelto por el RAG. |
| **Controller** | `:VoiceReportRoutes` | [`voice_report_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/routes/voice_report_routes.py) | `@router.post("/voice-query")` | Endpoint REST autenticado que recibe `VoiceQueryRequest`, extrae `tenant_id` del JWT e inyecta la sesión de BD. |
| **Controller** | `:GeminiRagService` | [`gemini_rag_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/services/gemini_rag_service.py) | `process_voice_query()`, `verify_ai_access_for_tenant()`, `build_tenant_rag_context()`, `_generate_heuristic_fallback()` | Controlador de dominio central: valida acceso por plan (CU02/CU04), ensambla contexto PostgreSQL y orquesta Gemini con fallback. |
| **Controller (SDK)** | `:Google_GeminiClient` | `google.genai.Client` (`gemini-2.5-flash`) | `client.models.generate_content(contents, config)` | Invocación remota al LLM con System Prompt analítico estricto y formato de salida JSON estructurado. |
| **Entity** | `:Plan` / `:Subscription` | [`plan.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/models/plan.py) / [`subscription.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/models/subscription.py) | `has_ai_access`, `code`, `is_active` | Valida políticas SaaS: Plan Básico deniega acceso (HTTP 403); Planes Pro y Empresarial habilitan IA. |
| **Entity** | `:PostgreSQL_TenantData` | `Sale`, `SaleItem`, `Inventory`, `GarmentReturn`, `GarmentExchange` | `filter(tenant_id=...)`, `Sale.status == completed` | Entidades de base de datos que aportan métricas de ventas, prendas estrella, stock crítico y devoluciones. |
| **Entity** | `:VoiceReportResponse` | [`voice_report_schema.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/schemas/voice_report_schema.py) | `executive_summary`, `speech_text`, `kpis`, `data_preview`, `is_fallback` | DTO tipado y estructurado devuelto al cliente frontend para su presentación visual y auditiva. |

### 3. Previsualización del Diagrama de Secuencia (Mermaid UML)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as :AdministradorTenant
    participant UI_Page as :ReportsPageComponent
    participant UI_Modal as :VoiceAssistantModalComponent
    participant GW_Rec as :WebSpeechAPI_Recognition
    participant Ctrl_Routes as :VoiceReportRoutes
    participant Ctrl_RAG as :GeminiRagService
    participant Ent_Plan as :Plan / Suscripcion
    participant DB_Data as :PostgreSQL_TenantData
    participant Engine_AI as :Google_GeminiClient
    participant GW_Syn as :WebSpeechAPI_Synthesis

    %% FASE 1: Activación y Captura de Audio
    Admin->>UI_Page: clickBotonAsistenteVoz()
    UI_Page->>UI_Modal: openModal()
    UI_Modal-->>Admin: renderModal(animacionOndaSonora)

    Admin->>UI_Modal: tapMicrofono()
    UI_Modal->>GW_Rec: startRecognition({ lang: 'es-BO' })
    Admin->>GW_Rec: "Cuáles son las prendas más vendidas y cuánto facturamos?"
    GW_Rec-->>UI_Modal: onresult(transcript)
    UI_Modal->>UI_Modal: setTranscriptText(transcript)

    %% FASE 2: Despacho HTTP y Control de Acceso Multitenant
    UI_Modal->>Ctrl_Routes: POST /api/reports/voice-query { query: transcript }
    Ctrl_Routes->>Ctrl_RAG: process_voice_query(tenant_id, query, branch_id, db)
    Ctrl_RAG->>Ent_Plan: verify_ai_access_for_tenant(db, tenant_id)

    alt Plan Básico (Sin módulo de IA Generativa)
        Ent_Plan-->>Ctrl_RAG: Plan { has_ai_access: False, code: 'BASIC' }
        Ctrl_RAG-->>Ctrl_Routes: raise VoiceReportException(403, "Plan no incluye IA")
        Ctrl_Routes-->>UI_Modal: HTTP 403 Forbidden { detail: "Actualice a Plan PRO" }
        UI_Modal-->>Admin: renderAlertaActualizacionPlan()
    else Plan PRO o Empresarial (has_ai_access: True)
        Ent_Plan-->>Ctrl_RAG: Plan { has_ai_access: True, code: 'PRO' }
        
        %% FASE 3: Ensamble del Contexto RAG en PostgreSQL
        Ctrl_RAG->>DB_Data: build_tenant_rag_context(db, tenant_id, branch_id)
        DB_Data->>DB_Data: querySales(Sale.status == completed, tenant_id)
        DB_Data->>DB_Data: queryTopItems(group_by=[Product, Size, Color], sum=line_total)
        DB_Data->>DB_Data: queryLowStock(Inventory.quantity <= 5)
        DB_Data->>DB_Data: queryReturnsAndExchanges(retention_20_50, diff_paid)
        DB_Data-->>Ctrl_RAG: return aggregatedContextJSON

        %% FASE 4: Inferencia Analítica con Gemini RAG o Fallback
        alt Invocación a Gemini API Exitosa (200 OK)
            Ctrl_RAG->>Engine_AI: generate_content(system_instruction, prompt_rag, schema=VoiceReportResponse)
            Engine_AI-->>Ctrl_RAG: response JSON { executive_summary, speech_text, kpis, data_preview }
        else Fallo o Cuota Excedida de Gemini API (Fallback Resiliente)
            Ctrl_RAG->>Ctrl_RAG: _generate_heuristic_fallback(query, context)
            Ctrl_RAG-->>Ctrl_RAG: return LocalVoiceReportResponse(is_fallback=True)
        end

        %% FASE 5: Entrega y Locución Auditiva
        Ctrl_RAG-->>Ctrl_Routes: return VoiceReportResponse
        Ctrl_Routes-->>UI_Modal: HTTP 200 OK (VoiceReportResponse)
        UI_Modal->>GW_Syn: speak(SpeechSynthesisUtterance(speech_text))
        GW_Syn-->>Admin: locucionAuditivaResumenEjecutivo()
        UI_Modal-->>Admin: renderizarTarjetasKPIsYPrendasEstrella(kpis, data_preview)
    end
```

---

## CU23: Predecir Demanda de Ropa por Talla (ML Supervisado - RandomForest)

### 1. Ficha Técnica y Scripts Enterprise Architect
- **Script Secuencia (JScript):** [`docsUML/CUSecuencia/CU23_secuencia_prediccion_demanda_talla_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU23_secuencia_prediccion_demanda_talla_EA.js)
- **Script Robustez / Comunicación (JScript):** [`docsUML/CUrobustez/CU23_comm_prediccion_demanda_talla_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU23_comm_prediccion_demanda_talla_EA.js)
- **Alcance Arquitectónico:** Frontend Web Angular 21 PWA (`features/admin/pages/`) + Backend FastAPI (`p6_inteligencia_analitica`) + Scikit-Learn.

### 2. Tabla Comparativa: Componentes ICONIX vs Flujo del Código Fuente

| Rol BCE | Componente en Diagrama UML | Elemento en Código Fuente | Métodos / Operaciones Invocadas | Responsabilidad en el Flujo |
| :--- | :--- | :--- | :--- | :--- |
| **Actor** | `AdministradorTenant` | Administrador / Gerente de Boutique | Interacción en PWA | Selecciona prenda, sucursal, horizonte temporal (1 a 8 semanas) y solicita pronóstico. |
| **Boundary** | `:AdminDemandForecastPageComponent` | [`admin-demand-forecast-page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/admin/pages/admin-demand-forecast-page.component.ts) | `onProductSelect()`, `executeForecast()`, `trainModel()` | Renderiza tarjetas KPI, gráfica de barras proporcional stock vs demanda y tabla con intervalos 95%. |
| **Controller** | `:DemandForecastApiService` | [`demand-forecast-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/shared/services/demand-forecast-api.service.ts) | `forecastDemand()`, `getStockAlerts()`, `trainModel()`, `getLatestModel()` | Cliente HTTP Angular que despacha requests JSON autenticados al backend FastAPI. |
| **Controller** | `:DemandForecastRoutes` | [`demand_forecast_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/routes/demand_forecast_routes.py) | `POST /api/ml/demand/forecast`, `POST /train`, `GET /latest-model` | Router FastAPI con inyección de dependencias `current_company`, `current_branch_id` y `get_db`. |
| **Controller** | `:DemandForecastingService` | [`demand_forecasting_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/services/demand_forecasting_service.py) | `forecast_demand_by_size()`, `train_demand_model()`, `get_stock_alerts()` | Servicio de ML que valida acceso IA, extrae features estacionales, invoca el estimador y genera alertas. |
| **Controller** | `:RandomForestRegressorModel` | Pipeline Scikit-Learn (`joblib` `.joblib`) | `predict()`, `estimators_` (dispersión para intervalo de confianza 95%) | Ensamble supervisado de árboles que predice la curva de demanda semanal por talla. |
| **Entity** | `:Plan` / `:Company` | [`company.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/models/company.py) | `validate_ai_access()`, `has_ai_access` | Entidad de suscripción SaaS que autoriza planes Pro/Empresarial y bloquea Plan Básico (403). |
| **Entity** | `:ProductVariant` | [`product_variant.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/models/product_variant.py) | `query(ProductVariant).filter(...)` | Variantes de prenda agrupadas por talla (S, M, L, XL) con sus precios de venta. |
| **Entity** | `:SaleItem` | [`sale_item.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p5_gestion_ventas_pos/models/sale_item.py) | `query(SaleItem).join(Sale)...` | Registro histórico de transacciones textiles utilizado para el entrenamiento del modelo. |
| **Entity** | `:Inventory` | [`inventory.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p3_gestion_inventario_disponibilidad/models/inventory.py) | `query(Inventory).filter(branch_id, variant_id)` | Existencias físicas en percha de la sucursal seleccionada. |
| **Entity** | `:DemandForecast` | [`demand_forecast.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/models/demand_forecast.py) | `commit()`, `bulk_save_objects()` | Persistencia de predicciones, faltantes calculados y sugerencias de compra. |
| **Entity** | `:MLModel` | [`ml_model.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p6_inteligencia_analitica/models/ml_model.py) | `query(MLModel).filter(is_active=True)` | Registro de auditoría con la versión, hiperparámetros y métricas de ajuste ($R^2$, $MAE$, $RMSE$). |

### 3. Previsualización del Diagrama de Secuencia (Mermaid UML)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as :AdministradorTenant
    participant UI_Forecast as :AdminDemandForecastPageComponent
    participant Ctrl_Api as :DemandForecastApiService
    participant Ctrl_Routes as :DemandForecastRoutes
    participant Ctrl_ML as :DemandForecastingService
    participant Ent_Plan as :Plan
    participant Ent_Catalog as :ProductVariant
    participant Model_RF as :RandomForestRegressorModel
    participant Ent_Inv as :Inventory
    participant Ent_Forecast as :DemandForecast
    participant Ent_MLModel as :MLModel

    %% FASE 1: Carga Inicial y Metadatos de Modelo Activo
    Admin->>UI_Forecast: cargarPaginaPronostico()
    UI_Forecast->>Ctrl_Api: getLatestModel()
    Ctrl_Api->>Ctrl_Routes: GET /api/ml/demand/latest-model
    Ctrl_Routes->>Ctrl_ML: get_latest_model_metadata()
    Ctrl_ML->>Ent_MLModel: filter(is_active=True, model_type='random_forest_demand')
    Ent_MLModel-->>Ctrl_ML: return(ml_model_record)
    Ctrl_ML-->>Ctrl_Routes: return(DemandModelMetadata)
    Ctrl_Routes-->>Ctrl_Api: return 200 OK (model_json)
    Ctrl_Api-->>UI_Forecast: actualizarBadgeModelo(R2, version)

    %% FASE 2: Selección y Solicitud de Inferencia
    Admin->>UI_Forecast: seleccionarPrendaYSucursal(productId, branchId, weeksAhead)
    UI_Forecast->>Ctrl_Api: forecastDemand(payload)
    Ctrl_Api->>Ctrl_Routes: POST /api/ml/demand/forecast
    Ctrl_Routes->>Ctrl_ML: forecast_demand_by_size(req)

    %% FASE 3: Validación Comercial de Suscripción (CU02/CU04)
    Ctrl_ML->>Ent_Plan: validate_ai_access(company_id)
    alt Plan Básico (Sin Acceso a ML)
        Ent_Plan-->>Ctrl_ML: return(has_ai_access = false)
        Ctrl_ML-->>Ctrl_Routes: raise HTTPException(403, "Plan no incluye ML")
        Ctrl_Routes-->>Ctrl_Api: HTTP 403 Forbidden
        Ctrl_Api-->>UI_Forecast: mostrarErrorPlanBasico()
    else Plan Profesional o Empresarial (Habilitado)
        Ent_Plan-->>Ctrl_ML: return(has_ai_access = true)

        %% FASE 4: Predicción por Talla con Random Forest
        Ctrl_ML->>Ent_Catalog: filter(product_id = req.product_id)
        Ent_Catalog-->>Ctrl_ML: return(variants_by_size)

        loop Por cada variante de talla (S, M, L, XL)
            Ctrl_ML->>Ctrl_ML: ensamblarVectorFeatures(size, seasonality, price)
            Ctrl_ML->>Model_RF: predict(X_features)
            Model_RF-->>Ctrl_ML: return(demanda_estimada)
            Ctrl_ML->>Model_RF: calcularDispersionArboles(estimators_)
            Model_RF-->>Ctrl_ML: return([demanda_min, demanda_max])

            %% Cruce de Stock en Percha y Detección de Quiebre
            Ctrl_ML->>Ent_Inv: filter(branch_id, variant_id)
            Ent_Inv-->>Ctrl_ML: return(current_stock)
            Ctrl_ML->>Ctrl_ML: calcularDeficitYSugerencia(demanda, stock)
        end

        %% FASE 5: Persistencia y Entrega
        Ctrl_ML->>Ent_Forecast: bulk_save_proyecciones(forecast_rows)
        Ent_Forecast-->>Ctrl_ML: commit()
        Ctrl_ML-->>Ctrl_Routes: return DemandForecastResponse
        Ctrl_Routes-->>Ctrl_Api: HTTP 200 OK (DemandForecastResponse)
        Ctrl_Api-->>UI_Forecast: actualizarGraficaComparativa(data)
        UI_Forecast-->>Admin: renderGraficaStockVsDemandaEIntervalos95()
    end

    %% FASE 6 (OPCIONAL): Re-entrenamiento del Modelo
    opt Calibración o Re-entrenamiento de Hiperparámetros
        Admin->>UI_Forecast: configurarHiperparametrosYEntrenar(n_estimators, max_depth, use_synthetic)
        UI_Forecast->>Ctrl_Api: trainModel(payload)
        Ctrl_Api->>Ctrl_Routes: POST /api/ml/demand/train
        Ctrl_Routes->>Ctrl_ML: train_demand_model(req)
        Ctrl_ML->>Model_RF: fit(X_train, y_train)
        Model_RF-->>Ctrl_ML: return(fitted_pipeline, r2_score)
        Ctrl_ML->>Ctrl_ML: joblib.dump(pipeline, tenant_model_path)
        Ctrl_ML->>Ent_MLModel: create(version, metrics={r2, mae, rmse})
        Ent_MLModel-->>Ctrl_ML: commit()
        Ctrl_ML-->>Ctrl_Routes: return DemandTrainResponse
        Ctrl_Routes-->>Ctrl_Api: HTTP 200 OK (DemandTrainResponse)
        Ctrl_Api-->>UI_Forecast: notificarEntrenamientoExitoso()
        UI_Forecast-->>Admin: mostrarMensajeExitoR2()
    end
```



---

## CU01: Registrar y Gestionar Empresas Tenants

### 1. Ficha Técnica y Scripts Enterprise Architect
- **Script Secuencia (JScript):** [`docsUML/CUSecuencia/CU01_secuencia_gestionar_tenants_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU01_secuencia_gestionar_tenants_EA.js)
- **Script Robustez / Comunicación (JScript):** [`docsUML/CUrobustez/CU01_comm_gestionar_tenants_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU01_comm_gestionar_tenants_EA.js)
- **Alcance Arquitectónico:** Frontend Angular (`frontend/`) + Backend FastAPI (`p0_saas_plataforma`).

### 2. Tabla Comparativa: Componentes ICONIX vs Flujo del Código Fuente

| Rol BCE | Componente en Diagrama UML | Elemento en Código Fuente | Métodos / Operaciones Invocadas | Responsabilidad en el Flujo |
| :--- | :--- | :--- | :--- | :--- |
| **Actor** | `Superadmin` | Usuario Global / `PlatformAdmin` | Interacción en consola SaaS | Gestiona empresas suscriptoras del SaaS multitenant. |
| **Boundary** | `:TenantsPageComponent` | [`tenants.page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/tenants/tenants.page.component.ts) | `loadCompanies()`, `openModal()`, `refresh()` | Vista administrativa de grilla y operaciones de tenants. |
| **Boundary** | `:TenantFormModalComponent`| [`tenant-form-modal.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/tenants/tenant-form-modal.component.ts) | `renderizarFormulario()`, `submit()` | Modal interactivo para carga de datos de nueva empresa y plan. |
| **Boundary** | `:CompanyService` | [`company.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/services/company.service.ts) | `listCompanies()`, `registerCompany()` | Cliente HTTP frontend para interacción con endpoints de compañías. |
| **Controller** | `:CompanyRoutes` | [`company_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/routes/company_routes.py) | `get_all_companies()`, `register_company()` | Endpoints REST en FastAPI con validación de roles superadmin. |
| **Controller** | `:TenantService` | [`tenant_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/services/tenant_service.py) | `list_companies()`, `create_tenant()` | Servicio de orquestación SaaS: valida slug/NIT y aprovisiona recursos iniciales. |
| **Entity** | `:Company` | [`company.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/models/company.py) | `query()`, `create()` | Modelo persistente de empresa multitenant en PostgreSQL. |
| **Entity** | `:Plan` | [`plan.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/models/plan.py) | `query()` | Modelo de planes comerciales y cuotas autorizadas. |
| **Entity** | `:Subscription` | [`subscription.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/models/subscription.py) | `create()` | Registro de vinculación empresa-plan y vigencia. |
| **Entity** | `:User` | [`user.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/models/user.py) | `create()` | Usuario administrador primario aprovisionado para el tenant. |

### 3. Previsualización del Diagrama de Secuencia (Mermaid UML)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as :Superadmin
    participant UI_Grid as :TenantsPageComponent
    participant UI_Modal as :TenantFormModalComponent
    participant UI_Srv as :CompanyService
    participant Ctrl_Routes as :CompanyRoutes
    participant Ctrl_Svc as :TenantService
    participant Ent_Comp as :Company
    participant Ent_Plan as :Plan
    participant Ent_Sub as :Subscription
    participant Ent_User as :User

    %% FASE 1: Consulta Inicial y Listado de Empresas
    Admin->>UI_Grid: accederGestionTenants()
    UI_Grid->>UI_Srv: listCompanies()
    UI_Srv->>Ctrl_Routes: get_all_companies()
    Ctrl_Routes->>Ctrl_Svc: list_companies()
    Ctrl_Svc->>Ent_Comp: query()
    Ctrl_Svc-->>Ctrl_Routes: response()
    Ctrl_Routes-->>UI_Srv: response()
    UI_Srv-->>UI_Grid: setCompanies()
    UI_Grid-->>Admin: renderizarGrillaTenants()

    %% FASE 2: Formulario y Registro de Nueva Empresa
    Admin->>UI_Grid: abrirModalNuevoTenant()
    UI_Grid->>UI_Modal: renderizarFormulario()
    Admin->>UI_Modal: ingresarDatosEmpresaYPlan()
    UI_Modal->>UI_Srv: registerCompany()
    UI_Srv->>Ctrl_Routes: register_company()
    Ctrl_Routes->>Ctrl_Svc: create_tenant()
    Ctrl_Svc->>Ent_Comp: query()

    alt Slug y NIT únicos: Registro Exitoso
        Ctrl_Svc->>Ent_Comp: create()
        Ctrl_Svc->>Ent_Plan: query()
        Ctrl_Svc->>Ent_Sub: create()
        Ctrl_Svc->>Ent_User: create()
        Ctrl_Svc-->>Ctrl_Routes: response()
        Ctrl_Routes-->>UI_Srv: 201 Created
        UI_Srv-->>UI_Modal: response()
        UI_Modal->>UI_Grid: refrescarLista()
        UI_Grid-->>Admin: mostrarToastExito()
    else Subdominio o NIT ya registrado
        Ctrl_Svc-->>Ctrl_Routes: raise_http_exception()
        Ctrl_Routes-->>UI_Srv: 400 Bad Request
        UI_Srv-->>UI_Modal: showError()
        UI_Modal-->>Admin: mostrarErrorDuplicado()
    end
```

---

## CU02: Gestionar Planes de Suscripción y Cuotas Comerciales

### 1. Ficha Técnica y Scripts Enterprise Architect
- **Script Secuencia (JScript):** [`docsUML/CUSecuencia/CU02_secuencia_gestionar_planes_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU02_secuencia_gestionar_planes_EA.js)
- **Script Robustez / Comunicación (JScript):** [`docsUML/CUrobustez/CU02_comm_gestionar_planes_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU02_comm_gestionar_planes_EA.js)
- **Alcance Arquitectónico:** Frontend Angular (`frontend/`) + Backend FastAPI (`p0_saas_plataforma`).

### 2. Tabla Comparativa: Componentes ICONIX vs Flujo del Código Fuente

| Rol BCE | Componente en Diagrama UML | Elemento en Código Fuente | Métodos / Operaciones Invocadas | Responsabilidad en el Flujo |
| :--- | :--- | :--- | :--- | :--- |
| **Actor** | `Superadmin` | Usuario Global / `PlatformAdmin` | Consola de administración SaaS | Gestiona cuotas y asignación de planes a empresas. |
| **Boundary** | `:TenantsPageComponent` | [`tenants.page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/tenants/tenants.page.component.ts) | `openSubscriptionModal()`, `onSubscriptionUpdated()` | Origen del evento de cambio de plan y recepción de feedback. |
| **Boundary** | `:SubscriptionModalComponent` | [`subscription-modal.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/tenants/subscription-modal.component.ts) | `loadData()`, `onSubmit()`, `renderizarModalConPlanes()` | Diálogo modal para selección y asignación del nuevo plan. |
| **Boundary** | `:CompanyService` | [`company.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/services/company.service.ts) | `getPlans()`, `getCompanySubscription()`, `assignSubscription()` | Cliente HTTP que centraliza las peticiones de suscripciones y planes. |
| **Controller** | `:PlanRoutes` | [`plan_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/routes/plan_routes.py) | `list_plans()` | Endpoint REST para consulta del catálogo maestro de planes. |
| **Controller** | `:SubscriptionRoutes` | [`subscription_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/routes/subscription_routes.py) | `get_company_subscription()`, `assign_subscription()` | Endpoints REST para consulta y modificación de suscripción activa. |
| **Controller** | `:QuotaService` | [`quota_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/services/quota_service.py) | `get_active_subscription()`, `validate_branch_quota()` | Controlador de reglas de negocio: valida Downgrade Guard contra sucursales activas. |
| **Entity** | `:Plan` | [`plan.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/models/plan.py) | `query()` | Modelo de planes con campos `max_branches`, `has_ai_access`, etc. |
| **Entity** | `:Subscription` | [`subscription.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/models/subscription.py) | `query()`, `update()`, `create()` | Registro histórico y activo de la suscripción del tenant. |
| **Entity** | `:Branch` | [`branch.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/models/branch.py) | `query()` | Conteo de sucursales activas del tenant para el Downgrade Guard. |

### 3. Previsualización del Diagrama de Secuencia (Mermaid UML)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as :Superadmin
    participant UI_Grid as :TenantsPageComponent
    participant UI_Modal as :SubscriptionModalComponent
    participant UI_Srv as :CompanyService
    participant Ctrl_PlanR as :PlanRoutes
    participant Ctrl_SubR as :SubscriptionRoutes
    participant Ctrl_Quota as :QuotaService
    participant Ent_Plan as :Plan
    participant Ent_Sub as :Subscription
    participant Ent_Branch as :Branch

    %% FASE 1: Consulta de Planes y Suscripción Activa
    Admin->>UI_Grid: openSubscriptionModal()
    UI_Grid->>UI_Modal: loadData()
    UI_Modal->>UI_Srv: getPlans()
    UI_Srv->>Ctrl_PlanR: list_plans()
    Ctrl_PlanR->>Ent_Plan: query()
    Ctrl_PlanR-->>UI_Srv: response()
    UI_Modal->>UI_Srv: getCompanySubscription()
    UI_Srv->>Ctrl_SubR: get_company_subscription()
    Ctrl_SubR->>Ctrl_Quota: get_active_subscription()
    Ctrl_Quota->>Ent_Sub: query()
    Ctrl_SubR-->>UI_Srv: response()
    UI_Srv-->>UI_Modal: setPlansAndCurrentSubscription()
    UI_Modal-->>Admin: renderizarModalConPlanes()

    %% FASE 2: Selección y Asignación de Plan
    Admin->>UI_Modal: onSubmit()
    UI_Modal->>UI_Srv: assignSubscription()
    UI_Srv->>Ctrl_SubR: assign_subscription()
    Ctrl_SubR->>Ctrl_Quota: validate_branch_quota()
    Ctrl_Quota->>Ent_Branch: query()
    Ctrl_Quota->>Ent_Plan: query()

    alt Sucursales activas <= max_branches: Asignación Aprobada
        Ctrl_SubR->>Ent_Sub: update()
        Ctrl_SubR->>Ent_Sub: create()
        Ctrl_SubR->>Ctrl_SubR: sync_tenant_limits()
        Ctrl_SubR-->>UI_Srv: response()
        UI_Srv-->>UI_Modal: 200 OK
        UI_Modal->>UI_Grid: onSubscriptionUpdated()
        UI_Grid-->>Admin: mostrarToastExito()
    else Sucursales activas > max_branches (Rechazo Downgrade)
        Ctrl_Quota-->>Ctrl_SubR: raise_quota_exceeded()
        Ctrl_SubR-->>UI_Srv: 400 Bad Request
        UI_Srv-->>UI_Modal: showError()
        UI_Modal-->>Admin: showErrorToast()
    end
```

---

## CU03: Iniciar Sesión Multitenant con JWT y Claims

### 1. Ficha Técnica y Scripts Enterprise Architect
- **Script Secuencia (JScript):** [`docsUML/CUSecuencia/CU03_secuencia_iniciar_sesion_multitenant_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU03_secuencia_iniciar_sesion_multitenant_EA.js)
- **Script Robustez / Comunicación (JScript):** [`docsUML/CUrobustez/CU03_comm_iniciar_sesion_multitenant_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU03_comm_iniciar_sesion_multitenant_EA.js)
- **Alcance Arquitectónico:** Frontend Angular (`frontend/`) + Backend FastAPI (`p1_gestion_usuarios_acceso`).

### 2. Tabla Comparativa: Componentes ICONIX vs Flujo del Código Fuente

| Rol BCE | Componente en Diagrama UML | Elemento en Código Fuente | Métodos / Operaciones Invocadas | Responsabilidad en el Flujo |
| :--- | :--- | :--- | :--- | :--- |
| **Actor** | `Usuario` | Empleado / Administrador / Superadmin | Formulario de autenticación web | Proporciona credenciales y accede a la sesión del tenant. |
| **Boundary** | `:LoginPageComponent` | [`login.page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/auth/login.page.component.ts) | `selectActor()`, `normalizeEmailInput()`, `submitLogin()` | Pantalla de inicio de sesión con selección de roles demo y validación de formulario. |
| **Boundary** | `:SessionService` | [`session.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/services/session.service.ts) | `login()`, `setSession()`, `navigateByUrl()` | Gestor de estado de sesión, almacenamiento de token en localStorage y redirección. |
| **Boundary** | `:AuthApiService` | [`auth-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/services/auth-api.service.ts) | `login()` | Cliente HTTP para interactuar con el router de autenticación del backend. |
| **Controller** | `:AuthRoutes` | [`auth_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/routes/auth_routes.py) | `login_route()` | Endpoint POST `/auth/login`: orquesta verificación y generación de token. |
| **Controller** | `:AuthSecurity` | [`security.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/auth/security.py) | `verify_password()`, `create_access_token()` | Hashing criptográfico con bcrypt y firma de tokens JWT con claims de tenant. |
| **Entity** | `:User` | [`user.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/models/user.py) | `query()` | Modelo de usuario con credenciales, rol y estado activo. |
| **Entity** | `:Company` | [`company.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/models/company.py) | `query()` | Validación de estado de la empresa asociada (activa vs suspendida). |
| **Entity** | `:JwtToken` | Estructura JWT Payload | `create()` | Token criptográfico portador con claims `tenant_id`, `sub`, `role`, `branch_id`. |

### 3. Previsualización del Diagrama de Secuencia (Mermaid UML)

```mermaid
sequenceDiagram
    autonumber
    actor User as :Usuario
    participant UI_Login as :LoginPageComponent
    participant UI_Session as :SessionService
    participant UI_Api as :AuthApiService
    participant Ctrl_Routes as :AuthRoutes
    participant Ctrl_Sec as :AuthSecurity
    participant Ent_User as :User
    participant Ent_Comp as :Company
    participant Ent_Jwt as :JwtToken

    %% FASE 1: Selección y Envío de Credenciales
    User->>UI_Login: selectActor()
    UI_Login->>UI_Login: normalizeEmailInput()
    User->>UI_Login: submitLogin()
    UI_Login->>UI_Session: login()
    UI_Session->>UI_Api: login()
    UI_Api->>Ctrl_Routes: login_route()
    Ctrl_Routes->>Ent_User: query()
    Ctrl_Routes->>Ctrl_Sec: verify_password()

    alt Credenciales válidas y Empresa activa: Login Exitoso
        Ctrl_Routes->>Ent_Comp: query()
        Ctrl_Routes->>Ctrl_Sec: create_access_token()
        Ctrl_Sec->>Ent_Jwt: create()
        Ctrl_Routes-->>UI_Api: response()
        UI_Api-->>UI_Session: token_payload
        UI_Session->>UI_Session: setSession()
        UI_Session->>UI_Login: navigateByUrl()
    else Credenciales inválidas (401 Unauthorized)
        Ctrl_Routes-->>UI_Api: raise_http_exception()
        UI_Api-->>UI_Login: error_401
        UI_Login-->>User: showErrorToast()
    else Empresa suspendida por mora (403 Forbidden)
        Ctrl_Routes-->>UI_Api: raise_http_exception()
        UI_Api-->>UI_Login: error_403
        UI_Login-->>User: showErrorToast()
    end
```

---

## CU04: Gestionar Sucursales y Validar Límites de Plan

### 1. Ficha Técnica y Scripts Enterprise Architect
- **Script Secuencia (JScript):** [`docsUML/CUSecuencia/CU04_secuencia_gestionar_sucursales_limites_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU04_secuencia_gestionar_sucursales_limites_EA.js)
- **Script Robustez / Comunicación (JScript):** [`docsUML/CUrobustez/CU04_comm_gestionar_sucursales_limites_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU04_comm_gestionar_sucursales_limites_EA.js)
- **Alcance Arquitectónico:** Frontend Angular (`frontend/`) + Backend FastAPI (`p1_gestion_usuarios_acceso`).

### 2. Tabla Comparativa: Componentes ICONIX vs Flujo del Código Fuente

| Rol BCE | Componente en Diagrama UML | Elemento en Código Fuente | Métodos / Operaciones Invocadas | Responsabilidad en el Flujo |
| :--- | :--- | :--- | :--- | :--- |
| **Actor** | `AdministradorTenant` | Usuario Tenant / `Admin` | Interfaz de sucursales | Gestiona puntos de venta y valida cuotas asignadas a su empresa. |
| **Boundary** | `:AdminBranchPageComponent` | [`admin-branch.page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/admin/branches/admin-branch.page.component.ts) | `loadData()`, `submitNuevaSucursal()`, `renderizarPanelSucursales()` | Vista de configuración de sucursales, horarios, coordenadas y medidor de cuota. |
| **Boundary** | `:AdminBranchService` | [`admin-branch.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/services/admin-branch.service.ts) | `getBranchQuota()`, `listBranches()`, `createBranch()` | Servicio de cliente HTTP para consultar cupo y crear sucursales. |
| **Controller** | `:BranchRoutes` | [`branch_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/routes/branch_routes.py) | `get_branch_quota_route()`, `list_branches_route()`, `create_branch_route()` | Endpoints REST en FastAPI con aislamiento tenant estricto. |
| **Controller** | `:BranchService` | [`branch_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/services/branch_service.py) | `get_branch_quota()`, `get_branches()`, `create_branch()`, `validate_branch_quota()` | Controlador de dominio: consulta plan y valida que sucursales activas < `max_branches`. |
| **Entity** | `:Subscription` | [`subscription.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/models/subscription.py) | `query()` | Consulta de suscripción activa para determinar el plan contratado. |
| **Entity** | `:Plan` | [`plan.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/models/plan.py) | `query()` | Consulta de la cuota máxima permitida (`max_branches` = 2 Básico, 10 Profesional). |
| **Entity** | `:Branch` | [`branch.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/models/branch.py) | `query()`, `create()` | Persistencia y conteo de sucursales activas asociadas al tenant. |

### 3. Previsualización del Diagrama de Secuencia (Mermaid UML)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as :AdministradorTenant
    participant UI_Page as :AdminBranchPageComponent
    participant UI_Srv as :AdminBranchService
    participant Ctrl_Routes as :BranchRoutes
    participant Ctrl_Svc as :BranchService
    participant Ent_Sub as :Subscription
    participant Ent_Plan as :Plan
    participant Ent_Branch as :Branch

    %% FASE 1: Consulta de Cuota y Sucursales Existentes
    Admin->>UI_Page: loadData()
    UI_Page->>UI_Srv: getBranchQuota()
    UI_Srv->>Ctrl_Routes: get_branch_quota_route()
    Ctrl_Routes->>Ctrl_Svc: get_branch_quota()
    Ctrl_Svc->>Ent_Sub: query()
    Ctrl_Svc->>Ent_Plan: query()
    Ctrl_Svc->>Ent_Branch: query()
    Ctrl_Routes-->>UI_Srv: response()
    UI_Page->>UI_Srv: listBranches()
    UI_Srv->>Ctrl_Routes: list_branches_route()
    Ctrl_Routes->>Ctrl_Svc: get_branches()
    Ctrl_Svc->>Ent_Branch: query()
    Ctrl_Routes-->>UI_Srv: response()
    UI_Srv-->>UI_Page: setQuotaAndBranches()
    UI_Page-->>Admin: renderizarPanelSucursales()

    %% FASE 2: Formulario de Sucursal y Validación de Cuota
    Admin->>UI_Page: submitNuevaSucursal()
    UI_Page->>UI_Srv: createBranch()
    UI_Srv->>Ctrl_Routes: create_branch_route()
    Ctrl_Routes->>Ctrl_Svc: create_branch()
    Ctrl_Svc->>Ctrl_Svc: validate_branch_quota()
    Ctrl_Svc->>Ent_Branch: query()
    Ctrl_Svc->>Ent_Plan: query()

    alt Sucursales activas < max_branches: Cupo disponible
        Ctrl_Svc->>Ent_Branch: create()
        Ctrl_Routes-->>UI_Srv: response()
        UI_Srv-->>UI_Page: 201 Created
        UI_Page->>UI_Page: loadData()
        UI_Page-->>Admin: mostrarToastExito()
    else Sucursales activas >= max_branches (Cuota copada 400)
        Ctrl_Svc-->>Ctrl_Routes: raise_quota_exceeded()
        Ctrl_Routes-->>UI_Srv: 400 Bad Request
        UI_Srv-->>UI_Page: showError()
        UI_Page-->>Admin: showErrorToast()
    end
```


---

## CU05: Gestionar Prendas y Variantes de Precio por Talla

### 1. Ficha Técnica y Scripts Enterprise Architect
- **Script Secuencia (JScript):** [`docsUML/CUSecuencia/CU05_secuencia_gestionar_prendas_variantes_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU05_secuencia_gestionar_prendas_variantes_EA.js)
- **Script Robustez / Comunicación (JScript):** [`docsUML/CUrobustez/CU05_comm_gestionar_prendas_variantes_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU05_comm_gestionar_prendas_variantes_EA.js)
- **Alcance Arquitectónico:** Frontend Angular (`frontend/`) + Backend FastAPI (`p2_gestion_productos_catalogo`).

### 2. Tabla Comparativa: Componentes ICONIX vs Flujo del Código Fuente

| Rol BCE | Componente en Diagrama UML | Elemento en Código Fuente | Métodos / Operaciones Invocadas | Responsabilidad en el Flujo |
| :--- | :--- | :--- | :--- | :--- |
| **Actor** | `AdministradorTenant` | Administrador de Tienda | Interacción en catálogo administrativo | Registra prendas y define precios diferenciados según talla. |
| **Boundary** | `:AdminCatalogPageComponent` | [`admin-catalog.page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/admin/catalog/admin-catalog.page.component.ts) | `loadData()`, `submitNuevaPrenda()`, `renderizarGrillaCatalogo()` | Formulario maestro de prendas y variantes con validación reactiva. |
| **Boundary** | `:CatalogApiService` | [`catalog-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/services/catalog-api.service.ts) | `listAdminProducts()`, `createProduct()` | Cliente HTTP que despacha las operaciones hacia el backend. |
| **Controller** | `:CatalogRoutes` | [`catalog_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/routes/catalog_routes.py) | `list_admin_products_route()`, `create_product_route()` | Endpoints REST en FastAPI con inyección de tenant_id. |
| **Controller** | `:CatalogService` | [`catalog_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/services/catalog_service.py) | `list_admin_products()`, `create_product()`, `validate_variant_payload()`, `validate_discount()` | Reglas de dominio: validación de SKU único por talla y cálculo de precios. |
| **Entity** | `:Product` | [`product.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/models/product.py) | `query()`, `create()` | Entidad prenda principal en PostgreSQL. |
| **Entity** | `:ProductVariant` | [`product_variant.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/models/product_variant.py) | `create()` | Entidad variante de talla/color con precio específico. |
| **Entity** | `:Category` | [`category.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/models/category.py) | `query()` | Categoría a la que pertenece la prenda. |
| **Entity** | `:Size` | [`size.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/models/size.py) | `query()` | Catálogo maestro de tallas (S, M, L, XL). |

### 3. Previsualización del Diagrama de Secuencia (Mermaid UML)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as :AdministradorTenant
    participant UI_Page as :AdminCatalogPageComponent
    participant UI_Api as :CatalogApiService
    participant Ctrl_Routes as :CatalogRoutes
    participant Ctrl_Svc as :CatalogService
    participant Ent_Prod as :Product
    participant Ent_Var as :ProductVariant
    participant Ent_Cat as :Category
    participant Ent_Size as :Size

    %% FASE 1: Consulta Catálogo Administrativo
    Admin->>UI_Page: loadData()
    UI_Page->>UI_Api: listAdminProducts()
    UI_Api->>Ctrl_Routes: list_admin_products_route()
    Ctrl_Routes->>Ctrl_Svc: list_admin_products()
    Ctrl_Svc->>Ent_Prod: query()
    Ctrl_Routes->>Ent_Cat: query()
    Ctrl_Routes->>Ent_Size: query()
    Ctrl_Routes-->>UI_Api: response()
    UI_Api-->>UI_Page: setProducts()
    UI_Page-->>Admin: renderizarGrillaCatalogo()

    %% FASE 2: Creación de Prenda y Precios por Talla
    Admin->>UI_Page: submitNuevaPrenda()
    UI_Page->>UI_Api: createProduct()
    UI_Api->>Ctrl_Routes: create_product_route()
    Ctrl_Routes->>Ctrl_Svc: create_product()
    Ctrl_Svc->>Ctrl_Svc: validate_variant_payload()
    Ctrl_Svc->>Ctrl_Svc: validate_discount()

    alt SKU válido y sin duplicado: Creación Exitosa
        Ctrl_Svc->>Ent_Prod: create()
        Ctrl_Svc->>Ent_Var: create()
        Ctrl_Routes-->>UI_Api: response()
        UI_Api-->>UI_Page: 201 Created
        UI_Page->>UI_Page: loadData()
        UI_Page-->>Admin: mostrarToastExito()
    else SKU duplicado o descuento inválido (400)
        Ctrl_Svc-->>Ctrl_Routes: raise_http_exception()
        Ctrl_Routes-->>UI_Api: 400 Bad Request
        UI_Api-->>UI_Page: showError()
        UI_Page-->>Admin: showErrorToast()
    end
```

---

## CU06: Consultar Catálogo Online con Búsqueda Facetada

### 1. Ficha Técnica y Scripts Enterprise Architect
- **Script Secuencia (JScript):** [`docsUML/CUSecuencia/CU06_secuencia_consultar_catalogo_facetado_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU06_secuencia_consultar_catalogo_facetado_EA.js)
- **Script Robustez / Comunicación (JScript):** [`docsUML/CUrobustez/CU06_comm_consultar_catalogo_facetado_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU06_comm_consultar_catalogo_facetado_EA.js)
- **Alcance Arquitectónico:** Frontend Angular (`frontend/`) + Backend FastAPI (`p2_gestion_productos_catalogo`).

### 2. Tabla Comparativa: Componentes ICONIX vs Flujo del Código Fuente

| Rol BCE | Componente en Diagrama UML | Elemento en Código Fuente | Métodos / Operaciones Invocadas | Responsabilidad en el Flujo |
| :--- | :--- | :--- | :--- | :--- |
| **Actor** | `Cliente` | Usuario Comprador | Navegación y filtrado en tienda | Explora el catálogo con filtros facetados por talla, precio y categoría. |
| **Boundary** | `:CatalogPageComponent` | [`catalog.page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/catalog/catalog.page.component.ts) | `navegarCatalogo()`, `search()`, `aplicarFiltrosFacetados()`, `renderizarGrillaPrendas()` | Pantalla de catálogo online con panel lateral de filtros facetados. |
| **Boundary** | `:CatalogApiService` | [`catalog-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/services/catalog-api.service.ts) | `listCategories()`, `listProducts()` | Cliente HTTP que invoca las rutas públicas del catálogo. |
| **Controller** | `:CatalogRoutes` | [`catalog_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/routes/catalog_routes.py) | `list_categories_route()`, `list_products_route()` | Endpoints GET `/categories` y GET `/products`. |
| **Controller** | `:CatalogService` | [`catalog_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/services/catalog_service.py) | `list_public_products()`, `build_facet_query()` | Orquestador de consultas dinámicas combinando categorías, tallas y rangos. |
| **Entity** | `:Product` | [`product.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/models/product.py) | `query()` | Modelo de producto base activo. |
| **Entity** | `:ProductVariant` | [`product_variant.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/models/product_variant.py) | `query()` | Variantes filtradas por talla y precio. |
| **Entity** | `:Category` | [`category.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/models/category.py) | `query()` | Categorías disponibles para las facetas. |
| **Entity** | `:Size` | [`size.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/models/size.py) | `query()` | Tallas disponibles para las facetas. |

### 3. Previsualización del Diagrama de Secuencia (Mermaid UML)

```mermaid
sequenceDiagram
    autonumber
    actor User as :Cliente
    participant UI_Page as :CatalogPageComponent
    participant UI_Api as :CatalogApiService
    participant Ctrl_Routes as :CatalogRoutes
    participant Ctrl_Svc as :CatalogService
    participant Ent_Prod as :Product
    participant Ent_Var as :ProductVariant
    participant Ent_Cat as :Category
    participant Ent_Size as :Size

    %% FASE 1: Consulta Inicial y Carga de Filtros
    User->>UI_Page: navegarCatalogo()
    UI_Page->>UI_Api: listCategories()
    UI_Api->>Ctrl_Routes: list_categories_route()
    Ctrl_Routes->>Ent_Cat: query()
    Ctrl_Routes->>Ent_Size: query()
    Ctrl_Routes-->>UI_Api: response()
    UI_Api-->>UI_Page: setCategoriesAndSizes()
    UI_Page-->>User: renderizarFiltros()

    %% FASE 2: Búsqueda Facetada Combinada
    User->>UI_Page: aplicarFiltrosFacetados()
    UI_Page->>UI_Page: search()
    UI_Page->>UI_Api: listProducts()
    UI_Api->>Ctrl_Routes: list_products_route()
    Ctrl_Routes->>Ctrl_Svc: list_public_products()
    Ctrl_Svc->>Ctrl_Svc: build_facet_query()
    Ctrl_Svc->>Ent_Prod: query()
    Ctrl_Svc->>Ent_Var: query()

    alt Resultados encontrados: Renderizar Grilla
        Ctrl_Svc-->>Ctrl_Routes: response()
        Ctrl_Routes-->>UI_Api: 200 OK (products)
        UI_Api-->>UI_Page: setProducts()
        UI_Page-->>User: renderizarGrillaPrendas()
    else Sin coincidencias (empty 200)
        Ctrl_Svc-->>Ctrl_Routes: responseEmpty()
        Ctrl_Routes-->>UI_Api: 200 OK (empty)
        UI_Api-->>UI_Page: setProductsEmpty()
        UI_Page-->>User: mostrarEmptyState()
    end
```

---

## CU07: Sincronizar y Descargar Catálogo a Almacenamiento Local (PWA / SQLite)

### 1. Ficha Técnica y Scripts Enterprise Architect
- **Script Secuencia (JScript):** [`docsUML/CUSecuencia/CU07_secuencia_sincronizar_catalogo_offline_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU07_secuencia_sincronizar_catalogo_offline_EA.js)
- **Script Robustez / Comunicación (JScript):** [`docsUML/CUrobustez/CU07_comm_sincronizar_catalogo_offline_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU07_comm_sincronizar_catalogo_offline_EA.js)
- **Alcance Arquitectónico:** Frontend PWA Angular (`frontend/`) + Backend FastAPI (`p2_gestion_productos_catalogo`).

### 2. Tabla Comparativa: Componentes ICONIX vs Flujo del Código Fuente

| Rol BCE | Componente en Diagrama UML | Elemento en Código Fuente | Métodos / Operaciones Invocadas | Responsabilidad en el Flujo |
| :--- | :--- | :--- | :--- | :--- |
| **Actor** | `Cajero` | Personal POS | Acción manual o automática en PWA | Descarga y actualiza el catálogo offline en IndexedDB. |
| **Boundary** | `:CatalogPageComponent` | [`catalog.page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/catalog/catalog.page.component.ts) | `solicitarSincronizacionOffline()`, `downloadOfflineCatalog()`, `mostrarToastSincronizado()` | Botón y barra de progreso de sincronización offline en POS. |
| **Boundary** | `:CatalogApiService` | [`catalog-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/services/catalog-api.service.ts) | `getOfflineCatalogPack()` | Cliente HTTP que descarga el payload estructurado del catálogo. |
| **Boundary** | `:IdbCatalogService` | [`idb-catalog.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/offline/idb-catalog.service.ts) | `saveOfflinePack()`, `rollbackTransaction()` | Servicio Angular encargado de las transacciones con IndexedDB. |
| **Controller** | `:CatalogRoutes` | [`catalog_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/routes/catalog_routes.py) | `get_offline_catalog_pack_route()` | Endpoint que empaqueta prendas, variantes e imágenes para caché offline. |
| **Controller** | `:CatalogService` | [`catalog_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/services/catalog_service.py) | `list_public_products()` | Consulta masiva optimizada para sincronización offline. |
| **Entity** | `:Product` | [`product.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/models/product.py) | `query()` | Modelos de prendas activas en PostgreSQL. |
| **Entity** | `:ProductVariant` | [`product_variant.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p2_gestion_productos_catalogo/models/product_variant.py) | `query()` | Variantes asociadas a las prendas. |
| **Entity** | `:IdbCatalogStore` | ObjectStore IndexedDB (`catalog_products`) | `clearAndPutProducts()`, `putSyncMeta()` | Almacenamiento no relacional local en el navegador del cliente. |

### 3. Previsualización del Diagrama de Secuencia (Mermaid UML)

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as :Cajero
    participant UI_Page as :CatalogPageComponent
    participant UI_Api as :CatalogApiService
    participant UI_Idb as :IdbCatalogService
    participant Ctrl_Routes as :CatalogRoutes
    participant Ctrl_Svc as :CatalogService
    participant Ent_Prod as :Product
    participant Ent_Var as :ProductVariant
    participant Ent_Idb as :IdbCatalogStore

    %% FASE 1: Solicitud y Descarga de Catálogo Offline
    Cashier->>UI_Page: solicitarSincronizacionOffline()
    UI_Page->>UI_Page: downloadOfflineCatalog()
    UI_Page->>UI_Api: getOfflineCatalogPack()
    UI_Api->>Ctrl_Routes: get_offline_catalog_pack_route()
    Ctrl_Routes->>Ctrl_Svc: list_public_products()
    Ctrl_Svc->>Ent_Prod: query()
    Ctrl_Svc->>Ent_Var: query()

    alt Red disponible: Sincronización Exitosa
        Ctrl_Svc-->>Ctrl_Routes: response()
        Ctrl_Routes-->>UI_Api: 200 OK (catalog_pack)
        UI_Api-->>UI_Page: response()
        UI_Page->>UI_Idb: saveOfflinePack()
        UI_Idb->>Ent_Idb: clearAndPutProducts()
        UI_Idb->>Ent_Idb: putSyncMeta()
        UI_Idb-->>UI_Page: ok
        UI_Page-->>Cashier: mostrarToastSincronizado()
    else Falla de red (NetworkError)
        UI_Api-->>UI_Page: network_error()
        UI_Page->>UI_Idb: rollbackTransaction()
        UI_Page-->>Cashier: showErrorToast()
    end
```

---

## CU08: Consultar Catálogo Offline en Modo Desconectado

### 1. Ficha Técnica y Scripts Enterprise Architect
- **Script Secuencia (JScript):** [`docsUML/CUSecuencia/CU08_secuencia_consultar_catalogo_offline_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU08_secuencia_consultar_catalogo_offline_EA.js)
- **Script Robustez / Comunicación (JScript):** [`docsUML/CUrobustez/CU08_comm_consultar_catalogo_offline_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU08_comm_consultar_catalogo_offline_EA.js)
- **Alcance Arquitectónico:** Frontend PWA Angular (`frontend/`) con persistencia local IndexedDB.

### 2. Tabla Comparativa: Componentes ICONIX vs Flujo del Código Fuente

| Rol BCE | Componente en Diagrama UML | Elemento en Código Fuente | Métodos / Operaciones Invocadas | Responsabilidad en el Flujo |
| :--- | :--- | :--- | :--- | :--- |
| **Actor** | `Cajero` | Personal POS | Búsqueda en contingencia sin red | Consulta precios y prendas estando desconectado de Internet. |
| **Boundary** | `:CatalogPageComponent` | [`catalog.page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/catalog/catalog.page.component.ts) | `navegarCatalogo()`, `search()`, `renderizarCatalogoOffline()` | Renderiza la interfaz de catálogo con indicador visual "Modo Offline". |
| **Controller** | `:NetworkStatusService` | [`network-status.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/services/network-status.service.ts) | `effectiveOnline()` | Detecta el estado de conectividad (`navigator.onLine` y ping de socket). |
| **Controller** | `:IdbCatalogService` | [`idb-catalog.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/offline/idb-catalog.service.ts) | `loadFromIndexedDb()`, `filterInMemory()` | Realiza el filtrado y paginación en memoria sobre el almacén local. |
| **Entity** | `:IdbProductStore` | ObjectStore IndexedDB (`catalog_products`) | `getAll()` | Registros de prendas almacenados localmente en el dispositivo. |
| **Entity** | `:IdbMetaStore` | ObjectStore IndexedDB (`sync_meta`) | `getSyncMeta()` | Metadatos de la última versión del catálogo descargada. |

### 3. Previsualización del Diagrama de Secuencia (Mermaid UML)

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as :Cajero
    participant UI_Page as :CatalogPageComponent
    participant Ctrl_Net as :NetworkStatusService
    participant Ctrl_Idb as :IdbCatalogService
    participant Ent_Prod as :IdbProductStore
    participant Ent_Meta as :IdbMetaStore

    %% FASE 1: Detección Offline y Consulta a IndexedDB
    Cashier->>UI_Page: navegarCatalogo()
    UI_Page->>UI_Page: search()
    UI_Page->>Ctrl_Net: effectiveOnline()
    Ctrl_Net-->>UI_Page: returnFalse()
    UI_Page->>Ctrl_Idb: loadFromIndexedDb()
    Ctrl_Idb->>Ctrl_Idb: filterInMemory()
    Ctrl_Idb->>Ent_Prod: getAll()
    Ctrl_Idb->>Ent_Meta: getSyncMeta()

    alt Almacén local con datos: Renderizado Offline
        Ctrl_Idb-->>UI_Page: setProducts()
        UI_Page-->>Cashier: renderizarCatalogoOffline()
    else Almacén local vacío
        Ctrl_Idb-->>UI_Page: returnEmpty()
        UI_Page-->>Cashier: mostrarAlertaSinDatosOffline()
    end
```

---

## CU10: Crear Reserva Online de Prendas con Vencimiento y Bloqueo

### 1. Ficha Técnica y Scripts Enterprise Architect
- **Script Secuencia (JScript):** [`docsUML/CUSecuencia/CU10_secuencia_crear_reserva_online_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUSecuencia/CU10_secuencia_crear_reserva_online_EA.js)
- **Script Robustez / Comunicación (JScript):** [`docsUML/CUrobustez/CU10_comm_crear_reserva_online_EA.js`](file:///c:/Users/PERSONAL/ecommerce-SI2/docsUML/CUrobustez/CU10_comm_crear_reserva_online_EA.js)
- **Alcance Arquitectónico:** Frontend Angular (`frontend/`) + Backend FastAPI (`p4_gestion_compras_reservas`).

### 2. Tabla Comparativa: Componentes ICONIX vs Flujo del Código Fuente

| Rol BCE | Componente en Diagrama UML | Elemento en Código Fuente | Métodos / Operaciones Invocadas | Responsabilidad en el Flujo |
| :--- | :--- | :--- | :--- | :--- |
| **Actor** | `Cliente` | Usuario Comprador | Interfaz de reservas online | Reserva prendas para probador físico en sucursal con vigencia de 24h-48h. |
| **Boundary** | `:ReservationsPageComponent` | [`reservations.page.component.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/features/reservations/reservations.page.component.ts) | `navegarReservas()`, `solicitarReservaPrenda()`, `mostrarComprobanteReserva()` | Vista de reservas activas y formulario de apartado con selector de sucursal. |
| **Boundary** | `:ReservationApiService` | [`reservation-api.service.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/app/core/services/reservation-api.service.ts) | `listMyReservations()`, `createReservation()` | Cliente HTTP para interactuar con los endpoints de reservas. |
| **Controller** | `:ReservationRoutes` | [`reservation_routes.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p4_gestion_compras_reservas/routes/reservation_routes.py) | `list_reservations_route()`, `create_reservation_route()` | Endpoints GET `/reservations/me` y POST `/reservations/`. |
| **Controller** | `:ReservationService` | [`reservation_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p4_gestion_compras_reservas/services/reservation_service.py) | `create_reservation()`, `expire_due_reservations()`, `validarRangoFechaVisita()`, `validarStockDisponible()` | Lógica central: limpia vencidas, valida fecha (<=7 días), bloquea stock en percha. |
| **Entity** | `:Reservation` | [`reservation.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p4_gestion_compras_reservas/models/reservation.py) | `query()`, `create()` | Cabecera de la reserva con código, `expires_at` y estado `pending`. |
| **Entity** | `:ReservationItem` | [`reservation_item.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p4_gestion_compras_reservas/models/reservation_item.py) | `create()` | Detalle de variantes y cantidades reservadas. |
| **Entity** | `:Inventory` | [`inventory.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p3_gestion_inventario_disponibilidad/models/inventory.py) | `_get_inventory_for_update()`, `incrementarReservedQuantity()` | Incremento transaccional de `reserved_quantity` con bloqueo FOR UPDATE. |
| **Entity** | `:Branch` | [`branch.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/models/branch.py) | `query()` | Validación de sucursal de destino activa. |

### 3. Previsualización del Diagrama de Secuencia (Mermaid UML)

```mermaid
sequenceDiagram
    autonumber
    actor User as :Cliente
    participant UI_Page as :ReservationsPageComponent
    participant UI_Api as :ReservationApiService
    participant Ctrl_Routes as :ReservationRoutes
    participant Ctrl_Svc as :ReservationService
    participant Ent_Res as :Reservation
    participant Ent_Item as :ReservationItem
    participant Ent_Inv as :Inventory
    participant Ent_Branch as :Branch

    %% FASE 1: Consulta de Reservas Propias y Barrido de Vencidas
    User->>UI_Page: navegarReservas()
    UI_Page->>UI_Api: listMyReservations()
    UI_Api->>Ctrl_Routes: list_reservations_route()
    Ctrl_Routes->>Ctrl_Svc: list_reservations_for_user()
    Ctrl_Svc->>Ctrl_Svc: expire_due_reservations()
    Ctrl_Svc->>Ent_Res: query()
    Ctrl_Svc-->>Ctrl_Routes: response()
    Ctrl_Routes-->>UI_Api: response()
    UI_Api-->>UI_Page: setReservations()
    UI_Page-->>User: renderizarListaReservas()

    %% FASE 2: Creación de Reserva y Bloqueo de Stock
    User->>UI_Page: solicitarReservaPrenda()
    UI_Page->>UI_Api: createReservation()
    UI_Api->>Ctrl_Routes: create_reservation_route()
    Ctrl_Routes->>Ctrl_Svc: create_reservation()
    Ctrl_Svc->>Ctrl_Svc: expire_due_reservations()
    Ctrl_Svc->>Ctrl_Svc: validarRangoFechaVisita()
    Ctrl_Svc->>Ent_Branch: query()
    Ctrl_Svc->>Ent_Inv: _get_inventory_for_update()
    Ctrl_Svc->>Ctrl_Svc: validarStockDisponible()

    alt Stock disponible y fecha válida: Reserva Creada
        Ctrl_Svc->>Ent_Res: create()
        Ctrl_Svc->>Ent_Item: create()
        Ctrl_Svc->>Ent_Inv: incrementarReservedQuantity()
        Ctrl_Svc-->>Ctrl_Routes: response()
        Ctrl_Routes-->>UI_Api: 201 Created (reservation)
        UI_Api-->>UI_Page: response()
        UI_Page-->>User: mostrarComprobanteReserva()
    else Stock insuficiente o fecha fuera de rango (400)
        Ctrl_Svc-->>Ctrl_Routes: raise_http_exception()
        Ctrl_Routes-->>UI_Api: 400 Bad Request
        UI_Api-->>UI_Page: showError()
        UI_Page-->>User: showErrorToast()
    end
```
