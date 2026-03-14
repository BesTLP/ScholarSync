import React, { useState, useMemo, useRef } from 'react';
import { FacultyRecord, FacultyMember, Client } from '../types';
import FacultyCard from './FacultyCard';
import FacultySearchModal from './FacultySearchModal';
import FacultyManualEntryModal from './FacultyManualEntryModal';
import BatchClassifyModal from './BatchClassifyModal';
import FacultyImportPreviewModal from './FacultyImportPreviewModal';
import { refreshFacultyData, processImportedFacultyRow, processImportedFacultyBatch } from '../services/geminiService';
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
  onAddFaculty: (faculty: FacultyMember, country: string, fieldCategory: string, extra?: Partial<FacultyRecord>) => string;
  onBatchAddFaculty?: (items: { faculty: FacultyMember, country?: string, fieldCategory?: string, extra?: Partial<FacultyRecord> }[]) => void;
  onUpdateFaculty: (id: string, updates: Partial<FacultyRecord>) => void;
  onBatchUpdateFaculty: (ids: string[], updates: Partial<FacultyRecord>) => void;
  onDeleteFaculty: (id: string) => void;
  onLinkFaculty: (facultyId: string, clientId: string) => void;
  onUnlinkFaculty: (facultyId: string, clientId: string) => void;
}

