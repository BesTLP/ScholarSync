
import React, { useState } from 'react';
import { X, Download, CheckCircle2, RotateCcw } from 'lucide-react';
import { FacultyRecord } from '../types';

interface ExportField {
  id: string;
  label: string;
  category: 'general' | 'mentor';
}

const EXPORT_FIELDS: ExportField[] = [
  { id: 'university', label: '学校名称 (中英文)', category: 'general' },
  { id: 'qsRanking', label: '2026QS综合排名', category: 'general' },
  { id: 'deadline', label: '截止日期', category: 'general' },
  { id: 'programName', label: '专业名称 (中英文)', category: 'general' },
  { id: 'programUrl', label: '专业链接', category: 'general' },
  { id: 'applicationReqs', label: '申请要求及材料', category: 'general' },
  { id: 'rpReqs', label: 'RP字数要求', category: 'general' },
  { id: 'researchAreas', label: '导师研究方向 (论文)', category: 'general' },
  { id: 'recommendationReason', label: '推荐理由', category: 'general' },
  { id: 'email', label: '导师邮箱', category: 'general' },
  { id: 'profileUrl', label: '导师官网链接', category: 'general' },
  { id: 'tuition', label: '学费', category: 'general' },
  { id: 'scholarship', label: '奖学金项目', category: 'general' },
  
  { id: 'name', label: '导师姓名', category: 'mentor' },
  { id: 'title', label: '导师职称', category: 'mentor' },
  { id: 'school', label: '学院/School', category: 'mentor' },
];

interface CustomExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMentors: FacultyRecord[];
  onExport: (selectedFields: string[]) => void;
}

const CustomExportModal: React.FC<CustomExportModalProps> = ({ isOpen, onClose, selectedMentors, onExport }) => {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(EXPORT_FIELDS.filter(f => f.category === 'general').map(f => f.id)));

  if (!isOpen) return null;

  const toggleField = (id: string) => {
    const newSet = new Set(selectedFields);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedFields(newSet);
  };

  const selectAll = () => {
    setSelectedFields(new Set(EXPORT_FIELDS.map(f => f.id)));
  };

  const resetToDefault = () => {
    setSelectedFields(new Set(EXPORT_FIELDS.filter(f => f.category === 'general').map(f => f.id)));
  };

  const handleExport = () => {
    onExport(Array.from(selectedFields));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">自定义导出字段</h2>
            <p className="text-xs text-gray-500 mt-1 font-medium">导出包含 {selectedMentors.length} 位导师，每个项目一行，更接近总表结构。</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Actions */}
          <div className="flex items-center gap-4">
            <button 
              onClick={selectAll}
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-sm font-bold transition-all border border-gray-100"
            >
              全选字段
            </button>
            <button 
              onClick={resetToDefault}
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-sm font-bold transition-all border border-gray-100 flex items-center gap-2"
            >
              <RotateCcw size={14} />
              恢复默认
            </button>
            <span className="text-sm text-gray-400 font-medium ml-2">已选 <span className="text-blue-600 font-black">{selectedFields.size}</span> 个字段</span>
          </div>

          {/* General Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              总表字段
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {EXPORT_FIELDS.filter(f => f.category === 'general').map(field => (
                <button
                  key={field.id}
                  onClick={() => toggleField(field.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                    selectedFields.has(field.id) 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                      : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                    selectedFields.has(field.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300'
                  }`}>
                    {selectedFields.has(field.id) && <CheckCircle2 size={14} />}
                  </div>
                  <span className="text-sm font-bold truncate">{field.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mentor Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              导师字段
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {EXPORT_FIELDS.filter(f => f.category === 'mentor').map(field => (
                <button
                  key={field.id}
                  onClick={() => toggleField(field.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                    selectedFields.has(field.id) 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                      : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                    selectedFields.has(field.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300'
                  }`}>
                    {selectedFields.has(field.id) && <CheckCircle2 size={14} />}
                  </div>
                  <span className="text-sm font-bold truncate">{field.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-white hover:bg-gray-100 text-gray-600 rounded-xl text-sm font-bold transition-all border border-gray-200"
          >
            取消
          </button>
          <button 
            onClick={handleExport}
            className="px-8 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2"
          >
            <Download size={16} />
            导出 CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomExportModal;
