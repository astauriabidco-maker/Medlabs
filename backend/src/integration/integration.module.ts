import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IntegrationService } from './integration.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [NotificationsModule],
    controllers: [IngestController],
    providers: [IntegrationService, PdfGeneratorService, PrismaService],
    exports: [IntegrationService, PdfGeneratorService],
})
export class IntegrationModule { }
