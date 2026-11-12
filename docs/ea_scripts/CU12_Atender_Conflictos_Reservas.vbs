option explicit

!INC Local Scripts.EAConstants-VBScript

' ==============================================================================
' Generador VBScript para Enterprise Architect (ICONIX BCE UML 2.5)
' Caso de Uso: CU12 - Atender y Resolver Conflictos de Reservas Expiradas
' Proyecto: FashionStore SaaS Multitenant — Sistemas 2
' ==============================================================================

sub OnDiagramScript()
    dim pkg
    set pkg = Repository.GetTreeSelectedPackage()
    
    if pkg is nothing then
        Session.Prompt "Por favor, selecciona un paquete en el Project Browser antes de ejecutar.", promptOK
        exit sub
    end if

    dim lifelines, mensajes, fragmentos
    lifelines = Array( _
        Array("[:BandejaReservasView]", "Object", "Interface"), _
        Array("[:ReservationConflictController]", "Object", "Controller"), _
        Array("[:Reservation]", "Object", "Entity"), _
        Array("[:Inventory]", "Object", "Entity"), _
        Array("[:InventoryMovement]", "Object", "Entity") _
    )
    mensajes = Array( _
        Array("Encargado de Sucursal", "[:BandejaReservasView]", "1: consultarReservasVencidas(branch_id)", False, "", ""), _
        Array("[:BandejaReservasView]", "[:ReservationConflictController]", "1.1: GET /api/reservations/expired?branch_id=... (expired_reservations_route)", False, "", ""), _
        Array("[:ReservationConflictController]", "[:Reservation]", "1.2: find_expired_reservations(db, tenant_id, branch_id, now())", False, "", ""), _
        Array("[:Reservation]", "[:ReservationConflictController]", "1.3: list[Reservation] (status=RESERVADA, expires_at < now)", False, "", ""), _
        Array("[:ReservationConflictController]", "[:BandejaReservasView]", "1.4: HTTP 200 OK (list[ReservationResponse])", False, "", ""), _
        Array("[:BandejaReservasView]", "Encargado de Sucursal", "1.5: mostrarBandejaReservasVencidas(reservas_expiradas)", False, "", ""), _
        Array("Encargado de Sucursal", "[:BandejaReservasView]", "2: confirmarLiberacionStock(reservation_id, accion=""EXPIRAR_Y_LIBERAR"")", False, "", ""), _
        Array("[:BandejaReservasView]", "[:ReservationConflictController]", "2.1: PATCH /api/reservations/{id}/expire-and-release (expire_route)", False, "", ""), _
        Array("[:ReservationConflictController]", "[:ReservationConflictController]", "2.2: require_roles(RolEnum.encargado, RolEnum.administrador)", True, "", ""), _
        Array("[:ReservationConflictController]", "[:Reservation]", "2.3: get_reservation_by_id(db, reservation_id)", False, "", ""), _
        Array("[:Reservation]", "[:ReservationConflictController]", "2.4: db_reservation", False, "", ""), _
        Array("[:ReservationConflictController]", "[:Reservation]", "2.5a: mark_as_expired_and_cancelled(db, reservation_id, audit_user_id)", False, "alt", "[reserva válida y expirada]"), _
        Array("[:Reservation]", "[:ReservationConflictController]", "2.6a: reservation_updated (status=EXPIRADA_CANCELADA)", False, "alt", "[reserva válida y expirada]"), _
        Array("[:ReservationConflictController]", "[:Inventory]", "2.7a: release_reserved_stock(db, branch_id, variant_id, quantity)", False, "alt", "[reserva válida y expirada]"), _
        Array("[:Inventory]", "[:ReservationConflictController]", "2.8a: inventory_released_ok", False, "alt", "[reserva válida y expirada]"), _
        Array("[:ReservationConflictController]", "[:InventoryMovement]", "2.9a: register_movement(db, tipo=""REINTEGRO_POR_EXPIRACION"", qty)", False, "alt", "[reserva válida y expirada]"), _
        Array("[:InventoryMovement]", "[:ReservationConflictController]", "2.10a: movement_recorded", False, "alt", "[reserva válida y expirada]"), _
        Array("[:ReservationConflictController]", "[:BandejaReservasView]", "2.11a: HTTP 200 OK (""Stock liberado y retornado a disponibilidad"")", False, "alt", "[reserva válida y expirada]"), _
        Array("[:BandejaReservasView]", "Encargado de Sucursal", "2.12a: actualizarVistaBandejaYStock()", False, "alt", "[reserva válida y expirada]"), _
        Array("[:ReservationConflictController]", "[:BandejaReservasView]", "2.5b: HTTP 400 Bad Request (""La reserva ya no está en estado RESERVADA"")", False, "alt", "[reserva no cancelable]"), _
        Array("[:BandejaReservasView]", "Encargado de Sucursal", "2.6b: mostrarErrorEstadoInvalido()", False, "alt", "[reserva no cancelable]") _
    )

    ' Folder rectangular UML CombinedFragment con pestaña "alt"
    fragmentos = Array( _
        Array("Validación de Estado y Liberación de Stock Expirado", "alt", 190, 1080, -220, -430) _
    )

    crearDiagramaSecuenciaBCE pkg, "CU12 Atender y Resolver Conflictos de Reservas Expiradas", "Encargado de Sucursal", lifelines, mensajes, fragmentos
    Session.Prompt "¡Diagrama de Secuencia de CU12 con Folder alt generado con éxito!", promptOK
