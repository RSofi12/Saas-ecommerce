/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU10 - Crear Reserva Online de Prendas con Vencimiento y Bloqueo
 * ACTOR: Cliente (Actor Principal)
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU10 - Secuencia Crear Reserva Online de Prendas con Vencimiento y Bloqueo";

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

    // 1. Participantes BCE (Coincidentes con Robustez CU10)
    var act = addActorParticipant(pkg, diag, "Cliente", 30, 80);
    var bndPage = addParticipant(pkg, diag, "ReservationsPageComponent", "boundary", 140, 140);
    var bndApi = addParticipant(pkg, diag, "ReservationApiService", "boundary", 300, 120);
    var ctrlRoutes = addParticipant(pkg, diag, "ReservationRoutes", "control", 440, 100);
    var ctrlSvc = addParticipant(pkg, diag, "ReservationService", "control", 560, 110);
    var entBranch = addParticipant(pkg, diag, "Branch", "entity", 690, 80);
    var entInv = addParticipant(pkg, diag, "Inventory", "entity", 790, 80);
    var entRes = addParticipant(pkg, diag, "Reservation", "entity", 890, 85);
    var entItem = addParticipant(pkg, diag, "ReservationItem", "entity", 1000, 95);

    pkg.Elements.Refresh();
    diag.DiagramObjects.Refresh();

    var seq = 1;

    // FASE 1: Creación de Reserva y Bloqueo de Stock
    addMessage(act, bndPage, "1: solicitarReservaPrenda()", false, seq++);
    addMessage(bndPage, bndApi, "1.1: createReservation()", false, seq++);
    addMessage(bndApi, ctrlRoutes, "1.2: create_reservation_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "1.3: create_reservation()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "1.4: expire_due_reservations()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "1.5: validarRangoFechaVisita()", false, seq++);
    addMessage(ctrlSvc, entBranch, "1.6: query()", false, seq++);
    addMessage(ctrlSvc, entInv, "1.7: _get_inventory_for_update()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "1.8: validarStockDisponible()", false, seq++);

    // FRAGMENTO COMBINADO ALT: [Stock disponible y fecha válida vs Stock insuficiente o fecha inválida]
    addCombinedFragment(pkg, diag, "alt", "[Stock disponible y fecha válida: Reserva Creada]", 420, 1120, -780, -1280);

    // Rama Exitosa: Creación de Reserva, Ítems y Bloqueo de Stock
    addMessage(ctrlSvc, entRes, "1.9a: create()", false, seq++);
    addMessage(ctrlSvc, entItem, "1.10a: create()", false, seq++);
    addMessage(ctrlSvc, entInv, "1.11a: incrementarReservedQuantity()", false, seq++);
    addMessage(ctrlSvc, ctrlRoutes, "1.12a: response()", true, seq++);
    addMessage(ctrlRoutes, bndApi, "1.13a: response()", true, seq++);
    addMessage(bndApi, bndPage, "1.14a: response()", true, seq++);
    addMessage(bndPage, act, "1.15a: mostrarComprobanteReserva()", false, seq++);

    // Rama Alternativa 1: Stock insuficiente o fecha inválida (Rechazo 400)
    addCombinedFragment(pkg, diag, "alt", "[else: Stock insuficiente o fecha fuera de rango (400)]", 420, 720, -1320, -1620);
    addMessage(ctrlSvc, ctrlRoutes, "1.9b: raise_http_exception()", true, seq++);
    addMessage(ctrlRoutes, bndApi, "1.10b: 400 Bad Request", true, seq++);
    addMessage(bndApi, bndPage, "1.11b: showError()", true, seq++);
    addMessage(bndPage, act, "1.12b: showErrorToast()", false, seq++);

    // Extender líneas de vida uniformemente
    stretchLifeline(diag, act, -1850);
    stretchLifeline(diag, bndPage, -1850);
    stretchLifeline(diag, bndApi, -1850);
    stretchLifeline(diag, ctrlRoutes, -1850);
    stretchLifeline(diag, ctrlSvc, -1850);
    stretchLifeline(diag, entBranch, -1850);
    stretchLifeline(diag, entInv, -1850);
    stretchLifeline(diag, entRes, -1850);
    stretchLifeline(diag, entItem, -1850);

    diag.Update();
    Repo.SaveDiagram(diag.DiagramID);
    Repo.ReloadDiagram(diag.DiagramID);
    try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }

    log("¡Diagrama de Secuencia CU10 actualizado exitosamente en Enterprise Architect!");
}

Main();
