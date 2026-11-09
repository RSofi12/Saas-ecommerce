/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU04 - Gestionar Sucursales y Validar Límites de Plan
 * ACTOR: AdministradorTenant
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU04 - Gestionar Sucursales y Limites de Plan";

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
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-1800;", "");
    dObj.ElementID = el.ElementID;
    dObj.Update();
    return el;
}

function addParticipant(pkg, diagram, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) el.Stereotype = stereotype;
    el.Update();
    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-1700;", "");
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

function Main() {
    var pkg = getTargetPackage();
    if (pkg == null) return;
    var diag = recreateDiagram(pkg);

    var act = addActorParticipant(pkg, diag, "AdministradorTenant", 30, 90);
    var bndPage = addParticipant(pkg, diag, "AdminBranchPageComponent", "boundary", 150, 120);
    var bndSrv = addParticipant(pkg, diag, "AdminBranchService", "boundary", 290, 110);
    var ctrlRoutes = addParticipant(pkg, diag, "BranchRoutes", "control", 420, 100);
    var ctrlSvc = addParticipant(pkg, diag, "BranchService", "control", 540, 100);
    var entBranch = addParticipant(pkg, diag, "Branch", "entity", 660, 80);
    var entSub = addParticipant(pkg, diag, "Subscription", "entity", 760, 80);
    var entPlan = addParticipant(pkg, diag, "Plan", "entity", 860, 80);

    var seq = 1;
    // Secuencia 1: Consulta y Cuota
    addMessage(act, bndPage, "loadData()", false, seq++);
    addMessage(bndPage, bndSrv, "getBranchQuota()", false, seq++);
    addMessage(bndPage, bndSrv, "listBranches()", false, seq++);
    addMessage(bndSrv, ctrlRoutes, "get_branch_quota_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "get_branch_quota()", false, seq++);
    addMessage(ctrlSvc, entSub, "query()", false, seq++);
    addMessage(ctrlSvc, entPlan, "query()", false, seq++);
    addMessage(ctrlSvc, entBranch, "query()", false, seq++);
    addMessage(bndSrv, ctrlRoutes, "list_branches_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "get_branches()", false, seq++);
    addMessage(ctrlSvc, entBranch, "query()", false, seq++);
    addMessage(bndSrv, bndPage, "setBranches()", true, seq++);

    // Secuencia 2: Creación Exitosa
    addMessage(act, bndPage, "openModal()", false, seq++);
    addMessage(act, bndPage, "submit()", false, seq++);
    addMessage(bndPage, bndSrv, "createBranch()", false, seq++);
    addMessage(bndSrv, ctrlRoutes, "create_branch_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "create_branch()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "validate_branch_quota()", false, seq++);
    addMessage(ctrlSvc, entBranch, "create()", false, seq++);
    addMessage(ctrlRoutes, bndSrv, "response()", true, seq++);
    addMessage(bndPage, bndPage, "loadData()", false, seq++);

    // Secuencia 3: Rechazo Cuota Excedida
    addMessage(act, bndPage, "submit()", false, seq++);
    addMessage(bndPage, bndSrv, "createBranch()", false, seq++);
    addMessage(bndSrv, ctrlRoutes, "create_branch_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "validate_branch_quota()", false, seq++);
    addMessage(ctrlRoutes, bndSrv, "raise_http_exception()", true, seq++);
    addMessage(bndPage, act, "showErrorToast()", false, seq++);

    diag.Update();
    log("Diagrama de Secuencia CU04 generado.");
}
Main();
