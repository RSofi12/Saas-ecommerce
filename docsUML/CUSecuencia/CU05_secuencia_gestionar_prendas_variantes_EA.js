/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU05 - Gestionar Prendas y Variantes
 * ACTOR: AdministradorTenant
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU05 - Gestionar Prendas y Variantes";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try { var eaApp = new ActiveXObject("EA.App"); Repo = eaApp.Repository; } catch (e) { }
}

function log(msg) { try { Session.Output("[CU05-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } } }

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
    newPkg.Update(); root.Packages.Refresh();
    return newPkg;
}

function recreateDiagram(pkg) {
    for (var i = pkg.Diagrams.Count - 1; i >= 0; i--) {
        var d = pkg.Diagrams.GetAt(i);
        if (d.Name == DIAGRAM_NAME) { pkg.Diagrams.Delete(i); pkg.Diagrams.Refresh(); break; }
    }
    var diagram = pkg.Diagrams.AddNew(DIAGRAM_NAME, "Sequence");
    diagram.Update(); pkg.Diagrams.Refresh();
    return diagram;
}

function addActorParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Actor");
    el.Update();
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + (leftX + width) + ";t=-20;b=-1900;", "");
    dObj.ElementID = el.ElementID; dObj.Update();
    return el;
}

function addParticipant(pkg, diagram, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) el.Stereotype = stereotype;
    el.Update();
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + (leftX + width) + ";t=-30;b=-1850;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

function addMessage(src, dst, label, isReturn, sequenceNo) {
    var con = src.Connectors.AddNew(label, "Sequence");
    con.SupplierID = dst.ElementID;
    if (isReturn) con.Stereotype = "return";
    if (sequenceNo) { try { con.SequenceNo = sequenceNo; } catch (e) { } }
    con.Update();
    return con;
}

function addCombinedFragment(pkg, diagram, type, guardLabel, left, right, top, bottom) {
    try {
        var frag = pkg.Elements.AddNew(guardLabel, "InteractionFragment");
        frag.Stereotype = type; frag.Update();
        var dObj = diagram.DiagramObjects.AddNew("l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";", "");
        dObj.ElementID = frag.ElementID; dObj.Update();
        return frag;
    } catch (err) { log("Nota al crear fragmento (" + type + "): " + err.message); return null; }
}

function stretchLifeline(diagram, element, bottomY) {
    for (var i = 0; i < diagram.DiagramObjects.Count; i++) {
        var dObj = diagram.DiagramObjects.GetAt(i);
        if (dObj.ElementID == element.ElementID) { dObj.Bottom = bottomY || -2200; dObj.Update(); return; }
    }
}

function Main() {
    var pkg = getTargetPackage();
    if (pkg == null) { log("ERROR: No se encontro paquete destino."); return; }
    var diag = recreateDiagram(pkg);

    // ── Participantes ──────────────────────────────────────────────────────────
    var act      = addActorParticipant(pkg, diag, "AdministradorTenant",       30,  80);
    var bndPage  = addParticipant(pkg, diag, "AdminCatalogPageComponent", "boundary", 140, 130);
    var bndApi   = addParticipant(pkg, diag, "CatalogApiService",         "boundary", 290, 120);
    var ctrlRt   = addParticipant(pkg, diag, "CatalogRoutes",             "control",  430, 100);
    var ctrlSvc  = addParticipant(pkg, diag, "CatalogService",            "control",  550, 105);
    var entProd  = addParticipant(pkg, diag, "Product",                   "entity",   675,  80);
    var entVar   = addParticipant(pkg, diag, "ProductVariant",            "entity",   775,  95);
    var entCat   = addParticipant(pkg, diag, "Category",                  "entity",   890,  80);
    var entSize  = addParticipant(pkg, diag, "Size",                      "entity",   990,  80);

    // Estirar lifelines para diagrama amplio
    stretchLifeline(diag, act,     -2000);
    stretchLifeline(diag, bndPage, -2000);
    stretchLifeline(diag, bndApi,  -2000);
    stretchLifeline(diag, ctrlRt,  -2000);
    stretchLifeline(diag, ctrlSvc, -2000);
    stretchLifeline(diag, entProd, -2000);
    stretchLifeline(diag, entVar,  -2000);
    stretchLifeline(diag, entCat,  -2000);
    stretchLifeline(diag, entSize, -2000);

    // ── FASE 1: Carga inicial del catálogo ────────────────────────────────────
    addMessage(act,     bndPage,  "1: loadData()",                    false, 1);
    addMessage(bndPage, bndApi,   "1.1: listAdminProducts()",         false, 2);
    addMessage(bndApi,  ctrlRt,   "1.2: list_admin_products_route()", false, 3);
    addMessage(ctrlRt,  ctrlSvc,  "1.3: list_admin_products()",       false, 4);
    addMessage(ctrlSvc, entProd,  "1.4a: query()",                    false, 5);
    addMessage(ctrlSvc, entCat,   "1.4b: query()",                    false, 6);
    addMessage(ctrlSvc, entSize,  "1.4c: query()",                    false, 7);
    addMessage(ctrlRt,  bndApi,   "1.5: response()",                  true,  8);
    addMessage(bndApi,  bndPage,  "1.6: setProducts()",               false, 9);
    addMessage(bndPage, bndPage,  "1.7: renderizarGrillaCatalogo()",  false, 10);

    // ── FASE 2: Creación de prenda — fragmento ALT ────────────────────────────
    // [SKU valido y sin duplicado: Creacion Exitosa] vs [else: SKU duplicado o descuento invalido (400)]
    addCombinedFragment(pkg, diag, "alt",
        "[SKU valido y sin duplicado: Creacion Exitosa] / [else: SKU duplicado o descuento invalido (400)]",
        400, 1060, -850, -1550);

    addMessage(act,     bndPage,  "2: submitNuevaPrenda()",          false, 11);
    addMessage(bndPage, bndApi,   "2.1: createProduct()",            false, 12);
    addMessage(bndApi,  ctrlRt,   "2.2: create_product_route()",     false, 13);
    addMessage(ctrlRt,  ctrlSvc,  "2.3: create_product()",           false, 14);
    addMessage(ctrlSvc, ctrlSvc,  "2.4: validate_variant_payload()", false, 15);
    addMessage(ctrlSvc, ctrlSvc,  "2.5: validate_discount()",        false, 16);
    addMessage(ctrlSvc, entProd,  "2.6: create()",                   false, 17);
    addMessage(ctrlSvc, entVar,   "2.7: create()",                   false, 18);
    addMessage(ctrlRt,  bndApi,   "2.8: response()",                 true,  19);
    addMessage(bndPage, bndPage,  "2.9: loadData()",                 false, 20);
    addMessage(bndPage, act,      "2.10: mostrarToastExito()",       true,  21);

    // Rama else del ALT
    addMessage(ctrlSvc, ctrlSvc,  "2.4b: raise_http_exception()",   false, 22);
    addMessage(bndPage, act,       "2.5b: showErrorToast()",         true,  23);

    // ── Cierre ────────────────────────────────────────────────────────────────
    diag.Update();
    Repo.SaveDiagram(diag.DiagramID);
    Repo.ReloadDiagram(diag.DiagramID);
    try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }
    log("¡Diagrama de Secuencia CU05 actualizado exitosamente en Enterprise Architect!");
}

Main();
