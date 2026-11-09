/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU03 - Iniciar Sesión Multitenant
 * ACTOR: Usuario
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU03 - Iniciar Sesion Multitenant";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU03-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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

    var act = addActorParticipant(pkg, diag, "Usuario", 30, 80);
    var bndLogin = addParticipant(pkg, diag, "LoginPageComponent", "boundary", 140, 110);
    var bndSession = addParticipant(pkg, diag, "SessionService", "boundary", 270, 110);
    var bndApi = addParticipant(pkg, diag, "AuthApiService", "boundary", 400, 110);
    var ctrlRoutes = addParticipant(pkg, diag, "AuthRoutes", "control", 530, 100);
    var ctrlSec = addParticipant(pkg, diag, "AuthSecurity", "control", 650, 100);
    var entUser = addParticipant(pkg, diag, "User", "entity", 770, 80);
    var entComp = addParticipant(pkg, diag, "Company", "entity", 870, 80);
    var entJwt = addParticipant(pkg, diag, "JwtToken", "entity", 970, 80);

    var seq = 1;
    // Secuencia 1: Login Exitoso
    addMessage(act, bndLogin, "selectActor()", false, seq++);
    addMessage(bndLogin, bndLogin, "normalizeEmailInput()", false, seq++);
    addMessage(act, bndLogin, "submit()", false, seq++);
    addMessage(bndLogin, bndSession, "login()", false, seq++);
    addMessage(bndSession, bndApi, "login()", false, seq++);
    addMessage(bndApi, ctrlRoutes, "login()", false, seq++);
    addMessage(ctrlRoutes, entUser, "query()", false, seq++);
    addMessage(entUser, ctrlRoutes, "user", true, seq++);
    addMessage(ctrlRoutes, ctrlSec, "verify_password()", false, seq++);
    addMessage(ctrlSec, ctrlRoutes, "true", true, seq++);
    addMessage(ctrlRoutes, entComp, "query()", false, seq++);
    addMessage(entComp, ctrlRoutes, "company", true, seq++);
    addMessage(ctrlRoutes, ctrlSec, "create_access_token()", false, seq++);
    addMessage(ctrlSec, entJwt, "create()", false, seq++);
    addMessage(ctrlRoutes, bndApi, "response()", true, seq++);
    addMessage(bndApi, bndSession, "token_payload", true, seq++);
    addMessage(bndSession, bndSession, "setSession()", false, seq++);
    addMessage(bndSession, bndLogin, "navigateByUrl()", false, seq++);

    // Secuencia 2: Credenciales Invalidas
    addMessage(act, bndLogin, "submit()", false, seq++);
    addMessage(bndLogin, bndSession, "login()", false, seq++);
    addMessage(bndSession, bndApi, "login()", false, seq++);
    addMessage(bndApi, ctrlRoutes, "login()", false, seq++);
    addMessage(ctrlRoutes, ctrlSec, "verify_password()", false, seq++);
    addMessage(ctrlSec, ctrlRoutes, "false", true, seq++);
    addMessage(ctrlRoutes, bndApi, "raise_http_exception()", true, seq++);
    addMessage(bndApi, bndLogin, "error_401", true, seq++);
    addMessage(bndLogin, act, "showErrorToast()", false, seq++);

    diag.Update();
    log("Diagrama de Secuencia CU03 generado.");
}
Main();
