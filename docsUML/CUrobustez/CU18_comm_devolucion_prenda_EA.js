// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU18 - Procesar Devolución de Prenda con Retención Operativa (20%-50%) y Nota de Crédito
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Cliente, Cajero
//   Boundary: CajaPageComponent, ReturnModalComponent, CreditNoteReceiptModal (Object, «boundary»)
//   Control: ReturnRoutes, ReturnService (Object, «control»)
//   Entity: Sale, Company, Inventory, GarmentReturn (Object, «entity»)
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
    } catch (e) {
        // En entorno EA interno Repository ya está activo
    }
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

    Log("Generando Diagrama de Comunicación CU18 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX
    var actorCliente    = crearElementoConEsterotipo(pkg, "Cliente", "Actor", "");
    var actorCajero     = crearElementoConEsterotipo(pkg, "Cajero", "Actor", "");

    var uiCaja          = crearElementoConEsterotipo(pkg, "CajaPageComponent", "Object", "boundary");
    var uiModalDev      = crearElementoConEsterotipo(pkg, "ReturnModalComponent", "Object", "boundary");
    var uiModalNC       = crearElementoConEsterotipo(pkg, "CreditNoteReceiptModal", "Object", "boundary");

    var ctrlRoutes      = crearElementoConEsterotipo(pkg, "ReturnRoutes", "Object", "control");
    var ctrlService     = crearElementoConEsterotipo(pkg, "ReturnService", "Object", "control");

    var entSale         = crearElementoConEsterotipo(pkg, "Sale", "Object", "entity");
    var entCompany      = crearElementoConEsterotipo(pkg, "Company", "Object", "entity");
    var entInventory    = crearElementoConEsterotipo(pkg, "Inventory", "Object", "entity");
    var entReturn       = crearElementoConEsterotipo(pkg, "GarmentReturn", "Object", "entity");

    // 2. Crear Diagrama de Comunicación
    var diagName = "CU18 - Comunicación Devolución de Prenda";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Posicionamiento horizontal y vertical
    colocarElemento(diagram, actorCliente,    30,  110, -100, -180);
    colocarElemento(diagram, actorCajero,    170,  250, -100, -180);

    colocarElemento(diagram, uiCaja,         310,  390,  -40, -120);
    colocarElemento(diagram, uiModalDev,     310,  410, -160, -240);
    colocarElemento(diagram, uiModalNC,      170,  270, -280, -360);

    colocarElemento(diagram, ctrlRoutes,     500,  600, -160, -240);
    colocarElemento(diagram, ctrlService,    680,  780, -160, -240);

    colocarElemento(diagram, entSale,        880,  960,  -40, -110);
    colocarElemento(diagram, entCompany,     880,  960, -120, -190);
    colocarElemento(diagram, entInventory,   880,  960, -200, -270);
    colocarElemento(diagram, entReturn,      680,  780, -300, -370);

    // 4. Mensajes con funciones reales sin parámetros ()
    // Fase 1: Solicitud inicial y apertura
    crearMensaje(actorCliente, uiCaja, "1: solicitarDevolucionPrenda()");
    crearMensaje(actorCajero, uiCaja, "2: abrirModalDevolucion()");
    crearMensaje(uiCaja, uiModalDev, "2.1: renderizarFormulario()");

    // Fase 2: Búsqueda y Cotización en tiempo real
    crearMensaje(actorCajero, uiModalDev, "3: ingresarTicketYPrenda()");
    crearMensaje(uiModalDev, ctrlRoutes, "3.1: POST /api/returns/quote");
    crearMensaje(ctrlRoutes, ctrlService, "3.2: quote_garment_return()");
    crearMensaje(ctrlService, entSale, "3.3: filter()");
    crearMensaje(ctrlService, entCompany, "3.4: _get_tenant_return_policy()");
    crearMensaje(ctrlService, ctrlService, "3.5: calcularRetencionYReembolsoNeto()");
    crearMensaje(ctrlService, ctrlRoutes, "3.6: return()");
    crearMensaje(ctrlRoutes, uiModalDev, "3.7: return()");
    crearMensaje(uiModalDev, actorCajero, "3.8: mostrarDesgloseRetencion()");

    // Fase 3: Acuerdo presencial con el Cliente (la Frontera expone las modalidades)
    crearMensaje(uiModalDev, actorCajero, "3.9: mostrarOpcionesModalidad()");
    crearMensaje(actorCajero, uiModalDev, "4: seleccionarModalidadReembolso()");

    // Fase 4: Confirmación y Procesamiento Transaccional
    crearMensaje(actorCajero, uiModalDev, "5: confirmarDevolucion()");
    crearMensaje(uiModalDev, ctrlRoutes, "5.1: POST /api/returns");
    crearMensaje(ctrlRoutes, ctrlService, "5.2: process_garment_return()");
    crearMensaje(ctrlService, ctrlService, "5.3: validarCondicionPrenda()");
    crearMensaje(ctrlService, ctrlService, "5.4: validarPlazoDevolucion()");
    crearMensaje(ctrlService, entInventory, "5.5: with_for_update()");
    crearMensaje(ctrlService, ctrlService, "5.6: generate_credit_note_code()");
    crearMensaje(ctrlService, entReturn, "5.7: add()");
    crearMensaje(ctrlService, ctrlRoutes, "5.8: return()");
    crearMensaje(ctrlRoutes, uiModalDev, "5.9: return()");
    crearMensaje(uiModalDev, uiModalNC, "5.10: abrirComprobanteNotaCredito()");
    crearMensaje(uiModalNC, actorCajero, "5.11: renderizarComprobanteNC()");
    crearMensaje(uiModalNC, actorCliente, "5.12: entregarComprobanteReembolso()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    Repo.OpenDiagram(diagram.DiagramID);

    Log("¡Diagrama de Comunicación CU18 generado con éxito!");
    try { Session.Prompt("¡Diagrama de Comunicación CU18 generado con éxito en Enterprise Architect!", 0); } catch (e) { }
}

Main();
