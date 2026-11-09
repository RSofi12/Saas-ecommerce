// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU12 - Atender y Resolver Conflictos de Reservas Expiradas (Enfoque A: Fiel al Código)
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Encargado de Sucursal
//   Boundary: ReservationsPageComponent, ResolveConflictModal (Object, «boundary»)
//   Control: SweeperService, ListConflictsService, ResolveConflictService (Object, «control»)
//   Entity: Reservation, ReservationItem, Inventory (Object, «entity»)
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

    Log("Generando Diagrama de Comunicación CU12 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX
    var actorEncargado  = crearElementoConEsterotipo(pkg, "Encargado de Sucursal", "Actor", "");
    var uiPanel         = crearElementoConEsterotipo(pkg, "ReservationsPageComponent", "Object", "boundary");
    var uiModal         = crearElementoConEsterotipo(pkg, "ResolveConflictModal", "Object", "boundary");

    var ctrlSweeper     = crearElementoConEsterotipo(pkg, "SweeperService", "Object", "control");
    var ctrlList        = crearElementoConEsterotipo(pkg, "ListConflictsService", "Object", "control");
    var ctrlResolve     = crearElementoConEsterotipo(pkg, "ResolveConflictService", "Object", "control");

    var entReserva      = crearElementoConEsterotipo(pkg, "Reservation", "Object", "entity");
    var entItem         = crearElementoConEsterotipo(pkg, "ReservationItem", "Object", "entity");
    var entInventory    = crearElementoConEsterotipo(pkg, "Inventory", "Object", "entity");

    // 2. Crear Diagrama de Comunicación
    var diagName = "CU12 - Comunicación Resolver Conflictos Reservas";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Distribución espacial compacta
    colocarElemento(diagram, actorEncargado,  40, 120, -180, -260);
    colocarElemento(diagram, uiPanel,        240, 320, -180, -260);
    colocarElemento(diagram, uiModal,        240, 320,  -40, -120);

    colocarElemento(diagram, ctrlSweeper,    460, 540,  -40, -120);
    colocarElemento(diagram, ctrlList,       460, 540, -180, -260);
    colocarElemento(diagram, ctrlResolve,    680, 760, -180, -260);

    colocarElemento(diagram, entReserva,     240, 320, -320, -400);
    colocarElemento(diagram, entItem,        460, 540, -320, -400);
    colocarElemento(diagram, entInventory,   680, 760, -320, -400);

    // 4. Conectores con funciones sin parámetros ()
    // Flujo 1: Barrido de Expiración en Mostrador
    crearMensaje(actorEncargado, uiPanel, "1: auditarVencidasYBandeja()");
    crearMensaje(uiPanel, ctrlSweeper, "1.1: POST /reservations/sweeper");
    crearMensaje(ctrlSweeper, entReserva, "1.2: identificarVencidas()");
    crearMensaje(ctrlSweeper, entInventory, "1.3: decrementarReservedQuantity()");
    crearMensaje(ctrlSweeper, entReserva, "1.4: update()");
    crearMensaje(ctrlSweeper, uiPanel, "1.5: HTTP 200 OK");

    // Flujo 2: Carga de Bandeja de Conflictos y Diagnóstico de Percha
    crearMensaje(uiPanel, ctrlList, "2: listBranchConflicts()");
    crearMensaje(ctrlList, entReserva, "2.1: filter()");
    crearMensaje(ctrlList, entInventory, "2.2: calcularDisponibilidadPercha()");
    crearMensaje(ctrlList, uiPanel, "2.3: retornarConflictosConStock()");
    crearMensaje(uiPanel, actorEncargado, "2.4: renderizarDiagnosticoPercha()");

    // Flujo 3: Apertura de Modal y Selección de Vía de Resolución
    crearMensaje(actorEncargado, uiPanel, "3: abrirReservaVencida()");
    crearMensaje(uiPanel, uiModal, "3.1: mostrarOpcionesResolucion()");
    crearMensaje(actorEncargado, uiModal, "3.2: seleccionarVia()");
    crearMensaje(uiModal, ctrlResolve, "3.3: resolveConflict()");

    // Validaciones transaccionales en Controller con with_for_update
    crearMensaje(ctrlResolve, ctrlResolve, "3.4: validarJustificacion()");
    crearMensaje(ctrlResolve, entInventory, "3.5: validarStockDisponibleActual()");
    crearMensaje(ctrlResolve, entReserva, "3.6: actualizarEstadoYAuditoria()");
    crearMensaje(ctrlResolve, entItem, "3.7: reasignarVarianteSustituta()");
    crearMensaje(ctrlResolve, uiModal, "3.8: confirmarResolucionExitosa()");
    crearMensaje(uiModal, uiPanel, "3.9: refrescarBandejaConflictos()");
    crearMensaje(uiPanel, actorEncargado, "3.10: mostrarMensajeExito()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch (ex) { }

    Log("¡Diagrama de Comunicación para CU12 generado exitosamente!");
}

Main();
