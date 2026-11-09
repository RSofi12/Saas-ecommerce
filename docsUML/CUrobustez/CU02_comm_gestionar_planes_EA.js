// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU02 - Gestionar Planes de Suscripción y Límites
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

    Log("Generando Diagrama de Comunicación / Robustez CU02 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX Canónicos (Type = 'Object')
    var actSuperadmin = crearElementoConEsterotipo(pkg, "Superadmin", "Actor", "");
    var bndPage = crearElementoConEsterotipo(pkg, "TenantsPageComponent", "Object", "boundary");
    var bndModal = crearElementoConEsterotipo(pkg, "SubscriptionModalComponent", "Object", "boundary");
    var bndSrv = crearElementoConEsterotipo(pkg, "CompanyService", "Object", "boundary");
    var ctrlPlanRoutes = crearElementoConEsterotipo(pkg, "PlanRoutes", "Object", "control");
    var ctrlSubRoutes = crearElementoConEsterotipo(pkg, "SubscriptionRoutes", "Object", "control");
    var ctrlQuota = crearElementoConEsterotipo(pkg, "QuotaService", "Object", "control");
    var entComp = crearElementoConEsterotipo(pkg, "Company", "Object", "entity");
    var entPlan = crearElementoConEsterotipo(pkg, "Plan", "Object", "entity");
    var entSub = crearElementoConEsterotipo(pkg, "Subscription", "Object", "entity");
    var entBranch = crearElementoConEsterotipo(pkg, "Branch", "Object", "entity");

    // 2. Crear Diagrama de Comunicación / Robustez
    var diagName = "CU02 - Robustez Gestionar Planes y Limites";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Distribución espacial horizontal y equilibrada (Iconos circulares de 80x80)
    colocarElemento(diagram, actSuperadmin, 40, 120, -180, -260);
    colocarElemento(diagram, bndPage, 180, 260, -180, -260);
    colocarElemento(diagram, bndModal, 180, 260, -320, -400);
    colocarElemento(diagram, bndSrv, 360, 440, -180, -260);
    colocarElemento(diagram, ctrlPlanRoutes, 540, 620, -80, -160);
    colocarElemento(diagram, ctrlSubRoutes, 540, 620, -260, -340);
    colocarElemento(diagram, ctrlQuota, 720, 800, -260, -340);
    colocarElemento(diagram, entComp, 900, 980, -40, -120);
    colocarElemento(diagram, entPlan, 900, 980, -140, -220);
    colocarElemento(diagram, entSub, 900, 980, -260, -340);
    colocarElemento(diagram, entBranch, 900, 980, -360, -440);

    // 4. Mensajes individuales limpios (Sin parámetros y con validaciones en Control)
    crearMensaje(actSuperadmin, bndPage, "1: openSubscriptionModal()");
    crearMensaje(bndPage, bndModal, "1.1: loadData()");
    crearMensaje(bndModal, bndSrv, "1.2: getPlans()");
    crearMensaje(bndSrv, ctrlPlanRoutes, "1.3: list_plans()");
    crearMensaje(ctrlPlanRoutes, entPlan, "1.4: query()");
    crearMensaje(bndModal, bndSrv, "1.5: getCompanySubscription()");
    crearMensaje(bndSrv, ctrlSubRoutes, "1.6: get_company_subscription()");
    crearMensaje(ctrlSubRoutes, ctrlQuota, "1.7: get_active_subscription()");
    crearMensaje(ctrlQuota, entSub, "1.8: query()");
    crearMensaje(actSuperadmin, bndModal, "2: onSubmit()");
    crearMensaje(bndModal, bndSrv, "2.1: assignSubscription()");
    crearMensaje(bndSrv, ctrlSubRoutes, "2.2: assign_subscription()");
    crearMensaje(ctrlSubRoutes, entComp, "2.3: query()");
    crearMensaje(ctrlSubRoutes, entPlan, "2.4: query()");
    crearMensaje(ctrlSubRoutes, ctrlQuota, "2.5: validate_branch_quota()");
    crearMensaje(ctrlQuota, ctrlQuota, "2.5.1: validate_branch_quota()");
    crearMensaje(ctrlQuota, entBranch, "2.6: query()");
    crearMensaje(ctrlSubRoutes, entSub, "2.7: update()");
    crearMensaje(ctrlSubRoutes, entSub, "2.8: create()");
    crearMensaje(ctrlSubRoutes, bndSrv, "2.9: response()");
    crearMensaje(bndModal, bndPage, "2.10: onSubscriptionUpdated()");
    crearMensaje(actSuperadmin, bndModal, "3: onSubmit()");
    crearMensaje(bndModal, bndSrv, "3.1: assignSubscription()");
    crearMensaje(bndSrv, ctrlSubRoutes, "3.2: assign_subscription()");
    crearMensaje(ctrlSubRoutes, ctrlQuota, "3.3: validate_branch_quota()");
    crearMensaje(ctrlSubRoutes, bndSrv, "3.4: raise_http_exception()");
    crearMensaje(bndModal, actSuperadmin, "3.5: showErrorToast()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch(ex) {}

    Log("¡Diagrama de Robustez / Comunicación CU02 generado exitosamente en Enterprise Architect!");
}

Main();
