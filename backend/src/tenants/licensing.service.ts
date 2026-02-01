import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

/**
 * Feature Flags for Premium Modules
 */
export enum Feature {
    AUTO_SYNC = 'AUTO_SYNC',             // Windows Connector automation
    LONG_TERM_ARCHIVE = 'LONG_TERM_ARCHIVE', // Extended data retention (generic)
    ARCHIVE_5Y = 'ARCHIVE_5Y',           // 5-year archive (1825 days)
    ARCHIVE_10Y = 'ARCHIVE_10Y',         // 10-year archive (3650 days)
    PRIORITY_SUPPORT = 'PRIORITY_SUPPORT',   // Priority support access
}

/**
 * Retention days configuration for archive features
 */
const ARCHIVE_RETENTION_DAYS: Record<string, number> = {
    [Feature.ARCHIVE_5Y]: 1825,   // 5 years
    [Feature.ARCHIVE_10Y]: 3650,  // 10 years
    [Feature.LONG_TERM_ARCHIVE]: 365, // 1 year (default long-term)
};

/**
 * Hardcoded License Codes (MVP)
 * In production, this would be a database table or external licensing API
 */
const LICENSE_CODES: Record<string, Feature[]> = {
    'SYNC-2026-X': [Feature.AUTO_SYNC],
    'ARCH-2026-Y': [Feature.LONG_TERM_ARCHIVE],
    'ARCH-5Y-2026': [Feature.ARCHIVE_5Y],
    'ARCH-10Y-2026': [Feature.ARCHIVE_10Y],
    'PREMIUM-2026-Z': [Feature.AUTO_SYNC, Feature.LONG_TERM_ARCHIVE, Feature.PRIORITY_SUPPORT],
    // Demo codes for testing
    'DEMO-SYNC': [Feature.AUTO_SYNC],
    'DEMO-ALL': [Feature.AUTO_SYNC, Feature.LONG_TERM_ARCHIVE],
    'DEMO-ARCHIVE-5Y': [Feature.ARCHIVE_5Y],
    'DEMO-ARCHIVE-10Y': [Feature.ARCHIVE_10Y],
};

@Injectable()
export class LicensingService {
    private readonly logger = new Logger(LicensingService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Generate a secure random API key
     */
    private generateApiKey(): string {
        return `sk_sync_${crypto.randomBytes(24).toString('hex')}`;
    }

    /**
     * Activate a license code for a tenant
     */
    async activateLicense(tenantId: string, code: string): Promise<{
        success: boolean;
        features: string[];
        message: string;
        syncApiKey?: string;
    }> {
        // Normalize code
        const normalizedCode = code.trim().toUpperCase();

        // Check if code exists
        const grantedFeatures = LICENSE_CODES[normalizedCode];
        if (!grantedFeatures) {
            throw new BadRequestException('Code de licence invalide');
        }

        // Get current tenant
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        // Merge existing features with new ones (no duplicates)
        const existingFeatures = tenant.features || [];
        const newFeatures = [...new Set([...existingFeatures, ...grantedFeatures])];

        // Prepare update data
        const updateData: any = {
            features: newFeatures,
            licenseKey: normalizedCode,
        };

        // Generate API key if AUTO_SYNC is being activated and doesn't already have one
        let syncApiKey: string | undefined;
        if (grantedFeatures.includes(Feature.AUTO_SYNC) && !tenant.syncApiKey) {
            syncApiKey = this.generateApiKey();
            updateData.syncApiKey = syncApiKey;
        } else if (tenant.syncApiKey && grantedFeatures.includes(Feature.AUTO_SYNC)) {
            // Return existing key if already present
            syncApiKey = tenant.syncApiKey;
        }

        // Handle Archive Features - Upgrade maxRetentionDays
        const archiveFeatures = grantedFeatures.filter(f =>
            f === Feature.ARCHIVE_5Y || f === Feature.ARCHIVE_10Y || f === Feature.LONG_TERM_ARCHIVE
        );

        if (archiveFeatures.length > 0) {
            // Get the maximum retention days from the granted features
            const maxGrantedRetention = Math.max(
                ...archiveFeatures.map(f => ARCHIVE_RETENTION_DAYS[f] || 0)
            );

            // Only upgrade if the new retention is higher than current
            if (maxGrantedRetention > tenant.maxRetentionDays) {
                updateData.maxRetentionDays = maxGrantedRetention;
                this.logger.log(`🗄️ Upgrading tenant ${tenantId} retention: ${tenant.maxRetentionDays} → ${maxGrantedRetention} days`);
            }
        }

        // Update tenant
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: updateData,
        });

        this.logger.log(`License ${normalizedCode} activated for tenant ${tenantId}. Features: ${newFeatures.join(', ')}`);

        const result: {
            success: boolean;
            features: string[];
            message: string;
            syncApiKey?: string;
        } = {
            success: true,
            features: newFeatures,
            message: `Licence activée. Modules débloqués: ${grantedFeatures.join(', ')}`,
        };

        // Include syncApiKey in response if AUTO_SYNC was activated
        if (syncApiKey) {
            result.syncApiKey = syncApiKey;
        }

        return result;
    }

    /**
     * Check if a tenant has a specific feature
     */
    async hasFeature(tenantId: string, feature: Feature): Promise<boolean> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { features: true },
        });

        if (!tenant) {
            return false;
        }

        return tenant.features.includes(feature);
    }

    /**
     * Get all features for a tenant
     */
    async getTenantFeatures(tenantId: string): Promise<string[]> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { features: true, licenseKey: true },
        });

        return tenant?.features || [];
    }

    /**
     * Get license info for frontend display
     */
    async getLicenseInfo(tenantId: string): Promise<{
        features: string[];
        licenseKey: string | null;
        syncApiKey: string | null;
        availableModules: { id: string; name: string; description: string; active: boolean }[];
    }> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { features: true, licenseKey: true, syncApiKey: true },
        });

        const features = tenant?.features || [];

        // Define all available modules
        const availableModules = [
            {
                id: Feature.AUTO_SYNC,
                name: 'Connecteur Windows (Auto-Sync)',
                description: "Automatise l'envoi des PDF depuis le serveur du Labo.",
                active: features.includes(Feature.AUTO_SYNC),
            },
            {
                id: Feature.LONG_TERM_ARCHIVE,
                name: 'Archivage Long Terme',
                description: 'Conservation des résultats au-delà de 30 jours.',
                active: features.includes(Feature.LONG_TERM_ARCHIVE),
            },
            {
                id: Feature.PRIORITY_SUPPORT,
                name: 'Support Prioritaire',
                description: 'Accès direct à notre équipe technique.',
                active: features.includes(Feature.PRIORITY_SUPPORT),
            },
        ];

        return {
            features,
            licenseKey: tenant?.licenseKey || null,
            syncApiKey: tenant?.syncApiKey || null,
            availableModules,
        };
    }
}
