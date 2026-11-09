from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.core.database import get_db
from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p1_gestion_usuarios_acceso.schemas.enums import RolEnum
from app.packages.p6_inteligencia_analitica.schemas.report_schema import (
    NaturalReportRequest,
    ReportExportFormatEnum,
    ReportQuery,
)
from app.packages.p6_inteligencia_analitica.services.natural_report_service import (
    NaturalReportError,
    generate_natural_report,
)
from app.packages.p6_inteligencia_analitica.services.report_service import (
    export_report_to_excel,
    export_report_to_pdf,
    export_rows_to_csv,
    get_inventory_report,
    get_movements_report,
    get_sales_report,
)
from app.utils.response import response

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/query")
async def natural_report_route(
    request: NaturalReportRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(RolEnum.administrador)),
):
    try:
        data = await generate_natural_report(db, request.query)
    except NaturalReportError as error:
        return response(status_code=error.status_code, message=error.detail, error=error.detail)
    return response(status_code=status.HTTP_200_OK, message="Reporte interpretado exitosamente", data=data)


def _filters(
    branch_id: UUID | None = Query(default=None),
    product_id: UUID | None = Query(default=None),
    variant_id: UUID | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    q: str | None = Query(default=None),
) -> ReportQuery:
    return ReportQuery(
        branch_id=branch_id,
        product_id=product_id,
        variant_id=variant_id,
        from_date=from_date,
        to_date=to_date,
        q=q,
    )


