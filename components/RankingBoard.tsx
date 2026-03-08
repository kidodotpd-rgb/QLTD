
import React, { useState, useMemo } from 'react';
import { Student, ViolationRecord, Role, ClassRemark, User } from '../types';
import { WEEKLY_BASE_SCORE, CLASS_FAULT_TYPES, PROHIBITED_TYPES } from '../constants';
import { mockNow, getSchoolWeekInfo, parseDate, getWeekDateRange } from '../src/utils/dateUtils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  ChevronDown, 
  Trash2, 
  ListTodo, 
  CheckCircle2,
  Trophy,
  Calendar,
  Filter,
  FileOutput,
  MessageSquare,
  Save,
  Sparkles,
  FileText,
  Table as TableIcon,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RankingBoardProps {
  students: Student[];
  violations: ViolationRecord[];
  userRole?: Role;
  onDeleteViolations?: (ids: string[]) => void;
  onDeleteClassesData?: (classNames: string[]) => void;
  onDeleteClassWeekData?: (className: string, week: number) => void;
  onDeleteBulkClassWeekData?: (classNames: string[], weeks: number[]) => void;
  onDeleteAllDataForPeriod?: (periodType: 'Week' | 'Month', value: number | string) => void;
  isGoodStudyWeek?: boolean;
  onToggleGoodStudyWeek?: (value: boolean) => void;
  classRemarks?: ClassRemark[];
  onUpdateClassRemark?: (remark: ClassRemark) => void;
  currentUser?: User;
  onAddRecord?: (record: ViolationRecord) => void;
}

type Period = 'Week' | 'Month' | 'Semester1' | 'Semester2' | 'Year';

