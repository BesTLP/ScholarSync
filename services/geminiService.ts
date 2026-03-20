
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FacultyMember, ImageSize, TargetOption, Client } from "../types";
import { getRuntimeConfig } from "./persistentStorage";

type Provider = 'openai' | 'gemini';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_GEMINI_WEB_FALLBACK_MODEL = 'gemini-2.5-pro';
const DEFAULT_OPENAI_WEB_MODEL = 'gpt-5';
const EMPTY_OFFICIAL_SOURCE_VALUES = ['未找到官方数据', 'Not found in official sources'] as const;

type WebSearchJsonOptions<T> = {
  schemaName: string;
  openAISchema: Record<string, unknown>;
  geminiSchema?: Schema;
  openAIModel?: string;
  geminiModel?: string;
  allowedDomains?: string[];
  parse: (text: string, provider: Provider) => T;
};

export interface ChatSession {
  sendMessage: (input: { message: string }) => Promise<{ text: string }>;
}

const getConfiguredOpenAIApiKey = () => getRuntimeConfig().openaiApiKey || process.env.OPENAI_API_KEY || '';
const getConfiguredGeminiApiKey = () => getRuntimeConfig().geminiApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';

const getProviderOrder = (preferred?: Provider, fallback?: Provider): Provider[] => {
  const config = getRuntimeConfig();
  const first = preferred || config.preferredProvider || 'openai';
  const second = fallback || config.fallbackProvider || 'gemini';
  return Array.from(new Set([first, second]));
};

const isProviderConfigured = (provider: Provider) => {
  return provider === 'openai' ? Boolean(getConfiguredOpenAIApiKey()) : Boolean(getConfiguredGeminiApiKey());
};

export const isOpenAIConfigured = () => isProviderConfigured('openai');
export const isGeminiConfigured = () => isProviderConfigured('gemini');
export const isAnyWebSearchProviderConfigured = () => isOpenAIConfigured() || isGeminiConfigured();

const getConfiguredGeminiModel = (fallback: string = DEFAULT_GEMINI_MODEL) => {
  const configured = getRuntimeConfig().geminiModel?.trim();
  return configured || fallback;
};

const getGeminiSearchModel = () => getConfiguredGeminiModel(DEFAULT_GEMINI_MODEL);
const getGeminiWebSearchModelCandidates = (preferred?: string) =>
  Array.from(
    new Set(
      [preferred?.trim(), getGeminiSearchModel(), DEFAULT_GEMINI_WEB_FALLBACK_MODEL]
        .filter(Boolean) as string[],
    ),
  );

/*
export const describeGeminiError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');

  if (message.includes('fetch failed') || message.includes('UND_ERR_CONNECT_TIMEOUT') || message.includes('Connect Timeout Error')) {
    return '无法连接到 Gemini 服务，当前更像是网络超时或代理 / 防火墙拦截，而不是 API Key 问题。';
  }

  if (message.includes('No Gemini API key configured')) {
    return '当前联网导师检索依赖 Gemini，请在设置页确认 Gemini API Key 已保存。';
  }

  if (message.includes('404') || message.includes('model')) {
    return `当前联网导师检索模型不可用，请在设置页检查 Gemini 模型名。当前保存值：${getConfiguredGeminiModel()}`;
  }

  if (message.includes('401') || message.includes('403') || message.toLowerCase().includes('api key')) {
    return 'Gemini API Key 无法通过校验，请在设置页重新保存后再试。';
  }

  return '联网导师检索暂时不可用，请稍后重试。';
};

export const describeWebSearchError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');

  if (message.includes('No web search provider configured') || message.includes('No AI provider is configured')) {
    return '联网搜索需要配置 OpenAI 或 Gemini API Key。';
  }

  if (message.includes('fetch failed') || message.includes('UND_ERR_CONNECT_TIMEOUT') || message.includes('Connect Timeout Error')) {
    return '无法连接到 OpenAI 联网搜索服务，当前更像是网络超时或代理 / 防火墙拦截，而不是 API Key 问题。';
  }

  if (message.includes('No OpenAI API key configured')) {
    return '当前联网导师检索优先依赖 OpenAI，请在设置页确认 OpenAI API Key 已保存。';
  }

  if (message.includes('OpenAI request failed (401)') || message.includes('OpenAI request failed (403)')) {
    return 'OpenAI API Key 校验失败，导师联网检索无法继续。';
  }

  if (message.includes('OpenAI request failed (404)') || (message.toLowerCase().includes('openai') && message.toLowerCase().includes('model'))) {
    return `OpenAI 联网检索模型不可用，请在设置页检查 OpenAI 模型名。当前保存值：${getRuntimeConfig().openaiModel || DEFAULT_OPENAI_WEB_MODEL}`;
  }

  if (message.toLowerCase().includes('all web search providers failed')) {
    return message.replace(new RegExp('^All web search providers failed:\\s*', 'i'), '');
  }

  return describeGeminiError(error);
};

*/

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error || ''));

const summarizeTechnicalError = (error: unknown, maxLength = 180) => {
  const compact = getErrorMessage(error)
    .replace(/sk-[A-Za-z0-9_-]+/g, 'sk-***')
    .replace(/AIza[0-9A-Za-z_-]+/g, 'AIza***')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***')
    .replace(/\s+/g, ' ')
    .trim();

  if (!compact) {
    return '';
  }

  return compact.length > maxLength ? `${compact.slice(0, maxLength)}...` : compact;
};

const buildUnknownProviderError = (providerLabel: string, error: unknown) => {
  const detail = summarizeTechnicalError(error);
  return detail
    ? `${providerLabel} 联网检索暂时不可用：${detail}`
    : `${providerLabel} 联网检索暂时不可用，请稍后重试。`;
};

const isGeminiWebSearchStructuredOutputUnsupported = (error: unknown) => {
  const lowerMessage = getErrorMessage(error).toLowerCase();
  return (
    lowerMessage.includes('schema') ||
    lowerMessage.includes('response schema') ||
    lowerMessage.includes('response_schema') ||
    lowerMessage.includes('google search') ||
    lowerMessage.includes('googlesearch') ||
    lowerMessage.includes('tool')
  );
};

