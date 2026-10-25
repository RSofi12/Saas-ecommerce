# 🛍️ Prompt Estándar para Revisión General Previa a la Implementación de un Caso de Uso (ICONIX)
### FashionStore — Plataforma E-Commerce SaaS Multitenant (Sistemas 2 - 2do Parcial)

> **Propósito:** Utiliza este prompt antes de comenzar a codificar cualquier Caso de Uso (`CU01`–`CU28`) en el proyecto. Este prompt instruye al agente o desarrollador a generar una **Revisión General de Implementación de Alto Nivel** exhaustiva, técnica y metódica, garantizando total alineación con la metodología **ICONIX (UML 2.5+)**, la arquitectura en **Paquetes de Dominio** (`p0_saas_platform` a `p6_inteligencia_analitica`), el aislamiento estricto por `tenant_id`, las políticas de negocio inviolables de la cátedra, las convenciones de desarrollo de software y los requerimientos del 2do Parcial.

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
- **Aislamiento Multitenant Transversal:** Indicar la clave foránea `tenant_id UUID NOT NULL REFERENCES companies(id)` requerida en todas las tablas transaccionales. En tablas existentes, contemplar la migración Alembic que asigna un tenant por defecto antes de aplicar `nullable=False`.
- **Especificación de Tablas y Columnas:** Nombres de tablas en minúsculas y plural, nombres de columnas en inglés, tipos de datos PostgreSQL (`UUID`, `VARCHAR`, `BOOLEAN`, `NUMERIC(10,2)`, `TIMESTAMPTZ`), claves primarias UUIDv4, llaves foráneas (`FK`), restricciones `CHECK` y valores `DEFAULT`.
- **Estrategia de Idempotencia o Histórico:** Tablas de auditoría si aplica (`sync_operations`, `garment_exchanges`, `garment_returns`).

#### 5. ⚙️ Arquitectura Backend (FastAPI + SQLAlchemy + Pydantic v2)
Debe situarse estrictamente en su paquete de dominio correspondiente (`p0_saas_platform`, `p1_gestion_usuarios_acceso`, `p2_gestion_productos_catalogo`, `p3_gestion_inventario_disponibilidad`, `p4_gestion_compras_reservas`, `p5_gestion_ventas_pos`, `p6_inteligencia_analitica`):
- **Convención de Idiomas Estricta:** Todo el código en inglés (nombres de archivos, clases, funciones, schemas, variables locales, nombres de tablas/columnas y commits de Git). Únicamente los textos que ve el usuario (mensajes de error, mensajes de éxito en `message`, labels) van en español.
- **Modelos de Dominio SQLAlchemy (`models.py`):** Clases y relaciones en el paquete correspondiente. Re-exportar *shim* en `app/models/__init__.py`.
- **Esquemas Pydantic v2 (`schemas.py`):** Modelos `Create`, `Read`, `Update`, `Out` en inglés. Re-exportar *shim* en `app/schemas/__init__.py`.
- **Servicios y Lógica de Negocio (`service.py` / `repository.py`):** Lógica pura de negocio con aislamiento por tenant (`tenant_id`), verificación de cuotas de suscripción y manejo de excepciones. Re-exportar *shim* en `app/services/__init__.py`.
- **Rutas y Endpoints REST (`router.py`):**
  - Prefijo canónico bajo `/api/...` directo (sin `/v1` ni subversiones).
  - Inyección de dependencias (`db: Session = Depends(get_db)`, `tenant_id = Depends(require_tenant_id)`).
  - **Contrato Estándar de Respuesta:** Retornar siempre mediante la función `response(status_code, message="...", data=...)` de `app.utils.response`.
  - **Manejo de Errores y Formato JSON:** Lanzar siempre `raise HTTPException(status_code=400, detail="Mensaje en español")`. El manejador global `error_handlers.py` serializa la respuesta con la clave `"message"`. **Regla crítica: En el JSON HTTP siempre viaja `"message"`, NUNCA `"detail"`**.

#### 6. 🎨 Arquitectura Frontend / Móvil
- **Frontend Web / PWA (Angular 21):**
  - Módulo / Feature en `src/app/features/[cliente|admin|cajero|encargado]/`.
  - **Consumo Obligatorio de `response.message`:** Queda prohibido hardcodear textos genéricos de éxito o error en los componentes. Consumir y mostrar `response.message` mediante `toast.success(res.message)` o la utilidad `requestWithToast(...)` / `getErrorMessage(...)` de `core/utils/`.
  - Persistencia local en **IndexedDB** (`idb.service.ts`) para catálogo y ventas offline (si aplica).
  - Componentes accesibles con TailwindCSS y Spartan UI, alertas de modo offline y banners de sincronización.
