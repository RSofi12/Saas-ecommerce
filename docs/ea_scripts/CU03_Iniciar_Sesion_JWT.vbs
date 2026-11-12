option explicit

!INC Local Scripts.EAConstants-VBScript

' ==============================================================================
' Generador VBScript para Enterprise Architect (ICONIX BCE UML 2.5)
' Caso de Uso: CU03 - Iniciar Sesión Multitenant con JWT
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
        Array("[:LoginView]", "Object", "Interface"), _
        Array("[:AuthController]", "Object", "Controller"), _
        Array("[:User]", "Object", "Entity"), _
        Array("[:Company]", "Object", "Entity"), _
        Array("[:Subscription]", "Object", "Entity") _
    )
    mensajes = Array( _
        Array("Usuario", "[:LoginView]", "1: ingresarCredenciales(email, password)", False, "", ""), _
        Array("[:LoginView]", "[:AuthController]", "1.1: POST /api/auth/login (login_route)", False, "", ""), _
        Array("[:AuthController]", "[:User]", "1.2: get_by_email(db, email)", False, "", ""), _
        Array("[:User]", "[:AuthController]", "1.3: db_user", False, "", ""), _
        Array("[:AuthController]", "[:LoginView]", "1.4a: HTTP 401 Unauthorized (""Credenciales inválidas"")", False, "alt", "[Usuario no encontrado o inactivo]"), _
        Array("[:LoginView]", "Usuario", "1.5a: mostrarErrorCredenciales()", False, "alt", "[Usuario no encontrado o inactivo]"), _
        Array("[:AuthController]", "[:Company]", "1.4b: get_company_status(db, db_user.tenant_id)", False, "alt", "[Usuario existente]"), _
        Array("[:Company]", "[:AuthController]", "1.5b: company_status (""ACTIVO"")", False, "alt", "[Usuario existente]"), _
        Array("[:AuthController]", "[:Subscription]", "1.6b: get_active_subscription(db, db_user.tenant_id)", False, "alt", "[Usuario existente]"), _
        Array("[:Subscription]", "[:AuthController]", "1.7b: db_sub", False, "alt", "[Usuario existente]"), _
        Array("[:AuthController]", "[:AuthController]", "1.8b: verify_password_hash(password, db_user.password_hash)", True, "alt", "[Usuario existente]"), _
        Array("[:AuthController]", "[:AuthController]", "1.9b: create_access_token(sub, role, tenant_id, branch_id)", True, "alt", "[Usuario existente]"), _
        Array("[:AuthController]", "[:LoginView]", "1.10b: HTTP 200 OK (TokenResponse: access_token)", False, "alt", "[Usuario existente]"), _
        Array("[:LoginView]", "Usuario", "1.11b: guardarTokenYRedirigirDashboard()", False, "alt", "[Usuario existente]") _
    )

    ' Folder rectangular UML CombinedFragment con pestaña "alt"
    fragmentos = Array( _
        Array("Autenticación y Verificación de Empresa Activa", "alt", 190, 1040, -130, -420) _
    )

    crearDiagramaSecuenciaBCE pkg, "CU03 Iniciar Sesión Multitenant con JWT", "Usuario", lifelines, mensajes, fragmentos
    Session.Prompt "¡Diagrama de Secuencia de CU03 con Folder alt generado con éxito!", promptOK
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
