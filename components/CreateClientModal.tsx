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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">创建客户</h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Nickname Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">昵称</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="输入客户昵称，仅自己可见"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Smart Archive Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">智能建档？</span>
              <button 
                onClick={() => setSmartArchive(!smartArchive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${smartArchive ? 'bg-cyan-500' : 'bg-gray-200'}`}
              >
                <span 
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${smartArchive ? 'translate-x-6' : 'translate-x-1'}`} 
                />
              </button>
            </div>
            
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 mb-1">AI 智能建档</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                上传客户信息收集表格，自动识别内容完成学生档案建立，免手输操作
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
                border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden
                ${smartArchive ? 'border-cyan-200 bg-cyan-50/30' : 'border-gray-200 bg-gray-50/30 opacity-50 pointer-events-none'}
                ${smartArchive && !isUploading && !parsedData ? 'hover:border-cyan-400 hover:bg-cyan-50/50' : ''}
              `}
            >
              {isUploading ? (
                <div className="flex flex-col items-center animate-pulse">
                  <Loader2 size={32} className="text-cyan-500 animate-spin mb-3" />
                  <p className="text-sm font-medium text-cyan-600">正在分析文档...</p>
                </div>
              ) : parsedData ? (
                <div className="flex flex-col items-center">
                  <div className="bg-green-100 text-green-600 p-3 rounded-full mb-3">
                    <CheckCircle size={32} />
                  </div>
                  <p className="text-sm font-bold text-green-700">解析成功！</p>
                  <p className="text-xs text-green-600 mt-1">已自动填充信息</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setParsedData(null);
                      setNickname('');
                    }}
                    className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    重新上传
                  </button>
                </div>
              ) : (
                <>
                  <div className={`p-3 rounded-xl mb-4 transition-colors ${smartArchive ? 'bg-cyan-100 text-cyan-600' : 'bg-gray-100 text-gray-400'}`}>
                    <FileUp size={28} />
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-1">拖拽文档到这里</p>
                  <p className="text-xs text-gray-500 mb-4">或点击选择文件</p>
                  <p className="text-[10px] text-gray-400 font-medium">
                    支持格式：pdf, docx, doc, txt, png, jpg, jpeg, webp
                  </p>
                  {uploadError && (
                    <p className="text-xs text-red-500 mt-2 font-medium">{uploadError}</p>
                  )}
                </>
              )}
            </div>
            {!smartArchive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="bg-white/80 px-3 py-1 rounded-full text-[10px] font-bold text-gray-400 border border-gray-100 shadow-sm">
                  开启智能建档以使用上传
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button 
            onClick={handleConfirm}
            disabled={isUploading || !nickname.trim()}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95
              ${isUploading || !nickname.trim() 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                : 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-cyan-100'}
            `}
          >
            {isUploading ? '处理中...' : '确认创建'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateClientModal;
