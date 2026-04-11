import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { TicketStatus, TicketPriority } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

@Injectable()
export class ImportService {
  constructor(
    private prisma: PrismaService,
    private ticketsService: TicketsService,
  ) {}

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
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      if (data.length > 0) {
        headers = data[0].map((h: any) => String(h));
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        rows = jsonData.slice(0, 5);
      }
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
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      records = XLSX.utils.sheet_to_json(sheet);
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
      } catch (e) {
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

    // Recalcular SLA de todos
    await this.ticketsService.recalculateAllSla();

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
    return this.prisma.importBatch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
