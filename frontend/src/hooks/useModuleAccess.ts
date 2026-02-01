import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

/**
 * Premium module identifiers
 */
export type ModuleId =
    | 'AUTO_SYNC'
    | 'LONG_TERM_ARCHIVE'
    | 'ARCHIVE_5Y'
    | 'ARCHIVE_10Y'
    | 'ANALYTICS_BI'
    | 'PATIENT_PORTAL'
    | 'APPOINTMENTS'
    | 'CRITICAL_ALERTS'
    | 'WHATSAPP_BUSINESS'
    | 'MOBILE_MONEY'
    | 'API_ADVANCED'
    | 'UNLIMITED_TEAM'
    | 'PRIORITY_SUPPORT';

/**
 * Module info from backend
 */
export interface ModuleInfo {
    id: string;
    name: string;
    description: string;
    active: boolean;
    category: string;
}

/**
 * License info response
 */
interface LicenseInfoResponse {
    features: string[];
    licenseKey: string | null;
    syncApiKey: string | null;
    availableModules: ModuleInfo[];
}

/**
 * Hook to check module access for the current tenant
 */
export function useModuleAccess() {
    const [modules, setModules] = useState<ModuleInfo[]>([]);
    const [features, setFeatures] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncApiKey, setSyncApiKey] = useState<string | null>(null);

    useEffect(() => {
        const fetchModules = async () => {
            try {
                const response = await api.get<LicenseInfoResponse>('/tenants/me/modules');
                setModules(response.availableModules || []);
                setFeatures(response.features || []);
                setSyncApiKey(response.syncApiKey || null);
            } catch (error) {
                console.error('Failed to fetch modules:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchModules();
    }, []);

    /**
     * Check if a specific module is activated
     */
    const hasModule = (moduleId: ModuleId): boolean => {
        return features.includes(moduleId);
    };

    /**
     * Check if any of the given modules is activated
     */
    const hasAnyModule = (moduleIds: ModuleId[]): boolean => {
        return moduleIds.some(id => features.includes(id));
    };

    /**
     * Check if all given modules are activated
     */
    const hasAllModules = (moduleIds: ModuleId[]): boolean => {
        return moduleIds.every(id => features.includes(id));
    };

    /**
     * Get module info by ID
     */
    const getModule = (moduleId: ModuleId): ModuleInfo | undefined => {
        return modules.find(m => m.id === moduleId);
    };

    /**
     * Refetch modules (after activation)
     */
    const refetch = async () => {
        setLoading(true);
        try {
            const response = await api.get<LicenseInfoResponse>('/tenants/me/modules');
            setModules(response.availableModules || []);
            setFeatures(response.features || []);
            setSyncApiKey(response.syncApiKey || null);
        } catch (error) {
            console.error('Failed to fetch modules:', error);
        } finally {
            setLoading(false);
        }
    };

    return {
        modules,
        features,
        loading,
        syncApiKey,
        hasModule,
        hasAnyModule,
        hasAllModules,
        getModule,
        refetch,
    };
}

/**
 * Map of modules to their corresponding sidebar nav paths
 */
export const MODULE_NAV_PATHS: Record<ModuleId, string[]> = {
    AUTO_SYNC: [],  // No specific nav path, config in Marketplace
    LONG_TERM_ARCHIVE: [],
    ARCHIVE_5Y: [],
    ARCHIVE_10Y: [],
    ANALYTICS_BI: ['/dashboard/analytics'],
    PATIENT_PORTAL: ['/dashboard/patient-portal'],
    APPOINTMENTS: ['/dashboard/appointments'],
    CRITICAL_ALERTS: ['/dashboard/alerts'],
    WHATSAPP_BUSINESS: [],
    MOBILE_MONEY: [],
    API_ADVANCED: ['/dashboard/integration'],
    UNLIMITED_TEAM: [],
    PRIORITY_SUPPORT: [],
};

/**
 * Get required module for a navigation path
 */
export function getRequiredModuleForPath(path: string): ModuleId | null {
    for (const [moduleId, paths] of Object.entries(MODULE_NAV_PATHS)) {
        if (paths.includes(path)) {
            return moduleId as ModuleId;
        }
    }
    return null;
}
