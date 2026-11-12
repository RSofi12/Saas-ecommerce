"""
Script Ultrarrápido de Población con Tráfico Realista de 3 Meses para FashionStore SaaS Multitenant.
Sistemas 2 - 2026.

Utiliza psycopg2.extras.execute_values con multi-row SQL nativo para insertar
miles de registros en milisegundos con cero latencia de red.
"""

from __future__ import annotations

import json
import random
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

import psycopg2
import psycopg2.extras
from app.core.config import settings
from app.auth.hash import hash_password

print("=" * 80)
print("INICIANDO POBLADOR NATIVO ULTRARRÁPIDO - 3 MESES DE TRÁFICO REALISTA")
print("=" * 80)

# Conexión nativa psycopg2
db_url = settings.database_url.replace("postgresql+psycopg2://", "postgresql://")
conn = psycopg2.connect(db_url)
conn.autocommit = False
cur = conn.cursor()

NOW = datetime(2026, 11, 11, 23, 30, 0, tzinfo=timezone.utc)
START_DATE = NOW - timedelta(days=90)

# --------------------------------------------------------------------------------------
# 1. IDENTIFICAR TENANTS Y ESTADO ACTUAL
# --------------------------------------------------------------------------------------
cur.execute("SELECT id, name, subdomain FROM companies WHERE status = 'ACTIVO'")
companies = cur.fetchall()

print(f"\n[PASO 1] {len(companies)} Tenants activos identificados:")
for c_id, c_name, c_sub in companies:
    cur.execute("SELECT count(*) FROM branches WHERE tenant_id = %s AND is_active = true", (c_id,))
    b_cnt = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM products WHERE tenant_id = %s", (c_id,))
    p_cnt = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM product_variants WHERE tenant_id = %s", (c_id,))
    v_cnt = cur.fetchone()[0]
    print(f"   • Tenant '{c_name}' ({c_sub}): {b_cnt} sucursales | {p_cnt} productos | {v_cnt} variantes")

# --------------------------------------------------------------------------------------
# 2. CONSOLIDAR INVENTARIO PARA TODAS LAS SUCURSALES (EXECUTE_VALUES)
# --------------------------------------------------------------------------------------
print("\n[PASO 2] Consolidando inventario para todas las sucursales con execute_values...", flush=True)

cur.execute("SELECT branch_id, variant_id FROM inventory")
existing_inv = set(cur.fetchall())

inv_tuples = []
for c_id, c_name, _ in companies:
    cur.execute("SELECT id FROM branches WHERE tenant_id = %s AND is_active = true", (c_id,))
    branches = [r[0] for r in cur.fetchall()]
    cur.execute("SELECT id FROM product_variants WHERE tenant_id = %s AND status = 'active'", (c_id,))
    variants = [r[0] for r in cur.fetchall()]
    
    for b_id in branches:
        for v_id in variants:
            if (b_id, v_id) not in existing_inv:
                inv_tuples.append((
                    str(uuid.uuid4()),
                    str(v_id),
                    str(b_id),
                    str(c_id),
                    random.randint(22, 58),
                    0,
                    random.randint(3, 6),
                ))
                existing_inv.add((b_id, v_id))

