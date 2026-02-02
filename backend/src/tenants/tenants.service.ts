
import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DynamicConfigService } from '../dynamic-config.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserRole, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class TenantsService {
    private readonly logger = new Logger(TenantsService.name);

    constructor(
        private prisma: PrismaService,
        private config: DynamicConfigService,
        private auditService: AuditService,
        private alertsService: AlertsService,
    ) { }

    async createTenantWithAdmin(dto: CreateTenantDto, actorId?: string) {
        // 1. Check if slug exists
        const existingSlug = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
        if (existingSlug) {
            throw new BadRequestException('Tenant slug already exists');
        }

        // 2. Check if admin email exists globally
        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.adminEmail } });
        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);

        // 3. Transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: dto.name,
                    slug: dto.slug,
                    smsBalance: dto.initialSmsQuota || 0,
                }
            });

            const user = await tx.user.create({
                data: {
                    email: dto.adminEmail,
                    passwordHash: hashedPassword,
                    firstName: dto.adminFirstName || 'Admin',
                    lastName: dto.adminLastName || 'Lab',
                    role: UserRole.LAB_ADMIN,
                    status: UserStatus.ACTIVE,
                    tenantId: tenant.id,
                }
            });

            return { tenant, admin: user };
        });

        // Audit log tenant creation
        await this.auditService.logTenantAction('TENANT_CREATED', dto.name, actorId || 'SYSTEM', result.tenant.id);

        // Create system alert for new tenant
        await this.alertsService.createAlert({
            type: 'NEW_TENANT',
            severity: 'INFO',
            title: `Nouveau laboratoire: ${dto.name}`,
            message: `Le laboratoire ${dto.name} vient d'être créé avec l'administrateur ${dto.adminEmail}.`,
            tenantId: result.tenant.id,
        });

        return result;
    }

    async findAll() {
        // Return all tenants with user count
        const tenants = await this.prisma.tenant.findMany({
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return tenants.map(t => ({
            ...t,
            usersCount: t._count.users
        }));
    }

    async findOne(id: string) {
        return this.prisma.tenant.findUnique({
            where: { id }
        });
    }

    async update(id: string, data: { retentionDays?: number }) {
        // Validate Retention Policy
        if (data.retentionDays) {
            const maxDays = Number(await this.config.get('retention.max_days')) || 90;
            if (data.retentionDays > maxDays) {
                throw new BadRequestException(`Retention duration cannot exceed the global limit of ${maxDays} days.`);
            }
            if (data.retentionDays < 1) {
                throw new BadRequestException('Retention duration must be at least 1 day.');
            }
        }

        return this.prisma.tenant.update({
            where: { id },
            data
        });
    }

    async delete(id: string) {
        return this.prisma.tenant.update({
            where: { id },
            data: { isActive: false }
        });
    }

    // ========================
    // SYNC API KEY MANAGEMENT
    // ========================

    /**
     * Generate a new sync API key for a tenant
     */
    async generateSyncApiKey(tenantId: string): Promise<{ syncApiKey: string }> {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        // Generate a secure 56-character key
        const syncApiKey = `sk_sync_${crypto.randomBytes(24).toString('hex')}`;

        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { syncApiKey },
        });

        this.logger.log(`Generated new sync API key for tenant ${tenantId}`);

        return { syncApiKey };
    }

    /**
     * Revoke the sync API key for a tenant
     */
    async revokeSyncApiKey(tenantId: string): Promise<{ revoked: boolean }> {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        if (!tenant.syncApiKey) {
            throw new BadRequestException('No sync API key to revoke');
        }

        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { syncApiKey: null },
        });

        this.logger.log(`Revoked sync API key for tenant ${tenantId}`);

        return { revoked: true };
    }

    /**
     * Get the current sync API key status for a tenant
     */
    async getSyncApiKeyStatus(tenantId: string): Promise<{ hasKey: boolean; syncApiKey: string | null }> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { syncApiKey: true },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        return {
            hasKey: !!tenant.syncApiKey,
            syncApiKey: tenant.syncApiKey,
        };
    }

    // ========================
    // WHITE LABELING / BRANDING
    // ========================

    /**
     * Update tenant branding (color, slug)
     */
    async updateBranding(tenantId: string, data: { brandColor?: string; slug?: string }): Promise<any> {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        // Validate hex color format
        if (data.brandColor && !/^#[0-9A-Fa-f]{6}$/.test(data.brandColor)) {
            throw new BadRequestException('Invalid color format. Use hex format like #3B82F6');
        }

        // Check slug uniqueness if changing
        if (data.slug && data.slug !== tenant.slug) {
            const existingSlug = await this.prisma.tenant.findUnique({ where: { slug: data.slug } });
            if (existingSlug) {
                throw new BadRequestException('This slug is already taken');
            }
        }

        return this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                ...(data.brandColor && { brandColor: data.brandColor }),
                ...(data.slug && { slug: data.slug }),
            },
        });
    }

    /**
     * Update tenant logo URL
     */
    async updateLogoUrl(tenantId: string, logoUrl: string): Promise<any> {
        return this.prisma.tenant.update({
            where: { id: tenantId },
            data: { brandLogoUrl: logoUrl },
        });
    }

    /**
     * Get public branding info by slug (no auth required)
     */
    async getPublicBranding(slug: string): Promise<{ name: string; brandColor: string | null; brandLogoUrl: string | null } | null> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug },
            select: {
                name: true,
                brandColor: true,
                brandLogoUrl: true,
            },
        });

        return tenant;
    }

    // ========================
    // PAYMENT PROVIDER CONFIGURATION (Multi-Provider)
    // ========================

    /**
     * Update payment provider configuration for a tenant
     * Supports: CAMPAY, ORANGE_MONEY, MTN_MOMO
     */
    async updatePaymentProviderConfig(
        tenantId: string,
        config: {
            paymentProvider?: 'CAMPAY' | 'ORANGE_MONEY' | 'MTN_MOMO';
            // Campay
            campayUsername?: string;
            campayPassword?: string;
            // Orange Money
            orangeUsername?: string;
            orangePassword?: string;
            orangeAuthToken?: string;
            orangeMsisdn?: string;
            // MTN MoMo
            mtnApiUser?: string;
            mtnApiKey?: string;
            mtnSubscriptionKey?: string;
            mtnTargetEnv?: string;
        }
    ): Promise<any> {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        const updateData: any = {};

        // Set provider type if provided
        if (config.paymentProvider) {
            updateData.paymentProvider = config.paymentProvider;
        }

        // Campay credentials
        if (config.campayUsername !== undefined) {
            updateData.campayUsername = config.campayUsername;
        }
        if (config.campayPassword !== undefined) {
            updateData.campayPassword = config.campayPassword; // TODO: Encrypt
        }

        // Orange Money credentials
        if (config.orangeUsername !== undefined) {
            updateData.orangeUsername = config.orangeUsername;
        }
        if (config.orangePassword !== undefined) {
            updateData.orangePassword = config.orangePassword; // TODO: Encrypt
        }
        if (config.orangeAuthToken !== undefined) {
            updateData.orangeAuthToken = config.orangeAuthToken;
        }
        if (config.orangeMsisdn !== undefined) {
            updateData.orangeMsisdn = config.orangeMsisdn;
        }

        // MTN MoMo credentials
        if (config.mtnApiUser !== undefined) {
            updateData.mtnApiUser = config.mtnApiUser;
        }
        if (config.mtnApiKey !== undefined) {
            updateData.mtnApiKey = config.mtnApiKey; // TODO: Encrypt
        }
        if (config.mtnSubscriptionKey !== undefined) {
            updateData.mtnSubscriptionKey = config.mtnSubscriptionKey;
        }
        if (config.mtnTargetEnv !== undefined) {
            updateData.mtnTargetEnv = config.mtnTargetEnv;
        }

        // Update using 'as any' until Prisma Client is regenerated
        await (this.prisma.tenant as any).update({
            where: { id: tenantId },
            data: updateData,
        });

        this.logger.log(`Updated payment provider config for tenant ${tenantId}: ${config.paymentProvider || 'credentials only'}`);

        return {
            success: true,
            message: 'Payment provider configuration saved',
            provider: config.paymentProvider,
        };
    }
}

