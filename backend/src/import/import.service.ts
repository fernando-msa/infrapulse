import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { TicketStatus, TicketPriority } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class ImportService {
  constructor(
    private prisma: PrismaService,
    private ticketsService: TicketsService,
    private firebaseService: FirebaseService,
  ) {}

  private get isFirebase() {
    return process.env.DATA_PROVIDER === 'firebase';
  }

  private async readExcelRecords(filePath: string): Promise<{ headers: string[]; records: any[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { headers: [], records: [] };
    }

    const headerRow = worksheet.getRow(1);
    const headers = (headerRow.values as any[])
      .slice(1)
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0);

    const records: any[] = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const values = row.values as any[];

      const record: Record<string, string> = {};
      let hasContent = false;

      headers.forEach((header, index) => {
        const raw = values[index + 1];
        const normalized = raw == null ? '' : String(raw).trim();
        if (normalized) {
          hasContent = true;
        }
        record[header] = normalized;
      });

      if (hasContent) {
        records.push(record);
      }
    }

    return { headers, records };
  }

  async parseFile(filePath: string, originalName: string): Promise<{ headers: string[]; rows: any[] }> {
    const ext = path.extname(originalName).toLowerCase();
    let rows: any[] = [];
    let headers: string[] = [];

    if (ext === '.csv') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const records = parse(content, { columns: true, skip_empty_lines: true });
      headers = records.length > 0 ? Object.keys(records[0]) : [];
      rows = records.slice(0, 5); // Preview das primeiras 5 linhas
    } else if (['.xlsx', '.xls'].includes(ext)) {
      const parsed = await this.readExcelRecords(filePath);
      headers = parsed.headers;
      rows = parsed.records.slice(0, 5);
    }

    return { headers, rows };
  }

  async processImport(
    filePath: string,
    originalName: string,
    mapping: Record<string, string>,
    userId: string,
    companyId?: string,
  ) {
    if (this.isFirebase) {
      return this.processImportFirebase(filePath, originalName, mapping, userId, companyId);
    }

    const batch = await this.prisma.importBatch.create({
      data: {
        filename: originalName,
        mapping,
        userId,
        status: 'PROCESSANDO',
      },
    });

    const ext = path.extname(originalName).toLowerCase();
    let records: any[] = [];

    if (ext === '.csv') {
      const content = fs.readFileSync(filePath, 'utf-8');
      records = parse(content, { columns: true, skip_empty_lines: true });
    } else {
      const parsed = await this.readExcelRecords(filePath);
      records = parsed.records;
    }

    let imported = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const ticketData = this.mapRecord(record, mapping);
        const slaRule = await this.prisma.slaRule.findFirst({
          where: { priority: ticketData.priority, ...(companyId ? { companyId } : {}) },
        });

        let slaDeadline: Date | undefined;
        if (slaRule && ticketData.openedAt) {
          slaDeadline = new Date(new Date(ticketData.openedAt).getTime() + slaRule.resolutionTime * 60000);
        }

        await this.prisma.ticket.create({
          data: {
            title: ticketData.title || 'Chamado importado',
            description: ticketData.description,
            status: ticketData.status || TicketStatus.ABERTO,
            priority: ticketData.priority || TicketPriority.MEDIA,
            category: ticketData.category,
            sector: ticketData.sector,
            openedAt: ticketData.openedAt ? new Date(ticketData.openedAt) : new Date(),
            slaDeadline,
            slaRuleId: slaRule?.id,
            companyId,
            createdById: userId,
            importBatchId: batch.id,
            externalId: ticketData.externalId,
          },
        });
        imported++;
      } catch {
        errors++;
      }
    }

    await this.prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        totalRows: records.length,
        importedRows: imported,
        errorRows: errors,
        status: errors === records.length ? 'ERRO' : 'CONCLUIDO',
      },
    });

    // Recalcular SLA de todos (isolamento por tenant)
    if (companyId) {
      await this.ticketsService.recalculateAllSla(companyId);
    }

    return { batchId: batch.id, total: records.length, imported, errors };
  }

  private mapRecord(record: any, mapping: Record<string, string>) {
    const result: any = {};

    for (const [targetField, sourceColumn] of Object.entries(mapping)) {
      if (sourceColumn && record[sourceColumn] !== undefined) {
        result[targetField] = String(record[sourceColumn]).trim();
      }
    }

    // Normalizar status
    if (result.status) {
      const statusMap: Record<string, TicketStatus> = {
        'aberto': TicketStatus.ABERTO,
        'open': TicketStatus.ABERTO,
        'em andamento': TicketStatus.EM_ANDAMENTO,
        'in progress': TicketStatus.EM_ANDAMENTO,
        'pendente': TicketStatus.PENDENTE,
        'pending': TicketStatus.PENDENTE,
        'concluido': TicketStatus.CONCLUIDO,
        'concluído': TicketStatus.CONCLUIDO,
        'closed': TicketStatus.CONCLUIDO,
        'resolvido': TicketStatus.CONCLUIDO,
      };
      result.status = statusMap[result.status.toLowerCase()] || TicketStatus.ABERTO;
    }

    // Normalizar prioridade
    if (result.priority) {
      const priorityMap: Record<string, TicketPriority> = {
        'baixa': TicketPriority.BAIXA,
        'low': TicketPriority.BAIXA,
        'media': TicketPriority.MEDIA,
        'média': TicketPriority.MEDIA,
        'medium': TicketPriority.MEDIA,
        'alta': TicketPriority.ALTA,
        'high': TicketPriority.ALTA,
        'critica': TicketPriority.CRITICA,
        'crítica': TicketPriority.CRITICA,
        'critical': TicketPriority.CRITICA,
      };
      result.priority = priorityMap[result.priority.toLowerCase()] || TicketPriority.MEDIA;
    }

    return result;
  }

  async getImportBatches(userId: string) {
    if (this.isFirebase) {
      const db = this.firebaseService.getDb();
      const batches = await db.collection('import_batches').where('userId', '==', userId).get();

      return batches.docs
        .map((doc) => this.normalizeBatch(doc.data()))
        .sort((a, b) => (this.toDate(b.createdAt)?.getTime() || 0) - (this.toDate(a.createdAt)?.getTime() || 0))
        .slice(0, 20);
    }

    return this.prisma.importBatch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  private async processImportFirebase(
    filePath: string,
    originalName: string,
    mapping: Record<string, string>,
    userId: string,
    companyId?: string,
  ) {
    const db = this.firebaseService.getDb();
    const now = new Date();

    const batchRef = db.collection('import_batches').doc();
    const batch = {
      id: batchRef.id,
      filename: originalName,
      mapping,
      userId,
      status: 'PROCESSANDO',
      totalRows: 0,
      importedRows: 0,
      errorRows: 0,
      createdAt: now,
      updatedAt: now,
    };
    await batchRef.set(batch);

    const ext = path.extname(originalName).toLowerCase();
    let records: any[] = [];

    if (ext === '.csv') {
      const content = fs.readFileSync(filePath, 'utf-8');
      records = parse(content, { columns: true, skip_empty_lines: true });
    } else {
      const parsed = await this.readExcelRecords(filePath);
      records = parsed.records;
    }

    let imported = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const ticketData = this.mapRecord(record, mapping);
        const slaRule = await this.getSlaRuleFirebase(ticketData.priority, companyId);

        let slaDeadline: Date | undefined;
        if (slaRule && ticketData.openedAt) {
          slaDeadline = new Date(new Date(ticketData.openedAt).getTime() + slaRule.resolutionTime * 60000);
        }

        const ticketRef = db.collection('tickets').doc();
        await ticketRef.set({
          id: ticketRef.id,
          title: ticketData.title || 'Chamado importado',
          description: ticketData.description || null,
          status: ticketData.status || TicketStatus.ABERTO,
          priority: ticketData.priority || TicketPriority.MEDIA,
          category: ticketData.category || null,
          sector: ticketData.sector || null,
          openedAt: ticketData.openedAt ? new Date(ticketData.openedAt) : new Date(),
          slaDeadline: slaDeadline || null,
          slaRuleId: slaRule?.id || null,
          companyId: companyId || null,
          createdById: userId,
          importBatchId: batch.id,
          externalId: ticketData.externalId || null,
          slaStatus: 'OK',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        imported++;
      } catch {
        errors++;
      }
    }

    await batchRef.update({
      totalRows: records.length,
      importedRows: imported,
      errorRows: errors,
      status: errors === records.length ? 'ERRO' : 'CONCLUIDO',
      updatedAt: new Date(),
    });

    if (companyId) {
      await this.ticketsService.recalculateAllSla(companyId);
    }

    return { batchId: batch.id, total: records.length, imported, errors };
  }

  private async getSlaRuleFirebase(priority: TicketPriority, companyId?: string) {
    const db = this.firebaseService.getDb();
    let query = db.collection('sla_rules').where('priority', '==', priority).limit(1);
    if (companyId) {
      query = db.collection('sla_rules').where('priority', '==', priority).where('companyId', '==', companyId).limit(1);
    }

    const ruleSnap = await query.get();
    return ruleSnap.empty ? null : (ruleSnap.docs[0].data() as any);
  }

  private normalizeBatch(batch: any) {
    return {
      ...batch,
      createdAt: this.toDate(batch?.createdAt),
      updatedAt: this.toDate(batch?.updatedAt),
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
