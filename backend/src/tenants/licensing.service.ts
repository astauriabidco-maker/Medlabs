import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

/**
 * Feature Flags for Premium Modules
 */
export enum Feature {
    // Automation
    AUTO_SYNC = 'AUTO_SYNC',                   // Windows Connector automation

    // Storage
    LONG_TERM_ARCHIVE = 'LONG_TERM_ARCHIVE',   // Extended data retention (generic)
    ARCHIVE_5Y = 'ARCHIVE_5Y',                 // 5-year archive (1825 days)
    ARCHIVE_10Y = 'ARCHIVE_10Y',               // 10-year archive (3650 days)

    // Analytics & BI
    ANALYTICS_BI = 'ANALYTICS_BI',             // Business Intelligence Dashboard

    // Patient Features
    PATIENT_PORTAL = 'PATIENT_PORTAL',         // Carnet de Santé patient
    APPOINTMENTS = 'APPOINTMENTS',             // Online booking / Rendez-vous

    // Alerts & Notifications  
    CRITICAL_ALERTS = 'CRITICAL_ALERTS',       // Critical value alerts
    WHATSAPP_BUSINESS = 'WHATSAPP_BUSINESS',   // WhatsApp notifications

    // Payments
    MOBILE_MONEY = 'MOBILE_MONEY',             // Mobile Money payments (Orange/MTN/CamPay)

    // Integration
    API_ADVANCED = 'API_ADVANCED',             // Advanced LIS/HL7 integration

    // Team
    UNLIMITED_TEAM = 'UNLIMITED_TEAM',         // Unlimited team members

    // Support
    PRIORITY_SUPPORT = 'PRIORITY_SUPPORT',     // Priority support access
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
    // Individual modules
    'SYNC-2026-X': [Feature.AUTO_SYNC],
    'ARCH-2026-Y': [Feature.LONG_TERM_ARCHIVE],
    'ARCH-5Y-2026': [Feature.ARCHIVE_5Y],
    'ARCH-10Y-2026': [Feature.ARCHIVE_10Y],
    'BI-2026-X': [Feature.ANALYTICS_BI],
    'PORTAL-2026-X': [Feature.PATIENT_PORTAL],
    'RDV-2026-X': [Feature.APPOINTMENTS],
    'ALERT-2026-X': [Feature.CRITICAL_ALERTS],
    'WA-2026-X': [Feature.WHATSAPP_BUSINESS],
    'MOMO-2026-X': [Feature.MOBILE_MONEY],
    'API-2026-X': [Feature.API_ADVANCED],
    'TEAM-2026-X': [Feature.UNLIMITED_TEAM],

    // Bundles
    'PREMIUM-2026-Z': [Feature.AUTO_SYNC, Feature.LONG_TERM_ARCHIVE, Feature.PRIORITY_SUPPORT, Feature.ANALYTICS_BI],
    'ENTERPRISE-2026': [
        Feature.AUTO_SYNC, Feature.ARCHIVE_5Y, Feature.ANALYTICS_BI,
        Feature.PATIENT_PORTAL, Feature.APPOINTMENTS, Feature.CRITICAL_ALERTS,
        Feature.WHATSAPP_BUSINESS, Feature.MOBILE_MONEY, Feature.API_ADVANCED,
        Feature.UNLIMITED_TEAM, Feature.PRIORITY_SUPPORT
    ],

    // Demo codes for testing
    'DEMO-SYNC': [Feature.AUTO_SYNC],
    'DEMO-ALL': [Feature.AUTO_SYNC, Feature.LONG_TERM_ARCHIVE, Feature.ANALYTICS_BI, Feature.PATIENT_PORTAL, Feature.APPOINTMENTS, Feature.CRITICAL_ALERTS],
    'DEMO-ARCHIVE-5Y': [Feature.ARCHIVE_5Y],
    'DEMO-ARCHIVE-10Y': [Feature.ARCHIVE_10Y],
    'DEMO-FULL': Object.values(Feature), // All features for demo
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

        // Define all available modules with categories
        const availableModules = [
            // Automation
            {
                id: Feature.AUTO_SYNC,
                name: 'Auto-Sync Windows',
                description: "Synchronisation automatique avec votre SIL Windows. Téléversement automatique des résultats PDF.",
                active: features.includes(Feature.AUTO_SYNC),
                category: 'automation',
            },
            // Storage
            {
                id: Feature.LONG_TERM_ARCHIVE,
                name: 'Archive Longue Durée',
                description: 'Conservation des résultats jusqu\'à 5 ans. Idéal pour la conformité réglementaire.',
                active: features.includes(Feature.LONG_TERM_ARCHIVE),
                category: 'storage',
            },
            // Payments
            {
                id: Feature.MOBILE_MONEY,
                name: 'Paiements Mobile Money',
                description: 'Acceptez les paiements via Orange Money, MTN MoMo et CamPay.',
                active: features.includes(Feature.MOBILE_MONEY),
                category: 'payment',
            },
            // Communication - INCLUDED IN BASE OFFER
            {
                id: Feature.WHATSAPP_BUSINESS,
                name: 'WhatsApp Business',
                description: '✅ Inclus dans l\'offre de base. Envoyez les résultats directement sur WhatsApp.',
                active: true, // Always active - included in base offer
                category: 'communication',
                includedInBase: true,
            },
            // Analytics
            {
                id: Feature.ANALYTICS_BI,
                name: 'Analytics BI',
                description: 'Dashboard de Business Intelligence avec KPIs, graphiques et analyses.',
                active: features.includes(Feature.ANALYTICS_BI),
                category: 'analytics',
            },
            // Patient Features
            {
                id: Feature.PATIENT_PORTAL,
                name: 'Carnet de Santé Patient',
                description: 'Portail patient complet avec historique des résultats et suivi de santé.',
                active: features.includes(Feature.PATIENT_PORTAL),
                category: 'patient',
            },
            {
                id: Feature.APPOINTMENTS,
                name: 'Rendez-vous en Ligne',
                description: 'Système de prise de rendez-vous en ligne avec rappels automatiques.',
                active: features.includes(Feature.APPOINTMENTS),
                category: 'patient',
            },
            // Alerts
            {
                id: Feature.CRITICAL_ALERTS,
                name: 'Alertes Critiques',
                description: 'Notifications immédiates pour les valeurs critiques détectées.',
                active: features.includes(Feature.CRITICAL_ALERTS),
                category: 'alerts',
            },
            // Integration
            {
                id: Feature.API_ADVANCED,
                name: 'API LIS Avancée',
                description: 'Intégration bidirectionnelle HL7/FHIR avec votre système de laboratoire.',
                active: features.includes(Feature.API_ADVANCED),
                category: 'integration',
            },
            // Team
            {
                id: Feature.UNLIMITED_TEAM,
                name: 'Équipe Illimitée',
                description: 'Ajoutez un nombre illimité de techniciens et utilisateurs.',
                active: features.includes(Feature.UNLIMITED_TEAM),
                category: 'team',
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
