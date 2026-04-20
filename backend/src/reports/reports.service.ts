import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
  ) {}

  private get isFirebase() {
    return process.env.DATA_PROVIDER === 'firebase';
  }

  async getTicketsReport(filters: any, companyId: string) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const [ticketsSnap, usersSnap] = await Promise.all([
        db.collection('tickets').where('companyId', '==', companyId).get(),
        db.collection('users').where('companyId', '==', companyId).get(),
      ]);

      const usersById = new Map(usersSnap.docs.map((doc) => {
        const user: any = doc.data();
        return [user.id, user];
      }));

      let tickets = ticketsSnap.docs.map((doc) => this.normalizeTicket(doc.data()));

      if (filters?.status) tickets = tickets.filter((t) => t.status === filters.status);
      if (filters?.priority) tickets = tickets.filter((t) => t.priority === filters.priority);
      if (filters?.slaStatus) tickets = tickets.filter((t) => t.slaStatus === filters.slaStatus);
      if (filters?.sector) {
        const sector = String(filters.sector).toLowerCase();
        tickets = tickets.filter((t) => (t.sector || '').toLowerCase().includes(sector));
      }
      if (filters?.assignedToId) tickets = tickets.filter((t) => t.assignedToId === filters.assignedToId);

      const startDate = filters?.startDate ? new Date(filters.startDate) : null;
      const endDate = filters?.endDate ? new Date(filters.endDate) : null;
      if (startDate || endDate) {
        tickets = tickets.filter((t) => {
          const openedAt = this.toDate(t.openedAt);
          if (!openedAt) return false;
          if (startDate && openedAt < startDate) return false;
          if (endDate && openedAt > endDate) return false;
          return true;
        });
      }

      const mapped = tickets
        .map((ticket) => ({
          ...ticket,
          assignedTo: ticket.assignedToId
            ? this.pickUser(usersById.get(ticket.assignedToId))
            : null,
          createdBy: ticket.createdById
            ? this.pickCreator(usersById.get(ticket.createdById))
            : null,
        }))
        .sort((a, b) => (this.toDate(b.openedAt)?.getTime() || 0) - (this.toDate(a.openedAt)?.getTime() || 0));

      return mapped;
    }

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

  private pickUser(user: any) {
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }

  private pickCreator(user: any) {
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
    };
  }

  private normalizeTicket(ticket: any) {
    return {
      ...ticket,
      openedAt: this.toDate(ticket.openedAt),
      resolvedAt: this.toDate(ticket.resolvedAt),
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
