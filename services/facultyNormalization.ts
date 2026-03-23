import { FacultyMember, FacultyProject, FacultyRecord, SourceData } from '../types';
import { COUNTRY_ALIASES, PROVINCE_ALIASES, CITY_ALIASES, UNIVERSITY_HINTS } from './facultyNormalizationConfig';

const UNKNOWN = '未分类';

function cleanText(value?: string | null): string {
  return (value ?? '').replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

function stripUrls(value?: string | null): string {
  return cleanText(value).replace(/https?:\/\/[^\s)]+/gi, '').replace(/\s{2,}/g, ' ').trim();
}

function extractUrls(value?: string | null): string[] {
  return Array.from(new Set((cleanText(value).match(/https?:\/\/[^\s)]+/gi) ?? []).map((url) => cleanText(url))));
}

function mergeUrlArrays(...values: Array<string[] | string | undefined>): string[] {
  const merged = new Set<string>();
  values.forEach((value) => {
    if (!value) return;
    const entries = Array.isArray(value) ? value : [value];
    entries.forEach((entry) => {
      const cleaned = cleanText(entry);
      if (cleaned) merged.add(cleaned);
    });
  });
  return Array.from(merged);
}

function buildSourceData(value?: string | null, urls?: string[]): SourceData | undefined {
  const cleanedValue = stripUrls(value);
  const sourceUrls = mergeUrlArrays(urls);
  if (!cleanedValue && sourceUrls.length === 0) return undefined;
  return {
    value: cleanedValue,
    sourceUrls,
  };
}

