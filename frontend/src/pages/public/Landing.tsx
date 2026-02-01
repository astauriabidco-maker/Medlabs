
import { Link } from 'react-router-dom';
import { ShieldCheck, Activity, Lock, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Landing() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary font-bold text-xl">
                        <Activity className="w-6 h-6" />
                        <span>MedLab Secure</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/become-partner"
                            className="text-slate-600 hover:text-primary px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            {t('landing.header.becomePartner')}
                        </Link>
                        <Link
                            to="/login"
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                        >
                            {t('landing.header.login')}
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-gradient-to-b from-blue-50 to-white">
                <div className="max-w-3xl space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-primary text-sm font-medium">
                        <ShieldCheck className="w-4 h-4" />
                        <span>{t('landing.hero.badge')}</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
                        {t('landing.hero.title')} <br />
                        <span className="text-primary">{t('landing.hero.subtitle')}</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                        {t('landing.hero.desc')}
                    </p>
                    <div className="pt-4">
                        <Link
                            to="/login"
                            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-lg font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105"
                        >
                            {t('landing.hero.cta')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Patient Info Section */}
            <section className="py-20 bg-slate-50 border-y">
                <div className="container mx-auto px-4 max-w-4xl text-center">
                    <h2 className="text-3xl font-bold mb-8">{t('landing.patient.title')}</h2>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border flex flex-col md:flex-row items-center gap-8 text-left">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-primary">
                            <Phone className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">{t('landing.patient.cardTitle')}</h3>
                            <p className="text-slate-600">
                                {t('landing.patient.cardDesc')}
                            </p>
                            <p className="text-sm text-slate-500">
                                {t('landing.patient.cardFooter')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 container mx-auto px-4">
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="p-6 rounded-xl border bg-white hover:shadow-lg transition-shadow">
                        <ShieldCheck className="w-10 h-10 text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">{t('landing.features.security.title')}</h3>
                        <p className="text-slate-600">{t('landing.features.security.desc')}</p>
                    </div>
                    <div className="p-6 rounded-xl border bg-white hover:shadow-lg transition-shadow">
                        <Activity className="w-10 h-10 text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">{t('landing.features.delivery.title')}</h3>
                        <p className="text-slate-600">{t('landing.features.delivery.desc')}</p>
                    </div>
                    <div className="p-6 rounded-xl border bg-white hover:shadow-lg transition-shadow">
                        <Lock className="w-10 h-10 text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">{t('landing.features.expiration.title')}</h3>
                        <p className="text-slate-600">{t('landing.features.expiration.desc')}</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t text-center text-slate-500 text-sm">
                <div className="container mx-auto px-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <p>&copy; {new Date().getFullYear()} MedLab Secure. {t('landing.footer.rights')}</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-primary">{t('landing.footer.legal')}</a>
                        <a href="#" className="hover:text-primary">{t('landing.footer.privacy')}</a>
                        <a href="#" className="hover:text-primary">{t('landing.footer.support')}</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