const FacultyDatabase: React.FC<FacultyDatabaseProps> = ({
  facultyDatabase,
  clients,
  onAddFaculty,
  onBatchAddFaculty,
  onUpdateFaculty,
  onBatchUpdateFaculty,
  onDeleteFaculty,
  onLinkFaculty,
  onUnlinkFaculty
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedSubRegion, setSelectedSubRegion] = useState<string>('all');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedField, setSelectedField] = useState<string>('all');
  const [selectedSubField, setSelectedSubField] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
  const [isBatchClassifyModalOpen, setIsBatchClassifyModalOpen] = useState(false);
  const [linkingFacultyId, setLinkingFacultyId] = useState<string | null>(null);
  const [editingFaculty, setEditingFaculty] = useState<FacultyRecord | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importPreviewData, setImportPreviewData] = useState<{ faculty: FacultyMember, country: string, fieldCategory: string }[]>([]);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);

  // Derived Data for Filters
  const countries = useMemo(() => Array.from(new Set(facultyDatabase.map(f => f.country))).filter(Boolean).sort(), [facultyDatabase]);
  const subRegions = useMemo(() => {
    const relevant = selectedCountry === 'all' ? facultyDatabase : facultyDatabase.filter(f => f.country === selectedCountry);
    return Array.from(new Set(relevant.map(f => f.subRegion).filter(Boolean) as string[])).sort();
  }, [facultyDatabase, selectedCountry]);
  const universities = useMemo(() => {
    let relevant = facultyDatabase;
    if (selectedCountry !== 'all') relevant = relevant.filter(f => f.country === selectedCountry);
    if (selectedSubRegion !== 'all') relevant = relevant.filter(f => f.subRegion === selectedSubRegion);
    return Array.from(new Set(relevant.map(f => f.university))).filter(Boolean).sort();
  }, [facultyDatabase, selectedCountry, selectedSubRegion]);
  const departments = useMemo(() => {
    let relevant = facultyDatabase;
    if (selectedCountry !== 'all') relevant = relevant.filter(f => f.country === selectedCountry);
    if (selectedSubRegion !== 'all') relevant = relevant.filter(f => f.subRegion === selectedSubRegion);
    if (selectedUniversity !== 'all') relevant = relevant.filter(f => f.university === selectedUniversity);
    return Array.from(new Set(relevant.map(f => f.department))).filter(Boolean).sort();
  }, [facultyDatabase, selectedCountry, selectedSubRegion, selectedUniversity]);
  const fields = useMemo(() => Array.from(new Set(facultyDatabase.map(f => f.fieldCategory))).filter(Boolean).sort(), [facultyDatabase]);
  const subFields = useMemo(() => {
    const relevant = selectedField === 'all' ? facultyDatabase : facultyDatabase.filter(f => f.fieldCategory === selectedField);
    return Array.from(new Set(relevant.map(f => f.subFieldCategory).filter(Boolean) as string[])).sort();
  }, [facultyDatabase, selectedField]);
  const allTags = useMemo(() => Array.from(new Set(facultyDatabase.flatMap(f => f.customTags || []))).filter(Boolean).sort(), [facultyDatabase]);

  // Filtered Data
  const filteredFaculty = useMemo(() => {
    return facultyDatabase.filter(f => {
      const matchesSearch = 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.researchAreas.some(area => area.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCountry = selectedCountry === 'all' || f.country === selectedCountry;
      const matchesSubRegion = selectedSubRegion === 'all' || f.subRegion === selectedSubRegion;
      const matchesUniversity = selectedUniversity === 'all' || f.university === selectedUniversity;
      const matchesDepartment = selectedDepartment === 'all' || f.department === selectedDepartment;
      const matchesField = selectedField === 'all' || f.fieldCategory === selectedField;
      const matchesSubField = selectedSubField === 'all' || f.subFieldCategory === selectedSubField;
      const matchesTag = selectedTag === 'all' || (f.customTags && f.customTags.includes(selectedTag));

      return matchesSearch && matchesCountry && matchesSubRegion && matchesUniversity && matchesDepartment && matchesField && matchesSubField && matchesTag;
    });
  }, [facultyDatabase, searchQuery, selectedCountry, selectedSubRegion, selectedUniversity, selectedDepartment, selectedField, selectedSubField, selectedTag]);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: 0 });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const data = new Uint8Array(arrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        
        if (jsonData.length === 0) {
          alert("文件内容为空。");
          setIsImporting(false);
          return;
        }

        setImportProgress({ current: 0, total: jsonData.length });
        
        const previewItems: { faculty: FacultyMember, country: string, fieldCategory: string }[] = [];
        const BATCH_SIZE = 5; // Reduced from 10 to avoid timeouts
        
        // Process in batches to balance speed and rate limits
        for (let i = 0; i < jsonData.length; i += BATCH_SIZE) {
          const batch = jsonData.slice(i, i + BATCH_SIZE);
          setImportProgress({ current: i, total: jsonData.length });
          
          try {
            const processedBatch = await processImportedFacultyBatch(batch);
            if (processedBatch && processedBatch.length > 0) {
              previewItems.push(...processedBatch);
            } else if (batch.length > 0) {
              // If batch returns empty but had items, try fallback
              throw new Error("Batch returned empty result");
            }
          } catch (err) {
            console.error(`Error processing batch starting at ${i}, falling back to row-by-row:`, err);
            
            // Fallback: process each row in the failed batch individually
            for (let j = 0; j < batch.length; j++) {
              const row = batch[j];
              setImportProgress({ current: i + j, total: jsonData.length });
              try {
                const processed = await processImportedFacultyRow(row);
                if (processed && processed.faculty) {
                  previewItems.push(processed);
                }
              } catch (rowErr) {
                console.error(`Failed to process row ${i + j}:`, rowErr);
              }
            }
          }
        }
        
        setImportProgress({ current: jsonData.length, total: jsonData.length });
        
        if (previewItems.length > 0) {
          setImportPreviewData(previewItems);
          setIsImportPreviewOpen(true);
        } else {
          alert("未识别到有效的导师信息，请检查文件格式或尝试手动录入。");
        }
      } catch (error) {
        console.error("Error parsing file:", error);
        alert("文件解析失败，请确保格式正确。");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = (items: { faculty: FacultyMember, country: string, fieldCategory: string }[]) => {
    if (onBatchAddFaculty) {
      onBatchAddFaculty(items.map(item => ({
        faculty: item.faculty,
        country: item.country || '',
        fieldCategory: item.fieldCategory || '',
        extra: { classificationSource: 'auto' }
      })));
    } else {
      items.forEach(item => {
        onAddFaculty(item.faculty, item.country || '', item.fieldCategory || '');
      });
    }
    setIsImportPreviewOpen(false);
    setImportPreviewData([]);
    alert(`成功导入 ${items.length} 位导师信息！`);
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

  const handleExportCSV = () => {
    const targetIds = selectedIds.size > 0 
      ? Array.from(selectedIds) 
      : filteredFaculty.map(f => f.id);
    
    if (targetIds.length === 0) return;

    const dataToExport = facultyDatabase.filter(f => targetIds.includes(f.id));
    
    const BOM = "\uFEFF";
    const headers = ["姓名", "职称", "院校", "学院/系", "邮箱", "国家/地区", "学科领域", "研究方向", "备注"];
    const csvRows = [headers.join(",")];

    dataToExport.forEach(f => {
      const row = [
        `"${f.name.replace(/"/g, '""')}"`,
        `"${f.title.replace(/"/g, '""')}"`,
        `"${f.university.replace(/"/g, '""')}"`,
        `"${f.department.replace(/"/g, '""')}"`,
        `"${f.email.replace(/"/g, '""')}"`,
        `"${f.country.replace(/"/g, '""')}"`,
        `"${f.fieldCategory.replace(/"/g, '""')}"`,
        `"${f.researchAreas.join("; ").replace(/"/g, '""')}"`,
        `"${(f.notes || "").replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Faculty_Database_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      {/* Left Sidebar: Statistics & Quick Filters */}
      <div className="w-64 glass border-r border-white/50 flex-shrink-0 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="p-6 border-b border-white/50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 tracking-tight">
            <Database size={20} className="text-blue-600" />
            导师库概览
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-medium">共收录 {facultyDatabase.length} 位导师</p>
        </div>

        <div className="p-4 space-y-6">
          {/* Country Stats */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">按国家/地区</h3>
            <div className="space-y-1">
              <button 
                onClick={() => { setSelectedCountry('all'); setSelectedSubRegion('all'); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${selectedCountry === 'all' ? 'bg-blue-50/80 text-blue-700 font-bold shadow-sm' : 'text-gray-600 hover:bg-white/60 font-medium'}`}
              >
                <span>全部</span>
                <span className="bg-white/80 text-gray-500 px-2 py-0.5 rounded-md text-xs shadow-sm">{facultyDatabase.length}</span>
              </button>
              {countries.map(country => {
                const count = facultyDatabase.filter(f => f.country === country).length;
                const isSelected = selectedCountry === country;
                return (
                  <div key={country} className="space-y-1">
                    <button 
                      onClick={() => { setSelectedCountry(country); setSelectedSubRegion('all'); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${isSelected ? 'bg-blue-50/80 text-blue-700 font-bold shadow-sm' : 'text-gray-600 hover:bg-white/60 font-medium'}`}
                    >
                      <span>{country}</span>
                      <span className="bg-white/80 text-gray-500 px-2 py-0.5 rounded-md text-xs shadow-sm">{count}</span>
                    </button>
                    {isSelected && subRegions.length > 0 && (
                      <div className="pl-4 space-y-1 animate-in slide-in-from-top-1 duration-200">
                        {subRegions.map(sub => {
                          const subCount = facultyDatabase.filter(f => f.country === country && f.subRegion === sub).length;
                          return (
                            <button
                              key={sub}
                              onClick={() => setSelectedSubRegion(sub)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${selectedSubRegion === sub ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700 font-medium'}`}
                            >
                              <span>{sub}</span>
                              <span>{subCount}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Field Stats */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">按学科领域</h3>
            <div className="space-y-1">
              <button 
                onClick={() => { setSelectedField('all'); setSelectedSubField('all'); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${selectedField === 'all' ? 'bg-blue-50/80 text-blue-700 font-bold shadow-sm' : 'text-gray-600 hover:bg-white/60 font-medium'}`}
              >
                <span>全部</span>
                <span className="bg-white/80 text-gray-500 px-2 py-0.5 rounded-md text-xs shadow-sm">{facultyDatabase.length}</span>
              </button>
              {fields.map(field => {
                const count = facultyDatabase.filter(f => f.fieldCategory === field).length;
                const isSelected = selectedField === field;
                return (
                  <div key={field} className="space-y-1">
                    <button 
                      onClick={() => { setSelectedField(field); setSelectedSubField('all'); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${isSelected ? 'bg-blue-50/80 text-blue-700 font-bold shadow-sm' : 'text-gray-600 hover:bg-white/60 font-medium'}`}
                    >
                      <span>{field}</span>
                      <span className="bg-white/80 text-gray-500 px-2 py-0.5 rounded-md text-xs shadow-sm">{count}</span>
                    </button>
                    {isSelected && subFields.length > 0 && (
                      <div className="pl-4 space-y-1 animate-in slide-in-from-top-1 duration-200">
                        {subFields.map(sub => {
                          const subCount = facultyDatabase.filter(f => f.fieldCategory === field && f.subFieldCategory === sub).length;
                          return (
                            <button
                              key={sub}
                              onClick={() => setSelectedSubField(sub)}
                              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all ${selectedSubField === sub ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700 hover:bg-white/40'}`}
                            >
                              <span>{sub}</span>
                              <span>{subCount}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tag Stats */}
          {allTags.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">按标签</h3>
              <div className="flex flex-wrap gap-2 px-2">
                <button
                  onClick={() => setSelectedTag('all')}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${selectedTag === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-white/60 text-gray-500 hover:bg-white'}`}
                >
                  全部
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${selectedTag === tag ? 'bg-blue-600 text-white shadow-md' : 'bg-white/60 text-gray-500 hover:bg-white'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="glass border-b border-white/50 px-6 py-4 flex flex-col gap-4 shadow-sm z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="搜索导师姓名、院校、研究方向..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/50 backdrop-blur-sm border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all shadow-sm"
                />
              </div>
              
              {/* Filters Dropdown (Simplified for now) */}
              <div className="flex items-center gap-2">
                {selectedCountry !== 'all' && subRegions.length > 0 && (
                  <select 
                    value={selectedSubRegion} 
                    onChange={(e) => {
                      setSelectedSubRegion(e.target.value);
                      setSelectedUniversity('all');
                      setSelectedDepartment('all');
                    }}
                    className="px-3 py-2 bg-white/50 backdrop-blur-sm border border-white/50 rounded-xl text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm animate-in fade-in slide-in-from-left-2 duration-200"
                  >
                    <option value="all">所有地区</option>
                    {subRegions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}

                <select 
                  value={selectedUniversity} 
                  onChange={(e) => {
                    setSelectedUniversity(e.target.value);
                    setSelectedDepartment('all');
                  }}
                  className="px-3 py-2 bg-white/50 backdrop-blur-sm border border-white/50 rounded-xl text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm"
                >
                  <option value="all">所有院校</option>
                  {universities.map(u => <option key={u} value={u}>{u}</option>)}
                </select>

                {selectedUniversity !== 'all' && departments.length > 0 && (
                  <select 
                    value={selectedDepartment} 
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="px-3 py-2 bg-white/50 backdrop-blur-sm border border-white/50 rounded-xl text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm animate-in fade-in slide-in-from-left-2 duration-200"
                  >
                    <option value="all">所有院系</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className={`flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/50 text-gray-700 rounded-xl transition-all shadow-sm font-bold ${isImporting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/80 active:scale-95'}`}
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    导入中 ({importProgress.current}/{importProgress.total})
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    批量导入
                  </>
                )}
              </button>
              <button 
                onClick={() => setIsManualEntryModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/50 text-gray-700 rounded-xl hover:bg-white/80 transition-all shadow-sm font-bold active:scale-95"
              >
                <Plus size={16} />
                手动录入
              </button>
              <button 
                onClick={() => setIsSearchModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 font-bold active:scale-95"
              >
                <Globe size={16} />
                联网搜索导入
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
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
                    onClick={handleExportCSV}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900 hover:bg-white/60 px-2 py-1 rounded-lg transition-colors font-bold"
                  >
                    <Download size={14} />
                    导出 CSV
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

      <BatchClassifyModal 
        isOpen={isBatchClassifyModalOpen}
        onClose={() => setIsBatchClassifyModalOpen(false)}
        selectedCount={selectedIds.size}
        onSave={(updates) => {
          onBatchUpdateFaculty(Array.from(selectedIds), updates);
          setSelectedIds(new Set());
        }}
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
                    onChange={(e) => setEditingFaculty({...editingFaculty, deadlineData: { ...editingFaculty.deadlineData, value: e.target.value, sourceUrl: editingFaculty.deadlineData?.sourceUrl || '' }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">截止日期来源URL</label>
                  <input 
                    type="text" 
                    value={editingFaculty.deadlineData?.sourceUrl || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, deadlineData: { ...editingFaculty.deadlineData, sourceUrl: e.target.value, value: editingFaculty.deadlineData?.value || '' }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">申请要求及材料</label>
                  <textarea 
                    value={editingFaculty.applicationReqsData?.value || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, applicationReqsData: { ...editingFaculty.applicationReqsData, value: e.target.value, sourceUrl: editingFaculty.applicationReqsData?.sourceUrl || '' }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium h-20 resize-none"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">申请要求来源URL</label>
                  <input 
                    type="text" 
                    value={editingFaculty.applicationReqsData?.sourceUrl || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, applicationReqsData: { ...editingFaculty.applicationReqsData, sourceUrl: e.target.value, value: editingFaculty.applicationReqsData?.value || '' }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">RP字数要求</label>
                  <input 
                    type="text" 
                    value={editingFaculty.rpReqsData?.value || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, rpReqsData: { ...editingFaculty.rpReqsData, value: e.target.value, sourceUrl: editingFaculty.rpReqsData?.sourceUrl || '' }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">RP要求来源URL</label>
                  <input 
                    type="text" 
                    value={editingFaculty.rpReqsData?.sourceUrl || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, rpReqsData: { ...editingFaculty.rpReqsData, sourceUrl: e.target.value, value: editingFaculty.rpReqsData?.value || '' }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">学费</label>
                  <input 
                    type="text" 
                    value={editingFaculty.tuitionData?.value || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, tuitionData: { ...editingFaculty.tuitionData, value: e.target.value, sourceUrl: editingFaculty.tuitionData?.sourceUrl || '' }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">学费来源URL</label>
                  <input 
                    type="text" 
                    value={editingFaculty.tuitionData?.sourceUrl || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, tuitionData: { ...editingFaculty.tuitionData, sourceUrl: e.target.value, value: editingFaculty.tuitionData?.value || '' }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">奖学金项目</label>
                  <textarea 
                    value={editingFaculty.scholarshipData?.value || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, scholarshipData: { ...editingFaculty.scholarshipData, value: e.target.value, sourceUrl: editingFaculty.scholarshipData?.sourceUrl || '' }})}
                    className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium h-20 resize-none"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">奖学金来源URL</label>
                  <input 
                    type="text" 
                    value={editingFaculty.scholarshipData?.sourceUrl || ''}
                    onChange={(e) => setEditingFaculty({...editingFaculty, scholarshipData: { ...editingFaculty.scholarshipData, sourceUrl: e.target.value, value: editingFaculty.scholarshipData?.value || '' }})}
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
      {/* Import Preview Modal */}
      <FacultyImportPreviewModal 
        isOpen={isImportPreviewOpen}
        onClose={() => {
          setIsImportPreviewOpen(false);
          setImportPreviewData([]);
        }}
        onConfirm={handleConfirmImport}
        data={importPreviewData}
      />
    </div>
  );
};

export default FacultyDatabase;
