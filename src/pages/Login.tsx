import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ExternalLink, ShieldCheck, UserCheck } from 'lucide-react';
import PigLogo from '../components/PigLogo';

export default function Login() {
  const { signInWithGoogle, signInDemo, user, loading } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inIframe, setInIframe] = useState(false);
  const [demoLoading, setDemoLoading] = useState<'ADMIN' | 'STAFF' | null>(null);

  useEffect(() => {
    try {
      setInIframe(window.self !== window.top);
    } catch (e) {
      setInIframe(true);
    }
  }, []);

  useEffect(() => {
    if (user && !loading && !demoLoading) {
      navigate('/', { replace: true });
    }
  }, [user, loading, demoLoading, navigate]);

  const handleLogin = async () => {
    setErrorMessage(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('คุณปิดหน้าต่างล็อกอินเร็วเกินไป โปรดรอให้หน้าต่างโหลดเสร็จหรือลอง "เปิดในแท็บใหม่"');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป โปรดกดที่ไอคอน "เปิดในแท็บใหม่" มุมขวาบนครับ');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMessage('การเชื่อมต่อล้มเหลว โปรดลอง "เปิดในแท็บใหม่" หรือใช้ปุ่ม "ล็อกอินด่วน (Bypass)" ด้านล่างได้ทันทีครับ');
      } else {
        setErrorMessage('เกิดข้อผิดพลาด: ' + (err.message || 'โปรดลองใหม่อีกครั้ง'));
      }
    }
  };

  const handleDemoLogin = async (role: 'ADMIN' | 'STAFF') => {
    setErrorMessage(null);
    setDemoLoading(role);
    try {
      await signInDemo(role);
    } catch (err: any) {
      console.error('Demo login error:', err);
      setErrorMessage('เกิดข้อผิดพลาดในการล็อกอินด่วน: ' + (err.message || 'โปรดลองใหม่อีกครั้ง'));
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a2e36] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00bcd4]/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00bcd4]/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="bg-white dark:bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-500 border border-slate-200 dark:border-white/20 z-10">
        <div className="mx-auto w-24 h-24 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] border border-slate-200 dark:border-white/10 pb-2">
          <PigLogo className="w-16 h-16 text-[#00bcd4]" animate={true} />
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-wide font-sans">นิพนธ์ฟาร์ม</h1>
          <p className="text-slate-600 dark:text-white/60 text-sm font-medium">ระบบจัดการฟาร์มสุกรแบบมืออาชีพ</p>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium text-left flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <span className="block mt-0.5 text-lg">⚠️</span>
              <span className="font-bold">{errorMessage}</span>
            </div>
            <div className="text-xs text-red-500 dark:text-red-300 opacity-90 leading-relaxed pl-7">
              <p className="mb-1 font-bold italic underline">วิธีแก้ปัญหาที่ได้ผลที่สุด:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>กดปุ่ม <b>"เข้าสู่ระบบด้วยบัญชีทดสอบ"</b> ด้านล่างเพื่อข้ามการเช็ค Google ทันที</li>
                <li>หรือกดที่รูป <b>เปิดในแท็บใหม่</b> ที่มุมขวาบนของพรีวิว และลองล็อกอินอีกครั้งครับ</li>
              </ul>
            </div>
          </div>
        )}

        {inIframe && (
          <div className="space-y-3">
            <a 
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#00bcd4] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#00acc1] active:scale-95 transition-all shadow-lg shadow-[#00bcd4]/20 border border-[#00bcd4]/10 group decoration-none select-none cursor-pointer text-sm"
            >
              <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>เปิดในแท็บใหม่เพื่อเซ็นต์เข้าใช้งาน</span>
            </a>
            <div className="flex items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
              <span className="px-3 text-xs text-slate-400 dark:text-white/40 font-medium">หรือเข้าสู่ระบบทางเลือกด้านล่าง</span>
              <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
            </div>
          </div>
        )}

        <button 
          onClick={handleLogin}
          disabled={loading || !!demoLoading}
          className="w-full bg-blue-600 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-700 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group text-sm"
        >
          {loading && !demoLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="bg-white p-1 rounded">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
              </div>
              <span>เข้าสู่ระบบด้วย Google</span>
            </div>
          )}
        </button>

        {/* Dynamic Fallback/Demo Login Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
            <span className="px-3 text-[11px] text-slate-400 dark:text-white/40 font-medium uppercase tracking-wider">บัญชีทดลองระบบ / แก้ไขปัญหาเน็ตเวิร์ก</span>
            <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDemoLogin('ADMIN')}
              disabled={loading || !!demoLoading}
              className="flex flex-col items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl text-emerald-700 dark:text-emerald-400 font-bold transition-all active:scale-95 text-xs gap-1 cursor-pointer disabled:opacity-50"
            >
              {demoLoading === 'ADMIN' ? (
                <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"></div>
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>ผู้ดูแลระบบ (Admin)</span>
            </button>

            <button
              onClick={() => handleDemoLogin('STAFF')}
              disabled={loading || !!demoLoading}
              className="flex flex-col items-center justify-center p-3 bg-teal-50 dark:bg-teal-950/20 hover:bg-teal-100 dark:hover:bg-teal-900/30 border border-teal-200 dark:border-teal-900/30 rounded-2xl text-teal-700 dark:text-teal-400 font-bold transition-all active:scale-95 text-xs gap-1 cursor-pointer disabled:opacity-50"
            >
              {demoLoading === 'STAFF' ? (
                <div className="w-4 h-4 border-2 border-teal-500/30 border-t-teal-600 rounded-full animate-spin"></div>
              ) : (
                <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              )}
              <span>พนักงานทั่วไป (Staff)</span>
            </button>
          </div>
        </div>
        
        <div className="text-left bg-[#00bcd4]/5 dark:bg-[#00bcd4]/10 p-3 rounded-2xl border border-[#00bcd4]/15 backdrop-blur-sm">
          <p className="text-[11px] text-[#00bcd4] dark:text-[#00bcd4] flex items-start gap-1.5 leading-relaxed font-sans">
            <span className="text-sm">💡</span>
            <span>แนะนำสำหรับโหมดพรีวิว: หากล็อกอินผ่าน Google หมุนค้างหรือแจ้งข้อผิดพลาด Network Request Failed โปรดกดเลือกปุ่ม <b>ผู้ดูแลระบบ (Admin)</b> ด้านบน เพื่อเริ่มสัมผัสฟาร์มจำลองได้ทันทีโดยไม่ต้องผ่านเซิร์ฟเวอร์ล็อกอินภายนอกครับ!</span>
          </p>
        </div>
      </div>
    </div>
  );
}
