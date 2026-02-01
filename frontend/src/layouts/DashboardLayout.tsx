import * as React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
    Building2,
    Users,
    Settings,
    FileText,
    MessageSquare,
    Key,
    Menu,
    X,
    LogOut,
    ChevronDown,
    Upload,
    User as UserIcon,
    LayoutDashboard,
    AlertTriangle,
    Heart,
    Calendar,
    Plug,
    BarChart3,
    Package,
    CreditCard,
} from 'lucide-react';

import { useTranslation } from 'react-i18next';

interface NavItem {
    label: string; // Now this will be a translation key actually, but handled in render
    translationKey: string;
    path: string;
    icon: React.ReactNode;
}

const NAV_CONFIG: Record<UserRole, NavItem[]> = {
    SUPER_ADMIN: [
        // === Platform Management ===
        { label: 'Dashboard', translationKey: 'nav.dashboard', path: '/dashboard/super-admin', icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: 'Tenants', translationKey: 'nav.tenants', path: '/dashboard/tenants', icon: <Building2 className="w-5 h-5" /> },
        { label: 'Users & Staff', translationKey: 'nav.users', path: '/dashboard/users', icon: <Users className="w-5 h-5" /> },
        { label: 'User Directory', translationKey: 'nav.directory', path: '/dashboard/users-directory', icon: <UserIcon className="w-5 h-5" /> },
        { label: 'Pricing & Plans', translationKey: 'nav.pricing', path: '/dashboard/pricing-manager', icon: <CreditCard className="w-5 h-5" /> },
        { label: 'Marketplace', translationKey: 'nav.marketplace', path: '/dashboard/marketplace', icon: <Package className="w-5 h-5" /> },
        { label: 'Platform Settings', translationKey: 'nav.platform', path: '/dashboard/platform', icon: <Settings className="w-5 h-5" /> },
        { label: 'API Integration', translationKey: 'nav.integration', path: '/dashboard/integration', icon: <Plug className="w-5 h-5" /> },
        { label: 'Analytics BI', translationKey: 'nav.analytics', path: '/dashboard/analytics', icon: <BarChart3 className="w-5 h-5" /> },
        { label: 'Developer API', translationKey: 'nav.api', path: '/dashboard/api', icon: <Key className="w-5 h-5" /> },
        { label: 'Audit Logs', translationKey: 'nav.audit', path: '/dashboard/audit', icon: <FileText className="w-5 h-5" /> },
        { label: 'System Alerts', translationKey: 'nav.systemAlerts', path: '/dashboard/system-alerts', icon: <AlertTriangle className="w-5 h-5" /> },
        { label: 'Financial', translationKey: 'nav.financial', path: '/dashboard/financial', icon: <CreditCard className="w-5 h-5" /> },
    ],
    LAB_ADMIN: [
        { label: 'Dashboard', translationKey: 'nav.dashboard', path: '/dashboard/lab-home', icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: 'New Result', translationKey: 'nav.upload', path: '/dashboard/upload', icon: <Upload className="w-5 h-5" /> },
        { label: 'Sent History', translationKey: 'nav.history', path: '/dashboard/history', icon: <FileText className="w-5 h-5" /> },
        { label: 'My Team', translationKey: 'nav.team', path: '/dashboard/team', icon: <Users className="w-5 h-5" /> },
        { label: 'Appointments', translationKey: 'nav.appointments', path: '/dashboard/appointments', icon: <Calendar className="w-5 h-5" /> },
        { label: 'Patient Portal', translationKey: 'nav.patientPortal', path: '/dashboard/patient-portal', icon: <Heart className="w-5 h-5" /> },
        { label: 'Critical Alerts', translationKey: 'nav.alerts', path: '/dashboard/alerts', icon: <AlertTriangle className="w-5 h-5" /> },
        { label: 'Marketplace', translationKey: 'nav.marketplace', path: '/dashboard/marketplace', icon: <Package className="w-5 h-5" /> },
        { label: 'Lab Settings', translationKey: 'nav.labSettings', path: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
        { label: 'API Integration', translationKey: 'nav.integration', path: '/dashboard/integration', icon: <Plug className="w-5 h-5" /> },
        { label: 'Analytics BI', translationKey: 'nav.analytics', path: '/dashboard/analytics', icon: <BarChart3 className="w-5 h-5" /> },
    ],
    TECHNICIAN: [
        { label: 'New Result', translationKey: 'nav.upload', path: '/dashboard/upload', icon: <Upload className="w-5 h-5" /> },
        { label: 'Sent History', translationKey: 'nav.history', path: '/dashboard/history', icon: <FileText className="w-5 h-5" /> },
    ],
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { t, i18n } = useTranslation();
    const { user, logout, switchRole, isImpersonating, stopImpersonating } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const [roleMenuOpen, setRoleMenuOpen] = React.useState(false);

    // Redirect logic handled by router now or within specific pages if needed
    // Removed specific technician redirect to allow access to dashboard layout

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const navItems = NAV_CONFIG[user.role] || [];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b px-4 py-3 flex items-center justify-between">
                <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <Menu className="w-6 h-6" />
                </button>
                <span className="font-semibold">{t('platform.title')}</span>
                <div className="w-10" />
            </header>

            {/* Sidebar Overlay (Mobile) */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Impersonation Banner */}
            {isImpersonating && (
                <div className="fixed top-0 left-0 right-0 z-[60] h-10 bg-amber-500 text-white flex items-center justify-center text-sm font-medium px-4">
                    <span>{t('auth.impersonationBanner')} <strong>{user.email}</strong></span>
                    <button
                        onClick={stopImpersonating}
                        className="ml-4 bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs transition-colors"
                    >
                        {t('auth.switchBack')}
                    </button>
                    <div className="lg:ml-64" />
                </div>
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transform transition-transform duration-200',
                    'lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="p-4 border-b flex items-center justify-between">
                    <Link to="/dashboard" className="font-bold text-lg text-primary">
                        MedLab
                    </Link>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-gray-100 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 border-b space-y-4">
                    {/* Language Switcher */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => i18n.changeLanguage('fr')}
                            className={cn("flex-1 py-1 text-xs rounded border transition-colors", i18n.language.startsWith('fr') ? "bg-blue-50 border-blue-200 text-blue-700 font-medium" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50")}
                        >
                            Français
                        </button>
                        <button
                            onClick={() => i18n.changeLanguage('en')}
                            className={cn("flex-1 py-1 text-xs rounded border transition-colors", i18n.language.startsWith('en') ? "bg-blue-50 border-blue-200 text-blue-700 font-medium" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50")}
                        >
                            English
                        </button>
                    </div>

                    {user.tenantName && (
                        <p className="text-xs text-muted-foreground truncate">
                            {t('nav.tenant')}: {user.tenantName}
                        </p>
                    )}
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                location.pathname === item.path
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground'
                            )}
                        >
                            {item.icon}
                            {t(item.translationKey)}
                        </Link>
                    ))}
                </nav>

                {/* User Info & Logout */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                            {user.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.email}</p>
                            <p className="text-xs text-muted-foreground">{t(`roles.${user.role}`)}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                        <LogOut className="w-4 h-4" />
                        {t('nav.signOut')}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={cn("lg:ml-64 min-h-screen transition-all", isImpersonating ? "pt-24 lg:pt-10" : "pt-16 lg:pt-0")}>
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
