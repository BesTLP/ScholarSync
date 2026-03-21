import { FacultyMember, FacultyProject, FacultyRecord, SourceData } from '../types';

const UNKNOWN = '未分类';

const COUNTRY_ALIASES: Array<{ aliases: string[]; canonical: string }> = [
  { aliases: ['china', 'prc', '中国', '中华人民共和国'], canonical: '中国' },
  { aliases: ['usa', 'us', 'u.s.', 'u.s.a.', 'united states', 'america', '美国'], canonical: '美国' },
  { aliases: ['uk', 'u.k.', 'united kingdom', 'england', 'britain', 'great britain', '英国'], canonical: '英国' },
  { aliases: ['australia', 'australian', 'au', '澳洲', '澳大利亚'], canonical: '澳大利亚' },
  { aliases: ['canada', 'ca', '加拿大'], canonical: '加拿大' },
  { aliases: ['singapore', 'sg', '新加坡'], canonical: '新加坡' },
  { aliases: ['hong kong', '香港'], canonical: '中国' },
  { aliases: ['macau', 'macao', '澳门'], canonical: '中国' },
  { aliases: ['taiwan', '台湾'], canonical: '中国' },
];

const PROVINCE_ALIASES: Array<{ aliases: string[]; canonical: string }> = [
  { aliases: ['beijing', '北京'], canonical: '北京' },
  { aliases: ['shanghai', '上海'], canonical: '上海' },
  { aliases: ['hong kong', '香港'], canonical: '香港' },
  { aliases: ['macau', 'macao', '澳门'], canonical: '澳门' },
  { aliases: ['new york', 'ny', '纽约州', '纽约'], canonical: '纽约州' },
  { aliases: ['california', 'ca', '加州', '加利福尼亚', '加利福尼亚州'], canonical: '加利福尼亚州' },
  { aliases: ['texas', 'tx', '德州', '德克萨斯', '德克萨斯州'], canonical: '德克萨斯州' },
  { aliases: ['massachusetts', 'ma', '马萨诸塞', '马萨诸塞州'], canonical: '马萨诸塞州' },
  { aliases: ['new south wales', 'nsw', '新南威尔士', '新南威尔士州'], canonical: '新南威尔士州' },
  { aliases: ['victoria', 'vic', '维多利亚', '维多利亚州'], canonical: '维多利亚州' },
  { aliases: ['queensland', 'qld', '昆士兰', '昆士兰州'], canonical: '昆士兰州' },
  { aliases: ['ontario', 'on', '安大略', '安大略省'], canonical: '安大略省' },
];

const CITY_ALIASES: Array<{ aliases: string[]; canonical: string }> = [
  { aliases: ['beijing', '北京'], canonical: '北京' },
  { aliases: ['shanghai', '上海'], canonical: '上海' },
  { aliases: ['hong kong', '香港'], canonical: '香港' },
  { aliases: ['rochester', '罗彻斯特'], canonical: '罗彻斯特' },
  { aliases: ['new york city', '纽约市'], canonical: '纽约' },
  { aliases: ['melbourne', '墨尔本'], canonical: '墨尔本' },
  { aliases: ['sydney', '悉尼'], canonical: '悉尼' },
  { aliases: ['brisbane', '布里斯班'], canonical: '布里斯班' },
  { aliases: ['stanford'], canonical: '斯坦福' },
  { aliases: ['boston', '波士顿'], canonical: '波士顿' },
  { aliases: ['cambridge'], canonical: '剑桥' },
];

