import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Wallet, Edit3, Banknote } from 'lucide-react';
import { subscribeToBaseSalaries, saveBaseSalary } from '../../services/employeeService';
import { getAllUsers } from '../../services/userService';
import { EmployeeBaseSalary, UserProfile } from '../../types';
import { useBottomSheet } from '../../contexts/BottomSheetContext';

export default function BaseSalary() {
  const navigate = useNavigate();
  const { showAlert } = useBottomSheet();
  const [salaries, setSalaries] = useState<EmployeeBaseSalary[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Local state for the inputs
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUsersAndSalaries = async () => {
      try {
        const fetchedUsers = await getAllUsers();
        // optionally filter only staff: fetchedUsers.filter(u => u.role === 'STAFF')
        setUsers(fetchedUsers);

        const unsub = subscribeToBaseSalaries((data) => {
          setSalaries(data);
          
          // Initialize input values from fetched data
          const initialInputs: Record<string, string> = {};
          fetchedUsers.forEach(emp => {
            const existing = data.find(s => s.userId === emp.uid);
            if (existing) {
              initialInputs[emp.uid] = existing.base_salary.toString();
            }
          });
          setInputValues(prev => ({...initialInputs, ...prev})); // merge so we don't overwrite user edits
          setLoading(false);
        });
        return unsub;
      } catch (err) {
        console.error("Failed to load users", err);
        setLoading(false);
      }
    };
    
    let unsubscribe: any = null;
    fetchUsersAndSalaries().then((unsub) => {
      if (typeof unsub === 'function') {
        unsubscribe = unsub;
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    }
  }, []);

  const handleSave = async (userId: string, employeeName: string) => {
    const amountStr = inputValues[userId];
    if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) < 0) {
      showAlert('กรุณากรอกจำนวนเงิน ให้ถูกต้อง');
      return;
    }

    setSaving(userId);
    try {
      await saveBaseSalary(userId, Number(amountStr));
      showAlert(`บันทึกฐานเงินเดือนของ ${employeeName} สำเร็จ`);
    } catch (error) {
      showAlert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(null);
    }
  };

  const getSavedSalary = (uid: string) => {
    const existing = salaries.find(s => s.userId === uid);
    return existing ? existing.base_salary : 0;
  };

  if (loading) {
    return <div className="flex justify-center items-center py-20"><div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-slate-50 dark:bg-white/5 backdrop-blur-md rounded-full shadow-sm border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Wallet className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">ตั้งค่าฐานเงินเดือน</h2>
        </div>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl p-5 mb-6 border border-emerald-100 dark:border-emerald-800/30 flex items-start gap-4">
        <div className="p-3 bg-emerald-100 dark:bg-emerald-800/50 rounded-2xl text-emerald-600 dark:text-emerald-400 shrink-0">
          <Edit3 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">ปรับปรุงฐานเงินเดือน</h3>
          <p className="text-slate-600 dark:text-white/60 text-sm">การแก้ไขฐานเงินเดือนจะมีผลกับรอบการคำนวณเงินเดือนในรอบถัดไปและปัจจุบันทันที กรุณาตรวจสอบให้ถูกต้องทุกครั้งก่อนบันทึก</p>
        </div>
      </div>

      <div className="space-y-4">
        {users.map(emp => {
          const currentSaved = getSavedSalary(emp.uid);
          const isChanged = (inputValues[emp.uid] && Number(inputValues[emp.uid]) !== currentSaved) || (!inputValues[emp.uid] && currentSaved > 0);

          return (
          <div key={emp.uid} className="bg-white dark:bg-[#1a2f3a] rounded-[2rem] p-5 shadow-sm border border-slate-200 dark:border-white/10 flex flex-col gap-5 relative overflow-hidden group transition-all hover:shadow-md">
            
            {/* Role Badge */}
            <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-xs font-bold ${emp.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
              {emp.role === 'ADMIN' ? 'ผู้ดูแล (Owner)' : 'พนักงาน'}
            </div>

            <div className="flex justify-between items-start pt-2">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{emp.displayName}</h3>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                  ปัจจุบัน: <Banknote className="w-4 h-4 ml-1" /> ฿{currentSaved.toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 font-medium">฿</span>
                <input 
                  type="number" 
                  value={inputValues[emp.uid] || ''}
                  onChange={(e) => setInputValues(prev => ({ ...prev, [emp.uid]: e.target.value }))}
                  placeholder="0.00"
                  className="w-full pl-9 pr-4 py-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all font-bold text-lg shadow-inner"
                />
              </div>
              <button 
                onClick={() => handleSave(emp.uid, emp.displayName)}
                disabled={saving === emp.uid || !isChanged}
                className={`p-4 rounded-2xl transition-all flex justify-center items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isChanged ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 active:scale-95' : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/30'}`}
              >
                {saving === emp.uid ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        )})}
        {users.length === 0 && (
          <div className="text-center p-8 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10">
            <p className="text-slate-500 dark:text-white/50 font-medium">ไม่พบข้อมูลพนักงาน</p>
          </div>
        )}
      </div>
    </div>
  );
}
