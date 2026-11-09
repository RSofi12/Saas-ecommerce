// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU05 - Gestionar Prendas y Variantes de Precio por Talla
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

    Log("Generando Diagrama de Comunicación / Robustez CU05 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX Canónicos (Type = 'Object')
    var actAdmin = crearElementoConEsterotipo(pkg, "AdministradorTenant", "Actor", "");
    var bndPage = crearElementoConEsterotipo(pkg, "AdminCatalogPageComponent", "Object", "boundary");
    var bndApi = crearElementoConEsterotipo(pkg, "CatalogApiService", "Object", "boundary");
    var ctrlRoutes = crearElementoConEsterotipo(pkg, "CatalogRoutes", "Object", "control");
    var ctrlSvc = crearElementoConEsterotipo(pkg, "CatalogService", "Object", "control");
    var entProd = crearElementoConEsterotipo(pkg, "Product", "Object", "entity");
    var entVar = crearElementoConEsterotipo(pkg, "ProductVariant", "Object", "entity");
    var entCat = crearElementoConEsterotipo(pkg, "Category", "Object", "entity");
    var entSize = crearElementoConEsterotipo(pkg, "Size", "Object", "entity");

    // 2. Crear Diagrama de Comunicación / Robustez
    var diagName = "CU05 - Robustez Gestionar Prendas y Variantes";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Distribución espacial horizontal y equilibrada (Iconos circulares de 80x80)
    colocarElemento(diagram, actAdmin, 40, 120, -180, -260);
    colocarElemento(diagram, bndPage, 180, 260, -180, -260);
    colocarElemento(diagram, bndApi, 360, 440, -180, -260);
    colocarElemento(diagram, ctrlRoutes, 540, 620, -180, -260);
    colocarElemento(diagram, ctrlSvc, 720, 800, -180, -260);
    colocarElemento(diagram, entProd, 900, 980, -60, -140);
    colocarElemento(diagram, entVar, 900, 980, -160, -240);
    colocarElemento(diagram, entCat, 900, 980, -260, -340);
    colocarElemento(diagram, entSize, 900, 980, -360, -440);

    // 4. Mensajes individuales limpios (Sin parámetros y con validaciones en Control)
    crearMensaje(actAdmin, bndPage, "1: loadData()");
    crearMensaje(bndPage, bndApi, "1.1: listProducts()");
    crearMensaje(bndApi, ctrlRoutes, "1.2: list_products_route()");
    crearMensaje(ctrlRoutes, ctrlSvc, "1.3: query()");
    crearMensaje(ctrlSvc, entProd, "1.4: query()");
    crearMensaje(ctrlRoutes, entCat, "1.5: query()");
    crearMensaje(ctrlRoutes, entSize, "1.6: query()");
    crearMensaje(bndApi, bndPage, "1.7: setProducts()");
    crearMensaje(actAdmin, bndPage, "2: onSubmit()");
    crearMensaje(bndPage, bndApi, "2.1: createProduct()");
    crearMensaje(bndApi, ctrlRoutes, "2.2: create_product_route()");
    crearMensaje(ctrlRoutes, ctrlSvc, "2.3: create_product()");
    crearMensaje(ctrlSvc, ctrlSvc, "2.4: validate_variant_payload()");
    crearMensaje(ctrlSvc, ctrlSvc, "2.5: validate_discount()");
    crearMensaje(ctrlSvc, entProd, "2.6: create()");
    crearMensaje(ctrlSvc, entVar, "2.7: create()");
    crearMensaje(ctrlRoutes, bndApi, "2.8: response()");
    crearMensaje(bndPage, bndPage, "2.9: loadData()");
    crearMensaje(actAdmin, bndPage, "3: onSubmit()");
    crearMensaje(bndPage, bndApi, "3.1: createProduct()");
    crearMensaje(bndApi, ctrlRoutes, "3.2: create_product_route()");
    crearMensaje(ctrlRoutes, ctrlSvc, "3.3: validate_variant_payload()");
    crearMensaje(ctrlRoutes, bndApi, "3.4: raise_http_exception()");
    crearMensaje(bndPage, actAdmin, "3.5: showErrorToast()");
    crearMensaje(actAdmin, bndPage, "4: onSubmit()");
    crearMensaje(bndPage, bndApi, "4.1: validate_discount()");
    crearMensaje(ctrlRoutes, bndApi, "4.2: raise_http_exception()");
    crearMensaje(bndPage, actAdmin, "4.3: showErrorToast()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch(ex) {}

    Log("¡Diagrama de Robustez / Comunicación CU05 generado exitosamente en Enterprise Architect!");
}

Main();
