import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mail, Download, Printer, Trash2, ArrowLeft, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { subscribeToPigSales, deletePigSale } from '../../services/saleService';
import { PigSale } from '../../types';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';

export default function SalesList() {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useBottomSheet();
  const [sales, setSales] = useState<PigSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Ref for PDF generation of selected sale
  const [selectedForPdf, setSelectedForPdf] = useState<PigSale | null>(null);

  useEffect(() => {
    const unsub = subscribeToPigSales((data) => {
      setSales(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    showConfirm('ยืนยันการลบรายการนี้?', async () => {
      try {
        await deletePigSale(id);
      } catch (error) {
        showAlert('เกิดข้อผิดพลาดในการลบ');
      }
    });
  };

  const handleEmail = (sale: PigSale) => {
    const subject = `ใบสรุปการขายหมูขุน นพพนธ์ฟาร์ม - ${format(parseISO(sale.date), 'dd MMM yyyy')}`;
    const body = `เรียน คุณ ${sale.buyerName},\n\nสรุปรายการขายหมูขุน วันที่ ${format(parseISO(sale.date), 'dd MMM yyyy', { locale: th })}\nทะเบียนรถ: ${sale.vehicleReg || '-'}\n\nจำนวนหมู: ${sale.totalPigs} ตัว\nน้ำหนักสุทธิรวม: ${sale.totalNetWeight.toFixed(1)} กก.\nน้ำหนักเฉลี่ย: ${sale.averageWeight.toFixed(2)} กก./ตัว\nราคาขาย: ${sale.pricePerKg} บาท/กก.\n\nยอดรวม: ${sale.grossTotal.toLocaleString()} บาท\nหักค่าใช้จ่าย: ${sale.deductions.toLocaleString()} บาท\nยอดสุทธิ (NET TOTAL): ${sale.netTotal.toLocaleString()} บาท\n\nขอบคุณครับ\nนิพนธ์ฟาร์ม`;
    window.location.href = `mailto:${sale.buyerEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const generatePdfBlob = async (): Promise<Blob | null> => {
    const element = document.getElementById('printable-receipt');
    if (!element) {
      showAlert("ไม่พบหน้าต่างรายงานที่ต้องการสร้าง PDF กรุณาลองใหม่อีกครั้งครับ");
      return null;
    }
    
    try {
      const originalStyle = element.style.cssText;
      element.style.maxHeight = 'none';
      element.style.overflow = 'visible';
      
      const dataUrl = await htmlToImage.toPng(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
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
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const imgWidth = img.width;
      const imgHeight = img.height;
      const ratio = imgHeight / imgWidth;
      
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
      link.download = `รายงานการชั่งนํ้าหนัก_${selectedForPdf?.buyerName || 'ลูกค้า'}_${selectedForPdf?.saleId || 'sale'}.pdf`;
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

  const handlePrint = () => {
    showAlert('ระบบกำลังสั่งพิมพ์.. \n\n* หากหน้าต่างการพิมพ์ไม่ขึ้น กรุณากดปุ่ม "Open in new tab" (ไอคอนสี่เหลี่ยมมีลูกศรชี้ขึ้น) ที่มุมขวาบนสุดของจอก่อนพิมพ์ครับ', 'กำลังสั่งพิมพ์...');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const filteredSales = sales.filter(s => 
    s.buyerName.toLowerCase().includes(search.toLowerCase()) || 
    s.vehicleReg.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-300 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide">ประวัติการขายหมูขุน</h2>
      </div>

      {/* Search */}
      <div className="relative mb-6 search-rainbow-border">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-[#00bcd4]" />
        </div>
        <input 
          type="text" 
          placeholder="ค้นหาชื่อผู้ซื้อ หรือ ทะเบียนรถ..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-[#0a2e36] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-[#00bcd4] focus:ring-1 focus:ring-[#00bcd4] shadow-inner placeholder-slate-500 dark:placeholder-white/30"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div></div>
      ) : filteredSales.length === 0 ? (
        <div className="text-center py-20 bg-slate-100 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10 border-dashed text-slate-600 dark:text-white/50">ยังไม่มีรายการขาย</div>
      ) : (
        <div className="space-y-4">
          {filteredSales.map(sale => (
            <div key={sale.id} className="bg-white/72 dark:bg-[#12254F]/72 backdrop-blur-xl rounded-[2rem] p-5 border border-white/60 dark:border-white/10 shadow-lg shadow-slate-200/10 dark:shadow-none relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white">{sale.buyerName}</h3>
                  <span className={`w-fit text-[10px] px-2 py-0.5 rounded-full font-bold ${sale.paymentStatus === 'PAID' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {sale.paymentStatus === 'PAID' ? 'จ่ายแล้ว' : 'ค้างชำระ'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-white/40">
                  <button onClick={() => handleEmail(sale)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors text-xs font-bold" title="ส่งอีเมล (Gmail)"><Mail className="w-4 h-4" /> ส่งเมล</button>
                  <button onClick={() => setSelectedForPdf(sale)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00bcd4]/10 text-[#00bcd4] hover:bg-[#00bcd4] hover:text-white rounded-lg transition-colors text-xs font-bold" title="พิมพ์หรือเซฟ PDF"><Printer className="w-4 h-4" /> พิมพ์ / PDF</button>
                  <button onClick={() => handleDelete(sale.id!)} className="p-1.5 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="ลบ"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 dark:text-white/50 mb-3 ml-1">
                {(() => {
                  try { return format(parseISO(sale.date), 'dd MMM yyyy', { locale: th }); } 
                  catch { return sale.date; }
                })()} • ทะเบียน: {sale.vehicleReg || '-'}
              </p>

              <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-black/25 rounded-2xl p-3 mb-4 text-center border border-slate-200 dark:border-white/[0.05] shadow-inner">
                <div>
                  <p className="text-xs sm:text-sm font-black text-[#005c6a] dark:text-[#00bcd4] tracking-wide mb-1">จำนวนตัว</p>
                  <p className="font-bold text-slate-900 dark:text-white text-lg mt-0.5">{sale.totalPigs}</p>
                </div>
                <div className="border-l border-slate-200 dark:border-white/10">
                  <p className="text-xs sm:text-sm font-black text-[#005c6a] dark:text-[#00bcd4] tracking-wide mb-1">น้ำหนักรวม</p>
                  <p className="font-bold text-slate-900 dark:text-white text-lg mt-0.5">{sale.totalNetWeight.toFixed(1)} <span className="text-xs text-slate-600 dark:text-white/40">กก.</span></p>
                </div>
                <div className="border-l border-slate-200 dark:border-white/10">
                  <p className="text-xs sm:text-sm font-black text-[#005c6a] dark:text-[#00bcd4] tracking-wide mb-1">เฉลี่ย</p>
                  <p className="font-bold text-slate-900 dark:text-white text-lg mt-0.5">{sale.averageWeight.toFixed(1)} <span className="text-xs text-slate-600 dark:text-white/40">กก.</span></p>
                </div>
              </div>

              <div className="flex justify-between items-end px-1 border-t border-slate-200 dark:border-white/10 pt-3">
                <p className="text-sm text-slate-600 dark:text-white/50 font-medium pb-1">ราคา: {sale.pricePerKg} บ./กก.</p>
                <div className="text-right">
                  <p className="text-xs font-black text-[#005c6a] dark:text-[#00bcd4] mb-1 uppercase tracking-wide">ยอดสุทธิรวม</p>
                  <p className="font-bold text-[#00bcd4] text-2xl">฿{sale.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Receipts and PDF Report Preview Modal */}
      {selectedForPdf && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md overflow-y-auto">
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
                background: white !important;
                color: black !important;
              }
            }
          `}</style>
          
          <div className="absolute inset-0 bg-black/90" onClick={() => setSelectedForPdf(null)}></div>
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl relative z-10 overflow-hidden my-8 select-none flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-white dark:bg-white/5 flex-shrink-0">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">ใบส่งของและรายงานการชั่งนํ้าหนัก</h3>
                <p className="text-xs text-slate-500 dark:text-white/60">นิพนธ์ฟาร์ม (Nipon Farm)</p>
              </div>
              <button onClick={() => setSelectedForPdf(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-white/5 rounded-full p-2 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable Preview */}
            <div className="p-6 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex-1">
              <div id="printable-receipt" className="bg-white text-slate-800 p-8 rounded-2xl border border-slate-200 shadow-md font-sans max-w-xl mx-auto">
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000000', paddingBottom: '16px', marginBottom: '32px' }}>
                  <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '900', margin: '0 0 4px 0', letterSpacing: '-0.5px', color: '#0f172a' }}>นิพนธ์ฟาร์ม</h1>
                    <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', margin: '0' }}>SALE RECEIPT / ใบสรุปการขายหมูขุน</p>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>ระบบบันทึกการขายและคำนวณรายได้</p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '13px', color: '#334155' }}>
                     <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 'bold', color: '#64748b' }}>Sale ID:</span>
                        <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', fontWeight: 'bold', borderRadius: '4px', fontFamily: 'monospace' }}>{selectedForPdf.saleId}</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 'bold', color: '#64748b' }}>Buyer Name:</span>
                        <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', fontWeight: 'bold', borderRadius: '4px' }}>{selectedForPdf.buyerName}</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 'bold', color: '#64748b' }}>Date:</span>
                        <span style={{ fontWeight: 'bold' }}>{selectedForPdf.date}</span>
                     </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                   <div style={{ flex: '1', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: '8px' }}>
                      <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>TOTAL WEIGHT / น้ำหนักรวม</p>
                      <p style={{ fontSize: '20px', fontWeight: '900', margin: '0', color: '#0f172a' }}>{selectedForPdf.totalNetWeight.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} <span style={{ fontSize: '12px', color: '#94a3b8' }}>KG.</span></p>
                   </div>
                   <div style={{ flex: '1', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: '8px' }}>
                      <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>AVERAGE WEIGHT / นน.เฉลี่ย</p>
                      <p style={{ fontSize: '20px', fontWeight: '900', margin: '0', color: '#0f172a' }}>{selectedForPdf.averageWeight.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} <span style={{ fontSize: '12px', color: '#94a3b8' }}>KG.</span></p>
                   </div>
                   <div style={{ flex: '1', backgroundColor: '#0f172a', color: '#ffffff', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: '8px' }}>
                      <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 4px 0' }}>NET TOTAL / ยอดสุทธิ</p>
                      <p style={{ fontSize: '20px', fontWeight: '900', color: '#22c55e', margin: '0' }}>{selectedForPdf.netTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span style={{ fontSize: '12px', color: '#94a3b8' }}>฿</span></p>
                   </div>
                </div>

                {/* Table Section */}
                <div style={{ marginBottom: '24px' }}>
                   <h2 style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000000', paddingBottom: '6px', marginBottom: '12px', color: '#0f172a' }}>WEIGHT DETAILS / รายละเอียดการชั่ง ( {selectedForPdf.totalPigs} ตัว )</h2>
                   {(() => {
                     const sortedRecords = [...selectedForPdf.records].sort((a: any, b: any) => a.index - b.index);
                     const totalRecords = sortedRecords.length;
                     const numCols = totalRecords > 30 ? 3 : totalRecords > 15 ? 2 : 1;
                     const colSize = Math.ceil(totalRecords / numCols);
                     
                     const cols = [];
                     for (let i = 0; i < numCols; i++) {
                       cols.push(sortedRecords.slice(i * colSize, (i + 1) * colSize));
                     }

                     const isMultiCol = numCols > 1;

                     return (
                       <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                         {cols.map((colRecords, colIdx) => (
                           <div key={colIdx} style={{ flex: 1, minWidth: 0 }}>
                             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMultiCol ? '10px' : '11px', color: '#334155' }}>
                                <thead>
                                   <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                                      <th style={{ padding: '5px 6px', textAlign: 'left', fontWeight: 'bold', width: isMultiCol ? '24px' : '36px' }}>#</th>
                                      <th style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 'bold' }}>{isMultiCol ? 'รวม' : 'น้ำหนักรวม (KG)'}</th>
                                      <th style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 'bold' }}>{isMultiCol ? 'กรง' : 'น้ำหนักกรง (KG)'}</th>
                                      <th style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 'bold' }}>{isMultiCol ? 'สุทธิ' : 'น้ำหนักสุทธิ (KG)'}</th>
                                   </tr>
                                </thead>
                                <tbody>
                                    {colRecords.map((r: any, idx: number) => (
                                      <tr key={r.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                         <td style={{ padding: '4px 6px', color: '#64748b', fontFamily: 'monospace' }}>{r.index}</td>
                                         <td style={{ padding: '4px 6px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontFamily: 'monospace' }}>{Number(r.grossWeight || 0).toFixed(1)}</td>
                                         <td style={{ padding: '4px 6px', textAlign: 'right', borderRight: '1px solid #e2e8f0', color: '#ef4444', fontFamily: 'monospace' }}>- {Number(r.tareWeight || 0).toFixed(1)}</td>
                                         <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', fontFamily: 'monospace' }}>{Number(r.netWeight || 0).toFixed(1)}</td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                           </div>
                         ))}
                       </div>
                     );
                   })()}
                </div>

                {/* Footer Detail */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '20px' }}>
                    <div style={{ width: '50%' }}>
                       <h3 style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '12px', color: '#0f172a' }}>INFO / ข้อมูลเพิ่มเติม</h3>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                           <span style={{ fontWeight: 'bold', color: '#64748b' }}>ประเภท:</span>
                           <span style={{ fontWeight: 'bold', color: '#334155' }}>{selectedForPdf.saleType}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                           <span style={{ fontWeight: 'bold', color: '#64748b' }}>สถานะการชำระเงิน:</span>
                           <span style={{ fontWeight: 'bold', color: selectedForPdf.paymentStatus === 'PAID' ? '#16a34a' : '#dc2626' }}>
                             {selectedForPdf.paymentStatus === 'PAID' ? 'ชำระเงินสดแล้ว' : 'ค้างชำระ'}
                           </span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                           <span style={{ fontWeight: 'bold', color: '#64748b' }}>ทะเบียนรถ:</span>
                           <span style={{ fontWeight: 'bold', color: '#334155' }}>{selectedForPdf.vehicleReg || '-'}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                           <span style={{ fontWeight: 'bold', color: '#64748b' }}>ราคาต่อกิโลกรัม:</span>
                           <span style={{ fontWeight: 'bold', color: '#334155' }}>{selectedForPdf.pricePerKg} ฿/KG</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                           <span style={{ fontWeight: 'bold', color: '#64748b' }}>ค่าใช้จ่ายหักออก:</span>
                           <span style={{ fontWeight: 'bold', color: '#ef4444' }}>- {selectedForPdf.deductions?.toLocaleString() || 0} ฿</span>
                       </div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'flex-end', width: '50%' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '120px' }}>
                           <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '8px', textAlign: 'center' }}>
                               {selectedForPdf.signature ? (
                                   <img src={selectedForPdf.signature} alt="Signature" style={{ height: '36px', objectFit: 'contain', margin: '0 auto 4px auto' }} />
                               ) : (
                                   <div style={{ height: '40px' }}></div>
                               )}
                               <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', margin: '0' }}>ผู้ซื้อ / รับหมู</p>
                           </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '120px' }}>
                           <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '8px', textAlign: 'center' }}>
                               <div style={{ height: '40px' }}></div>
                               <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', margin: '0' }}>ฟาร์ม / ผู้ขาย</p>
                           </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '48px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '1px' }}>
                   GENERATED BY NIPHON FARM SYSTEM © {new Date().getFullYear()}
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
                  onClick={handlePrint}
                  disabled={isGeneratingPdf}
                  className="py-3 bg-white dark:bg-[#0a2e36] hover:bg-slate-50 dark:hover:bg-[#103b45] text-slate-700 dark:text-[#00bcd4] border border-slate-200 dark:border-[#00bcd4]/30 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  พิมพ์ด้วยเบราว์เซอร์
                </button>
              </div>
              
              <div className="text-[10px] text-center text-slate-400 dark:text-white/40">
                💡 ข้อแนะนำ: สะดวกที่สุดสามารถกดปุ่ม "ดาวน์โหลด PDF" ไปบันทึกหรือปริ้นได้เลยครับ
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
