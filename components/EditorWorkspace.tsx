import React, { useState, useRef, useEffect } from 'react';
import { 
  Save, 
  Download, 
  Copy, 
  Clipboard, 
  Undo2, 
  Redo2, 
  ChevronDown,
  Plus,
  Minus,
  Sparkles,
  Star,
  MessageCircle,
  FileText,
  Wand2,
  PenTool,
  Eye,
  EyeOff
} from 'lucide-react';

export const TopToolbar: React.FC<{ 
  onSave?: () => void; 
  saveSuccess?: boolean;
  onExport?: () => void;
  onCopy?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  showPreviewToggle?: boolean;
  isPreview?: boolean;
  onTogglePreview?: () => void;
}> = ({ onSave, saveSuccess, onExport, onCopy, onUndo, onRedo, canUndo, canRedo, showPreviewToggle, isPreview, onTogglePreview }) => {
  return (
    <div className="h-14 border-b border-gray-100 bg-white flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center space-x-1">
        <button 
          onClick={onSave}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all border ${
            saveSuccess 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
              : 'text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 border-transparent hover:border-cyan-100'
          }`}
          title="保存"
        >
          {saveSuccess ? <Sparkles size={18} /> : <Save size={18} />}
          <span className="text-xs font-bold">{saveSuccess ? '保存成功' : '保存'}</span>
        </button>
        <div className="w-px h-4 bg-gray-100 mx-1" />
        <button 
          onClick={onExport}
          className="flex items-center px-2 py-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all" 
          title="导出"
        >
          <Download size={18} />
          <ChevronDown size={12} className="ml-1" />
        </button>
        <button 
          onClick={onCopy}
          className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all" 
          title="复制"
        >
          <Copy size={18} />
        </button>
        <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all" title="粘贴">
          <Clipboard size={18} />
        </button>
        <div className="w-px h-4 bg-gray-100 mx-1" />
        <button 
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all disabled:opacity-30" 
          title="撤销"
        >
          <Undo2 size={18} />
        </button>
        <button 
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all disabled:opacity-30" 
          title="重做"
        >
          <Redo2 size={18} />
        </button>
        
        {showPreviewToggle && (
          <>
            <div className="w-px h-4 bg-gray-100 mx-1" />
            <button 
              onClick={onTogglePreview}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all border ${
                isPreview 
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-transparent'
              }`}
              title="预览模式"
            >
              {isPreview ? <Eye size={18} /> : <EyeOff size={18} />}
              <span className="text-xs font-bold">{isPreview ? '预览模式' : '编辑模式'}</span>
            </button>
          </>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <button className="flex items-center px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold border border-indigo-100 hover:bg-indigo-100 transition-all">
          <span className="mr-1.5">{"{}"}</span>
          查AI率
        </button>
        <button className="flex items-center px-4 py-1.5 bg-violet-50 text-violet-600 rounded-full text-xs font-bold border border-violet-100 hover:bg-violet-100 transition-all">
          <Sparkles size={14} className="mr-1.5" />
          降AI率
        </button>
      </div>
    </div>
  );
};

export const RichTextCanvas: React.FC<{ 
  value?: string; 
  onChange?: (val: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  isPreview?: boolean;
}> = ({ value, onChange, textareaRef, onKeyDown, isPreview }) => {
  
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    // Simple regex replacements for preview
    const html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-gray-900">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 text-gray-900 border-b border-gray-100 pb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4 text-gray-900">$1</h1>')
      // Bold
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      // Lists
      .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-gray-700 mb-1">$1</li>')
      // Line breaks
      .replace(/\n/gim, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: html }} className="prose prose-sm max-w-none" />;
  };

  return (
    <div className="flex-1 bg-white overflow-y-auto p-12 flex justify-center custom-scrollbar">
      <div className="w-full max-w-3xl min-h-full">
        {isPreview ? (
          <div className="w-full h-full text-lg text-gray-800 leading-relaxed font-sans">
            {renderMarkdown(value || '')}
          </div>
        ) : (
          <textarea 
            ref={textareaRef}
            placeholder='开始写作或输入 "/" 来使用命令...'
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full h-full border-none focus:ring-0 text-lg text-gray-800 placeholder:text-gray-200 resize-none leading-relaxed font-sans"
          />
        )}
      </div>
    </div>
  );
};

