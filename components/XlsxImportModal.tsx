import React, { useState, useRef } from 'react';
import { X, Upload, FileCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { importFacultyFromXlsx } from '../services/facultyImportService';
import { FacultyImportSummary, FacultyRecord } from '../types';

interface XlsxImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: FacultyRecord[]) => void;
}

const XlsxImportModal: React.FC<XlsxImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<FacultyImportSummary | null>(null);
  const [data, setData] = useState<FacultyRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError('请选择有效的 Excel 文件 (.xlsx 或 .xls)');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);
    setData([]);
    setIsParsing(true);

    try {
      const { records, summary } = await importFacultyFromXlsx(selectedFile);
      setResult(summary);
      setData(records);
    } catch (err) {
      console.error('XLSX Parse Error:', err);
      setError(err instanceof Error ? err.message : '解析文件失败，请检查文件格式是否正确。');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = () => {
    if (data.length > 0) {
      onImport(data);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xl" onClick={onClose} />
      <div className="relative glass w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/50">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/50 bg-white/40 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">导入 Excel 导师数据</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-xl transition-all active:scale-95">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
            >
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="text-indigo-600" size={32} />
              </div>
              <p className="text-gray-600 font-medium">点击或拖拽 Excel 文件到此处</p>
              <p className="text-gray-400 text-sm mt-2">支持 .xlsx, .xls 格式</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".xlsx, .xls"
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-white/60 rounded-2xl border border-white/50">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <FileCheck className="text-green-600" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button 
                  onClick={() => { setFile(null); setResult(null); setError(null); }}
                  className="text-xs text-indigo-600 font-medium hover:underline"
                >
                  更换文件
                </button>
              </div>

              {isParsing && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="text-indigo-600 animate-spin mb-4" size={32} />
                  <p className="text-gray-600">正在解析文件，请稍候...</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-3 items-start">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                      <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-1">解析成功</p>
                      <p className="text-2xl font-bold text-indigo-900">{result.parsedRows}</p>
                    </div>
                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                      <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">跳过行数</p>
                      <p className="text-2xl font-bold text-emerald-900">{result.skippedRows}</p>
                    </div>
                    <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                      <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">失败行数</p>
                      <p className="text-2xl font-bold text-amber-900">{result.failedRows}</p>
                    </div>
                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider mb-1">总处理行</p>
                      <p className="text-2xl font-bold text-slate-900">{result.processedRows}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex gap-3 items-center">
                    <CheckCircle2 className="text-green-500 shrink-0" size={20} />
                    <p className="text-sm text-green-700">解析成功！点击下方按钮确认导入到数据库。</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-white/40 border-t border-white/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-white/60 transition-all active:scale-95"
          >
            取消
          </button>
          <button
            disabled={data.length === 0}
            onClick={handleConfirm}
            className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
          >
            确认导入
          </button>
        </div>
      </div>
    </div>
  );
};

export default XlsxImportModal;
