import React from 'react';
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
  MessageCircle
} from 'lucide-react';

export const TopToolbar: React.FC<{ onSave?: () => void; saveSuccess?: boolean }> = ({ onSave, saveSuccess }) => {
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
        <button className="flex items-center px-2 py-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all" title="导出">
          <Download size={18} />
          <ChevronDown size={12} className="ml-1" />
        </button>
        <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all" title="复制">
          <Copy size={18} />
        </button>
        <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all" title="粘贴">
          <Clipboard size={18} />
        </button>
        <div className="w-px h-4 bg-gray-100 mx-1" />
        <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all" title="撤销">
          <Undo2 size={18} />
        </button>
        <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all" title="重做">
          <Redo2 size={18} />
        </button>
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

export const RichTextCanvas: React.FC<{ value?: string; onChange?: (val: string) => void }> = ({ value, onChange }) => {
  return (
    <div className="flex-1 bg-white overflow-y-auto p-12 flex justify-center custom-scrollbar">
      <div className="w-full max-w-3xl min-h-full">
        <textarea 
          placeholder='开始写作或输入 "/" 来使用命令...'
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full h-full border-none focus:ring-0 text-lg text-gray-800 placeholder:text-gray-200 resize-none leading-relaxed font-sans"
        />
      </div>
    </div>
  );
};

export const EditorFooter: React.FC = () => {
  return (
    <div className="h-10 border-t border-gray-100 bg-white flex items-center justify-between px-6 shrink-0">
      <div className="text-[10px] font-medium text-gray-400 tracking-wider">
        单词: 0 | 字数: 0
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
}

const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({ value, onChange, onSave, saveSuccess }) => {
  return (
    <div className="flex-1 flex flex-col min-w-0 relative h-full">
      <TopToolbar onSave={onSave} saveSuccess={saveSuccess} />
      <RichTextCanvas value={value} onChange={onChange} />
      <EditorFooter />
      <FloatingAIButtons />
    </div>
  );
};

export default EditorWorkspace;