const shouldRetryGeminiWebSearchWithFallbackModel = (error: unknown) => {
  const lowerMessage = getErrorMessage(error).toLowerCase();
  return (
    isGeminiWebSearchStructuredOutputUnsupported(error) ||
    lowerMessage.includes('404') ||
    lowerMessage.includes('unsupported model') ||
    (lowerMessage.includes('model') && (lowerMessage.includes('not found') || lowerMessage.includes('not exist')))
  );
};

export const describeGeminiError = (error: unknown) => {
  const message = getErrorMessage(error);
  const lowerMessage = message.toLowerCase();

  if (message.includes('fetch failed') || message.includes('UND_ERR_CONNECT_TIMEOUT') || message.includes('Connect Timeout Error')) {
    return '无法连接到 Gemini 服务，当前更像是网络超时、代理或防火墙问题，而不是 API Key 问题。';
  }

  if (message.includes('No Gemini API key configured')) {
    return '当前联网检索依赖 Gemini，请先在设置页确认 Gemini API Key 已保存。';
  }

  if (message.includes('401') || message.includes('403') || lowerMessage.includes('api key')) {
    return 'Gemini API Key 校验失败，请在设置页重新保存后再试。';
  }

  if (message.includes('429') || lowerMessage.includes('rate limit') || lowerMessage.includes('quota')) {
    return 'Gemini 请求达到速率或额度限制，请稍后重试，或检查当前账号额度。';
  }

  if (
    message.includes('400') &&
    (
      lowerMessage.includes('schema') ||
      lowerMessage.includes('response schema') ||
      lowerMessage.includes('response_schema') ||
      lowerMessage.includes('google search') ||
      lowerMessage.includes('googlesearch') ||
      lowerMessage.includes('tool')
    )
  ) {
    return 'Gemini 联网检索请求格式或工具能力不被当前模型支持，请尝试切换 Gemini 模型，或暂时改用 OpenAI。';
  }

  if (
    message.includes('404') ||
    lowerMessage.includes('unsupported model') ||
    (lowerMessage.includes('model') && (lowerMessage.includes('not found') || lowerMessage.includes('not exist')))
  ) {
    return `Gemini 联网检索模型不可用，请检查设置页里的 Gemini 模型名称。当前保存值：${getConfiguredGeminiModel()}`;
  }

  return buildUnknownProviderError('Gemini', error);
};

export const describeWebSearchError = (error: unknown) => {
  const message = getErrorMessage(error);
  const lowerMessage = message.toLowerCase();

  if (message.includes('No web search provider configured') || message.includes('No AI provider is configured')) {
    return '联网搜索需要配置 OpenAI 或 Gemini API Key。';
  }

  if (message.includes('fetch failed') || message.includes('UND_ERR_CONNECT_TIMEOUT') || message.includes('Connect Timeout Error')) {
    return '无法连接到 OpenAI 联网搜索服务，当前更像是网络超时、代理或防火墙问题，而不是 API Key 问题。';
  }

  if (message.includes('No OpenAI API key configured')) {
    return '当前联网检索优先依赖 OpenAI，请先在设置页确认 OpenAI API Key 已保存。';
  }

  if (message.includes('OpenAI request failed (401)') || message.includes('OpenAI request failed (403)')) {
    return 'OpenAI API Key 校验失败，联网检索无法继续。';
  }

  if (message.includes('OpenAI request failed (429)') || lowerMessage.includes('rate limit') || lowerMessage.includes('quota')) {
    return 'OpenAI 请求达到速率或额度限制，请稍后重试，或检查当前账号额度。';
  }

  if (lowerMessage.includes('invalid schema for response_format') || (lowerMessage.includes('response_format') && lowerMessage.includes('schema'))) {
    return 'OpenAI 联网检索返回格式配置有误，当前请求已被服务端拒绝。';
  }

  if (
    message.includes('OpenAI request failed (404)') ||
    (message.includes('OpenAI request failed (400)') &&
      (lowerMessage.includes('web_search') || lowerMessage.includes('unsupported') || lowerMessage.includes('tool'))) ||
    (lowerMessage.includes('openai') && lowerMessage.includes('model'))
  ) {
    return `OpenAI 联网检索模型不可用，请检查设置页里的 OpenAI 模型名称。当前保存值：${getRuntimeConfig().openaiModel || DEFAULT_OPENAI_WEB_MODEL}`;
  }

  if (lowerMessage.includes('all web search providers failed')) {
    return message.replace(/^All web search providers failed:\s*/i, '');
  }

  return buildUnknownProviderError('OpenAI', error);
};

const extractAllowedDomains = (...urls: Array<string | undefined>) =>
  Array.from(
    new Set(
      urls
        .flatMap((value) => {
          if (!value) return [];
          try {
            return [new URL(value).hostname.replace(/^www\./, '')];
          } catch {
            return [];
          }
        })
        .filter(Boolean),
    ),
  );

// Initialize the Gemini client
const getGeminiClient = () => {
  const apiKey = getConfiguredGeminiApiKey();
  if (!apiKey) {
    throw new Error("No Gemini API key configured. Please update the desktop provider config.");
  }
  return new GoogleGenAI({ apiKey });
};

const stripCodeFences = (value: string): string =>
  value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

const parseJsonResponse = <T>(text: string): T => JSON.parse(stripCodeFences(text)) as T;

const OPENAI_ARRAY_SCHEMA_RESULT_KEY = 'results';

