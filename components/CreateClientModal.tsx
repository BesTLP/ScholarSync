import React, { useState, useRef } from 'react';
import { X, Upload, FileUp, Loader2, CheckCircle } from 'lucide-react';
import { parseClientFile } from '../services/geminiService';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (nickname.trim()) {
      onConfirm(nickname.trim(), parsedData || undefined);
      setNickname('');
      setParsedData(null);
      setSmartArchive(false);
      setIsUploading(false);
      setUploadError(null);
      onClose();
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        if (result) {
          try {
            const data = await parseClientFile(result, file.type);
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
        }
      };
      reader.onerror = () => {
        setUploadError("读取文件失败");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      setUploadError("上传出错");
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!smartArchive) return;
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!smartArchive) return;
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-md transition-opacity duration-500" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white/90 backdrop-blur-2xl w-full max-w-lg rounded-[40px] shadow-2xl shadow-black/10 overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100/50">
          <h3 className="text-xl font-black text-gray-900 tracking-tight">创建学生档案</h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100/50 rounded-full transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">
          {/* Nickname Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">档案名称 / 昵称</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="输入学生姓名或昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-gray-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-300 text-gray-900"
              />
            </div>
          </div>

          {/* Smart Archive Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm font-black text-gray-900 tracking-tight">AI 智能建档</span>
              </div>
              <button 
                onClick={() => setSmartArchive(!smartArchive)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none shadow-inner ${smartArchive ? 'bg-blue-500' : 'bg-gray-200'}`}
              >
                <span 
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${smartArchive ? 'translate-x-6' : 'translate-x-1'}`} 
                />
              </button>
            </div>
            
            <div className="bg-blue-50/50 backdrop-blur-sm p-5 rounded-2xl border border-blue-100/50">
              <p className="text-xs text-blue-800 leading-relaxed font-bold">
                上传学生简历或信息表，AI 将自动识别并填充所有字段，为您节省手动输入时间。
              </p>
            </div>
          </div>

          {/* Dropzone */}
          <div className="group relative">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
            />
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => smartArchive && fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-[32px] p-10 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden
                ${smartArchive ? 'border-blue-200 bg-blue-50/20' : 'border-gray-200 bg-gray-50/30 opacity-50 pointer-events-none'}
                ${smartArchive && !isUploading && !parsedData ? 'hover:border-blue-400 hover:bg-blue-50/40' : ''}
              `}
            >
              {isUploading ? (
                <div className="flex flex-col items-center animate-pulse">
                  <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
                  <p className="text-sm font-black text-blue-600 uppercase tracking-widest">正在深度解析...</p>
                </div>
              ) : parsedData ? (
                <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
                  <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg shadow-emerald-100 mb-4">
                    <CheckCircle size={32} />
                  </div>
                  <p className="text-sm font-black text-emerald-700">解析成功！</p>
                  <p className="text-xs text-emerald-600 mt-1 font-bold">已自动提取关键信息</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setParsedData(null);
                      setNickname('');
                    }}
                    className="mt-6 text-[10px] font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest underline underline-offset-4"
                  >
                    重新上传
                  </button>
                </div>
              ) : (
                <>
                  <div className={`p-4 rounded-2xl mb-4 transition-all shadow-sm ${smartArchive ? 'bg-blue-100 text-blue-600 group-hover:scale-110' : 'bg-gray-100 text-gray-400'}`}>
                    <FileUp size={32} />
                  </div>
                  <p className="text-sm font-black text-gray-900 mb-1 tracking-tight">拖拽文档到这里</p>
                  <p className="text-xs text-gray-400 mb-6 font-bold">或点击选择文件</p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-[240px]">
                    {['PDF', 'DOCX', 'TXT', 'IMG'].map(ext => (
                      <span key={ext} className="px-2 py-1 bg-white/50 rounded-md text-[9px] font-black text-gray-400 border border-gray-100">{ext}</span>
                    ))}
                  </div>
                  {uploadError && (
                    <p className="text-xs text-red-500 mt-4 font-black bg-red-50 px-4 py-2 rounded-full border border-red-100">{uploadError}</p>
                  )}
                </>
              )}
            </div>
            {!smartArchive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black text-gray-400 border border-gray-100 shadow-xl">
                  开启智能建档以解锁上传功能
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50/50 backdrop-blur-md flex justify-end gap-3 border-t border-gray-100/50">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-2xl text-sm font-black text-gray-500 hover:bg-gray-100 transition-all active:scale-95"
          >
            取消
          </button>
          <button 
            onClick={handleConfirm}
            disabled={isUploading || !nickname.trim()}
            className={`px-8 py-3 rounded-2xl text-sm font-black transition-all shadow-xl active:scale-95
              ${isUploading || !nickname.trim() 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-200'}
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
