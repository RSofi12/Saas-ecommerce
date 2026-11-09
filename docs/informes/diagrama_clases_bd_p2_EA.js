// ============================================================================
// Diagrama de Clases UML Conceptual y Dominio para Enterprise Architect — JScript
// FashionStore — Plataforma SaaS Multitenant (2do Parcial)
//
// CARACTERÍSTICAS UML 2.5+:
//   - 52 Clases de Dominio (47 tablas de backend + 5 roles conceptuales).
//   - SIN CLAVES FORÁNEAS (FK) en los atributos: En UML conceptual puro, las
//     asociaciones representan las referencias; las FKs no se duplican como columnas.
//   - 10 Clases Asociación NATIVAS («association class»): Vinculadas mediante
//     la arquitectura interna de Enterprise Architect (NType = 17 y PDATA1) que
//     dibuja la línea punteada reglamentaria de la clase asociación sobre el conector.
//   - 5 Relaciones de COMPOSICIÓN FUERTE («Association» con ClientEnd.Aggregation = 2, rombo negro).
//   - 5 Relaciones de AGREGACIÓN COMPARTIDA («Association» con ClientEnd.Aggregation = 1, rombo blanco).
//   - 6 Relaciones de HERENCIA / GENERALIZACIÓN («Generalization», triángulo blanco en el padre).
//   - 74 Asociaciones estándar con multiplicidades explícitas.
//   - Geometría compacta (175 x 115 px) en grilla matricial de 6 columnas.
// ============================================================================

var Repo = (typeof Repository != "undefined") ? Repository : null;
if (Repo == null) {
    var eaApp = new ActiveXObject("EA.App");
    Repo = eaApp.Repository;
}

function Log(msg) {
    try { Session.Output("[FashionStore-EA] " + msg); } catch (e) { WScript.Echo(msg); }
}

// ---------------------------------------------------------------------------
// Mapeo de tipos de datos a tipos nativos de Enterprise Architect
// ---------------------------------------------------------------------------
function eaType(sqlType) {
    var t = (sqlType + "").toLowerCase();
    if (t.indexOf("uuid") >= 0) return "Guid";
    if (t.indexOf("boolean") >= 0) return "Boolean";
    if (t.indexOf("integer") >= 0 || t.indexOf("serial") >= 0) return "Integer";
    if (t.indexOf("numeric") >= 0 || t.indexOf("decimal") >= 0 || t.indexOf("money") >= 0) return "Currency";
    if (t.indexOf("timestamp") >= 0 || t.indexOf("datetime") >= 0 || t.indexOf("date") >= 0) return "Date";
    if (t.indexOf("json") >= 0) return "String";
    if (t.indexOf("text") >= 0 || t.indexOf("character") >= 0 || t.indexOf("char") >= 0 || t.indexOf("varchar") >= 0) return "String";
    return "String";
}

// ---------------------------------------------------------------------------
// 1. CLASES ASOCIACIÓN NATIVAS DE ENTERPRISE ARCHITECT
// [NombreClaseAsoc, ClaseOrigen, ClaseDestino, VerboAsociacion, CardOrigen, CardDestino]
// ---------------------------------------------------------------------------
var CLASES_ASOCIACION = [
    ["provider_variant_availability", "providers", "product_variants", "abastece_variante", "0..*", "0..*"],
    ["inventory", "branches", "product_variants", "almacena_stock", "0..*", "0..*"],
    ["sale_items", "sales", "product_variants", "vende_item", "1", "1..*"],
    ["order_items", "orders", "product_variants", "factura_item", "1", "1..*"],
    ["cart_items", "carts", "product_variants", "agrega_item", "0..1", "0..*"],
    ["reservation_items", "reservations", "product_variants", "reserva_item", "0..*", "1..*"],
    ["inventory_transfer_items", "inventory_transfers", "product_variants", "traslada_item", "1", "1..*"],
    ["replenishment_request_items", "replenishment_requests", "product_variants", "solicita_item", "1", "1..*"],
    ["promotion_code_usages", "promotion_codes", "users", "canjeado_por", "0..*", "0..*"],
    ["user_product_interactions", "users", "products", "interactua_con", "0..*", "0..*"]
];

