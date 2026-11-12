/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU08 - Consultar Catálogo Offline
 * ACTOR: Cajero
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU08 - Consultar Catalogo Offline";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try { var eaApp = new ActiveXObject("EA.App"); Repo = eaApp.Repository; } catch (e) { }
}

function log(msg) { try { Session.Output("[CU08-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } } }

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
    var act      = addActorParticipant(pkg, diag, "Cajero",                       30,  90);
    var bndPage  = addParticipant(pkg, diag, "CatalogPageComponent",   "boundary", 150, 130);
    var ctrlNet  = addParticipant(pkg, diag, "NetworkStatusService",   "control",  300, 130);
    var ctrlIdb  = addParticipant(pkg, diag, "IdbCatalogService",      "control",  460, 130);
    var entProd  = addParticipant(pkg, diag, "IdbProductStore",        "entity",   620, 100);
    var entMeta  = addParticipant(pkg, diag, "IdbMetaStore",           "entity",   750, 100);

    // Estirar lifelines
    stretchLifeline(diag, act,     -2000);
    stretchLifeline(diag, bndPage, -2000);
    stretchLifeline(diag, ctrlNet, -2000);
    stretchLifeline(diag, ctrlIdb, -2000);
    stretchLifeline(diag, entProd, -2000);
    stretchLifeline(diag, entMeta, -2000);

    // ── FASE 1: Consulta offline — fragmento ALT ──────────────────────────────
    // [Almacen local con datos: Renderizado Offline] vs [else: Almacen local vacio]
    addCombinedFragment(pkg, diag, "alt",
        "[Almacen local con datos: Renderizado Offline] / [else: Almacen local vacio]",
        440, 850, -750, -1400);

    addMessage(act,     bndPage,  "1: navegarCatalogo()",                   false, 1);
    addMessage(bndPage, bndPage,  "1.1: search()",                          false, 2);
    addMessage(bndPage, ctrlNet,  "1.2: effectiveOnline()",                 false, 3);
    addMessage(ctrlNet, bndPage,  "1.3: returnFalse()",                     true,  4);
    addMessage(bndPage, ctrlIdb,  "1.4: loadFromIndexedDb()",               false, 5);
    addMessage(ctrlIdb, ctrlIdb,  "1.5: filterInMemory()",                  false, 6);
    addMessage(ctrlIdb, entProd,  "1.6: getAll()",                          false, 7);
    addMessage(ctrlIdb, entMeta,  "1.7: getSyncMeta()",                     false, 8);
    addMessage(ctrlIdb, bndPage,  "1.8: setProducts()",                     true,  9);
    addMessage(bndPage, act,      "1.9: renderizarCatalogoOffline()",       true,  10);

    // Rama else del ALT
    addMessage(ctrlIdb, bndPage,  "1.6b: returnEmpty()",                    true,  11);
    addMessage(bndPage, act,      "1.7b: mostrarAlertaSinDatosOffline()",   true,  12);

    // ── Cierre ────────────────────────────────────────────────────────────────
    diag.Update();
    Repo.SaveDiagram(diag.DiagramID);
    Repo.ReloadDiagram(diag.DiagramID);
    try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }
    log("¡Diagrama de Secuencia CU08 actualizado exitosamente en Enterprise Architect!");
}

Main();
