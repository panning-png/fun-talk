const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('funTalkClient', {
  nav: (action) => ipcRenderer.invoke('fun-talk:nav', action),
  windowAction: (action) => ipcRenderer.send('fun-talk:window-control', action),
  minimize: () => ipcRenderer.send('fun-talk:window-control', 'minimize'),
  maximize: () => ipcRenderer.send('fun-talk:window-control', 'maximize'),
  close: () => ipcRenderer.send('fun-talk:window-control', 'close')
});

window.addEventListener('DOMContentLoaded', () => {
  const inject = () => {
    if (document.getElementById('fun-talk-style')) return;

    const style = document.createElement('style');
    style.id = 'fun-talk-style';
    style.textContent = require('fs').readFileSync(require('path').join(__dirname, 'theme.css'), 'utf8');
    document.head.appendChild(style);
  };

  const mountShell = () => {
    if (document.getElementById('fun-talk-shell')) return;

    const shell = document.createElement('div');
    shell.id = 'fun-talk-shell';
    shell.innerHTML = `
      <div class="ft-titlebar">
        <div class="ft-drag"></div>
        <div class="ft-brand">
          <div class="ft-logo">F</div>
          <div>
            <div class="ft-name">Fun Talk</div>
            <div class="ft-subtitle">瓶子说客户端</div>
          </div>
        </div>
        <div class="ft-actions">
          <button data-ft-nav="back" title="后退">‹</button>
          <button data-ft-nav="forward" title="前进">›</button>
          <button data-ft-nav="reload" title="刷新">↻</button>
          <button data-ft-nav="home" title="首页">首页</button>
          <button data-ft-nav="chat" title="聊天">聊天</button>
        </div>
        <div class="ft-window-controls" aria-label="窗口控制">
          <button data-ft-window="minimize" title="最小化">—</button>
          <button data-ft-window="maximize" title="最大化">□</button>
          <button data-ft-window="close" class="danger" title="关闭">×</button>
        </div>
      </div>
      <aside class="ft-sidebar" aria-hidden="true">
        <div class="ft-avatar">匿</div>
        <div class="ft-nav active" data-ft-nav="chat" title="聊天">💬</div>
        <div class="ft-nav" data-ft-nav="explore" title="探索">🧭</div>
        <div class="ft-nav" data-ft-nav="settings" title="设置">⚙</div>
      </aside>
      <section class="ft-session-panel" aria-hidden="true">
        <div class="ft-search">搜索</div>
        <div class="ft-session active">
          <div class="ft-session-avatar">瓶</div>
          <div class="ft-session-meta">
            <div class="ft-session-title">匿名聊天</div>
            <div class="ft-session-text">匹配后开始对话</div>
          </div>
        </div>
        <div class="ft-session">
          <div class="ft-session-avatar muted">配</div>
          <div class="ft-session-meta">
            <div class="ft-session-title">随机匹配</div>
            <div class="ft-session-text">使用原站匹配能力</div>
          </div>
        </div>
      </section>
    `;

    document.body.prepend(shell);

    shell.querySelectorAll('[data-ft-window]').forEach((control) => {
      control.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (window.funTalkClient && window.funTalkClient.windowAction) {
          window.funTalkClient.windowAction(control.getAttribute('data-ft-window'));
        }
      });
    });

    shell.addEventListener('click', (event) => {
      const button = event.target.closest('[data-ft-nav]');
      const windowButton = event.target.closest('[data-ft-window]');
      if (!window.funTalkClient) return;

      if (windowButton) {
        event.preventDefault();
        event.stopPropagation();

        if (window.funTalkClient.windowAction) {
          window.funTalkClient.windowAction(windowButton.getAttribute('data-ft-window'));
        }

        return;
      }

      if (button) {
        window.funTalkClient.nav(button.getAttribute('data-ft-nav'));
      }
    });
  };

  const annotatePage = () => {
    const hash = window.location.hash || '';
    const hasChatDom =
      !!document.querySelector('.chat-scroll-view') ||
      !!document.querySelector('.chat-bottom-bar') ||
      !!document.querySelector('.messages-container') ||
      !!document.querySelector('.message-input');

    const isVisible = (element) => {
      if (!element || element.closest('#fun-talk-shell')) return false;

      const rect = element.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return false;

      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
    };

    const hasNativeOverlay = Array.from(
      document.querySelectorAll([
        '.uni-drawer--visible',
        '.uni-drawer__content--visible',
        '.uni-popup',
        'uni-popup',
        '.uni-mask',
        '.custom-modal-overlay',
        '.custom-sidebar-scroll'
      ].join(','))
    ).some(isVisible);

    document.documentElement.classList.toggle(
      'ft-chat-route',
      hash.includes('/chat') || hash.includes('/pages/chat/chat') || hasChatDom
    );
    document.documentElement.classList.toggle('ft-native-overlay-open', hasNativeOverlay);

    document.querySelectorAll('.ft-nav').forEach((item) => {
      const action = item.getAttribute('data-ft-nav');
      const active =
        (action === 'chat' && (hash.includes('/chat') || hasChatDom)) ||
        (action === 'explore' && hash.includes('/explore')) ||
        (action === 'settings' && hash.includes('/settings'));
      item.classList.toggle('active', active);
    });
  };

  const markMessageRows = () => {
    const selfBubbles = document.querySelectorAll('.self-message-bubble, .message-bubble.self');
    const partnerBubbles = document.querySelectorAll('.partner-message-bubble, .message-bubble.partner');

    selfBubbles.forEach((bubble) => {
      const row = bubble.closest('uni-view') || bubble.parentElement;
      if (row) row.classList.add('ft-row-self');
    });

    partnerBubbles.forEach((bubble) => {
      const row = bubble.closest('uni-view') || bubble.parentElement;
      if (row) row.classList.add('ft-row-partner');
    });
  };

  let bootScheduled = false;

  const boot = () => {
    inject();
    mountShell();
    annotatePage();
    markMessageRows();
  };

  const scheduleBoot = () => {
    if (bootScheduled) return;

    bootScheduled = true;
    window.requestAnimationFrame(() => {
      bootScheduled = false;
      annotatePage();
      markMessageRows();
    });
  };

  window.funTalkLayoutAudit = () => {
    const rectOf = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    };

    return {
      href: location.href,
      hash: location.hash,
      isChatRoute: document.documentElement.classList.contains('ft-chat-route'),
      hasChatDom: !!document.querySelector('.chat-scroll-view, .chat-bottom-bar, .messages-container, .message-input'),
      app: rectOf('#app'),
      uniApp: rectOf('#app > uni-app'),
      chatScroll: rectOf('.chat-scroll-view'),
      chatContainer: rectOf('.chat-container'),
      messagesContainer: rectOf('.messages-container'),
      partnerInfo: rectOf('.chat-status-container'),
      nativeDrawer: rectOf('.uni-drawer--visible, .uni-drawer__content--visible'),
      nativeOverlayOpen: document.documentElement.classList.contains('ft-native-overlay-open'),
      bottomBar: rectOf('.chat-bottom-bar'),
      inputContainer: rectOf('.custom-input-container, .input-container')
    };
  };

  boot();

  const observer = new MutationObserver(scheduleBoot);

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'hidden']
  });

  window.addEventListener('hashchange', scheduleBoot);
  window.addEventListener('click', () => window.setTimeout(scheduleBoot, 80), true);
});
