/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU16 - Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock
 * DESCRIPCION: Resolución de discrepancias producidas por ventas offline sobre inventario central agotado.
 *              - Actores: Encargado (Actor Principal - toma de decisión gerencial).
 *              - Fronteras: SaleConflictsPageComponent (bandeja gerencial), ResolveConflictModalComponent (modal de decisión).
 *              - Controladores: SaleConflictRoutes (FastAPI REST Router), SaleConflictService (Domain Controller).
 *              - Entidades: Sale, SaleItem, Inventory, GarmentReturn.
 *              - Vías Resolutivas Gerenciales (alt):
 *                  * Vía A: negative_stock (Prenda física ya entregada, autoriza stock temporal negativo).
 *                  * Vía B: substitute (Reasigna variante sustituta disponible en sucursal).
 *                  * Vía C: credit_note (Anulación contable y emisión de comprobante de devolución al 100%).
 * ACTOR: Encargado (Actor Principal)
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 *
 * NORMAS Y PAUTAS APLICADAS:
 * - Participantes rectangulares Sequence con estereotipos <<Actor>>, <<Boundary>>, <<Controller>>, <<Entity>>.
 * - Numeración jerárquica y correlativa estricta ("1: ...()", "1.1: ...()", etc.) con métodos sin parámetros ().
 * - Regla sagrada BCE: Actor solo se comunica con Boundary, Boundary con Controller/Actor,
 *   Controller con Boundary/Controller/Entity, Entity solo con Controller (sin cruces entre entidades).
 * - Fragmentos combinados nativos InteractionFragment:
 *     * opt [Consulta previa de Bandeja de Conflictos y Stock Central]
 *     * alt [Vía A: Autorización de Stock Negativo]
 *     * alt [Vía B: Sustitución de Prenda/Variante]
 *     * alt [Vía C: Anulación y Devolución 100%]
 * - Extensión de líneas de vida con stretchLifeline para evitar líneas cortadas.
 * - Auto-guardado y apertura con Repo.SaveDiagram, Repo.ReloadDiagram y Repo.OpenDiagram.
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU16 - Secuencia Resolver Conflictos de Ventas Offline";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU16-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-2200;", "");
    dObj.ElementID = el.ElementID;
    dObj.Update();
    return el;
}

/**
 * Agrega participante con encabezado Sequence (Boundary, Controller).
 */
function addParticipant(pkg, diagram, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) {
        el.Stereotype = stereotype;
    }
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2150;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

/**
 * Agrega participantes Entidades en recuadro estandar Sequence.
 */
function addEntityParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    el.Stereotype = "Entity" + String.fromCharCode(160);
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2150;", "");
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
 * Agrega fragmentos combinados UML nativos (opt, alt, loop).
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
 * Extiende la linea de vida de cualquier participante hasta el final del diagrama.
 */
function stretchLifeline(diagram, element, bottomY) {
    for (var i = 0; i < diagram.DiagramObjects.Count; i++) {
        var dObj = diagram.DiagramObjects.GetAt(i);
        if (dObj.ElementID == element.ElementID) {
            dObj.Bottom = bottomY || -2200;
            dObj.Update();
            return;
        }
    }
}

