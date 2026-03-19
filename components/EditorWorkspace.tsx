import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Clipboard,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  MessageCircle,
  Minus,
  Plus,
  Redo2,
  Save,
  Sparkles,
  Star,
  Undo2,
  Wand2,
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
    <div className="mac-toolbar flex h-14 shrink-0 items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
            saveSuccess ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-transparent text-blue-600 hover:border-blue-100 hover:bg-blue-50'
          }`}
          title="保存"
        >
          {saveSuccess ? <Sparkles size={18} /> : <Save size={18} />}
          <span>{saveSuccess ? '已保存' : '保存'}</span>
        </button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        <button
          onClick={onExport}
          className="inline-flex items-center rounded-xl px-3 py-2 text-slate-500 transition-all hover:bg-white hover:text-slate-900"
          title="导出"
        >
          <Download size={18} />
          <ChevronDown size={12} className="ml-1" />
        </button>
        <button onClick={onCopy} className="rounded-xl p-2 text-slate-500 transition-all hover:bg-white hover:text-slate-900" title="复制">
          <Copy size={18} />
        </button>
        <button className="rounded-xl p-2 text-slate-500 transition-all hover:bg-white hover:text-slate-900" title="剪贴板">
          <Clipboard size={18} />
        </button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-xl p-2 text-slate-500 transition-all hover:bg-white hover:text-slate-900 disabled:opacity-30"
          title="撤销"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="rounded-xl p-2 text-slate-500 transition-all hover:bg-white hover:text-slate-900 disabled:opacity-30"
          title="重做"
        >
          <Redo2 size={18} />
        </button>

        {showPreviewToggle && (
          <>
            <div className="mx-1 h-5 w-px bg-slate-200" />
            <button
              onClick={onTogglePreview}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                isPreview ? 'border-indigo-100 bg-indigo-50 text-indigo-600' : 'border-transparent text-slate-500 hover:bg-white hover:text-slate-900'
              }`}
              title="预览模式"
            >
              {isPreview ? <Eye size={18} /> : <EyeOff size={18} />}
              <span>{isPreview ? '预览模式' : '编辑模式'}</span>
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold text-indigo-600 transition-all hover:bg-indigo-100">
          <span className="mr-1.5">{"{}"}</span>
          AI 检测
        </button>
        <button className="inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-4 py-1.5 text-xs font-bold text-violet-600 transition-all hover:bg-violet-100">
          <Sparkles size={14} className="mr-1.5" />
          AI 润色
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

    const html = text
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-gray-900">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 text-gray-900 border-b border-gray-100 pb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4 text-gray-900">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-gray-700 mb-1">$1</li>')
      .replace(/\n/gim, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: html }} className="prose prose-sm max-w-none" />;
  };

  return (
    <div className="flex flex-1 justify-center overflow-y-auto bg-white/35 p-10 custom-scrollbar">
      <div className="w-full max-w-3xl min-h-full rounded-[30px] border border-white/70 bg-white/76 px-10 py-12 shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
        {isPreview ? (
          <div className="h-full w-full text-lg leading-relaxed text-gray-800 font-sans">{renderMarkdown(value || '')}</div>
        ) : (
          <textarea
            ref={textareaRef}
            placeholder='开始写作，或输入 "/" 调出命令菜单...'
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={onKeyDown}
            className="h-full w-full resize-none border-none bg-transparent text-lg leading-relaxed text-gray-800 placeholder:text-gray-300 focus:ring-0 font-sans"
          />
        )}
      </div>
    </div>
  );
};

export const EditorFooter: React.FC<{ charCount: number; wordCount: number }> = ({ charCount, wordCount }) => {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-t border-gray-100 bg-white/75 px-6">
      <div className="text-[10px] font-medium tracking-wider text-gray-400">单词: {wordCount} | 字数: {charCount}</div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3 text-gray-400">
          <Minus size={14} className="cursor-pointer hover:text-gray-600" />
          <span className="w-8 text-center text-[10px] font-bold">100%</span>
          <Plus size={14} className="cursor-pointer hover:text-gray-600" />
        </div>
      </div>
    </div>
  );
};

export const FloatingAIButtons: React.FC = () => {
  return (
    <div className="absolute bottom-8 right-8 flex items-center gap-3">
      <button className="flex h-11 items-center gap-2 rounded-full bg-slate-900 px-4 text-xs font-bold text-white shadow-xl transition-transform hover:-translate-y-0.5">
        <Star size={16} />
        智能优化
      </button>
      <button className="flex h-11 items-center gap-2 rounded-full bg-emerald-500 px-4 text-xs font-bold text-white shadow-xl transition-transform hover:-translate-y-0.5">
        <MessageCircle size={16} />
        继续对话
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

  useEffect(() => {
    if (value !== history[historyIndex]) {
      return;
    }
  }, [value, history, historyIndex]);

  const handleContentChange = (newContent: string) => {
    onChange?.(newContent);

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setShowSlashMenu(newContent.endsWith('/'));
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
    window.alert('内容已复制到剪贴板。');
  };

  const charCount = (value || '').replace(/\s/g, '').length;
  const wordCount = (value || '').split(/\s+/).filter(Boolean).length;

  const insertTemplate = (text: string) => {
    const newContent = `${value || ''}${text}`;
    handleContentChange(newContent);
    setShowSlashMenu(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative flex h-full min-w-0 flex-1 flex-col">
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

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <RichTextCanvas value={value} onChange={handleContentChange} textareaRef={textareaRef} isPreview={isPreview} />

        {showSlashMenu && !isPreview && (
          <div className="mac-panel absolute bottom-12 left-12 z-50 w-72 rounded-[24px] p-3">
            <div className="mac-section-title px-3 py-2">AI 助手</div>
            <button
              onClick={() => insertTemplate('\n\n[AI 继续写作内容...]')}
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-violet-50 hover:text-violet-600"
            >
              <Wand2 size={16} className="mr-2" />
              AI 继续写作
            </button>
            <button
              onClick={() => insertTemplate('\n\n[AI 润色内容...]')}
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-violet-50 hover:text-violet-600"
            >
              <Sparkles size={16} className="mr-2" />
              AI 润色当前段落
            </button>
            <div className="my-2 h-px bg-slate-100" />
            <div className="mac-section-title px-3 py-2">模板</div>
            <button
              onClick={() => insertTemplate('\n\n# 个人陈述大纲\n1. 开场与动机\n2. 学术背景\n3. 研究经历\n4. 职业目标\n5. 结尾')}
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-cyan-50 hover:text-cyan-600"
            >
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
