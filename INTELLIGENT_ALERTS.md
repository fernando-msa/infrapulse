# Guia de Alertas Inteligentes

Este guia explica como o sistema de alertas do InfraPulse detecta problemas operacionais automaticamente.

## Visão Geral

InfraPulse monitora 5 situações críticas em tempo real:

1. **SLA em Risco** (70%+ consumido)
2. **SLA Violado** (deadline ultrapassado)
3. **Equipe Sobrecarregada** (>10 tickets por técnico)
4. **Ticket Crítico Não Atribuído** (CRITICA + sem responsável)
5. **Fila Crítica** (>20 tickets aguardando)

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│          AlertsService (Business Logic)             │
│                                                     │
│  - detectAlerts(companyId)       [Orquestrador]    │
│  - detectSlaAtRisk()             [SLA 70%+]        │
│  - detectSlaViolated()           [SLA violado]     │
│  - detectOverloadedTeam()        [Equipe >10]      │
│  - detectCriticalUnassigned()    [Crítico s/ responsável]
│  - detectCriticalQueue()         [Fila >20]        │
│  - getAlerts()                   [Listar]          │
│  - acknowledgeAlert()            [Reconhecer]      │
│  - resolveAlert()                [Resolver]        │
│  - getAlertsDashboard()          [Dashboard]       │
└─────────────────────────────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │    AlertsController          │
        │                              │
        │  GET  /alerts                │
        │  GET  /alerts/detect         │
        │  GET  /alerts/dashboard      │
        │  PUT  /alerts/:id/acknowledge│
        │  PUT  /alerts/:id/resolve    │
        └──────────────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │     Database (alerts)        │
        │                              │
        │  type: AlertType enum        │
        │  severity: AlertSeverity     │
        │  metrics: JSON               │
        │  acknowledged: boolean       │
        │  resolved: boolean           │
        └──────────────────────────────┘
```

## Tipos de Alertas (AlertType)

```typescript
enum AlertType {
  SLA_EM_RISCO           // 70-99% SLA consumido
  SLA_VIOLADO            // 100%+ SLA ultrapassado
  EQUIPE_SOBRECARREGADA  // Técnico >10 tickets
  TICKET_CRITICO         // Prioridade CRITICA sem atribuição
  FILA_CRITICA           // >20 tickets em ABERTO
}
```

## Severidade (AlertSeverity)

```typescript
enum AlertSeverity {
  INFO       // Informativo (70-75% SLA)
  AVISO      // Ação recomendada (75-85% SLA ou overload 11-15)
  CRITICO    // Ação necessária (85%+ SLA ou overload 15+)
  BLOQUEADOR // Operação parada (SLA violado ou fila >30)
}
```

## 1. SLA em Risco

### O que dispara?

Ticket ativo (não CONCLUIDO/CANCELADO) com SLA deadline próximo:
- **70-85%** → Severidade AVISO
- **85-99%** → Severidade CRITICO
- **100%+** → Alerta diferente (SLA_VIOLADO)

### Cálculo

```
Percent Used = (now - openedAt) / (deadline - openedAt) * 100

Exemplo: Ticket aberto 22:00, deadline 23:00
- 22:40 (40 min) → 67% ✓
- 22:50 (50 min) → 83% ⚠️ Alerta AVISO
- 23:05 (65 min) → 108% ❌ Alerta SLA_VIOLADO
```

### Metrics Registradas

```json
{
  "slaPercentUsed": 85,
  "minutesRemaining": 15,
  "priority": "ALTA",
  "status": "EM_ANDAMENTO",
  "assignedTo": "João Silva"
}
```

### Exemplo de Uso

```bash
# Detectar todos os SLA em risco
curl -X GET http://localhost:3001/api/alerts/detect \
   -H "Authorization: Bearer <jwt>"

# Filtrar apenas SLA em risco
curl -X GET "http://localhost:3001/api/alerts?type=SLA_EM_RISCO" \
   -H "Authorization: Bearer <jwt>"
```

## 2. SLA Violado

### O que dispara?

Qualquer ticket com `slaStatus = VIOLADO` que ainda **não tenha um alerta não resolvido**.

### Fluxo

1. Ticket vence → Backend recalcula SLA → `slaStatus = VIOLADO`
2. Sistema detecta → Cria alerta com `severity = CRITICO`
3. Sistema registra na auditoria
4. Gestor vê no dashboard → Reconhece/resolve manualmente

### Evita Duplicação

O sistema verifica se já existe alerta não resolvido:

```typescript
const existingAlert = await prisma.alert.findFirst({
  where: {
    ticketId: ticket.id,
    type: AlertType.SLA_VIOLADO,
    resolved: false,  // ← Apenas não resolvidos
  },
});
```

## 3. Equipe Sobrecarregada

### O que dispara?

Técnico (ANALISTA/GESTOR) com **>10 tickets abertos**.

### Severidade

- **11-15 tickets** → AVISO
- **15+ tickets** → CRITICO

### Cálculo

```
Overload % = ((ticketCount - threshold) / threshold) * 100

