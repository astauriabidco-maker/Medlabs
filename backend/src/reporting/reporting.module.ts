import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [ReportingController],
    providers: [ReportingService, PrismaService],
    exports: [ReportingService],
})
export class ReportingModule { }
