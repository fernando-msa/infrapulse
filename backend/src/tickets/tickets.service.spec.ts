import { SlaStatus, TicketStatus } from '@prisma/client';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  const prisma = {
    ticket: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    slaRule: {
      findFirst: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const service = new TicketsService(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve aplicar filtros e companyId no findAll', async () => {
    prisma.ticket.findMany.mockResolvedValue([]);

    await service.findAll(
      {
        status: TicketStatus.ABERTO,
        sector: 'Suporte',
      } as any,
      'company-1',
    );

    expect(prisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          status: TicketStatus.ABERTO,
          sector: { contains: 'Suporte', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('deve definir resolvedAt ao concluir ticket no update', async () => {
    prisma.ticket.update.mockResolvedValue({ id: 't1', status: TicketStatus.CONCLUIDO });
    const updateSlaSpy = jest.spyOn(service, 'updateSlaStatus').mockResolvedValue();

    await service.update('t1', { status: TicketStatus.CONCLUIDO } as any);

    expect(prisma.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't1' },
        data: expect.objectContaining({
          status: TicketStatus.CONCLUIDO,
          resolvedAt: expect.any(Date),
        }),
      }),
    );
    expect(updateSlaSpy).toHaveBeenCalledWith('t1');
  });

  it('deve marcar SLA como VIOLADO quando chamado aberto estiver vencido', async () => {
    const openedAt = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const slaDeadline = new Date(Date.now() - 60 * 1000);

    prisma.ticket.findUnique.mockResolvedValue({
      id: 't1',
      status: TicketStatus.ABERTO,
      openedAt,
      slaDeadline,
      resolvedAt: null,
    });
    prisma.ticket.update.mockResolvedValue({ id: 't1' });

    await service.updateSlaStatus('t1');

    expect(prisma.ticket.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { slaStatus: SlaStatus.VIOLADO },
    });
  });
});
