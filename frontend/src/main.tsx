
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
)
