import logging
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.packages.p4_gestion_compras_reservas.services.order_service import expire_due_orders
from app.packages.p4_gestion_compras_reservas.services.reservation_service import (
    expire_due_reservations,
    expire_transferred_reservations,
)

logger = logging.getLogger(__name__)


def run_expiration_sweep(db: Session | None = None) -> dict:
    """
    Ejecuta el barrido y conciliación de vencimientos:
    1. Reservas online cuya fecha de caducidad expiró (expires_at <= today).
    2. Reservas transferidas al carrito cuyos pedidos no se pagaron.
    3. Órdenes pendientes con plazo de pago caducado.
    Restaura existencias comprometidas (reserved_quantity) al inventario disponible.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        expired_res = expire_due_reservations(db)
        expired_trans = expire_transferred_reservations(db)
        expired_orders = expire_due_orders(db)

        res_count = len(expired_res) if expired_res else 0
        trans_count = len(expired_trans) if expired_trans else 0
        orders_count = len(expired_orders) if expired_orders else 0

        logger.info(
            "Barrido de expiración completado: %d reservas, %d transferidas, %d órdenes.",
            res_count,
            trans_count,
            orders_count,
        )

        return {
            "expired_reservations_count": res_count,
            "expired_transferred_count": trans_count,
            "expired_orders_count": orders_count,
            "total_expired": res_count + trans_count + orders_count,
        }
    except Exception:
        db.rollback()
        logger.exception("Error durante el barrido de expiraciones")
        raise
    finally:
        if should_close:
            db.close()


def run_daily_expiration() -> None:
    run_expiration_sweep()
