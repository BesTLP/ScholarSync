import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileSpreadsheet,
  Globe,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  Client,
  FacultyImportSummary,
  FacultyMember,
  MentorEvaluationSnapshot,
  FacultyProject,
  FacultyRecord,
  MatcherSearchFilters,
  RecommendationOrigin,
  SourceMode,
} from '../types';
import FacultyCard from './FacultyCard';
import FacultyManualEntryModal from './FacultyManualEntryModal';
import FacultySearchModal from './FacultySearchModal';
import { importFacultyFromXlsx } from '../services/facultyImportService';
import { buildEvaluationForClient } from '../services/facultyMatching';
import { describeWebSearchError, refreshFacultyData } from '../services/geminiService';

interface FacultyDatabaseProps {
  facultyDatabase: FacultyRecord[];
  clients: Client[];
  onAddFaculty: (faculty: FacultyMember, country: string, fieldCategory: string, extra?: Partial<FacultyRecord>) => string;
  onImportFacultyRecords: (records: FacultyRecord[]) => {
    createdFacultyCount: number;
    mergedFacultyCount: number;
    appendedProjectCount: number;
  };
  onUpdateFaculty: (id: string, updates: Partial<FacultyRecord>) => void;
  onDeleteFaculty: (id: string) => void;
  onLinkFaculty: (
    facultyId: string,
    clientId: string,
    options?: { sourceModes?: SourceMode[]; addedFrom?: RecommendationOrigin; evaluation?: MentorEvaluationSnapshot },
  ) => void;
  onUnlinkFaculty: (facultyId: string, clientId: string) => void;
  contextClient?: Client | null;
  contextFilters?: MatcherSearchFilters;
  onReturnToClient?: () => void;
}

const ALL = 'all';

function uniqueSorted(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => (value || '').trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  );
}

