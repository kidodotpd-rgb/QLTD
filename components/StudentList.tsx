
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student, ViolationRecord, Role } from '../types';
import { mockNow, getSchoolWeekInfo, parseDate } from '../src/utils/dateUtils';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ChevronDown, 
  UserPlus, 
  Users,
  List, 
  LayoutGrid, 
  Eye, 
  AlertCircle, 
  RotateCcw, 
  Archive,
  X,
  FileOutput,
  CheckCircle2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StudentListProps {
  students: Student[];
  violations: ViolationRecord[];
  userRole?: Role;
  onViewDetail?: (student: Student) => void;
  onUpdateStudent?: (updatedStudent: Student) => void;
  onAddStudent?: (student: Student) => void;
  onAddStudents?: (students: Student[]) => void;
  onAddViolation?: (student: Student) => void;
  onArchiveStudent?: (studentId: string, archive: boolean, reason?: string) => void;
  defaultDisplayMode?: 'students' | 'classes';
  isImporting?: boolean;
  setIsImporting?: (isImporting: boolean) => void;
}

const StudentList: React.FC<StudentListProps> = ({ 
  students,
  violations, 
  userRole,
  onViewDetail, 
  onUpdateStudent, 
  onAddStudent,
  onAddStudents,
  onAddViolation,
  onArchiveStudent,
  defaultDisplayMode = 'students',
  isImporting: isImportingProp,
  setIsImporting: setIsImportingProp
}) => {
  const [filter, setFilter] = useState('');
  
  // Class Filter State (Multi-select)
  const [classFilter, setClassFilter] = useState<string[]>(['All']);
  const [isClassMenuOpen, setIsClassMenuOpen] = useState(false);
  const classMenuRef = useRef<HTMLDivElement>(null);

  const [genderFilter, setGenderFilter] = useState('All');
  const [rankFilter, setRankFilter] = useState('All');
  
  // View Modes
  const [archiveMode, setArchiveMode] = useState<'active' | 'archived'>('active');
  const [displayMode, setDisplayMode] = useState<'students' | 'classes'>(defaultDisplayMode);

  // Sync displayMode if defaultDisplayMode changes
  useEffect(() => {
    setDisplayMode(defaultDisplayMode);
  }, [defaultDisplayMode]);

  // Add Student State
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  
  // Import Progress State
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState<{ total: number, added: number } | null>(null);

  // Local state for importing if not provided as prop
  const [isImportingLocal, setIsImportingLocal] = useState(false);
  const isImporting = isImportingProp !== undefined ? isImportingProp : isImportingLocal;
  const setIsImporting = setIsImportingProp !== undefined ? setIsImportingProp : setIsImportingLocal;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newStudent, setNewStudent] = useState({
    name: '',
    class: '',
    gender: 'Nam',
    score: 200,
    parentName: ''
  });

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('processing');
    setImportProgress(10);
    setImportErrors([]);
    setImportSummary(null);

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
        const validStudents: Student[] = [];

        data.forEach((row, index) => {
          const rowNum = index + 2; // +1 for header, +1 for 0-index
          const name = row.name || row['Họ tên'];
          const className = row.class || row['Lớp'];
          
          if (!name) errors.push(`Dòng ${rowNum}: Thiếu tên học sinh.`);
          if (!className) errors.push(`Dòng ${rowNum}: Thiếu tên lớp.`);

          if (name && className) {
            validStudents.push({
              id: row.id || `S-${Date.now()}-${index}`,
              name: String(name).trim(),
              class: String(className).trim().toUpperCase(),
              gender: row.gender || row['Giới tính'] || 'Nam',
              score: Number(row.score || row['Điểm']) || 200,
              parentName: row.parentName || row['Phụ huynh'] || '',
              isArchived: false
            });
          }
        });

        setImportProgress(80);

        if (errors.length > 0) {
          setImportErrors(errors);
          setImportStatus('error');
          return;
        }

        // Simulate a small delay for "processing" feel
        await new Promise(resolve => setTimeout(resolve, 800));
        setImportProgress(100);

        if (onAddStudents) {
          onAddStudents(validStudents);
        } else if (onAddStudent) {
          validStudents.forEach(s => onAddStudent(s));
        }

        setImportSummary({ total: data.length, added: validStudents.length });
        setImportStatus('success');
      } catch (error: any) {
        console.error("Import error:", error);
        setImportErrors([error.message || "Có lỗi khi đọc file. Vui lòng kiểm tra định dạng CSV/Excel."]);
        setImportStatus('error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const availableClasses = useMemo(() => Array.from(new Set(students.map(s => s.class))).sort(), [students]);

  // Click outside handler for class dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (classMenuRef.current && !classMenuRef.current.contains(event.target as Node)) {
            setIsClassMenuOpen(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleClassToggle = (cls: string) => {
    if (cls === 'All') {
        setClassFilter(['All']);
        return;
    }
    
    let newFilter = [...classFilter];
    if (newFilter.includes('All')) {
        newFilter = [];
    }
    
    if (newFilter.includes(cls)) {
        newFilter = newFilter.filter(c => c !== cls);
    } else {
        newFilter.push(cls);
    }
    
    if (newFilter.length === 0) {
        setClassFilter(['All']);
    } else {
        setClassFilter(newFilter);
    }
  };

  const handleGradeSelect = (gradePrefix: string) => {
      const gradeClasses = availableClasses.filter(c => c.startsWith(gradePrefix));
      // Toggle logic for grades: if all classes in grade are selected, deselect them. Otherwise select all.
      const allSelected = gradeClasses.every(c => classFilter.includes(c));
      
      let newFilter = classFilter.filter(c => c !== 'All');
      
      if (allSelected) {
          newFilter = newFilter.filter(c => !gradeClasses.includes(c));
      } else {
          // Add missing ones
          const missing = gradeClasses.filter(c => !newFilter.includes(c));
          newFilter = [...newFilter, ...missing];
      }

      if (newFilter.length === 0) setClassFilter(['All']);
      else setClassFilter(newFilter);
  };

  const exportToExcel = () => {
    const data = filteredStudents.map(s => ({
      'Mã số': s.id,
      'Họ và Tên': s.name,
      'Lớp': s.class,
      'Giới tính': s.gender,
      'Điểm thi đua': s.score,
      'Xếp loại': getStudentRank(s.score),
      'Phụ huynh': s.parentName || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách học sinh");
    XLSX.writeFile(wb, `Danh_sach_hoc_sinh_${mockNow.toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
  };

  const getStudentRank = (score: number) => {
    if (score >= 200) return 'Xuất sắc';
    if (score >= 180) return 'Tốt';
    if (score >= 150) return 'Khá';
    return 'Yếu';
  };

  // --- Filter Logic ---
  const filteredStudents = useMemo(() => {
    return students
      .filter(s => {
        const isArchivedMatch = archiveMode === 'archived' ? s.isArchived === true : !s.isArchived;
        const matchesName = s.name.toLowerCase().includes(filter.toLowerCase()) || s.id.toLowerCase().includes(filter.toLowerCase());
        
        // Multi-class filter logic
        const matchesClass = classFilter.includes('All') || classFilter.includes(s.class);
        
        const matchesGender = genderFilter === 'All' || s.gender === genderFilter;
        const matchesRank = rankFilter === 'All' || getStudentRank(s.score) === rankFilter;
        
        return isArchivedMatch && matchesName && matchesClass && matchesGender && matchesRank;
      })
      .sort((a, b) => {
        // Sort by class first
        if (a.class !== b.class) {
          return a.class.localeCompare(b.class, undefined, { numeric: true });
        }
        // Then by name
        return a.name.localeCompare(b.name, 'vi');
      });
  }, [students, archiveMode, filter, classFilter, genderFilter, rankFilter]);

  // --- Class Overview Stats ---
  const classStats = useMemo(() => {
    const stats: Record<string, {
      className: string;
      studentCount: number;
      totalScore: number;
      avgScore: number;
      violationCount: number;
      genderDist: { Nam: number, Nữ: number };
      excellentCount: number;
    }> = {};

    // Only consider active students for class stats
    const activeStudents = students.filter(s => !s.isArchived);

    activeStudents.forEach(s => {
        if (!stats[s.class]) {
            stats[s.class] = {
                className: s.class,
                studentCount: 0,
                totalScore: 0,
                avgScore: 0,
                violationCount: 0,
                genderDist: { Nam: 0, Nữ: 0 },
                excellentCount: 0
            };
        }
        
        const entry = stats[s.class];
        entry.studentCount++;
        entry.totalScore += s.score;
        entry.genderDist[s.gender as 'Nam' | 'Nữ']++;
        if (s.score >= 200) entry.excellentCount++;

        // Count violations for this student
        const studentViolations = violations.filter(v => v.studentId === s.id && v.points < 0);
        entry.violationCount += studentViolations.length;
    });

    // Add collective violations to class stats
    violations.forEach(v => {
        if (v.isCollective && v.points < 0 && stats[v.className]) {
            stats[v.className].violationCount++;
        }
    });

    // Calculate averages
    Object.values(stats).forEach(item => {
        item.avgScore = item.studentCount > 0 ? item.totalScore / item.studentCount : 0;
    });

    return Object.values(stats).sort((a, b) => b.avgScore - a.avgScore);
  }, [students, violations]);

  const filteredClassStats = useMemo(() => {
      if (classFilter.includes('All')) return classStats;
      return classStats.filter(c => classFilter.includes(c.className));
  }, [classStats, classFilter]);

  const handleAddSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (onAddStudent) {
          onAddStudent({
              id: `S${newStudent.class}-${Date.now().toString().slice(-4)}`,
              ...newStudent,
              score: 200
          } as Student);
          setIsAddingStudent(false);
          setNewStudent({ name: '', class: '', gender: 'Nam', score: 200, parentName: '' });
      }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 h-full flex flex-col"
    >
      {/* Action Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 glass-card p-3 sm:p-4 rounded-2xl flex-shrink-0">
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              placeholder="Tìm tên, mã số..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          {/* Custom Multi-select Class Filter */}
          <div className="relative w-full sm:w-auto" ref={classMenuRef}>
            <button
                onClick={() => setIsClassMenuOpen(!isClassMenuOpen)}
                className={cn(
                    "w-full sm:w-48 px-4 py-2 sm:py-2.5 border rounded-xl text-sm font-bold flex justify-between items-center transition-all",
                    classFilter.includes('All') 
                    ? "bg-slate-50 border-slate-200 text-slate-600" 
                    : "bg-blue-50 border-blue-200 text-blue-700"
                )}
            >
                <span className="truncate">
                    {classFilter.includes('All') 
                        ? 'Tất cả các lớp' 
                        : `Đã chọn ${classFilter.length} lớp`}
                </span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", isClassMenuOpen ? "rotate-180" : "")} />
            </button>

            {isClassMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-full sm:w-72 glass-card rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 p-3">
                    <div className="flex gap-2 mb-3 pb-3 border-b border-slate-100 overflow-x-auto custom-scrollbar">
                        <button 
                            onClick={() => setClassFilter(['All'])}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${classFilter.includes('All') ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Tất cả
                        </button>
                        {['10', '11', '12'].map(grade => (
                            <button
                                key={grade}
                                onClick={() => handleGradeSelect(grade)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                                    availableClasses.filter(c => c.startsWith(grade)).every(c => classFilter.includes(c))
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Khối {grade}
                            </button>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {availableClasses.map(cls => {
                            const isSelected = classFilter.includes(cls);
                            return (
                                <button
                                    key={cls}
                                    onClick={() => handleClassToggle(cls)}
                                    className={`px-2 py-2 rounded-lg text-xs font-bold transition-colors ${
                                        isSelected
                                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                        : 'bg-white text-slate-600 border border-slate-100 hover:border-blue-300'
                                    }`}
                                >
                                    {cls}
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center">
                         <span className="text-[10px] font-bold text-slate-400 uppercase">{classFilter.length} lớp được chọn</span>
                         <button 
                            onClick={() => setIsClassMenuOpen(false)}
                            className="text-xs font-bold text-blue-600 hover:underline"
                         >
                            Đóng
                         </button>
                    </div>
                </div>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <select 
              className="flex-1 sm:flex-none px-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-theme"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
            >
              <option value="All">Giới tính</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>

            <select 
              className="flex-1 sm:flex-none px-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-theme"
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value)}
            >
              <option value="All">Xếp loại</option>
              <option value="Xuất sắc">Xuất sắc</option>
              <option value="Tốt">Tốt</option>
              <option value="Khá">Khá</option>
              <option value="Yếu">Yếu</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full xl:w-auto justify-between sm:justify-end">
          {userRole === 'ADMIN' && (
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <button 
                onClick={() => setIsImporting(true)}
                className="flex-1 sm:flex-none bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold hover:bg-emerald-100 transition-theme flex items-center justify-center gap-2 neo-button"
              >
                <FileOutput className="w-4 h-4" />
                <span className="hidden sm:inline">Nhập CSV</span>
              </button>
              <button
                  onClick={() => setIsAddingStudent(true)}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-theme flex items-center justify-center gap-2 neo-button"
              >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Thêm mới</span>
              </button>
            </div>
          )}
          
          <div className="flex glass-card p-1 rounded-xl">
             <button
                onClick={() => setDisplayMode('students')}
                className={cn(
                  "px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs transition-all flex items-center gap-2 neo-button",
                  displayMode === 'students' ? "bg-white text-blue-600 shadow-sm font-black uppercase tracking-wider" : "text-slate-400 hover:text-slate-600 font-bold"
                )}
             >
                <List className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Học sinh</span>
             </button>
             <button
                onClick={() => setDisplayMode('classes')}
                className={cn(
                  "px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs transition-all flex items-center gap-2 neo-button",
                  displayMode === 'classes' ? "bg-white text-blue-600 shadow-sm font-black uppercase tracking-wider" : "text-slate-400 hover:text-slate-600 font-bold"
                )}
             >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Lớp học</span>
             </button>
          </div>

          <button
            onClick={exportToExcel}
            className="p-2 sm:p-2.5 glass-card rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm neo-button"
            title="Xuất Excel"
          >
            <FileOutput className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View Mode Switcher */}
      {displayMode === 'students' ? (
        <>
            {/* Archive Toggle */}
            {(userRole === 'ADMIN' || userRole === 'TEACHER') && (
                <div className="flex gap-4 border-b border-slate-200">
                    <button
                        onClick={() => setArchiveMode('active')}
                        className={`pb-2 text-sm font-bold border-b-2 transition-colors ${archiveMode === 'active' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Đang hoạt động ({students.filter(s => !s.isArchived).length})
                    </button>
                    <button
                        onClick={() => setArchiveMode('archived')}
                        className={`pb-2 text-sm font-bold border-b-2 transition-colors ${archiveMode === 'archived' ? 'border-slate-500 text-slate-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Lưu trữ / Đã thôi học ({students.filter(s => s.isArchived).length})
                    </button>
                </div>
            )}

            {/* Student Table / Card View */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100">Mã số</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 italic font-serif">Học sinh</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100">Giới tính</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100">Lớp</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-100 font-mono">Điểm thi đua</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-100">Xếp loại</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length > 0 ? (
                        filteredStudents.map((student, index) => {
                            const rank = getStudentRank(student.score);
                            const rankColor = rank === 'Xuất sắc' ? 'text-emerald-500 bg-emerald-50' 
                                            : rank === 'Tốt' ? 'text-blue-500 bg-blue-50' 
                                            : rank === 'Khá' ? 'text-amber-500 bg-amber-50' 
                                            : 'text-rose-500 bg-rose-50';

                            return (
                                <tr 
                                    key={student.id} 
                                    className={cn(
                                        "hover:bg-slate-900 hover:text-white transition-all duration-200 group cursor-pointer",
                                        index % 2 !== 0 && "bg-slate-50/50"
                                    )}
                                >
                                <td className="p-4 text-xs font-bold text-slate-500 group-hover:text-slate-400 border-r border-slate-50 group-hover:border-slate-800 font-mono">{student.id}</td>
                                <td className="p-4 border-r border-slate-50 group-hover:border-slate-800">
                                    <div className="flex items-center gap-3">
                                    <img 
                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random&color=fff&size=128`}
                                        alt={student.name}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm group-hover:border-slate-700"
                                    />
                                    <div>
                                        <p className="font-bold text-sm">{student.name}</p>
                                        <p className="text-[10px] font-bold uppercase opacity-50">{student.parentName || 'Chưa cập nhật PH'}</p>
                                    </div>
                                    </div>
                                </td>
                                <td className="p-4 text-xs font-medium border-r border-slate-50 group-hover:border-slate-800">{student.gender}</td>
                                <td className="p-4 text-xs font-bold border-r border-slate-50 group-hover:border-slate-800">{student.class}</td>
                                <td className="p-4 text-center border-r border-slate-50 group-hover:border-slate-800">
                                    <span className={cn(
                                        "text-sm font-black font-mono",
                                        student.score >= 200 ? 'text-emerald-600 group-hover:text-emerald-400' : student.score < 150 ? 'text-rose-600 group-hover:text-rose-400' : 'text-slate-700 group-hover:text-white'
                                    )}>
                                    {student.score}
                                    </span>
                                </td>
                                <td className="p-4 text-center border-r border-slate-50 group-hover:border-slate-800">
                                    <span className={cn(
                                        "px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide",
                                        rankColor,
                                        "group-hover:bg-white/10 group-hover:text-white"
                                    )}>
                                    {rank}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* Action Buttons */}
                                    {!student.isArchived && (
                                        <>
                                            <button 
                                                onClick={() => onViewDetail && onViewDetail(student)}
                                                className="px-3 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 group-hover:bg-blue-500 group-hover:text-white flex items-center gap-2 text-xs font-bold transition-colors whitespace-nowrap"
                                                title="Xem chi tiết"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Xem
                                            </button>
                                            <button 
                                                onClick={() => onAddViolation && onAddViolation(student)}
                                                className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center"
                                                title="Ghi nhận vi phạm"
                                            >
                                                <AlertCircle className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    
                                    {/* Archive Actions */}
                                    {(userRole === 'ADMIN' || userRole === 'TEACHER') && (
                                        student.isArchived ? (
                                            <button 
                                                onClick={() => onArchiveStudent && onArchiveStudent(student.id, false)}
                                                className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                                                title="Khôi phục học sinh"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={() => {
                                                        const reason = window.prompt('Nhập lý do lưu trữ (tùy chọn):', 'Chuyển lớp / Chuyển trường');
                                                        if (reason !== null) {
                                                            onArchiveStudent && onArchiveStudent(student.id, true, `Lưu trữ: ${reason}`);
                                                        }
                                                    }}
                                                    className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center transition-colors"
                                                    title="Lưu trữ hồ sơ"
                                                >
                                                    <Archive className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm(`Xác nhận học sinh ${student.name} đã thôi học?`)) {
                                                            onArchiveStudent && onArchiveStudent(student.id, true, 'Thôi học');
                                                        }
                                                    }}
                                                    className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors"
                                                    title="Đánh dấu thôi học"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )
                                    )}
                                    </div>
                                </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 text-sm font-medium italic">
                            Không tìm thấy học sinh nào phù hợp với bộ lọc.
                        </td>
                        </tr>
                    )}
                    </tbody>
                </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50">
                    {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => {
                            const rank = getStudentRank(student.score);
                            const rankColor = rank === 'Xuất sắc' ? 'text-emerald-500 bg-emerald-50' 
                                            : rank === 'Tốt' ? 'text-blue-500 bg-blue-50' 
                                            : rank === 'Khá' ? 'text-amber-500 bg-amber-50' 
                                            : 'text-rose-500 bg-rose-50';

                            return (
                                <div 
                                    key={student.id} 
                                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4"
                                    onClick={() => onViewDetail && onViewDetail(student)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img 
                                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random&color=fff&size=128`}
                                                alt={student.name}
                                                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                                referrerPolicy="no-referrer"
                                            />
                                            <div>
                                                <p className="font-black text-sm text-slate-800">{student.name}</p>
                                                <p className="text-[10px] font-mono text-slate-400 uppercase">{student.id} | Lớp {student.class}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn(
                                                "text-lg font-black font-mono leading-none",
                                                student.score >= 200 ? 'text-emerald-600' : student.score < 150 ? 'text-rose-600' : 'text-slate-700'
                                            )}>
                                                {student.score}
                                            </p>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide inline-block mt-1",
                                                rankColor
                                            )}>
                                                {rank}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                                        {!student.isArchived ? (
                                            <>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onViewDetail && onViewDetail(student); }}
                                                    className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                                >
                                                    <Eye className="w-3.5 h-3.5" /> Chi tiết
                                                </button>
                                                {(userRole === 'ADMIN' || userRole === 'TEACHER') && (
                                                    <div className="flex gap-1 flex-1">
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation();
                                                                const reason = window.prompt('Lý do lưu trữ:', 'Chuyển trường');
                                                                if (reason !== null) onArchiveStudent && onArchiveStudent(student.id, true, `Lưu trữ: ${reason}`);
                                                            }}
                                                            className="flex-1 py-2 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center"
                                                            title="Lưu trữ"
                                                        >
                                                            <Archive className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation();
                                                                if (window.confirm('Xác nhận thôi học?')) onArchiveStudent && onArchiveStudent(student.id, true, 'Thôi học');
                                                            }}
                                                            className="flex-1 py-2 bg-rose-50 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center"
                                                            title="Thôi học"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onAddViolation && onAddViolation(student); }}
                                                    className="flex-1 py-2 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                                >
                                                    <AlertCircle className="w-3.5 h-3.5" /> Vi phạm
                                                </button>
                                            </>
                                        ) : (
                                            (userRole === 'ADMIN' || userRole === 'TEACHER') && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onArchiveStudent && onArchiveStudent(student.id, false); }}
                                                    className="flex-1 py-2 bg-emerald-50 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" /> Khôi phục
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-20 text-center">
                            <div className="flex flex-col items-center gap-4 opacity-40">
                                <Search className="w-12 h-12" />
                                <p className="text-sm font-bold uppercase tracking-widest">Không tìm thấy học sinh</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs font-bold text-slate-500 flex justify-between items-center">
                    <span>Hiển thị {filteredStudents.length} học sinh</span>
                    <span>Tổng số: {students.length}</span>
                </div>
            </div>
        </>
      ) : (
        /* Class Overview Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto custom-scrollbar p-1 pb-10">
            {filteredClassStats.map(stat => (
                <div key={stat.className} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden">
                    {/* Background Accent */}
                    <div className={cn(
                        "absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 blur-3xl opacity-20 transition-opacity group-hover:opacity-40",
                        stat.avgScore >= 200 ? "bg-emerald-400" : stat.avgScore >= 180 ? "bg-blue-400" : "bg-amber-400"
                    )} />

                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Lớp {stat.className}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{stat.studentCount} Học sinh</span>
                            </div>
                        </div>
                        <div className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-black shadow-sm border border-white",
                            stat.avgScore >= 200 ? 'bg-emerald-50 text-emerald-600' :
                            stat.avgScore >= 180 ? 'bg-blue-50 text-blue-600' :
                            'bg-amber-50 text-amber-600'
                        )}>
                            {stat.avgScore.toFixed(1)}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Vi phạm</p>
                            <p className="text-lg font-black text-rose-500">{stat.violationCount}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Xuất sắc</p>
                            <p className="text-lg font-black text-emerald-500">{stat.excellentCount}</p>
                        </div>
                    </div>

                    <div className="space-y-2 relative z-10">
                        <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Nam: {stat.genderDist.Nam}</span>
                            <span>Nữ: {stat.genderDist.Nữ}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex shadow-inner">
                             <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${(stat.genderDist.Nam / stat.studentCount) * 100}%` }}></div>
                             <div className="bg-pink-400 h-full transition-all duration-1000" style={{ width: `${(stat.genderDist.Nữ / stat.studentCount) * 100}%` }}></div>
                        </div>
                    </div>

                    <button 
                        onClick={() => {
                            setClassFilter([stat.className]);
                            setDisplayMode('students');
                        }}
                        className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg shadow-slate-200"
                    >
                        Xem danh sách lớp
                    </button>
                </div>
            ))}
        </div>
      )}

      {/* Import Modal */}
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
              className="relative bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-700"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600">
                      <FileOutput className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white leading-none">Nhập danh sách</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Hỗ trợ CSV, XLSX, XLS</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsImporting(false);
                      setImportStatus('idle');
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {importStatus === 'idle' && (
                  <div className="space-y-8">
                    <p className="text-sm text-slate-500 leading-relaxed">Tải lên file chứa danh sách học sinh. Hệ thống sẽ tự động nhận diện các cột: <span className="font-bold text-slate-700 dark:text-slate-300">Họ tên, Lớp, Giới tính, Phụ huynh</span>.</p>
                    
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] p-12 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group text-center"
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
                          const template = "id,name,class,gender,score,parentName\nS001,Nguyễn Văn A,10A1,Nam,200,Nguyễn Văn B";
                          const blob = new Blob([template], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.setAttribute('hidden', '');
                          a.setAttribute('href', url);
                          a.setAttribute('download', 'template_hoc_sinh.csv');
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
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
                      <p className="text-sm text-slate-500 mt-2">Đã nhập thành công <span className="font-black text-emerald-600">{importSummary?.added}</span> học sinh vào hệ thống.</p>
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
                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
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

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".csv, .xlsx, .xls"
        onChange={handleImportCSV}
      />

      {/* Add Student Modal */}
      {isAddingStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button 
              onClick={() => setIsAddingStudent(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                <UserPlus className="w-6 h-6 text-blue-500" />
                Thêm Học sinh mới
            </h3>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Họ và Tên</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập họ tên đầy đủ"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                  />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Lớp</label>
                    <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="VD: 10A1"
                        value={newStudent.class}
                        onChange={(e) => setNewStudent({...newStudent, class: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Giới tính</label>
                    <select 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={newStudent.gender}
                        onChange={(e) => setNewStudent({...newStudent, gender: e.target.value})}
                    >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                    </select>
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tên Phụ huynh</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tên phụ huynh"
                    value={newStudent.parentName}
                    onChange={(e) => setNewStudent({...newStudent, parentName: e.target.value})}
                  />
               </div>

               <div className="flex gap-3 pt-4 mt-2">
                  <button 
                    type="button"
                    onClick={() => setIsAddingStudent(false)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors"
                  >
                    Lưu học sinh
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default StudentList;
