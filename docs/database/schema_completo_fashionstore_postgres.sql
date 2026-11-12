-- ============================================================================
-- FASHIONSTORE SAAS MULTITENANT — ESQUEMA RELACIONAL COMPLETO POSTGRESQL 15+
-- ============================================================================
-- Metodología: ICONIX (UML 2.5) — 28 Casos de Uso / 7 Paquetes de Dominio
-- Servidor: PostgreSQL 15+ (Neon Tech / Cloud Database)
-- Fecha de Generación: 2026-11-08
-- Total Tablas: 48 entidades relacionales con aislamiento estricto por tenant_id
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONES REQUERIDAS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Desactivar temporalmente disparadores durante carga masiva
SET session_replication_role = 'replica';

-- ----------------------------------------------------------------------------
-- 1. TIPOS ENUM PERSONALIZADOS
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.rolenum AS ENUM (
        'superadmin', 'administrador', 'cliente', 'proveedor', 'encargado', 'cajero', 'delivery'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.genderenum AS ENUM ('masculino', 'femenino');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.productstatusenum AS ENUM ('active', 'inactive', 'pending');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.providerstatusenum AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.inventorymovementtypeenum AS ENUM (
        'income', 'outcome', 'transfer_in', 'transfer_out'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.cartstatusenum AS ENUM (
        'active', 'checked_out', 'cancelled', 'checkout_pending'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.reservationstatusenum AS ENUM (
        'pending', 'confirmed', 'cancelled', 'expired', 'completed', 'transferred_to_cart'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.orderstatusenum AS ENUM (
        'pending', 'processing', 'completed', 'cancelled', 'payment_pending', 'dispatch_pending', 'delivering', 'delivered'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.paymentmethodenum AS ENUM ('stripe', 'cash_on_pickup', 'cash_offline');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.paymentstatusenum AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.salestatusenum AS ENUM ('completed', 'cancelled', 'refunded', 'pending_sync');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.replenishmentstatusenum AS ENUM (
        'requested', 'approved', 'rejected', 'in_transit', 'received'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.fulfillmentstatusenum AS ENUM (
        'pending_pickup', 'ready_for_pickup', 'collected', 'expired', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ============================================================================
-- PAQUETE 0: PLATAFORMA SAAS, TENANTS Y SUSCRIPCIONES (CU01, CU02)
-- ============================================================================

-- Tabla 1: Planes de Suscripción Oficiales
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    price_monthly NUMERIC(10,2) NOT NULL,
    price_yearly NUMERIC(10,2),
    max_branches INTEGER NOT NULL DEFAULT 1,
    max_users INTEGER NOT NULL DEFAULT 5,
    max_storage_mb INTEGER NOT NULL DEFAULT 500,
    has_ai_access BOOLEAN NOT NULL DEFAULT false,
    has_custom_domain BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 2: Empresas Contratantes / Tenants (Aislamiento Multitenant)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    business_name VARCHAR(160),
    nit_rut VARCHAR(40) UNIQUE,
    subdomain VARCHAR(64) NOT NULL UNIQUE,
    custom_domain VARCHAR(120) UNIQUE,
    logo_url TEXT,
    primary_color VARCHAR(16),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    email VARCHAR(120),
    phone VARCHAR(40),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 3: Suscripciones de Empresas a Planes
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
    billing_cycle VARCHAR(16) NOT NULL DEFAULT 'monthly',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    stripe_subscription_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- PAQUETE 1: GESTIÓN DE USUARIOS, ROLES, SUCURSALES Y ACCESO (CU03, CU04, CU05)
-- ============================================================================

-- Tabla 4: Sucursales Físicas (Limitadas por cuota de plan del Tenant)
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    address TEXT,
    phone VARCHAR(30),
    opening_hours VARCHAR(100),
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_branches_tenant_id ON public.branches(tenant_id);

-- Tabla 5: Usuarios del Sistema (Globales y Scoped por Tenant)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    gender public.genderenum NOT NULL DEFAULT 'femenino',
    rol public.rolenum NOT NULL DEFAULT 'cliente',
    hashed_password VARCHAR(255) NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS ix_users_branch_id ON public.users(branch_id);

-- Tabla 6: Perfil Antropométrico / Tallas Corporales del Usuario
CREATE TABLE IF NOT EXISTS public.user_body_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    top_size VARCHAR(10),
    bottom_size VARCHAR(10),
    height_cm NUMERIC(5,2),
    weight_kg NUMERIC(5,2),
    bust_cm NUMERIC(5,2),
    waist_cm NUMERIC(5,2),
    hip_cm NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- PAQUETE 2: CATÁLOGO DE PRODUCTOS, VARIANTES Y PRECIOS POR TALLA (CU05, CU06)
-- ============================================================================

-- Tabla 7: Proveedores Textiles
CREATE TABLE IF NOT EXISTS public.providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    business_name VARCHAR(150) NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    status public.providerstatusenum NOT NULL DEFAULT 'active',
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_providers_tenant_id ON public.providers(tenant_id);

-- Tabla 8: Categorías de Prendas
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 9: Tallas Oficiales (XS, S, M, L, XL, 38, 40...)
CREATE TABLE IF NOT EXISTS public.sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 10: Colores y Códigos HEX
CREATE TABLE IF NOT EXISTS public.colors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    hex_code VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 11: Temporadas de Moda (Otoño-Invierno, Primavera-Verano)
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 12: Colecciones
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 13: Prendas Base (Catálogo Maestro)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20),
    discount_value NUMERIC(10,2),
    provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_products_tenant_id ON public.products(tenant_id);

-- Tabla 14: Variantes SKU de Prenda (Talla, Color, Precio Específico y Puntos de Prenda)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL UNIQUE,
    price NUMERIC(10,2) NOT NULL,
    original_price NUMERIC(10,2),
    discount_amount NUMERIC(10,2) DEFAULT 0.00,
    size_id UUID REFERENCES public.sizes(id) ON DELETE RESTRICT,
    color_id UUID REFERENCES public.colors(id) ON DELETE RESTRICT,
    image_url TEXT,
    image_public_id VARCHAR(255),
    garment_points JSONB,
    status public.productstatusenum NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_product_variant_size_color UNIQUE (product_id, size_id, color_id)
);
CREATE INDEX IF NOT EXISTS ix_product_variants_sku ON public.product_variants(sku);

-- Tabla 15: Disponibilidad de Variantes en Proveedores
CREATE TABLE IF NOT EXISTS public.provider_variant_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_provider_variant UNIQUE (provider_id, variant_id)
);

-- Tabla 16: Caché de Catálogo Local / PWA Sync (CU07)
CREATE TABLE IF NOT EXISTS public.catalog_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    version_hash VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- PAQUETE 3: INVENTARIO, DISPONIBILIDAD, KARDEX Y TRANSFERENCIAS (CU08, CU11)
-- ============================================================================

-- Tabla 17: Inventario Físico por Sucursal y Variante (Bloqueo Atómico con with_for_update)
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    minimum_stock INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_inventory_branch_variant UNIQUE (branch_id, variant_id),
    CONSTRAINT chk_inventory_reserved_lte_qty CHECK (reserved_quantity <= quantity)
);
CREATE INDEX IF NOT EXISTS ix_inventory_branch_variant ON public.inventory(branch_id, variant_id);

-- Tabla 18: Movimientos de Inventario (Kardex Auditado)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    movement_type public.inventorymovementtypeenum NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    balance_after INTEGER NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 19: Transferencias de Inventario Inter-Sucursal (CU11)
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    transfer_number VARCHAR(50) NOT NULL,
    from_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    to_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'EN_TRANSITO',
    requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    received_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_transfer_different_branches CHECK (from_branch_id != to_branch_id),
    CONSTRAINT chk_transfer_status CHECK (status IN ('SOLICITADO', 'EN_TRANSITO', 'COMPLETADO', 'CANCELADO'))
);
CREATE INDEX IF NOT EXISTS ix_inventory_transfers_tenant ON public.inventory_transfers(tenant_id);

-- Tabla 20: Ítems de Transferencia Inter-Sucursal
CREATE TABLE IF NOT EXISTS public.inventory_transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES public.inventory_transfers(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    received_quantity INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 21: Solicitudes de Reposición a Proveedores
CREATE TABLE IF NOT EXISTS public.replenishment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    status public.replenishmentstatusenum NOT NULL DEFAULT 'requested',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 22: Ítems de Solicitud de Reposición
CREATE TABLE IF NOT EXISTS public.replenishment_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.replenishment_requests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0)
);


-- ============================================================================
-- PAQUETE 4: CARROS, STRIPE Y RESERVAS ONLINE/OFFLINE (CU09, CU10, CU11, CU12)
-- ============================================================================

-- Tabla 23: Carritos de Compra
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    status public.cartstatusenum NOT NULL DEFAULT 'active',
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 24: Ítems del Carrito
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 25: Reservas de Prendas (Vencimiento de 48h, Transferencia a Carrito y Conflictos)
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_code VARCHAR(32) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    status public.reservationstatusenum NOT NULL DEFAULT 'confirmed',
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    expires_at TIMESTAMPTZ NOT NULL,
    transferred_to_cart_id UUID REFERENCES public.carts(id) ON DELETE SET NULL,
    transfer_status VARCHAR(30),
    transferred_at TIMESTAMPTZ,
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_reservations_tenant_id ON public.reservations(tenant_id);
CREATE INDEX IF NOT EXISTS ix_reservations_expires_at ON public.reservations(expires_at);

-- Tabla 26: Ítems de Reserva
CREATE TABLE IF NOT EXISTS public.reservation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_reservation_items_tenant_id ON public.reservation_items(tenant_id);

-- Tabla 27: Órdenes de Compra Online (Despacho Condicionado a Pago Confirmado)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(32) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    status public.orderstatusenum NOT NULL DEFAULT 'pending',
    payment_method public.paymentmethodenum NOT NULL DEFAULT 'stripe',
    payment_status public.paymentstatusenum NOT NULL DEFAULT 'pending',
    delivery_mode VARCHAR(20) NOT NULL DEFAULT 'PICKUP',
    delivery_address TEXT,
    delivery_phone VARCHAR(30),
    delivery_latitude NUMERIC(10,8),
    delivery_longitude NUMERIC(11,8),
    subtotal NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10,2) NOT NULL,
    stripe_session_id VARCHAR(120),
    stripe_payment_intent VARCHAR(120),
    payment_due_at TIMESTAMPTZ,
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_orders_tenant_id ON public.orders(tenant_id);

