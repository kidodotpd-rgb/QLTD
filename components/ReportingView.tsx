
import React, { useState, useMemo } from 'react';
import { Student, ViolationRecord, Role, User } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { 
  FileText, TrendingUp, Users, AlertTriangle, Trophy, Download, 
  Filter, Calendar, PieChart as PieChartIcon, BarChart3, Sparkles,
  ArrowUpRight, ArrowDownRight, Activity, Target, ShieldCheck, Loader2,
  BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getSchoolWeekInfo, parseDate, mockNow, getWeekDateRange } from '../src/utils/dateUtils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateWeeklyReportSummary, analyzeBehaviorPatterns } from '../services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ReportingViewProps {
  students: Student[];
  violations: ViolationRecord[];
  userRole: Role;
  currentUser: User;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4'];

const ReportingView: React.FC<ReportingViewProps> = ({
  students,
  violations,
  userRole,
  currentUser
}) => {
  const [timeRange, setTimeRange] = useState<'Week' | 'Month' | 'Semester'>('Week');
  const [selectedWeek, setSelectedWeek] = useState(getSchoolWeekInfo(mockNow).week);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [behaviorAnalysis, setBehaviorAnalysis] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isAnalyzingBehavior, setIsAnalyzingBehavior] = useState(false);
  const [compareClassA, setCompareClassA] = useState<string>('');
  const [compareClassB, setCompareClassB] = useState<string>('');

  // --- Data Processing ---

  const handleGenerateAiSummary = async () => {
    setIsGeneratingAi(true);
    try {
      const summary = await generateWeeklyReportSummary({ students, violations: filteredViolations });
      setAiSummary(summary);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAnalyzeBehavior = async () => {
    setIsAnalyzingBehavior(true);
    try {
      const analysis = await analyzeBehaviorPatterns({ students, violations: filteredViolations });
      setBehaviorAnalysis(analysis);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzingBehavior(false);
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(20);
    doc.text(`BÁO CÁO NỀ NẾP - ${timeRange === 'Week' ? 'TUẦN' : timeRange === 'Month' ? 'THÁNG' : 'HỌC KỲ'} ${selectedWeek}`, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Ngày xuất: ${new Date().toLocaleString('vi-VN')}`, 105, 28, { align: 'center' });

    autoTable(doc, {
      startY: 40,
      head: [['Ngày', 'Lớp', 'Học sinh', 'Nội dung', 'Điểm']],
      body: filteredViolations.map(v => [v.date, v.className, v.studentName, v.type, v.points]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Bao_cao_${timeRange}_${selectedWeek}.pdf`);
  };

  const filteredViolations = useMemo(() => {
    if (timeRange === 'Week') {
      return violations.filter(v => getSchoolWeekInfo(parseDate(v.date)).week === selectedWeek);
    }
    if (timeRange === 'Month') {
      return violations.filter(v => {
        const date = parseDate(v.date);
        return (date.getMonth() + 1) === selectedWeek;
      });
    }
    return violations;
  }, [violations, timeRange, selectedWeek]);

  const stats = useMemo(() => {
    const total = filteredViolations.length;
    const rewards = filteredViolations.filter(v => v.points > 0).length;
    const critical = filteredViolations.filter(v => v.points <= -10).length;
    const avgScore = students.length > 0 ? students.reduce((acc, s) => acc + s.score, 0) / students.length : 0;
    
    return { total, rewards, critical, avgScore };
  }, [filteredViolations, students]);

  const classPerformanceData = useMemo(() => {
    const classMap: Record<string, { name: string, violations: number, rewards: number, score: number }> = {};
    
    // Initialize
    const uniqueClasses = Array.from(new Set(students.map(s => s.class))) as string[];
    uniqueClasses.forEach(c => {
      classMap[c] = { name: c, violations: 0, rewards: 0, score: 0 };
    });

    filteredViolations.forEach(v => {
      if (classMap[v.className]) {
        if (v.points < 0) classMap[v.className].violations += 1;
        else classMap[v.className].rewards += 1;
      }
    });

    return Object.values(classMap).map(c => ({
      ...c,
      ratio: c.rewards / (c.violations || 1)
    })).sort((a, b) => b.rewards - a.rewards);
  }, [filteredViolations, students]);

  const violationTypeDistribution = useMemo(() => {
    const typeMap: Record<string, number> = {};
    filteredViolations.filter(v => v.points < 0).forEach(v => {
      typeMap[v.type] = (typeMap[v.type] || 0) + 1;
    });
    return Object.entries(typeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredViolations]);

  const dailyTrendData = useMemo(() => {
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days.map(day => {
      const dayVios = filteredViolations.filter(v => {
        const d = parseDate(v.date).getDay();
        const dayMap: Record<number, string> = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7' };
        return dayMap[d] === day;
      });
      return {
        name: day,
        violations: dayVios.filter(v => v.points < 0).length,
        rewards: dayVios.filter(v => v.points > 0).length
      };
    });
  }, [filteredViolations]);

  const comparisonData = useMemo(() => {
    if (!compareClassA || !compareClassB) return [];
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days.map(day => {
      const getVios = (className: string) => filteredViolations.filter(v => {
        const d = parseDate(v.date).getDay();
        const dayMap: Record<number, string> = { 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7' };
        return dayMap[d] === day && v.className === className;
      });
      return {
        name: day,
        [compareClassA]: getVios(compareClassA).reduce((acc, v) => acc + v.points, 0),
        [compareClassB]: getVios(compareClassB).reduce((acc, v) => acc + v.points, 0)
      };
    });
  }, [filteredViolations, compareClassA, compareClassB]);

  const exportReport = () => {
    const data = filteredViolations.map(v => ({
      'Ngày': v.date,
      'Lớp': v.className,
      'Học sinh': v.studentName,
      'Nội dung': v.type,
      'Điểm': v.points,
      'Người ghi': v.recordedBy
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Báo cáo");
    XLSX.writeFile(wb, `Bao_cao_ne_nep_${timeRange}_${selectedWeek}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Editorial Header */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-10 sm:-mr-20 -mt-10 sm:-mt-20" />
        <div className="absolute bottom-0 left-0 w-48 sm:w-64 h-48 sm:h-64 bg-emerald-500/10 rounded-full blur-3xl -ml-10 sm:-ml-20 -mb-10 sm:-mb-20" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-500/30">
                Analytics Engine v2.5
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black tracking-tighter leading-[0.85] mb-4 sm:mb-6">
              BÁO CÁO <br /> <span className="text-slate-500">HỆ THỐNG.</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg font-medium max-w-md leading-relaxed">
              Phân tích chuyên sâu dữ liệu nề nếp và thi đua của toàn trường trong giai đoạn hiện tại.
            </p>
          </div>

          <div className="flex flex-col gap-4 w-full lg:w-auto">
            <div className="flex bg-white/5 p-1 rounded-xl sm:p-1.5 sm:rounded-2xl border border-white/10 backdrop-blur-md overflow-x-auto">
              {(['Week', 'Month', 'Semester'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "flex-1 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    timeRange === range ? "bg-white text-slate-900 shadow-xl" : "text-slate-400 hover:text-white"
                  )}
                >
                  {range === 'Week' ? 'Tuần' : range === 'Month' ? 'Tháng' : 'Học kỳ'}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {timeRange === 'Week' && (
                <select 
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="flex-1 lg:flex-none bg-white/10 border border-white/20 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest px-3 sm:px-4 py-2 sm:py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                >
                  {Array.from({ length: 35 }, (_, i) => i + 1).map(w => (
                    <option key={w} value={w} className="text-slate-900">Tuần {w} ({getWeekDateRange(w)})</option>
                  ))}
                </select>
              )}
              {timeRange === 'Month' && (
                <select 
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="flex-1 lg:flex-none bg-white/10 border border-white/20 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest px-3 sm:px-4 py-2 sm:py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                >
                  {[9, 10, 11, 12, 1, 2, 3, 4, 5].map(m => (
                    <option key={m} value={m} className="text-slate-900">Tháng {m}</option>
                  ))}
                </select>
              )}
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleExportPdf}
                  className="flex-1 px-4 sm:px-8 py-3 sm:py-4 bg-indigo-600 text-white rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 h-4" /> PDF
                </button>
                <button 
                  onClick={exportReport}
                  className="flex-1 px-4 sm:px-8 py-3 sm:py-4 bg-emerald-500 text-white rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 h-4" /> Excel
                </button>
                <button className="w-10 h-10 sm:w-14 sm:h-14 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-white hover:bg-white/10 transition-all">
                  <Filter className="w-4 h-4 sm:w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Tổng ghi nhận', value: stats.total, sub: 'Bản ghi mới', icon: Activity, color: 'indigo' },
          { label: 'Khen thưởng', value: stats.rewards, sub: 'Tích cực', icon: Trophy, color: 'emerald' },
          { label: 'Vi phạm nghiêm trọng', value: stats.critical, sub: 'Cần chú ý đặc biệt', icon: AlertTriangle, color: 'rose' },
          { label: 'Điểm TB Toàn trường', value: stats.avgScore.toFixed(1), sub: 'Chỉ số trung bình', icon: Target, color: 'indigo' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all duration-500"
          >
            <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 transition-transform group-hover:scale-110 duration-500", 
              item.color === 'indigo' ? "bg-indigo-50 text-indigo-600" :
              item.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
              item.color === 'rose' ? "bg-rose-50 text-rose-600" :
              "bg-indigo-50 text-indigo-600"
            )}>
              <item.icon className="w-5 h-5 sm:w-6 h-6" />
            </div>
            <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter mb-2">{item.value}</h3>
            <p className="text-[10px] sm:text-xs font-bold text-slate-500">{item.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-10">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Biểu đồ Xu hướng</h3>
              <p className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">So sánh Vi phạm & Khen thưởng</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500" />
                 <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase">Vi phạm</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500" />
                 <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase">Khen thưởng</span>
               </div>
            </div>
          </div>
          <div className="h-[300px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData}>
                <defs>
                  <linearGradient id="colorVio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 8, fontWeight: 800}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 8, fontWeight: 800}} 
                />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                  cursor={{stroke: '#e2e8f0', strokeWidth: 2}}
                />
                <Area type="monotone" dataKey="violations" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorVio)" />
                <Area type="monotone" dataKey="rewards" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRew)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Violation Distribution Donut */}
        <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">Cơ cấu Lỗi</h3>
          <p className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 sm:mb-10">Phân loại theo nội dung</p>
          <div className="flex-1 min-h-[250px] sm:min-h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={violationTypeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {violationTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng lỗi</p>
              <p className="text-2xl sm:text-4xl font-black text-slate-900">{violationTypeDistribution.reduce((acc, curr) => acc + curr.value, 0)}</p>
            </div>
          </div>
          <div className="mt-6 sm:mt-8 space-y-2 sm:space-y-3">
            {violationTypeDistribution.slice(0, 4).map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] sm:text-xs font-bold text-slate-600 truncate max-w-[120px] sm:max-w-[150px]">{item.name}</span>
                </div>
                <span className="text-[10px] sm:text-xs font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Class Matrix & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Class Performance Matrix */}
        <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8 sm:mb-10">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Ma trận Hiệu suất</h3>
              <p className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Vi phạm vs Khen thưởng theo Lớp</p>
            </div>
            <div className="p-2.5 sm:p-3 bg-white rounded-xl sm:rounded-2xl border border-slate-100">
              <Target className="w-4 h-4 sm:w-5 h-5 text-slate-400" />
            </div>
          </div>
          <div className="h-[300px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="violations" name="Vi phạm" unit=" lỗi" axisLine={false} tick={{fill: '#94a3b8', fontSize: 8, fontWeight: 800}} />
                <YAxis type="number" dataKey="rewards" name="Khen thưởng" unit=" lượt" axisLine={false} tick={{fill: '#94a3b8', fontSize: 8, fontWeight: 800}} />
                <ZAxis type="number" dataKey="score" range={[50, 500]} name="Điểm" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Scatter name="Lớp" data={classPerformanceData} fill="#4f46e5">
                  {classPerformanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 sm:mt-6 flex justify-center gap-6 sm:gap-8">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 h-4 text-emerald-500" />
              <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase">Hiệu suất cao</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 h-4 text-rose-500" />
              <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase">Cần cải thiện</span>
            </div>
          </div>
        </div>

        {/* Ranking List with Visual Progress */}
        <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">Xếp hạng Hiệu quả</h3>
          <p className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-8 sm:mb-10">Tỷ lệ Khen thưởng / Vi phạm</p>
          <div className="space-y-4 sm:space-y-6">
            {classPerformanceData.slice(0, 6).map((cls, i) => (
              <div key={cls.name} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-base sm:text-lg font-black text-slate-900">Lớp {cls.name}</span>
                    <span className={cn("text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded uppercase tracking-widest", 
                      cls.ratio >= 2 ? "bg-emerald-100 text-emerald-600" : 
                      cls.ratio >= 1 ? "bg-indigo-100 text-indigo-600" : "bg-rose-100 text-rose-600"
                    )}>
                      x{cls.ratio.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400">{cls.rewards} Khen • {cls.violations} Lỗi</span>
                </div>
                <div className="h-2 sm:h-3 bg-white rounded-full overflow-hidden border border-slate-100">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, cls.ratio * 25)}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={cn("h-full rounded-full", 
                      cls.ratio >= 2 ? "bg-emerald-500" : 
                      cls.ratio >= 1 ? "bg-indigo-500" : "bg-rose-500"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 sm:mt-10 py-4 sm:py-5 border-2 border-dashed border-slate-200 rounded-2xl sm:rounded-[2rem] text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all">
            Xem chi tiết toàn bộ 35 lớp
          </button>
        </div>
      </div>

      {/* Class Comparison Section */}
      <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">So sánh Đối kháng</h3>
            <p className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">So sánh điểm thi đua giữa 2 lớp</p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <select 
              value={compareClassA}
              onChange={(e) => setCompareClassA(e.target.value)}
              className="flex-1 sm:w-32 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Lớp A</option>
              {Array.from(new Set(students.map(s => s.class))).sort().map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="text-[10px] font-black text-slate-300 uppercase">vs</div>
            <select 
              value={compareClassB}
              onChange={(e) => setCompareClassB(e.target.value)}
              className="flex-1 sm:w-32 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Lớp B</option>
              {Array.from(new Set(students.map(s => s.class))).sort().map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {compareClassA && compareClassB ? (
          <div className="h-[300px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 8, fontWeight: 800}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 8, fontWeight: 800}} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase'}} />
                <Bar dataKey={compareClassA} fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey={compareClassB} fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] sm:h-[400px] flex flex-col items-center justify-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Chọn 2 lớp để bắt đầu so sánh</p>
          </div>
        )}
      </div>

      {/* AI Insights Atmospheric Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 text-white shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-10 right-10 w-48 sm:w-64 h-48 sm:h-64 bg-white rounded-full blur-[80px] sm:blur-[100px]" />
            <div className="absolute bottom-10 left-10 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-400 rounded-full blur-[100px] sm:blur-[120px]" />
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <div className="p-2 sm:p-3 bg-white/20 rounded-xl sm:rounded-2xl backdrop-blur-md">
                <Sparkles className="w-5 h-5 sm:w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">AI Report Generator</h3>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none mb-6 sm:mb-8">
              TỔNG HỢP <br /> THÔNG MINH.
            </h2>
            <p className="text-indigo-100 text-base sm:text-lg font-medium leading-relaxed mb-8 sm:mb-10">
              Sử dụng trí tuệ nhân tạo để phân tích các biến động bất thường và đưa ra dự báo về xu hướng nề nếp.
            </p>
            
            {aiSummary ? (
              <div className="flex-1 bg-white/10 backdrop-blur-xl p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10 overflow-y-auto custom-scrollbar mb-8">
                <p className="text-xs sm:text-sm leading-relaxed text-indigo-50 whitespace-pre-wrap">{aiSummary}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { label: 'Dự báo xu hướng', icon: TrendingUp, val: '+15%' },
                  { label: 'Độ tin cậy', icon: ShieldCheck, val: '98%' },
                ].map((box, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-xl p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10">
                    <box.icon className="w-4 h-4 sm:w-5 h-5 mb-3 sm:mb-4 text-indigo-200" />
                    <p className="text-[8px] sm:text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">{box.label}</p>
                    <p className="text-xl sm:text-2xl font-black">{box.val}</p>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={handleGenerateAiSummary}
              disabled={isGeneratingAi}
              className="mt-auto w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white text-indigo-600 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGeneratingAi && <Loader2 className="w-4 h-4 animate-spin" />}
              {aiSummary ? 'Cập nhật báo cáo' : 'Bắt đầu phân tích ngay'}
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="relative overflow-hidden bg-slate-900 rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 text-white shadow-2xl border border-slate-800"
        >
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <div className="p-2 sm:p-3 bg-indigo-500/20 rounded-xl sm:rounded-2xl backdrop-blur-md text-indigo-400">
                <BrainCircuit className="w-5 h-5 sm:w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">Behavior Pattern Analysis</h3>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none mb-6 sm:mb-8">
              PHÂN TÍCH <br /> HÀNH VI.
            </h2>
            <p className="text-slate-400 text-base sm:text-lg font-medium leading-relaxed mb-8 sm:mb-10">
              Phát hiện các mẫu hành vi lặp lại, xu hướng theo thời gian và đề xuất các giải pháp giáo dục tích cực.
            </p>
            
            {behaviorAnalysis ? (
              <div className="flex-1 bg-slate-800/50 backdrop-blur-xl p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-700 overflow-y-auto custom-scrollbar mb-8">
                <p className="text-xs sm:text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">{behaviorAnalysis}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { label: 'Dữ liệu quét', icon: FileText, val: filteredViolations.length },
                  { label: 'Cảnh báo sớm', icon: AlertTriangle, val: stats.critical },
                ].map((box, i) => (
                  <div key={i} className="bg-slate-800/50 backdrop-blur-xl p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-700">
                    <box.icon className="w-4 h-4 sm:w-5 h-5 mb-3 sm:mb-4 text-slate-500" />
                    <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{box.label}</p>
                    <p className="text-xl sm:text-2xl font-black">{box.val}</p>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={handleAnalyzeBehavior}
              disabled={isAnalyzingBehavior}
              className="mt-auto w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-indigo-600 text-white rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAnalyzingBehavior && <Loader2 className="w-4 h-4 animate-spin" />}
              {behaviorAnalysis ? 'Cập nhật phân tích' : 'Phân tích mẫu hành vi'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ReportingView;
