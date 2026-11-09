// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU16 - Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Encargado, Cliente
//   Boundary: SaleConflictsPageComponent, ResolveConflictModalComponent (Object, «boundary»)
//   Control: SaleConflictRoutes, SaleConflictService (Object, «control»)
//   Entity: Sale, SaleItem, Inventory, GarmentReturn, Company, Branch (Object, «entity»)
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

    Log("Generando Diagrama de Comunicación CU16 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX
    var actorEncargado   = crearElementoConEsterotipo(pkg, "Encargado", "Actor", "");
    var actorCliente     = crearElementoConEsterotipo(pkg, "Cliente", "Actor", "");

    var uiBandeja        = crearElementoConEsterotipo(pkg, "SaleConflictsPageComponent", "Object", "boundary");
    var uiModalResolver  = crearElementoConEsterotipo(pkg, "ResolveConflictModalComponent", "Object", "boundary");

    var ctrlRoutes       = crearElementoConEsterotipo(pkg, "SaleConflictRoutes", "Object", "control");
    var ctrlService      = crearElementoConEsterotipo(pkg, "SaleConflictService", "Object", "control");

    var entSale          = crearElementoConEsterotipo(pkg, "Sale", "Object", "entity");
    var entSaleItem      = crearElementoConEsterotipo(pkg, "SaleItem", "Object", "entity");
    var entInventory     = crearElementoConEsterotipo(pkg, "Inventory", "Object", "entity");
    var entGarmentReturn = crearElementoConEsterotipo(pkg, "GarmentReturn", "Object", "entity");

    // 2. Crear Diagrama de Comunicación
    var diagName = "CU16 - Comunicación Resolver Conflictos de Ventas Offline";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Posicionamiento horizontal y vertical
    colocarElemento(diagram, actorEncargado,    30,  120, -120, -200);
    colocarElemento(diagram, actorCliente,      30,  120, -270, -350);

    colocarElemento(diagram, uiBandeja,        240,  360,  -60, -140);
    colocarElemento(diagram, uiModalResolver,  240,  370, -200, -280);

    colocarElemento(diagram, ctrlRoutes,       480,  600, -120, -200);
    colocarElemento(diagram, ctrlService,      680,  800, -120, -200);

    colocarElemento(diagram, entSale,          900,  990,  -30, -100);
    colocarElemento(diagram, entSaleItem,      900,  990, -110, -180);
    colocarElemento(diagram, entInventory,     900,  990, -190, -260);
    colocarElemento(diagram, entGarmentReturn, 680,  800, -280, -350);

    // 4. Mensajes con funciones reales sin parámetros ()
    // Fase 1: Consulta de Bandeja de Quiebres
    crearMensaje(actorEncargado, uiBandeja, "1: accederBandejaConflictos()");
    crearMensaje(uiBandeja, ctrlRoutes, "2: list_conflicts_endpoint()");
    crearMensaje(ctrlRoutes, ctrlService, "3: list_branch_sale_conflicts()");
    crearMensaje(ctrlService, entSale, "4: obtenerVentasEnConflicto()");
    crearMensaje(ctrlService, entInventory, "5: verificarStockCentralActual()");

    // Fase 2: Coordinación con Cliente y Selección de Vía
    crearMensaje(actorEncargado, uiModalResolver, "6: abrirModalResolucion()");
    crearMensaje(actorEncargado, actorCliente, "7: acordarModalidadConciliacion()");
    crearMensaje(actorEncargado, uiModalResolver, "8: ingresarViaYJustificacion()");

    // Fase 3: Ejecución de Resolución Gerencial
    crearMensaje(uiModalResolver, ctrlRoutes, "9: resolve_conflict_endpoint()");
    crearMensaje(ctrlRoutes, ctrlService, "10: resolve_sale_conflict()");

    // Fase 4: Bifurcación en Controlador de Negocio según la Vía
    // Vía 1: negative_stock
    crearMensaje(ctrlService, entInventory, "11a: autorizarStockNegativo()");
    crearMensaje(ctrlService, entSale, "12a: marcarVentaCompletada()");

    // Vía 2: substitute
    crearMensaje(ctrlService, entInventory, "11b: descontarStockVarianteSustituta()");
    crearMensaje(ctrlService, entSaleItem, "12b: reasignarVarianteItem()");

    // Vía 3: credit_note
    crearMensaje(ctrlService, entGarmentReturn, "11c: registrarDevolucion100PorCiento()");
    crearMensaje(ctrlService, entSale, "12c: anularVentaOffline()");

    diagram.Update();
    Repo.ReloadDiagram(diagram.DiagramID);
    Log("Diagrama de Comunicación CU16 creado con éxito. ID: " + diagram.DiagramID);
}

Main();
