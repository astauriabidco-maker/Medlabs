import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SmartUploadForm } from './components/SmartUploadForm';
import { DashboardRedirect } from './components/DashboardRedirect';
import { RequireRole } from './components/RequireRole';
import { GlobalUsers } from './pages/admin/GlobalUsers';
import { UsersList } from './pages/admin/UsersList';
import { AuditLogs } from './pages/admin/AuditLogs';
import { LabSettings } from './pages/admin/LabSettings';
import { TenantsList } from './pages/admin/TenantsList';
import { PlatformSettings } from './pages/admin/PlatformSettings';
import OcrConfiguration from './pages/admin/OcrConfiguration';
import { Team } from './pages/admin/Team';
import { Login } from './pages/auth/Login';
import { DashboardLayout } from './layouts/DashboardLayout';
import AnalyticsDashboard from './pages/lab/AnalyticsDashboard';
import ResultsHistory from './pages/tech/ResultsHistory';
import PatientLogin from './pages/patient/PatientLogin';
import PatientDashboard from './pages/patient/PatientDashboard';
import Pricing from './pages/public/Pricing';
// Missing page imports
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import BIDashboard from './pages/lab/BIDashboard';
import { Marketplace } from './pages/lab/Marketplace';
import Integration from './pages/lab/Integration';
import { SystemAlerts } from './pages/admin/SystemAlerts';
import { FinancialDashboard } from './pages/admin/FinancialDashboard';
import PricingManager from './pages/admin/PricingManager';
import { Settings } from './pages/lab/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<SmartUploadForm />} />
        <Route path="/login" element={<Login />} />
        <Route path="/pricing" element={<Pricing />} />

        {/* Patient Portal Routes */}
        <Route path="/patient/:slug/login" element={<PatientLogin />} />
        <Route path="/patient/:slug/dashboard" element={<PatientDashboard />} />

        {/* Protected Dashboard Routes */}
        <Route path="/dashboard/*" element={
          <DashboardLayout>
            <Routes>
              {/* Super Admin Dashboard */}
              <Route path="super-admin" element={<RequireRole roles={['SUPER_ADMIN', 'PLATFORM_MANAGER', 'PLATFORM_SUPPORT', 'PLATFORM_SALES', 'PLATFORM_ACCOUNTANT']}><SuperAdminDashboard /></RequireRole>} />

              {/* Lab Dashboard */}
              <Route path="lab-home" element={<AnalyticsDashboard />} />
              <Route path="history" element={<ResultsHistory />} />
              <Route path="team" element={<RequireRole roles={['LAB_ADMIN']}><Team /></RequireRole>} />

              {/* Platform Admin Routes */}
              <Route path="tenants" element={<RequireRole roles={['SUPER_ADMIN', 'PLATFORM_MANAGER', 'PLATFORM_SUPPORT', 'PLATFORM_SALES', 'PLATFORM_ACCOUNTANT']}><TenantsList /></RequireRole>} />
              <Route path="users" element={<RequireRole roles={['SUPER_ADMIN']}><UsersList /></RequireRole>} />
              <Route path="users-directory" element={<RequireRole roles={['SUPER_ADMIN', 'PLATFORM_MANAGER', 'PLATFORM_SUPPORT']}><GlobalUsers /></RequireRole>} />
              <Route path="platform" element={<RequireRole roles={['SUPER_ADMIN']}><PlatformSettings /></RequireRole>} />
              <Route path="audit" element={<RequireRole roles={['SUPER_ADMIN', 'PLATFORM_MANAGER', 'PLATFORM_SUPPORT']}><AuditLogs /></RequireRole>} />
              <Route path="ocr-config" element={<RequireRole roles={['SUPER_ADMIN']}><OcrConfiguration /></RequireRole>} />
              <Route path="system-alerts" element={<RequireRole roles={['SUPER_ADMIN', 'PLATFORM_MANAGER', 'PLATFORM_SUPPORT']}><SystemAlerts /></RequireRole>} />
              <Route path="financial" element={<RequireRole roles={['SUPER_ADMIN', 'PLATFORM_ACCOUNTANT']}><FinancialDashboard /></RequireRole>} />
              <Route path="pricing-manager" element={<RequireRole roles={['SUPER_ADMIN', 'PLATFORM_SALES']}><PricingManager /></RequireRole>} />

              {/* Analytics BI — accessible to platform + lab roles with this feature */}
              <Route path="analytics" element={<BIDashboard />} />

              {/* Shared Routes */}
              <Route path="marketplace" element={<Marketplace />} />
              <Route path="integration" element={<Integration />} />
              <Route path="api" element={<RequireRole roles={['SUPER_ADMIN']}><Settings /></RequireRole>} />

              {/* Lab Settings */}
              <Route path="settings" element={<LabSettings />} />

              {/* Fallback */}
              <Route index element={<DashboardRedirect />} />
              <Route path="*" element={<DashboardRedirect />} />
            </Routes>
          </DashboardLayout>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App;


