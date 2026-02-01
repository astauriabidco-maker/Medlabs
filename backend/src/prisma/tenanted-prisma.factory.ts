import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma.service';

/**
 * List of models that should NOT be tenant-scoped
 * These are global/system models accessible across tenants
 */
const GLOBAL_MODELS = [
    'Tenant',
    'License',
    'SystemConfig',
    'PartnerRequest',
    'OtpStore',
    'AppointmentHistory', // Linked via Appointment, not directly by tenant
];

/**
 * Operations that require tenantId injection in WHERE clause
 */
const READ_OPERATIONS = [
    'findFirst',
    'findMany',
    'findUnique',
    'count',
    'aggregate',
    'groupBy',
];

const WRITE_OPERATIONS = [
    'update',
    'updateMany',
    'delete',
    'deleteMany',
    'upsert',
];

/**
 * TenantedPrismaFactory
 * 
 * Creates a request-scoped Prisma Client extended with automatic tenant filtering.
 * This enforces data isolation at the database query level - a critical security layer.
 * 
 * Usage:
 * ```typescript
 * const db = this.tenantedPrisma.forTenant(req.user.tenantId);
 * const docs = await db.document.findMany(); // Automatically filtered by tenant
 * ```
 */
@Injectable()
export class TenantedPrismaFactory {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create a tenant-scoped Prisma Client
     * @param tenantId - The current tenant's ID (from JWT)
     * @returns Extended PrismaClient with automatic tenant filtering
     */
    forTenant(tenantId: string) {
        if (!tenantId) {
            throw new Error('TenantedPrisma: tenantId is required');
        }

        return this.prisma.$extends({
            name: 'TenantScopeExtension',
            query: {
                $allModels: {
                    async $allOperations({ model, operation, args, query }) {
                        // Skip global models - they don't have tenantId
                        if (GLOBAL_MODELS.includes(model)) {
                            return query(args);
                        }

                        // Cast to any for dynamic property access
                        const modifiedArgs = { ...args } as any;

                        // Handle CREATE operations - inject tenantId in data
                        if (operation === 'create') {
                            modifiedArgs.data = {
                                ...modifiedArgs.data,
                                tenantId,
                            };
                            return query(modifiedArgs);
                        }

                        // Handle CREATE MANY
                        if (operation === 'createMany') {
                            if (Array.isArray(modifiedArgs.data)) {
                                modifiedArgs.data = modifiedArgs.data.map((item: any) => ({
                                    ...item,
                                    tenantId,
                                }));
                            }
                            return query(modifiedArgs);
                        }

                        // Handle READ operations - inject tenantId in where clause
                        if (READ_OPERATIONS.includes(operation)) {
                            modifiedArgs.where = {
                                ...modifiedArgs.where,
                                tenantId,
                            };
                            return query(modifiedArgs);
                        }

                        // Handle WRITE operations - inject tenantId in where clause
                        if (WRITE_OPERATIONS.includes(operation)) {
                            modifiedArgs.where = {
                                ...modifiedArgs.where,
                                tenantId,
                            };
                            return query(modifiedArgs);
                        }

                        // Default: pass through without modification
                        return query(args);
                    },
                },
            },
        }) as any; // Return as any to allow flexible usage
    }
}

/**
 * Request-scoped service that automatically extracts tenantId from the request
 * Provides convenient access to tenant-scoped Prisma Client
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantedPrismaService {
    private _client: ReturnType<TenantedPrismaFactory['forTenant']> | null = null;

    constructor(
        @Inject(REQUEST) private readonly request: any,
        private readonly factory: TenantedPrismaFactory,
    ) { }

    /**
     * Get the tenant-scoped Prisma Client for the current request
     * Lazily creates the extended client on first access
     */
    get client() {
        if (!this._client) {
            const tenantId = this.request?.user?.tenantId;

            if (!tenantId) {
                throw new Error('TenantedPrismaService: No tenantId found in request. Ensure JwtAuthGuard is applied.');
            }

            this._client = this.factory.forTenant(tenantId);
        }
        return this._client;
    }

    /**
     * Get the tenant ID from the current request
     */
    get tenantId(): string {
        return this.request?.user?.tenantId;
    }
}
