import React, { useState } from 'react';
import { FacultyMember, FacultyRecord, SourceData } from '../types';
import { searchUniversityInfo } from '../services/geminiService';
import { 
  Award, 
  ExternalLink, 
  Mail, 
  Briefcase, 
  School, 
  CheckCircle2, 
  MapPin, 
  Building2, 
  Clock,
  Star,
  UserPlus,
  Pencil,
  Trash2,
  RefreshCw,
  MoreHorizontal,
  Loader2,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Database,
  Sparkles
} from 'lucide-react';

const parseApplicationReqs = (text: string) => {
    if (!text) return null;
    
    const extractUrls = (block: string) => Array.from(new Set(block.match(/(https?:\/\/[^\s]+)/g) || []));
    const cleanText = (block: string) => block.replace(/(https?:\/\/[^\s]+)/g, '').replace(/^[\s\d、.:：,，]+/, '').trim();

    // Find indices of sections
    const sections = [
        { key: 'lang', regex: /(?:\d+[\s、.：:]*)?(?:雅思|托福)/i },
        { key: 'degree', regex: /(?:\d+[\s、.：:]*)?学位和成绩要求/i },
        { key: 'gre', regex: /(?:\d+[\s、.：:]*)?GRE\s*&?\s*GMAT/i },
        { key: 'materials', regex: /(?:\d+[\s、.：:]*)?具体申请材料/i },
        { key: 'rp', regex: /(?:\d+[\s、.：:]*)?RP要求/i },
        { key: 'deadline', regex: /(?:\d+[\s、.：:]*)?申请截止日期/i }
    ];

    let matches = sections.map(s => {
        const match = text.match(s.regex);
        return {
            key: s.key,
            index: match ? match.index : -1,
            length: match ? match[0].length : 0
        };
    }).filter(m => m.index !== -1).sort((a, b) => a.index! - b.index!);

    const blocks: Record<string, string> = {};
    
    for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const next = matches[i + 1];
        const start = current.index! + current.length;
        const end = next ? next.index! : text.length;
        blocks[current.key] = text.substring(start, end);
    }

    // 1. Language
    const langBlock = blocks['lang'] || '';
    const langUrls = extractUrls(langBlock);

    // Also search the whole text for IELTS and TOEFL just in case they are not in the lang block
    const ieltsRegex = /雅思.*?总分[：:\s]*([\d.]+).*?阅读[：:\s]*([\d.]+).*?听力[：:\s]*([\d.]+).*?口语[：:\s]*([\d.]+).*?写作[：:\s]*([\d.]+)/i;
    const ieltsMatch = text.match(ieltsRegex);
    const ielts = ieltsMatch ? {
        total: ieltsMatch[1],
        reading: ieltsMatch[2],
        listening: ieltsMatch[3],
        speaking: ieltsMatch[4],
        writing: ieltsMatch[5]
    } : null;

    const toeflRegex = /托福.*?总分[：:\s]*([\d.]+).*?听力[：:\s]*([\d.]+).*?口语[：:\s]*([\d.]+).*?阅读[：:\s]*([\d.]+).*?写作[：:\s]*([\d.]+)/i;
    const toeflMatch = text.match(toeflRegex);
    const toefl = toeflMatch ? {
        total: toeflMatch[1],
        listening: toeflMatch[2],
        speaking: toeflMatch[3],
        reading: toeflMatch[4],
        writing: toeflMatch[5]
    } : null;

    // 2. Degree
    const degreeBlock = blocks['degree'];
    const degreeUrls = degreeBlock ? extractUrls(degreeBlock) : [];
    const degree = degreeBlock ? {
        text: cleanText(degreeBlock),
        urls: degreeUrls
    } : null;

    // 3. GRE/GMAT
    const greBlock = blocks['gre'];
    const greUrls = greBlock ? extractUrls(greBlock) : [];
    const gre = greBlock ? {
        text: cleanText(greBlock),
        urls: greUrls
    } : null;

    // 4. Materials
    const materialsBlock = blocks['materials'];
    const materialsUrls = materialsBlock ? extractUrls(materialsBlock) : [];
    const materials = materialsBlock ? {
        text: cleanText(materialsBlock),
        urls: materialsUrls
    } : null;

    // 5. RP
    const rpBlock = blocks['rp'];
    const rpUrls = rpBlock ? extractUrls(rpBlock) : [];
    const rp = rpBlock ? {
        text: cleanText(rpBlock),
        urls: rpUrls
    } : null;

    // 6. Deadline
    const deadlineBlock = blocks['deadline'];
    const deadlineUrls = deadlineBlock ? extractUrls(deadlineBlock) : [];
    const deadline = deadlineBlock ? {
        text: cleanText(deadlineBlock),
        urls: deadlineUrls
    } : null;

    // Global URLs (any URL not captured in the blocks)
    const allUrls = extractUrls(text);
    const usedUrls = new Set([...langUrls, ...degreeUrls, ...greUrls, ...materialsUrls, ...rpUrls, ...deadlineUrls]);
    const remainingUrls = allUrls.filter(url => !usedUrls.has(url));

    return { ielts, toefl, langUrls, degree, gre, materials, rp, deadline, remainingUrls };
};

