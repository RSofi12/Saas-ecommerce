/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU14 - Gestionar Bandeja Local de Operaciones Pendientes (Outbox PWA / SQLite)
 * DESCRIPCION: Inspeccion, arqueo de efectivo en gaveta física, verificacion de estado 
 *              contra el servidor central (POST /api/sales/offline/check-status), 
 *              sincronizacion unitaria y depuracion de transacciones consolidadas.
 * ACTOR: Cajero
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 *
 * NORMAS Y PAUTAS APLICADAS:
 * - Participantes con ICONOS BCE NATIVOS de Enterprise Architect (Boundary, Control, Entity)
 *   en lugar de recuadros rectangulares genericos (ShowRobustness=1, usecustomart=1).
 * - Funciones sin parametros () segun directriz UML de catedra.
 * - Sin bucles redundantes sobre Fronteras (las operaciones de cálculo residen en Controllers).
 * - Sin cruces horizontales entre entidades (comunicacion exclusiva Controller -> Entity).
 * - Retornos unicamente hacia el Controller o la Interface.
 * - Fragmentos combinados opt para verificacion remota, sincronizacion y purga.
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU14 - Gestionar Bandeja Local Outbox";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU14-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
 * Recrea el diagrama limpio habilitando simbolos de robustez nativos (ShowRobustness=1).
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
        // ShowRobustness=1 fuerza a Enterprise Architect a mostrar los iconos BCE en las cabeceras de linea de vida
        diagram.StyleEx = "ShowRobustness=1;SequenceCustomArt=1;";
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
 * Agrega participante con icono nativo BCE (Boundary, Control, Entity) usando stereotipo oficial.
 */
function addBCEParticipant(pkg, diagram, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) {
        el.Stereotype = stereotype;
    }
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2350;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=1;";
    dObj.Update();
    return el;
}

/**
 * Agrega mensaje de secuencia con SequenceNo estricto para ordenamiento vertical perfecto.
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
 * Agrega fragmentos combinados UML (opt, alt, loop).
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
 * Extiende la linea de vida de un elemento.
 */
function stretchLifeline(diagram, element, bottomY) {
    for (var i = 0; i < diagram.DiagramObjects.Count; i++) {
        var dObj = diagram.DiagramObjects.GetAt(i);
        if (dObj.ElementID == element.ElementID) {
            dObj.Bottom = bottomY || -2400;
            dObj.Update();
            return;
        }
    }
}

