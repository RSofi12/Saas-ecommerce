option explicit

!INC Local Scripts.EAConstants-VBScript

' ==============================================================================
' Generador VBScript para Enterprise Architect (ICONIX BCE UML 2.5)
' Caso de Uso: CU17 - Procesar Cambio de Prenda por Talla y Cobro de Diferencia
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
        Array("[:ModalCambioPrendaPOS]", "Object", "Interface"), _
        Array("[:GarmentExchangeController]", "Object", "Controller"), _
        Array("[:Sale]", "Object", "Entity"), _
        Array("[:ProductVariant]", "Object", "Entity"), _
        Array("[:GarmentExchange]", "Object", "Entity"), _
        Array("[:Inventory]", "Object", "Entity") _
    )
    mensajes = Array( _
        Array("Cajero", "[:ModalCambioPrendaPOS]", "1: buscarTicketVentaOriginal(ticket_code_o_uuid)", False, "", ""), _
        Array("[:ModalCambioPrendaPOS]", "[:GarmentExchangeController]", "1.1: GET /api/sales/by-ticket/{code} (get_sale_route)", False, "", ""), _
        Array("[:GarmentExchangeController]", "[:Sale]", "1.2: find_sale_by_code(db, tenant_id, code)", False, "", ""), _
        Array("[:Sale]", "[:GarmentExchangeController]", "1.3: db_sale (items, prices)", False, "", ""), _
        Array("[:GarmentExchangeController]", "[:ModalCambioPrendaPOS]", "1.4: HTTP 200 OK (SaleForExchangeResponse)", False, "", ""), _
        Array("[:ModalCambioPrendaPOS]", "Cajero", "1.5: mostrarPrendasDeVentaParaCambio()", False, "", ""), _
        Array("Cajero", "[:ModalCambioPrendaPOS]", "2: seleccionarVarianteNueva(old_var_id, new_var_id)", False, "", ""), _
        Array("[:ModalCambioPrendaPOS]", "[:GarmentExchangeController]", "2.1: POST /api/exchanges/calculate-difference (calc_diff_route)", False, "", ""), _
        Array("[:GarmentExchangeController]", "[:ProductVariant]", "2.2: get_variant_price(db, original_variant_id)", False, "", ""), _
        Array("[:ProductVariant]", "[:GarmentExchangeController]", "2.3: precio_original (Bs 50)", False, "", ""), _
        Array("[:GarmentExchangeController]", "[:ProductVariant]", "2.4: get_variant_price(db, new_variant_id)", False, "", ""), _
        Array("[:ProductVariant]", "[:GarmentExchangeController]", "2.5: precio_nuevo (Bs 70)", False, "", ""), _
        Array("[:GarmentExchangeController]", "[:GarmentExchangeController]", "2.6: calculate_price_difference(70, 50) -> Delta=Bs 20", True, "", ""), _
        Array("[:GarmentExchangeController]", "[:ModalCambioPrendaPOS]", "2.7: HTTP 200 OK (PriceDifferenceResponse: {diff: 20, requiere_pago: true})", False, "", ""), _
        Array("[:ModalCambioPrendaPOS]", "Cajero", "2.8: mostrarMontoDiferenciaACobrar(diff=Bs 20, aviso=""ABONO OBLIGATORIO"")", False, "", ""), _
        Array("Cajero", "[:ModalCambioPrendaPOS]", "3: procesarCambio(sale_id, old_var, new_var, abono_pagado=true, monto=20)", False, "", ""), _
        Array("[:ModalCambioPrendaPOS]", "[:GarmentExchangeController]", "3.1: POST /api/exchanges/process (process_exchange_route)", False, "", ""), _
        Array("[:GarmentExchangeController]", "[:GarmentExchangeController]", "3.2: require_roles(RolEnum.cajero)", True, "", ""), _
        Array("[:GarmentExchangeController]", "[:GarmentExchange]", "3.3a: create_garment_exchange(db, sale_id, old_var, new_var, diff=20, paid=true)", False, "alt", "[cliente abona diferencia de precio]"), _
        Array("[:GarmentExchange]", "[:GarmentExchangeController]", "3.4a: exchange_persisted", False, "alt", "[cliente abona diferencia de precio]"), _
        Array("[:GarmentExchangeController]", "[:Inventory]", "3.5a: reintegrate_returned_stock(db, branch_id, old_var_id, +1)", False, "alt", "[cliente abona diferencia de precio]"), _
        Array("[:GarmentExchangeController]", "[:Inventory]", "3.6a: discount_new_stock(db, branch_id, new_var_id, -1)", False, "alt", "[cliente abona diferencia de precio]"), _
        Array("[:Inventory]", "[:GarmentExchangeController]", "3.7a: inventory_adjusted_ok", False, "alt", "[cliente abona diferencia de precio]"), _
        Array("[:GarmentExchangeController]", "[:ModalCambioPrendaPOS]", "3.8a: HTTP 201 Created (ExchangeReceiptResponse)", False, "alt", "[cliente abona diferencia de precio]"), _
        Array("[:ModalCambioPrendaPOS]", "Cajero", "3.9a: imprimirTicketCambioConsolidado()", False, "alt", "[cliente abona diferencia de precio]"), _
        Array("[:GarmentExchangeController]", "[:ModalCambioPrendaPOS]", "3.3b: HTTP 400 Bad Request (""Operación cancelada: abono no realizado"")", False, "alt", "[cliente rechaza pagar diferencia]"), _
        Array("[:ModalCambioPrendaPOS]", "Cajero", "3.4b: mostrarCancelacionYDevolverPrendaOriginal()", False, "alt", "[cliente rechaza pagar diferencia]") _
    )

    ' Folder rectangular UML CombinedFragment con pestaña "alt"
    fragmentos = Array( _
        Array("Política Inviolable 1: Consolidación Sujeta a Abono de Diferencia", "alt", 190, 1260, -290, -500) _
    )

    crearDiagramaSecuenciaBCE pkg, "CU17 Procesar Cambio de Prenda por Talla y Cobro de Diferencia", "Cajero", lifelines, mensajes, fragmentos
    Session.Prompt "¡Diagrama de Secuencia de CU17 con Folder alt generado con éxito!", promptOK
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
    x = 50 : xStep = 180 : yTop = -50 : yBottom = -540

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
