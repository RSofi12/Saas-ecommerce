/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU20 - Generar Reportes Ejecutivos por Voz y Lenguaje Natural (Gemini RAG)
 * DESCRIPCION: Permite a los Administradores de Tenant consultar métricas analíticas clave
 *              (ventas, ticket promedio, prendas estrella, stock crítico, devoluciones 20-50%
 *              y cambios de talla) utilizando comandos de voz capturados en el frontend PWA,
 *              procesados por un pipeline RAG multitenant respaldado por Google Gemini 2.5 Flash
 *              y locutados por síntesis de voz en el navegador.
 *
 * ACTORES: AdministradorTenant (Gerente / Administrador de la Boutique)
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 *
 * NORMAS Y PAUTAS APLICADAS (ICONIX UML 2.5+):
 * - Participantes rectangulares Sequence con nombres :NombreComponente y estereotipos
 *   «Interface», «Controller», «Entity » con dObj.Style = "usecustomart=0;HideIcon=1;".
 * - Numeración secuencial estricta (con.SequenceNo = sequenceNo) para garantizar orden vertical.
 * - Sin cruces horizontales entre entidades (comunicación exclusiva Controller -> Entity).
 * - Métodos estrictamente sin parámetros internos 'metodo()' según la convención de cátedra.
 * - Declaración formal de InteractionFragment en Enterprise Architect:
 *     * alt [Plan con IA Activa (PRO/Enterprise) / Plan Básico (HTTP 403 Sin Acceso)]
 *     * alt [Gemini API Online (200 OK) / Fallback Analítico Heurístico Local]
 *     * loop [Por cada KPI y Top Prenda en el Contexto RAG]
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU20 - Secuencia Reportes Ejecutivos por Voz y Gemini RAG";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU20-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
}

function getTargetPackage() {
    if (Repo == null) return null;
    var selectedPkg = Repo.GetTreeSelectedPackage();
    if (selectedPkg != null) {
        log("Usando paquete seleccionado en Project Browser: " + selectedPkg.Name);
        return selectedPkg;
    }

    var roots = Repo.Models;
    var root = (roots.Count > 0) ? roots.GetAt(0) : null;
    if (root == null) {
        try { Session.Prompt("No se encontro ningun modelo raiz en Enterprise Architect.", 0); } catch (e) { }
        return null;
    }

    for (var i = 0; i < root.Packages.Count; i++) {
        var pkg = root.Packages.GetAt(i);
        if (pkg.Name == DEFAULT_PACKAGE_NAME) return pkg;
    }

    var newPkg = root.Packages.AddNew(DEFAULT_PACKAGE_NAME, "Package");
    newPkg.Update();
    root.Packages.Refresh();
    log("Paquete creado: " + DEFAULT_PACKAGE_NAME);
    return newPkg;
}

function recreateDiagram(pkg) {
    for (var i = pkg.Diagrams.Count - 1; i >= 0; i--) {
        var d = pkg.Diagrams.GetAt(i);
        if (d.Name == DIAGRAM_NAME) {
            try {
                pkg.Diagrams.Delete(i);
                pkg.Diagrams.Refresh();
                log("Diagrama previo eliminado para regeneración limpia.");
            } catch (e) {
                log("Aviso al eliminar: " + e.message);
            }
            break;
        }
    }
    var diag = pkg.Diagrams.AddNew(DIAGRAM_NAME, "Sequence");
    diag.Update();
    pkg.Diagrams.Refresh();
    return diag;
}

function addActorParticipant(pkg, diag, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Actor");
    el.Update();
    pkg.Elements.Refresh();

    var rightX = leftX + width;
    var dObj = diag.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-3200;", "");
    dObj.ElementID = el.ElementID;
    dObj.Update();
    return el;
}

function addParticipant(pkg, diag, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) {
        el.Stereotype = stereotype;
    }
    el.Update();
    pkg.Elements.Refresh();

    var rightX = leftX + width;
    var dObj = diag.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-3100;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

