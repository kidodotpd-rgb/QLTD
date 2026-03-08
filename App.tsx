
import React, { useState, useEffect, useCallback } from 'react';
import { Student, ViolationRecord, User, AppTab, MonthlyRemark, ClassRemark, ViolationType, RolePermissions, Task } from './types';
import { 
  MOCK_STUDENTS, 
  MOCK_VIOLATIONS, 
  INITIAL_SCORE, 
  VIOLATION_CATEGORIES as INITIAL_CATEGORIES, 
  AUTO_POINT_CRITERIA as INITIAL_CRITERIA, 
  DEFAULT_ROLE_PERMISSIONS, 
  MOCK_TASKS, 
  MOCK_USERS,
  ADMIN_ACCESS_CODE,
  TEACHER_ACCESS_CODE,
  PARENT_ACCESS_CODE,
  TASKFORCE_ACCESS_CODE,
  MONITOR_ACCESS_CODE
} from './constants';
import { mockNow, getSchoolWeekInfo, parseDate } from './src/utils/dateUtils';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import ViolationForm from './components/ViolationForm';
import ChatBot from './components/ChatBot';
import Login from './components/Login';
import ParentView from './components/ParentView';
import StudentDetailView from './components/StudentDetailView';
import RankingBoard from './components/RankingBoard';
import ViolationSummaryTable from './components/ViolationSummaryTable';
import ReportingView from './components/ReportingView';
import ClassMonitorPortal from './components/ClassMonitorPortal';
import AdminCriteriaManager from './components/AdminCriteriaManager';
import AdminPermissionManager from './components/AdminPermissionManager';
import AdminDashboard from './components/AdminDashboard';
import NotificationSystem, { Notification } from './components/NotificationSystem';
import TaskManager from './components/TaskManager';
import Logo from './components/Logo';
import { Bell, Sparkles, Plus, ClipboardCheck, Users, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [violations, setViolations] = useState<ViolationRecord[]>(MOCK_VIOLATIONS);
  const [monthlyRemarks, setMonthlyRemarks] = useState<MonthlyRemark[]>([]);
  const [classRemarks, setClassRemarks] = useState<ClassRemark[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isGoodStudyWeek, setIsGoodStudyWeek] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [violationCategories, setViolationCategories] = useState<Record<string, number>>(INITIAL_CATEGORIES);
  const [autoPointCriteria, setAutoPointCriteria] = useState(INITIAL_CRITERIA);
  const [appLogo, setAppLogo] = useState<string | null>(() => localStorage.getItem('appLogo'));
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>(() => {
    const saved = localStorage.getItem('rolePermissions');
    return saved ? JSON.parse(saved) : DEFAULT_ROLE_PERMISSIONS;
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('tasks');
    return saved ? JSON.parse(saved) : MOCK_TASKS;
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('users');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });

  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('rolePermissions', JSON.stringify(rolePermissions));
  }, [rolePermissions]);

  useEffect(() => {
    if (appLogo) {
      localStorage.setItem('appLogo', appLogo);
    }
  }, [appLogo]);

  // Load user from local storage if available (mock persistence)
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
    
    // Get allowed tabs for this role
    const permissions = rolePermissions.find(p => p.role === loggedInUser.role);
    const allowedTabs = permissions?.allowedTabs || [];

    if (loggedInUser.role === 'PARENT' && allowedTabs.includes('my-child')) {
      setActiveTab('my-child');
    } else if (loggedInUser.role === 'MONITOR' && allowedTabs.includes('monitor-tool')) {
      setActiveTab('monitor-tool');
    } else if (loggedInUser.role === 'ADMIN' && allowedTabs.includes('admin-dashboard')) {
      setActiveTab('admin-dashboard');
    } else if (allowedTabs.length > 0) {
      // Default to first allowed tab if dashboard is not allowed
      setActiveTab(allowedTabs.includes('dashboard') ? 'dashboard' : allowedTabs[0]);
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    setSelectedStudent(null);
    setActiveTab('dashboard');
  };

  const handleResetSystem = () => {
    localStorage.clear();
    window.location.reload();
  };

  // --- Data Handlers ---

  const handleAddViolation = (record: ViolationRecord) => {
    setViolations(prev => [...prev, record]);
    
    // Update student score
    setStudents(prev => prev.map(s => {
      if (s.id === record.studentId) {
        // Add notification for individual violations
        if (!record.isCollective) {
          const newNotif: Notification = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            studentName: s.name,
            parentName: s.parentName || 'Phụ huynh',
            type: record.type,
            timestamp: new Date()
          };
          setNotifications(prevNotif => [newNotif, ...prevNotif]);
        }
        return { ...s, score: s.score + record.points };
      }
      return s;
    }));
  };

  const addNotification = (notif: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotif: Notification = {
      ...notif,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleAddUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  };

  const handleAddUsers = (newUsers: User[]) => {
    setUsers(prev => [...prev, ...newUsers]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleUpdateViolation = (updatedRecord: ViolationRecord) => {
    let pointDifference = 0;
    
    setViolations(prev => prev.map(v => {
        if (v.id === updatedRecord.id) {
            // Calculate difference: New Points - Old Points
            // Example: Old 10, New 15 -> Diff +5. Score += 5.
            // Example: Old -10, New -5 -> Diff +5. Score += 5.
            pointDifference = updatedRecord.points - v.points;
            return updatedRecord;
        }
        return v;
    }));

    if (pointDifference !== 0) {
        setStudents(prev => prev.map(s => {
            if (s.id === updatedRecord.studentId) {
                return { ...s, score: s.score + pointDifference };
            }
            return s;
        }));
        
        // Update selected student view immediately if applicable
        if (selectedStudent && selectedStudent.id === updatedRecord.studentId) {
            setSelectedStudent(prev => prev ? { ...prev, score: prev.score + pointDifference } : null);
        }
    }
  };

  const handleDeleteViolation = (id: string) => {
    const recordToDelete = violations.find(v => v.id === id);
    if (!recordToDelete) return;

    if (!window.confirm(`Bạn có chắc chắn muốn xoá bản ghi vi phạm của em ${recordToDelete.studentName}?`)) {
      return;
    }

    setViolations(prev => prev.filter(v => v.id !== id));
    
    // Revert score
    setStudents(prev => prev.map(s => {
      if (s.id === recordToDelete.studentId) {
        return { ...s, score: s.score - recordToDelete.points };
      }
      return s;
    }));
  };

  const handleAddTask = (task: Task) => {
    setTasks(prev => [task, ...prev]);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleDeleteViolations = (ids: string[]) => {
    const recordsToDelete = violations.filter(v => ids.includes(v.id));
    if (recordsToDelete.length === 0) return;

    setViolations(prev => prev.filter(v => !ids.includes(v.id)));

    // Recalc scores for affected students
    const affectedStudentIds = new Set(recordsToDelete.map(v => v.studentId));
    
    setStudents(prev => prev.map(s => {
      if (affectedStudentIds.has(s.id)) {
        const studentDeletedRecords = recordsToDelete.filter(r => r.studentId === s.id);
        const pointsReverted = studentDeletedRecords.reduce((acc, r) => acc + r.points, 0);
        return { ...s, score: s.score - pointsReverted };
      }
      return s;
    }));
  };

  const handleDeleteClassesData = (classNames: string[]) => {
    if (classNames.length === 0) return;

    if (!window.confirm(`Bạn có chắc chắn muốn xoá TOÀN BỘ dữ liệu vi phạm của ${classNames.length} lớp đã chọn? Hành động này không thể hoàn tác.`)) {
      return;
    }

    const recordsToDelete = violations.filter(v => classNames.includes(v.className));
    
    setViolations(prev => prev.filter(v => !classNames.includes(v.className)));

    // Recalc scores for all students in these classes
    const affectedStudentIds = new Set(recordsToDelete.map(v => v.studentId));
    
    setStudents(prev => prev.map(s => {
      if (affectedStudentIds.has(s.id)) {
        const studentDeletedRecords = recordsToDelete.filter(r => r.studentId === s.id);
        const pointsReverted = studentDeletedRecords.reduce((acc, r) => acc + r.points, 0);
        return { ...s, score: s.score - pointsReverted };
      }
      return s;
    }));
  };

  const handleDeleteBulkClassWeekData = (classNames: string[], weeks: number[]) => {
    if (classNames.length === 0 || weeks.length === 0) return;

    const recordsToDelete = violations.filter(v => 
      classNames.includes(v.className) && weeks.includes(getSchoolWeekInfo(parseDate(v.date)).week)
    );
    
    if (recordsToDelete.length === 0) {
      alert('Không có dữ liệu để xoá cho các lớp và tuần đã chọn.');
      return;
    }

    const idsToDelete = recordsToDelete.map(v => v.id);
    setViolations(prev => prev.filter(v => !idsToDelete.includes(v.id)));

    // Recalc scores
    const affectedStudentIds = new Set(recordsToDelete.map(v => v.studentId));
    setStudents(prev => prev.map(s => {
      if (affectedStudentIds.has(s.id)) {
        const studentDeletedRecords = recordsToDelete.filter(r => r.studentId === s.id);
        const pointsReverted = studentDeletedRecords.reduce((acc, r) => acc + r.points, 0);
        return { ...s, score: s.score - pointsReverted };
      }
      return s;
    }));
  };

  const handleDeleteClassWeekData = (className: string, week: number) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá dữ liệu của lớp ${className} trong Tuần ${week}?`)) {
      return;
    }

    const recordsToDelete = violations.filter(v => 
      v.className === className && getSchoolWeekInfo(parseDate(v.date)).week === week
    );
    
    if (recordsToDelete.length === 0) {
      alert('Không có dữ liệu để xoá cho tuần này.');
      return;
    }

    const idsToDelete = recordsToDelete.map(v => v.id);
    setViolations(prev => prev.filter(v => !idsToDelete.includes(v.id)));

    // Recalc scores
    const affectedStudentIds = new Set(recordsToDelete.map(v => v.studentId));
    setStudents(prev => prev.map(s => {
      if (affectedStudentIds.has(s.id)) {
        const studentDeletedRecords = recordsToDelete.filter(r => r.studentId === s.id);
        const pointsReverted = studentDeletedRecords.reduce((acc, r) => acc + r.points, 0);
        return { ...s, score: s.score - pointsReverted };
      }
      return s;
    }));
  };

  const handleDeleteAllDataForPeriod = (periodType: 'Week' | 'Month', value: number | string) => {
    const label = periodType === 'Week' ? `Tuần ${value}` : `Tháng ${value}`;
    if (!window.confirm(`Bạn có chắc chắn muốn xoá TOÀN BỘ dữ liệu của ${label} cho TẤT CẢ các lớp? Hành động này không thể hoàn tác.`)) {
      return;
    }

    const recordsToDelete = violations.filter(v => {
      const info = getSchoolWeekInfo(parseDate(v.date));
      return periodType === 'Week' ? info.week === value : info.reportMonthLabel === value;
    });

    if (recordsToDelete.length === 0) {
      alert(`Không có dữ liệu để xoá cho ${label}.`);
      return;
    }

    const idsToDelete = recordsToDelete.map(v => v.id);
    setViolations(prev => prev.filter(v => !idsToDelete.includes(v.id)));

    // Recalc scores
    const affectedStudentIds = new Set(recordsToDelete.map(v => v.studentId));
    setStudents(prev => prev.map(s => {
      if (affectedStudentIds.has(s.id)) {
        const studentDeletedRecords = recordsToDelete.filter(r => r.studentId === s.id);
        const pointsReverted = studentDeletedRecords.reduce((acc, r) => acc + r.points, 0);
        return { ...s, score: s.score - pointsReverted };
      }
      return s;
    }));
  };

  const handleAddStudent = (newStudent: Student) => {
    setStudents(prev => [...prev, newStudent]);
  };

  const handleAddStudents = (newStudents: Student[]) => {
    setStudents(prev => {
      // Filter out duplicates by ID if necessary, or just append
      const existingIds = new Set(prev.map(s => s.id));
      const uniqueNew = newStudents.filter(s => !existingIds.has(s.id));
      return [...prev, ...uniqueNew];
    });
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    if (selectedStudent && selectedStudent.id === updatedStudent.id) {
        setSelectedStudent(updatedStudent);
    }
  };

  const handleArchiveStudent = (studentId: string, archive: boolean, reason?: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { 
          ...s, 
          isArchived: archive, 
          archivedAt: archive ? mockNow.toLocaleDateString('vi-VN') : undefined,
          archivedReason: archive ? reason : undefined
        };
      }
      return s;
    }));
  };

  const handleUpdateRemark = (remark: MonthlyRemark) => {
    setMonthlyRemarks(prev => {
      const existing = prev.findIndex(r => r.studentId === remark.studentId && r.monthYear === remark.monthYear);
      if (existing >= 0) {
        const newRemarks = [...prev];
        newRemarks[existing] = remark;
        return newRemarks;
      }
      return [...prev, remark];
    });
  };

  const handleUpdateClassRemark = (remark: ClassRemark) => {
    setClassRemarks(prev => {
      const existing = prev.findIndex(r => r.className === remark.className && r.period === remark.period);
      if (existing > -1) {
        const updated = [...prev];
        updated[existing] = remark;
        return updated;
      }
      return [...prev, remark];
    });
  };

  const handleUpdateViolationCategories = (newCategories: Record<string, number>) => {
    setViolationCategories(newCategories);
  };

  const handleUpdateAutoPointCriteria = (newCriteria: typeof autoPointCriteria) => {
    setAutoPointCriteria(newCriteria);
  };

  const handleResetPassword = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        let defaultPass = '1234';
        if (u.role === 'ADMIN') defaultPass = ADMIN_ACCESS_CODE;
        if (u.role === 'TEACHER') defaultPass = TEACHER_ACCESS_CODE;
        if (u.role === 'PARENT') defaultPass = PARENT_ACCESS_CODE;
        if (u.role === 'TASKFORCE') defaultPass = TASKFORCE_ACCESS_CODE;
        if (u.role === 'MONITOR') defaultPass = MONITOR_ACCESS_CODE;
        
        return { ...u, password: defaultPass, passwordChanged: false };
      }
      return u;
    }));
    addNotification({
      studentName: 'Hệ thống',
      parentName: 'Quản trị',
      type: 'Điểm phát sinh'
    });
    alert('Đã reset mật khẩu về mặc định.');
  };

  const handleChangePassword = (userId: string, newPassword: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword, passwordChanged: true } : u));
    
    // Update current user if they are the one changing password
    if (user && user.id === userId) {
      const updatedUser = { ...user, password: newPassword, passwordChanged: true };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  // --- View Logic ---

  if (!user) {
    return <Login onLogin={handleLogin} students={students} users={users} />;
  }

  // Filter accessible data based on role
  const accessibleStudents = (user.role === 'TEACHER' || user.role === 'MONITOR') && user.assignedClass
    ? students.filter(s => s.class === user.assignedClass)
    : students;

  const activeStudents = accessibleStudents.filter(s => !s.isArchived);

  const accessibleViolations = (user.role === 'TEACHER' || user.role === 'MONITOR') && user.assignedClass
    ? violations.filter(v => v.className === user.assignedClass)
    : violations;
    
  const activeViolations = accessibleViolations.filter(v => {
    const student = students.find(s => s.id === v.studentId);
    return !student || !student.isArchived;
  });

  // For Parent View logic
  if (user.role === 'PARENT') {
    const myStudent = students.find(s => s.id === user.studentId);
    if (!myStudent) return <div className="p-10 text-center">Không tìm thấy dữ liệu học sinh. Vui lòng liên hệ nhà trường. <button onClick={handleLogout} className="text-blue-600 underline ml-2">Đăng xuất</button></div>;
    
    return (
      <div className="flex h-screen bg-white overflow-hidden">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onLogout={handleLogout} 
          user={user} 
          appLogo={appLogo} 
          onChangePassword={handleChangePassword}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 ml-0 lg:ml-64">
           <motion.div
             key={activeTab}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
             className="h-full"
           >
             {activeTab === 'my-child' && <ParentView student={myStudent} violations={violations} />}
             {activeTab === 'ranking' && (
                <RankingBoard 
                  students={students} 
                  violations={violations} 
                  userRole={user.role}
                  isGoodStudyWeek={isGoodStudyWeek}
                  onToggleGoodStudyWeek={setIsGoodStudyWeek}
                />
             )}
             {activeTab === 'monitor-tool' && (
                <ClassMonitorPortal 
                  students={students} 
                  violations={violations}
                  onAddRecord={handleAddViolation}
                  mode="inline"
                  currentUser={user}
                />
             )}
           </motion.div>
        </main>
         <ChatBot students={[myStudent]} violations={violations.filter(v => v.studentId === myStudent.id)} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#111827] overflow-hidden font-sans text-slate-900 dark:text-slate-100">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setSelectedStudent(null); }} 
        onLogout={handleLogout} 
        user={user} 
        appLogo={appLogo}
        rolePermissions={rolePermissions}
        onChangePassword={handleChangePassword}
      />

      <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 ml-0 lg:ml-64 relative">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-4 sm:p-5 rounded-3xl border border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none sticky top-0 z-30">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-100 dark:shadow-none border border-slate-100 dark:border-slate-700 p-1 sm:p-2 overflow-hidden group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <Logo size={32} imageUrl={appLogo} />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">
                {selectedStudent ? 'Chi tiết Học sinh' : 
                 activeTab === 'dashboard' ? 'THPT Số 3 Tuy Phước' : 
                 activeTab === 'students' ? 'Danh sách Học sinh' : 
                 activeTab === 'monitor-tool' ? 'Cổng nhập liệu SĐB' :
                 activeTab === 'record' ? 'Ghi nhận Vi phạm' : 
                 activeTab === 'violations' ? 'Bảng tổng hợp Vi phạm' : 
                 activeTab === 'reports' ? 'Phân tích & Báo cáo' : 
                 activeTab === 'ranking' ? 'Bảng Xếp hạng' : 
                 activeTab === 'permissions' ? 'Quản lý Quyền hạn' : 'SmartSchool'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  Hệ thống Quản lý Nề nếp Thông minh
                </p>
                <div className="hidden sm:block w-1 h-1 bg-slate-300 rounded-full" />
                <p className="hidden sm:block text-[10px] sm:text-[11px] font-black text-teal-500 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                  {mockNow.toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
             <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 group focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm nhanh..." 
                  className="bg-transparent border-none outline-none text-[11px] font-black text-slate-600 dark:text-slate-300 placeholder:text-slate-400 w-32 focus:w-48 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setActiveTab('violations');
                    }
                  }}
                />
             </div>
             <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-1 hidden sm:block" />
             <button className="w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm relative group">
                <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
             </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedStudent ? `detail-${selectedStudent.id}` : activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="h-full"
          >
            {selectedStudent ? (
               <StudentDetailView 
                  student={selectedStudent} 
                  violations={violations}
                  monthlyRemarks={monthlyRemarks}
                  onBack={() => setSelectedStudent(null)}
                  userRole={user.role}
                  onAddRecord={handleAddViolation}
                  onUpdateRecord={handleUpdateViolation}
                  onDeleteRecord={handleDeleteViolation}
                  onUpdateRemark={handleUpdateRemark}
                  onUpdateStudent={handleUpdateStudent}
                  onAddNotification={addNotification}
               />
            ) : (
              <div className="h-full flex flex-col pb-10">
                {activeTab === 'dashboard' && (
                    <Dashboard 
                        students={activeStudents} 
                        violations={activeViolations} 
                        onAddRecord={handleAddViolation}
                        userRole={user.role}
                        currentUser={user}
                        onNavigate={setActiveTab}
                        isGoodStudyWeek={isGoodStudyWeek}
                        onToggleGoodStudyWeek={setIsGoodStudyWeek}
                        onDeleteViolations={handleDeleteViolations}
                        onAddNotification={addNotification}
                        onResetData={() => {
                          if (window.confirm('CẢNH BÁO: Hành động này sẽ xoá TOÀN BỘ dữ liệu vi phạm, nhận xét và đưa điểm số học sinh về mặc định (200đ). Bạn có chắc chắn?')) {
                            setViolations([]);
                            setMonthlyRemarks([]);
                            setClassRemarks([]);
                            setNotifications([]);
                            setStudents(prev => prev.map(s => ({ ...s, score: 200, isArchived: false })));
                            alert('Hệ thống đã được reset về trạng thái ban đầu.');
                          }
                        }}
                        onImportCSV={() => {
                          setActiveTab('students');
                          setIsImporting(true);
                        }}
                        onAddTask={handleAddTask}
                        violationCategories={violationCategories}
                        tasks={tasks}
                    />
                )}
                
                {activeTab === 'students' && (
                  <StudentList 
                    students={accessibleStudents} 
                    violations={accessibleViolations} 
                    userRole={user.role}
                    onViewDetail={setSelectedStudent}
                    onUpdateStudent={handleUpdateStudent}
                    onAddStudent={handleAddStudent}
                    onAddStudents={handleAddStudents}
                    onAddViolation={(student) => {
                        setSelectedStudent(null); // Ensure we are not in detail view
                        setActiveTab('record');
                    }}
                    onArchiveStudent={handleArchiveStudent}
                    defaultDisplayMode="students"
                    isImporting={isImporting}
                    setIsImporting={setIsImporting}
                  />
                )}

                {activeTab === 'classes' && (
                  <StudentList 
                    students={accessibleStudents} 
                    violations={accessibleViolations} 
                    userRole={user.role}
                    onViewDetail={setSelectedStudent}
                    onUpdateStudent={handleUpdateStudent}
                    onAddStudent={handleAddStudent}
                    onAddStudents={handleAddStudents}
                    onAddViolation={(student) => {
                        setSelectedStudent(null);
                        setActiveTab('record');
                    }}
                    onArchiveStudent={handleArchiveStudent}
                    defaultDisplayMode="classes"
                    isImporting={isImporting}
                    setIsImporting={setIsImporting}
                  />
                )}
                
                {activeTab === 'record' && (
                  <ViolationForm 
                    students={activeStudents} 
                    violations={activeViolations}
                    onAddRecord={handleAddViolation}
                    userRole={user.role}
                    initialStudentId="" 
                    onAddNotification={addNotification}
                    violationCategories={violationCategories}
                    autoPointCriteria={autoPointCriteria}
                  />
                )}

                {activeTab === 'admin-dashboard' && user.role === 'ADMIN' && (
                  <AdminDashboard 
                    users={users}
                    students={students}
                    violations={violations}
                    onAddUser={handleAddUser}
                    onAddUsers={handleAddUsers}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                    onResetPassword={handleResetPassword}
                    onResetSystem={handleResetSystem}
                  />
                )}

                {activeTab === 'admin-criteria' && user.role === 'ADMIN' && (
                  <AdminCriteriaManager 
                    categories={violationCategories}
                    autoCriteria={autoPointCriteria}
                    onUpdateCategories={handleUpdateViolationCategories}
                    onUpdateAutoCriteria={handleUpdateAutoPointCriteria}
                    appLogo={appLogo}
                    onUpdateLogo={setAppLogo}
                    onImportCSV={() => {
                      setActiveTab('students');
                      setIsImporting(true);
                    }}
                  />
                )}

                {activeTab === 'permissions' && user.role === 'ADMIN' && (
                  <AdminPermissionManager 
                    permissions={rolePermissions}
                    onUpdatePermissions={setRolePermissions}
                  />
                )}

                {activeTab === 'monitor-tool' && (
                   <div className="h-full">
                      <ClassMonitorPortal 
                        students={activeStudents} 
                        violations={activeViolations}
                        onAddRecord={handleAddViolation}
                        mode="inline"
                        currentUser={user}
                      />
                   </div>
                )}

                {activeTab === 'ranking' && (
                  <RankingBoard 
                    students={activeStudents} 
                    violations={activeViolations} 
                    userRole={user.role}
                    onAddRecord={handleAddViolation}
                    onDeleteViolations={handleDeleteViolations}
                    onDeleteClassesData={handleDeleteClassesData}
                    onDeleteClassWeekData={handleDeleteClassWeekData}
                    onDeleteBulkClassWeekData={handleDeleteBulkClassWeekData}
                    onDeleteAllDataForPeriod={handleDeleteAllDataForPeriod}
                    isGoodStudyWeek={isGoodStudyWeek}
                    onToggleGoodStudyWeek={setIsGoodStudyWeek}
                    classRemarks={classRemarks}
                    onUpdateClassRemark={handleUpdateClassRemark}
                    currentUser={user}
                  />
                )}

                {activeTab === 'violations' && (
                  <ViolationSummaryTable 
                    violations={activeViolations}
                    students={activeStudents}
                    onDeleteViolations={handleDeleteViolations}
                    userRole={user.role}
                    currentUser={user}
                  />
                )}

                {activeTab === 'reports' && (
                  <ReportingView 
                    students={activeStudents}
                    violations={activeViolations}
                    userRole={user.role}
                    currentUser={user}
                  />
                )}

                {activeTab === 'tasks' && (
                  <TaskManager 
                    tasks={tasks}
                    currentUser={user}
                    onAddTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                  />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <ChatBot students={accessibleStudents} violations={accessibleViolations} />
      <NotificationSystem notifications={notifications} onDismiss={handleDismissNotification} />

      {/* Floating Action Button */}
      {(() => {
        const permissions = rolePermissions.find(p => p.role === user.role);
        const allowedTabs = permissions?.allowedTabs || [];
        const canRecord = allowedTabs.includes('record');
        const canSeeStudents = allowedTabs.includes('students');
        
        if (!canRecord && !canSeeStudents) return null;

        return (
          <div className="fixed bottom-6 right-24 z-40">
            <AnimatePresence>
              {isFabOpen && (
                <div className="absolute bottom-20 right-0 flex flex-col gap-3">
                  {canRecord && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.5, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: 20 }}
                      onClick={() => { setActiveTab('record'); setIsFabOpen(false); }}
                      className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
                    >
                      <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-500">
                        <ClipboardCheck className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-800 dark:text-white">Nhập Vi phạm</p>
                        <p className="text-[10px] font-bold text-slate-400">Ghi nhận lỗi mới</p>
                      </div>
                    </motion.button>
                  )}

                  {canSeeStudents && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.5, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: 20 }}
                      transition={{ delay: 0.1 }}
                      onClick={() => { setActiveTab('students'); setIsFabOpen(false); }}
                      className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
                    >
                      <div className="w-10 h-10 bg-teal-50 dark:bg-teal-900/30 rounded-xl flex items-center justify-center text-teal-500">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-800 dark:text-white">Danh sách Lớp</p>
                        <p className="text-[10px] font-bold text-slate-400">Xem nề nếp lớp</p>
                      </div>
                    </motion.button>
                  )}
                </div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setIsFabOpen(!isFabOpen)}
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 group border-4 border-white dark:border-slate-900",
                isFabOpen ? "bg-slate-800 dark:bg-white text-white dark:text-slate-800 rotate-45" : "bg-teal-600 text-white hover:scale-110"
              )}
            >
              <Plus className="w-8 h-8" />
            </button>
          </div>
        );
      })()}
    </div>
  );
};

export default App;
