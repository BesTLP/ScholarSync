
export interface MatchReasoning {
  locationCheck: string;      // Country/Region verification
  universityCheck: string;    // Institution verification
  departmentCheck: string;    // Department verification
  researchFit: string;        // Academic background alignment
  positionCheck: string;      // Title/Position verification
  activityCheck: string;      // Recent activity evaluation
  reputationCheck: string;    // Overall standing/quality assessment
}

export interface SourceData {
    value: string;
    sourceUrl: string;
}

export interface FacultyMember {
  name: string;
  title: string;
  university: string;         // 学校名称 (中)
  universityEn?: string;       // 学校名称 (英)
  department?: string;        // 院系
  programName?: string;       // 专业名称 (中)
  programNameEn?: string;     // 专业名称 (英)
  matchScore?: number;
  researchAreas: string[];    // 导师研究方向
  alignmentDetails?: string;
  activitySummary?: string;    
  recentActivities?: string[]; // 导师研究方向 (论文/项目)
  isActive?: boolean;
  profileUrl?: string;        // 导师官网链接
  photoUrl?: string;          
  email?: string;             // 导师邮箱
  
  // Admission & Data Fields with Source
  qsRanking?: string;         // 2026QS综合排名
  qsRankingData?: SourceData;
  deadlineData?: SourceData;  // 申请截止日期
  applicationReqsData?: SourceData; // 申请要求及材料
  rpReqsData?: SourceData;    // RP字数要求
  tuitionData?: SourceData;   // 学费
  scholarshipData?: SourceData; // 奖学金项目
  
  programUrl?: string;        // 专业链接
  universityUrl?: string;     // 学校官网
  
  recommendationReason?: string; // 推荐理由
  isFromDatabase?: boolean;    // 是否来自本地导师库

  matchReasoning?: MatchReasoning;
}

export interface FacultyProject {
  id: string;
  programName: string;
  programNameZh?: string;
  programNameEn?: string;
  programUrl?: string;
  deadlineRaw?: string;
  deadline?: string; // Short name for UI
  deadlineSourceUrls?: string[];
  applicationRequirementsRaw?: string;
  applicationReqs?: string; // Short name for UI
  applicationRequirementsSourceUrls?: string[];
  rpRequirementsRaw?: string;
  rpReqs?: string; // Short name for UI
  rpRequirementsSourceUrls?: string[];
  tuitionRaw?: string;
  tuition?: string; // Short name for UI
  tuitionSourceUrls?: string[];
  scholarshipRaw?: string;
  scholarship?: string; // Short name for UI
  scholarshipSourceUrls?: string[];
  recommendationReason?: string;
  sourceWorkbook?: string;
  sourceSheet?: string;
  sourceRowIndex?: number;
  rawRow?: Record<string, string>;
  mentorTextRaw?: string;
  emailCellRaw?: string;
  addedAt?: string;
}

export interface FacultyRecord {
  // ===== 导师基础信息 (主记录) =====
  id: string;                    // 唯一ID
  name: string;                  // 姓名
  normalizedName?: string;       // 规范化姓名 (用于查重)
  title: string;                 // 职称
  university: string;            // 学校 (中)
  normalizedUniversity?: string; // 规范化学校 (用于查重)
  universityEnglish?: string;    // 学校 (英)
  universityEn?: string;         // 学校 (英) - Compatibility
  qsRanking?: string;             // QS 排名
  qsRankingData?: SourceData;
  email?: string;                 // 邮箱
  profileUrl?: string;            // 个人主页
  photoUrl?: string;             // 照片
  researchAreas: string[];       // 研究方向标签
  rawResearchText?: string;      // 原始研究方向/论文文本
  
  // ===== 地理层级 (规范化) =====
  country: string;               // 国家
  provinceState?: string;        // 省/州
  city?: string;                 // 城市
  subRegion?: string;            // 二级地区 (兼容)
  regionPath?: string[];         // 地区路径 ["中国", "北京", "海淀"]

  // ===== 组织层级 (规范化) =====
  school?: string;               // 学院
  department?: string;            // 系

  // ===== 关联项目列表 (子记录) =====
  projects: FacultyProject[];

  // ===== 管理字段 =====
  fieldCategory: string;         // 主专业分类
  subFieldCategory?: string;     // 子专业分类
  classificationPath?: string[]; // 分类路径
  classificationSource?: 'auto' | 'manual' | 'hybrid' | 'import' | 'search';
  classificationNote?: string;
  customTags?: string[];
  addedAt: string;
  updatedAt: string;
  source: 'search' | 'manual' | 'import';
  notes?: string;
  linkedClientIds?: string[];
  localMatchScore?: number;
  matchScore?: number;
  isFromDatabase?: boolean;

  // Compatibility with FacultyMember
  alignmentDetails?: string;
  activitySummary?: string;
  recentActivities?: string[];
  isActive?: boolean;
  matchReasoning?: MatchReasoning;
  programName?: string;
  programNameZh?: string;
  programNameEn?: string;
  programUrl?: string;
  universityUrl?: string;
  recommendationReason?: string;
  deadlineData?: SourceData;
  applicationReqsData?: SourceData;
  rpReqsData?: SourceData;
  tuitionData?: SourceData;
  scholarshipData?: SourceData;
  
