import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Public Teams')
@Controller('teams')
export class TeamsController {
  constructor(private metricsService: MetricsService) {}

  @Get('performance')
  @ApiOperation({ summary: 'Performance de equipes por analista (público)' })
  getTeamsPerformance() {
    return this.metricsService.getTeamsPerformance();
  }
}
