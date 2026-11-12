/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU07 - Sincronizar y Descargar Catálogo a Almacenamiento Local (PWA / SQLite)
 * ACTOR: Cajero (Actor Principal)
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU07 - Secuencia Sincronizar y Descargar Catálogo a Almacenamiento Local";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU07-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
}

function getTargetPackage() {
    if (Repo == null) return null;
    var selectedPkg = Repo.GetTreeSelectedPackage();
    if (selectedPkg != null) return selectedPkg;
    var roots = Repo.Models;
    var root = (roots.Count > 0) ? roots.GetAt(0) : null;
    if (root == null) return null;
    for (var i = 0; i < root.Packages.Count; i++) {
        var p = root.Packages.GetAt(i);
        if (p.Name == DEFAULT_PACKAGE_NAME) return p;
    }
    var newPkg = root.Packages.AddNew(DEFAULT_PACKAGE_NAME, "Package");
    newPkg.Update();
    root.Packages.Refresh();
    return newPkg;
}

function recreateDiagram(pkg) {
    for (var i = pkg.Diagrams.Count - 1; i >= 0; i--) {
        var d = pkg.Diagrams.GetAt(i);
        if (d.Name == DIAGRAM_NAME) {
            pkg.Diagrams.Delete(i);
            pkg.Diagrams.Refresh();
            break;
        }
    }
    var diagram = pkg.Diagrams.AddNew(DIAGRAM_NAME, "Sequence");
    diagram.Update();
    pkg.Diagrams.Refresh();
    return diagram;
}

function addActorParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Actor");
    el.Update();
    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-1900;", "");
    dObj.ElementID = el.ElementID;
    dObj.Update();
    return el;
}

function addParticipant(pkg, diagram, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) el.Stereotype = stereotype;
    el.Update();
    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-1850;", "");
    dObj.ElementID = el.ElementID;
    // usecustomart=0 y HideIcon=1 para asegurar rectángulos estándar según directriz /uml-academic-diagrams
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

function addMessage(src, dst, label, isReturn, sequenceNo) {
    var con = src.Connectors.AddNew(label, "Sequence");
    con.SupplierID = dst.ElementID;
    if (isReturn) con.Stereotype = "return";
    if (sequenceNo) {
        try { con.SequenceNo = sequenceNo; } catch (e) { }
    }
    con.Update();
    return con;
}

