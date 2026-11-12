import sys
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(__file__).resolve().parent / "backend"
load_dotenv(backend_dir / ".env")
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from app.core.config import settings
from app.auth.hash import hash_password

engine = create_engine(settings.database_url)
with engine.begin() as conn:
    genders = [r[0] for r in conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'genderenum'")).fetchall()]
    print("Valores de genderenum:", genders)

    val_gender = genders[0] if genders else 'otro'
    hashed = hash_password("Tiendafashion123!")

    existing = conn.execute(text("SELECT id FROM users WHERE email = 'encargado.lp@fashionstore.bo'")).fetchone()
    if existing:
        conn.execute(
            text("UPDATE users SET hashed_password = :h, tenant_id = '17eeb457-a34c-47a4-8826-5d9e03d1dfe5', branch_id = '8ba6f37b-10d8-4fde-8b39-a1eee44f1922', is_active = true WHERE email = 'encargado.lp@fashionstore.bo'"),
            {"h": hashed}
        )
        print("Clave de encargado.lp@fashionstore.bo actualizada a Tiendafashion123!")
    else:
        conn.execute(
            text(f"""
                INSERT INTO users (id, name, email, hashed_password, gender, rol, tenant_id, branch_id, is_active)
                VALUES (gen_random_uuid(), 'Encargado La Paz', 'encargado.lp@fashionstore.bo', :h, '{val_gender}', 'encargado', '17eeb457-a34c-47a4-8826-5d9e03d1dfe5', '8ba6f37b-10d8-4fde-8b39-a1eee44f1922', true)
            """),
            {"h": hashed}
        )
        print("Usuario encargado.lp@fashionstore.bo creado con Tiendafashion123!")
