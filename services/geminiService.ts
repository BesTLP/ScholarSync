
import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { FacultyMember, ImageSize, TargetOption, Client } from "../types";

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

export async function generatePSOutline(params: {
  studentName: string;
  targetUni: string;
  degree: string;
  major: string;
  outlineCount: number;
  instructions?: string;
  studentProfile?: Client;
}): Promise<string[]> {
  const ai = getClient();
  const { studentName, targetUni, degree, major, outlineCount, instructions, studentProfile } = params;

  const profileContext = studentProfile ? `
    Student Profile:
    - GPA: ${studentProfile.gpa || 'N/A'}
    - Research: ${studentProfile.researchPapers?.map(p => p.title).join('; ') || 'N/A'}
    - Work Experience: ${studentProfile.works?.map(w => `${w.position} at ${w.company}`).join('; ') || 'N/A'}
    - Awards: ${studentProfile.awards?.map(a => a.name).join('; ') || 'N/A'}
    - Interests: ${studentProfile.interests || 'N/A'}
  ` : '';

  const prompt = `
    You are a top-tier admissions consultant who has helped hundreds of students get into Top 30 universities.
    Create a detailed Personal Statement outline for ${studentName}, applying to ${targetUni} for a ${degree} in ${major}.
    
    The outline must follow this structure:
    1. Hook: An engaging personal story or scene that grabs attention.
    2. Academic Origin: How the interest in ${major} developed.
    3. Key Experiences: Specific research, internships, or projects with details.
    4. Why ${targetUni}: Specific fit with the school's curriculum, professors, or culture.
    5. Future Goals & Conclusion: Career aspirations and a strong closing.

    ${profileContext}
    
    Requirements:
    - Generate exactly ${outlineCount} paragraphs.
    - For each paragraph, provide specific writing direction and key points to cover, not just vague descriptions.
    - ${instructions ? `Custom Instructions: ${instructions}` : ''}
    - Output must read as authentically human-written. Vary sentence length and structure. Use occasional colloquial expressions where appropriate. Avoid overly polished or formulaic transitions. Include specific, personal details unique to this applicant.
    
    Return ONLY a JSON array of strings, where each string is the description for one paragraph.
    Example: ["Para 1: Start with...", "Para 2: Discuss..."]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });
    
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating PS outline:", error);
    return Array(outlineCount).fill("Failed to generate outline paragraph.");
  }
}

export async function generatePSContent(params: {
  studentName: string;
  targetUni: string;
  degree: string;
  major: string;
  outlines: string[];
  instructions?: string;
  studentProfile?: Client;
}): Promise<string> {
  const ai = getClient();
  const { studentName, targetUni, degree, major, outlines, instructions, studentProfile } = params;

  const profileContext = studentProfile ? `
    Student Profile:
    - GPA: ${studentProfile.gpa || 'N/A'}
    - Research: ${studentProfile.researchPapers?.map(p => p.title).join('; ') || 'N/A'}
    - Work Experience: ${studentProfile.works?.map(w => `${w.position} at ${w.company}`).join('; ') || 'N/A'}
    - Awards: ${studentProfile.awards?.map(a => a.name).join('; ') || 'N/A'}
    - Skills: ${studentProfile.skillsAndQualities || 'N/A'}
  ` : '';

  const prompt = `
    Write a full Personal Statement for ${studentName}, applying to ${targetUni} for a ${degree} in ${major}.
    
    Strictly follow this outline:
    ${outlines.map((line, i) => `Paragraph ${i + 1}: ${line}`).join('\n')}

    ${profileContext}

    Requirements:
    - Write 150-250 words per paragraph.
    - "Show, don't tell": Use specific scenes, actions, and details instead of empty adjectives.
    - Tone: Natural, personal, authentic. Avoid AI clichés like "passionate about", "I have always been fascinated", "In today's rapidly evolving world", "delve into", "tapestry".
    - Ensure the conclusion calls back to the hook in the introduction.
    - ${instructions ? `Custom Instructions: ${instructions}` : ''}
    - Output must read as authentically human-written. Vary sentence length and structure. Use occasional colloquial expressions where appropriate. Avoid overly polished or formulaic transitions. Include specific, personal details unique to this applicant.
    
    Return the full essay text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    return response.text || '';
  } catch (error) {
    console.error("Error generating PS content:", error);
    return "Failed to generate content.";
  }
}

