import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea 
} from 'recharts';
import { 
  TrendingUp, Plus, Trash2, Calendar, DollarSign, FileText, 
  Info, Sparkles, Loader2, AlertCircle, Check, HelpCircle, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { HISTORICAL_PIG_PRICES, MONTH_NAMES_TH, HistoricalPigPrice } from '../../constants/historicalPigPrices';
import { OperationType, handleFirestoreError } from '../../lib/firestore-error';
import clsx from 'clsx';

interface PigPriceRecord {
  id: string; // `${year}_${month}`
  userId: string;
  year: number; // พ.ศ. เช่น 2569
  month: number; // 1-12
  price: number;
  memo: string;
  recordedBy: string;
  createdAt: number;
}

export default function PigPriceAnalysis() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Tab Selection
  const [activeTab, setActiveTab] = useState<'seasonal' | 'annual'>('seasonal');
  const [sliderYear, setSliderYear] = useState<number>(2568);
  const [isMultiYearMode, setIsMultiYearMode] = useState<boolean>(false);
  
  // Enhanced Interactive Chart States
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [showHighSeasonBand, setShowHighSeasonBand] = useState<boolean>(true);
  const [lineType, setLineType] = useState<'monotone' | 'linear'>('monotone');
  
  // Selection/Filtering of Years on Chart
  const [selectedYears, setSelectedYears] = useState<number[]>([2566, 2567, 2568, 2569]);
  
  // List state & Loading
  const [records, setRecords] = useState<PigPriceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load records on start
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'pig_prices'), orderBy('year', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // Filter out any invalid old weekly structures to prevent crash
      const validDocs = docsData.filter(d => typeof d.year === 'number' && typeof d.month === 'number') as PigPriceRecord[];
      
      // Build merged dataset in-memory (historical + user overridden)
      const mergedMap = new Map<string, PigPriceRecord>();

      // First, populate all standard historical prices as default entries
      HISTORICAL_PIG_PRICES.forEach(item => {
        for (let m = 1; m <= 12; m++) {
          const priceVal = item.months[m as keyof typeof item.months];
          if (priceVal !== undefined && priceVal !== null) {
            const key = `${item.year}_${m}`;
            mergedMap.set(key, {
              id: key,
              userId: 'historical_stats_seed',
              year: item.year,
              month: m,
              price: priceVal,
              recordedBy: 'สถิติสมาคมผู้เลี้ยงสุกร',
              createdAt: 0,
              memo: 'ข้อมูลสถิติราคาสุกรย้อนหลังรายเดือน'
            });
          }
        }
      });

      // Then overwrite/supplement with actual entries from Firestore
      validDocs.forEach(doc => {
        const key = `${doc.year}_${doc.month}`;
        mergedMap.set(key, doc);
      });

      const mergedList = Array.from(mergedMap.values());

      // Sort: Newest created/updated first for display table log
      const displaySorted = mergedList.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

      setRecords(displaySorted);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to pig_prices:", error);
      setErrorMsg("ไม่สามารถโหลดราคาสุกรได้ โปรดเช็คสิทธิ์ใช้งานระบบ");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Available unique years in records to let user choose
  const availableYears = useMemo(() => {
    return Array.from(new Set(records.map(r => r.year))).sort((a, b) => b - a);
  }, [records]);

  // Sync selectedYears checklist default once records populate
  useEffect(() => {
    if (availableYears.length > 0) {
      setSelectedYears(prev => {
        // Pre-select B.E. 2569, 2568, 2567, 2566 if they are present in the dataset and user hasn't toggled yet
        const defaultSet = [2569, 2568, 2567, 2566];
        const toSelect = defaultSet.filter(y => availableYears.includes(y));
        if (toSelect.length > 0 && prev.length === 4 && prev.includes(2566) && prev.includes(2567)) {
          return Array.from(new Set([...toSelect, ...availableYears.slice(0, 3)]));
        }
        return prev;
      });
    }
  }, [availableYears]);

  // Form month names map
  const MONTHS_TH_FULL: Record<number, string> = {
    1: 'มกราคม (Jan)',
    2: 'กุมภาพันธ์ (Feb)',
    3: 'มีนาคม (Mar)',
    4: 'เมษายน (Apr)',
    5: 'พฤษภาคม (May)',
    6: 'มิถุนายน (Jun)',
    7: 'กรกฎาคม (Jul)',
    8: 'สิงหาคม (Aug)',
    9: 'กันยายน (Sep)',
    10: 'ตุลาคม (Oct)',
    11: 'พฤศจิกายน (Nov)',
    12: 'ธันวาคม (Dec)'
  };

  // Convert/Format database records into Seasonal Chart data (12 Months always)
  const seasonalComparisonData = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
      const row: any = {
        monthNum: m,
        monthLabel: MONTH_NAMES_TH[m as keyof typeof MONTH_NAMES_TH],
      };
      records.forEach(rec => {
        if (rec.month === m) {
          row[`y_${rec.year}`] = rec.price;
        }
      });
      return row;
    });
  }, [records]);

  // Calculate average for each year for the Annual Trend Chart
  const annualTrendData = useMemo(() => {
    return Array.from(new Set(records.map(r => r.year)))
      .sort((a, b) => a - b) // oldest first
      .map(yr => {
        const yrRecs = records.filter(r => r.year === yr);
        const sum = yrRecs.reduce((acc, r) => acc + r.price, 0);
        const avg = yrRecs.length > 0 ? sum / yrRecs.length : 0;
        return {
          year: yr,
          yearLabel: `พ.ศ. ${yr}`,
          avgPrice: parseFloat(avg.toFixed(2)),
          recordCount: yrRecs.length
        };
      });
  }, [records]);

  const getYearColor = (year: number) => {
    const colors: Record<number, string> = {
      2569: '#06b6d4', // Bright Cyan for target year 2569
      2568: '#f43f5e', // Rose
      2567: '#10b981', // Emerald
      2566: '#3b82f6', // Blue
      2565: '#f97316', // Orange Accent
      2564: '#a855f7', // Purple
      2563: '#ec4899', // Pink
      2562: '#6366f1', // Indigo
      2561: '#14b8a6', // Teal
      2560: '#84cc16', // Lime
    };
    if (colors[year]) return colors[year];
    const fallbacks = ['#00bcd4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#3b82f6', '#14b8a6', '#6366f1'];
    return fallbacks[year % fallbacks.length];
  };

  // Handle submit (save monthly price / upsert)
  const handleSavePrice = async (year: number, month: number, priceNum: number, memoText: string): Promise<boolean> => {
    if (!user) {
      setErrorMsg('คุณไม่ได้รับอนุญาตให้บันทึกข้อมูล กรุณาเข้าระบบใหม่');
      return false;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const docId = `${year}_${month}`;

    try {
      const payload = {
        userId: user.uid,
        year: year,
        month: month,
        price: priceNum,
        memo: memoText.trim(),
        recordedBy: userProfile?.displayName || user.email || 'สัตวบาลผู้ดูแลฟาร์ม',
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'pig_prices', docId), payload);

      setSuccessMsg(`บันทึกราคาและอัปเดตสถิติเดือน ${MONTH_NAMES_TH[month as keyof typeof MONTH_NAMES_TH]} พ.ศ. ${year} เรียบร้อย!`);
      
      // Auto-insure that the saved year is ticked on chart
      if (!selectedYears.includes(year)) {
        setSelectedYears(prev => [...prev, year]);
      }

      setTimeout(() => setSuccessMsg(null), 4000);
      return true;
    } catch (err) {
      console.error("Error setting monthly price:", err);
      setErrorMsg('ไม่สามารถบันทึกข้อมูลได้ เนื่องจากติดขัดสิทธิ์การเขียนฐานข้อมูล');
      try {
        handleFirestoreError(err, OperationType.WRITE, `pig_prices/${docId}`);
      } catch {}
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Delete document
  const handleDelete = async (id: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบจุดราคาเดือนนี้? การลบข้อมูลนี้จะส่งผลต่อเส้นแนวโน้มในระบบทันที')) return;
    
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await deleteDoc(doc(db, 'pig_prices', id));
      setSuccessMsg('ลบรายการราคาเรียบร้อยแล้ว');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error("Error deleting record:", err);
      setErrorMsg('ไม่สามารถลบรายการได้ กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบระดับสิทธิ์');
      try {
        handleFirestoreError(err, OperationType.DELETE, `pig_prices/${id}`);
      } catch {}
    }
  };

  // Checkbox select/deselect year toggler
  const handleToggleYear = (year: number) => {
    if (selectedYears.includes(year)) {
      if (selectedYears.length > 1) {
        setSelectedYears(selectedYears.filter(y => y !== year));
      } else {
        setErrorMsg('โปรดคงเส้นกราฟเปรียบเทียบไว้อย่างน้อย 1 ปีเพื่อการแสดงผล');
        setTimeout(() => setErrorMsg(null), 3000);
      }
    } else {
      setSelectedYears([...selectedYears, year]);
    }
  };

  // Custom Seasonal Tooltip with price rank sorting and deviation percentages
  const CustomSeasonalTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find 2569 baseline price
      const baselineItem = payload.find((p: any) => p.dataKey === 'y_2569');
      const baselinePrice = baselineItem ? Number(baselineItem.value) : null;

      // Sort payload descending by price to rank years
      const sortedPayload = [...payload].sort((a: any, b: any) => Number(b.value) - Number(a.value));

      return (
        <div className="bg-white dark:bg-[#1a2f3a] p-3.5 border border-cyan-500/25 dark:border-white/10 rounded-2xl shadow-2xl font-sans text-xs min-w-[270px] max-h-[350px] overflow-y-auto scrollbar-thin pointer-events-none">
          <p className="font-extrabold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-2 mb-2 flex items-center justify-between gap-1">
            <span>📅 ค่าเดือน: {label}</span>
            <span className="text-[10px] text-slate-400 font-bold">ราคา สูง ➔ ต่ำ</span>
          </p>
          <div className="space-y-1.5 pt-1">
            {sortedPayload.map((p: any, idx) => {
              const yearNum = parseInt(p.dataKey.replace('y_', ''));
              const isTargetYear = yearNum === 2569;
              const priceVal = Number(p.value);
              
              // Calculate difference from 2569 baseline
              let diffElement = null;
              if (baselinePrice && !isTargetYear) {
                const delta = priceVal - baselinePrice;
                const pct = (delta / baselinePrice) * 100;
                const isHigher = delta > 0;
                diffElement = (
                  <span className={clsx(
                    "text-[9px] font-black ml-1 px-1 py-0.2 rounded font-mono",
                    isHigher 
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" 
                      : "text-rose-600 dark:text-rose-400 bg-rose-500/10"
                  )}>
                    {isHigher ? `+฿${delta.toFixed(1)} (+${pct.toFixed(1)}%)` : `฿${delta.toFixed(1)} (${pct.toFixed(1)}%)`}
                  </span>
                );
              }

              return (
                <div 
                  key={p.dataKey} 
                  className={clsx(
                    "flex flex-col gap-0.5 p-1.5 rounded-xl border transition-all",
                    isTargetYear 
                      ? "bg-cyan-500/5 dark:bg-cyan-500/10 border-cyan-500/30 font-bold shadow-sm" 
                      : hoveredYear === yearNum
                        ? "bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/20" 
                        : "border-transparent"
                  )}
                  onMouseEnter={() => setHoveredYear(yearNum)}
                  onMouseLeave={() => setHoveredYear(null)}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.stroke }} />
                      <span className="font-mono text-[9px] text-slate-400 font-bold mr-0.5">#{idx + 1}</span>
                      พ.ศ. {yearNum}
                      {isTargetYear && (
                        <span className="text-[8px] bg-cyan-600/15 text-cyan-600 dark:text-cyan-400 px-1 rounded-md font-bold">
                          ปีนี้
                        </span>
                      )}
                      {idx === 0 && (
                        <span className="text-[8px] bg-amber-500/10 text-amber-650 dark:text-amber-400 px-1 rounded-md font-bold">
                          สูงสุด
                        </span>
                      )}
                      {idx === sortedPayload.length - 1 && sortedPayload.length > 1 && (
                        <span className="text-[8px] bg-slate-400/10 text-slate-650 dark:text-slate-400 px-1 rounded-md font-bold">
                          ต่ำสุด
                        </span>
                      )}
                    </span>
                    <span className="font-black flex items-center font-mono" style={{ color: p.stroke }}>
                      ฿{priceVal.toFixed(2)}
                    </span>
                  </div>
                  {diffElement && (
                    <div className="flex justify-end text-[9px] text-slate-400 font-semibold gap-1 mt-0.5">
                      <span>เทียบปีนี้:</span>
                      {diffElement}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Annual Tooltip
  const CustomAnnualTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[#1a2f3a] p-4 border border-cyan-500/15 dark:border-white/10 rounded-2xl shadow-xl font-sans text-xs min-w-[200px] pointer-events-none">
          <p className="font-extrabold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-1.5 mb-2.5 flex items-center gap-1">
            <span>📅 {label}</span>
          </p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-500 dark:text-slate-400">ราคาเฉลี่ยทั้งปี:</span>
              <span className="font-extrabold text-[#00bcd4] font-mono text-sm">฿{data.avgPrice.toFixed(2)}/กก.</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-500 dark:text-slate-400">จำนวนที่บันทึก:</span>
              <span className="font-bold text-slate-600 dark:text-slate-300">{data.recordCount} เดือน</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Older years list excluding the target select year (usually 2569)
  const olderYearsList = useMemo(() => {
    return availableYears.filter(y => y !== 2569).sort((a, b) => a - b);
  }, [availableYears]);

  const minOlderYear = useMemo(() => {
    return olderYearsList.length > 0 ? olderYearsList[0] : 2540;
  }, [olderYearsList]);

  const maxOlderYear = useMemo(() => {
    return olderYearsList.length > 0 ? olderYearsList[olderYearsList.length - 1] : 2568;
  }, [olderYearsList]);

  // The actual years that will be drawn on the seasonal comparison line chart
  const displayedYearsForSeasonal = useMemo(() => {
    return isMultiYearMode ? selectedYears : [...new Set([2569, sliderYear])];
  }, [isMultiYearMode, selectedYears, sliderYear]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 content-area pb-32 animate-in fade-in duration-300 font-sans">
      
      {/* Top Navigation */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/')}
          className="group flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-905 hover:bg-slate-200/80 dark:hover:text-white bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl border border-slate-200/50 dark:border-white/5 transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#00bcd4] group-hover:-translate-x-0.5 transition-transform" />
          <span>กลับหน้าหลัก (Dashboard)</span>
        </button>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-[#00bcd4]" />
            วิเคราะห์แนวโน้มราคาสุกร (Seasonal Price Analysis)
          </h2>
          <p className="text-sm font-semibold text-slate-500 dark:text-white/50 mt-1">
            ฐานข้อมูลราคาสุกรรายเดือนย้อนหลัง 2540-2566 และบันทึกราคาปัจจุบัน พ.ศ. 2569 เพื่อวิเคราะห์ฤดูกาลราคา High/Low Season
          </p>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-bold">{errorMsg}</p>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-100/50 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center gap-3 text-sm animate-bounce">
          <Sparkles className="w-5 h-5 shrink-0 text-amber-500" />
          <p className="font-black">{successMsg}</p>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graph Section: Col Span 2 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/80 dark:bg-[#1a2f3a]/80 backdrop-blur-xl border border-blue-100/20 dark:border-white/10 rounded-[2rem] p-5 shadow-xl shadow-slate-200/20 dark:shadow-none min-h-[460px] flex flex-col">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveTab('seasonal')}
                  className={clsx(
                    "px-3.5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 border",
                    activeTab === 'seasonal'
                      ? "bg-cyan-500/10 border-cyan-500/20 text-[#00bcd4]"
                      : "bg-slate-100/50 dark:bg-white/5 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  )}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>ดัชนีฤดูกาลรายเดือน (Seasonal cycles)</span>
                </button>
                <button
                  onClick={() => setActiveTab('annual')}
                  className={clsx(
                    "px-3.5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 border",
                    activeTab === 'annual'
                      ? "bg-cyan-500/10 border-cyan-500/20 text-[#00bcd4]"
                      : "bg-slate-100/50 dark:bg-white/5 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>แนวโน้มราคาสุกรรายปี (Annual averages)</span>
                </button>
              </div>
              <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                <Info className="w-3.5 h-3.5 text-[#00bcd4]" />
                {activeTab === 'seasonal' ? 'เปรียบเทียบวงไตรมาสย้อนหลัง' : 'ราคาสถิติเฉลี่ยรายรอบปี'}
              </div>
            </div>

            {/* Year Slider controls - visible in Seasonal index comparison mode */}
            {activeTab === 'seasonal' && (
              <div className="mb-5 p-4 bg-slate-50/70 dark:bg-black/10 border border-slate-100/80 dark:border-white/5 rounded-3xl space-y-3 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span>🎚️ สไลด์เพื่อปรับเทียบวงจรปี</span>
                      <span className="text-xs text-[#00bcd4] bg-[#00bcd4]/10 px-2 py-0.5 rounded-md font-extrabold font-mono">
                        พ.ศ. {sliderYear}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                      เปรียบเทียบกับราคาเส้นหลักของปีปัจจุบัน (เส้นสีฟ้าเด่น พ.ศ. 2569)
                    </p>
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={isMultiYearMode}
                      onChange={(e) => setIsMultiYearMode(e.target.checked)}
                      className="w-3.5 h-3.5 text-cyan-500 border-gray-300 rounded focus:ring-cyan-500 accent-[#00bcd4]"
                    />
                    <span>เปรียบเทียบหลายปีพร้อมกัน (Multi-select)</span>
                  </label>
                </div>

                {!isMultiYearMode ? (
                  <div className="space-y-1.5 py-2">
                    <input
                      type="range"
                      min={minOlderYear}
                      max={maxOlderYear}
                      value={sliderYear}
                      onMouseEnter={() => setHoveredYear(sliderYear)}
                      onMouseLeave={() => setHoveredYear(null)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setSliderYear(val);
                        setHoveredYear(val);
                      }}
                      className="w-full h-2 bg-slate-200 dark:bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#00bcd4]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-extrabold font-mono px-0.5">
                      <span>พ.ศ. {minOlderYear}</span>
                      <span>พ.ศ. 2550</span>
                      <span>พ.ศ. 2560</span>
                      <span>พ.ศ. {maxOlderYear}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-[85px] overflow-y-auto p-1.5 bg-white dark:bg-[#112430] rounded-2xl border border-slate-100 dark:border-white/5 scrollbar-thin">
                    {availableYears.length === 0 ? (
                      <span className="text-xs font-semibold text-slate-400 italic px-2 py-1">กำลังโหลดข้อมูลดึงสิทธิ์ตัวแท็ก...</span>
                    ) : (
                      availableYears.map(yr => {
                        const active = selectedYears.includes(yr);
                        const dotClr = getYearColor(yr);
                        const isHovered = hoveredYear === yr;
                        return (
                          <button
                            key={yr}
                            onClick={() => handleToggleYear(yr)}
                            onMouseEnter={() => setHoveredYear(yr)}
                            onMouseLeave={() => setHoveredYear(null)}
                            className={clsx(
                              "px-2.5 py-1 text-xs font-black rounded-xl cursor-pointer border transition-all active:scale-95 flex items-center gap-1.5 shrink-0",
                              active 
                                ? "bg-white dark:bg-[#112430] border-slate-300 dark:border-white/20 text-slate-800 dark:text-white shadow-sm"
                                : "bg-slate-100/50 dark:bg-white/5 border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                            )}
                            style={isHovered ? { borderColor: dotClr, boxShadow: `0 0 8px ${dotClr}30`, transform: 'translateY(-1px)' } : undefined}
                          >
                            <span 
                              className={clsx("w-2 h-2 rounded-full shrink-0 transition-transform", active ? "scale-100 animate-pulse" : "scale-75")} 
                              style={{ backgroundColor: active ? dotClr : '#94a3b8' }} 
                            />
                            <span>พ.ศ. {yr}</span>
                            {active && <Check className="w-3 h-3 text-[#00bcd4] shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Analytical Helper Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-dashed border-slate-200 dark:border-white/10 text-[11px]">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-slate-400 dark:text-slate-500">ฟังก์ชันวิเคราะห์เสริม:</span>
                    
                    <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-slate-610 dark:text-slate-350 hover:text-rose-500 transition-colors">
                      <input
                        type="checkbox"
                        checked={showHighSeasonBand}
                        onChange={(e) => setShowHighSeasonBand(e.target.checked)}
                        className="w-3.5 h-3.5 text-rose-550 border-gray-300 rounded focus:ring-rose-500 accent-rose-500"
                      />
                      <span>⛱️ ไฮไลท์ช่วงโรคระบาด/มรสุม (พ.ค. - ส.ค.)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-slate-610 dark:text-slate-350 hover:text-cyan-500 transition-colors">
                      <input
                        type="checkbox"
                        checked={lineType === 'monotone'}
                        onChange={(e) => setLineType(e.target.checked ? 'monotone' : 'linear')}
                        className="w-3.5 h-3.5 text-cyan-500 border-gray-300 rounded focus:ring-cyan-500 accent-[#00bcd4]"
                      />
                      <span>📈 โหมดเส้นโค้งมน (Smooth Curve)</span>
                    </label>
                  </div>

                  {hoveredYear !== null && (
                    <div className="bg-[#00bcd4]/10 border border-[#00bcd4]/20 text-[#00bcd4] px-2.5 py-0.5 rounded-full font-black animate-pulse">
                      โฟกัสอยู่: ปี พ.ศ. {hoveredYear}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Line graph views */}
            {activeTab === 'seasonal' ? (
              loading ? (
                <div className="flex-1 flex flex-col justify-center items-center py-24 gap-3">
                  <Loader2 className="w-10 h-10 text-[#00bcd4] animate-spin" />
                  <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">กำลังสืบค้นสถิติราคาเพื่อวาดวงจรฤดูกาล...</p>
                </div>
              ) : records.length > 0 ? (
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart
                      data={seasonalComparisonData}
                      margin={{ top: 12, right: 10, left: -22, bottom: 0 }}
                      onMouseLeave={() => setHoveredYear(null)}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.12)" />
                      {showHighSeasonBand && (
                        <ReferenceArea 
                          x1={MONTH_NAMES_TH[5]} 
                          x2={MONTH_NAMES_TH[8]} 
                          fill="rgba(244, 63, 94, 0.04)" 
                          label={{ 
                            value: "⛱️ ช่วงโรคระบาดน้ำท่วม (Risk Season)", 
                            fill: "#f43f5e", 
                            fontSize: 10, 
                            fontWeight: 'bold', 
                            position: "insideTopLeft" 
                          }} 
                        />
                      )}
                      <XAxis 
                        dataKey="monthLabel" 
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomSeasonalTooltip />} position={{ x: 50, y: 0 }} />
                      
                      {displayedYearsForSeasonal.map(yr => {
                        const isCurrentYear = yr === 2569;
                        const isHovered = hoveredYear === yr;
                        const isAnyHovered = hoveredYear !== null;
                        
                        const strokeColor = getYearColor(yr);
                        const opacity = isAnyHovered 
                          ? (isHovered ? 1.0 : (isCurrentYear ? 0.35 : 0.08)) 
                          : 1.0;
                        const strokeWidth = isHovered 
                          ? (isCurrentYear ? 5 : 4) 
                          : (isCurrentYear ? 3.5 : 2);

                        return (
                          <Line
                            key={yr}
                            type={lineType}
                            dataKey={`y_${yr}`}
                            name={`พ.ศ. ${yr}`}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            strokeOpacity={opacity}
                            dot={{ 
                              r: isCurrentYear ? 4.5 : 2.5, 
                              strokeWidth: 1, 
                              fill: strokeColor,
                              fillOpacity: opacity,
                              strokeOpacity: opacity
                            }}
                            activeDot={{ r: 6.5 }}
                            connectNulls={true}
                            onMouseEnter={() => setHoveredYear(yr)}
                            onMouseLeave={() => setHoveredYear(null)}
                            isAnimationActive={false}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200/60 dark:border-white/5 rounded-[1.5rem] bg-slate-50/30 dark:bg-transparent">
                  <TrendingUp className="w-14 h-14 text-slate-300 dark:text-white/20 mb-3" />
                  <p className="text-slate-500 dark:text-white/50 font-black text-base max-w-[280px]">ไม่มีข้อมูลในระบบในการคำนวณวงจรกราฟ</p>
                  <p className="text-xs text-slate-400 dark:text-white/40 mt-1 max-w-[240px]">ระบบจะทำการดึงข้อมูลชุดสมาคมอัตโนมัติหากหน้าจอโหลดสมบูรณ์</p>
                </div>
              )
            ) : (
              /* TAB: ANNUAL TRENDS LIST VIEW */
              loading ? (
                <div className="flex-1 flex flex-col justify-center items-center py-24 gap-3">
                  <Loader2 className="w-10 h-10 text-[#00bcd4] animate-spin" />
                  <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">กำลังคำนวณราคาเฉลี่ยวิเคราะห์แนวโน้มรายปี...</p>
                </div>
              ) : annualTrendData.length > 0 ? (
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart
                      data={annualTrendData}
                      margin={{ top: 12, right: 10, left: -22, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.12)" />
                      <XAxis 
                        dataKey="yearLabel" 
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomAnnualTooltip />} position={{ x: 50, y: 0 }} />
                      <Line
                        type="monotone"
                        dataKey="avgPrice"
                        name="ราคาเฉลี่ยทั้งปี"
                        stroke="#06b6d4"
                        strokeWidth={3}
                        dot={{ r: 4.5, strokeWidth: 1, fill: '#06b6d4' }}
                        activeDot={{ r: 6.5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200/60 dark:border-white/5 rounded-[1.5rem] bg-slate-50/30 dark:bg-transparent">
                  <Calendar className="w-14 h-14 text-slate-300 dark:text-white/20 mb-3" />
                  <p className="text-slate-500 dark:text-white/50 font-black text-base max-w-[280px]">ไม่มีข้อมูลในการวิเคราะห์ทศวรรษแนวโน้ม</p>
                </div>
              )
            )}
          </div>

          {/* Guidelines info card */}
          <GuidelinesCard />
        </div>

        {/* Input Form Section & Log list: Col Span 1 */}
        <div className="space-y-6">
          
          {/* Data Log Form */}
          <DataLogForm onSave={handleSavePrice} submitting={submitting} />

          {/* Monthly Log Entries */}
          <MonthlyLogEntries 
            records={records} 
            getYearColor={getYearColor} 
            handleDelete={handleDelete} 
            loading={loading} 
          />

        </div>

      </div>

    </div>
  );
}

// ==========================================
// MEMOIZED PERFORMANCE-TUNED SUBCOMPONENTS
// ==========================================

const GuidelinesCard = React.memo(() => {
  return (
    <div className="bg-gradient-to-r from-[#00bcd4]/10 to-indigo-500/5 dark:from-[#00bcd4]/5 border border-blue-100/10 dark:border-white/5 rounded-2xl p-4 flex gap-3 text-slate-600 dark:text-white/70">
      <Info className="w-5 h-5 text-[#00bcd4] shrink-0 mt-0.5" />
      <div className="text-xs md:text-sm font-medium leading-relaxed">
        <p className="font-extrabold text-slate-900 dark:text-white mb-1.5 bg-white/20 px-2 py-0.5 rounded-md inline-block">วิเคราะห์วงรอบดัชนีฤดูกาล (Seasonal Index):</p>
        <p>ราคาของสุกรจะเคลื่อนไหวตามสภาวะอุปสงค์อุปสรรคของแต่ละเดือน กล่าวคือ ในช่วง <strong className="text-rose-500 dark:text-rose-400">พ.ค. - ส.ค. (High Season)</strong> มักเป็นฤดูที่ปริมาณหมูโตเต็มที่ออกสู่ตลาดอย่างสม่ำเสมอ แต่อาจมีพายุฝนทำให้เกิดโรค ส่วนช่วงปลายปีและต้นปีมักเกิดโรคแปรปรวน แตะกราฟเพื่อวิเคราะห์ว่าปีปัจจุบัน พ.ศ. 2569 กำลังวิ่งอยู่เหนือหรือต่ำกว่าค่าความคุ้นชินของอดีต เพื่อจัดการจังหวะจับขายอย่างเหมาะสมที่สุด</p>
      </div>
    </div>
  );
});
GuidelinesCard.displayName = 'GuidelinesCard';


interface DataLogFormProps {
  onSave: (year: number, month: number, price: number, memoText: string) => Promise<boolean>;
  submitting: boolean;
}

const DataLogForm = React.memo(({ onSave, submitting }: DataLogFormProps) => {
  const [selectedYear, setSelectedYear] = useState<number>(2569);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [price, setPrice] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setLocalError('กรุณากรอกราคาสุกรให้ถูกต้องเป็นตัวเลขมากกว่า 0 บาท/กก.');
      return;
    }
    const priceNum = parseFloat(price);
    const success = await onSave(selectedYear, selectedMonth, priceNum, memo);
    if (success) {
      setPrice('');
      setMemo('');
    }
  };

  return (
    <div className="bg-white/80 dark:bg-[#1a2f3a]/80 backdrop-blur-xl border border-blue-100/20 dark:border-white/10 rounded-[2rem] p-6 shadow-xl shadow-slate-200/20 dark:shadow-none">
      <div className="mb-4">
        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#00bcd4]" />
          บันทึกราคารายเดือนใหม่ (พ.ศ. 2569)
        </h3>
        <p className="text-[11px] text-slate-400 dark:text-slate-400 font-semibold mt-1">
          กรอกหรือคีย์ราคาแทรกแก้ไขของแต่ละเดือนเพื่อสะสมในฐานข้อมูลระบบ
        </p>
      </div>

      {localError && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-1.5">ปี พ.ศ. ที่ต้องการ</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3.5 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-800 dark:text-white font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/30"
            >
              {Array.from({ length: 11 }, (_, i) => 2566 + i).map(n => (
                <option key={n} value={n} className="bg-white dark:bg-[#1a2f3a] text-slate-800 dark:text-white font-bold">พ.ศ. {n}</option>
              ))}
              <option value={2565} className="bg-white dark:bg-[#1a2f3a] text-slate-800 dark:text-white font-bold">พ.ศ. 2565</option>
              <option value={2564} className="bg-white dark:bg-[#1a2f3a] text-slate-800 dark:text-white font-bold">พ.ศ. 2564</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-1.5">เดือนสถิติ</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3.5 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-800 dark:text-white font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/30"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m} className="bg-white dark:bg-[#1a2f3a] text-slate-800 dark:text-white font-bold">
                  {MONTH_NAMES_TH[m as keyof typeof MONTH_NAMES_TH]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-1.5">ราคาประกาศสมาคม (บาท / กิโลกรัม)</label>
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              type="number"
              step="0.01"
              placeholder="เช่น 78.50"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="w-full pl-10.5 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-800 dark:text-white font-black text-sm focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-1.5">บันทึกช่วยจำสถานะ (ถ้ามี)</label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
            <textarea
              placeholder="เช่น ตลาดสลบเนื่องจากเนื้อสุกรลักลอบนำเข้าฟื้นตัว..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full pl-10.5 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-800 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/30"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-[#00bcd4] hover:bg-[#008ba3] dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-[#00bcd4]/15 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-55"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>กำลังส่งข้อมูลสถิติ...</span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              <span>บันทึกเพื่อวิเคราะห์และเปรียบเทียบ</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
});
DataLogForm.displayName = 'DataLogForm';


interface MonthlyLogEntriesProps {
  records: PigPriceRecord[];
  getYearColor: (yr: number) => string;
  handleDelete: (id: string) => void;
  loading: boolean;
}

const MonthlyLogEntries = React.memo(({ records, getYearColor, handleDelete, loading }: MonthlyLogEntriesProps) => {
  return (
    <div className="bg-white/80 dark:bg-[#1a2f3a]/80 backdrop-blur-xl border border-blue-100/20 dark:border-white/10 rounded-[2rem] p-5 shadow-xl shadow-slate-200/20 dark:shadow-none flex flex-col max-h-[380px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
          <Calendar className="w-4.5 h-4.5 text-[#00bcd4]" />
          รายการในระบบจำแนกรายเดือน ({records.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : records.length > 0 ? (
          records.slice(0, 150).map((item) => {
            return (
              <div 
                key={item.id}
                className="group p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-150 dark:border-white/5/60 transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-extrabold text-slate-800 dark:text-white text-sm">
                      ฿{item.price.toFixed(2)}/กก.
                    </p>
                    <span 
                      className="text-[10px] font-black text-white px-2 py-0.5 rounded-lg shrink-0" 
                      style={{ backgroundColor: getYearColor(item.year) }}
                    >
                      {MONTH_NAMES_TH[item.month as keyof typeof MONTH_NAMES_TH]} {item.year}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/40 truncate font-semibold">
                    {item.memo || 'ประวัติสมาคมผู้เลี้ยงฯ'}
                  </p>
                </div>
                
                {/* Show delete buttons only for current/custom additions by staff to keep the system robust */}
                {item.userId !== 'historical_stats_seed' && item.userId !== 'system_seed_auth' ? (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    title="ลบสถิติงวดเดือนนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-[9px] font-bold text-slate-450 dark:text-slate-600 uppercase select-none">
                    LOCK
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs font-semibold">
            ไม่มีประวัติการบันทึกงวด
          </div>
        )}
      </div>
    </div>
  );
});
MonthlyLogEntries.displayName = 'MonthlyLogEntries';
