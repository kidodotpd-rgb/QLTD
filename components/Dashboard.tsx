
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Student, ViolationRecord, Role, AppTab, User, Task } from '../types';
import { mockNow, getSchoolWeekInfo, parseDate, getWeekDateRange } from '../src/utils/dateUtils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import ClassMonitorPortal from './ClassMonitorPortal';
import { 
  generateAIChatResponse, 
  generateActionableInsights, 
  AIAction,
  analyzeBehaviorPatterns 
} from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  AlertTriangle, 
  BookOpen, 
  LineChart, 
  PlusCircle, 
  FileText,
  ClipboardList,
  FileOutput, 
  TrendingUp, 
  ArrowUpRight,
  Database, 
  Clock,
  ChevronRight,
  Calendar,
  Filter,
  Sparkles,
  ShieldAlert,
  Info,
  Trash2,
  Trophy,
  Activity,
  MessageSquare,
  Bell,
  X,
  Star,
  Search,
  CheckSquare,
  Square,
  Table,
  AlertCircle,
  RefreshCcw,
  History,
  Layout,
  Zap,
  ShieldCheck,
  BrainCircuit
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DashboardProps {
  students: Student[];
  violations: ViolationRecord[];
  onAddRecord?: (record: ViolationRecord) => void;
  userRole?: Role;
  currentUser?: User;
  onNavigate?: (tab: AppTab) => void;
  isGoodStudyWeek?: boolean;
  onToggleGoodStudyWeek?: (value: boolean) => void;
  onDeleteViolations?: (ids: string[]) => void;
  onAddNotification?: (notif: { studentName: string; parentName: string; type: string }) => void;
  onResetData?: () => void;
  onImportCSV?: () => void;
  onAddTask?: (task: Task) => void;
  violationCategories: Record<string, number>;
  tasks: Task[];
}

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e'];
const SOURCE_COLORS = {
  ADMIN: '#f43f5e',
  TEACHER: '#4f46e5',
  TASKFORCE: '#f59e0b',
  PARENT: '#10b981',
  MONITOR: '#8b5cf6'
};