export async function generateEssay(params: {
  studentName: string;
  promptText: string;
  wordCount: number;
  studentProfile?: Client;
  targetUni?: string;
  focusPoints?: string;
}): Promise<string> {
  const ai = getClient();
  const { studentName, promptText, wordCount, studentProfile, targetUni, focusPoints } = params;

  const profileContext = studentProfile ? `
    Student Profile:
    - Experiences: ${studentProfile.experiencesAndChallenges || 'N/A'}
    - Activities: ${studentProfile.extracurriculars || 'N/A'}
    - Growth: ${studentProfile.growthAndDevelopment || 'N/A'}
  ` : '';

  const prompt = `
    Write an admissions essay for ${studentName} based on this prompt: "${promptText}".
    
    Target University: ${targetUni || 'General Application'}
    Focus Points: ${focusPoints || 'None provided'}

    Strategy:
    1. Analyze the core values the prompt is testing (e.g., leadership, resilience, creativity).
    2. Extract the most matching material from the student's profile.
    3. Write a sincere, personal narrative. Avoid preaching or generalizations.
    
    ${profileContext}

    Requirements:
    - Word count: Strictly within ${wordCount * 0.9} to ${wordCount * 1.1} words.
    - Tone: Authentic, reflective, human.
    - Output must read as authentically human-written. Vary sentence length and structure. Use occasional colloquial expressions where appropriate. Avoid overly polished or formulaic transitions. Include specific, personal details unique to this applicant.

    Return the essay text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    return response.text || '';
  } catch (error) {
    console.error("Error generating essay:", error);
    return "Failed to generate essay.";
  }
}

export async function generateLOR(params: {
  studentName: string;
  recommenderName: string;
  recommenderTitle: string;
  relationship: string;
  studentProfile?: Client;
  targetUni?: string;
  major?: string;
  focusPoints?: string;
}): Promise<string> {
  const ai = getClient();
  const { studentName, recommenderName, recommenderTitle, relationship, studentProfile, targetUni, major, focusPoints } = params;

  const profileContext = studentProfile ? `
    Student Profile:
    - Research/Work with recommender: ${studentProfile.researchPapers?.map(p => p.title).join('; ') || 'N/A'}
    - Key Skills: ${studentProfile.skillsAndQualities || 'N/A'}
  ` : '';

  const prompt = `
    Write a Letter of Recommendation for ${studentName}.
    
    Target University: ${targetUni || 'General Application'}
    Target Major: ${major || 'General'}
    Focus Points: ${focusPoints || 'None provided'}
    
    Recommender Info:
    - Name: ${recommenderName}
    - Title: ${recommenderTitle}
    - Relationship: ${relationship} (Adjust perspective accordingly: Professor focuses on academic potential, Employer on work ethic, etc.)

    ${profileContext}

    Requirements:
    - Include 2-3 specific anecdotes or examples to support the praise.
    - Tone: Professional yet personal, matching the recommender's identity.
    - Format: Complete letter with date, salutation, and signature block.
    - Output must read as authentically human-written. Vary sentence length and structure. Use occasional colloquial expressions where appropriate. Avoid overly polished or formulaic transitions. Include specific, personal details unique to this applicant.

    Return the full letter text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    return response.text || '';
  } catch (error) {
    console.error("Error generating LOR:", error);
    return "Failed to generate LOR.";
  }
}

