import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { StorageModule } from '../storage/storage.module';
import { PrismaService } from '../prisma.service';

import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { AnalysisModule } from '../analysis/analysis.module';

@Module({
    imports: [StorageModule, NotificationsModule, AuthModule, AnalysisModule],
    controllers: [ResultsController],
    providers: [ResultsService, PrismaService],
    exports: [ResultsService],
})
export class ResultsModule { }
