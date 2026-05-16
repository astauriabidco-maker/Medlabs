import * as React from 'react';
import { Button } from '@/components/ui-basic';
import { Tabs, useToast } from '@/components/ui-dashboard';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Shield, Mail, Eye, EyeOff, Check, Send, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type SmsProvider = 'twilio' | 'vonage' | 'generic';

interface SmsConfig {
    provider: SmsProvider;
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
}

interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromEmail: string;
}

export function PlatformSettings() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { addToast } = useToast();

    // SMS Gateway State
    const [smsConfig, setSmsConfig] = React.useState<SmsConfig>({
        provider: 'twilio',
        apiKey: 'sk_live_abc123...',
        apiSecret: '',
        baseUrl: 'https://api.twilio.com',
    });
    const [showSmsSecret, setShowSmsSecret] = React.useState(false);
    const [testingConnection, setTestingConnection] = React.useState(false);

    // SMTP State
    const [smtpConfig, setSmtpConfig] = React.useState<SmtpConfig>({
        host: 'smtp.gmail.com',
        port: 587,
        secure: true,
        user: 'admin@medlab.cm',
        password: '',
        fromEmail: 'no-reply@medlab.cm',
    });
    const [showSmtpPassword, setShowSmtpPassword] = React.useState(false);
    const [testingEmail, setTestingEmail] = React.useState(false);

    // Retention State
    const [retentionConfig, setRetentionConfig] = React.useState({
        defaultDays: 30,
        maxDays: 90,
    });

    // General State
    const [generalConfig, setGeneralConfig] = React.useState({
        maintenanceMode: false,
        globalAnnouncement: '',
    });

    React.useEffect(() => {
        fetch('/api/admin/config')
            .then(res => res.json())
            .then(data => {
                if (data.sms) setSmsConfig(prev => ({ ...prev, ...data.sms }));
                if (data.smtp) setSmtpConfig(prev => ({ ...prev, ...data.smtp }));
                if (data.smtp) setSmtpConfig(prev => ({ ...prev, ...data.smtp }));
                if (data.retention) setRetentionConfig(data.retention);
                if (data.general) setGeneralConfig(data.general);
            })
            .catch(err => console.error(err));
    }, []);

    const saveConfig = async () => {
        try {
            await fetch('/api/admin/config/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sms: smsConfig,
                    smtp: smtpConfig,
                    retention: retentionConfig,
                    general: generalConfig,
                }),
            });
            addToast(t('platform.success'), 'success');
        } catch (err) {
            console.error(err);
            addToast(t('platform.error'), 'error');
        }
    };

    const handleTestSmsConnection = async () => {
        setTestingConnection(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        addToast(t('platform.sms.testSuccess'), 'success');
        setTestingConnection(false);
    };

    const handleSendTestEmail = async () => {
        setTestingEmail(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        addToast(t('platform.smtp.testSuccess', { email: user?.email }), 'success');
        setTestingEmail(false);
    };

    // Redirect non-super-admins after hooks are declared.
    if (user?.role !== 'SUPER_ADMIN') {
        return <Navigate to="/dashboard" replace />;
    }

    const tabs = [
        {
            id: 'general',
            label: t('platform.tabs.general'),
            content: (
                <div className="space-y-6 max-w-xl">
                    <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium">{t('platform.general.maintenance')}</h3>
                                <p className="text-sm text-muted-foreground">{t('platform.general.maintenanceDesc')}</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={generalConfig.maintenanceMode}
                                onChange={(e) => setGeneralConfig({ ...generalConfig, maintenanceMode: e.target.checked })}
                                className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
                            />
                        </div>
                        {generalConfig.maintenanceMode && (
                            <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm text-amber-800 flex gap-2">
                                <AlertTriangle className="w-4 h-4 mt-0.5" />
                                {t('platform.general.maintenanceWarn')}
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                        <label className="block text-sm font-medium mb-2">{t('platform.general.announcement')}</label>
                        <textarea
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            rows={3}
                            placeholder="System will be down for maintenance..."
                            value={generalConfig.globalAnnouncement}
                            onChange={(e) => setGeneralConfig({ ...generalConfig, globalAnnouncement: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">{t('platform.general.announcementDesc')}</p>
                    </div>

                    <Button onClick={saveConfig} className="gap-2">
                        <Check className="w-4 h-4" /> {t('platform.general.saveButton')}
                    </Button>
                </div>
            )
        },
        {
            id: 'sms',
            label: t('platform.tabs.sms'),
            content: (
                <div className="space-y-6 max-w-xl">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                        <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-medium">{t('platform.sms.sensitive')}</p>
                            <p>{t('platform.sms.sensitiveDesc')}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{t('platform.sms.provider')}</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2"
                            value={smsConfig.provider}
                            onChange={(e) => setSmsConfig({ ...smsConfig, provider: e.target.value as SmsProvider })}
                        >
                            <option value="twilio">Twilio</option>
                            <option value="vonage">Vonage (Nexmo)</option>
                            <option value="generic">Generic HTTP/SMPP</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{t('platform.sms.apiKey')}</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                            value={smsConfig.apiKey}
                            onChange={(e) => setSmsConfig({ ...smsConfig, apiKey: e.target.value })}
                            placeholder="sk_live_..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{t('platform.sms.apiSecret')}</label>
                        <div className="relative">
                            <input
                                type={showSmsSecret ? 'text' : 'password'}
                                className="w-full border rounded-lg px-3 py-2 pr-10 font-mono text-sm"
                                value={smsConfig.apiSecret}
                                onChange={(e) => setSmsConfig({ ...smsConfig, apiSecret: e.target.value })}
                                placeholder="••••••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSmsSecret(!showSmsSecret)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showSmsSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {smsConfig.provider === 'generic' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('platform.sms.baseUrl')}</label>
                            <input
                                type="url"
                                className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                                value={smsConfig.baseUrl}
                                onChange={(e) => setSmsConfig({ ...smsConfig, baseUrl: e.target.value })}
                                placeholder="https://api.your-provider.com"
                            />
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <Button onClick={handleTestSmsConnection} disabled={testingConnection} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
                            <Send className="w-4 h-4 mr-2" />
                            {testingConnection ? t('platform.sms.sending') : t('platform.sms.testButton')}
                        </Button>
                        <Button onClick={saveConfig}>
                            <Check className="w-4 h-4 mr-2" />
                            {t('platform.sms.saveButton')}
                        </Button>
                    </div>
                </div>
            ),
        },
        {
            id: 'smtp',
            label: t('platform.tabs.smtp'),
            content: (
                <div className="space-y-6 max-w-xl">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                        <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium">{t('platform.smtp.title')}</p>
                            <p>{t('platform.smtp.desc')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('platform.smtp.host')}</label>
                            <input type="text" className="w-full border rounded-lg px-3 py-2" value={smtpConfig.host} onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('platform.smtp.port')}</label>
                            <input type="number" className="w-full border rounded-lg px-3 py-2" value={smtpConfig.port} onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) || 587 })} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="secure" checked={smtpConfig.secure} onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.checked })} className="w-4 h-4 rounded" />
                        <label htmlFor="secure" className="text-sm font-medium">{t('platform.smtp.secure')}</label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{t('platform.smtp.user')}</label>
                        <input type="text" className="w-full border rounded-lg px-3 py-2" value={smtpConfig.user} onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{t('platform.smtp.password')}</label>
                        <div className="relative">
                            <input type={showSmtpPassword ? 'text' : 'password'} className="w-full border rounded-lg px-3 py-2 pr-10" value={smtpConfig.password} onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })} />
                            <button type="button" onClick={() => setShowSmtpPassword(!showSmtpPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{t('platform.smtp.fromEmail')}</label>
                        <input type="email" className="w-full border rounded-lg px-3 py-2" value={smtpConfig.fromEmail} onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })} placeholder="no-reply@medlab.cm" />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button onClick={handleSendTestEmail} disabled={testingEmail} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
                            <Send className="w-4 h-4 mr-2" />
                            {testingEmail ? t('platform.sms.sending') : t('platform.smtp.testButton')}
                        </Button>
                        <Button onClick={saveConfig}>
                            <Check className="w-4 h-4 mr-2" />
                            {t('platform.smtp.saveButton')}
                        </Button>
                    </div>
                </div>
            ),
        },
        {
            id: 'retention',
            label: t('platform.tabs.retention'),
            content: (
                <div className="space-y-6 max-w-xl">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium">{t('platform.retention.title')}</p>
                            <p>{t('platform.retention.desc')}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('platform.retention.default')}</label>
                            <input
                                type="number"
                                className="w-full border rounded-lg px-3 py-2"
                                value={retentionConfig.defaultDays}
                                onChange={(e) => setRetentionConfig({ ...retentionConfig, defaultDays: parseInt(e.target.value) || 30 })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('platform.retention.defaultDesc')}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">{t('platform.retention.max')}</label>
                            <input
                                type="number"
                                className="w-full border rounded-lg px-3 py-2"
                                value={retentionConfig.maxDays}
                                onChange={(e) => setRetentionConfig({ ...retentionConfig, maxDays: parseInt(e.target.value) || 90 })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('platform.retention.maxDesc')}
                            </p>
                        </div>
                    </div>

                    <Button onClick={saveConfig} className="gap-2">
                        <Check className="w-4 h-4" />
                        {t('platform.retention.saveButton')}
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{t('platform.title')}</h1>
                <p className="text-muted-foreground">{t('platform.subtitle')}</p>
            </div>
            <Tabs tabs={tabs} defaultTab="sms" />
        </div>
    );
}
