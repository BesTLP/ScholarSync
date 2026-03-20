import React, { useState } from 'react';
import { FacultyMember, FacultyProject, FacultyRecord } from '../types';
import { useEffect } from 'react';
import { describeWebSearchError, searchUniversityInfo } from '../services/geminiService';
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
  Loader2,
  Search,
  ChevronRight,
  Globe,
  Link2,
  ChevronDown,
  ChevronUp
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

function cleanText(value?: string | null): string {
  return String(value ?? '').replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

function normalizeMultilineText(value?: string | null): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripUrls(value?: string | null): string {
  return normalizeMultilineText(value).replace(/https?:\/\/[^\s)]+/gi, '').replace(/[ \t]{2,}/g, ' ').trim();
}

function extractUrls(value?: string | null): string[] {
  return Array.from(new Set(cleanText(value).match(/https?:\/\/[^\s)]+/gi) ?? []));
}

function mergeUrls(...values: Array<string[] | string | undefined>): string[] {
  const merged = new Set<string>();
  values.forEach((value) => {
    if (!value) return;
    const items = Array.isArray(value) ? value : [value];
    items.forEach((item) => {
      extractUrls(item).forEach((url) => merged.add(url));
      const cleaned = cleanText(item);
      if (/^https?:\/\//i.test(cleaned)) {
        merged.add(cleaned);
      }
    });
  });
  return Array.from(merged);
}

function hasAdmissionValue(value?: string | null): boolean {
  const normalized = cleanText(value);
  return Boolean(normalized && normalized !== '未找到官方数据' && normalized !== 'Not found in official sources');
}

function parseMetricLine(line: string): Array<{ key: string; value: string }> {
  const parts = line
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  const entries = parts
    .map((part) => {
      const matched = part.match(/^([^:：]+)[:：]\s*(.+)$/);
      return matched ? { key: matched[1].trim(), value: matched[2].trim() } : null;
    })
    .filter(Boolean) as Array<{ key: string; value: string }>;

  return entries.length >= 2 ? entries : [];
}

function normalizeNumberedSections(value: string): string {
  return value
    .replace(/\s+(\d+)[、.．]+(?:\s*)?(?=[A-Za-z\u4e00-\u9fff])/g, '\n$1. ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseNumberedSections(value?: string) {
  const text = normalizeNumberedSections(stripUrls(value));
  if (!text) return [];

  const matches = Array.from(text.matchAll(/(?:^|\n)\s*(\d+)[、.．]\s*/g));
  if (matches.length === 0) return [];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const contentStart = start + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? text.length : text.length;
    const rawContent = text.slice(contentStart, end).trim();
    const lines = rawContent
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const [firstLine = '', ...restLines] = lines;
    const titleMatch = firstLine.match(/^([^:：]+)[:：]\s*(.*)$/);
    const title = titleMatch ? titleMatch[1].trim() : firstLine;
    const intro = titleMatch ? titleMatch[2].trim() : '';
    const bodyLines = [intro, ...restLines].filter(Boolean);
    const metricRows = bodyLines
      .map((line) => parseMetricLine(line))
      .filter((row) => row.length > 0);
    const paragraphs = bodyLines.filter((line) => parseMetricLine(line).length === 0);

    return {
      index: match[1],
      title,
      metricRows,
      paragraphs,
    };
  });
}

function parseLabelValueBlocks(value?: string) {
  const text = stripUrls(value);
  if (!text) return [];

  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const rows: Array<{ key: string; value: string }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const matched = line.match(/^([^:：]{1,30})[:：]\s*(.*)$/);
    if (!matched) continue;
    const key = matched[1].trim();
    let valueText = matched[2].trim();
    if (!valueText && lines[index + 1]) {
      valueText = lines[index + 1].trim();
      index += 1;
    }
    if (key && valueText) {
      rows.push({ key, value: valueText });
    }
  }

  return rows;
}

