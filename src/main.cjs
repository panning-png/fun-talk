const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');

const TARGET_URL = 'https://pingzishuo.com/#/chat';
const HOME_URL = 'https://pingzishuo.com/#/';
const EXPLORE_URL = 'https://pingzishuo.com/#/explore';
const SETTINGS_URL = 'https://pingzishuo.com/#/settings';

const isDev = process.argv.includes('--dev');
let mainWindow = null;

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

ipcMain.handle('fun-talk:nav', async (_event, action) => {
  const win = mainWindow;
  if (!win || win.isDestroyed()) return;

  switch (action) {
    case 'home':
      await win.loadURL(HOME_URL);
      return;
    case 'chat':
      await win.loadURL(TARGET_URL);
      return;
    case 'explore':
      await win.loadURL(EXPLORE_URL);
      return;
    case 'settings':
      await win.loadURL(SETTINGS_URL);
      return;
    case 'back':
      if (win.webContents.canGoBack()) win.webContents.goBack();
      return;
    case 'forward':
      if (win.webContents.canGoForward()) win.webContents.goForward();
      return;
    case 'reload':
      win.webContents.reload();
      return;
    case 'devtools':
      win.webContents.toggleDevTools();
      return;
    default:
      return;
  }
});

function applyWindowAction(event, action) {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (!win || win.isDestroyed()) return;

  switch (action) {
    case 'minimize':
      win.minimize();
      return;
    case 'maximize':
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      return;
    case 'close':
      win.close();
      return;
    default:
      return;
  }
}

ipcMain.handle('fun-talk:window', async (event, action) => {
  applyWindowAction(event, action);
});

ipcMain.on('fun-talk:window-control', (event, action) => {
  applyWindowAction(event, action);
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 960,
    minHeight: 660,
    backgroundColor: '#f4f6fa',
    title: 'Fun Talk',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 14, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      partition: 'persist:fun-talk'
    }
  });

  mainWindow = win;
  Menu.setApplicationMenu(null);

  win.loadURL(TARGET_URL, {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 FunTalk/0.1'
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://pingzishuo.com') || url.startsWith('https://shushubuyue.net')) {
      return { action: 'allow' };
    }

    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const allowed =
      url.startsWith('https://pingzishuo.com') ||
      url.startsWith('https://shushubuyue.net') ||
      url.startsWith('https://turing.captcha.qcloud.com') ||
      url.startsWith('https://fc.unclenoway.net');

    if (!allowed) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const notifyRendererResize = () => {
    if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send('fun-talk:host-resize');
    }
  };

  win.on('resize', notifyRendererResize);
  win.on('maximize', notifyRendererResize);
  win.on('unmaximize', notifyRendererResize);
  win.on('restore', notifyRendererResize);

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  return win;
}

app.whenReady().then(() => {
  app.setName('Fun Talk');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