const Dashboard: React.FC<DashboardProps> = ({ 
  students, 
  violations, 
  onAddRecord, 
  userRole, 
  currentUser, 
  onNavigate,
  isGoodStudyWeek,
  onToggleGoodStudyWeek,
  onDeleteViolations,
  onAddNotification,
  onResetData,
  onImportCSV,
  onAddTask,
  violationCategories,
  tasks = []
}) => {
  const [filterMode, setFilterMode] = useState<'month' | 'week'>('month');
  const [selectedRange, setSelectedRange] = useState<string>('All');
  const [showMonitorPortal, setShowMonitorPortal] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiActions, setAiActions] = useState<AIAction[]>([]);
  const [behaviorAnalysis, setBehaviorAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingBehavior, setIsAnalyzingBehavior] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isQuickDeleteMode, setIsQuickDeleteMode] = useState(false);
  const [showLiveFeed, setShowLiveFeed] = useState(true);

  // Simulated Live Feed Data
  const liveFeed = useMemo(() => {
    return [...violations]
      .sort((a, b) => {
        const dateA = parseDate(a.date).getTime();
        const dateB = parseDate(b.date).getTime();
        return dateB - dateA;
      })
      .slice(0, 8);
  }, [violations]);

  // Calculate current class scores
  const classScores = useMemo(() => {
    const scores: Record<string, number> = {};
    const uniqueClasses: string[] = Array.from(new Set(students.map(s => s.class)));
    
    uniqueClasses.forEach((cls: string) => {
      scores[cls] = 200; // Base score
    });

    violations.forEach((v: ViolationRecord) => {
      if (scores[v.className] !== undefined) {
        // Use the points from the record itself as it was recorded with the criteria at that time
        scores[v.className] += v.points;
      }
    });

    return scores;
  }, [students, violations]);

  const handleCreateWeeklyPlan = async () => {
    setIsGeneratingPlan(true);
    setShowPlanModal(true);
    const message = "Dựa trên dữ liệu nề nếp tuần này, hãy lập một kế hoạch hành động chi tiết cho tuần tới bao gồm: 1. Mục tiêu trọng tâm, 2. Các biện pháp cụ thể cho các lớp vi phạm nhiều, 3. Hình thức tuyên dương các lớp tốt.";
    const history = [];
    const context = { students, violations };
    const response = await generateAIChatResponse(message, history, context);
    setWeeklyPlan(response);
    setIsGeneratingPlan(false);
  };

  const handlePraiseTopClasses = () => {
    if (!onAddRecord || !onAddNotification) return;
    
    // Find top 3 classes
    const top3 = filteredClassStats.slice(0, 3);
    const dateStr = mockNow.toLocaleDateString('vi-VN');
    
    top3.forEach(cls => {
      onAddRecord({
        id: `PRAISE-CLASS-${cls.className}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        studentId: `CLASS-${cls.className}`,
        studentName: `TẬP THỂ LỚP ${cls.className}`,
        className: cls.className,
        type: 'Lớp 100% giờ A',
        points: 40,
        date: dateStr,
        note: `Khen thưởng tập thể lớp xuất sắc tuần này.`,
        recordedBy: currentUser?.name || 'Hệ thống',
        recordedRole: currentUser?.role || 'ADMIN',
        isCollective: true
      });
    });
    
    onAddNotification({
      studentName: "Các lớp xuất sắc",
      parentName: "Phụ huynh",
      type: `Khen thưởng & Tuyên dương tuần: ${top3.map(c => c.className).join(', ')}`
    });
    
    alert(`Đã khen thưởng và gửi thông báo cho 3 lớp dẫn đầu: ${top3.map(c => c.className).join(', ')}`);
  };

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await generateActionableInsights({ students, violations });
      setAiInsight(result.summary);
      setAiActions(result.actions);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setAiInsight("Có lỗi xảy ra khi phân tích dữ liệu.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBehaviorAnalysis = async () => {
    setIsAnalyzingBehavior(true);
    try {
      const result = await analyzeBehaviorPatterns({ students, violations });
      setBehaviorAnalysis(result);
    } catch (error) {
      console.error("Behavior Analysis failed:", error);
      setBehaviorAnalysis("Có lỗi xảy ra khi phân tích mẫu hành vi.");
    } finally {
      setIsAnalyzingBehavior(false);
    }
  };

  const systemHealth = useMemo(() => {
    const duplicates = violations.filter((v, i) => 
      violations.findIndex(v2 => 
        v2.studentId === v.studentId && 
        v2.type === v.type && 
        v2.date === v.date && 
        v2.id !== v.id
      ) > i
    );
    
    const missingNotes = violations.filter(v => !v.note || v.note.length < 5);
    const lowScores = students.filter(s => s.score < 150);
    
    const score = Math.max(0, 100 - (duplicates.length * 5) - (missingNotes.length * 2) - (lowScores.length * 3));
    
    return {
      score,
      duplicates: duplicates.length,
      missingNotes: missingNotes.length,
      lowScores: lowScores.length,
      status: score > 90 ? 'Excellent' : score > 70 ? 'Good' : 'Warning',
      integrityData: [
        { name: 'Trùng lặp', value: duplicates.length, color: '#f43f5e' },
        { name: 'Thiếu ghi chú', value: missingNotes.length, color: '#f59e0b' },
        { name: 'Điểm thấp', value: lowScores.length, color: '#ef4444' },
        { name: 'Hợp lệ', value: Math.max(0, violations.length - duplicates.length - missingNotes.length), color: '#10b981' }
      ]
    };
  }, [violations, students]);

  const handleSendGlobalReminder = () => {
    if (onAddNotification) {
      onAddNotification({
        studentName: "Toàn trường",
        parentName: "Phụ huynh & Học sinh",
        type: "NHẮC NHỞ CHUNG: Đề nghị các em học sinh chấp hành nghiêm chỉnh nội quy nhà trường, đặc biệt là tác phong và nề nếp trong giờ học."
      });
      alert("Đã gửi thông báo nhắc nhở chung toàn trường.");
    }
  };

  const handleExecuteAIAction = (action: AIAction, silent = false) => {
    if (onAddNotification) {
      onAddNotification({
        studentName: action.target,
        parentName: "Phụ huynh",
        type: action.reason
      });
    }

    // Create a Task for certain AI actions
    if (onAddTask && (action.type === 'REMIND_CLASS' || action.type === 'MEETING_REQUEST')) {
      onAddTask({
        id: `AI-TASK-${Date.now()}`,
        title: action.label,
        description: action.reason,
        assignedTo: action.type === 'MEETING_REQUEST' ? 'ADMIN' : 'MONITOR',
        status: 'pending',
        priority: action.type === 'MEETING_REQUEST' ? 'high' : 'medium',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        createdAt: new Date().toISOString(),
        createdBy: 'AI Assistant'
      });
    }

    // Real action execution
    if (onAddRecord) {
      const dateStr = mockNow.toLocaleDateString('vi-VN');
      
      if (action.type === 'PRAISE_STUDENT') {
        const student = students.find(s => s.name === action.target || s.id === action.target);
        if (student) {
          onAddRecord({
            id: `AI-PRAISE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            studentId: student.id,
            studentName: student.name,
            className: student.class,
            type: 'Nhặt được của rơi',
            points: violationCategories['Nhặt được của rơi'] || 20,
            date: dateStr,
            note: `AI Tuyên dương: ${action.reason}`,
            recordedBy: 'AI Assistant',
            recordedRole: 'ADMIN',
            isCollective: false
          });
        }
      } else if (action.type === 'REMIND_STUDENT') {
        const student = students.find(s => s.name === action.target || s.id === action.target);
        if (student) {
          onAddRecord({
            id: `AI-REMIND-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            studentId: student.id,
            studentName: student.name,
            className: student.class,
            type: 'Tác phong không nghiêm túc',
            points: violationCategories['Tác phong không nghiêm túc'] || -5,
            date: dateStr,
            note: `AI Nhắc nhở: ${action.reason}`,
            recordedBy: 'AI Assistant',
            recordedRole: 'ADMIN',
            isCollective: false
          });
        }
      } else if (action.type === 'REMIND_CLASS') {
        const className = action.target.replace('Lớp ', '');
        onAddRecord({
          id: `AI-REMIND-CLASS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          studentId: `CLASS-${className}`,
          studentName: `TẬP THỂ LỚP ${className}`,
          className: className,
          type: 'Mất trật tự (Lớp)',
          points: violationCategories['Mất trật tự (Lớp)'] || -20,
          date: dateStr,
          note: `AI Nhắc nhở tập thể: ${action.reason}`,
          recordedBy: 'AI Assistant',
          recordedRole: 'ADMIN',
          isCollective: true
        });
      } else if (action.type === 'PRAISE_CLASS') {
        const className = action.target.replace('Lớp ', '');
        onAddRecord({
          id: `AI-PRAISE-CLASS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          studentId: `CLASS-${className}`,
          studentName: `TẬP THỂ LỚP ${className}`,
          className: className,
          type: 'Lớp đạt 100% giờ A',
          points: violationCategories['Lớp đạt 100% giờ A'] || 40,
          date: dateStr,
          note: `AI Tuyên dương tập thể: ${action.reason}`,
          recordedBy: 'AI Assistant',
          recordedRole: 'ADMIN',
          isCollective: true
        });
      } else if (action.type === 'MEETING_REQUEST') {
        // Meeting requests don't necessarily add a record, but we can add a note
        onAddNotification?.({
          studentName: action.target,
          parentName: "GVCN & Phụ huynh",
          type: `YÊU CẦU HỌP: ${action.reason}`
        });
      }
    }

    if (!silent) alert(`Đã thực hiện hành động AI: ${action.label}`);
    setAiActions(prev => prev.filter(a => a.label !== action.label));
  };

  const handleExecuteAllAIActions = () => {
    if (aiActions.length === 0) return;
    const actionsToExecute = [...aiActions];
    actionsToExecute.forEach(action => handleExecuteAIAction(action, true));
    alert(`Đã thực hiện thành công ${actionsToExecute.length} hành động đề xuất từ AI.`);
    setAiActions([]);
  };

  // --- LOGIC TÍNH TOÁN THỜI GIAN THỰC TẾ ---
  // const NOW = new Date(); 

  const getDateInfo = (dateStr: string) => {
    const date = parseDate(dateStr);
    const info = getSchoolWeekInfo(date);
    
    const weekNum = info.week;
    let weekLabel = "";
    let sortValue = 0;
    const isHoliday = info.isHoliday || false;

    if (weekNum === 0) {
        weekLabel = "Trước khai giảng";
    } else if (weekNum === -1) {
        weekLabel = "Nghỉ Tết Âm Lịch";
    } else if (weekNum > 0 && info.weekEndDate) {
        const startOfWeek = new Date(info.weekEndDate);
        startOfWeek.setDate(startOfWeek.getDate() - 6);
        const endOfWeek = info.weekEndDate;
        const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        weekLabel = `Tuần ${weekNum} (${fmt(startOfWeek)} - ${fmt(endOfWeek)})`;
    } else if (weekNum > 0) {
        weekLabel = `Tuần ${weekNum}`;
    }

    sortValue = date.getFullYear() * 1000 + (weekNum === -1 ? 999 : weekNum);
    
    return { 
      week: weekNum, 
      year: date.getFullYear(), 
      reportMonth: info.reportMonthLabel, 
      weekLabel, 
      sortValue, 
      isHoliday 
    };
  };

  const availableRanges = useMemo(() => {
    if (filterMode === 'month') {
      const ranges = new Set<string>();
      violations.forEach(v => ranges.add(getDateInfo(v.date).reportMonth));
      ranges.add(getSchoolWeekInfo(mockNow).reportMonthLabel);
      return Array.from(ranges).sort((a, b) => {
        const [m1, y1] = a.split('/').map(Number);
        const [m2, y2] = b.split('/').map(Number);
        return y2 - y1 || m2 - m1;
      });
    } else {
      // Generate all 35 weeks for selection
      const allWeeks: string[] = [];
      for (let i = 1; i <= 35; i++) {
        // We need to construct the label for each week
        // Since getSchoolWeekInfo is based on a date, we can't easily get the label for a week number without a date
        // But we can use a simpler label "Tuần X" or try to find a date in that week
        allWeeks.push(`Tuần ${i} (${getWeekDateRange(i)})`);
      }
      
      // Also include weeks from violations that might not be in 1-35 (e.g. week 0)
      const existingWeeks = new Set<string>();
      violations.forEach(v => {
        const info = getDateInfo(v.date);
        if (info.weekLabel && !info.weekLabel.startsWith('Tuần ')) {
            existingWeeks.add(info.weekLabel);
        }
      });
      
      return [...allWeeks, ...Array.from(existingWeeks)].sort((a, b) => {
        const w1 = parseInt(a.match(/\d+/)?.[0] || '0');
        const w2 = parseInt(b.match(/\d+/)?.[0] || '0');
        return w2 - w1;
      });
    }
  }, [violations, filterMode]);

  const setQuickFilter = (mode: 'week' | 'month') => {
    setFilterMode(mode);
    const info = getDateInfo(mockNow.toLocaleDateString('vi-VN'));
    if (mode === 'week') setSelectedRange(info.week > 0 ? info.weekLabel : 'All');
    else setSelectedRange(info.reportMonth);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChartFilter, setSelectedChartFilter] = useState<string | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredViolations = useMemo(() => {
    let result = violations;
    if (selectedRange !== 'All') {
      result = result.filter(v => {
        const info = getDateInfo(v.date);
        if (filterMode === 'month') {
          return info.reportMonth === selectedRange;
        } else {
          // Check if selectedRange is "Tuần X" or a specific label
          if (selectedRange.startsWith('Tuần ')) {
            const weekNum = parseInt(selectedRange.replace('Tuần ', ''));
            return info.week === weekNum;
          }
          return info.weekLabel === selectedRange;
        }
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v => 
        v.studentName.toLowerCase().includes(q) || 
        v.className.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        v.note?.toLowerCase().includes(q)
      );
    }

    if (selectedChartFilter) {
      // If it's a day of week (Monday, Tuesday, etc.)
      result = result.filter(v => {
        const date = parseDate(v.date);
        const dayName = date.toLocaleDateString('vi-VN', { weekday: 'long' });
        return dayName === selectedChartFilter;
      });
    }

    return result;
  }, [violations, selectedRange, filterMode, searchQuery, selectedChartFilter]);

  const totalViolations = filteredViolations.length;
  const goodDeeds = filteredViolations.filter(v => v.points > 0).length;
  const averageScore = students.reduce((acc, s) => acc + s.score, 0) / (students.length || 1);
  
  const trendData = useMemo(() => {
    const stats: Record<string, { violations: number, rewards: number }> = {};
    filteredViolations.forEach(v => {
      const [day, month] = v.date.split('/');
      const key = `${day}/${month}`;
      if (!stats[key]) stats[key] = { violations: 0, rewards: 0 };
      if (v.points < 0) stats[key].violations++;
      else stats[key].rewards++;
    });
    return Object.keys(stats).map(date => {
        const parts = date.split('/').map(Number);
        return { 
          name: date, 
          violations: stats[date].violations, 
          rewards: stats[date].rewards,
          sortValue: parts[1] * 100 + parts[0] 
        };
    }).sort((a, b) => a.sortValue - b.sortValue);
  }, [filteredViolations]);

  const barChartData = useMemo(() => {
    const classStats = filteredViolations.reduce((acc: any, v) => {
      acc[v.className] = (acc[v.className] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(classStats).map(className => ({ name: className, violations: classStats[className] }))
      .sort((a, b) => b.violations - a.violations).slice(0, 10);
  }, [filteredViolations]);

  const sourceChartData = useMemo(() => {
    const sourceStats = filteredViolations.reduce((acc: any, v) => {
      const role = v.recordedRole || 'TEACHER';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(sourceStats).map(role => ({
      name: role === 'ADMIN' ? 'Ban Quản trị' : role === 'TASKFORCE' ? 'Đội TNXK' : role === 'MONITOR' ? 'Cán sự lớp' : 'Giáo viên',
      value: sourceStats[role],
      color: (SOURCE_COLORS as any)[role] || '#94a3b8'
    }));
  }, [filteredViolations]);

  const violationTypeData = useMemo(() => {
    const typeStats = filteredViolations.reduce((acc: any, v) => {
      if (v.points < 0) {
        acc[v.type] = (acc[v.type] || 0) + 1;
      }
      return acc;
    }, {});
    return Object.keys(typeStats)
      .map(type => ({ name: type, value: typeStats[type] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredViolations]);

  const heatmapData = useMemo(() => {
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const data = days.map(day => ({ day, count: 0 }));
    
    filteredViolations.forEach(v => {
      const date = parseDate(v.date);
      const dayIndex = date.getDay(); // 0 is Sunday, 1 is Monday
      if (dayIndex >= 1 && dayIndex <= 6) {
        data[dayIndex - 1].count++;
      }
    });
    return data;
  }, [filteredViolations]);

  const scoreDistributionData = useMemo(() => {
    const distribution = [
      { name: '< 150', value: 0, color: '#f43f5e' },
      { name: '150-179', value: 0, color: '#f59e0b' },
      { name: '180-199', value: 0, color: '#3b82f6' },
      { name: '≥ 200', value: 0, color: '#10b981' },
    ];
    students.forEach(s => {
      if (s.score < 150) distribution[0].value++;
      else if (s.score < 180) distribution[1].value++;
      else if (s.score < 200) distribution[2].value++;
      else distribution[3].value++;
    });
    return distribution;
  }, [students]);

  const filteredClassStats = useMemo(() => {
    const classes: Record<string, { totalScore: number, studentCount: number, excellentCount: number }> = {};
    students.forEach(s => {
      if (!classes[s.class]) {
        classes[s.class] = { totalScore: 0, studentCount: 0, excellentCount: 0 };
      }
      classes[s.class].totalScore += s.score;
      classes[s.class].studentCount++;
      if (s.score >= 200) classes[s.class].excellentCount++;
    });

    return Object.keys(classes).map(className => ({
      className,
      avgScore: classes[className].totalScore / classes[className].studentCount,
      studentCount: classes[className].studentCount,
      excellentCount: classes[className].excellentCount
    })).sort((a, b) => b.avgScore - a.avgScore);
  }, [students]);

  const classRadarData = useMemo(() => {
    // Compare top 5 classes across different metrics
    const classMetrics: Record<string, { name: string, score: number, violations: number, rewards: number }> = {};
    
    // Get top 5 classes by average score
    const classAvgScores: Record<string, { total: number, count: number }> = {};
    students.forEach(s => {
      if (!classAvgScores[s.class]) classAvgScores[s.class] = { total: 0, count: 0 };
      classAvgScores[s.class].total += s.score;
      classAvgScores[s.class].count++;
    });

    const topClasses = Object.keys(classAvgScores)
      .map(cls => ({ name: cls, avg: classAvgScores[cls].total / classAvgScores[cls].count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
      .map(c => c.name);

    topClasses.forEach(cls => {
      classMetrics[cls] = { 
        name: cls, 
        score: Math.round(classAvgScores[cls].total / classAvgScores[cls].count),
        violations: 0,
        rewards: 0
      };
    });

    filteredViolations.forEach(v => {
      if (classMetrics[v.className]) {
        if (v.points < 0) classMetrics[v.className].violations++;
        else classMetrics[v.className].rewards++;
      }
    });

    return [
      {
        subject: 'Điểm TB',
        ...topClasses.reduce((acc, cls) => ({ ...acc, [cls]: classMetrics[cls].score / 2.5 }), {})
      },
      {
        subject: 'Khen thưởng',
        ...topClasses.reduce((acc, cls) => ({ ...acc, [cls]: Math.min(100, classMetrics[cls].rewards * 10) }), {})
      },
      {
        subject: 'Nề nếp',
        ...topClasses.reduce((acc, cls) => ({ ...acc, [cls]: Math.max(0, 100 - (classMetrics[cls].violations * 5)) }), {})
      }
    ];
  }, [students, filteredViolations]);

  const topClassesList = useMemo(() => {
    const classAvgScores: Record<string, { total: number, count: number }> = {};
    students.forEach(s => {
      if (!classAvgScores[s.class]) classAvgScores[s.class] = { total: 0, count: 0 };
      classAvgScores[s.class].total += s.score;
      classAvgScores[s.class].count++;
    });

    return Object.keys(classAvgScores)
      .map(cls => ({ name: cls, avg: classAvgScores[cls].total / classAvgScores[cls].count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
      .map(c => c.name);
  }, [students]);

  const handleExportCSV = () => {
    const headers = ['Mã HS', 'Tên Học sinh', 'Lớp', 'Ngày vi phạm', 'Loại vi phạm', 'Phân loại', 'Nội dung chi tiết', 'Điểm', 'Người ghi nhận', 'Vai trò', 'Tuần', 'Tháng báo cáo'];
    const csvContent = [headers.join(','), ...filteredViolations.map(v => {
        const info = getDateInfo(v.date);
        return [
          v.studentId, 
          `"${v.studentName}"`, 
          v.className, 
          v.date, 
          `"${v.type}"`, 
          v.isCollective ? 'Tập thể' : 'Cá nhân',
          `"${v.note?.replace(/"/g, '""')}"`, 
          v.points, 
          v.recordedBy, 
          v.recordedRole, 
          info.week > 0 ? `Tuần ${info.week}` : info.weekLabel, 
          info.reportMonth
        ].join(',');
    })].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bao_cao_ne_nep_${selectedRange === 'All' ? 'tong_hop' : selectedRange.replace(/[()\/:\s-]/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportWeeklyClassReport = (className: string) => {
    const currentWeekInfo = getSchoolWeekInfo(mockNow);
    const currentWeek = currentWeekInfo.week;
    
    const weekViolations = violations.filter(v => {
      const info = getSchoolWeekInfo(parseDate(v.date));
      return v.className === className && info.week === currentWeek;
    });

    if (weekViolations.length === 0) {
      alert(`Lớp ${className} không có dữ liệu nề nếp nào trong tuần ${currentWeek}.`);
      return;
    }

    const data = weekViolations.map(v => ({
      'Ngày': v.date,
      'Học sinh': v.studentName,
      'Loại vi phạm/Khen thưởng': v.type,
      'Điểm': v.points,
      'Ghi chú': v.note,
      'Người ghi': v.recordedBy,
      'Vai trò': v.recordedRole,
      'Đối tượng': v.isCollective ? 'Tập thể' : 'Cá nhân'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Tuan ${currentWeek}`);
    
    const wscols = [
      {wch: 12}, {wch: 20}, {wch: 30}, {wch: 10}, {wch: 50}, {wch: 20}, {wch: 15}, {wch: 15}
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `Bao_cao_ne_nep_Tuan_${currentWeek}_Lop_${className}.xlsx`);
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="space-y-8 pb-10">
      {/* Editorial Hero Section */}
      <section className="relative overflow-hidden bg-[#0A0A0B] rounded-2xl sm:rounded-[3rem] p-6 sm:p-12 lg:p-24 text-white shadow-2xl border border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#1e293b_0%,transparent_70%)] opacity-50" />
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://picsum.photos/seed/school/1920/1080?blur=10')] bg-cover bg-center opacity-10 mix-blend-overlay" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 lg:gap-16">
          <div className="max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6 sm:mb-8"
            >
              <span className="px-3 sm:px-5 py-1.5 sm:py-2 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 rounded-full text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.2em] sm:tracking-[0.4em]">
                Hệ thống_Hoạt động // {mockNow.toLocaleDateString('vi-VN')}
              </span>
              {isGoodStudyWeek && (
                <span className="px-3 sm:px-5 py-1.5 sm:py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.2em] sm:tracking-[0.4em] flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Tuần_Thi đua
                </span>
              )}
            </motion.div>
            
            <h1 className="text-4xl sm:text-7xl lg:text-9xl font-black tracking-tighter leading-[0.9] sm:leading-[0.82] uppercase mb-6 sm:mb-10 font-display">
              Smart <span className="text-indigo-500">School</span><br />
              3R <span className="text-slate-500 italic font-serif lowercase tracking-normal text-2xl sm:text-5xl lg:text-7xl">v2.5</span>
            </h1>
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-6 sm:gap-8 items-start sm:items-center">
              <p className="text-slate-400 text-base sm:text-lg font-medium max-w-md leading-relaxed border-l-2 border-indigo-500/50 pl-4 sm:pl-6">
                Hệ thống quản lý nề nếp thế hệ mới. Phân tích thời gian thực, thông tin chi tiết từ AI và đồng bộ hóa phụ huynh-nhà trường.
              </p>
              
              <div className="flex gap-4 w-full sm:w-auto">
                <button 
                  onClick={handleAIAnalysis}
                  className="flex-1 sm:flex-none px-6 sm:px-8 py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] flex items-center justify-center gap-3"
                >
                  <Zap className="w-4 h-4" /> Khởi chạy AI
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6 w-full lg:w-80">
            <div className="bg-white/5 p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-white/10 backdrop-blur-md group hover:bg-white/10 transition-all">
              <p className="text-[8px] sm:text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 sm:mb-3">Sĩ số</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl sm:text-5xl font-black tracking-tighter">{students.length}</p>
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 mb-1" />
              </div>
            </div>
            <div className="bg-white/5 p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-white/10 backdrop-blur-md group hover:bg-white/10 transition-all">
              <p className="text-[8px] sm:text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 sm:mb-3">Vi phạm_Ngày</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl sm:text-5xl font-black tracking-tighter text-rose-500">
                  {violations.filter(v => v.date === mockNow.toLocaleDateString('vi-VN')).length}
                </p>
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 mb-1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Insights - Atmospheric Style */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-purple-600/5 to-transparent blur-3xl rounded-[3rem] -z-10" />
        <div className="glass-card rounded-2xl sm:rounded-[3rem] p-6 sm:p-8 lg:p-12 border-white/20 shadow-xl">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            <div className="lg:w-1/3 space-y-6 sm:space-y-8">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20">
                  <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white font-display uppercase tracking-tight">Trí tuệ AI</h3>
                  <p className="text-[8px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em]">Công cụ phân tích nề nếp</p>
                </div>
              </div>
              
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Mô hình AI độc quyền của chúng tôi theo dõi các mô hình hành vi để cung cấp thông tin hữu ích cho ban giám hiệu nhà trường.
              </p>

              <div className="flex flex-col gap-3 sm:gap-4">
                <button 
                  onClick={handleAIAnalysis}
                  disabled={isAnalyzing}
                  className="w-full py-4 sm:py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isAnalyzing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Chạy chẩn đoán
                </button>
                <button 
                  onClick={handleCreateWeeklyPlan}
                  className="w-full py-4 sm:py-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-3"
                >
                  <Calendar className="w-4 h-4" /> Lập kế hoạch tuần
                </button>
              </div>
            </div>

            <div className="lg:w-2/3">
              <AnimatePresence mode="wait">
                {aiInsight ? (
                  <motion.div 
                    key="insight"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 sm:space-y-8"
                  >
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-indigo-100 dark:border-indigo-800">
                      <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-medium italic">
                        "{aiInsight}"
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {aiActions.map((action, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <span className={cn(
                              "px-2 sm:px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest",
                              action.type.includes('PRAISE') ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                            )}>
                              {action.type.includes('PRAISE') ? 'Tuyên dương' : 'Nhắc nhở'}
                            </span>
                            <button 
                              onClick={() => handleExecuteAIAction(action)}
                              className="p-1.5 sm:p-2 bg-white dark:bg-slate-700 rounded-lg text-slate-400 group-hover:text-indigo-600 transition-colors"
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[10px] sm:text-xs font-black text-slate-800 dark:text-white mb-1">{action.target}</p>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-relaxed">{action.reason}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 sm:p-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl sm:rounded-[3rem]">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white dark:bg-slate-900 rounded-xl sm:rounded-[2rem] flex items-center justify-center text-slate-200 mb-4 sm:mb-6">
                      <Sparkles className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] sm:text-xs">Sẵn sàng phân tích dữ liệu</p>
                    <p className="text-[9px] sm:text-[10px] text-slate-300 font-bold mt-2">Nhấn nút bên trái để bắt đầu quá trình phân tích thông minh</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Action Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
         <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto glass-card p-2 rounded-2xl">
            <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/50 w-full sm:w-auto">
              <button 
                onClick={() => setQuickFilter('week')}
                className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all neo-button", filterMode === 'week' && selectedRange !== 'All' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700")}
              >
                Tuần này
              </button>
              <button 
                onClick={() => setQuickFilter('month')}
                className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all neo-button", filterMode === 'month' && selectedRange !== 'All' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700")}
              >
                Tháng này
              </button>
              <button 
                onClick={() => setSelectedRange('All')}
                className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all neo-button", selectedRange === 'All' ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700")}
              >
                Tất cả
              </button>
            </div>

            <select 
              className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
            >
              <option value="All">Toàn bộ thời gian</option>
              {availableRanges.map(range => <option key={range} value={range}>{range}</option>)}
            </select>
        </div>

        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
            {(userRole === 'ADMIN' || userRole === 'TASKFORCE') && onNavigate && (
                <button
                    onClick={() => onNavigate('record')}
                    className={cn("flex-1 sm:flex-none px-6 py-3 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xl neo-button", userRole === 'TASKFORCE' ? "bg-amber-500 text-white shadow-amber-200" : "bg-indigo-600 text-white shadow-indigo-200")}
                >
                    <PlusCircle className="w-5 h-5" />
                    <span>Ghi nhận Vi phạm</span>
                </button>
            )}
            {userRole !== 'TASKFORCE' && (
              <button
                  onClick={() => setShowMonitorPortal(true)}
                  className="flex-1 sm:flex-none px-6 py-3 bg-purple-600 text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-200 neo-button"
              >
                  <BookOpen className="w-5 h-5" />
                  <span>Sổ Đầu Bài</span>
              </button>
            )}
            <button
                onClick={handleExportCSV}
                className="flex-1 sm:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-sm neo-button"
            >
                <FileOutput className="w-5 h-5 text-emerald-600" />
                <span>Xuất CSV</span>
            </button>
            {userRole === 'TEACHER' && currentUser?.assignedClass && (
              <button
                  onClick={() => handleExportWeeklyClassReport(currentUser.assignedClass!)}
                  className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-200 neo-button"
              >
                  <Table className="w-5 h-5" />
                  <span>Báo cáo tuần</span>
              </button>
            )}
            {userRole === 'ADMIN' && onToggleGoodStudyWeek && (
              <button
                onClick={() => onToggleGoodStudyWeek(!isGoodStudyWeek)}
                className={cn(
                  "flex-1 sm:flex-none px-6 py-3 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xl neo-button",
                  isGoodStudyWeek ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-white border border-slate-200 text-slate-500"
                )}
              >
                <Sparkles className={cn("w-5 h-5", isGoodStudyWeek ? "text-white" : "text-emerald-500")} />
                <span>Tuần học tốt {isGoodStudyWeek ? '(Đang bật)' : ''}</span>
              </button>
            )}
            {userRole === 'ADMIN' && onResetData && (
              <button
                onClick={onResetData}
                className="flex-1 sm:flex-none px-6 py-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-sm hover:bg-rose-100 neo-button"
              >
                <Trash2 className="w-5 h-5" />
                <span>Reset Hệ thống</span>
              </button>
            )}
            {(userRole === 'ADMIN' || userRole === 'TEACHER') && (
              <button
                onClick={() => {
                  const studentName = prompt("Nhập tên học sinh hoặc lớp cần tuyên dương:");
                  if (studentName && onAddNotification) {
                    onAddNotification({
                      studentName: studentName,
                      parentName: "Phụ huynh",
                      type: "Tuyên dương gương người tốt việc tốt"
                    });
                    alert(`Đã gửi thông báo tuyên dương cho ${studentName}`);
                  }
                }}
                className="flex-1 sm:flex-none px-6 py-3 bg-emerald-500 text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-200 neo-button"
              >
                <Trophy className="w-5 h-5" />
                <span>Tuyên dương nhanh</span>
              </button>
            )}
        </div>
      </div>

      {/* Admin School Overview */}
      {userRole === 'ADMIN' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-4 gap-6"
        >
          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="lg:col-span-2 glass-card p-8 rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50/50 rounded-full -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-110" />
            <div className="relative z-10">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Lớp dẫn đầu tuần này</h4>
              <div className="flex items-end gap-4">
                <div className="text-5xl font-black text-slate-800 tracking-tighter font-display">
                  {barChartData[0]?.name || 'N/A'}
                </div>
                <div className="mb-1 flex items-center gap-1 text-emerald-600 font-black text-xs bg-emerald-50 px-2 py-1 rounded-lg">
                  <TrendingUp className="w-3 h-3" />
                  Top 1
                </div>
              </div>
              <p className="text-sm text-slate-500 font-bold mt-4">Duy trì phong độ tốt với 100% tiết học loại A và không có vi phạm nghiêm trọng.</p>
            </div>
            <div className="mt-8 flex gap-2">
              <button 
                onClick={() => onNavigate?.('ranking')}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all neo-button"
              >
                Xem chi tiết BXH
              </button>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="glass-card p-8 rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden group border-rose-100"
          >
             <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50/50 rounded-full -mr-6 -mt-6 transition-transform duration-700 group-hover:scale-110" />
             <div className="relative z-10">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Cảnh báo nề nếp</h4>
                <div className="text-4xl font-black text-rose-600 tracking-tighter mb-2 font-display">
                  {filteredViolations.filter(v => ['Tiết D', 'Vô lễ GV', 'Đánh nhau/đe dọa/quay phim'].includes(v.type)).length}
                </div>
                <p className="text-xs font-bold text-slate-500">Vi phạm nghiêm trọng cần xử lý ngay trong tuần này.</p>
             </div>
             <div className="mt-6">
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full w-2/3" />
                </div>
             </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="glass-card p-8 rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden group border-emerald-100"
          >
             <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-50/50 rounded-full -mt-10 -ml-10 blur-2xl" />
             <div className="relative z-10">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Gương người tốt</h4>
               <div className="text-4xl font-black text-emerald-600 tracking-tighter mb-2 font-display">
                 {goodDeeds}
               </div>
               <p className="text-xs font-bold text-slate-500">Lượt tuyên dương và việc tốt được ghi nhận.</p>
             </div>
             <div className="mt-6 flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center text-[10px] font-black text-emerald-600">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                  +{goodDeeds > 4 ? goodDeeds - 4 : 0}
                </div>
             </div>
          </motion.div>
        </motion.div>
      )}

      {/* GVCN Specific View */}
      {userRole === 'TEACHER' && currentUser?.assignedClass && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-200 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight mb-2">Chào Thầy/Cô, GVCN Lớp {currentUser.assignedClass}</h2>
              <p className="text-indigo-100 text-sm font-bold opacity-80">Theo dõi tình hình nề nếp và thi đua của lớp mình trong tuần này.</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Vi phạm tuần</p>
                <p className="text-2xl font-black">{filteredViolations.filter(v => v.className === currentUser.assignedClass && v.points < 0).length}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Điểm cộng tuần</p>
                <p className="text-2xl font-black">+{filteredViolations.filter(v => v.className === currentUser.assignedClass && v.points > 0).length}</p>
              </div>
              <button 
                onClick={() => handleExportWeeklyClassReport(currentUser.assignedClass!)}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30 flex items-center gap-2 transition-all group/btn"
              >
                <Table className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Báo cáo tuần</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Global Search & Command Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 relative group"
      >
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <input 
          ref={searchInputRef}
          type="text"
          placeholder="Tìm kiếm học sinh, lớp, hoặc loại vi phạm... (Nhấn '/' để bắt đầu)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] py-5 pl-16 pr-8 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all placeholder:text-slate-400"
        />
        <div className="absolute inset-y-0 right-6 flex items-center gap-2">
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-tighter">
            <span className="px-1">⌘</span>
            <span className="px-1">K</span>
          </div>
        </div>
      </motion.div>

      {selectedChartFilter && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-2xl"
        >
          <div className="p-2 bg-indigo-500 rounded-xl text-white">
            <Filter className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
              Đang lọc theo: <span className="uppercase font-black">{selectedChartFilter}</span>
            </p>
            <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 font-medium">Hiển thị {filteredViolations.length} kết quả phù hợp</p>
          </div>
          <button 
            onClick={() => setSelectedChartFilter(null)}
            className="px-4 py-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
          >
            Xoá bộ lọc
          </button>
        </motion.div>
      )}

      {/* System Status Bar */}
      <div className="flex items-center justify-between mb-8 px-4 py-2 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hệ thống: Trực tuyến</span>
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{violations.length} Bản ghi</span>
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cập nhật: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Action Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8 sm:mb-10">
        <motion.button 
          whileHover={{ y: -5 }}
          onClick={() => onNavigate && onNavigate('record')}
          className="group relative h-40 sm:h-48 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[2rem] p-6 sm:p-8 text-left overflow-hidden shadow-xl shadow-indigo-200/50"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
              <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-white text-lg sm:text-xl font-black font-display leading-tight">Nhập liệu AI</h3>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">Ghi nhận nhanh bằng giọng nói/văn bản</p>
            </div>
          </div>
        </motion.button>

        <motion.button 
          whileHover={{ y: -5 }}
          onClick={handleBehaviorAnalysis}
          disabled={isAnalyzingBehavior}
          className="group relative h-40 sm:h-48 bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 text-left overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
              {isAnalyzingBehavior ? <RefreshCcw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div>
              <h3 className="text-slate-800 dark:text-white text-lg sm:text-xl font-black font-display leading-tight">Phân tích Mẫu</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Tìm kiếm xu hướng & nguyên nhân hành vi</p>
            </div>
          </div>
        </motion.button>

        <motion.button 
          whileHover={{ y: -5 }}
          onClick={() => onNavigate && onNavigate('ranking')}
          className="group relative h-40 sm:h-48 bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 text-left overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-slate-800 dark:text-white text-lg sm:text-xl font-black font-display leading-tight">Xếp hạng Tuần</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Xem vị thứ thi đua các lớp</p>
            </div>
          </div>
        </motion.button>

        <motion.button 
          whileHover={{ y: -5 }}
          onClick={() => onNavigate && onNavigate('reports')}
          className="group relative h-40 sm:h-48 bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 text-left overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-slate-800 dark:text-white text-lg sm:text-xl font-black font-display leading-tight">Báo cáo Tổng hợp</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Xuất dữ liệu & Phân tích chuyên sâu</p>
            </div>
          </div>
        </motion.button>

        {userRole === 'ADMIN' && (
          <motion.button 
            whileHover={{ y: -5 }}
            onClick={onImportCSV}
            className="group relative h-40 sm:h-48 bg-emerald-600 rounded-[2rem] p-6 sm:p-8 text-left overflow-hidden shadow-xl shadow-emerald-200/50"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
                <FileOutput className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-white text-lg sm:text-xl font-black font-display leading-tight">Nhập CSV</h3>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">Nhập danh sách học sinh từ file CSV/Excel</p>
              </div>
            </div>
          </motion.button>
        )}
      </div>

      {/* AI Insights Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        <div className="lg:col-span-2">
          <motion.div 
            whileHover={{ scale: 1.005 }}
            className="h-full bg-gradient-to-r from-teal-700 to-teal-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-teal-200 relative overflow-hidden border border-white/10"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 blur-2xl"></div>
            
            <div className="relative z-10 flex flex-col items-start justify-between h-full gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                  <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight font-display">Trợ lý AI Gemini Pro</h2>
                  <p className="text-indigo-100 text-sm font-medium mt-1">Phân tích dữ liệu nề nếp thời gian thực bằng trí tuệ nhân tạo</p>
                </div>
              </div>
              
              <div className="w-full">
                <AnimatePresence mode="wait">
                  {aiInsight ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                        <p className="text-sm leading-relaxed font-medium text-indigo-50 italic">
                          "{aiInsight}"
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {aiActions.slice(0, 3).map((action, idx) => (
                          <button 
                            key={idx}
                            onClick={() => handleExecuteAIAction(action)}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all backdrop-blur-sm border border-white/10 flex items-center gap-2"
                          >
                            <Zap className="w-3.5 h-3.5" /> {action.label}
                          </button>
                        ))}
                        <button 
                          onClick={() => setAiInsight(null)}
                          className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/40 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all backdrop-blur-sm border border-rose-500/30"
                        >
                          Đóng
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={handleAIAnalysis}
                        disabled={isAnalyzing}
                        className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl hover:-translate-y-1 disabled:opacity-50 flex items-center gap-3"
                      >
                        {isAnalyzing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                        {isAnalyzing ? 'Đang phân tích...' : 'Phân tích dữ liệu tuần này'}
                      </button>
                      <button 
                        onClick={handleCreateWeeklyPlan}
                        className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all border border-white/20 backdrop-blur-sm"
                      >
                        Lập kế hoạch tuần
                      </button>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-1">
          <div className="glass-card h-full p-8 rounded-[2.5rem] border-white/20 flex flex-col gap-6">
            {/* System Health */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white font-display">Sức khỏe Hệ thống</h3>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                  systemHealth.status === 'Excellent' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                )}>
                  {systemHealth.score}%
                </div>
              </div>

              <div className="space-y-4">
                {systemHealth.integrityData.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>{item.name}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (item.value / (violations.length || 1)) * 100)}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Behavior Analysis */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white font-display">Mẫu Hành vi</h3>
                </div>
                <button 
                  onClick={handleBehaviorAnalysis}
                  disabled={isAnalyzingBehavior}
                  className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all disabled:opacity-50"
                >
                  {isAnalyzingBehavior ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </button>
              </div>

              {behaviorAnalysis ? (
                <div className="bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl p-4 border border-indigo-100/50 dark:border-indigo-800/20">
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium italic line-clamp-6">
                    {behaviorAnalysis}
                  </p>
                  <button 
                    onClick={() => alert(behaviorAnalysis)}
                    className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-2 hover:underline"
                  >
                    Xem chi tiết
                  </button>
                </div>
              ) : (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-4">
                  Nhấn nút để AI phân tích xu hướng hành vi
                </p>
              )}
            </div>

            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => onNavigate?.('violations')}
                className="w-full py-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Kiểm tra tính toàn vẹn
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Live Activity Feed & Admin Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="glass-card p-8 rounded-[2.5rem] border-white/20 h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Hoạt động Gần đây</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cập nhật thời gian thực</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
              </div>
            </div>

            <div className="space-y-4">
              {liveFeed.map((v, idx) => (
                <motion.div 
                  key={v.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 transition-all"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    v.points < 0 ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"
                  )}>
                    {v.points < 0 ? <AlertCircle className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-black text-slate-800 dark:text-white truncate">{v.studentName}</p>
                      <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[8px] font-black text-slate-500 uppercase tracking-widest">Lớp {v.className}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">{v.type} • {v.note || 'Không có ghi chú'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-xs font-black", v.points < 0 ? "text-rose-600" : "text-emerald-600")}>
                      {v.points > 0 ? '+' : ''}{v.points}đ
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{v.date}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <button 
              onClick={() => onNavigate?.('violations')}
              className="w-full mt-6 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all flex items-center justify-center gap-2"
            >
              Xem tất cả hoạt động <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-6 h-full">
            <div className="glass-card p-8 rounded-[2.5rem] border-white/20 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white">
              <h3 className="text-lg font-black font-display mb-4">Lệnh Quản trị</h3>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => onNavigate?.('record')}
                  className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 flex items-center gap-4 transition-all group"
                >
                  <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-widest">Ghi nhận mới</p>
                    <p className="text-[9px] font-bold opacity-70">Nhập vi phạm/khen thưởng</p>
                  </div>
                </button>
                <button 
                  onClick={() => onNavigate?.('ranking')}
                  className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 flex items-center gap-4 transition-all group"
                >
                  <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-widest">Bảng Xếp Hạng</p>
                    <p className="text-[9px] font-bold opacity-70">Xem thi đua các lớp</p>
                  </div>
                </button>
                <button 
                  onClick={() => onNavigate?.('reports')}
                  className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 flex items-center gap-4 transition-all group"
                >
                  <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                    <LineChart className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-widest">Báo cáo Tổng hợp</p>
                    <p className="text-[9px] font-bold opacity-70">Phân tích dữ liệu chuyên sâu</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="glass-card p-8 rounded-[2.5rem] border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white font-display">Nhiệm vụ Đang chờ</h3>
                <button 
                  onClick={() => onNavigate?.('tasks')}
                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                >
                  Xem tất cả
                </button>
              </div>
              <div className="space-y-3">
                {tasks.filter(t => t.status !== 'completed').slice(0, 3).map((task, idx) => (
                  <div 
                    key={task.id}
                    className="p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      task.priority === 'high' ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-500"
                    )}>
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-white truncate">{task.title}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Hạn: {task.dueDate}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                ))}
                {tasks.filter(t => t.status !== 'completed').length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Không có nhiệm vụ chờ</p>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card p-8 rounded-[2.5rem] border-white/20">
              <h3 className="text-lg font-black text-slate-800 dark:text-white font-display mb-6">Tiện ích</h3>
              <div className="space-y-3">
                <button 
                  onClick={handleSendGlobalReminder}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between group hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Thông báo chung</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => onNavigate?.('admin-criteria')}
                  className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between group hover:border-emerald-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Cấu hình Tiêu chí</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={() => onNavigate?.('permissions')}
                  className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between group hover:border-purple-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-4 h-4 text-purple-500" />
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Quản lý Quyền</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Rail */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8"
      >
        {[
          { icon: PlusCircle, label: 'Thêm vi phạm', color: 'bg-indigo-600', action: () => onNavigate?.('form') },
          { icon: ClipboardList, label: 'Nhiệm vụ', color: 'bg-indigo-600', action: () => onNavigate?.('tasks') },
          { icon: FileText, label: 'Xuất báo cáo', color: 'bg-indigo-600', action: () => onNavigate?.('ranking') },
          { icon: Users, label: 'Quản lý lớp', color: 'bg-emerald-600', action: () => onNavigate?.('ranking') },
          { icon: History, label: 'Lịch sử', color: 'bg-slate-600', action: () => onNavigate?.('violations') },
          { icon: Zap, label: 'Phân tích AI', color: 'bg-amber-500', action: handleAIAnalysis },
          { icon: Layout, label: 'Bố cục', color: 'bg-purple-600', action: () => {} },
        ].map((item, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={item.action}
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
          >
            <div className={cn("p-2 rounded-xl text-white group-hover:scale-110 transition-transform", item.color)}>
              <item.icon className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{item.label}</span>
          </motion.button>
        ))}
      </motion.div>
      {userRole === 'ADMIN' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Thao tác Nhanh</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dọn dẹp & Quản trị dữ liệu</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={handleSendGlobalReminder}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between group hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Nhắc nhở toàn trường</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={() => {
                    const className = prompt("Nhập tên lớp cần xoá dữ liệu (vd: 10A1):");
                    if (className) {
                      const week = prompt("Nhập số tuần (để trống nếu muốn xoá tất cả các tuần của lớp này):");
                      if (week === null) return;
                      if (week === "") {
                        // @ts-ignore - Assuming onDeleteClassesData is available or using a workaround
                        if (window.confirm(`Xoá TOÀN BỘ dữ liệu của lớp ${className}?`)) {
                          // We can use the existing props if we pass them or just navigate
                          alert("Vui lòng sử dụng tab 'Xếp hạng' -> 'Quản lý dữ liệu' để thực hiện thao tác này một cách an toàn.");
                          onNavigate?.('ranking');
                        }
                      } else {
                        alert("Vui lòng sử dụng tab 'Xếp hạng' -> 'Quản lý dữ liệu' để thực hiện thao tác này.");
                        onNavigate?.('ranking');
                      }
                    }
                  }}
                  className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between group hover:border-rose-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Xoá dữ liệu lớp</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={() => onResetData?.()}
                  className="w-full p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center justify-between group hover:bg-rose-100 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-black text-rose-600 uppercase tracking-widest">Reset Toàn bộ Hệ thống</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 font-bold italic mt-6">Lưu ý: Các thao tác xoá dữ liệu hàng loạt không thể hoàn tác.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.6 }}
            className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Quản lý Vi phạm Trực tiếp</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Dành riêng cho Ban Quản trị</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Tìm tên HS, lớp..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    onChange={(e) => {
                      const term = e.target.value.toLowerCase();
                      setSearchTerm(term);
                    }}
                  />
                </div>
                <button
                  onClick={() => setIsQuickDeleteMode(!isQuickDeleteMode)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    isQuickDeleteMode ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                  )}
                >
                  <AlertCircle className="w-4 h-4" /> {isQuickDeleteMode ? 'Bật Xoá Nhanh' : 'Xoá Nhanh'}
                </button>
                <button 
                  onClick={() => {
                    if (selectedIds.length === 0) return;
                    if (isQuickDeleteMode || window.confirm(`Xoá ${selectedIds.length} bản ghi đã chọn?`)) {
                      onDeleteViolations?.(selectedIds);
                      setSelectedIds([]);
                    }
                  }}
                  disabled={selectedIds.length === 0}
                  className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Xoá {selectedIds.length > 0 ? `${selectedIds.length} mục` : 'đã chọn'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="py-4 px-4">
                      <button 
                        onClick={() => {
                          if (selectedIds.length === filteredViolations.slice(0, 10).length) setSelectedIds([]);
                          else setSelectedIds(filteredViolations.slice(0, 10).map(v => v.id));
                        }}
                        className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center"
                      >
                        {selectedIds.length === filteredViolations.slice(0, 10).length ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                      </button>
                    </th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Học sinh / Lớp</th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vi phạm / Điểm</th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày / Người ghi</th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredViolations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-300">
                            <Search className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Không tìm thấy kết quả</p>
                            <p className="text-xs text-slate-400 font-bold mt-1">Thử thay đổi từ khóa hoặc bộ lọc của bạn</p>
                          </div>
                          <button 
                            onClick={() => { setSearchQuery(''); setSelectedChartFilter(null); }}
                            className="mt-2 px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
                          >
                            Xoá tất cả bộ lọc
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredViolations
                      .slice(0, 10)
                      .map((v) => (
                      <tr key={v.id} className="border-b border-white dark:border-slate-800 hover:bg-white/50 dark:hover:bg-slate-900/50 transition-colors group">
                        <td className="py-4 px-4">
                        <button 
                          onClick={() => {
                            if (selectedIds.includes(v.id)) setSelectedIds(prev => prev.filter(id => id !== v.id));
                            else setSelectedIds(prev => [...prev, v.id]);
                          }}
                          className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center"
                        >
                          {selectedIds.includes(v.id) ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm font-black text-slate-800 dark:text-white">{v.studentName}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lớp {v.className}</span>
                          <span className={cn(
                            "text-[9px] font-black",
                            classScores[v.className] >= 190 ? "text-emerald-500" : classScores[v.className] >= 170 ? "text-amber-500" : "text-rose-500"
                          )}>
                            ({classScores[v.className]}đ)
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className={cn("text-xs font-bold", v.points < 0 ? "text-rose-600" : "text-emerald-600")}>{v.type}</p>
                        <p className="text-[10px] font-black text-slate-400">{v.points > 0 ? '+' : ''}{v.points} điểm</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{v.date}</p>
                        <p className="text-[10px] font-medium text-slate-400 italic">Bởi: {v.recordedBy}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button 
                          onClick={() => {
                            if (isQuickDeleteMode) {
                              onDeleteViolations?.([v.id]);
                            } else if (window.confirm(`Xoá vi phạm của em ${v.studentName}?`)) {
                              onDeleteViolations?.([v.id]);
                            }
                          }}
                          className={cn(
                            "p-2 transition-all rounded-lg",
                            isQuickDeleteMode ? "text-rose-600 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100" : "text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          )}
                          title={isQuickDeleteMode ? "Xoá ngay lập tức" : "Xoá bản ghi"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-between items-center">
              <p className="text-[10px] font-bold text-slate-400 italic">* Hiển thị 10 bản ghi gần nhất khớp với tìm kiếm.</p>
              <button 
                onClick={() => onNavigate?.('violations')}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
              >
                Xem tất cả bản ghi <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Stats Grid - Bento Style */}
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4"
      >
        {/* Large Card: Average Score */}
        <motion.div 
          variants={itemVariants} 
          className="md:col-span-2 lg:col-span-3 bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-200 text-white relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl transition-transform duration-700 group-hover:scale-110" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/10">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                {averageScore >= 190 ? 'Xuất sắc' : 'Ổn định'}
              </span>
            </div>
            <div className="mt-8">
              <p className="text-indigo-100 text-xs font-black uppercase tracking-[0.2em] mb-2">Điểm TB Toàn trường</p>
              <div className="flex items-baseline gap-4">
                <h3 className="text-6xl font-black tracking-tighter">{averageScore.toFixed(1)}</h3>
                <p className="text-indigo-200 text-sm font-bold max-w-[120px]">Chỉ số thi đua chung của tất cả học sinh</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Medium Card: Total Students */}
        <motion.div 
          variants={itemVariants} 
          className="md:col-span-2 lg:col-span-3 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-xl transition-all duration-500"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Toàn trường</p>
              <p className="text-2xl font-black text-slate-800 tracking-tighter">{students.length}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-500 mb-4">Phân bổ học sinh theo khối lớp</p>
            <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-100">
              <div className="bg-indigo-500 w-[35%] h-full" />
              <div className="bg-indigo-500 w-[30%] h-full" />
              <div className="bg-emerald-500 w-[35%] h-full" />
            </div>
            <div className="flex justify-between mt-2 text-[9px] font-black text-slate-400 uppercase">
              <span>Khối 10</span>
              <span>Khối 11</span>
              <span>Khối 12</span>
            </div>
          </div>
        </motion.div>

        {/* Small Card: Violations */}
        <motion.div 
          variants={itemVariants} 
          className="md:col-span-2 lg:col-span-2 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-rose-200 transition-all"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 group-hover:rotate-12 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vi phạm</p>
              <h4 className="text-xl font-black text-slate-800">{totalViolations - goodDeeds}</h4>
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
            {(((totalViolations - goodDeeds) / (totalViolations || 1)) * 100).toFixed(0)}% tổng số lượt ghi nhận nề nếp tuần này.
          </p>
        </motion.div>

        {/* Small Card: Good Deeds */}
        <motion.div 
          variants={itemVariants} 
          className="md:col-span-2 lg:col-span-2 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-emerald-200 transition-all"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Khen thưởng</p>
              <h4 className="text-xl font-black text-slate-800">{goodDeeds}</h4>
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
            Ghi nhận {goodDeeds} lượt gương người tốt việc tốt, đóng góp tích cực vào điểm thi đua.
          </p>
        </motion.div>

        {/* System Health Card */}
        <motion.div 
          variants={itemVariants} 
          className="md:col-span-4 lg:col-span-2 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-indigo-200 transition-all flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-2xl transition-transform",
                systemHealth.status === 'Excellent' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              )}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sức khỏe hệ thống</p>
                <h4 className="text-xl font-black text-slate-800">{systemHealth.score}%</h4>
              </div>
            </div>
          </div>
          
          <div className="flex-1 flex items-center gap-4">
            <div className="w-24 h-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={systemHealth.integrityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {systemHealth.integrityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 flex-1">
              {systemHealth.integrityData.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-[9px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-500">{item.name}</span>
                  </div>
                  <span className="text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Small Card: Ranking */}
        <motion.div 
          variants={itemVariants} 
          className="md:col-span-4 lg:col-span-2 bg-slate-900 p-6 rounded-[2.5rem] shadow-xl text-white group overflow-hidden relative"
        >
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mb-16 -mr-16" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Star className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest">Xếp hạng</p>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black tracking-tighter">Hạng {averageScore >= 180 ? 'TỐT' : 'KHÁ'}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Dựa trên điểm trung bình</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Policy & Rules Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/10 rounded-xl"><ShieldAlert className="w-5 h-5 text-amber-400" /></div>
              <h3 className="text-lg font-black tracking-tight">Lưu ý Quy định 2025-2026</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-black text-amber-400">01</span>
                  </div>
                  <p className="text-xs font-medium text-slate-300 leading-relaxed">
                    Lớp có học sinh vi phạm <span className="text-white font-black">Điều cấm</span> sẽ bị <span className="text-rose-400 font-black">hạ một bậc</span> xếp loại thi đua (Tuần/Tháng/Kỳ).
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-400/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-black text-indigo-400">02</span>
                  </div>
                  <p className="text-xs font-medium text-slate-300 leading-relaxed">
                    Trong <span className="text-indigo-400 font-black">Tuần học tốt</span>, tất cả các điểm cộng và điểm trừ nề nếp sẽ được <span className="text-white font-black">nhân đôi (x2)</span>.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-black text-emerald-400">03</span>
                  </div>
                  <p className="text-xs font-medium text-slate-300 leading-relaxed">
                    Xếp loại <span className="text-emerald-400 font-black">TỐT</span> yêu cầu điểm thi đua <span className="text-white font-black">≥ 200đ</span> và không có vi phạm điều cấm.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-400/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-black text-purple-400">04</span>
                  </div>
                  <p className="text-xs font-medium text-slate-300 leading-relaxed">
                    Học sinh vi phạm hệ thống hoặc điều cấm sẽ bị xử lý <span className="text-white font-black">Lao động trường</span> theo quy định.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Info className="w-5 h-5" /></div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Phân hạng Thi đua</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Hạng TỐT', range: '≥ 200đ', color: 'emerald' },
                { label: 'Hạng KHÁ', range: '180 - 200đ', color: 'indigo' },
                { label: 'Hạng ĐẠT', range: '150 - 180đ', color: 'amber' },
                { label: 'CHƯA ĐẠT', range: '< 150đ', color: 'rose' },
              ].map((rank, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100">
                  <span className={cn("text-[10px] font-black uppercase tracking-wider", `text-${rank.color}-600`)}>{rank.label}</span>
                  <span className="text-xs font-black text-slate-700">{rank.range}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold italic mt-4">* Điểm chuẩn căn cứ trên 200đ gốc mỗi tuần.</p>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100/80 flex flex-col h-[450px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><TrendingUp className="w-4 h-4" /></div>
              Xu hướng nề nếp
            </h3>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => onNavigate('reports')}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
              >
                Xem phân tích chuyên sâu <ArrowUpRight className="w-3 h-3" />
              </button>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Vi phạm</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Tuyên dương</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                   <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRewards" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                  itemStyle={{fontSize: '11px', fontWeight: 'bold'}}
                  labelStyle={{fontSize: '10px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'black'}}
                />
                <Area type="monotone" dataKey="violations" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorViolations)" />
                <Area type="monotone" dataKey="rewards" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRewards)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="bg-white p-8 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100/80 flex flex-col h-[450px]">
          <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600"><Database className="w-4 h-4" /></div>
            Nguồn dữ liệu
          </h3>
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceChartData} cx="50%" cy="50%" innerRadius={75} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                  {sourceChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng cộng</p>
              <p className="text-3xl font-light text-slate-900">{totalViolations}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-[0_2px_8_rgba(0,0,0,0.04)] border border-slate-100/80 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400"><Clock className="w-4 h-4" /></div>
              Hoạt động gần đây
            </div>
            {(userRole === 'ADMIN' || userRole === 'TASKFORCE') && (
              <button 
                onClick={() => onNavigate('violations')}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
              >
                Xem tất cả
              </button>
            )}
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic hidden sm:inline">Thời gian thực</span>
          </h3>
          <div className="space-y-0 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 border-t border-slate-100 dark:border-slate-700">
            {filteredViolations.slice().reverse().slice(0, 10).map((v, i) => (
              <motion.div 
                key={v.id} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 py-4 border-b border-slate-100 dark:border-slate-700 hover:bg-white/50 dark:hover:bg-slate-700/50 transition-all group cursor-default px-2"
              >
                <div className="relative">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono text-[11px] shadow-sm border border-white dark:border-slate-700 shrink-0", 
                    v.points < 0 ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  )}>
                    <span className="text-[10px] opacity-50 font-bold">{v.points > 0 ? '+' : ''}</span>
                    <span className="text-sm font-black leading-none">{Math.abs(v.points)}</span>
                  </div>
                  {i === 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{v.studentName}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">Lớp {v.className}</span>
                        <span className={cn(
                          "text-[8px] font-black",
                          classScores[v.className] >= 190 ? "text-emerald-500" : classScores[v.className] >= 170 ? "text-amber-500" : "text-rose-500"
                        )}>
                          ({classScores[v.className]}đ)
                        </span>
                      </div>
                      {v.isCollective && (
                        <span className="text-[8px] font-black bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-purple-200 dark:border-purple-800">Tập thể</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">{v.date}</span>
                      {(userRole === 'ADMIN' || v.recordedBy === currentUser?.name) && onDeleteViolations && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Bạn có chắc chắn muốn xoá bản ghi này?')) {
                              onDeleteViolations([v.id]);
                            }
                          }}
                          className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                          title="Xoá bản ghi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 italic font-serif">
                    <span className={cn("font-bold mr-1.5 not-italic", v.points < 0 ? "text-rose-500" : "text-emerald-500")}>{v.type}</span>
                    <span className={cn(
                      "text-[8px] font-black px-1 py-0.5 rounded mr-1.5 uppercase tracking-tighter",
                      v.points > 0 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : 
                      (v.type.includes('(Lớp)') || v.type.startsWith('Tiết ')) ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                    )}>
                      {v.points > 0 ? 'Khen thưởng' : (v.type.includes('(Lớp)') || v.type.startsWith('Tiết ')) ? 'Tập thể' : 'Cá nhân'}
                    </span>
                    {v.note}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-[0_2px_8_rgba(0,0,0,0.04)] border border-slate-100/80 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400"><Calendar className="w-4 h-4" /></div>
            Mật độ vi phạm theo thứ
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={heatmapData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff'}}
                />
                <Bar 
                  dataKey="count" 
                  radius={[10, 10, 0, 0]}
                  onClick={(data) => setSelectedChartFilter(selectedChartFilter === data.day ? null : data.day)}
                  cursor="pointer"
                >
                  {heatmapData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={selectedChartFilter === entry.day ? '#3b82f6' : (entry.count > 5 ? '#f43f5e' : entry.count > 2 ? '#f59e0b' : '#94a3b8')} 
                      className="transition-all duration-300"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              <Info className="w-3 h-3" /> Chú giải mật độ
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Thấp</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Trung bình</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Cao</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* New Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.8 }}
          className="bg-white p-8 rounded-3xl shadow-[0_2px_8_rgba(0,0,0,0.04)] border border-slate-100/80 h-[450px] flex flex-col"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Trophy className="w-4 h-4" /></div>
              Bảng vàng Tuần
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Top 3 Lớp</span>
          </h3>
          <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
            {filteredClassStats.slice(0, 3).map((stat, i) => (
              <div key={stat.className} className="relative p-5 rounded-[2rem] bg-white border border-slate-100 flex items-center gap-4 group hover:bg-white transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border-2",
                  i === 0 ? "bg-amber-100 text-amber-600 border-amber-200" :
                  i === 1 ? "bg-slate-200 text-slate-600 border-slate-300" :
                  "bg-orange-100 text-orange-600 border-orange-200"
                )}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-base font-black text-slate-800">Lớp {stat.className}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.studentCount} học sinh • {stat.excellentCount} XS</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-emerald-500 font-mono">{stat.avgScore.toFixed(1)}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Điểm TB</p>
                </div>
              </div>
            ))}
            <button 
              onClick={() => onNavigate('classes')}
              className="w-full mt-4 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all"
            >
              Xem tất cả xếp hạng
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.9 }}
          className="bg-white p-8 rounded-3xl shadow-[0_2px_8_rgba(0,0,0,0.04)] border border-slate-100/80 h-[450px] flex flex-col"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-3">
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><AlertTriangle className="w-4 h-4" /></div>
            Cơ cấu loại vi phạm
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={violationTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {violationTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-[9px] font-bold text-slate-500 uppercase">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.9 }}
          className="bg-white p-8 rounded-3xl shadow-[0_2px_8_rgba(0,0,0,0.04)] border border-slate-100/80 h-[450px] flex flex-col"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Users className="w-4 h-4" /></div>
            Phân bổ điểm số học sinh
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistributionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                  {scoreDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 1.0 }}
          className="bg-white p-8 rounded-3xl shadow-[0_2px_8_rgba(0,0,0,0.04)] border border-slate-100/80 h-[450px] flex flex-col"
        >
          <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Sparkles className="w-4 h-4" /></div>
            So sánh Top 5 Lớp
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={classRadarData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                {topClassesList.map((cls, idx) => (
                  <Radar
                    key={cls}
                    name={`Lớp ${cls}`}
                    dataKey={cls}
                    stroke={COLORS[idx % COLORS.length]}
                    fill={COLORS[idx % COLORS.length]}
                    fillOpacity={0.3}
                  />
                ))}
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Weekly Plan Modal */}
      <AnimatePresence>
        {showPlanModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Kế hoạch Nề nếp Tuần tới</h3>
                </div>
                <button 
                  onClick={() => setShowPlanModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-all text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6">
                {isGeneratingPlan ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest">AI đang lập kế hoạch...</p>
                  </div>
                ) : (
                  <div className="prose prose-slate max-w-none">
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                      {weeklyPlan}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setShowPlanModal(false)}
                  className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white transition-all"
                >
                  Đóng
                </button>
                <button 
                  onClick={() => {
                    alert("Kế hoạch đã được lưu và gửi đến GVCN các lớp.");
                    setShowPlanModal(false);
                  }}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all"
                >
                  Phê duyệt & Ban hành
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showMonitorPortal && onAddRecord && (
        <ClassMonitorPortal 
          students={students} 
          violations={violations}
          onAddRecord={onAddRecord} 
          onClose={() => setShowMonitorPortal(false)} 
          currentUser={currentUser} 
        />
      )}
    </div>
  );
};

export default Dashboard;
