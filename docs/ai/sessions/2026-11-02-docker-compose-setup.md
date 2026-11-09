# Sesión: 2026-11-02 — Configuración de Docker Compose y Optimización de Contenedores

## 1. Objetivo de la Sesión
Implementar la orquestación completa del proyecto mediante Docker Compose (`docker-compose.yml`) y optimizar la construcción de imágenes con `.dockerignore`, garantizando paridad entre local, staging y producción (Render/Railway), sin romper el flujo de trabajo ligero local en dos terminales.

## 2. Cambios Realizados

### Infraestructura y Docker
1. **[`docker-compose.yml`](file:///c:/Users/PERSONAL/ecommerce-SI2/docker-compose.yml):**
   - **`db`:** PostgreSQL 16 Alpine con healthcheck (`pg_isready`), volumen persistente `postgres_data` y puerto expuesto `5432:5432`.
   - **`backend`:** FastAPI en Python 3.12 con `alembic upgrade head` automático al inicio, expuesto en puerto `8000:8000`, conectado a la red interna y configurado para heredar variables de entorno.
   - **`frontend`:** Angular PWA servido sobre Nginx unprivileged en puerto `8080:8080`, inyectando dinámicamente `API_BASE_URL` al arrancar.
   - Red puente unificada `fashionstore_net`.
2. **[`.dockerignore`](file:///c:/Users/PERSONAL/ecommerce-SI2/.dockerignore):**
   - Exclusión en la raíz de `node_modules`, `.angular`, `.venv`, `__pycache__`, datasets pesados (`images.csv`, `styles.csv`), `.git`, `.agents`, y documentación.
3. **[`backend/Dockerfile`](file:///c:/Users/PERSONAL/ecommerce-SI2/backend/Dockerfile):**
   - Inclusión de `backend/seed_saas.py` para permitir la ejecución de seeds iniciales directamente dentro del contenedor si se desea.

### Documentación y Registro
- **[`docs/ai/DECISIONS_LOG.md`](file:///c:/Users/PERSONAL/ecommerce-SI2/docs/ai/DECISIONS_LOG.md):** Adición del Registro 20.

## 3. Instrucciones de Prueba

Para levantar el entorno completo con Docker:
1. Abrir **Docker Desktop** en Windows y esperar a que el motor esté listo (*Engine running*).
2. En la terminal de la raíz del proyecto, ejecutar:
   ```powershell
   docker compose up --build
   ```
3. Verificar en el navegador:
   - **Frontend:** http://localhost:8080
   - **Backend API Docs:** http://localhost:8000/docs
   - **Healthcheck:** http://localhost:8000/health
4. Para apagar los contenedores:
   ```powershell
   docker compose down
   ```
   *(Si deseas eliminar también los datos de la base de datos en volumen: `docker compose down -v`)*.