const renderInlineUrls = (urls: string[]) => {
    if (!urls || urls.length === 0) return null;
    return (
        <div className="flex gap-2 flex-wrap ml-auto">
            {urls.map((url, index) => (
                <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-100 text-blue-500 text-[10px] font-bold hover:bg-blue-50 transition-colors"
                    title={url}
                >
                    <ExternalLink size={12} />
                    来源 {index + 1}
                </a>
            ))}
        </div>
    );
};

const StructuredReqsCard = ({ title, content, defaultUrls = [] }: { title: string, content: string, defaultUrls?: string[] }) => {
    if (!content) return null;

    const parsed = parseApplicationReqs(content);
    
    // If we can't parse structured data, just show text
    const hasStructuredData = parsed?.ielts || parsed?.toefl || parsed?.degree || parsed?.gre || parsed?.materials || parsed?.rp || parsed?.deadline;

    const topUrls = Array.from(new Set([...defaultUrls, ...(parsed?.remainingUrls || [])]));

    return (
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{title}</h3>
                {topUrls.length > 0 && (
                    <div className="flex gap-2 flex-wrap justify-end">
                        {topUrls.map((url, index) => (
                            <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-100 text-blue-500 text-[10px] font-bold hover:bg-blue-50 transition-colors"
                            >
                                <ExternalLink size={12} />
                                来源 {index + 1}
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {hasStructuredData ? (
                <div className="space-y-6">
                    {(() => {
                        let counter = 1;
                        return (
                            <>
                                {(parsed.ielts || parsed.toefl) && (
                                    <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-black">{counter++}</div>
                                                <h4 className="text-sm font-black text-blue-600">语言成绩要求</h4>
                                            </div>
                                            {renderInlineUrls(parsed.langUrls)}
                                        </div>
                                        
                                        <div className="space-y-4">
                                            {parsed.ielts && (
                                                <div>
                                                    <div className="text-xs font-bold text-gray-500 mb-2">雅思总分：{parsed.ielts.total}</div>
                                                    <div className="grid grid-cols-4 gap-4 bg-white rounded-xl p-4 border border-gray-100">
                                                        <div>
                                                            <div className="text-[10px] font-bold text-gray-400 mb-1">阅读</div>
                                                            <div className="text-base font-black text-gray-900">{parsed.ielts.reading}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-bold text-gray-400 mb-1">听力</div>
                                                            <div className="text-base font-black text-gray-900">{parsed.ielts.listening}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-bold text-gray-400 mb-1">口语</div>
                                                            <div className="text-base font-black text-gray-900">{parsed.ielts.speaking}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-bold text-gray-400 mb-1">写作</div>
                                                            <div className="text-base font-black text-gray-900">{parsed.ielts.writing}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {parsed.toefl && (
                                                <div>
                                                    <div className="text-xs font-bold text-gray-500 mb-2">托福总分：{parsed.toefl.total}</div>
                                                    <div className="grid grid-cols-4 gap-4 bg-white rounded-xl p-4 border border-gray-100">
                                                        <div>
                                                            <div className="text-[10px] font-bold text-gray-400 mb-1">听力</div>
                                                            <div className="text-base font-black text-gray-900">{parsed.toefl.listening}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-bold text-gray-400 mb-1">口语</div>
                                                            <div className="text-base font-black text-gray-900">{parsed.toefl.speaking}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-bold text-gray-400 mb-1">阅读</div>
                                                            <div className="text-base font-black text-gray-900">{parsed.toefl.reading}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-bold text-gray-400 mb-1">写作</div>
                                                            <div className="text-base font-black text-gray-900">{parsed.toefl.writing}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {parsed.degree && (
                                    <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">{counter++}</div>
                                                <h4 className="text-sm font-black text-emerald-600">学位和成绩要求</h4>
                                            </div>
                                            {renderInlineUrls(parsed.degree.urls)}
                                        </div>
                                        <div className="text-sm font-bold text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {parsed.degree.text}
                                        </div>
                                    </div>
                                )}

                                {parsed.gre && (
                                    <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-black">{counter++}</div>
                                                <h4 className="text-sm font-black text-purple-600">GRE & GMAT</h4>
                                            </div>
                                            {renderInlineUrls(parsed.gre.urls)}
                                        </div>
                                        <div className="text-sm font-bold text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {parsed.gre.text}
                                        </div>
                                    </div>
                                )}

                                {parsed.materials && (
                                    <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-black">{counter++}</div>
                                                <h4 className="text-sm font-black text-orange-600">具体申请材料</h4>
                                            </div>
                                            {renderInlineUrls(parsed.materials.urls)}
                                        </div>
                                        <div className="text-sm font-bold text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {parsed.materials.text}
                                        </div>
                                    </div>
                                )}

                                {parsed.rp && (
                                    <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-black">{counter++}</div>
                                                <h4 className="text-sm font-black text-rose-600">RP要求</h4>
                                            </div>
                                            {renderInlineUrls(parsed.rp.urls)}
                                        </div>
                                        <div className="text-sm font-bold text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {parsed.rp.text}
                                        </div>
                                    </div>
                                )}

                                {parsed.deadline && (
                                    <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black">{counter++}</div>
                                                <h4 className="text-sm font-black text-amber-600">申请截止日期</h4>
                                            </div>
                                            {renderInlineUrls(parsed.deadline.urls)}
                                        </div>
                                        <div className="text-sm font-bold text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {parsed.deadline.text}
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            ) : (
                <div className="text-sm font-bold text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {content.replace(/(https?:\/\/[^\s]+)/g, '').trim()}
                </div>
            )}
        </div>
    );
};

const InfoCard = ({ title, content, defaultUrls = [] }: { title: string, content: string, defaultUrls?: string[] }) => {
    if (!content) return null;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const extractedUrls = Array.from(new Set(content.match(urlRegex) || []));
    const allUrls = Array.from(new Set([...defaultUrls, ...extractedUrls]));
    const cleanContent = content.replace(urlRegex, '').trim();

    return (
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{title}</h3>
                {allUrls.length > 0 && (
                    <div className="flex gap-2 flex-wrap justify-end">
                        {allUrls.map((url, index) => (
                            <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-100 text-blue-500 text-[10px] font-bold hover:bg-blue-50 transition-colors"
                            >
                                <ExternalLink size={12} />
                                来源 {index + 1}
                            </a>
                        ))}
                    </div>
                )}
            </div>
            {cleanContent && (
                <div className="text-sm font-bold text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {cleanContent}
                </div>
            )}
        </div>
    );
};

interface FacultyCardProps {
  prof: FacultyMember | FacultyRecord;
  isDatabaseView?: boolean;
  onSave?: (prof: FacultyMember) => void;
  onLink?: (prof: FacultyMember) => void;
  onEdit?: (prof: FacultyRecord) => void;
  onDelete?: (id: string) => void;
  onRefresh?: (prof: FacultyRecord) => void;
  onUnlink?: (id: string) => void;
  onReviewMatch?: () => void;
  isReviewing?: boolean;
  isLinked?: boolean;
  isSaved?: boolean;
  linkedClientCount?: number;
  studentMatchScore?: number;
  studentMatchReasoning?: string;
}

const FacultyCard: React.FC<FacultyCardProps> = ({ 
  prof, 
  isDatabaseView = false,
  onSave,
  onLink,
  onEdit,
  onDelete,
  onRefresh,
  onUnlink,
  onReviewMatch,
  isReviewing = false,
  isLinked = false,
  isSaved = false,
  linkedClientCount = 0,
  studentMatchScore,
  studentMatchReasoning
}) => {
  // Helper for Excel Export formatting (reused logic if needed, but here just for display)
  const formatSourceField = (data?: SourceData) => {
      if (!data) return "N/A";
      if (!data.sourceUrl) return data.value;
      return data.value; // In card we just show value, link is separate usually or implied
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

  // Regex to parse [Tag][Tag] Content
  const parseActivity = (text: string) => {
    const match = text.match(/^((?:\[[^\]]+\]\s*)+)(.*)/);
    if (match) {
        return { tags: match[1].trim(), content: match[2].trim() };
    }
    return { tags: '', content: text };
  };

  const [imgError, setImgError] = React.useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [admissionData, setAdmissionData] = useState<any>(null);
  const [loadingAdmission, setLoadingAdmission] = useState(false);
  const [admissionLoaded, setAdmissionLoaded] = useState(false);

  const handleLoadAdmission = async () => {
    setLoadingAdmission(true);
    try {
      const data = await searchUniversityInfo(prof.university, prof.department);
      setAdmissionData(data);
    } catch { /* ignore */ } 
    finally {
      setLoadingAdmission(false);
      setAdmissionLoaded(true);
    }
  };

  const record = isDatabaseView ? (prof as FacultyRecord) : null;

  if (!prof) return null;

  return (
    <div 
        onClick={() => {
            if (!isExpanded) setIsExpanded(true);
        }}
        className={`glass p-8 md:p-10 rounded-[40px] shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden border border-white/50 ${!isExpanded ? 'hover:scale-[1.01] cursor-pointer' : ''}`}
    >
        {/* Decorative Background Element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>
        
        {/* QS Badge */}
        {prof.qsRanking && (
            <div className="absolute top-6 right-6 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-md shadow-amber-200/50 z-10 flex items-center gap-1.5 uppercase tracking-wider">
                <Award size={12} />
                QS {prof.qsRanking}
            </div>
        )}

        {/* Student Match Score Badge - Removed as we'll show it in the main match box for better integration */}

        {/* Local Database Badge */}
        {prof.isFromDatabase && (
            <div className={`absolute top-6 ${prof.qsRanking ? 'right-36' : 'right-6'} bg-blue-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-md shadow-blue-200/50 z-10 flex items-center gap-1.5 uppercase tracking-wider`}>
                <Database size={12} />
                本地导师库
            </div>
        )}

        {/* Action Buttons */}
        <div className={`absolute ${prof.qsRanking || studentMatchScore ? 'top-20' : 'top-6'} right-6 flex flex-col gap-2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0`}>
            {isDatabaseView && record ? (
                <>
                    {onReviewMatch && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onReviewMatch(); }}
                            disabled={isReviewing}
                            className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl border border-emerald-100 shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                            title="一键评审匹配度"
                        >
                            {isReviewing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit?.(record); }}
                        className="p-2.5 bg-white/60 backdrop-blur-sm text-gray-500 hover:text-blue-600 rounded-xl border border-white/50 shadow-sm hover:shadow-md transition-all active:scale-95"
                        title="编辑导师信息"
                    >
                        <Pencil size={16} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRefresh?.(record); }}
                        className="p-2.5 bg-white/60 backdrop-blur-sm text-gray-500 hover:text-emerald-600 rounded-xl border border-white/50 shadow-sm hover:shadow-md transition-all active:scale-95"
                        title="联网更新数据"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete?.(record.id); }}
                        className="p-2.5 bg-white/60 backdrop-blur-sm text-gray-500 hover:text-red-600 rounded-xl border border-white/50 shadow-sm hover:shadow-md transition-all active:scale-95"
                        title="删除导师"
                    >
                        <Trash2 size={16} />
                    </button>
                </>
            ) : (
                <>
                    {onSave && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onSave(prof); }}
                            className={`p-2.5 rounded-xl border backdrop-blur-sm shadow-sm hover:shadow-md transition-all active:scale-95 ${isSaved ? 'bg-amber-500 text-white border-amber-400' : 'bg-white/60 text-gray-400 hover:text-amber-500 border-white/50'}`}
                            title={isSaved ? "已收藏" : "收藏到导师库"}
                        >
                            <Star size={16} fill={isSaved ? "currentColor" : "none"} />
                        </button>
                    )}
                </>
            )}
            
            {onLink && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onLink(prof); }}
                    className={`p-2.5 rounded-xl border backdrop-blur-sm shadow-sm hover:shadow-md transition-all active:scale-95 ${isLinked ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-blue-500/20' : 'bg-white/60 text-gray-400 hover:text-blue-600 border-white/50'}`}
                    title="推荐给学生"
                >
                    <UserPlus size={16} />
                </button>
            )}

            {onUnlink && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onUnlink((prof as FacultyRecord).id); }}
                    className="p-2.5 bg-white/60 backdrop-blur-sm text-gray-500 hover:text-red-600 rounded-xl border border-white/50 shadow-sm hover:shadow-md transition-all active:scale-95"
                    title="移除关联"
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>

        {/* Classification & Region Path Breadcrumbs */}
        {(record?.classificationPath || record?.regionPath) && (
            <div className="mb-6 flex items-center flex-wrap gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {record.regionPath && record.regionPath.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-emerald-50/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-emerald-100/50">
                        {record.regionPath.map((step, i) => (
                            <React.Fragment key={i}>
                                <span className={i === record.regionPath!.length - 1 ? 'text-emerald-600' : ''}>{step}</span>
                                {i < record.regionPath!.length - 1 && <ChevronRight size={10} className="text-gray-300" />}
                            </React.Fragment>
                        ))}
                    </div>
                )}
                {record.classificationPath && record.classificationPath.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-white/40 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/50">
                        {record.classificationPath.map((step, i) => (
                            <React.Fragment key={i}>
                                <span className={i === record.classificationPath!.length - 1 ? 'text-blue-600' : ''}>{step}</span>
                                {i < record.classificationPath!.length - 1 && <ChevronRight size={10} className="text-gray-300" />}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
            {/* Left Side: Photo & Name */}
            <div className="flex flex-col md:flex-row gap-8 w-full">
                {/* Profile Photo */}
                <div className="flex-shrink-0">
                    {prof.photoUrl && prof.photoUrl.trim() !== '' && !imgError ? (
                        <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-xl shadow-gray-200/50 border-4 border-white bg-gray-50 relative group/photo transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                            <img 
                                src={prof.photoUrl} 
                                alt={prof.name} 
                                className="w-full h-full object-cover"
                                onError={() => setImgError(true)}
                            />
                        </div>
                    ) : (
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-500 font-black text-3xl shadow-inner border-4 border-white transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                            {prof.name.charAt(0)}
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pr-24">
                        <h4 className="text-3xl font-black text-gray-900 leading-none tracking-tight">
                            {prof.name}
                        </h4>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4 flex-wrap">
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                <Briefcase size={16} className="text-blue-500/50" />
                                {prof.title}
                            </p>
                            <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                            <p className="text-sm text-gray-900 font-extrabold flex items-center gap-2">
                                <School size={16} className="text-indigo-500/50" />
                                {prof.university} {prof.universityEn ? `(${prof.universityEn})` : ''}
                            </p>
                            {(prof.department || prof.programName) && (
                                <>
                                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                    <p className="text-sm text-gray-600 font-bold flex items-center gap-2">
                                        <Building2 size={16} className="text-purple-500/50" />
                                        {prof.programName || prof.department}
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-4 flex-wrap mt-1">
                            {prof.email && prof.email.trim() !== '' && (
                                <a 
                                    href={`mailto:${prof.email}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-2 font-medium transition-colors"
                                >
                                    <Mail size={14} className="text-blue-400" />
                                    {prof.email}
                                </a>
                            )}
                            {prof.profileUrl && prof.profileUrl.trim() !== '' && (
                                <a 
                                    href={prof.profileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-2 font-medium transition-colors"
                                >
                                    <ExternalLink size={14} />
                                    个人主页
                                </a>
                            )}
                            <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${prof.isActive ? 'text-emerald-700 bg-emerald-50 border border-emerald-100/50' : 'text-rose-700 bg-rose-50 border border-rose-100/50'}`}>
                                {prof.isActive ? 'Active' : 'Status Unknown'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {(!prof.isFromDatabase || (studentMatchScore !== undefined && studentMatchScore > 0)) && (
                <div className="flex flex-col items-end gap-2 min-w-[100px] mt-8 md:mt-0">
                    <div className={`px-6 py-3 rounded-[20px] text-xl font-black shadow-lg flex flex-col items-center gap-0.5 transform hover:scale-105 transition-transform ${
                        (studentMatchScore || prof.matchScore || 0) >= 90 ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-200' :
                        (studentMatchScore || prof.matchScore || 0) >= 80 ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-200' :
                        (studentMatchScore || prof.matchScore || 0) >= 60 ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-200' :
                        'bg-gray-200 text-gray-500 shadow-none'
                    }`}>
                        <span className="text-[10px] opacity-70 uppercase tracking-[0.2em] font-black">
                            {studentMatchScore ? 'Student Match' : 'Match'}
                        </span>
                        {studentMatchScore || prof.matchScore}%
                    </div>
                </div>
            )}
        </div>
        
        {/* Expand/Collapse Toggle */}
        <div className="mt-4 flex justify-center">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                }}
                className="flex items-center gap-2 px-6 py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-black uppercase tracking-widest rounded-2xl border border-gray-100 transition-all active:scale-95"
            >
                {isExpanded ? (
                    <>
                        <ChevronUp size={14} />
                        收起详情
                    </>
                ) : (
                    <>
                        <ChevronDown size={14} />
                        查看详情
                    </>
                )}
            </button>
        </div>

        {/* Detailed Content (Expandable) */}
        {isExpanded && (
            <div className="mt-10 animate-in fade-in slide-in-from-top-4 duration-500">
                {/* Research Areas Tags */}
                <div className="mb-8">
                <div className="flex flex-wrap gap-2.5">
                {prof.researchAreas.map((area, i) => (
                    <span key={i} className="px-4 py-2 bg-gray-100/50 backdrop-blur-sm text-gray-600 text-[11px] font-bold rounded-xl border border-gray-200/50 hover:bg-white hover:shadow-md transition-all cursor-default">
                        {area}
                    </span>
                ))}
                </div>
        </div>

        {/* Recommendation Reason */}
        {prof.recommendationReason && (
            <div className="mb-6 bg-emerald-50/30 border-l-4 border-emerald-500 p-6 rounded-r-3xl backdrop-blur-sm">
                <h6 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <Star size={14} className="fill-emerald-500" />
                    推荐理由
                </h6>
                <p className="text-sm text-gray-800 leading-relaxed font-bold italic">
                    "{prof.recommendationReason}"
                </p>
            </div>
        )}

        {/* Alignment Details / Match Reason */}
        {(prof.alignmentDetails || studentMatchReasoning) && (
            <div className={`mb-6 ${studentMatchReasoning ? 'bg-emerald-50/30 border-emerald-500' : 'bg-blue-50/30 border-blue-500'} border-l-4 p-6 rounded-r-3xl backdrop-blur-sm`}>
                <h6 className={`text-[10px] font-black ${studentMatchReasoning ? 'text-emerald-600' : 'text-blue-600'} uppercase tracking-[0.2em] mb-3 flex items-center gap-2`}>
                    <Star size={14} className={studentMatchReasoning ? 'fill-emerald-500' : 'fill-blue-500'} />
                    {studentMatchReasoning ? '学生专属匹配解析' : '匹配深度解析'}
                </h6>
                <p className="text-sm text-gray-800 leading-relaxed font-bold italic">
                    "{studentMatchReasoning || prof.alignmentDetails}"
                </p>
            </div>
        )}

        {/* Classification Note */}
        {record?.classificationNote && (
            <div className="mb-10 bg-amber-50/30 border-l-4 border-amber-500 p-6 rounded-r-3xl backdrop-blur-sm">
                <h6 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <Pencil size={14} className="fill-amber-500 text-white" />
                    分类备注
                </h6>
                <p className="text-sm text-gray-800 leading-relaxed font-medium italic">
                    {record.classificationNote}
                </p>
            </div>
        )}

        {/* Projects List Section */}
        {('projects' in prof) && prof.projects && prof.projects.length > 0 && (
            <div className="mb-10">
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <Briefcase size={18} className="text-blue-500/30" />
                    关联项目列表 ({prof.projects.length})
                </h5>
                <div className="space-y-4">
                    {prof.projects.map((project, idx) => (
                        <div key={idx} className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl border border-white/50 shadow-sm hover:shadow-md transition-all group/project">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                                <div className="flex-1">
                                    <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">项目名称 / 专业</div>
                                    <div className="text-base font-black text-gray-900 leading-tight">
                                        {project.programNameEn}
                                    </div>
                                    {project.programUrl && (
                                        <a href={project.programUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline mt-1 inline-flex items-center gap-1">
                                            项目官网 <ExternalLink size={10} />
                                        </a>
                                    )}
                                </div>
                            </div>
                            
                            <div className="space-y-4 mt-4">
                                {project.deadline && (
                                    <InfoCard 
                                        title="申请截止日期" 
                                        content={project.deadline} 
                                    />
                                )}
                                {project.applicationReqs && (
                                    <StructuredReqsCard 
                                        title="申请要求及材料" 
                                        content={project.applicationReqs} 
                                    />
                                )}
                                {project.rpReqs && (
                                    <InfoCard 
                                        title="RP要求" 
                                        content={project.rpReqs} 
                                    />
                                )}
                                {project.tuition && (
                                    <InfoCard 
                                        title="学费" 
                                        content={project.tuition} 
                                    />
                                )}
                                {project.scholarship && (
                                    <InfoCard 
                                        title="奖学金" 
                                        content={project.scholarship} 
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Admission & Funding Data Section */}
        <div className="mb-10">
          {/* Display existing data if available */}
          {(prof.qsRankingData || prof.deadlineData || prof.applicationReqsData || prof.rpReqsData || prof.tuitionData || prof.scholarshipData || prof.programName) && (
             <div className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {prof.programName && (
                        <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm col-span-full">
                            <div className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-1">申请专业</div>
                            <div className="text-sm font-bold text-gray-800">{prof.programName} {prof.programNameEn ? `(${prof.programNameEn})` : ''}</div>
                            {prof.programUrl && <a href={prof.programUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-500 hover:underline mt-1 inline-block">专业官网</a>}
                        </div>
                    )}
                    {prof.qsRankingData?.value && (
                        <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">QS World Ranking</div>
                            <div className="text-sm font-bold text-gray-800">{prof.qsRankingData.value}</div>
                            {prof.qsRankingData.sourceUrl && <a href={prof.qsRankingData.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-500 hover:underline mt-1 inline-block">来源</a>}
                        </div>
                    )}
                    {prof.rpReqsData?.value && (
                        <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="text-[9px] font-black text-pink-600 uppercase tracking-widest mb-1">RP要求</div>
                            <div className="text-sm font-bold text-gray-800">{prof.rpReqsData.value}</div>
                            {prof.rpReqsData.sourceUrl && <a href={prof.rpReqsData.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-500 hover:underline mt-1 inline-block">来源</a>}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    {prof.deadlineData?.value && (
                        <InfoCard 
                            title="申请截止日期" 
                            content={prof.deadlineData.value} 
                            defaultUrls={prof.deadlineData.sourceUrl ? [prof.deadlineData.sourceUrl] : []} 
                        />
                    )}

                    {prof.applicationReqsData?.value && (
                        <StructuredReqsCard 
                            title="申请要求及材料" 
                            content={prof.applicationReqsData.value} 
                            defaultUrls={prof.applicationReqsData.sourceUrl ? [prof.applicationReqsData.sourceUrl] : []} 
                        />
                    )}

                    {prof.tuitionData?.value && (
                        <InfoCard 
                            title="学费" 
                            content={prof.tuitionData.value} 
                            defaultUrls={prof.tuitionData.sourceUrl ? [prof.tuitionData.sourceUrl] : []} 
                        />
                    )}

                    {prof.scholarshipData?.value && (
                        <InfoCard 
                            title="奖学金项目" 
                            content={prof.scholarshipData.value} 
                            defaultUrls={prof.scholarshipData.sourceUrl ? [prof.scholarshipData.sourceUrl] : []} 
                        />
                    )}
                </div>
             </div>
          )}

          {!admissionLoaded ? (
            <button onClick={handleLoadAdmission} disabled={loadingAdmission}
              className="w-full py-3.5 bg-gray-50/80 hover:bg-blue-50 border border-dashed border-gray-200 rounded-2xl text-sm font-bold text-gray-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2 group">
              {loadingAdmission ? (
                <><Loader2 size={14} className="animate-spin" /> 正在搜索招生数据...</>
              ) : (
                <><Search size={14} className="group-hover:scale-110 transition-transform" /> 点击加载招生数据（学费 / 奖学金 / DDL）</>
              )}
            </button>
          ) : admissionData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {admissionData.qsRanking && admissionData.qsRanking !== '未找到官方数据' && (
                  <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">QS World Ranking</div>
                    <div className="text-sm font-bold text-gray-800">{admissionData.qsRanking}</div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                  {admissionData.deadline?.value && admissionData.deadline.value !== '未找到官方数据' && (
                    <InfoCard 
                        title="申请截止日期" 
                        content={admissionData.deadline.value} 
                        defaultUrls={admissionData.deadline.sourceUrl ? [admissionData.deadline.sourceUrl] : []} 
                    />
                  )}

                  {admissionData.requirements?.value && admissionData.requirements.value !== '未找到官方数据' && (
                    <StructuredReqsCard 
                        title="申请要求及材料" 
                        content={admissionData.requirements.value} 
                        defaultUrls={admissionData.requirements.sourceUrl ? [admissionData.requirements.sourceUrl] : []} 
                    />
                  )}

                  {admissionData.tuition?.value && admissionData.tuition.value !== '未找到官方数据' && (
                    <InfoCard 
                        title="学费" 
                        content={admissionData.tuition.value} 
                        defaultUrls={admissionData.tuition.sourceUrl ? [admissionData.tuition.sourceUrl] : []} 
                    />
                  )}

                  {admissionData.scholarships?.value && admissionData.scholarships.value !== '未找到官方数据' && (
                    <InfoCard 
                        title="奖学金项目" 
                        content={admissionData.scholarships.value} 
                        defaultUrls={admissionData.scholarships.sourceUrl ? [admissionData.scholarships.sourceUrl] : []} 
                    />
                  )}
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-gray-400 py-4 bg-gray-50 rounded-2xl">暂未查询到招生数据</div>
          )}
        </div>

        {/* === AUDIT REPORT CARD === */}
        <div className="bg-gray-50/50 backdrop-blur-sm border border-gray-100 rounded-[32px] overflow-hidden shadow-inner mb-10 relative">
            {/* Header of Report */}
            <div className="bg-white/60 px-6 py-4 border-b border-gray-100/50 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-100">
                        <CheckCircle2 size={16} />
                    </div>
                    <span className="font-black text-gray-900 text-sm tracking-tight">AI 深度匹配审计报告</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                        Verified
                    </span>
                </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10 relative">
                {/* Decorative vertical line for desktop */}
                <div className="hidden md:block absolute left-1/2 top-10 bottom-10 w-px bg-gray-200/50"></div>

                {/* Left Column: Hard Constraints */}
                <div className="space-y-4">
                    <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> 
                        硬性指标核查
                    </h6>
                    <div className="space-y-2">
                        <AuditItem 
                            label="区域 / 国家" 
                            value={prof.matchReasoning?.locationCheck || '未核查'}
                            icon={<MapPin size={18} />}
                        />
                        <AuditItem 
                            label="所属院校" 
                            value={prof.matchReasoning?.universityCheck || '未核查'}
                            icon={<School size={18} />}
                        />
                        <AuditItem 
                            label="所在院系" 
                            value={prof.matchReasoning?.departmentCheck || '未核查'}
                            icon={<Building2 size={18} />}
                        />
                        <AuditItem 
                            label="目前职级" 
                            value={prof.matchReasoning?.positionCheck || '未核查'}
                            icon={<Briefcase size={18} />}
                        />
                    </div>
                </div>

                {/* Right Column: Soft Skills & Fit */}
                <div className="flex flex-col h-full">
                    <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div> 
                        活跃度与综合评价
                    </h6>
                    
                    <div className="grid grid-cols-1 gap-4 mb-8">
                        <div className="bg-white/80 rounded-2xl p-5 border border-amber-100 shadow-sm">
                            <div className="text-[9px] font-black text-amber-600/60 uppercase tracking-widest mb-2">近期学术活跃度</div>
                            <div className="text-sm font-bold text-gray-800 leading-relaxed">{prof.matchReasoning?.activityCheck || '暂无评价'}</div>
                        </div>
                        <div className="bg-white/80 rounded-2xl p-5 border border-blue-100 shadow-sm">
                            <div className="text-[9px] font-black text-blue-600/60 uppercase tracking-widest mb-2">综合声望评价</div>
                            <div className="text-sm font-bold text-gray-800 leading-relaxed">{prof.matchReasoning?.reputationCheck || '暂无评价'}</div>
                        </div>
                    </div>
                    
                    <div className="mt-auto">
                        <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> 
                            核心契合点
                        </h6>
                        <div className="bg-white/80 rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <p className="text-sm text-gray-700 leading-relaxed font-bold">
                                {prof.matchReasoning?.researchFit || '暂无分析'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Recent Activities Timeline */}
        {(prof.activitySummary || (prof.recentActivities && prof.recentActivities.length > 0)) && (
            <div className="mt-10 px-2">
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <Clock size={18} className="text-blue-500/30" />
                    近五年学术动态
                </h5>
                
                {/* Summary Block */}
                {prof.activitySummary && (
                    <div className="mb-8 bg-blue-50/50 backdrop-blur-sm p-5 rounded-2xl border border-blue-100/50 text-sm text-blue-900 leading-relaxed font-bold">
                        {prof.activitySummary}
                    </div>
                )}

                {/* Timeline with Scroll for long lists */}
                {prof.recentActivities && prof.recentActivities.length > 0 && (
                    <div className="max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                        <div className="space-y-0 relative border-l-2 border-gray-100/50 ml-3 pt-2 pb-2">
                            {prof.recentActivities.map((activity, i) => {
                                const parsed = parseActivity(activity);
                                return (
                                    <div key={i} className="mb-6 ml-8 relative group/item">
                                        <span className="absolute -left-[41px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-blue-100 group-hover/item:border-blue-500 transition-all duration-300 shadow-sm"></span>
                                        <p className="text-sm text-gray-600 leading-relaxed group-hover/item:text-gray-900 transition-colors">
                                            {parsed.tags ? (
                                                <>
                                                    <span className="font-black text-blue-600 mr-3 text-[11px] uppercase tracking-wider">{parsed.tags}</span>
                                                    <span className="text-gray-800 font-bold">{parsed.content}</span>
                                                </>
                                            ) : (
                                                <span className="text-gray-800 font-bold">{parsed.content}</span>
                                            )}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        )}
                {/* Deadline Info */}
                {prof.deadlineData && (
                    <div className="mt-10 bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-[24px] shadow-xl shadow-purple-100 flex items-center justify-between transform hover:scale-[1.02] transition-transform">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
                                <Clock size={24} />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Next Application Deadline</div>
                                <div className="text-lg font-black text-white leading-none">{prof.deadlineData.value}</div>
                            </div>
                        </div>
                        {prof.deadlineData.sourceUrl && (
                            <a 
                                href={prof.deadlineData.sourceUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-white/20 backdrop-blur-md text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/30 transition-all flex items-center gap-2"
                            >
                                View Source <ExternalLink size={12} />
                            </a>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* Footer for Database View */}
        {isDatabaseView && record && (
            <div className="mt-10 pt-8 border-t border-gray-100 flex flex-wrap items-center justify-between gap-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 bg-gray-100 rounded-lg text-gray-500">{record.country}</span>
                    <span className="px-3 py-1.5 bg-gray-100 rounded-lg text-gray-500">{record.fieldCategory}</span>
                    {record.subFieldCategory && (
                        <span className="px-3 py-1.5 bg-gray-100 rounded-lg text-gray-500">{record.subFieldCategory}</span>
                    )}
                    <span className={`px-3 py-1.5 rounded-lg font-black ${
                        record.classificationSource === 'manual' ? 'bg-amber-100 text-amber-700' :
                        record.classificationSource === 'hybrid' ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-50 text-blue-600'
                    }`}>
                        {record.classificationSource?.toUpperCase() || 'AUTO'}
                    </span>
                    {record.customTags?.map((tag, i) => (
                        <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg">{tag}</span>
                    ))}
                </div>
                <div className="flex items-center gap-6">
                    {linkedClientCount > 0 && (
                        <span className="flex items-center gap-2 text-blue-600">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            已关联 {linkedClientCount} 位学生
                        </span>
                    )}
                    <span className="flex items-center gap-2">
                        <Clock size={14} />
                        Updated: {new Date(record.updatedAt).toLocaleDateString()}
                    </span>
                </div>
            </div>
        )}
    </div>
  );
};

export default FacultyCard;
