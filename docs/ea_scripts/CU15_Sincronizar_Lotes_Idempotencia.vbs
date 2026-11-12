option explicit

!INC Local Scripts.EAConstants-VBScript

' ==============================================================================
' Generador VBScript para Enterprise Architect (ICONIX BCE UML 2.5)
' Caso de Uso: CU15 - Sincronizar Lotes de Ventas con Idempotencia Central
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
        Array("[:BackgroundSyncWorker]", "Object", "Interface"), _
        Array("[:BatchSyncController]", "Object", "Controller"), _
        Array("[:SyncOperation]", "Object", "Entity"), _
        Array("[:Sale]", "Object", "Entity"), _
        Array("[:Inventory]", "Object", "Entity") _
    )
    mensajes = Array( _
        Array("Sync Engine", "[:BackgroundSyncWorker]", "1: detectarConexionOnlineYDispararLote()", False, "", ""), _
        Array("[:BackgroundSyncWorker]", "[:BatchSyncController]", "1.1: POST /api/sales/offline/batch-sync (batch_sync_sales_route)", False, "", ""), _
        Array("[:BatchSyncController]", "[:BatchSyncController]", "1.2: require_roles(RolEnum.cajero, RolEnum.encargado, RolEnum.sistema)", True, "", ""), _
        Array("[:BatchSyncController]", "[:SyncOperation]", "1.3: find_sync_operation(db, tenant_id, client_operation_id=uuid)", False, "loop", "[por cada venta offline en lote]"), _
        Array("[:SyncOperation]", "[:BatchSyncController]", "1.4: existing_operation", False, "loop", "[por cada venta offline en lote]"), _
        Array("[:BatchSyncController]", "[:Sale]", "1.5a: create_sale_from_offline(db, uuid, items, total, cash)", False, "alt", "[operación nueva UUID inexistente]"), _
        Array("[:Sale]", "[:BatchSyncController]", "1.6a: new_sale_persisted", False, "alt", "[operación nueva UUID inexistente]"), _
        Array("[:BatchSyncController]", "[:Inventory]", "1.7a: discount_inventory_stock(db, branch_id, items)", False, "alt", "[operación nueva UUID inexistente]"), _
        Array("[:Inventory]", "[:BatchSyncController]", "1.8a: inventory_discounted_ok", False, "alt", "[operación nueva UUID inexistente]"), _
        Array("[:BatchSyncController]", "[:SyncOperation]", "1.9a: record_sync_operation(db, uuid, status=""APLICADO"", now)", False, "alt", "[operación nueva UUID inexistente]"), _
        Array("[:SyncOperation]", "[:BatchSyncController]", "1.10a: sync_operation_recorded", False, "alt", "[operación nueva UUID inexistente]"), _
        Array("[:BatchSyncController]", "[:BatchSyncController]", "1.5b: log_idempotent_skip(uuid, ""Venta ya procesada previamente"")", True, "alt", "[operación duplicada UUID existente]"), _
        Array("[:BatchSyncController]", "[:BackgroundSyncWorker]", "1.11: HTTP 200 OK (BatchSyncResponse: {procesados, omitidos, conflictos})", False, "", ""), _
        Array("[:BackgroundSyncWorker]", "Sync Engine", "1.12: actualizarBandejaLocalYCambiarIndicadorVerde()", False, "", "") _
    )

    ' Folders rectangulares UML CombinedFragment
    fragmentos = Array( _
        Array("Iteración sobre Lote de Ventas Offline", "loop", 190, 1080, -110, -420), _
        Array("Evaluación de Idempotencia por UUID", "alt", 220, 1050, -160, -380) _
    )

    crearDiagramaSecuenciaBCE pkg, "CU15 Sincronizar Lotes de Ventas con Idempotencia Central", "Sync Engine", lifelines, mensajes, fragmentos
    Session.Prompt "¡Diagrama de Secuencia de CU15 con Folders loop y alt generado con éxito!", promptOK
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
