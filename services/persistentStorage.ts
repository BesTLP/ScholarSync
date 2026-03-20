import type { ScholarSyncDesktopConfig, ScholarSyncDesktopPaths } from '../desktop';

const RUNTIME_CONFIG_STORAGE_KEY = 'scholarsync_runtime_config';

const DEFAULT_RUNTIME_CONFIG: ScholarSyncDesktopConfig = {
  preferredProvider: 'openai',
  fallbackProvider: 'gemini',
  openaiApiKey: '',
  geminiApiKey: '',
  openaiModel: 'gpt-5',
  geminiModel: 'gemini-2.5-flash',
};

const injectedOpenAIApiKey = process.env.OPENAI_API_KEY || '';
const injectedGeminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

const pickConfiguredValue = (...values: Array<string | undefined>) => {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
};

const hasDesktopBridge = () =>
  typeof window !== 'undefined' && typeof window.scholarSyncDesktop !== 'undefined';

const readBrowserStorage = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to read localStorage key "${key}"`, error);
    return null;
  }
};

const writeBrowserStorage = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Failed to write localStorage key "${key}"`, error);
  }
};

const removeBrowserStorage = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove localStorage key "${key}"`, error);
  }
};

export const readPersistedValue = <T>(key: string, fallbackValue: T): T => {
  if (hasDesktopBridge()) {
    const desktopValue = window.scholarSyncDesktop?.storage.get<T>(key);
    if (typeof desktopValue !== 'undefined') {
      return desktopValue;
    }
  }

  const rawValue = readBrowserStorage(key);
  if (rawValue === null) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return rawValue as T;
  }
};

export const writePersistedValue = (key: string, value: unknown) => {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  writeBrowserStorage(key, serialized);

  if (hasDesktopBridge()) {
    void window.scholarSyncDesktop?.storage.set(key, value);
  }
};

export const removePersistedValue = (key: string) => {
  removeBrowserStorage(key);

  if (hasDesktopBridge()) {
    void window.scholarSyncDesktop?.storage.remove(key);
  }
};

export const getRuntimeConfig = (): ScholarSyncDesktopConfig => {
  const browserConfig = readPersistedValue<Partial<ScholarSyncDesktopConfig>>(RUNTIME_CONFIG_STORAGE_KEY, {});
  const desktopConfig = hasDesktopBridge() ? window.scholarSyncDesktop?.config.get() : undefined;

  return {
    ...DEFAULT_RUNTIME_CONFIG,
    ...browserConfig,
    ...desktopConfig,
    preferredProvider: desktopConfig?.preferredProvider || browserConfig.preferredProvider || 'openai',
    fallbackProvider: desktopConfig?.fallbackProvider || browserConfig.fallbackProvider || 'gemini',
    openaiApiKey: pickConfiguredValue(desktopConfig?.openaiApiKey, browserConfig.openaiApiKey, injectedOpenAIApiKey),
    geminiApiKey: pickConfiguredValue(desktopConfig?.geminiApiKey, browserConfig.geminiApiKey, injectedGeminiApiKey),
    openaiModel: pickConfiguredValue(desktopConfig?.openaiModel, browserConfig.openaiModel, 'gpt-5'),
    geminiModel: pickConfiguredValue(desktopConfig?.geminiModel, browserConfig.geminiModel, 'gemini-2.5-flash'),
  };
};

export const updateRuntimeConfig = async (
  patch: Partial<ScholarSyncDesktopConfig>,
): Promise<ScholarSyncDesktopConfig> => {
  if (hasDesktopBridge()) {
    const next = await window.scholarSyncDesktop!.config.update(patch);
    writeBrowserStorage(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  const next = {
    ...getRuntimeConfig(),
    ...patch,
  };
  writeBrowserStorage(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(next));
  return next;
};

export const getDesktopPaths = (): ScholarSyncDesktopPaths | null => {
  if (!hasDesktopBridge()) {
    return null;
  }

  return window.scholarSyncDesktop?.paths.get() || null;
};
