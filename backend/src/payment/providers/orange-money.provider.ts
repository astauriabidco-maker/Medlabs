import { Logger } from '@nestjs/common';
import { BasePaymentProvider, PaymentResult, PaymentStatus, ProviderCredentials } from './payment-provider.interface';

/**
 * Orange Money Cameroon Payment Provider
 * Direct API integration via USSD Push
 * Base URL: https://api-s1.orange.cm
 */
export class OrangeMoneyProvider extends BasePaymentProvider {
    readonly providerName = 'ORANGE_MONEY';
    readonly displayName = 'Orange Money';

    private readonly logger = new Logger(OrangeMoneyProvider.name);
    private readonly baseUrl: string;

    constructor(credentials: ProviderCredentials, sandbox: boolean = true) {
        super(credentials, sandbox);
        // Orange CM uses same URL for sandbox (test credentials differ)
        this.baseUrl = 'https://api-s1.orange.cm';
    }

    async authenticate(): Promise<string> {
        const { orangeUsername, orangePassword } = this.credentials;

        if (!orangeUsername || !orangePassword) {
            throw new Error('Orange Money credentials not configured');
        }

        try {
            // Orange uses OAuth 2.0 client credentials grant
            const basicAuth = Buffer.from(`${orangeUsername}:${orangePassword}`).toString('base64');

            const response = await fetch(`${this.baseUrl}/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${basicAuth}`,
                },
                body: 'grant_type=client_credentials',
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Orange Money auth failed: ${error}`);
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            // Token validity from response or default 1 hour
            const expiresIn = data.expires_in || 3600;
            this.tokenExpiry = new Date(Date.now() + (expiresIn - 60) * 1000);

            return this.accessToken!;
        } catch (error: any) {
            this.logger.error(`Orange Money authentication error: ${error.message}`);
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
        const { orangeAuthToken, orangeMsisdn } = this.credentials;

        if (!orangeAuthToken || !orangeMsisdn) {
            throw new Error('Orange Money X-AUTH-TOKEN or MSISDN not configured');
        }

        // Normalize phone number (Orange expects 237XXXXXXXXX)
        const normalizedPhone = this.normalizePhone(phone);

        try {
            const response = await fetch(`${this.baseUrl}/webpayment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-AUTH-TOKEN': orangeAuthToken,
                },
                body: JSON.stringify({
                    subscriberMsisdn: normalizedPhone,
                    channelUserMsisdn: orangeMsisdn,
                    amount: Math.round(amount),
                    orderId: reference,
                    description,
                    payToken: '', // Will be filled by USSD
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Orange Money payment failed: ${error}`);
            }

            const data = await response.json();

            this.logger.log(`Orange Money payment initiated: ${data.payToken || reference}`);

            return {
                reference: data.payToken || reference,
                status: 'PENDING',
                message: 'USSD push sent. Patient must confirm with PIN.',
                operator: 'ORANGE',
            };
        } catch (error: any) {
            this.logger.error(`Orange Money payment error: ${error.message}`);
            throw error;
        }
    }

    async checkStatus(reference: string): Promise<PaymentStatus> {
        const token = await this.ensureAuthenticated();
        const { orangeAuthToken } = this.credentials;

        try {
            const response = await fetch(`${this.baseUrl}/webpayment/${reference}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-AUTH-TOKEN': orangeAuthToken || '',
                },
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Orange Money status check failed: ${error}`);
            }

            const data = await response.json();

            // Map Orange status to our enum
            let status: 'PENDING' | 'SUCCESS' | 'FAILED';
            switch (data.status?.toUpperCase()) {
                case 'SUCCESS':
                case 'SUCCESSFUL':
                case 'COMPLETED':
                    status = 'SUCCESS';
                    break;
                case 'FAILED':
                case 'CANCELLED':
                case 'EXPIRED':
                    status = 'FAILED';
                    break;
                default:
                    status = 'PENDING';
            }

            return {
                reference: data.payToken || reference,
                status,
                amount: data.amount,
                currency: 'XAF',
                operator: 'ORANGE',
                externalReference: data.orderId,
            };
        } catch (error: any) {
            this.logger.error(`Orange Money status check error: ${error.message}`);
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
