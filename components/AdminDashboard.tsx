
import React, { useState, useMemo } from 'react';
import { 
  Users, 
  ShieldAlert, 
  TrendingUp, 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Mail, 
  Calendar,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  FileOutput,
  X,
  List,
  Lock,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { User, Role, Student, ViolationRecord } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

interface AdminDashboardProps {
  users: User[];
  students: Student[];
  violations: ViolationRecord[];
  onUpdateUser: (user: User) => void;
  onAddUser: (user: User) => void;
  onAddUsers?: (users: User[]) => void;
  onDeleteUser: (userId: string) => void;
  onResetPassword: (userId: string) => void;
  onResetSystem?: () => void;
}

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#64748b'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  students,
  violations,
  onUpdateUser,
  onAddUser,
  onAddUsers,
  onDeleteUser,
  onResetPassword,
  onResetSystem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetConfirmUser, setResetConfirmUser] = useState<User | null>(null);
  
  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState<{ total: number, added: number } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('processing');
    setImportProgress(10);
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setImportProgress(30);
        
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        setImportProgress(50);

        if (data.length === 0) {
          throw new Error("File không có dữ liệu hoặc định dạng không đúng.");
        }

        const errors: string[] = [];
        const validUsers: User[] = [];

        data.forEach((row, index) => {
          const rowNum = index + 2;
          const name = row.name || row['Họ tên'];
          const email = row.email || row['Email'];
          const role = (row.role || row['Vai trò'] || 'TEACHER').toUpperCase() as Role;
          
          if (!name) errors.push(`Dòng ${rowNum}: Thiếu tên người dùng.`);
          if (!email) errors.push(`Dòng ${rowNum}: Thiếu email.`);
          if (!['ADMIN', 'TEACHER', 'TASKFORCE', 'MONITOR', 'PARENT'].includes(role)) {
             errors.push(`Dòng ${rowNum}: Vai trò "${role}" không hợp lệ.`);
          }

          if (name && email && errors.length === 0) {
            validUsers.push({
              id: row.id || `U-${Date.now()}-${index}`,
              name: String(name).trim(),
              email: String(email).trim(),
              role: role,
              assignedClass: row.assignedClass || row['Lớp'] || undefined,
              studentId: row.studentId || row['ID Học sinh'] || undefined,
              lastLogin: 'Chưa đăng nhập',
              password: row.password || row['Mật khẩu'] || '1234'
            });
          }
        });

        setImportProgress(80);

        if (errors.length > 0) {
          setImportErrors(errors);
          setImportStatus('error');
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 800));
        setImportProgress(100);

        if (onAddUsers) {
          onAddUsers(validUsers);
        } else {
          validUsers.forEach(u => onAddUser(u));
        }

        setImportSummary({ total: data.length, added: validUsers.length });
        setImportStatus('success');
      } catch (error: any) {
        setImportErrors([error.message || "Có lỗi khi đọc file."]);
        setImportStatus('error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- Aggregated Stats ---
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const totalStudents = students.length;
    const totalViolations = violations.length;
    const recentViolations = violations.filter(v => {
      const date = new Date(v.date);
      const now = new Date();
      return (now.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      totalUsers,
      totalStudents,
      totalViolations,
      recentViolations
    };
  }, [users, students, violations]);

  // --- Charts Data ---
  const violationTrendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => ({
      date: date.split('-').slice(1).reverse().join('/'),
      count: violations.filter(v => v.date === date).length
    }));
  }, [violations]);

  const violationTypeData = useMemo(() => {
    const types: Record<string, number> = {};
    violations.forEach(v => {
      types[v.type] = (types[v.type] || 0) + 1;
    });
    return Object.entries(types)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [violations]);

  const classPerformanceData = useMemo(() => {
    const classes: Record<string, number> = {};
    violations.forEach(v => {
      classes[v.className] = (classes[v.className] || 0) + 1;
    });
    return Object.entries(classes)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [violations]);

  // --- User Management ---
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const userData: User = {
      id: editingUser?.id || `U${Date.now()}`,
      name: formData.get('name') as string,
      role: formData.get('role') as Role,
      email: formData.get('email') as string,
      assignedClass: formData.get('assignedClass') as string || undefined,
      studentId: formData.get('studentId') as string || undefined,
      lastLogin: editingUser?.lastLogin || 'Chưa đăng nhập',
      password: editingUser?.password || (formData.get('password') as string) || '1234'
    };

    if (editingUser) {
      onUpdateUser(userData);
    } else {
      onAddUser(userData);
    }
    setIsAddingUser(false);
    setEditingUser(null);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-600" />
            Bảng Quản Trị Hệ Thống
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Giám sát toàn diện, quản lý tài khoản và báo cáo tổng hợp</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {onResetSystem && (
            <button 
              onClick={() => {
                if (window.confirm("Bạn có chắc chắn muốn RESET TOÀN BỘ HỆ THỐNG? Tất cả dữ liệu người dùng, vi phạm và cài đặt sẽ bị xóa sạch và quay về mặc định.")) {
                  onResetSystem();
                }
              }}
              className="px-6 py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          )}
          <button 
            onClick={() => setIsImporting(true)}
            className="px-6 py-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center gap-2"
          >
            <FileOutput className="w-4 h-4" />
            Nhập CSV
          </button>
          <button 
            onClick={() => setIsAddingUser(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Thêm tài khoản
          </button>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".csv, .xlsx, .xls"
        onChange={handleImportCSV}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Người dùng', value: stats.totalUsers, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+2', trendUp: true },
          { label: 'Học sinh', value: stats.totalStudents, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: 'Ổn định', trendUp: true },
          { label: 'Tổng vi phạm', value: stats.totalViolations, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50', trend: '+12%', trendUp: false },
          { label: 'Bảo mật (Đã đổi MK)', value: `${Math.round((users.filter(u => u.passwordChanged).length / users.length) * 100)}%`, icon: Lock, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'Cần cải thiện', trendUp: false },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 ${stat.bg} dark:bg-opacity-10 rounded-2xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${stat.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {stat.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.trend}
              </div>
            </div>
            <h4 className="text-3xl font-black text-slate-800 dark:text-white mb-1">{stat.value.toLocaleString()}</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Violation Trends */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Xu hướng vi phạm
              </h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Thống kê 7 ngày gần nhất</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={violationTrendData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Violations by Class */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Lớp vi phạm nhiều nhất
              </h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Xếp hạng theo số lượng lỗi</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classPerformanceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                  width={60}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[0, 10, 10, 0]}>
                  {classPerformanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Quản lý tài khoản người dùng
              </h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Danh sách tất cả các tài khoản truy cập hệ thống</p>
            </div>
            
            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tên, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="ADMIN">Quản trị viên</option>
                <option value="TEACHER">Giáo viên</option>
                <option value="TASKFORCE">Đội Cờ Đỏ</option>
                <option value="MONITOR">Lớp trưởng</option>
                <option value="PARENT">Phụ huynh</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Người dùng</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vai trò</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ghi chú</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Đăng nhập cuối</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black text-sm">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-white">{u.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">{u.email || 'Chưa cập nhật email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      u.role === 'ADMIN' ? 'bg-rose-50 text-rose-600' :
                      u.role === 'TEACHER' ? 'bg-indigo-50 text-indigo-600' :
                      u.role === 'TASKFORCE' ? 'bg-amber-50 text-amber-600' :
                      u.role === 'MONITOR' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-bold text-slate-500">
                      {u.assignedClass ? `Lớp: ${u.assignedClass}` : u.studentId ? `HS: ${u.studentId}` : '-'}
                    </p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-[11px] font-bold">{u.lastLogin}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setResetConfirmUser(u)}
                        className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg text-amber-600 transition-all"
                        title="Reset mật khẩu"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setEditingUser(u)}
                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-indigo-600 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDeleteUser(u.id)}
                        className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-rose-600 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal */}
      <AnimatePresence>
        {(isAddingUser || editingUser) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                    {editingUser ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Nhập thông tin chi tiết người dùng</p>
                </div>
                <button 
                  onClick={() => { setIsAddingUser(false); setEditingUser(null); }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
                >
                  <AlertCircle className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleUserSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Họ và tên</label>
                    <input
                      name="name"
                      required
                      defaultValue={editingUser?.name}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                      placeholder="Nhập họ và tên..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Email</label>
                    <input
                      name="email"
                      type="email"
                      required
                      defaultValue={editingUser?.email}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                      placeholder="email@school.edu.vn"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Vai trò</label>
                      <select
                        name="role"
                        defaultValue={editingUser?.role || 'TEACHER'}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="ADMIN">Quản trị viên</option>
                        <option value="TEACHER">Giáo viên</option>
                        <option value="TASKFORCE">Đội Cờ Đỏ</option>
                        <option value="MONITOR">Lớp trưởng</option>
                        <option value="PARENT">Phụ huynh</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Lớp / ID HS (nếu có)</label>
                      <input
                        name="assignedClass"
                        defaultValue={editingUser?.assignedClass || editingUser?.studentId}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ví dụ: 10A1"
                      />
                    </div>
                  </div>
                  {!editingUser && (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Mật khẩu ban đầu</label>
                      <input
                        name="password"
                        type="password"
                        defaultValue="1234"
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                        placeholder="Mặc định là 1234"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setIsAddingUser(false); setEditingUser(null); }}
                    className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
                  >
                    {editingUser ? 'Cập nhật' : 'Tạo tài khoản'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isImporting && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (importStatus !== 'processing') {
                  setIsImporting(false);
                  setImportStatus('idle');
                }
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600">
                      <FileOutput className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white leading-none">Nhập tài khoản</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Hỗ trợ CSV, XLSX, XLS</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsImporting(false);
                      setImportStatus('idle');
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {importStatus === 'idle' && (
                  <div className="space-y-8">
                    <p className="text-sm text-slate-500 leading-relaxed">Tải lên file chứa danh sách tài khoản. Hệ thống sẽ nhận diện: <span className="font-bold text-slate-700 dark:text-slate-300">Họ tên, Email, Vai trò, Lớp</span>.</p>
                    
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] p-12 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group text-center"
                    >
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-all group-hover:scale-110">
                          <List className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-600 dark:text-slate-300">Nhấn để chọn file</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Hoặc kéo thả vào đây</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          const template = "name,email,role,assignedClass,password\nNguyễn Văn A,gv1@school.edu.vn,TEACHER,10A1,1234\nTrần Thị B,admin@school.edu.vn,ADMIN,,admin123";
                          const blob = new Blob([template], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.setAttribute('hidden', '');
                          a.setAttribute('href', url);
                          a.setAttribute('download', 'template_tai_khoan.csv');
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                      >
                        Tải file mẫu
                      </button>
                    </div>
                  </div>
                )}

                {importStatus === 'processing' && (
                  <div className="py-12 text-center space-y-6">
                    <div className="relative w-24 h-24 mx-auto">
                      <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100 dark:text-slate-700 stroke-current"
                          strokeWidth="3"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-emerald-500 stroke-current transition-all duration-500"
                          strokeWidth="3"
                          strokeDasharray={`${importProgress}, 100`}
                          strokeLinecap="round"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-black text-slate-800 dark:text-white">{importProgress}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-black text-slate-800 dark:text-white">Đang xử lý dữ liệu...</p>
                      <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">Vui lòng không đóng cửa sổ này</p>
                    </div>
                  </div>
                )}

                {importStatus === 'success' && (
                  <div className="py-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-[2rem] flex items-center justify-center text-emerald-500 mx-auto">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-slate-800 dark:text-white">Thành công!</h4>
                      <p className="text-sm text-slate-500 mt-2">Đã nhập thành công <span className="font-black text-emerald-600">{importSummary?.added}</span> tài khoản vào hệ thống.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsImporting(false);
                        setImportStatus('idle');
                      }}
                      className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all"
                    >
                      Hoàn tất
                    </button>
                  </div>
                )}

                {importStatus === 'error' && (
                  <div className="py-4 space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-800">
                      <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
                      <p className="text-sm font-bold text-rose-600">Phát hiện lỗi trong file dữ liệu</p>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                      {importErrors.map((err, i) => (
                        <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-medium text-slate-500 border border-slate-100 dark:border-slate-800">
                          {err}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => setImportStatus('idle')}
                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                      >
                        Thử lại
                      </button>
                      <button 
                        onClick={() => setIsImporting(false)}
                        className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Reset Password Confirmation Modal */}
      {resetConfirmUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
          >
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-amber-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Xác nhận Reset Mật khẩu?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed">
                Mật khẩu của <span className="font-bold text-slate-800 dark:text-white">{resetConfirmUser.name}</span> sẽ được đặt lại về mặc định theo vai trò. Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button 
                onClick={() => setResetConfirmUser(null)}
                className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => {
                  onResetPassword(resetConfirmUser.id);
                  setResetConfirmUser(null);
                }}
                className="flex-1 py-4 bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-200 dark:shadow-none hover:bg-amber-700 transition-all"
              >
                Xác nhận Reset
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
