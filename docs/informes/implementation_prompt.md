# 🛍️ Prompt Estándar para Revisión General Previa a la Implementación de un Caso de Uso (ICONIX)
### FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2 - 2do Parcial)

> **Propósito:** Utiliza este prompt antes de comenzar a codificar cualquier Caso de Uso (`CU01`–`CU28`) en el proyecto. Este prompt instruye al agente o desarrollador a generar una **Revisión General de Implementación de Alto Nivel** exhaustiva, técnica y metódica, garantizando total alineación con la metodología **ICONIX (UML 2.5+)**, la arquitectura en **Paquetes de Dominio** (`p0_saas_plataforma` a `p6_inteligencia_analitica`), el aislamiento estricto por `tenant_id`, las políticas de negocio inviolables de la cátedra y los requerimientos del 2do Parcial.

---

```markdown
Actúa como Arquitecto de Software Principal y Desarrollador Full-Stack Senior bajo la metodología ICONIX (UML 2.5+) en el proyecto FashionStore (SaaS Multitenant E-Commerce).

Quiero que realices una **REVISIÓN GENERAL EXHAUSTIVA PREVIA A LA IMPLEMENTACIÓN** para el siguiente Caso de Uso:
👉 **[INSERTAR AQUÍ EL CÓDIGO Y NOMBRE DEL CASO DE USO, ej: CU01: Registrar y Gestionar Empresas (Tenants)]**

Antes de generar cualquier código o plan, debes consultar obligatoriamente como Fuentes de Verdad:
1. `AGENTS.md` y `docs/ai/HANDOFF_LATEST.md` (Mandamientos técnicos, metodología ICONIX, reglas de aislamiento multitenant y estado operativo).
2. `docs/ACTORS_AND_USE_CASES.md` (Especificación formal de los 28 Casos de Uso oficiales y catálogo de actores).
3. `docs/BUSINESS_POLICIES.md` (Políticas de negocio inviolables: cambios con diferencia de precio, devoluciones 50%-80%, cuotas de planes 2 vs 10 sucursales, despacho tras pago Stripe).
4. `docs/OFFLINE_AND_SYNC.md` (Protocolo offline: IndexedDB en Angular PWA, SQLite en Flutter, UUIDv4 de contingencia e idempotencia con `sync_operations`).
5. `docs/ARCHITECTURE.md` (Estructura de paquetes en backend `backend/app/packages/pX_...`, shims de compatibilidad, frontend Angular 21 PWA y app móvil Flutter).
6. `docs/ai/IMPLEMENTATION_PHASES.md` y `docs/PRESENTATIONS_ROADMAP.md` (Checklist de avance por presentación acumulativa: P1 10 CUs, P2 22 CUs, P3 28 CUs).
7. `docs/informes/Ex_Parcial_2_Sistemas-2.md` (Pliego oficial del examen de Sistemas 2).

---

### ESTRUCTURA OBLIGATORIA DE LA RESPUESTA:

La revisión general debe estructurarse estrictamente en las siguientes 8 secciones:

#### 1. 🎯 Objetivo, Actores y Alcance del Hito
- **Objetivo funcional:** Explicación precisa de qué resuelve este Caso de Uso y con qué Requerimiento Funcional (`RF-01` a `RF-56`) se alinea.
- **Actores involucrados (ICONIX):**
  - **Actores Principales (Humanos):** `Superadmin`, `Tenant Admin`, `Branch Manager`, `Cashier` o `Customer`.
  - **Actores Secundarios / del Sistema:** `Backend API`, `Sync Engine`, `Stripe Gateway`, `OpenStreetMap / ORS` o `AI & ML Service`.
- **Alcance de Entrega:** Indicar a qué presentación acumulativa corresponde:
  - *Presentación 1 (25/10/2026):* Base SaaS Multitenant, Planes y Catálogo Offline (CU01–CU10).
  - *Presentación 2 (01/11/2026):* Operaciones POS Offline, Idempotencia, Stripe, Cambios y Devoluciones (CU11–CU22).
  - *Presentación 3 (08/11/2026):* IA Gemini Voz, Analítica Predictiva, Visión AR y Dashboard (CU23–CU28).

#### 2. 📋 Ficha Descriptiva del Caso de Uso (Formato Oficial de Cátedra)
Presentar la tabla estándar de Caso de Uso con los campos exactos:
| Campo | Detalle |
| :--- | :--- |
| **Nombre:** | [Código y Nombre del Caso de Uso] |
| **Autor:** | [Equipo FashionStore / Grupo 46] |
| **Fecha:** | [Fecha de elaboración DD/MM/AAAA] |
| **Descripción:** | [Resumen conciso del propósito del Caso de Uso] |
| **Actores:** | [Actor principal y actores secundarios] |
| **Precondiciones:** | [Estado necesario del sistema antes de iniciar el caso de uso] |
| **Flujo Normal:** | 1. El actor... <br> 2. El sistema... <br> 3. El actor... <br> 4. El sistema valida... y persiste... |
| **Flujo Alternativo:** | X. [Desde Controlador] Si se produce un fallo o condición extrema, el sistema notifica... |
| **Poscondiciones:** | [Estado resultante tras la ejecución exitosa] |

#### 3. 🔍 Diagrama de Robustez ICONIX (Mermaid)
Modelar el análisis preliminar ICONIX separando componentes:
- Fronteras (`<<boundary>>` / Pantallas y vistas).
- Controladores (`<<control>>` / Lógica de negocio, validaciones y servicios).
- Entidades (`<<entity>>` / Modelos de persistencia).
- **Regla Estricta ICONIX:** Los bucles (*loops*), validaciones y flujos alternativos parten **SIEMPRE desde el objeto Controlador**, jamás de una Frontera.

#### 4. 🗄️ Modelo de Datos y Esquema Relacional (PostgreSQL / Alembic)
- **Aislamiento Multitenant:** Indicar la clave foránea `tenant_id UUID NOT NULL REFERENCES companies(id)` requerida en las tablas.
- **Especificación de Tablas y Columnas:** Nombres de tablas en minúsculas y plural, tipos de datos PostgreSQL (`UUID`, `VARCHAR`, `BOOLEAN`, `NUMERIC(10,2)`, `TIMESTAMPTZ`), claves primarias UUIDv4, llaves foráneas (`FK`), restricciones `CHECK` y valores `DEFAULT`.
- **Estrategia de Idempotencia o Histórico:** Tablas de auditoría si aplica (`sync_operations`, `garment_exchanges`, etc.).

#### 5. ⚙️ Arquitectura Backend (FastAPI + SQLAlchemy + Pydantic v2)
Debe situarse en su paquete de dominio correspondiente (`p0_saas_plataforma`, `p1_gestion_usuarios_acceso`, `p2_gestion_productos_catalogo`, `p3_gestion_inventario_disponibilidad`, `p4_gestion_compras_reservas`, `p5_gestion_ventas_pos`, `p6_inteligencia_analitica`).
- **Modelos de Dominio SQLAlchemy (`models/`):** Clases, atributos, relaciones `relationship` y foreign keys.
- **Esquemas Pydantic v2 (`schemas/`):** Clases `Create`, `Read`, `Update`, `Out` con validación estricta de tipos.
- **Servicios y Lógica de Negocio (`services/`):** Funciones de servicio con aislamiento por tenant (`tenant_id`), verificación de cuotas y manejo explícito de excepciones.
- **Rutas y Endpoints REST (`routes/` y `router.py`):**
  - Métodos HTTP y URI (`GET /api/...`, `POST /api/...`, `PATCH /api/...`).
  - Inyección de dependencias (`db: Session = Depends(get_db)`, `tenant_id = Depends(require_tenant_id)`).
  - Códigos de estado HTTP (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`).

