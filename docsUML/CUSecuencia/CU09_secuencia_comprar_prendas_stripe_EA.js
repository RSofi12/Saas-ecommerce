/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU09 - Comprar Prendas con Stripe y Despacho Condicionado
 * DESCRIPCION: Proceso de compra digital con pasarela internacional Stripe.
 *              Fase 1: Inicio de checkout, validacion de existencias, creacion de orden
 *              con estado PENDIENTE_PAGO y generacion del PaymentIntent con Stripe API.
 *              Fase 2: Confirmacion del cliente mediante Stripe Elements en frontend.
 *              Fase 3: Procesamiento asincrono del Webhook payment_intent.succeeded,
 *              asiento contable de la orden como PAGADA, aplicacion de la Politica 3
 *              (generacion de tracking DSP-YYYYMMDD-XXXX y pase a LISTA_PARA_DESPACHO),
 *              decremento atómico de inventario y vaciado del carrito.
 * ACTORES: Cliente (Principal), PasarelaStripe (Sistema Externo)
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU09 - Comprar Prendas con Stripe y Despacho Condicionado";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU09-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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

function addActorParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Actor");
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-2400;", "");
    dObj.ElementID = el.ElementID;
    dObj.Update();
    return el;
}

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
    log("=============================================================================");
    log("Iniciando generacion de Diagrama de Secuencia CU09 en Enterprise Architect...");

    var pkg = getTargetPackage();
    if (pkg == null) {
        log("Error critico: No se pudo resolver el paquete.");
        return;
    }

    var diagram = recreateDiagram(pkg);

    // 1. Crear Participantes (Distribución Horizontal BCE)
    var actCliente  = addActorParticipant(pkg, diagram, "Cliente", 30, 70);
    var uiCheckout  = addParticipant(pkg, diagram, ":CheckoutView", "Boundary", 140, 100);
    var uiElements  = addParticipant(pkg, diagram, ":StripeElementsCard", "Boundary", 270, 110);
    var ctrlRoutes  = addParticipant(pkg, diagram, ":PaymentRoutes", "Controller", 410, 105);
    var ctrlService = addParticipant(pkg, diagram, ":OrderService", "Controller", 545, 105);
    var actStripe   = addActorParticipant(pkg, diagram, "PasarelaStripe", 680, 85);
    var entCart     = addEntityParticipant(pkg, diagram, ":Cart", 795, 75);
    var entOrder    = addEntityParticipant(pkg, diagram, ":Order", 895, 75);
    var entAttempt  = addEntityParticipant(pkg, diagram, ":PaymentAttempt", 995, 95);
    var entEvent    = addEntityParticipant(pkg, diagram, ":StripeEvent", 1115, 85);
    var entInv      = addEntityParticipant(pkg, diagram, ":Inventory", 1225, 80);
    var uiConfirm   = addParticipant(pkg, diagram, ":OrderConfirmationModal", "Boundary", 1335, 120);

    pkg.Elements.Refresh();
    diagram.DiagramObjects.Refresh();

    // 2. Trazado de Mensajes Secuenciales (Sin parametros en funciones)
    var seq = 1;

    // FASE 1: Checkout y Creación de PaymentIntent
    addMessage(actCliente, uiCheckout, "1: iniciarCheckout()", false, seq++);
    addMessage(uiCheckout, ctrlRoutes, "1.1: stripe_checkout_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlService, "1.2: create_stripe_payment()", false, seq++);
    addMessage(ctrlService, ctrlService, "1.3: validarStockDisponible()", false, seq++);
    addMessage(ctrlService, entCart, "1.4: obtenerCarrito()", false, seq++);
    addMessage(ctrlService, entOrder, "1.5: crearOrden()", false, seq++);
    addMessage(ctrlService, entAttempt, "1.6: crearIntentoPago()", false, seq++);
    addMessage(ctrlService, actStripe, "1.7: crearPaymentIntent()", false, seq++);
    addMessage(actStripe, ctrlService, "1.8: client_secret", true, seq++);
    addMessage(ctrlService, ctrlRoutes, "1.9: datosCheckout", true, seq++);
    addMessage(ctrlRoutes, uiCheckout, "1.10: 201 Created", true, seq++);
    addMessage(uiCheckout, uiElements, "1.11: montarElementoPago()", false, seq++);

    // FASE 2: Confirmación en Pasarela Stripe
    addMessage(actCliente, uiElements, "2: confirmarPagoStripe()", false, seq++);
    addMessage(uiElements, actStripe, "2.1: confirmCardPayment()", false, seq++);
    addMessage(actStripe, uiCheckout, "2.2: notificarProcesandoPago()", false, seq++);

    // FASE 3: Webhook Asíncrono de Stripe y Despacho Condicionado
    addMessage(actStripe, ctrlRoutes, "3: stripe_webhook_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlRoutes, "3.1: verificarFirmaWebhook()", false, seq++);
    addMessage(ctrlRoutes, ctrlService, "3.2: process_stripe_event()", false, seq++);
    addMessage(ctrlService, entEvent, "3.3: registrarEventoStripe()", false, seq++);

    // FRAGMENTO ALT [Evento payment_intent.succeeded vs payment_failed]: Abarca Mensajes 3.4 a 3.10
    addCombinedFragment(pkg, diagram, "alt", "[payment_intent.succeeded: Pago Exitoso]", 520, 1260, -1180, -1650);

    addMessage(ctrlService, entOrder, "3.4: actualizarEstadoPagado()", false, seq++);
    addMessage(ctrlService, entOrder, "3.5: generarTrackingDespacho()", false, seq++);
    addMessage(ctrlService, entInv, "3.6: decrementarInventario()", false, seq++);
    addMessage(ctrlService, entCart, "3.7: vaciarCarrito()", false, seq++);
    addMessage(ctrlService, entAttempt, "3.8: marcarIntentoExitoso()", false, seq++);
    addMessage(ctrlService, ctrlRoutes, "3.9: 200 OK (received)", true, seq++);
    addMessage(ctrlRoutes, actStripe, "3.10: 200 OK", true, seq++);

    // FASE 4: Renderizado de Comprobante y Tracking de Despacho
    addMessage(uiCheckout, uiConfirm, "4: renderizarComprobanteDespacho()", false, seq++);
    addMessage(uiConfirm, actCliente, "4.1: mostrarStepperDespacho()", false, seq++);

    // 3. Extender lineas de vida
    stretchLifeline(diagram, actCliente, -2100);
    stretchLifeline(diagram, uiCheckout, -2100);
    stretchLifeline(diagram, uiElements, -2100);
    stretchLifeline(diagram, ctrlRoutes, -2100);
    stretchLifeline(diagram, ctrlService, -2100);
    stretchLifeline(diagram, actStripe, -2100);
    stretchLifeline(diagram, entCart, -2100);
    stretchLifeline(diagram, entOrder, -2100);
    stretchLifeline(diagram, entAttempt, -2100);
    stretchLifeline(diagram, entEvent, -2100);
    stretchLifeline(diagram, entInv, -2100);
    stretchLifeline(diagram, uiConfirm, -2100);

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch (e) { }

    log("¡Diagrama de Secuencia CU09 generado exitosamente en Enterprise Architect!");
}

Main();
