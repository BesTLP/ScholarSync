import React, { useState } from 'react';
import { X, Save, MapPin, Building, BookOpen, Tag } from 'lucide-react';
import { FacultyRecord } from '../types';

interface BatchClassifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<FacultyRecord>) => void;
  selectedCount: number;
}

const InputField = ({ label, icon: Icon, value, onChange, placeholder }: { label: string; icon?: any; value: string; onChange: (val: string) => void; placeholder?: string }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
      {Icon && <Icon size={12} className="mr-1.5" />}
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
    />
  </div>
);

const BatchClassifyModal: React.FC<BatchClassifyModalProps> = ({ isOpen, onClose, onSave, selectedCount }) => {
  const [form, setForm] = useState({
    country: '',
    subRegion: '',
    regionPath: '',
    university: '',
    department: '',
    fieldCategory: '',
    subFieldCategory: '',
    classificationPath: ''
  });

  if (!isOpen) return null;

  const handleSave = () => {
    const updates: Partial<FacultyRecord> = {};
    if (form.country) updates.country = form.country;
    if (form.subRegion) updates.subRegion = form.subRegion;
    if (form.regionPath) updates.regionPath = form.regionPath.split(/[>|/]/).map(s => s.trim()).filter(Boolean);
    if (form.university) updates.university = form.university;
    if (form.department) updates.department = form.department;
    if (form.fieldCategory) updates.fieldCategory = form.fieldCategory;
    if (form.subFieldCategory) updates.subFieldCategory = form.subFieldCategory;
    if (form.classificationPath) updates.classificationPath = form.classificationPath.split(/[>|/]/).map(s => s.trim()).filter(Boolean);
    
    if (Object.keys(updates).length > 0) {
      updates.classificationSource = 'manual';
      onSave(updates);
    }
    onClose();
    setForm({
      country: '',
      subRegion: '',
      regionPath: '',
      university: '',
      department: '',
      fieldCategory: '',
      subFieldCategory: '',
      classificationPath: ''
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">批量分类导师</h2>
            <p className="text-sm text-gray-500 mt-1 font-medium">已选择 {selectedCount} 位导师，留空表示不修改该字段</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              label="国家 / 地区" 
              icon={MapPin} 
              value={form.country} 
              onChange={v => setForm({...form, country: v})} 
              placeholder="例如: 中国" 
            />
            <InputField 
              label="二级地区" 
              icon={MapPin} 
              value={form.subRegion} 
              onChange={v => setForm({...form, subRegion: v})} 
              placeholder="例如: 北京" 
            />
            <div className="col-span-1 md:col-span-2">
              <InputField 
                label="地区路径 (用 &gt; 分隔)" 
                icon={MapPin} 
                value={form.regionPath} 
                onChange={v => setForm({...form, regionPath: v})} 
                placeholder="例如: 中国 > 北京" 
              />
            </div>
            <InputField 
              label="学校名称" 
              icon={Building} 
              value={form.university} 
              onChange={v => setForm({...form, university: v})} 
              placeholder="例如: 北京大学" 
            />
            <InputField 
              label="院系 / 部门" 
              icon={Building} 
              value={form.department} 
              onChange={v => setForm({...form, department: v})} 
              placeholder="例如: 计算机科学系" 
            />
            <InputField 
              label="学科领域 (一级)" 
              icon={BookOpen} 
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
            <div className="col-span-1 md:col-span-2">
              <InputField 
                label="分类路径 (用 &gt; 分隔)" 
                icon={Tag} 
                value={form.classificationPath} 
                onChange={v => setForm({...form, classificationPath: v})} 
                placeholder="例如: 工程与技术 > 计算机科学 > 人工智能" 
              />
            </div>
          </div>
        </div>

        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-[32px]">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all active:scale-95"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <Save size={16} />
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchClassifyModal;
