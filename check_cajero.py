import sys
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(__file__).resolve().parent / "backend"
load_dotenv(backend_dir / ".env")
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.database_url)
with engine.connect() as conn:
    cols = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")).fetchall()
    print('Users cols:', [c[0] for c in cols])
    inv = conn.execute(text("SELECT quantity, reserved_quantity FROM inventory WHERE branch_id = '8ba6f37b-10d8-4fde-8b39-a1eee44f1922' AND variant_id = '09619d8d-d335-4bd7-957e-2991c7d6e88b'")).fetchone()
    print("Inventory for Jealous 21 in La Paz:", inv)
