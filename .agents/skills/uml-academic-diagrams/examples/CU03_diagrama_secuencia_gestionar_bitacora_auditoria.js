/* =================================================================================
 * PROYECTO: Clinica Vida Salud - Centro Medico La Cruz
 * CASO DE USO: CU03 - Gestionar Bitacora de Auditoria (RF02 / Paquete 1: Seguridad y Auditoria)
 * DESCRIPCION: Consulta inmutable en solo lectura de la bitacora institucional:
 *              indicadores y metricas rapidas (KPIs), carga de filtros dinamicos 
 *              (modulos, acciones, operadores) y exploracion paginada de trazas.
 * ACTOR: Administrador
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE pura: Actor-Boundary-Control-Entity)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 *
 * NORMAS Y PAUTAS APLICADAS:
 * - Funciones sin parametros () segun directriz UML de catedra.
 * - Sin cruces horizontales entre entidades (comunicacion exclusiva Controller -> Entity).
 * - Retornos unicamente hacia el Controller o la Interface.
 * - Sin fragmentos alt/opt innecesarios: el Administrador ejecuta los flujos directos de consulta.
 * - Recuadros estandar rectangulares <<Actor>>, <<Interface>>, <<Controller>>, <<Entity>>.
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUdiagrams";
var DIAGRAM_NAME = "CU03 - Gestionar Bitacora de Auditoria";

function log(msg) {
    Session.Output("[CU03-Secuencia] " + msg);
}

/**
 * Obtiene o crea el paquete de destino en el Project Browser.
 */
function getTargetPackage() {
    var selectedPkg = Repository.GetTreeSelectedPackage();
    if (selectedPkg != null) {
        log("Usando paquete seleccionado en Project Browser: " + selectedPkg.Name);
        return selectedPkg;
    }

    var roots = Repository.Models;
    var root = (roots.Count > 0) ? roots.GetAt(0) : null;
    if (root == null) {
        Session.Prompt("No se encontro ningun modelo raiz en Enterprise Architect.", 0);
        return null;
    }

    for (var i = 0; i < root.Packages.Count; i++) {
        var p = root.Packages.GetAt(i);
        if (p.Name == DEFAULT_PACKAGE_NAME) {
            return p;
        }
    }

    var newPkg = root.Packages.AddNew(DEFAULT_PACKAGE_NAME, "Package");
    newPkg.Update();
    root.Packages.Refresh();
    log("Paquete creado: " + DEFAULT_PACKAGE_NAME);
    return newPkg;
}

/**
 * Recrea el diagrama limpio.
 */
function recreateDiagram(pkg) {
    for (var i = pkg.Diagrams.Count - 1; i >= 0; i--) {
        var d = pkg.Diagrams.GetAt(i);
        if (d.Name == DIAGRAM_NAME) {
            try {
                pkg.Diagrams.Delete(i);
                pkg.Diagrams.Refresh();
                log("Diagrama previo eliminado para regeneracion limpia.");
            } catch (e) {
                log("Aviso al eliminar: " + e.message);
            }
            break;
        }
    }

    var diagram = pkg.Diagrams.AddNew(DIAGRAM_NAME, "Sequence");
    try {
        diagram.StyleEx = "ShowRobustness=0;SequenceCustomArt=0;";
    } catch (e) { }
    diagram.Update();
    pkg.Diagrams.Refresh();
    return diagram;
}

/**
 * Agrega el Actor con su icono estandar UML.
 */
function addActorParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Actor");
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-1800;", "");
    dObj.ElementID = el.ElementID;
    dObj.Update();
    return el;
}

/**
 * Agrega participante con encabezado RECTANGULAR (Boundary, Controller).
 */
