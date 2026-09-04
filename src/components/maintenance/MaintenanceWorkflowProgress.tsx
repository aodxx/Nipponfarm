import { Check, ClipboardList, Inbox, Wrench, CheckCircle2 } from 'lucide-react';

type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

interface MaintenanceWorkflowProgressProps {
  status: MaintenanceStatus;
}

const steps = [
  { key: 'REPORTED', label: 'แจ้งซ่อม', icon: ClipboardList },
  { key: 'PENDING', label: 'รับเรื่อง', icon: Inbox },
  { key: 'IN_PROGRESS', label: 'กำลังดำเนินการ', icon: Wrench },
  { key: 'RESOLVED', label: 'ปิดงาน', icon: CheckCircle2 },
] as const;

const statusIndex: Record<MaintenanceStatus, number> = {
  PENDING: 1,
  IN_PROGRESS: 2,
  RESOLVED: 3,
};

export default function MaintenanceWorkflowProgress({ status }: MaintenanceWorkflowProgressProps) {
  const current = statusIndex[status];

  return (
    <section aria-label="ขั้นตอนงานซ่อม" className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#102247]/90">
      <div className="mb-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">Maintenance workflow</p>
        <h3 className="mt-0.5 text-base font-black text-slate-950 dark:text-white">สถานะงานซ่อม</h3>
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
              <span className={`mt-2 text-[10px] font-bold leading-tight ${active ? 'text-slate-950 dark:text-white' : 'text-slate-400 dark:text-white/35'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
