import React, { useState, useEffect } from 'react';
import { X, Check, Camera, Upload } from 'lucide-react';
import { EventType, Sow } from '../types';
import { getHistoricalBreedData, getActiveBoars } from '../services/sowService';
import { optimizeImage } from '../services/imageOptimizer';
import { useAuth } from '../contexts/AuthContext';
import { VideoRecorderUpload } from './VideoRecorderUpload';
import { collection, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (type: EventType, date: string, details: any, forceConfirmed?: boolean, videoUrl?: string | null, draftDocId?: string) => void;
  type: EventType | null;
}

export default function EventModals({ isOpen, onClose, onSubmit, type }: EventModalProps) {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [details, setDetails] = useState<any>({});
  const [historicalData, setHistoricalData] = useState<{boars: string[], semens: string[]}>({ boars: [], semens: [] });
  const [activeBoars, setActiveBoars] = useState<Sow[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [draftDocId, setDraftDocId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && type === 'BREED') {
      getHistoricalBreedData().then(setHistoricalData);
      getActiveBoars().then(setActiveBoars);
    }
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setVideoUrl(null);
      setDraftDocId(null);
      // Reset details based on type
      if (type === 'BREED') setDetails({ method: 'NATURAL', boarId: '', semenId: '', source: '' });
      else if (type === 'ULTRASOUND') setDetails({ result: 'POSITIVE' });
      else if (type === 'FARROW') setDetails({ liveBorn: '', stillborn: '', mummy: '', avgWeight: '' });
      else if (type === 'WEAN') setDetails({ weanedCount: '', totalWeight: '' });
      else if (type === 'HEALTH') setDetails({ type: 'GENERAL', notes: '' });
      else if (type === 'CULL') setDetails({ reason: '' });
      else if (type === 'HEAT_RETURN') setDetails({ notes: '' });
    }
  }, [isOpen, type]);

  if (!isOpen || !type) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(type, date, details, false, videoUrl, draftDocId || undefined);
  };

  const renderFields = () => {
    switch (type) {
      case 'BREED':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">วิธีผสม</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDetails({...details, method: 'NATURAL'})}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all font-black text-sm ${
                    details.method === 'NATURAL'
                      ? 'border-[#00bcd4] text-[#00bcd4] bg-transparent'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white'
                  }`}
                >
                  <span>ผสมจริง (Natural)</span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                    details.method === 'NATURAL' ? 'bg-[#00bcd4] text-slate-900 dark:text-slate-900' : 'border border-slate-300 dark:border-white/20'
                  }`}>
                    {details.method === 'NATURAL' && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDetails({...details, method: 'AI'})}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all font-black text-sm ${
                    details.method === 'AI'
                      ? 'border-[#00bcd4] text-[#00bcd4] bg-transparent'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white'
                  }`}
                >
                  <span>ผสมเทียม (AI)</span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                    details.method === 'AI' ? 'bg-[#00bcd4] text-slate-900 dark:text-slate-900' : 'border border-slate-300 dark:border-white/20'
                  }`}>
                    {details.method === 'AI' && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                  </div>
                </button>
              </div>
            </div>
            {details.method === 'NATURAL' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">พ่อพันธุ์</label>
                {activeBoars.length > 0 ? (
                  <select 
                    className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all appearance-none"
                    value={details.boarId || ''}
                    onChange={e => setDetails({...details, boarId: e.target.value})}
                    required
                  >
                    <option value="" className="text-gray-800">-- เลือกพ่อพันธุ์ --</option>
                    {activeBoars.map(b => (
                      <option key={b.id} value={b.sowId} className="text-gray-800">
                        {b.sowId} - {b.breed} {b.penId ? `(คอก: ${b.penId})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text"
                    required
                    placeholder="ใส่รหัสพ่อพันธุ์"
                    className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all"
                    value={details.boarId || ''}
                    onChange={e => setDetails({...details, boarId: e.target.value})}
                  />
                )}
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">รหัสน้ำเชื้อ</label>
                  <input 
                    type="text" 
                    list="semen-list"
                    className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all"
                    value={details.semenId || ''}
                    onChange={e => setDetails({...details, semenId: e.target.value})}
                    required
                  />
                  <datalist id="semen-list">
                    {historicalData.semens.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">แหล่งที่มา</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all"
                    value={details.source || ''}
                    onChange={e => setDetails({...details, source: e.target.value})}
                  />
                </div>
              </>
            )}
          </>
        );
      case 'ULTRASOUND':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-3 ml-1">ผลการตรวจ</label>
            <div className="space-y-3">
              {[
                { value: 'POSITIVE', label: 'ท้อง (Positive)', colorClass: 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-transparent font-bold' },
                { value: 'NEGATIVE', label: 'ไม่ติด (Negative)', colorClass: 'border-rose-500 text-rose-600 dark:text-rose-400 bg-transparent font-bold' },
                { value: 'ABORTION', label: 'แท้ง (Abortion)', colorClass: 'border-amber-500 text-amber-600 dark:text-amber-400 bg-transparent font-bold' }
              ].map(opt => {
                const isSelected = details.result === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDetails({...details, result: opt.value})}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all font-black text-sm text-center ${
                      isSelected
                        ? opt.colorClass
                        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                      isSelected ? 'bg-current text-white dark:text-slate-900' : 'border border-slate-300 dark:border-white/20'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 'FARROW':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">ลูกเกิดรอด</label>
              <input type="number" min="0" className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all" value={details.liveBorn ?? ''} onChange={e => setDetails({...details, liveBorn: e.target.value === '' ? '' : Number(e.target.value)})} required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">ตายโคม</label>
              <input type="number" min="0" className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all" value={details.stillborn ?? ''} onChange={e => setDetails({...details, stillborn: e.target.value === '' ? '' : Number(e.target.value)})} required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">มัมมี่</label>
              <input type="number" min="0" className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all" value={details.mummy ?? ''} onChange={e => setDetails({...details, mummy: e.target.value === '' ? '' : Number(e.target.value)})} required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">น้ำหนักเฉลี่ย (กก.)</label>
              <input type="number" step="0.1" min="0" className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all" value={details.avgWeight ?? ''} onChange={e => setDetails({...details, avgWeight: e.target.value === '' ? '' : Number(e.target.value)})} required />
            </div>
          </div>
        );
      case 'WEAN':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">จำนวนลูกหย่านม</label>
              <input type="number" min="0" className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all" value={details.weanedCount ?? ''} onChange={e => setDetails({...details, weanedCount: e.target.value === '' ? '' : Number(e.target.value)})} required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">น้ำหนักรวม (กก.)</label>
              <input type="number" step="0.1" min="0" className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all" value={details.totalWeight ?? ''} onChange={e => setDetails({...details, totalWeight: e.target.value === '' ? '' : Number(e.target.value)})} required />
            </div>
          </div>
        );
      case 'HEALTH':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-3 ml-1">ประเภท</label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { value: 'GENERAL', label: 'ทั่วไป' },
                  { value: 'SICK', label: 'ป่วย/รักษา' },
                  { value: 'VACCINE', label: 'วัคซีน' }
                ].map(opt => {
                  const isSelected = details.type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDetails({...details, type: opt.value})}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-xs font-black h-20 ${
                        isSelected
                          ? 'border-[#00bcd4] text-[#00bcd4] bg-transparent'
                          : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white'
                      }`}
                    >
                      <span className="mb-2">{opt.label}</span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isSelected ? 'bg-[#00bcd4] text-slate-900 dark:text-slate-900' : 'border border-slate-300 dark:border-white/20'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">หมายเหตุ</label>
              <textarea 
                className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all"
                rows={3}
                value={details.notes || ''}
                onChange={e => setDetails({...details, notes: e.target.value})}
              ></textarea>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">แนบรูปภาพอาการป่วย/ใบประวัติวัคซีน (ถ้ามี)</label>
              {details.attachment ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 p-2 bg-slate-100 dark:bg-black/20 text-center">
                  <img src={details.attachment} alt="Sow Event Attachment" className="max-h-32 mx-auto rounded-xl object-contain shadow" />
                  <button
                    type="button"
                    onClick={() => setDetails({...details, attachment: undefined})}
                    className="mt-2 text-xs font-black text-red-500 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    ลบรูปภาพ
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center justify-center gap-2 p-3 bg-[#00bcd4]/10 hover:bg-[#00bcd4]/20 text-[#00bcd4] border-2 border-dashed border-[#00bcd4]/35 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                    <Camera className="w-4 h-4" /> ถ่ายภาพ
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const optimized = await optimizeImage(file, { type: 'document' });
                            setDetails({...details, attachment: optimized.dataUrl});
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                    />
                  </label>
                  <label className="flex items-center justify-center gap-2 p-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white border-2 border-dashed border-slate-300 dark:border-white/15 rounded-2xl text-xs font-bold transition-all cursor-pointer">
                    <Upload className="w-4 h-4" /> อัปโหลดภาพ
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const optimized = await optimizeImage(file, { type: 'document' });
                            setDetails({...details, attachment: optimized.dataUrl});
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
            {details.type === 'SICK' && (
              <div className="mb-4 border-t border-slate-200 dark:border-white/10 pt-4">
                <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">📹 วิดีโอหลักฐานอาการป่วย (Cloudflare R2)</label>
                {videoUrl ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-sm flex justify-between items-center animate-in fade-in duration-200">
                    <span>✓ อัปโหลดวิดีโอสำเร็จ</span>
                    <button type="button" onClick={() => { setVideoUrl(null); setDraftDocId(null); }} className="text-xs text-red-500 hover:underline">ลบวิดีโอ</button>
                  </div>
                ) : (
                  <VideoRecorderUpload
                    userId={user?.uid || ''}
                    moduleName="events"
                    onCreateDraft={async () => {
                      const tempDocRef = doc(collection(db, 'sow_events'));
                      setDraftDocId(tempDocRef.id);
                      return tempDocRef.id;
                    }}
                    onUploadSuccess={async (url) => {
                      setVideoUrl(url);
                    }}
                    onUploadFailure={async () => {
                      setVideoUrl(null);
                      setDraftDocId(null);
                    }}
                    maxSizeMB={20}
                  />
                )}
              </div>
            )}
          </>
        );
      case 'CULL':
      case 'HEAT_RETURN':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">สาเหตุ/หมายเหตุ</label>
            <textarea 
              className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all"
              rows={3}
              value={details.notes || details.reason || ''}
              onChange={e => setDetails({...details, [type === 'CULL' ? 'reason' : 'notes']: e.target.value})}
              required={type === 'CULL'}
            ></textarea>
          </div>
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'BREED': return 'บันทึกผสมพันธุ์';
      case 'ULTRASOUND': return 'บันทึกตรวจสัด/อัลตราซาวด์';
      case 'FARROW': return 'บันทึกคลอด';
      case 'WEAN': return 'บันทึกหย่านม';
      case 'HEALTH': return 'บันทึกสุขภาพ';
      case 'CULL': return 'คัดทิ้งแม่หมู';
      case 'HEAT_RETURN': return 'แจ้งกลับสัด';
      default: return 'บันทึกกิจกรรม';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-50 dark:bg-[#0f4c5c] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/20">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide">{getTitle()}</h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-600 dark:text-white/50  rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-2 ml-1">วันที่ทำกิจกรรม</label>
            <input 
              type="date" 
              className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00bcd4] focus:border-transparent transition-all"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          
          {renderFields()}

          <div className="mt-8">
            <button 
              type="submit" 
              className="w-full bg-[#00bcd4] text-slate-900 dark:text-white font-bold p-4 rounded-2xl shadow-[0_0_20px_rgba(0,188,212,0.3)] hover:bg-cyan-400 active:scale-95 transition-all text-lg"
            >
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
