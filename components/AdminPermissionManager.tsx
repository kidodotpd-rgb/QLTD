
import React, { useState } from 'react';
import { ShieldCheck, Save, CheckCircle2, Lock, Unlock, Eye, EyeOff, Info, RefreshCcw } from 'lucide-react';
import { Role, AppTab, RolePermissions } from '../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AdminPermissionManagerProps {
  permissions: RolePermissions[];
  onUpdatePermissions: (permissions: RolePermissions[]) => void;
}

const TAB_LABELS: Record<AppTab, string> = {
  'dashboard': 'Tổng quan',
  'violations': 'Bảng tổng hợp',
  'students': 'Học sinh',
  'classes': 'Danh sách lớp',
  'reports': 'Phân tích & Báo cáo',
  'ranking': 'Xếp hạng',
  'monitor-tool': 'Sổ Đầu Bài',
  'admin-criteria': 'Quản lý tiêu chí',
  'record': 'Nhập Vi phạm',
  'my-child': 'Con của tôi',
  'permissions': 'Quản lý quyền',
  'tasks': 'Nhiệm vụ',
  'admin-dashboard': 'Bảng Quản Trị',
};

const ROLE_LABELS: Record<Role, string> = {
  'ADMIN': 'Quản trị viên',
  'TEACHER': 'Giáo viên',
  'TASKFORCE': 'Đội Cờ Đỏ',
  'MONITOR': 'Lớp trưởng/Lớp phó',
  'PARENT': 'Phụ huynh',
};

const AdminPermissionManager: React.FC<AdminPermissionManagerProps> = ({
  permissions,
  onUpdatePermissions
}) => {
  const [localPermissions, setLocalPermissions] = useState<RolePermissions[]>(permissions);
  const [isSaved, setIsSaved] = useState(false);
  const [activeRole, setActiveRole] = useState<Role>('TEACHER');

  const togglePermission = (role: Role, tab: AppTab) => {
    if (role === 'ADMIN' && tab === 'permissions') return; // Prevent admin from locking themselves out of permissions

    setLocalPermissions(prev => prev.map(rp => {
      if (rp.role === role) {
        const hasTab = rp.allowedTabs.includes(tab);
        return {
          ...rp,
          allowedTabs: hasTab 
            ? rp.allowedTabs.filter(t => t !== tab)
            : [...rp.allowedTabs, tab]
        };
      }
      return rp;
    }));
    setIsSaved(false);
  };

  const handleReset = () => {
    setLocalPermissions(DEFAULT_ROLE_PERMISSIONS);
    setIsSaved(false);
  };

  const handleSave = () => {
    onUpdatePermissions(localPermissions);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const currentRolePermissions = localPermissions.find(p => p.role === activeRole);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Quản lý Quyền Truy cập
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Tùy chỉnh các tính năng hiển thị cho từng vai trò người dùng</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95"
          >
            <RefreshCcw className="w-4 h-4" />
            Khôi phục mặc định
          </button>
          <button
            onClick={handleSave}
            className={cn(
              "px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl",
              isSaved 
                ? "bg-emerald-500 text-white shadow-emerald-200" 
                : "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 active:scale-95"
            )}
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaved ? 'Đã lưu thành công' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Role Selection Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">Chọn vai trò</p>
          {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={cn(
                "w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 font-black text-xs uppercase tracking-widest border",
                activeRole === role
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20"
                  : "bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              <span>{ROLE_LABELS[role]}</span>
              {activeRole === role ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4 opacity-30" />}
            </button>
          ))}
          
          <div className="mt-8 p-6 bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] border border-amber-100 dark:border-amber-800/50">
            <div className="flex items-center gap-3 mb-3 text-amber-600">
              <Info className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Lưu ý bảo mật</span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed">
              Việc thay đổi quyền truy cập sẽ ảnh hưởng ngay lập tức đến giao diện của người dùng. Hãy cẩn trọng khi cấp quyền Nhập liệu hoặc Quản trị.
            </p>
          </div>
        </div>

        {/* Permissions Grid */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Quyền của {ROLE_LABELS[activeRole]}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Bật/Tắt các thẻ chức năng</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(TAB_LABELS) as AppTab[]).map((tab) => {
                const isAllowed = currentRolePermissions?.allowedTabs.includes(tab);
                const isDisabled = activeRole === 'ADMIN' && tab === 'permissions';

                return (
                  <button
                    key={tab}
                    disabled={isDisabled}
                    onClick={() => togglePermission(activeRole, tab)}
                    className={cn(
                      "flex items-center justify-between p-5 rounded-[1.5rem] border transition-all duration-300 group",
                      isAllowed
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-slate-200",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                        isAllowed 
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                          : "bg-white dark:bg-slate-800 text-slate-300"
                      )}>
                        {isAllowed ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </div>
                      <div className="text-left">
                        <p className={cn(
                          "text-sm font-black tracking-tight transition-colors",
                          isAllowed ? "text-emerald-900 dark:text-emerald-400" : "text-slate-400"
                        )}>
                          {TAB_LABELS[tab]}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                          {isAllowed ? 'Đang hiển thị' : 'Đã ẩn'}
                        </p>
                      </div>
                    </div>
                    
                    <div className={cn(
                      "w-12 h-6 rounded-full p-1 transition-colors duration-300 relative",
                      isAllowed ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                    )}>
                      <div className={cn(
                        "w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 transform",
                        isAllowed ? "translate-x-6" : "translate-x-0"
                      )} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPermissionManager;
