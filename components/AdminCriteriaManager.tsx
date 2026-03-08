
import React, { useState } from 'react';
import { Settings, Plus, Trash2, Save, AlertCircle, CheckCircle2, Sparkles, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateAppLogo } from '../src/services/logoService';
import Logo from './Logo';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AdminCriteriaManagerProps {
  categories: Record<string, number>;
  autoCriteria: { label: string; points: number; description: string }[];
  onUpdateCategories: (categories: Record<string, number>) => void;
  onUpdateAutoCriteria: (criteria: { label: string; points: number; description: string }[]) => void;
  appLogo: string | null;
  onUpdateLogo: (logo: string | null) => void;
  onImportCSV?: () => void;
}

const AdminCriteriaManager: React.FC<AdminCriteriaManagerProps> = ({
  categories,
  autoCriteria,
  onUpdateCategories,
  onUpdateAutoCriteria,
  appLogo,
  onUpdateLogo,
  onImportCSV
}) => {
  const [localCategories, setLocalCategories] = useState<{ name: string; points: number }[]>(
    Object.entries(categories).map(([name, points]) => ({ name, points }))
  );
  const [localAutoCriteria, setLocalAutoCriteria] = useState(autoCriteria);
  const [isSaved, setIsSaved] = useState(false);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);

  const handleGenerateLogo = async () => {
    setIsGeneratingLogo(true);
    try {
      const newLogo = await generateAppLogo();
      if (newLogo) {
        onUpdateLogo(newLogo);
      }
    } catch (error) {
      console.error("Failed to generate logo:", error);
      alert("Không thể tạo logo lúc này. Vui lòng thử lại sau.");
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const handleResetLogo = () => {
    if (window.confirm("Bạn có muốn quay lại logo mặc định?")) {
      onUpdateLogo(null);
    }
  };

  const handleCategoryChange = (index: number, field: 'name' | 'points', value: any) => {
    const newCategories = [...localCategories];
    newCategories[index] = { ...newCategories[index], [field]: value };
    setLocalCategories(newCategories);
    setIsSaved(false);
  };

  const handleAddCategory = () => {
    setLocalCategories(prev => [...prev, { name: 'Tiêu chí mới', points: 0 }]);
    setIsSaved(false);
  };

  const handleRemoveCategory = (index: number) => {
    const category = localCategories[index];
    if (window.confirm(`Bạn có chắc chắn muốn xoá danh mục vi phạm "${category.name}"?`)) {
      setLocalCategories(prev => prev.filter((_, i) => i !== index));
      setIsSaved(false);
    }
  };

  const handleAutoCriteriaChange = (index: number, field: string, value: any) => {
    const newCriteria = [...localAutoCriteria];
    newCriteria[index] = { ...newCriteria[index], [field]: value };
    setLocalAutoCriteria(newCriteria);
    setIsSaved(false);
  };

  const handleAddAutoCriteria = () => {
    setLocalAutoCriteria(prev => [...prev, { label: 'Tiêu chí mới', points: 0, description: '' }]);
    setIsSaved(false);
  };

  const handleRemoveAutoCriteria = (index: number) => {
    setLocalAutoCriteria(prev => prev.filter((_, i) => i !== index));
    setIsSaved(false);
  };

  const handleSave = () => {
    const categoriesRecord: Record<string, number> = {};
    localCategories.forEach(cat => {
      if (cat.name.trim()) {
        categoriesRecord[cat.name] = cat.points;
      }
    });
    onUpdateCategories(categoriesRecord);
    onUpdateAutoCriteria(localAutoCriteria);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            Quản lý Tiêu chí Thi đua
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Điều chỉnh danh mục và điểm số hệ thống</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {onImportCSV && (
            <button 
              onClick={onImportCSV}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-3"
            >
              <Plus className="w-4 h-4" /> Nhập CSV Học sinh
            </button>
          )}
          <button
            onClick={handleSave}
            className={cn(
              "px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl",
              isSaved 
                ? "bg-emerald-500 text-white shadow-emerald-200" 
                : "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 active:scale-95"
            )}
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaved ? 'Đã lưu thành công' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Logo Management Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg sm:rounded-xl flex items-center justify-center text-indigo-600">
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Nhận diện Thương hiệu</h3>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-10">
            <div className="relative group">
              <div className="w-32 h-32 sm:w-40 sm:h-40 bg-slate-50 dark:bg-slate-800 rounded-[2rem] sm:rounded-[2.5rem] border-4 border-white dark:border-slate-700 shadow-2xl flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 duration-500">
                <Logo size={100} imageUrl={appLogo} />
              </div>
              {appLogo && (
                <button 
                  onClick={handleResetLogo}
                  className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-7 h-7 sm:w-8 sm:h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex-1 space-y-4 sm:space-y-6 text-center md:text-left">
              <div>
                <h4 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white tracking-tight">Tạo Logo bằng AI</h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed">
                  Sử dụng sức mạnh của Gemini AI để tạo ra một logo hiện đại và chuyên nghiệp cho ứng dụng của bạn. 
                  Hệ thống sẽ tự động thiết kế dựa trên phong cách SmartSchool.
                </p>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <button
                  onClick={handleGenerateLogo}
                  disabled={isGeneratingLogo}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-indigo-600 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isGeneratingLogo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />}
                  {isGeneratingLogo ? 'Đang thiết kế...' : 'Tạo Logo mới'}
                </button>
                
                <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-500 rounded-full animate-pulse" />
                  Sẵn sàng tạo mẫu
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Violation Categories Section */}
        <motion.section 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-50 dark:bg-rose-900/30 rounded-lg sm:rounded-xl flex items-center justify-center text-rose-500">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Danh mục Vi phạm</h3>
            </div>
            <button
              onClick={handleAddCategory}
              className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg sm:rounded-xl hover:bg-rose-100 transition-all"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="space-y-3 max-h-[400px] sm:max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {localCategories.map((cat, index) => (
              <motion.div 
                key={index} 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col gap-3 p-4 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 dark:hover:border-indigo-900 transition-all relative",
                  index % 2 === 0 ? "bg-slate-50 dark:bg-slate-800/50" : "bg-white dark:bg-slate-900/30"
                )}
              >
                <button
                  onClick={() => handleRemoveCategory(index)}
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 w-full">
                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tên tiêu chí</p>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => handleCategoryChange(index, 'name', e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="w-full sm:w-24">
                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Điểm</p>
                    <input
                      type="number"
                      value={cat.points}
                      onChange={(index_val) => handleCategoryChange(index, 'points', Number((index_val.target as HTMLInputElement).value))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl px-3 py-2 text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500 transition-all text-center"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Auto Criteria Section */}
        <motion.section 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg sm:rounded-xl flex items-center justify-center text-indigo-500">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Tiêu chí mẫu</h3>
            </div>
            <button
              onClick={handleAddAutoCriteria}
              className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg sm:rounded-xl hover:bg-indigo-100 transition-all"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="space-y-4 max-h-[400px] sm:max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {localAutoCriteria.map((item, index) => (
              <motion.div 
                key={index} 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-3 sm:space-y-4 relative group"
              >                <button
                  onClick={() => handleRemoveAutoCriteria(index)}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">Tên nhãn</label>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => handleAutoCriteriaChange(index, 'label', e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">Điểm</label>
                    <input
                      type="number"
                      value={item.points}
                      onChange={(e) => handleAutoCriteriaChange(index, 'points', Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">Mô tả chi tiết</label>
                  <textarea
                    value={item.description}
                    onChange={(e) => handleAutoCriteriaChange(index, 'description', e.target.value)}
                    rows={2}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 outline-none focus:border-indigo-500 transition-all resize-none"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default AdminCriteriaManager;
