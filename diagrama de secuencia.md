option explicit

!INC Local Scripts.EAConstants-VBScript

' -------------------------------------------------------------
' Función global para buscar un lifeline por nombre
' -------------------------------------------------------------
function buscarLifeline(nombre, namesArray, objectsArray)
    dim i
    for i = 0 to UBound(namesArray)
        if namesArray(i) = nombre then
            set buscarLifeline = objectsArray(i)
            exit function
        end if
    next
    set buscarLifeline = nothing
end function

' -------------------------------------------------------------
' Función principal
' -------------------------------------------------------------
sub OnDiagramScript()
    dim currentPackage
    set currentPackage = Repository.GetTreeSelectedPackage()
    
    if currentPackage is nothing then
        Session.Prompt "Selecciona un paquete en el Project Browser", promptOK
        exit sub
    end if

    ' CU-01
    crearDiagramaSecuencia currentPackage, _
        "CU-01 Registrarse en la plataforma", "Cliente", _
        Array( _
            Array("V_Registro", "Object", "boundary"), _
            Array("C_Registro", "Object", "control"), _
            Array("M_Usuario", "Object", "entity") _
        ), _
        Array( _
            Array("Cliente", "V_Registro", "1: mostrarFormulario()", False, "", ""), _
            Array("Cliente", "V_Registro", "2: enviarDatos()", False, "", ""), _
            Array("V_Registro", "C_Registro", "2.1: validarDatos()", False, "", ""), _
            Array("C_Registro", "M_Usuario", "2.2: crearUsuario()", False, "Registro exitoso", "[datos válidos]"), _
            Array("M_Usuario", "C_Registro", "3: usuarioCreado()", False, "Registro exitoso", ""), _
            Array("C_Registro", "V_Registro", "4: confirmacion()", False, "Registro exitoso", ""), _
            Array("V_Registro", "Cliente", "5: mostrarConfirmacion()", False, "Registro exitoso", ""), _
            Array("C_Registro", "M_Usuario", "2.2: buscarPorEmail()", False, "Correo ya registrado", "[correo existente]"), _
            Array("M_Usuario", "C_Registro", "3: usuarioExistente()", False, "Correo ya registrado", ""), _
            Array("C_Registro", "V_Registro", "4: errorCorreoExistente()", False, "Correo ya registrado", ""), _
            Array("V_Registro", "Cliente", "5: mostrarError()", False, "Correo ya registrado", "") _
        )

    ' CU-02
    crearDiagramaSecuencia currentPackage, _
        "CU-02 Iniciar sesión", "Usuario", _
        Array( _
            Array("V_Login", "Object", "boundary"), _
            Array("C_Login", "Object", "control"), _
            Array("M_Usuario", "Object", "entity") _
        ), _
        Array( _
            Array("Usuario", "V_Login", "1: ingresarCredenciales()", False, "", ""), _
            Array("V_Login", "C_Login", "1.1: autenticar()", False, "", ""), _
            Array("C_Login", "M_Usuario", "1.2: buscarPorEmail()", False, "Credenciales correctas", "[usuario existe y activo]"), _
            Array("M_Usuario", "C_Login", "2: retornarUsuario()", False, "Credenciales correctas", ""), _
            Array("C_Login", "V_Login", "3: autenticacionExitosa()", False, "Credenciales correctas", ""), _
            Array("V_Login", "Usuario", "4: mostrarPanelPrincipal()", False, "Credenciales correctas", ""), _
            Array("C_Login", "M_Usuario", "1.2: buscarPorEmail()", False, "Credenciales incorrectas", "[usuario no existe]"), _
            Array("M_Usuario", "C_Login", "2: usuarioNoEncontrado()", False, "Credenciales incorrectas", ""), _
            Array("C_Login", "V_Login", "3: errorCredenciales()", False, "Credenciales incorrectas", ""), _
            Array("V_Login", "Usuario", "4: mostrarError()", False, "Credenciales incorrectas", "") _
        )

    ' CU-03
    crearDiagramaSecuencia currentPackage, _
        "CU-03 Gestionar perfil de usuario", "Cliente", _
        Array( _
            Array("V_Perfil", "Object", "boundary"), _
            Array("C_Perfil", "Object", "control"), _
            Array("M_Usuario", "Object", "entity") _
        ), _
        Array( _
            Array("Cliente", "V_Perfil", "1: verPerfil()", False, "", ""), _
            Array("V_Perfil", "C_Perfil", "1.1: obtenerPerfil()", False, "", ""), _
            Array("C_Perfil", "M_Usuario", "1.2: buscarUsuario()", False, "", ""), _
            Array("M_Usuario", "C_Perfil", "2: retornarUsuario()", False, "", ""), _
            Array("C_Perfil", "V_Perfil", "3: mostrarPerfil()", False, "", ""), _
            Array("V_Perfil", "Cliente", "4: mostrarDatos()", False, "", ""), _
            Array("Cliente", "V_Perfil", "5: editarPerfil()", False, "", ""), _
            Array("V_Perfil", "C_Perfil", "5.1: actualizarPerfil()", False, "", ""), _
            Array("C_Perfil", "M_Usuario", "5.2: actualizarUsuario()", False, "", ""), _
            Array("M_Usuario", "C_Perfil", "6: actualizacionExitosa()", False, "", ""), _
            Array("C_Perfil", "V_Perfil", "7: confirmacion()", False, "", ""), _
            Array("V_Perfil", "Cliente", "8: mostrarConfirmacion()", False, "", "") _
        )

    ' CU-04
    crearDiagramaSecuencia currentPackage, _
        "CU-04 Consultar catálogo de prendas", "Cliente", _
        Array( _
            Array("V_Catalogo", "Object", "boundary"), _
            Array("C_Catalogo", "Object", "control"), _
            Array("M_Producto", "Object", "entity") _
        ), _
        Array( _
            Array("Cliente", "V_Catalogo", "1: navegarCatalogo()", False, "", ""), _
            Array("V_Catalogo", "C_Catalogo", "1.1: obtenerProductos()", False, "", ""), _
            Array("C_Catalogo", "M_Producto", "1.2: listarProductos()", False, "", ""), _
            Array("M_Producto", "C_Catalogo", "2: retornarProductos()", False, "", ""), _
            Array("C_Catalogo", "V_Catalogo", "3: mostrarCatalogo()", False, "", ""), _
            Array("V_Catalogo", "Cliente", "4: mostrarProductos()", False, "", ""), _
            Array("Cliente", "V_Catalogo", "5: seleccionarProducto()", False, "", ""), _
            Array("V_Catalogo", "C_Catalogo", "5.1: obtenerDetalle()", False, "", ""), _
            Array("C_Catalogo", "M_Producto", "5.2: buscarProducto()", False, "", ""), _
            Array("M_Producto", "C_Catalogo", "6: retornarDetalle()", False, "", ""), _
            Array("C_Catalogo", "V_Catalogo", "7: mostrarDetalle()", False, "", ""), _
            Array("V_Catalogo", "Cliente", "8: mostrarDetalleProducto()", False, "", "") _
        )

    ' CU-05
    crearDiagramaSecuencia currentPackage, _
        "CU-05 Filtrar productos", "Cliente", _
        Array( _
            Array("V_Catalogo", "Object", "boundary"), _
            Array("C_Catalogo", "Object", "control"), _
            Array("M_Producto", "Object", "entity") _
        ), _
        Array( _
            Array("Cliente", "V_Catalogo", "1: seleccionarFiltros()", False, "", ""), _
            Array("V_Catalogo", "C_Catalogo", "1.1: aplicarFiltros()", False, "", ""), _
            Array("C_Catalogo", "M_Producto", "1.2: consultarProductosFiltrados()", False, "Con resultados", "[filtros válidos]"), _
            Array("M_Producto", "C_Catalogo", "2: retornarProductos()", False, "Con resultados", ""), _
            Array("C_Catalogo", "V_Catalogo", "3: mostrarProductosFiltrados()", False, "Con resultados", ""), _
            Array("V_Catalogo", "Cliente", "4: mostrarResultados()", False, "Con resultados", ""), _
            Array("C_Catalogo", "M_Producto", "1.2: consultarProductosFiltrados()", False, "Sin resultados", "[sin coincidencias]"), _
            Array("M_Producto", "C_Catalogo", "2: sinResultados()", False, "Sin resultados", ""), _
            Array("C_Catalogo", "V_Catalogo", "3: mostrarSinResultados()", False, "Sin resultados", ""), _
            Array("V_Catalogo", "Cliente", "4: mostrarMensajeSinResultados()", False, "Sin resultados", "") _
        )

    ' CU-06
    crearDiagramaSecuencia currentPackage, _
        "CU-06 Consultar disponibilidad", "Cliente", _
        Array( _
            Array("V_Disponibilidad", "Object", "boundary"), _
            Array("C_Inventario", "Object", "control"), _
            Array("M_Inventario", "Object", "entity"), _
            Array("M_Sucursal", "Object", "entity") _
        ), _
        Array( _
            Array("Cliente", "V_Disponibilidad", "1: seleccionarProductoYSucursal()", False, "", ""), _
            Array("V_Disponibilidad", "C_Inventario", "1.1: consultarDisponibilidad()", False, "", ""), _
            Array("C_Inventario", "M_Inventario", "1.2: obtenerInventario()", False, "Con stock", "[stock disponible]"), _
            Array("M_Inventario", "C_Inventario", "2: retornarStock()", False, "Con stock", ""), _
            Array("C_Inventario", "V_Disponibilidad", "3: mostrarDisponibilidad()", False, "Con stock", ""), _
            Array("V_Disponibilidad", "Cliente", "4: mostrarStockDisponible()", False, "Con stock", ""), _
            Array("C_Inventario", "M_Inventario", "1.2: obtenerInventario()", False, "Sin stock", "[stock agotado]"), _
            Array("M_Inventario", "C_Inventario", "2: stockAgotado()", False, "Sin stock", ""), _
            Array("C_Inventario", "V_Disponibilidad", "3: mostrarSinStock()", False, "Sin stock", ""), _
            Array("V_Disponibilidad", "Cliente", "4: mostrarMensajeSinStock()", False, "Sin stock", "") _
        )

    ' CU-08
    crearDiagramaSecuencia currentPackage, _
        "CU-08 Realizar reserva", "Cliente", _
        Array( _
            Array("V_Reserva", "Object", "boundary"), _
            Array("C_Reserva", "Object", "control"), _
            Array("M_Reserva", "Object", "entity"), _
            Array("M_Inventario", "Object", "entity") _
        ), _
        Array( _
            Array("Cliente", "V_Reserva", "1: seleccionarPrendasYSucursal()", False, "", ""), _
            Array("V_Reserva", "C_Reserva", "1.1: verificarStock()", False, "Stock suficiente", "[stock disponible]"), _
            Array("C_Reserva", "M_Inventario", "1.2: consultarInventario()", False, "Stock suficiente", ""), _
            Array("M_Inventario", "C_Reserva", "2: stockDisponible()", False, "Stock suficiente", ""), _
            Array("C_Reserva", "M_Reserva", "2.1: crearReserva()", False, "Stock suficiente", ""), _
            Array("C_Reserva", "M_Inventario", "2.2: actualizarStockReservado()", False, "Stock suficiente", ""), _
            Array("M_Reserva", "C_Reserva", "3: reservaCreada()", False, "Stock suficiente", ""), _
            Array("C_Reserva", "V_Reserva", "4: confirmacion()", False, "Stock suficiente", ""), _
            Array("V_Reserva", "Cliente", "5: mostrarConfirmacion()", False, "Stock suficiente", ""), _
            Array("C_Reserva", "M_Inventario", "1.2: consultarInventario()", False, "Stock insuficiente", "[stock insuficiente]"), _
            Array("M_Inventario", "C_Reserva", "2: stockInsuficiente()", False, "Stock insuficiente", ""), _
            Array("C_Reserva", "V_Reserva", "3: errorStock()", False, "Stock insuficiente", ""), _
            Array("V_Reserva", "Cliente", "4: mostrarErrorStock()", False, "Stock insuficiente", "") _
        )

    ' CU-09
    crearDiagramaSecuencia currentPackage, _
        "CU-09 Consultar y cancelar reservas", "Cliente", _
        Array( _
            Array("V_Reservas", "Object", "boundary"), _
            Array("C_Reserva", "Object", "control"), _
            Array("M_Reserva", "Object", "entity"), _
            Array("M_Inventario", "Object", "entity") _
        ), _
        Array( _
            Array("Cliente", "V_Reservas", "1: verReservas()", False, "", ""), _
            Array("V_Reservas", "C_Reserva", "1.1: obtenerReservas()", False, "", ""), _
            Array("C_Reserva", "M_Reserva", "1.2: listarReservas()", False, "", ""), _
            Array("M_Reserva", "C_Reserva", "2: retornarReservas()", False, "", ""), _
            Array("C_Reserva", "V_Reservas", "3: mostrarReservas()", False, "", ""), _
            Array("V_Reservas", "Cliente", "4: mostrarListado()", False, "", ""), _
            Array("Cliente", "V_Reservas", "5: cancelarReserva()", False, "", ""), _
            Array("V_Reservas", "C_Reserva", "5.1: cancelarReserva()", False, "", ""), _
            Array("C_Reserva", "M_Reserva", "5.2: actualizarEstado()", False, "", ""), _
            Array("C_Reserva", "M_Inventario", "5.3: liberarStock()", False, "", ""), _
            Array("M_Reserva", "C_Reserva", "6: cancelacionExitosa()", False, "", ""), _
            Array("M_Inventario", "C_Reserva", "7: stockLiberado()", False, "", ""), _
            Array("C_Reserva", "V_Reservas", "8: confirmacion()", False, "", ""), _
            Array("V_Reservas", "Cliente", "9: mostrarConfirmacion()", False, "", "") _
        )

    ' CU-18
    crearDiagramaSecuencia currentPackage, _
        "CU-18 Preparar reservas", "Encargado", _
        Array( _
            Array("V_Reservas", "Object", "boundary"), _
            Array("C_Reserva", "Object", "control"), _
            Array("M_Reserva", "Object", "entity"), _
            Array("M_Inventario", "Object", "entity") _
        ), _
        Array( _
            Array("Encargado", "V_Reservas", "1: verPendientes()", False, "", ""), _
            Array("V_Reservas", "C_Reserva", "1.1: obtenerPendientes()", False, "", ""), _
            Array("C_Reserva", "M_Reserva", "1.2: listarPendientes()", False, "", ""), _
            Array("M_Reserva", "C_Reserva", "2: retornarPendientes()", False, "", ""), _
            Array("C_Reserva", "V_Reservas", "3: mostrarPendientes()", False, "", ""), _
            Array("V_Reservas", "Encargado", "4: mostrarListadoPendientes()", False, "", ""), _
            Array("Encargado", "V_Reservas", "5: prepararReserva()", False, "", ""), _
            Array("V_Reservas", "C_Reserva", "5.1: marcarComoPreparada()", False, "", ""), _
            Array("C_Reserva", "M_Reserva", "5.2: actualizarEstado()", False, "", ""), _
            Array("M_Reserva", "C_Reserva", "6: reservaPreparada()", False, "", ""), _
            Array("C_Reserva", "V_Reservas", "7: confirmacion()", False, "", ""), _
            Array("V_Reservas", "Encargado", "8: mostrarConfirmacion()", False, "", "") _
        )

    ' CU-19
    crearDiagramaSecuencia currentPackage, _
        "CU-19 Administrar usuarios y roles", "Administrador", _
        Array( _
            Array("V_Usuarios", "Object", "boundary"), _
            Array("C_Usuario", "Object", "control"), _
            Array("M_Usuario", "Object", "entity"), _
            Array("M_Rol", "Object", "entity") _
        ), _
        Array( _
            Array("Administrador", "V_Usuarios", "1: listarUsuarios()", False, "", ""), _
            Array("V_Usuarios", "C_Usuario", "1.1: obtenerUsuarios()", False, "", ""), _
            Array("C_Usuario", "M_Usuario", "1.2: listarUsuarios()", False, "", ""), _
            Array("M_Usuario", "C_Usuario", "2: retornarUsuarios()", False, "", ""), _
            Array("C_Usuario", "V_Usuarios", "3: mostrarUsuarios()", False, "", ""), _
            Array("V_Usuarios", "Administrador", "4: mostrarListado()", False, "", ""), _
            Array("Administrador", "V_Usuarios", "5: crearUsuario()", False, "", ""), _
            Array("V_Usuarios", "C_Usuario", "5.1: guardarUsuario()", False, "", ""), _
            Array("C_Usuario", "M_Usuario", "5.2: crearUsuario()", False, "", ""), _
            Array("C_Usuario", "M_Rol", "5.3: asignarRol()", False, "", ""), _
            Array("M_Usuario", "C_Usuario", "6: usuarioCreado()", False, "", ""), _
            Array("C_Usuario", "V_Usuarios", "7: confirmacion()", False, "", ""), _
            Array("V_Usuarios", "Administrador", "8: mostrarConfirmacion()", False, "", ""), _
            Array("Administrador", "V_Usuarios", "9: editarUsuario()", False, "", ""), _
            Array("V_Usuarios", "C_Usuario", "9.1: actualizarUsuario()", False, "", ""), _
            Array("C_Usuario", "M_Usuario", "9.2: modificarUsuario()", False, "", ""), _
            Array("C_Usuario", "M_Rol", "9.3: actualizarRol()", False, "", ""), _
            Array("M_Usuario", "C_Usuario", "10: actualizacionExitosa()", False, "", ""), _
            Array("C_Usuario", "V_Usuarios", "11: confirmacion()", False, "", ""), _
            Array("V_Usuarios", "Administrador", "12: mostrarConfirmacion()", False, "", ""), _
            Array("Administrador", "V_Usuarios", "13: eliminarUsuario()", False, "", ""), _
            Array("V_Usuarios", "C_Usuario", "13.1: desactivarUsuario()", False, "", ""), _
            Array("C_Usuario", "M_Usuario", "13.2: eliminarUsuario()", False, "", ""), _
            Array("M_Usuario", "C_Usuario", "14: eliminacionExitosa()", False, "", ""), _
            Array("C_Usuario", "V_Usuarios", "15: confirmacion()", False, "", ""), _
            Array("V_Usuarios", "Administrador", "16: mostrarConfirmacion()", False, "", "") _
        )

    ' CU-20
    crearDiagramaSecuencia currentPackage, _
        "CU-20 Administrar sucursales", "Administrador", _
        Array( _
            Array("V_Sucursales", "Object", "boundary"), _
            Array("C_Sucursal", "Object", "control"), _
            Array("M_Sucursal", "Object", "entity") _
        ), _
        Array( _
            Array("Administrador", "V_Sucursales", "1: listarSucursales()", False, "", ""), _
            Array("V_Sucursales", "C_Sucursal", "1.1: obtenerSucursales()", False, "", ""), _
            Array("C_Sucursal", "M_Sucursal", "1.2: listarSucursales()", False, "", ""), _
            Array("M_Sucursal", "C_Sucursal", "2: retornarSucursales()", False, "", ""), _
            Array("C_Sucursal", "V_Sucursales", "3: mostrarSucursales()", False, "", ""), _
            Array("V_Sucursales", "Administrador", "4: mostrarListado()", False, "", ""), _
            Array("Administrador", "V_Sucursales", "5: crearSucursal()", False, "", ""), _
            Array("V_Sucursales", "C_Sucursal", "5.1: guardarSucursal()", False, "", ""), _
            Array("C_Sucursal", "M_Sucursal", "5.2: crearSucursal()", False, "", ""), _
            Array("M_Sucursal", "C_Sucursal", "6: sucursalCreada()", False, "", ""), _
            Array("C_Sucursal", "V_Sucursales", "7: confirmacion()", False, "", ""), _
            Array("V_Sucursales", "Administrador", "8: mostrarConfirmacion()", False, "", ""), _
            Array("Administrador", "V_Sucursales", "9: editarSucursal()", False, "", ""), _
            Array("V_Sucursales", "C_Sucursal", "9.1: actualizarSucursal()", False, "", ""), _
            Array("C_Sucursal", "M_Sucursal", "9.2: modificarSucursal()", False, "", ""), _
            Array("M_Sucursal", "C_Sucursal", "10: actualizacionExitosa()", False, "", ""), _
            Array("C_Sucursal", "V_Sucursales", "11: confirmacion()", False, "", ""), _
            Array("V_Sucursales", "Administrador", "12: mostrarConfirmacion()", False, "", ""), _
            Array("Administrador", "V_Sucursales", "13: eliminarSucursal()", False, "", ""), _
            Array("V_Sucursales", "C_Sucursal", "13.1: desactivarSucursal()", False, "", ""), _
            Array("C_Sucursal", "M_Sucursal", "13.2: eliminarSucursal()", False, "", ""), _
            Array("M_Sucursal", "C_Sucursal", "14: eliminacionExitosa()", False, "", ""), _
            Array("C_Sucursal", "V_Sucursales", "15: confirmacion()", False, "", ""), _
            Array("V_Sucursales", "Administrador", "16: mostrarConfirmacion()", False, "", "") _
        )

    ' CU-21
    crearDiagramaSecuencia currentPackage, _
        "CU-21 Administrar catálogo de productos", "Administrador", _
        Array( _
            Array("V_Catalogo", "Object", "boundary"), _
            Array("C_Catalogo", "Object", "control"), _
            Array("M_Producto", "Object", "entity"), _
            Array("M_Categoria", "Object", "entity") _
        ), _
        Array( _
            Array("Administrador", "V_Catalogo", "1: listarProductos()", False, "", ""), _
            Array("V_Catalogo", "C_Catalogo", "1.1: obtenerProductos()", False, "", ""), _
            Array("C_Catalogo", "M_Producto", "1.2: listarProductos()", False, "", ""), _
            Array("M_Producto", "C_Catalogo", "2: retornarProductos()", False, "", ""), _
            Array("C_Catalogo", "V_Catalogo", "3: mostrarProductos()", False, "", ""), _
            Array("V_Catalogo", "Administrador", "4: mostrarListado()", False, "", ""), _
            Array("Administrador", "V_Catalogo", "5: crearProducto()", False, "", ""), _
            Array("V_Catalogo", "C_Catalogo", "5.1: guardarProducto()", False, "", ""), _
            Array("C_Catalogo", "M_Producto", "5.2: crearProducto()", False, "", ""), _
            Array("C_Catalogo", "M_Categoria", "5.3: asociarCategoria()", False, "", ""), _
            Array("M_Producto", "C_Catalogo", "6: productoCreado()", False, "", ""), _
            Array("C_Catalogo", "V_Catalogo", "7: confirmacion()", False, "", ""), _
            Array("V_Catalogo", "Administrador", "8: mostrarConfirmacion()", False, "", ""), _
            Array("Administrador", "V_Catalogo", "9: editarProducto()", False, "", ""), _
            Array("V_Catalogo", "C_Catalogo", "9.1: actualizarProducto()", False, "", ""), _
            Array("C_Catalogo", "M_Producto", "9.2: modificarProducto()", False, "", ""), _
            Array("C_Catalogo", "M_Categoria", "9.3: actualizarCategoria()", False, "", ""), _
            Array("M_Producto", "C_Catalogo", "10: actualizacionExitosa()", False, "", ""), _
            Array("C_Catalogo", "V_Catalogo", "11: confirmacion()", False, "", ""), _
            Array("V_Catalogo", "Administrador", "12: mostrarConfirmacion()", False, "", ""), _
            Array("Administrador", "V_Catalogo", "13: eliminarProducto()", False, "", ""), _
            Array("V_Catalogo", "C_Catalogo", "13.1: desactivarProducto()", False, "", ""), _
            Array("C_Catalogo", "M_Producto", "13.2: eliminarProducto()", False, "", ""), _
            Array("M_Producto", "C_Catalogo", "14: eliminacionExitosa()", False, "", ""), _
            Array("C_Catalogo", "V_Catalogo", "15: confirmacion()", False, "", ""), _
            Array("V_Catalogo", "Administrador", "16: mostrarConfirmacion()", False, "", "") _
        )

    Session.Prompt "Se generaron 12 diagramas de secuencia para el Ciclo #1.", promptOK
