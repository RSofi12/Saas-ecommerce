/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU08 - Consultar Catálogo Offline en Modo Desconectado
 * ACTOR: Cajero
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU08 - Consultar Catálogo Offline en Modo Desconectado";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU08-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
    var bndPage = addParticipant(pkg, diag, "CatalogPageComponent", "boundary", 160, 130);
    var ctrlNet = addParticipant(pkg, diag, "NetworkStatusService", "control", 330, 120);
    var ctrlIdb = addParticipant(pkg, diag, "IdbCatalogService", "control", 490, 120);
    var entProd = addParticipant(pkg, diag, "IdbProductStore", "entity", 650, 100);
    var entMeta = addParticipant(pkg, diag, "IdbMetaStore", "entity", 780, 100);

    var seq = 1;

    // Secuencia 1: Consulta Desconectada con Filtro Local en IndexedDB
    addMessage(act, bndPage, "navegarCatalogo()", false, seq++);
    addMessage(bndPage, bndPage, "search()", false, seq++);
    addMessage(bndPage, ctrlNet, "effectiveOnline()", false, seq++);
    addMessage(ctrlNet, bndPage, "returnFalse()", true, seq++);
    addMessage(bndPage, ctrlIdb, "loadFromIndexedDb()", false, seq++);
    addMessage(ctrlIdb, ctrlIdb, "filterInMemory()", false, seq++);
    addMessage(ctrlIdb, entProd, "getAll()", false, seq++);
    addMessage(ctrlIdb, entMeta, "getSyncMeta()", false, seq++);
    addMessage(ctrlIdb, bndPage, "setProducts()", true, seq++);
    addMessage(bndPage, act, "renderizarCatalogoOffline()", false, seq++);

    // Secuencia 2: Flujo Alternativo A1 - Almacén Local Vacío
    addMessage(act, bndPage, "navegarCatalogo()", false, seq++);
    addMessage(bndPage, ctrlIdb, "loadFromIndexedDb()", false, seq++);
    addMessage(ctrlIdb, entProd, "getAll()", false, seq++);
    addMessage(ctrlIdb, bndPage, "returnEmpty()", true, seq++);
    addMessage(bndPage, act, "mostrarAlertaSinDatosOffline()", false, seq++);

    diag.Update();
    log("Diagrama de Secuencia CU08 generado.");
}

Main();
