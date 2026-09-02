import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export default function SplashScreen() {
  const { loading } = useAuth();
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    // Ensure the splash screen is shown for at least 2.5 seconds to play its animation beautifully
    const timer = setTimeout(() => {
      setMinimumTimeElapsed(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Hide when both backend loading has finished and minimum time has elapsed
    if (!loading && minimumTimeElapsed) {
      setIsVisible(false);
    }
  }, [loading, minimumTimeElapsed]);

  // Real-time clock update from device
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${hrs}:${mins} น.`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[999999] bg-gradient-to-b from-[#f0fdf4] via-[#f8fafc] to-[#f1f5f9] flex flex-col items-center justify-between py-16 overflow-hidden select-none"
          id="splash-screen-container"
        >
          {/* Ambient Natural Lighting Glows */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-200/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-200/20 rounded-full blur-[100px] pointer-events-none" />

          {/* Top Section: Clock Badge */}
          <div className="w-full flex justify-center z-20">
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="bg-emerald-950/5 border border-emerald-500/20 px-4 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 shadow-sm"
              id="splash-clock-badge"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-950 font-mono font-black text-xs tracking-wider">{timeStr}</span>
            </motion.div>
          </div>

          {/* Middle Section: Clean Pure Motion Loader */}
          <div className="flex-1 flex items-center justify-center relative w-full max-w-md z-10">
            <div className="relative flex items-center justify-center w-64 h-64">
              {/* Outer Pulsating Ring */}
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.15, 0.4, 0.15],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute w-44 h-44 rounded-full border border-emerald-500/20 bg-emerald-500/5"
              />

              {/* Middle Pulsating Ring */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.3,
                }}
                className="absolute w-32 h-32 rounded-full border border-emerald-500/30 bg-emerald-500/10"
              />

              {/* Inner Rotating Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute w-20 h-20 rounded-full border-2 border-dashed border-emerald-500/40"
              />

              {/* Center Glowing Core */}
              <motion.div
                animate={{
                  scale: [0.9, 1.1, 0.9],
                  boxShadow: [
                    "0 0 10px rgba(16, 185, 129, 0.2)",
                    "0 0 25px rgba(16, 185, 129, 0.5)",
                    "0 0 10px rgba(16, 185, 129, 0.2)",
                  ],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-black shadow-lg"
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </motion.div>
            </div>
          </div>

          {/* Bottom Section: Brand and Status Card */}
          <div className="flex flex-col items-center gap-6 z-20 px-4 text-center w-full" id="splash-brand-container">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-col items-center gap-1.5"
            >
              <h1 className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight" id="splash-title">
                นิพนธ์ฟาร์ม
              </h1>
              <p className="text-emerald-700/80 font-extrabold tracking-wider text-xs sm:text-sm uppercase" id="splash-subtitle">
                Nipon Farm Digital Systems
              </p>
            </motion.div>

            {/* Pulsing Loading Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center gap-3 bg-white/80 border border-slate-200/60 px-6 py-2.5 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.03)] backdrop-blur-md"
              id="splash-loading-card"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <p className="text-slate-600 font-bold tracking-wide text-xs sm:text-sm">
                กำลังตรวจสอบข้อมูลผู้ใช้...
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
