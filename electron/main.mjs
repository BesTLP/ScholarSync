import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const APP_FOLDER_NAME = 'ScholarSync';
const STORE_FILE_NAME = 'store.json';
const CONFIG_FILE_NAME = 'providers.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const rendererEntry = path.join(projectRoot, 'dist', 'index.html');

const stableUserDataDir = path.join(app.getPath('appData'), APP_FOLDER_NAME);
app.setPath('userData', stableUserDataDir);

function readRegistryValue(valueName) {
  try {
    const output = execFileSync(
      'reg',
      ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings', '/v', valueName],
      { encoding: 'utf8', windowsHide: true },
    );
    const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const targetLine = lines.find((line) => line.startsWith(valueName));
    if (!targetLine) return '';
    return targetLine.split(/\s{2,}/).pop() || '';
  } catch {
    return '';
  }
}

function normalizeProxyUrl(proxyServer) {
  if (!proxyServer) return '';
  if (proxyServer.includes('=')) {
    const firstRule = proxyServer.split(';').find(Boolean) || '';
    const [, host] = firstRule.split('=');
    return host ? `http://${host.trim()}` : '';
  }
  return /^https?:\/\//i.test(proxyServer) ? proxyServer : `http://${proxyServer}`;
}

function applySystemProxyIfNeeded() {
  if (process.platform !== 'win32') return;
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) return;

  const proxyEnabled = readRegistryValue('ProxyEnable');
  const proxyServer = readRegistryValue('ProxyServer').trim();
  if (!proxyEnabled || proxyEnabled === '0x0' || !proxyServer) return;

  const proxyUrl = normalizeProxyUrl(proxyServer);
  if (proxyUrl) {
    process.env.HTTP_PROXY = proxyUrl;
    process.env.HTTPS_PROXY = proxyUrl;
  }

  app.commandLine.appendSwitch('proxy-server', proxyServer);
  console.log(`Applied system proxy for Electron: ${proxyServer}`);
}

applySystemProxyIfNeeded();

const dataDir = path.join(app.getPath('userData'), 'data');
const configDir = path.join(app.getPath('userData'), 'config');
const storePath = path.join(dataDir, STORE_FILE_NAME);
const configPath = path.join(configDir, CONFIG_FILE_NAME);

const defaultConfig = {
  preferredProvider: 'openai',
  fallbackProvider: 'gemini',
  openaiApiKey: '',
  geminiApiKey: '',
  openaiModel: 'gpt-5',
  geminiModel: 'gemini-2.5-flash',
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDirectories() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });
}

function readJsonFile(filePath, fallbackValue) {
  ensureDirectories();
  if (!fs.existsSync(filePath)) {
    writeJsonFile(filePath, fallbackValue);
    return clone(fallbackValue);
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) {
      return clone(fallbackValue);
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
    return clone(fallbackValue);
  }
}

function writeJsonFile(filePath, value) {
  ensureDirectories();
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readStore() {
  return readJsonFile(storePath, {});
}

function writeStore(store) {
  writeJsonFile(storePath, store);
}

function readConfig() {
  const persisted = readJsonFile(configPath, defaultConfig);
  return {
    ...defaultConfig,
    ...persisted,
  };
}

function writeConfig(config) {
  writeJsonFile(configPath, {
    ...defaultConfig,
    ...config,
  });
}

function registerIpcHandlers() {
  ipcMain.on('storage:get', (event, key) => {
    const store = readStore();
    event.returnValue = store[key];
  });

  ipcMain.on('storage:getAll', (event) => {
    event.returnValue = readStore();
  });

  ipcMain.handle('storage:set', async (_event, key, value) => {
    const store = readStore();
    store[key] = value;
    writeStore(store);
    return true;
  });

  ipcMain.handle('storage:remove', async (_event, key) => {
    const store = readStore();
    delete store[key];
    writeStore(store);
    return true;
  });

  ipcMain.on('config:get', (event) => {
    event.returnValue = readConfig();
  });

  ipcMain.handle('config:update', async (_event, patch) => {
    const nextConfig = {
      ...readConfig(),
      ...(patch || {}),
    };
    writeConfig(nextConfig);
    return nextConfig;
  });

  ipcMain.on('paths:get', (event) => {
    event.returnValue = {
      userDataDir: app.getPath('userData'),
      dataDir,
      configDir,
      storePath,
      configPath,
    };
  });

  ipcMain.handle('shell:openPath', async (_event, targetPath) => {
    if (!targetPath) return '';
    return shell.openPath(targetPath);
  });
}

function createMainWindow() {
  const isMac = process.platform === 'darwin';
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    backgroundColor: '#eef2f7',
    autoHideMenuBar: true,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    vibrancy: isMac ? 'sidebar' : undefined,
    visualEffectState: isMac ? 'active' : undefined,
    trafficLightPosition: isMac ? { x: 18, y: 18 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (!app.isPackaged && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  mainWindow.loadURL(pathToFileURL(rendererEntry).toString());
}

app.whenReady().then(() => {
  ensureDirectories();
  readStore();
  readConfig();
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
