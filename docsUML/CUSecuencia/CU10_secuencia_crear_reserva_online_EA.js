/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU10 - Crear Reserva Online
 * ACTOR: Cliente
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU10 - Crear Reserva Online";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try { var eaApp = new ActiveXObject("EA.App"); Repo = eaApp.Repository; } catch (e) { }
}

function log(msg) { try { Session.Output("[CU10-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } } }

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
    var act       = addActorParticipant(pkg, diag, "Cliente",                      30,  90);
    var bndPage   = addParticipant(pkg, diag, "ReservationsPageComponent", "boundary", 150, 135);
    var bndApi    = addParticipant(pkg, diag, "ReservationApiService",     "boundary", 305, 120);
    var ctrlRt    = addParticipant(pkg, diag, "ReservationRoutes",         "control",  445, 100);
    var ctrlSvc   = addParticipant(pkg, diag, "ReservationService",        "control",  565, 110);
    var entRes    = addParticipant(pkg, diag, "Reservation",               "entity",   695,  80);
    var entItem   = addParticipant(pkg, diag, "ReservationItem",           "entity",   795,  90);
    var entInv    = addParticipant(pkg, diag, "Inventory",                 "entity",   905,  80);
    var entBranch = addParticipant(pkg, diag, "Branch",                    "entity",  1005,  80);

    // Estirar lifelines para diagrama amplio
    stretchLifeline(diag, act,       -2100);
    stretchLifeline(diag, bndPage,   -2100);
    stretchLifeline(diag, bndApi,    -2100);
    stretchLifeline(diag, ctrlRt,    -2100);
    stretchLifeline(diag, ctrlSvc,   -2100);
    stretchLifeline(diag, entRes,    -2100);
    stretchLifeline(diag, entItem,   -2100);
    stretchLifeline(diag, entInv,    -2100);
    stretchLifeline(diag, entBranch, -2100);

    // ── FASE 1: Carga de reservas existentes ──────────────────────────────────
    addMessage(act,     bndPage,  "1: navegarReservas()",                   false, 1);
    addMessage(bndPage, bndApi,   "1.1: listMyReservations()",              false, 2);
    addMessage(bndApi,  ctrlRt,   "1.2: list_reservations_route()",         false, 3);
    addMessage(ctrlRt,  ctrlSvc,  "1.3: list_reservations_for_user()",      false, 4);
    addMessage(ctrlSvc, ctrlSvc,  "1.4: expire_due_reservations()",         false, 5);
    addMessage(ctrlSvc, entRes,   "1.5: query()",                           false, 6);
    addMessage(ctrlRt,  bndApi,   "1.6: response()",                        true,  7);
    addMessage(bndApi,  bndPage,  "1.7: setReservations()",                 false, 8);
    addMessage(bndPage, bndPage,  "1.8: renderizarListaReservas()",         false, 9);

    // ── FASE 2: Creación de reserva — fragmento ALT ───────────────────────────
    // [Stock disponible y fecha valida: Reserva Creada] vs [else: Stock insuficiente o fecha fuera de rango (400)]
    addCombinedFragment(pkg, diag, "alt",
        "[Stock disponible y fecha valida: Reserva Creada] / [else: Stock insuficiente o fecha fuera de rango (400)]",
        445, 1080, -1000, -1600);

    addMessage(act,     bndPage,  "2: solicitarReservaPrenda()",            false, 10);
    addMessage(bndPage, bndApi,   "2.1: createReservation()",               false, 11);
    addMessage(bndApi,  ctrlRt,   "2.2: create_reservation_route()",        false, 12);
    addMessage(ctrlRt,  ctrlSvc,  "2.3: create_reservation()",              false, 13);
    addMessage(ctrlSvc, ctrlSvc,  "2.4: expire_due_reservations()",         false, 14);
    addMessage(ctrlSvc, ctrlSvc,  "2.5: validarRangoFechaVisita()",         false, 15);
    addMessage(ctrlSvc, entBranch,"2.6: query()",                           false, 16);
    addMessage(ctrlSvc, entInv,   "2.7: _get_inventory_for_update()",       false, 17);
    addMessage(ctrlSvc, ctrlSvc,  "2.8: validarStockDisponible()",          false, 18);

    // Rama principal del ALT (stock disponible y fecha válida)
    addMessage(ctrlSvc, entRes,   "2.9a: create()",                         false, 19);
    addMessage(ctrlSvc, entItem,  "2.10a: create()",                        false, 20);
    addMessage(ctrlSvc, entInv,   "2.11a: incrementarReservedQuantity()",   false, 21);
    addMessage(ctrlRt,  bndApi,   "2.12a: response()",                      true,  22);
    addMessage(bndPage, act,      "2.13a: mostrarComprobanteReserva()",     true,  23);

    // Rama else del ALT
    addMessage(ctrlSvc, ctrlSvc,  "2.9b: raise_http_exception()",           false, 24);
    addMessage(bndPage, act,      "2.10b: showErrorToast()",                true,  25);

    // ── Cierre ────────────────────────────────────────────────────────────────
    diag.Update();
    Repo.SaveDiagram(diag.DiagramID);
    Repo.ReloadDiagram(diag.DiagramID);
    try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }
    log("¡Diagrama de Secuencia CU10 actualizado exitosamente en Enterprise Architect!");
}

Main();
