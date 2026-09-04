import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { ArrowLeft, Wrench, CheckCircle, AlertTriangle, User, ArrowRight } from 'lucide-react';
import { SecureVideoPlayer } from '../../components/SecureVideoPlayer';
import MaintenanceWorkflowProgress from '../../components/maintenance/MaintenanceWorkflowProgress';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  location: string;
  imageUrl: string | null;
  imageUrls?: string[];
  videoUrl?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reportedBy: string;
  createdAt: number;
}

export default function MaintenanceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile, user } = useAuth();
  const { showAlert } = useBottomSheet();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const isAdmin = userProfile?.role === 'ADMIN';

  useEffect(() => {
    const fetchRequest = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'maintenance_requests', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setRequest({ id: docSnap.id, ...docSnap.data() } as MaintenanceRequest);
        } else {
          showAlert('ไม่พบข้อมูลการแจ้งซ่อม');
          navigate('/maintenance');
        }
      } catch (error) {
        console.error('Error fetching request:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id, navigate, showAlert]);

  const handleStatusUpdate = async (newStatus: 'IN_PROGRESS' | 'RESOLVED') => {
    if (!id || updating) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'maintenance_requests', id), {
        status: newStatus,
        updatedAt: Date.now()
      });
      setRequest(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      console.error('Error updating status:', error);
      showAlert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-8 h-8 border-4 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!request) return null;

  const nextAction = request.status === 'PENDING'
    ? {
        title: 'รับงานและเริ่มดำเนินการ',
        description: 'เปลี่ยนสถานะจากรอรับเรื่องเป็นกำลังดำเนินการ',
        action: () => handleStatusUpdate('IN_PROGRESS'),
        icon: Wrench,
      }
    : request.status === 'IN_PROGRESS'
      ? {
          title: 'ปิดงานซ่อม',
          description: 'ยืนยันว่าปัญหาได้รับการแก้ไขเรียบร้อยแล้ว',
          action: () => handleStatusUpdate('RESOLVED'),
          icon: CheckCircle,
        }
      : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-white dark:bg-white/10 backdrop-blur-md p-4 rounded-xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-white/10">
        <button onClick={() => navigate('/maintenance')} className="p-2 -ml-2 text-gray-500 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 rounded-full border-transparent">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">รายละเอียดงานซ่อม</h2>
          <p className="text-xs text-gray-500 dark:text-white/50">ติดตามตั้งแต่แจ้งเรื่องจนปิดงาน</p>
        </div>
      </div>

      <MaintenanceWorkflowProgress status={request.status} />

      {(() => {
        const images = request.imageUrls?.length ? request.imageUrls : (request.imageUrl ? [request.imageUrl] : []);
        if (images.length === 0) return null;

        return (
          <div className="bg-white dark:bg-white/10 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-white/10">
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-1">
              {images.map((url, i) => (
                <div key={i} className={`relative aspect-video flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-black/50 snap-center ${images.length > 1 ? 'w-[85%]' : 'w-full'}`}>
                  <img src={url} alt={`Damage ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {request.videoUrl && (
        <div className="bg-white dark:bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 space-y-2">
          <h4 className="text-sm font-semibold text-gray-500 dark:text-white/60">วิดีโอประกอบการแจ้งซ่อม</h4>
          <SecureVideoPlayer videoUrl={request.videoUrl} userId={user?.uid} />
        </div>
      )}

      <div className="bg-white dark:bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 space-y-4">
        <div className="flex justify-between items-start gap-3">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">{request.title}</h3>
          {request.urgency === 'CRITICAL' && <span className="px-3 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-full flex items-center gap-1 border border-red-500/30"><AlertTriangle className="w-3 h-3" /> ด่วนที่สุด</span>}
          {request.urgency === 'HIGH' && <span className="px-3 py-1 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-500/30 text-xs font-bold rounded-full">ด่วน</span>}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
            <p className="text-gray-500 dark:text-white/50 mb-1">สถานที่</p>
            <p className="font-bold text-gray-800 dark:text-white">{request.location}</p>
          </div>
          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
            <p className="text-gray-500 dark:text-white/50 mb-1">แจ้งโดย</p>
            <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-white">
              <User className="w-3.5 h-3.5 text-gray-400 dark:text-white/40" />
              <p className="truncate">{request.reportedBy}</p>
            </div>
          </div>
        </div>

        {request.description && (
          <details className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
            <summary className="cursor-pointer text-sm font-bold text-gray-600 dark:text-white/70">รายละเอียดเพิ่มเติม</summary>
            <p className="mt-2 text-sm text-gray-800 dark:text-white/90 whitespace-pre-wrap">{request.description}</p>
          </details>
        )}

        <p className="text-xs text-gray-400 dark:text-white/40 text-right">
          แจ้งเมื่อ {new Date(request.createdAt).toLocaleString('th-TH')}
        </p>
      </div>

      {isAdmin && (
        <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#102247]/90">
          {nextAction ? (
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">Next action</p>
                <h3 className="mt-1 font-black text-slate-950 dark:text-white">งานที่ควรทำต่อ</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-white/55">{nextAction.description}</p>
              </div>
              <button
                onClick={nextAction.action}
                disabled={updating}
                className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#0E214B] px-5 font-black text-white shadow-lg shadow-slate-900/10 transition active:scale-[0.99] disabled:opacity-50 dark:bg-cyan-500 dark:text-[#07152f]"
              >
                <nextAction.icon className="h-5 w-5" />
                {updating ? 'กำลังอัปเดต...' : nextAction.title}
                {!updating && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-black">ปิดงานเรียบร้อยแล้ว</p>
                <p className="mt-1 text-sm opacity-80">รายการนี้เสร็จสิ้นแล้ว ไม่มีขั้นตอนที่ต้องดำเนินการต่อ</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