function matchesSearch(record: FacultyRecord, query: string): boolean {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;

  const haystack = [
    record.name,
    record.university,
    record.school,
    record.department,
    record.country,
    record.provinceState,
    record.city,
    record.fieldCategory,
    record.subFieldCategory,
    ...(record.researchAreas || []),
    ...record.projects.flatMap((project) => [project.programName, project.recommendationReason]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(keyword);
}

function csvEscape(value: string | undefined): string {
  return `"${(value || '').replace(/"/g, '""')}"`;
}

function normalizeExportValue(value?: string | null): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function joinNonEmpty(parts: Array<string | undefined | null>, separator = '\n'): string {
  return parts.map((part) => normalizeExportValue(part)).filter(Boolean).join(separator);
}

function normalizeIdentityValue(value?: string | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function isSameFacultyIdentity(current: FacultyRecord, incoming: Partial<FacultyMember>): boolean {
  const incomingName = normalizeIdentityValue(incoming.name);
  const incomingUniversity = normalizeIdentityValue(incoming.university);

  if (!incomingName || !incomingUniversity) {
    return false;
  }

  return incomingName === normalizeIdentityValue(current.name)
    && incomingUniversity === normalizeIdentityValue(current.university);
}

type ExportFieldOption = {
  key: string;
  label: string;
  group: 'sheet' | 'faculty' | 'location' | 'source';
  defaultChecked?: boolean;
  getValue: (record: FacultyRecord, project: FacultyProject | null) => string;
};

const EXPORT_FIELD_OPTIONS: ExportFieldOption[] = [
  {
    key: 'school_name',
    label: '学校名称（中英文）',
    group: 'sheet',
    getValue: (record) => joinNonEmpty([record.university, record.universityEnglish]),
  },
  {
    key: 'qs_ranking',
    label: '2026QS综合排名',
    group: 'sheet',
    getValue: (record) => normalizeExportValue(record.qsRankingData?.value || record.qsRanking),
  },
  {
    key: 'deadline',
    label: '截止日期',
    group: 'sheet',
    getValue: (record, project) => normalizeExportValue(project?.deadlineRaw || record.deadlineData?.value),
  },
  {
    key: 'program_name',
    label: '专业名称（中英文）',
    group: 'sheet',
    getValue: (_record, project) =>
      joinNonEmpty([project?.programName, project?.programNameEn, project?.programNameZh]),
  },
  {
    key: 'program_url',
    label: '专业链接',
    group: 'sheet',
    getValue: (_record, project) => normalizeExportValue(project?.programUrl),
  },
  {
    key: 'application_requirements',
    label: '申请要求及材料',
    group: 'sheet',
    getValue: (record, project) => normalizeExportValue(project?.applicationRequirementsRaw || record.applicationReqsData?.value),
  },
  {
    key: 'rp_requirements',
    label: 'RP字数要求',
    group: 'sheet',
    getValue: (record, project) => normalizeExportValue(project?.rpRequirementsRaw || record.rpReqsData?.value),
  },
  {
    key: 'mentor_research',
    label: '导师研究方向（论文）',
    group: 'sheet',
    getValue: (record) =>
      joinNonEmpty([
        joinNonEmpty(record.researchAreas || [], '；'),
        (record.recentActivities || []).slice(0, 5).join('\n'),
      ]),
  },
  {
    key: 'recommendation_reason',
    label: '推荐理由',
    group: 'sheet',
    getValue: (record, project) => normalizeExportValue(project?.recommendationReason || record.alignmentDetails),
  },
  {
    key: 'mentor_email',
    label: '导师邮箱',
    group: 'sheet',
    getValue: (record) => normalizeExportValue(record.email),
  },
  {
    key: 'mentor_profile',
    label: '导师官网链接',
    group: 'sheet',
    getValue: (record) => normalizeExportValue(record.profileUrl),
  },
  {
    key: 'tuition',
    label: '学费',
    group: 'sheet',
    getValue: (record, project) => normalizeExportValue(project?.tuitionRaw || record.tuitionData?.value),
  },
  {
    key: 'scholarship',
    label: '奖学金项目',
    group: 'sheet',
    getValue: (record, project) => normalizeExportValue(project?.scholarshipRaw || record.scholarshipData?.value),
  },
  {
    key: 'mentor_name',
    label: '导师姓名',
    group: 'faculty',
    defaultChecked: false,
    getValue: (record) => normalizeExportValue(record.name),
  },
  {
    key: 'mentor_title',
    label: '导师职称',
    group: 'faculty',
    defaultChecked: false,
    getValue: (record) => normalizeExportValue(record.title),
  },
  {
    key: 'school',
    label: '学院/School',
    group: 'faculty',
    defaultChecked: false,
    getValue: (record) => normalizeExportValue(record.school),
  },
  {
    key: 'department',
    label: '系/Department',
    group: 'faculty',
    defaultChecked: false,
    getValue: (record) => normalizeExportValue(record.department),
  },
  {
    key: 'field_category',
    label: '一级学科',
    group: 'faculty',
    defaultChecked: false,
    getValue: (record) => normalizeExportValue(record.fieldCategory),
  },
  {
    key: 'sub_field_category',
    label: '二级学科',
    group: 'faculty',
    defaultChecked: false,
    getValue: (record) => normalizeExportValue(record.subFieldCategory),
  },
  {
    key: 'country',
    label: '国家',
    group: 'location',
    defaultChecked: false,
    getValue: (record) => normalizeExportValue(record.country),
  },
  {
    key: 'province_state',
    label: '州/省',
    group: 'location',
    defaultChecked: false,
    getValue: (record) => normalizeExportValue(record.provinceState),
  },
  {
    key: 'city',
    label: '城市',
    group: 'location',
    defaultChecked: false,
    getValue: (record) => normalizeExportValue(record.city),
  },
  {
    key: 'source_workbook',
    label: '来源工作簿',
    group: 'source',
    defaultChecked: false,
    getValue: (record, project) => normalizeExportValue(project?.sourceWorkbook || record.raw?.sourceWorkbook),
  },
  {
    key: 'source_sheet',
    label: '来源工作表',
    group: 'source',
    defaultChecked: false,
    getValue: (_record, project) => normalizeExportValue(project?.sourceSheet),
  },
  {
    key: 'source_row',
    label: '来源行号',
    group: 'source',
    defaultChecked: false,
    getValue: (_record, project) => normalizeExportValue(project?.sourceRowIndex ? String(project.sourceRowIndex) : ''),
  },
];

const EXPORT_FIELD_GROUPS: Array<{ key: ExportFieldOption['group']; label: string }> = [
  { key: 'sheet', label: '总表字段' },
  { key: 'faculty', label: '导师字段' },
  { key: 'location', label: '地区字段' },
  { key: 'source', label: '来源字段' },
];

const DEFAULT_EXPORT_FIELD_KEYS = EXPORT_FIELD_OPTIONS.filter((option) => option.defaultChecked !== false).map((option) => option.key);

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-12 text-center text-slate-500">
      <div className="mb-2 text-lg font-bold text-slate-800">{title}</div>
      <div className="text-sm">{description}</div>
    </div>
  );
}

const FacultyDatabase: React.FC<FacultyDatabaseProps> = ({
  facultyDatabase,
  clients,
  onAddFaculty,
  onImportFacultyRecords,
  onUpdateFaculty,
  onDeleteFaculty,
  onLinkFaculty,
  onUnlinkFaculty,
  contextClient = null,
  contextFilters,
  onReturnToClient,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(ALL);
  const [selectedProvinceState, setSelectedProvinceState] = useState(ALL);
  const [selectedCity, setSelectedCity] = useState(ALL);
  const [selectedUniversity, setSelectedUniversity] = useState(ALL);
  const [selectedSchool, setSelectedSchool] = useState(ALL);
  const [selectedDepartment, setSelectedDepartment] = useState(ALL);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isManualEntryModalOpen, setIsManualEntryModalOpen] = useState(false);
  const [linkingFacultyId, setLinkingFacultyId] = useState<string | null>(null);
  const [editingFaculty, setEditingFaculty] = useState<FacultyRecord | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<FacultyImportSummary | null>(null);
  const [isFilterSidebarCollapsed, setIsFilterSidebarCollapsed] = useState(false);
  const [isExportConfigOpen, setIsExportConfigOpen] = useState(false);
  const [selectedExportFields, setSelectedExportFields] = useState<string[]>(DEFAULT_EXPORT_FIELD_KEYS);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appliedContextKeyRef = useRef('');

  useEffect(() => {
    if (!contextFilters) return;

    const contextKey = JSON.stringify({
      clientId: contextClient?.id || '',
      filters: contextFilters,
    });

    if (appliedContextKeyRef.current === contextKey) {
      return;
    }

    const primaryTarget = contextFilters.targets.find((target) =>
      [target.country, target.university, target.school, target.department, target.major].some(Boolean),
    );

    setSelectedCountry(primaryTarget?.country || ALL);
    setSelectedProvinceState(ALL);
    setSelectedCity(ALL);
    setSelectedUniversity(primaryTarget?.university || ALL);
    setSelectedSchool(primaryTarget?.school || ALL);
    setSelectedDepartment(primaryTarget?.department || ALL);
    setSearchQuery(
      [
        primaryTarget?.major,
        contextFilters.majorA,
        contextFilters.majorB,
        contextFilters.targetPosition,
      ]
        .filter(Boolean)
        .join(' '),
    );
    setSelectedIds(new Set());
    appliedContextKeyRef.current = contextKey;
  }, [contextClient?.id, contextFilters]);

  const updateEditingFaculty = (updater: (current: FacultyRecord) => FacultyRecord) => {
    setEditingFaculty((current) => (current ? updater(current) : current));
  };

  const updateEditingProject = (projectId: string, updates: Partial<FacultyProject>) => {
    updateEditingFaculty((current) => ({
      ...current,
      projects: current.projects.map((project) => (project.id === projectId ? { ...project, ...updates } : project)),
    }));
  };

  const updateEditingProjectUrls = (
    projectId: string,
    field:
      | 'deadlineSourceUrls'
      | 'applicationRequirementsSourceUrls'
      | 'rpRequirementsSourceUrls'
      | 'tuitionSourceUrls'
      | 'scholarshipSourceUrls',
    value: string,
  ) => {
    updateEditingProject(projectId, {
      [field]: value
        .split(/[\n,;，；]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    } as Partial<FacultyProject>);
  };

  const addEditingProject = () => {
    updateEditingFaculty((current) => ({
      ...current,
      projects: [
        ...current.projects,
        {
          id: crypto.randomUUID(),
          programName: '',
          deadlineSourceUrls: [],
          applicationRequirementsSourceUrls: [],
          rpRequirementsSourceUrls: [],
          tuitionSourceUrls: [],
          scholarshipSourceUrls: [],
        },
      ],
    }));
  };

  const removeEditingProject = (projectId: string) => {
    updateEditingFaculty((current) => ({
      ...current,
      projects: current.projects.filter((project) => project.id !== projectId),
    }));
  };

  const countries = useMemo(() => uniqueSorted(facultyDatabase.map((faculty) => faculty.country)), [facultyDatabase]);

  const provinceStates = useMemo(() => {
    const relevant =
      selectedCountry === ALL
        ? facultyDatabase
        : facultyDatabase.filter((faculty) => faculty.country === selectedCountry);
    return uniqueSorted(relevant.map((faculty) => faculty.provinceState));
  }, [facultyDatabase, selectedCountry]);

  const cities = useMemo(() => {
    const relevant = facultyDatabase.filter(
      (faculty) =>
        (selectedCountry === ALL || faculty.country === selectedCountry) &&
        (selectedProvinceState === ALL || faculty.provinceState === selectedProvinceState),
    );
    return uniqueSorted(relevant.map((faculty) => faculty.city));
  }, [facultyDatabase, selectedCountry, selectedProvinceState]);

  const universities = useMemo(() => {
    const relevant = facultyDatabase.filter(
      (faculty) =>
        (selectedCountry === ALL || faculty.country === selectedCountry) &&
        (selectedProvinceState === ALL || faculty.provinceState === selectedProvinceState) &&
        (selectedCity === ALL || faculty.city === selectedCity),
    );
    return uniqueSorted(relevant.map((faculty) => faculty.university));
  }, [facultyDatabase, selectedCountry, selectedProvinceState, selectedCity]);

  const schools = useMemo(() => {
    const relevant = facultyDatabase.filter(
      (faculty) =>
        (selectedCountry === ALL || faculty.country === selectedCountry) &&
        (selectedProvinceState === ALL || faculty.provinceState === selectedProvinceState) &&
        (selectedCity === ALL || faculty.city === selectedCity) &&
        (selectedUniversity === ALL || faculty.university === selectedUniversity),
    );
    return uniqueSorted(relevant.map((faculty) => faculty.school));
  }, [facultyDatabase, selectedCountry, selectedProvinceState, selectedCity, selectedUniversity]);

  const departments = useMemo(() => {
    const relevant = facultyDatabase.filter(
      (faculty) =>
        (selectedCountry === ALL || faculty.country === selectedCountry) &&
        (selectedProvinceState === ALL || faculty.provinceState === selectedProvinceState) &&
        (selectedCity === ALL || faculty.city === selectedCity) &&
        (selectedUniversity === ALL || faculty.university === selectedUniversity) &&
        (selectedSchool === ALL || faculty.school === selectedSchool),
    );
    return uniqueSorted(relevant.map((faculty) => faculty.department));
  }, [facultyDatabase, selectedCountry, selectedProvinceState, selectedCity, selectedUniversity, selectedSchool]);

  const activeFilters = useMemo(
    () =>
      [
        selectedCountry !== ALL ? { label: '国家', value: selectedCountry } : null,
        selectedProvinceState !== ALL ? { label: '州/省', value: selectedProvinceState } : null,
        selectedCity !== ALL ? { label: '城市', value: selectedCity } : null,
        selectedUniversity !== ALL ? { label: '大学', value: selectedUniversity } : null,
        selectedSchool !== ALL ? { label: '学院', value: selectedSchool } : null,
        selectedDepartment !== ALL ? { label: '系', value: selectedDepartment } : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>,
    [selectedCountry, selectedProvinceState, selectedCity, selectedUniversity, selectedSchool, selectedDepartment],
  );

  const filteredFaculty = useMemo(() => {
    return facultyDatabase.filter(
      (faculty) =>
        matchesSearch(faculty, searchQuery) &&
        (selectedCountry === ALL || faculty.country === selectedCountry) &&
        (selectedProvinceState === ALL || faculty.provinceState === selectedProvinceState) &&
        (selectedCity === ALL || faculty.city === selectedCity) &&
        (selectedUniversity === ALL || faculty.university === selectedUniversity) &&
        (selectedSchool === ALL || faculty.school === selectedSchool) &&
        (selectedDepartment === ALL || faculty.department === selectedDepartment),
    );
  }, [
    facultyDatabase,
    searchQuery,
    selectedCountry,
    selectedProvinceState,
    selectedCity,
    selectedUniversity,
    selectedSchool,
    selectedDepartment,
  ]);

  const selectedRecords = useMemo(
    () => facultyDatabase.filter((faculty) => selectedIds.has(faculty.id)),
    [facultyDatabase, selectedIds],
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    const visibleIds = filteredFaculty.map((faculty) => faculty.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const resetLocationFilters = () => {
    setSelectedCountry(ALL);
    setSelectedProvinceState(ALL);
    setSelectedCity(ALL);
    setSelectedUniversity(ALL);
    setSelectedSchool(ALL);
    setSelectedDepartment(ALL);
  };

  const handleImportFaculty = (imported: FacultyMember[]) => {
    imported.forEach((faculty) => onAddFaculty(faculty, '', ''));
  };

  const handleRefreshFaculty = async (record: FacultyRecord) => {
    setRefreshingId(record.id);
    try {
      const updated = await refreshFacultyData(record);
      if (!isSameFacultyIdentity(record, updated)) {
        window.alert('联网返回的导师身份与当前卡片不一致，这次刷新已自动取消，避免串到别的导师。');
        return;
      }

      onUpdateFaculty(record.id, {
        title: updated.title,
        email: updated.email,
        profileUrl: updated.profileUrl,
        photoUrl: updated.photoUrl,
        recentActivities: updated.recentActivities,
        researchAreas: updated.researchAreas,
        activitySummary: updated.activitySummary,
        isActive: updated.isActive,
        matchReasoning: {
          ...record.matchReasoning,
          ...updated.matchReasoning,
          universityCheck: record.matchReasoning?.universityCheck || record.university,
        },
      });
    } catch (error) {
      console.error('Refresh failed:', error);
      window.alert(describeWebSearchError(error));
    } finally {
      setRefreshingId(null);
    }
  };

  const handleOpenExportConfig = () => {
    setIsExportConfigOpen((prev) => !prev);
  };

  const handleExportCSV = () => {
    const target = selectedIds.size > 0 ? selectedRecords : filteredFaculty;
    if (target.length === 0) return;
    if (selectedExportFields.length === 0) {
      window.alert('请至少选择一个导出字段。');
      return;
    }

    const selectedOptions = EXPORT_FIELD_OPTIONS.filter((option) => selectedExportFields.includes(option.key));
    const headers = selectedOptions.map((option) => option.label);

    const rows = [headers.join(',')];
    target
      .flatMap((faculty) =>
        faculty.projects.length > 0
          ? faculty.projects.map((project) => ({ faculty, project }))
          : [{ faculty, project: null as FacultyProject | null }],
      )
      .forEach(({ faculty, project }) => {
      rows.push(
        selectedOptions.map((option) => csvEscape(option.getValue(faculty, project))).join(','),
      );
    });

    const blob = new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `faculty-database-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportConfigOpen(false);
  };

  const toggleExportField = (key: string) => {
    setSelectedExportFields((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const selectAllExportFields = () => {
    setSelectedExportFields(EXPORT_FIELD_OPTIONS.map((option) => option.key));
  };

  const resetExportFields = () => {
    setSelectedExportFields(DEFAULT_EXPORT_FIELD_KEYS);
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`确认删除选中的 ${selectedIds.size} 位导师吗？`)) return;
    selectedIds.forEach((id) => onDeleteFaculty(id));
    setSelectedIds(new Set());
  };

  const handleAddSelectedToContextClient = () => {
    if (!contextClient || selectedIds.size === 0) return;
    selectedRecords.forEach((record) => {
      onLinkFaculty(record.id, contextClient.id, {
        sourceModes: ['local'],
        addedFrom: 'faculty-db',
        evaluation: buildEvaluationForClient(contextClient, record, contextFilters),
      });
    });
    setSelectedIds(new Set());
    onReturnToClient?.();
  };

  const handleXlsxClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await importFacultyFromXlsx(file);
      const mergeSummary = onImportFacultyRecords(result.records);
      setImportSummary({
        ...result.summary,
        createdFacultyCount: mergeSummary.createdFacultyCount,
        mergedFacultyCount: mergeSummary.mergedFacultyCount,
        appendedProjectCount: mergeSummary.appendedProjectCount,
      });
    } catch (error) {
      console.error('XLSX import failed:', error);
      window.alert(error instanceof Error ? error.message : 'XLSX 导入失败。');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 gap-4 bg-transparent p-4">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />

      <div className={`relative shrink-0 ${isFilterSidebarCollapsed ? 'w-[78px]' : 'w-[292px]'} z-20`}>
        <div className="mac-panel h-full overflow-visible rounded-[28px] p-5 transition-all duration-300 ease-out">
          <div className="mb-6">
          <div className={`flex items-center ${isFilterSidebarCollapsed ? 'justify-center' : 'justify-between'} gap-2 text-lg font-black text-slate-900`}>
            <div className="flex items-center gap-2">
              <Database size={20} className="text-blue-600" />
              {!isFilterSidebarCollapsed && '导师库'}
            </div>
            <button
              type="button"
              onClick={() => setIsFilterSidebarCollapsed((prev) => !prev)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
              title={isFilterSidebarCollapsed ? '展开筛选栏' : '收起筛选栏'}
            >
              {isFilterSidebarCollapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronLeft size={18} strokeWidth={2.5} />}
            </button>
          </div>
          {!isFilterSidebarCollapsed && (
            <>
              <div className="mt-2 text-sm text-slate-500">
                当前共 {facultyDatabase.length} 位导师，{facultyDatabase.reduce((sum, faculty) => sum + faculty.projects.length, 0)} 个项目。
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="mac-pill">规范筛选</span>
                <span className="mac-pill">级联下拉</span>
                <span className="mac-pill">本地持久化</span>
              </div>
            </>
          )}
        </div>

          {isFilterSidebarCollapsed ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-center">
                <button
                  onClick={() => setIsFilterSidebarCollapsed(false)}
                  className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-600 hover:bg-slate-50"
                  title="展开筛选"
                >
                  <Search size={18} />
                </button>
              </div>
              <button
                onClick={resetLocationFilters}
                className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-600 hover:bg-slate-100"
                title="重置筛选"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
          <div className="space-y-4 text-sm">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">国家</div>
            <select
              value={selectedCountry}
              onChange={(event) => {
                setSelectedCountry(event.target.value);
                setSelectedProvinceState(ALL);
                setSelectedCity(ALL);
                setSelectedUniversity(ALL);
                setSelectedSchool(ALL);
                setSelectedDepartment(ALL);
              }}
              className="mac-input w-full rounded-xl px-3 py-2"
            >
              <option value={ALL}>全部国家</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">州 / 省</div>
            <select
              value={selectedProvinceState}
              onChange={(event) => {
                setSelectedProvinceState(event.target.value);
                setSelectedCity(ALL);
                setSelectedUniversity(ALL);
                setSelectedSchool(ALL);
                setSelectedDepartment(ALL);
              }}
              className="mac-input w-full rounded-xl px-3 py-2"
            >
              <option value={ALL}>全部州省</option>
              {provinceStates.map((provinceState) => (
                <option key={provinceState} value={provinceState}>
                  {provinceState}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">城市</div>
            <select
              value={selectedCity}
              onChange={(event) => {
                setSelectedCity(event.target.value);
                setSelectedUniversity(ALL);
                setSelectedSchool(ALL);
                setSelectedDepartment(ALL);
              }}
              className="mac-input w-full rounded-xl px-3 py-2"
            >
              <option value={ALL}>全部城市</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">大学</div>
            <select
              value={selectedUniversity}
              onChange={(event) => {
                setSelectedUniversity(event.target.value);
                setSelectedSchool(ALL);
                setSelectedDepartment(ALL);
              }}
              className="mac-input w-full rounded-xl px-3 py-2"
            >
              <option value={ALL}>全部大学</option>
              {universities.map((university) => (
                <option key={university} value={university}>
                  {university}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">学院 / School</div>
            <select
              value={selectedSchool}
              onChange={(event) => {
                setSelectedSchool(event.target.value);
                setSelectedDepartment(ALL);
              }}
              className="mac-input w-full rounded-xl px-3 py-2"
            >
              <option value={ALL}>全部学院</option>
              {schools.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">系 / Department</div>
            <select
              value={selectedDepartment}
              onChange={(event) => setSelectedDepartment(event.target.value)}
              className="mac-input w-full rounded-xl px-3 py-2"
            >
              <option value={ALL}>全部系</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={resetLocationFilters}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100"
          >
            重置筛选
          </button>
          </div>
          )}
        </div>
        <div className="pointer-events-none absolute right-[-14px] top-1/2 z-40 -translate-y-1/2">
          <button
            onClick={() => setIsFilterSidebarCollapsed((prev) => !prev)}
            className="pointer-events-auto flex h-14 w-8 items-center justify-center rounded-r-2xl rounded-l-xl border border-white/85 bg-white text-slate-500 shadow-lg transition-all hover:text-slate-800"
            title={isFilterSidebarCollapsed ? '展开筛选栏' : '收起筛选栏'}
          >
            {isFilterSidebarCollapsed ? <ChevronRight size={18} strokeWidth={2.8} /> : <ChevronLeft size={18} strokeWidth={2.8} />}
          </button>
        </div>
      </div>

      <div className="mac-panel min-w-0 flex-1 flex flex-col rounded-[30px] overflow-hidden">
        <div className="mac-toolbar relative px-6 py-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索导师、大学、学院、研究方向或项目名"
                className="mac-input w-full rounded-2xl px-10 py-3 text-sm text-slate-700 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsManualEntryModalOpen(true)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus size={16} />
                  手动录入
                </span>
              </button>
              <button
                onClick={handleXlsxClick}
                disabled={isImporting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <span className="inline-flex items-center gap-2">
                  {isImporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                  导入 XLSX
                </span>
              </button>
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <span className="inline-flex items-center gap-2">
                  <Globe size={16} />
                  联网搜索导入
                </span>
              </button>
            </div>
          </div>

          {importSummary && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <div className="font-bold">
                最近一次导入：{importSummary.workbookName} / {importSummary.sheetName}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>解析成功 {importSummary.parsedRows} 行</span>
                <span>新增导师 {importSummary.createdFacultyCount} 位</span>
                <span>合并导师 {importSummary.mergedFacultyCount} 位</span>
                <span>追加项目 {importSummary.appendedProjectCount} 个</span>
                <span>失败 {importSummary.failedRows} 行</span>
              </div>
            </div>
          )}

          {contextClient && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold">当前正在为 {contextClient.name} 做高级筛选</div>
                  <div className="mt-1 text-blue-700">
                    选中导师后可以直接回填到该学生的推荐导师列表，筛选条件已按学生择导档案预填。
                  </div>
                </div>
                <button
                  onClick={() => onReturnToClient?.()}
                  className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                >
                  返回学生详情
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <div className="flex flex-wrap items-center gap-4">
              <span>
                筛选结果 <strong className="text-slate-900">{filteredFaculty.length}</strong> 位导师
              </span>
              {selectedIds.size > 0 && (
                <span>
                  已选 <strong className="text-slate-900">{selectedIds.size}</strong> 位
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeFilters.length > 0 && (
                <div className="mr-3 flex flex-wrap items-center gap-2">
                  {activeFilters.map((filter) => (
                    <span key={`${filter.label}_${filter.value}`} className="mac-pill">
                      {filter.label}: {filter.value}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  viewMode === 'grid' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <LayoutGrid size={16} />
                  卡片
                </span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  viewMode === 'list' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <ListIcon size={16} />
                  列表
                </span>
              </button>
              <button
                onClick={handleOpenExportConfig}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Download size={16} />
                  自定义导出
                </span>
              </button>
              <button
                onClick={toggleSelectAllFiltered}
                disabled={filteredFaculty.length === 0}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {filteredFaculty.length > 0 && filteredFaculty.every((faculty) => selectedIds.has(faculty.id)) ? '取消全选' : '全选当前结果'}
                </span>
              </button>
              {contextClient && (
                <button
                  onClick={handleAddSelectedToContextClient}
                  disabled={selectedIds.size === 0}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <UserPlus size={16} />
                    添加到 {contextClient.name} 并返回
                  </span>
                </button>
              )}
              <button
                onClick={handleBatchDelete}
                disabled={selectedIds.size === 0}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Trash2 size={16} />
                  批量删除
                </span>
              </button>
            </div>
          </div>
        </div>

        {isExportConfigOpen && (
          <div className="border-t border-slate-100 bg-white/70 px-6 py-5">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <div className="text-lg font-black text-slate-900">自定义导出字段</div>
                  <div className="text-sm text-slate-500">导出会按“导师 x 项目”展开，每个项目一行，更接近总表结构。</div>
                </div>
                <button
                  onClick={() => setIsExportConfigOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[55vh] overflow-y-auto px-6 py-6">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={selectAllExportFields}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    全选字段
                  </button>
                  <button
                    type="button"
                    onClick={resetExportFields}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    恢复默认
                  </button>
                  <span className="text-sm text-slate-500">
                    已选 <strong className="text-slate-900">{selectedExportFields.length}</strong> 个字段
                  </span>
                </div>

                <div className="space-y-6">
                  {EXPORT_FIELD_GROUPS.map((group) => {
                    const options = EXPORT_FIELD_OPTIONS.filter((option) => option.group === group.key);
                    return (
                      <section key={group.key} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="mb-3 text-sm font-black text-slate-900">{group.label}</div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {options.map((option) => {
                            const checked = selectedExportFields.includes(option.key);
                            return (
                              <label
                                key={option.key}
                                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                                  checked
                                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleExportField(option.key)}
                                />
                                <span className="font-semibold">{option.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  onClick={() => setIsExportConfigOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  onClick={handleExportCSV}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  导出 CSV
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {filteredFaculty.length === 0 ? (
            <EmptyState title="当前没有匹配结果" description="试试放宽地理层级、组织层级或搜索关键词。" />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {filteredFaculty.map((faculty) => (
                <div key={faculty.id} className={`space-y-2 ${selectedIds.has(faculty.id) ? 'rounded-3xl ring-2 ring-blue-300' : ''}`}>
                  <label className="inline-flex items-center gap-2 px-1 text-xs font-semibold text-slate-500">
                    <input type="checkbox" checked={selectedIds.has(faculty.id)} onChange={() => toggleSelection(faculty.id)} />
                    选择导师
                  </label>
                  <FacultyCard
                    prof={faculty}
                    isDatabaseView={true}
                    onLink={(prof) => setLinkingFacultyId((prof as FacultyRecord).id)}
                    onEdit={setEditingFaculty}
                    onDelete={onDeleteFaculty}
                    onRefresh={handleRefreshFaculty}
                    linkedClientCount={faculty.linkedClientIds?.length || 0}
                    isLinked={refreshingId === faculty.id}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filteredFaculty.length > 0 && filteredFaculty.every((faculty) => selectedIds.has(faculty.id))}
                          onChange={toggleSelectAllFiltered}
                        />
                        <span>选择</span>
                      </label>
                    </th>
                    <th className="px-4 py-3">导师</th>
                    <th className="px-4 py-3">地理层级</th>
                    <th className="px-4 py-3">组织层级</th>
                    <th className="px-4 py-3">项目</th>
                    <th className="px-4 py-3">关联学生</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaculty.map((faculty) => (
                    <tr key={faculty.id} className="border-t border-slate-100 text-slate-700">
                      <td className="px-4 py-3 align-top">
                        <input type="checkbox" checked={selectedIds.has(faculty.id)} onChange={() => toggleSelection(faculty.id)} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-bold text-slate-900">{faculty.name}</div>
                        <div className="text-xs text-slate-500">{faculty.title}</div>
                      </td>
                      <td className="px-4 py-3 align-top">{[faculty.country, faculty.provinceState, faculty.city].filter(Boolean).join(' / ') || '未分类'}</td>
                      <td className="px-4 py-3 align-top">{[faculty.university, faculty.school, faculty.department].filter(Boolean).join(' / ') || '未分类'}</td>
                      <td className="px-4 py-3 align-top">{faculty.projects.length}</td>
                      <td className="px-4 py-3 align-top">{faculty.linkedClientIds?.length || 0}</td>
                      <td className="px-4 py-3 align-top text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setEditingFaculty(faculty)}
                            className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                            title="编辑导师"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleRefreshFaculty(faculty)}
                            className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                            title="联网刷新"
                          >
                            <RefreshCw size={15} className={refreshingId === faculty.id ? 'animate-spin' : ''} />
                          </button>
                          <button
                            onClick={() => setLinkingFacultyId(faculty.id)}
                            className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                            title="关联学生"
                          >
                            <UserPlus size={15} />
                          </button>
                          <button
                            onClick={() => onDeleteFaculty(faculty.id)}
                            className="rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                            title="删除导师"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <FacultySearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onImport={handleImportFaculty} />

      <FacultyManualEntryModal
        isOpen={isManualEntryModalOpen}
        onClose={() => setIsManualEntryModalOpen(false)}
        onSave={(faculty, country, fieldCategory, extra) => {
          onAddFaculty(faculty, country, fieldCategory, extra);
          setIsManualEntryModalOpen(false);
        }}
      />

      {linkingFacultyId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-black text-slate-900">关联学生</div>
                <div className="text-sm text-slate-500">选择要挂接到当前导师的学生。</div>
              </div>
              <button
                onClick={() => setLinkingFacultyId(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto">
              {clients.map((client) => {
                const faculty = facultyDatabase.find((item) => item.id === linkingFacultyId);
                const linked = faculty?.linkedClientIds?.includes(client.id) || false;
                return (
                  <button
                    key={client.id}
                    onClick={() => {
                      if (linked) {
                        onUnlinkFaculty(linkingFacultyId, client.id);
                      } else {
                        onLinkFaculty(linkingFacultyId, client.id);
                      }
                      setLinkingFacultyId(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                      linked ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-semibold">{client.name}</span>
                    <span className="text-xs font-semibold">{linked ? '已关联' : '点击关联'}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {editingFaculty && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <div className="text-lg font-black text-slate-900">编辑导师</div>
                <div className="text-sm text-slate-500">调整导师主档案、项目记录与来源链接，导入后的字段也可以在这里修正。</div>
              </div>
              <button
                onClick={() => setEditingFaculty(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-6 py-6 max-h-[75vh] overflow-y-auto">
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">导师姓名</div>
                <input
                  value={editingFaculty.name}
                  onChange={(event) => setEditingFaculty({ ...editingFaculty, name: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">职称</div>
                <input
                  value={editingFaculty.title}
                  onChange={(event) => setEditingFaculty({ ...editingFaculty, title: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">国家</div>
                <input
                  value={editingFaculty.country}
                  onChange={(event) => setEditingFaculty({ ...editingFaculty, country: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">州 / 省</div>
                <input
                  value={editingFaculty.provinceState || ''}
                  onChange={(event) => setEditingFaculty({ ...editingFaculty, provinceState: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">城市</div>
                <input
                  value={editingFaculty.city || ''}
                  onChange={(event) => setEditingFaculty({ ...editingFaculty, city: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">大学</div>
                <input
                  value={editingFaculty.university}
                  onChange={(event) => setEditingFaculty({ ...editingFaculty, university: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">学院 / School</div>
                <input
                  value={editingFaculty.school || ''}
                  onChange={(event) => setEditingFaculty({ ...editingFaculty, school: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">系 / Department</div>
                <input
                  value={editingFaculty.department || ''}
                  onChange={(event) => setEditingFaculty({ ...editingFaculty, department: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">一级学科</div>
                <input
                  value={editingFaculty.fieldCategory}
                  onChange={(event) => setEditingFaculty({ ...editingFaculty, fieldCategory: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">二级学科</div>
                <input
                  value={editingFaculty.subFieldCategory || ''}
                  onChange={(event) => setEditingFaculty({ ...editingFaculty, subFieldCategory: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">邮箱</div>
                <input
                  value={editingFaculty.email || ''}
                  onChange={(event) => setEditingFaculty({ ...editingFaculty, email: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">主页链接</div>
                <input
                  value={editingFaculty.profileUrl || ''}
                  onChange={(event) => setEditingFaculty({ ...editingFaculty, profileUrl: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-1.5 block">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">院校官网</div>
                <input
                  value={editingFaculty.universityUrl || ''}
                  onChange={(event) => setEditingFaculty({ ...editingFaculty, universityUrl: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-1.5 block md:col-span-2">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">研究方向</div>
                <textarea
                  value={editingFaculty.researchAreas.join('\n')}
                  onChange={(event) =>
                    setEditingFaculty({
                      ...editingFaculty,
                      researchAreas: event.target.value
                        .split(/[\n,;，；、]+/)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                  className="min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">项目记录</div>
                    <div className="text-xs text-slate-500">截止日期、申请要求、RP、学费、奖学金和来源 URL 都可以直接修改。</div>
                  </div>
                  <button
                    onClick={addEditingProject}
                    type="button"
                    className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    新增项目
                  </button>
                </div>
                <div className="space-y-4">
                  {editingFaculty.projects.map((project, index) => (
                    <div key={project.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-bold text-slate-900">项目 {index + 1}</div>
                        <button
                          type="button"
                          onClick={() => removeEditingProject(project.id)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50"
                        >
                          删除
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="space-y-1.5 block">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">项目名称</div>
                          <input
                            value={project.programName || ''}
                            onChange={(event) => updateEditingProject(project.id, { programName: event.target.value })}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3"
                          />
                        </label>
                        <label className="space-y-1.5 block">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">项目链接</div>
                          <input
                            value={project.programUrl || ''}
                            onChange={(event) => updateEditingProject(project.id, { programUrl: event.target.value })}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3"
                          />
                        </label>
                        <label className="space-y-1.5 block md:col-span-2">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">申请截止日期</div>
                          <textarea
                            value={project.deadlineRaw || ''}
                            onChange={(event) => updateEditingProject(project.id, { deadlineRaw: event.target.value })}
                            className="min-h-[72px] w-full rounded-xl border border-slate-200 px-4 py-3"
                          />
                        </label>
                        <label className="space-y-1.5 block md:col-span-2">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">截止日期来源 URL</div>
                          <textarea
                            value={(project.deadlineSourceUrls || []).join('\n')}
                            onChange={(event) => updateEditingProjectUrls(project.id, 'deadlineSourceUrls', event.target.value)}
                            className="min-h-[72px] w-full rounded-xl border border-slate-200 px-4 py-3"
                          />
                        </label>
                        <label className="space-y-1.5 block md:col-span-2">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">申请要求及材料</div>
                          <textarea
                            value={project.applicationRequirementsRaw || ''}
                            onChange={(event) => updateEditingProject(project.id, { applicationRequirementsRaw: event.target.value })}
                            className="min-h-[96px] w-full rounded-xl border border-slate-200 px-4 py-3"
                          />
                        </label>
                        <label className="space-y-1.5 block md:col-span-2">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">申请要求来源 URL</div>
                          <textarea
                            value={(project.applicationRequirementsSourceUrls || []).join('\n')}
                            onChange={(event) => updateEditingProjectUrls(project.id, 'applicationRequirementsSourceUrls', event.target.value)}
                            className="min-h-[72px] w-full rounded-xl border border-slate-200 px-4 py-3"
                          />
                        </label>
                        <label className="space-y-1.5 block md:col-span-2">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">RP 要求</div>
                          <textarea
                            value={project.rpRequirementsRaw || ''}
                            onChange={(event) => updateEditingProject(project.id, { rpRequirementsRaw: event.target.value })}
                            className="min-h-[96px] w-full rounded-xl border border-slate-200 px-4 py-3"
                          />
                        </label>
                        <label className="space-y-1.5 block md:col-span-2">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">RP 要求来源 URL</div>
                          <textarea
                            value={(project.rpRequirementsSourceUrls || []).join('\n')}
                            onChange={(event) => updateEditingProjectUrls(project.id, 'rpRequirementsSourceUrls', event.target.value)}
                            className="min-h-[72px] w-full rounded-xl border border-slate-200 px-4 py-3"
                          />
                        </label>
                        <label className="space-y-1.5 block">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">学费</div>
                          <textarea
                            value={project.tuitionRaw || ''}
                            onChange={(event) => updateEditingProject(project.id, { tuitionRaw: event.target.value })}
                            className="min-h-[72px] w-full rounded-xl border border-slate-200 px-4 py-3"
                          />
                        </label>
                        <label className="space-y-1.5 block">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">奖学金</div>
                          <textarea
                            value={project.scholarshipRaw || ''}
                            onChange={(event) => updateEditingProject(project.id, { scholarshipRaw: event.target.value })}
                            className="min-h-[72px] w-full rounded-xl border border-slate-200 px-4 py-3"
                          />
                        </label>
                        <label className="space-y-1.5 block">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">学费来源 URL</div>
                          <textarea
                            value={(project.tuitionSourceUrls || []).join('\n')}
                            onChange={(event) => updateEditingProjectUrls(project.id, 'tuitionSourceUrls', event.target.value)}
                            className="min-h-[72px] w-full rounded-xl border border-slate-200 px-4 py-3"
                          />
                        </label>
                        <label className="space-y-1.5 block">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">奖学金来源 URL</div>
                          <textarea
                            value={(project.scholarshipSourceUrls || []).join('\n')}
                            onChange={(event) => updateEditingProjectUrls(project.id, 'scholarshipSourceUrls', event.target.value)}
                            className="min-h-[72px] w-full rounded-xl border border-slate-200 px-4 py-3"
                          />
                        </label>
                        <label className="space-y-1.5 block md:col-span-2">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">推荐理由</div>
                          <textarea
                            value={project.recommendationReason || ''}
                            onChange={(event) => updateEditingProject(project.id, { recommendationReason: event.target.value })}
                            className="min-h-[96px] w-full rounded-xl border border-slate-200 px-4 py-3"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <label className="space-y-1.5 block md:col-span-2">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">分类备注</div>
                <textarea
                  value={editingFaculty.classificationNote || ''}
                  onChange={(event) =>
                    setEditingFaculty({
                      ...editingFaculty,
                      classificationNote: event.target.value,
                      classificationSource: 'manual',
                    })
                  }
                  className="min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setEditingFaculty(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onUpdateFaculty(editingFaculty.id, { ...editingFaculty, classificationSource: 'manual' });
                  setEditingFaculty(null);
                }}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                保存修改
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default FacultyDatabase;