const RankingBoard: React.FC<RankingBoardProps> = ({ 
  students, 
  violations, 
  userRole, 
  onDeleteViolations,
  onDeleteClassesData,
  onDeleteClassWeekData,
  onDeleteBulkClassWeekData,
  onDeleteAllDataForPeriod,
  isGoodStudyWeek = false,
  onToggleGoodStudyWeek,
  classRemarks = [],
  onUpdateClassRemark,
  currentUser,
  onAddRecord
}) => {
  const [period, setPeriod] = useState<Period>('Week'); 
  const [selectedWeek, setSelectedWeek] = useState<number>(getSchoolWeekInfo(mockNow).week);
  const [selectedMonth, setSelectedMonth] = useState<number>(getSchoolWeekInfo(mockNow).reportMonth);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [selectedViolationIds, setSelectedViolationIds] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([getSchoolWeekInfo(mockNow).week]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [editingRemark, setEditingRemark] = useState<{ className: string, text: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAddRecord) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const recordsToAdd: ViolationRecord[] = [];
        data.forEach((row, index) => {
          const className = row['Lớp'] || row.class || row.className;
          const points = Number(row['Điểm'] || row.points || 0);
          const type = row['Loại'] || row.type || 'Điểm phát sinh';
          const note = row['Ghi chú'] || row.note || 'Nhập từ Excel';
          const date = row['Ngày'] || row.date || mockNow.toLocaleDateString('vi-VN');

          if (className) {
            recordsToAdd.push({
              id: `IMP-CLASS-${className}-${Date.now()}-${index}`,
              studentId: `CLASS-${className}`,
              studentName: `TẬP THỂ LỚP ${className}`,
              className: String(className),
              type: type,
              points: points,
              date: date,
              note: note,
              recordedBy: currentUser?.name || 'Hệ thống',
              recordedRole: currentUser?.role || 'ADMIN',
              isCollective: true
            });
          }
        });

        if (recordsToAdd.length > 0) {
          recordsToAdd.forEach(r => onAddRecord(r));
          alert(`Đã nhập thành công ${recordsToAdd.length} bản ghi điểm thi đua lớp.`);
        } else {
          alert('Không tìm thấy dữ liệu hợp lệ trong file Excel.');
        }
      } catch (error) {
        console.error("Import error:", error);
        alert("Có lỗi khi đọc file. Vui lòng kiểm tra định dạng Excel (Cột: Lớp, Điểm, Loại, Ghi chú, Ngày).");
      }
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkDelete = () => {
    if (selectedClasses.length === 0) {
      alert('Vui lòng chọn ít nhất một lớp.');
      return;
    }
    if (selectedWeeks.length === 0) {
      alert('Vui lòng chọn ít nhất một tuần.');
      return;
    }
    if (onDeleteBulkClassWeekData) {
      if (window.confirm(`Xoá dữ liệu của ${selectedClasses.length} lớp trong ${selectedWeeks.length} tuần đã chọn?`)) {
        onDeleteBulkClassWeekData(selectedClasses, selectedWeeks);
        setSelectedClasses([]);
        setIsBulkMode(false);
      }
    }
  };

  const toggleWeekSelection = (week: number) => {
    setSelectedWeeks(prev => 
      prev.includes(week) 
      ? prev.filter(w => w !== week) 
      : [...prev, week].sort((a, b) => a - b)
    );
  };

  // Helper: Parse date DD/MM/YYYY
  // const parseDate = (dateStr: string) => {
  //   const [d, m, y] = dateStr.split('/').map(Number);
  //   return new Date(y, m - 1, d);
  // };

  // Helper to calculate weekly scores for all classes
  const allWeeklyScores = useMemo(() => {
    const scores: Record<string, Record<number, number>> = {}; 
    const uniqueClasses = Array.from(new Set(students.map(s => s.class))) as string[];
    
    uniqueClasses.forEach(cls => {
      scores[cls] = {};
    });

    for (let w = 1; w <= 35; w++) {
      const weekViolations = violations.filter(v => getSchoolWeekInfo(parseDate(v.date)).week === w);
      
      uniqueClasses.forEach(cls => {
        const classWeekViolations = weekViolations.filter(v => v.className === cls);
        let bonus = 0;
        let penalty = 0;
        // In good study weeks, points are doubled
        const multiplier = (w === selectedWeek && isGoodStudyWeek) ? 2 : 1;

        const classFaultsProcessed = new Set<string>();

        // Tự động cộng điểm "100% giờ A" nếu không có tiết B, C, D
        const hasBadPeriod = classWeekViolations.some(v => 
          ['Tiết B', 'Tiết C', 'Tiết D', 'Tiết không đánh giá'].includes(v.type)
        );
        if (!hasBadPeriod) bonus += 40 * multiplier;

        // Tự động cộng điểm "Sĩ số tốt" nếu không có vắng không phép, trễ, trốn
        const hasBadAttendance = classWeekViolations.some(v => 
          ['Vắng không phép', 'Trốn tiết', 'Đi học trễ', 'Trốn tập trung'].includes(v.type)
        );
        if (!hasBadAttendance) bonus += 15 * multiplier;

        classWeekViolations.forEach(v => {
          // Tránh cộng trùng nếu người dùng đã nhập thủ công các mục tự động
          if (v.type === 'Lớp 100% giờ A' || v.type === 'Duy trì sĩ số tốt') return;

          const adjustedPoints = v.points * multiplier;
          if (v.isCollective || CLASS_FAULT_TYPES.includes(v.type)) {
            const faultKey = `${v.type}-${v.date}`;
            if (!classFaultsProcessed.has(faultKey)) {
              if (v.points > 0) bonus += adjustedPoints;
              else penalty += Math.abs(adjustedPoints);
              classFaultsProcessed.add(faultKey);
            }
          } else {
            if (v.points > 0) bonus += adjustedPoints;
            else penalty += Math.abs(adjustedPoints);
          }
        });
        
        scores[cls][w] = 200 + bonus - penalty;
      });
    }
    return scores;
  }, [violations, students, selectedWeek, isGoodStudyWeek]);

  const getClassification = (score: number, hasProhibited: boolean) => {
    let level = 0; // 0: Chưa đạt, 1: Đạt, 2: Khá, 3: Tốt
    if (score >= 200) level = 3;
    else if (score >= 180) level = 2;
    else if (score >= 150) level = 1;
    else level = 0;

    if (hasProhibited && level > 0) {
      level -= 1;
    }

    const labels = ['CHƯA ĐẠT', 'ĐẠT', 'KHÁ', 'TỐT'];
    return labels[level];
  };

  // 2. Tính toán thống kê theo lớp sử dụng công thức mới
  const rankingData = useMemo(() => {
    const currentWeekInfo = getSchoolWeekInfo(mockNow);
    const currentWeek = currentWeekInfo.week;
    const uniqueClasses = Array.from(new Set(students.map(s => s.class))) as string[];

    const stats = uniqueClasses.map(cls => {
      const classScores = allWeeklyScores[cls];
      
      // HK1: Tuần 1-18
      let hk1Sum = 0;
      let hk1Count = 0;
      for (let w = 1; w <= 18; w++) {
        if (w <= currentWeek) {
          hk1Sum += classScores[w] || 200;
          hk1Count++;
        }
      }
      const hk1Avg = hk1Count > 0 ? Number((hk1Sum / hk1Count).toFixed(2)) : 200;

      // HK2: Tuần 19-35
      let hk2Sum = 0;
      let hk2Count = 0;
      for (let w = 19; w <= 35; w++) {
        if (w <= currentWeek) {
          hk2Sum += classScores[w] || 200;
          hk2Count++;
        }
      }
      const hk2Avg = hk2Count > 0 ? Number((hk2Sum / hk2Count).toFixed(2)) : (currentWeek < 19 ? 0 : 200);

      // Cả năm: (HK1 + HK2*2)/3
      const yearScore = hk2Avg > 0 
        ? Number(((hk1Avg + hk2Avg * 2) / 3).toFixed(2))
        : hk1Avg;

      let displayScore = 0;
      let periodVios: ViolationRecord[] = [];

      if (period === 'Week') {
        displayScore = classScores[selectedWeek] || 200;
        periodVios = violations.filter(v => v.className === cls && getSchoolWeekInfo(parseDate(v.date)).week === selectedWeek);
      } else if (period === 'Month') {
        // Average of weeks in month
        let mSum = 0;
        let mCount = 0;
        
        // Pre-calculate which weeks belong to which month based on Sunday
        for (let w = 1; w <= 35; w++) {
            // Find a date in this week to check its reportMonth
            // Week 1 starts 05/09/2025. Week 2 starts 08/09/2025.
            let dateInWeek: Date;
            if (w === 1) {
                dateInWeek = new Date(2025, 8, 6); // Saturday of week 1
            } else {
                dateInWeek = new Date(2025, 8, 8 + (w - 2) * 7 + 3); // Thursday of week w
            }
            
            const weekInfo = getSchoolWeekInfo(dateInWeek);
            if (weekInfo.reportMonth === selectedMonth && w <= currentWeek) {
                mSum += classScores[w] || 200;
                mCount++;
            }
        }
        displayScore = mCount > 0 ? Number((mSum / mCount).toFixed(2)) : 200;
        periodVios = violations.filter(v => v.className === cls && getSchoolWeekInfo(parseDate(v.date)).reportMonth === selectedMonth);
      } else if (period === 'Semester1') {
        displayScore = hk1Avg;
        periodVios = violations.filter(v => v.className === cls && getSchoolWeekInfo(parseDate(v.date)).week <= 18);
      } else if (period === 'Semester2') {
        displayScore = hk2Avg;
        periodVios = violations.filter(v => v.className === cls && getSchoolWeekInfo(parseDate(v.date)).week >= 19);
      } else if (period === 'Year') {
        displayScore = yearScore;
        periodVios = violations.filter(v => v.className === cls);
      }

      const hasProhibited = periodVios.some(v => PROHIBITED_TYPES.includes(v.type));
      const classification = getClassification(displayScore, hasProhibited);

      // Calculate detailed deductions for Week/Month views
      let individualDeductions = 0;
      let classDeductions = 0;
      let bonusPoints = 0;
      let baseScore = 200;

      const classFaultsProcessed = new Set<string>();

      if (period === 'Week' || period === 'Month') {
          periodVios.forEach(v => {
              const multiplier = (period === 'Week' && isGoodStudyWeek) ? 2 : 1;
              const adjustedPoints = v.points * multiplier;
              if (v.points > 0) bonusPoints += adjustedPoints;
              else {
                  const isClassFault = v.isCollective || CLASS_FAULT_TYPES.includes(v.type);
                  if (isClassFault) {
                      const faultKey = `${v.type}-${v.date}-${v.className}`;
                      if (!classFaultsProcessed.has(faultKey)) {
                          classDeductions += Math.abs(adjustedPoints);
                          classFaultsProcessed.add(faultKey);
                      }
                  } else {
                      individualDeductions += Math.abs(adjustedPoints);
                  }
              }
          });
          if (period === 'Month') {
              // For month, we show the total deductions over the month
              baseScore = 200 * 4; // Approximate
          }
      }

      return {
        className: cls,
        studentCount: students.filter(s => s.class === cls).length,
        baseScore,
        individualDeductions,
        classDeductions,
        bonusPoints,
        totalScore: displayScore,
        hk1Avg,
        hk2Avg,
        yearScore,
        hasProhibited,
        classification,
        details: periodVios
      };
    });

    return stats.sort((a, b) => b.totalScore - a.totalScore);
  }, [students, violations, period, selectedWeek, selectedMonth, allWeeklyScores]);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0: return <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-yellow-300 to-yellow-500 text-white rounded-2xl font-black shadow-xl shadow-yellow-200 ring-4 ring-white"><Trophy className="w-5 h-5" /></div>;
      case 1: return <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-400 text-white rounded-2xl font-black shadow-xl shadow-slate-200 ring-4 ring-white">2</div>;
      case 2: return <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 text-white rounded-2xl font-black shadow-xl shadow-amber-200 ring-4 ring-white">3</div>;
      default: return <div className="w-10 h-10 flex items-center justify-center font-black text-slate-400 text-sm">#{index + 1}</div>;
    }
  };

  const toggleExpand = (className: string) => {
    if (expandedClass === className) {
      setExpandedClass(null);
      setSelectedViolationIds([]);
    } else {
      setExpandedClass(className);
      setSelectedViolationIds([]);
    }
  };

  const handleSelectViolation = (id: string) => {
    setSelectedViolationIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllClassViolations = (details: ViolationRecord[]) => {
    const ids = details.map(d => d.id);
    const allSelected = ids.every(id => selectedViolationIds.includes(id));
    
    if (allSelected) {
      setSelectedViolationIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      const newIds = ids.filter(id => !selectedViolationIds.includes(id));
      setSelectedViolationIds(prev => [...prev, ...newIds]);
    }
  };

  const executeBulkDelete = () => {
    if (onDeleteViolations && selectedViolationIds.length > 0) {
      if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedViolationIds.length} bản ghi đã chọn?`)) {
        onDeleteViolations(selectedViolationIds);
        setSelectedViolationIds([]);
      }
    }
  };

  const handleExportClassWeeklyExcel = (className: string, week: number) => {
    const weekViolations = violations.filter(v => {
      const info = getSchoolWeekInfo(parseDate(v.date));
      return v.className === className && info.week === week;
    });

    if (weekViolations.length === 0) {
      alert(`Lớp ${className} không có dữ liệu nề nếp nào trong tuần ${week}.`);
      return;
    }

    const data = weekViolations.map(v => ({
      'Ngày': v.date,
      'Học sinh': v.studentName,
      'Nội dung': v.type,
      'Điểm': v.points,
      'Ghi chú': v.note,
      'Người ghi': v.recordedBy,
      'Vai trò': v.recordedRole,
      'Phân loại': v.isCollective ? 'Tập thể' : 'Cá nhân'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Tuần ${week}`);
    
    const wscols = [
      {wch: 12}, {wch: 20}, {wch: 30}, {wch: 10}, {wch: 50}, {wch: 20}, {wch: 15}, {wch: 15}
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `Bao_cao_ne_nep_Tuan_${week}_Lop_${className}.xlsx`);
  };

  const handleExportSelectedClassesWeeklyExcel = () => {
    if (selectedClasses.length === 0) {
      alert('Vui lòng chọn ít nhất một lớp để xuất báo cáo.');
      return;
    }

    const currentWeek = period === 'Week' ? selectedWeek : getSchoolWeekInfo(mockNow).week;
    
    const filteredViolations = violations.filter(v => {
      const info = getSchoolWeekInfo(parseDate(v.date));
      return selectedClasses.includes(v.className) && info.week === currentWeek;
    });

    if (filteredViolations.length === 0) {
      alert(`Không có dữ liệu nề nếp nào cho các lớp đã chọn trong tuần ${currentWeek}.`);
      return;
    }

    const data = filteredViolations.map(v => ({
      'Tuần': getSchoolWeekInfo(parseDate(v.date)).week,
      'Ngày': v.date,
      'Lớp': v.className,
      'Học sinh': v.studentName,
      'Nội dung': v.type,
      'Điểm': v.points,
      'Ghi chú': v.note,
      'Người ghi': v.recordedBy,
      'Vai trò': v.recordedRole,
      'Phân loại': v.isCollective ? 'Tập thể' : 'Cá nhân'
    })).sort((a, b) => a.Lớp.localeCompare(b.Lớp) || a.Ngày.localeCompare(b.Ngày));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Báo cáo Tuần ${currentWeek}`);
    
    const wscols = [
      {wch: 8}, {wch: 12}, {wch: 10}, {wch: 20}, {wch: 30}, {wch: 10}, {wch: 50}, {wch: 20}, {wch: 15}, {wch: 15}
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `Bao_cao_tong_hop_Tuan_${currentWeek}_${selectedClasses.length}_lop.xlsx`);
  };

  const handleExportExcel = () => {
    const title = period === 'Week' 
      ? `BẢNG ĐIỂM THI ĐUA TUẦN ${String(selectedWeek).padStart(2, '0')}`
      : period === 'Month' 
        ? `BẢNG ĐIỂM THI ĐUA THÁNG ${selectedMonth}`
        : `BẢNG ĐIỂM THI ĐUA NĂM HỌC 2025-2026`;
    
    const data = rankingData.map((item, idx) => {
      const summaryParts: string[] = [];
      const multiplier = isGoodStudyWeek ? 2 : 1;
      
      const typeGroups: Record<string, { count: number, points: number }> = {};
      item.details.forEach(v => {
        if (!typeGroups[v.type]) typeGroups[v.type] = { count: 0, points: 0 };
        typeGroups[v.type].count++;
        typeGroups[v.type].points += v.points * multiplier;
      });

      Object.entries(typeGroups).forEach(([type, data]) => {
        if (type.startsWith('Tiết ')) return;
        const sign = data.points > 0 ? '+' : '';
        summaryParts.push(`${data.count} lượt ${type} (${sign}${data.points}đ)`);
      });

      const hasBadPeriods = item.details.some(v => v.type === 'Tiết B' || v.type === 'Tiết C' || v.type === 'Tiết D');
      if (!hasBadPeriods) {
        summaryParts.push(`100% tiết A (+${40 * multiplier}đ)`);
      } else {
        const periodFaults = item.details.filter(v => v.type.startsWith('Tiết '));
        periodFaults.forEach(v => {
          summaryParts.push(`${v.type} (${v.note.split('Lời phê: ')[1] || 'Không ghi'}) (${v.points * multiplier}đ)`);
        });
      }

      const remark = classRemarks.find(r => r.className === item.className && r.period === (period === 'Week' ? `Tuần ${selectedWeek}` : period))?.remark || '';

      const baseRow = {
        'Hạng': idx + 1,
        'Lớp': item.className,
      };

      let periodData = {};
      if (period === 'Year') {
          periodData = {
              'HK I': item.hk1Avg,
              'HK II': item.hk2Avg,
              'Cả Năm': item.yearScore
          };
      } else if (period === 'Week' || period === 'Month') {
          periodData = {
              'Điểm Sàn': item.baseScore,
              'Trừ Cá Nhân': -item.individualDeductions,
              'Trừ Tập Thể': -item.classDeductions,
              'Điểm Cộng': item.bonusPoints,
              'Tổng Điểm': item.totalScore
          };
      } else {
          periodData = {
              'Điểm TB': item.totalScore
          };
      }

      return {
        ...baseRow,
        ...periodData,
        'Xếp Loại': item.classification,
        'Hạ Bậc': item.hasProhibited ? 'Có' : 'Không',
        'Chi Tiết Vi Phạm & Thưởng': summaryParts.join('; '),
        'Nhận Xét': remark
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Báo Cáo Tổng Hợp");
    
    // Create Detailed Sheet
    const detailedData = rankingData.flatMap(item => 
      item.details.map(v => ({
        'Lớp': item.className,
        'Học Sinh': v.studentName,
        'Ngày': v.date,
        'Loại Vi Phạm': v.type,
        'Nội Dung': v.note,
        'Điểm Gốc': v.points,
        'Điểm Thực Tế': v.points * (isGoodStudyWeek ? 2 : 1),
        'Người Ghi': v.recordedBy,
        'Vai Trò': v.recordedRole
      }))
    );
    const wsDetailed = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, wsDetailed, "Chi Tiết Vi Phạm");

    const wscols = [
      {wch: 6}, {wch: 8}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 15}, {wch: 100}, {wch: 40}
    ];
    ws['!cols'] = wscols;
    
    const wsDetailedCols = [
      {wch: 10}, {wch: 20}, {wch: 12}, {wch: 25}, {wch: 50}, {wch: 10}, {wch: 12}, {wch: 20}, {wch: 15}
    ];
    wsDetailed['!cols'] = wsDetailedCols;

    const fileName = period === 'Week' ? `Bao_cao_thi_dua_tuan_${selectedWeek}.xlsx` : `Bao_cao_thi_dua_${period}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    
    const title = period === 'Week' 
      ? `BẢNG ĐIỂM THI ĐUA TUẦN ${selectedWeek}`
      : period === 'Month' 
        ? `BẢNG ĐIỂM THI ĐUA THÁNG ${selectedMonth}`
        : period === 'Semester1'
          ? `BẢNG ĐIỂM THI ĐUA HỌC KỲ I`
          : period === 'Semester2'
            ? `BẢNG ĐIỂM THI ĐUA HỌC KỲ II`
            : `BẢNG ĐIỂM THI ĐUA NĂM HỌC 2025-2026`;

    // School Header
    doc.setFontSize(10);
    doc.text("TRƯỜNG THPT SỐ 3 TUY PHƯỚC", 20, 15);
    doc.text("ĐOÀN THANH NIÊN", 20, 20);
    
    doc.text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", 200, 15, { align: 'center' });
    doc.text("Độc lập - Tự do - Hạnh phúc", 200, 20, { align: 'center' });

    doc.setFontSize(18);
    doc.text(title, 148, 35, { align: 'center' });
    if (isGoodStudyWeek && period === 'Week') {
      doc.setFontSize(10);
      doc.text("(HỆ SỐ NHÂN ĐÔI - TUẦN HỌC TỐT)", 148, 42, { align: 'center' });
    }

    const tableData = rankingData.map((item, idx) => {
      const multiplier = (period === 'Week' && isGoodStudyWeek) ? 2 : 1;
      const remark = classRemarks.find(r => r.className === item.className && r.period === (period === 'Week' ? `Tuần ${selectedWeek}` : period))?.remark || '';
      
      const summaryParts: string[] = [];
      const typeGroups: Record<string, { count: number, points: number }> = {};
      item.details.forEach(v => {
        if (!typeGroups[v.type]) typeGroups[v.type] = { count: 0, points: 0 };
        typeGroups[v.type].count++;
        typeGroups[v.type].points += v.points * multiplier;
      });

      Object.entries(typeGroups).forEach(([type, data]) => {
        if (type.startsWith('Tiết ')) return;
        const sign = data.points > 0 ? '+' : '';
        summaryParts.push(`${data.count} ${type} (${sign}${data.points}đ)`);
      });

      if (period === 'Year') {
        return [
          idx + 1,
          item.className,
          item.hk1Avg,
          item.hk2Avg || '-',
          item.yearScore,
          item.classification,
          remark
        ];
      } else if (period === 'Week' || period === 'Month') {
        return [
          idx + 1,
          item.className,
          item.totalScore,
          item.classification,
          summaryParts.join('\n'),
          remark
        ];
      } else {
        return [
          idx + 1,
          item.className,
          item.totalScore,
          item.classification,
          remark
        ];
      }
    });

    const head = period === 'Year' 
      ? [['Hạng', 'Lớp', 'HK I', 'HK II', 'Cả Năm', 'Xếp Loại', 'Nhận xét']]
      : (period === 'Week' || period === 'Month')
        ? [['Hạng', 'Lớp', 'Điểm', 'Xếp Loại', 'Chi tiết', 'Nhận xét']]
        : [['Hạng', 'Lớp', 'Điểm TB', 'Xếp Loại', 'Nhận xét']];

    autoTable(doc, {
      head: head,
      body: tableData,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
      styles: { fontSize: 8, overflow: 'linebreak', cellPadding: 3 }
    });

    // Add Detailed Violations on a new page
    doc.addPage();
    doc.setFontSize(14);
    doc.text("CHI TIẾT CÁC LỖI VI PHẠM VÀ ĐIỂM TRỪ", 148, 20, { align: 'center' });
    
    const detailRows = rankingData.flatMap(item => 
      item.details.filter(v => v.points < 0).map(v => [
        item.className,
        v.studentName,
        v.date,
        v.type,
        v.points * (isGoodStudyWeek ? 2 : 1),
        v.note
      ])
    );

    autoTable(doc, {
      head: [['Lớp', 'Học sinh', 'Ngày', 'Loại vi phạm', 'Điểm', 'Ghi chú']],
      body: detailRows,
      startY: 30,
      theme: 'striped',
      headStyles: { fillColor: [225, 29, 72] },
      styles: { fontSize: 8 }
    });

    // Add Summary Section
    const totalClasses = rankingData.length;
    const totClasses = rankingData.filter(i => i.classification === 'TỐT').length;
    const khaClasses = rankingData.filter(i => i.classification === 'KHÁ').length;
    const datClasses = rankingData.filter(i => i.classification === 'ĐẠT').length;
    const chuaDatClasses = rankingData.filter(i => i.classification === 'CHƯA ĐẠT').length;

    doc.addPage();
    doc.setFontSize(14);
    doc.text("TỔNG HỢP KẾT QUẢ THI ĐUA TOÀN TRƯỜNG", 148, 20, { align: 'center' });
    
    autoTable(doc, {
      startY: 30,
      head: [['Tiêu chí', 'Số lượng', 'Tỉ lệ (%)']],
      body: [
        ['Tổng số chi đoàn', totalClasses, '100%'],
        ['Xếp loại TỐT', totClasses, ((totClasses/totalClasses)*100).toFixed(1) + '%'],
        ['Xếp loại KHÁ', khaClasses, ((khaClasses/totalClasses)*100).toFixed(1) + '%'],
        ['Xếp loại ĐẠT', datClasses, ((datClasses/totalClasses)*100).toFixed(1) + '%'],
        ['Xếp loại CHƯA ĐẠT', chuaDatClasses, ((chuaDatClasses/totalClasses)*100).toFixed(1) + '%'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    // Signature on the last page
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.text(`Tuy Phước, ngày ${mockNow.getDate()} tháng ${mockNow.getMonth() + 1} năm ${mockNow.getFullYear()}`, 220, finalY, { align: 'center' });
    doc.text("TM. BAN CHẤP HÀNH ĐOÀN TRƯỜNG", 220, finalY + 7, { align: 'center' });
    doc.text("BÍ THƯ", 220, finalY + 14, { align: 'center' });

    const fileName = period === 'Week' ? `Bao_cao_thi_dua_tuan_${selectedWeek}.pdf` : `Bao_cao_thi_dua_${period}.pdf`;
    doc.save(fileName);
  };

  const handleExportDetailedPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    
    const title = period === 'Week' 
      ? `CHI TIẾT VI PHẠM TUẦN ${selectedWeek}`
      : period === 'Month' 
        ? `CHI TIẾT VI PHẠM THÁNG ${mockNow.getMonth() + 1}`
        : `CHI TIẾT VI PHẠM NĂM HỌC 2025-2026`;

    doc.setFontSize(18);
    doc.text(title, 148, 20, { align: 'center' });
    
    const detailedData = rankingData.flatMap(item => 
      item.details.map(v => [
        item.className,
        v.studentName,
        v.date,
        v.type,
        v.note,
        v.points * (isGoodStudyWeek ? 2 : 1),
        v.recordedBy || (v.recordedRole === 'TASKFORCE' ? 'Đội Cờ Đỏ' : 'Giáo viên')
      ])
    );

    autoTable(doc, {
      head: [['Lớp', 'Học Sinh', 'Ngày', 'Loại Vi Phạm', 'Nội Dung', 'Điểm', 'Người Ghi']],
      body: detailedData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [225, 29, 72], fontSize: 9 }, // Rose-600
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 40 },
        2: { cellWidth: 25 },
        3: { cellWidth: 40 },
        4: { cellWidth: 80 },
        5: { cellWidth: 15 },
        6: { cellWidth: 35 }
      },
      styles: { fontSize: 8, overflow: 'linebreak' }
    });

    const fileName = period === 'Week' ? `Chi_tiet_vi_pham_tuan_${selectedWeek}.pdf` : `Chi_tiet_vi_pham_${period}.pdf`;
    doc.save(fileName);
  };

  const handleExportWeeklyReport = () => {
    // Keep original TXT export as a fallback or for quick copy-paste
    const title = `BẢNG ĐIỂM THI ĐUA TUẦN ${String(selectedWeek).padStart(2, '0')}`;
    
    let content = `TRƯỜNG THPT SỐ 3 TUY PHƯỚC\tCộng hòa xã hội chủ nghĩa Việt Nam\n`;
    content += `ĐOÀN THANH NIÊN\tĐộc lập – Tự do – Hạnh phúc\n\n`;
    content += `\t\t${title}\n`;
    if (isGoodStudyWeek && period === 'Week') content += `\t\t(HỆ SỐ NHÂN ĐÔI - TUẦN HỌC TỐT)\n`;
    content += `\n`;
    
    const headers = ['STT', 'LỚP', 'TỔNG HỢP NỀ NẾP - PHONG TRÀO - SỔ ĐẦU BÀI', 'TỔNG ĐIỂM', 'XẾP LOẠI', 'VỊ THỨ'];
    content += headers.join('\t') + '\n';

    rankingData.forEach((item, idx) => {
      const summaryParts: string[] = [];
      const multiplier = isGoodStudyWeek ? 2 : 1;
      
      const typeGroups: Record<string, { count: number, points: number }> = {};
      item.details.forEach(v => {
        if (!typeGroups[v.type]) typeGroups[v.type] = { count: 0, points: 0 };
        typeGroups[v.type].count++;
        typeGroups[v.type].points += v.points * multiplier;
      });

      Object.entries(typeGroups).forEach(([type, data]) => {
        if (type.startsWith('Tiết ')) return;
        const sign = data.points > 0 ? '+' : '';
        summaryParts.push(`* ${data.count} lượt ${type} (${sign}${data.points}đ)`);
      });

      const hasBadPeriods = item.details.some(v => v.type === 'Tiết B' || v.type === 'Tiết C' || v.type === 'Tiết D');
      if (!hasBadPeriods) {
        summaryParts.push(`* 100% tiết A (+${40 * multiplier}đ)`);
      } else {
        const periodFaults = item.details.filter(v => v.type.startsWith('Tiết '));
        periodFaults.forEach(v => {
          summaryParts.push(`* ${v.type} (${v.note.split('Lời phê: ')[1] || 'Không ghi'}) (${v.points * multiplier}đ)`);
        });
      }

      const row = [
        idx + 1,
        item.className,
        summaryParts.join('; '),
        item.totalScore,
        item.totalScore >= 200 ? 'TỐT' : item.totalScore >= 180 ? 'KHÁ' : item.totalScore >= 150 ? 'ĐẠT' : 'CHƯA ĐẠT',
        idx + 1
      ];
      content += row.join('\t') + '\n';
      
      const remark = classRemarks.find(r => r.className === item.className && r.period === (period === 'Week' ? `Tuần ${selectedWeek}` : period))?.remark;
      if (remark) {
        content += `\t\tNhận xét: ${remark}\n`;
      }
    });

    content += `\n\n\t\t\t\t\t\tTuy Phước, ngày ${mockNow.getDate()} tháng ${mockNow.getMonth() + 1} năm ${mockNow.getFullYear()}\n`;
    content += `\t\t\t\t\t\t\tTM. BAN CHẤP HÀNH ĐOÀN TRƯỜNG\n`;
    content += `\t\t\t\t\t\t\t\tBÍ THƯ\n\n\n\n\t\t\t\t\t\t\t\t(Đã ký)`;

    const blob = new Blob([`\uFEFF${content}`], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = period === 'Week' ? `Bao_cao_thi_dua_tuan_${selectedWeek}.txt` : `Bao_cao_thi_dua_${period}.txt`;
    link.click();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Editorial Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-8">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-600 rounded-2xl sm:rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-emerald-200 rotate-3 hover:rotate-0 transition-transform duration-500">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-800 dark:text-white tracking-tighter font-display leading-none">Bảng Xếp Hạng</h2>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] sm:text-sm font-bold uppercase tracking-[0.2em] mt-1 sm:mt-2">Thi đua nề nếp & Học tập</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl sm:p-1.5 sm:rounded-2xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: 'Week', label: 'Tuần' },
              { id: 'Month', label: 'Tháng' },
              { id: 'Semester1', label: 'HK I' },
              { id: 'Semester2', label: 'HK II' },
              { id: 'Year', label: 'Năm' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as Period)}
                className={cn(
                  "flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  period === p.id ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-lg" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {userRole === 'ADMIN' && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-none px-4 sm:px-5 py-3 sm:py-3.5 bg-white dark:bg-slate-800 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <TableIcon className="w-3.5 h-3.5 sm:w-4 h-4" /> <span className="hidden xs:inline">Nhập Excel</span>
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls, .csv"
              onChange={handleImportExcel}
            />
            <div className="group relative flex-1 sm:flex-none">
              <button 
                className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-emerald-600 text-white rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
              >
                <FileOutput className="w-3.5 h-3.5 sm:w-4 h-4" /> <span className="hidden xs:inline">Xuất Báo Cáo</span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-1.5 sm:p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button 
                  onClick={handleExportExcel}
                  className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 rounded-lg sm:rounded-xl transition-all"
                >
                  <TableIcon className="w-3.5 h-3.5 sm:w-4 h-4" /> Excel Tổng Hợp
                </button>
                <button 
                  onClick={handleExportPDF}
                  className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 rounded-lg sm:rounded-xl transition-all"
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 h-4" /> PDF Tổng Hợp
                </button>
                <button 
                  onClick={handleExportDetailedPDF}
                  className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 rounded-lg sm:rounded-xl transition-all"
                >
                  <ListTodo className="w-3.5 h-3.5 sm:w-4 h-4" /> PDF Chi Tiết Lỗi
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                <button 
                  onClick={handleExportWeeklyReport}
                  className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg sm:rounded-xl transition-all"
                >
                  <FileOutput className="w-3.5 h-3.5 sm:w-4 h-4" /> File Văn Bản (.txt)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Period Specific Controls */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={period}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          className="flex flex-col lg:flex-row items-start lg:items-center gap-6 bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm"
        >
          {period === 'Week' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:flex-1">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400 shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Tuần</p>
                  <select 
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(Number(e.target.value))}
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px] font-black px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Array.from({ length: 35 }, (_, i) => i + 1).map(w => (
                      <option key={w} value={w}>Tuần {w} ({getWeekDateRange(w)})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {Array.from({ length: 35 }, (_, i) => i + 1).map(w => (
                    <button
                      key={w}
                      onClick={() => setSelectedWeek(w)}
                      className={cn(
                        "flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-[10px] sm:text-xs font-black transition-all border",
                        selectedWeek === w 
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-200" 
                          : "bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-100"
                      )}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {period === 'Month' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:flex-1">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400 shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex-1 w-full">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Chọn Tháng</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {[9, 10, 11, 12, 1, 2, 3, 4, 5].map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className={cn(
                        "flex-1 min-w-[60px] py-3 rounded-xl text-[10px] sm:text-xs font-black transition-all border uppercase tracking-widest",
                        selectedMonth === m 
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-200" 
                          : "bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-100"
                      )}
                    >
                      T{m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="h-px w-full lg:h-12 lg:w-px bg-slate-100 dark:bg-slate-700" />

          <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto">
            <div className="flex flex-col items-start lg:items-end">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tuần học tốt</p>
              <p className="text-[9px] font-bold text-slate-300 italic">Nhân đôi điểm thưởng</p>
            </div>
            <button 
              onClick={() => onToggleGoodStudyWeek?.(!isGoodStudyWeek)}
              className={cn(
                "w-12 h-7 sm:w-14 sm:h-8 rounded-full relative transition-all duration-300",
                isGoodStudyWeek ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all duration-300",
                isGoodStudyWeek ? "left-[calc(100%-1.625rem)]" : "left-0.5"
              )} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Admin Actions Bar */}
      {userRole === 'ADMIN' && (
        <div className="flex flex-col gap-4 bg-rose-50/50 dark:bg-rose-900/10 p-6 rounded-[2rem] border border-rose-100 dark:border-rose-900/30 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 mr-auto">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/50 rounded-xl text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">Khu vực Quản trị</span>
                <p className="text-[9px] font-bold text-rose-400 italic">Các thao tác thay đổi dữ liệu hệ thống</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-rose-100 dark:border-rose-900/30 shadow-sm">
              <button
                onClick={() => setIsBulkMode(false)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  !isBulkMode ? "bg-rose-600 text-white shadow-md" : "text-rose-400 hover:text-rose-600"
                )}
              >
                Chế độ thường
              </button>
              <button
                onClick={() => setIsBulkMode(true)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  isBulkMode ? "bg-rose-600 text-white shadow-md" : "text-rose-400 hover:text-rose-600"
                )}
              >
                Chế độ xoá nhanh
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedClasses.length > 0 && (
                <button
                  onClick={handleExportSelectedClassesWeeklyExcel}
                  className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest border border-emerald-100 transition-all flex items-center gap-2"
                >
                  <TableIcon className="w-4 h-4" />
                  Xuất Excel {selectedClasses.length} lớp
                </button>
              )}

              {(period === 'Week' || period === 'Month') && onDeleteAllDataForPeriod && (
                <button
                  onClick={() => {
                    const value = period === 'Week' ? getSchoolWeekInfo(mockNow).week : getSchoolWeekInfo(mockNow).reportMonthLabel;
                    onDeleteAllDataForPeriod(period as 'Week' | 'Month', value);
                  }}
                  className="text-[10px] bg-white hover:bg-rose-50 text-rose-600 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest border border-rose-100 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Xoá toàn bộ {period === 'Week' ? 'Tuần' : 'Tháng'}
                </button>
              )}
            </div>
          </div>

          {isBulkMode && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-sm"
            >
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bước 1: Chọn các tuần cần xoá</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 35 }, (_, i) => i + 1).map(w => (
                    <button
                      key={w}
                      onClick={() => toggleWeekSelection(w)}
                      className={cn(
                        "w-9 h-9 rounded-lg text-[10px] font-black transition-all border",
                        selectedWeeks.includes(w) 
                          ? "bg-rose-600 text-white border-rose-500 shadow-md" 
                          : "bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-rose-50 hover:text-rose-600"
                      )}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700">
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bước 2: Chọn lớp trong bảng & Xoá</p>
                  <p className="text-[9px] font-bold text-rose-500 italic">Đang chọn: {selectedClasses.length} lớp, {selectedWeeks.length} tuần</p>
                </div>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedClasses.length === 0 || selectedWeeks.length === 0}
                  className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-rose-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Xoá dữ liệu đã chọn
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}
      <div className="glass-card p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] mb-10">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><ListTodo className="w-5 h-5" /></div>
          <h3 className="text-lg sm:text-xl font-black text-slate-800 font-display">Tiêu chí & Công thức tính điểm thi đua</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Điểm cơ bản</h4>
            <p className="text-[10px] sm:text-xs text-slate-600 font-medium leading-relaxed">Mỗi lớp bắt đầu tuần mới với <span className="text-teal-600 font-black">200 điểm</span> cơ bản.</p>
            <div className="p-3 bg-teal-50 rounded-xl border border-teal-100">
              <p className="text-[9px] text-teal-700 font-bold italic">Điểm tổng = 200 + Thưởng - Trừ (Cá nhân) - Trừ (Tập thể)</p>
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Hệ số nhân đôi</h4>
            <p className="text-[10px] sm:text-xs text-slate-600 font-medium leading-relaxed">Trong <span className="text-emerald-600 font-black">Tuần học tốt</span>, tất cả điểm cộng và điểm trừ đều được nhân đôi (x2).</p>
            <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black text-emerald-600">
              <Sparkles className="w-3 h-3" /> Áp dụng cho toàn trường
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4 sm:col-span-2 lg:col-span-1">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Xếp loại tiết học</h4>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-2">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold">
                <span className="text-emerald-600">Tiết A (Tốt)</span>
                <span className="text-slate-400">+0đ</span>
              </div>
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold">
                <span className="text-amber-600">Tiết B (Khá)</span>
                <span className="text-rose-500">-5đ</span>
              </div>
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold">
                <span className="text-orange-600">Tiết C (TB)</span>
                <span className="text-rose-500">-10đ</span>
              </div>
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold">
                <span className="text-rose-600">Tiết D (Yếu)</span>
                <span className="text-rose-500">-20đ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100/80 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-white/30">
              <th className="px-4 py-4 text-center w-12 border-r border-slate-100/50">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={selectedClasses.length === rankingData.length && rankingData.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedClasses(rankingData.map(i => i.className));
                    } else {
                      setSelectedClasses([]);
                    }
                  }}
                />
              </th>
              <th className="px-6 py-4 text-center w-20 text-[10px] font-serif italic font-bold text-slate-400 uppercase tracking-[0.15em] border-r border-slate-100/50">Hạng</th>
              <th className="px-6 py-4 text-left text-[10px] font-serif italic font-bold text-slate-400 uppercase tracking-[0.15em] border-r border-slate-100/50">Lớp</th>
              {period === 'Year' ? (
                <>
                  <th className="px-6 py-4 text-center text-[10px] font-serif italic font-bold text-slate-400 uppercase tracking-[0.15em] border-r border-slate-100/50">HK I</th>
                  <th className="px-6 py-4 text-center text-[10px] font-serif italic font-bold text-slate-400 uppercase tracking-[0.15em] border-r border-slate-100/50">HK II</th>
                </>
              ) : (period === 'Week' || period === 'Month') ? (
                <>
                  <th className="px-6 py-4 text-center text-[10px] font-serif italic font-bold text-slate-400 uppercase tracking-[0.15em] border-r border-slate-100/50">Điểm Sàn</th>
                  <th className="px-6 py-4 text-center text-[10px] font-serif italic font-bold text-rose-400 uppercase tracking-[0.15em] border-r border-slate-100/50">Trừ Cá Nhân</th>
                  <th className="px-6 py-4 text-center text-[10px] font-serif italic font-bold text-rose-400 uppercase tracking-[0.15em] border-r border-slate-100/50">Trừ Tập Thể</th>
                  <th className="px-6 py-4 text-center text-[10px] font-serif italic font-bold text-emerald-400 uppercase tracking-[0.15em] border-r border-slate-100/50">Điểm Cộng</th>
                </>
              ) : (
                <th className="px-6 py-4 text-center text-[10px] font-serif italic font-bold text-slate-400 uppercase tracking-[0.15em] border-r border-slate-100/50">Điểm TB Tuần</th>
              )}
              <th className="px-6 py-4 text-center text-[10px] font-serif italic font-bold text-teal-400 uppercase tracking-[0.15em] border-r border-slate-100/50 bg-teal-50/10">Tổng Điểm</th>
              <th className="px-6 py-4 text-left text-[10px] font-serif italic font-bold text-slate-400 uppercase tracking-[0.15em] border-r border-slate-100/50">Nhận xét</th>
              <th className="px-6 py-4 text-center text-[10px] font-serif italic font-bold text-slate-400 uppercase tracking-[0.15em]">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rankingData.map((item, index) => {
              const isExpanded = expandedClass === item.className;
              return (
                <React.Fragment key={item.className}>
                  <tr 
                    onClick={() => toggleExpand(item.className)}
                    className={cn(
                      "transition-all cursor-pointer group border-b border-slate-50 last:border-0",
                      index % 2 !== 0 && !isExpanded && "bg-slate-50/30",
                      isExpanded ? 'bg-indigo-50/20' : 'hover:bg-slate-50/80'
                    )}
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-center border-r border-slate-100/50" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedClasses.includes(item.className)}
                        onChange={() => {
                          setSelectedClasses(prev => 
                            prev.includes(item.className) 
                            ? prev.filter(c => c !== item.className) 
                            : [...prev, item.className]
                          );
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center border-r border-slate-100/50 font-mono text-sm text-slate-500">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-1.5 h-10 rounded-full transition-all duration-500",
                          index < 3 ? 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]' : 'bg-slate-200'
                        )}></div>
                        <div>
                          <span className="text-lg font-black text-slate-800 tracking-tight">Lớp {item.className}</span>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{item.studentCount} Học sinh</p>
                        </div>
                      </div>
                    </td>
                    {period === 'Year' ? (
                      <>
                        <td className="px-8 py-6 whitespace-nowrap text-center text-slate-500 font-black text-sm font-mono border-r border-slate-100/50">
                          {item.hk1Avg}
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-center text-slate-500 font-black text-sm font-mono border-r border-slate-100/50">
                          {item.hk2Avg || '-'}
                        </td>
                      </>
                    ) : (period === 'Week' || period === 'Month') ? (
                      <>
                        <td className="px-8 py-6 whitespace-nowrap text-center text-slate-500 font-black text-sm font-mono">
                            {item.baseScore}
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-center text-rose-500 font-black text-sm font-mono">
                            {item.individualDeductions > 0 ? (
                              <div className="flex flex-col items-center">
                                <span>-{item.individualDeductions}</span>
                                {isGoodStudyWeek && period === 'Week' && <span className="text-[8px] bg-rose-100 px-1 rounded">x2</span>}
                              </div>
                            ) : '-'}
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-center text-rose-600 font-black text-sm font-mono">
                            {item.classDeductions > 0 ? (
                              <div className="flex flex-col items-center">
                                <span>-{item.classDeductions}</span>
                                {isGoodStudyWeek && period === 'Week' && <span className="text-[8px] bg-rose-100 px-1 rounded">x2</span>}
                              </div>
                            ) : '-'}
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-center text-emerald-500 font-black text-sm font-mono">
                            {item.bonusPoints > 0 ? (
                              <div className="flex flex-col items-center">
                                <span>+{item.bonusPoints}</span>
                                {isGoodStudyWeek && period === 'Week' && <span className="text-[8px] bg-emerald-100 px-1 rounded">x2</span>}
                              </div>
                            ) : '-'}
                        </td>
                      </>
                    ) : (
                      <td className="px-8 py-6 whitespace-nowrap text-center text-slate-500 font-black text-sm font-mono border-r border-slate-100/50">
                        {item.totalScore}
                      </td>
                    )}
                    <td className="px-8 py-6 whitespace-nowrap text-center border-r border-slate-100/50 bg-indigo-50/10">
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "text-2xl font-black tracking-tight font-mono",
                          item.totalScore >= 200 ? 'text-emerald-600' : item.totalScore >= 180 ? 'text-indigo-600' : item.totalScore >= 150 ? 'text-amber-600' : 'text-rose-600'
                        )}>
                          {item.totalScore}
                        </span>
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest mt-1",
                          item.classification === 'TỐT' ? 'bg-emerald-100 text-emerald-600' : 
                          item.classification === 'KHÁ' ? 'bg-indigo-100 text-indigo-600' : 
                          item.classification === 'ĐẠT' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                        )}>
                          {item.classification}
                        </span>
                        {item.hasProhibited && (
                          <span className="text-[8px] text-rose-500 font-bold mt-1 animate-pulse">Hạ bậc (Vi phạm cấm)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 min-w-[250px]">
                        {editingRemark?.className === item.className ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="text"
                              value={editingRemark.text}
                              onChange={(e) => setEditingRemark({ ...editingRemark, text: e.target.value })}
                              className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="Nhập nhận xét..."
                              autoFocus
                            />
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onUpdateClassRemark) {
                                  onUpdateClassRemark({
                                    className: item.className,
                                    period: period === 'Week' ? `Tuần ${getSchoolWeekInfo(mockNow).week}` : period,
                                    remark: editingRemark.text,
                                    updatedBy: 'Admin'
                                  });
                                }
                                setEditingRemark(null);
                              }}
                              className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group/remark">
                            <p className="text-xs text-slate-500 font-medium italic truncate max-w-[200px]">
                              {classRemarks.find(r => r.className === item.className && r.period === (period === 'Week' ? `Tuần ${getSchoolWeekInfo(mockNow).week}` : period))?.remark || 'Chưa có nhận xét'}
                            </p>
                            {userRole === 'ADMIN' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const current = classRemarks.find(r => r.className === item.className && r.period === (period === 'Week' ? `Tuần ${getSchoolWeekInfo(mockNow).week}` : period))?.remark || '';
                                  setEditingRemark({ className: item.className, text: current });
                                }}
                                className="opacity-0 group-hover/remark:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-all"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-center">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 mx-auto",
                        isExpanded ? "bg-indigo-600 text-white rotate-180 shadow-lg shadow-indigo-200" : "bg-white text-slate-400 group-hover:bg-slate-100"
                      )}>
                        <ChevronDown className="w-5 h-5" />
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Detail Row */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="p-0 bg-white/30 border-b border-indigo-50">
                        <div className="p-8 animate-in slide-in-from-top-4 duration-500">
                          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                            <div className="bg-white/50 px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-10">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><ListTodo className="w-5 h-5" /></div>
                                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">
                                  Chi tiết biến động - Lớp {item.className}
                                </h4>
                                <span className="text-[9px] font-black bg-white text-slate-400 px-3 py-1 rounded-full border border-slate-100 uppercase tracking-widest">
                                  {period === 'Week' ? 'Tuần này' : period === 'Month' ? 'Tháng này' : 'Năm học'}
                                </span>
                              </div>

                              {userRole === 'ADMIN' && period === 'Week' && onDeleteClassWeekData && (
                                <button
                                  onClick={() => onDeleteClassWeekData(item.className, selectedWeek)}
                                  className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest border border-rose-100 transition-all flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Xóa dữ liệu Tuần {selectedWeek}
                                </button>
                              )}

                              <button
                                onClick={() => handleExportClassWeeklyExcel(item.className, selectedWeek)}
                                className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest border border-emerald-100 transition-all flex items-center gap-2"
                              >
                                <TableIcon className="w-4 h-4" />
                                Xuất Báo cáo Excel
                              </button>

                              {userRole === 'ADMIN' && selectedViolationIds.length > 0 && (
                                <button
                                  onClick={executeBulkDelete}
                                  className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-rose-200 transition-all flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Xóa {selectedViolationIds.length} mục
                                </button>
                              )}
                            </div>
                            
                            {item.details.length > 0 ? (
                              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                <table className="min-w-full divide-y divide-slate-50">
                                  <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                    <tr>
                                      {userRole === 'ADMIN' && (
                                        <th className="px-6 py-4 text-center w-12">
                                          <input 
                                            type="checkbox"
                                            className="rounded-lg border-slate-200 text-indigo-600 focus:ring-indigo-500/10 h-4 w-4 cursor-pointer transition-all"
                                            checked={item.details.length > 0 && item.details.every(d => selectedViolationIds.includes(d.id))}
                                            onChange={() => handleSelectAllClassViolations(item.details)}
                                          />
                                        </th>
                                      )}
                                      <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Ngày</th>
                                      <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Học sinh</th>
                                      <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Nội dung</th>
                                      <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Điểm</th>
                                      <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Thao tác</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {item.details.sort((a, b) => b.id.localeCompare(a.id)).map((detail) => (
                                      <tr key={detail.id} className={cn("hover:bg-slate-50/50 transition-colors", selectedViolationIds.includes(detail.id) && "bg-indigo-50/40")}>
                                        {userRole === 'ADMIN' && (
                                          <td className="px-6 py-4 text-center">
                                            <input 
                                              type="checkbox"
                                              className="rounded-lg border-slate-200 text-indigo-600 focus:ring-indigo-500/10 h-4 w-4 cursor-pointer transition-all"
                                              checked={selectedViolationIds.includes(detail.id)}
                                              onChange={() => handleSelectViolation(detail.id)}
                                            />
                                          </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-slate-400 uppercase tracking-widest">
                                          {detail.date}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-700 tracking-tight">
                                          {detail.studentName}
                                        </td>
                                          <td className="px-6 py-4 text-sm text-slate-600">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className={cn("font-black px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-widest border", detail.points < 0 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100")}>
                                                {detail.type}
                                              </span> 
                                              <span className={cn(
                                                "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border",
                                                detail.points > 0 ? "bg-emerald-100 text-emerald-600 border-emerald-200" : 
                                                detail.isCollective ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200"
                                              )}>
                                                {detail.points > 0 ? 'Khen thưởng' : detail.isCollective ? 'Tập thể' : 'Cá nhân'}
                                              </span>
                                            </div>
                                            <div className="font-bold mt-1">{detail.note}</div>
                                            <div className="text-[9px] text-slate-400 mt-1 font-black uppercase tracking-widest">
                                              Ghi nhận: {detail.recordedBy}
                                            </div>
                                          </td>
                                        <td className={cn("px-6 py-4 whitespace-nowrap text-right text-lg font-black tracking-tight", detail.points < 0 ? "text-rose-500" : "text-emerald-500")}>
                                          <div className="flex flex-col items-end">
                                            <span>{detail.points > 0 ? '+' : ''}{detail.points * (isGoodStudyWeek ? 2 : 1)}</span>
                                            {isGoodStudyWeek && <span className="text-[8px] opacity-50">({detail.points > 0 ? '+' : ''}{detail.points} x 2)</span>}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                          {(userRole === 'ADMIN' || detail.recordedBy === currentUser?.name) && onDeleteViolations && (
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm('Bạn có chắc chắn muốn xoá bản ghi này?')) {
                                                  onDeleteViolations([detail.id]);
                                                }
                                              }}
                                              className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                              title="Xoá bản ghi"
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
                            ) : (
                              <div className="p-16 text-center">
                                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                                  <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <p className="text-lg font-black text-slate-800 tracking-tight">Không có biến động</p>
                                <p className="text-sm text-slate-400 mt-2 font-bold">Lớp {item.className} giữ nguyên điểm sàn trong giai đoạn này.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
        
        {rankingData.length === 0 && (
          <div className="py-32 text-center">
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <Filter className="w-12 h-12 text-slate-200" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Chưa có dữ liệu cho giai đoạn này</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default RankingBoard;