if inv_tuples:
    print(f"   -> Insertando {len(inv_tuples)} filas de inventario en multi-row SQL...", flush=True)
    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO inventory (id, variant_id, branch_id, tenant_id, quantity, reserved_quantity, minimum_stock)
        VALUES %s
        ON CONFLICT (variant_id, branch_id) DO NOTHING
        """,
        inv_tuples,
        page_size=2000
    )
    conn.commit()
    print(f"   ✓ Inventario consolidado exitosamente (+{len(inv_tuples)} filas).")
else:
    print("   ✓ Inventario ya se encontraba 100% al día.")

# --------------------------------------------------------------------------------------
# 3. CARTERA DE CLIENTES BOLIVIANOS REGISTRADOS
# --------------------------------------------------------------------------------------
print("\n[PASO 3] Asegurando cartera de clientes bolivianos...", flush=True)

bolivian_names = [
    ("Valeria", "Méndez Roca", "femenino"),
    ("Carlos Eduardo", "Justiniano Paz", "masculino"),
    ("Mariana", "Flores Antelo", "femenino"),
    ("Rodrigo", "Banzer Claure", "masculino"),
    ("Camila", "Suárez Vaca Diez", "femenino"),
    ("Mateo", "Alarcón Villazón", "masculino"),
    ("Luciana", "Rivero Hurtado", "femenino"),
    ("Sebastián", "Quiroga Terán", "masculino"),
    ("Natalia", "Torrico Cossío", "femenino"),
    ("Ignacio", "Barrientos Siles", "masculino"),
    ("Fabiana", "Gutiérrez Dabdoub", "femenino"),
    ("Alejandro", "Morales Melgar", "masculino"),
    ("Daniela", "Saucedo Parada", "femenino"),
    ("Joaquín", "Paz Soldán", "masculino"),
    ("Adriana", "Roca Mercado", "femenino"),
    ("Leonardo", "Céspedes Vaca", "masculino"),
    ("Carolina", "Díaz de Medina", "femenino"),
    ("Gabriel", "Vargas Lanza", "masculino"),
    ("Nicole", "Castillo Montero", "femenino"),
    ("Mauricio", "Soruco Villarroel", "masculino"),
    ("Paola Andrea", "Añez Ribera", "femenino"),
    ("Bruno", "Montenegro Soliz", "masculino"),
    ("Flavia", "Guzmán Baldivieso", "femenino"),
    ("Diego Armando", "Ríos Claros", "masculino"),
    ("Silvia", "Peña Velasco", "femenino"),
    ("Javier", "Fernández Ocampo", "masculino"),
    ("Vanessa", "Salvatierra Ortiz", "femenino"),
    ("Gonzalo", "Chávez Echeverría", "masculino"),
    ("Lorena", "Terceros Suárez", "femenino"),
    ("Martín", "Duran Carvajal", "masculino"),
]

pwd_hash = hash_password("Tiendafashion123!")
cur.execute("SELECT email FROM users")
existing_emails = set(r[0] for r in cur.fetchall())

user_tuples = []
profile_tuples = []

for c_id, c_name, c_sub in companies:
    prefix = c_sub.replace("-", "")
    for fn, ln, g in bolivian_names:
        em = f"{fn.lower().replace(' ', '')}.{ln.lower().replace(' ', '')}.{prefix}@cliente.bo"
        if em not in existing_emails:
            u_id = str(uuid.uuid4())
            reg_date = START_DATE - timedelta(days=random.randint(5, 60))
            user_tuples.append((
                u_id,
                em,
                f"{fn} {ln}",
                pwd_hash,
                "cliente",
                g,
                str(c_id),
                True,
                reg_date
            ))
            profile_tuples.append((
                str(uuid.uuid4()),
                u_id,
                random.choice(["S", "M", "L"]),
                random.choice(["28", "30", "32", "34"]),
                f"Cliente frecuente de {c_name}"
            ))
            existing_emails.add(em)

if user_tuples:
    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO users (id, email, name, hashed_password, rol, gender, tenant_id, is_active, created_at)
        VALUES %s
        """,
        user_tuples
    )
    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO user_body_profiles (id, user_id, top_size, bottom_size, notes)
        VALUES %s
        """,
        profile_tuples
    )
    conn.commit()
    print(f"   ✓ Creados {len(user_tuples)} clientes bolivianos.")
else:
    print("   ✓ Clientes bolivianos ya registrados.")

# --------------------------------------------------------------------------------------
# 4. PRE-CARGA EN MEMORIA DE ENTIDADES
# --------------------------------------------------------------------------------------
print("\n[PASO 4] Pre-cargando entidades para generación en memoria...", flush=True)

branches_by_tenant = {}
cashiers_by_branch = {}
clients_by_tenant = {}
variants_by_tenant = {}

cur.execute("SELECT id, name FROM products")
prod_names = dict(cur.fetchall())

for c_id, _, _ in companies:
    cur.execute("SELECT id FROM branches WHERE tenant_id = %s AND is_active = true", (c_id,))
    b_ids = [r[0] for r in cur.fetchall()]
    branches_by_tenant[c_id] = b_ids
    
    for b_id in b_ids:
        cur.execute("SELECT id FROM users WHERE branch_id = %s AND rol = 'cajero'", (b_id,))
        c_ids = [r[0] for r in cur.fetchall()]
        if not c_ids:
            cur.execute("SELECT id FROM users WHERE tenant_id = %s AND rol IN ('cajero', 'encargado')", (c_id,))
            c_ids = [r[0] for r in cur.fetchall()]
        cashiers_by_branch[b_id] = c_ids
        
    cur.execute("SELECT id FROM users WHERE tenant_id = %s AND rol = 'cliente'", (c_id,))
    clients_by_tenant[c_id] = [r[0] for r in cur.fetchall()]
    
    cur.execute(
        """
        SELECT id, product_id, sku, price, size_id, color_id, image_url 
        FROM product_variants 
        WHERE tenant_id = %s AND status = 'active'
        """,
        (c_id,)
    )
    variants_by_tenant[c_id] = cur.fetchall()

print("   ✓ Entidades pre-cargadas en RAM con éxito.")

# --------------------------------------------------------------------------------------
# 5. SIMULACIÓN DE 90 DÍAS DE TRÁFICO TRANSACCIONAL
# --------------------------------------------------------------------------------------
print("\n[PASO 5] Generando 90 días de tráfico operacional (Agosto - Noviembre 2026)...", flush=True)

sales_tuples = []
sale_items_tuples = []
sync_ops_tuples = []
exchanges_tuples = []
returns_tuples = []
orders_tuples = []
order_items_tuples = []
reservations_tuples = []
res_items_tuples = []

day_cursor = START_DATE
while day_cursor <= NOW:
    is_weekend = day_cursor.weekday() in [4, 5, 6]
    day_num = day_cursor.day
    is_payday = (14 <= day_num <= 17) or (29 <= day_num <= 31) or (1 <= day_num <= 2)
    
    multiplier = 1.0
    if is_weekend:
        multiplier *= 1.8
    if is_payday:
        multiplier *= 1.35
        
    for c_id, c_name, _ in companies:
        branches = branches_by_tenant.get(c_id, [])
        variants = variants_by_tenant.get(c_id, [])
        clients = clients_by_tenant.get(c_id, [])
        
        if not branches or not variants or not clients:
            continue
            
        base_sales = 3 if len(branches) == 1 else (6 if len(branches) <= 5 else 9)
        daily_count = max(1, int(round(base_sales * multiplier * random.uniform(0.85, 1.2))))
        
        for _ in range(daily_count):
            b_id = random.choice(branches)
            cashier_pool = cashiers_by_branch.get(b_id, [])
            cashier_id = random.choice(cashier_pool) if cashier_pool else random.choice(clients)
            client_id = random.choice(clients) if random.random() < 0.82 else cashier_id
            
            sale_time = day_cursor.replace(
                hour=random.randint(9, 20),
                minute=random.randint(0, 59),
                second=random.randint(0, 59)
            )
            if sale_time > NOW:
                continue
                
            is_cash = random.random() < 0.55
            pay_method = "cash" if is_cash else "stripe"
            
            is_offline = is_cash and (random.random() < 0.16)
            client_sale_id = str(uuid.uuid4()) if is_offline else None
            synced_at = min(NOW, sale_time + timedelta(minutes=random.randint(10, 120))) if is_offline else None
            
            cash_ref = (
                f"TCK-OFF-{client_sale_id[:6].upper()} (Contingencia Offline)" if is_offline
                else (f"Cobro Mostrador Caja #1 - Ref: {random.randint(100000, 999999)}" if is_cash else f"POS-VOUCHER-{random.randint(10000, 99999)}")
            )
            
            sale_id = str(uuid.uuid4())
            num_items = random.choices([1, 2, 3], weights=[0.62, 0.28, 0.10])[0]
            chosen_variants = random.sample(variants, k=min(num_items, len(variants)))
            
            subtotal = Decimal("0.00")
            local_items = []
            
            for v in chosen_variants:
                v_id, p_id, sku, price, sz_id, col_id, img_url = v
                qty = 1 if random.random() < 0.88 else 2
                line_tot = Decimal(str(price)) * qty
                subtotal += line_tot
                p_name = prod_names.get(p_id, "Prenda Textil")
                
                item_tuple = (
                    str(uuid.uuid4()),
                    str(c_id),
                    sale_id,
                    str(v_id),
                    qty,
                    price,
                    line_tot,
                    str(p_id),
                    p_name,
                    sku,
                    str(sz_id) if sz_id else None,
                    str(col_id) if col_id else None,
                    img_url
                )
                sale_items_tuples.append(item_tuple)
                local_items.append({"v_id": v_id, "price": price, "line_tot": line_tot})
                
            discount = Decimal("0.00")
            if is_payday and random.random() < 0.20:
                discount = round(subtotal * Decimal("0.10"), 2)
            total_amount = subtotal - discount
            
            sales_tuples.append((
                sale_id,
                str(c_id),
                str(b_id),
                str(client_id),
                client_sale_id,
                is_offline,
                synced_at,
                "completed",
                pay_method,
                "paid",
                cash_ref,
                subtotal,
                discount,
                total_amount,
                "BOB",
                sale_time,
                sale_time
            ))
            
            if is_offline:
                sync_ops_tuples.append((
                    str(uuid.uuid4()),
                    str(c_id),
                    client_sale_id,
                    "OFFLINE_SALE",
                    json.dumps({"sale_id": sale_id, "total": float(total_amount), "branch_id": str(b_id)}),
                    "PROCESADO",
                    synced_at,
                    sale_time
                ))
                
            # CU17: Cambio de prenda por talla (3.5% de ventas)
            if random.random() < 0.035 and len(local_items) >= 1 and len(variants) >= 2:
                orig_item = local_items[0]
                alt_variants = [v for v in variants if v[0] != orig_item["v_id"] and v[3] >= orig_item["price"]]
                if alt_variants:
                    new_v = random.choice(alt_variants)
                    diff = max(Decimal("0.00"), Decimal(str(new_v[3])) - orig_item["price"])
                    ex_time = min(NOW, sale_time + timedelta(days=random.randint(1, 14), hours=random.randint(1, 5)))
                    exchanges_tuples.append((
                        str(uuid.uuid4()),
                        str(c_id),
                        str(b_id),
                        str(cashier_id),
                        sale_id,
                        str(orig_item["v_id"]),
                        str(new_v[0]),
                        diff,
                        True,
                        "cash",
                        "COMPLETED",
                        f"Cambio por talla/modelo. Cliente abonó diferencia reglamentaria de Bs {diff:.2f}.",
                        ex_time
                    ))
                    
            # CU18: Devolución de prenda con retención 20%-50% (2.5% de ventas)
            if random.random() < 0.025 and len(local_items) >= 1:
                ret_item = local_items[0]
                item_val = ret_item["line_tot"]
                ret_pct = Decimal(str(random.choice([20.0, 30.0, 40.0, 50.0])))
                ret_amt = round(item_val * (ret_pct / Decimal("100.0")), 2)
                ref_amt = item_val - ret_amt
                ret_time = min(NOW, sale_time + timedelta(days=random.randint(2, 12), hours=random.randint(1, 4)))
                nc_code = f"NC-{ret_time.strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
                returns_tuples.append((
                    str(uuid.uuid4()),
                    str(c_id),
                    str(b_id),
                    str(cashier_id),
                    sale_id,
                    str(ret_item["v_id"]),
                    1,
                    item_val,
                    ret_pct,
                    ret_amt,
                    ref_amt,
                    "credit_note",
                    nc_code,
                    "Ajuste de talla no conforme con silueta del cliente. Prenda con etiqueta intacta.",
                    ret_time
                ))

    # CU09: Pedidos online con Stripe y despacho formal (1-2 por día)
    if random.random() < 0.70:
        tc_id, tc_name, _ = random.choice(companies)
        t_vars = variants_by_tenant.get(tc_id, [])
        t_cls = clients_by_tenant.get(tc_id, [])
        t_brs = branches_by_tenant.get(tc_id, [])
        
        if t_vars and t_cls and t_brs:
            cl_id = random.choice(t_cls)
            o_id = str(uuid.uuid4())
            o_time = day_cursor.replace(hour=random.randint(10, 22), minute=random.randint(0, 59))
            v_s = random.sample(t_vars, k=min(2, len(t_vars)))
            o_sub = sum(Decimal(str(v[3])) for v in v_s)
            
            orders_tuples.append((
                o_id,
                str(tc_id),
                str(cl_id),
                "paid",
                "stripe",
                "paid",
                f"pi_sim_{uuid.uuid4().hex[:16]}",
                "home_delivery",
                f"Av. Principal #{random.randint(100, 999)}, Bolivia",
                f"DSP-{day_cursor.strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}",
                "delivered",
                o_time + timedelta(hours=random.randint(4, 20)),
                o_sub,
                Decimal("0.00"),
                o_sub,
                "BOB",
                o_time,
                o_time
            ))
            for v in v_s:
                v_id, p_id, sku, price, sz_id, col_id, img_url = v
                p_name = prod_names.get(p_id, "Prenda Textil")
                order_items_tuples.append((
                    str(uuid.uuid4()),
                    str(tc_id),
                    o_id,
                    str(v_id),
                    1,
                    price,
                    price,
                    str(p_id),
                    p_name,
                    sku,
                    str(sz_id) if sz_id else None,
                    str(col_id) if col_id else None,
                    img_url
                ))

    # CU10/CU11/CU12: Reservas de mostrador y online (1 cada ~2 días)
    if random.random() < 0.55:
        tc_id, _, _ = random.choice(companies)
        t_vars = variants_by_tenant.get(tc_id, [])
        t_cls = clients_by_tenant.get(tc_id, [])
        t_brs = branches_by_tenant.get(tc_id, [])
        
        if t_vars and t_cls and t_brs:
            cl_id = random.choice(t_cls)
            b_id = random.choice(t_brs)
            v = random.choice(t_vars)
            r_id = str(uuid.uuid4())
            r_time = day_cursor.replace(hour=random.randint(11, 18), minute=random.randint(0, 59))
            is_recent = (NOW - r_time).days < 3
            r_stat = "pending" if is_recent else random.choice(["attended", "sold", "expired"])
            
            reservations_tuples.append((
                r_id,
                str(tc_id),
                str(b_id),
                str(cl_id),
                (r_time + timedelta(days=2)).date(),
                (r_time + timedelta(days=3)).date(),
                r_stat,
                v[3],
                "Apartado de mostrador formalmente resuelto en sucursal." if r_stat != "pending" else None,
                r_time,
                r_time
            ))
            res_items_tuples.append((
                str(uuid.uuid4()),
                str(tc_id),
                r_id,
                str(v[0]),
                1,
                v[3]
            ))

    day_cursor += timedelta(days=1)

print(f"   ✓ Memoria: {len(sales_tuples)} ventas | {len(sale_items_tuples)} ítems | {len(sync_ops_tuples)} syncs.")
print(f"   ✓ Memoria: {len(exchanges_tuples)} cambios | {len(returns_tuples)} devoluciones | {len(orders_tuples)} órdenes | {len(reservations_tuples)} reservas.")

# --------------------------------------------------------------------------------------
# 6. INSERCIÓN MULTI-ROW CON EXECUTE_VALUES (ULTRA RÁPIDO)
# --------------------------------------------------------------------------------------
print("\n[PASO 6] Insertando transacciones en PostgreSQL vía execute_values...", flush=True)

print("   -> Insertando Ventas POS...", flush=True)
psycopg2.extras.execute_values(
    cur,
    """
    INSERT INTO sales (
        id, tenant_id, branch_id, user_id, client_sale_id, is_offline,
        synced_at, status, payment_method, payment_status, cash_reference,
        subtotal, discount_amount, total_amount, currency, created_at, updated_at
    ) VALUES %s
    """,
    sales_tuples,
    page_size=2000
)
conn.commit()

print("   -> Insertando Ítems de Venta...", flush=True)
psycopg2.extras.execute_values(
    cur,
    """
    INSERT INTO sale_items (
        id, tenant_id, sale_id, variant_id, quantity, unit_price, line_total,
        product_id, product_name, variant_sku, size_id, color_id, image_url
    ) VALUES %s
    """,
    sale_items_tuples,
    page_size=2000
)
conn.commit()

if sync_ops_tuples:
    print("   -> Insertando Operaciones de Sincronización Offline...", flush=True)
    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO sync_operations (
            id, tenant_id, client_operation_id, operation_type, payload, status, synced_at, created_at
        ) VALUES %s
        """,
        sync_ops_tuples,
        template="(%s, %s, %s, %s, %s::json, %s, %s, %s)",
        page_size=2000
    )
    conn.commit()

