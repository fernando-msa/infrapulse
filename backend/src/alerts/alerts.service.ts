import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, TicketPriority, SlaStatus, AlertType, AlertSeverity } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditEntity, AuditAction } from '@prisma/client';

/**
 * Serviço de Alertas Inteligentes
 * 
 * Monitora:
 * - SLA em risco (70%+ do tempo consumido)
 * - SLA violado
 * - Equipe sobrecarregada (customizável)
 * - Tickets críticos não atribuídos
 * - Fila crítica de atendimento
 */
@Injectable()
export class AlertsService {
  private static readonly ALERT_DEDUP_WINDOW_MINUTES = 5;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Detecta alertas em tempo real (pode ser chamado por cron ou endpoint)
   */
  async detectAlerts(companyId: string) {
    const now = new Date();
    const alerts = [];

    // 1. Detectar SLA em risco (70%+ consumido)
    const slaAtRisk = await this.detectSlaAtRisk(companyId, now);
    alerts.push(...slaAtRisk);

    // 2. Detectar SLA violado
    const slaViolated = await this.detectSlaViolated(companyId);
    alerts.push(...slaViolated);

    // 3. Detectar equipe sobrecarregada
    const overloadedTeam = await this.detectOverloadedTeam(companyId);
    alerts.push(...overloadedTeam);

    // 4. Detectar tickets críticos não atribuídos
    const criticalUnassigned = await this.detectCriticalUnassigned(companyId);
    alerts.push(...criticalUnassigned);

    // 5. Detectar fila crítica
    const criticalQueue = await this.detectCriticalQueue(companyId);
    if (criticalQueue) alerts.push(criticalQueue);

    // Retorna resumo
    return {
      timestamp: now,
      companyId,
      totalAlertsDetected: alerts.length,
      bySeverity: this.groupBySeverity(alerts),
      byType: this.groupByType(alerts),
      alerts,
    };
  }

