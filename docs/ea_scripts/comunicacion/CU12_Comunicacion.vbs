option explicit

!INC Local Scripts.EAConstants-VBScript

' ==============================================================================
' Generador VBScript para Enterprise Architect (ICONIX BCE UML 2.5)
' Diagrama de Comunicación: CU12 - Atender y Resolver Conflictos de Reservas Expiradas
' Proyecto: FashionStore SaaS Multitenant — Sistemas 2
'
' DESCRIPCIÓN CONCEPTUAL:
' El Encargado identifica reservas vencidas en BandejaReservasView y comanda la
' liberación de existencias a ReservationConflictController, quien actualiza el
' estado a cancelado por caducidad en Reservation, reincorpora las unidades bloqueadas
' al saldo disponible en Inventory y asienta la auditoría de ajuste en
' InventoryMovement, refrescando finalmente BandejaReservasView con el inventario reintegrado.
'
' RESULTADO:
' resultado: prendas de reserva expirada reintegradas al stock disponible y movimiento contable auditado
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
        Array("BandejaReservasView", "Boundary", "boundary"), _
        Array("ReservationConflictController", "Control", "control"), _
        Array("Reservation", "Entity", "entity"), _
        Array("Inventory", "Entity", "entity"), _
        Array("InventoryMovement", "Entity", "entity") _
    )
    
    mensajes = Array( _
        Array("Encargado", "BandejaReservasView", "1: solicitarLiberacionReservaExpirada(reservation_id)"), _
        Array("BandejaReservasView", "ReservationConflictController", "1.1: PATCH /api/reservations/{id}/expire-and-release (expire_route)"), _
        Array("ReservationConflictController", "Reservation", "1.2: update_reservation_status(db, id, EXPIRADA_CANCELADA)"), _
        Array("ReservationConflictController", "Inventory", "1.3: release_reserved_stock(db, branch_id, variant_id, qty)"), _
        Array("ReservationConflictController", "InventoryMovement", "1.4: register_inventory_movement(db, tipo=""REINTEGRO_EXPIRACION"", qty)"), _
        Array("ReservationConflictController", "BandejaReservasView", "1.5: notificarStockLiberado(mensajeConfirmacion)") _
    )

    crearDiagramaComunicacion pkg, "CU12 Atender y Resolver Conflictos de Reservas Expiradas", "Encargado", lifelines, mensajes
    Session.Prompt "¡Diagrama de Comunicación de CU12 generado con éxito!", promptOK
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
    
    if UBound(objs) >= 2 then colocElem diag, objs(2), 650, 750, -20, -100
    if UBound(objs) >= 3 then colocElem diag, objs(3), 650, 750, -100, -180
    if UBound(objs) >= 4 then colocElem diag, objs(4), 650, 750, -180, -260

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
