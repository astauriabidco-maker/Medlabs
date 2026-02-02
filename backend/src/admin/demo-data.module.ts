import { Module } from '@nestjs/common';
import { DemoDataController } from './demo-data.controller';
import { AuditModule } from '../audit/audit.module';
import { AlertsModule } from '../alerts/alerts.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
    imports: [AuditModule, AlertsModule, SubscriptionsModule],
    controllers: [DemoDataController],
})
export class DemoDataModule { }
