/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU10 - Crear Reserva Online de Prendas con Vencimiento y Bloqueo
 * ACTOR: Cliente
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU10 - Crear Reserva Online de Prendas con Vencimiento y Bloqueo";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU10-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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

    var act = addActorParticipant(pkg, diag, "Cliente", 30, 90);
    var bndPage = addParticipant(pkg, diag, "ReservationsPageComponent", "boundary", 150, 130);
    var bndApi = addParticipant(pkg, diag, "ReservationApiService", "boundary", 300, 110);
    var ctrlRoutes = addParticipant(pkg, diag, "ReservationRoutes", "control", 430, 100);
    var ctrlSvc = addParticipant(pkg, diag, "ReservationService", "control", 550, 100);
    var entRes = addParticipant(pkg, diag, "Reservation", "entity", 670, 80);
    var entItem = addParticipant(pkg, diag, "ReservationItem", "entity", 770, 90);
    var entInv = addParticipant(pkg, diag, "Inventory", "entity", 880, 80);
    var entBranch = addParticipant(pkg, diag, "Branch", "entity", 980, 80);

    var seq = 1;

    // Secuencia 1: Creación Exitosa de Reserva Online
    addMessage(act, bndPage, "solicitarReservaPrenda()", false, seq++);
    addMessage(bndPage, bndApi, "createReservation()", false, seq++);
    addMessage(bndApi, ctrlRoutes, "create_reservation_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "create_reservation()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "validarRangoFechaVisita()", false, seq++);
    addMessage(ctrlSvc, entBranch, "query()", false, seq++);
    addMessage(ctrlSvc, entInv, "_get_inventory_for_update()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "validarStockDisponible()", false, seq++);
    addMessage(ctrlSvc, entRes, "create()", false, seq++);
    addMessage(ctrlSvc, entItem, "create()", false, seq++);
    addMessage(ctrlSvc, entInv, "incrementarReservedQuantity()", false, seq++);
    addMessage(ctrlSvc, ctrlRoutes, "response()", true, seq++);
    addMessage(ctrlRoutes, bndApi, "response()", true, seq++);
    addMessage(bndApi, bndPage, "response()", true, seq++);
    addMessage(bndPage, act, "mostrarComprobanteReserva()", false, seq++);

    // Secuencia 2: Flujo Alternativo A1 - Quiebre de Stock
    addMessage(act, bndPage, "solicitarReservaPrenda()", false, seq++);
    addMessage(bndPage, bndApi, "createReservation()", false, seq++);
    addMessage(bndApi, ctrlRoutes, "create_reservation_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "create_reservation()", false, seq++);
    addMessage(ctrlSvc, entInv, "_get_inventory_for_update()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "validarStockDisponible()", false, seq++);
    addMessage(ctrlSvc, ctrlRoutes, "raise_http_exception()", true, seq++);
    addMessage(bndPage, act, "showErrorToast()", false, seq++);

    // Secuencia 3: Flujo Alternativo A2 - Fecha de Visita Fuera de Rango
    addMessage(act, bndPage, "solicitarReservaPrenda()", false, seq++);
    addMessage(bndPage, bndApi, "createReservation()", false, seq++);
    addMessage(bndApi, ctrlRoutes, "create_reservation_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "validarRangoFechaVisita()", false, seq++);
    addMessage(ctrlSvc, ctrlRoutes, "raise_http_exception()", true, seq++);
    addMessage(bndPage, act, "showErrorToast()", false, seq++);

    diag.Update();
    log("Diagrama de Secuencia CU10 generado.");
}

Main();
