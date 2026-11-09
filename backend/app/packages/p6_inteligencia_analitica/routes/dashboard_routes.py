from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.core.database import get_db
from app.packages.p1_gestion_usuarios_acceso.schemas.enums import RolEnum
from app.packages.p6_inteligencia_analitica.schemas.dashboard_schema import DashboardPeriod, DashboardQuery
from app.packages.p6_inteligencia_analitica.services.dashboard_service import get_dashboard
from app.utils.response import response

router = APIRouter(prefix="/dashboard", tags=["Dashboard Ejecutivo (CU25)"])


def _filters(
    branch_id: UUID | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    period: DashboardPeriod = Query(default='day'),
) -> DashboardQuery:
    return DashboardQuery(branch_id=branch_id, from_date=from_date, to_date=to_date, period=period)


@router.get("")
def dashboard_route(
    db: Session = Depends(get_db),
    filters: DashboardQuery = Depends(_filters),
    tenant_id: UUID | None = Query(default=None, description="Filtrar por tenant específico (superadmin)"),
    current_user: dict = Depends(require_roles(RolEnum.administrador, RolEnum.superadmin)),
):
    """
    Obtiene el tablero ejecutivo integral (CU25):
    - Métricas comerciales (ingresos, órdenes, ticket promedio, top productos).
    - Conciliación y tasa de sincronización offline con contingencia UUIDv4.
    - Rendimiento contable de políticas de cambio y retención de devoluciones (20%-50%).
    - Indicadores analíticos de Machine Learning (pronóstico RandomForest y clusters RFM K-Means).
    - Estado de cuotas de sucursales frente al plan SaaS contratado.
    """
    # Si es administrador, se fuerza su propio tenant_id
    resolved_tenant_id = None
    user_tenant = current_user.get("tenant_id")
    if user_tenant:
        resolved_tenant_id = UUID(str(user_tenant))
    elif current_user.get("rol") == RolEnum.superadmin.value and tenant_id:
        resolved_tenant_id = tenant_id

    dashboard = get_dashboard(db, filters, tenant_id=resolved_tenant_id)
    return response(
        status_code=200,
        message="Dashboard ejecutivo obtenido exitosamente",
        data=dashboard.model_dump(),
    )
