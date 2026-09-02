import React, { useState, useEffect } from 'react';
import { User, Phone, MessageCircle, MapPin, Save, Edit2, Shield, Calendar, Mail, CheckCircle2, CreditCard, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../services/userService';
import { UserProfile } from '../types';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export default function Profile() {
  const { userProfile, user } = useAuth();
  const { showAlert, showSuccess, showError, showLoading, hideLoading } = useBottomSheet();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    displayName: '',
    phone: '',
    lineId: '',
    address: '',
    emergencyContact: '',
    jobTitle: '',
    bankAccount: { bankName: '', accountNumber: '', accountName: '' },
    photoURL: ''
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        phone: userProfile.phone || '',
        lineId: userProfile.lineId || '',
        address: userProfile.address || '',
        emergencyContact: userProfile.emergencyContact || '',
        jobTitle: userProfile.jobTitle || '',
        bankAccount: userProfile.bankAccount || { bankName: '', accountNumber: '', accountName: '' },
        photoURL: userProfile.photoURL || ''
      });
    }
  }, [userProfile]);

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showAlert("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB", "ขนาดเกินกำหนด");
        return;
      }
      setUploadingImage(true);
      showLoading("กำลังอัปโหลดรูปภาพประจำตัว...", "กำลังอัปโหลด");
      try {
        const fileRef = ref(storage, `profiles/${user.uid}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        uploadTask.on('state_changed', 
          (snapshot) => {
            // Optional: Handle progress
          }, 
          (error) => {
            console.error(error);
            hideLoading();
            showError("ไม่สามารถอัปโหลดรูปภาพได้", "อัปโหลดล้มเหลว");
            setUploadingImage(false);
          }, 
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setFormData(prev => ({ ...prev, photoURL: downloadURL }));
            setUploadingImage(false);
            hideLoading();
            showSuccess("อัปโหลดรูปภาพเสร็จสิ้น", "อัปโหลดสำเร็จ");
          }
        );
      } catch (err) {
        setUploadingImage(false);
        hideLoading();
        showError("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ", "เกิดข้อผิดพลาด");
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    showLoading("กำลังบันทึกข้อมูลส่วนตัว...", "กำลังบันทึกข้อมูล");
    try {
      await updateUserProfile(user.uid, formData);
      hideLoading();
      showSuccess("บันทึกข้อมูลส่วนตัวของคุณเรียบร้อยแล้ว", "บันทึกสำเร็จ");
      setIsEditing(false);
    } catch (error) {
      hideLoading();
      console.error("Error updating profile:", error);
      showError("ไม่สามารถบันทึกข้อมูลได้ โปรดตรวจสอบการเชื่อมต่อและลองอีกครั้ง", "บันทึกล้มเหลว");
    } finally {
      setLoading(false);
      hideLoading();
    }
  };

  if (!userProfile) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24 font-sans">
      {/* Header Profile Card */}
      <div className="relative mb-8 pt-12 pb-8 px-6 bg-white dark:bg-white/5 rounded-[32px] shadow-xl shadow-blue-500/5 border border-slate-100 dark:border-white/10 overflow-hidden text-center">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-10 dark:opacity-20" />
        
        <div className="relative mb-4 flex flex-col items-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-2xl bg-white dark:bg-slate-800 p-1.5 shadow-md border-2 border-white dark:border-slate-800 relative z-10 flex items-center justify-center overflow-hidden">
               {formData.photoURL || userProfile.photoURL ? (
                 <img 
                   src={isEditing ? (formData.photoURL || '') : (userProfile.photoURL || '')} 
                   alt="Profile" 
                   className="w-full h-full rounded-xl object-cover border border-white/20 shadow-inner"
                 />
               ) : (
                 <div className="w-full h-full rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-4xl font-black text-blue-600 uppercase">
                    {userProfile.displayName?.substring(0, 1) || userProfile.email?.substring(0, 1)}
                 </div>
               )}
            </div>
            
            {isEditing && (
              <label className="absolute bottom-0 right-0 z-20 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-500 transition-colors border-2 border-white dark:border-slate-800">
                <Camera className="w-5 h-5" />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
              </label>
            )}
          </div>
          
          <div className="mt-5">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-1 rounded-xl text-center focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="ชื่อ-นามสกุล"
                />
              ) : (
                userProfile.displayName || 'ไม่มีชื่อ'
              )}
            </h1>
            <p className="text-slate-500 dark:text-white/40 font-bold flex items-center justify-center gap-1.5">
              <Mail className="w-4 h-4" /> {userProfile.email}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-3">
             <div className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl text-xs font-black border border-blue-100 dark:border-blue-800/50 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> สิทธิ์: {userProfile.role}
             </div>
             {userProfile.jobTitle && (
               <div className="px-4 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl text-xs font-black border border-green-100 dark:border-green-800/50 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ตำแหน่ง: {userProfile.jobTitle}
               </div>
             )}
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={loading}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all shadow-lg active:scale-95 ${
              isEditing 
                ? "bg-green-600 text-white hover:bg-green-700 shadow-green-500/20" 
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isEditing ? (
              <><Save className="w-5 h-5" /> บันทึกการเปลี่ยนแปลง</>
            ) : (
              <><Edit2 className="w-5 h-5" /> แก้ไขข้อมูลโปรไฟล์</>
            )}
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact info Box */}
        <div className="bg-white dark:bg-white/5 rounded-[32px] p-6 border border-slate-100 dark:border-white/10 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
             <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-xl">
               <Phone className="w-5 h-5" />
             </div>
             ข้อมูลการติดต่อ
          </h2>

          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-slate-500 dark:text-white/30 uppercase tracking-widest pl-1">เบอร์โทรศัพท์</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  placeholder="08X-XXX-XXXX"
                />
              ) : (
                <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl font-bold border border-transparent">
                  {userProfile.phone || 'ยังไม่ได้ระบุ'}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-slate-500 dark:text-white/30 uppercase tracking-widest pl-1">Line ID</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.lineId}
                  onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  placeholder="ไอดีไลน์ของคุณ"
                />
              ) : (
                <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl font-bold border border-transparent">
                  {userProfile.lineId || 'ยังไม่ได้ระบุ'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Other Info Box */}
        <div className="bg-white dark:bg-white/5 rounded-[32px] p-6 border border-slate-100 dark:border-white/10 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
             <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-xl">
               <MapPin className="w-5 h-5" />
             </div>
             ที่อยู่และผู้ติดต่อฉุกเฉิน
          </h2>

          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-slate-500 dark:text-white/30 uppercase tracking-widest pl-1">ผู้ติดต่อฉุกเฉิน</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  placeholder="ชื่อและเบอร์โทรติดต่อฉุกเฉิน"
                />
              ) : (
                <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl font-bold border border-transparent">
                  {userProfile.emergencyContact || 'ยังไม่ได้ระบุ'}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-slate-500 dark:text-white/30 uppercase tracking-widest pl-1">ที่อยู่ปัจจุบัน</label>
              {isEditing ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold min-h-[100px]"
                  placeholder="ที่อยู่สำหรับติดต่อ"
                />
              ) : (
                <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl font-bold border border-transparent min-h-[100px] leading-relaxed">
                  {userProfile.address || 'ยังไม่ได้ระบุ'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bank Account Info */}
      <div className="mt-6 bg-white dark:bg-white/5 rounded-[32px] p-6 border border-slate-100 dark:border-white/10 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
           <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-xl">
             <CreditCard className="w-5 h-5" />
           </div>
           ข้อมูลบัญชีธนาคาร (สำหรับรับเงินเดือน)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-500 dark:text-white/30 uppercase tracking-widest pl-1">ธนาคาร</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.bankAccount?.bankName || ''}
                onChange={(e) => setFormData({ ...formData, bankAccount: { bankName: e.target.value, accountNumber: formData.bankAccount?.accountNumber || '', accountName: formData.bankAccount?.accountName || '' } })}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                placeholder="เช่น กสิกรไทย, ไทยพาณิชย์"
              />
            ) : (
              <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl font-bold border border-transparent">
                {userProfile.bankAccount?.bankName || 'ยังไม่ได้ระบุธนาคาร'}
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-500 dark:text-white/30 uppercase tracking-widest pl-1">เลขบัญชี</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.bankAccount?.accountNumber || ''}
                onChange={(e) => setFormData({ ...formData, bankAccount: { bankName: formData.bankAccount?.bankName || '', accountNumber: e.target.value, accountName: formData.bankAccount?.accountName || '' } })}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                placeholder="XXX-X-XXXXX-X"
              />
            ) : (
              <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl font-bold border border-transparent">
                {userProfile.bankAccount?.accountNumber || 'ยังไม่ได้ระบุเลขบัญชี'}
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-500 dark:text-white/30 uppercase tracking-widest pl-1">ชื่อบัญชี</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.bankAccount?.accountName || ''}
                onChange={(e) => setFormData({ ...formData, bankAccount: { bankName: formData.bankAccount?.bankName || '', accountNumber: formData.bankAccount?.accountNumber || '', accountName: e.target.value } })}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                placeholder="ชื่อ-นามสกุลเจ้าของบัญชี"
              />
            ) : (
              <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-2xl font-bold border border-transparent">
                {userProfile.bankAccount?.accountName || 'ยังไม่ได้ระบุชื่อบัญชี'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="mt-8 p-6 bg-slate-50 dark:bg-white/5 rounded-[32px] border border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-slate-400">
             <Calendar className="w-6 h-6" />
           </div>
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เป็นสมาชิกฟาร์มตั้งแต่</p>
             <p className="text-slate-900 dark:text-white font-bold">
               {new Date(userProfile.createdAt).toLocaleDateString('th-TH', { 
                  year: 'numeric', month: 'long', day: 'numeric'
               })}
             </p>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-slate-400">
             <Shield className="w-6 h-6" />
           </div>
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะบัญชี</p>
             <p className="text-green-600 dark:text-green-400 font-black">ACTIVE (ได้รับการอนุมัติแล้ว)</p>
           </div>
        </div>
      </div>
    </div>
  );
}
