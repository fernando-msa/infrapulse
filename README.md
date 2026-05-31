# InfraPulse

> SaaS platform for IT support operations -- SLA tracking, team performance, and operational intelligence.

[![CI](https://github.com/fernando-msa/infrapulse/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fernando-msa/infrapulse/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-e0234e?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-ffca28?logo=firebase&logoColor=black)](https://firebase.google.com/)

---

## Overview

InfraPulse is a multi-tenant SaaS platform built for IT support teams that need to scale with predictability and governance. It provides real-time SLA monitoring, intelligent alerting, team performance tracking, and full audit trails -- all with per-company data isolation.

The platform solves a common problem in IT operations: as teams grow, visibility into SLA compliance, technician workload, and resolution trends becomes fragmented. InfraPulse centralizes this operational data into actionable dashboards with role-based access for administrators, managers, and analysts.

## Key Features

- **Multi-Tenant Architecture** -- Strict data isolation per company via JWT-embedded `companyId` enforced at the middleware layer
- **Role-Based Access Control** -- Three roles (Admin, Manager, Analyst) with granular permissions on sensitive operations
- **SLA Management** -- Configurable SLA rules per priority level with real-time status tracking (OK / At Risk / Violated)
- **Executive & Operational Dashboards** -- KPIs, trend analysis, technician queue visualization, and risk indicators
- **Intelligent Alerts** -- Automated detection of SLA breaches, overloaded teams, critical unassigned tickets, and queue bottlenecks
- **Audit Trail** -- Complete change history with IP, user agent, and before/after diffs for LGPD and ISO 27001/9001 compliance
- **CSV/Excel Import** -- Guided 3-step wizard for bulk ticket loading with column mapping
- **Report Generation** -- Filtered reports with CSV export for operational analysis
- **Subscription Management** -- Plan-based quotas (Trial, Starter, Growth, Enterprise) with seat and ticket limits

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js    │────>│    NestJS API     │────>│   Firestore /   │
│   Frontend   │     │   (Cloud Run)     │     │   PostgreSQL    │
│   (Vercel)   │<────│                  │<────│                 │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

The backend implements a **dual data provider** pattern controlled by `DATA_PROVIDER`:

- **Firestore** (primary) -- Production path using `firebase-admin` SDK
- **PostgreSQL + Prisma** (legacy) -- Local development path with seed data

Every authenticated request passes through `TenantIsolationMiddleware`, which extracts `companyId` from the JWT and enforces it as a mandatory filter on all database queries.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| **Backend** | NestJS 11, TypeScript, class-validator, Swagger |
| **Auth** | JWT (Passport), bcryptjs, RBAC guards |
| **Database** | Firebase Cloud Firestore / PostgreSQL (Prisma ORM) |
| **Infrastructure** | Docker, GitHub Actions CI/CD |
| **Deploy** | Vercel (frontend), Google Cloud Run (backend) |

## API Reference

| Resource | Endpoints | Auth |
|----------|-----------|------|
| **Auth** | `POST /login`, `POST /signup-company` | Public |
| **Tickets** | CRUD, queue, SLA recalculation | JWT |
| **Users** | List, create, technicians | JWT + RBAC |
| **Dashboard** | Executive, operational | JWT |
| **Alerts** | Detect, list, acknowledge, resolve | JWT |
| **Audit** | History, company logs, compliance export | JWT |
| **Reports** | Ticket reports, CSV export | JWT |
| **Import** | Upload, process, batch history | JWT |
| **Companies** | Current, plan management | JWT |
| **Metrics** | SLA, teams, incidents | Rate-limited |

Full interactive documentation available at `/api/docs` (development mode).

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for local PostgreSQL)
- Firebase project with Firestore enabled (for production mode)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/fernando-msa/infrapulse.git
cd infrapulse

# Start with Docker (PostgreSQL + Backend + Frontend)
docker compose up

# Or run locally:
# Backend
cd backend
cp .env.example .env    # Configure your environment variables
npm install
npx prisma migrate dev  # Set up PostgreSQL schema
npx prisma db seed      # Load 1200+ demo tickets
npm run start:dev

# Frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`
- Swagger Docs: `http://localhost:3001/api/docs`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for JWT signing (use `openssl rand -hex 32`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DATA_PROVIDER` | No | `firebase` for Firestore, omit for PostgreSQL |
| `CORS_ORIGIN` | No | Allowed CORS origin (default: `http://localhost:3000`) |
| `FIREBASE_PROJECT_ID` | If using Firebase | GCP project ID |
| `FIREBASE_CLIENT_EMAIL` | If using Firebase | Service account email |
| `FIREBASE_PRIVATE_KEY` | If using Firebase | Service account private key |

## Security

InfraPulse implements defense-in-depth security:

- **Authentication**: JWT with bcrypt-hashed passwords (cost factor 10)
- **Authorization**: Role-based guards on sensitive endpoints (user creation, plan management)
- **Tenant Isolation**: Global middleware enforcing `companyId` on every authenticated query
- **Input Validation**: `class-validator` with `whitelist: true` and `forbidNonWhitelisted: true`
- **Rate Limiting**: Global rate limits with stricter thresholds on auth endpoints
- **Security Headers**: Helmet middleware for HSTS, CSP, X-Frame-Options, and more
- **Audit Logging**: Automatic capture of create/update/delete operations with IP and user agent
- **CORS**: Configurable origin restriction (not wildcard)

## Testing

```bash
# Backend unit tests
cd backend && npm test

# Frontend unit tests
cd frontend && npm test

# Backend with coverage
cd backend && npm run test:cov
```

## Deployment

| Component | Platform | Trigger |
|-----------|----------|---------|
| Frontend | Vercel | Push to `main` |
| Backend | Google Cloud Run | Docker image build |
| CI/CD | GitHub Actions | Push / PR to `main` |

The CI pipeline runs lint, tests, and build for both frontend and backend on every push.

## License

MIT -- see [LICENSE](LICENSE) for details.
