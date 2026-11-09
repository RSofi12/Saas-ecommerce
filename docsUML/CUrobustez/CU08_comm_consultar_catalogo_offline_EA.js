// ============================================================================
// Diagrama de Comunicación / Robustez ICONIX para Enterprise Architect v15 — JScript
// Caso de Uso: CU08 - Consultar Catálogo Offline en Modo Desconectado
// FashionStore — Plataforma SaaS Multitenant (Sistemas 2)
//
// Componentes y Estereotipos Oficiales (Plantilla de Cátedra ICONIX):
//   Actor: Cajero (Actor)
//   Boundary: CatalogPageComponent («boundary»)
//   Control: NetworkStatusService, IdbCatalogService («control»)
//   Entity: IdbProductStore, IdbMetaStore («entity»)
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

    Log("Generando Diagrama de Comunicación / Robustez CU08 en Enterprise Architect v15...");

    var pkg = Repo.GetTreeSelectedPackage();
    if (pkg == null) {
        pkg = Repo.Models.GetAt(0).Packages.GetAt(0);
    }

    // 1. Crear Elementos con Estereotipos ICONIX (Tipo 'Object' para BCE canónico)
    var actorCajero      = crearElementoConEsterotipo(pkg, "Cajero", "Actor", "");

    var uiCatalog        = crearElementoConEsterotipo(pkg, "CatalogPageComponent", "Object", "boundary");

    var ctrlNet          = crearElementoConEsterotipo(pkg, "NetworkStatusService", "Object", "control");
    var ctrlIdb          = crearElementoConEsterotipo(pkg, "IdbCatalogService", "Object", "control");

    var entProductStore  = crearElementoConEsterotipo(pkg, "IdbProductStore", "Object", "entity");
    var entMetaStore     = crearElementoConEsterotipo(pkg, "IdbMetaStore", "Object", "entity");

    // 2. Crear Diagrama de Comunicación / Robustez
    var diagName = "CU08 - Robustez Consultar Catálogo Offline";
    var diagram = crearDiagramaLimpio(pkg, diagName, "Communication");

    // 3. Distribución espacial horizontal equilibrada (cajas 80x80 px)
    colocarElemento(diagram, actorCajero,     40,  120, -180, -260);
    colocarElemento(diagram, uiCatalog,       200,  280, -180, -260);

    colocarElemento(diagram, ctrlNet,         380,  460,  -80, -160);
    colocarElemento(diagram, ctrlIdb,         380,  460, -260, -340);

    colocarElemento(diagram, entProductStore, 560,  640, -200, -280);
    colocarElemento(diagram, entMetaStore,    560,  640, -320, -400);

    // 4. Mensajes individuales limpios (Sin parámetros y con validaciones en Control)
    // Secuencia 1: Consulta Desconectada con Filtro Local en IndexedDB
    crearMensaje(actorCajero, uiCatalog, "1: navegarCatalogo()");
    crearMensaje(uiCatalog, uiCatalog, "1.1: search()");
    crearMensaje(uiCatalog, ctrlNet, "1.2: effectiveOnline()");
    crearMensaje(ctrlNet, uiCatalog, "1.3: returnFalse()");
    crearMensaje(uiCatalog, ctrlIdb, "1.4: loadFromIndexedDb()");
    crearMensaje(ctrlIdb, ctrlIdb, "1.5: filterInMemory()");
    crearMensaje(ctrlIdb, entProductStore, "1.6: getAll()");
    crearMensaje(ctrlIdb, entMetaStore, "1.7: getSyncMeta()");
    crearMensaje(ctrlIdb, uiCatalog, "1.8: setProducts()");
    crearMensaje(uiCatalog, actorCajero, "1.9: renderizarCatalogoOffline()");

    // Secuencia 2: Flujo Alternativo A1 - Base Local Vacía
    crearMensaje(actorCajero, uiCatalog, "2: navegarCatalogo()");
    crearMensaje(ctrlIdb, entProductStore, "2.1: getAll()");
    crearMensaje(ctrlIdb, uiCatalog, "2.2: returnEmpty()");
    crearMensaje(uiCatalog, actorCajero, "2.3: mostrarAlertaSinDatosOffline()");

    diagram.Update();
    Repo.SaveDiagram(diagram.DiagramID);
    Repo.ReloadDiagram(diagram.DiagramID);
    try { Repo.OpenDiagram(diagram.DiagramID); } catch(ex) {}

    Log("¡Diagrama de Robustez / Comunicación CU08 generado exitosamente en Enterprise Architect!");
}

Main();
