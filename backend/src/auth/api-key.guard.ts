import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * API Key Authentication Guard
 * Authenticates requests using x-api-key header
 * Attaches the tenant to the request object
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
    private readonly logger = new Logger(ApiKeyAuthGuard.name);

    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        // Extract API key from header
        const apiKey = request.headers['x-api-key'];

        if (!apiKey || typeof apiKey !== 'string') {
            this.logger.warn('[API_KEY_AUTH] Missing or invalid x-api-key header');
            throw new UnauthorizedException('API key required');
        }

        // Find tenant by syncApiKey
        const tenant = await this.prisma.tenant.findUnique({
            where: { syncApiKey: apiKey },
            select: {
                id: true,
                name: true,
                features: true,
                isActive: true,
            },
        });

        if (!tenant) {
            this.logger.warn(`[API_KEY_AUTH] Invalid API key: ${apiKey.substring(0, 8)}...`);
            throw new UnauthorizedException('Invalid API key');
        }

        if (!tenant.isActive) {
            this.logger.warn(`[API_KEY_AUTH] Tenant ${tenant.id} is suspended`);
            throw new UnauthorizedException('Tenant account is suspended');
        }

        // Attach tenant to request for downstream use
        request.tenant = tenant;

        // Also create a minimal user object for compatibility with existing decorators
        request.user = {
            tenantId: tenant.id,
            tenantName: tenant.name,
            role: 'API_SERVICE',
            sub: 'sync-automation',
        };

        this.logger.log(`[API_KEY_AUTH] Authenticated tenant ${tenant.name} (${tenant.id})`);
        return true;
    }
}