const prepareOpenAIJsonSchema = (schema?: Record<string, unknown>) => {
  if (!schema) {
    return null;
  }

  if (schema.type !== 'array') {
    return {
      schema,
      unwrap: (text: string) => text,
    };
  }

  return {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        [OPENAI_ARRAY_SCHEMA_RESULT_KEY]: schema,
      },
      required: [OPENAI_ARRAY_SCHEMA_RESULT_KEY],
    } satisfies Record<string, unknown>,
    unwrap: (text: string) => {
      const parsed = parseJsonResponse<Record<string, unknown>>(text);
      const results = parsed?.[OPENAI_ARRAY_SCHEMA_RESULT_KEY];

      if (!Array.isArray(results)) {
        throw new Error('OpenAI web search returned invalid wrapped JSON.');
      }

      return JSON.stringify(results);
    },
  };
};

const createEmptyMatchReasoning = (): FacultyMember['matchReasoning'] => ({
  locationCheck: '',
  universityCheck: '',
  departmentCheck: '',
  researchFit: '',
  positionCheck: '',
  activityCheck: '',
  reputationCheck: '',
});

const sanitizeHttpUrl = (value?: string, options?: { allowRoot?: boolean }) => {
  const candidate = value?.trim();
  if (!candidate) return '';

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (!options?.allowRoot && (parsed.pathname === '/' || parsed.pathname === '')) return '';
    return candidate;
  } catch {
    return '';
  }
};

const sanitizeEmail = (value?: string) => {
  const candidate = value?.trim();
  return candidate && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : '';
};

const sanitizeMatchReasoning = (
  value?: Partial<FacultyMember['matchReasoning']>,
  fallback?: FacultyMember['matchReasoning'],
): FacultyMember['matchReasoning'] => ({
  locationCheck: value?.locationCheck?.trim() || fallback?.locationCheck || '',
  universityCheck: value?.universityCheck?.trim() || fallback?.universityCheck || '',
  departmentCheck: value?.departmentCheck?.trim() || fallback?.departmentCheck || '',
  researchFit: value?.researchFit?.trim() || fallback?.researchFit || '',
  positionCheck: value?.positionCheck?.trim() || fallback?.positionCheck || '',
  activityCheck: value?.activityCheck?.trim() || fallback?.activityCheck || '',
  reputationCheck: value?.reputationCheck?.trim() || fallback?.reputationCheck || '',
});

const normalizeFacultyMember = (value: Partial<FacultyMember>, fallback?: FacultyMember): FacultyMember => ({
  name: value.name?.trim() || fallback?.name || '',
  title: value.title?.trim() || fallback?.title || '',
  university: value.university?.trim() || fallback?.university || '',
  school: value.school?.trim() || fallback?.school || '',
  department: value.department?.trim() || fallback?.department || '',
  matchScore: typeof value.matchScore === 'number' ? value.matchScore : fallback?.matchScore || 0,
  researchAreas: Array.isArray(value.researchAreas)
    ? value.researchAreas.map((item) => item?.trim()).filter(Boolean) as string[]
    : fallback?.researchAreas || [],
  alignmentDetails: value.alignmentDetails?.trim() || fallback?.alignmentDetails || '',
  activitySummary: value.activitySummary?.trim() || fallback?.activitySummary || '',
  recentActivities: Array.isArray(value.recentActivities)
    ? value.recentActivities.map((item) => item?.trim()).filter(Boolean) as string[]
    : fallback?.recentActivities || [],
  isActive: typeof value.isActive === 'boolean' ? value.isActive : fallback?.isActive ?? true,
  profileUrl: sanitizeHttpUrl(value.profileUrl) || fallback?.profileUrl || '',
  photoUrl: sanitizeHttpUrl(value.photoUrl, { allowRoot: true }) || fallback?.photoUrl || '',
  email: sanitizeEmail(value.email) || fallback?.email || '',
  qsRanking: value.qsRanking?.trim() || fallback?.qsRanking || '',
  qsRankingData: value.qsRankingData || fallback?.qsRankingData,
  deadlineData: value.deadlineData || fallback?.deadlineData,
  applicationReqsData: value.applicationReqsData || fallback?.applicationReqsData,
  rpReqsData: value.rpReqsData || fallback?.rpReqsData,
  tuitionData: value.tuitionData || fallback?.tuitionData,
  scholarshipData: value.scholarshipData || fallback?.scholarshipData,
  programUrl: sanitizeHttpUrl(value.programUrl, { allowRoot: true }) || fallback?.programUrl || '',
  universityUrl: sanitizeHttpUrl(value.universityUrl, { allowRoot: true }) || fallback?.universityUrl || '',
  matchReasoning: sanitizeMatchReasoning(value.matchReasoning, fallback?.matchReasoning || createEmptyMatchReasoning()),
  matchSource: value.matchSource || fallback?.matchSource,
  evidenceUrls: Array.isArray(value.evidenceUrls)
    ? value.evidenceUrls.map((item) => sanitizeHttpUrl(item, { allowRoot: true })).filter(Boolean)
    : fallback?.evidenceUrls,
  evaluation: value.evaluation || fallback?.evaluation,
  dimensionTags: Array.isArray(value.dimensionTags) ? value.dimensionTags.filter(Boolean) : fallback?.dimensionTags,
});

const normalizeFacultyResults = (value: Array<Partial<FacultyMember>>) =>
  value.map((item) => normalizeFacultyMember(item)).filter((item) => Boolean(item.name && item.university));

/*

const normalizeSourceData = (value?: { value?: string; sourceUrl?: string }) => ({
  value: value?.value?.trim() || '未找到官方数据',
  sourceUrl: sanitizeHttpUrl(value?.sourceUrl, { allowRoot: true }),
});

const hasMeaningfulSourceValue = (value?: string) => {
  const normalized = value?.trim();
  return Boolean(normalized && normalized !== '未找到官方数据');
};

*/

const normalizeSourceData = (value?: { value?: string; sourceUrl?: string }) => ({
  value: value?.value?.trim() || EMPTY_OFFICIAL_SOURCE_VALUES[1],
  sourceUrl: sanitizeHttpUrl(value?.sourceUrl, { allowRoot: true }),
});

const hasMeaningfulSourceValue = (value?: string) => {
  const normalized = value?.trim();
  return Boolean(normalized && !EMPTY_OFFICIAL_SOURCE_VALUES.includes(normalized as (typeof EMPTY_OFFICIAL_SOURCE_VALUES)[number]));
};

