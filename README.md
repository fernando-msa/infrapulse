# InfraPulse

[![CI](https://github.com/fernando-msa/infrapulse/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fernando-msa/infrapulse/actions/workflows/ci.yml)

Monitore SLA e produtividade da sua TI em tempo real.

InfraPulse é uma plataforma SaaS para gestão operacional de suporte de TI com foco em SLA, produtividade e risco. Ela ajuda times de help desk, service desk e centrais de atendimento a operar com mais previsibilidade, governança e isolamento por empresa.

## Por que o InfraPulse

- Visibilidade em tempo real sobre SLA, fila e criticidade dos chamados
- Redução de risco operacional com alertas e acompanhamento por equipe
- Modelo multiempresa com isolamento de dados por tenant
- Controle de assinatura, plano e limites por empresa
- Onboarding rápido para empresa e administrador

## Principais recursos

- Onboarding self-service de empresa e administrador
- Autenticação JWT com perfis (`ADMIN`, `GESTOR`, `ANALISTA`)
- Dashboard executivo com KPIs de SLA e risco
- Dashboard operacional com fila por técnico
- Gestão de assinatura por plano com limites por empresa
- Importação de CSV/Excel para carga de chamados
- Alertas de risco e relatórios com exportação CSV

## Prints do sistema

### Cadastro de empresa (onboarding SaaS)

![Cadastro da empresa](docs/prints/signup-empresa.svg)

### Dashboard executivo

![Dashboard executivo](docs/prints/dashboard-executivo.svg)

### Assinatura e planos

![Assinatura e planos](docs/prints/assinatura-planos.svg)

## Solicitar demo

Quer ver o fluxo completo em ambiente guiado? [Solicitar demo via GitHub Issues](https://github.com/fernando-msa/infrapulse/issues) e avalie como o InfraPulse organiza SLA, filas e governança operacional em um único painel.

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

### Endpoints públicos (sem autenticação)

- `GET /api/metrics/sla` - Métricas agregadas de SLA
- `GET /api/teams/performance` - Performance de cada analista
- `GET /api/incidents` - Incidentes críticos e em risco (query param: `limit`)

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

## Isolamento Multi-Tenant (Padrão SaaS)

InfraPulse implementa **isolamento real de dados por empresa** em toda a plataforma:

### 🔐 Garantias de Segurança

- **companyId obrigatório**: Todos os queries ao banco incluem isolamento por `companyId`
- **Middleware de isolamento**: Força isolamento em rotas protegidas
- **JWT com companyId**: Cada token de usuário contém identificador da empresa
- **Erro em tempo de compilação**: Qualquer query sem isolamento falha na compilação TypeScript

### 📊 Exemplo Real

```typescript
// ❌ INSEGURO (não compila):
const tickets = await prisma.ticket.findMany({
  where: companyId ? { companyId } : {} // Retorna TUDO se undefined
});

// ✅ SEGURO (padrão InfraPulse):
async findAll(filters: FilterTicketsDto, companyId: string) {
  // companyId é OBRIGATÓRIO, não opcional
  const where: any = { companyId }; // Sempre isolado
  // ... resto da lógica
}
```

### 🛡️ Serviços Protegidos

Todos os serviços abaixo garantem isolamento:

| Serviço | Endpoints | Isolamento |
| ------- | --------- | ---------- |
| Tickets | GET /api/tickets, POST, PUT | ✅ companyId obrigatório |
| Dashboard | GET /api/dashboard/executive, operational | ✅ companyId obrigatório |
| Usuários | GET /api/users, /users/technicians | ✅ companyId obrigatório |
| Relatórios | GET /api/reports/tickets | ✅ companyId obrigatório |
| Alertas | GET /api/alerts | ✅ companyId obrigatório |

### 📌 Endpoints Públicos (Sem Isolamento)

Alguns endpoints agregam dados de TODA a plataforma (sem isolamento):

| Endpoint | Propósito | Dados |
| -------- | --------- | ----- |
| GET /api/metrics/sla | Métricas globais de SLA | Todas as empresas |
| GET /api/teams/performance | Performance de todos analistas | Todas as empresas |
| GET /api/incidents | Incidentes críticos globais | Todas as empresas |

---

## Auditoria e Compliance (LGPD/ISO)

InfraPulse implementa **rastreamento automático de ações** para conformidade regulatória:

### 🔍 O que é auditado

Todas as ações são registradas automaticamente:

| Ação | Entidade | Capturado |
| ---- | -------- | --------- |
| CREATE | Ticket, Usuário | Dados criados, quem criou, quando, IP |
| UPDATE | Ticket, Usuário | Campos alterados (before/after), quem, quando, IP |
| DELETE | Ticket, Usuário | Dados deletados, quem deletou, quando, IP |
| LOGIN | Autenticação | Usuário, empresa, IP, User-Agent, horário |
| LOGOUT | Autenticação | Usuário, empresa, IP, horário |
| ASSIGN | Ticket | Técnico atribuído, quem atribuiu, quando |
| CLOSE | Ticket | Quem fechou, quando, como |

### 📋 Campos de Auditoria (LGPD Compliance)

Cada log de auditoria registra:

```json
{
  "id": "uuid",
  "action": "CREATE | UPDATE | DELETE | LOGIN | LOGOUT | EXPORT | IMPORT | ASSIGN | REASSIGN | CLOSE | REOPEN",
  "entity": "TICKET | USER | COMPANY | SLARULE | IMPORTBATCH | AUTH",
  "entityId": "id-do-recurso",
  "companyId": "isolamento-multi-tenant",
  "userId": "quem-fez-a-acao",
  "changes": {
    "before": { "status": "ABERTO" },
    "after": { "status": "CONCLUIDO" }
  },
  "description": "Ticket #123 atualizado",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2026-04-19T22:35:41.179Z"
}
```

### 🔐 Garantias LGPD

- **Isolamento**: Cada empresa vê apenas seus próprios logs
- **Direito ao esquecimento**: Logs antigos (>2 anos) podem ser deletados
- **Rastreabilidade**: IP e User-Agent capturados para investigações
- **Minimização**: Apenas dados necessários são registrados

### 📊 Endpoints de Auditoria

#### 1. Histórico de um Recurso

```bash
curl -X GET http://localhost:3001/api/audit/TICKET/ticket-id-123 \
   -H "Authorization: Bearer <jwt>"
```

Resposta:

```json
[
  {
    "id": "audit-log-123",
    "action": "UPDATE",
    "entity": "TICKET",
    "entityId": "ticket-id-123",
    "description": "Ticket atualizado",
    "changes": {
      "priority": { "before": "ALTA", "after": "CRITICA" }
    },
    "user": {
      "id": "user-123",
      "name": "Maria Admin",
      "email": "maria@infrapulse.com"
    },
    "createdAt": "2026-04-19T22:35:41.179Z"
  }
]
```

#### 2. Auditoria Completa da Empresa

```bash
# Últimos 100 logs
curl -X GET http://localhost:3001/api/audit/company/logs \
   -H "Authorization: Bearer <jwt>"

# Filtrar por ação
curl -X GET "http://localhost:3001/api/audit/company/logs?action=UPDATE&entity=TICKET" \
   -H "Authorization: Bearer <jwt>"

# Últimos 7 dias
curl -X GET "http://localhost:3001/api/audit/company/logs?days=7" \
   -H "Authorization: Bearer <jwt>"
```

#### 3. Exportar para Conformidade

```bash
curl -X GET "http://localhost:3001/api/audit/export/compliance?startDate=2026-01-01&endDate=2026-04-19" \
   -H "Authorization: Bearer <jwt>"
```

Retorna JSON com todos os logs do período para auditorias internas e externas.

### 🛡️ Integração com ISO 27001/9001

A auditoria suporta requisitos de governança:

| Requisito ISO | Suporte | Como |
| ------------- | ------- | ---- |
| A.12.4.1 - Event logging | ✅ | Todos os eventos capturados em `AuditLog` |
| A.12.4.3 - Protection of audit info | ✅ | Isolamento por companyId + apenas ADMIN acessa |
| A.13.1.3 - Segregation of duties | ✅ | Roles (ADMIN, GESTOR, ANALISTA) com permissões |
| A.14.2.1 - Change management | ✅ | Rastreamento before/after de mudanças |
| A.14.2.5 - Access restrictions | ✅ | Middleware obriga autenticação + isolamento |

---

## Alertas Inteligentes

InfraPulse monitora proativamente a operação e gera alertas contextualizados para:

### 🚨 Tipos de Alertas

| Alerta | Severidade | Ação |
| ------ | ---------- | ---- |
| **SLA em Risco** | ⚠️ AVISO / 🔴 CRÍTICO | Ticket com 70%+ do SLA consumido |
| **SLA Violado** | 🔴 CRÍTICO | Ticket ultrapassou deadline |
| **Equipe Sobrecarregada** | ⚠️ AVISO / 🔴 CRÍTICO | Técnico com >10 tickets abertos |
| **Ticket Crítico Não Atribuído** | 🔴 CRÍTICO | Prioridade CRITICA sem responsável |
| **Fila Crítica** | 🔴 CRÍTICO / 🛑 BLOQUEADOR | >20 tickets aguardando atendimento |

### 🎯 Severidade

```
INFO       - Informativo (não requer ação)
AVISO      - Requer atenção (70-80% SLA consumido)
CRITICO    - Ação necessária (80%+ SLA ou equipe overload)
BLOQUEADOR - Operação comprometida (SLA violado ou fila >30)
```

### 📊 Endpoints de Alertas

#### 1. Detectar Alertas em Tempo Real

```bash
curl -X GET http://localhost:3001/api/alerts/detect \
  -H "Authorization: Bearer <jwt>"
```

#### 2. Dashboard de Alertas

```bash
curl -X GET http://localhost:3001/api/alerts/dashboard \
  -H "Authorization: Bearer <jwt>"
```

#### 3. Reconhecer Alerta

```bash
curl -X PUT "http://localhost:3001/api/alerts/alert-123/acknowledge" \
  -H "Authorization: Bearer <jwt>"
```

#### 4. Resolver Alerta

```bash
curl -X PUT "http://localhost:3001/api/alerts/alert-123/resolve" \
  -H "Authorization: Bearer <jwt>"
```

### 🧹 Limpeza de Dados (LGPD)

Para cumprir o direito ao esquecimento (LGPD Art. 17), execute:

```bash
# Via script
curl -X POST http://localhost:3001/api/audit/cleanup \
   -H "Authorization: Bearer <admin-jwt>" \
   -H "Content-Type: application/json" \
   -d '{"daysOld": 730}'  # Delete logs com >2 anos
```

---

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
npm.cmd exec prisma db push
npm.cmd exec prisma generate
npm.cmd exec prisma db seed
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
| `joao@infrapulse.com` | analista123 | Analista |
| `maria@infrapulse.com` | analista123 | Analista |
| `pedro@infrapulse.com` | analista123 | Analista |
| `juliana@infrapulse.com` | analista123 | Analista |
| `bruno@infrapulse.com` | analista123 | Analista |

## Testando a seed de demonstração (1200+ chamados)

Esta seed foi desenhada para demo executiva e gera automaticamente:

- 1200 chamados com status variados (`ABERTO`, `EM_ANDAMENTO`, `PENDENTE`, `CONCLUIDO`, `CANCELADO`)
- SLA misto (`OK`, `EM_RISCO`, `VIOLADO`)
- distribuição entre múltiplos analistas
- categorias e setores realistas para cenário hospitalar/operações

### Passo a passo rápido (Windows + Docker)

1. Suba apenas o banco PostgreSQL:

```bash
docker compose up -d postgres
```

1. Valide se o host local responde em `localhost:5432`:

```powershell
Test-NetConnection -ComputerName localhost -Port 5432
```

1. Prepare e aplique o schema no banco:

```bash
cd backend
npm.cmd install
npm.cmd exec prisma db push
npm.cmd exec prisma generate
```

1. Execute a seed:

```bash
npm.cmd exec prisma db seed
```

1. Resultado esperado no terminal:

```text
Seed concluido com sucesso!
Chamados gerados: 1200
```

### Observações

- A seed recria os chamados da empresa demo (`infrapulse-demo`) a cada execução, evitando duplicação infinita.
- Se preferir ambiente 100% local sem Docker, garanta que o PostgreSQL esteja rodando em `localhost:5432` antes de rodar o seed.
- Em ambientes sem bloqueio de política do PowerShell, `npx prisma ...` também funciona.

## API Pública (sem autenticação)

A InfraPulse expõe três endpoints públicos para monitoramento em tempo real da plataforma:

### GET /api/metrics/sla

Retorna métricas agregadas de SLA de **toda a plataforma**.

```bash
curl -X GET http://localhost:3001/api/metrics/sla
```

Resposta exemplo:

```json
{
  "total": 1200,
  "ok": 952,
  "emRisco": 152,
  "violado": 96,
  "percentualOk": 79,
  "percentualRisco": 13,
  "percentualViolado": 8,
  "tempoMedioAtendimento": 13.6,
  "timestamp": "2026-04-19T22:35:41.179Z"
}
```

### GET /api/teams/performance

Retorna performance de **cada analista** com tickets atribuídos.

```bash
curl -X GET http://localhost:3001/api/teams/performance
```

Resposta exemplo:

```json
{
  "teams": [
    {
      "id": "3d87c146-953c-423e-8608-db837a008ac5",
      "name": "Ana Martins",
      "email": "analista@infrapulse.com",
      "totalTickets": 333,
      "concluidos": 84,
      "emAberto": 249,
      "slaOk": 286,
      "emRisco": 29,
      "violado": 18,
      "taxaSlaCompliance": 86,
      "tempoMedioResolucao": 11.3,
      "ticketsCriticos": 63
    }
  ],
  "timestamp": "2026-04-19T22:35:41.179Z"
}
```

### GET /api/incidents

Retorna **incidentes críticos** (prioridade CRÍTICA) e **em risco de SLA** (status EM_RISCO ou VIOLADO).

**Query parameters:**
- `limit` (opcional, padrão 50): número máximo de incidentes

```bash
curl -X GET "http://localhost:3001/api/incidents?limit=10"
```

Resposta exemplo:

```json
{
  "total": 424,
  "incidents": [
    {
      "id": "a3f0d1f9-5822-4579-afe3-a49f32207a69",
      "title": "Servidor de arquivos com pouco espaco #0699",
      "description": "Volume de rede atingiu nivel critico e a operacao precisa de limpeza imediata.",
      "status": "ABERTO",
      "priority": "CRITICA",
      "slaStatus": "OK",
      "daysOpen": 0,
      "company": "InfraPulse Demo",
      "assignedTo": "Pedro Costa",
      "openedAt": "2026-04-19T21:58:07.288Z",
      "resolvedAt": null
    }
  ],
  "timestamp": "2026-04-19T22:35:41.179Z"
}
```

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
