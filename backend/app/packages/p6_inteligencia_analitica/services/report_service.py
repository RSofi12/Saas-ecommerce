from __future__ import annotations

import csv
from datetime import date, datetime, timedelta
from decimal import Decimal
from enum import Enum
import io
from typing import Iterable
from uuid import UUID

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from sqlalchemy import func, literal, or_
from sqlalchemy.orm import Session

from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p1_gestion_usuarios_acceso.models.branch import Branch
from app.packages.p2_gestion_productos_catalogo.models.product import Product
from app.packages.p2_gestion_productos_catalogo.models.product_variant import ProductVariant
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory import Inventory
from app.packages.p3_gestion_inventario_disponibilidad.models.inventory_movement import InventoryMovement
from app.packages.p4_gestion_compras_reservas.models.order import Order
from app.packages.p4_gestion_compras_reservas.models.order_item import OrderItem
from app.packages.p5_gestion_ventas_pos.models.sale import Sale
from app.packages.p5_gestion_ventas_pos.models.sale_item import SaleItem
from app.packages.p5_gestion_ventas_pos.schemas.sales_schema import SaleTypeEnum
from app.packages.p6_inteligencia_analitica.schemas.report_schema import (
    DEFAULT_INVENTORY_REPORT_COLUMNS,
    DEFAULT_MOVEMENT_REPORT_COLUMNS,
    DEFAULT_SALES_REPORT_COLUMNS,
    REPORT_COLUMN_LABELS,
    InventoryReportRow,
    MovementReportRow,
    ReportQuery,
    ReportSummary,
    SalesReportRow,
)


def _date_range(filters: ReportQuery):
    start = datetime.combine(filters.from_date, datetime.min.time()) if filters.from_date else None
    end = datetime.combine(filters.to_date + timedelta(days=1), datetime.min.time()) if filters.to_date else None
    return start, end


