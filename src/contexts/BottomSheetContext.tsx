import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import lottie from 'lottie-web';

// Import animations from the root directory
import loadingAnimation from '../../loading_status.json';
import successAnimation from '../../success_status.json';
import errorAnimation from '../../error.json';

// Safe Lottie Component for React 19 to avoid hook/ref cleanup crashes
const SafeLottie = ({
  animationData,
  loop = true,
  autoplay = true,
  style
}: {
  animationData: any;
  loop?: boolean;
  autoplay?: boolean;
  style?: React.CSSProperties;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !animationData) return;

    try {
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }

      animRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop,
        autoplay,
        animationData: animationData,
      });
    } catch (err) {
      console.error("Lottie player error:", err);
    }

    return () => {
      if (animRef.current) {
        try {
          animRef.current.destroy();
        } catch (e) {
          console.error("Lottie destroy error:", e);
        }
        animRef.current = null;
      }
    };
  }, [animationData, loop, autoplay]);

  return <div ref={containerRef} style={style} className="flex items-center justify-center" />;
};

type BottomSheetOptions = {
  title?: string;
  message: string;
  type?: 'alert' | 'confirm';
  status?: 'success' | 'error' | 'default';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type LoadingState = {
  isOpen: boolean;
  message: string;
  title: string;
};

type BottomSheetContextType = {
  showAlert: (message: string, title?: string, status?: 'success' | 'error' | 'default') => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showConfirm: (message: string, onConfirm: () => void, title?: string, onCancel?: () => void) => void;
  showBottomSheet: (content: ReactNode) => void;
  close: () => void;
  showLoading: (message?: string, title?: string) => void;
  hideLoading: () => void;
};

const BottomSheetContext = createContext<BottomSheetContextType | undefined>(undefined);

const refineMessage = (msg: string) => {
  let formatted = msg;
  if (formatted.includes('บันทึก') || formatted.includes('เซฟ')) {
    formatted = 'กำลังบันทึกข้อมูลค่ะ...';
  } else if (formatted.includes('อัปโหลด') || formatted.includes('อัพโหลด') || formatted.includes('ส่งข้อ')) {
    formatted = 'กำลังอัพโหลดข้อมูลค่ะ...';
  } else {
    if (!formatted.endsWith('ค่ะ') && !formatted.endsWith('ค่ะ...') && !formatted.endsWith('ครับ') && !formatted.endsWith('ครับ...')) {
      formatted = formatted.replace(/\.?\.?\.?$/, 'ค่ะ');
    }
  }
  return formatted;
};

export const BottomSheetProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<BottomSheetOptions | null>(null);
  const [content, setContent] = useState<ReactNode | null>(null);
  
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isOpen: false,
    message: '',
    title: ''
  });
  
  const [showLoadingCloseBtn, setShowLoadingCloseBtn] = useState(false);
  const loadingTimeoutRef = useRef<any>(null);
  const btnShowTimeoutRef = useRef<any>(null);

  const showLoading = (message: string = 'กำลังบันทึกข้อมูล...', title: string = 'กำลังประมวลผล') => {
    // Clear any previous timers
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    if (btnShowTimeoutRef.current) clearTimeout(btnShowTimeoutRef.current);

    setShowLoadingCloseBtn(false);

    const refined = refineMessage(message);

    setLoadingState({
      isOpen: true,
      message: refined,
      title
    });

    // Show close button after 6 seconds so the user is never trapped
    btnShowTimeoutRef.current = setTimeout(() => {
      setShowLoadingCloseBtn(true);
    }, 6000);

    // After 4.5 seconds of loading, transition to a friendly, reassuring message
    // "กำลังจะสำเร็จแล้วค่ะ" instead of triggering a timeout error.
    loadingTimeoutRef.current = setTimeout(() => {
      setLoadingState(prev => {
        if (prev.isOpen) {
          return {
            ...prev,
            message: 'กำลังจะสำเร็จแล้วค่ะ อดใจรออีกนิดนะคะ...'
          };
        }
        return prev;
      });
    }, 4500);
  };

  const hideLoading = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (btnShowTimeoutRef.current) {
      clearTimeout(btnShowTimeoutRef.current);
      btnShowTimeoutRef.current = null;
    }
    setLoadingState(prev => ({ ...prev, isOpen: false }));
    setShowLoadingCloseBtn(false);
  };

  const showAlert = (message: string, title?: string, status?: 'success' | 'error' | 'default') => {
    setContent(null);
    setOptions({ message, title, type: 'alert', status });
    setIsOpen(true);
  };

  const showSuccess = (message: string, title?: string) => {
    showAlert(message, title || 'บันทึกสำเร็จ', 'success');
  };

  const showError = (message: string, title?: string) => {
    showAlert(message, title || 'เกิดข้อผิดพลาด', 'error');
  };

  const showConfirm = (message: string, onConfirm: () => void, title?: string, onCancel?: () => void) => {
    setContent(null);
    setOptions({ message, title, type: 'confirm', onConfirm, onCancel });
    setIsOpen(true);
  };

  const showBottomSheet = (content: ReactNode) => {
    setOptions(null);
    setContent(content);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setTimeout(() => {
      setOptions(null);
      setContent(null);
    }, 300); // Allow animation to finish
  };

  // Helper detection for backward compatibility
  const isSuccessAlert = options?.status === 'success' || 
    (options?.type === 'alert' && options?.message && /สำเร็จ|สำเร็จแล้ว|เรียบร้อย|ผ่าน/.test(options.message));
    
  const isErrorAlert = options?.status === 'error' || 
    (options?.type === 'alert' && options?.message && /ผิดพลาด|ล้มเหลว|ไม่สำเร็จ|ไม่สามารถ|เสร็จไม่สิ้น|หลุด|เกิดความผิดพลาด/.test(options.message));

  return (
    <BottomSheetContext.Provider value={{ 
      showAlert, 
      showSuccess, 
      showError, 
      showConfirm, 
      showBottomSheet, 
      close,
      showLoading,
      hideLoading
    }}>
      {children}

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] transition-opacity animate-fade-in"
          onClick={close}
        />
      )}

      {/* Bottom Sheet / Alert UI */}
      <div 
        className={clsx(
          "fixed bottom-0 left-0 right-0 z-[101] bg-[#0E214B]/95 backdrop-blur-xl border-t border-white/10 rounded-t-[2.5rem] shadow-[0_-15px_45px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out flex flex-col max-h-[90vh] text-white dark",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-4 mb-2 shrink-0" />
        
        <div className="p-6 overflow-y-auto dark text-white">
          {content ? (
            <div className="dark text-white">
              {content}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Lottie Animations for Alerts */}
              {options?.type === 'alert' && (
                <div className="w-36 h-36 flex items-center justify-center mb-2">
                  {isSuccessAlert ? (
                    <SafeLottie 
                      animationData={successAnimation} 
                      loop={false}
                      style={{ width: 140, height: 140 }}
                    />
                  ) : isErrorAlert ? (
                    <SafeLottie 
                      animationData={errorAnimation} 
                      loop={false}
                      style={{ width: 140, height: 140 }}
                    />
                  ) : (
                    <SafeLottie 
                      animationData={loadingAnimation} 
                      loop={true}
                      style={{ width: 120, height: 120 }}
                    />
                  )}
                </div>
              )}

              {options?.type === 'confirm' && (
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                  <AlertCircle className="w-10 h-10 text-amber-400 animate-pulse" />
                </div>
              )}

              <h3 className="text-2xl font-black text-white mb-2 text-center">
                {options?.title || (
                  isSuccessAlert ? 'สำเร็จ!' : isErrorAlert ? 'เกิดข้อผิดพลาด!' : 'แจ้งเตือน'
                )}
              </h3>
              
              <p className="text-white/80 text-base mb-6 whitespace-pre-wrap text-center max-w-md font-medium">
                {options?.message}
              </p>

              <div className="flex gap-4 w-full max-w-sm">
                {options?.type === 'confirm' && (
                  <button
                    onClick={() => {
                      if (options?.onCancel) options.onCancel();
                      close();
                    }}
                    className="flex-1 py-3.5 px-4 rounded-2xl font-bold text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer"
                  >
                    {options?.cancelText || 'ยกเลิก'}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (options?.onConfirm) options.onConfirm();
                    close();
                  }}
                  className={clsx(
                    "flex-1 py-3.5 px-4 rounded-2xl font-extrabold text-white transition-all shadow-lg cursor-pointer",
                    isSuccessAlert ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/15" :
                    isErrorAlert ? "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-red-500/15" :
                    "bg-[#00bcd4] hover:bg-[#00bcd4]/80 shadow-[#00bcd4]/20"
                  )}
                >
                  {options?.confirmText || 'ตกลง'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Loading Overlay */}
      {loadingState.isOpen && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-md z-[120] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="bg-white/10 dark:bg-slate-800/40 backdrop-blur-lg border border-white/20 p-8 rounded-3xl flex flex-col items-center max-w-sm w-full shadow-2xl">
            <div className="w-48 h-48 flex items-center justify-center mb-4">
              <SafeLottie 
                animationData={loadingAnimation} 
                loop={true} 
                style={{ width: 180, height: 180 }}
              />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {loadingState.title}
            </h3>
            <p className="text-white/85 text-base animate-pulse">
              {loadingState.message}
            </p>
            {showLoadingCloseBtn && (
              <button
                type="button"
                onClick={hideLoading}
                className="mt-6 px-5 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-sm font-semibold transition-all border border-white/20 shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                ย้อนกลับ (ปิดหน้าจอนี้)
              </button>
            )}
          </div>
        </div>
      )}
    </BottomSheetContext.Provider>
  );
};

export const useBottomSheet = () => {
  const context = useContext(BottomSheetContext);
  if (context === undefined) {
    throw new Error('useBottomSheet must be used within a BottomSheetProvider');
  }
  return context;
};
