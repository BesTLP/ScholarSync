import {
  Client,
  FacultyMember,
  FacultyProject,
  FacultyRecord,
  MatcherSearchFilters,
  MatcherSearchTarget,
  MentorEvaluationSnapshot,
  MatchSource,
  SourceMode,
} from '../types';
import { buildMatcherFiltersFromClient, splitMultiValue } from './selectionProfile';

function normalizeText(value?: string | null): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function includesKeyword(text: string, keyword: string): boolean {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return false;
  return text.includes(normalizedKeyword);
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function hasScholarship(record: FacultyRecord | FacultyMember): boolean {
  const scholarshipText =
    'projects' in record ? record.projects.map((project) => project.scholarshipRaw).join(' ') : record.scholarshipData?.value || '';
  return Boolean(normalizeText(scholarshipText));
}

function detectDegreeMatch(record: FacultyRecord | FacultyMember, degreeType?: string): boolean {
  if (!degreeType || degreeType === 'unspecified') return true;

  const text =
    'projects' in record
      ? record.projects.map((project) => `${project.programName} ${project.programNameEn || ''} ${project.programNameZh || ''}`).join(' ')
      : [record.department, record.alignmentDetails].filter(Boolean).join(' ');

  const normalized = normalizeText(text);
  if (!normalized) return true;

  if (degreeType === 'phd') {
    return normalized.includes('phd') || normalized.includes('doctor') || normalized.includes('博士');
  }

  return normalized.includes('master') || normalized.includes('msc') || normalized.includes('ma ') || normalized.includes('硕士');
}

function buildFacultyCorpus(record: FacultyRecord | FacultyMember): string {
  const projectText =
    'projects' in record
      ? record.projects
          .map((project) =>
            [
              project.programName,
              project.programNameEn,
              project.programNameZh,
              project.applicationRequirementsRaw,
              project.rpRequirementsRaw,
              project.scholarshipRaw,
              project.recommendationReason,
            ]
              .filter(Boolean)
              .join(' '),
          )
          .join(' ')
      : '';

  return normalizeText(
    [
      record.name,
      record.university,
      record.school,
      record.department,
      record.title,
      'country' in record ? record.country : '',
      'provinceState' in record ? record.provinceState : '',
      'city' in record ? record.city : '',
      'fieldCategory' in record ? record.fieldCategory : '',
      'subFieldCategory' in record ? record.subFieldCategory : '',
      record.researchAreas?.join(' '),
      record.recentActivities?.join(' '),
      record.alignmentDetails,
      projectText,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

function targetMatchesRecord(record: FacultyRecord, target: MatcherSearchTarget): boolean {
  const corpus = buildFacultyCorpus(record);
  const checks: boolean[] = [];
  if (target.country) checks.push(includesKeyword(corpus, target.country));
  if (target.university) checks.push(includesKeyword(corpus, target.university));
  if (target.school) checks.push(includesKeyword(corpus, target.school));
  if (target.department) checks.push(includesKeyword(corpus, target.department));
  if (target.major) checks.push(includesKeyword(corpus, target.major));
  return checks.length === 0 || checks.every(Boolean);
}

function officialLinkBonus(faculty: FacultyRecord | FacultyMember, filters: MatcherSearchFilters): number {
  if (!filters.officialLinks || filters.officialLinks.length === 0) return 0;
  const corpus = buildFacultyCorpus(faculty);
  const keywords = splitMultiValue(
    filters.officialLinks.flatMap((link) => {
      try {
        const url = new URL(link);
        return [url.hostname.replace(/^www\./, ''), ...url.pathname.split('/').filter(Boolean)];
      } catch {
        return [link];
      }
    }),
  )
    .map((item) => item.replace(/[-_]/g, ' '))
    .filter((item) => item.length > 2);

  return keywords.some((keyword) => includesKeyword(corpus, keyword)) ? 8 : 0;
}

function buildBand(score: number): MentorEvaluationSnapshot['band'] {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

export function normalizeFacultyIdentity(name?: string, university?: string): string {
  return `${normalizeText(name)}::${normalizeText(university)}`;
}

export function evaluateMentorAgainstFilters(
  faculty: FacultyRecord | FacultyMember,
  filters: MatcherSearchFilters,
): MentorEvaluationSnapshot {
  const corpus = buildFacultyCorpus(faculty);
  const reasons: string[] = [];

  const keywords = splitMultiValue([
    ...filters.targets.flatMap((target) => [target.department || '', target.major || '']),
    filters.majorA || '',
    filters.majorB || '',
    filters.profileSummary || '',
    filters.manualNotes || '',
  ])
    .filter((item) => item.length > 1)
    .slice(0, 12);

  let researchFit = 0;
  if (filters.crossDiscipline && filters.majorA && filters.majorB) {
    const matchA = includesKeyword(corpus, filters.majorA);
    const matchB = includesKeyword(corpus, filters.majorB);
    researchFit = matchA && matchB ? 35 : matchA || matchB ? 18 : 0;
    reasons.push(matchA && matchB ? `同时覆盖 ${filters.majorA} 与 ${filters.majorB}` : '交叉学科覆盖仍需人工确认');
  } else if (keywords.length > 0) {
    const matchedCount = keywords.filter((keyword) => includesKeyword(corpus, keyword)).length;
    researchFit = Math.min(35, matchedCount * 8);
    if (matchedCount > 0) {
      reasons.push(`研究关键词命中 ${matchedCount} 项`);
    }
  }

  let targetFit = 0;
  const activeTargets = filters.targets.filter((target) =>
    [target.country, target.university, target.school, target.department, target.major].some(Boolean),
  );
  if (activeTargets.length === 0) {
    targetFit = 20;
  } else {
    const matchedTarget = activeTargets.find((target) =>
      'id' in faculty
        ? targetMatchesRecord(faculty as FacultyRecord, target)
        : [target.country, target.university, target.school, target.department, target.major]
            .filter(Boolean)
            .every((value) => includesKeyword(corpus, String(value))),
    );
    if (matchedTarget) {
      targetFit = 25;
      reasons.push('命中目标国家 / 学校 / 学院约束');
    }
  }

  const linkBonus = officialLinkBonus(faculty, filters);
  if (linkBonus > 0) {
    targetFit += linkBonus;
    reasons.push('与指定院校链接高度相关');
  }

  let admissionFit = 0;
  if ('projects' in faculty) {
    if (!filters.scholarshipRequirement || hasScholarship(faculty)) admissionFit += 8;
    if (detectDegreeMatch(faculty, filters.degreeType)) admissionFit += 6;
    const requirementText = faculty.projects
      .map((project) => `${project.applicationRequirementsRaw || ''} ${project.rpRequirementsRaw || ''}`)
      .join(' ');
    if (filters.profileSummary && includesKeyword(normalizeText(requirementText), normalizeText(filters.profileSummary).slice(0, 30))) {
      admissionFit += 6;
    }
  } else {
    admissionFit = detectDegreeMatch(faculty, filters.degreeType) ? 10 : 0;
  }

  let seniorityFit = 0;
  const title = normalizeText(faculty.title);
  if (!filters.targetPosition) {
    seniorityFit += 6;
  } else if (includesKeyword(title, filters.targetPosition)) {
    seniorityFit += 10;
    reasons.push('导师职级符合要求');
  } else if (includesKeyword(title, 'professor') || includesKeyword(title, '教授')) {
    seniorityFit += 6;
  }
  if (faculty.isActive) seniorityFit += 2;
  if ((faculty.recentActivities || []).length > 0) seniorityFit += 2;

  let dataQuality = 0;
  if (faculty.email) dataQuality += 2;
  if (faculty.profileUrl) dataQuality += 2;
  if (faculty.universityUrl) dataQuality += 1;
  if (faculty.qsRanking || faculty.qsRankingData?.value) dataQuality += 1;
  if ('projects' in faculty && faculty.projects.length > 0) dataQuality += 2;
  if ('projects' in faculty && faculty.projects.some((project) => project.applicationRequirementsRaw || project.deadlineRaw)) dataQuality += 2;

  if (filters.scholarshipRequirement && hasScholarship(faculty)) {
    reasons.push('包含奖学金信息');
  }
  if ('projects' in faculty && faculty.projects.some((project) => project.deadlineRaw)) {
    reasons.push('包含总表中的申请要求或截止日期');
  }

  const score = clampScore(researchFit + targetFit + admissionFit + seniorityFit + dataQuality);
  return {
    score,
    band: buildBand(score),
    summary: reasons.length > 0 ? reasons.slice(0, 3).join('；') : '基础条件匹配，建议人工复核后再推荐',
    reasons: reasons.length > 0 ? reasons : ['基础条件匹配，建议人工复核后再推荐'],
    updatedAt: new Date().toISOString(),
    sourceBreakdown: {
      researchFit,
      targetFit,
      admissionFit,
      seniorityFit,
      dataQuality,
    },
  };
}

function recordContainsExcludedText(record: FacultyRecord, exclusions: string[]): boolean {
  if (exclusions.length === 0) return false;
  const corpus = buildFacultyCorpus(record);
  return exclusions.some((item) => includesKeyword(corpus, item));
}

export function getLocalFacultyMatches(facultyDatabase: FacultyRecord[], filters: MatcherSearchFilters): FacultyRecord[] {
  const exclusions = splitMultiValue(filters.exclusions);

  return facultyDatabase
    .filter((record) => !recordContainsExcludedText(record, exclusions))
    .filter((record) => detectDegreeMatch(record, filters.degreeType))
    .filter((record) => {
      const targets = filters.targets.filter((target) =>
        [target.country, target.university, target.school, target.department, target.major].some(Boolean),
      );
      return targets.length === 0 || targets.some((target) => targetMatchesRecord(record, target));
    })
    .map((record) => {
      const evaluation = evaluateMentorAgainstFilters(record, filters);
      return {
        ...record,
        matchScore: evaluation.score,
        alignmentDetails: evaluation.summary,
        evaluation,
        matchSource: 'local' as MatchSource,
        evidenceUrls: Array.from(
          new Set(
            [
              record.profileUrl,
              record.universityUrl,
              ...record.projects.flatMap((project) => [
                project.programUrl,
                ...(project.deadlineSourceUrls || []),
                ...(project.applicationRequirementsSourceUrls || []),
                ...(project.rpRequirementsSourceUrls || []),
                ...(project.tuitionSourceUrls || []),
                ...(project.scholarshipSourceUrls || []),
              ]),
            ].filter(Boolean) as string[],
          ),
        ),
      };
    })
    .sort((left, right) => right.matchScore - left.matchScore);
}

export function mergeLocalAndWebMatches(
  localMatches: FacultyRecord[],
  webMatches: FacultyMember[],
  filters: MatcherSearchFilters,
): { local: FacultyRecord[]; web: FacultyMember[] } {
  const localMap = new Map(localMatches.map((record) => [normalizeFacultyIdentity(record.name, record.university), record]));
  const mergedWeb: FacultyMember[] = [];

  webMatches.forEach((faculty) => {
    const evaluation = evaluateMentorAgainstFilters(faculty, filters);
    const duplicateLocal = localMap.get(normalizeFacultyIdentity(faculty.name, faculty.university));

    if (duplicateLocal) {
      duplicateLocal.matchSource = 'merged';
      duplicateLocal.evidenceUrls = Array.from(new Set([...(duplicateLocal.evidenceUrls || []), ...(faculty.evidenceUrls || []), faculty.profileUrl || '', faculty.universityUrl || ''].filter(Boolean)));
      duplicateLocal.alignmentDetails = `${duplicateLocal.alignmentDetails}；联网补充：${evaluation.summary}`;
      return;
    }

    mergedWeb.push({
      ...faculty,
      matchScore: evaluation.score,
      alignmentDetails: evaluation.summary,
      evaluation,
      matchSource: 'web',
      evidenceUrls: Array.from(new Set([...(faculty.evidenceUrls || []), faculty.profileUrl || '', faculty.universityUrl || ''].filter(Boolean))),
    });
  });

  return {
    local: localMatches,
    web: mergedWeb.sort((left, right) => right.matchScore - left.matchScore),
  };
}

export function buildEvaluationForClient(
  client: Client,
  faculty: FacultyRecord | FacultyMember,
  filters?: MatcherSearchFilters,
): MentorEvaluationSnapshot {
  return evaluateMentorAgainstFilters(faculty, filters || buildMatcherFiltersFromClient(client));
}

export function getRecommendationSourceModes(sourceModes?: SourceMode[]): SourceMode[] {
  const unique = Array.from(new Set(sourceModes?.length ? sourceModes : ['local']));
  return unique as SourceMode[];
}

export function projectMatchesKeyword(project: FacultyProject, keyword: string): boolean {
  const corpus = normalizeText(
    [
      project.programName,
      project.programNameZh,
      project.programNameEn,
      project.applicationRequirementsRaw,
      project.scholarshipRaw,
      project.recommendationReason,
    ]
      .filter(Boolean)
      .join(' '),
  );
  return includesKeyword(corpus, keyword);
}

export function filterFacultyDatabaseByPanelFilters(
  records: FacultyRecord[],
  filters: {
    country?: string;
    university?: string;
    school?: string;
    department?: string;
    keyword?: string;
    projectKeyword?: string;
    hasScholarship?: boolean;
    degreeType?: string;
  },
): FacultyRecord[] {
  return records.filter((record) => {
    if (filters.country && !includesKeyword(normalizeText(record.country), filters.country)) return false;
    if (filters.university && !includesKeyword(normalizeText(`${record.university} ${record.universityEnglish || ''}`), filters.university)) return false;
    if (filters.school && !includesKeyword(normalizeText(record.school), filters.school)) return false;
    if (filters.department && !includesKeyword(normalizeText(`${record.department || ''} ${record.fieldCategory} ${record.subFieldCategory || ''}`), filters.department)) return false;
    if (filters.keyword && !includesKeyword(buildFacultyCorpus(record), filters.keyword)) return false;
    if (filters.projectKeyword && !record.projects.some((project) => projectMatchesKeyword(project, filters.projectKeyword || ''))) return false;
    if (filters.hasScholarship && !hasScholarship(record)) return false;
    if (filters.degreeType && !detectDegreeMatch(record, filters.degreeType)) return false;
    return true;
  });
}
