import React, { useState, useEffect } from 'react';
import { 
  Info, 
  Search, 
  ChevronDown,
  Plus,
  ChevronRight,
  ChevronLeft,
  Moon,
  Sparkles,
  Loader2
} from 'lucide-react';

import { Client } from '../types';
import { TabId } from './Sidebar';
import EditorWorkspace from './EditorWorkspace';
import { generateEssay } from '../services/geminiService';

// --- Sub-components ---

interface EditorSidebarProps {
  clients: Client[];
  onAddClient: () => void;
  selectedClientId: string;
  onSelectClient: (id: string) => void;
  onSubmit: () => void;
  essayLength: number;
  setEssayLength: (val: number) => void;
  style: string;
  setStyle: (val: string) => void;
  prompt: string;
  setPrompt: (val: string) => void;
  isGenerating: boolean;
}

const EditorSidebar: React.FC<EditorSidebarProps> = ({ 
  clients, 
  onAddClient, 
  selectedClientId, 
  onSelectClient, 
  onSubmit,
  essayLength,
  setEssayLength,
  style,
  setStyle,
  prompt,
  setPrompt,
  isGenerating
}) => {
  const [showClientSelect, setShowClientSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="w-[320px] bg-white border-r border-gray-100 flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">自由创作</h3>
          <Info size={16} className="text-gray-300 cursor-help" />
        </div>

        {/* Client Select */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">选择学生档案</label>
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

        {/* Writing Prompt */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">写作指引</label>
          <textarea 
            placeholder="请输入写作指引，例如：写一段关于我在小学自学编程的经历"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm min-h-[120px] focus:ring-2 focus:ring-cyan-500 transition-all placeholder:text-gray-300 resize-none"
          />
        </div>

        {/* Writing Style */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">写作风格</label>
          <div className="relative">
            <select 
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full appearance-none bg-gray-50 border-none rounded-xl px-4 py-3 text-sm text-gray-700 focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
            >
              <option value="Narrative">Narrative (叙事文)</option>
              <option value="Argumentative">Argumentative (议论文)</option>
              <option value="Descriptive">Descriptive (描写文)</option>
              <option value="Expository">Expository (说明文)</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Essay Length */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Essay 长度</label>
            <span className="text-sm font-bold text-gray-900">{essayLength}词</span>
          </div>
          <div className="relative h-6 flex items-center">
            <input 
              type="range" 
              min="100" 
              max="2000" 
              step="50"
              value={essayLength}
              onChange={(e) => setEssayLength(parseInt(e.target.value))}
              className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button 
          onClick={onSubmit}
          disabled={!selectedClientId || !prompt || isGenerating}
          className="w-full flex items-center justify-center py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Sparkles size={18} className="mr-2" />}
          提交生成 AI
        </button>
      </div>
    </div>
  );
};

// --- Main Workbench Component ---

interface FreeWriteWorkbenchProps {
  clients: Client[];
  onTabChange: (tab: TabId) => void;
  onAddClientClick?: () => void;
  onSaveDocument: (clientId: string, document: { id?: string; title: string; type: string; content: string }) => string | undefined;
  initialDocument?: { id: string; content: string; title: string };
  onBack: () => void;
}

const FreeWriteWorkbench: React.FC<FreeWriteWorkbenchProps> = ({ clients, onTabChange, onAddClientClick, onSaveDocument, initialDocument, onBack }) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [documentContent, setDocumentContent] = useState<string>(initialDocument?.content || '');
  const [essayLength, setEssayLength] = useState(600);
  const [style, setStyle] = useState('Narrative');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | undefined>(initialDocument?.id);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (initialDocument) {
      setDocumentContent(initialDocument.content);
      setCurrentDocId(initialDocument.id);
    }
  }, [initialDocument]);

  const handleSaveToProfile = () => {
    if (!selectedClientId || !documentContent) {
      alert('请先选择或创建一个学生档案，并生成内容');
      return;
    }

    const docId = onSaveDocument(selectedClientId, {
      id: currentDocId,
      title: `Free Writing - ${prompt.substring(0, 20)}...`,
      type: 'Free Writing',
      content: documentContent
    });

    if (docId) setCurrentDocId(docId);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSubmitAI = async () => {
    if (!selectedClientId) {
      alert('请先选择或创建一个学生档案，以便同步保存您的创作内容');
      return;
    }
    if (!prompt) {
      alert('请填写写作指引');
      return;
    }
    
    setIsGenerating(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const result = await generateEssay({
        studentName: client?.name || '',
        prompt: `Style: ${style}. ${prompt}`,
        length: essayLength,
        studentProfile: client
      });
      setDocumentContent(result || '');
      setCurrentDocId(undefined);
    } catch (error) {
      console.error('Failed to generate content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F7F8FA] overflow-hidden">
      <EditorSidebar 
        clients={clients} 
        onAddClient={onAddClientClick || (() => onTabChange('users'))} 
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
        onSubmit={handleSubmitAI}
        essayLength={essayLength}
        setEssayLength={setEssayLength}
        style={style}
        setStyle={setStyle}
        prompt={prompt}
        setPrompt={setPrompt}
        isGenerating={isGenerating}
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
            <span className="text-gray-900 font-bold">自由创作</span>
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
          onSave={handleSaveToProfile}
          saveSuccess={saveSuccess}
        />
      </div>
    </div>
  );
};

export default FreeWriteWorkbench;
