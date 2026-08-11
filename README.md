# Booking Configuration

A full-stack booking system with a Vue/Quasar frontend, Node.js backend API, and MySQL persistence.

## Prerequisites

- Docker
- Docker Compose
- Git

Optional for local non-Docker development:

- Node.js 22+
- npm

## Repository layout

- `backend/` — Express REST API and database logic
- `booking-configuration/` — Quasar frontend application
- `docker-compose.yml` — container orchestration
- `.env.example` — environment template
- `.env` — local environment values (create from `.env.example` and do not commit it)

## Quick start

1. Clone the repo
2. Create your environment file:

```bash
cp .env.example .env
```

3. Update the values in `.env` for your local environment.
4. Start the stack:

```bash
docker compose up --build
```

5. Open the frontend in a browser:

- Frontend: http://localhost:9000
- Backend API: http://localhost:5000

## Environment configuration

Create a `.env` file from `.env.example`. The project uses environment variables instead of hardcoded settings.

Use `DB_HOST=mysql` when the backend runs inside Docker. Do not use `localhost` for backend-to-MySQL communication inside Docker, because `localhost` inside the backend container refers to the backend container itself, not the MySQL container.

For local non-Docker backend runs, you can set `DB_HOST=localhost` instead.

### Required variables

```env
# MySQL container settings
MYSQL_DATABASE=booking_configuration
MYSQL_USER=booking_user
MYSQL_PASSWORD=change_me_strong_password
MYSQL_ROOT_PASSWORD=change_me_root_password
MYSQL_PORT=3306

# Backend
PORT=5000
CLIENT_ORIGIN=http://localhost:9000
CORS_ORIGINS=http://localhost:9000
DB_HOST=mysql
DB_PORT=3306
DB_NAME=booking_configuration
DB_USER=booking_user
DB_PASSWORD=change_me_strong_password
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1h

# Backend seed data (development only)
SEED_ADMIN_NAME=System Administrator
SEED_ADMIN_EMAIL=admin@local.test
SEED_ADMIN_PASSWORD=ChangeMe123!
SEED_USER_EMAIL=user@local.test
SEED_USER_PASSWORD=ChangeMe123!

# Frontend
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Booking Configuration
VITE_DEFAULT_CURRENCY=
FRONTEND_PORT=9000
```

## Docker architecture

```text
Browser
  ↓
Frontend container
  ↓
Backend container
  ↓
MySQL container
  ↓
Docker volume
```

The browser reaches the backend over the exposed host port (`http://localhost:5000`), while the backend reaches MySQL through the Docker service name `mysql`.

## Docker Compose services

- `mysql`: MySQL 8.0 container
- `backend`: Node.js API service
- `frontend`: Quasar/Vite frontend service

## MySQL persistence

MySQL data is stored in a named Docker volume:

```yaml
volumes:
  mysql_data:
```

This keeps data across `docker compose down` and `docker compose up` unless the volume is intentionally removed with:

```bash
docker compose down -v
```

`docker compose down -v` removes the named volume and deletes database data.

## Startup order and health checks

The Compose stack starts in this order:

1. MySQL starts
2. MySQL health check runs
3. Backend starts once MySQL is healthy
4. Backend runs database migration/bootstrap
5. Backend starts serving API requests
6. Frontend starts and connects to the backend via `VITE_API_URL`

## Database initialization and migrations

The backend uses a migration-style bootstrap command:

```bash
docker compose run --rm backend npm run db:migrate
```

The database schema is defined in `backend/schema.sql` and the migration script is `backend/scripts/db-migrate.js`.

Seed data is optional and explicitly controlled:

```bash
docker compose run --rm backend npm run db:seed
```

The seed process is idempotent and should not duplicate rows when already present.

## Basic commands

### Start the full stack

```bash
docker compose up --build
```

### Stop the stack

```bash
docker compose down
```

### Restart the stack

```bash
docker compose restart
```

### View logs

```bash
docker compose logs -f
```

```bash
docker compose logs -f backend
docker compose logs -f mysql
docker compose logs -f frontend
```

### Rebuild containers

```bash
docker compose up --build
```

### Reset MySQL data

```bash
docker compose down -v
```

This deletes the database volume and all persisted data.

## Accessing MySQL

From a local terminal, you can connect to the running MySQL container:

```bash
docker compose exec mysql mysql -u${MYSQL_USER} -p${MYSQL_DATABASE}
```

The password will be prompted interactively.

## MySQL Workbench

Use values from your `.env` file:

- Host: `localhost`
- Port: `3306`
- Username: `MYSQL_USER`
- Password: `MYSQL_PASSWORD`
- Database: `MYSQL_DATABASE`

## Health checks

Backend health endpoint:

```bash
curl http://localhost:5000/health
```

Example response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## Typical developer flow

```bash
git clone <repository>
cd <repo>
cp .env.example .env
# edit .env as needed
docker compose up --build
```

## Notes

- The project uses MySQL only for persistent application data.
- Local SQLite files and old SQLite-specific config were removed in favor of MySQL-backed persistence.
- Secrets, JWT values, and local database credentials are not committed to source control.