  /**
   * 1. Detecta tickets com SLA em risco (70%+ do tempo consumido)
   */
  private async detectSlaAtRisk(companyId: string, now: Date) {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        companyId,
        status: { notIn: [TicketStatus.CONCLUIDO, TicketStatus.CANCELADO] },
        slaDeadline: { gt: now }, // Deadline ainda não passou
        slaStatus: { in: [SlaStatus.OK, SlaStatus.EM_RISCO] }, // Não violado
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    });

    const alerts = [];
    for (const ticket of tickets) {
      const percentUsed = this.calculateSlaPercentUsed(ticket.openedAt, ticket.slaDeadline, now);

      // 70%+ = Em risco
      if (percentUsed >= 70 && percentUsed < 100) {
        const minutesRemaining = Math.round(
          (ticket.slaDeadline.getTime() - now.getTime()) / 60000,
        );

        const { alert, status } = await this.upsertActiveAlert({
          type: AlertType.SLA_EM_RISCO,
          severity: percentUsed >= 85 ? AlertSeverity.CRITICO : AlertSeverity.AVISO,
          companyId,
          ticketId: ticket.id,
          userId: ticket.assignedToId,
          title: `SLA em risco: Ticket #${ticket.id.substring(0, 8)}`,
          description: `Ticket "${ticket.title}" está com ${percentUsed}% do SLA consumido. ${minutesRemaining} minutos restantes.`,
          metrics: {
            slaPercentUsed: percentUsed,
            minutesRemaining,
            priority: ticket.priority,
            status: ticket.status,
            assignedTo: ticket.assignedTo?.name,
          },
        });

        if (status === 'created' || status === 'updated') {
          alerts.push(alert);
        }

        if (status === 'created') {
          await this.auditService.logAction({
            action: AuditAction.CREATE,
            entity: AuditEntity.TICKET,
            entityId: ticket.id,
            companyId,
            description: `Alerta de SLA em risco gerado (${percentUsed}% consumido)`,
            changes: { alert: alert.id },
          });
        }
      }
    }

    return alerts;
  }

  /**
   * 2. Detecta tickets com SLA violado
   */
  private async detectSlaViolated(companyId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        companyId,
        status: { notIn: [TicketStatus.CONCLUIDO, TicketStatus.CANCELADO] },
        slaStatus: SlaStatus.VIOLADO,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    });

    const alerts = [];
    for (const ticket of tickets) {
      const { alert, status } = await this.upsertActiveAlert({
        type: AlertType.SLA_VIOLADO,
        severity: AlertSeverity.CRITICO,
        companyId,
        ticketId: ticket.id,
        userId: ticket.assignedToId,
        title: `CRÍTICO: SLA violado - Ticket #${ticket.id.substring(0, 8)}`,
        description: `Ticket "${ticket.title}" ultrapassou o SLA. Ação imediata necessária.`,
        metrics: {
          priority: ticket.priority,
          status: ticket.status,
          assignedTo: ticket.assignedTo?.name,
          violatedSince: ticket.slaDeadline,
        },
      });

      if (status === 'created' || status === 'updated') {
        alerts.push(alert);
      }

      if (status === 'created') {
        await this.auditService.logAction({
          action: AuditAction.CREATE,
          entity: AuditEntity.TICKET,
          entityId: ticket.id,
          companyId,
          description: `Alerta de SLA violado gerado`,
          changes: { alert: alert.id },
        });
      }
    }

    return alerts;
  }

  /**
   * 3. Detecta equipe sobrecarregada
   * Threshold: 10 tickets abertos por técnico (configurável)
   */
  private async detectOverloadedTeam(companyId: string) {
    const OVERLOAD_THRESHOLD = 10; // Tickets por técnico

    const technicians = await this.prisma.user.findMany({
      where: {
        companyId,
        active: true,
        role: { in: ['ANALISTA', 'GESTOR'] },
      },
    });

    const alerts = [];
    for (const tech of technicians) {
      const ticketCount = await this.prisma.ticket.count({
        where: {
          assignedToId: tech.id,
          status: { notIn: [TicketStatus.CONCLUIDO, TicketStatus.CANCELADO] },
        },
      });

      if (ticketCount > OVERLOAD_THRESHOLD) {
        const { alert, status } = await this.upsertActiveAlert({
          type: AlertType.EQUIPE_SOBRECARREGADA,
          severity: ticketCount > 15 ? AlertSeverity.CRITICO : AlertSeverity.AVISO,
          companyId,
          userId: tech.id,
          title: `Equipe sobrecarregada: ${tech.name}`,
          description: `${tech.name} tem ${ticketCount} tickets abertos (limite: ${OVERLOAD_THRESHOLD}). Considere redistribuição de carga.`,
          metrics: {
            openTickets: ticketCount,
            threshold: OVERLOAD_THRESHOLD,
            percentOverload: Math.round(((ticketCount - OVERLOAD_THRESHOLD) / OVERLOAD_THRESHOLD) * 100),
          },
        });

        if (status === 'created' || status === 'updated') {
          alerts.push(alert);
        }

        if (status === 'created') {
          await this.auditService.logAction({
            action: AuditAction.CREATE,
            entity: AuditEntity.USER,
            entityId: tech.id,
            companyId,
            description: `Alerta de sobrecarga gerado: ${ticketCount} tickets abertos`,
            changes: { alert: alert.id },
          });
        }
      }
    }

    return alerts;
  }

  /**
   * 4. Detecta tickets críticos não atribuídos
   */
  private async detectCriticalUnassigned(companyId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        companyId,
        status: TicketStatus.ABERTO,
        priority: TicketPriority.CRITICA,
        assignedToId: null, // Não atribuído
      },
    });

    const alerts = [];
    for (const ticket of tickets) {
      const hoursOpen = (Date.now() - ticket.openedAt.getTime()) / (1000 * 60 * 60);

      const { alert, status } = await this.upsertActiveAlert({
        type: AlertType.TICKET_CRITICO,
        severity: AlertSeverity.CRITICO,
        companyId,
        ticketId: ticket.id,
        title: `CRÍTICO não atribuído: ${ticket.title}`,
        description: `Ticket crítico aberto há ${Math.round(hoursOpen)} horas sem atribuição. Requer ação imediata.`,
        metrics: {
          hoursOpen: Math.round(hoursOpen),
          priority: ticket.priority,
          status: ticket.status,
        },
      });

      if (status === 'created' || status === 'updated') {
        alerts.push(alert);
      }

      if (status === 'created') {
        await this.auditService.logAction({
          action: AuditAction.CREATE,
          entity: AuditEntity.TICKET,
          entityId: ticket.id,
          companyId,
          description: `Alerta: Ticket crítico não atribuído`,
          changes: { alert: alert.id },
        });
      }
    }

    return alerts;
  }

  /**
   * 5. Detecta fila crítica (muitos tickets em ABERTO)
   */
  private async detectCriticalQueue(companyId: string) {
    const QUEUE_THRESHOLD = 20; // Tickets em fila

    const queueSize = await this.prisma.ticket.count({
      where: {
        companyId,
        status: TicketStatus.ABERTO,
      },
    });

    if (queueSize > QUEUE_THRESHOLD) {
      const { alert, status } = await this.upsertActiveAlert({
        type: AlertType.FILA_CRITICA,
        severity: queueSize > 30 ? AlertSeverity.BLOQUEADOR : AlertSeverity.CRITICO,
        companyId,
        title: `Fila crítica: ${queueSize} tickets aguardando`,
        description: `Há ${queueSize} tickets em fila de atendimento. Capacidade operacional comprometida.`,
        metrics: {
          queueSize,
          threshold: QUEUE_THRESHOLD,
          percentOverLimit: Math.round(((queueSize - QUEUE_THRESHOLD) / QUEUE_THRESHOLD) * 100),
        },
      });

      if (status === 'created') {
        await this.auditService.logAction({
          action: AuditAction.CREATE,
          entity: AuditEntity.TICKET,
          entityId: 'QUEUE',
          companyId,
          description: `Alerta de fila crítica: ${queueSize} tickets em aberto`,
          changes: { alert: alert.id },
        });
      }

      return status === 'created' || status === 'updated' ? alert : null;
    }

    return null;
  }

  /**
   * Upsert de alerta ativo para evitar duplicacoes.
   * Chave de negocio: companyId + type + ticketId + userId + resolved=false.
   */
  private async upsertActiveAlert(data: {
    type: AlertType;
    severity: AlertSeverity;
    companyId: string;
    ticketId?: string;
    userId?: string;
    title: string;
    description: string;
    metrics?: any;
  }): Promise<{ alert: any; status: 'created' | 'updated' | 'unchanged' }> {
    const where = {
      companyId: data.companyId,
      type: data.type,
      ticketId: data.ticketId ?? null,
      userId: data.userId ?? null,
      resolved: false,
    };

    const existing = await this.prisma.alert.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });

    if (!existing) {
      const created = await this.prisma.alert.create({
        data: {
          type: data.type,
          severity: data.severity,
          companyId: data.companyId,
          ticketId: data.ticketId,
          userId: data.userId,
          title: data.title,
          description: data.description,
          metrics: data.metrics,
        },
        include: {
          ticket: { select: { id: true, title: true, priority: true, status: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return { alert: created, status: 'created' };
    }

    const cooldownStartedAt = new Date(Date.now() - AlertsService.ALERT_DEDUP_WINDOW_MINUTES * 60000);
    const inCooldownWindow = existing.updatedAt >= cooldownStartedAt;
    const isSameSeverity = existing.severity === data.severity;
    const isSameTitle = existing.title === data.title;
    const isSameDescription = existing.description === data.description;
    const isSameMetrics = JSON.stringify(existing.metrics ?? null) === JSON.stringify(data.metrics ?? null);

    if (inCooldownWindow && isSameSeverity && isSameTitle && isSameDescription && isSameMetrics) {
      return { alert: existing, status: 'unchanged' };
    }

    const updated = await this.prisma.alert.update({
      where: { id: existing.id },
      data: {
        severity: data.severity,
        title: data.title,
        description: data.description,
        metrics: data.metrics,
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
      },
      include: {
        ticket: { select: { id: true, title: true, priority: true, status: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return { alert: updated, status: 'updated' };
  }

  /**
   * Obtém alertas da empresa (com filtros)
   */
  async getAlerts(
    companyId: string,
    filters?: {
      type?: AlertType;
      severity?: AlertSeverity;
      resolved?: boolean;
      acknowledged?: boolean;
    },
  ) {
    const where: any = { companyId };

    if (filters?.type) where.type = filters.type;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.resolved !== undefined) where.resolved = filters.resolved;
    if (filters?.acknowledged !== undefined) where.acknowledged = filters.acknowledged;

    return this.prisma.alert.findMany({
      where,
      include: {
        ticket: { select: { id: true, title: true, priority: true, status: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Reconhece um alerta (marca como lido/em ação)
   */
  async acknowledgeAlert(alertId: string, userId: string) {
    return this.prisma.alert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
      include: {
        ticket: { select: { id: true, title: true } },
        user: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Marca alerta como resolvido
   */
  async resolveAlert(alertId: string, userId: string) {
    const alert = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        resolved: true,
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
      include: {
        ticket: { select: { id: true, title: true } },
        user: { select: { id: true, name: true } },
      },
    });

    // Log na auditoria
    await this.auditService.logAction({
      action: AuditAction.UPDATE,
      entity: AuditEntity.TICKET,
      entityId: alert.ticketId || 'ALERT',
      companyId: alert.companyId,
      userId,
      description: `Alerta resolvido: ${alert.title}`,
    });

    return alert;
  }

  /**
   * Obtém dashboard de alertas
   */
  async getAlertsDashboard(companyId: string) {
    const [total, critical, unresolved, byType, bySeverity] = await Promise.all([
      this.prisma.alert.count({ where: { companyId } }),
      this.prisma.alert.count({
        where: { companyId, severity: AlertSeverity.CRITICO },
      }),
      this.prisma.alert.count({
        where: { companyId, resolved: false },
      }),
      this.prisma.alert.groupBy({
        by: ['type'],
        where: { companyId },
        _count: true,
      }),
      this.prisma.alert.groupBy({
        by: ['severity'],
        where: { companyId },
        _count: true,
      }),
    ]);

    return {
      summary: {
        total,
        critical,
        unresolved,
      },
      byType: Object.fromEntries(byType.map((x) => [x.type, x._count])),
      bySeverity: Object.fromEntries(bySeverity.map((x) => [x.severity, x._count])),
    };
  }

  /**
   * Calcula percentual de SLA consumido
   */
  private calculateSlaPercentUsed(openedAt: Date, deadline: Date, now: Date): number {
    const total = deadline.getTime() - openedAt.getTime();
    const consumed = now.getTime() - openedAt.getTime();
    return Math.round((consumed / total) * 100);
  }

  /**
   * Agrupa alertas por severidade
   */
  private groupBySeverity(alerts: any[]) {
    return alerts.reduce(
      (acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Agrupa alertas por tipo
   */
  private groupByType(alerts: any[]) {
    return alerts.reduce(
      (acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Executa detecção de alertas para todas as empresas
   * Pode ser chamado manualmente ou via agendador (Bull, etc)
   */
  async runAlertDetection() {
    try {
      // Obter todas as empresas ativas
      const companies = await this.prisma.company.findMany({
        where: { active: true },
        select: { id: true },
      });

      for (const company of companies) {
        await this.detectAlerts(company.id);
      }

      console.log(`[Alertas] Detecção executada para ${companies.length} empresa(s)`);
    } catch (err) {
      console.error('[Alertas] Erro durante detecção:', err);
    }
  }
}
