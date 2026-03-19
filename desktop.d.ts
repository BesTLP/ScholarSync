export interface ScholarSyncDesktopConfig {
  preferredProvider: 'openai' | 'gemini';
  fallbackProvider: 'openai' | 'gemini';
  openaiApiKey: string;
  geminiApiKey: string;
  openaiModel: string;
  geminiModel: string;
}

export interface ScholarSyncDesktopPaths {
  userDataDir: string;
  dataDir: string;
  configDir: string;
  storePath: string;
  configPath: string;
}

export interface ScholarSyncDesktopBridge {
  storage: {
    get: <T = unknown>(key: string) => T | undefined;
    getAll: <T = Record<string, unknown>>() => T;
    set: (key: string, value: unknown) => Promise<boolean>;
    remove: (key: string) => Promise<boolean>;
  };
  config: {
    get: () => ScholarSyncDesktopConfig;
    update: (patch: Partial<ScholarSyncDesktopConfig>) => Promise<ScholarSyncDesktopConfig>;
  };
  paths: {
    get: () => ScholarSyncDesktopPaths;
  };
  shell: {
    openPath: (targetPath: string) => Promise<string>;
  };
}

declare global {
  interface Window {
    scholarSyncDesktop?: ScholarSyncDesktopBridge;
  }
}
