/* =================================================================================
 * PROYECTO: Clinica Vida Salud - Centro Medico La Cruz
 * CASO DE USO: CU17 - Gestionar Antecedentes Medicos (Ciclo 2 / Extra / §3.4)
 * DESCRIPCION: Registro, clasificacion (Patologicos, Quirurgicos, Alergicos,
 *              Familiares, Farmacologicos), consulta, edicion y baja logica (RN11)
 *              de antecedentes medicos asociados a la historia clinica del paciente,
 *              con prevencion de duplicados activos, alertas y bitacora inmutable.
 * ACTOR: Medico / Administrador
 * TIPO DE DIAGRAMA: Diagrama de Secuencia (Arquitectura BCE canonica: 1 Boundary y 1 Controller)
 * ENTORNO: Enterprise Architect 15.0+
 * LENGUAJE: JScript (Motor nativo WSH en Enterprise Architect)
 *
 * ESPECIFICACION DE DISENO FIEL AL CODIGO:
 * - Boundary: :AntecedentesPatientModal (gestor integral de antecedentes)
 * - Controller: :AntecedentesController (orquestador REST y servicio transaccional)
 * - Entities: :Paciente, :HistoriaClinica, :Antecedente, :Bitacora
 * - Convencion de funciones () o maximo 1 parametro.
 * - Sin cruces de mensajes entre entidades (comunicacion exclusiva Controller -> Entity).
 * - Retornos unicamente hacia el Controller o la Interface.
 * - Fragmentos ALT con comentario de rango de mensajes (maximo 2 alt).
 * - Recuadros rectangulares con colores por defecto de Enterprise Architect.
 * ================================================================================= */

var DEFAULT_PACKAGE_NAME = "CUdiagrams";
var DIAGRAM_NAME = "CU17 - Gestionar Antecedentes Medicos";

function log(msg) {
    Session.Output("[CU17-Secuencia] " + msg);
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
 * Recrea el diagrama limpio de tipo Sequence.
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
 * Agrega el Actor con su forma estandar UML.
 */
function addActorParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Actor");
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-20;b=-2200;", "");
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
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2100;", "");
    dObj.ElementID = el.ElementID;
    dObj.Style = "usecustomart=0;HideIcon=1;";
    dObj.Update();
    return el;
}

/**
 * Agrega participantes Entidades en RECUADRO RECTANGULAR estandar con color por defecto.
 */
