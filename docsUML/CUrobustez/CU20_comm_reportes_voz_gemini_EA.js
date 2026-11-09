// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU20 - Generar Reportes Ejecutivos por Voz y Lenguaje Natural (Gemini RAG)
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX / BCE):
//   Actor: AdministradorTenant
//   Boundary: ReportsPageComponent, VoiceAssistantModalComponent, WebSpeechAPI_Recognition, WebSpeechAPI_Synthesis (Object, «boundary»)
//   Control: VoiceReportRoutes, GeminiRagService, Google_GeminiClient (Object, «control»)
//   Entity: Plan, Sale, Inventory, GarmentReturn, VoiceReportResponse (Object, «entity»)
//
// Reglas Metodológicas Estrictas:
//   - Todas las funciones se expresan con paréntesis vacíos () sin parámetros internos.
//   - Cero bucles o validaciones sobre Fronteras (las validaciones residen en Controllers).
//   - Mensajes mediante con.Name en conectores tipo Association con Direction = "Source -> Destination".
//   - Compatible 100% con Enterprise Architect v15 (evita excepciones de link.Messages).
// ============================================================================

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function Log(msg) {
    try { Session.Output("[FashionStore-EA] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
}

function crearElementoConEsterotipo(pkg, name, tipo, estereotipo) {
    for (var i = 0; i < pkg.Elements.Count; i++) {
        var el = pkg.Elements.GetAt(i);
        if (el.Name == name && el.Type == tipo) {
            if (estereotipo && el.Stereotype != estereotipo) {
                el.Stereotype = estereotipo;
                el.Update();
            }
            return el;
        }
    }
    var newEl = pkg.Elements.AddNew(name, tipo);
    if (estereotipo && estereotipo.length > 0) {
        newEl.Stereotype = estereotipo;
    }
    newEl.Update();
    pkg.Elements.Refresh();
    return newEl;
}

function crearDiagramaLimpio(pkg, name, tipo) {
    for (var i = pkg.Diagrams.Count - 1; i >= 0; i--) {
        var d = pkg.Diagrams.GetAt(i);
        if (d.Name == name) {
            for (var j = d.DiagramObjects.Count - 1; j >= 0; j--) {
                d.DiagramObjects.Delete(j);
            }
            for (var k = d.DiagramLinks.Count - 1; k >= 0; k--) {
                d.DiagramLinks.Delete(k);
            }
            d.Update();
            return d;
        }
    }
    var newDiag = pkg.Diagrams.AddNew(name, tipo);
    newDiag.Update();
    pkg.Diagrams.Refresh();
    return newDiag;
}

function colocarElemento(diagram, elemento, left, right, top, bottom) {
    var diagObj = diagram.DiagramObjects.AddNew("l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";", "");
    diagObj.ElementID = elemento.ElementID;
    diagObj.Update();
    return diagObj;
}

function crearMensaje(origen, destino, texto) {
    var con = origen.Connectors.AddNew(texto, "Association");
    con.SupplierID = destino.ElementID;
    con.Name = texto;
    con.Direction = "Source -> Destination";
    con.Update();
    origen.Connectors.Refresh();
    return con;
}

function Main() {
    Log("====================================================================");
    Log("Construyendo Diagrama de Comunicación/Robustez CU20 (Gemini RAG)...");
    Log("====================================================================");

    if (Repo == null) {
        Log("ERROR: Repository de Enterprise Architect no está disponible.");
        return;
    }

    var selectedPkg = Repo.GetTreeSelectedPackage();
    if (selectedPkg == null) {
        var models = Repo.Models;
        if (models.Count > 0) {
            var root = models.GetAt(0);
            for (var p = 0; p < root.Packages.Count; p++) {
                if (root.Packages.GetAt(p).Name == "CUrobustez" || root.Packages.GetAt(p).Name == "Robustez") {
                    selectedPkg = root.Packages.GetAt(p);
                    break;
                }
            }
            if (selectedPkg == null) selectedPkg = root.Packages.GetAt(0);
        }
    }

    if (selectedPkg == null) {
        Log("ERROR: No se encontró ni pudo obtener el paquete de destino.");
        return;
    }

    var diagName = "CU20 - Robustez Reportes Ejecutivos por Voz y Gemini RAG";
    var diag = crearDiagramaLimpio(selectedPkg, diagName, "Communication");

    // 1. Creación de Objetos según estereotipos ICONIX (BCE Pura)
    var actorAdmin   = crearElementoConEsterotipo(selectedPkg, "AdministradorTenant", "Actor", "");
    var bReports     = crearElementoConEsterotipo(selectedPkg, "ReportsPageComponent", "Object", "boundary");
    var bVoiceModal  = crearElementoConEsterotipo(selectedPkg, "VoiceAssistantModalComponent", "Object", "boundary");
    var bSpeechRec   = crearElementoConEsterotipo(selectedPkg, "WebSpeechAPI_Recognition", "Object", "boundary");
    var bSpeechSyn   = crearElementoConEsterotipo(selectedPkg, "WebSpeechAPI_Synthesis", "Object", "boundary");

    var cRoutes      = crearElementoConEsterotipo(selectedPkg, "VoiceReportRoutes", "Object", "control");
    var cRagService  = crearElementoConEsterotipo(selectedPkg, "GeminiRagService", "Object", "control");
    var cGeminiExt   = crearElementoConEsterotipo(selectedPkg, "Google_GeminiClient", "Object", "control");

    var ePlan        = crearElementoConEsterotipo(selectedPkg, "Plan", "Object", "entity");
    var eSale        = crearElementoConEsterotipo(selectedPkg, "Sale", "Object", "entity");
    var eInventory   = crearElementoConEsterotipo(selectedPkg, "Inventory", "Object", "entity");
    var eReturn      = crearElementoConEsterotipo(selectedPkg, "GarmentReturn", "Object", "entity");
    var eReportDTO   = crearElementoConEsterotipo(selectedPkg, "VoiceReportResponse", "Object", "entity");

    // 2. Disposición espacial en el lienzo (Compacto 60x60 px)
    colocarElemento(diag, actorAdmin,   50,  100,  -280, -360); // Actor 50x80
    colocarElemento(diag, bReports,     200, 260,  -140, -200); // 60x60
    colocarElemento(diag, bVoiceModal,  200, 260,  -280, -340); // 60x60
    colocarElemento(diag, bSpeechRec,   200, 260,  -420, -480); // 60x60
    colocarElemento(diag, bSpeechSyn,   200, 260,  -540, -600); // 60x60

    colocarElemento(diag, cRoutes,      420, 480,  -280, -340); // 60x60
    colocarElemento(diag, cRagService,  620, 680,  -280, -340); // 60x60
    colocarElemento(diag, cGeminiExt,   620, 680,  -420, -480); // 60x60

    colocarElemento(diag, ePlan,        840, 900,  -140, -200); // 60x60
    colocarElemento(diag, eSale,        840, 900,  -240, -300); // 60x60
    colocarElemento(diag, eInventory,   840, 900,  -340, -400); // 60x60
    colocarElemento(diag, eReturn,      840, 900,  -440, -500); // 60x60
    colocarElemento(diag, eReportDTO,   840, 900,  -540, -600); // 60x60

    // 3. Flujo de Mensajes de Comunicación BCE (con.Name)
    // Actor -> Boundary
    crearMensaje(actorAdmin, bReports,     "1: solicitarAsistenteVoz()");
    crearMensaje(bReports, bVoiceModal,    "1.1: abrirModalAsistente()");
    crearMensaje(actorAdmin, bVoiceModal,  "2: activarCapturaMicrofono()");
    crearMensaje(bVoiceModal, bSpeechRec,  "2.1: iniciarReconocimientoVoz()");
    crearMensaje(actorAdmin, bSpeechRec,   "2.2: dictarConsultaVoz()");
    crearMensaje(bSpeechRec, bVoiceModal,  "2.3: retornarTextoTranscrito()");

    // Boundary -> Control
    crearMensaje(bVoiceModal, cRoutes,     "3: enviarConsultaVoz()");
    crearMensaje(cRoutes, cRoutes,         "3.1: validarPermisosAdministrador()");
    crearMensaje(cRoutes, cRagService,     "3.2: procesarConsultaRAG()");

    // Validación de suscripción y acceso a IA en el Controller
    crearMensaje(cRagService, cRagService, "3.3: validate_ai_access()");
    crearMensaje(cRagService, ePlan,       "3.4: verificarAccesoIA()");

    // Agregación de Contexto de Dominio (Controlador -> Entidades)
    crearMensaje(cRagService, eSale,       "3.5: obtenerMetricasVentas()");
    crearMensaje(cRagService, eInventory,  "3.6: obtenerStockCritico()");
    crearMensaje(cRagService, eReturn,     "3.7: obtenerMontoRetenciones()");
    crearMensaje(cRagService, cRagService, "3.8: armarPromptEnriquecidoRAG()");

    // Inferencia con Gemini Flash y Fallback
    crearMensaje(cRagService, cGeminiExt,  "3.9: invocarGeminiFlash()");
    crearMensaje(cGeminiExt, cRagService,  "3.10: retornarRespuestaLLM()");
    crearMensaje(cRagService, cRagService, "3.11: ejecutarFallbackHeuristicoLocal()");
    crearMensaje(cRagService, eReportDTO,  "3.12: persistirConversacion()");

    // Retorno jerárquico a la interfaz y locución auditiva
    crearMensaje(cRagService, cRoutes,     "3.13: retornarReporteEjecutivo()");
    crearMensaje(cRoutes, bVoiceModal,     "3.14: returnJsonSuccess()");
    crearMensaje(bVoiceModal, bVoiceModal, "3.15: renderRespuestaVisual()");
    crearMensaje(bVoiceModal, bSpeechSyn,  "3.16: sintetizarLocucionVoz()");
    crearMensaje(bSpeechSyn, actorAdmin,   "4: locutarRespuestaAuditiva()");

    diag.Update();
    Repo.SaveDiagram(diag.DiagramID);
    Repo.ReloadDiagram(diag.DiagramID);
    try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }

    Log("====================================================================");
    Log("Diagrama de Comunicación/Robustez CU20 generado exitosamente.");
    Log("====================================================================");
    try { Session.Prompt("¡Diagrama de Robustez CU20 generado exitosamente!", 0); } catch (e) { }
}

Main();
