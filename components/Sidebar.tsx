import React from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Database,
  Edit3,
  FileText,
  FileUser,
  FolderOpen,
  LayoutDashboard,
  Mail,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Triangle,
  UserSquare,
  Wand2,
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

interface NavGroupProps {
  title: string;
  children: React.ReactNode;
  isCollapsed?: boolean;
}

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const navGroups: Array<{
  title: string;
  items: Array<{ id: TabId; icon: React.ElementType; label: string }>;
}> = [
  {
    title: '工作台',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: '总览' },
      { id: 'users', icon: UserSquare, label: '学生档案' },
      { id: 'projects', icon: FolderOpen, label: '我的作品' },
    ],
  },
  {
    title: '核心流程',
    items: [
      { id: 'agent', icon: Wand2, label: '文书 Agent' },
      { id: 'faculty-matcher', icon: Search, label: '导师匹配' },
      { id: 'faculty-db', icon: Database, label: '导师库' },
    ],
  },
  {
    title: '写作工具',
    items: [
      { id: 'ps', icon: FileText, label: 'PS' },
      { id: 'essay', icon: BookOpen, label: '命题作文' },
      { id: 'lor', icon: Mail, label: '推荐信' },
      { id: 'cv', icon: FileUser, label: 'CV' },
      { id: 'freewrite', icon: Edit3, label: '自由写作' },
    ],
  },
  {
    title: '辅助能力',
    items: [{ id: 'ai-shield', icon: ShieldCheck, label: 'AI Shield' }],
  },
  {
    title: '系统',
    items: [
      { id: 'settings', icon: Settings, label: '设置' },
      { id: 'share', icon: Share2, label: '合作与分享' },
    ],
  },
];

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, isActive, onClick, isCollapsed }) => (
  <div className="px-2">
    <button
      type="button"
      onClick={onClick}
      className={`group mac-source-list-item relative flex w-full items-center rounded-2xl transition-all duration-200 ${
        isCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3 text-left'
      } ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : ''}`}
      title={isCollapsed ? label : ''}
    >
      <Icon size={18} strokeWidth={isActive ? 2.35 : 2} className={isActive ? 'text-blue-600' : ''} />
      {!isCollapsed && <span className="truncate text-sm font-semibold">{label}</span>}
      {isCollapsed && (
        <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
          {label}
        </div>
      )}
    </button>
  </div>
);

const NavGroup: React.FC<NavGroupProps> = ({ title, children, isCollapsed }) => (
  <section className="mt-5 first:mt-0">
    {!isCollapsed && <div className="mac-section-title px-5 pb-2">{title}</div>}
    {isCollapsed && <div className="soft-divider mx-3 my-3" />}
    <div className="space-y-1">{children}</div>
  </section>
);

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isCollapsed, onToggleCollapse }) => {
  return (
    <aside
      className={`mac-panel relative flex h-[calc(100vh-2rem)] shrink-0 flex-col overflow-visible rounded-[30px] transition-all duration-300 ${
        isCollapsed ? 'w-[88px]' : 'w-[272px]'
      }`}
    >
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} px-5 pt-5`}>
        {!isCollapsed ? (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
              <Triangle size={16} fill="currentColor" strokeWidth={0} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-black tracking-tight text-slate-900">留学咩</div>
              <div className="truncate text-xs font-medium text-slate-500">留学顾问工作台</div>
            </div>
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
            <Triangle size={16} fill="currentColor" strokeWidth={0} />
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="mx-5 mt-4 rounded-2xl border border-white/70 bg-white/68 px-4 py-3 text-sm shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">顾问、文书、择导一体化</div>
            </div>
            <span className="mac-pill !px-3 !py-1.5 !text-[10px]">Desktop</span>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className={`px-3 ${isCollapsed ? 'py-4' : 'py-5'}`}>
          <button
            type="button"
            onClick={() => onTabChange('faculty-matcher')}
            className={`group mac-source-list-item relative flex w-full items-center rounded-[24px] border border-white/75 bg-white/82 shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md ${
              isCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3.5 text-left'
            }`}
            title={isCollapsed ? '快速搜索导师' : ''}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Search size={18} strokeWidth={2.3} />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Search</div>
                <div className="truncate text-sm font-semibold text-slate-800">快速搜索导师</div>
              </div>
            )}
            {!isCollapsed && (
              <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                常用入口
              </div>
            )}
            {isCollapsed && (
              <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                快速搜索导师
              </div>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-1 pb-5">
          {navGroups.map((group) => (
            <NavGroup key={group.title} title={group.title} isCollapsed={isCollapsed}>
              {group.items.map((item) => (
                <NavItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  isActive={activeTab === item.id}
                  onClick={() => onTabChange(item.id)}
                  isCollapsed={isCollapsed}
                />
              ))}
            </NavGroup>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="pointer-events-auto mr-[-18px] flex h-16 w-9 items-center justify-center rounded-r-2xl rounded-l-xl border border-white/85 bg-white text-slate-500 shadow-lg transition-all duration-200 hover:mr-[-20px] hover:text-slate-800"
          title={isCollapsed ? '展开导航' : '收起导航'}
        >
          {isCollapsed ? <ChevronRight size={18} strokeWidth={2.8} /> : <ChevronLeft size={18} strokeWidth={2.8} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
