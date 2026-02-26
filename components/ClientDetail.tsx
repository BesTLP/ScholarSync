import React, { useState, useEffect, useRef } from 'react';
import { generateProfileAnalysis } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
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
  FileBadge,
  Trash2,
  Archive,
  Download,
  Link as LinkIcon,
  UserPlus,
  ArchiveRestore
} from 'lucide-react';
import { Client, FacultyRecord } from '../types';
import FacultyCard from './FacultyCard';

interface ClientDetailProps {
  client: Client;
  onBack: () => void;
  onStartWriting: (type?: string) => void;
  onEditDocument: (doc: any) => void;
  onUpdateClient: (client: Client) => void;
  initialTab?: 'profile' | 'documents' | 'mentors';
  facultyDatabase?: FacultyRecord[];
  onLinkFacultyToClient?: (facultyId: string, clientId: string) => void;
  onUnlinkFacultyFromClient?: (facultyId: string, clientId: string) => void;
  onDeleteClient?: (clientId: string) => void;
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
            确认
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
            placeholder={type === 'date' ? 'YYYY-MM-DD' : placeholder}
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

const ClientDetail: React.FC<ClientDetailProps> = ({ 
  client, 
  onBack, 
  onStartWriting, 
  onEditDocument, 
  onUpdateClient, 
  initialTab = 'profile',
  facultyDatabase = [],
  onLinkFacultyToClient,
  onUnlinkFacultyFromClient,
  onDeleteClient
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'mentors'>(initialTab);
  const [showWritingMenu, setShowWritingMenu] = useState(false);
  const [showContactMenu, setShowContactMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAddInfoMenu, setShowAddInfoMenu] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [basicInfoForm, setBasicInfoForm] = useState({ name: client.name, advisor: client.advisor || '', gpa: client.gpa || '' });

  // Form states
  const [eduForm, setEduForm] = useState({ school: '', degree: '', major: '', gpa: '', extraInfo: '', notes: '', startDate: '', endDate: '' });
  const [workForm, setWorkForm] = useState({ company: '', position: '', startDate: '', endDate: '', description: '' });
  const [awardForm, setAwardForm] = useState({ name: '', level: '', date: '', description: '' });
  const [contactForm, setContactForm] = useState({ type: 'phone' as 'phone' | 'address' | 'email', value: '' });
  const [researchForm, setResearchForm] = useState({ title: '', journal: '', date: '', link: '' });
  const [identityForm, setIdentityForm] = useState({ type: '身份证', number: '', expiry: '' });
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const writingMenuRef = useRef<HTMLDivElement>(null);
  const contactMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const addInfoMenuRef = useRef<HTMLDivElement>(null);

  // Refs for scrolling
  const academicRef = useRef<HTMLDivElement>(null);
  const extracurricularRef = useRef<HTMLDivElement>(null);
  const interestsRef = useRef<HTMLDivElement>(null);
  const careerRef = useRef<HTMLDivElement>(null);
  const experiencesRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const growthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (writingMenuRef.current && !writingMenuRef.current.contains(event.target as Node)) {
        setShowWritingMenu(false);
      }
      if (contactMenuRef.current && !contactMenuRef.current.contains(event.target as Node)) {
        setShowContactMenu(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (addInfoMenuRef.current && !addInfoMenuRef.current.contains(event.target as Node)) {
        setShowAddInfoMenu(false);
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

  const handleAddResearch = () => {
    const newPaper = { id: Math.random().toString(), ...researchForm };
    onUpdateClient({
      ...client,
      researchPapers: [...(client.researchPapers || []), newPaper]
    });
    setResearchForm({ title: '', journal: '', date: '', link: '' });
    setActiveModal(null);
  };

  const handleAddIdentity = () => {
    const newDoc = { id: Math.random().toString(), ...identityForm };
    onUpdateClient({
      ...client,
      identityDocs: [...(client.identityDocs || []), newDoc]
    });
    setIdentityForm({ type: '身份证', number: '', expiry: '' });
    setActiveModal(null);
  };

  const handleUpdateAvatar = () => {
    if (avatarUrlInput) {
      onUpdateClient({ ...client, avatarUrl: avatarUrlInput });
    }
    setActiveModal(null);
  };

  const handleGenerateAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await generateProfileAnalysis(client);
      setAiAnalysis(analysis);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(client, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${client.name}_profile.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowMoreMenu(false);
  };

  const handleToggleArchive = () => {
    const newStatus = client.status === 'archived' ? 'active' : 'archived';
    onUpdateClient({ ...client, status: newStatus });
    setShowMoreMenu(false);
  };

  const handleDeleteClient = () => {
    if (confirm('确定要删除该客户吗？此操作无法撤销。')) {
      onDeleteClient?.(client.id);
      onBack();
    }
    setShowMoreMenu(false);
  };

  const handleDownloadDocument = (doc: any) => {
    const blob = new Blob([doc.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.title || 'document'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteDocument = (docId: string) => {
    if (confirm('确定要删除该文档吗？此操作无法撤销。')) {
      const updatedDocs = client.documents?.filter(d => d.id !== docId) || [];
      onUpdateClient({ ...client, documents: updatedDocs });
    }
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Focus the textarea inside
      const textarea = ref.current.querySelector('textarea');
      if (textarea) textarea.focus();
    }
    setShowAddInfoMenu(false);
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
            {items.map((item, index) => (
              <React.Fragment key={item.id || index}>
                {renderItem(item)}
              </React.Fragment>
            ))}
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
              <span className="text-gray-400">留学咩</span>
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

            <div className="relative" ref={moreMenuRef}>
              <button 
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl border border-gray-100 transition-all"
              >
                <MoreHorizontal size={18} />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in duration-200">
                  <button onClick={handleExportJSON} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center">
                    <Download size={14} className="mr-2" />
                    导出客户信息(JSON)
                  </button>
                  <button onClick={handleToggleArchive} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center">
                    {client.status === 'archived' ? <ArchiveRestore size={14} className="mr-2" /> : <Archive size={14} className="mr-2" />}
                    {client.status === 'archived' ? '恢复到服务中' : '归档客户'}
                  </button>
                  <div className="h-px bg-gray-50 my-1" />
                  <button onClick={handleDeleteClient} className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center">
                    <Trash2 size={14} className="mr-2" />
                    删除客户
                  </button>
                </div>
              )}
            </div>
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
          <button 
            onClick={() => setActiveTab('mentors')}
            className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'mentors' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <UserCheck size={14} className="mr-2" />
            推荐导师
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Main Profile */}
            <div className="col-span-8 space-y-6">
              {/* Profile Header Card */}
              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center text-white text-3xl font-bold overflow-hidden relative group cursor-pointer" onClick={() => setActiveModal('avatar')}>
                      <img 
                        src={client.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`} 
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
                        <span className="text-xs text-gray-400">状态: <span className={client.status === 'archived' ? "text-gray-500 font-bold" : "text-emerald-500 font-bold"}>{client.status === 'archived' ? '已归档' : '服务中'}</span></span>
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
                {/* 择导档案卡 */}
                <div className="col-span-2">
                  <InfoCard icon={ClipboardList} title="择导档案">
                    <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                      <div className="space-y-2">
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">目标国家</span>
                          <span className="text-xs text-gray-700 font-medium">{client.targetCountries || '未填写'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">意向院校</span>
                          <span className="text-xs text-gray-700 font-medium text-right max-w-[60%]">{client.targetUniversities || '未填写'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">目标专业</span>
                          <span className="text-xs text-gray-700 font-medium">{client.targetDepartment || '未填写'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">入学时间</span>
                          <span className="text-xs text-gray-700 font-medium">{client.entryYear || '未填写'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">奖学金要求</span>
                          <span className="text-xs text-gray-700 font-medium">{client.scholarshipRequirement || '未填写'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">排除项</span>
                          <span className="text-xs text-gray-700 font-medium">{client.exclusions || '未填写'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">特殊要求</span>
                          <span className="text-xs text-gray-700 font-medium text-right max-w-[60%]">{client.specialRequirements || '未填写'}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">择导类型/数量</span>
                          <span className="text-xs text-gray-700 font-medium">{client.selectionType || '未填写'} / {client.selectionCount || '0'}个</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">截止时间</span>
                          <span className="text-xs text-gray-700 font-medium">{client.selectionDeadline || '未填写'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">业务负责人</span>
                          <span className="text-xs text-gray-700 font-medium">{client.businessCoordinator || '未填写'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">RP/CV 状态</span>
                          <span className="text-xs text-gray-700 font-medium">
                            {client.hasRP ? '有RP' : '无RP'} / {client.hasCV ? '有CV' : '无CV'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">RP 题目/方向</span>
                          <span className="text-xs text-gray-700 font-medium text-right max-w-[60%]">{client.rpTopic || '未填写'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">排名偏好</span>
                          <span className="text-xs text-gray-700 font-medium">{client.rankingPreference || '未填写'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">接受交叉学科</span>
                          <span className="text-xs text-gray-700 font-medium">{client.acceptCrossDiscipline ? '是' : '否'}</span>
                        </div>
                      </div>
                    </div>
                  </InfoCard>
                </div>

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
                <div ref={academicRef}>
                  <InfoCard icon={GraduationCap} title="学术成就">
                    <EditableField 
                      placeholder="点击输入内容..." 
                      value={client.academicAchievements}
                      onChange={(val) => onUpdateClient({ ...client, academicAchievements: val })}
                    />
                  </InfoCard>
                </div>
                <div ref={extracurricularRef}>
                  <InfoCard icon={Target} title="课外活动">
                    <EditableField 
                      placeholder="点击输入内容..." 
                      value={client.extracurriculars}
                      onChange={(val) => onUpdateClient({ ...client, extracurriculars: val })}
                    />
                  </InfoCard>
                </div>
                <div ref={interestsRef}>
                  <InfoCard icon={Heart} title="个人兴趣和爱好">
                    <EditableField 
                      placeholder="点击输入内容..." 
                      value={client.interests}
                      onChange={(val) => onUpdateClient({ ...client, interests: val })}
                    />
                  </InfoCard>
                </div>
                <div ref={careerRef}>
                  <InfoCard icon={Briefcase} title="职业抱负">
                    <EditableField 
                      placeholder="点击输入内容..." 
                      value={client.careerAspirations}
                      onChange={(val) => onUpdateClient({ ...client, careerAspirations: val })}
                    />
                  </InfoCard>
                </div>
                <div ref={experiencesRef}>
                  <InfoCard icon={Users} title="个人经验和挑战">
                    <EditableField 
                      placeholder="点击输入内容..." 
                      value={client.experiencesAndChallenges}
                      onChange={(val) => onUpdateClient({ ...client, experiencesAndChallenges: val })}
                    />
                  </InfoCard>
                </div>
                <div ref={skillsRef}>
                  <InfoCard icon={Lightbulb} title="技能和素质">
                    <EditableField 
                      placeholder="点击输入内容..." 
                      value={client.skillsAndQualities}
                      onChange={(val) => onUpdateClient({ ...client, skillsAndQualities: val })}
                    />
                  </InfoCard>
                </div>
                <div ref={growthRef}>
                  <InfoCard icon={Sparkles} title="个人成长和发展">
                    <EditableField 
                      placeholder="点击输入内容..." 
                      value={client.growthAndDevelopment}
                      onChange={(val) => onUpdateClient({ ...client, growthAndDevelopment: val })}
                    />
                  </InfoCard>
                </div>
                <InfoCard 
                  icon={FileSearch} 
                  title={`研究 & 论文 (${client.researchPapers?.length || 0})`} 
                  onAdd={() => setActiveModal('research')}
                  items={client.researchPapers}
                  renderItem={(paper: any) => (
                    <div key={paper.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-900 text-xs">{paper.title}</div>
                          <div className="text-[10px] text-gray-500 mt-1">{paper.journal} · {paper.date}</div>
                        </div>
                        {paper.link && (
                          <a href={paper.link} target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:text-cyan-600">
                            <LinkIcon size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                />
                <InfoCard 
                  icon={ShieldCheck} 
                  title={`身份证明 (${client.identityDocs?.length || 0})`} 
                  onAdd={() => setActiveModal('identity')}
                  items={client.identityDocs}
                  renderItem={(doc: any) => (
                    <div key={doc.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-gray-900 text-xs">{doc.type}</div>
                          <div className="text-[10px] text-gray-500 mt-1">{doc.number}</div>
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                          有效期: {doc.expiry}
                        </div>
                      </div>
                    </div>
                  )}
                />
              </div>

              {/* Add Block */}
              <div className="relative" ref={addInfoMenuRef}>
                <button 
                  onClick={() => setShowAddInfoMenu(!showAddInfoMenu)}
                  className="w-full py-12 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-300 hover:border-cyan-200 hover:text-cyan-400 transition-all bg-white/50 group"
                >
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-cyan-50 transition-colors">
                    <Plus size={24} />
                  </div>
                  <span className="text-sm font-bold text-gray-400 group-hover:text-cyan-600">添加信息块</span>
                  <span className="text-[10px] text-gray-300 mt-1">自定义标题和内容</span>
                </button>
                {showAddInfoMenu && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in duration-200">
                    {[
                      { label: '学术成就', ref: academicRef },
                      { label: '课外活动', ref: extracurricularRef },
                      { label: '个人兴趣', ref: interestsRef },
                      { label: '职业目标', ref: careerRef },
                      { label: '经历与挑战', ref: experiencesRef },
                      { label: '技能与特质', ref: skillsRef },
                      { label: '成长与发展', ref: growthRef },
                    ].map((item) => (
                      <button 
                        key={item.label}
                        onClick={() => scrollToSection(item.ref)}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                  <div className="p-4 bg-gray-50 rounded-xl min-h-[100px]">
                    {aiAnalysis ? (
                      <div className="prose prose-sm max-w-none text-xs text-gray-600">
                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 leading-relaxed">
                        基于当前档案，该学生在<span className="text-cyan-600 font-bold">学术研究</span>方面表现突出，建议在文书中重点突出其在实验室的经历。
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={handleGenerateAnalysis}
                    disabled={isAnalyzing}
                    className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {isAnalyzing ? (
                      <>
                        <Sparkles size={14} className="mr-2 animate-spin" />
                        分析中...
                      </>
                    ) : (
                      '生成背景提升建议'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
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
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleDownloadDocument(doc)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="下载"
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button 
                          onClick={() => onEditDocument(doc)}
                          className="text-xs font-bold text-cyan-600 hover:text-cyan-700 transition-colors ml-2"
                        >
                          查看详情
                        </button>
                      </div>
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

        {activeTab === 'mentors' && (
          <div className="space-y-6">
            {client.linkedFacultyIds && client.linkedFacultyIds.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {facultyDatabase
                  .filter(f => client.linkedFacultyIds?.includes(f.id))
                  .map(faculty => (
                    <FacultyCard
                      key={faculty.id}
                      prof={faculty}
                      isDatabaseView={true}
                      isLinked={true}
                      onUnlink={() => onUnlinkFacultyFromClient?.(faculty.id, client.id)}
                      linkedClientCount={faculty.linkedClientIds?.length || 0}
                    />
                  ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[400px] flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
                  <UserCheck size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">暂无推荐导师</h3>
                <p className="text-sm text-gray-400 mb-8 max-w-xs">
                  还没有为该学生推荐任何导师。请前往导师库或智能匹配进行推荐。
                </p>
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
            label="类型" 
            selectOptions={['phone', 'email', 'address']} 
            value={contactForm.type}
            onChange={val => setContactForm({ ...contactForm, type: val as any })}
          />
          <InputField 
            label="内容" 
            placeholder={contactForm.type === 'phone' ? '请输入电话' : contactForm.type === 'email' ? '请输入邮箱' : '请输入地址'} 
            type={contactForm.type === 'phone' ? 'tel' : contactForm.type === 'email' ? 'email' : 'text'}
            value={contactForm.value}
            onChange={val => setContactForm({ ...contactForm, value: val })}
          />
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'research'} onClose={() => setActiveModal(null)} onConfirm={handleAddResearch} title="添加研究 & 论文">
        <div className="space-y-4">
          <InputField 
            label="论文标题" 
            placeholder="请输入论文标题" 
            value={researchForm.title}
            onChange={val => setResearchForm({ ...researchForm, title: val })}
          />
          <InputField 
            label="期刊/会议" 
            placeholder="请输入发表期刊或会议" 
            value={researchForm.journal}
            onChange={val => setResearchForm({ ...researchForm, journal: val })}
          />
          <InputField 
            label="发表日期" 
            type="date"
            value={researchForm.date}
            onChange={val => setResearchForm({ ...researchForm, date: val })}
          />
          <InputField 
            label="DOI / 链接" 
            placeholder="请输入链接" 
            value={researchForm.link}
            onChange={val => setResearchForm({ ...researchForm, link: val })}
          />
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'identity'} onClose={() => setActiveModal(null)} onConfirm={handleAddIdentity} title="添加身份证明">
        <div className="space-y-4">
          <InputField 
            label="证件类型" 
            selectOptions={['身份证', '护照', '签证', '其他']} 
            value={identityForm.type}
            onChange={val => setIdentityForm({ ...identityForm, type: val })}
          />
          <InputField 
            label="证件号码" 
            placeholder="请输入证件号码" 
            value={identityForm.number}
            onChange={val => setIdentityForm({ ...identityForm, number: val })}
          />
          <InputField 
            label="有效期" 
            type="date"
            value={identityForm.expiry}
            onChange={val => setIdentityForm({ ...identityForm, expiry: val })}
          />
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'avatar'} onClose={() => setActiveModal(null)} onConfirm={handleUpdateAvatar} title="修改头像">
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-lg overflow-hidden">
              <img 
                src={avatarUrlInput || client.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`} 
                alt="preview" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <InputField 
            label="头像 URL" 
            placeholder="请输入图片 URL (支持 http/https)" 
            value={avatarUrlInput}
            onChange={val => setAvatarUrlInput(val)}
          />
          <p className="text-xs text-gray-400 text-center">
            留空则使用默认生成的卡通头像
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default ClientDetail;
