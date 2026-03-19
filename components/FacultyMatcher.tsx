import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import FacultyCard from './FacultyCard';
import {
  buildEvaluationForClient,
  getLocalFacultyMatches,
  mergeLocalAndWebMatches,
} from '../services/facultyMatching';
import {
  buildClientProfileSummary,
  buildMatcherFiltersFromClient,
  buildSelectionProfile,
  buildSelectionProfilePatch,
  splitMultiValue,
} from '../services/selectionProfile';
import {
  describeWebSearchError,
  generateFacultyMatchesDecomposed,
  isAnyWebSearchProviderConfigured,
} from '../services/geminiService';
import type {
  Client,
  FacultyMember,
  FacultyRecord,
  MatcherSearchFilters,
  MatcherSearchTarget,
  MentorEvaluationSnapshot,
  RecommendationOrigin,
  SourceMode,
} from '../types';

type LinkOptions = {
  sourceModes?: SourceMode[];
  addedFrom?: RecommendationOrigin;
  evaluation?: MentorEvaluationSnapshot;
};

interface FacultyMatcherProps {
  clients?: Client[];
  selectedClient?: Client | null;
  facultyDatabase?: FacultyRecord[];
  onAddFacultyToDatabase?: (faculty: FacultyMember, country: string, fieldCategory: string) => string;
  onLinkFacultyToClient?: (facultyId: string, clientId: string, options?: LinkOptions) => void;
  onUpdateClient?: (client: Client) => void;
  onAddClient?: (name: string, parsedData: Partial<Client>) => void;
}

function createTarget(index = 1): MatcherSearchTarget {
  return {
    id: `target_${Date.now()}_${index}`,
    country: '',
    university: '',
    school: '',
    department: '',
    major: '',
    count: 5,
  };
}

function createDefaultFilters(): MatcherSearchFilters {
  return {
    sourceModes: ['local', 'web'],
    targets: [createTarget()],
    degreeType: 'unspecified',
    majorA: '',
    majorB: '',
    crossDiscipline: false,
    officialLinks: [],
    profileSummary: '',
    manualNotes: '',
    scholarshipRequirement: '',
    exclusions: '',
    rankingPreference: '',
    specialRequirements: '',
    targetPosition: '',
    entryYear: '',
    businessCoordinator: '',
    selectionType: '',
    selectionCount: 5,
    selectionDeadline: '',
    hasRP: undefined,
    hasCV: undefined,
    hasPublications: undefined,
    rpTopic: '',
    avoidPreviousMentors: '',
  };
}

const Section = ({ title, step, children }: { title: string; step: string; children: React.ReactNode }) => (
  <section className="rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_16px_60px_rgba(15,23,42,0.05)]">
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
      <div className="text-sm font-black text-slate-900">{title}</div>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{step}</div>
    </div>
    <div className="px-5 py-4">{children}</div>
  </section>
);

const Field = ({
  label,
  value,
  onChange,
  textarea = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  placeholder?: string;
}) => (
  <label className="block space-y-2">
    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
    {textarea ? (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
      />
    ) : (
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
      />
    )}
  </label>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-200 bg-white/85 px-8 text-center">
    <div className="rounded-3xl bg-blue-50 p-5 text-blue-600">
      <Search size={32} />
    </div>
    <div className="mt-5 text-xl font-black text-slate-900">{title}</div>
    <div className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</div>
  </div>
);

const SourceCard = ({
  checked,
  label,
  description,
  onToggle,
}: {
  checked: boolean;
  label: string;
  description: string;
  onToggle: (checked: boolean) => void;
}) => (
  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm">
    <input type="checkbox" checked={checked} onChange={(event) => onToggle(event.target.checked)} className="mt-1" />
    <div>
      <div className="font-black text-slate-900">{label}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
    </div>
  </label>
);

const BooleanCard = ({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: (checked: boolean) => void;
}) => (
  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-slate-700">
    <input type="checkbox" checked={checked} onChange={(event) => onToggle(event.target.checked)} />
    {label}
  </label>
);

