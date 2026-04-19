# Guia de Integração de Auditoria

Este guia explica como integrar logging de auditoria em novos serviços e controllers no InfraPulse.

## Visão Geral

A auditoria é **capturada automaticamente** via interceptor para rotas POST/PUT/DELETE em:
- `/api/tickets`
- `/api/users`

E pode ser **manualmente registrada** usando `AuditService` em qualquer serviço.

## Opção 1: Auditoria Automática (Recomendado)

Se seu endpoint segue o padrão REST (POST/PUT/DELETE), o `AuditInterceptor` captura automaticamente.

### Pré-requisitos

1. Seu controller deve estar em uma rota suportada:
   - `/api/tickets` → Captura criação, atualização e deleção
   - `/api/users` → Captura criação, atualização e deleção

2. Request deve ter `req.user` com:
   ```typescript
   {
     id: "user-id",
     companyId: "company-id"
   }
   ```

### Exemplo

```typescript
// tickets.controller.ts
@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  // ✅ AUTOMATICAMENTE AUDITADO
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateTicketDto, @Request() req) {
    return this.ticketsService.create(dto, req.user.companyId);
  }

  // ✅ AUTOMATICAMENTE AUDITADO
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateTicketDto, @Request() req) {
    return this.ticketsService.update(id, dto, req.user.companyId);
  }

  // ✅ AUTOMATICAMENTE AUDITADO
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Request() req) {
    return this.ticketsService.delete(id, req.user.companyId);
  }
}
```

**Resultado**: Automaticamente registra CREATE, UPDATE, DELETE na auditoria.

---

## Opção 2: Auditoria Manual em Serviços

Para ações não-padrão (ex: LOGIN, CLOSE, ASSIGN), injete `AuditService` e registre manualmente.

### Setup no Módulo

```typescript
// seu.module.ts
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule, PrismaModule], // ← Importe AuditModule
  controllers: [SeuController],
  providers: [SeuService],
})
export class SeuModule {}
```

### Usar no Serviço

```typescript
// seu.service.ts
import { AuditService } from '../audit/audit.service';
import { AuditEntity, AuditAction } from '@prisma/client';

@Injectable()
export class SeuService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService, // ← Injete
  ) {}

  async closeTicket(ticketId: string, companyId: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });

    // Atualizar ticket
    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'CONCLUIDO' },
    });

    // Registrar auditoria manualmente
    await this.auditService.logTicketClose(
      ticketId,
      companyId,
      userId,
      '192.168.1.100',      // IP (opcional)
      'Mozilla/5.0...',     // User-Agent (opcional)
    );

    return updated;
  }

  async assignTicketToTechnician(
    ticketId: string,
    technicianId: string,
    companyId: string,
    userId: string,
  ) {
    const technician = await this.prisma.user.findUnique({
      where: { id: technicianId },
    });

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedToId: technicianId },
    });

    // Registrar atribuição
    await this.auditService.logTicketAssignment(
      ticketId,
      companyId,
      userId,
      technicianId,
      technician.name,
    );

    return updated;
  }
}
```

### Todos os Métodos Disponíveis

```typescript
// Criar
await auditService.logCreate(
  AuditEntity.TICKET,     // Entity type
  ticketId,               // ID do recurso
  companyId,              // Isolamento multi-tenant
  userId,                 // Quem fez
  { title: '...', ... },  // Dados criados
  ipAddress?,             // IP (LGPD)
  userAgent?              // User-Agent (LGPD)
);

// Atualizar (detecta apenas campos mudados)
await auditService.logUpdate(
  AuditEntity.TICKET,
  ticketId,
  companyId,
  userId,
  { status: 'ABERTO' },          // Before
  { status: 'CONCLUIDO' },       // After
  ipAddress?,
  userAgent?
);

// Deletar
await auditService.logDelete(
  AuditEntity.TICKET,
  ticketId,
  companyId,
  userId,
  { title: '...', status: '...' },  // Dados deletados
  ipAddress?,
  userAgent?
);

// Login
await auditService.logLogin(userId, companyId, ipAddress?, userAgent?);

// Logout
await auditService.logLogout(userId, companyId, ipAddress?, userAgent?);

// Atribuição de ticket
await auditService.logTicketAssignment(
  ticketId,
  companyId,
  userId,
  assignedToId,
  assignedToName,
  ipAddress?,
  userAgent?
);

// Fechar ticket
await auditService.logTicketClose(ticketId, companyId, userId, ipAddress?, userAgent?);
```

---

## Opção 3: Capturar IP e User-Agent no Controller

Para registros mais precisos, passe IP e User-Agent do controller ao serviço:

