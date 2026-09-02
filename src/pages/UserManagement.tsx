import React, { useEffect, useState } from 'react';
import { Shield, ShieldAlert, UserCheck, UserX, Clock, User, Info, Calendar, Mail, Hash, X, Search, Activity, ClipboardList, Phone, MessageCircle, MapPin, HardHat, Save, Edit2, Landmark, Banknote } from 'lucide-react';
import { getAllUsers, updateUserRole, getUserStats, UserStats, updateUserProfile } from '../services/userService';
import { subscribeToBaseSalaries, saveBaseSalary } from '../services/employeeService';
import { UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useBottomSheet } from '../contexts/BottomSheetContext';

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'RESIGNED'>('ACTIVE');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<UserProfile>>({});
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [salaries, setSalaries] = useState<Record<string, number>>({});
  const [editSalaryValue, setEditSalaryValue] = useState<string>('0');
  const [testingEmail, setTestingEmail] = useState(false);
  
  const { userProfile } = useAuth();
  const { showAlert } = useBottomSheet();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      showAlert("เกิดข้อผิดพลาดในการโหลดข้อมูลพนักงาน (คุณอาจต้องอัปเดต Security Rules ใน Firebase)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const unsubSalaries = subscribeToBaseSalaries((data) => {
      const salaryMap: Record<string, number> = {};
      data.forEach(s => {
        salaryMap[s.userId] = s.base_salary;
      });
      setSalaries(salaryMap);
    });
    return () => {
      if (unsubSalaries) unsubSalaries();
    };
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadStats(selectedUser.uid);
    } else {
      setStats(null);
    }
  }, [selectedUser]);

  const loadStats = async (uid: string) => {
    setStatsLoading(true);
    const userStats = await getUserStats(uid);
    setStats(userStats);
    setStatsLoading(false);
  };

  const handleRoleChange = async (user: UserProfile, newRole: 'ADMIN' | 'STAFF' | 'RESIGNED' | 'PENDING') => {
    if (user.uid === userProfile?.uid) {
      showAlert("คุณไม่สามารถแก้ไขสิทธิ์ของตัวเองได้");
      return;
    }
    
    try {
      if (newRole === 'RESIGNED') {
        const reason = window.prompt(`กรุณาระบุเหตุผลที่ต้องการปิดบัญชี ${user.displayName || user.email} (เช่น ลาออก, เลิกจ้าง):`, "");
        if (reason === null) return; // cancelled
        
        await updateUserRole(user.uid, newRole, reason);
        showAlert(`อัปเดตสิทธิ์ของ ${user.displayName || user.email} เป็นลาออกสำเร็จ`);
        fetchUsers();
        if (selectedUser?.uid === user.uid) {
          setSelectedUser({ ...selectedUser, role: newRole, resignationReason: reason });
        }
      } else if (newRole === 'STAFF' && user.role === 'PENDING') {
        const currentSalary = salaries[user.uid] || 0;
        const salaryStr = window.prompt(`กรุณาระบุอัตราเงินเดือนเริ่มต้นสำหรับ ${user.displayName || user.email}:`, currentSalary > 0 ? currentSalary.toString() : "15000");
        if (salaryStr === null) return; // cancelled
        const salaryNum = Number(salaryStr);
        if (isNaN(salaryNum) || salaryNum < 0) {
          showAlert("กรุณากรอกจำนวนเงินเดือนที่ถูกต้อง");
          return;
        }

        try {
          await saveBaseSalary(user.uid, salaryNum);
          await updateUserRole(user.uid, newRole);
          
          try {
            await fetch('/api/send-welcome-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: user.email,
                employeeName: user.displayName || user.email,
                salary: salaryNum,
                jobTitle: user.jobTitle || 'พนักงานฟาร์ม (STAFF)'
              })
            });
          } catch (emailErr) {
            console.error("Failed to send welcome email:", emailErr);
          }

          showAlert(`อนุมัติพนักงาน ${user.displayName || user.email} สำเร็จ พร้อมส่งอีเมลแจ้งข้อมูลอัตราเงินเดือน ฿${salaryNum.toLocaleString()}`);
          fetchUsers();
          if (selectedUser?.uid === user.uid) {
            setSelectedUser({ ...selectedUser, role: newRole, resignationReason: undefined });
          }
        } catch (err) {
          console.error("Approval error:", err);
          showAlert("เกิดข้อผิดพลาดในการอนุมัติพนักงาน");
        }
      } else {
        if (window.confirm(`คุณแน่ใจหรือไม่ที่จะเปลี่ยนสิทธิ์ของ ${user.displayName || user.email} เป็น ${newRole}?`)) {
          await updateUserRole(user.uid, newRole);
          showAlert(`อัปเดตสิทธิ์ของ ${user.displayName || user.email} เป็น ${newRole} สำเร็จ`);
          fetchUsers();
          if (selectedUser?.uid === user.uid) {
            setSelectedUser({ ...selectedUser, role: newRole, resignationReason: undefined });
          }
        }
      }
    } catch (error) {
      console.error("Error updating role:", error);
      showAlert("เกิดข้อผิดพลาดในการอัปเดตสิทธิ์ (คุณอาจต้องอัปเดต Security Rules ใน Firebase)");
    }
  };

  const handleUpdateProfile = async () => {
    if (!selectedUser) return;
    
    try {
      await updateUserProfile(selectedUser.uid, editFormData);
      
      const salNum = Number(editSalaryValue);
      if (!isNaN(salNum) && salNum >= 0) {
        await saveBaseSalary(selectedUser.uid, salNum);
      }

      showAlert("อัปเดตข้อมูลโปรไฟล์พนักงานสำเร็จ");
      setIsEditing(false);
      fetchUsers();
      setSelectedUser({ ...selectedUser, ...editFormData } as UserProfile);
    } catch (error) {
      console.error("Error updating profile:", error);
      showAlert("เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-emerald-500">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 dark:text-white/50 font-medium">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    const matchesTab = activeTab === 'ACTIVE' ? u.role !== 'RESIGNED' : u.role === 'RESIGNED';
    const query = searchQuery.toLowerCase();
    const matchesSearch = (u.displayName?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 relative animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center bg-white dark:bg-[#1a2f3a] p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-white/10">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">การจัดการพนักงาน</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-white/60 mt-1">กำหนดสิทธิ์และบทบาทของผู้ใช้งานในระบบ</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              const testEmailAddress = window.prompt("กรุณากรอกอีเมลที่ต้องการรับจดหมายทดสอบ SMTP:", userProfile?.email || "");
              if (!testEmailAddress) return;
              setTestingEmail(true);
              try {
                const response = await fetch('/api/test-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: testEmailAddress })
                });
                const resData = await response.json();
                if (response.ok && resData.success) {
                  showAlert(`✅ ส่งอีเมลทดสอบไปยัง ${testEmailAddress} สำเร็จแล้ว! โปรดตรวจสอบในกล่องข้อความหรือสแปม`);
                } else {
                  showAlert(`❌ ส่งไม่สำเร็จ: ${resData.error || 'เกิดข้อผิดพลาด'}\n${resData.details || ''}`);
                }
              } catch (err: any) {
                showAlert(`❌ เกิดข้อผิดพลาดทางเทคนิค: ${err.message}`);
              } finally {
                setTestingEmail(false);
              }
            }}
            disabled={testingEmail}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Mail className="w-4 h-4 animate-bounce" />
            {testingEmail ? "กำลังทดสอบ..." : "ทดสอบส่งเมล SMTP"}
          </button>
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <Shield className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Tabs */}
        <div className="flex space-x-2 bg-white dark:bg-[#1a2f3a] p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-white/10 sm:w-2/3">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'}`}
          >
            พนักงานปัจจุบัน / รออนุมัติ
          </button>
          <button
            onClick={() => setActiveTab('RESIGNED')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'RESIGNED' ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'}`}
          >
            พนักงานเก่า (ลาออก)
          </button>
        </div>

        {/* Search */}
        <div className="relative sm:w-1/3 search-rainbow-border">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 dark:text-white/40" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาชื่อหรืออีเมล..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-white/10 rounded-2xl leading-5 bg-white dark:bg-[#1a2f3a] dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm shadow-sm transition-shadow font-medium"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a2f3a] rounded-3xl shadow-sm border border-slate-100 dark:border-white/10 overflow-hidden">
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {filteredUsers.map((u) => (
            <li key={u.uid} className="group p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all gap-4 relative">
              <div 
                className="flex items-center space-x-4 cursor-pointer flex-1 py-1"
                onClick={() => {
                  setSelectedUser(u);
                  setIsEditing(false);
                  setEditSalaryValue(salaries[u.uid]?.toString() || '0');
                  setEditFormData({
                    phone: u.phone || '',
                    lineId: u.lineId || '',
                    address: u.address || '',
                    emergencyContact: u.emergencyContact || '',
                    jobTitle: u.jobTitle || '',
                    displayName: u.displayName || ''
                  });
                }}
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0 uppercase shadow-sm overflow-hidden">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    u.displayName?.substring(0, 1) || u.email?.substring(0, 1)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{u.displayName || "ไม่มีชื่อ"}</h3>
                    <div className="sm:hidden">
                      {u.role === 'ADMIN' ? (
                        <div className="w-2 h-2 rounded-full bg-indigo-500" title="ADMIN"></div>
                      ) : u.role === 'PENDING' ? (
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="PENDING"></div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-emerald-500" title="STAFF"></div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-white/60 truncate">{u.email}</p>
                  {u.jobTitle && (
                    <div className="mt-1.5 flex items-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-[10px] font-black text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-lg flex items-center">
                        <HardHat className="w-3 h-3 mr-1" /> {u.jobTitle}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:ml-auto">
                <div className="flex items-center gap-2">
                  <div className="hidden sm:block">
                    {u.role === 'ADMIN' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30 uppercase tracking-wider">
                        <ShieldAlert className="w-3 h-3 mr-1" /> ADMIN
                      </span>
                    ) : u.role === 'RESIGNED' ? (
                       <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/10 dark:text-white/60 dark:border-white/20 uppercase tracking-wider">
                        <UserX className="w-3 h-3 mr-1" /> ลาออก
                      </span>
                    ) : u.role === 'PENDING' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 uppercase tracking-wider">
                        <Clock className="w-3 h-3 mr-1 animate-pulse" /> บัญชีใหม่
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 uppercase tracking-wider">
                        <UserCheck className="w-3 h-3 mr-1" /> STAFF
                      </span>
                    )}
                  </div>
                  
                  {u.role === 'PENDING' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRoleChange(u, 'STAFF'); }}
                      className="px-4 py-1.5 text-sm font-black bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                    >
                      อนุมัติ (เป็น STAFF)
                    </button>
                  )}

                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u, e.target.value as 'ADMIN' | 'STAFF' | 'RESIGNED' | 'PENDING')}
                    disabled={u.uid === userProfile?.uid}
                    className="px-3 py-1.5 text-sm font-bold rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white bg-slate-50 dark:bg-black/20 hover:border-emerald-300 dark:hover:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="PENDING" className="dark:bg-[#1a2f3a]">บัญชีใหม่</option>
                    <option value="STAFF" className="dark:bg-[#1a2f3a]">พนักงาน (STAFF)</option>
                    <option value="ADMIN" className="dark:bg-[#1a2f3a]">ผู้ดูแล (ADMIN)</option>
                    <option value="RESIGNED" className="dark:bg-[#1a2f3a]">ปิดบัญชี</option>
                  </select>
                </div>

                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedUser(u);
                    setIsEditing(false);
                    setEditSalaryValue(salaries[u.uid]?.toString() || '0');
                    setEditFormData({
                      phone: u.phone || '',
                      lineId: u.lineId || '',
                      address: u.address || '',
                      emergencyContact: u.emergencyContact || '',
                      jobTitle: u.jobTitle || '',
                      displayName: u.displayName || ''
                    });
                  }}
                  className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-slate-600 dark:text-white/70 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all font-bold text-sm"
                  title="ดูรายละเอียดข้อมูลโปรไฟล์"
                >
                  <Info className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">รายละเอียด</span>
                </button>
              </div>
            </li>
          ))}
          
          {filteredUsers.length === 0 && (
            <li className="p-10 text-center text-slate-500 dark:text-white/50 flex flex-col items-center">
              <Search className="w-12 h-12 text-slate-300 dark:text-white/20 mb-4" />
              <p className="font-medium text-lg">ไม่พบข้อมูลพนักงานที่ค้นหา</p>
            </li>
          )}
        </ul>
      </div>

      {/* Profile Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md pt-safe pb-safe">
          <div className="bg-white dark:bg-[#1a2f3a] rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg mr-3">
                  <User className="w-5 h-5" />
                </div>
                ข้อมูลโปรไฟล์พนักงาน
              </h2>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-all"
                  >
                    <Edit2 className="w-4 h-4" /> แก้ไขข้อมูล
                  </button>
                ) : (
                  <button 
                    onClick={handleUpdateProfile}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 transition-all shadow-sm"
                  >
                    <Save className="w-4 h-4" /> บันทึก
                  </button>
                )}
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="p-2 text-slate-400 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-4xl font-black mb-4 shadow-inner uppercase overflow-hidden border-2 border-slate-200 dark:border-white/10">
                   {selectedUser.photoURL ? (
                     <img src={selectedUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                     selectedUser.displayName?.substring(0, 1) || selectedUser.email?.substring(0, 1)
                   )}
                </div>
                
                {isEditing ? (
                  <div className="w-full max-w-xs text-center">
                    <input
                      type="text"
                      value={editFormData.displayName}
                      onChange={(e) => setEditFormData({...editFormData, displayName: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 dark:text-white rounded-2xl text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="ชื่อ-นามสกุล"
                    />
                  </div>
                ) : (
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedUser.displayName || 'ไม่มีชื่อ'}</h3>
                )}
                
                <div className="mt-3 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    {selectedUser.role === 'ADMIN' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-400">
                        <ShieldAlert className="w-3.5 h-3.5 mr-1.5" /> ผู้ดูแลระบบ (ADMIN)
                      </span>
                    ) : selectedUser.role === 'RESIGNED' ? (
                       <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white/60">
                        <UserX className="w-3.5 h-3.5 mr-1.5" /> ลาออก / ปิดบัญชี
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <UserCheck className="w-3.5 h-3.5 mr-1.5" /> พนักงาน (STAFF)
                      </span>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="mt-4 text-center w-full max-w-xs">
                       <p className="text-[10px] font-black text-slate-400 dark:text-white/50 uppercase tracking-widest mb-1.5">ตำแหน่งงานจริงในฟาร์ม</p>
                       <input
                        type="text"
                        value={editFormData.jobTitle}
                        onChange={(e) => setEditFormData({...editFormData, jobTitle: e.target.value})}
                        className="w-full px-4 py-3 bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 dark:text-emerald-400 rounded-2xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="ระบุตำแหน่ง เช่น เล้าคลอด"
                      />
                    </div>
                  ) : (
                    selectedUser.jobTitle && (
                      <div className="mt-2 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl">
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                          <HardHat className="w-4 h-4 mr-1.5" /> {selectedUser.jobTitle}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {/* section: Contact Info */}
                <div className="bg-slate-50 dark:bg-black/20 rounded-3xl p-5 border border-slate-100 dark:border-white/5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                    <Info className="w-4 h-4 mr-2 text-slate-500 dark:text-white/50" /> ข้อมูลการติดต่อ
                  </h4>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                       <div className="flex items-start">
                        <Phone className="w-5 h-5 text-emerald-500 mr-3 mt-1" />
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">เบอร์โทรศัพท์</p>
                          {isEditing ? (
                            <input
                              type="tel"
                              value={editFormData.phone}
                              onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-white rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="08X-XXX-XXXX"
                            />
                          ) : (
                            <p className="text-slate-900 dark:text-white font-bold">{selectedUser.phone || '-'}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start">
                        <MessageCircle className="w-5 h-5 text-emerald-500 mr-3 mt-1" />
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">Line ID</p>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editFormData.lineId}
                              onChange={(e) => setEditFormData({...editFormData, lineId: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-white rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="ID Line"
                            />
                          ) : (
                            <p className="text-slate-900 dark:text-white font-bold">{selectedUser.lineId || '-'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <User className="w-5 h-5 text-amber-500 mr-3 mt-1" />
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">ผู้ติดต่อฉุกเฉิน</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.emergencyContact}
                            onChange={(e) => setEditFormData({...editFormData, emergencyContact: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-white rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="ชื่อและเบอร์โทรติดต่อฉุกเฉิน"
                          />
                        ) : (
                          <p className="text-slate-900 dark:text-white font-bold">{selectedUser.emergencyContact || '-'}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 text-rose-500 mr-3 mt-1" />
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">ที่อยู่ตามบัตร/ที่พัก</p>
                        {isEditing ? (
                          <textarea
                            value={editFormData.address}
                            onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-white rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
                            placeholder="ที่อยู่ปัจจุบัน"
                          />
                        ) : (
                          <p className="text-slate-700 dark:text-white/80 font-medium text-sm leading-relaxed">{selectedUser.address || '-'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* section: Bank Account Info */}
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-3xl p-5 border border-emerald-100 dark:border-emerald-900/20">
                  <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-300 mb-4 flex items-center">
                    <Landmark className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" /> ข้อมูลบัญชีธนาคาร (สำหรับรับเงินเดือน)
                  </h4>
                  {selectedUser.bankAccount?.bankName ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">ธนาคาร</p>
                          <p className="font-bold text-slate-900 dark:text-white">{selectedUser.bankAccount.bankName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">เลขบัญชีธนาคาร</p>
                          <p className="font-bold text-slate-900 dark:text-white font-mono text-base">{selectedUser.bankAccount.accountNumber}</p>
                        </div>
                      </div>
                      <div className="border-t border-slate-100 dark:border-white/5 pt-3">
                        <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">ชื่อบัญชี</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{selectedUser.bankAccount.accountName}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-white/40 italic">พนักงานยังไม่ได้ระบุข้อมูลธนาคาร</p>
                  )}
                </div>

                {/* section: Base Salary Editor */}
                <div className="bg-slate-50 dark:bg-black/20 rounded-3xl p-5 border border-slate-100 dark:border-white/5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                    <Banknote className="w-4 h-4 mr-2 text-slate-500 dark:text-white/50" /> อัตราเงินเดือนพนักงาน
                  </h4>
                  {isEditing ? (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1.5">แก้ไขฐานเงินเดือนเริ่มต้น (บาท)</p>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 font-medium">฿</span>
                        <input
                          type="number"
                          value={editSalaryValue}
                          onChange={(e) => setEditSalaryValue(e.target.value)}
                          className="w-full pl-9 pr-4 py-3 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 dark:text-white rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">ฐานเงินเดือนปัจจุบัน</p>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                          ฿{(salaries[selectedUser.uid] || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-xl text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-wider">
                        มีผลในรอบถัดไป
                      </div>
                    </div>
                  )}
                </div>

                {/* section: System Data */}
                {!isEditing && (
                <div className="bg-white dark:bg-[#1a2f3a] rounded-3xl p-5 border border-slate-100 dark:border-white/5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-slate-500 dark:text-white/50" /> ข้อมูลระบบ
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-slate-50 dark:bg-black/20 p-3.5 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center">
                        <Mail className="w-5 h-5 text-slate-400 dark:text-white/40 mr-3" />
                        <div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">อีเมลยืนยัน</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-white">{selectedUser.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-black/20 p-3.5 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 text-slate-400 dark:text-white/40 mr-3" />
                        <div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">สมัครใช้งานเมื่อ</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-white">
                             {new Date(selectedUser.createdAt).toLocaleDateString('th-TH', { 
                              year: 'numeric', month: 'long', day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-black/20 p-3.5 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center">
                        <Hash className="w-5 h-5 text-slate-400 dark:text-white/40 mr-3" />
                        <div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">User ID</p>
                          <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-white/50 break-all">{selectedUser.uid}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {selectedUser.role === 'RESIGNED' && selectedUser.resignationReason && (
                  <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-5 border border-rose-100 dark:border-rose-900/30">
                    <div className="flex items-start">
                      <UserX className="w-5 h-5 text-rose-500 mr-3 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">เหตุผลการลาออก/พ้นสภาพ</p>
                        <p className="text-rose-900 dark:text-rose-200 font-bold mt-1 leading-relaxed">{selectedUser.resignationReason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* section: Stats */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-slate-500 dark:text-white/50" /> ประวัติการทำงานร่วม
                  </h4>
                  {statsLoading ? (
                    <div className="bg-slate-50 dark:bg-black/20 rounded-2xl p-8 flex justify-center items-center">
                      <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    </div>
                  ) : stats ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 p-4 rounded-2xl text-center">
                        <ClipboardList className="w-6 h-6 text-indigo-500 dark:text-indigo-400 mx-auto mb-2" />
                        <p className="text-2xl font-black text-indigo-900 dark:text-indigo-100">{stats.taskCount}</p>
                        <p className="text-xs font-bold text-indigo-600/70 dark:text-indigo-400/70">งาน/รับมอบหมาย</p>
                      </div>
                      <div className="bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-4 rounded-2xl text-center">
                        <Activity className="w-6 h-6 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                        <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">{stats.eventCount}</p>
                        <p className="text-xs font-bold text-emerald-600/70 dark:text-emerald-400/70">บันทึกเหตุการณ์สุกร</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* section: Support Tools */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center">
                    <ShieldAlert className="w-4 h-4 mr-2 text-slate-500 dark:text-white/50" /> เครื่องมือจัดการฉุกเฉิน
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedUser.email);
                        showAlert("คัดลอกอีเมลเรียบร้อยแล้ว");
                      }}
                      className="flex items-center justify-center space-x-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 py-3 rounded-xl text-sm font-bold text-slate-700 dark:text-white transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      <span>คัดลอกอีเมล</span>
                    </button>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedUser.uid);
                        showAlert("คัดลอก UID เรียบร้อยแล้ว");
                      }}
                      className="flex items-center justify-center space-x-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 py-3 rounded-xl text-sm font-bold text-slate-700 dark:text-white transition-colors"
                    >
                      <Hash className="w-4 h-4" />
                      <span>คัดลอก UID</span>
                    </button>
                  </div>
                </div>
                
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
