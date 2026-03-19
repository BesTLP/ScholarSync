import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const appFolderName = 'ScholarSync';
const productName = 'ScholarSync';
const openaiApiKeyDefault = process.env.OPENAI_API_KEY || '';
const geminiApiKeyDefault = process.env.GEMINI_API_KEY || '';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = 'npm';
const electronDistDir = path.join(projectRoot, 'node_modules', 'electron', 'dist');

function getAppDataRoot() {
  const homeDir = os.homedir();

  if (process.platform === 'win32') {
    return process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
  }

  if (process.platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support');
  }

  return process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config');
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDirectoryIfExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  fs.rmSync(dirPath, { recursive: true, force: true });
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function writeJsonIfMissing(filePath, value) {
  if (fs.existsSync(filePath)) {
    return false;
  }

  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return true;
}

function hasInstalledDependencies() {
  const requiredPaths = [
    path.join(projectRoot, 'node_modules'),
    path.join(projectRoot, 'node_modules', 'electron'),
    path.join(projectRoot, 'node_modules', 'electron-builder'),
    path.join(projectRoot, 'node_modules', 'typescript'),
  ];

  return requiredPaths.every((targetPath) => fs.existsSync(targetPath));
}

function hasLocalElectronDistribution() {
  return fs.existsSync(electronDistDir);
}

function quoteWindowsArg(value) {
  if (!/[\s"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child =
      process.platform === 'win32'
        ? spawn(
            'cmd.exe',
            ['/d', '/s', '/c', [command, ...args].map(quoteWindowsArg).join(' ')],
            {
              cwd: projectRoot,
              stdio: 'inherit',
              shell: false,
            },
          )
        : spawn(command, args, {
            cwd: projectRoot,
            stdio: 'inherit',
            shell: false,
          });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
    });
  });
}

function findMacApp(appName) {
  const releaseDir = path.join(projectRoot, 'release');
  if (!fs.existsSync(releaseDir)) {
    return null;
  }

  const entries = fs.readdirSync(releaseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const appPath = path.join(releaseDir, entry.name, `${appName}.app`);
    if (fs.existsSync(appPath)) {
      return appPath;
    }
  }

  return null;
}

async function openBuiltApp(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return;
  }

  if (process.platform === 'win32') {
    const child = spawn('cmd.exe', ['/c', 'start', '', targetPath], {
      detached: true,
      stdio: 'ignore',
      shell: false,
    });
    child.unref();
    return;
  }

  if (process.platform === 'darwin') {
    await run('open', [targetPath]);
  }
}

async function prepareReleaseDirectory() {
  if (process.platform !== 'win32') {
    return;
  }

  try {
    await run('taskkill', ['/IM', `${productName}.exe`, '/F']);
  } catch {
    // Ignore when the app is not running.
  }

  const unpackedDir = path.join(projectRoot, 'release', 'win-unpacked');
  await delay(1500);

  try {
    removeDirectoryIfExists(unpackedDir);
  } catch {
    await run('cmd.exe', ['/d', '/s', '/c', `if exist "${unpackedDir}" rmdir /s /q "${unpackedDir}"`]);
  }
}

async function ensureLocalElectronDistribution() {
  if (hasLocalElectronDistribution()) {
    console.log(`Electron runtime ready: ${electronDistDir}`);
    return;
  }

  console.log('Preparing local Electron runtime...');
  await run('node', ['node_modules/electron/install.js']);
}

async function main() {
  const userDataRoot = path.join(getAppDataRoot(), appFolderName);
  const dataDir = path.join(userDataRoot, 'data');
  const configDir = path.join(userDataRoot, 'config');
  const storePath = path.join(dataDir, 'store.json');
  const providerConfigPath = path.join(configDir, 'providers.json');

  ensureDirectory(dataDir);
  ensureDirectory(configDir);

  const storeCreated = writeJsonIfMissing(storePath, {});
  const configCreated = writeJsonIfMissing(providerConfigPath, {
    preferredProvider: 'openai',
    fallbackProvider: 'gemini',
    openaiApiKey: openaiApiKeyDefault,
    geminiApiKey: geminiApiKeyDefault,
    openaiModel: 'gpt-5',
    geminiModel: 'gemini-2.5-flash',
  });

  console.log(`Data directory: ${userDataRoot}`);
  console.log(`Store file: ${storePath}`);
  console.log(`Provider config: ${providerConfigPath}`);
  console.log(storeCreated ? 'Created empty persistent store.' : 'Persistent store already exists. Keeping existing data untouched.');
  console.log(configCreated ? 'Created provider config from defaults.' : 'Provider config already exists. Keeping existing keys untouched.');

  if (hasInstalledDependencies()) {
    console.log('Dependencies already installed. Skipping npm install.');
  } else {
    console.log('Installing dependencies...');
    await run(npmCommand, ['install']);
  }

  await ensureLocalElectronDistribution();
  await prepareReleaseDirectory();

  console.log('Packing desktop app...');
  await run(npmCommand, ['run', 'build:web']);

  if (process.platform === 'win32') {
    await run('npx', ['electron-builder', '--win', 'dir', '--publish', 'never']);
  } else if (process.platform === 'darwin') {
    await run('npx', ['electron-builder', '--mac', 'dir', '--publish', 'never']);
  } else {
    throw new Error(`Unsupported platform for local desktop packaging: ${process.platform}`);
  }

  let executablePath = null;
  if (process.platform === 'win32') {
    executablePath = path.join(projectRoot, 'release', 'win-unpacked', `${productName}.exe`);
  } else if (process.platform === 'darwin') {
    executablePath = findMacApp(productName);
  }

  if (executablePath && fs.existsSync(executablePath)) {
    console.log(`Built app: ${executablePath}`);
    await openBuiltApp(executablePath);
    return;
  }

  console.log('Build finished, but no unpacked executable was found to launch automatically.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
