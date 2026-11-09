"""Seed script for SaaS Multitenancy: Plans, Superadmin, and 2 Test Tenants."""
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.auth.hash import hash_password
from app.models.company import Company
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.user import User, UserBodyProfile
from app.models.conversation import Conversation  # noqa: F401
from app.models.branch import Branch
from app.schemas.enums import RolEnum, GenderEnum


def seed_saas_data():
    db: Session = SessionLocal()
    try:
        print("[1/4] Sembrando Planes de Suscripcion Oficiales...")
        # 1. Planes
        basic_plan = db.query(Plan).filter(Plan.code == "basic").first()
        if not basic_plan:
            basic_plan = Plan(
                name="BASICO",
                code="basic",
                max_branches=3,
                has_ai_access=False,
                price_monthly=Decimal("29.00"),
                is_active=True,
            )
            db.add(basic_plan)
            print("   -> Creado Plan BASICO (max 3 sucursales, sin IA)")
        else:
            basic_plan.max_branches = 3
            print("   -> Plan BASICO actualizado (max 3 sucursales)")

        pro_plan = db.query(Plan).filter(Plan.code == "pro").first()
        if not pro_plan:
            pro_plan = Plan(
                name="PROFESIONAL",
                code="pro",
                max_branches=10,
                has_ai_access=True,
                price_monthly=Decimal("99.00"),
                is_active=True,
            )
            db.add(pro_plan)
            print("   -> Creado Plan PROFESIONAL (max 10 sucursales, con IA y analitica)")
        else:
            print("   -> Plan PROFESIONAL ya existe")

        enterprise_plan = db.query(Plan).filter(Plan.code == "enterprise").first()
        if not enterprise_plan:
            enterprise_plan = Plan(
                name="EMPRESARIAL",
                code="enterprise",
                max_branches=25,
                has_ai_access=True,
                price_monthly=Decimal("199.00"),
                is_active=True,
            )
            db.add(enterprise_plan)
            print("   -> Creado Plan EMPRESARIAL (max 25 sucursales, con IA y backup continuo)")
        else:
            print("   -> Plan EMPRESARIAL ya existe")

        db.commit()
        db.refresh(basic_plan)
        db.refresh(pro_plan)
        db.refresh(enterprise_plan)

        print("\n[2/4] Sembrando Cuenta de Superadministrador Global...")
        superadmin_email = "superadmin@fashionstore.com"
        superadmin = db.query(User).filter(User.email == superadmin_email).first()
        if not superadmin:
            superadmin = User(
                email=superadmin_email,
                hashed_password=hash_password("SuperAdmin2026!"),
                rol=RolEnum.superadmin,
                tenant_id=None,
                branch_id=None,
                is_active=True,
            )
            db.add(superadmin)
            db.flush()
            profile = UserBodyProfile(
                user_id=superadmin.id,
                top_size="M",
                bottom_size="M",
                notes="Superadministrador Global de la Plataforma Master SaaS",
            )
            db.add(profile)
            db.commit()
            print(f"   -> Superadmin creado: {superadmin_email} (Contrasena: SuperAdmin2026!)")
        else:
            print(f"   -> Superadmin ya existe: {superadmin_email}")

        print("\n[3/4] Sembrando Tenant 1: 'Boutique Elegance' (Plan Profesional)...")
        elegance = db.query(Company).filter(Company.subdomain == "elegance").first()
        if not elegance:
            elegance = Company(
                name="Boutique Elegance",
                business_name="Boutique Elegance S.R.L.",
                nit_rut="1020304050",
                subdomain="elegance",
                status="ACTIVO",
                email="contacto@elegance.com",
                phone="+591 70011223",
            )
            db.add(elegance)
            db.flush()

            # Suscripción Plan Pro
            sub_elegance = Subscription(
                company_id=elegance.id,
                plan_id=pro_plan.id,
                status="ACTIVA",
            )
            db.add(sub_elegance)

            # Admin de Tenant
            admin_elegance = User(
                email="admin@elegance.com",
                hashed_password=hash_password("AdminElegance2026!"),
                rol=RolEnum.administrador,
                tenant_id=elegance.id,
                is_active=True,
            )
            db.add(admin_elegance)
            db.flush()

            profile_e = UserBodyProfile(
                user_id=admin_elegance.id,
                top_size="M",
                notes="Administradora General de Boutique Elegance",
            )
            db.add(profile_e)

            # Sucursales de Boutique Elegance
            branch_e1 = Branch(
                name="Boutique Elegance - Central",
                city="Santa Cruz",
                address="Calle René Moreno #245, Casco Viejo",
                phone="+591 3 3345678",
                opening_hours="Lun-Sáb: 09:00 - 20:00",
                latitude=-17.7833215,
                longitude=-63.1821408,
                tenant_id=elegance.id,
                is_default=True,
                is_active=True,
            )
            branch_e2 = Branch(
                name="Boutique Elegance - Equipetrol",
                city="Santa Cruz",
                address="Av. San Martín esq. Calle 7 Este, Equipetrol",
                phone="+591 3 3451234",
                opening_hours="Lun-Dom: 10:00 - 21:00",
                latitude=-17.7658120,
                longitude=-63.1952400,
                tenant_id=elegance.id,
                is_default=False,
                is_active=True,
            )
            branch_e3 = Branch(
                name="Boutique Elegance - Ventura Mall",
                city="Santa Cruz",
                address="4to Anillo esq. Av. San Martín, Ventura Mall Nivel 2",
                phone="+591 3 3889012",
                opening_hours="Lun-Dom: 10:00 - 22:00",
                latitude=-17.7542100,
                longitude=-63.1990300,
                tenant_id=elegance.id,
                is_default=False,
                is_active=True,
            )
            db.add_all([branch_e1, branch_e2, branch_e3])
            db.commit()
            print("   -> Tenant 'Boutique Elegance' creado con Plan PROFESIONAL y 3 sucursales geolocalizadas.")
            print("      Admin: admin@elegance.com | Clave: AdminElegance2026!")
        else:
            existing_branches = db.query(Branch).filter(Branch.tenant_id == elegance.id).all()
            coords = [
                (-17.7833215, -63.1821408, "Calle René Moreno #245, Casco Viejo", "+591 3 3345678", "Lun-Sáb: 09:00 - 20:00"),
                (-17.7658120, -63.1952400, "Av. San Martín esq. Calle 7 Este, Equipetrol", "+591 3 3451234", "Lun-Dom: 10:00 - 21:00"),
                (-17.7542100, -63.1990300, "4to Anillo esq. Av. San Martín, Ventura Mall Nivel 2", "+591 3 3889012", "Lun-Dom: 10:00 - 22:00"),
            ]
            for i, b in enumerate(existing_branches):
                if i < len(coords):
                    b.latitude = coords[i][0]
                    b.longitude = coords[i][1]
                    b.address = coords[i][2]
                    b.phone = coords[i][3]
                    b.opening_hours = coords[i][4]
            if len(existing_branches) == 2:
                branch_e3 = Branch(
                    name="Boutique Elegance - Ventura Mall",
                    city="Santa Cruz",
                    address="4to Anillo esq. Av. San Martín, Ventura Mall Nivel 2",
                    phone="+591 3 3889012",
                    opening_hours="Lun-Dom: 10:00 - 22:00",
                    latitude=-17.7542100,
                    longitude=-63.1990300,
                    tenant_id=elegance.id,
                    is_default=False,
                    is_active=True,
                )
                db.add(branch_e3)
            db.commit()
            print("   -> Tenant 'Boutique Elegance' verificado con sucursales georreferenciadas.")

        print("\n[4/4] Sembrando Tenant 2: 'Moda Urbana' (Plan Basico)...")
        urbana = db.query(Company).filter(Company.subdomain == "modaurbana").first()
        if not urbana:
            urbana = Company(
                name="Moda Urbana",
                business_name="Moda Urbana Retail S.A.",
                nit_rut="5040302010",
                subdomain="modaurbana",
                status="ACTIVO",
                email="contacto@modaurbana.com",
                phone="+591 78899001",
            )
            db.add(urbana)
            db.flush()

            # Suscripción Plan Básico
            sub_urbana = Subscription(
                company_id=urbana.id,
                plan_id=basic_plan.id,
                status="ACTIVA",
            )
            db.add(sub_urbana)

            # Admin de Tenant
            admin_urbana = User(
                email="admin@modaurbana.com",
                hashed_password=hash_password("AdminUrbana2026!"),
                rol=RolEnum.administrador,
                tenant_id=urbana.id,
                is_active=True,
            )
            db.add(admin_urbana)
            db.flush()

            profile_u = UserBodyProfile(
                user_id=admin_urbana.id,
                top_size="L",
                notes="Administrador General de Moda Urbana",
            )
            db.add(profile_u)

            # Sucursales de Moda Urbana (1 sucursal inicial, límite 2 en Plan Básico)
            branch_u1 = Branch(
                name="Moda Urbana - Casco Viejo",
                city="Cochabamba",
                address="Av. Heroínas esq. Ayacucho #120",
                phone="+591 4 4567890",
                opening_hours="Lun-Sáb: 09:00 - 19:30",
                latitude=-17.3935000,
                longitude=-66.1570000,
                tenant_id=urbana.id,
                is_default=True,
                is_active=True,
            )
            db.add(branch_u1)
            db.commit()
            print("   -> Tenant 'Moda Urbana' creado con Plan BASICO (max 2 sucursales) y 1 sucursal inicial.")
            print("      Admin: admin@modaurbana.com | Clave: AdminUrbana2026!")
        else:
            print("   -> Tenant 'Moda Urbana' ya existe.")

        print("\n*** Poblacion de datos SaaS completada con exito! ***")

    except Exception as exc:
        db.rollback()
        print(f"\n[ERROR] Error durante el seed SaaS: {exc}")
        raise exc
    finally:
        db.close()


if __name__ == "__main__":
    seed_saas_data()
