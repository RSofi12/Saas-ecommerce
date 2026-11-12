/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU02 - Gestionar Planes de Suscripción y Cuotas Comerciales
 * ACTOR: Superadmin (Actor Principal)
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU02 - Secuencia Gestionar Planes de Suscripción y Cuotas";

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
    var act = addActorParticipant(pkg, diag, "Superadmin", 30, 80);
    var bndPage = addParticipant(pkg, diag, "TenantsPageComponent", "boundary", 140, 110);
    var bndModal = addParticipant(pkg, diag, "SubscriptionModalComponent", "boundary", 270, 120);
    var bndSrv = addParticipant(pkg, diag, "CompanyService", "boundary", 410, 110);
    var ctrlPlanR = addParticipant(pkg, diag, "PlanRoutes", "control", 540, 100);
    var ctrlSubR = addParticipant(pkg, diag, "SubscriptionRoutes", "control", 660, 110);
    var ctrlQuota = addParticipant(pkg, diag, "QuotaService", "control", 790, 100);
    var entPlan = addParticipant(pkg, diag, "Plan", "entity", 910, 80);
    var entSub = addParticipant(pkg, diag, "Subscription", "entity", 1010, 85);
    var entBranch = addParticipant(pkg, diag, "Branch", "entity", 1115, 80);

    pkg.Elements.Refresh();
    diag.DiagramObjects.Refresh();

    var seq = 1;

    // FASE 1: Consulta de Planes y Suscripción Activa
    addMessage(act, bndPage, "1: openSubscriptionModal()", false, seq++);
    addMessage(bndPage, bndModal, "1.1: loadData()", false, seq++);
    addMessage(bndModal, bndSrv, "1.2: getPlans()", false, seq++);
    addMessage(bndSrv, ctrlPlanR, "1.3: list_plans()", false, seq++);
    addMessage(ctrlPlanR, entPlan, "1.4: query()", false, seq++);
    addMessage(ctrlPlanR, bndSrv, "1.5: response()", true, seq++);
    addMessage(bndModal, bndSrv, "1.6: getCompanySubscription()", false, seq++);
    addMessage(bndSrv, ctrlSubR, "1.7: get_company_subscription()", false, seq++);
    addMessage(ctrlSubR, ctrlQuota, "1.8: get_active_subscription()", false, seq++);
    addMessage(ctrlQuota, entSub, "1.9: query()", false, seq++);
    addMessage(ctrlSubR, bndSrv, "1.10: response()", true, seq++);
    addMessage(bndSrv, bndModal, "1.11: setPlansAndCurrentSubscription()", true, seq++);
    addMessage(bndModal, act, "1.12: renderizarModalConPlanes()", false, seq++);

    // FASE 2: Selección y Asignación de Plan
    addMessage(act, bndModal, "2: onSubmit()", false, seq++);
    addMessage(bndModal, bndSrv, "2.1: assignSubscription()", false, seq++);
    addMessage(bndSrv, ctrlSubR, "2.2: assign_subscription()", false, seq++);
    addMessage(ctrlSubR, ctrlQuota, "2.3: validate_branch_quota()", false, seq++);
    addMessage(ctrlQuota, entBranch, "2.4: query()", false, seq++);
    addMessage(ctrlQuota, entPlan, "2.5: query()", false, seq++);

    // FRAGMENTO COMBINADO ALT: [Sucursales <= Límite Nuevo Plan vs Exceso de Sucursales]
    addCombinedFragment(pkg, diag, "alt", "[Sucursales activas <= max_branches: Asignación Aprobada]", 630, 1180, -980, -1450);

    // Rama Exitosa: Actualizar previa, crear nueva activa y confirmar
    addMessage(ctrlSubR, entSub, "2.6a: update()", false, seq++);
    addMessage(ctrlSubR, entSub, "2.7a: create()", false, seq++);
    addMessage(ctrlSubR, ctrlSubR, "2.8a: sync_tenant_limits()", false, seq++);
    addMessage(ctrlSubR, bndSrv, "2.9a: response()", true, seq++);
    addMessage(bndSrv, bndModal, "2.10a: 200 OK", true, seq++);
    addMessage(bndModal, bndPage, "2.11a: onSubscriptionUpdated()", false, seq++);
    addMessage(bndPage, act, "2.12a: mostrarToastExito()", false, seq++);

    // Rama Rechazo por Downgrade Guard
    addCombinedFragment(pkg, diag, "alt", "[else: Sucursales activas > max_branches (Rechazo Downgrade)]", 510, 780, -1500, -1720);
    addMessage(ctrlQuota, ctrlSubR, "2.6b: raise_quota_exceeded()", true, seq++);
    addMessage(ctrlSubR, bndSrv, "2.7b: 400 Bad Request", true, seq++);
    addMessage(bndSrv, bndModal, "2.8b: showError()", true, seq++);
    addMessage(bndModal, act, "2.9b: showErrorToast()", false, seq++);

    // Extender líneas de vida
    stretchLifeline(diag, act, -1850);
    stretchLifeline(diag, bndPage, -1850);
    stretchLifeline(diag, bndModal, -1850);
    stretchLifeline(diag, bndSrv, -1850);
    stretchLifeline(diag, ctrlPlanR, -1850);
    stretchLifeline(diag, ctrlSubR, -1850);
    stretchLifeline(diag, ctrlQuota, -1850);
    stretchLifeline(diag, entPlan, -1850);
    stretchLifeline(diag, entSub, -1850);
    stretchLifeline(diag, entBranch, -1850);

    diag.Update();
    Repo.SaveDiagram(diag.DiagramID);
    Repo.ReloadDiagram(diag.DiagramID);
    try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }

    log("¡Diagrama de Secuencia CU02 actualizado exitosamente en Enterprise Architect!");
}

Main();
