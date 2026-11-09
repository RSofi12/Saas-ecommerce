/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU15 - Sincronizar Lotes de Ventas Offline con Idempotencia Central
 * DESCRIPCION: Sincronización masiva de ventas de mostrador generadas en contingencia desconectada.
 *              - Actores: Cajero (operador de caja) y SyncEngine (monitor de red/sincronización).
 *              - Fronteras: CajaPageComponent (bandeja outbox) e IdbSalesService (almacén local).
 *              - Controladores: OfflineSyncRoutes (API REST FastAPI) y OfflineSyncService (Servicio de Dominio).
 *              - Entidades: SyncOperation, Sale, SaleItem, Inventory.
 *              - Garantía: Idempotencia transaccional y protección contra sobreventa/quiebre.
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
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

function getTargetPackage() {
    if (Repo == null) return null;
    var selectedPkg = Repo.GetTreeSelectedPackage();
    if (selectedPkg != null) {
        log("Usando paquete seleccionado en Project Browser: " + selectedPkg.Name);
        return selectedPkg;
    }

    var roots = Repo.Models;
    var root = (roots.Count > 0) ? roots.GetAt(0) : null;
    if (root == null) return null;

    for (var i = 0; i < root.Packages.Count; i++) {
        var pkg = root.Packages.GetAt(i);
        if (pkg.Name == DEFAULT_PACKAGE_NAME) return pkg;
    }

    var newPkg = root.Packages.AddNew(DEFAULT_PACKAGE_NAME, "");
    newPkg.Update();
    root.Packages.Refresh();
    return newPkg;
}

function getOrCreateElement(pkg, name, type, stereotype) {
    for (var i = 0; i < pkg.Elements.Count; i++) {
        var el = pkg.Elements.GetAt(i);
        if (el.Name == name && el.Type == type) {
            if (stereotype && el.Stereotype != stereotype) {
                el.Stereotype = stereotype;
                el.Update();
            }
            return el;
        }
    }
    var newEl = pkg.Elements.AddNew(name, type);
    if (stereotype && stereotype.length > 0) {
        newEl.Stereotype = stereotype;
    }
    newEl.Update();
    pkg.Elements.Refresh();
    return newEl;
}

function createCleanDiagram(pkg, name) {
    for (var i = pkg.Diagrams.Count - 1; i >= 0; i--) {
        var d = pkg.Diagrams.GetAt(i);
        if (d.Name == name) {
            for (var j = d.DiagramObjects.Count - 1; j >= 0; j--) {
                d.DiagramObjects.Delete(j);
            }
            for (var k = d.DiagramLinks.Count - 1; k >= 0; k--) {
                d.DiagramLinks.Delete(k);
            }
            d.DiagramObjects.Refresh();
            d.DiagramLinks.Refresh();
            d.Update();
            return d;
        }
    }
    var newDiag = pkg.Diagrams.AddNew(name, "Sequence");
    newDiag.Update();
    pkg.Diagrams.Refresh();
    return newDiag;
}

function addSequenceMessage(diagram, sourceEl, targetEl, name, seqNo, isReturn) {
    var con = sourceEl.Connectors.AddNew("", "Sequence");
    con.SupplierID = targetEl.ElementID;
    con.SequenceNo = seqNo;
    con.Update();
    sourceEl.Connectors.Refresh();

    var msg = con.Messages.AddNew(name, "Message");
    msg.SequenceNo = seqNo;
    if (isReturn) {
        msg.IsReturn = true;
    }
    msg.Update();
    con.Messages.Refresh();
    return con;
}

function layoutLifeline(diagram, element, left, width) {
    var diagObj = diagram.DiagramObjects.AddNew("", "");
    diagObj.ElementID = element.ElementID;
    diagObj.left = left;
    diagObj.right = left + width;
    diagObj.top = -50;
    diagObj.bottom = -800;
    diagObj.Update();
    return diagObj;
}