const FacultyMatcher: React.FC<FacultyMatcherProps> = ({
  clients = [],
  selectedClient = null,
  facultyDatabase = [],
  onAddFacultyToDatabase,
  onLinkFacultyToClient,
  onUpdateClient,
}) => {
  const [selectedClientId, setSelectedClientId] = useState(selectedClient?.id || '');
  const [filters, setFilters] = useState<MatcherSearchFilters>(() =>
    selectedClient ? buildMatcherFiltersFromClient(selectedClient) : createDefaultFilters(),
  );
  const [localResults, setLocalResults] = useState<FacultyRecord[]>([]);
  const [webResults, setWebResults] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const activeClient = useMemo(
    () => clients.find((item) => item.id === selectedClientId) || selectedClient || null,
    [clients, selectedClient, selectedClientId],
  );

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selectedClient) return;
    setSelectedClientId(selectedClient.id);
    setFilters(buildMatcherFiltersFromClient(selectedClient));
  }, [selectedClient]);

  const updateFilters = (patch: Partial<MatcherSearchFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const updateTarget = (targetId: string, patch: Partial<MatcherSearchTarget>) => {
    setFilters((current) => ({
      ...current,
      targets: current.targets.map((target) => (target.id === targetId ? { ...target, ...patch } : target)),
    }));
  };

  const removeTarget = (targetId: string) => {
    setFilters((current) => ({
      ...current,
      targets: current.targets.length === 1 ? current.targets : current.targets.filter((target) => target.id !== targetId),
    }));
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((item) => item.id === clientId);
    setFilters(client ? buildMatcherFiltersFromClient(client) : createDefaultFilters());
  };

  const toggleSourceMode = (mode: SourceMode, checked: boolean) => {
    setFilters((current) => ({
      ...current,
      sourceModes: checked
        ? Array.from(new Set([...current.sourceModes, mode]))
        : current.sourceModes.filter((item) => item !== mode),
    }));
  };

  const syncBackToClient = () => {
    if (!activeClient || !onUpdateClient) return;

    const nextProfile = {
      ...buildSelectionProfile(activeClient),
      countries: Array.from(new Set(filters.targets.map((item) => item.country || '').filter(Boolean))),
      universities: Array.from(new Set(filters.targets.map((item) => item.university || '').filter(Boolean))),
      departments: Array.from(
        new Set(filters.targets.flatMap((item) => [item.school || '', item.department || '']).filter(Boolean)),
      ),
      majors: Array.from(
        new Set(filters.targets.flatMap((item) => [item.major || '', filters.majorA || '', filters.majorB || '']).filter(Boolean)),
      ),
      degreeType: filters.degreeType,
      majorA: filters.majorA || '',
      majorB: filters.majorB || '',
      crossDiscipline: filters.crossDiscipline,
      officialLinks: filters.officialLinks,
      targetPosition: filters.targetPosition || '',
      entryYear: filters.entryYear || '',
      selectionCount: filters.selectionCount,
      selectionType: filters.selectionType || '',
      selectionDeadline: filters.selectionDeadline || '',
      scholarshipRequirement: filters.scholarshipRequirement || '',
      exclusions: filters.exclusions || '',
      rankingPreference: filters.rankingPreference || '',
      specialRequirements: filters.specialRequirements || '',
      businessCoordinator: filters.businessCoordinator || '',
      hasRP: filters.hasRP,
      hasCV: filters.hasCV,
      hasPublications: filters.hasPublications,
      rpTopic: filters.rpTopic || '',
      avoidPreviousMentors: filters.avoidPreviousMentors || '',
    };

    onUpdateClient({
      ...activeClient,
      ...buildSelectionProfilePatch(nextProfile),
    });
    setToast('当前结构化检索条件已同步回学生档案。');
  };

  const buildManualContent = () =>
    [
      filters.manualNotes,
      filters.specialRequirements,
      filters.rankingPreference ? `排名偏好：${filters.rankingPreference}` : '',
      filters.selectionType ? `筛选类型：${filters.selectionType}` : '',
      filters.selectionDeadline ? `筛选截止：${filters.selectionDeadline}` : '',
      filters.rpTopic ? `RP 主题：${filters.rpTopic}` : '',
      filters.avoidPreviousMentors ? `避免重复导师：${filters.avoidPreviousMentors}` : '',
      filters.hasRP === undefined ? '' : `RP 状态：${filters.hasRP ? '已准备' : '未准备'}`,
      filters.hasCV === undefined ? '' : `CV 状态：${filters.hasCV ? '已准备' : '未准备'}`,
      filters.hasPublications === undefined ? '' : `论文状态：${filters.hasPublications ? '已有成果' : '暂无成果'}`,
      filters.officialLinks.length > 0 ? `指定院校链接：${filters.officialLinks.join(' | ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

  const runSearch = async () => {
    if (filters.sourceModes.length === 0) {
      setToast('请至少选择一个搜索来源。');
      return;
    }

    setLoading(true);
    try {
      const nextLocal = filters.sourceModes.includes('local') ? getLocalFacultyMatches(facultyDatabase, filters) : [];
      let mergedLocal = nextLocal;
      let mergedWeb: FacultyMember[] = [];
      let toastMessage = '';

      if (filters.sourceModes.includes('web')) {
        if (!isAnyWebSearchProviderConfigured()) {
          toastMessage = filters.sourceModes.includes('local')
            ? `本地匹配已返回 ${nextLocal.length} 位导师；联网导师检索需要至少配置 OpenAI 或 Gemini 其中之一。`
            : '联网导师检索需要至少配置 OpenAI 或 Gemini 其中之一。';
        } else {
          try {
            const departmentQuery = [
              ...filters.targets.flatMap((item) => [item.school || '', item.department || '', item.major || '']),
              filters.majorA || '',
              filters.majorB || '',
            ]
              .filter(Boolean)
              .join(' / ');

            const result = await generateFacultyMatchesDecomposed({
              studentProfile: filters.profileSummary || buildClientProfileSummary(activeClient || {}),
              directoryUrl: filters.officialLinks[0],
              targets: filters.targets.map((item) => ({
                region: item.country || '',
                university: item.university || '',
                count: item.count || filters.selectionCount || 5,
              })),
              department: departmentQuery,
              manualContent: buildManualContent(),
              targetPosition: filters.targetPosition,
              entryYear: filters.entryYear,
              scholarship: filters.scholarshipRequirement,
              exclusions: filters.exclusions,
              businessInfo: filters.businessCoordinator,
            });

            const merged = mergeLocalAndWebMatches(nextLocal, result.allFaculty || [], filters);
            mergedLocal = merged.local;
            mergedWeb = merged.web;
          } catch (error) {
            console.error('Web faculty match failed:', error);
            toastMessage = filters.sourceModes.includes('local')
              ? `本地匹配已返回 ${nextLocal.length} 位导师；${describeWebSearchError(error)}`
              : describeWebSearchError(error);
          }
        }
      }

      setLocalResults(mergedLocal);
      setWebResults(mergedWeb);
      if (!toastMessage && mergedLocal.length + mergedWeb.length === 0) {
        const reasons: string[] = [];
        if (filters.sourceModes.includes('local')) {
          reasons.push(`本地导师库当前共 ${facultyDatabase.length} 位导师，但这组筛选条件命中 0 位`);
        }
        if (filters.sourceModes.includes('web')) {
          reasons.push('联网检索这次没有返回可用导师');
        }
        toastMessage =
          reasons.length > 0
            ? `${reasons.join('；')}。请先导入导师总表，或补充更具体的国家、学校、专业条件后再试。`
            : '这次没有检索到可用导师，请补充更具体的筛选条件后重试。';
      }
      setToast(toastMessage || `检索完成，共返回 ${mergedLocal.length + mergedWeb.length} 位导师。`);
    } catch (error) {
      console.error('Faculty match failed:', error);
      setToast('导师检索失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  const linkToStudent = (faculty: FacultyMember | FacultyRecord, sourceModes: SourceMode[]) => {
    if (!activeClient || !onLinkFacultyToClient) {
      setToast('请先选择服务对象，再添加导师。');
      return;
    }

    let facultyId = 'id' in faculty ? faculty.id : '';
    if (!facultyId && onAddFacultyToDatabase) {
      facultyId = onAddFacultyToDatabase(
        faculty,
        filters.targets[0]?.country || '',
        filters.targets[0]?.major || filters.targets[0]?.department || '未分类',
      );
    }

    if (!facultyId) {
      setToast('当前导师尚未写入导师库，暂时无法关联。');
      return;
    }

    onLinkFacultyToClient(facultyId, activeClient.id, {
      sourceModes,
      addedFrom: 'matcher',
      evaluation: buildEvaluationForClient(activeClient, faculty, filters),
    });
    setToast(`已将 ${faculty.name} 添加到 ${activeClient.name} 的推荐导师。`);
  };

  const resultCount = localResults.length + webResults.length;

  return (
    <div className="h-full overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f5f7fb_100%)] p-4">
      <div className="grid h-full gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="flex h-full max-h-[calc(100vh-110px)] flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white/92 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <Search size={20} />
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight text-slate-950">智能导师检索</div>
                <div className="mt-1 text-sm text-slate-500">基于学生档案生成结构化检索条件，支持本地匹配和联网匹配。</div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              <Section title="服务对象" step="Step 01">
                <div className="space-y-3">
                  <label className="block space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">选择学生</div>
                    <div className="relative">
                      <select
                        value={selectedClientId}
                        onChange={(event) => handleSelectClient(event.target.value)}
                        className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      >
                        <option value="">不绑定学生，手动填写检索条件</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </label>

                  {activeClient ? (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                      <div className="font-bold">{activeClient.name}</div>
                      <div className="mt-1 text-blue-700">{filters.profileSummary || buildClientProfileSummary(activeClient)}</div>
                      <button
                        onClick={syncBackToClient}
                        className="mt-3 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                      >
                        把当前筛选同步回学生档案
                      </button>
                    </div>
                  ) : null}
                </div>
              </Section>

              <Section title="搜索来源" step="Step 02">
                <div className="grid gap-3 sm:grid-cols-2">
                  <SourceCard
                    checked={filters.sourceModes.includes('local')}
                    label="本地匹配"
                    description="优先使用已导入的澳洲总表、香港总表等本地申请字段。"
                    onToggle={(checked) => toggleSourceMode('local', checked)}
                  />
                  <SourceCard
                    checked={filters.sourceModes.includes('web')}
                    label="联网匹配"
                    description="联网补充导师官网、近期活动和库外导师；这部分当前依赖 Gemini。"
                    onToggle={(checked) => toggleSourceMode('web', checked)}
                  />
                </div>
              </Section>

              <Section title="目标定位" step="Step 03">
                <div className="space-y-4">
                  {filters.targets.map((target, index) => (
                    <div key={target.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-sm font-black text-slate-900">目标块 {index + 1}</div>
                        {filters.targets.length > 1 ? (
                          <button
                            onClick={() => removeTarget(target.id)}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field label="国家 / 地区" value={target.country || ''} onChange={(value) => updateTarget(target.id, { country: value })} />
                        <Field label="学校" value={target.university || ''} onChange={(value) => updateTarget(target.id, { university: value })} />
                        <Field label="学院 / School" value={target.school || ''} onChange={(value) => updateTarget(target.id, { school: value })} />
                        <Field label="系 / Department" value={target.department || ''} onChange={(value) => updateTarget(target.id, { department: value })} />
                        <Field label="专业" value={target.major || ''} onChange={(value) => updateTarget(target.id, { major: value })} />
                        <Field
                          label="目标数量"
                          value={String(target.count || 5)}
                          onChange={(value) => updateTarget(target.id, { count: Number(value) || 5 })}
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => updateFilters({ targets: [...filters.targets, createTarget(filters.targets.length + 1)] })}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100"
                  >
                    <Plus size={16} />
                    添加目标块
                  </button>
                </div>
              </Section>

              <Section title="申请层级与背景" step="Step 04">
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="专业 A" value={filters.majorA || ''} onChange={(value) => updateFilters({ majorA: value })} />
                    <Field label="专业 B" value={filters.majorB || ''} onChange={(value) => updateFilters({ majorB: value })} />
                    <Field label="目标职级" value={filters.targetPosition || ''} onChange={(value) => updateFilters({ targetPosition: value })} />
                    <Field label="入学年份" value={filters.entryYear || ''} onChange={(value) => updateFilters({ entryYear: value })} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">申请层级</div>
                      <select
                        value={filters.degreeType || 'unspecified'}
                        onChange={(event) => updateFilters({ degreeType: event.target.value as MatcherSearchFilters['degreeType'] })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      >
                        <option value="unspecified">未指定</option>
                        <option value="phd">申博</option>
                        <option value="master">申硕</option>
                      </select>
                    </label>

                    <BooleanCard
                      checked={Boolean(filters.crossDiscipline)}
                      label="勾选后按交叉学科处理专业 A 与专业 B"
                      onToggle={(checked) => updateFilters({ crossDiscipline: checked })}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="筛选类型" value={filters.selectionType || ''} onChange={(value) => updateFilters({ selectionType: value })} />
                    <Field
                      label="目标数量"
                      value={String(filters.selectionCount || 5)}
                      onChange={(value) => updateFilters({ selectionCount: Number(value) || 5 })}
                    />
                    <Field label="筛选截止" value={filters.selectionDeadline || ''} onChange={(value) => updateFilters({ selectionDeadline: value })} />
                  </div>

                  <Field
                    label="学生背景摘要"
                    value={filters.profileSummary || ''}
                    onChange={(value) => updateFilters({ profileSummary: value })}
                    textarea={true}
                    placeholder="支持自动回填，也可以手动补充。"
                  />
                  <Field
                    label="补充说明"
                    value={filters.manualNotes || ''}
                    onChange={(value) => updateFilters({ manualNotes: value })}
                    textarea={true}
                    placeholder="例如研究兴趣、论文题目、业务侧备注等。"
                  />
                  <Field
                    label="指定院校链接"
                    value={filters.officialLinks.join('\n')}
                    onChange={(value) => updateFilters({ officialLinks: splitMultiValue(value) })}
                    textarea={true}
                    placeholder="每行一个链接。"
                  />

                  <div className="grid gap-3 md:grid-cols-3">
                    <BooleanCard checked={Boolean(filters.hasRP)} label="已准备 RP" onToggle={(checked) => updateFilters({ hasRP: checked })} />
                    <BooleanCard checked={Boolean(filters.hasCV)} label="已准备 CV" onToggle={(checked) => updateFilters({ hasCV: checked })} />
                    <BooleanCard
                      checked={Boolean(filters.hasPublications)}
                      label="已有论文 / 发表"
                      onToggle={(checked) => updateFilters({ hasPublications: checked })}
                    />
                  </div>

                  <Field label="RP 主题" value={filters.rpTopic || ''} onChange={(value) => updateFilters({ rpTopic: value })} />
                  <Field
                    label="避免重复导师"
                    value={filters.avoidPreviousMentors || ''}
                    onChange={(value) => updateFilters({ avoidPreviousMentors: value })}
                    textarea={true}
                  />
                </div>
              </Section>

              <Section title="限制条件" step="Step 05">
                <div className="space-y-3">
                  <Field label="奖学金要求" value={filters.scholarshipRequirement || ''} onChange={(value) => updateFilters({ scholarshipRequirement: value })} />
                  <Field label="排除项" value={filters.exclusions || ''} onChange={(value) => updateFilters({ exclusions: value })} textarea={true} />
                  <Field label="排名偏好" value={filters.rankingPreference || ''} onChange={(value) => updateFilters({ rankingPreference: value })} />
                  <Field label="特殊要求" value={filters.specialRequirements || ''} onChange={(value) => updateFilters({ specialRequirements: value })} textarea={true} />
                  <Field label="业务备注" value={filters.businessCoordinator || ''} onChange={(value) => updateFilters({ businessCoordinator: value })} />
                </div>
              </Section>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-white px-4 py-4">
            <button
              onClick={runSearch}
              disabled={loading || filters.sourceModes.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              执行结构化搜索
            </button>
          </div>
        </div>

        <div className="h-full overflow-y-auto rounded-[32px] border border-slate-200 bg-white/92 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-4xl font-black tracking-tight text-slate-950">推荐导师列表</div>
              <div className="mt-2 text-sm text-slate-500">本地库优先显示总表字段，联网结果只作为补充证据或发现新导师。</div>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
              共 {resultCount} 位
            </div>
          </div>

          {resultCount === 0 ? (
            <EmptyState title="准备就绪" description="左侧表单可以独立滚动，底部搜索按钮始终可点击；选择学生后会自动回填结构化字段。" />
          ) : (
            <div className="space-y-8">
              {localResults.length > 0 ? (
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">本地匹配</div>
                    <div className="text-sm font-semibold text-slate-500">优先显示澳洲总表 / 香港总表等本地库中的申请字段</div>
                  </div>
                  <div className="grid gap-5 xl:grid-cols-2">
                    {localResults.map((faculty) => (
                      <FacultyCard
                        key={faculty.id}
                        prof={faculty}
                        onLink={() => linkToStudent(faculty, ['local'])}
                        isLinked={Boolean(activeClient?.linkedFacultyIds?.includes(faculty.id))}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {webResults.length > 0 ? (
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">联网匹配</div>
                    <div className="text-sm font-semibold text-slate-500">用于补充官网证据、近期活动和库外导师</div>
                  </div>
                  <div className="grid gap-5 xl:grid-cols-2">
                    {webResults.map((faculty) => (
                      <FacultyCard
                        key={`${faculty.name}_${faculty.university}_${faculty.profileUrl || ''}`}
                        prof={{
                          ...faculty,
                          evaluation: activeClient ? buildEvaluationForClient(activeClient, faculty, filters) : faculty.evaluation,
                        }}
                        onLink={() => linkToStudent(faculty, ['web'])}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[90] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-2xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
};

export default FacultyMatcher;
