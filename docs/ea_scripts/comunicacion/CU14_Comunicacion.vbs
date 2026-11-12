option explicit

!INC Local Scripts.EAConstants-VBScript

' ==============================================================================
' Generador VBScript para Enterprise Architect (ICONIX BCE UML 2.5)
' Diagrama de Comunicación: CU14 - Gestionar Bandeja Local de Operaciones (Outbox)
' Proyecto: FashionStore SaaS Multitenant — Sistemas 2
'
' DESCRIPCIÓN CONCEPTUAL:
' El Cajero accede a OutboxPageView para auditar las transacciones locales que aguardan
' conectividad, instruyendo a OutboxManagerController a listar los registros desde
' SyncOutboxStorage e inspeccionar la estructura de datos almacenada en LocalIndexedDB,
' culminando con el despliegue del resumen de transacciones y el indicador ámbar en OutboxPageView.
'
' RESULTADO:
' resultado: transacciones offline pendientes monitoreadas e inspeccionadas en la bandeja local de salida
' ==============================================================================

sub OnDiagramScript()
    dim pkg
    set pkg = Repository.GetTreeSelectedPackage()
    
    if pkg is nothing then
        Session.Prompt "Por favor, selecciona un paquete en el Project Browser antes de ejecutar.", promptOK
        exit sub
    end if

    dim lifelines, mensajes
    lifelines = Array( _
        Array("OutboxPageView", "Boundary", "boundary"), _
        Array("OutboxManagerController", "Control", "control"), _
        Array("SyncOutboxStorage", "Entity", "entity"), _
        Array("LocalIndexedDB", "Entity", "entity") _
    )
    
    mensajes = Array( _
        Array("Cajero", "OutboxPageView", "1: solicitarBandejaPendientes(filtro=""TODOS"")"), _
        Array("OutboxPageView", "OutboxManagerController", "1.1: get_pending_outbox_records()"), _
        Array("OutboxManagerController", "SyncOutboxStorage", "1.2: query_outbox_items(status=""PENDIENTE_SYNC"")"), _
        Array("OutboxManagerController", "LocalIndexedDB", "1.3: read_operation_payload(operation_uuid)"), _
        Array("OutboxManagerController", "OutboxPageView", "1.4: renderizarListaOperacionesYContadorAmber(operaciones, conteo)") _
    )

    crearDiagramaComunicacion pkg, "CU14 Gestionar Bandeja Local de Operaciones (Outbox)", "Cajero", lifelines, mensajes
    Session.Prompt "¡Diagrama de Comunicación de CU14 generado con éxito!", promptOK
end sub

sub crearDiagramaComunicacion(package, nombreDiag, actorName, lifelines, mensajes)
    dim actor
    set actor = crearElem(package, actorName, "Actor", "")

    dim names(), objs()
    dim i, l, n, t, st, ob, cnt
    cnt = 0

    for each l in lifelines
        n = l(0) : t = l(1) : st = l(2)
        set ob = crearElem(package, n, t, st)
        ReDim Preserve names(cnt) : ReDim Preserve objs(cnt)
        names(cnt) = n : set objs(cnt) = ob
        cnt = cnt + 1
    next

    dim diag
    set diag = crearDiagLimpio(package, "Comunicación " & nombreDiag, "Communication")

    ' Colocación horizontal Actor -> Boundary -> Controller -> Entities
    colocElem diag, actor, 50, 130, -80, -160
    colocElem diag, objs(0), 230, 330, -80, -160   ' Boundary
    colocElem diag, objs(1), 430, 530, -80, -160   ' Controller
    
    if UBound(objs) >= 2 then colocElem diag, objs(2), 650, 750, -40, -120
    if UBound(objs) >= 3 then colocElem diag, objs(3), 650, 750, -140, -220

    dim m, orig, dest, txt
    dim origObj, destObj

    for each m in mensajes
        orig = m(0) : dest = m(1) : txt = m(2)

        if orig = actorName then
            set origObj = actor
        else
            set origObj = findLifeline(orig, names, objs)
        end if

        if dest = actorName then
            set destObj = actor
        else
            set destObj = findLifeline(dest, names, objs)
        end if

        if not origObj is nothing and not destObj is nothing then
            crearMsgComunicacion origObj, destObj, txt
        end if
    next

    Repository.SaveDiagram diag.DiagramID
    Repository.ReloadDiagram diag.DiagramID
    Repository.OpenDiagram diag.DiagramID
end sub

function findLifeline(n, names, objs)
    dim i
    for i = 0 to UBound(names)
        if names(i) = n then
            set findLifeline = objs(i)
            exit function
        end if
    next
    set findLifeline = nothing
end function

function crearElem(pkg, name, tipo, st)
    dim el
    for each el in pkg.Elements
        if el.Name = name and el.Type = tipo then
            if st <> "" and el.Stereotype <> st then
                el.Stereotype = st
                el.Update()
            end if
            set crearElem = el
            exit function
        end if
    next
    set el = pkg.Elements.AddNew(name, tipo)
    if st <> "" then el.Stereotype = st
    el.Update()
    pkg.Elements.Refresh()
    set crearElem = el
end function

function crearDiagLimpio(pkg, name, tipo)
    dim d, i
    for each d in pkg.Diagrams
        if d.Name = name then
            for i = d.DiagramObjects.Count - 1 to 0 step -1
                d.DiagramObjects.Delete i
            next
            for i = d.DiagramLinks.Count - 1 to 0 step -1
                d.DiagramLinks.Delete i
            next
            d.DiagramObjects.Refresh()
            d.DiagramLinks.Refresh()
            d.Update()
            set crearDiagLimpio = d
            exit function
        end if
    next
    set d = pkg.Diagrams.AddNew(name, tipo)
    d.Update()
    pkg.Diagrams.Refresh()
    set crearDiagLimpio = d
end function

sub colocElem(diag, el, l, r, t, b)
    dim dObj
    set dObj = diag.DiagramObjects.AddNew("l=" & l & ";r=" & r & ";t=" & t & ";b=" & b & ";", "")
    dObj.ElementID = el.ElementID
    dObj.Update()
end sub

sub crearMsgComunicacion(orig, dest, txt)
    dim c
    set c = orig.Connectors.AddNew(txt, "Association")
    c.SupplierID = dest.ElementID
    c.Direction = "Source -> Destination"
    c.Update()
end sub

OnDiagramScript
