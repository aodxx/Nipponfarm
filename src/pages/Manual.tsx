import React, { useState } from 'react';
import { BookOpen } from 'lucide-react'; // Fallback icon
import BookViewer from '../components/BookViewer';

// Data structure
const TOC_DATA = [
  {
    id: 'part1',
    title: 'ส่วนที่ 1: พื้นฐานและความปลอดภัยในฟาร์ม',
    icon: '🛡️',
    items: [
      { id: '1.1', title: '1.1 วัตถุประสงค์และขอบเขตการใช้งานคู่มือ' },
      { id: '1.2', title: '1.2 กฎความปลอดภัยส่วนบุคคลและสุขอนามัยฟาร์ม' },
      { id: '1.3', title: '1.3 วงจรการขยายพันธุ์สุกรแบบเข้าใจง่าย (Timeline 114 วัน)' },
      { id: '1.4', title: '1.4 ระบบการบันทึกข้อมูลและของการอัปเดตประจำวัน' }
    ]
  },
  {
    id: 'part2',
    title: 'ส่วนที่ 2: การผสมพันธุ์แม่สุกร',
    icon: '🧬',
    items: [
      { id: '2.1', title: '2.1 การประเมินความพร้อมแม่สุกร' },
      { id: '2.2', title: '2.2 การสังเกตอาการเป็นสัดและช่วงเวลาทองในการผสม' },
      { id: '2.3', title: '2.3 เทคนิคการผสมพันธุ์' },
      { id: '2.4', title: '2.4 การจัดการหลังผสม 24–48 ชั่วโมงแรก' },
      { id: '2.5', title: '2.5 ปัญหาที่พบบ่อยและการแก้ไขเบื้องต้น' }
    ]
  },
  {
    id: 'part3',
    title: 'ส่วนที่ 3: การตรวจท้องและการดูแลระยะตั้งท้อง',
    icon: '🩺',
    items: [
      { id: '3.1', title: '3.1 วิธีการตรวจท้อง' },
      { id: '3.2', title: '3.2 ระยะพัฒนาการของลูกในครรภ์และความต้องการสารอาหาร' },
      { id: '3.3', title: '3.3 การให้อาหารและปรับสูตรตามไตรมาสการตั้งท้อง' },
      { id: '3.4', title: '3.4 การจัดการสภาพแวดล้อมคอกตั้งท้อง' },
      { id: '3.5', title: '3.5 การป้องกันโรคและการดูแลสุขภาพแม่สุกรตั้งท้อง' },
      { id: '3.6', title: '3.6 การบันทึกผลและการติดตามพัฒนาการ' }
    ]
  },
  {
    id: 'part4',
    title: 'ส่วนที่ 4: การเตรียมคลอดและการดูแลระยะคลอด',
    icon: '🛏️',
    items: [
      { id: '4.1', title: '4.1 การเตรียมคอกคลอดและอุปกรณ์จำเป็น' },
      { id: '4.2', title: '4.2 อาการเตือนก่อนคลอดและเวลาการย้ายแม่' },
      { id: '4.3', title: '4.3 ขั้นตอนการดูแลระหว่างคลอด' },
      { id: '4.4', title: '4.4 การดูแลลูกสุกรแรกเกิด' },
      { id: '4.5', title: '4.5 การจัดการกรณีผิดปกติ' }
    ]
  },
  {
    id: 'part5',
    title: 'ส่วนที่ 5: การเลี้ยงดูระยะให้นมและการหย่านม',
    icon: '🍼',
    items: [
      { id: '5.1', title: '5.1 การจัดการอาหารและน้ำแม่สุกร' },
      { id: '5.2', title: '5.2 การดูแลลูกสุกรก่อนหย่านม' },
      { id: '5.3', title: '5.3 เกณฑ์การหย่านมที่เหมาะสม' },
      { id: '5.4', title: '5.4 ขั้นตอนการหย่านม' },
      { id: '5.5', title: '5.5 การดูแลหลังหย่านม' }
    ]
  },
  {
    id: 'part6',
    title: 'ส่วนที่ 6: การติดตามผลและแก้ไขปัญหา',
    icon: '📊',
    items: [
      { id: '6.1', title: '6.1 แบบฟอร์มบันทึกข้อมูล' },
      { id: '6.2', title: '6.2 ตัวชี้วัดประสิทธิภาพ (KPIs) ของฟาร์ม' },
      { id: '6.3', title: '6.3 แนวทางการแก้ไขปัญหาเร่งด่วน' },
      { id: '6.4', title: '6.4 เกณฑ์การเรียกสัตวแพทย์' }
    ]
  },
  {
    id: 'appendix',
    title: 'ภาคผนวก',
    icon: '📎',
    items: [
      { id: 'A1', title: 'ตารางมาตรฐานแม่สุกร' },
      { id: 'A2', title: 'รายการยาและวัคซีน' },
      { id: 'A3', title: 'คำศัพท์เทคนิค' },
      { id: 'A4', title: 'แบบฟอร์มตัวอย่าง' },
      { id: 'A5', title: 'ข้อมูลติดต่อฉุกเฉิน' }
    ]
  }
];

export default function Manual() {
  const [activeBook, setActiveBook] = useState<{id: string, title: string} | null>(null);

  return (
    <div className="pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#00bcd4]/10 rounded-3xl p-6 border border-[#00bcd4]/20 text-center mb-8 shadow-[0_0_20px_rgba(0,188,212,0.1)] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[150%] bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg]" />
        
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">คู่มือปฏิบัติงาน</h1>
        <p className="text-slate-600 dark:text-white/60 text-sm mb-4 relative z-10">การจัดการแม่สุกรระยะผสมพันธุ์จนถึงหย่านม</p>
        <div className="inline-block bg-white dark:bg-[#0a2e36] text-[#00bcd4] text-xs font-bold px-3 py-1 rounded-full border border-[#00bcd4]/30 relative z-10">
          ฉบับปรับปรุง 2026
        </div>
      </div>

      <div className="space-y-4">
        {TOC_DATA.map((part) => (
          <div key={part.id} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden focus-within:border-[#00bcd4]/50 transition-colors">
            <details className="group" open={part.id === 'part1'}>
              <summary className="flex items-center gap-4 list-none p-5 cursor-pointer select-none">
                <div className="text-2xl w-10 h-10 flex items-center justify-center bg-white dark:bg-[#0a2e36] rounded-xl border border-slate-200 dark:border-white/10 text-center shadow-inner">
                  {part.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-slate-900 dark:text-white font-medium text-[15px]">{part.title}</h2>
                </div>
                <div className="text-slate-600 dark:text-white/40 group-open:rotate-90 transition-transform duration-300">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              </summary>
              <div className="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-white/5 bg-black/20">
                <div className="space-y-2 mt-3">
                  {part.items.map(item => (
                    <button 
                      key={item.id}
                      onClick={() => setActiveBook({ id: item.id, title: item.title })}
                      className="w-full text-left p-3 rounded-xl hover:bg-[#00bcd4]/20 hover:border-[#00bcd4]/30 border border-transparent text-slate-600 dark:text-white/70  text-sm transition-all flex items-start gap-3 active:scale-[0.98]"
                    >
                      <span className="text-[#00bcd4]/50 font-mono mt-0.5">{item.id.includes('.') ? '•' : ''}</span>
                      <span className="leading-snug">{item.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </div>
        ))}
      </div>

      {activeBook && (
        <BookViewer 
          title={activeBook.title} 
          onClose={() => setActiveBook(null)} 
        />
      )}
    </div>
  );
}
