// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU03 - Iniciar Sesión Multitenant
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla Canónica BCE):
//   Actor: «Actor»
//   Boundary: Type = "Object", Stereotype = "boundary" (Icono circular |O)
//   Control:  Type = "Object", Stereotype = "control"  (Icono circular ((↺)))
//   Entity:   Type = "Object", Stereotype = "entity"   (Icono circular ( )_)
//
// Reglas Metodológicas Estrictas:
//   - Todas las funciones se expresan con paréntesis vacíos () sin parámetros internos.
//   - Cero bucles o validaciones sobre Fronteras (las validaciones residen en Controllers).
// ============================================================================

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch(e) {
        // En entorno EA interno Repository ya está activo
    }
}

function Log(msg) {
    try { Session.Output("[FashionStore-EA] " + msg); } catch(e) { try { WScript.Echo(msg); } catch(ex) {} }
}

function crearElementoConEsterotipo(pkg, name, tipo, estereotipo) {
    for (var i = pkg.Elements.Count - 1; i >= 0; i--) {
        var el = pkg.Elements.GetAt(i);
        if (el.Name == name) {
            if (el.Type == tipo) {
                if (estereotipo && el.Stereotype != estereotipo) {
                    el.Stereotype = estereotipo;
                    el.Update();
                }
                return el;
            } else {
                pkg.Elements.Delete(i);
                pkg.Elements.Refresh();
                break;
            }
        }
    }
    var newEl = pkg.Elements.AddNew(name, tipo);
    if (estereotipo && estereotipo.length > 0) {
        newEl.Stereotype = estereotipo;
    }
    newEl.Update();
    pkg.Elements.Refresh();
    return newEl;
}

function crearDiagramaLimpio(pkg, name, tipo) {
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
    var newDiag = pkg.Diagrams.AddNew(name, tipo);
    newDiag.Update();
    pkg.Diagrams.Refresh();
    return newDiag;
}

function colocarElemento(diagram, elemento, left, right, top, bottom) {
    var diagObj = diagram.DiagramObjects.AddNew("l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";", "");
    diagObj.ElementID = elemento.ElementID;
    diagObj.Update();
}

function crearMensaje(origen, destino, texto) {
    var con = origen.Connectors.AddNew(texto, "Association");
    con.SupplierID = destino.ElementID;
    con.Name = texto;
    con.Direction = "Source -> Destination";
    con.Update();
    return con;
}

function Main() {
    if (Repo == null) {
        Log("Error: No se pudo conectar a Enterprise Architect.");
        return;
    }

    Log("Generando Diagrama de Comunicación / Robustez CU03 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX Canónicos (Type = 'Object')
    var actUsuario = crearElementoConEsterotipo(pkg, "Usuario", "Actor", "");
    var bndLogin = crearElementoConEsterotipo(pkg, "LoginPageComponent", "Object", "boundary");
    var bndSession = crearElementoConEsterotipo(pkg, "SessionService", "Object", "boundary");
    var bndApi = crearElementoConEsterotipo(pkg, "AuthApiService", "Object", "boundary");
    var ctrlRoutes = crearElementoConEsterotipo(pkg, "AuthRoutes", "Object", "control");
    var ctrlSec = crearElementoConEsterotipo(pkg, "AuthSecurity", "Object", "control");
    var entUser = crearElementoConEsterotipo(pkg, "User", "Object", "entity");
    var entComp = crearElementoConEsterotipo(pkg, "Company", "Object", "entity");
    var entJwt = crearElementoConEsterotipo(pkg, "JwtToken", "Object", "entity");

    // 2. Crear Diagrama de Comunicación / Robustez
    var diagName = "CU03 - Robustez Iniciar Sesion Multitenant";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Distribución espacial horizontal y equilibrada (Iconos circulares de 80x80)
    colocarElemento(diagram, actUsuario, 40, 120, -180, -260);
    colocarElemento(diagram, bndLogin, 180, 260, -180, -260);
    colocarElemento(diagram, bndSession, 180, 260, -320, -400);
    colocarElemento(diagram, bndApi, 360, 440, -180, -260);
    colocarElemento(diagram, ctrlRoutes, 540, 620, -180, -260);
    colocarElemento(diagram, ctrlSec, 720, 800, -280, -360);
    colocarElemento(diagram, entUser, 900, 980, -100, -180);
    colocarElemento(diagram, entComp, 900, 980, -200, -280);
    colocarElemento(diagram, entJwt, 900, 980, -300, -380);

    // 4. Mensajes individuales limpios (Sin parámetros y con validaciones en Control)
    crearMensaje(actUsuario, bndLogin, "1: selectActor()");
    crearMensaje(bndLogin, bndLogin, "1.1: normalizeEmailInput()");
    crearMensaje(actUsuario, bndLogin, "1.2: submit()");
    crearMensaje(bndLogin, bndSession, "1.3: login()");
    crearMensaje(bndSession, bndApi, "1.4: login()");
    crearMensaje(bndApi, ctrlRoutes, "1.5: login()");
    crearMensaje(ctrlRoutes, entUser, "1.6: query()");
    crearMensaje(ctrlRoutes, ctrlSec, "1.7: verify_password()");
    crearMensaje(ctrlRoutes, entComp, "1.8: query()");
    crearMensaje(ctrlRoutes, ctrlSec, "1.9: create_access_token()");
    crearMensaje(ctrlSec, entJwt, "1.9.1: create()");
    crearMensaje(ctrlRoutes, bndApi, "1.10: response()");
    crearMensaje(bndSession, bndSession, "1.11: setSession()");
    crearMensaje(bndSession, bndLogin, "1.12: navigateByUrl()");
    crearMensaje(actUsuario, bndLogin, "2: submit()");
    crearMensaje(bndLogin, bndSession, "2.1: login()");
    crearMensaje(bndSession, bndApi, "2.2: login()");
    crearMensaje(bndApi, ctrlRoutes, "2.3: login()");
    crearMensaje(ctrlRoutes, ctrlSec, "2.4: verify_password()");
    crearMensaje(ctrlRoutes, bndApi, "2.5: raise_http_exception()");
    crearMensaje(bndLogin, actUsuario, "2.6: showErrorToast()");
    crearMensaje(actUsuario, bndLogin, "3: submit()");
    crearMensaje(bndLogin, bndSession, "3.1: login()");
    crearMensaje(bndSession, bndApi, "3.2: login()");
    crearMensaje(bndApi, ctrlRoutes, "3.3: login()");
    crearMensaje(ctrlRoutes, entComp, "3.4: query()");
    crearMensaje(ctrlRoutes, bndApi, "3.5: raise_http_exception()");
    crearMensaje(bndLogin, actUsuario, "3.6: showErrorToast()");
    crearMensaje(actUsuario, bndLogin, "4: submit()");
    crearMensaje(bndLogin, bndSession, "4.1: login()");
    crearMensaje(bndSession, bndApi, "4.2: login()");
    crearMensaje(bndApi, ctrlRoutes, "4.3: login()");
    crearMensaje(ctrlRoutes, entUser, "4.4: query()");
    crearMensaje(ctrlRoutes, bndApi, "4.5: raise_http_exception()");
    crearMensaje(bndLogin, actUsuario, "4.6: showErrorToast()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch(ex) {}

    Log("¡Diagrama de Robustez / Comunicación CU03 generado exitosamente en Enterprise Architect!");
}

Main();
