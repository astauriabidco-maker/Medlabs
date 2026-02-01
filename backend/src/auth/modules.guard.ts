import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { Feature } from '../tenants/licensing.service';

/**
 * Decorator to require specific modules on a route
 * 
 * @example
 * @RequireModule(Feature.ANALYTICS_BI)
 * @Get('stats')
 * getStats() { ... }
 */
export const MODULES_KEY = 'required_modules';
export const RequireModule = (...modules: Feature[]) =>
    SetMetadata(MODULES_KEY, modules);

/**
 * ModulesGuard
 * 
 * Checks if the tenant has the required premium modules activated.
 * Works with the tenant's features array.
 */
@Injectable()
export class ModulesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Get required modules from decorator
        const requiredModules = this.reflector.getAllAndOverride<Feature[]>(
            MODULES_KEY,
            [context.getHandler(), context.getClass()],
        );

        // If no modules required, allow access
        if (!requiredModules || requiredModules.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('Authentication required');
        }

        // SUPER_ADMIN has access to everything
        if (user.role === 'SUPER_ADMIN') {
            return true;
        }

        // Get tenant's enabled features
        const tenantId = user.tenantId;
        if (!tenantId) {
            throw new ForbiddenException('User is not associated with a tenant');
        }

        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { features: true },
        });

        if (!tenant) {
            throw new ForbiddenException('Tenant not found');
        }

        const tenantFeatures = tenant.features || [];

        // Check if tenant has ALL required modules
        const missingModules = requiredModules.filter(
            (module) => !tenantFeatures.includes(module),
        );

        if (missingModules.length > 0) {
            throw new ForbiddenException({
                statusCode: 403,
                error: 'ModuleNotActivated',
                message: `Cette fonctionnalité nécessite l'activation du module: ${missingModules.join(', ')}`,
                missingModules,
                upgradeUrl: '/dashboard/marketplace',
            });
        }

        return true;
    }
}
