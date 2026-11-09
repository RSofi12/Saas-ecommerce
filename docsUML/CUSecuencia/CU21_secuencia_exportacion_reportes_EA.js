/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU21 - Exportar Reportes Empresariales a Formatos PDF y Excel
 * DESCRIPCION: Genera y exporta balances de auditoría contable y operativa en
 *              formatos PDF (ReportLab con NumberedCanvas), Excel (OpenPyXL con fórmulas =SUM)
 *              y CSV plano, incorporando:
 *              - Actores: Administrador (acceso multisucursal) y Encargado (ámbito sucursal asignada).
 *              - Fronteras: AdminReportsPageComponent (UI PWA interactiva) y ReportsApiService (cliente HTTP/blob).
 *              - Controladores: ReportRoutes (FastAPI REST Controller), ReportService (Domain Controller)
 *                y ReportExportEngine (Motor de renderizado binario PDF/XLSX).
 *              - Entidades: Sale, Inventory, InventoryMovement, Company.
 *              - Proyección dinámica de columnas (selected_columns interactivo).
 *              - Streaming binario StreamingResponse con headers de descarga directa.
 * ACTORES: Administrador, Encargado
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 *
 * NORMAS Y PAUTAS APLICADAS:
 * - Participantes rectangulares Sequence con estereotipos <<Actor>>, <<Interface>>, <<Controller>>, <<Entity>>.
 * - Numeración secuencial estricta (con.SequenceNo = sequenceNo) para garantizar orden vertical perfecto.
 * - Numeración jerárquica por flujo y submensajes (1, 1.1... 2, 2.1... 3, 3.1... 4, 4.1... 5, 5.1... 6, 6.1...).
 * - Cero bucles o validaciones sobre Fronteras: las Fronteras son pasivas. Todas las validaciones
 *   residen estrictamente en los Controladores (ReportRoutes, ReportService, ReportExportEngine).
 * - Sin cruces horizontales entre entidades (comunicación exclusiva Controller -> Entity).
 * - Retornos únicamente hacia el Controller o la Interface (isReturn = true).
 * - Parámetros UML explícitos y nombres de funciones() coincidentes con el código implementado.
 * - Fragmentos combinados:
 *     * alt [Rol Encargado (fijar branch_id) / Rol Administrador (multisucursal)]
 *     * alt [report_type == 'sales' / 'inventory' / 'movements']
 *     * alt [format == 'excel' / 'pdf' / 'csv']
 *     * loop [Por cada columna en selected_columns]
 *     * opt [Colección vacía: plantilla sin registros]
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU21 - Exportacion de Reportes Empresariales PDF y Excel";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU21-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-3200;", "");
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
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-3100;", "");
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
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-3100;", "");
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

