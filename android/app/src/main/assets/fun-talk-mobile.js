(() => {
  if (window.funTalkAndroidBridge && window.funTalkAndroidBridge.__version === '0.1.0') {
    return;
  }

  const STORE_KEY = 'fun-talk:auto-match-female-enabled';
  const FEMALE_ALERT_KEY = 'fun-talk:female-match-alert';
  const FEMALE_ALERT_TEXT_KEY = 'fun-talk:female-match-alert-text';
  const TICK_INTERVAL = 1200;
  const ACTION_INTERVAL = 1800;

  const state = {
    enabled: window.localStorage.getItem(STORE_KEY) === '1',
    timer: null,
    attempts: 0,
    status: window.localStorage.getItem(STORE_KEY) === '1' ? '已启用，准备匹配' : '未启用',
    gender: '未知',
    lastActionAt: 0,
    femaleAlert: window.localStorage.getItem(FEMALE_ALERT_KEY) === '1',
    femaleAlertText: window.localStorage.getItem(FEMALE_ALERT_TEXT_KEY) || '已匹配到女生，点击查看聊天'
  };

  const cleanText = (text) => String(text || '').replace(/\s+/g, ' ').trim();

  const isVisible = (element) => {
    if (!element || element.closest('#fun-talk-android-panel')) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
  };

  const getVisibleText = (element) => (isVisible(element) ? cleanText(element.innerText || element.textContent) : '');

  const mountPanel = () => {
    let panel = document.getElementById('fun-talk-android-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'fun-talk-android-panel';
      document.body.appendChild(panel);
    }
    return panel;
  };

  const mountMatchAlert = () => {
    let alert = document.getElementById('fun-talk-android-match-alert');
    if (!alert) {
      alert = document.createElement('button');
      alert.id = 'fun-talk-android-match-alert';
      alert.type = 'button';
      alert.innerHTML = '<span class="ft-android-match-dot"></span><span id="fun-talk-android-match-alert-text"></span>';
      alert.addEventListener('click', () => clearFemaleAlert());
      document.body.appendChild(alert);
    }
    return alert;
  };

  const notifyHost = () => {
    const panel = mountPanel();
    const genderText = state.gender && state.gender !== '未知' ? `｜${state.gender}` : '';
    const attemptText = state.attempts > 0 ? `｜${state.attempts}` : '';
    panel.textContent = `${state.status}${genderText}${attemptText}`;
    panel.classList.toggle('active', state.enabled || /已匹配女生/.test(state.status));
    document.documentElement.classList.toggle('ft-android-female-alert', state.femaleAlert);

    const matchAlert = mountMatchAlert();
    const matchAlertText = document.getElementById('fun-talk-android-match-alert-text');
    if (matchAlertText) {
      matchAlertText.textContent = state.femaleAlertText || '已匹配到女生，点击查看聊天';
    }
    matchAlert.setAttribute('aria-hidden', state.femaleAlert ? 'false' : 'true');

    if (window.FunTalkHost && typeof window.FunTalkHost.postStatus === 'function') {
      window.FunTalkHost.postStatus(state.status, state.gender, state.attempts, state.enabled);
    }
  };

  const setStatus = (status, options = {}) => {
    state.status = status;
    if (options.gender) state.gender = options.gender;
    notifyHost();
  };

  const triggerFemaleAlert = () => {
    const infoText = getPartnerInfoText();
    state.femaleAlert = true;
    state.femaleAlertText = infoText ? `已匹配到女生：${infoText.replace(/^对方信息[:：]\s*/, '')}` : '已匹配到女生，点击查看聊天';
    window.localStorage.setItem(FEMALE_ALERT_KEY, '1');
    window.localStorage.setItem(FEMALE_ALERT_TEXT_KEY, state.femaleAlertText);
    notifyHost();

    if (navigator.vibrate) {
      navigator.vibrate([90, 40, 90]);
    }
  };

  const clearFemaleAlert = () => {
    state.femaleAlert = false;
    state.femaleAlertText = '已匹配到女生，点击查看聊天';
    window.localStorage.removeItem(FEMALE_ALERT_KEY);
    window.localStorage.removeItem(FEMALE_ALERT_TEXT_KEY);
    notifyHost();
  };

  const getPartnerInfoText = () => {
    const statusText = getVisibleText(document.querySelector('.chat-status-container'));
    if (/对方信息/.test(statusText)) return statusText;

    const bodyText = cleanText(document.body && document.body.innerText);
    const match = bodyText.match(/对方信息[:：]\s*(男生|女生)[^。提示离开发送]*/);
    return match ? match[0] : '';
  };

  const getGender = () => {
    const infoText = getPartnerInfoText();
    if (/对方信息[:：]?\s*女生/.test(infoText) || /\b女生\b/.test(infoText)) return '女生';
    if (/对方信息[:：]?\s*男生/.test(infoText) || /\b男生\b/.test(infoText)) return '男生';
    return '未知';
  };

  const isPaired = () => {
    const infoText = getPartnerInfoText();
    const hasInput = !!document.querySelector('textarea, input, .message-input, uni-textarea, uni-input');
    const hasBubble = !!document.querySelector('.self-message-bubble, .partner-message-bubble, .message-bubble.self, .message-bubble.partner');
    const hasActiveLeave = Array.from(document.querySelectorAll('.leave-btn, button, uni-button, uni-view')).some((element) => {
      return getVisibleText(element) === '离开';
    });

    return (/对方信息[:：]/.test(infoText) || hasBubble) && hasInput && hasActiveLeave;
  };

  const markMessageRows = () => {
    document.querySelectorAll('.self-message-bubble, .message-bubble.self').forEach((bubble) => {
      const row = bubble.parentElement || bubble.closest('uni-view');
      if (row) row.classList.add('ft-row-self');
    });

    document.querySelectorAll('.partner-message-bubble, .message-bubble.partner').forEach((bubble) => {
      const row = bubble.parentElement || bubble.closest('uni-view');
      if (row) row.classList.add('ft-row-partner');
    });
  };

  const annotatePage = () => {
    const hash = window.location.hash || '';
    const hasChatDom =
      !!document.querySelector('.chat-scroll-view') ||
      !!document.querySelector('.chat-bottom-bar') ||
      !!document.querySelector('.messages-container') ||
      !!document.querySelector('.message-input');
    document.documentElement.classList.toggle(
      'ft-android-chat-route',
      hash.includes('/chat') || hash.includes('/pages/chat/chat') || hasChatDom
    );
    markMessageRows();
    notifyHost();
  };

  const clickTarget = (target) => {
    if (!target || !target.element) return false;
    target.element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: target.x, clientY: target.y }));
    target.element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: target.x, clientY: target.y }));
    target.element.click();
    return true;
  };

  const findClickTarget = (pattern, root = document) => {
    const matcher = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    return Array.from(root.querySelectorAll('button, uni-button, uni-view, uni-text, div, span'))
      .map((element) => {
        const text = getVisibleText(element);
        if (!text || !matcher.test(text)) return null;
        const style = window.getComputedStyle(element);
        if (style.pointerEvents === 'none') return null;
        const rect = element.getBoundingClientRect();
        return {
          element,
          text,
          area: rect.width * rect.height,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.area - b.area)[0] || null;
  };

  const clickText = (pattern, root) => clickTarget(findClickTarget(pattern, root));

  const clickStartMatch = () => clickText(/^(开始匹配|重新匹配|继续匹配|捡一个瓶子|离开聊天)$/);

  const clickLeave = () => {
    const leave = Array.from(document.querySelectorAll('.leave-btn'))
      .map((element) => ({ element, text: getVisibleText(element) }))
      .find((item) => item.text === '离开');

    if (leave) {
      const rect = leave.element.getBoundingClientRect();
      return clickTarget({
        element: leave.element,
        text: leave.text,
        area: rect.width * rect.height,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    }

    return clickText(/^离开$/);
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
        return {
          element,
          text: getVisibleText(element),
          area: rect.width * rect.height,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      })
      .filter((target) => /确认离开|确定|确认/.test(target.text))
      .sort((a, b) => a.area - b.area)[0];

    return clickTarget(primary) || clickText(/^(确认离开|确定|确认)$/);
  };

  const scheduleTick = (delay = TICK_INTERVAL) => {
    if (!state.enabled) return;
    if (state.timer) window.clearTimeout(state.timer);
    state.timer = window.setTimeout(runTick, delay);
  };

  const runTick = () => {
    if (!state.enabled) return;
    annotatePage();

    const now = Date.now();
    if (now - state.lastActionAt < ACTION_INTERVAL) {
      scheduleTick(ACTION_INTERVAL - (now - state.lastActionAt) + 100);
      return;
    }

    if (getLeaveModal()) {
      state.lastActionAt = now;
      setStatus('确认离开中');
      clickConfirmLeave();
      scheduleTick(1800);
      return;
    }

    if (isPaired()) {
      const gender = getGender();
      state.gender = gender;

      if (gender === '女生') {
        triggerFemaleAlert();
        state.enabled = false;
        window.localStorage.removeItem(STORE_KEY);
        if (state.timer) window.clearTimeout(state.timer);
        state.timer = null;
        setStatus('已匹配女生，脚本停止', { gender });
        return;
      }

      if (gender === '男生') {
        state.attempts += 1;
        state.lastActionAt = now;
        setStatus('匹配到男生，准备离开', { gender });
        clickLeave();
        scheduleTick(1800);
        return;
      }

      setStatus('已匹配，等待识别性别', { gender });
      scheduleTick(1000);
      return;
    }

    state.lastActionAt = now;
    setStatus('匹配中');
    clickStartMatch();
    scheduleTick(2600);
  };

  const startAutoFemale = () => {
    state.enabled = true;
    state.attempts = 0;
    state.gender = getGender();
    clearFemaleAlert();
    window.localStorage.setItem(STORE_KEY, '1');
    setStatus('已启用，准备匹配');
    scheduleTick(100);
  };

  const stopAutoFemale = (status = '已手动停止') => {
    state.enabled = false;
    window.localStorage.removeItem(STORE_KEY);
    if (state.timer) window.clearTimeout(state.timer);
    state.timer = null;
    if (!/已匹配女生/.test(status)) clearFemaleAlert();
    setStatus(status);
  };

  const audit = () => ({
    autoFemaleEnabled: state.enabled,
    autoFemaleStatus: state.status,
    autoFemaleAttempts: state.attempts,
    femaleMatchAlert: state.femaleAlert,
    femaleMatchAlertText: state.femaleAlertText,
    partnerInfo: getPartnerInfoText(),
    partnerGender: getGender(),
    paired: isPaired(),
    leaveModalOpen: !!getLeaveModal()
  });

  window.funTalkAndroidBridge = {
    __version: '0.1.0',
    inject: annotatePage,
    setAutoFemaleEnabled: (enabled) => {
      if (enabled) startAutoFemale();
      else stopAutoFemale();
    },
    startAutoFemale,
    stopAutoFemale,
    audit
  };

  annotatePage();
  if (state.enabled) scheduleTick(800);

  if (!window.__funTalkAndroidObserver) {
    window.__funTalkAndroidObserver = new MutationObserver(() => {
      window.requestAnimationFrame(annotatePage);
    });
    window.__funTalkAndroidObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'hidden']
    });
    window.addEventListener('hashchange', annotatePage);
    window.addEventListener('resize', annotatePage);
  }
})();
