import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

  private get isFirebase() {
    return process.env.DATA_PROVIDER === 'firebase';
  }

  private getPlanConfig(plan: string) {
    const plans: Record<string, { seatLimit: number; monthlyTicketLimit: number }> = {
      TRIAL: { seatLimit: 5, monthlyTicketLimit: 200 },
      STARTER: { seatLimit: 15, monthlyTicketLimit: 2000 },
      GROWTH: { seatLimit: 50, monthlyTicketLimit: 10000 },
      ENTERPRISE: { seatLimit: 500, monthlyTicketLimit: 100000 },
    };

    return plans[plan] || plans.TRIAL;
  }

  async getCurrentCompany(companyId: string) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const doc = await db.collection('companies').doc(companyId).get();

      if (!doc.exists) {
        throw new NotFoundException('Empresa não encontrada');
      }

      return doc.data() as any;
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        cnpj: true,
        active: true,
        plan: true,
        subscriptionStatus: true,
        seatLimit: true,
        monthlyTicketLimit: true,
        trialEndsAt: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        createdAt: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  async getUsage(companyId: string) {
    const company = await this.getCurrentCompany(companyId);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    if (this.isFirebase) {
      const db = this.firebaseService.getDb();

      const [usersSnap, ticketsSnap] = await Promise.all([
        db.collection('users').where('companyId', '==', companyId).where('active', '==', true).get(),
        db.collection('tickets').where('companyId', '==', companyId).get(),
      ]);

      const usersCount = usersSnap.size;
      const ticketsThisMonth = ticketsSnap.docs.filter((doc) => {
        const openedAt = this.toDate(doc.data().openedAt);
        return openedAt && openedAt >= startOfMonth;
      }).length;

      return {
        company,
        usage: {
          usersCount,
          usersLimit: company.seatLimit,
          usersRemaining: Math.max(company.seatLimit - usersCount, 0),
          ticketsThisMonth,
          ticketsLimit: company.monthlyTicketLimit,
          ticketsRemaining: Math.max(company.monthlyTicketLimit - ticketsThisMonth, 0),
        },
      };
    }

    const [usersCount, ticketsThisMonth] = await Promise.all([
      this.prisma.user.count({
        where: {
          companyId,
          active: true,
        },
      }),
      this.prisma.ticket.count({
        where: {
          companyId,
          openedAt: { gte: startOfMonth },
        },
      }),
    ]);

    return {
      company,
      usage: {
        usersCount,
        usersLimit: company.seatLimit,
        usersRemaining: Math.max(company.seatLimit - usersCount, 0),
        ticketsThisMonth,
        ticketsLimit: company.monthlyTicketLimit,
        ticketsRemaining: Math.max(company.monthlyTicketLimit - ticketsThisMonth, 0),
      },
    };
  }

  async ensureSubscriptionIsActive(companyId: string) {
    if (this.isFirebase) {
      const company = await this.getCurrentCompany(companyId);

      if (!company || !company.active) {
        throw new ForbiddenException('Empresa inativa ou inexistente');
      }

      if (company.subscriptionStatus === 'CANCELED' || company.subscriptionStatus === 'PAST_DUE') {
        throw new ForbiddenException('Assinatura da empresa está inativa');
      }

      const trialEndsAt = this.toDate(company.trialEndsAt);
      if (company.subscriptionStatus === 'TRIALING' && trialEndsAt && trialEndsAt < new Date()) {
        throw new ForbiddenException('Período de trial expirado');
      }

      return company;
    }

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });

    if (!company || !company.active) {
      throw new ForbiddenException('Empresa inativa ou inexistente');
    }

    if (company.subscriptionStatus === 'CANCELED' || company.subscriptionStatus === 'PAST_DUE') {
      throw new ForbiddenException('Assinatura da empresa está inativa');
    }

    if (company.subscriptionStatus === 'TRIALING' && company.trialEndsAt && company.trialEndsAt < new Date()) {
      throw new ForbiddenException('Período de trial expirado');
    }

    return company;
  }

  async ensureUserSeatAvailable(companyId: string) {
    const company = await this.ensureSubscriptionIsActive(companyId);

    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const usersCount = (
        await db.collection('users').where('companyId', '==', companyId).where('active', '==', true).get()
      ).size;

      if (usersCount >= company.seatLimit) {
        throw new ForbiddenException('Limite de usuários do plano atingido');
      }
      return;
    }

    const usersCount = await this.prisma.user.count({ where: { companyId, active: true } });

    if (usersCount >= company.seatLimit) {
      throw new ForbiddenException('Limite de usuários do plano atingido');
    }
  }

  async ensureTicketQuotaAvailable(companyId: string) {
    const company = await this.ensureSubscriptionIsActive(companyId);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const tickets = await db.collection('tickets').where('companyId', '==', companyId).get();
      const ticketsThisMonth = tickets.docs.filter((doc) => {
        const openedAt = this.toDate(doc.data().openedAt);
        return openedAt && openedAt >= startOfMonth;
      }).length;

      if (ticketsThisMonth >= company.monthlyTicketLimit) {
        throw new ForbiddenException('Limite mensal de chamados do plano atingido');
      }
      return;
    }

    const ticketsThisMonth = await this.prisma.ticket.count({
      where: {
        companyId,
        openedAt: { gte: startOfMonth },
      },
    });

    if (ticketsThisMonth >= company.monthlyTicketLimit) {
      throw new ForbiddenException('Limite mensal de chamados do plano atingido');
    }
  }

  async updatePlan(companyId: string, dto: UpdatePlanDto) {
    await this.ensureSubscriptionIsActive(companyId);

    const config = this.getPlanConfig(dto.plan);
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);

    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const ref = db.collection('companies').doc(companyId);

      await ref.update({
        plan: dto.plan,
        subscriptionStatus: dto.subscriptionStatus || 'ACTIVE',
        seatLimit: config.seatLimit,
        monthlyTicketLimit: config.monthlyTicketLimit,
        currentPeriodStart: now,
        currentPeriodEnd: end,
        updatedAt: now,
      });

      const updated = await ref.get();
      return updated.data();
    }

    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        plan: dto.plan as any,
        subscriptionStatus: (dto.subscriptionStatus || 'ACTIVE') as any,
        seatLimit: config.seatLimit,
        monthlyTicketLimit: config.monthlyTicketLimit,
        currentPeriodStart: now,
        currentPeriodEnd: end,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        subscriptionStatus: true,
        seatLimit: true,
        monthlyTicketLimit: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    });
  }

  private toDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