def _scoped_filters(filters: ReportQuery, current_user: dict) -> ReportQuery:
    if current_user.get("rol") != RolEnum.encargado.value:
        return filters

    branch_id = current_user.get("branch_id")
    if not branch_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El encargado no tiene sucursal asignada")
    try:
        manager_branch_id = UUID(branch_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La sucursal asignada no es válida")
    return filters.model_copy(update={"branch_id": manager_branch_id})


def _get_tenant_id(current_user: dict) -> UUID | None:
    raw = current_user.get("tenant_id")
    if not raw:
        return None
    try:
        return UUID(str(raw))
    except (TypeError, ValueError):
        return None


def _get_company_name(db: Session, tenant_id: UUID | None) -> str:
    if not tenant_id:
        return "FashionStore SaaS"
    name = db.query(Company.name).filter(Company.id == tenant_id).scalar()
    return name or "FashionStore Boutique"


def _parse_columns(columns: str | None) -> list[str] | None:
    if not columns:
        return None
    cols = [c.strip() for c in columns.split(",") if c.strip()]
    return cols if len(cols) > 0 else None


def _build_streaming_response(
    report_type: str,
    report_data: dict,
    export_format: ReportExportFormatEnum,
    company_name: str,
    filters: ReportQuery,
    selected_columns: list[str] | None,
) -> StreamingResponse:
    if export_format in (ReportExportFormatEnum.excel, ReportExportFormatEnum.xlsx):
        stream = export_report_to_excel(
            report_type=report_type,
            report_data=report_data,
            company_name=company_name,
            selected_columns=selected_columns,
            filters=filters,
        )
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{report_type}-report.xlsx"
    elif export_format == ReportExportFormatEnum.pdf:
        stream = export_report_to_pdf(
            report_type=report_type,
            report_data=report_data,
            company_name=company_name,
            selected_columns=selected_columns,
            filters=filters,
        )
        media_type = "application/pdf"
        filename = f"{report_type}-report.pdf"
    else:  # CSV default
        from app.packages.p6_inteligencia_analitica.services.report_service import _resolve_columns
        cols = _resolve_columns(report_type, selected_columns)
        content = export_rows_to_csv(report_data.get("rows", []), cols)
        stream = iter([content])
        media_type = "text/csv"
        filename = f"{report_type}-report.csv"

    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(stream, media_type=media_type, headers=headers)


# ---------------------------------------------------------------------------
# JSON Preview Endpoints
# ---------------------------------------------------------------------------

@router.get("/sales")
async def sales_report_route(
    db: Session = Depends(get_db),
    filters: ReportQuery = Depends(_filters),
    current_user: dict = Depends(require_roles(RolEnum.administrador, RolEnum.encargado)),
):
    filters = _scoped_filters(filters, current_user)
    tenant_id = _get_tenant_id(current_user)
    return response(
        status_code=status.HTTP_200_OK,
        message="Reporte de ventas obtenido exitosamente",
        data=get_sales_report(db, filters, tenant_id=tenant_id),
    )


@router.get("/inventory")
async def inventory_report_route(
    db: Session = Depends(get_db),
    filters: ReportQuery = Depends(_filters),
    current_user: dict = Depends(require_roles(RolEnum.administrador, RolEnum.encargado)),
):
    filters = _scoped_filters(filters, current_user)
    tenant_id = _get_tenant_id(current_user)
    return response(
        status_code=status.HTTP_200_OK,
        message="Reporte de inventario obtenido exitosamente",
        data=get_inventory_report(db, filters, tenant_id=tenant_id),
    )


@router.get("/movements")
async def movements_report_route(
    db: Session = Depends(get_db),
    filters: ReportQuery = Depends(_filters),
    current_user: dict = Depends(require_roles(RolEnum.administrador, RolEnum.encargado)),
):
    filters = _scoped_filters(filters, current_user)
    tenant_id = _get_tenant_id(current_user)
    return response(
        status_code=status.HTTP_200_OK,
        message="Reporte de movimientos obtenido exitosamente",
        data=get_movements_report(db, filters, tenant_id=tenant_id),
    )


# ---------------------------------------------------------------------------
# Generic Unified Export Endpoint (Supports CSV, Excel and PDF with Dynamic Columns)
# ---------------------------------------------------------------------------

@router.get("/{report_type}/export")
async def unified_report_export_route(
    report_type: str,
    db: Session = Depends(get_db),
    filters: ReportQuery = Depends(_filters),
    format: ReportExportFormatEnum = Query(default=ReportExportFormatEnum.csv),
    columns: str | None = Query(default=None, description="Columnas separadas por coma"),
    current_user: dict = Depends(require_roles(RolEnum.administrador, RolEnum.encargado)),
):
    if report_type not in ("sales", "inventory", "movements"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tipo de reporte '{report_type}' no soportado")

    filters = _scoped_filters(filters, current_user)
    tenant_id = _get_tenant_id(current_user)
    company_name = _get_company_name(db, tenant_id)
    selected_cols = _parse_columns(columns)

    if report_type == "sales":
        data = get_sales_report(db, filters, tenant_id=tenant_id)
    elif report_type == "inventory":
        data = get_inventory_report(db, filters, tenant_id=tenant_id)
    else:
        data = get_movements_report(db, filters, tenant_id=tenant_id)

    return _build_streaming_response(
        report_type=report_type,
        report_data=data,
        export_format=format,
        company_name=company_name,
        filters=filters,
        selected_columns=selected_cols,
    )


# ---------------------------------------------------------------------------
# Dedicated Convenience Routes (Direct /export/excel and /export/pdf)
# ---------------------------------------------------------------------------

@router.get("/{report_type}/export/excel")
async def export_report_excel_direct_route(
    report_type: str,
    db: Session = Depends(get_db),
    filters: ReportQuery = Depends(_filters),
    columns: str | None = Query(default=None),
    current_user: dict = Depends(require_roles(RolEnum.administrador, RolEnum.encargado)),
):
    return await unified_report_export_route(
        report_type=report_type,
        db=db,
        filters=filters,
        format=ReportExportFormatEnum.excel,
        columns=columns,
        current_user=current_user,
    )


@router.get("/{report_type}/export/pdf")
async def export_report_pdf_direct_route(
    report_type: str,
    db: Session = Depends(get_db),
    filters: ReportQuery = Depends(_filters),
    columns: str | None = Query(default=None),
    current_user: dict = Depends(require_roles(RolEnum.administrador, RolEnum.encargado)),
):
    return await unified_report_export_route(
        report_type=report_type,
        db=db,
        filters=filters,
        format=ReportExportFormatEnum.pdf,
        columns=columns,
        current_user=current_user,
    )
