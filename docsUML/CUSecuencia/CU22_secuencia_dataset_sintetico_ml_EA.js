/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU22 - Generar Dataset Sintético de Ventas y Estacionalidad Textil
 * DESCRIPCION: Permite a los Administradores de Tenant suscritos al Plan Profesional
 *              o Empresarial generar datasets estocásticos calibrados con estacionalidad
 *              mensual de moda (invierno, verano, fiestas), días de la semana y políticas
 *              de negocio (cambios CU17 y devoluciones CU18) para entrenamiento de ML.
 *
 * ACTORES: AdministradorTenant (Administrador de la Boutique)
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
 *     * alt [Plan con IA Activa (PRO/Enterprise) / Plan Básico (HTTP 403 Forbidden)]
 *     * alt [Catálogo Existente (>0 Prendas) / Catálogo Vacío (HTTP 400 Bad Request)]
 *     * loop [Por cada variante de prenda y rango de fechas]
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU22 - Secuencia Generar Dataset Sintetico ML";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU22-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
    log("Iniciando generación de Diagrama de Secuencia CU22 con arquitectura BCE pura...");

    var pkg = getTargetPackage();
    if (pkg == null) return;

    var diagram = recreateDiagram(pkg);

    // 1. Participantes con Recuadros Rectangulares (:NombreComponente y estereotipos)
    var actorAdmin      = addActorParticipant(pkg, diagram, "AdministradorTenant", 30, 80);
    var uiDatasetPage   = addParticipant(pkg, diagram, ":AdminMlDatasetPageComponent", "Interface",  140, 180);
    var uiDatasetApi    = addParticipant(pkg, diagram, ":SyntheticDatasetApiService",  "Interface",  350, 160);
    var ctrlRoutes      = addParticipant(pkg, diagram, ":SyntheticDatasetRoutes",      "Controller", 540, 150);
    var ctrlService     = addParticipant(pkg, diagram, ":SyntheticDatasetService",     "Controller", 720, 160);

    var entPlan         = addEntityParticipant(pkg, diagram, ":Plan",             910, 80);
    var entProduct      = addEntityParticipant(pkg, diagram, ":Product",          1020, 90);
    var entVariant      = addEntityParticipant(pkg, diagram, ":ProductVariant",   1140, 100);
    var entDataset      = addEntityParticipant(pkg, diagram, ":SyntheticDataset", 1270, 110);

    var seq = 1;

    // Fase 1: Solicitud de Generación en Interfaz
    addMessage(actorAdmin, uiDatasetPage, "1: accederModuloDataset()", false, seq++);
    addMessage(actorAdmin, uiDatasetPage, "2: configurarParametrosGeneracion()", false, seq++);
    addMessage(actorAdmin, uiDatasetPage, "3: solicitarGeneracionDataset()", false, seq++);
    addMessage(uiDatasetPage, uiDatasetApi, "3.1: generateDataset()", false, seq++);
    addMessage(uiDatasetApi, ctrlRoutes, "3.2: POST_generate_dataset()", false, seq++);

    // Fase 2: Validación de Permisos y Nivel de Suscripción (Fragmento ALT 1)
    addMessage(ctrlRoutes, ctrlRoutes, "3.3: validarPermisosAdministrador()", false, seq++);
    addMessage(ctrlRoutes, ctrlService, "3.4: generate_synthetic_dataset()", false, seq++);

    // DECLARACIÓN FORMAL FRAGMENTO ALT: Plan IA vs Plan Básico
    addCombinedFragment(pkg, diagram, "alt", "alt [Plan Pro/Enterprise (IA Activa)] / [Plan Basico (HTTP 403)]", 520, 1000, -320, -450);
    addMessage(ctrlService, ctrlService, "3.5: validate_ai_access()", false, seq++);
    addMessage(ctrlService, entPlan, "3.6: checkSubscriptionTier()", false, seq++);
    addMessage(entPlan, ctrlService, "3.7: returnSubscriptionDetails()", true, seq++);
    addMessage(ctrlService, ctrlRoutes, "3.8: raiseForbiddenException()", true, seq++);

    // Fase 3: Lectura de Catálogo Real y Validación (Fragmento ALT 2)
    addCombinedFragment(pkg, diagram, "alt", "alt [Catalogo > 0 Productos] / [Catalogo Vacio (HTTP 400)]", 700, 1260, -480, -620);
    addMessage(ctrlService, entProduct, "3.9: getTenantProducts()", false, seq++);
    addMessage(entProduct, ctrlService, "3.10: returnProductList()", true, seq++);
    addMessage(ctrlService, entVariant, "3.11: getProductVariantsWithPrices()", false, seq++);
    addMessage(entVariant, ctrlService, "3.12: returnVariantList()", true, seq++);
    addMessage(ctrlService, ctrlService, "3.13: validarExistenciaCatalogo()", false, seq++);
    addMessage(ctrlService, ctrlRoutes, "3.14: raiseBadRequestException()", true, seq++);

    // Fase 4: Simulación Estocástica con Estacionalidad (Fragmento LOOP)
    addCombinedFragment(pkg, diagram, "loop", "loop [Por cada variante de prenda y rango de fechas]", 700, 900, -650, -820);
    addMessage(ctrlService, ctrlService, "3.15: calcularPonderacionesEstacionales()", false, seq++);
    addMessage(ctrlService, ctrlService, "3.16: simularTransaccionesEstocasticas()", false, seq++);
    addMessage(ctrlService, ctrlService, "3.17: aplicarPoliticasCambioYDevolucion()", false, seq++);

    // Fase 5: Persistencia en Disco y Base de Datos
    addMessage(ctrlService, ctrlService, "3.18: guardarCsvEnDisco()", false, seq++);
    addMessage(ctrlService, entDataset, "3.19: persistirMetadataDataset()", false, seq++);
    addMessage(entDataset, ctrlService, "3.20: returnDatasetEntity()", true, seq++);

    // Fase 6: Retorno de Métricas y Muestras a la UI
    addMessage(ctrlService, ctrlRoutes, "3.21: returnDatasetMetrics()", true, seq++);
    addMessage(ctrlRoutes, uiDatasetApi, "3.22: returnJsonSuccess()", true, seq++);
    addMessage(uiDatasetApi, uiDatasetPage, "3.23: returnObservableResult()", true, seq++);
    addMessage(uiDatasetPage, actorAdmin, "4: renderizarResumenYMuestras()", false, seq++);

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch (e) { }

    log("Diagrama de Secuencia '" + DIAGRAM_NAME + "' generado exitosamente con recuadros rectangulares.");
    try { Session.Prompt("¡Diagrama de Secuencia CU22 generado con recuadros rectangulares!", 0); } catch (e) { }
}

Main();