-- Tabla 28: Ítems de la Orden
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 29: Intentos de Pago
CREATE TABLE IF NOT EXISTS public.payment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL DEFAULT 'stripe',
    transaction_id VARCHAR(120),
    status VARCHAR(30) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'usd',
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 30: Registro de Eventos Webhook de Stripe
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(120) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 31: Códigos de Descuento Promocional
CREATE TABLE IF NOT EXISTS public.promotion_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_promotion_codes_tenant_id ON public.promotion_codes(tenant_id);

-- Tabla 32: Usos de Códigos Promocionales
CREATE TABLE IF NOT EXISTS public.promotion_code_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_code_id UUID NOT NULL REFERENCES public.promotion_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_promotion_code_usages_tenant_id ON public.promotion_code_usages(tenant_id);


-- ============================================================================
-- PAQUETE 5: VENTAS POS, SYNC IDEMPOTENTE, CAMBIOS Y DEVOLUCIONES (CU13–CU18)
-- ============================================================================

-- Tabla 33: Ventas POS (Físicas y Desconectadas Offline en Efectivo con UUIDv4)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_code VARCHAR(32) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    cashier_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    status public.salestatusenum NOT NULL DEFAULT 'completed',
    payment_method VARCHAR(30) NOT NULL DEFAULT 'cash',
    cash_received NUMERIC(10,2),
    change_amount NUMERIC(10,2),
    subtotal NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10,2) NOT NULL,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
    client_sale_id UUID UNIQUE,
    is_offline BOOLEAN NOT NULL DEFAULT false,
    synced_at TIMESTAMPTZ,
    idempotency_key VARCHAR(100),
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_sales_tenant_id ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS ix_sales_client_sale_id ON public.sales(client_sale_id);

