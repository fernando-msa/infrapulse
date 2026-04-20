import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, TicketPriority, SlaStatus } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { FilterTicketsDto } from './dto/filter-tickets.dto';
import { CompaniesService } from '../companies/companies.service';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private companiesService: CompaniesService,
    private firebaseService: FirebaseService,
  ) {}

  private get isFirebase() {
    return process.env.DATA_PROVIDER === 'firebase';
  }

  async findAll(filters: FilterTicketsDto, companyId: string) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const ticketsSnap = await db.collection('tickets').where('companyId', '==', companyId).get();

      let tickets = ticketsSnap.docs.map((doc) => this.normalizeTicket(doc.data()));

      if (filters.status) tickets = tickets.filter((t) => t.status === filters.status);
      if (filters.priority) tickets = tickets.filter((t) => t.priority === filters.priority);
      if (filters.sector) {
        const sector = filters.sector.toLowerCase();
        tickets = tickets.filter((t) => (t.sector || '').toLowerCase().includes(sector));
      }
      if (filters.assignedToId) tickets = tickets.filter((t) => t.assignedToId === filters.assignedToId);
      if (filters.slaStatus) tickets = tickets.filter((t) => t.slaStatus === filters.slaStatus);

      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;
      if (startDate || endDate) {
        tickets = tickets.filter((t) => {
          const openedAt = this.toDate(t.openedAt);
          if (!openedAt) return false;
          if (startDate && openedAt < startDate) return false;
          if (endDate && openedAt > endDate) return false;
          return true;
        });
      }

      tickets.sort((a, b) => {
        const priorityOrder = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
        const pa = priorityOrder.indexOf(a.priority);
        const pb = priorityOrder.indexOf(b.priority);
        if (pa !== pb) return pb - pa;
        return (this.toDate(b.openedAt)?.getTime() || 0) - (this.toDate(a.openedAt)?.getTime() || 0);
      });

      return tickets;
    }

    // OBRIGATÓRIO: Isolamento multi-tenant - companyId sempre vem do JWT
    const where: any = { companyId };

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.sector) where.sector = { contains: filters.sector, mode: 'insensitive' };
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.slaStatus) where.slaStatus = filters.slaStatus;

    if (filters.startDate || filters.endDate) {
      where.openedAt = {};
      if (filters.startDate) where.openedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.openedAt.lte = new Date(filters.endDate);
    }

    return this.prisma.ticket.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        slaRule: true,
      },
      orderBy: [{ priority: 'desc' }, { openedAt: 'desc' }],
    });
  }

  async findById(id: string, companyId: string) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const ticketDoc = await db.collection('tickets').doc(id).get();

      if (!ticketDoc.exists) {
        throw new NotFoundException('Chamado não encontrado');
      }

      const ticket = this.normalizeTicket(ticketDoc.data());
      if (ticket.companyId !== companyId) {
        throw new NotFoundException('Chamado não encontrado');
      }

      return ticket;
    }

    // OBRIGATÓRIO: Isolamento multi-tenant
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, companyId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        slaRule: true,
        importBatch: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Chamado não encontrado');
    }

    return ticket;
  }

  async create(createTicketDto: CreateTicketDto, userId: string, companyId: string) {
    // OBRIGATÓRIO: Isolamento multi-tenant
    await this.companiesService.ensureTicketQuotaAvailable(companyId);

    const slaRule = await this.getSlaRule(createTicketDto.priority, companyId);

    let slaDeadline: Date | undefined;
    let slaResponseDeadline: Date | undefined;

    if (slaRule) {
      const openedAt = new Date();
      slaDeadline = new Date(openedAt.getTime() + slaRule.resolutionTime * 60000);
      slaResponseDeadline = new Date(openedAt.getTime() + slaRule.responseTime * 60000);
    }

    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const ref = db.collection('tickets').doc();
      const now = new Date();

      const ticket = {
        id: ref.id,
        title: createTicketDto.title,
        description: createTicketDto.description || null,
        status: createTicketDto.status || TicketStatus.ABERTO,
        priority: createTicketDto.priority,
        category: createTicketDto.category || null,
        sector: createTicketDto.sector || null,
        companyId,
        assignedToId: createTicketDto.assignedToId || null,
        createdById: userId,
        slaRuleId: slaRule?.id || null,
        slaStatus: SlaStatus.OK,
        openedAt: createTicketDto.openedAt ? new Date(createTicketDto.openedAt) : now,
        firstResponseAt: null,
        resolvedAt: null,
        slaDeadline: slaDeadline || null,
        slaResponseDeadline: slaResponseDeadline || null,
        createdAt: now,
        updatedAt: now,
      };

      await ref.set(ticket);
      return ticket;
    }

    return this.prisma.ticket.create({
      data: {
        ...createTicketDto,
        companyId,
        createdById: userId,
        slaRuleId: slaRule?.id,
        slaDeadline,
        slaResponseDeadline,
      },
    });
  }

  async update(id: string, data: Partial<CreateTicketDto>, companyId: string) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const ref = db.collection('tickets').doc(id);
      const ticketDoc = await ref.get();

      if (!ticketDoc.exists) {
        throw new NotFoundException('Chamado não encontrado');
      }

      const current = this.normalizeTicket(ticketDoc.data());
      if (current.companyId !== companyId) {
        throw new NotFoundException('Chamado não encontrado');
      }

      const patch: any = {
        ...data,
        updatedAt: new Date(),
      };

      if (data.status === TicketStatus.CONCLUIDO) {
        patch.resolvedAt = new Date();
      }

      await ref.update(patch);
      await this.updateSlaStatus(id);

      const updatedDoc = await ref.get();
      return this.normalizeTicket(updatedDoc.data());
    }

    // OBRIGATÓRIO: Isolamento multi-tenant
    const ticketExists = await this.prisma.ticket.findFirst({
      where: { id, companyId },
      select: { id: true, companyId: true },
    });

    if (!ticketExists) {
      throw new NotFoundException('Chamado não encontrado');
    }

    // Já isolado por companyId na query acima
    if (data.status === TicketStatus.CONCLUIDO) {
      (data as any).resolvedAt = new Date();
    }

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data,
    });

    await this.updateSlaStatus(ticket.id);
    return ticket;
  }

  async updateSlaStatus(ticketId: string) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const ref = db.collection('tickets').doc(ticketId);
      const snap = await ref.get();
      if (!snap.exists) return;

      const ticket = this.normalizeTicket(snap.data());
      const slaDeadline = this.toDate(ticket.slaDeadline);
      if (!slaDeadline) return;

      if (ticket.status === TicketStatus.CONCLUIDO || ticket.status === TicketStatus.CANCELADO) {
        const resolvedAt = this.toDate(ticket.resolvedAt);
        const slaStatus = resolvedAt && slaDeadline > resolvedAt ? SlaStatus.OK : SlaStatus.VIOLADO;
        await ref.update({ slaStatus, updatedAt: new Date() });
        return;
      }

      const now = new Date();
      const openedAt = this.toDate(ticket.openedAt) || now;
      const timeToDeadline = slaDeadline.getTime() - now.getTime();
      const totalTime = slaDeadline.getTime() - openedAt.getTime();
      const percentRemaining = totalTime <= 0 ? 0 : (timeToDeadline / totalTime) * 100;

      let slaStatus: SlaStatus;
      if (now > slaDeadline) {
        slaStatus = SlaStatus.VIOLADO;
      } else if (percentRemaining <= 20) {
        slaStatus = SlaStatus.EM_RISCO;
      } else {
        slaStatus = SlaStatus.OK;
      }

      await ref.update({ slaStatus, updatedAt: new Date() });
      return;
    }

    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || !ticket.slaDeadline) return;

    if (ticket.status === TicketStatus.CONCLUIDO || ticket.status === TicketStatus.CANCELADO) {
      if (ticket.resolvedAt && ticket.slaDeadline > ticket.resolvedAt) {
        await this.prisma.ticket.update({
          where: { id: ticketId },
          data: { slaStatus: SlaStatus.OK },
        });
      } else {
        await this.prisma.ticket.update({
          where: { id: ticketId },
          data: { slaStatus: SlaStatus.VIOLADO },
        });
      }
      return;
    }

    const now = new Date();
    const timeToDeadline = ticket.slaDeadline.getTime() - now.getTime();
    const totalTime = ticket.slaDeadline.getTime() - ticket.openedAt.getTime();
    const percentRemaining = (timeToDeadline / totalTime) * 100;

    let slaStatus: SlaStatus;
    if (now > ticket.slaDeadline) {
      slaStatus = SlaStatus.VIOLADO;
    } else if (percentRemaining <= 20) {
      slaStatus = SlaStatus.EM_RISCO;
    } else {
      slaStatus = SlaStatus.OK;
    }

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { slaStatus },
    });
  }

  async recalculateAllSla(companyId: string) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const tickets = await db.collection('tickets').where('companyId', '==', companyId).get();

      for (const doc of tickets.docs) {
        const ticket = this.normalizeTicket(doc.data());
        if (ticket.status !== TicketStatus.CONCLUIDO && ticket.status !== TicketStatus.CANCELADO && ticket.slaDeadline) {
          await this.updateSlaStatus(ticket.id);
        }
      }
      return;
    }

    // OBRIGATÓRIO: Isolamento multi-tenant
    const openTickets = await this.prisma.ticket.findMany({
      where: {
        companyId, // Isolamento
        status: { notIn: [TicketStatus.CONCLUIDO, TicketStatus.CANCELADO] },
        slaDeadline: { not: null },
      },
    });

    for (const ticket of openTickets) {
      await this.updateSlaStatus(ticket.id);
    }
  }

  private async getSlaRule(priority: TicketPriority, companyId: string) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const rules = await db
        .collection('sla_rules')
        .where('companyId', '==', companyId)
        .where('priority', '==', priority)
        .limit(1)
        .get();

      return rules.empty ? null : (rules.docs[0].data() as any);
    }

    // OBRIGATÓRIO: Isolamento multi-tenant
    return this.prisma.slaRule.findFirst({
      where: { priority, companyId },
    });
  }

  async getQueueByTechnician(companyId: string) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();

      const [usersSnap, ticketsSnap] = await Promise.all([
        db.collection('users').where('companyId', '==', companyId).where('active', '==', true).get(),
        db.collection('tickets').where('companyId', '==', companyId).get(),
      ]);

      const technicians = usersSnap.docs
        .map((doc) => doc.data() as any)
        .filter((user) => user.role === 'ANALISTA' || user.role === 'GESTOR');

      const tickets = ticketsSnap.docs
        .map((doc) => this.normalizeTicket(doc.data()))
        .filter((ticket) =>
          [TicketStatus.ABERTO, TicketStatus.EM_ANDAMENTO, TicketStatus.PENDENTE].includes(ticket.status),
        );

      const queue = technicians.map((tech) => {
        const assigned = tickets
          .filter((t) => t.assignedToId === tech.id)
          .sort((a, b) => {
            const priorityOrder = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
            const pa = priorityOrder.indexOf(a.priority);
            const pb = priorityOrder.indexOf(b.priority);
            if (pa !== pb) return pb - pa;
            return (this.toDate(a.openedAt)?.getTime() || 0) - (this.toDate(b.openedAt)?.getTime() || 0);
          });

        return {
          technician: {
            id: tech.id,
            name: tech.name,
            email: tech.email,
            role: tech.role,
          },
          ticketCount: assigned.length,
          tickets: assigned,
          hasOverload: assigned.length > 5,
        };
      });

      return queue.sort((a, b) => b.ticketCount - a.ticketCount);
    }

    // OBRIGATÓRIO: Isolamento multi-tenant
    const technicians = await this.prisma.user.findMany({
      where: {
        role: { in: ['ANALISTA', 'GESTOR'] },
        active: true,
        companyId, // Isolamento
      },
    });

    const queue = await Promise.all(
      technicians.map(async (tech) => {
        const tickets = await this.prisma.ticket.findMany({
          where: {
            assignedToId: tech.id,
            companyId, // Isolamento
            status: { in: [TicketStatus.ABERTO, TicketStatus.EM_ANDAMENTO, TicketStatus.PENDENTE] },
          },
          orderBy: [{ priority: 'desc' }, { openedAt: 'asc' }],
        });

        return {
          technician: tech,
          ticketCount: tickets.length,
          tickets,
          hasOverload: tickets.length > 5,
        };
      }),
    );

    return queue.sort((a, b) => b.ticketCount - a.ticketCount);
  }

  private normalizeTicket(ticket: any) {
    if (!ticket) return ticket;

    return {
      ...ticket,
      openedAt: this.toDate(ticket.openedAt),
      firstResponseAt: this.toDate(ticket.firstResponseAt),
      resolvedAt: this.toDate(ticket.resolvedAt),
      slaDeadline: this.toDate(ticket.slaDeadline),
      slaResponseDeadline: this.toDate(ticket.slaResponseDeadline),
      createdAt: this.toDate(ticket.createdAt),
      updatedAt: this.toDate(ticket.updatedAt),
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
