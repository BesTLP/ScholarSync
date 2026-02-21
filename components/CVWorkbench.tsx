import React, { useState, useEffect } from 'react';
import { 
  Info, 
  ChevronDown, 
  Search, 
  Plus, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Moon,
  Loader2
} from 'lucide-react';
import { Client } from '../types';
import EditorWorkspace from './EditorWorkspace';
import { generateCV } from '../services/geminiService';

interface CVSidebarConfigProps {
  clients: Client[];
  onAddClient: () => void;
  selectedClientId: string;
  onSelectClient: (id: string) => void;
  isCreativeMode: boolean;
  setIsCreativeMode: (val: boolean) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

const CVSidebarConfig: React.FC<CVSidebarConfigProps> = ({ 
  clients, 
  onAddClient, 
  selectedClientId, 
  onSelectClient, 
  isCreativeMode, 
  setIsCreativeMode,
  isGenerating,
  onGenerate
}) => {
  const [showClientSelect, setShowClientSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="w-[300px] bg-white border-r border-gray-100 flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">简历</h3>
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
              <span className="truncate">{selectedClient?.name || '选择学生档案'}</span>
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
                      className="w-full bg-gray-50 border-none rounded-lg py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-cyan-500"
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
                          setShowClientSelect(false);
                        }}
                      >
                        {client.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-center text-xs text-gray-400">
                      未找到匹配结果
                    </div>
                  )}
                </div>
                <button 
                  onClick={onAddClient}
                  className="w-full flex items-center justify-center px-4 py-3 border-t border-gray-50 text-xs font-bold text-cyan-600 hover:bg-cyan-50 transition-colors"
                >
                  <Plus size={14} className="mr-2" />
                  新建档案
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Creative Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsCreativeMode(!isCreativeMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isCreativeMode ? 'bg-cyan-500' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isCreativeMode ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm font-bold text-gray-900">创意模式</span>
          </div>
        </div>

        {/* Submit Button */}
        <button 
          onClick={onGenerate}
          disabled={!selectedClientId || isGenerating}
          className="w-full flex items-center justify-center py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Sparkles size={18} className="mr-2" />}
          生成CV AI
        </button>
      </div>
    </div>
  );
};

const CVWorkbench: React.FC<{ 
  clients: Client[]; 
  onAddClient: () => void;
  onSaveDocument: (clientId: string, document: { id?: string; title: string; type: string; content: string }) => string | undefined;
  initialDocument?: { id: string; content: string; title: string };
  onBack: () => void;
}> = ({ clients, onAddClient, onSaveDocument, initialDocument, onBack }) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isCreativeMode, setIsCreativeMode] = useState(false);
  const [documentContent, setDocumentContent] = useState<string>(initialDocument?.content || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | undefined>(initialDocument?.id);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (initialDocument) {
      setDocumentContent(initialDocument.content);
      setCurrentDocId(initialDocument.id);
    }
  }, [initialDocument]);

  const handleGenerate = async () => {
    if (!selectedClientId) {
      alert('请先选择或创建一个学生档案');
      return;
    }
    setIsGenerating(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const result = await generateCV({
        studentName: client?.name || '',
        studentProfile: client,
        instructions: isCreativeMode ? 'Use a creative and modern style.' : 'Use a standard professional style.'
      });
      setDocumentContent(result || '');
      setCurrentDocId(undefined);
    } catch (error) {
      console.error('Failed to generate CV:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!selectedClientId || !documentContent) return;
    const docId = onSaveDocument(selectedClientId, {
      id: currentDocId,
      title: `CV - ${isCreativeMode ? 'Creative' : 'Standard'}`,
      type: 'CV',
      content: documentContent
    });
    
    if (docId) setCurrentDocId(docId);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <CVSidebarConfig 
        clients={clients} 
        onAddClient={onAddClient} 
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
        isCreativeMode={isCreativeMode}
        setIsCreativeMode={setIsCreativeMode}
        isGenerating={isGenerating}
        onGenerate={handleGenerate}
      />
      
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Breadcrumbs Header */}
        <div className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-2 text-xs font-medium">
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-gray-50 rounded-full text-gray-400 transition-colors mr-2"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-gray-400">EduPro</span>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-gray-900 font-bold">写CV</span>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
              <Moon size={18} />
            </button>
            <div className="relative">
              <div className="bg-gray-50 rounded-full py-1.5 pl-9 pr-4 text-xs text-gray-400 w-48 flex items-center justify-between">
                <span>搜索...</span>
                <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-gray-200">⌘K</span>
              </div>
            </div>
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
              JD
            </div>
          </div>
        </div>

        <EditorWorkspace 
          value={documentContent} 
          onChange={setDocumentContent}
          onSave={handleSave}
          saveSuccess={saveSuccess}
        />
      </div>
    </div>
  );
};

export default CVWorkbench;