function StructuredText({
  value,
  label,
}: {
  value?: string;
  label: string;
}) {
  const numberedSections = parseNumberedSections(value);
  const labelRows = numberedSections.length === 0 ? parseLabelValueBlocks(value) : [];
  const plainText = stripUrls(value);

  if (numberedSections.length > 0) {
    return (
      <div className="space-y-4">
        {numberedSections.map((section) => (
          <div key={`${label}_${section.index}_${section.title}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black text-white">{section.index}</span>
              <div className="text-sm font-bold text-slate-900">{section.title}</div>
            </div>
            {section.metricRows.map((row, rowIndex) => (
              <div key={`${section.index}_${rowIndex}`} className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-xs">
                  <tbody>
                    <tr>
                      {row.map((cell) => (
                        <td key={`${section.index}_${rowIndex}_${cell.key}`} className="border-b border-r border-slate-100 px-3 py-2 align-top last:border-r-0">
                          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{cell.key}</div>
                          <div className="mt-1 font-semibold text-slate-700">{cell.value}</div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
            {section.paragraphs.length > 0 && (
              <div className="space-y-2">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <div key={`${section.index}_p_${paragraphIndex}`} className="text-sm font-semibold leading-relaxed text-slate-700 whitespace-pre-wrap break-words">
                    {paragraph}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (labelRows.length >= 2) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <tbody>
            {labelRows.map((row) => (
              <tr key={`${label}_${row.key}`} className="border-b border-slate-100 last:border-b-0">
                <td className="w-40 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">{row.key}</td>
                <td className="px-3 py-2 font-semibold text-slate-700 whitespace-pre-wrap break-words">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="text-sm font-bold text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
      {plainText || '未提供结构化文本'}
    </div>
  );
}

const LinkChip = ({ href, label, subtle = false }: { href: string; label: string; subtle?: boolean }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
      subtle
        ? 'bg-white/70 text-blue-600 border border-blue-100 hover:bg-blue-50'
        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-100 hover:shadow-lg hover:-translate-y-0.5'
    }`}
  >
    <ExternalLink size={12} />
    {label}
  </a>
);

function buildSearchUrl(record: FacultyRecord, project: FacultyProject, keyword: string): string {
  const query = [
    record.universityEnglish || record.university,
    project.programNameEn || project.programNameZh || project.programName,
    keyword,
    'official',
  ]
    .filter(Boolean)
    .join(' ');

  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function ProjectFieldCard({
  label,
  value,
  urls,
  searchUrl,
  emptyMessage = '当前未记录',
}: {
  label: string;
  value?: string;
  urls: string[];
  searchUrl: string;
  emptyMessage?: string;
}) {
  const hasValue = Boolean(cleanText(value));

  return (
    <div className="bg-white/70 rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</div>
        <div className="flex flex-wrap items-center gap-2">
          {urls.length > 0 ? (
            urls.map((url, index) => (
              <LinkChip key={`${label}_${url}_${index}`} href={url} label={`来源 ${index + 1}`} subtle={true} />
            ))
          ) : (
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all"
            >
              <Search size={12} />
              联网搜索
            </a>
          )}
        </div>
      </div>
      <div className="min-h-[2rem]">
        {hasValue ? (
          <StructuredText value={value} label={label} />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectPanel({ project, record, isPrimary }: { project: FacultyProject; record: FacultyRecord; isPrimary: boolean }) {
  const title = project.programNameZh || project.programName || project.programNameEn || '未命名项目';
  const englishTitle = cleanText(project.programNameEn);
  const deadlineRaw = project.deadlineRaw || (isPrimary ? record.deadlineData?.value : '');
  const deadlineText = stripUrls(deadlineRaw);
  const deadlineUrls = mergeUrls(
    deadlineRaw,
    project.deadlineSourceUrls,
    isPrimary ? record.deadlineSourceUrls : [],
    isPrimary ? record.deadlineData?.sourceUrl : undefined,
  );
  const applicationRaw = project.applicationRequirementsRaw || (isPrimary ? record.applicationReqsData?.value : '');
  const applicationText = stripUrls(applicationRaw);
  const applicationUrls = mergeUrls(
    applicationRaw,
    project.applicationRequirementsSourceUrls,
    isPrimary ? record.applicationRequirementsSourceUrls : [],
    isPrimary ? record.applicationReqsData?.sourceUrl : undefined,
  );
  const rpRaw = project.rpRequirementsRaw || (isPrimary ? record.rpReqsData?.value : '');
  const rpText = stripUrls(rpRaw);
  const rpUrls = mergeUrls(
    rpRaw,
    project.rpRequirementsSourceUrls,
    isPrimary ? record.rpRequirementsSourceUrls : [],
    isPrimary ? record.rpReqsData?.sourceUrl : undefined,
  );
  const tuitionRaw = project.tuitionRaw || (isPrimary ? record.tuitionData?.value : '');
  const tuitionText = stripUrls(tuitionRaw);
  const tuitionUrls = mergeUrls(
    tuitionRaw,
    project.tuitionSourceUrls,
    isPrimary ? record.tuitionSourceUrls : [],
    isPrimary ? record.tuitionData?.sourceUrl : undefined,
  );
  const scholarshipRaw = project.scholarshipRaw || (isPrimary ? record.scholarshipData?.value : '');
  const scholarshipText = stripUrls(scholarshipRaw);
  const scholarshipUrls = mergeUrls(
    scholarshipRaw,
    project.scholarshipSourceUrls,
    isPrimary ? record.scholarshipSourceUrls : [],
    isPrimary ? record.scholarshipData?.sourceUrl : undefined,
  );

  return (
    <div className="bg-white/55 backdrop-blur-sm border border-white/60 rounded-[28px] p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="text-lg font-black text-gray-900 tracking-tight break-words">{title}</div>
          {englishTitle && englishTitle !== title && (
            <div className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-500 break-words">{englishTitle}</div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <span className="px-3 py-1.5 bg-slate-100 rounded-xl">{project.sourceWorkbook || '本地导入'}</span>
            {project.sourceSheet && <span className="px-3 py-1.5 bg-slate-100 rounded-xl">{project.sourceSheet}</span>}
            {project.sourceRowIndex && <span className="px-3 py-1.5 bg-slate-100 rounded-xl">Row {project.sourceRowIndex}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {project.programUrl && <LinkChip href={project.programUrl} label="专业链接" />}
          {record.universityUrl && <LinkChip href={record.universityUrl} label="院校官网" subtle={true} />}
          {record.profileUrl && <LinkChip href={record.profileUrl} label="导师主页" subtle={true} />}
        </div>
      </div>

      {project.recommendationReason && (
        <div className="mb-5 bg-blue-50/40 border-l-4 border-blue-500 p-5 rounded-r-3xl backdrop-blur-sm">
          <h6 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
            <Star size={14} className="fill-blue-500" />
            推荐理由
          </h6>
          <p className="text-sm text-gray-800 leading-relaxed font-medium whitespace-pre-wrap break-words">
            {project.recommendationReason}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <ProjectFieldCard label="申请截止日期" value={deadlineText} urls={deadlineUrls} searchUrl={buildSearchUrl(record, project, 'application deadline')} />
        <ProjectFieldCard label="申请要求及材料" value={applicationText} urls={applicationUrls} searchUrl={buildSearchUrl(record, project, 'admission requirements')} />
        <ProjectFieldCard label="RP 字数要求" value={rpText} urls={rpUrls} searchUrl={buildSearchUrl(record, project, 'research proposal requirements')} />
        <ProjectFieldCard label="学费" value={tuitionText} urls={tuitionUrls} searchUrl={buildSearchUrl(record, project, 'tuition fees')} />
        <ProjectFieldCard
          label="奖学金项目"
          value={scholarshipText}
          urls={scholarshipUrls}
          searchUrl={buildSearchUrl(record, project, 'scholarship funding')}
          emptyMessage="当前这条申请项目还没有录入奖学金内容。"
        />
      </div>
    </div>
  );
}

function truncateText(value?: string, maxLength = 140): string {
  const text = cleanText(value);
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
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

  const [admissionData, setAdmissionData] = useState<any>(null);
  const [loadingAdmission, setLoadingAdmission] = useState(false);
  const [admissionLoaded, setAdmissionLoaded] = useState(false);
  const [admissionStatusMessage, setAdmissionStatusMessage] = useState<string | null>(null);
  const [admissionStatusTone, setAdmissionStatusTone] = useState<'error' | 'info' | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const identityKey = prof && typeof prof === 'object' && 'id' in prof && prof.id
    ? prof.id
    : `${prof?.name ?? ''}::${prof?.university ?? ''}`;

  useEffect(() => {
    setImgError(false);
    setAdmissionData(null);
    setLoadingAdmission(false);
    setAdmissionLoaded(false);
    setAdmissionStatusMessage(null);
    setAdmissionStatusTone(null);
    setIsExpanded(false);
  }, [identityKey]);

  const handleLoadAdmission = async () => {
    setLoadingAdmission(true);
    setAdmissionStatusMessage(null);
    setAdmissionStatusTone(null);
    try {
      const data = await searchUniversityInfo(prof.university, prof.department);
      setAdmissionData(data);
      if (!data) {
        setAdmissionStatusTone('info');
        setAdmissionStatusMessage('本次联网检索已完成，但暂未查询到可用的招生数据。');
      }
    } catch (error) {
      console.error('University search failed:', error);
      setAdmissionData(null);
      setAdmissionStatusTone('error');
      setAdmissionStatusMessage(describeWebSearchError(error));
    }
    finally {
      setLoadingAdmission(false);
      setAdmissionLoaded(true);
    }
  };

  const record = isDatabaseView ? (prof as FacultyRecord) : null;
  const researchAreas = prof?.researchAreas ?? [];
  const recentActivities = prof?.recentActivities ?? [];
  const visibleResearchAreas = isExpanded ? researchAreas : researchAreas.slice(0, 4);
  const visibleActivities = isExpanded ? recentActivities : recentActivities.slice(0, 3);

  if (!prof) return null;

  return (
    <div className="mac-panel relative overflow-hidden rounded-[32px] border border-white/65 p-6 shadow-sm transition-all duration-300 group md:p-7">
        {/* Decorative Background Element */}
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl transition-colors duration-500 group-hover:bg-blue-500/10"></div>
        
        {/* QS Badge */}
        {prof.qsRanking && (
            <div className="absolute right-5 top-5 z-10 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md shadow-amber-200/50">
                <Award size={12} />
                QS {prof.qsRanking}
            </div>
        )}

        {/* Action Buttons */}
        <div className={`absolute ${prof.qsRanking ? 'top-20' : 'top-5'} right-5 z-20 flex flex-col gap-2 opacity-100 transition-all duration-300 md:translate-x-4 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100`}>
            {isDatabaseView && record ? (
                <>
                    <button 
                        onClick={() => onEdit?.(record)}
                        className="p-2.5 bg-white/60 backdrop-blur-sm text-gray-500 hover:text-blue-600 rounded-xl border border-white/50 shadow-sm hover:shadow-md transition-all active:scale-95"
                        title="编辑导师信息"
                    >
                        <Pencil size={16} />
                    </button>
                    <button 
                        onClick={() => onRefresh?.(record)}
                        className="p-2.5 bg-white/60 backdrop-blur-sm text-gray-500 hover:text-emerald-600 rounded-xl border border-white/50 shadow-sm hover:shadow-md transition-all active:scale-95"
                        title="联网更新数据"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button 
                        onClick={() => onDelete?.(record.id)}
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
                            onClick={() => onSave(prof)}
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
                    onClick={() => onLink(prof)}
                    className={`p-2.5 rounded-xl border backdrop-blur-sm shadow-sm hover:shadow-md transition-all active:scale-95 ${isLinked ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-blue-500/20' : 'bg-white/60 text-gray-400 hover:text-blue-600 border-white/50'}`}
                    title="推荐给学生"
                >
                    <UserPlus size={16} />
                </button>
            )}

            {onUnlink && (
                 <button 
                    onClick={() => onUnlink((prof as FacultyRecord).id)}
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
        <div className="mb-7 flex flex-col items-start justify-between gap-5 md:flex-row">
            {/* Left Side: Photo & Name */}
            <div className="flex w-full flex-col gap-6 md:flex-row">
                {/* Profile Photo */}
                <div className="flex-shrink-0">
                    {prof.photoUrl && prof.photoUrl.trim() !== '' && !imgError ? (
                        <div className="relative h-20 w-20 overflow-hidden rounded-3xl border-4 border-white bg-gray-50 shadow-xl shadow-gray-200/50 transition-transform duration-500 group/photo md:h-24 md:w-24 md:-rotate-3 md:hover:rotate-0">
                            <img 
                                src={prof.photoUrl} 
                                alt={prof.name} 
                                className="w-full h-full object-cover"
                                onError={() => setImgError(true)}
                            />
                        </div>
                    ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br from-blue-50 to-indigo-50 text-2xl font-black text-blue-500 shadow-inner transition-transform duration-500 md:h-24 md:w-24 md:text-3xl md:-rotate-3 md:hover:rotate-0">
                            {prof.name.charAt(0)}
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pr-20">
                        <h4 className="text-2xl font-black leading-none tracking-tight text-gray-900 md:text-3xl">
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
                            {record?.universityEnglish && record.universityEnglish !== prof.university && (
                                <>
                                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                    <p className="text-sm text-gray-500 font-bold flex items-center gap-2">
                                        <Globe size={16} className="text-sky-500/50" />
                                        {record.universityEnglish}
                                    </p>
                                </>
                            )}
                            {prof.school && (
                                <>
                                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                    <p className="text-sm text-gray-600 font-bold flex items-center gap-2">
                                        <Building2 size={16} className="text-purple-500/50" />
                                        {prof.school}
                                    </p>
                                </>
                            )}
                            {prof.department && prof.department !== prof.school && (
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
                            {prof.email && prof.email.trim() !== '' && (
                                <a 
                                    href={`mailto:${prof.email}`}
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

            <div className="mt-2 flex min-w-[92px] flex-col items-end gap-2 md:mt-0">
                <div className={`flex flex-col items-center gap-0.5 rounded-[20px] px-5 py-3 text-xl font-black shadow-lg transition-transform ${
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
        <div className="mb-5">
                <div className="flex flex-wrap gap-2">
                {visibleResearchAreas.map((area, i) => (
                    <span key={i} className="cursor-default rounded-xl border border-gray-200/60 bg-gray-100/55 px-3 py-1.5 text-[11px] font-bold text-gray-600 transition-all hover:bg-white hover:shadow-sm">
                        {area}
                    </span>
                ))}
                {!isExpanded && researchAreas.length > visibleResearchAreas.length && (
                    <span className="px-4 py-2 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-xl border border-blue-100">
                        +{researchAreas.length - visibleResearchAreas.length} 个方向
                    </span>
                )}
                </div>
        </div>

        {/* Alignment Details / Match Reason */}
        {prof.alignmentDetails && (
            <div className="mb-5 rounded-r-3xl border-l-4 border-blue-500 bg-blue-50/30 p-5 backdrop-blur-sm">
                <h6 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <Star size={14} className="fill-blue-500" />
                    匹配深度解析
                </h6>
                <p className="text-sm text-gray-800 leading-relaxed font-bold italic">
                    "{isExpanded ? prof.alignmentDetails : truncateText(prof.alignmentDetails, 180)}"
                </p>
            </div>
        )}

        {/* Classification Note */}
        {record?.classificationNote && (
            <div className="mb-6 rounded-r-3xl border-l-4 border-amber-500 bg-amber-50/30 p-5 backdrop-blur-sm">
                <h6 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <Pencil size={14} className="fill-amber-500 text-white" />
                    分类备注
                </h6>
                <p className="text-sm text-gray-800 leading-relaxed font-medium italic">
                    {isExpanded ? record.classificationNote : truncateText(record.classificationNote, 160)}
                </p>
            </div>
        )}

        {(record || recentActivities.length > 0 || prof.activitySummary) && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white/60 px-5 py-4 shadow-sm backdrop-blur-sm">
                <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Card Density</div>
                    <div className="mt-1 text-sm font-semibold text-gray-700">
                        {isExpanded ? '当前为详情视图，展示完整项目、审计和动态。' : '当前为缩略视图，只展示摘要和首个项目预览。'}
                    </div>
                </div>
                <button
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 transition hover:bg-slate-200"
                >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? '收起详情' : '展开详情'}
                </button>
            </div>
        )}

        {record && record.projects.length > 0 && isExpanded && (
            <div className="mb-10">
                <div className="flex items-center justify-between gap-3 mb-6">
                    <div>
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                            <Link2 size={18} className="text-indigo-500/30" />
                            申请项目与招生信息
                        </h5>
                        <div className="mt-2 text-sm text-gray-500 font-medium">
                            这里展示专业、申请要求、RP、学费和奖学金；缺失项会明确提示，不再混成旧的预览块。
                        </div>
                    </div>
                    <div className="px-4 py-2 rounded-2xl bg-white/70 border border-gray-100 text-xs font-black uppercase tracking-widest text-gray-500">
                        {record.projects.length} Projects
                    </div>
                </div>

                <div className="space-y-5">
                    {record.projects.map((project, index) => (
                        <ProjectPanel key={project.id} project={project} record={record} isPrimary={index === 0} />
                    ))}
                </div>
            </div>
        )}

        {/* Admission & Funding Data Section */}
        {isExpanded && (
        <div className="mb-10">
          {!admissionLoaded ? (
            <button onClick={handleLoadAdmission} disabled={loadingAdmission}
              className="w-full py-3.5 bg-gray-50/80 hover:bg-blue-50 border border-dashed border-gray-200 rounded-2xl text-sm font-bold text-gray-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2 group">
              {loadingAdmission ? (
                <><Loader2 size={14} className="animate-spin" /> 正在搜索招生数据...</>
              ) : (
                <><Search size={14} className="group-hover:scale-110 transition-transform" /> {record?.projects.length ? '补充联网招生数据（用于校对）' : '点击加载招生数据（学费 / 奖学金 / DDL）'}</>
              )}
            </button>
          ) : admissionData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hasAdmissionValue(admissionData.qsRanking) && (
                <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">QS World Ranking</div>
                  <div className="text-sm font-bold text-gray-800">{admissionData.qsRanking}</div>
                </div>
              )}
              {hasAdmissionValue(admissionData.tuition?.value) && (
                <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">学费</div>
                  <div className="text-sm font-bold text-gray-800">{admissionData.tuition.value}</div>
                  {admissionData.tuition.sourceUrl && <a href={admissionData.tuition.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-500 hover:underline mt-1 inline-block">来源</a>}
                </div>
              )}
              {hasAdmissionValue(admissionData.deadline?.value) && (
                <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">申请截止</div>
                  <div className="text-sm font-bold text-gray-800">{admissionData.deadline.value}</div>
                  {admissionData.deadline.sourceUrl && <a href={admissionData.deadline.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-500 hover:underline mt-1 inline-block">来源</a>}
                </div>
              )}
              {hasAdmissionValue(admissionData.requirements?.value) && (
                <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">申请要求</div>
                  <div className="text-sm font-bold text-gray-800">{admissionData.requirements.value}</div>
                  {admissionData.requirements.sourceUrl && <a href={admissionData.requirements.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-500 hover:underline mt-1 inline-block">来源</a>}
                </div>
              )}
              {hasAdmissionValue(admissionData.scholarships?.value) && (
                <div className="bg-white/60 p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">奖学金</div>
                  <div className="text-sm font-bold text-gray-800">{admissionData.scholarships.value}</div>
                  {admissionData.scholarships.sourceUrl && <a href={admissionData.scholarships.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-500 hover:underline mt-1 inline-block">来源</a>}
                </div>
              )}
            </div>
          ) : (
            <div
              className={`rounded-2xl py-4 text-center text-sm ${
                admissionStatusTone === 'error'
                  ? 'border border-rose-100 bg-rose-50 text-rose-600'
                  : 'bg-gray-50 text-gray-400'
              }`}
            >
              {admissionStatusMessage || '暂未查询到招生数据'}
            </div>
          )}
        </div>
        )}

        {/* === AUDIT REPORT CARD === */}
        {isExpanded && (
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
        )}

        {/* Recent Activities Timeline */}
        {(prof.activitySummary || recentActivities.length > 0) && (
            <div className="mt-10 px-2">
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <Clock size={18} className="text-blue-500/30" />
                    近五年学术动态
                </h5>
                
                {/* Summary Block */}
                {prof.activitySummary && (
                    <div className="mb-8 bg-blue-50/50 backdrop-blur-sm p-5 rounded-2xl border border-blue-100/50 text-sm text-blue-900 leading-relaxed font-bold">
                        {isExpanded ? prof.activitySummary : truncateText(prof.activitySummary, 220)}
                    </div>
                )}

                {/* Timeline with Scroll for long lists */}
                {visibleActivities && visibleActivities.length > 0 && (
                    <div className="max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                        <div className="space-y-0 relative border-l-2 border-gray-100/50 ml-3 pt-2 pb-2">
                            {visibleActivities.map((activity, i) => {
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
                {!isExpanded && recentActivities.length > visibleActivities.length && (
                    <div className="mt-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                        还有 {recentActivities.length - visibleActivities.length} 条动态，展开详情查看
                    </div>
                )}
            </div>
        )}

        {/* Deadline Info */}
        {isExpanded && prof.deadlineData && (
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
                    {record.subRegion && (
                        <span className="px-3 py-1.5 bg-gray-100 rounded-lg text-gray-500">{record.subRegion}</span>
                    )}
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