```typescript
// seu.controller.ts
import { Request } from 'express';

@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Post(':id/close')
  @UseGuards(JwtAuthGuard)
  async closeTicket(
    @Param('id') id: string,
    @Request() req,
  ) {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('user-agent');

    return this.ticketsService.closeTicket(
      id,
      req.user.companyId,
      req.user.id,
      ipAddress,    // ← Passa para serviço
      userAgent,    // ← Passa para serviço
    );
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}
```

```typescript
// seu.service.ts
async closeTicket(
  ticketId: string,
  companyId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string,
) {
  // ... lógica de update

  await this.auditService.logTicketClose(
    ticketId,
    companyId,
    userId,
    ipAddress,
    userAgent,
  );
}
```

---

## Adicionando Nova Entidade

Se você quer auditar uma nova entidade (ex: SLA Rules), atualize:

### 1. Prisma Schema

```prisma
// prisma/schema.prisma
enum AuditEntity {
  TICKET
  USER
  COMPANY
  SLARULE        // ← Nova entidade
  IMPORTBATCH
  AUTH
}

model SlaRule {
  id String @id @default(uuid())
  name String
  companyId String
  company Company @relation(fields: [companyId], references: [id])
  auditLogs AuditLog[]  // ← Adicione relação
  // ... outros campos
}
```

### 2. Atualizar Interceptor

```typescript
// src/common/interceptors/audit.interceptor.ts
private parseAction(method, path, body, response) {
  // ... existing tickets/users code

  // Adicionar suporte a SLA Rules
  if (path.includes('/api/sla-rules')) {
    if (method === 'POST') {
      return {
        action: AuditAction.CREATE,
        entity: AuditEntity.SLARULE,
        entityId: response?.id,
      };
    }
    // ... PUT, DELETE
  }

  return {};
}
```

### 3. Rodar Migração

```bash
cd backend
npm.cmd exec prisma db push
npm.cmd exec prisma generate
npm.cmd run build
```

---

## Consultando Auditoria

### Via API Pública

```bash
# Histórico de um ticket
curl -X GET http://localhost:3001/api/audit/TICKET/ticket-id \
   -H "Authorization: Bearer <jwt>"

# Auditoria da empresa (últimos 30 dias)
curl -X GET "http://localhost:3001/api/audit/company/logs?days=30" \
   -H "Authorization: Bearer <jwt>"

# Exportar para conformidade
curl -X GET "http://localhost:3001/api/audit/export/compliance?startDate=2026-01-01&endDate=2026-04-19" \
   -H "Authorization: Bearer <jwt>"
```

### Via AuditService (Em Serviços)

```typescript
// Obter histórico de um recurso
const history = await this.auditService.getHistory(
  AuditEntity.TICKET,
  ticketId,
  companyId,
  50  // limit
);

// Obter auditoria da empresa
const logs = await this.auditService.getCompanyAudit(
  companyId,
  {
    action: AuditAction.UPDATE,
    entity: AuditEntity.TICKET,
    userId: 'user-id',
    startDate: new Date('2026-01-01'),
    endDate: new Date(),
  },
  100  // limit
);

// Exportar para conformidade
const export = await this.auditService.exportAuditLogs(
  companyId,
  new Date('2026-01-01'),
  new Date('2026-04-19')
);
```

---

## Compliance Checklist

- [ ] Todas as ações CREATE/UPDATE/DELETE são auditadas
- [ ] IP e User-Agent são capturados para investigações
- [ ] Isolamento por `companyId` em todos os logs
- [ ] Histórico exportável para auditorias externas
- [ ] Limpeza de logs antigos (direito ao esquecimento LGPD)
- [ ] README documentado com exemplos de auditoria

---

## Troubleshooting

### Logs não aparecem

1. Verificar se `AuditModule` foi importado
2. Verificar se a rota está em `/api/tickets` ou `/api/users`
3. Verificar se `req.user.companyId` existe
4. Conferir console para erros do interceptor (não falham a request, mas logam)

### Performance

- Auditoria é registrada **após** a response (via `tap` do RxJS)
- Erro em auditoria **não interrompe** a request
- Índices no banco garantem queries rápidas

### LGPD - Deletar Dados

```bash
# Deletar logs com >2 anos (padrão)
npm.cmd exec prisma db execute --stdin << 'EOF'
DELETE FROM "audit_logs" WHERE "createdAt" < NOW() - INTERVAL '2 years';
EOF
```

---

## Referências

- [NestJS Interceptors](https://docs.nestjs.com/interceptors)
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [LGPD Lei 13.709](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709.htm)
- [ISO 27001](https://www.iso.org/isoiec-27001-information-security-management.html)
