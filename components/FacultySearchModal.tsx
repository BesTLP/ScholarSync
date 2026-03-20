import React, { useState } from 'react';
import { X, Search, Loader2, Plus, Check, AlertCircle } from 'lucide-react';
import { FacultyMember } from '../types';
import { describeWebSearchError, isAnyWebSearchProviderConfigured, searchFacultyByWeb } from '../services/geminiService';
import FacultyCard from './FacultyCard';

interface FacultySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (faculty: FacultyMember[]) => void;
}

type SearchFeedback = {
  tone: 'error' | 'info';
  message: string;
};

const FacultySearchModal: React.FC<FacultySearchModalProps> = ({ isOpen, onClose, onImport }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<FacultyMember[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [feedback, setFeedback] = useState<SearchFeedback | null>(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setResults([]);
    setSelectedIndices([]);
    setHasSearched(false);
    setFeedback(null);

    if (!isAnyWebSearchProviderConfigured()) {
      setHasSearched(true);
      setFeedback({
        tone: 'error',
        message: describeWebSearchError(new Error('No web search provider configured.')),
      });
      return;
    }

    setIsSearching(true);
    try {
      const data = await searchFacultyByWeb(trimmedQuery);
      setResults(data);
      setHasSearched(true);

      if (data.length === 0) {
        setFeedback({
          tone: 'info',
          message: '本次搜索已完成，但没有找到可导入的导师。建议补充学校、院系或研究方向关键词。',
        });
      }
    } catch (error) {
      console.error('Search failed', error);
      setHasSearched(true);
      setFeedback({
        tone: 'error',
        message: describeWebSearchError(error),
      });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelection = (index: number) => {
    setSelectedIndices((prev) => (prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]));
  };

  const handleImport = () => {
    const selectedFaculty = selectedIndices.map((index) => results[index]);
    onImport(selectedFaculty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xl" onClick={onClose} />
      <div className="relative glass flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/50 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-white/50 bg-white/40 px-6 py-4 backdrop-blur-sm">
          <h3 className="flex items-center text-lg font-bold tracking-tight text-gray-900">
            <Search size={20} className="mr-2 text-blue-600" />
            联网搜索导入导师
          </h3>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition-all hover:bg-white/60 hover:text-gray-600 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-white/50 bg-white/30 p-6 backdrop-blur-sm">
          <div className="flex space-x-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                placeholder="输入导师姓名、学校或研究方向"
                className="w-full rounded-2xl border border-white/50 bg-white/60 py-3 pl-10 pr-4 text-sm font-medium shadow-sm transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500/30"
              />
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="flex items-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            >
              {isSearching ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Search size={18} className="mr-2" />}
              {isSearching ? '搜索中...' : '搜索'}
            </button>
          </div>
          <p className="mt-2 text-xs font-medium text-gray-500">
            * 使用联网搜索实时拉取导师主页、官方邮箱和近期学术活动
          </p>
          {feedback && (
            <div
              className={`mt-3 flex items-start gap-2 rounded-2xl border px-4 py-3 text-xs font-medium ${
                feedback.tone === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto bg-transparent p-6">
          {isSearching ? (
            <div className="flex h-full flex-col items-center justify-center text-gray-400">
              <Loader2 size={40} className="mb-4 animate-spin text-blue-600" />
              <p className="text-sm font-medium">正在全网搜索导师信息，请稍候...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {results.map((faculty, index) => (
                <div
                  key={index}
                  className={`relative cursor-pointer transition-all ${selectedIndices.includes(index) ? 'rounded-[40px] ring-2 ring-blue-500 shadow-lg shadow-blue-500/10' : 'group'}`}
                  onClick={() => toggleSelection(index)}
                >
                  <FacultyCard prof={faculty} isDatabaseView={false} />
                  <div
                    className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm transition-colors ${
                      selectedIndices.includes(index)
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-200 bg-white/80 text-transparent backdrop-blur-sm group-hover:border-blue-300'
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>
                </div>
              ))}
            </div>
          ) : hasSearched ? (
            <div className={`flex h-full flex-col items-center justify-center ${feedback?.tone === 'error' ? 'text-rose-400' : 'text-gray-400'}`}>
              {feedback?.tone === 'error' ? <AlertCircle size={48} className="mb-4 opacity-70" /> : <Search size={48} className="mb-4 opacity-20" />}
              <p className="max-w-md text-center text-sm font-medium leading-6">
                {feedback?.message || '本次搜索未返回可导入结果。'}
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-gray-400">
              <Search size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">输入关键词开始搜索</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/50 bg-white/40 px-6 py-4 backdrop-blur-sm">
          <div className="text-sm font-medium text-gray-500">
            已选择 <span className="font-bold text-blue-600">{selectedIndices.length}</span> 位导师
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="rounded-xl px-6 py-2.5 text-sm font-bold text-gray-600 transition-all hover:bg-white/60 active:scale-95"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={selectedIndices.length === 0}
              className="flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            >
              <Plus size={18} className="mr-2" />
              导入选中导师
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultySearchModal;
