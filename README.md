# InfraPulse

Plataforma web para monitoramento de SLA, produtividade e risco operacional de equipes de TI — com foco em centrais de suporte, help desk e service desk.

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
- ✅ Dashboard executivo com KPIs de SLA
- ✅ Dashboard operacional com fila por técnico
- ✅ Importação de CSV/Excel com mapeamento de colunas
- ✅ Cálculo automático de SLA por chamado
- ✅ Alertas de risco (vencimento, críticos, sobrecarga)
- ✅ Relatórios com exportação CSV
- ✅ Layout responsivo e moderno
- ✅ Estrutura pronta para multiempresa

---

## Licença

MIT
