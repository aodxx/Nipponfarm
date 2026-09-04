import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Zap, ZapOff, RefreshCw, ArrowLeft, CheckCircle2, XCircle, Loader2, Save, History, Edit3, Trash2, PlusCircle, AlertTriangle, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { analyzeReceipt, ReceiptAnalysis, ReceiptItem } from '../services/aiService';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import { saveScannedBill, getHistoricalItemDescriptions, getHistoricalVendors } from '../services/billService';
import { optimizeImage } from '../services/imageOptimizer';
import ReceiptWorkflowProgress from '../components/ReceiptWorkflowProgress';

const isGenericMerchantName = (name: string): boolean => {
  if (!name) return true;
  const lowercase = name.toLowerCase().trim();
  const genericTerms = [
    'ใบส่งของ',
    'delivery bill',
    'delivery',
    'ใบเสร็จ',
    'ใบเสร็จรับเงิน',
    'บิล',
    'receipt',
    'ใบรับของ',
    'กรอกข้อมูลบิลเอง',
    'invoice',
    'ใบกำกับภาษี',
    'ใบรับสินค้า',
    'รายการสินค้า',
    'บิลเงินสด',
    'cash bill'
  ];
  return genericTerms.some(term => lowercase.includes(term));
};

const normalizeDateStr = (dateStr: string): string => {
  if (!dateStr) {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
  
  const trimmed = dateStr.trim();
  
  // If it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Check if it's DD/MM/YYYY or D/M/YY
  const slashParts = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashParts) {
    let day = slashParts[1].padStart(2, '0');
    let month = slashParts[2].padStart(2, '0');
    let year = slashParts[3];
    if (year.length === 2) {
      year = '20' + year;
    }
    let yNum = parseInt(year, 10);
    if (yNum > 2400) {
      yNum -= 543;
      year = String(yNum);
    }
    return `${year}-${month}-${day}`;
  }

  // Check if it's YYYY/MM/DD
  const revSlashParts = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (revSlashParts) {
    let year = revSlashParts[1];
    let month = revSlashParts[2].padStart(2, '0');
    let day = revSlashParts[3].padStart(2, '0');
    let yNum = parseInt(year, 10);
    if (yNum > 2400) {
      yNum -= 543;
      year = String(yNum);
    }
    return `${year}-${month}-${day}`;
  }

  // Match any digits to try and form YYYY-MM-DD
  const digits = trimmed.match(/\d+/g);
  if (digits && digits.length >= 3) {
    let day = digits[0].padStart(2, '0');
    let month = digits[1].padStart(2, '0');
    let year = digits[2];
    if (year.length === 2) {
      year = '20' + year;
    }
    let yNum = parseInt(year, 10);
    if (yNum > 2400) {
      yNum -= 543;
      year = String(yNum);
    }
    // Simple validation swap for dd/mm vs mm/dd
    const dNum = parseInt(day, 10);
    const mNum = parseInt(month, 10);
    if (dNum > 12 && mNum <= 12) {
      // Correct day/month order
    } else if (dNum <= 12 && mNum > 12) {
      // Swapped
      const temp = day;
      day = month;
      month = temp;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export default function ScanReceipt() {
  const navigate = useNavigate();
  const { showAlert, showSuccess, showError, showLoading, hideLoading } = useBottomSheet();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isFlashSupported, setIsFlashSupported] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<ReceiptAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-Capture States
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [stabilityScore, setStabilityScore] = useState(0); 
  const [isDocumentDetected, setIsDocumentDetected] = useState(false);
  const [flashPhase, setFlashPhase] = useState<'none' | 'flash1' | 'flash2'>('none');
  const [cameraWarmup, setCameraWarmup] = useState(0); // Delay detection after open
  
  const lastFrameRef = useRef<ImageData | null>(null);
  const motionDetectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isCapturingRef = useRef(false);

  // Simulated progress during analysis
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      setAnalysisProgress(0);
      interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev < 30) return prev + 2; // Fast start
          if (prev < 60) return prev + 1; // Normal speed
          if (prev < 90) return prev + 0.5; // Slow down
          if (prev < 98) return prev + 0.1; // Very slow near the end
          return prev;
        });
      }, 100);
    } else {
      setAnalysisProgress(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const [editableItems, setEditableItems] = useState<ReceiptItem[]>([]);
  const [manualMerchantName, setManualMerchantName] = useState('');
  const [isAddingNewVendor, setIsAddingNewVendor] = useState(false);
  const [manualTotal, setManualTotal] = useState<number>(0);
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'no-key' | 'error'>('checking');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [historicalDescriptions, setHistoricalDescriptions] = useState<string[]>([]);
  const [historicalVendors, setHistoricalVendors] = useState<string[]>([]);

  useEffect(() => {
    const fetchHistorical = async () => {
      const descData = await getHistoricalItemDescriptions();
      setHistoricalDescriptions(descData);
      const vendorData = await getHistoricalVendors();
      setHistoricalVendors(vendorData);
    };
    fetchHistorical();
  }, []);

  // Camera Warmup Effect
  useEffect(() => {
    if (isCameraActive) {
      const timer = setTimeout(() => setCameraWarmup(100), 400); // Faster warm up
      return () => {
        clearTimeout(timer);
        setCameraWarmup(0);
      };
    }
  }, [isCameraActive]);

  // Create local canvas on mount
  useEffect(() => {
    if (!motionDetectionCanvasRef.current) {
      motionDetectionCanvasRef.current = document.createElement('canvas');
      motionDetectionCanvasRef.current.width = 64; 
      motionDetectionCanvasRef.current.height = 64;
    }
  }, []);

  // Motion Detection Loop (Stillness checks / Autofocus)
  useEffect(() => {
    let animationFrameId: number;

    const detectMotionAndDocument = () => {
      if (!isCameraActive || !isAutoMode || analysisResult || isCapturingRef.current || isAnalyzing || cameraWarmup < 100) {
        setStabilityScore(0);
        setIsDocumentDetected(false);
        animationFrameId = requestAnimationFrame(detectMotionAndDocument);
        return;
      }

      const video = videoRef.current;
      const canvas = motionDetectionCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animationFrameId = requestAnimationFrame(detectMotionAndDocument);
        return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Draw current video frame to small canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (lastFrameRef.current) {
        let diff = 0;
        const data1 = currentFrame.data;
        const data2 = lastFrameRef.current.data;

        // Compare pixels (every 16th for speed)
        for (let i = 0; i < data1.length; i += 16) {
          diff += Math.abs(data1[i] - data2[i]); 
        }

        const motionLevel = diff / (canvas.width * canvas.height);
        
        // Stillness threshold
        const STILL_THRESHOLD = 20; 
        
        if (motionLevel < STILL_THRESHOLD) { 
          setStabilityScore(prev => Math.min(prev + 0.8, 100)); 
          setIsDocumentDetected(true);
        } else {
          setStabilityScore(prev => Math.max(0, prev - 15));
          setIsDocumentDetected(false);
        }
      }

      lastFrameRef.current = currentFrame;
      animationFrameId = requestAnimationFrame(detectMotionAndDocument);
    };

    if (isCameraActive && isAutoMode) {
      animationFrameId = requestAnimationFrame(detectMotionAndDocument);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isCameraActive, isAutoMode, analysisResult, isAnalyzing, cameraWarmup]);

  // Handle Stability reaching 100% with Double Flash Sequence
  useEffect(() => {
    if (stabilityScore === 100 && !isCapturingRef.current && !analysisResult && !isAnalyzing) {
      isCapturingRef.current = true;
      
      const triggerFlashSequence = async () => {
        // Flash 1
        setFlashPhase('flash1');
        await new Promise(r => setTimeout(r, 150));
        setFlashPhase('none');
        await new Promise(r => setTimeout(r, 150));
        
        // Flash 2
        setFlashPhase('flash2');
        await new Promise(r => setTimeout(r, 150));
        setFlashPhase('none');
        
        // Final Capture
        capture();
        
        // Reset isCapturingRef after brief safety delay
        setTimeout(() => {
          isCapturingRef.current = false;
          setStabilityScore(0);
        }, 5000);
      };

      triggerFlashSequence();
    }
  }, [stabilityScore, analysisResult, isAnalyzing]);

  useEffect(() => {
    checkServerStatus();
    return () => {
      stopCamera();
    };
  }, []);

  const checkServerStatus = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        if (data.aiKeyReady) {
          setServerStatus('connected');
        } else {
          setServerStatus('no-key');
        }
      } else {
        setServerStatus('error');
      }
    } catch (err) {
      setServerStatus('error');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);

        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if (capabilities && capabilities.torch) {
          setIsFlashSupported(true);
        } else {
          setIsFlashSupported(false);
        }

        if (capabilities && capabilities.focusMode) {
          try {
             await track.applyConstraints({
               advanced: [{ focusMode: 'continuous' }] as any
             });
          } catch(e) {}
        }
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        try {
          track.applyConstraints({ advanced: [{ torch: false }] as any });
        } catch (e) {}
        track.stop();
      });
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsFlashOn(false);
  };

  const toggleFlash = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    
    try {
      const newFlashStatus = !isFlashOn;
      await track.applyConstraints({
        advanced: [{ torch: newFlashStatus }] as any
      });
      setIsFlashOn(newFlashStatus);
    } catch (err) {
      console.error("Flash toggle error:", err);
      showAlert("ไม่สามารถควบคุมไฟฉายของอุปกรณ์ได้");
    }
  };

  const capture = () => {
    if (isCapturingRef.current && isAnalyzing) return;
    isCapturingRef.current = true;
    
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95); // Grab high quality frame
        
        // Optimize using centralized pipeline
        optimizeImage(dataUrl, { type: 'document' }).then((optimized) => {
          setCapturedImage(optimized.dataUrl);
          stopCamera();
          handleAnalysis(optimized.dataUrl);
        }).catch((err) => {
          console.error("Centralized optimization failed, falling back:", err);
          setCapturedImage(dataUrl);
          stopCamera();
          handleAnalysis(dataUrl);
        });
      }
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;

    try {
      // Direct pass to centralized optimizer
      const optimized = await optimizeImage(file, { type: 'document' });
      setCapturedImage(optimized.dataUrl);
      stopCamera();
      handleAnalysis(optimized.dataUrl);
    } catch (err) {
      console.error("Centralized file optimization failed, falling back to FileReader:", err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedImage(dataUrl);
        stopCamera();
        handleAnalysis(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const [showMismatchWarning, setShowMismatchWarning] = useState(false);
  const [mismatchDiff, setMismatchDiff] = useState(0);
  const [mismatchType, setMismatchType] = useState<'over' | 'under' | null>(null);

  const handleAnalysis = async (imageData: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    setEditableItems([]);
    setShowMismatchWarning(false);
    try {
      // Remove data:image/jpeg;base64, prefix
      const base64 = imageData.split(',')[1];
      const result = await analyzeReceipt(base64, historicalDescriptions, historicalVendors);
      
      if (result.isValidBill === false) {
        // Play the custom invalid bill alert audio
        const audio = new Audio("/assets/sounds/invalid_bill_alert.mp3");
        audio.play().catch(e => console.warn("Failed to play invalid bill voice alert:", e));

        throw new Error(result.rejectionReason || "ภาพที่ส่งมาไม่ใช่รูปภาพบิลส่งของหรือใบเสร็จรับเงินที่ถูกต้อง กรุณาอัปโหลดบิลที่มีรายละเอียดตารางรายการสินค้าและราคาสินค้าอย่างชัดเจน");
      }

      const normalizedResult = {
        ...result,
        date: normalizeDateStr(result.date)
      };

      setAnalysisResult(normalizedResult);
      setEditableItems(normalizedResult.items.map(item => {
        const calculated = item.quantity * item.unitPrice;
        return {
          ...item,
          isLineValid: Math.abs(calculated - item.amount) < 1.0 // Allow for small rounding/scan errors
        };
      }));
      // Filter out generic names
      const isGeneric = isGenericMerchantName(result.merchantName);
      const cleanMerchant = isGeneric ? "" : (result.merchantName || "");
      
      if (cleanMerchant && !historicalVendors.includes(cleanMerchant)) {
        setHistoricalVendors(prev => [cleanMerchant, ...prev]);
      }
      setManualMerchantName(cleanMerchant);
      setManualTotal(result.totalAmount);
      setIsAddingNewVendor(false);
      
      // Calculate total mismatch immediately to play appropriate sound and highlight warnings
      const calculatedSum = result.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const isMatched = Math.abs(calculatedSum - result.totalAmount) < 0.1;
      const diff = Math.abs(calculatedSum - result.totalAmount);

      if (isMatched) {
        setMismatchType(null);
        // Play success sound to notify that scan completed perfectly
        const audio = new Audio("/assets/sounds/success_alert.mp3");
        audio.play().catch(e => console.warn("Failed to play success audio after scan:", e));
      } else {
        setMismatchDiff(diff);
        setShowMismatchWarning(true);
        if (result.totalAmount > calculatedSum) {
          setMismatchType('over');
        } else {
          setMismatchType('under');
        }
        // Play warning sound immediately to notify user of mathematical discrepancies on the receipt
        const audio = new Audio("/assets/sounds/billing_error_alert.mp3");
        audio.play().catch(e => console.warn("Failed to play error audio after scan:", e));
      }
      
      // Logging the receipt parsing outcome
      if (result) {
        console.log(`Scan completed: ${cleanMerchant || "Unknown Merchant"}, Total: ${result.totalAmount} THB`);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "";
      if (errMsg.includes("404") || errMsg.includes("Not Found") || errMsg.includes("not found")) {
        errMsg = "ระบบประมวลผลเซิร์ฟเวอร์ขัดข้องชั่วคราว (ข้อผิดพลาด HTTP 404 Not Found) อาจมีปัญหากับขนาดไฟล์หรือเครือข่าย";
      } else if (errMsg.includes("Timeout") || errMsg.includes("timeout")) {
        errMsg = "การเชื่อมต่อเซิร์ฟเวอร์หมดเวลา เนื่องจากภาพมีความละเอียดสูงเกินไปหรือเครือข่ายล่าช้า";
      } else if (errMsg.includes("API Key") || errMsg.includes("key")) {
        errMsg = "ไม่พบรหัสเข้าใช้งาน API (Missing Gemini API Key) โปรดตรวจสอบการตั้งค่าของระบบ";
      }
      setAnalysisError(errMsg || "ระบบประมวลผลข้อมูลบิลขัดข้องชั่วคราว");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualEntry = () => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const blankAnalysis: ReceiptAnalysis = {
      merchantName: "",
      date: formattedDate,
      totalAmount: 0,
      items: [
        {
          description: "รายการวัตถุดิบ/อาหาร",
          quantity: 1,
          unitPrice: 0,
          amount: 0,
          isLineValid: true
        }
      ],
      isCorrect: true,
      analysisNote: "กรอกข้อมูลเองด้วยมือเนื่องจากระบบสแกนขัดข้องชั่วคราว"
    };

    setAnalysisResult(blankAnalysis);
    setEditableItems(blankAnalysis.items);
    setManualMerchantName("");
    setManualTotal(blankAnalysis.totalAmount);
    setIsAddingNewVendor(false);
    setIsEditing(true); // Open edit mode instantly
    setAnalysisError(null); // Clear error state since we have transitioned to manual editor
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: any) => {
    const newItems = [...editableItems];
    const item = { ...newItems[index], [field]: value };
    
    // Auto cross-check
    const calculated = item.quantity * item.unitPrice;
    if (field === 'quantity' || field === 'unitPrice') {
      item.amount = calculated;
      item.isLineValid = true;
    } else if (field === 'amount') {
      item.isLineValid = Math.abs(calculated - item.amount) < 1.0;
    }
    
    newItems[index] = item;
    setEditableItems(newItems);
    // Hide warning when edits occur so user revalidate on save
    setShowMismatchWarning(false);
  };

  const addItem = () => {
    setEditableItems([...editableItems, { description: 'รายการใหม่', quantity: 1, unitPrice: 0, amount: 0, isLineValid: true }]);
    setShowMismatchWarning(false);
  };

  const removeItem = (index: number) => {
    setEditableItems(editableItems.filter((_, i) => i !== index));
    setShowMismatchWarning(false);
  };

  const calculatedTotal = editableItems.reduce((sum, item) => sum + item.amount, 0);
  const isTotalMatching = Math.abs(calculatedTotal - manualTotal) < 0.1;

  const executeSaveToFirebase = async (isMatchedValue: boolean) => {
    if (!analysisResult || !capturedImage) return;
    if (!manualMerchantName || !manualMerchantName.trim()) {
      showError("กรุณาเลือกหรือป้อนชื่อร้านค้าก่อนบันทึกข้อมูล");
      return;
    }
    setIsSaving(true);
    showLoading('กำลังเก็บบันทึกข้อมูลบิลและประวัติรายการสินค้าย้อนหลัง...', 'กำลังบันทึกข้อมูล');
    try {
      const finalResult: ReceiptAnalysis = {
        ...analysisResult,
        merchantName: manualMerchantName,
        totalAmount: manualTotal,
        items: editableItems,
        isCorrect: isMatchedValue
      };
      await saveScannedBill(finalResult, capturedImage);
      hideLoading();
      
      // Play a short success alert confirming standard Firestore persistence has finished
      const audio = new Audio("/assets/sounds/success_alert.mp3");
      audio.play().catch(e => console.warn("Failed to play save success sound:", e));

      showSuccess("บันทึกข้อมูลบิลและรายการสินค้าเรียบร้อยแล้ว", "สำเร็จ");
      setShowMismatchWarning(false);
      reset();
    } catch (err: any) {
      hideLoading();
      console.error(err);
      showError(`บันทึกล้มเหลว: ${err.message || "โปรดลองอีกครั้ง"}`);
    } finally {
      setIsSaving(false);
      hideLoading();
    }
  };

  const handleSave = async () => {
    if (!analysisResult || !capturedImage) return;
    if (!manualMerchantName || !manualMerchantName.trim()) {
      showError("กรุณาเลือกหรือป้อนชื่อร้านค้าก่อนบันทึกข้อมูล");
      return;
    }

    // Sum matching logic: quantity * unitPrice total for all items vs manualTotal (ยอดจากท้ายบิล)
    const calculatedSum = editableItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const isMatched = Math.abs(calculatedSum - manualTotal) < 0.1;
    const diff = Math.abs(calculatedSum - manualTotal);

    if (isMatched) {
      // Case 1: Match
      setMismatchType(null);
      await executeSaveToFirebase(true);
    } else {
      // Case 2: Mismatch / Overcharged / Undercharged
      setMismatchDiff(diff);
      setShowMismatchWarning(true);
      
      // Play local static billing error audio
      const audio = new Audio("/assets/sounds/billing_error_alert.mp3");
      audio.play().catch(e => {
        console.warn("Failed to play error static audio:", e);
      });

      if (manualTotal > calculatedSum) {
        setMismatchType('over');
      } else {
        setMismatchType('under');
      }
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setEditableItems([]);
    startCamera();
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-white pb-20 overflow-x-hidden">
      <ReceiptWorkflowProgress
        stage={isSaving ? 'saving' : analysisResult ? 'review' : isAnalyzing || capturedImage ? 'processing' : 'capture'}
      />
      {/* Header */}
      <div className="flex items-center justify-between p-4 sticky top-0 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-md z-10 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black tracking-tight">สแกนบิลรายจ่ายวัตถุดิบ</h1>
        </div>

        <div className="flex items-center gap-3">
          {isCameraActive && !capturedImage && (
            <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-full p-1 border border-slate-200 dark:border-white/10">
              <button 
                onClick={() => setIsAutoMode(true)}
                className={`px-3 py-1 text-[10px] font-black rounded-full transition-all ${isAutoMode ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400'}`}
              >
                AUTO
              </button>
              <button 
                onClick={() => setIsAutoMode(false)}
                className={`px-3 py-1 text-[10px] font-black rounded-full transition-all ${!isAutoMode ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400'}`}
              >
                MANUAL
              </button>
            </div>
          )}

          <button 
            onClick={() => navigate('/scan/history')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-600 dark:text-white/70"
          >
            <History className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 text-xs font-bold shadow-sm">
            {serverStatus === 'checking' && <><Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> <span className="text-amber-600 dark:text-amber-400">กำลังเชื่อมต่อ...</span></>}
            {serverStatus === 'connected' && <><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse border border-emerald-300" /> <span className="text-emerald-600 dark:text-emerald-400">AI พร้อมตรวจบิล</span></>}
            {serverStatus === 'no-key' && <><XCircle className="w-4 h-4 text-rose-500" /> <span className="text-rose-600 dark:text-rose-400">ขาด API Key</span></>}
            {serverStatus === 'error' && <><XCircle className="w-4 h-4 text-rose-500" /> <span className="text-rose-600 dark:text-rose-400">เชื่อมต่อล้มเหลว</span></>}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-6">
        {/* Viewport & Upload Area */}
        <div className="relative aspect-[3/4] bg-white/40 dark:bg-[#12254F]/40 backdrop-blur-md rounded-3xl overflow-hidden shadow-xl border border-white/60 dark:border-white/10">
          {!capturedImage ? (
            <>
              {isCameraActive ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />

                  {/* Flash Toggle Button */}
                  {isFlashSupported && (
                    <button
                      onClick={toggleFlash}
                      className={`absolute top-4 right-4 z-20 p-3 rounded-full transition-all border shadow-lg ${
                        isFlashOn 
                          ? 'bg-amber-400 text-slate-900 border-amber-500 scale-110' 
                          : 'bg-black/40 text-white border-white/20 hover:bg-black/60'
                      }`}
                    >
                      {isFlashOn ? <Zap className="w-6 h-6 fill-current" /> : <ZapOff className="w-6 h-6" />}
                    </button>
                  )}

                  {/* Auto-Capture Stability Indicator */}
                  {isAutoMode && (
                    <div className="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isDocumentDetected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                          {cameraWarmup < 100 ? 'กำลังเตรียมกล้อง...' :
                           !isDocumentDetected ? 'ถือกล้องให้นิ่งเพื่อตรวจจับบิล' : 'ตรวจพบเอกสารแล้ว'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Switch to manual button overlay */}
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-3.5 z-10">
                    <button
                      onClick={stopCamera}
                      className="px-4 py-2.5 bg-black/60 hover:bg-black/80 active:bg-black text-white rounded-xl text-xs font-bold border border-white/15 backdrop-blur-sm transform active:scale-95 hover:-translate-y-0.5 transition-all cursor-pointer"
                    >
                      สลับไปอัปโหลดไฟล์
                    </button>
                    {!isAutoMode && (
                      <button
                        onClick={capture}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:from-emerald-700 active:to-teal-800 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 border border-emerald-400/20 transform active:scale-95 hover:-translate-y-0.5 transition-all cursor-pointer"
                      >
                        กดถ่ายภาพเลย
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      processFile(file);
                    }
                  }}
                  onClick={() => document.getElementById('native-camera-input')?.click()}
                  className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 rounded-3xl ${
                    isDragging 
                      ? 'bg-emerald-500/15 border-4 border-dashed border-emerald-500' 
                      : 'bg-white/40 dark:bg-[#12254F]/40 backdrop-blur-md border-2 border-dashed border-slate-300/60 dark:border-white/10 hover:border-emerald-500 dark:hover:border-emerald-400'
                  }`}
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 relative group">
                    <Camera className="w-10 h-10 text-emerald-500 animate-pulse" />
                    <div className="absolute -inset-1 rounded-full border-2 border-emerald-500/30 animate-ping" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">แตะตรงนี้เพื่อเปิดกล้องความเร็วสูง</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 max-w-[280px] leading-relaxed">
                    ระบบจะเรียกใช้กล้องมือถือของท่านโดยตรง ไม่กระตุก ไม่ค้าง เหมาะกับการทำงานหน้างานจริงค่ะ
                  </p>
                  
                  <div className="flex flex-col gap-3.5 w-full max-w-[290px] px-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById('native-camera-input')?.click();
                      }}
                      className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:from-emerald-700 active:to-teal-850 font-extrabold text-sm text-white rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-[0.98] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2.5 cursor-pointer border-none"
                    >
                      <Camera className="w-5 h-5 text-white" />
                      ถ่ายภาพบิลด่วน (กล้องมือถือ)
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById('bill-file-input')?.click();
                      }}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 font-bold text-xs text-slate-800 dark:text-white rounded-xl active:scale-[0.98] hover:-translate-y-0.5 border border-slate-200 dark:border-white/10 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      เลือกรูปภาพจากในเครื่อง (แกลเลอรี)
                    </button>
 
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startCamera();
                      }}
                      className="w-full py-2 text-slate-400 hover:text-emerald-500 font-black text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none bg-transparent hover:underline"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                      สลับไปใช้กล้องจับความสั่นอัตโนมัติในแอป
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-6 font-semibold">ลากและวางรูปภาพลงกล่องเพื่อสแกนทำงานแบบเดสก์ท็อปได้เช่นกัน</p>
                </div>
              )}
            </>
          ) : (
            <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
          )}

          {/* Analysis Overlay */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 bg-slate-950/98 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="relative mb-6 flex flex-col items-center">
                  <div className="w-44 h-44 flex items-center justify-center">
                    <DotLottieReact 
                      src="/loading.lottie" 
                      loop 
                      autoplay 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="mt-2 bg-[#00bcd4]/10 backdrop-blur-md border border-[#00bcd4]/20 px-4 py-1.5 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(0,188,212,0.15)] animate-pulse">
                    <span className="text-xl font-black text-[#00bcd4] tracking-tight">{Math.round(analysisProgress)}%</span>
                  </div>
                </div>

                <h2 className="text-2xl font-black text-white mb-2 leading-tight">
                  {analysisProgress < 30 ? 'กำลังอ่านข้อมูลบิล...' : 
                   analysisProgress < 60 ? 'กำลังแยกรายการสินค้า...' : 
                   analysisProgress < 90 ? 'กำลังตรวจสอบความถูกต้อง...' : 
                   'กำลังสรุปข้อมูลรายจ่าย...'}
                </h2>
                <p className="text-slate-300 text-sm mb-8 max-w-[280px]">
                  AI กำลังประมวลผลบิลของคุณอย่างละเอียด โปรดรอสักครู่...
                </p>

                {/* Linear Progress Bar */}
                <div className="w-full max-w-[260px] h-3 bg-white/10 rounded-full overflow-hidden border border-white/5 shadow-inner">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${analysisProgress}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                  >
                    <div className="w-full h-full relative overflow-hidden">
                       <motion.div 
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="absolute top-0 bottom-0 w-20 bg-white/30 skew-x-12"
                       />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Button */}
        <div className="flex justify-center items-center gap-4 -mt-12 relative z-20">
          {capturedImage && !isAnalyzing && (
            <button 
              onClick={reset}
              className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center shadow-xl shadow-slate-800/40 border-4 border-white dark:border-slate-700 active:scale-95 transition-transform"
              title="สแกนใบใหม่"
            >
              <RefreshCw className="w-10 h-10 text-white" />
            </button>
          )}
        </div>

        {/* Results Area */}
        <AnimatePresence>
          {analysisError && !isAnalyzing && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="bg-white dark:bg-[#1a2f3a] rounded-3xl p-6 shadow-xl border-2 border-amber-500/30 dark:border-amber-500/20 space-y-5"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl text-amber-500 shrink-0">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                    ขออภัยด้วยครับ ระบบไม่สามารถอ่านข้อมูลได้
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                    สาเหตุ: <span className="text-rose-500 dark:text-rose-400 font-extrabold">{analysisError}</span>
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-black/10 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 space-y-2.5">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                  AI พยายามอ่านบิลใบนี้แล้ว แต่อาจมีบางจุดที่ไม่ชัดเจน หรือระบบประมวลผลขัดข้องชั่วคราว คุณสามารถเลือกดำเนินการต่อได้ดังนี้ครับ:
                </p>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5 mt-2 bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/10">
                  <span className="shrink-0 text-amber-500 font-bold">💡 ทิปแนะนำ:</span>
                  <span className="font-semibold leading-normal">พยายามวางบิลให้แบนราบ ถ่ายในที่สว่าง หรือเปิดไฟแฟลชเพิ่มความคมชัด เพื่อให้อ่านตัวหนังสือได้ชัดเจนที่สุดครับ</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <button
                  onClick={reset}
                  className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:from-emerald-700 active:to-teal-850 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/35 active:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer border border-emerald-400/20 ring-2 ring-emerald-500/10 focus:outline-none focus:ring-4 focus:ring-emerald-400"
                >
                  <RefreshCw className="w-5 h-5 shrink-0 animate-spin-slow" />
                  <span>ถ่ายภาพใหม่อีกครั้ง</span>
                </button>
                <button
                  onClick={handleManualEntry}
                  className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:from-amber-700 active:to-orange-700 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/40 active:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer border border-amber-400/20 ring-2 ring-amber-500/10 focus:outline-none focus:ring-4 focus:ring-amber-400"
                >
                  <Edit3 className="w-5 h-5 shrink-0" />
                  <span>กรอกข้อมูลเองด้วยมือ</span>
                </button>
              </div>
            </motion.div>
          )}

          {analysisResult && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white/72 dark:bg-[#12254F]/72 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl border border-white/60 dark:border-white/10 space-y-4"
            >
              <div className="space-y-4 pb-3 border-b border-slate-100 dark:border-white/5">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-black text-slate-500 dark:text-white/60 uppercase tracking-widest flex items-center gap-1.5">
                      ชื่อร้านค้า / ผู้จำหน่ายวัตถุดิบ <span className="text-rose-500 font-extrabold">*</span>
                    </label>
                    {manualMerchantName && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        {isAddingNewVendor ? "ป้อนชื่อใหม่" : "เลือกจากระบบ"}
                      </span>
                    )}
                  </div>
                  
                  {isAddingNewVendor ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        value={manualMerchantName}
                        onChange={(e) => setManualMerchantName(e.target.value)}
                        placeholder="พิมพ์ชื่อร้านค้าใหม่ที่นี่..."
                        className="flex-1 text-base font-bold bg-slate-50 dark:bg-black/10 hover:bg-slate-100 dark:hover:bg-black/20 focus:bg-white rounded-xl px-4 py-2.5 outline-none border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewVendor(false);
                          if (historicalVendors.length > 0) {
                            setManualMerchantName(historicalVendors[0]);
                          } else {
                            setManualMerchantName('');
                          }
                        }}
                        className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0 border border-slate-200/50 dark:border-white/5"
                        title="เลือกจากรายชื่อเดิม"
                      >
                        <History className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={manualMerchantName}
                        onChange={(e) => setManualMerchantName(e.target.value)}
                        className="flex-1 text-base font-bold bg-slate-50 dark:bg-black/10 hover:bg-slate-100 dark:hover:bg-black/20 rounded-xl px-4 py-2.5 outline-none border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white cursor-pointer transition-all appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundSize: '1.25rem', backgroundRepeat: 'no-repeat', paddingRight: '2.5rem' }}
                      >
                        <option value="">-- แตะเพื่อเลือกรายชื่อร้านค้าที่มีอยู่ --</option>
                        {historicalVendors.map((vendor, index) => (
                          <option key={vendor || index} value={vendor}>
                            {vendor}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewVendor(true);
                          setManualMerchantName('');
                        }}
                        className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/10 border-0"
                        title="พิมพ์เพิ่มร้านค้าใหม่"
                      >
                        <PlusCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {!manualMerchantName && (
                    <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold mt-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      จำเป็นต้องเลือกหรือเพิ่มชื่อร้านค้าก่อนบันทึกข้อมูล
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">
                      วันที่ในบิล:
                    </span>
                    {isEditing ? (
                      <input
                        id="bill-date-input"
                        type="date"
                        value={analysisResult.date || ""}
                        onChange={(e) => {
                          setAnalysisResult(prev => prev ? { ...prev, date: e.target.value } : null);
                        }}
                        className="bg-white dark:bg-black/20 rounded-lg px-2 py-1 text-xs font-black text-slate-800 dark:text-white outline-none border border-slate-200 dark:border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all cursor-pointer"
                      />
                    ) : (
                      <span 
                        id="bill-date-display"
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-slate-700 dark:text-white/80 font-black cursor-pointer hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                        title="คลิกเพื่อแก้ไขวันที่"
                      >
                        {analysisResult.date}
                        <Edit3 className="w-3.5 h-3.5 text-slate-400 opacity-60 hover:opacity-100 shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isTotalMatching ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                      {isTotalMatching ? <CheckCircle2 className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
                      {isTotalMatching ? 'คณิตศาสตร์แม่นยำ' : 'ยอดรวมไม่ตรง'}
                    </div>
                    <button 
                      onClick={() => setIsEditing(!isEditing)}
                      className={`p-1.5 rounded-xl transition-colors ${isEditing ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-slate-200'}`}
                      title="แก้ไขตารางรายการบิล"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="py-4 border-y border-slate-100 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">รายการสินค้า</span>
                  {isEditing && (
                    <button onClick={addItem} className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1">
                      <PlusCircle className="w-3 h-3" /> เพิ่มรายการ
                    </button>
                  )}
                </div>

                {editableItems.map((item, idx) => (
                  <motion.div 
                    layout
                    key={idx} 
                    className={`p-5 rounded-[1.75rem] border transition-all ${
                      item.isLineValid 
                        ? 'bg-slate-50/60 dark:bg-white/5 border-white/60 dark:border-white/10 shadow-sm' 
                        : 'bg-rose-50/80 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/50'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">ชื่อรายการ</p>
                            <input 
                              value={item.description}
                              onChange={(e) => updateItem(idx, 'description', e.target.value)}
                              className="w-full bg-white dark:bg-black/20 rounded-lg px-2 py-1.5 text-sm outline-none border border-slate-200 dark:border-white/10"
                            />
                          </div>
                          <button onClick={() => removeItem(idx)} className="text-rose-500 p-1 mt-5">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">จำนวน</p>
                            <input 
                              type="number"
                              value={item.quantity}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                              className="w-full bg-white dark:bg-black/20 rounded-lg px-2 py-1.5 outline-none border border-slate-200 dark:border-white/10"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">ราคา/หน่วย</p>
                            <input 
                              type="number"
                              value={item.unitPrice}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateItem(idx, 'unitPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                              className="w-full bg-white dark:bg-black/20 rounded-lg px-2 py-1.5 outline-none border border-slate-200 dark:border-white/10"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">ยอดเงินแถว</p>
                            <input 
                              type="number"
                              value={item.amount}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateItem(idx, 'amount', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                              className={`w-full dark:bg-black/20 rounded-lg px-2 py-1.5 font-bold outline-none border ${item.isLineValid ? 'bg-white border-slate-200 dark:border-white/10' : 'bg-rose-50 border-rose-300 text-rose-600'}`}
                            />
                          </div>
                        </div>
                        {!item.isLineValid && (
                          <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                            <p className="text-[10px] text-rose-500 font-bold">
                              ⚠️ ยอดเงินในบิล (฿{item.amount.toLocaleString()}) ไม่ตรงกับผลคูณ (฿{(item.quantity * item.unitPrice).toLocaleString()})
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-slate-700 dark:text-white/80 font-bold flex-1 text-sm">{item.description}</span>
                          <div className="text-right">
                             <div className={`font-black text-sm ${item.isLineValid ? 'text-slate-900 dark:text-white' : 'text-rose-500'}`}>
                               ฿{item.amount.toLocaleString()}
                             </div>
                             {!item.isLineValid && (
                               <div className="text-[9px] text-rose-400 font-black line-through">
                                 ควรเป็น: ฿{(item.quantity * item.unitPrice).toLocaleString()}
                               </div>
                             )}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 rounded-lg px-3 py-1.5">
                           <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-slate-500 dark:text-white/40">{item.quantity}</span>
                              <span className="text-[10px] text-slate-300">×</span>
                              <span className="text-[10px] font-black text-slate-500 dark:text-white/40">฿{item.unitPrice.toLocaleString()}</span>
                           </div>
                           
                           {item.isLineValid ? (
                              <div className="flex items-center gap-1 text-emerald-500">
                                 <CheckCircle2 className="w-3 h-3" />
                                 <span className="text-[9px] font-black uppercase tracking-widest">คณิตศาสตร์ถูกต้อง</span>
                              </div>
                           ) : (
                              <div className="flex items-center gap-1 text-rose-500 animate-pulse">
                                 <AlertTriangle className="w-3 h-3" />
                                 <span className="text-[9px] font-black uppercase tracking-widest text-wrap max-w-[80px] leading-tight">ตรวจสอบราคา! ร้านอาจคิดเงินผิด</span>
                              </div>
                           )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">ผลรวมคำนวณจริง</span>
                      <span className="font-black text-slate-900 dark:text-white">฿{calculatedTotal.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">ยอดสุทธิที่เรียกเก็บ</p>
                      {isEditing ? (
                        <input 
                          type="number"
                          value={manualTotal}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setManualTotal(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          className="bg-slate-100 dark:bg-white/10 rounded-lg px-2 py-1 text-2xl font-black w-32 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      ) : (
                        <span className="font-bold text-slate-900 dark:text-white">ยอดจากบิล</span>
                      )}
                    </div>
                    {!isEditing && (
                      <span className={`text-4xl font-black drop-shadow-sm transition-colors ${isTotalMatching ? 'text-emerald-500' : 'text-rose-500'}`}>
                        ฿{manualTotal.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {!isTotalMatching && !isEditing && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200 dark:border-rose-500/30 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                        ยอดรวมจากทุกแถว (฿{calculatedTotal.toLocaleString()}) ไม่ตรงกับยอดสุทธิที่ระบุในบิล (฿{manualTotal.toLocaleString()}) โปรดตรวจสอบและแก้ไข
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>

              {analysisResult.analysisNote && (
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                  <p className="text-[10px] text-slate-400 dark:text-white/30 uppercase font-black mb-1">AI Note</p>
                  <p className="text-xs italic text-slate-600 dark:text-white/60 leading-relaxed font-medium">
                    "{analysisResult.analysisNote}"
                  </p>
                </div>
              )}

              {/* Grand Red Mismatch Warning UI Overlay */}
              <AnimatePresence>
                {showMismatchWarning && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-4 bg-red-50 dark:bg-red-950/30 border-2 border-red-500 rounded-2xl text-red-900 dark:text-red-200 space-y-4 shadow-lg mb-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-red-600 text-white rounded-xl shrink-0 shadow-md">
                        <AlertTriangle className="w-5 h-5 animate-bounce" />
                      </div>
                      <div>
                        <h4 className="font-black text-red-700 dark:text-red-400 text-sm leading-tight uppercase">
                          {mismatchType === 'over' ? "เตือนร้านคิดเงินเกิน!" : "เตือนร้านคิดเงินขาด!"}
                        </h4>
                        <p className="text-[10px] text-red-600 dark:text-red-400 shrink-0 font-extrabold">
                          {mismatchType === 'over' ? "ยอดบิลเรียกเก็บสูงกว่าผลรวมรายการสินค้า" : "ยอดบิลเรียกเก็บต่ำกว่าผลรวมรายการสินค้า"}
                        </p>
                      </div>
                    </div>

                    {/* Highly prominent difference indicator for staff sight accessibility */}
                    <div className="bg-white/80 dark:bg-[#0f172a]/80 p-5 rounded-xl border border-red-200 dark:border-red-800 text-center flex flex-col justify-center items-center gap-1.5 select-none shadow-sm">
                      <span className="text-xs text-red-700 dark:text-red-400 font-extrabold tracking-wider uppercase">
                        {mismatchType === 'over' ? "⚠️ ร้านค้าคิดเงินเกินไป" : "⚠️ ร้านค้าคิดเงินขาดไป"}
                      </span>
                      <span className="text-4xl md:text-5xl font-black text-red-600 dark:text-red-400 tracking-tight">
                        {mismatchType === 'over' ? `+${mismatchDiff.toLocaleString()}` : `-${mismatchDiff.toLocaleString()}`} บาท
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
                        ยอดรวมท้ายบิล ฿{manualTotal.toLocaleString()} vs ผลรวมสินค้าจริง ฿{editableItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-red-800 dark:text-red-300 leading-relaxed">
                      ผลรวมจริงที่คำนวณจากทุกรายการสินค้าพบส่วนต่างผิดปกติ <b className="text-red-600 dark:text-red-400 font-extrabold underline">{mismatchType === 'over' ? "คิดเงินเกินไป" : "คิดเงินขาดไป"} ฿{mismatchDiff.toLocaleString()} บาท</b> โปรดยืนยันบันทึกทั้งที่ผิดปกติ หรือกดย้อนกลับเพื่อตรวจทานแก้ไข
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1 font-bold">
                      <button
                        onClick={() => executeSaveToFirebase(false)}
                        disabled={isSaving}
                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer border-0 active:scale-95 transition-all"
                      >
                        <Save className="w-4 h-4" />
                        ยืนยันบันทึก (ยอดไม่ตรง)
                      </button>
                      <button
                        onClick={() => {
                          setShowMismatchWarning(false);
                          setIsEditing(true);
                        }}
                        className="py-3 px-4 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-800 dark:text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer border-0 active:scale-95 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        กลับไปตรวจสอบและแก้ไข
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-2">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`w-full py-4 font-black rounded-3xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-lg ${
                    isTotalMatching 
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-slate-900/10 dark:shadow-white/10' 
                      : 'bg-rose-600 text-white shadow-rose-600/20'
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5"/>
                  )}
                  {isSaving ? "กำลังบันทึก..." : isTotalMatching ? "บันทึกข้อมูล" : "บันทึกข้อมูล"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <input 
          type="file" 
          id="bill-file-input" 
          accept="image/*" 
          onChange={handleFileSelect} 
          className="hidden" 
        />
        <input 
          type="file" 
          id="native-camera-input" 
          accept="image/*" 
          capture="environment" 
          onChange={handleFileSelect} 
          className="hidden" 
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}
