# InfraPulse

[![CI](https://github.com/fernando-msa/infrapulse/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fernando-msa/infrapulse/actions/workflows/ci.yml)

Plataforma SaaS para gestão operacional de suporte de TI com foco em SLA, produtividade e risco.

O produto atende operações de help desk, service desk e centrais de atendimento que precisam:

- controlar volume e criticidade de chamados
- acompanhar cumprimento de SLA
- reduzir risco operacional por fila e equipe
- operar em modelo multiempresa (multi-tenant) com isolamento de dados

## O que o InfraPulse entrega

- Onboarding self-service de empresa e administrador
- Autenticação JWT com perfis (`ADMIN`, `GESTOR`, `ANALISTA`)
- Dashboard executivo com KPIs de SLA e risco
- Dashboard operacional com fila por técnico
- Gestão de assinatura por plano com limites por empresa
- Importação de CSV/Excel para carga de chamados
- Alertas de risco e relatórios com exportação CSV

## Prints (visão rápida)

### Cadastro de empresa (onboarding SaaS)

![Cadastro da empresa](docs/prints/signup-empresa.svg)

### Dashboard executivo

![Dashboard executivo](docs/prints/dashboard-executivo.svg)

### Assinatura e planos

![Assinatura e planos](docs/prints/assinatura-planos.svg)

## Exemplo prático de uso

### 1. Criar empresa + admin (onboarding)

```bash
curl -X POST http://localhost:3001/api/auth/signup-company \
   -H "Content-Type: application/json" \
   -d '{
      "companyName": "Acme Support",
      "adminName": "Maria Admin",
      "adminEmail": "maria@acme.com",
      "adminPassword": "SenhaForte123"
   }'
```

Resposta esperada (resumo):

```json
{
   "access_token": "<jwt>",
   "user": {
      "id": "...",
      "email": "maria@acme.com",
      "role": "ADMIN",
      "companyId": "..."
   }
}
```

### 2. Consultar uso da empresa atual

```bash
curl -X GET http://localhost:3001/api/companies/current \
   -H "Authorization: Bearer <jwt>"
```

### 3. Criar chamado (com validação de cota do plano)

```bash
curl -X POST http://localhost:3001/api/tickets \
   -H "Authorization: Bearer <jwt>" \
   -H "Content-Type: application/json" \
   -d '{
      "title": "Erro no checkout",
      "description": "Pagamento retorna timeout",
      "priority": "HIGH",
      "status": "OPEN"
   }'
```

## Fluxo SaaS

1. Acesse `/signup` no frontend.
2. Cadastre empresa e administrador.
3. O sistema cria automaticamente:
    - empresa em `TRIAL` (14 dias)
    - usuário administrador
    - sessão autenticada
4. Acompanhe consumo e faça upgrade em `/assinatura`.

### Planos disponíveis

| Plano | Usuários ativos | Chamados/mês |
| ----- | --------------- | ------------ |
| `TRIAL` | 5 | 200 |
| `STARTER` | 15 | 2.000 |
| `GROWTH` | 50 | 10.000 |
| `ENTERPRISE` | 500 | 100.000 |

## Endpoints principais

### Auth

- `POST /api/auth/login`
- `POST /api/auth/signup-company`

### Companies

- `GET /api/companies/current`
- `PATCH /api/companies/current/plan` (somente `ADMIN`)

### Tickets

- `GET /api/tickets`
- `GET /api/tickets/queue`
- `GET /api/tickets/:id`
- `POST /api/tickets`
- `PUT /api/tickets/:id`
- `POST /api/tickets/recalculate-sla`

### Regras de proteção ativas

- Criação de usuário respeita limite de assentos do plano
- Criação de chamado respeita cota mensal do plano
- Login bloqueia empresa inativa, trial expirado e assinatura cancelada/inadimplente
- Busca/atualização de chamados com isolamento por `companyId`

## Stack

| Camada | Tecnologia |
| ------ | ---------- |
| Frontend | Next.js 14 + TypeScript |
| Estilo | Tailwind CSS + shadcn/ui |
| Backend | NestJS |
| Banco | PostgreSQL |
| ORM | Prisma |
| Auth | JWT |
| Infra | Docker + Docker Compose |

## Estrutura do monorepo

```text
infrapulse/
├── frontend/        # App Next.js
├── backend/         # API NestJS
├── docs/prints/     # Prints e imagens do README
├── docker-compose.yml
└── README.md
```

## Pré-requisitos

- Node.js 18+
- Docker + Docker Compose
- npm ou yarn

## Rodando com Docker (recomendado)

```bash
git clone https://github.com/fernando-msa/infrapulse.git
cd infrapulse
docker-compose up --build
```

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:3001>
- Swagger: <http://localhost:3001/api/docs>
- PostgreSQL: `localhost:5432`

## Rodando localmente (sem Docker)

### Backend (local)

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma generate
npx prisma db seed
npm run start:dev
```

### Frontend (local)

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## Usuários do seed

| Email | Senha | Perfil |
| ----- | ----- | ------ |
| `admin@infrapulse.com` | admin123 | Admin |
| `gestor@infrapulse.com` | gestor123 | Gestor |
| `analista@infrapulse.com` | analista123 | Analista |

## Variáveis de ambiente

### Backend (`backend/.env.example`)

```env
DATABASE_URL=postgresql://infrapulse:infrapulse@localhost:5432/infrapulse
JWT_SECRET=sua_chave_jwt_super_secreta
JWT_EXPIRES_IN=7d
PORT=3001
```

### Frontend (`frontend/.env.example`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Testes e cobertura

### Backend (testes)

```bash
cd backend
npm.cmd install
npm.cmd test -- --runInBand
npm.cmd run test:cov
```

### Frontend (testes)

```bash
cd frontend
npm.cmd install
npm.cmd run test:run
npm.cmd run test:coverage
```

- Relatório de cobertura backend: `backend/coverage/`
- Relatório de cobertura frontend: `frontend/coverage/`

## Licença

MIT
