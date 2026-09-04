import { ChevronRight, MapPinned } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SowList from './SowList';

export default function FarmHub() {
  const navigate = useNavigate();

  return (
    <div>
      <button
        onClick={() => navigate('/pen-map')}
        className="mb-6 flex w-full items-center gap-4 rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-white p-4 text-left shadow-sm transition-all active:scale-[0.99] dark:border-cyan-400/20 dark:from-cyan-500/10 dark:to-white/5"
        aria-label="เปิดผังคอกเพื่อดูตำแหน่งแม่พันธุ์และพ่อพันธุ์"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-sm">
          <MapPinned className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-950 dark:text-white">ผังคอก</p>
          <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-white/55">
            ดูตำแหน่งแม่พันธุ์–พ่อพันธุ์ในแต่ละกรง และย้ายตำแหน่งได้
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-cyan-700 dark:text-cyan-300" />
      </button>

      <SowList />
    </div>
  );
}
