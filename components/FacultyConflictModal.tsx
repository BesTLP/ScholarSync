import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { FacultyMember, FacultyRecord } from '../types';

interface Conflict {
  newItem: { faculty: FacultyMember, country: string, fieldCategory: string };
  existingItem: FacultyRecord;
  changes: { field: string, old: any, new: any }[];
}

interface FacultyConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (itemsToImport: { faculty: FacultyMember, country: string, fieldCategory: string }[]) => void;
  conflicts: Conflict[];
  allItems: { faculty: FacultyMember, country: string, fieldCategory: string }[];
}

const FacultyConflictModal: React.FC<FacultyConflictModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  conflicts,
  allItems
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">发现重复导师</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-8">
          <p className="text-sm text-gray-500 mb-6">以下导师已存在于本地库中。覆盖将更新以下字段：</p>
          <div className="space-y-4">
            {conflicts.map((conflict, index) => (
              <div key={index} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 mb-2">{conflict.newItem.faculty.name} ({conflict.newItem.faculty.university})</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {conflict.changes.map((change, cIndex) => (
                    <li key={cIndex}>
                      <span className="font-medium text-gray-900">{change.field}:</span> {change.old} → <span className="text-amber-600 font-medium">{change.new}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="px-8 py-6 border-t border-gray-100 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">取消</button>
          <button 
            onClick={() => {
              onConfirm(allItems);
              onClose();
            }} 
            className="px-6 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 active:scale-95"
          >
            覆盖并导入
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacultyConflictModal;
