// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU17 - Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Estado
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Cajero (Actor Principal)
//   Boundary: CajaPageComponent, GarmentExchangeModalComponent (Object, «boundary»)
//   Control: GarmentExchangeRoutes, GarmentExchangeService (Object, «control»)
//   Entity: GarmentExchange, Sale, SaleItem, Inventory (Object, «entity»)
//
// Reglas Metodológicas Estrictas:
//   - Todas las funciones se expresan con paréntesis vacíos () sin parámetros internos.
//   - Cero bucles o validaciones sobre Fronteras (las validaciones residen en Controllers).
//   - Sin cruces entre actores (solo el actor principal Cajero interactúa con la terminal de venta).
//   - Conectores de tipo 'Association' (sólidos, sin flecha rayada/discontinua de comunicación).
//   - La entidad SaleItem está conectada formalmente para validar el ítem vendido original.
//   - Elementos creados como 'Object' con dimensiones cuadradas (80x80 px) para iconos circulares BCE.
//   - Numeración jerárquica por flujo (1:, 1.1:, 2:, 2.1:, etc.).
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
    for (var i = pkg.Elements.Count - 1; i >= 0; i--) {
        var el = pkg.Elements.GetAt(i);
        if (el.Name == name) {
            if (el.Type == tipo) {
                if (estereotipo && el.Stereotype != estereotipo) {
                    el.Stereotype = estereotipo;
                    el.Update();
                }
                return el;
            } else {
                pkg.Elements.Delete(i);
                pkg.Elements.Refresh();
                break;
            }
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

    Log("Generando Diagrama de Robustez / Comunicación CU17 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX (Tipo 'Object' para BCE canónico)
    var actorCajero       = crearElementoConEsterotipo(pkg, "Cajero", "Actor", "");

    var uiCaja            = crearElementoConEsterotipo(pkg, "CajaPageComponent", "Object", "boundary");
    var uiModalCambio     = crearElementoConEsterotipo(pkg, "GarmentExchangeModalComponent", "Object", "boundary");

    var ctrlRoutes        = crearElementoConEsterotipo(pkg, "GarmentExchangeRoutes", "Object", "control");
    var ctrlService       = crearElementoConEsterotipo(pkg, "GarmentExchangeService", "Object", "control");

    var entExchange       = crearElementoConEsterotipo(pkg, "GarmentExchange", "Object", "entity");
    var entSale           = crearElementoConEsterotipo(pkg, "Sale", "Object", "entity");
    var entSaleItem       = crearElementoConEsterotipo(pkg, "SaleItem", "Object", "entity");
    var entInventory      = crearElementoConEsterotipo(pkg, "Inventory", "Object", "entity");

    // 2. Crear Diagrama de Comunicación / Robustez
    var diagName = "CU17 - Robustez Cambio de Prenda y Diferencia de Precio";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Posicionamiento horizontal equilibrado (cajas 80x80 px)
    colocarElemento(diagram, actorCajero,       40,  120, -180, -260);

    colocarElemento(diagram, uiCaja,           180,  260, -120, -200);
    colocarElemento(diagram, uiModalCambio,    180,  260, -240, -320);

    colocarElemento(diagram, ctrlRoutes,       340,  420, -180, -260);
    colocarElemento(diagram, ctrlService,      500,  580, -180, -260);

    colocarElemento(diagram, entExchange,      660,  740,  -80, -160);
    colocarElemento(diagram, entSale,          660,  740, -170, -250);
    colocarElemento(diagram, entSaleItem,      660,  740, -260, -340);
    colocarElemento(diagram, entInventory,     660,  740, -350, -430);

    // 4. Mensajes con funciones reales vacías () y numeración jerárquica por flujo
    // Flujo 1: Cotización de Cambio de Prenda y Cálculo de Diferencia (Delta)
    crearMensaje(actorCajero, uiCaja, "1: abrirModalCambioPrenda()");
    crearMensaje(uiCaja, uiModalCambio, "1.1: renderizarFormulario()");
    crearMensaje(actorCajero, uiModalCambio, "1.2: cotizarDiferenciaPrecio()");
    crearMensaje(uiModalCambio, ctrlRoutes, "1.3: quote_exchange_endpoint()");
    crearMensaje(ctrlRoutes, ctrlService, "1.4: quote_garment_exchange()");
    crearMensaje(ctrlService, entSale, "1.5: verificarVentaOriginal()");
    crearMensaje(ctrlService, entSaleItem, "1.6: verificarItemOriginalYPrecio()");
    crearMensaje(ctrlService, entInventory, "1.7: verificarDisponibilidadNuevaTalla()");
    crearMensaje(ctrlService, ctrlService, "1.8: calcularDeltaPrecio()");
    crearMensaje(ctrlService, ctrlRoutes, "1.9: responseQuote()");
    crearMensaje(ctrlRoutes, uiModalCambio, "1.10: responseQuote()");
    crearMensaje(uiModalCambio, actorCajero, "1.11: mostrarDiferenciaPorCobrar()");

    // Flujo 2: Confirmación de Pago de Diferencia y Procesamiento de Cambio (Política 1)
    crearMensaje(actorCajero, uiModalCambio, "2: confirmarAbonoDiferenciaYEstado()");
    crearMensaje(uiModalCambio, ctrlRoutes, "2.1: process_exchange_endpoint()");
    crearMensaje(ctrlRoutes, ctrlService, "2.2: process_garment_exchange()");
    crearMensaje(ctrlService, ctrlService, "2.3: validarCondicionEtiquetaIntacta()");
    crearMensaje(ctrlService, ctrlService, "2.4: validarPagoDiferenciaObligatorio()");
    crearMensaje(ctrlService, entInventory, "2.5: reingresarPrendaOriginal()");
    crearMensaje(ctrlService, entInventory, "2.6: descontarNuevaPrenda()");
    crearMensaje(ctrlService, entExchange, "2.7: create()");
    crearMensaje(ctrlService, entSale, "2.8: asociarCambioAVenta()");
    crearMensaje(ctrlService, ctrlRoutes, "2.9: responseSuccess()");
    crearMensaje(ctrlRoutes, uiModalCambio, "2.10: responseSuccess()");
    crearMensaje(uiModalCambio, actorCajero, "2.11: emitirComprobanteCambio()");

    // Flujo 3: Flujo Alternativo A1 - Rechazo por No Pago de Diferencia (Política 1 Violada)
    crearMensaje(actorCajero, uiModalCambio, "3: intentarCambioSinAbonarDiferencia()");
    crearMensaje(uiModalCambio, ctrlRoutes, "3.1: process_exchange_endpoint()");
    crearMensaje(ctrlRoutes, ctrlService, "3.2: process_garment_exchange()");
    crearMensaje(ctrlService, ctrlService, "3.3: validarPagoDiferenciaObligatorio()");
    crearMensaje(ctrlService, ctrlRoutes, "3.4: raise_http_exception()");
    crearMensaje(uiModalCambio, actorCajero, "3.5: showErrorToast()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch(ex) {}

    Log("¡Diagrama de Robustez / Comunicación CU17 actualizado exitosamente en Enterprise Architect!");
}

Main();
