import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PricingPlan, PricingFeature } from '@prisma/client';

@Injectable()
export class PricingService {
    constructor(private prisma: PrismaService) { }

    // ==================
    // PLANS
    // ==================

    async findAllPlans(activeOnly = true): Promise<PricingPlan[]> {
        return this.prisma.pricingPlan.findMany({
            where: activeOnly ? { active: true } : undefined,
            orderBy: { sortOrder: 'asc' },
        });
    }

    async findPlanById(id: string): Promise<PricingPlan | null> {
        return this.prisma.pricingPlan.findUnique({ where: { id } });
    }

    async findPlanBySlug(slug: string): Promise<PricingPlan | null> {
        return this.prisma.pricingPlan.findUnique({ where: { slug } });
    }

    async createPlan(data: {
        name: string;
        slug: string;
        description?: string;
        price?: number;
        interval?: string;
        popular?: boolean;
        color?: string;
        buttonText?: string;
        buttonVariant?: string;
        sortOrder?: number;
        includedFeatures?: string[];
        featureLimits?: Record<string, number>;
    }): Promise<PricingPlan> {
        return this.prisma.pricingPlan.create({
            data: {
                name: data.name,
                slug: data.slug,
                description: data.description,
                price: data.price ?? 0,
                interval: data.interval ?? 'month',
                popular: data.popular ?? false,
                color: data.color ?? 'blue',
                buttonText: data.buttonText,
                buttonVariant: data.buttonVariant ?? 'default',
                sortOrder: data.sortOrder ?? 0,
                includedFeatures: data.includedFeatures ?? [],
                featureLimits: data.featureLimits ?? {},
            },
        });
    }

    async updatePlan(id: string, data: Partial<{
        name: string;
        slug: string;
        description: string;
        price: number;
        interval: string;
        popular: boolean;
        color: string;
        buttonText: string;
        buttonVariant: string;
        sortOrder: number;
        active: boolean;
        includedFeatures: string[];
        featureLimits: Record<string, number>;
    }>): Promise<PricingPlan> {
        return this.prisma.pricingPlan.update({
            where: { id },
            data,
        });
    }

    async deletePlan(id: string): Promise<PricingPlan> {
        return this.prisma.pricingPlan.delete({ where: { id } });
    }

    // ==================
    // FEATURES
    // ==================

    async findAllFeatures(activeOnly = true): Promise<PricingFeature[]> {
        return this.prisma.pricingFeature.findMany({
            where: activeOnly ? { active: true } : undefined,
            orderBy: { sortOrder: 'asc' },
        });
    }

    async findFeatureById(id: string): Promise<PricingFeature | null> {
        return this.prisma.pricingFeature.findUnique({ where: { id } });
    }

    async findFeatureByKey(key: string): Promise<PricingFeature | null> {
        return this.prisma.pricingFeature.findUnique({ where: { key } });
    }

    async createFeature(data: {
        name: string;
        key: string;
        description?: string;
        category?: string;
        icon?: string;
        isAddon?: boolean;
        addonPrice?: number;
        addonColor?: string;
        sortOrder?: number;
    }): Promise<PricingFeature> {
        return this.prisma.pricingFeature.create({ data });
    }

    async updateFeature(id: string, data: Partial<{
        name: string;
        key: string;
        description: string;
        category: string;
        icon: string;
        isAddon: boolean;
        addonPrice: number;
        addonColor: string;
        sortOrder: number;
        active: boolean;
    }>): Promise<PricingFeature> {
        return this.prisma.pricingFeature.update({
            where: { id },
            data,
        });
    }

    async deleteFeature(id: string): Promise<PricingFeature> {
        return this.prisma.pricingFeature.delete({ where: { id } });
    }

    // ==================
    // PUBLIC API (Optimized)
    // ==================

    async getPublicPricing() {
        const [plans, features] = await Promise.all([
            this.prisma.pricingPlan.findMany({
                where: { active: true },
                orderBy: { sortOrder: 'asc' },
            }),
            this.prisma.pricingFeature.findMany({
                where: { active: true },
                orderBy: { sortOrder: 'asc' },
            }),
        ]);

        const addons = features.filter((f: PricingFeature) => f.isAddon);
        const allFeatures = features.filter((f: PricingFeature) => !f.isAddon);

        return {
            plans: plans.map((plan: PricingPlan) => ({
                ...plan,
                features: allFeatures.filter((f: PricingFeature) =>
                    plan.includedFeatures.includes(f.key)
                ),
            })),
            addons,
            allFeatures,
        };
    }

    // ==================
    // SEEDING
    // ==================

