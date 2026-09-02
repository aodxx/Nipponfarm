import React, { useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
// @ts-ignore
import HTMLFlipBook from 'react-pageflip';

interface BookViewerProps {
  title: string;
  onClose: () => void;
}

const pages = [
  {
    title: "เขตปนเปื้อนหรือเขตสีดำ",
    content: `การจัดการพื้นที่ฟาร์มที่มีประสิทธิภาพต้องตั้งอยู่บนสมมติฐานที่ว่า "พื้นที่ภายนอกฟาร์มคือพื้นที่ปนเปื้อน" เสมอ การแบ่งโซนจึงเปรียบเสมือนการสร้างกำแพงป้องกันหลายชั้นเพื่อกรองความเสี่ยงก่อนที่สิ่งแปลกปลอมจะเข้าสู่โรงเรือนสุกร\n\n1. เขตปนเปื้อนหรือเขตสีดำ (Dirty Zone / Black Zone): พื้นที่นี้นับตั้งแต่รั้วรอบนอกฟาร์ม (Perimeter Fence) ออกไปจนถึงโลกภายนอก รวมถึงจุดที่ยานพาหนะขนส่งอาหารหรือลูกค้าเข้ามาจอด พื้นที่นี้มีความเสี่ยงสูงที่สุดจากการปนเปื้อนที่ติดมากับล้อรถ รองเท้าของบุคคลภายนอก หรือแม้แต่ฝุ่นละอองที่ลอยมากับอากาศ`
  },
  {
    title: "เขตเปลี่ยนผ่านหรือเขตสีเทา",
    content: `2. เขตเปลี่ยนผ่านหรือเขตสีเทา (Grey Zone / Buffer Zone): เป็นพื้นที่ระหว่างสำนักงานหน้าฟาร์มและโรงเรือนสุกร พื้นที่นี้มักใช้เป็นจุดรวมของอาคารอาบน้ำเปลี่ยนชุด (Shower Block) โรงซักล้าง และคลังเก็บอุปกรณ์ที่ผ่านการฆ่าเชื้อแล้ว พนักงานที่อยู่ในโซนนี้ต้องสวมชุดที่ฟาร์มจัดไว้ให้สำหรับเขตเทาเท่านั้น และห้ามเดินย้อนกลับไปโซนสีดำโดยไม่ผ่านกระบวนการทำความสะอาดใหม่\n\n3. เขตสะอาดหรือเขตสีขาว (Clean Zone / White Zone): พื้นที่ภายในโรงเรือนสุกรและทางเดินที่เชื่อมต่อระหว่างโรงเรือน เป็นเขตที่มีความปลอดภัยสูงสุด เฉพาะสุกรและพนักงานที่ผ่านการอาบน้ำสระผมเปลี่ยนชุดใหม่ (Shower-in) เท่านั้นที่เข้าถึงได้`
  },
  {
    title: "เส้นแบ่งเขตและกฎการข้าม",
    content: `เส้นแบ่งเขต (Line of Separation - LOS) และกฎการข้ามเขตอย่างปลอดภัย\nเส้นแบ่งเขตหรือ LOS คือจุดที่สำคัญที่สุดในระบบ Biosecurity เพราะเป็นจุดที่มีการสัมผัสกันระหว่างพื้นที่สองระดับความสะอาด\n\n• สิ่งกีดขวางทางกายภาพ: LOS ไม่ควรเป็นเพียงเส้นสีบนพื้น แต่ควรเป็นม้านั่งข้าม (Danish Entry Bench) หรือประตูกั้นที่บังคับให้พนักงานต้องหยุดและเปลี่ยนรองเท้า\n\n• กฎการเดินข้าม (The One-Step Rule): เมื่อพนักงานนั่งลงบนม้านั่งกั้นเขตในห้องเปลี่ยนชุด พนักงานต้องถอดรองเท้าจากโซนที่สกปรกกว่าไว้ฝั่งหนึ่ง แล้วหมุนตัวข้ามม้านั่งโดยไม่ให้เท้าเปล่าหรือถุงเท้าสัมผัสพื้นฝั่งที่สกปรก จากนั้นจึงใส่รองเท้าบูทหรือรองเท้าผ้าใบที่เตรียมไว้เฉพาะสำหรับโซนที่สะอาดกว่า\n\n• การจัดการสิ่งของข้ามเขต: สิ่งของทุกชิ้นห้ามนำเข้าเขตสะอาดโดยไม่ผ่านการฆ่าเชื้อด้วยแสง UV`
  },
  {
    title: "ขั้นตอนการเข้าฟาร์ม (Shower-in)",
    content: `พนักงานต้องปฏิบัติงานตามขั้นตอนที่เข้มงวด ดังนี้:\n\n1. จุดถอดชุดภายนอก (Dirty Locker): ถอดเสื้อผ้า ชุดชั้นใน ถุงเท้า และเครื่องประดับทุกชิ้น (รวมถึงนาฬิกา แหวน สร้อยคอ) เก็บไว้ในล็อกเกอร์โซนสีดำ ห้ามนำโทรศัพท์มือถือส่วนตัวเข้าในเขตสะอาดเด็ดขาดหากไม่ได้รับอนุญาต\n\n2. ห้องพ่นน้ำยาฆ่าเชื้อ (Disinfectant Mist Room): (ถ้ามี) เดินผ่านระบบพ่นละอองฝอยน้ำยาฆ่าเชื้อที่มีความปลอดภัยต่อผิวหนังเพื่อลดปริมาณเชื้อในเบื้องต้น`
  },
  {
    title: "กระบวนการอาบน้ำที่ถูกต้อง",
    content: `3. การอาบน้ำ (The Decontamination Process):\n\n• การสระผม: ต้องสระผมด้วยแชมพูทุกครั้ง เนื่องจากผมเป็นจุดที่เก็บกักฝุ่นปนเปื้อนได้หนาแน่นที่สุด\n• การฟอกสบู่: ต้องฟอกสบู่ให้เกิดฟองทั่วร่างกาย เน้นเป็นพิเศษที่ซอกใบหู ซอกรักแร้ และง่ามนิ้วเท้า\n• การทำความสะอาดเล็บ: ใช้แปรงขัดซอกเล็บมือและเล็บเท้าให้นานอย่างน้อย 10-20 วินาทีต่อข้าง\n• อุณหภูมิน้ำ: ใช้น้ำอุณหภูมิปกติหรืออุ่นเล็กน้อย (ประมาณ 30-38°C) เพื่อช่วยให้รูขุมขนเปิดและสบู่ทำงานได้อย่างมีประสิทธิภาพ\n\n4. จุดเปลี่ยนชุดภายใน (Clean Locker): เมื่ออาบน้ำเสร็จแล้ว พนักงานต้องเช็ดตัวให้แห้งและสวมใส่ชุดทำงาน (Coveralls) ที่ผ่านการซักฆ่าเชื้อและอบแห้งแล้วเท่านั้น`
  }
];

// Page Component
const Page = React.forwardRef<HTMLDivElement, { pageNum: number; title: string; content: string }>(
  ({ pageNum, title, content }, ref) => {
    return (
      <div 
        ref={ref} 
        className="bg-[#fdfbf7] h-full shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] border-r border-[#eaddcd] relative flex flex-col pt-10 pb-8 px-6 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"
      >
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/20 via-black/5 to-transparent pointer-events-none z-10" />
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <h2 className="text-xl font-bold mb-6 text-[#0f4c5c] border-b-2 border-[#00bcd4]/30 pb-2 inline-block">
            {title}
          </h2>
          <div className="text-gray-800 space-y-4 leading-relaxed whitespace-pre-wrap font-sans text-[15px]">
            {content}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-black/10 text-center text-sm font-bold text-gray-400">
          - {pageNum} -
        </div>
      </div>
    );
  }
);
Page.displayName = 'Page';

export default function BookViewer({ title, onClose }: BookViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const bookRef = useRef<any>(null);

  const onFlip = (e: any) => {
    setCurrentPage(e.data);
  };

  const nextPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipNext();
    }
  };

  const prevPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipPrev();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
      
      {/* Header outside the book */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-50">
        <h3 className="font-bold text-slate-900 dark:text-white text-lg tracking-wide pl-2 filter drop-shadow-xl">{title}</h3>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/20 active:scale-95 text-slate-900 dark:text-white bg-white dark:bg-white/10 backdrop-blur-sm transition-all border border-slate-200 dark:border-white/20">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Book Container */}
      <div className="flex-1 flex items-center justify-center p-4 w-full h-full mt-12 mb-20 overflow-hidden">
        {/* We use width/height slightly smaller than viewport size but keep ratio */}
        <div style={{ maxWidth: '400px', width: '100%', aspectRatio: '3 / 4.5' }}>
          {/* @ts-ignore */}
          <HTMLFlipBook 
            width={350} 
            height={500} 
            size="stretch"
            minWidth={300}
            maxWidth={500}
            minHeight={400}
            maxHeight={700}
            maxShadowOpacity={0.5}
            showCover={true}
            mobileScrollSupport={true}
            onFlip={onFlip}
            className="book-shadow mx-auto"
            ref={bookRef}
            usePortrait={true}
          >
            {/* Cover Page */}
            <div className="bg-gradient-to-br from-[#0f4c5c] to-[#0a2e36] h-full shadow-2xl relative border-l-[12px] border-[#0a2e36]/80 flex flex-col justify-center items-center text-center p-8">
              <div className="w-16 h-16 bg-[#00bcd4]/20 rounded-2xl flex items-center justify-center mb-6 border border-[#00bcd4]/30 shadow-inner">
                <span className="text-3xl">📘</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 drop-shadow-xl dark:shadow-2xl">{title}</h1>
              <p className="text-[#00bcd4] font-medium text-sm border-t border-slate-200 dark:border-white/10 pt-4 w-full">นิพนธ์ฟาร์ม</p>
              
              {/* Cover shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-transparent pointer-events-none" />
            </div>

            {/* Inner Pages */}
            {pages.map((p, idx) => (
              <Page 
                key={idx} 
                pageNum={idx + 1} 
                title={p.title} 
                content={p.content} 
              />
            ))}

            {/* Back Cover */}
            <div className="bg-slate-50 dark:bg-[#0f4c5c] h-full shadow-2xl relative border-r-[12px] border-[#0a2e36]/80 flex flex-col justify-center items-center text-center p-8">
              <div className="opacity-30">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nipon Farm</h1>
                <p className="text-slate-600 dark:text-white/60 text-xs">คู่มือปฏิบัติงานภายในฟาร์ม</p>
              </div>
            </div>
          </HTMLFlipBook>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-6 left-0 w-full flex justify-center items-center gap-8 z-50">
        <button 
          onClick={prevPage} 
          disabled={currentPage === 0}
          className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-white/20 bg-white dark:bg-white/10 backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-900 dark:text-white border border-slate-200 dark:border-white/20 shadow-xl dark:shadow-2xl"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl">
          <span className="text-sm font-bold text-slate-800 dark:text-white/90 tracking-wide">
            {currentPage === 0 ? 'หน้าปก' : currentPage > pages.length ? 'ปกหลัง' : `หน้า ${currentPage} / ${pages.length}`}
          </span>
        </div>

        <button 
          onClick={nextPage} 
          disabled={currentPage === pages.length + 1}
          className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-white/20 bg-white dark:bg-white/10 backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-900 dark:text-white border border-slate-200 dark:border-white/20 shadow-xl dark:shadow-2xl"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

    </div>
  );
}