-- Tabla 34: Ítems de la Venta
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_sale_items_tenant_id ON public.sale_items(tenant_id);

-- Tabla 35: Bandeja Local de Operaciones Offline (CU14)
CREATE TABLE IF NOT EXISTS public.offline_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,
    operation_type VARCHAR(32) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    synced_at TIMESTAMPTZ
);

-- Tabla 36: Sincronización Idempotente Central (CU15: sync_operations)
CREATE TABLE IF NOT EXISTS public.sync_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    client_operation_id VARCHAR(100) NOT NULL UNIQUE,
    operation_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PROCESADO',
    synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_sync_operations_tenant_id ON public.sync_operations(tenant_id);
CREATE INDEX IF NOT EXISTS ix_sync_operations_client_op_id ON public.sync_operations(client_operation_id);

-- Tabla 37: Cambios de Prenda (CU17 / Política 1: Cobro Obligatorio de Diferencia por Talla)
CREATE TABLE IF NOT EXISTS public.garment_exchanges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    cashier_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
    original_variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    new_variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    price_difference NUMERIC(10,2) NOT NULL,
    difference_paid BOOLEAN NOT NULL DEFAULT false,
    payment_method VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_garment_exchanges_tenant_id ON public.garment_exchanges(tenant_id);
CREATE INDEX IF NOT EXISTS ix_garment_exchanges_sale_id ON public.garment_exchanges(sale_id);

