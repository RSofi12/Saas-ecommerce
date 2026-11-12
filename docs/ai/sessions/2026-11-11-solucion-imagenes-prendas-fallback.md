# Sesión de Trabajo: 2026-11-11 - Diagnóstico y Solución de Carga de Imágenes de Prendas (Catálogo Admin vs Cliente)

## 1. Problema Reportado
- Al crear una nueva prenda como Administrador y cargarle una fotografía/imagen, al entrar posteriormente con el rol de Cliente al catálogo la fotografía no se visualizaba.

## 2. Diagnóstico Técnico de Causa Raíz
1. **Fallo en Servicio Cloudinary por Credenciales de Plantilla:**
   - La subida de fotografías en `catalog_routes.py` (`PATCH /api/catalog/variants/{variant_id}/image`) dependía exclusivamente de Cloudinary.
   - En el archivo `backend/.env`, las variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` tenían valores placeholder (`your_cloud_name`, etc.).
   - Al intentar subir el archivo desde el formulario de administración, la petición a Cloudinary fallaba arrojando error HTTP 400.
2. **Consecuencia en Base de Datos:**
   - El producto y la variante se creaban en PostgreSQL, pero el campo `product_variants.image_url` quedaba en `NULL`.
3. **Consecuencia en Catálogo de Cliente:**
   - El componente de cliente (`catalog-page.component.ts` y `.html`) consulta `productImages(product)`, extrayendo `variant.image_url`. Al estar en `NULL`, la tarjeta no desplegaba ninguna fotografía.

## 3. Solución Implementada
- **`backend/app/packages/p2_gestion_productos_catalogo/services/cloudinary_service.py`:**
  - Se implementó un **Fallback de Almacenamiento Local Automático**:
    - Si Cloudinary no cuenta con credenciales legítimas o si ocurre una falla de red/cuota, el sistema almacena la fotografía localmente en `backend/uploads/variants/` con un UUID seguro.
    - Se genera la URL de acceso estático `http://127.0.0.1:8000/uploads/variants/{filename}` y se persiste en `product_variants.image_url`.
    - La función `delete_image` ahora soporta la limpieza tanto de archivos locales como de recursos en Cloudinary.
- **`backend/main.py`:**
  - Se montó el handler de archivos estáticos `StaticFiles` en la ruta `/uploads` de FastAPI para servir las imágenes locales de forma directa al frontend web y móvil.

## 4. Verificación
- Prueba unitaria de subida y borrado ejecutada satisfactoriamente con respuesta:
  `{'image_url': 'http://127.0.0.1:8000/uploads/variants/7671557aec_vestido_rojo.jpg', 'image_public_id': 'local_7671557aec_vestido_rojo.jpg'}`

