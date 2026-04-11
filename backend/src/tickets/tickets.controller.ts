import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { FilterTicketsDto } from './dto/filter-tickets.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar chamados com filtros' })
  findAll(@Query() filters: FilterTicketsDto, @Request() req: any) {
    return this.ticketsService.findAll(filters, req.user.companyId);
  }

  @Get('queue')
  @ApiOperation({ summary: 'Fila de chamados por técnico' })
  getQueue(@Request() req: any) {
    return this.ticketsService.getQueueByTechnician(req.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar chamado por ID' })
  findOne(@Param('id') id: string) {
    return this.ticketsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar chamado' })
  create(@Body() createTicketDto: CreateTicketDto, @Request() req: any) {
    return this.ticketsService.create(createTicketDto, req.user.id, req.user.companyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar chamado' })
  update(@Param('id') id: string, @Body() updateDto: Partial<CreateTicketDto>) {
    return this.ticketsService.update(id, updateDto);
  }

  @Post('recalculate-sla')
  @ApiOperation({ summary: 'Recalcular SLA de todos os chamados abertos' })
  recalculateSla() {
    return this.ticketsService.recalculateAllSla();
  }
}
