// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU07 - Sincronizar y Descargar Catálogo a Almacenamiento Local
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Cajero (Actor)
//   Boundary: CatalogPageComponent, CatalogApiService, IdbCatalogService («boundary»)
//   Control: CatalogRoutes, CatalogService («control»)
//   Entity: CatalogCache, Product, ProductVariant, IdbCatalogStore («entity»)
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

    Log("Generando Diagrama de Comunicación / Robustez CU07 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX (Tipo 'Object' para BCE canónico)
    var actorCajero      = crearElementoConEsterotipo(pkg, "Cajero", "Actor", "");

    var uiCatalog        = crearElementoConEsterotipo(pkg, "CatalogPageComponent", "Object", "boundary");
    var uiApi            = crearElementoConEsterotipo(pkg, "CatalogApiService", "Object", "boundary");
    var uiIdb            = crearElementoConEsterotipo(pkg, "IdbCatalogService", "Object", "boundary");

    var ctrlRoutes       = crearElementoConEsterotipo(pkg, "CatalogRoutes", "Object", "control");
    var ctrlService      = crearElementoConEsterotipo(pkg, "CatalogService", "Object", "control");

    var entCache         = crearElementoConEsterotipo(pkg, "CatalogCache", "Object", "entity");
    var entProduct       = crearElementoConEsterotipo(pkg, "Product", "Object", "entity");
    var entVariant       = crearElementoConEsterotipo(pkg, "ProductVariant", "Object", "entity");
    var entIdbStore      = crearElementoConEsterotipo(pkg, "IdbCatalogStore", "Object", "entity");

    // 2. Crear Diagrama de Comunicación / Robustez
    var diagName = "CU07 - Robustez Sincronizar y Descargar Catálogo Local";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Distribución espacial horizontal equilibrada (cajas 80x80 px)
    colocarElemento(diagram, actorCajero,     40,  120, -180, -260);
    colocarElemento(diagram, uiCatalog,       180,  260, -180, -260);
    colocarElemento(diagram, uiApi,           320,  400, -180, -260);
    colocarElemento(diagram, uiIdb,           180,  260, -320, -400);

    colocarElemento(diagram, ctrlRoutes,      460,  540, -180, -260);
    colocarElemento(diagram, ctrlService,     600,  680, -180, -260);

    colocarElemento(diagram, entCache,        460,  540,  -60, -140);
    colocarElemento(diagram, entProduct,      740,  820, -130, -210);
    colocarElemento(diagram, entVariant,      740,  820, -240, -320);
    colocarElemento(diagram, entIdbStore,     320,  400, -320, -400);

    // 4. Mensajes individuales limpios (Sin parámetros y con validaciones en Control)
    // Secuencia 1: Descarga Exitosa y Persistencia Atómica en IndexedDB
    crearMensaje(actorCajero, uiCatalog, "1: solicitarSincronizacionOffline()");
    crearMensaje(uiCatalog, uiCatalog, "1.1: downloadOfflineCatalog()");
    crearMensaje(uiCatalog, uiApi, "1.2: getOfflineCatalogPack()");
    crearMensaje(uiApi, ctrlRoutes, "1.3: get_offline_catalog_pack_route()");
    crearMensaje(ctrlRoutes, ctrlService, "1.4: list_public_products()");
    crearMensaje(ctrlService, entProduct, "1.5: query()");
    crearMensaje(ctrlService, entVariant, "1.6: query()");
    crearMensaje(ctrlRoutes, entCache, "1.7: commit()");
    crearMensaje(ctrlRoutes, uiApi, "1.8: response()");
    crearMensaje(uiCatalog, uiIdb, "1.9: saveOfflinePack()");
    crearMensaje(uiIdb, entIdbStore, "1.10: clearAndPutProducts()");
    crearMensaje(uiIdb, entIdbStore, "1.11: putSyncMeta()");
    crearMensaje(uiCatalog, actorCajero, "1.12: mostrarToastSincronizado()");

    // Secuencia 2: Flujo Alternativo A1 - Falla de Conexión de Red
    crearMensaje(actorCajero, uiCatalog, "2: solicitarSincronizacionOffline()");
    crearMensaje(uiApi, uiCatalog, "2.1: network_error()");
    crearMensaje(uiCatalog, uiIdb, "2.2: rollbackTransaction()");
    crearMensaje(uiCatalog, actorCajero, "2.3: showErrorToast()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch(ex) {}

    Log("¡Diagrama de Robustez / Comunicación CU07 generado exitosamente en Enterprise Architect!");
}

Main();
