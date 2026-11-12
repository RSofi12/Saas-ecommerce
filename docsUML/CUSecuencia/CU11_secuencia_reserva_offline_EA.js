/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU11 - Registrar Reserva de Prendas Offline en Modo Desconectado
 * DESCRIPCION: Proceso de reserva de prendas cuando la tienda o el cliente carece de conexion.
 *              Fase 1: Persistencia local en localStorage (PWA) o SQLite (Flutter) con generacion
 *              de UUIDv4 de contingencia (client_reservation_id) y emision de comprobante offline.
 *              Fase 2: Reconexion a Internet y sincronizacion manual desde MyReservationsPageComponent
 *              hacia el backend FastAPI, garantizando idempotencia transaccional y bloqueo central
 *              con with_for_update.
 * ACTOR: Cliente
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 *
 * NORMAS Y PAUTAS APLICADAS:
 * - Participantes rectangulares Sequence con estereotipos <<Actor>>, <<Boundary>>, <<Controller>>, <<Entity>>.
 * - Numeracion jerarquica IDENTICA al diagrama de Robustez del CU11.
 * - Fragmentos combinados:
 *     * opt [Modo Desconectado / Sin Conexion]: persistencia local (1.1 a 1.6).
 *     * opt [Reconexion a Internet Detectada]: sincronizacion con backend (2.1 a 2.19).
 *     * loop [Por cada item reservado]: insercion central en ReservationItem (2.11 a 2.12).
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU11 - Registrar Reserva Offline";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU11-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
}

/**
 * Obtiene o crea el paquete de destino en el Project Browser.
 */
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
        var p = root.Packages.GetAt(i);
        if (p.Name == DEFAULT_PACKAGE_NAME) {
            return p;
        }
    }

    var newPkg = root.Packages.AddNew(DEFAULT_PACKAGE_NAME, "Package");
    newPkg.Update();
    root.Packages.Refresh();
    log("Paquete creado: " + DEFAULT_PACKAGE_NAME);
    return newPkg;
}

/**
 * Recrea el diagrama limpio con estilos estandar UML.
 */
function recreateDiagram(pkg) {
    for (var i = pkg.Diagrams.Count - 1; i >= 0; i--) {
        var d = pkg.Diagrams.GetAt(i);
        if (d.Name == DIAGRAM_NAME) {
            try {
                pkg.Diagrams.Delete(i);
                pkg.Diagrams.Refresh();
                log("Diagrama previo eliminado para regeneracion limpia.");
            } catch (e) {
                log("Aviso al eliminar: " + e.message);
            }
            break;
        }
    }

    var diagram = pkg.Diagrams.AddNew(DIAGRAM_NAME, "Sequence");
    try {
        diagram.StyleEx = "ShowRobustness=0;SequenceCustomArt=0;";
    } catch (e) { }
    diagram.Update();
    pkg.Diagrams.Refresh();
    return diagram;
}

/**
 * Agrega el Actor con su icono estandar UML.
 */
function addActorParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Actor");
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-2400;", "");
    dObj.ElementID = el.ElementID;
    dObj.Update();
    return el;
}

/**
 * Agrega participante con encabezado RECTANGULAR Sequence (Boundary, Controller).
 */
function addParticipant(pkg, diagram, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) {
        el.Stereotype = stereotype;
    }
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2300;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

/**
 * Agrega participantes Entidades en RECUADRO RECTANGULAR estandar Sequence.
 */
function addEntityParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    el.Stereotype = "Entity" + String.fromCharCode(160);
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2300;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

/**
 * Agrega mensaje de secuencia con SequenceNo estricto para posicionamiento vertical.
 * isReturn = true crea la flecha discontinua de retorno UML.
 */
function addMessage(src, dst, label, isReturn, sequenceNo) {
    var con = src.Connectors.AddNew(label, "Sequence");
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
    return con;
}

/**
 * Agrega fragmentos combinados UML (alt, opt, loop).
 */
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

/**
 * Extiende la linea de vida del Actor hasta el final del diagrama.
 */
function stretchActorLifeline(diagram, actorEl, bottomY) {
    for (var i = 0; i < diagram.DiagramObjects.Count; i++) {
        var dObj = diagram.DiagramObjects.GetAt(i);
        if (dObj.ElementID == actorEl.ElementID) {
            dObj.Top = -20;
            dObj.Bottom = bottomY || -2400;
            dObj.Update();
            return;
        }
    }
}

