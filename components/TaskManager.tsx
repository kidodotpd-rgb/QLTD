
import React, { useState, useMemo } from 'react';
import { Task, Role, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical, 
  Trash2, 
  Calendar,
  User as UserIcon,
  Shield,
  Zap,
  ChevronRight,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TaskManagerProps {
  tasks: Task[];
  currentUser: User;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  currentUser,
  onAddTask,
  onUpdateTask,
  onDeleteTask
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // New Task Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newAssignedTo, setNewAssignedTo] = useState<Role[]>(['TASKFORCE']);
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);

  const canManageTasks = ['ADMIN', 'TEACHER'].includes(currentUser.role);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           task.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      
      // If not admin/teacher, only show tasks assigned to their role
      const matchesRole = canManageTasks || task.assignedTo.includes(currentUser.role);
      
      return matchesSearch && matchesStatus && matchesPriority && matchesRole;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter, currentUser.role, canManageTasks]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const task: Task = {
      id: `T-${Date.now()}`,
      title: newTitle,
      description: newDesc,
      assignedTo: newAssignedTo,
      status: 'pending',
      priority: newPriority,
      dueDate: newDueDate,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.role
    };
    onAddTask(task);
    setIsAdding(false);
    setNewTitle('');
    setNewDesc('');
  };

  const toggleStatus = (task: Task) => {
    const nextStatus: Record<string, 'pending' | 'in-progress' | 'completed'> = {
      'pending': 'in-progress',
      'in-progress': 'completed',
      'completed': 'pending'
    };
    onUpdateTask({ ...task, status: nextStatus[task.status] });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      onUpdateTask(editingTask);
      setEditingTask(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'in-progress': return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      default: return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-4 font-display">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200 dark:shadow-none">
              <ClipboardList className="w-8 h-8" />
            </div>
            Quản lý Nhiệm vụ
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mt-2 ml-1">
            Điều phối hoạt động Đội Cờ Đỏ & Cán sự lớp
          </p>
        </div>

        {canManageTasks && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Tạo nhiệm vụ mới
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Tìm kiếm nhiệm vụ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-bold uppercase tracking-widest text-slate-600 focus:ring-0 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="in-progress">Đang thực hiện</option>
              <option value="completed">Đã hoàn thành</option>
            </select>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <Zap className="w-4 h-4 text-slate-400" />
            <select 
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-bold uppercase tracking-widest text-slate-600 focus:ring-0 cursor-pointer"
            >
              <option value="all">Tất cả ưu tiên</option>
              <option value="high">Cao</option>
              <option value="medium">Trung bình</option>
              <option value="low">Thấp</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={cn(
                  "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                  getPriorityColor(task.priority)
                )}>
                  {task.priority === 'high' ? 'Ưu tiên cao' : task.priority === 'medium' ? 'Trung bình' : 'Ưu tiên thấp'}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(task.status)}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {task.status === 'completed' ? 'Hoàn thành' : task.status === 'in-progress' ? 'Đang chạy' : 'Chờ'}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-3 group-hover:text-indigo-600 transition-colors">
                {task.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 flex-1">
                {task.description}
              </p>

              <div className="space-y-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{task.dueDate}</span>
                  </div>
                  <div className="flex -space-x-2">
                    {task.assignedTo.map((role, idx) => (
                      <div 
                        key={idx}
                        title={role}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black text-white shadow-sm",
                          role === 'TASKFORCE' ? "bg-amber-500" : role === 'MONITOR' ? "bg-blue-500" : "bg-teal-500"
                        )}
                      >
                        {role[0]}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleStatus(task)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                      task.status === 'completed' 
                        ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" 
                        : task.status === 'in-progress'
                        ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {task.status === 'completed' ? 'Mở lại' : task.status === 'in-progress' ? 'Hoàn thành' : 'Bắt đầu'}
                  </button>
                  
                  {canManageTasks && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"
                      >
                        <Filter className="w-4 h-4" /> {/* Using Filter as a placeholder for Edit icon if Edit is not available, but let's use MoreVertical or similar */}
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredTasks.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-40">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <ClipboardList className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Không có nhiệm vụ</h3>
            <p className="text-sm text-slate-500 mt-2">Hãy tạo nhiệm vụ mới để bắt đầu điều phối</p>
          </div>
        )}
      </div>

      {/* Edit Task Modal */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTask(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="p-8 lg:p-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white font-display">Chỉnh sửa Nhiệm vụ</h3>
                  <button onClick={() => setEditingTask(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleUpdateSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiêu đề nhiệm vụ</label>
                    <input 
                      required
                      type="text"
                      value={editingTask.title}
                      onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả chi tiết</label>
                    <textarea 
                      required
                      value={editingTask.description}
                      onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                      rows={4}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mức độ ưu tiên</label>
                      <select 
                        value={editingTask.priority}
                        onChange={(e) => setEditingTask({...editingTask, priority: e.target.value as any})}
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="low">Thấp</option>
                        <option value="medium">Trung bình</option>
                        <option value="high">Cao</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hạn hoàn thành</label>
                      <input 
                        type="date"
                        value={editingTask.dueDate}
                        onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giao cho vai trò</label>
                    <div className="flex flex-wrap gap-3">
                      {['TASKFORCE', 'MONITOR', 'TEACHER'].map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            const current = editingTask.assignedTo;
                            const next = current.includes(role as Role) 
                                ? current.filter(r => r !== role) 
                                : [...current, role as Role];
                            setEditingTask({...editingTask, assignedTo: next});
                          }}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                            editingTask.assignedTo.includes(role as Role)
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
                              : "bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700"
                          )}
                        >
                          {role === 'TASKFORCE' ? 'Đội Cờ Đỏ' : role === 'MONITOR' ? 'Cán sự lớp' : 'Giáo viên'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all mt-4"
                  >
                    Lưu thay đổi
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Task Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="p-8 lg:p-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white font-display">Tạo Nhiệm vụ Mới</h3>
                  <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleCreateTask} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiêu đề nhiệm vụ</label>
                    <input 
                      required
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Nhập tiêu đề..."
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả chi tiết</label>
                    <textarea 
                      required
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Mô tả công việc cần thực hiện..."
                      rows={4}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mức độ ưu tiên</label>
                      <select 
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as any)}
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="low">Thấp</option>
                        <option value="medium">Trung bình</option>
                        <option value="high">Cao</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hạn hoàn thành</label>
                      <input 
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giao cho vai trò</label>
                    <div className="flex flex-wrap gap-3">
                      {['TASKFORCE', 'MONITOR', 'TEACHER'].map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            setNewAssignedTo(prev => 
                              prev.includes(role as Role) 
                                ? prev.filter(r => r !== role) 
                                : [...prev, role as Role]
                            );
                          }}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                            newAssignedTo.includes(role as Role)
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
                              : "bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700"
                          )}
                        >
                          {role === 'TASKFORCE' ? 'Đội Cờ Đỏ' : role === 'MONITOR' ? 'Cán sự lớp' : 'Giáo viên'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all mt-4"
                  >
                    Xác nhận tạo nhiệm vụ
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskManager;
