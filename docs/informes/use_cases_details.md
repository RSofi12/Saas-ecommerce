# FICHAS TÉCNICAS DE CASOS DE USO (ICONIX)
### FashionStore — Plataforma SaaS Multitenant E-Commerce
**Metodología:** ICONIX Process (UML 2.5+)  
**Alcance Oficial:** 25 Casos de Uso (Consolidados para el 2do Parcial)  
**Documento Fuente:** `docs/ACTORS_AND_USE_CASES.md`

---

## Índice de Fichas Técnicas — Presentación 1 (Hito Inicial: CU01 al CU08)

1. [CU01: Registrar y Gestionar Empresas (Tenants)](#cu01-registrar-y-gestionar-empresas-tenants)
2. [CU02: Gestionar Planes de Suscripción (Básico, Pro, Empresarial) y Cuotas](#cu02-gestionar-planes-de-suscripción-básico-pro-empresarial-y-cuotas)
3. [CU03: Iniciar Sesión Multitenant con JWT y Claims de Tenant](#cu03-iniciar-sesión-multitenant-con-jwt-y-claims-de-tenant)
4. [CU04: Gestionar Sucursales Bajo Límites del Plan](#cu04-gestionar-sucursales-bajo-límites-del-plan)
5. [CU05: Gestionar Prendas y Variantes de Precio por Talla](#cu05-gestionar-prendas-y-variantes-de-precio-por-talla)
6. [CU06: Consultar Catálogo Online con Búsqueda Facetada](#cu06-consultar-catálogo-online-con-búsqueda-facetada)
7. [CU07: Sincronizar y Descargar Catálogo a Almacenamiento Local (PWA / SQLite)](#cu07-sincronizar-y-descargar-catálogo-a-almacenamiento-local-pwa--sqlite)
8. [CU08: Consultar Catálogo Offline en Modo Desconectado](#cu08-consultar-catálogo-offline-en-modo-desconectado)

---

### CU01: Registrar y Gestionar Empresas (Tenants)

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU01 - Registrar y Gestionar Empresas (Tenants)** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 25/10/2026 |
| **Descripción** | Permite al Superadministrador dar de alta y administrar a las empresas contratantes (*tenants*) de la plataforma SaaS, registrando su razón social, NIT/RUT, subdominio único y datos de contacto, garantizando la creación de su entorno lógico aislado en la base de datos compartida. |
| **Actores** | **Principal:** Superadministrador (`Superadmin`)<br>**Secundario:** Sistema Central de Plataforma (`Backend API`) |
| **Precondiciones** | El Superadministrador cuenta con sesión activa en el Portal Master SaaS. |
| **Flujo Normal** | **1.** El Superadministrador accede al módulo de administración de empresas del Portal Master.<br>**2.** Presiona la opción de registrar nueva empresa contratante.<br>**3.** Ingresa la información comercial requerida: nombre comercial, razón social, NIT/RUT, subdominio o identificador comercial único (`slug`), logotipo y datos de contacto del representante.<br>**4.** El Superadministrador acepta los Términos del Servicio SaaS y las cuotas de infraestructura.<br>**5.** El sistema verifica la unicidad del NIT/RUT y del subdominio en la plataforma global.<br>**6.** El sistema genera un identificador universal único (`tenant_id`) y registra la empresa en estado activo.<br>**7.** El sistema notifica la creación exitosa y habilita el entorno lógico de trabajo para la empresa. |
| **Flujos Alternativos** | **5.a. Subdominio o NIT ya registrado:** Si el subdominio o NIT ya pertenece a otra empresa, el sistema bloquea el registro, notifica la colisión y solicita ingresar valores diferentes.<br>**4.a. Omisión de términos de servicio:** Si no se confirma la aceptación de términos y cuotas, el sistema mantiene inhabilitado el guardado. |
| **Poscondiciones** | La empresa queda dada de alta con su `tenant_id` propio, quedando preparada para la asignación de planes y la creación de sus sucursales. |

---

### CU02: Gestionar Planes de Suscripción (Básico, Pro, Empresarial) y Cuotas

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU02 - Gestionar Planes de Suscripción (Básico, Pro, Empresarial) y Cuotas** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 25/10/2026 |
| **Descripción** | Permite al Superadministrador parametrizar el catálogo de planes de suscripción y asignar o actualizar el contrato comercial de una empresa entre los planes **Básico** (límite de 3 sucursales, sin IA), **Profesional** (hasta 10 sucursales, con IA generativa) y **Empresarial** (sucursales ilimitadas y soporte analítico completo), regulando vigencias y cuotas en el backend. |
| **Actores** | **Principal:** Superadministrador (`Superadmin`)<br>**Secundario:** Sistema Central de Plataforma (`Backend API`) |
| **Precondiciones** | La empresa se encuentra registrada y el Superadministrador está autenticado en la plataforma global. |
| **Flujo Normal** | **1.** El Superadministrador selecciona una empresa contratante en el portal master y pulsa gestionar plan de suscripción.<br>**2.** El sistema presenta los planes disponibles con sus cuotas: Básico (máximo 3 sucursales físicas activas, sin módulo de IA), Profesional (hasta 10 sucursales activas, acceso a IA Generativa y Machine Learning) y Empresarial (sucursales ilimitadas y copias de seguridad continuas).<br>**3.** El Superadministrador selecciona el plan acordado y la modalidad de facturación (mensual o anual).<br>**4.** El sistema calcula la fecha de vigencia y actualiza la cuota máxima permitida de sucursales y los permisos de módulos habilitados para la empresa.<br>**5.** El sistema confirma la asignación y deja vigentes los nuevos límites a nivel de backend. |
| **Flujos Alternativos** | **4.a. Intento de degradación de plan con exceso de sucursales activas (*Downgrade Guard*):** Si la empresa tiene más sucursales activas que las permitidas por el nuevo plan (ej. posee 5 sucursales e intenta bajar al Plan Básico que admite máximo 3), el sistema bloquea la operación y notifica que el administrador de la empresa debe dar de baja las sucursales excedentes antes de proceder con el cambio.<br>**3.a. Suscripción en mora o cancelada:** El Superadministrador puede suspender temporalmente el contrato comercial, lo que bloquea el acceso de los usuarios de esa empresa en el próximo inicio de sesión. |
| **Poscondiciones** | Los límites de sucursales y la habilitación de módulos avanzados quedan actualizados y forzados por el backend para el `tenant_id` correspondiente. |

---

### CU03: Iniciar Sesión Multitenant con JWT y Claims de Tenant

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU03 - Iniciar Sesión Multitenant con JWT y Claims de Tenant** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 25/10/2026 |
| **Descripción** | Permite a cualquier usuario de la plataforma (Superadministrador, Administrador de Tienda, Encargado, Cajero o Cliente) autenticarse mediante sus credenciales, recibiendo un token de sesión criptográfico (JWT) que contiene embebidos e inmutables su identidad, rol operativo y el `tenant_id` de su empresa para forzar el aislamiento de datos en cada petición. |
| **Actores** | **Principal:** Usuario de cualquier rol (`Superadmin`, `Tenant Admin`, `Branch Manager`, `Cashier`, `Customer`)<br>**Secundario:** Sistema de Autenticación Central (`Backend API`) |
| **Precondiciones** | El usuario se encuentra registrado con cuenta activa y la empresa asociada mantiene una suscripción en estado activo. |
| **Flujo Normal** | **1.** El usuario accede a la pantalla de inicio de sesión e ingresa su correo electrónico y contraseña.<br>**2.** El sistema busca la cuenta del usuario y comprueba la exactitud de la contraseña mediante verificación de hash criptográfico seguro (BCrypt).<br>**3.** El sistema verifica que la empresa a la que pertenece el usuario se encuentre en estado activo con suscripción vigente.<br>**4.** El sistema genera un token de acceso firmado digitalmente (JWT) que incorpora de forma inmutable los claims de contexto: identificador de usuario (`sub`), rol (`rol`), empresa contratante (`tenant_id`) y sucursal asignada (`branch_id`).<br>**5.** La aplicación almacena el token en almacenamiento seguro del cliente y redirige al usuario a la vista correspondiente a sus privilegios. |
| **Flujos Alternativos** | **2.a. Credenciales inválidas:** Si el correo no existe o la contraseña no coincide, el sistema rechaza el acceso con mensaje de credenciales incorrectas, sin indicar cuál campo falló por seguridad.<br>**3.a. Empresa suspendida o dada de baja:** Si la empresa contratante tiene la suscripción vencida o suspendida, el sistema bloquea el ingreso y notifica que el servicio de su empresa no se encuentra disponible.<br>**2.b. Usuario inactivo:** Si la cuenta individual del empleado fue desactivada, el sistema deniega el acceso e informa el estado de su cuenta. |
| **Poscondiciones** | El usuario mantiene una sesión de trabajo segura donde cada interacción subsecuente lleva inyectado su `tenant_id` para garantizar el aislamiento estricto de datos. |

---

### CU04: Gestionar Sucursales Bajo Límites del Plan

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU04 - Gestionar Sucursales Bajo Límites del Plan** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 25/10/2026 |
| **Descripción** | Permite al Administrador de Tienda registrar, editar o georreferenciar las tiendas físicas de su empresa, verificando estrictamente en el backend que la cantidad de sucursales activas no sobrepase la cuota contratada en su plan de suscripción (hasta 3 en Plan Básico, hasta 10 en Plan Profesional). |
| **Actores** | **Principal:** Administrador de Tienda (`Tenant Admin`)<br>**Secundario:** Sistema Central de Gestión (`Backend API`) |
| **Precondiciones** | El Administrador de Tienda cuenta con sesión activa en su empresa contratante. |
| **Flujo Normal** | **1.** El Administrador ingresa a la sección de sucursales físicas de su empresa.<br>**2.** Presiona la opción de registrar nueva sucursal.<br>**3.** Ingresa la información de la tienda: nombre, ciudad, dirección, coordenadas geográficas (latitud y longitud), teléfono y horario de atención.<br>**4.** El sistema contabiliza las sucursales físicas activas actuales de la empresa en la base de datos.<br>**5.** El sistema compara la cantidad contra la cuota máxima permitida por el plan de suscripción de la empresa (3 en Básico, 10 en Profesional o ilimitadas en Empresarial).<br>**6.** Al confirmar que la empresa dispone de cupo libre, el sistema registra la sucursal asignándole el `tenant_id` correspondiente.<br>**7.** El sistema presenta la lista de sucursales actualizada y refresca el indicador de consumo de cuota (ej. 2 de 3 sucursales utilizadas). |
| **Flujos Alternativos** | **5.a. Cuota de sucursales copada por el plan:** Si la empresa ya alcanzó el límite contratado (ej. 3 sucursales activas en Plan Básico) y se intenta registrar una más, el sistema bloquea inmediatamente la creación en el backend y emite una alerta indicando que debe actualizar su plan a Profesional para dar de alta nuevas tiendas.<br>**3.a. Coordenadas geográficas inválidas:** Si la latitud o longitud ingresada no corresponden a rangos válidos, el sistema solicita su corrección sobre el mapa. |
| **Poscondiciones** | La sucursal física queda registrada con sus coordenadas para geolocalización, respetando la cuota comercial del contrato SaaS. |

---

### CU05: Gestionar Prendas y Variantes de Precio por Talla

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU05 - Gestionar Prendas y Variantes de Precio por Talla** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 25/10/2026 |
| **Descripción** | Permite al Administrador de Tienda crear y administrar el catálogo de prendas de vestir de su empresa, estructurando la matriz de variantes por talla y color, y definiendo precios diferenciados por talla (ej. Talla M a Bs 50 frente a Talla L a Bs 70 por uso de mayor tela o corte especial), habilitando el cálculo de diferencias en cambios posteriores. |
| **Actores** | **Principal:** Administrador de Tienda (`Tenant Admin`)<br>**Secundario:** Sistema Central de Catálogo (`Backend API`) |
| **Precondiciones** | El usuario cuenta con sesión activa y privilegios de administración de catálogo en su empresa. |
| **Flujo Normal** | **1.** El Administrador ingresa a la sección de prendas del catálogo y selecciona crear nueva prenda (o editar una existente).<br>**2.** Ingresa los datos generales del modelo: nombre comercial, categoría textil (vestidos, pantalones, blusas), descripción, material de confección y fotografías.<br>**3.** Agrega las variantes de la prenda combinando talla (XS, S, M, L, XL, XXL) y color, asignando a cada una su código comercial compuesto (SKU) y su **precio de venta específico por talla** (permitiendo precios superiores en tallas especiales).<br>**4.** El Administrador confirma el registro presionando guardar prenda.<br>**5.** El sistema valida que los códigos SKU sean únicos dentro del catálogo de la empresa y que todos los precios asignados sean mayores a cero.<br>**6.** El sistema registra la prenda y sus variantes asociadas al `tenant_id` de la empresa.<br>**7.** El sistema presenta la prenda en el catálogo con su matriz de variantes y tabla de precios por talla visible. |
| **Flujos Alternativos** | **5.a. Código SKU duplicado:** Si se detecta que un SKU ya existe en otra prenda de la misma empresa, el sistema bloquea el guardado e indica el código en colisión para su modificación.<br>**5.b. Precio de variante nulo o negativo:** Si alguna talla tiene precio cero o negativo, el sistema impide la publicación e instruye ingresar precios válidos mayores a cero. |
| **Poscondiciones** | La prenda queda dada de alta con precios diferenciados por talla, lista para ser consultada en la tienda online, descargada para operación offline y referenciada en políticas de cambio de prenda. |

---

### CU06: Consultar Catálogo Online con Búsqueda Facetada

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU06 - Consultar Catálogo Online con Búsqueda Facetada** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 25/10/2026 |
| **Descripción** | Permite al cliente explorar las prendas comercializadas en la tienda virtual de la boutique, aplicando múltiples filtros combinados (facetas) en tiempo real por categoría, talla, color y rango de precios, optimizando la búsqueda mediante consultas dinámicas indexadas en el servidor. |
| **Actores** | **Principal:** Cliente (`Customer`)<br>**Secundario:** Sistema Central de Catálogo (`Backend API`) |
| **Precondiciones** | La tienda pública de la empresa está accesible y cuenta con prendas activas en el catálogo. |
| **Flujo Normal** | **1.** El cliente ingresa a la tienda virtual de la boutique y navega hacia la sección de catálogo de prendas.<br>**2.** El sistema presenta las prendas activas organizadas por categorías con fotos, tallas disponibles y rangos de precio.<br>**3.** El cliente aplica filtros facetados seleccionando simultáneamente: categoría de prenda (ej. Vestidos de Noche), talla requerida (ej. Talla M) y rango de precios deseado (ej. Bs 50 a Bs 120).<br>**4.** El sistema evalúa los criterios combinados y ejecuta una consulta filtrada sobre los productos activos del tenant.<br>**5.** El sistema actualiza dinámicamente la grilla mostrando únicamente las prendas que satisfacen todos los filtros aplicados.<br>**6.** El cliente selecciona una prenda para visualizar su ficha detallada, fotos ampliadas y opciones de reserva o compra con despacho. |
| **Flujos Alternativos** | **4.a. Búsqueda sin coincidencias:** Si ninguna prenda cumple simultáneamente con los filtros seleccionados, el sistema despliega un mensaje informativo indicando que no se hallaron prendas con esos criterios y provee un botón para limpiar o relajar los filtros aplicados. |
| **Poscondiciones** | El cliente visualiza el subconjunto de prendas que coinciden con su preferencia para continuar hacia el carrito de compras o la reserva en tienda. |

---

### CU07: Sincronizar y Descargar Catálogo a Almacenamiento Local (PWA / SQLite)

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU07 - Sincronizar y Descargar Catálogo a Almacenamiento Local (PWA / SQLite)** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 25/10/2026 |
| **Descripción** | Permite empaquetar y transferir las prendas activas, variantes de talla, color, precios y existencias locales de una sucursal desde el backend hacia el almacenamiento local del dispositivo cliente (IndexedDB en Web PWA o SQLite en App Móvil Flutter), preparando a la aplicación para operar sin conexión a Internet. |
| **Actores** | **Principal:** Cliente (`Customer`), Cajero (`Cashier`)<br>**Secundario:** Motor de Sincronización (`Sync Engine`), Sistema Central (`Backend API`) |
| **Precondiciones** | El dispositivo cuenta con conexión a Internet activa y se ha seleccionado una sucursal física operativa. |
| **Flujo Normal** | **1.** La aplicación inicia o el usuario presiona la opción de sincronizar catálogo offline.<br>**2.** La aplicación verifica la disponibilidad de conexión a Internet y obtiene la sucursal de trabajo activa.<br>**3.** La aplicación solicita al servidor central el paquete estructurado de catálogo de la sucursal.<br>**4.** El servidor central compila las prendas, variantes con precios por talla, fotografías y existencias disponibles de la sucursal en un paquete optimizado.<br>**5.** La aplicación en el cliente recibe el paquete y ejecuta una transacción atómica local en:<br> a. **Web PWA:** Almacén de objetos en **IndexedDB** (`catalog_products`, `catalog_variants`).<br> b. **App Móvil:** Tablas relacionales en **SQLite** (`local_products`, `local_variants`).<br>**6.** La aplicación actualiza la marca temporal y versión de sincronización.<br>**7.** El sistema notifica al usuario: *"Catálogo sincronizado exitosamente para uso sin conexión"*. |
| **Flujos Alternativos** | **2.a. Sin conexión al momento de solicitar:** Si el dispositivo carece de Internet al intentar sincronizar, el sistema informa la imposibilidad de descargar y conserva intacta la versión local previa en caché.<br>**4.a. Corte de red durante la transferencia:** Si la conexión se interrumpe a mitad de la descarga, la aplicación cancela la transacción atómica local, descartando datos parciales y manteniendo la versión íntegra anterior.<br>**5.a. Almacenamiento local insuficiente:** Si la memoria del navegador o dispositivo no permite almacenar el lote, el sistema emite una advertencia sin corromper la base local. |
| **Poscondiciones** | La base de datos local del cliente contiene el catálogo y existencias listos para ser consultados en modo desconectado (CU08) y utilizados para ventas o reservas offline. |

---

### CU08: Consultar Catálogo Offline en Modo Desconectado

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU08 - Consultar Catálogo Offline en Modo Desconectado** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 25/10/2026 |
| **Descripción** | Permite a los clientes y cajeros navegar y consultar prendas, tallas, precios y existencias en la Web PWA o App Móvil durante una interrupción de Internet (modo avión o falla de red local), leyendo los datos almacenados en la base local (IndexedDB o SQLite) e indicando visualmente que se opera con datos en caché. |
| **Actores** | **Principal:** Cliente (`Customer`), Cajero (`Cashier`)<br>**Secundario:** Sistema de Almacenamiento Local (PWA / SQLite) |
| **Precondiciones** | El dispositivo carece de conexión a Internet y cuenta con datos sincronizados previamente en la base local (mediante CU07). |
| **Flujo Normal** | **1.** El usuario accede a la sección de catálogo de prendas o a la pantalla del punto de venta en su dispositivo.<br>**2.** La aplicación detecta la ausencia de conectividad a Internet.<br>**3.** La aplicación desvía la consulta hacia la base de datos local del dispositivo (IndexedDB en la PWA o SQLite en Flutter).<br>**4.** La aplicación recupera las prendas, variantes de talla, precios y existencias almacenadas en caché.<br>**5.** La aplicación renderiza el catálogo mostrando una insignia visual destacada: *"Modo Sin Conexión - Precios y Stock en Caché"*, junto con la fecha y hora de la última sincronización.<br>**6.** El usuario examina las prendas, filtra por categorías y puede seleccionarlas para agregarlas a ventas offline en efectivo o reservas de contingencia. |
| **Flujos Alternativos** | **3.a. Base de datos local vacía (nunca se sincronizó CU07):** Si el usuario nunca descargó el catálogo antes de perder la conexión, el sistema informa cordialmente: *"No hay catálogo disponible sin conexión. Conéctese a Internet para descargar el catálogo por primera vez"* y bloquea la navegación desconectada.<br>**2.a. Reconexión de red durante la navegación:** Si la conectividad regresa mientras el usuario consulta, el sistema detecta el evento de red, actualiza la insignia a modo conectado y ofrece la opción de refrescar los datos en tiempo real. |
| **Poscondiciones** | El usuario consulta prendas y precios sin interrupción operativa ante caídas de red, manteniendo degradación elegante de la interfaz. |

---

## Índice de Fichas Técnicas — Presentación 2 (Hito Comercial y Operativo: CU09 al CU18)

9. [CU09: Comprar Prendas con Stripe y Despacho Condicionado](#cu09-comprar-prendas-con-stripe-y-despacho-condicionado)
10. [CU10: Crear Reserva Online de Prendas con Vencimiento y Bloqueo](#cu10-crear-reserva-online-de-prendas-con-vencimiento-y-bloqueo)
11. [CU11: Registrar Reserva de Prendas Offline en Modo Desconectado (PWA / SQLite)](#cu11-registrar-reserva-de-prendas-offline-en-modo-desconectado-pwa--sqlite)
12. [CU12: Atender y Resolver Conflictos de Reservas Expiradas](#cu12-atender-y-resolver-conflictos-de-reservas-expiradas)
13. [CU13: Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4](#cu13-registrar-venta-pos-desconectada-en-efectivo-con-contingencia-uuidv4)
14. [CU14: Gestionar Bandeja Local de Operaciones Pendientes (Outbox PWA / SQLite)](#cu14-gestionar-bandeja-local-de-operaciones-pendientes-outbox-pwa--sqlite)
15. [CU15: Sincronizar Lotes de Ventas con Idempotencia Central (sync_operations)](#cu15-sincronizar-lotes-de-ventas-con-idempotencia-central-sync_operations)
16. [CU16: Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock](#cu16-gestionar-y-resolver-conflictos-de-ventas-offline-y-quiebres-de-stock)
17. [CU17: Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Estado](#cu17-procesar-cambio-de-prenda-por-talla-con-cobro-de-diferencia-y-estado)
18. [CU18: Procesar Devolución de Prenda con Retención Operativa y Nota de Crédito](#cu18-procesar-devolución-de-prenda-con-retención-operativa-y-nota-de-crédito)

---

### CU09: Comprar Prendas con Stripe y Despacho Condicionado

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU09 - Comprar Prendas con Stripe y Despacho Condicionado** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 31/10/2026 |
| **Descripción** | Permite al cliente formalizar la compra de las prendas contenidas en su carrito digital mediante pasarela segura Stripe, seleccionando entrega a domicilio o retiro presencial, condicionando la generación de la guía y código de despacho estrictamente a la confirmación efectiva del pago por parte de la entidad financiera. |
| **Actores** | **Principal:** Cliente (`Customer`)<br>**Secundario:** Pasarela Stripe (`Stripe Gateway`), Sistema Central (`Backend API`) |
| **Precondiciones** | El cliente cuenta con sesión activa, conexión a Internet y prendas con stock libre confirmado en su carrito. |
| **Flujo Normal** | **1.** El cliente ingresa a la vista de Checkout, selecciona la modalidad de entrega (`ENVIO_DOMICILIO` o `RETIRO_TIENDA`) y marca la casilla de aceptación obligatoria de políticas comerciales y de despacho.<br>**2.** El cliente introduce los datos de su tarjeta de crédito o débito a través del componente seguro de la pasarela Stripe.<br>**3.** El cliente confirma la orden presionando realizar pago.<br>**4.** El sistema registra la orden en estado pendiente de pago e inicia la transacción con Stripe.<br>**5.** La pasarela Stripe procesa la operación y notifica al sistema central la confirmación del cobro exitoso mediante comunicación segura.<br>**6.** El sistema valida la autenticidad del mensaje bancario y actualiza el estado de la orden a pagada.<br>**7.** El sistema genera automáticamente el código de despacho formal (`DSP-XXXXXXXX`) y pasa el pedido a estado listo para despacho.<br>**8.** La aplicación presenta el comprobante digital de compra y activa el seguimiento visual del pedido en cinco etapas. |
| **Flujos Alternativos** | **1. A1 [Políticas no aceptadas]:** Si el cliente no marca la casilla de aceptación de políticas de cambio, devolución y despacho, el sistema mantiene deshabilitado el botón de pago.<br>**5. A1 [Tarjeta rechazada o fondos insuficientes]:** Si la pasarela bancaria deniega el cobro, el sistema mantiene la orden en estado pendiente de pago, bloquea estrictamente la generación de la orden de despacho e invita al cliente a ingresar otro medio de pago.<br>**4. A1 [Quiebre de stock concurrente]:** Si durante el proceso de pago otra transacción agota las existencias de alguna prenda del carrito, el sistema aborta la operación, cancela la retención temporal y notifica al cliente para que ajuste su pedido. |
| **Poscondiciones** | Venta digital asentada contablemente y despacho logístico condicionado exclusivamente a la confirmación real del cobro. |

---

### CU10: Crear Reserva Online de Prendas con Vencimiento y Bloqueo

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU10 - Crear Reserva Online de Prendas con Vencimiento y Bloqueo** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 31/10/2026 |
| **Descripción** | Permite al cliente apartar prendas específicas en una sucursal física mediante la tienda virtual para probárselas antes de comprar, ejecutando un bloqueo atómico sobre las existencias disponibles de la tienda y asignando una ventana de vigencia con vencimiento automático (de 24 a 48 horas a partir de la fecha de visita). |
| **Actores** | **Principal:** Cliente (`Customer`)<br>**Secundario:** Sistema Central de Reservas (`Backend API`) |
| **Precondiciones** | Prenda con existencias libres en la sucursal seleccionada y cliente autenticado en la plataforma. |
| **Flujo Normal** | **1.** El cliente consulta la ficha de una prenda, selecciona talla, color y sucursal física de retiro.<br>**2.** El cliente selecciona la opción de reservar para probar en tienda y define la fecha estimada de su visita presencial (dentro de un rango de 1 a 7 días).<br>**3.** El sistema verifica que la sucursal disponga de unidades libres no comprometidas.<br>**4.** El sistema realiza un bloqueo atómico de inventario, reduciendo las existencias disponibles de la sucursal e incrementando las existencias reservadas.<br>**5.** El sistema calcula la fecha y hora exacta de vencimiento (`expires_at = fecha_visita + 24h`) y genera el código alfanumérico identificador (`RES-XXXXXXXX`) y el código QR de retiro.<br>**6.** La aplicación presenta el comprobante digital de reserva con el temporizador visible y recomendaciones para su visita a la sucursal. |
| **Flujos Alternativos** | **3. A1 [Existencias agotadas en sucursal]:** Si al confirmar la reserva la variante ya no cuenta con unidades libres, el sistema alerta que el stock fue comprometido y ofrece reservar en otra tienda física de la boutique.<br>**2. A1 [Límite de reservas simultáneas excedido]:** Si el cliente acumula más reservas activas que el cupo máximo permitido por la política comercial de la empresa, el sistema solicita acudir a retirar o cancelar reservas previas antes de generar una nueva.<br>**2. A2 [Fecha de visita fuera de rango]:** Si el cliente ingresa una fecha posterior al horizonte permitido (más de 7 días), el sistema solicita seleccionar una fecha dentro del periodo habilitado. |
| **Poscondiciones** | Prenda físicamente apartada de la venta general con temporizador de caducidad activo y comprobante digital en posesión del cliente. |

---

### CU11: Registrar Reserva de Prendas Offline en Modo Desconectado (PWA / SQLite)

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU11 - Registrar Reserva de Prendas Offline en Modo Desconectado (PWA / SQLite)** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 31/10/2026 |
| **Descripción** | Permite al cliente o cajero registrar el apartado de una prenda desde la interfaz de la aplicación cuando no se dispone de conexión a Internet, almacenando la operación en la base local con un identificador universal único (UUIDv4) y descontando provisionalmente el stock local para su posterior sincronización. |
| **Actores** | **Principal:** Cliente (`Customer`), Cajero (`Cashier`)<br>**Secundario:** Sistema de Almacenamiento Local (PWA / SQLite) |
| **Precondiciones** | El dispositivo carece de conexión a Internet y posee el catálogo de existencias sincronizado en la base local. |
| **Flujo Normal** | **1.** El usuario selecciona la prenda y talla deseada desde el catálogo local en modo sin conexión y pulsa apartar prenda.<br>**2.** El sistema genera un identificador único universal (`client_reservation_id UUIDv4`) para la transacción offline.<br>**3.** El sistema guarda la reserva en el almacén local del dispositivo con estado pendiente de sincronización.<br>**4.** El sistema descuenta la unidad del inventario local en caché para evitar que la misma terminal vuelva a reservar o vender la misma prenda.<br>**5.** La aplicación emite el comprobante de contingencia con el código UUID visible y la advertencia: *"Reserva Offline - Sujeta a confirmación al restablecerse la conexión a Internet"*. |
| **Flujos Alternativos** | **1. A1 [Stock local en caché agotado]:** Si la base local marca existencias en cero para la variante seleccionada, el sistema impide la reserva e informa que no hay unidades conocidas en la sucursal.<br>**3. A1 [Fallo en almacenamiento local]:** Si ocurre un error de cuota o corrupción en el almacenamiento local del dispositivo, el sistema cancela la operación y mantiene íntegro el inventario previo. |
| **Poscondiciones** | Reserva almacenada de forma inmutable en el dispositivo cliente esperando el restablecimiento de red para su subida al servidor. |

---

### CU12: Atender y Resolver Conflictos de Reservas Expiradas

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU12 - Atender y Resolver Conflictos de Reservas Expiradas** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 31/10/2026 |
| **Descripción** | Permite liberar automáticamente el inventario de aquellas reservas que superaron su fecha límite de validez sin ser retiradas, y faculta al Encargado de Sucursal para resolver administrativamente reclamos presenciales de clientes que se presentan con reservas expiradas mediante reasignación de stock, sustitución de prenda o anulación formal con nota de auditoría. |
| **Actores** | **Principal:** Encargado de Sucursal (`Branch Manager`)<br>**Secundario:** Proceso Central de Expiración (`Backend API`), Cliente (`Customer`) |
| **Precondiciones** | Existen reservas registradas cuya fecha y hora límite ha vencido (`expires_at < now()`). |
| **Flujo Normal** | **1.** El proceso programado en el servidor inspecciona las reservas activas y detecta registros cuya fecha límite ha expirado.<br>**2.** El sistema actualiza el estado de la reserva a expirada, cancela el apartado y devuelve automáticamente las unidades al stock disponible público de la sucursal.<br>**3.** Si un cliente asiste tardíamente a la tienda reclamando una reserva vencida, el Encargado abre la sección de resolución de conflictos de reserva e introduce el código.<br>**4.** El sistema muestra los datos de la reserva, la hora de expiración y las existencias actuales de la prenda en la tienda.<br>**5.** El Encargado evalúa la situación con el cliente y selecciona una vía de resolución:<br> a. Si aún hay existencias disponibles en tienda, revalida la reserva y la transfiere directamente a la caja para cobro.<br> b. Si la prenda ya fue vendida a otro comprador, propone una talla alternativa o modelo similar.<br> c. Si el cliente no acepta alternativas, confirma la anulación definitiva de la reserva.<br>**6.** El Encargado registra la justificación en una nota de auditoría y el sistema asienta la resolución cerrando el conflicto. |
| **Flujos Alternativos** | **4. A1 [Código de reserva no localizado o de otra sucursal]:** Si el código presentado no existe o corresponde a otra sede, el sistema alerta al Encargado para que oriente al cliente a su tienda de origen.<br>**5. A1 [Cliente desiste tras prueba]:** Si el cliente asiste dentro de plazo pero desiste de comprar la prenda tras medírsela en el probador, el Encargado cancela la reserva en el sistema y el stock regresa a venta libre de inmediato. |
| **Poscondiciones** | Ningún inventario queda retenido indefinidamente; el stock no reclamado se restituye a venta pública y las atenciones tardías quedan documentadas con trazabilidad. |

---

### CU13: Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU13 - Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 31/10/2026 |
| **Descripción** | Permite al cajero continuar cobrando y emitiendo ventas presenciales en el punto de venta durante caídas de Internet, forzando obligatoriamente el cobro en efectivo al contado (Política 5), generando un identificador único universal (UUIDv4) y guardando la transacción localmente para garantizar la continuidad operativa de la sucursal. |
| **Actores** | **Principal:** Cajero / Vendedor (`Cashier`)<br>**Secundario:** Sistema POS Local (IndexedDB / SQLite) |
| **Precondiciones** | La terminal de punto de venta no dispone de conexión a Internet y posee el catálogo local cargado en IndexedDB o SQLite. |
| **Flujo Normal** | **1.** El cajero escanea o selecciona las prendas solicitadas por el cliente desde la interfaz de contingencia del POS.<br>**2.** El sistema calcula subtotales e impuestos basándose en los precios de las variantes almacenadas en la base local.<br>**3.** El sistema impone la regla comercial offline: restringe los medios de pago permitiendo **únicamente cobro en efectivo al contado**, manteniendo deshabilitadas las opciones electrónicas.<br>**4.** El cajero ingresa el importe de dinero recibido y el sistema calcula el cambio a entregar.<br>**5.** El cajero confirma la venta offline.<br>**6.** El sistema genera un identificador universal único (`operation_uuid` versión UUIDv4) para la transacción.<br>**7.** El sistema guarda la venta en el almacenamiento local del dispositivo con estado pendiente de sincronización.<br>**8.** El sistema descuenta el stock en la base local para no volver a ofrecer las mismas prendas en cobros posteriores en esa terminal.<br>**9.** El sistema emite e imprime el comprobante de venta de contingencia con el código UUID visible y la advertencia de operación offline. |
| **Flujos Alternativos** | **3. A1 [Intento de cobro con tarjeta o medio electrónico]:** Si el cajero intenta seleccionar pago con tarjeta o transferencia digital, el sistema bloquea la acción y emite una alerta indicando que por política de seguridad sin red solo se admite efectivo.<br>**4. A1 [Efectivo entregado menor al total]:** Si el dinero ingresado no cubre el monto total de la venta, el sistema no permite confirmar la operación hasta ingresar el monto completo.<br>**1. A1 [Stock local en cero]:** Si el inventario local marca cero unidades de la prenda, el sistema advierte el posible desabastecimiento antes de registrar. |
| **Poscondiciones** | Venta presencial asentada de forma inmutable en el almacenamiento local del dispositivo con UUIDv4 propio, lista para ser enviada al servidor al reanudar la red. |

---

### CU14: Gestionar Bandeja Local de Operaciones Pendientes (Outbox PWA / SQLite)

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU14 - Gestionar Bandeja Local de Operaciones Pendientes (Outbox PWA / SQLite)** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 31/10/2026 |
| **Descripción** | Permite al cajero o personal de tienda consultar, inspeccionar y monitorear la bandeja de salida (*outbox*) de todas las ventas y reservas offline emitidas en el dispositivo que aún no han sido transferidas al servidor central, visualizando el contador de operaciones pendientes y pudiendo forzar el envío manual al restablecerse la red. |
| **Actores** | **Principal:** Cajero / Vendedor (`Cashier`)<br>**Secundario:** Sistema de Almacenamiento Local (PWA / SQLite) |
| **Precondiciones** | Se han registrado una o más operaciones en modo desconectado en el dispositivo. |
| **Flujo Normal** | **1.** El cajero ingresa a la pestaña de "Operaciones Pendientes (Outbox)" desde el panel del punto de venta.<br>**2.** El sistema recupera de la base local la lista de transacciones offline y presenta en pantalla: código UUID, fecha y hora de emisión, importe total y estado actual (`PENDIENTE_SYNC`).<br>**3.** El sistema despliega un indicador visual en color ámbar con la cantidad total de tickets en espera de sincronización.<br>**4.** El cajero selecciona una transacción para inspeccionar el detalle de prendas, tallas y desglose de cobro.<br>**5.** Al verificar que la conexión a Internet ha regresado, el cajero puede presionar la opción de forzar sincronización manual para despachar el lote inmediatamente. |
| **Flujos Alternativos** | **2. A1 [Bandeja vacía sin operaciones pendientes]:** Si no existen ventas pendientes de subida, el sistema presenta la bandeja limpia con un indicador verde que confirma que todos los registros locales están sincronizados con la nube.<br>**5. A1 [Dispositivo aún sin red al forzar envío]:** Si el usuario presiona forzar sincronización pero la red continúa caída, el sistema notifica que el dispositivo sigue desconectado y conserva las transacciones en la bandeja sin alterarlas. |
| **Poscondiciones** | El personal de tienda mantiene control visual de los comprobantes locales emitidos que aún están pendientes de consolidación central. |

---

### CU15: Sincronizar Lotes de Ventas con Idempotencia Central (sync_operations)

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU15 - Sincronizar Lotes de Ventas con Idempotencia Central (sync_operations)** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 31/10/2026 |
| **Descripción** | Permite transmitir en lotes hacia el backend las ventas registradas localmente en contingencia cuando se restablece la conexión a Internet, aplicando un protocolo de **idempotencia transaccional** mediante validación del UUID contra la tabla de auditoría `sync_operations` para impedir que una transacción se procese o descuente inventario más de una vez ante reintentos de red. |
| **Actores** | **Principal:** Motor de Sincronización (`Sync Engine`), Cajero (`Cashier`)<br>**Secundario:** Sistema Central (`Backend API`) |
| **Precondiciones** | El dispositivo recupera la conexión a Internet y existen ventas con estado `PENDIENTE_SYNC` en la base local. |
| **Flujo Normal** | **1.** El motor de sincronización detecta el evento de reconexión a Internet y empaqueta las ventas locales pendientes de la sucursal.<br>**2.** La aplicación despacha el lote de operaciones hacia el endpoint central de sincronización del backend.<br>**3.** El sistema central procesa cada venta del lote bajo control transaccional estricto:<br> a. Consulta la tabla de auditoría de sincronización buscando el código universal (`operation_uuid`).<br> b. Al verificar que el UUID no existe previamente, inserta la venta definitiva, registra el detalle de prendas vendidas, descuenta las unidades del inventario central de la sucursal y asienta el UUID en la tabla de auditoría con estado aplicado.<br>**4.** El sistema central retorna un acuse de recibo confirmando la recepción y aceptación de las operaciones procesadas.<br>**5.** La aplicación en el cliente actualiza el estado de las ventas locales a sincronizadas y vacía la bandeja outbox, cambiando el indicador visual a color verde. |
| **Flujos Alternativos** | **3. A1 [Operación duplicada por reintento de red - Garantía de Idempotencia]:** Si por una pérdida intermitente de señal el cliente reenvía un lote que el servidor ya había recibido y aplicado, el sistema central detecta que el UUID ya existe en la tabla de auditoría; confirma inmediatamente el éxito al cliente **sin volver a insertar la venta ni descontar existencias por segunda vez**.<br>**3. A2 [Venta con quiebre de stock central detectado]:** Si al momento de aplicar la venta offline las existencias centrales de la prenda ya fueron agotadas por ventas online concurrentes, el sistema central marca la transacción en estado en conflicto para resolución gerencial (CU16) y continúa procesando el resto del lote.<br>**2. A1 [Falla de comunicación durante la subida]:** Si la conexión se interrumpe antes de recibir el acuse de recibo del servidor, el cliente mantiene todas las operaciones en la bandeja outbox para reintentar en el siguiente ciclo. |
| **Poscondiciones** | Ventas e ingresos consolidados en la base de datos central sin duplicaciones contables y con inventario central actualizado. |

---

### CU16: Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU16 - Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 31/10/2026 |
| **Descripción** | Permite al Encargado de Sucursal inspeccionar, conciliar y resolver aquellas ventas emitidas offline que entraron en estado de conflicto durante la sincronización debido a quiebres de inventario central (sobreventa concurrente durante la desconexión), permitiendo autorizar stock negativo con reposición, coordinar sustitución de prenda o emitir una Nota de Crédito al cliente. |
| **Actores** | **Principal:** Encargado de Sucursal (`Branch Manager`)<br>**Secundario:** Sistema Central de Auditoría (`Backend API`), Cajero (`Cashier`) |
| **Precondiciones** | Existen ventas offline sincronizadas marcadas con estado `EN_CONFLICTO` en la sucursal. |
| **Flujo Normal** | **1.** El sistema alerta al Encargado de Sucursal sobre una venta offline que colisionó por falta de existencias centrales al sincronizarse.<br>**2.** El Encargado accede a la sección de resolución de conflictos de venta e inspecciona el ticket emitido, el cajero responsable y la prenda afectada.<br>**3.** El Encargado evalúa la situación física de la tienda y selecciona una de las tres vías de resolución reglamentarias:<br> a. **Resolución por Reposición:** Autoriza la venta asentando saldo temporal negativo en inventario y genera una orden de reposición prioritaria desde otra sucursal.<br> b. **Resolución por Sustitución:** Contacta al cliente para acordar el cambio por otra prenda o talla disponible de igual valor.<br> c. **Resolución Contable con Nota de Crédito:** Anula contablemente la venta del ítem y emite una Nota de Crédito formal a favor del cliente.<br>**4.** El Encargado redacta una nota de auditoría justificando la decisión tomada.<br>**5.** El sistema actualiza el registro de la venta a estado resuelto, asienta los movimientos de inventario correspondientes y cierra la incidencia. |
| **Flujos Alternativos** | **3. A1 [Discrepancia física en tienda]:** Si el Encargado constata que la prenda física aún se encuentra en mostrador por error de despacho, cancela el conflicto y ajusta el inventario central manualmente.<br>**4. A1 [Omisión de nota de justificación]:** El sistema bloquea el cierre del conflicto si el Encargado no introduce la justificación obligatoria de auditoría. |
| **Poscondiciones** | Consistencia eventual de inventario y balances restaurada con registro de auditoría completo y sin descuadres en la caja física. |

---

### CU17: Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Estado

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU17 - Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Estado** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 31/10/2026 |
| **Descripción** | Permite tramitar el cambio de una prenda previamente adquirida por otra talla o modelo dentro del plazo de garantía; si la prenda nueva tiene un precio de venta superior, el cambio **se consolida única y exclusivamente cuando el cliente abona la diferencia de precio** en caja (Política 1), exigiendo además que la prenda devuelta conserve su etiqueta original y no presente signos de uso. |
| **Actores** | **Principal:** Cajero / Vendedor (`Cashier`), Cliente (`Customer`)<br>**Secundario:** Sistema POS Central (`Backend API`) |
| **Precondiciones** | El cliente presenta el comprobante de venta original y la solicitud se encuentra dentro del plazo comercial establecido por la empresa (ej. 15 o 30 días). |
| **Flujo Normal** | **1.** El cajero introduce el número de ticket o código UUID de la venta original en el sistema.<br>**2.** El sistema recupera los ítems de la compra y el cajero selecciona la prenda que el cliente desea cambiar (ej. Vestido Talla M, pagado originalmente a Bs 50).<br>**3.** El cajero realiza la inspección física de la prenda, confirmando que mantiene su etiqueta textil original y no presenta señales de lavado ni desgaste.<br>**4.** El cajero selecciona la nueva prenda o talla solicitada dentro del catálogo de la boutique (ej. Vestido Talla L a precio de lista Bs 70).<br>**5.** El sistema calcula la diferencia de precio: Importe Prenda Nueva menos Importe Abonado Original (Bs 70 - Bs 50 = Bs 20 a cobrar).<br>**6.** El sistema solicita el cobro de la diferencia de precio e instruye al cajero solicitar el abono correspondiente.<br>**7.** El cliente entrega el dinero en caja y el cajero registra el pago del saldo de Bs 20.<br>**8.** El sistema consolida la operación de cambio: reingresa la prenda devuelta al stock disponible, descuenta la nueva prenda entregada y asienta el ingreso adicional en la caja.<br>**9.** El sistema emite el comprobante oficial de cambio detallando la transacción y entrega la nueva prenda al cliente. |
| **Flujos Alternativos** | **3. A1 [Prenda sin etiqueta o con señales de uso]:** Si el cajero constata que la prenda carece de etiqueta textil o fue usada, marca la condición física como no conforme; el sistema bloquea inmediatamente la operación y se devuelve la prenda al cliente sin cambio.<br>**7. A1 [Cliente no abona la diferencia de precio - Regla Inviolable]:** Si el cliente se niega a pagar los Bs 20 de diferencia comercial, el sistema aborta la transacción de inmediato; no se modifica el inventario de ninguna talla y el cliente conserva su prenda original.<br>**5. A1 [Prenda nueva de menor valor]:** Si la prenda de reemplazo cuesta menos que la original (ej. de Bs 70 a Bs 50), el sistema calcula el saldo a favor del cliente y genera una Nota de Crédito digital por la diferencia (Bs 20) para compras futuras.<br>**1. A1 [Ticket vencido fuera de plazo]:** Si han transcurrido más días que los permitidos por la política de la empresa desde la compra, el sistema rechaza el inicio del trámite. |
| **Poscondiciones** | Cambio formalmente consolidado respetando el cobro obligatorio de la diferencia de precio, con inventarios y caja de la sucursal balanceados. |

---

### CU18: Procesar Devolución de Prenda con Retención Operativa y Nota de Crédito

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU18 - Procesar Devolución de Prenda con Retención Operativa y Nota de Crédito** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 31/10/2026 |
| **Descripción** | Permite tramitar la devolución formal de una prenda de vestir dentro del plazo hábil, aplicando la política comercial de retención operativa configurada por la empresa (entre el 20% y el 50% sobre el importe abonado) por concepto de desinfección textil e inspección logística, y emitiendo el reembolso neto (entre el 50% y el 80%) preferentemente mediante una **Nota de Crédito Digital** para compras futuras. |
| **Actores** | **Principal:** Cajero / Vendedor (`Cashier`), Cliente (`Customer`)<br>**Secundario:** Sistema POS Central (`Backend API`) |
| **Precondiciones** | El cliente presenta comprobante de compra válido dentro del plazo de devolución del tenant (ej. 7 a 15 días posteriores a la venta). |
| **Flujo Normal** | **1.** El cajero localiza la venta original en el sistema mediante el código de ticket.<br>**2.** El cajero selecciona la prenda que el cliente devuelve y verifica que conserve su etiqueta original sin indicios de uso.<br>**3.** El sistema consulta el porcentaje de retención operativa configurado para la empresa (tasa $R$ entre 20% y 50%) y calcula el desglose financiero:<br> a. Importe pagado originalmente: Bs 100.<br> b. Retención operativa de la boutique (ej. 30%): Bs 30 (queda a favor de la empresa).<br> c. Reembolso neto a entregar al cliente (70%): Bs 70.<br>**4.** El sistema presenta el desglose en pantalla y el cliente elige la modalidad de reembolso deseada:<br> a. **Modalidad A:** Emisión de **Nota de Crédito Digital** (`NC-YYYYMMDD-XXXX`) utilizable en cualquier sucursal.<br> b. **Modalidad B:** Devolución de dinero en efectivo de la caja.<br>**5.** El cajero confirma la operación y entrega el comprobante de la Nota de Crédito o el dinero al cliente.<br>**6.** El sistema registra la devolución, reincorpora la prenda al inventario de la sucursal y asienta el egreso y retención contable.<br>**7.** El sistema imprime la constancia de devolución para respaldo de ambas partes. |
| **Flujos Alternativos** | **2. A1 [Prenda usada o sin etiquetas]:** Si la prenda presenta signos de uso o fue alterada, el cajero rechaza la solicitud según la política de sanidad textil de la empresa.<br>**4. A1 [Cliente rechaza la retención porcentual]:** Si el cliente no acepta el descuento de retención operativa establecido por la boutique, se cancela la devolución y el cliente conserva la prenda sin alterar el inventario ni la caja.<br>**1. A1 [Plazo de devolución expirado]:** Si la solicitud se realiza fuera del periodo estipulado por el tenant, el sistema bloquea el procesamiento de la devolución. |
| **Poscondiciones** | Devolución asentada aplicando la retención porcentual reglamentaria, con reingreso de la prenda al inventario y emisión de Nota de Crédito o egreso de caja documentado. |

---

## Índice de Fichas Técnicas — Presentación 3 (Geolocalización, IA, Analítica y Dashboard: CU19 al CU25)

19. [CU19: Localizar Sucursales y Trazar Rutas (OpenStreetMap / ORS)](#cu19-localizar-sucursales-y-trazar-rutas-openstreetmap--ors)
20. [CU20: Generar Reportes Ejecutivos por Voz y Lenguaje Natural (Gemini RAG)](#cu20-generar-reportes-ejecutivos-por-voz-y-lenguaje-natural-gemini-rag)
21. [CU21: Exportar Reportes Empresariales a Formatos PDF y Excel](#cu21-exportar-reportes-empresariales-a-formatos-pdf-y-excel)
22. [CU22: Generar Dataset Sintético de Ventas y Estacionalidad](#cu22-generar-dataset-sintético-de-ventas-y-estacionalidad)
23. [CU23: Predecir Demanda de Ropa (ML Supervisado)](#cu23-predecir-demanda-de-ropa-ml-supervisado)
24. [CU24: Segmentar Clientes con K-Means (ML No Supervisado)](#cu24-segmentar-clientes-con-k-means-ml-no-supervisado)
25. [CU25: Visualizar Dashboard Ejecutivo con KPIs y Métricas ML](#cu25-visualizar-dashboard-ejecutivo-con-kpis-y-métricas-ml)

---

### CU19: Localizar Sucursales y Trazar Rutas (OpenStreetMap / ORS)

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU19 - Localizar Sucursales y Trazar Rutas (OpenStreetMap / ORS)** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 03/11/2026 |
| **Descripción** | Permite al cliente localizar geográficamente las sucursales físicas de la empresa contratante (*tenant*) sobre un mapa interactivo renderizado con OpenStreetMap en la aplicación móvil Flutter, consultar sus detalles (dirección, horario, teléfono) y trazar la ruta óptima de navegación (a pie o en vehículo) desde su ubicación GPS actual mediante el motor de rutas OpenRouteService (ORS), visualizando distancia kilométrica y tiempo estimado de llegada. |
| **Actores** | **Principal:** Cliente (`Customer`), Administrador de Tienda (`Tenant Admin`)<br>**Secundario:** Servicio de Mapas y Ruteo (`OpenStreetMap / OpenRouteService API`), Sistema Central (`Backend API`) |
| **Precondiciones** | El cliente cuenta con la aplicación móvil instalada, conexión a Internet para descarga de teselas cartográficas y permisos de geolocalización concedidos en el dispositivo. Las sucursales del tenant están registradas con coordenadas válidas (`latitude`, `longitude`). |
| **Flujo Normal** | **1.** El cliente pulsa la opción "Nuestras Tiendas / Sucursales" en el menú principal de la aplicación móvil.<br>**2.** La aplicación solicita la posición geográfica actual del dispositivo mediante el sensor GPS.<br>**3.** El sistema consulta al backend la lista de sucursales activas de la empresa contratante (`GET /api/v1/branches/`).<br>**4.** El sistema dibuja el mapa interactivo utilizando teselas vectoriales/raster de OpenStreetMap centrado en la posición del usuario.<br>**5.** El sistema renderiza los marcadores (*markers*) de cada sucursal en el mapa indicando nombre, dirección y estado operativo.<br>**6.** El cliente pulsa sobre el marcador de una sucursal para desplegar su tarjeta informativa con fotografía, horario de atención y botón "¿Cómo llegar?".<br>**7.** El cliente presiona "¿Cómo llegar?" y selecciona el perfil de transporte deseado (caminando `foot-walking` o en vehículo `driving-car`).<br>**8.** La aplicación envía las coordenadas de origen (GPS del usuario) y destino (sucursal) al servicio de OpenRouteService (ORS).<br>**9.** El servicio ORS calcula la geometría del trayecto, distancia total y tiempo estimado de viaje.<br>**10.** La aplicación dibuja la polilínea interactiva de la ruta sobre el mapa y despliega un panel flotante con la distancia en kilómetros y el tiempo estimado de llegada. |
| **Flujos Alternativos** | **2. A1 [Permiso de ubicación GPS denegado por el usuario]:** Si el cliente rechaza los permisos de geolocalización, el sistema centra el mapa en la sucursal principal por defecto de la boutique y muestra un aviso solicitando ingresar una ubicación manual o activar el GPS para cálculo de trayectos.<br>**3. A1 [Sucursales sin coordenadas configuradas]:** Si alguna sucursal carece de latitud/longitud válida, el sistema la lista en modo texto pero omite su marcador en el mapa para evitar inconsistencias visuales.<br>**8. A1 [Falla de conectividad o límite de cuota en OpenRouteService]:** Si el servicio de ORS no responde o se excede la cuota de peticiones, el sistema traza una línea recta geodésica indicando la distancia radial euclidiana aproximada y abre la opción de redirigir a la app externa de mapas del sistema operativo (Google Maps / Apple Maps). |
| **Poscondiciones** | Ruta de navegación física proyectada en el mapa móvil, facilitando el retiro presencial de compras, atención de reservas o prueba de prendas en tienda física. |

---

### CU20: Generar Reportes Ejecutivos por Voz y Lenguaje Natural (Gemini RAG)

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU20 - Generar Reportes Ejecutivos por Voz y Lenguaje Natural (Gemini RAG)** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 03/11/2026 |
| **Descripción** | Permite al Administrador de Tienda o Superadministrador formular consultas gerenciales en lenguaje natural mediante voz (micrófono) o texto desde el portal directivo; el sistema ejecuta una recuperación contextual aumentada (RAG) consultando en tiempo real las métricas de ventas, inventario y retenciones de su empresa bajo estricto aislamiento multitenant (`tenant_id`), sintetizando un reporte ejecutivo procesado por Google Gemini que se entrega en pantalla mediante gráficos/tablas y en formato auditivo (*Text-to-Speech*). |
| **Actores** | **Principal:** Administrador de Tienda (`Tenant Admin`), Superadministrador (`Superadmin`)<br>**Secundario:** Servicio de Inteligencia Artificial (`Google Gemini API`), Sistema Central (`Backend API`) |
| **Precondiciones** | Usuario autenticado con rol directivo (`tenant_admin` o `superadmin`), empresa con suscripción activa que incluye módulo de IA (Plan Profesional o Empresarial) y micrófono habilitado en el navegador/dispositivo. |
| **Flujo Normal** | **1.** El administrador accede al asistente analítico del panel directivo y pulsa el botón del micrófono para dictar su consulta (ej. *"¿Cuáles fueron las 3 prendas más vendidas y cuánto se retuvo por devoluciones en la sucursal Norte este mes?"*).<br>**2.** El frontend captura el flujo de audio y lo transmite al backend para su procesamiento y transcripción a texto (*Speech-to-Text*).<br>**3.** El sistema backend identifica la intención de negocio, extrae las entidades temporales y geográficas (fechas, sucursal) y ejecuta consultas analíticas parametrizadas en PostgreSQL filtradas rigurosamente por el claim `tenant_id` del token JWT.<br>**4.** El sistema ensambla un contexto estructurado en formato JSON con las cifras reales recuperadas de la base de datos (ventas, existencias, devoluciones).<br>**5.** El sistema inyecta el contexto auditado en un prompt del sistema y lo envía a la API de Google Gemini para síntesis ejecutiva.<br>**6.** Google Gemini genera una respuesta analítica concisa con conclusiones estratégicas y recomendaciones operativas.<br>**7.** El backend sintetiza el flujo de audio con voz natural (*Text-to-Speech*) y estructura los datos tabulares/gráficos correspondientes.<br>**8.** El frontend reproduce la respuesta por los altavoces y renderiza simultáneamente las tarjetas de métricas, tablas y gráficos comparativos en el panel. |
| **Flujos Alternativos** | **1. A1 [Plan de suscripción sin acceso a módulo de IA]:** Si la empresa se encuentra en el Plan Básico (sin IA), el sistema bloquea el micrófono y muestra un modal advirtiendo que los reportes por voz requieren actualizar al Plan Profesional.<br>**3. A1 [Intento de consulta cruzada entre empresas - Violación de Aislamiento]:** Si la formulación lingüística intenta consultar datos de otro tenant o sucursales no pertenecientes a la empresa, el backend neutraliza la petición limitando el contexto exclusivamente al `tenant_id` autenticado.<br>**2. A1 [Audio inaudible o ruido ambiente excesivo]:** Si el motor de reconocimiento no logra decodificar la voz con un nivel mínimo de confianza, solicita al usuario repetir la pregunta o ingresarla mediante el teclado.<br>**5. A1 [Indisponibilidad o timeout de la API de Gemini]:** Si el servicio de Gemini excede el tiempo límite de espera, el sistema presenta un reporte tradicional con tablas y gráficos SQL predefinidos sin la interpretación generativa. |
| **Poscondiciones** | Reporte gerencial multicanal (voz, texto y visual) generado respetando el aislamiento estricto de datos del tenant, optimizando la toma de decisiones directivas sin requerir conocimientos técnicos de SQL. |


---

### CU21: Exportar Reportes Empresariales a Formatos PDF y Excel

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU21 - Exportar Reportes Empresariales a Formatos PDF y Excel** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 03/11/2026 |
| **Descripción** | Permite al Administrador de Tienda, Encargado de Sucursal o Superadministrador parametrizar filtros (rango de fechas, sucursal, producto, variante, tipo de movimiento) y generar documentos formales descargables de auditoría en formatos PDF de alta fidelidad tipográfica (ReportLab) y hojas de cálculo Excel estructuradas (OpenPyXL) para tres dominios analíticos: Ventas Consolidadas, Inventario y Disponibilidad, y Kardex de Movimientos, garantizando aislamiento multitenant estricto (tenant_id) y streaming binario sin consumo excesivo de memoria. |
| **Actores** | **Principal:** Administrador de Tienda (`Tenant Admin`), Encargado de Sucursal (`Branch Manager`), Superadministrador (`Superadmin`)<br>**Secundario:** Motor de Generación Documental (`Backend API - ReportLab / OpenPyXL`), Base de Datos Relacional (`PostgreSQL`) |
| **Precondiciones** | Usuario autenticado con rol administrativo o gerencial (`administrador`, `encargado`, `superadmin`). En caso del Encargado, su ámbito de datos se restringe forzosamente a su sucursal asignada (`branch_id`). |
| **Flujo Normal** | **1.** El usuario accede a la sección de Reportes y Exportación Empresarial en la Web PWA.<br>**2.** El sistema presenta las tres pestañas de reporte: Ventas (con desglose de tienda física POS y online Stripe), Inventario (existencias físicas, apartados y disponible) y Movimientos (kardex de entradas, salidas, cambios y devoluciones).<br>**3.** El usuario configura los filtros deseados: rango de fechas (desde/hasta), sucursal (si es administrador) o producto/SKU específico.<br>**4.** El sistema consulta y despliega la vista previa reactiva en pantalla con métricas de resumen (total de ventas brutas, unidades movidas, stock crítico).<br>**5.** El usuario pulsa el botón de exportación deseado: "Exportar a PDF" o "Exportar a Excel (.xlsx)".<br>**6.** El frontend despacha la solicitud con los filtros al endpoint correspondiente (`GET /api/reports/{domain}/export/pdf` o `/export/excel`).<br>**7.** El controlador backend valida los privilegios del rol e inyecta el `tenant_id` y `branch_id` (si es encargado).<br>**8.** El servicio de dominio ejecuta la agregación en PostgreSQL y transfiere los registros estructurados al generador documental:<br> a. **Motor PDF (ReportLab):** Compila una plantilla con membrete de la empresa, paleta corporativa, metadatos, tabla con estilo de celda alternado y pie de página con paginación legal.<br> b. **Motor Excel (OpenPyXL):** Construye un libro de cálculo con cabecera estilizada, tipos de datos numéricos/moneda reales, anchos de columna autoajustados y fórmulas de totales.<br>**9.** El backend transmite el archivo en streaming binario (`StreamingResponse`) con cabeceras `Content-Disposition: attachment; filename="..."`.<br>**10.** El navegador descarga automáticamente el documento generado listo para impresión o auditoría contable. |
| **Flujos Alternativos** | **7. A1 [Encargado intenta exportar datos de otra sucursal]:** Si el token pertenece a un Encargado y los filtros especifican otra sucursal distinta a su `branch_id`, el backend sobreescribe el parámetro fijando su propia sede o rechaza con HTTP 403 Forbidden.<br>**8. A1 [Conjunto de datos vacío / Sin registros para el rango]:** Si la consulta no arroja movimientos en las fechas seleccionadas, el generador emite el documento con la estructura y encabezados completos indicando "Sin registros para el periodo seleccionado" con total cero, sin arrojar excepción de servidor.<br>**6. A1 [Petición sin tenant_id en token JWT]:** El backend deniega la solicitud inmediatamente con HTTP 401 Unauthorized para proteger el aislamiento de empresas.<br>**9. A1 [Interrupción de red durante descarga streaming]:** El cliente puede reintentar la solicitud de forma idempotente sin alterar ningún estado transaccional en la base de datos. |
| **Poscondiciones** | Archivo digital (.pdf o .xlsx) generado y entregado al usuario con firma de auditoría temporal, reflejando el estado contable de la empresa sin permitir fugas de información entre tenants. |

---

### CU22: Generar Dataset Sintético de Ventas y Estacionalidad

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU22 - Generar Dataset Sintético de Ventas y Estacionalidad** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 03/11/2026 |
| **Descripción** | Permite al Administrador de Tienda o Superadministrador parametrizar y disparar un generador estocástico en el backend (`scripts/generate_synthetic_data.py`) que modela matemáticamente los patrones de compra, estacionalidad climática (verano/invierno), quincenas, picos promocionales y distribuciones gaussianas de tallas del sector textil, produciendo más de 10,000 registros transaccionales hiperrealistas persistidos en PostgreSQL para servir de insumo de entrenamiento a los modelos de Machine Learning (Supervisado de demanda y No Supervisado K-Means). |
| **Actores** | **Principal:** Administrador de Tienda (`Tenant Admin`), Superadministrador (`Superadmin`)<br>**Secundario:** Motor Estocástico de Simulación (`Backend Script - NumPy / Pandas`), Base de Datos Relacional (`PostgreSQL`) |
| **Precondiciones** | Usuario con rol administrativo autenticado en el portal directivo de la plataforma. La empresa cuenta con categorías y variantes de prendas activas para su parametrización. |
| **Flujo Normal** | **1.** El administrador accede al módulo de Analítica Avanzada e Inteligencia de Negocios en el panel web.<br>**2.** Selecciona la opción "Generador de Datos de Simulación / Entrenamiento ML".<br>**3.** El sistema presenta el formulario de parametrización con valores recomendados: volumen de transacciones (5,000 a 20,000 registros), rango temporal histórico (12 a 24 meses), tasa base de devoluciones (8% a 15%) y ponderadores de estacionalidad climática.<br>**4.** El usuario ajusta los parámetros deseados o selecciona la configuración estándar de la industria textil y presiona "Iniciar Generación de Dataset".<br>**5.** El sistema backend inicia la rutina estocástica aplicando distribuciones de probabilidad reales:<br> a. Asigna mayor densidad de demanda a tallas intermedias (distribución normal centrada en tallas M y L).<br> b. Modela picos de ventas en los días de quincena (días 15 y 30 de cada mes) y campañas de liquidación de temporada.<br> c. Introduce ruido gaussiano controlado y casos de prueba para políticas de cambio de talla ($\Delta > 0$) y devoluciones con retención del 30%.<br>**6.** El motor valida la coherencia referencial y escribe el lote de transacciones simuladas en la base de datos con etiqueta de auditoría `is_synthetic = TRUE` bajo el `tenant_id` de la empresa.<br>**7.** El backend calcula estadísticas descriptivas del conjunto generado (distribución de frecuencias, promedios de ticket, correlaciones) y confirma la finalización exitosa.<br>**8.** La interfaz despliega un resumen gráfico del dataset (histogramas de ventas por mes, proporciones por categoría) y habilita los botones para entrenamiento y calibración de modelos predictivos. |
| **Flujos Alternativos** | **4. A1 [Parámetros de simulación fuera de rango estadístico]:** Si el usuario ingresa un volumen de registros excesivo que comprometa la memoria del servidor o un rango de fechas inválido, el sistema restringe el formulario a los límites operativos seguros (máximo 50,000 registros por lote).<br>**5. A1 [Catálogo sin variantes suficientes para simular]:** Si la empresa tiene menos de 3 categorías o variantes registradas, el sistema cancela la generación y solicita dar de alta variantes básicas antes de sintetizar transacciones.<br>**6. A1 [Falla de persistencia por tiempo de ejecución]:** Si la base de datos experimenta un bloqueo durante la inserción masiva, el script revierte la transacción atómica (*rollback*), dejando la base limpia sin registros truncados. |
| **Poscondiciones** | Conjunto de datos estructurado y coherente persistido en la base de datos central, etiquetado y disponible para alimentar el entrenamiento de modelos de regresión y clustering. |

---

### CU23: Predecir Demanda de Ropa (ML Supervisado)

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU23 - Predecir Demanda de Ropa (ML Supervisado)** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 03/11/2026 |
| **Descripción** | Permite al Administrador de Tienda proyectar cuantitativamente la cantidad estimada de unidades que demandará cada modelo y talla de prenda en las próximas 4 semanas para una sucursal específica, ejecutando un modelo de regresión de aprendizaje supervisado (`RandomForestRegressor` con $R^2 \ge 0.82$) entrenado con características de calendario, estacionalidad, tallas y rezagos de ventas, alertando preventivamente sobre posibles desabastecimientos de inventario. |
| **Actores** | **Principal:** Administrador de Tienda (`Tenant Admin`)<br>**Secundario:** Módulo Analítico de Machine Learning (`Scikit-Learn`), Sistema Central (`Backend API`) |
| **Precondiciones** | La empresa cuenta con historial transaccional (real o sintético validado en CU22), modelo de regresión calibrado y registrado en el servidor, y el tenant cuenta con Plan Profesional o Empresarial activo. |
| **Flujo Normal** | **1.** El administrador ingresa a la sección "Proyecciones de Demanda y Reabastecimiento" del panel de analítica.<br>**2.** El sistema presenta los filtros de inferencia: selección de sucursal física, categoría de prenda (ej. Abrigos y Chaquetas), modelo específico y horizonte de predicción (1 a 4 semanas).<br>**3.** El administrador selecciona la sucursal Norte, categoría de temporada y presiona "Calcular Proyección de Demanda".<br>**4.** El backend compila el vector de características (*features*) para el periodo futuro: codificación ordinal de talla, índice numérico de categoría, mes del año, indicador de estacionalidad climática (temporada fría/cálida) y series de rezago (*lags*) de las dos semanas previas.<br>**5.** El modelo supervisado `RandomForestRegressor` procesa el vector y genera la inferencia determinista de unidades estimadas de venta desagregadas por cada variante de talla.<br>**6.** El sistema cruza las unidades proyectadas contra el inventario disponible actual de la sucursal seleccionada.<br>**7.** El sistema calcula la brecha de stock ($\Delta_{	ext{stock}} = 	ext{Inventario Actual} - 	ext{Demanda Proyectada}$) y emite semáforos de advertencia:<br> a. Verde: Existencias suficientes para cubrir la demanda estimada.<br> b. Amarillo: Stock ajustado con riesgo de quiebre en semanas finales.<br> c. Rojo: Alerta crítica de desabastecimiento con sugerencia de reposición inmediata.<br>**8.** La interfaz renderiza el gráfico interactivo de curvas de demanda temporal y presenta una tabla con las órdenes de compra o traslados intersucursales sugeridos. |
| **Flujos Alternativos** | **3. A1 [Tenant con Plan Básico - Módulo Bloqueado]:** Si la empresa posee Plan Básico, el sistema bloquea el motor predictivo informando que los modelos avanzados de Machine Learning requieren suscripción Profesional.<br>**4. A1 [Modelo no entrenado o artefacto no localizado]:** Si no existe un modelo pre-entrenado para el tenant o sus pesos no están serializados, el sistema ejecuta un reentrenamiento en segundo plano utilizando el dataset sintético base y notifica que la predicción estará lista en segundos.<br>**7. A1 [Demanda nula proyectada]:** Si el modelo proyecta cero unidades para una prenda descontinuada o fuera de temporada, el sistema lo indica visualmente recomendando no generar pedidos a proveedores. |
| **Poscondiciones** | Proyección cuantitativa de demanda generada y visible en pantalla, proporcionando sustento empírico para la planificación de compras a proveedores y traslados preventivos entre tiendas físicas. |

---

### CU24: Segmentar Clientes con K-Means (ML No Supervisado)

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU24 - Segmentar Clientes con K-Means (ML No Supervisado)** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 03/11/2026 |
| **Descripción** | Permite al Administrador de Tienda agrupar y categorizar automáticamente a la cartera de clientes de su empresa en cuatro perfiles comerciales diferenciados mediante el algoritmo de agrupamiento no supervisado K-Means, evaluando vectores multidimensionales de comportamiento: Recencia, Frecuencia, Valor Monetario (modelo RFM) y Tasa de Devoluciones/Cambios de prenda, identificando clientes embajadores, compradores estacionales, cazadores de ofertas y perfiles de alto riesgo de logística inversa. |
| **Actores** | **Principal:** Administrador de Tienda (`Tenant Admin`)<br>**Secundario:** Módulo de Clustering de Inteligencia Artificial (`Scikit-Learn K-Means`), Sistema Central (`Backend API`) |
| **Precondiciones** | Existen registros de compras de clientes asociados al tenant y la empresa cuenta con suscripción a Plan Profesional o Empresarial. |
| **Flujo Normal** | **1.** El administrador accede a la sección "Segmentación y Comportamiento de Clientes" del módulo analítico.<br>**2.** El sistema presenta el panel con la última fecha de segmentación y el botón "Ejecutar Segmentación K-Means".<br>**3.** El administrador presiona ejecutar agrupamiento.<br>**4.** El backend extrae de la base de datos las métricas agregadas de cada cliente bajo el `tenant_id`:<br> a. Recencia ($R$): días desde la última compra realizada.<br> b. Frecuencia ($F$): total de órdenes concretadas en el último año.<br> c. Valor Monetario ($M$): monto acumulado gastado en bolivianos (Bs).<br> d. Tasa de Cambios/Devoluciones ($D$): porcentaje de compras que derivaron en cambio de talla o devolución con retención.<br>**5.** El sistema normaliza las variables utilizando escalado estándar (`StandardScaler`) para equilibrar pesos relativos.<br>**6.** El algoritmo K-Means ($k=4$, inicialización `k-means++`) procesa las observaciones y converge en cuatro centroides estables.<br>**7.** El sistema clasifica cada grupo en su arquetipo comercial oficial:<br> a. **Cluster 0 - Clientes VIP / Embajadores:** Alta frecuencia, gasto elevado y mínima tasa de devoluciones.<br> b. **Cluster 1 - Compradores de Temporada:** Compras concentradas en cambios de estación con ticket medio.<br> c. **Cluster 2 - Cazadores de Ofertas:** Frecuencia baja-moderada, compras ligadas a promociones y saldos.<br> d. **Cluster 3 - Perfil de Alto Retorno:** Frecuencia moderada con tasa de cambio/devolución superior al 40%.<br>**8.** La interfaz renderiza un gráfico de dispersión bidimensional interactivo con los centroides destacados y tablas de clientes pertenecientes a cada cluster.<br>**9.** El sistema genera recomendaciones comerciales automáticas para cada segmento (campañas de fidelización, preventas exclusivas o asistencia reforzada en probador virtual para reducir cambios). |
| **Flujos Alternativos** | **4. A1 [Volumen insuficiente de clientes para agrupar]:** Si el tenant cuenta con menos de 10 clientes registrados, el sistema advierte que el agrupamiento requiere una muestra mayor y sugiere utilizar el dataset sintético para demostración analítica.<br>**6. A1 [Convergencia inestable de clusters]:** Si la dispersión de datos no permite separar 4 clusters claros, el sistema ejecuta múltiples reinicios aleatorios (`n_init=10`) seleccionando la configuración con menor inercia de suma de cuadrados intra-cluster.<br>**1. A1 [Acceso restringido por plan]:** Si el tenant tiene Plan Básico, el sistema bloquea el módulo indicando que el clustering de clientes requiere Plan Profesional. |
| **Poscondiciones** | Perfiles de clientes etiquetados y almacenados en la base de datos, habilitando estrategias de mercadeo personalizadas y detección temprana de usuarios con alta propensión a devoluciones textiles. |

---

### CU25: Visualizar Dashboard Ejecutivo con KPIs y Métricas ML

| Campo | Especificación ICONIX |
| :--- | :--- |
| **Nombre** | **CU25 - Visualizar Dashboard Ejecutivo con KPIs y Métricas ML** |
| **Autor** | Equipo FashionStore / Sistemas 2 |
| **Fecha** | 03/11/2026 |
| **Descripción** | Permite al Administrador de Tienda y Superadministrador visualizar en un cuadro de mando integral e interactivo las métricas clave de desempeño (KPIs) en tiempo real: volumen consolidado de ventas (online y POS físico), saldo acumulado por retenciones operativas de devoluciones (20%-50%), porcentaje de sincronización exitosa de ventas offline, cuotas de sucursales activas, proyecciones de demanda de Machine Learning y distribución de clusters de clientes, consolidando toda la inteligencia de negocio en una sola vista estratégica. |
| **Actores** | **Principal:** Administrador de Tienda (`Tenant Admin`), Superadministrador (`Superadmin`)<br>**Secundario:** Sistema Central de Analítica (`Backend API`), Base de Datos Relacional (`PostgreSQL`) |
| **Precondiciones** | Usuario con rol directivo autenticado en la plataforma web. |
| **Flujo Normal** | **1.** El usuario inicia sesión y accede a la vista principal del Dashboard Directivo.<br>**2.** El sistema identifica el rol y el `tenant_id` del usuario autenticado para segmentar las consultas.<br>**3.** El backend ejecuta una agregación analítica optimizada sobre las tablas transaccionales de PostgreSQL:<br> a. Total de ingresos brutos y netos del día, semana y mes.<br> b. Monto recaudado por concepto de retenciones operativas en devoluciones de prendas (Política 2).<br> c. Conteo de cambios de prenda por talla con consolidación de pago de diferencia (Política 1).<br> d. Tasa de sincronización offline: tickets recibidos desde la bandeja outbox y estado de idempotencia.<br> e. Monitoreo de consumo de cuota de sucursales del plan de suscripción (ej. 2 de 3 sucursales ocupadas).<br> f. Resumen de predicciones del modelo de demanda supervisado y distribución de clientes en los 4 clusters K-Means.<br>**4.** El backend estructura los datos en un payload reactivo y lo envía al frontend.<br>**5.** La interfaz renderiza tarjetas numéricas de KPIs destacados con indicadores porcentuales de variación respecto al periodo anterior.<br>**6.** La interfaz despliega gráficos interactivos de barras y líneas para evolución temporal de ventas, gráfico de dispersión para clusters y tabla de inventario crítico.<br>**7.** El usuario puede interactuar con los gráficos, aplicar filtros de rango de fechas o seleccionar una sucursal física particular para desglosar sus métricas individuales.<br>**8.** Los datos se actualizan reactivamente permitiendo supervisión gerencial en tiempo real. |
| **Flujos Alternativos** | **2. A1 [Vista de Superadministrador]:** Si el usuario autenticado es el Superadmin de la plataforma, el Dashboard conmuta a la vista maestra de infraestructura SaaS, mostrando métricas agregadas de todos los tenants: total de empresas activas, facturación global por suscripciones, empresas en Plan Básico vs Profesional y estado de salud de los nodos de sincronización.<br>**3. A1 [Tenant nuevo sin movimientos comerciales]:** Si la empresa fue registrada recientemente y carece de ventas o devoluciones, el Dashboard muestra las tarjetas en estado cero con mensajes de bienvenida y guías interactivas para comenzar a registrar prendas y sucursales.<br>**4. A1 [Pérdida de conectividad en cliente mientras visualiza Dashboard]:** La aplicación mantiene en pantalla la última foto en memoria y despliega un aviso no intrusivo indicando que la actualización en tiempo real está pausada hasta recuperar red. |
| **Poscondiciones** | Estado integral del negocio presentado de forma ejecutiva y visual, respaldando la toma de decisiones gerenciales basadas en datos y consolidando la trazabilidad de los 25 Casos de Uso de FashionStore. |

---
*Fin de las Fichas Técnicas Oficiales de FashionStore — 25 Casos de Uso Definitivos (Metodología ICONIX / Sistemas 2 - 2026).*
