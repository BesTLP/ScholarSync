
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
    Role: You are a rigorous Academic Admissions Auditor. Your goal is to find high-quality faculty matches with VERIFIED data.

    User Inputs:
    - Student Profile: "${hasProfile ? studentProfile : "Not provided"}"
    - Department Focus: "${department || "General"}"
    - Target Position Requirement: "${targetPosition || "Full Professor"}" (See Rank Logic)
    - Entry Year: "${entryYear || "N/A"}"
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

    **STRICT EXECUTION PROTOCOL (MUST FOLLOW)**:
    1. **SEARCH**: Find the faculty directory for the target university/department.
    2. **INDIVIDUAL VERIFICATION (CRITICAL)**:
       - For EACH candidate, you MUST find their **Official Personal Profile Page** (university domain).
       - **DO NOT** rely on the directory list snippet. Open the specific profile URL.
       - **IF NO PROFILE URL OR 404**: DISCARD this candidate immediately. Do not recommend.
       - **IF PROFILE IS EMPTY/MISSING INFO**: DISCARD this candidate.
       - **NO PIECING TOGETHER**: Do not invent research interests from general university pages. They must come from the *individual's* page.
    3. **DATA EXTRACTION**:
       - Extract Research Areas, Email, and Recent Activity (2020-2025) *strictly* from this verified profile page.
    4. **ADMISSION REQUIREMENTS (DEPARTMENT LEVEL)**:
       - Search for the *Department's* specific PhD/MPhil admission page for the ${entryYear} intake.
       - **FORMAT RULE**: You MUST quote the **Original English Text** first, then provide the **Chinese Translation**.
       - Format: "Original: [English text from website]\n中文翻译: [Chinese translation]"
       - Include: GPA threshold, English scores (IELTS/TOEFL), and specific degree requirements.
       - If requirements are not found, state "Original: Not available online\n中文翻译: 未在官网找到明确录取要求".
    5. **NEGATIVE FILTER**: Exclude any names/universities in "EXCLUSIONS".

    **OUTPUT RULES**:
    - **QS Ranking**: Include current QS World Ranking.
    - **Email**: Must be the official academic email.
    - **Research Areas**: Format as "English Term (中文翻译)".
    - **Match Reasoning**: Chinese, concise, verified.
    - **Language**: Simplified Chinese (except for the Original English admission text).

    Constraints:
    - **No Hallucinations**: If you can't find a professor's specific page, SKIP them.
    - It is better to return 3 verified results than 10 broken ones.
  `;

  if (manualContent && manualContent.trim().length > 0) {
    promptContent += `\nProvided Text Content:\n${manualContent}`;
  }

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        title: { type: Type.STRING },
        matchScore: { type: Type.INTEGER },
        researchAreas: { type: Type.ARRAY, items: { type: Type.STRING, description: "Research areas: English (Chinese)" } },
        alignmentDetails: { type: Type.STRING },
        activitySummary: { type: Type.STRING },
        recentActivities: { type: Type.ARRAY, items: { type: Type.STRING } },
        isActive: { type: Type.BOOLEAN },
        profileUrl: { type: Type.STRING },
        email: { type: Type.STRING },
        qsRanking: { type: Type.STRING },
        admissionRequirements: { type: Type.STRING, description: "Format: Original: [English Text] \\n 中文翻译: [Chinese Translation]" },
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
      required: ["name", "title", "matchScore", "researchAreas", "alignmentDetails", "isActive", "activitySummary", "recentActivities", "matchReasoning", "profileUrl", "admissionRequirements"]
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
