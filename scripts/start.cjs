const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const electronRoot = path.join(root, 'node_modules', 'electron');

function getElectronExecutable() {
  switch (os.platform()) {
    case 'darwin':
      return path.join(electronRoot, 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron');
    case 'win32':
      return path.join(electronRoot, 'dist', 'electron.exe');
    default:
      return path.join(electronRoot, 'dist', 'electron');
  }
}

function run(command, args, options = {}) {
  if (process.env.FUN_TALK_DEBUG_START === '1') {
    console.log('[fun-talk] cwd:', root);
    console.log('[fun-talk] command:', command);
    console.log('[fun-talk] args:', args.join(' '));
  }

  const result = childProcess.spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      ELECTRON_MIRROR: process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/'
    },
    ...options
  });

  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0 && process.env.FUN_TALK_DEBUG_START === '1') {
    console.error('[fun-talk] process exited with status:', result.status, 'signal:', result.signal);
  }
  return result.status ?? 1;
}

function runInteractive(command, args) {
  if (process.env.FUN_TALK_DEBUG_START === '1') {
    console.log('[fun-talk] cwd:', root);
    console.log('[fun-talk] command:', command);
    console.log('[fun-talk] args:', args.join(' '));
  }

  const child = childProcess.spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      ELECTRON_MIRROR: process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/'
    }
  });

  child.on('error', (error) => {
    console.error('[fun-talk] failed to start Electron:', error.message);
    process.exit(1);
  });

  child.on('close', (code, signal) => {
    if (signal) {
      if (process.env.FUN_TALK_DEBUG_START === '1') {
        console.error('[fun-talk] Electron exited with signal:', signal);
      }
      process.exit(1);
    }

    process.exit(code ?? 0);
  });
}

const executable = getElectronExecutable();

if (!fs.existsSync(executable)) {
  console.log('[fun-talk] Electron executable is missing. Installing with ELECTRON_MIRROR...');
  const installStatus = run(process.execPath, [path.join(electronRoot, 'install.js')]);
  if (installStatus !== 0) process.exit(installStatus);
}

if (!fs.existsSync(executable)) {
  console.error(`[fun-talk] Electron executable not found for ${os.platform()}/${os.arch()}: ${executable}`);
  console.error('[fun-talk] Reinstall dependencies in the same environment you use to start the app.');
  process.exit(1);
}

const chromiumFlags = [
  '--disable-gpu',
  '--disable-gpu-compositing'
];

runInteractive(executable, [...chromiumFlags, '.', ...process.argv.slice(2)]);
