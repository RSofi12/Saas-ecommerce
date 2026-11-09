from fastapi import APIRouter

from app.packages.p5_gestion_ventas_pos.routes.sales_routes import router as sales_router
# logica del CU17: Router para Cambios de Prenda por Talla/Modelo con Cobro de Diferencia
from app.packages.p5_gestion_ventas_pos.routes.exchange_routes import router as exchange_router
# logica del CU18: Router para Devoluciones de Prenda con Retención y Nota de Crédito
from app.packages.p5_gestion_ventas_pos.routes.return_routes import router as return_router
# logica del CU16: Router para Gestión y Resolución de Conflictos de Ventas Offline
from app.packages.p5_gestion_ventas_pos.routes.sale_conflict_routes import router as sale_conflict_router

p5_router = APIRouter()
# Rutas especializadas con rutas estáticas (ej: /conflicts) deben registrarse ANTES de sales_router
p5_router.include_router(sale_conflict_router)
p5_router.include_router(exchange_router)
p5_router.include_router(return_router)
p5_router.include_router(sales_router)

__all__ = ["p5_router"]
