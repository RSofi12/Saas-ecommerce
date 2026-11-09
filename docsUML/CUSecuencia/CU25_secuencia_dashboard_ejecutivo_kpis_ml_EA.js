/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU25 - Visualizar Dashboard Ejecutivo con KPIs y Métricas ML
 * DESCRIPCION: Compila y visualiza en tiempo real los indicadores clave de desempeño (KPIs)
 *              del negocio textil: ventas brutas, ticket promedio, quiebres de inventario,
 *              balance de reservas activas, trazabilidad de movimientos (entradas, salidas,
 *              traspasos) y métricas analíticas de Machine Learning (curvas de demanda
 *              proyectada CU23 y distribución de segmentos de clientes CU24).
 *
 * ACTORES: AdministradorTenant, Superadmin (Directivos del Sistema)
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 *
 * NORMAS Y PAUTAS APLICADAS (ICONIX UML 2.5+):
 * - Participantes rectangulares Sequence con nombres :NombreComponente y estereotipos
 *   «Interface», «Controller», «Entity » con dObj.Style = "usecustomart=0;HideIcon=1;".
 * - Numeración secuencial estricta (con.SequenceNo = sequenceNo) para garantizar orden vertical.
 * - Sin cruces horizontales entre entidades (comunicación exclusiva Controller -> Entity).
 * - Métodos estrictamente sin parámetros internos 'metodo()' según la convención de cátedra.
 * - Declaración formal de InteractionFragment en Enterprise Architect:
 *     * alt [Filtro Específico por Sucursal / Consolidado Global Multisucursal]
 *     * loop [Por cada día/semana en la serie temporal seleccionada]
 *     * loop [Por cada sucursal configurada: agregación de ventas y stock]
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU25 - Secuencia Dashboard Ejecutivo con KPIs y ML";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU25-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
}

function getTargetPackage() {
    if (Repo == null) return null;
    var selectedPkg = Repo.GetTreeSelectedPackage();
    if (selectedPkg != null) {
        log("Usando paquete seleccionado en Project Browser: " + selectedPkg.Name);
        return selectedPkg;
    }

    var roots = Repo.Models;
    var root = (roots.Count > 0) ? roots.GetAt(0) : null;
    if (root == null) {
        try { Session.Prompt("No se encontro ningun modelo raiz en Enterprise Architect.", 0); } catch (e) { }
        return null;
    }

    for (var i = 0; i < root.Packages.Count; i++) {
        var pkg = root.Packages.GetAt(i);
        if (pkg.Name == DEFAULT_PACKAGE_NAME) return pkg;
    }

    var newPkg = root.Packages.AddNew(DEFAULT_PACKAGE_NAME, "Package");
    newPkg.Update();
    root.Packages.Refresh();
    log("Paquete creado: " + DEFAULT_PACKAGE_NAME);
    return newPkg;
}

function recreateDiagram(pkg) {
    for (var i = pkg.Diagrams.Count - 1; i >= 0; i--) {
        var d = pkg.Diagrams.GetAt(i);
        if (d.Name == DIAGRAM_NAME) {
            try {
                pkg.Diagrams.Delete(i);
                pkg.Diagrams.Refresh();
                log("Diagrama previo eliminado para regeneración limpia.");
            } catch (e) {
                log("Aviso al eliminar: " + e.message);
            }
            break;
        }
    }
    var diag = pkg.Diagrams.AddNew(DIAGRAM_NAME, "Sequence");
    diag.Update();
    pkg.Diagrams.Refresh();
    return diag;
}

function addActorParticipant(pkg, diag, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Actor");
    el.Update();
    pkg.Elements.Refresh();

    var rightX = leftX + width;
    var dObj = diag.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-3200;", "");
    dObj.ElementID = el.ElementID;
    dObj.Update();
    return el;
}

function addParticipant(pkg, diag, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) {
        el.Stereotype = stereotype;
    }
    el.Update();
    pkg.Elements.Refresh();

    var rightX = leftX + width;
    var dObj = diag.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-3100;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

