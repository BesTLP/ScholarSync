
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
    3. **department**: Extract ALL target research areas/majors. 
       - If the student has MULTIPLE research interests (e.g., "piano AND cello", "ML and bioinformatics"), 
         combine them with "、" separator (e.g., "钢琴、大提琴" or "机器学习、生物信息学").
       - Do NOT pick only one; preserve ALL keywords.
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

export interface DimensionResult {
  dimension: string;
  description: string;
  faculty: FacultyMember[];
}

export interface DecomposedSearchResult {
  isNiche: boolean;
  reasoning: string;
  dimensions: DimensionResult[];
  allFaculty: FacultyMember[];  // 去重汇总，带 dimensionTags
}

interface DecomposedField {
  dimension: string;      // 学科维度名，如 "材料科学与保护"
  keywords: string[];     // 搜索关键词，如 ["paper conservation chemistry", "古籍纸张修复"]
  description: string;    // 为什么这个维度与原始需求相关
}

interface FieldDecomposition {
  isNiche: boolean;           // 是否判定为稀缺/冷门方向
  originalField: string;      // 原始输入
  dimensions: DecomposedField[];  // 拆解后的维度（3-6个）
  reasoning: string;          // 为什么这样拆解
}

export const decomposeResearchField = async (
  department: string, 
  studentProfile?: string
): Promise<FieldDecomposition> => {
  const ai = getClient();
  
  const prompt = `
    Task: Analyze whether this research direction is a "niche/rare interdisciplinary field" that is unlikely to have a single professor perfectly matching it.
    
    Research Direction: "${department}"
    Student Background: "${studentProfile || 'Not provided'}"
    
    **Step 1: Niche Detection**
    Determine if this field is:
    - A well-established discipline with many professors (e.g., "Computer Science", "Economics") → isNiche = false
    - A rare/highly interdisciplinary field where no single professor likely covers everything (e.g., "古籍修复", "Music Therapy for Alzheimer's", "Space Law", "Computational Archaeology") → isNiche = true
    
    **Step 2: If isNiche = true, decompose into academic dimensions**
    Break the field into 3-6 concrete academic disciplines/sub-fields that collectively cover the student's research interest. For each dimension:
    - dimension: A recognized academic discipline name (Chinese + English)
    - keywords: 2-3 search keywords that would find professors in this dimension who have SOME connection to the original topic
    - description: Why this dimension is relevant (1 sentence, Chinese)
    
    Example for "古籍修复":
    [
      { "dimension": "材料科学与保护 (Conservation Science)", "keywords": ["paper conservation chemistry professor", "文物保护材料科学"], "description": "古籍的纸张、墨水、装帧材料的科学分析与保护技术" },
      { "dimension": "文献学与版本学 (Textual Studies)", "keywords": ["classical Chinese bibliography professor", "古典文献学教授"], "description": "古籍的文字内容鉴定、版本源流考证" },
      { "dimension": "艺术品修复 (Art Conservation)", "keywords": ["book restoration conservation professor", "书画修复教授"], "description": "修复技法、修复伦理、实操训练" },
      { "dimension": "数字人文 (Digital Humanities)", "keywords": ["digital heritage preservation professor", "数字化古籍"], "description": "古籍数字化扫描、AI辅助文字识别与修复" }
    ]
    
    **Step 3: If isNiche = false**
    Return dimensions as a single entry with the original field name.
    
    Output Language: Chinese for descriptions, English+Chinese for dimension names.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      isNiche: { type: Type.BOOLEAN },
      originalField: { type: Type.STRING },
      reasoning: { type: Type.STRING, description: "Why this is/isn't considered niche (Chinese)" },
      dimensions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            dimension: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING }
          },
          required: ["dimension", "keywords", "description"]
        }
      }
    },
    required: ["isNiche", "originalField", "reasoning", "dimensions"]
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: schema }
    });
    return JSON.parse(response.text || '{}') as FieldDecomposition;
  } catch {
    return {
      isNiche: false,
      originalField: department,
      reasoning: '分析失败，使用原始方向搜索',
      dimensions: [{ dimension: department, keywords: [department], description: department }]
    };
  }
};

export const generateFacultyMatchesDecomposed = async (
  params: MatchParams
): Promise<DecomposedSearchResult> => {
  const { department, studentProfile } = params;
  
  // Step 1: 判断是否需要拆解
  const decomposition = await decomposeResearchField(department || '', studentProfile);
  
  // Step 2: 如果不是冷门方向，走原有逻辑
  if (!decomposition.isNiche) {
    const results = await generateFacultyMatches(params);
    return {
      isNiche: false,
      reasoning: decomposition.reasoning,
      dimensions: [{ dimension: department || '', description: '', faculty: results }],
      allFaculty: results
    };
  }
  
  // Step 3: 冷门方向——分维度搜索
  // 按维度分配配额：总配额均分给每个维度
  const totalCount = params.targets.reduce((sum, t) => sum + (t.count || 5), 0) || 10;
  const countPerDimension = Math.max(2, Math.floor(totalCount / decomposition.dimensions.length));
  
  const dimensionResults: DimensionResult[] = [];
  
  for (const dim of decomposition.dimensions) {
    try {
      // 为每个维度构造搜索参数
      const dimParams: MatchParams = {
        ...params,
        department: dim.dimension,
        studentProfile: `${studentProfile || ''}\n\n[Context: This search focuses on the "${dim.dimension}" aspect of "${decomposition.originalField}". ${dim.description}]`,
        targets: params.targets.map(t => ({ ...t, count: countPerDimension }))
      };
      
      const results = await generateFacultyMatches(dimParams);
      dimensionResults.push({
        dimension: dim.dimension,
        description: dim.description,
        faculty: results
      });
    } catch (e) {
      console.error(`Dimension search failed for ${dim.dimension}:`, e);
      dimensionResults.push({ dimension: dim.dimension, description: dim.description, faculty: [] });
    }
  }
  
  // Step 4: 去重汇总（同名同校视为同一人）
  const seen = new Map<string, FacultyMember & { dimensionTags: string[] }>();
  
  for (const dr of dimensionResults) {
    for (const prof of dr.faculty) {
      const key = `${prof.name}||${prof.university}`;
      if (seen.has(key)) {
        // 同一人在多个维度出现——加分！说明是交叉型学者
        const existing = seen.get(key)!;
        existing.dimensionTags.push(dr.dimension);
        existing.matchScore = Math.min(100, existing.matchScore + 10); // 每多覆盖一个维度加10分
      } else {
        seen.set(key, { 
          ...prof, 
          dimensionTags: [dr.dimension],
          // 在 alignmentDetails 中注明来源维度
          alignmentDetails: `[${dr.dimension}] ${prof.alignmentDetails || ''}`
        });
      }
    }
  }
  
  // 按 matchScore 降序 + dimensionTags 数量降序排序
  const allFaculty = Array.from(seen.values())
    .sort((a, b) => {
      if (b.dimensionTags.length !== a.dimensionTags.length) {
        return b.dimensionTags.length - a.dimensionTags.length; // 覆盖维度多的排前面
      }
      return b.matchScore - a.matchScore;
    });

  return {
    isNiche: true,
    reasoning: decomposition.reasoning,
    dimensions: dimensionResults,
    allFaculty
  };
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
  
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

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

  // 解析交叉学科关键词：支持中英文逗号、顿号、加号、"和"、"与"、"AND"分隔
  const departmentKeywords = (department || '')
    .split(/[,，、+&\s]+|(?:和|与|AND)/gi)
    .map(k => k.trim())
    .filter(k => k.length > 0);

  const isInterdisciplinary = departmentKeywords.length > 1;

  let promptContent = `
    Role: You are a rigorous Academic Admissions Auditor. Your goal is to find high-quality faculty matches with VERIFIED admissions data.
    
    **CURRENT DATE CONTEXT**: Today is ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
    **DEADLINE REQUIREMENT**: You MUST look for future deadlines (Spring ${nextYear} or Fall ${nextYear}). Do NOT return past dates from 2024/2025 unless no other info is available.

    User Inputs:
    - Student Profile: "${hasProfile ? studentProfile : "Not provided"}"
    - Department Focus: "${department || "General"}"
    - Research Keywords (CRITICAL): [${departmentKeywords.map(k => `"${k}"`).join(', ')}]
    - Interdisciplinary Mode: ${isInterdisciplinary ? 'YES' : 'NO'}
    - Target Position Requirement: "${targetPosition || "Full Professor"}" (See Rank Logic)
    - Entry Year: "${entryYear || "N/A"}" (Search for this intake)
    - Scholarship Need: "${scholarship || "N/A"}"
    - EXCLUSIONS: "${exclusions || "None"}"
    - Target URL: "${directoryUrl || "None"}"
    - Manual Page Content: "${manualContent ? "Provided" : "None"}"

    **QUOTA INSTRUCTIONS**:
    ${targetInstructions}
    
${isInterdisciplinary ? `
    **INTERDISCIPLINARY MATCHING PROTOCOL (MANDATORY - THIS IS THE MOST IMPORTANT RULE)**:
    The student requires a professor whose research covers MULTIPLE areas simultaneously.
    Research Keywords: [${departmentKeywords.map(k => `"${k}"`).join(', ')}]

    **STRICT AND-LOGIC**:
    - A valid candidate MUST have demonstrated research or teaching activity in ALL of the following keywords, not just one:
      ${departmentKeywords.map((k, i) => `Keyword ${i + 1}: "${k}"`).join('\n      ')}
    - This is an AND relationship, NOT OR. A professor who only covers "${departmentKeywords[0]}" but not "${departmentKeywords[1] || departmentKeywords[0]}" is NOT a valid match.

    **SEARCH STRATEGY**:
    - Step 1: Search for each keyword COMBINATION together, e.g., query: "professor ${departmentKeywords.join(' ')} research"
    - Step 2: For each candidate found, VERIFY they have publications or teaching in EVERY keyword.
    - Step 3: If a professor only covers ${departmentKeywords.length - 1} out of ${departmentKeywords.length} keywords, they MAY be included but their matchScore MUST be penalized (subtract 20 points per missing keyword).

    **SCORING RULE FOR INTERDISCIPLINARY**:
    - Covers ALL ${departmentKeywords.length} keywords with evidence → matchScore 85-100
    - Covers ${departmentKeywords.length - 1} keywords → matchScore 60-75 (mark missing keyword in researchFit)
    - Covers only 1 keyword → matchScore ≤ 50 (include ONLY if no better candidates exist)

    **researchFit FORMAT (MANDATORY FOR INTERDISCIPLINARY)**:
    For each keyword, explicitly state whether covered:
    ${departmentKeywords.map(k => `"${k}": ✅ 覆盖 / ❌ 未覆盖 + 说明`).join('\n    ')}
` : ''}

    **ACADEMIC RANK / POSITION LOGIC (STRICT - DEFAULT IS FULL PROFESSOR)**:
    - **DEFAULT RULE**: If 'Target Position' is empty or vague, you MUST ONLY return **FULL PROFESSORS** (正教授).
    - **Regional Mapping**:
      - **USA/Canada**: "Professor" = Full. "Associate" = Mid. "Assistant" = Junior.
      - **UK/Australia/HK**: "Professor/Chair" = Full. "Reader" = Senior/Full. "Senior Lecturer" = Associate. "Lecturer" = Assistant.
    - **Filtering**:
      - User says "Professor" (or empty) -> **Full Professor ONLY**.
      - User says "Associate" -> Full & Associate accepted.
      - User says "Assistant" or "Any" -> All accepted.

    **URL & DATA SOURCING RULES**:
    - You are using Google Search and can see search result titles, snippets, and URLs.
    - For profileUrl: ONLY copy a URL you directly see in Google Search results. Do NOT construct or guess URLs based on URL patterns.
    - If no profile URL appears in search results for a professor, set profileUrl to "" (empty string).
    - For email: ONLY use emails explicitly shown in search result snippets. If not found, set to "".
    - For photoUrl: If you see a photo URL in search results, include it. Otherwise set to "".
    - This protocol exists because you CANNOT open web pages to verify them. Only use what you SEE in search snippets.

    **NEGATIVE FILTER**: Exclude any names/universities in "EXCLUSIONS".

    **OUTPUT RULES**:
    - **QS Ranking**: Include current QS World Ranking (e.g., "QS 2025: #15").
    - **Email**: Must be the official academic email.
    - **Research Areas**: Format as "English Term (中文翻译)".
    - **Match Reasoning**: Chinese, concise, verified.
    - **Language**: Simplified Chinese.

    **RECENT ACADEMIC ACTIVITIES (${currentYear - 5}-${currentYear}) - DETAILED PAPERS & PROJECTS**:
    - **MANDATORY CONTENT**: You MUST include the **Full Title** of the paper or project. 
    - **MANDATORY METADATA**: Every item MUST include the **Year** and **Type** (Journal vs Conference).
    - **STRICT FORMAT**: '[Year][Type-Level] Actual Title (Chinese Translation) - Source'
      - **Type-Level** examples: '[论文-顶刊]', '[论文-期刊]', '[论文-会议]', '[项目-国家级]', '[项目-省部级]'.
      - **Source** examples: 'Nature', 'Science', 'CVPR', 'ICML', 'IEEE Transactions on...', 'Journal of...'.
      - Correct: '[2024][论文-顶刊] Learning from Noise (从噪声中学习) - CVPR'
      - Correct: '[2023][论文-期刊] Deep Learning in Medicine (医学中的深度学习) - Nature Communications'
      - Incorrect: '[2025][论文-顶刊]' (MISSING TITLE)
      - Incorrect: 'Learning from Noise' (MISSING METADATA)
    - **2025 PRIORITY**: Aggressively search for 2025 works (Accepted, In Press, Preprints). **DO NOT IGNORE 2025**.
    - **QUANTITY**: List papers/activities you find in Google Search results. 2-3 real items is better than 5 fabricated ones. If you find none, return empty array [].
    - **VERIFICATION**: If the year or type is not immediately clear, search for the paper title to find its publication details.

    **SORTING**:
    - **STRICTLY Reverse Chronological**: ${currentYear} -> ${currentYear-1} -> ${currentYear-2}.
    - Top of the list MUST be the newest (${currentYear}/${currentYear-1}).

    Constraints:
    - **No Hallucinations**: If a URL or email is uncertain, DROP the candidate.
    - **No "Non-Chinese Citizen" Clause**: Do not hallucinate admission requirements.
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
        qsRanking: { type: Type.STRING },
        matchReasoning: {
          type: Type.OBJECT,
          properties: {
            locationCheck: { type: Type.STRING },
            universityCheck: { type: Type.STRING },
            departmentCheck: { type: Type.STRING },
            researchFit: { 
              type: Type.STRING, 
              description: isInterdisciplinary 
                ? `MUST evaluate EACH keyword separately. Format: "Keyword1: ✅/❌ evidence; Keyword2: ✅/❌ evidence; ...". Keywords: [${departmentKeywords.join(', ')}]`
                : "Academic background alignment analysis"
            },
            positionCheck: { type: Type.STRING },
            activityCheck: { type: Type.STRING },
            reputationCheck: { type: Type.STRING }
          },
          required: ["locationCheck", "universityCheck", "departmentCheck", "researchFit", "positionCheck", "activityCheck", "reputationCheck"]
        }
      },
      required: ["name", "title", "university", "matchScore", "researchAreas", "alignmentDetails", "isActive", "activitySummary", "recentActivities", "matchReasoning"]
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
    const rawResults = JSON.parse(jsonText) as FacultyMember[];
    // 清洗：过滤明显无效的数据
    return rawResults.map(prof => ({
      ...prof,
      // URL 基础验证：必须是 http(s) 开头且非纯域名首页
      profileUrl: (() => {
        if (!prof.profileUrl) return '';
        try {
          const u = new URL(prof.profileUrl);
          if (!['http:', 'https:'].includes(u.protocol)) return '';
          if (u.pathname === '/' || u.pathname === '') return '';
          return prof.profileUrl;
        } catch { return ''; }
      })(),
      // email 格式验证
      email: prof.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prof.email) ? prof.email : '',
      // photoUrl 验证
      photoUrl: prof.photoUrl && prof.photoUrl.startsWith('http') ? prof.photoUrl : '',
    }));
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

