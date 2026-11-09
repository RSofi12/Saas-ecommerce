# Sesión: 2026-11-01 — Blindaje CU04: Liberación Inmediata de Cuota y Desactivación Defensiva

## 1. Objetivo y Caso de Uso
- **Caso de Uso:** `CU04: Crear y Gestionar Sucursales Bajo Límites del Plan Comercial`.
- **Falla abordada:** Al eliminar o desactivar una sucursal, verificar que `/api/branches/quota` libere la cuota inmediatamente en tiempo de ejecución sin requerir reinicio del servidor, y evitar fallas críticas por restricciones de clave foránea (`ForeignKeyViolation`) ante sucursales con historial transaccional o de inventario.

---

## 2. Diagnóstico y Correcciones Realizadas

### A. Desactivación Defensiva (Soft-Delete) en `delete_branch()`
- **Problema previo:** Si una sucursal tenía registros de inventario (`inventory`), ventas (`sales`) o reservas (`reservations`), `db.delete(branch)` provocaba una excepción de integridad referencial de PostgreSQL, disparando `rollback` y abortando la operación. La sucursal no se borraba y la cuota permanecía consumida.
- **Solución implementada:** Se implementó un fallback en [`backend/app/packages/p1_gestion_usuarios_acceso/services/branch_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p1_gestion_usuarios_acceso/services/branch_service.py). Si el borrado físico falla por integridad referencial, el sistema desvincula los usuarios asignados y conmuta la sucursal a inactiva (`is_active = False`, `is_default = False`). Esto preserva la trazabilidad contable y libera de inmediato el cupo en el conteo de sucursales activas.

### B. Corrección de Consultas en `quota_service.py`
- En [`backend/app/packages/p0_saas_plataforma/services/quota_service.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/app/packages/p0_saas_plataforma/services/quota_service.py):
  - Se corrigió `Subscription.tenant_id == company_id` por `Subscription.company_id == company_id`.
  - Se homogeneizó el estatus de suscripción para soportar `ACTIVA`, `active` y `trialing`.

### C. Desactivación Limpia de Sucursal por Defecto
- En `update_branch()` y `set_branch_active()`: si una sucursal se desactiva (`is_active = False`) y era la sucursal por defecto (`is_default = True`), se desmarca automáticamente `is_default = False` para no dejar una sede inactiva como predeterminada.

---

## 3. Pruebas y Verificaciones
- Se creó la suite [`backend/tests/test_cu04_branch_quota_release.py`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/tests/test_cu04_branch_quota_release.py) ejecutando 6 pruebas exhaustivas con pytest:
  1. `test_01_initial_quota_is_empty`: Cuota limpia inicial (3 slots disponibles).
  2. `test_02_reach_quota_limit`: Creación de 3 sucursales hasta el límite y rechazo de la 4ta con `ValueError`.
  3. `test_03_deactivating_branch_releases_quota_immediately`: Desactivar sucursal libera cupo en memoria/DB al instante y permite crear una nueva sucursal activa.
  4. `test_04_reactivating_when_full_is_rejected`: Reactivar sede inactiva cuando el cupo está lleno es rechazado.
  5. `test_05_delete_branch_without_dependencies_releases_quota`: Eliminación física sin dependencias libera cuota de inmediato.
  6. `test_06_delete_branch_with_historical_dependencies_soft_deletes_and_releases_quota`: Eliminación de sede con existencias en inventario activa soft-delete defensivo y libera cuota sin error 500/400.
- **Resultado:** `6 passed in 38.24s`.
