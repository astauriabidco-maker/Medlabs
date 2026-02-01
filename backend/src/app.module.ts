import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ResultsModule } from './results/results.module';
import { PrismaService } from './prisma.service';
import { DynamicConfigModule } from './dynamic-config.module';
import { PlatformConfigController } from './platform-config.controller';
import { UsersModule } from './users/users.module';

import { ScheduleModule } from '@nestjs/schedule';
import { CleanupService } from './tasks/cleanup.service';
import { TenantsModule } from './tenants/tenants.module';
import { AdminUsersModule } from './admin/users/admin-users.module';
import { AuditModule } from './audit/audit.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PartnerRequestsModule } from './partner-requests/partner-requests.module';
import { SharedModule } from './shared/shared.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { SyncModule } from './sync/sync.module';
import { PatientModule } from './patient/patient.module';
import { AnalysisModule } from './analysis/analysis.module';
import { PaymentModule } from './payment/payment.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { IntegrationModule } from './integration/integration.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    // ============================================
    // SECURITY: Rate Limiting (Brute Force Protection)
    // ============================================
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 10,  // 10 requests per minute (for auth routes)
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute (for API routes)
      },
    ]),

    SharedModule,
    DynamicConfigModule,
    StorageModule,
    AuthModule,
    NotificationsModule,
    ResultsModule,
    UsersModule,
    TenantsModule,
    AdminUsersModule,
    AuditModule,
    AnalyticsModule,
    PartnerRequestsModule,
    IntegrationsModule,
    SyncModule,
    PatientModule,
    AnalysisModule,
    PaymentModule,
    AppointmentsModule,
    IntegrationModule,
    StatsModule,
  ],
  controllers: [AppController, PlatformConfigController],
  providers: [
    AppService,
    CleanupService,
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }

