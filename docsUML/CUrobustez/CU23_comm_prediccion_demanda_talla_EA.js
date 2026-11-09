// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU23 - Predecir Demanda de Ropa por Talla (ML Supervisado - RandomForestRegressor)
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX / BCE):
//   Actor: AdministradorTenant
//   Boundary: AppShellComponent, AdminDemandForecastPageComponent (Object, «boundary»)
//   Control: DemandForecastApiService, DemandForecastRoutes, DemandForecastingService, RandomForestRegressorModel (Object, «control»)
//   Entity: Plan, ProductVariant, SaleItem, Inventory, DemandForecast, MLModel (Object, «entity»)
//
// Reglas Metodológicas Estrictas:
//   - Todas las funciones se expresan con paréntesis vacíos () sin parámetros internos.
//   - Cero bucles o validaciones sobre Fronteras (las validaciones residen en Controllers).
//   - Cero comunicación entre Entidades (la orquestación reside en el Controller).
//   - Mensajes mediante con.Name en conectores de tipo Communication (evita errores con link.Messages).
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

function colocarElemento(diagram, element, left, right, top, bottom) {
    var dObj = diagram.DiagramObjects.AddNew("l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";", "");
    dObj.ElementID = element.ElementID;
    dObj.Update();
    return dObj;
}

function crearMensaje(sourceEl, targetEl, nombreMensaje) {
    var con = sourceEl.Connectors.AddNew("", "Communication");
    con.ClientID = sourceEl.ElementID;
    con.SupplierID = targetEl.ElementID;
    con.Name = nombreMensaje;
    con.Update();
    sourceEl.Connectors.Refresh();
    return con;
}

function Main() {
    Log("====================================================================");
    Log("Construyendo Diagrama de Comunicación/Robustez CU23 (RandomForest)...");
    Log("====================================================================");

    if (Repo == null) {
        Log("ERROR: Repository de Enterprise Architect no está disponible.");
        return;
    }

    var selectedPkg = Repo.GetTreeSelectedPackage();
    if (selectedPkg == null) {
        var models = Repo.Models;
        if (models.Count > 0) {
            var root = models.GetAt(0);
            for (var p = 0; p < root.Packages.Count; p++) {
                if (root.Packages.GetAt(p).Name == "CUrobustez" || root.Packages.GetAt(p).Name == "Robustez") {
                    selectedPkg = root.Packages.GetAt(p);
                    break;
                }
            }
            if (selectedPkg == null) selectedPkg = root.Packages.GetAt(0);
        }
    }

    if (selectedPkg == null) {
        Log("ERROR: No se encontró ni pudo obtener el paquete de destino.");
        return;
    }

    var diagName = "CU23 - Comunicación Predicción Demanda por Talla";
    var diag = crearDiagramaLimpio(selectedPkg, diagName, "Communication");

    // 1. Creación de Objetos según estereotipos ICONIX (BCE Pura)
    var actorAdmin    = crearElementoConEsterotipo(selectedPkg, "AdministradorTenant", "Actor", "");
    var bAppShell     = crearElementoConEsterotipo(selectedPkg, "AppShellComponent", "Object", "boundary");
    var bForecastUI   = crearElementoConEsterotipo(selectedPkg, "AdminDemandForecastPageComponent", "Object", "boundary");

    var cApiSvc       = crearElementoConEsterotipo(selectedPkg, "DemandForecastApiService", "Object", "control");
    var cRoutes       = crearElementoConEsterotipo(selectedPkg, "DemandForecastRoutes", "Object", "control");
    var cModelSvc     = crearElementoConEsterotipo(selectedPkg, "DemandForecastingService", "Object", "control");
    var cRandomForest = crearElementoConEsterotipo(selectedPkg, "RandomForestRegressorModel", "Object", "control");

    var ePlan         = crearElementoConEsterotipo(selectedPkg, "Plan", "Object", "entity");
    var eVariant      = crearElementoConEsterotipo(selectedPkg, "ProductVariant", "Object", "entity");
    var eSaleItem     = crearElementoConEsterotipo(selectedPkg, "SaleItem", "Object", "entity");
    var eInventory    = crearElementoConEsterotipo(selectedPkg, "Inventory", "Object", "entity");
    var eForecast     = crearElementoConEsterotipo(selectedPkg, "DemandForecast", "Object", "entity");
    var eMLModel      = crearElementoConEsterotipo(selectedPkg, "MLModel", "Object", "entity");

    // 2. Disposición espacial en el lienzo (Compacto 60x60 px)
    colocarElemento(diag, actorAdmin,    50,  100,  -260, -340); // Actor 50x80
    colocarElemento(diag, bAppShell,     200, 260,  -140, -200); // 60x60
    colocarElemento(diag, bForecastUI,   200, 260,  -280, -340); // 60x60

    colocarElemento(diag, cApiSvc,       380, 440,  -280, -340); // 60x60
    colocarElemento(diag, cRoutes,       540, 600,  -280, -340); // 60x60
    colocarElemento(diag, cModelSvc,     700, 760,  -280, -340); // 60x60
    colocarElemento(diag, cRandomForest, 860, 920,  -280, -340); // 60x60

    colocarElemento(diag, ePlan,         700, 760,  -140, -200); // 60x60
    colocarElemento(diag, eMLModel,      860, 920,  -140, -200); // 60x60

    colocarElemento(diag, eVariant,      560, 620,  -440, -500); // 60x60
    colocarElemento(diag, eSaleItem,     680, 740,  -440, -500); // 60x60
    colocarElemento(diag, eInventory,    800, 860,  -440, -500); // 60x60
    colocarElemento(diag, eForecast,     920, 980,  -440, -500); // 60x60

    // 3. Conectores y Mensajes de Comunicación BCE (con.Name)
    // Actor -> Boundary
    crearMensaje(actorAdmin, bAppShell,   "1: navegarDemandaPredictiva()");
    crearMensaje(bAppShell, bForecastUI,  "1.1: cargarVistaPronostico()");
    crearMensaje(actorAdmin, bForecastUI, "2: seleccionarPrendaYSucursal()");
    crearMensaje(actorAdmin, bForecastUI, "3: solicitarPrediccionDemanda()");

    // Boundary -> Control
    crearMensaje(bForecastUI, cApiSvc,    "3.1: forecastDemand()");
    crearMensaje(cApiSvc, cRoutes,        "3.2: POST_forecast()");
    crearMensaje(cRoutes, cRoutes,        "3.3: validarPermisosAdministrador()");
    crearMensaje(cRoutes, cModelSvc,      "3.4: predict_demand_by_size()");

    // Control -> Validaciones y Entidades
    crearMensaje(cModelSvc, cModelSvc,    "3.5: validate_ai_access()");
    crearMensaje(cModelSvc, ePlan,        "3.6: checkSubscriptionTier()");
    crearMensaje(cModelSvc, eVariant,     "3.7: getVariantsBySize()");
    crearMensaje(cModelSvc, eInventory,   "3.8: getCurrentStockPerBranch()");

    // Inferencia con Modelo de Machine Learning
    crearMensaje(cModelSvc, cRandomForest,"3.9: predictWeeklyDemand()");
    crearMensaje(cRandomForest, cModelSvc,"3.10: returnPredictedValues()");
    crearMensaje(cModelSvc, cModelSvc,    "3.11: calcularIntervaloConfianza95()");
    crearMensaje(cModelSvc, cModelSvc,    "3.12: evaluarAlertaQuiebreStock()");
    crearMensaje(cModelSvc, eForecast,    "3.13: persistirPronosticos()");

    // Flujo Opcional / Re-entrenamiento con Dataset Sintético
    crearMensaje(actorAdmin, bForecastUI, "4: configurarHiperparametrosYEntrenar()");
    crearMensaje(bForecastUI, cApiSvc,    "4.1: trainModel()");
    crearMensaje(cApiSvc, cRoutes,        "4.2: POST_train()");
    crearMensaje(cRoutes, cModelSvc,      "4.3: train_demand_model()");
    crearMensaje(cModelSvc, eSaleItem,    "4.4: extraerHistoricoVentas()");
    crearMensaje(cModelSvc, eMLModel,     "4.5: getSyntheticDatasetReference()");
    crearMensaje(cModelSvc, cRandomForest,"4.6: fitRandomForestRegressor()");
    crearMensaje(cModelSvc, cModelSvc,    "4.7: evaluarMetricasBondadAjuste()");
    crearMensaje(cModelSvc, eMLModel,     "4.8: registrarAuditoriaVersionModelo()");

    // Retorno Jerárquico a la Interfaz
    crearMensaje(cModelSvc, cRoutes,      "4.9: returnForecastResponse()");
    crearMensaje(cRoutes, cApiSvc,        "4.10: returnJsonSuccess()");
    crearMensaje(cApiSvc, bForecastUI,    "4.11: returnObservableData()");
    crearMensaje(bForecastUI, actorAdmin, "5: renderizarCurvasDemandaYAlertas()");

    diag.Update();
    Repo.SaveDiagram(diag.DiagramID);
    Repo.ReloadDiagram(diag.DiagramID);
    try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }

    Log("====================================================================");
    Log("Diagrama de Comunicación/Robustez CU23 generado con éxito.");
    Log("====================================================================");
    try { Session.Prompt("¡Diagrama de Robustez CU23 generado exitosamente!", 0); } catch (e) { }
}

Main();