function addCombinedFragment(pkg, diagram, type, guardLabel, left, right, top, bottom) {
    try {
        var frag = pkg.Elements.AddNew(guardLabel, "InteractionFragment");
        frag.Stereotype = type;
        frag.Update();

        var dObj = diagram.DiagramObjects.AddNew("l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";", "");
        dObj.ElementID = frag.ElementID;
        dObj.Update();
        return frag;
    } catch (err) {
        log("Nota al crear fragmento (" + type + "): " + err.message);
        return null;
    }
}

function stretchLifeline(diagram, element, bottomY) {
    for (var i = 0; i < diagram.DiagramObjects.Count; i++) {
        var dObj = diagram.DiagramObjects.GetAt(i);
        if (dObj.ElementID == element.ElementID) {
            dObj.Bottom = bottomY || -2200;
            dObj.Update();
            return;
        }
    }
}

function Main() {
    var pkg = getTargetPackage();
    if (pkg == null) return;
    var diag = recreateDiagram(pkg);

    // 1. Participantes BCE (Coincidentes con Robustez CU07)
    var act = addActorParticipant(pkg, diag, "Cajero", 30, 80);
    var bndPage = addParticipant(pkg, diag, "CatalogPageComponent", "boundary", 140, 130);
    var bndApi = addParticipant(pkg, diag, "CatalogApiService", "boundary", 290, 110);
    var bndIdb = addParticipant(pkg, diag, "IdbCatalogService", "boundary", 420, 110);
    var ctrlRoutes = addParticipant(pkg, diag, "CatalogRoutes", "control", 550, 100);
    var ctrlSvc = addParticipant(pkg, diag, "CatalogService", "control", 670, 100);
    var entCache = addParticipant(pkg, diag, "CatalogCache", "entity", 790, 85);
    var entProd = addParticipant(pkg, diag, "Product", "entity", 895, 80);
    var entVar = addParticipant(pkg, diag, "ProductVariant", "entity", 995, 90);
    var entIdb = addParticipant(pkg, diag, "IdbCatalogStore", "entity", 1105, 95);

    pkg.Elements.Refresh();
    diag.DiagramObjects.Refresh();

    var seq = 1;

    // FASE 1: Solicitud e Inicio de Descarga
    addMessage(act, bndPage, "1: solicitarSincronizacionOffline()", false, seq++);
    addMessage(bndPage, bndPage, "1.1: downloadOfflineCatalog()", false, seq++);
    addMessage(bndPage, bndApi, "1.2: getOfflineCatalogPack()", false, seq++);
    addMessage(bndApi, ctrlRoutes, "1.3: get_offline_catalog_pack_route()", false, seq++);

    // FRAGMENTO COMBINADO ALT: [Red Disponible: Sincronización Exitosa vs Falla de Conexión]
    addCombinedFragment(pkg, diag, "alt", "[Red disponible: Sincronización Exitosa]", 400, 1220, -420, -1180);

    // Rama Exitosa: Backend empaqueta y Frontend persiste atómicamente en IndexedDB
    addMessage(ctrlRoutes, ctrlSvc, "1.4a: list_public_products()", false, seq++);
    addMessage(ctrlSvc, entProd, "1.5a: query()", false, seq++);
    addMessage(ctrlSvc, entVar, "1.6a: query()", false, seq++);
    addMessage(ctrlRoutes, entCache, "1.7a: commit()", false, seq++);
    addMessage(ctrlRoutes, bndApi, "1.8a: response()", true, seq++);
    addMessage(bndApi, bndPage, "1.9a: response()", true, seq++);
    addMessage(bndPage, bndIdb, "1.10a: saveOfflinePack()", false, seq++);
    addMessage(bndIdb, entIdb, "1.11a: clearAndPutProducts()", false, seq++);
    addMessage(bndIdb, entIdb, "1.12a: putSyncMeta()", false, seq++);
    addMessage(bndIdb, bndPage, "1.13a: response()", true, seq++);
    addMessage(bndPage, act, "1.14a: mostrarToastSincronizado()", false, seq++);

    // Rama Alternativa: Falla de Conexión de Red
    addCombinedFragment(pkg, diag, "alt", "[else: Falla de conexión de red (NetworkError)]", 270, 560, -1220, -1580);
    addMessage(bndApi, bndPage, "1.4b: network_error()", true, seq++);
    addMessage(bndPage, bndIdb, "1.5b: rollbackTransaction()", false, seq++);
    addMessage(bndPage, act, "1.6b: showErrorToast()", false, seq++);

    // Extender líneas de vida uniformemente
    stretchLifeline(diag, act, -1850);
    stretchLifeline(diag, bndPage, -1850);
    stretchLifeline(diag, bndApi, -1850);
    stretchLifeline(diag, bndIdb, -1850);
    stretchLifeline(diag, ctrlRoutes, -1850);
    stretchLifeline(diag, ctrlSvc, -1850);
    stretchLifeline(diag, entCache, -1850);
    stretchLifeline(diag, entProd, -1850);
    stretchLifeline(diag, entVar, -1850);
    stretchLifeline(diag, entIdb, -1850);

    diag.Update();
    Repo.SaveDiagram(diag.DiagramID);
    Repo.ReloadDiagram(diag.DiagramID);
    try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }

    log("¡Diagrama de Secuencia CU07 actualizado exitosamente en Enterprise Architect!");
}

Main();