function addEntityParticipant(pkg, diag, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    el.Stereotype = "Entity" + String.fromCharCode(160);
    el.Update();
    pkg.Elements.Refresh();

    var rightX = leftX + width;
    var dObj = diag.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-3100;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

function addCombinedFragment(pkg, diag, type, guardLabel, left, right, top, bottom) {
    try {
        var frag = pkg.Elements.AddNew(guardLabel, "InteractionFragment");
        frag.Stereotype = type;
        frag.Update();

        var dObj = diag.DiagramObjects.AddNew("l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";", "");
        dObj.ElementID = frag.ElementID;
        dObj.Update();
        return frag;
    } catch (err) {
        log("Nota al crear fragmento (" + type + "): " + err.message);
        return null;
    }
}

function addMessage(src, dst, label, isReturn, sequenceNo) {
    var con = src.Connectors.AddNew(label, "Sequence");
    con.ClientID = src.ElementID;
    con.SupplierID = dst.ElementID;
    if (isReturn) {
        con.Stereotype = "return";
    }
    if (sequenceNo) {
        try {
            con.SequenceNo = sequenceNo;
        } catch (e) { }
    }
    con.Update();
    src.Connectors.Refresh();
    return con;
}

function Main() {
    log("Iniciando generación de Diagrama de Secuencia CU25 con arquitectura BCE pura...");

    var pkg = getTargetPackage();
    if (pkg == null) return;

    var diagram = recreateDiagram(pkg);

    // 1. Participantes con Recuadros Rectangulares (:NombreComponente y estereotipos)
    var actorAdmin      = addActorParticipant(pkg, diagram, "AdministradorTenant", 30, 80);
    var uiHomePage      = addParticipant(pkg, diagram, ":AdminHomePageComponent", "Interface",  140, 180);
    var uiDashboardApi  = addParticipant(pkg, diagram, ":DashboardApiService",    "Interface",  340, 150);
    var uiCatalogApi    = addParticipant(pkg, diagram, ":CatalogApiService",      "Interface",  510, 150);
    var ctrlCatRoutes   = addParticipant(pkg, diagram, ":CatalogRoutes",        "Controller", 680, 130);
    var ctrlDashRoutes  = addParticipant(pkg, diagram, ":DashboardRoutes",      "Controller", 830, 140);
    var ctrlDashService = addParticipant(pkg, diagram, ":DashboardService",     "Controller", 990, 150);

    var entBranch       = addEntityParticipant(pkg, diagram, ":Branch",             1160, 80);
    var entSale         = addEntityParticipant(pkg, diagram, ":Sale",               1260, 80);
    var entSaleItem     = addEntityParticipant(pkg, diagram, ":SaleItem",           1360, 80);
    var entInventory    = addEntityParticipant(pkg, diagram, ":Inventory",          1460, 90);
    var entMovement     = addEntityParticipant(pkg, diagram, ":InventoryMovement", 1570, 120);
    var entReservation  = addEntityParticipant(pkg, diagram, ":Reservation",       1710, 100);
    var entForecast     = addEntityParticipant(pkg, diagram, ":DemandForecast",     1830, 110);
    var entSegment      = addEntityParticipant(pkg, diagram, ":CustomerSegment",    1960, 110);

    var seq = 1;

    // Fase 1: Carga de Sucursales Disponibles
    addMessage(actorAdmin, uiHomePage, "1: accederDashboardPrincipal()", false, seq++);
    addMessage(uiHomePage, uiCatalogApi, "1.1: getBranches()", false, seq++);
    addMessage(uiCatalogApi, ctrlCatRoutes, "1.2: GET_branches()", false, seq++);
    addMessage(ctrlCatRoutes, entBranch, "1.3: getTenantActiveBranches()", false, seq++);
    addMessage(entBranch, ctrlCatRoutes, "1.4: returnBranchDTOs()", true, seq++);
    addMessage(ctrlCatRoutes, uiCatalogApi, "1.5: returnJsonSuccess()", true, seq++);
    addMessage(uiCatalogApi, uiHomePage, "1.6: returnBranchList()", true, seq++);

    // Fase 2: Consulta de Métricas y KPIs Consolidados
    addMessage(actorAdmin, uiHomePage, "2: aplicarFiltrosPeriodoYSucursal()", false, seq++);
    addMessage(uiHomePage, uiDashboardApi, "2.1: getDashboard()", false, seq++);
    addMessage(uiDashboardApi, ctrlDashRoutes, "2.2: GET_dashboard()", false, seq++);
    addMessage(ctrlDashRoutes, ctrlDashRoutes, "2.3: validarPermisosDirectivos()", false, seq++);
    addMessage(ctrlDashRoutes, ctrlDashService, "2.4: get_dashboard()", false, seq++);

    // Fase 3: Consultas Agregadas de Base de Datos (Pivote Central en Controller)
    addCombinedFragment(pkg, diagram, "alt", "alt [Filtro Sucursal Activo / Consolidado Global]", 970, 1500, -380, -510);
    addMessage(ctrlDashService, entSale, "2.5: consultarTotalVentasYOrdenes()", false, seq++);
    addMessage(entSale, ctrlDashService, "2.6: returnSalesTotals()", true, seq++);
    addMessage(ctrlDashService, entSaleItem, "2.7: consultarUnidadesVendidas()", false, seq++);
    addMessage(entSaleItem, ctrlDashService, "2.8: returnUnitsTotal()", true, seq++);

    addMessage(ctrlDashService, entInventory, "2.9: consultarConsolidadoInventario()", false, seq++);
    addMessage(entInventory, ctrlDashService, "2.10: returnInventoryTotals()", true, seq++);
    addMessage(ctrlDashService, entMovement, "2.11: consultarMovimientosKardex()", false, seq++);
    addMessage(entMovement, ctrlDashService, "2.12: returnMovementBreakdown()", true, seq++);
    addMessage(ctrlDashService, entReservation, "2.13: consultarReservasActivas()", false, seq++);
    addMessage(entReservation, ctrlDashService, "2.14: returnActiveReservations()", true, seq++);

    // Métricas Analíticas y de ML (CU23 y CU24)
    addMessage(ctrlDashService, entForecast, "2.15: consultarProyeccionesDemanda()", false, seq++);
    addMessage(entForecast, ctrlDashService, "2.16: returnDemandProjections()", true, seq++);
    addMessage(ctrlDashService, entSegment, "2.17: consultarDistribucionClusters()", false, seq++);
    addMessage(entSegment, ctrlDashService, "2.18: returnClusterDistribution()", true, seq++);

    // Fase 4: Procesamiento de Series Temporales y Agrupación por Sucursal (Fragmento LOOP)
    addCombinedFragment(pkg, diagram, "loop", "loop [Por cada fecha/semana en la serie]", 970, 1150, -820, -930);
    addMessage(ctrlDashService, ctrlDashService, "2.19: compilarResumenEjecutivo()", false, seq++);
    addMessage(ctrlDashService, ctrlDashService, "2.20: calcularSeriesEvolucionVentas()", false, seq++);

    addCombinedFragment(pkg, diagram, "loop", "loop [Por cada sucursal del tenant]", 970, 1150, -950, -1040);
    addMessage(ctrlDashService, ctrlDashService, "2.21: desglosarKpisPorSucursal()", false, seq++);

    // Fase 5: Retorno Jerárquico y Renderizado Reactivo en Pantalla
    addMessage(ctrlDashService, ctrlDashRoutes, "2.22: returnDashboardResponse()", true, seq++);
    addMessage(ctrlDashRoutes, uiDashboardApi, "2.23: returnJsonSuccess()", true, seq++);
    addMessage(uiDashboardApi, uiHomePage, "2.24: returnObservableData()", true, seq++);
    addMessage(uiHomePage, actorAdmin, "3: renderizarKpisYGraficosChrts()", false, seq++);

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch (e) { }

    log("Diagrama de Secuencia '" + DIAGRAM_NAME + "' generado exitosamente con recuadros rectangulares.");
    try { Session.Prompt("¡Diagrama de Secuencia CU25 generado con recuadros rectangulares!", 0); } catch (e) { }
}

Main();
