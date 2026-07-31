const childProcess = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const installScript = path.join(root, 'node_modules', 'electron', 'install.js');

const result = childProcess.spawnSync(process.execPath, [installScript], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_MIRROR: process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/'
  }
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
