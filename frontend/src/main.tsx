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

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import './i18n'; // Initialize i18n
import { Landing } from './pages/public/Landing.tsx'
import { BecomePartner } from './pages/public/BecomePartner.tsx'
import { Login } from './pages/auth/Login.tsx'
import { ForgotPassword } from './pages/auth/ForgotPassword.tsx'
import { ResetPassword } from './pages/auth/ResetPassword.tsx'
import { GuestAccess } from './pages/GuestAccess.tsx'
import { ExpiredDocument } from './pages/public/ExpiredDocument.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { ToastProvider } from './components/ui-dashboard.tsx'
import { DashboardLayout } from './layouts/DashboardLayout.tsx'
import { TenantsList } from './pages/admin/TenantsList.tsx'
import { UsersList } from './pages/admin/UsersList.tsx'
import { Team } from './pages/admin/Team.tsx'
import { Settings } from './pages/lab/Settings.tsx'
import { PlatformSettings } from './pages/admin/PlatformSettings.tsx'


import ResultsHistory from './pages/tech/ResultsHistory.tsx'
import { SmartUploadForm } from './components/SmartUploadForm.tsx'



import AnalyticsDashboard from './pages/lab/AnalyticsDashboard.tsx'
import { DashboardRedirect } from './components/DashboardRedirect.tsx'
import PatientLogin from './pages/patient/PatientLogin.tsx'
import PatientDashboard from './pages/patient/PatientDashboard.tsx'
import Alerts from './pages/lab/Alerts.tsx'
import PatientPortal from './pages/lab/PatientPortal.tsx'
import Appointments from './pages/lab/Appointments.tsx'
import Integration from './pages/lab/Integration.tsx';
import BIDashboard from './pages/lab/BIDashboard.tsx';
import Marketplace from './pages/lab/Marketplace.tsx';
import Booking from './pages/public/Booking.tsx';
import Pricing from './pages/public/Pricing.tsx';
import PricingManager from './pages/admin/PricingManager.tsx';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard.tsx';
import { SystemAlerts } from './pages/admin/SystemAlerts.tsx';
import { FinancialDashboard } from './pages/admin/FinancialDashboard.tsx';
import { GlobalUsers } from './pages/admin/GlobalUsers.tsx';
import { AuditLogs } from './pages/admin/AuditLogs.tsx';
import OcrConfiguration from './pages/admin/OcrConfiguration.tsx';

function DashboardRoutes() {
  return (
    <DashboardLayout>
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


        {/* Technician Routes */}
        <Route path="history" element={<ResultsHistory />} />
        <Route path="upload" element={<div className="bg-white p-6 rounded-lg shadow"><h2 className="text-xl font-bold mb-4">New Result</h2><SmartUploadForm /></div>} />

        {/* Default redirect based on role */}
        <Route index element={<DashboardRedirect />} />
        <Route path="*" element={<DashboardRedirect />} />
      </Routes>
    </DashboardLayout>
  )
}

// Error fallback component
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
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
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
