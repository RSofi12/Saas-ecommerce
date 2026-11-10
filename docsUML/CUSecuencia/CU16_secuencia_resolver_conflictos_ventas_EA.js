/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU16 - Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock
 * ACTOR: Encargado (Actor Principal)
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU16 - Secuencia Resolver Conflictos de Ventas Offline";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU16-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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

    var act = addActorParticipant(pkg, diag, "Encargado", 30, 90);
    var bndBandeja = addParticipant(pkg, diag, "SaleConflictsPageComponent", "boundary", 150, 130);
    var bndModal = addParticipant(pkg, diag, "ResolveConflictModalComponent", "boundary", 300, 130);
    var ctrlRoutes = addParticipant(pkg, diag, "SaleConflictRoutes", "control", 450, 110);
    var ctrlSvc = addParticipant(pkg, diag, "SaleConflictService", "control", 580, 110);
    var entSale = addParticipant(pkg, diag, "Sale", "entity", 710, 80);
    var entItem = addParticipant(pkg, diag, "SaleItem", "entity", 810, 80);
    var entInv = addParticipant(pkg, diag, "Inventory", "entity", 910, 80);
    var entReturn = addParticipant(pkg, diag, "GarmentReturn", "entity", 1010, 90);

    var seq = 1;

    // Secuencia 1: Consulta de Bandeja de Conflictos y Stock Central
    addMessage(act, bndBandeja, "accederBandejaConflictos()", false, seq++);
    addMessage(bndBandeja, ctrlRoutes, "list_conflicts_endpoint()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "list_branch_sale_conflicts()", false, seq++);
    addMessage(ctrlSvc, entSale, "obtenerVentasEnConflicto()", false, seq++);
    addMessage(ctrlSvc, entInv, "verificarStockCentralActual()", false, seq++);
    addMessage(ctrlSvc, ctrlRoutes, "response()", true, seq++);
    addMessage(ctrlRoutes, bndBandeja, "response()", true, seq++);
    addMessage(bndBandeja, act, "mostrarTicketsConQuiebreStock()", false, seq++);

    // Secuencia 2: Apertura y Envío de Resolución Gerencial
    addMessage(act, bndModal, "abrirModalResolucion()", false, seq++);
    addMessage(act, bndModal, "ingresarViaYJustificacion()", false, seq++);
    addMessage(bndModal, ctrlRoutes, "resolve_conflict_endpoint()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "resolve_sale_conflict()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "validarJustificacionAuditoria()", false, seq++);
    addMessage(ctrlSvc, entInv, "_get_inventory_for_update()", false, seq++);

    // Secuencia 3: Bifurcación según Vía de Resolución
    // Vía A: negative_stock
    addMessage(ctrlSvc, entInv, "autorizarStockNegativo()", false, seq++);
    addMessage(ctrlSvc, entSale, "marcarVentaCompletada()", false, seq++);

    // Vía B: substitute
    addMessage(ctrlSvc, entInv, "descontarStockVarianteSustituta()", false, seq++);
    addMessage(ctrlSvc, entItem, "reasignarVarianteItem()", false, seq++);

    // Vía C: credit_note
    addMessage(ctrlSvc, entReturn, "registrarDevolucion100PorCiento()", false, seq++);
    addMessage(ctrlSvc, entSale, "anularVentaOffline()", false, seq++);

    // Secuencia 4: Confirmación Final
    addMessage(ctrlSvc, ctrlRoutes, "response()", true, seq++);
    addMessage(ctrlRoutes, bndModal, "response()", true, seq++);
    addMessage(bndModal, act, "notificarResolucionExitosa()", false, seq++);

    diag.Update();
    log("Diagrama de Secuencia CU16 generado con éxito.");
}

Main();
