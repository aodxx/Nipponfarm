import type { ComponentType } from 'react';
import { AlertTriangle, CalendarDays, Camera, ChevronRight, CircleDollarSign, ClipboardList, PiggyBank, Plus, Receipt, Wrench } from 'lucide-react';
import { isPast, isToday, parseISO } from 'date-fns';
import type { UnifiedWorkItem } from '../../lib/taskEngine';

type Navigate = (to: string) => void;
type IconType = ComponentType<{ className?: string }>;

export function TodaySummarySection({
  exceptionCount,
  overdueCount,
  todayCount,
  navigate,
}: {
  exceptionCount: number;
  overdueCount: number;
  todayCount: number;
  navigate: Navigate;
}) {
  return (
    <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">วันนี้ต้องทำอะไร</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">งานสำคัญของฟาร์มวันนี้</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-white/60">เริ่มจากเหตุผิดปกติ งานค้าง และงานถึงกำหนดก่อน</p>
        </div>
        <button onClick={() => navigate('/calendar')} className="flex min-h-11 shrink-0 items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800 active:scale-95 dark:bg-white/10 dark:text-white">
          <CalendarDays className="h-5 w-5" /> ปฏิทิน
        </button>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <SummaryCard label="ต้องระวัง" value={exceptionCount} tone="danger" />
        <SummaryCard label="เกินกำหนด" value={overdueCount} tone="warning" />
        <SummaryCard label="วันนี้" value={todayCount} tone="normal" />
      </div>
    </section>
  );
}

export function DashboardError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      {error}
    </div>
  );
}

export function UrgentTasksSection({
  loading,
  urgentTasks,
  navigate,
}: {
  loading: boolean;
  urgentTasks: UnifiedWorkItem[];
  navigate: Navigate;
}) {
  return (
    <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950 dark:text-white">ต้องจัดการก่อน</h3>
          <p className="text-xs text-slate-500 dark:text-white/50">เหตุผิดปกติ งานเกินกำหนด และงานวันนี้</p>
        </div>
        <button onClick={() => navigate('/calendar')} className="text-sm font-bold text-cyan-700 dark:text-cyan-300">ดูปฏิทิน</button>
      </div>
      {loading ? (
        <div className="py-8 text-center text-sm font-semibold text-slate-400">กำลังโหลดคิวงาน...</div>
      ) : urgentTasks.length === 0 ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-6 text-center dark:bg-emerald-500/10">
          <p className="font-black text-emerald-800 dark:text-emerald-300">ไม่มีเหตุผิดปกติหรืองานเร่งด่วน</p>
          <p className="mt-1 text-sm text-emerald-700/70 dark:text-emerald-300/60">คุณสามารถเริ่มงานใหม่จากทางลัดด้านล่างได้</p>
        </div>
      ) : (
        <div className="space-y-2">
          {urgentTasks.map((task) => {
            const overdue = Boolean(task.dueDate && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate)));
            const today = Boolean(task.dueDate && isToday(parseISO(task.dueDate)));
            const badge = task.kind === 'EXCEPTION' ? 'ต้องระวัง' : overdue ? 'เกินกำหนด' : today ? 'วันนี้' : task.priority === 'HIGH' ? 'สำคัญ' : 'งานฟาร์ม';
            const badgeClass = task.kind === 'EXCEPTION' || task.priority === 'CRITICAL'
              ? 'text-rose-600'
              : overdue
                ? 'text-orange-600'
                : 'text-amber-600';

            return (
              <button
                key={task.id}
                onClick={() => navigate(task.route || '/calendar')}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4 text-left active:scale-[0.99] dark:border-white/5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black ${badgeClass}`}>{badge}</span>
                    <span className="text-xs font-bold text-slate-400">{task.source === 'MAINTENANCE' ? 'ซ่อมบำรุง' : 'แม่พันธุ์'}</span>
                    {task.dueDate && <span className="text-xs text-slate-400">{task.dueDate}</span>}
                  </div>
                  <p className="mt-1 truncate font-bold text-slate-900 dark:text-white">{task.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-white/45">{task.reason}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function QuickActionsSection({ navigate }: { navigate: Navigate }) {
  const actions = [
    { label: 'เพิ่มแม่พันธุ์', hint: 'บันทึกแม่พันธุ์ใหม่', to: '/sows/add', icon: Plus },
    { label: 'สแกนบิล', hint: 'บันทึกรายจ่ายจากใบเสร็จ', to: '/scan', icon: Camera },
    { label: 'บันทึกขายหมู', hint: 'สร้างรายการขายใหม่', to: '/sales/new', icon: CircleDollarSign },
    { label: 'แจ้งซ่อม', hint: 'สร้างงานบำรุงรักษา', to: '/maintenance/new', icon: Wrench },
  ];

  return (
    <section className="mb-5">
      <h3 className="text-lg font-black text-slate-950 dark:text-white">งานที่ใช้บ่อย</h3>
      <p className="mb-3 text-sm text-slate-500 dark:text-white/50">เริ่มงานหลักได้โดยไม่ต้องค้นหาเมนู</p>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.to} onClick={() => navigate(action.to)} className="min-h-28 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm active:scale-[0.98] dark:border-white/10 dark:bg-white/5">
              <Icon className="mb-3 h-6 w-6 text-cyan-700 dark:text-cyan-300" />
              <p className="font-black text-slate-950 dark:text-white">{action.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/50">{action.hint}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function CategoryLinksSection({ navigate }: { navigate: Navigate }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <h3 className="font-black text-slate-950 dark:text-white">ดูตามหมวดงาน</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <CategoryLink label="ฟาร์ม" hint="แม่พันธุ์ ปฏิทิน และผังคอก" icon={PiggyBank} onClick={() => navigate('/sows')} />
        <CategoryLink label="การเงิน" hint="บิล รายจ่าย การขาย และเงินเดือน" icon={Receipt} onClick={() => navigate('/scan/history')} />
        <CategoryLink label="ทีมงาน" hint="เงินเดือนและการจัดการผู้ใช้งาน" icon={ClipboardList} onClick={() => navigate('/payroll/summary')} />
        <CategoryLink label="เพิ่มเติม" hint="ซ่อมบำรุง คู่มือ ข่าว และเครื่องมือ" icon={Wrench} onClick={() => navigate('/maintenance')} />
      </div>
    </section>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'danger' | 'warning' | 'normal' }) {
  const cls = tone === 'danger'
    ? 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300'
    : tone === 'warning'
      ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'
      : 'bg-cyan-50 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-300';
  return (
    <div className={`rounded-2xl px-3 py-4 text-center ${cls}`}>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="mt-2 text-xs font-bold">{label}</p>
    </div>
  );
}

function CategoryLink({ label, hint, icon: Icon, onClick }: { label: string; hint: string; icon: IconType; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-16 items-center gap-3 rounded-2xl bg-slate-50 p-4 text-left active:scale-[0.99] dark:bg-white/5">
      <div className="rounded-xl bg-white p-2 text-slate-700 shadow-sm dark:bg-white/10 dark:text-white"><Icon className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1">
        <p className="font-black text-slate-950 dark:text-white">{label}</p>
        <p className="truncate text-xs text-slate-500 dark:text-white/50">{hint}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-300" />
    </button>
  );
}
