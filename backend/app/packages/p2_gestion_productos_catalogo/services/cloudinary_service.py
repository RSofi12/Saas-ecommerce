import os
import re
import uuid
from pathlib import Path
from cloudinary import config as cloudinary_config
from cloudinary import uploader

from app.core.config import settings

# Directorio local de respaldo para imágenes dentro de backend/uploads/variants
BACKEND_DIR = Path(__file__).resolve().parents[4]
LOCAL_UPLOADS_DIR = BACKEND_DIR / "uploads" / "variants"


def _get_cloudinary_creds():
    """Lee credenciales frescas de entorno o de settings."""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME") or settings.cloudinary_cloud_name
    api_key = os.getenv("CLOUDINARY_API_KEY") or settings.cloudinary_api_key
    api_secret = os.getenv("CLOUDINARY_API_SECRET") or settings.cloudinary_api_secret
    return cloud_name, api_key, api_secret


def _is_real_cloudinary() -> bool:
    """Verifica si Cloudinary cuenta con credenciales legítimas y no de prueba."""
    cloud_name, api_key, api_secret = _get_cloudinary_creds()
    if not all([cloud_name, api_key, api_secret]):
        return False
    if cloud_name in ("your_cloud_name", "", None):
        return False
    if api_key in ("your_api_key", "", None):
        return False
    return True


def _ensure_configured() -> None:
    cloud_name, api_key, api_secret = _get_cloudinary_creds()
    if not _is_real_cloudinary():
        raise ValueError("Cloudinary no cuenta con credenciales activas")

    cloudinary_config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )


def upload_image(content: bytes, folder: str, public_id: str | None = None):
    """
    Sube la imagen a Cloudinary si está configurado.
    Si Cloudinary no está configurado o falla la conexión, almacena la imagen
    localmente en la carpeta estática del servidor (/uploads/variants/).
    """
    if _is_real_cloudinary():
        try:
            _ensure_configured()
            options = {
                "folder": folder,
                "resource_type": "image",
                "overwrite": True,
                "unique_filename": True,
            }
            if public_id:
                # Sanitizar public_id para evitar espacios o caracteres especiales
                options["public_id"] = re.sub(r'[^a-zA-Z0-9_\.-]', '_', public_id)

            result = uploader.upload(content, **options)
            return {
                "image_url": result.get("secure_url"),
                "image_public_id": result.get("public_id"),
            }
        except Exception:
            # Si Cloudinary falla por red o cuota, recurre al almacenamiento local sin romper el flujo
            pass

    # --- FALLBACK DE ALMACENAMIENTO LOCAL ROBUSTO ---
    LOCAL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    clean_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', public_id or "prenda")
    filename = f"{uuid.uuid4().hex[:10]}_{clean_name}.jpg"
    target_path = LOCAL_UPLOADS_DIR / filename
    
    with open(target_path, "wb") as f:
        f.write(content)

    return {
        "image_url": f"http://127.0.0.1:8000/uploads/variants/{filename}",
        "image_public_id": f"local_{filename}",
    }


def delete_image(public_id: str | None) -> None:
    if not public_id:
        return

    # Si es imagen guardada localmente
    if public_id.startswith("local_"):
        filename = public_id.replace("local_", "")
        target_path = LOCAL_UPLOADS_DIR / filename
        if target_path.exists():
            try:
                target_path.unlink()
            except Exception:
                pass
        return

    if _is_real_cloudinary():
        try:
            _ensure_configured()
            uploader.destroy(public_id, resource_type="image")
        except Exception:
            pass
