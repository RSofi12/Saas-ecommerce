"""
Generador del archivo SQL completo de la base de datos FashionStore SaaS Multitenant.
Sistemas 2 - 2026.

Requisitos específicos:
1. Sin hashear: La columna hashed_password en users se exporta con la contraseña en texto plano 'Tiendafashion123!'.
2. Contiene toda la población de la base de datos (tenants, productos, variantes con imágenes, inventario,
   ventas POS de 3 meses, contingencia offline, pedidos online, cambios, devoluciones, reservas y métricas).
3. Formato SQL estándar ejecutable con orden de inserción por dependencia de claves foráneas.
"""

from __future__ import annotations

import json
import sys
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from uuid import UUID

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

import psycopg2
import psycopg2.extras
from app.core.config import settings

db_url = settings.database_url.replace("postgresql+psycopg2://", "postgresql://")
conn = psycopg2.connect(db_url)
cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

output_path = backend_dir.parent / "database_full_unhashed.sql"
print(f"Exportando base de datos a: {output_path}")

TABLE_ORDER = [
    "plans",
    "companies",
    "subscriptions",
    "branches",
    "categories",
    "sizes",
    "colors",
    "seasons",
    "collections",
    "users",
    "user_body_profiles",
    "providers",
    "products",
    "product_variants",
    "inventory",
    "inventory_movements",
    "promotion_codes",
    "promotion_code_usages",
    "reservations",
    "reservation_items",
    "sales",
    "sale_items",
    "sync_operations",
    "garment_exchanges",
    "garment_returns",
    "orders",
    "order_items",
    "demand_forecasts",
    "ml_models",
    "customer_segments",
    "synthetic_datasets",
    "user_product_interactions",
    "collaborative_embeddings",
]

def sql_quote(val):
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, (int, float, Decimal)):
        return str(val)
    if isinstance(val, (datetime, date)):
        return f"'{val.isoformat()}'"
    if isinstance(val, (dict, list)):
        escaped = json.dumps(val).replace("'", "''")
        return f"'{escaped}'::json"
    if isinstance(val, UUID):
        return f"'{str(val)}'"
    
    # Cadena de texto
    escaped = str(val).replace("'", "''")
    return f"'{escaped}'"

total_records = 0
table_counts = {}

with open(output_path, "w", encoding="utf-8") as f:
    f.write("-- ============================================================================\n")
    f.write("-- FASHIONSTORE SAAS MULTITENANT — DUMP COMPLETO DE BASE DE DATOS (POBLACIÓN)\n")
    f.write("-- Sistemas 2 - 2026\n")
    f.write("-- Contraseña unificada para TODOS los usuarios en texto plano: Tiendafashion123!\n")
    f.write(f"-- Fecha de Generación: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    f.write("-- ============================================================================\n\n")
    f.write("SET statement_timeout = 0;\n")
    f.write("SET lock_timeout = 0;\n")
    f.write("SET client_encoding = 'UTF8';\n")
    f.write("SET standard_conforming_strings = on;\n")
    f.write("SET check_function_bodies = false;\n")
    f.write("SET client_min_messages = warning;\n")
    f.write("SET row_security = off;\n\n")

    for table in TABLE_ORDER:
        # Verificar si la tabla existe
        cur.execute(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s)",
            (table,)
        )
        if not cur.fetchone()[0]:
            print(f"   [SKIP] Tabla '{table}' no existe en la base de datos.")
            continue

        # Obtener columnas de la tabla
        cur.execute(
            """
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
            """,
            (table,)
        )
        cols_meta = cur.fetchall()
        col_names = [c[0] for c in cols_meta]

        # Consultar registros
        cur.execute(f"SELECT * FROM {table}")
        rows = cur.fetchall()
        count = len(rows)
        table_counts[table] = count
        total_records += count

        print(f"   • Exportando '{table}': {count:,} registros...")

        f.write(f"-- ----------------------------------------------------------------------------\n")
        f.write(f"-- TABLA: {table} ({count:,} registros)\n")
        f.write(f"-- ----------------------------------------------------------------------------\n")

        if count == 0:
            f.write(f"-- (Sin registros en {table})\n\n")
            continue

        # Escribir inserciones en lotes
        cols_joined = ", ".join(col_names)
        batch_size = 250
        
        for i in range(0, count, batch_size):
            chunk = rows[i:i + batch_size]
            f.write(f"INSERT INTO {table} ({cols_joined}) VALUES\n")
            
            value_lines = []
            for r in chunk:
                formatted_vals = []
                for col in col_names:
                    val = r[col]
                    # Si es la columna hashed_password en users, exportar sin hashear 'Tiendafashion123!'
                    if table == "users" and col == "hashed_password":
                        formatted_vals.append("'Tiendafashion123!'")
                    else:
                        formatted_vals.append(sql_quote(val))
                        
                value_lines.append(f"  ({', '.join(formatted_vals)})")
                
            f.write(",\n".join(value_lines))
            f.write(";\n\n")

    f.write("-- ============================================================================\n")
    f.write("-- FIN DEL DUMP COMPLETO — FASHIONSTORE SAAS MULTITENANT\n")
    f.write(f"-- Total de registros exportados: {total_records:,}\n")
    f.write("-- ============================================================================\n")

conn.close()

print("\n" + "=" * 80)
print(f"DUMP SQL GENERADO EXITOSAMENTE: {total_records:,} REGISTROS TOTALES")
print(f"Archivo guardado en: {output_path}")
print("=" * 80)
for tbl, cnt in table_counts.items():
    if cnt > 0:
        print(f"   {tbl:30s} -> {cnt:6,d} registros")