def get_sales_report(db: Session, filters: ReportQuery, tenant_id: UUID | None = None):
    start, end = _date_range(filters)
    query = (
        db.query(
            Sale.branch_id.label("branch_id"),
            Branch.name.label("branch_name"),
            SaleItem.product_id.label("product_id"),
            SaleItem.product_name.label("product_name"),
            SaleItem.variant_id.label("variant_id"),
            SaleItem.variant_sku.label("variant_sku"),
            func.sum(SaleItem.quantity).label("quantity_sold"),
            func.sum(SaleItem.line_total).label("gross_sales"),
            Sale.payment_method.label("payment_method"),
            Sale.payment_status.label("payment_status"),
            Sale.status.label("sale_status"),
            literal(SaleTypeEnum.in_person.value).label("type"),
        )
        .join(SaleItem, SaleItem.sale_id == Sale.id)
        .outerjoin(Branch, Branch.id == Sale.branch_id)
    )

    if tenant_id:
        query = query.filter(Sale.tenant_id == tenant_id)
    if filters.branch_id:
        query = query.filter(Sale.branch_id == filters.branch_id)
    if filters.product_id:
        query = query.filter(SaleItem.product_id == filters.product_id)
    if filters.variant_id:
        query = query.filter(SaleItem.variant_id == filters.variant_id)
    if start:
        query = query.filter(Sale.created_at >= start)
    if end:
        query = query.filter(Sale.created_at < end)
    if filters.q:
        term = f"%{filters.q.strip()}%"
        query = query.filter(or_(SaleItem.product_name.ilike(term), SaleItem.variant_sku.ilike(term), Branch.name.ilike(term)))

    rows = query.group_by(
        Sale.branch_id,
        Branch.name,
        SaleItem.product_id,
        SaleItem.product_name,
        SaleItem.variant_id,
        SaleItem.variant_sku,
        Sale.payment_method,
        Sale.payment_status,
        Sale.status,
    ).order_by(Branch.name.asc().nullslast(), SaleItem.product_name.asc(), SaleItem.variant_sku.asc()).all()

    serialized = [SalesReportRow.model_validate(row._mapping).model_dump() for row in rows]
    
    online_query = (
        db.query(
            Order.pickup_branch_id.label("branch_id"),
            Branch.name.label("branch_name"),
            OrderItem.product_id.label("product_id"),
            OrderItem.product_name.label("product_name"),
            OrderItem.variant_id.label("variant_id"),
            OrderItem.variant_sku.label("variant_sku"),
            func.sum(OrderItem.quantity).label("quantity_sold"),
            func.sum(OrderItem.line_total).label("gross_sales"),
            Order.payment_method.label("payment_method"),
            Order.payment_status.label("payment_status"),
            literal("completed").label("sale_status"),
            literal(SaleTypeEnum.online.value).label("type"),
        )
        .join(OrderItem, OrderItem.order_id == Order.id)
        .outerjoin(Branch, Branch.id == Order.pickup_branch_id)
        .filter(Order.status == "paid", Order.pickup_branch_id.is_not(None))
    )
    if tenant_id:
        online_query = online_query.filter(Order.tenant_id == tenant_id)
    if filters.branch_id:
        online_query = online_query.filter(Order.pickup_branch_id == filters.branch_id)
    if filters.product_id:
        online_query = online_query.filter(OrderItem.product_id == filters.product_id)
    if filters.variant_id:
        online_query = online_query.filter(OrderItem.variant_id == filters.variant_id)
    if start:
        online_query = online_query.filter(Order.created_at >= start)
    if end:
        online_query = online_query.filter(Order.created_at < end)
    if filters.q:
        term = f"%{filters.q.strip()}%"
        online_query = online_query.filter(or_(OrderItem.product_name.ilike(term), OrderItem.variant_sku.ilike(term), Branch.name.ilike(term)))
    
    online_rows = online_query.group_by(
        Order.pickup_branch_id,
        Branch.name,
        OrderItem.product_id,
        OrderItem.product_name,
        OrderItem.variant_id,
        OrderItem.variant_sku,
        Order.payment_method,
        Order.payment_status,
    ).order_by(Branch.name.asc().nullslast(), OrderItem.product_name.asc(), OrderItem.variant_sku.asc()).all()
    serialized.extend(SalesReportRow.model_validate(row._mapping).model_dump() for row in online_rows)

    total_orders = (
        db.query(func.count(func.distinct(Sale.id)))
        .join(SaleItem, SaleItem.sale_id == Sale.id)
        .outerjoin(Branch, Branch.id == Sale.branch_id)
    )
    if tenant_id:
        total_orders = total_orders.filter(Sale.tenant_id == tenant_id)
    if filters.branch_id:
        total_orders = total_orders.filter(Sale.branch_id == filters.branch_id)
    if filters.product_id:
        total_orders = total_orders.filter(SaleItem.product_id == filters.product_id)
    if filters.variant_id:
        total_orders = total_orders.filter(SaleItem.variant_id == filters.variant_id)
    if start:
        total_orders = total_orders.filter(Sale.created_at >= start)
    if end:
        total_orders = total_orders.filter(Sale.created_at < end)
    if filters.q:
        term = f"%{filters.q.strip()}%"
        total_orders = total_orders.filter(or_(SaleItem.product_name.ilike(term), SaleItem.variant_sku.ilike(term), Branch.name.ilike(term)))
    total_orders_value = int(total_orders.scalar() or 0)

    online_orders = (
        db.query(func.count(func.distinct(Order.id)))
        .join(OrderItem, OrderItem.order_id == Order.id)
        .outerjoin(Branch, Branch.id == Order.pickup_branch_id)
        .filter(Order.status == "paid", Order.pickup_branch_id.is_not(None))
    )
    if tenant_id:
        online_orders = online_orders.filter(Order.tenant_id == tenant_id)
    if filters.branch_id:
        online_orders = online_orders.filter(Order.pickup_branch_id == filters.branch_id)
    if filters.product_id:
        online_orders = online_orders.filter(OrderItem.product_id == filters.product_id)
    if filters.variant_id:
        online_orders = online_orders.filter(OrderItem.variant_id == filters.variant_id)
    if start:
        online_orders = online_orders.filter(Order.created_at >= start)
    if end:
        online_orders = online_orders.filter(Order.created_at < end)
    if filters.q:
        term = f"%{filters.q.strip()}%"
        online_orders = online_orders.filter(or_(OrderItem.product_name.ilike(term), OrderItem.variant_sku.ilike(term), Branch.name.ilike(term)))
    total_orders_value += int(online_orders.scalar() or 0)

    total_sales = sum(Decimal(str(row["gross_sales"])) for row in serialized)
    total_units = sum(int(row["quantity_sold"]) for row in serialized)

    return {
        "summary": ReportSummary(
            total_orders=total_orders_value,
            total_sales=total_sales,
            total_units=total_units,
            average_ticket=(total_sales / total_orders_value) if total_orders_value else Decimal("0.00"),
        ).model_dump(),
        "rows": serialized,
    }


