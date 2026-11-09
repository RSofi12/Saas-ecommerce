/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU23 - Predecir Demanda de Ropa por Talla (ML Supervisado - RandomForestRegressor)
 * DESCRIPCION: Permite a los Administradores de Boutique proyectar la demanda semanal cuantitativa
 *              de prendas textiles desglosada por talla (S, M, L, XL), contrastándola contra
 *              las existencias físicas en percha de la sucursal para generar alertas de
 *              reabastecimiento e intervalos de confianza estadística al 95%.
 *
 * ACTORES: AdministradorTenant (Administrador de la Boutique)
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
 *     * alt [Plan con IA Activa (PRO/Empresarial) / Plan Básico (HTTP 403 Forbidden)]
 *     * loop [Por cada variante de talla S, M, L, XL]
 *     * opt [Re-entrenamiento de Modelo con Dataset Sintético de CU22]
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU23 - Secuencia Prediccion Demanda por Talla";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU23-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
    log("Iniciando construcción de Diagrama de Secuencia CU23 (RandomForest)...");

    var pkg = getTargetPackage();
    if (pkg == null) return;

    var diagram = recreateDiagram(pkg);

    // 1. Participantes con Recuadros Rectangulares (:NombreComponente y estereotipos)
    var actorAdmin      = addActorParticipant(pkg, diagram, "AdministradorTenant", 30, 80);
    var uiForecast      = addParticipant(pkg, diagram, ":AdminDemandForecastPageComponent", "Interface",  140, 180);
    var apiService      = addParticipant(pkg, diagram, ":DemandForecastApiService",        "Interface",  350, 150);
    var ctrlRoutes      = addParticipant(pkg, diagram, ":DemandForecastRoutes",            "Controller", 530, 140);
    var ctrlML          = addParticipant(pkg, diagram, ":DemandForecastingService",        "Controller", 700, 160);
    var modRF           = addParticipant(pkg, diagram, ":RandomForestRegressorModel",      "Controller", 890, 160);

    var entPlan         = addEntityParticipant(pkg, diagram, ":Plan",             1080, 80);
    var entCatalog      = addEntityParticipant(pkg, diagram, ":ProductVariant",     1190, 100);
    var entInventory    = addEntityParticipant(pkg, diagram, ":Inventory",          1320, 90);
    var entForecast     = addEntityParticipant(pkg, diagram, ":DemandForecast",     1440, 110);
    var entMLModel      = addEntityParticipant(pkg, diagram, ":MLModel",            1580, 90);

    var seq = 1;

    // Fase 1: Interacción de Usuario y Solicitud de Inferencia
    addMessage(actorAdmin, uiForecast, "1: accederModuloPrediccion()", false, seq++);
    addMessage(actorAdmin, uiForecast, "2: seleccionarPrendaYSucursal()", false, seq++);
    addMessage(actorAdmin, uiForecast, "3: solicitarPrediccionDemanda()", false, seq++);
    addMessage(uiForecast, apiService, "3.1: getForecast()", false, seq++);
    addMessage(apiService, ctrlRoutes, "3.2: POST_forecast()", false, seq++);

    // Fase 2: Validación de Permisos y Acceso a IA (Fragmento ALT 1)
    addMessage(ctrlRoutes, ctrlRoutes, "3.3: validarPermisosAdministrador()", false, seq++);
    addMessage(ctrlRoutes, ctrlML, "3.4: predict_demand_by_size()", false, seq++);

    // DECLARACIÓN FORMAL FRAGMENTO ALT: Plan IA vs Plan Básico
    addCombinedFragment(pkg, diagram, "alt", "alt [Plan Pro/Enterprise (IA Activa)] / [Plan Basico (HTTP 403)]", 500, 1180, -320, -450);
    addMessage(ctrlML, ctrlML, "3.5: validate_ai_access()", false, seq++);
    addMessage(ctrlML, entPlan, "3.6: checkSubscriptionTier()", false, seq++);
    addMessage(entPlan, ctrlML, "3.7: returnSubscriptionDetails()", true, seq++);
    addMessage(ctrlML, ctrlRoutes, "3.8: raiseForbiddenException()", true, seq++);

    // Fase 3: Consulta de Variantes e Inventario Físico
    addMessage(ctrlML, entCatalog, "3.9: getVariantsBySize()", false, seq++);
    addMessage(entCatalog, ctrlML, "3.10: returnVariantList()", true, seq++);
    addMessage(ctrlML, entInventory, "3.11: getCurrentStockPerBranch()", false, seq++);
    addMessage(entInventory, ctrlML, "3.12: returnCurrentStock()", true, seq++);

    // Fase 4: Opcional - Re-entrenamiento con Dataset Sintético CU22 (Fragmento OPT)
    addCombinedFragment(pkg, diagram, "opt", "opt [Re-entrenamiento con Dataset Sintetico CU22]", 680, 1700, -560, -700);
    addMessage(ctrlML, entMLModel, "3.13: getSyntheticDatasetReference()", false, seq++);
    addMessage(entMLModel, ctrlML, "3.14: returnDatasetMatrix()", true, seq++);
    addMessage(ctrlML, modRF, "3.15: fitRandomForestRegressor()", false, seq++);
    addMessage(modRF, ctrlML, "3.16: returnTrainedModelMetrics()", true, seq++);

    // Fase 5: Inferencia por Talla e Intervalos de Confianza (Fragmento LOOP)
    addCombinedFragment(pkg, diagram, "loop", "loop [Por cada variante de talla S, M, L, XL a 4 semanas]", 680, 1070, -730, -890);
    addMessage(ctrlML, modRF, "3.17: predictWeeklyDemand()", false, seq++);
    addMessage(modRF, ctrlML, "3.18: returnPredictedValues()", true, seq++);
    addMessage(ctrlML, ctrlML, "3.19: calcularIntervaloConfianza95()", false, seq++);
    addMessage(ctrlML, ctrlML, "3.20: evaluarAlertaQuiebreStock()", false, seq++);

    // Fase 6: Persistencia de Pronósticos y Retorno
    addMessage(ctrlML, entForecast, "3.21: persistirPronosticos()", false, seq++);
    addMessage(entForecast, ctrlML, "3.22: returnSavedForecasts()", true, seq++);
    addMessage(ctrlML, ctrlRoutes, "3.23: returnForecastResponse()", true, seq++);
    addMessage(ctrlRoutes, apiService, "3.24: returnJsonSuccess()", true, seq++);
    addMessage(apiService, uiForecast, "3.25: returnObservableData()", true, seq++);
    addMessage(uiForecast, actorAdmin, "4: renderizarCurvasDemandaYAlertas()", false, seq++);

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch (e) { }

    log("Diagrama de Secuencia '" + DIAGRAM_NAME + "' generado exitosamente con recuadros rectangulares.");
    try { Session.Prompt("¡Diagrama de Secuencia CU23 generado con recuadros rectangulares!", 0); } catch (e) { }
}

Main();
