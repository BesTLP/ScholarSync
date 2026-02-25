import React, { useState, useEffect } from 'react';
import { FacultyMember, TargetOption, SourceData, Client, FacultyRecord } from '../types';
import { generateFacultyMatches, parseRequirementText } from '../services/geminiService';
import FacultyCard from './FacultyCard';
import { 
  Search, 
  Sparkles, 
  Plus, 
  Trash2, 
  AlertCircle, 
  FileSpreadsheet,
  Loader2,
  UserPlus,
  Star,
  User
} from 'lucide-react';

interface FacultyMatcherProps {
  clients?: Client[];
  selectedClient?: Client | null;
  facultyDatabase?: FacultyRecord[];
  onAddFacultyToDatabase?: (faculty: FacultyMember, country: string, fieldCategory: string) => string;
  onLinkFacultyToClient?: (facultyId: string, clientId: string) => void;
  onUpdateClient?: (client: Client) => void;
}

const FacultyMatcher: React.FC<FacultyMatcherProps> = ({
  clients = [],
  selectedClient = null,
  facultyDatabase = [],
  onAddFacultyToDatabase,
  onLinkFacultyToClient,
  onUpdateClient
}) => {
  // Smart Import State
  const [rawRequirementText, setRawRequirementText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [showSmartFill, setShowSmartFill] = useState(true);

  // Input States
  const [studentProfile, setStudentProfile] = useState('');
  
  // Target States (Dynamic List)
  const [targets, setTargets] = useState<TargetOption[]>([
      { region: '', university: '', count: 5 }
  ]);

  const [department, setDepartment] = useState('');
  const [targetPosition, setTargetPosition] = useState('');
  
  // New States for Application Details
  const [entryYear, setEntryYear] = useState('');
  const [scholarship, setScholarship] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [businessInfo, setBusinessInfo] = useState(''); // e.g., "Jennifer, DDL 11.28"

  const [directoryUrl, setDirectoryUrl] = useState('');
  const [manualContent, setManualContent] = useState('');
  
  // UI States
  const [results, setResults] = useState<FacultyMember[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);

  // Client Selection State (Local override if needed, but primarily driven by props)
  const [activeClientId, setActiveClientId] = useState<string>(selectedClient?.id || '');

  // Effect to sync selected client to local state
  useEffect(() => {
    if (selectedClient) {
      setActiveClientId(selectedClient.id);
      // Optional: Pre-fill profile if client has one (assuming client object might have this data in future)
    }
  }, [selectedClient]);

  const handleSmartFill = async () => {
    if (!rawRequirementText.trim()) return;
    
    setIsParsing(true);
    try {
        const parsed = await parseRequirementText(rawRequirementText);
        setStudentProfile(parsed.profileSummary);
        setDepartment(parsed.department);
        setTargetPosition(parsed.targetPosition);
        setEntryYear(parsed.entryYear);
        setScholarship(parsed.scholarship);
        setExclusions(parsed.exclusions);
        setBusinessInfo(parsed.businessInfo);
        
        if (parsed.targets && parsed.targets.length > 0) {
            setTargets(parsed.targets);
        }
    } catch (e) {
        console.error(e);
        setError("解析需求失败，请重试");
    } finally {
        setIsParsing(false);
    }
  };

  const handleAddTarget = () => {
      setTargets([...targets, { region: '', university: '', count: 5 }]);
  };

  const handleRemoveTarget = (index: number) => {
      const newTargets = targets.filter((_, i) => i !== index);
      setTargets(newTargets.length ? newTargets : [{ region: '', university: '', count: 5 }]);
  };

  const handleTargetChange = (index: number, field: keyof TargetOption, value: string | number) => {
      const newTargets = [...targets];
      newTargets[index] = { ...newTargets[index], [field]: value };
      setTargets(newTargets);
  };

  const handleMatch = async () => {
    // Validation: Student Profile is now REQUIRED
    if (!studentProfile.trim()) {
      setError("请填写【个人背景】（研究兴趣），以便为您匹配合适的导师。");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const matches = await generateFacultyMatches({
        studentProfile,
        directoryUrl,
        targets,
        department,
        manualContent,
        targetPosition,
        entryYear,
        scholarship,
        exclusions,
        businessInfo
      });
      
      setResults(matches);
      if (matches.length === 0) {
        setError("未找到匹配的教授。请尝试放宽筛选条件（如职位要求）或提供更具体的背景信息。");
      }
    } catch (err) {
      console.error(err);
      setError("分析过程中发生错误，请检查网络连接或稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  // Helper for Excel Export formatting
  const formatSourceField = (data?: SourceData) => {
      if (!data) return "N/A";
      if (!data.sourceUrl) return data.value;
      return `${data.value} [Source: ${data.sourceUrl}]`;
  };

  const handleExportCSV = () => {
    if (!results || results.length === 0) return;

    // BOM for UTF-8 in Excel
    const BOM = "\uFEFF";
    
    // Headers as requested
    const headers = [
        "学校名称 (中英文)", 
        "QS排名 [Source: URL]",
        "截止日期 [Source: URL]",
        "专业",
        "链接 (项目)",
        "申请要求 [Source: URL]",
        "RP要求 [Source: URL]",
        "导师姓名",
        "导师职称",
        "导师研究方向",
        "导师论文 (Top 3)",
        "导师主页 [Source: URL]",
        "匹配理由",
        "邮箱",
        "官网 (大学)",
        "学费 [Source: URL]",
        "奖学金 [Source: URL]"
    ];

    const csvRows = [headers.join(",")];

    results.forEach(prof => {
        const top3Papers = (prof.recentActivities || []).slice(0, 3).map(a => a.replace(/,/g, ' ')).join("; ");
        
        const row = [
            `"${(prof.university || "").replace(/"/g, '""')}"`,
            `"${formatSourceField(prof.qsRankingData).replace(/"/g, '""')}"`,
            `"${formatSourceField(prof.deadlineData).replace(/"/g, '""')}"`,
            `"${(department || "General").replace(/"/g, '""')}"`,
            `"${(prof.programUrl || "").replace(/"/g, '""')}"`,
            `"${formatSourceField(prof.applicationReqsData).replace(/"/g, '""')}"`,
            `"${formatSourceField(prof.rpReqsData).replace(/"/g, '""')}"`,
            `"${(prof.name || "").replace(/"/g, '""')}"`,
            `"${(prof.title || "").replace(/"/g, '""')}"`,
            `"${(prof.researchAreas || []).join("; ").replace(/"/g, '""')}"`,
            `"${top3Papers.replace(/"/g, '""')}"`,
            `"${formatSourceField({ value: "主页链接", sourceUrl: prof.profileUrl || "" }).replace(/"/g, '""')}"`,
            `"${(prof.alignmentDetails || "").replace(/"/g, '""')}"`,
            `"${(prof.email || "").replace(/"/g, '""')}"`,
            `"${(prof.universityUrl || "").replace(/"/g, '""')}"`,
            `"${formatSourceField(prof.tuitionData).replace(/"/g, '""')}"`,
            `"${formatSourceField(prof.scholarshipData).replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ScholarSync_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Database Actions
  const handleSaveToDatabase = (prof: FacultyMember) => {
    if (onAddFacultyToDatabase) {
      // Infer country from targets or default to 'Unknown'
      // Ideally we should parse country from university or have AI return it
      const country = targets.find(t => prof.university.includes(t.university) || t.region)?.region || '未分类';
      const field = department || '未分类';
      onAddFacultyToDatabase(prof, country, field);
      // Could show toast here
    }
  };

  const handleLinkToClient = (prof: FacultyMember) => {
    if (!activeClientId) {
      alert("请先在左侧选择要关联的学生");
      return;
    }
    if (onAddFacultyToDatabase && onLinkFacultyToClient) {
      const country = targets.find(t => prof.university.includes(t.university) || t.region)?.region || '未分类';
      const field = department || '未分类';
      const facultyId = onAddFacultyToDatabase(prof, country, field);
      onLinkFacultyToClient(facultyId, activeClientId);
      // Could show toast here
    }
  };

  const handleBatchSave = () => {
    if (!results) return;
    results.forEach(prof => handleSaveToDatabase(prof));
    alert(`已将 ${results.length} 位导师保存到数据库`);
  };

  const handleBatchLink = () => {
    if (!activeClientId) {
       alert("请先在左侧选择要关联的学生");
       return;
    }
    if (!results) return;
    results.forEach(prof => handleLinkToClient(prof));
    alert(`已将 ${results.length} 位导师推荐给当前学生`);
  };

  // Check if faculty is already in DB
  const isFacultyInDB = (prof: FacultyMember) => {
    return facultyDatabase?.some(f => 
      f.name === prof.name && f.university === prof.university
    );
  };

  // Check if faculty is linked to current client
  const isFacultyLinked = (prof: FacultyMember) => {
    if (!activeClientId) return false;
    const record = facultyDatabase?.find(f => 
      f.name === prof.name && f.university === prof.university
    );
    return record?.linkedClientIds?.includes(activeClientId);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left Sidebar: Input Form */}
      <div className="w-[400px] bg-white border-r border-gray-100 flex flex-col h-full overflow-y-auto custom-scrollbar shrink-0 z-10 shadow-sm">
        <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-20">
           <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
             <Search className="w-5 h-5 text-blue-600" />
             学术导师智能检索
           </h2>
           <p className="text-xs text-gray-500 mt-1">
             根据您的研究兴趣，为您量化评估并推荐最佳导师。
           </p>
        </div>
        
        <div className="p-6 space-y-6">
            {/* Client Selector */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">
                    当前服务学生 (可选)
                </label>
                <select 
                    value={activeClientId}
                    onChange={(e) => setActiveClientId(e.target.value)}
                    className="w-full p-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-blue-900"
                >
                    <option value="">-- 未选择 (仅检索) --</option>
                    {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                </select>
                {activeClientId && (
                    <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                        <User size={12} />
                        将自动关联推荐结果到此学生档案
                    </p>
                )}
            </div>

            {/* Smart Import Section */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-100 shadow-sm">
                <div 
                    className="flex justify-between items-center cursor-pointer mb-2"
                    onClick={() => setShowSmartFill(!showSmartFill)}
                >
                    <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                        <Sparkles size={14} /> 智能导入需求文本
                    </h3>
                    <span className="text-indigo-400 text-xs">{showSmartFill ? '收起' : '展开'}</span>
                </div>
                
                {showSmartFill && (
                    <div className="animate-fade-in space-y-3">
                        <textarea
                            className="w-full h-24 p-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none text-xs text-gray-600 placeholder-gray-300 resize-none"
                            placeholder="在此粘贴您的整段需求文本（如：周宇，中南财经政法大学，意向美国和澳洲...）"
                            value={rawRequirementText}
                            onChange={(e) => setRawRequirementText(e.target.value)}
                        />
                        <button
                            onClick={handleSmartFill}
                            disabled={isParsing || !rawRequirementText.trim()}
                            className="w-full py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {isParsing ? (
                                <span className="animate-pulse">正在解析...</span>
                            ) : (
                                <><span>⚡</span> AI 一键识别并填充表单</>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Section 1: Target Info */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500 relative overflow-hidden group hover:shadow-md transition-shadow">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
                    目标定位 <span className="text-gray-400 text-xs font-normal">(可选)</span>
                </h3>
                
                <div className="space-y-4">
                    <p className="text-xs text-gray-400 mb-2">添加多行以支持不同国家/地区的特定人数要求。</p>
                    
                    {targets.map((target, index) => (
                        <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-xl relative">
                             {targets.length > 1 && (
                                <button 
                                    onClick={() => handleRemoveTarget(index)}
                                    className="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-red-500 rounded-full p-1 shadow border border-gray-200 z-10"
                                    title="删除此行"
                                >
                                    <Trash2 size={12} />
                                </button>
                             )}
                             <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">国家/地区</label>
                                        <input 
                                            type="text"
                                            placeholder="如: 美国"
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                                            value={target.region}
                                            onChange={(e) => handleTargetChange(index, 'region', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">数量</label>
                                        <input 
                                            type="number"
                                            min="1"
                                            max="20"
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                                            value={target.count}
                                            onChange={(e) => handleTargetChange(index, 'count', parseInt(e.target.value) || 5)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">指定院校 (可选)</label>
                                    <input 
                                        type="text"
                                        placeholder="如: Top 50, Harvard..."
                                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                                        value={target.university}
                                        onChange={(e) => handleTargetChange(index, 'university', e.target.value)}
                                    />
                                </div>
                             </div>
                        </div>
                    ))}
                    
                    <button 
                        onClick={handleAddTarget}
                        className="w-full py-2 border-2 border-dashed border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:border-blue-300 hover:text-blue-600 transition-colors flex items-center justify-center gap-1"
                    >
                        <Plus size={14} /> 添加目标区域
                    </button>

                    <div className="pt-2 border-t border-gray-100">
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">学院/系</label>
                            <input 
                                type="text"
                                placeholder="CS, EE..."
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                            />
                        </div>
                         <div className="mt-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">目标导师职称</label>
                            <input 
                                type="text"
                                placeholder="默认为【仅限正教授】。如需副教授请注明。"
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all"
                                value={targetPosition}
                                onChange={(e) => setTargetPosition(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">或者提供 URL</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">官网链接</label>
                        <input 
                            type="text"
                            placeholder="https://..."
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all"
                            value={directoryUrl}
                            onChange={(e) => setDirectoryUrl(e.target.value)}
                        />
                    </div>
                    
                     {/* Manual Text Toggle */}
                    <div>
                         <button 
                            onClick={() => setShowManualInput(!showManualInput)}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mt-2 font-medium"
                        >
                            {showManualInput ? '- 收起手动文本框' : '+ 网页无法读取？手动粘贴'}
                        </button>
                        {showManualInput && (
                            <textarea
                                className="w-full h-32 mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs shadow-inner"
                                placeholder="在此处粘贴网页全文..."
                                value={manualContent}
                                onChange={(e) => setManualContent(e.target.value)}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Section 2: Student Profile (Required) */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500 relative overflow-hidden group hover:shadow-md transition-shadow">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
                    个人背景 <span className="text-red-500 text-xs">*</span>
                </h3>
                <textarea
                    className="w-full h-36 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-sm transition-all shadow-inner placeholder-gray-400"
                    placeholder="请详细描述您的研究兴趣、意向课题或背景（例如：我对深度强化学习在机器人控制中的应用感兴趣，特别是多智能体协作方向...）"
                    value={studentProfile}
                    onChange={(e) => setStudentProfile(e.target.value)}
                />
            </div>

            {/* Section 3: Application & Business Info */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500 relative overflow-hidden group hover:shadow-md transition-shadow">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
                    申请与业务信息
                </h3>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">入学年份</label>
                            <input 
                                type="text"
                                placeholder="如: 27fall"
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                value={entryYear}
                                onChange={(e) => setEntryYear(e.target.value)}
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">奖学金需求</label>
                            <input 
                                type="text"
                                placeholder="如: 全奖, CSC"
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                value={scholarship}
                                onChange={(e) => setScholarship(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 text-red-400">避雷 / 排除列表 (❌)</label>
                        <input 
                            type="text"
                            placeholder="如: 避开爱丁堡大学, 避开之前的导师..."
                            className="w-full p-2.5 bg-red-50 border border-red-100 rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none text-sm placeholder-red-200 text-red-800"
                            value={exclusions}
                            onChange={(e) => setExclusions(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">业务备注 (内部用)</label>
                        <input 
                            type="text"
                            placeholder="如: Jennifer, Round 1, DDL 11.28"
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            value={businessInfo}
                            onChange={(e) => setBusinessInfo(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <button
              onClick={handleMatch}
              disabled={loading}
              className={`w-full py-3 px-6 rounded-xl font-bold text-white shadow-sm transition-all transform active:scale-95 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin h-5 w-5 text-white" />
                  AI 正在智能分析...
                </span>
              ) : (
                '开始智能匹配'
              )}
            </button>
            
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="leading-snug">{error}</div>
              </div>
            )}
            
            <div className="h-8"></div> {/* Spacer */}
        </div>
      </div>

      {/* Right Column: Results */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
         <div className="max-w-5xl mx-auto space-y-6">
             <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">推荐导师列表</h3>
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                        {targets.some(t => t.region || t.university) ? `多区域定向搜索 (共需约 ${targets.reduce((acc, t) => acc + (t.count||5), 0)} 人)` : "🔍 模式: 全球搜索"}
                    </p>
                </div>
                
                <div className="flex gap-2">
                    {results && (
                        <>
                            <button
                                onClick={handleBatchSave}
                                className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <Star size={16} />
                                收藏全部
                            </button>
                            {activeClientId && (
                                <button
                                    onClick={handleBatchLink}
                                    className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-100 transition-colors flex items-center gap-2"
                                >
                                    <UserPlus size={16} />
                                    推荐全部给学生
                                </button>
                            )}
                            <button
                                onClick={handleExportCSV}
                                className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                                <FileSpreadsheet size={16} />
                                导出 Excel
                            </button>
                        </>
                    )}
                    {results && <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center">已优选 {results.length} 位</span>}
                </div>
             </div>
             
             {!results && !loading && (
                <div className="flex flex-col items-center justify-center h-[60vh] text-gray-300 select-none border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                        <Search className="w-10 h-10 text-gray-300" />
                    </div>
                    <p className="text-lg font-medium text-gray-400">等待输入...</p>
                    <p className="text-sm mt-2 text-gray-300">系统将自动分析您的背景，识别意向学校。</p>
                </div>
            )}

            {loading && (
                 <div className="space-y-8">
                     {[1,2].map(i => (
                         <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 h-96 animate-pulse flex flex-col gap-6">
                             <div className="flex justify-between items-start">
                                 <div className="space-y-3 w-1/2">
                                     <div className="h-8 bg-gray-100 w-2/3 rounded-lg"></div>
                                     <div className="h-4 bg-gray-100 w-1/2 rounded"></div>
                                 </div>
                                 <div className="h-8 bg-gray-100 w-16 rounded-lg"></div>
                             </div>
                             <div className="h-32 bg-gray-50 rounded-xl border border-gray-100"></div>
                             <div className="space-y-2">
                                 <div className="h-3 bg-gray-100 w-full rounded"></div>
                                 <div className="h-3 bg-gray-100 w-5/6 rounded"></div>
                             </div>
                         </div>
                     ))}
                 </div>
            )}

            {results && results.map((prof, idx) => (
              <div key={idx}>
                <FacultyCard 
                    prof={prof}
                    onSave={handleSaveToDatabase}
                    onLink={activeClientId ? handleLinkToClient : undefined}
                    isSaved={isFacultyInDB(prof)}
                    isLinked={isFacultyLinked(prof)}
                />
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default FacultyMatcher;
