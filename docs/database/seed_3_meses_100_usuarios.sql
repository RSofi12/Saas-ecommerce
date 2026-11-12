-- ============================================================================
-- SIMULADOR DE DATOS HISTÓRICOS DE 3 MESES (90 DÍAS) PARA 100 USUARIOS
-- ============================================================================
-- Sistema: FashionStore SaaS Multitenant (PostgreSQL 15+ / Neon Tech)
-- 100% Ajustado a los tipos ENUM y restricciones NOT NULL exactas de la Base de Datos
-- ============================================================================

DO $$
DECLARE
    -- Tenants y Sucursales
    v_tenant_e UUID;
    v_tenant_u UUID;
    v_branch_e1 UUID;
    v_branch_e2 UUID;
    v_branch_u1 UUID;

    -- Contraseña estándar bcrypt: "Fashion123!"
    v_pass_hash TEXT := 'Tiendafashion123!';

    -- Arreglos en memoria
    v_client_ids UUID[] := ARRAY[]::UUID[];
    v_cashier_ids UUID[] := ARRAY[]::UUID[];
    v_variant_ids UUID[];
    v_variant_prices NUMERIC[];
    v_variant_count INT;

    -- Variables temporales de bucles
    v_user_id UUID;
    v_sale_id UUID;
    v_res_id UUID;
    v_conv_id UUID;
    v_variant_idx INT;
    v_var_id UUID;
    v_var_id_2 UUID;
    v_var_price NUMERIC;
    v_var_price_2 NUMERIC;
    v_price_diff NUMERIC;
    v_retention_pct NUMERIC;
    v_retention_amt NUMERIC;
    v_refund_amt NUMERIC;
    
    v_prod_id UUID;
    v_prod_name VARCHAR;
    v_var_sku VARCHAR;
    v_size_id UUID;
    v_color_id UUID;

    v_rol public.rolenum;
    v_gender public.genderenum;
    v_tenant UUID;
    v_branch UUID;
    v_base_time TIMESTAMPTZ;
    v_created_at TIMESTAMPTZ;
    v_expires_date DATE;
    v_visit_date DATE;
    v_client_sale_id UUID;
    v_is_offline BOOLEAN;

    -- Cesta de compra (1 a 3 prendas)
    v_items_in_sale INT;
    v_item_qty INT;
    v_sale_subtotal NUMERIC;
    v_sale_total NUMERIC;
    v_pay_method public.paymentmethodenum;
    v_pay_status public.paymentstatusenum;

    -- Nombres para generación
    v_first_f TEXT[] := ARRAY['Valeria','Sofia','Camila','Lucia','Mariana','Daniela','Andrea','Natalia','Paula','Carla','Elena','Fernanda','Gabriela','Adriana','Lorena','Claudia','Romina','Vanessa'];
    v_first_m TEXT[] := ARRAY['Mateo','Santiago','Sebastian','Alejandro','Diego','Nicolas','Samuel','Lucas','Daniel','Joaquin','Carlos','Andres','Rodrigo','Mauricio','Fernando','Javier','Gonzalo'];
    v_lasts TEXT[] := ARRAY['Rojas','Flores','Quispe','Mamani','Torrico','Vargas','Gutierrez','Morales','Suarez','Chavez','Paredes','Roca','Mendoza','Arce','Teran','Añez','Zeballos'];
    v_fname TEXT;
    v_lname TEXT;
    v_email TEXT;

    -- Preguntas y Respuestas Contextuales para Gemini RAG
    v_gemini_qa TEXT[][] := ARRAY[
        ['Hola, busco un vestido de temporada para clima cálido en talla M.', '¡Hola! Te recomiendo nuestro Vestido Floral de Primavera-Verano en talla M. Tenemos unidades disponibles en la Sucursal Central.'],
        ['¿Tienen jeans de corte slim fit para hombre en talla 32?', 'Sí, disponemos del Jean Denim Clásico Slim Fit en color azul oscuro y gris en talla 32 en ambas sucursales.'],
        ['¿Cuál es la política para cambio de prenda si no me queda la talla?', 'Puedes cambiarla dentro de los 7 días presentando tu ticket. Si eliges una talla o modelo de mayor valor, solo abonas la diferencia en caja.'],
        ['Quiero saber el horario de atención de la sucursal Equipetrol.', 'Nuestra sucursal Equipetrol atiende de Lunes a Sábado de 09:00 a 20:30 y Domingos de 10:00 a 18:00.'],
        ['¿Tienen chaquetas de cuero sintético en color negro?', 'Contamos con la Chaqueta Biker Negra disponible en tallas S, M y L en la sucursal Equipetrol.'],
        ['¿Puedo hacer una reserva online y recoger en tienda?', '¡Por supuesto! Tu reserva online bloquea el inventario por 48 horas sin costo para que te la pruebes antes de pagar.'],
        ['¿Qué opciones de blusas formales para oficina me recomiendas?', 'Te sugiero la Blusa Camisera de Seda en tonos blanco y beige, ideal para entornos ejecutivos y combinable con blazers.'],
        ['¿Aceptan pagos con QR en sucursales físicas?', 'Sí, en todas nuestras sucursales físicas aceptamos pagos mediante QR Simple, tarjeta y efectivo.'],
        ['¿Tienen poleras básicas de algodón orgánico unisex?', 'Sí, disponemos de la línea de Poleras Básicas 100% Algodón en cuello redondo y V, en colores negro, blanco y melange.'],
        ['¿Hacen envíos a domicilio para compras web?', 'Sí, realizamos envíos a todo el país mediante nuestro servicio de delivery express una vez confirmado tu pago con Stripe.']
    ];
    v_qa_idx INT;
    
    i INT;
    j INT;
