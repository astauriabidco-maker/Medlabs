import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../shared/encryption.service';

// Twilio SDK types
interface TwilioClient {
    messages: {
        create: (params: {
            from: string;
            to: string;
            body: string;
        }) => Promise<{ sid: string; status: string }>;
    };
}

interface SendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Dynamic Notification Service
 * Fetches tenant-specific credentials and instantiates providers on-the-fly
 */
@Injectable()
export class DynamicNotificationService {
    private readonly logger = new Logger(DynamicNotificationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly encryption: EncryptionService,
    ) { }

    /**
     * Get tenant integration config with decrypted credentials
     */
    private async getTenantCredentials(tenantId: string) {
        const integration = await this.prisma.tenantIntegration.findUnique({
            where: { tenantId },
        });

        if (!integration || !integration.isActive) {
            // Fallback: Check if env vars are configured (Super Admin default)
            if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
                this.logger.log(`Using fallback env credentials for tenant ${tenantId}`);
                return {
                    provider: 'TWILIO' as const,
                    accountId: process.env.TWILIO_SID,
                    authToken: process.env.TWILIO_AUTH_TOKEN,
                    phoneNumber: process.env.TWILIO_PHONE || '+15005550006',
                    smsEnabled: true,
                    whatsappEnabled: true,
                    isFallback: true,
                };
            }
            return null;
        }

        // Decrypt the auth token
        const decryptedToken = this.encryption.decrypt(integration.authToken);

