from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.packages.p0_saas_plataforma.models.company import Company
from app.packages.p0_saas_plataforma.models.plan import Plan
from app.packages.p0_saas_plataforma.models.subscription import Subscription
from app.packages.p0_saas_plataforma.schemas.company_schema import (
    CompanyCreate,
    CompanyUpdate,
)
from app.packages.p1_gestion_usuarios_acceso.models.user import User
from app.packages.p1_gestion_usuarios_acceso.models.user_profile import UserBodyProfile
from app.packages.p1_gestion_usuarios_acceso.schemas.enums import RolEnum, GenderEnum
from app.auth.hash import hash_password


def get_default_or_by_code_plan(db: Session, plan_code: str) -> Plan:
    clean_code = plan_code.lower().strip()
    plan = db.query(Plan).filter(Plan.code == clean_code, Plan.is_active.is_(True)).first()
    if not plan:
        # Si no existe, crear los planes estandar si la tabla esta vacia
        if clean_code in ("enterprise", "empresarial"):
            plan = Plan(name="EMPRESARIAL", code="enterprise", max_branches=223, has_ai_access=True, price_monthly=199.00)
        elif clean_code in ("pro", "profesional"):
            plan = Plan(name="PROFESIONAL", code="pro", max_branches=10, has_ai_access=True, price_monthly=99.00)
        else:
            plan = Plan(name="BASICO", code="basic", max_branches=3, has_ai_access=False, price_monthly=29.00)
        db.add(plan)
        db.commit()
        db.refresh(plan)
    return plan


def create_tenant(db: Session, company_data: CompanyCreate) -> tuple[Company, User | None]:
    # 1. Validar unicidad de subdominio
    normalized_subdomain = company_data.subdomain.strip().lower()
    existing_subdomain = db.query(Company).filter(Company.subdomain == normalized_subdomain).first()
    if existing_subdomain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El subdominio '{normalized_subdomain}' ya se encuentra registrado por otra empresa.",
        )

    # 2. Validar unicidad de NIT/RUT
    normalized_nit = company_data.nit_rut.strip()
    existing_nit = db.query(Company).filter(Company.nit_rut == normalized_nit).first()
    if existing_nit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El NIT/RUT '{normalized_nit}' ya está registrado en el sistema.",
        )

    # 3. Crear entidad Company
    company = Company(
        name=company_data.name.strip(),
        business_name=company_data.business_name.strip(),
        nit_rut=normalized_nit,
        subdomain=normalized_subdomain,
        email=company_data.email.strip().lower() if company_data.email else None,
        phone=company_data.phone.strip() if company_data.phone else None,
        status="ACTIVO",
    )
    db.add(company)
    db.flush()

    # 4. Asignar Plan y crear Suscripción Inicial
    plan = get_default_or_by_code_plan(db, company_data.plan_code)
    subscription = Subscription(
        company_id=company.id,
        plan_id=plan.id,
        status="ACTIVA",
    )
    db.add(subscription)

    # 5. Si se proporcionaron credenciales de Administrador Inicial, crearlo
    admin_user = None
    if company_data.admin_email and company_data.admin_password:
        admin_email = company_data.admin_email.strip().lower()
        existing_user = db.query(User).filter(User.email == admin_email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El correo de administrador '{admin_email}' ya pertenece a otro usuario registrado.",
            )

        admin_user = User(
            email=admin_email,
            hashed_password=hash_password(company_data.admin_password),
            rol=RolEnum.administrador,
            tenant_id=company.id,
            is_active=True,
        )
        db.add(admin_user)
        db.flush()

        profile = UserBodyProfile(
            user_id=admin_user.id,
            name=company_data.admin_name.strip() if company_data.admin_name else company_data.name,
            gender=GenderEnum.femenino,
        )
        db.add(profile)

    db.commit()
    db.refresh(company)
    if admin_user:
        db.refresh(admin_user)

    return company, admin_user


def get_company(db: Session, company_id: UUID) -> Company:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con ID {company_id} no encontrada.",
        )
    return company


def get_company_by_subdomain(db: Session, subdomain: str) -> Company:
    company = db.query(Company).filter(Company.subdomain == subdomain.strip().lower()).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empresa con subdominio '{subdomain}' no encontrada.",
        )
    return company


def list_companies(db: Session, skip: int = 0, limit: int = 50, status_filter: str | None = None) -> list[Company]:
    query = db.query(Company)
    if status_filter:
        query = query.filter(Company.status == status_filter.upper())
    return query.order_by(Company.created_at.desc()).offset(skip).limit(limit).all()


def update_company(db: Session, company_id: UUID, update_data: CompanyUpdate) -> Company:
    company = get_company(db, company_id)
    if update_data.name is not None:
        company.name = update_data.name.strip()
    if update_data.business_name is not None:
        company.business_name = update_data.business_name.strip()
    if update_data.email is not None:
        company.email = update_data.email.strip().lower()
    if update_data.phone is not None:
        company.phone = update_data.phone.strip()
    db.commit()
    db.refresh(company)
    return company


def set_company_status(db: Session, company_id: UUID, new_status: str) -> Company:
    company = get_company(db, company_id)
    company.status = new_status.upper()
    db.commit()
    db.refresh(company)
    return company
