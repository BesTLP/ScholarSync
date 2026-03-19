import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  CalendarClock,
  Edit3,
  FileText,
  GraduationCap,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
  Star,
  Target,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from 'lucide-react';
import { generateProfileAnalysis } from '../services/geminiService';
import {
  buildEvaluationForClient,
  filterFacultyDatabaseByPanelFilters,
  getRecommendationSourceModes,
} from '../services/facultyMatching';
import {
  buildSelectionProfile,
  buildSelectionProfilePatch,
  joinMultiValue,
  splitMultiValue,
} from '../services/selectionProfile';
import type {
  Client,
  ClientDocument,
  ClientSelectionProfile,
  FacultyRecord,
  MentorEvaluationSnapshot,
  MentorRecommendation,
  RecommendationOrigin,
  SourceMode,
} from '../types';
import FacultyCard from './FacultyCard';

type DetailTab = 'profile' | 'documents' | 'mentors';

type LinkOptions = {
  sourceModes?: SourceMode[];
  addedFrom?: RecommendationOrigin;
  evaluation?: MentorEvaluationSnapshot;
};

interface ClientDetailProps {
  client: Client;
  onBack: () => void;
  onStartWriting: (type?: string) => void;
  onEditDocument: (doc: ClientDocument) => void;
  onUpdateClient: (client: Client) => void;
  initialTab?: DetailTab;
  facultyDatabase?: FacultyRecord[];
  onLinkFacultyToClient?: (facultyId: string, clientId: string, options?: LinkOptions) => void;
  onUnlinkFacultyFromClient?: (facultyId: string, clientId: string) => void;
  onDeleteClient?: (clientId: string) => void;
  onOpenAdvancedFacultyFilters?: (client: Client) => void;
}

type PickerFilters = {
  country: string;
  university: string;
  school: string;
  department: string;
  major: string;
  keyword: string;
  projectKeyword: string;
  hasScholarship: boolean;
  degreeType: 'phd' | 'master' | 'unspecified';
};

const EMPTY_PICKER_FILTERS: PickerFilters = {
  country: '',
  university: '',
  school: '',
  department: '',
  major: '',
  keyword: '',
  projectKeyword: '',
  hasScholarship: false,
  degreeType: 'unspecified',
};

const documentTypeToAction: Record<string, string> = {
  PS: '写PS',
  Essay: '写命题文书',
  LOR: '写推荐信',
  CV: '写CV',
  'Free Writing': '自由写作',
};

function formatDate(value?: string) {
  if (!value) return '未填写';
  return value;
}

function boolLabel(value?: boolean) {
  if (value === true) return '已具备';
  if (value === false) return '暂未准备';
  return '未填写';
}

function summarizeRecommendation(
  recommendation: MentorRecommendation | undefined,
  fallbackScore: number,
) {
  const evaluation = recommendation?.evaluation;
  if (!evaluation) {
    return {
      score: fallbackScore,
      bandLabel: fallbackScore >= 80 ? '高匹配' : fallbackScore >= 60 ? '中匹配' : '待确认',
      summary: '暂未保存评估，建议点击“一键评估”生成统一评分。',
      reasons: [] as string[],
    };
  }

  return {
    score: evaluation.score,
    bandLabel: evaluation.band === 'high' ? '高匹配' : evaluation.band === 'medium' ? '中匹配' : '低匹配',
    summary: evaluation.summary,
    reasons: evaluation.reasons,
  };
}

