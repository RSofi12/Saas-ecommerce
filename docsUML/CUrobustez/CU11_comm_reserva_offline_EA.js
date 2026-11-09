// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU11 - Registrar Reserva de Prendas Offline en Modo Desconectado
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Cliente / Cajero
//   Boundary: ReservationCreateController (Object, «boundary»)
//   Control: ReservationOfflineController, ReservationService (Object, «control»)
//   Entity: LocalPendingReservation, LocalInventory, Reservation, ReservationItem, Inventory (Object, «entity»)
//
// Reglas Metodológicas Estrictas:
//   - Todas las funciones se expresan con paréntesis vacíos () sin parámetros internos.
//   - Cero bucles o validaciones sobre Fronteras (las validaciones residen en Controllers).
//   - Conectores independientes para permitir ordenación libre en EA.
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

    Log("Generando Diagrama de Comunicación CU11 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX
    var actorCliente  = crearElementoConEsterotipo(pkg, "Cliente", "Actor", "");
    var uiReserva     = crearElementoConEsterotipo(pkg, "ReservationCreateController", "Object", "boundary");
    var ctrlLocal     = crearElementoConEsterotipo(pkg, "ReservationOfflineController", "Object", "control");
    var ctrlBackend   = crearElementoConEsterotipo(pkg, "ReservationService", "Object", "control");

    var entLocalRes   = crearElementoConEsterotipo(pkg, "LocalPendingReservation", "Object", "entity");
    var entLocalStock = crearElementoConEsterotipo(pkg, "LocalInventory", "Object", "entity");
    var entReserva    = crearElementoConEsterotipo(pkg, "Reservation", "Object", "entity");
    var entItem       = crearElementoConEsterotipo(pkg, "ReservationItem", "Object", "entity");
    var entInventory  = crearElementoConEsterotipo(pkg, "Inventory", "Object", "entity");

    // 2. Crear Diagrama de Comunicación
    var diagName = "CU11 - Comunicación Registrar Reserva Offline";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Distribución espacial compacta
    colocarElemento(diagram, actorCliente,    40,  120, -180, -260);
    colocarElemento(diagram, uiReserva,      200,  280, -180, -260);
    colocarElemento(diagram, ctrlLocal,      400,  480, -180, -260);
    colocarElemento(diagram, entLocalStock,  400,  480,  -60, -140);
    colocarElemento(diagram, entLocalRes,    400,  480, -320, -400);

    colocarElemento(diagram, ctrlBackend,    620,  700, -180, -260);
    colocarElemento(diagram, entInventory,   800,  880,  -60, -140);
    colocarElemento(diagram, entReserva,     800,  880, -180, -260);
    colocarElemento(diagram, entItem,        800,  880, -300, -380);

    // 4. Mensajes individuales limpios (Sin bucles en Frontera y sin parámetros)
    // Flujo 1: Registro offline
    crearMensaje(actorCliente, uiReserva, "1: prepararReserva()");
    crearMensaje(uiReserva, ctrlLocal, "1.1: saveOfflineReservation()");
    crearMensaje(ctrlLocal, ctrlLocal, "1.2: verificarConexion()");
    crearMensaje(ctrlLocal, ctrlLocal, "1.3: validarStockLocal()");
    crearMensaje(ctrlLocal, entLocalStock, "1.4: decrementLocalStock()");
    crearMensaje(ctrlLocal, entLocalRes, "1.5: insertPendingReservation()");
    crearMensaje(ctrlLocal, uiReserva, "1.6: confirmarGuardadoLocal()");
    crearMensaje(uiReserva, actorCliente, "1.7: renderizarTicketContingencia()");

    // Flujo 2: Reconexión y sincronización
    crearMensaje(uiReserva, ctrlLocal, "2: detectarReconexionInternet()");
    crearMensaje(ctrlLocal, ctrlBackend, "2.1: syncAllPending()");
    crearMensaje(ctrlBackend, entReserva, "2.2: create_reservation()");
    crearMensaje(ctrlBackend, entItem, "2.3: add()");
    crearMensaje(ctrlBackend, entInventory, "2.4: with_for_update()");
    crearMensaje(ctrlBackend, ctrlLocal, "2.5: confirmarSincronizacion()");
    crearMensaje(ctrlLocal, entLocalRes, "2.6: markAsSynced()");
    crearMensaje(ctrlLocal, uiReserva, "2.7: notificarSincronizacionExitosa()");
    crearMensaje(uiReserva, actorCliente, "2.8: renderizarEstadoActualizado()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch(ex) {}

    Log("¡Diagrama de Comunicación para CU11 corregido exitosamente!");
}

Main();
