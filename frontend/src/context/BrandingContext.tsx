import React, { createContext, useContext, useState, useEffect } from 'react';

interface BrandingData {
    name: string;
    brandColor: string;
    brandLogoUrl: string | null;
}

interface BrandingContextType {
    branding: BrandingData | null;
    loading: boolean;
    error: string | null;
    fetchBranding: (slug: string) => Promise<void>;
}

const defaultBranding: BrandingData = {
    name: 'MedLab',
    brandColor: '#3B82F6',
    brandLogoUrl: null,
};

const BrandingContext = createContext<BrandingContextType>({
    branding: defaultBranding,
    loading: false,
    error: null,
    fetchBranding: async () => { },
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
    const [branding, setBranding] = useState<BrandingData | null>(defaultBranding);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBranding = async (slug: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/public/branding/${slug}`);
            if (!res.ok) {
                if (res.status === 404) {
                    // Use default branding
                    setBranding(defaultBranding);
                    return;
                }
                throw new Error('Failed to fetch branding');
            }
            const data = await res.json();
            setBranding({
                name: data.name || 'MedLab',
                brandColor: data.brandColor || '#3B82F6',
                brandLogoUrl: data.brandLogoUrl || null,
            });
        } catch (err: any) {
            console.error('Branding fetch error:', err);
            setError(err.message);
            setBranding(defaultBranding);
        } finally {
            setLoading(false);
        }
    };

    // Apply CSS variables when branding changes
    useEffect(() => {
        if (branding?.brandColor) {
            document.documentElement.style.setProperty('--primary-color', branding.brandColor);
            document.documentElement.style.setProperty('--brand-color', branding.brandColor);
        }
    }, [branding]);

    return (
        <BrandingContext.Provider value={{ branding, loading, error, fetchBranding }}>
            {children}
        </BrandingContext.Provider>
    );
}

export function useBranding() {
    return useContext(BrandingContext);
}

export { BrandingContext };
