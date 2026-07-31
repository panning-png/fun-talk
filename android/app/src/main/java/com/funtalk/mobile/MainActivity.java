package com.funtalk.mobile;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.CompoundButton;
import android.widget.LinearLayout;
import android.widget.Switch;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final String CHAT_URL = "https://pingzishuo.com/#/chat";
    private static final String HOME_URL = "https://pingzishuo.com/#/";

    private WebView webView;
    private Switch autoFemaleSwitch;
    private TextView statusText;
    private boolean injectingAssets = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildLayout();
        configureWebView();
        webView.loadUrl(CHAT_URL);
    }

    private void buildLayout() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#F4F6FA"));
        root.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(8), dp(6), dp(8), dp(6));
        toolbar.setBackgroundColor(Color.parseColor("#F6F8FC"));
        toolbar.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(52)
        ));

        toolbar.addView(makeToolbarButton("←", v -> goBackOrHome()));
        toolbar.addView(makeToolbarButton("↻", v -> {
            injectMobileAssets();
            webView.reload();
        }));
        toolbar.addView(makeToolbarButton("首页", v -> webView.loadUrl(HOME_URL)));
        toolbar.addView(makeToolbarButton("聊天", v -> webView.loadUrl(CHAT_URL)));

        TextView title = new TextView(this);
        title.setText("Fun Talk");
        title.setTextColor(Color.parseColor("#1D2533"));
        title.setTextSize(15);
        title.setGravity(Gravity.CENTER_VERTICAL);
        title.setPadding(dp(8), 0, dp(8), 0);
        title.setSingleLine(true);
        toolbar.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1));

        statusText = new TextView(this);
        statusText.setText("未启用");
        statusText.setTextColor(Color.parseColor("#7B8798"));
        statusText.setTextSize(12);
        statusText.setGravity(Gravity.CENTER_VERTICAL);
        statusText.setSingleLine(true);
        toolbar.addView(statusText, new LinearLayout.LayoutParams(dp(72), ViewGroup.LayoutParams.MATCH_PARENT));

        autoFemaleSwitch = new Switch(this);
        autoFemaleSwitch.setText("自动女");
        autoFemaleSwitch.setTextSize(12);
        autoFemaleSwitch.setTextColor(Color.parseColor("#1D2533"));
        autoFemaleSwitch.setGravity(Gravity.CENTER_VERTICAL);
        autoFemaleSwitch.setOnCheckedChangeListener((CompoundButton buttonView, boolean isChecked) -> {
            evaluateJavascript("window.funTalkAndroidBridge && window.funTalkAndroidBridge.setAutoFemaleEnabled(" + isChecked + ");");
        });
        toolbar.addView(autoFemaleSwitch, new LinearLayout.LayoutParams(dp(92), ViewGroup.LayoutParams.MATCH_PARENT));

        webView = new WebView(this);
        webView.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1
        ));

        root.addView(toolbar);
        root.addView(webView);
        setContentView(root);
    }

    private Button makeToolbarButton(String text, View.OnClickListener listener) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextSize(12);
        button.setTextColor(Color.parseColor("#1D2533"));
        button.setAllCaps(false);
        button.setGravity(Gravity.CENTER);
        button.setPadding(0, 0, 0, 0);
        button.setOnClickListener(listener);
        button.setLayoutParams(new LinearLayout.LayoutParams(dp(44), ViewGroup.LayoutParams.MATCH_PARENT));
        return button;
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUserAgentString(settings.getUserAgentString() + " FunTalkAndroid/0.1");

        webView.addJavascriptInterface(new FunTalkHostBridge(), "FunTalkHost");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = Uri.parse(url);
                String host = uri.getHost();
                if (host == null) return false;

                boolean allowed =
                        host.endsWith("pingzishuo.com") ||
                        host.endsWith("shushubuyue.net") ||
                        host.endsWith("unclenoway.net") ||
                        host.endsWith("captcha.qcloud.com");
                return !allowed;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                injectMobileAssets();
                syncSwitchFromPage();
            }
        });
    }

    private void injectMobileAssets() {
        if (injectingAssets || webView == null) return;
        injectingAssets = true;
        try {
            String css = readAsset("fun-talk-mobile.css");
            String js = readAsset("fun-talk-mobile.js");
            String payload =
                    "(function(){"
                            + "window.__FUN_TALK_ANDROID_CSS__=" + JSONObject.quote(css) + ";"
                            + "var style=document.getElementById('fun-talk-android-style');"
                            + "if(!style){style=document.createElement('style');style.id='fun-talk-android-style';document.head.appendChild(style);}"
                            + "style.textContent=window.__FUN_TALK_ANDROID_CSS__;"
                            + js
                            + "if(window.funTalkAndroidBridge&&window.funTalkAndroidBridge.inject){window.funTalkAndroidBridge.inject();}"
                            + "})();";
            evaluateJavascript(payload);
        } catch (IOException error) {
            statusText.setText("注入失败");
        } finally {
            injectingAssets = false;
        }
    }

    private void syncSwitchFromPage() {
        evaluateJavascript(
                "window.funTalkAndroidBridge && window.funTalkAndroidBridge.audit ? JSON.stringify(window.funTalkAndroidBridge.audit()) : '{}';",
                value -> {
                    if (value == null || "null".equals(value)) return;
                    boolean enabled = value.contains("\\\"autoFemaleEnabled\\\":true");
                    autoFemaleSwitch.setOnCheckedChangeListener(null);
                    autoFemaleSwitch.setChecked(enabled);
                    autoFemaleSwitch.setOnCheckedChangeListener((buttonView, isChecked) ->
                            evaluateJavascript("window.funTalkAndroidBridge && window.funTalkAndroidBridge.setAutoFemaleEnabled(" + isChecked + ");")
                    );
                }
        );
    }

    private String readAsset(String name) throws IOException {
        InputStream inputStream = getAssets().open(name);
        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));
        StringBuilder builder = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            builder.append(line).append('\n');
        }
        reader.close();
        return builder.toString();
    }

    private void evaluateJavascript(String script) {
        evaluateJavascript(script, null);
    }

    private void evaluateJavascript(String script, android.webkit.ValueCallback<String> callback) {
        if (webView == null) return;
        webView.post(() -> webView.evaluateJavascript(script, callback));
    }

    private void goBackOrHome() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else if (webView != null) {
            webView.loadUrl(HOME_URL);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    public class FunTalkHostBridge {
        @JavascriptInterface
        public void postStatus(String status, String gender, int attempts, boolean enabled) {
            runOnUiThread(() -> {
                String compactStatus = status == null ? "" : status;
                if (gender != null && gender.length() > 0 && !"未知".equals(gender)) {
                    compactStatus += " " + gender;
                }
                if (attempts > 0) {
                    compactStatus += " " + attempts;
                }
                statusText.setText(compactStatus.length() == 0 ? "未启用" : compactStatus);
                if (autoFemaleSwitch.isChecked() != enabled) {
                    autoFemaleSwitch.setOnCheckedChangeListener(null);
                    autoFemaleSwitch.setChecked(enabled);
                    autoFemaleSwitch.setOnCheckedChangeListener((buttonView, isChecked) ->
                            evaluateJavascript("window.funTalkAndroidBridge && window.funTalkAndroidBridge.setAutoFemaleEnabled(" + isChecked + ");")
                    );
                }
            });
        }
    }
}
