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

  const record = isDatabaseView ? (prof as FacultyRecord) : null;

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group relative">
        {/* QS Badge */}
        {prof.qsRanking && (
            <div className="absolute top-0 right-0 -mt-3 -mr-3 bg-amber-400 text-white text-xs font-bold px-3 py-1.5 rounded-bl-xl rounded-tr-xl shadow-md z-10 flex items-center gap-1">
                <Award size={12} />
                {prof.qsRanking}
            </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-2 z-20">
            {isDatabaseView && record ? (
                <>
                    <button 
                        onClick={() => onEdit?.(record)}
                        className="p-2 bg-white text-gray-400 hover:text-blue-600 rounded-lg border border-gray-200 shadow-sm hover:shadow transition-all"
                        title="编辑导师信息"
                    >
                        <Pencil size={16} />
                    </button>
                    <button 
                        onClick={() => onRefresh?.(record)}
                        className="p-2 bg-white text-gray-400 hover:text-green-600 rounded-lg border border-gray-200 shadow-sm hover:shadow transition-all"
                        title="联网更新数据"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button 
                        onClick={() => onDelete?.(record.id)}
                        className="p-2 bg-white text-gray-400 hover:text-red-600 rounded-lg border border-gray-200 shadow-sm hover:shadow transition-all"
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
                            className={`p-2 rounded-lg border shadow-sm hover:shadow transition-all ${isSaved ? 'bg-amber-50 text-amber-500 border-amber-200' : 'bg-white text-gray-400 hover:text-amber-500 border-gray-200'}`}
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
                    className={`p-2 rounded-lg border shadow-sm hover:shadow transition-all ${isLinked ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-400 hover:text-blue-600 border-gray-200'}`}
                    title="推荐给学生"
                >
                    <UserPlus size={16} />
                </button>
            )}

            {onUnlink && (
                 <button 
                    onClick={() => onUnlink((prof as FacultyRecord).id)}
                    className="p-2 bg-white text-gray-400 hover:text-red-600 rounded-lg border border-gray-200 shadow-sm hover:shadow transition-all"
                    title="移除关联"
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
            {/* Left Side: Photo & Name */}
            <div className="flex flex-col md:flex-row gap-5 w-full">
                {/* Profile Photo */}
                <div className="flex-shrink-0">
                    {prof.photoUrl ? (
                        <div className="w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-gray-50 relative group/photo">
                            <img 
                                src={prof.photoUrl} 
                                alt={prof.name} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement?.classList.add('hidden');
                                    const fallback = document.getElementById(`fallback-${prof.name.replace(/\s/g, '')}`);
                                    if (fallback) fallback.classList.remove('hidden');
                                }}
                            />
                            {/* Fallback Element */}
                            <div id={`fallback-${prof.name.replace(/\s/g, '')}`} className="hidden absolute inset-0 bg-blue-50 flex items-center justify-center text-blue-400 font-bold text-2xl">
                                {prof.name.charAt(0)}
                            </div>
                        </div>
                    ) : (
                        <div className="w-20 h-20 rounded-xl bg-blue-50 flex items-center justify-center text-blue-400 font-bold text-2xl shadow-inner border border-blue-50">
                            {prof.name.charAt(0)}
                        </div>
                    )}
                </div>

                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2 pr-24">
                        <h4 className="text-2xl font-bold text-gray-900 leading-tight">
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
                                    <ExternalLink size={12} />
                                    个人主页
                                </a>
                            )}
                            {prof.email && (
                                <a 
                                    href={`mailto:${prof.email}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-200 transition-all border border-gray-200"
                                    title={`Email: ${prof.email}`}
                                >
                                    <Mail size={12} />
                                    联系邮箱
                                </a>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <p className="text-sm text-gray-500 font-semibold uppercase tracking-wide flex items-center gap-1">
                                <Briefcase size={14} />
                                {prof.title}
                            </p>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <p className="text-sm text-gray-900 font-bold flex items-center gap-1">
                                <School size={14} />
                                {prof.university}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prof.isActive ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-rose-700 bg-rose-50 border border-rose-100'}`}>
                                {prof.isActive ? '在职活跃' : '状态未知/离职'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-2 min-w-[80px] mt-8 md:mt-0">
                <div className={`px-4 py-1.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 ${
                    prof.matchScore >= 90 ? 'bg-emerald-500 text-white' :
                    prof.matchScore >= 80 ? 'bg-blue-500 text-white' :
                    prof.matchScore >= 60 ? 'bg-amber-500 text-white' :
                    'bg-gray-200 text-gray-500'
                }`}>
                    <span className="text-xs opacity-80 uppercase tracking-wider font-medium">Match</span>
                    {prof.matchScore}%
                </div>
            </div>
        </div>
        
        {/* Research Areas Tags */}
        <div className="mb-8">
                <div className="flex flex-wrap gap-2">
                {prof.researchAreas.map((area, i) => (
                    <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors cursor-default">
                        {area}
                    </span>
                ))}
                </div>
        </div>

        {/* === AUDIT REPORT CARD === */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-8 relative">
            {/* Header of Report */}
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">
                        <CheckCircle2 size={16} />
                    </div>
                    <span className="font-bold text-gray-800 text-sm tracking-tight">AI 深度匹配审计报告</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-white px-2 py-1 rounded border border-gray-100 shadow-sm">
                    Verified
                </span>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                {/* Decorative vertical line for desktop */}
                <div className="hidden md:block absolute left-1/2 top-6 bottom-6 w-px bg-gray-100"></div>

                {/* Left Column: Hard Constraints */}
                <div className="space-y-2">
                    <h6 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 
                        硬性指标核查
                    </h6>
                    <div className="space-y-1">
                        <AuditItem 
                            label="区域 / 国家" 
                            value={prof.matchReasoning.locationCheck}
                            icon={<MapPin size={16} />}
                        />
                        <AuditItem 
                            label="所属院校" 
                            value={prof.matchReasoning.universityCheck}
                            icon={<School size={16} />}
                        />
                        <AuditItem 
                            label="所在院系" 
                            value={prof.matchReasoning.departmentCheck}
                            icon={<Building2 size={16} />}
                        />
                        <AuditItem 
                            label="目前职级" 
                            value={prof.matchReasoning.positionCheck}
                            icon={<Briefcase size={16} />}
                        />
                    </div>
                </div>

                {/* Right Column: Soft Skills & Fit */}
                <div className="flex flex-col h-full">
                    <h6 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> 
                        活跃度与综合评价
                    </h6>
                    
                    <div className="grid grid-cols-1 gap-3 mb-6">
                        <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-100">
                            <div className="text-[10px] font-bold text-amber-600/70 uppercase mb-1">近期学术活跃度</div>
                            <div className="text-sm font-semibold text-amber-900 leading-snug">{prof.matchReasoning.activityCheck}</div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-100">
                            <div className="text-[10px] font-bold text-blue-600/70 uppercase mb-1">综合声望评价</div>
                            <div className="text-sm font-semibold text-blue-900 leading-snug">{prof.matchReasoning.reputationCheck}</div>
                        </div>
                    </div>
                    
                    <div className="mt-auto">
                        <h6 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 
                            核心契合点
                        </h6>
                        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                            <p className="text-sm text-gray-600 leading-relaxed font-medium">
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
                    <Clock size={16} className="text-gray-300" />
                    近五年学术动态 (按时间倒序)
                </h5>
                
                {/* Summary Block */}
                {prof.activitySummary && (
                    <div className="mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-900 leading-relaxed font-medium">
                        {prof.activitySummary}
                    </div>
                )}

                {/* Timeline with Scroll for long lists */}
                {prof.recentActivities && prof.recentActivities.length > 0 && (
                    <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-0 relative border-l border-gray-100 ml-2 pt-1 pb-1">
                            {prof.recentActivities.map((activity, i) => {
                                const parsed = parseActivity(activity);
                                return (
                                    <div key={i} className="mb-4 ml-6 relative group/item">
                                        <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-blue-200 group-hover/item:border-blue-400 transition-colors"></span>
                                        <p className="text-sm text-gray-600 leading-relaxed group-hover/item:text-gray-900 transition-colors">
                                            {parsed.tags ? (
                                                <>
                                                    <span className="font-bold text-blue-700 mr-2">{parsed.tags}</span>
                                                    <span className="text-gray-700 font-medium">{parsed.content}</span>
                                                </>
                                            ) : (
                                                <span className="text-gray-700 font-medium">{parsed.content}</span>
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
             <div className="mt-6 bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center justify-between">
                <div>
                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Next Deadline</div>
                    <div className="text-sm font-bold text-purple-900">{prof.deadlineData.value}</div>
                </div>
                {prof.deadlineData.sourceUrl && (
                    <a 
                        href={prof.deadlineData.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-purple-600 hover:text-purple-800 underline flex items-center gap-1"
                    >
                        Source <ExternalLink size={10} />
                    </a>
                )}
            </div>
        )}

        {/* Footer for Database View */}
        {isDatabaseView && record && (
            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">{record.country}</span>
                    <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">{record.fieldCategory}</span>
                    {record.customTags?.map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 rounded">{tag}</span>
                    ))}
                </div>
                <div className="flex items-center gap-4">
                    {linkedClientCount > 0 && (
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                            <UserPlus size={14} />
                            已关联 {linkedClientCount} 位学生
                        </span>
                    )}
                    <span>更新于: {new Date(record.updatedAt).toLocaleDateString()}</span>
                </div>
            </div>
        )}
    </div>
  );
};

export default FacultyCard;
