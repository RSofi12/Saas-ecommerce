/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU13 - Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4
 * DESCRIPCION: Venta de mostrador POS cuando la sucursal pierde la conexion a Internet.
 *              Fase 1: Enforzamiento estricto de la Politica de Negocio 5 (cobro forzado en efectivo,
 *              bloqueo preventivo de metodos electronicos, calculo de cambio en tiempo real).
 *              Fase 2: Persistencia local en localStorage (clave fashionstore_pending_pos_sales)
 *              y emision de comprobante termico TCK-OFF-XXXXXX con hash de contingencia UUIDv4.
 *              No hay descuento de inventario local: el stock solo se descuenta en el backend
 *              durante la sincronizacion (2.6 a 2.11).
 *              Fase 3: Reconexion a red y sincronizacion automatica con backend FastAPI, verificando
 *              idempotencia por client_sale_id para evitar doble descuento central de inventario.
 * ACTOR: Cajero
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
 *     * opt [Modo Desconectado / Politica 5 Efectivo]: cobro exclusivo en efectivo y ticket local (1.1 a 1.9).
 *     * opt [Reconexion a Internet Detectada]: outbox sync reactiva con backend (2 a 2.16).
 *     * loop [Por cada item de la venta]: insercion central en SaleItem (2.10 a 2.11).
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU13 - Registrar Venta POS Desconectada";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU13-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
            dObj.Bottom = bottomY || -2400;
            dObj.Update();
            return;
        }
    }
}

