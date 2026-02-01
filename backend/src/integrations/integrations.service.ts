import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../shared/encryption.service';
import { DynamicNotificationService } from '../notifications/dynamic-notification.service';

interface SaveIntegrationDto {
    provider: 'TWILIO' | 'META' | 'ORANGE';
    accountId: string;
    authToken: string;
    phoneNumber: string;
    smsEnabled?: boolean;
    whatsappEnabled?: boolean;
    isActive?: boolean;
}

export interface IntegrationResponse {
    exists: boolean;
    provider?: string;
    accountId?: string;
    phoneNumber?: string;
    smsEnabled?: boolean;
    whatsappEnabled?: boolean;
    isActive?: boolean;
    lastTestedAt?: Date | null;
    testStatus?: string | null;
}

@Injectable()
export class IntegrationsService {
    private readonly logger = new Logger(IntegrationsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly encryption: EncryptionService,
        private readonly dynamicNotification: DynamicNotificationService,
    ) { }

    /**
     * Get integration config for a tenant (without authToken for security)
     */
    async getIntegration(tenantId: string): Promise<IntegrationResponse> {
        const integration = await this.prisma.tenantIntegration.findUnique({
            where: { tenantId },
        });

        if (!integration) {
            return { exists: false };
        }

        return {
            exists: true,
            provider: integration.provider,
            accountId: integration.accountId,
            phoneNumber: integration.phoneNumber,
            smsEnabled: integration.smsEnabled,
            whatsappEnabled: integration.whatsappEnabled,
            isActive: integration.isActive,
            lastTestedAt: integration.lastTestedAt,
            testStatus: integration.testStatus,
        };
    }

    /**
     * Save or update integration config
     */
    async saveIntegration(tenantId: string, dto: SaveIntegrationDto) {
        // Encrypt the auth token before storing
        const encryptedToken = this.encryption.encrypt(dto.authToken);

        const data = {
            provider: dto.provider as 'TWILIO' | 'META' | 'ORANGE',
            accountId: dto.accountId,
            authToken: encryptedToken,
            phoneNumber: dto.phoneNumber,
            smsEnabled: dto.smsEnabled ?? true,
            whatsappEnabled: dto.whatsappEnabled ?? false,
            isActive: dto.isActive ?? true,
        };

        // Upsert: create if not exists, update if exists
        const integration = await this.prisma.tenantIntegration.upsert({
            where: { tenantId },
            create: {
                tenantId,
                ...data,
            },
            update: data,
        });

        this.logger.log(`Integration saved for tenant ${tenantId}: ${dto.provider}`);

        return {
            success: true,
            message: 'Integration configuration saved',
            provider: integration.provider,
            accountId: integration.accountId,
            phoneNumber: integration.phoneNumber,
        };
    }

    /**
     * Test the connection
     */
    async testConnection(tenantId: string) {
        return this.dynamicNotification.testConnection(tenantId);
    }

    /**
     * Delete integration (revert to platform defaults)
     */
    async deleteIntegration(tenantId: string) {
        await this.prisma.tenantIntegration.delete({
            where: { tenantId },
        }).catch(() => {
            // Ignore if not exists
        });

        this.logger.log(`Integration deleted for tenant ${tenantId}`);

        return {
            success: true,
            message: 'Integration reset to platform defaults',
        };
    }
}
