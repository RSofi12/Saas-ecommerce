# FashionStore — Plataforma E-Commerce SaaS Multitenant

Sistema integral de comercio electrónico multitenant para boutiques y tiendas de moda, compuesto por una API REST en FastAPI, un frontend web PWA en Angular 21 y una aplicación móvil en Flutter.

---

## 🏗️ Estructura del Proyecto

- [`backend/`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/) - API REST construida con **FastAPI**, **SQLAlchemy ORM**, **Alembic** y **PostgreSQL**. Arquitectura modular dividida en paquetes de dominio (`p0` a `p6`).
- [`frontend/`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/) - Aplicación Web Progresiva (**PWA**) desarrollada en **Angular 21**, **TailwindCSS**, componentes **Spartan/Helm UI**, IndexedDB para modo offline e integración con Stripe y Firebase Cloud Messaging.
- [`mobile/`](file:///c:/Users/PERSONAL/ecommerce-SI2/mobile/) - Aplicación móvil desarrollada en **Flutter (Dart)** con persistencia local en SQLite (`sqflite`), geolocalización y mapas con OpenStreetMap.
- [`docs/`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/) - Especificaciones de casos de uso (ICONIX), arquitectura, políticas de negocio y bitácoras de diseño.

---

## 📋 Requisitos del Sistema

| Componente | Versión Requerida | Notas importantes |
| :--- | :--- | :--- |
| **Docker (Opcional)** | Docker Desktop 4.x+ | Para levantar todo el stack orquestado en contenedores. |
| **Backend** | Python **3.12** | **Evitar Python 3.14**: paquetes fijados en `requirements.txt` no tienen wheels precompilados para 3.14 y fallarán al compilar en C++. |
| **Base de Datos** | PostgreSQL **15+** | Servicio activo en local o remoto (o gestionado por Docker). |
| **Frontend** | Node.js **20.19.x** o **22.13.x+** | Versiones LTS obligatorias. No usar versiones impares como Node 21. npm 10+. |
| **Mobile** | Flutter SDK **3.x+** / Dart SDK | Android Studio / VS Code con extensiones Flutter. |

---

## 🚀 Puesta en Marcha

Tienes dos alternativas para levantar y probar el proyecto:

---

### 🐳 Opción A: Docker Compose (Recomendado para Pruebas Integrales y Staging)

Permite levantar todo el stack (**PostgreSQL 16**, **FastAPI Backend** y **Angular Frontend**) con un solo comando desde la raíz del proyecto, sin necesidad de instalar dependencias de Python o Node localmente.

> [!NOTE]
> Requiere tener **Docker Desktop** iniciado y en ejecución en Windows/Linux/macOS.

#### 1. Iniciar los contenedores:
```powershell
docker compose up --build
```
*(Para ejecutarlo en segundo plano, añade la bandera `-d`: `docker compose up --build -d`)*.

#### 2. Servicios disponibles:
- **Frontend Web PWA:** [http://localhost:8080](http://localhost:8080)
- **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Healthcheck API:** [http://localhost:8000/health](http://localhost:8000/health)
- **Base de Datos PostgreSQL:** Puerto `5432`

#### 3. Comandos útiles de Docker Compose:
- **Ver logs en tiempo real:**
  ```powershell
  docker compose logs -f
  # o de un servicio específico:
  docker compose logs -f backend
  ```
- **Poblar base de datos con datos demo (seed inicial):**
  ```powershell
  docker compose exec backend python seed_saas.py
  ```
- **Detener los servicios:**
  ```powershell
  docker compose down
  ```
- **Detener y reiniciar desde cero (eliminando volúmenes de PostgreSQL):**
  ```powershell
  docker compose down -v
  ```

---

### 💻 Opción B: Ejecución Ligera en Terminales Nativas (Bajo Consumo de RAM)

Ideal para el desarrollo diario continuo, recarga rápida (*hot-reload*) y mínimo consumo de recursos del sistema.

#### 1. Backend (FastAPI + PostgreSQL)

##### Primera vez:
1. Abre una terminal en la carpeta `backend/` y crea el entorno virtual:
   ```powershell
   cd backend
   py -3.12 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
   *(En Linux / macOS o Git Bash: `source .venv/bin/activate` | En CMD: `.\.venv\Scripts\activate.bat`)*

2. Instala las dependencias:
   ```powershell
   python -m pip install --upgrade pip
   python -m pip install -r requirements.txt
   ```

3. Configura las variables de entorno:
   ```powershell
   Copy-Item .env.example .env
   ```
   Edita `.env` con la URL de tu base de datos:
   ```env
   DATABASE_URL=postgresql+psycopg2://postgres:TU_PASSWORD@localhost:5432/tu_db
   SECRET_KEY=clave_secreta_para_jwt_super_segura
   ACCESS_TOKEN_EXPIRE_MINUTES=60
   ALGORITHM=HS256
   ```

4. Aplica las migraciones de Alembic y puebla los datos iniciales de prueba:
   ```powershell
   python -m alembic upgrade head
   python seed.py
   ```

##### Ejecuciones siguientes:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m alembic upgrade head   # si hubo migraciones nuevas de tu equipo
python -m uvicorn main:app --reload
```
- **API Base:** `http://127.0.0.1:8000`
- **Documentación Swagger UI:** `http://127.0.0.1:8000/docs`
- **Documentación ReDoc:** `http://127.0.0.1:8000/redoc`

---

#### 2. Frontend (Angular 21 PWA)

##### Versión de Node requerida:
El proyecto valida la versión con `scripts/check-node.mjs`. Si usas NVM o FNM:
```bash
nvm use 22
# o si usas fnm:
fnm use 22
```

##### Primera vez (Instalación de dependencias):
Abre una terminal en `frontend/`:

```powershell
cd frontend
npm install --legacy-peer-deps --ignore-scripts
```

> [!TIP]
> **¿Por qué esos flags?**
> - `--legacy-peer-deps`: Necesario para resolver restricciones estrictas entre componentes Spartan UI y librerías de Angular 21.
> - `--ignore-scripts`: **Crucial en Windows**. Evita que librerías nativas de IA/C++ (`sharp`, `onnxruntime-node`) intenten compilar con `node-gyp` o descarguen binarios que cuelgan la terminal durante horas. La instalación terminará en 1 a 3 minutos.

##### Verificación rápida de la instalación:
Comprueba que los tipos de TypeScript se instalaron correctamente:
```powershell
Test-Path node_modules/@angular/core/types
```
*(Debe responder `True`)*

##### Ejecuciones siguientes (Levantar servidor local):
```powershell
cd frontend
npm run start
```
Luego abre tu navegador en **`http://localhost:4200/`**.

> [!NOTE]
> El frontend se comunica con el backend en `http://localhost:8000/api` (definido en [`frontend/src/environments/environment.ts`](file:///c:/Users/PERSONAL/ecommerce-SI2/frontend/src/environments/environment.ts)). Asegúrate de que el backend esté corriendo.

---

#### 3. Mobile (Flutter)

##### Primera vez:
1. Abre una terminal en `mobile/`:
   ```bash
   cd mobile
   flutter pub get
   ```

2. Verifica dispositivos conectados o emuladores:
   ```bash
   flutter devices
   ```

3. Inicia la aplicación:
   ```bash
   flutter run
   ```

> [!IMPORTANT]
> **Consumo desde Emulador Android**:
> El emulador de Android mapea `localhost` de tu PC a la IP especial `10.0.2.2`. Si pruebas la app móvil contra tu backend local, arranca el backend con:
> ```powershell
> python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
> ```
> y apunta la URL base de la app a `http://10.0.2.2:8000/api`.

---

## 👥 Credenciales Demo para Pruebas

El script `python seed.py` genera usuarios de prueba para todos los roles del sistema. Todas las cuentas comparten la contraseña: **`Fashion123!`**

| Rol | Correo Electrónico | Alcance / Permisos |
| :--- | :--- | :--- |
| **Admin Global** | `admin.global@fashionstore.bo` | Configuración SaaS, planes y tenants. |
| **Admin Sucursal** | `admin.lp@fashionstore.bo`<br>`admin.sc@fashionstore.bo`<br>`admin.cbba@fashionstore.bo` | Gestión completa de sucursal (La Paz, Santa Cruz, Cbba). |
| **Encargado** | `encargada.lp@fashionstore.bo`<br>`encargado.sc@fashionstore.bo` | Control de stock, inventario y solicitudes de reposición. |
| **Cajero** | `cajera.lp@fashionstore.bo`<br>`cajero.sc@fashionstore.bo` | Ventas POS, cobros y registro de clientes. |
| **Delivery** | `delivery1@fashionstore.bo`<br>`delivery2@fashionstore.bo` | Gestión y confirmación de despachos y entregas. |
| **Cliente** | `cliente01.demo@fashionstore.bo` | Catálogo público, reservas, carrito y probador virtual. |

---

## 🛠️ Comandos Frecuentes y Resolución de Problemas

### Base de datos y Migraciones (Backend)
- **Crear nueva migración tras cambiar modelos:**
  ```powershell
  python -m alembic revision -m "descripcion_del_cambio"
  ```
- **Aplicar migraciones pendientes:**
  ```powershell
  python -m alembic upgrade head
  ```
- **Revertir la última migración aplicada:**
  ```powershell
  python -m alembic downgrade -1
  ```

### Reinstalación limpia del Frontend (si ocurre corrupción en Windows)
Si una instalación se canceló abruptamente o faltan tipos de TypeScript:
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install --legacy-peer-deps --ignore-scripts
```

> [!CAUTION]
> **Nunca ejecutes `npm audit fix --force`**: Esto forzará la actualización de versiones mayores rompiendo la compatibilidad entre paquetes del frontend.
