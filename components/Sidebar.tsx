
import React, { useState } from 'react';
import { User, AppTab, RolePermissions } from '../types';
import Logo from './Logo';
import { 
  LayoutDashboard, 
  Users, 
  Trophy, 
  List,
  ClipboardCheck, 
  BookOpen, 
  LogOut, 
  Menu, 
  X,
  GraduationCap,
  ShieldCheck,
  UserCircle,
  Moon,
  Sun,
  FileText,
  Settings,
  Lock,
  ClipboardList,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onLogout: () => void;
  user: User;
  appLogo?: string | null;
  rolePermissions: RolePermissions[];
  onChangePassword: (userId: string, newPassword: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, user, appLogo, rolePermissions, onChangePassword }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const getMenuItems = () => {
    const permissions = rolePermissions.find(p => p.role === user.role);
    const allowedTabs = permissions?.allowedTabs || [];

    const allItems = [
      { id: 'admin-dashboard', icon: Activity, label: 'Bảng Quản Trị' },
      { id: 'dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
      { id: 'violations', icon: List, label: 'Bảng tổng hợp' },
      { id: 'students', icon: GraduationCap, label: user.role === 'TEACHER' ? 'Lớp của tôi' : 'Học sinh' },
      { id: 'classes', icon: Users, label: 'Danh sách lớp' },
      { id: 'reports', icon: FileText, label: 'Phân tích & Báo cáo' },
      { id: 'ranking', icon: Trophy, label: 'Xếp hạng' },
      { id: 'monitor-tool', icon: BookOpen, label: 'Sổ Đầu Bài' },
      { id: 'admin-criteria', icon: Settings, label: 'Cấu hình Hệ thống' },
      { id: 'record', icon: ClipboardCheck, label: user.role === 'TASKFORCE' ? 'Nhập liệu TNXK' : 'Nhập Vi phạm' },
      { id: 'tasks', icon: ClipboardList, label: 'Nhiệm vụ' },
      { id: 'my-child', icon: UserCircle, label: 'Con của tôi' },
      { id: 'permissions', icon: Lock, label: 'Quản lý Quyền hạn' },
    ];
    
    return allItems.filter(item => allowedTabs.includes(item.id as AppTab));
  };

  const menuItems = getMenuItems();

  const SidebarContent = () => (
    <div className="p-6 h-full flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-r border-slate-200/50 dark:border-slate-800/50 shadow-2xl">
      <div className="flex items-center gap-3 mb-10 px-2 group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
        <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-xl shadow-indigo-500/10 group-hover:scale-110 transition-transform duration-500 border border-slate-100 dark:border-slate-700 overflow-hidden">
          <Logo size={40} imageUrl={appLogo} />
        </div>
        <div>
          <span className="text-xl font-black tracking-tighter text-slate-800 dark:text-white block leading-none">SmartSchool</span>
          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 tracking-[0.2em] uppercase mt-1 block">Quản lý Nề nếp</span>
        </div>
      </div>

      <nav className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar pr-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setIsMobileOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-500 font-bold text-[13px] group relative overflow-hidden",
                isActive 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 translate-x-1" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div className="flex items-center gap-3 relative z-10">
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors duration-500",
                  isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700"
                )}>
                  <Icon className={cn(
                    "w-4 h-4 transition-colors duration-500",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-500"
                  )} />
                </div>
                <span className="tracking-tight">{item.label}</span>
              </div>
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="w-1 h-4 bg-white rounded-full relative z-10" 
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 space-y-6">
        <div className="px-2">
          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Giao diện</p>
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setIsDarkMode(false)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                !isDarkMode 
                  ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Sun className="w-3 h-3" />
              <span>Sáng</span>
            </button>
            <button 
              onClick={() => setIsDarkMode(true)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                isDarkMode 
                  ? "bg-slate-800 dark:bg-slate-700 text-indigo-400 shadow-sm" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Moon className="w-3 h-3" />
              <span>Tối</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <UserCircle className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-800 dark:text-white truncate leading-none mb-1">{user.name}</p>
              <span className={cn(
                "text-[8px] font-black px-2 py-0.5 rounded-md tracking-wider uppercase inline-block",
                user.role === 'TASKFORCE' ? "bg-amber-100 text-amber-600" : 
                user.role === 'MONITOR' ? "bg-purple-100 text-purple-600" :
                user.role === 'ADMIN' ? "bg-slate-800 dark:bg-slate-700 text-white" :
                "bg-indigo-100 text-indigo-600"
              )}>
                {user.role === 'TASKFORCE' ? 'TNXK' : 
                 user.role === 'MONITOR' ? 'Cán sự' : 
                 user.role === 'ADMIN' ? 'Quản trị' : 
                 user.role === 'TEACHER' ? 'Giáo viên' :
                 user.role === 'PARENT' ? 'Phụ huynh' :
                 user.role}
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button 
              onClick={() => setIsChangingPassword(true)}
              className="flex items-center justify-center gap-2 text-indigo-500 hover:text-white transition-all text-[9px] font-black px-2 py-2.5 hover:bg-indigo-500 rounded-xl border border-indigo-100 dark:border-indigo-900/30 hover:border-indigo-500 group active:scale-95 shadow-sm"
            >
              <Lock className="w-3 h-3" />
              <span>ĐỔI MK</span>
            </button>
            <button 
              onClick={onLogout}
              className="flex items-center justify-center gap-2 text-rose-500 hover:text-white transition-all text-[9px] font-black px-2 py-2.5 hover:bg-rose-500 rounded-xl border border-rose-100 dark:border-rose-900/30 hover:border-rose-500 group active:scale-95 shadow-sm"
            >
              <LogOut className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
              <span>THOÁT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button 
        className="lg:hidden fixed top-4 left-4 z-[60] bg-white/80 backdrop-blur-md text-slate-800 p-3 rounded-2xl shadow-xl border border-white/20 transition-all active:scale-95"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-500 ease-out lg:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>

      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-in fade-in duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <AnimatePresence>
        {isChangingPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white leading-none">Đổi mật khẩu</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bảo mật tài khoản của bạn</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Mật khẩu hiện tại</label>
                    <input 
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                      placeholder="Nhập mật khẩu hiện tại..."
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Mật khẩu mới</label>
                    <input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                      placeholder="Nhập mật khẩu mới..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Xác nhận mật khẩu mới</label>
                    <input 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                      placeholder="Nhập lại mật khẩu mới..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => { 
                      setIsChangingPassword(false); 
                      setCurrentPassword('');
                      setNewPassword(''); 
                      setConfirmPassword('');
                    }}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    onClick={() => {
                      if (currentPassword !== user.password) {
                        alert('Mật khẩu hiện tại không chính xác.');
                        return;
                      }
                      if (newPassword.length < 4) {
                        alert('Mật khẩu mới phải có ít nhất 4 ký tự.');
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        alert('Mật khẩu xác nhận không khớp.');
                        return;
                      }
                      onChangePassword(user.id, newPassword);
                      setIsChangingPassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      alert('Đổi mật khẩu thành công!');
                    }}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
