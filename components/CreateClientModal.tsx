import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileUp, Loader2, CheckCircle, Type, FileText, Sparkles, Image as ImageIcon } from 'lucide-react';
import { parseClientFile } from '../services/geminiService';
import { readFileForClientParsing } from '../services/clientFileParsing';
import { Client } from '../types';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (nickname: string, parsedData?: Partial<Client>) => void;
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [smartArchive, setSmartArchive] = useState(false);
  const [nickname, setNickname] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<Partial<Client> | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'image'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requiresSuccessfulParsing = smartArchive && (Boolean(selectedFile) || pastedText.trim().length > 0);

  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requiresSuccessfulParsing && !parsedData) {
      setUploadError('请先完成解析，再创建客户档案。');
      return;
    }

    if (nickname.trim()) {
      onConfirm(nickname.trim(), parsedData || undefined);
      setNickname('');
      setParsedData(null);
      setSmartArchive(false);
      setIsUploading(false);
      setUploadError(null);
      setPastedText('');
      setSelectedFile(null);
      onClose();
    }
  };

  const handleParseFile = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const parseInput = await readFileForClientParsing(selectedFile);
      const data = await parseClientFile(parseInput.data, parseInput.mimeType);
      setParsedData(data);
      if (data.name && !nickname) {
        setNickname(data.name);
      }
    } catch (e) {
      console.error(e);
      setUploadError(e instanceof Error ? e.message : '文件解析失败，请重试。');
    } finally {
      setIsUploading(false);
    }
  };

  const handleParseText = async () => {
    if (!pastedText.trim()) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const data = await parseClientFile(pastedText, 'text/plain');
      setParsedData(data);
      if (data.name && !nickname) {
        setNickname(data.name);
      }
    } catch (err) {
      console.error("Parsing failed", err);
      setUploadError("解析失败，请重试");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!smartArchive || (activeTab !== 'upload' && activeTab !== 'image')) return;
    
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setParsedData(null);
      setUploadError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!smartArchive) return;
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setParsedData(null);
      setUploadError(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-xl transition-opacity duration-500" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative glass w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/40">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">创建学生档案</h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white/50 rounded-full transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">
          {/* Nickname Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">档案名称 / 昵称</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="输入学生姓名或昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-gray-400 text-gray-900"
              />
            </div>
          </div>

          {/* Smart Archive Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                <span className="text-sm font-bold text-gray-900 tracking-tight">AI 智能建档</span>
              </div>
              <button 
                onClick={() => setSmartArchive(!smartArchive)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none shadow-inner ${smartArchive ? 'bg-blue-500' : 'bg-gray-300'}`}
              >
                <span 
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${smartArchive ? 'translate-x-6' : 'translate-x-1'}`} 
                />
              </button>
            </div>
          </div>

          {smartArchive && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              {/* Segmented Control */}
              <div className="flex p-1 bg-gray-100/50 backdrop-blur-sm rounded-2xl border border-gray-200/50">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <FileText size={14} /> 上传文件
                </button>
                <button
                  onClick={() => setActiveTab('image')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'image' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <ImageIcon size={14} /> 上传图片
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'paste' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Type size={14} /> 粘贴文本
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'upload' || activeTab === 'image' ? (
                <div className="space-y-4">
                  <div className="group relative">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept={activeTab === 'image' ? "image/*" : ".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"}
                    />
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden
                        ${selectedFile ? 'border-blue-400 bg-blue-50/40' : 'border-blue-200 bg-blue-50/20 hover:border-blue-400 hover:bg-blue-50/40'}
                      `}
                    >
                      {selectedFile ? (
                        <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
                          {previewUrl ? (
                            <div className="relative w-24 h-24 mb-3 rounded-2xl overflow-hidden shadow-sm border border-white/50">
                              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="p-4 rounded-2xl mb-3 transition-all shadow-sm bg-blue-500 text-white">
                              <FileText size={32} />
                            </div>
                          )}
                          <p className="text-sm font-bold text-gray-900 mb-1 tracking-tight truncate max-w-[200px]">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500 font-medium">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                              setParsedData(null);
                            }}
                            className="mt-4 text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest underline underline-offset-4 transition-colors"
                          >
                            移除文件
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="p-4 rounded-2xl mb-4 transition-all shadow-sm bg-blue-100/50 text-blue-600 group-hover:scale-110">
                            {activeTab === 'image' ? <ImageIcon size={32} /> : <FileUp size={32} />}
                          </div>
                          <p className="text-sm font-bold text-gray-900 mb-1 tracking-tight">
                            {activeTab === 'image' ? '拖拽图片到这里' : '拖拽文档到这里'}
                          </p>
                          <p className="text-xs text-gray-500 mb-6 font-medium">或点击选择文件</p>
                          <div className="flex flex-wrap justify-center gap-2 max-w-[240px]">
                            {activeTab === 'image' ? (
                              ['PNG', 'JPG', 'JPEG', 'WEBP'].map(ext => (
                                <span key={ext} className="px-2 py-1 bg-white/50 rounded-md text-[9px] font-bold text-gray-500 border border-gray-200/50">{ext}</span>
                              ))
                            ) : (
                              ['PDF', 'DOCX', 'TXT', 'IMG'].map(ext => (
                                <span key={ext} className="px-2 py-1 bg-white/50 rounded-md text-[9px] font-bold text-gray-500 border border-gray-200/50">{ext}</span>
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {selectedFile && !parsedData && (
                    <button
                      onClick={handleParseFile}
                      disabled={isUploading}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      {isUploading ? '解析中...' : 'AI 一键解析'}
                    </button>
                  )}
                  
                  {uploadError && (
                    <p className="text-xs text-red-500 text-center font-bold">{uploadError}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="在此粘贴学生的简历、背景信息或需求描述..."
                    className="w-full bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-gray-400 text-gray-900 resize-none h-32 custom-scrollbar"
                  />
                  <button
                    onClick={handleParseText}
                    disabled={isUploading || !pastedText.trim()}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isUploading ? '解析中...' : 'AI 一键解析'}
                  </button>
                  {uploadError && (
                    <p className="text-xs text-red-500 text-center font-bold">{uploadError}</p>
                  )}
                </div>
              )}

              {/* Preview Card */}
              {parsedData && (
                <div className="glass p-5 rounded-2xl border border-white/50 shadow-sm animate-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                      解析预览
                    </h4>
                    <div className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[10px] font-bold border border-emerald-100 flex items-center gap-1">
                      <CheckCircle size={10} /> 解析成功
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/40 p-3 rounded-xl border border-white/50">
                      <span className="text-[10px] text-gray-500 block mb-1 font-bold uppercase tracking-wider">姓名</span>
                      <span className="text-sm font-bold text-gray-900">{parsedData.name || '-'}</span>
                    </div>
                    <div className="bg-white/40 p-3 rounded-xl border border-white/50">
                      <span className="text-[10px] text-gray-500 block mb-1 font-bold uppercase tracking-wider">GPA</span>
                      <span className="text-sm font-bold text-gray-900">{parsedData.gpa || '-'}</span>
                    </div>
                    <div className="bg-white/40 p-3 rounded-xl border border-white/50">
                      <span className="text-[10px] text-gray-500 block mb-1 font-bold uppercase tracking-wider">目标国家</span>
                      <span className="text-sm font-bold text-gray-900 truncate block">{parsedData.targetCountries || '-'}</span>
                    </div>
                    <div className="bg-white/40 p-3 rounded-xl border border-white/50">
                      <span className="text-[10px] text-gray-500 block mb-1 font-bold uppercase tracking-wider">入学年份</span>
                      <span className="text-sm font-bold text-gray-900">{parsedData.entryYear || '-'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-white/40 backdrop-blur-md flex justify-end gap-3 border-t border-white/40">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-white/60 transition-all active:scale-95"
          >
            取消
          </button>
          <button 
            onClick={handleConfirm}
            disabled={isUploading || !nickname.trim() || (requiresSuccessfulParsing && !parsedData)}
            className={`px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-md active:scale-95
              ${isUploading || !nickname.trim() || (requiresSuccessfulParsing && !parsedData)
                ? 'bg-gray-200/50 text-gray-400 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20 hover:shadow-lg'}
            `}
          >
            {isUploading ? '处理中...' : '确认并创建'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateClientModal;
