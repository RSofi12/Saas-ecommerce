/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU05 - Gestionar Prendas y Variantes de Precio por Talla
 * ACTOR: AdministradorTenant
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU05 - Gestionar Prendas y Variantes de Precio por Talla";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU05-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
    var bndPage = addParticipant(pkg, diag, "AdminCatalogPageComponent", "boundary", 150, 130);
    var bndApi = addParticipant(pkg, diag, "CatalogApiService", "boundary", 300, 110);
    var ctrlRoutes = addParticipant(pkg, diag, "CatalogRoutes", "control", 430, 100);
    var ctrlSvc = addParticipant(pkg, diag, "CatalogService", "control", 550, 100);
    var entProd = addParticipant(pkg, diag, "Product", "entity", 670, 80);
    var entVar = addParticipant(pkg, diag, "ProductVariant", "entity", 770, 90);
    var entCat = addParticipant(pkg, diag, "Category", "entity", 880, 80);
    var entSize = addParticipant(pkg, diag, "Size", "entity", 980, 80);

    var seq = 1;
    // Secuencia 1: Consulta Catálogo
    addMessage(act, bndPage, "loadData()", false, seq++);
    addMessage(bndPage, bndApi, "listProducts()", false, seq++);
    addMessage(bndApi, ctrlRoutes, "list_products_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "query()", false, seq++);
    addMessage(ctrlSvc, entProd, "query()", false, seq++);
    addMessage(ctrlRoutes, entCat, "query()", false, seq++);
    addMessage(ctrlRoutes, entSize, "query()", false, seq++);
    addMessage(bndApi, bndPage, "setProducts()", true, seq++);

    // Secuencia 2: Creacion Prenda y Precios por Talla
    addMessage(act, bndPage, "onSubmit()", false, seq++);
    addMessage(bndPage, bndApi, "createProduct()", false, seq++);
    addMessage(bndApi, ctrlRoutes, "create_product_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "create_product()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "validate_variant_payload()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "validate_discount()", false, seq++);
    addMessage(ctrlSvc, entProd, "create()", false, seq++);
    addMessage(ctrlSvc, entVar, "create()", false, seq++);
    addMessage(ctrlRoutes, bndApi, "response()", true, seq++);
    addMessage(bndPage, bndPage, "loadData()", false, seq++);

    // Secuencia 3: Rechazo SKU Duplicado
    addMessage(act, bndPage, "onSubmit()", false, seq++);
    addMessage(bndPage, bndApi, "createProduct()", false, seq++);
    addMessage(bndApi, ctrlRoutes, "create_product_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "validate_variant_payload()", false, seq++);
    addMessage(ctrlRoutes, bndApi, "raise_http_exception()", true, seq++);
    addMessage(bndPage, act, "showErrorToast()", false, seq++);

    diag.Update();
    log("Diagrama de Secuencia CU05 generado.");
}
Main();
