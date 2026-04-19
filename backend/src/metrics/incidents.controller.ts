import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Public Incidents')
@Controller('incidents')
export class IncidentsController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Incidentes críticos e em risco (público)' })
  getIncidents(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.metricsService.getIncidents(limitNum);
  }
}
