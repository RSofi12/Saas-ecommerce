option explicit

!INC Local Scripts.EAConstants-VBScript

' ==============================================================================
' Generador VBScript para Enterprise Architect (ICONIX BCE UML 2.5)
' Diagrama de Comunicación: CU06 - Gestionar Catálogo de Productos y Variantes de Precio/Talla
' Proyecto: FashionStore SaaS Multitenant — Sistemas 2
'
' DESCRIPCIÓN CONCEPTUAL:
' El Administrador envía los datos de la nueva prenda y su matriz de precios por talla
' desde PrendasCatalogoView hacia ProductController, el cual procesa la creación del
' registro base en la entidad Product e inmediatamente asocia los registros de tallas
' y precios diferenciados en la entidad ProductVariant, finalizando con el envío del
' resultado consolidado a PrendasCatalogoView para la visualización del nuevo catálogo.
'
' RESULTADO:
' resultado: nueva prenda y variantes de tallas con precios diferenciados persistidas en el catálogo del tenant
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
        Array("PrendasCatalogoView", "Boundary", "boundary"), _
        Array("ProductController", "Control", "control"), _
        Array("Product", "Entity", "entity"), _
        Array("ProductVariant", "Entity", "entity") _
    )
    
    mensajes = Array( _
        Array("Administrador", "PrendasCatalogoView", "1: enviarFormularioPrenda(modelo, variantesPreciosTallas)"), _
        Array("PrendasCatalogoView", "ProductController", "1.1: POST /products/ (create_product_route)"), _
        Array("ProductController", "Product", "1.2: create_product(db, tenant_id, product_data)"), _
        Array("ProductController", "ProductVariant", "1.3: create_product_variants(db, product_id, variantesPreciosTallas)"), _
        Array("ProductController", "PrendasCatalogoView", "1.4: renderizarPrendaConVariantesCreadas(producto_id)") _
    )

    crearDiagramaComunicacion pkg, "CU06 Gestionar Catálogo de Productos y Variantes de Precio/Talla", "Administrador", lifelines, mensajes
    Session.Prompt "¡Diagrama de Comunicación de CU06 generado con éxito!", promptOK
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
