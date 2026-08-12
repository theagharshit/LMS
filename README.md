# Sikshya LMS - Enterprise Learning Management System

Sikshya LMS is a modern, AI-powered Learning Management System built for schools. It integrates real-time academic workflows, student tracking, teacher grading, parent insights, Google Gemini AI assistants, PostgreSQL relational database persistence with Prisma ORM, and Role-Based Access Control (RBAC).

---

## Workspace Architecture

Sikshya LMS is structured as an npm workspaces monorepo:

- **`apps/backend`**: Express.js REST API server with Prisma ORM 7, PostgreSQL, JWT Authentication, and WebSockets.
- **`apps/frontend`**: React 19, TypeScript, TailwindCSS, and Recharts single-page application built with Vite 6.
- **`packages/shared`**: Shared TypeScript types, data models, utility functions, and mock state configurations.

---

## Quick Start

### 1. Installation

Clone the repository and install workspace dependencies:

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in `apps/backend/.env`:

```env
PORT=3001
NODE_ENV=development
LOG_LEVEL=normal
JWT_SECRET=your_secure_jwt_secret_key
DATABASE_URL="postgresql://lms:lms_local_password@localhost:5432/lms_db?schema=public"
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### 3. Database Migration and Seeding

Apply Prisma migrations to your PostgreSQL instance and seed initial administrative, teacher, student, and parent records:

```bash
# Apply committed Prisma migrations
npm run prisma:deploy

# Seed database with initial records
npm run seed
```

### 4. Running Development Servers

Start both frontend and backend concurrently in development mode:

```bash
npm run dev
```

The application will be accessible at:

- **Frontend App**: `http://localhost:5173` (or `http://localhost:5174`)
- **Backend API**: `http://localhost:3001`

---

| `npm run dev`             | Root      | Start frontend and backend concurrently in development mode                  |
| `npm run dev:v`           | Root      | Start development server with verbose HTTP payload logging                   |
| `npm run build`           | Root      | Compile frontend (Vite) and backend (Esbuild) production bundles             |
| `npm run test`            | Root      | Execute full automated test suite (1,390+ unit, integration, and RBAC tests) |
| `npm run prod`            | Root      | Build and run production server bundles                                      |
| `npm run prisma:generate` | Root      | Generate Prisma Client TypeScript types from schema.prisma                   |
| `npm run prisma:deploy`   | Root      | Apply all pending committed Prisma migrations to database                    |
| `npm run prisma:status`   | Root      | Check status of database migrations                                          |
| `npm run seed`            | Backend   | Seed PostgreSQL database with initial test users and classrooms              |
| `npm run format`          | Root      | Format entire codebase using Prettier                                        |
| `npm run lint`            | Root      | Run TypeScript type checking across all workspace packages                   |

---

## Database Migrations and Schema Management

This project uses Prisma ORM 7 with PostgreSQL. Follow the procedures below for all schema updates, migration deployments, and client generation.

### 1. Generating Prisma Client Types

Whenever you modify `apps/backend/prisma/schema.prisma` or pull changes containing schema updates, regenerate the Prisma Client TypeScript definitions:

```bash
# From workspace root
npm run prisma:generate

# Or directly in apps/backend
cd apps/backend && npx prisma generate
```

### 2. Creating New Migrations (Development)

To make schema modifications and generate a new SQL migration file:

1. Update `apps/backend/prisma/schema.prisma` with your model changes.
2. Run `prisma migrate dev` with a descriptive migration name:

```bash
# From workspace root
npm exec -w lms-backend -- prisma migrate dev --name <migration_name>

# Example
npm exec -w lms-backend -- prisma migrate dev --name add_user_secondary_phone
```

This command will:
- Generate a new migration folder under `apps/backend/prisma/migrations/`.
- Apply the SQL migration to your local PostgreSQL database.
- Automatically regenerate the Prisma Client types.

### 3. Deploying Pending Migrations (Staging / Production / CI)

To apply existing, committed migration files to a target database without creating new migration files:

```bash
# From workspace root
npm run prisma:deploy

# Or directly in apps/backend
cd apps/backend && npx prisma migrate deploy
```

### 4. Checking Migration Status

To check if your database schema is up-to-date or if there are unapplied migrations:

```bash
# From workspace root
npm run prisma:status

# Or directly in apps/backend
cd apps/backend && npx prisma migrate status
```

### 5. Seeding Database Records

To populate the database with default administrative, teacher, student, and parent test records:

```bash
# From workspace root
npm run seed

# Or directly in apps/backend
cd apps/backend && npx prisma db seed
```

### 6. Resetting Development Database

