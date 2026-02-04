import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

/**
 * Feature Flags for Premium Modules
 */
export enum Feature {
    // Automation
    AUTO_SYNC = 'AUTO_SYNC',                   // Windows Connector automation
    E_SIGNATURE = 'E_SIGNATURE',               // Electronic signature for results
    WORKFLOW_ENGINE = 'WORKFLOW_ENGINE',       // Automated workflow rules engine

    // Storage
    LONG_TERM_ARCHIVE = 'LONG_TERM_ARCHIVE',   // Extended data retention (generic)
    ARCHIVE_5Y = 'ARCHIVE_5Y',                 // 5-year archive (1825 days)
    ARCHIVE_10Y = 'ARCHIVE_10Y',               // 10-year archive (3650 days)

    // Analytics & BI
    ANALYTICS_BI = 'ANALYTICS_BI',             // Business Intelligence Dashboard
    REALTIME_DASHBOARD = 'REALTIME_DASHBOARD', // Real-time WebSocket dashboard
    ADVANCED_REPORTING = 'ADVANCED_REPORTING', // Custom PDF reports & templates
    RESULT_COMPARISON = 'RESULT_COMPARISON',   // Graphical result comparison

    // Patient Features
    PATIENT_PORTAL = 'PATIENT_PORTAL',         // Carnet de Santé patient
    PATIENT_HISTORY = 'PATIENT_HISTORY',       // Complete patient history
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
 * Features included in each subscription plan
 * STARTER: Basic features only (sending results, team management)
 * PREMIUM: + Analytics, Long-term archive, API Integration
 * ENTERPRISE: All features
 */
export const PLAN_FEATURES: Record<string, Feature[]> = {
    STARTER: [
        // No premium features - only basic functionality
    ],
    PREMIUM: [
        Feature.AUTO_SYNC,
        Feature.LONG_TERM_ARCHIVE,
        Feature.ANALYTICS_BI,
        Feature.API_ADVANCED,
        Feature.PRIORITY_SUPPORT,
    ],
    ENTERPRISE: [
        Feature.AUTO_SYNC,
        Feature.ARCHIVE_5Y,
        Feature.ARCHIVE_10Y,
        Feature.ANALYTICS_BI,
        Feature.PATIENT_PORTAL,
        Feature.APPOINTMENTS,
        Feature.CRITICAL_ALERTS,
        Feature.WHATSAPP_BUSINESS,
        Feature.MOBILE_MONEY,
        Feature.API_ADVANCED,
        Feature.UNLIMITED_TEAM,
        Feature.PRIORITY_SUPPORT,
    ],
};

/**
 * Navigation items that require specific features
 * Maps frontend routes to required features
 */
export const ROUTE_FEATURES: Record<string, Feature> = {
    '/dashboard/analytics': Feature.ANALYTICS_BI,
    '/dashboard/patient-portal': Feature.PATIENT_PORTAL,
    '/dashboard/appointments': Feature.APPOINTMENTS,
    '/dashboard/alerts': Feature.CRITICAL_ALERTS,
    '/dashboard/integration': Feature.API_ADVANCED,
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
            // === NEW PREMIUM MODULES ===
            // Automation - Premium
            {
                id: Feature.E_SIGNATURE,
                name: 'Signature Électronique',
                description: 'Signature électronique des résultats conforme aux normes médicales.',
                active: features.includes(Feature.E_SIGNATURE),
                category: 'automation',
            },
            {
                id: Feature.WORKFLOW_ENGINE,
                name: 'Moteur de Workflow',
                description: 'Automatisez vos processus avec un moteur de règles configurable sans code.',
                active: features.includes(Feature.WORKFLOW_ENGINE),
                category: 'automation',
            },
            // Analytics - Premium
            {
                id: Feature.REALTIME_DASHBOARD,
                name: 'Dashboard Temps Réel',
                description: 'Notifications push instantanées et tableau de bord en temps réel avec WebSockets.',
                active: features.includes(Feature.REALTIME_DASHBOARD),
                category: 'analytics',
            },
            {
                id: Feature.ADVANCED_REPORTING,
                name: 'Reporting Avancé',
                description: 'Génération de rapports PDF personnalisés avec votre branding.',
                active: features.includes(Feature.ADVANCED_REPORTING),
                category: 'analytics',
            },
            {
                id: Feature.RESULT_COMPARISON,
                name: 'Comparaison Graphique',
                description: 'Visualisez l\'évolution des résultats avec des graphiques comparatifs.',
                active: features.includes(Feature.RESULT_COMPARISON),
                category: 'analytics',
            },
            // Patient - Premium
            {
                id: Feature.PATIENT_HISTORY,
                name: 'Historique Patient Complet',
                description: 'Consultez l\'historique complet des résultats d\'un patient sur plusieurs années.',
                active: features.includes(Feature.PATIENT_HISTORY),
                category: 'patient',
            },
            // Support - Premium
            {
                id: Feature.PRIORITY_SUPPORT,
                name: 'Support Prioritaire',
                description: 'Accès prioritaire au support technique avec temps de réponse garanti.',
                active: features.includes(Feature.PRIORITY_SUPPORT),
                category: 'communication',
            },
        ];

        return {
            features,
            licenseKey: tenant?.licenseKey || null,
            syncApiKey: tenant?.syncApiKey || null,
            availableModules,
        };
    }

    /**
     * Get all accessible features for a tenant based on:
     * 1. Subscription plan (STARTER/PREMIUM/ENTERPRISE)
     * 2. Additional features unlocked via license codes
     */
    async getAccessibleFeatures(tenantId: string): Promise<{
        plan: string;
        planFeatures: string[];
        additionalFeatures: string[];
        allFeatures: string[];
        accessibleRoutes: string[];
    }> {
        // Get tenant with subscription
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                features: true,
                subscription: { select: { plan: true, status: true } }
            },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        // Get plan (default to STARTER if no subscription)
        const plan = tenant.subscription?.plan || 'STARTER';
        const planFeatures = PLAN_FEATURES[plan] || [];

        // Additional features from license codes
        const additionalFeatures = tenant.features || [];

        // Merge all features (no duplicates)
        const allFeatures = [...new Set([...planFeatures, ...additionalFeatures])];

        // Calculate accessible routes
        const accessibleRoutes = Object.entries(ROUTE_FEATURES)
            .filter(([_, feature]) => allFeatures.includes(feature))
            .map(([route]) => route);

        return {
            plan,
            planFeatures: planFeatures.map(f => f.toString()),
            additionalFeatures,
            allFeatures: allFeatures.map(f => f.toString()),
            accessibleRoutes,
        };
    }

    /**
     * Check if a tenant can access a specific route based on their plan and features
     */
    async canAccessRoute(tenantId: string, route: string): Promise<boolean> {
        const requiredFeature = ROUTE_FEATURES[route];

        // If route doesn't require a feature, allow access
        if (!requiredFeature) {
            return true;
        }

        const { allFeatures } = await this.getAccessibleFeatures(tenantId);
        return allFeatures.includes(requiredFeature);
    }
}
