import React, { useState, useRef } from 'react';
import { 
  Wand2, 
  UploadCloud, 
  Users, 
  Search, 
  Loader2, 
  CheckCircle2,
  FileText,
  ChevronRight,
  Search as SearchIcon
} from 'lucide-react';
import { Client } from '../types';
import { parseClientFile } from '../services/geminiService';

interface EssayAgentEntryProps {
  clients: Client[];
  onAddClient: (name: string, parsedData?: Partial<Client>) => void;
  onSelectClient: (client: Client) => void;
}

const EssayAgentEntry: React.FC<EssayAgentEntryProps> = ({ clients, onAddClient, onSelectClient }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'select'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        if (result) {
          try {
            const data = await parseClientFile(result, file.type);
            const clientName = data.name || file.name.split('.')[0] || '新上传学生';
            onAddClient(clientName, data);
            setActiveTab('select');
          } catch (err) {
            console.error("Parsing failed", err);
            onAddClient(file.name.split('.')[0]);
            setActiveTab('select');
          } finally {
            setIsUploading(false);
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsUploading(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Top Navigation / Breadcrumbs */}
      <div className="w-full bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 text-xs font-medium">
          <span className="text-gray-400">留学咩</span>
          <ChevronRight size={12} className="text-gray-300" />
          <span className="text-gray-900 font-bold">Agentic</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索..." 
              className="bg-gray-50 border-none rounded-full py-1.5 pl-9 pr-4 text-xs focus:ring-1 focus:ring-cyan-500 w-48"
            />
          </div>
          <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
            JD
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl px-6 py-12 text-center">
        {/* Hero Section */}
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center px-3 py-1 bg-cyan-50 text-cyan-600 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6">
            <Wand2 size={12} className="mr-2" />
            智能文书助手
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            全套申请文书，一次搞定
          </h1>
          <p className="text-gray-500 text-lg max-w-lg mx-auto leading-relaxed">
            背景分析、Essay搜题、全套文书写作、自动降AI率一步到位
          </p>
        </div>

        {/* Action Area */}
        <div className="w-full bg-white rounded-[32px] p-10 shadow-xl shadow-gray-200/50 border border-gray-100 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">选择学生档案</h3>
            <p className="text-sm text-gray-400">上传新档案或从资料库选择</p>
          </div>

          {/* Segmented Control / Tabs */}
          <div className="bg-gray-100 p-1 rounded-2xl flex mb-8">
            <button 
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'upload' 
                  ? 'bg-white text-cyan-600 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <UploadCloud size={18} className="mr-2" />
              上传新档案
            </button>
            <button 
              onClick={() => setActiveTab('select')}
              className={`flex-1 flex items-center justify-center py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'select' 
                  ? 'bg-white text-cyan-600 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Users size={18} className="mr-2" />
              从资料库选择
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[240px] flex flex-col">
            {activeTab === 'upload' ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer transition-all hover:border-cyan-300 hover:bg-cyan-50/30 group relative overflow-hidden ${
                  isUploading ? 'pointer-events-none' : ''
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.txt,image/*"
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center animate-in fade-in duration-300">
                    <Loader2 size={48} className="text-cyan-500 animate-spin mb-4" />
                    <p className="text-sm font-bold text-gray-900">正在解析档案...</p>
                    <p className="text-[10px] text-gray-400 mt-1">AI 正在提取背景信息，请稍候</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4 group-hover:bg-white group-hover:text-cyan-500 transition-all group-hover:scale-110">
                      <UploadCloud size={32} />
                    </div>
                    <p className="text-base font-bold text-gray-900 mb-1">点击或拖拽上传</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">支持 PDF, Word, TXT, 图片格式</p>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-4 animate-in fade-in duration-300">
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="搜索已有学生档案..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                </div>
                
                <div className="flex-1 max-h-[200px] overflow-y-auto custom-scrollbar space-y-2 pr-2 text-left">
                  {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <button 
                        key={client.id}
                        onClick={() => onSelectClient(client)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-cyan-50 rounded-xl transition-all group border border-transparent hover:border-cyan-100"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-cyan-500 shadow-sm">
                            <FileText size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{client.name}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">创建于 {client.createdAt}</p>
                          </div>
                        </div>
                        <CheckCircle2 size={18} className="text-gray-200 group-hover:text-cyan-500 transition-colors" />
                      </button>
                    ))
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                      <Users size={32} className="mb-2 opacity-20" />
                      <p className="text-xs">未找到匹配的档案</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Hint */}
        <p className="mt-8 text-xs text-gray-400">
          AI 助手将基于所选档案为您提供个性化的文书建议
        </p>
      </div>
    </div>
  );
};

export default EssayAgentEntry;
