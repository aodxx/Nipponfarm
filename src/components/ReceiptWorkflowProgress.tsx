import { Check, Camera, Sparkles, ClipboardCheck, Save, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ReceiptStage = 'capture' | 'processing' | 'review' | 'saving';

interface ReceiptWorkflowProgressProps {
  stage: ReceiptStage;
}

const steps = [
  { key: 'capture', label: 'ถ่ายบิล', icon: Camera },
  { key: 'processing', label: 'AI อ่าน', icon: Sparkles },
  { key: 'review', label: 'ตรวจสอบ', icon: ClipboardCheck },
  { key: 'saving', label: 'บันทึก', icon: Save },
] as const;

const stageIndex: Record<ReceiptStage, number> = {
  capture: 0,
  processing: 1,
  review: 2,
  saving: 3,
};

export default function ReceiptWorkflowProgress({ stage }: ReceiptWorkflowProgressProps) {
  const navigate = useNavigate();
  const current = stageIndex[stage];

  return (
    <section className="px-4 pt-3" aria-label="ขั้นตอนบันทึกรายจ่ายจากบิล">
      <div className="mx-auto max-w-3xl rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#102247]/90">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">Receipt → Expense</p>
            <h2 className="mt-0.5 text-base font-black text-slate-950 dark:text-white">บันทึกรายจ่ายจากบิล</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/scan/history')}
            className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 transition active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-white/80"
            aria-label="เปิดประวัติรายจ่าย"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">ประวัติ</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const done = index < current;
            const active = index === current;
            return (
              <div key={step.key} className="relative flex min-w-0 flex-col items-center text-center">
                {index < steps.length - 1 && (
                  <div className="absolute left-[58%] top-5 h-0.5 w-[84%] bg-slate-200 dark:bg-white/10" aria-hidden="true">
                    <div className={`h-full transition-all ${done ? 'w-full bg-cyan-500' : 'w-0'}`} />
                  </div>
                )}
                <div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${
                    done
                      ? 'border-cyan-500 bg-cyan-500 text-white'
                      : active
                        ? 'border-[#0E214B] bg-[#0E214B] text-cyan-300 shadow-md shadow-slate-900/15 dark:border-cyan-400'
                        : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white/30'
                  }`}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className={`mt-2 truncate text-[11px] font-bold ${active ? 'text-slate-950 dark:text-white' : 'text-slate-400 dark:text-white/35'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