#### 6. 🎨 Arquitectura Frontend / Móvil
- **Frontend Web / PWA (Angular 21):**
  - Módulo / Feature en `src/app/features/[cliente|admin|cajero|encargado]/`.
  - Persistencia local en **IndexedDB** (`idb.service.ts`) para catálogo offline (si aplica).
  - Componentes accesibles con TailwindCSS y Spartan UI, alertas de modo offline y banners de sincronización.
- **Aplicación Móvil (Flutter / Dart):**
  - Feature en `mobile/lib/features/`.
  - Persistencia local en **SQLite** (`sqflite`) y cola de operaciones offline.
  - Geolocalización con **OpenStreetMap** (`flutter_map` + OpenRouteService) o Probador Virtual AR si corresponde al CU.

#### 7. 🛡️ Políticas de Negocio Inviolables y Casos Extremos (Edge Cases)
Identificar y detallar el cumplimiento de las reglas críticas del proyecto:
- **Cambios de Prenda (CU19):** Si la nueva prenda tiene mayor precio, el cambio se consolida **únicamente si el cliente abona la diferencia**. Si no abona, se cancela y se restituye la prenda original.
- **Devoluciones (CU20):** Retención obligatoria del 20% al 50% por reacondicionamiento; reembolso neto del 50% al 80% en efectivo o nota de crédito.
- **Cuotas de Suscripción (CU02/CU04):** Plan Básico permite máximo 2 sucursales (sin IA); Plan Profesional permite hasta 10 sucursales y módulo de IA.
- **Despacho Digital (CU12):** La orden de envío sólo se emite si Stripe confirma pago con éxito (`status = 'paid'`).
- **Ventas Desconectadas (CU16/CU18):** Exclusivamente en efectivo, con UUIDv4 local y sincronización idempotente que jamás duplica ventas ni inventario.

