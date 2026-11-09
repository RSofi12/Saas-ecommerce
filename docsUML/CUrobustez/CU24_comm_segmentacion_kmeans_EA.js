// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU24 - Segmentar Clientes con K-Means (ML No Supervisado)
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX / BCE):
//   Actor: AdministradorTenant
//   Boundary: AdminMlSegmentationPageComponent, CustomerSegmentationApiService (Object, «boundary»)
//   Control: CustomerSegmentationRoutes, CustomerSegmentationService (Object, «control»)
//   Entity: Plan, User, Sale, GarmentReturn, SyntheticDataset, CustomerSegment, MLModel (Object, «entity»)
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
    Log("Iniciando generación de Diagrama de Comunicación CU24...");

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
    var uiClusterPage   = crearElementoConEsterotipo(pkg, "AdminMlSegmentationPageComponent", "Object", "boundary");
    var uiClusterApi    = crearElementoConEsterotipo(pkg, "CustomerSegmentationApiService", "Object", "boundary");
    var ctrlRoutes      = crearElementoConEsterotipo(pkg, "CustomerSegmentationRoutes", "Object", "control");
    var ctrlService     = crearElementoConEsterotipo(pkg, "CustomerSegmentationService", "Object", "control");

    var entPlan         = crearElementoConEsterotipo(pkg, "Plan", "Object", "entity");
    var entUser         = crearElementoConEsterotipo(pkg, "User", "Object", "entity");
    var entSale         = crearElementoConEsterotipo(pkg, "Sale", "Object", "entity");
    var entReturn       = crearElementoConEsterotipo(pkg, "GarmentReturn", "Object", "entity");
    var entDataset      = crearElementoConEsterotipo(pkg, "SyntheticDataset", "Object", "entity");
    var entSegment      = crearElementoConEsterotipo(pkg, "CustomerSegment", "Object", "entity");
    var entMlModel      = crearElementoConEsterotipo(pkg, "MLModel", "Object", "entity");

    // 2. Crear Diagrama de Comunicación
    var diagName = "CU24 - Comunicación Segmentación Clientes KMeans";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Posicionamiento Horizontal y Radial (Compacto 60x60 px)
    colocarElemento(diagram, actorAdmin,      50,  100,  -250, -330); // Actor 50x80
    colocarElemento(diagram, uiClusterPage,  180,  240,  -250, -310); // 60x60
    colocarElemento(diagram, uiClusterApi,   320,  380,  -250, -310); // 60x60
    colocarElemento(diagram, ctrlRoutes,     460,  520,  -250, -310); // 60x60
    colocarElemento(diagram, ctrlService,    600,  660,  -250, -310); // 60x60

    colocarElemento(diagram, entPlan,        460,  520,  -130, -190); // 60x60
    colocarElemento(diagram, entUser,        460,  520,  -390, -450); // 60x60
    colocarElemento(diagram, entSale,        600,  660,  -390, -450); // 60x60
    colocarElemento(diagram, entReturn,      740,  800,  -390, -450); // 60x60
    colocarElemento(diagram, entDataset,     600,  660,  -130, -190); // 60x60
    colocarElemento(diagram, entSegment,     740,  800,  -250, -310); // 60x60
    colocarElemento(diagram, entMlModel,     740,  800,  -130, -190); // 60x60

    // 4. Mensajes del Flujo ICONIX (Funciones estrictamente sin parámetros)
    // Interacción Actor -> Fronteras
    crearMensaje(actorAdmin, uiClusterPage,     "1: accederModuloSegmentacion()");
    crearMensaje(actorAdmin, uiClusterPage,     "2: solicitarSegmentacionClientes()");
    crearMensaje(uiClusterPage, uiClusterApi,   "2.1: trainCustomerClusters()");
    crearMensaje(uiClusterApi, ctrlRoutes,      "2.2: POST_train_clusters()");

    // Control y Validaciones Centralizadas
    crearMensaje(ctrlRoutes, ctrlRoutes,        "2.3: validarPermisosAdministrador()");
    crearMensaje(ctrlRoutes, ctrlService,       "2.4: train_and_segment_customers()");
    crearMensaje(ctrlService, ctrlService,      "2.5: validate_ai_access()");
    crearMensaje(ctrlService, entPlan,          "2.6: checkSubscriptionTier()");

    // Extracción de Vectores RFM+D de Clientes Reales
    crearMensaje(ctrlService, entUser,          "2.7: getTenantCustomers()");
    crearMensaje(ctrlService, entSale,          "2.8: getCustomerSalesHistory()");
    crearMensaje(ctrlService, entReturn,        "2.9: getCustomerReturnsHistory()");
    crearMensaje(ctrlService, ctrlService,      "2.10: construirMatrizRfmD()");

    // Fallback a Dataset Sintético (Cold Start)
    crearMensaje(ctrlService, ctrlService,      "2.11: verificarVolumenClientesMinimo()");
    crearMensaje(ctrlService, entDataset,       "2.12: cargarDatasetSinteticoFallback()");

    // Algoritmo de ML No Supervisado (K-Means)
    crearMensaje(ctrlService, ctrlService,      "2.13: escalarMatrizCaracteristicas()");
    crearMensaje(ctrlService, ctrlService,      "2.14: entrenarKMeansClustering()");
    crearMensaje(ctrlService, ctrlService,      "2.15: calcularIndiceSiluetaEInercia()");
    crearMensaje(ctrlService, ctrlService,      "2.16: interpretarPerfilesCentroides()");

    // Persistencia de Modelo y Segmentos
    crearMensaje(ctrlService, entMlModel,       "2.17: persistirModeloCentroides()");
    crearMensaje(ctrlService, entSegment,       "2.18: persistirSegmentosClientes()");
    crearMensaje(entSegment, ctrlService,       "2.19: returnSegmentsSaved()");

    // Retorno Jerárquico de Resultados
    crearMensaje(ctrlService, ctrlRoutes,       "2.20: returnClusterResults()");
    crearMensaje(ctrlRoutes, uiClusterApi,      "2.21: returnJsonSuccess()");
    crearMensaje(uiClusterApi, uiClusterPage,   "2.22: returnObservableResult()");
    crearMensaje(uiClusterPage, actorAdmin,     "3: renderizarGraficoScatterYPerfiles()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch (e) { }

    Log("Diagrama de Comunicación '" + diagName + "' generado exitosamente.");
    try { Session.Prompt("¡Diagrama de Comunicación CU24 generado exitosamente!", 0); } catch (e) { }
}

Main();
