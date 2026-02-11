import { PrismaClient, UserRole, TenantPlan, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...\n');
    const passwordHash = await bcrypt.hash('pass123', 10);

    // ═══════════════════════════════════════════
    // 1. TENANTS — Multi-plan demo data
    // ═══════════════════════════════════════════

    // --- STARTER Plan (Free) ---
    const demoLab = await prisma.tenant.upsert({
        where: { slug: 'demo-lab' },
        update: {},
        create: {
            name: 'Demo Lab',
            slug: 'demo-lab',
            structureType: 'PRIVATE_LAB',
            smsSenderId: 'L_DEMO',
            smsBalance: 100,
            address: 'Quartier Biyem-Assi, Yaoundé',
            city: 'Yaoundé',
            contactEmail: 'contact@demolab.cm',
            phoneNumber: '+237699000001',
            plan: TenantPlan.STARTER,
            maxRetentionDays: 30,
            configuredRetentionDays: 30,
            brandColor: '#3B82F6',
        },
    });
    console.log(`  ✅ Tenant STARTER: ${demoLab.name}`);

    // --- PREMIUM Plan ---
    const bioCenter = await prisma.tenant.upsert({
        where: { slug: 'biocenter' },
        update: {
            plan: TenantPlan.PREMIUM,
            features: ['WHATSAPP_BUSINESS', 'AUTO_SYNC', 'ANALYTICS_BI', 'CRITICAL_ALERTS'],
        },
        create: {
            name: 'BioCenter Douala',
            slug: 'biocenter',
            structureType: 'PRIVATE_LAB',
            smsSenderId: 'BIOCNTR',
            smsBalance: 500,
            address: '15 Rue de la Joie, Akwa, Douala',
            city: 'Douala',
            contactEmail: 'admin@biocenter.cm',
            billingEmail: 'comptabilite@biocenter.cm',
            phoneNumber: '+237677000002',
            niu: 'M087612340A',
            plan: TenantPlan.PREMIUM,
            maxRetentionDays: 365,
            configuredRetentionDays: 180,
            brandColor: '#059669',
            features: ['WHATSAPP_BUSINESS', 'AUTO_SYNC', 'ANALYTICS_BI', 'CRITICAL_ALERTS'],
            biologistPhone: '+237677000099',
            isAutoSyncEnabled: true,
            statsEnabled: true,
            prescribers: ['Dr. Nkoulou', 'Dr. Ekambi', 'Dr. Tchoumi'],
        },
    });
    console.log(`  ✅ Tenant PREMIUM: ${bioCenter.name}`);

    // --- ENTERPRISE Plan ---
    const chuyaounde = await prisma.tenant.upsert({
        where: { slug: 'chu-yaounde' },
        update: {
            plan: TenantPlan.ENTERPRISE,
            features: [
                'WHATSAPP_BUSINESS', 'AUTO_SYNC', 'ANALYTICS_BI', 'CRITICAL_ALERTS',
                'PATIENT_PORTAL', 'APPOINTMENTS', 'API_ADVANCED', 'LONG_TERM_ARCHIVE',
                'E_SIGNATURE', 'PATIENT_HISTORY', 'REALTIME_DASHBOARD', 'ADVANCED_REPORTING',
            ],
        },
        create: {
            name: 'CHU de Yaoundé',
            slug: 'chu-yaounde',
            structureType: 'PUBLIC_HOSPITAL',
            smsSenderId: 'CHUYAOUND',
            smsBalance: 2000,
            address: 'Avenue du Dr Jamot, Centre Administratif',
            city: 'Yaoundé',
            contactEmail: 'labo@chu-yaounde.cm',
            billingEmail: 'finances@chu-yaounde.cm',
            phoneNumber: '+237222234567',
            niu: 'P034567890B',
            rccm: 'YAO/2020/B/1234',
            plan: TenantPlan.ENTERPRISE,
            maxRetentionDays: 1825, // 5 years
            configuredRetentionDays: 1095, // 3 years
            brandColor: '#DC2626',
            features: [
                'WHATSAPP_BUSINESS', 'AUTO_SYNC', 'ANALYTICS_BI', 'CRITICAL_ALERTS',
                'PATIENT_PORTAL', 'APPOINTMENTS', 'API_ADVANCED', 'LONG_TERM_ARCHIVE',
                'E_SIGNATURE', 'PATIENT_HISTORY', 'REALTIME_DASHBOARD', 'ADVANCED_REPORTING',
            ],
            biologistPhone: '+237222234500',
            isAutoSyncEnabled: true,
            statsEnabled: true,
            isHomeSamplingEnabled: true,
            hl7IntegrationEnabled: true,
            prescribers: ['Pr. Atangana', 'Dr. Fotso', 'Dr. Mbarga', 'Dr. Kamga', 'Dr. Feugang'],
        },
    });
    console.log(`  ✅ Tenant ENTERPRISE: ${chuyaounde.name}`);

    // --- Clinique STARTER (inactive) ---
    const cliniqueBastos = await prisma.tenant.upsert({
        where: { slug: 'clinique-bastos' },
        update: {},
        create: {
            name: 'Clinique Bastos',
            slug: 'clinique-bastos',
            structureType: 'CLINIC',
            smsSenderId: 'CLBASTOS',
            smsBalance: 15,
            address: 'Quartier Bastos, Yaoundé',
            city: 'Yaoundé',
            contactEmail: 'info@clinique-bastos.cm',
            phoneNumber: '+237699111222',
            plan: TenantPlan.STARTER,
            maxRetentionDays: 30,
            configuredRetentionDays: 14,
            brandColor: '#8B5CF6',
        },
    });
    console.log(`  ✅ Tenant STARTER (Low SMS): ${cliniqueBastos.name}`);

    // --- LaboPharma PREMIUM ---
    const laboPharma = await prisma.tenant.upsert({
        where: { slug: 'labopharma' },
        update: {
            plan: TenantPlan.PREMIUM,
            features: ['WHATSAPP_BUSINESS', 'ANALYTICS_BI', 'PATIENT_PORTAL', 'APPOINTMENTS'],
        },
        create: {
            name: 'LaboPharma',
            slug: 'labopharma',
            structureType: 'PRIVATE_LAB',
            smsSenderId: 'LABOPHRM',
            smsBalance: 350,
            address: 'Rue du Marché, Bafoussam',
            city: 'Bafoussam',
            contactEmail: 'direction@labopharma.cm',
            phoneNumber: '+237699333444',
            plan: TenantPlan.PREMIUM,
            maxRetentionDays: 365,
            configuredRetentionDays: 90,
            brandColor: '#F59E0B',
            features: ['WHATSAPP_BUSINESS', 'ANALYTICS_BI', 'PATIENT_PORTAL', 'APPOINTMENTS'],
            statsEnabled: true,
            prescribers: ['Dr. Diallo', 'Dr. Simo'],
        },
    });
    console.log(`  ✅ Tenant PREMIUM: ${laboPharma.name}`);

    const allTenants = [demoLab, bioCenter, chuyaounde, cliniqueBastos, laboPharma];

    // ═══════════════════════════════════════════
    // 2. SUBSCRIPTIONS — Billing lifecycle demo
    // ═══════════════════════════════════════════
    console.log('\n📋 Creating subscriptions...');

    const subscriptionData = [
        { tenant: demoLab, plan: TenantPlan.STARTER, status: SubscriptionStatus.ACTIVE, price: 0 },
        { tenant: bioCenter, plan: TenantPlan.PREMIUM, status: SubscriptionStatus.ACTIVE, price: 49000 },
        { tenant: chuyaounde, plan: TenantPlan.ENTERPRISE, status: SubscriptionStatus.ACTIVE, price: 99000 },
        { tenant: cliniqueBastos, plan: TenantPlan.STARTER, status: SubscriptionStatus.TRIAL, price: 0 },
        { tenant: laboPharma, plan: TenantPlan.PREMIUM, status: SubscriptionStatus.ACTIVE, price: 49000 },
    ];

    for (const sub of subscriptionData) {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const trialEnd = sub.status === SubscriptionStatus.TRIAL
            ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
            : null;

        await prisma.subscription.upsert({
            where: { tenantId: sub.tenant.id },
            update: { plan: sub.plan, status: sub.status, pricePerMonth: sub.price },
            create: {
                tenantId: sub.tenant.id,
                plan: sub.plan,
                status: sub.status,
                pricePerMonth: sub.price,
                billingCycle: 'MONTHLY',
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                trialEndsAt: trialEnd,
            },
        });
        console.log(`  ✅ Subscription: ${sub.tenant.name} → ${sub.plan} (${sub.status})`);
    }

    // ═══════════════════════════════════════════
    // 3. USERS — All 10 roles represented
    // ═══════════════════════════════════════════
    console.log('\n👥 Creating users...');

    const usersConfig = [
        // Platform roles (no tenant)
        { email: 'admin@medlab.cm', firstName: 'Super', lastName: 'Admin', role: UserRole.SUPER_ADMIN, tenantId: null },
        { email: 'manager@medlab.cm', firstName: 'Sophie', lastName: 'Kamga', role: UserRole.PLATFORM_MANAGER, tenantId: null },
        { email: 'support@medlab.cm', firstName: 'Eric', lastName: 'Ndongo', role: UserRole.PLATFORM_SUPPORT, tenantId: null },
        { email: 'sales@medlab.cm', firstName: 'Ines', lastName: 'Fouda', role: UserRole.PLATFORM_SALES, tenantId: null },
        { email: 'compta@medlab.cm', firstName: 'Michel', lastName: 'Biya', role: UserRole.PLATFORM_ACCOUNTANT, tenantId: null },

        // Demo Lab (Starter) — minimal team
        { email: 'lab@medlab.cm', firstName: 'Lab', lastName: 'Manager', role: UserRole.LAB_ADMIN, tenantId: demoLab.id },
        { email: 'tech@medlab.cm', firstName: 'Technicien', lastName: 'Demo', role: UserRole.TECHNICIAN, tenantId: demoLab.id },

        // BioCenter (Premium) — mid-size team
        { email: 'admin@biocenter.cm', firstName: 'Marie', lastName: 'Nkoulou', role: UserRole.LAB_ADMIN, tenantId: bioCenter.id },
        { email: 'business@biocenter.cm', firstName: 'Jacques', lastName: 'Fopa', role: UserRole.BUSINESS_MANAGER, tenantId: bioCenter.id },
        { email: 'tech1@biocenter.cm', firstName: 'Alain', lastName: 'Tchatchoua', role: UserRole.TECHNICIAN, tenantId: bioCenter.id },
        { email: 'tech2@biocenter.cm', firstName: 'Brigitte', lastName: 'Fotso', role: UserRole.TECHNICIAN, tenantId: bioCenter.id },
        { email: 'reception@biocenter.cm', firstName: 'Claire', lastName: 'Mboua', role: UserRole.RECEPTIONIST, tenantId: bioCenter.id },

        // CHU Yaoundé (Enterprise) — full team
        { email: 'admin@chu-yaounde.cm', firstName: 'Pr. Albert', lastName: 'Atangana', role: UserRole.LAB_ADMIN, tenantId: chuyaounde.id },
        { email: 'manager@chu-yaounde.cm', firstName: 'Sandrine', lastName: 'Mvondo', role: UserRole.MANAGER, tenantId: chuyaounde.id },
        { email: 'business@chu-yaounde.cm', firstName: 'Paul', lastName: 'Essomba', role: UserRole.BUSINESS_MANAGER, tenantId: chuyaounde.id },
        { email: 'tech1@chu-yaounde.cm', firstName: 'François', lastName: 'Mbarga', role: UserRole.TECHNICIAN, tenantId: chuyaounde.id },
        { email: 'tech2@chu-yaounde.cm', firstName: 'Anne', lastName: 'Kamga', role: UserRole.TECHNICIAN, tenantId: chuyaounde.id },
        { email: 'tech3@chu-yaounde.cm', firstName: 'David', lastName: 'Feugang', role: UserRole.TECHNICIAN, tenantId: chuyaounde.id },
        { email: 'reception1@chu-yaounde.cm', firstName: 'Estelle', lastName: 'Ngo Bassa', role: UserRole.RECEPTIONIST, tenantId: chuyaounde.id },
        { email: 'reception2@chu-yaounde.cm', firstName: 'Jean-Marc', lastName: 'Tabi', role: UserRole.RECEPTIONIST, tenantId: chuyaounde.id },

        // Clinique Bastos (Starter — trial)
        { email: 'admin@clinique-bastos.cm', firstName: 'Dr. Patricia', lastName: 'Ewane', role: UserRole.LAB_ADMIN, tenantId: cliniqueBastos.id },
        { email: 'tech@clinique-bastos.cm', firstName: 'Serge', lastName: 'Nlend', role: UserRole.TECHNICIAN, tenantId: cliniqueBastos.id },

        // LaboPharma (Premium)
        { email: 'admin@labopharma.cm', firstName: 'Dr. Aminata', lastName: 'Diallo', role: UserRole.LAB_ADMIN, tenantId: laboPharma.id },
        { email: 'tech@labopharma.cm', firstName: 'Moussa', lastName: 'Simo', role: UserRole.TECHNICIAN, tenantId: laboPharma.id },
        { email: 'reception@labopharma.cm', firstName: 'Fatou', lastName: 'Ngatchou', role: UserRole.RECEPTIONIST, tenantId: laboPharma.id },
    ];

    const createdUsers: Record<string, any> = {};
    for (const u of usersConfig) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: { passwordHash, role: u.role, tenantId: u.tenantId, status: 'ACTIVE' },
            create: {
                email: u.email,
                passwordHash,
                firstName: u.firstName,
                lastName: u.lastName,
                role: u.role,
                tenantId: u.tenantId,
                status: 'ACTIVE',
            },
        });
        createdUsers[u.email] = user;
        console.log(`  ✅ User: ${u.email} (${u.role})`);
    }

    // ═══════════════════════════════════════════
    // 4. DOCUMENTS — Realistic medical results
    // ═══════════════════════════════════════════
    console.log('\n📄 Creating documents...');

    const documentConfigs = [
        // Demo Lab documents (3)
        {
            tenantId: demoLab.id,
            uploadedById: createdUsers['tech@medlab.cm'].id,
            docs: [
                { folderRef: 'DOS-2024-001', firstName: 'Jean', lastName: 'Dupont', phone: '+237699001122', email: 'jean.dupont@email.com', status: 'UPLOADED' },
                { folderRef: 'DOS-2024-002', firstName: 'Marie', lastName: 'Curie', phone: '+237677554433', email: 'marie@science.com', status: 'NOTIFIED' },
                { folderRef: 'DOS-2024-003', firstName: 'Paul', lastName: 'Martin', phone: '+237699887766', email: 'paul.martin@test.cm', status: 'DELIVERED' },
            ],
        },
        // BioCenter documents (6 — more volume for Premium)
        {
            tenantId: bioCenter.id,
            uploadedById: createdUsers['tech1@biocenter.cm'].id,
            docs: [
                { folderRef: 'BC-2026-001', firstName: 'Awa', lastName: 'Mballa', phone: '+237699100200', email: null, status: 'DELIVERED' },
                { folderRef: 'BC-2026-002', firstName: 'Emmanuel', lastName: 'Ngono', phone: '+237677200300', email: 'e.ngono@gmail.com', status: 'OPENED' },
                { folderRef: 'BC-2026-003', firstName: 'Florence', lastName: 'Tchoumi', phone: '+237699300400', email: null, status: 'NOTIFIED' },
                { folderRef: 'BC-2026-004', firstName: 'Georges', lastName: 'Messi', phone: '+237677400500', email: 'g.messi@ymail.com', status: 'DELIVERED' },
                { folderRef: 'BC-2026-005', firstName: 'Hélène', lastName: 'Onana', phone: '+237699500600', email: null, status: 'UPLOADED' },
                { folderRef: 'BC-2026-006', firstName: 'Ibrahim', lastName: 'Ndam', phone: '+237677600700', email: 'i.ndam@outlook.cm', status: 'FAILED' },
            ],
        },
        // CHU Yaoundé documents (10 — high volume for Enterprise)
        {
            tenantId: chuyaounde.id,
            uploadedById: createdUsers['tech1@chu-yaounde.cm'].id,
            docs: [
                { folderRef: 'CHU-2026-001', firstName: 'Alice', lastName: 'Beyala', phone: '+237699700800', email: 'a.beyala@chu.cm', status: 'DELIVERED' },
                { folderRef: 'CHU-2026-002', firstName: 'Bernard', lastName: 'Tsafack', phone: '+237677800900', email: null, status: 'OPENED' },
                { folderRef: 'CHU-2026-003', firstName: 'Cécile', lastName: 'Ngo Minyem', phone: '+237699901000', email: 'c.ngo@gmail.com', status: 'DELIVERED' },
                { folderRef: 'CHU-2026-004', firstName: 'Daniel', lastName: 'Mveng', phone: '+237677012345', email: null, status: 'NOTIFIED' },
                { folderRef: 'CHU-2026-005', firstName: 'Eugénie', lastName: 'Makong', phone: '+237699123456', email: 'e.makong@ymail.com', status: 'DELIVERED' },
                { folderRef: 'CHU-2026-006', firstName: 'François', lastName: 'Zogo', phone: '+237677234567', email: null, status: 'UPLOADED' },
                { folderRef: 'CHU-2026-007', firstName: 'Grâce', lastName: 'Amougou', phone: '+237699345678', email: 'g.amougou@chu.cm', status: 'OPENED' },
                { folderRef: 'CHU-2026-008', firstName: 'Henri', lastName: 'Ebode', phone: '+237677456789', email: null, status: 'DELIVERED' },
                { folderRef: 'CHU-2026-009', firstName: 'Isabelle', lastName: 'Nkembe', phone: '+237699567890', email: 'i.nkembe@outlook.cm', status: 'NOTIFIED' },
                { folderRef: 'CHU-2026-010', firstName: 'Jules', lastName: 'Owona', phone: '+237677678901', email: null, status: 'FAILED' },
            ],
        },
        // LaboPharma documents (4)
        {
            tenantId: laboPharma.id,
            uploadedById: createdUsers['tech@labopharma.cm'].id,
            docs: [
                { folderRef: 'LP-2026-001', firstName: 'Karine', lastName: 'Talla', phone: '+237699111333', email: null, status: 'DELIVERED' },
                { folderRef: 'LP-2026-002', firstName: 'Léon', lastName: 'Nguemo', phone: '+237677222444', email: 'l.nguemo@gmail.com', status: 'NOTIFIED' },
                { folderRef: 'LP-2026-003', firstName: 'Martine', lastName: 'Fotso', phone: '+237699333555', email: null, status: 'OPENED' },
                { folderRef: 'LP-2026-004', firstName: 'Narcisse', lastName: 'Biya', phone: '+237677444666', email: 'n.biya@ymail.cm', status: 'UPLOADED' },
            ],
        },
    ];

    for (const config of documentConfigs) {
        for (const doc of config.docs) {
            const exists = await prisma.document.findFirst({
                where: { folderRef: doc.folderRef, tenantId: config.tenantId },
            });

            if (!exists) {
                await prisma.document.create({
                    data: {
                        tenantId: config.tenantId,
                        folderRef: doc.folderRef,
                        fileKey: `${doc.folderRef.toLowerCase().replace(/-/g, '/')}.pdf`,
                        fileSize: Math.floor(Math.random() * 2000 + 200) * 1024,
                        patientFirstName: doc.firstName,
                        patientLastName: doc.lastName,
                        patientEmail: doc.email || '',
                        patientPhone: doc.phone,
                        status: doc.status as any,
                        uploadedById: config.uploadedById,
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    },
                });
                console.log(`  ✅ Document: ${doc.folderRef} (${doc.firstName} ${doc.lastName})`);
            } else {
                console.log(`  ⏭️  Document exists: ${doc.folderRef}`);
            }
        }
    }

    // ═══════════════════════════════════════════
    // 5. SUMMARY
    // ═══════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════');
    console.log('🎉 Seed complete!');
    console.log(`   🏢 ${allTenants.length} Tenants (1 Enterprise, 2 Premium, 2 Starter)`);
    console.log(`   👥 ${usersConfig.length} Users (all 10 roles represented)`);
    console.log(`   📄 ${documentConfigs.reduce((n, c) => n + c.docs.length, 0)} Documents`);
    console.log(`   📋 ${subscriptionData.length} Subscriptions`);
    console.log('   🔑 All passwords: pass123');
    console.log('═══════════════════════════════════════════\n');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
