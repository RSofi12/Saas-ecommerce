/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU18 - Procesar Devolución de Prenda con Retención Operativa (20%–50%) y Nota de Crédito
 * DESCRIPCION: Procesa la devolución física de prendas vendidas en mostrador aplicando la
 *              Política de Negocio 2 (P-Ten-03):
 *              - Actores: Cliente (iniciador presencial y decisor) y Cajero (operador de caja y verificador físico).
 *              - Fronteras: CajaPageComponent (POS base), ModalDevolucionPrenda (inspección y cotizador),
 *                ModalComprobanteNotaCredito (comprobante digital).
 *              - Controladores: ReturnRoutes (FastAPI REST API Controller) y ReturnService (Domain Controller).
 *              - Entidades: Sale, Company, Inventory, GarmentReturn.
 *              - Evaluación física obligatoria de etiqueta intacta (good_with_tags) y plazo hábil (max_days).
 *              - Retención operativa por tenant (20% a 50%) y reembolso neto (50% a 80%).
 *              - Reingreso de stock atómico con bloqueo pesimista (with_for_update).
 *              - Liquidación vía Nota de Crédito digital (NC-YYYYMMDD-XXXX) o efectivo.
 * ACTORES: Cliente, Cajero
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 *
 * NORMAS Y PAUTAS APLICADAS:
 * - Participantes rectangulares Sequence con estereotipos <<Actor>>, <<Interface>>, <<Controller>>, <<Entity>>.
 * - Numeración secuencial estricta (con.SequenceNo = sequenceNo) para garantizar orden vertical perfecto.
 * - Sin cruces horizontales entre entidades (comunicación exclusiva Controller -> Entity).
 * - Retornos únicamente hacia el Controller o la Interface (isReturn = true).
 * - Parámetros UML explícitos y nombres de funciones() coincidentes con el código implementado.
 * - Fragmentos combinados:
 *     * alt [Prenda con Etiqueta Intacta y Plazo Vigente / Prenda Usada o Plazo Vencido]
 *     * alt [Modalidad NOTA_CREDITO / Modalidad EFECTIVO]
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU18 - Devolucion de Prenda con Retencion y Nota de Credito";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU18-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
    log("Iniciando generacion de Diagrama de Secuencia CU18 con Actores Cliente/Cajero y arquitectura multicontrolador...");

    var pkg = getTargetPackage();
    if (pkg == null) return;

    var diagram = recreateDiagram(pkg);

    /* -------------------------------------------------------------------------
     * 1. PARTICIPANTES BCE (DISTRIBUCION HORIZONTAL)
     * Actores -> Boundaries -> Controllers -> Entities
     * Cliente, Cajero
     * :CajaPageComponent, :ModalDevolucionPrenda, :ModalComprobanteNotaCredito
     * :ReturnRoutes, :ReturnService
     * :Sale, :Company, :Inventory, :GarmentReturn
     * ------------------------------------------------------------------------- */
    var actorCliente  = addActorParticipant(pkg, diagram, "Cliente",  30,  80);
    var actorCajero   = addActorParticipant(pkg, diagram, "Cajero",   150,  80);

    var uiCaja        = addParticipant(pkg, diagram, ":CajaPageComponent",          "Interface",  270, 160);
    var uiModalDev    = addParticipant(pkg, diagram, ":ModalDevolucionPrenda",      "Interface",  460, 180);
    var uiModalNC     = addParticipant(pkg, diagram, ":ModalComprobanteNotaCredito","Interface",  670, 190);

    var ctrlRoutes    = addParticipant(pkg, diagram, ":ReturnRoutes",  "Controller", 890, 140);
    var ctrlService   = addParticipant(pkg, diagram, ":ReturnService", "Controller", 1060, 140);

    var entSale       = addEntityParticipant(pkg, diagram, ":Sale",          1230, 100);
    var entCompany    = addEntityParticipant(pkg, diagram, ":Company",       1360, 110);
    var entInventory  = addEntityParticipant(pkg, diagram, ":Inventory",     1500, 110);
    var entReturn     = addEntityParticipant(pkg, diagram, ":GarmentReturn", 1640, 130);

    var step = 1;

    /* -------------------------------------------------------------------------
     * 2. FASE 1: SOLICITUD PRESENCIAL DEL CLIENTE Y APERTURA DE MODAL
     * ------------------------------------------------------------------------- */
    addMessage(actorCliente, actorCajero,
        "1: solicitarDevolucionPrenda(ticket, prenda)", false, step++);

    addMessage(actorCajero, uiCaja,
        "2: abrirModalDevolucion()", false, step++);

    addMessage(uiCaja, uiModalDev,
        "2.1: renderizarFormulario()", false, step++);

    /* -------------------------------------------------------------------------
     * 3. FASE 2: BUSQUEDA DE COMPROBANTE Y COTIZACION DE RETENCION EN TIEMPO REAL
     * ------------------------------------------------------------------------- */
    addMessage(actorCajero, uiModalDev,
        "3: ingresarTicketYPrenda(sale_id, variant_id)", false, step++);

    addMessage(uiModalDev, ctrlRoutes,
        "3.1: POST /api/returns/quote(sale_id, variant_id)", false, step++);

    addMessage(ctrlRoutes, ctrlService,
        "3.2: quote_garment_return(sale_id, variant_id)", false, step++);

    addMessage(ctrlService, entSale,
        "3.3: filter(Sale.id == sale_id, tenant_id)", false, step++);

    addMessage(entSale, ctrlService,
        "3.4: return(sale, sale_items)", true, step++);

    addMessage(ctrlService, entCompany,
        "3.5: _get_tenant_return_policy(company)", false, step++);

    addMessage(entCompany, ctrlService,
        "3.6: return(retention_rate, max_days)", true, step++);

    addMessage(ctrlService, ctrlService,
        "3.7: calcularRetencionYReembolsoNeto(price, retention_rate)", false, step++);

    addMessage(ctrlService, ctrlRoutes,
        "3.8: return(ReturnQuoteResponse)", true, step++);

    addMessage(ctrlRoutes, uiModalDev,
        "3.9: return(ReturnQuoteResponse)", true, step++);

    addMessage(uiModalDev, actorCajero,
        "3.10: mostrarDesgloseRetencion(retencion, reembolso_neto)", true, step++);

    /* -------------------------------------------------------------------------
     * 4. FASE 3: ACUERDO CON EL CLIENTE Y SELECCION DE MODALIDAD
     * ------------------------------------------------------------------------- */
    addMessage(actorCajero, actorCliente,
        "3.11: informarRetencionYConsultarModalidad(R=20%-50%, neto)", false, step++);

    addMessage(actorCliente, actorCajero,
        "4: aceptarRetencionYElegirModalidad(NOTA_CREDITO | EFECTIVO)", false, step++);

    /* -------------------------------------------------------------------------
     * 5. FASE 4: CONFIRMACION Y VALIDACION DE CONDICION (FRAGMENTO ALT)
     * ------------------------------------------------------------------------- */
    addMessage(actorCajero, uiModalDev,
        "5: confirmarDevolucion(condition, refund_method, reason)", false, step++);

    addMessage(uiModalDev, ctrlRoutes,
        "5.1: POST /api/returns(payload)", false, step++);

    addMessage(ctrlRoutes, ctrlService,
        "5.2: process_garment_return(payload)", false, step++);

    /* FRAGMENTO ALT: Validacion de Prenda y Plazo
     * [Prenda con Etiqueta Intacta y Plazo Vigente] vs [Condicion No Apta / Plazo Vencido] */
    addCombinedFragment(pkg, diagram, "alt", "[Prenda con Etiqueta Intacta y Plazo Vigente]", 870, 1780, -980, -1350);

    addMessage(ctrlService, ctrlService,
        "5.3: validarCondicionPrenda(good_with_tags)", false, step++);

    addMessage(ctrlService, ctrlService,
        "5.4: validarPlazoDevolucion(sale_date, max_days)", false, step++);

    /* -------------------------------------------------------------------------
     * 6. FASE 5: REINGRESO DE STOCK ATOMICO (with_for_update)
     * ------------------------------------------------------------------------- */
    addMessage(ctrlService, entInventory,
        "5.5: with_for_update(variant_id, branch_id)", false, step++);

    addMessage(entInventory, ctrlService,
        "5.6: return(inventory_row)", true, step++);

    addMessage(ctrlService, entInventory,
        "5.7: incrementQuantity(quantity += 1)", false, step++);

    addMessage(entInventory, ctrlService,
        "5.8: return()", true, step++);

    /* -------------------------------------------------------------------------
     * 7. FASE 6: LIQUIDACION (FRAGMENTO ALT: NOTA DE CREDITO vs EFECTIVO)
     * ------------------------------------------------------------------------- */
    /* FRAGMENTO ALT: Metodo de Reembolso
     * [Modalidad NOTA_CREDITO] vs [Modalidad EFECTIVO] */
    addCombinedFragment(pkg, diagram, "alt", "[Modalidad NOTA_CREDITO]", 870, 1780, -1370, -1640);

    addMessage(ctrlService, ctrlService,
        "5.9: generate_credit_note_code(tenant_id) [NC-YYYYMMDD-XXXX]", false, step++);

    addMessage(ctrlService, entReturn,
        "5.10: create(GarmentReturn(credit_note_code, retention_rate, refund_amount))", false, step++);

    addMessage(entReturn, ctrlService,
        "5.11: commit()", true, step++);

    /* -------------------------------------------------------------------------
     * 8. FASE 7: RESPUESTA, EMISION DE COMPROBANTE Y ENTREGA AL CLIENTE
     * ------------------------------------------------------------------------- */
    addMessage(ctrlService, ctrlRoutes,
        "5.12: return(GarmentReturnResponse)", true, step++);

    addMessage(ctrlRoutes, uiModalDev,
        "5.13: return(GarmentReturnResponse)", true, step++);

    addMessage(uiModalDev, uiModalNC,
        "5.14: abrirComprobante(credit_note_code, refund_amount)", false, step++);

    addMessage(uiModalNC, actorCajero,
        "5.15: renderizarNotaCreditoYRecibo()", true, step++);

    addMessage(actorCajero, actorCliente,
        "6: entregarComprobanteYReembolso(NC / efectivo)", false, step++);

    /* Guardar y abrir diagrama de forma segura */
    stretchActorLifeline(diagram, actorCliente, -2600);
    stretchActorLifeline(diagram, actorCajero,  -2600);
    diagram.Update();
    if (Repo != null) {
        Repo.SaveDiagram(diagram.DiagramID);
        Repo.ReloadDiagram(diagram.DiagramID);
        Repo.OpenDiagram(diagram.DiagramID);
    }

    log("Diagrama '" + DIAGRAM_NAME + "' generado y guardado exitosamente con paridad completa de actores y componentes.");
    try { Session.Prompt("¡Diagrama de Secuencia CU18 actualizado con exito!", 0); } catch (e) { }
}

main();