end sub

sub crearDiagramaSecuenciaBCE(package, nombreDiag, actorName, lifelines, mensajes, fragmentos)
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
    set diag = crearDiagLimpio(package, "Secuencia " & nombreDiag, "Sequence")

    dim x, xStep, yTop, yBottom
    x = 50 : xStep = 180 : yTop = -50 : yBottom = -470

    colocElem diag, actor, x, x + 70, yTop, yBottom
    x = x + xStep

    dim j
    for j = 0 to UBound(objs)
        colocElem diag, objs(j), x, x + 70, yTop, yBottom
        x = x + xStep
    next

    dim m, orig, dest, txt, isSelf, altFrag, cond
    dim origObj, destObj

    for each m in mensajes
        orig = m(0) : dest = m(1) : txt = m(2)
        isSelf = m(3) : altFrag = m(4) : cond = m(5)

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
            crearMsgSeq origObj, destObj, txt, altFrag, cond
        end if
    next

    ' Crear las cajas gráficas tipo Folder (CombinedFragment)
    dim f, fNom, fOp, fL, fR, fT, fB
    for each f in fragmentos
        fNom = f(0) : fOp = f(1) : fL = f(2) : fR = f(3) : fT = f(4) : fB = f(5)
        crearFolderFragmento package, diag, fNom, fOp, fL, fR, fT, fB
    next

    Repository.SaveDiagram diag.DiagramID
    Repository.ReloadDiagram diag.DiagramID
    Repository.OpenDiagram diag.DiagramID
end sub

sub crearFolderFragmento(package, diagram, nombre, operador, left, right, top, bottom)
    dim frag, el
    set frag = nothing
    for each el in package.Elements
        if el.Name = nombre and el.Type = "InteractionFragment" then
            set frag = el
            exit for
        end if
    next

    if frag is nothing then
        set frag = package.Elements.AddNew(operador, "InteractionFragment")
    end if

    frag.Stereotype = operador
    frag.Update()
    package.Elements.Refresh()

    on error resume next
    dim tv
    set tv = frag.TaggedValues.AddNew("interactionOperator", operador)
    tv.Update()
    on error goto 0

    dim diagObj
    set diagObj = diagram.DiagramObjects.AddNew("l=" & left & ";r=" & right & ";t=" & top & ";b=" & bottom & ";", "")
    diagObj.ElementID = frag.ElementID
    diagObj.Update()
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

sub crearMsgSeq(orig, dest, txt, altFrag, cond)
    dim c
    set c = orig.Connectors.AddNew("", "Sequence")
    c.SupplierID = dest.ElementID
    if altFrag <> "" and cond <> "" then
        c.Name = txt & " [" & cond & "]"
    else
        c.Name = txt
    end if
    c.Update()
end sub

OnDiagramScript
