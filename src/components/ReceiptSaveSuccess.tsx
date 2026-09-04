import { CheckCircle2, History, ScanLine } from 'lucide-react';

interface ReceiptSaveSuccessProps {
  vendorName: string;
  totalAmount: number;
  onScanNext: () => void;
  onOpenHistory: () => void;
}

export default function ReceiptSaveSuccess({
  vendorName,
  totalAmount,
  onScanNext,
  onOpenHistory,
}: ReceiptSaveSuccessProps) {
  return (
    <main className="min-h-[calc(100vh-7rem)] px-4 pb-28 pt-8">
      <section className="mx-auto max-w-lg overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/95 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-[#102247]/95">
        <div className="bg-[#0E214B] px-6 pb-8 pt-10 text-center text-white">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-cyan-400/15 ring-1 ring-cyan-300/30">
            <CheckCircle2 className="h-11 w-11 text-cyan-300" strokeWidth={2.4} />
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Receipt saved</p>
          <h1 className="mt-2 text-2xl font-black">บันทึกรายจ่ายแล้ว</h1>
          <p className="mt-2 text-sm font-medium text-white/65">ข้อมูลบิลและรายการสินค้าถูกบันทึกเรียบร้อยแล้ว</p>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-[1.5rem] border border-slate-200/70 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">ร้านค้า</p>
            <p className="mt-1 truncate text-lg font-black text-slate-950 dark:text-white">{vendorName || 'ไม่ระบุร้านค้า'}</p>
            <div className="mt-4 flex items-end justify-between gap-4 border-t border-slate-200/70 pt-4 dark:border-white/10">
              <span className="text-sm font-bold text-slate-500 dark:text-white/50">ยอดรายจ่าย</span>
              <span className="text-3xl font-black tracking-tight text-rose-500">฿{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onScanNext}
            className="flex min-h-14 w-full items-center justify-center gap-3 rounded-[1.25rem] bg-[#0E214B] px-5 text-base font-black text-white shadow-lg shadow-slate-900/10 transition active:scale-[0.985] dark:bg-cyan-500 dark:text-[#07152f]"
          >
            <ScanLine className="h-5 w-5" />
            สแกนบิลถัดไป
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition active:scale-[0.985] dark:border-white/10 dark:bg-white/5 dark:text-white/80"
          >
            <History className="h-4 w-4" />
            ดูประวัติรายจ่าย
          </button>
        </div>
      </section>
    </main>
  );
}