  // Source URLs for data fields
  deadlineSourceUrls?: string[];
  applicationRequirementsSourceUrls?: string[];
  rpRequirementsSourceUrls?: string[];
  tuitionSourceUrls?: string[];
  scholarshipSourceUrls?: string[];

  // Raw data from import
  raw?: {
    sourceWorkbook?: string;
    sourceSheet?: string;
    importedRows?: Record<string, string>[];
  };
  legacy?: any;
}

export interface TargetOption {
  region: string;
  university: string;
  count: number;
}

export enum ImageSize {
  Size_1K = "1K",
  Size_2K = "2K",
  Size_4K = "4K",
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  major: string;
  gpa: string;
  startDate: string;
  endDate: string;
  extraInfo?: string;
  notes?: string;
}

export interface Work {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Award {
  id: string;
  name: string;
  level: string;
  date: string;
  description: string;
}

export interface Contact {
  id: string;
  type: 'phone' | 'address' | 'email';
  value: string;
}

export interface ClientDocument {
  id: string;
  title: string;
  type: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientEvent {
  id: string;
  clientId: string;
  title: string;            // 事件标题，如 "帝国理工 DDL"
  date: string;             // ISO 日期 YYYY-MM-DD
  time?: string;            // 可选时间 HH:mm
  type: 'deadline' | 'interview' | 'submission' | 'meeting' | 'reminder' | 'other';
  description?: string;     // 备注
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

export interface FacultyMatch {
  facultyId: string;
  matchScore?: number;
  matchReasoning: string;
  reviewedAt?: string;
}

export interface FacultyImportRowResult {
  rowIndex: number;
  status: 'parsed' | 'skipped' | 'failed';
  message: string;
  rawRow: Record<string, string>;
  facultyKey?: string;
}

export interface FacultyImportSummary {
  workbookName: string;
  sheetName: string;
  totalRows: number;
  processedRows: number;
  parsedRows: number;
  skippedRows: number;
  failedRows: number;
  createdFacultyCount: number;
  mergedFacultyCount: number;
  appendedProjectCount: number;
  messages: string[];
}

export interface MatcherSearchFilters {
  countries?: string[];
  universities?: string[];
  fieldCategory?: string;
  subFieldCategory?: string;
  qsRankingRange?: [number, number];
  searchQuery?: string;
}

export type SourceMode = 'local' | 'web' | 'search';
export type RecommendationOrigin = 'manual' | 'ai' | 'search';

export interface MentorEvaluationSnapshot {
  score: number;
  reasoning: string;
  timestamp: string;
}

export interface MentorRecommendation {
  facultyId: string;
  addedAt: string;
  addedFrom: RecommendationOrigin;
  sourceModes: SourceMode[];
  evaluation?: MentorEvaluationSnapshot;
}

export interface Client {
  id: string;
  name: string;
  university?: string;
  status: 'active' | 'archived';
  createdAt: string;
  advisor?: string;
  gpa?: string;
  educationCount?: number;
  documentCount?: number;
  contact?: string;
  educations?: Education[];
  works?: Work[];
  awards?: Award[];
  contacts?: Contact[];
  academicAchievements?: string;
  extracurriculars?: string;
  interests?: string;
  careerAspirations?: string;
  experiencesAndChallenges?: string;
  skillsAndQualities?: string;
  growthAndDevelopment?: string;
  documents?: ClientDocument[];
  researchPapers?: Array<{
    id: string;
    title: string;
    journal: string;
    date: string;
    link: string;
  }>;
  identityDocs?: Array<{
    id: string;
    type: string;
    number: string;
    expiry: string;
  }>;
  avatarUrl?: string;
  // ===== 择导需求信息 =====
  targetCountries?: string;            // 意向国家，如 "美国、澳洲"
  targetUniversities?: string;         // 具体意向院校描述，如 "墨尔本大学、悉尼大学；US News 30-50"
  targetDepartment?: string;           // 专业范围，如 "public finance, 公共经济学, 税收政策"
  entryYear?: string;                  // 入学年份，如 "27fall"、"2026年"
  scholarshipRequirement?: string;     // 奖学金需求，如 "全奖"、"必须要奖学金"
  exclusions?: string;                 // 排除列表，如 "避开爱丁堡大学"
  rankingPreference?: string;          // 排名偏好，如 "QS前100, US News前50"
  acceptCrossDiscipline?: boolean;     // 能否接受交叉学科
  specialRequirements?: string;        // 特殊需求，如 "mphil和phd录取要求分开写"
  hasRP?: boolean;                     // 是否有RP
  hasCV?: boolean;                     // 是否有CV
  hasPublications?: boolean;           // 是否有期刊发表
  rpTopic?: string;                    // RP题目
  // ===== 业务信息（内部用，不给学生看） =====
  businessCoordinator?: string;        // 沟通协调专员，如 "Jennifer"
  selectionType?: string;              // 择导类型，如 "第1轮择导"
  selectionCount?: number;             // 择导个数
  selectionDeadline?: string;          // DDL，如 "11.28"
  avoidPreviousMentors?: string;       // 是否避开之前导师及详情
  linkedFacultyIds?: string[];
  facultyMatches?: FacultyMatch[];
  mentorRecommendations?: MentorRecommendation[];
  events?: ClientEvent[];
}
