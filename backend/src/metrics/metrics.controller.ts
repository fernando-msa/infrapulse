import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Public Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('sla')
  @ApiOperation({ summary: 'Métricas de SLA agregadas da plataforma (público)' })
  getSlaMetrics() {
    return this.metricsService.getSlaMetrics();
  }
}
