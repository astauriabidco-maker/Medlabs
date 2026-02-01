import { Logger } from '@nestjs/common';
import { BasePaymentProvider, PaymentResult, PaymentStatus, ProviderCredentials } from './payment-provider.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * MTN Mobile Money Payment Provider
 * Direct API integration via MTN MoMo Developer Portal
 * Documentation: https://momodeveloper.mtn.com
 */
export class MtnMomoProvider extends BasePaymentProvider {
    readonly providerName = 'MTN_MOMO';
    readonly displayName = 'MTN MoMo';

    private readonly logger = new Logger(MtnMomoProvider.name);
    private readonly baseUrl: string;

    constructor(credentials: ProviderCredentials, sandbox: boolean = true) {
        super(credentials, sandbox);
        // MTN has separate sandbox and production URLs
        this.baseUrl = sandbox
            ? 'https://sandbox.momodeveloper.mtn.com'
            : 'https://proxy.momoapi.mtn.com';
    }

    async authenticate(): Promise<string> {
        const { mtnApiUser, mtnApiKey, mtnSubscriptionKey } = this.credentials;

        if (!mtnApiUser || !mtnApiKey || !mtnSubscriptionKey) {
            throw new Error('MTN MoMo credentials not configured');
        }

        try {
            const basicAuth = Buffer.from(`${mtnApiUser}:${mtnApiKey}`).toString('base64');

            const response = await fetch(`${this.baseUrl}/collection/token/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${basicAuth}`,
                    'Ocp-Apim-Subscription-Key': mtnSubscriptionKey,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`MTN MoMo auth failed: ${error}`);
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            // Token typically valid for 1 hour
            const expiresIn = data.expires_in || 3600;
            this.tokenExpiry = new Date(Date.now() + (expiresIn - 60) * 1000);

            return this.accessToken!;
        } catch (error: any) {
            this.logger.error(`MTN MoMo authentication error: ${error.message}`);
            throw error;
        }
    }

    async initiatePayment(
        phone: string,
        amount: number,
        reference: string,
        description: string = 'Paiement résultat médical'
    ): Promise<PaymentResult> {
        const token = await this.ensureAuthenticated();
        const { mtnSubscriptionKey, mtnTargetEnv } = this.credentials;

        // Normalize phone number (MTN expects MSISDN format: 237XXXXXXXXX)
        const normalizedPhone = this.normalizePhone(phone);

        // Generate unique request ID
        const requestId = uuidv4();

        try {
            const response = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Reference-Id': requestId,
                    'X-Target-Environment': mtnTargetEnv || (this.isSandbox ? 'sandbox' : 'mtncameroon'),
                    'Ocp-Apim-Subscription-Key': mtnSubscriptionKey || '',
                },
                body: JSON.stringify({
                    amount: String(Math.round(amount)),
                    currency: 'XAF',
                    externalId: reference,
                    payer: {
                        partyIdType: 'MSISDN',
                        partyId: normalizedPhone,
                    },
                    payerMessage: description,
                    payeeNote: `MedLab Result Payment - ${reference}`,
                }),
            });

            // MTN returns 202 Accepted for successful request
            if (response.status !== 202 && !response.ok) {
                const error = await response.text();
                throw new Error(`MTN MoMo payment failed: ${error}`);
            }

            this.logger.log(`MTN MoMo payment initiated: ${requestId}`);

            return {
                reference: requestId,
                status: 'PENDING',
                message: 'Payment request sent. Customer must approve on their phone.',
                operator: 'MTN',
            };
        } catch (error: any) {
            this.logger.error(`MTN MoMo payment error: ${error.message}`);
            throw error;
        }
    }

    async checkStatus(reference: string): Promise<PaymentStatus> {
        const token = await this.ensureAuthenticated();
        const { mtnSubscriptionKey, mtnTargetEnv } = this.credentials;

        try {
            const response = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay/${reference}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Target-Environment': mtnTargetEnv || (this.isSandbox ? 'sandbox' : 'mtncameroon'),
                    'Ocp-Apim-Subscription-Key': mtnSubscriptionKey || '',
                },
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`MTN MoMo status check failed: ${error}`);
            }

            const data = await response.json();

            // Map MTN status to our enum
            let status: 'PENDING' | 'SUCCESS' | 'FAILED';
            switch (data.status?.toUpperCase()) {
                case 'SUCCESSFUL':
                    status = 'SUCCESS';
                    break;
                case 'FAILED':
                case 'REJECTED':
                case 'EXPIRED':
                case 'CANCELLED':
                    status = 'FAILED';
                    break;
                default:
                    status = 'PENDING';
            }

            return {
                reference: reference,
                status,
                amount: Number(data.amount),
                currency: data.currency || 'XAF',
                operator: 'MTN',
                externalReference: data.externalId,
            };
        } catch (error: any) {
            this.logger.error(`MTN MoMo status check error: ${error.message}`);
            throw error;
        }
    }

    private normalizePhone(phone: string): string {
        let cleaned = phone.replace(/[\s\-\+]/g, '');

        // Ensure it starts with 237
        if (!cleaned.startsWith('237')) {
            if (cleaned.startsWith('6') || cleaned.startsWith('2')) {
                cleaned = '237' + cleaned;
            }
        }

        return cleaned;
    }
}
