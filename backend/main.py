import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from app.packages.p0_saas_plataforma.router import p0_router
from app.packages.p1_gestion_usuarios_acceso.router import p1_router
from app.packages.p2_gestion_productos_catalogo.router import p2_router
from app.packages.p3_gestion_inventario_disponibilidad.router import p3_router
from app.packages.p4_gestion_compras_reservas.router import p4_router
from app.packages.p5_gestion_ventas_pos.router import p5_router
from app.packages.p6_inteligencia_analitica.router import p6_router
from app.core.error_handlers import register_error_handlers
from app.core.database import SessionLocal
from app.services.expiration_service import run_daily_expiration, run_expiration_sweep


async def _expiration_worker_loop() -> None:
    """
    Background worker continuo para FashionStore SaaS:
    - Ejecuta un barrido inmediato al arrancar el servidor para reconciliar expiraciones pendientes.
    - Se repite periódicamente cada 60 segundos barriendo y liberando existencias:
      1. Reservas online vencidas (expires_at <= today) -> Restaura reserved_quantity a disponibilidad general.
      2. Reservas transferidas al carrito cuyos pagos no se completaron.
      3. Órdenes con plazo de pago caducado.
    """
    # 1. Barrido inicial al levantar la aplicación
    try:
        run_daily_expiration()
    except Exception:
        pass

    # 2. Ciclo periódico cada 60 segundos
    while True:
        await asyncio.sleep(60)
        try:
            run_daily_expiration()
        except Exception:
            pass


@asynccontextmanager
async def lifespan(_: FastAPI):
    worker_task = asyncio.create_task(_expiration_worker_loop())
    try:
        yield
    finally:
        worker_task.cancel()
        await asyncio.gather(worker_task, return_exceptions=True)


app = FastAPI(title="FashionStore SaaS Multitenant API", lifespan=lifespan)

@app.get("/")
async def root():
    return {"message": "Welcome to FashionStore API"}

@app.get("/health")
async def health():
    return {"status": "ok"}

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers estructurados por paquetes de dominio (ICONIX)
api_router = APIRouter(prefix="/api")

# Paquete 0: Plataforma SaaS, Gestión de Tenants y Suscripciones (CU01–CU02)
api_router.include_router(p0_router)

# Paquete 1: Gestión de usuarios y acceso (CU03–CU05)
api_router.include_router(p1_router)

# Paquete 2: Gestión de productos y catálogo (CU06–CU07)
api_router.include_router(p2_router)

# Paquete 3: Gestión de inventario y disponibilidad (CU08–CU11)
api_router.include_router(p3_router)

# Paquete 4: Gestión de compras y reservas (CU12–CU14)
api_router.include_router(p4_router)

# Paquete 5: Ventas, POS, Sincronización y Políticas (CU15–CU20)
api_router.include_router(p5_router)

# Paquete 6: Inteligencia, analítica y visión móvil (CU21–CU28)
api_router.include_router(p6_router)

app.include_router(api_router)

register_error_handlers(app)