function Main() {
    log("Iniciando generacion de Diagrama de Secuencia CU16...");

    var pkg = getTargetPackage();
    if (pkg == null) {
        log("ERROR: No se encontro un paquete destino valido.");
        return;
    }

    var diag = recreateDiagram(pkg);

    /* -------------------------------------------------------------------------
     * 1. PARTICIPANTES BCE (DISTRIBUCION HORIZONTAL)
     * Actores -> Boundaries -> Controllers -> Entities
     * ------------------------------------------------------------------------- */
    var actEncargado     = addActorParticipant(pkg, diag, "Encargado", 30, 85);

    var uiBandeja        = addParticipant(pkg, diag, ":SaleConflictsPageComponent",    "Boundary", 155, 175);
    var uiModalResolver  = addParticipant(pkg, diag, ":ResolveConflictModalComponent", "Boundary", 360, 185);

    var ctrlRoutes       = addParticipant(pkg, diag, ":SaleConflictRoutes",  "Controller", 575, 145);
    var ctrlService      = addParticipant(pkg, diag, ":SaleConflictService", "Controller", 750, 145);

    var entSale          = addEntityParticipant(pkg, diag, ":Sale",          925,  80);
    var entSaleItem      = addEntityParticipant(pkg, diag, ":SaleItem",      1035,  80);
    var entInventory     = addEntityParticipant(pkg, diag, ":Inventory",     1145,  90);
    var entGarmentReturn = addEntityParticipant(pkg, diag, ":GarmentReturn", 1265, 115);

    pkg.Elements.Refresh();
    diag.DiagramObjects.Refresh();

    var seq = 1;

    /* -------------------------------------------------------------------------
     * FASE 1: CONSULTA DE BANDEJA DE CONFLICTOS Y STOCK CENTRAL (FRAGMENTO OPT)
     * ------------------------------------------------------------------------- */
    addCombinedFragment(pkg, diag, "opt", "[Consulta previa de Bandeja de Conflictos y Stock Central]", 140, 1250, -80, -680);

    addMessage(actEncargado, uiBandeja, "1: accederBandejaConflictos()", false, seq++);
    addMessage(uiBandeja, ctrlRoutes, "1.1: list_conflicts_endpoint()", false, seq++);
    addMessage(ctrlRoutes, ctrlService, "1.2: list_branch_sale_conflicts()", false, seq++);
    addMessage(ctrlService, entSale, "1.3: obtenerVentasEnConflicto()", false, seq++);
    addMessage(ctrlService, entInventory, "1.4: verificarStockCentralActual()", false, seq++);
    addMessage(ctrlService, ctrlRoutes, "1.5: response()", true, seq++);
    addMessage(ctrlRoutes, uiBandeja, "1.6: response()", true, seq++);
    addMessage(uiBandeja, actEncargado, "1.7: mostrarTicketsConQuiebreStock()", false, seq++);

    /* -------------------------------------------------------------------------
     * FASE 2: APERTURA Y ENVIO DE RESOLUCION GERENCIAL
     * ------------------------------------------------------------------------- */
    addMessage(actEncargado, uiModalResolver, "2: abrirModalResolucion()", false, seq++);
    addMessage(actEncargado, uiModalResolver, "2.1: ingresarViaYJustificacion()", false, seq++);
    addMessage(uiModalResolver, ctrlRoutes, "2.2: resolve_conflict_endpoint()", false, seq++);
    addMessage(ctrlRoutes, ctrlService, "2.3: resolve_sale_conflict()", false, seq++);
    addMessage(ctrlService, ctrlService, "2.4: validarJustificacionAuditoria()", false, seq++);
    addMessage(ctrlService, entInventory, "2.5: lockInventoryForUpdate()", false, seq++);

    /* -------------------------------------------------------------------------
     * FASE 3: BIFURCACIONES GERENCIALES (FRAGMENTOS ALT)
     * ------------------------------------------------------------------------- */
    // Vía A: negative_stock (Prenda entregada en mostrador, autoriza saldo negativo y reposición)
    addCombinedFragment(pkg, diag, "alt", "[Vía A: Autorización de Stock Negativo]", 720, 1250, -1140, -1360);
    addMessage(ctrlService, entInventory, "2.6a: autorizarStockNegativo()", false, seq++);
    addMessage(ctrlService, entSale, "2.7a: marcarVentaCompletada()", false, seq++);

    // Vía B: substitute (Sustitución de variante disponible acordada con el cliente)
    addCombinedFragment(pkg, diag, "alt", "[Vía B: Sustitución de Prenda/Variante]", 720, 1250, -1390, -1610);
    addMessage(ctrlService, entInventory, "2.6b: descontarStockVarianteSustituta()", false, seq++);
    addMessage(ctrlService, entSaleItem, "2.7b: reasignarVarianteItem()", false, seq++);

    // Vía C: credit_note (Anulación contable con emisión de Nota de Crédito / Reembolso 100%)
    addCombinedFragment(pkg, diag, "alt", "[Vía C: Anulación y Devolución 100%]", 720, 1390, -1640, -1860);
    addMessage(ctrlService, entGarmentReturn, "2.6c: registrarDevolucion100PorCiento()", false, seq++);
    addMessage(ctrlService, entSale, "2.7c: anularVentaOffline()", false, seq++);

    /* -------------------------------------------------------------------------
     * FASE 4: CONFIRMACION FINAL Y CIERRE DEL CONFLICTO
     * ------------------------------------------------------------------------- */
    addMessage(ctrlService, ctrlRoutes, "3: response()", true, seq++);
    addMessage(ctrlRoutes, uiModalResolver, "3.1: response()", true, seq++);
    addMessage(uiModalResolver, actEncargado, "3.2: notificarResolucionExitosa()", false, seq++);

    /* -------------------------------------------------------------------------
     * EXTENSION DE LINEAS DE VIDA HASTA EL PIE DEL DIAGRAMA
     * ------------------------------------------------------------------------- */
    stretchLifeline(diag, actEncargado,     -2200);
    stretchLifeline(diag, uiBandeja,        -2200);
    stretchLifeline(diag, uiModalResolver,  -2200);
    stretchLifeline(diag, ctrlRoutes,       -2200);
    stretchLifeline(diag, ctrlService,      -2200);
    stretchLifeline(diag, entSale,          -2200);
    stretchLifeline(diag, entSaleItem,      -2200);
    stretchLifeline(diag, entInventory,     -2200);
    stretchLifeline(diag, entGarmentReturn, -2200);

    diag.Update();
    if (Repo != null) {
        Repo.SaveDiagram(diag.DiagramID);
        Repo.ReloadDiagram(diag.DiagramID);
        try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }
    }

    log("Diagrama de Secuencia CU16 generado exitosamente. ID: " + diag.DiagramID);
    try { Session.Prompt("¡Diagrama de Secuencia CU16 generado con exito en Enterprise Architect!", 0); } catch (e) { }
}

Main();
