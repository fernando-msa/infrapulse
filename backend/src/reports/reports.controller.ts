import { Controller, Get, Query, Res, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'Relatório de chamados em JSON' })
  async getTickets(@Query() filters: any, @Request() req: any) {
    return this.reportsService.getTicketsReport(filters, req.user.companyId);
  }

  @Get('tickets/export')
  @ApiOperation({ summary: 'Exportar chamados em CSV' })
  async exportCsv(@Query() filters: any, @Request() req: any, @Res() res: Response) {
    const tickets = await this.reportsService.getTicketsReport(filters, req.user.companyId);
    const csv = this.reportsService.generateCsv(tickets);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=infrapulse-chamados.csv');
    res.send('\uFEFF' + csv); // BOM para UTF-8 no Excel
  }
}
