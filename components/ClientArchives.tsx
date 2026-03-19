import React, { useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  CheckSquare,
  ChevronRight,
  Download,
  LayoutGrid,
  LayoutList,
  Plus,
  Search,
  Square,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import CreateClientModal from './CreateClientModal';
import { Client } from '../types';

interface ClientArchivesProps {
  clients: Client[];
  onAddClient: (name: string, parsedData?: Partial<Client>) => void;
  onBatchAddClients?: (clients: Client[]) => void;
  onSelectClient: (client: Client) => void;
  onUpdateClient?: (client: Client) => void;
  onRestoreClient?: (clientId: string) => void;
  onDeleteClient?: (clientId: string) => void;
}

const ClientArchives: React.FC<ClientArchivesProps> = ({
  clients,
  onAddClient,
  onBatchAddClients,
  onSelectClient,
  onUpdateClient,
  onRestoreClient,
  onDeleteClient,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = useMemo(
    () =>
      clients
        .filter((client) => client.status === activeTab)
        .filter((client) => {
          if (!searchQuery.trim()) return true;
          const keyword = searchQuery.trim().toLowerCase();
          return [client.name, client.advisor, client.contact, client.university, client.targetUniversities, client.targetDepartment]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(keyword);
        }),
    [activeTab, clients, searchQuery],
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(filteredClients.map((client) => client.id)));
  };

  const toggleSelect = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.size} 位学生吗？此操作无法撤销。`)) return;

    selectedIds.forEach((id) => onDeleteClient?.(id));
    setSelectedIds(new Set());
  };

  const handleBatchArchive = () => {
    if (selectedIds.size === 0) return;
    const nextStatus = activeTab === 'active' ? 'archived' : 'active';

    clients.forEach((client) => {
      if (selectedIds.has(client.id)) {
        onUpdateClient?.({ ...client, status: nextStatus });
      }
    });

    setSelectedIds(new Set());
  };

  const handleExportJSON = () => {
    const targetClients = selectedIds.size > 0 ? clients.filter((client) => selectedIds.has(client.id)) : filteredClients;
    if (targetClients.length === 0) return;

    const data = JSON.stringify(targetClients, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `留学咩_学生档案_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const result = loadEvent.target?.result as string;
        if (!result) return;
        const parsed = JSON.parse(result);
        const importedClients = Array.isArray(parsed) ? parsed : [parsed];
        if (importedClients.length === 0) {
          window.alert('文件内容为空。');
          return;
        }

        onBatchAddClients?.(importedClients);
        window.alert(`已成功导入 ${importedClients.length} 位学生。`);
      } catch (error) {
        console.error('Import failed', error);
        window.alert('导入失败，文件格式不正确。');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-transparent p-8">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 text-xs font-medium text-slate-400">留学咩 / 学生档案</div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">学生档案</h1>
          <p className="mt-2 text-sm text-slate-500">默认展示全部学生，支持搜索、批量归档和 JSON 导入导出。</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {selectedIds.size > 0 && (
            <div className="flex items-center rounded-2xl border border-white/70 bg-white/75 p-1 shadow-sm">
              <button
                onClick={handleBatchArchive}
                className="flex items-center rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-white"
              >
                {activeTab === 'active' ? <Archive size={14} className="mr-1.5" /> : <ArchiveRestore size={14} className="mr-1.5" />}
                {activeTab === 'active' ? '批量归档' : '批量恢复'}
              </button>
              <button
                onClick={handleBatchDelete}
                className="flex items-center rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
              >
                <Trash2 size={14} className="mr-1.5" />
                批量删除
              </button>
            </div>
          )}

          <label className="flex cursor-pointer items-center rounded-2xl border border-white/70 bg-white/75 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-white">
            <Upload size={16} className="mr-2 text-blue-600" />
            导入 JSON
            <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
          </label>

          <button
            onClick={handleExportJSON}
            className="flex items-center rounded-2xl border border-white/70 bg-white/75 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-white"
          >
            <Download size={16} className="mr-2 text-blue-600" />
            导出 JSON
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus size={16} className="mr-2" />
            新建学生
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-6 border-b border-slate-200/60 pb-3">
          <button
            onClick={toggleSelectAll}
            className="text-slate-400 transition hover:text-blue-600"
            title={selectedIds.size === filteredClients.length ? '取消全选' : '全选当前结果'}
          >
            {selectedIds.size === filteredClients.length && filteredClients.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`relative pb-1 text-sm font-bold ${activeTab === 'active' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            服务中
            <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{clients.filter((client) => client.status === 'active').length}</span>
            {activeTab === 'active' && <span className="absolute inset-x-0 bottom-[-13px] h-0.5 rounded-full bg-blue-600" />}
          </button>

          <button
            onClick={() => setActiveTab('archived')}
            className={`relative pb-1 text-sm font-bold ${activeTab === 'archived' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            已归档
            {activeTab === 'archived' && <span className="absolute inset-x-0 bottom-[-13px] h-0.5 rounded-full bg-blue-600" />}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索学生、顾问、学校或申请方向"
              className="w-full rounded-2xl border border-white/70 bg-white/75 py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-blue-200 focus:bg-white"
            />
          </div>

          <div className="flex rounded-xl border border-white/70 bg-white/75 p-1 shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-lg p-1.5 transition ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {filteredClients.length > 0 ? (
        <div className={viewMode === 'list' ? 'space-y-4' : 'grid grid-cols-1 gap-6 xl:grid-cols-3'}>
          {filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => onSelectClient(client)}
              className={`glass cursor-pointer rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md ${
                viewMode === 'list' ? 'flex items-center justify-between' : 'space-y-4'
              } ${selectedIds.has(client.id) ? 'border-blue-300 bg-blue-50/30' : 'border-white/60'}`}
            >
              <div className={`flex ${viewMode === 'list' ? 'items-center' : 'items-start justify-between'} gap-4`}>
                <div className="flex items-center gap-4">
                  <button
                    onClick={(event) => toggleSelect(event, client.id)}
                    className={`rounded-lg p-1 transition ${selectedIds.has(client.id) ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'}`}
                  >
                    {selectedIds.has(client.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>

                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white shadow-sm">
                    <img
                      src={client.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`}
                      alt={client.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-base font-black text-slate-900">{client.name}</h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          client.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {client.status === 'active' ? '服务中' : '已归档'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      顾问：{client.advisor || '未分配'} · 联系方式：{client.contact || '暂无'}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      目标：{client.targetCountries || '未填写国家'} / {client.targetUniversities || '未填写学校'} / {client.targetDepartment || '未填写方向'}
                    </div>
                  </div>
                </div>

                {viewMode === 'grid' && (
                  <div className="flex items-center gap-2">
                    {activeTab === 'archived' && onRestoreClient && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onRestoreClient(client.id);
                        }}
                        className="rounded-xl p-2 text-blue-600 transition hover:bg-blue-50"
                        title="恢复"
                      >
                        <ArchiveRestore size={15} />
                      </button>
                    )}
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        if (window.confirm('确定要删除这位学生吗？此操作无法撤销。')) {
                          onDeleteClient?.(client.id);
                        }
                      }}
                      className="rounded-xl p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                      title="删除"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              {viewMode === 'list' ? (
                <div className="flex items-center gap-3">
                  {activeTab === 'archived' && onRestoreClient && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onRestoreClient(client.id);
                      }}
                      className="rounded-xl px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50"
                    >
                      恢复
                    </button>
                  )}
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      if (window.confirm('确定要删除这位学生吗？此操作无法撤销。')) {
                        onDeleteClient?.(client.id);
                      }
                    }}
                    className="rounded-xl p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ChevronRight size={18} className="text-slate-300" />
                </div>
              ) : (
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                  <span>创建于 {client.createdAt}</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass flex min-h-[480px] flex-col items-center justify-center rounded-3xl border border-white/60 p-12 text-center shadow-sm">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/70 text-slate-300 shadow-sm">
            <Users size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900">暂无学生档案</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">创建你的第一位学生，或者导入已有 JSON 档案。</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-8 flex items-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus size={18} className="mr-2" />
            创建学生
          </button>
        </div>
      )}

      <CreateClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={onAddClient} />
    </div>
  );
};

export default ClientArchives;
