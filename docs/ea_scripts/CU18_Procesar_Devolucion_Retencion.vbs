option explicit

!INC Local Scripts.EAConstants-VBScript

' ==============================================================================
' Generador VBScript para Enterprise Architect (ICONIX BCE UML 2.5)
' Caso de Uso: CU18 - Procesar Devolución con Retención y Nota de Crédito
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
        Array("[:ModalDevolucionPrendaPOS]", "Object", "Interface"), _
        Array("[:GarmentReturnController]", "Object", "Controller"), _
        Array("[:Sale]", "Object", "Entity"), _
        Array("[:GarmentReturn]", "Object", "Entity"), _
        Array("[:CreditNote]", "Object", "Entity"), _
        Array("[:Inventory]", "Object", "Entity") _
    )
    mensajes = Array( _
        Array("Cajero", "[:ModalDevolucionPrendaPOS]", "1: consultarTicketDevolucion(ticket_id, variant_id)", False, "", ""), _
        Array("[:ModalDevolucionPrendaPOS]", "[:GarmentReturnController]", "1.1: POST /api/returns/calculate-retention (calc_retention_route)", False, "", ""), _
        Array("[:GarmentReturnController]", "[:Sale]", "1.2: get_sale_item_price(db, ticket_id, variant_id)", False, "", ""), _
        Array("[:Sale]", "[:GarmentReturnController]", "1.3: precio_pagado (Bs 100)", False, "", ""), _
        Array("[:GarmentReturnController]", "[:GarmentReturnController]", "1.4: apply_return_policy(monto=100, retencion_pct=30%)", True, "", ""), _
        Array("[:GarmentReturnController]", "[:ModalDevolucionPrendaPOS]", "1.5: HTTP 200 OK (Desglose: {retencion_bs: 30, reembolso_bs: 70})", False, "", ""), _
        Array("[:ModalDevolucionPrendaPOS]", "Cajero", "1.6: mostrarDesgloseRetencion(pagado=100, retencion_30=30, reembolso_70=70)", False, "", ""), _
        Array("Cajero", "[:ModalDevolucionPrendaPOS]", "2: procesarDevolucion(sale_id, var_id, modalidad=""NOTA_CREDITO"", acepta=true)", False, "", ""), _
        Array("[:ModalDevolucionPrendaPOS]", "[:GarmentReturnController]", "2.1: POST /api/returns/process (process_return_route)", False, "", ""), _
        Array("[:GarmentReturnController]", "[:GarmentReturnController]", "2.2: require_roles(RolEnum.cajero, RolEnum.encargado)", True, "", ""), _
        Array("[:GarmentReturnController]", "[:GarmentReturn]", "2.3a: create_garment_return(db, sale_id, var_id, ret=30, reemb=70)", False, "alt", "[cliente acepta condiciones de devolución]"), _
        Array("[:GarmentReturn]", "[:GarmentReturnController]", "2.4a: return_persisted", False, "alt", "[cliente acepta condiciones de devolución]"), _
        Array("[:GarmentReturnController]", "[:CreditNote]", "2.5a: generate_credit_note(db, tenant_id, client_id, amount=70, code=""NC-UUID"")", False, "alt", "[cliente acepta condiciones de devolución]"), _
        Array("[:CreditNote]", "[:GarmentReturnController]", "2.6a: credit_note_created", False, "alt", "[cliente acepta condiciones de devolución]"), _
        Array("[:GarmentReturnController]", "[:Inventory]", "2.7a: reintegrate_returned_stock(db, branch_id, variant_id, +1)", False, "alt", "[cliente acepta condiciones de devolución]"), _
        Array("[:Inventory]", "[:GarmentReturnController]", "2.8a: inventory_reintegrated_ok", False, "alt", "[cliente acepta condiciones de devolución]"), _
        Array("[:GarmentReturnController]", "[:ModalDevolucionPrendaPOS]", "2.9a: HTTP 201 Created (ReturnReceiptResponse: code=""NC-UUID"")", False, "alt", "[cliente acepta condiciones de devolución]"), _
        Array("[:ModalDevolucionPrendaPOS]", "Cajero", "2.10a: imprimirNotaCreditoYComprobanteDevolucion()", False, "alt", "[cliente acepta condiciones de devolución]"), _
        Array("[:GarmentReturnController]", "[:ModalDevolucionPrendaPOS]", "2.3b: HTTP 400 Bad Request (""Devolución rechazada: cliente no acepta retención"")", False, "alt", "[cliente rechaza o prenda no califica]"), _
        Array("[:ModalDevolucionPrendaPOS]", "Cajero", "2.4b: mostrarCancelacionDevolucion()", False, "alt", "[cliente rechaza o prenda no califica]") _
    )

    ' Folder rectangular UML CombinedFragment con pestaña "alt"
    fragmentos = Array( _
        Array("Política Inviolable 2: Retención 20%-50% y Emisión de Nota de Crédito", "alt", 190, 1260, -230, -480) _
    )

    crearDiagramaSecuenciaBCE pkg, "CU18 Procesar Devolución con Retención y Nota de Crédito", "Cajero", lifelines, mensajes, fragmentos
    Session.Prompt "¡Diagrama de Secuencia de CU18 con Folder alt generado con éxito!", promptOK
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
    x = 50 : xStep = 180 : yTop = -50 : yBottom = -520

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
