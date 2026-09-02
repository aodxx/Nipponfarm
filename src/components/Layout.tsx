import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Sprout, Home, List, Calendar as CalendarIcon, Settings, Wallet, 
  Menu, X, ChevronRight, HandCoins, ShoppingCart, Wrench, 
  Newspaper, MessageCircle, ChevronDown, Hammer, Calculator, FlaskConical, Camera, AlertOctagon, MapPin,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeToPendingAdvances } from '../services/employeeService';
import PigLogo from './PigLogo';
import HeaderWeatherWidget from './HeaderWeatherWidget';
import FloatingSpeedDial from './FloatingSpeedDial';
import ProfileSettingsHub from './ProfileSettingsHub';

export default function Layout() {
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileHubOpen, setIsProfileHubOpen] = useState(false);
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    payroll: false,
    operations: false,
    assets: false,
    comm: false,
    tools: false
  });
  const navigate = useNavigate();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const getActiveTabIdx = () => {
    const path = location.pathname;
    if (path === '/' || path === '') return 0;
    if (path.startsWith('/sows')) return 1;
    if (path.startsWith('/calendar')) return 2;
    if (path.startsWith('/pen-map')) return 3;
    return 0; // Default fallback
  };
  
  const activeTabIdx = getActiveTabIdx();

  // Custom states for PWA Haptic feedback & active chasing border
  const [showChasingBorder, setShowChasingBorder] = useState(true);
  const [bounceActiveTabIdx, setBounceActiveTabIdx] = useState<number | null>(null);

  // Turn off chasing border immediately on tab change to enforce "Destroy Animation State"
  useEffect(() => {
    setShowChasingBorder(false);
  }, [activeTabIdx]);

  const handleTabClick = (idx: number) => {
    // 1. Instantly destroy existing chasing animation
    setShowChasingBorder(false);

    // 2. Trigger vibration on capable devices (15ms light pulse)
    let vibrated = false;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        vibrated = navigator.vibrate(15);
      } catch (e) {
        // fail-safe ignore
      }
    }

    // 3. Fallback visual scale bounce (+5% stretch/squeeze) for iOS or devices without physical vibration support
    if (!vibrated) {
      setBounceActiveTabIdx(idx);
      setTimeout(() => {
        setBounceActiveTabIdx(null);
      }, 350);
    }
  };
  
  const springConfig = {
    type: "spring" as const,
    stiffness: 105, // Rich, organic gel-like movement
    damping: 15,    // Smooth deceleration with a natural settling bounce
    mass: 0.95      // Balanced weight for the fluid flow effect
  };

  useEffect(() => {
    if (userProfile?.role === 'ADMIN') {
      const unsub = subscribeToPendingAdvances((advances) => {
        setPendingApprovalsCount(advances.length);
      });
      return () => unsub();
    }
  }, [userProfile?.role]);

  // Auto-expand menu based on current path
  useEffect(() => {
    if (location.pathname.startsWith('/payroll')) {
      setExpandedMenus(prev => ({ ...prev, payroll: true }));
    } else if (location.pathname.startsWith('/sales')) {
      setExpandedMenus(prev => ({ ...prev, operations: true }));
    } else if (location.pathname.startsWith('/maintenance')) {
      setExpandedMenus(prev => ({ ...prev, maintenance: true }));
    } else if (location.pathname.startsWith('/tools') || location.pathname === '/scan') {
      setExpandedMenus(prev => ({ ...prev, tools: true }));
    } else if (location.pathname === '/news' || location.pathname === '/manual' || location.pathname === '/users' || location.pathname === '/profile') {
      setExpandedMenus(prev => ({ ...prev, comm: true }));
    }
  }, [location.pathname]);
  


  // Toggle sub-menu
  const toggleSubMenu = (menuKey: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const SubMenuItem = ({ 
    to, 
    label, 
    isActive, 
    onClick,
    badge
  }: { 
    to: string; 
    label: string; 
    isActive: boolean; 
    onClick: () => void;
    badge?: number;
  }) => (
    <button 
      onClick={() => { navigate(to); onClick(); }}
      className={clsx(
        "w-full flex items-center justify-between gap-3 pl-12 pr-4 py-3.5 transition-all duration-200 rounded-2xl relative group mb-1 shrink-0",
        isActive 
          ? "bg-[#00bcd4]/10 text-[#008ba3] dark:text-[#00bcd4] font-black shadow-sm shadow-[#00bcd4]/5" 
          : "text-slate-600 dark:text-white/60 hover:bg-slate-100/80 dark:hover:bg-white/5 active:bg-slate-200 dark:active:bg-white/10"
      )}
    >
      <div className="flex items-center gap-3">
        {isActive && (
          <motion.div 
            layoutId="activeSubMenu"
            className="absolute left-3 w-1.5 h-1.5 bg-[#00bcd4] rounded-full shadow-[0_0_8px_rgba(0,188,212,0.6)]"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        {!isActive && (
           <div className="absolute left-3 w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full group-hover:scale-125 transition-transform"></div>
        )}
        <span className={clsx("text-[15px] transition-transform duration-300 text-left", isActive ? "translate-x-1" : "translate-x-0")}>
          {label}
        </span>
      </div>
      {typeof badge === 'number' && badge > 0 && (
        <span className="min-w-[24px] h-6 px-1.5 flex items-center justify-center bg-rose-500 text-white text-xs font-black rounded-full shadow-md animate-in zoom-in shrink-0">
          {badge}
        </span>
      )}
    </button>
  );
  
  const isAdmin = userProfile?.role === 'ADMIN';

  const closeSidebar = () => setIsSidebarOpen(false);
  
  return (
    <div 
      className="min-h-screen flex flex-col font-sans relative"
    >
      {/* Enhanced Header with Panoramic Background and Dark Overlay with Beautiful Bottom Rounding */}
      <header className="relative text-white sticky top-0 z-30 border-b border-slate-200/20 dark:border-white/5 shadow-lg overflow-hidden rounded-b-[2rem] sm:rounded-b-[2.5rem]">
        {/* Absolute Background Image with Overlay and Bottom Fade */}
        <div className="absolute inset-0 z-0 w-full h-full pointer-events-none select-none bg-[#0E214B]">
          <img 
            src="/Gemini_Generated_Image_jrb7wbjrb7wbjrb7.png" 
            alt="Nipon Farm Office Background" 
            className="w-full h-full object-cover object-center scale-100 contrast-[1.05]"
          />
          {/* Brighter Linear Gradient Overlay: 50% black at the very top for readable white text, fading to 0% at the middle/bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/15 to-transparent backdrop-blur-[0.5px]" />
        </div>

        {/* Beautiful Custom Curved Panel Overlay (Spot 1: Profile picture Solid Color Block at top-right corner) */}
        <div className="absolute top-0 right-0 z-0 pointer-events-none select-none w-[170px] h-[96px] sm:w-[210px] sm:h-[110px]">
          <svg
            className="w-full h-full text-[#00bcd4] filter drop-shadow-[0_4px_12px_rgba(0,188,212,0.35)] dark:drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-colors duration-300"
            viewBox="0 0 170 96"
            preserveAspectRatio="none"
          >
            <path
              d="M 35 0 C 75 0, 70 76, 115 76 L 170 76 L 170 0 Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Header content wrapping row with dynamic status-bar (safe-area) padding */}
        <div 
          className="relative z-10 flex justify-between items-center max-w-7xl mx-auto px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]"
        >
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="w-12 h-12 bg-slate-950/40 border-2 border-[#00bcd4] rounded-2xl hover:bg-[#00bcd4]/30 active:scale-95 transition-all shadow-md shadow-[#00bcd4]/20 outline-none flex items-center justify-center cursor-pointer group shrink-0"
              title="เปิดเมนูนำทาง"
            >
              <Menu className="w-6 h-6 text-[#00bcd4] group-hover:text-white group-hover:scale-110 transition-transform stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex flex-col justify-center gap-0.5">
                <h1 className="text-xl font-black tracking-tight leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  นิพนธ์ฟาร์ม
                </h1>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsProfileHubOpen(true)}
            className="w-12 h-12 bg-slate-950/40 hover:bg-slate-900/60 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/45 hover:border-[#00bcd4] active:scale-95 transition-all shadow-md ring-2 ring-transparent focus:ring-[#00bcd4]/50 shrink-0"
          >
            {userProfile?.photoURL || user?.photoURL ? (
              <img src={userProfile?.photoURL || user?.photoURL || ''} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-base font-black text-white">{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'อ'}</span>
            )}
          </button>
        </div>
        {/* Elegant spacer to expand the header background and pull the dashboard card down to show the office photo prominently */}
        <div className="h-14 sm:h-20 relative z-0" />

        {/* Compact Horizontal Weather Ribbon at the bottom of the header */}
        <div className="pb-2.5 relative z-10">
          <HeaderWeatherWidget />
        </div>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
            onClick={closeSidebar}
          ></div>
          
          <div className="relative w-[85%] max-w-sm bg-white/95 dark:bg-[#061e24]/95 backdrop-blur-3xl h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 border-r border-slate-200/50 dark:border-white/5 rounded-r-[2rem] overflow-hidden">
            <div className="relative p-6 border-b border-slate-200/20 dark:border-white/10 flex justify-between items-start overflow-hidden pt-[calc(1.5rem+env(safe-area-inset-top,0px))]">
              {/* Sidebar Header Panoramic Background with Dark Overlay */}
              <div className="absolute inset-0 z-0 w-full h-full pointer-events-none select-none bg-slate-900">
                <img 
                  src="/sidebar_header_bg.png" 
                  alt="Sidebar Header Background" 
                  className="w-full h-full object-cover scale-105"
                  style={{ objectPosition: '25% center' }}
                />
                {/* 45% dark overlay mask + overlay shading to guarantee perfect text contrast */}
                <div className="absolute inset-0 bg-black/45" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
              </div>

              <button onClick={() => { setIsProfileHubOpen(true); closeSidebar(); }} className="flex flex-col gap-3 text-left active:scale-95 transition-transform relative z-10 group">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center overflow-hidden shadow-md border-2 border-white/40 group-hover:border-[#00bcd4] transition-colors shrink-0">
                  {userProfile?.photoURL || user?.photoURL ? (
                    <img src={userProfile?.photoURL || user?.photoURL || ''} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-2xl font-black text-white">{userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || 'อ'}</span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-white font-black text-xl leading-tight tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{userProfile?.displayName || user?.displayName || 'ผู้ใช้งาน'}</p>
                  <p className="text-white/75 text-sm font-medium block drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] truncate max-w-[200px]">{user?.email}</p>
                </div>
              </button>
              
              <button 
                onClick={closeSidebar} 
                className="p-2 bg-black/40 hover:bg-black/65 text-white/80 hover:text-white rounded-xl transition-all border border-white/10 shrink-0 relative z-10"
                title="ปิดเมนู"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {/* --- Section: Dashboard & Main --- */}
              <nav className="space-y-1 px-4 mb-6">
                <button 
                  onClick={() => { navigate('/'); closeSidebar(); }}
                  className={clsx(
                    "w-full flex items-center gap-4 p-4 transition-all rounded-2xl",
                    location.pathname === '/' 
                      ? "bg-[#00bcd4] shadow-lg shadow-[#00bcd4]/30 font-black text-white" 
                      : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                  )}
                >
                  <Home className="w-6 h-6" />
                  <span className="text-lg tracking-wide">ภาพรวมฟาร์ม</span>
                </button>
              </nav>

              {/* --- Section: HR & Finance --- */}
              <div className="px-6 mb-2">
                <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.2em]">บริหารจัดการ (HR & FINANCE)</p>
              </div>

              <nav className="px-4 mb-6 space-y-1">
                {/* User Management for Admin removed from Sidebar Menu as requested */}

                {/* Submenu: Salary */}
                <div className="overflow-hidden">
                  <button 
                    onClick={() => toggleSubMenu('payroll')}
                    className={clsx(
                      "w-full flex items-center justify-between p-4 transition-all rounded-2xl",
                      expandedMenus.payroll 
                        ? "bg-slate-50 dark:bg-white/5 font-bold text-slate-900 dark:text-white" 
                        : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={clsx("p-2 rounded-xl transition-colors", expandedMenus.payroll ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30" : "bg-slate-100 dark:bg-white/5 text-slate-500")}>
                        <Wallet className="w-5 h-5" />
                      </div>
                      <span className="text-lg tracking-wide">ระบบเงินเดือน</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pendingApprovalsCount > 0 && isAdmin && (
                        <span className="w-5 h-5 flex items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full shadow-sm animate-in zoom-in">
                          {pendingApprovalsCount}
                        </span>
                      )}
                      <motion.div
                        animate={{ rotate: expandedMenus.payroll ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 opacity-30" />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedMenus.payroll && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/50 dark:bg-white/[0.02] rounded-b-2xl"
                      >
                        <div className="py-2 space-y-1">
                          {isAdmin && (
                            <SubMenuItem 
                              to="/payroll/base-salary" 
                              label="จัดการฐานเงินเดือน" 
                              isActive={location.pathname === '/payroll/base-salary'} 
                              onClick={closeSidebar}
                            />
                          )}
                          <SubMenuItem 
                            to="/payroll/advance" 
                            label="แจ้งเบิกเบี้ยเลี้ยง/ล่วงหน้า" 
                            isActive={location.pathname === '/payroll/advance'} 
                            onClick={closeSidebar}
                          />
                          {isAdmin && (
                            <>
                              <SubMenuItem 
                                to="/payroll/advance-approval" 
                                label="รายการรออนุมัติ" 
                                isActive={location.pathname === '/payroll/advance-approval'} 
                                onClick={closeSidebar}
                                badge={pendingApprovalsCount}
                              />
                            </>
                          )}
                          <SubMenuItem 
                            to="/payroll/summary" 
                            label={isAdmin ? "สรุปยอดสั่งจ่าย" : "รายละเอียดการรับเงินงวดนี้"} 
                            isActive={location.pathname === '/payroll/summary'} 
                            onClick={closeSidebar}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>

              {/* --- Section: Operations --- */}
              <div className="px-6 mb-2">
                <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.2em]">หน้าเล้าและคลัง (OPERATIONS)</p>
              </div>

              <nav className="px-4 mb-6 space-y-1">
                {/* Submenu: Sales */}
                <div className="overflow-hidden">
                  <button 
                    onClick={() => toggleSubMenu('operations')}
                    className={clsx(
                      "w-full flex items-center justify-between p-4 transition-all rounded-2xl",
                      expandedMenus.operations 
                        ? "bg-slate-50 dark:bg-white/5 font-bold text-slate-900 dark:text-white" 
                        : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={clsx("p-2 rounded-xl transition-colors", expandedMenus.operations ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" : "bg-slate-100 dark:bg-white/5 text-slate-500")}>
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <span className="text-lg tracking-wide">การจำหน่ายหมู</span>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedMenus.operations ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 opacity-30" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedMenus.operations && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/50 dark:bg-white/[0.02] rounded-b-2xl"
                      >
                        <div className="py-2 space-y-1">
                          <SubMenuItem 
                            to="/sales/new" 
                            label="เปิดบิลขายใหม่" 
                            isActive={location.pathname === '/sales/new'} 
                            onClick={closeSidebar}
                          />
                          <SubMenuItem 
                            to="/sales" 
                            label="ประวัติการขาย" 
                            isActive={location.pathname === '/sales'} 
                            onClick={closeSidebar}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>


              </nav>

              {/* --- Section: Tools & Knowledge --- */}
              <div className="px-6 mb-2">
                <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.2em]">เครื่องมือและคลังความรู้</p>
              </div>

              <nav className="px-4 mb-10 space-y-1">
                {/* Submenu: Tools */}
                <div className="overflow-hidden">
                  <button 
                    onClick={() => toggleSubMenu('tools')}
                    className={clsx(
                      "w-full flex items-center justify-between p-4 transition-all rounded-2xl",
                      expandedMenus.tools 
                        ? "bg-slate-50 dark:bg-white/5 font-bold text-slate-900 dark:text-white" 
                        : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={clsx("p-2 rounded-xl transition-colors", expandedMenus.tools ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "bg-slate-100 dark:bg-white/5 text-slate-500")}>
                        <Hammer className="w-5 h-5" />
                      </div>
                      <span className="text-lg tracking-wide">เครื่องมือช่วยงาน</span>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedMenus.tools ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 opacity-30" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedMenus.tools && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/50 dark:bg-white/[0.02] rounded-b-2xl"
                      >
                        <div className="py-2 space-y-1">
                          <SubMenuItem 
                            to="/tools/calculator" 
                            label="เครื่องคิดเลขฟาร์ม" 
                            isActive={location.pathname === '/tools/calculator'} 
                            onClick={closeSidebar}
                          />
                          <SubMenuItem 
                            to="/tools/feed" 
                            label="สูตรอาหารมาตรฐาน" 
                            isActive={location.pathname === '/tools/feed'} 
                            onClick={closeSidebar}
                          />
                          <SubMenuItem 
                            to="/tools/pig-price" 
                            label="วิเคราะห์ราคาสุกรหน้าฟาร์ม" 
                            isActive={location.pathname === '/tools/pig-price'} 
                            onClick={closeSidebar}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Submenu: Knowledge */}
                <div className="overflow-hidden">
                  <button 
                    onClick={() => toggleSubMenu('comm')}
                    className={clsx(
                      "w-full flex items-center justify-between p-4 transition-all rounded-2xl",
                      expandedMenus.comm 
                        ? "bg-slate-50 dark:bg-white/5 font-bold text-slate-900 dark:text-white" 
                        : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={clsx("p-2 rounded-xl transition-colors", expandedMenus.comm ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-white/5 text-slate-500")}>
                        <Newspaper className="w-5 h-5" />
                      </div>
                      <span className="text-lg tracking-wide">ข้อมูลและระเบียบ</span>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedMenus.comm ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 opacity-30" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedMenus.comm && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/50 dark:bg-white/[0.02] rounded-b-2xl"
                      >
                        <div className="py-2 space-y-1">
                          <SubMenuItem 
                            to="/news" 
                            label="ประกาศจากฟาร์ม" 
                            isActive={location.pathname === '/news'} 
                            onClick={closeSidebar}
                          />
                          <SubMenuItem 
                            to="/manual" 
                            label="คู่มือสัตวบาล" 
                            isActive={location.pathname === '/manual'} 
                            onClick={closeSidebar}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}



      {/* Main Content Area */}
      <main className="flex-1 p-4 pb-32 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Floating Speed Dial Tool Actions */}
      {location.pathname === '/' && <FloatingSpeedDial />}

      {/* Enhanced Bottom Navigation (Floating Dock) with Curved Liquid Animation */}
      <div className="fixed bottom-0 left-0 right-0 w-full z-20 pointer-events-none pb-safe px-4 pb-4">
        <div className="mx-auto max-w-md relative h-[92px] pointer-events-auto">
          
          {/* Animated SVG Curved Background Bar */}
          <svg 
            className="absolute inset-0 w-full h-full text-[#0E214B]/95 dark:text-[#0b1738]/95 filter drop-shadow-[0_-4px_25px_rgba(0,0,0,0.3)] pointer-events-none"
            viewBox="0 0 400 92"
            preserveAspectRatio="none"
          >
            <defs>
              <mask id="navbar-curve-mask">
                {/* Base bar */}
                <rect x="0" y="26" width="400" height="66" rx="24" fill="white" />
                {/* Sliding cutout notch */}
                <motion.path
                  animate={{ x: activeTabIdx * 100 + 50 }}
                  transition={springConfig}
                  d="M -36 26 C -22 26, -14 48, 0 48 C 14 48, 22 26, 36 26 Z"
                  fill="black"
                />
              </mask>
            </defs>
            
            {/* The bar background with the cutout mask */}
            <rect x="0" y="26" width="400" height="66" rx="24" fill="currentColor" mask="url(#navbar-curve-mask)" />
          </svg>

          {/* Sliding Active Circle Bubble */}
          <div className="absolute inset-x-0 top-0 h-full pointer-events-none">
            <motion.div
              className="absolute w-11 h-11 bg-[#00bcd4] rounded-full flex items-center justify-center shadow-lg shadow-[#00bcd4]/45 border border-white/20"
              style={{
                top: '4px',
                translateX: '-50%',
              }}
              animate={{
                left: (activeTabIdx * 25 + 12.5) + "%"
              }}
              transition={springConfig}
              onAnimationComplete={() => {
                setShowChasingBorder(true);
              }}
            >
              {/* Inner ambient shine overlay for extra high-end look */}
              <div className="absolute inset-1 rounded-full border border-white/25 bg-gradient-to-tr from-white/20 to-transparent" />
              
              {/* Chasing Border / Active Stroke rotating light arc on top-most border */}
              {showChasingBorder && (
                <svg className="absolute -inset-[2px] w-[48px] h-[48px] animate-chasing-spin pointer-events-none z-20" viewBox="0 0 48 48">
                  <circle
                    cx="24"
                    cy="24"
                    r="22.5"
                    fill="none"
                    stroke="#F8F9FA"
                    strokeWidth="1.8"
                    strokeDasharray="28 113"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </motion.div>
          </div>

          {/* Interactive Tab Links */}
          <div className="absolute inset-x-0 bottom-0 top-[26px] h-[66px] flex items-center justify-between">
            
            {/* Tab 1: Home */}
            <NavLink 
              to="/" 
              replace
              onClick={() => handleTabClick(0)}
              className="relative flex-1 h-full flex flex-col items-center justify-center cursor-pointer"
            >
              {({ isActive }) => (
                <div className="relative flex flex-col items-center justify-center w-full h-full select-none">
                  <motion.div
                    animate={{
                      y: isActive ? -33 : 0,
                      scale: bounceActiveTabIdx === 0 
                        ? [1, 1.20, 1.10, 1.15] 
                        : (isActive ? 1.15 : 1),
                      color: isActive ? "#081630" : "rgba(255, 255, 255, 0.4)"
                    }}
                    transition={bounceActiveTabIdx === 0 ? { duration: 0.35, ease: "easeInOut" } : springConfig}
                    className="z-10 flex items-center justify-center pointer-events-none"
                  >
                    <Home className="w-[22px] h-[22px] stroke-[2.3]" />
                  </motion.div>
                  <motion.span
                    animate={{
                      opacity: isActive ? 1 : 0,
                      y: isActive ? 0 : 8,
                      scale: isActive ? 1 : 0.95
                    }}
                    transition={springConfig}
                    className="absolute bottom-[8px] text-[10px] font-extrabold tracking-wide text-[#00bcd4] pointer-events-none"
                  >
                    หน้าแรก
                  </motion.span>
                </div>
              )}
            </NavLink>

            {/* Tab 2: Sows */}
            <NavLink 
              to="/sows" 
              replace
              onClick={() => handleTabClick(1)}
              className="relative flex-1 h-full flex flex-col items-center justify-center cursor-pointer"
            >
              {({ isActive }) => (
                <div className="relative flex flex-col items-center justify-center w-full h-full select-none">
                  <motion.div
                    animate={{
                      y: isActive ? -33 : 0,
                      scale: bounceActiveTabIdx === 1 
                        ? [1, 1.20, 1.10, 1.15] 
                        : (isActive ? 1.15 : 1),
                      color: isActive ? "#081630" : "rgba(255, 255, 255, 0.45)"
                    }}
                    transition={bounceActiveTabIdx === 1 ? { duration: 0.35, ease: "easeInOut" } : springConfig}
                    className="z-10 flex items-center justify-center pointer-events-none"
                  >
                    <List className="w-[22px] h-[22px] stroke-[2.3]" />
                  </motion.div>
                  <motion.span
                    animate={{
                      opacity: isActive ? 1 : 0,
                      y: isActive ? 0 : 8,
                      scale: isActive ? 1 : 0.95
                    }}
                    transition={springConfig}
                    className="absolute bottom-[8px] text-[10px] font-extrabold tracking-wide text-[#00bcd4] pointer-events-none"
                  >
                    แม่หมู
                  </motion.span>
                </div>
              )}
            </NavLink>

            {/* Tab 3: Calendar */}
            <NavLink 
              to="/calendar" 
              replace
              onClick={() => handleTabClick(2)}
              className="relative flex-1 h-full flex flex-col items-center justify-center cursor-pointer"
            >
              {({ isActive }) => (
                <div className="relative flex flex-col items-center justify-center w-full h-full select-none">
                  <motion.div
                    animate={{
                      y: isActive ? -33 : 0,
                      scale: bounceActiveTabIdx === 2 
                        ? [1, 1.20, 1.10, 1.15] 
                        : (isActive ? 1.15 : 1),
                      color: isActive ? "#081630" : "rgba(255, 255, 255, 0.45)"
                    }}
                    transition={bounceActiveTabIdx === 2 ? { duration: 0.35, ease: "easeInOut" } : springConfig}
                    className="z-10 flex items-center justify-center pointer-events-none"
                  >
                    <CalendarIcon className="w-[22px] h-[22px] stroke-[2.3]" />
                  </motion.div>
                  <motion.span
                    animate={{
                      opacity: isActive ? 1 : 0,
                      y: isActive ? 0 : 8,
                      scale: isActive ? 1 : 0.95
                    }}
                    transition={springConfig}
                    className="absolute bottom-[8px] text-[10px] font-extrabold tracking-wide text-[#00bcd4] pointer-events-none"
                  >
                    ปฏิทิน
                  </motion.span>
                </div>
              )}
            </NavLink>

            {/* Tab 4: Pen Map */}
            <NavLink 
              to="/pen-map" 
              replace
              onClick={() => handleTabClick(3)}
              className="relative flex-1 h-full flex flex-col items-center justify-center cursor-pointer"
            >
              {({ isActive }) => (
                <div className="relative flex flex-col items-center justify-center w-full h-full select-none">
                  <motion.div
                    animate={{
                      y: isActive ? -33 : 0,
                      scale: bounceActiveTabIdx === 3 
                        ? [1, 1.20, 1.10, 1.15] 
                        : (isActive ? 1.15 : 1),
                      color: isActive ? "#081630" : "rgba(255, 255, 255, 0.45)"
                    }}
                    transition={bounceActiveTabIdx === 3 ? { duration: 0.35, ease: "easeInOut" } : springConfig}
                    className="z-10 flex items-center justify-center pointer-events-none"
                  >
                    <MapPin className="w-[22px] h-[22px] stroke-[2.3]" />
                  </motion.div>
                  <motion.span
                    animate={{
                      opacity: isActive ? 1 : 0,
                      y: isActive ? 0 : 8,
                      scale: isActive ? 1 : 0.95
                    }}
                    transition={springConfig}
                    className="absolute bottom-[8px] text-[10px] font-extrabold tracking-wide text-[#00bcd4] pointer-events-none"
                  >
                    ตำแหน่ง
                  </motion.span>
                </div>
              )}
            </NavLink>

          </div>
        </div>
      </div>

      {/* Render the unified Settings & Profile Hub with pop-up editing */}
      <ProfileSettingsHub isOpen={isProfileHubOpen} onClose={() => setIsProfileHubOpen(false)} />
    </div>
  );
}
