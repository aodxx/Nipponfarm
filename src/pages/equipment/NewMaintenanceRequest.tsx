import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { ArrowLeft, Camera, Image as ImageIcon, Loader2, Save, PenTool, Droplet, Zap, Frame, Wrench, Trash2 } from 'lucide-react';
import { createMaintenanceRequest } from '../../services/maintenanceService';
import { VideoRecorderUpload } from '../../components/VideoRecorderUpload';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const LOCATIONS = [
  'โรงเรือนแม่พันธุ์ A',
  'โรงเรือนคลอด B',
  'โรงเรือนหมูขุน C',
  'โรงผสมอาหาร D',
  'พื้นที่ภายนอก (ทั่วไป)',
];

const CATEGORIES = [
  { id: 'WATER', label: 'ระบบน้ำ/ประปา', icon: Droplet, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'ELECTRIC', label: 'ระบบไฟฟ้า', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { id: 'STRUCTURE', label: 'โครงสร้าง/งานเชื่อม', icon: Frame, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
  { id: 'EQUIPMENT', label: 'อุปกรณ์จำเพาะ', icon: PenTool, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'OTHER', label: 'อื่นๆ', icon: Wrench, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
];

export default function NewMaintenanceRequest() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { user, userProfile } = useAuth();
  const { showAlert, showSuccess, showError, showLoading, hideLoading } = useBottomSheet();
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [category, setCategory] = useState<'WATER' | 'ELECTRIC' | 'STRUCTURE' | 'EQUIPMENT' | 'OTHER'>('WATER');
  const [requiredParts, setRequiredParts] = useState('');
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [allocatedDocId, setAllocatedDocId] = useState<string | null>(null);

  // Parse location from URL if we came from a specific menu
  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search);
    const locParam = params.get('loc');
    if (locParam) {
      const decodedLoc = decodeURIComponent(locParam);
      if (LOCATIONS.includes(decodedLoc)) {
        setLocation(decodedLoc);
      }
    }
  }, [routerLocation]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...filesArray]);
      
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !location || !user) {
      showAlert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }
    
    setLoading(true);
    showLoading('กำลังอัปโหลดรูปภาพและบันทึกการแจ้งซ่อม...', 'กำลังบันทึกข้อมูล');
    try {
      let imageUrls: string[] = [];
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      
      // Upload images to Firebase Storage if exist
      if (imageFiles.length > 0) {
        try {
          for (const file of imageFiles) {
            if (file.size > MAX_FILE_SIZE) {
              console.warn('File too large:', file.name);
              continue;
            }
            // Create unique file name
            const fileExtension = file.name.split('.').pop();
            const fileName = `maintenance/${user.uid}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
            const storageRef = ref(storage, fileName);
            
            // Upload the file
            await uploadBytes(storageRef, file);
            
            // Get the download URL
            const url = await getDownloadURL(storageRef);
            imageUrls.push(url);
          }
        } catch (storageErr) {
          console.error('Storage upload failed, proceeding without images:', storageErr);
          // Don't block the whole request if storage fails
        }
      }

      // Save request to Firestore via service
      await createMaintenanceRequest({
        ...(allocatedDocId ? { id: allocatedDocId } : {}),
        userId: user.uid,
        title,
        description,
        location,
        locationDetails,
        category,
        requiredParts,
        imageUrl: imageUrls.length > 0 ? imageUrls[0] : null,
        imageUrls,
        videoUrl,
        status: 'PENDING',
        urgency,
        reportedBy: userProfile?.displayName || user.displayName || user.email || 'พนักงาน',
        createdAt: Date.now()
      });

      hideLoading();
      showSuccess('บันทึกการแจ้งซ่อมเรียบร้อยแล้ว', 'แจ้งซ่อมสำเร็จ');
      navigate('/maintenance');
    } catch (error: any) {
      console.error('Error creating maintenance request:', error);
      hideLoading();
      showError('ไม่สามารถบันทึกข้อมูลได้ กรุณากรอกข้อมูลหรือตรวจสอบอินเทอร์เน็ตอีกครั้ง', 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
      hideLoading();
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white dark:bg-white/10 backdrop-blur-md p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-500 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">แจ้งซ่อม/บำรุงรักษา</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Category Selection */}
        <div className="bg-white dark:bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-white/10">
          <h3 className="font-bold text-slate-800 dark:text-white mb-3">หมวดหมู่งานซ่อม <span className="text-red-500">*</span></h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id as any)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2 ${
                    isSelected ? `${cat.bg} ${cat.border} ${cat.color} dark:bg-white/10 dark:border-white/20 shadow-sm scale-[0.98]` : 'border-slate-100 dark:border-white/10 text-slate-500 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isSelected ? '' : 'text-slate-400 dark:text-white/40'}`} />
                  <span className={`text-sm font-medium ${isSelected ? 'font-bold' : ''}`}>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Details Form */}
        <div className="bg-white dark:bg-white/10 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-white/10 space-y-5">
          <div>
            <label className="block text-lg font-bold text-slate-900 dark:text-white mb-2">
              อุปกรณ์ที่ชำรุด / ปัญหา <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder=""
              className="w-full h-[52px] px-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4] transition-all dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="block text-lg font-bold text-slate-900 dark:text-white mb-2">
                สถานที่หลัก <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-[52px] px-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4] transition-all dark:text-white mt-auto"
              >
                <option value="" disabled>-- เลือกสถานที่ --</option>
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="block text-lg font-bold text-slate-900 dark:text-white mb-2">
                จุดที่เสีย <span className="text-sm font-normal text-slate-500 dark:text-white/60">(ระบุตำแหน่งชัดเจน)</span>
              </label>
              <input
                type="text"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder=""
                className="w-full h-[52px] px-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4] transition-all dark:text-white mt-auto"
              />
            </div>
          </div>

          <div>
            <label className="block text-lg font-bold text-slate-900 dark:text-white mb-2">
              อุปกรณ์/อะไหล่ที่ต้องหาซื้อ (สรุปกันลืม)
            </label>
            <textarea
              value={requiredParts}
              onChange={(e) => {
                setRequiredParts(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              rows={2}
              placeholder=""
              className="w-full p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-100 placeholder:text-amber-400 dark:placeholder:text-amber-700 rounded-xl outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all resize-none overflow-hidden"
            ></textarea>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">* จดไว้กันลืมเวลาไปซื้ออะไหล่</p>
          </div>

          <div>
            <label className="block text-lg font-bold text-slate-900 dark:text-white mb-2">
              รายละเอียดเพิ่มเติม / สาเหตุ
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              rows={2}
              placeholder=""
              className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4] transition-all resize-none overflow-hidden dark:text-white"
            ></textarea>
          </div>

          <div>
            <label className="block text-lg font-bold text-slate-900 dark:text-white mb-3">
              ระดับความเร่งด่วน
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUrgency('MEDIUM')}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${urgency === 'MEDIUM' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-400 scale-[0.98]' : 'border-slate-100 dark:border-white/10 text-slate-500 dark:text-white/60 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10'}`}
              >
                ทั่วไป (ซ่อมตามคิว)
              </button>
              <button
                type="button"
                onClick={() => setUrgency('HIGH')}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${urgency === 'HIGH' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 text-orange-700 dark:text-orange-400 scale-[0.98]' : 'border-slate-100 dark:border-white/10 text-slate-500 dark:text-white/60 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10'}`}
              >
                ด่วน (ต้องซ่อมทันที)
              </button>
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="bg-white dark:bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-white/10">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800 dark:text-white">รูปภาพประกอบ (ถ้ามี)</h3>
            <span className="text-xs text-slate-500 dark:text-white/60">{imagePreviews.length} รูป</span>
          </div>
          
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 group">
                  <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 p-2 rounded-full font-medium shadow-sm hover:scale-105 transition-transform"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <label className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 hover:border-[#00bcd4] dark:hover:border-[#00bcd4] transition-colors text-slate-500 dark:text-white/60">
              <Camera className="w-8 h-8" />
              <span className="text-sm font-medium">ถ่ายรูป</span>
              <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleImageChange} />
            </label>
            
            <label className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 hover:border-[#00bcd4] dark:hover:border-[#00bcd4] transition-colors text-slate-500 dark:text-white/60">
              <ImageIcon className="w-8 h-8" />
              <span className="text-sm font-medium">เลือกจากคลัง</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
            </label>
          </div>
        </div>

        {/* Video Upload Section */}
        <div className="bg-white dark:bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-white/10">
          <h3 className="font-bold text-slate-800 dark:text-white mb-3">📹 วิดีโอหลักฐานอุปกรณ์พัง (Cloudflare R2)</h3>
          {videoUrl ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-sm flex justify-between items-center animate-in fade-in duration-200">
              <span className="font-semibold">✓ อัปโหลดวิดีโอหลักฐานสำเร็จ</span>
              <button 
                type="button" 
                onClick={() => { setVideoUrl(null); setAllocatedDocId(null); }} 
                className="text-xs text-red-500 dark:text-red-400 font-bold hover:underline"
              >
                ลบวิดีโอ
              </button>
            </div>
          ) : (
            <VideoRecorderUpload
              userId={user?.uid || ''}
              moduleName="maintenance"
              onCreateDraft={async () => {
                const tempDocRef = doc(collection(db, 'maintenance_requests'));
                setAllocatedDocId(tempDocRef.id);
                return tempDocRef.id;
              }}
              onUploadSuccess={async (url) => {
                setVideoUrl(url);
              }}
              onUploadFailure={async () => {
                setVideoUrl(null);
                setAllocatedDocId(null);
              }}
              maxSizeMB={20}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !title || !location}
          className="w-full bg-[#00bcd4] hover:bg-[#00acc1] disabled:bg-slate-300 text-white shadow-md p-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {loading ? 'กำลังบันทึก...' : 'บันทึกการแจ้งซ่อม'}
        </button>
      </form>
    </div>
  );
}