// ---------------------------------------------------------------------------
// 2. RELACIONES ESTÁNDAR: [Origen, Destino, Verbo, CardOrigen, CardDestino, TipoRelacion]
// TipoRelacion: "Composition", "Aggregation", "Generalization", "Association"
// ---------------------------------------------------------------------------
var RELACIONES = [
    ["companies", "subscriptions", "posee_suscripciones", "1", "1..*", "Composition"],
    ["products", "product_variants", "compone_variantes", "1", "1..*", "Composition"],
    ["users", "user_body_profiles", "posee_perfil_medidas", "1", "0..1", "Composition"],
    ["conversations", "conversation_messages", "contiene_mensajes", "1", "0..*", "Composition"],
    ["companies", "catalog_cache", "cache_snapshot", "1", "0..1", "Composition"],
    ["companies", "branches", "red_sucursales", "1", "1..*", "Aggregation"],
    ["companies", "users", "emplea_personal", "1", "1..*", "Aggregation"],
    ["seasons", "collections", "agrupa_colecciones", "1", "0..*", "Aggregation"],
    ["categories", "products", "clasifica_prendas", "1", "0..*", "Aggregation"],
    ["collections", "products", "asocia_prendas", "0..1", "0..*", "Aggregation"],
    ["providers", "users", "", "", "", "Generalization"],
    ["Superadministrador", "users", "", "", "", "Generalization"],
    ["AdministradorTenant", "users", "", "", "", "Generalization"],
    ["EncargadoSucursal", "users", "", "", "", "Generalization"],
    ["Cajero", "users", "", "", "", "Generalization"],
    ["Cliente", "users", "", "", "", "Generalization"],
    ["subscriptions", "plans", "asigna_plan", "0..*", "1", "Association"],
    ["branches", "companies", "pertenece_a_tenant", "0..*", "1", "Association"],
    ["users", "companies", "pertenece_a_tenant", "0..*", "1", "Association"],
    ["products", "companies", "propiedad_de_tenant", "0..*", "1", "Association"],
    ["product_variants", "companies", "es_de_tenant", "0..*", "1", "Association"],
    ["inventory_transfers", "companies", "traspaso_de_tenant", "0..*", "1", "Association"],
    ["offline_operations", "companies", "audita_offline", "0..*", "1", "Association"],
    ["users", "branches", "asignado_a", "0..*", "0..1", "Association"],
    ["products", "providers", "abastecido_por", "0..*", "0..1", "Association"],
    ["product_variants", "sizes", "tiene_talla", "0..*", "1", "Association"],
    ["product_variants", "colors", "tiene_color", "0..*", "1", "Association"],
    ["inventory_movements", "product_variants", "afecta_stock_de", "0..*", "1", "Association"],
    ["inventory_movements", "branches", "se_ejecuta_en", "0..*", "1", "Association"],
    ["inventory_movements", "branches", "transfiere_a", "0..*", "0..1", "Association"],
    ["inventory_movements", "users", "registrado_por", "0..*", "0..1", "Association"],
    ["inventory_transfers", "branches", "sale_de_sucursal", "0..*", "1", "Association"],
    ["inventory_transfers", "branches", "llega_a_sucursal", "0..*", "1", "Association"],
    ["inventory_transfers", "users", "solicitado_por", "0..*", "1", "Association"],
    ["inventory_transfers", "users", "recibido_por", "0..*", "0..1", "Association"],
    ["offline_operations", "branches", "ejecuta_en_sucursal", "0..*", "0..1", "Association"],
    ["replenishment_requests", "providers", "solicita_a_proveedor", "0..*", "1", "Association"],
    ["replenishment_requests", "branches", "destina_a_sucursal", "0..*", "1", "Association"],
    ["replenishment_requests", "users", "solicitado_por", "0..*", "1", "Association"],
    ["replenishment_requests", "users", "aceptado_por", "0..*", "0..1", "Association"],
    ["replenishment_requests", "users", "preparado_por", "0..*", "0..1", "Association"],
    ["replenishment_requests", "users", "recibido_por", "0..*", "0..1", "Association"],
    ["replenishment_requests", "users", "entregado_por", "0..*", "0..1", "Association"],
    ["carts", "users", "posee_carrito", "0..1", "1", "Association"],
    ["carts", "promotion_codes", "aplica_cupon", "0..*", "0..1", "Association"],
    ["reservations", "branches", "se_solicita_en", "0..*", "1", "Association"],
    ["reservations", "users", "es_solicitada_por", "0..*", "1", "Association"],
    ["reservations", "users", "resuelta_por", "0..*", "0..1", "Association"],
    ["reservations", "carts", "proviene_de_carrito", "0..1", "0..1", "Association"],
    ["promotion_codes", "branches", "es_valido_en", "0..*", "0..1", "Association"],
    ["promotion_codes", "users", "creado_por", "0..*", "1", "Association"],
    ["orders", "users", "realiza_pedido", "0..*", "1", "Association"],
    ["orders", "promotion_codes", "aplica_descuento", "0..*", "0..1", "Association"],
    ["orders", "branches", "recoge_en", "0..*", "0..1", "Association"],
    ["orders", "users", "despachado_por", "0..*", "0..1", "Association"],
    ["payment_attempts", "orders", "procesa_pago_de", "0..*", "0..1", "Association"],
    ["payment_attempts", "carts", "valida_pago_carrito", "0..*", "0..1", "Association"],
    ["sales", "branches", "se_registra_en", "0..*", "1", "Association"],
    ["sales", "users", "atendida_por", "0..*", "1", "Association"],
    ["sales", "reservations", "convierte_reserva", "0..*", "0..1", "Association"],
    ["garment_exchanges", "sales", "cambia_prenda_de_venta", "0..*", "1", "Association"],
    ["garment_exchanges", "branches", "opera_en_sucursal", "0..*", "1", "Association"],
    ["garment_exchanges", "users", "atendido_por_cajero", "0..*", "1", "Association"],
    ["garment_exchanges", "product_variants", "prenda_original", "0..*", "1", "Association"],
    ["garment_exchanges", "product_variants", "prenda_nueva", "0..*", "1", "Association"],
    ["garment_exchanges", "companies", "pertenece_a_tenant", "0..*", "1", "Association"],
    ["garment_returns", "sales", "devuelve_prenda_de_venta", "0..*", "1", "Association"],
    ["garment_returns", "branches", "opera_en_sucursal", "0..*", "1", "Association"],
    ["garment_returns", "users", "atendido_por_cajero", "0..*", "1", "Association"],
    ["garment_returns", "product_variants", "reincorpora_prenda", "0..*", "1", "Association"],
    ["garment_returns", "companies", "pertenece_a_tenant", "0..*", "1", "Association"],
    ["sync_operations", "companies", "sincroniza_tenant", "0..*", "1", "Association"],
    ["sync_operations", "branches", "sincroniza_sucursal", "0..*", "0..1", "Association"],
    ["customer_segments", "companies", "segmenta_tenant", "0..*", "1", "Association"],
    ["customer_segments", "users", "segmenta_usuario", "0..*", "1", "Association"],
    ["demand_forecasts", "companies", "pronostico_tenant", "0..*", "1", "Association"],
    ["demand_forecasts", "branches", "pronostico_sucursal", "0..*", "1", "Association"],
    ["demand_forecasts", "product_variants", "pronostico_variante", "0..*", "1", "Association"],
    ["ml_models", "companies", "modelo_de_tenant", "0..*", "1", "Association"],
    ["conversations", "users", "iniciada_por", "0..*", "1", "Association"],
    ["conversations", "companies", "tenant_chat", "0..*", "1", "Association"],
    ["conversation_messages", "companies", "tenant_mensaje", "0..*", "1", "Association"],
    ["notifications", "users", "notifica_a_usuario", "0..*", "1", "Association"],
    ["device_tokens", "users", "dispositivo_de_usuario", "0..*", "1", "Association"]
];