def get_inventory_report(db: Session, filters: ReportQuery, tenant_id: UUID | None = None):
    query = (
        db.query(
            Inventory.branch_id.label("branch_id"),
            Branch.name.label("branch_name"),
            Product.id.label("product_id"),
            Product.name.label("product_name"),
            Inventory.variant_id.label("variant_id"),
            ProductVariant.sku.label("variant_sku"),
            func.sum(Inventory.quantity).label("quantity"),
            func.sum(Inventory.reserved_quantity).label("reserved_quantity"),
            func.sum(Inventory.quantity - Inventory.reserved_quantity).label("available_quantity"),
        )
        .join(ProductVariant, ProductVariant.id == Inventory.variant_id)
        .join(Product, Product.id == ProductVariant.product_id)
        .outerjoin(Branch, Branch.id == Inventory.branch_id)
    )

    if tenant_id:
        query = query.filter(Inventory.tenant_id == tenant_id)
    if filters.branch_id:
        query = query.filter(Inventory.branch_id == filters.branch_id)
    if filters.product_id:
        query = query.filter(Product.id == filters.product_id)
    if filters.variant_id:
        query = query.filter(Inventory.variant_id == filters.variant_id)
    if filters.q:
        term = f"%{filters.q.strip()}%"
        query = query.filter(or_(Product.name.ilike(term), ProductVariant.sku.ilike(term), Branch.name.ilike(term)))

    rows = query.group_by(
        Inventory.branch_id,
        Branch.name,
        Product.id,
        Product.name,
        Inventory.variant_id,
        ProductVariant.sku,
    ).order_by(Branch.name.asc().nullslast(), Product.name.asc(), ProductVariant.sku.asc()).all()

    serialized = [InventoryReportRow.model_validate(row._mapping).model_dump() for row in rows]
    return {
        "summary": {
            "total_lines": len(serialized),
            "total_stock": sum(int(row["quantity"]) for row in serialized),
            "total_reserved": sum(int(row["reserved_quantity"]) for row in serialized),
            "total_available": sum(int(row["available_quantity"]) for row in serialized),
        },
        "rows": serialized,
    }


