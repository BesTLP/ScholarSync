import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  FileText,
  FileUser,
  Mail,
  Moon,
  Plus,
  Rocket,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  Wand2,
} from 'lucide-react';
import { TabId } from './Sidebar';
import { Client, ClientEvent } from '../types';

interface DashboardProps {
  onTabChange: (tab: TabId) => void;
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onUpdateClient?: (client: Client) => void;
}

const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const quickActions = [
  { id: 'agent' as TabId, title: '文书 Agent', subtitle: '从需求到成稿', icon: Wand2, color: 'bg-violet-50 text-violet-600' },
  { id: 'faculty-matcher' as TabId, title: '导师匹配', subtitle: '结构化搜导师', icon: Search, color: 'bg-blue-50 text-blue-600' },
  { id: 'users' as TabId, title: '学生档案', subtitle: '查看客户与进度', icon: UserPlus, color: 'bg-emerald-50 text-emerald-600' },
  { id: 'ps' as TabId, title: 'PS 工作台', subtitle: '个人陈述写作', icon: FileText, color: 'bg-orange-50 text-orange-600' },
  { id: 'essay' as TabId, title: '命题作文', subtitle: '学校题目拆解', icon: BookOpen, color: 'bg-indigo-50 text-indigo-600' },
  { id: 'lor' as TabId, title: '推荐信', subtitle: '推荐信生成', icon: Mail, color: 'bg-rose-50 text-rose-600' },
  { id: 'cv' as TabId, title: 'CV', subtitle: '简历整理', icon: FileUser, color: 'bg-cyan-50 text-cyan-600' },
  { id: 'freewrite' as TabId, title: '自由写作', subtitle: '沉浸式协作', icon: Edit3, color: 'bg-amber-50 text-amber-600' },
  { id: 'ai-shield' as TabId, title: 'AI Shield', subtitle: '检测与优化', icon: ShieldCheck, color: 'bg-slate-100 text-slate-600' },
];

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildCalendarDays(currentDate: Date): Date[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  for (let index = firstDay.getDay(); index > 0; index -= 1) {
    days.push(new Date(year, month, 1 - index));
  }
  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }
  for (let index = lastDay.getDay() + 1; index <= 6; index += 1) {
    days.push(new Date(year, month + 1, index - lastDay.getDay()));
  }

  return days;
}

