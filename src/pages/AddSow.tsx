import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { addSow } from '../services/sowService';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import { useAuth } from '../contexts/AuthContext';

export default function AddSow() {
  const navigate = useNavigate();
  const { showAlert, showSuccess, showError, showLoading, hideLoading } = useBottomSheet();
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    sowId: string;
    breed: string;
    type: 'SOW' | 'BOAR';
    birthDate: string;
    entryDate: string;
  }>({
    sowId: '',
    breed: '',
    type: 'SOW',
    birthDate: '',
    entryDate: new Date().toISOString().split('T')[0], // Default to today
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sowId || !formData.breed) {
      showAlert('กรุณากรอกเบอร์หูและสายพันธุ์', 'ข้อมูลไม่ครบถ้วน');
      return;
    }

    setLoading(true);
    showLoading('กำลังบันทึกข้อมูลและสร้างตารางงานแม่พันธุ์...', 'กำลังบันทึกข้อมูล');
    try {
      const recorderName = userProfile?.displayName || user?.displayName || user?.email || 'พนักงาน';
      const resultId = await addSow(formData, recorderName);
      hideLoading();
      if (resultId) {
        showSuccess('บันทึกข้อมูลเรียบร้อยแล้ว', 'สำเร็จ');
        navigate('/sows');
      } else {
        throw new Error('บันทึกไม่สำเร็จ');
      }
    } catch (error: any) {
      hideLoading();
      console.error('Error adding sow:', error);
      showError(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
    } finally {
      setLoading(false);
      hideLoading();
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-white dark:bg-white/10 backdrop-blur-md rounded-full shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide">เพิ่มแม่พันธุ์/พ่อพันธุ์</h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-white/10 backdrop-blur-md rounded-3xl p-6 shadow-2xl dark:shadow-xl border border-slate-200 dark:border-white/20 space-y-5">
        
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-3 ml-1">ประเภท</label>
          <div className="flex gap-4">
            <label className="flex-1 cursor-pointer">
              <input 
                type="radio" 
                name="type" 
                value="SOW" 
                checked={formData.type === 'SOW'} 
                onChange={handleChange} 
                className="peer sr-only" 
              />
              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-center peer-checked:bg-pink-500/20 peer-checked:border-pink-500 peer-checked:text-pink-300 transition-all font-medium">
                แม่พันธุ์ (Sow)
              </div>
            </label>
            <label className="flex-1 cursor-pointer">
              <input 
                type="radio" 
                name="type" 
                value="BOAR" 
                checked={formData.type === 'BOAR'} 
                onChange={handleChange} 
                className="peer sr-only" 
              />
              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-center peer-checked:bg-orange-500/20 peer-checked:border-orange-500 peer-checked:text-orange-300 transition-all font-medium">
                พ่อพันธุ์ (Boar)
              </div>
            </label>
          </div>
        </div>

        <div>
          <input 
            type="text" 
            name="sowId"
            value={formData.sowId}
            onChange={handleChange}
            placeholder="เบอร์หู (Sow ID) * เช่น A001"
            className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all text-lg"
            required
          />
        </div>

        <div>
          <select 
            name="breed"
            value={formData.breed}
            onChange={handleChange}
            className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all text-lg appearance-none"
            required
          >
            <option value="" className="text-gray-800">-- เลือกสายพันธุ์ --</option>
            <option value="Landrace" className="text-gray-800">แลนด์เรซ (Landrace)</option>
            <option value="Large White" className="text-gray-800">ลาร์จไวท์ (Large White)</option>
            <option value="Duroc" className="text-gray-800">ดูร็อค (Duroc)</option>
            <option value="Crossbreed" className="text-gray-800">ลูกผสม (Crossbreed)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">วันเกิด</label>
          <input 
            type="date" 
            name="birthDate"
            value={formData.birthDate}
            onChange={handleChange}
            className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all text-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">วันที่เข้าฝูง *</label>
          <input 
            type="date" 
            name="entryDate"
            value={formData.entryDate}
            onChange={handleChange}
            className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all text-lg"
            required
          />
        </div>

        <div className="pt-6">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#00bcd4] text-slate-900 dark:text-white font-bold p-4 rounded-2xl shadow-[0_0_20px_rgba(0,188,212,0.3)] hover:bg-cyan-400 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-70 text-lg"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save className="w-6 h-6" />
                บันทึกข้อมูล
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
