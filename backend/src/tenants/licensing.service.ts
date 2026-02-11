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
 * Module Pricing (in XAF FCFA / month)
 * Used by Marketplace to display prices and by license generation
 */
export const MODULE_PRICING: Record<string, { price: number; label: string }> = {
    [Feature.AUTO_SYNC]: { price: 15000, label: 'Auto-Sync Windows' },
    [Feature.LONG_TERM_ARCHIVE]: { price: 10000, label: 'Archive Longue Durée' },
    [Feature.ARCHIVE_5Y]: { price: 20000, label: 'Archive 5 ans' },
    [Feature.ARCHIVE_10Y]: { price: 35000, label: 'Archive 10 ans' },
    [Feature.ANALYTICS_BI]: { price: 15000, label: 'Analytics BI' },
    [Feature.REALTIME_DASHBOARD]: { price: 20000, label: 'Dashboard Temps Réel' },
    [Feature.ADVANCED_REPORTING]: { price: 12000, label: 'Reporting Avancé' },
    [Feature.RESULT_COMPARISON]: { price: 8000, label: 'Comparaison Graphique' },
    [Feature.PATIENT_PORTAL]: { price: 20000, label: 'Carnet de Santé Patient' },
    [Feature.PATIENT_HISTORY]: { price: 10000, label: 'Historique Patient' },
    [Feature.APPOINTMENTS]: { price: 15000, label: 'Rendez-vous en Ligne' },
    [Feature.CRITICAL_ALERTS]: { price: 10000, label: 'Alertes Critiques' },
    [Feature.WHATSAPP_BUSINESS]: { price: 0, label: 'WhatsApp Business' },     // Inclus
    [Feature.MOBILE_MONEY]: { price: 10000, label: 'Paiements Mobile Money' },
    [Feature.API_ADVANCED]: { price: 25000, label: 'API LIS Avancée' },
    [Feature.UNLIMITED_TEAM]: { price: 15000, label: 'Équipe Illimitée' },
    [Feature.E_SIGNATURE]: { price: 20000, label: 'Signature Électronique' },
    [Feature.WORKFLOW_ENGINE]: { price: 25000, label: 'Moteur de Workflow' },
    [Feature.PRIORITY_SUPPORT]: { price: 15000, label: 'Support Prioritaire' },
};

/**
 * Plan pricing (in XAF FCFA / month)
 */