const combineProviderErrors = (messages: string[]) => {
  const uniqueMessages = Array.from(
    new Set(
      messages
        .map((message) => message.trim())
        .filter(Boolean),
    ),
  );

  return uniqueMessages.join('；');
};

const extractOpenAIText = (payload: any): string => {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const chunks: string[] = [];
  const output = Array.isArray(payload?.output) ? payload.output : [];

  output.forEach((item: any) => {
    if (typeof item?.text === 'string' && item.text.trim()) {
      chunks.push(item.text.trim());
    }
    const content = Array.isArray(item?.content) ? item.content : [];
    content.forEach((part: any) => {
      if (typeof part?.text === 'string' && part.text.trim()) {
        chunks.push(part.text.trim());
      }
      if (typeof part?.output_text === 'string' && part.output_text.trim()) {
        chunks.push(part.output_text.trim());
      }
    });
  });

  return chunks.join('\n').trim();
};

const runOpenAITextPrompt = async (prompt: string, options?: { systemInstruction?: string; model?: string }): Promise<string> => {
  const config = getRuntimeConfig();
  const apiKey = getConfiguredOpenAIApiKey();
  if (!apiKey) {
    throw new Error('No OpenAI API key configured.');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options?.model || config.openaiModel || 'gpt-5',
      input: [
        ...(options?.systemInstruction
          ? [{ role: 'system', content: [{ type: 'input_text', text: options.systemInstruction }] }]
          : []),
        { role: 'user', content: [{ type: 'input_text', text: prompt }] },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const text = extractOpenAIText(payload);
  if (!text) {
    throw new Error('OpenAI returned an empty response.');
  }
  return text;
};

const runOpenAIWebSearchPrompt = async (
  prompt: string,
  options?: {
    model?: string;
    systemInstruction?: string;
    jsonSchema?: Record<string, unknown>;
    schemaName?: string;
    allowedDomains?: string[];
  },
): Promise<string> => {
  const config = getRuntimeConfig();
  const apiKey = getConfiguredOpenAIApiKey();
  const preparedJsonSchema = prepareOpenAIJsonSchema(options?.jsonSchema);
  if (!apiKey) {
    throw new Error('No OpenAI API key configured.');
  }

  const payload: Record<string, unknown> = {
    model: options?.model || config.openaiModel || DEFAULT_OPENAI_WEB_MODEL,
    reasoning: { effort: 'low' },
    tool_choice: 'auto',
    tools: [
      {
        type: 'web_search',
        ...(options?.allowedDomains && options.allowedDomains.length > 0
          ? {
              filters: {
                allowed_domains: options.allowedDomains,
              },
            }
          : {}),
      },
    ],
    input: [
      ...(options?.systemInstruction
        ? [{ role: 'system', content: [{ type: 'input_text', text: options.systemInstruction }] }]
        : []),
      { role: 'user', content: [{ type: 'input_text', text: prompt }] },
    ],
  };

  if (preparedJsonSchema) {
    payload.text = {
      format: {
        type: 'json_schema',
        name: options.schemaName || 'web_search_result',
        strict: true,
        schema: preparedJsonSchema.schema,
      },
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const text = extractOpenAIText(result);
  if (!text) {
    throw new Error('OpenAI web search returned an empty response.');
  }
  return preparedJsonSchema ? preparedJsonSchema.unwrap(text) : text;
};

const runGeminiWebSearchPrompt = async (
  prompt: string,
  options?: { model?: string; responseSchema?: Schema },
): Promise<string> => {
  const ai = getGeminiClient();
  const models = getGeminiWebSearchModelCandidates(options?.model);
  let lastError: unknown;

  const runAttempt = async (model: string, promptText: string, responseSchema?: Schema) => {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      config: {
        responseMimeType: 'application/json',
        ...(responseSchema ? { responseSchema } : {}),
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Gemini web search returned an empty response.');
    }

    return text;
  };

  for (const model of models) {
    try {
      return await runAttempt(model, prompt, options?.responseSchema);
    } catch (error) {
      lastError = error;

      if (options?.responseSchema && isGeminiWebSearchStructuredOutputUnsupported(error)) {
        try {
          console.warn(`Gemini web search structured output is unsupported for ${model}, retrying without response schema.`, error);
          return await runAttempt(
            model,
            `${prompt}\n\nReturn only valid JSON matching the requested schema. Do not include Markdown fences or explanatory text.`,
          );
        } catch (fallbackError) {
          lastError = fallbackError;
        }
      }

      if (!shouldRetryGeminiWebSearchWithFallbackModel(error)) {
        break;
      }

      console.warn(`Gemini web search model ${model} failed, trying fallback model if available.`, error);
    }
  }

  throw lastError || new Error('Gemini web search failed.');
};

const runPreferredWebSearchJson = async <T>(prompt: string, options: WebSearchJsonOptions<T>): Promise<T> => {
  const providers = getProviderOrder();
  const errors: string[] = [];
  let attempted = false;

  for (const provider of providers) {
    if (!isProviderConfigured(provider)) {
      continue;
    }

    attempted = true;

    try {
      if (provider === 'openai') {
        const text = await runOpenAIWebSearchPrompt(prompt, {
          model: options.openAIModel || getRuntimeConfig().openaiModel || DEFAULT_OPENAI_WEB_MODEL,
          jsonSchema: options.openAISchema,
          schemaName: options.schemaName,
          allowedDomains: options.allowedDomains,
        });
        return options.parse(text, provider);
      }

      const text = await runGeminiWebSearchPrompt(prompt, {
        model: options.geminiModel || getGeminiSearchModel(),
        responseSchema: options.geminiSchema,
      });
      return options.parse(text, provider);
    } catch (error) {
      console.warn(`Web search provider ${provider} failed, trying fallback if available.`, error);
      errors.push(provider === 'openai' ? describeWebSearchError(error) : describeGeminiError(error));
    }
  }

  if (!attempted) {
    throw new Error('No web search provider configured. Please configure OpenAI or Gemini API key.');
  }

  throw new Error(`All web search providers failed: ${combineProviderErrors(errors)}`);
};

const runGeminiTextPrompt = async (
  prompt: string,
  options?: { model?: string; systemInstruction?: string; responseMimeType?: 'application/json' | 'text/plain' },
): Promise<string> => {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: options?.model || getConfiguredGeminiModel(MODEL_FAST),
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      ...(options?.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
      ...(options?.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
    },
  });

  return response.text || '';
};

const runPreferredTextPrompt = async (
  prompt: string,
  options?: {
    openaiModel?: string;
    geminiModel?: string;
    systemInstruction?: string;
    responseMimeType?: 'application/json' | 'text/plain';
    preferred?: Provider;
    fallback?: Provider;
    geminiOnly?: boolean;
  },
): Promise<string> => {
  if (options?.geminiOnly) {
    return runGeminiTextPrompt(prompt, {
      model: options.geminiModel,
      systemInstruction: options.systemInstruction,
      responseMimeType: options.responseMimeType,
    });
  }

  const providers = getProviderOrder(options?.preferred, options?.fallback);
  let lastError: unknown;

  for (const provider of providers) {
    if (!isProviderConfigured(provider)) {
      continue;
    }

    try {
      if (provider === 'openai') {
        return await runOpenAITextPrompt(prompt, {
          model: options?.openaiModel,
          systemInstruction: options?.systemInstruction,
        });
      }

      return await runGeminiTextPrompt(prompt, {
        model: options?.geminiModel,
        systemInstruction: options?.systemInstruction,
        responseMimeType: options?.responseMimeType,
      });
    } catch (error) {
      console.warn(`Provider ${provider} failed, trying fallback if available.`, error);
      lastError = error;
    }
  }

  throw lastError || new Error('No AI provider is configured.');
};

const getClient = getGeminiClient;

const MODEL_FACULTY_MATCHER = DEFAULT_GEMINI_WEB_FALLBACK_MODEL;
const MODEL_IMAGE_GEN = 'gemini-3-pro-image-preview';
const MODEL_CHAT = DEFAULT_GEMINI_MODEL;
const MODEL_FAST = 'gemini-flash-lite-latest'; // Use Flash Lite for fast text parsing

const SUPPORTED_BINARY_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function parseDataUrl(fileData: string): { mimeType?: string; base64Data?: string } {
  const match = fileData.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) {
    return {};
  }

  return {
    mimeType: match[1],
    base64Data: match[2],
  };
}

function decodeBase64Utf8(base64Data: string): string {
  const binary = atob(base64Data);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function normalizeClientFileMimeType(fileData: string, mimeType?: string): string {
  const parsed = parseDataUrl(fileData);
  return mimeType || parsed.mimeType || 'text/plain';
}

function extractTextContent(fileData: string): string {
  const parsed = parseDataUrl(fileData);
  if (!parsed.base64Data) {
    return fileData;
  }

  return decodeBase64Utf8(parsed.base64Data);
}

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

const buildLooseFacultySearchQuery = (params: MatchParams) => {
  const targetScope = params.targets
    .map((target) => [target.region, target.university].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(' / ');

  return [
    targetScope,
    params.department,
    params.targetPosition,
    params.entryYear ? `${params.entryYear} intake` : '',
    params.scholarship ? `scholarship ${params.scholarship}` : '',
    'faculty official profile research',
  ]
    .filter(Boolean)
    .join(' / ')
    .trim();
};

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
    const jsonText = await runPreferredTextPrompt(prompt, {
      openaiModel: 'gpt-5',
      geminiModel: MODEL_FAST,
      responseMimeType: 'application/json',
    });
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
    const jsonText = await runPreferredTextPrompt(prompt, {
      openaiModel: 'gpt-5',
      geminiModel: MODEL_FAST,
      responseMimeType: 'application/json',
    });
    return JSON.parse(stripCodeFences(jsonText || '{}')) as FieldDecomposition;
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

    **ACADEMIC RANK / POSITION LOGIC (PRIORITIZE SENIOR FACULTY)**:
    - **DEFAULT RULE**: If 'Target Position' is empty or vague, PRIORITIZE **FULL / ASSOCIATE PROFESSORS** first, but if results are too sparse, you MAY include strong Assistant Professors / Lecturers with a lower matchScore.
    - **Regional Mapping**:
      - **USA/Canada**: "Professor" = Full. "Associate" = Mid. "Assistant" = Junior.
      - **UK/Australia/HK**: "Professor/Chair" = Full. "Reader" = Senior/Full. "Senior Lecturer" = Associate. "Lecturer" = Assistant.
    - **Filtering**:
      - User says "Professor" -> Prefer Full Professor, then Associate if needed.
      - User says "Associate" -> Full & Associate accepted.
      - User says "Assistant" or "Any" -> All accepted.

    **URL & DATA SOURCING RULES**:
    - Prefer official faculty profile pages, department directories, lab pages, or university people pages as profileUrl.
    - If you cannot verify an exact faculty profile URL, you MAY keep profileUrl as "" and still return the candidate.
    - If no official email is clearly available, set email to "" instead of dropping the candidate.
    - For photoUrl: If you see a reliable photo URL, include it. Otherwise set to "".
    - Do NOT fabricate URLs or emails, but do not discard an otherwise strong candidate solely because email/photo/profile URL is missing.

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
    - **No Hallucinations**: If a URL or email is uncertain, leave it empty instead of inventing it.
    - **Prefer useful partial matches over empty results**: If admission data is incomplete, you may still return a strong faculty candidate with missing fields left empty.
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

  const openAIResponseSchema = {
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        title: { type: 'string' },
        university: { type: 'string' },
        matchScore: { type: 'integer' },
        researchAreas: {
          type: 'array',
          items: { type: 'string' },
        },
        alignmentDetails: { type: 'string' },
        activitySummary: { type: 'string' },
        recentActivities: {
          type: 'array',
          items: { type: 'string' },
        },
        isActive: { type: 'boolean' },
        profileUrl: { type: 'string' },
        photoUrl: { type: 'string' },
        email: { type: 'string' },
        qsRanking: { type: 'string' },
        matchReasoning: {
          type: 'object',
          additionalProperties: false,
          properties: {
            locationCheck: { type: 'string' },
            universityCheck: { type: 'string' },
            departmentCheck: { type: 'string' },
            researchFit: { type: 'string' },
            positionCheck: { type: 'string' },
            activityCheck: { type: 'string' },
            reputationCheck: { type: 'string' },
          },
          required: [
            'locationCheck',
            'universityCheck',
            'departmentCheck',
            'researchFit',
            'positionCheck',
            'activityCheck',
            'reputationCheck',
          ],
        },
      },
      required: [
        'name',
        'title',
        'university',
        'matchScore',
        'researchAreas',
        'alignmentDetails',
        'activitySummary',
        'recentActivities',
        'isActive',
        'profileUrl',
        'photoUrl',
        'email',
        'qsRanking',
        'matchReasoning',
      ],
    },
  } as const;

  const sanitizeFacultyResults = (rawResults: FacultyMember[]) =>
    rawResults.map((prof) => ({
      ...prof,
      profileUrl: (() => {
        if (!prof.profileUrl) return '';
        try {
          const u = new URL(prof.profileUrl);
          if (!['http:', 'https:'].includes(u.protocol)) return '';
          if (u.pathname === '/' || u.pathname === '') return '';
          return prof.profileUrl;
        } catch {
          return '';
        }
      })(),
      email: prof.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prof.email) ? prof.email : '',
      photoUrl: prof.photoUrl && prof.photoUrl.startsWith('http') ? prof.photoUrl : '',
    }));

  const runLooseFacultyFallback = async () => {
    const fallbackQuery = buildLooseFacultySearchQuery(params);
    if (!fallbackQuery) {
      return [];
    }

    console.warn('Structured faculty matching returned no usable results, retrying with loose faculty web search query.', fallbackQuery);
    return (await searchFacultyByWeb(fallbackQuery)).slice(0, totalCount);
  };

  const allowedDomains = extractAllowedDomains(directoryUrl);
  let openAIWebSearchError: unknown = null;

  if (isProviderConfigured('openai')) {
    try {
      const jsonText = await runOpenAIWebSearchPrompt(promptContent, {
        model: getRuntimeConfig().openaiModel || DEFAULT_OPENAI_WEB_MODEL,
        jsonSchema: openAIResponseSchema,
        schemaName: 'faculty_matches',
        allowedDomains,
      });
      const results = sanitizeFacultyResults(JSON.parse(stripCodeFences(jsonText || '[]')) as FacultyMember[]);
      if (results.length > 0) {
        return results;
      }
      console.warn('OpenAI structured faculty matching returned no results, falling back to Gemini.');
    } catch (error) {
      openAIWebSearchError = error;
      console.warn('OpenAI web search failed, falling back to Gemini.', error);
    }
  }

  try {
    const jsonText = await runGeminiWebSearchPrompt(promptContent, {
      model: MODEL_FACULTY_MATCHER,
      responseSchema,
    });
    const rawResults = JSON.parse(stripCodeFences(jsonText)) as FacultyMember[];
    const structuredResults = rawResults.map(prof => ({
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
    if (structuredResults.length > 0) {
      return structuredResults;
    }

    return await runLooseFacultyFallback();
  } catch (error) {
    console.error("Faculty matching failed:", error);
    try {
      const fallbackResults = await runLooseFacultyFallback();
      if (fallbackResults.length > 0) {
        return fallbackResults;
      }
    } catch (fallbackError) {
      console.error('Loose faculty web search fallback failed:', fallbackError);
    }

    if (openAIWebSearchError) {
      throw new Error(
        `All web search providers failed: ${combineProviderErrors([
          describeWebSearchError(openAIWebSearchError),
          describeGeminiError(error),
        ])}`,
      );
    }
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

export const createChatSession = (): ChatSession => {
  const config = getRuntimeConfig();
  const systemInstruction = "You are a helpful academic assistant.";
  const providerOrder = getProviderOrder();

  if (providerOrder[0] === 'openai' && isProviderConfigured('openai')) {
    const history: Array<{ role: 'user' | 'assistant'; text: string }> = [];
    return {
      sendMessage: async ({ message }) => {
        const prompt = [
          ...history.map((item) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.text}`),
          `User: ${message}`,
          'Assistant:',
        ].join('\n\n');

        try {
          const text = await runPreferredTextPrompt(prompt, {
            openaiModel: config.openaiModel || MODEL_CHAT,
            geminiModel: MODEL_CHAT,
            systemInstruction,
          });
          history.push({ role: 'user', text: message });
          history.push({ role: 'assistant', text });
          return { text };
        } catch (error) {
          console.error('Chat session failed:', error);
          throw error;
        }
      },
    };
  }

  const ai = getGeminiClient();
  const chat = ai.chats.create({
    model: MODEL_CHAT,
    config: {
      systemInstruction,
    }
  });

  return {
    sendMessage: async ({ message }) => {
      const response = await chat.sendMessage({ message });
      return { text: response.text || '' };
    },
  };
};

export const getFastResponse = async (query: string): Promise<string> => {
  return runPreferredTextPrompt(query, {
    openaiModel: 'gpt-5',
    geminiModel: MODEL_FAST,
  });
};

export const reduceAIDetection = async (content: string, mode: 'standard' | 'deep' = 'standard'): Promise<string> => {
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
  
  try {
    return await runPreferredTextPrompt(prompt, {
      openaiModel: 'gpt-5',
      geminiModel: 'gemini-2.5-flash',
    });
  } catch (error) {
    console.error("Error reducing AI detection:", error);
    return content;
  }
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
    const text = await runPreferredTextPrompt(prompt, {
      openaiModel: 'gpt-5',
      geminiModel: 'gemini-2.5-flash',
      responseMimeType: 'application/json',
    });
    if (!text) return [];
    return JSON.parse(stripCodeFences(text));
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
    return await runPreferredTextPrompt(prompt, {
      openaiModel: 'gpt-5',
      geminiModel: 'gemini-2.5-flash',
    });
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
    return await runPreferredTextPrompt(prompt, {
      openaiModel: 'gpt-5',
      geminiModel: 'gemini-2.5-flash',
    });
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
    return await runPreferredTextPrompt(prompt, {
      openaiModel: 'gpt-5',
      geminiModel: 'gemini-2.5-flash',
    });
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
    return await runPreferredTextPrompt(prompt, {
      openaiModel: 'gpt-5',
      geminiModel: 'gemini-2.5-flash',
    });
  } catch (error) {
    console.error("Error generating CV:", error);
    return "Failed to generate CV.";
  }
}

export async function parseResumeContent(fileContent: string): Promise<Partial<Client>> {
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
    const text = await runPreferredTextPrompt(prompt, {
      openaiModel: 'gpt-5',
      geminiModel: 'gemini-3-flash-preview',
      responseMimeType: 'application/json',
    });
    if (!text) return {};
    return JSON.parse(stripCodeFences(text));
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
  const normalizedMimeType = normalizeClientFileMimeType(fileData, mimeType);
  
  let contents: any;

  if (normalizedMimeType.startsWith('text/')) {
    let textContent = fileData;
    try {
      textContent = extractTextContent(fileData);
    } catch (error) {
      console.warn('Failed to decode text file with UTF-8, using raw data.', error);
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
    const parsed = parseDataUrl(fileData);
    const base64Data = parsed.base64Data || fileData;

    if (!normalizedMimeType.startsWith('image/') && !SUPPORTED_BINARY_MIME_TYPES.has(normalizedMimeType)) {
      throw new Error(`Unsupported file type for parsing: ${normalizedMimeType}`);
    }

    contents = {
      parts: [
        {
          inlineData: {
            mimeType: normalizedMimeType,
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
    const geminiSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          title: { type: Type.STRING },
          university: { type: Type.STRING },
          school: { type: Type.STRING },
          department: { type: Type.STRING },
          email: { type: Type.STRING },
          profileUrl: { type: Type.STRING },
          photoUrl: { type: Type.STRING },
          researchAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
          recentActivities: { type: Type.ARRAY, items: { type: Type.STRING } },
          activitySummary: { type: Type.STRING },
          isActive: { type: Type.BOOLEAN },
          matchScore: { type: Type.INTEGER },
          alignmentDetails: { type: Type.STRING },
          matchReasoning: {
            type: Type.OBJECT,
            properties: {
              locationCheck: { type: Type.STRING },
              universityCheck: { type: Type.STRING },
              departmentCheck: { type: Type.STRING },
              positionCheck: { type: Type.STRING },
              activityCheck: { type: Type.STRING },
              reputationCheck: { type: Type.STRING },
              researchFit: { type: Type.STRING },
            },
            required: [
              'locationCheck',
              'universityCheck',
              'departmentCheck',
              'positionCheck',
              'activityCheck',
              'reputationCheck',
              'researchFit',
            ],
          },
        },
        required: [
          'name',
          'title',
          'university',
          'researchAreas',
          'recentActivities',
          'activitySummary',
          'isActive',
          'matchScore',
          'alignmentDetails',
          'matchReasoning',
        ],
      },
    };

    const openAISchema = {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          title: { type: 'string' },
          university: { type: 'string' },
          school: { type: 'string' },
          department: { type: 'string' },
          email: { type: 'string' },
          profileUrl: { type: 'string' },
          photoUrl: { type: 'string' },
          researchAreas: { type: 'array', items: { type: 'string' } },
          recentActivities: { type: 'array', items: { type: 'string' } },
          activitySummary: { type: 'string' },
          isActive: { type: 'boolean' },
          matchScore: { type: 'integer' },
          alignmentDetails: { type: 'string' },
          matchReasoning: {
            type: 'object',
            additionalProperties: false,
            properties: {
              locationCheck: { type: 'string' },
              universityCheck: { type: 'string' },
              departmentCheck: { type: 'string' },
              positionCheck: { type: 'string' },
              activityCheck: { type: 'string' },
              reputationCheck: { type: 'string' },
              researchFit: { type: 'string' },
            },
            required: [
              'locationCheck',
              'universityCheck',
              'departmentCheck',
              'positionCheck',
              'activityCheck',
              'reputationCheck',
              'researchFit',
            ],
          },
        },
        required: [
          'name',
          'title',
          'university',
          'researchAreas',
          'recentActivities',
          'activitySummary',
          'isActive',
          'matchScore',
          'alignmentDetails',
          'matchReasoning',
        ],
      },
    } as const;

    const rawResults = await runPreferredWebSearchJson<Array<Partial<FacultyMember>>>(prompt, {
      schemaName: 'faculty_web_search_results',
      openAISchema,
      geminiSchema,
      parse: (text) => {
        const parsed = parseJsonResponse<unknown>(text);
        if (!Array.isArray(parsed)) {
          throw new Error('Faculty web search returned invalid JSON.');
        }
        return parsed as Array<Partial<FacultyMember>>;
      },
    });

    return normalizeFacultyResults(rawResults);
  } catch (error) {
    console.error("Web search for faculty failed:", error);
    throw error;
  }
};

export const searchUniversityInfo = async (university: string, department?: string): Promise<any> => {
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
    type UniversitySearchResult = {
      university?: string;
      qsRanking?: string;
      website?: string;
      tuition?: { value?: string; sourceUrl?: string };
      deadline?: { value?: string; sourceUrl?: string };
      requirements?: { value?: string; sourceUrl?: string };
      scholarships?: { value?: string; sourceUrl?: string };
      programs?: string[];
    };

    const geminiSourceSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        sourceUrl: { type: Type.STRING },
      },
      required: ['value', 'sourceUrl'],
    };

    const geminiSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        university: { type: Type.STRING },
        qsRanking: { type: Type.STRING },
        website: { type: Type.STRING },
        tuition: geminiSourceSchema,
        deadline: geminiSourceSchema,
        requirements: geminiSourceSchema,
        scholarships: geminiSourceSchema,
        programs: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['university', 'qsRanking', 'website', 'tuition', 'deadline', 'requirements', 'scholarships', 'programs'],
    };

    const openAISourceSchema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        value: { type: 'string' },
        sourceUrl: { type: 'string' },
      },
      required: ['value', 'sourceUrl'],
    } as const;

    const openAISchema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        university: { type: 'string' },
        qsRanking: { type: 'string' },
        website: { type: 'string' },
        tuition: openAISourceSchema,
        deadline: openAISourceSchema,
        requirements: openAISourceSchema,
        scholarships: openAISourceSchema,
        programs: { type: 'array', items: { type: 'string' } },
      },
      required: ['university', 'qsRanking', 'website', 'tuition', 'deadline', 'requirements', 'scholarships', 'programs'],
    } as const;

    const rawResult = await runPreferredWebSearchJson<UniversitySearchResult>(prompt, {
      schemaName: 'university_info_search_result',
      openAISchema,
      geminiSchema,
      parse: (text) => {
        const parsed = parseJsonResponse<unknown>(text);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
          throw new Error('University info search returned invalid JSON.');
        }
        return parsed as UniversitySearchResult;
      },
    });

    const normalized = {
      university: rawResult.university?.trim() || university,
      qsRanking: rawResult.qsRanking?.trim() || EMPTY_OFFICIAL_SOURCE_VALUES[0],
      website: sanitizeHttpUrl(rawResult.website, { allowRoot: true }),
      tuition: normalizeSourceData(rawResult.tuition),
      deadline: normalizeSourceData(rawResult.deadline),
      requirements: normalizeSourceData(rawResult.requirements),
      scholarships: normalizeSourceData(rawResult.scholarships),
      programs: Array.isArray(rawResult.programs)
        ? rawResult.programs.map((item) => item?.trim()).filter(Boolean)
        : [],
    };

    if (
      !hasMeaningfulSourceValue(normalized.qsRanking) &&
      !normalized.website &&
      !hasMeaningfulSourceValue(normalized.tuition.value) &&
      !hasMeaningfulSourceValue(normalized.deadline.value) &&
      !hasMeaningfulSourceValue(normalized.requirements.value) &&
      !hasMeaningfulSourceValue(normalized.scholarships.value) &&
      normalized.programs.length === 0
    ) {
      return null;
    }

    return normalized;
  } catch (error) {
    console.error("University search failed:", error);
    throw error;
  }
};

export const refreshFacultyData = async (existing: FacultyMember): Promise<FacultyMember> => {
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
    const geminiSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        title: { type: Type.STRING },
        university: { type: Type.STRING },
        school: { type: Type.STRING },
        department: { type: Type.STRING },
        email: { type: Type.STRING },
        profileUrl: { type: Type.STRING },
        photoUrl: { type: Type.STRING },
        researchAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
        recentActivities: { type: Type.ARRAY, items: { type: Type.STRING } },
        activitySummary: { type: Type.STRING },
        isActive: { type: Type.BOOLEAN },
        alignmentDetails: { type: Type.STRING },
        matchReasoning: {
          type: Type.OBJECT,
          properties: {
            locationCheck: { type: Type.STRING },
            universityCheck: { type: Type.STRING },
            departmentCheck: { type: Type.STRING },
            positionCheck: { type: Type.STRING },
            activityCheck: { type: Type.STRING },
            reputationCheck: { type: Type.STRING },
            researchFit: { type: Type.STRING },
          },
          required: [
            'locationCheck',
            'universityCheck',
            'departmentCheck',
            'positionCheck',
            'activityCheck',
            'reputationCheck',
            'researchFit',
          ],
        },
      },
      required: [
        'name',
        'title',
        'university',
        'researchAreas',
        'recentActivities',
        'activitySummary',
        'isActive',
        'alignmentDetails',
        'matchReasoning',
      ],
    };

    const openAISchema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        title: { type: 'string' },
        university: { type: 'string' },
        school: { type: 'string' },
        department: { type: 'string' },
        email: { type: 'string' },
        profileUrl: { type: 'string' },
        photoUrl: { type: 'string' },
        researchAreas: { type: 'array', items: { type: 'string' } },
        recentActivities: { type: 'array', items: { type: 'string' } },
        activitySummary: { type: 'string' },
        isActive: { type: 'boolean' },
        alignmentDetails: { type: 'string' },
        matchReasoning: {
          type: 'object',
          additionalProperties: false,
          properties: {
            locationCheck: { type: 'string' },
            universityCheck: { type: 'string' },
            departmentCheck: { type: 'string' },
            positionCheck: { type: 'string' },
            activityCheck: { type: 'string' },
            reputationCheck: { type: 'string' },
            researchFit: { type: 'string' },
          },
          required: [
            'locationCheck',
            'universityCheck',
            'departmentCheck',
            'positionCheck',
            'activityCheck',
            'reputationCheck',
            'researchFit',
          ],
        },
      },
      required: [
        'name',
        'title',
        'university',
        'researchAreas',
        'recentActivities',
        'activitySummary',
        'isActive',
        'alignmentDetails',
        'matchReasoning',
      ],
    } as const;

    const rawResult = await runPreferredWebSearchJson<Partial<FacultyMember>>(prompt, {
      schemaName: 'faculty_refresh_result',
      openAISchema,
      geminiSchema,
      allowedDomains: extractAllowedDomains(existing.profileUrl, existing.universityUrl),
      parse: (text) => {
        const parsed = parseJsonResponse<unknown>(text);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
          throw new Error('Faculty refresh returned invalid JSON.');
        }
        return parsed as Partial<FacultyMember>;
      },
    });

    return normalizeFacultyMember(rawResult, existing);
  } catch (error) {
    console.error("Faculty refresh failed:", error);
    throw error;
  }
};