export async function generateCV(params: {
  studentName: string;
  studentProfile?: Client;
  instructions?: string;
}): Promise<string> {
  const ai = getClient();
  const { studentName, studentProfile, instructions } = params;

  const profileContext = studentProfile ? JSON.stringify(studentProfile, null, 2) : '';

  const prompt = `
    Create a professional CV for ${studentName}.
    
    Student Data:
    ${profileContext}

    Requirements:
    - Format: Structured plain text (use indentation, uppercase headers, and divider lines like '---' to organize). OR Markdown if requested.
    - Focus: Adjust based on target (Academic vs Industry).
    - Action Verbs: Start every bullet point with a strong action verb.
    - Include all relevant sections: Education, Experience, Research, Skills, Awards.
    - ${instructions ? `Custom Instructions: ${instructions}` : ''}
    - Output must read as authentically human-written. Vary sentence length and structure. Use occasional colloquial expressions where appropriate. Avoid overly polished or formulaic transitions. Include specific, personal details unique to this applicant.

    Return the CV text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    return response.text || '';
  } catch (error) {
    console.error("Error generating CV:", error);
    return "Failed to generate CV.";
  }
}

export async function parseResumeContent(fileContent: string): Promise<Partial<Client>> {
  const ai = getClient();
  const prompt = `
    You are a professional resume parser. Extract structured information from the following resume/CV text.
    
    Text:
    ${fileContent.substring(0, 20000)} // Limit context window if needed

    Return a JSON object with these fields (if found):
    {
      "name": string,
      "gpa": string,
      "educations": [{ "school": string, "degree": string, "major": string, "startDate": string, "endDate": string, "gpa": string }],
      "works": [{ "company": string, "position": string, "startDate": string, "endDate": string, "description": string }],
      "awards": [{ "name": string, "date": string, "description": string }],
      "skillsAndQualities": string,
      "academicAchievements": string,
      "extracurriculars": string,
      "careerAspirations": string,
      "contacts": [{ "type": "email" | "phone" | "address", "value": string }]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });
    
    const text = response.text;
    if (!text) return {};
    return JSON.parse(text);
  } catch (error) {
    console.error("Error parsing resume:", error);
    return {};
  }
}

