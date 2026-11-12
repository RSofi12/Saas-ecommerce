# GUÍA Y ESTÁNDAR OFICIAL: DIAGRAMAS DE COMUNICACIÓN (UML 2.5+)
### FashionStore SaaS Multitenant — Sistemas 2

Con los mismos parámetros del digr. de secuencia, también haces el diagrama de comunicación de los CU, con la distribución horizontal, y estos parámetros:

- **Distribución horizontal:** `Actor → Pantalla → Controlador → Entidades`
  Tanto para los componentes como los mensajes.
- **Nombres de participantes:** No es necesario que indiquen su estereotipo en el texto, solo los nombres de los participantes.
- **Reglas UML 2.5+:** Sigue las reglas UML 2.5+.
- **Iconos de componentes:** Para este diagrama SÍ utilizas los iconos correspondientes para cada componente (`boundary`, `controller`, `entity/model`).
- **Nombres de funciones del código:** Los mensajes igual deben ser los nombres de las funciones según el código del proyecto.
- **Regla de retorno de entidades:** Las entidades NO deben enviar mensajes de regreso a los controllers.
- **Regla de recursividad:** Los controllers NO deben enviar mensajes recursivos hacia sí mismos.
- **Mensajes a boundaries:** Los controllers pueden enviar mensajes (`funciones()`) a los boundary si lo requiere.
- **Descripción conceptual:** También me das una breve descripción conceptual del flujo/pasos de este diagrama usando los nombres de los componentes, en un solo párrafo.
- **Conclusión final obligatoria:** Y al final una breve conclusión como:
  `resultado: descripcion_delEstadoPosterior`

---

## Plantilla VBScript Canónica para Enterprise Architect

