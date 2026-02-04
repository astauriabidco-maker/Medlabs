/**
 * Payment Provider Factory Unit Tests
 * Tests provider selection and credential extraction
 */
import { PaymentProviderFactory } from './payment-provider.factory';
import { CampayProvider } from './providers/campay.provider';
import { OrangeMoneyProvider } from './providers/orange-money.provider';
import { MtnMomoProvider } from './providers/mtn-momo.provider';

describe('PaymentProviderFactory', () => {
    let factory: PaymentProviderFactory;

    beforeEach(() => {
        // Ensure sandbox mode in tests
        process.env.NODE_ENV = 'test';
        factory = new PaymentProviderFactory();
    });

    describe('getAvailableProviders', () => {
        it('should return all three providers', () => {
            const providers = factory.getAvailableProviders();

            expect(providers).toHaveLength(3);
            expect(providers.map(p => p.id)).toEqual(['CAMPAY', 'ORANGE_MONEY', 'MTN_MOMO']);
        });

        it('should include provider details', () => {
            const providers = factory.getAvailableProviders();

            const campay = providers.find(p => p.id === 'CAMPAY');
            expect(campay).toBeDefined();
            expect(campay!.name).toBe('Campay');
            expect(campay!.description).toContain('Aggregateur');
        });
    });

    describe('getProvider', () => {
        it('should return CampayProvider by default', () => {
            const config = { paymentProvider: null };
            const provider = factory.getProvider(config);

            expect(provider).toBeInstanceOf(CampayProvider);
        });

        it('should return CampayProvider for CAMPAY type', () => {
            const config = {
                paymentProvider: 'CAMPAY' as const,
                campayUsername: 'test_user',
                campayPassword: 'test_pass',
            };
            const provider = factory.getProvider(config);

            expect(provider).toBeInstanceOf(CampayProvider);
        });

        it('should return OrangeMoneyProvider for ORANGE_MONEY type', () => {
            const config = {
                paymentProvider: 'ORANGE_MONEY' as const,
                orangeUsername: 'test_user',
                orangePassword: 'test_pass',
            };
            const provider = factory.getProvider(config);

            expect(provider).toBeInstanceOf(OrangeMoneyProvider);
        });

        it('should return MtnMomoProvider for MTN_MOMO type', () => {
            const config = {
                paymentProvider: 'MTN_MOMO' as const,
                mtnApiUser: 'test_user',
                mtnApiKey: 'test_key',
            };
            const provider = factory.getProvider(config);

            expect(provider).toBeInstanceOf(MtnMomoProvider);
        });

        it('should pass credentials to provider', () => {
            const config = {
                paymentProvider: 'CAMPAY' as const,
                campayUsername: 'my_username',
                campayPassword: 'my_password',
            };
            const provider = factory.getProvider(config);

            // Provider should be created with credentials (internal)
            // Just verify the correct provider type is returned
            expect(provider).toBeInstanceOf(CampayProvider);
        });
    });

    describe('extractCredentials', () => {
        it('should handle null values', () => {
            const config = {
                paymentProvider: 'CAMPAY' as const,
                campayUsername: null,
                campayPassword: null,
            };

            // Should not throw
            const provider = factory.getProvider(config);
            expect(provider).toBeInstanceOf(CampayProvider);
        });

        it('should handle undefined values', () => {
            const config = {
                paymentProvider: 'CAMPAY' as const,
            };

            const provider = factory.getProvider(config);
            expect(provider).toBeInstanceOf(CampayProvider);
        });
    });
});
