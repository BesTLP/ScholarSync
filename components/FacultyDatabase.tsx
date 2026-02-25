import React, { useState, useMemo } from 'react';
import { FacultyRecord, FacultyMember, Client } from '../types';
import FacultyCard from './FacultyCard';
import FacultySearchModal from './FacultySearchModal';
import FacultyManualEntryModal from './FacultyManualEntryModal';
import { 
  Search, 
  Filter, 
  Plus, 
  Globe, 
  LayoutGrid, 
  List as ListIcon, 
  Download, 
  Trash2, 
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Database,
  UserPlus,
  X
} from 'lucide-react';

interface FacultyDatabaseProps {
  facultyDatabase: FacultyRecord[];
  clients: Client[];
  onAddFaculty: (faculty: FacultyMember, country: string, fieldCategory: string) => string;
  onUpdateFaculty: (id: string, updates: Partial<FacultyRecord>) => void;
  onDeleteFaculty: (id: string) => void;
  onLinkFaculty: (facultyId: string, clientId: string) => void;
  onUnlinkFaculty: (facultyId: string, clientId: string) => void;
}

const FacultyDatabase: React.FC<FacultyDatabaseProps> = ({
  facultyDatabase,
  clients,
  onAddFaculty,
  onUpdateFaculty,
  onDeleteFaculty,
  onLinkFaculty,
  onUnlinkFaculty
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('all');
  const [selectedField, setSelectedField] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
  const [linkingFacultyId, setLinkingFacultyId] = useState<string | null>(null);

  // Derived Data for Filters
  const countries = useMemo(() => Array.from(new Set(facultyDatabase.map(f => f.country))).filter(Boolean).sort(), [facultyDatabase]);
  const universities = useMemo(() => Array.from(new Set(facultyDatabase.map(f => f.university))).filter(Boolean).sort(), [facultyDatabase]);
  const fields = useMemo(() => Array.from(new Set(facultyDatabase.map(f => f.fieldCategory))).filter(Boolean).sort(), [facultyDatabase]);

  // Filtered Data
  const filteredFaculty = useMemo(() => {
    return facultyDatabase.filter(f => {
      const matchesSearch = 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.researchAreas.some(area => area.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCountry = selectedCountry === 'all' || f.country === selectedCountry;
      const matchesUniversity = selectedUniversity === 'all' || f.university === selectedUniversity;
      const matchesField = selectedField === 'all' || f.fieldCategory === selectedField;

      return matchesSearch && matchesCountry && matchesUniversity && matchesField;
    });
  }, [facultyDatabase, searchQuery, selectedCountry, selectedUniversity, selectedField]);

  // Selection Handlers
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleAllSelection = () => {
    if (selectedIds.size === filteredFaculty.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFaculty.map(f => f.id)));
    }
  };

  const handleBatchDelete = () => {
    if (window.confirm(`确定要删除选中的 ${selectedIds.size} 位导师吗？`)) {
      selectedIds.forEach(id => onDeleteFaculty(id));
      setSelectedIds(new Set());
    }
  };

  const handleImportFaculty = (imported: FacultyMember[]) => {
    imported.forEach(faculty => {
      onAddFaculty(faculty, "Unknown", "Unknown");
    });
    alert(`成功导入 ${imported.length} 位导师`);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left Sidebar: Statistics & Quick Filters */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Database size={20} className="text-blue-600" />
            导师库概览
          </h2>
          <p className="text-xs text-gray-500 mt-1">共收录 {facultyDatabase.length} 位导师</p>
        </div>

        <div className="p-4 space-y-6">
          {/* Country Stats */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">按国家/地区</h3>
            <div className="space-y-1">
              <button 
                onClick={() => setSelectedCountry('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selectedCountry === 'all' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <span>全部</span>
                <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-xs">{facultyDatabase.length}</span>
              </button>
              {countries.map(country => {
                const count = facultyDatabase.filter(f => f.country === country).length;
                return (
                  <button 
                    key={country}
                    onClick={() => setSelectedCountry(country)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selectedCountry === country ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span>{country}</span>
                    <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-xs">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field Stats */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">按学科领域</h3>
            <div className="space-y-1">
              <button 
                onClick={() => setSelectedField('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selectedField === 'all' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <span>全部</span>
                <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-xs">{facultyDatabase.length}</span>
              </button>
              {fields.map(field => {
                const count = facultyDatabase.filter(f => f.fieldCategory === field).length;
                return (
                  <button 
                    key={field}
                    onClick={() => setSelectedField(field)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selectedField === field ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span>{field}</span>
                    <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-xs">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-4 shadow-sm z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="搜索导师姓名、院校、研究方向..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
              
              {/* Filters Dropdown (Simplified for now) */}
              <div className="flex items-center gap-2">
                <select 
                  value={selectedUniversity} 
                  onChange={(e) => setSelectedUniversity(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">所有院校</option>
                  {universities.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsManualEntryModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm font-medium"
              >
                <Plus size={16} />
                手动录入
              </button>
              <button 
                onClick={() => setIsSearchModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md font-medium"
              >
                <Globe size={16} />
                联网搜索导入
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="font-medium text-gray-900">
                {filteredFaculty.length}
              </span> 
              个结果
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                  <span className="text-blue-600 font-medium">已选 {selectedIds.size} 项</span>
                  <button 
                    onClick={handleBatchDelete}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                    批量删除
                  </button>
                  <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded transition-colors">
                    <Download size={14} />
                    导出 CSV
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <ListIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {filteredFaculty.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Search size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-500">没有找到匹配的导师</p>
              <p className="text-sm">尝试调整搜索关键词或筛选条件</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {filteredFaculty.map(faculty => (
                    <div key={faculty.id} className="relative group">
                      {/* Selection Checkbox Overlay */}
                      <div className={`absolute top-4 left-4 z-30 transition-opacity ${selectedIds.has(faculty.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(faculty.id)}
                          onChange={() => toggleSelection(faculty.id)}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm"
                        />
                      </div>
                      <FacultyCard 
                        prof={faculty} 
                        isDatabaseView={true}
                        onEdit={(record) => console.log('Edit', record)}
                        onDelete={onDeleteFaculty}
                        onRefresh={(record) => console.log('Refresh', record)}
                        onLink={(prof) => setLinkingFacultyId(faculty.id)}
                        onUnlink={(id) => onUnlinkFaculty(faculty.id, id)}
                        linkedClientCount={faculty.linkedClientIds?.length || 0}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <th className="p-4 w-12 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.size === filteredFaculty.length && filteredFaculty.length > 0}
                            onChange={toggleAllSelection}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                        <th className="p-4">导师姓名</th>
                        <th className="p-4">院校 / 职级</th>
                        <th className="p-4">研究方向</th>
                        <th className="p-4">匹配度</th>
                        <th className="p-4">关联学生</th>
                        <th className="p-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredFaculty.map(faculty => (
                        <tr key={faculty.id} className={`hover:bg-blue-50/50 transition-colors ${selectedIds.has(faculty.id) ? 'bg-blue-50/30' : ''}`}>
                          <td className="p-4 text-center">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.has(faculty.id)}
                              onChange={() => toggleSelection(faculty.id)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm overflow-hidden">
                                {faculty.photoUrl ? (
                                  <img src={faculty.photoUrl} alt={faculty.name} className="w-full h-full object-cover" />
                                ) : (
                                  faculty.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">{faculty.name}</div>
                                <div className="text-xs text-gray-500">{faculty.country}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{faculty.university}</div>
                            <div className="text-xs text-gray-500">{faculty.title}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {faculty.researchAreas.slice(0, 2).map((area, i) => (
                                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs truncate max-w-[100px]">
                                  {area}
                                </span>
                              ))}
                              {faculty.researchAreas.length > 2 && (
                                <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded text-xs">
                                  +{faculty.researchAreas.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              faculty.matchScore >= 90 ? 'bg-emerald-100 text-emerald-700' :
                              faculty.matchScore >= 80 ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {faculty.matchScore}%
                            </span>
                          </td>
                          <td className="p-4">
                            {faculty.linkedClientIds && faculty.linkedClientIds.length > 0 ? (
                              <div className="flex -space-x-2">
                                {faculty.linkedClientIds.slice(0, 3).map(cid => {
                                  const client = clients.find(c => c.id === cid);
                                  return (
                                    <div key={cid} className="w-8 h-8 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-gray-600 bg-gray-100" title={client?.name}>
                                      {client?.name.charAt(0)}
                                    </div>
                                  );
                                })}
                                {faculty.linkedClientIds.length > 3 && (
                                  <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-500">
                                    +{faculty.linkedClientIds.length - 3}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setLinkingFacultyId(faculty.id)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="关联学生"
                              >
                                <UserPlus size={16} />
                              </button>
                              <button 
                                onClick={() => onDeleteFaculty(faculty.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="删除"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <FacultySearchModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
        onImport={handleImportFaculty} 
      />

      <FacultyManualEntryModal
        isOpen={isManualEntryModalOpen}
        onClose={() => setIsManualEntryModalOpen(false)}
        onSave={(faculty, country, fieldCategory) => {
          onAddFaculty(faculty, country, fieldCategory);
          setIsManualEntryModalOpen(false);
        }}
      />

      {/* Client Selection Modal for Linking */}
      {linkingFacultyId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">选择要关联的学生</h3>
              <button onClick={() => setLinkingFacultyId(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {clients.length === 0 ? (
                <p className="text-center text-gray-500 py-8">暂无学生档案</p>
              ) : (
                clients.map(client => {
                  const isLinked = facultyDatabase.find(f => f.id === linkingFacultyId)?.linkedClientIds?.includes(client.id);
                  return (
                    <button
                      key={client.id}
                      onClick={() => {
                        if (isLinked) {
                          onUnlinkFaculty(linkingFacultyId, client.id);
                        } else {
                          onLinkFaculty(linkingFacultyId, client.id);
                        }
                        setLinkingFacultyId(null);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        isLinked 
                          ? 'border-blue-200 bg-blue-50 text-blue-700' 
                          : 'border-gray-100 bg-gray-50 hover:border-blue-200 hover:bg-blue-50/50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-xs">
                          {client.name.charAt(0)}
                        </div>
                        <span className="font-medium">{client.name}</span>
                      </div>
                      {isLinked ? (
                        <span className="text-xs font-bold bg-blue-100 px-2 py-1 rounded text-blue-600">已关联</span>
                      ) : (
                        <Plus size={16} className="text-gray-400" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setLinkingFacultyId(null)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDatabase;
