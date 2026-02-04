import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import {
    ShieldCheck,
    Activity,
    Lock,
    MessageCircle,
    Calendar,
    BarChart3,
    Users,
    Bell,
    Package,
    Check,
    ArrowRight,
    Star,
    Shield,
    Clock,
    FileText,
    Zap,
    Award,
    Globe,
    ChevronLeft,
    ChevronRight,
    Play,
    Building2,
    Smartphone,
    FileSearch,
    History,
    GitCompare,
    PenTool,
    Wifi,
    CreditCard,
    Settings,
    ClipboardList,
    MonitorSmartphone,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ============================================
// Animation Variants
// ============================================
const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } }
};

const fadeInLeft = {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } }
};

const fadeInRight = {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15 }
    }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } }
};

// ============================================
// Animated Section Wrapper
// ============================================
function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={fadeInUp}
            transition={{ delay }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// Testimonials Data
// ============================================
const testimonials = [
    {
        quote: "MedLab Secure a transformé notre façon de communiquer avec les patients. La sécurité des données était notre priorité, et ils l'ont parfaitement compris.",
        author: "Dr. Marie Nkoulou",
        role: "Directrice, Laboratoire Mvolyé",
        initials: "MN",
        color: "from-blue-500 to-indigo-600"
    },
    {
        quote: "Depuis que nous utilisons MedLab, nos patients reçoivent leurs résultats en moins de 30 secondes. Le gain de temps est énorme pour notre équipe.",
        author: "Dr. Paul Ekambi",
        role: "Biologiste, Centre Médical Central",
        initials: "PE",
        color: "from-emerald-500 to-teal-600"
    },
    {
        quote: "L'intégration avec notre LIS existant s'est faite en quelques heures. Le support technique est exceptionnel.",
        author: "Jean-Claude Mbarga",
        role: "Responsable IT, Clinique du Lac",
        initials: "JM",
        color: "from-purple-500 to-violet-600"
    },
    {
        quote: "La conformité HDS nous a permis de rassurer nos patients sur la protection de leurs données. C'est un argument commercial majeur.",
        author: "Dr. Aminata Diallo",
        role: "Directrice Adjointe, LaboPharma",
        initials: "AD",
        color: "from-amber-500 to-orange-600"
    },
];

// ============================================
// Client Logos (placeholders with names)
// ============================================
const clientLogos = [
    { name: "Laboratoire Mvolyé", city: "Yaoundé" },
    { name: "Centre Médical Central", city: "Douala" },
    { name: "Clinique du Lac", city: "Yaoundé" },
    { name: "LaboPharma", city: "Bafoussam" },
    { name: "Polyclinique Bastos", city: "Yaoundé" },
    { name: "Centre Pasteur", city: "Garoua" },
    { name: "Hôpital Laquintinie", city: "Douala" },
    { name: "Laboratoire National", city: "Yaoundé" },
];

export function Landing() {
    const { t } = useTranslation();
    const [currentTestimonial, setCurrentTestimonial] = useState(0);

    // Auto-rotate testimonials
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 6000);
        return () => clearInterval(timer);
    }, []);

    const stats = [
        { value: '50,000+', label: 'Résultats envoyés' },
        { value: '120+', label: 'Laboratoires actifs' },
        { value: '99.9%', label: 'Disponibilité' },
        { value: '<30s', label: 'Temps de livraison' },
    ];

    const securityFeatures = [
        {
            icon: <Lock className="w-6 h-6" />,
            title: 'Chiffrement AES-256',
            desc: 'Toutes les données sont chiffrées en transit et au repos avec le standard bancaire.',
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: 'Hébergement HDS',
            desc: 'Infrastructure certifiée Hébergeur de Données de Santé en France.',
        },
        {
            icon: <Clock className="w-6 h-6" />,
            title: 'Suppression automatique',
            desc: 'Politique de rétention configurable par laboratoire (7-90 jours).',
        },
        {
            icon: <FileText className="w-6 h-6" />,
            title: 'Audit trail complet',
            desc: 'Traçabilité totale de chaque accès et action sur les documents.',
        },
    ];

    const features = [
        // Core Results Pipeline
        {
            icon: <FileSearch className="w-8 h-8" />,
            title: 'OCR Intelligent (IDP)',
            desc: 'Extraction automatique des données PDF : patient, référence, date. Configuration adaptable à chaque LIS.',
            color: 'from-cyan-500 to-teal-600',
            size: 'lg',
        },
        {
            icon: <MessageCircle className="w-8 h-8" />,
            title: 'WhatsApp Business',
            desc: 'Envoi sécurisé des résultats via WhatsApp avec lien unique crypté et OTP.',
            color: 'from-green-500 to-emerald-600',
            size: 'md',
        },
        {
            icon: <Smartphone className="w-8 h-8" />,
            title: 'SMS Multi-Provider',
            desc: 'Orange CM, CamPay, MSG91. Failover automatique pour une délivrabilité maximale.',
            color: 'from-orange-500 to-amber-600',
            size: 'md',
        },
        // Patient Engagement
        {
            icon: <Users className="w-8 h-8" />,
            title: 'Portail Patient',
            desc: 'Interface web sécurisée avec authentification OTP. Téléchargement des résultats et historique.',
            color: 'from-blue-500 to-indigo-600',
            size: 'xl',
        },
        {
            icon: <Calendar className="w-8 h-8" />,
            title: 'Prise de RDV en ligne',
            desc: 'Réservation directe des créneaux. Prélèvement à domicile ou en laboratoire.',
            color: 'from-violet-500 to-purple-600',
            size: 'md',
        },
        {
            icon: <History className="w-8 h-8" />,
            title: 'Historique Médical',
            desc: 'Analyse longitudinale des antécédents par patient. Suivi des tendances cliniques.',
            color: 'from-rose-500 to-pink-600',
            size: 'md',
        },
        // BI & Analytics
        {
            icon: <BarChart3 className="w-8 h-8" />,
            title: 'Business Intelligence',
            desc: 'Tableaux de bord analytiques : volume, pics d\'activité, top prescripteurs, KPIs financiers.',
            color: 'from-purple-500 to-violet-600',
            size: 'lg',
        },
        {
            icon: <Wifi className="w-8 h-8" />,
            title: 'Dashboard Temps Réel',
            desc: 'Push WebSockets pour les alertes critiques. Monitoring opérationnel instantané.',
            color: 'from-red-500 to-rose-600',
            size: 'md',
        },
        {
            icon: <GitCompare className="w-8 h-8" />,
            title: 'Comparaison Résultats',
            desc: 'Module de comparaison clinique jusqu\'à 10 examens. Suivi des tendances visuelles.',
            color: 'from-emerald-500 to-green-600',
            size: 'md',
        },
        // Automation & Workflows
        {
            icon: <Settings className="w-8 h-8" />,
            title: 'Workflow Engine',
            desc: 'Moteur de règles conditionnelles. Ex: Si Urgence + BI → Alerter Biologiste automatiquement.',
            color: 'from-slate-600 to-gray-700',
            size: 'md',
        },
        {
            icon: <PenTool className="w-8 h-8" />,
            title: 'Signatures Électroniques',
            desc: 'Verrouillage cryptographique HMAC-SHA256 pour la validité HDS des documents.',
            color: 'from-indigo-500 to-blue-600',
            size: 'md',
        },
        {
            icon: <Bell className="w-8 h-8" />,
            title: 'Alertes Critiques',
            desc: 'Notification immédiate des valeurs anormales au biologiste. Configurable par seuil.',
            color: 'from-red-600 to-rose-700',
            size: 'md',
        },
        // SaaS & Governance
        {
            icon: <Package className="w-8 h-8" />,
            title: 'Marketplace Modules',
            desc: 'Activez uniquement les fonctionnalités dont vous avez besoin. Facturation à l\'usage.',
            color: 'from-pink-500 to-rose-600',
            size: 'xl',
        },
        {
            icon: <CreditCard className="w-8 h-8" />,
            title: 'Paiement Mobile Money',
            desc: 'Intégration Orange Money, MTN MoMo, CamPay. Facturation automatique.',
            color: 'from-amber-500 to-yellow-600',
            size: 'md',
        },
        {
            icon: <MonitorSmartphone className="w-8 h-8" />,
            title: 'Sync Agent Windows',
            desc: 'Pont Desktop pour l\'ingestion automatique depuis les automates de laboratoire.',
            color: 'from-sky-500 to-cyan-600',
            size: 'md',
        },
        {
            icon: <ClipboardList className="w-8 h-8" />,
            title: 'Audit Trail Complet',
            desc: 'Traçabilité de 27 actions conforme HDS. Export pour inspection réglementaire.',
            color: 'from-teal-500 to-emerald-600',
            size: 'md',
        },
    ];

    const plans = [
        {
            name: 'STARTER',
            price: 'Gratuit',
            desc: 'Pour démarrer',
            features: ['100 SMS/mois', 'WhatsApp manuel', 'Support email'],
        },
        {
            name: 'PREMIUM',
            price: '49,000 XAF',
            desc: 'Le plus populaire',
            features: ['SMS illimités', 'WhatsApp Business', 'BI Dashboard', 'Support prioritaire'],
            popular: true,
        },
        {
            name: 'ENTERPRISE',
            price: '99,000 XAF',
            desc: 'Pour les grands labos',
            features: ['Multi-sites', 'API personnalisée', 'SLA garanti', 'Account manager'],
        },
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
            {/* Header */}
            <motion.header
                className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50"
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary font-bold text-xl">
                        <Activity className="w-6 h-6" />
                        <span>MedLab Secure</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-6 text-sm">
                        <a href="#security" className="text-slate-600 hover:text-primary transition-colors">Sécurité</a>
                        <a href="#features" className="text-slate-600 hover:text-primary transition-colors">Fonctionnalités</a>
                        <a href="#testimonials" className="text-slate-600 hover:text-primary transition-colors">Témoignages</a>
                        <a href="#pricing" className="text-slate-600 hover:text-primary transition-colors">Tarifs</a>
                        <Link to="/become-partner" className="text-slate-600 hover:text-primary transition-colors">Devenir Partenaire</Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/login"
                            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all hover:shadow-lg"
                        >
                            Connexion
                        </Link>
                    </div>
                </div>
            </motion.header>

            {/* Hero Section */}
            <section className="relative py-24 md:py-32 overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-100/50 to-transparent" />

                {/* Animated Circles */}
                <motion.div
                    className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity }}
                />
                <motion.div
                    className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"
                    animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        {/* Trust Badges */}
                        <motion.div
                            className="flex items-center justify-center gap-4 flex-wrap"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium border border-green-200">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Certifié HDS</span>
                            </div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium border border-blue-200">
                                <Lock className="w-4 h-4" />
                                <span>Conformité RGPD</span>
                            </div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium border border-purple-200">
                                <Award className="w-4 h-4" />
                                <span>Chiffrement AES-256</span>
                            </div>
                        </motion.div>

                        {/* Headline */}
                        <motion.h1
                            className="text-5xl md:text-7xl font-extrabold tracking-tight"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <span className="text-slate-900">Résultats Médicaux.</span>
                            <br />
                            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Sécurité Absolue.
                            </span>
                        </motion.h1>

                        <motion.p
                            className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            Transmettez les résultats d'analyses à vos patients par <strong>WhatsApp</strong> ou <strong>SMS</strong>,
                            avec un niveau de sécurité certifié <strong>Hébergeur de Données de Santé</strong>.
                        </motion.p>

                        {/* CTAs */}
                        <motion.div
                            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Link
                                to="/become-partner"
                                className="inline-flex h-14 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-lg font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105"
                            >
                                <Zap className="w-5 h-5 mr-2" />
                                Demander une démo
                            </Link>
                            <button
                                className="inline-flex h-14 items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-8 text-lg font-semibold text-slate-700 transition-all hover:border-primary hover:text-primary group"
                            >
                                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                Voir la vidéo
                            </button>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="py-12 bg-slate-900 text-white">
                <div className="container mx-auto px-4">
                    <motion.div
                        className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        {stats.map((stat, i) => (
                            <motion.div key={i} className="space-y-1" variants={scaleIn}>
                                <p className="text-3xl md:text-4xl font-bold text-white">{stat.value}</p>
                                <p className="text-slate-400 text-sm">{stat.label}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Clients Trust Section */}
            <section className="py-16 bg-slate-50 border-b">
                <div className="container mx-auto px-4">
                    <AnimatedSection className="text-center mb-10">
                        <p className="text-slate-500 font-medium mb-6">ILS NOUS FONT CONFIANCE</p>
                    </AnimatedSection>

                    <div className="overflow-hidden">
                        <motion.div
                            className="flex gap-8 items-center justify-center flex-wrap"
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                        >
                            {clientLogos.map((client, i) => (
                                <motion.div
                                    key={i}
                                    variants={scaleIn}
                                    className="flex items-center gap-3 px-6 py-4 bg-white rounded-xl border border-slate-200 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-800">{client.name}</p>
                                        <p className="text-sm text-slate-500">{client.city}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Security Showcase */}
            <section id="security" className="py-24 bg-gradient-to-b from-white to-slate-50">
                <div className="container mx-auto px-4">
                    <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6">
                            <Shield className="w-4 h-4" />
                            Sécurité de niveau bancaire
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Vos données patients,{' '}
                            <span className="text-primary">notre priorité absolue</span>
                        </h2>
                        <p className="text-xl text-slate-600">
                            Architecture conçue pour la protection maximale des données de santé sensibles.
                        </p>
                    </AnimatedSection>

                    <motion.div
                        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        {securityFeatures.map((feature, i) => (
                            <motion.div
                                key={i}
                                variants={fadeInUp}
                                className="group relative bg-white rounded-2xl p-8 border border-slate-200 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                            >
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Features Bento Grid */}
            <section id="features" className="py-24">
                <div className="container mx-auto px-4">
                    <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Tout ce dont votre labo a besoin
                        </h2>
                        <p className="text-xl text-slate-600">
                            Une plateforme complète avec des modules activables à la carte.
                        </p>
                    </AnimatedSection>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        {features.map((feature, i) => (
                            <motion.div
                                key={i}
                                variants={scaleIn}
                                whileHover={{ scale: 1.03, y: -5 }}
                                className={`group relative rounded-3xl p-8 text-white overflow-hidden transition-all duration-300 hover:shadow-2xl ${feature.size === 'xl' ? 'md:col-span-2' : feature.size === 'lg' ? 'md:row-span-2' : ''
                                    }`}
                            >
                                {/* Gradient Background */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color}`} />
                                <div className="absolute inset-0 bg-black/10" />

                                {/* Content */}
                                <div className="relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                                    <p className="text-white/90 text-lg leading-relaxed">{feature.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Testimonials Carousel */}
            <section id="testimonials" className="py-24 bg-slate-50">
                <div className="container mx-auto px-4">
                    <AnimatedSection className="text-center max-w-3xl mx-auto mb-12">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Ce que disent nos clients
                        </h2>
                    </AnimatedSection>

                    <div className="max-w-4xl mx-auto">
                        <div className="relative">
                            {/* Testimonial Card */}
                            <motion.div
                                key={currentTestimonial}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.5 }}
                                className="bg-white rounded-3xl p-10 shadow-xl"
                            >
                                <div className="flex justify-center gap-1 mb-6">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="w-6 h-6 text-amber-400 fill-amber-400" />
                                    ))}
                                </div>
                                <blockquote className="text-2xl md:text-3xl font-medium text-slate-700 mb-8 leading-relaxed text-center">
                                    "{testimonials[currentTestimonial].quote}"
                                </blockquote>
                                <div className="flex items-center justify-center gap-4">
                                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${testimonials[currentTestimonial].color} flex items-center justify-center text-white text-xl font-bold`}>
                                        {testimonials[currentTestimonial].initials}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-900">{testimonials[currentTestimonial].author}</p>
                                        <p className="text-slate-500">{testimonials[currentTestimonial].role}</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Navigation */}
                            <div className="flex justify-center gap-4 mt-8">
                                <button
                                    onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
                                    className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:border-primary transition-all"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <div className="flex items-center gap-2">
                                    {testimonials.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentTestimonial(i)}
                                            className={`w-3 h-3 rounded-full transition-all ${i === currentTestimonial ? 'bg-primary w-8' : 'bg-slate-300 hover:bg-slate-400'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)}
                                    className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:border-primary transition-all"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Preview */}
            <section id="pricing" className="py-24">
                <div className="container mx-auto px-4">
                    <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Tarification simple et transparente
                        </h2>
                        <p className="text-xl text-slate-600">
                            14 jours d'essai gratuit. Aucune carte bancaire requise.
                        </p>
                    </AnimatedSection>

                    <motion.div
                        className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        {plans.map((plan, i) => (
                            <motion.div
                                key={i}
                                variants={scaleIn}
                                whileHover={{ scale: 1.05, y: -10 }}
                                className={`relative rounded-3xl p-8 transition-all duration-300 ${plan.popular
                                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-500/30'
                                    : 'bg-white border-2 border-slate-200 hover:border-primary/30'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-amber-400 text-amber-900 text-sm font-bold rounded-full">
                                        Le plus populaire
                                    </div>
                                )}
                                <div className="mb-6">
                                    <p className={`text-sm font-medium mb-2 ${plan.popular ? 'text-blue-200' : 'text-slate-500'}`}>
                                        {plan.name}
                                    </p>
                                    <p className="text-4xl font-bold">{plan.price}</p>
                                    <p className={`text-sm ${plan.popular ? 'text-blue-200' : 'text-slate-500'}`}>/mois</p>
                                </div>
                                <p className={`mb-6 ${plan.popular ? 'text-blue-100' : 'text-slate-600'}`}>{plan.desc}</p>
                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((f, j) => (
                                        <li key={j} className="flex items-center gap-3">
                                            <Check className={`w-5 h-5 ${plan.popular ? 'text-green-300' : 'text-green-500'}`} />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    to="/become-partner"
                                    className={`block text-center py-3 rounded-xl font-semibold transition-all ${plan.popular
                                        ? 'bg-white text-blue-600 hover:bg-blue-50'
                                        : 'bg-slate-900 text-white hover:bg-slate-800'
                                        }`}
                                >
                                    Commencer
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>

                    <AnimatedSection className="text-center mt-10" delay={0.3}>
                        <Link to="/pricing" className="text-primary font-medium hover:underline">
                            Voir tous les détails des plans →
                        </Link>
                    </AnimatedSection>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
                {/* Animated background elements */}
                <motion.div
                    className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                />
                <motion.div
                    className="absolute bottom-10 right-10 w-80 h-80 bg-white/10 rounded-full blur-3xl"
                    animate={{ scale: [1.3, 1, 1.3], opacity: [0.1, 0.2, 0.1] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                />

                <div className="container mx-auto px-4 text-center relative z-10">
                    <AnimatedSection>
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            Prêt à sécuriser vos résultats ?
                        </h2>
                        <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
                            Rejoignez les laboratoires qui font confiance à MedLab Secure pour protéger les données de leurs patients.
                        </p>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Link
                                to="/become-partner"
                                className="inline-flex h-14 items-center justify-center rounded-xl bg-white px-10 text-lg font-semibold text-blue-600 shadow-lg transition-all hover:shadow-xl"
                            >
                                Demander une démo gratuite
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Link>
                        </motion.div>
                    </AnimatedSection>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-16 bg-slate-900 text-white">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div>
                            <div className="flex items-center gap-2 text-xl font-bold mb-4">
                                <Activity className="w-6 h-6" />
                                MedLab Secure
                            </div>
                            <p className="text-slate-400 mb-6">
                                La plateforme de confiance pour la transmission sécurisée des résultats médicaux.
                            </p>
                            <div className="flex gap-3">
                                <div className="px-3 py-1.5 bg-green-900/50 text-green-400 rounded text-xs font-medium">HDS</div>
                                <div className="px-3 py-1.5 bg-blue-900/50 text-blue-400 rounded text-xs font-medium">RGPD</div>
                                <div className="px-3 py-1.5 bg-purple-900/50 text-purple-400 rounded text-xs font-medium">ISO 27001</div>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Produit</h4>
                            <ul className="space-y-3 text-slate-400">
                                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                                <li><Link to="/pricing" className="hover:text-white transition-colors">Tarifs</Link></li>
                                <li><a href="#security" className="hover:text-white transition-colors">Sécurité</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Entreprise</h4>
                            <ul className="space-y-3 text-slate-400">
                                <li><a href="#" className="hover:text-white transition-colors">À propos</a></li>
                                <li><Link to="/become-partner" className="hover:text-white transition-colors">Devenir partenaire</Link></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Légal</h4>
                            <ul className="space-y-3 text-slate-400">
                                <li><Link to="/legal/mentions" className="hover:text-white transition-colors">Mentions légales</Link></li>
                                <li><Link to="/legal/privacy" className="hover:text-white transition-colors">Politique de confidentialité</Link></li>
                                <li><Link to="/legal/terms" className="hover:text-white transition-colors">CGU</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-500 text-sm">
                            © {new Date().getFullYear()} MedLab Secure. Tous droits réservés.
                        </p>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Globe className="w-4 h-4" />
                            <span>Cameroun • Afrique Centrale</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