function Main() {
    if (Repo == null) {
        log("Error: No se pudo conectar a Enterprise Architect.");
        return;
    }

    log("Iniciando generacion de Diagrama de Secuencia CU14 (Cajero)...");

    var pkg = getTargetPackage();
    if (pkg == null) return;

    var diagram = recreateDiagram(pkg);

    // 1. Participantes con Iconos Propios BCE (Actor, Boundary, Control, Entity)
    var actorCajero    = addActorParticipant(pkg, diagram, "Cajero",     40,  90);
    var uiCaja         = addBCEParticipant(pkg, diagram, "CajaPageComponent",         "boundary", 200, 110);
    var uiModalTicket  = addBCEParticipant(pkg, diagram, "TicketContingenciaModal",  "boundary", 370, 120);
    var ctrlIdbSales   = addBCEParticipant(pkg, diagram, "IdbSalesService",          "control",  550, 110);
    var entLocalSale   = addBCEParticipant(pkg, diagram, "LocalPendingSale",         "entity",   720, 110);
    var ctrlSalesApi   = addBCEParticipant(pkg, diagram, "SalesApiService",          "control",  890, 110);
    var ctrlBackend    = addBCEParticipant(pkg, diagram, "SalesService",             "control", 1060, 100);
    var entCentralSale = addBCEParticipant(pkg, diagram, "Sale",                     "entity",  1220,  90);

    var seq = 1;

    // =========================================================================
    // FASE 1: Apertura de Pestaña Outbox y Consulta de Arqueo Local en Gaveta
    // =========================================================================
    addMessage(actorCajero, uiCaja, "1: switchTab()", false, seq++);
    addMessage(uiCaja, ctrlIdbSales, "1.1: getPending()", false, seq++);
    addMessage(ctrlIdbSales, entLocalSale, "1.2: getAll()", false, seq++);
    addMessage(entLocalSale, ctrlIdbSales, "1.3: pendingOfflineSales", true, seq++);
    addMessage(ctrlIdbSales, ctrlIdbSales, "1.4: totalPendingCash()", false, seq++);
    addMessage(ctrlIdbSales, uiCaja, "1.5: outboxData", true, seq++);
    addMessage(uiCaja, actorCajero, "1.6: renderizarBandejaOutbox()", true, seq++);

    // =========================================================================
    // FASE 2: Inspeccion Detallada de Ticket Térmico con UUIDv4
    // =========================================================================
    addMessage(actorCajero, uiCaja, "2: openSaleDetail()", false, seq++);
    addMessage(uiCaja, uiModalTicket, "2.1: renderizarTicketTermico()", false, seq++);
    addMessage(uiModalTicket, actorCajero, "2.2: presentarTicketContingencia()", true, seq++);

    // =========================================================================
    // FASE 3: Verificacion y Conciliacion de Estado contra Servidor Central
    // =========================================================================
    addCombinedFragment(pkg, diagram, "opt", "Verificacion de Estado contra Servidor Central (check-status)", 180, 1270, -780, -1280);

    addMessage(actorCajero, uiCaja, "3: checkOutboxStatusWithServer()", false, seq++);
    addMessage(uiCaja, ctrlSalesApi, "3.1: checkOfflineStatus()", false, seq++);
    addMessage(ctrlSalesApi, ctrlBackend, "3.2: POST /api/sales/offline/check-status", false, seq++);
    addMessage(ctrlBackend, entCentralSale, "3.3: check_offline_sales_status()", false, seq++);
    addMessage(entCentralSale, ctrlBackend, "3.4: salesRecords", true, seq++);
    addMessage(ctrlBackend, ctrlSalesApi, "3.5: HTTP 200 OK (status_map)", true, seq++);
    addMessage(ctrlSalesApi, uiCaja, "3.6: status_map", true, seq++);
    addMessage(uiCaja, ctrlIdbSales, "3.7: markAsSynced()", false, seq++);
    addMessage(ctrlIdbSales, entLocalSale, "3.8: put()", false, seq++);
    addMessage(uiCaja, actorCajero, "3.9: renderizarEstadoConciliado()", true, seq++);

    // =========================================================================
    // FASE 4: Sincronizacion Unitaria de Venta desde la Bandeja
    // =========================================================================
    addCombinedFragment(pkg, diagram, "opt", "Sincronizacion de Comprobante Individual / Lote", 180, 1270, -1330, -1820);

    addMessage(actorCajero, uiCaja, "4: syncSingleSale()", false, seq++);
    addMessage(uiCaja, ctrlSalesApi, "4.1: createSale()", false, seq++);
    addMessage(ctrlSalesApi, ctrlBackend, "4.2: POST /api/sales/", false, seq++);
    addMessage(ctrlBackend, entCentralSale, "4.3: create_sale()", false, seq++);
    addMessage(entCentralSale, ctrlBackend, "4.4: saleSaved", true, seq++);
    addMessage(ctrlBackend, ctrlSalesApi, "4.5: HTTP 201 Created", true, seq++);
    addMessage(ctrlSalesApi, uiCaja, "4.6: Sale", true, seq++);
    addMessage(uiCaja, ctrlIdbSales, "4.7: markAsSynced()", false, seq++);
    addMessage(ctrlIdbSales, entLocalSale, "4.8: put()", false, seq++);
    addMessage(uiCaja, actorCajero, "4.9: notificarSincronizacionExitosa()", true, seq++);

    // =========================================================================
    // FASE 5: Purga de Comprobantes Consolidados
    // =========================================================================
    addCombinedFragment(pkg, diagram, "opt", "Purga de Comprobantes Sincronizados y Arqueo", 180, 800, -1870, -2280);

    addMessage(actorCajero, uiCaja, "5: clearSyncedFromOutbox()", false, seq++);
    addMessage(uiCaja, ctrlIdbSales, "5.1: clearSynced()", false, seq++);
    addMessage(ctrlIdbSales, entLocalSale, "5.2: delete()", false, seq++);
    addMessage(entLocalSale, ctrlIdbSales, "5.3: recordsDeleted", true, seq++);
    addMessage(ctrlIdbSales, uiCaja, "5.4: return", true, seq++);
    addMessage(uiCaja, actorCajero, "5.5: renderizarBandejaDepurada()", true, seq++);

    // 3. Estirar todas las lineas de vida hasta el pie del diagrama
    stretchLifeline(diagram, actorCajero,    -2400);
    stretchLifeline(diagram, uiCaja,         -2400);
    stretchLifeline(diagram, uiModalTicket,  -2400);
    stretchLifeline(diagram, ctrlIdbSales,   -2400);
    stretchLifeline(diagram, entLocalSale,   -2400);
    stretchLifeline(diagram, ctrlSalesApi,   -2400);
    stretchLifeline(diagram, ctrlBackend,    -2400);
    stretchLifeline(diagram, entCentralSale, -2400);

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    Repo.OpenDiagram(diagram.DiagramID);

    log("¡Diagrama de Secuencia CU14 actualizado con éxito!");
    try { Session.Prompt("¡Diagrama de Secuencia CU14 generado con éxito en Enterprise Architect!", 0); } catch (e) { }
}

Main();
