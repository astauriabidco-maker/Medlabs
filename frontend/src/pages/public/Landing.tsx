import { Link } from 'react-router-dom';
import {
    ShieldCheck,
    Activity,
    Lock,
    Phone,
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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Landing() {
    const { t } = useTranslation();

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
        {
            icon: <MessageCircle className="w-8 h-8" />,
            title: 'WhatsApp Business',
            desc: 'Envoi sécurisé des résultats via WhatsApp avec lien unique crypté.',
            color: 'from-green-500 to-emerald-600',
            size: 'md',
        },
        {
            icon: <Calendar className="w-8 h-8" />,
            title: 'Prise de RDV en ligne',
            desc: 'Patients réservent directement leurs créneaux. Prélèvement à domicile disponible.',
            color: 'from-blue-500 to-indigo-600',
            size: 'lg',
        },
        {
            icon: <BarChart3 className="w-8 h-8" />,
            title: 'Business Intelligence',
            desc: 'Tableaux de bord analytiques pour optimiser votre activité.',
            color: 'from-purple-500 to-violet-600',
            size: 'md',
        },
        {
            icon: <Users className="w-8 h-8" />,
            title: 'Gestion d\'équipe',
            desc: 'Rôles personnalisés et permissions granulaires pour chaque membre.',
            color: 'from-amber-500 to-orange-600',
            size: 'sm',
        },
        {
            icon: <Package className="w-8 h-8" />,
            title: 'Marketplace de modules',
            desc: 'Activez uniquement les fonctionnalités dont vous avez besoin.',
            color: 'from-pink-500 to-rose-600',
            size: 'xl',
        },
        {
            icon: <Bell className="w-8 h-8" />,
            title: 'Alertes critiques',
            desc: 'Notification immédiate des valeurs anormales au biologiste.',
            color: 'from-red-500 to-rose-600',
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
            <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary font-bold text-xl">
                        <Activity className="w-6 h-6" />
                        <span>MedLab Secure</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-6 text-sm">
                        <a href="#security" className="text-slate-600 hover:text-primary transition-colors">Sécurité</a>
                        <a href="#features" className="text-slate-600 hover:text-primary transition-colors">Fonctionnalités</a>
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
            </header>

            {/* Hero Section */}
            <section className="relative py-24 md:py-32 overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-100/50 to-transparent" />

                {/* Animated Circles */}
                <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        {/* Trust Badges */}
                        <div className="flex items-center justify-center gap-4 flex-wrap">
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
                        </div>

                        {/* Headline */}
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
                            <span className="text-slate-900">Résultats Médicaux.</span>
                            <br />
                            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Sécurité Absolue.
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                            Transmettez les résultats d'analyses à vos patients par <strong>WhatsApp</strong> ou <strong>SMS</strong>,
                            avec un niveau de sécurité certifié <strong>Hébergeur de Données de Santé</strong>.
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Link
                                to="/become-partner"
                                className="inline-flex h-14 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-lg font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105"
                            >
                                <Zap className="w-5 h-5 mr-2" />
                                Demander une démo
                            </Link>
                            <Link
                                to="/pricing"
                                className="inline-flex h-14 items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-8 text-lg font-semibold text-slate-700 transition-all hover:border-primary hover:text-primary"
                            >
                                Voir les tarifs
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="py-12 bg-slate-900 text-white">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {stats.map((stat, i) => (
                            <div key={i} className="space-y-1">
                                <p className="text-3xl md:text-4xl font-bold text-white">{stat.value}</p>
                                <p className="text-slate-400 text-sm">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Security Showcase */}
            <section id="security" className="py-24 bg-gradient-to-b from-slate-50 to-white">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
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
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {securityFeatures.map((feature, i) => (
                            <div
                                key={i}
                                className="group relative bg-white rounded-2xl p-8 border border-slate-200 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                            >
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Bento Grid */}
            <section id="features" className="py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Tout ce dont votre labo a besoin
                        </h2>
                        <p className="text-xl text-slate-600">
                            Une plateforme complète avec des modules activables à la carte.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {features.map((feature, i) => (
                            <div
                                key={i}
                                className={`group relative rounded-3xl p-8 text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${feature.size === 'xl' ? 'md:col-span-2' : feature.size === 'lg' ? 'md:row-span-2' : ''
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
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonial */}
            <section className="py-24 bg-slate-50">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="flex justify-center gap-1 mb-6">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-6 h-6 text-amber-400 fill-amber-400" />
                            ))}
                        </div>
                        <blockquote className="text-2xl md:text-3xl font-medium text-slate-700 mb-8 leading-relaxed">
                            "MedLab Secure a transformé notre façon de communiquer avec les patients.
                            La sécurité des données était notre priorité, et ils l'ont parfaitement compris."
                        </blockquote>
                        <div className="flex items-center justify-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                                DM
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-slate-900">Dr. Marie Nkoulou</p>
                                <p className="text-slate-500">Directrice, Laboratoire Mvolyé</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Preview */}
            <section id="pricing" className="py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Tarification simple et transparente
                        </h2>
                        <p className="text-xl text-slate-600">
                            14 jours d'essai gratuit. Aucune carte bancaire requise.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {plans.map((plan, i) => (
                            <div
                                key={i}
                                className={`relative rounded-3xl p-8 transition-all duration-300 hover:scale-105 ${plan.popular
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
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-10">
                        <Link to="/pricing" className="text-primary font-medium hover:underline">
                            Voir tous les détails des plans →
                        </Link>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Prêt à sécuriser vos résultats ?
                    </h2>
                    <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
                        Rejoignez les laboratoires qui font confiance à MedLab Secure pour protéger les données de leurs patients.
                    </p>
                    <Link
                        to="/become-partner"
                        className="inline-flex h-14 items-center justify-center rounded-xl bg-white px-10 text-lg font-semibold text-blue-600 shadow-lg transition-all hover:shadow-xl hover:scale-105"
                    >
                        Demander une démo gratuite
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
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
                                <li><a href="#" className="hover:text-white transition-colors">Mentions légales</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Politique de confidentialité</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">CGU</a></li>
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
