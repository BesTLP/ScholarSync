import React, { useState, useMemo, useRef } from 'react';
import { FacultyRecord, FacultyMember, Client } from '../types';
import FacultyCard from './FacultyCard';
import FacultySearchModal from './FacultySearchModal';
import FacultyManualEntryModal from './FacultyManualEntryModal';
import BatchClassifyModal from './BatchClassifyModal';
import FacultyImportPreviewModal from './FacultyImportPreviewModal';
import FacultyConflictModal from './FacultyConflictModal';
import XlsxImportModal from './XlsxImportModal';
import CustomExportModal from './CustomExportModal';
import { importFacultyFromXlsx } from '../services/facultyImportService';
import { refreshFacultyData, processImportedFacultyBatch, processImportedFacultyRow } from '../services/geminiService';
import * as XLSX from 'xlsx';
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
  X,
  RefreshCw,
  Loader2,
  Upload
} from 'lucide-react';

interface FacultyDatabaseProps {
  facultyDatabase: FacultyRecord[];
  clients: Client[];
  onAddFaculty: (faculty: FacultyMember, manualCountry?: string, manualField?: string, extra?: Partial<FacultyRecord>) => string;
  onBatchAddFaculty?: (items: FacultyRecord[]) => void;
  onImportFacultyRecords?: (records: FacultyRecord[]) => { createdFacultyCount: number, mergedFacultyCount: number, appendedProjectCount: number };
  onUpdateFaculty: (id: string, updates: Partial<FacultyRecord>) => void;
  onBatchUpdateFaculty?: (ids: string[], updates: Partial<FacultyRecord>) => void;
  onDeleteFaculty: (id: string) => void;
  onLinkFaculty: (clientId: string, facultyId: string) => void;
  onUnlinkFaculty: (clientId: string, facultyId: string) => void;
}

