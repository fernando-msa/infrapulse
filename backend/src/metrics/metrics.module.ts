import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { TeamsController } from './teams.controller';
import { IncidentsController } from './incidents.controller';

@Module({
  imports: [PrismaModule],
  providers: [MetricsService],
  controllers: [MetricsController, TeamsController, IncidentsController],
})
export class MetricsModule {}
