# GUÍA DE COMPORTAMIENTO Y CONTEXTO PARA AGENTES (AGENTS.md)
### FashionStore — Plataforma E-Commerce SaaS Multitenant

Este archivo define las reglas obligatorias de interacción, contexto, arquitectura y fuentes de verdad para cualquier agente de IA o desarrollador que trabaje en este repositorio.

---

## 1. 📖 Archivos de Consulta Obligatoria (Fuentes de Verdad)

Antes de responder, planificar o generar código, consulta estos documentos en orden de prioridad:

1. **[`docs/ai/HANDOFF_LATEST.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/HANDOFF_LATEST.md):** Relevo operativo inmediato entre sesiones (tu brújula de partida).
2. **[`docs/ai/CURRENT_STATE.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/CURRENT_STATE.md):** Qué componentes están implementados y qué tareas faltan.
3. **[`docs/ai/NEXT_STEPS.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/NEXT_STEPS.md):** La tarea inmediata y caso de uso específico a resolver.
4. **[`docs/ai/IMPLEMENTATION_PHASES.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/IMPLEMENTATION_PHASES.md):** Checklist oficial de los 28 Casos de Uso organizados por presentación.
5. **[`docs/ACTORS_AND_USE_CASES.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ACTORS_AND_USE_CASES.md):** Especificación de actores (principales y del sistema) y los 28 Casos de Uso oficiales bajo ICONIX.
6. **[`docs/BUSINESS_POLICIES.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/BUSINESS_POLICIES.md):** Políticas de negocio obligatorias (cambios de prenda por talla con diferencia de precio, devoluciones 50%-80%, cuotas de planes).
7. **[`docs/OFFLINE_AND_SYNC.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/OFFLINE_AND_SYNC.md):** Protocolo de persistencia local (IndexedDB / SQLite), sincronización e idempotencia.
8. **[`docs/AI_AND_ML.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/AI_AND_ML.md):** Especificación de IA Generativa (Gemini con voz), modelos supervisados/no supervisados y datos sintéticos.
9. **[`docs/ARCHITECTURE.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ARCHITECTURE.md):** Organización de los 7 paquetes de backend, frontend PWA y app móvil.
10. **[`docs/ai/DECISIONS_LOG.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/DECISIONS_LOG.md):** Histórico de decisiones arquitectónicas ya consensuadas que **NO** deben reabrirse sin justificación.
11. **[`docs/informes/Ex_Parcial_2_Sistemas-2.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/informes/Ex_Parcial_2_Sistemas-2.md):** Pliego oficial del examen de Sistemas 2.

---

## 2. 🛡️ Reglas Sagradas del Proyecto (Inviolables)

* **Metodología Oficial: ICONIX (UML 2.5+)**
  - Todo caso de uso implementado o modificado se modela mediante:
    1. Ficha descriptiva de Caso de Uso (Precondición, Flujo Normal, Flujos Alternativos, Postcondición).
    2. Diagrama de Robustez: **Regla estricta:** los bucles (*loops*), validaciones y flujos alternativos parten **siempre desde el objeto Controlador**, los demás flujos parten desde la Frontera (*Boundary*).
    3. Diagrama de Secuencia y Diagrama de Clases.
  - El sistema unifica **28 Casos de Uso** (12 modificados del 1er parcial + 16 nuevos/extras del 2do parcial).
* **Stack Tecnológico Oficial:**
  - **Backend:** Python + FastAPI, SQLAlchemy ORM, Alembic, PostgreSQL 15+, NumPy, Scikit-Learn.
  - **Frontend Web:** Angular 21 (PWA con Service Worker, Web App Manifest, TailwindCSS, Spartan UI, IndexedDB).
  - **Aplicación Móvil:** Flutter (Dart), SQLite (`sqflite`), OpenStreetMap (`flutter_map` + OpenRouteService) y Realidad Aumentada.
  - **Integraciones:** Stripe (Pasarela de pagos), Firebase FCM (Notificaciones push), Google Gemini API (RAG con voz).
* **Arquitectura de Módulos Profundos (`codebase-design`):**
  - El backend se estructura en **Paquetes de Dominio**: `p0_saas_plataforma`, `p1_gestion_usuarios_acceso`, `p2_gestion_productos_catalogo`, `p3_gestion_inventario_disponibilidad`, `p4_gestion_compras_reservas`, `p5_gestion_ventas_pos`, `p6_inteligencia_analitica`.
  - **Prohibido acoplar `__init__.py`:** Los archivos `__init__.py` raíz de cada paquete deben mantenerse limpios para evitar dependencias circulares durante la carga de módulos. `backend/main.py` importa explícitamente desde `.router`.
  - **Zero Breakage:** Mantener los *shims* de compatibilidad en `app/models/`, `app/schemas/`, `app/services/` y `app/routes/`.
* **Aislamiento Multitenant Estricto (SaaS):**
  - Toda entidad de datos de empresa contiene la clave foránea `tenant_id UUID NOT NULL REFERENCES companies(id)`.
  - El backend valida el claim `tenant_id` del token JWT verificado en cada petición. Ninguna consulta SQL debe permitir acceder o alterar información de otra empresa.
* **Políticas de Negocio Inviolables:**
  - **Cambio de Prenda (CU19):** Si el cliente cambia una prenda por otra talla o modelo de mayor precio (ej. M a Bs 50 por L a Bs 70), el cambio se consolida **únicamente si el cliente abona la diferencia** (Bs 20). Si no abona, se cancela la operación y se devuelve la prenda o el pago.
  - **Devolución de Prenda (CU20):** Se retiene entre el 20% y 50% por costos operativos y se reembolsa entre el 50% y 80% del valor pagado (en efectivo o nota de crédito).
  - **Límites de Suscripción (CU02/CU04):** Plan Básico permite máximo 2 sucursales activas (sin IA generativa); Plan Profesional permite hasta 10 sucursales y módulo de IA; Plan Empresarial permite hasta 20 sucursales con IA avanzada.
  - **Despacho Digital (CU12):** El envío de prendas o entrega digital se efectúa únicamente cuando el pago con Stripe está confirmado (`status = 'paid'`).
  - **Ventas Offline (CU16):** Obligatoriamente de contado (efectivo), con generación de UUIDv4 en el cliente y estado `PENDIENTE_SYNC`.
* **Idempotencia Transaccional (CU18):**
  - Toda operación comercial generada offline se identifica con un UUIDv4 único. Al sincronizar con `/api/sales/offline/batch-sync`, el backend valida contra `sync_operations`. Si ya fue recibida, confirma sin duplicar ventas ni descontar inventario dos veces.

---

## 3. 💬 Cómo Debe Responder y Operar el Agente

* **Idioma:** Siempre en **Español** profesional.
* **Tono:** Arquitecto Senior / Docente universitario riguroso, técnico, apasionado y metódico.
* **Código:** Limpio, modular, tipado, libre de atajos sucios y con manejo explícito de errores.
* **Enlaces Markdown:** Crea siempre enlaces interactivos con esquema `file://` para archivos y símbolos de código (ej. [`main.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/main.py)).

---

## 4. 🧠 Sistema de Memoria Viva y Registro de Sesiones (`docs/ai/sessions/`)

Para asegurar la continuidad absoluta del proyecto entre sesiones:

### Regla Obligatoria de Entrada:
- **Antes de comenzar:** Consulta [`docs/ai/HANDOFF_LATEST.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/HANDOFF_LATEST.md) y [`docs/ai/NEXT_STEPS.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/NEXT_STEPS.md).

### Regla Obligatoria de Salida:
- **Criterio Estricto para Crear Sessions:**
  - **SÍ registrar sesión en `docs/ai/sessions/`:** Únicamente cuando **se modifique código fuente**, se creen migraciones, modelos, controladores, servicios o componentes en Frontend, Backend o Mobile.
  - **NO registrar sesión:** Cuando la tarea consista exclusivamente en consultas conceptuales, diseño de diagramas o redacción de documentación teórica.
- **Al haber modificado código o lógica:** Antes de concluir tu turno:
  1. Actualiza [`docs/ai/CURRENT_STATE.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/CURRENT_STATE.md).
  2. Actualiza [`docs/ai/HANDOFF_LATEST.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/HANDOFF_LATEST.md).
  3. Actualiza [`docs/ai/NEXT_STEPS.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/NEXT_STEPS.md).
  4. Si tomaste una decisión de arquitectura o modelo, documéntala en [`docs/ai/DECISIONS_LOG.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/DECISIONS_LOG.md).
  5. Marca con `[x]` el avance en [`docs/ai/IMPLEMENTATION_PHASES.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/IMPLEMENTATION_PHASES.md).
  6. **Crea un nuevo archivo en [`docs/ai/sessions/YYYY-MM-DD-autor-o-tarea.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/sessions/)** detallando:
     - Caso de Uso implementado o modificado.
     - Cambios en Backend (tablas, modelos, endpoints, schemas).
     - Cambios en Frontend Web / PWA o Mobile Flutter.
     - Comandos a ejecutar (`alembic upgrade head`, `npm run build`, `flutter pub get`).
     - Pruebas y verificaciones ejecutadas.
