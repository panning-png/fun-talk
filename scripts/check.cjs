const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const requiredFiles = [
  'package.json',
  'src/main.cjs',
  'src/preload.cjs',
  'src/theme.css',
  'README.md',
  'docs/android-apk-technical-plan.md',
  'android/settings.gradle',
  'android/build.gradle',
  'android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'android/app/src/main/java/com/funtalk/mobile/MainActivity.java',
  'android/app/src/main/assets/fun-talk-mobile.css',
  'android/app/src/main/assets/fun-talk-mobile.js',
  'android/README.md'
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
const androidMain = fs.readFileSync(path.join(root, 'android/app/src/main/java/com/funtalk/mobile/MainActivity.java'), 'utf8');
const androidCss = fs.readFileSync(path.join(root, 'android/app/src/main/assets/fun-talk-mobile.css'), 'utf8');
const androidJs = fs.readFileSync(path.join(root, 'android/app/src/main/assets/fun-talk-mobile.js'), 'utf8');
const androidPlan = fs.readFileSync(path.join(root, 'docs/android-apk-technical-plan.md'), 'utf8');

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

if (
  !theme.includes('.ft-chat-route .chat-scroll-view {\n  display: block !important') ||
  !theme.includes('height: calc(var(--ft-app-height) - var(--ft-native-nav-height)) !important') ||
  !theme.includes('.ft-chat-route .chat-container,\n.ft-chat-route .messages-container {\n  display: block !important') ||
  !theme.includes('.ft-chat-route .messages-container {\n  min-height: 240px !important') ||
  !theme.includes('.ft-chat-route .messages-container > uni-view') ||
  !theme.includes('max-width: min(72%, 620px) !important') ||
  !theme.includes('overflow-wrap: anywhere !important') ||
  !theme.includes('text-align-last: auto !important') ||
  theme.includes('.ft-chat-route .chat-scroll-view {\n  flex: 1 1 auto !important;\n  width: 100% !important;\n  height: auto !important')
) {
  throw new Error('chat scroll area must fill the viewport so messages stay visible');
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

if (
  !preload.includes('funTalkPluginAudit') ||
  !preload.includes('AUTO_MATCH_STORAGE_KEY') ||
  !preload.includes('getPartnerGender') ||
  !preload.includes('hasMessageBubble') ||
  !preload.includes('clickConfirmLeave') ||
  !preload.includes('triggerFemaleMatchAlert') ||
  !preload.includes('ft-female-match-alert') ||
  !preload.includes('已匹配女生，脚本停止') ||
  !theme.includes('.ft-plugin-card') ||
  !theme.includes('.ft-switch.active') ||
  !theme.includes('.ft-match-alert') ||
  !theme.includes('.ft-session-badge')
) {
  throw new Error('auto match female plugin must expose UI, automation flow, and audit state');
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

if (
  !androidMain.includes('class MainActivity extends Activity') ||
  !androidMain.includes('WebView') ||
  !androidMain.includes('addJavascriptInterface') ||
  !androidMain.includes('fun-talk-mobile.css') ||
  !androidMain.includes('fun-talk-mobile.js') ||
  !androidMain.includes('setAutoFemaleEnabled')
) {
  throw new Error('Android WebView host must load the target site and expose plugin controls');
}

if (
  !androidJs.includes('window.funTalkAndroidBridge') ||
  !androidJs.includes('setAutoFemaleEnabled') ||
  !androidJs.includes('已匹配女生，脚本停止') ||
  !androidJs.includes('clickConfirmLeave') ||
  !androidJs.includes('FunTalkHost.postStatus') ||
  !androidJs.includes('triggerFemaleAlert') ||
  !androidJs.includes('femaleMatchAlert')
) {
  throw new Error('Android injection script must expose auto female match automation');
}

if (
  !androidCss.includes('.ft-android-chat-route .chat-scroll-view') ||
  !androidCss.includes('height: 100vh !important') ||
  !androidCss.includes('.ft-row-self') ||
  !androidCss.includes('overflow-wrap: anywhere !important') ||
  !androidCss.includes('text-align-last: auto !important') ||
  !androidCss.includes('z-index: 6001 !important') ||
  !androidCss.includes('#fun-talk-android-match-alert') ||
  !androidCss.includes('.ft-android-female-alert')
) {
  throw new Error('Android mobile CSS must preserve chat message visibility and modal layering');
}

if (!androidPlan.includes('Android WebView') || !androidPlan.includes('自验清单')) {
  throw new Error('Android APK technical plan must document migration approach and validation checklist');
}

console.log('fun-talk project check passed');
