import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Moon,
  Play,
  Rocket,
  Users,
  FileText,
  Clock,
  Zap,
  ChevronRight,
  ChevronLeft,
  Wand2,
  Search as SearchIcon,
  UserPlus,
  BookOpen,
  Mail,
  FileUser,
  ShieldCheck,
  Edit3,
  MessageCircle,
  Plus,
  X,
  Minimize2,
  Maximize2,
  GripHorizontal,
  CalendarDays,
  CalendarRange,
  Calendar as CalendarIcon,
  LayoutGrid,
  LayoutList,
  ChevronDown,
  Check
} from 'lucide-react';
import { TabId } from './Sidebar';
import { Client, ClientEvent } from '../types';

// --- Sub-components ---

const StatCard: React.FC<{ title: string, value: string, icon: React.ElementType, color: string }> = ({ title, value, icon: Icon, color }) => (
  <div className="glass p-6 rounded-3xl shadow-lg shadow-black/5 flex flex-col justify-between transition-transform duration-300 hover:scale-[1.02]">
    <div className="flex justify-between items-start mb-4">
      <span className="text-gray-500 text-sm font-medium">{title}</span>
      <div className={`p-2 rounded-xl ${color}`}>
        <Icon size={20} className="text-current" />
      </div>
    </div>
    <div>
      <div className="text-3xl font-bold text-gray-900 mb-2">{value}</div>
    </div>
  </div>
);

