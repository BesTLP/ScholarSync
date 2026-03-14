import React, { useState } from 'react';
import { X, Save, User, Building, GraduationCap, Mail, Globe, MapPin, BookOpen, Tag } from 'lucide-react';
import { FacultyMember, FacultyRecord } from '../types';

interface FacultyManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (faculty: FacultyMember, country: string, fieldCategory: string, extra?: Partial<FacultyRecord>) => void;
}

const InputField = ({ label, icon: Icon, value, onChange, placeholder, required = false }: { label: string; icon?: any; value: string; onChange: (val: string) => void; placeholder?: string; required?: boolean }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
      {Icon && <Icon size={12} className="mr-1.5" />}
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
    />
  </div>
);

const FacultyManualEntryModal: React.FC<FacultyManualEntryModalProps> = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: '',
    university: '',
    department: '',
    title: '',
    email: '',
    profileUrl: '',
    researchAreas: '',
    country: '',
    fieldCategory: '',
    subFieldCategory: '',
    subRegion: '',
    regionPath: '',
    classificationPath: '',
    classificationNote: '',
    photoUrl: ''
  });

  if (!isOpen) return null;

  const handleSave = () => {
    if (!form.name || !form.university) {
      alert('请填写姓名和学校');
      return;
    }

    const newFaculty: FacultyMember = {
      name: form.name,
      university: form.university,
      department: form.department,
      title: form.title,
      email: form.email,
      profileUrl: form.profileUrl,
      photoUrl: form.photoUrl,
      researchAreas: form.researchAreas.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      recentActivities: [],
      activitySummary: '',
      isActive: true,
      matchScore: 0,
      alignmentDetails: '',
      matchReasoning: {
        locationCheck: '',
        universityCheck: '',
        departmentCheck: '',
        positionCheck: '',
        activityCheck: '',
        reputationCheck: '',
        researchFit: ''
      }
    };

    const extra: Partial<FacultyRecord> = {
      subFieldCategory: form.subFieldCategory,
      subRegion: form.subRegion,
      regionPath: form.regionPath.split(/[>|/]/).map(s => s.trim()).filter(Boolean),
      classificationPath: form.classificationPath.split(/[>|/]/).map(s => s.trim()).filter(Boolean),
      classificationNote: form.classificationNote,
      classificationSource: 'manual'
    };

    onSave(newFaculty, form.country || '未分类', form.fieldCategory || '未分类', extra);
    onClose();
    setForm({
      name: '',
      university: '',
      department: '',
      title: '',
      email: '',
      profileUrl: '',
      researchAreas: '',
      country: '',
      fieldCategory: '',
      subFieldCategory: '',
      subRegion: '',
      regionPath: '',
      classificationPath: '',
      classificationNote: '',
      photoUrl: ''
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xl" onClick={onClose} />
      <div className="relative glass w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/50">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/50 bg-white/40 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">手动录入导师信息</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-xl transition-all active:scale-95">
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white/20 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-6">
            <InputField 
              label="姓名" 
              icon={User} 
              value={form.name} 
              onChange={v => setForm({...form, name: v})} 
              placeholder="例如: Alice Johnson" 
              required 
            />
            <InputField 
              label="职级 / 头衔" 
              icon={GraduationCap} 
              value={form.title} 
              onChange={v => setForm({...form, title: v})} 
              placeholder="例如: Professor" 
            />
            <InputField 
              label="所属院校" 
              icon={Building} 
              value={form.university} 
              onChange={v => setForm({...form, university: v})} 
              placeholder="例如: Stanford University" 
              required 
            />
            <InputField 
              label="院系 / 部门" 
              icon={Building} 
              value={form.department} 
              onChange={v => setForm({...form, department: v})} 
              placeholder="例如: Computer Science" 
            />
            <InputField 
              label="电子邮箱" 
              icon={Mail} 
              value={form.email} 
              onChange={v => setForm({...form, email: v})} 
              placeholder="例如: alice@stanford.edu" 
            />
            <InputField 
              label="个人主页 URL" 
              icon={Globe} 
              value={form.profileUrl} 
              onChange={v => setForm({...form, profileUrl: v})} 
              placeholder="https://..." 
            />
            <InputField 
              label="国家 / 地区" 
              icon={MapPin} 
              value={form.country} 
              onChange={v => setForm({...form, country: v})} 
              placeholder="例如: 美国" 
            />
            <InputField 
              label="二级地区 (如: 北京)" 
              icon={MapPin} 
              value={form.subRegion} 
              onChange={v => setForm({...form, subRegion: v})} 
              placeholder="例如: 北京" 
            />
            <InputField 
              label="地区路径 (用 &gt; 分隔)" 
              icon={MapPin} 
              value={form.regionPath} 
              onChange={v => setForm({...form, regionPath: v})} 
              placeholder="例如: 中国 > 陕西 > 西安" 
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
            <InputField 
              label="分类路径 (用 &gt; 分隔)" 
              icon={Tag} 
              value={form.classificationPath} 
              onChange={v => setForm({...form, classificationPath: v})} 
              placeholder="例如: 工程与技术 > 计算机科学 > 人工智能" 
            />
            <div className="col-span-2">
              <InputField 
                label="研究方向 (用逗号分隔)" 
                icon={Tag} 
                value={form.researchAreas} 
                onChange={v => setForm({...form, researchAreas: v})} 
                placeholder="例如: AI, Machine Learning, Computer Vision" 
              />
            </div>
            <div className="col-span-2">
              <InputField 
                label="分类备注" 
                icon={BookOpen} 
                value={form.classificationNote} 
                onChange={v => setForm({...form, classificationNote: v})} 
                placeholder="说明分类依据..." 
              />
            </div>
            <div className="col-span-2">
              <InputField 
                label="头像 URL (可选)" 
                icon={User} 
                value={form.photoUrl} 
                onChange={v => setForm({...form, photoUrl: v})} 
                placeholder="https://..." 
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/40 backdrop-blur-sm border-t border-white/50 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-gray-600 font-bold text-sm hover:bg-white/60 rounded-xl transition-all active:scale-95"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center"
          >
            <Save size={18} className="mr-2" />
            保存导师信息
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacultyManualEntryModal;
