import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  Info, 
  Sparkles, 
  Trash2, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Moon, 
  Search as SearchIcon,
  ChevronDown,
  ArrowRight,
  Loader2,
  Save,
  Download,
  Copy,
  Undo2,
  Redo2,
  X
} from 'lucide-react';
import { Client } from '../types';
import { generatePSOutline, generatePSContent } from '../services/geminiService';
import EditorWorkspace, { TopToolbar, EditorFooter, FloatingAIButtons } from './EditorWorkspace';

// --- Sub-components ---

interface SidebarConfigProps {
  clients: Client[];
  onAddClientClick: () => void;
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;
  targetUni: string;
  setTargetUni: (val: string) => void;
  degree: string;
  setDegree: (val: string) => void;
  major: string;
  setMajor: (val: string) => void;
  outlineCount: number;
  setOutlineCount: (val: number) => void;
  instructions: string;
  setInstructions: (val: string) => void;
  isGeneratingOutline: boolean;
  onGenerateOutline: () => void;
  onGenerateContent: () => void;
  canGenerateContent: boolean;
}

const SidebarConfig: React.FC<SidebarConfigProps> = ({ 
  clients, 
  onAddClientClick,
  selectedClientId,
  setSelectedClientId,
  targetUni,
  setTargetUni,
  degree,
  setDegree,
  major,
  setMajor,
  outlineCount,
  setOutlineCount,
  instructions,
  setInstructions,
  isGeneratingOutline,
  onGenerateOutline,
  onGenerateContent,
  canGenerateContent
}) => {
  return (
    <div className="w-[320px] bg-white border-r border-gray-100 flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-32">
        {/* Client Select */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-900">选择学生档案</label>
          <div className="relative">
            <select 
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full appearance-none bg-gray-50 border-none rounded-xl px-4 py-3 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="">请选择学生档案</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <p className="text-[10px] text-gray-400">
            还没有创建学生档案？{' '}
            <button onClick={onAddClientClick} className="text-blue-600 font-bold hover:underline">新建一个</button>
          </p>
        </div>

        {/* Target Uni */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-900">目标院校</label>
          <div className="relative">
            <select 
              value={targetUni}
              onChange={(e) => setTargetUni(e.target.value)}
              className="w-full appearance-none bg-gray-50 border-none rounded-xl px-4 py-3 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="">请选择目标院校</option>
              <option value="Harvard University">Harvard University</option>
              <option value="Stanford University">Stanford University</option>
              <option value="MIT">MIT</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Degree */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-900">申请学位</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <GraduationCap size={16} />
            </div>
            <select 
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              className="w-full appearance-none bg-gray-50 border-none rounded-xl pl-11 pr-4 py-3 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="Undergraduate">Undergraduate</option>
              <option value="Master">Master</option>
              <option value="PhD">PhD</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Major */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-900">专业</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <BookOpen size={16} />
            </div>
            <select 
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="w-full appearance-none bg-gray-50 border-none rounded-xl pl-11 pr-4 py-3 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="Undecided">Undecided</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Economics">Economics</option>
              <option value="Psychology">Psychology</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Outline Count */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-900">大纲段落</label>
          <div className="flex items-center space-x-2">
            {[5, 6, 7, 8, 9, 10].map(num => (
              <button 
                key={num}
                onClick={() => setOutlineCount(num)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  outlineCount === num 
                    ? 'bg-black text-white' 
                    : 'bg-transparent text-gray-400 hover:bg-gray-50'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-900">自定义写作指引 (选填)</label>
          <div className="relative">
            <textarea 
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="输入自定义中心思想或亮点等指引，使用第一人称，例如: '着重描述我在XYZ公司的实习经历'"
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm min-h-[120px] focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Generate Outline Button */}
        <button 
          onClick={onGenerateOutline}
          disabled={!selectedClientId || isGeneratingOutline}
          className="w-full flex items-center justify-center py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isGeneratingOutline ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Sparkles size={18} className="mr-2" />}
          生成大纲 AI
        </button>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-50 space-y-3">
        <button 
          onClick={onGenerateContent}
          disabled={!canGenerateContent}
          className="w-full flex items-center justify-center py-4 bg-cyan-400 text-white rounded-xl text-sm font-bold hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-100 active:scale-[0.98] disabled:opacity-50"
        >
          生成正文
          <ArrowRight size={18} className="ml-2" />
        </button>
        <p className="text-[10px] text-gray-400 text-center">需要至少 3 个大纲段落</p>
      </div>
    </div>
  );
};

interface OutlineEditorProps {
  paragraphs: { id: string; text: string }[];
  setParagraphs: React.Dispatch<React.SetStateAction<{ id: string; text: string }[]>>;
}

const OutlineEditor: React.FC<OutlineEditorProps> = ({ paragraphs, setParagraphs }) => {
  const addParagraph = () => {
    setParagraphs([...paragraphs, { id: Math.random().toString(36).substr(2, 9), text: '' }]);
  };

  const removeParagraph = (id: string) => {
    if (paragraphs.length <= 1) return;
    setParagraphs(paragraphs.filter(p => p.id !== id));
  };

  const updateParagraph = (id: string, text: string) => {
    setParagraphs(paragraphs.map(p => p.id === id ? { ...p, text } : p));
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden">
      {/* Top Nav */}
      <div className="h-14 bg-white border-b border-gray-100 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 text-xs font-medium">
          <span className="text-gray-400">留学咩</span>
          <ChevronRight size={12} className="text-gray-300" />
          <span className="text-gray-900 font-bold">写PS</span>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
            <Moon size={18} />
          </button>
          <div className="relative">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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

      {/* Stepper */}
      <div className="py-8 flex justify-center shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center px-4 py-2 bg-cyan-100 text-cyan-600 rounded-full text-xs font-bold shadow-sm border border-cyan-200">
            <div className="w-5 h-5 bg-cyan-600 text-white rounded-full flex items-center justify-center text-[10px] mr-2">1</div>
            编辑大纲
          </div>
          <div className="w-12 h-px bg-gray-200" />
          <div className="flex items-center text-gray-400 text-xs font-bold">
            <div className="w-5 h-5 border-2 border-gray-200 rounded-full flex items-center justify-center text-[10px] mr-2">2</div>
            生成文书
          </div>
        </div>
      </div>

      {/* Outline List */}
      <div className="flex-1 overflow-y-auto px-8 pb-20 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-4">
          {paragraphs.map((p, index) => (
            <div key={p.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start space-x-6 group hover:border-cyan-200 transition-all">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 bg-cyan-50 text-cyan-600 rounded-full flex items-center justify-center text-xs font-bold border border-cyan-100">
                  {index + 1}
                </div>
                {index < paragraphs.length - 1 && (
                  <div className="w-px h-12 bg-gray-100 mt-4" />
                )}
              </div>
              <div className="flex-1 pt-1">
                <textarea 
                  placeholder="输入段落大纲..."
                  value={p.text}
                  onChange={(e) => updateParagraph(p.id, e.target.value)}
                  className="w-full border-none focus:ring-0 p-0 text-sm text-gray-800 placeholder:text-gray-200 resize-none min-h-[60px] leading-relaxed"
                />
              </div>
              <button 
                onClick={() => removeParagraph(p.id)}
                className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          {/* Add Button */}
          <div className="flex justify-center pt-4">
            <button 
              onClick={addParagraph}
              className="flex items-center px-6 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
            >
              <Plus size={16} className="mr-2" />
              添加段落
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Workbench Component ---

interface PSWorkbenchProps {
  clients: Client[];
  onAddClientClick: () => void;
  onSaveDocument: (clientId: string, document: { id?: string; title: string; type: string; content: string }) => string | undefined;
  initialDocument?: { id: string; content: string; title: string };
  onBack: () => void;
  initialClientId?: string;
}

const PSWorkbench: React.FC<PSWorkbenchProps> = ({ clients, onAddClientClick, onSaveDocument, initialDocument, onBack, initialClientId }) => {
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || '');
  const [targetUni, setTargetUni] = useState('');
  const [degree, setDegree] = useState('Master');
  const [major, setMajor] = useState('Computer Science');
  const [outlineCount, setOutlineCount] = useState(7);
  const [instructions, setInstructions] = useState('');
  
  const [paragraphs, setParagraphs] = useState([
    { id: '1', text: '' },
    { id: '2', text: '' },
    { id: '3', text: '' },
  ]);

  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(initialDocument?.content || '');
  const [currentDocId, setCurrentDocId] = useState<string | undefined>(initialDocument?.id);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Save Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');

  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
    }
  }, [initialClientId]);

  useEffect(() => {
    if (initialDocument) {
      setGeneratedContent(initialDocument.content);
      setCurrentDocId(initialDocument.id);
      setDocumentTitle(initialDocument.title);
    }
  }, [initialDocument]);

  const handleGenerateOutline = async () => {
    if (!selectedClientId) return;
    setIsGeneratingOutline(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const outlines = await generatePSOutline({
        studentName: client?.name || '',
        targetUni,
        degree,
        major,
        outlineCount,
        instructions,
        studentProfile: client
      });
      setParagraphs(outlines.map((text: string) => ({ id: Math.random().toString(36).substr(2, 9), text })));
    } catch (error) {
      console.error('Failed to generate outline:', error);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleGenerateContent = async () => {
    if (paragraphs.length < 3) return;
    setIsGeneratingContent(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const content = await generatePSContent({
        studentName: client?.name || '',
        targetUni,
        degree,
        major,
        outlines: paragraphs.map(p => p.text),
        instructions,
        studentProfile: client
      });
      setGeneratedContent(content || '');
      // Set default title if not set
      if (!documentTitle) {
        setDocumentTitle(`Personal Statement - ${targetUni || 'General'}`);
      }
    } catch (error) {
      console.error('Failed to generate content:', error);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleSaveClick = () => {
    if (!selectedClientId || !generatedContent) return;
    setShowSaveModal(true);
  };

  const handleConfirmSave = () => {
    setIsSaving(true);
    const docId = onSaveDocument(selectedClientId, {
      id: currentDocId,
      title: documentTitle || `Personal Statement - ${targetUni || 'General'}`,
      type: 'PS',
      content: generatedContent
    });
    
    if (docId) setCurrentDocId(docId);
    
    setIsSaving(false);
    setSaveSuccess(true);
    setShowSaveModal(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleRegenerate = () => {
    if (confirm('重新生成将覆盖当前内容，确定要继续吗？')) {
      handleGenerateContent();
    }
  };

  if (generatedContent) {
    return (
      <div className="flex flex-col h-screen bg-white overflow-hidden relative">
        {/* Save Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSaveModal(false)} />
            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">保存文书</h3>
                <button onClick={() => setShowSaveModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">文档标题</label>
                  <input 
                    type="text" 
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500"
                    placeholder="输入文档标题..."
                    autoFocus
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button 
                    onClick={() => setShowSaveModal(false)}
                    className="px-4 py-2 text-gray-500 font-bold text-sm hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleConfirmSave}
                    className="px-6 py-2 bg-cyan-500 text-white font-bold text-sm rounded-xl hover:bg-cyan-600 shadow-lg shadow-cyan-100 transition-all"
                  >
                    确认保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="h-14 border-b border-gray-100 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-xs font-medium">
            <span className="text-gray-400">留学咩</span>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-gray-900 font-bold">PS 正文编辑</span>
          </div>
          <div className="flex items-center space-x-3">
            {saveSuccess && (
              <div className="flex items-center text-emerald-500 text-xs font-bold mr-2 animate-in fade-in duration-300">
                <Sparkles size={14} className="mr-1" />
                保存成功
              </div>
            )}
            <button 
              onClick={onBack}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
            >
              返回客户详情
            </button>
            <button 
              onClick={() => {
                setGeneratedContent('');
                setCurrentDocId(undefined);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
            >
              返回编辑大纲
            </button>
          </div>
        </div>

        <EditorWorkspace 
          value={generatedContent} 
          onChange={setGeneratedContent}
          onSave={handleSaveClick}
          saveSuccess={saveSuccess}
        />
        
        {/* Custom Toolbar Actions for PS (Regenerate) */}
        <div className="absolute top-[60px] right-8 flex space-x-2">
           <button 
            onClick={handleRegenerate}
            className="flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all border border-indigo-100"
          >
            <Sparkles size={14} className="mr-1.5" />
            重新生成
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-50">
        <button 
          onClick={onBack}
          className="p-2 bg-white border border-gray-100 rounded-full text-gray-400 hover:text-gray-600 shadow-sm transition-all"
          title="返回"
        >
          <ChevronLeft size={20} />
        </button>
      </div>
      {isGeneratingContent && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center space-y-4">
          <Loader2 size={48} className="text-cyan-500 animate-spin" />
          <p className="text-sm font-bold text-gray-900">正在为您生成 PS 正文，请稍候...</p>
        </div>
      )}
      <SidebarConfig 
        clients={clients} 
        onAddClientClick={onAddClientClick}
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
        targetUni={targetUni}
        setTargetUni={setTargetUni}
        degree={degree}
        setDegree={setDegree}
        major={major}
        setMajor={setMajor}
        outlineCount={outlineCount}
        setOutlineCount={setOutlineCount}
        instructions={instructions}
        setInstructions={setInstructions}
        isGeneratingOutline={isGeneratingOutline}
        onGenerateOutline={handleGenerateOutline}
        onGenerateContent={handleGenerateContent}
        canGenerateContent={paragraphs.length >= 3 && !!selectedClientId}
      />
      <OutlineEditor paragraphs={paragraphs} setParagraphs={setParagraphs} />
    </div>
  );
};

export default PSWorkbench;
