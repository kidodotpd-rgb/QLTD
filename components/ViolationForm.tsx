
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, ViolationType, ViolationRecord, Role } from '../types';
import { VIOLATION_GROUPED } from '../constants';
import { mockNow, getSchoolWeekInfo, parseDate } from '../src/utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  UserPlus, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  Trash2, 
  ChevronRight,
  ShieldCheck,
  Zap,
  Plus,
  X,
  Lock,
  Filter,
  Clock,
  Bell,
  FileText,
  Sparkles,
  RefreshCcw,
  BrainCircuit
} from 'lucide-react';
import { parseSmartViolationEntry } from '../services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ViolationFormProps {
  students: Student[];
  violations: ViolationRecord[];
  onAddRecord: (record: ViolationRecord) => void;
  userRole: Role;
  initialStudentId?: string;
  onAddNotification?: (notif: { studentName: string; parentName: string; type: string }) => void;
  violationCategories: Record<string, number>;
  autoPointCriteria: { label: string; points: number; description: string }[];
}

const TASKFORCE_COMMON: ViolationType[] = [
  'Đi học trễ', 
  'Không đồng phục', 
  'Tác phong không nghiêm túc', 
  'Sử dụng điện thoại', 
  'Ăn quà vặt',
  'Vắng không phép'
];

