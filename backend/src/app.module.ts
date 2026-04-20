import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TicketsModule } from './tickets/tickets.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ImportModule } from './import/import.module';
import { ReportsModule } from './reports/reports.module';
import { AlertsModule } from './alerts/alerts.module';
import { CompaniesModule } from './companies/companies.module';
import { MetricsModule } from './metrics/metrics.module';
import { AuditModule } from './audit/audit.module';
import { TenantIsolationMiddleware } from './common/middleware/tenant-isolation.middleware';
import { FirebaseModule } from './firebase/firebase.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    TicketsModule,
    DashboardModule,
    ImportModule,
    ReportsModule,
    AlertsModule,
    CompaniesModule,
    MetricsModule,
    AuditModule,
    FirebaseModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplicar middleware globalmente para todas as rotas
    consumer.apply(TenantIsolationMiddleware).forRoutes('*');
  }
}
