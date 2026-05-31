// js/app-animations.js
// Loaded once at app startup, available globally as window.AppAnim

window.AppAnim = {

  async init() {
    if (window.AnimRegistry) {
      await AnimRegistry.init();
    }
    this._injectGlobalContainers();
    this._bindRouteTransitions();
    this._bindLoadingStates();
    this._injectStyles();
  },

  // Inject CSS for toasts and flashes
  _injectStyles() {
    if (document.getElementById('app-anim-global-styles')) return;
    const style = document.createElement('style');
    style.id = 'app-anim-global-styles';
    style.textContent = `
      @keyframes toastIn {
        from { transform: translate(-50%, 30px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      @keyframes toastOut {
        from { transform: translate(-50%, 0); opacity: 1; }
        to { transform: translate(-50%, -20px); opacity: 0; }
      }
      .card-flipping {
        animation: cardFlipEffect 0.4s ease-out;
      }
      @keyframes cardFlipEffect {
        0% { transform: scale(1) rotateY(0); }
        50% { transform: scale(0.95) rotateY(90deg); }
        100% { transform: scale(1) rotateY(0); }
      }
    `;
    document.head.appendChild(style);
  },

  // Inject persistent animation containers into app shell
  _injectGlobalContainers() {
    if (document.getElementById('anim-global-overlay')) return;
    const shell = `
      <!-- Global overlay — used for app-wide celebrations -->
      <div id="anim-global-overlay" style="
        display:none; position:fixed; inset:0;
        z-index:9999; pointer-events:none;
        align-items:center; justify-content:center;
        background: rgba(0,0,0,0.4);">
        <div id="anim-overlay-inner" style="width:280px;height:280px;"></div>
      </div>

      <!-- Loading state — shown during data fetch -->
      <div id="anim-loading" style="
        display:none; position:fixed; inset:0; background:rgba(15, 23, 42, 0.85);
        backdrop-filter: blur(4px);
        z-index:9990; align-items:center; justify-content:center;
        flex-direction:column; gap:16px;">
        <div id="anim-loading-inner" style="width:120px;height:120px;"></div>
        <p id="anim-loading-text" style="
          font-size:15px; font-weight:700; color:#f8fafc; margin:0;
          font-family: 'Outfit', sans-serif;">
          Loading...
        </p>
      </div>

      <!-- Toast notification area -->
      <div id="anim-toast-area" style="
        position:fixed; bottom:90px; left:50%; transform:translateX(-50%);
        z-index:9997; pointer-events:none; display:flex;
        flex-direction:column; gap:8px; align-items:center; width:100%; max-width:360px;">
      </div>

      <!-- Empty state container — shown when sections have no content -->
      <div id="anim-empty-state" style="
        display:none; width:100%; padding:48px 16px; box-sizing:border-box;
        align-items:center; justify-content:center; flex-direction:column; text-align:center;">
        <div id="anim-empty-inner" style="width:160px;height:160px;"></div>
        <p id="anim-empty-text" style="
          font-size:15px; color:var(--text-2, #94a3b8);
          margin:16px 0 0; text-align:center; font-weight:600;">
        </p>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', shell);
  },

  // Show loading animation before route renders
  _bindRouteTransitions() {
    if (typeof routes !== 'undefined') {
      Object.keys(routes).forEach(path => {
        const entry = routes[path];
        if (entry && entry.render && !entry._patched) {
          const originalRender = entry.render;
          entry.render = async (container) => {
            document.dispatchEvent(new CustomEvent('routeChangeStart', { detail: { path } }));
            try {
              await originalRender(container);
            } finally {
              document.dispatchEvent(new CustomEvent('routeChangeComplete', { detail: { path } }));
            }
          };
          entry._patched = true;
        }
      });
    }

    document.addEventListener('routeChangeStart', (e) => {
      // Don't trigger full loading for learning-mode or dashboard as they have custom spinners
      if (e.detail?.path !== '/learning-mode' && e.detail?.path !== '/') {
        this.showLoading('Loading Page...');
      }
    });

    document.addEventListener('routeChangeComplete', () => {
      this.hideLoading();
      
      // Animate progress bars from 0 to value on mount
      setTimeout(() => {
        document.querySelectorAll('.progress-fill, .progress-bar-fill, .study-progress-bar > div, .duo-progress-fill, .dash-progress-fill').forEach(bar => {
          const target = bar.style.width || '0%';
          bar.style.width = '0%';
          // Trigger style reflow
          void bar.offsetWidth;
          requestAnimationFrame(() => {
            bar.style.transition = 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
            bar.style.width = target;
          });
        });
      }, 50);
    });
  },

  // Auto-show loading animation on all fetch() calls
  _bindLoadingStates() {
    const originalFetch = window.fetch;
    let activeRequests = 0;
    window.fetch = async (...args) => {
      const url = args[0];
      const isLottie = typeof url === 'string' && (url.includes('.json') || url.includes('lottiefiles'));
      
      if (!isLottie) {
        activeRequests++;
        if (activeRequests === 1) this.showLoading('Fetching Database...');
      }
      try {
        return await originalFetch(...args);
      } finally {
        if (!isLottie) {
          activeRequests--;
          if (activeRequests === 0) this.hideLoading();
        }
      }
    };
  },

  // ── PUBLIC API ─────────────────────────────────────────────

  showLoading(text = 'Loading...') {
    const el = document.getElementById('anim-loading');
    const textEl = document.getElementById('anim-loading-text');
    if (textEl) textEl.textContent = text;
    if (el) el.style.display = 'flex';
    if (window.AnimRegistry) {
      AnimRegistry.play('app_loading', 'anim-loading-inner', { loop: true });
    }
  },

  hideLoading() {
    if (window.AnimRegistry) {
      AnimRegistry.stop('anim-loading-inner');
    }
    const el = document.getElementById('anim-loading');
    if (el) el.style.display = 'none';
  },

  showEmpty(containerId, text = 'Nothing here yet') {
    const target = document.getElementById(containerId);
    if (!target) return;

    // Inject empty state HTML into target
    target.innerHTML = `
      <div id="anim-empty-state-active" style="
        display:flex; width:100%; padding:48px 16px; box-sizing:border-box;
        align-items:center; justify-content:center; flex-direction:column; text-align:center;">
        <div id="anim-empty-inner-active" style="width:160px;height:160px;"></div>
        <p style="
          font-size:15px; color:var(--text-2, #94a3b8);
          margin:16px 0 0; text-align:center; font-weight:600;">
          ${text}
        </p>
      </div>
    `;
    if (window.AnimRegistry) {
      AnimRegistry.play('app_empty_state', 'anim-empty-inner-active', { loop: true });
    }
  },

  hideEmpty() {
    if (window.AnimRegistry) {
      AnimRegistry.stop('anim-empty-inner-active');
    }
    const el = document.getElementById('anim-empty-state-active');
    if (el) el.remove();
  },

  showSuccess(text = 'Done!') {
    this.showToast(text, 'app_success', 2000);
  },

  showError(text = 'Something went wrong') {
    this.showToast(text, 'app_error', 3000);
  },

  async showToast(text, animKey, duration = 2500) {
    const toastArea = document.getElementById('anim-toast-area');
    if (!toastArea) return;

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: var(--card-bg, #1e293b); 
      border: 1.5px solid var(--border, rgba(255,255,255,0.08));
      border-radius: 24px; padding: 10px 20px;
      display: flex; align-items: center; gap: 12px;
      font-size: 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      animation: toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      pointer-events: auto;
      color: var(--text, #f8fafc);
      font-weight: 600;
      font-family: 'Outfit', sans-serif;
    `;

    const animContainer = document.createElement('div');
    animContainer.style.cssText = 'width:32px;height:32px;flex-shrink:0;';
    const animId = `toast-anim-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    animContainer.id = animId;

    const label = document.createElement('span');
    label.textContent = text;

    toast.appendChild(animContainer);
    toast.appendChild(label);
    toastArea.appendChild(toast);

    if (window.AnimRegistry) {
      AnimRegistry.play(animKey, animId, { loop: false, duration });
    }

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  celebrate(type = 'session_complete') {
    const overlay = document.getElementById('anim-global-overlay');
    if (overlay) overlay.style.display = 'flex';
    if (window.AnimRegistry) {
      AnimRegistry.play(type, 'anim-overlay-inner', { loop: false, duration: 3500 });
    }
    setTimeout(() => {
      if (overlay) overlay.style.display = 'none';
    }, 3600);
  },
};
