/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU19 - Localizar Sucursales y Trazar Rutas (OpenStreetMap / ORS)
 * DESCRIPCION: Permite a los clientes ubicar en un mapa interactivo las boutiques
 *              físicas de su empresa contratante (tenant) y trazar la ruta óptima
 *              de navegación multimodal (vehicular o peatonal) desde su posición GPS
 *              actual con cálculo de distancia y tiempo estimado de llegada (ETA):
 *              - Actores: Cliente (iniciador móvil y decisor de ruta).
 *              - Fronteras: ManagementPage (portal boutique), BranchesMapPage (mapa Flutter con
 *                TileLayer, MarkerLayer y PolylineLayer), OpenStreetMapServer (teselas cartográficas)
 *                y OSRM_RoutingEngine (API de ruteo).
 *              - Controladores: BranchesMapController (controlador reactivo Flutter),
 *                RoutingService (servicio híbrido OSRM/ORS/Haversine), CatalogApi (cliente HTTP móvil),
 *                BranchRoutes (FastAPI REST Controller) y BranchService (Domain Controller backend).
 *              - Entidades: Branch (sucursal física con coordenadas) y RouteInfo (geometría y métricas).
 *              - Fragmentos combinados:
 *                  * alt [Permiso GPS Concedido / Permiso Denegado]
 *                  * loop [Por cada sucursal con coordenadas válidas]
 *                  * alt [Nivel 1: OSRM Publico / Nivel 2: ORS Oficial / Nivel 3: Fallback Haversine]
 * ACTORES: Cliente
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU19 - Localizar Sucursales y Trazar Rutas OpenStreetMap";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU19-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
}

/**
 * Obtiene o crea el paquete de destino en el Project Browser.
 */
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
        var p = root.Packages.GetAt(i);
        if (p.Name == DEFAULT_PACKAGE_NAME) {
            return p;
        }
    }

    var newPkg = root.Packages.AddNew(DEFAULT_PACKAGE_NAME, "Package");
    newPkg.Update();
    root.Packages.Refresh();
    log("Paquete creado: " + DEFAULT_PACKAGE_NAME);
    return newPkg;
}

/**
 * Recrea el diagrama limpio con estilos estandar UML.
 */
function recreateDiagram(pkg) {
    for (var i = pkg.Diagrams.Count - 1; i >= 0; i--) {
        var d = pkg.Diagrams.GetAt(i);
        if (d.Name == DIAGRAM_NAME) {
            try {
                pkg.Diagrams.Delete(i);
                pkg.Diagrams.Refresh();
                log("Diagrama previo eliminado para regeneracion limpia.");
            } catch (e) {
                log("Aviso al eliminar: " + e.message);
            }
            break;
        }
    }

    var diagram = pkg.Diagrams.AddNew(DIAGRAM_NAME, "Sequence");
    try {
        diagram.StyleEx = "ShowRobustness=0;SequenceCustomArt=0;";
    } catch (e) { }
    diagram.Update();
    pkg.Diagrams.Refresh();
    return diagram;
}

/**
 * Agrega el Actor con su icono estandar UML.
 */
function addActorParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Actor");
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-2600;", "");
    dObj.ElementID = el.ElementID;
    dObj.Update();
    return el;
}

/**
 * Agrega participante con encabezado RECTANGULAR Sequence (Boundary, Controller).
 */
function addParticipant(pkg, diagram, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) {
        el.Stereotype = stereotype;
    }
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2500;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

/**
 * Agrega participantes Entidades en RECUADRO RECTANGULAR estandar Sequence.
 */
function addEntityParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    el.Stereotype = "Entity" + String.fromCharCode(160);
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2500;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

/**
 * Agrega mensaje de secuencia con SequenceNo estricto para ordenamiento vertical.
 */
function addMessage(src, dst, label, isReturn, sequenceNo) {
    var con = src.Connectors.AddNew(label, "Sequence");
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
    return con;
}

/**
 * Agrega fragmentos combinados UML (alt, opt, loop).
 */