def get_movements_report(db: Session, filters: ReportQuery, tenant_id: UUID | None = None):
    start, end = _date_range(filters)
    query = (
        db.query(
            InventoryMovement.branch_id.label("branch_id"),
            Branch.name.label("branch_name"),
            Product.id.label("product_id"),
            Product.name.label("product_name"),
            InventoryMovement.variant_id.label("variant_id"),
            ProductVariant.sku.label("variant_sku"),
            InventoryMovement.movement_type.label("movement_type"),
            func.sum(InventoryMovement.quantity).label("quantity"),
            func.count(InventoryMovement.id).label("movements_count"),
        )
        .join(ProductVariant, ProductVariant.id == InventoryMovement.variant_id)
        .join(Product, Product.id == ProductVariant.product_id)
        .outerjoin(Branch, Branch.id == InventoryMovement.branch_id)
    )

    if tenant_id:
        query = query.filter(Branch.tenant_id == tenant_id)
    if filters.branch_id:
        query = query.filter(InventoryMovement.branch_id == filters.branch_id)
    if filters.product_id:
        query = query.filter(Product.id == filters.product_id)
    if filters.variant_id:
        query = query.filter(InventoryMovement.variant_id == filters.variant_id)
    if start:
        query = query.filter(InventoryMovement.created_at >= start)
    if end:
        query = query.filter(InventoryMovement.created_at < end)
    if filters.q:
        term = f"%{filters.q.strip()}%"
        query = query.filter(or_(Product.name.ilike(term), ProductVariant.sku.ilike(term), Branch.name.ilike(term)))

    rows = query.group_by(
        InventoryMovement.branch_id,
        Branch.name,
        Product.id,
        Product.name,
        InventoryMovement.variant_id,
        ProductVariant.sku,
        InventoryMovement.movement_type,
    ).order_by(Branch.name.asc().nullslast(), Product.name.asc(), ProductVariant.sku.asc()).all()

    serialized = [MovementReportRow.model_validate(row._mapping).model_dump() for row in rows]
    return {
        "summary": {
            "total_lines": len(serialized),
            "total_units_moved": sum(int(row["quantity"]) for row in serialized),
        },
        "rows": serialized,
    }


def _resolve_columns(report_type: str, selected_columns: list[str] | None) -> list[str]:
    if selected_columns and len(selected_columns) > 0:
        return [c for c in selected_columns if c in REPORT_COLUMN_LABELS or c in ("branch_name", "product_name", "variant_sku")]
    if report_type == "sales":
        return list(DEFAULT_SALES_REPORT_COLUMNS)
    elif report_type == "inventory":
        return list(DEFAULT_INVENTORY_REPORT_COLUMNS)
    elif report_type == "movements":
        return list(DEFAULT_MOVEMENT_REPORT_COLUMNS)
    return list(DEFAULT_SALES_REPORT_COLUMNS)


def export_rows_to_csv(rows: Iterable[dict], headers: list[str]) -> str:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=headers)
    writer.writeheader()
    for row in rows:
        normalized = {}
        for key in headers:
            value = row.get(key, "")
            if isinstance(value, Enum):
                value = value.value
            normalized[key] = value
        writer.writerow(normalized)
    return buffer.getvalue()


