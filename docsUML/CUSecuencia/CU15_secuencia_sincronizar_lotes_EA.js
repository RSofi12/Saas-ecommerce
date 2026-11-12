/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU15 - Sincronizar Lotes de Ventas Offline con Idempotencia Central
 * DESCRIPCION: Sincronización masiva de ventas de mostrador generadas en contingencia desconectada.
 *              - Actores: Cajero (operador de caja) y SyncEngine (monitor de red/sincronización).
 *              - Fronteras: CajaPageComponent (bandeja outbox) e IdbSalesService (almacén local IndexedDB).
 *              - Controladores: OfflineSyncRoutes (API REST FastAPI) y OfflineSyncService (Servicio de Dominio).
 *              - Entidades: SyncOperation, Sale, SaleItem, Inventory.
 *              - Garantía: Idempotencia transaccional absoluta y protección contra duplicados y quiebres.
 * ACTORES: Cajero, SyncEngine
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 *
 * NORMAS Y PAUTAS APLICADAS:
 * - Participantes rectangulares Sequence con estereotipos <<Actor>>, <<boundary>>, <<control>>, <<entity>>.
 * - Numeración jerárquica y correlativa estricta ("1: ...()", "1.1: ...()", etc.) con métodos sin parámetros ().
 * - Regla sagrada BCE: Actor solo se comunica con Boundary, Boundary con Controller/Actor,
 *   Controller con Boundary/Controller/Entity, Entity solo con Controller (sin cruces entre entidades).
 * - SyncEngine monitorea conectividad comunicándose con Boundary (IdbSalesService).
 * - Fragmentos combinados nativos InteractionFragment:
 *     * opt [Sincronización por Lote de Ventas Offline]
 *     * alt [Idempotencia: Operación no registrada previa (Procesar)]
 *     * loop [Por cada ítem de venta]
 *     * alt [else: Operación ya registrada (Idempotente duplicada)]
 * - Extensión de líneas de vida con stretchLifeline para evitar líneas cortadas.
 * - Auto-guardado y apertura con Repo.SaveDiagram, Repo.ReloadDiagram y Repo.OpenDiagram.
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU15 - Secuencia Sincronizar Lotes de Ventas Offline";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU15-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-2150;", "");
    dObj.ElementID = el.ElementID;
    dObj.Update();
    return el;
}

/**
 * Agrega participante con encabezado Sequence (Boundary, Controller).
 */
function addParticipant(pkg, diagram, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) {
        el.Stereotype = stereotype;
    }
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2100;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

/**
 * Agrega participantes Entidades en recuadro estandar Sequence.
 */
function addEntityParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    el.Stereotype = "Entity" + String.fromCharCode(160);
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2100;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

/**
 * Agrega mensaje de secuencia con SequenceNo estricto para ordenamiento vertical.
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
 * Agrega fragmentos combinados UML nativos (opt, alt, loop).
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
 * Extiende la linea de vida de cualquier participante hasta el final del diagrama.
 */
function stretchLifeline(diagram, element, bottomY) {
    for (var i = 0; i < diagram.DiagramObjects.Count; i++) {
        var dObj = diagram.DiagramObjects.GetAt(i);
        if (dObj.ElementID == element.ElementID) {
            dObj.Bottom = bottomY || -2150;
            dObj.Update();
            return;
        }
    }
}

