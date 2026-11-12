option explicit

!INC Local Scripts.EAConstants-VBScript

' ==============================================================================
' Generador VBScript para Enterprise Architect (ICONIX BCE UML 2.5)
' Diagrama de Comunicación: CU13 - Registrar Venta POS Desconectada en Efectivo UUIDv4
' Proyecto: FashionStore SaaS Multitenant — Sistemas 2
'
' DESCRIPCIÓN CONCEPTUAL:
' El Cajero procesa el cobro al contado en POSOfflinePageView ante la falta de conexión,
' solicitando la operación a POSOfflineController que valida la regla de pago exclusivo
' en efectivo, persiste la venta con UUIDv4 en LocalSale, descuenta las prendas en
' LocalInventoryCache para impedir sobreventas locales y registra la operación en
' SyncOutboxStorage, ordenando a POSOfflinePageView emitir el comprobante de contingencia.
'
' RESULTADO:
' resultado: venta offline en efectivo asentada en almacén local con UUIDv4 y stock preventivo descontado
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
        Array("POSOfflinePageView", "Boundary", "boundary"), _
        Array("POSOfflineController", "Control", "control"), _
        Array("LocalSale", "Entity", "entity"), _
        Array("LocalInventoryCache", "Entity", "entity"), _
        Array("SyncOutboxStorage", "Entity", "entity") _
    )
    
    mensajes = Array( _
        Array("Cajero", "POSOfflinePageView", "1: cobrarVentaEfectivo(items, metodo=""EFECTIVO"", montoRecibido)"), _
        Array("POSOfflinePageView", "POSOfflineController", "1.1: process_offline_cash_sale(items, metodo, montoRecibido)"), _
        Array("POSOfflineController", "LocalSale", "1.2: insert_local_sale(uuid, items, total, PENDIENTE_SYNC)"), _
        Array("POSOfflineController", "LocalInventoryCache", "1.3: decrement_local_stock(variant_ids, quantities)"), _
        Array("POSOfflineController", "SyncOutboxStorage", "1.4: enqueue_sync_operation(uuid, payload_venta)"), _
        Array("POSOfflineController", "POSOfflinePageView", "1.5: imprimirTicketContingencia(uuid, total, cambio)") _
    )

    crearDiagramaComunicacion pkg, "CU13 Registrar Venta POS Desconectada en Efectivo UUIDv4", "Cajero", lifelines, mensajes
    Session.Prompt "¡Diagrama de Comunicación de CU13 generado con éxito!", promptOK
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
