// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU16 - Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Encargado (Actor Principal)
//   Boundary: SaleConflictsPageComponent, ResolveConflictModalComponent (Object, «boundary»)
//   Control: SaleConflictRoutes, SaleConflictService (Object, «control»)
//   Entity: Sale, SaleItem, Inventory, GarmentReturn (Object, «entity»)
//
// Reglas Metodológicas Estrictas:
//   - Todas las funciones se expresan con paréntesis vacíos () sin parámetros internos.
//   - Cero bucles o validaciones sobre Fronteras (las validaciones residen en Controllers).
//   - Sin cruces entre actores (solo el actor principal Encargado interactúa con el software).
//   - Conectores de tipo 'Association' (sólidos, sin flecha rayada/discontinua de comunicación).
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

    Log("Generando Diagrama de Robustez / Comunicación CU16 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX (Tipo 'Object' para BCE canónico)
    var actorEncargado   = crearElementoConEsterotipo(pkg, "Encargado", "Actor", "");

    var uiBandeja        = crearElementoConEsterotipo(pkg, "SaleConflictsPageComponent", "Object", "boundary");
    var uiModalResolver  = crearElementoConEsterotipo(pkg, "ResolveConflictModalComponent", "Object", "boundary");

    var ctrlRoutes       = crearElementoConEsterotipo(pkg, "SaleConflictRoutes", "Object", "control");
    var ctrlService      = crearElementoConEsterotipo(pkg, "SaleConflictService", "Object", "control");

    var entSale          = crearElementoConEsterotipo(pkg, "Sale", "Object", "entity");
    var entSaleItem      = crearElementoConEsterotipo(pkg, "SaleItem", "Object", "entity");
    var entInventory     = crearElementoConEsterotipo(pkg, "Inventory", "Object", "entity");
    var entGarmentReturn = crearElementoConEsterotipo(pkg, "GarmentReturn", "Object", "entity");

    // 2. Crear Diagrama de Comunicación / Robustez
    var diagName = "CU16 - Robustez Resolver Conflictos de Ventas Offline";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Posicionamiento horizontal y equilibrado (cajas 80x80 px)
    colocarElemento(diagram, actorEncargado,    40,  120, -180, -260);

    colocarElemento(diagram, uiBandeja,        180,  260, -120, -200);
    colocarElemento(diagram, uiModalResolver,  180,  260, -240, -320);

    colocarElemento(diagram, ctrlRoutes,       340,  420, -180, -260);
    colocarElemento(diagram, ctrlService,      500,  580, -180, -260);

    colocarElemento(diagram, entSale,          660,  740,  -80, -160);
    colocarElemento(diagram, entSaleItem,      660,  740, -170, -250);
    colocarElemento(diagram, entInventory,     660,  740, -260, -340);
    colocarElemento(diagram, entGarmentReturn, 660,  740, -350, -430);

    // 4. Mensajes con funciones reales vacías () y numeración jerárquica por flujo
    // Flujo 1: Consulta de Bandeja de Quiebres y Stock Central
    crearMensaje(actorEncargado, uiBandeja, "1: accederBandejaConflictos()");
    crearMensaje(uiBandeja, ctrlRoutes, "1.1: list_conflicts_endpoint()");
    crearMensaje(ctrlRoutes, ctrlService, "1.2: list_branch_sale_conflicts()");
    crearMensaje(ctrlService, entSale, "1.3: obtenerVentasEnConflicto()");
    crearMensaje(ctrlService, entInventory, "1.4: verificarStockCentralActual()");
    crearMensaje(ctrlService, ctrlRoutes, "1.5: response()");
    crearMensaje(ctrlRoutes, uiBandeja, "1.6: response()");
    crearMensaje(uiBandeja, actorEncargado, "1.7: mostrarTicketsConQuiebreStock()");

    // Flujo 2: Apertura y Envío de Resolución Gerencial
    crearMensaje(actorEncargado, uiModalResolver, "2: abrirModalResolucion()");
    crearMensaje(actorEncargado, uiModalResolver, "2.1: ingresarViaYJustificacion()");
    crearMensaje(uiModalResolver, ctrlRoutes, "2.2: resolve_conflict_endpoint()");
    crearMensaje(ctrlRoutes, ctrlService, "2.3: resolve_sale_conflict()");
    crearMensaje(ctrlService, ctrlService, "2.4: validarJustificacionAuditoria()");
    crearMensaje(ctrlService, entInventory, "2.5: _get_inventory_for_update()");

    // Flujo 3: Bifurcación en Controlador según la Vía Seleccionada
    // Vía A: negative_stock (Prenda física ya entregada, registra temporal negativo)
    crearMensaje(ctrlService, entInventory, "3.1a: autorizarStockNegativo()");
    crearMensaje(ctrlService, entSale, "3.2a: marcarVentaCompletada()");

    // Vía B: substitute (Reasigna a variante existente en sucursal)
    crearMensaje(ctrlService, entInventory, "3.1b: descontarStockVarianteSustituta()");
    crearMensaje(ctrlService, entSaleItem, "3.2b: reasignarVarianteItem()");

    // Vía C: credit_note (Anulación contable con Nota de Crédito por el 100%)
    crearMensaje(ctrlService, entGarmentReturn, "3.1c: registrarDevolucion100PorCiento()");
    crearMensaje(ctrlService, entSale, "3.2c: anularVentaOffline()");

    // Flujo 4: Confirmación Final al Encargado
    crearMensaje(ctrlService, ctrlRoutes, "4: response()");
    crearMensaje(ctrlRoutes, uiModalResolver, "4.1: response()");
    crearMensaje(uiModalResolver, actorEncargado, "4.2: notificarResolucionExitosa()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch(ex) {}

    Log("¡Diagrama de Robustez / Comunicación CU16 actualizado exitosamente en Enterprise Architect!");
}

Main();
