import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { ArrowLeft, Clock, Wrench, CheckCircle, AlertTriangle, User } from 'lucide-react';
import { SecureVideoPlayer } from '../../components/SecureVideoPlayer';

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
  }, [id, navigate]);

  const handleStatusUpdate = async (newStatus: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED') => {
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white dark:bg-white/10 backdrop-blur-md p-4 rounded-xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-white/10">
        <button onClick={() => navigate('/maintenance')} className="p-2 -ml-2 text-gray-500 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 rounded-full border-transparent">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">รายละเอียดแจ้งซ่อม</h2>
      </div>

      {(() => {
        const images = request.imageUrls?.length ? request.imageUrls : (request.imageUrl ? [request.imageUrl] : []);
        if (images.length === 0) return null;
        
        return (
          <div className="bg-white dark:bg-white/10 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-white/10">
             <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-1">
              {images.map((url, i) => (
                <div key={i} className={`relative aspect-video flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-black/50 snap-center ${images.length > 1 ? 'w-[85%]' : 'w-full'}`}>
                  <img src={url} alt={`Damage ${i+1}`} className="w-full h-full object-cover" />
                </div>
              ))}
             </div>
          </div>
        );
      })()}

      {request.videoUrl && (
        <div className="bg-white dark:bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 space-y-2">
          <h4 className="text-sm font-semibold text-gray-500 dark:text-white/60">📹 วิดีโอหลักฐานการแจ้งซ่อม (Cloudflare R2)</h4>
          <SecureVideoPlayer videoUrl={request.videoUrl} userId={user?.uid} />
        </div>
      )}

      <div className="bg-white dark:bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 space-y-4">
        <div className="flex justify-between items-start">
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
          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
            <p className="text-gray-500 dark:text-white/50 text-sm mb-1">รายละเอียดเพิ่มเติม</p>
            <p className="text-gray-800 dark:text-white/90 text-sm whitespace-pre-wrap">{request.description}</p>
          </div>
        )}
        
        <p className="text-xs text-gray-400 dark:text-white/40 text-right">
          แจ้งเมื่อ {new Date(request.createdAt).toLocaleString('th-TH')}
        </p>
      </div>

      {isAdmin && (
        <div className="bg-white dark:bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 space-y-3">
          <h3 className="font-bold text-gray-800 dark:text-white">อัปเดตสถานะ (สำหรับแอดมิน)</h3>
          <div className="grid grid-cols-3 gap-2">
             <button
                onClick={() => handleStatusUpdate('PENDING')}
                disabled={updating}
                className={`p-3 rounded-xl border font-medium flex flex-col items-center gap-2 transition-colors ${request.status === 'PENDING' ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400' : 'border-gray-100 dark:border-white/10 text-gray-500 dark:text-white/60 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10'}`}
              >
                <Clock className="w-6 h-6" />
                <span className="text-xs">รอรับเรื่อง</span>
              </button>
              <button
                onClick={() => handleStatusUpdate('IN_PROGRESS')}
                disabled={updating}
                className={`p-3 rounded-xl border font-medium flex flex-col items-center gap-2 transition-colors ${request.status === 'IN_PROGRESS' ? 'bg-blue-50 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400' : 'border-gray-100 dark:border-white/10 text-gray-500 dark:text-white/60 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10'}`}
              >
                <Wrench className="w-6 h-6" />
                <span className="text-xs">กำลังซ่อม</span>
              </button>
              <button
                onClick={() => handleStatusUpdate('RESOLVED')}
                disabled={updating}
                className={`p-3 rounded-xl border font-medium flex flex-col items-center gap-2 transition-colors ${request.status === 'RESOLVED' ? 'bg-green-50 dark:bg-green-500/20 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400' : 'border-gray-100 dark:border-white/10 text-gray-500 dark:text-white/60 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10'}`}
              >
                <CheckCircle className="w-6 h-6" />
                <span className="text-xs">แก้ไขแล้ว</span>
              </button>
          </div>
        </div>
      )}
    </div>
  );
}
