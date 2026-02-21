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
  GraduationCap,
  BookOpen,
  Loader2
} from 'lucide-react';
import { Client } from '../types';
import EditorWorkspace from './EditorWorkspace';
import { generateLOR } from '../services/geminiService';

interface LORSidebarConfigProps {
  clients: Client[];
  onAddClient: () => void;
  selectedClientId: string;
  onSelectClient: (id: string) => void;
  targetUni: string;
  setTargetUni: (val: string) => void;
  degree: string;
  setDegree: (val: string) => void;
  major: string;
  setMajor: (val: string) => void;
  recommenderInfo: string;
  setRecommenderInfo: (val: string) => void;
  highlights: string;
  setHighlights: (val: string) => void;
  lorLength: number;
  setLorLength: (val: number) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

const LORSidebarConfig: React.FC<LORSidebarConfigProps> = ({ 
  clients, 
  onAddClient, 
  selectedClientId, 
  onSelectClient, 
  targetUni,
  setTargetUni,
  degree,
  setDegree,
  major,
  setMajor,
  recommenderInfo,
  setRecommenderInfo,
  highlights,
  setHighlights,
  lorLength,
  setLorLength,
  isGenerating,
  onGenerate
}) => {
  const [showClientSelect, setShowClientSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTargetSchoolEnabled, setIsTargetSchoolEnabled] = useState(false);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="w-[320px] bg-white border-r border-gray-100 flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">推荐信</h3>
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

        {/* Target School Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsTargetSchoolEnabled(!isTargetSchoolEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isTargetSchoolEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isTargetSchoolEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm font-bold text-gray-900">指定目标院校</span>
          </div>
        </div>

        {/* Conditional Fields */}
        <div className={`space-y-4 overflow-hidden transition-all duration-300 ${isTargetSchoolEnabled ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">目标院校</label>
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

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">申请学位</label>
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

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">专业</label>
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
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Recommender Info */}
        <div className="space-y-2">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">推荐人信息</label>
            <textarea 
              value={recommenderInfo}
              onChange={(e) => setRecommenderInfo(e.target.value)}
              placeholder="把推荐人信息复制粘贴或输入到这里"
              className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-800 placeholder:text-gray-300 min-h-[100px] resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Highlights */}
        <div className="space-y-2">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">定制亮点</label>
            <textarea 
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              placeholder="输入希望着重表达的亮点，建议每行一条"
              className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-800 placeholder:text-gray-300 min-h-[100px] resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* LOR Length */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">推荐信长度</label>
            <span className="text-sm font-bold text-gray-900">{lorLength}词</span>
          </div>
          <div className="relative h-6 flex items-center">
            <input 
              type="range" 
              min="100" 
              max="1000" 
              step="50"
              value={lorLength}
              onChange={(e) => setLorLength(parseInt(e.target.value))}
              className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button 
          onClick={onGenerate}
          disabled={!selectedClientId || !recommenderInfo || isGenerating}
          className="w-full flex items-center justify-center py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Sparkles size={18} className="mr-2" />}
          生成推荐信 AI
        </button>
      </div>
    </div>
  );
};

const LORWorkbench: React.FC<{ 
  clients: Client[]; 
  onAddClient: () => void;
  onSaveDocument: (clientId: string, document: { id?: string; title: string; type: string; content: string }) => string | undefined;
  initialDocument?: { id: string; content: string; title: string };
  onBack: () => void;
}> = ({ clients, onAddClient, onSaveDocument, initialDocument, onBack }) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [targetUni, setTargetUni] = useState('');
  const [degree, setDegree] = useState('Master');
  const [major, setMajor] = useState('Computer Science');
  const [recommenderInfo, setRecommenderInfo] = useState('');
  const [highlights, setHighlights] = useState('');
  const [lorLength, setLorLength] = useState(300);
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
    if (!recommenderInfo) {
      alert('请填写推荐人信息');
      return;
    }
    setIsGenerating(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const result = await generateLOR({
        studentName: client?.name || '',
        recommenderName: 'Recommender', // Simplified for now
        recommenderTitle: 'Professor',
        relationship: 'Professor',
        targetUni,
        major,
        focusPoints: highlights,
        studentProfile: client
      });
      setDocumentContent(result || '');
      setCurrentDocId(undefined);
    } catch (error) {
      console.error('Failed to generate LOR:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!selectedClientId || !documentContent) return;
    const docId = onSaveDocument(selectedClientId, {
      id: currentDocId,
      title: `Letter of Recommendation - ${targetUni || 'General'}`,
      type: 'LOR',
      content: documentContent
    });
    
    if (docId) setCurrentDocId(docId);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <LORSidebarConfig 
        clients={clients} 
        onAddClient={onAddClient} 
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
        targetUni={targetUni}
        setTargetUni={setTargetUni}
        degree={degree}
        setDegree={setDegree}
        major={major}
        setMajor={setMajor}
        recommenderInfo={recommenderInfo}
        setRecommenderInfo={setRecommenderInfo}
        highlights={highlights}
        setHighlights={setHighlights}
        lorLength={lorLength}
        setLorLength={setLorLength}
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
            <span className="text-gray-900 font-bold">写推荐信</span>
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

export default LORWorkbench;
