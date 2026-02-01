import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Activity,
    Building2,
    Mail,
    Phone,
    User,
    MapPin,
    FileText,
    CheckCircle,
    Loader2,
    ArrowLeft,
    Sparkles,
    Shield,
    Zap
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3005';

interface FormData {
    laboratoryName: string;
    contactName: string;
    email: string;
    phone: string;
    city: string;
    estimatedVolume: string;
    message: string;
}

export function BecomePartner() {
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSuccess, setIsSuccess] = React.useState(false);
    const [error, setError] = React.useState('');

    const [form, setForm] = React.useState<FormData>({
        laboratoryName: '',
        contactName: '',
        email: '',
        phone: '',
        city: '',
        estimatedVolume: '',
        message: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch(`${API_BASE}/partner-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'Erreur lors de l\'envoi');
            }

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || t('errors.failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('partner.success.title')}</h1>
                    <p className="text-slate-600">{t('partner.success.message')}</p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('partner.success.backHome')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-primary font-bold text-xl">
                        <Activity className="w-6 h-6" />
                        <span>MedLab Secure</span>
                    </Link>
                    <Link
                        to="/login"
                        className="text-sm text-slate-600 hover:text-primary transition-colors"
                    >
                        {t('partner.alreadyPartner')}
                    </Link>
                </div>
            </header>

            <div className="container mx-auto px-4 py-12">
                <div className="max-w-5xl mx-auto">
                    {/* Hero */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                            <Sparkles className="w-4 h-4" />
                            {t('partner.badge')}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
                            {t('partner.title')}
                        </h1>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            {t('partner.subtitle')}
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-5 gap-8">
                        {/* Benefits */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-xl border p-6 shadow-sm">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    {t('partner.benefits.security.title')}
                                </h3>
                                <p className="text-slate-600 text-sm">{t('partner.benefits.security.desc')}</p>
                            </div>
                            <div className="bg-white rounded-xl border p-6 shadow-sm">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                    {t('partner.benefits.speed.title')}
                                </h3>
                                <p className="text-slate-600 text-sm">{t('partner.benefits.speed.desc')}</p>
                            </div>
                            <div className="bg-white rounded-xl border p-6 shadow-sm">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    {t('partner.benefits.compliance.title')}
                                </h3>
                                <p className="text-slate-600 text-sm">{t('partner.benefits.compliance.desc')}</p>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="lg:col-span-3">
                            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border shadow-lg p-8 space-y-6">
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" />
                                    {t('partner.form.title')}
                                </h2>

                                {error && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">{t('partner.form.labName')} *</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                            <input
                                                type="text"
                                                name="laboratoryName"
                                                required
                                                value={form.laboratoryName}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                                placeholder="Laboratoire ABC"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">{t('partner.form.contactName')} *</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                            <input
                                                type="text"
                                                name="contactName"
                                                required
                                                value={form.contactName}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                                placeholder="Dr. Jean Dupont"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">{t('partner.form.email')} *</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                value={form.email}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                                placeholder="contact@labo.cm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">{t('partner.form.phone')} *</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                            <input
                                                type="tel"
                                                name="phone"
                                                required
                                                value={form.phone}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                                placeholder="+237 6XX XXX XXX"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">{t('partner.form.city')} *</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                            <input
                                                type="text"
                                                name="city"
                                                required
                                                value={form.city}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                                placeholder="Douala, Yaoundé..."
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">{t('partner.form.volume')}</label>
                                        <select
                                            name="estimatedVolume"
                                            value={form.estimatedVolume}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                        >
                                            <option value="">{t('partner.form.volumePlaceholder')}</option>
                                            <option value="1-50">1 - 50 {t('partner.form.volumePerDay')}</option>
                                            <option value="51-200">51 - 200 {t('partner.form.volumePerDay')}</option>
                                            <option value="201-500">201 - 500 {t('partner.form.volumePerDay')}</option>
                                            <option value="500+">500+ {t('partner.form.volumePerDay')}</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">{t('partner.form.message')}</label>
                                    <textarea
                                        name="message"
                                        value={form.message}
                                        onChange={handleChange}
                                        rows={4}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                                        placeholder={t('partner.form.messagePlaceholder')}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                                    {isSubmitting ? t('common.loading') : t('partner.form.submit')}
                                </button>

                                <p className="text-xs text-slate-500 text-center">
                                    {t('partner.form.privacy')}
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
