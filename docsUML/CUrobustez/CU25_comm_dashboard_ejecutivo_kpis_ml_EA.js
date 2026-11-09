// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU25 - Visualizar Dashboard Ejecutivo con KPIs y Métricas ML
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX / BCE):
//   Actor: AdministradorTenant
//   Boundary: AdminHomePageComponent, DashboardApiService, CatalogApiService (Object, «boundary»)
//   Control: DashboardRoutes, DashboardService, CatalogRoutes (Object, «control»)
//   Entity: Branch, Sale, SaleItem, Inventory, InventoryMovement, Reservation, DemandForecast, CustomerSegment (Object, «entity»)
//
// Reglas Metodológicas Estrictas:
//   - Todas las funciones se expresan con paréntesis vacíos () sin parámetros internos.
//   - Cero bucles o validaciones sobre Fronteras (las validaciones residen en Controllers).
//   - Conectores directos tipo Association con Direction = "Source -> Destination" (100% compatible EA v15).
// ============================================================================

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
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
    return diagObj;
}

function crearMensaje(origen, destino, texto) {
    var con = origen.Connectors.AddNew(texto, "Association");
    con.SupplierID = destino.ElementID;
    con.Name = texto;
    con.Direction = "Source -> Destination";
    con.Update();
    origen.Connectors.Refresh();
    return con;
}

