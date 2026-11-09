/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU02 - Gestionar Planes de Suscripción y Límites
 * ACTOR: Superadmin
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU02 - Gestionar Planes de Suscripcion y Limites";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU02-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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

    var act = addActorParticipant(pkg, diag, "Superadmin", 30, 80);
    var bndPage = addParticipant(pkg, diag, "TenantsPageComponent", "boundary", 140, 110);
    var bndModal = addParticipant(pkg, diag, "SubscriptionModalComponent", "boundary", 270, 130);
    var bndSrv = addParticipant(pkg, diag, "CompanyService", "boundary", 420, 110);
    var ctrlPlanR = addParticipant(pkg, diag, "PlanRoutes", "control", 550, 100);
    var ctrlSubR = addParticipant(pkg, diag, "SubscriptionRoutes", "control", 670, 110);
    var ctrlQuota = addParticipant(pkg, diag, "QuotaService", "control", 800, 100);
    var entPlan = addParticipant(pkg, diag, "Plan", "entity", 920, 80);
    var entSub = addParticipant(pkg, diag, "Subscription", "entity", 1020, 90);
    var entBranch = addParticipant(pkg, diag, "Branch", "entity", 1130, 80);

    var seq = 1;
    // Secuencia 1: Consulta
    addMessage(act, bndPage, "openSubscriptionModal()", false, seq++);
    addMessage(bndPage, bndModal, "loadData()", false, seq++);
    addMessage(bndModal, bndSrv, "getPlans()", false, seq++);
    addMessage(bndSrv, ctrlPlanR, "list_plans()", false, seq++);
    addMessage(ctrlPlanR, entPlan, "query()", false, seq++);
    addMessage(entPlan, ctrlPlanR, "planes", true, seq++);
    addMessage(ctrlPlanR, bndSrv, "response()", true, seq++);
    addMessage(bndModal, bndSrv, "getCompanySubscription()", false, seq++);
    addMessage(bndSrv, ctrlSubR, "get_company_subscription()", false, seq++);
    addMessage(ctrlSubR, ctrlQuota, "get_active_subscription()", false, seq++);
    addMessage(ctrlQuota, entSub, "query()", false, seq++);
    addMessage(entSub, ctrlQuota, "suscripcion", true, seq++);
    addMessage(ctrlSubR, bndSrv, "response()", true, seq++);

    // Secuencia 2: Asignacion Exitosa
    addMessage(act, bndModal, "onSubmit()", false, seq++);
    addMessage(bndModal, bndSrv, "assignSubscription()", false, seq++);
    addMessage(bndSrv, ctrlSubR, "assign_subscription()", false, seq++);
    addMessage(ctrlSubR, ctrlQuota, "validate_branch_quota()", false, seq++);
    addMessage(ctrlQuota, ctrlQuota, "validate_branch_quota()", false, seq++);
    addMessage(ctrlQuota, entBranch, "query()", false, seq++);
    addMessage(ctrlSubR, entSub, "update()", false, seq++);
    addMessage(ctrlSubR, entSub, "create()", false, seq++);
    addMessage(ctrlSubR, bndSrv, "response()", true, seq++);
    addMessage(bndModal, bndPage, "onSubscriptionUpdated()", false, seq++);

    // Secuencia 3: Rechazo Downgrade
    addMessage(act, bndModal, "onSubmit()", false, seq++);
    addMessage(bndModal, bndSrv, "assignSubscription()", false, seq++);
    addMessage(bndSrv, ctrlSubR, "assign_subscription()", false, seq++);
    addMessage(ctrlSubR, ctrlQuota, "validate_branch_quota()", false, seq++);
    addMessage(ctrlSubR, bndSrv, "raise_http_exception()", true, seq++);
    addMessage(bndModal, act, "showErrorToast()", false, seq++);

    diag.Update();
    log("Diagrama de Secuencia CU02 generado.");
}
Main();
