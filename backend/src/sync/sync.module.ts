import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { ResultsModule } from '../results/results.module';
import { PrismaService } from '../prisma.service';
import { ApiKeyAuthGuard } from '../auth/api-key.guard';

@Module({
    imports: [ResultsModule],
    controllers: [SyncController],
    providers: [PrismaService, ApiKeyAuthGuard],
})
export class SyncModule { }

