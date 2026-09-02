import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Users, Search, ChevronRight, UserPlus, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ChatRoom, UserProfile } from '../../types';
import { subscribeToChatRooms, getAllUsers, getOrCreateChatRoom, createGroupChat } from '../../services/chatService';

export default function ChatList() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  
  // Group chat state
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToChatRooms(user.uid, (data) => {
      setRooms(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const loadUsers = async () => {
    const users = await getAllUsers();
    setAllUsers(users.filter(u => u.uid !== user?.uid));
    setShowUsersModal(true);
    setIsGroupMode(false);
    setSelectedUsers([]);
    setGroupName('');
  };

  const startChat = async (otherUser: UserProfile) => {
    if (!user || !userProfile) return;
    if (isGroupMode) {
      toggleUserSelection(otherUser);
      return;
    }
    const roomId = await getOrCreateChatRoom(userProfile, otherUser);
    setShowUsersModal(false);
    navigate(`/chat/${roomId}`);
  };

  const startGroupChat = async () => {
    if (!user || !userProfile || selectedUsers.length === 0) return;
    const name = groupName.trim() || 'แชทกลุ่ม';
    const roomId = await createGroupChat(name, selectedUsers, userProfile);
    setShowUsersModal(false);
    navigate(`/chat/${roomId}`);
  };

  const toggleUserSelection = (u: UserProfile) => {
    if (selectedUsers.find(su => su.uid === u.uid)) {
      setSelectedUsers(selectedUsers.filter(su => su.uid !== u.uid));
    } else {
      setSelectedUsers([...selectedUsers, u]);
    }
  };

  const filteredUsers = allUsers.filter(u => u.displayName.toLowerCase().includes(search.toLowerCase()));

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">กำลังโหลดแชท...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-8 h-8 text-indigo-600" />
          แชท & ข้อความ
        </h1>
        <button
          onClick={loadUsers}
          className="bg-indigo-600 hover:bg-indigo-700 text-slate-900 dark:text-white p-2.5 rounded-full shadow-xl dark:shadow-2xl transition-transform active:scale-95"
        >
          <Users className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden min-h-[400px]">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <MessageCircle className="w-16 h-16 mb-4 text-gray-200" />
            <p>ยังไม่มีข้อความ</p>
            <button 
              onClick={loadUsers} 
              className="mt-4 text-indigo-600 font-medium hover:underline"
            >
              เริ่มคุยกับเพื่อนร่วมงาน
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {rooms.map(room => {
              const isGroup = room.isGroup;
              let displayName = room.name || 'แชทกลุ่ม';
              if (!isGroup) {
                const otherUserId = room.participants.find(id => id !== user?.uid) || '';
                displayName = room.participantNames[otherUserId] || 'กำลังโหลด...';
              }
              const unreadCount = room.unreadCount?.[user?.uid || ''] || 0;

              return (
                <div 
                  key={room.id}
                  onClick={() => navigate(`/chat/${room.id}`)}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg shadow-inner">
                      {isGroup ? 'G' : (displayName?.charAt(0) || '?')}
                    </div>
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-slate-900 dark:text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className={`font-semibold truncate ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                        {displayName}
                      </h3>
                      {room.lastMessageTime && (
                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                          {formatDate(room.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm truncate ${unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                      {room.lastMessage ? (
                        room.lastMessageSenderId === user?.uid ? `คุณ: ${room.lastMessage}` : room.lastMessage
                      ) : (
                        <span className="italic text-gray-400">เริ่มการสนทนาใหม่...</span>
                      )}
                    </p>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showUsersModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900">
                {isGroupMode ? 'สร้างกลุ่มสนทนา' : 'เริ่มการสนทนา'}
              </h3>
              <div className="flex items-center gap-2">
                {!isGroupMode && (
                  <button 
                    onClick={() => setIsGroupMode(true)}
                    className="text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full font-medium"
                  >
                    + สร้างกลุ่ม
                  </button>
                )}
                <button 
                  onClick={() => setShowUsersModal(false)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {isGroupMode && (
              <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                <input 
                  type="text" 
                  placeholder="ตั้งชื่อกลุ่ม (ถ้ามี)..."
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 placeholder-gray-400 outline-none mb-3"
                />
                <div className="text-sm text-gray-500 mb-2">เลือกสมาชิก ({selectedUsers.length} คน)</div>
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedUsers.map(su => (
                      <span key={su.uid} className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                        {su.displayName}
                        <button onClick={() => toggleUserSelection(su)} className="hover:text-red-500">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="p-4 border-b border-gray-50">
              <div className="relative search-rainbow-border">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อพนักงาน..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-100 placeholder-gray-400 outline-none"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-2 flex-1">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">ไม่พบรายชื่อพนักงาน</div>
              ) : (
                filteredUsers.map(u => {
                  const isSelected = selectedUsers.some(su => su.uid === u.uid);
                  return (
                    <button
                      key={u.uid}
                      onClick={() => startChat(u)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                          {u.displayName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{u.displayName}</div>
                          <div className="text-xs text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded-full mt-0.5">
                            {u.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'พนักงาน'}
                          </div>
                        </div>
                      </div>
                      {isGroupMode && (
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-slate-900 dark:text-white" />}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {isGroupMode && (
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={startGroupChat}
                  disabled={selectedUsers.length === 0}
                  className="w-full bg-indigo-600 text-slate-900 dark:text-white font-bold py-3 rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  สร้างกลุ่มและเริ่มคุย
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
