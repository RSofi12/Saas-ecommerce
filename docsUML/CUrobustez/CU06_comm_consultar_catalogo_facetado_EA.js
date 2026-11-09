// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU06 - Consultar Catálogo Online con Búsqueda Facetada
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Cliente (Actor)
//   Boundary: CatalogPageComponent, CatalogApiService («boundary»)
//   Control: CatalogRoutes, CatalogService («control»)
//   Entity: Product, ProductVariant, Category, Size («entity»)
//
// Reglas Metodológicas Estrictas:
//   - Todas las funciones se expresan con paréntesis vacíos () sin parámetros internos.
//   - Cero bucles o validaciones sobre Fronteras (las validaciones residen en Controllers).
//   - Elementos creados como "Object" para forzar iconos nativos circulares BCE en EA.
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

    Log("Generando Diagrama de Comunicación / Robustez CU06 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX (Tipo 'Object' para BCE canónico)
    var actorCliente     = crearElementoConEsterotipo(pkg, "Cliente", "Actor", "");

    var uiCatalog        = crearElementoConEsterotipo(pkg, "CatalogPageComponent", "Object", "boundary");
    var uiApi            = crearElementoConEsterotipo(pkg, "CatalogApiService", "Object", "boundary");

    var ctrlRoutes       = crearElementoConEsterotipo(pkg, "CatalogRoutes", "Object", "control");
    var ctrlService      = crearElementoConEsterotipo(pkg, "CatalogService", "Object", "control");

    var entProduct       = crearElementoConEsterotipo(pkg, "Product", "Object", "entity");
    var entVariant       = crearElementoConEsterotipo(pkg, "ProductVariant", "Object", "entity");
    var entCategory      = crearElementoConEsterotipo(pkg, "Category", "Object", "entity");
    var entSize          = crearElementoConEsterotipo(pkg, "Size", "Object", "entity");

    // 2. Crear Diagrama de Comunicación / Robustez
    var diagName = "CU06 - Robustez Consultar Catálogo con Búsqueda Facetada";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Distribución espacial horizontal equilibrada (cajas 80x80 px)
    colocarElemento(diagram, actorCliente,     40,  120, -180, -260);
    colocarElemento(diagram, uiCatalog,       180,  260, -180, -260);
    colocarElemento(diagram, uiApi,           320,  400, -180, -260);

    colocarElemento(diagram, ctrlRoutes,      460,  540, -180, -260);
    colocarElemento(diagram, ctrlService,     600,  680, -180, -260);

    colocarElemento(diagram, entProduct,      740,  820, -100, -180);
    colocarElemento(diagram, entVariant,      740,  820, -190, -270);
    colocarElemento(diagram, entCategory,     740,  820, -280, -360);
    colocarElemento(diagram, entSize,         740,  820, -370, -450);

    // 4. Mensajes individuales limpios (Sin parámetros y con validaciones en Control)
    // Secuencia 1: Consulta Inicial y Carga de Filtros Facetados
    crearMensaje(actorCliente, uiCatalog, "1: loadData()");
    crearMensaje(uiCatalog, uiApi, "1.1: listCategories()");
    crearMensaje(uiApi, ctrlRoutes, "1.2: list_categories_route()");
    crearMensaje(ctrlRoutes, entCategory, "1.3: query()");
    crearMensaje(ctrlRoutes, entSize, "1.4: query()");
    crearMensaje(uiApi, uiCatalog, "1.5: setCategoriesAndSizes()");

    // Secuencia 2: Búsqueda Facetada Online Combinada
    crearMensaje(actorCliente, uiCatalog, "2: aplicarFiltrosFacetados()");
    crearMensaje(uiCatalog, uiCatalog, "2.1: search()");
    crearMensaje(uiCatalog, uiApi, "2.2: listProducts()");
    crearMensaje(uiApi, ctrlRoutes, "2.3: list_products_route()");
    crearMensaje(ctrlRoutes, ctrlService, "2.4: list_public_products()");
    crearMensaje(ctrlService, ctrlService, "2.5: build_facet_query()");
    crearMensaje(ctrlService, entProduct, "2.6: query()");
    crearMensaje(ctrlService, entVariant, "2.7: query()");
    crearMensaje(ctrlService, ctrlRoutes, "2.8: response()");
    crearMensaje(ctrlRoutes, uiApi, "2.9: response()");
    crearMensaje(uiApi, uiCatalog, "2.10: setProducts()");
    crearMensaje(uiCatalog, actorCliente, "2.11: renderizarGrillaPrendas()");

    // Secuencia 3: Flujo Alternativo A1 - Cero Coincidencias
    crearMensaje(actorCliente, uiCatalog, "3: aplicarFiltrosSinCoincidencia()");
    crearMensaje(ctrlService, ctrlService, "3.1: build_facet_query()");
    crearMensaje(ctrlService, ctrlRoutes, "3.2: responseEmpty()");
    crearMensaje(uiCatalog, actorCliente, "3.3: mostrarEmptyState()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch(ex) {}

    Log("¡Diagrama de Robustez / Comunicación CU06 generado exitosamente en Enterprise Architect!");
}

Main();
