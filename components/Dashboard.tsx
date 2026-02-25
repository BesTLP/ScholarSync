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
  Wand2,
  Search as SearchIcon,
  UserPlus,
  BookOpen,
  Mail,
  FileUser,
  ShieldCheck,
  Edit3,
  CheckCircle2,
  MessageCircle,
  Plus,
  X,
  Minimize2,
  Maximize2,
  GripHorizontal
} from 'lucide-react';
import { TabId } from './Sidebar';
import { Client } from '../types';
import ChatBot from './ChatBot';

// --- Sub-components ---

const StatCard: React.FC<{ title: string, value: string, icon: React.ElementType, color: string, growth?: string }> = ({ title, value, icon: Icon, color, growth }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
    <div className="flex justify-between items-start mb-4">
      <span className="text-gray-500 text-sm font-medium">{title}</span>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={20} className="text-current" />
      </div>
    </div>
    <div>
      <div className="text-3xl font-bold text-gray-900 mb-2">{value}</div>
      {growth && (
        <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-600">
          {growth}
        </div>
      )}
    </div>
  </div>
);

const ActionCard: React.FC<{ icon: React.ElementType, title: string, subtitle: string, iconBg: string, iconColor: string, onClick?: () => void }> = ({ icon: Icon, title, subtitle, iconBg, iconColor, onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-all group text-left w-full"
  >
    <div className={`p-3 rounded-xl ${iconBg} ${iconColor} mr-4 shrink-0`}>
      <Icon size={24} />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-semibold text-gray-900 truncate">{title}</h4>
      <p className="text-xs text-gray-400 truncate">{subtitle}</p>
    </div>
    <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-400 transition-colors ml-2" />
  </button>
);

// --- Main Dashboard Component ---

interface DashboardProps {
  onTabChange: (tab: TabId) => void;
  clients: Client[];
  onSelectClient: (client: Client) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onTabChange, clients, onSelectClient }) => {
  const totalDocuments = clients.reduce((acc, client) => acc + (client.documents?.length || 0), 0);
  const recentClients = [...clients].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);

  // ChatBot State
  const [showChatBot, setShowChatBot] = useState(false);
  const [isChatBotMinimized, setIsChatBotMinimized] = useState(false);
  const [chatBotPosition, setChatBotPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 650 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const chatBotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = clients.filter(client => 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.advisor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.university?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, clients]);

  // Drag Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - chatBotPosition.x,
      y: e.clientY - chatBotPosition.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setChatBotPosition({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

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

  const changelog = [
    { date: '2024-03-20', title: '学术导师智能检索上线', isNew: true, items: ['支持全球 500+ 名校导师检索', 'AI 自动分析匹配度'] },
    { date: '2024-03-15', title: '文书 Agent 算法升级', isNew: false, items: ['提升 PS 生成的逻辑严密性', '新增 10+ 种文书风格选择'] },
    { date: '2024-03-10', title: '系统性能优化', isNew: false, items: ['编辑器响应速度提升 40%', '修复了已知的一些 UI 细节问题'] },
    { date: '2024-03-05', title: '降 AI 率功能增强', isNew: false, items: ['支持更深层次的语言重构', '新增多语言检测支持'] },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20 relative">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center">
          <span className="text-xl font-bold text-gray-900">留学咩</span>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
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
              className="bg-gray-100 border-none rounded-lg py-2 pl-10 pr-12 text-sm focus:ring-2 focus:ring-blue-500 w-64 transition-all"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-[10px] font-medium text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200">⌘K</span>
            </div>
            
            {/* Search Results Dropdown */}
            {searchQuery && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 max-h-64 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map(client => (
                    <button 
                      key={client.id}
                      onClick={() => onSelectClient(client)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center border-b border-gray-50 last:border-0"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full mr-3 overflow-hidden shrink-0">
                         <img src={client.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`} className="w-full h-full object-cover" alt={client.name} />
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
          <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 overflow-hidden">
            <img src="https://picsum.photos/seed/user/100/100" alt="Avatar" referrerPolicy="no-referrer" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 pt-8">
        {/* Block A: Welcome */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">👋 嗨 For River，下午好</h1>
            <p className="text-gray-500 text-sm mb-4">今天也要为学生们创造更出色的文书哦！</p>
            <div className="flex space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                专业版许可证
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                在线服务正常
              </span>
            </div>
          </div>
          <div className="flex space-x-3">
            <button className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <Play size={16} className="mr-2 text-blue-500 fill-blue-500" />
              视频演示
            </button>
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-md shadow-blue-200">
              <Rocket size={16} className="mr-2" />
              快速开始
            </button>
          </div>
        </div>

        {/* Block B: Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatCard title="活跃客户" value={clients.length.toString()} icon={Users} color="bg-blue-50 text-blue-600" growth="+0% 较上周" />
          <StatCard title="创作文稿" value={totalDocuments.toString()} icon={FileText} color="bg-purple-50 text-purple-600" growth="+0% 较上周" />
          <StatCard title="已为你节省时间" value={`${totalDocuments * 2}h`} icon={Clock} color="bg-orange-50 text-orange-600" growth="+0% 较上周" />
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-500 text-sm font-medium">剩余额度</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Zap size={20} />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-4">1,000 句</div>
              <div className="flex space-x-2">
                <button className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">充值</button>
                <button className="flex-1 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors">使用记录</button>
              </div>
            </div>
          </div>
        </div>

        {/* Block C: Quick Ops & Changelog */}
        <div className="grid grid-cols-3 gap-8 mb-8">
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">快速操作</h3>
              <button className="text-blue-600 text-sm font-medium hover:underline">管理功能</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">更新日志</h3>
              <span className="text-xs text-gray-400">实时同步</span>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-[480px] overflow-y-auto p-6 custom-scrollbar">
              <div className="space-y-8 relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-100"></div>
                {changelog.map((entry, idx) => (
                  <div key={idx} className="relative pl-8">
                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center z-10">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    </div>
                    <div className="mb-2 flex items-center">
                      <span className="text-xs font-bold text-gray-400 mr-3">{entry.date}</span>
                      {entry.isNew && (
                        <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded">NEW</span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3">{entry.title}</h4>
                    <ul className="space-y-2">
                      {entry.items.map((item, i) => (
                        <li key={i} className="flex items-start text-xs text-gray-500">
                          <CheckCircle2 size={14} className="text-green-500 mr-2 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Block D: Business Lists */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">近期客户</h3>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">{clients.length} 位客户</span>
            </div>
            {recentClients.length > 0 ? (
              <div className="grid grid-cols-3 gap-6">
                {recentClients.map(client => (
                  <div 
                    key={client.id} 
                    onClick={() => onSelectClient(client)}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-cyan-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-cyan-50 group-hover:text-cyan-500 transition-colors overflow-hidden">
                        <img 
                          src={client.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`} 
                          alt="avatar" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{client.name}</h4>
                        <p className="text-[10px] text-gray-400 mt-1">{client.createdAt}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                  <Users size={32} />
                </div>
                <p className="text-gray-400 text-sm mb-6">暂无学生档案</p>
                <button 
                  onClick={() => onTabChange('users')}
                  className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                >
                  <Plus size={18} className="mr-2" />
                  创建学生档案
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">最近动态</h3>
              <span className="text-xs text-gray-400">实时更新</span>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                <Zap size={32} />
              </div>
              <p className="text-gray-400 text-sm">暂无最近动态</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI Assistant */}
      {!showChatBot && (
        <button 
          onClick={() => setShowChatBot(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-green-500 text-white rounded-full shadow-2xl shadow-green-200 flex items-center justify-center hover:scale-110 transition-transform z-50"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Draggable ChatBot Window */}
      {showChatBot && (
        <div 
          ref={chatBotRef}
          style={{ 
            position: 'fixed', 
            left: chatBotPosition.x, 
            top: chatBotPosition.y,
            width: isChatBotMinimized ? '300px' : '400px',
            height: isChatBotMinimized ? 'auto' : '600px',
            zIndex: 100
          }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-200"
        >
          {/* Draggable Header */}
          <div 
            onMouseDown={handleMouseDown}
            className="h-10 bg-gray-50 border-b border-gray-100 flex items-center justify-between px-4 cursor-move select-none"
          >
            <div className="flex items-center space-x-2 text-gray-500">
              <GripHorizontal size={16} />
              <span className="text-xs font-bold">学术助手</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsChatBotMinimized(!isChatBotMinimized)}
                className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
              >
                {isChatBotMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button 
                onClick={() => setShowChatBot(false)}
                className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* ChatBot Content */}
          {!isChatBotMinimized && (
            <div className="flex-1 overflow-hidden">
              <ChatBot />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
