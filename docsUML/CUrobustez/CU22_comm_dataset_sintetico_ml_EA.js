// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU22 - Generar Dataset Sintético de Ventas y Estacionalidad Textil
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX / BCE):
//   Actor: AdministradorTenant
//   Boundary: AdminMlDatasetPageComponent, SyntheticDatasetApiService (Object, «boundary»)
//   Control: SyntheticDatasetRoutes, SyntheticDatasetService (Object, «control»)
//   Entity: Plan, Product, ProductVariant, SyntheticDataset (Object, «entity»)
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
    Log("Iniciando generación de Diagrama de Comunicación CU22...");

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
    var uiDatasetPage   = crearElementoConEsterotipo(pkg, "AdminMlDatasetPageComponent", "Object", "boundary");
    var uiDatasetApi    = crearElementoConEsterotipo(pkg, "SyntheticDatasetApiService", "Object", "boundary");
    var ctrlRoutes      = crearElementoConEsterotipo(pkg, "SyntheticDatasetRoutes", "Object", "control");
    var ctrlService     = crearElementoConEsterotipo(pkg, "SyntheticDatasetService", "Object", "control");
    var entPlan         = crearElementoConEsterotipo(pkg, "Plan", "Object", "entity");
    var entProduct      = crearElementoConEsterotipo(pkg, "Product", "Object", "entity");
    var entVariant      = crearElementoConEsterotipo(pkg, "ProductVariant", "Object", "entity");
    var entDataset      = crearElementoConEsterotipo(pkg, "SyntheticDataset", "Object", "entity");

    // 2. Crear Diagrama de Comunicación
    var diagName = "CU22 - Comunicación Generar Dataset Sintético ML";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Posicionamiento Horizontal y Radial (Compacto 60x60 px)
    colocarElemento(diagram, actorAdmin,      50,  100,  -250, -330); // Actor 50x80
    colocarElemento(diagram, uiDatasetPage,  180,  240,  -250, -310); // 60x60
    colocarElemento(diagram, uiDatasetApi,   320,  380,  -250, -310); // 60x60
    colocarElemento(diagram, ctrlRoutes,     460,  520,  -250, -310); // 60x60
    colocarElemento(diagram, ctrlService,    600,  660,  -250, -310); // 60x60

    colocarElemento(diagram, entPlan,        460,  520,  -420, -480); // 60x60
    colocarElemento(diagram, entProduct,     600,  660,  -420, -480); // 60x60
    colocarElemento(diagram, entVariant,     740,  800,  -420, -480); // 60x60
    colocarElemento(diagram, entDataset,     740,  800,  -250, -310); // 60x60

    // 4. Mensajes del Flujo ICONIX (Funciones estrictamente sin parámetros)
    // Interacción Actor -> Fronteras
    crearMensaje(actorAdmin, uiDatasetPage,     "1: accederModuloDataset()");
    crearMensaje(actorAdmin, uiDatasetPage,     "2: configurarParametrosGeneracion()");
    crearMensaje(actorAdmin, uiDatasetPage,     "3: solicitarGeneracionDataset()");
    crearMensaje(uiDatasetPage, uiDatasetApi,   "3.1: generateDataset()");
    crearMensaje(uiDatasetApi, ctrlRoutes,      "3.2: POST_generate_dataset()");

    // Control y Validaciones Centralizadas
    crearMensaje(ctrlRoutes, ctrlRoutes,        "3.3: validarPermisosAdministrador()");
    crearMensaje(ctrlRoutes, ctrlService,       "3.4: generate_synthetic_dataset()");
    crearMensaje(ctrlService, ctrlService,      "3.5: validate_ai_access()");
    crearMensaje(ctrlService, entPlan,          "3.6: checkSubscriptionTier()");

    // Consulta de Catálogo Real y Simulación Estocástica
    crearMensaje(ctrlService, entProduct,       "3.7: getTenantProducts()");
    crearMensaje(ctrlService, entVariant,       "3.8: getProductVariantsWithPrices()");
    crearMensaje(ctrlService, ctrlService,      "3.9: validarExistenciaCatalogo()");
    crearMensaje(ctrlService, ctrlService,      "3.10: calcularPonderacionesEstacionales()");
    crearMensaje(ctrlService, ctrlService,      "3.11: simularTransaccionesEstocasticas()");
    crearMensaje(ctrlService, ctrlService,      "3.12: aplicarPoliticasCambioYDevolucion()");

    // Exportación y Persistencia
    crearMensaje(ctrlService, ctrlService,      "3.13: guardarCsvEnDisco()");
    crearMensaje(ctrlService, entDataset,       "3.14: persistirMetadataDataset()");
    crearMensaje(entDataset, ctrlService,       "3.15: returnDatasetEntity()");

    // Retorno Jerárquico de Resultados
    crearMensaje(ctrlService, ctrlRoutes,       "3.16: returnDatasetMetrics()");
    crearMensaje(ctrlRoutes, uiDatasetApi,      "3.17: returnJsonSuccess()");
    crearMensaje(uiDatasetApi, uiDatasetPage,   "3.18: returnObservableResult()");
    crearMensaje(uiDatasetPage, actorAdmin,     "4: renderizarResumenYMuestras()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch (e) { }

    Log("Diagrama de Comunicación '" + diagName + "' generado exitosamente.");
    try { Session.Prompt("¡Diagrama de Comunicación CU22 generado exitosamente!", 0); } catch (e) { }
}

Main();
