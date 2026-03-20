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

const SEARCH_KEYWORD_STOPWORDS = new Set([
  'student',
  'profile',
  'summary',
  'background',
  'research',
  'interest',
  'interests',
  'experience',
  'experiences',
  'goal',
  'goals',
  'career',
  'skills',
  'quality',
  'qualities',
  'education',
  'university',
  'college',
  'gpa',
  'advisor',
  'contact',
  'current',
  'provided',
  'manual',
  'note',
  'notes',
  '学生',
  '画像',
  '背景',
  '摘要',
  '兴趣',
  '方向',
  '经历',
  '经验',
  '当前',
  '院校',
  '目标',
  '专业',
  '学校',
  '联系',
  '顾问',
  '申请',
  '入学',
  '年份',
  '截止',
  '时间',
]);

function extractSearchKeywords(...values: Array<string | undefined>): string[] {
  const tokens = values
    .flatMap((value) =>
      String(value || '')
        .split(/[\s,;|/，；、:：()[\]{}<>]+/)
        .map((item) => normalizeText(item))
        .filter(Boolean),
    )
    .filter((token) => token.length > 1)
    .filter((token) => !SEARCH_KEYWORD_STOPWORDS.has(token))
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !/^\d{2,4}(fall|spring|autumn|summer)?$/.test(token))
    .filter((token) => !/^(20\d{2}|19\d{2})[-/.]?(0?[1-9]|1[0-2])?$/.test(token));

  return Array.from(new Set(tokens)).slice(0, 12);
}

function buildSearchKeywords(filters: MatcherSearchFilters): string[] {
  const directKeywords = extractSearchKeywords(
    ...filters.targets.flatMap((target) => [target.department || '', target.major || '']),
    filters.majorA || '',
    filters.majorB || '',
    filters.rpTopic || '',
    filters.manualNotes || '',
  );

  if (directKeywords.length > 0) {
    return directKeywords;
  }

  return extractSearchKeywords(filters.profileSummary || '');
}

function hasHardTargetConstraint(target: MatcherSearchTarget): boolean {
  return Boolean(target.country || target.university || target.school);
}

function getActiveHardTargets(filters: MatcherSearchFilters): MatcherSearchTarget[] {
  return filters.targets.filter((target) => hasHardTargetConstraint(target));
}

function hasStructuredSearchSignal(filters: MatcherSearchFilters): boolean {
  return (
    getActiveHardTargets(filters).length > 0 ||
    buildSearchKeywords(filters).length > 0 ||
    Boolean(filters.officialLinks.length)
  );
}

function includesKeyword(text: string, keyword: string): boolean {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return false;
  return text.includes(normalizedKeyword);
}

