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
  ArchiveRestore
} from 'lucide-react';
import CreateClientModal from './CreateClientModal';
import { Client } from '../types';

interface ClientArchivesProps {
  clients: Client[];
  onAddClient: (name: string, parsedData?: Partial<Client>) => void;
  onSelectClient: (client: Client) => void;
  onUpdateClient?: (client: Client) => void;
  onRestoreClient?: (clientId: string) => void;
}

const ClientArchives: React.FC<ClientArchivesProps> = ({ 
  clients, 
  onAddClient, 
  onSelectClient, 
  onUpdateClient,
  onRestoreClient
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const filteredClients = clients.filter(c => c.status === activeTab);

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-8">
      {/* Breadcrumbs & Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <nav className="flex items-center space-x-2 text-xs font-medium mb-3">
            <span className="text-gray-400">留学咩</span>
            <ChevronRight size={12} className="text-gray-300" />
            <button className="text-cyan-600 hover:text-cyan-700 transition-colors">客户</button>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">学生档案</h1>
          <p className="text-sm text-gray-500">管理您的所有客户信息</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-5 py-2.5 bg-cyan-500 text-white rounded-xl text-sm font-bold hover:bg-cyan-600 transition-all shadow-lg shadow-cyan-100 active:scale-95"
        >
          <Plus size={18} className="mr-2" />
          创建客户
        </button>
      </div>

      {/* Filter & View Switch Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-8 border-b border-gray-200 flex-1">
          <button 
            onClick={() => setActiveTab('active')}
            className={`pb-3 text-sm font-bold transition-all relative ${
              activeTab === 'active' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            服务中 <span className="ml-1 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-500">{clients.filter(c => c.status === 'active').length}</span>
            {activeTab === 'active' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 rounded-full" />
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
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 rounded-full" />
            )}
          </button>
        </div>
        
        <div className="flex items-center ml-8 space-x-2">
          <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutList size={18} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
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
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-cyan-200 transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-cyan-50 group-hover:text-cyan-500 transition-colors overflow-hidden">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`} 
                    alt="avatar" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-gray-900">{client.name}</h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      client.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {client.status === 'active' ? '服务中' : '已归档'}
                    </span>
                  </div>
                  <div className="flex items-center text-[10px] text-gray-400 mt-1">
                    <Phone size={10} className="mr-1" />
                    {client.contact || '暂无联系方式'}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center space-x-2">
                  {activeTab === 'archived' && onRestoreClient && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestoreClient(client.id);
                      }}
                      className="p-2 text-cyan-500 hover:bg-cyan-50 rounded-lg transition-all flex items-center text-[10px] font-bold"
                      title="恢复到服务中"
                    >
                      <ArchiveRestore size={14} className="mr-1" />
                      恢复
                    </button>
                  )}
                  <button className="p-2 text-gray-300 hover:text-gray-600 transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
                <span className="text-[10px] text-gray-300 mt-2">{client.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[500px] flex flex-col items-center justify-center p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
            <Users size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">暂无学生档案</h3>
          <p className="text-sm text-gray-400 mb-8 max-w-xs">
            创建您的第一个学生档案开始使用
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-8 py-3 bg-cyan-500 text-white rounded-xl text-sm font-bold hover:bg-cyan-600 transition-all shadow-xl shadow-cyan-100 active:scale-95"
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
