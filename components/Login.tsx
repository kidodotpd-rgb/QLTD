
import React, { useState, useMemo } from 'react';
import { User, Student, Role } from '../types';
import Logo from './Logo';
import { TEACHER_ACCESS_CODE, PARENT_ACCESS_CODE, ADMIN_ACCESS_CODE, TASKFORCE_ACCESS_CODE, MONITOR_ACCESS_CODE, TEACHER_PASSWORDS, TASKFORCE_PASSWORDS } from '../constants';
import { 
  GraduationCap, 
  Users, 
  ShieldCheck, 
  Search, 
  ArrowRight, 
  AlertCircle, 
  Lock,
  Zap,
  BookOpen,
  Sun,
  Moon,
  ShieldAlert
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LoginProps {
  onLogin: (user: User) => void;
  students: Student[];
  users: User[];
}

type LoginTab = 'ADMIN' | 'TEACHER' | 'PARENT' | 'TASKFORCE' | 'MONITOR';

const Login: React.FC<LoginProps> = ({ onLogin, students, users }) => {
  const [activeTab, setActiveTab] = useState<LoginTab>('TEACHER');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
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
  
  // Teacher/Monitor inputs
  const [selectedClass, setSelectedClass] = useState('');
  
  // Parent inputs
  const [studentQuery, setStudentQuery] = useState('');

  const availableClasses = useMemo(() => {
    return Array.from(new Set(students.map(s => s.class))).sort();
  }, [students]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (activeTab === 'ADMIN') {
        const adminUser = users.find(u => u.role === 'ADMIN');
        const correctPassword = adminUser?.password || ADMIN_ACCESS_CODE;
        
        if (accessCode !== correctPassword) {
            setError('Mã xác nhận Quản trị viên không chính xác.');
            return;
        }
        
        const finalUser = adminUser || {
            id: 'ADMIN-01',
            name: 'Quản trị viên Hệ thống',
            role: 'ADMIN',
            passwordChanged: false
        };

        if (finalUser.passwordChanged === false) {
            setWarning('Bạn đang sử dụng mật khẩu mặc định. Vui lòng đổi mật khẩu sau khi đăng nhập để bảo mật tài khoản.');
            setTimeout(() => onLogin(finalUser), 3000);
        } else {
            onLogin(finalUser);
        }

    } else if (activeTab === 'TEACHER') {
        if (!selectedClass) {
            setError('Vui lòng chọn lớp chủ nhiệm.');
            return;
        }
        
        const teacherUser = users.find(u => u.role === 'TEACHER' && u.assignedClass === selectedClass);
        const correctPassword = teacherUser?.password || TEACHER_PASSWORDS[selectedClass] || TEACHER_ACCESS_CODE;
        
        if (accessCode !== correctPassword) {
            setError(`Mã xác nhận GVCN lớp ${selectedClass} không chính xác.`);
            return;
        }
        
        const finalUser = teacherUser || {
            id: `TEACHER-${selectedClass}`,
            name: `GVCN Lớp ${selectedClass}`,
            role: 'TEACHER',
            assignedClass: selectedClass,
            passwordChanged: false
        };

        if (finalUser.passwordChanged === false) {
            setWarning('Bạn đang sử dụng mật khẩu mặc định. Vui lòng đổi mật khẩu sau khi đăng nhập để bảo mật tài khoản.');
            setTimeout(() => onLogin(finalUser), 3000);
        } else {
            onLogin(finalUser);
        }

    } else if (activeTab === 'TASKFORCE') {
        // Find if any taskforce user has this password
        const taskforceUser = users.find(u => u.role === 'TASKFORCE' && u.password === accessCode);
        const isLegacyCode = accessCode === TASKFORCE_ACCESS_CODE;
        
        if (!taskforceUser && !isLegacyCode) {
            setError('Mã xác nhận TNXK không chính xác.');
            return;
        }
        
        const finalUser = taskforceUser || {
            id: 'TASKFORCE-01',
            name: 'Đội TNXK - Trực ban',
            role: 'TASKFORCE',
            passwordChanged: false
        };

        if (finalUser.passwordChanged === false) {
            setWarning('Bạn đang sử dụng mật khẩu mặc định. Vui lòng đổi mật khẩu sau khi đăng nhập để bảo mật tài khoản.');
            setTimeout(() => onLogin(finalUser), 3000);
        } else {
            onLogin(finalUser);
        }

    } else if (activeTab === 'MONITOR') {
        if (!selectedClass) {
            setError('Vui lòng chọn lớp của bạn.');
            return;
        }

        const monitorUser = users.find(u => u.role === 'MONITOR' && u.assignedClass === selectedClass);
        const correctPassword = monitorUser?.password || MONITOR_ACCESS_CODE;

        if (accessCode !== correctPassword) {
            setError('Mã xác nhận Cán sự không chính xác.');
            return;
        }
        
        const finalUser = monitorUser || {
            id: `MONITOR-${selectedClass}`,
            name: `Cán sự lớp ${selectedClass}`,
            role: 'MONITOR',
            assignedClass: selectedClass,
            passwordChanged: false
        };

        if (finalUser.passwordChanged === false) {
            setWarning('Bạn đang sử dụng mật khẩu mặc định. Vui lòng đổi mật khẩu sau khi đăng nhập để bảo mật tài khoản.');
            setTimeout(() => onLogin(finalUser), 3000);
        } else {
            onLogin(finalUser);
        }

    } else if (activeTab === 'PARENT') {
        if (!studentQuery.trim()) {
            setError('Vui lòng nhập tên hoặc mã học sinh.');
            return;
        }

        const query = studentQuery.toLowerCase().trim();
        const foundStudent = students.find(s => 
            s.id.toLowerCase() === query || 
            s.name.toLowerCase().includes(query)
        );

        if (!foundStudent) {
            setError('Không tìm thấy học sinh. Vui lòng kiểm tra lại Mã số hoặc Họ tên.');
            return;
        }

        const parentUser = users.find(u => u.role === 'PARENT' && u.studentId === foundStudent.id);
        const correctPassword = parentUser?.password || PARENT_ACCESS_CODE;

        if (accessCode !== correctPassword) {
            setError('Mã xác nhận phụ huynh không chính xác.');
            return;
        }

        const finalUser = parentUser || {
            id: `PARENT-${foundStudent.id}`,
            name: foundStudent.parentName || `Phụ huynh em ${foundStudent.name}`,
            role: 'PARENT',
            studentId: foundStudent.id,
            passwordChanged: false
        };

        if (finalUser.passwordChanged === false) {
            setWarning('Bạn đang sử dụng mật khẩu mặc định. Vui lòng đổi mật khẩu sau khi đăng nhập để bảo mật tài khoản.');
            setTimeout(() => onLogin(finalUser), 3000);
        } else {
            onLogin(finalUser);
        }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0a0a0a] relative overflow-hidden p-4 font-sans transition-colors duration-500">
      {/* Theme Toggle */}
      <div className="absolute top-8 right-8 z-50">
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:scale-110 transition-all"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-400/10 dark:bg-teal-500/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl shadow-slate-200 dark:shadow-black/50 mb-6 transform hover:scale-105 transition-transform duration-500 p-2 border border-slate-100 dark:border-slate-700 overflow-hidden">
            <Logo size={80} />
          </div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter mb-2">SmartSchool</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-[0.2em]">Hệ thống Quản lý Nề nếp</p>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-white dark:border-slate-800 p-8 relative overflow-hidden">
          {/* Tabs */}
          <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-2xl mb-8 border border-slate-200/50 dark:border-slate-700/50">
            {[
              { id: 'ADMIN', label: 'AD' },
              { id: 'TEACHER', label: 'GV' },
              { id: 'TASKFORCE', label: 'TNXK' },
              { id: 'MONITOR', label: 'CS' },
              { id: 'PARENT', label: 'PH' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as LoginTab);
                  setError('');
                  setAccessCode('');
                }}
                className={cn(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                  activeTab === tab.id 
                    ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-lg shadow-teal-100 dark:shadow-black/20" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Access Code Input */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">
                Mã xác nhận truy cập
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-300 dark:text-slate-600 group-focus-within:text-teal-500 transition-colors" />
                </div>
                <input
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white font-bold placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-center tracking-[0.2em]"
                  placeholder="Mã xác nhận"
                  maxLength={8}
                />
              </div>
            </div>

            {/* Role Specific Inputs */}
            {(activeTab === 'TEACHER' || activeTab === 'MONITOR') && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">
                  Chọn Lớp học
                </label>
                <div className="relative">
                    <select 
                        className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-slate-700 dark:text-slate-200 font-bold transition-all appearance-none"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        <option value="">-- Chọn lớp --</option>
                        {availableClasses.map(cls => (
                            <option key={cls} value={cls}>Lớp {cls}</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 rotate-90" />
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'PARENT' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">
                  Thông tin học sinh
                </label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="w-5 h-5 text-slate-300 dark:text-slate-600 group-focus-within:text-teal-500 transition-colors" />
                    </div>
                    <input 
                        type="text" 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-slate-700 dark:text-slate-200 font-bold transition-all"
                        placeholder="Tên hoặc mã số học sinh..."
                        value={studentQuery}
                        onChange={(e) => setStudentQuery(e.target.value)}
                    />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-rose-500 bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 animate-in shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs font-black">{error}</p>
              </div>
            )}

            {warning && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 animate-in fade-in">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs font-black">{warning}</p>
              </div>
            )}

            <button
              type="submit"
              className={cn(
                "w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl transition-all duration-300 flex items-center justify-center gap-3 hover:-translate-y-1 active:scale-95",
                activeTab === 'ADMIN' ? "bg-slate-800 dark:bg-slate-700 shadow-slate-200 dark:shadow-black/20" :
                activeTab === 'TEACHER' ? "bg-teal-600 shadow-teal-200 dark:shadow-teal-900/20" :
                activeTab === 'TASKFORCE' ? "bg-amber-500 shadow-amber-200 dark:shadow-amber-900/20" :
                activeTab === 'MONITOR' ? "bg-purple-600 shadow-purple-200 dark:shadow-purple-900/20" :
                "bg-emerald-600 shadow-emerald-200 dark:shadow-emerald-900/20"
              )}
            >
              Đăng nhập hệ thống
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              © 2024 SmartSchool OS • Bảo mật & Tin cậy
            </p>
          </div>
        </div>

        {/* Access Code Hints removed as per request */}
      </div>
    </div>
  );
};

export default Login;
