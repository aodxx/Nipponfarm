import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, CheckCircle, Clock, BellRing, Sun, Moon, Video, Smartphone, Download, Share, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import UserManagement from './UserManagement';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Settings() {
  const { user, userProfile, logout } = useAuth();
  const { showAlert } = useBottomSheet();
  const { theme, themeMode, setThemeMode } = useTheme();

  const isAdmin = userProfile?.role === 'ADMIN';
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Google Meet integration settings
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/yki-ggro-ymw');

  useEffect(() => {
    const docRef = doc(db, 'farm_settings', 'meeting');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsMeetingActive(!!data.is_meeting_active);
        if (data.meeting_link) {
          setMeetingLink(data.meeting_link);
        }
      }
    }, (err) => {
      console.warn("Could not synchronize meeting from farm_settings:", err);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleMeeting = async () => {
    try {
      const docRef = doc(db, 'farm_settings', 'meeting');
      const nextActiveState = !isMeetingActive;
      await setDoc(docRef, {
        is_meeting_active: nextActiveState,
        meeting_link: meetingLink,
        updatedAt: Date.now()
      }, { merge: true });
      showAlert(nextActiveState ? '📡 เริ่มจัดการประชุมฟาร์มแล้ว! ระบบกำลังเรียกแจ้งเตือนคนงาน' : '💤 ปิดห้องประชุมฟาร์มแล้ว');
    } catch (err) {
      console.error(err);
      showAlert('อัปเดตสถานะการประชุมล้มเหลว: ' + err);
    }
  };

  const handleSaveMeetingLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const docRef = doc(db, 'farm_settings', 'meeting');
      await setDoc(docRef, {
        meeting_link: meetingLink,
        updatedAt: Date.now()
      }, { merge: true });
      showAlert('บันทึกลิงก์ Google Meet ประจำฟาร์มสำเร็จแล้ว!');
    } catch (err) {
      console.error(err);
      showAlert('บันทึกลิงก์ล้มเหลว: ' + err);
    }
  };

  const testNotification = async () => {
    // 1. In-App Banner Simulation (For test, just Alert or BottomSheet, or System Notification)
    // Here we mainly test the Sound & System OS level Notification.
    
    // Play Sound
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }

      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          audioCtxRef.current = new AudioContext();
        }
      }
      
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      if (ctx) {
        const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, volume: number = 1) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = type;
          osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
          
          gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
          gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startTime + 0.02); 
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
          
          osc.start(ctx.currentTime + startTime);
          osc.stop(ctx.currentTime + startTime + duration);
        };

        // Modern soft double chime (like iOS or modern chat apps)
        playTone(880.00, 'sine', 0, 0.4, 0.5); // A5
        playTone(1760.00, 'sine', 0, 0.3, 0.2); // A6
        
        playTone(1174.66, 'sine', 0.15, 0.6, 0.5); // D6
        playTone(2349.32, 'sine', 0.15, 0.4, 0.2); // D7
      }
    } catch (err) {
      console.warn("Audio test failed", err);
    }

    // System Notification Popup
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification('ทดสอบการแจ้งเตือน', {
              body: 'นี่คือตัวอย่างข่าวด่วนหรือข้อความแชทใหม่ครับ',
              icon: '/icon.svg',
              vibrate: [200, 100, 200, 100, 400],
              tag: 'test-alert'
            } as any);
          } else {
            new Notification('ทดสอบการแจ้งเตือน', { 
              body: 'นี่คือตัวอย่างข่าวด่วนหรือข้อความแชทใหม่ครับ', 
              icon: '/icon.svg' 
            });
          }
        } catch (e) {
          console.warn("System Notification Test Failed", e);
          showAlert("ระบบ Browser ไม่รองรับการแสดง Popup (แต่คุณได้ยินเสียงแล้วใช่ไหม?)");
        }
      } else {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          showAlert("เปิดสิทธิ์แจ้งเตือนสำเร็จ ลองกดทดสอบอีกครั้ง!");
        } else {
          showAlert("คุณปฏิเสธการแจ้งเตือน (แต่คุณน่าจะได้ยินเสียงแล้วนะ)");
        }
      }
    } else {
      showAlert("อุปกรณ์นี้ไม่รองรับระบบแจ้งเตือน System (แต่คุณน่าจะได้ยินเสียง)");
    }
  };

  return (
    <div className="animate-in fade-in duration-300 pb-24">
      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">ตั้งค่าหน้าต่างและบัญชี</h2>
      
      <div className="bg-white dark:bg-[#1a2f3a] p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 mb-8">
        <div className="flex items-center gap-5 mb-2">
          <div className="w-28 h-28 bg-slate-100 dark:bg-white/10 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-white dark:border-white/20 shadow-md">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-xl object-cover border border-white/20 shadow-inner" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-4xl font-black text-slate-900 dark:text-white">{user?.displayName?.charAt(0) || 'อ'}</span>
            )}
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-3xl tracking-tight mb-2">
              {user?.displayName || 'ผู้ใช้งาน'}
            </h3>
            <div className="flex items-center gap-2">
              <span className={clsx("text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold tracking-wider", isAdmin ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/70")}>
                <CheckCircle className="w-3.5 h-3.5" />
                {isAdmin ? 'เจ้าของฟาร์ม' : 'พนักงาน'}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-white/50 font-medium mt-2">{user?.email}</p>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-8">
          <UserManagement />
        </div>
      )}

      {isAdmin && (
        <div className="bg-white dark:bg-[#1a2f3a] p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 mb-8 space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-xl text-slate-900 dark:text-white tracking-tight">ระบบเรียกประชุมด่วน (Google Meet)</h3>
              <p className="text-sm text-slate-500 dark:text-white/50">เปิด/ปิดสัญญานเรียกประชุมหลักพร้อมลิงก์ด่วน</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-150 dark:border-white/[0.03]">
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">สถานะสัญญาณเรียกประชุม (is_meeting_active)</p>
              <p className="text-xs text-slate-500 dark:text-white/40">เมื่อเปิดสัญญาณ โทรศัพท์มือถือรวมถึงเว็บของทีมงานทุกคนจะสะดุ้งสั่นพร้อมส่งเสียงเตือนทันที!</p>
            </div>
            <button
              type="button"
              onClick={handleToggleMeeting}
              className={clsx(
                "px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer whitespace-nowrap self-start sm:self-center",
                isMeetingActive 
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20" 
                  : "bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white"
              )}
            >
              {isMeetingActive ? '📡 กำลังส่งสัญญาน (กดปิด)' : '💤 ปิดสัญญาณอยู่ (กดเรียกประชุม)'}
            </button>
          </div>

          <form onSubmit={handleSaveMeetingLink} className="space-y-3">
            <div>
              <label className="block text-xs font-black text-slate-500 dark:text-white/40 uppercase tracking-widest mb-1.5">ลิงก์ห้องประชุม Google Meet ประจำฟาร์ม</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  required
                  className="flex-1 px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900/45 rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:border-[#00bcd4]/50 dark:focus:border-[#00bcd4]/50 text-slate-900 dark:text-white font-mono"
                />
                <button
                  type="submit"
                  className="px-5 py-3 bg-[#00bcd4] hover:bg-[#00bcd4]/90 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-sm shadow-[#00bcd4]/20"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white dark:bg-[#1a2f3a] rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-700 dark:text-white/70">
                {themeMode === 'dark' ? (
                  <Moon className="w-6 h-6 text-[#00bcd4]" />
                ) : themeMode === 'light' ? (
                  <Sun className="w-6 h-6 text-amber-500" />
                ) : (
                  <Clock className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                )}
              </div>
              <div>
                <p className="font-bold text-lg text-slate-900 dark:text-white">รูปแบบหน้าจอ</p>
                <p className="text-sm text-slate-500 dark:text-white/50">
                  {themeMode === 'auto' 
                    ? `ปรับอัตโนมัติ (สว่าง: 06:00 - 17:59 | มืด: 18:00 - 05:59)` 
                    : `โหมดแสดงผลแบบคงที่: โหมด${theme === 'dark' ? 'กลางคืน' : 'สว่าง'}`}
                </p>
              </div>
            </div>

            {/* Segmented Controller */}
            <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-900/45 rounded-2xl border border-slate-200/50 dark:border-white/[0.05]">
              <button
                onClick={() => setThemeMode('light')}
                className={clsx(
                  "py-2.5 rounded-xl font-bold text-sm transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer outline-none",
                  themeMode === 'light'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white/85"
                )}
              >
                <Sun className="w-4 h-4" />
                <span>สว่าง</span>
              </button>
              <button
                onClick={() => setThemeMode('dark')}
                className={clsx(
                  "py-2.5 rounded-xl font-bold text-sm transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer outline-none",
                  themeMode === 'dark'
                    ? "bg-white dark:bg-[#1a2f3a] text-slate-900 dark:text-white shadow-sm border border-slate-200/25 dark:border-white/5"
                    : "text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white/85"
                )}
              >
                <Moon className="w-4 h-4" />
                <span>กลางคืน</span>
              </button>
              <button
                onClick={() => setThemeMode('auto')}
                className={clsx(
                  "py-2.5 rounded-xl font-bold text-sm transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer outline-none",
                  themeMode === 'auto'
                    ? "bg-white dark:bg-[#1a2f3a] text-slate-900 dark:text-white shadow-sm border border-slate-200/25 dark:border-white/5"
                    : "text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white/85"
                )}
              >
                <Clock className="w-4 h-4" />
                <span>อัตโนมัติ</span>
              </button>
            </div>
          </div>

          <button 
            onClick={testNotification}
            className="w-full p-5 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-700 dark:text-white/70">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-lg text-slate-900 dark:text-white">ระบบเตือนความจำ</p>
                <p className="text-sm text-slate-500 dark:text-white/50">ทดสอบเสียงและป๊อปอัปแจ้งเตือนบนอุปกรณ์นี้</p>
              </div>
            </div>
          </button>

          <div className="p-5 space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-t border-emerald-100 dark:border-emerald-900/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-slate-900 dark:text-white">ติดตั้งแอปลงในจอมือถือ (PWA)</p>
                <p className="text-sm text-slate-500 dark:text-white/50">เปิดใช้งานแอปแบบเต็มจอ รวดเร็ว ปราศจากแถบ URL เบราว์เซอร์</p>
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-[#1a2f3a] rounded-2xl border border-emerald-200/60 dark:border-white/10 text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <p className="font-bold text-emerald-700 dark:text-emerald-400">📲 คำแนะนำตามชนิดระบบปฏิบัติการ:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                <li>
                  <strong>Android (Chrome / Samsung Internet):</strong> กดปุ่มด้านล่าง หรือแตะปุ่ม 3 จุดมุมขวาบนของเบราว์เซอร์ แล้วเลือก <i>"ติดตั้งแอป"</i> หรือ <i>"เพิ่มไปยังหน้าจอหลัก"</i>
                </li>
                <li>
                  <strong>iOS (iPhone / iPad - Safari):</strong> แตะปุ่มแชร์ <Share className="w-3.5 h-3.5 inline text-cyan-600 dark:text-cyan-400" /> ด้านล่างของ Safari แล้วเลือก <i>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</i>
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                if (window.triggerPWAInstall) {
                  window.triggerPWAInstall(true);
                } else {
                  showAlert('ระบบพร้อมติดตั้งแล้ว! กรุณาคัดลอกลิงก์ไปเปิดใน Safari หรือ Chrome แล้วเลือก "เพิ่มไปยังหน้าจอโฮม"');
                }
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              ติดตั้งแอปลงจอมือถือทันที
            </button>
          </div>
        </div>

        <button 
          onClick={logout}
          className="w-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 p-5 rounded-[2rem] border border-red-200 dark:border-red-500/20 font-black flex items-center justify-center gap-3 hover:bg-red-100 dark:hover:bg-red-500/20 active:scale-[0.98] transition-all text-xl mt-8"
        >
          <LogOut className="w-6 h-6" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}
