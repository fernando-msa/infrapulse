import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTicketsReport(filters: any, companyId: string) {
    // OBRIGATÓRIO: Isolamento multi-tenant
    const where: any = { companyId };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.slaStatus) where.slaStatus = filters.slaStatus;
    if (filters?.sector) where.sector = { contains: filters.sector, mode: 'insensitive' };
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;

    if (filters?.startDate || filters?.endDate) {
      where.openedAt = {};
      if (filters.startDate) where.openedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.openedAt.lte = new Date(filters.endDate);
    }

    return this.prisma.ticket.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ openedAt: 'desc' }],
    });
  }

  generateCsv(rows: any[]) {
    const header = [
      'id',
      'titulo',
      'status',
      'prioridade',
      'slaStatus',
      'setor',
      'categoria',
      'tecnico',
      'abertoEm',
      'resolvidoEm',
    ];

    const escapeValue = (value: unknown) => {
      const text = value == null ? '' : String(value);
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const lines = rows.map((ticket) => [
      ticket.id,
      ticket.title,
      ticket.status,
      ticket.priority,
      ticket.slaStatus,
      ticket.sector || '',
      ticket.category || '',
      ticket.assignedTo?.name || '',
      ticket.openedAt ? new Date(ticket.openedAt).toISOString() : '',
      ticket.resolvedAt ? new Date(ticket.resolvedAt).toISOString() : '',
    ].map(escapeValue).join(','));

    return [header.join(','), ...lines].join('\n');
  }
}