function Main() {
    log("Iniciando generacion de Diagrama de Secuencia CU15...");

    var pkg = getTargetPackage();
    if (pkg == null) {
        log("ERROR: No se encontro un paquete destino valido.");
        return;
    }

    var diag = recreateDiagram(pkg);

    /* -------------------------------------------------------------------------
     * 1. PARTICIPANTES BCE (DISTRIBUCION HORIZONTAL)
     * Actores -> Boundaries -> Controllers -> Entities
     * ------------------------------------------------------------------------- */
    var actorCajero   = addActorParticipant(pkg, diag, "Cajero",       30,  80);
    var actorSync     = addActorParticipant(pkg, diag, "SyncEngine",   140,  90);

    var uiCaja        = addParticipant(pkg, diag, ":CajaPageComponent", "Boundary", 260, 140);
    var uiIdb         = addParticipant(pkg, diag, ":IdbSalesService",   "Boundary", 430, 130);

    var ctrlRoutes    = addParticipant(pkg, diag, ":OfflineSyncRoutes",  "Controller", 590, 135);
    var ctrlService   = addParticipant(pkg, diag, ":OfflineSyncService", "Controller", 755, 140);

    var entSyncOp     = addEntityParticipant(pkg, diag, ":SyncOperation", 925, 110);
    var entSale       = addEntityParticipant(pkg, diag, ":Sale",          1065,  80);
    var entSaleItem   = addEntityParticipant(pkg, diag, ":SaleItem",      1175,  85);
    var entInventory  = addEntityParticipant(pkg, diag, ":Inventory",     1290,  95);

    pkg.Elements.Refresh();
    diag.DiagramObjects.Refresh();

    var seq = 1;

    /* -------------------------------------------------------------------------
     * FASE 1: DETECCION DE RECONEXION Y LECTURA DE OUTBOX LOCAL
     * Regla BCE: Actor solo se comunica con Boundary; SyncEngine monitorea conectividad
     * ------------------------------------------------------------------------- */
    addMessage(actorCajero, uiCaja, "1: iniciarSincronizacionManual()", false, seq++);
    addMessage(actorSync, uiIdb, "1.1: detectarConectividadOnline()", false, seq++);
    addMessage(uiCaja, uiIdb, "1.2: getPendingOfflineSales()", false, seq++);
    addMessage(uiIdb, uiCaja, "1.3: retornarVentasPendientes()", true, seq++);

    /* -------------------------------------------------------------------------
     * FASE 2: SINCRONIZACION POR LOTE CON IDEMPOTENCIA CENTRAL (FRAGMENTO OPT)
     * ------------------------------------------------------------------------- */
    addCombinedFragment(pkg, diag, "opt", "[Sincronización por Lote de Ventas Offline]", 240, 1400, -380, -1880);

    addMessage(uiCaja, ctrlRoutes, "2: batch_sync_sales_endpoint()", false, seq++);
    addMessage(ctrlRoutes, ctrlService, "2.1: sync_offline_sales_batch()", false, seq++);

    // Verificacion previa de idempotencia en sync_operations
    addMessage(ctrlService, entSyncOp, "2.2: findByClientOperationId()", false, seq++);
    addMessage(entSyncOp, ctrlService, "2.3: retornarRegistroOperacion()", true, seq++);

    /* -------------------------------------------------------------------------
     * BIFURCACION ALT: PROCESAMIENTO NUEVO VS. DUPLICADO IDEMPOTENTE
     * ------------------------------------------------------------------------- */
    // Rama Principal: Operacion no registrada previa (Procesar con insercion y descuento)
    addCombinedFragment(pkg, diag, "alt", "[Idempotencia: Operación no registrada previa (Procesar)]", 730, 1400, -660, -1450);

    addMessage(ctrlService, entInventory, "2.4a: lockAndCheckStock()", false, seq++);
    addMessage(entInventory, ctrlService, "2.5a: stockVerificado()", true, seq++);

    addMessage(ctrlService, entSale, "2.6a: createOrUpdateSale()", false, seq++);
    addMessage(entSale, ctrlService, "2.7a: ventaConsolidada()", true, seq++);

    // Sub-fragmento LOOP: Por cada ítem de venta
    addCombinedFragment(pkg, diag, "loop", "[Por cada ítem de venta]", 740, 1280, -980, -1220);
    addMessage(ctrlService, entSaleItem, "2.8a: registrarItemsVentaCentral()", false, seq++);
    addMessage(entSaleItem, ctrlService, "2.9a: itemsRegistrados()", true, seq++);

    addMessage(ctrlService, entSyncOp, "2.10a: recordSyncOperation()", false, seq++);
    addMessage(entSyncOp, ctrlService, "2.11a: syncAuditPersistida()", true, seq++);

    // Rama Alternativa: Operacion ya registrada (Idempotente duplicada sin doble descuento)
    addCombinedFragment(pkg, diag, "alt", "[else: Operación ya registrada (Idempotente duplicada)]", 730, 930, -1490, -1700);

    addMessage(ctrlService, ctrlService, "2.4b: omitirInsercionYDescuento()", false, seq++);
    addMessage(ctrlService, ctrlService, "2.5b: confirmarOperacionPreviaExitosa()", false, seq++);

    /* -------------------------------------------------------------------------
     * FASE 3: RESPUESTA DE LOTE, CONCILIACION LOCAL Y NOTIFICACION AL CAJERO
     * ------------------------------------------------------------------------- */
    addMessage(ctrlService, ctrlRoutes, "2.12: BatchSyncResultResponse()", true, seq++);
    addMessage(ctrlRoutes, uiCaja, "2.13: response200OK()", true, seq++);
    addMessage(uiCaja, uiIdb, "2.14: markSalesAsSynced()", false, seq++);
    addMessage(uiCaja, actorCajero, "3: mostrarResumenAuditoriaSincronizacion()", true, seq++);

    /* -------------------------------------------------------------------------
     * EXTENSION DE LINEAS DE VIDA HASTA EL PIE DEL DIAGRAMA
     * ------------------------------------------------------------------------- */
    stretchLifeline(diag, actorCajero,  -2150);
    stretchLifeline(diag, actorSync,    -2150);
    stretchLifeline(diag, uiCaja,       -2150);
    stretchLifeline(diag, uiIdb,        -2150);
    stretchLifeline(diag, ctrlRoutes,   -2150);
    stretchLifeline(diag, ctrlService,  -2150);
    stretchLifeline(diag, entSyncOp,    -2150);
    stretchLifeline(diag, entSale,      -2150);
    stretchLifeline(diag, entSaleItem,  -2150);
    stretchLifeline(diag, entInventory, -2150);

    diag.Update();
    if (Repo != null) {
        Repo.SaveDiagram(diag.DiagramID);
        Repo.ReloadDiagram(diag.DiagramID);
        try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }
    }

    log("Diagrama de Secuencia CU15 generado exitosamente. ID: " + diag.DiagramID);
    try { Session.Prompt("¡Diagrama de Secuencia CU15 generado con exito en Enterprise Architect!", 0); } catch (e) { }
}

Main();
