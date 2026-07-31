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
          <button class="ft-plugin-mini" data-ft-plugin-toggle="auto-female" title="自动匹配女生">自动女</button>
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
        <div class="ft-plugin-card">
          <div class="ft-plugin-head">
            <div>
              <div class="ft-plugin-title">插件脚本</div>
              <div class="ft-plugin-subtitle">自动化匹配助手</div>
            </div>
            <button class="ft-switch" type="button" role="switch" aria-checked="false" data-ft-plugin="auto-female">
              <span></span>
            </button>
          </div>
          <div class="ft-plugin-name">自动匹配女生</div>
          <div class="ft-plugin-desc">开启后自动匹配；遇到男生会确认离开并继续，匹配到女生后停止。</div>
          <div class="ft-plugin-status" data-ft-plugin-status>未启用</div>
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

  const AUTO_MATCH_STORAGE_KEY = 'fun-talk:auto-match-female-enabled';
  const AUTO_MATCH_MIN_ACTION_INTERVAL = 1800;
  const AUTO_MATCH_TICK_INTERVAL = 1200;

  const autoMatchRestored = window.localStorage.getItem(AUTO_MATCH_STORAGE_KEY) === '1';
  const autoMatch = {
    enabled: autoMatchRestored,
    timer: null,
    attempts: 0,
    status: autoMatchRestored ? '已启用，准备匹配' : '未启用',
    lastActionAt: 0,
    currentGender: '未知'
  };

  const cleanText = (text) => String(text || '').replace(/\s+/g, ' ').trim();

  const isVisibleElement = (element) => {
    if (!element || element.closest('#fun-talk-shell')) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return false;

    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
  };

  const getVisibleText = (element) => (isVisibleElement(element) ? cleanText(element.innerText || element.textContent) : '');

  const setAutoMatchStatus = (status, options = {}) => {
    autoMatch.status = status;
    if (options.gender) autoMatch.currentGender = options.gender;

    document.querySelectorAll('[data-ft-plugin="auto-female"], [data-ft-plugin-toggle="auto-female"]').forEach((button) => {
      button.classList.toggle('active', autoMatch.enabled);
      button.setAttribute('aria-checked', autoMatch.enabled ? 'true' : 'false');
    });

    const statusNode = document.querySelector('[data-ft-plugin-status]');
    if (statusNode) {
      const genderText = autoMatch.currentGender && autoMatch.currentGender !== '未知' ? `｜当前：${autoMatch.currentGender}` : '';
      const attemptText = autoMatch.attempts > 0 ? `｜轮次：${autoMatch.attempts}` : '';
      statusNode.textContent = `${status}${genderText}${attemptText}`;
      statusNode.classList.toggle('active', autoMatch.enabled);
      statusNode.classList.toggle('done', /已匹配女生|已完成/.test(status));
      statusNode.classList.toggle('warn', /男生|离开|等待/.test(status));
    }
  };

  const stopAutoMatch = (status = '已停止', options = {}) => {
    autoMatch.enabled = false;
    window.localStorage.removeItem(AUTO_MATCH_STORAGE_KEY);

    if (autoMatch.timer) {
      window.clearTimeout(autoMatch.timer);
      autoMatch.timer = null;
    }

    setAutoMatchStatus(status, options);
  };

  const getPartnerInfoText = () => {
    const statusContainer = document.querySelector('.chat-status-container');
    const statusText = getVisibleText(statusContainer);
    if (/对方信息/.test(statusText)) return statusText;

    const bodyText = cleanText(document.body && document.body.innerText);
    const match = bodyText.match(/对方信息[:：]\s*(男生|女生)[^。提示离开发送]*/);
    return match ? match[0] : '';
  };

  const getPartnerGender = () => {
    const infoText = getPartnerInfoText();
    if (/对方信息[:：]?\s*女生/.test(infoText) || /\b女生\b/.test(infoText)) return '女生';
    if (/对方信息[:：]?\s*男生/.test(infoText) || /\b男生\b/.test(infoText)) return '男生';
    return '未知';
  };

  const isPairedChat = () => {
    const infoText = getPartnerInfoText();
    const hasInput = !!document.querySelector('textarea, input, .message-input, uni-textarea, uni-input');
    const hasMessageBubble = !!document.querySelector('.self-message-bubble, .partner-message-bubble, .message-bubble.self, .message-bubble.partner');
    const hasActiveLeave = !!Array.from(document.querySelectorAll('.leave-btn, button, uni-button, uni-view')).some((element) => {
      const text = getVisibleText(element);
      return text === '离开';
    });

    return (/对方信息[:：]/.test(infoText) || hasMessageBubble) && hasInput && hasActiveLeave;
  };

  const getVisibleClickTargets = (pattern, options = {}) => {
    const root = options.root || document;
    const selectors = options.selectors || 'button, uni-button, uni-view, uni-text, div, span';
    const matcher = pattern instanceof RegExp ? pattern : new RegExp(pattern);

    return Array.from(root.querySelectorAll(selectors))
      .map((element) => {
        const text = getVisibleText(element);
        if (!text || !matcher.test(text)) return null;

        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (style.pointerEvents === 'none') return null;

        return {
          element,
          text,
          area: rect.width * rect.height,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.area - b.area);
  };

  const clickTarget = (target) => {
    if (!target || !target.element) return false;

    target.element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: target.x, clientY: target.y }));
    target.element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: target.x, clientY: target.y }));
    target.element.click();
    return true;
  };

  const clickVisibleText = (pattern, options) => {
    const [target] = getVisibleClickTargets(pattern, options);
    return clickTarget(target);
  };

  const clickStartMatch = () => clickVisibleText(/^(开始匹配|重新匹配|继续匹配|捡一个瓶子|离开聊天)$/);

  const clickLeave = () => {
    const leaveButton = Array.from(document.querySelectorAll('.leave-btn'))
      .map((element) => ({ element, text: getVisibleText(element) }))
      .find((item) => item.text === '离开' || item.text === '离开聊天');

    if (leaveButton) {
      const rect = leaveButton.element.getBoundingClientRect();
      return clickTarget({
        element: leaveButton.element,
        text: leaveButton.text,
        area: rect.width * rect.height,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    }

    return clickVisibleText(/^(离开|离开聊天)$/);
  };

  const getLeaveModal = () => Array.from(document.querySelectorAll('.uni-modal, uni-modal')).find((element) => {
    const text = getVisibleText(element);
    return /确认离开|确定要结束当前聊天/.test(text);
  });

  const clickConfirmLeave = () => {
    const modal = getLeaveModal();
    if (!modal) return false;

    const primary = Array.from(modal.querySelectorAll('.uni-modal__btn_primary, .uni-modal__btn:last-child, uni-button, button'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { element, text: getVisibleText(element), area: rect.width * rect.height, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })
      .filter((target) => /确认离开|确定|确认/.test(target.text))
      .sort((a, b) => a.area - b.area)[0];

    if (primary) return clickTarget(primary);

    return clickVisibleText(/^(确认离开|确定|确认)$/);
  };

  const scheduleAutoMatchTick = (delay = AUTO_MATCH_TICK_INTERVAL) => {
    if (!autoMatch.enabled) return;
    if (autoMatch.timer) window.clearTimeout(autoMatch.timer);
    autoMatch.timer = window.setTimeout(runAutoMatchTick, delay);
  };

  const runAutoMatchTick = () => {
    if (!autoMatch.enabled) return;

    const now = Date.now();
    if (now - autoMatch.lastActionAt < AUTO_MATCH_MIN_ACTION_INTERVAL) {
      scheduleAutoMatchTick(AUTO_MATCH_MIN_ACTION_INTERVAL - (now - autoMatch.lastActionAt) + 100);
      return;
    }

    const modal = getLeaveModal();
    if (modal) {
      autoMatch.lastActionAt = now;
      setAutoMatchStatus('确认离开中');
      clickConfirmLeave();
      scheduleAutoMatchTick(1800);
      return;
    }

    if (isPairedChat()) {
      const gender = getPartnerGender();
      autoMatch.currentGender = gender;

      if (gender === '女生') {
        stopAutoMatch('已匹配女生，脚本停止', { gender });
        return;
      }

      if (gender === '男生') {
        autoMatch.attempts += 1;
        autoMatch.lastActionAt = now;
        setAutoMatchStatus('匹配到男生，准备离开', { gender });
        clickLeave();
        scheduleAutoMatchTick(1800);
        return;
      }

      setAutoMatchStatus('已匹配，等待识别性别', { gender });
      scheduleAutoMatchTick(1000);
      return;
    }

    autoMatch.lastActionAt = now;
    setAutoMatchStatus('匹配中');
    clickStartMatch();
    scheduleAutoMatchTick(2600);
  };

  const startAutoMatch = () => {
    autoMatch.enabled = true;
    autoMatch.attempts = 0;
    autoMatch.currentGender = getPartnerGender();
    window.localStorage.setItem(AUTO_MATCH_STORAGE_KEY, '1');
    setAutoMatchStatus('已启用，准备匹配');
    scheduleAutoMatchTick(100);
  };

  const bindPluginControls = () => {
    const buttons = document.querySelectorAll('[data-ft-plugin="auto-female"], [data-ft-plugin-toggle="auto-female"]');
    if (!buttons.length) return;

    buttons.forEach((button) => {
      if (button.dataset.ftBound === '1') return;

      button.dataset.ftBound = '1';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (autoMatch.enabled) {
          stopAutoMatch('已手动停止');
        } else {
          startAutoMatch();
        }
      });
    });

    setAutoMatchStatus(autoMatch.enabled ? autoMatch.status || '已启用' : autoMatch.status || '未启用');
  };

  const setViewportVars = () => {
    const width = Math.max(1, Math.round(window.innerWidth || document.documentElement.clientWidth || 1));
    const height = Math.max(1, Math.round(window.innerHeight || document.documentElement.clientHeight || 1));

    document.documentElement.style.setProperty('--ft-viewport-width', `${width}px`);
    document.documentElement.style.setProperty('--ft-viewport-height', `${height}px`);
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
        '.uni-modal',
        'uni-modal',
        '.uni-mask',
        '.uni-modal__mask',
        '.uni-modal-mask',
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
      const row = bubble.parentElement || bubble.closest('uni-view');
      if (row) row.classList.add('ft-row-self');
    });

    partnerBubbles.forEach((bubble) => {
      const row = bubble.parentElement || bubble.closest('uni-view');
      if (row) row.classList.add('ft-row-partner');
    });
  };

  let bootScheduled = false;

  const boot = () => {
    inject();
    mountShell();
    bindPluginControls();
    setViewportVars();
    annotatePage();
    markMessageRows();
    setAutoMatchStatus(autoMatch.status);
  };

  const scheduleBoot = () => {
    if (bootScheduled) return;

    bootScheduled = true;
    window.requestAnimationFrame(() => {
      bootScheduled = false;
      setViewportVars();
      annotatePage();
      markMessageRows();
      bindPluginControls();
      setAutoMatchStatus(autoMatch.status);
    });
  };

  let resizeRepairTimers = [];
  let isResizeRepairDispatch = false;

  const repairAfterResize = () => {
    if (isResizeRepairDispatch) return;

    setViewportVars();
    scheduleBoot();

    resizeRepairTimers.forEach((timer) => window.clearTimeout(timer));
    resizeRepairTimers = [];

    for (const delay of [0, 80, 180, 360]) {
      const timer = window.setTimeout(() => {
        setViewportVars();
        annotatePage();
        markMessageRows();
        isResizeRepairDispatch = true;
        window.dispatchEvent(new Event('resize'));
        isResizeRepairDispatch = false;
        document.querySelectorAll('.chat-scroll-view, .uni-scroll-view, uni-scroll-view').forEach((element) => {
          element.dispatchEvent(new Event('scroll', { bubbles: true }));
        });
      }, delay);
      resizeRepairTimers.push(timer);
    }

    const cleanupTimer = window.setTimeout(() => {
      resizeRepairTimers = [];
    }, 420);
    resizeRepairTimers.push(cleanupTimer);
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
      viewport: {
        width: Math.round(window.innerWidth || 0),
        height: Math.round(window.innerHeight || 0)
      },
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

  window.funTalkPluginAudit = () => ({
    autoFemaleEnabled: autoMatch.enabled,
    autoFemaleStatus: autoMatch.status,
    autoFemaleAttempts: autoMatch.attempts,
    partnerInfo: getPartnerInfoText(),
    partnerGender: getPartnerGender(),
    paired: isPairedChat(),
    leaveModalOpen: !!getLeaveModal()
  });

  boot();
  if (autoMatch.enabled) {
    scheduleAutoMatchTick(800);
  }

  const observer = new MutationObserver(scheduleBoot);

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'hidden']
  });

  window.addEventListener('hashchange', scheduleBoot);
  window.addEventListener('click', () => window.setTimeout(scheduleBoot, 80), true);
  window.addEventListener('resize', repairAfterResize);
  window.addEventListener('orientationchange', repairAfterResize);
  window.addEventListener('pageshow', repairAfterResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', repairAfterResize);
  }
  ipcRenderer.on('fun-talk:host-resize', repairAfterResize);
});
