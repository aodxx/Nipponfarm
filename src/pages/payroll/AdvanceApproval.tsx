import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HandCoins, Check, X, Copy, Upload, Trash2, FileImage, AlertCircle, CheckCircle2 } from 'lucide-react';
import { updateAdvanceStatus, subscribeToMonthlyAdvances, recordEmployeeTransaction } from '../../services/employeeService';
import { getAllUsers } from '../../services/userService';
import { SalaryAdvance, UserProfile } from '../../types';
import { useBottomSheet } from '../../contexts/BottomSheetContext';

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
      img.onerror = (error) => reject(error);
      img.src = event.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export default function AdvanceApproval() {
  const navigate = useNavigate();
  const { showAlert } = useBottomSheet();
  
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedAdvance, setSelectedAdvance] = useState<SalaryAdvance | null>(null);
  const [uploadedSlip, setUploadedSlip] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await getAllUsers();
        const userMap: Record<string, UserProfile> = {};
        fetchedUsers.forEach(u => userMap[u.uid] = u);
        setUsers(userMap);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();

    const unsubAdvances = subscribeToMonthlyAdvances(new Date(), (data) => {
      // Show only pending items this month
      setAdvances(data.filter(a => a.status === 'PENDING'));
      setLoading(false);
    });

    return () => unsubAdvances();
  }, []);

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await updateAdvanceStatus(id, status);
      showAlert(`คำขอถูก${status === 'APPROVED' ? 'อนุมัติ' : 'ปฏิเสธ'}แล้ว`);
    } catch (e) {
      showAlert('เกิดข้อผิดพลาด');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showAlert('❌ กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น');
        return;
      }
      try {
        const { optimizeImage } = await import('../../services/imageOptimizer');
        const optimized = await optimizeImage(file, { type: 'document' });
        setUploadedSlip(optimized.dataUrl);
      } catch (err) {
        console.error(err);
        showAlert('❌ เกิดข้อผิดพลาดในการบีบอัดรูปภาพ');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showAlert('❌ กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น');
        return;
      }
      try {
        const { optimizeImage } = await import('../../services/imageOptimizer');
        const optimized = await optimizeImage(file, { type: 'document' });
        setUploadedSlip(optimized.dataUrl);
      } catch (err) {
        console.error(err);
        showAlert('❌ เกิดข้อผิดพลาดในการบีบอัดรูปภาพ');
      }
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showAlert('📋 คัดลอกเลขที่บัญชีแล้ว');
  };

  const handleConfirmPayment = async () => {
    if (!selectedAdvance || !uploadedSlip) {
      showAlert('❌ กรุณาแนบไฟล์รูปภาพสลิปโอนเงินจริงก่อนกดยืนยันการจ่ายเงิน');
      return;
    }
    setIsSubmitting(true);
    try {
      const empName = users[selectedAdvance.userId]?.displayName || 'ไม่ทราบชื่อ';
      
      let finalSlipUrl = uploadedSlip;
      if (uploadedSlip && uploadedSlip.startsWith('data:image')) {
        try {
          const { uploadOptimizedImage } = await import('../../services/imageOptimizer');
          finalSlipUrl = await uploadOptimizedImage(uploadedSlip, `slips/advances/${selectedAdvance.userId}/${selectedAdvance.id || Date.now()}.webp`);
        } catch (uploadErr) {
          console.error("Centralized slip upload failed, falling back:", uploadErr);
        }
      }

      // 1. Update advance request in DB to APPROVED and attach slipImage
      await updateAdvanceStatus(selectedAdvance.id!, 'APPROVED', finalSlipUrl);

      // 2. Add record to EmployeeTransaction collection for transparency
      await recordEmployeeTransaction({
        userId: selectedAdvance.userId,
        employeeName: empName,
        amount: selectedAdvance.amount,
        type: 'advance',
        date: selectedAdvance.date,
        slipImage: finalSlipUrl,
        createdAt: Date.now()
      });

      showAlert('✅ บันทึกการจ่ายเงินเบิกและสลิปหลักฐานสำเร็จ!');
      setSelectedAdvance(null);
      setUploadedSlip(null);
    } catch (err: any) {
      console.error(err);
      showAlert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
     return <div className="flex justify-center items-center py-20"><div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div></div>;
  }

  const selectedUser = selectedAdvance ? users[selectedAdvance.userId] : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-slate-50 dark:bg-white/5 backdrop-blur-md rounded-full shadow-sm border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600 dark:text-amber-400">
            <HandCoins className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">อนุมัติเบิกล่วงหน้า</h2>
        </div>
      </div>

      <div className="space-y-4">
        {advances.length > 0 ? advances.map(adv => (
          <div key={adv.id} className="bg-white dark:bg-[#1a2f3a] rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-white/10 flex flex-col gap-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{users[adv.userId]?.displayName || 'ไม่ทราบชื่อ'}</h3>
                <span className="text-sm font-medium text-slate-500 dark:text-white/50">{adv.date}</span>
                {adv.reason && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">เหตุผล: {adv.reason}</p>}
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-pink-500">฿{adv.amount.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => handleAction(adv.id!, 'REJECTED')}
                className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white/70 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
               >
                <X className="w-5 h-5"/> ปฏิเสธ
              </button>
              <button 
                onClick={() => {
                  setSelectedAdvance(adv);
                  setUploadedSlip(null);
                }}
                className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
               >
                <Check className="w-5 h-5"/> ตรวจสอบทำจ่าย
              </button>
            </div>
          </div>
        )) : (
          <div className="text-center p-8 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-white/50 font-medium">ไม่มีคำขอรออนุมัติ</p>
          </div>
        )}
      </div>

      {/* Prepare Payment Modal */}
      {selectedAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-[#1a2f3a] w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl border border-slate-200 dark:border-white/10 relative my-8 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedAdvance(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 dark:text-white/50 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 rounded-2xl">
                <HandCoins className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">ยืนยันข้อมูลและโอนเงินเบิกล่วงหน้า</h3>
            </div>

            <div className="space-y-4">
              {/* Payment Details Card */}
              <div className="bg-slate-50 dark:bg-black/20 p-5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-sm text-slate-500 dark:text-white/60">ชื่อพนักงาน:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedUser?.displayName || 'ไม่ทราบชื่อ'}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-sm text-slate-500 dark:text-white/60">ชื่อธนาคาร:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedUser?.bankAccount?.bankName || 'ยังไม่ได้ระบุธนาคาร'}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-sm text-slate-500 dark:text-white/60">ชื่อบัญชี:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedUser?.bankAccount?.accountName || selectedUser?.displayName}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-sm text-slate-500 dark:text-white/60">เลขที่บัญชี:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                      {selectedUser?.bankAccount?.accountNumber || 'ยังไม่ได้ระบุเลขที่บัญชี'}
                    </span>
                    {selectedUser?.bankAccount?.accountNumber && (
                      <button 
                        onClick={() => handleCopyText(selectedUser.bankAccount!.accountNumber)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all active:scale-90"
                        title="คัดลอกเลขที่บัญชี"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm text-slate-500 dark:text-white/60 font-medium">ยอดเงินเบิกสุทธิ:</span>
                  <span className="text-2xl font-black text-pink-500">฿{selectedAdvance.amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Upload Slip Area */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">
                  อัปโหลดสลิปธนาคาร (บังคับแนบภาพหลักฐานสลิปโอนเงินจริง) <span className="text-pink-500">*</span>
                </label>

                {!uploadedSlip ? (
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-pink-500 dark:hover:border-pink-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-black/10 flex flex-col items-center justify-center group relative"
                  >
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-pink-500 transition-colors mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-white/80 group-hover:text-pink-500 transition-colors">
                      ลากสลิปมาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์
                    </p>
                    <p className="text-xs text-slate-400 mt-1">รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WebP)</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-white/10 rounded-2xl p-3 bg-slate-50 dark:bg-black/20 relative">
                    <img 
                      src={uploadedSlip} 
                      alt="Bank Transfer Slip" 
                      className="w-full h-48 object-contain rounded-xl"
                    />
                    <button 
                      onClick={() => setUploadedSlip(null)}
                      className="absolute top-5 right-5 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all active:scale-95 shadow-md flex items-center justify-center cursor-pointer"
                      title="ลบสลิป"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1.5 mt-2 justify-center text-xs text-emerald-600 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> พร้อมยืนยันการทำรายการ
                    </div>
                  </div>
                )}
              </div>

              {/* Warning box if not uploaded */}
              {!uploadedSlip && (
                <div className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 p-3 rounded-xl border border-amber-200/50 dark:border-amber-500/10">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>กรุณาโอนเงินผ่านแอปธนาคารของคุณ แล้วถ่ายรูปหรือแคปหน้าจอภาพสลิปที่โอนสำเร็จ อัปโหลดเข้าระบบก่อนจึงจะกดยืนยันจ่ายเงินได้</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setSelectedAdvance(null)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 font-bold rounded-2xl transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleConfirmPayment}
                  disabled={!uploadedSlip || isSubmitting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-white/5 dark:disabled:text-white/20 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15"
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <><Check className="w-5 h-5" /> ยืนยันการจ่ายเงินสำเร็จ</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
