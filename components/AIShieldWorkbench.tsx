import React, { useState, useEffect } from 'react';
import { 
  Info, 
  ChevronDown, 
  Search, 
  Sparkles,
  ChevronRight,
  Moon,
  Loader2,
  Copy,
  Save,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Client } from '../types';

// Mock documents for students
const MOCK_DOCUMENTS: Record<string, { id: string; title: string; content: string }[]> = {
  '1': [
    { id: 'd1', title: '个人陈述 (PS) - 初稿', content: '这是段同学的个人陈述初稿内容...' },
    { id: 'd2', title: '简历 (CV) - 2024版', content: '这是段同学的简历内容...' },
  ],
  '2': [
    { id: 'd3', title: '斯坦福申请文书', content: '这是李同学的斯坦福申请文书内容...' },
  ]
};

interface AIShieldSidebarProps {
  clients: Client[];
  selectedClientId: string;
  onSelectClient: (id: string) => void;
  selectedDocId: string;
  onSelectDoc: (id: string) => void;
  processState: 'idle' | 'processing' | 'success';
  onStart: () => void;
}

const AIShieldSidebar: React.FC<AIShieldSidebarProps> = ({ 
  clients, 
  selectedClientId, 
  onSelectClient, 
  selectedDocId, 
  onSelectDoc,
  processState,
  onStart
}) => {
  const [showClientSelect, setShowClientSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modelType, setModelType] = useState('standard');

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const availableDocs = selectedClientId ? MOCK_DOCUMENTS[selectedClientId] || [] : [];

  return (
    <div className="w-[320px] bg-white border-r border-gray-100 flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">降AI率</h3>
          <Info size={16} className="text-gray-300 cursor-help" />
        </div>

        {/* Client Select */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">选择学生档案</label>
          <div className="relative">
            <button 
              onClick={() => setShowClientSelect(!showClientSelect)}
              className="w-full flex items-center justify-between bg-gray-50 border border-transparent rounded-xl px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-all"
            >
              <span className="truncate">{selectedClient?.name || '搜索或选择学生档案'}</span>
              <ChevronDown size={16} className={`transition-transform ${showClientSelect ? 'rotate-180' : ''}`} />
            </button>

            {showClientSelect && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-2 border-b border-gray-50">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="搜索..."
                      className="w-full bg-gray-50 border-none rounded-lg py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-violet-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <button 
                        key={client.id}
                        className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          onSelectClient(client.id);
                          onSelectDoc(''); // Reset doc on client change
                          setShowClientSelect(false);
                        }}
                      >
                        {client.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-center text-xs text-gray-400">未找到匹配结果</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Document Select */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">选择目标文档</label>
          <div className="relative">
            <select 
              disabled={!selectedClientId}
              value={selectedDocId}
              onChange={(e) => onSelectDoc(e.target.value)}
              className="w-full appearance-none bg-gray-50 border-none rounded-xl px-4 py-3 text-sm text-gray-700 focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{selectedClientId ? '请选择文档' : '请先选择学生以加载文档'}</option>
              {availableDocs.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.title}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Model Config */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">降AI模式</label>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'standard', label: '常规降AI', desc: '平衡自然度与查重率' },
              { id: 'deep', label: '深度拟人化', desc: '模拟真实人类写作习惯' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setModelType(m.id)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  modelType === m.id 
                    ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500' 
                    : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="text-xs font-bold text-gray-900">{m.label}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={onStart}
          disabled={!selectedDocId || processState === 'processing'}
          className={`w-full flex items-center justify-center py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-violet-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {processState === 'processing' ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              处理中...
            </>
          ) : (
            <>
              <Sparkles size={18} className="mr-2" />
              开始降 AI 率
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const AIShieldWorkbench: React.FC<{ clients: Client[] }> = ({ clients }) => {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [processState, setProcessState] = useState<'idle' | 'processing' | 'success'>('idle');
  const [content, setContent] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Sync content when doc is selected
  useEffect(() => {
    if (selectedClientId && selectedDocId) {
      const doc = MOCK_DOCUMENTS[selectedClientId]?.find(d => d.id === selectedDocId);
      if (doc) setContent(doc.content);
    } else {
      setContent('');
    }
  }, [selectedClientId, selectedDocId]);

  const handleStart = () => {
    setProcessState('processing');
    setTimeout(() => {
      setProcessState('success');
      setContent(prev => `[已降AI处理] ${prev}\n\n处理后的文本更加自然，模拟了人类的语气和句式结构...`);
    }, 2000);
  };

  const handleSaveAsCopy = () => {
    // Logic: Create a new document record for the student
    console.log('Saving as new copy for student:', selectedClientId);
    alert('已成功保存为新副本！');
    reset();
  };

  const handleOverwrite = () => {
    // Logic: Update the existing document record
    console.log('Overwriting original document:', selectedDocId);
    alert('原文档已更新覆盖！');
    reset();
  };

  const reset = () => {
    setProcessState('idle');
    setShowConfirm(false);
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden relative">
      <AIShieldSidebar 
        clients={clients} 
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
        selectedDocId={selectedDocId}
        onSelectDoc={setSelectedDocId}
        processState={processState}
        onStart={handleStart}
      />
      
      <div className="flex-1 flex flex-col min-w-0 relative h-full bg-gray-50/30">
        {/* Breadcrumbs Header */}
        <div className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-2 text-xs font-medium">
            <span className="text-gray-400">EduPro</span>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-gray-900 font-bold">降AI率</span>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
              <Moon size={18} />
            </button>
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
              JD
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-12 flex justify-center custom-scrollbar">
          <div className="w-full max-w-3xl min-h-full">
            {!selectedDocId ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                  <Search size={32} />
                </div>
                <p className="text-sm font-medium text-gray-500">请在左侧选择学生档案及目标文档</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 min-h-[600px] relative">
                {processState === 'processing' && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
                    <div className="flex flex-col items-center space-y-3">
                      <Loader2 size={32} className="text-violet-600 animate-spin" />
                      <span className="text-sm font-bold text-gray-900">正在进行深度拟人化处理...</span>
                    </div>
                  </div>
                )}
                <textarea 
                  readOnly={processState === 'processing'}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full border-none focus:ring-0 text-lg text-gray-800 placeholder:text-gray-200 resize-none leading-relaxed font-sans"
                />
              </div>
            )}
          </div>
        </div>

        {/* Success Action Bar */}
        {processState === 'success' && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-2xl shadow-2xl border border-violet-100 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">✅ 降 AI 处理完成！</div>
                  <div className="text-[10px] text-gray-500">请选择保存方式以同步至学生档案</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={handleSaveAsCopy}
                  className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all flex items-center"
                >
                  <Copy size={14} className="mr-2" />
                  生成新副本
                </button>
                <button 
                  onClick={() => setShowConfirm(true)}
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-100 flex items-center"
                >
                  <Save size={14} className="mr-2" />
                  覆盖原文档
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Overwrite Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
            <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
                  <AlertTriangle size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900">确定要覆盖原文档吗？</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    覆盖后原始文本将无法恢复。建议您选择「生成新副本」以保留修改痕迹。
                  </p>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <button 
                  onClick={handleOverwrite}
                  className="w-full py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all"
                >
                  确定覆盖
                </button>
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="w-full py-3 bg-gray-50 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIShieldWorkbench;
