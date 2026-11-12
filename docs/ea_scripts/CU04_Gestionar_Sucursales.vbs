option explicit

!INC Local Scripts.EAConstants-VBScript

' ==============================================================================
' Generador VBScript para Enterprise Architect (ICONIX BCE UML 2.5)
' Caso de Uso: CU04 - Gestionar Sucursales Bajo Límites del Plan
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
        Array("[:ModalCrearSucursal]", "Object", "Interface"), _
        Array("[:BranchController]", "Object", "Controller"), _
        Array("[:Subscription]", "Object", "Entity"), _
        Array("[:Plan]", "Object", "Entity"), _
        Array("[:Branch]", "Object", "Entity") _
    )
    mensajes = Array( _
        Array("AdministradorTenant", "[:ModalCrearSucursal]", "1: ingresarDatosSucursal(nombre, direccion, lat, lng, tel)", False, "", ""), _
        Array("[:ModalCrearSucursal]", "[:BranchController]", "1.1: POST /api/branches/ (create_branch_route)", False, "", ""), _
        Array("[:BranchController]", "[:BranchController]", "1.2: extract_tenant_id_from_jwt(token)", True, "", ""), _
        Array("[:BranchController]", "[:Subscription]", "1.3: get_active_subscription(db, tenant_id)", False, "", ""), _
        Array("[:Subscription]", "[:BranchController]", "1.4: db_subscription (plan_id)", False, "", ""), _
        Array("[:BranchController]", "[:Plan]", "1.5: get_plan_quota(db, plan_id)", False, "", ""), _
        Array("[:Plan]", "[:BranchController]", "1.6: max_branches (2 o 10)", False, "", ""), _
        Array("[:BranchController]", "[:Branch]", "1.7: count_branches(db, tenant_id, is_active=True)", False, "", ""), _
        Array("[:Branch]", "[:BranchController]", "1.8: current_count", False, "", ""), _
        Array("[:BranchController]", "[:ModalCrearSucursal]", "1.9a: HTTP 400 Bad Request (""Límite de sucursales alcanzado"")", False, "alt", "[current_count >= max_branches]"), _
        Array("[:ModalCrearSucursal]", "AdministradorTenant", "1.10a: mostrarAlertaUpgradePlan()", False, "alt", "[current_count >= max_branches]"), _
        Array("[:BranchController]", "[:Branch]", "1.9b: create_branch(db, tenant_id, nombre, direccion, lat, lng)", False, "alt", "[current_count < max_branches]"), _
        Array("[:Branch]", "[:BranchController]", "1.10b: new_branch (id)", False, "alt", "[current_count < max_branches]"), _
        Array("[:BranchController]", "[:ModalCrearSucursal]", "1.11b: HTTP 201 Created (BranchResponse)", False, "alt", "[current_count < max_branches]"), _
        Array("[:ModalCrearSucursal]", "AdministradorTenant", "1.12b: actualizarListadoYMarcadorMapa()", False, "alt", "[current_count < max_branches]") _
    )

    ' Folder rectangular UML CombinedFragment con pestaña "alt"
    fragmentos = Array( _
        Array("Verificación de Límite de Sucursales del Plan", "alt", 190, 1040, -130, -420) _
    )

    crearDiagramaSecuenciaBCE pkg, "CU04 Gestionar Sucursales Bajo Límites del Plan", "AdministradorTenant", lifelines, mensajes, fragmentos
    Session.Prompt "¡Diagrama de Secuencia de CU04 con Folder alt generado con éxito!", promptOK
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
