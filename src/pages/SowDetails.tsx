import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, CheckCircle2, AlertCircle, Activity, HeartPulse, Trash2, Calendar as CalendarIcon, Beaker, Heart, Hourglass, Baby, ShieldAlert, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { subscribeToSow, subscribeToSowEvents, subscribeToSowTasks, recordEvent } from '../services/sowService';
import { Sow, SowEvent, Task, EventType, SowStatus } from '../types';
import EventModals from '../components/EventModals';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import clsx from 'clsx';
import { format, parseISO, differenceInDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

import { useAuth } from '../contexts/AuthContext';
import { SecureVideoPlayer } from '../components/SecureVideoPlayer';


export default function SowDetails() {
  const { userProfile, user } = useAuth();
  const recorderName = userProfile?.displayName || user?.displayName || user?.email || 'พนักงาน';
  const { showAlert, showConfirm, showSuccess, showError, showLoading, hideLoading } = useBottomSheet();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [sow, setSow] = useState<Sow | null>(null);
  const [events, setEvents] = useState<SowEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab ] = useState<'TASKS' | 'HISTORY'>('TASKS');
  const [expandedParities, setExpandedParities] = useState<Record<number, boolean>>({});
  const [showMenu, setShowMenu] = useState(false);
  
  const toggleParity = (parityNum: number) => {
    setExpandedParities(prev => ({
      ...prev,
      [parityNum]: !prev[parityNum]
    }));
  };
  
  const [modalType, setModalType] = useState<EventType | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const [heatCheckTask, setHeatCheckTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const unsubSow = subscribeToSow(id, (data) => {
      setSow(data);
      setLoading(false);
    });
    const unsubEvents = subscribeToSowEvents(id, setEvents);
    const unsubTasks = subscribeToSowTasks(id, setTasks);
    
    return () => {
      unsubSow();
      unsubEvents();
      unsubTasks();
    };
  }, [id]);

  if (loading) {
    return <div className="flex justify-center items-center py-20"><div className="w-10 h-10 border-4 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div></div>;
  }

  if (!sow) {
    return <div className="text-center py-20 text-slate-600 dark:text-white/50 text-lg">ไม่พบข้อมูลแม่สุกร</div>;
  }

  const handleEventSubmit = async (type: EventType, date: string, details: any, forceConfirmed: boolean = false, videoUrl?: string | null, draftDocId?: string) => {
    if (!forceConfirmed) {
      const inputDate = parseISO(date);
      const sortedEvents = [...events].sort((a, b) => b.date.localeCompare(a.date));
      const latestBreed = sortedEvents.find(e => e.type === 'BREED');
      const latestFarrow = sortedEvents.find(e => e.type === 'FARROW');
      
      // 0. วันในอนาคต
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      if (date > todayStr) {
        showConfirm(
          `วันที่ทำกิจกรรม (${date}) เป็นวันที่ในอนาคต (วันนี้คือ ${todayStr}) คุณยังยืนยันที่จะบันทึกกิจกรรมนี้ล่วงหน้าหรือไม่?`,
          () => handleEventSubmit(type, date, details, true, videoUrl, draftDocId),
          "วันที่ทำกิจกรรมล่วงหน้า"
        );
        return;
      }

      // 0.1 เช็คความสอดคล้องกับกิจกรรมล่าสุด (ไม่ควรป้อนวันที่ย้อนกลับไปผ่านกิจกรรมอื่นที่ลงประวัติไปแล้ว)
      if (sortedEvents.length > 0) {
        const latestEvent = sortedEvents[0];
        if (date < latestEvent.date) {
          showConfirm(
            `วันที่กรอก (${date}) เกิดขึ้นก่อนกิจกรรมล่าสุดที่คุณลงบันทึกไว้ในระบบ (${latestEvent.date} - ${getEventLabel(latestEvent.type)}) ยืนยันที่จะบันทึกประวัติย้อนหลังหรือแก้วันที่นี้หรือไม่?`,
            () => handleEventSubmit(type, date, details, true, videoUrl, draftDocId),
            "ลำดับวันย้อนหลังผิดปกติ"
          );
          return;
        }
      }

      // 1. ตรวจสัด/อัลตราซาวด์ (ULTRASOUND) -> ต้องห่างจากวันผสมเฉลี่ยอย่างน้อย 18-21 วัน
      if (type === 'ULTRASOUND') {
        if (!latestBreed) {
          showConfirm(
            `ไม่พบประวัติการผสมพันธุ์ของแม่สุกรตัวนี้ในรอบปัจจุบัน คุณต้องการบันทึกผลการตรวจสัด/ตรวจท้องโดยตรงเลยหรือไม่?`,
            () => handleEventSubmit(type, date, details, true, videoUrl, draftDocId),
            "ไม่พบประวัติผสมพันธุ์"
          );
          return;
        } else {
          const diff = differenceInDays(inputDate, parseISO(latestBreed.date));
          if (diff < 18) {
            showConfirm(
              `วันตรวจครรภ์/อัลตราซาวด์ (${date}) ห่างจากวันผสมพันธุ์ล่าสุด (${latestBreed.date}) เพียง ${diff} วัน ซึ่งต่ำกว่ามาตรฐานความแม่นยำ (ปกติควรตรวจเช็คหลังผสมอย่างน้อย 18-28 วัน) คุณแน่ใจว่าต้องการยืนยันบันทึกข้อมูลหรือไม่?`,
              () => handleEventSubmit(type, date, details, true, videoUrl, draftDocId),
              "ระยะตรวจครรภ์สั้นกว่าปกติ"
            );
            return;
          }
        }
      }

      // 2. คลอด (FARROW) -> ต้องห่างจากวันผสมอย่างน้อย 100 วัน (ปกติ 114)
      if (type === 'FARROW') {
        if (!latestBreed) {
          showConfirm(
            `ไม่พบประวัติการผสมพันธุ์ของแม่สุกรตัวนี้ในระบบ คุณต้องการบันทึกการคลอดโดยตรงเลยหรือไม่?`,
            () => handleEventSubmit(type, date, details, true, videoUrl, draftDocId),
            "ไม่พบประวัติผสมพันธุ์"
          );
          return;
        } else {
          const diff = differenceInDays(inputDate, parseISO(latestBreed.date));
          if (diff < 100) {
            showConfirm(
              `วันคลอด (${date}) ห่างจากวันผสมพันธุ์ล่าสุด (${latestBreed.date}) เพียง ${diff} วัน ซึ่งตรวจพบน้อยกว่าเกณฑ์ระยะอุ้มท้องธรรมชาติของแม่สุกร (ระยะเวลาตั้งท้องรวมปกติคือ 114 วัน และต้องมีระยะห่างอย่างน้อย 100 วันขึ้นไป) ยืนยันที่จะบันทึกข้อมูลการคลอดนี้หรือไม่?`,
              () => handleEventSubmit(type, date, details, true, videoUrl, draftDocId),
              "ระยะตั้งท้องสั้นผิดธรรมชาติ"
            );
            return;
          }
        }
      }

      // 3. หย่านม (WEAN) -> ต้องห่างจากวันคลอดอย่างน้อย 18 วัน (ปกติ 24)
      if (type === 'WEAN') {
        if (!latestFarrow) {
          showConfirm(
            `ไม่พบประวัติการคลอดของแม่สุกรตัวนี้ในรอบปัจจุบัน คุณต้องการบันทึกการหย่านมเลยหรือไม่?`,
            () => handleEventSubmit(type, date, details, true, videoUrl, draftDocId),
            "ไม่พบประวัติคลอด"
          );
          return;
        } else {
          const diff = differenceInDays(inputDate, parseISO(latestFarrow.date));
          if (diff < 18) {
            showConfirm(
              `วันหย่านม (${date}) ห่างจากวันคลอดล่าสุด (${latestFarrow.date}) เพียง ${diff} วัน (ระยะเวลาให้นมสุกรก่อนหย่านมปกติคือ 24 วัน และควรเป็นอย่างน้อย 18 วันขึ้นไป) ยืนยันบันทึกข้อมูลหย่านมนี้หรือไม่?`,
              () => handleEventSubmit(type, date, details, true, videoUrl, draftDocId),
              "ระยะเลี้ยงลูกสั้นผิดธรรมชาติ"
            );
            return;
          }
        }
      }
    }

    try {
      showLoading('กำลังบันทึกกิจกรรมแม่พันธุ์และรูปภาพหลักฐาน...', 'กำลังบันทึกข้อมูล');
      
      let finalDetails = { ...details };
      if (details.attachment && details.attachment.startsWith('data:image')) {
        try {
          const { uploadOptimizedImage } = await import('../services/imageOptimizer');
          // Upload through centralized gateway with Firebase Storage fallback
          const attachmentUrl = await uploadOptimizedImage(details.attachment, `sow_events/${sow.id}/${type}_${Date.now()}.webp`);
          finalDetails.attachmentUrl = attachmentUrl;
          delete finalDetails.attachment;
        } catch (uploadErr) {
          console.error("Centralized upload for sow event photo failed:", uploadErr);
          // Keep base64 as safe fallback
        }
      }

      await recordEvent(sow, type, date, finalDetails, selectedTaskId, recorderName, videoUrl, draftDocId);
      hideLoading();
      showSuccess('บันทึกประวัติการทำกิจกรรมเรียบร้อยแล้ว');
      setModalType(null);
      setSelectedTaskId(undefined);
      if (type === 'CULL') {
        navigate('/sows', { replace: true });
      }
    } catch (error) {
      hideLoading();
      console.error("Error in handleEventSubmit:", error);
      showError('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'PENDING');
  
  // Group events by parity
  const eventsByParity = events.reduce((acc, event) => {
    if (!acc[event.parity]) acc[event.parity] = [];
    acc[event.parity].push(event);
    return acc;
  }, {} as Record<number, SowEvent[]>);

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
      case 'IDLE': return <Activity className="w-3.5 h-3.5 mr-1.5 inline-block" />;
      case 'MATED': return <Heart className="w-3.5 h-3.5 mr-1.5 inline-block" />;
      case 'PREGNANT': return <Hourglass className="w-3.5 h-3.5 mr-1.5 inline-block" />;
      case 'LACTATING': return <Baby className="w-3.5 h-3.5 mr-1.5 inline-block" />;
      case 'RECOVERY': return <ShieldAlert className="w-3.5 h-3.5 mr-1.5 inline-block" />;
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

  const getEventLabel = (type: EventType) => {
    switch (type) {
      case 'BREED': return 'ผสมพันธุ์';
      case 'ULTRASOUND': return 'ตรวจสัด/อัลตราซาวด์';
      case 'FARROW': return 'คลอด';
      case 'WEAN': return 'หย่านม';
      case 'HEALTH': return 'สุขภาพ';
      case 'CULL': return 'คัดทิ้ง';
      case 'HEAT_RETURN': return 'กลับสัด';
      default: return type;
    }
  };

  const getTaskLabel = (type: string) => {
    switch (type) {
      case 'BREED': return 'กำหนดผสมพันธุ์';
      case 'HEAT_CHECK': return 'ตรวจกลับสัด';
      case 'ULTRASOUND': return 'อัลตราซาวด์';
      case 'MOVE_TO_FARROW': return 'ย้ายเข้าเล้าคลอด';
      case 'FARROW': return 'กำหนดคลอด';
      case 'WEAN': return 'กำหนดหย่านม';
      default: return type;
    }
  };

  const getTaskActionType = (taskType: string): EventType => {
    switch (taskType) {
      case 'BREED': return 'BREED';
      case 'HEAT_CHECK': return 'ULTRASOUND'; 
      case 'ULTRASOUND': return 'ULTRASOUND';
      case 'MOVE_TO_FARROW': return 'HEALTH'; 
      case 'FARROW': return 'FARROW';
      case 'WEAN': return 'WEAN';
      default: return 'HEALTH';
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/sows')} className="p-3 bg-white dark:bg-white/10 backdrop-blur-md rounded-full shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white active:scale-95 transition-transform">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-wide">{sow.sowId}</h2>
        </div>
        
        <button onClick={() => setShowMenu(!showMenu)} className="p-3 bg-white dark:bg-white/10 backdrop-blur-md rounded-full shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white active:scale-95 transition-transform">
          <MoreVertical className="w-6 h-6" />
        </button>

        {/* 3-dot Menu Dropdown */}
        {showMenu && (
          <div className="absolute top-16 right-0 w-56 bg-white/95 dark:bg-[#0a2e36]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/20 overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => { setModalType('HEALTH'); setShowMenu(false); }} className="w-full text-left px-5 py-4 text-base text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-3 transition-colors">
              <HeartPulse className="w-5 h-5 text-[#00bcd4]" /> บันทึกสุขภาพ/วัคซีน
            </button>
            {sow.type !== 'BOAR' && (
              <button onClick={() => { setModalType('HEAT_RETURN'); setShowMenu(false); }} className="w-full text-left px-5 py-4 text-base text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-3 transition-colors">
                <Activity className="w-5 h-5 text-orange-400" /> แจ้งกลับสัด
              </button>
            )}
            <div className="h-px bg-white dark:bg-white/10"></div>
            <button onClick={() => { setModalType('CULL'); setShowMenu(false); }} className="w-full text-left px-5 py-4 text-base text-red-400 hover:bg-red-500/20 flex items-center gap-3 transition-colors">
              <Trash2 className="w-5 h-5" /> คัดทิ้ง (Cull)
            </button>
          </div>
        )}
      </div>

      {/* Sow Info Card */}
      <div className="bg-white dark:bg-white/10 backdrop-blur-md rounded-3xl p-6 shadow-2xl dark:shadow-xl border border-slate-200 dark:border-white/20 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-sm text-slate-600 dark:text-white/60 mb-1 font-medium tracking-wide">สายพันธุ์</p>
            <p className="font-bold text-slate-900 dark:text-white text-xl">{sow.breed}</p>
          </div>
          <div className="text-right">
            <span className={clsx("px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider border inline-flex items-center", getStatusColor(sow.status))}>
              {getStatusIcon(sow.status)}
              {getStatusLabel(sow.status)}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-white/10">
          <div>
            {sow.type !== 'BOAR' ? (
              <>
                <p className="text-sm text-slate-600 dark:text-white/60 mb-1 font-medium tracking-wide">รอบการผลิต (Parity)</p>
                <p className="font-bold text-slate-900 dark:text-white text-2xl">{sow.parity}</p>
                {sow.parity >= 7 && <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5 font-medium"><AlertCircle className="w-4 h-4"/> แนะนำให้คัดทิ้ง</p>}
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-white/60 mb-1 font-medium tracking-wide">ประเภท</p>
                <p className="font-bold text-orange-400 text-xl flex items-center gap-2">♂ พ่อพันธุ์</p>
              </>
            )}
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-white/60 mb-1 font-medium tracking-wide">วันที่เข้าฝูง</p>
            <p className="font-bold text-slate-900 dark:text-white text-lg">{sow.entryDate}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm text-slate-600 dark:text-white/60 mb-1 font-medium tracking-wide">ตำแหน่ง (กรง)</p>
            <p className="font-bold text-[#00bcd4] text-lg">
              {sow.penId ? `กรง ${sow.penId}` : 'จุดพักหมู (รอเข้ากรง)'}
            </p>
          </div>
        </div>
        {sow.recordedBy && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-2.5">
            <span className="text-xs text-slate-500 dark:text-white/40 font-medium">ผู้ลงทะเบียนเข้าระบบ</span>
            <span className="text-xs text-[#00bcd4] font-bold">{sow.recordedBy}</span>
          </div>
        )}
      </div>

      {/* AI Live Scanner Banner */}
      <button 
        onClick={() => navigate(`/sows/${sow.id}/scan-ai`)} 
        className="w-full bg-gradient-to-r from-[#031d24] to-[#01090c] hover:from-[#00303b] hover:to-[#01141a] text-white border-2 border-dashed border-[#00bcd4]/40 hover:border-[#00bcd4] p-4 rounded-2xl shadow-[0_0_15px_rgba(0,188,212,0.15)] active:scale-[0.98] transition-all mb-4 flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-[#00bcd4] to-cyan-600 rounded-xl text-slate-900 shadow-[0_0_10px_rgba(0,188,212,0.4)]">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-extrabold text-white text-base">ระบบเปิดกล้องคุยสดกับ AI 📡</p>
            <p className="text-xs text-cyan-400 font-semibold mt-0.5">ตรวจอวัยวะเพศประเมินการกลับสัด & อัลตราซาวด์ตรวจท้อง</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-black rounded-lg border border-cyan-500/20">
          เปิดกล้อง
        </div>
      </button>

      {/* Action Buttons (Main) */}
      {(sow.status === 'IDLE' || sow.status === 'RECOVERY') && sow.type !== 'BOAR' && (
        <button onClick={() => setModalType('BREED')} className="w-full bg-[#00bcd4] text-slate-900 dark:text-white font-bold p-4 rounded-2xl shadow-[0_0_20px_rgba(0,188,212,0.3)] hover:bg-cyan-400 active:scale-95 transition-all mb-8 flex justify-center items-center gap-3 text-lg border border-slate-200 dark:border-white/20">
          <div className="p-1.5 bg-slate-100 dark:bg-white/20 rounded-lg">
            <Beaker className="w-6 h-6" />
          </div>
          บันทึกผสมพันธุ์
        </button>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 mb-6">
        <button 
          onClick={() => setActiveTab('TASKS')}
          className={clsx("flex-1 py-4 text-base font-bold border-b-2 transition-all", activeTab === 'TASKS' ? "border-[#00bcd4] text-[#00bcd4]" : "border-transparent text-slate-600 dark:text-white/50 ")}
        >
          กำหนดการ ({pendingTasks.length})
        </button>
        <button 
          onClick={() => setActiveTab('HISTORY')}
          className={clsx("flex-1 py-4 text-base font-bold border-b-2 transition-all", activeTab === 'HISTORY' ? "border-[#00bcd4] text-[#00bcd4]" : "border-transparent text-slate-600 dark:text-white/50 ")}
        >
          ประวัติ
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
      {activeTab === 'TASKS' && (
        <motion.div 
          key="tasks"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {pendingTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-600 dark:text-white/50 bg-slate-100 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10 border-dashed shadow-xl dark:shadow-2xl text-lg">ไม่มีกำหนดการในขณะนี้</div>
          ) : (
            pendingTasks.map((task, index) => {
              let formattedDate = task.dueDate;
              try {
                formattedDate = format(parseISO(task.dueDate), 'dd MMM yyyy', { locale: th });
              } catch (e) {}
              
              return (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                key={task.id} 
                className="bg-white dark:bg-white/10 backdrop-blur-md p-5 rounded-3xl shadow-xl dark:shadow-2xl border border-slate-200/50 dark:border-white/20 flex justify-between items-center group hover:shadow-2xl hover:border-[#00bcd4]/30 transition-all"
              >
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-xl tracking-tight group-hover:text-[#00bcd4] transition-colors">{getTaskLabel(task.type)}</p>
                  <p className="text-sm text-slate-500 dark:text-white/60 flex items-center gap-2 mt-2 font-bold">
                    <CalendarIcon className="w-4 h-4 text-[#00bcd4]" /> {formattedDate}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    if (task.type === 'MOVE_TO_FARROW') {
                      showConfirm('ยืนยันการย้ายเข้าเล้าคลอด?', () => {
                        recordEvent(sow, 'HEALTH', new Date().toISOString().split('T')[0], { type: 'GENERAL', notes: 'ย้ายเข้าเล้าคลอด' }, task.id, recorderName);
                      });
                    } else if (task.type === 'HEAT_CHECK') {
                      setHeatCheckTask(task);
                    } else {
                      setSelectedTaskId(task.id);
                      setModalType(getTaskActionType(task.type));
                    }
                  }}
                  className="px-6 py-3 bg-[#00bcd4]/10 text-[#00bcd4] border-2 border-[#00bcd4]/30 rounded-[1.25rem] text-sm font-black hover:bg-[#00bcd4] hover:text-slate-900 hover:border-[#00bcd4] transition-all hover:scale-105 active:scale-95 shadow-sm"
                >
                  บันทึก
                </button>
              </motion.div>
            );
            })
          )}
        </motion.div>
      )}

      {activeTab === 'HISTORY' && (
        <motion.div 
          key="history"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {Object.keys(eventsByParity).sort((a,b) => Number(b) - Number(a)).map((parityStr, pIndex) => {
            const parityNum = Number(parityStr);
            const isExpanded = expandedParities[parityNum] !== undefined ? expandedParities[parityNum] : (pIndex === 0);
            const parityEvents = eventsByParity[parityNum] || [];

            // Extract summary info
            const breedEvent = parityEvents.find(e => e.type === 'BREED');
            const farrowEvent = parityEvents.find(e => e.type === 'FARROW');
            const weanEvent = parityEvents.find(e => e.type === 'WEAN');
            const ultrasoundEvent = parityEvents.find(e => e.type === 'ULTRASOUND');

            return (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: pIndex * 0.1 }}
                key={parityNum}
                className="bg-white dark:bg-[#11242c] rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden"
              >
                {/* Accordion Trigger Header */}
                <div 
                  onClick={() => toggleParity(parityNum)}
                  className={clsx(
                    "p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none transition-colors",
                    isExpanded ? "bg-[#00bcd4]/10 dark:bg-[#00bcd4]/5 border-b border-slate-200 dark:border-[#00bcd4]/20" : "hover:bg-slate-50 dark:hover:bg-white/5"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00bcd4] animate-pulse"></span>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-wide">รอบการผลิตที่ {parityNum}</h3>
                    </div>
                    
                    {/* Performance Summary Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs font-semibold text-slate-500 dark:text-white/60">
                      {/* Breed Event summary */}
                      <div className="bg-slate-100/60 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-purple-400 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-white/40 uppercase font-bold">ผสมพันธุ์</p>
                          <p className="text-slate-700 dark:text-white/80 font-bold">
                            {breedEvent ? (
                              <>
                                {(() => {
                                  try {
                                    return format(parseISO(breedEvent.date), 'dd MMM yy', { locale: th });
                                  } catch {
                                    return breedEvent.date;
                                  }
                                })()}
                                <span className="text-slate-400 dark:text-white/40 font-medium ml-1">
                                  ({breedEvent.details?.method === 'NATURAL' ? 'ผสมจริง' : 'ผสมเทียม'})
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-400 dark:text-white/30 font-medium">-</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Farrow Event summary */}
                      <div className="bg-slate-100/60 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5 flex items-center gap-2">
                        <Baby className="w-4 h-4 text-red-500 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-white/40 uppercase font-bold">ผลคลอด (รอด/ตาย/มัมมี่)</p>
                          <p className="text-slate-700 dark:text-white/80 font-bold">
                            {farrowEvent ? (
                              <>
                                <span className="text-emerald-500">{farrowEvent.details?.liveBorn ?? 0}</span>
                                <span className="text-slate-400 mx-1">/</span>
                                <span className="text-red-500">{farrowEvent.details?.stillborn ?? 0}</span>
                                <span className="text-slate-400 mx-1">/</span>
                                <span className="text-amber-500">{farrowEvent.details?.mummy ?? 0}</span>
                              </>
                            ) : ultrasoundEvent?.details?.result === 'NEGATIVE' ? (
                              <span className="text-red-400 font-bold text-xs">ไม่ท้อง</span>
                            ) : ultrasoundEvent?.details?.result === 'ABORTION' ? (
                              <span className="text-red-500 font-bold text-xs">แท้ง</span>
                            ) : (
                              <span className="text-slate-400 dark:text-white/30 font-medium">-</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Wean Event summary */}
                      <div className="bg-slate-100/60 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-white/40 uppercase font-bold">หย่านม</p>
                          <p className="text-slate-700 dark:text-white/80 font-bold">
                            {weanEvent ? (
                              <>
                                หย่า <span className="font-mono text-emerald-500">{weanEvent.details?.weanedCount ?? 0}</span> ตัว
                                <span className="text-slate-400 dark:text-white/40 font-medium ml-1">
                                  ({weanEvent.details?.totalWeight ?? 0}กก.)
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-400 dark:text-white/30 font-medium">-</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Handle arrow */}
                  <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-full select-none shrink-0 self-end md:self-center">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-600 dark:text-white/70" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-600 dark:text-white/70" />
                    )}
                  </div>
                </div>

                {/* Collapsible Content */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden bg-slate-50/50 dark:bg-white/[0.01]"
                    >
                      <div className="p-6 space-y-5 border-t border-slate-200 dark:border-white/5">
                        {parityEvents.map((event) => (
                          <div 
                            key={event.id} 
                            className="bg-white dark:bg-[#1a2f3a] p-5 rounded-[1.5rem] shadow-sm border border-slate-200/50 dark:border-white/5 transition-all"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <p className="font-black text-slate-900 dark:text-white flex items-center gap-3 text-lg">
                                <span className="p-1.5 bg-[#00bcd4]/10 rounded-xl">
                                  <CheckCircle2 className="w-5 h-5 text-[#00bcd4]" />
                                </span>
                                {getEventLabel(event.type)}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-white/50 font-bold bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-white/5 shadow-sm">
                                {(() => {
                                  try {
                                    return format(parseISO(event.date), 'dd MMM yyyy', { locale: th });
                                  } catch {
                                    return event.date;
                                  }
                                })()}
                              </p>
                            </div>
                            <div className="text-sm text-slate-700 dark:text-white/80 bg-slate-50 dark:bg-white/[0.02] p-5 rounded-2xl border border-slate-200/50 dark:border-white/5 leading-relaxed shadow-inner">
                              {event.type === 'BREED' && <p>วิธี: <span className="font-bold text-slate-900 dark:text-white">{event.details?.method === 'NATURAL' ? 'ผสมจริง' : 'ผสมเทียม'}</span> | พ่อพันธุ์/น้ำเชื้อ: <span className="font-bold text-slate-900 dark:text-white">{event.details?.boarId || event.details?.semenId}</span></p>}
                              {event.type === 'ULTRASOUND' && <p>ผล: <span className="font-bold text-slate-900 dark:text-white">{event.details?.result}</span></p>}
                              {event.type === 'FARROW' && <p>รอด: <span className="font-bold text-slate-900 dark:text-white">{event.details?.liveBorn}</span> | ตายโคม: <span className="font-bold text-slate-900 dark:text-white">{event.details?.stillborn}</span> | มัมมี่: <span className="font-bold text-slate-900 dark:text-white">{event.details?.mummy}</span> | นน.เฉลี่ย: <span className="font-bold text-slate-900 dark:text-white">{event.details?.avgWeight}กก.</span></p>}
                              {event.type === 'WEAN' && <p>หย่านม: <span className="font-bold text-slate-900 dark:text-white">{event.details?.weanedCount} ตัว</span> | นน.รวม: <span className="font-bold text-slate-900 dark:text-white">{event.details?.totalWeight}กก.</span></p>}
                              {event.type === 'HEALTH' && (
                                <div>
                                  <p>ประเภท: <span className="font-bold text-slate-900 dark:text-white">{event.details?.type === 'GENERAL' ? 'ทั่วไป' : event.details?.type === 'VACCINE' ? 'วัคซีน' : 'ป่วย/รักษา'}</span> | หมายเหตุ: <span className="font-bold text-slate-900 dark:text-white">{event.details?.notes || '-'}</span></p>
                                  {event.details?.attachmentUrl && (
                                    <div className="mt-3">
                                      <a href={event.details.attachmentUrl} target="_blank" rel="noreferrer" className="inline-block">
                                        <img src={event.details.attachmentUrl} alt="Attached Evidence" className="max-h-40 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm cursor-pointer hover:opacity-90 transition-opacity" referrerPolicy="no-referrer" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                              {(event.type === 'CULL' || event.type === 'HEAT_RETURN') && <p>หมายเหตุ: <span className="font-bold text-slate-900 dark:text-white">{event.details?.notes || event.details?.reason}</span></p>}
                              
                              {event.videoUrl && (
                                <div className="mt-4 max-w-md">
                                  <p className="text-[11px] font-bold text-slate-500 dark:text-white/40 mb-1.5 flex items-center gap-1">
                                    📹 วิดีโอบันทึกหลักฐาน (Cloudflare R2):
                                  </p>
                                  <SecureVideoPlayer videoUrl={event.videoUrl} userId={user?.uid} />
                                </div>
                              )}

                              {event.recordedBy && <p className="mt-3 pt-3 border-t border-slate-200/50 dark:border-white/5 text-[11px] font-black tracking-wider text-[#00bcd4]/70 uppercase">ผู้บันทึก: {event.recordedBy}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
          {events.length === 0 && <div className="text-center py-12 text-slate-600 dark:text-white/50 text-lg font-bold">ยังไม่มีประวัติกิจกรรม</div>}
        </motion.div>
      )}
      </AnimatePresence>

      <EventModals 
        isOpen={modalType !== null} 
        type={modalType} 
        onClose={() => { setModalType(null); setSelectedTaskId(undefined); }} 
        onSubmit={handleEventSubmit} 
      />

      {/* Custom Heat Check Selection Modal */}
      {heatCheckTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white dark:bg-[#11242c] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-400 animate-pulse" />
                  ผลการตรวจกลับสัด
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/60 mt-1 font-bold">รหัสแม่หมู: {sow.sowId}</p>
              </div>
              <button 
                onClick={() => setHeatCheckTask(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all font-black text-xl"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm font-bold text-slate-500 dark:text-white/80 leading-relaxed text-center mb-2">
                กรุณาเลือกผลการตรวจกลับสัดของแม่หมูในรอบปัจจุบัน
              </p>

              {/* Option 1: Normal (Silent / Pass) */}
              <button
                onClick={async () => {
                  const currentTask = heatCheckTask;
                  setHeatCheckTask(null);
                  try {
                    await recordEvent(
                      sow, 
                      'HEALTH', 
                      new Date().toISOString().split('T')[0], 
                      { type: 'GENERAL', notes: 'ตรวจสัด: ปกติ (ไม่พบการกลับสัด/รอยืนยันท้อง)' }, 
                      currentTask.id, 
                      recorderName
                    );
                  } catch (error) {
                    console.error("Error saving heat_check:", error);
                    showAlert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
                  }
                }}
                className="w-full text-left p-5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border-2 border-emerald-500/20 hover:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 transition-all flex items-start gap-3 active:scale-[0.98]"
              >
                <CheckCircle2 className="w-6 h-6 mt-0.5 shrink-0 text-emerald-500" />
                <div>
                  <p className="font-black text-base text-emerald-700 dark:text-emerald-400">ปกติ (ไม่พบการกลับสัด)</p>
                  <p className="text-xs opacity-90 mt-1 font-bold leading-normal">แม่หมูไม่มีระดูหรืออาการเป็นสัด ไม่ยอมให้พ่อหมูปีน พร้อมรอยืนยันการตั้งท้องในขั้นตอนอัลตราซาวด์ถัดไป</p>
                </div>
              </button>

              {/* Option 2: Returned to Heat */}
              <button
                onClick={() => {
                  const currentTask = heatCheckTask;
                  setHeatCheckTask(null);
                  setModalType('HEAT_RETURN');
                  setSelectedTaskId(currentTask.id);
                }}
                className="w-full text-left p-5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border-2 border-rose-500/20 hover:border-rose-500/40 text-rose-800 dark:text-rose-300 transition-all flex items-start gap-3 active:scale-[0.98]"
              >
                <AlertCircle className="w-6 h-6 mt-0.5 shrink-0 text-rose-500" />
                <div>
                  <p className="font-black text-base text-rose-700 dark:text-rose-400">พบการกลับสัด (ผสมไม่ติด)</p>
                  <p className="text-xs opacity-90 mt-1 font-bold leading-normal">แม่หมูแสดงอาการเป็นสัดอีกครั้ง ยอมให้ตัวอื่นปีน ต้องแจ้งกลับสัดเพื่อรอผสมใหม่อีกรอบ</p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex justify-end">
              <button
                onClick={() => setHeatCheckTask(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-white rounded-xl text-xs font-black transition-all"
              >
                ยกเลิก (ปิดพ็อพแร็พ)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
