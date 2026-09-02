import React, { useState, useEffect, useRef } from 'react';
import { 
  X, LogOut, Camera, Shield, Mail, CheckCircle2, 
  CreditCard, Phone, MapPin, Save, Edit2, 
  Sun, Moon, Clock, ArrowLeft, RefreshCw, Key, ShieldCheck,
  Video, BellRing, Users, Settings, ChevronDown, Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import { updateUserProfile } from '../services/userService';
import { storage, db } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import JsBarcode from 'jsbarcode';
import { clsx } from 'clsx';
import { UserProfile } from '../types';
import UserManagement from '../pages/UserManagement';

const BANK_OPTIONS = [
  { value: 'kbank', label: 'ธนาคารกสิกรไทย' },
  { value: 'scb', label: 'ธนาคารไทยพาณิชย์' },
  { value: 'bbl', label: 'ธนาคารกรุงเทพ' },
  { value: 'ktb', label: 'ธนาคารกรุงไทย' },
  { value: 'bay', label: 'ธนาคารกรุงศรีอยุธยา' },
  { value: 'ttb', label: 'ธนาคารทหารไทยธนชาต' },
  { value: 'gsb', label: 'ธนาคารออมสิน' },
  { value: 'baac', label: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)' },
  { value: 'uob', label: 'ธนาคารยูโอบี' },
  { value: 'cimbt', label: 'ธนาคารซีไอเอ็มบีไทย' },
];

interface ProfileSettingsHubProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettingsHub({ isOpen, onClose }: ProfileSettingsHubProps) {
  const { user, userProfile, logout } = useAuth();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { showAlert, showSuccess, showError, showLoading, hideLoading } = useBottomSheet();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Sound Context Reference for Notification Sound Test
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Google Meet integration states
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/yki-ggro-ymw');

  // Form State for edit profile
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

  // Sync Google Meet farm settings in real-time
  useEffect(() => {
    if (!isOpen) return;
    const docRef = doc(db, 'farm_settings', 'meeting');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsMeetingActive(!!data.is_meeting_active);
        if (data.meeting_link) {
          setMeetingLink(data.meeting_link);
        }
      }
    }, (err) => {
      console.warn("Could not synchronize meeting options from farm_settings:", err);
    });
    return () => unsubscribe();
  }, [isOpen]);

  // Sync form data whenever userProfile changes or when modal opens
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
  }, [userProfile, isEditModalOpen]);

  // Refs and state for Actionable ID Card
  const cardRef = useRef<HTMLDivElement | null>(null);
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const [localPhotoDataUrl, setLocalPhotoDataUrl] = useState<string | null>(null);

  const isAdmin = userProfile ? userProfile.role === 'ADMIN' : false;
  const employeeId = user ? `NPF-${user.uid.substring(0, 6).toUpperCase()}` : '';

  // Convert profile image to data URL to avoid CORS/tainted canvas errors with html-to-image
  useEffect(() => {
    if (formData.photoURL) {
      if (formData.photoURL.startsWith('data:') || formData.photoURL.startsWith('/')) {
        setLocalPhotoDataUrl(formData.photoURL);
      } else {
        // Use our local Express proxy endpoint to completely avoid any CORS canvas-tainting issues
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(formData.photoURL)}`;
        setLocalPhotoDataUrl(proxyUrl);
      }
    } else {
      setLocalPhotoDataUrl(null);
    }
  }, [formData.photoURL]);

  // Generate dynamic industry-standard barcode
  useEffect(() => {
    if (isEditModalOpen && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, employeeId, {
          format: "CODE128",
          lineColor: "#000000",
          width: 1.5,
          height: 24,
          displayValue: false,
          margin: 0,
          background: "transparent"
        });
      } catch (err) {
        console.error("Barcode generation failed:", err);
      }
    }
  }, [isEditModalOpen, employeeId]);

  if (!userProfile || !user) return null;

  // Actionable ID card image download
  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    showLoading("กำลังเตรียมปรับความละเอียดและดาวน์โหลดรูปภาพบัตรประจำตัวพนักงาน...", "สร้างรูปภาพ");
    try {
      // Small timeout to guarantee image and barcode paint buffers are ready
      await new Promise(resolve => setTimeout(resolve, 350));
      
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3, // High quality UHD scale for scanning
        backgroundColor: null, // Keeps rounded corners transparent
        cacheBust: true,
      });
      
      const link = document.createElement('a');
      link.download = `ID_CARD_${formData.displayName?.replace(/\s+/g, '_') || 'Employee'}_${employeeId}.png`;
      link.href = dataUrl;
      link.click();
      
      showSuccess("ดาวน์โหลดภาพบัตรประจำตัวของท่านสำเร็จเรียบร้อย! สามารถนำไปพิมพ์หรือสแกนใช้งานได้ทันทีค่ะ", "ดาวน์โหลดสำเร็จ");
    } catch (err) {
      console.error("Failed to generate and download ID Card image:", err);
      showError("ไม่สามารถแปลงเป็นไฟล์ภาพได้สำเร็จเนื่องจากปัญหาภาพต้นฉบับ ลองกดอีกครั้งหรือใช้รูปภาพปกติค่ะ", "ดาวน์โหลดไม่สำเร็จ");
    } finally {
      hideLoading();
    }
  };

  // Image upload handler
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
        // Read file locally to instantly render and avoid any storage CORS errors
        const reader = new FileReader();
        reader.onloadend = () => {
          setLocalPhotoDataUrl(reader.result as string);
        };
        reader.readAsDataURL(file);

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
            showSuccess("อัปโหลดรูปภาพเสร็จสิ้นและปรับพรีวิวบัตรแล้ว", "อัปโหลดสำเร็จ");
          }
        );
      } catch (err) {
        setUploadingImage(false);
        hideLoading();
        showError("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ", "เกิดข้อผิดพลาด");
      }
    }
  };

  // Profile save handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    showLoading("กำลังบันทึกข้อมูลส่วนตัวของพนักงาน...", "กำลังบันทึกข้อมูล");
    try {
      await updateUserProfile(user.uid, formData);
      hideLoading();
      showSuccess("บันทึกข้อมูลส่วนตัวและการแสดงผลบัตรเสร็จสิ้น", "บันทึกสำเร็จ");
      setIsEditModalOpen(false);
    } catch (error) {
      hideLoading();
      console.error("Error updating profile:", error);
      showError("ไม่สามารถบันทึกข้อมูลได้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต", "บันทึกล้มเหลว");
    } finally {
      setSaving(false);
    }
  };

  // Google Meet Toggle signaling
  const handleToggleMeeting = async () => {
    try {
      const docRef = doc(db, 'farm_settings', 'meeting');
      const nextActiveState = !isMeetingActive;
      await setDoc(docRef, {
        is_meeting_active: nextActiveState,
        meeting_link: meetingLink,
        updatedAt: Date.now()
      }, { merge: true });
      showAlert(nextActiveState ? '📡 เริ่มจัดการประชุมฟาร์มแล้ว! ระบบกำลังเรียกแจ้งเตือนคนงานทั้งหมด' : '💤 ปิดห้องประชุมฟาร์มแล้ว');
    } catch (err) {
      console.error(err);
      showAlert('อัปเดตสถานะการประชุมล้มเหลว: ' + err);
    }
  };

  // Google Meet save URL
  const handleSaveMeetingLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = doc(db, 'farm_settings', 'meeting');
      await setDoc(docRef, {
        meeting_link: meetingLink,
        updatedAt: Date.now()
      }, { merge: true });
      showAlert('บันทึกลิงก์ Google Meet ประจำฟาร์มสำเร็จแล้ว!');
    } catch (err) {
      console.error(err);
      showAlert('บันทึกลิงก์ล้มเหลว: ' + err);
    }
  };

  // Play ambient tone and trigger system notification
  const testNotification = async () => {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }

      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          audioCtxRef.current = new AudioContext();
        }
      }
      
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      if (ctx) {
        const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, volume: number = 1) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = type;
          osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
          
          gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
          gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startTime + 0.02); 
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
          
          osc.start(ctx.currentTime + startTime);
          osc.stop(ctx.currentTime + startTime + duration);
        };

        // Modern dual chord ring chime
        playTone(880.00, 'sine', 0, 0.4, 0.4); 
        playTone(1760.00, 'sine', 0, 0.3, 0.15); 
        playTone(1174.66, 'sine', 0.14, 0.55, 0.4); 
        playTone(2349.32, 'sine', 0.14, 0.35, 0.15); 
      }
    } catch (err) {
      console.warn("Audio test failed", err);
    }

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification('ทดสอบแจ้งเตือนสัตวบาล', {
              body: 'นี่คือตัวอย่างการแจ้งเตือนเสียงเรียกด่วน / งานระบบส่งมอบสำเร็จ',
              icon: '/icon.png',
              vibrate: [200, 100, 200, 100, 400],
              tag: 'test-alert'
            } as any);
          } else {
            new Notification('ทดสอบแจ้งเตือนสัตวบาล', { 
              body: 'นี่คือตัวอย่างการแจ้งเตือนเสียงเรียกด่วน / งานระบบส่งมอบสำเร็จ', 
              icon: '/icon.png' 
            });
          }
        } catch (e) {
          console.warn("System Notification Test Failed", e);
          showAlert("บราวเซอร์แจ้งเตือนผ่านหน้าต่างล้มเหลว (แต่เสียงและสั่นส่งมอบสำเร็จ)");
        }
      } else {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          showAlert("เปิดสิทธิ์การแจ้งเตือนสำเร็จ ลองคลิกทดสอบรับสัญญาณอีกครั้ง!");
        } else {
          showAlert("คุณได้ปฏิเสธสิทธิ์การแสดงกล่องป๊อปอัปแจ้งเตือนบนอุปกรณ์");
        }
      }
    } else {
      showAlert("อุปกรณ์สื่อสารหลักนี้ ไม่รวมเซอร์วิสแจ้งเตือนระบบ OS");
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end font-sans">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-950/95 backdrop-blur-md"
            />

            {/* Slide-over Panel (Settings & Profile Hub) */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-full max-w-lg bg-[#ebf7f9] dark:bg-[#041a1f] h-full shadow-2xl flex flex-col border-l border-white/10 overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#05262e] pt-[calc(1.5rem+env(safe-area-inset-top,0px))] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00bcd4] to-[#008ba3] flex items-center justify-center text-white font-black shadow-md shadow-[#00bcd4]/20">
                    <Settings className="w-5 h-5 animate-spin-slow" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">เมนูตั้งค่าส่วนตัวทั้งหมด</h2>
                    <p className="text-xs text-slate-500 dark:text-white/40 font-bold uppercase tracking-wider">Settings & Profile Hub</p>
                  </div>
                </div>
                
                <button 
                  onClick={onClose}
                  className="p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all border border-slate-200/40 dark:border-white/5 active:scale-95"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-28">
                
                {/* 1. Account Profile summary & Employee ID preview shortcut */}
                <div className="bg-white dark:bg-[#05262e] rounded-3xl p-5 border border-slate-200/50 dark:border-white/10 shadow-lg relative overflow-hidden flex flex-col items-center">
                  <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-teal-500 opacity-10 dark:opacity-20 pointer-events-none" />
                  
                  {/* Avatar bubble */}
                  <div className="relative mb-3.5 mt-4 z-10">
                    <div className="w-28 h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1.5 shadow-md border-2 border-white dark:border-slate-800 flex items-center justify-center overflow-hidden">
                      {userProfile.photoURL ? (
                        <img 
                          src={userProfile.photoURL} 
                          alt="Profile Avatar" 
                          className="w-full h-full rounded-xl object-cover border border-white/20 shadow-inner" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-3xl font-black text-slate-700 dark:text-white">
                          {userProfile.displayName?.charAt(0) || userProfile.email?.charAt(0) || 'อ'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Profile texts info */}
                  <div className="text-center z-10 w-full px-2">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight flex items-center justify-center gap-1.5">
                      {userProfile.displayName || 'พนักงานนิพนธ์ฟาร์ม'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-white/45 font-bold flex items-center justify-center gap-1.5 mt-1">
                      <Mail className="w-3.5 h-3.5 shrink-0" /> {userProfile.email}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-[11px] rounded-full border border-amber-500/20 flex items-center gap-1">
                        <Key className="w-3.5 h-3.5" /> {isAdmin ? 'สิทธิ์: เจ้าของฟาร์ม' : `สิทธิ์: ${userProfile.role}`}
                      </span>
                      {userProfile.jobTitle && (
                        <span className="px-3 py-1 bg-[#00bcd4]/10 text-[#008ba3] dark:text-[#00bcd4] font-black text-[11px] rounded-full border border-[#00bcd4]/20">
                          {userProfile.jobTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Button to edit profile (Now pops up in an elegant Overlay Modal) */}
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="w-full mt-5 bg-gradient-to-r from-[#00bcd4] to-[#008ba3] hover:brightness-105 active:scale-[0.98] text-white py-3 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#00bcd4]/15 border-0 cursor-pointer transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                    แก้ไขข้อมูล / พิมพ์บัตรประจำตัวพนักงาน
                  </button>
                </div>

                {/* 2. Theme Preferences Settings */}
                <div className="bg-white dark:bg-[#05262e] rounded-3xl p-5 border border-slate-200/50 dark:border-white/10 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#00bcd4]/10 dark:bg-[#00bcd4]/5 text-[#008ba3] dark:text-[#00bcd4] rounded-2xl">
                      {themeMode === 'dark' ? <Moon className="w-5 h-5 animate-pulse" /> : themeMode === 'light' ? <Sun className="w-5 h-5 text-amber-500" /> : <Clock className="w-5 h-5 text-emerald-500" />}
                    </div>
                    <div>
                      <p className="font-extrabold text-[#111827] dark:text-white leading-tight">รูปแบบหน้าจอระบบ</p>
                      <p className="text-xs text-slate-500 dark:text-white/40 font-bold">
                        {themeMode === 'auto' 
                          ? `สว่างอัตโนมัติช่วงเวลาทำงานกลางวัน (06:00 - 18:00)` 
                          : `แสดงผลในโหมดคงที่ประเภท${theme === 'dark' ? 'กลางคืน' : 'ปกติ'}`}
                      </p>
                    </div>
                  </div>

                  {/* Controller Segmented buttons */}
                  <div className="grid grid-cols-3 p-1.5 bg-slate-100/80 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-white/[0.05]">
                    <button
                      onClick={() => setThemeMode('light')}
                      className={clsx(
                        "py-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 outline-none",
                        themeMode === 'light'
                          ? "bg-white text-slate-900 shadow-md"
                          : "text-slate-500 dark:text-white/50 hover:text-slate-805 dark:hover:text-white"
                      )}
                    >
                      <Sun className="w-4 h-4" />
                      <span>สว่าง</span>
                    </button>
                    <button
                      onClick={() => setThemeMode('dark')}
                      className={clsx(
                        "py-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 outline-none",
                        themeMode === 'dark'
                          ? "bg-white dark:bg-[#041d24] text-slate-900 dark:text-white shadow-md border border-slate-200/20 dark:border-white/10"
                          : "text-slate-500 dark:text-white/50 hover:text-slate-805 dark:hover:text-white"
                      )}
                    >
                      <Moon className="w-4 h-4" />
                      <span>กลางคืน</span>
                    </button>
                    <button
                      onClick={() => setThemeMode('auto')}
                      className={clsx(
                        "py-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 outline-none",
                        themeMode === 'auto'
                          ? "bg-white dark:bg-[#041d24] text-slate-900 dark:text-white shadow-md border border-slate-200/20 dark:border-white/10"
                          : "text-slate-500 dark:text-white/50 hover:text-slate-805 dark:hover:text-white"
                      )}
                    >
                      <Clock className="w-4 h-4" />
                      <span>อัตโนมัติ</span>
                    </button>
                  </div>
                </div>

                {/* 3. General: Sound & Notification Device Level integration */}
                <div className="bg-white dark:bg-[#05262e] rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-sm overflow-hidden">
                  <button 
                    onClick={testNotification}
                    className="w-full p-4.5 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 border-0 bg-transparent cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-cyan-150 dark:bg-cyan-950/40 text-[#00bcd4] rounded-2xl">
                        <BellRing className="w-5.5 h-5.5" />
                      </div>
                      <div>
                        <p className="font-extrabold text-[#111827] dark:text-white text-sm leading-tight">ทดสอบเสียงสัญญาณเตือน</p>
                        <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-bold">แตะทดสอบเสียงออดเรียกและป๊อปอัปแจ้งเตือนบนเครื่อง</p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* --- 4. EXCLUSIVE FARM OWNER / OWNER SETTINGS SECTION (Hidden from regular staff) --- */}
                {isAdmin && (
                  <div className="space-y-4">
                    <p className="text-[11px] font-black uppercase text-rose-500 dark:text-rose-400 pl-1 tracking-widest flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> ส่วนสำหรับผู้บริหารฟาร์ม (Owner Configurations)
                    </p>

                    {/* Google Meet Emergency System Controls */}
                    <div className="bg-red-500/5 dark:bg-red-950/10 rounded-3xl p-5 border border-red-500/20 shadow-sm space-y-4">
                      <div className="flex items-start gap-3.5">
                        <div className="p-2.5 bg-red-100 dark:bg-white/5 text-red-600 dark:text-rose-400 rounded-2xl shrink-0">
                          <Video className="w-5.5 h-5.5" />
                        </div>
                        <div>
                          <p className="font-black text-rose-700 dark:text-rose-400 text-sm leading-tight">ระบบเรียกประชุมด่วนสัตวบาล (Google Meet)</p>
                          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-bold">แจ้งเตือนสายสัญญาณเสียงโทรศัพท์สั่นเรียกรวมคณะพนักงาน</p>
                        </div>
                      </div>

                      {/* Signaling Toggle */}
                      <div className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-[#05262e] rounded-2xl border border-red-200/40 dark:border-white/5">
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-700 dark:text-white/70">สถานะตัวเรียก</p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">เปิดแล้วพนักงานจะสั่นเตือนรัวทันที</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleMeeting}
                          className={clsx(
                            "px-4 py-2 border-0 rounded-xl font-black text-[11px] transition-all cursor-pointer whitespace-nowrap shadow-sm",
                            isMeetingActive 
                              ? "bg-red-550 text-white shadow-red-500/20 scale-105 active:scale-95 animate-pulse" 
                              : "bg-slate-100 text-slate-500 hover:text-slate-800 dark:bg-slate-800 dark:text-white/60"
                          )}
                        >
                          {isMeetingActive ? '📡 ส่งสัญญาณอยู่ (แตะปิด)' : '💤 ปิดสัญญาณอยู่ (เรียกสั่น)'}
                        </button>
                      </div>

                      {/* Google Meet Input setter */}
                      <form onSubmit={handleSaveMeetingLink} className="space-y-2">
                        <label className="block text-[10px] pl-1 font-black text-red-600 dark:text-rose-400 uppercase tracking-wide">ลิงก์ Google Meet ประจำฟาร์ม</label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={meetingLink}
                            onChange={(e) => setMeetingLink(e.target.value)}
                            placeholder="https://meet.google.com/abc-defg-hij"
                            required
                            className="flex-1 px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-red-400"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-red-500 text-white border-0 font-black rounded-xl text-xs transition-all cursor-pointer shadow-md hover:brightness-105"
                          >
                            บันทึก
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Role & User Management - Admin only requirement */}
                    <div className="bg-white dark:bg-[#05262e] rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-sm overflow-hidden text-slate-800 dark:text-white">
                      <button 
                        onClick={() => setIsUserManagementOpen(true)}
                        className="w-full p-4.5 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 border-0 bg-transparent cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                            <Users className="w-5.5 h-5.5" />
                          </div>
                          <div>
                            <p className="font-extrabold text-[#111827] dark:text-white text-sm leading-tight">จัดการพนักงานและสิทธิ์ผู้ใช้งาน</p>
                            <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-bold">กำหนดสิทธิ์พนักงาน ลาออก อนุมัติผู้ใช้งานเข้าสู่ระบบฟาร์ม</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Account Details read-only summaries */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#05262e] p-4.5 rounded-3xl border border-slate-200/50 dark:border-white/10 text-center">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">รหัสที่สมัครสมัครมา</p>
                    <p className="text-xl font-mono font-black text-[#00bcd4] mt-1">{employeeId}</p>
                  </div>
                  <div className="bg-white dark:bg-[#05262e] p-4.5 rounded-3xl border border-slate-200/50 dark:border-white/10 text-center">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">สถานะสัญญาจ้าง</p>
                    <p className="text-sm font-black text-rose-500 dark:text-green-400 mt-1">ACTIVE (อนุมัติ)</p>
                  </div>
                </div>

                {/* Logout Button */}
                <button 
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="w-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 p-4.5 rounded-3xl border border-red-200 dark:border-red-500/20 font-black flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-500/20 active:scale-[0.98] transition-all text-base shrink-0 border-0 pointer-events-auto cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  ออกจากระบบเซสชัน
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pop-up Overlay (Modal View) for Editing Profile - Requirement 2 */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            {/* Modal Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="fixed inset-0 bg-slate-950/95 backdrop-blur-md"
            />

            {/* Modal Content Box */}
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.45 }}
              className="relative w-full max-w-2xl bg-[#f0f9fb] dark:bg-[#041a1f] rounded-[2.5rem] border border-[#00bcd4]/20 shadow-2xl overflow-hidden flex flex-col z-50 max-h-[92vh]"
            >
              {/* Pop-up Title */}
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#05262e] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#00bcd4]/10 text-[#00bcd4] rounded-xl">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-lg leading-none">ฟอร์มแก้ไขข้อมูลส่วนตัว</h3>
                    <p className="text-xs text-slate-500 dark:text-white/40 mt-1.5 font-bold">บันทึกประวัติพนักงานและพิมพ์บัตรพนักงานจำลอง</p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all border border-0 cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Scrollable contents enclosing the ID Card and Form */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* --- Requirement 3: Real-time Employee ID Card Preview --- */}
                <div className="flex justify-center flex-col items-center">
                  <p className="text-[11px] font-black uppercase text-slate-400 dark:text-white/30 tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
                    พรีวิวบัตรแสดงตนแบบเรียลไทม์ (Live ID Preview)
                  </p>
                  
                  {/* Virtual ID Card Shield layout */}
                  <div ref={cardRef} className="w-full max-w-sm h-60 bg-gradient-to-br from-[#0e3b43] to-[#041a1f] p-5.5 rounded-3xl border-2 border-slate-200/20 shadow-xl overflow-hidden text-white relative flex flex-col justify-between shrink-0 select-none">
                    
                    {/* Metallic sheen glow behind picture */}
                    <div className="absolute -top-10 -right-10 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

                    {/* Badge top belt slit decorative overlay */}
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-14 h-2 bg-slate-950/60 rounded-full border border-white/5 pointer-events-none" />

                    {/* Card Header information */}
                    <div className="flex justify-between items-start mt-2">
                      <div className="flex items-center gap-2">
                        {/* Custom Pig/Farm Emblem inside card */}
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00bcd4] to-blue-600 flex items-center justify-center shadow-inner">
                          <span className="text-white text-xs font-black tracking-tighter">🐖</span>
                        </div>
                        <div>
                          <p className="text-[12px] font-black tracking-tight leading-none text-[#00bcd4]">นิพนธ์ฟาร์ม</p>
                          <p className="text-[8px] tracking-wider text-white/50 leading-none font-bold mt-0.5">NIPHON SEEDSTOCK FARM</p>
                        </div>
                      </div>

                      {/* Small mock Access badge */}
                      <span className={clsx(
                        "px-2.5 py-1 rounded-lg text-[8px] font-black tracking-widest shadow-md uppercase border",
                        isAdmin 
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          : "bg-[#00bcd4]/20 text-[#00bcd4] border-[#00bcd4]/40"
                      )}>
                        {userProfile.role}
                      </span>
                    </div>

                    {/* Middle: ID details split and Photo container */}
                    <div className="flex gap-4 items-center">
                      
                      {/* Left: Round image cover */}
                      <div className="relative group shrink-0">
                        <div className="w-20 h-20 bg-white/5 rounded-2xl p-1 shadow-inner border border-white/20 flex items-center justify-center overflow-hidden relative">
                          {localPhotoDataUrl || formData.photoURL ? (
                            <img 
                              src={localPhotoDataUrl || formData.photoURL || ''} 
                              alt="Card Preview" 
                              className="w-full h-full rounded-xl object-cover" 
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className="w-full h-full rounded-xl bg-slate-800/60 flex flex-col items-center justify-center gap-1">
                              <span className="text-white/30 text-xs font-bold font-sans">NO IMG</span>
                            </div>
                          )}
                        </div>

                        {/* Fast image upload overlay hovering photo on card directly */}
                        <label className="absolute -bottom-1.5 -right-1.5 w-6.5 h-6.5 bg-blue-600 rounded-lg flex items-center justify-center cursor-pointer shadow-md hover:bg-blue-500 active:scale-90 transition-all border border-white/20 text-white">
                          <Camera className="w-3.5 h-3.5" />
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            className="hidden" 
                          />
                        </label>
                      </div>

                      {/* Right Detail Bindings */}
                      <div className="flex-1 space-y-1.5 min-w-0">
                        {/* Display Name text bound real-time */}
                        <div className="min-w-0">
                          <p className="text-[9px] font-black tracking-widest text-white/45 uppercase leading-none">ผู้ถือบัตร / NAME</p>
                          <p className="text-base font-black tracking-tight text-white truncate drop-shadow-sm mt-0.5">
                            {formData.displayName || 'ไม่มีตัวตน / UNKNOWN'}
                          </p>
                        </div>
                        
                        {/* Job Position text bound real-time */}
                        <div className="min-w-0">
                          <p className="text-[9px] font-black tracking-widest text-white/45 uppercase leading-none">ตำแหน่งงาน / POSITION</p>
                          <p className="text-xs font-bold text-[#00bcd4] truncate mt-0.5">
                            {formData.jobTitle || 'พนักงานสัตวบาล'}
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Footer barcode decoration */}
                    <div className="border-t border-white/10 pt-2.5 flex justify-between items-center bg-slate-900/40 px-3.5 py-1.5 rounded-2xl">
                      <div>
                        <p className="text-[8px] font-mono leading-none text-white/40">EMPLOYEE SERIAL CARD</p>
                        <p className="text-xs font-mono font-black tracking-wide text-white mt-0.5">{employeeId}</p>
                      </div>

                      {/* Barcode dynamic rendering with high visibility scan block */}
                      <div className="bg-white px-2 py-0.5 rounded-lg flex items-center justify-center shrink-0 shadow-sm" title="scannable e-Barcode">
                        <svg ref={barcodeRef} style={{ maxHeight: '24px', width: 'auto' }} />
                      </div>
                    </div>

                  </div>

                  {/* Actionable button to download actual employee ID-Card image file */}
                  <button
                    type="button"
                    onClick={handleDownloadCard}
                    className="mt-4 px-6 py-3 bg-[#0a333d] hover:bg-[#0f4451] text-white border border-[#00bcd4]/30 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-teal-500/5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#00bcd4]" />
                    ดาวน์โหลดบัตรพนักงาน (.PNG คุณภาพสูง)
                  </button>
                </div>

                {/* Form Elements for Editing */}
                <form id="editProfileForm" onSubmit={handleSave} className="space-y-6">
                  
                  {/* Personal Section */}
                  <div className="bg-white dark:bg-[#05262e] rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                    <p className="text-[11px] font-black uppercase text-slate-400 dark:text-white/30 tracking-widest">หมวดหมู่ข้อมูลพนักงาน</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name field */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-black text-slate-600 dark:text-white/50 pl-1">ชื่อ-นามสกุลจริง</label>
                        <input
                          type="text"
                          required
                          value={formData.displayName}
                          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/50 text-slate-900 dark:text-white font-bold"
                          placeholder="กรอกชื่อและนามสกุล"
                        />
                      </div>

                      {/* Job title field */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-black text-slate-600 dark:text-white/50 pl-1">ตำแหน่งหน้าที่งาน</label>
                        <input
                          type="text"
                          required
                          value={formData.jobTitle}
                          onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/50 text-slate-900 dark:text-white font-bold"
                          placeholder="เช่น สัตวบาล, ผู้นำฝ่ายผลิต, งานจัดการเล้า"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact section */}
                  <div className="bg-white dark:bg-[#05262e] rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                    <p className="text-[11px] font-black uppercase text-slate-400 dark:text-white/30 tracking-widest">ข้อมูลการสื่อสารและการติดต่อ</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-black text-slate-600 dark:text-white/50 pl-1">เบอร์โทรศัพท์ (มีขีดคั่น)</label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/50 text-slate-900 dark:text-white font-bold"
                          placeholder="e.g. 081-234-5678"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-black text-slate-600 dark:text-white/50 pl-1">Line ID สำหรับสื่อสาร</label>
                        <input
                          type="text"
                          required
                          value={formData.lineId}
                          onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/50 text-slate-900 dark:text-white font-bold"
                          placeholder="กรอกไอดีไลน์"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-slate-600 dark:text-white/50 pl-1">ผู้ติดต่อกรณีฉุกเฉิน (ชื่อพร้อมเบอร์)</label>
                      <input
                        type="text"
                        required
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/50 text-slate-900 dark:text-white font-bold"
                        placeholder="ชื่อผู้ติดต่อ - เบอร์โทร"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black text-slate-600 dark:text-white/50 pl-1">ที่อยู่ที่พำนักในปัจจุบัน</label>
                      <textarea
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 p-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/50 text-slate-900 dark:text-white font-bold min-h-[80px]"
                        placeholder="ที่ตั้งถิ่นฐานสำหรับส่งเอกสารติดต่อ"
                      />
                    </div>
                  </div>

                  {/* Financial (Bank accounts) section */}
                  <div className="bg-white dark:bg-[#05262e] rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                    <p className="text-[11px] font-black uppercase text-slate-400 dark:text-white/30 tracking-widest">ข้อมูลบัญชีเงินฝากสำหรับโอนค่าเบี้ยเลี้ยงและรายเดือน</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Bank name */}
                      <div className="flex flex-col gap-1.5 relative">
                        <label className="text-xs font-black text-slate-600 dark:text-white/50 pl-1">ธนาคารปลายทาง</label>
                        <div className="relative w-full">
                          <select
                            required
                            value={formData.bankAccount?.bankName || ''}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              bankAccount: { 
                                bankName: e.target.value, 
                                accountNumber: formData.bankAccount?.accountNumber || '', 
                                accountName: formData.bankAccount?.accountName || '' 
                              } 
                            })}
                            className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 p-3.5 pr-10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/50 text-slate-900 dark:text-white font-bold appearance-none cursor-pointer"
                          >
                            <option value="" disabled className="text-slate-400 bg-white dark:bg-[#05262e]">-- แตะเลือกธนาคาร --</option>
                            {BANK_OPTIONS.map((b) => (
                              <option key={b.value} value={b.value} className="text-slate-900 dark:text-white bg-white dark:bg-[#05262e] font-bold">
                                {b.label}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                          </div>
                        </div>
                      </div>

                      {/* Bank Account Number */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-black text-slate-600 dark:text-white/50 pl-1">เลขที่บัญชี</label>
                        <input
                          type="text"
                          required
                          value={formData.bankAccount?.accountNumber || ''}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            bankAccount: { 
                              bankName: formData.bankAccount?.bankName || '', 
                              accountNumber: e.target.value, 
                              accountName: formData.bankAccount?.accountName || '' 
                            } 
                          })}
                          className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/50 text-slate-900 dark:text-white font-bold font-mono"
                          placeholder="XXX-X-XXXXX-X"
                        />
                      </div>

                      {/* Bank Account Name */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-black text-slate-600 dark:text-white/50 pl-1">ชื่อระบุบนหน้าบัญชี</label>
                        <input
                          type="text"
                          required
                          value={formData.bankAccount?.accountName || ''}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            bankAccount: { 
                              bankName: formData.bankAccount?.bankName || '', 
                              accountNumber: formData.bankAccount?.accountNumber || '', 
                              accountName: e.target.value 
                            } 
                          })}
                          className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/50 text-slate-900 dark:text-white font-bold"
                          placeholder="ชื่อสะกดภาษาไทย"
                        />
                      </div>
                    </div>
                  </div>

                </form>

              </div>

              {/* Action Buttons inside popup overlay */}
              <div className="p-5.5 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#05262e] flex gap-3.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/15 text-slate-700 dark:text-white font-black py-4.5 rounded-2xl transition-all text-sm border-0 cursor-pointer active:scale-95"
                >
                  ยกเลิก (Cancel)
                </button>
                <button
                  type="submit"
                  form="editProfileForm"
                  disabled={saving || uploadingImage}
                  className="flex-1 bg-[#10b981] hover:bg-[#059669] disabled:bg-slate-350 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white font-black py-4.5 rounded-2xl ring-offset-2 hover:brightness-105 active:scale-95 transition-all text-sm shadow-md flex items-center justify-center gap-2 border-0 cursor-pointer"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      บันทึกข้อมูล (Save changes)
                    </>
                  )}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pop-up Overlay (Modal View) for UserManagement list - ADMIN only */}
      <AnimatePresence>
        {isUserManagementOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
            {/* Modal Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserManagementOpen(false)}
              className="fixed inset-0 bg-slate-950/95 backdrop-blur-md"
            />

            {/* Modal Content Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="relative w-full max-w-5xl bg-[#f0f9fb] dark:bg-[#041a1f] rounded-[2.5rem] border border-[#00bcd4]/30 shadow-2xl overflow-hidden flex flex-col z-50 h-[90vh]"
            >
              {/* Pop-up Header */}
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#05262e] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-sm">
                    <Shield className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-lg leading-none">ระบบจัดการพนักงานและสิทธิ์การใช้งาน</h3>
                    <p className="text-xs text-slate-500 dark:text-white/40 mt-1.5 font-bold">กำหนดระดับสิทธิ์ และอนุมัติสถานะการเข้าถึงฐานข้อมูลพนักงาน</p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsUserManagementOpen(false)}
                  className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all border border-0 cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Modal Body enclosing UserManagement exactly */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#ebf7f9] dark:bg-[#042026]">
                <UserManagement />
              </div>

              {/* Close footer element */}
              <div className="p-5 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#05262e] shrink-0 flex justify-end">
                <button 
                  onClick={() => setIsUserManagementOpen(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white/10 dark:hover:bg-white/20 dark:text-white font-black py-3 px-6 rounded-2xl border-0 active:scale-95 transition-all cursor-pointer text-sm"
                >
                  เสร็จสิ้น (Close Manager)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
