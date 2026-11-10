/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU17 - Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Estado
 * ACTOR: Cajero (Actor Principal)
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
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
    if (selectedPkg != null) return selectedPkg;
    var roots = Repo.Models;
    var root = (roots.Count > 0) ? roots.GetAt(0) : null;
    if (root == null) return null;
    for (var i = 0; i < root.Packages.Count; i++) {
        var p = root.Packages.GetAt(i);
        if (p.Name == DEFAULT_PACKAGE_NAME) return p;
    }
    var newPkg = root.Packages.AddNew(DEFAULT_PACKAGE_NAME, "Package");
    newPkg.Update();
    root.Packages.Refresh();
    return newPkg;
}

function recreateDiagram(pkg) {
    for (var i = pkg.Diagrams.Count - 1; i >= 0; i--) {
        var d = pkg.Diagrams.GetAt(i);
        if (d.Name == DIAGRAM_NAME) {
            pkg.Diagrams.Delete(i);
            pkg.Diagrams.Refresh();
            break;
        }
    }
    var diagram = pkg.Diagrams.AddNew(DIAGRAM_NAME, "Sequence");
    diagram.Update();
    pkg.Diagrams.Refresh();
    return diagram;
}

function addActorParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Actor");
    el.Update();
    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-1800;", "");
    dObj.ElementID = el.ElementID;
    dObj.Update();
    return el;
}

function addParticipant(pkg, diagram, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) el.Stereotype = stereotype;
    el.Update();
    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-1700;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

function addMessage(src, dst, label, isReturn, sequenceNo) {
    var con = src.Connectors.AddNew(label, "Sequence");
    con.SupplierID = dst.ElementID;
    if (isReturn) con.Stereotype = "return";
    if (sequenceNo) {
        try { con.SequenceNo = sequenceNo; } catch (e) { }
    }
    con.Update();
    return con;
}

function Main() {
    var pkg = getTargetPackage();
    if (pkg == null) return;
    var diag = recreateDiagram(pkg);

    var act = addActorParticipant(pkg, diag, "Cajero", 30, 90);
    var bndCaja = addParticipant(pkg, diag, "CajaPageComponent", "boundary", 150, 130);
    var bndModal = addParticipant(pkg, diag, "GarmentExchangeModalComponent", "boundary", 300, 130);
    var ctrlRoutes = addParticipant(pkg, diag, "GarmentExchangeRoutes", "control", 450, 110);
    var ctrlSvc = addParticipant(pkg, diag, "GarmentExchangeService", "control", 580, 110);
    var entExchange = addParticipant(pkg, diag, "GarmentExchange", "entity", 710, 80);
    var entSale = addParticipant(pkg, diag, "Sale", "entity", 810, 80);
    var entItem = addParticipant(pkg, diag, "SaleItem", "entity", 910, 80);
    var entInv = addParticipant(pkg, diag, "Inventory", "entity", 1010, 80);

    var seq = 1;

    // Secuencia 1: Cotización de Cambio de Prenda y Cálculo de Diferencia
    addMessage(act, bndCaja, "abrirModalCambioPrenda()", false, seq++);
    addMessage(bndCaja, bndModal, "renderizarFormulario()", false, seq++);
    addMessage(act, bndModal, "cotizarDiferenciaPrecio()", false, seq++);
    addMessage(bndModal, ctrlRoutes, "quote_exchange_endpoint()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "quote_garment_exchange()", false, seq++);
    addMessage(ctrlSvc, entSale, "verificarVentaOriginal()", false, seq++);
    addMessage(ctrlSvc, entItem, "verificarItemOriginalYPrecio()", false, seq++);
    addMessage(ctrlSvc, entInv, "verificarDisponibilidadNuevaTalla()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "calcularDeltaPrecio()", false, seq++);
    addMessage(ctrlSvc, ctrlRoutes, "responseQuote()", true, seq++);
    addMessage(ctrlRoutes, bndModal, "responseQuote()", true, seq++);
    addMessage(bndModal, act, "mostrarDiferenciaPorCobrar()", false, seq++);

    // Secuencia 2: Confirmación de Pago de Diferencia y Procesamiento (Política 1)
    addMessage(act, bndModal, "confirmarAbonoDiferenciaYEstado()", false, seq++);
    addMessage(bndModal, ctrlRoutes, "process_exchange_endpoint()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "process_garment_exchange()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "validarCondicionEtiquetaIntacta()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "validarPagoDiferenciaObligatorio()", false, seq++);
    addMessage(ctrlSvc, entInv, "reingresarPrendaOriginal()", false, seq++);
    addMessage(ctrlSvc, entInv, "descontarNuevaPrenda()", false, seq++);
    addMessage(ctrlSvc, entExchange, "create()", false, seq++);
    addMessage(ctrlSvc, entSale, "asociarCambioAVenta()", false, seq++);
    addMessage(ctrlSvc, ctrlRoutes, "responseSuccess()", true, seq++);
    addMessage(ctrlRoutes, bndModal, "responseSuccess()", true, seq++);
    addMessage(bndModal, act, "emitirComprobanteCambio()", false, seq++);

    // Secuencia 3: Flujo Alternativo A1 - Rechazo por No Pago de Diferencia
    addMessage(act, bndModal, "intentarCambioSinAbonarDiferencia()", false, seq++);
    addMessage(bndModal, ctrlRoutes, "process_exchange_endpoint()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "process_garment_exchange()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "validarPagoDiferenciaObligatorio()", false, seq++);
    addMessage(ctrlSvc, ctrlRoutes, "raise_http_exception()", true, seq++);
    addMessage(bndModal, act, "showErrorToast()", false, seq++);

    diag.Update();
    log("Diagrama de Secuencia CU17 generado con éxito.");
}

Main();
