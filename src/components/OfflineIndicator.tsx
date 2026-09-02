import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-slate-900 dark:text-white p-2 text-sm text-center flex items-center justify-center gap-2 z-[9999] animate-in slide-in-from-bottom">
      <WifiOff className="w-4 h-4" />
      <span>คุณกำลังใช้งานแบบออฟไลน์ (หรือไม่มีสัญญาณอินเทอร์เน็ต)</span>
    </div>
  );
}