// ---------------------------------------------------------------------------
// 3. CLASES Y ATRIBUTOS (SIN ATRIBUTOS FORÁNEOS 'FK')
// Total: 52 entidades conceptuales con PK, enums y atributos intrínsecos.
// ---------------------------------------------------------------------------
var TABLAS = [
    ["companies", [
        ["id", "UUID", "PK"], ["name", "VARCHAR(150)", null], ["business_name", "VARCHAR(200)", null], ["nit_rut", "VARCHAR(50)", null], ["subdomain", "VARCHAR(63)", null], ["status", "VARCHAR(20)", "enum"], ["email", "VARCHAR(120)", null], ["phone", "VARCHAR(30)", null], ["created_at", "TIMESTAMP", null], ["updated_at", "TIMESTAMP", null]
    ], "table"],
    ["plans", [
        ["id", "UUID", "PK"], ["name", "VARCHAR(50)", null], ["code", "VARCHAR(30)", null], ["description", "TEXT", null], ["max_branches", "INTEGER", null], ["has_ai_access", "BOOLEAN", null], ["price_monthly", "NUMERIC(10,2)", null], ["is_active", "BOOLEAN", null], ["created_at", "TIMESTAMP", null], ["updated_at", "TIMESTAMP", null]
    ], "table"],
    ["subscriptions", [
        ["id", "UUID", "PK"], ["status", "VARCHAR(20)", "enum"], ["start_date", "TIMESTAMP", null], ["end_date", "TIMESTAMP", null], ["created_at", "TIMESTAMP", null], ["updated_at", "TIMESTAMP", null]
    ], "table"],
    ["catalog_cache", [
        ["id", "UUID", "PK"], ["version", "INTEGER", null], ["payload", "JSON", null], ["cached_at", "TIMESTAMP", null]
    ], "table"],
    ["users", [
        ["id", "UUID", "PK"], ["name", "VARCHAR(100)", null], ["email", "VARCHAR(120)", null], ["hashed_password", "VARCHAR(255)", null], ["gender", "VARCHAR(20)", null], ["rol", "VARCHAR(30)", "enum"], ["is_active", "BOOLEAN", null], ["created_at", "TIMESTAMP", null]
    ], "table"],
    ["branches", [
        ["id", "UUID", "PK"], ["name", "VARCHAR(100)", null], ["city", "VARCHAR(100)", null], ["address", "VARCHAR(255)", null], ["phone", "VARCHAR(30)", null], ["opening_hours", "VARCHAR(100)", null], ["latitude", "NUMERIC(10,7)", null], ["longitude", "NUMERIC(10,7)", null], ["is_default", "BOOLEAN", null], ["is_active", "BOOLEAN", null], ["created_at", "TIMESTAMP", null], ["updated_at", "TIMESTAMP", null]
    ], "table"],
    ["providers", [
        ["id", "UUID", "PK"], ["business_name", "VARCHAR(150)", null], ["contact_name", "VARCHAR(100)", null], ["phone", "VARCHAR(30)", null], ["status", "VARCHAR(20)", "enum"]
    ], "table"],
    ["user_body_profiles", [
        ["id", "UUID", "PK"], ["top_size", "VARCHAR(20)", null], ["bottom_size", "VARCHAR(20)", null], ["shoe_size", "VARCHAR(20)", null], ["body_shape", "VARCHAR(50)", null], ["fit_preference", "VARCHAR(50)", null], ["notes", "TEXT", null]
    ], "table"],
    ["Superadministrador", [
        ["permisos_globales", "String", null], ["audita_tenants", "Boolean", null]
    ], "role"],
    ["AdministradorTenant", [
        ["cargo_empresa", "String", null], ["gestiona_sucursales", "Boolean", null]
    ], "role"],
    ["EncargadoSucursal", [
        ["codigo_empleado", "String", null], ["turno", "String", null]
    ], "role"],
    ["Cajero", [
        ["numero_caja", "String", null], ["limite_efectivo", "Currency", null]
    ], "role"],
    ["Cliente", [
        ["puntos_fidelidad", "Integer", null], ["preferencia_notificacion", "String", null]
    ], "role"],
    ["provider_variant_availability", [
        ["id", "UUID", "PK"], ["quantity", "INTEGER", null]
    ], "association class"],
    ["categories", [
        ["id", "UUID", "PK"], ["name", "VARCHAR(100)", null]
    ], "table"],
    ["seasons", [
        ["id", "UUID", "PK"], ["name", "VARCHAR(50)", null]
    ], "table"],
    ["collections", [
        ["id", "UUID", "PK"], ["name", "VARCHAR(100)", null]
    ], "table"],
    ["sizes", [
        ["id", "UUID", "PK"], ["name", "VARCHAR(20)", null]
    ], "table"],
    ["colors", [
        ["id", "UUID", "PK"], ["name", "VARCHAR(50)", null], ["hex_code", "VARCHAR(7)", null]
    ], "table"],
    ["products", [
        ["id", "UUID", "PK"], ["name", "VARCHAR(150)", null], ["description", "TEXT", null], ["discount_type", "VARCHAR(20)", "enum"], ["discount_value", "NUMERIC(10,2)", null]
    ], "table"],
    ["product_variants", [
        ["id", "UUID", "PK"], ["sku", "VARCHAR(60)", null], ["price", "NUMERIC(10,2)", null], ["image_url", "VARCHAR(255)", null], ["garment_points", "INTEGER", null], ["status", "VARCHAR(20)", "enum"]
    ], "table"],
    ["inventory", [
        ["id", "UUID", "PK"], ["quantity", "INTEGER", null], ["reserved_quantity", "INTEGER", null], ["minimum_stock", "INTEGER", null]
    ], "association class"],
    ["inventory_movements", [
        ["id", "UUID", "PK"], ["movement_type", "VARCHAR(20)", "enum"], ["quantity", "INTEGER", null], ["note", "VARCHAR(255)", null], ["created_at", "TIMESTAMP", null]
    ], "table"],
    ["inventory_transfers", [
        ["id", "UUID", "PK"], ["transfer_number", "VARCHAR(50)", null], ["status", "VARCHAR(20)", "enum"], ["requested_at", "TIMESTAMP", null], ["received_at", "TIMESTAMP", null], ["notes", "TEXT", null], ["created_at", "TIMESTAMP", null], ["updated_at", "TIMESTAMP", null]
    ], "table"],
    ["inventory_transfer_items", [
        ["id", "UUID", "PK"], ["quantity", "INTEGER", null], ["received_quantity", "INTEGER", null], ["created_at", "TIMESTAMP", null]
    ], "association class"],
    ["replenishment_requests", [
        ["id", "UUID", "PK"], ["status", "VARCHAR(20)", "enum"], ["accepted_at", "TIMESTAMP", null], ["preparing_at", "TIMESTAMP", null], ["awaiting_receipt_at", "TIMESTAMP", null], ["delivered_at", "TIMESTAMP", null], ["created_at", "TIMESTAMP", null], ["updated_at", "TIMESTAMP", null]
    ], "table"],
    ["replenishment_request_items", [
        ["id", "UUID", "PK"], ["requested_quantity", "INTEGER", null]
    ], "association class"],
    ["offline_operations", [
        ["id", "UUID", "PK"], ["operation_type", "VARCHAR(30)", null], ["payload", "JSON", null], ["synced", "BOOLEAN", null], ["created_at", "TIMESTAMP", null], ["synced_at", "TIMESTAMP", null]
    ], "table"],
    ["carts", [
        ["id", "UUID", "PK"], ["status", "VARCHAR(20)", "enum"], ["subtotal", "NUMERIC(10,2)", null], ["discount_amount", "NUMERIC(10,2)", null], ["total_amount", "NUMERIC(10,2)", null], ["created_at", "TIMESTAMP", null], ["updated_at", "TIMESTAMP", null]
    ], "table"],
    ["cart_items", [
        ["id", "UUID", "PK"], ["quantity", "INTEGER", null], ["unit_price", "NUMERIC(10,2)", null]
    ], "association class"],
    ["reservations", [
        ["id", "UUID", "PK"], ["visit_date", "DATE", null], ["expires_at", "TIMESTAMP", null], ["status", "VARCHAR(20)", "enum"], ["total_amount", "NUMERIC(10,2)", null], ["resolved_at", "TIMESTAMP", null], ["resolution_note", "VARCHAR(255)", null], ["created_at", "TIMESTAMP", null], ["updated_at", "TIMESTAMP", null]
    ], "table"],
    ["reservation_items", [
        ["id", "UUID", "PK"], ["quantity", "INTEGER", null], ["unit_price", "NUMERIC(10,2)", null]
    ], "association class"],
    ["promotion_codes", [
        ["id", "UUID", "PK"], ["code", "VARCHAR(30)", null], ["discount_type", "VARCHAR(20)", "enum"], ["discount_value", "NUMERIC(10,2)", null], ["valid_from", "TIMESTAMP", null], ["valid_until", "TIMESTAMP", null], ["is_active", "BOOLEAN", null], ["created_at", "TIMESTAMP", null]
    ], "table"],
    ["promotion_code_usages", [
        ["id", "UUID", "PK"], ["used_at", "TIMESTAMP", null]
    ], "association class"],
    ["orders", [
        ["id", "UUID", "PK"], ["status", "VARCHAR(20)", "enum"], ["payment_method", "VARCHAR(20)", "enum"], ["payment_status", "VARCHAR(20)", "enum"], ["cash_reference", "VARCHAR(50)", null], ["pickup_expires_at", "TIMESTAMP", null], ["pickup_code", "VARCHAR(20)", null], ["fulfillment_status", "VARCHAR(20)", "enum"], ["delivery_type", "VARCHAR(20)", "enum"], ["shipping_address", "TEXT", null], ["tracking_number", "VARCHAR(100)", null], ["dispatched_at", "TIMESTAMP", null], ["subtotal", "NUMERIC(10,2)", null], ["discount_amount", "NUMERIC(10,2)", null], ["total_amount", "NUMERIC(10,2)", null], ["currency", "VARCHAR(10)", null], ["created_at", "TIMESTAMP", null], ["updated_at", "TIMESTAMP", null]
    ], "table"],
    ["order_items", [
        ["id", "UUID", "PK"], ["quantity", "INTEGER", null], ["unit_price", "NUMERIC(10,2)", null], ["line_total", "NUMERIC(10,2)", null], ["product_name", "VARCHAR(150)", null], ["variant_sku", "VARCHAR(60)", null], ["image_url", "VARCHAR(255)", null]
    ], "association class"],
    ["payment_attempts", [
        ["id", "UUID", "PK"], ["status", "VARCHAR(20)", "enum"], ["idempotency_key", "VARCHAR(100)", null], ["created_at", "TIMESTAMP", null], ["updated_at", "TIMESTAMP", null]
    ], "table"],
    ["stripe_events", [
        ["id", "UUID", "PK"], ["created_at", "TIMESTAMP", null]
    ], "table"],
    ["sales", [
        ["id", "UUID", "PK"], ["is_offline", "BOOLEAN", null], ["synced_at", "TIMESTAMP", null], ["idempotency_key", "VARCHAR(100)", null], ["status", "VARCHAR(20)", "enum"], ["payment_method", "VARCHAR(20)", "enum"], ["payment_status", "VARCHAR(20)", "enum"], ["cash_reference", "VARCHAR(50)", null], ["subtotal", "NUMERIC(10,2)", null], ["discount_amount", "NUMERIC(10,2)", null], ["total_amount", "NUMERIC(10,2)", null], ["currency", "VARCHAR(10)", null], ["created_at", "TIMESTAMP", null], ["updated_at", "TIMESTAMP", null]
    ], "table"],
    ["sale_items", [
        ["id", "UUID", "PK"], ["quantity", "INTEGER", null], ["unit_price", "NUMERIC(10,2)", null], ["line_total", "NUMERIC(10,2)", null], ["product_name", "VARCHAR(150)", null], ["variant_sku", "VARCHAR(60)", null], ["image_url", "VARCHAR(255)", null]
    ], "association class"],
    ["garment_exchanges", [
        ["id", "UUID", "PK"], ["price_difference", "NUMERIC(10,2)", null], ["difference_paid", "BOOLEAN", null], ["payment_method", "VARCHAR(20)", "enum"], ["status", "VARCHAR(20)", "enum"], ["notes", "TEXT", null], ["created_at", "TIMESTAMP", null]
    ], "table"],
    ["garment_returns", [
        ["id", "UUID", "PK"], ["quantity", "INTEGER", null], ["original_item_amount", "NUMERIC(10,2)", null], ["retention_percentage", "NUMERIC(5,2)", null], ["retention_amount", "NUMERIC(10,2)", null], ["refund_amount", "NUMERIC(10,2)", null], ["refund_method", "VARCHAR(20)", "enum"], ["credit_note_code", "VARCHAR(50)", null], ["reason", "VARCHAR(255)", null], ["created_at", "TIMESTAMP", null]
    ], "table"],
    ["sync_operations", [
        ["id", "UUID", "PK"], ["operation_type", "VARCHAR(30)", null], ["payload", "JSON", null], ["status", "VARCHAR(20)", "enum"], ["synced_at", "TIMESTAMP", null], ["created_at", "TIMESTAMP", null]
    ], "table"],
    ["user_product_interactions", [
        ["id", "UUID", "PK"], ["interaction_type", "VARCHAR(30)", null], ["weight", "NUMERIC(5,2)", null], ["created_at", "TIMESTAMP", null]
    ], "association class"],
    ["collaborative_embeddings", [
        ["id", "UUID", "PK"], ["subject_type", "VARCHAR(16)", null], ["vector", "TEXT", null], ["updated_at", "TIMESTAMP", null]
    ], "table"],
    ["customer_segments", [
        ["id", "UUID", "PK"], ["segment_label", "VARCHAR(50)", null], ["recency_days", "INTEGER", null], ["frequency_count", "INTEGER", null], ["monetary_total", "NUMERIC(10,2)", null], ["return_rate", "NUMERIC(5,2)", null], ["assigned_at", "TIMESTAMP", null]
    ], "table"],
    ["demand_forecasts", [
        ["id", "UUID", "PK"], ["forecast_period", "VARCHAR(30)", null], ["predicted_units", "INTEGER", null], ["confidence_lower", "INTEGER", null], ["confidence_upper", "INTEGER", null], ["algorithm_used", "VARCHAR(50)", null], ["created_at", "TIMESTAMP", null]
    ], "table"],
    ["ml_models", [
        ["id", "UUID", "PK"], ["name", "VARCHAR(100)", null], ["model_type", "VARCHAR(50)", null], ["version", "VARCHAR(20)", null], ["metrics", "JSON", null], ["model_path", "VARCHAR(255)", null], ["is_active", "BOOLEAN", null], ["trained_at", "TIMESTAMP", null]
    ], "table"],
    ["conversations", [
        ["id", "UUID", "PK"], ["created_at", "TIMESTAMP", null]
    ], "table"],
    ["conversation_messages", [
        ["id", "UUID", "PK"], ["role", "VARCHAR(20)", null], ["content", "TEXT", null], ["message_data", "JSON", null], ["created_at", "TIMESTAMP", null]
    ], "table"],
    ["notifications", [
        ["id", "UUID", "PK"], ["title", "VARCHAR(150)", null], ["body", "TEXT", null], ["data", "JSON", null], ["read_at", "TIMESTAMP", null], ["dedupe_key", "VARCHAR(100)", null], ["created_at", "TIMESTAMP", null]
    ], "table"],
    ["device_tokens", [
        ["id", "UUID", "PK"], ["token", "VARCHAR(255)", null], ["platform", "VARCHAR(20)", null], ["is_active", "BOOLEAN", null], ["created_at", "TIMESTAMP", null], ["updated_at", "TIMESTAMP", null]
    ], "table"]
];

