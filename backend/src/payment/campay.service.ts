import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import axios from 'axios';

interface CampayAuthResponse {
    token: string;
    expires_in: number;
}

interface CampayCollectResponse {
    reference: string;
    ussd_code?: string;
    operator?: string;
    status: string;
}

interface CampayStatusResponse {
    reference: string;
    status: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
    amount: number;
    currency: string;
    operator?: string;
    external_reference?: string;
}

@Injectable()
export class CampayService {
    private readonly logger = new Logger(CampayService.name);
    private readonly baseUrl: string;
    private tokenCache: Map<string, { token: string; expiresAt: Date }> = new Map();

    constructor(private readonly prisma: PrismaService) {
        // Use demo endpoint for sandbox, production for live
        this.baseUrl = process.env.CAMPAY_SANDBOX === 'true'
            ? 'https://demo.campay.net/api'
            : 'https://www.campay.net/api';
    }

    /**
     * Authenticate with Campay using tenant's credentials
     * Returns a cached token if still valid
     */
    async authenticate(tenantId: string): Promise<string> {
        // Check cache first
        const cached = this.tokenCache.get(tenantId);
        if (cached && cached.expiresAt > new Date()) {
            return cached.token;
        }

        // Get tenant credentials
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                campayUsername: true,
                campayPassword: true,
            },
        });

        if (!tenant?.campayUsername || !tenant?.campayPassword) {
            throw new Error('Campay credentials not configured for this tenant');
        }

        try {
            const response = await axios.post<CampayAuthResponse>(
                `${this.baseUrl}/token/`,
                {
                    username: tenant.campayUsername,
                    password: tenant.campayPassword,
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            const token = response.data.token;
            const expiresIn = response.data.expires_in || 3600; // Default 1 hour

            // Cache the token
            this.tokenCache.set(tenantId, {
                token,
                expiresAt: new Date(Date.now() + (expiresIn - 60) * 1000), // Expire 1 min early
            });

            this.logger.log(`Campay authentication successful for tenant ${tenantId}`);
            return token;
        } catch (error) {
            this.logger.error(`Campay authentication failed: ${error.message}`);
            throw new Error('Campay authentication failed');
        }
    }

    /**
     * Initiate a Mobile Money payment (USSD push to patient phone)
     */
    async initiatePayment(
        tenantId: string,
        documentId: string,
        amount: number,
        phoneNumber: string,
        description: string = 'Paiement résultat médical',
    ): Promise<{ reference: string; ussdCode?: string }> {
        const token = await this.authenticate(tenantId);

        // Create pending transaction
        const transaction = await this.prisma.transaction.create({
            data: {
                tenantId,
                documentId,
                amount,
                currency: 'XAF',
                provider: this.detectProvider(phoneNumber),
                phoneNumber,
                status: 'PENDING',
            },
        });

        try {
            const response = await axios.post<CampayCollectResponse>(
                `${this.baseUrl}/collect/`,
                {
                    amount: amount.toString(),
                    currency: 'XAF',
                    from: this.formatPhone(phoneNumber),
                    description,
                    external_reference: transaction.id,
                },
                {
                    headers: {
                        'Authorization': `Token ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            // Update transaction with Campay reference
            await this.prisma.transaction.update({
                where: { id: transaction.id },
                data: { externalRef: response.data.reference },
            });

            this.logger.log(`Payment initiated: ${response.data.reference} for ${amount} XAF`);

            return {
                reference: response.data.reference,
                ussdCode: response.data.ussd_code,
            };
        } catch (error) {
            // Mark transaction as failed
            await this.prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 'FAILED' },
            });

            this.logger.error(`Payment initiation failed: ${error.message}`);
            throw new Error('Failed to initiate payment');
        }
    }

    /**
     * Check the status of a transaction
     */
    async checkStatus(tenantId: string, reference: string): Promise<CampayStatusResponse> {
        const token = await this.authenticate(tenantId);

        try {
            const response = await axios.get<CampayStatusResponse>(
                `${this.baseUrl}/transaction/${reference}/`,
                {
                    headers: {
                        'Authorization': `Token ${token}`,
                    },
                }
            );

            return response.data;
        } catch (error) {
            this.logger.error(`Status check failed: ${error.message}`);
            throw new Error('Failed to check transaction status');
        }
    }

    /**
     * Process webhook callback from Campay
     */
    async processWebhook(payload: {
        reference: string;
        status: string;
        amount?: number;
        external_reference?: string;
    }): Promise<void> {
        const { reference, status, external_reference } = payload;

        this.logger.log(`Webhook received: ${reference} - ${status}`);

        // Find the transaction by external reference (our transaction ID)
        // or by Campay reference
        let transaction = await this.prisma.transaction.findFirst({
            where: {
                OR: [
                    { id: external_reference || '' },
                    { externalRef: reference },
                ],
            },
            include: { document: true },
        });

        if (!transaction) {
            this.logger.warn(`Transaction not found for reference: ${reference}`);
            return;
        }

        const newStatus = status === 'SUCCESSFUL' ? 'SUCCESS' :
            status === 'FAILED' ? 'FAILED' : 'PENDING';

        // Update transaction status
        await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: newStatus },
        });

        // If successful, update document payment status
        if (newStatus === 'SUCCESS') {
            await this.prisma.document.update({
                where: { id: transaction.documentId },
                data: { paymentStatus: 'PAID' },
            });

            // Create audit log
            await this.prisma.auditLog.create({
                data: {
                    tenantId: transaction.tenantId,
                    action: 'PAYMENT_RECEIVED',
                    description: `Payment of ${transaction.amount} XAF received for document`,
                    resourceId: transaction.documentId,
                },
            });

            this.logger.log(`Payment confirmed for document: ${transaction.documentId}`);
        }
    }

    /**
     * Detect mobile money provider from phone number
     */
    private detectProvider(phone: string): string {
        const cleaned = phone.replace(/\D/g, '');
        // Cameroon operator prefixes
        if (/^237(6[5-9]|65)/.test(cleaned)) return 'MOMO'; // MTN
        if (/^237(6[0-4]|69)/.test(cleaned)) return 'OM';   // Orange
        return 'UNKNOWN';
    }

    /**
     * Format phone to international format
     */
    private formatPhone(phone: string): string {
        let cleaned = phone.replace(/\D/g, '');
        if (!cleaned.startsWith('237') && cleaned.length === 9) {
            cleaned = '237' + cleaned;
        }
        return cleaned;
    }
}
