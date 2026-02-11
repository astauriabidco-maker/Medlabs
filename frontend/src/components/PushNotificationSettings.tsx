import * as React from 'react';
import { Bell, BellOff, BellRing, Shield, Send, AlertTriangle, Calendar, FileCheck, Settings2 } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui-basic';
import { Badge, useToast } from '@/components/ui-dashboard';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTranslation } from 'react-i18next';

export function PushNotificationSettings() {
    const { t } = useTranslation();
    const { addToast } = useToast();
    const {
        permission,
        prefs,
        isSupported,
        isGranted,
        isDenied,
        requestPermission,
        updatePrefs,
        sendTestNotification,
    } = usePushNotifications();

    const handleRequestPermission = async () => {
        const granted = await requestPermission();
        if (granted) {
            addToast(t('notifications.push.enabled'), 'success');
        }
    };

    const handleSendTest = () => {
        sendTestNotification();
        addToast(t('notifications.push.testSent'), 'success');
    };

    const categories = [
        {
            key: 'criticalAlerts' as const,
            label: t('notifications.push.categories.criticalAlerts'),
            desc: 'Valeurs biologiques hors normes, urgences médicales',
            icon: AlertTriangle,
            color: 'text-red-500',
        },
        {
            key: 'newResults' as const,
            label: t('notifications.push.categories.newResults'),
            desc: 'Résultats uploadés, statuts de livraison',
            icon: FileCheck,
            color: 'text-blue-500',
        },
        {
            key: 'systemAlerts' as const,
            label: t('notifications.push.categories.systemAlerts'),
            desc: 'Solde SMS faible, maintenance, sécurité',
            icon: Shield,
            color: 'text-amber-500',
        },
        {
            key: 'appointments' as const,
            label: t('notifications.push.categories.appointments'),
            desc: 'Nouveaux rendez-vous, rappels, annulations',
            icon: Calendar,
            color: 'text-green-500',
        },
    ];

    if (!isSupported) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <BellOff className="w-5 h-5 text-amber-500" />
                        <p className="text-sm text-amber-700">{t('notifications.push.unsupported')}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    {t('notifications.push.title')}
                    {isGranted && prefs.enabled ? (
                        <Badge variant="success" className="ml-2 text-xs">
                            {t('notifications.push.enabled')}
                        </Badge>
                    ) : (
                        <Badge variant="warning" className="ml-2 text-xs">
                            {t('notifications.push.disabled')}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Permission Request */}
                {!isGranted && (
                    <div className={`p-5 rounded-xl border-2 ${isDenied ? 'bg-red-50 border-red-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${isDenied ? 'bg-red-100' : 'bg-blue-100'}`}>
                                <BellRing className={`w-6 h-6 ${isDenied ? 'text-red-600' : 'text-blue-600'}`} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">
                                    {t('notifications.push.permission')}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                    {isDenied
                                        ? t('notifications.push.denied')
                                        : t('notifications.push.permissionDesc')
                                    }
                                </p>
                                {!isDenied && (
                                    <Button onClick={handleRequestPermission} className="mt-3 gap-2">
                                        <Bell className="w-4 h-4" />
                                        {t('notifications.push.enable')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Category Toggles */}
                {isGranted && (
                    <>
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Settings2 className="w-4 h-4" />
                                Catégories de notifications
                            </h4>
                            <div className="grid gap-3">
                                {categories.map((cat) => {
                                    const IconComp = cat.icon;
                                    const isEnabled = prefs[cat.key];
                                    return (
                                        <label
                                            key={cat.key}
                                            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isEnabled
                                                    ? 'bg-white border-blue-200 shadow-sm'
                                                    : 'bg-gray-50 border-gray-200 opacity-60'
                                                }`}
                                        >
                                            <div className={`p-2 rounded-lg ${isEnabled ? 'bg-gray-100' : 'bg-gray-200'}`}>
                                                <IconComp className={`w-5 h-5 ${cat.color}`} />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-sm font-medium text-gray-900">{cat.label}</span>
                                                <p className="text-xs text-gray-500">{cat.desc}</p>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={isEnabled}
                                                    onChange={(e) => updatePrefs({ [cat.key]: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors" />
                                                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-5 transition-transform" />
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Master Toggle */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                            <div className="flex items-center gap-3">
                                {prefs.enabled ? (
                                    <Bell className="w-5 h-5 text-blue-600" />
                                ) : (
                                    <BellOff className="w-5 h-5 text-gray-400" />
                                )}
                                <div>
                                    <span className="text-sm font-medium">
                                        {prefs.enabled ? t('notifications.push.enabled') : t('notifications.push.disabled')}
                                    </span>
                                </div>
                            </div>
                            <label className="relative cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={prefs.enabled}
                                    onChange={(e) => updatePrefs({ enabled: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors" />
                                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-5 transition-transform" />
                            </label>
                        </div>

                        {/* Test Button */}
                        <Button
                            variant="outline"
                            onClick={handleSendTest}
                            disabled={!prefs.enabled}
                            className="gap-2"
                        >
                            <Send className="w-4 h-4" />
                            {t('notifications.push.test')}
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
