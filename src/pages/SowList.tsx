import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, Hourglass, Heart, Activity, Baby, Stethoscope, Clock, ShieldAlert } from 'lucide-react';
import { subscribeToSows, subscribeToAllPendingTasks } from '../services/sowService';
import { Sow, SowStatus, Task } from '../types';
import clsx from 'clsx';
import { format, parseISO, differenceInDays, startOfToday } from 'date-fns';
import { th } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

export default function SowList() {
  const navigate = useNavigate();
  const [sows, setSows] = useState<Sow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SowStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'SOW' | 'BOAR'>('SOW');

  useEffect(() => {
    const unsubSows = subscribeToSows((data) => {
      setSows(data);
      setLoading(false);
    });
    const unsubTasks = subscribeToAllPendingTasks((data) => {
      setTasks(data);
    });
    return () => {
      unsubSows();
      unsubTasks();
    };
  }, []);

  const filteredSows = sows.filter(sow => {
    const isMatchingType = (sow.type || 'SOW') === typeFilter;
    const matchesSearch = sow.sowId?.toLowerCase()?.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || sow.status === statusFilter;
    return isMatchingType && matchesSearch && matchesStatus;
  });

  const getNextTaskDetails = (sowId: string) => {
    const sowTasks = tasks.filter(t => t.sowId === sowId);
    if (sowTasks.length === 0) return null;
    const task = sowTasks[0];
    
    let label = '';
    switch (task.type) {
      case 'HEAT_CHECK': label = 'ตรวจสัด'; break;
      case 'BACK_TO_HEAT': label = 'เป็นสัดซ้ำ'; break;
      case 'ULTRASOUND': label = 'เช็คท้องด้วยเครื่อง'; break;
      case 'MOVE_TO_FARROW': label = 'ย้ายเข้าเล้าคลอด'; break;
      case 'FARROW': label = 'กำหนดคลอด'; break;
      case 'WEAN': label = 'หย่านม'; break;
      case 'BREED': label = 'ผสมพันธุ์'; break;
      case 'VACCINE': label = 'ฉีดวัคซีน'; break;
      default: label = task.type;
    }

    try {
      const taskDate = parseISO(task.dueDate);
      const diff = differenceInDays(taskDate, startOfToday());
      
      let relativeText = '';
      let isOverdue = false;
      if (diff === 0) {
        relativeText = 'วันนี้';
      } else if (diff === 1) {
        relativeText = 'พรุ่งนี้';
      } else if (diff > 1) {
        relativeText = `อีก ${diff} วัน`;
      } else {
        relativeText = `เลย ${Math.abs(diff)} วัน`;
        isOverdue = true;
      }

      return {
        label,
        relativeText,
        isOverdue,
        dateFormatted: format(taskDate, 'd MMM yyyyy', { locale: th }),
        task
      };
    } catch {
      return {
        label,
        relativeText: task.dueDate,
        isOverdue: false,
        dateFormatted: task.dueDate,
        task
      };
    }
  };

  const getStatusColor = (status: SowStatus) => {
    switch (status) {
      case 'IDLE': return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'MATED': return 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30';
      case 'PREGNANT': return 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30';
      case 'LACTATING': return 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30';
      case 'RECOVERY': return 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30';
      case 'CULLED': return 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30';
      default: return 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white border-slate-200 dark:border-white/20';
    }
  };

  const getStatusIcon = (status: SowStatus) => {
    switch (status) {
      case 'IDLE': return <Activity className="w-3.5 h-3.5 mr-1 inline-block" />;
      case 'MATED': return <Heart className="w-3.5 h-3.5 mr-1 inline-block" />;
      case 'PREGNANT': return <Hourglass className="w-3.5 h-3.5 mr-1 inline-block" />;
      case 'LACTATING': return <Baby className="w-3.5 h-3.5 mr-1 inline-block" />;
      case 'RECOVERY': return <ShieldAlert className="w-3.5 h-3.5 mr-1 inline-block" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: SowStatus) => {
    switch (status) {
      case 'IDLE': return 'ว่าง (พร้อมผสม)';
      case 'MATED': return 'ผสมแล้ว';
      case 'PREGNANT': return 'อุ้มท้อง';
      case 'LACTATING': return 'เลี้ยงลูก';
      case 'RECOVERY': return 'พักฟื้น';
      case 'CULLED': return 'คัดทิ้ง';
      default: return status;
    }
  };

  return (
    <div className="animate-in fade-in duration-300 relative min-h-[80vh]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide">
          {typeFilter === 'SOW' ? 'รายชื่อแม่พันธุ์' : 'รายชื่อพ่อพันธุ์'}
        </h2>
        <span className="text-sm text-[#00bcd4] font-bold bg-[#00bcd4]/10 px-3 py-1 rounded-full border border-[#00bcd4]/20">{filteredSows.length} ตัว</span>
      </div>

      {/* Type Toggle Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 mb-6 font-medium">
        <button
          onClick={() => { setTypeFilter('SOW'); setStatusFilter('ALL'); }}
          className={clsx(
            "flex-1 pb-3 text-center transition-all border-b-2",
            typeFilter === 'SOW' ? "border-pink-500 text-pink-400" : "border-transparent text-slate-600 dark:text-white/50 "
          )}
        >
          แม่พันธุ์
        </button>
        <button
          onClick={() => { setTypeFilter('BOAR'); setStatusFilter('ALL'); }}
          className={clsx(
            "flex-1 pb-3 text-center transition-all border-b-2",
            typeFilter === 'BOAR' ? "border-orange-500 text-orange-400" : "border-transparent text-slate-600 dark:text-white/50 "
          )}
        >
          พ่อพันธุ์
        </button>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4 mb-8">
        <div className="relative search-rainbow-border">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-600 dark:text-white/50" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาเบอร์หู..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-100 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-inner text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all text-lg"
          />
        </div>

        {/* Status Filter Chips (Only for Sows) */}
        {typeFilter === 'SOW' && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setStatusFilter('ALL')}
            className={clsx(
              "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
              statusFilter === 'ALL' 
                ? "bg-[#00bcd4] text-slate-900 dark:text-white border-[#00bcd4] shadow-xl dark:shadow-2xl shadow-[#00bcd4]/20" 
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
            )}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setStatusFilter('IDLE')}
            className={clsx(
              "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
              statusFilter === 'IDLE' 
                ? "bg-slate-100 dark:bg-white/20 text-slate-900 dark:text-white border-slate-300 dark:border-white/30 shadow-xl dark:shadow-2xl" 
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
            )}
          >
            ว่าง
          </button>
          <button
            onClick={() => setStatusFilter('MATED')}
            className={clsx(
              "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
              statusFilter === 'MATED' 
                ? "bg-purple-500/40 text-slate-900 dark:text-white border-purple-400 shadow-xl dark:shadow-2xl" 
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
            )}
          >
            ผสมแล้ว
          </button>
          <button
            onClick={() => setStatusFilter('PREGNANT')}
            className={clsx(
              "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
              statusFilter === 'PREGNANT' 
                ? "bg-[#00bcd4]/40 text-slate-900 dark:text-white border-[#00bcd4] shadow-xl dark:shadow-2xl" 
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
            )}
          >
            อุ้มท้อง
          </button>
          <button
            onClick={() => setStatusFilter('LACTATING')}
            className={clsx(
              "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
              statusFilter === 'LACTATING' 
                ? "bg-pink-500/40 text-slate-900 dark:text-white border-pink-400 shadow-xl dark:shadow-2xl" 
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
            )}
          >
            เลี้ยงลูก
          </button>
          <button
            onClick={() => setStatusFilter('RECOVERY')}
            className={clsx(
              "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
              statusFilter === 'RECOVERY' 
                ? "bg-orange-500/40 text-slate-900 dark:text-white border-orange-400 shadow-xl dark:shadow-2xl" 
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/70 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
            )}
          >
            พักฟื้น
          </button>
        </div>
        )}
      </div>

      {/* List */}
      <AnimatePresence mode="wait">
      {loading ? (
        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center items-center py-12">
          <div className="w-10 h-10 border-4 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div>
        </motion.div>
      ) : filteredSows.length === 0 ? (
        <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-50/80 dark:bg-white/5 backdrop-blur-xl p-10 rounded-[2rem] border border-slate-200/50 dark:border-white/10 border-dashed text-center shadow-lg">
          <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-200/50 dark:border-white/10 shadow-inner">
            <Search className="w-10 h-10 text-slate-400 dark:text-white/30" />
          </div>
          <p className="text-slate-600 dark:text-white/70 font-bold text-xl">ไม่พบข้อมูลแม่/พ่อพันธุ์</p>
          <p className="text-sm text-slate-500 dark:text-white/40 mt-2 font-medium">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
        </motion.div>
      ) : (
        <motion.div 
          key="list"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
          }}
          initial="hidden"
          animate="visible"
          className="grid gap-4 pb-24"
        >
          {filteredSows.map((sow) => {
            const nextTask = getNextTaskDetails(sow.id!);
            
            // Calculate progress for PREGNANT
            let progress = 0;
            if (sow.status === 'PREGNANT' && nextTask?.task?.type === 'FARROW') {
              try {
                const dueDate = parseISO(nextTask.task.dueDate);
                const remaining = differenceInDays(dueDate, startOfToday());
                progress = Math.max(0, Math.min(100, ((114 - remaining) / 114) * 100));
              } catch (e) {
                // ignore
              }
            }

            return (
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              key={sow.id}
              onClick={() => navigate(`/sows/${sow.id}`)}
              className="bg-white/95 dark:bg-[#1a2f3a]/95 backdrop-blur-md p-5 rounded-[1.25rem] shadow-sm border border-slate-200/60 dark:border-white/5 cursor-pointer flex flex-col gap-3 group hover:shadow-lg transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight group-hover:text-[#00bcd4] transition-colors">{sow.sowId}</h3>
                    <span className={clsx("px-2.5 py-1 rounded-lg text-[10px] font-black border tracking-wider flex items-center uppercase", getStatusColor(sow.status))}>
                      {getStatusIcon(sow.status)}
                      {getStatusLabel(sow.status)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 dark:text-white/40 flex items-center gap-2 font-medium">
                    {sow.type === 'BOAR' ? (
                      <span className="text-orange-400">♂ พ่อพันธุ์</span>
                    ) : (
                      <span className="text-pink-400">♀ แม่พันธุ์</span>
                    )}
                    <span className="w-1 h-1 bg-slate-300 dark:bg-white/20 rounded-full"></span>
                    <span>{sow.breed}</span>
                    {sow.type !== 'BOAR' && (
                      <>
                        <span className="w-1 h-1 bg-slate-300 dark:bg-white/20 rounded-full"></span>
                        <span>ท้องที่ {sow.parity}</span>
                      </>
                    )}
                    {sow.penId && (
                       <>
                        <span className="w-1 h-1 bg-slate-300 dark:bg-white/20 rounded-full"></span>
                        <span>กรง {sow.penId}</span>
                       </>
                    )}
                  </div>
                </div>
                
                {nextTask ? (
                  <div className={clsx("text-right p-3 rounded-xl border flex flex-col items-end min-w-[120px]", nextTask.isOverdue ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-500/20" : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10")}>
                    <p className="text-[11px] text-slate-500 dark:text-white/50 mb-0.5 font-bold">{nextTask.label}</p>
                    <p className={clsx("text-sm font-black", nextTask.isOverdue ? "text-red-600 dark:text-red-400" : "text-[#00bcd4]")}>{nextTask.relativeText}</p>
                  </div>
                ) : (
                  <div className="text-right p-3 rounded-xl border bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 min-w-[120px]">
                     <p className="text-[11px] text-slate-400 dark:text-white/40 mb-0.5 font-bold">กำหนดการถัดไป</p>
                     <p className="text-sm font-medium text-slate-500 dark:text-white/50">-</p>
                  </div>
                )}
              </div>

              {sow.status === 'PREGNANT' && nextTask?.task?.type === 'FARROW' && (
                <div className="mt-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>อายุครรภ์</span>
                    <span>{Math.round((progress / 100) * 114)} / 114 วัน</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
        </motion.div>
      )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) relative to screen context */}
      <motion.button 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onClick={() => navigate('/sows/add')}
        className="fixed bottom-[6.5rem] right-6 w-16 h-16 bg-gradient-to-tr from-[#00bcd4] to-[#008ba3] text-white rounded-[1.25rem] shadow-xl shadow-[#00bcd4]/30 flex items-center justify-center z-10 border border-white/20"
      >
        <Plus className="w-8 h-8 drop-shadow-sm" />
      </motion.button>
    </div>
  );
}
