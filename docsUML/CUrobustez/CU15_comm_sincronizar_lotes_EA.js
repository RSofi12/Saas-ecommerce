// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU15 - Sincronizar Lotes de Ventas Offline con Idempotencia Central
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Cajero, SyncEngine
//   Boundary: CajaPageComponent, IdbSalesService (Object, «boundary»)
//   Control: OfflineSyncRoutes, OfflineSyncService (Object, «control»)
//   Entity: SyncOperation, Sale, SaleItem, Inventory (Object, «entity»)
//
// Reglas Metodológicas Estrictas:
//   - Todas las funciones se expresan con paréntesis vacíos () sin parámetros internos.
//   - Cero bucles o validaciones sobre Fronteras (las validaciones residen en Controllers).
//   - Conectores independientes para permitir ordenación y ajuste libre en EA.
// ============================================================================

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function Log(msg) {
    try { Session.Output("[FashionStore-EA] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
}

function crearElementoConEsterotipo(pkg, name, tipo, estereotipo) {
    for (var i = 0; i < pkg.Elements.Count; i++) {
        var el = pkg.Elements.GetAt(i);
        if (el.Name == name && el.Type == tipo) {
            if (estereotipo && el.Stereotype != estereotipo) {
                el.Stereotype = estereotipo;
                el.Update();
            }
            return el;
        }
    }
    var newEl = pkg.Elements.AddNew(name, tipo);
    if (estereotipo && estereotipo.length > 0) {
        newEl.Stereotype = estereotipo;
    }
    newEl.Update();
    pkg.Elements.Refresh();
    return newEl;
}

function crearDiagramaLimpio(pkg, name, tipo) {
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
    var newDiag = pkg.Diagrams.AddNew(name, tipo);
    newDiag.Update();
    pkg.Diagrams.Refresh();
    return newDiag;
}

function colocarElemento(diagram, element, left, right, top, bottom) {
    var diagObj = diagram.DiagramObjects.AddNew("", "");
    diagObj.ElementID = element.ElementID;
    diagObj.left = left;
    diagObj.right = right;
    diagObj.top = top;
    diagObj.bottom = bottom;
    diagObj.Update();
    return diagObj;
}

function crearMensaje(sourceEl, targetEl, label) {
    var connector = sourceEl.Connectors.AddNew("", "Communication");
    connector.SupplierID = targetEl.ElementID;
    connector.Direction = "Source -> Destination";
    connector.Update();
    sourceEl.Connectors.Refresh();

    for (var i = 0; i < connector.Messages.Count; i++) {
        var m = connector.Messages.GetAt(i);
        if (m.Name == label) return connector;
    }
    var msg = connector.Messages.AddNew(label, "Message");
    msg.Update();
    connector.Messages.Refresh();
    return connector;
}

function Main() {
    if (Repo == null) {
        Log("ERROR: No se pudo conectar con Enterprise Architect.");
        return;
    }

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        var models = Repo.Models;
        pkg = (models.Count > 0) ? models.GetAt(0) : null;
    }
    if (pkg == null) {
        Log("ERROR: No se encontró un paquete en EA.");
        return;
    }

    // 1. Elementos ICONIX
    var actorCajero    = crearElementoConEsterotipo(pkg, "Cajero", "Actor", "");
    var actorSync      = crearElementoConEsterotipo(pkg, "SyncEngine", "Actor", "");

    var uiCaja         = crearElementoConEsterotipo(pkg, "CajaPageComponent", "Object", "boundary");
    var uiIdb          = crearElementoConEsterotipo(pkg, "IdbSalesService", "Object", "boundary");

    var ctrlRoutes     = crearElementoConEsterotipo(pkg, "OfflineSyncRoutes", "Object", "control");
    var ctrlService    = crearElementoConEsterotipo(pkg, "OfflineSyncService", "Object", "control");

    var entSyncOp      = crearElementoConEsterotipo(pkg, "SyncOperation", "Object", "entity");
    var entSale        = crearElementoConEsterotipo(pkg, "Sale", "Object", "entity");
    var entSaleItem    = crearElementoConEsterotipo(pkg, "SaleItem", "Object", "entity");
    var entInventory   = crearElementoConEsterotipo(pkg, "Inventory", "Object", "entity");

    // 2. Diagrama
    var diagName = "CU15 - Comunicación Sincronizar Lotes de Ventas Offline";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Posicionamiento
    colocarElemento(diagram, actorCajero,   30,  120, -120, -200);
    colocarElemento(diagram, actorSync,     30,  120, -270, -350);

    colocarElemento(diagram, uiCaja,       240,  360,  -60, -140);
    colocarElemento(diagram, uiIdb,        240,  370, -200, -280);

    colocarElemento(diagram, ctrlRoutes,   480,  600, -120, -200);
    colocarElemento(diagram, ctrlService,  680,  800, -120, -200);

    colocarElemento(diagram, entSyncOp,    900,  990,  -30, -100);
    colocarElemento(diagram, entSale,      900,  990, -110, -180);
    colocarElemento(diagram, entSaleItem,  900,  990, -190, -260);
    colocarElemento(diagram, entInventory, 900,  990, -270, -340);

    // 4. Mensajes y Flujos
    crearMensaje(actorCajero, uiCaja, "1: iniciarSincronizacionLote()");
    crearMensaje(actorSync, uiIdb, "2: detectarConectividadOnline()");
    crearMensaje(uiCaja, uiIdb, "3: leerVentasPendientesIndexedDB()");
    crearMensaje(uiCaja, ctrlRoutes, "4: batch_sync_sales_endpoint()");

    crearMensaje(ctrlRoutes, ctrlService, "5: sync_offline_sales_batch()");
    crearMensaje(ctrlService, entSyncOp, "6: verificarIdempotenciaOperacion()");
    crearMensaje(ctrlService, entSale, "7: validarVentaExistenteUUID()");

    crearMensaje(ctrlService, entInventory, "8: verificarStockCentralYDescontar()");
    crearMensaje(ctrlService, entSale, "9: consolidarVentaSincronizada()");
    crearMensaje(ctrlService, entSaleItem, "10: registrarItemsVentaCentral()");
    crearMensaje(ctrlService, entSyncOp, "11: persistirRegistroSync()");

    diagram.Update();
    Repo.ReloadDiagram(diagram.DiagramID);
    Log("Diagrama de Comunicación CU15 creado con éxito. ID: " + diagram.DiagramID);
}

Main();
