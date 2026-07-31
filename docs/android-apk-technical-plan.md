# Fun Talk Android APK 技术方案

## 目标

在现有 Electron 桌面客户端能力基础上，迁移出一个 Android APK：

- 继续使用原站 `https://pingzishuo.com/#/chat` 负责登录、验证码、匹配、WebSocket 和聊天发送。
- Android 端只做 WebView 宿主、移动端样式增强、插件脚本开关和基础导航。
- 优先保证可侧载安装、自用可运行；暂不以应用商店上架为第一目标。

## 技术选型

采用原生 Android Java + WebView。

原因：

- 不引入 React Native/Flutter，避免重写聊天协议。
- 不依赖 Electron，Electron 不能迁移到 Android/iOS。
- Java 原生工程依赖最少，Android Studio 可直接打开。
- WebView 支持注入 CSS/JS，能复用当前桌面端的主要增强思路。

## 仓库结构

```text
fun-talk/
  android/
    settings.gradle
    build.gradle
    app/
      build.gradle
      src/main/
        AndroidManifest.xml
        java/com/funtalk/mobile/MainActivity.java
        assets/
          fun-talk-mobile.css
          fun-talk-mobile.js
        res/values/
          colors.xml
          strings.xml
          themes.xml
  docs/
    android-apk-technical-plan.md
```

## Android 宿主职责

`MainActivity` 负责：

- 创建原生顶部栏：返回、刷新、首页、聊天、自动匹配女生开关。
- 创建 WebView 并加载 `https://pingzishuo.com/#/chat`。
- 开启 JavaScript、DOM Storage、WebSocket 所需 WebView 能力。
- 页面加载完成后注入：
  - `fun-talk-mobile.css`
  - `fun-talk-mobile.js`
- 通过 `JavascriptInterface` 接收脚本状态，用于后续原生 UI 状态展示。
- 支持 Android 返回键：优先 WebView 后退，否则退出页面。

## 注入脚本职责

`fun-talk-mobile.js` 负责：

- 标记聊天路由和聊天 DOM。
- 识别匹配状态：
  - 有输入框；
  - 有活跃“离开”按钮；
  - 有“对方信息”或已有消息气泡。
- 识别匹配对象性别：
  - 优先读取 `.chat-status-container`。
  - 回退读取页面正文中的 `对方信息: 男生/女生`。
- 自动匹配女生：
  - 未匹配时点击开始/重新匹配。
  - 匹配到男生时点击“离开”，再处理“确认离开”弹窗。
  - 匹配到女生后停止并清除本地启用状态。
- 暴露 `window.funTalkAndroidBridge`：
  - `setAutoFemaleEnabled(enabled)`
  - `startAutoFemale()`
  - `stopAutoFemale()`
  - `audit()`

## 样式迁移策略

`fun-talk-mobile.css` 不直接照搬桌面端完整 `src/theme.css`，而是做移动端覆盖：

- 保留企业微信蓝色主色。
- 修复原站红色主题为蓝色。
- 保证聊天滚动区高度稳定。
- 保证消息容器和消息气泡可见。
- 保证自己消息右对齐、对方消息左对齐。
- 保证离开确认弹窗层级高于遮罩。
- 保证底部输入栏固定在 WebView 底部。

桌面端继续使用 `src/theme.css`，Android 端使用 `android/app/src/main/assets/fun-talk-mobile.css`。后续如果 Android 跑通，再考虑拆出 `shared/` 目录统一维护公共选择器和自动匹配核心逻辑。

## 构建方式

当前仓库提交的是 Android Studio 可打开工程。由于当前开发机没有 Java、Gradle、Android SDK，仓库内暂不提交 Gradle Wrapper。

本地构建建议：

1. 安装 Android Studio。
2. 用 Android Studio 打开 `fun-talk/android`。
3. 等待 Gradle 同步。
4. 连接安卓手机或启动模拟器。
5. 运行 `app`。

命令行构建需要本机已有 JDK 和 Android SDK：

```bash
cd android
gradle :app:assembleDebug
```

产物位置：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 自验清单

Android 端首次可运行后，需要至少验证：

- WebView 能打开原站聊天页。
- 登录态能保存，重启后不频繁丢失。
- 验证码能正常显示和交互。
- 匹配后能看到对方基础信息。
- 能看到对方消息和自己消息。
- 输入并发送消息后，消息气泡显示且状态正常。
- 点击“自动匹配女生”后：
  - 能开始匹配；
  - 男生能自动离开并确认；
  - 女生能自动停止；
  - 手动关闭开关后不再执行自动动作。
- 窗口旋转、软键盘弹出、返回键行为正常。

## 风险

- 原站 DOM class 变化会影响 CSS/JS 注入选择器。
- Android WebView 与桌面 Chromium 的输入法、滚动、验证码、localStorage 行为不同，需要真机调试。
- 自动匹配属于页面自动化，应限制频率，避免异常请求。
- 如果未来考虑上架，需要先评估第三方站点授权和平台审核风险。