Exemplo:
- 12 tickets: ((12-10)/10)*100 = 20% overload
- 18 tickets: ((18-10)/10)*100 = 80% overload
```

### Evita Duplicação

Se já existe alerta não resolvido para o técnico, não cria novo.

## 4. Ticket Crítico Não Atribuído

### O que dispara?

Ticket com:
- `status = ABERTO`
- `priority = CRITICA`
- `assignedToId = null` (ninguém responsável)

### Metrics

```json
{
  "hoursOpen": 2,
  "priority": "CRITICA",
  "status": "ABERTO"
}
```

### Ação Esperada

Gestor vê alerta → Atribui técnico → Reconhece/resolve alerta

## 5. Fila Crítica

### O que dispara?

**>20 tickets em ABERTO** (independente de prioridade).

### Severidade

- **20-30 tickets** → CRITICO
- **30+ tickets** → BLOQUEADOR

### Máxima 1 por Empresa

Apenas 1 alerta de fila crítica não resolvido por empresa.

## Endpoints

### GET /api/alerts/detect

Executa detecção completa em tempo real.

```bash
curl -X GET http://localhost:3001/api/alerts/detect \
   -H "Authorization: Bearer <jwt>"
```

**Resposta:**

```json
{
  "timestamp": "2026-04-19T22:35:41Z",
  "companyId": "company-id",
  "totalAlertsDetected": 5,
  "bySeverity": {
    "AVISO": 2,
    "CRITICO": 3
  },
  "byType": {
    "SLA_EM_RISCO": 2,
    "EQUIPE_SOBRECARREGADA": 2,
    "SLA_VIOLADO": 1
  },
  "alerts": [ ... ]
}
```

### GET /api/alerts

Lista alertas com filtros.

**Query Parameters:**

- `type` - AlertType (SLA_EM_RISCO, SLA_VIOLADO, etc)
- `severity` - AlertSeverity (INFO, AVISO, CRITICO, BLOQUEADOR)
- `resolved` - boolean
- `acknowledged` - boolean

```bash
# Alertas críticos não resolvidos
curl -X GET "http://localhost:3001/api/alerts?severity=CRITICO&resolved=false" \
   -H "Authorization: Bearer <jwt>"

# Alertas de equipe sobrecarregada
curl -X GET "http://localhost:3001/api/alerts?type=EQUIPE_SOBRECARREGADA" \
   -H "Authorization: Bearer <jwt>"
```

### GET /api/alerts/dashboard

Dashboard resumido de alertas.

```bash
curl -X GET http://localhost:3001/api/alerts/dashboard \
   -H "Authorization: Bearer <jwt>"
```

**Resposta:**

```json
{
  "summary": {
    "total": 45,
    "critical": 12,
    "unresolved": 38
  },
  "byType": {
    "SLA_EM_RISCO": 18,
    "EQUIPE_SOBRECARREGADA": 15,
    "SLA_VIOLADO": 8,
    "TICKET_CRITICO": 4
  },
  "bySeverity": {
    "AVISO": 20,
    "CRITICO": 22,
    "BLOQUEADOR": 3
  }
}
```

### PUT /api/alerts/:id/acknowledge

Marca alerta como reconhecido (lido/em ação).

```bash
curl -X PUT "http://localhost:3001/api/alerts/alert-uuid/acknowledge" \
   -H "Authorization: Bearer <jwt>"
```

**Resultado:**

```json
{
  "id": "alert-uuid",
  "title": "...",
  "acknowledged": true,
  "acknowledgedBy": "user-uuid",
  "acknowledgedAt": "2026-04-19T22:35:41Z",
  "resolved": false
}
```

### PUT /api/alerts/:id/resolve

Marca alerta como resolvido e registra na auditoria.

```bash
curl -X PUT "http://localhost:3001/api/alerts/alert-uuid/resolve" \
   -H "Authorization: Bearer <jwt>"
