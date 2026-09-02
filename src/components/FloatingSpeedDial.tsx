import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Video, Camera, Wrench, Plus, X, Scale } from 'lucide-react';

export default function FloatingSpeedDial() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/yki-ggro-ymw');
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Listen to Firestore for external meeting states
  useEffect(() => {
    const docRef = doc(db, 'farm_settings', 'meeting');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const active = !!data.is_meeting_active;
        setIsMeetingActive(active);
        if (data.meeting_link) {
          setMeetingLink(data.meeting_link);
        }
      } else {
        // Automatically initialize to sensible default if missing
        setDoc(docRef, {
          is_meeting_active: false,
          meeting_link: 'https://meet.google.com/yki-ggro-ymw',
          updatedAt: Date.now()
        }, { merge: true }).catch(err => console.error(err));
      }
    }, (err) => {
      console.warn("Could not synchronize meeting options from Firestore:", err);
    });

    return () => unsubscribe();
  }, []);

  // Soft high-alert double whistle chime synthesizer for meeting calls
  const playMeetingNotificationTone = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, volume: number = 0.4) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
        
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      // Play premium alerting chime sequence (Urgent Arpeggio style)
      playTone(587.33, 'triangle', 0, 0.25, 0.4); // D5
      playTone(783.99, 'triangle', 0.1, 0.25, 0.4); // G5
      playTone(587.33, 'triangle', 0.2, 0.25, 0.4); // D5
      playTone(783.99, 'triangle', 0.3, 0.35, 0.4); // G5
    } catch (err) {
      console.warn("Fallback synth tone failed:", err);
    }
  };

  // Trigger continuous sound loops and smartphone vibrations recursively when isMeetingActive == true
  useEffect(() => {
    let intervalId: any = null;

    if (isMeetingActive) {
      // Trigger immediately first
      if ('vibrate' in navigator) {
        navigator.vibrate([400, 200, 400, 200, 400]);
      }
      playMeetingNotificationTone();

      // Loop alarms every 3 seconds to ensure workers in muddy areas/noise are alerted
      intervalId = setInterval(() => {
        if ('vibrate' in navigator) {
          navigator.vibrate([400, 200, 400, 200, 400]);
        }
        playMeetingNotificationTone();
      }, 3000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isMeetingActive]);

  // Click outside listener to collapse Speed Dial
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const menuItems = [
    {
      id: 'meeting',
      label: isMeetingActive ? '📡 ด่วน! เข้าร่วมประชุมฟาร์ม' : 'การประชุมฟาร์ม',
      icon: <Video className={`w-6 h-6 ${isMeetingActive ? 'text-white' : 'text-indigo-400'}`} />,
      colorClass: isMeetingActive 
        ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/40 border border-red-450 animate-pulse' 
        : 'bg-[#0E214B]/80 backdrop-blur-md hover:bg-[#0E214B] shadow-lg border border-white/15 hover:border-indigo-400/50',
      action: () => {
        setIsOpen(false);
      },
      isLink: true,
      href: meetingLink,
      pulse: isMeetingActive
    },
    {
      id: 'scan',
      label: 'สแกนบิล (AI Scan)',
      icon: <Camera className="w-6 h-6 text-emerald-400" />,
      colorClass: 'bg-[#0E214B]/80 backdrop-blur-md hover:bg-[#0E214B] shadow-lg border border-white/15 hover:border-emerald-400/50',
      action: () => {
        navigate('/scan');
        setIsOpen(false);
      }
    },
    {
      id: 'maintenance',
      label: 'แจ้งซ่อมอุปกรณ์',
      icon: <Wrench className="w-6 h-6 text-amber-400" />,
      colorClass: 'bg-[#0E214B]/80 backdrop-blur-md hover:bg-[#0E214B] shadow-lg border border-white/15 hover:border-amber-400/50',
      action: () => {
        navigate('/maintenance/new');
        setIsOpen(false);
      }
    },
    {
      id: 'weighing',
      label: 'เครื่องชั่งน้ำหนัก (บิลขายใหม่)',
      icon: <Scale className="w-6 h-6 text-[#00bcd4]" />,
      colorClass: 'bg-[#0E214B]/80 backdrop-blur-md hover:bg-[#0E214B] shadow-lg border border-white/15 hover:border-[#00bcd4]/50',
      action: () => {
        navigate('/sales/new');
        setIsOpen(false);
      }
    }
  ];

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-24 right-5 sm:bottom-28 sm:right-10 flex flex-col items-center z-50 pointer-events-none"
    >
      <div className="relative flex flex-col items-center gap-3">
        {/* Child items container */}
        <AnimatePresence>
          {isOpen && (
            <div className="flex flex-col items-center gap-3 mb-2 pointer-events-auto">
              {menuItems.map((item, index) => {
                const buttonContent = (
                  <div className="flex items-center group relative cursor-pointer">
                    {/* Tooltip Label */}
                    <span className="absolute right-16 px-3 py-1.5 text-xs font-black text-slate-800 dark:text-white bg-white/95 dark:bg-[#07242c]/95 border border-slate-200/50 dark:border-white/10 rounded-xl shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none tracking-wide">
                      {item.label}
                    </span>
                    
                    {/* Ripple Ring Wave for Meeting Pulse */}
                    {item.pulse && (
                      <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping pointer-events-none" />
                    )}

                    {/* Circular Icon */}
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${item.colorClass} text-white transition-all duration-300 active:scale-95 cursor-pointer shadow-lg`}>
                      {item.icon}
                    </div>
                  </div>
                );

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 15, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.8 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    {item.isLink ? (
                      <a 
                        href={item.href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={item.action}
                        className="block outline-none"
                      >
                        {buttonContent}
                      </a>
                    ) : (
                      <button 
                        onClick={item.action}
                        className="block outline-none border-0 p-0 m-0 bg-transparent"
                      >
                        {buttonContent}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>

        {/* Base Anchor main toggle button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white hover:brightness-110 active:scale-95 transition-all duration-300 border-0 outline-none cursor-pointer z-50 pointer-events-auto relative ${
            isMeetingActive 
              ? 'bg-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.6)] animate-pulse' 
              : 'bg-[#00bcd4] dark:bg-[#008ba3] shadow-[0_4px_16px_rgba(0,188,212,0.4)] hover:shadow-[0_6px_20px_rgba(0,188,212,0.5)]'
          }`}
          title={isOpen ? 'ปิดเมนู' : 'เปิดเมนูลัด'}
        >
          {isMeetingActive && (
            <span className="absolute inset-0 rounded-full bg-red-400/45 animate-ping pointer-events-none" />
          )}
          {isMeetingActive && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full border-2 border-white animate-bounce" />
          )}

          {/* Main Toggle Animation */}
          <motion.div
            animate={{ rotate: isOpen ? 135 : 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex items-center justify-center"
          >
            {isOpen ? <X className="w-7 h-7 stroke-[2.5]" /> : <Plus className="w-7 h-7 stroke-[2.5]" />}
          </motion.div>
        </button>
      </div>
    </div>
  );
}
