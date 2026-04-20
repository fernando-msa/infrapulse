import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, AuditEntity } from '@prisma/client';
import { FirebaseService } from '../firebase/firebase.service';

interface AuditLogInput {
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  companyId: string;
  userId?: string;
  changes?: any; // { before: {...}, after: {...} }
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Serviço de Auditoria
 * 
 * Responsável por registrar todas as ações em uma trilha de auditoria.
 * Essencial para:
 * - Compliance LGPD (Lei Geral de Proteção de Dados)
 * - ISO 27001/9001 (Segurança e Qualidade)
 * - Rastreabilidade de ações
 * - Responsabilidade e transparência
 */
@Injectable()
export class AuditService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

  private get isFirebase() {
    return process.env.DATA_PROVIDER === 'firebase';
  }

  /**
   * Registra uma ação na auditoria
   */
  async logAction(input: AuditLogInput) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const ref = db.collection('audit_logs').doc();
      const log = {
        id: ref.id,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        companyId: input.companyId,
        userId: input.userId || null,
        changes: input.changes || null,
        description: input.description || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        createdAt: new Date(),
      };

      await ref.set(log);
      return log;
    }

    return this.prisma.auditLog.create({
      data: {
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        companyId: input.companyId,
        userId: input.userId,
        changes: input.changes,
        description: input.description,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  /**
   * Registra criação de um recurso
   */
  async logCreate(
    entity: AuditEntity,
    entityId: string,
    companyId: string,
    userId: string,
    data: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.logAction({
      action: AuditAction.CREATE,
      entity,
      entityId,
      companyId,
      userId,
      changes: { after: data },
      description: `${entity} #${entityId} criado`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra atualização de um recurso
   */
  async logUpdate(
    entity: AuditEntity,
    entityId: string,
    companyId: string,
    userId: string,
    before: any,
    after: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Identificar apenas campos que mudaram
    const changes = {};
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    
    for (const key of allKeys) {
      if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
        changes[key] = { before: before?.[key], after: after?.[key] };
      }
    }

    // Se não houver mudanças, não registra
    if (Object.keys(changes).length === 0) {
      return null;
    }

    return this.logAction({
      action: AuditAction.UPDATE,
      entity,
      entityId,
      companyId,
      userId,
      changes,
      description: `${entity} #${entityId} atualizado`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra exclusão de um recurso
   */
  async logDelete(
    entity: AuditEntity,
    entityId: string,
    companyId: string,
    userId: string,
    data: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.logAction({
      action: AuditAction.DELETE,
      entity,
      entityId,
      companyId,
      userId,
      changes: { before: data },
      description: `${entity} #${entityId} deletado`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra login
   */
  async logLogin(userId: string, companyId: string, ipAddress?: string, userAgent?: string) {
    return this.logAction({
      action: AuditAction.LOGIN,
      entity: AuditEntity.AUTH,
      entityId: userId,
      companyId,
      userId,
      description: `Usuário fez login`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra logout
   */
  async logLogout(userId: string, companyId: string, ipAddress?: string, userAgent?: string) {
    return this.logAction({
      action: AuditAction.LOGOUT,
      entity: AuditEntity.AUTH,
      entityId: userId,
      companyId,
      userId,
      description: `Usuário fez logout`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra atribuição de ticket a um técnico
   */
  async logTicketAssignment(
    ticketId: string,
    companyId: string,
    userId: string,
    assignedToId: string,
    assignedToName: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.logAction({
      action: AuditAction.ASSIGN,
      entity: AuditEntity.TICKET,
      entityId: ticketId,
      companyId,
      userId,
      description: `Ticket atribuído para ${assignedToName}`,
      changes: { assignedToId, assignedToName },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registra fechamento de ticket
   */
  async logTicketClose(
    ticketId: string,
    companyId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.logAction({
      action: AuditAction.CLOSE,
      entity: AuditEntity.TICKET,
      entityId: ticketId,
      companyId,
      userId,
      description: `Ticket fechado`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Obtém histórico de auditoria de um recurso
   */
  async getHistory(
    entity: AuditEntity,
    entityId: string,
    companyId: string,
    limit: number = 50,
  ) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const logsSnap = await db
        .collection('audit_logs')
        .where('companyId', '==', companyId)
        .where('entity', '==', entity)
        .where('entityId', '==', entityId)
        .get();

      const logs = logsSnap.docs
        .map((doc) => this.normalizeLog(doc.data()))
        .sort((a, b) => (this.toDate(b.createdAt)?.getTime() || 0) - (this.toDate(a.createdAt)?.getTime() || 0))
        .slice(0, limit);

      return this.attachUsers(logs);
    }

    return this.prisma.auditLog.findMany({
      where: { entity, entityId, companyId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Obtém auditoria de uma empresa
   */
  async getCompanyAudit(
    companyId: string,
    filters?: {
      action?: AuditAction;
      entity?: AuditEntity;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
  ) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const logsSnap = await db.collection('audit_logs').where('companyId', '==', companyId).get();

      let logs = logsSnap.docs.map((doc) => this.normalizeLog(doc.data()));

      if (filters?.action) logs = logs.filter((x) => x.action === filters.action);
      if (filters?.entity) logs = logs.filter((x) => x.entity === filters.entity);
      if (filters?.userId) logs = logs.filter((x) => x.userId === filters.userId);

      if (filters?.startDate || filters?.endDate) {
        logs = logs.filter((x) => {
          const createdAt = this.toDate(x.createdAt);
          if (!createdAt) return false;
          if (filters.startDate && createdAt < filters.startDate) return false;
          if (filters.endDate && createdAt > filters.endDate) return false;
          return true;
        });
      }

      logs = logs
        .sort((a, b) => (this.toDate(b.createdAt)?.getTime() || 0) - (this.toDate(a.createdAt)?.getTime() || 0))
        .slice(0, limit);

      return this.attachUsers(logs);
    }

    const where: any = { companyId };

    if (filters?.action) where.action = filters.action;
    if (filters?.entity) where.entity = filters.entity;
    if (filters?.userId) where.userId = filters.userId;

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    return this.prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Exporta logs de auditoria para conformidade
   * Útil para auditorias externas (ISO, LGPD)
   */
  async exportAuditLogs(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ) {
    if (this.isFirebase) {
      const logs = await this.getCompanyAudit(
        companyId,
        {
          startDate,
          endDate,
        },
        Number.MAX_SAFE_INTEGER,
      );

      return {
        company: { id: companyId },
        period: { start: startDate, end: endDate },
        totalLogs: logs.length,
        logs,
        exportedAt: new Date(),
      };
    }

    const logs = await this.prisma.auditLog.findMany({
      where: {
        companyId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      company: { id: companyId },
      period: { start: startDate, end: endDate },
      totalLogs: logs.length,
      logs,
      exportedAt: new Date(),
    };
  }

  /**
   * Deleta logs antigos (para conformidade de LGPD - direito ao esquecimento)
   * Mantém histórico de até 2 anos por padrão
   */
  async deleteOldLogs(daysOld: number = 730) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const logsSnap = await db.collection('audit_logs').get();

      const oldDocs = logsSnap.docs.filter((doc) => {
        const createdAt = this.toDate(doc.data()?.createdAt);
        return createdAt && createdAt < cutoffDate;
      });

      let deletedCount = 0;
      for (const doc of oldDocs) {
        await doc.ref.delete();
        deletedCount += 1;
      }

      return {
        deletedCount,
        cutoffDate,
        message: `${deletedCount} logs antigos deletados (>= ${daysOld} dias)`,
      };
    }

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return {
      deletedCount: result.count,
      cutoffDate,
      message: `${result.count} logs antigos deletados (>= ${daysOld} dias)`,
    };
  }

  private async attachUsers(logs: any[]) {
    if (!this.isFirebase) return logs;

    const db = this.firebaseService.getDb();
    const ids = Array.from(new Set(logs.map((x) => x.userId).filter(Boolean)));
    if (ids.length === 0) return logs;

    const users = await Promise.all(ids.map((id) => db.collection('users').doc(id).get()));
    const userMap = new Map(
      users
        .filter((doc) => doc.exists)
        .map((doc) => {
          const u: any = doc.data();
          return [u.id, { id: u.id, name: u.name, email: u.email }];
        }),
    );

    return logs.map((log) => ({
      ...log,
      user: log.userId ? userMap.get(log.userId) || null : null,
    }));
  }

  private normalizeLog(log: any) {
    return {
      ...log,
      createdAt: this.toDate(log?.createdAt),
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
