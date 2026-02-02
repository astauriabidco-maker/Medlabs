
import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { PublicController } from './public.controller';
import { TenantsService } from './tenants.service';
import { LicensingService } from './licensing.service';
import { PrismaService } from '../prisma.service';
import { DynamicConfigService } from '../dynamic-config.service';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
    imports: [AlertsModule],
    controllers: [TenantsController, PublicController],
    providers: [TenantsService, LicensingService],
    exports: [TenantsService, LicensingService],
})
export class TenantsModule { }