export const PLAN_PRICING: Record<string, { price: number; label: string }> = {
    STARTER: { price: 0, label: 'Starter (Gratuit)' },
    PREMIUM: { price: 49000, label: 'Premium' },
    ENTERPRISE: { price: 99000, label: 'Enterprise' },
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

        // 1. Check DB license first
        let grantedFeatures: Feature[] | string[] | undefined;
        const dbLicense = await this.prisma.license.findUnique({
            where: { code: normalizedCode },
        });

        if (dbLicense) {
            if (dbLicense.status === 'USED') {
                throw new BadRequestException('Ce code de licence a déjà été utilisé');
            }
            // DB license can have a single feature or multiple (stored as comma-separated)
            grantedFeatures = dbLicense.feature.includes(',')
                ? dbLicense.feature.split(',').map(f => f.trim()) as Feature[]
                : [dbLicense.feature as Feature];
        } else {
            // 2. Fallback to hardcoded codes (backward compatibility)
            grantedFeatures = LICENSE_CODES[normalizedCode];
        }

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
            syncApiKey = tenant.syncApiKey;
        }

        // Handle Archive Features - Upgrade maxRetentionDays
        const archiveFeatures = grantedFeatures.filter(f =>
            f === Feature.ARCHIVE_5Y || f === Feature.ARCHIVE_10Y || f === Feature.LONG_TERM_ARCHIVE
        );

        if (archiveFeatures.length > 0) {
            const maxGrantedRetention = Math.max(
                ...archiveFeatures.map(f => ARCHIVE_RETENTION_DAYS[f] || 0)
            );
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

        // Mark DB license as used
        if (dbLicense) {
            await this.prisma.license.update({
                where: { id: dbLicense.id },
                data: {
                    status: 'USED',
                    usedByTenantId: tenantId,
                    usedAt: new Date(),
                },
            });
        }

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
        currentPlan: string;
        planPricing: Record<string, { price: number; label: string }>;
        modulePricing: Record<string, { price: number; label: string }>;
    }> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                features: true,
                licenseKey: true,
                syncApiKey: true,
                plan: true,
                subscription: { select: { plan: true, status: true } },
            },
        });

        // Merge plan features + individual tenant features
        const currentPlan = tenant?.subscription?.plan || tenant?.plan || 'STARTER';
        const planFeatures = PLAN_FEATURES[currentPlan] || [];
        const tenantFeatures = tenant?.features || [];
        const features = [...new Set([...planFeatures, ...tenantFeatures])];

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
            currentPlan,
            planPricing: PLAN_PRICING,
            modulePricing: MODULE_PRICING,
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
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                features: true,
                plan: true,
                subscription: { select: { plan: true, status: true } }
            },
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        const plan = tenant.subscription?.plan || tenant.plan || 'STARTER';
        const planFeatures = PLAN_FEATURES[plan] || [];
        const additionalFeatures = tenant.features || [];
        const allFeatures = [...new Set([...planFeatures, ...additionalFeatures])];

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
     * Check if a tenant can access a specific route
     */
    async canAccessRoute(tenantId: string, route: string): Promise<boolean> {
        const requiredFeature = ROUTE_FEATURES[route];
        if (!requiredFeature) return true;
        const { allFeatures } = await this.getAccessibleFeatures(tenantId);
        return allFeatures.includes(requiredFeature);
    }

    // ===================================================================
    // LICENSE CODE MANAGEMENT (Super Admin)
    // ===================================================================

    /**
     * Generate a new license code in DB
     */
    async generateLicenseCode(data: {
        features: string[];
        generatedBy: string;
        tenantId?: string; // Optional: pre-assign to a tenant
        note?: string;
    }): Promise<{ code: string; id: string }> {
        // Generate unique code: PREFIX-XXXX-XXXX
        const prefix = data.features.length === 1
            ? data.features[0].substring(0, 4).toUpperCase()
            : 'BNDL';
        const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
        const code = `${prefix}-${randomPart.substring(0, 4)}-${randomPart.substring(4)}`;

        const license = await this.prisma.license.create({
            data: {
                code,
                feature: data.features.join(','),
                status: 'AVAILABLE',
                generatedBy: data.generatedBy,
                ...(data.tenantId ? { usedByTenantId: data.tenantId } : {}),
            },
        });

        if (data.tenantId) {
            const tenant = await this.prisma.tenant.findUnique({ where: { id: data.tenantId }, select: { name: true } });
            this.logger.log(`🔑 License code generated: ${code} for features: ${data.features.join(', ')} → pré-attribuée à "${tenant?.name}"`);
        } else {
            this.logger.log(`🔑 License code generated: ${code} for features: ${data.features.join(', ')}`);
        }

        return { code: license.code, id: license.id };
    }

    /**
     * List all license codes (Super Admin)
     */
    async listLicenseCodes(filters?: {
        status?: string;
        feature?: string;
    }): Promise<any[]> {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.feature) where.feature = { contains: filters.feature };

        return this.prisma.license.findMany({
            where,
            include: {
                usedByTenant: { select: { id: true, name: true, slug: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }

    /**
     * Revoke a license code
     */
    async revokeLicenseCode(licenseId: string): Promise<void> {
        const license = await this.prisma.license.findUnique({
            where: { id: licenseId },
        });

        if (!license) throw new NotFoundException('License not found');

        // If already used, remove the feature from the tenant
        if (license.status === 'USED' && license.usedByTenantId) {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: license.usedByTenantId },
                select: { features: true },
            });

            if (tenant) {
                const featuresToRemove = license.feature.split(',').map(f => f.trim());
                const updatedFeatures = tenant.features.filter(f => !featuresToRemove.includes(f));

                await this.prisma.tenant.update({
                    where: { id: license.usedByTenantId },
                    data: { features: updatedFeatures },
                });

                this.logger.warn(`⚠️ Features ${featuresToRemove.join(', ')} revoked from tenant ${license.usedByTenantId}`);
            }
        }

        await this.prisma.license.delete({
            where: { id: licenseId },
        });

        this.logger.log(`🗑️ License ${license.code} deleted`);
    }

    // ===================================================================
    // PLAN UPGRADE
    // ===================================================================

    /**
     * Upgrade a tenant's plan
     */
    async upgradePlan(tenantId: string, newPlan: string): Promise<{
        success: boolean;
        plan: string;
        features: string[];
        message: string;
    }> {
        const validPlans = ['STARTER', 'PREMIUM', 'ENTERPRISE'];
        if (!validPlans.includes(newPlan)) {
            throw new BadRequestException(`Plan invalide. Plans disponibles: ${validPlans.join(', ')}`);
        }

        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { subscription: true },
        });

        if (!tenant) throw new NotFoundException('Tenant not found');

        const planFeatures = PLAN_FEATURES[newPlan] || [];
        const existingFeatures = tenant.features || [];
        const allFeatures = [...new Set([...existingFeatures, ...planFeatures])];
        const pricing = PLAN_PRICING[newPlan];

        // Update tenant plan
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                plan: newPlan as any,
                features: allFeatures,
            },
        });

        // Create or update subscription
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        if (tenant.subscription) {
            await this.prisma.subscription.update({
                where: { id: tenant.subscription.id },
                data: {
                    plan: newPlan as any,
                    status: newPlan === 'STARTER' ? 'TRIAL' : 'ACTIVE',
                    pricePerMonth: pricing.price,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                },
            });
        } else {
            await this.prisma.subscription.create({
                data: {
                    tenantId,
                    plan: newPlan as any,
                    status: newPlan === 'STARTER' ? 'TRIAL' : 'ACTIVE',
                    pricePerMonth: pricing.price,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                },
            });
        }

        this.logger.log(`📈 Tenant ${tenantId} upgraded to ${newPlan} plan`);

        return {
            success: true,
            plan: newPlan,
            features: allFeatures,
            message: `Plan mis à jour vers ${pricing.label}. ${planFeatures.length} modules inclus.`,
        };
    }

    // ===================================================================
    // MODULE REQUEST (Contact Sales Flow)
    // ===================================================================

    /**
     * Create a module request (tenant wants a module but doesn't have a license)
     */
    async requestModule(tenantId: string, data: {
        moduleId: string;
        message?: string;
        userId: string;
    }): Promise<{ success: boolean; message: string }> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true, contactEmail: true },
        });

        if (!tenant) throw new NotFoundException('Tenant not found');

        const pricing = MODULE_PRICING[data.moduleId];
        if (!pricing) throw new BadRequestException('Module inconnu');

        // Create a system alert for the sales team
        await this.prisma.systemAlert.create({
            data: {
                type: 'PAYMENT_OVERDUE', // Reuse closest alert type
                severity: 'INFO',
                title: `Demande module: ${pricing.label}`,
                message: `Le laboratoire "${tenant.name}" souhaite activer le module "${pricing.label}" (${pricing.price.toLocaleString()} FCFA/mois). ${data.message || ''}`,
                tenantId,
                userId: data.userId,
                metadata: {
                    type: 'MODULE_REQUEST',
                    moduleId: data.moduleId,
                    moduleLabel: pricing.label,
                    modulePrice: pricing.price,
                    contactEmail: tenant.contactEmail,
                },
            },
        });

        this.logger.log(`📩 Module request from tenant ${tenantId}: ${data.moduleId}`);

        return {
            success: true,
            message: `Votre demande pour le module "${pricing.label}" a été envoyée à notre équipe commerciale. Nous vous contacterons sous 24h.`,
        };
    }
}
