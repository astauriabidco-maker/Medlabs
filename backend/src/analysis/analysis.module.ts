import { Module, forwardRef } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AlertsController } from './alerts.controller';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        forwardRef(() => NotificationsModule),
        AuthModule,
    ],
    controllers: [AlertsController],
    providers: [AnalysisService, PrismaService],
    exports: [AnalysisService],
})
export class AnalysisModule { }
