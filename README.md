# InfraPulse

[![CI](https://github.com/fernando-msa/infrapulse/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fernando-msa/infrapulse/actions/workflows/ci.yml)

Plataforma web para monitoramento de SLA, produtividade e risco operacional de equipes de TI — com foco em centrais de suporte, help desk e service desk.

Agora com base SaaS multi-tenant funcional: onboarding self-service, gestão de plano por empresa, controle de limites por assinatura e isolamento de dados por tenant.

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

---

## Estrutura do Monorepo

```text
infrapulse/
├── frontend/        # Next.js app
├── backend/         # NestJS app
├── docker-compose.yml
└── README.md
```

---

## Pré-requisitos

- Node.js 18+
- Docker + Docker Compose
- npm ou yarn

---

## Rodando com Docker (recomendado)

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/infrapulse.git
cd infrapulse

# Suba todos os containers
docker-compose up --build
```

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:3001>
- PostgreSQL: `localhost:5432`

---

## Rodando localmente (sem Docker)

### Backend

```bash
cd backend
cp .env.example .env
# Configure as variáveis no .env
npm install
npx prisma migrate dev
npx prisma generate
npx prisma db seed
npm run start:dev
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

---

## Usuários do Seed

| Email | Senha | Perfil |
| ----- | ----- | ------ |
| `admin@infrapulse.com` | admin123 | Admin |
| `gestor@infrapulse.com` | gestor123 | Gestor |
| `analista@infrapulse.com` | analista123 | Analista |

---

## Variáveis de Ambiente

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

---

## Funcionalidades

- ✅ Autenticação JWT com perfis (Admin, Gestor, Analista)
- ✅ Onboarding SaaS: criação de empresa + admin via API
- ✅ Dashboard executivo com KPIs de SLA
- ✅ Dashboard operacional com fila por técnico
- ✅ Importação de CSV/Excel com mapeamento de colunas
- ✅ Cálculo automático de SLA por chamado
- ✅ Alertas de risco (vencimento, críticos, sobrecarga)
- ✅ Relatórios com exportação CSV
- ✅ Layout responsivo e moderno
- ✅ Multiempresa com isolamento por tenant
- ✅ Plano por empresa com limites de usuários e chamados/mês
- ✅ Tela de assinatura para upgrade de plano

---

## Fluxo SaaS (novo)

1. Acesse `/signup` no frontend.
2. Cadastre empresa e administrador.
3. O sistema cria:
   - empresa em `TRIAL` (14 dias)
   - usuário administrador
   - sessão autenticada automática
4. Gerencie consumo e upgrade em `/assinatura`.

### Planos disponíveis

| Plano | Usuários ativos | Chamados/mês |
| ----- | --------------- | ------------ |
| `TRIAL` | 5 | 200 |
| `STARTER` | 15 | 2.000 |
| `GROWTH` | 50 | 10.000 |
| `ENTERPRISE` | 500 | 100.000 |

---

## Endpoints SaaS

- `POST /api/auth/signup-company`: cria empresa + admin
- `GET /api/companies/current`: retorna empresa e uso do plano
- `PATCH /api/companies/current/plan`: altera plano da empresa atual (ADMIN)

### Regras de proteção ativas

- Criação de usuário respeita limite de assentos do plano
- Criação de chamado respeita cota mensal do plano
- Login bloqueia empresa inativa, trial expirado e assinatura cancelada/inadimplente
- Busca/atualização de chamados com isolamento por `companyId`

---

## Testes e Cobertura

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

---

## Licença

MIT
