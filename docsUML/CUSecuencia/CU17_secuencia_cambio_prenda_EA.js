/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU17 - Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Estado
 * DESCRIPCION: Procesamiento presencial de cambio de prenda por talla o modelo aplicando la
 *              Política de Negocio 1 (P-Ten-02):
 *              - Si el cliente cambia una prenda por otra de mayor precio (ej. M a Bs 50 por L a Bs 70),
 *                el cambio se consolida ÚNICAMENTE si el cliente abona la diferencia (Bs 20).
 *              - Si no abona la diferencia, se cancela la operación y se restituye la prenda original.
 *              - Verificación de etiqueta textil intacta (good_with_tags) y plazo hábil.
 *              - Reingreso de prenda original y egreso de nueva talla en inventario.
 *              - Creación de registro auditable en garment_exchanges.
 * ACTOR: Cajero (Actor Principal)
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
 *     * opt [Cotización de Cambio de Prenda y Cálculo de Diferencia (Delta)]
 *     * alt [Política 1: Diferencia Abonada (Cambio Exitoso)]
 *     * alt [else: Rechazo por No Pago de Diferencia (Operación Cancelada)]
 * - Extensión de líneas de vida con stretchLifeline para evitar líneas cortadas.
 * - Auto-guardado y apertura con Repo.SaveDiagram, Repo.ReloadDiagram y Repo.OpenDiagram.
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU17 - Secuencia Cambio de Prenda y Cobro de Diferencia";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU17-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-2300;", "");
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
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2250;", "");
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
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2250;", "");
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
            dObj.Bottom = bottomY || -2300;
            dObj.Update();
            return;
        }
    }
}