const Dashboard: React.FC<DashboardProps> = ({ onTabChange, clients, onSelectClient, onUpdateClient }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isScheduleCollapsed, setIsScheduleCollapsed] = useState(false);
  const [globalEvents, setGlobalEvents] = useState<ClientEvent[]>(() => {
    try {
      const saved = localStorage.getItem('scholarsync_global_events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [eventForm, setEventForm] = useState<Partial<ClientEvent>>({
    title: '',
    date: formatDate(new Date()),
    time: '',
    type: 'other',
    description: '',
    priority: 'medium',
    completed: false,
    clientId: 'global',
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('scholarsync_global_events', JSON.stringify(globalEvents));
    } catch (error) {
      console.error('Failed to save global events', error);
    }
  }, [globalEvents]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const keyword = searchQuery.trim().toLowerCase();
    return clients.filter((client) =>
      [client.name, client.advisor, client.university, client.targetUniversities, client.targetDepartment]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [clients, searchQuery]);

  const allEvents = useMemo(
    () =>
      [
        ...globalEvents.map((event) => ({ ...event, clientName: '个人日程' })),
        ...clients.flatMap((client) =>
          (client.events || []).map((event) => ({
            ...event,
            clientName: client.name,
          })),
        ),
      ].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()),
    [clients, globalEvents],
  );

  const calendarDays = useMemo(() => buildCalendarDays(currentDate), [currentDate]);
  const selectedDayEvents = selectedDate ? allEvents.filter((event) => event.date === selectedDate) : [];
  const upcomingEvents = allEvents.filter((event) => new Date(event.date).getTime() >= new Date().setHours(0, 0, 0, 0)).slice(0, 6);
  const sortedClients = [...clients].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const toggleEventComplete = (event: ClientEvent) => {
    const updated = { ...event, completed: !event.completed };
    if (event.clientId === 'global') {
      setGlobalEvents((prev) => prev.map((item) => (item.id === event.id ? updated : item)));
      return;
    }

    const client = clients.find((item) => item.id === event.clientId);
    if (client && onUpdateClient) {
      onUpdateClient({
        ...client,
        events: (client.events || []).map((item) => (item.id === event.id ? updated : item)),
      });
    }
  };

  const openEventModal = (date?: string, event?: ClientEvent) => {
    setEventForm(
      event || {
        title: '',
        date: date || formatDate(new Date()),
        time: '',
        type: 'other',
        description: '',
        priority: 'medium',
        completed: false,
        clientId: 'global',
      },
    );
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = () => {
    if (!eventForm.title || !eventForm.date) {
      window.alert('请填写标题和日期。');
      return;
    }

    const nextEvent: ClientEvent = {
      id: eventForm.id || crypto.randomUUID(),
      clientId: eventForm.clientId || 'global',
      title: eventForm.title,
      date: eventForm.date,
      time: eventForm.time,
      type: (eventForm.type || 'other') as ClientEvent['type'],
      description: eventForm.description,
      priority: (eventForm.priority || 'medium') as ClientEvent['priority'],
      completed: eventForm.completed || false,
    };

    if (nextEvent.clientId === 'global') {
      setGlobalEvents((prev) => [...prev.filter((item) => item.id !== nextEvent.id), nextEvent]);
    } else {
      const client = clients.find((item) => item.id === nextEvent.clientId);
      if (client && onUpdateClient) {
        onUpdateClient({
          ...client,
          events: [...(client.events || []).filter((item) => item.id !== nextEvent.id), nextEvent],
        });
      }
    }

    setIsEventModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-transparent px-8 pb-20 pt-6">
      <header className="sticky top-0 z-20 mb-8 rounded-[28px] border border-white/70 bg-white/85 px-6 py-4 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xl font-black tracking-tight text-slate-900">留学咩</div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">顾问工作台</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
              <Moon size={18} />
            </button>

            <div className="relative min-w-[260px]">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索客户..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-blue-200"
              />
              {searchQuery && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/80 bg-white/95 py-2 shadow-xl">
                  {searchResults.length > 0 ? (
                    searchResults.map((client) => (
                      <button key={client.id} onClick={() => onSelectClient(client)} className="flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-slate-50">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                          {client.avatarUrl ? <img src={client.avatarUrl} alt={client.name} className="h-full w-full object-cover" /> : <span className="text-sm font-bold text-slate-500">{client.name.slice(0, 1)}</span>}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900">{client.name}</div>
                          <div className="truncate text-xs text-slate-500">{client.advisor || '未分配顾问'}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500">未找到相关学生</div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">留学咩 用户</div>
          </div>
        </div>
      </header>

      <div className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">欢迎回来</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">今天继续把学生、导师和文书工作收拢到一个更顺手的桌面工作台里。</p>
        </div>

        <button onClick={() => onTabChange('agent')} className="inline-flex items-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700">
          <Rocket size={16} className="mr-2" />
          快速开始
        </button>
      </div>

      <section className="mb-10 rounded-[32px] border border-white/70 bg-white/78 p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-lg font-black text-slate-900">日程中心</div>
            <div className="mt-1 text-xs text-slate-500">星期标题已修正，日历层级和收起逻辑统一在这里。</div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
              {currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月
            </div>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-800">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-800">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setIsScheduleCollapsed((prev) => !prev)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
              {isScheduleCollapsed ? '展开日程中心' : '收起日程中心'}
            </button>
            <button onClick={() => openEventModal()} className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700">
              <Plus size={14} className="mr-2" />
              新建日程
            </button>
          </div>
        </div>

        {isScheduleCollapsed ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">本月日程</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{allEvents.filter((event) => event.date.startsWith(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`)).length}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">待处理</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{upcomingEvents.filter((event) => !event.completed).length}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">学生总数</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{clients.length}</div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.45fr,0.95fr]">
            <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5">
              <div className="mb-4 grid grid-cols-7 gap-3 text-center text-xs font-bold text-slate-400">
                {weekdays.map((weekday) => (
                  <div key={weekday} className="py-2">
                    {weekday}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-3">
                {calendarDays.map((date) => {
                  const dateKey = formatDate(date);
                  const events = allEvents.filter((event) => event.date === dateKey);
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                  const isToday = dateKey === formatDate(new Date());
                  return (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDate(dateKey)}
                      className={`min-h-[104px] rounded-2xl border p-3 text-left transition ${
                        isCurrentMonth ? 'border-slate-100 bg-white hover:border-blue-200' : 'border-transparent bg-slate-100/60 text-slate-300'
                      } ${isToday ? 'ring-2 ring-blue-500/20' : ''}`}
                    >
                      <div className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>{date.getDate()}</div>
                      <div className="mt-3 space-y-1">
                        {events.slice(0, 2).map((event) => (
                          <div key={event.id} className="truncate rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                            {event.title}
                          </div>
                        ))}
                        {events.length > 2 && <div className="text-[11px] font-bold text-slate-400">+{events.length - 2} 条更多</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">近期日程</div>
                  <div className="text-xs text-slate-500">未来 6 条待办</div>
                </div>
                <Clock3 size={16} className="text-slate-300" />
              </div>
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <button key={event.id} onClick={() => setSelectedDate(event.date)} className="flex w-full items-start justify-between rounded-2xl border border-white bg-white p-4 text-left shadow-sm transition hover:border-blue-100">
                      <div className="pr-3">
                        <div className="text-sm font-bold text-slate-900">{event.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{event.date}{event.time ? ` · ${event.time}` : ' · 全天'} · {event.clientName}</div>
                      </div>
                      <button
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          toggleEventComplete(event);
                        }}
                        className={`rounded-full px-3 py-1 text-[10px] font-bold ${event.completed ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {event.completed ? '已完成' : '待处理'}
                      </button>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-8 text-center text-sm text-slate-500">当前没有待处理日程。</div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-4 text-lg font-black text-slate-900">快捷操作</div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => (
            <button key={action.id} onClick={() => onTabChange(action.id)} className="mac-panel flex items-center rounded-[24px] p-4 text-left transition hover:-translate-y-0.5">
              <div className={`mr-4 rounded-2xl p-3 ${action.color}`}>
                <action.icon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-900">{action.title}</div>
                <div className="truncate text-xs text-slate-500">{action.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-black text-slate-900">最近学生</div>
            <div className="text-xs text-slate-500">按创建时间倒序</div>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">{clients.length} 位学生</span>
        </div>

        {sortedClients.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {sortedClients.map((client) => (
              <button key={client.id} onClick={() => onSelectClient(client)} className="glass rounded-[28px] border border-white/60 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
                    {client.avatarUrl ? <img src={client.avatarUrl} alt={client.name} className="h-full w-full object-cover" /> : <span className="text-lg font-bold text-slate-500">{client.name.slice(0, 1)}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-black text-slate-900">{client.name}</div>
                    <div className="truncate text-xs text-slate-500">{client.advisor || '未分配顾问'}</div>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-slate-500">
                  <div>创建时间：{client.createdAt}</div>
                  <div>目标国家：{client.targetCountries || '未填写'}</div>
                  <div>目标学校：{client.targetUniversities || '未填写'}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="glass flex min-h-[260px] flex-col items-center justify-center rounded-[28px] border border-white/60 p-12 text-center shadow-sm">
            <Users size={36} className="mb-4 text-slate-300" />
            <div className="text-lg font-black text-slate-900">暂无学生档案</div>
            <div className="mt-2 text-sm text-slate-500">从学生档案页创建第一位学生。</div>
            <button onClick={() => onTabChange('users')} className="mt-6 inline-flex items-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700">
              <Plus size={16} className="mr-2" />
              去创建学生
            </button>
          </div>
        )}
      </section>

      {selectedDate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <div className="text-lg font-black text-slate-900">{selectedDate} 日程</div>
                <div className="mt-1 text-xs text-slate-500">{weekdays[new Date(selectedDate).getDay()]}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEventModal(selectedDate)} className="rounded-xl bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100">
                  <Plus size={16} />
                </button>
                <button onClick={() => setSelectedDate(null)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200">
                  关闭
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto p-6">
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((event) => (
                  <button key={event.id} onClick={() => openEventModal(event.date, event)} className="flex w-full items-start justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-blue-100">
                    <div className="pr-3">
                      <div className="text-sm font-bold text-slate-900">{event.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{event.time || '全天'} · {event.clientName}</div>
                      {event.description && <div className="mt-2 text-xs leading-5 text-slate-500">{event.description}</div>}
                    </div>
                    <button
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        toggleEventComplete(event);
                      }}
                      className={`rounded-full px-3 py-1 text-[10px] font-bold ${event.completed ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {event.completed ? '已完成' : '待处理'}
                    </button>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">这一天暂时没有日程安排。</div>
              )}
            </div>
          </div>
        </div>
      )}

      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="text-lg font-black text-slate-900">{eventForm.id ? '编辑日程' : '新增日程'}</div>
              <div className="mt-1 text-xs text-slate-500">可挂到具体学生，也可保存为个人日程。</div>
            </div>
            <div className="grid gap-4 p-6">
              <input value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-200" placeholder="事件标题" />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={eventForm.date} onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-200" />
                <input type="time" value={eventForm.time} onChange={(event) => setEventForm({ ...eventForm, time: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-200" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select value={eventForm.clientId || 'global'} onChange={(event) => setEventForm({ ...eventForm, clientId: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-200">
                  <option value="global">个人日程</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <select value={eventForm.type || 'other'} onChange={(event) => setEventForm({ ...eventForm, type: event.target.value as ClientEvent['type'] })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-200">
                  <option value="deadline">截止日期</option>
                  <option value="interview">面试</option>
                  <option value="submission">材料提交</option>
                  <option value="meeting">会议/沟通</option>
                  <option value="reminder">提醒</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <textarea value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-200" placeholder="备注" />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setIsEventModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100">取消</button>
              <button onClick={handleSaveEvent} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">保存日程</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