if exchanges_tuples:
    print("   -> Insertando Cambios de Prenda por Talla (CU17)...", flush=True)
    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO garment_exchanges (
            id, tenant_id, branch_id, cashier_id, sale_id, original_variant_id,
            new_variant_id, price_difference, difference_paid, payment_method, status, notes, created_at
        ) VALUES %s
        """,
        exchanges_tuples,
        page_size=2000
    )
    conn.commit()

if returns_tuples:
    print("   -> Insertando Devoluciones con Notas de Crédito (CU18)...", flush=True)
    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO garment_returns (
            id, tenant_id, branch_id, cashier_id, sale_id, variant_id, quantity,
            original_item_amount, retention_percentage, retention_amount, refund_amount,
            refund_method, credit_note_code, reason, created_at
        ) VALUES %s
        """,
        returns_tuples,
        page_size=2000
    )
    conn.commit()

if orders_tuples:
    print("   -> Insertando Pedidos Online con Despacho Stripe (CU09)...", flush=True)
    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO orders (
            id, tenant_id, user_id, status, payment_method, payment_status,
            stripe_payment_intent_id, delivery_type, shipping_address, tracking_number,
            fulfillment_status, dispatched_at, subtotal, discount_amount, total_amount, currency, created_at, updated_at
        ) VALUES %s
        """,
        orders_tuples,
        page_size=2000
    )
    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO order_items (
            id, tenant_id, order_id, variant_id, quantity, unit_price, line_total,
            product_id, product_name, variant_sku, size_id, color_id, image_url
        ) VALUES %s
        """,
        order_items_tuples,
        page_size=2000
    )
    conn.commit()

