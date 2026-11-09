/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU12 - Atender y Resolver Conflictos de Reservas Expiradas (Enfoque A)
 * DESCRIPCION: Resolucion en mostrador cuando un cliente asiste tras la caducidad del apartado.
 *              Fase 1: El Encargado ingresa al panel y dispara el barrido de auditoria de vencidas.
 *              El ExpirationSweeper libera el stock bloqueado de las prendas vencidas para devolverlo
 *              a disponibilidad de tienda.
 *              Fase 2: El Encargado consulta la bandeja de conflictos y evalua el stock fisico real
 *              remanente en percha (quantity - reserved_quantity) calculado por el backend.
 *              Fase 3: Negociacion asistida con el cliente mediante modal interactivo con 3 vias:
 *              - Estrategia 1: Reactivacion (+24h/48h) con re-bloqueo si hay stock remanente.
 *              - Estrategia 2: Sustitucion por otra talla o variante disponible.
 *              - Estrategia 3: Cierre definitivo / anulacion con auditoria obligatoria.
 * ACTOR: Encargado
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 *
 * NORMAS Y PAUTAS APLICADAS:
 * - Participantes rectangulares Sequence con estereotipos <<Actor>>, <<Interface>>, <<Controller>>, <<Entity>>.
 * - Numeracion secuencial estricta (con.SequenceNo = sequenceNo) para garantizar orden vertical perfecto.
 * - Flujo 100% iniciado por el Actor humano a traves de Fronteras (Regla de oro ICONIX).
 * - Sin cruces horizontales entre entidades (comunicacion exclusiva Controller -> Entity).
 * - Retornos unicamente hacia el Controller o la Interface.
 * - Fragmentos combinados:
 *     * opt [Barrido de Expiracion y Liberacion de Stock]: liberacion automatica de stock vencido (1.1 a 1.8).
 *     * alt [Estrategia 1: Reactivacion con Re-bloqueo]: re-bloqueo atomico y extension de vigencia (3.5 a 3.8).
 *     * alt [Estrategia 2: Sustitucion por Variante]: reasignacion de item y re-bloqueo nuevo (3.9 a 3.12).
 *     * alt [Estrategia 3: Cierre Definitivo / Anulacion]: cancelacion formal con auditoria (3.13 a 3.14).
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU12 - Resolver Conflictos Reservas Expiradas";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU12-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-2500;", "");
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
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2400;", "");
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
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2400;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

