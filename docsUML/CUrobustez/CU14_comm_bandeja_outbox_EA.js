// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU14 - Gestionar Bandeja Local de Operaciones Pendientes (Outbox PWA / SQLite)
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Cajero
//   Boundary: CajaPageComponent, TicketContingenciaModal (Object, «boundary»)
//   Control: IdbSalesService, SalesApiService, SalesService (Object, «control»)
//   Entity: LocalPendingSale, Sale (Object, «entity»)
//
// Reglas Metodológicas Estrictas:
//   - Todas las funciones se expresan con paréntesis vacíos () sin parámetros internos.
//   - Mensajes individuales separados por conector (para ordenación libre del usuario en EA).
//   - Cero bucles o validaciones sobre Fronteras (las validaciones residen en Controllers).
//   - Flujo 100% fiel al código implementado en frontend y backend.
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

    Log("Generando Diagrama de Comunicación CU14 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX (Arquitectura BCE pura)
    var actorCajero       = crearElementoConEsterotipo(pkg, "Cajero", "Actor", "");
    var uiCaja            = crearElementoConEsterotipo(pkg, "CajaPageComponent", "Object", "boundary");
    var uiModalTicket     = crearElementoConEsterotipo(pkg, "TicketContingenciaModal", "Object", "boundary");

    var ctrlIdbSales      = crearElementoConEsterotipo(pkg, "IdbSalesService", "Object", "control");
    var ctrlSalesApi      = crearElementoConEsterotipo(pkg, "SalesApiService", "Object", "control");
    var ctrlSalesBackend  = crearElementoConEsterotipo(pkg, "SalesService", "Object", "control");

    var entLocalSale      = crearElementoConEsterotipo(pkg, "LocalPendingSale", "Object", "entity");
    var entCentralSale    = crearElementoConEsterotipo(pkg, "Sale", "Object", "entity");

    // 2. Crear Diagrama de Comunicación
    var diagName = "CU14 - Comunicación Bandeja Outbox Local";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Distribución Espacial Topológica Limpia (Actor -> Boundaries -> Controllers -> Entities)
    // Actor Cajero
    colocarElemento(diagram, actorCajero,        40,  130,  -190, -270);

    // Boundary Principal (Caja)
    colocarElemento(diagram, uiCaja,            220,  300,  -140, -220);

    // Boundary Modal (Ticket Térmico)
    colocarElemento(diagram, uiModalTicket,     220,  300,  -320, -400);

    // Controller Local IndexedDB
    colocarElemento(diagram, ctrlIdbSales,      440,  520,  -320, -400);

    // Entidad Local IndexedDB
    colocarElemento(diagram, entLocalSale,      660,  740,  -320, -400);

    // Controller Cliente API (HTTP)
    colocarElemento(diagram, ctrlSalesApi,      440,  520,  -140, -220);

    // Controller Central Backend (FastAPI)
    colocarElemento(diagram, ctrlSalesBackend,  660,  740,  -140, -220);

    // Entidad Central PostgreSQL
    colocarElemento(diagram, entCentralSale,    860,  940,  -140, -220);

    // 4. Mensajes Individuales Separados por Conector (Permite mover y ordenar cada texto libremente)
    // ------------------------------------------------------------------------
    // FASE 1: Apertura de Bandeja y Arqueo Local
    crearMensaje(actorCajero, uiCaja, "1: switchTab()");
    crearMensaje(uiCaja, ctrlIdbSales, "1.1: getPending()");
    crearMensaje(ctrlIdbSales, entLocalSale, "1.2: getAll()");
    crearMensaje(ctrlIdbSales, ctrlIdbSales, "1.3: totalPendingCash()");
    crearMensaje(ctrlIdbSales, uiCaja, "1.4: return pendingOfflineSales");
    crearMensaje(uiCaja, actorCajero, "1.5: renderizarBandejaOutbox()");

    // FASE 2: Inspección de Ticket Térmico de Contingencia
    crearMensaje(actorCajero, uiCaja, "2: openSaleDetail()");
    crearMensaje(uiCaja, uiModalTicket, "2.1: renderizarTicketTermico()");
    crearMensaje(uiModalTicket, actorCajero, "2.2: presentarTicketContingencia()");

    // FASE 3: Verificación y Conciliación con Servidor Central (check-status)
    crearMensaje(actorCajero, uiCaja, "3: checkOutboxStatusWithServer()");
    crearMensaje(uiCaja, ctrlSalesApi, "3.1: checkOfflineStatus()");
    crearMensaje(ctrlSalesApi, ctrlSalesBackend, "3.2: POST /api/sales/offline/check-status");
    crearMensaje(ctrlSalesBackend, entCentralSale, "3.3: check_offline_sales_status()");
    crearMensaje(ctrlSalesBackend, ctrlSalesApi, "3.4: HTTP 200 OK (status_map)");
    crearMensaje(ctrlSalesApi, uiCaja, "3.5: return status_map");
    crearMensaje(uiCaja, ctrlIdbSales, "3.6: markAsSynced()");
    crearMensaje(ctrlIdbSales, entLocalSale, "3.7: put()");
    crearMensaje(uiCaja, actorCajero, "3.8: renderizarEstadoConciliado()");

    // FASE 4: Sincronización Unitaria desde Bandeja Outbox
    crearMensaje(actorCajero, uiCaja, "4: syncSingleSale()");
    crearMensaje(uiCaja, ctrlSalesApi, "4.1: createSale()");
    crearMensaje(ctrlSalesApi, ctrlSalesBackend, "4.2: POST /api/sales/");
    crearMensaje(ctrlSalesBackend, entCentralSale, "4.3: create_sale()");
    crearMensaje(ctrlSalesBackend, ctrlSalesApi, "4.4: HTTP 201 Created");
    crearMensaje(ctrlSalesApi, uiCaja, "4.5: return Sale");
    crearMensaje(uiCaja, ctrlIdbSales, "4.6: markAsSynced()");
    crearMensaje(ctrlIdbSales, entLocalSale, "4.7: put()");
    crearMensaje(uiCaja, actorCajero, "4.8: notificarSincronizacionExitosa()");

    // FASE 5: Purga de Comprobantes Consolidados
    crearMensaje(actorCajero, uiCaja, "5: clearSyncedFromOutbox()");
    crearMensaje(uiCaja, ctrlIdbSales, "5.1: clearSynced()");
    crearMensaje(ctrlIdbSales, entLocalSale, "5.2: delete()");
    crearMensaje(uiCaja, actorCajero, "5.3: renderizarBandejaDepurada()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    Repo.OpenDiagram(diagram.DiagramID);

    Log("¡Diagrama de Comunicación CU14 generado limpiamente con conectores independientes!");
    try { Session.Prompt("¡Diagrama de Comunicación CU14 generado con éxito en Enterprise Architect!", 0); } catch (e) { }
}

Main();
