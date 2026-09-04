import { Home, Sprout, Wallet, Users, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

type NavItem = {
  label: string;
  to: string;
  icon: typeof Home;
  matches: (path: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'หน้าหลัก', to: '/', icon: Home, matches: path => path === '/' },
  { label: 'ฟาร์ม', to: '/sows', icon: Sprout, matches: path => path.startsWith('/sows') || path.startsWith('/calendar') || path.startsWith('/pen-map') || path.startsWith('/maintenance') },
  { label: 'การเงิน', to: '/sales', icon: Wallet, matches: path => path.startsWith('/sales') || path.startsWith('/scan') || path.startsWith('/payroll') },
  { label: 'ทีมงาน', to: '/users', icon: Users, matches: path => path.startsWith('/users') || path.startsWith('/chat') },
  { label: 'เพิ่มเติม', to: '/manual', icon: Menu, matches: path => path.startsWith('/manual') || path.startsWith('/news') || path.startsWith('/tools') || path.startsWith('/settings') || path.startsWith('/profile') || path === '/dashboard-legacy' },
];

export default function ConsolidatedNavDock() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none"
      aria-label="เมนูหลัก"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-2 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl pointer-events-auto dark:border-white/10 dark:bg-[#0b1738]/95">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = item.matches(pathname);
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'min-h-14 rounded-2xl px-1 py-2 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500',
                active
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/5'
              )}
            >
              <Icon className="mx-auto mb-1 h-5 w-5" aria-hidden="true" />
              <span className="block truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