-- Tabla 38: Devoluciones de Prenda (CU18 / Política 2: Retención 20%-50% y Nota de Crédito)
CREATE TABLE IF NOT EXISTS public.garment_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    cashier_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    original_item_amount NUMERIC(10,2) NOT NULL,
    retention_percentage NUMERIC(5,2) NOT NULL,
    retention_amount NUMERIC(10,2) NOT NULL,
    refund_amount NUMERIC(10,2) NOT NULL,
    refund_method VARCHAR(30) NOT NULL,
    credit_note_code VARCHAR(64) UNIQUE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_garment_returns_tenant_id ON public.garment_returns(tenant_id);
CREATE INDEX IF NOT EXISTS ix_garment_returns_credit_note ON public.garment_returns(credit_note_code);


-- ============================================================================
-- PAQUETE 6: INTELIGENCIA ARTIFICIAL, RAG, NOTIFICACIONES Y ML (CU21–CU28)
-- ============================================================================

-- Tabla 39: Conversaciones de Chatbot / Asistente Virtual Gemini (RAG con Voz)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_conversations_tenant_id ON public.conversations(tenant_id);

-- Tabla 40: Mensajes de la Conversación
CREATE TABLE IF NOT EXISTS public.conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    audio_url TEXT,
    tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_conversation_messages_tenant_id ON public.conversation_messages(tenant_id);

-- Tabla 41: Dispositivos Registrados para Notificaciones Push (Firebase FCM)
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL DEFAULT 'android',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 42: Notificaciones Push Emitidas
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 43: Interacciones Usuario-Prenda para Recomendaciones
CREATE TABLE IF NOT EXISTS public.user_product_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    interaction_type VARCHAR(30) NOT NULL,
    weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 44: Embeddings y Factores Colaborativos Entrenados (Implicit ALS)
CREATE TABLE IF NOT EXISTS public.collaborative_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(20) NOT NULL,
    entity_id UUID NOT NULL,
    embedding JSONB NOT NULL,
    model_version VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla 45: Registro de Modelos de Machine Learning (Supervisados y No Supervisados)
CREATE TABLE IF NOT EXISTS public.ml_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    version VARCHAR(30) NOT NULL,
    metrics JSONB NOT NULL,
    model_path VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    trained_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ml_models_tenant_id ON public.ml_models(tenant_id);

-- Tabla 46: Pronósticos de Demanda Supervisada (RandomForest / GradientBoosting)
CREATE TABLE IF NOT EXISTS public.demand_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    forecast_period VARCHAR(30) NOT NULL,
    predicted_units INTEGER NOT NULL,
    confidence_lower INTEGER,
    confidence_upper INTEGER,
    algorithm_used VARCHAR(50) NOT NULL DEFAULT 'RandomForestRegressor',
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_demand_forecasts_tenant_id ON public.demand_forecasts(tenant_id);
CREATE INDEX IF NOT EXISTS ix_demand_forecasts_variant_id ON public.demand_forecasts(variant_id);

-- Tabla 47: Segmentación de Clientes No Supervisada (K-Means Clustering RFM)
CREATE TABLE IF NOT EXISTS public.customer_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    cluster_id INTEGER NOT NULL,
    segment_label VARCHAR(64) NOT NULL,
    recency_days INTEGER,
    frequency_count INTEGER,
    monetary_total NUMERIC(10,2),
    return_rate NUMERIC(5,2),
    assigned_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_customer_segments_tenant_id ON public.customer_segments(tenant_id);
CREATE INDEX IF NOT EXISTS ix_customer_segments_user_id ON public.customer_segments(user_id);


-- ============================================================================
-- CONTROL DE MIGRACIONES DE ALEMBIC
-- ============================================================================

-- Tabla 48: Historial de Versión de Esquema
CREATE TABLE IF NOT EXISTS public.alembic_version (
    version_num VARCHAR(32) PRIMARY KEY
);
INSERT INTO public.alembic_version (version_num) 
VALUES ('0044')
ON CONFLICT (version_num) DO NOTHING;

-- Reactivar chequeos de disparadores
SET session_replication_role = 'origin';

-- ============================================================================
-- FIN DEL ESQUEMA DDL COMPLETO (48 TABLAS)
-- ============================================================================