function main() {
    log("Iniciando generacion de CU11 con arquitectura BCE y fragmentos...");

    var pkg = getTargetPackage();
    if (pkg == null) return;

    var diagram = recreateDiagram(pkg);

    /* -------------------------------------------------------------------------
     * 1. PARTICIPANTES BCE - identicos al diagrama de Robustez del CU11
     * Cliente -> :ReservationsPageComponent -> :NetworkStatusService / :IdbReservationsService
     *        -> :PendingReservationItem -> :ReservationApiService -> :ReservationRoutes
     *        -> :ReservationService -> :Reservation, :ReservationItem, :Inventory
     * ------------------------------------------------------------------------- */
    var actCliente        = addActorParticipant(pkg, diagram, "Cliente", 30, 80);
    var bndReserva        = addParticipant(pkg, diagram, ":ReservationsPageComponent",   "Boundary",  130, 200);
    var bndMyRes          = addParticipant(pkg, diagram, ":MyReservationsPageComponent", "Boundary",  350, 210);

    var ctrlNet           = addParticipant(pkg, diagram, ":NetworkStatusService",   "Controller", 580, 180);
    var ctrlLocal         = addParticipant(pkg, diagram, ":IdbReservationsService", "Controller", 780, 190);
    var entLocalPending   = addEntityParticipant(pkg, diagram, ":PendingReservationItem", 990, 190);

    var ctrlApi           = addParticipant(pkg, diagram, ":ReservationApiService", "Controller", 1200, 180);
    var ctrlRoutes        = addParticipant(pkg, diagram, ":ReservationRoutes",     "Controller", 1400, 160);
    var ctrlBackend       = addParticipant(pkg, diagram, ":ReservationService",    "Controller", 1580, 175);

    var entCentralReserva   = addEntityParticipant(pkg, diagram, ":Reservation",     1775, 130);
    var entCentralItem      = addEntityParticipant(pkg, diagram, ":ReservationItem", 1925, 140);
    var entCentralInventory = addEntityParticipant(pkg, diagram, ":Inventory",       2085, 130);

    var step = 1;

    /* -------------------------------------------------------------------------
     * 2. MENSAJES: numeracion jerarquica IDENTICA al diagrama de Robustez del CU11
     * ------------------------------------------------------------------------- */

    /* ---- FASE 1: REGISTRO OFFLINE (MODO DESCONECTADO) ---- */
    addMessage(actCliente, bndReserva, "1: prepararReserva()", false, step++);
    /* FRAGMENTO OPT: Modo Desconectado / Sin Conexion
     * Abarca 1.1 a 1.7: verificacion de red, persistencia local y comprobante */
    addCombinedFragment(pkg, diagram, "opt", "[Modo Desconectado / Sin Conexion]", 110, 1180, -180, -760);

    addMessage(bndReserva, ctrlNet, "1.1: effectiveOnline()", false, step++);
    addMessage(ctrlNet, bndReserva, "1.2: connectivityState()", true, step++);
    addMessage(bndReserva, ctrlLocal, "1.3: savePending()", false, step++);
    addMessage(ctrlLocal, entLocalPending, "1.4: create()", false, step++);
    addMessage(entLocalPending, ctrlLocal, "1.5: pendingRecord()", true, step++);
    addMessage(ctrlLocal, bndReserva, "1.6: savedOffline()", true, step++);
    addMessage(bndReserva, actCliente, "1.7: renderizarModalConfirmacion()", false, step++);

    /* ---- FASE 2: RECONEXION A INTERNET Y SINCRONIZACION ---- */
    addMessage(actCliente, bndMyRes, "2: sincronizarPendientes()", false, step++);
    /* FRAGMENTO OPT: Reconexion a Internet Detectada
     * Abarca 2.1 a 2.19: lectura de pendientes, llamada idempotente y confirmacion */
    addCombinedFragment(pkg, diagram, "opt", "[Reconexion a Internet Detectada]", 110, 2240, -820, -1980);

    addMessage(bndMyRes, ctrlLocal, "2.1: getPending()", false, step++);
    addMessage(ctrlLocal, bndMyRes, "2.2: pendingList()", true, step++);
    addMessage(bndMyRes, ctrlApi, "2.3: createReservation()", false, step++);
    addMessage(ctrlApi, ctrlRoutes, "2.4: POST /reservations/", false, step++);
    addMessage(ctrlRoutes, ctrlBackend, "2.5: create_reservation()", false, step++);
    addMessage(ctrlBackend, ctrlBackend, "2.6: validateIdempotency()", false, step++);
    addMessage(ctrlBackend, entCentralInventory, "2.7: with_for_update()", false, step++);
    addMessage(entCentralInventory, ctrlBackend, "2.8: lockResult()", true, step++);
    addMessage(ctrlBackend, entCentralReserva, "2.9: create()", false, step++);
    addMessage(entCentralReserva, ctrlBackend, "2.10: reservationRecord()", true, step++);
    /* FRAGMENTO LOOP: Por cada item de la reserva (2.11 a 2.12) */
    addCombinedFragment(pkg, diagram, "loop", "[Por cada item reservado]", 1750, 2110, -1420, -1640);

    addMessage(ctrlBackend, entCentralItem, "2.11: add()", false, step++);
    addMessage(entCentralItem, ctrlBackend, "2.12: itemRecord()", true, step++);
    addMessage(ctrlBackend, ctrlApi, "2.13: HTTP 201 Created", true, step++);
    addMessage(ctrlApi, bndMyRes, "2.14: createdReservation()", true, step++);
    addMessage(bndMyRes, ctrlLocal, "2.15: removePending()", false, step++);
    addMessage(ctrlLocal, entLocalPending, "2.16: delete()", false, step++);
    addMessage(entLocalPending, ctrlLocal, "2.17: deleted()", true, step++);
    addMessage(ctrlLocal, bndMyRes, "2.18: pendingCleared()", true, step++);
    addMessage(bndMyRes, actCliente, "2.19: renderizarResumenSincronizacion()", false, step++);

    /* Guardar y abrir diagrama de forma segura */
    stretchActorLifeline(diagram, actCliente, -2400);
    diagram.Update();
    if (Repo != null) {
        Repo.SaveDiagram(diagram.DiagramID);
        Repo.ReloadDiagram(diagram.DiagramID);
        Repo.OpenDiagram(diagram.DiagramID);
    }

    log("Diagrama '" + DIAGRAM_NAME + "' generado y abierto correctamente.");
    try { Session.Prompt("¡Diagrama de Secuencia CU11 generado con exito!", 0); } catch (e) { }
}

main();
