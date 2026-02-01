/**
 * Payment Provider Interface
 * Common interface for all payment providers (Campay, Orange Money, MTN MoMo)
 */

export interface PaymentResult {
    reference: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    ussdCode?: string;
    message?: string;
    operator?: string;
}

export interface PaymentStatus {
    reference: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    amount?: number;
    currency?: string;
    operator?: string;
    externalReference?: string;
}

export interface ProviderCredentials {
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

export interface PaymentProvider {
    /** Provider identifier */
    readonly providerName: string;

    /** Provider display name for UI */
    readonly displayName: string;

    /**
     * Authenticate with the provider and get an access token
     */
    authenticate(): Promise<string>;

    /**
     * Initiate a payment request
     * @param phone - Customer phone number
     * @param amount - Amount to charge
     * @param reference - Unique transaction reference
     * @param description - Payment description
     */
    initiatePayment(
        phone: string,
        amount: number,
        reference: string,
        description?: string
    ): Promise<PaymentResult>;

    /**
     * Check the status of a payment
     * @param reference - Transaction reference
     */
    checkStatus(reference: string): Promise<PaymentStatus>;

    /**
     * Test the connection with the provider
     * Returns true if credentials are valid
     */
    testConnection(): Promise<boolean>;
}

/**
 * Abstract base class with common functionality
 */
export abstract class BasePaymentProvider implements PaymentProvider {
    abstract readonly providerName: string;
    abstract readonly displayName: string;

    protected accessToken: string | null = null;
    protected tokenExpiry: Date | null = null;
    protected isSandbox: boolean;

    constructor(
        protected credentials: ProviderCredentials,
        sandbox: boolean = true
    ) {
        this.isSandbox = sandbox;
    }

    abstract authenticate(): Promise<string>;
    abstract initiatePayment(phone: string, amount: number, reference: string, description?: string): Promise<PaymentResult>;
    abstract checkStatus(reference: string): Promise<PaymentStatus>;

    async testConnection(): Promise<boolean> {
        try {
            const token = await this.authenticate();
            return !!token;
        } catch {
            return false;
        }
    }

    protected isTokenValid(): boolean {
        if (!this.accessToken || !this.tokenExpiry) return false;
        return new Date() < this.tokenExpiry;
    }

    protected async ensureAuthenticated(): Promise<string> {
        if (!this.isTokenValid()) {
            this.accessToken = await this.authenticate();
        }
        return this.accessToken!;
    }
}
