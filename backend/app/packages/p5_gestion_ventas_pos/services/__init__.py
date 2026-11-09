from app.packages.p5_gestion_ventas_pos.services.sales_service import (
    batch_sync_offline_sales,
    check_offline_sales_status,
    create_sale,
    get_sale,
    list_sales_by_branch,
)
# logica del CU17: Exportación de servicios para Cambio de Prenda
from app.packages.p5_gestion_ventas_pos.services.exchange_service import (
    list_garment_exchanges,
    process_garment_exchange,
    quote_garment_exchange,
)
# logica del CU18: Exportación de servicios para Devolución de Prenda
from app.packages.p5_gestion_ventas_pos.services.return_service import (
    list_garment_returns,
    process_garment_return,
    quote_garment_return,
)
# logica del CU16: Exportación de servicios para Resolución de Conflictos de Venta
from app.packages.p5_gestion_ventas_pos.services.sale_conflict_service import (
    list_branch_sale_conflicts,
    resolve_sale_conflict,
)

__all__ = [
    "create_sale",
    "get_sale",
    "list_sales_by_branch",
    "check_offline_sales_status",
    "batch_sync_offline_sales",
    "quote_garment_exchange",
    "process_garment_exchange",
    "list_garment_exchanges",
    "quote_garment_return",
    "process_garment_return",
    "list_garment_returns",
    "list_branch_sale_conflicts",
    "resolve_sale_conflict",
]