```

**Resultado:**

```json
{
  "id": "alert-uuid",
  "resolved": true,
  "resolvedBy": "user-uuid",
  "resolvedAt": "2026-04-19T22:35:41Z"
}
```

## Integração com Auditoria

Cada alerta criado é registrado na auditoria:

```json
{
  "action": "CREATE",
  "entity": "TICKET",
  "entityId": "ticket-123",
  "description": "Alerta de SLA em risco gerado (85% consumido)",
  "companyId": "company-id",
  "userId": "system"
}
```

E quando resolvido:

```json
{
  "action": "UPDATE",
  "entity": "TICKET",
  "entityId": "ticket-123",
  "description": "Alerta resolvido: SLA em risco...",
  "companyId": "company-id",
  "userId": "user-123"
}
```

## Workflow Prático

### Scenario: SLA em Risco

```
22:00 - Ticket #ABC criado, SLA até 23:00
        ↓
22:50 - Sistema executa detectAlerts()
        ↓
22:50 - Detecta: 83% SLA consumido
        ↓
22:50 - Cria alerta: SLA_EM_RISCO, severity=AVISO
        ↓
22:50 - Registra na auditoria
        ↓
22:51 - Gestor consulta GET /api/alerts
        ↓
22:51 - Gestor clica "Reconhecer" → PUT /api/alerts/:id/acknowledge
        ↓
23:00 - Sistema executa detectAlerts() novamente
        ↓
23:00 - Detecta: 100%+ SLA (VIOLADO)
        ↓
23:00 - Cria NOVO alerta: SLA_VIOLADO, severity=CRITICO
        ↓
23:05 - Técnico resolve ticket
        ↓
23:05 - Sistema detecta ticket CONCLUIDO
        ↓
23:06 - Gestor clica "Resolver" → PUT /api/alerts/:id/resolve
```

## Detecção Contínua

### Opção 1: Manual via Endpoint

```bash
# Executar detecção manualmente
curl -X GET http://localhost:3001/api/alerts/detect
```

### Opção 2: Agendada com Cron

```typescript
// Em uma nova classe/serviço:
import { Cron, Injectable } from '@nestjs/schedule';

@Injectable()
export class AlertScheduler {
  constructor(private alertsService: AlertsService) {}

  // A cada 5 minutos
  @Cron('*/5 * * * *')
  async detectAlerts() {
    const companies = await this.prisma.company.findMany({
      where: { active: true },
    });
    
    for (const company of companies) {
      await this.alertsService.detectAlerts(company.id);
    }
  }
}
```

### Opção 3: Integrada no Evento de Ticket

```typescript
// Em TicketsService.update():
async update(id: string, data: any, companyId: string) {
  const ticket = await this.prisma.ticket.update({
    where: { id },
    data,
  });

  // Detectar alertas após atualização
  await this.alertsService.detectAlerts(companyId);
  
  return ticket;
}
```

## Thresholds Configuráveis

Edite `AlertsService` para ajustar limites:

```typescript
// alerts.service.ts

private async detectOverloadedTeam() {
  const OVERLOAD_THRESHOLD = 10; // ← Mude aqui
  // ...
}

private async detectCriticalQueue() {
  const QUEUE_THRESHOLD = 20; // ← Mude aqui
  // ...
}
```

## Troubleshooting

### Alertas não aparecem

1. ✅ Chamar `GET /api/alerts/detect` manualmente
2. ✅ Verificar isolamento: `companyId` está correto?
3. ✅ Verificar status de tickets: Estão em ABERTO/EM_ANDAMENTO?
4. ✅ Verificar logs: Há erros no servidor?

### Muitos alertas duplicados

Se há múltiplos alertas do mesmo tipo, verificar:

```typescript
// Código já tem verificação:
const existingAlert = await this.prisma.alert.findFirst({
  where: {
    ticketId: ticket.id,
    type: AlertType.SLA_EM_RISCO,
    resolved: false,  // ← Apenas não resolvidos
  },
});
```

Certificar que está resolvendo alertas antigos antes de criar novos.

### Performance

- Alertas criados **após** response (não bloqueia)
- Índices no banco garantem queries rápidas
- Máximo 5 tipos × N empresas = escalável

## Roadmap

Possíveis extensões:

- [ ] Webhook/Email para alertas críticos
- [ ] Escalação automática (Gestor → Diretor)
- [ ] Inteligência artificial (padrões)
- [ ] Notificação em tempo real (WebSocket/SSE)
- [ ] Regras customizáveis por empresa
- [ ] Histórico de alertas com trend analysis

---

**Última atualização:** 19/04/2026
**Versão:** 1.0.0
