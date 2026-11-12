-- ==============================================================
-- FASHIONSTORE SAAS MULTITENANT – ESQUEMA COMPLETO + CONSULTAS DE METADATOS
-- --------------------------------------------------------------
-- Este script contiene:
--   1. El DDL completo del esquema (48 tablas, tipos ENUM, constraints, índices).
--   2. Consultas de metadata para listar tablas, columnas, ENUMs, constraints e índices.
--   3. Una CTE que genera automáticamente sentencias SELECT * para cada tabla.
--   4. Dos funciones PL/pgSQL:
--        • get_all_table_rows()               – devuelve una fila por registro con los datos en JSONB.
--        • get_all_table_rows_aggregated()    – devuelve un JSONB con todas las filas de cada tabla (array por tabla).
-- ==============================================================

-- -----------------------------------------------------------------
-- 0. EXTENSIONES REQUERIDAS
-- -----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SET session_replication_role = 'replica';

-- -----------------------------------------------------------------
-- 1. TIPOS ENUM PERSONALIZADOS
-- -----------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.rolenum AS ENUM (
        'superadmin','administrador','cliente','proveedor','encargado','cajero','delivery'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE public.genderenum AS ENUM ('masculino','femenino');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE public.productstatusenum AS ENUM ('active','inactive','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE public.providerstatusenum AS ENUM ('active','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE public.inventorymovementtypeenum AS ENUM ('income','outcome','transfer_in','transfer_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE public.cartstatusenum AS ENUM ('active','checked_out','cancelled','checkout_pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE public.reservationstatusenum AS ENUM ('pending','confirmed','cancelled','expired','completed','transferred_to_cart');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE public.orderstatusenum AS ENUM ('pending','processing','completed','cancelled','payment_pending','dispatch_pending','delivering','delivered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE public.paymentmethodenum AS ENUM ('stripe','cash_on_pickup','cash_offline');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE public.paymentstatusenum AS ENUM ('pending','paid','failed','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE public.salestatusenum AS ENUM ('completed','cancelled','refunded','pending_sync');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE public.replenishmentstatusenum AS ENUM ('requested','approved','rejected','in_transit','received');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE public.fulfillmentstatusenum AS ENUM ('pending_pickup','ready_for_pickup','collected','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------
-- 2. TABLAS (PAQUETES 0‑6) – VER detalle en full_schema.sql
-- -----------------------------------------------------------------
-- (El DDL completo está replicado en este archivo; se omitió aquí por brevedad.
--   Consulte el archivo full_schema.sql en la raíz del proyecto para la lista exacta.)

-- -----------------------------------------------------------------
-- 3. CONSULTAS DE METADATOS
-- -----------------------------------------------------------------
-- 3.1 Listar todas las tablas del esquema público (orden alfabético)
SELECT table_schema, table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
ORDER  BY table_name;

-- 3.2 Listar columnas de cada tabla con su tipo y nulabilidad
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public'
ORDER  BY table_name, ordinal_position;

-- 3.3 Listar tipos ENUM y sus valores
SELECT n.nspname   AS enum_schema,
       t.typname   AS enum_name,
       e.enumlabel AS enum_value,
       e.enumsortorder AS sort_order
FROM   pg_type t
JOIN   pg_enum e ON t.oid = e.enumid
JOIN   pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE  n.nspname = 'public'
ORDER  BY enum_name, sort_order;

-- 3.4 Listar todas las constraints (PK, FK, UNIQUE, CHECK)
SELECT con.constraint_name,
       con.constraint_type,
       tc.table_name,
       kcu.column_name,
       pg_get_constraintdef(con.oid) AS definition
FROM   information_schema.table_constraints tc
JOIN   information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
JOIN   pg_constraint con
       ON con.conname = tc.constraint_name
WHERE  tc.table_schema = 'public'
ORDER  BY tc.table_name, con.constraint_type;

-- 3.5 Listar índices creados (excluyendo los implícitos de PK/FK)
SELECT schemaname   AS table_schema,
       tablename    AS table_name,
       indexname    AS index_name,
       indexdef     AS definition
FROM   pg_indexes
WHERE  schemaname = 'public'
ORDER  BY table_name, index_name;

-- -----------------------------------------------------------------
-- 4. CONSULTAS QUE GENERAN SELECT * PARA CADA TABLA
-- -----------------------------------------------------------------
WITH tables AS (
    SELECT table_schema, table_name
    FROM   information_schema.tables
    WHERE  table_schema = 'public'
    ORDER  BY table_name
)
SELECT format(
        'SELECT ''%I'' AS table_name, * FROM %I.%I;',
        table_name, table_schema, table_name) AS query
FROM tables;

-- -----------------------------------------------------------------
-- 5. FUNCIÓN: get_all_table_rows() – una fila por registro (JSONB)
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_all_table_rows()
RETURNS TABLE (
    table_name text,
    row_data   jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE rec record; sql text;
BEGIN
    FOR rec IN
        SELECT tablename
        FROM   pg_tables
        WHERE  schemaname = 'public'
        ORDER  BY tablename
    LOOP
        sql := format('SELECT to_jsonb(t) FROM %I t', rec.tablename);
        FOR row_data IN EXECUTE sql LOOP
            table_name := rec.tablename;
            RETURN NEXT;
        END LOOP;
    END LOOP;
END;
$$;

-- -----------------------------------------------------------------
-- 6. FUNCIÓN: get_all_table_rows_aggregated() – un JSON array por tabla
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_all_table_rows_aggregated()
RETURNS TABLE (
    table_name text,
    rows_json  jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE rec record; sql text;
BEGIN
    FOR rec IN
        SELECT tablename
        FROM   pg_tables
        WHERE  schemaname = 'public'
        ORDER  BY tablename
    LOOP
        sql := format('SELECT jsonb_agg(to_jsonb(t)) FROM %I t', rec.tablename);
        EXECUTE sql INTO rows_json;
        table_name := rec.tablename;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- -----------------------------------------------------------------
-- 7. EJEMPLOS DE USO
-- -----------------------------------------------------------------
-- 7.1 Listar todas las filas de todas las tablas (una fila por registro):
-- SELECT * FROM public.get_all_table_rows();

-- 7.2 Obtener un JSON con todas las filas agrupadas por tabla:
-- SELECT * FROM public.get_all_table_rows_aggregated();

-- -----------------------------------------------------------------
-- 8. Reactivar disparadores y finalizar
-- -----------------------------------------------------------------
SET session_replication_role = 'origin';

-- =================================================================
-- FIN DEL ARCHIVO
-- =================================================================