// ============================================================================
// FUNCIÓN PRINCIPAL DE EJECUCIÓN
// ============================================================================
function Main() {
    Log("Iniciando creación de Diagrama de Clases UML Conceptual (FashionStore 2P)...");

    var packageDestino = Repo.GetTreeSelectedPackage();
    if (packageDestino == null) {
        if (Repo.Models.Count > 0) {
            packageDestino = Repo.Models.GetAt(0);
        } else {
            Session.Prompt("Error: No se encontró ningún modelo ni paquete seleccionado en Enterprise Architect.", 0);
            return;
        }
    }

    // Crear paquete contenedor
    var model = packageDestino.Packages.AddNew("Modelo de Clases UML Conceptual — FashionStore", "");
    model.Update();

    var elementos = {};
    var total = TABLAS.length;

    Log("1. Creando " + total + " clases de dominio sin atributos FK...");

    // 1) Crear cada clase con sus atributos intrínsecos (sin FKs)
    for (var i = 0; i < total; i++) {
        var tabla = TABLAS[i][0];
        var campos = TABLAS[i][1];
        var estereoClase = (TABLAS[i].length > 2 && TABLAS[i][2] != null) ? TABLAS[i][2] : "table";

        var cls = model.Elements.AddNew(tabla, "Class");
        cls.Stereotype = estereoClase;
        cls.Update();

        for (var j = 0; j < campos.length; j++) {
            var campo = campos[j][0];
            var tipo  = campos[j][1];
            var est   = campos[j][2];
            var a = cls.Attributes.AddNew(campo, eaType(tipo));
            if (est != null) a.Stereotype = est;
            a.Update();
        }
        cls.Update();
        elementos[tabla] = cls;
    }

    Log("2. Creando " + CLASES_ASOCIACION.length + " Clases Asociación Nativas con su conector en línea punteada...");

    // 2) Crear Clases Asociación Nativas en Enterprise Architect
    // Patrón Sparx Systems EA:
    // a) Crear la Asociación normal entre Origen y Destino.
    // b) Enlazar t_object (NType = 17, PDATA1 = Connector_ID) y t_connector (PDATA1 = Object_ID).
    var nAssocClass = 0;
    for (var a = 0; a < CLASES_ASOCIACION.length; a++) {
        var ca = CLASES_ASOCIACION[a];
        var nomClaseAsoc = ca[0];
        var origen       = ca[1];
        var destino      = ca[2];
        var verbo        = ca[3];
        var cardOrigen   = ca[4];
        var cardDestino  = ca[5];

        if (elementos[nomClaseAsoc] == null || elementos[origen] == null || elementos[destino] == null) {
            Log("Aviso: No se pudo crear clase asociación para " + nomClaseAsoc);
            continue;
        }

        try {
            // Conector de asociación base
            var conn = elementos[origen].Connectors.AddNew(verbo, "Association");
            conn.ClientID = elementos[origen].ElementID;
            conn.SupplierID = elementos[destino].ElementID;
            conn.ClientEnd.Cardinality = cardOrigen;
            conn.SupplierEnd.Cardinality = cardDestino;
            conn.Direction = "Unspecified";
            conn.Update();
            elementos[origen].Connectors.Refresh();

            var classId = elementos[nomClaseAsoc].ElementID;
            var connId  = conn.ConnectorID;

            // Enlace nativo de Clase Asociación en la base de datos de EA
            var sql1 = "UPDATE t_object SET NType = 17, PDATA1 = '" + connId + "' WHERE Object_ID = " + classId;
            var sql2 = "UPDATE t_connector SET PDATA1 = '" + classId + "' WHERE Connector_ID = " + connId;

            Repo.Execute(sql1);
            Repo.Execute(sql2);

            nAssocClass++;
            Log("Clase Asociación nativa enlazada: " + nomClaseAsoc + " -> (" + origen + " - " + destino + ")");
        } catch(e) {
            Log("Error creando clase asociación " + nomClaseAsoc + ": " + e.message);
        }
    }

    Log("3. Creando " + RELACIONES.length + " relaciones (Composiciones, Agregaciones, Herencias y Asociaciones)...");

    // 3) Crear relaciones tipadas
    var creadas = 0;
    var nComp = 0, nAgg = 0, nGen = 0, nAssoc = 0;

    for (var r = 0; r < RELACIONES.length; r++) {
        var rel = RELACIONES[r];
        var origen      = rel[0];
        var destino     = rel[1];
        var verbo       = rel[2];
        var cardOrigen  = rel[3];
        var cardDestino = rel[4];
        var tipoRel     = (rel.length > 5 && rel[5] != null) ? rel[5] : "Association";

        if (elementos[origen] == null || elementos[destino] == null) {
            Log("Aviso: No se pudo relacionar " + origen + " con " + destino + " (elemento no encontrado).");
            continue;
        }

        try {
            if (tipoRel == "Generalization") {
                // HERENCIA: Origen = Subclase, Destino = Superclase. Flecha triangular blanca en Destino.
                var conn = elementos[origen].Connectors.AddNew("", "Generalization");
                conn.ClientID    = elementos[origen].ElementID;
                conn.SupplierID  = elementos[destino].ElementID;
                conn.Direction   = "Source -> Destination";
                conn.Update();
                creadas++;
                nGen++;
            } else if (tipoRel == "Composition") {
                // COMPOSICIÓN: Todo -> Parte. Rombo negro en Origen (ClientEnd.Aggregation = 2).
                var conn = elementos[origen].Connectors.AddNew(verbo, "Association");
                conn.ClientID    = elementos[origen].ElementID;
                conn.SupplierID  = elementos[destino].ElementID;
                conn.ClientEnd.Aggregation = 2; // 2 = Composite (Rombo negro en Todo)
                conn.SupplierEnd.Aggregation = 0;
                conn.ClientEnd.Cardinality = cardOrigen;
                conn.SupplierEnd.Cardinality = cardDestino;
                conn.Direction   = "Source -> Destination";
                conn.Update();
                creadas++;
                nComp++;
            } else if (tipoRel == "Aggregation") {
                // AGREGACIÓN: Contenedor -> Contenido. Rombo blanco en Origen (ClientEnd.Aggregation = 1).
                var conn = elementos[origen].Connectors.AddNew(verbo, "Association");
                conn.ClientID    = elementos[origen].ElementID;
                conn.SupplierID  = elementos[destino].ElementID;
                conn.ClientEnd.Aggregation = 1; // 1 = Shared (Rombo blanco en Contenedor)
                conn.SupplierEnd.Aggregation = 0;
                conn.ClientEnd.Cardinality = cardOrigen;
                conn.SupplierEnd.Cardinality = cardDestino;
                conn.Direction   = "Source -> Destination";
                conn.Update();
                creadas++;
                nAgg++;
            } else {
                // ASOCIACIÓN ESTÁNDAR: Línea simple con cardinalidades.
                var conn = elementos[origen].Connectors.AddNew(verbo, "Association");
                conn.ClientID    = elementos[origen].ElementID;
                conn.SupplierID  = elementos[destino].ElementID;
                conn.ClientEnd.Cardinality  = cardOrigen;
                conn.SupplierEnd.Cardinality = cardDestino;
                conn.Direction   = "Unspecified";
                conn.Update();
                creadas++;
                nAssoc++;
            }
        } catch(err) {
            Log("Error creando relación " + origen + " -> " + destino + ": " + err.message);
        }
    }

    Log("4. Creando diagrama y distribuyendo elementos en grilla compacta...");

    // 4) Crear el diagrama y distribuir las entidades
    var diagram = model.Diagrams.AddNew("Diagrama de Clases UML Conceptual — FashionStore 2P", "Logical");
    diagram.Update();

    // Distribución compacta en matriz de 6 columnas
    var cols = 6;
    var ancho = 175;
    var alto = 115;
    var gapX = 90;
    var gapY = 80;
    var x0 = 40;
    var y0 = 40;

    for (var k = 0; k < total; k++) {
        var nombre = TABLAS[k][0];
        var obj = elementos[nombre];
        if (obj == null) continue;

        var fila = Math.floor(k / cols);
        var col = k % cols;
        var left   = x0 + col * (ancho + gapX);
        var top    = y0 + fila * (alto + gapY);

        var dObj = diagram.DiagramObjects.AddNew("l=" + left + ";r=" + (left + ancho) + ";t=" + top + ";b=" + (top + alto) + ";", "");
        dObj.ElementID = obj.ElementID;
        dObj.Update();
    }

    diagram.Update();
    Repo.RefreshModelView(diagram.DiagramID);
    Repo.OpenDiagram(diagram.DiagramID);

    Log("¡Éxito! Generado con " + total + " clases (" + nAssocClass + " Clases Asociación Nativas, " + nComp + " Composiciones, " + nAgg + " Agregaciones, " + nGen + " Herencias, " + nAssoc + " Asociaciones).");
    try {
        Session.Prompt("¡Diagrama de Clases UML actualizado exitosamente!" +
                       "- Total entidades: " + total + " (47 tablas fisicas + 5 roles)" + 
                       "- Composiciones (Rombo negro): " + nComp + " " + "- Agregaciones (Rombo blanco): " + nAgg + " " + "- Herencias (Generalizacion): " + nGen + "- Clases asociadas («association class»): 10" +"- Asociaciones simples: " + nAssoc, 0);
    } catch(e) {}
}

Main();
// ============================================================================
// FIN DEL SCRIPT
// ============================================================================