function addParticipant(pkg, diagram, name, stereotype, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    if (stereotype && stereotype.length > 0) {
        el.Stereotype = stereotype;
    }
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-1700;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

/**
 * Agrega participantes Entidades en RECUADRO RECTANGULAR estandar.
 */
function addEntityParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    el.Stereotype = "Entity" + String.fromCharCode(160);
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-1700;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

/**
 * Agrega mensaje de secuencia. isReturn = true crea la flecha discontinua de retorno.
 */
function addMessage(src, dst, label, isReturn, sequenceNo) {
    var con = src.Connectors.AddNew(label, "Sequence");
    con.SupplierID = dst.ElementID;
    if (isReturn) {
        con.Stereotype = "return";
    }
    if (sequenceNo) {
        try {
            con.SequenceNo = sequenceNo;
        } catch (e) { }
    }
    con.Update();
    return con;
}

/**
 * Re-fija los bounds del DiagramObject del actor para que su lifeline llegue hasta el final.
 */
function stretchActorLifeline(diagram, actorEl) {
    for (var i = 0; i < diagram.DiagramObjects.Count; i++) {
        var dObj = diagram.DiagramObjects.GetAt(i);
        if (dObj.ElementID == actorEl.ElementID) {
            dObj.Top = -20;
            dObj.Bottom = -1800;
            dObj.Update();
            return;
        }
    }
}

function main() {
    log("Iniciando generacion de CU03 con flujo actor-interface-controller-entities...");

    var pkg = getTargetPackage();
    if (pkg == null) return;

    var diagram = recreateDiagram(pkg);

    /* -------------------------------------------------------------------------
     * 1. PARTICIPANTES BCE
     * Administrador -> :AuditLogViewer (Boundary) -> :AuditController (Controller)
     * -> :Bitacora, :User (Entities)
     * ------------------------------------------------------------------------- */
    var actorAdmin   = addActorParticipant(pkg, diagram, "Administrador", 40, 100);
    var uiAudit      = addParticipant(pkg, diagram, ":AuditLogViewer", "Interface", 200, 200);
    var ctrlAudit    = addParticipant(pkg, diagram, ":AuditController", "Controller", 460, 210);

    var entBitacora  = addEntityParticipant(pkg, diagram, ":Bitacora", 730, 140);
    var entUser      = addEntityParticipant(pkg, diagram, ":User",     920, 140);

    var step = 1;

    /* -------------------------------------------------------------------------
     * 2. FLUJO 1: CONSULTAR METRICAS Y KPIS (GET /api/audit/stats)
     * ------------------------------------------------------------------------- */
    addMessage(actorAdmin, uiAudit,
        "1: consultarEstadisticas()", false, step++);

    addMessage(uiAudit, ctrlAudit,
        "1.1: stats()", false, step++);

    addMessage(ctrlAudit, entBitacora,
        "1.2: where()", false, step++);

    addMessage(ctrlAudit, entBitacora,
        "1.3: count()", false, step++);

    addMessage(entBitacora, ctrlAudit,
        "1.4: return()", true, step++);

    addMessage(ctrlAudit, uiAudit,
        "1.5: return()", true, step++);

    addMessage(uiAudit, actorAdmin,
        "1.6: renderizarEstadisticas()", true, step++);

    /* -------------------------------------------------------------------------
     * 3. FLUJO 2: CARGAR SELECTORES DINAMICOS (GET /api/audit/filters-data)
     * ------------------------------------------------------------------------- */
    addMessage(actorAdmin, uiAudit,
        "2: solicitarFiltros()", false, step++);

    addMessage(uiAudit, ctrlAudit,
        "2.1: filtersData()", false, step++);

    addMessage(ctrlAudit, entBitacora,
        "2.2: select()", false, step++);

    addMessage(ctrlAudit, entBitacora,
        "2.3: distinct()", false, step++);

    addMessage(entBitacora, ctrlAudit,
        "2.4: return()", true, step++);

    addMessage(ctrlAudit, entUser,
        "2.5: select()", false, step++);

    addMessage(ctrlAudit, entUser,
        "2.6: get()", false, step++);

    addMessage(entUser, ctrlAudit,
        "2.7: return()", true, step++);

    addMessage(ctrlAudit, uiAudit,
        "2.8: return()", true, step++);

    addMessage(uiAudit, actorAdmin,
        "2.9: inicializarFiltros()", true, step++);

    /* -------------------------------------------------------------------------
     * 4. FLUJO 3: EXPLORAR Y FILTRAR BITACORA (GET /api/audit)
     * ------------------------------------------------------------------------- */
    addMessage(actorAdmin, uiAudit,
        "3: filtrarBitacora()", false, step++);

    // Autollamada en Interface: validacion logica del rango de fechas (inicio <= fin)
    addMessage(uiAudit, uiAudit,
        "3.1: validarRangoFechas()", false, step++);

    addMessage(uiAudit, ctrlAudit,
        "3.2: index()", false, step++);

    // Autollamada en Controller: sanitizacion de parametros (perPage permitido)
    addMessage(ctrlAudit, ctrlAudit,
        "3.3: sanitizarParametros()", false, step++);

    addMessage(ctrlAudit, entBitacora,
        "3.4: with()", false, step++);

    addMessage(ctrlAudit, entBitacora,
        "3.5: where()", false, step++);

    addMessage(ctrlAudit, entBitacora,
        "3.6: orderBy()", false, step++);

    addMessage(ctrlAudit, entBitacora,
        "3.7: paginate()", false, step++);

    addMessage(entBitacora, ctrlAudit,
        "3.8: return()", true, step++);

    addMessage(ctrlAudit, uiAudit,
        "3.9: return()", true, step++);

    addMessage(uiAudit, actorAdmin,
        "3.10: renderizarEventos()", true, step++);

    /* Guardar y abrir diagrama de forma segura */
    stretchActorLifeline(diagram, actorAdmin);
    diagram.Update();
    Repository.SaveDiagram(diagram.DiagramID);
    Repository.ReloadDiagram(diagram.DiagramID);
    Repository.OpenDiagram(diagram.DiagramID);

    log("Diagrama '" + DIAGRAM_NAME + "' generado y abierto correctamente.");
    Session.Prompt("¡Diagrama CU03 generado con exito!", 0);
}

main();
