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
  PanelLeftClose
} from 'lucide-react';

export type TabId = 
  | 'dashboard' 
  | 'users' 
  | 'projects' 
  | 'agent' 
  | 'faculty-matcher' 
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
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, isActive, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-center px-6 py-3 cursor-pointer transition-colors duration-200
        ${isActive ? 'bg-[#E6F4FF] text-[#0070FF]' : 'text-gray-600 hover:bg-[#FAFAFA] hover:text-gray-900'}
      `}
    >
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0070FF]" />
      )}
      <Icon size={18} className="mr-3" strokeWidth={2} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
};

interface NavGroupProps {
  title: string;
  children: React.ReactNode;
}

const NavGroup: React.FC<NavGroupProps> = ({ title, children }) => {
  return (
    <div className="mb-2 mt-4">
      <div className="px-6 py-2 text-xs font-semibold text-gray-400 tracking-wider">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
};

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="w-[260px] h-screen bg-[#FFFFFF] border-r border-[#F0F0F0] flex flex-col shrink-0 overflow-hidden">
      {/* Logo Area */}
      <div className="flex items-center justify-between px-6 py-6 shrink-0">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#E6F4FF] text-[#0070FF] mr-3">
            <Triangle size={18} fill="currentColor" strokeWidth={0} />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">留学咩</span>
        </div>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        <NavGroup title="通用">
          <NavItem icon={LayoutDashboard} label="总览" isActive={activeTab === 'dashboard'} onClick={() => onTabChange('dashboard')} />
          <NavItem icon={UserSquare} label="客户档案" isActive={activeTab === 'users'} onClick={() => onTabChange('users')} />
          <NavItem icon={FolderOpen} label="我的作品" isActive={activeTab === 'projects'} onClick={() => onTabChange('projects')} />
        </NavGroup>

        <NavGroup title="核心业务：全流程 Agent">
          {/* 文书 Agent 是一个聚合功能，点击后右侧主视图应引导用户进入“导师选择 -> 简历生成 -> 文书创作”的线性流程。 */}
          <NavItem icon={Wand2} label="文书 Agent" isActive={activeTab === 'agent'} onClick={() => onTabChange('agent')} />
          <NavItem icon={Search} label="学术导师智能检索" isActive={activeTab === 'faculty-matcher'} onClick={() => onTabChange('faculty-matcher')} />
        </NavGroup>

        <NavGroup title="文书专项">
          <NavItem icon={FileText} label="写 PS" isActive={activeTab === 'ps'} onClick={() => onTabChange('ps')} />
          <NavItem icon={BookOpen} label="命题文书" isActive={activeTab === 'essay'} onClick={() => onTabChange('essay')} />
          <NavItem icon={Mail} label="写推荐信" isActive={activeTab === 'lor'} onClick={() => onTabChange('lor')} />
          <NavItem icon={FileUser} label="写 CV" isActive={activeTab === 'cv'} onClick={() => onTabChange('cv')} />
          <NavItem icon={Edit3} label="自由创作" isActive={activeTab === 'freewrite'} onClick={() => onTabChange('freewrite')} />
        </NavGroup>

        <NavGroup title="工具">
          <NavItem icon={ShieldCheck} label="降 AI 率" isActive={activeTab === 'ai-shield'} onClick={() => onTabChange('ai-shield')} />
        </NavGroup>

        <NavGroup title="系统">
          <NavItem icon={Settings} label="账户管理" isActive={activeTab === 'settings'} onClick={() => onTabChange('settings')} />
          <NavItem icon={Share2} label="推广合作" isActive={activeTab === 'share'} onClick={() => onTabChange('share')} />
        </NavGroup>
      </div>
    </div>
  );
};

export default Sidebar;
