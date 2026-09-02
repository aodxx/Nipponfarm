import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Maximize2, Minus, Send, ArrowLeft, Loader2, Search, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ChatRoom, ChatMessage, UserProfile } from '../../types';
import { subscribeToChatRooms, subscribeToMessages, sendMessage, markMessagesAsRead, getAllUsers, getOrCreateChatRoom } from '../../services/chatService';

interface ChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatOverlay({ isOpen, onClose }: ChatOverlayProps) {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [currentView, setCurrentView] = useState<'LIST' | 'ROOM' | 'USERS'>('LIST');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  
  // List state
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  
  // Room state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  
  // Users state
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');

  // Subscribe to rooms
  useEffect(() => {
    if (!user || !isOpen) return;
    const unsubscribe = subscribeToChatRooms(user.uid, (data) => {
      setRooms(data);
      setLoadingRooms(false);
    });
    return () => unsubscribe();
  }, [user, isOpen]);

  // Subscribe to messages when a room is selected
  useEffect(() => {
    if (!selectedRoomId || !user || currentView !== 'ROOM') return;
    
    markMessagesAsRead(selectedRoomId, user.uid);
    const unsubscribe = subscribeToMessages(selectedRoomId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [selectedRoomId, user, currentView]);

  const handleOpenRoom = (room: ChatRoom) => {
    setSelectedRoomId(room.id);
    setSelectedRoom(room);
    setCurrentView('ROOM');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedRoomId || !userProfile || !selectedRoom) return;

    const otherUserIds = selectedRoom.participants.filter(id => id !== user?.uid);
    setSending(true);
    try {
      await sendMessage(selectedRoomId, userProfile, inputText.trim(), otherUserIds);
      setInputText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const startPrivateChat = async (otherUser: UserProfile) => {
    if (!user || !userProfile) return;
    const roomId = await getOrCreateChatRoom(userProfile, otherUser);
    setSelectedRoomId(roomId);
    
    // Find the room object if it exists in rooms list or just set view
    const existingRoom = rooms.find(r => r.id === roomId);
    if (existingRoom) {
      setSelectedRoom(existingRoom);
    } else {
      // Mock enough for header
      setSelectedRoom({
        id: roomId,
        participants: [user.uid, otherUser.uid],
        participantNames: { [user.uid]: userProfile.displayName, [otherUser.uid]: otherUser.displayName },
        isGroup: false,
        lastMessageTime: Date.now()
      } as any);
    }
    setCurrentView('ROOM');
  };

  const loadUsers = async () => {
    setCurrentView('USERS');
    const users = await getAllUsers();
    setAllUsers(users.filter(u => u.uid !== user?.uid));
  };

  const roomName = () => {
    if (!selectedRoom) return "";
    if (selectedRoom.isGroup) return selectedRoom.name || "แชทกลุ่ม";
    const otherUserId = selectedRoom.participants.find(uid => uid !== user?.uid);
    return selectedRoom.participantNames?.[otherUserId || ''] || 'แชท';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center px-4 sm:px-0"
        >
          <div className="w-full max-w-lg mb-4 bg-white dark:bg-[#1a2f3a] rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] border-x border-t border-slate-200 dark:border-white/10 flex flex-col overflow-hidden h-[50vh] sm:h-[60vh]" id="chat-overlay-container">
            {/* Header */}
            <div className="p-4 bg-indigo-600 dark:bg-[#00bcd4] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {currentView !== 'LIST' && (
                  <button onClick={() => setCurrentView('LIST')} className="p-1 hover:bg-white/10 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <MessageCircle className="w-5 h-5" />
                <h3 className="font-bold">
                  {currentView === 'LIST' ? 'แชท & ข้อความ' : 
                   currentView === 'USERS' ? 'เลือกเพื่อนร่วมงาน' : 
                   roomName()}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                      onClose();
                      if (currentView === 'ROOM' && selectedRoomId) {
                        navigate(`/chat/${selectedRoomId}`);
                      } else {
                        navigate('/chat');
                      }
                  }} 
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="เต็มหน้าจอ"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="ย่อหน้าต่าง">
                  <Minus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List View */}
            {currentView === 'LIST' && (
              <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
                <div className="p-4 flex justify-between items-center bg-white dark:bg-transparent border-b border-slate-100 dark:border-white/5">
                  <span className="text-xs font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">การสนทนาล่าสุด</span>
                  <button onClick={loadUsers} className="text-indigo-600 dark:text-[#00bcd4] hover:underline text-sm font-bold flex items-center gap-1">
                    <Users className="w-4 h-4" /> เริ่มแชทใหม่
                  </button>
                </div>
                {loadingRooms ? (
                  <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>
                ) : rooms.length === 0 ? (
                  <div className="p-10 text-center text-slate-400">ยังไม่มีข้อความ</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {rooms.map(room => {
                      const name = room.isGroup ? room.name : room.participantNames[room.participants.find(id => id !== user?.uid) || ''];
                      const unread = room.unreadCount?.[user?.uid || ''] || 0;
                      return (
                        <div 
                          key={room.id}
                          onClick={() => handleOpenRoom(room)}
                          className="p-4 flex items-center gap-4 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-bold text-slate-600 dark:text-white/60">
                              {name?.charAt(0)}
                            </div>
                            {unread > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white dark:border-[#1a2f3a] text-[10px] flex items-center justify-center font-bold text-white">{unread}</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                              <h4 className="font-bold text-slate-800 dark:text-white truncate">{name}</h4>
                              <span className="text-[10px] text-slate-400 dark:text-white/30 shrink-0">
                                {new Date(room.lastMessageTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-white/40 truncate">{room.lastMessage || '...'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Users View */}
            {currentView === 'USERS' && (
              <div className="flex-1 flex flex-col bg-white dark:bg-[#1a2f3a]">
                <div className="p-3 border-b border-slate-100 dark:border-white/5">
                  <div className="relative search-rainbow-border">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="ค้นหาชื่อ..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl text-sm focus:outline-none dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {allUsers.filter(u => u.displayName.toLowerCase().includes(search.toLowerCase())).map(u => (
                    <div 
                      key={u.uid}
                      onClick={() => startPrivateChat(u)}
                      className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center font-bold text-slate-600 dark:text-white/60 text-xs">
                        {u.displayName.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-white">{u.displayName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Room View */}
            {currentView === 'ROOM' && (
              <div className="flex-1 flex flex-col bg-[#e2e8f0] dark:bg-slate-900 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {messages.map((msg, i) => {
                    const isMe = msg.senderId === user?.uid;
                    return (
                      <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white dark:bg-[#1a2f3a] dark:text-white rounded-bl-sm border border-slate-100 dark:border-white/5'}`}>
                          <p className="break-words">{msg.content}</p>
                          <div className={`text-[9px] mt-1 text-right opacity-60`}>
                            {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="h-2"></div>
                </div>
                <div className="p-3 bg-white dark:bg-[#1a2f3a] border-t border-slate-100 dark:border-white/10">
                  <form onSubmit={handleSend} className="flex gap-2">
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      placeholder="พิมพ์ข้อความ..."
                      className="flex-1 bg-slate-100 dark:bg-white/5 rounded-full px-4 py-2 text-sm focus:outline-none dark:text-white"
                    />
                    <button 
                      type="submit" 
                      disabled={!inputText.trim() || sending}
                      className="p-2 bg-indigo-600 dark:bg-[#00bcd4] text-white rounded-full disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
