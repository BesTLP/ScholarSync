export interface MatchReasoning {
  locationCheck: string;
  universityCheck: string;
  departmentCheck: string;
  researchFit: string;
  positionCheck: string;
  activityCheck: string;
  reputationCheck: string;
}

export interface SourceData {
  value: string;
  sourceUrl: string;
}

export type MatchSource = 'local' | 'web' | 'merged';
export type SourceMode = 'local' | 'web';
export type DegreeType = 'phd' | 'master' | 'unspecified';
export type RecommendationOrigin = 'student-detail' | 'matcher' | 'faculty-db' | 'manual';

export interface MentorEvaluationSnapshot {
  score: number;
  band: 'high' | 'medium' | 'low';
  summary: string;
  reasons: string[];
  updatedAt: string;
  sourceBreakdown: {
    researchFit: number;
    targetFit: number;
    admissionFit: number;
    seniorityFit: number;
    dataQuality: number;
  };
}

export interface FacultyMember {
  name: string;
  title: string;
  university: string;
  school?: string;
  department?: string;
  matchScore: number;
  researchAreas: string[];
  alignmentDetails: string;
  activitySummary: string;
  recentActivities: string[];
  isActive: boolean;
  profileUrl?: string;
  photoUrl?: string;
  email?: string;
  qsRanking?: string;
  qsRankingData?: SourceData;
  deadlineData?: SourceData;
  applicationReqsData?: SourceData;
  rpReqsData?: SourceData;
  tuitionData?: SourceData;
  scholarshipData?: SourceData;
  programUrl?: string;
  universityUrl?: string;
  matchReasoning: MatchReasoning;
  matchSource?: MatchSource;
  evidenceUrls?: string[];
  evaluation?: MentorEvaluationSnapshot;
  dimensionTags?: string[];
}

export interface FacultyProject {
  id: string;
  programName: string;
  programNameZh?: string;
  programNameEn?: string;
  programUrl?: string;
  deadlineRaw?: string;
  deadlineSourceUrls?: string[];
  applicationRequirementsRaw?: string;
  applicationRequirementsSourceUrls?: string[];
  rpRequirementsRaw?: string;
  rpRequirementsSourceUrls?: string[];
  tuitionRaw?: string;
  tuitionSourceUrls?: string[];
  scholarshipRaw?: string;
  scholarshipSourceUrls?: string[];
  recommendationReason?: string;
  sourceWorkbook?: string;
  sourceSheet?: string;
  sourceRowIndex?: number;
  rawRow?: Record<string, string>;
  mentorTextRaw?: string;
  emailCellRaw?: string;
}

export interface FacultyRecordLegacy {
  country?: string;
  subRegion?: string;
  regionPath?: string[];
  classificationPath?: string[];
  classificationNote?: string;
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
  messages?: string[];
}

export interface FacultyRecord extends FacultyMember {
  id: string;
  country: string;
  provinceState?: string;
  city?: string;
  subRegion?: string;
  regionPath?: string[];
  universityEnglish?: string;
  programNameZh?: string;
  programNameEn?: string;
  deadlineSourceUrls?: string[];
  applicationRequirementsSourceUrls?: string[];
  rpRequirementsSourceUrls?: string[];
  tuitionSourceUrls?: string[];
  scholarshipSourceUrls?: string[];
  fieldCategory: string;
  subFieldCategory?: string;
  classificationPath?: string[];
  classificationSource?: 'auto' | 'manual' | 'hybrid';
  classificationNote?: string;
  normalizedName: string;
  normalizedUniversity: string;
  customTags?: string[];
  addedAt: string;
  updatedAt: string;
  source: 'search' | 'manual' | 'import';
  notes?: string;
  linkedClientIds?: string[];
  projects: FacultyProject[];
  legacy?: FacultyRecordLegacy;
  raw?: {
    sourceWorkbook?: string;
    sourceSheet?: string;
    importedRows?: Array<Record<string, string>>;
  };
}

export interface TargetOption {
  region: string;
  university: string;
  count: number;
}

export interface MatcherSearchTarget {
  id: string;
  country?: string;
  university?: string;
  school?: string;
  department?: string;
  major?: string;
  count?: number;
}

export interface ClientSelectionProfile {
  countries: string[];
  universities: string[];
  departments: string[];
  majors: string[];
  degreeType?: DegreeType;
  majorA?: string;
  majorB?: string;
  crossDiscipline?: boolean;
  officialLinks: string[];
  targetPosition?: string;
  entryYear?: string;
  selectionCount?: number;
  selectionType?: string;
  selectionDeadline?: string;
  scholarshipRequirement?: string;
  exclusions?: string;
  rankingPreference?: string;
  specialRequirements?: string;
  businessCoordinator?: string;
  hasRP?: boolean;
  hasCV?: boolean;
  hasPublications?: boolean;
  rpTopic?: string;
  avoidPreviousMentors?: string;
}

export interface MatcherSearchFilters {
  sourceModes: SourceMode[];
  targets: MatcherSearchTarget[];
  degreeType?: DegreeType;
  majorA?: string;
  majorB?: string;
  crossDiscipline?: boolean;
  officialLinks: string[];
  profileSummary?: string;
  manualNotes?: string;
  scholarshipRequirement?: string;
  exclusions?: string;
  rankingPreference?: string;
  specialRequirements?: string;
  targetPosition?: string;
  entryYear?: string;
  businessCoordinator?: string;
  selectionType?: string;
  selectionCount?: number;
  selectionDeadline?: string;
  hasRP?: boolean;
  hasCV?: boolean;
  hasPublications?: boolean;
  rpTopic?: string;
  avoidPreviousMentors?: string;
}

export interface MentorRecommendation {
  facultyId: string;
  addedAt: string;
  addedFrom: RecommendationOrigin;
  sourceModes: SourceMode[];
  evaluation?: MentorEvaluationSnapshot;
  notes?: string;
}

export enum ImageSize {
  Size_1K = '1K',
  Size_2K = '2K',
  Size_4K = '4K',
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
  title: string;
  date: string;
  time?: string;
  type: 'deadline' | 'interview' | 'submission' | 'meeting' | 'reminder' | 'other';
  description?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
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
  targetCountries?: string;
  targetUniversities?: string;
  targetDepartment?: string;
  entryYear?: string;
  scholarshipRequirement?: string;
  exclusions?: string;
  rankingPreference?: string;
  acceptCrossDiscipline?: boolean;
  specialRequirements?: string;
  hasRP?: boolean;
  hasCV?: boolean;
  hasPublications?: boolean;
  rpTopic?: string;
  businessCoordinator?: string;
  selectionType?: string;
  selectionCount?: number;
  selectionDeadline?: string;
  avoidPreviousMentors?: string;
  linkedFacultyIds?: string[];
  mentorRecommendations?: MentorRecommendation[];
  selectionProfile?: ClientSelectionProfile;
  events?: ClientEvent[];
}