function addEntityParticipant(pkg, diagram, name, leftX, width) {
    var el = pkg.Elements.AddNew(name, "Sequence");
    el.Stereotype = "Entity" + String.fromCharCode(160);
    el.Update();

    var rightX = leftX + width;
    var dObj = diagram.DiagramObjects.AddNew("l=" + leftX + ";r=" + rightX + ";t=-30;b=-2100;", "");
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
 * Agrega fragmentos combinados (alt, opt, loop).
 */
function addCombinedFragment(pkg, diagram, type, guardLabel, left, right, top, bottom) {
    try {
        var frag = pkg.Elements.AddNew(guardLabel, "InteractionFragment");
        frag.Stereotype = type;
        frag.Update();

        var dObj = diagram.DiagramObjects.AddNew("l=" + left + ";r=" + right + ";t=" + top + ";b=" + bottom + ";", "");
        dObj.ElementID = frag.ElementID;
        dObj.Update();
        return frag;
    } catch (e) {
        log("No se pudo agregar fragmento " + type + ": " + e.message);
        return null;
    }
}

/**
 * Funcion Principal
 */
function main() {
    Repository.EnsureOutputVisible("Script");
    log("Iniciando generacion del Diagrama de Secuencia CU17 (1 Boundary, 1 Controller)...");

    var pkg = getTargetPackage();
    if (pkg == null) return;

    var diagram = recreateDiagram(pkg);

    // =========================================================================
    // 1. PARTICIPANTES (BCE: 1 Actor -> 1 Boundary -> 1 Controller -> 4 Entities)
    // =========================================================================
    var actMed = addActorParticipant(pkg, diagram, "Medico / Administrador", 30, 90);
    var bndAnt = addParticipant(pkg, diagram, ":AntecedentesPatientModal", "Interface", 190, 180);
    var ctrlAnt = addParticipant(pkg, diagram, ":AntecedentesController", "Controller", 450, 170);
    var entPac = addEntityParticipant(pkg, diagram, ":Paciente", 700, 100);
    var entHis = addEntityParticipant(pkg, diagram, ":HistoriaClinica", 860, 120);
    var entAnt = addEntityParticipant(pkg, diagram, ":Antecedente", 1040, 110);
    var entBit = addEntityParticipant(pkg, diagram, ":Bitacora", 1210, 90);

    diagram.Update();
    pkg.Diagrams.Refresh();

    // =========================================================================
    // 2. MENSAJES Y LLAMADAS
    // =========================================================================

    // FASE 1: Consulta y Listado de Antecedentes del Paciente
    addMessage(actMed, bndAnt, "1: abrirGestionAntecedentes(paciente)", false, 1);
    addMessage(bndAnt, ctrlAnt, "1.1: indexByPatient(idPaciente)", false, 2);
    addMessage(ctrlAnt, ctrlAnt, "1.2: validarAccesoRBAC()", false, 3);
    addMessage(ctrlAnt, entPac, "1.3: findOrFail(idPaciente)", false, 4);
    addMessage(entPac, ctrlAnt, "1.4: return paciente", true, 5);
    addMessage(ctrlAnt, entHis, "1.5: where('id_paciente', id)", false, 6);
    addMessage(entHis, ctrlAnt, "1.6: return historiaClinica", true, 7);
    addMessage(ctrlAnt, entAnt, "1.7: scopePorPaciente(idHistoria)", false, 8);
    addMessage(entAnt, ctrlAnt, "1.8: return antecedentes", true, 9);
    addMessage(ctrlAnt, bndAnt, "1.9: return antecedentes", true, 10);
    addMessage(bndAnt, actMed, "1.10: renderizarPestanasYAlertas()", true, 11);

    // FASE 2: Registro de Nuevo Antecedente Medico
    addMessage(actMed, bndAnt, "2: ingresarAntecedente(tipo, descripcion)", false, 12);
    addMessage(bndAnt, ctrlAnt, "2.1: store(payload)", false, 13);
    addMessage(ctrlAnt, ctrlAnt, "2.2: validate(AntecedenteCreateRequest)", false, 14);
    addMessage(ctrlAnt, ctrlAnt, "2.3: DB::transaction()", false, 15);
    addMessage(ctrlAnt, entHis, "2.4: firstOrCreate(idPaciente)", false, 16);
    addMessage(entHis, ctrlAnt, "2.5: return historiaClinica", true, 17);
    addMessage(ctrlAnt, entAnt, "2.6: verificarDuplicadoActivo(tipo, descripcion)", false, 18);
    addMessage(entAnt, ctrlAnt, "2.7: return existeDuplicado", true, 19);

    // =========================================================================
    // FRAGMENTO ALT [Guardia: Sin duplicado activo]: Abarca desde Mensaje 2.8 hasta 2.12
    // =========================================================================
    addCombinedFragment(pkg, diagram, "alt", "[no existe antecedente identico activo]", 420, 1330, -1000, -1350);

    // Rama Exitosa:
    addMessage(ctrlAnt, entAnt, "2.8: create(datosAntecedente)", false, 20);
    addMessage(entAnt, ctrlAnt, "2.9: return nuevoAntecedente", true, 21);
    addMessage(ctrlAnt, entBit, "2.10: registrar(CREAR_ANTECEDENTE)", false, 22);
    addMessage(ctrlAnt, bndAnt, "2.11: return antecedente", true, 23);
    addMessage(bndAnt, actMed, "2.12: actualizarListaYAlerta()", true, 24);

    // =========================================================================
    // FRAGMENTO ALT [Guardia: Duplicado identico activo]: Abarca desde Mensaje 2.13 hasta 2.14
    // =========================================================================
    addCombinedFragment(pkg, diagram, "alt", "[duplicado identico ya registrado y activo]", 420, 1330, -1370, -1530);
    addMessage(ctrlAnt, bndAnt, "2.13: 422 Unprocessable (duplicado activo)", true, 25);
    addMessage(bndAnt, actMed, "2.14: notificarErrorDuplicado()", true, 26);

    // FASE 3: Edicion / Actualizacion de Antecedente
    addMessage(actMed, bndAnt, "3: editarAntecedente(id, datos)", false, 27);
    addMessage(bndAnt, ctrlAnt, "3.1: update(id)", false, 28);
    addMessage(ctrlAnt, ctrlAnt, "3.2: validate(AntecedenteUpdateRequest)", false, 29);
    addMessage(ctrlAnt, entAnt, "3.3: update(datos)", false, 30);
    addMessage(entAnt, ctrlAnt, "3.4: return antecedenteActualizado", true, 31);
    addMessage(ctrlAnt, entBit, "3.5: registrar(EDITAR_ANTECEDENTE)", false, 32);
    addMessage(ctrlAnt, bndAnt, "3.6: return antecedenteActualizado", true, 33);
    addMessage(bndAnt, actMed, "3.7: reflejarCambioEnVista()", true, 34);

    // FASE 4: Baja Logica Reversible / Reactivacion (RN11)
    addMessage(actMed, bndAnt, "4: toggleEstado(idAntecedente)", false, 35);
    addMessage(bndAnt, ctrlAnt, "4.1: toggleStatus(id)", false, 36);
    addMessage(ctrlAnt, entAnt, "4.2: findOrFail(id)", false, 37);
    addMessage(ctrlAnt, entAnt, "4.3: save(nuevoEstado)", false, 38);
    addMessage(entAnt, ctrlAnt, "4.4: return estadoActualizado", true, 39);
    addMessage(ctrlAnt, entBit, "4.5: registrar(BAJA_LOGICA_ANTECEDENTE)", false, 40);
    addMessage(ctrlAnt, bndAnt, "4.6: return nuevoEstado", true, 41);
    addMessage(bndAnt, actMed, "4.7: notificarCambioEstado()", true, 42);

    diagram.Update();
    Repository.ReloadDiagram(diagram.DiagramID);
    log("Diagrama de Secuencia CU17 generado exitosamente con 7 participantes (1 Boundary, 1 Controller).");
}

main();