#### 8. 🧪 Plan de Pruebas y Documentos de Control a Actualizar
- **Matriz de Pruebas Específicas:**
  - Pruebas de Camino Feliz (*Happy Path*).
  - Pruebas de Validación / Reglas de Negocio (HTTP 400 / 422).
  - Pruebas de Aislamiento Multitenant (Intento de acceso cruzado entre tenants -> HTTP 403 / 404).
  - Pruebas de Contingencia Offline / Idempotencia (cuando aplique).
- **Documentos de Control a Actualizar al Concluir la Tarea:**
  - `docs/ai/CURRENT_STATE.md` (Registrar avance porcentual y CUs operativos).
  - `docs/ai/HANDOFF_LATEST.md` (Relevo operativo actualizado para la siguiente sesión).
  - `docs/ai/NEXT_STEPS.md` (Siguiente tarea inmediata del hito).
  - `docs/ai/DECISIONS_LOG.md` (Si se acordó un cambio arquitectónico o de modelo).
  - `docs/ai/IMPLEMENTATION_PHASES.md` (Marcar checkbox `[x]`).
  - `docs/ai/sessions/YYYY-MM-DD-autor-o-tarea.md` (**Obligatorio** si se modificó código fuente).
- **Actualización de Resultados de Pruebas de Caja Negra:**
  - docs/informes/PRUEBAS_CAJA_NEGRA.md: Incorporar o actualizar la sección del Caso de Uso con casos de prueba reales en formato canónico de 8 columnas (ID, Objetivo / Escenario, Precondiciones, Datos de Entrada (Input), Pasos de Ejecución, Resultado Esperado, Resultado Obtenido, Estado: APROBADO), datos reales (UUIDs, payloads exactos) y actualizar el resumen ejecutivo de cobertura.
- **Mensaje de Commit por Lotes (Conventional Commits):**
  - Entregar los mensajes de commit estructurados separando **Backend** de **Frontend** (y documentación/diagramas si aplica), siguiendo Conventional Commits estricto y sin atribuciones de IA.
```

---

### 💡 Ejemplo de Uso Inmediato

Para usar este prompt en cualquier caso de uso, copia el bloque superior y reemplaza la línea destacada:

```markdown
Quiero que realices una REVISIÓN GENERAL EXHAUSTIVA PREVIA A LA IMPLEMENTACIÓN para el siguiente Caso de Uso:
👉 CU02: Gestionar Planes de Suscripción y Límites Comerciales
```
