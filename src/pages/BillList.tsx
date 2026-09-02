import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Receipt, 
  Calendar as CalendarIcon, 
  ChevronRight, 
  Search, 
  Plus, 
  FileText,
  Image as ImageIcon,
  DollarSign,
  User,
  Filter,
  Loader2,
  X,
  Download,
  Maximize2,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getBills, Bill, getBillItems, BillItem } from '../services/billService';
import { useBottomSheet } from '../contexts/BottomSheetContext';

const formatBillDate = (dateStr: string) => {
  if (!dateStr) return 'ไม่ระบุวันที่';
  // Try to see if it's already a valid date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime()) && dateStr.includes('-')) {
    return date.toLocaleDateString('th-TH');
  }
  // Return original string if it looks like a manual date (e.g. 30/3/69)
  return dateStr;
};

function ImageModal({ imageUrl, onClose }: { imageUrl: string, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white z-10 backdrop-blur-md border border-white/10 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      
      <div className="absolute top-6 left-6 flex gap-2 z-10">
        <a 
          href={imageUrl} 
          download 
          target="_blank" 
          rel="noreferrer"
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md border border-white/10 transition-colors"
        >
          <Download className="w-6 h-6" />
        </a>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full h-full flex items-center justify-center"
      >
        <img 
          src={imageUrl} 
          alt="Full Bill" 
          className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </motion.div>
      
      <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none">
        <p className="px-4 py-2 bg-black/40 text-white/60 text-xs rounded-full backdrop-blur-md font-bold tracking-widest uppercase">
          แตะด้านนอกเพื่อปิด
        </p>
      </div>
    </motion.div>
  );
}

function BillHistoryRow({ 
  bill, 
  index, 
  onClick 
}: { 
  bill: Bill; 
  index: number; 
  onClick: () => void; 
}) {
  const [items, setItems] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadItems() {
      if (!bill.id) return;
      try {
        const data = await getBillItems(bill.id);
        if (isMounted) {
          setItems(data);
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) setLoading(false);
      }
    }
    loadItems();
    return () => {
      isMounted = false;
    };
  }, [bill.id]);

  // Determine category badge name based on item descriptions
  const getCategoryBadge = () => {
    if (loading) return 'กำลังโหลด...';
    if (items.length === 0) return 'วัตถุดิบฟาร์ม';
    
    const descriptions = items.map(it => it.description.toLowerCase());
    
    // Check keywords
    const hasFeed = descriptions.some(d => d.includes('อาหาร') || d.includes('รำ') || d.includes('กากถั่ว') || d.includes('ปลาป่น') || d.includes('เด่นรา') || d.includes('ปลายข้าว'));
    const hasMed = descriptions.some(d => d.includes('ยา') || d.includes('วัคซีน') || d.includes('วิตามิน') || d.includes('แอลกอฮอล์') || d.includes('สารเคมี') || d.includes('ฉีด'));
    const hasEquip = descriptions.some(d => d.includes('เข็ม') || d.includes('ไซริงค์') || d.includes('ถุงมือ') || d.includes('หลอด') || d.includes('อุปกรณ์') || d.includes('หลอดแก้ว') || d.includes('แท็ก'));

    const badges: string[] = [];
    if (hasFeed) badges.push('อาหารสัตว์');
    if (hasMed) badges.push('เวชภัณฑ์');
    if (hasEquip) badges.push('อุปกรณ์');
    
    return badges.length > 0 ? badges.join(' • ') : 'วัตถุดิบทั่วไป';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="bg-white/72 dark:bg-[#12254F]/72 backdrop-blur-xl p-5 rounded-[2.25rem] border border-white/60 dark:border-white/10 shadow-lg hover:shadow-xl dark:shadow-none active:scale-[0.98] transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        {/* Deep Navy Circular Icon */}
        <div className="w-12 h-12 bg-[#0E214B] rounded-full flex items-center justify-center text-[#00bcd4] border border-white/10 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
          <Receipt className="w-5.5 h-5.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-extrabold text-slate-950 dark:text-white truncate text-base leading-tight">
              {bill.vendorName}
            </h3>
            {bill.referenceNo && (
              <span className="text-[9px] px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-full text-slate-400 dark:text-white/40 font-black tracking-tight shrink-0 border border-slate-200/40 dark:border-white/5">
                {bill.referenceNo}
              </span>
            )}
          </div>
          
          {/* Material Category Label & Date info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 mt-1.5">
            <span className="text-[10px] font-black tracking-wide text-rose-500 dark:text-rose-400 bg-rose-500/10 border border-rose-500/10 dark:border-rose-400/20 px-2 py-0.5 rounded-full w-fit shrink-0 uppercase">
              {getCategoryBadge()}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              {formatBillDate(bill.billDate)}
            </span>
          </div>
        </div>

        {/* Clear Green/Red Net Total display */}
        <div className="text-right flex items-center gap-3 shrink-0">
          <div>
            <p className="text-base font-black text-rose-500 dark:text-rose-400 font-mono tracking-tight">
              - ฿{bill.totalAmount.toLocaleString()}
            </p>
            <p className="text-[9px] text-slate-400 dark:text-white/30 uppercase font-black tracking-widest">
              รายจ่าย
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 dark:text-white/20 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </div>
    </motion.div>
  );
}