function Main() {
    log("Iniciando generacion de Diagrama de Secuencia CU17...");

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
    var actCajero        = addActorParticipant(pkg, diag, "Cajero", 30, 80);

    var uiCaja           = addParticipant(pkg, diag, ":CajaPageComponent",             "Boundary", 150, 150);
    var uiModalCambio    = addParticipant(pkg, diag, ":GarmentExchangeModalComponent", "Boundary", 340, 190);

    var ctrlRoutes       = addParticipant(pkg, diag, ":GarmentExchangeRoutes",  "Controller", 570, 155);
    var ctrlService      = addParticipant(pkg, diag, ":GarmentExchangeService", "Controller", 765, 155);

    var entExchange      = addEntityParticipant(pkg, diag, ":GarmentExchange", 960, 110);
    var entSale          = addEntityParticipant(pkg, diag, ":Sale",           1110,  80);
    var entSaleItem      = addEntityParticipant(pkg, diag, ":SaleItem",       1230,  80);
    var entInventory     = addEntityParticipant(pkg, diag, ":Inventory",      1350,  90);

    pkg.Elements.Refresh();
    diag.DiagramObjects.Refresh();

    var seq = 1;

    /* -------------------------------------------------------------------------
     * FASE 1: COTIZACION DE CAMBIO DE PRENDA Y CALCULO DE DELTA (FRAGMENTO OPT)
     * ------------------------------------------------------------------------- */
    addCombinedFragment(pkg, diag, "opt", "[Cotización de Cambio de Prenda y Cálculo de Diferencia (Delta)]", 140, 1460, -80, -820);

    addMessage(actCajero, uiCaja, "1: abrirModalCambioPrenda()", false, seq++);
    addMessage(uiCaja, uiModalCambio, "1.1: renderizarFormulario()", false, seq++);
    addMessage(actCajero, uiModalCambio, "1.2: cotizarDiferenciaPrecio()", false, seq++);
    addMessage(uiModalCambio, ctrlRoutes, "1.3: quote_exchange_endpoint()", false, seq++);
    addMessage(ctrlRoutes, ctrlService, "1.4: quote_garment_exchange()", false, seq++);
    addMessage(ctrlService, entSale, "1.5: verificarVentaOriginal()", false, seq++);
    addMessage(ctrlService, entSaleItem, "1.6: verificarItemOriginalYPrecio()", false, seq++);
    addMessage(ctrlService, entInventory, "1.7: verificarDisponibilidadNuevaTalla()", false, seq++);
    addMessage(ctrlService, ctrlService, "1.8: calcularDeltaPrecio()", false, seq++);
    addMessage(ctrlService, ctrlRoutes, "1.9: responseQuote()", true, seq++);
    addMessage(ctrlRoutes, uiModalCambio, "1.10: responseQuote()", true, seq++);
    addMessage(uiModalCambio, actCajero, "1.11: mostrarDiferenciaPorCobrar()", false, seq++);

    /* -------------------------------------------------------------------------
     * FASE 2: POLITICA 1 - CONFIRMACION DE PAGO Y PROCESAMIENTO (FRAGMENTO ALT)
     * ------------------------------------------------------------------------- */
    // Rama Normal: Diferencia abonada exitosamente por el cliente (Cambio Exitoso)
    addCombinedFragment(pkg, diag, "alt", "[Política 1: Diferencia Abonada (Cambio Exitoso)]", 330, 1460, -870, -1720);

    addMessage(actCajero, uiModalCambio, "2: confirmarAbonoDiferenciaYEstado()", false, seq++);
    addMessage(uiModalCambio, ctrlRoutes, "2.1: process_exchange_endpoint()", false, seq++);
    addMessage(ctrlRoutes, ctrlService, "2.2: process_garment_exchange()", false, seq++);
    addMessage(ctrlService, ctrlService, "2.3: validarCondicionEtiquetaIntacta()", false, seq++);
    addMessage(ctrlService, ctrlService, "2.4: validarPagoDiferenciaObligatorio()", false, seq++);
    addMessage(ctrlService, entInventory, "2.5: reingresarPrendaOriginal()", false, seq++);
    addMessage(ctrlService, entInventory, "2.6: descontarNuevaPrenda()", false, seq++);
    addMessage(ctrlService, entExchange, "2.7: create()", false, seq++);
    addMessage(ctrlService, entSale, "2.8: asociarCambioAVenta()", false, seq++);
    addMessage(ctrlService, ctrlRoutes, "2.9: responseSuccess()", true, seq++);
    addMessage(ctrlRoutes, uiModalCambio, "2.10: responseSuccess()", true, seq++);
    addMessage(uiModalCambio, actCajero, "2.11: emitirComprobanteCambio()", false, seq++);

    /* -------------------------------------------------------------------------
     * FASE 3: FLUJO ALTERNATIVO A1 - RECHAZO POR NO PAGO DE DIFERENCIA (ALT ELSE)
     * ------------------------------------------------------------------------- */
    // Rama Alternativa: El cliente desiste de pagar la diferencia (Operacion cancelada)
    addCombinedFragment(pkg, diag, "alt", "[else: Rechazo por No Pago de Diferencia (Operación Cancelada)]", 330, 950, -1760, -2180);

    addMessage(actCajero, uiModalCambio, "3: intentarCambioSinAbonarDiferencia()", false, seq++);
    addMessage(uiModalCambio, ctrlRoutes, "3.1: process_exchange_endpoint()", false, seq++);
    addMessage(ctrlRoutes, ctrlService, "3.2: process_garment_exchange()", false, seq++);
    addMessage(ctrlService, ctrlService, "3.3: validarPagoDiferenciaObligatorio()", false, seq++);
    addMessage(ctrlService, ctrlRoutes, "3.4: raise_http_exception()", true, seq++);
    addMessage(ctrlRoutes, uiModalCambio, "3.5: 400 Bad Request", true, seq++);
    addMessage(uiModalCambio, actCajero, "3.6: showErrorToast()", false, seq++);

    /* -------------------------------------------------------------------------
     * EXTENSION DE LINEAS DE VIDA HASTA EL PIE DEL DIAGRAMA
     * ------------------------------------------------------------------------- */
    stretchLifeline(diag, actCajero,     -2300);
    stretchLifeline(diag, uiCaja,        -2300);
    stretchLifeline(diag, uiModalCambio, -2300);
    stretchLifeline(diag, ctrlRoutes,    -2300);
    stretchLifeline(diag, ctrlService,   -2300);
    stretchLifeline(diag, entExchange,   -2300);
    stretchLifeline(diag, entSale,       -2300);
    stretchLifeline(diag, entSaleItem,   -2300);
    stretchLifeline(diag, entInventory,  -2300);

    diag.Update();
    if (Repo != null) {
        Repo.SaveDiagram(diag.DiagramID);
        Repo.ReloadDiagram(diag.DiagramID);
        try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }
    }

    log("Diagrama de Secuencia CU17 generado exitosamente. ID: " + diag.DiagramID);
    try { Session.Prompt("¡Diagrama de Secuencia CU17 generado con exito en Enterprise Architect!", 0); } catch (e) { }
}

Main();
