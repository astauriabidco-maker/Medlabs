import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Hook to track online/offline status
 */
function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

/**
 * Offline indicator banner
 * Shows when the user loses internet connection
 */
export function OfflineIndicator() {
    const isOnline = useOnlineStatus();

    if (isOnline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-900 px-4 py-2 flex items-center justify-center gap-2 shadow-md">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">
                Vous êtes hors-ligne. Certaines fonctionnalités peuvent être limitées.
            </span>
        </div>
    );
}

export { useOnlineStatus };