function createProfileDraft(profile: ClientSelectionProfile) {
  return {
    countries: joinMultiValue(profile.countries, '\n'),
    universities: joinMultiValue(profile.universities, '\n'),
    departments: joinMultiValue(profile.departments, '\n'),
    majors: joinMultiValue(profile.majors, '\n'),
    degreeType: profile.degreeType || 'unspecified',
    majorA: profile.majorA || '',
    majorB: profile.majorB || '',
    crossDiscipline: Boolean(profile.crossDiscipline),
    officialLinks: joinMultiValue(profile.officialLinks, '\n'),
    targetPosition: profile.targetPosition || '',
    entryYear: profile.entryYear || '',
    selectionCount: profile.selectionCount ? String(profile.selectionCount) : '',
    selectionType: profile.selectionType || '',
    selectionDeadline: profile.selectionDeadline || '',
    scholarshipRequirement: profile.scholarshipRequirement || '',
    exclusions: profile.exclusions || '',
    rankingPreference: profile.rankingPreference || '',
    specialRequirements: profile.specialRequirements || '',
    businessCoordinator: profile.businessCoordinator || '',
    hasRP: profile.hasRP,
    hasCV: profile.hasCV,
    hasPublications: profile.hasPublications,
    rpTopic: profile.rpTopic || '',
    avoidPreviousMentors: profile.avoidPreviousMentors || '',
  };
}

function draftToProfile(draft: ReturnType<typeof createProfileDraft>): ClientSelectionProfile {
  return {
    countries: splitMultiValue(draft.countries),
    universities: splitMultiValue(draft.universities),
    departments: splitMultiValue(draft.departments),
    majors: splitMultiValue(draft.majors),
    degreeType: draft.degreeType,
    majorA: draft.majorA.trim(),
    majorB: draft.majorB.trim(),
    crossDiscipline: draft.crossDiscipline,
    officialLinks: splitMultiValue(draft.officialLinks),
    targetPosition: draft.targetPosition.trim(),
    entryYear: draft.entryYear.trim(),
    selectionCount: draft.selectionCount ? Number(draft.selectionCount) : undefined,
    selectionType: draft.selectionType.trim(),
    selectionDeadline: draft.selectionDeadline.trim(),
    scholarshipRequirement: draft.scholarshipRequirement.trim(),
    exclusions: draft.exclusions.trim(),
    rankingPreference: draft.rankingPreference.trim(),
    specialRequirements: draft.specialRequirements.trim(),
    businessCoordinator: draft.businessCoordinator.trim(),
    hasRP: draft.hasRP,
    hasCV: draft.hasCV,
    hasPublications: draft.hasPublications,
    rpTopic: draft.rpTopic.trim(),
    avoidPreviousMentors: draft.avoidPreviousMentors.trim(),
  };
}

