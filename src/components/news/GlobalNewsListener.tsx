import React, { useEffect, useState, useRef } from 'react';
import { OperationType, handleFirestoreError } from '../../lib/firestore-error';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { NewsPost } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, BellRing, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function GlobalNewsListener() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notification, setNotification] = useState<{ id: string, title: string, message: string, link: string } | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const initialLoadRef = useRef(true);
  const isChatInitialLoad = useRef(true);
  const notifiedChats = useRef(new Set<string>());
  const mountTimeRef = useRef(Date.now());
  const locationRef = useRef(location.pathname);
  const audioUnlockedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  // Audio Context unlocker
  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          audioCtxRef.current = new AudioContext();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };
    
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  // Setup Notifications
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setPermission(perm);
    }
    
    // Unlock audio context cleanly on user interaction
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        ctx.resume();
        audioUnlockedRef.current = true;
      }
    } catch (e) {}
  };

  const showSystemNotification = async (title: string, body: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // Mobile browsers require Service Worker to show notifications
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, {
          body,
          icon: '/icon.svg',
          vibrate: [200, 100, 200, 100, 400],
          tag: 'news-alert',
          renotify: true,
          silent: false
        } as any);
      } else {
        // Desktop
        new Notification(title, { body, icon: '/icon.svg', silent: false } as any);
      }
    } catch (err) {
      console.warn("System notification failed:", err);
    }
  };

  useEffect(() => {
    if (!user || !userProfile || userProfile.role === 'PENDING' || userProfile.role === 'RESIGNED') return;
    
    // 1. Listen for new News Posts
    const qNews = query(
      collection(db, 'news_posts'),
      where('createdAt', '>', mountTimeRef.current),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribeNews = onSnapshot(qNews, (snapshot) => {
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as NewsPost;
          
          if (data.userId !== user.uid) {
            playNotificationSound();
            
            let preview = data.content ? data.content.trim() : '';
            if (!preview) {
               if (data.imageUrls && data.imageUrls.length > 0) preview = '📷 ได้ส่งรูปภาพใหม่';
               else if (data.videoUrl) preview = '🎥 ได้แชร์วิดีโอ';
               else if (data.audioUrl) preview = '🎵 ได้ส่งข้อความเสียง';
               else preview = 'โพสต์แจ้งข่าวสารใหม่';
            } else {
               preview = preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
            }

            const title = `อัปเดตจาก: ${data.authorName}`;
            
            setNotification({ id: change.doc.id, title, message: preview, link: '/news' });
            setTimeout(() => setNotification(null), 6000);

            if (document.hidden) {
              showSystemNotification(title, preview);
            }
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'news_posts');
    });

    // 2. Listen for new Chat Messages directed to user
    const qChat = query(
      collection(db, 'chat_rooms'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribeChat = onSnapshot(qChat, (snapshot) => {
      if (isChatInitialLoad.current) {
        isChatInitialLoad.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const room = change.doc.data() as any;
          // check if unreadCount for current user went up
          const unreadCount = room.unreadCount?.[user.uid] || 0;
          if (unreadCount > 0 && room.lastMessageSenderId !== user.uid) {
             const msgKey = `${room.id}_${room.updatedAt}_${room.lastMessageSenderId}`;
             
             if (!notifiedChats.current.has(msgKey)) {
               notifiedChats.current.add(msgKey);
               
               const senderName = room.participantNames[room.lastMessageSenderId] || 'ข้อความใหม่';
               
               // Only notify if we are not currently IN that specific chat room
               if (locationRef.current !== `/chat/${room.id}`) {
                 playNotificationSound();
                 
                 const title = `ข้อความจาก: ${senderName}`;
                 const preview = room.lastMessage || 'ส่งข้อความถึงคุณ';
                 
                 setNotification({ id: `chat_${room.id}`, title, message: preview, link: `/chat/${room.id}` });
                 setTimeout(() => setNotification(null), 6000);

                 if (document.hidden) {
                   showSystemNotification(title, preview);
                 }
               }
             }
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chat_rooms');
    });

    return () => {
       unsubscribeNews();
       unsubscribeChat();
    };
  }, [user, userProfile]);

  const playNotificationSound = () => {
    try {
      // Vibrate on mobile (Android)
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }

      // Check if Context exists
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      
      // Auto-resume if suspended (might need user gesture, but worth trying)
      if (ctx.state === 'suspended') {
        const resumeCtx = async () => {
          try {
            await ctx.resume();
          } catch(e) {}
        };
        resumeCtx();
      }
      
      const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, volume: number = 1) => {
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

      // Modern soft double chime (like iOS or modern chat apps)
      playTone(880.00, 'sine', 0, 0.4, 0.5); // A5
      playTone(1760.00, 'sine', 0, 0.3, 0.2); // A6
      
      playTone(1174.66, 'sine', 0.15, 0.6, 0.5); // D6
      playTone(2349.32, 'sine', 0.15, 0.4, 0.2); // D7

    } catch (err) {
      console.warn("Audio playback failed", err);
    }
  };

  return (
    <>
      {/* Permission request UI */}
      {permission === 'default' && (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-indigo-900/90 backdrop-blur text-slate-900 dark:text-white p-4 rounded-2xl shadow-2xl dark:shadow-xl flex items-center justify-between border border-indigo-500/30">
          <div className="flex items-center gap-3">
            <BellRing className="w-6 h-6 text-indigo-300" />
            <div className="text-sm font-medium">เปิดแจ้งเตือนระบบ เพื่อให้สั่นและส่งเสียงแม้ย่อหน้าจอ</div>
          </div>
          <button 
            onClick={requestPermission}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-bold shadow whitespace-nowrap"
          >
            เปิดรับ
          </button>
        </div>
      )}

      {/* In-app Notification Banner */}
      {notification && (
        <div className="fixed top-4 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none animate-in slide-in-from-top-10 fade-in duration-300">
          <div 
            className="pointer-events-auto bg-gradient-to-r from-indigo-500 to-purple-600 text-slate-900 dark:text-white px-4 py-3 rounded-2xl shadow-[0_10px_25px_-5px_rgba(99,102,241,0.5)] flex items-center gap-3 w-full max-w-sm cursor-pointer border border-slate-200 dark:border-white/20"
            onClick={() => {
              const targetLink = notification.link || '/news';
              setNotification(null);
              if (locationRef.current !== targetLink) {
                navigate(targetLink);
              } else {
                 window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <div className="bg-slate-100 dark:bg-white/20 p-2 rounded-full shrink-0">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex-1 text-[15px] leading-tight overflow-hidden">
              <div className="font-bold truncate text-slate-900 dark:text-white">{notification.title}</div>
              <div className="text-[14px] font-medium text-slate-700/95 dark:text-white/95 truncate mt-0.5">{notification.message}</div>
              <div className="text-[11px] text-slate-600 dark:text-white/60 font-normal mt-1">กดเพื่อดูประกาศล่าสุด</div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setNotification(null);
              }}
              className="bg-black/20 hover:bg-black/40 p-1.5 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