const UNIVERSITY_HINTS: Array<{
  aliases: string[];
  canonical: string;
  country: string;
  provinceState?: string;
  city?: string;
}> = [
  { aliases: ['peking university', '北京大学'], canonical: '北京大学', country: '中国', provinceState: '北京', city: '北京' },
  { aliases: ['tsinghua university', '清华大学'], canonical: '清华大学', country: '中国', provinceState: '北京', city: '北京' },
  { aliases: ['university of rochester', '罗彻斯特大学'], canonical: '罗彻斯特大学', country: '美国', provinceState: '纽约州', city: '罗彻斯特' },
  { aliases: ['stanford university', '斯坦福大学'], canonical: '斯坦福大学', country: '美国', provinceState: '加利福尼亚州', city: '斯坦福' },
  { aliases: ['harvard university', '哈佛大学'], canonical: '哈佛大学', country: '美国', provinceState: '马萨诸塞州', city: '剑桥' },
  { aliases: ['massachusetts institute of technology', 'mit', '麻省理工学院'], canonical: '麻省理工学院', country: '美国', provinceState: '马萨诸塞州', city: '剑桥' },
  { aliases: ['university of melbourne', '墨尔本大学'], canonical: '墨尔本大学', country: '澳大利亚', provinceState: '维多利亚州', city: '墨尔本' },
  { aliases: ['the university of melbourne'], canonical: '墨尔本大学', country: '澳大利亚', provinceState: '维多利亚州', city: '墨尔本' },
  { aliases: ['university of sydney', '悉尼大学'], canonical: '悉尼大学', country: '澳大利亚', provinceState: '新南威尔士州', city: '悉尼' },
  { aliases: ['unsw', 'university of new south wales', '新南威尔士大学'], canonical: '新南威尔士大学', country: '澳大利亚', provinceState: '新南威尔士州', city: '悉尼' },
  { aliases: ['monash university', '莫纳什大学'], canonical: '莫纳什大学', country: '澳大利亚', provinceState: '维多利亚州', city: '墨尔本' },
  { aliases: ['university of queensland', '昆士兰大学'], canonical: '昆士兰大学', country: '澳大利亚', provinceState: '昆士兰州', city: '布里斯班' },
  { aliases: ['university of toronto', '多伦多大学'], canonical: '多伦多大学', country: '加拿大', provinceState: '安大略省', city: '多伦多' },
  { aliases: ['national university of singapore', 'nus', '新加坡国立大学'], canonical: '新加坡国立大学', country: '新加坡', city: '新加坡' },
];

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
    sourceUrl: sourceUrls[0] ?? '',
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

  if (/(computer science|artificial intelligence|machine learning|software|data science|计算机|人工智能|机器学习|数据科学)/.test(key)) {
    return { fieldCategory: '计算机科学', subFieldCategory: '人工智能' };
  }
  if (/(music|音乐|music therapy|music education)/.test(key)) {
    return { fieldCategory: '音乐', subFieldCategory: '音乐学' };
  }
  if (/(education|教育)/.test(key)) {
    return { fieldCategory: '教育学', subFieldCategory: '教育学' };
  }
  if (/(art|艺术|architecture|建筑|design|设计)/.test(key)) {
    return { fieldCategory: '艺术与设计', subFieldCategory: '艺术设计' };
  }
  if (/(economics|finance|business|management|经济|金融|商科|管理)/.test(key)) {
    return { fieldCategory: '商科与经济', subFieldCategory: '商科与经济' };
  }
  if (/(biology|medicine|medical|health|生物|医学|健康)/.test(key)) {
    return { fieldCategory: '生物与医学', subFieldCategory: '生物与医学' };
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
    deadlineSourceUrls: mergeUrlArrays(project.deadlineSourceUrls, extractUrls(project.deadlineRaw)),
    applicationRequirementsRaw: stripUrls(project.applicationRequirementsRaw),
    applicationRequirementsSourceUrls: mergeUrlArrays(project.applicationRequirementsSourceUrls, extractUrls(project.applicationRequirementsRaw)),
    rpRequirementsRaw: stripUrls(project.rpRequirementsRaw),
    rpRequirementsSourceUrls: mergeUrlArrays(project.rpRequirementsSourceUrls, extractUrls(project.rpRequirementsRaw)),
    tuitionRaw: stripUrls(project.tuitionRaw),
    tuitionSourceUrls: mergeUrlArrays(project.tuitionSourceUrls, extractUrls(project.tuitionRaw)),
    scholarshipRaw: stripUrls(project.scholarshipRaw),
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
  const sourceUrl = cleanText(incoming?.sourceUrl) || cleanText(existing?.sourceUrl);
  if (!value && !sourceUrl) return undefined;
  return { value, sourceUrl };
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
    input.deadlineData?.sourceUrl,
    extractUrls(input.deadlineData?.value),
  );
  const applicationRequirementsSourceUrls = mergeUrlArrays(
    (input as FacultyRecord).applicationRequirementsSourceUrls,
    primaryProject?.applicationRequirementsSourceUrls,
    input.applicationReqsData?.sourceUrl,
    extractUrls(input.applicationReqsData?.value),
  );
  const rpRequirementsSourceUrls = mergeUrlArrays(
    (input as FacultyRecord).rpRequirementsSourceUrls,
    primaryProject?.rpRequirementsSourceUrls,
    input.rpReqsData?.sourceUrl,
    extractUrls(input.rpReqsData?.value),
  );
  const tuitionSourceUrls = mergeUrlArrays(
    (input as FacultyRecord).tuitionSourceUrls,
    primaryProject?.tuitionSourceUrls,
    input.tuitionData?.sourceUrl,
    extractUrls(input.tuitionData?.value),
  );
  const scholarshipSourceUrls = mergeUrlArrays(
    (input as FacultyRecord).scholarshipSourceUrls,
    primaryProject?.scholarshipSourceUrls,
    input.scholarshipData?.sourceUrl,
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
