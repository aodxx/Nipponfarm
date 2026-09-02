import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, AlertCircle, CalendarClock, ChevronRight, Activity, Baby, Info, MessageCircle, Heart, Stethoscope, Truck, Syringe, CalendarDays, TrendingUp, Receipt, Wrench, ChevronDown, ChevronUp, Eye, EyeOff, Maximize2, Minimize2, TrendingDown, Sparkles, Loader2, Plus, X, Check, FileText, Wallet } from 'lucide-react';
import { subscribeToSows, subscribeToAllPendingTasks } from '../services/sowService';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import { Sow, Task, PayrollSlip } from '../types';
import { isToday, isPast, parseISO, isBefore, startOfToday, format, isTomorrow } from 'date-fns';
import { th } from 'date-fns/locale';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import PigLogo from '../components/PigLogo';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, writeBatch } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, AreaChart, Area } from 'recharts';
import { HISTORICAL_PIG_PRICES, MONTH_NAMES_TH, HistoricalPigPrice } from '../constants/historicalPigPrices';
import { OperationType, handleFirestoreError } from '../lib/firestore-error';
import { Bill, BillItem } from '../services/billService';
import MetricsCarousel from '../components/MetricsCarousel';

export default function Dashboard() {
  const navigate = useNavigate();
  const { userProfile, user } = useAuth();
  const [sows, setSows] = useState<Sow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sowsLoading, setSowsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [errorMSG, setErrorMSG] = useState<string | null>(null);
  const { showSuccess, showError, showLoading, hideLoading } = useBottomSheet();

  // Seasonal Pig price chart selected years state (default 2566, 2567, 2568, 2569)
  const [selectedYears, setSelectedYears] = useState<number[]>([2566, 2567, 2568, 2569]);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  // Quick Price Record States
  const [isQuickPriceModalOpen, setIsQuickPriceModalOpen] = useState(false);
  const [quickYear, setQuickYear] = useState<number>(2569);
  const [quickMonth, setQuickMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [quickPrice, setQuickPrice] = useState<string>('');
  const [quickMemo, setQuickMemo] = useState<string>('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  // Quick report and history tabs states
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses' | 'maintenance'>('sales');
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [recentMaintenance, setRecentMaintenance] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState({ sales: true, expenses: true, maintenance: true });

  // Pig price stats on dashboard
  const [pigPriceRecords, setPigPriceRecords] = useState<any[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  
  // New States for supplies/feed/medicine price chart
  const [dashboardActiveTab, setDashboardActiveTab] = useState<'swine' | 'supplies' | 'expenses_payroll' | 'income_sales'>('swine');
  const [selectedSupplyItem, setSelectedSupplyItem] = useState<string>('กากถั่วเหลือง(Tvo)');
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [allBillItems, setAllBillItems] = useState<BillItem[]>([]);
  const [allPayrollSlips, setAllPayrollSlips] = useState<PayrollSlip[]>([]);
  const [allSales, setAllSales] = useState<any[]>([]);
  const [selectedExpensesYear, setSelectedExpensesYear] = useState<number>(() => new Date().getFullYear());
  const [selectedIncomeYear, setSelectedIncomeYear] = useState<number>(() => new Date().getFullYear());
  
  // Track which roadmap step is expanded (1, 2, 3, or 4). Default is 3 (pre-natal farrowing move)
  const [expandedStep, setExpandedStep] = useState<number | null>(3);

  const [isPriceCardVisible, setIsPriceCardVisible] = useState(() => {
    const saved = localStorage.getItem('nipon_farm_price_visible');
    return saved !== null ? saved === 'true' : true;
  });
  const [isPriceCardExpanded, setIsPriceCardExpanded] = useState(() => {
    const saved = localStorage.getItem('nipon_farm_price_expanded');
    return saved !== null ? saved === 'true' : false; // default is compact to prevent clutter
  });

  // Helper to parse year from dates (supports ISO YYYY-MM-DD or custom formats)
  const getYearFromDateStr = (dateStr: string): number => {
    if (!dateStr) return 0;
    const match = dateStr.match(/^(\d{4})/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 0;
  };

  // Helper to parse month from dates
  const getMonthFromDateStr = (dateStr: string): number => {
    if (!dateStr) return 1;
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const m = parseInt(parts[1], 10);
      if (!isNaN(m) && m >= 1 && m <= 12) return m;
    }
    const slashParts = dateStr.split('/');
    if (slashParts.length >= 2) {
      const m = parseInt(slashParts[1], 10);
      if (!isNaN(m) && m >= 1 && m <= 12) return m;
    }
    return 1;
  };

  // Smart fuzzy matching helper for pig farm feed and medicine items
  const checkProductMatch = (itemDesc: string, selected: string): boolean => {
    const cleanItem = itemDesc.trim().toLowerCase();
    const cleanSel = selected.trim().toLowerCase();
    if (cleanItem === cleanSel) return true;
    if (cleanItem.includes(cleanSel) || cleanSel.includes(cleanItem)) return true;
    
    // Custom mappings for standard pig farm categories
    if (selected === "กากถั่วเหลือง(Tvo)") {
      const keywords = ["กากถั่วเหลือง", "tvo", "กากถั่ว", "ถั่วเหลืองบด"];
      return keywords.some(kw => cleanItem.includes(kw));
    }
    if (selected === "วัน-มิกซ์(One-Mix)") {
      const keywords = ["one-mix", "วันมิกซ์", "วัน มิกซ์", "1-mix", "onemix"];
      return keywords.some(kw => cleanItem.includes(kw));
    }
    if (selected === "ปลายข้าว (บดละเอียด)") {
      const keywords = ["ปลายข้าว (บดละเอียด)", "ปลายบด", "ปลายละเอียด", "ปลายข้าวบด", "ปลายบดละเอียด"];
      return keywords.some(kw => cleanItem.includes(kw));
    }
    if (selected === "ปลายข้าว (เมล็ด)") {
      const keywords = ["ปลายข้าว (เมล็ด)", "ปลายเมล็ด", "ปลายข้าวเม็ด", "ปลายหยาบ"];
      return keywords.some(kw => cleanItem.includes(kw));
    }
    if (selected === "รำ") {
      const keywords = ["รำ", "รำละเอียด", "รำหยาบ", "รำข้าว"];
      return keywords.some(kw => cleanItem.includes(kw));
    }
    if (selected === "แอสไทมูลิน10") {
      const keywords = ["แอสไท", "แอสไทมูลิน", "astymulin", "astymulin10"];
      return keywords.some(kw => cleanItem.includes(kw));
    }
    if (selected === "ไซลีน โมโนไฮโดรคลอ") {
      const keywords = ["ไซลีน", "ไซลีนโมโน", "xylene", "ไซลีน โมโน"];
      return keywords.some(kw => cleanItem.includes(kw));
    }
    if (selected === "โปรแลค มอร์") {
      const keywords = ["โปรแลค", "prolac", "โปรแลคมอร์"];
      return keywords.some(kw => cleanItem.includes(kw));
    }
    if (selected === "วันฟรีมิกซ์") {
      const keywords = ["วันฟรี", "วันพรี", "one free", "วันฟรีมิกซ์"];
      return keywords.some(kw => cleanItem.includes(kw));
    }
    if (selected === "นม") {
      const keywords = ["นมผง", "นมวัว", "นมเลี้ยงหมู", "นม"];
      return cleanItem === "นม" || cleanItem.includes("นมผง") || cleanItem.includes("นมวัว") || cleanItem.includes("นมเลี้ยง");
    }
    if (selected === "วิตามินรวม") {
      const keywords = ["วิตามิน", "ยาบำรุง", "vitรวม", "vit"];
      return keywords.some(kw => cleanItem.includes(kw));
    }
    
    return false;
  };

  // Extract unique items for the dropdown selector dynamically or default recommendations
  const supplyItemOptions = useMemo(() => {
    const items = new Set<string>();
    
    // Add standard 15 farm items as the premium baseline options
    const standardBaseline = [
      "กากถั่วเหลือง(Tvo)",
      "ปลายข้าว (บดละเอียด)",
      "ปลายข้าว (เมล็ด)",
      "ข้าวโพด",
      "ถั่วอบ",
      "รำ",
      "ปลาบด",
      "วิตามินรวม",
      "เกลือ",
      "ไซลีน โมโนไฮโดรคลอ",
      "แอสไทมูลิน10",
      "วัน-มิกซ์(One-Mix)",
      "โปรแลค มอร์",
      "วันฟรีมิกซ์",
      "นม"
    ];
    
    standardBaseline.forEach(p => items.add(p));
    
    // Add any other user-custom items scanned from receipts that aren't already in standard
    allBillItems.forEach(item => {
      if (item.description && item.description.trim().length > 0) {
        // Find if this item matches any standard item first, to avoid duplicate listings
        const isStandardMatched = standardBaseline.some(std => checkProductMatch(item.description, std));
        if (!isStandardMatched) {
          items.add(item.description.trim());
        }
      }
    });
    
    return Array.from(items);
  }, [allBillItems]);

  // Find unique vendors for the selected supply item in current year
  const matchedVendors = useMemo(() => {
    const vendors = new Set<string>();
    const currentADYear = new Date().getFullYear();

    allBillItems.forEach(item => {
      const parentBill = allBills.find(b => b.id === item.billId);
      if (parentBill && parentBill.vendorName) {
        const isItemMatch = checkProductMatch(item.description, selectedSupplyItem);
        if (isItemMatch) {
          const billDate = item.date || parentBill.billDate || "";
          const year = getYearFromDateStr(billDate);
          const isYearMatch = year === currentADYear || year === (currentADYear + 543) || year === 0;
          if (isYearMatch) {
            vendors.add(parentBill.vendorName.trim());
          }
        }
      }
    });
    return Array.from(vendors);
  }, [allBillItems, allBills, selectedSupplyItem]);

  // Compute dataset for Recharts to plot 12 months for the selected supply item grouped by vendor
  const suppliesChartData = useMemo(() => {
    const monthsData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
      return {
        monthNum: m,
        monthLabel: MONTH_NAMES_TH[m as keyof typeof MONTH_NAMES_TH],
        _aggregates: {} as Record<string, { sum: number; count: number }>
      };
    });

    const currentADYear = new Date().getFullYear();

    allBillItems.forEach(item => {
      const isItemMatch = checkProductMatch(item.description, selectedSupplyItem);
      if (!isItemMatch) return;

      const parentBill = allBills.find(b => b.id === item.billId);
      const vendorName = parentBill?.vendorName?.trim() || "ไม่ทราบร้านค้า";
      const billDate = item.date || parentBill?.billDate || "";
      
      const year = getYearFromDateStr(billDate);
      const isYearMatch = year === currentADYear || year === (currentADYear + 543) || year === 0;
      if (!isYearMatch) return;

      const monthNum = getMonthFromDateStr(billDate);
      const price = item.pricePerUnit || 0;
      if (price <= 0) return;

      const monthObj = monthsData.find(mo => mo.monthNum === monthNum);
      if (monthObj) {
        if (!monthObj._aggregates[vendorName]) {
          monthObj._aggregates[vendorName] = { sum: 0, count: 0 };
        }
        monthObj._aggregates[vendorName].sum += price;
        monthObj._aggregates[vendorName].count += 1;
      }
    });

    return monthsData.map(mo => {
      const row: any = {
        monthNum: mo.monthNum,
        monthLabel: mo.monthLabel,
      };
      Object.entries(mo._aggregates).forEach(([vendor, agg]) => {
        row[vendor] = parseFloat((agg.sum / agg.count).toFixed(2));
      });
      return row;
    });
  }, [allBillItems, allBills, selectedSupplyItem]);

  // Procurement Insight computation for Smart Price Insights
  const suppliesProcurementInsight = useMemo(() => {
    if (matchedVendors.length === 0 || allBillItems.length === 0) return null;
    
    // Find all records for this item in current year
    const currentADYear = new Date().getFullYear();
    const relevantRecords = allBillItems.filter(item => {
      const parentBill = allBills.find(b => b.id === item.billId);
      const isItemMatch = checkProductMatch(item.description, selectedSupplyItem);
      if (!isItemMatch) return false;
      
      const billDate = item.date || parentBill?.billDate || "";
      const year = getYearFromDateStr(billDate);
      return year === currentADYear || year === (currentADYear + 543) || year === 0;
    });
    
    if (relevantRecords.length === 0) return null;
    
    // Group by vendor
    const vendorStats: Record<string, { latestPrice: number; avgPrice: number; count: number; prices: number[] }> = {};
    
    relevantRecords.forEach(item => {
      const parentBill = allBills.find(b => b.id === item.billId);
      const vendor = parentBill?.vendorName?.trim() || "ไม่ทราบร้านค้า";
      const price = item.pricePerUnit || 0;
      if (price <= 0) return;
      
      if (!vendorStats[vendor]) {
        vendorStats[vendor] = { latestPrice: price, avgPrice: 0, count: 0, prices: [] };
      }
      vendorStats[vendor].prices.push(price);
      vendorStats[vendor].count += 1;
    });
    
    // Compute stats
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let cheapestVendor = "";
    let priciestVendor = "";
    
    Object.entries(vendorStats).forEach(([vendor, stats]) => {
      const sum = stats.prices.reduce((a, b) => a + b, 0);
      stats.avgPrice = parseFloat((sum / stats.count).toFixed(2));
      
      // Sort relevant record by date to find latest
      const relevantRecordsForVendor = relevantRecords
        .filter(item => {
          const parentBill = allBills.find(b => b.id === item.billId);
          return (parentBill?.vendorName?.trim() || "ไม่ทราบร้านค้า") === vendor;
        })
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      
      if (relevantRecordsForVendor.length > 0) {
        stats.latestPrice = relevantRecordsForVendor[0].pricePerUnit || 0;
      }
      
      if (stats.avgPrice < minPrice) {
        minPrice = stats.avgPrice;
        cheapestVendor = vendor;
      }
      if (stats.avgPrice > maxPrice) {
        maxPrice = stats.avgPrice;
        priciestVendor = vendor;
      }
    });
    
    const hasMultipleVendors = Object.keys(vendorStats).length > 1;
    const priceDiffPercentage = hasMultipleVendors && maxPrice > 0 
      ? Math.round(((maxPrice - minPrice) / maxPrice) * 100) 
      : 0;
      
    return {
      cheapestVendor,
      cheapestPrice: minPrice,
      priciestVendor,
      priciestPrice: maxPrice,
      hasMultipleVendors,
      priceDiffPercentage,
      totalRecordCount: relevantRecords.length
    };
  }, [allBillItems, allBills, selectedSupplyItem, matchedVendors]);

  // Pre-process comparison data for 12 months on chart
  const seasonalComparisonData = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
      const row: any = {
        monthNum: m,
        monthLabel: MONTH_NAMES_TH[m as keyof typeof MONTH_NAMES_TH],
      };
      pigPriceRecords.forEach(rec => {
        if (rec.month === m) {
          row[`y_${rec.year}`] = rec.price;
        }
      });
      return row;
    });
  }, [pigPriceRecords]);

  // Extract all unique years for expenses/payroll chart
  const availableExpensesYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(new Date().getFullYear()); // Always include current year
    
    allBills.forEach(b => {
      let yr = getYearFromDateStr(b.billDate);
      if (yr > 1900 && yr < 2200) {
        yearsSet.add(yr);
      } else if (yr >= 2400 && yr < 2700) {
        yearsSet.add(yr - 543); // Normalize Buddhist year to AD
      }
    });

    allPayrollSlips.forEach(p => {
      if (p.periodYear > 1900 && p.periodYear < 2200) {
        yearsSet.add(p.periodYear);
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allBills, allPayrollSlips]);

  // Pre-process 12 months data for expenses and payroll
  const expensesPayrollChartData = useMemo(() => {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => ({
      monthNum: m,
      monthLabel: MONTH_NAMES_TH[m as keyof typeof MONTH_NAMES_TH],
      billsTotal: 0,
      deliveryTotal: 0,
      payrollTotal: 0,
      totalSum: 0
    }));

    // Process scanned bills & delivery slips
    allBills.forEach(b => {
      let yr = getYearFromDateStr(b.billDate);
      if (yr >= 2400 && yr < 2700) yr -= 543; // Normalize Buddhist year to AD
      
      if (yr === selectedExpensesYear) {
        const m = getMonthFromDateStr(b.billDate);
        if (m >= 1 && m <= 12) {
          const amount = b.totalAmount || 0;
          const name = (b.vendorName || '').toLowerCase();
          const refNo = (b.referenceNo || '').toLowerCase();
          
          // Categorize as delivery slip if contains "ใบส่งของ", "ส่งของ", etc.
          const isDelivery = name.includes('ใบส่งของ') || name.includes('ส่งของ') || name.includes('delivery') ||
                             refNo.includes('ใบส่งของ') || refNo.includes('ส่งของ');
          
          if (isDelivery) {
            months[m - 1].deliveryTotal += amount;
          } else {
            months[m - 1].billsTotal += amount;
          }
        }
      }
    });

    // Process payroll slips
    allPayrollSlips.forEach(p => {
      if (p.periodYear === selectedExpensesYear) {
        const m = p.periodMonth;
        if (m >= 1 && m <= 12) {
          months[m - 1].payrollTotal += p.netSalary || 0;
        }
      }
    });

    // Compute month sum
    months.forEach(m => {
      m.totalSum = m.billsTotal + m.deliveryTotal + m.payrollTotal;
    });

    return months;
  }, [allBills, allPayrollSlips, selectedExpensesYear]);

  // Compute stats summaries for active year
  const expensesPayrollSummary = useMemo(() => {
    let totalBills = 0;
    let totalDelivery = 0;
    let totalPayroll = 0;

    expensesPayrollChartData.forEach(m => {
      totalBills += m.billsTotal;
      totalDelivery += m.deliveryTotal;
      totalPayroll += m.payrollTotal;
    });

    const grandTotal = totalBills + totalDelivery + totalPayroll;
    const avgMonthly = grandTotal / 12;

    return {
      totalBills,
      totalDelivery,
      totalPayroll,
      grandTotal,
      avgMonthly
    };
  }, [expensesPayrollChartData]);

  // Extract all unique years for income/sales chart
  const availableIncomeYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(new Date().getFullYear()); // Always include current year
    
    allSales.forEach(s => {
      let yr = getYearFromDateStr(s.date);
      if (yr > 1900 && yr < 2200) {
        yearsSet.add(yr);
      } else if (yr >= 2400 && yr < 2700) {
        yearsSet.add(yr - 543); // Normalize Buddhist year to AD
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allSales]);

  // Pre-process 12 months data for income (pig sales)
  const incomeChartData = useMemo(() => {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => ({
      monthNum: m,
      monthLabel: MONTH_NAMES_TH[m as keyof typeof MONTH_NAMES_TH],
      salesTotal: 0,
      totalPigsSold: 0,
      billsCount: 0
    }));

    allSales.forEach(s => {
      let yr = getYearFromDateStr(s.date);
      if (yr >= 2400 && yr < 2700) yr -= 543; // Normalize Buddhist year to AD
      
      if (yr === selectedIncomeYear) {
        const m = getMonthFromDateStr(s.date);
        if (m >= 1 && m <= 12) {
          const amount = typeof s.netTotal === 'number' ? s.netTotal : parseFloat(s.netTotal || '0');
          const pigs = typeof s.totalPigs === 'number' ? s.totalPigs : parseInt(s.totalPigs || '0', 10);
          
          if (!isNaN(amount)) {
            months[m - 1].salesTotal += amount;
          }
          if (!isNaN(pigs)) {
            months[m - 1].totalPigsSold += pigs;
          }
          months[m - 1].billsCount += 1;
        }
      }
    });

    return months;
  }, [allSales, selectedIncomeYear]);

  // Compute stats summaries for active income year
  const incomeSummary = useMemo(() => {
    let grandTotal = 0;
    let totalPigsSold = 0;
    let totalBills = 0;

    incomeChartData.forEach(m => {
      grandTotal += m.salesTotal;
      totalPigsSold += m.totalPigsSold;
      totalBills += m.billsCount;
    });

    const avgMonthly = grandTotal / 12;

    return {
      grandTotal,
      totalPigsSold,
      totalBills,
      avgMonthly
    };
  }, [incomeChartData]);

  useEffect(() => {
    if (!userProfile || userProfile.role === 'PENDING' || userProfile.role === 'RESIGNED') {
      return;
    }

    const unsubSows = subscribeToSows(
      (data) => {
        setSows(data);
        setSowsLoading(false);
      },
      (err) => {
        console.error("Sow error:", err);
        setErrorMSG(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล Firestore');
        setSowsLoading(false);
      }
    );
    const unsubTasks = subscribeToAllPendingTasks(
      (data) => {
        setTasks(data);
        setTasksLoading(false);
      },
      (err) => {
        console.error("Task error:", err);
        if (!errorMSG) setErrorMSG(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล Firestore');
        setTasksLoading(false);
      }
    );

    // 1. Subscribe to recent pig sales (5 latest)
    const salesQ = query(collection(db, 'pig_sales'), orderBy('createdAt', 'desc'), limit(5));
    const unsubSales = onSnapshot(salesQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentSales(data);
      setHistoryLoading(prev => ({ ...prev, sales: false }));
    }, (err) => {
      console.error("Error loading recent sales:", err);
      setHistoryLoading(prev => ({ ...prev, sales: false }));
    });

    // 2. Subscribe to recent expenses/bills (5 latest)
    const billsQ = query(collection(db, 'bills'), orderBy('createdAt', 'desc'), limit(5));
    const unsubBills = onSnapshot(billsQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentBills(data);
      setHistoryLoading(prev => ({ ...prev, expenses: false }));
    }, (err) => {
      console.error("Error loading recent bills:", err);
      setHistoryLoading(prev => ({ ...prev, expenses: false }));
    });

    // 3. Subscribe to recent maintenance requests (5 latest)
    const maintQ = query(collection(db, 'maintenance_requests'), orderBy('createdAt', 'desc'), limit(5));
    const unsubMaint = onSnapshot(maintQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentMaintenance(data);
      setHistoryLoading(prev => ({ ...prev, maintenance: false }));
    }, (err) => {
      console.error("Error loading recent maintenance:", err);
      setHistoryLoading(prev => ({ ...prev, maintenance: false }));
    });

    // 4. Subscribe to pig prices (with in-memory fallback for historical stats)
    const priceQ = query(collection(db, 'pig_prices'));
    const unsubPrices = onSnapshot(priceQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));

      // Filter out any invalid old weekly structures
      const validMonthlyDocs = data.filter(d => typeof d.year === 'number' && typeof d.month === 'number');

      // Build merged dataset in-memory (historical + user overridden)
      const mergedMap = new Map<string, any>();

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
      validMonthlyDocs.forEach(doc => {
        const key = `${doc.year}_${doc.month}`;
        mergedMap.set(key, doc);
      });

      const mergedList = Array.from(mergedMap.values());
      setPigPriceRecords(mergedList);
      setPricesLoading(false);
    }, (err) => {
      console.error("Error loading pig prices on dashboard:", err);
      setPricesLoading(false);
    });

    // 5. Subscribe to all bills (for supplies chart)
    const unsubAllBills = onSnapshot(collection(db, 'bills'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Bill));
      setAllBills(data);
    }, (err) => {
      console.error("Error loading all bills for supplies:", err);
    });

    // 6. Subscribe to all bill items (for supplies chart)
    const unsubAllBillItems = onSnapshot(collection(db, 'bill_items'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BillItem));
      setAllBillItems(data);
    }, (err) => {
      console.error("Error loading all bill items for supplies:", err);
    });

    // 7. Subscribe to all payroll slips (for expenses/payroll chart)
    const unsubAllPayrollSlips = onSnapshot(collection(db, 'payroll_slips'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PayrollSlip));
      setAllPayrollSlips(data);
    }, (err) => {
      console.error("Error loading all payroll slips for chart:", err);
    });

    // 8. Subscribe to all sales (for income/sales chart)
    const unsubAllSales = onSnapshot(collection(db, 'pig_sales'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllSales(data);
    }, (err) => {
      console.error("Error loading all sales for chart:", err);
    });

    return () => {
      unsubSows();
      unsubTasks();
      unsubSales();
      unsubBills();
      unsubMaint();
      unsubPrices();
      unsubAllBills();
      unsubAllBillItems();
      unsubAllPayrollSlips();
      unsubAllSales();
    };
  }, [userProfile, user]);

  if (errorMSG) {
    return (
      <div className="flex flex-col justify-center items-center py-20 px-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">ไม่สามารถโหลดข้อมูลได้</h2>
        <p className="text-red-300 font-medium whitespace-pre-wrap">{errorMSG}</p>
        <p className="text-slate-600 dark:text-white/60 text-sm mt-4">
          โปรดตรวจสอบให้แน่ใจว่าคุณได้สร้าง <b>"Firestore Database"</b> ในโปรเจกต์ Firebase ของคุณแล้ว
        </p>
      </div>
    );
  }

  if (sowsLoading || tasksLoading) {
    return <div className="flex justify-center items-center py-20"><div className="w-10 h-10 border-4 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div></div>;
  }

  // Calculate Stats
  const stats = {
    total: sows.length,
    idle: sows.filter(s => s.status === 'IDLE').length,
    mated: sows.filter(s => s.status === 'MATED').length,
    pregnant: sows.filter(s => s.status === 'PREGNANT').length,
    lactating: sows.filter(s => s.status === 'LACTATING').length,
    recovery: sows.filter(s => s.status === 'RECOVERY').length,
  };

  // Filter and sort tasks for each roadmap milestone step
  const step1Tasks = tasks.filter(t => ['BREED', 'HEAT_CHECK', 'BACK_TO_HEAT'].includes(t.type))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const step2Tasks = tasks.filter(t => ['ULTRASOUND'].includes(t.type))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const step3Tasks = tasks.filter(t => ['MOVE_TO_FARROW'].includes(t.type))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const step4Tasks = tasks.filter(t => ['FARROW', 'WEAN', 'VACCINE'].includes(t.type))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Group Tasks
  const today = startOfToday();
  const validTasks = tasks.filter(t => {
    try {
      const d = parseISO(t.dueDate);
      return !isNaN(d.getTime());
    } catch {
      return false;
    }
  });
  
  const overdueTasks = validTasks.filter(t => isBefore(parseISO(t.dueDate), today));
  const todayTasks = validTasks.filter(t => isToday(parseISO(t.dueDate)));
  const tomorrowTasks = validTasks.filter(t => isTomorrow(parseISO(t.dueDate)));
  const upcomingTasks = validTasks.filter(t => !isBefore(parseISO(t.dueDate), today) && !isToday(parseISO(t.dueDate)) && !isTomorrow(parseISO(t.dueDate))).slice(0, 5); // Show only next 5

  const getTaskIcon = (type: string, isOverdue: boolean) => {
    const className = "w-6 h-6";
    switch (type) {
      case 'BREED': return <Heart className={className} />;
      case 'HEAT_CHECK': 
      case 'BACK_TO_HEAT': return <Activity className={className} />;
      case 'ULTRASOUND': return <Stethoscope className={className} />;
      case 'MOVE_TO_FARROW': return <Truck className={className} />;
      case 'FARROW': 
      case 'WEAN': return <Baby className={className} />;
      case 'VACCINE': return <Syringe className={className} />;
      default: return isOverdue ? <AlertCircle className={className} /> : <CalendarClock className={className} />;
    }
  };

  const getTaskLabel = (type: string) => {
    switch (type) {
      case 'BREED': return 'กำหนดผสมพันธุ์';
      case 'HEAT_CHECK': return 'ตรวจกลับสัด';
      case 'ULTRASOUND': return 'อัลตราซาวด์';
      case 'MOVE_TO_FARROW': return 'ย้ายเข้าเล้าคลอด';
      case 'FARROW': return 'กำหนดคลอด';
      case 'WEAN': return 'กำหนดหย่านม';
      default: return type;
    }
  };

  const renderRoadmapTasks = (stepTasks: Task[]) => {
    if (stepTasks.length === 0) {
      return (
        <div className="text-[11px] text-slate-400 dark:text-slate-500 py-2.5 px-2 italic text-center font-medium bg-slate-100/30 dark:bg-black/15 rounded-xl mt-2 border border-slate-200/10">
          🎉 ขั้นตอนนี้ไม่มีงานค้างหรือรอบงานในสัปดาห์นี้
        </div>
      );
    }

    return (
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-2.5">
        <div className="flex justify-between items-center px-1 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">รายการงานที่ต้องปฏิบัติ ({stepTasks.length})</span>
          <span className="text-[9px] text-[#00bcd4] font-black">คลิกที่งานเพื่อลงรายละเอียด ⚡</span>
        </div>
        <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
          {stepTasks.map(task => {
            const taskDateObj = parseISO(task.dueDate);
            const isOverdue = isBefore(taskDateObj, startOfToday());
            const isTodayOrTom = isToday(taskDateObj) || isTomorrow(taskDateObj);
            
            let formattedDate = task.dueDate;
            try {
              formattedDate = format(taskDateObj, 'dd MMM yy', { locale: th });
            } catch {}

            let statusBadge = 'สัปดาห์นี้';
            let badgeStyle = 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400';
            let dotStyle = 'bg-slate-400';
            
            if (isOverdue) {
              statusBadge = 'เลยกำหนด!';
              badgeStyle = 'bg-red-500/10 text-red-600 dark:text-red-400';
              dotStyle = 'bg-red-500 animate-ping';
            } else if (isToday(taskDateObj)) {
              statusBadge = 'วันนี้';
              badgeStyle = 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
              dotStyle = 'bg-blue-500 animate-pulse';
            } else if (isTomorrow(taskDateObj)) {
              statusBadge = 'พรุ่งนี้';
              badgeStyle = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
              dotStyle = 'bg-indigo-500';
            }

            return (
              <div
                key={task.id}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/sows/${task.sowId}`);
                }}
                className={clsx(
                  "flex items-center justify-between p-2.5 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer",
                  isOverdue 
                    ? "bg-red-50/40 dark:bg-red-950/5 border-red-200/50 dark:border-red-900/10 hover:bg-red-50 dark:hover:bg-red-950/10" 
                    : isTodayOrTom
                      ? "bg-blue-50/40 dark:bg-blue-950/5 border-blue-200/50 dark:border-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-950/10"
                      : "bg-slate-50/50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-2 w-2 shrink-0">
                    {isOverdue && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
                    <span className={clsx("relative inline-flex rounded-full h-2 w-2", dotStyle)}></span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1 leading-none">
                      {getTaskLabel(task.type)}
                      {task.isDraft && <span className="text-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 rounded">ร่าง</span>}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                      แม่หมู: <span className="font-extrabold text-[#00bcd4]">{task.sowDisplayId}</span> • {formattedDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded", badgeStyle)}>
                    {statusBadge}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const TaskCard: React.FC<{ task: Task, isOverdue?: boolean, isTodayOrTomorrow?: boolean }> = ({ task, isOverdue = false, isTodayOrTomorrow = false }) => {
    let formattedDate = task.dueDate;
    try {
      formattedDate = format(parseISO(task.dueDate), 'dd MMM yyyy', { locale: th });
    } catch (e) {
      // fallback
    }

    let colorClass = task.isDraft ? "bg-amber-100/10 text-amber-800/80 dark:text-amber-300/80 border-dashed border-amber-300/60 dark:bg-amber-500/5 dark:border-amber-500/20" :
                     isOverdue ? "bg-red-50 text-red-600 border-red-200 dark:bg-white/10 dark:text-red-400 dark:border-red-500/30" : 
                     isTodayOrTomorrow ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-white/10 dark:text-blue-400 dark:border-blue-500/30" : 
                     "bg-white text-slate-800 border-slate-200 dark:bg-white/5 dark:text-white dark:border-white/20";
    
    let iconBgClass = task.isDraft ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                      isOverdue ? "bg-red-500/20 text-red-600 dark:text-red-400" : 
                      isTodayOrTomorrow ? "bg-blue-500/20 text-blue-600 dark:text-blue-400" : 
                      "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
    
    return (
      <motion.div 
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 }
        }}
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate(`/sows/${task.sowId}`)}
        className={clsx("backdrop-blur-md border p-4 rounded-2xl shadow-sm flex justify-between items-center cursor-pointer transition-colors", colorClass)}
      >
        <div className="flex items-start gap-4">
          <div className={clsx("p-3 rounded-xl", iconBgClass)}>
            {getTaskIcon(task.type, isOverdue)}
          </div>
          <div>
            <p className={clsx("text-lg font-bold flex items-center flex-wrap gap-2", isOverdue ? "text-red-700 dark:text-red-300" : isTodayOrTomorrow ? "text-blue-800 dark:text-blue-300" : "text-slate-900 dark:text-white")}>
              {getTaskLabel(task.type)}
              {task.isDraft && (
                <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-lg font-black tracking-normal">
                  ร่างคาดการณ์ (รอยืนยัน)
                </span>
              )}
            </p>
            <p className="text-sm opacity-80 font-medium mt-0.5">แม่หมูเบอร์: <span className="font-bold">{task.sowDisplayId}</span></p>
            <p className="text-sm mt-1 opacity-90 font-semibold">
              กำหนด: {formattedDate}
            </p>
          </div>
        </div>
        <ChevronRight className="w-6 h-6 opacity-40" />
      </motion.div>
    );
  };

  // Stats computation for the current year / month
  // Filter and sort by B.E. year and month to get the latest monthly entry
  const sortedMonthlyRecordsForStats = [...pigPriceRecords]
    .filter(r => typeof r.year === 'number' && typeof r.month === 'number')
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });

  const latestPriceRecord = sortedMonthlyRecordsForStats[0] || null;
  const previousPriceRecord = sortedMonthlyRecordsForStats[1] || null;

  const latestPrice = latestPriceRecord ? latestPriceRecord.price : 0;
  const priceChange = latestPriceRecord && previousPriceRecord 
    ? latestPriceRecord.price - previousPriceRecord.price 
    : 0;

  let formattedLatestPeriod = '';
  if (latestPriceRecord) {
    formattedLatestPeriod = `${MONTH_NAMES_TH[latestPriceRecord.month as keyof typeof MONTH_NAMES_TH]} พ.ศ. ${latestPriceRecord.year}`;
  }

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
      2560: '#eab308', // Yellow
    };
    if (colors[year]) return colors[year];
    const fallbackList = ['#00bcd4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#3b82f6', '#14b8a6', '#6366f1'];
    return fallbackList[year % fallbackList.length];
  };

  const availableYears = Array.from(new Set(pigPriceRecords.map(r => r.year))).sort((a,b) => b-a);
  const displayedYearsForSeasonal = selectedYears;

  const handleQuickPriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrice || isNaN(Number(quickPrice)) || Number(quickPrice) <= 0) {
      showError('กรุณากรอกราคาสุกรให้ถูกต้องเป็นตัวเลขมากกว่า 0 บาท/กก.', 'ราคาไม่ถูกต้อง');
      return;
    }
    
    setIsSavingPrice(true);
    showLoading('กำลังบันทึกราคาสุกรด่วน...', 'กรุณารอสักครู่');
    
    try {
      const priceNum = Number(quickPrice);
      const docId = `${quickYear}_${quickMonth}`;
      const payload = {
        userId: user?.uid || 'anonymous_quick_add',
        year: quickYear,
        month: quickMonth,
        price: priceNum,
        memo: quickMemo.trim(),
        recordedBy: userProfile?.displayName || user?.email || 'สัตวบาล (ด่วนผ่านหน้าแรก)',
        createdAt: Date.now()
      };
      
      await setDoc(doc(db, 'pig_prices', docId), payload);
      
      setIsQuickPriceModalOpen(false);
      
      // Auto-toggle on the year in the slider overlay if not visible
      if (!selectedYears.includes(quickYear)) {
        setSelectedYears(prev => [...prev, quickYear].sort((a,b) => b-a));
      }
      
      setQuickPrice('');
      setQuickMemo('');
      
      hideLoading();
      showSuccess(`บันทึกราคาสุกรเดือน${MONTH_NAMES_TH[quickMonth as keyof typeof MONTH_NAMES_TH]} พ.ศ. ${quickYear} เรียบร้อยแล้ว`, 'บันทึกสำเร็จ');
    } catch (err: any) {
      console.error("Quick price entry fail:", err);
      hideLoading();
      showError(err.message || 'ไม่สามารถบันทึกราคาสุกรด่วนได้', 'เกิดข้อผิดพลาด');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const CustomDashboardSeasonalTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#1a2f3a] p-3 border border-blue-500/10 dark:border-white/10 rounded-2xl shadow-xl font-sans text-xs min-w-[180px] max-h-[220px] overflow-y-auto scrollbar-thin pointer-events-none">
          <p className="font-extrabold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-1 mb-2">
            🌙 เดือน: {label}
          </p>
          <div className="space-y-1.5">
            {payload.map((p: any) => {
              const yearNum = p.dataKey.replace('y_', '');
              return (
                <div key={p.dataKey} className="flex justify-between items-center gap-3">
                  <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.stroke }} />
                    พ.ศ. {yearNum}:
                  </span>
                  <span className="font-black" style={{ color: p.stroke }}>
                    ฿{Number(p.value).toFixed(2)}/กก.
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomSuppliesTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#1a2f3a] p-3 border border-blue-500/10 dark:border-white/10 rounded-2xl shadow-xl font-sans text-xs min-w-[200px] max-h-[220px] overflow-y-auto scrollbar-thin pointer-events-none">
          <p className="font-extrabold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-1 mb-2 border-dashed">
            📦 รายการ: {selectedSupplyItem} ({label})
          </p>
          <div className="space-y-1.5">
            {payload.map((p: any) => {
              return (
                <div key={p.name} className="flex justify-between items-center gap-3">
                  <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400 truncate max-w-[120px]" title={p.name}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.stroke }} />
                    {p.name}:
                  </span>
                  <span className="font-black shrink-0" style={{ color: p.stroke }}>
                    ฿{Number(p.value).toLocaleString()}/หน่วย
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomExpensesTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
      return (
        <div className="bg-white dark:bg-[#1a2f3a] p-3.5 border border-[#00bcd4]/10 dark:border-white/10 rounded-2xl shadow-xl font-sans text-xs min-w-[220px] pointer-events-none">
          <p className="font-extrabold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-1 mb-2 border-dashed">
            📊 ประจำเดือน: {label}
          </p>
          <div className="space-y-1.5 mb-2">
            {payload.map((p: any) => {
              return (
                <div key={p.name} className="flex justify-between items-center gap-3">
                  <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
                    {p.name}:
                  </span>
                  <span className="font-black shrink-0" style={{ color: p.fill }}>
                    ฿{Number(p.value).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-slate-100 dark:border-white/10 pt-1.5 flex justify-between items-center font-extrabold text-slate-900 dark:text-white">
            <span>รวมรายจ่าย:</span>
            <span>฿{total.toLocaleString()}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomIncomeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const salesVal = payload.find((p: any) => p.dataKey === 'salesTotal')?.value || 0;
      const pigsVal = payload.find((p: any) => p.dataKey === 'totalPigsSold')?.value || 0;
      const countVal = payload.find((p: any) => p.payload?.billsCount !== undefined)?.payload?.billsCount || 0;
      return (
        <div className="bg-white dark:bg-[#1a2f3a] p-3.5 border border-[#10b981]/10 dark:border-white/10 rounded-2xl shadow-xl font-sans text-xs min-w-[220px] pointer-events-none">
          <p className="font-extrabold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-1 mb-2 border-dashed">
            📈 รายได้เดือน: {label}
          </p>
          <div className="space-y-2 mb-1">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                ยอดขายสุทธิ:
              </span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                ฿{Number(salesVal).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                จำนวนสุกรที่ขาย:
              </span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400">
                {Number(pigsVal).toLocaleString()} ตัว
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-50 dark:border-white/5 pt-1.5">
              <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400">
                📄 จำนวนบิลการขาย:
              </span>
              <span className="font-black text-slate-800 dark:text-white">
                {countVal} บิล
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="pb-10"
    >
      
      {/* 5. Metrics Carousel Layout (Swipe Carousel) */}
      <MetricsCarousel
        pigPriceRecords={pigPriceRecords}
        allBillItems={allBillItems}
        allBills={allBills}
        allPayrollSlips={allPayrollSlips}
        allSales={allSales}
        navigate={navigate}
      />

      {/* Premium Inspiration-based Operational & Performance Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 font-sans">
        
        {/* Left Card: Concentric Sow Rings & 7 Active Days Streak (Styled like Screen 3) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 via-[#0a2e36] to-[#05181c] text-white p-6 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          {/* Subtle backdrop glows */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#00bcd4]/5 rounded-full blur-[40px] pointer-events-none"></div>

          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-[#00bcd4]">Sow Performance Index</span>
              <h3 className="text-xl font-black mt-0.5 tracking-tight text-white">สัดส่วนการเลี้ยงดูหลัก</h3>
            </div>
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
              <Sparkles className="w-4 h-4 text-[#00bcd4]" />
            </div>
          </div>

          {/* Concentric Circle Rings Chart (SVG) */}
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mb-8 py-2">
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background tracks */}
                <circle cx="72" cy="72" r="50" className="stroke-white/5" strokeWidth="8" fill="transparent" />
                <circle cx="72" cy="72" r="38" className="stroke-white/5" strokeWidth="8" fill="transparent" />
                <circle cx="72" cy="72" r="26" className="stroke-white/5" strokeWidth="8" fill="transparent" />

                {/* Pregnant Circle (Blue/Cyan) - R=50, C=314.16 */}
                <circle 
                  cx="72" 
                  cy="72" 
                  r="50" 
                  className="stroke-[#00bcd4] transition-all duration-1000" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray="314.16"
                  strokeDashoffset={314.16 - (314.16 * (stats.pregnant / (stats.total || 1)))}
                  strokeLinecap="round"
                />

                {/* Lactating Circle (Pink/Rose) - R=38, C=238.76 */}
                <circle 
                  cx="72" 
                  cy="72" 
                  r="38" 
                  className="stroke-[#f43f5e] transition-all duration-1000" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray="238.76"
                  strokeDashoffset={238.76 - (238.76 * (stats.lactating / (stats.total || 1)))}
                  strokeLinecap="round"
                />

                {/* Mated Circle (Emerald/Green) - R=26, C=163.36 */}
                <circle 
                  cx="72" 
                  cy="72" 
                  r="26" 
                  className="stroke-[#10b981] transition-all duration-1000" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray="163.36"
                  strokeDashoffset={163.36 - (163.36 * (stats.mated / (stats.total || 1)))}
                  strokeLinecap="round"
                />
              </svg>
              {/* Central text label */}
              <div className="absolute text-center">
                <span className="block text-2xl font-black tracking-tight text-white">{stats.total}</span>
                <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-bold">Total Sows</span>
              </div>
            </div>

            {/* Labels and Percentages side list */}
            <div className="space-y-3 shrink-0 w-full sm:w-auto">
              <div className="flex items-center gap-3 justify-between sm:justify-start">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00bcd4]" />
                <div className="text-left">
                  <span className="text-[11px] font-bold text-slate-400 block leading-none">อุ้มท้อง (Pregnant)</span>
                  <span className="text-xs font-black text-white mt-1 block">
                    {stats.pregnant} ตัว ({Math.round(stats.pregnant / (stats.total || 1) * 100)}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 justify-between sm:justify-start">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                <div className="text-left">
                  <span className="text-[11px] font-bold text-slate-400 block leading-none">เลี้ยงลูก (Lactating)</span>
                  <span className="text-xs font-black text-white mt-1 block">
                    {stats.lactating} ตัว ({Math.round(stats.lactating / (stats.total || 1) * 100)}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 justify-between sm:justify-start">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <div className="text-left">
                  <span className="text-[11px] font-bold text-slate-400 block leading-none">ผสมแล้ว (Mated)</span>
                  <span className="text-xs font-black text-white mt-1 block">
                    {stats.mated} ตัว ({Math.round(stats.mated / (stats.total || 1) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            {/* 7 Active Days Streak Widget */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-black text-slate-300">รอบปฏิบัติการประจำสัปดาห์</span>
              <span className="text-[10px] bg-[#00bcd4]/10 border border-[#00bcd4]/20 text-[#00bcd4] px-2 py-0.5 rounded-lg font-bold">
                ต่อเนื่อง 5 วันล่าสุด
              </span>
            </div>

            <div className="flex justify-between items-center gap-2">
              {[
                { day: 'M', label: 'จ.', active: true, val: '1' },
                { day: 'T', label: 'อ.', active: true, val: '2' },
                { day: 'W', label: 'พ.', active: true, val: '3' },
                { day: 'T', label: 'พฤ.', active: true, val: '4' },
                { day: 'F', label: 'ศ.', active: true, val: '5' },
                { day: 'S', label: 'ส.', active: false, val: '6' },
                { day: 'S', label: 'อา.', active: false, val: '7' }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                  <div className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all border",
                    item.active 
                      ? "bg-gradient-to-br from-amber-400 to-orange-500 border-amber-350 text-white shadow-md shadow-orange-500/25 scale-105"
                      : "bg-white/5 border-white/10 text-slate-400"
                  )}>
                    {item.val}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Card: Farm Milestone Roadmap Checklist (Styled like Screen 1) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#12254f]/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-[2.5rem] shadow-lg flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-[#00bcd4]">Farm Cycle Milestones</span>
                <h3 className="text-xl font-black mt-0.5 tracking-tight text-slate-900 dark:text-white">ลำดับขั้นตอนการดูแลแม่พันธุ์</h3>
              </div>
              <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs font-bold border border-slate-200/40 dark:border-white/5">
                วงจรสมบูรณ์
              </div>
            </div>

            {/* List with connecting lines */}
            <div className="relative pl-6 space-y-5">
              {/* Connecting vertical line */}
              <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-amber-400 via-[#00bcd4] to-slate-200 dark:to-slate-700 pointer-events-none"></div>

              {/* Milestone 1: Breed */}
              <div className="relative flex flex-col gap-1">
                <div className="relative flex items-start gap-4">
                  <div className="absolute -left-[19px] w-4 h-4 rounded-full bg-amber-400 border-2 border-white dark:border-[#12254F] flex items-center justify-center shadow-sm">
                    <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                  </div>
                  <div 
                    onClick={() => setExpandedStep(expandedStep === 1 ? null : 1)}
                    className={clsx(
                      "flex-1 bg-slate-50/80 dark:bg-white/5 p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none hover:bg-slate-100/70 dark:hover:bg-white/10",
                      expandedStep === 1 ? "border-[#00bcd4]/40 bg-slate-100/45 dark:bg-white/10" : "border-slate-100 dark:border-white/5"
                    )}
                  >
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800 dark:text-white leading-none">ขั้นตอนที่ 1: ผสมพันธุ์ (Breeding)</h4>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">จับสัด ยืนนิ่งและผสมเทียมเพื่อเริ่มสร้างตัวอ่อน</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full">ผสมแล้ว {stats.mated} ตัว</span>
                      {step1Tasks.length > 0 && (
                        <span className="text-[9px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-md flex items-center gap-0.5 animate-pulse shrink-0">
                          {step1Tasks.length} งาน
                        </span>
                      )}
                      {expandedStep === 1 ? <ChevronUp className="w-4 h-4 text-slate-400 ml-1 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-1 shrink-0" />}
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {expandedStep === 1 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pl-4"
                    >
                      {renderRoadmapTasks(step1Tasks)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Milestone 2: Pregnancy Check */}
              <div className="relative flex flex-col gap-1">
                <div className="relative flex items-start gap-4">
                  <div className="absolute -left-[19px] w-4 h-4 rounded-full bg-amber-400 border-2 border-white dark:border-[#12254F] flex items-center justify-center shadow-sm">
                    <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                  </div>
                  <div 
                    onClick={() => setExpandedStep(expandedStep === 2 ? null : 2)}
                    className={clsx(
                      "flex-1 bg-slate-50/80 dark:bg-white/5 p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none hover:bg-slate-100/70 dark:hover:bg-white/10",
                      expandedStep === 2 ? "border-[#00bcd4]/40 bg-slate-100/45 dark:bg-white/10" : "border-slate-100 dark:border-white/5"
                    )}
                  >
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800 dark:text-white leading-none">ขั้นตอนที่ 2: ตรวจครรภ์ (Pregnancy Check)</h4>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">ตรวจกลับสัด 21 วัน หรืออัลตราซาวด์ 30 วันเพื่อยืนยัน</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-black bg-cyan-500/15 text-[#00bcd4] px-2.5 py-1 rounded-full">ยืนยันครรภ์ {stats.pregnant} ตัว</span>
                      {step2Tasks.length > 0 && (
                        <span className="text-[9px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-md flex items-center gap-0.5 animate-pulse shrink-0">
                          {step2Tasks.length} งาน
                        </span>
                      )}
                      {expandedStep === 2 ? <ChevronUp className="w-4 h-4 text-slate-400 ml-1 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-1 shrink-0" />}
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {expandedStep === 2 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pl-4"
                    >
                      {renderRoadmapTasks(step2Tasks)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Milestone 3: Move to Farrowing */}
              <div className="relative flex flex-col gap-1">
                <div className="relative flex items-start gap-4">
                  {/* Active circle with concentric pulse */}
                  <div className="absolute -left-[19px] w-4 h-4 rounded-full bg-[#00bcd4] border-2 border-white dark:border-[#12254F] flex items-center justify-center shadow-sm shadow-[#00bcd4]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  </div>
                  <div 
                    onClick={() => setExpandedStep(expandedStep === 3 ? null : 3)}
                    className={clsx(
                      "flex-1 p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none hover:bg-slate-100/70 dark:hover:bg-white/10",
                      expandedStep === 3 
                        ? "bg-[#00bcd4]/10 border-[#00bcd4] text-[#00bcd4]" 
                        : "bg-[#00bcd4]/5 border-[#00bcd4]/20 text-slate-800 dark:text-[#00bcd4]"
                    )}
                  >
                    <div>
                      <h4 className="text-sm font-extrabold leading-none flex items-center gap-1.5">
                        ขั้นตอนที่ 3: เตรียมคลอด (Farrowing Move)
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00bcd4] animate-ping" />
                      </h4>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">อาบน้ำพ่นน้ำยาฆ่าเชื้อ และย้ายเข้ากรงเล้าคลอดก่อนกำหนด 7 วัน</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-black bg-[#00bcd4]/15 text-[#00bcd4] px-2.5 py-1 rounded-full">สัปดาห์ที่ 16 ของอุ้มท้อง</span>
                      {step3Tasks.length > 0 && (
                        <span className="text-[9px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-md flex items-center gap-0.5 animate-pulse shrink-0">
                          {step3Tasks.length} งาน
                        </span>
                      )}
                      {expandedStep === 3 ? <ChevronUp className="w-4 h-4 text-slate-400 ml-1 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-1 shrink-0" />}
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {expandedStep === 3 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pl-4"
                    >
                      {renderRoadmapTasks(step3Tasks)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Milestone 4: Farrowing */}
              <div className="relative flex flex-col gap-1">
                <div className="relative flex items-start gap-4">
                  <div className="absolute -left-[19px] w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-750 border-2 border-white dark:border-[#12254F] shadow-sm"></div>
                  <div 
                    onClick={() => setExpandedStep(expandedStep === 4 ? null : 4)}
                    className={clsx(
                      "flex-1 bg-slate-50/50 dark:bg-white/5 p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none hover:bg-slate-100/70 dark:hover:bg-white/10",
                      expandedStep === 4 ? "border-[#00bcd4]/40 bg-slate-100/45 dark:bg-white/10" : "border-slate-100/10 dark:border-white/5"
                    )}
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-650 dark:text-slate-300 leading-none">ขั้นตอนที่ 4: คลอดและอนุบาล (Farrowing & Baby Care)</h4>
                      <p className="text-[10.5px] text-slate-400 mt-1 font-semibold">คลอดบุตร ตัดหาง ฉีดเหล็ก และเฝ้าระวังไข้นมน้ำเหลือง</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-black bg-pink-500/10 text-pink-500 px-2.5 py-1 rounded-full">เลี้ยงลูก {stats.lactating} ตัว</span>
                      {step4Tasks.length > 0 && (
                        <span className="text-[9px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-md flex items-center gap-0.5 animate-pulse shrink-0">
                          {step4Tasks.length} งาน
                        </span>
                      )}
                      {expandedStep === 4 ? <ChevronUp className="w-4 h-4 text-slate-400 ml-1 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-1 shrink-0" />}
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {expandedStep === 4 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pl-4"
                    >
                      {renderRoadmapTasks(step4Tasks)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-white/5 pt-4 mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">💡 หมุนเวียนรอบเฉลี่ยแม่พันธุ์: 145 วันต่อรอบสมาคม</span>
            <button 
              onClick={() => navigate('/manual')} 
              className="text-xs font-black text-[#00bcd4] hover:underline cursor-pointer bg-transparent border-0"
            >
              เปิดดูคู่มือจัดการฟาร์มสุกรมาตรฐานวิทยาศาสตร์ →
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Tabs Row */}
      <div className="flex flex-col mb-12 bg-white/72 dark:bg-[#12254F]/72 backdrop-blur-xl border border-white/65 dark:border-white/10 rounded-3xl p-6 shadow-lg shadow-slate-200/20 dark:shadow-none font-sans">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-black text-deep-navy dark:text-white flex items-center gap-2 tracking-tight">
            <ClipboardList className="w-6 h-6 text-[#00bcd4]" />
            ประวัติกิจกรรมล่าสุด
          </h3>
        </div>

        {/* Tabs Selector Buttons (Premium Grid Actions) */}
        <div className="grid grid-cols-3 gap-3 p-2 bg-[#f3f4f6] dark:bg-slate-900 rounded-2xl mb-6 relative z-10 border border-slate-200/50 dark:border-white/5 shadow-inner">
          {/* Tab 1: Sales */}
          <button
            onClick={() => setActiveTab('sales')}
            className={clsx(
              "relative py-3.5 px-2 rounded-xl text-xs font-black transition-all duration-300 flex flex-col items-center justify-center gap-2 cursor-pointer !border-0 !shadow-none",
              activeTab === 'sales' 
                ? "bg-[#00bcd4] text-white shadow-md shadow-[#00bcd4]/25 scale-[1.03]"
                : "bg-white/60 hover:bg-white dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-200/20"
            )}
          >
            <TrendingUp className="w-5.5 h-5.5 shrink-0" />
            <span className="truncate text-center">ประวัติขายหมู</span>
          </button>

          {/* Tab 2: Material Expenses */}
          <button
            onClick={() => setActiveTab('expenses')}
            className={clsx(
              "relative py-3.5 px-2 rounded-xl text-xs font-black transition-all duration-300 flex flex-col items-center justify-center gap-2 cursor-pointer !border-0 !shadow-none",
              activeTab === 'expenses'
                ? "bg-[#00bcd4] text-white shadow-md shadow-[#00bcd4]/25 scale-[1.03]"
                : "bg-white/60 hover:bg-white dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-200/20"
            )}
          >
            <Receipt className="w-5.5 h-5.5 shrink-0" />
            <span className="truncate text-center">รายจ่ายวัตถุดิบ</span>
          </button>

          {/* Tab 3: Maintenance */}
          <button
            onClick={() => setActiveTab('maintenance')}
            className={clsx(
              "relative py-3.5 px-2 rounded-xl text-xs font-black transition-all duration-300 flex flex-col items-center justify-center gap-2 cursor-pointer !border-0 !shadow-none",
              activeTab === 'maintenance'
                ? "bg-[#00bcd4] text-white shadow-md shadow-[#00bcd4]/25 scale-[1.03]"
                : "bg-white/60 hover:bg-white dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-200/20"
            )}
          >
            <Wrench className="w-5.5 h-5.5 shrink-0" />
            <span className="truncate text-center">รายการแจ้งซ่อม</span>
          </button>
        </div>

        {/* Tab Content List Container */}
        <div className="min-h-[180px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 flex-grow"
            >
              {activeTab === 'sales' && (
                <>
                  {historyLoading.sales ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="w-8 h-8 border-3 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div>
                    </div>
                  ) : recentSales.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-white/5 space-y-3">
                      {recentSales.map((sale) => {
                        let formattedValDate = sale.date;
                        try {
                          formattedValDate = format(parseISO(sale.date), 'dd MMM yyyy', { locale: th });
                        } catch {}
                        return (
                          <div
                            key={sale.id}
                            onClick={() => navigate('/sales')}
                            className="group flex items-center justify-between cursor-pointer bg-slate-50/60 dark:bg-[#0E214B]/30 hover:bg-slate-100 dark:hover:bg-[#0E214B]/60 p-4 rounded-3xl border border-slate-100 dark:border-white/5 transition-all active:scale-[0.98] mb-3 last:mb-0"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-11 h-11 bg-[#0E214B] text-emerald-400 rounded-full flex items-center justify-center shrink-0 border border-white/10 shadow-inner group-hover:scale-105 transition-transform">
                                <TrendingUp className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-900 dark:text-white text-base group-hover:text-[#00bcd4] transition-colors truncate">
                                  {sale.buyerName}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-white/40 font-bold mt-1 truncate">
                                  ทะเบียน: {sale.vehicleReg || 'ไม่ระบุ'} • {formattedValDate}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 pl-3">
                              <p className="text-xs text-slate-400 dark:text-white/30 font-black uppercase tracking-wider">
                                {sale.totalPigs} ตัว
                              </p>
                              <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                                + ฿{sale.netTotal ? parseFloat(sale.netTotal).toLocaleString() : '0'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <TrendingUp className="w-10 h-10 text-slate-300 dark:text-white/20 mb-2" />
                      <p className="text-slate-500 dark:text-white/60 font-bold text-sm">ไม่มีประวัติบิลการขายในขณะนี้</p>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'expenses' && (
                <>
                  {historyLoading.expenses ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="w-8 h-8 border-3 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div>
                    </div>
                  ) : recentBills.length > 0 ? (
                    <div className="space-y-3">
                      {recentBills.map((bill) => {
                        let formattedValDate = bill.billDate;
                        try {
                          formattedValDate = format(parseISO(bill.billDate), 'dd MMM yyyy', { locale: th });
                        } catch {}
                        return (
                          <div
                            key={bill.id}
                            onClick={() => navigate('/scan/history')}
                            className="group flex items-center justify-between cursor-pointer bg-slate-50/60 dark:bg-[#0E214B]/30 hover:bg-slate-100 dark:hover:bg-[#0E214B]/60 p-4 rounded-3xl border border-slate-100 dark:border-white/5 transition-all active:scale-[0.98] mb-3 last:mb-0"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-11 h-11 bg-[#0E214B] text-rose-400 rounded-full flex items-center justify-center shrink-0 border border-white/10 shadow-inner group-hover:scale-105 transition-transform">
                                <Receipt className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-900 dark:text-white text-base group-hover:text-[#00bcd4] transition-colors truncate">
                                  {bill.vendorName || 'ร้านค้าทั่วไป'}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-white/40 font-bold mt-1 truncate">
                                  บิล: {bill.referenceNo || 'ไม่ระบุเลขที่'} • {formattedValDate}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 pl-3">
                              <p className="text-[10px] text-slate-400 dark:text-white/30 font-black uppercase tracking-wider">
                                รายจ่าย
                              </p>
                              <p className="text-base font-black text-rose-500 dark:text-rose-400 mt-1 font-mono">
                                - ฿{bill.totalAmount ? parseFloat(bill.totalAmount).toLocaleString() : '0'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Receipt className="w-10 h-10 text-slate-300 dark:text-white/20 mb-2" />
                      <p className="text-slate-500 dark:text-white/60 font-bold text-sm">ไม่มีประวัติรายจ่ายวัตถุดิบในขณะนี้</p>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'maintenance' && (
                <>
                  {historyLoading.maintenance ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="w-8 h-8 border-3 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div>
                    </div>
                  ) : recentMaintenance.length > 0 ? (
                    <div className="space-y-3">
                      {recentMaintenance.map((req) => {
                        let formattedValDate = '';
                        try {
                          formattedValDate = format(new Date(req.createdAt), 'dd MMM yyyy HH:mm', { locale: th });
                        } catch {}
                        
                        // Status texts and color classes
                        let statusLabel = 'รอดำเนินการ';
                        let statusBg = 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400';
                        if (req.status === 'IN_PROGRESS') {
                          statusLabel = 'กำลังซ่อม';
                          statusBg = 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
                        } else if (req.status === 'RESOLVED') {
                          statusLabel = 'สำเร็จแล้ว';
                          statusBg = 'bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400';
                        }

                        // Urgency levels
                        let urgencyLabel = 'ต่ำ';
                        let urgencyBg = 'text-slate-500 bg-slate-100 dark:bg-white/5 dark:text-white/60';
                        if (req.urgency === 'MEDIUM') {
                          urgencyLabel = 'ปานกลาง';
                          urgencyBg = 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/25 dark:text-indigo-300';
                        } else if (req.urgency === 'HIGH') {
                          urgencyLabel = 'เร่งด่วน';
                          urgencyBg = 'text-orange-600 bg-orange-50 dark:bg-orange-500/25 dark:text-orange-400';
                        } else if (req.urgency === 'CRITICAL') {
                          urgencyLabel = 'วิกฤต';
                          urgencyBg = 'text-red-600 bg-red-50 dark:bg-red-500/25 dark:text-red-400 animate-pulse font-black';
                        }

                        return (
                          <div
                            key={req.id}
                            onClick={() => navigate(`/maintenance/${req.id}`)}
                            className="group flex items-center justify-between cursor-pointer bg-slate-50/60 dark:bg-[#0E214B]/30 hover:bg-slate-100 dark:hover:bg-[#0E214B]/60 p-4 rounded-3xl border border-slate-100 dark:border-white/5 transition-all active:scale-[0.98] mb-3 last:mb-0"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-11 h-11 bg-[#0E214B] text-amber-400 rounded-full flex items-center justify-center shrink-0 border border-white/10 shadow-inner group-hover:scale-105 transition-transform">
                                <Wrench className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-900 dark:text-white text-base group-hover:text-[#00bcd4] transition-colors truncate">
                                  {req.title}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-white/40 font-bold mt-1 truncate">
                                  สถานที่: {req.location} • {formattedValDate} น.
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-right shrink-0 pl-3">
                              <span className={clsx("text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide", statusBg)}>
                                {statusLabel}
                              </span>
                              <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider", urgencyBg)}>
                                {urgencyLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Wrench className="w-10 h-10 text-slate-300 dark:text-white/20 mb-2" />
                      <p className="text-slate-500 dark:text-white/60 font-bold text-sm">ไม่มีรายการแจ้งซ่อมบำรุงในขณะนี้</p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* See All Links */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-end">
            <button
              onClick={() => {
                if (activeTab === 'sales') navigate('/sales');
                if (activeTab === 'expenses') navigate('/scan/history');
                if (activeTab === 'maintenance') navigate('/maintenance');
              }}
              className="text-sm font-extrabold text-[#00bcd4] hover:text-[#008ba3] dark:hover:text-cyan-300 flex items-center gap-1 transition-all"
            >
              <span>ดูทั้งหมด</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>


      {/* Quick Add Pig Price Modal */}
      <AnimatePresence>
        {isQuickPriceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickPriceModalOpen(false)}
              className="absolute inset-0 bg-slate-950/95 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-white dark:bg-[#1a2f3a] rounded-[2rem] p-6 shadow-2xl max-w-md w-full border border-blue-100/10 dark:border-white/10 font-sans z-10"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#00bcd4]/10 text-[#00bcd4] rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">บันทึกราคาสุกรด่วน</h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">ลงข้อมูลตรงหน้าแรก อัปเดตกราฟทันที</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsQuickPriceModalOpen(false)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleQuickPriceSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    ปี พ.ศ. (พุทธศักราช)
                  </label>
                  <select
                    value={quickYear}
                    onChange={(e) => setQuickYear(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/15 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white font-extrabold focus:outline-none focus:border-[#00bcd4] transition-all"
                  >
                    {[2570, 2569, 2568, 2567, 2566].map(y => (
                      <option key={y} value={y} className="bg-white dark:bg-[#1a2f3a]">พ.ศ. {y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    เลือกเดือน
                  </label>
                  <select
                    value={quickMonth}
                    onChange={(e) => setQuickMonth(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/15 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white font-bold focus:outline-none focus:border-[#00bcd4] transition-all"
                  >
                    {Object.entries(MONTH_NAMES_TH).map(([mNum, name]) => (
                      <option key={mNum} value={mNum} className="bg-white dark:bg-[#1a2f3a] font-bold">
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    ราคาสุกร ณ วันที่ส่งประกวด / บันทึก (บาท / กิโลกรัม) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="เช่น 72.50 หรือ 80.00"
                      value={quickPrice}
                      onChange={(e) => setQuickPrice(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/15 rounded-xl lg:rounded-2xl pl-3 pr-10 py-2.5 text-base text-slate-800 dark:text-white font-black focus:outline-none focus:border-[#00bcd4] placeholder:font-normal"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400 dark:text-slate-500">บาท</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    บันทึกหมายเหตุสั้นๆ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="เช่น ราคากลางปรับฐานพายุฝนระดับสูง"
                    value={quickMemo}
                    onChange={(e) => setQuickMemo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/15 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-[#00bcd4]"
                  />
                </div>

                {/* Submit Panel */}
                <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsQuickPriceModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPrice}
                    className="flex-1 py-2.5 rounded-xl bg-[#00bcd4] hover:bg-[#009bb0] disabled:bg-slate-300 disabled:opacity-50 text-xs font-black text-white hover:shadow-lg hover:shadow-[#00bcd4]/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 duration-150"
                  >
                    {isSavingPrice ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>บันทึกราคาด่วน</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
