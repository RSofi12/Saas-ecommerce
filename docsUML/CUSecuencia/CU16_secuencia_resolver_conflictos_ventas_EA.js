/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU16 - Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock
 * DESCRIPCION: Concilia y resuelve los quiebres de inventario central ocurridos tras la
 *              sincronización de ventas de mostrador ejecutadas en contingencia desconectada.
 *              - Actores: Encargado (operador gerencial y decisor) y Cliente (interlocutor coordinado).
 *              - Fronteras: SaleConflictsPageComponent (bandeja de quiebres), ResolveConflictModalComponent (modal de 3 vías).
 *              - Controladores: SaleConflictRoutes (FastAPI REST API Controller) y SaleConflictService (Domain Service).
 *              - Entidades: Sale, SaleItem, Inventory, GarmentReturn.
 *              - 3 Vías Reglamentarias:
 *                  1. negative_stock: Prenda entregada físicamente; autoriza saldo temporal (-1) y solicita reposición.
 *                  2. substitute: Reasigna el ítem a una variante con stock disponible en la sucursal.
 *                  3. credit_note: Anulación contable formal y emisión de Nota de Crédito digital por el 100% pagado.
 *              - Justificación de auditoría obligatoria (min_length=5).
 *              - Bloqueo pesimista de inventario (with_for_update).
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
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

function getTargetPackage() {
    if (Repo == null) return null;
    var selectedPkg = Repo.GetTreeSelectedPackage();
    if (selectedPkg != null) {
        log("Usando paquete seleccionado en Project Browser: " + selectedPkg.Name);
        return selectedPkg;
    }

    var roots = Repo.Models;
    var root = (roots.Count > 0) ? roots.GetAt(0) : null;
    if (root == null) return null;

    for (var i = 0; i < root.Packages.Count; i++) {
        var pkg = root.Packages.GetAt(i);
        if (pkg.Name == DEFAULT_PACKAGE_NAME) return pkg;
    }

    var newPkg = root.Packages.AddNew(DEFAULT_PACKAGE_NAME, "");
    newPkg.Update();
    root.Packages.Refresh();
    return newPkg;
}

function getOrCreateElement(pkg, name, type, stereotype) {
    for (var i = 0; i < pkg.Elements.Count; i++) {
        var el = pkg.Elements.GetAt(i);
        if (el.Name == name && el.Type == type) {
            if (stereotype && el.Stereotype != stereotype) {
                el.Stereotype = stereotype;
                el.Update();
            }
            return el;
        }
    }
    var newEl = pkg.Elements.AddNew(name, type);
    if (stereotype && stereotype.length > 0) {
        newEl.Stereotype = stereotype;
    }
    newEl.Update();
    pkg.Elements.Refresh();
    return newEl;
}

function createCleanDiagram(pkg, name) {
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
    var newDiag = pkg.Diagrams.AddNew(name, "Sequence");
    newDiag.Update();
    pkg.Diagrams.Refresh();
    return newDiag;
}

function placeLifeline(diagram, element, leftPos, topPos, width, height) {
    var rightPos = leftPos + width;
    var bottomPos = topPos - height;
    var coords = "l=" + leftPos + ";r=" + rightPos + ";t=" + topPos + ";b=" + bottomPos + ";";
    var diagObj = diagram.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = element.ElementID;
    diagObj.Update();
}

function addMessage(source, target, messageText, sequenceNo, isReturn) {
    var con = source.Connectors.AddNew(messageText, "Sequence");
    con.SupplierID = target.ElementID;
    con.SequenceNo = sequenceNo;
    if (isReturn) {
        con.Stereotype = "return";
    }
    con.Update();
    return con;
}

function addFragment(pkg, diagram, name, left, top, right, bottom) {
    var frag = pkg.Elements.AddNew(name, "InteractionFragment");
    frag.Stereotype = "alt";
    frag.Update();
    pkg.Elements.Refresh();

    var coords = "l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";";
    var diagObj = diagram.DiagramObjects.AddNew(coords, "");
    diagObj.ElementID = frag.ElementID;
    diagObj.Update();
    return frag;
}

