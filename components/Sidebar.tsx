import React from 'react';
import {
  LayoutDashboard,
  UserSquare,
  FolderOpen,
  Wand2,
  Search,
  FileText,
  BookOpen,
  Mail,
  FileUser,
  Edit3,
  ShieldCheck,
  Settings,
  Share2,
  Triangle,
  PanelLeftClose,
  PanelLeftOpen,
  Database
} from 'lucide-react';

export type TabId = 
  | 'dashboard' 
  | 'users' 
  | 'projects' 
  | 'agent' 
  | 'faculty-matcher' 
  | 'faculty-db'
  | 'ps' 
  | 'essay' 
  | 'lor' 
  | 'cv' 
  | 'freewrite' 
  | 'ai-shield' 
  | 'settings' 
  | 'share';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  isCollapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, isActive, onClick, isCollapsed }) => {
  return (
    <div className="px-3 py-1">
      <div
        onClick={onClick}
        className={`
          relative flex items-center ${isCollapsed ? 'justify-center p-2' : 'px-4 py-2.5'} cursor-pointer transition-all duration-300 ease-out group
          ${isActive ? 'bg-white/60 backdrop-blur-sm shadow-sm rounded-xl text-blue-600 font-semibold' : 'text-gray-600 hover:bg-white/40 hover:text-gray-900 rounded-xl'}
        `}
        title={isCollapsed ? label : ''}
      >
        <Icon size={18} className={`${isCollapsed ? '' : 'mr-3'} transition-transform duration-300 group-hover:scale-110`} strokeWidth={isActive ? 2.5 : 2} />
        {!isCollapsed && <span className="text-sm">{label}</span>}
        
        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900/80 backdrop-blur-md text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
            {label}
          </div>
        )}
      </div>
    </div>
  );
};

interface NavGroupProps {
  title: string;
  children: React.ReactNode;
  isCollapsed?: boolean;
}

const NavGroup: React.FC<NavGroupProps> = ({ title, children, isCollapsed }) => {
  return (
    <div className="mb-2 mt-4">
      {!isCollapsed && (
        <div className="px-6 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em]">
          {title}
        </div>
      )}
      {isCollapsed && (
        <div className="h-px bg-gray-200/50 mx-4 my-3" />
      )}
      <div className={`${isCollapsed ? 'space-y-1' : 'space-y-0.5'}`}>{children}</div>
    </div>
  );
};

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isCollapsed, onToggleCollapse }) => {
  return (
    <div className={`${isCollapsed ? 'w-[80px]' : 'w-[260px]'} h-screen glass border-r border-white/40 flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-out z-50`}>
      {/* Logo Area */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-6 py-6 shrink-0`}>
        {!isCollapsed && (
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mr-3 shadow-md shadow-blue-500/20">
              <Triangle size={16} fill="currentColor" strokeWidth={0} />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">留学咩</span>
          </div>
        )}
        {isCollapsed && (
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Triangle size={16} fill="currentColor" strokeWidth={0} />
          </div>
        )}
        
        <button 
          onClick={onToggleCollapse}
          className={`text-gray-400 hover:text-gray-700 transition-colors p-1.5 hover:bg-white/50 rounded-lg ${isCollapsed ? 'absolute bottom-8 left-1/2 -translate-x-1/2' : ''}`}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        <NavGroup title="通用" isCollapsed={isCollapsed}>
          <NavItem icon={LayoutDashboard} label="总览" isActive={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} isCollapsed={isCollapsed} />
          <NavItem icon={UserSquare} label="客户档案" isActive={activeTab === 'users'} onClick={() => onTabChange('users')} isCollapsed={isCollapsed} />
          <NavItem icon={FolderOpen} label="我的作品" isActive={activeTab === 'projects'} onClick={() => onTabChange('projects')} isCollapsed={isCollapsed} />
        </NavGroup>

        <NavGroup title="核心业务：全流程 Agent" isCollapsed={isCollapsed}>
          <NavItem icon={Wand2} label="文书 Agent" isActive={activeTab === 'agent'} onClick={() => onTabChange('agent')} isCollapsed={isCollapsed} />
          <NavItem icon={Search} label="学术导师智能检索" isActive={activeTab === 'faculty-matcher'} onClick={() => onTabChange('faculty-matcher')} isCollapsed={isCollapsed} />
          <NavItem icon={Database} label="导师库" isActive={activeTab === 'faculty-db'} onClick={() => onTabChange('faculty-db')} isCollapsed={isCollapsed} />
        </NavGroup>

        <NavGroup title="文书专项" isCollapsed={isCollapsed}>
          <NavItem icon={FileText} label="写 PS" isActive={activeTab === 'ps'} onClick={() => onTabChange('ps')} isCollapsed={isCollapsed} />
          <NavItem icon={BookOpen} label="命题文书" isActive={activeTab === 'essay'} onClick={() => onTabChange('essay')} isCollapsed={isCollapsed} />
          <NavItem icon={Mail} label="写推荐信" isActive={activeTab === 'lor'} onClick={() => onTabChange('lor')} isCollapsed={isCollapsed} />
          <NavItem icon={FileUser} label="写 CV" isActive={activeTab === 'cv'} onClick={() => onTabChange('cv')} isCollapsed={isCollapsed} />
          <NavItem icon={Edit3} label="自由创作" isActive={activeTab === 'freewrite'} onClick={() => onTabChange('freewrite')} isCollapsed={isCollapsed} />
        </NavGroup>

        <NavGroup title="工具" isCollapsed={isCollapsed}>
          <NavItem icon={ShieldCheck} label="降 AI 率" isActive={activeTab === 'ai-shield'} onClick={() => onTabChange('ai-shield')} isCollapsed={isCollapsed} />
        </NavGroup>

        <NavGroup title="系统" isCollapsed={isCollapsed}>
          <NavItem icon={Settings} label="账户管理" isActive={activeTab === 'settings'} onClick={() => onTabChange('settings')} isCollapsed={isCollapsed} />
          <NavItem icon={Share2} label="推广合作" isActive={activeTab === 'share'} onClick={() => onTabChange('share')} isCollapsed={isCollapsed} />
        </NavGroup>
      </div>
    </div>
  );
};

export default Sidebar;
