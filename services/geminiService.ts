
import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { FacultyMember, ImageSize, TargetOption } from "../types";

// Initialize the client
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FACULTY_MATCHER = 'gemini-3-pro-preview';
const MODEL_IMAGE_GEN = 'gemini-3-pro-image-preview';
const MODEL_CHAT = 'gemini-3-pro-preview';
const MODEL_FAST = 'gemini-flash-lite-latest'; // Use Flash Lite for fast text parsing

interface MatchParams {
  studentProfile: string;
  directoryUrl?: string;
  targets: TargetOption[]; // Changed from single country/uni to array
  department?: string;
  manualContent?: string;
  targetPosition?: string;
  // New Fields
  entryYear?: string;
  scholarship?: string;
  exclusions?: string;
  businessInfo?: string;
}

interface ParsedRequirements {
  profileSummary: string;
  targets: TargetOption[];
  department: string;
  targetPosition: string;
  // New Fields
  entryYear: string;
  scholarship: string;
  exclusions: string;
  businessInfo: string;
}

export const parseRequirementText = async (rawText: string): Promise<ParsedRequirements> => {
  const ai = getClient();
  
  const prompt = `
    Task: Extract structured academic application data from the provided raw text.
    
    Raw Text:
    """
    ${rawText}
    """

    Instructions:
    1. **profileSummary**: Combine the student's background (Degree, School, GPA), Research Interests, and Major.
    2. **targets**: Extract a LIST of target regions/universities and the specific NUMBER (quota) of professors required for each.
       - If the text says "US 5 people, Australia 5 people", create two entries.
    3. **department**: Extract the target major/department.
    4. **targetPosition**: Extract explicit rank requirements.
       - If text says "Professor only" or "正教授", extract "Full Professor".
       - If text says "Associate accepted" or "副教授", extract "Associate Professor+".
    5. **entryYear**: Extract application entry year (e.g., "27fall", "2026").
    6. **scholarship**: Extract scholarship requirements (e.g., "Full scholarship", "CSC").
    7. **exclusions**: Extract schools, regions, or mentors to AVOID (e.g., "Avoid Edinburgh", "No previous mentors").
    8. **businessInfo**: Extract internal business details: Coordinator Name, Deadline (DDL), Round (e.g., "Jennifer, DDL 11.28, Round 1").

    Output Language: Simplified Chinese.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      profileSummary: { type: Type.STRING },
      department: { type: Type.STRING },
      targetPosition: { type: Type.STRING },
      entryYear: { type: Type.STRING },
      scholarship: { type: Type.STRING },
      exclusions: { type: Type.STRING },
      businessInfo: { type: Type.STRING },
      targets: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            region: { type: Type.STRING, description: "Country or Region e.g. 'USA'" },
            university: { type: Type.STRING, description: "Specific university names or ranking criteria e.g. 'Top 50' or 'Melbourne U'" },
            count: { type: Type.INTEGER, description: "Number of professors to find for this target" }
          },
          required: ["region", "university", "count"]
        }
      }
    },
    required: ["profileSummary", "targets", "department", "targetPosition", "entryYear", "scholarship", "exclusions", "businessInfo"]
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const jsonText = response.text || "{}";
    const result = JSON.parse(jsonText) as ParsedRequirements;
    
    // Ensure targets is never null/undefined
    if (!result.targets) result.targets = [];
    return result;

  } catch (error) {
    console.error("Parsing requirements failed:", error);
    return {
        profileSummary: rawText,
        targets: [{ region: "", university: "", count: 10 }],
        department: "",
        targetPosition: "",
        entryYear: "",
        scholarship: "",
        exclusions: "",
        businessInfo: ""
    };
  }
};

export const generateFacultyMatches = async (params: MatchParams): Promise<FacultyMember[]> => {
  const ai = getClient();
  const { 
    studentProfile, 
    directoryUrl, 
    targets, 
    department, 
    manualContent, 
    targetPosition,
    entryYear,
    scholarship,
    exclusions
  } = params;
  
  const hasProfile = studentProfile && studentProfile.trim().length > 0;
  
  // Construct detailed target context
  let targetInstructions = "";
  let totalCount = 0;
  
  if (targets.length > 0) {
      targetInstructions = "STRICTLY ADHERE to the following quotas:\n";
      targets.forEach((t, index) => {
          if (t.region || t.university) {
             const count = t.count || 5;
             totalCount += count;
             targetInstructions += `   - Group ${index + 1}: Find ${count} professors in Region: "${t.region || 'Any'}" / University: "${t.university || 'Any'}".\n`;
          }
      });
  } else {
      targetInstructions = "Target: Global Search (Top 10).";
      totalCount = 10;
  }

  // Cap total count for safety
  if (totalCount > 20) totalCount = 20;
  if (totalCount < 1) totalCount = 10;

  let promptContent = `
    Role: You are a rigorous Academic Admissions Auditor. Your goal is to find high-quality faculty matches with VERIFIED admissions data.
    
    **CURRENT DATE CONTEXT**: Today is Feb 10, 2026.
    **DEADLINE REQUIREMENT**: You MUST look for future deadlines (Spring 2027 or Fall 2027). Do NOT return past dates from 2024/2025 unless no other info is available.

    User Inputs:
    - Student Profile: "${hasProfile ? studentProfile : "Not provided"}"
    - Department Focus: "${department || "General"}"
    - Target Position Requirement: "${targetPosition || "Full Professor"}" (See Rank Logic)
    - Entry Year: "${entryYear || "N/A"}" (Search for this intake)
    - Scholarship Need: "${scholarship || "N/A"}"
    - EXCLUSIONS: "${exclusions || "None"}"
    - Target URL: "${directoryUrl || "None"}"
    - Manual Page Content: "${manualContent ? "Provided" : "None"}"

    **QUOTA INSTRUCTIONS**:
    ${targetInstructions}
    
    **ACADEMIC RANK / POSITION LOGIC (STRICT - DEFAULT IS FULL PROFESSOR)**:
    - **DEFAULT RULE**: If 'Target Position' is empty or vague, you MUST ONLY return **FULL PROFESSORS** (正教授).
    - **Regional Mapping**:
      - **USA/Canada**: "Professor" = Full. "Associate" = Mid. "Assistant" = Junior.
      - **UK/Australia/HK**: "Professor/Chair" = Full. "Reader" = Senior/Full. "Senior Lecturer" = Associate. "Lecturer" = Assistant.
    - **Filtering**:
      - User says "Professor" (or empty) -> **Full Professor ONLY**.
      - User says "Associate" -> Full & Associate accepted.
      - User says "Assistant" or "Any" -> All accepted.

    **CRITICAL EXECUTION PROTOCOL - NO 404s ALLOWED**:
    1. **INDIVIDUAL PAGE DISCOVERY & URL VERIFICATION**:
       - **Action**: You MUST search specifically for each potential candidate's name to find their **Official University Profile Page**.
       - **Query**: Use queries like "Professor [Name] [University] official profile".
       - **Validation**: 
          - **CHECK 1**: Is the URL from the official university domain?
          - **CHECK 2**: Is it a specific profile page (e.g., ends in ID or Name), NOT a general list/directory?
          - **CHECK 3 (Crucial)**: If the URL looks like a generic list or a pattern-matched guess (e.g., just an ID you guessed), **DO NOT USE IT**. Search again.
       - **Fallback**: If you cannot find a working, specific profile URL after searching, **DISCARD THE CANDIDATE**. Better to return fewer results than broken links.
    
    2. **DATA EXTRACTION**:
       - Extract Research Areas, Email, and Recent Activity (2020-2025).
       - **PROFILE PHOTO**: Attempt to find the URL of the professor's official profile photo.

    3. **ADMISSION & PROGRAM DATA (MANDATORY)**:
       - For each faculty, identify their University and Department.
       - **SEARCH**: You MUST search for the specific PhD/Master application information for their department (e.g. "[Uni] [Dept] PhD admission deadline 2027").
       - **EXTRACT THE FOLLOWING WITH SOURCE URLs**:
         - **QS Ranking**: World ranking of the uni.
         - **Deadline**: Next application deadline (Spring/Fall 2027).
         - **Application Reqs**: GPA, English scores, etc.
         - **RP Requirements**: Research Proposal specific word count/format.
         - **Tuition**: International student tuition fee.
         - **Scholarship**: Available funding/scholarship info.
       - **Constraint**: If you cannot find exact 2027 data, find the most recent reliable info and note the source.

    4. **NEGATIVE FILTER**: Exclude any names/universities in "EXCLUSIONS".

    **OUTPUT RULES**:
    - **QS Ranking**: Include current QS World Ranking.
    - **Email**: Must be the official academic email.
    - **Research Areas**: Format as "English Term (中文翻译)".
    - **Match Reasoning**: Chinese, concise, verified.
    - **Language**: Simplified Chinese.
    - **URL sources**: For every admission data point, provide the \`sourceUrl\`.

    **RECENT ACADEMIC ACTIVITIES (2020-2025) - DETAILED PAPERS & PROJECTS**:
    - **MANDATORY CONTENT**: You MUST include the **Full Title** of the paper or project. 
    - **WARNING**: DO NOT output lines like "[2025][Type]" with no content. That is a failure.
    - **STRICT FORMAT**: \`[Year][Type-Level] Actual Title (Chinese Translation) - Source\`
      - Correct: \`[2025][论文-顶刊] Learning from Noise (从噪声中学习) - CVPR\`
      - Incorrect: \`[2025][论文-顶刊]\` (MISSING CONTENT)
    - **Types**: \`[论文-顶刊]\`, \`[论文-期刊]\`, \`[论文-会议]\`, \`[项目-国家级]\`, \`[项目-省部级]\`.
    - **2025 PRIORITY**: Aggressively search for 2025 works (Accepted, In Press, Preprints). **DO NOT IGNORE 2025**.
    - **QUANTITY**: **List AT LEAST 5 items**. Fill the list with relevant papers.

    **SORTING**:
    - **STRICTLY Reverse Chronological**: 2025 -> 2024 -> 2023 -> 2022 -> 2021 -> 2020.
    - Top of the list MUST be the newest (2025/2024).

    Constraints:
    - **No Hallucinations**: If a URL or email is uncertain, DROP the candidate.
    - **No "Non-Chinese Citizen" Clause**: Do not hallucinate admission requirements.
  `;

  if (manualContent && manualContent.trim().length > 0) {
    promptContent += `\nProvided Text Content:\n${manualContent}`;
  }

  const sourceDataSchema = {
    type: Type.OBJECT,
    properties: {
        value: { type: Type.STRING, description: "The content/value extracted." },
        sourceUrl: { type: Type.STRING, description: "The specific URL where this info was found." }
    },
    required: ["value", "sourceUrl"]
  };

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        title: { type: Type.STRING },
        university: { type: Type.STRING, description: "Full Name of University (EN & CN)" },
        matchScore: { type: Type.INTEGER },
        researchAreas: { type: Type.ARRAY, items: { type: Type.STRING, description: "Research areas: English (Chinese)" } },
        alignmentDetails: { type: Type.STRING },
        activitySummary: { type: Type.STRING },
        recentActivities: { type: Type.ARRAY, items: { type: Type.STRING, description: "Format: [Year][Type-Level] Title (Chinese) - Source" } },
        isActive: { type: Type.BOOLEAN },
        profileUrl: { type: Type.STRING },
        photoUrl: { type: Type.STRING, description: "URL to the professor's profile photo" },
        email: { type: Type.STRING },
        
        // New Admission Data Fields
        qsRanking: { type: Type.STRING },
        qsRankingData: sourceDataSchema,
        deadlineData: sourceDataSchema,
        applicationReqsData: sourceDataSchema,
        rpReqsData: sourceDataSchema,
        tuitionData: sourceDataSchema,
        scholarshipData: sourceDataSchema,
        programUrl: { type: Type.STRING, description: "URL for the specific department/program admission page" },
        universityUrl: { type: Type.STRING, description: "URL for the main university website" },

        matchReasoning: {
          type: Type.OBJECT,
          properties: {
            locationCheck: { type: Type.STRING },
            universityCheck: { type: Type.STRING },
            departmentCheck: { type: Type.STRING },
            researchFit: { type: Type.STRING },
            positionCheck: { type: Type.STRING },
            activityCheck: { type: Type.STRING },
            reputationCheck: { type: Type.STRING }
          },
          required: ["locationCheck", "universityCheck", "departmentCheck", "researchFit", "positionCheck", "activityCheck", "reputationCheck"]
        }
      },
      required: ["name", "title", "university", "matchScore", "researchAreas", "alignmentDetails", "isActive", "activitySummary", "recentActivities", "matchReasoning", "profileUrl"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FACULTY_MATCHER,
      contents: promptContent,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        tools: [{googleSearch: {}}], 
      }
    });

    const jsonText = response.text || "[]";
    return JSON.parse(jsonText) as FacultyMember[];
  } catch (error) {
    console.error("Faculty matching failed:", error);
    throw error;
  }
};

export const generateImage = async (prompt: string, size: ImageSize): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL_IMAGE_GEN,
    contents: {
      parts: [
        { text: prompt }
      ]
    },
    config: {
      imageConfig: {
        imageSize: size,
        aspectRatio: "16:9"
      }
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
      for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
              const mimeType = part.inlineData.mimeType || 'image/png';
              return `data:${mimeType};base64,${part.inlineData.data}`;
          }
      }
  }
  throw new Error("Failed to generate image or no image returned.");
};

export const createChatSession = (): Chat => {
  const ai = getClient();
  return ai.chats.create({
    model: MODEL_CHAT,
    config: {
      systemInstruction: "You are a helpful academic assistant."
    }
  });
};

export const getFastResponse = async (query: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: query,
  });
  return response.text || "";
};
