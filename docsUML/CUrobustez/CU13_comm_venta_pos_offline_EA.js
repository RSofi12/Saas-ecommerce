// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU13 - Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Cajero
//   Boundary: CajaPageComponent, TicketContingenciaModal (Object, «boundary»)
//   Control: IdbSalesService, SalesService (Object, «control»)
//   Entity: PendingOfflineSale, Sale, SaleItem, Inventory (Object, «entity»)
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
    var actorCajero    = crearElementoConEsterotipo(pkg, "Cajero", "Actor", "");
    var uiCaja         = crearElementoConEsterotipo(pkg, "CajaPageComponent", "Object", "boundary");
    var uiModalTicket  = crearElementoConEsterotipo(pkg, "TicketContingenciaModal", "Object", "boundary");

    var ctrlLocal      = crearElementoConEsterotipo(pkg, "IdbSalesService", "Object", "control");
    var ctrlBackend    = crearElementoConEsterotipo(pkg, "SalesService", "Object", "control");

    var entLocalSale   = crearElementoConEsterotipo(pkg, "PendingOfflineSale", "Object", "entity");

    var entCentralSale = crearElementoConEsterotipo(pkg, "Sale", "Object", "entity");
    var entCentralItem = crearElementoConEsterotipo(pkg, "SaleItem", "Object", "entity");
    var entCentralInv  = crearElementoConEsterotipo(pkg, "Inventory", "Object", "entity");

    // 2. Crear Diagrama de Comunicación
    var diagName = "CU13 - Comunicación Venta POS Desconectada";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Distribución Espacial Limpia y Compacta (Topologia Actor -> Boundaries -> Controllers -> Entities)
    // Actor Cajero
    colocarElemento(diagram, actorCajero,     40,  130,  -180, -260);

    // Boundaries
    colocarElemento(diagram, uiCaja,         210,  290,  -130, -210);
    colocarElemento(diagram, uiModalTicket,  210,  290,  -280, -360);

    // Controller Local PWA
    colocarElemento(diagram, ctrlLocal,      410,  490,  -200, -280);

    // Entidades Locales
    colocarElemento(diagram, entLocalSale,   410,  490,  -350, -430);

    // Controller Central Backend
    colocarElemento(diagram, ctrlBackend,    630,  710,  -200, -280);

    // Entidades Centrales PostgreSQL
    colocarElemento(diagram, entCentralInv,  790,  870,   -80, -160);
    colocarElemento(diagram, entCentralSale, 790,  870,  -200, -280);
    colocarElemento(diagram, entCentralItem, 790,  870,  -320, -400);

    // 4. Conectores de Asociación con Mensajes (Sin bucles en Frontera y sin parámetros en funciones)
    // Fase 1: Venta offline con Política 5 (solo efectivo) y ticket de contingencia UUIDv4
    crearMensaje(actorCajero, uiCaja, "1: submitSale()");
    crearMensaje(uiCaja, uiCaja, "1.1: isOfflineEffective()");
    crearMensaje(uiCaja, uiCaja, "1.2: generarUUIDv4Contingencia()");
    crearMensaje(uiCaja, ctrlLocal, "1.3: savePending()");
    crearMensaje(ctrlLocal, ctrlLocal, "1.4: forzarPoliticaEfectivo()");
    crearMensaje(ctrlLocal, ctrlLocal, "1.5: calcularCambioDevolver()");
    crearMensaje(ctrlLocal, entLocalSale, "1.6: create()");
    crearMensaje(entLocalSale, ctrlLocal, "1.7: pendingRecord()");
    crearMensaje(ctrlLocal, uiModalTicket, "1.8: emitirTicketContingencia()");
    crearMensaje(uiModalTicket, actorCajero, "1.9: renderizarTicketContingencia()");

    // Fase 2: Reconexión y sincronización idempotente con backend (/api/sales/offline/batch-sync)
    crearMensaje(uiCaja, ctrlLocal, "2: detectarReconexionInternet()");
    crearMensaje(ctrlLocal, ctrlLocal, "2.1: syncPendingSales()");
    crearMensaje(ctrlLocal, entLocalSale, "2.2: getPending()");
    crearMensaje(entLocalSale, ctrlLocal, "2.3: pendingList()");
    crearMensaje(ctrlLocal, ctrlBackend, "2.4: POST /sales/offline/batch-sync");
    crearMensaje(ctrlBackend, ctrlBackend, "2.5: validateIdempotency()");
    crearMensaje(ctrlBackend, entCentralInv, "2.6: with_for_update()");
    crearMensaje(entCentralInv, ctrlBackend, "2.7: lockResult()");
    crearMensaje(ctrlBackend, entCentralSale, "2.8: create()");
    crearMensaje(entCentralSale, ctrlBackend, "2.9: saleRecord()");
    crearMensaje(ctrlBackend, entCentralItem, "2.10: create()");
    crearMensaje(entCentralItem, ctrlBackend, "2.11: itemRecord()");
    crearMensaje(ctrlBackend, ctrlLocal, "2.12: HTTP 201 Created");
    crearMensaje(ctrlLocal, entLocalSale, "2.13: markAsSynced()");
    crearMensaje(entLocalSale, ctrlLocal, "2.14: syncedFlag()");
    crearMensaje(ctrlLocal, uiCaja, "2.15: notificarSincronizacionExitosa()");
    crearMensaje(uiCaja, actorCajero, "2.16: renderizarEstadoSincronizado()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    Repo.OpenDiagram(diagram.DiagramID);

    Log("¡Diagrama de Comunicación CU13 generado y guardado con éxito!");
    try { Session.Prompt("¡Diagrama de Comunicación CU13 corregido con éxito en Enterprise Architect!", 0); } catch (e) { }
}

Main();