if reservations_tuples:
    print("   -> Insertando Reservas de Mostrador y Online (CU10/11/12)...", flush=True)
    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO reservations (
            id, tenant_id, branch_id, user_id, visit_date, expires_at, status, total_amount, resolution_note, created_at, updated_at
        ) VALUES %s
        """,
        reservations_tuples,
        page_size=2000
    )
    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO reservation_items (id, tenant_id, reservation_id, variant_id, quantity, unit_price)
        VALUES %s
        """,
        res_items_tuples,
        page_size=2000
    )
    conn.commit()

# --------------------------------------------------------------------------------------
# 7. BALANCE FINAL CONSOLIDADO
# --------------------------------------------------------------------------------------
print("\n" + "=" * 80)
print("BALANCE FINAL CONSOLIDADO EN BASE DE DATOS")
print("=" * 80)

cur.execute("SELECT count(*) FROM sales")
tot_sales = cur.fetchone()[0]
cur.execute("SELECT count(*) FROM sale_items")
tot_items = cur.fetchone()[0]
cur.execute("SELECT count(*) FROM sync_operations")
tot_sync = cur.fetchone()[0]
cur.execute("SELECT count(*) FROM garment_exchanges")
tot_exch = cur.fetchone()[0]
cur.execute("SELECT count(*) FROM garment_returns")
tot_ret = cur.fetchone()[0]
cur.execute("SELECT count(*) FROM orders")
tot_ord = cur.fetchone()[0]
cur.execute("SELECT count(*) FROM reservations")
tot_res = cur.fetchone()[0]
cur.execute("SELECT count(*) FROM products")
tot_prods = cur.fetchone()[0]
cur.execute("SELECT count(*) FROM product_variants")
tot_vars = cur.fetchone()[0]
cur.execute("SELECT count(*) FROM inventory")
tot_inv = cur.fetchone()[0]