const Panel = ({
  title,
  action,
  icon,
  children,
  className = '',
}: {
  title: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.06)] ${className}`}>
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-3">
        {icon ? <div className="rounded-2xl bg-slate-100 p-2 text-slate-600">{icon}</div> : null}
        <div className="text-sm font-black tracking-wide text-slate-900">{title}</div>
      </div>
      {action}
    </div>
    <div className="px-5 py-4">{children}</div>
  </section>
);

const MiniStat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
    <div className="mt-2 text-lg font-black text-slate-900">{value}</div>
  </div>
);

const FieldList = ({ rows }: { rows: Array<{ label: string; value?: string | number | null }> }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {rows.map((row) => (
      <div key={row.label} className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{row.label}</div>
        <div className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-700">
          {row.value || '未填写'}
        </div>
      </div>
    ))}
  </div>
);

const EmptyBlock = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-5 text-center">
    <div className="text-sm font-bold text-slate-700">{title}</div>
    <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
  </div>
);

const ClientDetail: React.FC<ClientDetailProps> = ({
  client,
  onBack,
  onStartWriting,
  onEditDocument,
  onUpdateClient,
  initialTab = 'profile',
  facultyDatabase = [],
  onLinkFacultyToClient,
  onUnlinkFacultyFromClient,
  onDeleteClient,
  onOpenAdvancedFacultyFilters,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  const [analysis, setAnalysis] = useState('');
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState(() => createProfileDraft(buildSelectionProfile(client)));
  const [mentorPickerOpen, setMentorPickerOpen] = useState(false);
  const [pickerFilters, setPickerFilters] = useState<PickerFilters>(EMPTY_PICKER_FILTERS);
  const [pickerSelectedIds, setPickerSelectedIds] = useState<string[]>([]);
  const [selectedMentorIds, setSelectedMentorIds] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, client.id]);

  useEffect(() => {
    const nextProfile = buildSelectionProfile(client);
    setProfileDraft(createProfileDraft(nextProfile));
    setPickerFilters({
      country: nextProfile.countries[0] || '',
      university: nextProfile.universities[0] || '',
      school: nextProfile.departments[0] || '',
      department: nextProfile.departments[1] || '',
      major: nextProfile.majorA || nextProfile.majors[0] || '',
      keyword: '',
      projectKeyword: nextProfile.majorB || '',
      hasScholarship: Boolean(nextProfile.scholarshipRequirement),
      degreeType: nextProfile.degreeType || 'unspecified',
    });
    setSelectedMentorIds([]);
    setPickerSelectedIds([]);
  }, [client]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectionProfile = useMemo(() => buildSelectionProfile(client), [client]);
  const recommendationMap = useMemo(
    () => new Map((client.mentorRecommendations || []).map((item) => [item.facultyId, item])),
    [client.mentorRecommendations],
  );

  const recommendedFaculty = useMemo(() => {
    const ids = new Set<string>([
      ...(client.linkedFacultyIds || []),
      ...(client.mentorRecommendations || []).map((item) => item.facultyId),
    ]);

    return facultyDatabase.filter((faculty) => ids.has(faculty.id));
  }, [client.linkedFacultyIds, client.mentorRecommendations, facultyDatabase]);

  const mentorPickerResults = useMemo(() => {
    const projectKeyword = [pickerFilters.projectKeyword, pickerFilters.major].filter(Boolean).join(' ');
    return filterFacultyDatabaseByPanelFilters(facultyDatabase, {
      country: pickerFilters.country,
      university: pickerFilters.university,
      school: pickerFilters.school,
      department: [pickerFilters.department, pickerFilters.major].filter(Boolean).join(' '),
      keyword: pickerFilters.keyword,
      projectKeyword,
      hasScholarship: pickerFilters.hasScholarship,
      degreeType: pickerFilters.degreeType,
    });
  }, [facultyDatabase, pickerFilters]);

  const selectedMentors = useMemo(
    () => recommendedFaculty.filter((faculty) => selectedMentorIds.includes(faculty.id)),
    [recommendedFaculty, selectedMentorIds],
  );

  const upcomingEvents = useMemo(
    () =>
      [...(client.events || [])]
        .sort((left, right) => `${left.date}${left.time || ''}`.localeCompare(`${right.date}${right.time || ''}`))
        .slice(0, 5),
    [client.events],
  );

  const documents = client.documents || [];
  const bestRecommendationScore = recommendedFaculty.reduce((best, faculty) => {
    const score = recommendationMap.get(faculty.id)?.evaluation?.score ?? faculty.matchScore ?? 0;
    return Math.max(best, score);
  }, 0);

  const updateProfileDraft = (key: keyof ReturnType<typeof createProfileDraft>, value: string | boolean | undefined) => {
    setProfileDraft((current) => ({ ...current, [key]: value }));
  };

  const handleGenerateAnalysis = async () => {
    setIsAnalysisLoading(true);
    try {
      setAnalysis(await generateProfileAnalysis(client));
    } catch (error) {
      console.error('Generate profile analysis failed:', error);
      setToast('AI 分析生成失败，请稍后重试。');
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleSaveSelectionProfile = () => {
    onUpdateClient({
      ...client,
      ...buildSelectionProfilePatch(draftToProfile(profileDraft)),
    });
    setIsSelectionModalOpen(false);
    setToast('择导档案已更新。');
  };

  const handleAddSelectedMentors = () => {
    if (!onLinkFacultyToClient || pickerSelectedIds.length === 0) return;
    pickerSelectedIds.forEach((facultyId) => {
      const faculty = mentorPickerResults.find((item) => item.id === facultyId);
      onLinkFacultyToClient(facultyId, client.id, {
        sourceModes: ['local'],
        addedFrom: 'student-detail',
        evaluation: faculty ? buildEvaluationForClient(client, faculty) : undefined,
      });
    });
    setPickerSelectedIds([]);
    setMentorPickerOpen(false);
    setToast(`已添加 ${pickerSelectedIds.length} 位导师到该学生。`);
  };

  const saveEvaluations = (targetFaculty: FacultyRecord[]) => {
    if (targetFaculty.length === 0) {
      setToast('请先选择至少一位导师。');
      return;
    }

    const nextRecommendations = new Map<string, MentorRecommendation>(
      (client.mentorRecommendations || []).map((item) => [item.facultyId, item]),
    );

    targetFaculty.forEach((faculty) => {
      const current = nextRecommendations.get(faculty.id);
      nextRecommendations.set(faculty.id, {
        facultyId: faculty.id,
        addedAt: current?.addedAt || new Date().toISOString(),
        addedFrom: current?.addedFrom || 'student-detail',
        sourceModes: getRecommendationSourceModes(current?.sourceModes),
        notes: current?.notes,
        evaluation: buildEvaluationForClient(client, faculty),
      });
    });

    onUpdateClient({
      ...client,
      mentorRecommendations: Array.from(nextRecommendations.values()),
    });

    setToast(`已更新 ${targetFaculty.length} 位导师的匹配评估。`);
  };

  const handleEvaluateMentors = () => {
    saveEvaluations(selectedMentors.length > 0 ? selectedMentors : recommendedFaculty);
  };

  const handleRemoveSelectedMentors = () => {
    if (!onUnlinkFacultyFromClient || selectedMentorIds.length === 0) {
      setToast('请先勾选要移除的导师。');
      return;
    }

    selectedMentorIds.forEach((facultyId) => onUnlinkFacultyFromClient(facultyId, client.id));
    setSelectedMentorIds([]);
    setToast('已移除所选推荐导师。');
  };

  return (
    <div className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#f6f7fb_100%)] px-6 py-6">
      <div className="mx-auto flex max-w-[1560px] flex-col gap-6">
        <header className="rounded-[34px] border border-white/70 bg-white/90 px-6 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <button onClick={onBack} className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 hover:border-slate-300 hover:text-slate-900">
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">学生档案 / 留学咩</div>
                <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{client.name}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">状态：{client.status === 'active' ? '跟进中' : '已归档'}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">创建时间：{formatDate(client.createdAt)}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">顾问：{client.advisor || '未分配'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setIsSelectionModalOpen(true)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                <span className="inline-flex items-center gap-2"><Edit3 size={16} />编辑择导档案</span>
              </button>
              {onDeleteClient ? (
                <button
                  onClick={() => {
                    if (window.confirm(`确认删除学生「${client.name}」吗？`)) {
                      onDeleteClient(client.id);
                    }
                  }}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-100"
                >
                  <span className="inline-flex items-center gap-2"><Trash2 size={16} />删除学生</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="GPA" value={client.gpa || '未填写'} />
            <MiniStat label="文档数" value={documents.length} />
            <MiniStat label="推荐导师" value={recommendedFaculty.length} />
            <MiniStat label="最高匹配分" value={bestRecommendationScore || '待评估'} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(['profile', 'documents', 'mentors'] as DetailTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  activeTab === tab ? 'bg-slate-950 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'profile' ? '学生画像' : tab === 'documents' ? '申请材料' : '推荐导师'}
              </button>
            ))}
          </div>
        </header>

        {activeTab === 'profile' ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_380px]">
            <div className="space-y-6">
              <Panel title="核心信息" icon={<Users size={18} />}>
                <FieldList
                  rows={[
                    { label: '当前院校', value: client.university },
                    { label: '联系方式', value: client.contact },
                    { label: '联系渠道', value: client.contacts?.map((item) => `${item.type}: ${item.value}`).join('\n') },
                    { label: '学术亮点', value: client.academicAchievements },
                    { label: '兴趣方向', value: client.interests },
                    { label: '职业目标', value: client.careerAspirations },
                  ]}
                />
              </Panel>

              <Panel title="择导档案" icon={<Target size={18} />} action={<button onClick={() => setIsSelectionModalOpen(true)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">编辑</button>}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">目标地区 / 院校</div>
                    <div className="text-sm font-semibold text-slate-700 whitespace-pre-wrap">{joinMultiValue(selectionProfile.countries, ' / ') || '未填写'}</div>
                    <div className="text-sm font-semibold text-slate-700 whitespace-pre-wrap">{joinMultiValue(selectionProfile.universities, ' / ') || '未填写'}</div>
                  </div>
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">学院 / 系 / 专业</div>
                    <div className="text-sm font-semibold text-slate-700 whitespace-pre-wrap">{joinMultiValue([...selectionProfile.departments, ...selectionProfile.majors], ' / ') || '未填写'}</div>
                    <div className="text-sm font-semibold text-slate-700">申请层级：{selectionProfile.degreeType === 'phd' ? '申博' : selectionProfile.degreeType === 'master' ? '申硕' : '未指定'}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <FieldList
                    rows={[
                      { label: '专业 A', value: selectionProfile.majorA },
                      { label: '专业 B', value: selectionProfile.majorB },
                      { label: '交叉学科', value: selectionProfile.crossDiscipline ? '是' : '否' },
                      { label: '目标职级', value: selectionProfile.targetPosition },
                      { label: '入学年份', value: selectionProfile.entryYear },
                      { label: '奖学金要求', value: selectionProfile.scholarshipRequirement },
                      { label: '排除项', value: selectionProfile.exclusions },
                      { label: '指定院校链接', value: joinMultiValue(selectionProfile.officialLinks, '\n') },
                    ]}
                  />
                </div>
              </Panel>

              <div className="grid gap-6 xl:grid-cols-2">
                <Panel title="教育经历" icon={<GraduationCap size={18} />}>
                  {client.educations && client.educations.length > 0 ? (
                    <div className="space-y-3">
                      {client.educations.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                          <div className="text-sm font-black text-slate-900">{item.school || '未填写学校'}</div>
                          <div className="mt-1 text-sm font-semibold text-slate-700">{[item.degree, item.major].filter(Boolean).join(' / ') || '未填写学位与专业'}</div>
                          <div className="mt-2 text-xs font-semibold text-slate-500">GPA {item.gpa || '-'} · {formatDate(item.startDate)} - {formatDate(item.endDate)}</div>
                          {[item.extraInfo, item.notes].filter(Boolean).length > 0 ? (
                            <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{[item.extraInfo, item.notes].filter(Boolean).join('\n')}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyBlock title="暂无教育经历" description="这里会展示院校、专业、GPA 和时间线，避免信息散落在多个空白卡片里。" />
                  )}
                </Panel>

                <Panel title="科研 / 工作 / 荣誉" icon={<Briefcase size={18} />}>
                  <div className="space-y-4">
                    {client.researchPapers && client.researchPapers.length > 0 ? (
                      <div>
                        <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">科研经历</div>
                        <div className="space-y-2">
                          {client.researchPapers.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                              <div className="text-sm font-black text-slate-900">{item.title || '未命名项目'}</div>
                              <div className="mt-1 text-sm text-slate-600">{[item.journal, item.date].filter(Boolean).join(' · ') || '未填写发表信息'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {client.works && client.works.length > 0 ? (
                      <div>
                        <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">工作经历</div>
                        <div className="space-y-2">
                          {client.works.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                              <div className="text-sm font-black text-slate-900">{item.position || '未命名岗位'}</div>
                              <div className="mt-1 text-sm text-slate-600">{[item.company, `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`].filter(Boolean).join(' · ')}</div>
                              {item.description ? <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.description}</div> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {client.awards && client.awards.length > 0 ? (
                      <div>
                        <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">荣誉奖项</div>
                        <div className="space-y-2">
                          {client.awards.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                              <div className="text-sm font-black text-slate-900">{item.name || '未命名奖项'}</div>
                              <div className="mt-1 text-sm text-slate-600">{[item.level, item.date].filter(Boolean).join(' · ') || '未填写奖项级别'}</div>
                              {item.description ? <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.description}</div> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {(!client.researchPapers || client.researchPapers.length === 0) &&
                    (!client.works || client.works.length === 0) &&
                    (!client.awards || client.awards.length === 0) ? (
                      <EmptyBlock title="暂无补充经历" description="科研、工作和奖项会集中显示在这里，信息会更紧凑。" />
                    ) : null}
                  </div>
                </Panel>
              </div>
            </div>

            <div className="space-y-6">
              <Panel title="联系与材料状态" icon={<Mail size={18} />}>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                    <div className="flex items-center gap-2"><Phone size={14} />{client.contact || '未填写主联系方式'}</div>
                  </div>
                  <FieldList
                    rows={[
                      { label: 'RP', value: boolLabel(selectionProfile.hasRP) },
                      { label: 'CV', value: boolLabel(selectionProfile.hasCV) },
                      { label: '论文 / 发表', value: boolLabel(selectionProfile.hasPublications) },
                      { label: 'RP 主题', value: selectionProfile.rpTopic },
                    ]}
                  />
                </div>
              </Panel>

              <Panel title="AI 背景分析" icon={<Sparkles size={18} />} action={<button onClick={handleGenerateAnalysis} disabled={isAnalysisLoading} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60">{isAnalysisLoading ? '生成中...' : '重新生成'}</button>}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                  {analysis || '点击“重新生成”可基于当前学生信息生成背景提升建议。'}
                </div>
              </Panel>

              <Panel title="关键时间线" icon={<CalendarClock size={18} />}>
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEvents.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                        <div className="text-sm font-black text-slate-900">{item.title}</div>
                        <div className="mt-1 text-sm text-slate-600">{item.date}{item.time ? ` ${item.time}` : ''}</div>
                        {item.description ? <div className="mt-2 text-sm text-slate-600">{item.description}</div> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyBlock title="暂无关键日程" description="DDL、面试和提醒会在这里集中展示。" />
                )}
              </Panel>
            </div>
          </div>
        ) : null}

        {activeTab === 'documents' ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <Panel title="申请材料" icon={<FileText size={18} />}>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4">
                      <div>
                        <div className="text-sm font-black text-slate-900">{doc.title}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{doc.type} · 更新于 {formatDate(doc.updatedAt)}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => onEditDocument(doc)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">编辑</button>
                        <button onClick={() => onStartWriting(documentTypeToAction[doc.type] || '自由写作')} className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800">继续写作</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyBlock title="暂无申请材料" description="这里会集中展示学生当前的 PS、CV、推荐信和命题作文。" />
              )}
            </Panel>

            <Panel title="快捷开始" icon={<BookOpen size={18} />}>
              <div className="space-y-2">
                {['文书Agent', '写PS', '写命题文书', '写推荐信', '写CV', '自由写作'].map((item) => (
                  <button key={item} onClick={() => onStartWriting(item)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-left hover:bg-slate-100">
                    <span className="font-bold text-slate-800">{item}</span>
                    <Plus size={16} className="text-slate-500" />
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        ) : null}

        {activeTab === 'mentors' ? (
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <Panel title="导师筛选侧板" icon={<Search size={18} />} className="h-fit">
              <div className="space-y-3">
                {[
                  ['国家 / 地区', 'country'],
                  ['学校', 'university'],
                  ['学院 / School', 'school'],
                  ['系 / Department', 'department'],
                  ['专业 / 关键词', 'major'],
                  ['导师搜索词', 'keyword'],
                  ['项目关键词', 'projectKeyword'],
                ].map(([label, key]) => (
                  <label key={key} className="block space-y-2">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
                    <input
                      value={pickerFilters[key as keyof PickerFilters] as string}
                      onChange={(event) => setPickerFilters((current) => ({ ...current, [key]: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    />
                  </label>
                ))}

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={pickerFilters.hasScholarship} onChange={(event) => setPickerFilters((current) => ({ ...current, hasScholarship: event.target.checked }))} />
                  仅显示有奖学金信息的导师
                </label>

                <select value={pickerFilters.degreeType} onChange={(event) => setPickerFilters((current) => ({ ...current, degreeType: event.target.value as PickerFilters['degreeType'] }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
                  <option value="unspecified">未指定</option>
                  <option value="phd">申博</option>
                  <option value="master">申硕</option>
                </select>

                <div className="flex gap-2">
                  <button onClick={() => { setPickerFilters(EMPTY_PICKER_FILTERS); setPickerSelectedIds([]); }} className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">重置</button>
                  <button onClick={() => setMentorPickerOpen((current) => !current)} className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">{mentorPickerOpen ? '收起结果' : '打开筛选结果'}</button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
                  匹配到 <strong className="text-slate-900">{mentorPickerResults.length}</strong> 位本地导师，可直接多选添加。
                </div>
              </div>
            </Panel>

            <Panel title="推荐导师" icon={<UserRoundPlus size={18} />} action={<div className="flex flex-wrap gap-2">
              <button onClick={() => setMentorPickerOpen((current) => !current)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">从导师库添加</button>
              <button onClick={() => onOpenAdvancedFacultyFilters?.(client)} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">高级筛选</button>
              <button onClick={handleEvaluateMentors} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">一键评估</button>
              <button onClick={handleRemoveSelectedMentors} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100">批量移除</button>
            </div>}>
              {mentorPickerOpen ? (
                <div className="mb-5 rounded-[28px] border border-blue-100 bg-blue-50/60 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-900">本地导师快速添加</div>
                      <div className="text-xs font-semibold text-slate-500">支持按国家、学校、学院、专业和项目关键词筛选后直接挂到当前学生。</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setPickerSelectedIds(mentorPickerResults.map((faculty) => faculty.id))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">全选结果</button>
                      <button onClick={handleAddSelectedMentors} disabled={pickerSelectedIds.length === 0} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50">添加 {pickerSelectedIds.length} 位导师</button>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {mentorPickerResults.slice(0, 10).map((faculty) => (
                      <label key={faculty.id} className={`flex items-start gap-3 rounded-2xl border px-4 py-4 ${pickerSelectedIds.includes(faculty.id) ? 'border-blue-300 bg-white' : 'border-slate-200 bg-white/80'}`}>
                        <input type="checkbox" checked={pickerSelectedIds.includes(faculty.id)} onChange={() => setPickerSelectedIds((current) => current.includes(faculty.id) ? current.filter((item) => item !== faculty.id) : [...current, faculty.id])} className="mt-1" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-900">{faculty.name}</div>
                          <div className="mt-1 text-sm font-semibold text-slate-600">{faculty.university}</div>
                          <div className="mt-2 text-xs leading-5 text-slate-500">{[faculty.country, faculty.school, faculty.department].filter(Boolean).join(' · ') || '未补充层级信息'}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {recommendedFaculty.length > 0 ? (
                <div className="space-y-5">
                  {recommendedFaculty.map((faculty) => {
                    const recommendation = recommendationMap.get(faculty.id);
                    const summary = summarizeRecommendation(recommendation, faculty.matchScore || 0);
                    return (
                      <div key={faculty.id} className="space-y-3">
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                          <input type="checkbox" checked={selectedMentorIds.includes(faculty.id)} onChange={() => setSelectedMentorIds((current) => current.includes(faculty.id) ? current.filter((item) => item !== faculty.id) : [...current, faculty.id])} />
                          选择该导师
                        </label>
                        <FacultyCard prof={{ ...faculty, evaluation: recommendation?.evaluation || faculty.evaluation }} isDatabaseView={true} onUnlink={() => onUnlinkFacultyFromClient?.(faculty.id, client.id)} />
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                          <div className="text-lg font-black text-slate-900">{summary.score} 分 · {summary.bandLabel}</div>
                          <div className="mt-2 text-sm font-semibold leading-6 text-slate-700">{summary.summary}</div>
                          {summary.reasons.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{summary.reasons.slice(0, 4).map((item) => <span key={item} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{item}</span>)}</div> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyBlock title="暂无推荐导师" description="可以先用左侧筛板快速添加，也可以点击“高级筛选”跳到导师库精筛后回填。" />
              )}
            </Panel>
          </div>
        ) : null}
      </div>

      {isSelectionModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/60 bg-white shadow-[0_32px_120px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <div className="text-lg font-black text-slate-950">编辑择导档案</div>
                <div className="text-sm text-slate-500">学生档案和智能导师检索会共用这套结构化字段。</div>
              </div>
              <button onClick={() => setIsSelectionModalOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[78vh] overflow-y-auto px-6 py-6">
              <div className="grid gap-4 xl:grid-cols-2">
                {[
                  ['目标国家 / 地区', 'countries'],
                  ['目标学校', 'universities'],
                  ['学院 / 系', 'departments'],
                  ['专业', 'majors'],
                  ['专业 A', 'majorA'],
                  ['专业 B', 'majorB'],
                  ['目标职级', 'targetPosition'],
                  ['入学年份', 'entryYear'],
                  ['目标数量', 'selectionCount'],
                  ['筛选类型', 'selectionType'],
                  ['筛选截止时间', 'selectionDeadline'],
                  ['奖学金要求', 'scholarshipRequirement'],
                  ['排名偏好', 'rankingPreference'],
                  ['排除项', 'exclusions'],
                  ['特殊要求', 'specialRequirements'],
                  ['业务备注', 'businessCoordinator'],
                  ['指定院校链接', 'officialLinks'],
                  ['避免重复导师', 'avoidPreviousMentors'],
                  ['RP 主题', 'rpTopic'],
                ].map(([label, key]) => (
                  <label key={key} className={`block space-y-2 ${['countries', 'universities', 'departments', 'majors', 'rankingPreference', 'exclusions', 'specialRequirements', 'businessCoordinator', 'officialLinks', 'avoidPreviousMentors'].includes(key) ? 'xl:col-span-2' : ''}`}>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
                    {['countries', 'universities', 'departments', 'majors', 'rankingPreference', 'exclusions', 'specialRequirements', 'businessCoordinator', 'officialLinks', 'avoidPreviousMentors'].includes(key) ? (
                      <textarea value={profileDraft[key as keyof typeof profileDraft] as string} onChange={(event) => updateProfileDraft(key as keyof typeof profileDraft, event.target.value)} rows={3} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50" />
                    ) : (
                      <input value={profileDraft[key as keyof typeof profileDraft] as string} onChange={(event) => updateProfileDraft(key as keyof typeof profileDraft, event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50" />
                    )}
                  </label>
                ))}

                <div className="grid gap-3 sm:grid-cols-2 xl:col-span-2">
                  <select value={profileDraft.degreeType} onChange={(event) => updateProfileDraft('degreeType', event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
                    <option value="unspecified">未指定</option>
                    <option value="phd">申博</option>
                    <option value="master">申硕</option>
                  </select>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={profileDraft.crossDiscipline} onChange={(event) => updateProfileDraft('crossDiscipline', event.target.checked)} />
                    勾选后按交叉学科处理专业 A 与专业 B
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:col-span-2">
                  {[
                    ['hasRP', '已准备 RP'],
                    ['hasCV', '已准备 CV'],
                    ['hasPublications', '已准备论文 / 发表'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                      <input type="checkbox" checked={Boolean(profileDraft[key as keyof typeof profileDraft])} onChange={(event) => updateProfileDraft(key as keyof typeof profileDraft, event.target.checked)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setIsSelectionModalOpen(false)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">取消</button>
              <button onClick={handleSaveSelectionProfile} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">保存更新</button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[95] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-2xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
};

export default ClientDetail;
