import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, SlaStatus, TicketPriority } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getExecutiveDashboard(companyId?: string, startDate?: string, endDate?: string) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (startDate || endDate) {
      where.openedAt = {};
      if (startDate) where.openedAt.gte = new Date(startDate);
      if (endDate) where.openedAt.lte = new Date(endDate);
    }

    const [total, abertos, concluidos, emRisco, violados, allTickets] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.count({ where: { ...where, status: TicketStatus.ABERTO } }),
      this.prisma.ticket.count({ where: { ...where, status: TicketStatus.CONCLUIDO } }),
      this.prisma.ticket.count({ where: { ...where, slaStatus: SlaStatus.EM_RISCO } }),
      this.prisma.ticket.count({ where: { ...where, slaStatus: SlaStatus.VIOLADO } }),
      this.prisma.ticket.findMany({
        where: { ...where, status: TicketStatus.CONCLUIDO, resolvedAt: { not: null } },
        select: { openedAt: true, resolvedAt: true },
      }),
    ]);

    // Tempo médio de atendimento em horas
    let tempoMedioAtendimento = 0;
    if (allTickets.length > 0) {
      const totalMinutes = allTickets.reduce((acc, t) => {
        const diff = (t.resolvedAt!.getTime() - t.openedAt.getTime()) / 60000;
        return acc + diff;
      }, 0);
      tempoMedioAtendimento = Math.round(totalMinutes / allTickets.length / 60 * 10) / 10;
    }

    const slaOk = total - emRisco - violados;
    const percentualSlaOk = total > 0 ? Math.round((slaOk / total) * 100) : 0;
    const percentualSlaRisco = total > 0 ? Math.round(((emRisco + violados) / total) * 100) : 0;

    // Ranking por setor
    const ticketsBySetor = await this.prisma.ticket.groupBy({
      by: ['sector'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Ranking por categoria
    const ticketsByCategoria = await this.prisma.ticket.groupBy({
      by: ['category'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Chamados por status
    const byStatus = await this.prisma.ticket.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    // Chamados por prioridade
    const byPriority = await this.prisma.ticket.groupBy({
      by: ['priority'],
      where,
      _count: { id: true },
    });

    return {
      kpis: {
        total,
        abertos,
        concluidos,
        emAndamento: await this.prisma.ticket.count({ where: { ...where, status: TicketStatus.EM_ANDAMENTO } }),
        pendentes: await this.prisma.ticket.count({ where: { ...where, status: TicketStatus.PENDENTE } }),
        emRisco,
        violados,
        percentualSlaOk,
        percentualSlaRisco,
        tempoMedioAtendimento,
      },
      rankingSetores: ticketsBySetor.map(s => ({
        name: s.sector || 'Sem setor',
        count: s._count.id,
      })),
      rankingCategorias: ticketsByCategoria.map(c => ({
        name: c.category || 'Sem categoria',
        count: c._count.id,
      })),
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
      byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count.id })),
    };
  }

  async getOperationalDashboard(companyId?: string) {
    const where: any = {
      status: { notIn: [TicketStatus.CONCLUIDO, TicketStatus.CANCELADO] },
    };
    if (companyId) where.companyId = companyId;

    const [emRisco, criticos] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { ...where, slaStatus: SlaStatus.EM_RISCO },
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { slaDeadline: 'asc' },
      }),
      this.prisma.ticket.findMany({
        where: { ...where, priority: TicketPriority.CRITICA },
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { openedAt: 'asc' },
      }),
    ]);

    return { emRisco, criticos };
  }
}
