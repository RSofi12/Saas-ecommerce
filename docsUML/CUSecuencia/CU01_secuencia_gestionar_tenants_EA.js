/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU01 - Registrar y Gestionar Empresas (Tenants)
 * ACTOR: Superadmin (Actor Principal)
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU01 - Secuencia Registrar y Gestionar Empresas Tenants";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU01-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
    var bndModal = addParticipant(pkg, diag, "TenantFormModalComponent", "boundary", 270, 120);
    var bndSrv = addParticipant(pkg, diag, "CompanyService", "boundary", 410, 110);
    var ctrlRoutes = addParticipant(pkg, diag, "CompanyRoutes", "control", 540, 100);
    var ctrlSvc = addParticipant(pkg, diag, "TenantService", "control", 660, 100);
    var entComp = addParticipant(pkg, diag, "Company", "entity", 780, 80);
    var entPlan = addParticipant(pkg, diag, "Plan", "entity", 880, 80);
    var entSub = addParticipant(pkg, diag, "Subscription", "entity", 980, 85);
    var entUser = addParticipant(pkg, diag, "User", "entity", 1085, 80);

    pkg.Elements.Refresh();
    diag.DiagramObjects.Refresh();

    var seq = 1;

    // FASE 1: Consulta Inicial y Listado de Empresas
    addMessage(act, bndPage, "1: accederGestionTenants()", false, seq++);
    addMessage(bndPage, bndSrv, "1.1: listCompanies()", false, seq++);
    addMessage(bndSrv, ctrlRoutes, "1.2: get_all_companies()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "1.3: list_companies()", false, seq++);
    addMessage(ctrlSvc, entComp, "1.4: query()", false, seq++);
    addMessage(ctrlSvc, ctrlRoutes, "1.5: response()", true, seq++);
    addMessage(ctrlRoutes, bndSrv, "1.6: response()", true, seq++);
    addMessage(bndSrv, bndPage, "1.7: setCompanies()", true, seq++);
    addMessage(bndPage, act, "1.8: renderizarGrillaTenants()", false, seq++);

    // FASE 2: Apertura de Formulario y Solicitud de Registro
    addMessage(act, bndPage, "2: abrirModalNuevoTenant()", false, seq++);
    addMessage(bndPage, bndModal, "2.1: renderizarFormulario()", false, seq++);
    addMessage(act, bndModal, "2.2: ingresarDatosEmpresaYPlan()", false, seq++);
    addMessage(bndModal, bndSrv, "2.3: registerCompany()", false, seq++);
    addMessage(bndSrv, ctrlRoutes, "2.4: register_company()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "2.5: create_tenant()", false, seq++);
    addMessage(ctrlSvc, entComp, "2.6: query()", false, seq++);

    // FRAGMENTO COMBINADO ALT: [Unicidad de Slug y NIT Válida vs Conflicto Duplicado]
    addCombinedFragment(pkg, diag, "alt", "[Slug y NIT únicos: Registro Exitoso]", 630, 1180, -980, -1450);

    // Rama Exitosa: Creación de Company, Plan inicial, Subscription y Admin User
    addMessage(ctrlSvc, entComp, "2.7a: create()", false, seq++);
    addMessage(ctrlSvc, entPlan, "2.8a: query()", false, seq++);
    addMessage(ctrlSvc, entSub, "2.9a: create()", false, seq++);
    addMessage(ctrlSvc, entUser, "2.10a: create()", false, seq++);
    addMessage(ctrlSvc, ctrlRoutes, "2.11a: response()", true, seq++);
    addMessage(ctrlRoutes, bndSrv, "2.12a: 201 Created", true, seq++);
    addMessage(bndSrv, bndModal, "2.13a: response()", true, seq++);
    addMessage(bndModal, bndPage, "2.14a: refrescarLista()", false, seq++);
    addMessage(bndPage, act, "2.15a: mostrarToastExito()", false, seq++);

    // Rama Alternativa: Subdominio o NIT ya registrado
    addCombinedFragment(pkg, diag, "alt", "[else: Subdominio o NIT ya registrado]", 510, 770, -1500, -1720);
    addMessage(ctrlSvc, ctrlRoutes, "2.7b: raise_http_exception()", true, seq++);
    addMessage(ctrlRoutes, bndSrv, "2.8b: 400 Bad Request", true, seq++);
    addMessage(bndSrv, bndModal, "2.9b: showError()", true, seq++);
    addMessage(bndModal, act, "2.10b: mostrarErrorDuplicado()", false, seq++);

    // Extender líneas de vida
    stretchLifeline(diag, act, -1850);
    stretchLifeline(diag, bndPage, -1850);
    stretchLifeline(diag, bndModal, -1850);
    stretchLifeline(diag, bndSrv, -1850);
    stretchLifeline(diag, ctrlRoutes, -1850);
    stretchLifeline(diag, ctrlSvc, -1850);
    stretchLifeline(diag, entComp, -1850);
    stretchLifeline(diag, entPlan, -1850);
    stretchLifeline(diag, entSub, -1850);
    stretchLifeline(diag, entUser, -1850);

    diag.Update();
    Repo.SaveDiagram(diag.DiagramID);
    Repo.ReloadDiagram(diag.DiagramID);
    try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }

    log("¡Diagrama de Secuencia CU01 generado exitosamente en Enterprise Architect!");
}

Main();
