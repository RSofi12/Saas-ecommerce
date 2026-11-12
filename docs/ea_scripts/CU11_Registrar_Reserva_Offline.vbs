option explicit

!INC Local Scripts.EAConstants-VBScript

' ==============================================================================
' Generador VBScript para Enterprise Architect (ICONIX BCE UML 2.5)
' Caso de Uso: CU11 - Registrar Reserva Offline en Modo Desconectado
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
        Array("[:ModalReservaOffline]", "Object", "Interface"), _
        Array("[:OfflineReservationController]", "Object", "Controller"), _
        Array("[:LocalCatalogCache]", "Object", "Entity"), _
        Array("[:ReservationLocal]", "Object", "Entity"), _
        Array("[:IndexedDBSyncStorage]", "Object", "Entity") _
    )
    mensajes = Array( _
        Array("Cliente / Cajero", "[:ModalReservaOffline]", "1: solicitarReservaOffline(variant_id, branch_id, expires_hours)", False, "", ""), _
        Array("[:ModalReservaOffline]", "[:OfflineReservationController]", "1.1: procesarReservaLocal(variant_id, branch_id, expires_hours)", False, "", ""), _
        Array("[:OfflineReservationController]", "[:LocalCatalogCache]", "1.2: get_local_stock(variant_id, branch_id)", False, "", ""), _
        Array("[:LocalCatalogCache]", "[:OfflineReservationController]", "1.3: local_stock (quantity, reserved)", False, "", ""), _
        Array("[:OfflineReservationController]", "[:OfflineReservationController]", "1.4: evaluate_stock_availability(quantity, reserved)", True, "", ""), _
        Array("[:OfflineReservationController]", "[:OfflineReservationController]", "1.5a: generate_offline_uuid_v4()", True, "alt", "[con stock local disponible]"), _
        Array("[:OfflineReservationController]", "[:ReservationLocal]", "1.6a: create_offline_reservation(uuid, client_id, variant_id, expires_at, PENDIENTE_SYNC)", False, "alt", "[con stock local disponible]"), _
        Array("[:ReservationLocal]", "[:OfflineReservationController]", "1.7a: reservation_created_ok", False, "alt", "[con stock local disponible]"), _
        Array("[:OfflineReservationController]", "[:LocalCatalogCache]", "1.8a: increment_reserved_stock(variant_id, +1)", False, "alt", "[con stock local disponible]"), _
        Array("[:LocalCatalogCache]", "[:OfflineReservationController]", "1.9a: local_stock_updated", False, "alt", "[con stock local disponible]"), _
        Array("[:OfflineReservationController]", "[:IndexedDBSyncStorage]", "1.10a: enqueue_outbox_operation(uuid, tipo=""RESERVA"", payload, PENDIENTE_SYNC)", False, "alt", "[con stock local disponible]"), _
        Array("[:IndexedDBSyncStorage]", "[:OfflineReservationController]", "1.11a: outbox_enqueued_ok", False, "alt", "[con stock local disponible]"), _
        Array("[:OfflineReservationController]", "[:ModalReservaOffline]", "1.12a: confirmacionReservaOffline(uuid, qr_data, expira_en)", False, "alt", "[con stock local disponible]"), _
        Array("[:ModalReservaOffline]", "Cliente / Cajero", "1.13a: renderizarComprobanteReserva(codigo_qr, uuid, aviso=""MODO OFFLINE"")", False, "alt", "[con stock local disponible]"), _
        Array("[:OfflineReservationController]", "[:ModalReservaOffline]", "1.5b: errorStockLocalInsuficiente(""Stock local agotado en sucursal"")", False, "alt", "[sin stock en catalogo local]"), _
        Array("[:ModalReservaOffline]", "Cliente / Cajero", "1.6b: mostrarAlertaSinStockLocal()", False, "alt", "[sin stock en catalogo local]") _
    )

    ' Folder rectangular UML CombinedFragment con pestaña "alt"
    fragmentos = Array( _
        Array("Evaluación de Disponibilidad Local y Reserva Offline", "alt", 190, 1080, -140, -420) _
    )

    crearDiagramaSecuenciaBCE pkg, "CU11 Registrar Reserva Offline en Modo Desconectado", "Cliente / Cajero", lifelines, mensajes, fragmentos
    Session.Prompt "¡Diagrama de Secuencia de CU11 con Folder alt generado con éxito!", promptOK
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
    x = 50 : xStep = 180 : yTop = -50 : yBottom = -450

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