```vbscript
option explicit

!INC Local Scripts.EAConstants-VBScript

sub OnDiagramScript()
    dim currentPackage
    set currentPackage = Repository.GetTreeSelectedPackage()
    
    if currentPackage is nothing then
        Session.Prompt "Selecciona un paquete en el Project Browser", promptOK
        exit sub
    end if

    ' -------------------------------------------------------------
    ' 1. Crear los elementos con estereotipos
    ' -------------------------------------------------------------
    ' Actor
    dim actorCliente
    set actorCliente = crearElemento(currentPackage, "Cliente", "Actor")
    
    ' Boundary (UI)
    dim uiRegistro
    set uiRegistro = crearElementoConEsterotipo(currentPackage, "UI_Registro", "Object", "boundary")
    
    ' Control (Controller)
    dim registroController
    set registroController = crearElementoConEsterotipo(currentPackage, "RegistroController", "Object", "control")
    
    ' Entity (Usuario)
    dim usuario
    set usuario = crearElementoConEsterotipo(currentPackage, "Usuario", "Object", "entity")
    
    ' Entity (Bitacora)
    dim bitacora
    set bitacora = crearElementoConEsterotipo(currentPackage, "Bitacora", "Object", "entity")

    ' -------------------------------------------------------------
    ' 2. Crear el diagrama de comunicación (Collaboration)
    ' -------------------------------------------------------------
    dim diagram
    set diagram = crearDiagramaLimpio(currentPackage, "Comunicación CU-01 - Registrarse")

    ' -------------------------------------------------------------
    ' 3. Posicionar los elementos en línea horizontal
    '    Actor a la izquierda, objetos en fila hacia la derecha
    ' -------------------------------------------------------------
    colocarElemento diagram, actorCliente, "50", "150", "-80", "-180"
    colocarElemento diagram, uiRegistro, "250", "400", "-80", "-180"
    colocarElemento diagram, registroController, "450", "600", "-80", "-180"
    colocarElemento diagram, usuario, "650", "800", "-80", "-180"
    colocarElemento diagram, bitacora, "850", "1000", "-80", "-180"

    ' -------------------------------------------------------------
    ' 4. Crear los mensajes con numeración estilo ejemplo
    ' -------------------------------------------------------------
    ' 0.1: request() desde Cliente hacia UI_Registro
    crearMensaje actorCliente, uiRegistro, "0.1: request()"
    
    ' 1: procesarRegistro() autollamada de UI_Registro
    crearMensaje uiRegistro, uiRegistro, "1: procesarRegistro()"
    
    ' 1.1: validarDatos() desde UI_Registro hacia RegistroController
    crearMensaje uiRegistro, registroController, "1.1: validarDatos()"
    
    ' 1.2: crearUsuario() desde RegistroController hacia Usuario
    crearMensaje registroController, usuario, "1.2: crearUsuario()"
    
    ' 1.3: registrar() desde RegistroController hacia Bitacora
    crearMensaje registroController, bitacora, "1.3: registrar()"
    
    ' 2: confirmacion() desde RegistroController hacia UI_Registro
    crearMensaje registroController, uiRegistro, "2: confirmacion()"
    
    ' 3: mostrarConfirmacion() desde UI_Registro hacia Cliente
    crearMensaje uiRegistro, actorCliente, "3: mostrarConfirmacion()"

    ' -------------------------------------------------------------
    ' 5. Guardar, refrescar y abrir el diagrama
    ' -------------------------------------------------------------
    Repository.SaveDiagram diagram.DiagramID
    Repository.ReloadDiagram diagram.DiagramID
    Repository.OpenDiagram diagram.DiagramID

    Session.Prompt "Diagrama de comunicación para CU-01 con Boundary/Control/Entity generado exitosamente.", promptOK
end sub

' -------------------------------------------------------------
' Funciones auxiliares
' -------------------------------------------------------------

function crearElemento(package, name, tipo)
    dim el
    for each el in package.Elements
        if el.Name = name and el.Type = tipo then
            set crearElemento = el
            exit function
        end if
    next
    set el = package.Elements.AddNew(name, tipo)
    el.Update()
    package.Elements.Refresh()
    set crearElemento = el
end function

function crearElementoConEsterotipo(package, name, tipo, estereotipo)
    dim el
    for each el in package.Elements
        if el.Name = name and el.Type = tipo then
            if el.Stereotype <> estereotipo then
                el.Stereotype = estereotipo
                el.Update()
            end if
            set crearElementoConEsterotipo = el
            exit function
        end if
    next
    set el = package.Elements.AddNew(name, tipo)
    el.Stereotype = estereotipo
    el.Update()
    package.Elements.Refresh()
    set crearElementoConEsterotipo = el
end function

function crearDiagramaLimpio(package, name)
    dim diag, i
    for each diag in package.Diagrams
        if diag.Name = name then
            for i = diag.DiagramObjects.Count - 1 to 0 step -1
                diag.DiagramObjects.Delete i
            next
            for i = diag.DiagramLinks.Count - 1 to 0 step -1
                diag.DiagramLinks.Delete i
            next
            diag.DiagramObjects.Refresh()
            diag.DiagramLinks.Refresh()
            diag.Update()
            set crearDiagramaLimpio = diag
            exit function
        end if
    next
    set diag = package.Diagrams.AddNew(name, "Collaboration")
    diag.Update()
    package.Diagrams.Refresh()
    set crearDiagramaLimpio = diag
end function

sub colocarElemento(diagram, elemento, left, right, top, bottom)
    dim diagObj
    set diagObj = diagram.DiagramObjects.AddNew("l=" & left & ";r=" & right & ";t=" & top & ";b=" & bottom & ";", "")
    diagObj.ElementID = elemento.ElementID
    diagObj.Update()
end sub

sub crearMensaje(origen, destino, texto)
    dim con
    for each con in origen.Connectors
        if con.SupplierID = destino.ElementID and con.Type = "Association" then
            if con.Name = texto then exit sub
        end if
    next
    set con = origen.Connectors.AddNew("", "Association")
    con.SupplierID = destino.ElementID
    con.Name = texto
    con.Update()
end sub

OnDiagramScript
```