function addCombinedFragment(pkg, diagram, type, guardLabel, left, right, top, bottom) {
    try {
        var frag = pkg.Elements.AddNew(guardLabel, "InteractionFragment");
        frag.Stereotype = type;
        frag.Update();

        var dObj = diagram.DiagramObjects.AddNew("l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";", "");
        dObj.ElementID = frag.ElementID;
        dObj.Update();
        return frag;
    } catch (err) {
        log("Nota al crear fragmento (" + type + "): " + err.message);
        return null;
    }
}

/**
 * Extiende la linea de vida del Actor hasta el final del diagrama.
 */
function stretchActorLifeline(diagram, actorEl, bottomY) {
    for (var i = 0; i < diagram.DiagramObjects.Count; i++) {
        var dObj = diagram.DiagramObjects.GetAt(i);
        if (dObj.ElementID == actorEl.ElementID) {
            dObj.Top = -20;
            dObj.Bottom = bottomY || -2600;
            dObj.Update();
            return;
        }
    }
}

function main() {
    log("Iniciando generacion de Diagrama de Secuencia CU19 con arquitectura BCE completa...");

    var pkg = getTargetPackage();
    if (pkg == null) return;

    var diagram = recreateDiagram(pkg);

    /* -------------------------------------------------------------------------
     * 1. PARTICIPANTES BCE (DISTRIBUCION HORIZONTAL)
     * Actor -> Boundaries -> Controllers -> Gateway/Entities
     * ------------------------------------------------------------------------- */
    var actorCliente     = addActorParticipant(pkg, diagram, "Cliente", 30, 80);

    var uiManagement     = addParticipant(pkg, diagram, ":ManagementPage",          "Interface",  140, 140);
    var uiMapPage        = addParticipant(pkg, diagram, ":BranchesMapPage",         "Interface",  300, 150);

    var ctrlMap          = addParticipant(pkg, diagram, ":BranchesMapController",   "Controller", 470, 160);
    var ctrlCatalogApi   = addParticipant(pkg, diagram, ":CatalogApi",              "Controller", 650, 130);
    var ctrlRoutes       = addParticipant(pkg, diagram, ":BranchRoutes",            "Controller", 800, 130);
    var ctrlService      = addParticipant(pkg, diagram, ":BranchService",           "Controller", 950, 130);
    var ctrlRoutingSvc   = addParticipant(pkg, diagram, ":RoutingService",          "Controller", 1100, 140);

    var gwOsmTiles       = addParticipant(pkg, diagram, ":OpenStreetMapServer",     "Interface",  1260, 160);
    var gwOsrmEngine     = addParticipant(pkg, diagram, ":OSRM_RoutingEngine",      "Interface",  1440, 160);

    var entBranch        = addEntityParticipant(pkg, diagram, ":Branch",     1620, 100);
    var entRouteInfo     = addEntityParticipant(pkg, diagram, ":RouteInfo",  1740, 110);

    var step = 1;

    /* -------------------------------------------------------------------------
     * 2. FASE 1: NAVEGACION Y APERTURA DE PANTALLA DE MAPA
     * ------------------------------------------------------------------------- */
    addMessage(actorCliente, uiManagement,
        "1: tapNuestrasBoutiques()", false, step++);

    addMessage(uiManagement, uiMapPage,
        "1.1: pushNamed()", false, step++);

    addMessage(uiMapPage, ctrlMap,
        "2: initialize()", false, step++);

    /* -------------------------------------------------------------------------
     * 3. FASE 2: GESTION DE GEOLOCALIZACION GPS (FRAGMENTO ALT)
     * ------------------------------------------------------------------------- */
    addCombinedFragment(pkg, diagram, "alt", "[Permiso GPS Concedido / Permiso Denegado]", 440, 1200, -280, -440);

    addMessage(ctrlMap, ctrlMap,
        "2.1: _initLocation()", false, step++);

    addMessage(ctrlMap, ctrlMap,
        "2.2: getCurrentPosition()", false, step++);

    addMessage(ctrlMap, ctrlMap,
        "2.3: defaultFallbackPosition()", false, step++);

    /* -------------------------------------------------------------------------
     * 4. FASE 3: RECUPERACION DE SUCURSALES GEORREFERENCIADAS DEL TENANT
     * ------------------------------------------------------------------------- */
    addMessage(ctrlMap, ctrlCatalogApi,
        "3: getBranches()", false, step++);

    addMessage(ctrlCatalogApi, ctrlRoutes,
        "3.1: GET_public_branches()", false, step++);

    addMessage(ctrlRoutes, ctrlService,
        "3.2: get_public_branches()", false, step++);

    addMessage(ctrlService, entBranch,
        "3.3: filterActiveBranches()", false, step++);

    addMessage(entBranch, ctrlService,
        "3.4: returnBranchRecords()", true, step++);

    addMessage(ctrlService, ctrlRoutes,
        "3.5: returnBranchDTOs()", true, step++);

    addMessage(ctrlRoutes, ctrlCatalogApi,
        "3.6: returnJsonSuccess()", true, step++);

    addMessage(ctrlCatalogApi, ctrlMap,
        "3.7: returnBranchList()", true, step++);

    addMessage(ctrlMap, ctrlMap,
        "3.8: filterBranchesWithCoordinates()", false, step++);

    addMessage(ctrlMap, uiMapPage,
        "3.9: notifyListeners()", true, step++);

    /* -------------------------------------------------------------------------
     * 5. FASE 4: RENDERIZADO DE MAPA OPENSTREETMAP Y MARCADORES
     * ------------------------------------------------------------------------- */
    addMessage(uiMapPage, gwOsmTiles,
        "4: loadTiles()", false, step++);

    addMessage(gwOsmTiles, uiMapPage,
        "4.1: returnOsmTiles()", true, step++);

    addCombinedFragment(pkg, diagram, "loop", "[Por cada sucursal con coordenadas validas]", 280, 1750, -840, -960);

    addMessage(uiMapPage, uiMapPage,
        "4.2: addMarker()", false, step++);

    /* -------------------------------------------------------------------------
     * 6. FASE 5: SELECCION DE SUCURSAL Y CONSULTA DE DETALLES
     * ------------------------------------------------------------------------- */
    addMessage(actorCliente, uiMapPage,
        "5: tapMarker()", false, step++);

    addMessage(uiMapPage, ctrlMap,
        "5.1: selectBranch()", false, step++);

    addMessage(ctrlMap, uiMapPage,
        "5.2: notifyListeners()", true, step++);

    addMessage(uiMapPage, actorCliente,
        "5.3: renderModalDetalle()", true, step++);

    /* -------------------------------------------------------------------------
     * 7. FASE 6: SELECCION DE MODO DE VIAJE Y CALCULO DE RUTA (FRAGMENTO ALT)
     * ------------------------------------------------------------------------- */
    addMessage(actorCliente, uiMapPage,
        "6: selectTravelMode()", false, step++);

    addMessage(uiMapPage, ctrlMap,
        "6.1: setTravelMode()", false, step++);

    addMessage(actorCliente, uiMapPage,
        "7: tapComoLlegar()", false, step++);

    addMessage(uiMapPage, ctrlMap,
        "7.1: calculateRoute()", false, step++);

    addMessage(ctrlMap, ctrlRoutingSvc,
        "7.2: getRoute()", false, step++);

    /* FRAGMENTO ALT: Estrategia Híbrida de Ruteo
     * [Nivel 1: OSRM Publico] vs [Nivel 2: ORS Oficial] vs [Nivel 3: Fallback Haversine] */
    addCombinedFragment(pkg, diagram, "alt", "[Nivel 1: OSRM Publico / Nivel 2: ORS Oficial / Nivel 3: Fallback Haversine]", 1080, 1860, -1480, -1920);

    addMessage(ctrlRoutingSvc, gwOsrmEngine,
        "7.3: requestRouteOSRM()", false, step++);

    addMessage(gwOsrmEngine, ctrlRoutingSvc,
        "7.4: returnOsrmJson()", true, step++);

    addMessage(ctrlRoutingSvc, ctrlRoutingSvc,
        "7.5: parseOsrmResponse()", false, step++);

    addMessage(ctrlRoutingSvc, ctrlRoutingSvc,
        "7.6: buildHaversineFallback()", false, step++);

    addMessage(ctrlRoutingSvc, entRouteInfo,
        "7.7: createRouteInfo()", false, step++);

    addMessage(entRouteInfo, ctrlRoutingSvc,
        "7.8: returnRouteInfo()", true, step++);

    addMessage(ctrlRoutingSvc, ctrlMap,
        "7.9: returnRouteInfo()", true, step++);

    /* -------------------------------------------------------------------------
     * 8. FASE 7: TRAZADO DE POLILINEA Y ACTUALIZACION VISUAL
     * ------------------------------------------------------------------------- */
    addMessage(ctrlMap, ctrlMap,
        "7.10: fitCamera(origin, destination)", false, step++);

    addMessage(ctrlMap, uiMapPage,
        "7.11: notifyListeners()", true, step++);

    addMessage(uiMapPage, uiMapPage,
        "7.12: PolylineLayer.draw(route.points, color, width)", false, step++);

    addMessage(uiMapPage, actorCliente,
        "8: renderRutaYMetricas(formattedDistance, formattedDuration)", true, step++);

    /* Guardar y abrir diagrama de forma segura */
    stretchActorLifeline(diagram, actorCliente, -2600);
    diagram.Update();
    if (Repo != null) {
        Repo.SaveDiagram(diagram.DiagramID);
        Repo.ReloadDiagram(diagram.DiagramID);
        Repo.OpenDiagram(diagram.DiagramID);
    }

    log("Diagrama '" + DIAGRAM_NAME + "' generado y guardado exitosamente.");
    try { Session.Prompt("¡Diagrama de Secuencia CU19 actualizado con exito!", 0); } catch (e) { }
}

main();
