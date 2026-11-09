# NEXT STEPS — FASHIONSTORE SAAS MULTITENANT
### Hoja de Ruta Operativa y Próximos Pasos (25 Casos de Uso Oficiales)
**Fecha:** 03 de Noviembre de 2026

---

## 🎯 Estado de Situación: 23 de 25 Casos de Uso Implementados (100% Verificados)

### Casos de Uso Listos y Funcionales (Presentación 1 y 2 al 100% + CU19, CU20, CU21, CU22 y CU23):
- [x] **`CU01` – Registrar y Gestionar Empresas Contratantes (Tenants)** (`p0_saas_plataforma`)
- [x] **`CU02` – Gestionar Planes de Suscripción (Básico a 3 suc., Pro a 10 suc., Empresarial) y Cuotas** (`p0_saas_plataforma`)
- [x] **`CU03` – Iniciar Sesión Multitenant con JWT y Claims de Tenant** (`p1_gestion_usuarios_acceso`)
- [x] **`CU04` – Gestionar Sucursales Bajo Límites del Plan** (`p1_gestion_usuarios_acceso`)
- [x] **`CU05` – Gestionar Prendas y Variantes de Precio por Talla** (`p2_gestion_productos_catalogo`)
- [x] **`CU06` – Consultar Catálogo Online con Búsqueda Facetada** (`p2_gestion_productos_catalogo`)
- [x] **`CU07` – Sincronizar y Descargar Catálogo a Almacenamiento Local (PWA / SQLite)** (`p3_gestion_inventario_disponibilidad`)
- [x] **`CU08` – Consultar Catálogo Offline en Modo Desconectado** (`p3_gestion_inventario_disponibilidad`)
- [x] **`CU09` – Comprar Prendas con Stripe y Despacho Condicionado** (`p4_gestion_compras_reservas`)
- [x] **`CU10` – Crear Reserva Online de Prendas con Vencimiento y Bloqueo** (`p4_gestion_compras_reservas`)
- [x] **`CU11` – Registrar Reserva de Prendas Offline en Modo Desconectado (PWA / SQLite)** (`p4_gestion_compras_reservas`)
- [x] **`CU12` – Atender y Resolver Conflictos de Reservas Expiradas** (`p4_gestion_compras_reservas`)
- [x] **`CU13` – Registrar Venta POS Desconectada en Efectivo con Contingencia UUIDv4** (`p5_gestion_ventas_pos`)
- [x] **`CU14` – Gestionar Bandeja Local de Operaciones Pendientes (Outbox PWA / SQLite)** (`p5_gestion_ventas_pos`)
- [x] **`CU15` – Sincronizar Lotes de Ventas con Idempotencia Central (`sync_operations`)** (`p5_gestion_ventas_pos`)
- [x] **`CU16` – Gestionar y Resolver Conflictos de Ventas Offline y Quiebres de Stock Central** (`p5_gestion_ventas_pos`)
- [x] **`CU17` – Procesar Cambio de Prenda por Talla con Cobro de Diferencia y Estado** (`p5_gestion_ventas_pos`)
- [x] **`CU18` – Procesar Devolución de Prenda con Retención Operativa y Nota de Crédito** (`p5_gestion_ventas_pos`)
- [x] **`CU19` – Localizar Sucursales y Trazar Rutas (Carril A: Mobile OpenStreetMap / ORS)** (`p1_gestion_usuarios_acceso` + Flutter)
- [x] **`CU20` – Generar Reportes Ejecutivos por Voz y Gemini RAG (Carril D: Generative AI)** (`p6_inteligencia_analitica` + Angular PWA)
- [x] **`CU21` – Exportar Reportes Empresariales a Formatos PDF y Excel (Carril B: Reportes)** (`p6_inteligencia_analitica`)
- [x] **`CU22` – Generar Dataset Sintético de Ventas y Estacionalidad Textil (Carril C: Machine Learning)** (`p6_inteligencia_analitica`)
- [x] **`CU23` – Predecir Demanda de Ropa por Talla (ML Supervisado)** (`p6_inteligencia_analitica` + Angular PWA - 100% Fullstack)
- [x] **`CU24` – Segmentar Clientes con K-Means (ML No Supervisado - RFM+D)** (`p6_inteligencia_analitica` - Backend 100% / Frontend en chat paralelo)
- [x] **`CU25` – Visualizar Dashboard Ejecutivo con KPIs y Métricas ML** (`p6_inteligencia_analitica` - Backend 100% verificado)

---

## 🚀 Carriles de Trabajo en Paralelo para la 3ra Presentación (Consolidación)

```
[Carril A: Mobile] ---------> CU19 (Mapas / Rutas Flutter con OpenStreetMap / ORS) [¡LISTO Y VERIFICADO!]
[Carril B: Reportes] -------> CU21 (Exportación PDF / Excel) [¡LISTO Y VERIFICADO!]
[Carril D: Generative AI] --> CU20 (Gemini RAG por Voz Multitenant) [¡LISTO Y VERIFICADO!]
[Carril C: Pipeline ML] ----> CU22 (Dataset Sintético de Moda Textil) [¡LISTO Y VERIFICADO!]
                                   │
                                   ├──> CU23 (ML Supervisado - RandomForestRegressor) [¡LISTO Y VERIFICADO!]
                                   ├──> CU24 (ML No Supervisado - K-Means RFM+D) [Backend 100% / Frontend paralelo]
                                   └──> CU25 (Dashboard Ejecutivo Unificado) [Backend 100% / Listo para Frontend]
```

### Tarea Inmediata Pendiente:
1. **Frontend Web PWA Angular de `CU25` (Visualizar Dashboard Ejecutivo con KPIs y Métricas ML):**
   - Implementar vistas ejecutivas en Angular PWA bajo directrices `/design-taste-frontend`.
   - Tarjetas métricas con transiciones fluidas para KPIs de Sincronización Offline, Ingresos por Políticas (Retenciones y Diferencias $\Delta > 0$), Bloque de Inteligencia Analítica ML y Monitoreo de Cuotas SaaS del Plan.
2. **Modelado ICONIX (UML 2.5+) para `CU25`:**
   - Diagrama de Robustez BCE y Diagrama de Secuencia con scripts EA v15 y previsualización Mermaid.
   - Clusterización K-Means con Scikit-Learn y visualización de segmentos (VIP, Prometedor, En Riesgo, Dormido).
   - Selector reactivo de prenda, selector de horizonte (1 a 8 semanas).
   - Tarjetas de bondad de ajuste del modelo ($R^2$, $MAE$, $RMSE$) y botón de reentrenamiento.
   - Gráfica interactiva de barras/curvas por talla (S, M, L, XL) con intervalos de confianza y alertas tempranas de stock.
2. **Carril C2 — ML No Supervisado (`CU24`):**
   - Segmentación de clientes mediante K-Means clustering (Recencia, Frecuencia, Monto Monetario y tasa de Devolución) con detección de codo.
3. **Cierre de Presentación 3 — Dashboard Analítico (`CU25`):**
   - Tablero ejecutivo unificado con visualización interactiva de ventas, predicciones de demanda y segmentos de clientes.
