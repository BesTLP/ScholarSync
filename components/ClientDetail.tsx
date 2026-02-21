import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  Edit2, 
  Plus, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Phone, 
  Briefcase, 
  Trophy, 
  Lightbulb, 
  Users, 
  Target, 
  Heart, 
  ShieldCheck, 
  FileSearch,
  MoreHorizontal,
  Sparkles,
  X,
  Calendar,
  MapPin,
  ChevronDown,
  LayoutGrid,
  ClipboardList,
  Mail,
  UserCheck,
  Award,
  Clapperboard,
  FileBadge
} from 'lucide-react';
import { Client } from '../types';

interface ClientDetailProps {
  client: Client;
  onBack: () => void;
  onStartWriting: (type?: string) => void;
  onEditDocument: (doc: any) => void;
  onUpdateClient: (client: Client) => void;
}

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, onConfirm, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
        <div className="px-6 py-4 bg-white flex justify-end border-t border-gray-50">
          <button onClick={onConfirm} className="w-full py-3 bg-cyan-500 text-white rounded-xl text-sm font-bold hover:bg-cyan-600 transition-all shadow-lg shadow-cyan-100 active:scale-95">
            添加
          </button>
        </div>
      </div>
    </div>
  );
};

const InputField = ({ label, placeholder, type = "text", selectOptions, value, onChange }: { label: string; placeholder?: string; type?: string; selectOptions?: string[], value?: string, onChange?: (val: string) => void }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{label}</label>
    <div className="relative">
      {type === 'textarea' ? (
        <textarea 
          placeholder={placeholder}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500 transition-all placeholder:text-gray-300 min-h-[100px] resize-none"
        />
      ) : selectOptions ? (
        <div className="relative">
          <select 
            value={value}
            onChange={e => onChange?.(e.target.value)}
            className="w-full appearance-none bg-gray-50 border-none rounded-xl px-4 py-3 text-sm text-gray-700 focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
          >
            <option value="" disabled>请选择</option>
            {selectOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      ) : (
        <div className="relative">
          <input 
            type={type === 'date' ? 'text' : type} 
            placeholder={type === 'date' ? '日/mm/yyyy' : placeholder}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500 transition-all placeholder:text-gray-300"
          />
          {type === 'date' && <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
        </div>
      )}
    </div>
  </div>
);

const ClientDetail: React.FC<ClientDetailProps> = ({ client, onBack, onStartWriting, onEditDocument, onUpdateClient }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'documents'>('profile');
  const [showWritingMenu, setShowWritingMenu] = useState(false);
  const [showContactMenu, setShowContactMenu] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [basicInfoForm, setBasicInfoForm] = useState({ name: client.name, advisor: client.advisor || '', gpa: client.gpa || '' });

  // Form states
  const [eduForm, setEduForm] = useState({ school: '', degree: '', major: '', gpa: '', extraInfo: '', notes: '', startDate: '', endDate: '' });
  const [workForm, setWorkForm] = useState({ company: '', position: '', startDate: '', endDate: '', description: '' });
  const [awardForm, setAwardForm] = useState({ name: '', level: '', date: '', description: '' });
  const [contactForm, setContactForm] = useState({ type: 'phone' as 'phone' | 'address', value: '' });

  const writingMenuRef = useRef<HTMLDivElement>(null);
  const contactMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (writingMenuRef.current && !writingMenuRef.current.contains(event.target as Node)) {
        setShowWritingMenu(false);
      }
      if (contactMenuRef.current && !contactMenuRef.current.contains(event.target as Node)) {
        setShowContactMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateBasicInfo = () => {
    onUpdateClient({
      ...client,
      name: basicInfoForm.name,
      advisor: basicInfoForm.advisor,
      gpa: basicInfoForm.gpa
    });
    setActiveModal(null);
  };

  const handleAddEducation = () => {
    const newEdu = { id: Math.random().toString(), ...eduForm };
    onUpdateClient({
      ...client,
      educations: [...(client.educations || []), newEdu],
      educationCount: (client.educationCount || 0) + 1
    });
    setEduForm({ school: '', degree: '', major: '', gpa: '', extraInfo: '', notes: '', startDate: '', endDate: '' });
    setActiveModal(null);
  };

  const handleAddWork = () => {
    const newWork = { id: Math.random().toString(), ...workForm };
    onUpdateClient({
      ...client,
      works: [...(client.works || []), newWork]
    });
    setWorkForm({ company: '', position: '', startDate: '', endDate: '', description: '' });
    setActiveModal(null);
  };

  const handleAddAward = () => {
    const newAward = { id: Math.random().toString(), ...awardForm };
    onUpdateClient({
      ...client,
      awards: [...(client.awards || []), newAward]
    });
    setAwardForm({ name: '', level: '', date: '', description: '' });
    setActiveModal(null);
  };

  const handleAddContact = () => {
    const newContact = { id: Math.random().toString(), ...contactForm };
    onUpdateClient({
      ...client,
      contacts: [...(client.contacts || []), newContact],
      contact: client.contact === '暂无联系方式' || !client.contact ? contactForm.value : client.contact
    });
    setContactForm({ type: 'phone', value: '' });
    setActiveModal(null);
  };

  const InfoCard = ({ icon: Icon, title, children, onAdd, items, renderItem }: { icon: any, title: string, children?: React.ReactNode, onAdd?: () => void, items?: any[], renderItem?: (item: any) => React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow relative group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:bg-cyan-50 group-hover:text-cyan-500 transition-colors">
            <Icon size={18} />
          </div>
          <h4 className="text-sm font-bold text-gray-900">{title}</h4>
        </div>
        {onAdd && (
          <div className="relative" ref={title === '联系方式' ? contactMenuRef : null}>
            <button onClick={onAdd} className="p-1 text-gray-300 hover:text-cyan-500 transition-colors">
              <Plus size={16} />
            </button>
            {title === '联系方式' && showContactMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <button 
                  onClick={() => { setActiveModal('contact'); setContactForm({ type: 'phone', value: '' }); setShowContactMenu(false); }}
                  className="w-full flex items-center px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Phone size={14} className="mr-3 text-cyan-500" />
                  添加联系方式
                </button>
                <button 
                  onClick={() => { setActiveModal('contact'); setContactForm({ type: 'address', value: '' }); setShowContactMenu(false); }}
                  className="w-full flex items-center px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <MapPin size={14} className="mr-3 text-orange-500" />
                  添加地址
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="min-h-[60px]">
        {items && items.length > 0 && renderItem ? (
          <div className="space-y-3">
            {items.map(renderItem)}
          </div>
        ) : children || (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-2">
              <Icon size={20} />
            </div>
            <p className="text-[10px] text-gray-400">暂无{title}</p>
            <button 
              onClick={onAdd}
              className="mt-2 px-3 py-1 bg-cyan-50 text-cyan-600 rounded-lg text-[10px] font-bold hover:bg-cyan-100 transition-colors"
            >
              添加信息
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const EditableField = ({ value, onChange, placeholder }: { value?: string; onChange: (val: string) => void; placeholder: string }) => (
    <div className="w-full">
      <textarea 
        placeholder={placeholder}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-50/50 border-none rounded-xl p-4 text-xs text-gray-600 placeholder:text-gray-300 focus:ring-1 focus:ring-cyan-500 min-h-[100px] resize-none transition-all"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-gray-50 rounded-full text-gray-400 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center space-x-2 text-xs font-medium">
              <span className="text-gray-400">EduPro</span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-400">客户</span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-900 font-bold">{client.name}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 relative" ref={writingMenuRef}>
            <button 
              onClick={() => setShowWritingMenu(!showWritingMenu)}
              className="flex items-center px-4 py-2 bg-cyan-500 text-white rounded-xl text-sm font-bold hover:bg-cyan-600 transition-all shadow-lg shadow-cyan-100 active:scale-95"
            >
              <LayoutGrid size={16} className="mr-2" />
              开始创作
            </button>
            
            {showWritingMenu && (
              <div className="absolute top-full right-0 mt-2 w-[480px] bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-4 gap-6">
                  {[
                    { icon: Sparkles, text: '文书Agent', color: 'text-cyan-500' },
                    { icon: Edit2, text: '写PS', color: 'text-indigo-500' },
                    { icon: ClipboardList, text: '写命题文书', color: 'text-blue-500' },
                    { icon: Mail, text: '写推荐信', color: 'text-violet-500' },
                    { icon: FileBadge, text: '写CV', color: 'text-purple-500' },
                    { icon: Clapperboard, text: '自由创作', color: 'text-indigo-600' },
                  ].map((item, idx) => (
                    <button 
                      key={idx}
                      onClick={() => {
                        onStartWriting(item.text);
                        setShowWritingMenu(false);
                      }}
                      className="flex flex-col items-center space-y-3 group"
                    >
                      <div className={`w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center ${item.color} group-hover:bg-gray-100 transition-all group-hover:scale-110`}>
                        <item.icon size={24} />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl border border-gray-100 transition-all">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Tabs */}
        <div className="flex items-center space-x-2 mb-8 bg-gray-100/50 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'profile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Users size={14} className="mr-2" />
            档案
          </button>
          <button 
            onClick={() => setActiveTab('documents')}
            className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'documents' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <FileText size={14} className="mr-2" />
            客户文书
          </button>
        </div>

        {activeTab === 'profile' ? (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Main Profile */}
            <div className="col-span-8 space-y-6">
              {/* Profile Header Card */}
              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center text-white text-3xl font-bold overflow-hidden relative group">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`} 
                        alt="avatar" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Edit2 size={16} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
                        <button 
                          onClick={() => {
                            setBasicInfoForm({ name: client.name, advisor: client.advisor || '', gpa: client.gpa || '' });
                            setActiveModal('basicInfo');
                          }}
                          className="text-gray-300 hover:text-gray-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-xs text-gray-400 flex items-center">
                          <UserCheck size={12} className="mr-1 text-cyan-500" />
                          择导老师: <span className="text-cyan-600 font-bold ml-1">{client.advisor || '未分配'}</span>
                        </span>
                        <span className="text-xs text-gray-300">|</span>
                        <span className="text-xs text-gray-400">状态: <span className="text-emerald-500 font-bold">服务中</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-cyan-50/50 rounded-xl p-4 border border-cyan-100/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">GPA</span>
                      <GraduationCap size={14} className="text-cyan-400" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">{client.gpa || '-'}</div>
                  </div>
                  <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">教育经历</span>
                      <BookOpen size={14} className="text-purple-400" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">{client.educations?.length || 0}</div>
                  </div>
                  <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">文书</span>
                      <FileText size={14} className="text-amber-400" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">{client.documents?.length || 0}</div>
                  </div>
                </div>
              </div>

              {/* Grid of Info Cards */}
              <div className="grid grid-cols-2 gap-6">
                <InfoCard 
                  icon={BookOpen} 
                  title="教育经历" 
                  onAdd={() => setActiveModal('education')}
                  items={client.educations}
                  renderItem={(edu) => (
                    <div key={edu.id} className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <div className="flex justify-between items-start">
                        <div className="text-xs font-bold text-gray-900">{edu.school}</div>
                        <div className="text-[10px] text-gray-400">{edu.startDate} - {edu.endDate}</div>
                      </div>
                      <div className="text-[10px] text-gray-500">{edu.degree} · {edu.major}</div>
                    </div>
                  )}
                />
                <InfoCard 
                  icon={Briefcase} 
                  title="工作经历" 
                  onAdd={() => setActiveModal('work')}
                  items={client.works}
                  renderItem={(work) => (
                    <div key={work.id} className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <div className="flex justify-between items-start">
                        <div className="text-xs font-bold text-gray-900">{work.company}</div>
                        <div className="text-[10px] text-gray-400">{work.startDate} - {work.endDate}</div>
                      </div>
                      <div className="text-[10px] text-gray-500">{work.position}</div>
                    </div>
                  )}
                />
                <InfoCard 
                  icon={Trophy} 
                  title={`奖项 (${client.awards?.length || 0})`} 
                  onAdd={() => setActiveModal('award')}
                  items={client.awards}
                  renderItem={(award) => (
                    <div key={award.id} className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <div className="flex justify-between items-start">
                        <div className="text-xs font-bold text-gray-900">{award.name}</div>
                        <div className="text-[10px] text-gray-400">{award.date}</div>
                      </div>
                      <div className="text-[10px] text-gray-500">{award.level}</div>
                    </div>
                  )}
                />
                <InfoCard icon={GraduationCap} title="学术成就">
                  <EditableField 
                    placeholder="点击输入内容..." 
                    value={client.academicAchievements}
                    onChange={(val) => onUpdateClient({ ...client, academicAchievements: val })}
                  />
                </InfoCard>
                <InfoCard icon={Target} title="课外活动">
                  <EditableField 
                    placeholder="点击输入内容..." 
                    value={client.extracurriculars}
                    onChange={(val) => onUpdateClient({ ...client, extracurriculars: val })}
                  />
                </InfoCard>
                <InfoCard icon={Heart} title="个人兴趣和爱好">
                  <EditableField 
                    placeholder="点击输入内容..." 
                    value={client.interests}
                    onChange={(val) => onUpdateClient({ ...client, interests: val })}
                  />
                </InfoCard>
                <InfoCard icon={Briefcase} title="职业抱负">
                  <EditableField 
                    placeholder="点击输入内容..." 
                    value={client.careerAspirations}
                    onChange={(val) => onUpdateClient({ ...client, careerAspirations: val })}
                  />
                </InfoCard>
                <InfoCard icon={Users} title="个人经验和挑战">
                  <EditableField 
                    placeholder="点击输入内容..." 
                    value={client.experiencesAndChallenges}
                    onChange={(val) => onUpdateClient({ ...client, experiencesAndChallenges: val })}
                  />
                </InfoCard>
                <InfoCard icon={Lightbulb} title="技能和素质">
                  <EditableField 
                    placeholder="点击输入内容..." 
                    value={client.skillsAndQualities}
                    onChange={(val) => onUpdateClient({ ...client, skillsAndQualities: val })}
                  />
                </InfoCard>
                <InfoCard icon={Sparkles} title="个人成长和发展">
                  <EditableField 
                    placeholder="点击输入内容..." 
                    value={client.growthAndDevelopment}
                    onChange={(val) => onUpdateClient({ ...client, growthAndDevelopment: val })}
                  />
                </InfoCard>
                <InfoCard icon={FileSearch} title="研究 & 论文 (0)" onAdd={() => {}} />
                <InfoCard icon={ShieldCheck} title="身份证明 (0)" onAdd={() => {}}>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1.5 bg-cyan-50 text-cyan-600 rounded-lg text-[10px] font-bold hover:bg-cyan-100 transition-colors">添加身份证</button>
                    <button className="px-3 py-1.5 bg-cyan-50 text-cyan-600 rounded-lg text-[10px] font-bold hover:bg-cyan-100 transition-colors">添加护照</button>
                  </div>
                </InfoCard>
              </div>

              {/* Add Block */}
              <button className="w-full py-12 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-300 hover:border-cyan-200 hover:text-cyan-400 transition-all bg-white/50 group">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-cyan-50 transition-colors">
                  <Plus size={24} />
                </div>
                <span className="text-sm font-bold text-gray-400 group-hover:text-cyan-600">添加信息块</span>
                <span className="text-[10px] text-gray-300 mt-1">自定义标题和内容</span>
              </button>
            </div>

            {/* Right Column - Sidebar Info */}
            <div className="col-span-4 space-y-6">
              <InfoCard 
                icon={Phone} 
                title="联系方式" 
                onAdd={() => setShowContactMenu(!showContactMenu)}
                items={client.contacts}
                renderItem={(contact) => (
                  <div key={contact.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                    <div className="text-cyan-500">
                      {contact.type === 'phone' ? <Phone size={14} /> : <MapPin size={14} />}
                    </div>
                    <div className="text-xs text-gray-700 font-medium">{contact.value}</div>
                  </div>
                )}
              />
              
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                  <Sparkles size={16} className="mr-2 text-cyan-500" />
                  AI 智能分析
                </h4>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      基于当前档案，该学生在<span className="text-cyan-600 font-bold">学术研究</span>方面表现突出，建议在文书中重点突出其在实验室的经历。
                    </p>
                  </div>
                  <button className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all">
                    生成背景提升建议
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {client.documents && client.documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {client.documents.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:bg-cyan-50 group-hover:text-cyan-500 transition-colors">
                        <FileText size={24} />
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {doc.type}
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2 line-clamp-1">{doc.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-3 mb-4 leading-relaxed">
                      {doc.content}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <span className="text-[10px] text-gray-400">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                      <button 
                        onClick={() => onEditDocument(doc)}
                        className="text-xs font-bold text-cyan-600 hover:text-cyan-700 transition-colors"
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                ))}
                {/* Add New Document Card */}
                <div className="relative">
                  <button 
                    onClick={() => setShowWritingMenu(!showWritingMenu)}
                    className="w-full h-full bg-white rounded-2xl border-2 border-dashed border-gray-100 p-6 flex flex-col items-center justify-center text-gray-300 hover:border-cyan-200 hover:text-cyan-400 transition-all group min-h-[200px]"
                  >
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-cyan-50 transition-colors">
                      <Plus size={24} />
                    </div>
                    <span className="text-sm font-bold text-gray-400 group-hover:text-cyan-600">新建文档</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[500px] flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
                  <FileText size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">暂无文档</h3>
                <p className="text-sm text-gray-400 mb-8 max-w-xs">
                  这里还没有创建任何文档。开始创建您的第一个文档吧！
                </p>
                <div className="relative">
                  <button 
                    onClick={() => setShowWritingMenu(!showWritingMenu)}
                    className="flex items-center px-8 py-3 bg-cyan-500 text-white rounded-xl text-sm font-bold hover:bg-cyan-600 transition-all shadow-xl shadow-cyan-100 active:scale-95"
                  >
                    <Plus size={20} className="mr-2" />
                    新建文档
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={activeModal === 'basicInfo'} onClose={() => setActiveModal(null)} onConfirm={handleUpdateBasicInfo} title="修改基本信息">
        <div className="space-y-4">
          <InputField 
            label="学生姓名" 
            placeholder="请输入学生姓名" 
            value={basicInfoForm.name}
            onChange={val => setBasicInfoForm({ ...basicInfoForm, name: val })}
          />
          <InputField 
            label="择导老师" 
            placeholder="请输入老师姓名" 
            value={basicInfoForm.advisor}
            onChange={val => setBasicInfoForm({ ...basicInfoForm, advisor: val })}
          />
          <InputField 
            label="总 GPA" 
            placeholder="例如: 3.8/4.0" 
            value={basicInfoForm.gpa}
            onChange={val => setBasicInfoForm({ ...basicInfoForm, gpa: val })}
          />
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'education'} onClose={() => setActiveModal(null)} onConfirm={handleAddEducation} title="添加教育经历">
        <div className="space-y-4">
          <InputField 
            label="学校名称" 
            placeholder="请输入学校名称" 
            value={eduForm.school}
            onChange={val => setEduForm({ ...eduForm, school: val })}
          />
          <InputField 
            label="教育程度" 
            selectOptions={['高中', '本科', '硕士', '博士', '其他']} 
            value={eduForm.degree}
            onChange={val => setEduForm({ ...eduForm, degree: val })}
          />
          <InputField 
            label="专业" 
            placeholder="请输入专业" 
            value={eduForm.major}
            onChange={val => setEduForm({ ...eduForm, major: val })}
          />
          <InputField 
            label="GPA" 
            placeholder="0" 
            value={eduForm.gpa}
            onChange={val => setEduForm({ ...eduForm, gpa: val })}
          />
          <InputField 
            label="额外信息" 
            placeholder="请输入额外信息" 
            value={eduForm.extraInfo}
            onChange={val => setEduForm({ ...eduForm, extraInfo: val })}
          />
          <InputField 
            label="备注" 
            placeholder="请输入备注" 
            value={eduForm.notes}
            onChange={val => setEduForm({ ...eduForm, notes: val })}
          />
          <div className="grid grid-cols-2 gap-4">
            <InputField 
              label="开始日期" 
              type="date" 
              value={eduForm.startDate}
              onChange={val => setEduForm({ ...eduForm, startDate: val })}
            />
            <InputField 
              label="结束日期" 
              type="date" 
              value={eduForm.endDate}
              onChange={val => setEduForm({ ...eduForm, endDate: val })}
            />
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'work'} onClose={() => setActiveModal(null)} onConfirm={handleAddWork} title="添加工作经历">
        <div className="space-y-4">
          <InputField 
            label="公司名称" 
            placeholder="请输入公司名称" 
            value={workForm.company}
            onChange={val => setWorkForm({ ...workForm, company: val })}
          />
          <InputField 
            label="职位" 
            placeholder="请输入职位" 
            value={workForm.position}
            onChange={val => setWorkForm({ ...workForm, position: val })}
          />
          <div className="grid grid-cols-2 gap-4">
            <InputField 
              label="开始日期" 
              type="date" 
              value={workForm.startDate}
              onChange={val => setWorkForm({ ...workForm, startDate: val })}
            />
            <InputField 
              label="结束日期" 
              type="date" 
              value={workForm.endDate}
              onChange={val => setWorkForm({ ...workForm, endDate: val })}
            />
          </div>
          <InputField 
            label="工作描述" 
            type="textarea" 
            placeholder="请输入工作描述" 
            value={workForm.description}
            onChange={val => setWorkForm({ ...workForm, description: val })}
          />
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'award'} onClose={() => setActiveModal(null)} onConfirm={handleAddAward} title="添加奖项">
        <div className="space-y-4">
          <InputField 
            label="奖项名称" 
            placeholder="请输入奖项名称" 
            value={awardForm.name}
            onChange={val => setAwardForm({ ...awardForm, name: val })}
          />
          <InputField 
            label="奖项范围" 
            selectOptions={['学校级', '城市级', '省级', '国家级', '国际级']} 
            value={awardForm.level}
            onChange={val => setAwardForm({ ...awardForm, level: val })}
          />
          <InputField 
            label="获得日期" 
            type="date" 
            value={awardForm.date}
            onChange={val => setAwardForm({ ...awardForm, date: val })}
          />
          <InputField 
            label="描述" 
            type="textarea" 
            placeholder="请输入奖项描述" 
            value={awardForm.description}
            onChange={val => setAwardForm({ ...awardForm, description: val })}
          />
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'contact'} onClose={() => setActiveModal(null)} onConfirm={handleAddContact} title={contactForm.type === 'phone' ? '添加联系方式' : '添加地址'}>
        <div className="space-y-4">
          <InputField 
            label={contactForm.type === 'phone' ? '电话/邮箱' : '详细地址'} 
            placeholder={contactForm.type === 'phone' ? '请输入联系方式' : '请输入详细地址'} 
            value={contactForm.value}
            onChange={val => setContactForm({ ...contactForm, value: val })}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ClientDetail;
