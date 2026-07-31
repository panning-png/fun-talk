const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const requiredFiles = [
  'package.json',
  'src/main.cjs',
  'src/preload.cjs',
  'src/theme.css',
  'README.md'
];

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const preload = fs.readFileSync(path.join(root, 'src/preload.cjs'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'src/theme.css'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src/main.cjs'), 'utf8');

if (!preload.includes('funTalkClient')) {
  throw new Error('preload API was not exposed');
}

if (
  !main.includes("ipcMain.handle('fun-talk:window'") ||
  !main.includes("ipcMain.on('fun-talk:window-control'") ||
  !preload.includes("ipcRenderer.send('fun-talk:window-control'") ||
  !preload.includes('data-ft-window="minimize"')
) {
  throw new Error('window minimize controls must be wired from preload to main process');
}

if (!theme.includes('--ft-blue: #2f7cf6') || !theme.includes('.ft-window-controls') || !theme.includes('.ft-chat-route [class*="bg-red"]')) {
  throw new Error('enterprise-style blue gray shell and window controls must be present');
}

if (!theme.includes('.ft-drag') || !theme.includes('pointer-events: none;')) {
  throw new Error('titlebar drag layer must not block window control clicks');
}

for (const selector of ['.chat-scroll-view', '.chat-bottom-bar', '.self-message-bubble', '.partner-message-bubble']) {
  if (!theme.includes(selector)) {
    throw new Error(`Missing chat selector: ${selector}`);
  }
}

if (!theme.includes('--ft-app-left')) {
  throw new Error('Missing app viewport offset variable');
}

if (!theme.includes('--ft-viewport-width') || !theme.includes('--ft-app-height')) {
  throw new Error('Missing resize-safe viewport variables');
}

if (!theme.includes('#app {\n  position: fixed')) {
  throw new Error('#app must be the only fixed app viewport');
}

if (theme.includes('#app,\nuni-app,\nuni-page,\nuni-page-wrapper')) {
  throw new Error('Detected old repeated app offset selector');
}

if (!theme.includes('.ft-chat-route .chat-bottom-bar {\n  position: relative')) {
  throw new Error('chat bottom bar must stay in normal flex flow');
}

if (!theme.includes('.ft-chat-route .ft-sidebar')) {
  throw new Error('sidebar visibility must be route-scoped');
}

if (!theme.includes('.message-controls-wrapper')) {
  throw new Error('logged-in disconnected/rematch controls must be aligned to app viewport');
}

if (!theme.includes('.content-container > uni-view[class*="bg-white"][class*="shadow-sm"][class*="relative"]')) {
  throw new Error('logged-in original tab strip must be hidden in desktop shell');
}

if (!preload.includes('hasChatDom')) {
  throw new Error('preload must detect chat route from rendered DOM, not only from hash');
}

if (!preload.includes('funTalkLayoutAudit')) {
  throw new Error('layout audit helper must be exposed for logged-in UI checks');
}

if (!theme.includes('.chat-status-container')) {
  throw new Error('partner info status panel must remain visible in chat');
}

if (
  !preload.includes('requestAnimationFrame') ||
  !preload.includes("attributeFilter: ['class', 'hidden']") ||
  preload.includes("attributeFilter: ['class', 'style', 'hidden']") ||
  !preload.includes('repairAfterResize') ||
  !preload.includes("ipcRenderer.on('fun-talk:host-resize'")
) {
  throw new Error('DOM observer must be debounced and resize repair must be wired');
}

if (!preload.includes('ft-native-overlay-open') || !theme.includes('.uni-drawer')) {
  throw new Error('native menu drawer/popup must be detectable and layered above the desktop shell');
}

if (!preload.includes('.uni-modal') || !theme.includes('.ft-chat-route .uni-modal') || !theme.includes('z-index: 6001 !important')) {
  throw new Error('uni modal must be detected and layered above native masks');
}

if (!theme.includes('.chat-end-overlay') || !theme.includes('pointer-events: none !important')) {
  throw new Error('chat end visual overlay must not block native top-left menu clicks');
}

console.log('fun-talk project check passed');
