import React, { useState, useEffect } from 'react';
import { Download, X, Share, Smartphone, ExternalLink, Check, Copy, AlertTriangle, MoreVertical, Compass, Globe } from 'lucide-react';

declare global {
  interface Window {
    deferredPWAInstallPrompt?: any;
    triggerPWAInstall?: (forceModal?: boolean) => void;
  }
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Environment checks
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    // Check standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check iframe
    const inIframe = window !== window.parent;
    setIsIframe(inIframe);

    // Check OS
    const ua = navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIosDevice);

    // Check Safari on iOS
    const isSafariBrowser = isIosDevice && /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS|Line|FBAN|FBAV/i.test(ua);
    setIsSafari(isSafariBrowser);

    // Check In-App Browser (LINE, Facebook, Messenger, Instagram, TikTok)
    const inApp = /Line|FBAN|FBAV|Instagram|TikTok|MicroMessenger/i.test(ua);
    setIsInAppBrowser(inApp);

    // Listen for Chrome/Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPWAInstallPrompt = e;

      // Show banner if not installed, not in iframe, and user hasn't dismissed before
      const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed && !standalone && !inIframe) {
        setShowBanner(true);
      }
    };

    // Global trigger function for Settings page or custom buttons
    window.triggerPWAInstall = (forceModal = true) => {
      const promptEvent = window.deferredPWAInstallPrompt || deferredPrompt;
      if (promptEvent && !forceModal) {
        promptEvent.prompt();
        promptEvent.userChoice.then(() => {
          window.deferredPWAInstallPrompt = null;
          setDeferredPrompt(null);
          setShowBanner(false);
          setShowModal(false);
        });
      } else {
        setShowModal(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show banner on mobile iOS if not standalone and not iframe and not dismissed
    if (isIosDevice && !standalone && !inIframe) {
      const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleNativeInstall = async () => {
    const promptEvent = deferredPrompt || window.deferredPWAInstallPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        window.deferredPWAInstallPrompt = null;
        setDeferredPrompt(null);
        setShowBanner(false);
        setShowModal(false);
      }
    } else {
      setShowModal(true);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDismissBanner = () => {
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    setShowBanner(false);
  };

  // Do not render anything if already installed as PWA app
  if (isStandalone) return null;

  return (
    <>
      {/* 1. Floating Bottom Banner for fast access */}
      {showBanner && !showModal && !isIframe && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-white dark:bg-[#1a2f3a] border border-emerald-500/30 shadow-2xl rounded-2xl p-4 z-[9998] flex items-start gap-3 animate-in slide-in-from-bottom fade-in duration-300">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">ติดตั้งแอป นิพนธ์ฟาร์ม</h3>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 leading-relaxed">
              เพิ่มลงในหน้าจอโฮมมือถือ เพื่อการใช้งานเต็มจอ สะดวกรวดเร็ว
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={handleNativeInstall}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {deferredPrompt ? 'ติดตั้งลงมือถือทันที' : 'ดูวิธีเพิ่มลงหน้าจอโฮม'}
              </button>
            </div>
          </div>
          <button 
            onClick={handleDismissBanner} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="ปิด"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Full PWA Installation Guide Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#162a35] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">วิธีติดตั้งแอปลงในจอมือถือ</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">เพิ่ม นิพนธ์ฟาร์ม ลงบนหน้าจอหลัก (Home Screen)</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content body based on browser condition */}
            <div className="py-4 space-y-4">
              
              {/* CASE 1: App is running inside an embedded preview iframe */}
              {isIframe && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    กำลังเปิดในหน้าต่างตัวอย่าง (Preview)
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    เบราว์เซอร์จะบล็อกการติดตั้งแอปเมื่ออยู่ในหน้าต่างตัวอย่าง โปรดเปิดลิงก์แอปในหน้าต่างใหม่หรือคัดลอกลิงก์ไปเปิดใน <strong>Safari</strong> หรือ <strong>Chrome</strong> บนมือถือโดยตรงครับ
                  </p>
                  <div className="flex flex-col gap-2 pt-1">
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-center flex items-center justify-center gap-2 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      เปิดแอปในหน้าต่างใหม่ (Open in New Tab)
                    </a>
                  </div>
                </div>
              )}

              {/* CASE 2: Opened inside LINE / Facebook / Messenger / In-App browser */}
              {isInAppBrowser && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
                    <Globe className="w-4 h-4 shrink-0" />
                    กำลังเปิดผ่านเบราว์เซอร์ของแอป (LINE / Facebook)
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    แอป LINE / Facebook จำกัดการติดตั้ง PWA ให้คุณกดปุ่ม 3 จุดมุมขวาบนของแอป แล้วเลือก <strong>"เปิดในเบราว์เซอร์ภายนอก"</strong> (Open in Chrome/Safari)
                  </p>
                </div>
              )}

              {/* Native Android Prompt Button if caught */}
              {(deferredPrompt || window.deferredPWAInstallPrompt) && !isIframe && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-2 text-center">
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    เบราว์เซอร์พร้อมติดตั้งแอปทันทีเพียงกดปุ่มนี้
                  </p>
                  <button
                    onClick={handleNativeInstall}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    กดปุ่มนี้เพื่อติดตั้งลงมือถือทันที
                  </button>
                </div>
              )}

              {/* iOS Instructions */}
              {isIOS ? (
                <div className="space-y-3">
                  <div className="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 rounded-2xl p-4 space-y-3">
                    <h4 className="font-bold text-cyan-800 dark:text-cyan-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" /> สำหรับ iPhone / iPad (Safari)
                    </h4>
                    
                    {!isSafari && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-100/60 dark:bg-amber-950/60 p-2 rounded-lg">
                        ⚠️ คุณกำลังไม่ได้ใช้ Safari โปรดคัดลอกลิงก์ไปเปิดใน Safari ก่อนครับ
                      </p>
                    )}

                    <ol className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                        <span>เปิดเว็บนี้ในเบราว์เซอร์ <strong>Safari</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                        <span>แตะปุ่ม <Share className="w-3.5 h-3.5 inline text-cyan-600 dark:text-cyan-400 mx-0.5" /> <strong>"แชร์" (Share)</strong> ตรงแถบด้านล่างของ Safari</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                        <span>เลื่อนลงแล้วกดแตะเมนู <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
                        <span>กดปุ่ม <strong>"เพิ่ม" (Add)</strong> มุมขวาบน เพื่อเสร็จสิ้น</span>
                      </li>
                    </ol>
                  </div>
                </div>
              ) : (
                /* Android / Chrome Manual Instructions */
                <div className="space-y-3">
                  <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <MoreVertical className="w-4 h-4" /> สำหรับ Android (Chrome / Samsung Internet)
                    </h4>
                    
                    <ol className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                        <span>แตะปุ่ม <strong>เมนู 3 จุด (⋮)</strong> มุมขวาบนของเบราว์เซอร์ Chrome</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                        <span>เลือกเมนู <strong>"ติดตั้งแอป" (Install app)</strong> หรือ <strong>"เพิ่มลงในหน้าจอหลัก" (Add to Home Screen)</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                        <span>กดยืนยัน ไอคอนแอป นิพนธ์ฟาร์ม จะไปปรากฏบนจอมือถือของคุณทันที</span>
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Copy URL helper button */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleCopyLink}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      คัดลอกลิงก์สำเร็จแล้ว! วางใน Safari หรือ Chrome ได้เลย
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      คัดลอกลิงก์แอปเพื่อนำไปเปิดใน Safari/Chrome
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                เข้าใจแล้ว / ปิดหน้าต่างนี้
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
