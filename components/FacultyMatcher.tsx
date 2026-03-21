import React, { useState, useEffect } from 'react';
import { FacultyMember, TargetOption, SourceData, Client, FacultyRecord } from '../types';
import { generateFacultyMatches, generateFacultyMatchesDecomposed, parseRequirementText, parseClientFile, scoreFacultyFromDatabase, extractKeywords, type DimensionResult, type DecomposedSearchResult } from '../services/geminiService';
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
  User,
  Upload,
  FileText,
  CheckCircle2,
  X
} from 'lucide-react';

interface FacultyMatcherProps {
  clients?: Client[];
  selectedClient?: Client | null;
  facultyDatabase?: FacultyRecord[];
  onAddFacultyToDatabase?: (faculty: FacultyMember, country: string, fieldCategory: string) => string;
  onLinkFacultyToClient?: (facultyId: string, clientId: string) => void;
  onUpdateClient?: (client: Client) => void;
  onAddClient?: (name: string, parsedData: Partial<Client>) => void;
}

const FacultyMatcher: React.FC<FacultyMatcherProps> = ({
  clients = [],
  selectedClient = null,
  facultyDatabase = [],
  onAddFacultyToDatabase,
  onLinkFacultyToClient,
  onUpdateClient,
  onAddClient
}) => {
  // Smart Import State
  const [rawRequirementText, setRawRequirementText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [showSmartFill, setShowSmartFill] = useState(true);

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsedClientData, setParsedClientData] = useState<Partial<Client> | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
  
  // Search Scope States
  const [useDatabase, setUseDatabase] = useState(true);
  const [useWebSearch, setUseWebSearch] = useState(true);
  
  // UI States
  const [results, setResults] = useState<FacultyMember[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  // Niche/Interdisciplinary Search States
  const [isNicheMode, setIsNicheMode] = useState(false);
  const [nicheReasoning, setNicheReasoning] = useState('');
  const [dimensionResults, setDimensionResults] = useState<DimensionResult[]>([]);

  // Client Selection State (Local override if needed, but primarily driven by props)
  const [activeClientId, setActiveClientId] = useState<string>(selectedClient?.id || '');

  // Effect to sync selected client to local state
  useEffect(() => {
    if (selectedClient) {
      setActiveClientId(selectedClient.id);
      // Pre-fill form with client data
      applyParsedData(selectedClient);
    }
  }, [selectedClient]);

  const handleClientChange = (clientId: string) => {
    setActiveClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      applyParsedData(client);
      setToast(`已加载学生档案: ${client.name}`);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleSmartFill = async () => {
    if (!rawRequirementText.trim()) return;
    
    setIsParsing(true);
    try {
        const parsed = await parseRequirementText(rawRequirementText);
        applyParsedData(parsed);
    } catch (e) {
        console.error(e);
        setError("解析需求失败，请重试");
    } finally {
        setIsParsing(false);
    }
  };

  const applyParsedData = (data: Partial<Client> | any) => {
    // 1. Student Profile: Combine ALL available fields for a comprehensive background
    const parts = [];
    
    if (data.profileSummary) {
      parts.push(`【个人简介】\n${data.profileSummary}`);
    }
    
    // Basic Info
    const basicInfo = [];
    if (data.name) basicInfo.push(`姓名: ${data.name}`);
    if (data.university) basicInfo.push(`当前/毕业院校: ${data.university}`);
    if (data.gpa) basicInfo.push(`GPA: ${data.gpa}`);
    if (basicInfo.length > 0) parts.push(`【基本信息】\n${basicInfo.join(' | ')}`);
    
    // Education History
    if (data.educations && data.educations.length > 0) {
      const eduStr = data.educations.map((e: any) => 
        `- ${e.school} | ${e.major} | ${e.degree}${e.gpa ? ` | GPA: ${e.gpa}` : ''}`
      ).join('\n');
      parts.push(`【教育背景】\n${eduStr}`);
    }
    
    // Research & Publications
    if (data.researchPapers && data.researchPapers.length > 0) {
      const paperStr = data.researchPapers.map((p: any) => 
        `- ${p.title} (${p.journal || '未知期刊'}, ${p.date || '未知时间'})`
      ).join('\n');
      parts.push(`【发表论文/研究项目】\n${paperStr}`);
    }
    
    const researchDetails = [];
    if (data.rpTopic) researchDetails.push(`RP题目: ${data.rpTopic}`);
    if (data.interests) researchDetails.push(`研究兴趣: ${data.interests}`);
    if (data.academicAchievements) researchDetails.push(`学术成就: ${data.academicAchievements}`);
    if (researchDetails.length > 0) parts.push(`【研究详情】\n${researchDetails.join('\n')}`);
    
    // Work & Experience
    if (data.works && data.works.length > 0) {
      const workStr = data.works.map((w: any) => 
        `- ${w.company} | ${w.position} (${w.startDate || ''} - ${w.endDate || ''})`
      ).join('\n');
      parts.push(`【工作/实习经历】\n${workStr}`);
    }
    
    // Awards
    if (data.awards && data.awards.length > 0) {
      const awardStr = data.awards.map((a: any) => `- ${a.name} (${a.date || ''})`).join('\n');
      parts.push(`【获奖荣誉】\n${awardStr}`);
    }
    
    // Other Qualities
    const otherDetails = [];
    if (data.skillsAndQualities) otherDetails.push(`技能与素质: ${data.skillsAndQualities}`);
    if (data.extracurriculars) otherDetails.push(`课外活动: ${data.extracurriculars}`);
    if (data.careerAspirations) otherDetails.push(`职业抱负: ${data.careerAspirations}`);
    if (data.experiencesAndChallenges) otherDetails.push(`经历与挑战: ${data.experiencesAndChallenges}`);
    if (data.growthAndDevelopment) otherDetails.push(`成长与发展: ${data.growthAndDevelopment}`);
    if (otherDetails.length > 0) parts.push(`【其他背景】\n${otherDetails.join('\n')}`);
    
    // Preferences
    const prefs = [];
    if (data.rankingPreference) prefs.push(`排名偏好: ${data.rankingPreference}`);
    if (data.specialRequirements) prefs.push(`特殊要求: ${data.specialRequirements}`);
    if (data.acceptCrossDiscipline !== undefined) prefs.push(`接受交叉学科: ${data.acceptCrossDiscipline ? '是' : '否'}`);
    if (prefs.length > 0) parts.push(`【申请偏好】\n${prefs.join('\n')}`);
    
    const profile = parts.join('\n\n');
    setStudentProfile(profile || '');

    setDepartment(data.targetDepartment || data.department || '');
    setTargetPosition(data.targetPosition || '');
    setEntryYear(data.entryYear || '');
    setScholarship(data.scholarshipRequirement || data.scholarship || '');
    setExclusions(data.exclusions || '');
    
    // Business Info
    const bizInfo = data.businessInfo || 
                   (data.businessCoordinator ? `${data.businessCoordinator}${data.selectionDeadline ? `, DDL: ${data.selectionDeadline}` : ''}${data.selectionType ? `, 类型: ${data.selectionType}` : ''}` : '');
    setBusinessInfo(bizInfo);
    
    // 2. Targets: Split target countries into separate target options
    if (data.targets && data.targets.length > 0) {
        setTargets(data.targets);
    } else if (data.targetCountries || data.targetUniversities) {
        const countriesStr = data.targetCountries || '';
        // Split by common Chinese and English delimiters, including "和", "与", "and"
        const countries = countriesStr.split(/[、，,；;\s和与]|and/i).filter((c: string) => c.trim().length > 0);
        
        if (countries.length > 0) {
            const newTargets = countries.map((country: string) => ({
                region: country.trim(),
                university: data.targetUniversities || '',
                count: data.selectionCount || 5
            }));
            setTargets(newTargets);
        } else if (data.targetUniversities) {
            setTargets([{
                region: '',
                university: data.targetUniversities,
                count: data.selectionCount || 5
            }]);
        }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        try {
          const data = await parseClientFile(result, file.type);
          setParsedClientData(data);
          applyParsedData(data);
          setToast("文件解析成功，表单已自动填充");
          setTimeout(() => setToast(null), 3000);
        } catch (err) {
          console.error("Parsing failed", err);
          setUploadError("解析失败，请重试");
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("File reading failed", err);
      setUploadError("文件读取失败");
      setIsUploading(false);
    }
  };

  const handleCreateClient = () => {
    if (!onAddClient) return;
    
    const name = parsedClientData?.name || `新学生_${new Date().toLocaleDateString()}`;
    const clientData: Partial<Client> = {
      ...parsedClientData,
      interests: studentProfile,
      targetDepartment: department,
      entryYear: entryYear,
      scholarshipRequirement: scholarship,
      exclusions: exclusions,
      targetCountries: targets[0]?.region,
      targetUniversities: targets[0]?.university,
      selectionCount: targets[0]?.count
    };

    onAddClient(name, clientData);
    setToast(`已成功创建学生档案: ${name}`);
    setTimeout(() => setToast(null), 3000);
    setParsedClientData(null);
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
    setIsNicheMode(false);
    setDimensionResults([]);

    try {
      let localResults: FacultyMember[] = [];
      let webResults: FacultyMember[] = [];
      let totalCountNeeded = targets.reduce((sum, t) => sum + (t.count || 5), 0) || 10;

      if (useDatabase && facultyDatabase && facultyDatabase.length > 0) {
        // Use AI to extract high-quality keywords for better filtering
        let keywords: string[] = [];
        try {
          keywords = await extractKeywords(studentProfile, department);
        } catch (e) {
          console.warn("Keyword extraction failed, falling back to simple split", e);
          keywords = [...department.split(/[,，、+&\s]+|(?:和|与|AND)/gi), ...studentProfile.split(/\s+/).slice(0, 20)].map(k => k.toLowerCase()).filter(k => k.length > 2);
        }

        localResults = facultyDatabase.filter(f => {
           let matchesTarget = targets.length === 0 || targets.some(t => {
             const regionMatch = !t.region || f.country?.toLowerCase().includes(t.region.toLowerCase());
             const uniMatch = !t.university || f.university?.toLowerCase().includes(t.university.toLowerCase());
             return regionMatch && uniMatch;
           });
           if (!matchesTarget) return false;

           const textToSearch = `${f.name} ${f.university} ${f.department} ${f.researchAreas.join(' ')} ${f.alignmentDetails} ${f.fieldCategory} ${f.subFieldCategory || ''}`.toLowerCase();
           return keywords.some(k => textToSearch.includes(k.toLowerCase()));
        });

        // Sort by number of keyword matches (simple relevance)
        localResults.sort((a, b) => {
          const textA = `${a.name} ${a.university} ${a.department} ${a.researchAreas.join(' ')} ${a.alignmentDetails}`.toLowerCase();
          const textB = `${b.name} ${b.university} ${b.department} ${b.researchAreas.join(' ')} ${b.alignmentDetails}`.toLowerCase();
          const scoreA = keywords.filter(k => textA.includes(k.toLowerCase())).length;
          const scoreB = keywords.filter(k => textB.includes(k.toLowerCase())).length;
          return scoreB - scoreA;
        });

        // Take a larger pool for AI scoring (e.g., top 20 or 2x needed)
        const poolSize = Math.max(20, totalCountNeeded * 2);
        let topLocalCandidates = localResults.slice(0, poolSize);

        // If we have local results, use AI to score them properly against the student profile
        if (topLocalCandidates.length > 0) {
          try {
            topLocalCandidates = await scoreFacultyFromDatabase(studentProfile, department, topLocalCandidates);
            // Re-sort based on AI match score
            topLocalCandidates.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
            localResults = topLocalCandidates.slice(0, totalCountNeeded).map(f => ({ ...f, isFromDatabase: true }));
          } catch (e) {
            console.error("AI scoring for local database failed, falling back to keyword scores", e);
            localResults = topLocalCandidates.slice(0, totalCountNeeded).map(f => ({ ...f, isFromDatabase: true }));
          }
        }
      }

      let remainingCount = totalCountNeeded - localResults.length;

      if (useWebSearch && remainingCount > 0) {
        const adjustedTargets = targets.map(t => ({...t, count: Math.ceil((t.count || 5) * (remainingCount / totalCountNeeded))}));
        
        const decomposed = await generateFacultyMatchesDecomposed({
          studentProfile,
          directoryUrl,
          targets: adjustedTargets,
          department,
          manualContent,
          targetPosition,
          entryYear,
          scholarship,
          exclusions,
          businessInfo
        });
        
        setIsNicheMode(decomposed.isNiche);
        setNicheReasoning(decomposed.reasoning);
        setDimensionResults(decomposed.dimensions);
        webResults = decomposed.allFaculty;
      }

      const combinedResults = [...localResults];
      
      // Deduplicate web results against local results based on name and university
      // AND mark web results that exist in the database even if not found by local search
      const uniqueWebResults = webResults.filter(webProf => {
        const isInLocalResults = localResults.some(localProf => 
          localProf.name.toLowerCase() === webProf.name.toLowerCase() && 
          localProf.university.toLowerCase() === webProf.university.toLowerCase()
        );
        
        if (isInLocalResults) return false;
        
        // Check if it exists in the full database even if not in localResults (which were filtered by keywords)
        const isInFullDatabase = useDatabase && facultyDatabase && facultyDatabase.some(dbProf => 
          dbProf.name.toLowerCase() === webProf.name.toLowerCase() && 
          dbProf.university.toLowerCase() === webProf.university.toLowerCase()
        );
        
        if (isInFullDatabase) {
          webProf.isFromDatabase = true;
        }
        
        return true;
      });
      
      combinedResults.push(...uniqueWebResults);

      // Final sort by match score if available, otherwise keep local first then web
      combinedResults.sort((a, b) => {
          const scoreA = a.matchScore ?? 0;
          const scoreB = b.matchScore ?? 0;
          if (scoreA !== scoreB) {
              return scoreB - scoreA; // Descending order
          }
          return 0;
      });

      setResults(combinedResults);
      
      if (combinedResults.length === 0) {
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
  const formatSourceField = (data?: SourceData | SourceData[]) => {
    if (!data) return "N/A";
    if (Array.isArray(data)) {
      if (data.length === 0) return "N/A";
      return data.map(d => `${d.value} [Source: ${d.sourceUrl || 'N/A'}]`).join(" | ");
    }
    if (typeof data === 'string') return data;
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
      // Infer country: Priority 1: Exact university match in targets, Priority 2: matchReasoning locationCheck, Priority 3: first target region, Priority 4: default
      const country = targets.find(t => t.university && prof.university.toLowerCase().includes(t.university.toLowerCase()))?.region 
        || prof.matchReasoning?.locationCheck 
        || targets[0]?.region 
        || '未分类';
      
      const field = prof.department || department || '未分类';
      onAddFacultyToDatabase(prof, country, field);
      
      setSavedNames(prev => new Set(prev).add(prof.name));
      setToast(`已将 ${prof.name} 保存到导师库`);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleLinkToClient = (prof: FacultyMember) => {
    if (!activeClientId) {
      setToast("请先在左侧选择要关联的学生");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (onAddFacultyToDatabase && onLinkFacultyToClient) {
      const country = targets.find(t => t.university && prof.university.toLowerCase().includes(t.university.toLowerCase()))?.region 
        || prof.matchReasoning?.locationCheck 
        || targets[0]?.region 
        || '未分类';
        
      const field = prof.department || department || '未分类';
      const facultyId = onAddFacultyToDatabase(prof, country, field);
      onLinkFacultyToClient(facultyId, activeClientId);
      
      setSavedNames(prev => new Set(prev).add(prof.name));
      setToast(`已将 ${prof.name} 推荐给当前学生`);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleBatchSave = () => {
    if (!results) return;
    let savedCount = 0;
    results.forEach(prof => {
        if (!isFacultyInDB(prof) && !savedNames.has(prof.name)) {
            handleSaveToDatabase(prof);
            savedCount++;
        }
    });
    setToast(`已将 ${savedCount} 位新导师保存到数据库`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleBatchLink = () => {
    if (!activeClientId) {
       setToast("请先在左侧选择要关联的学生");
       setTimeout(() => setToast(null), 3000);
       return;
    }
    if (!results) return;
    let linkedCount = 0;
    results.forEach(prof => {
        if (!isFacultyLinked(prof)) {
            handleLinkToClient(prof);
            linkedCount++;
        }
    });
    setToast(`已将 ${linkedCount} 位导师推荐给当前学生`);
    setTimeout(() => setToast(null), 3000);
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
    <div className="flex h-screen bg-transparent overflow-hidden font-sans">
      {/* Left Sidebar: Input Form */}
      <div className="w-[400px] xl:w-[400px] lg:w-[340px] md:w-[300px] glass border-r border-white/50 flex flex-col h-full overflow-y-auto custom-scrollbar shrink-0 z-10 shadow-sm">
        <div className="p-6 border-b border-white/50 bg-white/40 sticky top-0 z-20 backdrop-blur-md">
           <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2 tracking-tight">
             <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md shadow-blue-500/20">
               <Search className="w-4 h-4 text-white" />
             </div>
             智能导师检索
           </h2>
           <p className="text-[11px] text-gray-500 mt-1.5 font-medium leading-relaxed">
             基于 AI 深度分析研究兴趣，量化评估并推荐全球最佳导师。
           </p>
        </div>
        
        <div className="p-6 space-y-8">
            {/* Client Selector & File Upload */}
            <div className="bg-white/40 backdrop-blur-sm p-4 rounded-3xl border border-white/50 shadow-sm space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                        服务对象
                    </label>
                    <div className="flex gap-2">
                        <select 
                            value={activeClientId}
                            onChange={(e) => handleClientChange(e.target.value)}
                            className="flex-1 p-2.5 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-gray-900 transition-all appearance-none cursor-pointer shadow-sm font-medium"
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0\' stroke=\'%236B7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                        >
                            <option value="">-- 仅检索 (不关联) --</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="p-2.5 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl text-blue-600 hover:bg-white/80 transition-all shadow-sm active:scale-95"
                            title="上传学生简历/文档"
                        >
                            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        </button>
                        <input 
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                            accept=".pdf,.doc,.docx,.txt,image/*"
                        />
                    </div>
                </div>

                {uploadError && (
                    <div className="p-2.5 bg-red-50/80 backdrop-blur-sm text-red-700 text-[10px] rounded-xl border border-red-200/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 shadow-sm font-bold">
                        <AlertCircle size={12} /> {uploadError}
                    </div>
                )}

                {parsedClientData && !activeClientId && (
                    <div className="p-3 bg-emerald-50/80 backdrop-blur-sm rounded-xl border border-emerald-200/50 flex items-center justify-between animate-in zoom-in-95 duration-300 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                                <CheckCircle2 size={12} className="text-white" />
                            </div>
                            <span className="text-xs text-emerald-800 font-bold">识别到: {parsedClientData.name}</span>
                        </div>
                        <button 
                            onClick={handleCreateClient}
                            className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-[10px] font-bold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                        >
                            创建档案
                        </button>
                    </div>
                )}

                {activeClientId && (
                    <div className="text-[10px] text-blue-600 flex items-center gap-1.5 px-1 font-bold">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-sm shadow-blue-500/50"></div>
                        推荐结果将自动同步至学生档案
                    </div>
                )}
            </div>

            {/* Smart Import Section */}
            {!activeClientId && (
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] rounded-[24px] shadow-lg shadow-indigo-500/20">
                  <div className="bg-white/90 backdrop-blur-xl rounded-[23px] p-5 space-y-4">
                      <div 
                          className="flex justify-between items-center cursor-pointer"
                          onClick={() => setShowSmartFill(!showSmartFill)}
                      >
                          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 tracking-tight">
                              <Sparkles size={14} className="text-indigo-500" /> AI 智能识别需求
                          </h3>
                          <div className="w-6 h-6 rounded-full bg-indigo-50/80 flex items-center justify-center text-indigo-400 transition-transform duration-300 shadow-sm border border-indigo-100/50" style={{ transform: showSmartFill ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                              <Plus size={14} className={showSmartFill ? 'rotate-45' : ''} />
                          </div>
                      </div>
                      
                      {showSmartFill && (
                          <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                              <textarea
                                  className="w-full h-28 p-4 bg-white/60 backdrop-blur-sm border border-indigo-100/50 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:outline-none text-xs text-gray-700 placeholder-gray-400 resize-none transition-all shadow-inner font-medium"
                                  placeholder="在此粘贴您的整段需求文本（如：周宇，中南财经政法大学，意向美国和澳洲...）"
                                  value={rawRequirementText}
                                  onChange={(e) => setRawRequirementText(e.target.value)}
                              />
                              <button
                                  onClick={handleSmartFill}
                                  disabled={isParsing || !rawRequirementText.trim()}
                                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-bold hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50"
                              >
                                  {isParsing ? (
                                      <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                      <><span>⚡</span> 一键识别并填充表单</>
                                  )}
                              </button>
                          </div>
                      )}
                  </div>
              </div>
            )}

            {/* Section 1: Target Info */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-blue-500 rounded-full shadow-sm shadow-blue-500/50"></div>
                        目标定位
                    </h3>
                    <span className="text-[10px] text-gray-400 font-bold">STEP 01</span>
                </div>
                
                <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-white/50 space-y-5">
                    <div className="space-y-4">
                        {targets.map((target, index) => (
                            <div key={index} className="p-4 bg-white/60 backdrop-blur-sm border border-white/50 rounded-2xl relative group/item shadow-sm">
                                 {targets.length > 1 && (
                                    <button 
                                        onClick={() => handleRemoveTarget(index)}
                                        className="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-red-500 rounded-full p-1.5 shadow-md border border-gray-100 z-10 opacity-0 group-hover/item:opacity-100 transition-all active:scale-95"
                                        title="删除此行"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                 )}
                                 <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5 px-1">国家/地区</label>
                                            <input 
                                                type="text"
                                                placeholder="如: 美国"
                                                className="w-full p-2.5 bg-white/80 backdrop-blur-sm border border-white/50 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                                                value={target.region}
                                                onChange={(e) => handleTargetChange(index, 'region', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5 px-1">数量</label>
                                            <input 
                                                type="number"
                                                min="1"
                                                max="20"
                                                className="w-full p-2.5 bg-white/80 backdrop-blur-sm border border-white/50 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                                                value={target.count}
                                                onChange={(e) => handleTargetChange(index, 'count', parseInt(e.target.value) || 5)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5 px-1">指定院校 (可选)</label>
                                        <input 
                                            type="text"
                                            placeholder="如: Top 50, Harvard..."
                                            className="w-full p-2.5 bg-white/80 backdrop-blur-sm border border-white/50 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all shadow-sm font-medium"
                                            value={target.university}
                                            onChange={(e) => handleTargetChange(index, 'university', e.target.value)}
                                        />
                                    </div>
                                 </div>
                            </div>
                        ))}
                        
                        <button 
                            onClick={handleAddTarget}
                            className="w-full py-3 border-2 border-dashed border-blue-200/50 bg-blue-50/30 text-blue-500 rounded-2xl text-[11px] font-bold hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                        >
                            <Plus size={14} /> 添加目标区域
                        </button>
                    </div>

                    <div className="space-y-4 pt-2">
                         <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 px-1">学院/系</label>
                            <input 
                                type="text"
                                placeholder="如: 钢琴、大提琴  或  机器学习+生物信息学"
                                className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-xs transition-all shadow-sm font-medium"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                            />
                            {department && /[,，、+&]|和|与/.test(department) && (
                              <div className="text-[9px] text-indigo-500 font-medium mt-1.5 px-1 flex items-center gap-1">
                                <Sparkles size={10} />
                                已识别为交叉学科模式：将寻找同时覆盖所有方向的导师
                              </div>
                            )}
                        </div>
                         <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 px-1">目标导师职称</label>
                            <input 
                                type="text"
                                placeholder="默认为【仅限正教授】"
                                className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-xs transition-all shadow-sm font-medium"
                                value={targetPosition}
                                onChange={(e) => setTargetPosition(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-white/50"></div>
                        <span className="flex-shrink-0 mx-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">OR</span>
                        <div className="flex-grow border-t border-white/50"></div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 px-1">官网链接</label>
                            <input 
                                type="text"
                                placeholder="https://..."
                                className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-xs transition-all shadow-sm font-medium"
                                value={directoryUrl}
                                onChange={(e) => setDirectoryUrl(e.target.value)}
                            />
                        </div>
                        
                        <div>
                             <button 
                                onClick={() => setShowManualInput(!showManualInput)}
                                className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-1 font-bold uppercase tracking-wider transition-all"
                            >
                                {showManualInput ? '收起手动输入' : '手动粘贴网页内容'}
                            </button>
                            {showManualInput && (
                                <textarea
                                    className="w-full h-32 mt-3 p-4 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 text-xs shadow-inner resize-none transition-all font-medium"
                                    placeholder="在此处粘贴网页全文..."
                                    value={manualContent}
                                    onChange={(e) => setManualContent(e.target.value)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: Student Profile (Required) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-indigo-500 rounded-full shadow-sm shadow-indigo-500/50"></div>
                        个人背景 <span className="text-red-500">*</span>
                    </h3>
                    <span className="text-[10px] text-gray-400 font-bold">STEP 02</span>
                </div>
                <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-1 shadow-sm border border-white/50">
                    <textarea
                        className="w-full h-40 p-5 bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-xs leading-relaxed text-gray-800 placeholder-gray-400 transition-all font-medium"
                        placeholder="请详细描述研究兴趣、意向课题或背景（例如：我对深度强化学习在机器人控制中的应用感兴趣...）"
                        value={studentProfile}
                        onChange={(e) => setStudentProfile(e.target.value)}
                    />
                </div>
            </div>

            {/* Section 3: Application & Business Info */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-purple-500 rounded-full shadow-sm shadow-purple-500/50"></div>
                        申请与业务
                    </h3>
                    <span className="text-[10px] text-gray-400 font-bold">STEP 03</span>
                </div>
                
                <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-white/50 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 px-1">入学年份</label>
                            <input 
                                type="text"
                                placeholder="如: 27fall"
                                className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-xs transition-all shadow-sm font-medium"
                                value={entryYear}
                                onChange={(e) => setEntryYear(e.target.value)}
                            />
                        </div>
                         <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 px-1">奖学金</label>
                            <input 
                                type="text"
                                placeholder="如: 全奖, CSC"
                                className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-xs transition-all shadow-sm font-medium"
                                value={scholarship}
                                onChange={(e) => setScholarship(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1.5 px-1">避雷 / 排除列表</label>
                        <input 
                            type="text"
                            placeholder="如: 避开爱丁堡大学..."
                            className="w-full p-3 bg-red-50/50 backdrop-blur-sm border border-red-200/50 rounded-xl focus:ring-2 focus:ring-red-500/30 focus:outline-none text-xs placeholder-red-300 text-red-800 transition-all shadow-sm font-medium"
                            value={exclusions}
                            onChange={(e) => setExclusions(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 px-1">业务备注</label>
                        <input 
                            type="text"
                            placeholder="如: Jennifer, DDL 11.28"
                            className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-xs transition-all shadow-sm font-medium"
                            value={businessInfo}
                            onChange={(e) => setBusinessInfo(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Section 4: Search Scope */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-emerald-500 rounded-full shadow-sm shadow-emerald-500/50"></div>
                        搜索范围
                    </h3>
                    <span className="text-[10px] text-gray-400 font-bold">STEP 04</span>
                </div>
                <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-white/50 space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${useDatabase ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                            {useDatabase && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={useDatabase} 
                            onChange={(e) => setUseDatabase(e.target.checked)} 
                        />
                        <span className="text-sm font-medium text-gray-700">导师库检索 (优先)</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${useWebSearch ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                            {useWebSearch && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={useWebSearch} 
                            onChange={(e) => setUseWebSearch(e.target.checked)} 
                        />
                        <span className="text-sm font-medium text-gray-700">联网搜索 (补充不足数量)</span>
                    </label>
                </div>
            </div>

            <div className="pt-4 pb-8">
                <button
                  onClick={handleMatch}
                  disabled={loading}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-white shadow-lg shadow-blue-200 transition-all transform active:scale-[0.97] disabled:opacity-50 disabled:shadow-none ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-3">
                      <Loader2 className="animate-spin h-5 w-5 text-white" />
                      AI 正在深度匹配中...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles size={18} />
                      开始智能匹配导师
                    </span>
                  )}
                </button>
                
                {error && (
                  <div className="mt-4 p-4 bg-red-50/80 backdrop-blur-sm text-red-600 text-xs rounded-2xl border border-red-100 flex items-start gap-3 animate-in slide-in-from-bottom-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="leading-relaxed font-medium">{error}</div>
                  </div>
                )}
            </div>
        </div>
      </div>

      {/* Right Column: Results */}
      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative bg-[#F2F2F7]">
         <div className="max-w-5xl mx-auto space-y-8">
             <div className="flex justify-between items-end mb-8">
                <div className="space-y-1">
                    <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">推荐导师列表</h3>
                    <div className="flex items-center gap-2">
                        <div className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            {targets.some(t => t.region || t.university) ? '定向搜索' : '全球搜索'}
                        </div>
                        <p className="text-xs text-gray-400 font-medium">
                            {targets.some(t => t.region || t.university) ? `共需约 ${targets.reduce((acc, t) => acc + (t.count||5), 0)} 人` : "系统已为您优选最匹配的学术资源"}
                        </p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    {results && (
                        <>
                            <button
                                onClick={handleBatchSave}
                                className="bg-white/80 backdrop-blur-md border border-gray-200 text-gray-700 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-sm hover:bg-white transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Star size={14} className="text-amber-400" />
                                收藏全部
                            </button>
                            {activeClientId && (
                                <button
                                    onClick={handleBatchLink}
                                    className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <UserPlus size={14} />
                                    一键推荐给学生
                                </button>
                            )}
                            <button
                                onClick={handleExportCSV}
                                className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <FileSpreadsheet size={14} />
                                导出报告
                            </button>
                        </>
                    )}
                    {results && (
                        <div className="bg-white/80 backdrop-blur-md border border-emerald-100 text-emerald-700 px-5 py-2.5 rounded-2xl text-xs font-bold shadow-sm flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            已优选 {results.length} 位
                        </div>
                    )}
                </div>
             </div>
             
             {!results && !loading && (
                <div className="flex flex-col items-center justify-center h-[65vh] text-gray-300 select-none bg-white/40 backdrop-blur-sm border-2 border-dashed border-gray-200 rounded-[40px] transition-all hover:bg-white/60">
                    <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-gray-200/50 border border-gray-50 transform -rotate-6">
                        <Search className="w-12 h-12 text-blue-500/20" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-400">准备就绪</h4>
                    <p className="text-sm mt-3 text-gray-300 font-medium max-w-xs text-center leading-relaxed">
                        请在左侧填写背景需求，AI 将为您深度检索全球学术资源。
                    </p>
                </div>
            )}

            {/* Niche Mode Panel */}
            {isNicheMode && results && results.length > 0 && (
              <div className="mb-6 bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-xl text-amber-600 shrink-0 mt-0.5">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 mb-1">🔬 稀缺方向智能拆解</h4>
                    <p className="text-xs text-amber-700 leading-relaxed mb-3">{nicheReasoning}</p>
                    <div className="flex flex-wrap gap-2">
                      {dimensionResults.map((dr, i) => (
                        <span key={i} className="px-3 py-1.5 bg-white/80 rounded-lg text-[10px] font-bold text-amber-800 border border-amber-200/50" title={dr.description}>
                          {dr.dimension} ({dr.faculty.length}人)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loading && (
                 <div className="space-y-8">
                     {[1,2].map(i => (
                         <div key={i} className="bg-white/60 backdrop-blur-md p-8 rounded-[32px] border border-white h-96 animate-pulse flex flex-col gap-8 shadow-sm">
                             <div className="flex justify-between items-start">
                                 <div className="space-y-4 w-1/2">
                                     <div className="h-10 bg-gray-200/50 w-3/4 rounded-xl"></div>
                                     <div className="h-5 bg-gray-200/50 w-1/2 rounded-lg"></div>
                                 </div>
                                 <div className="h-10 bg-gray-200/50 w-20 rounded-xl"></div>
                             </div>
                             <div className="h-40 bg-gray-100/30 rounded-2xl border border-gray-100/50"></div>
                             <div className="space-y-3">
                                 <div className="h-4 bg-gray-200/50 w-full rounded-lg"></div>
                                 <div className="h-4 bg-gray-200/50 w-4/5 rounded-lg"></div>
                             </div>
                         </div>
                     ))}
                 </div>
            )}

            {results && results.map((prof, idx) => {
              const enrichedProf = isNicheMode && (prof as any).dimensionTags 
                ? {
                  ...prof,
                  researchAreas: [
                    ...(prof as any).dimensionTags.map((t: string) => `📌 ${t}`),
                    ...prof.researchAreas
                  ]
                }
                : prof;
              return (
                <div key={idx}>
                  <FacultyCard 
                      prof={enrichedProf}
                      onSave={handleSaveToDatabase}
                      onLink={activeClientId ? handleLinkToClient : undefined}
                      isSaved={isFacultyInDB(prof) || savedNames.has(prof.name)}
                      isLinked={isFacultyLinked(prof)}
                  />
                </div>
              );
            })}
         </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-bold animate-in slide-in-from-bottom-4 duration-300">
          ✓ {toast}
        </div>
      )}
    </div>
  );
};

export default FacultyMatcher;