def export_report_to_excel(
    report_type: str,
    report_data: dict,
    company_name: str,
    selected_columns: list[str] | None = None,
    filters: ReportQuery | None = None,
) -> io.BytesIO:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.views.sheetView[0].showGridLines = True

    type_titles = {
        "sales": "Reporte Consolidado de Ventas",
        "inventory": "Reporte de Inventario y Disponibilidad",
        "movements": "Kardex de Movimientos de Inventario",
    }
    title_text = type_titles.get(report_type, f"Reporte de {report_type.title()}")
    ws.title = title_text[:31]

    # 1. Header Banner
    ws["A1"] = f"{company_name} — FashionStore SaaS"
    ws["A1"].font = Font(name="Calibri", size=15, bold=True, color="1E1B4B")

    period_str = "Histórico Completo"
    if filters and (filters.from_date or filters.to_date):
        f_from = filters.from_date.strftime("%d/%m/%Y") if filters.from_date else "Inicio"
        f_to = filters.to_date.strftime("%d/%m/%Y") if filters.to_date else "Hoy"
        period_str = f"Periodo: {f_from} al {f_to}"

    ws["A2"] = f"{title_text} | {period_str} | Emitido: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    ws["A2"].font = Font(name="Calibri", size=10, italic=True, color="64748B")

    # 2. Table Column Configuration
    cols = _resolve_columns(report_type, selected_columns)
    header_fill = PatternFill(start_color="1E1B4B", end_color="1E1B4B", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )

    start_row = 4
    for c_idx, col_name in enumerate(cols, 1):
        cell = ws.cell(row=start_row, column=c_idx)
        cell.value = REPORT_COLUMN_LABELS.get(col_name, col_name.replace("_", " ").title())
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border
    ws.row_dimensions[start_row].height = 24

    # 3. Data Rows
    rows = report_data.get("rows", [])
    zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    white_fill = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

    current_r = start_row + 1
    for r_data in rows:
        is_even = ((current_r - start_row) % 2 == 0)
        curr_fill = zebra_fill if is_even else white_fill
        for c_idx, col_name in enumerate(cols, 1):
            val = r_data.get(col_name, "")
            if isinstance(val, Enum):
                val = val.value
            cell = ws.cell(row=current_r, column=c_idx)
            cell.value = val
            cell.fill = curr_fill
            cell.border = thin_border

            # Number and Currency Formatting
            if col_name == "gross_sales":
                cell.number_format = '"Bs "#,##0.00'
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif col_name in ("quantity_sold", "quantity", "reserved_quantity", "available_quantity", "movements_count"):
                cell.number_format = "#,##0"
                cell.alignment = Alignment(horizontal="right", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")
        ws.row_dimensions[current_r].height = 20
        current_r += 1

    # 4. Totals Summary Row (if rows exist)
    if len(rows) > 0:
        total_font = Font(name="Calibri", size=11, bold=True, color="0F172A")
        total_fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
        total_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="475569"),
            bottom=Side(style="double", color="1E1B4B"),
        )
        first_text_col_done = False
        for c_idx, col_name in enumerate(cols, 1):
            cell = ws.cell(row=current_r, column=c_idx)
            cell.fill = total_fill
            cell.font = total_font
            cell.border = total_border

            col_letter = get_column_letter(c_idx)
            if col_name == "gross_sales":
                cell.value = f"=SUM({col_letter}{start_row + 1}:{col_letter}{current_r - 1})"
                cell.number_format = '"Bs "#,##0.00'
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif col_name in ("quantity_sold", "quantity", "reserved_quantity", "available_quantity"):
                cell.value = f"=SUM({col_letter}{start_row + 1}:{col_letter}{current_r - 1})"
                cell.number_format = "#,##0"
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif not first_text_col_done:
                cell.value = "TOTALES"
                cell.alignment = Alignment(horizontal="left", vertical="center")
                first_text_col_done = True
        ws.row_dimensions[current_r].height = 22

    # 5. Auto-fit column widths
    for c_idx, col_name in enumerate(cols, 1):
        col_letter = get_column_letter(c_idx)
        max_len = len(REPORT_COLUMN_LABELS.get(col_name, col_name))
        for r_num in range(start_row, current_r + 1):
            val = ws.cell(row=r_num, column=c_idx).value
            if val is not None:
                max_len = max(max_len, len(str(val)))
        ws.column_dimensions[col_letter].width = min(max(max_len + 4, 13), 42)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 32, self._pagesize[0] - 36, 32)
        
        self.drawString(36, 20, "FashionStore SaaS Multitenant — Reporte Confidencial de Auditoría Empresarial")
        page_str = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(self._pagesize[0] - 36, 20, page_str)
        self.restoreState()