function main() {
    log("Iniciando generacion de CU13 con arquitectura BCE y fragmentos...");

    var pkg = getTargetPackage();
    if (pkg == null) return;

    var diagram = recreateDiagram(pkg);

    /* -------------------------------------------------------------------------
     * 1. PARTICIPANTES BCE (DISTRIBUCION HORIZONTAL)
     * Actor -> Boundaries -> Controller Local -> Entities Locales 
     *       -> Controller Backend -> Entities Centrales
     * Cajero -> :CajaPageComponent, :TicketContingenciaModal
     *        -> :IdbSalesService
     *        -> :PendingOfflineSale
     *        -> :SalesService
     *        -> :Inventory, :Sale, :SaleItem
     * ------------------------------------------------------------------------- */
    var actorCajero         = addActorParticipant(pkg, diagram, "Cajero", 40, 90);
    var uiCaja              = addParticipant(pkg, diagram, ":CajaPageComponent",        "Interface", 180, 200);
    var uiModalTicket       = addParticipant(pkg, diagram, ":TicketContingenciaModal", "Interface", 420, 190);

    var ctrlLocal           = addParticipant(pkg, diagram, ":IdbSalesService",       "Controller", 650, 190);

    var entLocalSale        = addEntityParticipant(pkg, diagram, ":PendingOfflineSale", 880, 170);

    var ctrlBackend         = addParticipant(pkg, diagram, ":SalesService", "Controller", 1090, 160);

    var entCentralInventory = addEntityParticipant(pkg, diagram, ":Inventory", 1290, 130);
    var entCentralSale      = addEntityParticipant(pkg, diagram, ":Sale",      1460, 120);
    var entCentralItem      = addEntityParticipant(pkg, diagram, ":SaleItem",  1620, 120);

    var step = 1;

    /* -------------------------------------------------------------------------
     * 2. FASE 1: REGISTRO DE VENTA OFFLINE Y POLITICA 5 (SOLO EFECTIVO)
     * ------------------------------------------------------------------------- */
    addMessage(actorCajero, uiCaja,
        "1: submitSale()", false, step++);

    // Autollamada en Interface: verificacion de red efectiva
    addMessage(uiCaja, uiCaja,
        "1.1: isOfflineEffective()", false, step++);

    addMessage(uiCaja, uiCaja,
        "1.2: generarUUIDv4Contingencia()", false, step++);

    /* FRAGMENTO OPT: Modo Desconectado / Politica 5 Efectivo
     * Abarca: 1.3 a 1.9 (guardado local, cobro forzado en efectivo, ticket de contingencia) */
    addCombinedFragment(pkg, diagram, "opt", "[Modo Desconectado / Politica 5 Efectivo]", 160, 1070, -180, -780);

    addMessage(uiCaja, ctrlLocal,
        "1.3: savePending()", false, step++);

    // Autollamada en Controller Local: Politica 5 y calculo de cambio
    addMessage(ctrlLocal, ctrlLocal,
        "1.4: forzarPoliticaEfectivo()", false, step++);

    addMessage(ctrlLocal, ctrlLocal,
        "1.5: calcularCambioDevolver()", false, step++);

    addMessage(ctrlLocal, entLocalSale,
        "1.6: create()", false, step++);

    addMessage(entLocalSale, ctrlLocal,
        "1.7: pendingRecord()", true, step++);

    addMessage(ctrlLocal, uiModalTicket,
        "1.8: emitirTicketContingencia()", false, step++);

    addMessage(uiModalTicket, actorCajero,
        "1.9: renderizarTicketContingencia()", false, step++);

    /* -------------------------------------------------------------------------
     * 3. FASE 2: RECONEXION A INTERNET Y SINCRONIZACION IDEMPOTENTE
     * ------------------------------------------------------------------------- */
    /* FRAGMENTO OPT: Reconexion a Internet Detectada
     * Abarca: 2 a 2.16 (lectura de Outbox, validacion de idempotencia UUIDv4 en backend y confirmacion) */
    addCombinedFragment(pkg, diagram, "opt", "[Reconexion a Internet Detectada]", 160, 1760, -820, -1820);

    addMessage(uiCaja, ctrlLocal,
        "2: detectarReconexionInternet()", false, step++);

    // Autollamada en Controller Local: ejecucion de sincronizacion en background
    addMessage(ctrlLocal, ctrlLocal,
        "2.1: syncPendingSales()", false, step++);

    addMessage(ctrlLocal, entLocalSale,
        "2.2: getPending()", false, step++);

    addMessage(entLocalSale, ctrlLocal,
        "2.3: pendingList()", true, step++);

    addMessage(ctrlLocal, ctrlBackend,
        "2.4: POST /sales/offline/batch-sync", false, step++);

    // Autollamada en Backend Controller: idempotencia por client_sale_id
    addMessage(ctrlBackend, ctrlBackend,
        "2.5: validateIdempotency()", false, step++);

    addMessage(ctrlBackend, entCentralInventory,
        "2.6: with_for_update()", false, step++);

    addMessage(entCentralInventory, ctrlBackend,
        "2.7: lockResult()", true, step++);

    addMessage(ctrlBackend, entCentralSale,
        "2.8: create()", false, step++);

    addMessage(entCentralSale, ctrlBackend,
        "2.9: saleRecord()", true, step++);

    /* FRAGMENTO LOOP: Por cada item de la venta
     * Abarca: 2.10 a 2.11 (creacion central de items en base de datos) */
    addCombinedFragment(pkg, diagram, "loop", "[Por cada item de la venta]", 1070, 1760, -1350, -1510);

    addMessage(ctrlBackend, entCentralItem,
        "2.10: create()", false, step++);

    addMessage(entCentralItem, ctrlBackend,
        "2.11: itemRecord()", true, step++);

    addMessage(ctrlBackend, ctrlLocal,
        "2.12: HTTP 201 Created", true, step++);

    addMessage(ctrlLocal, entLocalSale,
        "2.13: markAsSynced()", false, step++);

    addMessage(entLocalSale, ctrlLocal,
        "2.14: syncedFlag()", true, step++);

    addMessage(ctrlLocal, uiCaja,
        "2.15: notificarSincronizacionExitosa()", false, step++);

    addMessage(uiCaja, actorCajero,
        "2.16: renderizarEstadoSincronizado()", false, step++);

    /* Guardar y abrir diagrama de forma segura */
    stretchActorLifeline(diagram, actorCajero, -2400);
    diagram.Update();
    if (Repo != null) {
        Repo.SaveDiagram(diagram.DiagramID);
        Repo.ReloadDiagram(diagram.DiagramID);
        Repo.OpenDiagram(diagram.DiagramID);
    }

    log("Diagrama '" + DIAGRAM_NAME + "' generado y abierto correctamente.");
    try { Session.Prompt("¡Diagrama de Secuencia CU13 generado con exito!", 0); } catch (e) { }
}

main();
