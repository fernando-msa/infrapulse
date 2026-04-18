import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { UpdatePlanDto } from './dto/update-plan.dto';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('current')
  @ApiOperation({ summary: 'Retorna dados da empresa atual e uso do plano' })
  async current(@Request() req: any) {
    return this.companiesService.getUsage(req.user.companyId);
  }

  @Patch('current/plan')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualiza plano da empresa atual' })
  async updateCurrentPlan(@Request() req: any, @Body() dto: UpdatePlanDto) {
    return this.companiesService.updatePlan(req.user.companyId, dto);
  }
}
