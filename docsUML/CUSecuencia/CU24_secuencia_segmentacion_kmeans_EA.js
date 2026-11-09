/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU24 - Segmentar Clientes con K-Means (ML No Supervisado)
 * DESCRIPCION: Agrupa la base de clientes de la boutique mediante clustering K-Means (k=4)
 *              utilizando vectores RFM+D (Recencia, Frecuencia, Valor Monetario y Devoluciones).
 *              Incluye fallback automático a dataset sintético (CU22) en caso de arranque
 *              en frío (cold start < 10 clientes), evaluación de Silhouette Score y cálculo
 *              de coordenadas 2D para renderizado de gráfico de dispersión en el frontend.
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
 *     * alt [Plan con IA Activa (PRO/Enterprise) / Plan Básico (HTTP 403 Forbidden)]
 *     * alt [Volumen Real Suficiente (>=10 clientes) / Cold Start Fallback (Dataset Sintético CU22)]
 *     * loop [Por cada Cluster 0..3: asignación de perfil VIP, Temporada, Ofertas, Riesgo]
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU24 - Secuencia Segmentacion Clientes KMeans";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU24-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
    log("Iniciando generación de Diagrama de Secuencia CU24 con arquitectura BCE pura...");

    var pkg = getTargetPackage();
    if (pkg == null) return;

    var diagram = recreateDiagram(pkg);

    // 1. Participantes con Recuadros Rectangulares (:NombreComponente y estereotipos)
    var actorAdmin      = addActorParticipant(pkg, diagram, "AdministradorTenant", 30, 80);
    var uiClusterPage   = addParticipant(pkg, diagram, ":AdminMlSegmentationPageComponent", "Interface",  140, 180);
    var uiClusterApi    = addParticipant(pkg, diagram, ":CustomerSegmentationApiService",  "Interface",  350, 160);
    var ctrlRoutes      = addParticipant(pkg, diagram, ":CustomerSegmentationRoutes",      "Controller", 540, 150);
    var ctrlService     = addParticipant(pkg, diagram, ":CustomerSegmentationService",     "Controller", 720, 160);

    var entPlan         = addEntityParticipant(pkg, diagram, ":Plan",             910, 80);
    var entUser         = addEntityParticipant(pkg, diagram, ":User",             1010, 80);
    var entSale         = addEntityParticipant(pkg, diagram, ":Sale",             1110, 80);
    var entReturn       = addEntityParticipant(pkg, diagram, ":GarmentReturn",     1210, 100);
    var entDataset      = addEntityParticipant(pkg, diagram, ":SyntheticDataset", 1330, 110);
    var entSegment      = addEntityParticipant(pkg, diagram, ":CustomerSegment",  1460, 110);
    var entMlModel      = addEntityParticipant(pkg, diagram, ":MLModel",          1590, 90);

    var seq = 1;

    // Fase 1: Interacción de Usuario y Solicitud de Clustering
    addMessage(actorAdmin, uiClusterPage, "1: accederModuloSegmentacion()", false, seq++);
    addMessage(actorAdmin, uiClusterPage, "2: solicitarSegmentacionClientes()", false, seq++);
    addMessage(uiClusterPage, uiClusterApi, "2.1: trainCustomerClusters()", false, seq++);
    addMessage(uiClusterApi, ctrlRoutes, "2.2: POST_train_clusters()", false, seq++);

    // Fase 2: Validación de Permisos y Acceso a IA (Fragmento ALT 1)
    addMessage(ctrlRoutes, ctrlRoutes, "2.3: validarPermisosAdministrador()", false, seq++);
    addMessage(ctrlRoutes, ctrlService, "2.4: train_and_segment_customers()", false, seq++);

    // DECLARACIÓN FORMAL FRAGMENTO ALT: Plan IA vs Plan Básico
    addCombinedFragment(pkg, diagram, "alt", "alt [Plan Pro/Enterprise (IA Activa)] / [Plan Basico (HTTP 403)]", 520, 990, -290, -420);
    addMessage(ctrlService, ctrlService, "2.5: validate_ai_access()", false, seq++);
    addMessage(ctrlService, entPlan, "2.6: checkSubscriptionTier()", false, seq++);
    addMessage(entPlan, ctrlService, "2.7: returnSubscriptionDetails()", true, seq++);
    addMessage(ctrlService, ctrlRoutes, "2.8: raiseForbiddenException()", true, seq++);

    // Fase 3: Extracción RFM+D y Detección de Cold Start (Fragmento ALT 2)
    addCombinedFragment(pkg, diagram, "alt", "alt [Clientes Reales >= 10] / [Cold Start Fallback (Dataset CU22)]", 700, 1440, -450, -620);
    addMessage(ctrlService, entUser, "2.9: getTenantCustomers()", false, seq++);
    addMessage(entUser, ctrlService, "2.10: returnCustomerList()", true, seq++);
    addMessage(ctrlService, entSale, "2.11: getCustomerSalesHistory()", false, seq++);
    addMessage(entSale, ctrlService, "2.12: returnSalesList()", true, seq++);
    addMessage(ctrlService, entReturn, "2.13: getCustomerReturnsHistory()", false, seq++);
    addMessage(entReturn, ctrlService, "2.14: returnReturnsList()", true, seq++);
    addMessage(ctrlService, ctrlService, "2.15: construirMatrizRfmD()", false, seq++);
    addMessage(ctrlService, ctrlService, "2.16: verificarVolumenClientesMinimo()", false, seq++);
    addMessage(ctrlService, entDataset, "2.17: cargarDatasetSinteticoFallback()", false, seq++);
    addMessage(entDataset, ctrlService, "2.18: returnSyntheticFeatures()", true, seq++);

    // Fase 4: Normalización, Algoritmo K-Means y Asignación de Perfiles (Fragmento LOOP)
    addMessage(ctrlService, ctrlService, "2.19: escalarMatrizCaracteristicas()", false, seq++);
    addMessage(ctrlService, ctrlService, "2.20: entrenarKMeansClustering()", false, seq++);
    addMessage(ctrlService, ctrlService, "2.21: calcularIndiceSiluetaEInercia()", false, seq++);

    addCombinedFragment(pkg, diagram, "loop", "loop [Por cada Cluster 0..3: VIP, Temporada, Ofertas, Riesgo]", 700, 890, -780, -890);
    addMessage(ctrlService, ctrlService, "2.22: interpretarPerfilesCentroides()", false, seq++);
    addMessage(ctrlService, ctrlService, "2.23: proyectarCoordenadas2DScatter()", false, seq++);

    // Fase 5: Persistencia de Modelo y Segmentos en Base de Datos
    addMessage(ctrlService, entMlModel, "2.24: persistirModeloCentroides()", false, seq++);
    addMessage(ctrlService, entSegment, "2.25: persistirSegmentosClientes()", false, seq++);
    addMessage(entSegment, ctrlService, "2.26: returnSegmentsSaved()", true, seq++);

    // Fase 6: Retorno de Resultados y Visualización en Frontend
    addMessage(ctrlService, ctrlRoutes, "2.27: returnClusterResults()", true, seq++);
    addMessage(ctrlRoutes, uiClusterApi, "2.28: returnJsonSuccess()", true, seq++);
    addMessage(uiClusterApi, uiClusterPage, "2.29: returnObservableResult()", true, seq++);
    addMessage(uiClusterPage, actorAdmin, "3: renderizarGraficoScatterYPerfiles()", false, seq++);

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch (e) { }

    log("Diagrama de Secuencia '" + DIAGRAM_NAME + "' generado exitosamente con recuadros rectangulares.");
    try { Session.Prompt("¡Diagrama de Secuencia CU24 generado con recuadros rectangulares!", 0); } catch (e) { }
}

Main();