export const EditorFooter: React.FC<{ charCount: number; wordCount: number }> = ({ charCount, wordCount }) => {
  return (
    <div className="h-10 border-t border-gray-100 bg-white flex items-center justify-between px-6 shrink-0">
      <div className="text-[10px] font-medium text-gray-400 tracking-wider">
        单词: {wordCount} | 字数: {charCount}
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3 text-gray-400">
          <Minus size={14} className="cursor-pointer hover:text-gray-600" />
          <span className="text-[10px] font-bold w-8 text-center">100%</span>
          <Plus size={14} className="cursor-pointer hover:text-gray-600" />
        </div>
      </div>
    </div>
  );
};

export const FloatingAIButtons: React.FC = () => {
  return (
    <div className="absolute bottom-16 right-8 flex flex-col space-y-4">
      <button className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform">
        <Star size={24} />
      </button>
      <button className="w-12 h-12 bg-green-500 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform">
        <MessageCircle size={24} />
      </button>
    </div>
  );
};

interface EditorWorkspaceProps {
  value?: string;
  onChange?: (val: string) => void;
  onSave?: () => void;
  saveSuccess?: boolean;
  previewMode?: boolean;
}

const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({ value, onChange, onSave, saveSuccess, previewMode }) => {
  const [history, setHistory] = useState<string[]>([value || '']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync history when value changes externally (e.g. initial load)
  useEffect(() => {
    if (value !== history[historyIndex]) {
      // Only update if it's different to avoid loops
      // But this is tricky if onChange updates value.
      // We'll rely on handleContentChange for internal updates.
    }
  }, [value]);

  const handleContentChange = (newContent: string) => {
    onChange?.(newContent);
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    // Slash command check
    if (newContent.endsWith('/')) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange?.(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange?.(history[newIndex]);
    }
  };

  const handleExport = () => {
    const blob = new Blob([value || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'document.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value || '');
    // Simple alert for now, ideally a toast
    const btn = document.activeElement as HTMLElement;
    if (btn) {
      const originalText = btn.title;
      btn.title = "已复制!";
      setTimeout(() => btn.title = originalText, 2000);
    }
    alert('内容已复制到剪贴板');
  };

  const charCount = (value || '').replace(/\s/g, '').length;
  const wordCount = (value || '').split(/\s+/).filter(Boolean).length;

  const insertTemplate = (text: string) => {
    const newContent = (value || '') + text;
    handleContentChange(newContent);
    setShowSlashMenu(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 relative h-full">
      <TopToolbar 
        onSave={onSave} 
        saveSuccess={saveSuccess}
        onExport={handleExport}
        onCopy={handleCopy}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        showPreviewToggle={previewMode}
        isPreview={isPreview}
        onTogglePreview={() => setIsPreview(!isPreview)}
      />
      
      <div className="flex-1 relative overflow-hidden flex flex-col">
        <RichTextCanvas 
          value={value} 
          onChange={handleContentChange} 
          textareaRef={textareaRef}
          isPreview={isPreview}
        />
        
        {showSlashMenu && !isPreview && (
          <div className="absolute bottom-12 left-12 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">AI 助手</div>
            <button onClick={() => insertTemplate('\n\n[AI 续写内容...]')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-600 rounded-lg flex items-center">
              <Wand2 size={16} className="mr-2" />
              AI 续写
            </button>
            <button onClick={() => insertTemplate('\n\n[AI 润色内容...]')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-600 rounded-lg flex items-center">
              <Sparkles size={16} className="mr-2" />
              AI 润色
            </button>
            <div className="h-px bg-gray-50 my-1" />
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">模板</div>
            <button onClick={() => insertTemplate('\n\n# 个人陈述大纲\n1. 引言\n2. 学术背景\n3. 研究经历\n4. 职业目标\n5. 结语')} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 rounded-lg flex items-center">
              <FileText size={16} className="mr-2" />
              插入 PS 模板
            </button>
          </div>
        )}
      </div>

      <EditorFooter charCount={charCount} wordCount={wordCount} />
      <FloatingAIButtons />
    </div>
  );
};

export default EditorWorkspace;