    async seedInitialData() {
        const existingPlans = await this.prisma.pricingPlan.count();
        if (existingPlans > 0) {
            return { message: 'Data already seeded' };
        }

        // Create features first
        const features = await Promise.all([
            // Base features
            this.createFeature({ name: 'Upload manuel des résultats', key: 'MANUAL_UPLOAD', category: 'core', icon: 'Upload', sortOrder: 1 }),
            this.createFeature({ name: 'Notifications SMS', key: 'SMS_NOTIFICATIONS', category: 'communication', icon: 'MessageSquare', sortOrder: 2 }),
            this.createFeature({ name: 'WhatsApp Business', key: 'WHATSAPP_BUSINESS', category: 'communication', icon: 'MessageCircle', sortOrder: 3 }),
            this.createFeature({ name: 'Portail patient sécurisé', key: 'PATIENT_PORTAL', category: 'core', icon: 'Heart', sortOrder: 4 }),
            this.createFeature({ name: 'Membres d\'équipe', key: 'TEAM_MEMBERS', category: 'core', icon: 'Users', sortOrder: 5 }),
            this.createFeature({ name: 'Rétention des données', key: 'DATA_RETENTION', category: 'storage', icon: 'Database', sortOrder: 6 }),

            // Premium features
            this.createFeature({ name: 'Auto-Sync Windows (SIL)', key: 'AUTO_SYNC', category: 'integration', icon: 'RefreshCw', sortOrder: 10, isAddon: true, addonPrice: 25000, addonColor: 'from-blue-500 to-blue-600' }),
            this.createFeature({ name: 'Analytics & BI Dashboard', key: 'ANALYTICS_BI', category: 'analytics', icon: 'BarChart3', sortOrder: 11, isAddon: true, addonPrice: 20000, addonColor: 'from-green-500 to-green-600' }),
            this.createFeature({ name: 'Support prioritaire', key: 'PRIORITY_SUPPORT', category: 'support', icon: 'Headphones', sortOrder: 12 }),

            // Enterprise features
            this.createFeature({ name: 'Carnet de Santé Patient', key: 'HEALTH_RECORD', category: 'patient', icon: 'FileHeart', sortOrder: 20, isAddon: true, addonPrice: 30000, addonColor: 'from-rose-500 to-rose-600' }),
            this.createFeature({ name: 'Rendez-vous en ligne', key: 'APPOINTMENTS', category: 'patient', icon: 'Calendar', sortOrder: 21, isAddon: true, addonPrice: 15000, addonColor: 'from-orange-500 to-orange-600' }),
            this.createFeature({ name: 'Alertes valeurs critiques', key: 'CRITICAL_ALERTS', category: 'clinical', icon: 'AlertTriangle', sortOrder: 22, isAddon: true, addonPrice: 10000, addonColor: 'from-red-500 to-red-600' }),
            this.createFeature({ name: 'Paiements Mobile Money', key: 'MOBILE_MONEY', category: 'payment', icon: 'CreditCard', sortOrder: 23, isAddon: true, addonPrice: 20000, addonColor: 'from-yellow-500 to-yellow-600' }),
            this.createFeature({ name: 'API LIS/HL7 avancée', key: 'API_ADVANCED', category: 'integration', icon: 'Plug', sortOrder: 24, isAddon: true, addonPrice: 50000, addonColor: 'from-indigo-500 to-indigo-600' }),
            this.createFeature({ name: 'Archive 5 ans', key: 'ARCHIVE_5Y', category: 'storage', icon: 'Clock', sortOrder: 30, isAddon: true, addonPrice: 15000, addonColor: 'from-purple-500 to-purple-600' }),
            this.createFeature({ name: 'Équipe Illimitée', key: 'UNLIMITED_TEAM', category: 'core', icon: 'UsersRound', sortOrder: 31, isAddon: true, addonPrice: 15000, addonColor: 'from-pink-500 to-pink-600' }),
        ]);

        // Create plans
        await Promise.all([
            this.createPlan({
                name: 'Starter',
                slug: 'starter',
                description: 'Parfait pour démarrer',
                price: 0,
                color: 'gray',
                buttonText: 'Commencer gratuitement',
                buttonVariant: 'outline',
                sortOrder: 1,
                includedFeatures: ['MANUAL_UPLOAD', 'SMS_NOTIFICATIONS', 'WHATSAPP_BUSINESS', 'PATIENT_PORTAL', 'TEAM_MEMBERS', 'DATA_RETENTION'],
                featureLimits: { TEAM_MEMBERS: 3, DATA_RETENTION: 90 },
            }),
            this.createPlan({
                name: 'Premium',
                slug: 'premium',
                description: 'Pour laboratoires établis',
                price: 49000,
                popular: true,
                color: 'blue',
                buttonText: 'Souscrire maintenant',
                buttonVariant: 'default',
                sortOrder: 2,
                includedFeatures: ['MANUAL_UPLOAD', 'SMS_NOTIFICATIONS', 'WHATSAPP_BUSINESS', 'PATIENT_PORTAL', 'TEAM_MEMBERS', 'DATA_RETENTION', 'AUTO_SYNC', 'ANALYTICS_BI', 'PRIORITY_SUPPORT'],
                featureLimits: { TEAM_MEMBERS: 10, DATA_RETENTION: 365 },
            }),
            this.createPlan({
                name: 'Enterprise',
                slug: 'enterprise',
                description: 'Pour grands laboratoires',
                price: 99000,
                color: 'purple',
                buttonText: 'Contacter les ventes',
                buttonVariant: 'outline',
                sortOrder: 3,
                includedFeatures: ['MANUAL_UPLOAD', 'SMS_NOTIFICATIONS', 'WHATSAPP_BUSINESS', 'PATIENT_PORTAL', 'TEAM_MEMBERS', 'DATA_RETENTION', 'AUTO_SYNC', 'ANALYTICS_BI', 'PRIORITY_SUPPORT', 'HEALTH_RECORD', 'APPOINTMENTS', 'CRITICAL_ALERTS', 'MOBILE_MONEY', 'API_ADVANCED'],
                featureLimits: { TEAM_MEMBERS: -1, DATA_RETENTION: 3650 },
            }),
        ]);

        return { message: 'Initial data seeded successfully', featuresCount: features.length, plansCount: 3 };
    }
}