function Main() {
    Log("Iniciando generación de Diagrama de Comunicación CU25...");

    if (Repo == null) {
        Log("ERROR: No se encontró instancia activa de Enterprise Architect.");
        return;
    }

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        var models = Repo.Models;
        if (models.Count > 0) {
            var root = models.GetAt(0);
            for (var i = 0; i < root.Packages.Count; i++) {
                var p = root.Packages.GetAt(i);
                if (p.Name == "CUrobustez" || p.Name == "Robustez") {
                    pkg = p;
                    break;
                }
            }
            if (pkg == null) pkg = root.Packages.GetAt(0);
        }
    }

    if (pkg == null) {
        Log("ERROR: No se pudo obtener el paquete de destino.");
        return;
    }

    // 1. Crear Elementos del Modelo BCE
    var actorAdmin      = crearElementoConEsterotipo(pkg, "AdministradorTenant", "Actor", "");
    var uiHomePage      = crearElementoConEsterotipo(pkg, "AdminHomePageComponent", "Object", "boundary");
    var uiDashboardApi  = crearElementoConEsterotipo(pkg, "DashboardApiService", "Object", "boundary");
    var uiCatalogApi    = crearElementoConEsterotipo(pkg, "CatalogApiService", "Object", "boundary");

    var ctrlDashRoutes  = crearElementoConEsterotipo(pkg, "DashboardRoutes", "Object", "control");
    var ctrlDashService = crearElementoConEsterotipo(pkg, "DashboardService", "Object", "control");
    var ctrlCatRoutes   = crearElementoConEsterotipo(pkg, "CatalogRoutes", "Object", "control");

    var entBranch       = crearElementoConEsterotipo(pkg, "Branch", "Object", "entity");
    var entSale         = crearElementoConEsterotipo(pkg, "Sale", "Object", "entity");
    var entSaleItem     = crearElementoConEsterotipo(pkg, "SaleItem", "Object", "entity");
    var entInventory    = crearElementoConEsterotipo(pkg, "Inventory", "Object", "entity");
    var entMovement     = crearElementoConEsterotipo(pkg, "InventoryMovement", "Object", "entity");
    var entReservation  = crearElementoConEsterotipo(pkg, "Reservation", "Object", "entity");
    var entForecast     = crearElementoConEsterotipo(pkg, "DemandForecast", "Object", "entity");
    var entSegment      = crearElementoConEsterotipo(pkg, "CustomerSegment", "Object", "entity");

    // 2. Crear Diagrama de Comunicación
    var diagName = "CU25 - Comunicación Dashboard Ejecutivo con KPIs y ML";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Posicionamiento Horizontal y Radial (Compacto 60x60 px)
    colocarElemento(diagram, actorAdmin,      40,   90,  -250, -330); // Actor 50x80
    colocarElemento(diagram, uiHomePage,     170,  230,  -250, -310); // 60x60
    colocarElemento(diagram, uiCatalogApi,   310,  370,  -140, -200); // 60x60
    colocarElemento(diagram, uiDashboardApi, 310,  370,  -360, -420); // 60x60

    colocarElemento(diagram, ctrlCatRoutes,   460,  520,  -140, -200); // 60x60
    colocarElemento(diagram, ctrlDashRoutes,  460,  520,  -360, -420); // 60x60
    colocarElemento(diagram, ctrlDashService, 610,  670,  -360, -420); // 60x60

    colocarElemento(diagram, entBranch,      610,  670,  -140, -200); // 60x60
    colocarElemento(diagram, entSale,        760,  820,  -220, -280); // 60x60
    colocarElemento(diagram, entSaleItem,    880,  940,  -220, -280); // 60x60
    colocarElemento(diagram, entInventory,   760,  820,  -320, -380); // 60x60
    colocarElemento(diagram, entMovement,    880,  940,  -320, -380); // 60x60
    colocarElemento(diagram, entReservation, 760,  820,  -420, -480); // 60x60
    colocarElemento(diagram, entForecast,    880,  940,  -420, -480); // 60x60
    colocarElemento(diagram, entSegment,     820,  880,  -520, -580); // 60x60

    // 4. Mensajes del Flujo ICONIX (Funciones estrictamente sin parámetros)
    // Flujo 1: Carga Inicial de Sucursales de Filtro
    crearMensaje(actorAdmin, uiHomePage,        "1: accederDashboardPrincipal()");
    crearMensaje(uiHomePage, uiCatalogApi,      "1.1: getBranches()");
    crearMensaje(uiCatalogApi, ctrlCatRoutes,   "1.2: GET_branches()");
    crearMensaje(ctrlCatRoutes, entBranch,      "1.3: getTenantActiveBranches()");
    crearMensaje(entBranch, ctrlCatRoutes,      "1.4: returnBranchDTOs()");
    crearMensaje(ctrlCatRoutes, uiCatalogApi,   "1.5: returnJsonSuccess()");
    crearMensaje(uiCatalogApi, uiHomePage,      "1.6: returnBranchList()");

    // Flujo 2: Consulta Agregada Multidimensional de KPIs y Métricas ML
    crearMensaje(actorAdmin, uiHomePage,        "2: aplicarFiltrosPeriodoYSucursal()");
    crearMensaje(uiHomePage, uiDashboardApi,    "2.1: getDashboard()");
    crearMensaje(uiDashboardApi, ctrlDashRoutes,"2.2: GET_dashboard()");
    crearMensaje(ctrlDashRoutes, ctrlDashRoutes,"2.3: validarPermisosDirectivos()");
    crearMensaje(ctrlDashRoutes, ctrlDashService,"2.4: get_dashboard()");

    // Agregación de Métricas en Base de Datos (Pivote Central en Controller)
    crearMensaje(ctrlDashService, entSale,         "2.5: consultarTotalVentasYOrdenes()");
    crearMensaje(ctrlDashService, entSaleItem,     "2.6: consultarUnidadesVendidas()");
    crearMensaje(ctrlDashService, entInventory,    "2.7: consultarConsolidadoInventario()");
    crearMensaje(ctrlDashService, entMovement,     "2.8: consultarMovimientosKardex()");
    crearMensaje(ctrlDashService, entReservation,  "2.9: consultarReservasActivas()");
    crearMensaje(ctrlDashService, entForecast,     "2.10: consultarProyeccionesDemanda()");
    crearMensaje(ctrlDashService, entSegment,      "2.11: consultarDistribucionClusters()");

    // Agrupación y Cálculos Internos en Controller
    crearMensaje(ctrlDashService, ctrlDashService, "2.12: compilarResumenEjecutivo()");
    crearMensaje(ctrlDashService, ctrlDashService, "2.13: calcularSeriesEvolucionVentas()");
    crearMensaje(ctrlDashService, ctrlDashService, "2.14: desglosarKpisPorSucursal()");

    // Retorno Jerárquico de Datos
    crearMensaje(ctrlDashService, ctrlDashRoutes,  "2.15: returnDashboardResponse()");
    crearMensaje(ctrlDashRoutes, uiDashboardApi,   "2.16: returnJsonSuccess()");
    crearMensaje(uiDashboardApi, uiHomePage,       "2.17: returnObservableData()");
    crearMensaje(uiHomePage, actorAdmin,           "3: renderizarKpisYGraficosChrts()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch (e) { }

    Log("Diagrama de Comunicación '" + diagName + "' generado exitosamente.");
    try { Session.Prompt("¡Diagrama de Comunicación CU25 generado exitosamente!", 0); } catch (e) { }
}

Main();
