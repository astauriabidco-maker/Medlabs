import * as React from 'react';
import { api } from '@/lib/api';

// Platform roles (no tenant) + Tenant roles
export type UserRole =
    | 'SUPER_ADMIN' | 'PLATFORM_MANAGER' | 'PLATFORM_SUPPORT' | 'PLATFORM_SALES' | 'PLATFORM_ACCOUNTANT'
    | 'LAB_ADMIN' | 'BUSINESS_MANAGER' | 'MANAGER' | 'TECHNICIAN' | 'RECEPTIONIST';

export const PLATFORM_ROLES: UserRole[] = ['SUPER_ADMIN', 'PLATFORM_MANAGER', 'PLATFORM_SUPPORT', 'PLATFORM_SALES', 'PLATFORM_ACCOUNTANT'];
export const TENANT_ROLES: UserRole[] = ['LAB_ADMIN', 'BUSINESS_MANAGER', 'MANAGER', 'TECHNICIAN', 'RECEPTIONIST'];

interface User {
    id: string;
    email: string;
    role: UserRole;
    tenantId: string | null;
    tenantName: string | null;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    impersonate: (userId: string) => Promise<void>;
    stopImpersonating: () => void;
    isImpersonating: boolean;
    switchRole: (role: UserRole) => void; // Dev only
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// SECURITY: Development-only check
const IS_DEVELOPMENT = import.meta.env.DEV;

// Mock users for development ONLY
const MOCK_USERS: Partial<Record<UserRole, User>> = IS_DEVELOPMENT ? {
    SUPER_ADMIN: {
        id: 'super-admin-001',
        email: 'admin@medlab.com',
        role: 'SUPER_ADMIN',
        tenantId: null,
        tenantName: null,
    },
    LAB_ADMIN: {
        id: 'lab-admin-001',
        email: 'manager@labo-mvolye.cm',
        role: 'LAB_ADMIN',
        tenantId: 'tenant-001',
        tenantName: 'Laboratoire Mvolyé',
    },
    TECHNICIAN: {
        id: 'tech-001',
        email: 'tech@labo-mvolye.cm',
        role: 'TECHNICIAN',
        tenantId: 'tenant-001',
        tenantName: 'Laboratoire Mvolyé',
    },
} : {}; // Empty in production — no mock users available

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<User | null>(() => {
        // Hydrate from localStorage (user info only, NOT the token)
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });

    const isImpersonating = !!localStorage.getItem('originalUser');

    const login = async (email: string, password: string) => {
        try {
            const res = await api.post('/api/auth/login', { email, password });

            if (!res.ok) {
                if (res.status === 401) throw new Error('Invalid credentials');
                throw new Error('Login failed');
            }

            const data = await res.json();

            // SECURITY: The JWT is now set as an httpOnly cookie by the backend.
            // We only store the token in localStorage as a fallback for backward compatibility.
            // The cookie is the primary auth mechanism and is immune to XSS.
            localStorage.setItem('token', data.access_token);

            // User info (non-sensitive) is stored for UI hydration
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            // Call server to clear the httpOnly cookie
            await api.post('/api/auth/logout', {});
        } catch {
            // Even if the server call fails, clear local state
        }

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('originalToken');
        localStorage.removeItem('originalUser');
        setUser(null);
    };

    const impersonate = async (userId: string) => {
        try {
            const res = await api.post('/api/auth/impersonate', { userId });
            if (!res.ok) throw new Error('Impersonation failed');

            const data = await res.json();

            // Save original session info
            if (!localStorage.getItem('originalUser')) {
                localStorage.setItem('originalToken', localStorage.getItem('token') || '');
                localStorage.setItem('originalUser', JSON.stringify(user));
            }

            // Set new session (cookie is set by server, but store fallback)
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);

            // Force reload to reset app state/sockets/etc
            window.location.href = '/dashboard';
        } catch (error) {
            console.error('Impersonate error:', error);
            throw error;
        }
    };

    const stopImpersonating = () => {
        const originalToken = localStorage.getItem('originalToken');
        const originalUser = localStorage.getItem('originalUser');

        if (originalToken && originalUser) {
            localStorage.setItem('token', originalToken);
            localStorage.setItem('user', originalUser);
            setUser(JSON.parse(originalUser));

            localStorage.removeItem('originalToken');
            localStorage.removeItem('originalUser');
            window.location.href = '/dashboard/users-directory';
        }
    };

    /**
     * SECURITY: switchRole is ONLY available in development mode.
     * In production builds (import.meta.env.DEV === false), this is a no-op
     * and MOCK_USERS is empty, so no role switching is possible.
     */
    const switchRole = (role: UserRole) => {
        if (!IS_DEVELOPMENT) {
            console.warn('SECURITY: switchRole is disabled in production.');
            return;
        }
        if (MOCK_USERS[role]) {
            setUser({ ...user, ...MOCK_USERS[role] } as User);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, impersonate, stopImpersonating, isImpersonating, switchRole }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = React.useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
