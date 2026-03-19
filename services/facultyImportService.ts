import * as XLSX from 'xlsx';
import { FacultyImportRowResult, FacultyImportSummary, FacultyMember, FacultyProject, FacultyRecord } from '../types';
import { buildFacultyRecordFromMember, createEmptyMatchReasoning, normalizeKey } from './facultyNormalization';

const HEADER_ALIASES: Record<string, string[]> = {
  schoolName: ['学校名称（中英文）', '学校名称', '院校名称'],
  schoolNameEnglish: ['院校（英文）', '院校(英文)', '学校名称（英文）', '学校名称(英文)', '院校英文'],
  qsRanking: ['2026QS综合排名', 'QS综合排名', 'qs排名'],
  country: ['国家/地区', '国家地区', '国家'],
  subRegion: ['二级地区 (如: 北京)', '二级地区', '州/省', '地区'],
  regionPath: ['地区路径 (用 > 分隔)', '地区路径'],
  schoolDepartment: ['学院/系', '院系', '学院系'],
  fieldCategory: ['一级学科'],
  subFieldCategory: ['二级分类', '二级学科'],
  classificationPath: ['分类路径 (用 > 分隔)', '分类路径'],
  classificationNote: ['分类备注'],
  customTags: ['自定义标签 (逗号分隔)', '自定义标签'],
  deadline: ['申请截止日期', '截止日期', 'deadline'],
  deadlineSourceUrl: ['截止日期来源URL', '申请截止日期来源URL'],
  programName: ['专业名称（中英文）', '专业名称', '项目名称'],
  programNameZh: ['申请专业（中文）', '申请专业(中文)', '专业名称（中文）', '专业名称(中文)'],
  programNameEn: ['申请专业（英文）', '申请专业(英文)', '专业名称（英文）', '专业名称(英文)'],
  programUrl: ['专业链接', '项目链接', '项目网址'],
  applicationRequirements: ['申请要求及材料', '申请要求'],
  applicationRequirementsSourceUrl: ['申请要求来源URL', '申请要求及材料来源URL'],
  rpRequirements: ['RP字数要求', '研究计划要求', 'research proposal'],
  rpRequirementsSourceUrl: ['RP要求来源URL', 'RP字数要求来源URL', '研究计划要求来源URL'],
  mentorInfo: ['导师研究方向（论文）', '导师研究方向', '导师信息'],
  recommendation: ['推荐理由', '推荐原因'],
  email: ['导师邮箱', '邮箱'],
  profileUrl: ['导师官网链接', '导师主页链接', '导师官网'],
  universityUrl: ['院校官网链接', '学校官网链接', '大学官网链接'],
  tuition: ['学费'],
  tuitionSourceUrl: ['学费来源URL'],
  scholarship: ['奖学金项目', '奖学金'],
  scholarshipSourceUrl: ['奖学金来源URL'],
};

function cleanCell(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function normalizeHeader(value: string): string {
  return cleanCell(value)
    .toLowerCase()
    .replace(/[\s（）()\-_/]+/g, '');
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function resolveHeaderMap(headerRow: string[]): Record<string, number> {
  const normalizedHeaders = headerRow.map((header) => normalizeHeader(header));
  const headerMap: Record<string, number> = {};

  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    const index = normalizedHeaders.findIndex((header) =>
      aliases.some((alias) => header.includes(normalizeHeader(alias)))
    );
    if (index >= 0) {
      headerMap[key] = index;
    }
  }

  return headerMap;
}

function isHeaderLikeRow(values: string[]): boolean {
  const joined = normalizeHeader(values.join(' '));
  return joined.includes(normalizeHeader('学校名称（中英文）'))
    && joined.includes(normalizeHeader('专业名称（中英文）'))
    && joined.includes(normalizeHeader('导师研究方向（论文）'));
}

function rowToObject(headerRow: string[], row: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  headerRow.forEach((header, index) => {
    obj[cleanCell(header) || `column_${index + 1}`] = cleanCell(row[index]);
  });
  return obj;
}

function splitTextList(value: string): string[] {
  return value
    .split(/[\n;,；，、]+/)
    .map((item) => cleanCell(item))
    .filter(Boolean);
}

function extractEmail(raw: string): { email: string; remainder: string } {
  const matches = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const email = matches[0] ?? '';
  let remainder = raw;
  if (email) {
    remainder = remainder.replace(email, '').trim();
  }
  return { email, remainder };
}

function extractFirstUrl(raw: string): string {
  return raw.match(/https?:\/\/[^\s]+/i)?.[0] ?? '';
}

function extractUrls(raw: string): string[] {
  return Array.from(new Set(cleanCell(raw).match(/https?:\/\/[^\s)]+/gi) ?? []));
}

