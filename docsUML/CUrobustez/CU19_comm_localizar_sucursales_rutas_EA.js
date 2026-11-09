// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU19 - Localizar Sucursales y Trazar Rutas (OpenStreetMap / ORS)
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Cliente
//   Boundary: ManagementPage, BranchesMapPage, OpenStreetMapServer, OSRM_RoutingEngine (Object, «boundary»)
//   Control: BranchesMapController, RoutingService, CatalogApi, BranchRoutes, BranchService (Object, «control»)
//   Entity: Branch, RouteInfo (Object, «entity»)
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

    Log("Generando Diagrama de Comunicación CU19 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX
    var actorCliente    = crearElementoConEsterotipo(pkg, "Cliente", "Actor", "");

    var uiManagement    = crearElementoConEsterotipo(pkg, "ManagementPage", "Object", "boundary");
    var uiMapPage       = crearElementoConEsterotipo(pkg, "BranchesMapPage", "Object", "boundary");
    var gwOsmTiles      = crearElementoConEsterotipo(pkg, "OpenStreetMapServer", "Object", "boundary");
    var gwOsrmEngine    = crearElementoConEsterotipo(pkg, "OSRM_RoutingEngine", "Object", "boundary");

    var ctrlMap         = crearElementoConEsterotipo(pkg, "BranchesMapController", "Object", "control");
    var ctrlRoutingSvc  = crearElementoConEsterotipo(pkg, "RoutingService", "Object", "control");
    var ctrlCatalogApi  = crearElementoConEsterotipo(pkg, "CatalogApi", "Object", "control");
    var ctrlRoutes      = crearElementoConEsterotipo(pkg, "BranchRoutes", "Object", "control");
    var ctrlService     = crearElementoConEsterotipo(pkg, "BranchService", "Object", "control");

    var entBranch       = crearElementoConEsterotipo(pkg, "Branch", "Object", "entity");
    var entRouteInfo    = crearElementoConEsterotipo(pkg, "RouteInfo", "Object", "entity");

    // 2. Crear Diagrama de Comunicación
    var diagName = "CU19 - Comunicación Localizar Sucursales y Rutas";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Posicionamiento en Grilla Circular/Radial
    // Posicionamiento Compacto 60x60 px
    colocarElemento(diagram, actorCliente,    50,  100,  -250, -330); // Actor 50x80
    colocarElemento(diagram, uiManagement,   180,  240,  -150, -210); // 60x60
    colocarElemento(diagram, uiMapPage,      320,  380,  -150, -210); // 60x60
    colocarElemento(diagram, gwOsmTiles,     480,  540,  -150, -210); // 60x60
    colocarElemento(diagram, gwOsrmEngine,   640,  700,  -350, -410); // 60x60

    colocarElemento(diagram, ctrlMap,        320,  380,  -300, -360); // 60x60
    colocarElemento(diagram, ctrlCatalogApi, 180,  240,  -420, -480); // 60x60
    colocarElemento(diagram, ctrlRoutes,     180,  240,  -540, -600); // 60x60
    colocarElemento(diagram, ctrlService,    320,  380,  -540, -600); // 60x60
    colocarElemento(diagram, ctrlRoutingSvc, 480,  540,  -350, -410); // 60x60

    colocarElemento(diagram, entBranch,      480,  540,  -540, -600); // 60x60
    colocarElemento(diagram, entRouteInfo,   640,  700,  -480, -540); // 60x60

    // 4. Mensajes del Flujo ICONIX (Paréntesis vacíos)
    // Interacción Actor -> Frontera
    crearMensaje(actorCliente, uiManagement, "1: tapNuestrasBoutiques()");
    crearMensaje(uiManagement, uiMapPage,    "1.1: pushNamed()");
    crearMensaje(uiMapPage, ctrlMap,         "2: initialize()");

    // Control de Geolocalización y Carga de Sucursales
    crearMensaje(ctrlMap, ctrlMap,           "2.1: _initLocation()");
    crearMensaje(ctrlMap, ctrlCatalogApi,    "3: getBranches()");
    crearMensaje(ctrlCatalogApi, ctrlRoutes, "3.1: GET_public_branches()");
    crearMensaje(ctrlRoutes, ctrlService,    "3.2: get_public_branches()");
    crearMensaje(ctrlService, entBranch,     "3.3: filterByTenantAndActive()");
    crearMensaje(ctrlService, ctrlRoutes,    "3.4: returnBranchDTOs()");
    crearMensaje(ctrlRoutes, ctrlCatalogApi, "3.5: returnJsonSuccess()");
    crearMensaje(ctrlCatalogApi, ctrlMap,    "3.6: returnBranchList()");

    // Renderizado del Mapa y Marcadores
    crearMensaje(ctrlMap, uiMapPage,         "3.7: notifyListeners()");
    crearMensaje(uiMapPage, gwOsmTiles,      "4: loadTiles()");
    crearMensaje(uiMapPage, uiMapPage,       "4.1: renderMarkers()");

    // Selección de Sucursal y Modo de Viaje
    crearMensaje(actorCliente, uiMapPage,    "5: tapMarker()");
    crearMensaje(uiMapPage, ctrlMap,         "5.1: selectBranch()");
    crearMensaje(ctrlMap, uiMapPage,         "5.2: notifyListeners()");
    crearMensaje(uiMapPage, actorCliente,    "5.3: renderModalDetalle()");

    crearMensaje(actorCliente, uiMapPage,    "6: selectTravelMode()");
    crearMensaje(uiMapPage, ctrlMap,         "6.1: setTravelMode()");
    crearMensaje(actorCliente, uiMapPage,    "7: tapComoLlegar()");
    crearMensaje(uiMapPage, ctrlMap,         "7.1: calculateRoute()");

    // Ruteo Híbrido OSRM / ORS / Haversine
    crearMensaje(ctrlMap, ctrlRoutingSvc,    "7.2: getRoute()");
    crearMensaje(ctrlRoutingSvc, gwOsrmEngine, "7.3: requestRouteOSRM()");
    crearMensaje(ctrlRoutingSvc, ctrlRoutingSvc, "7.4: parseOrFallbackHaversine()");
    crearMensaje(ctrlRoutingSvc, entRouteInfo, "7.5: createRouteInfo()");
    crearMensaje(ctrlRoutingSvc, ctrlMap,    "7.6: returnRouteInfo()");

    // Trazado de Polilínea
    crearMensaje(ctrlMap, ctrlMap,           "7.7: fitCamera()");
    crearMensaje(ctrlMap, uiMapPage,         "7.8: notifyListeners()");
    crearMensaje(uiMapPage, uiMapPage,       "7.9: drawPolyline()");
    crearMensaje(uiMapPage, actorCliente,    "8: renderRutaYMetricas()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    Repo.OpenDiagram(diagram.DiagramID);

    Log("Diagrama de Comunicación '" + diagName + "' generado exitosamente.");
    try { Session.Prompt("¡Diagrama de Comunicación CU19 generado exitosamente!", 0); } catch (e) { }
}

Main();
