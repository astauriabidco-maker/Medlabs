import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service';

/**
 * Decorator to require a specific feature for a route
 */
export const FEATURE_KEY = 'required_feature';
export const RequireFeature = (feature: string) => {
    return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
        Reflect.defineMetadata(FEATURE_KEY, feature, descriptor?.value ?? target);
        return descriptor ?? target;
    };
};

/**
 * Guard that checks if the current tenant has the required feature flag
 */
@Injectable()
export class FeatureGuard implements CanActivate {
    private readonly logger = new Logger(FeatureGuard.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Get required feature from decorator
        const requiredFeature = this.reflector.get<string>(FEATURE_KEY, context.getHandler());

        if (!requiredFeature) {
            // No feature requirement, allow access
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user?.tenantId) {
            this.logger.warn('FeatureGuard: No tenant context found');
            throw new ForbiddenException('Contexte tenant requis');
        }

        // Check tenant features
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: user.tenantId },
            select: { features: true },
        });

        if (!tenant) {
            throw new ForbiddenException('Tenant non trouvé');
        }

        const hasFeature = tenant.features.includes(requiredFeature);

        if (!hasFeature) {
            this.logger.warn(`FeatureGuard: Tenant ${user.tenantId} missing feature ${requiredFeature}`);
            throw new ForbiddenException(`Module non activé: ${requiredFeature}. Veuillez activer une licence.`);
        }

        this.logger.log(`FeatureGuard: Feature ${requiredFeature} verified for tenant ${user.tenantId}`);
        return true;
    }
}
