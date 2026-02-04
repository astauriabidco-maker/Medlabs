/**
 * Notification Factory - Simple facade for provider instantiation
 * Uses the same schema as DynamicNotificationService
 * Provides a simpler interface for getting provider capabilities
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../shared/encryption.service';

// Notification result interface
export interface NotificationResult {
    success: boolean;
    messageId?: string;
    provider: string;
    error?: string;
}

// Provider interface
export interface INotificationProvider {
    name: string;
    isAvailable: boolean;
    send(to: string, message: string): Promise<NotificationResult>;
}

// Tenant capabilities
export interface TenantNotificationCapabilities {
    hasSms: boolean;
    hasWhatsapp: boolean;
    provider: string | null;
    phoneNumber: string | null;
}

@Injectable()
export class NotificationFactory {
    private readonly logger = new Logger(NotificationFactory.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly encryption: EncryptionService,
    ) { }

    /**
     * Get tenant notification capabilities
     */
    async getCapabilities(tenantId: string): Promise<TenantNotificationCapabilities> {
        const integration = await this.prisma.tenantIntegration.findUnique({
            where: { tenantId },
        });

        if (!integration || !integration.isActive) {
            // Check for fallback env vars
            if (process.env.TWILIO_SID) {
                return {
                    hasSms: true,
                    hasWhatsapp: true,
                    provider: 'TWILIO (ENV)',
                    phoneNumber: process.env.TWILIO_PHONE || null,
                };
            }
            return {
                hasSms: false,
                hasWhatsapp: false,
                provider: null,
                phoneNumber: null,
            };
        }

        return {
            hasSms: integration.smsEnabled,
            hasWhatsapp: integration.whatsappEnabled,
            provider: integration.provider,
            phoneNumber: integration.phoneNumber,
        };
    }

    /**
     * Check if tenant can send SMS
     */
    async canSendSms(tenantId: string): Promise<boolean> {
        const caps = await this.getCapabilities(tenantId);
        return caps.hasSms;
    }

    /**
     * Check if tenant can send WhatsApp
     */
    async canSendWhatsapp(tenantId: string): Promise<boolean> {
        const caps = await this.getCapabilities(tenantId);
        return caps.hasWhatsapp;
    }

    /**
     * Get configured provider name for tenant
     */
    async getProviderName(tenantId: string): Promise<string | null> {
        const caps = await this.getCapabilities(tenantId);
        return caps.provider;
    }

    /**
     * Create a Twilio SMS sender function
     * Returns null if credentials are not available
     */
    async createSmsSender(tenantId: string): Promise<((to: string, message: string) => Promise<NotificationResult>) | null> {
        const integration = await this.prisma.tenantIntegration.findUnique({
            where: { tenantId },
        });

        let accountId: string;
        let authToken: string;
        let phoneNumber: string;

        if (integration && integration.isActive) {
            accountId = integration.accountId;
            authToken = this.encryption.decrypt(integration.authToken);
            phoneNumber = integration.phoneNumber;
        } else if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
            accountId = process.env.TWILIO_SID;
            authToken = process.env.TWILIO_AUTH_TOKEN;
            phoneNumber = process.env.TWILIO_PHONE || '+15005550006';
        } else {
            return null;
        }

        return async (to: string, message: string): Promise<NotificationResult> => {
            // Dev mode mock
            if (process.env.NODE_ENV !== 'production') {
                this.logger.log(`[SMS MOCK] To: ${to} | Message: ${message.substring(0, 50)}...`);
                return { success: true, messageId: `mock-sms-${Date.now()}`, provider: 'twilio' };
            }

            try {
                const twilio = require('twilio');
                const client = twilio(accountId, authToken);
                const result = await client.messages.create({
                    from: phoneNumber,
                    to,
                    body: message,
                });
                return { success: true, messageId: result.sid, provider: 'twilio' };
            } catch (error: any) {
                return { success: false, provider: 'twilio', error: error.message };
            }
        };
    }

    /**
     * Create a WhatsApp sender function
     * Returns null if credentials are not available
     */
    async createWhatsappSender(tenantId: string): Promise<((to: string, message: string) => Promise<NotificationResult>) | null> {
        const integration = await this.prisma.tenantIntegration.findUnique({
            where: { tenantId },
        });

        let accountId: string;
        let authToken: string;
        let phoneNumber: string;

        if (integration && integration.isActive && integration.whatsappEnabled) {
            accountId = integration.accountId;
            authToken = this.encryption.decrypt(integration.authToken);
            phoneNumber = integration.phoneNumber;
        } else if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
            accountId = process.env.TWILIO_SID;
            authToken = process.env.TWILIO_AUTH_TOKEN;
            phoneNumber = process.env.TWILIO_PHONE || '+15005550006';
        } else {
            return null;
        }

        return async (to: string, message: string): Promise<NotificationResult> => {
            // Dev mode mock
            if (process.env.NODE_ENV !== 'production') {
                this.logger.log(`[WA MOCK] To: ${to} | Message: ${message.substring(0, 50)}...`);
                return { success: true, messageId: `mock-wa-${Date.now()}`, provider: 'twilio_whatsapp' };
            }

            try {
                const twilio = require('twilio');
                const client = twilio(accountId, authToken);
                const result = await client.messages.create({
                    from: `whatsapp:${phoneNumber}`,
                    to: `whatsapp:${to}`,
                    body: message,
                });
                return { success: true, messageId: result.sid, provider: 'twilio_whatsapp' };
            } catch (error: any) {
                return { success: false, provider: 'twilio_whatsapp', error: error.message };
            }
        };
    }
}