function countKeywordMatches(text: string, keywords: string[]): number {
  return keywords.filter((keyword) => includesKeyword(text, keyword)).length;
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

function facultyMatchesHardTarget(faculty: FacultyRecord | FacultyMember, target: MatcherSearchTarget): boolean {
  const corpus = buildFacultyCorpus(faculty);
  const checks: boolean[] = [];
  if (target.country) checks.push(includesKeyword(corpus, target.country));
  if (target.university) checks.push(includesKeyword(corpus, target.university));
  if (target.school) checks.push(includesKeyword(corpus, target.school));
  return checks.length === 0 || checks.every(Boolean);
}

function countHardTargetMatches(faculty: FacultyRecord | FacultyMember, target: MatcherSearchTarget): number {
  const corpus = buildFacultyCorpus(faculty);
  let count = 0;
  if (target.country && includesKeyword(corpus, target.country)) count += 1;
  if (target.university && includesKeyword(corpus, target.university)) count += 1;
  if (target.school && includesKeyword(corpus, target.school)) count += 1;
  return count;
}

function getBestHardTargetMatchCount(
  faculty: FacultyRecord | FacultyMember,
  targets: MatcherSearchTarget[],
): number {
  if (targets.length === 0) return 0;

  return targets.reduce((best, target) => {
    if (!facultyMatchesHardTarget(faculty, target)) return best;
    return Math.max(best, countHardTargetMatches(faculty, target));
  }, 0);
}

function getRequestedResultCount(filters: MatcherSearchFilters): number {
  const requested = filters.targets.reduce((sum, target) => sum + (target.count || 0), 0);
  return Math.max(requested || filters.selectionCount || 5, 1);
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
  const activeTargets = getActiveHardTargets(filters);
  const keywords = buildSearchKeywords(filters);

  let researchFit = 0;
  if (filters.crossDiscipline && filters.majorA && filters.majorB) {
    const matchA = includesKeyword(corpus, filters.majorA);
    const matchB = includesKeyword(corpus, filters.majorB);
    researchFit = matchA && matchB ? 35 : matchA || matchB ? 18 : 0;
    reasons.push(matchA && matchB ? `同时覆盖 ${filters.majorA} 与 ${filters.majorB}` : '交叉学科覆盖仍需人工确认');
  } else if (keywords.length > 0) {
    const matchedCount = countKeywordMatches(corpus, keywords);
    researchFit = Math.min(35, matchedCount * 8);
    if (matchedCount > 0) {
      reasons.push(`研究关键词命中 ${matchedCount} 项`);
    }
  }

  let targetFit = 0;
  if (activeTargets.length > 0) {
    const matchedTarget = activeTargets.find((target) => facultyMatchesHardTarget(faculty, target));
    if (matchedTarget) {
      targetFit = 14 + countHardTargetMatches(faculty, matchedTarget) * 4;
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
    if (filters.scholarshipRequirement && hasScholarship(faculty)) admissionFit += 8;
    if (filters.degreeType && filters.degreeType !== 'unspecified' && detectDegreeMatch(faculty, filters.degreeType)) {
      admissionFit += 6;
    }
    const requirementText = faculty.projects
      .map((project) => `${project.applicationRequirementsRaw || ''} ${project.rpRequirementsRaw || ''}`)
      .join(' ');
    const requirementMatches = countKeywordMatches(normalizeText(requirementText), keywords);
    if (requirementMatches > 0) {
      admissionFit += Math.min(6, requirementMatches * 2);
    }
  } else if (filters.degreeType && filters.degreeType !== 'unspecified' && detectDegreeMatch(faculty, filters.degreeType)) {
    admissionFit = 6;
  }

  let seniorityFit = 0;
  const title = normalizeText(faculty.title);
  if (filters.targetPosition && includesKeyword(title, filters.targetPosition)) {
    seniorityFit += 10;
    reasons.push('导师职级符合要求');
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
  const hasSignal = hasStructuredSearchSignal(filters);
  const keywords = buildSearchKeywords(filters);
  const activeTargets = getActiveHardTargets(filters);
  const requestedCount = getRequestedResultCount(filters);
  const hasLinkSignal = filters.officialLinks.length > 0;

  if (!hasSignal) {
    return [];
  }

  return facultyDatabase
    .filter((record) => !recordContainsExcludedText(record, exclusions))
    .filter((record) => detectDegreeMatch(record, filters.degreeType))
    .map((record) => {
      const evaluation = evaluateMentorAgainstFilters(record, filters);
      const keywordMatches = countKeywordMatches(buildFacultyCorpus(record), keywords);
      const targetMatchCount = getBestHardTargetMatchCount(record, activeTargets);
      return {
        ...record,
        matchScore: evaluation.score,
        alignmentDetails: evaluation.summary,
        evaluation,
        matchSource: 'local' as MatchSource,
        keywordMatches,
        targetMatchCount,
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
    .filter((record) => {
      const evaluation = record.evaluation;
      if (!evaluation) return false;
      if (activeTargets.length > 0 && record.targetMatchCount <= 0) return false;
      if (keywords.length > 0 && record.keywordMatches <= 0) return false;
      if (hasLinkSignal && evaluation.sourceBreakdown.targetFit <= 0) return false;
      return true;
    })
    .sort((left, right) => {
      if (right.keywordMatches !== left.keywordMatches) return right.keywordMatches - left.keywordMatches;
      if (right.targetMatchCount !== left.targetMatchCount) return right.targetMatchCount - left.targetMatchCount;
      return right.matchScore - left.matchScore;
    })
    .slice(0, requestedCount)
    .map(({ keywordMatches: _keywordMatches, targetMatchCount: _targetMatchCount, ...record }) => record);
}

export function mergeLocalAndWebMatches(
  localMatches: FacultyRecord[],
  webMatches: FacultyMember[],
  filters: MatcherSearchFilters,
): { local: FacultyRecord[]; web: FacultyMember[] } {
  const localMap = new Map(localMatches.map((record) => [normalizeFacultyIdentity(record.name, record.university), record]));
  const mergedWeb: Array<FacultyMember & { keywordMatches: number; targetMatchCount: number }> = [];
  const activeTargets = getActiveHardTargets(filters);
  const keywords = buildSearchKeywords(filters);
  const hasLinkSignal = filters.officialLinks.length > 0;
  const remainingCount = Math.max(getRequestedResultCount(filters) - localMatches.length, 0);

  webMatches.forEach((faculty) => {
    const evaluation = evaluateMentorAgainstFilters(faculty, filters);
    const duplicateLocal = localMap.get(normalizeFacultyIdentity(faculty.name, faculty.university));
    const keywordMatches = countKeywordMatches(buildFacultyCorpus(faculty), keywords);
    const targetMatchCount = getBestHardTargetMatchCount(faculty, activeTargets);

    if (activeTargets.length > 0 && targetMatchCount <= 0) {
      return;
    }

    if (keywords.length > 0 && keywordMatches <= 0) {
      return;
    }

    if (hasLinkSignal && evaluation.sourceBreakdown.targetFit <= 0) {
      return;
    }

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
      keywordMatches,
      targetMatchCount,
      evidenceUrls: Array.from(new Set([...(faculty.evidenceUrls || []), faculty.profileUrl || '', faculty.universityUrl || ''].filter(Boolean))),
    });
  });

  return {
    local: localMatches,
    web: mergedWeb
      .sort((left, right) => {
        if (right.keywordMatches !== left.keywordMatches) return right.keywordMatches - left.keywordMatches;
        if (right.targetMatchCount !== left.targetMatchCount) return right.targetMatchCount - left.targetMatchCount;
        return right.matchScore - left.matchScore;
      })
      .slice(0, remainingCount)
      .map(({ keywordMatches: _keywordMatches, targetMatchCount: _targetMatchCount, ...faculty }) => faculty),
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