- **Aplicación Móvil (Flutter / Dart):**
  - Feature en `mobile/lib/features/`.
  - **Consumo de `response.message`:** Deserializar con `ApiResponse.fromJson(...)` y mostrar `response.message` en `AppSnackBar`.
  - Persistencia local en **SQLite** (`sqflite`) y cola de operaciones offline en efectivo.
  - Geolocalización con **OpenStreetMap** (`flutter_map` + OpenRouteService) o Probador Virtual AR si corresponde al CU.

#### 7. 🛡️ Políticas de Negocio Inviolables y Casos Extremos (Edge Cases)
Identificar y detallar el cumplimiento de las reglas críticas del proyecto:
- **Cambios de Prenda (CU19):** Si la nueva prenda tiene mayor precio por talla o modelo (ej. M a Bs 50 por L a Bs 70), el cambio se consolida **únicamente si el cliente abona la diferencia de precio** (Bs 20). Si no abona, se cancela y se restituye la prenda o el monto original.
- **Devoluciones (CU20):** Retención obligatoria del 20% al 50% por reacondicionamiento y logística inversa; reembolso neto del 50% al 80% en efectivo o nota de crédito.
- **Cuotas de Suscripción (CU02/CU04):** Plan Básico permite máximo 2 sucursales (sin IA); Plan Profesional permite hasta 10 sucursales y módulo de IA.
- **Despacho Digital (CU12):** La orden de envío sólo se emite si Stripe confirma pago con éxito (`status = 'paid'`).
- **Ventas Desconectadas (CU16/CU18):** Exclusivamente de contado (efectivo), con UUIDv4 local y sincronización idempotente vía `sync_operations` que jamás duplica ventas ni inventario.

#### 8. 🚀 Pipeline de Implementación Adaptado y Plan de Pruebas
Indicar el orden secuencial de desarrollo respetando los paquetes de dominio:
1. `[DB MODEL]` Añadir/extender modelo en `backend/app/packages/pX_<dominio>/models.py` con `tenant_id` y re-exportar en `app/models/`.
2. `[ALEMBIC]` Crear y ejecutar migración `alembic revision --autogenerate -m "..."` + `alembic upgrade head`.
3. `[PYDANTIC SCHEMA]` Definir esquemas en `backend/app/packages/pX_<dominio>/schemas.py` y re-exportar en `app/schemas/`.
4. `[SERVICE & REPO]` Implementar lógica en `service.py` y `repository.py` con filtros multitenant y re-exportar en `app/services/`.
5. `[ROUTER]` Definir endpoints en `router.py` usando `response(...)` y `HTTPException`.
6. `[MAIN.PY]` Verificar montaje limpio en `backend/main.py` sin ciclos en `__init__.py`.
7. `[TESTS BACKEND]` Ejecutar tests unitarios/integración validando aislamiento multitenant.
8. `[FRONT MODEL]` Declarar interfaces en `frontend/src/app/features/<modulo>/models/`.
9. `[FRONT API SERVICE]` Implementar llamadas HTTP en `services/` consumiendo endpoints `/api/...`.
10. `[FRONT UI & TOAST]` Crear componente con formularios reactivos y feedback visual mostrando `res.message`.
11. `[FRONT ROUTE & SHELL]` Registrar ruta en `app.routes.ts` y enlace en menú de `app-shell.component.ts`.
12. `[MOBILE DART MODEL & API]` Crear modelos `fromJson` y llamadas con `ApiClient` mostrando mensajes en `AppSnackBar`.
13. `[ACTUALIZACIÓN DE CONTROL]` Actualizar `CURRENT_STATE.md`, `HANDOFF_LATEST.md`, `IMPLEMENTATION_PHASES.md` y registrar sesión en `docs/ai/sessions/` si se alteró código fuente.
```

---

### 💡 Ejemplo de Uso Inmediato

Para usar este prompt en cualquier caso de uso, copia el bloque superior y reemplaza la línea destacada:

```markdown
Quiero que realices una REVISIÓN GENERAL EXHAUSTIVA PREVIA A LA IMPLEMENTACIÓN para el siguiente Caso de Uso:
👉 CU02: Gestionar Planes de Suscripción y Límites Comerciales
```