function stripUrls(raw: string): string {
  return cleanCell(raw).replace(/https?:\/\/[^\s)]+/gi, '').replace(/\s{2,}/g, ' ').trim();
}

function mergeUrls(...values: Array<string[] | string | undefined>): string[] {
  const urls = new Set<string>();
  values.forEach((value) => {
    if (!value) return;
    const items = Array.isArray(value) ? value : [value];
    items.forEach((item) => {
      extractUrls(item).forEach((url) => urls.add(url));
      const cleaned = cleanCell(item);
      if (/^https?:\/\//i.test(cleaned)) {
        urls.add(cleaned);
      }
    });
  });
  return Array.from(urls);
}

function splitProgramNames(raw: string): { zh: string; en: string } {
  const text = cleanCell(raw);
  const lines = text.split(/\n+/).map((line) => cleanCell(line)).filter(Boolean);
  let zh = '';
  let en = '';

  lines.forEach((line) => {
    if (!zh && /[\u4e00-\u9fff]/.test(line)) {
      zh = line;
      return;
    }
    if (!en && /^[\x00-\x7F\s,.'’&()/-]+$/.test(line)) {
      en = line;
    }
  });

  if (!zh && lines.length > 0) zh = lines[0];
  if (!en && lines.length > 1) en = lines[1];
  return { zh, en };
}

function splitTags(raw: string): string[] {
  return cleanCell(raw)
    .split(/[\n,;，；、]+/)
    .map((value) => cleanCell(value))
    .filter(Boolean);
}

function parseMentorInfo(raw: string): {
  name: string;
  title: string;
  researchAreas: string[];
  activitySummary: string;
  recentActivities: string[];
  mentorTextRaw: string;
} {
  const text = cleanCell(raw);
  const name = text.match(/导师姓名[:：]\s*([^\n]+)/)?.[1]?.trim() ?? '';
  const title = text.match(/职称[:：]\s*([^\n]+)/)?.[1]?.trim() ?? '';

  const focusBlock = text.match(/(?:建议学生主要关注该导师|主要关注该导师)[:：]\s*([\s\S]*?)(?:\n\s*\n|文章[:：]|论文[:：]|$)/)?.[1] ?? '';
  const researchAreas = splitTextList(focusBlock);

  const paperBlock = text.match(/(?:文章|论文)[:：]\s*([\s\S]*)$/)?.[1] ?? '';
  const recentActivities = paperBlock
    .split(/\n\s*\n/)
    .map((item) => cleanCell(item))
    .filter(Boolean);

  const activitySummary = recentActivities.length > 0
    ? `导入自 Excel，识别到 ${recentActivities.length} 条论文/成果信息。`
    : researchAreas.length > 0
      ? `导入自 Excel，识别到 ${researchAreas.length} 条研究方向描述。`
      : '导入自 Excel。';

  return {
    name,
    title,
    researchAreas,
    activitySummary,
    recentActivities,
    mentorTextRaw: text,
  };
}

function compactQs(raw: string): string {
  const match = cleanCell(raw).match(/\d+/);
  return match?.[0] ?? cleanCell(raw);
}

export async function importFacultyFromXlsx(file: File): Promise<{
  records: FacultyRecord[];
  rowResults: FacultyImportRowResult[];
  summary: FacultyImportSummary;
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  }) as string[][];

  const headerRowIndex = rows.findIndex((row) => isHeaderLikeRow(row.map(cleanCell)));
  if (headerRowIndex === -1) {
    throw new Error('未识别到支持的 Excel 表头。');
  }

  const headerRow = rows[headerRowIndex].map(cleanCell);
  const headerMap = resolveHeaderMap(headerRow);
  const requiredColumns = ['schoolName', 'programName', 'mentorInfo'];
  const missingColumns = requiredColumns.filter((column) => headerMap[column] === undefined);
  if (missingColumns.length > 0) {
    throw new Error(`缺少必要列: ${missingColumns.join(', ')}`);
  }

  const records: FacultyRecord[] = [];
  const rowResults: FacultyImportRowResult[] = [];
  const carryContext: Record<string, string> = {};
  let processedRows = 0;
  let parsedRows = 0;
  let skippedRows = 0;
  let failedRows = 0;

  for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index].map(cleanCell);
    if (row.every((cell) => !cell)) {
      continue;
    }

    if (isHeaderLikeRow(row)) {
      skippedRows += 1;
      rowResults.push({
        rowIndex: index + 1,
        status: 'skipped',
        message: '跳过重复表头',
        rawRow: rowToObject(headerRow, row),
      });
      continue;
    }

    processedRows += 1;
    const rawRow = rowToObject(headerRow, row);

    const getCell = (key: string) => row[headerMap[key]] ?? '';
    const schoolName = getCell('schoolName') || carryContext.schoolName || '';
    const schoolNameEnglish = getCell('schoolNameEnglish') || carryContext.schoolNameEnglish || '';
    const qsRanking = getCell('qsRanking') || carryContext.qsRanking || '';
    const country = getCell('country') || carryContext.country || '';
    const subRegion = getCell('subRegion') || carryContext.subRegion || '';
    const regionPathRaw = getCell('regionPath') || carryContext.regionPath || '';
    const schoolDepartment = getCell('schoolDepartment') || carryContext.schoolDepartment || '';
    const fieldCategory = getCell('fieldCategory') || carryContext.fieldCategory || '';
    const subFieldCategory = getCell('subFieldCategory') || carryContext.subFieldCategory || '';
    const classificationPathRaw = getCell('classificationPath') || carryContext.classificationPath || '';
    const universityUrl = getCell('universityUrl') || carryContext.universityUrl || '';
    if (schoolName) carryContext.schoolName = schoolName;
    if (schoolNameEnglish) carryContext.schoolNameEnglish = schoolNameEnglish;
    if (qsRanking) carryContext.qsRanking = qsRanking;
    if (country) carryContext.country = country;
    if (subRegion) carryContext.subRegion = subRegion;
    if (regionPathRaw) carryContext.regionPath = regionPathRaw;
    if (schoolDepartment) carryContext.schoolDepartment = schoolDepartment;
    if (fieldCategory) carryContext.fieldCategory = fieldCategory;
    if (subFieldCategory) carryContext.subFieldCategory = subFieldCategory;
    if (classificationPathRaw) carryContext.classificationPath = classificationPathRaw;
    if (universityUrl) carryContext.universityUrl = universityUrl;

    const programName = getCell('programName');
    const { zh: splitProgramNameZh, en: splitProgramNameEn } = splitProgramNames(programName);
    const programNameZh = getCell('programNameZh') || splitProgramNameZh;
    const programNameEn = getCell('programNameEn') || splitProgramNameEn;
    const mentorInfo = getCell('mentorInfo');
    const recommendation = getCell('recommendation');
    const emailCellRaw = getCell('email');
    const profileUrlCell = getCell('profileUrl');
    const classificationNote = getCell('classificationNote');
    const customTags = splitTags(getCell('customTags'));

    if (!schoolName || !programName || !mentorInfo) {
      failedRows += 1;
      rowResults.push({
        rowIndex: index + 1,
        status: 'failed',
        message: '缺少学校、项目或导师信息，无法导入',
        rawRow,
      });
      continue;
    }

    const parsedMentor = parseMentorInfo(mentorInfo);
    if (!parsedMentor.name) {
      failedRows += 1;
      rowResults.push({
        rowIndex: index + 1,
        status: 'failed',
        message: '未从导师信息中识别到导师姓名',
        rawRow,
      });
      continue;
    }

    const { email, remainder } = extractEmail(emailCellRaw);
    const profileUrl = profileUrlCell || extractFirstUrl(remainder);
    const deadlineSourceUrls = mergeUrls(getCell('deadlineSourceUrl'), getCell('deadline'));
    const applicationRequirementsSourceUrls = mergeUrls(
      getCell('applicationRequirementsSourceUrl'),
      getCell('applicationRequirements'),
    );
    const rpRequirementsSourceUrls = mergeUrls(getCell('rpRequirementsSourceUrl'), getCell('rpRequirements'));
    const tuitionSourceUrls = mergeUrls(getCell('tuitionSourceUrl'), getCell('tuition'));
    const scholarshipSourceUrls = mergeUrls(getCell('scholarshipSourceUrl'), getCell('scholarship'));

    const project: FacultyProject = {
      id: createId('project'),
      programName,
      programNameZh,
      programNameEn,
      programUrl: getCell('programUrl'),
      deadlineRaw: stripUrls(getCell('deadline')),
      deadlineSourceUrls,
      applicationRequirementsRaw: stripUrls(getCell('applicationRequirements')),
      applicationRequirementsSourceUrls,
      rpRequirementsRaw: stripUrls(getCell('rpRequirements')),
      rpRequirementsSourceUrls,
      tuitionRaw: stripUrls(getCell('tuition')),
      tuitionSourceUrls,
      scholarshipRaw: stripUrls(getCell('scholarship')),
      scholarshipSourceUrls,
      recommendationReason: recommendation,
      sourceWorkbook: file.name,
      sourceSheet: sheetName,
      sourceRowIndex: index + 1,
      rawRow,
      mentorTextRaw: parsedMentor.mentorTextRaw,
      emailCellRaw,
    };

    const faculty: FacultyMember = {
      name: parsedMentor.name,
      title: parsedMentor.title || '未知职称',
      university: schoolName,
      department: '',
      matchScore: 0,
      researchAreas: parsedMentor.researchAreas,
      alignmentDetails: recommendation || parsedMentor.researchAreas.join('；'),
      activitySummary: parsedMentor.activitySummary,
      recentActivities: parsedMentor.recentActivities,
      isActive: true,
      profileUrl,
      photoUrl: '',
      email,
      qsRanking: compactQs(qsRanking),
      programUrl: project.programUrl,
      universityUrl,
      matchReasoning: {
        ...createEmptyMatchReasoning(),
        locationCheck: [country, subRegion, regionPathRaw, file.name].filter(Boolean).join(' | '),
        universityCheck: schoolName,
        departmentCheck: schoolDepartment,
      },
    };

    const record = buildFacultyRecordFromMember(faculty, {
      manualCountry: country || undefined,
      manualField: fieldCategory || programNameZh || programNameEn || programName,
      extra: {
        source: 'import',
        country,
        subRegion,
        regionPath: regionPathRaw.split(/\s*>\s*/).map((value) => cleanCell(value)).filter(Boolean),
        school: schoolDepartment,
        department: schoolDepartment,
        universityEnglish: schoolNameEnglish,
        programNameZh,
        programNameEn,
        deadlineSourceUrls,
        applicationRequirementsSourceUrls,
        rpRequirementsSourceUrls,
        tuitionSourceUrls,
        scholarshipSourceUrls,
        fieldCategory,
        subFieldCategory,
        classificationPath: classificationPathRaw.split(/\s*>\s*/).map((value) => cleanCell(value)).filter(Boolean),
        classificationNote,
        customTags,
        universityUrl,
        projects: [project],
        notes: recommendation,
        raw: {
          sourceWorkbook: file.name,
          sourceSheet: sheetName,
          importedRows: [rawRow],
        },
      },
    });

    records.push(record);
    parsedRows += 1;
    rowResults.push({
      rowIndex: index + 1,
      status: 'parsed',
      message: '解析成功',
      rawRow,
      facultyKey: `${normalizeKey(record.name)}::${normalizeKey(record.university)}`,
    });
  }

  const summary: FacultyImportSummary = {
    workbookName: file.name,
    sheetName,
    totalRows: rows.length - (headerRowIndex + 1),
    processedRows,
    parsedRows,
    skippedRows,
    failedRows,
    createdFacultyCount: 0,
    mergedFacultyCount: 0,
    appendedProjectCount: 0,
    messages: [],
  };

  return { records, rowResults, summary };
}
