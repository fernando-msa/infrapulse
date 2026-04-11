import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, TicketPriority, SlaStatus } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { FilterTicketsDto } from './dto/filter-tickets.dto';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: FilterTicketsDto, companyId?: string) {
    const where: any = {};

    if (companyId) where.companyId = companyId;
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

  async findById(id: string) {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        slaRule: true,
        importBatch: true,
      },
    });
  }

  async create(createTicketDto: CreateTicketDto, userId: string, companyId?: string) {
    const slaRule = await this.getSlaRule(createTicketDto.priority, companyId);

    let slaDeadline: Date | undefined;
    let slaResponseDeadline: Date | undefined;

    if (slaRule) {
      const openedAt = new Date();
      slaDeadline = new Date(openedAt.getTime() + slaRule.resolutionTime * 60000);
      slaResponseDeadline = new Date(openedAt.getTime() + slaRule.responseTime * 60000);
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

  async update(id: string, data: Partial<CreateTicketDto>) {
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

  async recalculateAllSla() {
    const openTickets = await this.prisma.ticket.findMany({
      where: {
        status: { notIn: [TicketStatus.CONCLUIDO, TicketStatus.CANCELADO] },
        slaDeadline: { not: null },
      },
    });

    for (const ticket of openTickets) {
      await this.updateSlaStatus(ticket.id);
    }
  }

  private async getSlaRule(priority: TicketPriority, companyId?: string) {
    return this.prisma.slaRule.findFirst({
      where: {
        priority,
        ...(companyId ? { companyId } : {}),
      },
    });
  }

  async getQueueByTechnician(companyId?: string) {
    const technicians = await this.prisma.user.findMany({
      where: {
        role: { in: ['ANALISTA', 'GESTOR'] },
        active: true,
        ...(companyId ? { companyId } : {}),
      },
    });

    const queue = await Promise.all(
      technicians.map(async (tech) => {
        const tickets = await this.prisma.ticket.findMany({
          where: {
            assignedToId: tech.id,
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
}
