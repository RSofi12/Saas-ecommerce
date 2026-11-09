// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU10 - Crear Reserva Online de Prendas con Vencimiento y Bloqueo
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Cliente (Actor)
//   Boundary: ReservationsPageComponent, ReservationApiService («boundary»)
//   Control: ReservationRoutes, ReservationService («control»)
//   Entity: Reservation, ReservationItem, Inventory, Branch («entity»)
//
// Reglas Metodológicas Estrictas:
//   - Todas las funciones se expresan con paréntesis vacíos () sin parámetros internos.
//   - Cero bucles o validaciones sobre Fronteras (las validaciones residen en Controllers).
//   - Elementos creados como "Object" para forzar iconos nativos circulares BCE en EA.
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

    Log("Generando Diagrama de Comunicación / Robustez CU10 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX (Tipo 'Object' para BCE canónico)
    var actorCliente     = crearElementoConEsterotipo(pkg, "Cliente", "Actor", "");

    var uiReservations   = crearElementoConEsterotipo(pkg, "ReservationsPageComponent", "Object", "boundary");
    var uiApi            = crearElementoConEsterotipo(pkg, "ReservationApiService", "Object", "boundary");

    var ctrlRoutes       = crearElementoConEsterotipo(pkg, "ReservationRoutes", "Object", "control");
    var ctrlService      = crearElementoConEsterotipo(pkg, "ReservationService", "Object", "control");

    var entRes           = crearElementoConEsterotipo(pkg, "Reservation", "Object", "entity");
    var entItem          = crearElementoConEsterotipo(pkg, "ReservationItem", "Object", "entity");
    var entInventory     = crearElementoConEsterotipo(pkg, "Inventory", "Object", "entity");
    var entBranch        = crearElementoConEsterotipo(pkg, "Branch", "Object", "entity");

    // 2. Crear Diagrama de Comunicación / Robustez
    var diagName = "CU10 - Robustez Crear Reserva Online de Prendas";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Distribución espacial horizontal equilibrada (cajas 80x80 px)
    colocarElemento(diagram, actorCliente,     40,  120, -180, -260);
    colocarElemento(diagram, uiReservations,  180,  260, -180, -260);
    colocarElemento(diagram, uiApi,           320,  400, -180, -260);

    colocarElemento(diagram, ctrlRoutes,      460,  540, -180, -260);
    colocarElemento(diagram, ctrlService,     600,  680, -180, -260);

    colocarElemento(diagram, entRes,          740,  820, -100, -180);
    colocarElemento(diagram, entItem,         740,  820, -190, -270);
    colocarElemento(diagram, entInventory,    740,  820, -280, -360);
    colocarElemento(diagram, entBranch,       740,  820, -370, -450);

    // 4. Mensajes individuales limpios (Sin parámetros y con validaciones en Control)
    // Secuencia 1: Creación Exitosa de Reserva Online
    crearMensaje(actorCliente, uiReservations, "1: solicitarReservaPrenda()");
    crearMensaje(uiReservations, uiApi, "1.1: createReservation()");
    crearMensaje(uiApi, ctrlRoutes, "1.2: create_reservation_route()");
    crearMensaje(ctrlRoutes, ctrlService, "1.3: create_reservation()");
    crearMensaje(ctrlService, ctrlService, "1.4: validarRangoFechaVisita()");
    crearMensaje(ctrlService, entBranch, "1.5: query()");
    crearMensaje(ctrlService, entInventory, "1.6: _get_inventory_for_update()");
    crearMensaje(ctrlService, ctrlService, "1.7: validarStockDisponible()");
    crearMensaje(ctrlService, entRes, "1.8: create()");
    crearMensaje(ctrlService, entItem, "1.9: create()");
    crearMensaje(ctrlService, entInventory, "1.10: incrementarReservedQuantity()");
    crearMensaje(ctrlService, ctrlRoutes, "1.11: response()");
    crearMensaje(ctrlRoutes, uiApi, "1.12: response()");
    crearMensaje(uiApi, uiReservations, "1.13: response()");
    crearMensaje(uiReservations, actorCliente, "1.14: mostrarComprobanteReserva()");

    // Secuencia 2: Flujo Alternativo A1 - Quiebre de Stock
    crearMensaje(actorCliente, uiReservations, "2: solicitarReservaPrenda()");
    crearMensaje(ctrlService, ctrlService, "2.1: validarStockDisponible()");
    crearMensaje(ctrlService, ctrlRoutes, "2.2: raise_http_exception()");
    crearMensaje(uiReservations, actorCliente, "2.3: showErrorToast()");

    // Secuencia 3: Flujo Alternativo A2 - Fecha de Visita Fuera de Rango
    crearMensaje(actorCliente, uiReservations, "3: solicitarReservaPrenda()");
    crearMensaje(ctrlService, ctrlService, "3.1: validarRangoFechaVisita()");
    crearMensaje(ctrlService, ctrlRoutes, "3.2: raise_http_exception()");
    crearMensaje(uiReservations, actorCliente, "3.3: showErrorToast()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch(ex) {}

    Log("¡Diagrama de Robustez / Comunicación CU10 generado exitosamente en Enterprise Architect!");
}

Main();
