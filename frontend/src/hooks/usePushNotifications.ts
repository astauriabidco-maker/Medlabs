import { useState, useEffect, useCallback } from 'react';

const PUSH_PREFS_KEY = 'medlab_push_prefs';

interface PushPreferences {
    enabled: boolean;
    criticalAlerts: boolean;
    newResults: boolean;
    systemAlerts: boolean;
    appointments: boolean;
}

const DEFAULT_PREFS: PushPreferences = {
    enabled: false,
    criticalAlerts: true,
    newResults: true,
    systemAlerts: true,
    appointments: true,
};

function getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
}

function getStoredPrefs(): PushPreferences {
    try {
        const stored = localStorage.getItem(PUSH_PREFS_KEY);
        if (stored) return JSON.parse(stored);
    } catch { }
    return DEFAULT_PREFS;
}

function storePrefs(prefs: PushPreferences) {
    localStorage.setItem(PUSH_PREFS_KEY, JSON.stringify(prefs));
}

export function usePushNotifications() {
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(getPermissionStatus());
    const [prefs, setPrefs] = useState<PushPreferences>(getStoredPrefs());
    const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(() => {
                setServiceWorkerReady(true);
            });
        }
    }, []);

    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!('Notification' in window)) {
            setPermission('unsupported');
            return false;
        }

        const result = await Notification.requestPermission();
        setPermission(result);

        if (result === 'granted') {
            const newPrefs = { ...prefs, enabled: true };
            setPrefs(newPrefs);
            storePrefs(newPrefs);
            return true;
        }
        return false;
    }, [prefs]);

    const updatePrefs = useCallback((update: Partial<PushPreferences>) => {
        const newPrefs = { ...prefs, ...update };
        setPrefs(newPrefs);
        storePrefs(newPrefs);
    }, [prefs]);

    const sendTestNotification = useCallback(() => {
        if (permission !== 'granted') return;

        new Notification('MedLab — Test', {
            body: 'Les notifications push fonctionnent correctement !',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: 'test-notification',
            requireInteraction: false,
        });
    }, [permission]);

    const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
        if (permission !== 'granted' || !prefs.enabled) return;

        new Notification(title, {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            ...options,
        });
    }, [permission, prefs.enabled]);

    return {
        permission,
        prefs,
        serviceWorkerReady,
        isSupported: permission !== 'unsupported',
        isGranted: permission === 'granted',
        isDenied: permission === 'denied',
        requestPermission,
        updatePrefs,
        sendTestNotification,
        sendNotification,
    };
}
