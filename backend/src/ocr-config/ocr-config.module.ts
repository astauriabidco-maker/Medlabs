import { Module } from '@nestjs/common';
import { OcrConfigService } from './ocr-config.service';
import { OcrConfigController } from './ocr-config.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [OcrConfigController],
    providers: [OcrConfigService],
    exports: [OcrConfigService],
})
export class OcrConfigModule { }
