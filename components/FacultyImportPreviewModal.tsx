import React, { useState } from 'react';
import { X, Check, Trash2, AlertCircle } from 'lucide-react';
import { FacultyMember, FacultyRecord } from '../types';

interface FacultyImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: FacultyRecord[]) => void;
  data: FacultyRecord[];
  facultyDatabase: FacultyRecord[];
}

const FacultyImportPreviewModal: React.FC<FacultyImportPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  data: initialData,
  facultyDatabase
}) => {
  const [items, setItems] = useState<FacultyRecord[]>(initialData);

  // Update items when initialData changes (if modal is reused)
  React.useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  if (!isOpen) return null;

  const handleDelete = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">导入预览</h2>
            <p className="text-sm text-gray-500 mt-1">请核对导入的导师信息，确保数据准确。</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <AlertCircle size={48} className="mb-4 opacity-20" />
              <p>暂无待导入数据</p>
            </div>
          ) : (
            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">姓名</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">院校</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">QS排名</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">职称</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">专业</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">截止日期</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">国家/地区</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">学科分类</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">邮箱</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider w-10">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={item.name} 
                          onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-gray-900"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={item.university} 
                          onChange={(e) => handleUpdate(index, 'university', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={item.qsRanking || ''} 
                          onChange={(e) => handleUpdate(index, 'qsRanking', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={item.title} 
                          onChange={(e) => handleUpdate(index, 'title', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={item.programName || item.department || ''} 
                          onChange={(e) => handleUpdate(index, 'programName', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={item.deadlineData?.value || ''} 
                          onChange={(e) => handleUpdate(index, 'deadlineData', { ...item.deadlineData, value: e.target.value })}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={item.country} 
                          onChange={(e) => handleUpdate(index, 'country', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={item.fieldCategory} 
                          onChange={(e) => handleUpdate(index, 'fieldCategory', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={item.email} 
                          onChange={(e) => handleUpdate(index, 'email', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => handleDelete(index)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <p className="text-sm text-gray-500">
            共计 <span className="font-bold text-blue-600">{items.length}</span> 位导师
          </p>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-all"
            >
              取消
            </button>
            <button 
              onClick={() => { onConfirm(items); onClose(); }}
              disabled={items.length === 0}
              className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none active:scale-95"
            >
              <Check size={18} />
              确认导入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyImportPreviewModal;