const ActionCard: React.FC<{ icon: React.ElementType, title: string, subtitle: string, iconBg: string, iconColor: string, onClick?: () => void }> = ({ icon: Icon, title, subtitle, iconBg, iconColor, onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center p-4 glass rounded-2xl shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-300 group text-left w-full hover:scale-[1.02]"
  >
    <div className={`p-3 rounded-xl ${iconBg} ${iconColor} mr-4 shrink-0 transition-transform duration-300 group-hover:scale-110`}>
      <Icon size={24} />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-semibold text-gray-900 truncate">{title}</h4>
      <p className="text-xs text-gray-500 truncate">{subtitle}</p>
    </div>
    <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors ml-2" />
  </button>
);

// --- Main Dashboard Component ---

interface DashboardProps {
  onTabChange: (tab: TabId) => void;
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onUpdateClient?: (client: Client) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onTabChange, clients, onSelectClient, onUpdateClient }) => {
  const totalDocuments = clients.reduce((acc, client) => acc + (client.documents?.length || 0), 0);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);

  // Global Events State
  const [globalEvents, setGlobalEvents] = useState<ClientEvent[]>(() => {
    try {
      const saved = localStorage.getItem('scholarsync_global_events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('scholarsync_global_events', JSON.stringify(globalEvents));
    } catch (e) {
      console.error('Failed to save global events', e);
    }
  }, [globalEvents]);

  // Event Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState<Partial<ClientEvent>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    type: 'other',
    description: '',
    priority: 'medium',
    completed: false,
    clientId: 'global'
  });
  
  // Combined View State
  const [activeView, setActiveView] = useState<'calendar' | 'timeline-month' | 'timeline-year'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toggleEventCompletion = (event: ClientEvent) => {
    const updatedEvent = { ...event, completed: !event.completed };
    
    if (event.clientId === 'global') {
      setGlobalEvents(prev => prev.map(e => e.id === event.id ? updatedEvent : e));
    } else {
      const client = clients.find(c => c.id === event.clientId);
      if (client && onUpdateClient) {
        const updatedEvents = (client.events || []).map(e => e.id === event.id ? updatedEvent : e);
        onUpdateClient({ ...client, events: updatedEvents });
      }
    }
  };

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // Client List State
  const [clientViewMode, setClientViewMode] = useState<'thumbnail' | 'list' | 'compact'>('thumbnail');
  const sortedClients = [...clients].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  // Gather all events
  const allEvents = [
    ...globalEvents.map(e => ({ ...e, clientName: '个人日程' })),
    ...clients.flatMap(client => 
      (client.events || []).map(event => ({
        ...event,
        clientName: client.name
      }))
    )
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = clients.filter(client => 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.advisor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.university?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.educations?.some(edu => edu.school.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, clients]);

  const quickActions = [
    { id: 'agent' as TabId, title: '文书 Agent', subtitle: '全流程智能文书创作', icon: Wand2, iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
    { id: 'faculty-matcher' as TabId, title: '学术导师智能检索', subtitle: '精准匹配全球顶尖导师', icon: SearchIcon, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { id: 'users' as TabId, title: '智能建档', subtitle: '快速录入学生背景信息', icon: UserPlus, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { id: 'ps' as TabId, title: '撰写 PS', subtitle: '个性化个人陈述生成', icon: FileText, iconBg: 'bg-orange-50', iconColor: 'text-orange-600' },
    { id: 'essay' as TabId, title: '命题 Essay', subtitle: '针对性命题文书创作', icon: BookOpen, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
    { id: 'lor' as TabId, title: '推荐信', subtitle: '专业推荐信润色与生成', icon: Mail, iconBg: 'bg-rose-50', iconColor: 'text-rose-600' },
    { id: 'cv' as TabId, title: '生成 CV', subtitle: '标准化简历一键导出', icon: FileUser, iconBg: 'bg-cyan-50', iconColor: 'text-cyan-600' },
    { id: 'ai-shield' as TabId, title: '降 AI 率', subtitle: '文书去 AI 痕迹优化', icon: ShieldCheck, iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
    { id: 'freewrite' as TabId, title: '智能编辑器', subtitle: '沉浸式文书精修空间', icon: Edit3, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  ];

  const today = new Date();
  
  const getEventColor = (type: string) => {
    switch (type) {
      case 'deadline': return 'bg-red-50 text-red-700 border-red-200';
      case 'interview': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'submission': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'meeting': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'reminder': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-l-red-500';
      case 'medium': return 'border-l-4 border-l-orange-500';
      default: return '';
    }
  };

  const getClientColor = (clientId: string) => {
    if (clientId === 'global') return 'bg-slate-100 text-slate-700 border-slate-200';
    const colors = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-purple-50 text-purple-700 border-purple-200',
      'bg-rose-50 text-rose-700 border-rose-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-cyan-50 text-cyan-700 border-cyan-200',
    ];
    // Simple hash for consistent color
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
      hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleSaveEvent = () => {
    if (!eventForm.title || !eventForm.date) {
      alert('请输入标题和日期');
      return;
    }
    
    const newEvent: ClientEvent = {
      id: eventForm.id || crypto.randomUUID(),
      clientId: eventForm.clientId || 'global',
      title: eventForm.title,
      date: eventForm.date,
      time: eventForm.time,
      type: eventForm.type as any,
      description: eventForm.description,
      priority: eventForm.priority as any,
      completed: eventForm.completed || false
    };

    // If editing, first remove from old location
    if (eventForm.id) {
      // Remove from global
      setGlobalEvents(prev => prev.filter(e => e.id !== eventForm.id));
      // Remove from clients
      clients.forEach(c => {
        if (c.events?.some(e => e.id === eventForm.id)) {
          if (onUpdateClient) {
            onUpdateClient({
              ...c,
              events: c.events.filter(e => e.id !== eventForm.id)
            });
          }
        }
      });
    }

    // Add to new location
    if (newEvent.clientId === 'global') {
      setGlobalEvents(prev => [...prev, newEvent]);
    } else {
      const client = clients.find(c => c.id === newEvent.clientId);
      if (client && onUpdateClient) {
        // We might have just called onUpdateClient above, so we need to be careful with state updates.
        // Actually, if we just removed it from the SAME client, the above onUpdateClient might be overwritten by this one.
        // Let's do it safely:
        const currentEvents = client.events?.filter(e => e.id !== eventForm.id) || [];
        onUpdateClient({ ...client, events: [...currentEvents, newEvent] });
      }
    }
    
    setIsEventModalOpen(false);
  };

  const handleDeleteEvent = () => {
    if (!eventForm.id) return;
    
    // Remove from global
    setGlobalEvents(prev => prev.filter(e => e.id !== eventForm.id));
    // Remove from clients
    clients.forEach(c => {
      if (c.events?.some(e => e.id === eventForm.id)) {
        if (onUpdateClient) {
          onUpdateClient({
            ...c,
            events: c.events.filter(e => e.id !== eventForm.id)
          });
        }
      }
    });
    
    setIsEventModalOpen(false);
  };

  const openEventModal = (dateStr?: string, event?: ClientEvent) => {
    if (event) {
      setEventForm(event);
    } else {
      setEventForm({
        title: '',
        date: dateStr || formatDate(new Date()),
        time: '',
        type: 'other',
        description: '',
        priority: 'medium',
        completed: false,
        clientId: 'global'
      });
    }
    setIsEventModalOpen(true);
  };

  const renderTimelinePanel = () => {
    return null; // No longer used, combined into main view
  };

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Header */}
      <header className="glass border-b border-white/40 h-16 flex items-center justify-between px-8 sticky top-0 z-10 backdrop-blur-xl">
        <div className="flex items-center">
          <span className="text-xl font-bold text-gray-900">留学咩</span>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-white/50">
            <Moon size={20} />
          </button>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="搜索客户..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/50 border border-gray-200/50 rounded-xl py-2 pl-10 pr-12 text-sm focus:ring-2 focus:ring-blue-500/30 w-64 transition-all backdrop-blur-sm"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-[10px] font-medium text-gray-400 bg-white/80 px-1.5 py-0.5 rounded border border-gray-200/50">⌘K</span>
            </div>
            
            {/* Search Results Dropdown */}
            {searchQuery && (
              <div className="absolute top-full left-0 w-full mt-2 glass rounded-2xl shadow-xl border border-white/50 py-2 z-50 max-h-64 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map(client => (
                      <button 
                        key={client.id}
                        onClick={() => onSelectClient(client)}
                        className="w-full text-left px-4 py-2 hover:bg-white/60 flex items-center border-b border-gray-100/50 last:border-0 transition-colors"
                      >
                        <div className="w-8 h-8 bg-gray-100 rounded-full mr-3 overflow-hidden shrink-0 flex items-center justify-center text-gray-500 font-bold text-xs">
                           {client.avatarUrl ? (
                             <img src={client.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                           ) : (
                             client.name.charAt(0).toUpperCase()
                           )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gray-900 truncate">{client.name}</div>
                          <div className="text-xs text-gray-500 truncate">{client.advisor || '未分配导师'}</div>
                        </div>
                      </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-xs text-gray-500 text-center">未找到相关客户</div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 pl-2 border-l border-gray-200/50">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-gray-900 leading-none">留学咩用户</div>
              <div className="text-[10px] text-gray-500 mt-1">Pro Plan</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-white shadow-sm overflow-hidden flex items-center justify-center text-blue-600 font-bold">
              U
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 pt-8">
        {/* Block A: Welcome */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">👋 欢迎回来</h1>
            <p className="text-gray-500 text-sm mb-4">今天也要为学生们创造更出色的文书哦！</p>
            <div className="flex space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50/80 text-blue-600 border border-blue-100/50 backdrop-blur-sm">
                专业版许可证
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50/80 text-emerald-600 border border-emerald-100/50 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                在线服务正常
              </span>
            </div>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => onTabChange('agent')}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:scale-[1.02]"
            >
              <Rocket size={16} className="mr-2" />
              快速开始
            </button>
          </div>
        </div>

        {/* Block B: Combined Calendar & Timeline */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4 px-1">
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">日程中心</h3>
              <p className="text-xs text-gray-400 mt-1">管理您的全局日程与学生 DDL</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-white/60 backdrop-blur-sm rounded-xl p-1 shadow-sm border border-gray-100">
                <button 
                  onClick={() => setActiveView('calendar')} 
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeView === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  日历视图
                </button>
                <button 
                  onClick={() => setActiveView('timeline-month')} 
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeView === 'timeline-month' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  月度时间线
                </button>
                <button 
                  onClick={() => setActiveView('timeline-year')} 
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeView === 'timeline-year' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  年度时间线
                </button>
              </div>

              <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

              <div className="flex items-center bg-white/60 backdrop-blur-sm rounded-xl p-1 shadow-sm border border-gray-100 relative" ref={datePickerRef}>
                <button onClick={prevMonth} className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-500"><ChevronLeft size={16} /></button>
                <button 
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                  className="px-4 text-sm font-bold text-gray-700 min-w-[120px] text-center hover:bg-white rounded-lg py-1 transition-colors flex items-center justify-center gap-1"
                >
                  {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isDatePickerOpen ? 'rotate-180' : ''}`} />
                </button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-500"><ChevronRight size={16} /></button>

                {isDatePickerOpen && (
                  <div className="absolute top-full left-0 mt-3 bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 z-[100] w-[400px] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-3 block px-1 tracking-widest">年份</label>
                        <div className="flex flex-col gap-1 max-h-56 overflow-y-auto custom-scrollbar pr-2">
                          {Array.from({ length: 21 }, (_, i) => currentDate.getFullYear() - 10 + i).map(year => (
                            <button
                              key={year}
                              onClick={() => {
                                setCurrentDate(new Date(year, currentDate.getMonth(), 1));
                              }}
                              className={`px-3 py-2 text-xs rounded-xl transition-all text-left ${currentDate.getFullYear() === year ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20' : 'hover:bg-gray-50 text-gray-600'}`}
                            >
                              {year}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-3 block px-1 tracking-widest">月份</label>
                        <div className="flex flex-col gap-1 max-h-56 overflow-y-auto custom-scrollbar pr-2">
                          {Array.from({ length: 12 }, (_, i) => i).map(month => (
                            <button
                              key={month}
                              onClick={() => {
                                setCurrentDate(new Date(currentDate.getFullYear(), month, 1));
                              }}
                              className={`px-3 py-2 text-xs rounded-xl transition-all text-left ${currentDate.getMonth() === month ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20' : 'hover:bg-gray-50 text-gray-600'}`}
                            >
                              {month + 1}月
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-3 block px-1 tracking-widest">日期</label>
                        <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-2">
                          {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                            const dateStr = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                            const isSelected = selectedDate === dateStr;
                            return (
                              <button
                                key={day}
                                onClick={() => {
                                  setSelectedDate(dateStr);
                                  const dayEvts = allEvents.filter(e => e.date === dateStr);
                                  if (dayEvts.length > 0) {
                                    setIsDayDetailModalOpen(true);
                                  } else {
                                    openEventModal(dateStr);
                                  }
                                  setIsDatePickerOpen(false);
                                }}
                                className={`px-2 py-2 text-xs rounded-xl transition-all text-center ${isSelected ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20' : 'hover:bg-gray-50 text-gray-600'}`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center">
                      <button 
                        onClick={() => {
                          const now = new Date();
                          setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
                          setSelectedDate(formatDate(now));
                          setIsDatePickerOpen(false);
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        回到今天
                      </button>
                      <button 
                        onClick={() => setIsDatePickerOpen(false)}
                        className="px-6 py-2 bg-gray-900 text-white text-[10px] font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 active:scale-95"
                      >
                        确认
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => openEventModal()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
              >
                <Plus size={16} className="mr-2" />
                新建日程
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Main Content Area */}
            <div className="w-full">
              <div className="glass rounded-3xl shadow-sm p-6 min-h-[600px] flex flex-col">
                {activeView === 'calendar' ? (
                  <div className="grid grid-cols-7 gap-2 h-full">
                    {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(d => (
                      <div key={d} className="text-center text-xs font-bold text-gray-400 py-2 border-b border-gray-100 mb-2">{d}</div>
                    ))}
                    {(() => {
                      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                      const daysInMonth = lastDayOfMonth.getDate();
                      const startOffset = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
                      
                      return Array.from({ length: daysInMonth + startOffset }).map((_, i) => {
                        const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i - startOffset + 1);
                        const isCurrentMonth = cellDate.getMonth() === currentDate.getMonth();
                        
                        if (!isCurrentMonth) {
                          return <div key={i} className="min-h-[110px] p-2 rounded-xl border border-transparent"></div>;
                        }

                        const dateStr = formatDate(cellDate);
                        const dayEvts = allEvents.filter(e => e.date === dateStr);
                        const isToday = dateStr === formatDate(today);
                        const isSelected = selectedDate === dateStr;
                        
                        return (
                          <div 
                            key={i} 
                            onClick={() => {
                              setSelectedDate(dateStr);
                              if (dayEvts.length > 0) {
                                setIsDayDetailModalOpen(true);
                              } else {
                                openEventModal(dateStr);
                              }
                            }}
                            className={`min-h-[110px] p-2 rounded-2xl border cursor-pointer transition-all flex flex-col ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/30 border-blue-200' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'} ${isToday && !isSelected ? 'border-blue-400 bg-blue-50/10' : ''}`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className={`text-xs font-bold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                                {cellDate.getDate()}
                              </span>
                              {dayEvts.length > 0 && (
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                  {dayEvts.length}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 overflow-hidden">
                              {dayEvts.slice(0, 3).map(event => (
                                <div 
                                  key={event.id} 
                                  className={`text-[9px] px-1.5 py-1 rounded-lg truncate flex items-center gap-1 ${event.completed ? 'opacity-40 grayscale' : ''} ${getClientColor(event.clientId)}`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${event.completed ? 'bg-gray-400' : 'bg-current'}`}></div>
                                  <span className="truncate">{event.title} - {event.clientName}</span>
                                </div>
                              ))}
                              {dayEvts.length > 3 && (
                                <div className="text-[9px] text-gray-400 text-center font-medium">+{dayEvts.length - 3} 更多</div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {(() => {
                      const filtered = allEvents.filter(e => {
                        if (activeView === 'timeline-month') {
                          return e.date.startsWith(currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0'));
                        }
                        return e.date.startsWith(currentDate.getFullYear().toString());
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center text-center py-20">
                            <CalendarIcon size={48} className="text-gray-200 mb-4" />
                            <p className="text-gray-500 font-medium">该时段暂无日程安排</p>
                            <button onClick={() => openEventModal()} className="mt-4 text-sm text-blue-600 font-bold hover:underline">立即添加</button>
                          </div>
                        );
                      }

                      // Group by date
                      const grouped: { [key: string]: typeof allEvents } = {};
                      filtered.forEach(e => {
                        if (!grouped[e.date]) grouped[e.date] = [];
                        grouped[e.date].push(e);
                      });

                      return Object.keys(grouped).sort().map(date => (
                        <div key={date} className="relative pl-8 border-l-2 border-gray-100 pb-8 last:pb-0">
                          <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${date === formatDate(today) ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                          <div className="mb-4 flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-900">{date}</span>
                            <span className="text-xs text-gray-400">
                              {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(date).getDay()]}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {grouped[date].map(event => (
                              <div 
                                key={event.id} 
                                onClick={() => openEventModal(event.date, event)}
                                className={`p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all flex items-start gap-3 ${getClientColor(event.clientId)} ${getPriorityBorder(event.priority)} ${event.completed ? 'opacity-50 grayscale' : ''}`}
                              >
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleEventCompletion(event);
                                  }}
                                  className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${event.completed ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 hover:border-blue-400'}`}
                                >
                                  {event.completed && <Check size={14} strokeWidth={3} />}
                                </button>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-sm font-bold truncate ${event.completed ? 'line-through' : ''}`}>{event.title}</span>
                                    {event.time && <span className="text-[10px] opacity-60 shrink-0">{event.time}</span>}
                                  </div>
                                  <div className="text-[10px] font-medium opacity-80">学生: {event.clientName}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Block C: Quick Ops */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">快速操作</h3>
            <span className="text-gray-400 text-sm font-medium">管理功能</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {quickActions.map((action) => (
              <ActionCard 
                key={action.id}
                icon={action.icon}
                title={action.title}
                subtitle={action.subtitle}
                iconBg={action.iconBg}
                iconColor={action.iconColor}
                onClick={() => onTabChange(action.id)}
              />
            ))}
          </div>
        </div>

        {/* Block E: Business Lists */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">客户列表</h3>
                <span className="text-xs text-gray-400">最近修改</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 bg-blue-50/80 backdrop-blur-sm text-blue-600 text-xs font-bold rounded-full border border-blue-100/50">{clients.length} 位客户</span>
                <div className="flex bg-white/60 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-gray-100">
                  <button onClick={() => setClientViewMode('thumbnail')} className={`p-1.5 rounded-md transition-colors ${clientViewMode === 'thumbnail' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} title="缩略图视图">
                    <LayoutGrid size={16} />
                  </button>
                  <button onClick={() => setClientViewMode('list')} className={`p-1.5 rounded-md transition-colors ${clientViewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} title="列表视图">
                    <LayoutList size={16} />
                  </button>
                  <button onClick={() => setClientViewMode('compact')} className={`p-1.5 rounded-md transition-colors ${clientViewMode === 'compact' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} title="紧凑视图">
                    <Users size={16} />
                  </button>
                </div>
              </div>
            </div>
            
            {sortedClients.length > 0 ? (
              <div className={
                clientViewMode === 'thumbnail' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" :
                clientViewMode === 'compact' ? "flex flex-wrap gap-3" :
                "space-y-3"
              }>
                {sortedClients.map(client => {
                  if (clientViewMode === 'thumbnail') {
                    return (
                      <div 
                        key={client.id} 
                        onClick={() => onSelectClient(client)}
                        className="glass p-4 rounded-3xl shadow-sm hover:shadow-md flex flex-col items-center justify-center group hover:border-blue-200/50 transition-all duration-300 cursor-pointer hover:-translate-y-1 text-center"
                      >
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm group-hover:shadow-md transition-all overflow-hidden border border-gray-100/50 font-bold text-xl mb-3">
                          {client.avatarUrl ? <img src={client.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : client.name.charAt(0).toUpperCase()}
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm w-full truncate">{client.name}</h4>
                        <p className="text-[10px] text-gray-500 mt-1 w-full truncate">{client.advisor || '未分配导师'}</p>
                      </div>
                    );
                  }
                  
                  if (clientViewMode === 'compact') {
                    return (
                      <div 
                        key={client.id} 
                        onClick={() => onSelectClient(client)}
                        className="glass pr-4 pl-2 py-2 rounded-full shadow-sm hover:shadow-md flex items-center group hover:border-blue-200/50 transition-all duration-300 cursor-pointer"
                      >
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm overflow-hidden border border-gray-100/50 font-bold text-xs mr-2 shrink-0">
                          {client.avatarUrl ? <img src={client.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : client.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900 text-xs">{client.name}</span>
                      </div>
                    );
                  }

                  // List View
                  return (
                    <div 
                      key={client.id} 
                      onClick={() => onSelectClient(client)}
                      className="glass p-4 rounded-2xl shadow-sm hover:shadow-md flex items-center justify-between group hover:border-blue-200/50 transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm overflow-hidden border border-gray-100/50 font-bold text-sm shrink-0">
                          {client.avatarUrl ? <img src={client.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-gray-900 text-sm">{client.name}</h4>
                            {client.status === 'archived' && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">已归档</span>}
                          </div>
                          <div className="flex items-center space-x-3 mt-0.5">
                            <p className="text-[10px] text-gray-500">导师: {client.advisor || '未分配'}</p>
                            <p className="text-[10px] text-gray-400">更新于 {client.createdAt}</p>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass rounded-3xl shadow-sm p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-gray-300 mb-4 shadow-sm">
                  <Users size={32} />
                </div>
                <p className="text-gray-400 text-sm mb-6">暂无学生档案</p>
                <button 
                  onClick={() => onTabChange('users')}
                  className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 hover:scale-[1.02]"
                >
                  <Plus size={18} className="mr-2" />
                  创建学生档案
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Day Detail Modal */}
      {isDayDetailModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedDate} 日程</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(selectedDate).getDay()]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openEventModal(selectedDate)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                  title="添加日程"
                >
                  <Plus size={20} />
                </button>
                <button onClick={() => setIsDayDetailModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
              {(() => {
                const dayEvts = allEvents.filter(e => e.date === selectedDate);
                if (dayEvts.length === 0) {
                  return (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <CalendarIcon size={48} className="text-gray-100 mb-4" />
                      <p className="text-gray-500 font-medium">当天暂无日程安排</p>
                    </div>
                  );
                }
                return dayEvts.map(event => (
                  <div 
                    key={event.id}
                    className={`p-4 rounded-2xl border transition-all flex items-start gap-4 group ${getClientColor(event.clientId)} ${getPriorityBorder(event.priority)} ${event.completed ? 'opacity-60 grayscale' : ''}`}
                  >
                    <button 
                      onClick={() => toggleEventCompletion(event)}
                      className={`mt-1 w-6 h-6 rounded border flex items-center justify-center shrink-0 transition-all ${event.completed ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 hover:border-blue-400'}`}
                    >
                      {event.completed && <Check size={16} strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0" onClick={() => { setIsDayDetailModalOpen(false); openEventModal(event.date, event); }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-base font-bold truncate pr-4 ${event.completed ? 'line-through' : ''}`}>{event.title}</span>
                        <span className="text-xs opacity-60 shrink-0 font-medium">{event.time || '全天'}</span>
                      </div>
                      <div className="text-xs font-bold opacity-80 mb-2">学生: {event.clientName}</div>
                      {event.description && (
                        <p className="text-xs opacity-70 bg-white/30 p-3 rounded-xl leading-relaxed">{event.description}</p>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button 
                onClick={() => setIsDayDetailModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">{eventForm.id ? "编辑日程" : "添加日程"}</h3>
              <button onClick={() => setIsEventModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">事件标题 (必填)</label>
                <input 
                  type="text"
                  placeholder="例如: 帝国理工 DDL" 
                  value={eventForm.title}
                  onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">关联学生 (可选)</label>
                <div className="relative">
                  <select 
                    value={eventForm.clientId || 'global'}
                    onChange={e => setEventForm({ ...eventForm, clientId: e.target.value })}
                    className="w-full appearance-none bg-gray-50 border-none rounded-xl px-4 py-3 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    <option value="global">个人日程 (不关联学生)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">日期 (必填)</label>
                  <input 
                    type="date" 
                    value={eventForm.date}
                    onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">时间 (可选)</label>
                  <input 
                    type="time" 
                    value={eventForm.time}
                    onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">事件类型</label>
                <div className="relative">
                  <select 
                    value={eventForm.type}
                    onChange={e => setEventForm({ ...eventForm, type: e.target.value as any })}
                    className="w-full appearance-none bg-gray-50 border-none rounded-xl px-4 py-3 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    <option value="deadline">截止日期 (Deadline)</option>
                    <option value="interview">面试 (Interview)</option>
                    <option value="submission">材料提交 (Submission)</option>
                    <option value="meeting">会议/沟通 (Meeting)</option>
                    <option value="reminder">提醒 (Reminder)</option>
                    <option value="other">其他 (Other)</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">优先级</label>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setEventForm({ ...eventForm, priority: 'high' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${eventForm.priority === 'high' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    高
                  </button>
                  <button 
                    onClick={() => setEventForm({ ...eventForm, priority: 'medium' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${eventForm.priority === 'medium' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    中
                  </button>
                  <button 
                    onClick={() => setEventForm({ ...eventForm, priority: 'low' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${eventForm.priority === 'low' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    低
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">备注 (可选)</label>
                <textarea 
                  placeholder="请输入备注信息" 
                  value={eventForm.description}
                  onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all resize-none h-24"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                {eventForm.id && (
                  <button 
                    onClick={handleDeleteEvent}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    删除
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleSaveEvent}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
                >
                  保存日程
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