function inferEnglishText(primary?: string, fallback?: string): string {
  const direct = cleanText(primary);
  if (direct) return direct;
  const candidate = cleanText(fallback);
  if (/^[\x00-\x7F\s,.'’&()/-]+$/.test(candidate)) {
    return candidate;
  }
  return '';
}

export function normalizeKey(value?: string | null): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[（）()\[\]{}'"`’‘”“.,/\\|:;!?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchAlias(value: string, groups: Array<{ aliases: string[]; canonical: string }>): string | undefined {
  const key = normalizeKey(value);
  if (!key) return undefined;
  for (const group of groups) {
    if (group.aliases.some((alias) => key.includes(normalizeKey(alias)))) {
      return group.canonical;
    }
  }
  return undefined;
}

function deriveCountry(rawValues: string[]): string {
  for (const value of rawValues) {
    const matched = matchAlias(value, COUNTRY_ALIASES);
    if (matched) return matched;
  }

  const joined = rawValues.join(' ');
  const universityHint = UNIVERSITY_HINTS.find((hint) =>
    hint.aliases.some((alias) => normalizeKey(joined).includes(normalizeKey(alias)))
  );
  if (universityHint) return universityHint.country;

  return UNKNOWN;
}

function deriveProvinceState(rawValues: string[]): string | undefined {
  for (const value of rawValues) {
    const matched = matchAlias(value, PROVINCE_ALIASES);
    if (matched) return matched;
  }

  const joined = rawValues.join(' ');
  const universityHint = UNIVERSITY_HINTS.find((hint) =>
    hint.aliases.some((alias) => normalizeKey(joined).includes(normalizeKey(alias)))
  );
  return universityHint?.provinceState;
}

function deriveCity(rawValues: string[]): string | undefined {
  for (const value of rawValues) {
    const matched = matchAlias(value, CITY_ALIASES);
    if (matched) return matched;
  }

  const joined = rawValues.join(' ');
  const universityHint = UNIVERSITY_HINTS.find((hint) =>
    hint.aliases.some((alias) => normalizeKey(joined).includes(normalizeKey(alias)))
  );
  return universityHint?.city;
}

function canonicalUniversityName(university: string): string {
  const hint = UNIVERSITY_HINTS.find((entry) =>
    entry.aliases.some((alias) => normalizeKey(university).includes(normalizeKey(alias)))
  );
  return hint?.canonical ?? (cleanText(university) || UNKNOWN);
}

function extractProgramSubject(programName?: string): string {
  const text = cleanText(programName);
  if (!text) return '';
  const firstLine = text.split('\n').find(Boolean) ?? text;
  const match = firstLine.match(/[-:：]\s*(.+)$/);
  return cleanText(match?.[1] ?? firstLine);
}

function inferSchoolName(values: Array<string | undefined>): string {
  for (const value of values) {
    const text = cleanText(value);
    if (!text) continue;
    const subject = extractProgramSubject(text);
    if (subject) return subject;
  }
  return '';
}

function deriveFieldCategory(values: string[]): { fieldCategory: string; subFieldCategory?: string } {
  const key = normalizeKey(values.join(' '));

  if (!key) {
    return { fieldCategory: UNKNOWN, subFieldCategory: UNKNOWN };
  }

  if (/(computer science|artificial intelligence|machine learning|software|data science|计算机|人工智能|机器学习|数据科学|信息|information)/.test(key)) {
    return { fieldCategory: '计算机与信息', subFieldCategory: '计算机科学' };
  }
  if (/(economics|finance|business|management|marketing|accounting|经济|金融|商科|管理|市场|会计)/.test(key)) {
    return { fieldCategory: '商科与经济', subFieldCategory: '商科与经济' };
  }
  if (/(education|教育|teaching)/.test(key)) {
    return { fieldCategory: '教育', subFieldCategory: '教育学' };
  }
  if (/(art|艺术|architecture|建筑|design|设计|music|音乐)/.test(key)) {
    return { fieldCategory: '艺术与设计', subFieldCategory: '艺术设计' };
  }
  if (/(biology|medicine|medical|health|biomedical|生物|医学|健康|生物医学)/.test(key)) {
    return { fieldCategory: '生物与医学', subFieldCategory: '生物与医学' };
  }
  if (/(engineering|civil|mechanical|electrical|chemical|工程|土木|机械|电气|化工)/.test(key)) {
    return { fieldCategory: '工程', subFieldCategory: '工程学' };
  }
  if (/(sociology|psychology|political|public|social|社会|心理|政治|公共)/.test(key)) {
    return { fieldCategory: '社会科学', subFieldCategory: '社会科学' };
  }
  if (/(history|philosophy|literature|linguistics|人文|历史|哲学|文学|语言)/.test(key)) {
    return { fieldCategory: '人文', subFieldCategory: '人文科学' };
  }

  const fallback = cleanText(values.find((value) => cleanText(value)));
  return {
    fieldCategory: fallback || UNKNOWN,
    subFieldCategory: fallback || UNKNOWN,
  };
}

function buildRegionPath(country: string, provinceState?: string, city?: string): string[] {
  return [country, provinceState, city].map((value) => cleanText(value)).filter(Boolean);
}

function buildClassificationPath(fieldCategory: string, subFieldCategory?: string, school?: string, department?: string): string[] {
  const path = [fieldCategory, subFieldCategory, school, department]
    .map((value) => cleanText(value))
    .filter(Boolean);
  return path.length > 0 ? path : [UNKNOWN];
}

function mergeStringArray(...values: Array<string[] | undefined>): string[] {
  const merged = new Set<string>();
  values.flatMap((value) => value ?? []).forEach((item) => {
    const cleaned = cleanText(item);
    if (cleaned) merged.add(cleaned);
  });
  return Array.from(merged);
}

function normalizeProject(project: Partial<FacultyProject>): FacultyProject {
  return {
    ...project,
    id: project.id || createProjectId(),
    programName: cleanText(project.programName) || UNKNOWN,
    programNameZh: cleanText(project.programNameZh),
    programNameEn: cleanText(project.programNameEn),
    programUrl: cleanText(project.programUrl),
    deadlineRaw: stripUrls(project.deadlineRaw),
    deadline: stripUrls(project.deadlineRaw),
    deadlineSourceUrls: mergeUrlArrays(project.deadlineSourceUrls, extractUrls(project.deadlineRaw)),
    applicationRequirementsRaw: stripUrls(project.applicationRequirementsRaw),
    applicationReqs: stripUrls(project.applicationRequirementsRaw),
    applicationRequirementsSourceUrls: mergeUrlArrays(project.applicationRequirementsSourceUrls, extractUrls(project.applicationRequirementsRaw)),
    rpRequirementsRaw: stripUrls(project.rpRequirementsRaw),
    rpReqs: stripUrls(project.rpRequirementsRaw),
    rpRequirementsSourceUrls: mergeUrlArrays(project.rpRequirementsSourceUrls, extractUrls(project.rpRequirementsRaw)),
    tuitionRaw: stripUrls(project.tuitionRaw),
    tuition: stripUrls(project.tuitionRaw),
    tuitionSourceUrls: mergeUrlArrays(project.tuitionSourceUrls, extractUrls(project.tuitionRaw)),
    scholarshipRaw: stripUrls(project.scholarshipRaw),
    scholarship: stripUrls(project.scholarshipRaw),
    scholarshipSourceUrls: mergeUrlArrays(project.scholarshipSourceUrls, extractUrls(project.scholarshipRaw)),
    recommendationReason: cleanText(project.recommendationReason),
    sourceWorkbook: cleanText(project.sourceWorkbook),
    sourceSheet: cleanText(project.sourceSheet),
    mentorTextRaw: cleanText(project.mentorTextRaw),
    emailCellRaw: cleanText(project.emailCellRaw),
  };
}

function mergeSourceData(existing?: SourceData, incoming?: SourceData): SourceData | undefined {
  const value = stripUrls(incoming?.value) || stripUrls(existing?.value);
  const sourceUrls = mergeUrlArrays(existing?.sourceUrls, incoming?.sourceUrls);
  if (!value && sourceUrls.length === 0) return undefined;
  return { value, sourceUrls };
}

function createProjectId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `project_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyMatchReasoning() {
  return {
    locationCheck: '',
    universityCheck: '',
    departmentCheck: '',
    researchFit: '',
    positionCheck: '',
    activityCheck: '',
    reputationCheck: '',
  };
}

export function normalizeFacultyRecord(input: Partial<FacultyRecord> & Pick<FacultyMember, 'name' | 'university'>): FacultyRecord {
  const projects = (input.projects ?? []).map(normalizeProject);
  const primaryProject = projects[0];

  const normalizedUniversity = canonicalUniversityName(input.university);
  const normalizedName = cleanText(input.name);
  const school = cleanText(input.school) || inferSchoolName([input.school, primaryProject?.programName, input.department]);
  const department = cleanText(input.department) || school || UNKNOWN;
  const locationValues = [
    input.country,
    input.provinceState,
    input.city,
    input.subRegion,
    input.matchReasoning?.locationCheck,
    input.university,
    input.school,
    input.department,
    input.raw?.sourceWorkbook,
  ].map((value) => cleanText(value));
  const country = deriveCountry(locationValues);
  const provinceState = cleanText(input.provinceState) || deriveProvinceState(locationValues);
  const city = cleanText(input.city) || deriveCity(locationValues);
  const subRegion = city || provinceState || cleanText(input.subRegion);
  const providedRegionPath = (input.regionPath ?? []).map((value) => cleanText(value)).filter(Boolean);
  const regionPath = providedRegionPath.length > 0 ? providedRegionPath : buildRegionPath(country, provinceState, city);

  const fieldValues = [
    input.fieldCategory,
    input.subFieldCategory,
    school,
    department,
    ...(input.researchAreas ?? []),
    input.alignmentDetails,
    input.title,
    primaryProject?.programName,
    primaryProject?.recommendationReason,
  ].map((value) => cleanText(value));
  const fieldInfo = deriveFieldCategory(fieldValues);
  const fieldCategory = cleanText(input.fieldCategory) || fieldInfo.fieldCategory;
  const subFieldCategory = cleanText(input.subFieldCategory) || fieldInfo.subFieldCategory || UNKNOWN;
  const providedClassificationPath = (input.classificationPath ?? []).map((value) => cleanText(value)).filter(Boolean);
  const classificationPath = providedClassificationPath.length > 0
    ? providedClassificationPath
    : buildClassificationPath(fieldCategory, subFieldCategory, school, department);

  const universityEnglish = inferEnglishText((input as FacultyRecord).universityEnglish, input.university === normalizedUniversity ? '' : input.university);
  const programNameZh = cleanText((input as FacultyRecord).programNameZh) || cleanText(primaryProject?.programNameZh);
  const programNameEn = inferEnglishText((input as FacultyRecord).programNameEn, primaryProject?.programNameEn);

  const deadlineSourceUrls = mergeUrlArrays(
    (input as FacultyRecord).deadlineSourceUrls,
    primaryProject?.deadlineSourceUrls,
    input.deadlineData?.sourceUrls,
    extractUrls(input.deadlineData?.value),
  );
  const applicationRequirementsSourceUrls = mergeUrlArrays(
    (input as FacultyRecord).applicationRequirementsSourceUrls,
    primaryProject?.applicationRequirementsSourceUrls,
    input.applicationReqsData?.sourceUrls,
    extractUrls(input.applicationReqsData?.value),
  );
  const rpRequirementsSourceUrls = mergeUrlArrays(
    (input as FacultyRecord).rpRequirementsSourceUrls,
    primaryProject?.rpRequirementsSourceUrls,
    input.rpReqsData?.sourceUrls,
    extractUrls(input.rpReqsData?.value),
  );
  const tuitionSourceUrls = mergeUrlArrays(
    (input as FacultyRecord).tuitionSourceUrls,
    primaryProject?.tuitionSourceUrls,
    input.tuitionData?.sourceUrls,
    extractUrls(input.tuitionData?.value),
  );
  const scholarshipSourceUrls = mergeUrlArrays(
    (input as FacultyRecord).scholarshipSourceUrls,
    primaryProject?.scholarshipSourceUrls,
    input.scholarshipData?.sourceUrls,
    extractUrls(input.scholarshipData?.value),
  );

  const deadlineData = buildSourceData(input.deadlineData?.value || primaryProject?.deadlineRaw, deadlineSourceUrls);
  const applicationReqsData = buildSourceData(
    input.applicationReqsData?.value || primaryProject?.applicationRequirementsRaw,
    applicationRequirementsSourceUrls,
  );
  const rpReqsData = buildSourceData(
    input.rpReqsData?.value || primaryProject?.rpRequirementsRaw,
    rpRequirementsSourceUrls,
  );
  const tuitionData = buildSourceData(input.tuitionData?.value || primaryProject?.tuitionRaw, tuitionSourceUrls);
  const scholarshipData = buildSourceData(
    input.scholarshipData?.value || primaryProject?.scholarshipRaw,
    scholarshipSourceUrls,
  );

  return {
    ...input,
    id: input.id || (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `faculty_${Math.random().toString(36).slice(2, 10)}`),
    name: normalizedName || UNKNOWN,
    normalizedName: normalizeKey(normalizedName || UNKNOWN),
    university: normalizedUniversity,
    normalizedUniversity: normalizeKey(normalizedUniversity),
    school,
    department,
    title: cleanText(input.title) || '未知职称',
    matchScore: input.matchScore ?? 0,
    researchAreas: mergeStringArray(input.researchAreas),
    alignmentDetails: cleanText(input.alignmentDetails),
    activitySummary: cleanText(input.activitySummary),
    recentActivities: mergeStringArray(input.recentActivities),
    isActive: input.isActive ?? true,
    profileUrl: cleanText(input.profileUrl),
    photoUrl: cleanText(input.photoUrl),
    email: cleanText(input.email),
    qsRanking: cleanText(input.qsRanking),
    qsRankingData: input.qsRankingData,
    deadlineData,
    applicationReqsData,
    rpReqsData,
    tuitionData,
    scholarshipData,
    programUrl: cleanText(input.programUrl),
    universityUrl: cleanText(input.universityUrl),
    matchReasoning: {
      ...createEmptyMatchReasoning(),
      ...input.matchReasoning,
      locationCheck: cleanText(input.matchReasoning?.locationCheck || country),
      universityCheck: cleanText(input.matchReasoning?.universityCheck || normalizedUniversity),
      departmentCheck: cleanText(input.matchReasoning?.departmentCheck || department),
      researchFit: cleanText(input.matchReasoning?.researchFit),
      positionCheck: cleanText(input.matchReasoning?.positionCheck || input.title),
      activityCheck: cleanText(input.matchReasoning?.activityCheck),
      reputationCheck: cleanText(input.matchReasoning?.reputationCheck),
    },
    country,
    provinceState,
    city,
    subRegion,
    regionPath,
    universityEnglish,
    programNameZh,
    programNameEn,
    deadlineSourceUrls,
    applicationRequirementsSourceUrls,
    rpRequirementsSourceUrls,
    tuitionSourceUrls,
    scholarshipSourceUrls,
    fieldCategory,
    subFieldCategory,
    classificationPath,
    classificationSource: input.classificationSource || 'auto',
    classificationNote: cleanText(input.classificationNote),
    customTags: mergeStringArray(input.customTags),
    addedAt: input.addedAt || new Date().toISOString(),
    updatedAt: input.updatedAt || new Date().toISOString(),
    source: input.source || 'manual',
    notes: cleanText(input.notes),
    linkedClientIds: Array.from(new Set((input.linkedClientIds ?? []).filter(Boolean))),
    projects,
    legacy: input.legacy,
    raw: input.raw,
  };
}

export function buildFacultyRecordFromMember(
  faculty: FacultyMember,
  options?: {
    manualCountry?: string;
    manualField?: string;
    extra?: Partial<FacultyRecord>;
  }
): FacultyRecord {
  const extra = options?.extra ?? {};
  const source = extra.source || 'search';
  return normalizeFacultyRecord({
    ...faculty,
    ...extra,
    source,
    country: extra.country || options?.manualCountry || faculty.matchReasoning?.locationCheck,
    fieldCategory: extra.fieldCategory || options?.manualField,
    projects: extra.projects ?? [],
    raw: extra.raw,
  });
}

function projectKey(project: FacultyProject): string {
  return [
    normalizeKey(project.programName),
    normalizeKey(project.programUrl),
    normalizeKey(project.sourceWorkbook),
    normalizeKey(project.sourceSheet),
    String(project.sourceRowIndex ?? ''),
  ].join('|');
}

function mergeProjects(existing: FacultyProject[], incoming: FacultyProject[]): { projects: FacultyProject[]; appendedCount: number } {
  const next = [...existing];
  const existingIndexByKey = new Map(existing.map((project, index) => [projectKey(project), index]));
  let appendedCount = 0;

  for (const project of incoming) {
    const key = projectKey(project);
    const existingIndex = existingIndexByKey.get(key);
    if (existingIndex === undefined) {
      next.push(normalizeProject(project));
      existingIndexByKey.set(key, next.length - 1);
      appendedCount += 1;
      continue;
    }

    next[existingIndex] = normalizeProject({
      ...next[existingIndex],
      ...project,
      id: next[existingIndex].id,
      programNameZh: project.programNameZh || next[existingIndex].programNameZh,
      programNameEn: project.programNameEn || next[existingIndex].programNameEn,
      deadlineSourceUrls: mergeUrlArrays(next[existingIndex].deadlineSourceUrls, project.deadlineSourceUrls),
      applicationRequirementsSourceUrls: mergeUrlArrays(
        next[existingIndex].applicationRequirementsSourceUrls,
        project.applicationRequirementsSourceUrls,
      ),
      rpRequirementsSourceUrls: mergeUrlArrays(
        next[existingIndex].rpRequirementsSourceUrls,
        project.rpRequirementsSourceUrls,
      ),
      tuitionSourceUrls: mergeUrlArrays(next[existingIndex].tuitionSourceUrls, project.tuitionSourceUrls),
      scholarshipSourceUrls: mergeUrlArrays(
        next[existingIndex].scholarshipSourceUrls,
        project.scholarshipSourceUrls,
      ),
    });
  }

  return { projects: next, appendedCount };
}

export function facultyDedupKey(record: Pick<FacultyRecord, 'normalizedName' | 'normalizedUniversity' | 'name' | 'university'>): string {
  const normalizedName = 'normalizedName' in record && record.normalizedName
    ? record.normalizedName
    : normalizeKey(record.name);
  const normalizedUniversity = 'normalizedUniversity' in record && record.normalizedUniversity
    ? record.normalizedUniversity
    : normalizeKey(record.university);
  return `${normalizedName}::${normalizedUniversity}`;
}

export function mergeFacultyRecord(existing: FacultyRecord, incoming: FacultyRecord): { record: FacultyRecord; appendedProjectCount: number } {
  const { projects, appendedCount } = mergeProjects(existing.projects, incoming.projects);
  const keepExistingClassification = ['manual', 'hybrid'].includes(existing.classificationSource || '') && incoming.classificationSource === 'auto';

  const merged = normalizeFacultyRecord({
    ...existing,
    ...incoming,
    id: existing.id,
    addedAt: existing.addedAt,
    updatedAt: new Date().toISOString(),
    source: existing.source === 'manual' ? existing.source : incoming.source || existing.source,
    linkedClientIds: Array.from(new Set([...(existing.linkedClientIds ?? []), ...(incoming.linkedClientIds ?? [])])),
    customTags: mergeStringArray(existing.customTags, incoming.customTags),
    researchAreas: mergeStringArray(existing.researchAreas, incoming.researchAreas),
    recentActivities: mergeStringArray(existing.recentActivities, incoming.recentActivities),
    projects,
    raw: {
      sourceWorkbook: incoming.raw?.sourceWorkbook || existing.raw?.sourceWorkbook,
      sourceSheet: incoming.raw?.sourceSheet || existing.raw?.sourceSheet,
      importedRows: [
        ...(existing.raw?.importedRows ?? []),
        ...(incoming.raw?.importedRows ?? []),
      ],
    },
    legacy: existing.legacy || incoming.legacy,
    country: keepExistingClassification ? existing.country : incoming.country || existing.country,
    provinceState: keepExistingClassification ? existing.provinceState : incoming.provinceState || existing.provinceState,
    city: keepExistingClassification ? existing.city : incoming.city || existing.city,
    subRegion: keepExistingClassification ? existing.subRegion : incoming.subRegion || existing.subRegion,
    regionPath: keepExistingClassification ? existing.regionPath : incoming.regionPath || existing.regionPath,
    fieldCategory: keepExistingClassification ? existing.fieldCategory : incoming.fieldCategory || existing.fieldCategory,
    subFieldCategory: keepExistingClassification ? existing.subFieldCategory : incoming.subFieldCategory || existing.subFieldCategory,
    classificationPath: keepExistingClassification ? existing.classificationPath : incoming.classificationPath || existing.classificationPath,
    classificationSource: keepExistingClassification ? existing.classificationSource : incoming.classificationSource || existing.classificationSource,
    classificationNote: keepExistingClassification ? existing.classificationNote : incoming.classificationNote || existing.classificationNote,
    notes: incoming.notes || existing.notes,
    email: incoming.email || existing.email,
    profileUrl: incoming.profileUrl || existing.profileUrl,
    photoUrl: incoming.photoUrl || existing.photoUrl,
    title: incoming.title || existing.title,
    school: incoming.school || existing.school,
    department: incoming.department || existing.department,
    qsRanking: incoming.qsRanking || existing.qsRanking,
    universityEnglish: incoming.universityEnglish || existing.universityEnglish,
    programNameZh: incoming.programNameZh || existing.programNameZh,
    programNameEn: incoming.programNameEn || existing.programNameEn,
    deadlineSourceUrls: mergeUrlArrays(existing.deadlineSourceUrls, incoming.deadlineSourceUrls),
    applicationRequirementsSourceUrls: mergeUrlArrays(
      existing.applicationRequirementsSourceUrls,
      incoming.applicationRequirementsSourceUrls,
    ),
    rpRequirementsSourceUrls: mergeUrlArrays(existing.rpRequirementsSourceUrls, incoming.rpRequirementsSourceUrls),
    tuitionSourceUrls: mergeUrlArrays(existing.tuitionSourceUrls, incoming.tuitionSourceUrls),
    scholarshipSourceUrls: mergeUrlArrays(existing.scholarshipSourceUrls, incoming.scholarshipSourceUrls),
    deadlineData: mergeSourceData(existing.deadlineData, incoming.deadlineData),
    applicationReqsData: mergeSourceData(existing.applicationReqsData, incoming.applicationReqsData),
    rpReqsData: mergeSourceData(existing.rpReqsData, incoming.rpReqsData),
    tuitionData: mergeSourceData(existing.tuitionData, incoming.tuitionData),
    scholarshipData: mergeSourceData(existing.scholarshipData, incoming.scholarshipData),
    programUrl: incoming.programUrl || existing.programUrl,
    universityUrl: incoming.universityUrl || existing.universityUrl,
  });

  return {
    record: merged,
    appendedProjectCount: appendedCount,
  };
}

export function upsertFacultyRecord(
  records: FacultyRecord[],
  incomingRecord: FacultyRecord,
): {
  records: FacultyRecord[];
  id: string;
  created: boolean;
  merged: boolean;
  appendedProjectCount: number;
} {
  const incoming = normalizeFacultyRecord(incomingRecord);
  const key = facultyDedupKey(incoming);
  const index = records.findIndex((record) => facultyDedupKey(record) === key);

  if (index === -1) {
    return {
      records: [...records, incoming],
      id: incoming.id,
      created: true,
      merged: false,
      appendedProjectCount: incoming.projects.length,
    };
  }

  const merged = mergeFacultyRecord(records[index], incoming);
  const next = [...records];
  next[index] = merged.record;
  return {
    records: next,
    id: merged.record.id,
    created: false,
    merged: true,
    appendedProjectCount: merged.appendedProjectCount,
  };
}

export function migrateFacultyDatabase(records: unknown[]): FacultyRecord[] {
  if (!Array.isArray(records)) return [];

  return records
    .filter((record): record is Partial<FacultyRecord> & Pick<FacultyMember, 'name' | 'university'> => {
      return Boolean(record && typeof record === 'object' && 'name' in record && 'university' in record);
    })
    .map((record) => {
      const typedRecord = record as Partial<FacultyRecord> & Pick<FacultyMember, 'name' | 'university'>;
      return normalizeFacultyRecord({
        ...typedRecord,
        source: typedRecord.source || 'manual',
        projects: typedRecord.projects ?? [],
        legacy: typedRecord.legacy || {
          country: typedRecord.country,
          subRegion: typedRecord.subRegion,
          regionPath: typedRecord.regionPath,
          classificationPath: typedRecord.classificationPath,
          classificationNote: typedRecord.classificationNote,
        },
      });
    });
}
