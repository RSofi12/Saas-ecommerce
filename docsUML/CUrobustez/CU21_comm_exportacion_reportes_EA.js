// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU21 - Exportar Reportes Empresariales a Formatos PDF y Excel
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Administrador, Encargado
//   Boundary: AdminReportsPageComponent, ReportsApiService (Object, «boundary»)
//   Control: ReportRoutes, ReportService, ReportExportEngine (Object, «control»)
//   Entity: Sale, Inventory, InventoryMovement, Company (Object, «entity»)
//
// Reglas Metodológicas Estrictas ICONIX:
//   - Cero bucles reflexivos (self-loops) o validaciones sobre Fronteras (Boundaries).
//     Las Fronteras son interfaces pasivas que capturan entradas del Actor y muestran resultados.
//   - Todas las validaciones, bifurcaciones de alcance, agregaciones y bucles
//     residen y parten EXCLUSIVAMENTE de los Controladores (ReportRoutes, ReportService, ReportExportEngine).
//   - Todas las funciones se expresan con paréntesis vacíos () sin parámetros internos.
//   - Numeración jerárquica por flujo y submensajes sincronizada con la secuencia.
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

    Log("Generando Diagrama de Comunicación CU21 estricto ICONIX en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX
    var actorAdmin       = crearElementoConEsterotipo(pkg, "Administrador", "Actor", "");
    var actorEncargado   = crearElementoConEsterotipo(pkg, "Encargado", "Actor", "");

    var uiReportsPage    = crearElementoConEsterotipo(pkg, "AdminReportsPageComponent", "Object", "boundary");
    var uiReportsApi     = crearElementoConEsterotipo(pkg, "ReportsApiService", "Object", "boundary");

    var ctrlRoutes       = crearElementoConEsterotipo(pkg, "ReportRoutes", "Object", "control");
    var ctrlService      = crearElementoConEsterotipo(pkg, "ReportService", "Object", "control");
    var ctrlEngine       = crearElementoConEsterotipo(pkg, "ReportExportEngine", "Object", "control");

    var entSale          = crearElementoConEsterotipo(pkg, "Sale", "Object", "entity");
    var entInventory     = crearElementoConEsterotipo(pkg, "Inventory", "Object", "entity");
    var entMovement      = crearElementoConEsterotipo(pkg, "InventoryMovement", "Object", "entity");
    var entCompany       = crearElementoConEsterotipo(pkg, "Company", "Object", "entity");

    // 2. Crear Diagrama de Comunicación
    var diagName = "CU21 - Comunicación Exportación de Reportes PDF y Excel";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Posicionamiento horizontal y vertical equilibrado
    colocarElemento(diagram, actorAdmin,      30,  120,  -70, -150);
    colocarElemento(diagram, actorEncargado,  30,  120, -230, -310);

    colocarElemento(diagram, uiReportsPage,  190,  310, -150, -230);
    colocarElemento(diagram, uiReportsApi,   370,  480, -150, -230);

    colocarElemento(diagram, ctrlRoutes,     550,  650, -150, -230);
    colocarElemento(diagram, ctrlService,    720,  820, -150, -230);
    colocarElemento(diagram, ctrlEngine,     720,  820, -300, -380);

    colocarElemento(diagram, entSale,        910, 1000,  -30, -100);
    colocarElemento(diagram, entInventory,   910, 1000, -110, -180);
    colocarElemento(diagram, entMovement,    910, 1000, -190, -260);
    colocarElemento(diagram, entCompany,     910, 1000, -280, -350);

    // 4. Mensajes del Flujo de Robustez
    // Cero self-loops en la Frontera. Las entradas del usuario son enviadas del Actor a la Frontera.
    // Todas las validaciones, bifurcaciones y bucles parten estrictamente de los Controladores.

    // Flujo 1: Acceso a la interfaz y consulta de vista previa
    crearMensaje(actorAdmin, uiReportsPage, "1: accederSeccionReportes()");
    crearMensaje(actorEncargado, uiReportsPage, "1a: accederSeccionReportes()");
    crearMensaje(uiReportsPage, uiReportsApi, "1.1: fetchReport()");
    crearMensaje(uiReportsApi, ctrlRoutes, "1.2: GET /api/reports/sales");
    crearMensaje(ctrlRoutes, ctrlService, "1.3: get_sales_report()");
    crearMensaje(ctrlService, entSale, "1.4: filter()");
    crearMensaje(entSale, ctrlService, "1.5: return()");
    crearMensaje(ctrlService, ctrlRoutes, "1.6: return()");
    crearMensaje(ctrlRoutes, uiReportsApi, "1.7: return()");
    crearMensaje(uiReportsApi, uiReportsPage, "1.8: return()");

    // Flujo 2: Interacción del usuario para filtros y selección de columnas (Actor -> Frontera)
    crearMensaje(actorAdmin, uiReportsPage, "2: seleccionarPestañaYFiltros()");
    crearMensaje(actorAdmin, uiReportsPage, "2.1: configurarColumnasVisibles()");

    // Flujo 3: Solicitud formal de exportación y validaciones en Controller
    crearMensaje(actorAdmin, uiReportsPage, "3: exportReport()");
    crearMensaje(uiReportsPage, uiReportsApi, "3.1: exportReport()");
    crearMensaje(uiReportsApi, ctrlRoutes, "3.2: GET /api/reports/{type}/export");

    // VALIDACIONES EN EL CONTROLLER (ReportRoutes)
    crearMensaje(ctrlRoutes, ctrlRoutes, "3.3: validarTokenJWT()");
    crearMensaje(ctrlRoutes, ctrlRoutes, "3.4: verificarAlcanceSucursalEncargado()");
    crearMensaje(ctrlRoutes, ctrlRoutes, "3.5: parsearColumnasSeleccionadas()");
    crearMensaje(ctrlRoutes, entCompany, "3.6: get_company_by_tenant_id()");
    crearMensaje(entCompany, ctrlRoutes, "3.7: return()");

    // Flujo 4: Agregación de datos en Controller de Dominio (ReportService)
    crearMensaje(ctrlRoutes, ctrlService, "4: export_report()");
    crearMensaje(ctrlService, entSale, "4.1: get_sales_report()");
    crearMensaje(ctrlService, entInventory, "4.2: get_inventory_report()");
    crearMensaje(ctrlService, entMovement, "4.3: get_movements_report()");

    // Flujo 5: Generación documental y bucles de formateo en Controller Engine
    crearMensaje(ctrlService, ctrlEngine, "5: despacharGeneradorDocumental()");
    crearMensaje(ctrlEngine, ctrlEngine, "5.1: export_report_to_excel()");
    crearMensaje(ctrlEngine, ctrlEngine, "5.2: export_report_to_pdf()");
    crearMensaje(ctrlEngine, ctrlEngine, "5.3: proyectarColumnasDinamicas()");
    crearMensaje(ctrlEngine, ctrlEngine, "5.4: insertarFormulaSumatoriaExcel()");
    crearMensaje(ctrlEngine, ctrlService, "5.5: return()");

    // Flujo 6: Streaming binario de respuesta y descarga en navegador
    crearMensaje(ctrlService, ctrlRoutes, "6: return()");
    crearMensaje(ctrlRoutes, uiReportsApi, "6.1: StreamingResponse()");
    crearMensaje(uiReportsApi, uiReportsPage, "6.2: return()");
    crearMensaje(uiReportsPage, actorAdmin, "6.3: entregarArchivoDescargado()");
    crearMensaje(uiReportsPage, actorAdmin, "6.4: notificarDescargaExitosa()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    Repo.OpenDiagram(diagram.DiagramID);

    Log("¡Diagrama de Comunicación CU21 corregido exitosamente según ICONIX!");
    try { Session.Prompt("¡Diagrama de Comunicación CU21 corregido con éxito en Enterprise Architect!", 0); } catch (e) { }
}

Main();