function Main() {
    if (Repo == null) {
        log("Error: No se pudo conectar a Enterprise Architect.");
        return;
    }

    log("Iniciando generacion de Diagrama de Secuencia CU16...");
    var targetPkg = getTargetPackage();
    if (targetPkg == null) {
        log("Error: Paquete destino no disponible.");
        return;
    }

    // 1. Participantes BCE
    var actEncargado = getOrCreateElement(targetPkg, "Encargado", "Actor", "Actor");
    var actCliente   = getOrCreateElement(targetPkg, "Cliente", "Actor", "Actor");
    var bdrBandeja   = getOrCreateElement(targetPkg, "SaleConflictsPageComponent", "Sequence", "Interface");
    var bdrModal     = getOrCreateElement(targetPkg, "ResolveConflictModalComponent", "Sequence", "Interface");
    var ctrlRoutes   = getOrCreateElement(targetPkg, "SaleConflictRoutes", "Sequence", "Controller");
    var ctrlService  = getOrCreateElement(targetPkg, "SaleConflictService", "Sequence", "Controller");
    var entSale      = getOrCreateElement(targetPkg, "Sale", "Sequence", "Entity");
    var entItem      = getOrCreateElement(targetPkg, "SaleItem", "Sequence", "Entity");
    var entInv       = getOrCreateElement(targetPkg, "Inventory", "Sequence", "Entity");
    var entReturn    = getOrCreateElement(targetPkg, "GarmentReturn", "Sequence", "Entity");

    // 2. Crear Diagrama
    var diagram = createCleanDiagram(targetPkg, DIAGRAM_NAME);

    // 3. Colocar Líneas de Vida
    var top = -30;
    var width = 110;
    var height = 750;
    var gap = 130;
    var startLeft = 30;

    var elements = [
        actEncargado, actCliente, bdrBandeja, bdrModal,
        ctrlRoutes, ctrlService, entSale, entItem, entInv, entReturn
    ];

    for (var i = 0; i < elements.length; i++) {
        placeLifeline(diagram, elements[i], startLeft + (i * gap), top, width, height);
    }

    // 4. Mensajes Secuenciales
    var seq = 1;

    // Fase 1: Consulta de Bandeja
    addMessage(actEncargado, bdrBandeja, "1: accederBandejaConflictos()", seq++, false);
    addMessage(bdrBandeja, ctrlRoutes, "2: GET /api/sales/conflicts(branch_id)", seq++, false);
    addMessage(ctrlRoutes, ctrlService, "3: list_branch_sale_conflicts(db, branch_id, tenant_id)", seq++, false);
    addMessage(ctrlService, entSale, "4: filter(cash_reference.like('CONFLICT:%'))", seq++, false);
    addMessage(entSale, ctrlService, "5: return conflict_sales[]", seq++, true);
    addMessage(ctrlService, entInv, "6: filter(variant_id, branch_id).first()", seq++, false);
    addMessage(entInv, ctrlService, "7: return central_stock (0)", seq++, true);
    addMessage(ctrlService, ctrlRoutes, "8: return List[SaleConflictRead]", seq++, true);
    addMessage(ctrlRoutes, bdrBandeja, "9: 200 OK (conflictos, stock central)", seq++, true);
    addMessage(bdrBandeja, actEncargado, "10: mostrarTicketsConQuiebreStock()", seq++, false);

    // Fase 2: Coordinación con Cliente
    addMessage(actEncargado, bdrModal, "11: openResolutionModal(conflict)", seq++, false);
    addMessage(actEncargado, actCliente, "12: contactarYAcordarSolucion(quiebre_stock)", seq++, false);
    addMessage(actCliente, actEncargado, "13: confirmarPreferencia(via_resolucion)", seq++, false);
    addMessage(actEncargado, bdrModal, "14: submitResolution(via, nota_auditoria, new_variant_id)", seq++, false);

    // Fase 3: Llamada a Controlador REST
    addMessage(bdrModal, ctrlRoutes, "15: POST /api/sales/conflicts/{id}/resolve(payload)", seq++, false);
    addMessage(ctrlRoutes, ctrlService, "16: resolve_sale_conflict(db, sale_id, payload, manager_id)", seq++, false);

    // Fase 4: Fragmento Alternativas de Resolución
    addFragment(targetPkg, diagram, "alt [Vía 1: negative_stock / Vía 2: substitute / Vía 3: credit_note]", 500, -380, 1300, -680);

    // Vía 1: negative_stock
    addMessage(ctrlService, entInv, "17a: with_for_update() -> inv.quantity -= quantity (-1)", seq++, false);
    addMessage(ctrlService, entSale, "18a: status='completed', cash_reference='RESOLVED:NEGATIVE_STOCK'", seq++, false);

    // Vía 2: substitute
    addMessage(ctrlService, entInv, "17b: with_for_update(new_variant_id) -> inv.quantity -= 1", seq++, false);
    addMessage(ctrlService, entItem, "18b: target_item.variant_id = new_variant_id", seq++, false);
    addMessage(ctrlService, entSale, "19b: status='completed', cash_reference='RESOLVED:SUBSTITUTE'", seq++, false);

    // Vía 3: credit_note
    addMessage(ctrlService, entReturn, "17c: GarmentReturn(retention=0.00, refund=100%, NC-YYYYMMDD-XXXX)", seq++, false);
    addMessage(ctrlService, entSale, "18c: status='cancelled', cash_reference='RESOLVED:CREDIT_NOTE'", seq++, false);

    // Retorno Final y Feedback
    addMessage(ctrlService, ctrlRoutes, "20: return SaleConflictResolveResponse", seq++, true);
    addMessage(ctrlRoutes, bdrModal, "21: 200 OK (resultado, codigo_nc, mensaje)", seq++, true);
    addMessage(bdrModal, bdrBandeja, "22: toastFeedback() & closeModal() & refresh()", seq++, false);
    addMessage(bdrBandeja, actEncargado, "23: presentarBandejaConciliada()", seq++, false);

    diagram.Update();
    Repo.ReloadDiagram(diagram.DiagramID);
    log("Diagrama de Secuencia CU16 generado exitosamente. ID: " + diagram.DiagramID);
}

Main();