print(f"\n📊 TOTALES GENERALES EN BASE DE DATOS:")
print(f"   • Prendas en Catálogo:          {tot_prods:,} productos únicos")
print(f"   • Variantes con Imágenes:       {tot_vars:,} variantes reales de moda")
print(f"   • Registros de Inventario:      {tot_inv:,} posiciones de stock")
print(f"   • Ventas POS Totales:           {tot_sales:,} ventas")
print(f"   • Ítems de Venta Facturados:    {tot_items:,} prendas vendidas")
print(f"   • Operaciones Offline Sync:     {tot_sync:,} registros (sync_operations)")
print(f"   • Cambios por Talla (CU17):     {tot_exch:,} cambios con diferencia paga")
print(f"   • Devoluciones (CU18):          {tot_ret:,} notas de crédito formales")
print(f"   • Pedidos Online Stripe (CU09): {tot_ord:,} despachos con tracking")
print(f"   • Reservas de Mostrador:        {tot_res:,} reservas gestionadas")

print(f"\n🏢 DESGLOSE POR TENANT:")
for c_id, c_name, c_sub in companies:
    cur.execute("SELECT count(*) FROM sales WHERE tenant_id = %s", (c_id,))
    s_cnt = cur.fetchone()[0]
    cur.execute("SELECT coalesce(sum(total_amount), 0) FROM sales WHERE tenant_id = %s AND status = 'completed'", (c_id,))
    rev = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM garment_exchanges WHERE tenant_id = %s", (c_id,))
    ex_cnt = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM garment_returns WHERE tenant_id = %s", (c_id,))
    ret_cnt = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM products WHERE tenant_id = %s", (c_id,))
    p_cnt = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM product_variants WHERE tenant_id = %s", (c_id,))
    v_cnt = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM inventory WHERE tenant_id = %s", (c_id,))
    inv_cnt = cur.fetchone()[0]
    
    print(f"\n   Tenant: '{c_name}' ({c_sub})")
    print(f"     - Prendas en Catálogo: {p_cnt} productos | {v_cnt} variantes | {inv_cnt} stock por sucursal")
    print(f"     - Ventas Registradas:  {s_cnt} ventas")
    print(f"     - Facturación Neta:    Bs {float(rev):,.2f}")
    print(f"     - Cambios de Talla:    {ex_cnt} transacciones (Política 1, abono de diferencia)")
    print(f"     - Devoluciones:        {ret_cnt} transacciones (Política 2, retenciones 20%-50%)")

conn.close()
print("\n" + "=" * 80)
print("🎉 ÉXITO TOTAL: BASE DE DATOS POBLADA CON 3 MESES DE TRÁFICO REALISTA MULTITENANT")
print("=" * 80)
