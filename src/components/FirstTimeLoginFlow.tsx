import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Save, Shield, Mail, CheckCircle2, CreditCard, Camera, LogOut, Clock, Landmark, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../services/userService';
import { UserProfile } from '../types';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import { storage } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export default function FirstTimeLoginFlow() {
  const { userProfile, logout, user } = useAuth();
  const { showAlert, showSuccess, showError, showLoading, hideLoading } = useBottomSheet();
  
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    lineId: '',
    address: '',
    emergencyContact: '',
    jobTitle: '',
    bankAccount: { bankName: '', accountNumber: '', accountName: '' },
    photoURL: ''
  });

  const [uploadingImage, setUploadingImage] = useState(false);

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

  // Determine if they've already completed the registration details
  const isProfileComplete = 
    userProfile?.displayName && 
    userProfile?.phone && 
    userProfile?.address && 
    userProfile?.bankAccount?.bankName && 
    userProfile?.bankAccount?.accountNumber && 
    userProfile?.bankAccount?.accountName;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      if (file.size > 5 * 1024 * 1024) {
        showAlert("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB", "ขนาดเกินกำหนด");
        return;
      }
      setUploadingImage(true);
      showLoading("กำลังอัปโหลดรูปภาพประจำตัว...", "กำลังอัปโหลด");
      try {
        const fileRef = ref(storage, `profiles/${user.uid}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        uploadTask.on('state_changed', 
          null, 
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
            showSuccess("อัปโหลดรูปภาพประจำตัวสำเร็จ", "อัปโหลดสำเร็จ");
          }
        );
      } catch (err) {
        setUploadingImage(false);
        hideLoading();
        showError("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ", "เกิดข้อผิดพลาด");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.displayName.trim()) {
      showAlert("กรุณากรอกชื่อ-นามสกุลจริง", "ข้อมูลไม่ครบถ้วน");
      return;
    }
    if (!formData.phone.trim()) {
      showAlert("กรุณากรอกเบอร์โทรศัพท์ติดต่อ", "ข้อมูลไม่ครบถ้วน");
      return;
    }
    if (!formData.address.trim()) {
      showAlert("กรุณากรอกที่อยู่ปัจจุบันสำหรับการติดต่อ", "ข้อมูลไม่ครบถ้วน");
      return;
    }
    if (!formData.emergencyContact.trim()) {
      showAlert("กรุณากรอกข้อมูลผู้ติดต่อฉุกเฉิน", "ข้อมูลไม่ครบถ้วน");
      return;
    }
    if (!formData.bankAccount.bankName) {
      showAlert("กรุณาเลือกธนาคารสำหรับรับเงินเดือน", "ข้อมูลไม่ครบถ้วน");
      return;
    }
    if (!formData.bankAccount.accountNumber.trim()) {
      showAlert("กรุณากรอกเลขที่บัญชีธนาคาร", "ข้อมูลไม่ครบถ้วน");
      return;
    }
    if (!formData.bankAccount.accountName.trim()) {
      showAlert("กรุณากรอกชื่อบัญชีธนาคาร (ควรตรงกับชื่อ-นามสกุลจริง)", "ข้อมูลไม่ครบถ้วน");
      return;
    }
    if (!formData.photoURL) {
      showAlert("กรุณาอัปโหลดรูปถ่ายหน้าตรงเพื่อยืนยันตัวตน", "ข้อมูลไม่ครบถ้วน");
      return;
    }

    showLoading("กำลังส่งข้อมูลเพื่อขออนุมัติบัญชี...", "กำลังส่งข้อมูล");
    try {
      await updateUserProfile(user.uid, formData);
      hideLoading();
      showSuccess("ส่งข้อมูลขออนุมัติเรียบร้อยแล้ว", "สำเร็จ");
      // Force page refresh or reload state from firebase
      window.location.reload();
    } catch (error) {
      hideLoading();
      console.error("Error submitting profile for approval:", error);
      showError("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง", "บันทึกล้มเหลว");
    }
  };

  const thaiBanks = [
    "ธนาคารกสิกรไทย (KBank)",
    "ธนาคารไทยพาณิชย์ (SCB)",
    "ธนาคารกรุงเทพ (BBL)",
    "ธนาคารกรุงไทย (KTB)",
    "ธนาคารกรุงศรีอยุธยา (BAY)",
    "ธนาคารทหารไทยธนชาต (TTB)",
    "ธนาคารออมสิน (GSB)",
    "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)"
  ];

  if (!userProfile) return null;

  // Render State 1: Already Submitted details, now pending Admin Approval
  if (isProfileComplete) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-xl w-full bg-[#11222c]/90 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-6 sm:p-10 text-center shadow-2xl relative overflow-hidden">
          {/* Decorative background aura */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 bg-emerald-500/20 rounded-[2rem] border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-emerald-400 animate-pulse" />
          </div>

          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-widest mb-4">
            รอตรวจสอบข้อมูล
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">บันทึกข้อมูลสำเร็จแล้ว!</h2>
          <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-8 max-w-md mx-auto">
            ขณะนี้ข้อมูลโปรไฟล์และบัญชีธนาคารของคุณถูกส่งไปยังระบบผู้ดูแลแล้ว <br/>
            <b>อยู่ระหว่างรออนุมัติเปิดสิทธิ์เข้าใช้งานระบบงานฟาร์ม</b>
          </p>

          {/* User Submitted Card details preview */}
          <div className="bg-slate-900/60 rounded-3xl p-5 border border-white/5 text-left mb-8 space-y-4">
            <h3 className="text-xs font-black text-white/40 uppercase tracking-wider border-b border-white/5 pb-2">สรุปข้อมูลส่วนตัวที่ส่งขอสิทธิ์</h3>
            
            <div className="flex items-center gap-3">
              <img 
                src={userProfile.photoURL} 
                alt="Submitted Avatar" 
                className="w-16 h-16 rounded-2xl object-cover border border-white/10"
              />
              <div>
                <h4 className="font-bold text-white text-base">{userProfile.displayName}</h4>
                <p className="text-xs text-white/50">{userProfile.email}</p>
                {userProfile.jobTitle && <p className="text-xs text-emerald-400 mt-1">ตำแหน่งงาน: {userProfile.jobTitle}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="space-y-1">
                <span className="text-white/40 block">เบอร์โทรศัพท์</span>
                <span className="font-bold text-white/80">{userProfile.phone}</span>
              </div>
              <div className="space-y-1">
                <span className="text-white/40 block">ผู้ติดต่อฉุกเฉิน</span>
                <span className="font-bold text-white/80">{userProfile.emergencyContact}</span>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <span className="text-white/40 block">ที่อยู่ปัจจุบัน</span>
                <span className="font-bold text-white/80 leading-relaxed">{userProfile.address}</span>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 space-y-2">
              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">บัญชีรับเงินเดือนที่ลงทะเบียน</h4>
              <div className="bg-emerald-950/20 rounded-xl p-3 border border-emerald-500/10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white/90">{userProfile.bankAccount?.bankName}</p>
                  <p className="text-xs text-white/50 mt-1">เลขบัญชี: {userProfile.bankAccount?.accountNumber}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-white/40 block">ชื่อบัญชี</span>
                  <p className="text-xs font-bold text-emerald-300">{userProfile.bankAccount?.accountName}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 bg-white/10 text-white py-3.5 rounded-2xl font-bold hover:bg-white/20 active:scale-95 transition-all border border-white/10 text-sm"
            >
              <LogOut className="w-4 h-4" /> ออกจากระบบ
            </button>
            <p className="text-xs text-white/40 italic">เมื่อผู้ดูแลอนุมัติเรียบร้อย จะมีอีเมลแจ้งสิทธิ์และอัตราเงินเดือนส่งไปให้คุณทันที</p>
          </div>
        </div>
      </div>
    );
  }

  // Render State 2: Forces form completion on very first login
  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4 sm:px-6 font-sans flex items-center justify-center">
      <div className="max-w-xl w-full bg-[#11222c]/90 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-900/40 to-blue-950/40 p-6 sm:p-8 border-b border-white/10 relative text-center">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl w-fit mx-auto mb-3 border border-emerald-500/20">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">ลงทะเบียนพนักงานใหม่</h1>
          <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
            ยินดีต้อนรับสู่ระบบ นิพนธ์ฟาร์ม! กรุณากรอกข้อมูลส่วนตัวจริงให้ครบถ้วน <br/>
            เพื่อผู้ดูแลระบบใช้ในการอนุมัติบัญชีและกำหนดอัตราเงินเดือนเริ่มต้นให้กับคุณ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Photo Upload Section */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-black text-white/50 uppercase tracking-widest">อัปโหลดรูปถ่ายประจำตัว (หน้าตรง) *</span>
            <div className="relative">
              <div className="w-28 h-28 rounded-2xl bg-slate-900 border border-white/10 p-1 flex items-center justify-center overflow-hidden">
                {formData.photoURL ? (
                  <img 
                    src={formData.photoURL} 
                    alt="Upload preview" 
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="text-center text-white/30 text-xs flex flex-col items-center p-3">
                    <Camera className="w-6 h-6 mb-1 text-white/40" />
                    <span>รูปถ่ายหน้าตรง</span>
                  </div>
                )}
              </div>
              
              <label className="absolute -bottom-1.5 -right-1.5 z-20 w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-emerald-500 transition-colors border border-slate-950">
                <Camera className="w-4 h-4" />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  disabled={uploadingImage}
                />
              </label>
            </div>
            {uploadingImage && <span className="text-[10px] text-emerald-400 animate-pulse">กำลังอัปโหลดรูปภาพ...</span>}
          </div>

          <div className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-black text-white/60 uppercase tracking-wider mb-2">ชื่อ-นามสกุลจริง *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="เช่น นายมานะ ยินดี"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full bg-slate-900/60 text-white pl-9 pr-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                />
              </div>
            </div>

            {/* Job Title Preference/Proposed */}
            <div>
              <label className="block text-xs font-black text-white/60 uppercase tracking-wider mb-2">ตำแหน่งงานจริงในฟาร์ม *</label>
              <input
                type="text"
                required
                placeholder="เช่น คนงานเล้าคลอด, ฝ่ายอาหาร, พนักงานทั่วไป"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full bg-slate-900/60 text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-xs font-black text-white/60 uppercase tracking-wider mb-2">เบอร์โทรศัพท์มือถือ *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="เช่น 0891234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-900/60 text-white pl-9 pr-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Line ID */}
              <div>
                <label className="block text-xs font-black text-white/60 uppercase tracking-wider mb-2">Line ID (ไม่บังคับ)</label>
                <input
                  type="text"
                  placeholder="เช่น line_id_yourname"
                  value={formData.lineId}
                  onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                  className="w-full bg-slate-900/60 text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <label className="block text-xs font-black text-white/60 uppercase tracking-wider mb-2">ข้อมูลติดต่อกรณีฉุกเฉิน *</label>
              <input
                type="text"
                required
                placeholder="ชื่อผู้ติดต่อ และเบอร์โทรศัพท์ (เช่น นางสมศรี มารดา - 0812345678)"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                className="w-full bg-slate-900/60 text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-black text-white/60 uppercase tracking-wider mb-2">ที่อยู่ปัจจุบันตามทะเบียนบ้าน / ที่พัก *</label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none text-white/30">
                  <MapPin className="w-4 h-4" />
                </div>
                <textarea
                  required
                  placeholder="ระบุบ้านเลขที่, ตำบล, อำเภอ, จังหวัด ให้ชัดเจน"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-900/60 text-white pl-9 pr-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium min-h-[70px] max-h-[120px]"
                />
              </div>
            </div>

            {/* Bank account section */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-4 h-4" /> ข้อมูลธนาคารเพื่อรับเงินเดือน (สำคัญมาก) *
              </span>
              
              <div>
                <label className="block text-xs font-bold text-white/50 mb-1.5">เลือกธนาคาร *</label>
                <select
                  required
                  value={formData.bankAccount.bankName}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankAccount: { ...formData.bankAccount, bankName: e.target.value }
                  })}
                  className="w-full bg-slate-900 text-white px-3 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium cursor-pointer"
                >
                  <option value="">-- กรุณาเลือกธนาคาร --</option>
                  {thaiBanks.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-1.5">เลขที่บัญชีเงินฝาก *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 123-4-56789-0"
                    value={formData.bankAccount.accountNumber}
                    onChange={(e) => setFormData({
                      ...formData,
                      bankAccount: { ...formData.bankAccount, accountNumber: e.target.value }
                    })}
                    className="w-full bg-slate-900/60 text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-1.5">ชื่อบัญชีธนาคาร (ภาษาไทย) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ต้องตรงกับบัตรประชาชน"
                    value={formData.bankAccount.accountName}
                    onChange={(e) => setFormData({
                      ...formData,
                      bankAccount: { ...formData.bankAccount, accountName: e.target.value }
                    })}
                    className="w-full bg-slate-900/60 text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => logout()}
              className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-2xl font-bold transition-all border border-white/5 text-sm"
            >
              ยกเลิก / ออกจากระบบ
            </button>
            <button
              type="submit"
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold active:scale-95 transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
            >
              <Save className="w-4 h-4" /> ลงทะเบียนข้อมูลส่วนตัว
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