BEGIN
    RAISE NOTICE '>>> Iniciando simulación de 3 meses para 100 usuarios en FashionStore...';

    -- 1. Identificar Empresas y Sucursales Activas
    SELECT id INTO v_tenant_e FROM public.companies WHERE subdomain = 'elegance' LIMIT 1;
    SELECT id INTO v_tenant_u FROM public.companies WHERE subdomain = 'modaurbana' LIMIT 1;

    IF v_tenant_e IS NULL THEN
        SELECT id INTO v_tenant_e FROM public.companies ORDER BY created_at ASC LIMIT 1;
    END IF;
    IF v_tenant_u IS NULL THEN
        SELECT id INTO v_tenant_u FROM public.companies ORDER BY created_at DESC LIMIT 1;
    END IF;

    SELECT id INTO v_branch_e1 FROM public.branches WHERE tenant_id = v_tenant_e ORDER BY name ASC LIMIT 1;
    SELECT id INTO v_branch_e2 FROM public.branches WHERE tenant_id = v_tenant_e ORDER BY name DESC LIMIT 1;
    SELECT id INTO v_branch_u1 FROM public.branches WHERE tenant_id = v_tenant_u LIMIT 1;

    -- Cargar Variantes Existentes del Catálogo
    SELECT ARRAY_AGG(id), ARRAY_AGG(price) INTO v_variant_ids, v_variant_prices FROM public.product_variants WHERE status = 'active';
    v_variant_count := array_length(v_variant_ids, 1);

    IF v_variant_count IS NULL OR v_variant_count = 0 THEN
        RAISE EXCEPTION 'No se encontraron variantes de producto activas en product_variants. Ejecuta el seeder básico antes.';
    END IF;

    -- ========================================================================
    -- FASE 0: INICIALIZAR Y ASEGURAR STOCK EN INVENTARIOS (public.inventory)
    -- ========================================================================
    FOR i IN 1..v_variant_count LOOP
        v_var_id := v_variant_ids[i];
        
        -- Sucursal Elegance 1
        IF v_branch_e1 IS NOT NULL THEN
            INSERT INTO public.inventory (id, branch_id, variant_id, quantity, reserved_quantity, minimum_stock, tenant_id)
            VALUES (gen_random_uuid(), v_branch_e1, v_var_id, 100, 0, 5, v_tenant_e)
            ON CONFLICT (branch_id, variant_id) DO UPDATE
            SET quantity = public.inventory.quantity + 50;
        END IF;

        -- Sucursal Elegance 2
        IF v_branch_e2 IS NOT NULL THEN
            INSERT INTO public.inventory (id, branch_id, variant_id, quantity, reserved_quantity, minimum_stock, tenant_id)
            VALUES (gen_random_uuid(), v_branch_e2, v_var_id, 80, 0, 5, v_tenant_e)
            ON CONFLICT (branch_id, variant_id) DO UPDATE
            SET quantity = public.inventory.quantity + 40;
        END IF;

        -- Sucursal ModaUrbana 1
        IF v_branch_u1 IS NOT NULL THEN
            INSERT INTO public.inventory (id, branch_id, variant_id, quantity, reserved_quantity, minimum_stock, tenant_id)
            VALUES (gen_random_uuid(), v_branch_u1, v_var_id, 90, 0, 5, v_tenant_u)
            ON CONFLICT (branch_id, variant_id) DO UPDATE
            SET quantity = public.inventory.quantity + 45;
        END IF;
    END LOOP;
    RAISE NOTICE '   -> Stock de inventario inicializado en sucursales activas.';

    -- ========================================================================
    -- FASE 1: CREAR 100 USUARIOS ESCALONADOS EN 90 DÍAS
    -- ========================================================================
    FOR i IN 1..100 LOOP
        v_user_id := gen_random_uuid();
        v_base_time := now() - ((90 - (i * 0.85)) * interval '1 day') - ((i % 24) * interval '1 hour');

        -- Distribución de Género
        IF random() < 0.65 THEN
            v_gender := 'femenino'::public.genderenum;
            v_fname := v_first_f[1 + floor(random() * array_length(v_first_f, 1))::int];
        ELSE
            v_gender := 'masculino'::public.genderenum;
            v_fname := v_first_m[1 + floor(random() * array_length(v_first_m, 1))::int];
        END IF;
        v_lname := v_lasts[1 + floor(random() * array_length(v_lasts, 1))::int];

        -- Asignación de Roles e Integridad Referencial
        IF i = 1 THEN
            v_rol := 'superadmin'::public.rolenum;
            v_tenant := NULL;
            v_branch := NULL;
        ELSIF i <= 6 THEN
            v_rol := 'administrador'::public.rolenum;
            v_tenant := CASE WHEN i % 2 = 0 THEN v_tenant_e ELSE v_tenant_u END;
            v_branch := NULL;
        ELSIF i <= 16 THEN
            v_rol := 'encargado'::public.rolenum;
            v_tenant := CASE WHEN i % 2 = 0 THEN v_tenant_e ELSE v_tenant_u END;
            v_branch := CASE 
                WHEN v_tenant = v_tenant_e AND i % 3 = 0 THEN v_branch_e2
                WHEN v_tenant = v_tenant_e THEN v_branch_e1
                ELSE v_branch_u1
            END;
        ELSIF i <= 30 THEN
            v_rol := 'cajero'::public.rolenum;
            v_tenant := CASE WHEN i % 2 = 0 THEN v_tenant_e ELSE v_tenant_u END;
            v_branch := CASE 
                WHEN v_tenant = v_tenant_e AND i % 3 = 0 THEN v_branch_e2
                WHEN v_tenant = v_tenant_e THEN v_branch_e1
                ELSE v_branch_u1
            END;
            v_cashier_ids := array_append(v_cashier_ids, v_user_id);
        ELSIF i <= 35 THEN
            v_rol := 'delivery'::public.rolenum;
            v_tenant := CASE WHEN i % 2 = 0 THEN v_tenant_e ELSE v_tenant_u END;
            v_branch := CASE WHEN v_tenant = v_tenant_e THEN v_branch_e1 ELSE v_branch_u1 END;
        ELSIF i <= 38 THEN
            v_rol := 'proveedor'::public.rolenum;
            v_tenant := CASE WHEN i % 2 = 0 THEN v_tenant_e ELSE v_tenant_u END;
            v_branch := NULL;
        ELSE
            v_rol := 'cliente'::public.rolenum;
            v_tenant := CASE WHEN i % 2 = 0 THEN v_tenant_e ELSE v_tenant_u END;
            v_branch := NULL;
            v_client_ids := array_append(v_client_ids, v_user_id);
        END IF;

        v_email := lower(v_fname) || '.' || lower(v_lname) || i || '@fashionstore.bo';

        INSERT INTO public.users (
            id, name, email, hashed_password, gender, rol, branch_id, is_active, created_at, tenant_id
        ) VALUES (
            v_user_id,
            v_fname || ' ' || v_lname,
            v_email,
            v_pass_hash,
            v_gender,
            v_rol,
            v_branch,
            true,
            v_base_time,
            v_tenant
        ) ON CONFLICT (email) DO UPDATE
        SET hashed_password = EXCLUDED.hashed_password,
            branch_id = EXCLUDED.branch_id,
            tenant_id = EXCLUDED.tenant_id;

        -- Perfil Antropométrico para Clientes
        IF v_rol = 'cliente' THEN
            INSERT INTO public.user_body_profiles (
                id, user_id, top_size, bottom_size, shoe_size, body_shape, fit_preference, notes
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                (ARRAY['XS','S','M','L','XL'])[1 + floor(random() * 5)::int],
                (ARRAY['S','M','L','38','40'])[1 + floor(random() * 5)::int],
                (ARRAY['36','37','38','39','40','41'])[1 + floor(random() * 6)::int],
                (ARRAY['reloj_arena','triangulo','rectangulo','ovalado'])[1 + floor(random() * 4)::int],
                (ARRAY['slim','regular','oversized'])[1 + floor(random() * 3)::int],
                'Perfil antropométrico registrado para probador virtual de temporada.'
            ) ON CONFLICT (user_id) DO NOTHING;
        END IF;
    END LOOP;
    RAISE NOTICE '   -> 100 Usuarios y Perfiles creados.';

    -- ========================================================================
    -- FASE 2: 300 RESERVAS DE PRENDAS HISTÓRICAS (CU10, CU11, CU12)
    -- ========================================================================
    FOR i IN 1..300 LOOP
        v_res_id := gen_random_uuid();
        v_user_id := v_client_ids[1 + floor(random() * array_length(v_client_ids, 1))::int];
        v_created_at := now() - ((90 - (i * 0.28)) * interval '1 day');
        v_visit_date := (v_created_at + interval '1 day')::date;
        v_expires_date := (v_created_at + interval '2 days')::date;
        v_tenant := CASE WHEN i % 2 = 0 THEN v_tenant_e ELSE v_tenant_u END;
        v_branch := CASE WHEN v_tenant = v_tenant_e THEN v_branch_e1 ELSE v_branch_u1 END;

        v_variant_idx := 1 + floor(random() * v_variant_count)::int;
        v_var_id := v_variant_ids[v_variant_idx];
        v_var_price := v_variant_prices[v_variant_idx];

        INSERT INTO public.reservations (
            id, branch_id, user_id, visit_date, expires_at, status, total_amount, created_at, updated_at, tenant_id
        ) VALUES (
            v_res_id,
            v_branch,
            v_user_id,
            v_visit_date,
            v_expires_date,
            CASE 
                WHEN v_expires_date < now()::date AND i % 3 = 0 THEN 'expired'::public.reservationstatusenum
                WHEN v_expires_date < now()::date THEN 'attended'::public.reservationstatusenum
                ELSE 'confirmed'::public.reservationstatusenum
            END,
            v_var_price,
            v_created_at,
            v_created_at,
            v_tenant
        );

        INSERT INTO public.reservation_items (
            id, reservation_id, variant_id, quantity, unit_price, tenant_id
        ) VALUES (
            gen_random_uuid(), v_res_id, v_var_id, 1, v_var_price, v_tenant
        );
    END LOOP;
    RAISE NOTICE '   -> 300 Reservas históricas y vigentes registradas.';

    -- ========================================================================
    -- FASE 3: 450 VENTAS POS REALISTAS (1 a 3 prendas, pagos mixtos y stock)
    -- ========================================================================
    FOR i IN 1..450 LOOP
        v_sale_id := gen_random_uuid();
        v_user_id := v_client_ids[1 + floor(random() * array_length(v_client_ids, 1))::int];
        v_created_at := now() - ((90 - (i * 0.19)) * interval '1 day');
        v_is_offline := (i % 4 = 0); -- 25% ventas offline contingentes
        v_client_sale_id := CASE WHEN v_is_offline THEN gen_random_uuid() ELSE NULL END;
        v_tenant := CASE WHEN i % 2 = 0 THEN v_tenant_e ELSE v_tenant_u END;
        v_branch := CASE 
            WHEN v_tenant = v_tenant_e AND i % 3 = 0 THEN v_branch_e2
            WHEN v_tenant = v_tenant_e THEN v_branch_e1
            ELSE v_branch_u1
        END;

        -- 1. Calcular Cesta de compra (1 a 3 prendas)
        v_items_in_sale := 1 + floor(random() * 3)::int;
        v_sale_subtotal := 0.00;

        -- 2. Determinar Método de Pago (Ventas Offline siempre cash por regla de negocio)
        IF v_is_offline THEN
            v_pay_method := 'cash'::public.paymentmethodenum;
        ELSE
            IF random() < 0.60 THEN
                v_pay_method := 'cash'::public.paymentmethodenum;
            ELSE
                v_pay_method := 'stripe'::public.paymentmethodenum;
            END IF;
        END IF;
        v_pay_status := 'paid'::public.paymentstatusenum;

        -- Cabecera de la venta
        INSERT INTO public.sales (
            id, branch_id, user_id, reservation_id, status, payment_method, payment_status,
            cash_reference, subtotal, discount_amount, total_amount, currency,
            created_at, updated_at, tenant_id, client_sale_id, is_offline, synced_at, idempotency_key
        ) VALUES (
            v_sale_id,
            v_branch,
            v_user_id,
            NULL,
            'completed'::public.salestatusenum,
            v_pay_method,
            v_pay_status,
            'POS-2026-' || lpad(i::text, 6, '0'),
            0.00,
            0.00,
            0.00,
            'usd',
            v_created_at,
            v_created_at,
            v_tenant,
            v_client_sale_id,
            v_is_offline,
            CASE WHEN v_is_offline THEN v_created_at + interval '2 hours' ELSE NULL END,
            'IDEM-POS-' || lpad(i::text, 6, '0')
        );

        -- Insertar Ítems y Descontar Stock Físico
        FOR j IN 1..v_items_in_sale LOOP
            -- Garantizar variantes distintas dentro del mismo ticket para evitar colisión en uq_sale_item_sale_variant
            v_variant_idx := 1 + (((i * 7) + (j * 11)) % v_variant_count);
            v_var_id := v_variant_ids[v_variant_idx];
            v_var_price := v_variant_prices[v_variant_idx];
            v_item_qty := CASE WHEN random() < 0.2 THEN 2 ELSE 1 END;

            -- Cargar metadatos requeridos por sale_items
            SELECT pv.product_id, p.name, pv.sku, pv.size_id, pv.color_id
            INTO v_prod_id, v_prod_name, v_var_sku, v_size_id, v_color_id
            FROM public.product_variants pv
            JOIN public.products p ON p.id = pv.product_id
            WHERE pv.id = v_var_id;

            v_sale_subtotal := v_sale_subtotal + (v_var_price * v_item_qty);

            INSERT INTO public.sale_items (
                id, sale_id, variant_id, quantity, unit_price, line_total,
                product_id, product_name, variant_sku, size_id, color_id, tenant_id
            ) VALUES (
                gen_random_uuid(),
                v_sale_id,
                v_var_id,
                v_item_qty,
                v_var_price,
                (v_var_price * v_item_qty),
                v_prod_id,
                v_prod_name,
                v_var_sku,
                v_size_id,
                v_color_id,
                v_tenant
            );

            -- Descuento atómico de inventario
            UPDATE public.inventory
            SET quantity = GREATEST(quantity - v_item_qty, 0)
            WHERE branch_id = v_branch AND variant_id = v_var_id;
        END LOOP;

        v_sale_total := v_sale_subtotal;

        UPDATE public.sales
        SET subtotal = v_sale_subtotal,
            total_amount = v_sale_total
        WHERE id = v_sale_id;

        -- ====================================================================
        -- FASE 4: CAMBIOS DE PRENDA (CU17: Política 1) Y DEVOLUCIONES (CU18: Política 2)
        -- ====================================================================
        IF i <= 50 THEN
            -- Simular cambio de prenda con cobro estricto de diferencia
            SELECT variant_id, unit_price INTO v_var_id, v_var_price 
            FROM public.sale_items WHERE sale_id = v_sale_id LIMIT 1;

            v_var_id_2 := v_variant_ids[1 + (((v_variant_idx + 17)) % v_variant_count)];
            SELECT price INTO v_var_price_2 FROM public.product_variants WHERE id = v_var_id_2;
            v_price_diff := GREATEST(v_var_price_2 - v_var_price, 0.00);

            INSERT INTO public.garment_exchanges (
                id, tenant_id, branch_id, cashier_id, sale_id, original_variant_id,
                new_variant_id, price_difference, difference_paid, payment_method, status, notes, created_at
            ) VALUES (
                gen_random_uuid(),
                v_tenant,
                v_branch,
                v_cashier_ids[1 + floor(random() * array_length(v_cashier_ids, 1))::int],
                v_sale_id,
                v_var_id,
                v_var_id_2,
                v_price_diff,
                true, -- Política 1: Abonó la diferencia obligatoriamente
                'cash',
                'COMPLETED',
                'Cambio de prenda por talla de mayor valor. Diferencia cobrada en caja.',
                v_created_at + interval '3 days'
            );

            -- Ajustar inventarios por el cambio (vuelve la original, sale la nueva)
            UPDATE public.inventory SET quantity = quantity + 1 WHERE branch_id = v_branch AND variant_id = v_var_id;
            UPDATE public.inventory SET quantity = GREATEST(quantity - 1, 0) WHERE branch_id = v_branch AND variant_id = v_var_id_2;

        ELSIF i <= 90 THEN
            -- Simular devolución con retención del 20% al 50%
            SELECT variant_id, unit_price INTO v_var_id, v_var_price 
            FROM public.sale_items WHERE sale_id = v_sale_id LIMIT 1;

            v_retention_pct := (20 + (i % 31))::numeric; -- Entre 20% y 50%
            v_retention_amt := round((v_var_price * (v_retention_pct / 100.0)), 2);
            v_refund_amt := v_var_price - v_retention_amt;

            INSERT INTO public.garment_returns (
                id, tenant_id, branch_id, cashier_id, sale_id, variant_id,
                quantity, original_item_amount, retention_percentage, retention_amount,
                refund_amount, refund_method, credit_note_code, reason, created_at
            ) VALUES (
                gen_random_uuid(),
                v_tenant,
                v_branch,
                v_cashier_ids[1 + floor(random() * array_length(v_cashier_ids, 1))::int],
                v_sale_id,
                v_var_id,
                1,
                v_var_price,
                v_retention_pct,
                v_retention_amt,
                v_refund_amt,
                'NOTA_CREDITO',
                'NC-2026-' || lpad(i::text, 6, '0'),
                'Devolución dentro del plazo de 7 días. Retención operativa aplicada según Política 2.',
                v_created_at + interval '4 days'
            );

            -- Reintegrar prenda devuelta al stock
            UPDATE public.inventory SET quantity = quantity + 1 WHERE branch_id = v_branch AND variant_id = v_var_id;
        END IF;
    END LOOP;
    RAISE NOTICE '   -> 450 Ventas POS realistas, 50 Cambios y 40 Devoluciones con actualización de stock.';

    -- ========================================================================
    -- FASE 5: 1,500 INTERACCIONES DE CLIENTES PARA ENTRENAMIENTO IA (CU21-CU28)
    -- ========================================================================
    FOR i IN 1..1500 LOOP
        v_user_id := v_client_ids[1 + floor(random() * array_length(v_client_ids, 1))::int];
        v_created_at := now() - ((90 - (i * 0.05)) * interval '1 day');
        v_var_id := v_variant_ids[1 + floor(random() * v_variant_count)::int];

        SELECT pv.product_id INTO v_prod_id
        FROM public.product_variants pv
        WHERE pv.id = v_var_id;

        INSERT INTO public.user_product_interactions (
            id, user_id, product_id, variant_id, branch_id, interaction_type, weight, created_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            v_prod_id,
            v_var_id,
            v_branch_e1,
            CASE 
                WHEN i % 5 = 0 THEN 'completed_order'
                WHEN i % 3 = 0 THEN 'add_to_cart'
                ELSE 'view'
            END,
            CASE 
                WHEN i % 5 = 0 THEN 5
                WHEN i % 3 = 0 THEN 3
                ELSE 1
            END,
            v_created_at
        );
    END LOOP;
    RAISE NOTICE '   -> 1,500 Interacciones de usuario para recomendador IA insertadas.';

    -- ========================================================================
    -- FASE 6: CONVERSACIONES CONTEXTUALES CON EL ASISTENTE GEMINI RAG
    -- ========================================================================
    FOR i IN 1..array_length(v_client_ids, 1) LOOP
        v_conv_id := gen_random_uuid();
        v_user_id := v_client_ids[i];
        v_tenant := CASE WHEN i % 2 = 0 THEN v_tenant_e ELSE v_tenant_u END;
        v_created_at := now() - ((90 - (i * 1.4)) * interval '1 day');
        v_qa_idx := 1 + (i % 10);

        INSERT INTO public.conversations (
            id, user_id, tenant_id, created_at
        ) VALUES (
            v_conv_id, v_user_id, v_tenant, v_created_at
        ) ON CONFLICT (user_id) DO UPDATE
        SET tenant_id = EXCLUDED.tenant_id
        RETURNING id INTO v_conv_id;

        INSERT INTO public.conversation_messages (
            id, conversation_id, role, content, tenant_id, created_at
        ) VALUES (
            gen_random_uuid(), v_conv_id, 'user',
            v_gemini_qa[v_qa_idx][1],
            v_tenant, v_created_at
        ), (
            gen_random_uuid(), v_conv_id, 'assistant',
            v_gemini_qa[v_qa_idx][2],
            v_tenant, v_created_at + interval '5 seconds'
        );
    END LOOP;
    RAISE NOTICE '   -> Conversaciones dinámicas con asistente IA Gemini generadas para cada cliente.';

    RAISE NOTICE '====================================================================';
    RAISE NOTICE '>>> ¡SIMULACIÓN DE 3 MESES COMPLETADA CON ÉXITO ABSOLUTO!';
    RAISE NOTICE '====================================================================';
END $$;
