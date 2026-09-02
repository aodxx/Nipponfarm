import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, HandCoins, CheckCircle2 } from 'lucide-react';
import { addAdvance } from '../../services/employeeService';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { useAuth } from '../../contexts/AuthContext';

export default function AdvanceRequest() {
  const navigate = useNavigate();
  const { showAlert } = useBottomSheet();
  const { user } = useAuth();
  
  // Form State
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      showAlert('กรุณากรอกจำนวนเงินให้ถูกต้อง');
      return;
    }

    setSaving(true);
    try {
      await addAdvance(Number(amount), date);
      setSuccess(true);
      setAmount('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      showAlert('เกิดข้อผิดพลาดในการบันทึกคำขอ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-slate-50 dark:bg-white/5 backdrop-blur-md rounded-full shadow-sm border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-pink-100 dark:bg-pink-900/40 rounded-xl text-pink-600 dark:text-pink-400">
            <HandCoins className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">เบิกล่วงหน้า</h2>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-6 h-6" />
          <p className="font-bold">ส่งคำขอเบิกล่วงหน้าสำเร็จ</p>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1a2f3a] rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-white/10 space-y-6">
        
        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-white/50">ผู้ขอเบิก</span>
            <span className="font-bold text-slate-900 dark:text-white">{user?.displayName || 'คุณ'}</span>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-white/70 mb-2 ml-1">จำนวนเงิน (บาท)</label>
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="เช่น 500"
            className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent transition-all text-xl font-black"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-white/70 mb-2 ml-1">วันที่ต้องการเบิก</label>
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent transition-all text-lg font-medium"
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={saving}
          className="w-full bg-pink-600 text-white font-black p-4 rounded-2xl shadow-lg shadow-pink-500/20 hover:bg-pink-500 active:scale-95 transition-all flex justify-center items-center gap-2 text-lg mt-8 disabled:opacity-50"
        >
          {saving ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Send className="w-6 h-6" />
              ส่งคำขอเบิกเงิน
            </>
          )}
        </button>
      </form>
    </div>
  );
}
