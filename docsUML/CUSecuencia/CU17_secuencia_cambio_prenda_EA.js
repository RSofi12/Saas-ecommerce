/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU17 - Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Estado
 * DESCRIPCION: Cambio físico de prenda por diferente talla o modelo en mostrador de tienda física.
 *              - Actores: Cliente (iniciador presencial) y Cajero (operador de caja).
 *              - Fronteras: CajaPageComponent y GarmentExchangeModalComponent.
 *              - Controladores: GarmentExchangeRoutes (FastAPI) y GarmentExchangeService (Dominio).
 *              - Entidades: GarmentExchange, Sale, SaleItem, Inventory.
 *              - Regla de Negocio Sagrada (Política 1): Si precio nueva > precio original,
 *                el cambio se consolida ÚNICAMENTE si el cliente abona la diferencia de precio.
 *                Prenda debe contar con etiqueta intacta (good_with_tags).
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU17 - Secuencia Cambio de Prenda y Cobro de Diferencia";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU17-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
    log("Iniciando generación de diagrama de secuencia CU17...");

    var pkg = getTargetPackage();
    if (pkg == null) {
        log("ERROR: No se encontró un paquete destino válido.");
        return;
    }

    var actorCliente    = getOrCreateElement(pkg, "Cliente", "Actor", "");
    var actorCajero     = getOrCreateElement(pkg, "Cajero", "Actor", "");
    var uiCaja          = getOrCreateElement(pkg, "CajaPageComponent", "Sequence", "boundary");
    var uiModalCambio   = getOrCreateElement(pkg, "GarmentExchangeModalComponent", "Sequence", "boundary");
    var ctrlRoutes      = getOrCreateElement(pkg, "GarmentExchangeRoutes", "Sequence", "control");
    var ctrlService     = getOrCreateElement(pkg, "GarmentExchangeService", "Sequence", "control");
    var entExchange     = getOrCreateElement(pkg, "GarmentExchange", "Sequence", "entity");
    var entSale         = getOrCreateElement(pkg, "Sale", "Sequence", "entity");
    var entInventory    = getOrCreateElement(pkg, "Inventory", "Sequence", "entity");

    var diagram = createCleanDiagram(pkg, DIAGRAM_NAME);

    var startX = 40;
    var stepX = 140;
    var width = 90;

    layoutLifeline(diagram, actorCliente,   startX + (stepX * 0), width);
    layoutLifeline(diagram, actorCajero,    startX + (stepX * 1), width);
    layoutLifeline(diagram, uiCaja,         startX + (stepX * 2), width);
    layoutLifeline(diagram, uiModalCambio,  startX + (stepX * 3), width);
    layoutLifeline(diagram, ctrlRoutes,     startX + (stepX * 4), width);
    layoutLifeline(diagram, ctrlService,    startX + (stepX * 5), width);
    layoutLifeline(diagram, entExchange,    startX + (stepX * 6), width);
    layoutLifeline(diagram, entSale,        startX + (stepX * 7), width);
    layoutLifeline(diagram, entInventory,   startX + (stepX * 8), width);

    var seq = 1;

    addSequenceMessage(diagram, actorCliente, actorCajero, "presentarPrendaYComprobante()", seq++, false);
    addSequenceMessage(diagram, actorCajero, uiCaja, "abrirModalCambio()", seq++, false);
    addSequenceMessage(diagram, uiCaja, uiModalCambio, "renderizarFormularioCambio()", seq++, false);

    addSequenceMessage(diagram, actorCajero, uiModalCambio, "solicitarCotizacionDiferencia()", seq++, false);
    addSequenceMessage(diagram, uiModalCambio, ctrlRoutes, "quote_exchange_endpoint()", seq++, false);
    addSequenceMessage(diagram, ctrlRoutes, ctrlService, "calculate_exchange_quote()", seq++, false);

    addSequenceMessage(diagram, ctrlService, entSale, "validarVentaOriginal()", seq++, false);
    addSequenceMessage(diagram, entSale, ctrlService, "datosVentaValidados()", seq++, true);

    addSequenceMessage(diagram, ctrlService, entInventory, "verificarStockNuevaTalla()", seq++, false);
    addSequenceMessage(diagram, entInventory, ctrlService, "stockDisponible()", seq++, true);

    addSequenceMessage(diagram, ctrlService, ctrlRoutes, "ExchangeQuoteResponse(difference_amount)", seq++, true);
    addSequenceMessage(diagram, ctrlRoutes, uiModalCambio, "mostrarDiferenciaPorCobrar()", seq++, true);

    addSequenceMessage(diagram, actorCliente, actorCajero, "entregarDineroDiferencia()", seq++, false);
    addSequenceMessage(diagram, actorCajero, uiModalCambio, "confirmarCobroYCondicionEtiqueta()", seq++, false);

    addSequenceMessage(diagram, uiModalCambio, ctrlRoutes, "process_exchange_endpoint()", seq++, false);
    addSequenceMessage(diagram, ctrlRoutes, ctrlService, "process_garment_exchange()", seq++, false);

    addSequenceMessage(diagram, ctrlService, entInventory, "lockAndSwapInventory(+1/-1)", seq++, false);
    addSequenceMessage(diagram, entInventory, ctrlService, "inventarioAjustado()", seq++, true);

    addSequenceMessage(diagram, ctrlService, entExchange, "createExchangeRecord()", seq++, false);
    addSequenceMessage(diagram, entExchange, ctrlService, "cambioPersistido()", seq++, true);

    addSequenceMessage(diagram, ctrlService, ctrlRoutes, "GarmentExchangeResponse()", seq++, true);
    addSequenceMessage(diagram, ctrlRoutes, uiModalCambio, "HTTP 201 Created", seq++, true);
    addSequenceMessage(diagram, uiModalCambio, actorCajero, "imprimirTicketCambioYEntrega()", seq++, true);
    addSequenceMessage(diagram, actorCajero, actorCliente, "entregarNuevaPrendaYComprobante()", seq++, true);

    diagram.Update();
    Repo.ReloadDiagram(diagram.DiagramID);
    log("Diagrama de Secuencia CU17 generado con éxito. ID: " + diagram.DiagramID);
}

Main();
