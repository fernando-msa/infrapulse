import {
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  Request,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AlertType, AlertSeverity } from '@prisma/client';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  /**
   * Detecta todos os alertas em tempo real
   * GET /api/alerts/detect
   */
  @Get('detect')
  @ApiOperation({ summary: 'Detecta alertas inteligentes em tempo real' })
  async detectAlerts(@Request() req: any) {
    return this.alertsService.detectAlerts(req.user.companyId);
  }

  /**
   * Lista alertas com filtros
   * GET /api/alerts?type=SLA_EM_RISCO&resolved=false
   */
  @Get()
  @ApiOperation({ summary: 'Lista alertas da empresa' })
  async getAlerts(
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('resolved') resolved?: string,
    @Query('acknowledged') acknowledged?: string,
    @Request() req?: any,
  ) {
    return this.alertsService.getAlerts(req.user.companyId, {
      type: type ? (type as AlertType) : undefined,
      severity: severity ? (severity as AlertSeverity) : undefined,
      resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
      acknowledged: acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined,
    });
  }

  /**
   * Dashboard de alertas
   * GET /api/alerts/dashboard
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard de alertas (resumo por tipo e severidade)' })
  async getAlertsDashboard(@Request() req: any) {
    return this.alertsService.getAlertsDashboard(req.user.companyId);
  }

  /**
   * Reconhece um alerta (marca como lido)
   * PUT /api/alerts/:id/acknowledge
   */
  @Put(':id/acknowledge')
  @ApiOperation({ summary: 'Reconhece um alerta (marca como lido/em ação)' })
  async acknowledgeAlert(@Param('id') alertId: string, @Request() req: any) {
    return this.alertsService.acknowledgeAlert(alertId, req.user.id);
  }

  /**
   * Resolve um alerta
   * PUT /api/alerts/:id/resolve
   */
  @Put(':id/resolve')
  @ApiOperation({ summary: 'Marca alerta como resolvido' })
  async resolveAlert(@Param('id') alertId: string, @Request() req: any) {
    return this.alertsService.resolveAlert(alertId, req.user.id);
  }
}
