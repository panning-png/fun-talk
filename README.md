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
  android/          # Android WebView APK 工程骨架
  docs/             # 迁移和方案文档
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
- 对方消息白色气泡，自己消息蓝色气泡。
- 输入栏改为浅灰底、白色输入框、蓝色发送按钮。
- 深色模式兼容。

## 移动端方案记录

当前 Fun Talk 的核心形态是“桌面客户端外壳 + WebView/Electron 加载原站 + 注入 CSS/JS 增强 UI 与自动化能力”。如果后续要做 Android 或 iOS，不建议重写原站聊天协议，优先沿用 WebView 注入方案。

详细 Android APK 技术方案见 [docs/android-apk-technical-plan.md](docs/android-apk-technical-plan.md)。当前 Android 工程骨架位于 [android/](android/)。

### 目标判断

- Android App：可行性较高，适合先做 MVP。
- iOS App：技术可行，但 App Store 审核、WebView 限制和脚本自动化风险更高。
- 推荐顺序：先做 Android APK，再根据实际稳定性评估 iOS。

### Android 方案

建议新建 `fun-talk-android`：

- 使用 Kotlin/Java 原生 Android 项目。
- 用 WebView 加载 `https://pingzishuo.com/#/chat`。
- 注入移动端适配版 `theme.css`。
- 注入自动匹配女生脚本。
- 使用原生顶部栏或浮动开关控制插件启停。
- 登录、验证码、WebSocket、匹配、聊天发送仍由原站负责。

优点：

- 开发成本较低。
- WebView 支持 JS/CSS 注入。
- 当前桌面端的布局修复、自动匹配、离开确认等逻辑可以迁移。
- 如果仅自用，可以直接打包 APK 侧载安装，不必先上架。

主要风险：

- Android WebView 的 DOM、UA、输入法和滚动行为可能与桌面端不同，需要重新采样适配。
- 原站验证码、WebSocket、登录态在移动 WebView 中可能有差异。
- 自动匹配属于页面自动化行为，需要控制频率，避免异常请求。

### iOS 方案

可用 Swift + WKWebView：

- WKWebView 加载原站。
- 使用 WKUserScript 注入 CSS/JS。
- 原生 UI 提供插件开关。

主要限制：

- App Store 可能认为这是套壳网站。
- 自动匹配、自动离开这类脚本能力存在审核风险。
- iOS 对后台运行、持久自动化和 WebView 能力限制更严格。
- 如果仅自用，可考虑开发者证书、TestFlight 或其他签名方式，但维护成本高于 Android。

### 推荐架构

后续如果启动移动端开发，先把当前注入逻辑拆成共享资产：

```text
shared/
  theme.css          # 通用 UI 样式，按平台加差异覆盖
  auto-match.js      # 自动匹配女生核心逻辑
  layout-audit.js    # 布局与状态自验辅助
```

Electron、Android WebView、iOS WKWebView 分别负责：

- 创建宿主窗口/WebView。
- 加载原站。
- 注入共享 CSS/JS。
- 提供平台侧插件开关和调试能力。

### 不推荐路线

- 不建议直接用 React Native/Flutter 重写聊天功能：需要完整逆向接口和 WebSocket，维护成本高。
- 不建议尝试把 Electron 迁移到移动端：Electron 不适用于 Android/iOS。
- 不建议一开始同时做 Android 和 iOS：WebView 差异和审核风险会放大调试成本。

## 注意

目标站点是第三方线上应用。Fun Talk 不接管它的接口协议，也不保存用户账号密码。若目标站后续改版 class 名，`src/theme.css` 中的选择器可能需要跟随调整。
