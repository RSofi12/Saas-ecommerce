/* =================================================================================
 * PROYECTO: FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2)
 * CASO DE USO: CU06 - Consultar Catálogo Online con Búsqueda Facetada
 * ACTOR: Cliente (Actor Principal)
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+ (JScript WSH)
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUSecuencia";
var DIAGRAM_NAME = "CU06 - Secuencia Consultar Catálogo Online con Búsqueda Facetada";

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    try {
        var eaApp = new ActiveXObject("EA.App");
        Repo = eaApp.Repository;
    } catch (e) { }
}

function log(msg) {
    try { Session.Output("[CU06-Secuencia] " + msg); } catch (e) { try { WScript.Echo(msg); } catch (ex) { } }
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
    // usecustomart=0 y HideIcon=1 para asegurar rectángulos estándar según directriz /uml-academic-diagrams
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

    // 1. Participantes BCE (Coincidentes con Robustez CU06)
    var act = addActorParticipant(pkg, diag, "Cliente", 30, 80);
    var bndPage = addParticipant(pkg, diag, "CatalogPageComponent", "boundary", 140, 130);
    var bndApi = addParticipant(pkg, diag, "CatalogApiService", "boundary", 290, 110);
    var ctrlRoutes = addParticipant(pkg, diag, "CatalogRoutes", "control", 420, 100);
    var ctrlSvc = addParticipant(pkg, diag, "CatalogService", "control", 540, 100);
    var entCat = addParticipant(pkg, diag, "Category", "entity", 660, 80);
    var entSize = addParticipant(pkg, diag, "Size", "entity", 760, 80);
    var entProd = addParticipant(pkg, diag, "Product", "entity", 860, 80);
    var entVar = addParticipant(pkg, diag, "ProductVariant", "entity", 960, 90);

    pkg.Elements.Refresh();
    diag.DiagramObjects.Refresh();

    var seq = 1;

    // FASE 1: Consulta Inicial y Carga de Filtros Facetados
    addMessage(act, bndPage, "1: loadData()", false, seq++);
    addMessage(bndPage, bndApi, "1.1: listCategories()", false, seq++);
    addMessage(bndApi, ctrlRoutes, "1.2: list_categories_route()", false, seq++);
    addMessage(ctrlRoutes, entCat, "1.3: query()", false, seq++);
    addMessage(ctrlRoutes, entSize, "1.4: query()", false, seq++);
    addMessage(ctrlRoutes, bndApi, "1.5: response()", true, seq++);
    addMessage(bndApi, bndPage, "1.6: setCategoriesAndSizes()", true, seq++);
    addMessage(bndPage, act, "1.7: renderizarFiltros()", false, seq++);

    // FASE 2: Búsqueda Facetada Combinada
    addMessage(act, bndPage, "2: aplicarFiltrosFacetados()", false, seq++);
    addMessage(bndPage, bndPage, "2.1: search()", false, seq++);
    addMessage(bndPage, bndApi, "2.2: listProducts()", false, seq++);
    addMessage(bndApi, ctrlRoutes, "2.3: list_products_route()", false, seq++);
    addMessage(ctrlRoutes, ctrlSvc, "2.4: list_public_products()", false, seq++);
    addMessage(ctrlSvc, ctrlSvc, "2.5: build_facet_query()", false, seq++);
    addMessage(ctrlSvc, entProd, "2.6: query()", false, seq++);
    addMessage(ctrlSvc, entVar, "2.7: query()", false, seq++);

    // FRAGMENTO COMBINADO ALT: [Resultados Encontrados vs Cero Coincidencias]
    addCombinedFragment(pkg, diag, "alt", "[Resultados encontrados: Renderizar Grilla]", 520, 1070, -1080, -1450);

    // Rama Exitosa: Productos Encontrados
    addMessage(ctrlSvc, ctrlRoutes, "2.8a: response()", true, seq++);
    addMessage(ctrlRoutes, bndApi, "2.9a: response()", true, seq++);
    addMessage(bndApi, bndPage, "2.10a: setProducts()", true, seq++);
    addMessage(bndPage, act, "2.11a: renderizarGrillaPrendas()", false, seq++);

    // Rama Cero Coincidencias (Empty State)
    addCombinedFragment(pkg, diag, "alt", "[else: Cero coincidencias (200 OK vacío)]", 520, 1070, -1480, -1750);
    addMessage(ctrlSvc, ctrlRoutes, "2.8b: responseEmpty()", true, seq++);
    addMessage(ctrlRoutes, bndApi, "2.9b: responseEmpty()", true, seq++);
    addMessage(bndApi, bndPage, "2.10b: setProductsEmpty()", true, seq++);
    addMessage(bndPage, act, "2.11b: mostrarEmptyState()", false, seq++);

    // Extender líneas de vida uniformemente
    stretchLifeline(diag, act, -1850);
    stretchLifeline(diag, bndPage, -1850);
    stretchLifeline(diag, bndApi, -1850);
    stretchLifeline(diag, ctrlRoutes, -1850);
    stretchLifeline(diag, ctrlSvc, -1850);
    stretchLifeline(diag, entCat, -1850);
    stretchLifeline(diag, entSize, -1850);
    stretchLifeline(diag, entProd, -1850);
    stretchLifeline(diag, entVar, -1850);

    diag.Update();
    Repo.SaveDiagram(diag.DiagramID);
    Repo.ReloadDiagram(diag.DiagramID);
    try { Repo.OpenDiagram(diag.DiagramID); } catch (e) { }

    log("¡Diagrama de Secuencia CU06 actualizado exitosamente en Enterprise Architect!");
}

Main();
