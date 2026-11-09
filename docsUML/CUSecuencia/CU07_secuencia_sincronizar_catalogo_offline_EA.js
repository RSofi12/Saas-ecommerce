/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU07 - Sincronizar y Descargar Catálogo a Almacenamiento Local (PWA / SQLite)
 * ACTOR: Cajero
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU07 - Sincronizar y Descargar Catálogo a Almacenamiento Local";

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
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-1800;", "");
    dObj.ElementID = el.ElementID;
    dObj.Update();
    return el;
}

function addParticipant(pkg, diagram, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) el.Stereotype = stereotype;
    el.Update();
    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-1700;", "");
    dObj.ElementID = el.ElementID;
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

function Main() {
    var pkg = getTargetPackage();
    if (pkg == null) return;
    var diag = recreateDiagram(pkg);

    var act = addActorParticipant(pkg, diag, "Cajero", 30, 90);
    var bndPage = addParticipant(pkg, diag, "CatalogPageComponent", "boundary", 150, 130);
    var bndApi = addParticipant(pkg, diag, "CatalogApiService", "boundary", 300, 110);
    var bndIdb = addParticipant(pkg, diag, "IdbCatalogService", "boundary", 430, 110);
    var ctrlRoutes = addParticipant(pkg, diag, "CatalogRoutes", "control", 560, 100);
    var ctrlSvc = addParticipant(pkg, diag, "CatalogService", "control", 680, 100);
    var entCache = addParticipant(pkg, diag, "CatalogCache", "entity", 800, 90);
    var entProd = addParticipant(pkg, diag, "Product", "entity", 910, 80);
    var entVar = addParticipant(pkg, diag, "ProductVariant", "entity", 1010, 90);
    var entIdb = addParticipant(pkg, diag, "IdbCatalogStore", "entity", 1120, 100);

    var seq = 1;

    // Secuencia 1: Sincronización Exitosa del Paquete de Catálogo Offline
    addMessage(act, bndPage, "solicitarSincronizacionOffline()", false, seq++);
    addMessage(bndPage, bndPage, "downloadOfflineCatalog()", false, seq++);
    addMessage(bndPage, bndApi, "getOfflineCatalogPack()", false, seq++);
    addMessage(bndApi, ctrlRoutes, "get_offline_catalog_pack_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "list_public_products()", false, seq++);
    addMessage(ctrlSvc, entProd, "query()", false, seq++);
    addMessage(ctrlSvc, entVar, "query()", false, seq++);
    addMessage(ctrlRoutes, entCache, "commit()", false, seq++);
    addMessage(ctrlRoutes, bndApi, "response()", true, seq++);
    addMessage(bndApi, bndPage, "response()", true, seq++);
    addMessage(bndPage, bndIdb, "saveOfflinePack()", false, seq++);
    addMessage(bndIdb, entIdb, "clearAndPutProducts()", false, seq++);
    addMessage(bndIdb, entIdb, "putSyncMeta()", false, seq++);
    addMessage(bndPage, act, "mostrarToastSincronizado()", false, seq++);

    // Secuencia 2: Flujo Alternativo A1 - Falla de Red
    addMessage(act, bndPage, "solicitarSincronizacionOffline()", false, seq++);
    addMessage(bndPage, bndApi, "getOfflineCatalogPack()", false, seq++);
    addMessage(bndApi, bndPage, "network_error()", true, seq++);
    addMessage(bndPage, bndIdb, "rollbackTransaction()", false, seq++);
    addMessage(bndPage, act, "showErrorToast()", false, seq++);

    diag.Update();
    log("Diagrama de Secuencia CU07 generado.");
}

Main();
