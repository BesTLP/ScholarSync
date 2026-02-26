import React from 'react';
import { FacultyMember, FacultyRecord, SourceData } from '../types';
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
  MoreHorizontal
} from 'lucide-react';

interface FacultyCardProps {
  prof: FacultyMember | FacultyRecord;
  isDatabaseView?: boolean;
  onSave?: (prof: FacultyMember) => void;
  onLink?: (prof: FacultyMember) => void;
  onEdit?: (prof: FacultyRecord) => void;
  onDelete?: (id: string) => void;
  onRefresh?: (prof: FacultyRecord) => void;
  onUnlink?: (id: string) => void;
  isLinked?: boolean;
  isSaved?: boolean;
  linkedClientCount?: number;
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
  isLinked = false,
  isSaved = false,
  linkedClientCount = 0
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

  const record = isDatabaseView ? (prof as FacultyRecord) : null;

  if (!prof) return null;

  return (
    <div className="bg-white/80 backdrop-blur-md p-8 md:p-10 rounded-[40px] border border-white shadow-xl shadow-gray-200/30 hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 group relative overflow-hidden">
        {/* Decorative Background Element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>
        
        {/* QS Badge */}
        {prof.qsRanking && (
            <div className="absolute top-6 right-6 bg-amber-400 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-amber-200 z-10 flex items-center gap-1.5 uppercase tracking-wider">
                <Award size={12} />
                QS {prof.qsRanking}
            </div>
        )}

        {/* Action Buttons */}
        <div className={`absolute ${prof.qsRanking ? 'top-20' : 'top-6'} right-6 flex flex-col gap-2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0`}>
            {isDatabaseView && record ? (
                <>
                    <button 
                        onClick={() => onEdit?.(record)}
                        className="p-2.5 bg-white/90 backdrop-blur-sm text-gray-500 hover:text-blue-600 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-90"
                        title="编辑导师信息"
                    >
                        <Pencil size={16} />
                    </button>
                    <button 
                        onClick={() => onRefresh?.(record)}
                        className="p-2.5 bg-white/90 backdrop-blur-sm text-gray-500 hover:text-emerald-600 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-90"
                        title="联网更新数据"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button 
                        onClick={() => onDelete?.(record.id)}
                        className="p-2.5 bg-white/90 backdrop-blur-sm text-gray-500 hover:text-red-600 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-90"
                        title="删除导师"
                    >
                        <Trash2 size={16} />
                    </button>
                </>
            ) : (
                <>
                    {onSave && (
                        <button 
                            onClick={() => onSave(prof)}
                            className={`p-2.5 rounded-xl border backdrop-blur-sm shadow-sm hover:shadow-md transition-all active:scale-90 ${isSaved ? 'bg-amber-500 text-white border-amber-400' : 'bg-white/90 text-gray-400 hover:text-amber-500 border-gray-100'}`}
                            title={isSaved ? "已收藏" : "收藏到导师库"}
                        >
                            <Star size={16} fill={isSaved ? "currentColor" : "none"} />
                        </button>
                    )}
                </>
            )}
            
            {onLink && (
                <button 
                    onClick={() => onLink(prof)}
                    className={`p-2.5 rounded-xl border backdrop-blur-sm shadow-sm hover:shadow-md transition-all active:scale-90 ${isLinked ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/90 text-gray-400 hover:text-blue-600 border-gray-100'}`}
                    title="推荐给学生"
                >
                    <UserPlus size={16} />
                </button>
            )}

            {onUnlink && (
                 <button 
                    onClick={() => onUnlink((prof as FacultyRecord).id)}
                    className="p-2.5 bg-white/90 backdrop-blur-sm text-gray-500 hover:text-red-600 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-90"
                    title="移除关联"
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
            {/* Left Side: Photo & Name */}
            <div className="flex flex-col md:flex-row gap-8 w-full">
                {/* Profile Photo */}
                <div className="flex-shrink-0">
                    {prof.photoUrl && !imgError ? (
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
                                {prof.university}
                            </p>
                            {prof.department && (
                                <>
                                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                    <p className="text-sm text-gray-600 font-bold flex items-center gap-2">
                                        <Building2 size={16} className="text-purple-500/50" />
                                        {prof.department}
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-4 flex-wrap mt-1">
                            {prof.email && (
                                <a 
                                    href={`mailto:${prof.email}`}
                                    className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-2 font-medium transition-colors"
                                >
                                    <Mail size={14} className="text-blue-400" />
                                    {prof.email}
                                </a>
                            )}
                            {prof.profileUrl && (
                                <a 
                                    href={prof.profileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
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

            <div className="flex flex-col items-end gap-2 min-w-[100px] mt-8 md:mt-0">
                <div className={`px-6 py-3 rounded-[20px] text-xl font-black shadow-lg flex flex-col items-center gap-0.5 transform hover:scale-105 transition-transform ${
                    prof.matchScore >= 90 ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-200' :
                    prof.matchScore >= 80 ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-200' :
                    prof.matchScore >= 60 ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-200' :
                    'bg-gray-200 text-gray-500 shadow-none'
                }`}>
                    <span className="text-[10px] opacity-70 uppercase tracking-[0.2em] font-black">Match</span>
                    {prof.matchScore}%
                </div>
            </div>
        </div>
        
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

        {/* Alignment Details / Match Reason */}
        {prof.alignmentDetails && (
            <div className="mb-10 bg-blue-50/30 border-l-4 border-blue-500 p-6 rounded-r-3xl backdrop-blur-sm">
                <h6 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <Star size={14} className="fill-blue-500" />
                    匹配深度解析
                </h6>
                <p className="text-sm text-gray-800 leading-relaxed font-bold italic">
                    "{prof.alignmentDetails}"
                </p>
            </div>
        )}

        {/* Admission & Funding Data Section */}
        <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prof.qsRankingData && (
                <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">QS World Ranking</div>
                    <div className="text-sm font-bold text-gray-800">{prof.qsRankingData.value}</div>
                    {prof.qsRankingData.sourceUrl && (
                        <a href={prof.qsRankingData.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-500 hover:underline mt-1 inline-block">Source Link</a>
                    )}
                </div>
            )}
            {prof.tuitionData && (
                <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Tuition Fees</div>
                    <div className="text-sm font-bold text-gray-800">{prof.tuitionData.value}</div>
                    {prof.tuitionData.sourceUrl && (
                        <a href={prof.tuitionData.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-500 hover:underline mt-1 inline-block">Source Link</a>
                    )}
                </div>
            )}
            {prof.scholarshipData && (
                <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Scholarship / Funding</div>
                    <div className="text-sm font-bold text-gray-800">{prof.scholarshipData.value}</div>
                    {prof.scholarshipData.sourceUrl && (
                        <a href={prof.scholarshipData.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-500 hover:underline mt-1 inline-block">Source Link</a>
                    )}
                </div>
            )}
            {prof.applicationReqsData && (
                <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Application Requirements</div>
                    <div className="text-sm font-bold text-gray-800">{prof.applicationReqsData.value}</div>
                    {prof.applicationReqsData.sourceUrl && (
                        <a href={prof.applicationReqsData.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-500 hover:underline mt-1 inline-block">Source Link</a>
                    )}
                </div>
            )}
            {prof.rpReqsData && (
                <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-1">RP Requirements</div>
                    <div className="text-sm font-bold text-gray-800">{prof.rpReqsData.value}</div>
                    {prof.rpReqsData.sourceUrl && (
                        <a href={prof.rpReqsData.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-500 hover:underline mt-1 inline-block">Source Link</a>
                    )}
                </div>
            )}
            {prof.programUrl && (
                <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Program Admission Page</div>
                    <a href={prof.programUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:underline block truncate">
                        {prof.programUrl}
                    </a>
                </div>
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

        {/* Footer for Database View */}
        {isDatabaseView && record && (
            <div className="mt-10 pt-8 border-t border-gray-100 flex flex-wrap items-center justify-between gap-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 bg-gray-100 rounded-lg text-gray-500">{record.country}</span>
                    <span className="px-3 py-1.5 bg-gray-100 rounded-lg text-gray-500">{record.fieldCategory}</span>
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
