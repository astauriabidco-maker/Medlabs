import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider, ProviderCredentials } from './providers/payment-provider.interface';
import { CampayProvider } from './providers/campay.provider';
import { OrangeMoneyProvider } from './providers/orange-money.provider';
import { MtnMomoProvider } from './providers/mtn-momo.provider';

export type PaymentProviderType = 'CAMPAY' | 'ORANGE_MONEY' | 'MTN_MOMO';

interface TenantPaymentConfig {
    paymentProvider: PaymentProviderType | null;
    campayUsername?: string | null;
    campayPassword?: string | null;
    orangeUsername?: string | null;
    orangePassword?: string | null;
    orangeAuthToken?: string | null;
    orangeMsisdn?: string | null;
    mtnApiUser?: string | null;
    mtnApiKey?: string | null;
    mtnSubscriptionKey?: string | null;
    mtnTargetEnv?: string | null;
}

@Injectable()
export class PaymentProviderFactory {
    private readonly logger = new Logger(PaymentProviderFactory.name);
    private readonly isSandbox: boolean;

    constructor() {
        this.isSandbox = process.env.PAYMENT_SANDBOX === 'true' ||
            process.env.CAMPAY_SANDBOX === 'true' ||
            process.env.NODE_ENV !== 'production';
    }

    /**
     * Get the appropriate payment provider for a tenant
     */
    getProvider(tenant: TenantPaymentConfig): PaymentProvider {
        const providerType = tenant.paymentProvider || 'CAMPAY';
        const credentials = this.extractCredentials(tenant);

        this.logger.log(`Creating ${providerType} provider (sandbox: ${this.isSandbox})`);

        switch (providerType) {
            case 'ORANGE_MONEY':
                return new OrangeMoneyProvider(credentials, this.isSandbox);

            case 'MTN_MOMO':
                return new MtnMomoProvider(credentials, this.isSandbox);

            case 'CAMPAY':
            default:
                return new CampayProvider(credentials, this.isSandbox);
        }
    }

    /**
     * Get list of available providers
     */
    getAvailableProviders(): Array<{ id: PaymentProviderType; name: string; description: string }> {
        return [
            {
                id: 'CAMPAY',
                name: 'Campay',
                description: 'Aggregateur (MTN MoMo + Orange Money)',
            },
            {
                id: 'ORANGE_MONEY',
                name: 'Orange Money',
                description: 'API directe Orange Money Cameroun',
            },
            {
                id: 'MTN_MOMO',
                name: 'MTN MoMo',
                description: 'API directe MTN Mobile Money',
            },
        ];
    }

    private extractCredentials(tenant: TenantPaymentConfig): ProviderCredentials {
        return {
            campayUsername: tenant.campayUsername || undefined,
            campayPassword: tenant.campayPassword || undefined,
            orangeUsername: tenant.orangeUsername || undefined,
            orangePassword: tenant.orangePassword || undefined,
            orangeAuthToken: tenant.orangeAuthToken || undefined,
            orangeMsisdn: tenant.orangeMsisdn || undefined,
            mtnApiUser: tenant.mtnApiUser || undefined,
            mtnApiKey: tenant.mtnApiKey || undefined,
            mtnSubscriptionKey: tenant.mtnSubscriptionKey || undefined,
            mtnTargetEnv: tenant.mtnTargetEnv || undefined,
        };
    }
}
