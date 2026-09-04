import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../../lib/firestore-error';
import { db } from '../../lib/firebase';
import { Plus, Wrench, AlertTriangle, CheckCircle, Clock, ChevronRight } from 'lucide-react';

interface MaintenanceRequest {
  id: string;
  title: string;
  location: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reportedBy: string;
  createdAt: number;
}

type MaintenanceFilter = 'ACTIVE' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

const urgencyRank: Record<MaintenanceRequest['urgency'], number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export default function MaintenanceList() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MaintenanceFilter>('ACTIVE');
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'maintenance_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MaintenanceRequest[];
      setRequests(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'maintenance_requests');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const counts = useMemo(() => ({
    active: requests.filter(request => request.status !== 'RESOLVED').length,
    pending: requests.filter(request => request.status === 'PENDING').length,
    inProgress: requests.filter(request => request.status === 'IN_PROGRESS').length,
    resolved: requests.filter(request => request.status === 'RESOLVED').length,
  }), [requests]);

  const visibleRequests = useMemo(() => {
    const filtered = requests.filter(request => {
      if (filter === 'ACTIVE') return request.status !== 'RESOLVED';
      return request.status === filter;
    });

    return [...filtered].sort((a, b) => {
      if (a.status !== 'RESOLVED' && b.status !== 'RESOLVED') {
        const urgencyDiff = urgencyRank[b.urgency] - urgencyRank[a.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
      }
      return b.createdAt - a.createdAt;
    });
  }, [filter, requests]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-amber-700 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200 dark:border-amber-500/25';
      case 'IN_PROGRESS': return 'text-blue-700 bg-blue-50 dark:bg-blue-500/15 dark:text-blue-300 border border-blue-200 dark:border-blue-500/25';
      case 'RESOLVED': return 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25';
      default: return 'text-slate-600 bg-slate-50 dark:bg-white/10 dark:text-white/60 border border-slate-200 dark:border-white/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'IN_PROGRESS': return <Wrench className="w-4 h-4" />;
      case 'RESOLVED': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'รอรับเรื่อง';
      case 'IN_PROGRESS': return 'กำลังดำเนินการ';
      case 'RESOLVED': return 'ปิดงานแล้ว';
      default: return status;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 text-xs font-black rounded-full">ด่วนที่สุด</span>;
      case 'HIGH': return <span className="px-2.5 py-1 bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 text-xs font-black rounded-full">ด่วน</span>;
      default: return null;
    }
  };

  const filters: Array<{ key: MaintenanceFilter; label: string; count: number }> = [
    { key: 'ACTIVE', label: 'ต้องทำ', count: counts.active },
    { key: 'PENDING', label: 'รอรับเรื่อง', count: counts.pending },
    { key: 'IN_PROGRESS', label: 'กำลังซ่อม', count: counts.inProgress },
    { key: 'RESOLVED', label: 'เสร็จแล้ว', count: counts.resolved },
  ];

  return (
    <div className="space-y-4 pb-4">
      <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#102247]/85">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">Maintenance Queue</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">งานซ่อมที่ต้องจัดการ</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-white/55">งานด่วนถูกจัดขึ้นก่อน เพื่อให้เห็นสิ่งที่ต้องลงมือทันที</p>
          </div>
          <div className="rounded-2xl bg-rose-50 p-3 text-rose-500 dark:bg-rose-500/10">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">ต้องทำ</p>
            <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{counts.active}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-500/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-300">รอรับ</p>
            <p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-200">{counts.pending}</p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-3 dark:bg-blue-500/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-300">กำลังซ่อม</p>
            <p className="mt-1 text-2xl font-black text-blue-700 dark:text-blue-200">{counts.inProgress}</p>
          </div>
        </div>
      </section>

      <button
        onClick={() => navigate('/maintenance/new')}
        className="w-full min-h-14 rounded-2xl bg-[#0E214B] px-5 font-black text-white shadow-lg shadow-slate-900/10 transition active:scale-[0.98] dark:bg-cyan-400 dark:text-[#0E214B] flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        แจ้งซ่อมใหม่
      </button>

      <div className="grid grid-cols-4 gap-2" role="tablist" aria-label="กรองงานซ่อมตามสถานะ">
        {filters.map(item => {
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(item.key)}
              className={`min-h-14 rounded-2xl border px-2 py-2 text-center transition active:scale-[0.98] ${
                active
                  ? 'border-[#0E214B] bg-[#0E214B] text-white dark:border-cyan-400 dark:bg-cyan-400 dark:text-[#0E214B]'
                  : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60'
              }`}
            >
              <span className="block text-lg font-black leading-none">{item.count}</span>
              <span className="mt-1 block text-[10px] font-bold leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
          <Wrench className="w-12 h-12 text-slate-300 dark:text-white/20 mx-auto mb-3" />
          <p className="font-bold text-slate-600 dark:text-white/55">ยังไม่มีรายการแจ้งซ่อม</p>
        </div>
      ) : visibleRequests.length === 0 ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-7 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="font-bold text-slate-700 dark:text-white/70">ไม่มีงานในสถานะนี้</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRequests.map(req => (
            <button
              type="button"
              key={req.id}
              onClick={() => navigate(`/maintenance/${req.id}`)}
              className={`w-full rounded-[1.5rem] border p-4 text-left shadow-sm transition active:scale-[0.99] ${
                req.status === 'RESOLVED'
                  ? 'border-slate-200/70 bg-white/65 opacity-75 dark:border-white/10 dark:bg-white/5'
                  : 'border-slate-200 bg-white dark:border-white/10 dark:bg-[#102247]/75'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-black text-slate-900 dark:text-white">{req.title}</h3>
                    {getUrgencyBadge(req.urgency)}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-500 dark:text-white/50">{req.location}</p>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 dark:text-white/25" />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold ${getStatusColor(req.status)}`}>
                  {getStatusIcon(req.status)}
                  <span>{getStatusText(req.status)}</span>
                </div>
                <span className="text-slate-400 dark:text-white/35">{new Date(req.createdAt).toLocaleDateString('th-TH')}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