end sub

' -------------------------------------------------------------
' Subrutina para crear un diagrama de secuencia completo
' -------------------------------------------------------------
sub crearDiagramaSecuencia(package, nombreDiagrama, nombreActor, lifelines, mensajes)
    ' 1. Crear el actor
    dim actor
    set actor = crearElemento(package, nombreActor, "Actor")

    ' 2. Crear los objetos (lifelines) y guardarlos en arrays
    dim lifelineNames(), lifelineObjects()
    dim i, lifeline, nombre, tipo, estereotipo, obj
    dim count
    count = 0

    for each lifeline in lifelines
        nombre = lifeline(0)
        tipo = lifeline(1)
        estereotipo = lifeline(2)
        set obj = crearElementoConEsterotipo(package, nombre, tipo, estereotipo)
        
        ' Redimensionar arrays y agregar
        ReDim Preserve lifelineNames(count)
        ReDim Preserve lifelineObjects(count)
        lifelineNames(count) = nombre
        set lifelineObjects(count) = obj
        count = count + 1
    next

    ' 3. Crear el diagrama de secuencia
    dim diagram
    set diagram = crearDiagramaLimpio(package, "Secuencia " & nombreDiagrama, "Sequence")

    ' 4. Posicionar lifelines: actor a la izquierda, luego objetos
    dim x, xStep, yTop, yBottom
    x = 50
    xStep = 150
    yTop = -50
    yBottom = -200

    colocarElemento diagram, actor, x, x + 50, yTop, yBottom
    x = x + xStep

    dim j
    for j = 0 to UBound(lifelineObjects)
        colocarElemento diagram, lifelineObjects(j), x, x + 50, yTop, yBottom
        x = x + xStep
    next

    ' 5. Crear los mensajes
    dim msg, origen, destino, texto, esAutollamada, altFragmento, condicion
    dim origenObj, destinoObj

    for each msg in mensajes
        origen = msg(0)
        destino = msg(1)
        texto = msg(2)
        esAutollamada = msg(3)
        altFragmento = msg(4)
        condicion = msg(5)

        ' Obtener objeto de origen
        if origen = nombreActor then
            set origenObj = actor
        else
            set origenObj = buscarLifeline(origen, lifelineNames, lifelineObjects)
            if origenObj is nothing then
                set origenObj = crearElemento(package, origen, "Object")
            end if
        end if

        ' Obtener objeto de destino
        if destino = nombreActor then
            set destinoObj = actor
        else
            set destinoObj = buscarLifeline(destino, lifelineNames, lifelineObjects)
            if destinoObj is nothing then
                set destinoObj = crearElemento(package, destino, "Object")
            end if
        end if

        ' Crear el conector
        crearMensajeSecuencia origenObj, destinoObj, texto, esAutollamada, altFragmento, condicion
    next

    ' 6. Guardar y refrescar
    Repository.SaveDiagram diagram.DiagramID
    Repository.ReloadDiagram diagram.DiagramID
    Repository.OpenDiagram diagram.DiagramID
