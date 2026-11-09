/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU11 - Registrar Reserva de Prendas Offline en Modo Desconectado
 * DESCRIPCION: Proceso de reserva de prendas cuando la tienda o el cliente carece de conexion.
 *              Fase 1: Persistencia local en IndexedDB (PWA) o SQLite (Flutter) con generacion 
 *              de UUIDv4 de contingencia (client_reservation_id), decremento preventivo de stock 
 *              local y emision de comprobante RES-OFF-XXXX.
 *              Fase 2: Reconexion a Internet y sincronizacion automatica con backend FastAPI, 
 *              garantizando idempotencia transaccional y bloqueo central con with_for_update.
 * ACTOR: Cliente
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 *
 * NORMAS Y PAUTAS APLICADAS:
 * - Participantes rectangulares Sequence con estereotipos <<Actor>>, <<Interface>>, <<Controller>>, <<Entity>>.
 * - Numeracion secuencial estricta (con.SequenceNo = sequenceNo) para garantizar orden vertical perfecto.
 * - Sin cruces horizontales entre entidades (comunicacion exclusiva Controller -> Entity).
 * - Retornos unicamente hacia el Controller o la Interface.
 * - Fragmentos combinados:
 *     * opt [Modo Desconectado / Sin Conexion]: abarca verificacion y persistencia local (1.2 a 1.9).
 *     * opt [Reconexion a Internet Detectada]: abarca sync reactiva con backend (2 a 2.16).
 *     * loop [Por cada item reservado]: insercion central en ReservationItem (2.10 a 2.11).
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
     * 1. PARTICIPANTES BCE (DISTRIBUCION HORIZONTAL)
     * Actor -> :ReservationCreateComponent (Boundary) -> :IdbReservationsController (Control Local)
     * -> :LocalPendingReservation, :LocalInventory (Entities Locales)
     * -> :ReservationService (Control Backend)
     * -> :Reservation, :ReservationItem, :Inventory (Entities Centrales)
     * ------------------------------------------------------------------------- */
    var actorCliente        = addActorParticipant(pkg, diagram, "Cliente", 40, 90);
    var uiReserva           = addParticipant(pkg, diagram, ":ReservationCreateComponent", "Interface", 180, 210);
    var ctrlLocal           = addParticipant(pkg, diagram, ":IdbReservationsController", "Controller", 440, 200);

    var entLocalPending     = addEntityParticipant(pkg, diagram, ":LocalPendingReservation", 690, 190);
    var entLocalInventory   = addEntityParticipant(pkg, diagram, ":LocalInventory",          930, 150);

    var ctrlBackend         = addParticipant(pkg, diagram, ":ReservationService", "Controller", 1130, 180);

    var entCentralReserva   = addEntityParticipant(pkg, diagram, ":Reservation",     1360, 130);
    var entCentralItem      = addEntityParticipant(pkg, diagram, ":ReservationItem", 1540, 140);
    var entCentralInventory = addEntityParticipant(pkg, diagram, ":Inventory",       1730, 130);

    var step = 1;

    /* -------------------------------------------------------------------------
     * 2. FASE 1: REGISTRO OFFLINE (MODO DESCONECTADO)
     * ------------------------------------------------------------------------- */
    addMessage(actorCliente, uiReserva,
        "1: prepararReserva(visitDate, items)", false, step++);

    // Autollamada en Interface: deteccion reactiva de estado offline
    addMessage(uiReserva, uiReserva,
        "1.1: verificarConexion() [isOnline=false]", false, step++);

    /* FRAGMENTO OPT: Modo Desconectado / Sin Conexion
     * Abarca: 1.2 a 1.9 (persistencia local en IndexedDB/SQLite y emision de comprobante) */
    addCombinedFragment(pkg, diagram, "opt", "[Modo Desconectado / Sin Conexion]", 160, 1100, -180, -680);

    addMessage(uiReserva, ctrlLocal,
        "1.2: saveOfflineReservation(payload)", false, step++);

    // Autollamada en Controller Local: validacion de existencias locales
    addMessage(ctrlLocal, ctrlLocal,
        "1.3: validarStockLocal()", false, step++);

    addMessage(ctrlLocal, entLocalInventory,
        "1.4: decrementLocalStock(variant_id, qty)", false, step++);

    addMessage(entLocalInventory, ctrlLocal,
        "1.5: return()", true, step++);

    addMessage(ctrlLocal, entLocalPending,
        "1.6: insertPendingReservation(PENDIENTE_SYNC)", false, step++);

    addMessage(entLocalPending, ctrlLocal,
        "1.7: return()", true, step++);

    addMessage(ctrlLocal, uiReserva,
        "1.8: return()", true, step++);

    addMessage(uiReserva, actorCliente,
        "1.9: renderizarTicketContingencia()", true, step++);

    /* -------------------------------------------------------------------------
     * 3. FASE 2: RECONEXION A INTERNET Y SINCRONIZACION AUTOMATICA
     * ------------------------------------------------------------------------- */
    /* FRAGMENTO OPT: Reconexion a Internet Detectada
     * Abarca: 2 a 2.16 (lectura de Outbox, llamada idempotente a API central y confirmacion) */
    addCombinedFragment(pkg, diagram, "opt", "[Reconexion a Internet Detectada]", 160, 1880, -720, -1720);

    addMessage(uiReserva, ctrlLocal,
        "2: detectarReconexionInternet()", false, step++);

    // Autollamada en Controller Local: orquestacion de sincronizacion por lotes
    addMessage(ctrlLocal, ctrlLocal,
        "2.1: syncPendingReservations()", false, step++);

    addMessage(ctrlLocal, entLocalPending,
        "2.2: listPendingReservations()", false, step++);

    addMessage(entLocalPending, ctrlLocal,
        "2.3: return()", true, step++);

    addMessage(ctrlLocal, ctrlBackend,
        "2.4: POST /reservations/ (client_reservation_id)", false, step++);

    // Autollamada en Backend Controller: idempotencia transaccional (UUIDv4)
    addMessage(ctrlBackend, ctrlBackend,
        "2.5: validateIdempotency()", false, step++);

    addMessage(ctrlBackend, entCentralInventory,
        "2.6: with_for_update(reserved_quantity += qty)", false, step++);

    addMessage(entCentralInventory, ctrlBackend,
        "2.7: return()", true, step++);

    addMessage(ctrlBackend, entCentralReserva,
        "2.8: create(Reservation)", false, step++);

    addMessage(entCentralReserva, ctrlBackend,
        "2.9: return()", true, step++);

    /* FRAGMENTO LOOP: Por cada item de la reserva
     * Abarca: 2.10 a 2.11 (creacion central de items en base de datos) */
    addCombinedFragment(pkg, diagram, "loop", "[Por cada item reservado]", 1110, 1700, -1250, -1410);

    addMessage(ctrlBackend, entCentralItem,
        "2.10: create(ReservationItem)", false, step++);

    addMessage(entCentralItem, ctrlBackend,
        "2.11: return()", true, step++);

    addMessage(ctrlBackend, ctrlLocal,
        "2.12: HTTP 201 Created (CONFIRMADO_SERVER)", true, step++);

    addMessage(ctrlLocal, entLocalPending,
        "2.13: markAsSynced(client_reservation_id)", false, step++);

    addMessage(entLocalPending, ctrlLocal,
        "2.14: return()", true, step++);

    addMessage(ctrlLocal, uiReserva,
        "2.15: notificarSincronizacionExitosa()", true, step++);

    addMessage(uiReserva, actorCliente,
        "2.16: renderizarEstadoSincronizado()", true, step++);

    /* Guardar y abrir diagrama de forma segura */
    stretchActorLifeline(diagram, actorCliente, -2400);
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
