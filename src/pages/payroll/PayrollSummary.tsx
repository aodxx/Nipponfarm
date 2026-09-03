import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, Receipt, TrendingDown, TrendingUp, Wallet, Banknote, CreditCard, Copy, Settings2, CheckCircle2, AlertCircle, FileText, Download, Mail, Send, X, Upload, Trash2 } from 'lucide-react';
import { subscribeToBaseSalaries, subscribeToMonthlyAdvances, subscribeToUserBaseSalary, subscribeToUserMonthlyAdvances, recordEmployeeTransaction } from '../../services/employeeService';
import { getAllUsers } from '../../services/userService';
import { EmployeeBaseSalary, SalaryAdvance, UserProfile, PayrollSlip } from '../../types';
import { calculateNetSalary } from '../../lib/payrollUtils';
import { getPayrollSlips, savePayrollSlip, updatePayrollSlipStatus, getUserPayrollSlips } from '../../services/payrollService';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

import { useAuth } from '../../contexts/AuthContext';
import { authenticatedFetch } from '../../lib/authenticatedFetch';

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

export default function PayrollSummary() {
  const navigate = useNavigate();
  const { showAlert } = useBottomSheet();
  const { userProfile } = useAuth();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [salaries, setSalaries] = useState<EmployeeBaseSalary[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [savedSlips, setSavedSlips] = useState<PayrollSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<1 | 2>(new Date().getDate() <= 15 ? 1 : 2);
  
  // Edit State
  const [editingSlipId, setEditingSlipId] = useState<string | null>(null);
  const [editIncome, setEditIncome] = useState(0);
  const [editDeduction, setEditDeduction] = useState(0);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  // Payment Modal States
  const [selectedPayrollItem, setSelectedPayrollItem] = useState<any | null>(null);
  const [uploadedSlip, setUploadedSlip] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAdmin = userProfile?.role === 'ADMIN';

  useEffect(() => {
    if (!userProfile) return;

    const fetchUsers = async () => {
      try {
        const fetchedUsers = await getAllUsers();
        if (userProfile.role === 'ADMIN') {
          setUsers(fetchedUsers);
        } else {
          setUsers(fetchedUsers.filter(u => u.uid === userProfile.uid));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();

    let unsubSalaries: () => void;
    if (userProfile.role === 'ADMIN') {
      unsubSalaries = subscribeToBaseSalaries((data) => {
        setSalaries(data);
      });
    } else {
      unsubSalaries = subscribeToUserBaseSalary(userProfile.uid, (salary) => {
        setSalaries(salary ? [salary] : []);
      });
    }

    return () => {
      if (unsubSalaries) unsubSalaries();
    };
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) return;

    setLoading(true);
    let isMounted = true;

    const fetchMonthlyData = async () => {
      if (!isMounted) return;
      try {
        const fetchSlips = async () => {
          const year = selectedMonth.getFullYear();
          const month = selectedMonth.getMonth();
          const slips = userProfile.role === 'ADMIN'
            ? await getPayrollSlips(year, month, selectedPeriod)
            : await getUserPayrollSlips(userProfile.uid, year, month, selectedPeriod);
          if (isMounted) setSavedSlips(slips);
        };
        await fetchSlips();
      } catch (e) {
        console.error(e);
      }
    };

    let unsubAdvances: () => void;
    if (userProfile.role === 'ADMIN') {
      unsubAdvances = subscribeToMonthlyAdvances(selectedMonth, (data) => {
        if (isMounted) {
          setAdvances(data.filter(a => a.status === 'APPROVED'));
          fetchMonthlyData().finally(() => {
            if (isMounted) setLoading(false);
          });
        }
      });
    } else {
      unsubAdvances = subscribeToUserMonthlyAdvances(userProfile.uid, selectedMonth, (data) => {
        if (isMounted) {
          setAdvances(data.filter(a => a.status === 'APPROVED'));
          fetchMonthlyData().finally(() => {
            if (isMounted) setLoading(false);
          });
        }
      });
    }

    return () => {
      isMounted = false;
      if (unsubAdvances) unsubAdvances();
    };
  }, [userProfile, selectedMonth, selectedPeriod]);

  const monthOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d;
  });

  const getPayrollData = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    return users.map(user => {
      const existingSlip = savedSlips.find(s => s.userId === user.uid);
      const totalBaseSalary = salaries.find(s => s.userId === user.uid)?.base_salary || 0;
      
      const { 
        periodBaseSalary, 
        periodAdvancesList, 
        totalAdvancesAmount
      } = calculateNetSalary({
        totalBaseSalary,
        advances,
        period: selectedPeriod,
        userId: user.uid
      });
      
      const customIncome = existingSlip?.customIncome || 0;
      const customDeductions = existingSlip?.customDeductions || 0;
      
      // Calculate final net: base + customIncome - advances - customDeductions
      const netSalary = Math.max(0, periodBaseSalary + customIncome - totalAdvancesAmount - customDeductions);

      return {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        role: user.role,
        bankAccount: user.bankAccount,
        totalBaseSalary,
        baseSalary: periodBaseSalary,
        advances: totalAdvancesAmount,
        advancesList: periodAdvancesList,
        customIncome,
        customDeductions,
        netSalary,
        slipId: existingSlip?.id,
        status: existingSlip?.status || 'PENDING',
        slipImage: existingSlip?.slipImage,
        periodYear: year,
        periodMonth: month,
      } as const;
    }).sort((a, b) => b.role.localeCompare(a.role));
  };

  const payrollData = getPayrollData();
  
  const globalBaseSalary = payrollData.reduce((sum, item) => sum + item.baseSalary, 0);
  const globalAdvances = payrollData.reduce((sum, item) => sum + item.advances, 0);
  const globalCustomIncome = payrollData.reduce((sum, item) => sum + item.customIncome, 0);
  const globalCustomDeductions = payrollData.reduce((sum, item) => sum + item.customDeductions, 0);
  const globalNetSalary = payrollData.reduce((sum, item) => sum + item.netSalary, 0);

  const handleSaveAdjustments = async (data: typeof payrollData[0]) => {
    try {
      const slip: PayrollSlip = {
        id: data.slipId || `${data.periodYear}_${data.periodMonth}_${selectedPeriod}_${data.uid}`,
        userId: data.uid,
        periodYear: data.periodYear,
        periodMonth: data.periodMonth,
        periodIndex: selectedPeriod,
        baseSalary: data.baseSalary,
        advancesAmount: data.advances,
        customDeductions: editDeduction,
        customIncome: editIncome,
        netSalary: Math.max(0, data.baseSalary + editIncome - data.advances - editDeduction),
        status: data.status,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await savePayrollSlip(slip);
      showAlert('บันทึกการปรับปรุงสำเร็จ');
      
      // Update local state temporarily
      setSavedSlips(prev => {
        const index = prev.findIndex(s => s.id === slip.id);
        if (index >= 0) {
          const newSlips = [...prev];
          newSlips[index] = slip;
          return newSlips;
        }
        return [...prev, slip];
      });
      setEditingSlipId(null);
    } catch (e) {
      console.error(e);
      showAlert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handleToggleStatus = async (item: typeof payrollData[0]) => {
    if (!isAdmin) return;
    try {
      const newStatus = item.status === 'PAID' ? 'PENDING' : 'PAID';
      const slipId = item.slipId || `${item.periodYear}_${item.periodMonth}_${selectedPeriod}_${item.uid}`;
      
      if (!item.slipId) {
        // If slip doesn't exist yet, save it first
        const slip: PayrollSlip = {
          id: slipId,
          userId: item.uid,
          periodYear: item.periodYear,
          periodMonth: item.periodMonth,
          periodIndex: selectedPeriod,
          baseSalary: item.baseSalary,
          advancesAmount: item.advances,
          customDeductions: item.customDeductions,
          customIncome: item.customIncome,
          netSalary: item.netSalary,
          status: newStatus,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          paymentDate: newStatus === 'PAID' ? Date.now() : undefined
        };
        await savePayrollSlip(slip);
        setSavedSlips(prev => [...prev, slip]);
      } else {
        await updatePayrollSlipStatus(slipId, newStatus);
        setSavedSlips(prev => prev.map(s => s.id === slipId ? { ...s, status: newStatus, paymentDate: newStatus === 'PAID' ? Date.now() : undefined } : s));
      }
      showAlert(`เปลี่ยนสถานะเป็น ${newStatus === 'PAID' ? 'จ่ายแล้ว' : 'รอดำเนินการ'}`);
    } catch (e) {
      console.error(e);
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

  const handleConfirmPayrollPayment = async (item: typeof payrollData[0], slipImage: string) => {
    setIsPaying(true);
    try {
      const slipId = item.slipId || `${item.periodYear}_${item.periodMonth}_${selectedPeriod}_${item.uid}`;
      
      let finalSlipUrl = slipImage;
      if (slipImage && slipImage.startsWith('data:image')) {
        try {
          const { uploadOptimizedImage } = await import('../../services/imageOptimizer');
          finalSlipUrl = await uploadOptimizedImage(slipImage, `slips/regular/${item.uid}/${slipId}.webp`);
        } catch (uploadErr) {
          console.error("Centralized payroll slip upload failed, falling back:", uploadErr);
        }
      }

      if (!item.slipId) {
        // If slip doesn't exist yet, save it first
        const slip: PayrollSlip = {
          id: slipId,
          userId: item.uid,
          periodYear: item.periodYear,
          periodMonth: item.periodMonth,
          periodIndex: selectedPeriod,
          baseSalary: item.baseSalary,
          advancesAmount: item.advances,
          customDeductions: item.customDeductions,
          customIncome: item.customIncome,
          netSalary: item.netSalary,
          status: 'PAID',
          slipImage: finalSlipUrl,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          paymentDate: Date.now()
        };
        await savePayrollSlip(slip);
        setSavedSlips(prev => {
          const index = prev.findIndex(s => s.id === slipId);
          if (index >= 0) {
            const nextSlips = [...prev];
            nextSlips[index] = slip;
            return nextSlips;
          }
          return [...prev, slip];
        });
      } else {
        await updatePayrollSlipStatus(slipId, 'PAID', finalSlipUrl);
        setSavedSlips(prev => prev.map(s => s.id === slipId ? { ...s, status: 'PAID', slipImage: finalSlipUrl, paymentDate: Date.now() } : s));
      }

      // Record transaction to EmployeeTransaction collection for logging
      await recordEmployeeTransaction({
        userId: item.uid,
        employeeName: item.name,
        amount: item.netSalary,
        type: 'payment',
        date: `${item.periodYear}-${String(item.periodMonth + 1).padStart(2, '0')}`,
        slipImage: finalSlipUrl,
        createdAt: Date.now()
      });

      showAlert('✅ ดำเนินการโอนเงินเดือนและอัปโหลดหลักฐานสลิปเรียบร้อยแล้ว!');
      setSelectedPayrollItem(null);
      setUploadedSlip(null);
    } catch (e: any) {
      console.error(e);
      showAlert(`❌ เกิดข้อผิดพลาด: ${e.message}`);
    } finally {
      setIsPaying(false);
    }
  };

  const sendPayslipEmail = async (data: typeof payrollData[0]) => {
    if (!data.email) {
      showAlert('❌ พนักงานคนนี้ยังไม่ได้ลงทะเบียนอีเมลในระบบ');
      return;
    }
    setSendingEmailId(data.uid);
    try {
      const monthText = selectedMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      const response = await authenticatedFetch('/api/send-payslip-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          employeeName: data.name,
          month: monthText,
          period: selectedPeriod,
          baseSalary: data.baseSalary,
          advances: data.advances,
          customIncome: data.customIncome,
          customDeductions: data.customDeductions,
          netSalary: data.netSalary,
          bankName: data.bankAccount?.bankName || '',
          accountNumber: data.bankAccount?.accountNumber || '',
          status: data.status,
          slipImage: data.slipImage || '',
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        showAlert(`✅ ส่งสลิปเงินเดือนไปยังอีเมล ${data.email} เรียบร้อยแล้ว!`);
      } else {
        showAlert(`❌ ส่งไม่สำเร็จ: ${resData.error || 'เกิดข้อผิดพลาด'}`);
      }
    } catch (err: any) {
      console.error(err);
      showAlert(`❌ เกิดข้อผิดพลาดทางเทคนิค: ${err.message}`);
    } finally {
      setSendingEmailId(null);
    }
  };

  const downloadExcel = () => {
    const ws_data: (string | number)[][] = [
      ['รายงานสรุปบัญชีเงินเดือน (Payroll Summary)'],
      [`ประจำเดือน: ${selectedMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}  |  รอบวิก: ${selectedPeriod === 1 ? '1 - 15' : '16 - สิ้นเดือน'}`],
      [],
      ['ลำดับ', 'ชื่อ-สกุล', 'ตำแหน่ง', 'ฐานเงินเดือนงวดนี้', 'รายรับพิเศษ', 'เบิกล่วงหน้า', 'รายจ่ายอื่นๆ', 'ยอดเงินสุทธิ', 'ธนาคาร', 'เลขที่บัญชี', 'ชื่อบัญชี', 'สถานะ']
    ];
    
    let totalBase = 0;
    let totalIncome = 0;
    let totalAdvances = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    payrollData.forEach((data, index) => {
      totalBase += data.baseSalary;
      totalIncome += data.customIncome;
      totalAdvances += data.advances;
      totalDeductions += data.customDeductions;
      totalNet += data.netSalary;

      ws_data.push([
        index + 1,
        data.name,
        data.role === 'ADMIN' ? 'Admin' : 'Staff',
        data.baseSalary,
        data.customIncome,
        data.advances,
        data.customDeductions,
        data.netSalary,
        data.bankAccount?.bankName || '-',
        data.bankAccount?.accountNumber || '-',
        data.bankAccount?.accountName || '-',
        data.status === 'PAID' ? 'จ่ายแล้ว' : 'รอดำเนินการ'
      ]);
    });

    ws_data.push([]);
    ws_data.push(['', '', 'รวมทั้งสิ้น (Total)', totalBase, totalIncome, totalAdvances, totalDeductions, totalNet, '', '', '', '']);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Add column widths
    ws['!cols'] = [
      { wch: 5 },  // ลำดับ
      { wch: 25 }, // ชื่อ-สกุล
      { wch: 15 }, // ตำแหน่ง
      { wch: 15 }, // ฐานเงินเดือน
      { wch: 12 }, // รายรับพิเศษ
      { wch: 12 }, // เบิกล่วงหน้า
      { wch: 12 }, // รายจ่ายอื่นๆ
      { wch: 15 }, // ยอดสุทธิ
      { wch: 15 }, // ธนาคาร
      { wch: 20 }, // เลขบัญชี
      { wch: 25 }, // ชื่อบัญชี
      { wch: 15 }  // สถานะ
    ];
    
    // Merge title cells
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll Summary");
    XLSX.writeFile(wb, `Payroll_Summary_${selectedMonth.getFullYear()}_${selectedMonth.getMonth() + 1}_Period${selectedPeriod}.xlsx`);
    showAlert('ดาวน์โหลดไฟล์ Excel สำเร็จ');
  };

  const [printTarget, setPrintTarget] = useState<typeof payrollData[0] | null>(null);

  const downloadPDF = async (data: typeof payrollData[0]) => {
    setPrintTarget(data);
    
    // Allow React time to render the hidden print template
    setTimeout(async () => {
      const element = document.getElementById('payslip-print-template');
      if (!element) {
        setPrintTarget(null);
        return;
      }
      
      try {
        const imgData = await toPng(element, { cacheBust: true, pixelRatio: 2 });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
        pdf.save(`Payslip_${data.name.replace(/\s+/g, '_')}_${selectedMonth.getFullYear()}_${selectedMonth.getMonth() + 1}_Period${selectedPeriod}.pdf`);
        showAlert('ดาวน์โหลดสลิปสำเร็จ');
      } catch (e) {
        console.error(e);
        showAlert('เกิดข้อผิดพลาดในการสร้างสลิป PDF');
      } finally {
        setPrintTarget(null);
      }
    }, 200);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 bg-slate-50 dark:bg-white/5 backdrop-blur-md rounded-full shadow-sm border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Calculator className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAdmin ? 'ภาพรวมเงินเดือน (Admin)' : 'สลิปเงินเดือนของฉัน'}
            </h2>
          </div>
        </div>
      </div>

      <div className="mb-6 bg-white dark:bg-[#1a2f3a] p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-500 dark:text-white/50 mb-2 ml-1">รอบเดือน</label>
          <select 
            value={selectedMonth.toISOString()}
            onChange={(e) => setSelectedMonth(new Date(e.target.value))}
            className="w-full p-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all font-bold appearance-none shadow-sm"
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
          >
            {monthOptions.map((date, idx) => (
              <option key={idx} value={date.toISOString()}>
                {date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-slate-500 dark:text-white/50 mb-2 ml-1">วิก (งวดการจ่าย)</label>
          <div className="grid grid-cols-2 gap-3">
            <button
               onClick={() => setSelectedPeriod(1)}
               className={`p-4 rounded-2xl font-bold transition-all border ${selectedPeriod === 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 shadow-inner' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-black/20 dark:text-white/60 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-black/40'}`}
            >
              วันที่ 1 - 15
            </button>
            <button
               onClick={() => setSelectedPeriod(2)}
               className={`p-4 rounded-2xl font-bold transition-all border ${selectedPeriod === 2 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 shadow-inner' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-black/20 dark:text-white/60 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-black/40'}`}
            >
              วันที่ 16 - สิ้นเดือน
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20"><div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div></div>
      ) : (
        <div className="space-y-6">
          
          {/* Executive Summary Dashboard (Only for ADMIN) */}
          {isAdmin && (
             <div className="bg-emerald-600 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Wallet className="w-40 h-40" />
                </div>
                
                <h3 className="text-emerald-100 font-medium mb-6 flex items-center gap-2">
                   <Banknote className="w-5 h-5" /> 
                   ภาพรวมค่าใช้จ่ายเงินเดือน (งวดที่ {selectedPeriod})
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                      <p className="text-emerald-100 text-xs mb-1">ฐานเงินเดือนรวม</p>
                      <p className="text-xl font-bold">฿{globalBaseSalary.toLocaleString()}</p>
                   </div>
                   <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                      <p className="text-emerald-100 text-xs mb-1">หักยอดเบิกล่วงหน้า</p>
                      <p className="text-xl font-bold flex items-center gap-1">
                        <TrendingDown className="w-4 h-4 text-emerald-200" />
                        {globalAdvances.toLocaleString()}
                      </p>
                   </div>
                   {(globalCustomIncome > 0 || globalCustomDeductions > 0) && (
                     <>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                          <p className="text-emerald-100 text-xs mb-1">รายรับพิเศษรวม</p>
                          <p className="text-lg font-bold flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-emerald-200" />
                            {globalCustomIncome.toLocaleString()}
                          </p>
                       </div>
                       <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                          <p className="text-emerald-100 text-xs mb-1">หักรายจ่ายรวม</p>
                          <p className="text-lg font-bold flex items-center gap-1">
                            <TrendingDown className="w-4 h-4 text-emerald-200" />
                            {globalCustomDeductions.toLocaleString()}
                          </p>
                       </div>
                     </>
                   )}
                </div>
                
                <div className="pt-5 border-t border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                   <div>
                     <p className="text-emerald-100 text-sm mb-1">ยอดจ่ายสุทธิรวมทั้งฟาร์ม (Total Net)</p>
                     <p className="text-4xl font-black tracking-tight">฿{globalNetSalary.toLocaleString()}</p>
                   </div>
                   <button 
                     onClick={downloadExcel}
                     className="flex items-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 px-5 py-3 rounded-2xl font-bold tracking-tight shadow-sm transition-colors active:scale-95"
                   >
                     <FileText className="w-5 h-5" /> ส่งออกรายงาน (Excel)
                   </button>
                </div>
             </div>
          )}

          <div>
             <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 px-1">
               {isAdmin ? 'สลิปเงินเดือนรายบุคคล (Payslips)' : 'เอกสารสลิปเงินเดือนของคุณ'}
             </h3>
             <div className="space-y-5">
               {payrollData.length > 0 ? payrollData.map(data => (
                 <div id={`payslip-${data.uid}`} key={data.uid} className={`bg-white dark:bg-[#1a2f3a] rounded-[2rem] p-5 shadow-sm border-2 ${data.status === 'PAID' ? 'border-emerald-500/30' : 'border-slate-200 dark:border-white/10'} relative overflow-hidden transition-all delay-75`}>
                   
                   {/* Status Badge Indicator */}
                   <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-[1.5rem] text-xs font-black flex items-center gap-1 ${data.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                      {data.status === 'PAID' ? <><CheckCircle2 className="w-3.5 h-3.5" /> จ่ายแล้ว</> : <><AlertCircle className="w-3.5 h-3.5" /> รอดำเนินการ</>}
                   </div>
                   
                   <div className="mb-5 pt-3">
                     <div className="flex items-start justify-between mb-3 gap-2">
                       <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                         <Receipt className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                         <span className="line-clamp-1">{data.name}</span>
                       </h3>
                       <div className="flex items-center gap-2 no-print shrink-0">
                         {isAdmin && (
                           <button 
                             onClick={() => sendPayslipEmail(data)}
                             disabled={sendingEmailId === data.uid}
                             className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:bg-emerald-100/50 disabled:text-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                             title="ส่งสลิปนี้เข้าอีเมลพนักงาน"
                           >
                             <Mail className={`w-4 h-4 ${sendingEmailId === data.uid ? 'animate-spin' : ''}`} />
                             <span>{sendingEmailId === data.uid ? 'กำลังส่ง...' : 'ส่งสลิปเข้าเมล'}</span>
                           </button>
                         )}
                         <button 
                           onClick={() => downloadPDF(data)}
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                         >
                           <Download className="w-4 h-4" /> <span className="hidden sm:inline">บันทึก</span> PDF
                         </button>
                       </div>
                     </div>
                     {isAdmin && (
                        <div className="bg-slate-50 dark:bg-black/20 rounded-xl p-3 border border-slate-100 dark:border-white/5 flex items-start gap-3">
                           <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg shrink-0">
                             <CreditCard className="w-5 h-5" />
                           </div>
                           <div className="flex-1">
                             {data.bankAccount?.accountNumber ? (
                               <>
                                 <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                   {data.bankAccount.bankName}
                                   <button 
                                     onClick={() => navigator.clipboard.writeText(data.bankAccount?.accountNumber || '')}
                                     className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-colors"
                                     title="คัดลอกเลขบัญชี"
                                   >
                                     <Copy className="w-3.5 h-3.5" />
                                   </button>
                                 </p>
                                 <p className="text-xs text-slate-500 dark:text-white/60 font-mono my-0.5">{data.bankAccount.accountNumber}</p>
                                 <p className="text-xs text-slate-500 dark:text-white/60 uppercase">{data.bankAccount.accountName}</p>
                               </>
                             ) : (
                               <p className="text-sm text-slate-500 dark:text-white/50 italic py-1">ยังไม่ระบุข้อมูลบัญชี</p>
                             )}
                           </div>
                        </div>
                     )}
                   </div>
                   
                   {/* Ledger Area */}
                   <div className="bg-slate-50 dark:bg-black/20 rounded-2xl p-5 border border-slate-100 dark:border-white/5">
                     <div className="space-y-3">
                       <div className="flex justify-between items-center text-sm pb-3 border-b border-slate-200/50 dark:border-white/5">
                         <span className="text-slate-500 dark:text-white/60 font-medium">ฐานเงินเดือนต่องวด (50%)</span>
                         <span className="font-bold text-slate-900 dark:text-white">฿{data.baseSalary.toLocaleString()}</span>
                       </div>
                       
                       <div className="flex flex-col gap-2 pt-1 border-b border-slate-200/50 dark:border-white/5 pb-3">
                         <div className="flex justify-between items-center text-sm">
                           <span className="text-slate-500 dark:text-white/60 font-medium flex items-center gap-1">หัก: เบิกล่วงหน้า <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-2 py-0.5 rounded-full">อนุมัติแล้ว</span></span>
                           <span className="font-bold text-rose-500">- ฿{data.advances.toLocaleString()}</span>
                         </div>
                         {data.advancesList.length > 0 && (
                           <div className="space-y-1 mt-1 pl-4 border-l-2 border-rose-200 dark:border-rose-900/50">
                             {data.advancesList.map(adv => {
                               const parts = adv.date.split('-');
                               const dispDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : adv.date;
                               return (
                                 <div key={adv.id} className="flex justify-between items-center text-xs text-slate-500 dark:text-white/50">
                                   <span>{dispDate}</span>
                                   <span>฿{adv.amount.toLocaleString()}</span>
                                 </div>
                               );
                             })}
                           </div>
                         )}
                       </div>

                       {(data.customIncome > 0 || data.customDeductions > 0 || editingSlipId === data.uid) && (
                         <div className="pt-1 pb-2 space-y-2">
                           <div className="flex justify-between items-center text-sm">
                             <span className="text-slate-500 dark:text-white/60 font-medium">บวก: รายรับพิเศษ / โบนัส</span>
                             {editingSlipId === data.uid ? (
                                <input 
                                  type="number" 
                                  value={editIncome} 
                                  onChange={e => setEditIncome(Number(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 bg-white dark:bg-[#1a2f3a] border border-slate-200 dark:border-white/10 rounded-lg text-right font-bold text-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                             ) : (
                               <span className="font-bold text-emerald-600">+ ฿{data.customIncome.toLocaleString()}</span>
                             )}
                           </div>
                           <div className="flex justify-between items-center text-sm">
                             <span className="text-slate-500 dark:text-white/60 font-medium">หัก: รายจ่ายอื่นๆ</span>
                             {editingSlipId === data.uid ? (
                                <input 
                                  type="number" 
                                  value={editDeduction} 
                                  onChange={e => setEditDeduction(Number(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 bg-white dark:bg-[#1a2f3a] border border-slate-200 dark:border-white/10 rounded-lg text-right font-bold text-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                                />
                             ) : (
                               <span className="font-bold text-rose-500">- ฿{data.customDeductions.toLocaleString()}</span>
                             )}
                           </div>
                         </div>
                       )}
                     </div>

                     <div className="flex justify-between items-end border-t-2 border-slate-200 dark:border-white/10 pt-4 mt-2">
                       <p className="text-sm font-bold text-slate-700 dark:text-white/70">ยอดรับสุทธิ (Net Salary)</p>
                       <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                         ฿{editingSlipId === data.uid ? Math.max(0, data.baseSalary + editIncome - data.advances - editDeduction).toLocaleString() : data.netSalary.toLocaleString()}
                       </p>
                     </div>
                   </div>

                   {/* Admin Controls */}
                   {isAdmin && (
                     <div className="mt-4 flex flex-col sm:flex-row gap-3 no-print">
                       {editingSlipId === data.uid ? (
                         <>
                           <button 
                             onClick={() => handleSaveAdjustments(data)}
                             className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
                           >
                             บันทึกการปรับปรุง
                           </button>
                           <button 
                             onClick={() => setEditingSlipId(null)}
                             className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white/70 rounded-xl font-bold transition-all"
                           >
                             ยกเลิก
                           </button>
                         </>
                       ) : (
                         <>
                           <button 
                             onClick={() => {
                               setEditingSlipId(data.uid);
                               setEditIncome(data.customIncome);
                               setEditDeduction(data.customDeductions);
                             }}
                             className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 rounded-xl font-bold transition-all border border-slate-200 dark:border-white/10"
                           >
                             <Settings2 className="w-4 h-4" /> ปรับปรุงตัวเลข (รับ/หักเพิ่มเติม)
                           </button>
                           <button 
                             onClick={() => {
                               if (data.status === 'PAID') {
                                 handleToggleStatus(data);
                               } else {
                                 setSelectedPayrollItem(data);
                                 setUploadedSlip(null);
                               }
                             }}
                             className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all shadow-sm ${data.status === 'PAID' ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-900/60' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                           >
                             {data.status === 'PAID' ? 'ยกเลิกการจ่าย' : 'ตรวจสอบทำจ่าย'}
                           </button>
                         </>
                       )}
                     </div>
                   )}
                 </div>
               )) : (
                 <div className="text-center p-8 bg-white dark:bg-[#1a2f3a] rounded-[3rem] border border-slate-200 dark:border-white/10 shadow-sm">
                   <Receipt className="w-12 h-12 text-slate-300 dark:text-white/20 mx-auto mb-3" />
                   <p className="text-slate-500 dark:text-white/50 font-medium">ไม่พบข้อมูลพนักงานในระบบ</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Payslip Template */}
      {printTarget && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
           <div id="payslip-print-template" className="bg-white text-black p-10 w-[800px] font-sans">
             <div className="text-center mb-6 border-b-4 border-gray-800 pb-4">
               <h1 className="text-3xl font-black mb-2">สลิปเงินเดือน (Payslip)</h1>
               <p className="text-xl">ประจำเดือน {selectedMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })} (งวดที่ {selectedPeriod})</p>
             </div>
             
             <div className="flex justify-between mb-8 text-lg">
               <div>
                 <p className="mb-2"><span className="font-bold">รหัสพนักงาน/UID:</span> {printTarget.uid.slice(0, 8)}</p>
                 <p><span className="font-bold">ชื่อ-สกุล:</span> {printTarget.name}</p>
               </div>
               <div className="text-right">
                 <p className="mb-2"><span className="font-bold">วันที่พิมพ์:</span> {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                 <p><span className="font-bold">ตำแหน่ง:</span> {printTarget.role === 'ADMIN' ? 'Admin' : 'Staff'}</p>
               </div>
             </div>
             
             <div className="flex border-2 border-gray-800 rounded-lg overflow-hidden text-lg">
               <div className="w-1/2 border-r-2 border-gray-800">
                 <div className="bg-gray-100 font-bold p-3 border-b-2 border-gray-800 text-center">รายได้ (Earnings)</div>
                 <div className="p-4 space-y-3 min-h-[200px]">
                   <div className="flex justify-between">
                     <span>เงินเดือนพื้นฐาน (ต่องวด)</span>
                     <span>{printTarget.baseSalary.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                   </div>
                   {printTarget.customIncome > 0 && (
                     <div className="flex justify-between">
                       <span>รายรับพิเศษ / โบนัส</span>
                       <span>{printTarget.customIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                     </div>
                   )}
                 </div>
                 <div className="bg-gray-50 p-3 flex justify-between font-bold border-t-2 border-gray-800">
                   <span>รวมรายได้</span>
                   <span>{(printTarget.baseSalary + printTarget.customIncome).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                 </div>
               </div>
               
               <div className="w-1/2">
                 <div className="bg-gray-100 font-bold p-3 border-b-2 border-gray-800 text-center">รายการหัก (Deductions)</div>
                 <div className="p-4 space-y-3 min-h-[200px]">
                    {printTarget.advancesList && printTarget.advancesList.length > 0 ? (
                      printTarget.advancesList.map((adv, idx) => {
                        const parts = adv.date.split('-');
                        const dispDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : adv.date;
                        return (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>เบิกล่วงหน้า ({dispDate})</span>
                            <span>{adv.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                          </div>
                        );
                      })
                    ) : (
                      printTarget.advances > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>เบิกล่วงหน้า</span>
                          <span>{printTarget.advances.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )
                    )}
                    {printTarget.customDeductions > 0 && (
                       <div className="flex justify-between">
                         <span>หักอื่นๆ</span>
                         <span>{printTarget.customDeductions.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                       </div>
                    )}
                 </div>
                 <div className="bg-gray-50 p-3 flex justify-between font-bold border-t-2 border-gray-800">
                   <span>รวมรายการหัก</span>
                   <span>{(printTarget.advances + printTarget.customDeductions).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                 </div>
               </div>
             </div>
             
             <div className="mt-6 border-2 border-gray-800 rounded-lg bg-gray-100 p-4 flex justify-between items-center">
               <div className="text-xl font-bold">เงินสุทธิทรับ (Net Salary)</div>
               <div className="text-3xl font-black">฿ {printTarget.netSalary.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
             </div>
             
             <div className="mt-12 border-t-2 border-gray-300 pt-8 flex justify-between px-10 text-center">
                 <div>
                   <div className="w-48 border-b-2 border-gray-400 mb-2 h-10"></div>
                   <p className="text-lg mt-2">( ............................................................ )</p>
                   <p className="mt-1 font-bold">ผู้จ่ายเงิน</p>
                 </div>
                 <div>
                   <div className="w-48 border-b-2 border-gray-400 mb-2 h-10"></div>
                   <p className="text-lg mt-2">( ............................................................ )</p>
                   <p className="mt-1 font-bold">ผู้รับเงิน</p>
                 </div>
             </div>
           </div>
        </div>
      )}

      {/* Prepare Payroll Payment Modal */}
      {selectedPayrollItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-[#1a2f3a] w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl border border-slate-200 dark:border-white/10 relative my-8 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedPayrollItem(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 dark:text-white/50 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">ยืนยันข้อมูลและโอนเงินเดือน</h3>
            </div>

            <div className="space-y-4">
              {/* Payment Details Card */}
              <div className="bg-slate-50 dark:bg-black/20 p-5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-sm text-slate-500 dark:text-white/60">ชื่อพนักงาน:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedPayrollItem.name}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-sm text-slate-500 dark:text-white/60">ชื่อธนาคาร:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedPayrollItem.bankAccount?.bankName || 'ยังไม่ได้ระบุธนาคาร'}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-sm text-slate-500 dark:text-white/60">ชื่อบัญชี:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedPayrollItem.bankAccount?.accountName || selectedPayrollItem.name}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                  <span className="text-sm text-slate-500 dark:text-white/60">เลขที่บัญชี:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                      {selectedPayrollItem.bankAccount?.accountNumber || 'ยังไม่ได้ระบุเลขที่บัญชี'}
                    </span>
                    {selectedPayrollItem.bankAccount?.accountNumber && (
                      <button 
                        onClick={() => handleCopyText(selectedPayrollItem.bankAccount!.accountNumber)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all active:scale-90"
                        title="คัดลอกเลขที่บัญชี"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm text-slate-500 dark:text-white/60 font-medium">ยอดเงินสุทธิคงเหลือ:</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">฿{selectedPayrollItem.netSalary.toLocaleString()}</span>
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
                    className="border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-black/10 flex flex-col items-center justify-center group relative"
                  >
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-white/80 group-hover:text-emerald-500 transition-colors">
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
                  onClick={() => setSelectedPayrollItem(null)}
                  disabled={isPaying}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 font-bold rounded-2xl transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={() => handleConfirmPayrollPayment(selectedPayrollItem, uploadedSlip!)}
                  disabled={!uploadedSlip || isPaying}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-white/5 dark:disabled:text-white/20 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15"
                >
                  {isPaying ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5" /> ยืนยันการจ่ายเงินสำเร็จ</>
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
