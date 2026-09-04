import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import FirstTimeLoginFlow from './components/FirstTimeLoginFlow';
import Layout from './components/Layout';
import GlobalNewsListener from './components/news/GlobalNewsListener';
import OfflineIndicator from './components/OfflineIndicator';
import InstallPWA from './components/InstallPWA';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BottomSheetProvider } from './contexts/BottomSheetContext';
import { ThemeProvider } from './contexts/ThemeContext';

const TodayDashboard = lazy(() => import('./pages/TodayDashboard'));
const DashboardLegacy = lazy(() => import('./pages/Dashboard'));
const SowList = lazy(() => import('./pages/FarmHub'));
const AddSow = lazy(() => import('./pages/AddSow'));
const SowDetails = lazy(() => import('./pages/SowDetails'));
const ScanAI = lazy(() => import('./pages/ScanAI'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));
const BaseSalary = lazy(() => import('./pages/payroll/BaseSalary'));
const AdvanceRequest = lazy(() => import('./pages/payroll/AdvanceRequest'));
const AdvanceApproval = lazy(() => import('./pages/payroll/AdvanceApproval'));
const PayrollSummary = lazy(() => import('./pages/payroll/PayrollSummary'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const PenMap = lazy(() => import('./pages/PenMap'));
const ScanReceipt = lazy(() => import('./pages/ScanReceipt'));
const BillList = lazy(() => import('./pages/BillList'));
const SalesList = lazy(() => import('./pages/sales/SalesList'));
const NewSale = lazy(() => import('./pages/sales/NewSale'));
const Manual = lazy(() => import('./pages/Manual'));
const MaintenanceList = lazy(() => import('./pages/equipment/MaintenanceList'));
const NewMaintenanceRequest = lazy(() => import('./pages/equipment/NewMaintenanceRequest'));
const MaintenanceDetails = lazy(() => import('./pages/equipment/MaintenanceDetails'));
const NewsBoard = lazy(() => import('./pages/news/NewsBoard'));
const ChatList = lazy(() => import('./pages/chat/ChatList'));
const ChatRoomPage = lazy(() => import('./pages/chat/ChatRoom'));
const Calculator = lazy(() => import('./pages/tools/Calculator'));
const FeedFormulation = lazy(() => import('./pages/tools/FeedFormulation'));
const PigPriceAnalysis = lazy(() => import('./pages/tools/PigPriceAnalysis'));

function RouteFallback() {
  return (
    <div
      className="min-h-[35vh] flex items-center justify-center bg-[#f8fafc]"
      role="status"
      aria-live="polite"
      aria-label="กำลังโหลดหน้า"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading, logout } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-[#f8fafc]" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userProfile?.role === 'PENDING') {
    return <FirstTimeLoginFlow />;
  }

  if (userProfile?.role === 'RESIGNED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a2e36] px-4 font-sans">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">บัญชีถูกระงับการใช้งาน</h2>
          <p className="text-white/70 mb-8 leading-relaxed">
            บัญชีของคุณถูกปิดการใช้งานในระบบ <br/>
            (เนื่องจากการลาออก หรือถูกเพิกถอนสิทธิ์) <br/>
            หากเป็นข้อผิดพลาด โปรดติดต่อผู้ดูแลระบบครับ
          </p>
          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="w-full bg-white/10 text-white py-3 rounded-2xl font-bold hover:bg-white/20 transition-all border border-white/10"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-[#f8fafc]" />;
  }

  if (userProfile?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <>
      <GlobalNewsListener />
      <OfflineIndicator />
      <InstallPWA />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<TodayDashboard />} />
            <Route path="dashboard-legacy" element={<DashboardLegacy />} />
            <Route path="sows" element={<SowList />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="pen-map" element={<PenMap />} />
            <Route path="sales" element={<SalesList />} />
            <Route path="manual" element={<Manual />} />
            <Route path="news" element={<NewsBoard />} />
            <Route path="chat" element={<ChatList />} />
            <Route path="maintenance" element={<MaintenanceList />} />
            <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="/sows/add" element={<ProtectedRoute><AddSow /></ProtectedRoute>} />
          <Route path="/sows/:id" element={<ProtectedRoute><SowDetails /></ProtectedRoute>} />
          <Route path="/sows/:id/scan-ai" element={<ProtectedRoute><ScanAI /></ProtectedRoute>} />
          <Route path="/scan" element={<ProtectedRoute><ScanReceipt /></ProtectedRoute>} />
          <Route path="/scan/history" element={<ProtectedRoute><BillList /></ProtectedRoute>} />
          <Route path="/sales/new" element={<ProtectedRoute><NewSale /></ProtectedRoute>} />
          <Route path="/chat/:id" element={<ProtectedRoute><ChatRoomPage /></ProtectedRoute>} />
          <Route path="/maintenance/new" element={<ProtectedRoute><NewMaintenanceRequest /></ProtectedRoute>} />
          <Route path="/maintenance/:id" element={<ProtectedRoute><MaintenanceDetails /></ProtectedRoute>} />
          <Route path="/tools/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
          <Route path="/tools/feed" element={<ProtectedRoute><FeedFormulation /></ProtectedRoute>} />
          <Route path="/tools/pig-price" element={<ProtectedRoute><PigPriceAnalysis /></ProtectedRoute>} />
          <Route path="/payroll/base-salary" element={<ProtectedRoute><AdminRoute><BaseSalary /></AdminRoute></ProtectedRoute>} />
          <Route path="/payroll/advance" element={<ProtectedRoute><AdvanceRequest /></ProtectedRoute>} />
          <Route path="/payroll/advance-approval" element={<ProtectedRoute><AdminRoute><AdvanceApproval /></AdminRoute></ProtectedRoute>} />
          <Route path="/payroll/summary" element={<ProtectedRoute><PayrollSummary /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BottomSheetProvider>
        <AuthProvider>
          <SplashScreen />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </BottomSheetProvider>
    </ThemeProvider>
  );
}