const ViolationForm: React.FC<ViolationFormProps> = ({ 
  students, 
  violations, 
  onAddRecord, 
  userRole, 
  initialStudentId, 
  onAddNotification,
  violationCategories,
  autoPointCriteria
}) => {
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(initialStudentId ? [initialStudentId] : []);
  const [sendNotification, setSendNotification] = useState(true);
  
  // RBAC: GVCN (TEACHER) and PARENT are not allowed to access TNXK tools
  if (userRole === 'TEACHER' || userRole === 'PARENT') {
    return (
      <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-800 font-display">Truy cập bị từ chối</h3>
        <p className="text-sm text-slate-500 text-center mt-2 max-w-xs">
          Bạn không có quyền truy cập vào công cụ ghi nhận vi phạm TNXK. Vui lòng sử dụng Sổ Đầu Bài để ghi nhận nề nếp lớp.
        </p>
      </div>
    );
  }

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [selectedTypes, setSelectedTypes] = useState<ViolationType[]>([]);
  const [isCollective, setIsCollective] = useState<boolean>(false);
  const [customPoints, setCustomPoints] = useState<number>(0);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentRecords, setRecentRecords] = useState<ViolationRecord[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [smartEntryText, setSmartEntryText] = useState('');
  const [isParsingSmartEntry, setIsParsingSmartEntry] = useState(false);

  // Calculate current class score for the selected class
  const currentClassScore = useMemo(() => {
    if (!selectedClass) return 200;
    const classVios = violations.filter(v => v.className === selectedClass);
    return 200 + classVios.reduce((acc, v) => acc + v.points, 0);
  }, [selectedClass, violations]);

  const potentialImpact = useMemo(() => {
    const pointsPerStudent = selectedTypes.reduce((acc, t) => acc + (t === 'Điểm phát sinh' ? customPoints : violationCategories[t]), 0);
    if (isCollective) return pointsPerStudent;
    return pointsPerStudent * selectedStudentIds.length;
  }, [selectedTypes, customPoints, isCollective, selectedStudentIds, violationCategories]);

  // Auto-save logic
  useEffect(() => {
    const savedData = localStorage.getItem('violation_form_draft');
    if (savedData) {
      try {
        const draft = JSON.parse(savedData);
        if (!initialStudentId) { // Only load if we're not targeting a specific student from props
          setSelectedStudentIds(draft.selectedStudentIds || []);
          setSelectedClass(draft.selectedClass || '');
        }
        setSelectedTypes(draft.selectedTypes || []);
        setIsCollective(draft.isCollective || false);
        setCustomPoints(draft.customPoints || 0);
        setNote(draft.note || '');
        setSelectedCategory(draft.selectedCategory || 'Tất cả');
      } catch (e) {
        console.error('Failed to load draft', e);
      }
    }
  }, [initialStudentId]);

  useEffect(() => {
    const draft = {
      selectedStudentIds,
      selectedClass,
      selectedTypes,
      isCollective,
      customPoints,
      note,
      selectedCategory
    };
    localStorage.setItem('violation_form_draft', JSON.stringify(draft));
  }, [selectedStudentIds, selectedClass, selectedTypes, isCollective, customPoints, note, selectedCategory]);

  const clearDraft = () => {
    localStorage.removeItem('violation_form_draft');
  };

  // Lấy danh sách các lớp duy nhất và sắp xếp
  const classes = useMemo(() => {
    const uniqueClasses = new Set(students.map(s => s.class));
    return Array.from(uniqueClasses).sort();
  }, [students]);

  // Lọc danh sách học sinh dựa trên lớp và search term
  const filteredStudents = useMemo(() => {
    let result = students;
    if (selectedClass) {
      result = result.filter(s => s.class === selectedClass);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(lowerSearch) || 
        s.id.toLowerCase().includes(lowerSearch)
      );
    }
    return result;
  }, [students, selectedClass, searchTerm]);

  // Tự động set lớp nếu có initialStudentId
  useEffect(() => {
    if (initialStudentId) {
      const student = students.find(s => s.id === initialStudentId);
      if (student) {
        setSelectedClass(student.class);
        setSelectedStudentIds([initialStudentId]);
      }
    }
  }, [initialStudentId, students]);

  const handleTypeToggle = (type: ViolationType) => {
    if (type === 'Điểm phát sinh') {
      setSelectedTypes(['Điểm phát sinh']);
      setCustomPoints(0);
      return;
    }

    if (selectedTypes.includes('Điểm phát sinh')) {
      setSelectedTypes([type]);
      return;
    }

    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        const newState = prev.filter(t => t !== type);
        return newState;
      } else {
        return [...prev, type];
      }
    });
  };

  const handleStudentToggle = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleSelectAllInClass = () => {
    if (!selectedClass) return;
    const classIds = filteredStudents.map(s => s.id);
    const allSelected = classIds.every(id => selectedStudentIds.includes(id));
    
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !classIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...classIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map(s => s.id);
    const allSelected = filteredIds.every(id => selectedStudentIds.includes(id));
    
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTypes.length === 0) return;
    if (!isCollective && selectedStudentIds.length === 0) return;
    if (isCollective && !selectedClass) return;

    // Validation for custom points
    if (selectedTypes.includes('Điểm phát sinh')) {
      if (customPoints === 0) {
        alert('Vui lòng nhập số điểm cho mục "Khác..."');
        return;
      }
      if (!note.trim()) {
        alert('Vui lòng nhập ghi chú chi tiết khi sử dụng mục "Khác..."');
        return;
      }
    }

    setShowReview(true);
  };

  const handleSmartEntry = async () => {
    if (!smartEntryText.trim()) return;
    setIsParsingSmartEntry(true);
    try {
      const result = await parseSmartViolationEntry(smartEntryText, violationCategories);
      if (result) {
        if (result.className) setSelectedClass(result.className);
        if (result.studentName) {
          const student = students.find(s => s.name.toLowerCase().includes(result.studentName.toLowerCase()));
          if (student) {
            setSelectedStudentIds([student.id]);
            setSelectedClass(student.class);
          }
        }
        if (result.type && Object.keys(violationCategories).includes(result.type)) {
          setSelectedTypes([result.type as ViolationType]);
        }
        if (result.note) setNote(result.note);
        setSmartEntryText('');
      }
    } catch (error) {
      console.error("Smart Entry failed:", error);
      alert("Không thể phân tích nội dung. Vui lòng nhập thủ công.");
    } finally {
      setIsParsingSmartEntry(false);
    }
  };

  const handleConfirmSubmit = () => {
    setIsSubmitting(true);
    setShowReview(false);
    
    // Duplicate check (same student, same type, recently added)
    const isDuplicate = !isCollective && selectedStudentIds.some(sid => 
      recentRecords.some(r => r.studentId === sid && selectedTypes.includes(r.type as any))
    );

    if (isDuplicate && !window.confirm('CẢNH BÁO: Một hoặc nhiều học sinh đã được ghi nhận lỗi tương tự trong phiên này. Bạn có chắc chắn muốn tiếp tục?')) {
      setIsSubmitting(false);
      return;
    }

    const newAddedRecords: ViolationRecord[] = [];
    const dateStr = mockNow.toLocaleDateString('vi-VN');
    const recorderName = userRole === 'TASKFORCE' ? 'Đội TNXK' : 'Giáo viên/Admin';

    if (isCollective) {
      // Record once for the whole class
      selectedTypes.forEach((type, index) => {
        const points = type === 'Điểm phát sinh' ? customPoints : violationCategories[type];
        const newRecord: ViolationRecord = {
          id: `V-CLASS-${Date.now()}-${selectedClass}-${index}`,
          studentId: `CLASS-${selectedClass}`,
          studentName: `TẬP THỂ LỚP ${selectedClass}`,
          className: selectedClass,
          type,
          points: points,
          date: dateStr,
          note,
          recordedBy: recorderName,
          recordedRole: userRole,
          isCollective: true
        };
        onAddRecord(newRecord);
        newAddedRecords.push(newRecord);
      });
    } else {
      // Record for each selected student
      selectedStudentIds.forEach(sid => {
        const student = students.find(s => s.id === sid);
        if (!student) return;

        selectedTypes.forEach((type, index) => {
          const points = type === 'Điểm phát sinh' ? customPoints : violationCategories[type];
          
          const newRecord: ViolationRecord = {
            id: `V-${Date.now()}-${sid}-${index}`,
            studentId: student.id,
            studentName: student.name,
            className: student.class,
            type,
            points: points,
            date: dateStr,
            note,
            recordedBy: recorderName, 
            recordedRole: userRole,
            isCollective: false
          };
          
          onAddRecord(newRecord);
          newAddedRecords.push(newRecord);

          // Send notification if enabled
          if (sendNotification && onAddNotification) {
            onAddNotification({
              studentName: student.name,
              parentName: student.parentName || 'Phụ huynh',
              type: type
            });
          }
        });
      });
    }

    setRecentRecords(prev => [...newAddedRecords, ...prev].slice(0, 10));

    // Clear draft after successful submission
    clearDraft();

    setTimeout(() => {
      if (!isCollective) setSelectedStudentIds([]); 
      setNote('');
      setCustomPoints(0);
      setSelectedTypes([]);
      setIsSubmitting(false);
    }, 600);
  };

  const categories = ['Tất cả', ...Object.keys(VIOLATION_GROUPED)];

  const displayedViolations = useMemo(() => {
    if (selectedCategory === 'Tất cả') {
      return (Object.keys(violationCategories) as ViolationType[]).filter(v => v !== 'Điểm phát sinh');
    }
    return VIOLATION_GROUPED[selectedCategory] || [];
  }, [selectedCategory]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-6xl mx-auto space-y-6 font-sans"
    >
      {/* Draft Indicator - Technical Status Bar */}
      <AnimatePresence>
        {(selectedStudentIds.length > 0 || selectedTypes.length > 0 || note) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex items-center justify-between px-6 py-3 bg-[#151619] border border-white/10 rounded-xl shadow-2xl"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest">Trạng thái hệ thống: Đang ghi bộ nhớ đệm</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Bản ghi: {selectedStudentIds.length} đối tượng | {selectedTypes.length} loại</span>
            </div>
            <button 
              onClick={() => {
                if (window.confirm('Xóa bản nháp hiện tại?')) {
                  setSelectedStudentIds([]);
                  setSelectedTypes([]);
                  setNote('');
                  setCustomPoints(0);
                  clearDraft();
                }
              }}
              className="text-[10px] font-mono text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-3 h-3" />
              Xóa bộ nhớ đệm
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Smart AI Entry Section */}
        <div className="lg:col-span-3">
          <div className="bg-[#151619] rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-indigo-500/10 transition-all duration-1000" />
            
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex items-center gap-4 shrink-0">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">Nhập liệu Thông minh AI</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ghi nhận nhanh bằng ngôn ngữ tự nhiên</p>
                </div>
              </div>
              
              <div className="flex-1 w-full relative">
                <input 
                  type="text" 
                  value={smartEntryText}
                  onChange={(e) => setSmartEntryText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSmartEntry()}
                  placeholder="Ví dụ: Nguyễn Văn A lớp 10A1 đi học trễ sáng nay..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
                <button 
                  onClick={handleSmartEntry}
                  disabled={isParsingSmartEntry || !smartEntryText.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isParsingSmartEntry ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {isParsingSmartEntry ? 'Đang xử lý...' : 'Phân tích'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: Student Selection - Technical Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#151619] rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden flex flex-col h-[500px] lg:h-[750px] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] relative group">
            {/* Hardware-like radial track decoration */}
            <div className="absolute top-0 right-0 w-32 lg:w-48 h-32 lg:h-48 border border-dashed border-white/5 rounded-full -mr-16 lg:-mr-24 -mt-16 lg:-mt-24 pointer-events-none group-hover:border-indigo-500/10 transition-colors duration-1000" />
            
            <div className="p-6 lg:p-8 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-indigo-600/10 border border-indigo-500/20 rounded-xl lg:rounded-2xl flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.1)]">
                    <Users className="w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                  <div>
                    <h3 className="text-[10px] lg:text-[12px] font-mono text-white uppercase tracking-[0.2em] lg:tracking-[0.3em] font-bold">Đối tượng_Mục tiêu</h3>
                    <p className="text-[8px] lg:text-[9px] font-mono text-slate-500 uppercase tracking-[0.1em] lg:tracking-[0.2em]">Chọn Đối tượng</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-indigo-500 rounded-full animate-pulse" />
                    <span className="text-[14px] lg:text-[16px] font-mono text-indigo-400 font-black tracking-tighter">
                      {selectedStudentIds.length.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-[7px] lg:text-[8px] font-mono text-slate-600 uppercase tracking-widest">Trạng thái_Hoạt động</span>
                </div>
              </div>
              
              <div className="space-y-3 lg:space-y-4">
                <div className="relative group/field">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] lg:text-[10px] font-mono text-slate-500 uppercase tracking-widest pointer-events-none group-focus-within/field:text-indigo-400 transition-colors">Mã_Đơn vị</div>
                  <select
                    className="w-full pl-20 pr-4 py-3 lg:py-4 bg-black/40 border border-white/10 rounded-xl lg:rounded-2xl text-[10px] lg:text-[11px] font-mono text-slate-300 focus:border-indigo-500/50 outline-none transition-all appearance-none cursor-pointer hover:bg-black/60"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="">Tất cả_Lớp</option>
                    {classes.map(cls => (
                      <option key={cls} value={cls}>Lớp_{cls}</option>
                    ))}
                  </select>
                </div>
                
                <div className="relative group/field">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 lg:w-4 lg:h-4 text-slate-500 group-focus-within/field:text-indigo-400 transition-colors" />
                  <input 
                    type="text"
                    placeholder="TÌM_TÊN_HỌC SINH..."
                    className="w-full pl-10 lg:pl-12 pr-4 py-3 lg:py-4 bg-black/40 border border-white/10 rounded-xl lg:rounded-2xl text-[10px] lg:text-[11px] font-mono text-slate-300 placeholder:text-slate-700 focus:border-indigo-500/50 outline-none transition-all hover:bg-black/60"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3 custom-scrollbar bg-black/40">
              {isCollective ? (
                <div className="h-full flex flex-col items-center justify-center p-6 lg:p-8 text-center space-y-6 lg:space-y-8">
                  <div className="relative">
                    <div className="w-24 h-24 lg:w-32 lg:h-32 border border-dashed border-purple-500/20 rounded-full flex items-center justify-center animate-[spin_15s_linear_infinite]">
                      <div className="w-16 h-16 lg:w-24 lg:h-24 border border-dashed border-purple-500/40 rounded-full" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Users className="w-8 h-8 lg:w-12 lg:h-12 text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                    </div>
                    <div className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2 w-8 h-8 lg:w-10 lg:h-10 bg-purple-600 text-white rounded-lg lg:rounded-xl flex items-center justify-center text-[9px] lg:text-[11px] font-mono font-black shadow-2xl border border-purple-400/50">ALL</div>
                  </div>
                  <div className="space-y-2 lg:space-y-3">
                    <h4 className="text-[10px] lg:text-[12px] font-mono text-purple-400 uppercase tracking-[0.3em] lg:tracking-[0.4em] font-bold">Chế độ_Tập thể</h4>
                    <p className="text-[9px] lg:text-[10px] font-mono text-slate-500 leading-relaxed max-w-[180px] lg:max-w-[200px] mx-auto uppercase tracking-wider">
                      {selectedClass ? (
                        <> Mục tiêu: <span className="text-purple-300">Lớp_{selectedClass}</span>. Điểm sẽ được trừ vào chỉ số thi đua của đơn vị.</>
                      ) : (
                        <> Chọn một lớp để khởi tạo ghi nhận tập thể.</>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {selectedClass && (
                      <button 
                        type="button"
                        onClick={handleSelectAllInClass}
                        className={cn(
                          "p-3 lg:p-4 text-[9px] lg:text-[10px] font-mono uppercase tracking-widest rounded-xl lg:rounded-2xl transition-all flex items-center justify-center gap-2 border border-dashed",
                          filteredStudents.every(s => selectedStudentIds.includes(s.id))
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20"
                        )}
                      >
                        {filteredStudents.every(s => selectedStudentIds.includes(s.id)) ? 'Bỏ chọn_Lớp' : `Chọn cả_Lớp_${selectedClass}`}
                      </button>
                    )}
                    {searchTerm && (
                      <button 
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className={cn(
                          "p-3 lg:p-4 text-[9px] lg:text-[10px] font-mono uppercase tracking-widest rounded-xl lg:rounded-2xl transition-all flex items-center justify-center gap-2 border border-dashed",
                          filteredStudents.every(s => selectedStudentIds.includes(s.id))
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20"
                        )}
                      >
                        {filteredStudents.every(s => selectedStudentIds.includes(s.id)) ? 'Bỏ chọn_Truy vấn' : 'Chọn tất cả_Kết quả'}
                      </button>
                    )}
                  </div>
                  
                  {filteredStudents.length > 0 ? (
                    <div className="space-y-2">
                      {filteredStudents.map(student => (
                        <button
                          key={student.id}
                          onClick={() => handleStudentToggle(student.id)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 lg:p-4 rounded-xl lg:rounded-2xl transition-all border group relative overflow-hidden",
                            selectedStudentIds.includes(student.id)
                              ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-400 shadow-[inset_0_0_20px_rgba(79,70,229,0.1)]"
                              : "bg-white/[0.02] border-transparent hover:border-white/10 hover:bg-white/5 text-slate-500"
                          )}
                        >
                          <div className="flex items-center gap-3 lg:gap-5 relative z-10">
                            <div className={cn(
                              "w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl flex items-center justify-center text-[10px] lg:text-[11px] font-mono transition-all border",
                              selectedStudentIds.includes(student.id) 
                                ? "bg-indigo-600 text-white border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.5)]" 
                                : "bg-black/60 text-slate-600 border-white/5 group-hover:border-white/10"
                            )}>
                              {student.id.split('-').pop()}
                            </div>
                            <div className="text-left">
                              <p className="text-[11px] lg:text-[12px] font-mono font-black leading-none mb-1 lg:mb-2 uppercase tracking-tight">{student.name}</p>
                              <p className="text-[8px] lg:text-[9px] font-mono text-slate-600 uppercase tracking-[0.1em] lg:tracking-[0.2em]">Mã_Học sinh: {student.id}</p>
                            </div>
                          </div>
                          {selectedStudentIds.includes(student.id) && (
                            <div className="w-5 h-5 lg:w-6 lg:h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-[0_0_12px_rgba(79,70,229,0.6)] relative z-10">
                              <CheckCircle2 className="w-3 h-3 lg:w-4 lg:h-4" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-10 lg:py-20 text-center opacity-40">
                      <div className="w-16 h-16 lg:w-20 lg:h-20 border border-dashed border-white/10 rounded-full flex items-center justify-center text-slate-700 mb-4 lg:mb-6">
                        <Search className="w-8 h-8 lg:w-10 lg:h-10" />
                      </div>
                      <p className="text-[10px] lg:text-[11px] font-mono text-slate-600 uppercase tracking-[0.2em] lg:tracking-[0.3em]">Không_Tìm thấy_Học sinh</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Violation Details & Form - Main Console */}
        <div className="lg:col-span-2 space-y-6">
          <div className={cn(
            "rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-10 relative overflow-hidden shadow-2xl transition-all duration-700 border",
            userRole === 'TASKFORCE' 
              ? "bg-[#151619] text-white border-white/10" 
              : "bg-white text-slate-800 border-slate-200"
          )}>
            {/* Background decoration - Technical Grids */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <div className={cn(
              "absolute top-0 right-0 w-96 h-96 rounded-full -mr-48 -mt-48 blur-[100px] opacity-10 pointer-events-none",
              userRole === 'TASKFORCE' ? "bg-amber-500" : "bg-indigo-500"
            )} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 relative z-10">
              <div className="flex items-center gap-6">
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-2xl relative",
                  userRole === 'TASKFORCE' ? "bg-amber-600 shadow-amber-900/40" : "bg-indigo-600 shadow-indigo-200"
                )}>
                  {userRole === 'TASKFORCE' ? <Zap className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
                  {/* Recording Glow */}
                  {selectedStudentIds.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#151619] animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                  )}
                </div>
                <div>
                  <h3 className={cn(
                    "text-2xl font-mono font-bold tracking-tight uppercase",
                    userRole === 'TASKFORCE' ? "text-white" : "text-slate-800"
                  )}>
                    {userRole === 'TASKFORCE' ? 'Bảng điều khiển_Vi phạm' : 'Quản lý_Nề nếp'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em]">
                      Trạng thái: <span className="text-emerald-500">Trực tuyến</span>
                    </span>
                    <span className="text-slate-700">|</span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em]">
                      Phiên: <span className="text-indigo-400">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowRecent(!showRecent)}
                className={cn(
                  "flex items-center gap-3 px-5 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all border",
                  userRole === 'TASKFORCE'
                    ? showRecent ? "bg-white text-black border-white" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                    : showRecent ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                )}
              >
                <History className="w-4 h-4" />
                Lịch sử {recentRecords.length > 0 && <span className="ml-1 px-2 py-0.5 bg-current bg-opacity-20 rounded-full font-bold">{recentRecords.length}</span>}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              {/* Mode Selector - Technical Toggle */}
              <div className="bg-black/20 p-1.5 rounded-xl border border-white/5 flex">
                <button
                  type="button"
                  onClick={() => setIsCollective(false)}
                  className={cn(
                    "flex-1 py-3 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-3 border",
                    !isCollective 
                      ? "bg-white/10 border-white/20 text-indigo-400 shadow-lg" 
                      : "border-transparent text-slate-500 hover:text-slate-400"
                  )}
                >
                  <UserPlus className="w-4 h-4" /> Cá nhân
                </button>
                <button
                  type="button"
                  onClick={() => setIsCollective(true)}
                  className={cn(
                    "flex-1 py-3 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-3 border",
                    isCollective 
                      ? "bg-white/10 border-white/20 text-purple-400 shadow-lg" 
                      : "border-transparent text-slate-500 hover:text-slate-400"
                  )}
                >
                  <Users className="w-4 h-4" /> Tập thể
                </button>
              </div>

              {/* Violation Types Grid */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Danh mục_Vi phạm
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest whitespace-nowrap transition-all border",
                          selectedCategory === cat 
                            ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.2)]" 
                            : "bg-transparent border-white/5 text-slate-500 hover:border-white/10"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {displayedViolations.map(type => {
                    const isSelected = selectedTypes.includes(type);
                    const points = violationCategories[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleTypeToggle(type)}
                        className={cn(
                          "relative flex flex-col items-start p-4 rounded-xl border transition-all duration-300 group",
                          isSelected
                            ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-[inset_0_0_15px_rgba(79,70,229,0.1)] scale-[1.02] z-10"
                            : "bg-black/20 border-white/5 text-slate-500 hover:border-white/10"
                        )}
                      >
                        <span className="text-[10px] font-mono font-bold text-left leading-tight mb-3 h-8 overflow-hidden uppercase">{type}</span>
                        <div className="flex items-center justify-between w-full mt-auto">
                          <span className={cn(
                            "text-[10px] font-mono px-2 py-0.5 rounded border",
                            isSelected ? "bg-indigo-600 text-white border-indigo-400" : "bg-black/40 border-white/5 text-slate-600"
                          )}>
                            {points > 0 ? `+${points}` : points}
                          </span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                      </button>
                    );
                  })}
                  
                  <button
                    type="button"
                    onClick={() => handleTypeToggle('Điểm phát sinh')}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-4 rounded-xl border border-dashed transition-all duration-300",
                      selectedTypes.includes('Điểm phát sinh')
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-[inset_0_0_15px_rgba(99,102,241,0.1)] scale-[1.02] z-10"
                        : "bg-indigo-500/5 border-indigo-500/20 text-indigo-500/50 hover:bg-indigo-500/10"
                    )}
                  >
                    <Plus className="w-5 h-5 mb-1" />
                    <span className="text-[9px] font-mono uppercase tracking-widest">Nhập_Tùy chỉnh</span>
                  </button>
                </div>

                <AnimatePresence>
                  {selectedTypes.includes('Điểm phát sinh') && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-indigo-500/5 border border-indigo-500/20 p-8 rounded-[2rem] space-y-8 mt-6 relative overflow-hidden group/custom">
                        <div className="absolute top-0 right-0 w-32 h-32 border border-dashed border-indigo-500/10 rounded-full -mr-16 -mt-16 animate-pulse" />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <label className="block text-[10px] font-mono text-indigo-400 uppercase tracking-[0.3em] font-bold">Mẫu_Có sẵn</label>
                            <select 
                              className="w-full px-5 py-4 bg-black/40 border border-indigo-500/20 rounded-2xl text-[11px] font-mono text-slate-300 outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer hover:bg-black/60"
                              onChange={(e) => {
                                const criteria = autoPointCriteria.find(c => c.label === e.target.value);
                                if (criteria) {
                                  setCustomPoints(criteria.points);
                                  setNote(criteria.description);
                                }
                              }}
                            >
                              <option value="">-- CHỌN_MẪU --</option>
                              {autoPointCriteria.map(c => (
                                <option key={c.label} value={c.label}>{c.label} ({c.points > 0 ? '+' : ''}{c.points}đ)</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-3">
                            <label className="block text-[10px] font-mono text-indigo-400 uppercase tracking-[0.3em] font-bold">Nhập_Điểm_Thủ công</label>
                            <div className="relative">
                              <input 
                                type="number"
                                className="w-full px-5 py-4 bg-black/40 border border-indigo-500/20 rounded-2xl text-[14px] font-mono font-black text-indigo-400 outline-none focus:border-indigo-500/50 transition-all hover:bg-black/60"
                                value={customPoints}
                                onChange={(e) => setCustomPoints(Number(e.target.value))}
                              />
                              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-indigo-500/50 uppercase font-bold">Điểm</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Note & Notification */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    Ghi chú_Chi tiết
                  </label>
                  <textarea 
                    className="w-full p-5 bg-black/20 border border-white/5 rounded-xl text-[11px] font-mono text-slate-300 placeholder:text-slate-700 focus:border-indigo-500/50 outline-none transition-all h-32 resize-none"
                    placeholder="NHẬP_CHI TIẾT_SỰ VIỆC_THỜI GIAN_ĐỊA ĐIỂM_CHỨNG CỨ..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <div className="space-y-6">
                  <label className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5" />
                    Cài đặt_Thông báo
                  </label>
                  
                  <div className="bg-black/20 p-5 rounded-xl border border-white/5 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-mono font-bold text-slate-300 uppercase">Cảnh báo_Phụ huynh</p>
                        <p className="text-[9px] font-mono text-slate-600 uppercase mt-1">Tự động gửi SMS/Zalo</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSendNotification(!sendNotification)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative border",
                          sendNotification ? "bg-emerald-500/20 border-emerald-500/50" : "bg-white/5 border-white/10"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-sm",
                          sendNotification ? "left-6 bg-emerald-400" : "left-1 bg-slate-600"
                        )} />
                      </button>
                    </div>

                    <div className="h-px bg-white/5" />

                    <div className="flex items-start gap-3 text-amber-500/70">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="text-[9px] font-mono leading-relaxed uppercase">
                        Cảnh báo: Dữ liệu được lưu vĩnh viễn. Các bản ghi sẽ ảnh hưởng trực tiếp đến điểm rèn luyện của học sinh.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Impact & Submit - Technical Footer */}
              <div className="pt-8 border-t border-white/5 space-y-6">
                {selectedClass && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-black/20 p-5 rounded-xl border border-white/5 flex flex-col relative overflow-hidden">
                      {/* Radial track decoration */}
                      <div className="absolute -right-4 -bottom-4 w-16 h-16 border border-dashed border-white/5 rounded-full" />
                      
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-2">Chỉ số_Hiện tại (Lớp_{selectedClass})</span>
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-2xl font-mono font-bold",
                          currentClassScore >= 180 ? "text-emerald-400" : currentClassScore >= 150 ? "text-amber-400" : "text-rose-400"
                        )}>
                          {currentClassScore.toString().padStart(3, '0')}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 uppercase">Điểm</span>
                      </div>
                    </div>

                    <div className="bg-black/20 p-5 rounded-xl border border-white/5 flex flex-col relative overflow-hidden">
                      {/* Radial track decoration */}
                      <div className="absolute -right-4 -bottom-4 w-16 h-16 border border-dashed border-white/5 rounded-full" />

                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-2">Tác động_Dự kiến</span>
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-2xl font-mono font-bold",
                          potentialImpact > 0 ? "text-rose-400" : "text-emerald-400"
                        )}>
                          {potentialImpact > 0 ? `-${potentialImpact.toString().padStart(2, '0')}` : '00'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 uppercase">Điểm</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isSubmitting || (isCollective ? !selectedClass : selectedStudentIds.length === 0) || selectedTypes.length === 0}
                  className={cn(
                    "w-full py-5 rounded-xl text-white font-mono font-bold text-xs uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-4 group relative overflow-hidden",
                    isSubmitting || (isCollective ? !selectedClass : selectedStudentIds.length === 0) || selectedTypes.length === 0
                      ? "bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed"
                      : "bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-[0.98]"
                  )}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Zap className="w-5 h-5 group-hover:scale-125 transition-transform" />
                  )}
                  <span className="relative z-10">
                    {isSubmitting 
                      ? 'Đang xử lý_Dữ liệu...' 
                      : isCollective 
                        ? `Thực thi_Ghi nhận: Lớp_${selectedClass}`
                        : `Thực thi_Ghi nhận: ${selectedStudentIds.length.toString().padStart(2, '0')}_Học sinh`
                    }
                  </span>
                  {!isSubmitting && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                  )}
                </button>
              </div>
            </form>

            {/* Recent Activity Overlay */}
            <AnimatePresence>
              {showReview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowReview(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative bg-[#151619] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/10"
                  >
                    <div className="p-8">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-mono font-bold text-white uppercase">Xác nhận_Thực thi</h3>
                          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Kiểm tra các thông số trước khi lưu</p>
                        </div>
                      </div>

                      <div className="space-y-4 bg-black/40 p-6 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Đối tượng:</span>
                          <span className="text-xs font-mono font-bold text-indigo-400 uppercase">
                            {isCollective ? `Lớp_${selectedClass}` : `${selectedStudentIds.length.toString().padStart(2, '0')}_Học sinh`}
                          </span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Nội dung:</span>
                          <div className="text-right">
                            {selectedTypes.map(t => (
                              <p key={t} className="text-[10px] font-mono text-slate-300 uppercase">{t} ({violationCategories[t] > 0 ? '+' : ''}{violationCategories[t]}đ)</p>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Tổng tác động:</span>
                          <span className={cn(
                            "text-xl font-mono font-bold",
                            selectedTypes.reduce((acc, t) => acc + (t === 'Điểm phát sinh' ? customPoints : violationCategories[t]), 0) > 0 
                              ? "text-emerald-400" 
                              : "text-rose-400"
                          )}>
                            {selectedTypes.reduce((acc, t) => acc + (t === 'Điểm phát sinh' ? customPoints : violationCategories[t]), 0) > 0 ? '+' : ''}
                            {selectedTypes.reduce((acc, t) => acc + (t === 'Điểm phát sinh' ? customPoints : violationCategories[t]), 0).toString().padStart(2, '0')}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-8">
                        <button 
                          onClick={() => setShowReview(false)}
                          className="py-4 rounded-xl text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all border border-white/5"
                        >
                          Hủy bỏ
                        </button>
                        <button 
                          onClick={handleConfirmSubmit}
                          className="py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-mono uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all border border-indigo-400/50"
                        >
                          Lưu_Thay đổi
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {showRecent && (
              <div className="absolute inset-0 bg-[#151619] z-30 p-8 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar border border-white/10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[11px] font-mono text-white uppercase tracking-widest flex items-center gap-3">
                    <History className="w-4 h-4 text-slate-500" />
                    Lịch sử_Phiên
                  </h3>
                  <button 
                    onClick={() => setShowRecent(false)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                {recentRecords.length > 0 ? (
                  <div className="space-y-3">
                    {recentRecords.map((record, idx) => (
                      <div key={record.id} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5 animate-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-slate-500">
                            {record.className}
                          </div>
                          <div>
                            <p className="text-[11px] font-mono font-bold text-slate-300 uppercase">{record.studentName}</p>
                            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">{record.type}</p>
                          </div>
                        </div>
                        <div className={cn(
                          "text-[10px] font-mono font-bold px-2 py-1 rounded border",
                          record.points > 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        )}>
                          {record.points > 0 ? '+' : ''}{record.points}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <History className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                    <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Không_Có_Dữ liệu_Phiên</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ViolationForm;
