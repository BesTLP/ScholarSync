
import React, { useState } from 'react';
import { FacultyMember, TargetOption } from '../types';
import { generateFacultyMatches, parseRequirementText } from '../services/geminiService';

const FacultyMatcher: React.FC = () => {
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

  // Helper component for checklist item in the report
  const AuditItem = ({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) => (
    <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
        <div className="flex-shrink-0 mt-0.5 text-slate-400 group-hover:text-blue-500 transition-colors">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
            <div className="text-sm text-slate-700 font-semibold leading-snug break-words">{value}</div>
        </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">学术导师智能检索</h2>
        <p className="text-gray-500">
          根据您的研究兴趣，为您量化评估并推荐最佳导师。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* NEW: Smart Import Section */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                <div 
                    className="flex justify-between items-center cursor-pointer mb-2"
                    onClick={() => setShowSmartFill(!showSmartFill)}
                >
                    <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                        <span>📋</span> 智能导入需求文本
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

            {/* Section 1: Target Info (Dynamic) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">1</span>
                    目标定位 <span className="text-gray-400 text-xs font-normal">(可选)</span>
                </h3>
                
                <div className="space-y-4">
                    <p className="text-xs text-gray-400 mb-2">添加多行以支持不同国家/地区的特定人数要求。</p>
                    
                    {/* Dynamic Target Rows */}
                    {targets.map((target, index) => (
                        <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-xl relative">
                             {targets.length > 1 && (
                                <button 
                                    onClick={() => handleRemoveTarget(index)}
                                    className="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-red-500 rounded-full p-1 shadow border border-gray-200 z-10"
                                    title="删除此行"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                    </svg>
                                </button>
                             )}
                             <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">国家/地区</label>
                                        <input 
                                            type="text"
                                            placeholder="如: 美国"
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
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
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
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
                                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                                        value={target.university}
                                        onChange={(e) => handleTargetChange(index, 'university', e.target.value)}
                                    />
                                </div>
                             </div>
                        </div>
                    ))}
                    
                    <button 
                        onClick={handleAddTarget}
                        className="w-full py-2 border-2 border-dashed border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1"
                    >
                        <span>+</span> 添加目标区域
                    </button>

                    <div className="pt-2 border-t border-gray-100">
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">学院/系</label>
                            <input 
                                type="text"
                                placeholder="CS, EE..."
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm transition-all"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                            />
                        </div>
                         <div className="mt-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">目标导师职称</label>
                            <input 
                                type="text"
                                placeholder="默认为【仅限正教授】。如需副教授请注明。"
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm transition-all"
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
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm transition-all"
                            value={directoryUrl}
                            onChange={(e) => setDirectoryUrl(e.target.value)}
                        />
                    </div>
                    
                     {/* Manual Text Toggle */}
                    <div>
                         <button 
                            onClick={() => setShowManualInput(!showManualInput)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 mt-2 font-medium"
                        >
                            {showManualInput ? '- 收起手动文本框' : '+ 网页无法读取？手动粘贴'}
                        </button>
                        {showManualInput && (
                            <textarea
                                className="w-full h-32 mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs shadow-inner"
                                placeholder="在此处粘贴网页全文..."
                                value={manualContent}
                                onChange={(e) => setManualContent(e.target.value)}
                            />
                        )}
                    </div>
                </div>
            </div>

             {/* Section 2: Student Profile (Required) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
                    个人背景 <span className="text-red-500 text-xs">*</span>
                </h3>
                <textarea
                    className="w-full h-36 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-sm transition-all shadow-inner placeholder-gray-400"
                    placeholder="请详细描述您的研究兴趣、意向课题或背景（例如：我对深度强化学习在机器人控制中的应用感兴趣，特别是多智能体协作方向...）"
                    value={studentProfile}
                    onChange={(e) => setStudentProfile(e.target.value)}
                />
            </div>

            {/* Section 3: Application & Business Info (New) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold">3</span>
                    申请与业务信息
                </h3>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">入学年份</label>
                            <input 
                                type="text"
                                placeholder="如: 27fall"
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                                value={entryYear}
                                onChange={(e) => setEntryYear(e.target.value)}
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">奖学金需求</label>
                            <input 
                                type="text"
                                placeholder="如: 全奖, CSC"
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
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
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                            value={businessInfo}
                            onChange={(e) => setBusinessInfo(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <button
              onClick={handleMatch}
              disabled={loading}
              className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-xl hover:shadow-blue-500/40'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AI 正在智能分析...
                </span>
              ) : (
                '开始智能匹配'
              )}
            </button>
            
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-2 animate-fade-in">
                <span className="text-lg mt-0.5">⚠️</span>
                <div className="leading-snug">{error}</div>
              </div>
            )}
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-8">
             <div className="bg-white rounded-[2rem] p-1 shadow-xl shadow-slate-200/50 border border-gray-100 min-h-[700px] flex flex-col">
                 <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[2rem] backdrop-blur-sm">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">推荐导师列表</h3>
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                            {targets.some(t => t.region || t.university) ? `多区域定向搜索 (共需约 ${targets.reduce((acc, t) => acc + (t.count||5), 0)} 人)` : "🔍 模式: 全球搜索"}
                        </p>
                    </div>
                    {results && <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">已优选 {results.length} 位</span>}
                 </div>
                 
                 <div className="flex-1 p-4 md:p-8 space-y-8 overflow-y-auto max-h-[900px] bg-slate-50/30 rounded-b-[2rem]">
                    {!results && !loading && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 select-none">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-300">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                                </svg>
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
                      <div key={idx} className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-[0_2px_8px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgb(0,0,0,0.08)] transition-all duration-300 group relative">
                         {/* QS Badge */}
                        {prof.qsRanking && (
                            <div className="absolute top-0 right-0 -mt-3 -mr-3 bg-amber-400 text-white text-xs font-bold px-3 py-1.5 rounded-bl-xl rounded-tr-xl shadow-md z-10 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                  <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                                </svg>
                                {prof.qsRanking}
                            </div>
                        )}

                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                            <div>
                                <div className="flex items-center gap-4 mb-2">
                                    <h4 className="text-2xl font-extrabold text-gray-900">
                                        {prof.name}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        {prof.profileUrl && (
                                            <a 
                                                href={prof.profileUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                                                title="访问个人主页"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                    <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                                                    <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                                                </svg>
                                                个人主页
                                            </a>
                                        )}
                                        {prof.email && (
                                            <a 
                                                href={`mailto:${prof.email}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-200 transition-all border border-gray-200"
                                                title={`Email: ${prof.email}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                    <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                                                    <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                                                </svg>
                                                联系邮箱
                                            </a>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <p className="text-sm text-gray-500 font-semibold uppercase tracking-wide">{prof.title}</p>
                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prof.isActive ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-rose-700 bg-rose-50 border border-rose-100'}`}>
                                        {prof.isActive ? '在职活跃' : '状态未知/离职'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {studentProfile.trim() && (
                                    <div className={`px-5 py-2 rounded-2xl text-base font-bold shadow-sm flex items-center gap-2 ${
                                        prof.matchScore >= 90 ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' :
                                        prof.matchScore >= 80 ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' :
                                        prof.matchScore >= 60 ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' :
                                        'bg-gray-200 text-gray-500'
                                    }`}>
                                        <span className="text-xs opacity-80 uppercase tracking-wider font-medium">Match</span>
                                        {prof.matchScore}%
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Research Areas Tags */}
                        <div className="mb-8">
                             <div className="flex flex-wrap gap-2">
                                {prof.researchAreas.map((area, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors cursor-default">
                                        {area}
                                    </span>
                                ))}
                             </div>
                        </div>

                        {/* === ADMISSION REQUIREMENTS (NEW) === */}
                        {prof.admissionRequirements && (
                            <div className="mb-8 p-4 bg-teal-50 border border-teal-100 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-teal-900">
                                        <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.182-.311a51.002 51.002 0 016.89-3.432.75.75 0 01.666 1.345 49.516 49.516 0 00-6.237 2.972V14.12a.75.75 0 01-.483.696A49.935 49.935 0 013.5 16.208v-2.31c0-1.875 4.39-3.722 8.2-3.722z" />
                                    </svg>
                                </div>
                                <h6 className="text-[11px] font-bold text-teal-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    入学申请要求参考
                                </h6>
                                <p className="text-sm text-teal-900 font-medium leading-relaxed relative z-10 whitespace-pre-wrap">
                                    {prof.admissionRequirements}
                                </p>
                            </div>
                        )}

                        {/* === AUDIT REPORT CARD === */}
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-slate-100/50 mb-8 relative">
                            {/* Header of Report */}
                            <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex items-center justify-between backdrop-blur-md">
                                <div className="flex items-center gap-2.5">
                                    <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <span className="font-bold text-slate-800 text-sm tracking-tight">AI 深度匹配审计报告</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">
                                    Verified
                                </span>
                            </div>

                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                                {/* Decorative vertical line for desktop */}
                                <div className="hidden md:block absolute left-1/2 top-6 bottom-6 w-px bg-slate-100"></div>

                                {/* Left Column: Hard Constraints */}
                                <div className="space-y-2">
                                    <h6 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 
                                        硬性指标核查
                                    </h6>
                                    <div className="space-y-1">
                                        <AuditItem 
                                            label="区域 / 国家" 
                                            value={prof.matchReasoning.locationCheck}
                                            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                        />
                                        <AuditItem 
                                            label="所属院校" 
                                            value={prof.matchReasoning.universityCheck}
                                            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                                        />
                                        <AuditItem 
                                            label="所在院系" 
                                            value={prof.matchReasoning.departmentCheck}
                                            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                                        />
                                        <AuditItem 
                                            label="目前职级" 
                                            value={prof.matchReasoning.positionCheck}
                                            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                                        />
                                    </div>
                                </div>

                                {/* Right Column: Soft Skills & Fit */}
                                <div className="flex flex-col h-full">
                                    <h6 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> 
                                        活跃度与综合评价
                                    </h6>
                                    
                                    <div className="grid grid-cols-1 gap-3 mb-6">
                                        <div className="bg-amber-50/50 rounded-xl p-3.5 border border-amber-100/60">
                                            <div className="text-[10px] font-bold text-amber-600/70 uppercase mb-1">近期学术活跃度</div>
                                            <div className="text-sm font-semibold text-amber-900 leading-snug">{prof.matchReasoning.activityCheck}</div>
                                        </div>
                                        <div className="bg-indigo-50/50 rounded-xl p-3.5 border border-indigo-100/60">
                                            <div className="text-[10px] font-bold text-indigo-600/70 uppercase mb-1">综合声望评价</div>
                                            <div className="text-sm font-semibold text-indigo-900 leading-snug">{prof.matchReasoning.reputationCheck}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto">
                                        <h6 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 
                                            核心契合点
                                        </h6>
                                        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                                {prof.matchReasoning.researchFit}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activities Timeline */}
                        {(prof.activitySummary || (prof.recentActivities && prof.recentActivities.length > 0)) && (
                            <div className="mt-6 px-1">
                                <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    近五年学术动态 (2020-2025)
                                </h5>
                                
                                {/* Summary Block */}
                                {prof.activitySummary && (
                                    <div className="mb-6 bg-blue-50/50 p-3 rounded-lg border border-blue-100/50 text-sm text-blue-900 leading-relaxed font-medium">
                                        {prof.activitySummary}
                                    </div>
                                )}

                                {/* Timeline with Scroll for long lists */}
                                {prof.recentActivities && prof.recentActivities.length > 0 && (
                                    <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                        <div className="space-y-0 relative border-l border-gray-100 ml-2 pt-1 pb-1">
                                            {prof.recentActivities.map((activity, i) => (
                                                <div key={i} className="mb-4 ml-6 relative group/item">
                                                    <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-blue-200 group-hover/item:border-blue-400 transition-colors"></span>
                                                    <p className="text-sm text-gray-600 leading-relaxed group-hover/item:text-gray-900 transition-colors">{activity}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                      </div>
                    ))}
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyMatcher;
