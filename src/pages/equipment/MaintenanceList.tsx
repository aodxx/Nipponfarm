import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../../lib/firestore-error';
import { db } from '../../lib/firebase';
import { Plus, Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface MaintenanceRequest {
  id: string;
  title: string;
  location: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reportedBy: string;
  createdAt: number;
}

export default function MaintenanceList() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-amber-600 bg-amber-50 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/30';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/30';
      case 'RESOLVED': return 'text-green-600 bg-green-50 dark:bg-green-500/20 dark:text-green-400 border border-green-500/30';
      default: return 'text-gray-600 bg-gray-50 dark:bg-white/10 dark:text-white/60 border border-gray-500/30';
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
      case 'IN_PROGRESS': return 'กำลังซ่อม';
      case 'RESOLVED': return 'แก้ไขแล้ว';
      default: return status;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">ด่วนที่สุด</span>;
      case 'HIGH': return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">ด่วน</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">แจ้งซ่อมอุปกรณ์</h2>
          <p className="text-sm text-gray-500 dark:text-white/60">ระบบแจ้งอุปกรณ์ชำรุดในฟาร์ม</p>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-500">
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>

      <button
        onClick={() => navigate('/maintenance/new')}
        className="w-full bg-white dark:bg-[#0a2e36] text-slate-900 dark:text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-xl dark:shadow-2xl shadow-[#0a2e36]/20"
      >
        <Plus className="w-5 h-5" />
        แจ้งซ่อมใหม่
      </button>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-4 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white dark:bg-white/5 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 text-center">
          <Wrench className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-white/50 font-medium">ยังไม่มีรายการแจ้งซ่อม</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} onClick={() => navigate(`/maintenance/${req.id}`)} className="bg-white dark:bg-white/10 backdrop-blur-md p-4 rounded-xl shadow-xl border border-gray-100 dark:border-white/10 active:bg-gray-50 dark:active:bg-white/5 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-800 dark:text-white">{req.title}</h3>
                {getUrgencyBadge(req.urgency)}
              </div>
              <p className="text-sm text-gray-600 dark:text-white/60 mb-3 line-clamp-2">{req.location}</p>
              
              <div className="flex justify-between items-center text-xs">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${getStatusColor(req.status)}`}>
                  {getStatusIcon(req.status)}
                  <span>{getStatusText(req.status)}</span>
                </div>
                <span className="text-gray-400 dark:text-white/40">
                  {new Date(req.createdAt).toLocaleDateString('th-TH')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
