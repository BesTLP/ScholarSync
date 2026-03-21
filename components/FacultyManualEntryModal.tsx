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
    title: '',
    university: '',
    universityEn: '',
    qsRanking: '',
    deadline: '',
    department: '',
    programNameEn: '',
    programUrl: '',
    applicationReqs: '',
    rpReqs: '',
    researchAreas: '',
    alignmentDetails: '',
    recommendationReason: '',
    email: '',
    profileUrl: '',
    tuition: '',
    scholarship: '',
    // Detailed Requirements
    ieltsTotal: '',
    ieltsReading: '',
    ieltsListening: '',
    ieltsSpeaking: '',
    ieltsWriting: '',
    toeflTotal: '',
    toeflReading: '',
    toeflListening: '',
    toeflSpeaking: '',
    toeflWriting: '',
    degreeAndGrades: '',
    greGmat: '',
    otherMaterials: '',
    // System info
    country: '',
    fieldCategory: '',
    subFieldCategory: '',
    subRegion: '',
    regionPath: '',
    classificationPath: '',
    classificationNote: '',
    photoUrl: ''
  });

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!form.name || !form.university) {
      setError('请填写姓名和学校');
      return;
    }
    setError(null);

    const newFaculty: FacultyMember = {
      name: form.name,
      university: form.university,
      universityEn: form.universityEn,
      department: form.department,
      programName: form.department, // Using department as programName for manual entry
      programNameEn: form.programNameEn,
      title: form.title,
      email: form.email,
      profileUrl: form.profileUrl,
      photoUrl: form.photoUrl,
      programUrl: form.programUrl,
      qsRanking: form.qsRanking,
      deadlineData: [{ value: form.deadline, sourceUrl: '' }],
      applicationReqsData: [{ value: form.applicationReqs, sourceUrl: '' }],
      rpReqsData: [{ value: form.rpReqs, sourceUrl: '' }],
      tuitionData: [{ value: form.tuition, sourceUrl: '' }],
      scholarshipData: [{ value: form.scholarship, sourceUrl: '' }],
      detailedRequirements: {
        ielts: {
          total: form.ieltsTotal,
          reading: form.ieltsReading,
          listening: form.ieltsListening,
          speaking: form.ieltsSpeaking,
          writing: form.ieltsWriting,
          sourceUrl: ''
        },
        toefl: {
          total: form.toeflTotal,
          reading: form.toeflReading,
          listening: form.toeflListening,
          speaking: form.toeflSpeaking,
          writing: form.toeflWriting,
          sourceUrl: ''
        },
        degreeAndGrades: { value: form.degreeAndGrades, sourceUrl: '' },
        greGmat: { value: form.greGmat, sourceUrl: '' },
        otherMaterials: { value: form.otherMaterials, sourceUrl: '' }
      },
      researchAreas: form.researchAreas.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      recentActivities: [],
      activitySummary: '',
      isActive: true,
      matchScore: 0,
      alignmentDetails: form.alignmentDetails,
      recommendationReason: form.recommendationReason,
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
      title: '',
      university: '',
      universityEn: '',
      qsRanking: '',
      deadline: '',
      department: '',
      programNameEn: '',
      programUrl: '',
      applicationReqs: '',
      rpReqs: '',
      researchAreas: '',
      alignmentDetails: '',
      recommendationReason: '',
      email: '',
      profileUrl: '',
      tuition: '',
      scholarship: '',
      country: '',
      fieldCategory: '',
      subFieldCategory: '',
      subRegion: '',
      regionPath: '',
      classificationPath: '',
      classificationNote: '',
      photoUrl: '',
      ieltsTotal: '',
      ieltsReading: '',
      ieltsListening: '',
      ieltsSpeaking: '',
      ieltsWriting: '',
      toeflTotal: '',
      toeflReading: '',
      toeflListening: '',
      toeflSpeaking: '',
      toeflWriting: '',
      degreeAndGrades: '',
      greGmat: '',
      otherMaterials: ''
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
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-6">
            <InputField 
              label="导师姓名" 
              icon={User} 
              value={form.name} 
              onChange={v => setForm({...form, name: v})} 
              placeholder="例如: Alice Johnson" 
              required 
            />
            <InputField 
              label="职称" 
              icon={GraduationCap} 
              value={form.title} 
              onChange={v => setForm({...form, title: v})} 
              placeholder="例如: Professor" 
            />
            <InputField 
              label="学校名称 (中文)" 
              icon={Building} 
              value={form.university} 
              onChange={v => setForm({...form, university: v})} 
              placeholder="例如: 斯坦福大学" 
              required 
            />
            <InputField 
              label="学校名称 (英文)" 
              icon={Building} 
              value={form.universityEn} 
              onChange={v => setForm({...form, universityEn: v})} 
              placeholder="例如: Stanford University" 
            />
            <InputField 
              label="2026QS综合排名" 
              icon={BookOpen} 
              value={form.qsRanking} 
              onChange={v => setForm({...form, qsRanking: v})} 
              placeholder="例如: 1" 
            />
            <InputField 
              label="申请截止日期" 
              icon={BookOpen} 
              value={form.deadline} 
              onChange={v => setForm({...form, deadline: v})} 
              placeholder="例如: 2026-12-01" 
            />
            <InputField 
              label="专业名称 (中文)" 
              icon={Building} 
              value={form.department} 
              onChange={v => setForm({...form, department: v})} 
              placeholder="例如: 计算机科学" 
            />
            <InputField 
              label="专业名称 (英文)" 
              icon={Building} 
              value={form.programNameEn} 
              onChange={v => setForm({...form, programNameEn: v})} 
              placeholder="例如: Computer Science" 
            />
            <InputField 
              label="专业链接" 
              icon={Globe} 
              value={form.programUrl} 
              onChange={v => setForm({...form, programUrl: v})} 
              placeholder="https://..." 
            />
            <InputField 
              label="申请要求及材料" 
              icon={BookOpen} 
              value={form.applicationReqs} 
              onChange={v => setForm({...form, applicationReqs: v})} 
              placeholder="例如: CV, PS, 3 Letters of Recommendation" 
            />
            <InputField 
              label="RP字数要求" 
              icon={BookOpen} 
              value={form.rpReqs} 
              onChange={v => setForm({...form, rpReqs: v})} 
              placeholder="例如: 2000 words" 
            />
            <InputField 
              label="导师研究方向（论文）" 
              icon={Tag} 
              value={form.researchAreas} 
              onChange={v => setForm({...form, researchAreas: v})} 
              placeholder="例如: AI, Machine Learning, Computer Vision" 
            />
            <InputField 
              label="匹配深度解析" 
              icon={BookOpen} 
              value={form.alignmentDetails} 
              onChange={v => setForm({...form, alignmentDetails: v})} 
              placeholder="例如: 研究方向高度匹配" 
            />
            <InputField 
              label="推荐理由" 
              icon={BookOpen} 
              value={form.recommendationReason} 
              onChange={v => setForm({...form, recommendationReason: v})} 
              placeholder="例如: 领域顶尖专家，资源丰富" 
            />
            <InputField 
              label="导师邮箱" 
              icon={Mail} 
              value={form.email} 
              onChange={v => setForm({...form, email: v})} 
              placeholder="例如: alice@stanford.edu" 
            />
            <InputField 
              label="导师官网链接" 
              icon={Globe} 
              value={form.profileUrl} 
              onChange={v => setForm({...form, profileUrl: v})} 
              placeholder="https://..." 
            />
            <InputField 
              label="学费" 
              icon={BookOpen} 
              value={form.tuition} 
              onChange={v => setForm({...form, tuition: v})} 
              placeholder="例如: $50,000/year" 
            />
            <InputField 
              label="奖学金项目" 
              icon={BookOpen} 
              value={form.scholarship} 
              onChange={v => setForm({...form, scholarship: v})} 
              placeholder="例如: Full funding available" 
            />
            <div className="col-span-2 border-t border-gray-200 pt-6 mt-2">
              <h4 className="text-sm font-bold text-indigo-600 mb-4 flex items-center gap-2">
                <GraduationCap size={18} />
                详细招生要求 (语言/成绩)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100">
                  <h5 className="text-xs font-black text-indigo-500 uppercase tracking-widest">IELTS 雅思要求</h5>
                  <div className="grid grid-cols-5 gap-2">
                    <InputField label="总分" value={form.ieltsTotal} onChange={v => setForm({...form, ieltsTotal: v})} />
                    <InputField label="阅读" value={form.ieltsReading} onChange={v => setForm({...form, ieltsReading: v})} />
                    <InputField label="听力" value={form.ieltsListening} onChange={v => setForm({...form, ieltsListening: v})} />
                    <InputField label="口语" value={form.ieltsSpeaking} onChange={v => setForm({...form, ieltsSpeaking: v})} />
                    <InputField label="写作" value={form.ieltsWriting} onChange={v => setForm({...form, ieltsWriting: v})} />
                  </div>
                </div>
                <div className="space-y-4 p-4 bg-blue-50/30 rounded-2xl border border-blue-100">
                  <h5 className="text-xs font-black text-blue-500 uppercase tracking-widest">TOEFL 托福要求</h5>
                  <div className="grid grid-cols-5 gap-2">
                    <InputField label="总分" value={form.toeflTotal} onChange={v => setForm({...form, toeflTotal: v})} />
                    <InputField label="阅读" value={form.toeflReading} onChange={v => setForm({...form, toeflReading: v})} />
                    <InputField label="听力" value={form.toeflListening} onChange={v => setForm({...form, toeflListening: v})} />
                    <InputField label="口语" value={form.toeflSpeaking} onChange={v => setForm({...form, toeflSpeaking: v})} />
                    <InputField label="写作" value={form.toeflWriting} onChange={v => setForm({...form, toeflWriting: v})} />
                  </div>
                </div>
                <div className="col-span-2">
                  <InputField 
                    label="学位与成绩要求" 
                    icon={BookOpen} 
                    value={form.degreeAndGrades} 
                    onChange={v => setForm({...form, degreeAndGrades: v})} 
                    placeholder="例如: 2:1 honours degree or equivalent (75%+)" 
                  />
                </div>
                <InputField 
                  label="GRE / GMAT" 
                  icon={BookOpen} 
                  value={form.greGmat} 
                  onChange={v => setForm({...form, greGmat: v})} 
                  placeholder="例如: GRE required (320+)" 
                />
                <InputField 
                  label="其他申请材料" 
                  icon={BookOpen} 
                  value={form.otherMaterials} 
                  onChange={v => setForm({...form, otherMaterials: v})} 
                  placeholder="例如: Portfolio, Writing Sample" 
                />
              </div>
            </div>
            <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
              <h4 className="text-sm font-bold text-gray-700 mb-4">分类与系统信息 (可选)</h4>
              <div className="grid grid-cols-2 gap-6">
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
