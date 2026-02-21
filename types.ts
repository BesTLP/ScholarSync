
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
