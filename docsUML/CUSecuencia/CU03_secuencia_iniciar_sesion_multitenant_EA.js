/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU03 - Iniciar Sesión Multitenant con JWT y Claims de Tenant
 * ACTOR: Usuario (Actor Principal)
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU03 - Secuencia Iniciar Sesión Multitenant JWT";

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
    var act = addActorParticipant(pkg, diag, "Usuario", 30, 80);
    var bndLogin = addParticipant(pkg, diag, "LoginPageComponent", "boundary", 140, 110);
    var bndSession = addParticipant(pkg, diag, "SessionService", "boundary", 270, 110);
    var bndApi = addParticipant(pkg, diag, "AuthApiService", "boundary", 400, 110);
    var ctrlRoutes = addParticipant(pkg, diag, "AuthRoutes", "control", 530, 100);
    var ctrlSec = addParticipant(pkg, diag, "AuthSecurity", "control", 650, 100);
    var entUser = addParticipant(pkg, diag, "User", "entity", 770, 80);
    var entComp = addParticipant(pkg, diag, "Company", "entity", 870, 80);
    var entJwt = addParticipant(pkg, diag, "JwtToken", "entity", 970, 80);

    pkg.Elements.Refresh();
    diag.DiagramObjects.Refresh();

    var seq = 1;

    // FASE 1: Selección de Actor y Envío de Credenciales
    addMessage(act, bndLogin, "1: selectActor()", false, seq++);
    addMessage(bndLogin, bndLogin, "1.1: normalizeEmailInput()", false, seq++);
    addMessage(act, bndLogin, "1.2: submitLogin()", false, seq++);
    addMessage(bndLogin, bndSession, "1.3: login()", false, seq++);
    addMessage(bndSession, bndApi, "1.4: login()", false, seq++);
    addMessage(bndApi, ctrlRoutes, "1.5: login_route()", false, seq++);
    addMessage(ctrlRoutes, entUser, "1.6: query()", false, seq++);
    addMessage(ctrlRoutes, ctrlSec, "1.7: verify_password()", false, seq++);

    // FRAGMENTO COMBINADO ALT: [Autenticación Exitosa vs Credenciales Inválidas vs Empresa Suspendida]
    addCombinedFragment(pkg, diag, "alt", "[Credenciales válidas y Empresa activa: Login Exitoso]", 500, 1030, -780, -1250);

    // Rama Exitosa: Verificación de Empresa, Generación de Claims y Token JWT
    addMessage(ctrlRoutes, entComp, "1.8a: query()", false, seq++);
    addMessage(ctrlRoutes, ctrlSec, "1.9a: create_access_token()", false, seq++);
    addMessage(ctrlSec, entJwt, "1.10a: create()", false, seq++);
    addMessage(ctrlRoutes, bndApi, "1.11a: response()", true, seq++);
    addMessage(bndApi, bndSession, "1.12a: token_payload", true, seq++);
    addMessage(bndSession, bndSession, "1.13a: setSession()", false, seq++);
    addMessage(bndSession, bndLogin, "1.14a: navigateByUrl()", false, seq++);

    // Rama Fallo 1: Credenciales Inválidas (Password Incorrecto o Usuario No Existe)
    addCombinedFragment(pkg, diag, "alt", "[else: Credenciales inválidas (401 Unauthorized)]", 380, 680, -1300, -1500);
    addMessage(ctrlRoutes, bndApi, "1.8b: raise_http_exception()", true, seq++);
    addMessage(bndApi, bndLogin, "1.9b: error_401", true, seq++);
    addMessage(bndLogin, act, "1.10b: showErrorToast()", false, seq++);

    // Rama Fallo 2: Empresa Suspendida por Mora
    addCombinedFragment(pkg, diag, "alt", "[else: Empresa suspendida por mora (403 Forbidden)]", 380, 680, -1550, -1750);
    addMessage(ctrlRoutes, bndApi, "1.8c: raise_http_exception()", true, seq++);
    addMessage(bndApi, bndLogin, "1.9c: error_403", true, seq++);
    addMessage(bndLogin, act, "1.10c: showErrorToast()", false, seq++);

    // Extender líneas de vida
    stretchLifeline(diag, act, -1850);
    stretchLifeline(diag, bndLogin, -1850);
    stretchLifeline(diag, bndSession, -1850);
    stretchLifeline(diag, bndApi, -1850);
    stretchLifeline(diag, ctrlRoutes, -1850);
    stretchLifeline(diag, ctrlSec, -1850);
    stretchLifeline(diag, entUser, -1850);
    stretchLifeline(diag, entComp, -1850);
    stretchLifeline(diag, entJwt, -1850);

    diag.Update();
    Repo.SaveDiagram(diag.DiagramID);
    Repo.ReloadDiagram(diag.DiagramID);
    try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }

    log("¡Diagrama de Secuencia CU03 actualizado exitosamente en Enterprise Architect!");
}

Main();
