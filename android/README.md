# Fun Talk Android

这是 Fun Talk 的 Android WebView 客户端骨架。

当前状态：

- 已提供原生 Java `MainActivity`。
- 已提供 WebView 宿主、导航栏和“自动匹配女生”开关。
- 已提供移动端 CSS/JS 注入资产。
- 当前开发环境缺少 Java、Gradle、Android SDK，因此尚未在本机编译 APK。

## 构建

推荐用 Android Studio 打开本目录：

```text
fun-talk/android
```

命令行构建需要本机已安装 JDK、Android SDK 和 Gradle：

```bash
cd android
gradle :app:assembleDebug
```

APK 产物：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 运行后自验

- 打开 App 能进入瓶子说聊天页。
- 登录态能保存。
- 匹配后基础信息、对方消息、自己消息均可见。
- 发送消息后右侧气泡正常显示。
- 自动匹配女生开关能启停。
- 匹配到男生能自动离开并确认。
- 匹配到女生后自动停止。
