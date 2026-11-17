# 🔑 DIRECTORIO MAESTRO DE CREDENCIALES POR TENANT Y ROL
### Plataforma SaaS FashionStore — Sistemas 2 (Gestión 2026)

> **Contraseña Universal para todas las cuentas:** `Tiendafashion123!`  
> **Entornos de Acceso:**  
> - **Web PC (Administración, POS y Catálogo):** `http://localhost:4200/auth/login` (o en despliegue Render)  
> - **APK Móvil Android (Clientes / Catálogo / Reservas / Rutas):** [`FashionStore-release.apk`](file:///d:/Proyectos%20si%202/SEGUNDO%20PARCIAL%20SI2/ecommerce-SI2/FashionStore-release.apk)  

---

## 📋 Índice Rápido de Empresas
1. [Superadministrador Global](#-0-superadministrador-global-plataforma-saas)
2. [Boutique Elegance (Plan Profesional)](#-1-tenant-boutique-elegance-plan-profesional)
3. [Moda Urbana (Plan Básico)](#-2-tenant-moda-urbana-plan-básico)
4. [Boutique París S.R.L. (Plan Empresarial)](#-3-tenant-boutique-parís-srl-plan-empresarial)

---

## 🏢 1. Tenant: Boutique Elegance (Plan Profesional (IA habilitada, máx. 10 sucursales))
- **Tenant ID (UUID):** `17eeb457-a34c-47a4-8826-5d9e03d1dfe5`
- **Subdominio / Slug:** `elegance`

### 👔 Administrador General de la Boutique (5 disponibles)
> **Alcance:** Acceso total a catálogo, sucursales, inventario, reportes ejecutivos por voz/Gemini RAG (si el plan lo permite), métricas ML y políticas.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Valeria Castillo | `valeria.castillo5@fashionstore.bo` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |
| 2 | admin | `admin@elegance.com` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |
| 3 | Daniela Mamani | `daniela.mamani2@fashionstore.bo` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |
| 4 | Andrea Zeballos | `andrea.zeballos4@fashionstore.bo` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |
| 5 | Joaquin Gutierrez | `joaquin.gutierrez6@fashionstore.bo` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |

### 🏬 Encargado / Gerente de Sucursal (8 disponibles)
> **Alcance:** Gestión de reservas de sucursal, resolución de conflictos de reservas vencidas (CU12), sobreventas offline (CU16) y traslados.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Encargado La Paz | `encargado.lp@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Sucursal Central La Paz |
| 2 | Daniela Gutierrez | `daniela.gutierrez8@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique Elegance - Central |
| 3 | Natalia Morales | `natalia.morales10@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique Elegance - Central |
| 4 | Gabriela Arce | `gabriela.arce12@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique Elegance - Equipetrol |
| 5 | Paula Morales | `paula.morales14@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique Elegance - Central |
| 6 | Lucia Gutierrez | `lucia.gutierrez16@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique Elegance - Central |
| 7 | Encargado Boutique Elegance -  | `rodrigo.flores2@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique Elegance - Ventura Mall |
| 8 | Encargado Sucursal Cine Center | `javier.gutiérrez4@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Sucursal Cine Center |

### 💵 Cajero / Operador de Ventas POS (10 disponibles)
> **Alcance:** Operación en mostrador POS caja, cobro en efectivo desconectado (CU13), cambios con cobro de diferencia (CU17), devoluciones con retención (CU18) y sincronización por lotes (CU15).

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Cajero Elegance CU13 | `cajero_cu13_a@test.com` | `Tiendafashion123!` | `cajero` | Boutique Elegance - Central |
| 2 | Cajero Elegance CU15 | `cajero_cu15_a@test.com` | `Tiendafashion123!` | `cajero` | Boutique Elegance - Central |
| 3 | Cajera La Paz | `cajera.lp@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Sucursal Central La Paz |
| 4 | Camila Suárez | `camila.suarez.vm@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique Elegance - Ventura Mall |
| 5 | Lucas Montenegro | `lucas.montenegro.vm@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique Elegance - Ventura Mall |
| 6 | Valeria Justiniano | `valeria.justiniano.vm@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique Elegance - Ventura Mall |
| 7 | Natalia Roca | `natalia.roca20@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique Elegance - Central |
| 8 | Lorena Vargas | `lorena.vargas22@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique Elegance - Central |
| 9 | Romina Gutierrez | `romina.gutierrez24@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique Elegance - Equipetrol |
| 10 | Camila Vargas | `camila.vargas26@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique Elegance - Central |

### 🛍️ Cliente (Web y Móvil) (10 disponibles)
> **Alcance:** Navegación del catálogo exclusivo de la boutique, apartado de reservas offline/online, mapa de sedes y carrito de compras.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Nicole Castillo Montero | `nicole.castillomontero.elegance@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 2 | Mauricio Soruco Villarroel | `mauricio.sorucovillarroel.elegance@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 3 | Paola Andrea Añez Ribera | `paolaandrea.añezribera.elegance@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 4 | Bruno Montenegro Soliz | `bruno.montenegrosoliz.elegance@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 5 | Flavia Guzmán Baldivieso | `flavia.guzmánbaldivieso.elegance@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 6 | Diego Armando Ríos Claros | `diegoarmando.ríosclaros.elegance@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 7 | Silvia Peña Velasco | `silvia.peñavelasco.elegance@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 8 | Javier Fernández Ocampo | `javier.fernándezocampo.elegance@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 9 | Vanessa Salvatierra Ortiz | `vanessa.salvatierraortiz.elegance@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 10 | Gonzalo Chávez Echeverría | `gonzalo.chávezecheverría.elegance@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |

### 🛵 Delivery / Despachador (5 disponibles)
> **Alcance:** Visualización y despacho de pedidos confirmados para entrega a domicilio.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Samuel Mamani | `samuel.mamani32@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Boutique Elegance - Central |
| 2 | Camila Zeballos | `camila.zeballos34@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Boutique Elegance - Central |
| 3 | Delivery Boutique Elegance -  | `camila.justiniano1@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Boutique Elegance - Equipetrol |
| 4 | Delivery Boutique Elegance -  | `fernanda.mercado3@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Boutique Elegance - Ventura Mall |
| 5 | Delivery Sucursal Cine Center | `sofía.torrico7@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Sucursal Cine Center |

### 📦 Proveedor Externo de Prendas (2 disponibles)
> **Alcance:** Inspección de stock de insumos y solicitud de reposición de mercadería.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Elena Añez | `elena.añez36@fashionstore.bo` | `Tiendafashion123!` | `proveedor` | Global / Sin Sede |
| 2 | Camila Añez | `camila.añez38@fashionstore.bo` | `Tiendafashion123!` | `proveedor` | Global / Sin Sede |

---

## 🏢 2. Tenant: Moda Urbana (Plan Básico (Sin IA, máx. 2 sucursales))
- **Tenant ID (UUID):** `908056c0-3ee8-42fa-9e5c-8ef3869fbc97`
- **Subdominio / Slug:** `modaurbana`

### 👔 Administrador General de la Boutique (5 disponibles)
> **Alcance:** Acceso total a catálogo, sucursales, inventario, reportes ejecutivos por voz/Gemini RAG (si el plan lo permite), métricas ML y políticas.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Mateo Urbana Admin 4 | `mateo.urbana4@fashionstore.bo` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |
| 2 | Sofia Urbana Admin 5 | `sofia.urbana5@fashionstore.bo` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |
| 3 | admin | `admin@modaurbana.com` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |
| 4 | Adriana Mendoza | `adriana.mendoza3@fashionstore.bo` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |
| 5 | Adriana Zeballos | `adriana.zeballos5@fashionstore.bo` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |

### 🏬 Encargado / Gerente de Sucursal (5 disponibles)
> **Alcance:** Gestión de reservas de sucursal, resolución de conflictos de reservas vencidas (CU12), sobreventas offline (CU16) y traslados.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Vanessa Paredes | `vanessa.paredes7@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Moda Urbana - Casco Viejo |
| 2 | Gonzalo Suarez | `gonzalo.suarez9@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Moda Urbana - Casco Viejo |
| 3 | Carla Suarez | `carla.suarez11@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Moda Urbana - Casco Viejo |
| 4 | Lucas Roca | `lucas.roca13@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Moda Urbana - Casco Viejo |
| 5 | Lorena Paredes | `lorena.paredes15@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Moda Urbana - Casco Viejo |

### 💵 Cajero / Operador de Ventas POS (7 disponibles)
> **Alcance:** Operación en mostrador POS caja, cobro en efectivo desconectado (CU13), cambios con cobro de diferencia (CU17), devoluciones con retención (CU18) y sincronización por lotes (CU15).

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Gabriela Mendoza | `gabriela.mendoza19@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Moda Urbana - Casco Viejo |
| 2 | Gonzalo Arce | `gonzalo.arce21@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Moda Urbana - Casco Viejo |
| 3 | Javier Suarez | `javier.suarez23@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Moda Urbana - Casco Viejo |
| 4 | Gabriela Paredes | `gabriela.paredes25@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Moda Urbana - Casco Viejo |
| 5 | Sofia Mendoza | `sofia.mendoza27@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Moda Urbana - Casco Viejo |
| 6 | Gabriela Teran | `gabriela.teran29@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Moda Urbana - Casco Viejo |
| 7 | Javier Mamani | `javier.mamani17@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Moda Urbana - Casco Viejo |

### 🛍️ Cliente (Web y Móvil) (10 disponibles)
> **Alcance:** Navegación del catálogo exclusivo de la boutique, apartado de reservas offline/online, mapa de sedes y carrito de compras.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Valeria Méndez Roca | `valeria.méndezroca.modaurbana@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 2 | Carlos Eduardo Justiniano Paz | `carloseduardo.justinianopaz.modaurbana@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 3 | Mariana Flores Antelo | `mariana.floresantelo.modaurbana@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 4 | Rodrigo Banzer Claure | `rodrigo.banzerclaure.modaurbana@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 5 | Camila Suárez Vaca Diez | `camila.suárezvacadiez.modaurbana@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 6 | Mateo Alarcón Villazón | `mateo.alarcónvillazón.modaurbana@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 7 | Luciana Rivero Hurtado | `luciana.riverohurtado.modaurbana@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 8 | Sebastián Quiroga Terán | `sebastián.quirogaterán.modaurbana@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 9 | Natalia Torrico Cossío | `natalia.torricocossío.modaurbana@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 10 | Ignacio Barrientos Siles | `ignacio.barrientossiles.modaurbana@cliente.bo` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |

### 🛵 Delivery / Despachador (5 disponibles)
> **Alcance:** Visualización y despacho de pedidos confirmados para entrega a domicilio.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Esteban Urbana Delivery 4 | `esteban.urbana4@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Moda Urbana - Casco Viejo |
| 2 | Mariana Urbana Delivery 5 | `mariana.urbana5@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Moda Urbana - Casco Viejo |
| 3 | Valeria Flores | `valeria.flores31@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Moda Urbana - Casco Viejo |
| 4 | Diego Chavez | `diego.chavez33@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Moda Urbana - Casco Viejo |
| 5 | Romina Rojas | `romina.rojas35@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Moda Urbana - Casco Viejo |

### 📦 Proveedor Externo de Prendas (2 disponibles)
> **Alcance:** Inspección de stock de insumos y solicitud de reposición de mercadería.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Andrea Suarez | `andrea.suarez37@fashionstore.bo` | `Tiendafashion123!` | `proveedor` | Global / Sin Sede |
| 2 | Proveedor Textil Moda Urbana 1 | `proveedor.modaurbana.1@textil.bo` | `Tiendafashion123!` | `proveedor` | Global / Sin Sede |

---

## 🏢 3. Tenant: Boutique París S.R.L. (Plan Empresarial (IA avanzada, máx. 20 sucursales))
- **Tenant ID (UUID):** `1de16f02-c5c5-4b27-a1ba-9f52a183d110`
- **Subdominio / Slug:** `boutique-par-s-s-r-l`

### 👔 Administrador General de la Boutique (5 disponibles)
> **Alcance:** Acceso total a catálogo, sucursales, inventario, reportes ejecutivos por voz/Gemini RAG (si el plan lo permite), métricas ML y políticas.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Valeria Paris Admin 3 | `valeria.paris3@fashionstore.bo` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |
| 2 | Carlos Paris Admin 4 | `carlos.paris4@fashionstore.bo` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |
| 3 | Lucia Paris Admin 5 | `lucia.paris5@fashionstore.bo` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |
| 4 | Miguel Arana | `admin@boutiqueparis.com` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |
| 5 | Admin Boutique París S.R.L. 1 | `admin.boutique-par-s-s-r-l.1@fashionstore.bo` | `Tiendafashion123!` | `administrador` | Global / Sin Sede |

### 🏬 Encargado / Gerente de Sucursal (10 disponibles)
> **Alcance:** Gestión de reservas de sucursal, resolución de conflictos de reservas vencidas (CU12), sobreventas offline (CU16) y traslados.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Encargado Boutique París - Cen | `flavia.pinto11@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique París - Central Monseñor Rivero |
| 2 | Encargado Boutique París - Ven | `andrea.vargas13@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique París - Ventura Mall Luxury |
| 3 | Encargado Boutique París - Las | `natalia.lópez15@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique París - Las Brisas Mall |
| 4 | Encargado Boutique París - Equ | `mariana.salvatierra17@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique París - Equipetrol Norte |
| 5 | Encargado Boutique París - Cal | `gabriela.mercado19@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique París - Calacoto Plaza |
| 6 | Encargado Boutique París - San | `daniela.pinto21@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique París - San Miguel |
| 7 | Encargado Boutique París - Sop | `camila.lópez23@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique París - Sopocachi Boulevard |
| 8 | Encargado Boutique París - El  | `romina.añez25@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique París - El Prado Central |
| 9 | Encargado Boutique París - Cal | `gabriela.mercado27@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique París - Cala Cala |
| 10 | Encargado Boutique París - Pla | `luciana.suárez29@fashionstore.bo` | `Tiendafashion123!` | `encargado` | Boutique París - Plaza 25 de Mayo |

### 💵 Cajero / Operador de Ventas POS (10 disponibles)
> **Alcance:** Operación en mostrador POS caja, cobro en efectivo desconectado (CU13), cambios con cobro de diferencia (CU17), devoluciones con retención (CU18) y sincronización por lotes (CU15).

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Paula Ribera | `cajero1.paris@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique París - Central Monseñor Rivero |
| 2 | Bernardo Vargas | `cajero2.paris@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique París - Central Monseñor Rivero |
| 3 | Paula Ribera | `cajero3.paris@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique París - Ventura Mall Luxury |
| 4 | Bernardo Flores | `cajero4.paris@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique París - Ventura Mall Luxury |
| 5 | Flavia Ribera | `cajero5.paris@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique París - Las Brisas Mall |
| 6 | Nicolás Chávez | `cajero6.paris@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique París - Las Brisas Mall |
| 7 | Sara Ribera | `cajero7.paris@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique París - Equipetrol Norte |
| 8 | Santiago Suárez | `cajero8.paris@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique París - Equipetrol Norte |
| 9 | Romina Rojas | `cajero9.paris@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique París - Calacoto Plaza |
| 10 | Víctor Mercado | `cajero10.paris@fashionstore.bo` | `Tiendafashion123!` | `cajero` | Boutique París - Calacoto Plaza |

### 🛍️ Cliente (Web y Móvil) (10 disponibles)
> **Alcance:** Navegación del catálogo exclusivo de la boutique, apartado de reservas offline/online, mapa de sedes y carrito de compras.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Adriana Montalvo | `adriana.montalvo@gmail.com` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 2 | Carlos Fernando Roca | `carlos.roca@hotmail.com` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 3 | Mariana Antelo | `mariana.antelo@yahoo.com` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 4 | Esteban Justiniano | `esteban.justiniano@gmail.com` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 5 | Luciana Vaca | `luciana.vaca@outlook.com` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 6 | Sebastián Doria Medina | `sebastian.dm@gmail.com` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 7 | Gabriela Terceros | `gabriela.terceros@hotmail.com` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 8 | Rodrigo Siles | `rodrigo.siles@gmail.com` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 9 | Paola Campero | `paola.campero@outlook.com` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |
| 10 | Felipe Salvatierra | `felipe.salvatierra@gmail.com` | `Tiendafashion123!` | `cliente` | Global / Sin Sede |

### 🛵 Delivery / Despachador (10 disponibles)
> **Alcance:** Visualización y despacho de pedidos confirmados para entrega a domicilio.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Delivery Boutique París - Cen | `franco.pinto12@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Boutique París - Central Monseñor Rivero |
| 2 | Delivery Boutique París - Ven | `ignacio.rojas14@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Boutique París - Ventura Mall Luxury |
| 3 | Delivery Boutique París - Las | `santiago.vargas16@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Boutique París - Las Brisas Mall |
| 4 | Delivery Boutique París - Equ | `mateo.montenegro18@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Boutique París - Equipetrol Norte |
| 5 | Delivery Boutique París - Cal | `carlos.ribera20@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Boutique París - Calacoto Plaza |
| 6 | Delivery Boutique París - San | `ignacio.pinto22@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Boutique París - San Miguel |
| 7 | Delivery Boutique París - Sop | `javier.pinto24@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Boutique París - Sopocachi Boulevard |
| 8 | Delivery Boutique París - El  | `ignacio.flores26@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Boutique París - El Prado Central |
| 9 | Delivery Boutique París - Cal | `carlos.lópez28@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Boutique París - Cala Cala |
| 10 | Delivery Boutique París - Pla | `leonardo.lópez30@fashionstore.bo` | `Tiendafashion123!` | `delivery` | Boutique París - Plaza 25 de Mayo |

### 📦 Proveedor Externo de Prendas (2 disponibles)
> **Alcance:** Inspección de stock de insumos y solicitud de reposición de mercadería.

| # | Nombre | Correo Electrónico | Contraseña | Rol | Sucursal Asignada |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Proveedor Textil Boutique París S.R.L. 1 | `proveedor.boutique-par-s-s-r-l.1@textil.bo` | `Tiendafashion123!` | `proveedor` | Global / Sin Sede |
| 2 | Proveedor Textil Boutique París S.R.L. 2 | `proveedor.boutique-par-s-s-r-l.2@textil.bo` | `Tiendafashion123!` | `proveedor` | Global / Sin Sede |

---

## 👑 0. Superadministrador Global (Plataforma SaaS)
- **Ámbito:** Toda la plataforma multitenant.
- **Capacidades:** Gestión de inquilinos (`CU01`), creación/edición de planes comerciales (`CU02`), asignación y degradación controlada de planes (*Downgrade Guard*).

| # | Nombre | Correo Electrónico | Contraseña | Rol | Ámbito / Sede |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | Superadministrador | `superadmin@fashionstore.com` | `Tiendafashion123!` | `superadmin` | Global Plataforma |
| 2 | Fernando Quispe | `fernando.quispe1@fashionstore.bo` | `Tiendafashion123!` | `superadmin` | Global Plataforma |

---
