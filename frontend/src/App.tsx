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
              <Route path="lab-home" element={<AnalyticsDashboard />} />
              <Route path="history" element={<ResultsHistory />} />
              <Route path="team" element={<RequireRole roles={['LAB_ADMIN']}><Team /></RequireRole>} />
              <Route path="tenants" element={<RequireRole roles={['SUPER_ADMIN']}><TenantsList /></RequireRole>} />
              <Route path="users" element={<RequireRole roles={['SUPER_ADMIN']}><UsersList /></RequireRole>} />
              <Route path="users-directory" element={<RequireRole roles={['SUPER_ADMIN']}><GlobalUsers /></RequireRole>} />
              <Route path="platform" element={<RequireRole roles={['SUPER_ADMIN']}><PlatformSettings /></RequireRole>} />
              <Route path="audit" element={<RequireRole roles={['SUPER_ADMIN']}><AuditLogs /></RequireRole>} />
              <Route path="ocr-config" element={<RequireRole roles={['SUPER_ADMIN']}><OcrConfiguration /></RequireRole>} />
              <Route path="settings" element={<LabSettings />} />
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