export const reduceAIDetection = async (content: string, mode: 'standard' | 'deep' = 'standard'): Promise<string> => {
  const ai = getClient();
  const prompt = `
    Task: Rewrite the following academic essay to reduce AI detection while preserving meaning, tone, and academic quality.
    
    Mode: ${mode === 'deep' ? 'Deep Humanization - Simulate natural human writing patterns, vary sentence length significantly, add occasional informal touches, use specific rather than generic language.' : 'Standard - Balance naturalness with academic rigor.'}
    
    Rules:
    1. Preserve the core arguments and evidence.
    2. Vary sentence structure: mix short punchy sentences with longer complex ones.
    3. Replace generic phrases with specific, personal language.
    4. Avoid AI clichés: "delve into", "it is worth noting", "in conclusion", "furthermore", "tapestry".
    5. Add natural imperfections: occasional parenthetical asides, rhetorical questions.
    6. Maintain academic vocabulary but reduce formulaic transitions.
    
    Original Text:
    """
    ${content}
    """
    
    Return ONLY the rewritten text. Do not include any explanation or metadata.
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  
  return response.text || content;
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
      Extract student information and faculty selection requirements from the following resume/document content and return it as a JSON object matching the Client interface structure.
      
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
        "interests": "...",
        "targetCountries": "意向国家",
        "targetUniversities": "意向院校",
        "targetDepartment": "专业范围",
        "entryYear": "入学年份",
        "scholarshipRequirement": "奖学金要求",
        "exclusions": "排除项/避开院校",
        "rankingPreference": "排名偏好",
        "acceptCrossDiscipline": true/false,
        "specialRequirements": "特殊需求",
        "hasRP": true/false,
        "hasCV": true/false,
        "hasPublications": true/false,
        "rpTopic": "RP题目",
        "businessCoordinator": "业务负责人",
        "selectionType": "择导类型",
        "selectionCount": 10,
        "selectionDeadline": "DDL日期",
        "avoidPreviousMentors": "是否避开之前导师"
      }
      
      If a field is not found, omit it or use null/undefined.
      Dates should be in YYYY-MM-DD format if possible.
      For boolean fields like hasRP, hasCV, acceptCrossDiscipline, infer from text (e.g., "有RP" -> true, "能接受交叉" -> true).
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
          text: `Extract student information and faculty selection requirements from the provided document and return it as a JSON object matching the Client interface structure.
          
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
            "interests": "...",
            "targetCountries": "意向国家",
            "targetUniversities": "意向院校",
            "targetDepartment": "专业范围",
            "entryYear": "入学年份",
            "scholarshipRequirement": "奖学金要求",
            "exclusions": "排除项/避开院校",
            "rankingPreference": "排名偏好",
            "acceptCrossDiscipline": true/false,
            "specialRequirements": "特殊需求",
            "hasRP": true/false,
            "hasCV": true/false,
            "hasPublications": true/false,
            "rpTopic": "RP题目",
            "businessCoordinator": "业务负责人",
            "selectionType": "择导类型",
            "selectionCount": 10,
            "selectionDeadline": "DDL日期",
            "avoidPreviousMentors": "是否避开之前导师"
          }
          
          If a field is not found, omit it or use null/undefined.
          Dates should be in YYYY-MM-DD format if possible.
          For boolean fields like hasRP, hasCV, acceptCrossDiscipline, infer from text (e.g., "有RP" -> true, "能接受交叉" -> true).`
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
    3. **CRITICAL**: You must find the **Official University Profile Page** and use it as the 'profileUrl'.
    4. **CRITICAL**: You must find the **Official Email** address.
    5. **CRITICAL**: You must find **Recent Academic Activities** (papers, projects) from 2020-2025.
       - **STRICT FORMAT**: '[Year][Type-Level] Actual Title (Chinese Translation) - Source'
       - **Type-Level**: '[论文-顶刊]', '[论文-期刊]', '[论文-会议]', '[项目-国家级]', '[项目-省部级]'.
       - **Source**: The journal name or conference name (e.g., Nature, CVPR).
       - **MANDATORY**: Every activity MUST have a Year and a Type. Search for the paper title specifically if needed to find these details.
    
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
    3. **QS Ranking**: Search specifically for "QS World University Rankings 2025" or "2024" to ensure accuracy. Use the official QS website (topuniversities.com) as the primary source.
    
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

    **IMPORTANT**: If you did NOT find a specific data point in search results, set its value to "未找到官方数据" and sourceUrl to "". Do NOT estimate or fabricate numbers. Returning "未找到" for all fields is acceptable and honest.
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
  const currentYear = new Date().getFullYear();
  const prompt = `
    Task: Update and verify information for this faculty member:
    Name: ${existing.name}
    University: ${existing.university}
    Current Data: ${JSON.stringify(existing)}
    
    Instructions:
    1. Search for the latest official profile.
    2. Update **Recent Activities** (${currentYear - 1}-${currentYear} focus).
       - **STRICT FORMAT**: '[Year][Type-Level] Actual Title (Chinese Translation) - Source'
       - **MANDATORY**: Every activity MUST have a Year and a Type (Journal/Conference).
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