function BillDetail({ bill }: { bill: Bill }) {
  const [items, setItems] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImageOpen, setIsImageOpen] = useState(false);

  useEffect(() => {
    async function fetchItems() {
      const data = await getBillItems(bill.id!);
      setItems(data);
      setLoading(false);
    }
    fetchItems();
  }, [bill.id]);

  return (
    <div className="p-1">
      <AnimatePresence>
        {isImageOpen && <ImageModal imageUrl={bill.imageUrl} onClose={() => setIsImageOpen(false)} />}
      </AnimatePresence>

      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <h3 className="text-xl font-black text-slate-900 dark:text-white">{bill.vendorName}</h3>
             {bill.referenceNo && (
               <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-white/10 rounded-lg text-slate-500 font-black">
                 {bill.referenceNo}
               </span>
             )}
          </div>
          <p className="text-sm text-slate-500 dark:text-white/50">{formatBillDate(bill.billDate)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase">ยอดรวม</p>
          <p className="text-2xl font-black text-emerald-500">฿{bill.totalAmount.toLocaleString()}</p>
        </div>
      </div>

      {bill.imageUrl && (
        <div 
          className="group relative mb-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 aspect-video bg-slate-100 dark:bg-white/5 flex items-center justify-center cursor-zoom-in"
          onClick={() => setIsImageOpen(true)}
        >
          <img 
            src={bill.imageUrl} 
            alt="Bill" 
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
            <div className="bg-white/90 dark:bg-black/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
               <Maximize2 className="w-5 h-5 text-slate-900 dark:text-white" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-3 text-slate-600 dark:text-white/70">
          <User className="w-4 h-4" />
          <span className="text-sm">บันทึกโดย: <span className="font-bold">{bill.recordedBy}</span></span>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-white/5 pt-4">
        <h4 className="text-sm font-black text-slate-400 uppercase mb-3 px-1">รายการสินค้า</h4>
        <div className="space-y-2">
          {loading ? (
             <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
             </div>
          ) : items.length === 0 ? (
            <p className="text-center text-slate-400 py-4 italic text-sm">ไม่มีข้อมูลรายการ</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{item.description}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-black">{item.quantity} Unit x ฿{item.pricePerUnit.toLocaleString()}</p>
                </div>
                <p className="font-black text-slate-900 dark:text-white">฿{item.total.toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function BillList() {
  const navigate = useNavigate();
  const { showBottomSheet } = useBottomSheet();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    const data = await getBills();
    setBills(data);
    setLoading(false);
  };

  const handleBillClick = (bill: Bill) => {
    showBottomSheet(<BillDetail bill={bill} />);
  };

  // Sort helper to sort bills latest first
  const parseDateForSorting = (dateStr: string) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  // Filter bills based on search input (only by date or referenceNo)
  const filteredBills = bills.filter(bill => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;
    
    const matchesDate = bill.billDate?.toLowerCase().includes(search);
    const matchesRef = bill.referenceNo?.toLowerCase().includes(search);
    
    return matchesDate || matchesRef;
  });

  // Calculate vendor groups based on ALL loaded bills (so they stay consistent)
  const vendorGroups = React.useMemo(() => {
    const groups: Record<string, { vendorName: string; billsCount: number; totalAmount: number; latestBillDate: string }> = {};
    
    bills.forEach(bill => {
      const vendor = bill.vendorName?.trim() || 'ไม่ระบุร้านค้า';
      if (!groups[vendor]) {
        groups[vendor] = {
          vendorName: vendor,
          billsCount: 0,
          totalAmount: 0,
          latestBillDate: ''
        };
      }
      groups[vendor].billsCount += 1;
      groups[vendor].totalAmount += bill.totalAmount;
      
      const billTime = parseDateForSorting(bill.billDate);
      const currentLatestTime = parseDateForSorting(groups[vendor].latestBillDate);
      if (!groups[vendor].latestBillDate || billTime > currentLatestTime) {
        groups[vendor].latestBillDate = bill.billDate;
      }
    });
    
    return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [bills]);

  // Determine which bills to show in the detailed bills list
  const billsToDisplay = React.useMemo(() => {
    return filteredBills.filter(bill => {
      if (selectedVendor) {
        const vendor = bill.vendorName?.trim() || 'ไม่ระบุร้านค้า';
        return vendor === selectedVendor;
      }
      return true;
    }).sort((a, b) => {
      return parseDateForSorting(b.billDate) - parseDateForSorting(a.billDate);
    });
  }, [filteredBills, selectedVendor]);

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-white pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-[#1e293b] sticky top-0 z-20 border-b border-slate-200 dark:border-white/5 shadow-sm">
        <div className="p-4 max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-emerald-500" />
              บันทึกรายจ่ายวัตถุดิบ
            </h1>
          </div>
          
          <button 
            onClick={() => navigate('/scan')}
            className="p-2 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-sm px-4 font-black flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> สแกนบิลใหม่
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4 max-w-4xl mx-auto">
          <div className="relative search-rainbow-border">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="ค้นหาตามวันที่ หรือ เลขอ้างอิง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl py-3 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="font-bold text-slate-400 animate-pulse uppercase tracking-wider">กำลังโหลดข้อมูลรายจ่าย...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
            <div className="w-20 h-20 bg-slate-200 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">ไม่มีประวัติรายจ่าย</h3>
            <p className="text-slate-500 dark:text-white/50 text-sm">เริ่มสแกนบิลสั่งซื้อวัตถุดิบเพื่อบันทึกต้นทุนฟาร์มของคุณ</p>
            <button 
              onClick={() => navigate('/scan')}
              className="mt-6 px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl active:scale-95 transition-all"
            >
              สแกนบิลรายจ่าย
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* View 1: Shop Groups (Only show when selectedVendor is null and searchTerm is empty) */}
            {!selectedVendor && !searchTerm && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    จัดกลุ่มตามชื่อร้านค้า ({vendorGroups.length} ร้านค้า)
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {vendorGroups.map((group, index) => (
                    <motion.div
                      key={group.vendorName}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => setSelectedVendor(group.vendorName)}
                      className="bg-white/72 dark:bg-[#12254F]/72 backdrop-blur-xl p-5 rounded-[2rem] border border-white/60 dark:border-white/10 shadow-md hover:shadow-xl dark:shadow-none active:scale-[0.98] transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-500/10 shrink-0 group-hover:scale-105 transition-transform">
                          <Store className="w-5.5 h-5.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-slate-950 dark:text-white truncate text-base leading-tight group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                            {group.vendorName}
                          </h3>
                          <p className="text-xs text-slate-400 dark:text-white/30 font-bold mt-1">
                            จำนวน {group.billsCount} บิลบอร์ด
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-white/30 font-black uppercase tracking-wider">ยอดจ่ายรวม</p>
                          <p className="text-sm font-black text-rose-500 dark:text-rose-400 font-mono">
                            - ฿{group.totalAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 dark:text-white/30 font-black uppercase tracking-wider">ล่าสุดเมื่อ</p>
                          <p className="text-[10px] font-bold text-slate-500 dark:text-white/50">
                            {formatBillDate(group.latestBillDate)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* View 2: Detailed bills of selected store OR global search results */}
            {(selectedVendor || searchTerm) && (
              <div className="space-y-3">
                
                {/* Navigation and context label */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    {selectedVendor && (
                      <button 
                        onClick={() => setSelectedVendor(null)}
                        className="p-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                        title="กลับไปหน้าจัดกลุ่มร้านค้า"
                      >
                        <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      </button>
                    )}
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">
                        {selectedVendor ? 'บิลของร้านค้า' : 'ผลการค้นหา'}
                      </p>
                      <h2 className="text-base font-black text-slate-800 dark:text-white mt-1 flex items-center gap-1.5">
                        {selectedVendor ? (
                          <>
                            <Store className="w-4 h-4 text-emerald-500" />
                            {selectedVendor}
                          </>
                        ) : (
                          `🔍 ค้นหา: "${searchTerm}"`
                        )}
                        <span className="text-xs font-bold text-slate-400 dark:text-white/40 ml-1 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                          {billsToDisplay.length} รายการ
                        </span>
                      </h2>
                    </div>
                  </div>
                  
                  {selectedVendor && (
                    <button 
                      onClick={() => setSelectedVendor(null)}
                      className="text-xs font-black text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-colors self-start sm:self-center"
                    >
                      ดูร้านค้าทั้งหมด
                    </button>
                  )}
                </div>

                {/* Main list of bills, sorted latest first */}
                {billsToDisplay.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-white/40 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/5">
                    <FileText className="w-8 h-8 text-slate-400 mb-2 opacity-50" />
                    <p className="font-bold text-slate-500 dark:text-white/40 text-sm">ไม่พบประวัติบิลที่สอดคล้องกับเงื่อนไข</p>
                    {searchTerm && (
                      <p className="text-[11px] text-slate-400 dark:text-white/25 mt-1">ทดลองค้นหาด้วยวันที่รูปแบบอื่นๆ หรือเลขอ้างอิงใบเสร็จ</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {billsToDisplay.map((bill, index) => (
                        <BillHistoryRow 
                          key={bill.id}
                          bill={bill}
                          index={index}
                          onClick={() => handleBillClick(bill)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