def export_report_to_pdf(
    report_type: str,
    report_data: dict,
    company_name: str,
    selected_columns: list[str] | None = None,
    filters: ReportQuery | None = None,
) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=45,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#1E1B4B"),
    )
    sub_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#475569"),
    )
    cell_style = ParagraphStyle(
        "ReportCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#1E293B"),
    )
    header_cell_style = ParagraphStyle(
        "ReportHeaderCell",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=1,  # Center
    )

    type_titles = {
        "sales": "Reporte Consolidado de Ventas",
        "inventory": "Reporte de Inventario y Disponibilidad",
        "movements": "Kardex de Movimientos de Inventario",
    }
    title_text = type_titles.get(report_type, f"Reporte de {report_type.title()}")

    period_str = "Histórico Completo"
    if filters and (filters.from_date or filters.to_date):
        f_from = filters.from_date.strftime("%d/%m/%Y") if filters.from_date else "Inicio"
        f_to = filters.to_date.strftime("%d/%m/%Y") if filters.to_date else "Hoy"
        period_str = f"Periodo: {f_from} al {f_to}"

    elements = [
        Paragraph(f"{company_name} — {title_text}", title_style),
        Spacer(1, 4),
        Paragraph(
            f"<b>Ámbito:</b> Plataforma SaaS Multitenant &nbsp;|&nbsp; <b>{period_str}</b> &nbsp;|&nbsp; <b>Fecha de Emisión:</b> {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}",
            sub_style,
        ),
        Spacer(1, 12),
    ]

    # KPI Summary Cards Block (if present)
    summary = report_data.get("summary")
    if summary and isinstance(summary, dict):
        kpi_items = []
        if report_type == "sales":
            kpi_items = [
                ("Ventas Brutas", f"Bs {Decimal(str(summary.get('total_sales', 0))):,.2f}"),
                ("Unidades Vendidas", f"{summary.get('total_units', 0):,}"),
                ("Órdenes Totales", f"{summary.get('total_orders', 0):,}"),
                ("Ticket Promedio", f"Bs {Decimal(str(summary.get('average_ticket', 0))):,.2f}"),
            ]
        elif report_type == "inventory":
            kpi_items = [
                ("Líneas de Inventario", f"{summary.get('total_lines', 0):,}"),
                ("Stock Total Físico", f"{summary.get('total_stock', 0):,}"),
                ("Stock Reservado", f"{summary.get('total_reserved', 0):,}"),
                ("Stock Disponible", f"{summary.get('total_available', 0):,}"),
            ]
        elif report_type == "movements":
            kpi_items = [
                ("Líneas Afectadas", f"{summary.get('total_lines', 0):,}"),
                ("Total Unidades Movidas", f"{summary.get('total_units_moved', 0):,}"),
            ]

        if kpi_items:
            kpi_header = [Paragraph(f"<b>{k}</b>", ParagraphStyle('Kh', parent=sub_style, fontName='Helvetica-Bold', fontSize=8, alignment=1)) for k, _ in kpi_items]
            kpi_values = [Paragraph(f"<b>{v}</b>", ParagraphStyle('Kv', parent=sub_style, fontName='Helvetica-Bold', fontSize=10.5, textColor=colors.HexColor('#1E1B4B'), alignment=1)) for _, v in kpi_items]
            kpi_table = Table([kpi_header, kpi_values], colWidths=[720 / len(kpi_items)] * len(kpi_items))
            kpi_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))
            elements.append(kpi_table)
            elements.append(Spacer(1, 12))

    # Data Table
    cols = _resolve_columns(report_type, selected_columns)
    rows = report_data.get("rows", [])
    
    # Calculate column widths proportionally for 720 points total width
    available_width = 720
    col_width = available_width / len(cols)
    col_widths = [col_width] * len(cols)

    table_data = []
    header_row = [Paragraph(REPORT_COLUMN_LABELS.get(c, c.replace("_", " ").title()), header_cell_style) for c in cols]
    table_data.append(header_row)

    if len(rows) == 0:
        empty_msg = Paragraph("<i>No se encontraron registros para los filtros seleccionados.</i>", cell_style)
        table_data.append([empty_msg] + [""] * (len(cols) - 1))
        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E1B4B")),
            ("SPAN", (0, 1), (-1, 1)),
            ("ALIGN", (0, 1), (-1, 1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ]))
        elements.append(t)
    else:
        for r in rows:
            row_cells = []
            for c in cols:
                val = r.get(c, "")
                if isinstance(val, Enum):
                    val = val.value
                if c == "gross_sales":
                    val_str = f"Bs {Decimal(str(val)):,.2f}"
                    p_style = ParagraphStyle('Rgt', parent=cell_style, alignment=2)
                elif c in ("quantity_sold", "quantity", "reserved_quantity", "available_quantity", "movements_count"):
                    val_str = f"{int(val):,}"
                    p_style = ParagraphStyle('Rgt', parent=cell_style, alignment=2)
                else:
                    val_str = str(val) if val is not None else ""
                    p_style = cell_style
                row_cells.append(Paragraph(val_str, p_style))
            table_data.append(row_cells)

        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E1B4B")),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
        ]))
        elements.append(t)

    doc.build(elements, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer
