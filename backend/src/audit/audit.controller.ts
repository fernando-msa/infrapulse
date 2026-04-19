import { Controller, Get, Query, UseGuards, Request, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditEntity, AuditAction } from '@prisma/client';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  /**
   * Obtém histórico de auditoria de um recurso específico
   * Exemplo: GET /api/audit/tickets/ticket-id-123
   */
  @Get(':entity/:entityId')
  @ApiOperation({ summary: 'Histórico de auditoria de um recurso' })
  async getHistory(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const validEntities = Object.values(AuditEntity);
    if (!validEntities.includes(entity as AuditEntity)) {
      throw new BadRequestException(
        `Entity deve ser um de: ${validEntities.join(', ')}`,
      );
    }

    return this.auditService.getHistory(
      entity as AuditEntity,
      entityId,
      req.user.companyId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /**
   * Obtém auditoria completa da empresa com filtros
   * Exemplo: GET /api/audit/company?action=UPDATE&entity=TICKET&days=7
   */
  @Get('company/logs')
  @ApiOperation({ summary: 'Auditoria completa da empresa' })
  async getCompanyAudit(
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    let startDate: Date | undefined;
    if (days) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days, 10));
    }

    return this.auditService.getCompanyAudit(
      req.user.companyId,
      {
        action: action ? (action as AuditAction) : undefined,
        entity: entity ? (entity as AuditEntity) : undefined,
        userId,
        startDate,
        endDate: new Date(),
      },
      limit ? parseInt(limit, 10) : 100,
    );
  }

  /**
   * Exporta logs de auditoria para conformidade
   * Importante para ISO e LGPD
   * GET /api/audit/export?startDate=2026-01-01&endDate=2026-04-19
   */
  @Get('export/compliance')
  @ApiOperation({ summary: 'Exporta logs para conformidade (ISO/LGPD)' })
  async exportAuditLogs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate e endDate são obrigatórios');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Datas inválidas (use formato ISO 8601)');
    }

    if (start > end) {
      throw new BadRequestException('startDate não pode ser maior que endDate');
    }

    return this.auditService.exportAuditLogs(req.user.companyId, start, end);
  }
}
