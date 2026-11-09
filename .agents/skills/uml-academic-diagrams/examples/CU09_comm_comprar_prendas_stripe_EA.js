// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU09 - Comprar Prendas con Stripe y Despacho Condicionado
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Cliente (Actor), PasarelaStripe (Actor)
//   Boundary: CheckoutView, StripeElementsCard, OrderConfirmationModal («boundary»)
//   Control: PaymentRoutes, OrderService («control»)
//   Entity: Cart, Order, PaymentAttempt, StripeEvent, Inventory («entity»)
//
// Reglas Metodológicas Estrictas:
//   - Todas las funciones se expresan con paréntesis vacíos () sin parámetros internos.
//   - Cero bucles o validaciones sobre Fronteras (las validaciones residen en Controllers).
//   - Conectores independientes para permitir ordenación y direccionamiento claro en EA.
// ============================================================================

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch(e) {
        // En entorno EA interno Repository ya está activo
    }
}

function Log(msg) {
    try { Session.Output("[FashionStore-EA] " + msg); } catch(e) { try { WScript.Echo(msg); } catch(ex) {} }
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

function colocarElemento(diagram, elemento, left, right, top, bottom) {
    var diagObj = diagram.DiagramObjects.AddNew("l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";", "");
    diagObj.ElementID = elemento.ElementID;
    diagObj.Update();
}

function crearMensaje(origen, destino, texto) {
    var con = origen.Connectors.AddNew(texto, "Association");
    con.SupplierID = destino.ElementID;
    con.Name = texto;
    con.Direction = "Source -> Destination";
    con.Update();
    return con;
}

function Main() {
    if (Repo == null) {
        Log("Error: No se pudo conectar a Enterprise Architect.");
        return;
    }

    Log("Generando Diagrama de Comunicación / Robustez CU09 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX
    var actorCliente     = crearElementoConEsterotipo(pkg, "Cliente", "Actor", "");
    var actorStripe      = crearElementoConEsterotipo(pkg, "PasarelaStripe", "Actor", "");

    var uiCheckout       = crearElementoConEsterotipo(pkg, "CheckoutView", "Object", "boundary");
    var uiElements       = crearElementoConEsterotipo(pkg, "StripeElementsCard", "Object", "boundary");
    var uiConfirm        = crearElementoConEsterotipo(pkg, "OrderConfirmationModal", "Object", "boundary");

    var ctrlRoutes       = crearElementoConEsterotipo(pkg, "PaymentRoutes", "Object", "control");
    var ctrlService      = crearElementoConEsterotipo(pkg, "OrderService", "Object", "control");

    var entCart          = crearElementoConEsterotipo(pkg, "Cart", "Object", "entity");
    var entOrder         = crearElementoConEsterotipo(pkg, "Order", "Object", "entity");
    var entAttempt       = crearElementoConEsterotipo(pkg, "PaymentAttempt", "Object", "entity");
    var entEvent         = crearElementoConEsterotipo(pkg, "StripeEvent", "Object", "entity");
    var entInventory     = crearElementoConEsterotipo(pkg, "Inventory", "Object", "entity");

    // 2. Crear Diagrama de Comunicación / Robustez
    var diagName = "CU09 - Robustez Comprar Prendas con Stripe y Despacho";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Distribución espacial horizontal y equilibrada
    colocarElemento(diagram, actorCliente,     40,  120, -180, -260);
    colocarElemento(diagram, uiCheckout,      180,  260, -180, -260);
    colocarElemento(diagram, uiElements,      180,  260,  -60, -140);
    colocarElemento(diagram, uiConfirm,       180,  260, -300, -380);

    colocarElemento(diagram, ctrlRoutes,      360,  440, -180, -260);
    colocarElemento(diagram, ctrlService,     540,  620, -180, -260);

    colocarElemento(diagram, actorStripe,     360,  440,  -40, -120);

    colocarElemento(diagram, entCart,         720,  800,  -40, -120);
    colocarElemento(diagram, entOrder,        720,  800, -120, -200);
    colocarElemento(diagram, entAttempt,      720,  800, -200, -280);
    colocarElemento(diagram, entEvent,        720,  800, -280, -360);
    colocarElemento(diagram, entInventory,    720,  800, -360, -440);

    // 4. Mensajes individuales limpios (Sin parámetros y con validaciones en Control)
    // Flujo 1: Inicio de Checkout y Creación de PaymentIntent
    crearMensaje(actorCliente, uiCheckout, "1: iniciarCheckout()");
    crearMensaje(uiCheckout, ctrlRoutes, "1.1: stripe_checkout_route()");
    crearMensaje(ctrlRoutes, ctrlService, "1.2: create_stripe_payment()");
    crearMensaje(ctrlService, ctrlService, "1.3: validarStockDisponible()");
    crearMensaje(ctrlService, entCart, "1.4: obtenerCarrito()");
    crearMensaje(ctrlService, entOrder, "1.5: crearOrden()");
    crearMensaje(ctrlService, entAttempt, "1.6: crearIntentoPago()");
    crearMensaje(ctrlService, actorStripe, "1.7: crearPaymentIntent()");
    crearMensaje(ctrlService, ctrlRoutes, "1.8: retornarDatosCheckout()");
    crearMensaje(ctrlRoutes, uiCheckout, "1.9: responderStripeCheckout()");
    crearMensaje(uiCheckout, uiElements, "1.10: montarElementoPago()");

    // Flujo 2: Confirmación del Pago en Frontend
    crearMensaje(actorCliente, uiElements, "2: confirmarPagoStripe()");
    crearMensaje(uiElements, actorStripe, "2.1: confirmCardPayment()");
    crearMensaje(actorStripe, uiCheckout, "2.2: notificarProcesandoPago()");

    // Flujo 3: Webhook Asíncrono de Stripe y Despacho Condicionado
    crearMensaje(actorStripe, ctrlRoutes, "3: stripe_webhook_route()");
    crearMensaje(ctrlRoutes, ctrlRoutes, "3.1: verificarFirmaWebhook()");
    crearMensaje(ctrlRoutes, ctrlService, "3.2: process_stripe_event()");
    crearMensaje(ctrlService, entEvent, "3.3: registrarEventoStripe()");
    crearMensaje(ctrlService, entOrder, "3.4: actualizarEstadoPagado()");
    crearMensaje(ctrlService, entOrder, "3.5: generarTrackingDespacho()");
    crearMensaje(ctrlService, entInventory, "3.6: decrementarInventario()");
    crearMensaje(ctrlService, entCart, "3.7: vaciarCarrito()");
    crearMensaje(ctrlService, entAttempt, "3.8: marcarIntentoExitoso()");
    crearMensaje(ctrlService, ctrlRoutes, "3.9: confirmarRecepcionWebhook()");

    // Flujo 4: Renderizado de Despacho y Confirmación
    crearMensaje(uiCheckout, uiConfirm, "4: renderizarComprobanteDespacho()");
    crearMensaje(uiConfirm, actorCliente, "4.1: mostrarStepperDespacho()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch(ex) {}

    Log("¡Diagrama de Robustez / Comunicación CU09 generado exitosamente en Enterprise Architect!");
}

Main();