function main() {
    log("Iniciando generacion de Diagrama de Secuencia CU21 ICONIX estricto...");

    var pkg = getTargetPackage();
    if (pkg == null) return;

    var diagram = recreateDiagram(pkg);

    /* -------------------------------------------------------------------------
     * 1. PARTICIPANTES BCE (DISTRIBUCION HORIZONTAL)
     * Actores -> Boundaries -> Controllers -> Entities
     * Administrador, Encargado
     * :AdminReportsPageComponent, :ReportsApiService
     * :ReportRoutes, :ReportService, :ReportExportEngine
     * :Sale, :Inventory, :InventoryMovement, :Company
     * ------------------------------------------------------------------------- */
    var actorAdmin       = addActorParticipant(pkg, diagram, "Administrador", 30, 80);
    var actorEncargado   = addActorParticipant(pkg, diagram, "Encargado", 140, 80);

    var uiReportsPage    = addParticipant(pkg, diagram, ":AdminReportsPageComponent", "Interface",  250, 180);
    var uiReportsApi     = addParticipant(pkg, diagram, ":ReportsApiService",        "Interface",  460, 150);

    var ctrlRoutes       = addParticipant(pkg, diagram, ":ReportRoutes",             "Controller", 640, 130);
    var ctrlService      = addParticipant(pkg, diagram, ":ReportService",            "Controller", 800, 130);
    var ctrlEngine       = addParticipant(pkg, diagram, ":ReportExportEngine",       "Controller", 960, 150);

    var entSale          = addEntityParticipant(pkg, diagram, ":Sale",              1140, 90);
    var entInventory     = addEntityParticipant(pkg, diagram, ":Inventory",         1250, 100);
    var entMovement      = addEntityParticipant(pkg, diagram, ":InventoryMovement", 1370, 130);
    var entCompany       = addEntityParticipant(pkg, diagram, ":Company",           1520, 100);

    var step = 1;

    /* -------------------------------------------------------------------------
     * 2. FLUJO 1: ACCESO A REPORTES Y CONSULTA INICIAL DE VISTA PREVIA
     * Numeración Jerárquica: 1, 1.1, 1.2, ..., 1.8
     * ------------------------------------------------------------------------- */
    addMessage(actorAdmin, uiReportsPage,
        "1: accederSeccionReportes()", false, step++);

    addMessage(uiReportsPage, uiReportsApi,
        "1.1: fetchReport()", false, step++);

    addMessage(uiReportsApi, ctrlRoutes,
        "1.2: GET_sales_report()", false, step++);

    addMessage(ctrlRoutes, ctrlService,
        "1.3: get_sales_report()", false, step++);

    addMessage(ctrlService, entSale,
        "1.4: filterTenantSales()", false, step++);

    addMessage(entSale, ctrlService,
        "1.5: returnSalesData()", true, step++);

    addMessage(ctrlService, ctrlRoutes,
        "1.6: returnSalesData()", true, step++);

    addMessage(ctrlRoutes, uiReportsApi,
        "1.7: returnApiResponse()", true, step++);

    addMessage(uiReportsApi, uiReportsPage,
        "1.8: returnObservableResult()", true, step++);

    /* -------------------------------------------------------------------------
     * 3. FLUJO 2: PARAMETRIZACION DE FILTROS Y CONFIGURACION DINAMICA DE COLUMNAS
     * Interacción directa del Actor sobre la Frontera (Cero self-loops en Boundary)
     * Numeración Jerárquica: 2, 2.1
     * ------------------------------------------------------------------------- */
    addMessage(actorAdmin, uiReportsPage,
        "2: seleccionarPestanaYFiltros()", false, step++);

    addMessage(actorAdmin, uiReportsPage,
        "2.1: configurarColumnasVisibles()", false, step++);

    /* -------------------------------------------------------------------------
     * 4. FLUJO 3: SOLICITUD DE EXPORTACION Y VALIDACION DE ALCANCE EN CONTROLLER
     * Numeración Jerárquica: 3, 3.1, 3.2, ..., 3.7
     * Fragmento alt: Encargado (ámbito sucursal) vs Administrador (multisucursal)
     * ------------------------------------------------------------------------- */
    addMessage(actorAdmin, uiReportsPage,
        "3: exportReport()", false, step++);

    addMessage(uiReportsPage, uiReportsApi,
        "3.1: exportReport()", false, step++);

    addMessage(uiReportsApi, ctrlRoutes,
        "3.2: GET_export_report()", false, step++);

    addMessage(ctrlRoutes, ctrlRoutes,
        "3.3: validarTokenJWT()", false, step++);

    addCombinedFragment(pkg, diagram, "alt",
        "alt [current_user.rol == 'encargado'] / [current_user.rol == 'administrador']",
        620, 1640, -680, -870);

    addMessage(ctrlRoutes, ctrlRoutes,
        "3.4a: forzar_sucursal()", false, step++);

    addMessage(ctrlRoutes, ctrlRoutes,
        "3.4b: permitir_multisucursal()", false, step++);

    addMessage(ctrlRoutes, ctrlRoutes,
        "3.5: parsearColumnasSeleccionadas()", false, step++);

    addMessage(ctrlRoutes, entCompany,
        "3.6: get_company_by_tenant_id(tenant_id)", false, step++);

    addMessage(entCompany, ctrlRoutes,
        "3.7: return company_data", true, step++);

    /* -------------------------------------------------------------------------
     * 5. FLUJO 4: AGREGACION DE DATOS DE DOMINIO SEGUN PESTAÑA ACTIVA
     * Numeración Jerárquica: 4, 4.1a/b/c, 4.2a/b/c
     * Fragmento alt: Selección de Dominio Analítico
     * ------------------------------------------------------------------------- */
    addMessage(ctrlRoutes, ctrlService,
        "4: export_report(db, tenant_id, report_type, format, selected_columns, ...)", false, step++);

    addCombinedFragment(pkg, diagram, "alt",
        "alt [report_type == 'sales'] / [report_type == 'inventory'] / [report_type == 'movements']",
        780, 1500, -1020, -1460);

    // Caso A: Ventas
    addMessage(ctrlService, entSale,
        "4.1a: get_sales_report(db, tenant_id, branch_id, from_date, to_date)", false, step++);
    addMessage(entSale, ctrlService,
        "4.2a: return { summary, rows }", true, step++);

    // Caso B: Inventario
    addMessage(ctrlService, entInventory,
        "4.1b: get_inventory_report(db, tenant_id, branch_id, q)", false, step++);
    addMessage(entInventory, ctrlService,
        "4.2b: return { summary, rows }", true, step++);

    // Caso C: Movimientos
    addMessage(ctrlService, entMovement,
        "4.1c: get_movements_report(db, tenant_id, branch_id, from_date, to_date)", false, step++);
    addMessage(entMovement, ctrlService,
        "4.2c: return { summary, rows }", true, step++);

    /* -------------------------------------------------------------------------
     * 6. FLUJO 5: GENERACION DOCUMENTAL, PROYECCION Y FORMATEO (ENGINE)
     * Numeración Jerárquica: 5, 5.1a/b/c, 5.2..., 5.3..., 5.4...
     * Fragmento alt: Motor de Generación (Excel vs PDF vs CSV)
     * ------------------------------------------------------------------------- */
    addMessage(ctrlService, ctrlEngine,
        "5: despacharGeneradorDocumental(format, summary, rows, selected_columns)", false, step++);

    addCombinedFragment(pkg, diagram, "alt",
        "alt [format == 'excel'] / [format == 'pdf'] / [format == 'csv']",
        780, 1140, -1540, -2280);

    // Sub-alt 1: Excel OpenPyXL
    addMessage(ctrlService, ctrlEngine,
        "5.1a: export_report_to_excel(type, summary, rows, company_name, selected_columns)", false, step++);

    addCombinedFragment(pkg, diagram, "loop",
        "loop [para cada columna en selected_columns]",
        940, 1120, -1670, -1840);

    addMessage(ctrlEngine, ctrlEngine,
        "5.2a: renderizarFilaConEstiloYFormatoMoneda()", false, step++);

    addMessage(ctrlEngine, ctrlEngine,
        "5.3a: insertarFormulaSumatoriaExcel(=SUM(...))", false, step++);

    addMessage(ctrlEngine, ctrlService,
        "5.4a: return (file_io, filename, application/vnd.openxmlformats)", true, step++);

    // Sub-alt 2: PDF ReportLab
    addMessage(ctrlService, ctrlEngine,
        "5.1b: export_report_to_pdf(type, summary, rows, company_name, selected_columns)", false, step++);

    addMessage(ctrlEngine, ctrlEngine,
        "5.2b: compilarDocumentoConNumberedCanvas(landscape(letter), cebra_styles)", false, step++);

    addCombinedFragment(pkg, diagram, "opt",
        "opt [rows.length == 0]",
        940, 1120, -2020, -2150);

    addMessage(ctrlEngine, ctrlEngine,
        "5.3b: renderizarAvisoSinRegistrosEnPeriodo()", false, step++);

    addMessage(ctrlEngine, ctrlService,
        "5.4b: return (file_io, filename, application/pdf)", true, step++);

    // Sub-alt 3: CSV plano
    addMessage(ctrlService, ctrlService,
        "5.1c: generarCSVStream(selected_columns)", false, step++);

    addMessage(ctrlService, ctrlService,
        "5.2c: return (file_io, filename, text/csv)", true, step++);

    /* -------------------------------------------------------------------------
     * 7. FLUJO 6: RETORNO EN STREAMING BINARIO Y DESCARGA EN EL CLIENTE
     * Numeración Jerárquica: 6, 6.1, 6.2, 6.3, 6.4
     * ------------------------------------------------------------------------- */
    addMessage(ctrlService, ctrlRoutes,
        "6: return (file_io, filename, media_type)", true, step++);

    addMessage(ctrlRoutes, uiReportsApi,
        "6.1: StreamingResponse(content=file_io, media_type, headers={'Content-Disposition': filename})", true, step++);

    addMessage(uiReportsApi, uiReportsPage,
        "6.2: return Observable<Blob>", true, step++);

    addMessage(uiReportsPage, actorAdmin,
        "6.3: entregarArchivoDescargado(blob, filename)", false, step++);

    addMessage(uiReportsPage, actorAdmin,
        "6.4: notificarDescargaExitosa(toast.success)", false, step++);

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    Repo.OpenDiagram(diagram.DiagramID);

    log("¡Diagrama de Secuencia CU21 generado exitosamente según ICONIX!");
    try { Session.Prompt("¡Diagrama de Secuencia CU21 generado con éxito en Enterprise Architect!", 0); } catch (e) { }
}

main();
