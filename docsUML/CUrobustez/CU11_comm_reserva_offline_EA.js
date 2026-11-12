// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU11 - Registrar Reserva de Prendas Offline en Modo Desconectado
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Cliente
//   Boundary: ReservationsPageComponent, MyReservationsPageComponent (Object, "boundary")
//   Control: NetworkStatusService, IdbReservationsService, ReservationApiService, ReservationRoutes, ReservationService (Object, "control")
//   Entity: PendingReservationItem, Reservation, ReservationItem, Inventory (Object, "entity")
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

    // 1. Crear Elementos con Estereotipos ICONIX (nombres fieles al codigo real)
    var actorCliente  = crearElementoConEsterotipo(pkg, "Cliente", "Actor", "");
    var uiReserva     = crearElementoConEsterotipo(pkg, "ReservationsPageComponent", "Object", "boundary");
    var uiMisReservas = crearElementoConEsterotipo(pkg, "MyReservationsPageComponent", "Object", "boundary");
    var ctrlNet       = crearElementoConEsterotipo(pkg, "NetworkStatusService", "Object", "control");
    var ctrlLocal     = crearElementoConEsterotipo(pkg, "IdbReservationsService", "Object", "control");
    var ctrlApi       = crearElementoConEsterotipo(pkg, "ReservationApiService", "Object", "control");
    var ctrlRoutes    = crearElementoConEsterotipo(pkg, "ReservationRoutes", "Object", "control");
    var ctrlBackend   = crearElementoConEsterotipo(pkg, "ReservationService", "Object", "control");

    var entLocalRes   = crearElementoConEsterotipo(pkg, "PendingReservationItem", "Object", "entity");
    var entReserva    = crearElementoConEsterotipo(pkg, "Reservation", "Object", "entity");
    var entItem       = crearElementoConEsterotipo(pkg, "ReservationItem", "Object", "entity");
    var entInventory  = crearElementoConEsterotipo(pkg, "Inventory", "Object", "entity");

    // 2. Crear Diagrama de Comunicación
    var diagName = "CU11 - Comunicación Registrar Reserva Offline";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Distribucion espacial compacta
    colocarElemento(diagram, actorCliente,    40,  160, -180, -260);
    colocarElemento(diagram, uiReserva,      240,  440,  -60, -140);
    colocarElemento(diagram, uiMisReservas,  240,  440, -340, -420);
    colocarElemento(diagram, ctrlNet,        520,  720,  -60, -140);
    colocarElemento(diagram, ctrlLocal,      520,  720, -340, -420);
    colocarElemento(diagram, entLocalRes,    800, 1000, -340, -420);
    colocarElemento(diagram, ctrlApi,       1080, 1280, -340, -420);
    colocarElemento(diagram, ctrlRoutes,    1360, 1560, -340, -420);
    colocarElemento(diagram, ctrlBackend,   1640, 1840, -340, -420);
    colocarElemento(diagram, entInventory,  1920, 2120,  -60, -140);
    colocarElemento(diagram, entReserva,    1920, 2120, -340, -420);
    colocarElemento(diagram, entItem,       1920, 2120, -600, -680);

    // 4. Mensajes: numeracion jerarquica IDENTICA al diagrama de Secuencia

    // Fase 1: Registro offline en ReservationsPageComponent
    crearMensaje(actorCliente, uiReserva, "1: prepararReserva()");
    crearMensaje(uiReserva, ctrlNet, "1.1: effectiveOnline()");
    crearMensaje(ctrlNet, uiReserva, "1.2: connectivityState()");
    crearMensaje(uiReserva, ctrlLocal, "1.3: savePending()");
    crearMensaje(ctrlLocal, entLocalRes, "1.4: create()");
    crearMensaje(entLocalRes, ctrlLocal, "1.5: pendingRecord()");
    crearMensaje(ctrlLocal, uiReserva, "1.6: savedOffline()");
    crearMensaje(uiReserva, actorCliente, "1.7: renderizarModalConfirmacion()");

    // Fase 2: Reconexion y sincronizacion desde MyReservationsPageComponent
    crearMensaje(actorCliente, uiMisReservas, "2: sincronizarPendientes()");
    crearMensaje(uiMisReservas, ctrlLocal, "2.1: getPending()");
    crearMensaje(ctrlLocal, uiMisReservas, "2.2: pendingList()");
    crearMensaje(uiMisReservas, ctrlApi, "2.3: createReservation()");
    crearMensaje(ctrlApi, ctrlRoutes, "2.4: POST /reservations/");
    crearMensaje(ctrlRoutes, ctrlBackend, "2.5: create_reservation()");
    crearMensaje(ctrlBackend, ctrlBackend, "2.6: validateIdempotency()");
    crearMensaje(ctrlBackend, entInventory, "2.7: with_for_update()");
    crearMensaje(entInventory, ctrlBackend, "2.8: lockResult()");
    crearMensaje(ctrlBackend, entReserva, "2.9: create()");
    crearMensaje(entReserva, ctrlBackend, "2.10: reservationRecord()");
    crearMensaje(ctrlBackend, entItem, "2.11: add()");
    crearMensaje(entItem, ctrlBackend, "2.12: itemRecord()");
    crearMensaje(ctrlBackend, ctrlApi, "2.13: HTTP 201 Created");
    crearMensaje(ctrlApi, uiMisReservas, "2.14: createdReservation()");
    crearMensaje(uiMisReservas, ctrlLocal, "2.15: removePending()");
    crearMensaje(ctrlLocal, entLocalRes, "2.16: delete()");
    crearMensaje(entLocalRes, ctrlLocal, "2.17: deleted()");
    crearMensaje(ctrlLocal, uiMisReservas, "2.18: pendingCleared()");
    crearMensaje(uiMisReservas, actorCliente, "2.19: renderizarResumenSincronizacion()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch(ex) {}

    Log("¡Diagrama de Comunicación para CU11 corregido exitosamente!");
}

Main();
