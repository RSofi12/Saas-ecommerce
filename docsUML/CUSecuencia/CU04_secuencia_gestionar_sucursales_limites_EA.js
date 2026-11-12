/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU04 - Gestionar Sucursales y Validar Límites de Plan
 * ACTOR: AdministradorTenant (Actor Principal)
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU04 - Secuencia Gestionar Sucursales y Limites de Plan";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU04-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
}

function getTargetPackage() {
    if (Repo == null) return null;
    var selectedPkg = Repo.GetTreeSelectedPackage();
    if (selectedPkg != null) return selectedPkg;
    var roots = Repo.Models;
    var root = (roots.Count > 0) ? roots.GetAt(0) : null;
    if (root == null) return null;
    for (var i = 0; i < root.Packages.Count; i++) {
        var p = root.Packages.GetAt(i);
        if (p.Name == DEFAULT_PACKAGE_NAME) return p;
    }
    var newPkg = root.Packages.AddNew(DEFAULT_PACKAGE_NAME, "Package");
    newPkg.Update();
    root.Packages.Refresh();
    return newPkg;
}

function recreateDiagram(pkg) {
    for (var i = pkg.Diagrams.Count - 1; i >= 0; i--) {
        var d = pkg.Diagrams.GetAt(i);
        if (d.Name == DIAGRAM_NAME) {
            pkg.Diagrams.Delete(i);
            pkg.Diagrams.Refresh();
            break;
        }
    }
    var diagram = pkg.Diagrams.AddNew(DIAGRAM_NAME, "Sequence");
    diagram.Update();
    pkg.Diagrams.Refresh();
    return diagram;
}

function addActorParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Actor");
    el.Update();
    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-1900;", "");
    dObj.ElementID = el.ElementID;
    dObj.Update();
    return el;
}

function addParticipant(pkg, diagram, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) el.Stereotype = stereotype;
    el.Update();
    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-1850;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

function addMessage(src, dst, label, isReturn, sequenceNo) {
    var con = src.Connectors.AddNew(label, "Sequence");
    con.SupplierID = dst.ElementID;
    if (isReturn) con.Stereotype = "return";
    if (sequenceNo) {
        try { con.SequenceNo = sequenceNo; } catch (e) { }
    }
    con.Update();
    return con;
}

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
    var pkg = getTargetPackage();
    if (pkg == null) return;
    var diag = recreateDiagram(pkg);

    // 1. Participantes BCE
    var act = addActorParticipant(pkg, diag, "AdministradorTenant", 30, 80);
    var bndPage = addParticipant(pkg, diag, "AdminBranchPageComponent", "boundary", 140, 120);
    var bndSrv = addParticipant(pkg, diag, "AdminBranchService", "boundary", 280, 110);
    var ctrlRoutes = addParticipant(pkg, diag, "BranchRoutes", "control", 410, 100);
    var ctrlSvc = addParticipant(pkg, diag, "BranchService", "control", 530, 100);
    var entSub = addParticipant(pkg, diag, "Subscription", "entity", 650, 85);
    var entPlan = addParticipant(pkg, diag, "Plan", "entity", 755, 80);
    var entBranch = addParticipant(pkg, diag, "Branch", "entity", 855, 80);

    pkg.Elements.Refresh();
    diag.DiagramObjects.Refresh();

    var seq = 1;

    // FASE 1: Consulta de Cuota y Sucursales Existentes
    addMessage(act, bndPage, "1: loadData()", false, seq++);
    addMessage(bndPage, bndSrv, "1.1: getBranchQuota()", false, seq++);
    addMessage(bndSrv, ctrlRoutes, "1.2: get_branch_quota_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "1.3: get_branch_quota()", false, seq++);
    addMessage(ctrlSvc, entSub, "1.4: query()", false, seq++);
    addMessage(ctrlSvc, entPlan, "1.5: query()", false, seq++);
    addMessage(ctrlSvc, entBranch, "1.6: query()", false, seq++);
    addMessage(ctrlRoutes, bndSrv, "1.7: response()", true, seq++);
    addMessage(bndPage, bndSrv, "1.8: listBranches()", false, seq++);
    addMessage(bndSrv, ctrlRoutes, "1.9: list_branches_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "1.10: get_branches()", false, seq++);
    addMessage(ctrlSvc, entBranch, "1.11: query()", false, seq++);
    addMessage(ctrlRoutes, bndSrv, "1.12: response()", true, seq++);
    addMessage(bndSrv, bndPage, "1.13: setQuotaAndBranches()", true, seq++);
    addMessage(bndPage, act, "1.14: renderizarPanelSucursales()", false, seq++);

    // FASE 2: Formulario de Sucursal y Validación de Límites de Plan
    addMessage(act, bndPage, "2: submitNuevaSucursal()", false, seq++);
    addMessage(bndPage, bndSrv, "2.1: createBranch()", false, seq++);
    addMessage(bndSrv, ctrlRoutes, "2.2: create_branch_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "2.3: create_branch()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "2.4: validate_branch_quota()", false, seq++);
    addMessage(ctrlSvc, entBranch, "2.5: query()", false, seq++);
    addMessage(ctrlSvc, entPlan, "2.6: query()", false, seq++);

    // FRAGMENTO COMBINADO ALT: [Sucursales activas < max_branches vs Límite alcanzado]
    addCombinedFragment(pkg, diag, "alt", "[Sucursales activas < max_branches: Cupo disponible]", 500, 950, -1000, -1450);

    // Rama Exitosa: Registro y Confirmación
    addMessage(ctrlSvc, entBranch, "2.7a: create()", false, seq++);
    addMessage(ctrlRoutes, bndSrv, "2.8a: response()", true, seq++);
    addMessage(bndSrv, bndPage, "2.9a: 201 Created", true, seq++);
    addMessage(bndPage, bndPage, "2.10a: loadData()", false, seq++);
    addMessage(bndPage, act, "2.11a: mostrarToastExito()", false, seq++);

    // Rama Rechazo por Cuota Copada
    addCombinedFragment(pkg, diag, "alt", "[else: Sucursales activas >= max_branches (Cuota copada 400)]", 390, 640, -1500, -1720);
    addMessage(ctrlSvc, ctrlRoutes, "2.7b: raise_quota_exceeded()", true, seq++);
    addMessage(ctrlRoutes, bndSrv, "2.8b: 400 Bad Request", true, seq++);
    addMessage(bndSrv, bndPage, "2.9b: showError()", true, seq++);
    addMessage(bndPage, act, "2.10b: showErrorToast()", false, seq++);

    // Extender líneas de vida
    stretchLifeline(diag, act, -1850);
    stretchLifeline(diag, bndPage, -1850);
    stretchLifeline(diag, bndSrv, -1850);
    stretchLifeline(diag, ctrlRoutes, -1850);
    stretchLifeline(diag, ctrlSvc, -1850);
    stretchLifeline(diag, entSub, -1850);
    stretchLifeline(diag, entPlan, -1850);
    stretchLifeline(diag, entBranch, -1850);

    diag.Update();
    Repo.SaveDiagram(diag.DiagramID);
    Repo.ReloadDiagram(diag.DiagramID);
    try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }

    log("¡Diagrama de Secuencia CU04 actualizado exitosamente en Enterprise Architect!");
}

Main();