        return {
            provider: integration.provider,
            accountId: integration.accountId,
            authToken: decryptedToken,
            phoneNumber: integration.phoneNumber,
            smsEnabled: integration.smsEnabled,
            whatsappEnabled: integration.whatsappEnabled,
            isFallback: false,
        };
    }

    /**
     * Create a Twilio client instance for the tenant
     */
    private createTwilioClient(accountId: string, authToken: string): TwilioClient | null {
        try {
            // Dynamic import to avoid errors if twilio is not installed
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const twilio = require('twilio');
            return twilio(accountId, authToken);
        } catch (error) {
            this.logger.error('Failed to create Twilio client', error);
            return null;
        }
    }

    /**
     * Send SMS using tenant-specific credentials
     */
    async sendSms(
        tenantId: string,
        to: string,
        message: string,
    ): Promise<SendResult> {
        const credentials = await this.getTenantCredentials(tenantId);

        if (!credentials) {
            this.logger.warn(`No SMS credentials configured for tenant ${tenantId}`);
            return { success: false, error: 'No SMS provider configured' };
        }

        if (!credentials.smsEnabled) {
            this.logger.warn(`SMS disabled for tenant ${tenantId}`);
            return { success: false, error: 'SMS is disabled for this tenant' };
        }

        // Dev mode: Mock the SMS
        if (process.env.NODE_ENV !== 'production') {
            this.logger.log(`[SMS MOCK] To: ${to} | From: ${credentials.phoneNumber}`);
            this.logger.log(`[SMS MOCK] Message: ${message}`);
            this.logger.log(`[SMS MOCK] Provider: ${credentials.provider} (${credentials.isFallback ? 'fallback' : 'tenant config'})`);
            return { success: true, messageId: 'mock-sms-' + Date.now() };
        }

        // Production: Use actual provider
        if (credentials.provider === 'TWILIO') {
            const client = this.createTwilioClient(credentials.accountId, credentials.authToken);
            if (!client) {
                return { success: false, error: 'Failed to initialize Twilio client' };
            }

            try {
                const result = await client.messages.create({
                    from: credentials.phoneNumber,
                    to: to,
                    body: message,
                });
                return { success: true, messageId: result.sid };
            } catch (error: any) {
                this.logger.error(`Twilio SMS failed: ${error.message}`);
                return { success: false, error: error.message };
            }
        }

        return { success: false, error: `Provider ${credentials.provider} not implemented` };
    }

    /**
     * Send WhatsApp message using tenant-specific credentials
     */
    async sendWhatsApp(
        tenantId: string,
        to: string,
        message: string,
    ): Promise<SendResult> {
        const credentials = await this.getTenantCredentials(tenantId);

        if (!credentials) {
            this.logger.warn(`No WhatsApp credentials configured for tenant ${tenantId}`);
            return { success: false, error: 'No WhatsApp provider configured' };
        }

        if (!credentials.whatsappEnabled) {
            this.logger.warn(`WhatsApp disabled for tenant ${tenantId}`);
            return { success: false, error: 'WhatsApp is disabled for this tenant' };
        }

        // Format for WhatsApp
        const recipient = `whatsapp:${to}`;
        const sender = `whatsapp:${credentials.phoneNumber}`;

        // Dev mode: Mock the message
        if (process.env.NODE_ENV !== 'production') {
            this.logger.log(`[WHATSAPP MOCK] To: ${recipient} | From: ${sender}`);
            this.logger.log(`[WHATSAPP MOCK] Message: ${message}`);
            this.logger.log(`[WHATSAPP MOCK] Provider: ${credentials.provider}`);
            return { success: true, messageId: 'mock-wa-' + Date.now() };
        }

        // Production: Use actual provider
        if (credentials.provider === 'TWILIO') {
            const client = this.createTwilioClient(credentials.accountId, credentials.authToken);
            if (!client) {
                return { success: false, error: 'Failed to initialize Twilio client' };
            }

            try {
                const result = await client.messages.create({
                    from: sender,
                    to: recipient,
                    body: message,
                });
                return { success: true, messageId: result.sid };
            } catch (error: any) {
                this.logger.error(`Twilio WhatsApp failed: ${error.message}`);
                return { success: false, error: error.message };
            }
        }

        return { success: false, error: `Provider ${credentials.provider} not implemented for WhatsApp` };
    }

    /**
     * Test connection with tenant credentials
     */
    async testConnection(tenantId: string): Promise<{ success: boolean; message: string }> {
        const credentials = await this.getTenantCredentials(tenantId);

        if (!credentials) {
            return { success: false, message: 'No credentials configured' };
        }

        // Dev mode: Always succeed
        if (process.env.NODE_ENV !== 'production') {
            this.logger.log(`[TEST MOCK] Testing connection for tenant ${tenantId}`);
            this.logger.log(`[TEST MOCK] Provider: ${credentials.provider}, Account: ${credentials.accountId}`);

            // Update test status in DB
            await this.prisma.tenantIntegration.update({
                where: { tenantId },
                data: {
                    lastTestedAt: new Date(),
                    testStatus: 'success',
                },
            }).catch(() => {
                // Ignore if using fallback (no integration record)
            });

            return { success: true, message: 'Connection test successful (dev mode)' };
        }

        // Production: Actually test the connection
        if (credentials.provider === 'TWILIO') {
            try {
                const client = this.createTwilioClient(credentials.accountId, credentials.authToken);
                if (!client) {
                    throw new Error('Failed to create client');
                }

                // Try to fetch account info to verify credentials
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const twilio = require('twilio');
                const account = twilio(credentials.accountId, credentials.authToken);
                await account.api.accounts(credentials.accountId).fetch();

                // Update test status
                await this.prisma.tenantIntegration.update({
                    where: { tenantId },
                    data: {
                        lastTestedAt: new Date(),
                        testStatus: 'success',
                    },
                }).catch(() => { });

                return { success: true, message: 'Twilio connection verified' };
            } catch (error: any) {
                await this.prisma.tenantIntegration.update({
                    where: { tenantId },
                    data: {
                        lastTestedAt: new Date(),
                        testStatus: 'failed',
                    },
                }).catch(() => { });

                return { success: false, message: `Twilio error: ${error.message}` };
            }
        }

        return { success: false, message: `Provider ${credentials.provider} test not implemented` };
    }

    /**
     * Send result notification (WhatsApp first, SMS fallback)
     */
    async sendResultNotification(
        tenantId: string,
        phoneNumber: string,
        patientName: string,
        link: string,
    ): Promise<SendResult> {
        const message = `Bonjour ${patientName}, vos résultats médicaux sont disponibles. Consultez-les ici : ${link}`;

        // Try WhatsApp first
        const waResult = await this.sendWhatsApp(tenantId, phoneNumber, message);
        if (waResult.success) {
            return waResult;
        }

        // Fallback to SMS
        this.logger.log(`WhatsApp failed, falling back to SMS for ${phoneNumber}`);
        return this.sendSms(tenantId, phoneNumber, message);
    }

    /**
     * Send access code via SMS
     */
    async sendAccessCode(
        tenantId: string,
        phoneNumber: string,
        patientName: string,
        accessCode: string,
    ): Promise<SendResult> {
        const message = `MedLab: Bonjour ${patientName}, votre code d'accès aux résultats est : ${accessCode}`;
        return this.sendSms(tenantId, phoneNumber, message);
    }
}
