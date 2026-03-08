
import React, { useState, useMemo } from 'react';
import { ViolationRecord, Role, User, Student } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Trash2, 
  Filter, 
  Calendar, 
  ChevronDown, 
  History,
  CheckCircle2,
  AlertCircle,
  X,
  FileOutput,
  Table as TableIcon,
  Settings2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ColumnKey = 'date' | 'className' | 'studentName' | 'type' | 'points' | 'recordedBy';

interface Column {
  key: ColumnKey;
  label: string;
}

const ALL_COLUMNS: Column[] = [
  { key: 'date', label: 'Thời gian' },
  { key: 'className', label: 'Đơn vị' },
  { key: 'studentName', label: 'Đối tượng' },
  { key: 'type', label: 'Loại sự việc' },
  { key: 'points', label: 'Biến động' },
  { key: 'recordedBy', label: 'Người ghi' },
];

interface ViolationSummaryTableProps {
  violations: ViolationRecord[];
  students: Student[];
  onDeleteViolations: (ids: string[]) => void;
  userRole: Role;
  currentUser: User;
}

const ViolationSummaryTable: React.FC<ViolationSummaryTableProps> = ({
  violations,
  students,
  onDeleteViolations,
  userRole,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isQuickDeleteMode, setIsQuickDeleteMode] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: ColumnKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(['date', 'className', 'studentName', 'type', 'points']);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const availableClasses = useMemo(() => 
    Array.from(new Set(violations.map(v => v.className))).sort(), 
    [violations]
  );

  // Calculate current class scores
  const classScores = useMemo(() => {
    const scores: Record<string, number> = {};
    const uniqueClasses: string[] = Array.from(new Set(students.map(s => s.class)));
    
    uniqueClasses.forEach((cls: string) => {
      scores[cls] = 200; // Base score
    });

    violations.forEach((v: ViolationRecord) => {
      if (scores[v.className] !== undefined) {
        scores[v.className] += v.points;
      }
    });

    return scores;
  }, [students, violations]);

  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      const matchesSearch = 
        v.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.note.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.className.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClass = selectedClass === 'All' || v.className === selectedClass;
      const matchesType = selectedType === 'All' || 
        (selectedType === 'Violation' ? v.points < 0 : v.points > 0);
      
      return matchesSearch && matchesClass && matchesType;
    }).sort((a, b) => {
      const { key, direction } = sortConfig;
      let comparison = 0;
      
      if (key === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (key === 'points') {
        comparison = a.points - b.points;
      } else {
        comparison = String(a[key]).localeCompare(String(b[key]));
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
  }, [violations, searchTerm, selectedClass, selectedType, sortConfig]);

  const handleSort = (key: ColumnKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredViolations.map(v => v.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Bạn có chắc chắn muốn xoá ${selectedIds.length} bản ghi đã chọn?`)) {
      onDeleteViolations(selectedIds);
      setSelectedIds([]);
    }
  };

  const exportToExcel = () => {
    const data = filteredViolations.map(v => ({
      'Ngày': v.date,
      'Lớp': v.className,
      'Học sinh': v.studentName,
      'Nội dung': v.type,
      'Ghi chú': v.note,
      'Điểm': v.points,
      'Người ghi': v.recordedBy,
      'Đối tượng': v.isCollective ? 'Tập thể' : 'Cá nhân'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bảng tổng hợp vi phạm");
    XLSX.writeFile(wb, `Bang_tong_hop_vi_pham_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Enhanced Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-8">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-14 h-14 sm:w-20 sm:h-20 bg-[#151619] border border-white/10 rounded-2xl sm:rounded-3xl flex items-center justify-center text-blue-400 shadow-2xl relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
            <History className="w-7 h-7 sm:w-10 sm:h-10 relative z-10" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter font-display uppercase">Lưu trữ Nhật ký</h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
              <span className="text-[8px] sm:text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] sm:tracking-[0.3em]">Trạng thái: <span className="text-emerald-500">Đã đồng bộ</span></span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span className="text-[8px] sm:text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] sm:tracking-[0.3em]">Bản ghi: <span className="text-blue-500">{violations.length}</span></span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full lg:w-96 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-widest pointer-events-none group-focus-within:text-blue-500 transition-colors">Tìm kiếm</div>
            <input 
              type="text" 
              className="w-full pl-24 sm:pl-32 pr-4 py-4 sm:py-5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-mono focus:outline-none focus:border-blue-500/50 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={exportToExcel}
            className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 bg-[#151619] text-white rounded-xl sm:rounded-2xl text-[10px] font-mono uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3 border border-white/5"
          >
            <FileOutput className="w-4 h-4" /> Xuất Excel
          </button>
        </div>
      </div>

      {/* Modern Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Lọc theo Lớp</p>
          <select 
            className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl py-2.5 px-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="All">Tất cả các lớp</option>
            {availableClasses.map(c => (
              <option key={c} value={c}>Lớp {c}</option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Loại ghi nhận</p>
          <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-xl">
            {[
              { id: 'All', label: 'Tất cả' },
              { id: 'Violation', label: 'Vi phạm' },
              { id: 'Reward', label: 'Khen thưởng' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  selectedType === t.id ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Thao tác Nhanh</p>
          <div className="flex gap-2">
            {userRole === 'ADMIN' && (
              <button
                onClick={() => setIsQuickDeleteMode(!isQuickDeleteMode)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border",
                  isQuickDeleteMode ? "bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-100" : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800"
                )}
              >
                <AlertCircle className="w-4 h-4" /> {isQuickDeleteMode ? 'Bật Xoá Nhanh' : 'Xoá Nhanh'}
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowColumnSettings(!showColumnSettings)}
                className={cn(
                  "p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-100",
                  showColumnSettings && "bg-blue-50 text-blue-600 border-blue-100"
                )}
                title="Tùy chỉnh cột"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              
              <AnimatePresence>
                {showColumnSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-4 z-50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hiển thị cột</h4>
                      <button onClick={() => setShowColumnSettings(false)}><X className="w-3 h-3" /></button>
                    </div>
                    <div className="space-y-2">
                      {ALL_COLUMNS.map(col => (
                        <button
                          key={col.key}
                          onClick={() => toggleColumn(col.key)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{col.label}</span>
                          {visibleColumns.includes(col.key) ? (
                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-slate-300" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đã chọn</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{selectedIds.length}</p>
          </div>
          <button 
            onClick={handleBulkDelete}
            disabled={selectedIds.length === 0}
            className="p-4 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-100 disabled:opacity-30 transition-all shadow-sm"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {filteredViolations.map((v) => (
          <motion.div
            key={v.id}
            layout
            onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
            className={cn(
              "bg-white dark:bg-[#151619] rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden transition-all active:scale-[0.98]",
              selectedIds.includes(v.id) && "ring-2 ring-blue-500/50"
            )}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 dark:border-white/10 text-blue-600 focus:ring-blue-500 bg-transparent"
                    checked={selectedIds.includes(v.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectOne(v.id);
                    }}
                  />
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{v.date}</span>
                </div>
                <span className={cn(
                  "text-lg font-mono font-bold tracking-tighter",
                  v.points < 0 ? "text-rose-500" : "text-emerald-500"
                )}>
                  {v.points > 0 ? '+' : ''}{v.points}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-mono text-[11px] shrink-0">
                  {v.studentName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[12px] font-mono font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight truncate">{v.studentName}</h4>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-md text-[9px] font-mono uppercase tracking-widest border border-slate-200 dark:border-white/5">
                    Lớp {v.className}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={cn(
                  "text-[9px] font-mono px-2 py-0.5 rounded-md uppercase tracking-widest border",
                  v.points < 0 ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                )}>
                  {v.type}
                </span>
                {v.isCollective && (
                  <span className="text-[8px] font-mono bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md uppercase tracking-tighter border border-amber-500/20">Tập thể</span>
                )}
              </div>

              <AnimatePresence>
                {expandedId === v.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 space-y-3"
                  >
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Chi tiết sự việc</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium italic leading-relaxed">{v.note}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Người ghi nhận</p>
                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{v.recordedBy}</p>
                      </div>
                      {(userRole === 'ADMIN' || v.recordedBy === currentUser?.name) && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isQuickDeleteMode) {
                              onDeleteViolations([v.id]);
                            } else if (window.confirm('Xác nhận xoá bản ghi này?')) {
                              onDeleteViolations([v.id]);
                            }
                          }}
                          className={cn(
                            "p-2.5 transition-all rounded-xl border",
                            isQuickDeleteMode 
                              ? "text-rose-500 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20" 
                              : "text-slate-300 dark:text-slate-600 border-transparent hover:text-rose-500 hover:border-rose-500/20 hover:bg-rose-500/5"
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="mt-3 flex justify-center">
                <ChevronDown className={cn(
                  "w-4 h-4 text-slate-300 transition-transform duration-300",
                  expandedId === v.id && "rotate-180"
                )} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Table - Hidden on mobile */}
      <div className="hidden lg:block bg-white dark:bg-[#151619] rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <th className="px-6 py-6 text-center w-12">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 dark:border-white/10 text-blue-600 focus:ring-blue-500 bg-transparent"
                    checked={filteredViolations.length > 0 && selectedIds.length === filteredViolations.length}
                    onChange={handleSelectAll}
                  />
                </th>
                {ALL_COLUMNS.filter(col => visibleColumns.includes(col.key)).map(col => (
                  <th 
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={cn(
                      "px-6 py-6 text-left text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:text-blue-500 transition-colors group",
                      col.key === 'points' && "text-center"
                    )}
                  >
                    <div className={cn("flex items-center gap-2", col.key === 'points' && "justify-center")}>
                      {col.label}
                      {sortConfig.key === col.key ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-6 text-right text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {filteredViolations.map((v, index) => (
                <tr 
                  key={v.id} 
                  className={cn(
                    "hover:bg-slate-50/80 dark:hover:bg-white/5 transition-all group",
                    index % 2 !== 0 && "bg-slate-50/30 dark:bg-white/[0.02]",
                    selectedIds.includes(v.id) && "bg-blue-50/30 dark:bg-blue-500/10"
                  )}
                >
                  <td className="px-6 py-5 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 dark:border-white/10 text-blue-600 focus:ring-blue-500 bg-transparent"
                      checked={selectedIds.includes(v.id)}
                      onChange={() => handleSelectOne(v.id)}
                    />
                  </td>
                  {visibleColumns.includes('date') && (
                    <td className="px-6 py-5 whitespace-nowrap text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {v.date}
                    </td>
                  )}
                  {visibleColumns.includes('className') && (
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-mono uppercase tracking-widest w-fit border border-slate-200 dark:border-white/5">
                          Lớp {v.className}
                        </span>
                        <span className={cn(
                          "text-[9px] font-mono mt-1.5 uppercase tracking-tighter",
                          classScores[v.className] >= 190 ? "text-emerald-500" : classScores[v.className] >= 170 ? "text-amber-500" : "text-rose-500"
                        )}>
                          Điểm: {classScores[v.className]}
                        </span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.includes('studentName') && (
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-mono text-[11px]">
                          {v.studentName.charAt(0)}
                        </div>
                        <span className="text-[12px] font-mono font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{v.studentName}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.includes('type') && (
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className={cn(
                          "text-[10px] font-mono px-3 py-1 rounded-lg uppercase tracking-widest border",
                          v.points < 0 ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        )}>
                          {v.type}
                        </span>
                        {v.isCollective && (
                          <span className="text-[9px] font-mono bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg uppercase tracking-tighter border border-amber-500/20">Tập thể</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic leading-relaxed">{v.note}</p>
                    </td>
                  )}
                  {visibleColumns.includes('points') && (
                    <td className="px-6 py-5 text-center">
                      <span className={cn(
                        "text-xl font-mono font-bold tracking-tighter",
                        v.points < 0 ? "text-rose-500" : "text-emerald-500"
                      )}>
                        {v.points > 0 ? '+' : ''}{v.points}
                      </span>
                    </td>
                  )}
                  {visibleColumns.includes('recordedBy') && (
                    <td className="px-6 py-5 whitespace-nowrap text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {v.recordedBy}
                    </td>
                  )}
                  <td className="px-6 py-5 text-right">
                    {(userRole === 'ADMIN' || v.recordedBy === currentUser?.name) && (
                      <button 
                        onClick={() => {
                          if (isQuickDeleteMode) {
                            onDeleteViolations([v.id]);
                          } else if (window.confirm('Xác nhận xoá bản ghi này?')) {
                            onDeleteViolations([v.id]);
                          }
                        }}
                        className={cn(
                          "p-3 transition-all rounded-xl border",
                          isQuickDeleteMode 
                            ? "text-rose-500 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20" 
                            : "text-slate-300 dark:text-slate-600 border-transparent hover:text-rose-500 hover:border-rose-500/20 hover:bg-rose-500/5"
                        )}
                        title={isQuickDeleteMode ? "Xoá ngay lập tức" : "Xoá bản ghi"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredViolations.length === 0 && (
          <div className="py-12 sm:py-20 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Filter className="w-6 h-6 sm:w-8 sm:h-8 text-slate-200 dark:text-slate-700" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] sm:text-xs">Không tìm thấy dữ liệu phù hợp</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ViolationSummaryTable;