/**
 * Agrega mensaje de secuencia con SequenceNo estricto para ordenamiento vertical.
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
            dObj.Bottom = bottomY || -2500;
            dObj.Update();
            return;
        }
    }
}

function main() {
    log("Iniciando generacion de CU12 (Enfoque A) con arquitectura BCE y fragmentos...");

    var pkg = getTargetPackage();
    if (pkg == null) return;

    var diagram = recreateDiagram(pkg);

    /* -------------------------------------------------------------------------
     * 1. PARTICIPANTES BCE (DISTRIBUCION HORIZONTAL)
     * Actor -> Boundaries -> Controllers -> Entities
     * Encargado -> :ReservationsPageComponent, :ResolveConflictModal
     *           -> :ExpirationSweeper, :ResolveReservationController
     *           -> :Reservation, :ReservationItem, :Inventory
     * ------------------------------------------------------------------------- */
    var actorEncargado  = addActorParticipant(pkg, diagram, "Encargado", 40, 90);
    var uiPanel         = addParticipant(pkg, diagram, ":ReservationsPageComponent", "Interface", 180, 200);
    var uiModal         = addParticipant(pkg, diagram, ":ResolveConflictModal",      "Interface", 430, 190);

    var ctrlSweeper     = addParticipant(pkg, diagram, ":ExpirationSweeper",             "Controller", 670, 180);
    var ctrlResolve     = addParticipant(pkg, diagram, ":ResolveReservationController", "Controller", 900, 220);

    var entReserva      = addEntityParticipant(pkg, diagram, ":Reservation",     1170, 130);
    var entItem         = addEntityParticipant(pkg, diagram, ":ReservationItem", 1350, 140);
    var entInventory    = addEntityParticipant(pkg, diagram, ":Inventory",       1540, 130);

    var step = 1;

    /* -------------------------------------------------------------------------
     * 2. FASE 1: BARRIDO DE EXPIRACION INICIADO DESDE LA INTERFAZ (ENFOQUE A)
     * ------------------------------------------------------------------------- */
    addMessage(actorEncargado, uiPanel,
        "1: auditarVencidasYBandeja()", false, step++);

    /* FRAGMENTO OPT: Barrido de Expiracion y Liberacion de Stock
     * Abarca: 1.1 a 1.8 (disparo de sweeper, deteccion de reservas vencidas y liberacion de stock) */
    addCombinedFragment(pkg, diagram, "opt", "[Barrido de Expiracion y Liberacion de Stock]", 160, 1700, -120, -560);

    addMessage(uiPanel, ctrlSweeper,
        "1.1: POST /reservations/sweeper", false, step++);

    addMessage(ctrlSweeper, entReserva,
        "1.2: identificarVencidas(expires_at <= today)", false, step++);

    addMessage(entReserva, ctrlSweeper,
        "1.3: return()", true, step++);

    addMessage(ctrlSweeper, entInventory,
        "1.4: decrementarReservedQuantity(item.quantity)", false, step++);

    addMessage(entInventory, ctrlSweeper,
        "1.5: return()", true, step++);

    addMessage(ctrlSweeper, entReserva,
        "1.6: update(status='expired')", false, step++);

    addMessage(entReserva, ctrlSweeper,
        "1.7: return()", true, step++);

    addMessage(ctrlSweeper, uiPanel,
        "1.8: HTTP 200 OK (barridoConsolidado)", true, step++);

    /* -------------------------------------------------------------------------
     * 3. FASE 2: CONSULTA DE BANDEJA DE CONFLICTOS Y DIAGNOSTICO DE PERCHA
     * ------------------------------------------------------------------------- */
    addMessage(uiPanel, ctrlResolve,
        "2: listBranchConflicts(branch_id)", false, step++);

    addMessage(ctrlResolve, entReserva,
        "2.1: filter(branch_id, status='expired')", false, step++);

    addMessage(entReserva, ctrlResolve,
        "2.2: return()", true, step++);

    addMessage(ctrlResolve, entInventory,
        "2.3: calcularDisponibilidadPercha(quantity - reserved)", false, step++);

    addMessage(entInventory, ctrlResolve,
        "2.4: return()", true, step++);

    addMessage(ctrlResolve, uiPanel,
        "2.5: return(conflictosConStock)", true, step++);

    addMessage(uiPanel, actorEncargado,
        "2.6: renderizarDiagnosticoPercha()", true, step++);

    /* -------------------------------------------------------------------------
     * 4. FASE 3: APERTURA DE MODAL Y SELECCION DE ESTRATEGIA
     * ------------------------------------------------------------------------- */
    addMessage(actorEncargado, uiPanel,
        "3: abrirReservaVencida(res_id)", false, step++);

    addMessage(uiPanel, uiModal,
        "3.1: open(can_reactivate)", false, step++);

    addMessage(actorEncargado, uiModal,
        "3.2: seleccionarVia(reactivar|sustituir|anular, notas)", false, step++);

    addMessage(uiModal, ctrlResolve,
        "3.3: POST /resolve-conflict (payload)", false, step++);

    // Autollamada en Controller: validacion de justificacion obligatoria (min. 5 chars)
    addMessage(ctrlResolve, ctrlResolve,
        "3.4: validarJustificacion() [notas >= 5 chars]", false, step++);

    /* -------------------------------------------------------------------------
     * 5. FASE 4: DECISION Y EJECUCION TRANSACCIONAL (FRAGMENTOS ALT)
     * ------------------------------------------------------------------------- */
    /* FRAGMENTO ALT: Estrategia 1 - Reactivacion con Re-bloqueo (+24h/48h)
     * Abarca: 3.5 a 3.8 (bloqueo atomico con with_for_update y extension de vigencia) */
    addCombinedFragment(pkg, diagram, "alt", "[Estrategia 1: Reactivacion con Re-bloqueo]", 880, 1700, -1350, -1580);

    addMessage(ctrlResolve, entInventory,
        "3.5: with_for_update(reserved_quantity += qty)", false, step++);

    addMessage(entInventory, ctrlResolve,
        "3.6: return()", true, step++);

    addMessage(ctrlResolve, entReserva,
        "3.7: reactivarReserva(expires_at, resolution_note)", false, step++);

    addMessage(entReserva, ctrlResolve,
        "3.8: return()", true, step++);

    /* FRAGMENTO ALT: Estrategia 2 - Sustitucion por Variante Alternativa
     * Abarca: 3.9 a 3.12 (reasignacion de item y re-bloqueo de nueva variante) */
    addCombinedFragment(pkg, diagram, "alt", "[Estrategia 2: Sustitucion por Variante]", 880, 1700, -1600, -1830);

    addMessage(ctrlResolve, entItem,
        "3.9: reasignarVarianteSustituta(new_variant_id)", false, step++);

    addMessage(entItem, ctrlResolve,
        "3.10: return()", true, step++);

    addMessage(ctrlResolve, entInventory,
        "3.11: with_for_update(reserved_quantity += new_qty)", false, step++);

    addMessage(entInventory, ctrlResolve,
        "3.12: return()", true, step++);

    /* FRAGMENTO ALT: Estrategia 3 - Cierre Definitivo / Anulacion
     * Abarca: 3.13 a 3.14 (cancelacion y registro formal de auditoria) */
    addCombinedFragment(pkg, diagram, "alt", "[Estrategia 3: Cierre Definitivo / Anulacion]", 880, 1700, -1850, -2020);

    addMessage(ctrlResolve, entReserva,
        "3.13: anularReservaConAuditoria(resolution_note)", false, step++);

    addMessage(entReserva, ctrlResolve,
        "3.14: return()", true, step++);

    /* -------------------------------------------------------------------------
     * 6. FINALIZACION Y RESPUESTA A INTERFAZ
     * ------------------------------------------------------------------------- */
    addMessage(ctrlResolve, uiModal,
        "3.15: return()", true, step++);

    addMessage(uiModal, uiPanel,
        "3.16: cerrarModalYRefrescar()", false, step++);

    addMessage(uiPanel, actorEncargado,
        "3.17: renderizarResolucionExitosa()", true, step++);

    /* Guardar y abrir diagrama de forma segura */
    stretchActorLifeline(diagram, actorEncargado, -2500);
    diagram.Update();
    if (Repo != null) {
        Repo.SaveDiagram(diagram.DiagramID);
        Repo.ReloadDiagram(diagram.DiagramID);
        Repo.OpenDiagram(diagram.DiagramID);
    }

    log("Diagrama '" + DIAGRAM_NAME + "' generado y abierto correctamente.");
    try { Session.Prompt("¡Diagrama de Secuencia CU12 (Enfoque A) generado con exito!", 0); } catch (e) { }
}

main();