If you need to drop the local database, re-apply all migrations from scratch, and re-seed data:

```bash
# From workspace root
npm exec -w lms-backend -- prisma migrate reset
```

### 7. Opening Visual Database GUI (Prisma Studio)

To inspect and manage database records visually in your browser:

```bash
# From workspace root
npm exec -w lms-backend -- npx prisma studio
```

Prisma Studio will launch locally at `http://localhost:5555`.

---

## Security and Authentication Architecture

- **JWT Tokens**: Authentication uses JSON Web Tokens signed with HS256 algorithm. Tokens are generated on `/api/auth/login` and automatically attached by `apiFetch` in request headers (`Authorization: Bearer <token>`).
- **Role-Based Access Control (RBAC)**: Strict role guards restrict endpoints to designated user roles (`admin`, `principal`, `teacher`, `student`, `parent`). Unauthorized access attempts return HTTP 403 Forbidden.
- **Atomic Transactions**: Complex onboarding workflows, such as enrolling a new student and linking or creating parent accounts, execute inside atomic `prisma.$transaction` blocks to ensure database consistency.

---

## Containerization with Docker

Sikshya LMS includes multi-stage Docker builds and Docker Compose orchestration for local development, testing, and production environments.

### Prerequisites

Before using Docker, ensure Docker Desktop or the Docker Engine daemon is installed and running on your system.

### Dockerfile Multi-Stage Build Architecture

The project `Dockerfile` uses a four-stage build pipeline to produce lightweight production images:

1. **`dependencies`**: Copies package manifests and installs workspace dependencies (`npm ci`), then compiles the Prisma ORM Client (`prisma generate`).
2. **`build`**: Copies all workspace source code and compiles production server bundles (backend esbuild -> `dist/server.cjs` and frontend Vite bundle -> `dist/`).
3. **`backend-runtime`**: Production container for `lms-backend`. Runs the API server on port 3001 and includes HTTP health checks via `/api/health`.
4. **`frontend-runtime`**: Production preview container for `lms-frontend`. Serves compiled assets on port 4173.

### Docker Compose Orchestration

Docker Compose manages all application services in proper dependency order. The one-shot `migrate` service runs `prisma migrate deploy` after PostgreSQL is healthy; the backend starts only after that service completes successfully. This applies pending committed migrations and never resets or seeds the database.

#### 1. Start All Services

Execute the following command in the project root:

```bash
JWT_SECRET="your_jwt_secret_key" docker compose up --build
```

To run containers in background (detached) mode:

```bash
JWT_SECRET="your_jwt_secret_key" docker compose up -d --build
```

#### 2. Service Architecture Matrix

| Service    | Image / Target       | Container Port | Purpose                                                 |
| :--------- | :------------------- | :------------- | :------------------------------------------------------ |
| `postgres` | `postgres:17-alpine` | `5432`         | Relational PostgreSQL database engine with healthchecks |
| `redis`    | `redis:7-alpine`     | `6379`         | In-memory cache store and rate limiter                  |
| `migrate`  | `backend-runtime`    | —              | One-shot Prisma migration deployment before API startup |
| `backend`  | `backend-runtime`    | `3001`         | Express REST API server, WebSockets, and Prisma ORM     |
| `frontend` | `frontend-runtime`   | `4173`         | Production preview web server                           |

#### 3. View Logs and Monitor Services

```bash
# View real-time logs for all services
docker compose logs -f

# View logs for backend service only
docker compose logs -f backend

# Check status of running containers
docker compose ps
```

#### 4. Stop All Services

```bash
docker compose down
```

#### 5. Building Individual Target Images

To build specific image targets from the `Dockerfile` independently:

```bash
# Build backend production image
docker build --target backend-runtime -t lms-backend:latest .

# Build frontend production image
docker build --target frontend-runtime -t lms-frontend:latest .
```

---

## Automated Test Coverage

Sikshya LMS contains **1,390 automated tests** covering backend API endpoints, database operations, security policies, and frontend components:

- **RBAC Matrix Tests (200 tests)**: Parameterized testing of 40 endpoints against 5 user roles to verify permission boundaries.
- **Frontend Component Render Matrix (460 tests)**: Testing component rendering across UI states and role contexts.
- **Security and JWT Tests (30 tests)**: Validation of token signing, expiration, signature tampering, and header handling.
- **Database Service Unit Tests (230 tests)**: Direct unit testing of CRUD operations, relationships, and queries.
- **Role Workflow Tests (470 tests)**: Functional integration tests simulating real user actions for students, teachers, parents, and administrators.

To run the complete test suite:

```bash
npm run test
```

---

## License

MIT License - Sikshya LMS.