end sub

' -------------------------------------------------------------
' Funciones auxiliares
' -------------------------------------------------------------

function crearElemento(package, name, tipo)
    dim el
    for each el in package.Elements
        if el.Name = name and el.Type = tipo then
            set crearElemento = el
            exit function
        end if
    next
    set el = package.Elements.AddNew(name, tipo)
    el.Update()
    package.Elements.Refresh()
    set crearElemento = el
end function

function crearElementoConEsterotipo(package, name, tipo, estereotipo)
    dim el
    for each el in package.Elements
        if el.Name = name and el.Type = tipo then
            if el.Stereotype <> estereotipo then
                el.Stereotype = estereotipo
                el.Update()
            end if
            set crearElementoConEsterotipo = el
            exit function
        end if
    next
    set el = package.Elements.AddNew(name, tipo)
    el.Stereotype = estereotipo
    el.Update()
    package.Elements.Refresh()
    set crearElementoConEsterotipo = el
end function

function crearDiagramaLimpio(package, name, tipoDiagrama)
    dim diag, i
    for each diag in package.Diagrams
        if diag.Name = name then
            for i = diag.DiagramObjects.Count - 1 to 0 step -1
                diag.DiagramObjects.Delete i
            next
            for i = diag.DiagramLinks.Count - 1 to 0 step -1
                diag.DiagramLinks.Delete i
            next
            diag.DiagramObjects.Refresh()
            diag.DiagramLinks.Refresh()
            diag.Update()
            set crearDiagramaLimpio = diag
            exit function
        end if
    next
    set diag = package.Diagrams.AddNew(name, tipoDiagrama)
    diag.Update()
    package.Diagrams.Refresh()
    set crearDiagramaLimpio = diag
end function

sub colocarElemento(diagram, elemento, left, right, top, bottom)
    dim diagObj
    set diagObj = diagram.DiagramObjects.AddNew("l=" & left & ";r=" & right & ";t=" & top & ";b=" & bottom & ";", "")
    diagObj.ElementID = elemento.ElementID
    diagObj.Update()
end sub

sub crearMensajeSecuencia(origen, destino, texto, esAutollamada, altFragmento, condicion)
    dim con
    for each con in origen.Connectors
        if con.SupplierID = destino.ElementID and con.Type = "Sequence" then
            if con.Name = texto then exit sub
        end if
    next
    set con = origen.Connectors.AddNew("", "Sequence")
    con.SupplierID = destino.ElementID
    if altFragmento <> "" and condicion <> "" then
        con.Name = texto & " [" & condicion & "]"
    else
        con.Name = texto
    end if
    con.Update()
end sub

OnDiagramScript