function addEntityParticipant(pkg, diag, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    el.Stereotype = "Entity" + String.fromCharCode(160);
    el.Update();
    pkg.Elements.Refresh();

    var rightX = leftX + width;
    var dObj = diag.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-3100;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

function addCombinedFragment(pkg, diag, type, guardLabel, left, right, top, bottom) {
    try {
        var frag = pkg.Elements.AddNew(guardLabel, "InteractionFragment");
        frag.Stereotype = type;
        frag.Update();

        var dObj = diag.DiagramObjects.AddNew("l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";", "");
        dObj.ElementID = frag.ElementID;
        dObj.Update();
        return frag;
    } catch (err) {
        log("Nota al crear fragmento (" + type + "): " + err.message);
        return null;
    }
}

function addMessage(src, dst, label, isReturn, sequenceNo) {
    var con = src.Connectors.AddNew(label, "Sequence");
    con.ClientID = src.ElementID;
    con.SupplierID = dst.ElementID;
    if (isReturn) {
        con.Stereotype = "return";
    }
    if (sequenceNo) {
        try {
            con.SequenceNo = sequenceNo;
        } catch (e) { }
    }
    con.Update();
    src.Connectors.Refresh();
    return con;
}

function Main() {
    log("Iniciando construcción de Diagrama de Secuencia CU20 (Gemini RAG)...");

    var pkg = getTargetPackage();
    if (pkg == null) return;

    var diagram = recreateDiagram(pkg);

    // 1. Participantes con Recuadros Rectangulares (:NombreComponente y estereotipos)
    var actorAdmin      = addActorParticipant(pkg, diagram, "AdministradorTenant", 30, 80);
    var uiReports       = addParticipant(pkg, diagram, ":ReportsPageComponent",          "Interface",  140, 160);
    var uiVoiceModal    = addParticipant(pkg, diagram, ":VoiceAssistantModalComponent",  "Interface",  320, 170);
    var apiSpeechRec    = addParticipant(pkg, diagram, ":WebSpeechAPI_Recognition",      "Interface",  510, 160);
    var ctrlRoutes      = addParticipant(pkg, diagram, ":VoiceReportRoutes",             "Controller", 690, 140);
    var ctrlRagSvc      = addParticipant(pkg, diagram, ":GeminiRagService",              "Controller", 850, 150);
    var extGemini       = addParticipant(pkg, diagram, ":Google_GeminiClient",           "Controller", 1020, 150);
    var apiSpeechSyn    = addParticipant(pkg, diagram, ":WebSpeechAPI_Synthesis",        "Interface",  1190, 160);

    var entPlan         = addEntityParticipant(pkg, diagram, ":Plan",                  1370, 80);
    var entDbData       = addEntityParticipant(pkg, diagram, ":PostgreSQL_TenantData", 1470, 150);

    var seq = 1;

    // Fase 1: Apertura de Asistente de Voz
    addMessage(actorAdmin, uiReports, "1: clickBotonAsistenteVoz()", false, seq++);
    addMessage(uiReports, uiVoiceModal, "1.1: openModal()", false, seq++);
    addMessage(uiVoiceModal, actorAdmin, "1.2: renderInterfazEscucha()", true, seq++);

    // Fase 2: Captura y Reconocimiento de Voz
    addMessage(actorAdmin, uiVoiceModal, "2: tapBotonHablar()", false, seq++);
    addMessage(uiVoiceModal, apiSpeechRec, "2.1: startSpeechRecognition()", false, seq++);
    addMessage(actorAdmin, apiSpeechRec, "2.2: dictarConsultaVoz()", false, seq++);
    addMessage(apiSpeechRec, uiVoiceModal, "2.3: onResult()", true, seq++);
    addMessage(uiVoiceModal, uiVoiceModal, "2.4: mostrarTextoCapturado()", false, seq++);

    // Fase 3: Despacho HTTP y Validación de Suscripción a IA (Fragmento ALT 1)
    addMessage(uiVoiceModal, ctrlRoutes, "3: POST_chat_message()", false, seq++);
    addMessage(ctrlRoutes, ctrlRoutes, "3.1: validarPermisosAdministrador()", false, seq++);
    addMessage(ctrlRoutes, ctrlRagSvc, "3.2: process_rag_query()", false, seq++);

    // DECLARACIÓN FORMAL FRAGMENTO ALT: Plan IA vs Plan Básico
    addCombinedFragment(pkg, diagram, "alt", "alt [Plan Pro/Enterprise (IA Activa)] / [Plan Basico (HTTP 403)]", 670, 1470, -380, -500);
    addMessage(ctrlRagSvc, ctrlRagSvc, "3.3: validate_ai_access()", false, seq++);
    addMessage(ctrlRagSvc, entPlan, "3.4: checkSubscriptionTier()", false, seq++);
    addMessage(entPlan, ctrlRagSvc, "3.5: returnSubscriptionDetails()", true, seq++);
    addMessage(ctrlRagSvc, ctrlRoutes, "3.6: raiseForbiddenException()", true, seq++);

    // Fase 4: Extracción de Contexto Multitenant Seguro (Fragmento LOOP)
    addCombinedFragment(pkg, diagram, "loop", "loop [Por cada KPI: Ventas, Stock Critico, Devoluciones]", 830, 1640, -530, -660);
    addMessage(ctrlRagSvc, entDbData, "3.7: queryTenantMetricsSecurely()", false, seq++);
    addMessage(entDbData, ctrlRagSvc, "3.8: returnAggregateData()", true, seq++);
    addMessage(ctrlRagSvc, ctrlRagSvc, "3.9: buildGroundingContext()", false, seq++);

    // Fase 5: Inferencia LLM con Gemini o Fallback Local (Fragmento ALT 2)
    addCombinedFragment(pkg, diagram, "alt", "alt [Gemini API Online 200 OK] / [Fallback Local Heuristico]", 830, 1190, -690, -840);
    addMessage(ctrlRagSvc, extGemini, "3.10: generateContent()", false, seq++);
    addMessage(extGemini, ctrlRagSvc, "3.11: returnGeminiResponse()", true, seq++);
    addMessage(ctrlRagSvc, ctrlRagSvc, "3.12: generateLocalHeuristicFallback()", false, seq++);

    // Fase 6: Retorno de Texto y Síntesis de Voz
    addMessage(ctrlRagSvc, ctrlRoutes, "3.13: returnRagResult()", true, seq++);
    addMessage(ctrlRoutes, uiVoiceModal, "3.14: returnJsonSuccess()", true, seq++);
    addMessage(uiVoiceModal, uiVoiceModal, "3.15: renderRespuestaVisual()", false, seq++);
    addMessage(uiVoiceModal, apiSpeechSyn, "3.16: speak()", false, seq++);
    addMessage(apiSpeechSyn, actorAdmin, "4: locutarRespuestaAuditiva()", false, seq++);

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch (e) { }

    log("Diagrama de Secuencia '" + DIAGRAM_NAME + "' generado exitosamente con recuadros rectangulares.");
    try { Session.Prompt("¡Diagrama de Secuencia CU20 generado con recuadros rectangulares!", 0); } catch (e) { }
}

Main();
