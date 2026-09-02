import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import FirstTimeLoginFlow from './components/FirstTimeLoginFlow';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SowList from './pages/SowList';
import AddSow from './pages/AddSow';
import SowDetails from './pages/SowDetails';
import ScanAI from './pages/ScanAI';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import BaseSalary from './pages/payroll/BaseSalary';
import AdvanceRequest from './pages/payroll/AdvanceRequest';
import AdvanceApproval from './pages/payroll/AdvanceApproval';
import PayrollSummary from './pages/payroll/PayrollSummary';
import UserManagement from './pages/UserManagement';
import PenMap from './pages/PenMap';
import ScanReceipt from './pages/ScanReceipt';
import BillList from './pages/BillList';
import SalesList from './pages/sales/SalesList';
import NewSale from './pages/sales/NewSale';
import Manual from './pages/Manual';
import MaintenanceList from './pages/equipment/MaintenanceList';
import NewMaintenanceRequest from './pages/equipment/NewMaintenanceRequest';
import MaintenanceDetails from './pages/equipment/MaintenanceDetails';
import NewsBoard from './pages/news/NewsBoard';
import ChatList from './pages/chat/ChatList';
import ChatRoomPage from './pages/chat/ChatRoom';
import Calculator from './pages/tools/Calculator';
import FeedFormulation from './pages/tools/FeedFormulation';
import PigPriceAnalysis from './pages/tools/PigPriceAnalysis';
import GlobalNewsListener from './components/news/GlobalNewsListener';
import OfflineIndicator from './components/OfflineIndicator';
import InstallPWA from './components/InstallPWA';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Clock } from 'lucide-react';
import { BottomSheetProvider } from './contexts/BottomSheetContext';
import { ThemeProvider } from './contexts/ThemeContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading, authError, logout } = useAuth();
  
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
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Main Tab/Shell Layout Routes */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
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

        {/* Full-Screen Independent Sub-views */}
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