export const generateProfileAnalysis = async (client: Client): Promise<string> => {
  const ai = getClient();
  const prompt = `
    You are an expert education consultant.
    Analyze the following student profile and provide personalized background enhancement suggestions.
    
    Student Profile:
    Name: ${client.name}
    GPA: ${client.gpa || 'N/A'}
    Education: ${JSON.stringify(client.educations || [])}
    Work Experience: ${JSON.stringify(client.works || [])}
    Awards: ${JSON.stringify(client.awards || [])}
    Research Papers: ${JSON.stringify(client.researchPapers || [])}
    
    Please provide:
    1. A brief analysis of the student's current strengths and weaknesses.
    2. Specific suggestions for background improvement (e.g., research, internships, skills).
    3. Recommended timeline for the next steps.
    
    Output Language: Simplified Chinese.
    Format: Markdown.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "无法生成分析建议。";
};

export const parseClientFile = async (fileData: string, mimeType: string = 'text/plain'): Promise<Partial<Client>> => {
  const ai = getClient();
  
  let contents: any;

  if (mimeType.startsWith('text/')) {
    // For text files, we can just embed the text
    // Note: fileData might be base64 encoded if it came from FileReader as data URL
    // If it is a data URL, we need to strip the prefix and decode it, OR just use the inlineData if the model supports it.
    // However, for text, it's safer to decode if it's base64.
    
    let textContent = fileData;
    if (fileData.includes('base64,')) {
        try {
            textContent = atob(fileData.split('base64,')[1]);
        } catch (e) {
            console.warn("Failed to decode base64 text, using raw data", e);
        }
    }

    const prompt = `
      Extract student information from the following resume/document content and return it as a JSON object matching the Client interface structure.
      
      Document Content:
      """
      ${textContent}
      """
      
      Output JSON Structure:
      {
        "name": "Student Name",
        "gpa": "3.8/4.0",
        "advisor": "Advisor Name (if any)",
        "contact": "Phone/Email",
        "educations": [
          { "school": "...", "degree": "...", "major": "...", "gpa": "...", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }
        ],
        "works": [
          { "company": "...", "position": "...", "startDate": "...", "endDate": "...", "description": "..." }
        ],
        "awards": [
          { "name": "...", "level": "...", "date": "...", "description": "..." }
        ],
        "researchPapers": [
          { "title": "...", "journal": "...", "date": "...", "link": "..." }
        ],
        "skillsAndQualities": "...",
        "interests": "..."
      }
      
      If a field is not found, omit it or use empty strings.
      Dates should be in YYYY-MM-DD format if possible.
    `;
    
    contents = prompt;

  } else {
    // For PDF, Images, etc., use inlineData
    // fileData should be the base64 string (without the data:mime/type;base64, prefix if possible, or we strip it)
    const base64Data = fileData.includes('base64,') ? fileData.split('base64,')[1] : fileData;

    contents = {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: `Extract student information from the provided document and return it as a JSON object matching the Client interface structure.
          
          Output JSON Structure:
          {
            "name": "Student Name",
            "gpa": "3.8/4.0",
            "advisor": "Advisor Name (if any)",
            "contact": "Phone/Email",
            "educations": [
              { "school": "...", "degree": "...", "major": "...", "gpa": "...", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }
            ],
            "works": [
              { "company": "...", "position": "...", "startDate": "...", "endDate": "...", "description": "..." }
            ],
            "awards": [
              { "name": "...", "level": "...", "date": "...", "description": "..." }
            ],
            "researchPapers": [
              { "title": "...", "journal": "...", "date": "...", "link": "..." }
            ],
            "skillsAndQualities": "...",
            "interests": "..."
          }
          
          If a field is not found, omit it or use empty strings.
          Dates should be in YYYY-MM-DD format if possible.`
        }
      ]
    };
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash", // Use 2.5 Flash for multimodal support
    contents: contents,
    config: {
      responseMimeType: "application/json"
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse client file:", e);
    return {};
  }
};

export const searchFacultyByWeb = async (query: string): Promise<FacultyMember[]> => {
  const ai = getClient();
  
  const prompt = `
    Task: Search for faculty members based on the query: "${query}".
    
    Instructions:
    1. Use Google Search to find official faculty profiles, university directories, or academic pages.
    2. Extract detailed information for each faculty member found.
    3. **CRITICAL**: You must find the **Official University Profile Page** and use it as the \`profileUrl\`.
    4. **CRITICAL**: You must find the **Official Email** address.
    5. **CRITICAL**: You must find **Recent Academic Activities** (papers, projects) from 2020-2025.
    
    Output Format: JSON Array of FacultyMember objects.
    
    Schema:
    {
      "name": "Name",
      "title": "Title (e.g., Professor, Associate Professor)",
      "university": "University Name",
      "department": "Department Name",
      "email": "Email Address",
      "profileUrl": "Official Profile URL",
      "photoUrl": "Photo URL (optional)",
      "researchAreas": ["Area 1", "Area 2"],
      "recentActivities": ["Activity 1", "Activity 2"],
      "activitySummary": "Brief summary of recent work",
      "isActive": true/false (based on recent activity or "Emeritus" status),
      "matchScore": 0 (default),
      "alignmentDetails": "Brief description of their research focus",
      "matchReasoning": {
         "locationCheck": "Location",
         "universityCheck": "University",
         "departmentCheck": "Department",
         "positionCheck": "Position",
         "activityCheck": "Activity Level",
         "reputationCheck": "Reputation",
         "researchFit": "Research Focus"
      }
    }
    
    Return ONLY valid JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as FacultyMember[];
  } catch (error) {
    console.error("Web search for faculty failed:", error);
    return [];
  }
};

export const searchUniversityInfo = async (university: string, department?: string): Promise<any> => {
  const ai = getClient();
  const prompt = `
    Task: Find detailed admission and program information for:
    University: ${university}
    Department/Program: ${department || "General"}
    
    Instructions:
    1. Search for the **Official Graduate Admission Page** for this specific program.
    2. Extract the following data points with their source URLs.
    
    Output Schema (JSON):
    {
      "university": "Full Name",
      "qsRanking": "World Ranking",
      "website": "Official URL",
      "tuition": { "value": "Amount per year", "sourceUrl": "..." },
      "deadline": { "value": "Next deadline date", "sourceUrl": "..." },
      "requirements": { "value": "GPA, GRE, English scores", "sourceUrl": "..." },
      "scholarships": { "value": "Available funding types", "sourceUrl": "..." },
      "programs": ["Program A", "Program B"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("University search failed:", error);
    return null;
  }
};

export const refreshFacultyData = async (existing: FacultyMember): Promise<FacultyMember> => {
  const ai = getClient();
  const prompt = `
    Task: Update and verify information for this faculty member:
    Name: ${existing.name}
    University: ${existing.university}
    Current Data: ${JSON.stringify(existing)}
    
    Instructions:
    1. Search for the latest official profile.
    2. Update **Recent Activities** (2024-2025 focus).
    3. Verify **Email** and **Title**.
    4. Check if they are still active at this university.
    
    Output: Return the updated FacultyMember JSON object. Keep existing data if no new info found, but update 'updatedAt' implicitly by returning fresh data.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text;
    if (!text) return existing;
    return JSON.parse(text) as FacultyMember;
  } catch (error) {
    console.error("Faculty refresh failed:", error);
    return existing;
  }
};

