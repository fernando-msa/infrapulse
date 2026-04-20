import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, SlaStatus, TicketPriority } from '@prisma/client';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class MetricsService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

  private get isFirebase() {
    return process.env.DATA_PROVIDER === 'firebase';
  }

  async getSlaMetrics() {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const ticketsSnap = await db.collection('tickets').get();
      const tickets = ticketsSnap.docs.map((doc) => this.normalizeTicket(doc.data()));

      const total = tickets.length;
      const ok = tickets.filter((t) => t.slaStatus === SlaStatus.OK).length;
      const emRisco = tickets.filter((t) => t.slaStatus === SlaStatus.EM_RISCO).length;
      const violado = tickets.filter((t) => t.slaStatus === SlaStatus.VIOLADO).length;

      const allTickets = tickets.filter(
        (t) => t.status === TicketStatus.CONCLUIDO && this.toDate(t.openedAt) && this.toDate(t.resolvedAt),
      );

      let tempoMedioAtendimento = 0;
      if (allTickets.length > 0) {
        const totalMinutes = allTickets.reduce((acc, t) => {
          const openedAt = this.toDate(t.openedAt)!;
          const resolvedAt = this.toDate(t.resolvedAt)!;
          const diff = (resolvedAt.getTime() - openedAt.getTime()) / 60000;
          return acc + diff;
        }, 0);
        tempoMedioAtendimento = Math.round((totalMinutes / allTickets.length / 60) * 10) / 10;
      }

      const percentualOk = total > 0 ? Math.round((ok / total) * 100) : 0;
      const percentualRisco = total > 0 ? Math.round((emRisco / total) * 100) : 0;
      const percentualViolado = total > 0 ? Math.round((violado / total) * 100) : 0;

      return {
        total,
        ok,
        emRisco,
        violado,
        percentualOk,
        percentualRisco,
        percentualViolado,
        tempoMedioAtendimento,
        timestamp: new Date().toISOString(),
      };
    }

    const [total, ok, emRisco, violado, allTickets] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.ticket.count({ where: { slaStatus: SlaStatus.OK } }),
      this.prisma.ticket.count({ where: { slaStatus: SlaStatus.EM_RISCO } }),
      this.prisma.ticket.count({ where: { slaStatus: SlaStatus.VIOLADO } }),
      this.prisma.ticket.findMany({
        where: { status: TicketStatus.CONCLUIDO },
        select: {
          openedAt: true,
          resolvedAt: true,
          priority: true,
        },
      }),
    ]);

    // Tempo médio de atendimento em horas
    let tempoMedioAtendimento = 0;
    if (allTickets.length > 0) {
      const totalMinutes = allTickets.reduce((acc, t) => {
        const diff = (t.resolvedAt!.getTime() - t.openedAt.getTime()) / 60000;
        return acc + diff;
      }, 0);
      tempoMedioAtendimento = Math.round((totalMinutes / allTickets.length / 60) * 10) / 10;
    }

    const percentualOk = total > 0 ? Math.round((ok / total) * 100) : 0;
    const percentualRisco = total > 0 ? Math.round((emRisco / total) * 100) : 0;
    const percentualViolado = total > 0 ? Math.round((violado / total) * 100) : 0;

    return {
      total,
      ok,
      emRisco,
      violado,
      percentualOk,
      percentualRisco,
      percentualViolado,
      tempoMedioAtendimento,
      timestamp: new Date().toISOString(),
    };
  }

  async getTeamsPerformance() {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const [usersSnap, ticketsSnap] = await Promise.all([
        db.collection('users').where('role', '==', 'ANALISTA').get(),
        db.collection('tickets').get(),
      ]);

      const analysts = usersSnap.docs.map((doc) => doc.data() as any);
      const tickets = ticketsSnap.docs.map((doc) => this.normalizeTicket(doc.data()));

      const performance = analysts.map((analyst) => {
        const assigned = tickets.filter((t) => t.assignedToId === analyst.id);
        const total = assigned.length;
        const concluded = assigned.filter((t) => t.status === TicketStatus.CONCLUIDO).length;
        const slaOk = assigned.filter((t) => t.slaStatus === SlaStatus.OK).length;
        const emRisco = assigned.filter((t) => t.slaStatus === SlaStatus.EM_RISCO).length;
        const violado = assigned.filter((t) => t.slaStatus === SlaStatus.VIOLADO).length;

        const taxaSlaCompliance = total > 0 ? Math.round((slaOk / total) * 100) : 0;

        let tempoMedioResolucao = 0;
        const concludedTickets = assigned.filter(
          (t) => t.status === TicketStatus.CONCLUIDO && this.toDate(t.resolvedAt) && this.toDate(t.openedAt),
        );

        if (concludedTickets.length > 0) {
          const totalMinutes = concludedTickets.reduce((acc, t) => {
            const openedAt = this.toDate(t.openedAt)!;
            const resolvedAt = this.toDate(t.resolvedAt)!;
            const diff = (resolvedAt.getTime() - openedAt.getTime()) / 60000;
            return acc + diff;
          }, 0);
          tempoMedioResolucao = Math.round((totalMinutes / concludedTickets.length / 60) * 10) / 10;
        }

        const criticos = assigned.filter((t) => t.priority === TicketPriority.CRITICA).length;

        return {
          id: analyst.id,
          name: analyst.name,
          email: analyst.email,
          totalTickets: total,
          concluidos: concluded,
          emAberto: total - concluded,
          slaOk,
          emRisco,
          violado,
          taxaSlaCompliance,
          tempoMedioResolucao,
          ticketsCriticos: criticos,
        };
      });

      return {
        teams: performance.sort((a, b) => b.totalTickets - a.totalTickets),
        timestamp: new Date().toISOString(),
      };
    }

    const analysts = await this.prisma.user.findMany({
      where: { role: 'ANALISTA' },
      select: {
        id: true,
        name: true,
        email: true,
        assignedTickets: {
          select: {
            id: true,
            status: true,
            slaStatus: true,
            priority: true,
            openedAt: true,
            resolvedAt: true,
          },
        },
      },
    });

    const performance = analysts.map(analyst => {
      const tickets = analyst.assignedTickets;
      const total = tickets.length;
      const concluded = tickets.filter(t => t.status === TicketStatus.CONCLUIDO).length;
      const slaOk = tickets.filter(t => t.slaStatus === SlaStatus.OK).length;
      const emRisco = tickets.filter(t => t.slaStatus === SlaStatus.EM_RISCO).length;
      const violado = tickets.filter(t => t.slaStatus === SlaStatus.VIOLADO).length;

      // Taxa de SLA
      const taxaSlaCompliance = total > 0 ? Math.round((slaOk / total) * 100) : 0;

      // Tempo médio de resolução
      let tempoMedioResolucao = 0;
      const concludedTickets = tickets.filter(t => t.status === TicketStatus.CONCLUIDO && t.resolvedAt);
      if (concludedTickets.length > 0) {
        const totalMinutes = concludedTickets.reduce((acc, t) => {
          const diff = (t.resolvedAt!.getTime() - t.openedAt.getTime()) / 60000;
          return acc + diff;
        }, 0);
        tempoMedioResolucao = Math.round((totalMinutes / concludedTickets.length / 60) * 10) / 10;
      }

      // Tickets críticos
      const criticos = tickets.filter(t => t.priority === TicketPriority.CRITICA).length;

      return {
        id: analyst.id,
        name: analyst.name,
        email: analyst.email,
        totalTickets: total,
        concluidos: concluded,
        emAberto: total - concluded,
        slaOk,
        emRisco,
        violado,
        taxaSlaCompliance,
        tempoMedioResolucao,
        ticketsCriticos: criticos,
      };
    });

    return {
      teams: performance.sort((a, b) => b.totalTickets - a.totalTickets),
      timestamp: new Date().toISOString(),
    };
  }

  async getIncidents(limit: number = 50) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const [ticketsSnap, companiesSnap, usersSnap] = await Promise.all([
        db.collection('tickets').get(),
        db.collection('companies').get(),
        db.collection('users').get(),
      ]);

      const companiesById = new Map(companiesSnap.docs.map((d) => {
        const c: any = d.data();
        return [c.id, c.name];
      }));
      const usersById = new Map(usersSnap.docs.map((d) => {
        const u: any = d.data();
        return [u.id, u.name];
      }));

      const incidentsAll = ticketsSnap.docs
        .map((doc) => this.normalizeTicket(doc.data()))
        .filter((t) =>
          t.slaStatus === SlaStatus.VIOLADO ||
          t.slaStatus === SlaStatus.EM_RISCO ||
          t.priority === TicketPriority.CRITICA,
        )
        .sort((a, b) => (this.toDate(b.openedAt)?.getTime() || 0) - (this.toDate(a.openedAt)?.getTime() || 0));

      const incidents = incidentsAll.slice(0, limit).map((inc) => {
        const openedAt = this.toDate(inc.openedAt);
        const resolvedAt = this.toDate(inc.resolvedAt);

        return {
          id: inc.id,
          title: inc.title,
          description: inc.description,
          status: inc.status,
          priority: inc.priority,
          slaStatus: inc.slaStatus,
          daysOpen: openedAt
            ? Math.floor((Date.now() - openedAt.getTime()) / (1000 * 60 * 60 * 24))
            : 0,
          company: companiesById.get(inc.companyId) || 'Empresa não identificada',
          assignedTo: inc.assignedToId ? usersById.get(inc.assignedToId) || 'Não atribuído' : 'Não atribuído',
          openedAt: openedAt?.toISOString() || null,
          resolvedAt: resolvedAt?.toISOString() || null,
        };
      });

      return {
        total: incidentsAll.length,
        incidents,
        timestamp: new Date().toISOString(),
      };
    }

    const incidents = await this.prisma.ticket.findMany({
      where: {
        OR: [
          { slaStatus: SlaStatus.VIOLADO },
          { slaStatus: SlaStatus.EM_RISCO },
          { priority: TicketPriority.CRITICA },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        slaStatus: true,
        openedAt: true,
        resolvedAt: true,
        company: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: limit,
    });

    return {
      total: await this.prisma.ticket.count({
        where: {
          OR: [
            { slaStatus: SlaStatus.VIOLADO },
            { slaStatus: SlaStatus.EM_RISCO },
            { priority: TicketPriority.CRITICA },
          ],
        },
      }),
      incidents: incidents.map(inc => ({
        id: inc.id,
        title: inc.title,
        description: inc.description,
        status: inc.status,
        priority: inc.priority,
        slaStatus: inc.slaStatus,
        daysOpen: Math.floor((Date.now() - inc.openedAt.getTime()) / (1000 * 60 * 60 * 24)),
        company: inc.company.name,
        assignedTo: inc.assignedTo?.name || 'Não atribuído',
        openedAt: inc.openedAt.toISOString(),
        resolvedAt: inc.resolvedAt?.toISOString() || null,
      })),
      timestamp: new Date().toISOString(),
    };
  }

  private normalizeTicket(ticket: any) {
    return {
      ...ticket,
      openedAt: this.toDate(ticket?.openedAt),
      resolvedAt: this.toDate(ticket?.resolvedAt),
    };
  }

  private toDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
