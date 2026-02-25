import React, { useState } from 'react';
import { X, Search, Loader2, Plus, Check } from 'lucide-react';
import { FacultyMember } from '../types';
import { searchFacultyByWeb } from '../services/geminiService';
import FacultyCard from './FacultyCard';

interface FacultySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (faculty: FacultyMember[]) => void;
}

const FacultySearchModal: React.FC<FacultySearchModalProps> = ({ isOpen, onClose, onImport }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<FacultyMember[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setResults([]);
    setSelectedIndices([]);
    try {
      const data = await searchFacultyByWeb(query);
      setResults(data);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelection = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleImport = () => {
    const selectedFaculty = selectedIndices.map(i => results[i]);
    onImport(selectedFaculty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Search size={20} className="mr-2 text-cyan-500" />
            联网搜索导入导师
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入导师姓名、学校或研究方向 (例如: 'Stanford CS Professors in AI')"
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="px-6 py-3 bg-cyan-500 text-white rounded-xl text-sm font-bold hover:bg-cyan-600 transition-all shadow-lg shadow-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSearching ? <Loader2 size={18} className="animate-spin mr-2" /> : <Search size={18} className="mr-2" />}
              {isSearching ? '搜索中...' : '搜索'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            * 使用 Google Search Grounding 技术，实时检索全网最新导师信息
          </p>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {isSearching ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Loader2 size={40} className="animate-spin mb-4 text-cyan-500" />
              <p className="text-sm">正在全网检索导师信息，请稍候...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {results.map((faculty, index) => (
                <div 
                  key={index} 
                  className={`relative group cursor-pointer transition-all ${selectedIndices.includes(index) ? 'ring-2 ring-cyan-500 rounded-2xl' : ''}`}
                  onClick={() => toggleSelection(index)}
                >
                  <FacultyCard faculty={faculty} viewMode="grid" showActions={false} />
                  <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedIndices.includes(index) ? 'bg-cyan-500 border-cyan-500 text-white' : 'bg-white border-gray-200 text-transparent group-hover:border-cyan-300'
                  }`}>
                    <Check size={14} strokeWidth={3} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Search size={48} className="mb-4 opacity-20" />
              <p className="text-sm">输入关键词开始搜索</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            已选择 <span className="font-bold text-cyan-600">{selectedIndices.length}</span> 位导师
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-50 rounded-xl transition-colors"
            >
              取消
            </button>
            <button 
              onClick={handleImport}
              disabled={selectedIndices.length === 0}
              className="px-6 py-2.5 bg-cyan-500 text-white rounded-xl text-sm font-bold hover:bg-cyan-600 transition-all shadow-lg shadow-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
