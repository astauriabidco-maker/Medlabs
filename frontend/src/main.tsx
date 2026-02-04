// Sentry Error Monitoring
import * as Sentry from '@sentry/react';

// Initialize Sentry if DSN is configured
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,

    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,

    // Replay for debugging user sessions (optional)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],

    // Ignore common non-critical errors
    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error promise rejection',
      /Loading chunk .* failed/,
    ],
  });
  console.log('[Sentry] Frontend monitoring initialized');
}

import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import './i18n'; // Initialize i18n

// ========================================
// CRITICAL PATH - Loaded immediately
// ========================================
import { AuthProvider } from './context/AuthContext.tsx'
import { ToastProvider } from './components/ui-dashboard.tsx'
import { DashboardLayout } from './layouts/DashboardLayout.tsx'
import { DashboardRedirect } from './components/DashboardRedirect.tsx'

// ========================================
// LAZY LOADED - Public Pages
// ========================================
const Landing = lazy(() => import('./pages/public/Landing.tsx').then(m => ({ default: m.Landing })));
const BecomePartner = lazy(() => import('./pages/public/BecomePartner.tsx').then(m => ({ default: m.BecomePartner })));
const Booking = lazy(() => import('./pages/public/Booking.tsx'));
const Pricing = lazy(() => import('./pages/public/Pricing.tsx'));
const ExpiredDocument = lazy(() => import('./pages/public/ExpiredDocument.tsx').then(m => ({ default: m.ExpiredDocument })));

// ========================================
// LAZY LOADED - Auth Pages
// ========================================
const Login = lazy(() => import('./pages/auth/Login.tsx').then(m => ({ default: m.Login })));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword.tsx').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword.tsx').then(m => ({ default: m.ResetPassword })));

// ========================================
// LAZY LOADED - Patient Portal
// ========================================
const PatientLogin = lazy(() => import('./pages/patient/PatientLogin.tsx'));
const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard.tsx'));
const GuestAccess = lazy(() => import('./pages/GuestAccess.tsx').then(m => ({ default: m.GuestAccess })));

// ========================================
// LAZY LOADED - Dashboard Pages
// ========================================
// Super Admin
const SuperAdminDashboard = lazy(() => import('./pages/admin/SuperAdminDashboard.tsx'));
const TenantsList = lazy(() => import('./pages/admin/TenantsList.tsx').then(m => ({ default: m.TenantsList })));
const UsersList = lazy(() => import('./pages/admin/UsersList.tsx').then(m => ({ default: m.UsersList })));
const GlobalUsers = lazy(() => import('./pages/admin/GlobalUsers.tsx').then(m => ({ default: m.GlobalUsers })));
const PlatformSettings = lazy(() => import('./pages/admin/PlatformSettings.tsx').then(m => ({ default: m.PlatformSettings })));
const PricingManager = lazy(() => import('./pages/admin/PricingManager.tsx'));
const SystemAlerts = lazy(() => import('./pages/admin/SystemAlerts.tsx').then(m => ({ default: m.SystemAlerts })));
const FinancialDashboard = lazy(() => import('./pages/admin/FinancialDashboard.tsx').then(m => ({ default: m.FinancialDashboard })));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs.tsx').then(m => ({ default: m.AuditLogs })));
const OcrConfiguration = lazy(() => import('./pages/admin/OcrConfiguration.tsx'));

// Lab Admin
const Team = lazy(() => import('./pages/admin/Team.tsx').then(m => ({ default: m.Team })));
const Settings = lazy(() => import('./pages/lab/Settings.tsx').then(m => ({ default: m.Settings })));
const Alerts = lazy(() => import('./pages/lab/Alerts.tsx'));
const PatientPortal = lazy(() => import('./pages/lab/PatientPortal.tsx'));
const Appointments = lazy(() => import('./pages/lab/Appointments.tsx'));
const Integration = lazy(() => import('./pages/lab/Integration.tsx'));
const BIDashboard = lazy(() => import('./pages/lab/BIDashboard.tsx'));
const Marketplace = lazy(() => import('./pages/lab/Marketplace.tsx'));
const ModuleDoc = lazy(() => import('./pages/lab/ModuleDoc.tsx'));
const AnalyticsDashboard = lazy(() => import('./pages/lab/AnalyticsDashboard.tsx'));

// Technician
const ResultsHistory = lazy(() => import('./pages/tech/ResultsHistory.tsx'));
const SmartUploadForm = lazy(() => import('./components/SmartUploadForm.tsx').then(m => ({ default: m.SmartUploadForm })));

// ========================================
// Loading Fallback Component
// ========================================
function PageLoader() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Chargement...</p>
      </div>
    </div>
  );
}

// ========================================
// Dashboard Routes (Lazy Loaded)
// ========================================
function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Lab Admin Dashboard */}
          <Route path="lab-home" element={<AnalyticsDashboard />} />

          {/* Super Admin Routes */}
          <Route path="super-admin" element={<SuperAdminDashboard />} />
          <Route path="tenants" element={<TenantsList />} />
          <Route path="users" element={<UsersList />} />
          <Route path="users-directory" element={<GlobalUsers />} />
          <Route path="platform" element={<PlatformSettings />} />
          <Route path="pricing-manager" element={<PricingManager />} />
          <Route path="system-alerts" element={<SystemAlerts />} />
          <Route path="financial" element={<FinancialDashboard />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="ocr-config" element={<OcrConfiguration />} />

          {/* Lab Admin Routes */}
          <Route path="team" element={<Team />} />
          <Route path="settings" element={<Settings />} />
          <Route path="sms" element={<Settings />} />
          <Route path="api" element={<Settings />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="patient-portal" element={<PatientPortal />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="integration" element={<Integration />} />
          <Route path="analytics" element={<BIDashboard />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="docs/:moduleId" element={<ModuleDoc />} />

          {/* Technician Routes */}
          <Route path="history" element={<ResultsHistory />} />
          <Route path="upload" element={
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">New Result</h2>
              <SmartUploadForm />
            </div>
          } />

          {/* Default redirect based on role */}
          <Route index element={<DashboardRedirect />} />
          <Route path="*" element={<DashboardRedirect />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  )
}

// ========================================
// Error Fallback Component
// ========================================
function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Oops! Une erreur est survenue</h1>
        <p className="text-gray-600 mb-6">
          Nous avons été notifiés et travaillons à résoudre le problème.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Rafraîchir la page
        </button>
      </div>
    </div>
  );
}

// ========================================
// App Root
// ========================================
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/become-partner" element={<BecomePartner />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route path="/expired" element={<ExpiredDocument />} />
                <Route path="/guest/access" element={<GuestAccess />} />
                <Route path="/dashboard/*" element={<DashboardRoutes />} />

                {/* Patient Portal Routes */}
                <Route path="/patient/:slug/login" element={<PatientLogin />} />
                <Route path="/patient/:slug/dashboard" element={<PatientDashboard />} />

                {/* Public Booking Widget */}
                <Route path="/book/:slug" element={<Booking />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
