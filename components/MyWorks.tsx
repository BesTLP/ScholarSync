import React from 'react';
import { FileText, Plus, ChevronRight, Clock, User } from 'lucide-react';
import { Client } from '../types';

interface MyWorksProps {
  clients: Client[];
  onCreateNew: () => void;
}

const MyWorks: React.FC<MyWorksProps> = ({ clients, onCreateNew }) => {
  const allDocuments = clients.flatMap(client => 
    (client.documents || []).map(doc => ({
      ...doc,
      studentName: client.name,
      studentId: client.id
    }))
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-xs font-medium mb-8">
        <span className="text-gray-400">EduPro</span>
        <ChevronRight size={12} className="text-gray-300" />
        <button className="text-cyan-600 hover:text-cyan-700 transition-colors">我的作品</button>
      </nav>

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">我的作品</h2>
          <button 
            onClick={onCreateNew}
            className="flex items-center px-4 py-2 bg-cyan-500 text-white rounded-xl text-sm font-bold hover:bg-cyan-600 transition-all shadow-lg shadow-cyan-100"
          >
            <Plus size={18} className="mr-2" />
            新建文档
          </button>
        </div>

        {allDocuments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allDocuments.map((doc) => (
              <div key={doc.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:bg-cyan-50 group-hover:text-cyan-500 transition-colors">
                    <FileText size={24} />
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {doc.type}
                  </div>
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 line-clamp-1">{doc.title}</h4>
                <p className="text-xs text-gray-500 line-clamp-3 mb-4 leading-relaxed">
                  {doc.content}
                </p>
                <div className="space-y-3 pt-4 border-t border-gray-50">
                  <div className="flex items-center text-[10px] text-gray-400">
                    <User size={12} className="mr-1.5" />
                    学生: <span className="text-gray-600 font-bold ml-1">{doc.studentName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-[10px] text-gray-400">
                      <Clock size={12} className="mr-1.5" />
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </div>
                    <button className="text-xs font-bold text-cyan-600 hover:text-cyan-700 transition-colors">
                      查看详情
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State Card */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[500px] flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-8">
              <FileText size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">暂无文档</h3>
            <p className="text-sm text-gray-400 mb-10 max-w-xs leading-relaxed">
              这里还没有创建任何文档。开始创建您的第一个文档吧！
            </p>
            <button 
              onClick={onCreateNew}
              className="flex items-center px-8 py-3.5 bg-cyan-500 text-white rounded-xl text-sm font-bold hover:bg-cyan-600 transition-all shadow-xl shadow-cyan-100 active:scale-95"
            >
              <Plus size={20} className="mr-2" />
              新建文档
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyWorks;
