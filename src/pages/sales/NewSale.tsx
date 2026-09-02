import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, List as ListIcon, LayoutGrid, CheckCircle2, AlertCircle, X, Printer, Download, Cloud, Share2, Camera, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { savePigSale, getRecentBuyers } from '../../services/saleService';
import { WeighingRecord } from '../../types';
import SignaturePad from '../../components/SignaturePad';
import clsx from 'clsx';
import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';
import { optimizeImage } from '../../services/imageOptimizer';

const DRAFT_KEY = 'pig_sale_draft';

export default function NewSale() {
  const navigate = useNavigate();
  const { user, userProfile, googleAccessToken, setGoogleAccessToken, connectGoogleDrive } = useAuth();
  const { showAlert, showConfirm, showSuccess, showError, showLoading, hideLoading } = useBottomSheet();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    saleId: `PS-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000)}`,
    buyerName: '',
    buyerEmail: '',
    vehicleReg: '',
    saleType: 'ขายเหมา',
    paymentStatus: 'UNPAID' as 'PAID' | 'UNPAID',
    totalPigs: '',
    pricePerKg: '',
    deductions: ''
  });

  const [records, setRecords] = useState<WeighingRecord[]>([
    { id: Date.now().toString(), index: 1, grossWeight: '', tareWeight: '', netWeight: 0 }
  ]);
  const [signature, setSignature] = useState('');
  const [deliveryPhoto, setDeliveryPhoto] = useState('');
  
  const [viewType, setViewType] = useState<'CARD' | 'TABLE'>('CARD');
  const [isSaving, setIsSaving] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveFileUrl, setDriveFileUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [recentBuyers, setRecentBuyers] = useState<{name: string, email: string, vehicleReg: string}[]>([]);

  // Focus ref array for speed entry
  const grossRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load recent buyers
  useEffect(() => {
    getRecentBuyers().then(buyers => setRecentBuyers(buyers));
  }, []);

  // Crash Recovery
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      showConfirm(
        "พบข้อมูลชั่งหมูค้างไว้ในระบบ ต้องการทำรายการต่อหรือไม่? \n(กดยกเลิกเพื่อล้างข้อมูล)",
        () => {
          try {
            const parsed = JSON.parse(draft);
            if (parsed.formData) setFormData(parsed.formData);
            if (parsed.records) setRecords(parsed.records);
          } catch(e) {}
        },
        "กู้คืนข้อมูลร่าง",
        () => {
          localStorage.removeItem(DRAFT_KEY);
        }
      );
    }
  }, []); // Only run once on mount

  // Auto-Save Draft
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, records }));
  }, [formData, records]);

  // Anti-Data Loss (Before Unload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (records.length > 0 && records[0].grossWeight !== '') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [records]);

  const generatePdfBlob = async (): Promise<Blob | null> => {
    const element = document.getElementById('printable-receipt');
    if (!element) {
      showAlert("ไม่พบหน้าต่างรายงานที่ต้องการสร้าง PDF กรุณาลองใหม่อีกครั้งครับ");
      return null;
    }
    
    try {
      // Temporarily set styling to avoid scrollbar capture
      const originalStyle = element.style.cssText;
      element.style.maxHeight = 'none';
      element.style.overflow = 'visible';
      
      const dataUrl = await htmlToImage.toPng(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 2, // High resolution for professional print
        style: {
          transform: 'scale(1)',
          borderRadius: '0',
          boxShadow: 'none'
        }
      });
      
      element.style.cssText = originalStyle;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate aspect ratio to fit page width
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const imgWidth = img.width;
      const imgHeight = img.height;
      const ratio = imgHeight / imgWidth;
      
      // Leave 20px padding left and right
      const padding = 20;
      const displayWidth = pdfWidth - (padding * 2);
      const displayHeight = displayWidth * ratio;
      
      pdf.addImage(dataUrl, 'PNG', padding, padding, displayWidth, displayHeight);
      return pdf.output('blob');
    } catch (error: any) {
      console.error("PDF generation error: ", error);
      showAlert(`ไม่สามารถสร้าง PDF ได้เนื่องจาก: ${error.message || error}`);
      return null;
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const blob = await generatePdfBlob();
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `รายงานการชั่งนํ้าหนัก_${formData.buyerName || 'ลูกค้า'}_${formData.saleId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showAlert("เกิดข้อผิดพลาดในการดาวน์โหลด PDF: " + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveToDrive = async () => {
    setIsUploadingToDrive(true);
    showLoading('กำลังสื่อสารกับระบบรักษาความปลอดภัยบัญชี Google...', 'กำลังอัปโหลดโครงสร้าง');
    try {
      let token = googleAccessToken;
      if (!token) {
        token = await connectGoogleDrive();
      }
      if (!token) {
        setIsUploadingToDrive(false);
        hideLoading();
        return;
      }

      showLoading('กำลังเปลี่ยนรูปแบบเอกสารให้เป็นไฟล์รายงาน PDF...', 'กำลังเตรียมข้อมูล');
      const blob = await generatePdfBlob();
      if (!blob) {
        setIsUploadingToDrive(false);
        hideLoading();
        return;
      }

      showLoading('กำลังอัปโหลดรายงานการชั่งน้ำหนักหมูเข้าคลาวด์ Google Drive...', 'กำลังอัปโหลดข้อมูล');
      const filename = `NiponFarm_Receipt_${formData.buyerName || 'Customer'}_${formData.saleId}.pdf`;
      const metadata = {
        name: filename,
        mimeType: 'application/pdf',
        description: `รายงานสรุปการชั่งนํ้าหนักหมู นิพนธ์ฟาร์ม (Nipon Farm) ลูกค้า: ${formData.buyerName} ยอดเงินสุทธิ: ${netTotal} บาท`
      };

      const boundary = 'nipon_farm_multipart_boundary';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      const metadataPart = 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata);
      const arrayBuffer = await blob.arrayBuffer();
      
      const multipartBody = new Blob([
        delimiter,
        metadataPart,
        delimiter,
        'Content-Type: application/pdf\r\n\r\n',
        arrayBuffer,
        close_delim
      ], { type: `multipart/related; boundary=${boundary}` });

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,alternateLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      });

      if (!response.ok) {
        if (response.status === 401) {
          setGoogleAccessToken(null);
          hideLoading();
          showError("เซสชัน Google Drive สิ้นสุดลงแล้ว กรุณากดปุ่มเซฟใหม่อีกครั้งเพื่อเชื่อมโยงบัญชีใหม่ครับ", "ไม่ได้รับสิทธิ์เข้าใช้งาน");
          setIsUploadingToDrive(false);
          return;
        }
        const errText = await response.text();
        throw new Error(`Drive Upload API Error: ${response.status} - ${errText}`);
      }

      const fileData = await response.json();
      const fileId = fileData.id;
      const webViewLink = fileData.webViewLink;

      // Make file public to anyone with link (read-only) so they can share it seamlessly to LINE
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
          })
        });
      } catch (errPermission) {
        console.warn("Setting sharing permissions failed", errPermission);
      }

      setDriveFileUrl(webViewLink);
      hideLoading();
      showSuccess(`อัปโหลดใบเสร็จรายงานการชั่งนํ้าหนักลงใน Google Drive สำเร็จแล้วครับ!\nชื่อไฟล์: "${filename}"\nระบบได้เปิดให้อ่านไฟล์เพื่อให้แชร์ข้ามแอป LINE ได้สะดวกแล้วครับ`, "อัปโหลดสำเร็จ");
    } catch (err: any) {
      hideLoading();
      console.error(err);
      showError(`อัปโหลดไฟล์ไปที่ Google Drive ไม่สำเร็จ: ${err.message || err}`, "เกิดความผิดพลาด");
    } finally {
      setIsUploadingToDrive(false);
      hideLoading();
    }
  };

  const handleShareToLine = () => {
    let text = `🐷 *รายงานการชั่งน้ำหนักหมู - นิพนธ์ฟาร์ม (Nipon Farm)*\n`;
    text += `------------------------------------------\n`;
    text += `📝 เลขที่เอกสาร: ${formData.saleId}\n`;
    text += `📅 วันที่: ${formData.date}\n`;
    text += `👤 ผู้ซื้อ: ${formData.buyerName}\n`;
    if (formData.vehicleReg) text += `🚚 ทะเบียนรถ: ${formData.vehicleReg}\n`;
    text += `------------------------------------------\n`;
    text += `🔹 จำนวนสุกร: ${totalPigsNum} ตัว\n`;
    text += `🔹 น้ำหนักสุทธิรวม: ${totalNetWeight.toFixed(1)} กก.\n`;
    text += `🔹 ราคาเฉลี่ยต่อตัว: ${averageWeight.toFixed(2)} กก./ตัว\n`;
    text += `🔹 ราคาต่อกิโลกรัม: ฿${Number(formData.pricePerKg || 0).toFixed(2)} บาท/กก.\n`;
    if (Number(formData.deductions || 0) > 0) {
      text += `🔸 หักค่าใช้จ่าย/ส่วนลด: -฿${Number(formData.deductions).toLocaleString()} บาท\n`;
    }
    text += `💰 ยอดเงินรับสุทธิ: ฿${netTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} บาท\n`;
    text += `------------------------------------------\n`;
    
    if (driveFileUrl) {
      text += `📂 ลิงก์ดาวน์โหลดเอกสาร PDF (Google Drive):\n${driveFileUrl}\n`;
    } else {
      text += `(พิมพ์และสร้างรายงาน PDF ได้จากในระบบแอปพลิเคชันนิพนธ์ฟาร์มครับ)\n`;
    }
    
    const lineUrl = `https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(text)}`;
    window.open(lineUrl, '_blank');
  };

  const calculateNet = (gross: number | '', tare: number | '') => {
    const g = Number(gross) || 0;
    const t = Number(tare) || 0;
    return Math.max(0, g - t);
  };

  const updateRecord = (index: number, field: keyof WeighingRecord, value: number | string) => {
    const newRecords = [...records];
    newRecords[index] = { ...newRecords[index], [field]: value };
    newRecords[index].netWeight = calculateNet(newRecords[index].grossWeight, newRecords[index].tareWeight);
    setRecords(newRecords);
  };

  const addNewRecord = (triggerIndex: number) => {
    // If the triggered index is valid, copy its tare weight, otherwise default to top
    const prevTare: number | "" = records[triggerIndex]?.tareWeight !== undefined ? records[triggerIndex].tareWeight : (records[0]?.tareWeight !== undefined ? records[0].tareWeight : "");
    
    const defaultGross: number | "" = "";
    const netVal = 0;

    setRecords(prev => [
      { id: Date.now().toString(), index: prev.length + 1, grossWeight: defaultGross, tareWeight: prevTare, netWeight: netVal },
      ...prev
    ]);
    // Focus the newest input (which will be at index 0 because we prepend)
    setTimeout(() => {
      const nextInput = grossRefs.current[0];
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNewRecord(index);
    }
  };

  const totalNetWeight = records.reduce((sum, r) => sum + r.netWeight, 0);
  const totalPigsNum = Number(formData.totalPigs) || records.length; // fallback
  const averageWeight = totalPigsNum > 0 ? (totalNetWeight / totalPigsNum) : 0;
  const grossTotal = totalNetWeight * (Number(formData.pricePerKg) || 0);
  const netTotal = grossTotal - (Number(formData.deductions) || 0);

  const handleSubmit = async () => {
    if (!formData.buyerName || !formData.date || !formData.pricePerKg) {
      showAlert('กรุณากรอกข้อมูล ผู้ซื้อ และ ราคาต่อกิโลกรัม ให้ครบถ้วน');
      return;
    }
    if (!signature) {
      showAlert('กรุณาเซ็นชื่อผู้รับหมูก่อนบันทึกรายการ');
      return;
    }

    setIsSaving(true);
    showLoading('กำลังบันทึกข้อมูลการขายและหลักฐานการจัดส่ง...', 'กำลังบันทึกข้อมูล');
    try {
      let finalDeliveryPhotoUrl = '';
      if (deliveryPhoto && deliveryPhoto.startsWith('data:image')) {
        try {
          const { uploadOptimizedImage } = await import('../../services/imageOptimizer');
          // uploadOptimizedImage will handle gateway upload with Firebase Storage fallback
          finalDeliveryPhotoUrl = await uploadOptimizedImage(deliveryPhoto, `sales/${user?.uid || 'anonymous'}/${formData.saleId}.webp`);
        } catch (err) {
          console.error("Centralized upload for delivery photo failed:", err);
          finalDeliveryPhotoUrl = deliveryPhoto; // Fallback to raw base64 if upload fails completely
        }
      }

      // Keep signature clean & optimized
      let optimizedSignature = signature;
      try {
        const { optimizeImage } = await import('../../services/imageOptimizer');
        const signatureOptimized = await optimizeImage(signature, { type: 'signature' });
        optimizedSignature = signatureOptimized.dataUrl;
      } catch (err) {
        console.warn("Failed to optimize signature image, saving raw:", err);
      }

      const payload = {
        ...formData,
        paymentStatus: formData.paymentStatus,
        totalPigs: totalPigsNum,
        pricePerKg: Number(formData.pricePerKg),
        deductions: Number(formData.deductions),
        records,
        totalNetWeight,
        averageWeight,
        grossTotal,
        netTotal,
        signature: optimizedSignature,
        deliveryPhoto: finalDeliveryPhotoUrl
      };
      
      const resultId = await savePigSale(payload, userProfile?.displayName || user?.email || 'พนักงาน');
      hideLoading();
      if (resultId) {
        localStorage.removeItem(DRAFT_KEY);
        showSuccess('แก้ไขและบันทึกข้อมูลการขายหมูเรียบร้อยแล้วครับ', 'สำเร็จ');
        navigate('/sales');
      } else {
        throw new Error('บันทึกไม่สำเร็จ');
      }
    } catch (error: any) {
      hideLoading();
      console.error('Error saving sale:', error);
      showError(error.message || 'บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต', 'เกิดข้อผิดพลาด');
    } finally {
      setIsSaving(false);
      hideLoading();
    }
  };

  const nextStep = () => {
    if (step === 1 && !formData.buyerName) {
      showAlert('กรุณากรอกชื่อผู้ซื้อ');
      return;
    }
    if (step === 2 && records.length === 0) {
      showAlert('กรุณาชั่งน้ำหนักอย่างน้อย 1 ครั้ง');
      return;
    }
    setStep(s => Math.min(3, s + 1));
  };
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  return (
    <div className="max-w-4xl mx-auto pb-32 animate-in fade-in duration-300 w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/sales')} className="w-10 h-10 bg-white dark:bg-white/10 rounded-full flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide flex-1">บันทึกการขาย</h2>
      </div>

      {/* Stepper */}
      <div className="mb-10 flex justify-between relative max-w-xl mx-auto px-4">
         <div className="absolute top-[35%] left-10 right-10 h-0.5 bg-white dark:bg-white/10 -z-10"></div>
         <div className="flex flex-col items-center px-2">
            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors", step >= 1 ? 'border-[#00bcd4] text-[#00bcd4] bg-[#00bcd4]/10 shadow-[0_0_15px_rgba(0,188,212,0.3)]' : 'border-slate-200 dark:border-white/20 text-slate-600 dark:text-white/40 bg-white dark:bg-[#0a2e36]')}>1</div>
            <span className={clsx("text-xs mt-2 font-medium tracking-wide", step >= 1 ? 'text-[#00bcd4]' : 'text-slate-600 dark:text-white/40')}>ข้อมูล</span>
         </div>
         <div className="flex flex-col items-center px-2">
            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors", step >= 2 ? 'border-[#00bcd4] text-[#00bcd4] bg-[#00bcd4]/10 shadow-[0_0_15px_rgba(0,188,212,0.3)]' : 'border-slate-200 dark:border-white/20 text-slate-600 dark:text-white/40 bg-white dark:bg-[#0a2e36]')}>2</div>
            <span className={clsx("text-xs mt-2 font-medium tracking-wide", step >= 2 ? 'text-[#00bcd4]' : 'text-slate-600 dark:text-white/40')}>ชั่งน้ำหนัก</span>
         </div>
         <div className="flex flex-col items-center px-2">
            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors", step >= 3 ? 'border-[#00bcd4] text-[#00bcd4] bg-[#00bcd4]/10 shadow-[0_0_15px_rgba(0,188,212,0.3)]' : 'border-slate-200 dark:border-white/20 text-slate-600 dark:text-white/40 bg-white dark:bg-[#0a2e36]')}>3</div>
            <span className={clsx("text-xs mt-2 font-medium tracking-wide", step >= 3 ? 'text-[#00bcd4]' : 'text-slate-600 dark:text-white/40')}>สรุปยอด</span>
         </div>
      </div>

      <div className="p-4 max-w-xl mx-auto">
        {step === 1 && (
          <div className="bg-white/72 dark:bg-[#12254F]/72 backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-white/10 p-6 sm:p-8 animate-in fade-in slide-in-from-right-4 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">ข้อมูลทั่วไป</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">วันที่ขาย</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-white dark:bg-[#0a2e36] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">ผู้ซื้อ (Buyer)</label>
                  <input 
                    type="text" 
                    placeholder="ระบุชื่อผู้ซื้อ" 
                    list="buyers-list"
                    value={formData.buyerName} 
                    onChange={e => {
                      const val = e.target.value;
                      const matched = recentBuyers.find(b => b.name === val);
                      if (matched) {
                        setFormData({
                          ...formData, 
                          buyerName: val, 
                          buyerEmail: matched.email || formData.buyerEmail, 
                          vehicleReg: matched.vehicleReg || formData.vehicleReg
                        });
                      } else {
                        setFormData({...formData, buyerName: val});
                      }
                    }} 
                    className="w-full bg-white dark:bg-[#0a2e36] text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4]" 
                  />
                  <datalist id="buyers-list">
                    {recentBuyers.map(b => (
                      <option key={b.name} value={b.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">อีเมลผู้ซื้อ (Gmail)</label>
                  <input type="email" placeholder="example@gmail.com" value={formData.buyerEmail} onChange={e => setFormData({...formData, buyerEmail: e.target.value})} className="w-full bg-white dark:bg-[#0a2e36] text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4]" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">ผู้ขาย (Seller)</label>
                  <input type="text" value="นิพนธ์ฟาร์ม" disabled className="w-full bg-white/50 dark:bg-[#0a2e36]/50 text-slate-600 dark:text-white/50 border border-slate-100 dark:border-white/5 rounded-xl px-4 py-3.5 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">ทะเบียนรถ</label>
                  <input type="text" placeholder="ระบุทะเบียนรถ" value={formData.vehicleReg} onChange={e => setFormData({...formData, vehicleReg: e.target.value})} className="w-full bg-white dark:bg-[#0a2e36] text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4]" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">ประเภท</label>
                <div className="w-full bg-white dark:bg-[#0a2e36] border border-slate-200 dark:border-white/10 rounded-xl focus-within:border-[#00bcd4] focus-within:ring-1 focus-within:ring-[#00bcd4] px-4 py-3.5">
                  <select value={formData.saleType} onChange={e => setFormData({...formData, saleType: e.target.value})} className="w-full bg-transparent text-slate-900 dark:text-white focus:outline-none appearance-none">
                    <option value="ขายเหมา" className="bg-white dark:bg-[#0a2e36]">ขายเหมา</option>
                    <option value="ขายชั่งกิโล" className="bg-white dark:bg-[#0a2e36]">ขายชั่งกิโล</option>
                    <option value="หมูปลด" className="bg-white dark:bg-[#0a2e36]">หมูปลด</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <div className="flex justify-between items-center mb-6 px-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">รายการชั่งน้ำหนัก</h3>
              <div className="flex items-center gap-3">
                <div className="flex bg-white dark:bg-[#0a2e36] rounded-xl p-1 border border-slate-200 dark:border-white/10 shadow-inner">
                  <button onClick={() => setViewType('CARD')} className={clsx("p-1.5 rounded-lg transition-colors", viewType === 'CARD' ? 'bg-[#00bcd4]/20 text-[#00bcd4]' : 'text-slate-600 dark:text-white/40')}><ListIcon className="w-5 h-5"/></button>
                  <button onClick={() => setViewType('TABLE')} className={clsx("p-1.5 rounded-lg transition-colors", viewType === 'TABLE' ? 'bg-[#00bcd4]/20 text-[#00bcd4]' : 'text-slate-600 dark:text-white/40')}><LayoutGrid className="w-5 h-5"/></button>
                </div>
                <button onClick={() => addNewRecord(0)} className="bg-[#00bcd4] text-[#061e24] px-4 py-2 rounded-xl font-bold text-sm flex items-center shadow-xl dark:shadow-2xl active:scale-95 transition-transform hover:bg-[#00e5ff]">
                  <span className="text-lg mr-1 leading-none">+</span> เพิ่ม
                </button>
              </div>
            </div>

            {viewType === 'CARD' ? (
              <div className="space-y-4">
                {records.map((r, i) => (
                  <div key={r.id} className="bg-white/72 dark:bg-[#12254F]/72 backdrop-blur-xl p-6 rounded-[2rem] border border-white/60 dark:border-white/10 relative shadow-xl">
                     <div className="flex justify-between items-center mb-5">
                       <span className="bg-black/20 text-[#00bcd4] px-4 py-1.5 rounded-full text-xs font-bold font-mono border border-[#00bcd4]/30 uppercase tracking-wider">ชั่งครั้งที่ {r.index}</span>
                       {records.length > 1 && (
                         <button onClick={() => setRecords(records.filter((_, idx) => idx !== i))} className="p-2 text-slate-600 dark:text-white/30 hover:text-red-400 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"><Trash2 className="w-5 h-5"/></button>
                       )}
                     </div>
                     <div className="grid grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">น้ำหนักรวม <span className="text-xs font-normal opacity-70">(กก.)</span></label>
                          <input 
                             ref={(el) => { if (el) grossRefs.current[i] = el; }}
                             type="number" 
                             value={r.grossWeight}
                             onChange={e => updateRecord(i, 'grossWeight', e.target.value)}
                             onKeyDown={e => handleKeyDown(e, i)}
                             className="w-full bg-white dark:bg-[#0a2e36] text-center text-slate-900 dark:text-white text-2xl border border-[#00bcd4]/50 rounded-2xl px-2 py-4 focus:outline-none focus:border-[#00bcd4] focus:ring-2 focus:ring-[#00bcd4]/20 shadow-inner font-mono transition-all" 
                           />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-600 dark:text-white/60 mb-2 font-medium">หักกรง <span className="text-xs font-normal opacity-70">(กก.)</span></label>
                          <input 
                             type="number" 
                             value={r.tareWeight}
                             onChange={e => updateRecord(i, 'tareWeight', e.target.value)}
                             onKeyDown={e => handleKeyDown(e, i)}
                             className="w-full bg-white dark:bg-[#0a2e36] text-center text-red-400 text-2xl border border-slate-200 dark:border-white/10 rounded-2xl px-2 py-4 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 shadow-inner font-mono" 
                           />
                        </div>
                     </div>
                     <div className="mt-5 pt-5 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-slate-900 dark:text-white">
                        <span className="text-slate-600 dark:text-white/60 font-medium tracking-wide">น้ำหนักสุทธิ</span>
                        <div className="flex items-baseline gap-1 text-[#00bcd4]">
                          <span className="text-4xl font-bold font-mono">{r.netWeight.toFixed(1)}</span>
                          <span className="text-sm font-medium">กก.</span>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/72 dark:bg-[#12254F]/72 backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-white/10 overflow-hidden shadow-xl">
                <table className="w-full text-center text-sm whitespace-nowrap">
                  <thead className="bg-white/80 dark:bg-[#0a2e36]/80 text-slate-600 dark:text-white/60 border-b border-slate-200 dark:border-white/10">
                    <tr>
                      <th className="p-4 font-medium">ที่</th>
                      <th className="p-4 font-medium w-1/3">รวม(กก.)</th>
                      <th className="p-4 font-medium w-1/4">-กรง</th>
                      <th className="p-4 font-medium text-right pr-6">สุทธิ</th>
                      <th className="p-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-900 dark:text-white">
                    {records.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 text-slate-600 dark:text-white/50 font-mono">{r.index}</td>
                        <td className="p-2 py-3">
                           <input 
                             ref={(el) => { if (el) grossRefs.current[i] = el; }}
                             type="number" 
                             value={r.grossWeight}
                             onChange={e => updateRecord(i, 'grossWeight', e.target.value)}
                             onKeyDown={e => handleKeyDown(e, i)}
                             className="w-full bg-white dark:bg-[#0a2e36] text-center text-slate-900 dark:text-white border border-[#00bcd4]/50 rounded-lg py-2 focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4]/50 font-mono" 
                           />
                        </td>
                        <td className="p-2 py-3">
                           <input 
                             type="number" 
                             value={r.tareWeight}
                             onChange={e => updateRecord(i, 'tareWeight', e.target.value)}
                             onKeyDown={e => handleKeyDown(e, i)}
                             className="w-full bg-white dark:bg-[#0a2e36] text-center text-red-400 border border-slate-200 dark:border-white/10 rounded-lg py-2 focus:outline-none focus:border-red-400 font-mono" 
                           />
                        </td>
                        <td className="p-4 font-bold text-[#00bcd4] text-right font-mono pr-6 text-lg">{r.netWeight.toFixed(1)}</td>
                        <td className="p-3">
                           {records.length > 1 && (
                             <button onClick={() => setRecords(records.filter((_, idx) => idx !== i))} className="text-slate-600 dark:text-white/30 hover:text-red-400 p-1"><Trash2 className="w-4 h-4"/></button>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-white dark:bg-[#0a2e36]">
                    <tr>
                      <td colSpan={3} className="p-4 text-right font-bold text-slate-600 dark:text-white/60 tracking-wider">รวม</td>
                      <td className="p-4 font-bold text-[#00bcd4] text-xl font-mono text-right pr-6">{totalNetWeight.toFixed(1)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Total Block at Bottom of Step 2 */}
            <div className="mt-6 bg-[#00bcd4] rounded-3xl p-6 border border-[#00bcd4]/50 flex justify-between items-center shadow-[0_0_20px_rgba(0,188,212,0.15)] relative overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/always-grey.png')] opacity-10"></div>
               <span className="text-[#061e24] font-bold text-lg relative z-10 uppercase tracking-widest">น้ำหนักสุทธิรวม</span>
               <div className="flex items-baseline gap-1 text-[#061e24] relative z-10">
                  <span className="text-4xl font-bold font-mono">{totalNetWeight.toFixed(1)}</span>
                  <span className="font-bold">กก.</span>
               </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-5">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 px-1">สรุปรายการ (Summary)</h3>
            
            <div className="grid grid-cols-3 gap-3 bg-white/72 dark:bg-[#12254F]/72 backdrop-blur-xl p-5 rounded-[2rem] shadow-xl border border-white/60 dark:border-white/10 text-center">
              <div>
                <p className="text-xs sm:text-sm font-black text-[#005c6a] dark:text-[#00bcd4] mb-2 uppercase tracking-wide">จำนวนตัว</p>
                <div className="bg-slate-50 dark:bg-[#0a2e36] border border-slate-200/60 dark:border-white/5 rounded-2xl py-3 font-bold text-2xl text-slate-900 dark:text-white font-mono shadow-inner">{totalPigsNum}</div>
              </div>
              <div className="relative">
                <div className="absolute top-2 bottom-2 left-0 w-px bg-slate-200/65 dark:bg-white/10"></div>
                <div className="absolute top-2 bottom-2 right-0 w-px bg-slate-200/65 dark:bg-white/10"></div>
                <p className="text-xs sm:text-sm font-black text-[#005c6a] dark:text-[#00bcd4] mb-2 uppercase tracking-wide">น้ำหนักรวม</p>
                <div className="bg-slate-50 dark:bg-[#0a2e36] border border-slate-200/60 dark:border-white/5 rounded-2xl py-3 font-bold text-2xl text-slate-900 dark:text-white font-mono shadow-inner">{totalNetWeight.toFixed(1)}</div>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black text-[#005c6a] dark:text-[#00bcd4] mb-2 uppercase tracking-wide">เฉลี่ย/ตัว</p>
                <div className="bg-slate-50 dark:bg-[#0a2e36] border border-slate-200/60 dark:border-white/5 rounded-2xl py-3 font-bold text-2xl text-slate-900 dark:text-white font-mono shadow-inner">{averageWeight.toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-white/72 dark:bg-[#12254F]/72 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-xl border border-white/60 dark:border-white/10 space-y-6">
              <div className="flex justify-between items-center bg-slate-100 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                <span className="text-slate-900 dark:text-white font-medium">ราคาขาย บาท/กก.:</span>
                <input type="number" placeholder="0.00" value={formData.pricePerKg} onChange={e => setFormData({...formData, pricePerKg: e.target.value})} className="w-32 bg-white dark:bg-[#0a2e36] text-right font-bold text-xl text-[#00bcd4] border border-[#00bcd4]/30 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#00bcd4] shadow-inner font-mono" />
              </div>
              
              <div className="flex justify-between items-center px-2 border-b border-slate-200 dark:border-white/10 pb-4">
                <span className="text-slate-600 dark:text-white/60 font-medium">ยอดรวม (บาท)</span>
                <span className="font-bold text-xl text-slate-900 dark:text-white font-mono">{grossTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
              
              <div className="flex justify-between items-center px-2 border-b border-slate-200 dark:border-white/10 pb-4">
                <span className="text-red-500 dark:text-red-400 font-medium font-bold">หักค่าใช้จ่าย (ถ้ามี)</span>
                <input type="number" placeholder="0.00" value={formData.deductions} onChange={e => setFormData({...formData, deductions: e.target.value})} className="w-32 bg-red-50 dark:bg-red-950/20 text-right font-bold text-xl text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-red-500 shadow-inner font-mono" />
              </div>
              
              <div className="bg-gradient-to-br from-[#0E214B] to-[#061129] p-6 rounded-2xl shadow-inner border border-[#00bcd4]/30 mt-6 relative overflow-hidden">
                <p className="text-[#00bcd4] text-xs font-black tracking-widest uppercase mb-1">รวมเงินทั้งสิ้น (NET TOTAL)</p>
                <div className="flex items-baseline justify-between mt-1">
                   <span className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight">{netTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                   <span className="font-bold text-slate-300 dark:text-white/50 text-xl ml-2">บาท</span>
                </div>
              </div>
            </div>

            {/* Payment Status Selection card */}
            <div className="bg-white/72 dark:bg-[#12254F]/72 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl border border-white/60 dark:border-white/10">
              <h4 className="font-bold text-slate-900 dark:text-white mb-5 text-lg">สถานะการชำระเงิน</h4>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, paymentStatus: 'PAID'})}
                  className={clsx("flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-bold transition-all cursor-pointer", formData.paymentStatus === 'PAID' ? "border-green-400 bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]" : "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50")}
                >
                  <CheckCircle2 className="w-5 h-5" /> เงินสด
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, paymentStatus: 'UNPAID'})}
                  className={clsx("flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-bold transition-all cursor-pointer", formData.paymentStatus === 'UNPAID' ? "border-amber-400 bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]" : "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50")}
                >
                  <AlertCircle className="w-5 h-5" /> ค้างชำระ
                </button>
              </div>

              {/* Delivery Photo (Proof of Delivery) Card */}
              <div className="border border-dashed border-[#00bcd4]/50 bg-black/20 rounded-2xl p-5 mb-5 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
                 <p className="absolute top-3 left-4 text-xs font-bold text-[#00bcd4]/70 uppercase tracking-widest">ภาพถ่ายหลักฐานการส่งมอบหมู (ถ้ามี):</p>
                 {deliveryPhoto ? (
                   <div className="w-full text-center mt-6">
                     <img src={deliveryPhoto} alt="Delivery Proof" className="max-h-[160px] mx-auto rounded-xl border border-white/10 shadow-lg object-contain" />
                     <button 
                       type="button" 
                       onClick={() => setDeliveryPhoto('')} 
                       className="text-red-400 text-sm font-bold mt-3 hover:underline cursor-pointer block mx-auto"
                     >
                       ลบรูปถ่าย
                     </button>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center mt-6 gap-3 w-full">
                     <p className="text-xs text-slate-400 dark:text-white/40 text-center mb-1">ถ่ายภาพหลักฐานการขึ้นหมู/ส่งมอบด้วยการบีบอัดอัตโนมัติ 200-400 KB เพื่อเซฟพื้นที่คลาวด์</p>
                     <div className="flex gap-3 justify-center">
                       <label className="flex items-center gap-2 bg-[#00bcd4] hover:bg-[#00bcd4]/80 text-[#061e24] px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer">
                         <Camera className="w-4 h-4" /> ถ่ายรูปจากกล้อง
                         <input 
                           type="file" 
                           accept="image/*" 
                           capture="environment" 
                           className="hidden" 
                           onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               showLoading('กำลังบีบอัดภาพด้วย Centralized Optimization...', 'บีบอัดรูปภาพ');
                               try {
                                 const optimized = await optimizeImage(file, { type: 'document' });
                                 setDeliveryPhoto(optimized.dataUrl);
                               } catch (err) {
                                 console.error(err);
                                 showAlert('ไม่สามารถบีบอัดรูปภาพได้');
                               } finally {
                                 hideLoading();
                               }
                             }
                           }}
                         />
                       </label>
                       <label className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer">
                         <Upload className="w-4 h-4" /> อัปโหลดไฟล์ภาพ
                         <input 
                           type="file" 
                           accept="image/*" 
                           className="hidden" 
                           onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               showLoading('กำลังบีบอัดภาพด้วย Centralized Optimization...', 'บีบอัดรูปภาพ');
                               try {
                                 const optimized = await optimizeImage(file, { type: 'document' });
                                 setDeliveryPhoto(optimized.dataUrl);
                               } catch (err) {
                                 console.error(err);
                                 showAlert('ไม่สามารถบีบอัดรูปภาพได้');
                               } finally {
                                 hideLoading();
                               }
                             }
                           }}
                         />
                       </label>
                     </div>
                   </div>
                 )}
              </div>

              {/* Buyer Signature card */}
              <div className="border border-dashed border-[#00bcd4]/50 bg-black/20 rounded-2xl p-5 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
                 <p className="absolute top-3 left-4 text-xs font-bold text-[#00bcd4]/70 uppercase tracking-widest">ลายเซ็นผู้ซื้อ:</p>
                 {signature ? (
                   <div className="w-full text-center mt-6 bg-slate-900/90 dark:bg-white/90 rounded-xl p-2">
                     <img src={signature} alt="Signature" className="max-h-[100px] mx-auto mix-blend-multiply" />
                     <button type="button" onClick={() => setShowSigModal(true)} className="text-[#00bcd4] text-sm font-bold mt-3 hover:underline cursor-pointer">เซ็นใหม่</button>
                   </div>
                 ) : (
                   <button type="button" onClick={() => setShowSigModal(true)} className="bg-white dark:bg-[#0a2e36] border border-[#00bcd4]/30 text-[#00bcd4] px-8 py-3.5 rounded-full text-sm font-bold shadow-xl dark:shadow-2xl transition-colors mt-6 uppercase tracking-wider cursor-pointer">
                      คลิกเพื่อเซ็นชื่อยืนยัน
                   </button>
                 )}
              </div>
            </div>

            {/* Create PDF Document Card */}
            <div className="bg-white/72 dark:bg-[#12254F]/72 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl border border-white/60 dark:border-white/10 text-center">
              <h4 className="font-extrabold text-[#00bcd4] mb-2 text-lg">เอกสารและรายงาน</h4>
              <p className="text-xs text-slate-500 dark:text-white/60 mb-5 font-bold leading-relaxed">
                ดึงรายการชั่งน้ำหนักทั้งหมด รายละเอียดราคา ยอดเงินสุทธิ และลายเซ็นผู้รับสินค้า เพื่อจัดพิมพ์ใบส่งของ/ใบเสร็จรายงาน PDF ได้อย่างสวยงามสะดวกรวดเร็วครับ
              </p>
              <button 
                type="button"
                onClick={() => {
                  if (!formData.buyerName) {
                    alert('กรุณากรอกชื่อผู้ซื้อในขั้นตอนแรกก่อน เพื่อออกเอกสารครับ');
                    return;
                  }
                  setShowReceiptModal(true);
                }}
                className="w-full bg-[#00bcd4]/10 hover:bg-[#00bcd4]/20 text-[#00bcd4] border-2 border-[#00bcd4]/35 p-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 text-base active:scale-95 shadow-md shadow-[#00bcd4]/10 cursor-pointer"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                สร้างรายงานการชั่ง & ใบเสร็จ PDF
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Signature Modal */}
      {showSigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={() => setShowSigModal(false)}></div>
          <div className="bg-white dark:bg-[#0a2e36] border border-[#00bcd4]/30 rounded-3xl w-full max-w-sm shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95">
             <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-100 dark:bg-white/5">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">ลายเซ็นผู้ซื้อ/ผู้รับ</h3>
                <button onClick={() => setShowSigModal(false)} className="text-slate-600 dark:text-white/40  bg-black/20 rounded-full p-2"><X className="w-5 h-5"/></button>
             </div>
             <div className="p-6">
                <p className="text-sm text-[#061e24] text-center mb-5 tracking-wide font-bold">กรุณาเซ็นชื่อลงในกรอบสีขาวด้านล่าง</p>
                <div className="bg-white border-2 border-[#00bcd4]/30 rounded-2xl mb-6 relative z-10 w-full overflow-hidden shadow-inner">
                   {/* Wrapping the SignaturePad so we can intercept its callbacks if needed. 
                       Actually, SignaturePad uses its own `clear` button. */}
                   <SignaturePad 
                      onEnd={(sig) => setSignature(sig)}
                      width={320} height={200}
                   />
                </div>
                <div className="flex gap-4">
                   <button onClick={() => setShowSigModal(false)} className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-white/20 font-bold text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">ยกเลิก</button>
                   <button onClick={() => setShowSigModal(false)} className="flex-1 py-3.5 rounded-xl bg-[#00bcd4] font-bold text-[#061e24] shadow-xl dark:shadow-2xl hover:bg-[#00e5ff] active:scale-95 transition-all"><CheckCircle2 className="w-5 h-5 inline-block mr-1 -mt-0.5" /> ยืนยัน</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Receipts and PDF Report Preview Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md overflow-y-auto">
          <div className="absolute inset-0 bg-black/90" onClick={() => setShowReceiptModal(false)}></div>
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl relative z-10 overflow-hidden my-8 select-none flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-white dark:bg-white/5 flex-shrink-0">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">ใบส่งของและรายงานการชั่งนํ้าหนัก</h3>
                <p className="text-xs text-slate-500 dark:text-white/60">นิพนธ์ฟาร์ม (Nipon Farm)</p>
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-white/5 rounded-full p-2 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable Preview of the receipt */}
            <div className="p-6 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex-1">
              <div id="printable-receipt" className="bg-white text-slate-800 p-8 rounded-2xl border border-slate-200 shadow-md font-sans max-w-xl mx-auto">
                <style>{`
                  @media print {
                    @page {
                      size: A4;
                      margin: 15mm;
                    }
                    body * {
                      visibility: hidden;
                    }
                    #printable-receipt, #printable-receipt * {
                      visibility: visible;
                    }
                    #printable-receipt {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100% !important;
                      max-width: none !important;
                      border: none !important;
                      box-shadow: none !important;
                      margin: 0 !important;
                      padding: 0 !important;
                    }
                  }
                `}</style>
                
                {/* Receipt Content */}
                <div className="text-center border-b-2 border-[#00bcd4] pb-4 mb-6">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">นิพนธ์ฟาร์ม - Nipon Farm</h1>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">ใบเสร็จรับเงิน / รายงานการขายและชั่งนํ้าหนักหมู</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">เลขที่เอกสาร: {formData.saleId}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-[11px] mb-6 bg-slate-50 p-4 border border-slate-100 rounded-xl">
                  <div>
                    <span className="font-bold text-slate-400 block mb-0.5">วันที่ทำรายการ (Date)</span>
                    <span className="text-slate-800 font-bold">{formData.date}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 block mb-0.5">ผู้จัดส่ง/ขาย (Seller)</span>
                    <span className="text-slate-800 font-bold">นิพนธ์ฟาร์ม</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-200/60 pt-2">
                    <span className="font-bold text-slate-400 block mb-0.5">ผู้ซื้อ (Buyer)</span>
                    <span className="text-slate-900 font-bold text-xs">{formData.buyerName}</span>
                    {formData.buyerEmail && <span className="text-slate-500 block text-[10px] font-mono">{formData.buyerEmail}</span>}
                  </div>
                  <div className="col-span-2 border-t border-slate-200/60 pt-2">
                    <span className="font-bold text-slate-400 block mb-0.5">ทะเบียนรถที่มารับสินค้า (Vehicle Reg.)</span>
                    <span className="text-slate-800 font-bold">{formData.vehicleReg || 'ไม่ระบุ'}</span>
                  </div>
                </div>

                {/* Weights table */}
                <div className="mb-6">
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">ตารางน้ำหนักการชั่งหมู (Weighing Weights) ({records.length} ตัว)</h4>
                  {(() => {
                    const sortedRecords = [...records];
                    const totalRecords = sortedRecords.length;
                    const numCols = totalRecords > 30 ? 3 : totalRecords > 15 ? 2 : 1;
                    const colSize = Math.ceil(totalRecords / numCols);
                    
                    const cols = [];
                    for (let i = 0; i < numCols; i++) {
                      cols.push(sortedRecords.slice(i * colSize, (i + 1) * colSize));
                    }

                    const isMultiCol = numCols > 1;

                    return (
                      <div className="flex gap-3 justify-between items-start">
                        {cols.map((colRecords, colIdx) => (
                          <div key={colIdx} className="flex-1 min-w-0">
                            <table className="w-full text-center border-collapse border border-slate-200" style={{ fontSize: isMultiCol ? "10px" : "11px" }}>
                              <thead>
                                <tr className="bg-[#0c2e36] text-white">
                                  <th className="p-1.5 border border-slate-200 font-bold" style={{ width: isMultiCol ? "24px" : "40px" }}>
                                    {isMultiCol ? "#" : "ครั้งที่"}
                                  </th>
                                  <th className="p-1.5 border border-slate-200 font-bold">
                                    {isMultiCol ? "รวม" : "นํ้าหนักรวม (กก.)"}
                                  </th>
                                  <th className="p-1.5 border border-slate-200 font-bold">
                                    {isMultiCol ? "กรง" : "หักน้ำหนักกรง (กก.)"}
                                  </th>
                                  <th className="p-1.5 border border-slate-200 text-right pr-2 font-bold">
                                    {isMultiCol ? "สุทธิ" : "นํ้าหนักสุทธิ (กก.)"}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="font-mono text-slate-800 divide-y divide-slate-100">
                                {colRecords.map((r, i) => {
                                  const overallIndex = sortedRecords.indexOf(r) + 1;
                                  return (
                                    <tr key={r.id}>
                                      <td className="p-1 border border-slate-200">{overallIndex}</td>
                                      <td className="p-1 border border-slate-200">{Number(r.grossWeight || 0).toFixed(1)}</td>
                                      <td className="p-1 border border-slate-200 text-red-500">-{Number(r.tareWeight || 0).toFixed(1)}</td>
                                      <td className="p-1 border border-slate-200 text-right pr-2 font-bold text-slate-900">{Number(r.netWeight || 0).toFixed(1)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              {!isMultiCol && (
                                <tfoot>
                                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                                    <td colSpan={3} className="p-1.5 border border-slate-200 text-right pr-2 font-bold">รวมน้ำหนักสุทธิทั้งหมด:</td>
                                    <td className="p-1.5 border border-slate-200 text-right pr-2 text-[#00bcd4] font-bold font-mono">{totalNetWeight.toFixed(1)} กก.</td>
                                  </tr>
                                </tfoot>
                              )}
                            </table>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                
                {/* Financial Summary */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 mb-6">
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>จำนวนสุกรทั้งหมด (Total Pigs):</span>
                    <span className="font-bold text-slate-900 font-mono">{totalPigsNum} ตัว</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>น้ำหนักสุทธิรวม (Total Net Weight):</span>
                    <span className="font-bold text-slate-900 font-mono">{totalNetWeight.toFixed(1)} กก.</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>น้ำหนักเฉลี่ยต่อตัว (Average Weight):</span>
                    <span className="font-bold text-slate-950 font-mono">{averageWeight.toFixed(2)} กก./ตัว</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>ราคาต่อกิโลกรัม (Price/Kg):</span>
                    <span className="font-bold text-slate-900 font-mono">฿{Number(formData.pricePerKg || 0).toFixed(2)} บาท/กก.</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600 border-t border-dashed border-slate-200 pt-2 mt-2">
                    <span>ยอดรวมทั้งสิ้น (Subtotal):</span>
                    <span className="font-bold text-slate-900 font-mono">฿{grossTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  </div>
                  {Number(formData.deductions || 0) > 0 && (
                    <div className="flex justify-between text-[11px] text-red-500">
                      <span>หักค่าใช้จ่าย / ส่วนลดเพิ่มเติม (Deductions):</span>
                      <span className="font-bold font-mono">-฿{Number(formData.deductions).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold text-slate-900 pt-2 border-t border-slate-300">
                    <span>ยอดรับเงินสุทธิ (NET INCOME RECEIVED):</span>
                    <span className="text-[#0d9488] font-mono text-sm font-black">฿{netTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} บาท</span>
                  </div>
                 </div>

                {/* Signature section */}
                <div className="flex justify-between items-end mt-8 text-[10px] text-slate-500">
                  <div className="text-center w-36">
                    <span className="block mb-10 text-slate-400">สัตวบาลผู้ส่งมอบ</span>
                    <span className="block border-t border-dotted border-slate-400 pt-1 font-bold text-slate-700">
                      ({userProfile?.displayName || user?.email || 'นิพนธ์ฟาร์ม'})
                    </span>
                  </div>
                  <div className="text-center w-48 flex flex-col items-center justify-end">
                    <span className="block mb-2 text-slate-400">ลายเซ็นผู้ซื้อ/ผู้รับมอบสินค้า</span>
                    {signature ? (
                      <img src={signature} alt="Buyer Signature" className="max-h-[50px] object-contain mb-1 mix-blend-multiply" />
                    ) : (
                      <div className="h-[50px]"></div>
                    )}
                    <span className="block border-t border-dotted border-slate-400 pt-1 font-bold text-slate-700 w-full text-center">
                      ({formData.buyerName})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 flex flex-col gap-3 flex-shrink-0">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isGeneratingPdf ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  ดาวน์โหลด PDF
                </button>
                
                <button 
                  type="button"
                  onClick={handleSaveToDrive}
                  disabled={isUploadingToDrive || isGeneratingPdf}
                  className="py-3 bg-white dark:bg-[#0a2e36] hover:bg-slate-50 dark:hover:bg-[#103b45] text-slate-700 dark:text-[#00bcd4] border border-slate-200 dark:border-[#00bcd4]/30 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isUploadingToDrive ? (
                    <div className="w-3.5 h-3.5 border-2 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div>
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                  เก็บไว้ใน Drive
                </button>

                <button 
                  type="button"
                  onClick={handleShareToLine}
                  className="py-3 bg-[#06C755] hover:bg-[#05b14c] text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-green-500/10"
                >
                  <Share2 className="w-4 h-4" />
                  แชร์เข้า LINE
                </button>

                <button 
                  type="button"
                  onClick={() => window.print()}
                  className="py-3 bg-[#00bcd4] text-[#061e24] hover:bg-[#00e5ff] rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#00bcd4]/20"
                >
                  <Printer className="w-4 h-4" />
                  สั่งปริ้นใบเสร็จ
                </button>
              </div>

              <button 
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-600 dark:text-white rounded-xl font-bold transition-all text-xs cursor-pointer text-center"
              >
                ปิดหน้าต่างรายงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation bar - Sticky bottom on mobile so it doesn't overlap inputs/keyboard, fixed on desktop */}
      <div className="sticky bottom-4 mt-8 md:fixed md:bottom-0 md:left-0 md:right-0 md:z-[100] bg-[#061e24]/95 backdrop-blur-xl border border-[#00bcd4]/30 md:border-x-0 md:border-b-0 md:rounded-none md:shadow-[0_-20px_40px_rgba(0,0,0,0.5)] shadow-2xl p-4 rounded-3xl z-[90] pb-safe max-w-xl mx-auto md:max-w-none w-full">
         <div className="max-w-4xl mx-auto w-full flex gap-4">
           {step > 1 && <button onClick={prevStep} className="px-6 sm:px-8 py-3.5 rounded-xl bg-white dark:bg-white/10 font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/20 active:scale-95 transition-all">{'< กลับ'}</button>}
           {step < 3 ? (
              <button onClick={nextStep} className="flex-1 py-3.5 rounded-xl bg-[#00bcd4] text-[#061e24] font-bold shadow-[0_0_15px_rgba(0,188,212,0.3)] hover:bg-[#00e5ff] active:scale-95 transition-all tracking-wide">
                ต่อไป: {step === 1 ? 'ชั่งน้ำหนัก' : 'สรุปยอด'} {'>'}
              </button>
           ) : (
              <button 
                onClick={handleSubmit} 
                disabled={isSaving} 
                className="flex-1 py-3.5 rounded-xl bg-[#00bcd4] text-[#061e24] font-bold text-lg shadow-[0_0_15px_rgba(0,188,212,0.3)] hover:bg-[#00e5ff] active:scale-95 transition-all tracking-wide disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2"
              >
                {isSaving ? <><div className="w-5 h-5 border-2 border-[#061e24]/30 border-t-[#061e24] rounded-full animate-spin"></div> กำลังบันทึก...</> : 'บันทึกการขาย'}
              </button>
           )}
         </div>
      </div>
    </div>
  );
}
