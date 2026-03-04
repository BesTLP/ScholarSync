import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  LayoutList, 
  LayoutGrid, 
  ChevronRight,
  Search,
  Phone,
  Archive,
  ArchiveRestore,
  Download,
  Upload,
  CheckSquare,
  Square,
  Trash2
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
  onDeleteClient
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredClients = clients.filter(c => c.status === activeTab);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map(c => c.id)));
    }
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`确定要删除选中的 ${selectedIds.size} 位客户吗？此操作无法撤销。`)) {
      selectedIds.forEach(id => {
        console.log('Deleting client:', id);
        onDeleteClient?.(id);
      });
      setSelectedIds(new Set());
    }
  };

  const handleBatchArchive = () => {
    if (selectedIds.size === 0) return;
    const newStatus = activeTab === 'active' ? 'archived' : 'active';
    clients.forEach(c => {
      if (selectedIds.has(c.id)) {
        onUpdateClient?.({ ...c, status: newStatus });
      }
    });
    setSelectedIds(new Set());
  };

  const handleExportJSON = () => {
    window.alert('正在导出客户信息...');
    const targetClients = selectedIds.size > 0 
      ? clients.filter(c => selectedIds.has(c.id))
      : filteredClients;

    if (targetClients.length === 0) return;

    const data = JSON.stringify(targetClients, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ScholarSync_Clients_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        if (!result) throw new Error('Empty file content');
        
        console.log('Importing JSON data length:', result.length);
        const data = JSON.parse(result);
        const importedClients = Array.isArray(data) ? data : [data];
        
        if (importedClients.length === 0) {
          window.alert('文件内容为空');
          return;
        }

        if (onBatchAddClients) {
          onBatchAddClients(importedClients);
          window.alert(`成功导入 ${importedClients.length} 位客户`);
        } else {
          console.error('onBatchAddClients callback is missing');
        }
      } catch (err) {
        console.error('Import failed:', err);
        window.alert('导入失败：文件格式不正确或内容损坏');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-transparent p-8">
      {/* Breadcrumbs & Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <nav className="flex items-center space-x-2 text-xs font-medium mb-3">
            <span className="text-gray-500">留学咩</span>
            <ChevronRight size={12} className="text-gray-400" />
            <button className="text-blue-600 hover:text-blue-700 transition-colors font-bold">客户</button>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">学生档案</h1>
          <p className="text-sm text-gray-500 font-medium">管理您的所有客户信息</p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedIds.size > 0 && (
            <div className="flex items-center bg-white/60 backdrop-blur-sm border border-white/50 rounded-2xl p-1 shadow-sm mr-2">
              <button 
                onClick={handleBatchArchive}
                className="flex items-center px-3 py-1.5 text-gray-600 hover:text-blue-600 hover:bg-white rounded-xl text-xs font-bold transition-all"
              >
                {activeTab === 'active' ? <Archive size={14} className="mr-1.5" /> : <ArchiveRestore size={14} className="mr-1.5" />}
                {activeTab === 'active' ? '归档' : '恢复'}
              </button>
              <button 
                onClick={handleBatchDelete}
                className="flex items-center px-3 py-1.5 text-gray-600 hover:text-red-600 hover:bg-white rounded-xl text-xs font-bold transition-all"
              >
                <Trash2 size={14} className="mr-1.5" />
                删除
              </button>
            </div>
          )}
          <label className="flex items-center px-4 py-2.5 bg-white/60 backdrop-blur-sm border border-white/50 text-gray-700 rounded-2xl text-sm font-bold hover:bg-white/80 transition-all shadow-sm cursor-pointer active:scale-95">
            <Upload size={18} className="mr-2 text-blue-600" />
            导入 JSON
            <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
          </label>
          <button 
            onClick={handleExportJSON}
            className="flex items-center px-4 py-2.5 bg-white/60 backdrop-blur-sm border border-white/50 text-gray-700 rounded-2xl text-sm font-bold hover:bg-white/80 transition-all shadow-sm active:scale-95"
          >
            <Download size={18} className="mr-2 text-blue-600" />
            导出 JSON {selectedIds.size > 0 && `(${selectedIds.size})`}
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
          >
            <Plus size={18} className="mr-2" />
            创建客户
          </button>
        </div>
      </div>

      {/* Filter & View Switch Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-8 border-b border-gray-200/50 flex-1">
          <button 
            onClick={toggleSelectAll}
            className="pb-3 text-gray-400 hover:text-blue-600 transition-colors"
            title={selectedIds.size === filteredClients.length ? "取消全选" : "全选"}
          >
            {selectedIds.size === filteredClients.length && filteredClients.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>
          <button 
            onClick={() => setActiveTab('active')}
            className={`pb-3 text-sm font-bold transition-all relative ${
              activeTab === 'active' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            服务中 <span className="ml-1 text-[10px] bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-gray-600 shadow-sm">{clients.filter(c => c.status === 'active').length}</span>
            {activeTab === 'active' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('archived')}
            className={`pb-3 text-sm font-bold transition-all relative ${
              activeTab === 'archived' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            已归档
            {activeTab === 'archived' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>
        
        <div className="flex items-center ml-8 space-x-2">
          <div className="flex glass p-1 rounded-xl shadow-sm">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/80 text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutList size={18} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/80 text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {filteredClients.length > 0 ? (
        <div className={viewMode === 'list' ? 'space-y-4' : 'grid grid-cols-3 gap-6'}>
          {filteredClients.map(client => (
            <div 
              key={client.id} 
              onClick={() => onSelectClient(client)}
              className={`glass p-6 rounded-3xl shadow-sm flex ${viewMode === 'list' ? 'items-center justify-between' : 'flex-col items-start space-y-4'} group hover:border-blue-200 hover:shadow-md transition-all duration-300 cursor-pointer hover:scale-[1.01] ${selectedIds.has(client.id) ? 'border-blue-500 bg-blue-50/30' : ''}`}
            >
              <div className={`flex ${viewMode === 'list' ? 'items-center' : 'w-full justify-between items-start'} space-x-4`}>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={(e) => toggleSelect(e, client.id)}
                    className={`p-1 rounded-lg transition-colors ${selectedIds.has(client.id) ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}`}
                  >
                    {selectedIds.has(client.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                  <div className="w-12 h-12 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors overflow-hidden shadow-sm">
                    <img 
                      src={client.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`} 
                      alt="avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-gray-900 tracking-tight">{client.name}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm ${
                        client.status === 'active' ? 'bg-emerald-50/80 text-emerald-600 border border-emerald-100/50' : 'bg-gray-100/80 text-gray-500 border border-gray-200/50'
                      }`}>
                        {client.status === 'active' ? '服务中' : '已归档'}
                      </span>
                    </div>
                    <div className="flex items-center text-[10px] text-gray-500 mt-1 font-medium">
                      <Phone size={10} className="mr-1" />
                      {client.contact || '暂无联系方式'}
                    </div>
                  </div>
                </div>

                {viewMode === 'grid' && (
                  <div className="flex items-center space-x-2">
                    {activeTab === 'archived' && onRestoreClient && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestoreClient(client.id);
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-50/50 rounded-xl transition-all flex items-center text-[10px] font-bold active:scale-95"
                        title="恢复到服务中"
                      >
                        <ArchiveRestore size={14} />
                      </button>
                    )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.alert('点击了删除按钮: ' + client.id);
                          if (window.confirm('确定要删除该客户吗？此操作无法撤销。')) {
                            console.log('Individual delete client:', client.id);
                            onDeleteClient?.(client.id);
                          }
                        }}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="删除客户"
                      >
                        <Trash2 size={14} />
                      </button>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                )}
              </div>

              <div className={`flex ${viewMode === 'list' ? 'flex-col items-end' : 'w-full justify-between items-center'}`}>
                {viewMode === 'list' ? (
                  <>
                    <div className="flex items-center space-x-2">
                      {activeTab === 'archived' && onRestoreClient && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestoreClient(client.id);
                          }}
                          className="p-2 text-blue-500 hover:bg-blue-50/50 rounded-xl transition-all flex items-center text-[10px] font-bold active:scale-95"
                          title="恢复到服务中"
                        >
                          <ArchiveRestore size={14} className="mr-1" />
                          恢复
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('确定要删除该客户吗？此操作无法撤销。')) {
                            console.log('Individual delete client (list):', client.id);
                            onDeleteClient?.(client.id);
                          }
                        }}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="删除客户"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button className="p-2 text-gray-300 hover:text-blue-500 hover:bg-white/50 rounded-xl transition-all">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-2 font-medium">{client.createdAt}</span>
                  </>
                ) : (
                  <span className="text-[10px] text-gray-400 font-medium">{client.createdAt}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-3xl shadow-sm min-h-[500px] flex flex-col items-center justify-center p-12 text-center">
          <div className="w-20 h-20 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-400 mb-6 shadow-sm">
            <Users size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">暂无学生档案</h3>
          <p className="text-sm text-gray-500 mb-8 max-w-xs font-medium">
            创建您的第一个学生档案开始使用
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus size={20} className="mr-2" />
            创建客户
          </button>
        </div>
      )}

      {/* Modal */}
      <CreateClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onConfirm={onAddClient}
      />
    </div>
  );
};

export default ClientArchives;
