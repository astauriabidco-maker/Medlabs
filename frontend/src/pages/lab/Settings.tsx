/**
 * Settings Page - Refactored to use modular components
 * Original: 1612 lines → Now: ~80 lines
 */
import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs } from '@/components/ui-dashboard';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

// Modular settings components
import {
    GeneralSettings,
    ModulesSettings,
    NotificationSettings,
    PaymentSettings
} from './settings/index';
import { SSOSettings } from '@/components/SSOSettings';

export function Settings() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const location = useLocation();

    // Determine default tab from URL
    const getInitialTab = () => {
        if (location.pathname.includes('/sms')) return 'sms';
        if (location.pathname.includes('/api')) return 'modules';
        if (location.pathname.includes('/payment')) return 'payment';
        if (location.pathname.includes('/sso')) return 'sso';
        return 'general';
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">
                    {user?.role === 'SUPER_ADMIN' ? t('platform.title') : t('settings.title')}
                </h1>
                <p className="text-muted-foreground">
                    {t('settings.subtitle')}
                </p>
            </div>

            <Tabs
                key={getInitialTab()}
                tabs={[
                    {
                        id: 'general',
                        label: t('settings.tabs.general'),
                        content: <GeneralSettings />,
                    },
                    {
                        id: 'sms',
                        label: t('settings.tabs.sms'),
                        content: <NotificationSettings />,
                    },
                    {
                        id: 'modules',
                        label: t('settings.tabs.modules') || 'Modules',
                        content: <ModulesSettings />,
                    },
                    {
                        id: 'payment',
                        label: t('settings.tabs.payment') || 'Paiement',
                        content: <PaymentSettings />,
                    },
                    {
                        id: 'sso',
                        label: 'SSO / LDAP',
                        content: <SSOSettings />,
                    },
                ]}
            />
        </div>
    );
}
