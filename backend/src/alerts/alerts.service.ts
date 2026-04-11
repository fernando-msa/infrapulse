import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, TicketPriority, SlaStatus } from '@prisma/client';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async getAlerts(companyId?: string) {
    const now = new Date();
    const in30min = new Date(now.getTime() + 30 * 60000);

    const where: any = {
      status: { notIn: [TicketStatus.CONCLUIDO, TicketStatus.CANCELADO] },
    };
    if (companyId) where.companyId = companyId;

    // Próximos do vencimento (nos próximos 30 minutos)
    const proximosDoVencimento = await this.prisma.ticket.findMany({
      where: {
        ...where,
        slaDeadline: { gte: now, lte: in30min },
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    // Críticos abertos
    const criticosAbertos = await this.prisma.ticket.findMany({
      where: {
        ...where,
        priority: TicketPriority.CRITICA,
        status: TicketStatus.ABERTO,
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    // SLA violado
    const slaViolados = await this.prisma.ticket.findMany({
      where: { ...where, slaStatus: SlaStatus.VIOLADO },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    // Técnicos sobrecarregados (>5 chamados ativos)
    const technicians = await this.prisma.user.findMany({
      where: { role: { in: ['ANALISTA', 'GESTOR'] }, active: true, ...(companyId ? { companyId } : {}) },
    });

    const tecnicosOverloaded = [];
    for (const tech of technicians) {
      const count = await this.prisma.ticket.count({
        where: {
          assignedToId: tech.id,
          status: { notIn: [TicketStatus.CONCLUIDO, TicketStatus.CANCELADO] },
        },
      });
      if (count > 5) {
        tecnicosOverloaded.push({ technician: tech, ticketCount: count });
      }
    }

    return {
      proximosDoVencimento,
      criticosAbertos,
      slaViolados,
      tecnicosOverloaded,
      summary: {
        totalAlertas:
          proximosDoVencimento.length +
          criticosAbertos.length +
          slaViolados.length +
          tecnicosOverloaded.length,
      },
    };
  }
}
