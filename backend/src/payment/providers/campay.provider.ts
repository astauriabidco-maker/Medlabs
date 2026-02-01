import { Logger } from '@nestjs/common';
import { BasePaymentProvider, PaymentResult, PaymentStatus, ProviderCredentials } from './payment-provider.interface';

/**
 * Campay Payment Provider
 * Aggregator supporting both MTN MoMo and Orange Money
 * Documentation: https://campay.net/docs
 */
export class CampayProvider extends BasePaymentProvider {
    readonly providerName = 'CAMPAY';
    readonly displayName = 'Campay';

    private readonly logger = new Logger(CampayProvider.name);
    private readonly baseUrl: string;

    constructor(credentials: ProviderCredentials, sandbox: boolean = true) {
        super(credentials, sandbox);
        this.baseUrl = sandbox
            ? 'https://demo.campay.net/api'
            : 'https://www.campay.net/api';
    }

    async authenticate(): Promise<string> {
        const { campayUsername, campayPassword } = this.credentials;

        if (!campayUsername || !campayPassword) {
            throw new Error('Campay credentials not configured');
        }

        try {
            const response = await fetch(`${this.baseUrl}/token/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: campayUsername,
                    password: campayPassword,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Campay auth failed: ${error}`);
            }

            const data = await response.json();
            this.accessToken = data.token;
            // Token typically valid for 1 hour
            this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);

            return this.accessToken!;
        } catch (error: any) {
            this.logger.error(`Campay authentication error: ${error.message}`);
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

        // Normalize phone number (Campay expects 237XXXXXXXXX)
        const normalizedPhone = this.normalizePhone(phone);

        try {
            const response = await fetch(`${this.baseUrl}/collect/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`,
                },
                body: JSON.stringify({
                    amount: Math.round(amount),
                    currency: 'XAF',
                    from: normalizedPhone,
                    description,
                    external_reference: reference,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Campay payment failed: ${error}`);
            }

            const data = await response.json();

            this.logger.log(`Campay payment initiated: ${data.reference}`);

            return {
                reference: data.reference,
                status: 'PENDING',
                ussdCode: data.ussd_code,
                message: 'Payment request sent to phone',
                operator: data.operator,
            };
        } catch (error: any) {
            this.logger.error(`Campay payment error: ${error.message}`);
            throw error;
        }
    }

    async checkStatus(reference: string): Promise<PaymentStatus> {
        const token = await this.ensureAuthenticated();

        try {
            const response = await fetch(`${this.baseUrl}/transaction/${reference}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Campay status check failed: ${error}`);
            }

            const data = await response.json();

            // Map Campay status to our enum
            let status: 'PENDING' | 'SUCCESS' | 'FAILED';
            switch (data.status?.toUpperCase()) {
                case 'SUCCESSFUL':
                case 'SUCCESS':
                    status = 'SUCCESS';
                    break;
                case 'FAILED':
                case 'CANCELLED':
                    status = 'FAILED';
                    break;
                default:
                    status = 'PENDING';
            }

            return {
                reference: data.reference,
                status,
                amount: data.amount,
                currency: data.currency || 'XAF',
                operator: data.operator,
                externalReference: data.external_reference,
            };
        } catch (error: any) {
            this.logger.error(`Campay status check error: ${error.message}`);
            throw error;
        }
    }

    private normalizePhone(phone: string): string {
        // Remove spaces, dashes, and leading +
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
