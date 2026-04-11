import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('executive')
  @ApiOperation({ summary: 'Dashboard executivo com KPIs' })
  getExecutive(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getExecutiveDashboard(req.user.companyId, startDate, endDate);
  }

  @Get('operational')
  @ApiOperation({ summary: 'Dashboard operacional' })
  getOperational(@Request() req: any) {
    return this.dashboardService.getOperationalDashboard(req.user.companyId);
  }
}
