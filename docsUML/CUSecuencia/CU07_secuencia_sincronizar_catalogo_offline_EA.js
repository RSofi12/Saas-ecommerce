/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU07 - Sincronizar Catálogo Offline
 * ACTOR: Cajero
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU07 - Sincronizar Catalogo Offline";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try { var eaApp = new ActiveXObject("EA.App"); Repo = eaApp.Repository; } catch (e) { }
}

function log(msg) { try { Session.Output("[CU07-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } } }

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
    newPkg.Update(); root.Packages.Refresh();
    return newPkg;
}

function recreateDiagram(pkg) {
    for (var i = pkg.Diagrams.Count - 1; i >= 0; i--) {
        var d = pkg.Diagrams.GetAt(i);
        if (d.Name == DIAGRAM_NAME) { pkg.Diagrams.Delete(i); pkg.Diagrams.Refresh(); break; }
    }
    var diagram = pkg.Diagrams.AddNew(DIAGRAM_NAME, "Sequence");
    diagram.Update(); pkg.Diagrams.Refresh();
    return diagram;
}

function addActorParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Actor");
    el.Update();
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + (leftX + width) + ";t=-20;b=-1900;", "");
    dObj.ElementID = el.ElementID; dObj.Update();
    return el;
}

function addParticipant(pkg, diagram, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) el.Stereotype = stereotype;
    el.Update();
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + (leftX + width) + ";t=-30;b=-1850;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

function addMessage(src, dst, label, isReturn, sequenceNo) {
    var con = src.Connectors.AddNew(label, "Sequence");
    con.SupplierID = dst.ElementID;
    if (isReturn) con.Stereotype = "return";
    if (sequenceNo) { try { con.SequenceNo = sequenceNo; } catch (e) { } }
    con.Update();
    return con;
}

function addCombinedFragment(pkg, diagram, type, guardLabel, left, right, top, bottom) {
    try {
        var frag = pkg.Elements.AddNew(guardLabel, "InteractionFragment");
        frag.Stereotype = type; frag.Update();
        var dObj = diagram.DiagramObjects.AddNew("l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";", "");
        dObj.ElementID = frag.ElementID; dObj.Update();
        return frag;
    } catch (err) { log("Nota al crear fragmento (" + type + "): " + err.message); return null; }
}

function stretchLifeline(diagram, element, bottomY) {
    for (var i = 0; i < diagram.DiagramObjects.Count; i++) {
        var dObj = diagram.DiagramObjects.GetAt(i);
        if (dObj.ElementID == element.ElementID) { dObj.Bottom = bottomY || -2200; dObj.Update(); return; }
    }
}

function Main() {
    var pkg = getTargetPackage();
    if (pkg == null) { log("ERROR: No se encontro paquete destino."); return; }
    var diag = recreateDiagram(pkg);

    // ── Participantes ──────────────────────────────────────────────────────────
    var act      = addActorParticipant(pkg, diag, "Cajero",                       30,  80);
    var bndPage  = addParticipant(pkg, diag, "CatalogPageComponent",   "boundary", 140, 130);
    var bndApi   = addParticipant(pkg, diag, "CatalogApiService",      "boundary", 290, 120);
    var bndIdb   = addParticipant(pkg, diag, "IdbCatalogService",      "boundary", 430, 120);
    var ctrlRt   = addParticipant(pkg, diag, "CatalogRoutes",          "control",  570, 100);
    var ctrlSvc  = addParticipant(pkg, diag, "CatalogService",         "control",  690, 100);
    var entProd  = addParticipant(pkg, diag, "Product",                "entity",   810,  80);
    var entVar   = addParticipant(pkg, diag, "ProductVariant",         "entity",   910,  90);
    var entIdb   = addParticipant(pkg, diag, "IdbCatalogStore",        "entity",  1020, 100);

    // Estirar lifelines
    stretchLifeline(diag, act,     -2000);
    stretchLifeline(diag, bndPage, -2000);
    stretchLifeline(diag, bndApi,  -2000);
    stretchLifeline(diag, bndIdb,  -2000);
    stretchLifeline(diag, ctrlRt,  -2000);
    stretchLifeline(diag, ctrlSvc, -2000);
    stretchLifeline(diag, entProd, -2000);
    stretchLifeline(diag, entVar,  -2000);
    stretchLifeline(diag, entIdb,  -2000);

    // ── FASE 1: Sincronización — fragmento ALT ────────────────────────────────
    // [Red disponible: Sincronizacion Exitosa] vs [else: Falla de red (NetworkError)]
    addCombinedFragment(pkg, diag, "alt",
        "[Red disponible: Sincronizacion Exitosa] / [else: Falla de red (NetworkError)]",
        270, 1110, -750, -1500);

    addMessage(act,     bndPage,  "1: solicitarSincronizacionOffline()",  false, 1);
    addMessage(bndPage, bndPage,  "1.1: downloadOfflineCatalog()",        false, 2);
    addMessage(bndPage, bndApi,   "1.2: getOfflineCatalogPack()",         false, 3);
    addMessage(bndApi,  ctrlRt,   "1.3: get_offline_catalog_pack_route()", false, 4);
    addMessage(ctrlRt,  ctrlSvc,  "1.4: list_public_products()",          false, 5);
    addMessage(ctrlSvc, entProd,  "1.5: query()",                          false, 6);
    addMessage(ctrlSvc, entVar,   "1.6: query()",                          false, 7);
    addMessage(ctrlRt,  bndApi,   "1.7: response()",                       true,  8);
    addMessage(bndApi,  bndIdb,   "1.8: saveOfflinePack()",                false, 9);
    addMessage(bndIdb,  entIdb,   "1.9: clearAndPutProducts()",            false, 10);
    addMessage(bndIdb,  entIdb,   "1.10: putSyncMeta()",                   false, 11);
    addMessage(bndPage, act,      "1.11: mostrarToastSincronizado()",      true,  12);

    // Rama else del ALT
    addMessage(ctrlRt,  bndApi,   "1.3b: network_error()",                true,  13);
    addMessage(bndIdb,  entIdb,   "1.4b: rollbackTransaction()",           false, 14);
    addMessage(bndPage, act,      "1.5b: showErrorToast()",                true,  15);

    // ── Cierre ────────────────────────────────────────────────────────────────
    diag.Update();
    Repo.SaveDiagram(diag.DiagramID);
    Repo.ReloadDiagram(diag.DiagramID);
    try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }
    log("¡Diagrama de Secuencia CU07 actualizado exitosamente en Enterprise Architect!");
}

Main();
