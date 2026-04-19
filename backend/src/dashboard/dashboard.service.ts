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
        where,
        select: {
          openedAt: true,
          resolvedAt: true,
          status: true,
          slaStatus: true,
          assignedToId: true,
          assignedTo: { select: { id: true, name: true, role: true } },
        },
      }),
    ]);

    // Tempo médio de atendimento em horas
    let tempoMedioAtendimento = 0;
    const concludedTickets = allTickets.filter(t => t.status === TicketStatus.CONCLUIDO && t.resolvedAt);
    if (concludedTickets.length > 0) {
      const totalMinutes = concludedTickets.reduce((acc, t) => {
        const diff = (t.resolvedAt!.getTime() - t.openedAt.getTime()) / 60000;
        return acc + diff;
      }, 0);
      tempoMedioAtendimento = Math.round(totalMinutes / concludedTickets.length / 60 * 10) / 10;
    }

    const slaOk = total - emRisco - violados;
    const percentualSlaOk = total > 0 ? Math.round((slaOk / total) * 100) : 0;
    const percentualSlaRisco = total > 0 ? Math.round(((emRisco + violados) / total) * 100) : 0;

    const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' });
    const startTrend = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);
    const endTrend = endDate ? new Date(endDate) : new Date();
    const normalizedStart = new Date(startTrend.getFullYear(), startTrend.getMonth(), 1);
    const normalizedEnd = new Date(endTrend.getFullYear(), endTrend.getMonth(), 1);
    const monthBuckets: Array<{
      key: string;
      label: string;
      total: number;
      concluidos: number;
      violados: number;
      percentualSlaOk: number;
    }> = [];

    for (let cursor = new Date(normalizedStart); cursor <= normalizedEnd; cursor.setMonth(cursor.getMonth() + 1)) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      monthBuckets.push({
        key,
        label: monthFormatter.format(cursor),
        total: 0,
        concluidos: 0,
        violados: 0,
        percentualSlaOk: 0,
      });
    }

    const monthLookup = new Map(monthBuckets.map(bucket => [bucket.key, bucket]));
    for (const ticket of allTickets) {
      const opened = new Date(ticket.openedAt);
      const key = `${opened.getFullYear()}-${String(opened.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthLookup.get(key);
      if (!bucket) continue;

      bucket.total += 1;
      if (ticket.status === TicketStatus.CONCLUIDO) bucket.concluidos += 1;
      if (ticket.slaStatus === SlaStatus.VIOLADO) bucket.violados += 1;
    }

    monthBuckets.forEach((bucket) => {
      const slaOkMonth = bucket.total - bucket.violados;
      bucket.percentualSlaOk = bucket.total > 0 ? Math.round((slaOkMonth / bucket.total) * 100) : 0;
    });

    const analystMap = new Map<string, {
      id: string;
      name: string;
      total: number;
      concluidos: number;
      emRisco: number;
      violados: number;
      totalMinutes: number;
    }>();

    for (const ticket of allTickets) {
      if (!ticket.assignedTo || !ticket.assignedToId) continue;
      if (ticket.assignedTo.role !== 'ANALISTA' && ticket.assignedTo.role !== 'GESTOR') continue;

      const current = analystMap.get(ticket.assignedToId) || {
        id: ticket.assignedTo.id,
        name: ticket.assignedTo.name,
        total: 0,
        concluidos: 0,
        emRisco: 0,
        violados: 0,
        totalMinutes: 0,
      };

      current.total += 1;
      if (ticket.status === TicketStatus.CONCLUIDO && ticket.resolvedAt) {
        current.concluidos += 1;
        current.totalMinutes += (ticket.resolvedAt.getTime() - ticket.openedAt.getTime()) / 60000;
      }
      if (ticket.slaStatus === SlaStatus.EM_RISCO) current.emRisco += 1;
      if (ticket.slaStatus === SlaStatus.VIOLADO) current.violados += 1;

      analystMap.set(ticket.assignedToId, current);
    }

    const performanceByAnalyst = Array.from(analystMap.values())
      .map((item) => {
        const slaOkCount = item.total - item.violados;
        return {
          id: item.id,
          name: item.name,
          total: item.total,
          concluidos: item.concluidos,
          emRisco: item.emRisco,
          violados: item.violados,
          percentualSlaOk: item.total > 0 ? Math.round((slaOkCount / item.total) * 100) : 0,
          tempoMedioAtendimento: item.concluidos > 0 ? Math.round((item.totalMinutes / item.concluidos / 60) * 10) / 10 : 0,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

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
      monthlyTrend: monthBuckets.map(bucket => ({
        month: bucket.label,
        total: bucket.total,
        concluidos: bucket.concluidos,
        violados: bucket.violados,
        percentualSlaOk: bucket.percentualSlaOk,
      })),
      performanceByAnalyst,
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
