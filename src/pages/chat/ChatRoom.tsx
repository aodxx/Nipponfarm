import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Loader2, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ChatMessage, ChatRoom } from '../../types';
import { subscribeToMessages, sendMessage, markMessagesAsRead } from '../../services/chatService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function ChatRoomPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial room info
  useEffect(() => {
    if (!roomId) return;
    const fetchRoom = async () => {
      const snap = await getDoc(doc(db, 'chat_rooms', roomId));
      if (snap.exists()) {
        setRoom(snap.data() as ChatRoom);
      }
    };
    fetchRoom();
  }, [roomId]);

  // Subscribe to messages
  useEffect(() => {
    if (!roomId || !user) return;
    
    // Mark as read upon entering
    markMessagesAsRead(roomId, user.uid);

    const unsubscribe = subscribeToMessages(roomId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      // Automatically mark as read if new message comes in while we are in the room
      markMessagesAsRead(roomId, user.uid);
    });
    return () => unsubscribe();
  }, [roomId, user]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !roomId || !userProfile || !room) return;

    const otherUserIds = room.participants.filter(id => id !== user?.uid);
    
    setSending(true);
    try {
      await sendMessage(roomId, userProfile, inputText.trim(), otherUserIds);
      setInputText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const isGroup = room?.isGroup;
  let roomName = room?.name || "แชทกลุ่ม";
  if (!isGroup) {
    const otherUserId = room?.participants.find(uid => uid !== user?.uid);
    roomName = room?.participantNames[otherUserId || ''] || 'กำลังโหลด...';
  }

  if (loading && !room) {
    return <div className="p-8 text-center text-gray-500 flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -mt-6 -mx-4 sm:mx-0 sm:mt-0 bg-gray-50 sm:rounded-3xl sm:border border-gray-200 overflow-hidden relative">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center gap-3 shrink-0 shadow-xl z-10">
        <button 
          onClick={() => navigate('/chat')}
          className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold shadow-inner">
          {isGroup ? "G" : roomName.charAt(0)}
        </div>
        <div>
          <h2 className="font-bold text-gray-900 leading-tight text-lg">{roomName}</h2>
          <div className="text-xs text-green-500 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> {isGroup ? `${room?.participants.length || 0} สมาชิก` : 'แชทส่วนตัว'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed" style={{ backgroundColor: '#e2e8f0' }}>
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === user?.uid;
          const showTime = idx === 0 || (msg.createdAt - messages[idx - 1].createdAt > 5 * 60 * 1000); // show time gap > 5 mins
          
          return (
            <React.Fragment key={msg.id || idx}>
              {showTime && (
                <div className="text-center my-4">
                  <span className="bg-black/10 text-gray-600 text-[11px] uppercase font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                    {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                <div className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-xl relative ${
                  isMe 
                    ? 'bg-indigo-600 text-slate-900 dark:text-white rounded-br-sm' 
                    : 'bg-white text-gray-900 rounded-bl-sm border border-gray-100 shadow-xl'
                }`}>
                  {!isMe && isGroup && (
                    <div className="text-xs font-bold text-indigo-600 mb-1">
                      {msg.senderName}
                    </div>
                  )}
                  <p className="text-lg leading-relaxed break-words">{msg.content}</p>
                  
                  <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    {isMe && (
                      <span className="flex items-center">
                        {msg.read ? <CheckCheck className="w-[12px] h-[12px] text-slate-900 dark:text-white" /> : <Check className="w-[12px] h-[12px] opacity-70" />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-200 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="พิมพ์ข้อความ..."
            className="flex-1 bg-gray-100 rounded-full px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 border border-transparent text-lg"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-slate-900 dark:text-white rounded-full flex items-center justify-center shrink-0 shadow-xl transition-transform active:scale-95"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
          </button>
        </form>
      </div>
    </div>
  );
}
