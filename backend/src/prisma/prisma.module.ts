import { Module, Global } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TenantedPrismaFactory, TenantedPrismaService } from './tenanted-prisma.factory';

/**
 * PrismaModule
 * 
 * Provides both global PrismaService and tenant-scoped variants.
 * 
 * - PrismaService: Global singleton, use for SUPER_ADMIN operations or system tasks
 * - TenantedPrismaFactory: Create tenant-scoped clients manually
 * - TenantedPrismaService: Request-scoped, auto-extracts tenantId from JWT
 */
@Global()
@Module({
    providers: [
        PrismaService,
        TenantedPrismaFactory,
        TenantedPrismaService,
    ],
    exports: [
        PrismaService,
        TenantedPrismaFactory,
        TenantedPrismaService,
    ],
})
export class PrismaModule { }
