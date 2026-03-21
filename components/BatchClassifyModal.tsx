import React, { useState } from 'react';
import { X, Database, Tag, MapPin, Building, Save, AlertCircle } from 'lucide-react';
import { FacultyRecord } from '../types';

interface BatchClassifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updates: Partial<FacultyRecord>) => void;
  selectedCount: number;
}

const InputField = ({ label, icon: Icon, value, onChange, placeholder }: { label: string; icon?: any; value: string; onChange: (val: string) => void; placeholder?: string }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
      {Icon && <Icon size={12} className="mr-1.5" />}
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-bold"
    />
  </div>
);

const BatchClassifyModal: React.FC<BatchClassifyModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  selectedCount 
}) => {
  const [form, setForm] = useState({
    country: '',
    provinceState: '',
    city: '',
    school: '',
    department: '',
    fieldCategory: '',
    subFieldCategory: '',
  });

  if (!isOpen) return null;

  const handleConfirm = () => {
    // Filter out empty fields
    const updates = Object.fromEntries(
      Object.entries(form).filter(([_, v]) => v.trim() !== '')
    );
    
    if (Object.keys(updates).length === 0) {
      alert('请至少填写一个分类字段');
      return;
    }

    onConfirm(updates);
    onClose();
    setForm({
      country: '',
      provinceState: '',
      city: '',
      school: '',
      department: '',
      fieldCategory: '',
      subFieldCategory: '',
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-indigo-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">批量分类</h3>
              <p className="text-sm text-gray-500 font-bold">正在为 {selectedCount} 位导师应用统一分类</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 font-bold leading-relaxed">
              注意：仅填写的字段会被更新，留空的字段将保持原有值。
              此操作将覆盖选中导师的现有分类信息。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">地理信息</h4>
              <InputField 
                label="国家 / 地区" 
                icon={MapPin} 
                value={form.country} 
                onChange={v => setForm({...form, country: v})} 
                placeholder="例如: 美国" 
              />
              <InputField 
                label="省 / 州" 
                icon={MapPin} 
                value={form.provinceState} 
                onChange={v => setForm({...form, provinceState: v})} 
                placeholder="例如: California" 
              />
              <InputField 
                label="城市" 
                icon={MapPin} 
                value={form.city} 
                onChange={v => setForm({...form, city: v})} 
                placeholder="例如: Stanford" 
              />
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">组织与学科</h4>
              <InputField 
                label="学院 (School)" 
                icon={Building} 
                value={form.school} 
                onChange={v => setForm({...form, school: v})} 
                placeholder="例如: School of Engineering" 
              />
              <InputField 
                label="系别 (Department)" 
                icon={Building} 
                value={form.department} 
                onChange={v => setForm({...form, department: v})} 
                placeholder="例如: Computer Science" 
              />
              <InputField 
                label="学科领域 (一级)" 
                icon={Tag} 
                value={form.fieldCategory} 
                onChange={v => setForm({...form, fieldCategory: v})} 
                placeholder="例如: 计算机科学" 
              />
              <InputField 
                label="二级分类" 
                icon={Tag} 
                value={form.subFieldCategory} 
                onChange={v => setForm({...form, subFieldCategory: v})} 
                placeholder="例如: 人工智能" 
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-8 py-3 text-gray-600 font-black text-sm hover:bg-gray-100 rounded-2xl transition-all active:scale-95"
          >
            取消
          </button>
          <button 
            onClick={handleConfirm}
            className="px-10 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95 flex items-center gap-2"
          >
            <Save size={18} />
            应用分类更新
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchClassifyModal;
