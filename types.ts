
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
  university: string;         // New: University Name
  department?: string;        // New: Department
  matchScore: number;
  researchAreas: string[];
  alignmentDetails: string;
  activitySummary: string;    // New: High-level summary of activities
  recentActivities: string[]; // Specific, dated events
  isActive: boolean;
  profileUrl?: string;
  photoUrl?: string;          // New: Profile photo URL
  email?: string;             // New: Contact email
  
  // Admission & Data Fields with Source
  qsRanking?: string;         // Kept for UI display, preferably short e.g. "QS #10"
  qsRankingData?: SourceData;
  deadlineData?: SourceData;
  applicationReqsData?: SourceData;
  rpReqsData?: SourceData;
  tuitionData?: SourceData;
  scholarshipData?: SourceData;
  
  programUrl?: string;        // "链接"
  universityUrl?: string;     // "官网"

  matchReasoning: MatchReasoning;
}

export interface FacultyRecord extends FacultyMember {
  // ===== 数据库管理字段 =====
  id: string;                    // 唯一ID (crypto.randomUUID())
  country: string;               // 国家/地区分类 (如"美国"、"英国"、"中国香港")
  fieldCategory: string;         // 专业/学科分类 (如"计算机科学"、"机械工程")
  customTags?: string[];         // 用户自定义标签 (如"已联系"、"回复快"、"套磁优先")
  addedAt: string;               // 添加到数据库的时间 (ISO格式)
  updatedAt: string;             // 最后修改时间
  source: 'search' | 'manual';  // 来源：搜索匹配添加 or 手动录入
  notes?: string;                // 用户备注
  linkedClientIds?: string[];    // 关联的客户ID列表（推荐给了哪些学生）
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
}
