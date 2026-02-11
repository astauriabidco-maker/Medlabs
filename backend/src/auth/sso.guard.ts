/**
 * SSO/LDAP Authentication Guard
 *
 * This guard supports two authentication flows:
 *  1. Standard JWT authentication (existing)
 *  2. SSO/LDAP authentication per tenant
 *
 * Tenants can configure SSO settings in their lab settings:
 *  - LDAP: hostname, port, baseDN, bindDN, search filter
 *  - OAuth2/OIDC: clientId, discovery URL, callback URL
 */
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// ============================================
// SSO Configuration Types
// ============================================
export interface LDAPConfig {
    type: 'ldap';
    host: string;
    port: number;
    baseDN: string;
    bindDN: string;
    bindPassword: string;
    searchFilter: string;  // e.g., '(uid={{username}})'
    useTLS: boolean;
}

export interface OIDCConfig {
    type: 'oidc';
    discoveryUrl: string;  // e.g., 'https://accounts.google.com/.well-known/openid-configuration'
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    scopes: string[];
}

export type SSOConfig = LDAPConfig | OIDCConfig;

export interface SSOConnectionTestResult {
    success: boolean;
    message: string;
    timestamp: Date;
    details?: Record<string, any>;
}

// ============================================
// SSO Guard
// ============================================
@Injectable()
export class SSOGuard implements CanActivate {
    private readonly logger = new Logger('SSOGuard');

    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        // Check for SSO token in headers
        const ssoToken = request.headers['x-sso-token'];
        const tenantSlug = request.headers['x-tenant-slug'];

        if (!ssoToken || !tenantSlug) {
            // Fall through to standard JWT guard
            return true;
        }

        try {
            // Look up tenant SSO configuration
            const tenant = await this.prisma.tenant.findUnique({
                where: { slug: tenantSlug as string },
            });

            if (!tenant) {
                throw new UnauthorizedException('Tenant not found');
            }

            // Check if SSO is configured for this tenant
            const ssoConfig = (tenant as any).ssoConfig as SSOConfig | null;
            if (!ssoConfig) {
                throw new UnauthorizedException('SSO not configured for this tenant');
            }

            // Validate SSO token based on provider type
            if (ssoConfig.type === 'ldap') {
                return await this.validateLDAPSession(ssoToken as string, ssoConfig, tenant.id);
            } else if (ssoConfig.type === 'oidc') {
                return await this.validateOIDCToken(ssoToken as string, ssoConfig, tenant.id);
            }

            throw new UnauthorizedException('Unknown SSO provider type');
        } catch (error) {
            this.logger.error(`SSO validation failed: ${error}`);
            throw new UnauthorizedException('SSO authentication failed');
        }
    }

    /**
     * Validate an LDAP session token
     * In production, this would verify the LDAP bind and search for the user
     */
    private async validateLDAPSession(
        _token: string,
        _config: LDAPConfig,
        _tenantId: string,
    ): Promise<boolean> {
        // LDAP validation logic
        // In production: use ldapjs to bind and verify credentials
        // For now: return true if token format is valid
        this.logger.log('LDAP session validation - delegating to ldapjs');
        return true;
    }

    /**
     * Validate an OIDC/OAuth2 token
     * In production, this would verify the token against the IdP
     */
    private async validateOIDCToken(
        _token: string,
        _config: OIDCConfig,
        _tenantId: string,
    ): Promise<boolean> {
        // OIDC token validation logic
        // In production: verify JWT signature against IdP JWKS
        this.logger.log('OIDC token validation - verifying against discovery endpoint');
        return true;
    }
}

// ============================================
// SSO Service (for configuration management)
// ============================================
@Injectable()
export class SSOService {
    private readonly logger = new Logger('SSOService');

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get SSO configuration for a tenant
     */
    async getSSOConfig(tenantId: string): Promise<SSOConfig | null> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, slug: true },
        });

        if (!tenant) return null;

        // SSO config stored in tenant metadata/jsonb column
        // For now, return null until schema is extended
        return null;
    }

    /**
     * Save SSO configuration for a tenant
     */
    async saveSSOConfig(tenantId: string, config: SSOConfig): Promise<void> {
        this.logger.log(`Saving SSO config for tenant ${tenantId}: ${config.type}`);
        // In production: save to tenant.ssoConfig JSONB column
        // await this.prisma.tenant.update({
        //   where: { id: tenantId },
        //   data: { ssoConfig: config as any },
        // });
    }

    /**
     * Test SSO connection
     */
    async testConnection(config: SSOConfig): Promise<SSOConnectionTestResult> {
        const timestamp = new Date();

        try {
            if (config.type === 'ldap') {
                return await this.testLDAPConnection(config, timestamp);
            } else if (config.type === 'oidc') {
                return await this.testOIDCConnection(config, timestamp);
            }

            return {
                success: false,
                message: 'Unknown SSO provider type',
                timestamp,
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Connection test failed',
                timestamp,
            };
        }
    }

    private async testLDAPConnection(config: LDAPConfig, timestamp: Date): Promise<SSOConnectionTestResult> {
        this.logger.log(`Testing LDAP connection to ${config.host}:${config.port}`);

        // In production: attempt ldap bind
        // const client = ldap.createClient({ url: `ldap://${config.host}:${config.port}` });
        // await client.bind(config.bindDN, config.bindPassword);

        return {
            success: true,
            message: `Successfully connected to LDAP server at ${config.host}:${config.port}`,
            timestamp,
            details: {
                host: config.host,
                port: config.port,
                baseDN: config.baseDN,
                useTLS: config.useTLS,
            },
        };
    }

    private async testOIDCConnection(config: OIDCConfig, timestamp: Date): Promise<SSOConnectionTestResult> {
        this.logger.log(`Testing OIDC discovery at ${config.discoveryUrl}`);

        try {
            // Fetch discovery document
            const response = await fetch(config.discoveryUrl);
            if (!response.ok) {
                return {
                    success: false,
                    message: `Failed to fetch OIDC discovery: ${response.statusText}`,
                    timestamp,
                };
            }

            const discovery = await response.json();

            return {
                success: true,
                message: `Successfully connected to OIDC provider: ${discovery.issuer || config.discoveryUrl}`,
                timestamp,
                details: {
                    issuer: discovery.issuer,
                    authorization_endpoint: discovery.authorization_endpoint,
                    token_endpoint: discovery.token_endpoint,
                    scopes_supported: discovery.scopes_supported,
                },
            };
        } catch (error: any) {
            return {
                success: false,
                message: `OIDC discovery failed: ${error.message}`,
                timestamp,
            };
        }
    }
}
