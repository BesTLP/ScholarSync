
export interface MatchReasoning {
  locationCheck: string;      // Country/Region verification
  universityCheck: string;    // Institution verification
  departmentCheck: string;    // Department verification
  researchFit: string;        // Academic background alignment
  positionCheck: string;      // Title/Position verification
  activityCheck: string;      // Recent activity evaluation
  reputationCheck: string;    // Overall standing/quality assessment
}

export interface FacultyMember {
  name: string;
  title: string;
  matchScore: number;
  researchAreas: string[];
  alignmentDetails: string;
  activitySummary: string;    // New: High-level summary of activities
  recentActivities: string[]; // Specific, dated events
  isActive: boolean;
  profileUrl?: string;
  email?: string;             // New: Contact email
  qsRanking?: string;         // New: QS World Ranking
  admissionRequirements?: string; // New: Specific admission criteria (GPA, English, etc.)
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
