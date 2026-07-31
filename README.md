# Fun Talk

Fun Talk 是一个 Electron 桌面客户端，用来加载 `https://pingzishuo.com/#/` 并注入企业微信风格的聊天界面。

核心原则：

- 原站点负责登录、验证码、匹配、WebSocket、聊天发送等业务能力。
- Fun Talk 只提供桌面客户端外壳、窗口导航和聊天界面样式增强。
- 登录状态保存在 Electron 的 `persist:fun-talk` 会话中，关闭后再打开仍会尽量保留。

## 运行

```bash
npm install
npm start
```

如果卡在 `Downloading Electron binary...`，运行：

```bash
npm run install:electron
npm start
```

## 启动不了时先看这里

### 1. 当前目录必须是项目目录

```bash
cd /mnt/e/fun/fun-talk
npm start
```

如果是在 Windows PowerShell：

```powershell
cd E:\fun\fun-talk
npm start
```

### 2. 不要混用 Windows 和 WSL 的 node_modules

Electron 会按当前系统下载不同平台的二进制文件：

- 在 WSL/Linux 里安装，会得到 Linux 版 Electron。
- 在 Windows PowerShell/CMD 里安装，会得到 Windows 版 Electron。

如果你在 WSL 里执行过 `npm install`，又到 Windows PowerShell 里 `npm start`，可能启动失败。反过来也一样。

修复方式：在哪个系统启动，就在哪个系统重新安装依赖。

WSL/Linux：

```bash
cd /mnt/e/fun/fun-talk
rm -rf node_modules package-lock.json
npm install --ignore-scripts
npm run install:electron
npm start
```

Windows PowerShell：

```powershell
cd E:\fun\fun-talk
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install --ignore-scripts
npm run install:electron
npm start
```

### 3. WSL 需要图形界面支持

如果你在 WSL 里运行，Windows 11 通常自带 WSLg；Windows 10 或没有图形环境时，Electron 窗口可能打不开。此时建议直接在 Windows PowerShell 中重新安装并启动。

调试模式：

```bash
npm run dev
```

项目自检：

```bash
npm run check
```

## 文件结构

```text
fun-talk/
  package.json
  src/
    main.cjs       # Electron 主进程：窗口、导航、外链处理
    preload.cjs    # 向目标站注入客户端 UI 和样式
    theme.css      # 企业微信风格样式
  scripts/
    check.cjs      # 基础完整性检查
```

## 已做的 UI 改造

- 顶部桌面标题栏：品牌、后退、前进、刷新、首页、聊天。
- 左侧企业微信式深色导航栏。
- 会话列表占位面板，突出“匿名聊天 / 随机匹配”入口语义。
- 聊天区域改为桌面聊天窗口质感。
- 对方消息白色气泡，自己消息绿色气泡。
- 输入栏改为浅灰底、白色输入框、绿色发送按钮。
- 深色模式兼容。

## 注意

目标站点是第三方线上应用。Fun Talk 不接管它的接口协议，也不保存用户账号密码。若目标站后续改版 class 名，`src/theme.css` 中的选择器可能需要跟随调整。
