// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU13 - Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Cajero / Encargado
//   Boundary: CajaPageComponent, TicketContingenciaModal (Object, «boundary»)
//   Control: IdbSalesController, SalesService (Object, «control»)
//   Entity: LocalPendingSale, LocalInventory, Sale, SaleItem, Inventory (Object, «entity»)
//
// Reglas Metodológicas Estrictas:
//   - Todas las funciones se expresan con paréntesis vacíos () sin parámetros internos.
//   - Cero bucles o validaciones sobre Fronteras (las reglas de negocio residen en Controllers).
//   - Conectores independientes para permitir ordenación y ajuste libre en el lienzo de EA.
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

    Log("Generando Diagrama de Comunicación CU13 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX (Cajas compactas 80x80)
    var actorCajero    = crearElementoConEsterotipo(pkg, "Cajero / Encargado", "Actor", "");
    var uiCaja         = crearElementoConEsterotipo(pkg, "CajaPageComponent", "Object", "boundary");
    var uiModalTicket  = crearElementoConEsterotipo(pkg, "TicketContingenciaModal", "Object", "boundary");

    var ctrlLocal      = crearElementoConEsterotipo(pkg, "IdbSalesController", "Object", "control");
    var ctrlBackend    = crearElementoConEsterotipo(pkg, "SalesService", "Object", "control");

    var entLocalSale   = crearElementoConEsterotipo(pkg, "LocalPendingSale", "Object", "entity");
    var entLocalStock  = crearElementoConEsterotipo(pkg, "LocalInventory", "Object", "entity");

    var entCentralSale = crearElementoConEsterotipo(pkg, "Sale", "Object", "entity");
    var entCentralItem = crearElementoConEsterotipo(pkg, "SaleItem", "Object", "entity");
    var entCentralInv  = crearElementoConEsterotipo(pkg, "Inventory", "Object", "entity");

    // 2. Crear Diagrama de Comunicación
    var diagName = "CU13 - Comunicación Venta POS Desconectada";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Distribución Espacial Limpia y Compacta (Topologia Actor -> Boundaries -> Controllers -> Entities)
    // Actor Cajero / Encargado
    colocarElemento(diagram, actorCajero,     40,  130,  -180, -260);

    // Boundaries
    colocarElemento(diagram, uiCaja,         210,  290,  -130, -210);
    colocarElemento(diagram, uiModalTicket,  210,  290,  -280, -360);

    // Controller Local PWA
    colocarElemento(diagram, ctrlLocal,      410,  490,  -200, -280);

    // Entidades Locales
    colocarElemento(diagram, entLocalStock,  410,  490,   -60, -140);
    colocarElemento(diagram, entLocalSale,   410,  490,  -350, -430);

    // Controller Central Backend
    colocarElemento(diagram, ctrlBackend,    630,  710,  -200, -280);

    // Entidades Centrales PostgreSQL
    colocarElemento(diagram, entCentralInv,  790,  870,   -80, -160);
    colocarElemento(diagram, entCentralSale, 790,  870,  -200, -280);
    colocarElemento(diagram, entCentralItem, 790,  870,  -320, -400);

    // 4. Conectores de Asociación con Mensajes (Sin bucles en Frontera y sin parámetros en funciones)
    // Fase 1: Entrada y Validación de Política 5 en Controller Local
    crearMensaje(actorCajero, uiCaja, "1: submitSale()");
    crearMensaje(uiCaja, ctrlLocal, "1.1: saveOfflineSale()");
    crearMensaje(ctrlLocal, ctrlLocal, "1.2: forzarPoliticaEfectivo()");
    crearMensaje(ctrlLocal, ctrlLocal, "1.3: calcularCambioDevolver()");
    crearMensaje(ctrlLocal, ctrlLocal, "1.4: validarStockLocal()");
    crearMensaje(ctrlLocal, entLocalStock, "1.5: decrementLocalStock()");
    crearMensaje(ctrlLocal, ctrlLocal, "1.6: generarUUIDv4Contingencia()");
    crearMensaje(ctrlLocal, entLocalSale, "1.7: insertPendingSale()");
    crearMensaje(ctrlLocal, uiModalTicket, "1.8: emitirTicketContingencia()");
    crearMensaje(uiModalTicket, actorCajero, "1.9: renderizarTicketContingencia()");

    // Fase 2: Reconexión y Sincronización Idempotente con Backend
    crearMensaje(uiCaja, ctrlLocal, "2: detectarReconexionInternet()");
    crearMensaje(ctrlLocal, entLocalSale, "2.1: listPendingSales()");
    crearMensaje(ctrlLocal, ctrlBackend, "2.2: POST /sales/");
    crearMensaje(ctrlBackend, ctrlBackend, "2.3: validateIdempotency()");
    crearMensaje(ctrlBackend, entCentralInv, "2.4: with_for_update()");
    crearMensaje(ctrlBackend, entCentralSale, "2.5: create()");
    crearMensaje(ctrlBackend, entCentralItem, "2.6: create()");
    crearMensaje(ctrlBackend, ctrlLocal, "2.7: HTTP 201 Created");
    crearMensaje(ctrlLocal, entLocalSale, "2.8: markAsSynced()");
    crearMensaje(ctrlLocal, uiCaja, "2.9: notificarSincronizacionExitosa()");
    crearMensaje(uiCaja, actorCajero, "2.10: renderizarEstadoSincronizado()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    Repo.OpenDiagram(diagram.DiagramID);

    Log("¡Diagrama de Comunicación CU13 generado y guardado con éxito!");
    try { Session.Prompt("¡Diagrama de Comunicación CU13 corregido con éxito en Enterprise Architect!", 0); } catch (e) { }
}

Main();
