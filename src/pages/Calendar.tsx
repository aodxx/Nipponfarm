import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown,
  Heart,
  Activity,
  Baby,
  Stethoscope,
  Truck,
  Syringe,
  CalendarClock,
  Plus
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  parseISO,
  isToday,
  isAfter,
  setMonth,
  setYear,
  isBefore,
  startOfToday
} from 'date-fns';
import { th } from 'date-fns/locale';
import { subscribeToAllPendingTasks } from '../services/sowService';
import { Task } from '../types';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

export default function Calendar() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAllPendingTasks((data) => {
      setTasks(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const onDateClick = (day: Date) => {
    setSelectedDate(day);
  };

  const getTaskIcon = (type: string, isOverdue: boolean = false) => {
    const className = "w-5 h-5";
    switch (type) {
      case 'BREED': return <Heart className={className} />;
      case 'HEAT_CHECK': 
      case 'BACK_TO_HEAT': return <Activity className={className} />;
      case 'ULTRASOUND': return <Stethoscope className={className} />;
      case 'MOVE_TO_FARROW': return <Truck className={className} />;
      case 'FARROW': 
      case 'WEAN': return <Baby className={className} />;
      case 'VACCINE': return <Syringe className={className} />;
      default: return isOverdue ? <AlertCircle className={className} /> : <CalendarClock className={className} />;
    }
  };

  const getTaskColor = (type: string) => {
    switch (type) {
      case 'FARROW': return 'bg-red-500';
      case 'BREED': return 'bg-purple-500';
      case 'MOVE_TO_FARROW': return 'bg-orange-500';
      case 'ULTRASOUND': return 'bg-blue-500';
      default: return 'bg-[#00bcd4]';
    }
  };

  const getTaskLabel = (type: string) => {
    switch (type) {
      case 'BREED': return 'กำหนดผสมพันธุ์';
      case 'HEAT_CHECK': return 'ตรวจกลับสัด';
      case 'BACK_TO_HEAT': return 'ตรวจกลับสัด (ซ้ำ)';
      case 'ULTRASOUND': return 'อัลตราซาวด์';
      case 'MOVE_TO_FARROW': return 'ย้ายเข้าเล้าคลอด';
      case 'FARROW': return 'กำหนดคลอด';
      case 'WEAN': return 'กำหนดหย่านม';
      case 'VACCINE': return 'ฉีดวัคซีน';
      default: return type;
    }
  };

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const isOverdue = isBefore(parseISO(task.dueDate), startOfToday());
    const isTodayOrTomorrow = isSameDay(parseISO(task.dueDate), startOfToday()) || isSameDay(parseISO(task.dueDate), addDays(startOfToday(), 1));
    
    let colorClass = task.isDraft ? "bg-amber-100/10 text-amber-800/80 dark:text-amber-300/80 border-dashed border-amber-300/60 dark:bg-amber-500/5 dark:border-amber-500/20" :
                     isOverdue ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/10 dark:text-red-400 dark:border-red-500/30" : 
                     isTodayOrTomorrow ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/10 dark:text-blue-400 dark:border-blue-500/30" : 
                     "bg-white dark:bg-white/5 text-slate-800 dark:text-white border-slate-200 dark:border-white/10";
    
    let iconBgClass = task.isDraft ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                      isOverdue ? "bg-red-500/20 text-red-600 dark:text-red-400" : 
                      isTodayOrTomorrow ? "bg-blue-500/20 text-blue-600 dark:text-blue-400" : 
                      "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300";

    return (
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate(`/sows/${task.sowId}`)}
        className={clsx("backdrop-blur-md border p-4 rounded-2xl shadow-sm flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform", colorClass)}
      >
        <div className="flex items-start gap-4">
          <div className={clsx("p-3 rounded-xl", iconBgClass)}>
            {getTaskIcon(task.type, isOverdue)}
          </div>
          <div>
            <p className={clsx("font-bold text-lg flex items-center flex-wrap gap-2", isOverdue ? "text-red-700 dark:text-red-300" : isTodayOrTomorrow ? "text-blue-800 dark:text-blue-300" : "text-slate-900 dark:text-white")}>
              {getTaskLabel(task.type)}
              {task.isDraft && (
                <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-lg font-black tracking-normal">
                  ร่างคาดการณ์ (รอยืนยัน)
                </span>
              )}
            </p>
            <p className="text-sm opacity-80 font-medium mt-0.5">แม่หมูเบอร์: <span className="font-bold">{task.sowDisplayId}</span></p>
            {!isSameDay(parseISO(task.dueDate), selectedDate) && (
              <p className="text-xs mt-1 opacity-70">กำหนด: {format(parseISO(task.dueDate), 'd MMM yyyy', { locale: th })}</p>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 opacity-40" />
      </motion.div>
    );
  };

  // Calendar Grid Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      
      // Check if this day has tasks
      const dayTasks = tasks.filter(t => isSameDay(parseISO(t.dueDate), cloneDay));
      const hasTasks = dayTasks.length > 0;

      days.push(
        <div
          key={day.toString()}
          onClick={() => onDateClick(cloneDay)}
          className={clsx(
            "relative flex flex-col items-center justify-center p-2 h-16 cursor-pointer transition-all rounded-xl",
            !isSameMonth(day, monthStart) ? "text-slate-300 dark:text-white/10" : "text-slate-700 dark:text-white/80",
            isSameDay(day, selectedDate) ? "bg-[#00bcd4] text-white font-bold shadow-lg shadow-[#00bcd4]/30" : "hover:bg-slate-100 dark:hover:bg-white/10",
            isToday(day) && !isSameDay(day, selectedDate) && "text-[#00bcd4] ring-1 ring-[#00bcd4] bg-[#00bcd4]/5"
          )}
        >
          <span className="text-lg z-10">{formattedDate}</span>
          {hasTasks && (
            <div className="absolute bottom-1.5 flex gap-1 justify-center w-full px-1 overflow-hidden">
              {dayTasks.slice(0, 3).map((t, idx) => (
                <div 
                  key={idx} 
                  className={clsx(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse", 
                    isSameDay(day, selectedDate) ? "bg-white" : getTaskColor(t.type)
                  )}
                ></div>
              ))}
              {dayTasks.length > 3 && (
                <div className={clsx("w-1 h-1 rounded-full", isSameDay(day, selectedDate) ? "bg-white/60" : "bg-slate-400")}></div>
              )}
            </div>
          )}
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7 gap-1 mb-1" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  // Selected Day Tasks
  const selectedDayTasks = tasks.filter(t => isSameDay(parseISO(t.dueDate), selectedDate));
  
  // Upcoming tasks for empty state (next 14 days)
  const upcomingTasks = tasks.filter(t => 
    isAfter(parseISO(t.dueDate), selectedDate) && 
    isBefore(parseISO(t.dueDate), addDays(selectedDate, 14))
  ).slice(0, 5);

  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const currentYear = currentMonth.getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="animate-in fade-in duration-300 pb-32">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">ปฏิทินฟาร์ม</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/sows/add')}
          className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Calendar Header with Picker */}
      <div className="bg-white dark:bg-[#1a2f3a] p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 mb-8 overflow-visible">
        <div className="flex justify-between items-center mb-6 relative">
          <button onClick={prevMonth} className="p-2.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors border border-slate-200 dark:border-white/10">
            <ChevronLeft className="w-6 h-6 text-slate-900 dark:text-white" />
          </button>
          
          <div className={clsx("relative", showPicker ? "z-40" : "z-10")} ref={pickerRef}>
            <button 
              onClick={() => setShowPicker(!showPicker)}
              className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors group"
            >
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {format(currentMonth, 'MMMM yyyy', { locale: th })}
              </h3>
              <ChevronDown className={clsx("w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-transform", showPicker && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showPicker && (
                <>
                  {/* Solid Backdrop for Month/Year Picker */}
                  <div 
                    className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-40" 
                    onClick={() => setShowPicker(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-[#1a2f3a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 z-50"
                  >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">เดือน</p>
                      <div className="h-48 overflow-y-auto scrollbar-hide py-1">
                        {months.map((m, i) => (
                          <button
                            key={m}
                            onClick={() => {
                              setCurrentMonth(setMonth(currentMonth, i));
                              setShowPicker(false);
                            }}
                            className={clsx(
                              "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                              currentMonth.getMonth() === i
                                ? "bg-blue-600 text-white font-bold"
                                : "text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/5"
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1 border-l border-slate-100 dark:border-white/10 pl-2">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">ปี</p>
                       <div className="h-48 overflow-y-auto scrollbar-hide py-1">
                        {years.map((y) => (
                          <button
                            key={y}
                            onClick={() => {
                              setCurrentMonth(setYear(currentMonth, y));
                              setShowPicker(false);
                            }}
                            className={clsx(
                              "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                              currentMonth.getFullYear() === y
                                ? "bg-blue-600 text-white font-bold"
                                : "text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/5"
                            )}
                          >
                            {y + 543}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button onClick={nextMonth} className="p-2.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors border border-slate-200 dark:border-white/10">
            <ChevronRight className="w-6 h-6 text-slate-900 dark:text-white" />
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((dayName, i) => (
            <div key={i} className={clsx("text-center text-[11px] font-black py-1 uppercase tracking-wider", i === 0 || i === 6 ? "text-red-400" : "text-slate-400 dark:text-white/30")}>
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div>{rows}</div>
      </div>

      {/* Task List for Selected Date */}
      <div className="animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400">
            <CalendarClock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            คิวงาน {isToday(selectedDate) ? 'วันนี้' : format(selectedDate, 'd MMM', { locale: th })}
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12"><div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div></div>
        ) : selectedDayTasks.length > 0 ? (
          <div className="space-y-4">
            {selectedDayTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-slate-50 dark:bg-[#1a2f3a] p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 border-dashed text-center shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-50" />
              <p className="text-slate-500 dark:text-white/60 font-medium">ไม่มีงานในวันที่เลือก</p>
            </div>

            {upcomingTasks.length > 0 && (
              <section>
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">เตรียมตัวล่วงหน้า</h4>
                <div className="space-y-4">
                  {upcomingTasks.map(task => <TaskCard key={task.id} task={task} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