function Main() {
    log("Iniciando generación de diagrama de secuencia CU15...");

    var pkg = getTargetPackage();
    if (pkg == null) {
        log("ERROR: No se encontró un paquete destino válido.");
        return;
    }

    var actorCajero   = getOrCreateElement(pkg, "Cajero", "Actor", "");
    var actorSync     = getOrCreateElement(pkg, "SyncEngine", "Actor", "");
    var uiCaja        = getOrCreateElement(pkg, "CajaPageComponent", "Sequence", "boundary");
    var uiIdb         = getOrCreateElement(pkg, "IdbSalesService", "Sequence", "boundary");
    var ctrlRoutes    = getOrCreateElement(pkg, "OfflineSyncRoutes", "Sequence", "control");
    var ctrlService   = getOrCreateElement(pkg, "OfflineSyncService", "Sequence", "control");
    var entSyncOp     = getOrCreateElement(pkg, "SyncOperation", "Sequence", "entity");
    var entSale       = getOrCreateElement(pkg, "Sale", "Sequence", "entity");
    var entInventory  = getOrCreateElement(pkg, "Inventory", "Sequence", "entity");

    var diagram = createCleanDiagram(pkg, DIAGRAM_NAME);

    var startX = 40;
    var stepX = 140;
    var width = 90;

    layoutLifeline(diagram, actorCajero,  startX + (stepX * 0), width);
    layoutLifeline(diagram, actorSync,    startX + (stepX * 1), width);
    layoutLifeline(diagram, uiCaja,       startX + (stepX * 2), width);
    layoutLifeline(diagram, uiIdb,        startX + (stepX * 3), width);
    layoutLifeline(diagram, ctrlRoutes,   startX + (stepX * 4), width);
    layoutLifeline(diagram, ctrlService,  startX + (stepX * 5), width);
    layoutLifeline(diagram, entSyncOp,    startX + (stepX * 6), width);
    layoutLifeline(diagram, entSale,      startX + (stepX * 7), width);
    layoutLifeline(diagram, entInventory, startX + (stepX * 8), width);

    var seq = 1;

    addSequenceMessage(diagram, actorCajero, uiCaja, "iniciarSincronizacionManual()", seq++, false);
    addSequenceMessage(diagram, actorSync, uiIdb, "monitorearConectividad()", seq++, false);
    addSequenceMessage(diagram, uiCaja, uiIdb, "getPendingOfflineSales()", seq++, false);
    addSequenceMessage(diagram, uiIdb, uiCaja, "retornarVentasPendientes()", seq++, true);

    addSequenceMessage(diagram, uiCaja, ctrlRoutes, "batch_sync_sales_endpoint()", seq++, false);
    addSequenceMessage(diagram, ctrlRoutes, ctrlService, "sync_offline_sales_batch()", seq++, false);

    addSequenceMessage(diagram, ctrlService, entSyncOp, "findByClientOperationId()", seq++, false);
    addSequenceMessage(diagram, entSyncOp, ctrlService, "retornarRegistroOperacion()", seq++, true);

    addSequenceMessage(diagram, ctrlService, entInventory, "lockAndCheckStock()", seq++, false);
    addSequenceMessage(diagram, entInventory, ctrlService, "stockVerificado()", seq++, true);

    addSequenceMessage(diagram, ctrlService, entSale, "createOrUpdateSale()", seq++, false);
    addSequenceMessage(diagram, entSale, ctrlService, "ventaConsolidada()", seq++, true);

    addSequenceMessage(diagram, ctrlService, entSyncOp, "recordSyncOperation()", seq++, false);
    addSequenceMessage(diagram, entSyncOp, ctrlService, "syncAuditPersistida()", seq++, true);

    addSequenceMessage(diagram, ctrlService, ctrlRoutes, "BatchSyncResultResponse()", seq++, true);
    addSequenceMessage(diagram, ctrlRoutes, uiCaja, "HTTP 200 OK (Processed / Duplicates / Conflicts)", seq++, true);
    addSequenceMessage(diagram, uiCaja, uiIdb, "markSalesAsSynced()", seq++, false);
    addSequenceMessage(diagram, uiCaja, actorCajero, "mostrarResumenAuditoriaSincronizacion()", seq++, true);

    diagram.Update();
    Repo.ReloadDiagram(diagram.DiagramID);
    log("Diagrama de Secuencia CU15 generado con éxito. ID: " + diagram.DiagramID);
}

Main();
