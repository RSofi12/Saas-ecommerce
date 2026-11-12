/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU06 - Consultar Catálogo Facetado
 * ACTOR: Cliente
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU06 - Consultar Catalogo Facetado";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try { var eaApp = new ActiveXObject("EA.App"); Repo = eaApp.Repository; } catch (e) { }
}

function log(msg) { try { Session.Output("[CU06-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } } }

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
    var act      = addActorParticipant(pkg, diag, "Cliente",                   30,  90);
    var bndPage  = addParticipant(pkg, diag, "CatalogPageComponent",  "boundary", 150, 130);
    var bndApi   = addParticipant(pkg, diag, "CatalogApiService",     "boundary", 300, 120);
    var ctrlRt   = addParticipant(pkg, diag, "CatalogRoutes",         "control",  440, 100);
    var ctrlSvc  = addParticipant(pkg, diag, "CatalogService",        "control",  560, 100);
    var entProd  = addParticipant(pkg, diag, "Product",               "entity",   680,  80);
    var entVar   = addParticipant(pkg, diag, "ProductVariant",        "entity",   780,  90);
    var entCat   = addParticipant(pkg, diag, "Category",              "entity",   890,  80);
    var entSize  = addParticipant(pkg, diag, "Size",                  "entity",   990,  80);

    // Estirar lifelines
    stretchLifeline(diag, act,     -2000);
    stretchLifeline(diag, bndPage, -2000);
    stretchLifeline(diag, bndApi,  -2000);
    stretchLifeline(diag, ctrlRt,  -2000);
    stretchLifeline(diag, ctrlSvc, -2000);
    stretchLifeline(diag, entProd, -2000);
    stretchLifeline(diag, entVar,  -2000);
    stretchLifeline(diag, entCat,  -2000);
    stretchLifeline(diag, entSize, -2000);

    // ── FASE 1: Carga inicial (categorías y tallas) ───────────────────────────
    addMessage(act,     bndPage,  "1: navegarCatalogo()",             false, 1);
    addMessage(bndPage, bndApi,   "1.1: listCategories()",            false, 2);
    addMessage(bndApi,  ctrlRt,   "1.2: list_categories_route()",     false, 3);
    addMessage(ctrlRt,  entCat,   "1.3: query()",                     false, 4);
    addMessage(ctrlRt,  entSize,  "1.4: query()",                     false, 5);
    addMessage(bndApi,  bndPage,  "1.5: setCategoriesAndSizes()",     false, 6);
    addMessage(bndPage, bndPage,  "1.6: renderizarFiltros()",         false, 7);

    // ── FASE 2: Búsqueda facetada — fragmento ALT ─────────────────────────────
    // [Resultados encontrados: Renderizar Grilla] vs [else: Sin coincidencias (empty 200)]
    addCombinedFragment(pkg, diag, "alt",
        "[Resultados encontrados: Renderizar Grilla] / [else: Sin coincidencias (empty 200)]",
        440, 1060, -850, -1550);

    addMessage(act,     bndPage,  "2: aplicarFiltrosFacetados()",     false, 8);
    addMessage(bndPage, bndPage,  "2.1: search()",                    false, 9);
    addMessage(bndPage, bndApi,   "2.2: listProducts()",              false, 10);
    addMessage(bndApi,  ctrlRt,   "2.3: list_products_route()",       false, 11);
    addMessage(ctrlRt,  ctrlSvc,  "2.4: list_public_products()",      false, 12);
    addMessage(ctrlSvc, ctrlSvc,  "2.5: build_facet_query()",         false, 13);
    addMessage(ctrlSvc, entProd,  "2.6: query()",                     false, 14);
    addMessage(ctrlSvc, entVar,   "2.7: query()",                     false, 15);
    addMessage(ctrlRt,  bndApi,   "2.8: response()",                  true,  16);
    addMessage(bndApi,  bndPage,  "2.9: setProducts()",               false, 17);
    addMessage(bndPage, act,      "2.10: renderizarGrillaPrendas()",  true,  18);

    // Rama else del ALT
    addMessage(bndPage, act,      "2.10b: mostrarEmptyState()",       true,  19);

    // ── Cierre ────────────────────────────────────────────────────────────────
    diag.Update();
    Repo.SaveDiagram(diag.DiagramID);
    Repo.ReloadDiagram(diag.DiagramID);
    try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }
    log("¡Diagrama de Secuencia CU06 actualizado exitosamente en Enterprise Architect!");
}

Main();