const FacultyDatabase: React.FC<FacultyDatabaseProps> = ({ 
  facultyDatabase, 
  clients, 
  onAddFaculty, 
  onBatchAddFaculty,
  onImportFacultyRecords,
  onUpdateFaculty, 
  onBatchUpdateFaculty,
  onDeleteFaculty,
  onLinkFaculty,
  onUnlinkFaculty
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedProvinceState, setSelectedProvinceState] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedField, setSelectedField] = useState<string>('all');
  const [selectedSubField, setSelectedSubField] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
  const [isXlsxImportModalOpen, setIsXlsxImportModalOpen] = useState(false);
  const [isBatchClassifyModalOpen, setIsBatchClassifyModalOpen] = useState(false);
  const [isCustomExportModalOpen, setIsCustomExportModalOpen] = useState(false);
  const [linkingFacultyId, setLinkingFacultyId] = useState<string | null>(null);
  const [editingFaculty, setEditingFaculty] = useState<FacultyRecord | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importPreviewData, setImportPreviewData] = useState<FacultyRecord[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Derived Data for Filters (Hierarchical)
  const countries = useMemo(() => Array.from(new Set(facultyDatabase.map(f => f.country))).filter(Boolean).sort(), [facultyDatabase]);
  
  const provinceStates = useMemo(() => {
    const relevant = selectedCountry === 'all' ? facultyDatabase : facultyDatabase.filter(f => f.country === selectedCountry);
    return Array.from(new Set(relevant.map(f => f.provinceState).filter(Boolean) as string[])).sort();
  }, [facultyDatabase, selectedCountry]);

  const cities = useMemo(() => {
    let relevant = facultyDatabase;
    if (selectedCountry !== 'all') relevant = relevant.filter(f => f.country === selectedCountry);
    if (selectedProvinceState !== 'all') relevant = relevant.filter(f => f.provinceState === selectedProvinceState);
    return Array.from(new Set(relevant.map(f => f.city).filter(Boolean) as string[])).sort();
  }, [facultyDatabase, selectedCountry, selectedProvinceState]);

  const universities = useMemo(() => {
    let relevant = facultyDatabase;
    if (selectedCountry !== 'all') relevant = relevant.filter(f => f.country === selectedCountry);
    if (selectedProvinceState !== 'all') relevant = relevant.filter(f => f.provinceState === selectedProvinceState);
    if (selectedCity !== 'all') relevant = relevant.filter(f => f.city === selectedCity);
    return Array.from(new Set(relevant.map(f => f.university))).filter(Boolean).sort();
  }, [facultyDatabase, selectedCountry, selectedProvinceState, selectedCity]);

  const schools = useMemo(() => {
    let relevant = facultyDatabase;
    if (selectedUniversity !== 'all') relevant = relevant.filter(f => f.university === selectedUniversity);
    return Array.from(new Set(relevant.map(f => f.school).filter(Boolean) as string[])).sort();
  }, [facultyDatabase, selectedUniversity]);

  const departments = useMemo(() => {
    let relevant = facultyDatabase;
    if (selectedUniversity !== 'all') relevant = relevant.filter(f => f.university === selectedUniversity);
    if (selectedSchool !== 'all') relevant = relevant.filter(f => f.school === selectedSchool);
    return Array.from(new Set(relevant.map(f => f.department))).filter(Boolean).sort();
  }, [facultyDatabase, selectedUniversity, selectedSchool]);

  const fields = useMemo(() => Array.from(new Set(facultyDatabase.map(f => f.fieldCategory))).filter(Boolean).sort(), [facultyDatabase]);
  const subFields = useMemo(() => {
    const relevant = selectedField === 'all' ? facultyDatabase : facultyDatabase.filter(f => f.fieldCategory === selectedField);
    return Array.from(new Set(relevant.map(f => f.subFieldCategory).filter(Boolean) as string[])).sort();
  }, [facultyDatabase, selectedField]);
  const allTags = useMemo(() => Array.from(new Set(facultyDatabase.flatMap(f => f.customTags || []))).filter(Boolean).sort(), [facultyDatabase]);

  // Filtered Data
  const filteredFaculty = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return facultyDatabase
      .filter(f => {
        // Strict filters
        if (selectedCountry !== 'all' && f.country !== selectedCountry) return false;
        if (selectedProvinceState !== 'all' && f.provinceState !== selectedProvinceState) return false;
        if (selectedCity !== 'all' && f.city !== selectedCity) return false;
        if (selectedUniversity !== 'all' && f.university !== selectedUniversity) return false;
        if (selectedSchool !== 'all' && f.school !== selectedSchool) return false;
        if (selectedDepartment !== 'all' && f.department !== selectedDepartment) return false;
        if (selectedField !== 'all' && f.fieldCategory !== selectedField) return false;
        if (selectedSubField !== 'all' && f.subFieldCategory !== selectedSubField) return false;
        if (selectedTag !== 'all' && !f.customTags?.includes(selectedTag)) return false;

        // Text search
        if (query) {
          const inName = f.name.toLowerCase().includes(query);
          const inUni = f.university.toLowerCase().includes(query);
          const inDept = f.department.toLowerCase().includes(query);
          const inField = f.fieldCategory.toLowerCase().includes(query);
          const inSubField = f.subFieldCategory?.toLowerCase().includes(query);
          const inResearch = f.researchAreas.some(area => area.toLowerCase().includes(query));
          
          if (!inName && !inUni && !inDept && !inField && !inSubField && !inResearch) {
            return false;
          }
        }

        return true;
      })
      .map(f => {
        let score = 100;
        
        if (query) {
          const inResearch = f.researchAreas.some(area => area.toLowerCase().includes(query));
          if (inResearch) score += 15;
        }

        return { 
          ...f, 
          localMatchScore: score,
          isFromDatabase: true,
          matchScore: score 
        };
      })
      .sort((a, b) => (b.localMatchScore || 0) - (a.localMatchScore || 0));
  }, [facultyDatabase, searchQuery, selectedCountry, selectedProvinceState, selectedUniversity, selectedDepartment, selectedField, selectedSubField, selectedTag]);

  // Selection Handlers
  const toggleSelection = (id: string) => {
    console.log('toggleSelection', id, selectedIds);
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

  const handleBatchDelete = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('handleBatchDelete triggered', Array.from(selectedIds));
    if (selectedIds.size === 0) {
      console.log('No items selected');
      return;
    }
    setIsBatchDeleteModalOpen(true);
  };

  const confirmBatchDelete = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    selectedIds.forEach(id => onDeleteFaculty(id));
    setSelectedIds(new Set());
    setIsBatchDeleteModalOpen(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: 0 });

    try {
      const { records, summary } = await importFacultyFromXlsx(file);
      
      if (records.length === 0) {
        setAlertMessage("未识别到有效的导师信息，请检查文件格式或尝试手动录入。");
        return;
      }

      setImportPreviewData(records);
      setIsImportPreviewOpen(true);
    } catch (error) {
      console.error("Error parsing file:", error);
      setAlertMessage(error instanceof Error ? error.message : "文件解析失败，请确保格式正确。");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = (items: FacultyRecord[]) => {
    if (onImportFacultyRecords) {
      const summary = onImportFacultyRecords(items);
      setAlertMessage(`导入完成！新增 ${summary.createdFacultyCount} 位导师，合并 ${summary.mergedFacultyCount} 位导师，追加 ${summary.appendedProjectCount} 个项目。`);
    } else if (onBatchAddFaculty) {
      onBatchAddFaculty(items);
      setAlertMessage(`成功导入 ${items.length} 位导师信息！`);
    } else {
      items.forEach(item => {
        onAddFaculty(item as FacultyMember, item.country || '', item.fieldCategory || '', { ...item, classificationSource: 'import' });
      });
      setAlertMessage(`成功导入 ${items.length} 位导师信息！`);
    }
    setIsImportPreviewOpen(false);
    setImportPreviewData([]);
  };
  
  const performImport = (items: FacultyRecord[]) => {
    if (onBatchAddFaculty) {
      onBatchAddFaculty(items);
    } else {
      items.forEach(item => {
        onAddFaculty(item as FacultyMember, item.country || '', item.fieldCategory || '', { ...item, classificationSource: 'import' });
      });
    }
    setIsImportPreviewOpen(false);
    setImportPreviewData([]);
    setAlertMessage(`成功导入 ${items.length} 位导师信息！`);
  };

  const handleImportFaculty = (imported: FacultyMember[]) => {
    imported.forEach(faculty => {
      onAddFaculty(faculty, '', '');
    });
  };

  const handleRefreshFaculty = async (record: FacultyRecord) => {
    setRefreshingId(record.id);
    try {
      const updated = await refreshFacultyData(record);
      onUpdateFaculty(record.id, { ...updated });
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleExport = (selectedFields: string[]) => {
    // Determine scope
    // For simplicity, we will export all filtered faculty for now, 
    // but the modal could be extended to allow choosing scope.
    const dataToExport = filteredFaculty;

    const exportData = dataToExport.map(f => {
      const row: Record<string, any> = {};
      selectedFields.forEach(fieldId => {
        let value: any = '';
        switch (fieldId) {
          case 'university': value = f.university; break;
          case 'qsRanking': value = f.qsRanking; break;
          case 'deadline': value = f.deadlineData?.value; break;
          case 'programName': value = f.programName; break;
          case 'programUrl': value = f.programUrl; break;
          case 'applicationReqs': value = f.applicationReqsData?.value; break;
          case 'rpReqs': value = f.rpReqsData?.value; break;
          case 'researchAreas': value = f.researchAreas.join('; '); break;
          case 'recommendationReason': value = f.recommendationReason; break;
          case 'email': value = f.email; break;
          case 'profileUrl': value = f.profileUrl; break;
          case 'tuition': value = f.tuitionData?.value; break;
          case 'scholarship': value = f.scholarshipData?.value; break;
          case 'name': value = f.name; break;
          case 'title': value = f.title; break;
          case 'school': value = f.school; break;
          default: value = '';
        }
        
        // Find label
        const fieldConfig = [
          { id: 'university', label: '学校名称 (中英文)' },
          { id: 'qsRanking', label: '2026QS综合排名' },
          { id: 'deadline', label: '截止日期' },
          { id: 'programName', label: '专业名称 (中英文)' },
          { id: 'programUrl', label: '专业链接' },
          { id: 'applicationReqs', label: '申请要求及材料' },
          { id: 'rpReqs', label: 'RP字数要求' },
          { id: 'researchAreas', label: '导师研究方向 (论文)' },
          { id: 'recommendationReason', label: '推荐理由' },
          { id: 'email', label: '导师邮箱' },
          { id: 'profileUrl', label: '导师官网链接' },
          { id: 'tuition', label: '学费' },
          { id: 'scholarship', label: '奖学金项目' },
          { id: 'name', label: '导师姓名' },
          { id: 'title', label: '导师职称' },
          { id: 'school', label: '学院/School' },
        ].find(f => f.id === fieldId);
        
        row[fieldConfig?.label || fieldId] = value || '';
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '导师数据');
    XLSX.writeFile(workbook, `导师数据导出_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50/50 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Filters */}
        <div className="w-72 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col overflow-y-auto shadow-sm">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Filter size={18} className="text-blue-600" />
              筛选导师
            </h2>
            <button 
              onClick={() => {
                setSelectedCountry('all');
                setSelectedProvinceState('all');
                setSelectedCity('all');
                setSelectedUniversity('all');
                setSelectedSchool('all');
                setSelectedDepartment('all');
                setSelectedField('all');
                setSelectedSubField('all');
                setSelectedTag('all');
              }}
              className="text-xs text-gray-500 hover:text-blue-600 font-medium transition-colors"
            >
              重置筛选
            </button>
          </div>

          <div className="p-4 space-y-4">
            {[
              { label: '国家', value: selectedCountry, options: countries, onChange: (v: string) => { setSelectedCountry(v); setSelectedProvinceState('all'); setSelectedCity('all'); setSelectedUniversity('all'); setSelectedSchool('all'); setSelectedDepartment('all'); } },
              { label: '州 / 省', value: selectedProvinceState, options: provinceStates, onChange: (v: string) => { setSelectedProvinceState(v); setSelectedCity('all'); setSelectedUniversity('all'); setSelectedSchool('all'); setSelectedDepartment('all'); } },
              { label: '城市', value: selectedCity, options: cities, onChange: (v: string) => { setSelectedCity(v); setSelectedUniversity('all'); setSelectedSchool('all'); setSelectedDepartment('all'); } },
              { label: '大学', value: selectedUniversity, options: universities, onChange: (v: string) => { setSelectedUniversity(v); setSelectedSchool('all'); setSelectedDepartment('all'); } },
              { label: '学院 / School', value: selectedSchool, options: schools, onChange: (v: string) => { setSelectedSchool(v); setSelectedDepartment('all'); } },
              { label: '系 / Department', value: selectedDepartment, options: departments, onChange: setSelectedDepartment },
            ].map((filter) => (
              <div key={filter.label} className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">{filter.label}</label>
                <select 
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="all">全部</option>
                  {filter.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="搜索导师姓名、院校、研究方向..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsXlsxImportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                <Upload size={16} />
                批量导入
              </button>
              <button 
                onClick={() => setIsManualEntryModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                <Plus size={16} />
                手动录入
              </button>
              <button 
                onClick={() => setIsSearchModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium"
              >
                <Globe size={16} />
                联网搜索导入
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 px-6">
            <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
              <span className="font-bold text-gray-900">
                {filteredFaculty.length}
              </span> 
              个结果
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-300/50">
                  <span className="text-blue-600 font-bold">已选 {selectedIds.size} 项</span>
                  <button 
                    onClick={() => setIsBatchClassifyModalOpen(true)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 px-2 py-1 rounded-lg transition-colors font-bold"
                  >
                    <Database size={14} />
                    批量分类
                  </button>
                  <button 
                    onClick={handleBatchDelete}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50/50 px-2 py-1 rounded-lg transition-colors font-bold"
                  >
                    <Trash2 size={14} />
                    批量删除
                  </button>
                  <button 
                    onClick={() => setIsCustomExportModalOpen(true)}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900 hover:bg-white/60 px-2 py-1 rounded-lg transition-colors font-bold"
                  >
                    <Download size={14} />
                    自定义导出
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center bg-white/40 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-white/50">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <ListIcon size={18} />
              </button>
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
                        <div className={`absolute top-3 left-3 z-30 transition-opacity ${selectedIds.has(faculty.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
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
                          onEdit={(record) => setEditingFaculty(record)}
                          onDelete={onDeleteFaculty}
                          onRefresh={handleRefreshFaculty}
                          onLink={(prof) => setLinkingFacultyId(faculty.id)}
                          onUnlink={(id) => onUnlinkFaculty(faculty.id, id)}
                          linkedClientCount={faculty.linkedClientIds?.length || 0}
                        />
                        {refreshingId === faculty.id && (
                          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-40 flex items-center justify-center rounded-xl">
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                              <span className="text-xs font-bold text-blue-700">正在更新数据...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass border border-white/50 rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/40 border-b border-white/50 text-xs font-bold text-gray-500 uppercase tracking-wider backdrop-blur-sm">
                          <th className="p-4 w-12 text-center">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.size === filteredFaculty.length && filteredFaculty.length > 0}
                              onChange={toggleAllSelection}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm"
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
                      <tbody className="divide-y divide-white/30">
                        {filteredFaculty.map(faculty => (
                          <tr key={faculty.id} className={`hover:bg-white/60 transition-colors ${selectedIds.has(faculty.id) ? 'bg-blue-50/50' : ''}`}>
                            <td className="p-4 text-center">
                              <input 
                                type="checkbox" 
                                checked={selectedIds.has(faculty.id)}
                                onChange={() => toggleSelection(faculty.id)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm"
                              />
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center text-gray-500 font-bold text-sm overflow-hidden shadow-sm">
                                  {faculty.photoUrl ? (
                                    <img src={faculty.photoUrl} alt={faculty.name} className="w-full h-full object-cover" />
                                  ) : (
                                    faculty.name.charAt(0)
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 tracking-tight">{faculty.name}</div>
                                  <div className="text-xs text-gray-500 font-medium">{faculty.country}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-gray-900">{faculty.university}</div>
                              <div className="text-xs text-gray-500 font-medium">{faculty.title}</div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {faculty.researchAreas.slice(0, 2).map((area, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-white/60 backdrop-blur-sm text-gray-600 rounded-md text-xs truncate max-w-[100px] shadow-sm border border-white/50 font-medium">
                                    {area}
                                  </span>
                                ))}
                                {faculty.researchAreas.length > 2 && (
                                  <span className="px-2 py-0.5 bg-white/40 text-gray-500 rounded-md text-xs border border-white/30 font-medium">
                                    +{faculty.researchAreas.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-md text-xs font-bold shadow-sm ${
                                faculty.matchScore >= 90 ? 'bg-emerald-50/80 text-emerald-700 border border-emerald-100/50' :
                                faculty.matchScore >= 80 ? 'bg-blue-50/80 text-blue-700 border border-blue-100/50' :
                                'bg-amber-50/80 text-amber-700 border border-amber-100/50'
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
                                      <div key={cid} className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-gray-600" title={client?.name}>
                                        {client?.name.charAt(0)}
                                      </div>
                                    );
                                  })}
                                  {faculty.linkedClientIds.length > 3 && (
                                    <div className="w-8 h-8 rounded-full bg-white/60 backdrop-blur-sm border-2 border-white flex items-center justify-center text-xs font-bold text-gray-500 shadow-sm">
                                      +{faculty.linkedClientIds.length - 3}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs font-medium">-</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => setLinkingFacultyId(faculty.id)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white/60 rounded-lg transition-all active:scale-95"
                                  title="关联学生"
                                >
                                  <UserPlus size={16} />
                                </button>
                                <button 
                                  onClick={() => onDeleteFaculty(faculty.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white/60 rounded-lg transition-all active:scale-95"
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
      </div>
      <BatchClassifyModal 
        isOpen={isBatchClassifyModalOpen}
        onClose={() => setIsBatchClassifyModalOpen(false)}
        selectedCount={selectedIds.size}
        onConfirm={(updates) => {
          onBatchUpdateFaculty?.(Array.from(selectedIds), updates);
          setSelectedIds(new Set());
        }}
      />

      <CustomExportModal
        isOpen={isCustomExportModalOpen}
        onClose={() => setIsCustomExportModalOpen(false)}
        selectedMentors={filteredFaculty}
        onExport={handleExport}
      />

      <FacultySearchModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
        onImport={handleImportFaculty} 
      />

      <FacultyManualEntryModal
        isOpen={isManualEntryModalOpen}
        onClose={() => setIsManualEntryModalOpen(false)}
        onSave={(faculty, country, fieldCategory, extra) => {
          onAddFaculty(faculty, country, fieldCategory, extra);
          setIsManualEntryModalOpen(false);
        }}
      />

      {/* Client Selection Modal for Linking */}
      {linkingFacultyId && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xl flex items-center justify-center z-[60] p-4">
          <div className="glass rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/50">
            <div className="p-6 border-b border-white/50 bg-white/40 backdrop-blur-sm flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">选择要关联的学生</h3>
              <button onClick={() => setLinkingFacultyId(null)} className="text-gray-400 hover:text-gray-600 hover:bg-white/60 p-2 rounded-xl transition-all active:scale-95">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white/20 backdrop-blur-sm">
              {clients.length === 0 ? (
                <p className="text-center text-gray-500 py-8 font-medium">暂无学生档案</p>
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
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-95 ${
                        isLinked 
                          ? 'border-blue-300 bg-blue-50/80 text-blue-700 shadow-sm' 
                          : 'border-white/50 bg-white/60 hover:border-blue-300 hover:bg-blue-50/50 text-gray-700 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-white/50 flex items-center justify-center font-bold text-xs shadow-sm">
                          {client.name.charAt(0)}
                        </div>
                        <span className="font-bold">{client.name}</span>
                      </div>
                      {isLinked ? (
                        <span className="text-xs font-bold bg-blue-100/80 px-2 py-1 rounded-md text-blue-700 border border-blue-200/50 shadow-sm">已关联</span>
                      ) : (
                        <Plus size={16} className="text-gray-400" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <div className="p-4 bg-white/40 backdrop-blur-sm border-t border-white/50 flex justify-end">
              <button
                onClick={() => setLinkingFacultyId(null)}
                className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-white/60 rounded-xl transition-all active:scale-95"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Faculty Modal */}
      {editingFaculty && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xl flex items-center justify-center z-[70] p-4">
          <div className="glass rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/50">
            <div className="p-6 border-b border-white/50 flex justify-between items-center bg-white/40 backdrop-blur-sm">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">编辑导师信息</h3>
              <button onClick={() => setEditingFaculty(null)} className="text-gray-400 hover:text-gray-600 hover:bg-white/60 p-2 rounded-xl transition-all active:scale-95">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar bg-white/20 backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">姓名</label>
                  <input 
                    type="text" 
                    value={editingFaculty.name}
                    onChange={(e) => setEditingFaculty({...editingFaculty, name: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">职称</label>
                  <input 
                    type="text" 
                    value={editingFaculty.title}
                    onChange={(e) => setEditingFaculty({...editingFaculty, title: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">院校</label>
                  <input 
                    type="text" 
                    value={editingFaculty.university}
                    onChange={(e) => setEditingFaculty({...editingFaculty, university: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">院校 (英文)</label>
                  <input 
                    type="text" 
                    value={editingFaculty.universityEn || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, universityEn: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">申请专业 (中文)</label>
                  <input 
                    type="text" 
                    value={editingFaculty.programName || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, programName: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">申请专业 (英文)</label>
                  <input 
                    type="text" 
                    value={editingFaculty.programNameEn || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, programNameEn: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">QS排名</label>
                  <input 
                    type="text" 
                    value={editingFaculty.qsRanking || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, qsRanking: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">推荐理由</label>
                  <textarea 
                    value={editingFaculty.recommendationReason || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, recommendationReason: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium h-20 resize-none"
                  />
                </div>
                
                {/* Source Data Fields */}
                <div className="col-span-2 pt-4 border-t border-white/50">
                  <h4 className="text-sm font-black text-gray-900 mb-4">招生与录取详情</h4>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">申请截止日期</label>
                  <input 
                    type="text" 
                    value={editingFaculty.deadlineData?.value || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, deadlineData: { ...editingFaculty.deadlineData, value: e.target.value, sourceUrls: editingFaculty.deadlineData?.sourceUrls || [] }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">截止日期来源URL (多个用逗号分隔)</label>
                  <input 
                    type="text" 
                    value={editingFaculty.deadlineData?.sourceUrls?.join(', ') || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, deadlineData: { ...editingFaculty.deadlineData, sourceUrls: e.target.value.split(',').map(s => s.trim()).filter(s => s !== ''), value: editingFaculty.deadlineData?.value || '' }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">申请要求及材料</label>
                  <textarea 
                    value={editingFaculty.applicationReqsData?.value || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, applicationReqsData: { ...editingFaculty.applicationReqsData, value: e.target.value, sourceUrls: editingFaculty.applicationReqsData?.sourceUrls || [] }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium h-20 resize-none"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">申请要求来源URL (多个用逗号分隔)</label>
                  <input 
                    type="text" 
                    value={editingFaculty.applicationReqsData?.sourceUrls?.join(', ') || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, applicationReqsData: { ...editingFaculty.applicationReqsData, sourceUrls: e.target.value.split(',').map(s => s.trim()).filter(s => s !== ''), value: editingFaculty.applicationReqsData?.value || '' }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">RP字数要求</label>
                  <input 
                    type="text" 
                    value={editingFaculty.rpReqsData?.value || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, rpReqsData: { ...editingFaculty.rpReqsData, value: e.target.value, sourceUrls: editingFaculty.rpReqsData?.sourceUrls || [] }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">RP要求来源URL (多个用逗号分隔)</label>
                  <input 
                    type="text" 
                    value={editingFaculty.rpReqsData?.sourceUrls?.join(', ') || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, rpReqsData: { ...editingFaculty.rpReqsData, sourceUrls: e.target.value.split(',').map(s => s.trim()).filter(s => s !== ''), value: editingFaculty.rpReqsData?.value || '' }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">学费</label>
                  <input 
                    type="text" 
                    value={editingFaculty.tuitionData?.value || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, tuitionData: { ...editingFaculty.tuitionData, value: e.target.value, sourceUrls: editingFaculty.tuitionData?.sourceUrls || [] }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">学费来源URL (多个用逗号分隔)</label>
                  <input 
                    type="text" 
                    value={editingFaculty.tuitionData?.sourceUrls?.join(', ') || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, tuitionData: { ...editingFaculty.tuitionData, sourceUrls: e.target.value.split(',').map(s => s.trim()).filter(s => s !== ''), value: editingFaculty.tuitionData?.value || '' }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">奖学金项目</label>
                  <textarea 
                    value={editingFaculty.scholarshipData?.value || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, scholarshipData: { ...editingFaculty.scholarshipData, value: e.target.value, sourceUrls: editingFaculty.scholarshipData?.sourceUrls || [] }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium h-20 resize-none"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">奖学金来源URL (多个用逗号分隔)</label>
                  <input 
                    type="text" 
                    value={editingFaculty.scholarshipData?.sourceUrls?.join(', ') || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, scholarshipData: { ...editingFaculty.scholarshipData, sourceUrls: e.target.value.split(',').map(s => s.trim()).filter(s => s !== ''), value: editingFaculty.scholarshipData?.value || '' }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">专业链接</label>
                  <input 
                    type="text" 
                    value={editingFaculty.programUrl || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, programUrl: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">院校官网链接</label>
                  <input 
                    type="text" 
                    value={editingFaculty.universityUrl || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, universityUrl: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">学院/系</label>
                  <input 
                    type="text" 
                    value={editingFaculty.department}
                    onChange={(e) => setEditingFaculty({...editingFaculty, department: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">邮箱</label>
                  <input 
                    type="email" 
                    value={editingFaculty.email}
                    onChange={(e) => setEditingFaculty({...editingFaculty, email: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">国家/地区</label>
                  <input 
                    type="text" 
                    value={editingFaculty.country}
                    onChange={(e) => setEditingFaculty({...editingFaculty, country: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">二级地区 (如: 北京)</label>
                  <input 
                    type="text" 
                    value={editingFaculty.subRegion || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, subRegion: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">地区路径 (用 &gt; 分隔)</label>
                  <input 
                    type="text" 
                    value={editingFaculty.regionPath?.join(' > ') || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, regionPath: e.target.value.split(/[>|/]/).map(s => s.trim()).filter(Boolean)})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">一级学科</label>
                  <input 
                    type="text" 
                    value={editingFaculty.fieldCategory}
                    onChange={(e) => setEditingFaculty({...editingFaculty, fieldCategory: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">二级分类</label>
                  <input 
                    type="text" 
                    value={editingFaculty.subFieldCategory || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, subFieldCategory: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">分类路径 (用 &gt; 分隔)</label>
                  <input 
                    type="text" 
                    value={editingFaculty.classificationPath?.join(' > ') || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, classificationPath: e.target.value.split(/[>|/]/).map(s => s.trim()).filter(Boolean)})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">研究方向 (逗号分隔)</label>
                  <input 
                    type="text" 
                    value={editingFaculty.researchAreas.join(', ')}
                    onChange={(e) => setEditingFaculty({...editingFaculty, researchAreas: e.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean)})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">分类备注</label>
                  <textarea 
                    value={editingFaculty.classificationNote || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, classificationNote: e.target.value})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium h-20 resize-none"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">自定义标签 (逗号分隔)</label>
                  <input 
                    type="text" 
                    value={editingFaculty.customTags?.join(', ') || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, customTags: e.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean)})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-white/40 backdrop-blur-sm border-t border-white/50 flex justify-end gap-3">
              <button 
                onClick={() => setEditingFaculty(null)}
                className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-white/60 rounded-xl transition-all active:scale-95"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  const original = facultyDatabase.find(f => f.id === editingFaculty.id);
                  const classificationChanged = 
                    editingFaculty.country !== original?.country ||
                    editingFaculty.subRegion !== original?.subRegion ||
                    editingFaculty.fieldCategory !== original?.fieldCategory ||
                    editingFaculty.subFieldCategory !== original?.subFieldCategory ||
                    JSON.stringify(editingFaculty.regionPath) !== JSON.stringify(original?.regionPath) ||
                    JSON.stringify(editingFaculty.classificationPath) !== JSON.stringify(original?.classificationPath);

                  onUpdateFaculty(editingFaculty.id, {
                    ...editingFaculty,
                    classificationSource: classificationChanged ? 'manual' : editingFaculty.classificationSource,
                    updatedAt: new Date().toISOString()
                  });
                  setEditingFaculty(null);
                }}
                className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all active:scale-95"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Batch Delete Confirmation Modal */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">确认删除</h2>
              <button onClick={() => setIsBatchDeleteModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-8">
              <p className="text-gray-600">确定要删除选中的 <span className="font-bold text-red-600">{selectedIds.size}</span> 位导师吗？此操作无法撤销。</p>
            </div>
            <div className="px-8 py-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50">
              <button 
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-white/60 rounded-xl transition-all active:scale-95"
              >
                取消
              </button>
              <button 
                onClick={confirmBatchDelete}
                className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 shadow-md shadow-red-500/20 transition-all active:scale-95"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">提示</h2>
              <button onClick={() => setAlertMessage(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-8">
              <p className="text-gray-600">{alertMessage}</p>
            </div>
            <div className="px-8 py-6 border-t border-gray-100 flex justify-end bg-gray-50/50">
              <button 
                onClick={() => setAlertMessage(null)}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      <FacultyConflictModal 
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        onConfirm={performImport}
        conflicts={conflicts}
        allItems={importPreviewData}
      />
      {/* Import Preview Modal */}
      <FacultyImportPreviewModal 
        isOpen={isImportPreviewOpen}
        onClose={() => {
          setIsImportPreviewOpen(false);
          setImportPreviewData([]);
        }}
        onConfirm={handleConfirmImport}
        data={importPreviewData}
        facultyDatabase={facultyDatabase}
      />
      {isXlsxImportModalOpen && (
        <XlsxImportModal
          isOpen={isXlsxImportModalOpen}
          onClose={() => setIsXlsxImportModalOpen(false)}
          onImport={handleConfirmImport}
        />
      )}
    </div>
  );
};

export default FacultyDatabase;
