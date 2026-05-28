/* Zhongwen app core: router, state, dashboard, library, settings. */



'use strict';

const isApk = typeof window.AndroidStorage !== 'undefined' || typeof window.AndroidTTS !== 'undefined';


// Lightweight static-app lock. This stops casual visitors on public hosting;
// it is not a substitute for server-side authentication.
const AppLock = {
  hash: '44996a8471286fd779ce18692c2cf03779e931e64eb1b8149ecb0d353acaf2cc',
  sessionKey: 'zhongwen_app_unlocked',
  booted: false,

  isUnlocked() {
    return sessionStorage.getItem(this.sessionKey) === '1' || localStorage.getItem(this.sessionKey) === '1';
  },

  async digest(value) {
    const clean = String(value || '').trim();
    const data = new TextEncoder().encode(clean);
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return [...new Uint8Array(hashBuffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    }
    const bytes = Array.from(data);
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push((bitLen / Math.pow(2, i * 8)) & 255);
    const k = [1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];
    let h = [1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225];
    const rotr = (n, x) => (x >>> n) | (x << (32 - n));
    for (let i = 0; i < bytes.length; i += 64) {
      const w = new Array(64);
      for (let j = 0; j < 16; j++) w[j] = ((bytes[i + j*4] << 24) | (bytes[i + j*4 + 1] << 16) | (bytes[i + j*4 + 2] << 8) | bytes[i + j*4 + 3]) >>> 0;
      for (let j = 16; j < 64; j++) {
        const s0 = rotr(7,w[j-15]) ^ rotr(18,w[j-15]) ^ (w[j-15] >>> 3);
        const s1 = rotr(17,w[j-2]) ^ rotr(19,w[j-2]) ^ (w[j-2] >>> 10);
        w[j] = (w[j-16] + s0 + w[j-7] + s1) >>> 0;
      }
      let [a,b,c,d,e,f,g,hh] = h;
      for (let j = 0; j < 64; j++) {
        const S1 = rotr(6,e) ^ rotr(11,e) ^ rotr(25,e);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (hh + S1 + ch + k[j] + w[j]) >>> 0;
        const S0 = rotr(2,a) ^ rotr(13,a) ^ rotr(22,a);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;
        hh = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      h = h.map((x, j) => (x + [a,b,c,d,e,f,g,hh][j]) >>> 0);
    }
    return h.map(x => x.toString(16).padStart(8, '0')).join('');
  },

  show() {
    document.documentElement.setAttribute('data-locked', 'true');
    const lock = document.getElementById('app-lock');
    if (lock) lock.hidden = false;
    requestAnimationFrame(() => document.getElementById('app-lock-password')?.focus());
  },

  hide() {
    document.documentElement.removeAttribute('data-locked');
    const lock = document.getElementById('app-lock');
    if (lock) lock.hidden = true;
  },

  async unlock(password) {
    const enteredHash = await this.digest(password || '');
    if (enteredHash !== this.hash) return false;
    sessionStorage.setItem(this.sessionKey, '1');
    localStorage.setItem(this.sessionKey, '1');
    this.hide();
    this.startApp().catch(err => {
      console.error('App boot failed after unlock:', err);
    });
    return true;
  },

  lock() {
    sessionStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.sessionKey);
    this.show();
  },

  async startApp() {
    if (this.booted) return;
    this.booted = true;
    await boot();
  },

  init() {
    const form = document.getElementById('app-lock-form');
    const error = document.getElementById('app-lock-error');
    form?.addEventListener('submit', async event => {
      event.preventDefault();
      const input = document.getElementById('app-lock-password');
      const submit = form.querySelector('button[type="submit"]');
      if (error) error.textContent = '';
      if (submit) submit.disabled = true;
      try {
        const ok = await this.unlock((input?.value || '').trim());
        if (!ok) {
          if (error) error.textContent = 'Incorrect password. Try again.';
          if (input) {
            input.value = '';
            input.focus();
          }
        }
      } catch (err) {
        if (error) error.textContent = 'Unlock failed in this browser.';
      } finally {
        if (submit) submit.disabled = false;
      }
    });

    if (this.isUnlocked()) {
      this.hide();
      this.startApp();
    } else {
      this.show();
    }
  }
};

function lockApp() {
  AppLock.lock();
}

// Section
const App = {
  state: {
    characters: [],
    vocabulary: null,
    settings: {},
    progress: {},
    loading: false,
  },

  // Load settings from localStorage
  loadSettings() {
    const defaults = {
      theme: 'dark',
      annotation: 'pinyin',       // pinyin | zhuyin | both | none
      toneColors: true,
      dailyGoal: 10,
      quizDifficulty: 'A2',
      defaultQuizCount: 20,
      showQuizPinyin: true,
      displayName: 'Learner',
      showZhuyinDefault: false,
      fontChoice: 'noto-sans',
      unlockAll: true,
      guidedMode: true,
    };
    const saved = localStorage.getItem('tocfl_settings');
    this.state.settings = saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    // Force unlockAll to true as requested
    this.state.settings.unlockAll = true;
    this.applyTheme(this.state.settings.theme);
    this.applyFontPreference(this.state.settings.fontChoice);
  },

  saveSettings() {
    localStorage.setItem('tocfl_settings', JSON.stringify(this.state.settings));
  },

  applyTheme(theme) {
    const visualTheme = theme || 'dark';
    document.documentElement.setAttribute('data-theme', visualTheme);
    const btn = document.getElementById('dark-mode-toggle');
    if (btn) btn.innerHTML = visualTheme === 'dark' ? '&#9728;' : '&#9790;'
  },

  fontPresets: {
    'noto-sans': {
      label: 'Noto Sans',
      zh: "'Noto Sans TC', 'Microsoft JhengHei', 'PingFang TC', 'Heiti TC', sans-serif",
      ui: "'DM Sans', 'Noto Sans TC', system-ui, sans-serif",
      pinyin: "'DM Sans', 'Noto Sans TC', system-ui, sans-serif"
    },
    'original-serif': {
      label: 'Original Serif',
      zh: "'Noto Serif TC', 'Noto Sans TC', serif",
      ui: "'DM Sans', 'Noto Sans TC', system-ui, sans-serif",
      pinyin: "'DM Sans', 'Noto Sans TC', system-ui, sans-serif"
    },
    'jhenghei': {
      label: 'JhengHei',
      zh: "'Microsoft JhengHei', 'Noto Sans TC', 'PingFang TC', sans-serif",
      ui: "'Microsoft JhengHei', 'DM Sans', system-ui, sans-serif",
      pinyin: "'DM Sans', 'Microsoft JhengHei', system-ui, sans-serif"
    },
    'pingfang': {
      label: 'PingFang',
      zh: "'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif",
      ui: "'PingFang TC', 'DM Sans', system-ui, sans-serif",
      pinyin: "'DM Sans', 'PingFang TC', system-ui, sans-serif"
    },
    'kai': {
      label: 'Kai Style',
      zh: "'BiauKai', 'DFKai-SB', 'KaiTi', 'Noto Serif TC', serif",
      ui: "'DM Sans', 'Noto Sans TC', system-ui, sans-serif",
      pinyin: "'DM Sans', 'Noto Sans TC', system-ui, sans-serif"
    }
  },

  applyFontPreference(choice) {
    const key = this.fontPresets[choice] ? choice : 'noto-sans';
    const preset = this.fontPresets[key];
    const root = document.documentElement;
    root.style.setProperty('--font-zh', preset.zh);
    root.style.setProperty('--font-ui', preset.ui);
    root.style.setProperty('--font-pinyin', preset.pinyin);
    root.setAttribute('data-font-choice', key);
    const selector = document.getElementById('topbar-font-select');
    if (selector) selector.value = key;
  },


  // Load progress from localStorage
  loadProgress() {
    const saved = localStorage.getItem('tocfl_progress');
    const defaults = {
      learnedChars: [],
      weakChars: [],
      savedSet: [],
      quizHistory: [],
      testHistory: [],
      streak: 0,
      lastStudyDate: null,
      totalReviewed: 0,
      dailyReviewed: 0,
      lastDailyDate: new Date().toDateString(),
      activityLog: [],
      chapters: {},
      scenarios: {},
      playground: {},
      onboardingComplete: false,
      mastery: 0
    };
    
    // Load from local storage or use defaults
    this.state.progress = saved ? { ...defaults, ...JSON.parse(saved) } : { ...defaults };
    
    this.updateStreak();
  },

  saveProgress() {
    localStorage.setItem('tocfl_progress', JSON.stringify(this.state.progress));
  },

  updateStreak() {
    const today = new Date().toDateString();
    const last = this.state.progress.lastStudyDate;
    if (last === today) return; // already counted today

    let changed = false;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (last === yesterday) {
      this.state.progress.streak = (this.state.progress.streak || 0) + 1;
      changed = true;
    } else if (last !== today) {
      const oldStreak = this.state.progress.streak;
      this.state.progress.streak = last ? 0 : (this.state.progress.streak || 0);
      if (this.state.progress.streak !== oldStreak) changed = true;
    }
    this.state.progress.lastStudyDate = today;
    changed = true;

    // Reset daily count if new day
    if (this.state.progress.lastDailyDate !== today) {
      this.state.progress.dailyReviewed = 0;
      this.state.progress.lastDailyDate = today;
      changed = true;
    }

    if (changed) {
      this.saveProgress();
    }
  },

  logActivity(icon, text) {
    const log = this.state.progress.activityLog || [];
    log.unshift({ icon, text, time: new Date().toISOString() });
    this.state.progress.activityLog = log.slice(0, 20);
    this.saveProgress();
  },

  markLearned(hanzi) {
    if (!this.state.progress.learnedChars.includes(hanzi)) {
      this.state.progress.learnedChars.push(hanzi);
      this.state.progress.totalReviewed++;
      this.state.progress.dailyReviewed++;
      this.state.progress.lastStudyDate = new Date().toDateString();
      this.saveProgress();
    }
  },

  markWeak(hanzi) {
    if (!this.state.progress.weakChars.includes(hanzi)) {
      this.state.progress.weakChars.push(hanzi);
      this.saveProgress();
    }
  },

  unmarkWeak(hanzi) {
    this.state.progress.weakChars = this.state.progress.weakChars.filter(h => h !== hanzi);
    this.saveProgress();
  },

  addToSaved(hanzi) {
    if (!this.state.progress.savedSet.includes(hanzi)) {
      this.state.progress.savedSet.push(hanzi);
      this.saveProgress();
    }
  },

  removeFromSaved(hanzi) {
    this.state.progress.savedSet = this.state.progress.savedSet.filter(h => h !== hanzi);
    this.saveProgress();
  },
};
window.App = App;

// Section
const TTS = {
  speak(text, lang = 'zh-TW', rate = 0.85, options = {}) {
    if (typeof lang === 'object') {
      options = lang;
      lang = options.lang || 'zh-TW';
      rate = options.rate || 0.85;
    } else if (typeof rate === 'object') {
      options = rate;
      rate = options.rate || 0.85;
    }
    if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
      try {
        window.AndroidTTS.speak(String(text || ''), String(lang || 'zh-TW'), Number(rate || 0.85));
        return { source: 'android', text, lang, rate };
      } catch (err) {
        console.warn('Android TTS bridge failed, falling back to browser TTS', err);
      }
    }
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      console.warn('TTS unavailable in this browser/WebView');
      if (window.showToast) window.showToast('Audio is unavailable in this browser. On Android, enable the native TTS bridge.');
      return null;
    }
    window.speechSynthesis.cancel();

    // Normalization for pinyin-only inputs or problematic characters.
    let processedText = String(text || '').trim();
    const pinyinKey = processedText.toLowerCase();

    // Map common standalone pinyin examples to Hanzi so browser/native TTS speaks
    // the syllable naturally instead of spelling Latin letters one by one.
    const exactPinyinMap = {
      'mā': '媽', 'má': '麻', 'mǎ': '馬', 'mà': '罵',
      'bā': '八', 'bá': '拔', 'bǎ': '把', 'bà': '爸',
      'bō': '波', 'bó': '伯', 'bǐ': '比', 'bù': '不',
      'pā': '趴', 'pá': '爬', 'pó': '婆', 'pǐ': '匹',
      'wū': '屋', 'wú': '無', 'wǔ': '五', 'wù': '物',
      'hú': '胡', 'hé': '河', 'hē': '喝', 'hǎo': '好', 'hòu': '後',
      'yī': '一', 'yí': '疑', 'yǐ': '以', 'yì': '意',
      'nǚ': '女', 'lǚ': '旅', 'qù': '去', 'jū': '居', 'xū': '需',
      'yǔ': '語', 'yú': '魚', 'nǐ hǎo': '你好', 'nǐ': '你',
      'nán': '男', 'nǎi': '奶', 'niú': '牛',
      'lǐ': '裡', 'lán': '藍', 'lái': '來', 'liù': '六',
      'jiā': '家', 'jiē': '街', 'jiù': '舊',
      'qī': '七', 'qǐ': '起',
      'xī': '西', 'xiā': '蝦', 'xiǎo': '小', 'xīn': '心', 'xiū': '修', 'xiē': '些',
      'zhī': '知', 'zhǐ': '紙', 'zhù': '住', 'zhǎo': '找', 'zhā': '渣', 'zhài': '債', 'zhōng': '中',
      'zī': '資', 'zǐ': '子', 'zū': '租', 'zǎo': '早', 'zài': '在',
      'chī': '吃', 'chū': '出',
      'shā': '沙', 'shēn': '身', 'shī': '詩', 'shū': '書', 'shú': '熟', 'shǔ': '鼠', 'shù': '樹', 'shōu': '收',
      'rén': '人', 'māo': '貓', 'máo': '毛', 'mǎo': '卯', 'mào': '帽',
      'tāng': '湯', 'táng': '糖', 'tǎng': '躺', 'tàng': '燙',
      'mái': '埋', 'mài': '賣', 'mǎi': '買', 'wén': '聞', 'wèn': '問',
      'sǐ': '死', 'sì': '四', 'tiān': '天', 'tī': '梯', 'tài': '太', 'tóu': '頭',
      'dà': '大', 'dài': '帶', 'diào': '掉',
      'fàn': '飯', 'fēi': '飛', 'fān': '翻', 'fāng': '方', 'fēng': '風',
      'gē': '哥', 'gǒu': '狗', 'gōu': '溝', 'gěi': '給', 'gōng': '工',
      'kāi': '開', 'mén': '門', 'mán': '蠻', 'màn': '慢', 'máng': '忙', 'míng': '明', 'mēng': '蒙',
      'bēi': '杯', 'bào': '報', 'biàn': '變', 'biē': '憋', 'piào': '票',
      'a': '啊', 'o': '喔', 'e': '鵝', 'i': '衣', 'u': '屋', 'ü': '魚'
    };

    if (exactPinyinMap[pinyinKey]) {
      processedText = exactPinyinMap[pinyinKey];
    }

    const utt = new SpeechSynthesisUtterance(processedText);
    utt.lang = lang;
    utt.rate = rate;
    const gender = options.gender || null;
    utt.pitch = options.pitch || (gender === 'male' ? 0.88 : gender === 'female' ? 1.08 : 1.0);

    // Try to get a high-quality Chinese voice. Gender is best-effort because browsers expose different voice lists.
    const voices = window.speechSynthesis.getVoices();
    const preferredFemale = ['Yating', 'Hanhan', 'Xiaoxiao', 'HsiaoChen', 'Mei-Jia', 'Ting-Ting', 'Google åœ‹èªž'];
    const preferredMale = ['Yunxi', 'Zhiwei', 'Kangkang', 'Google æ™®é€šè©±', 'Google Mandarin'];
    const preferred = [
      'Microsoft Yating Online (Natural) - Chinese (Taiwan)',
      'Microsoft Yunxi Online (Natural) - Chinese (Mainland)',
      'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)',
      'Microsoft Hiuga Online (Natural) - Chinese (Hong Kong)',
      'Google åœ‹èªž', 'Google æ™®é€šè©±', 'Google Mandarin',
      'Xiaoxiao', 'Yating', 'Hanhan', 'Yunxi', 'Zhiwei', 'Mei-Jia'
    ];
    const zhVoices = voices.filter(v => v.lang && v.lang.startsWith('zh'));
    const genderNames = gender === 'male' ? preferredMale : gender === 'female' ? preferredFemale : [];
    let bestVoice = null;

    for (const name of genderNames) {
      bestVoice = zhVoices.find(v => v.name.includes(name));
      if (bestVoice) break;
    }

    if (!bestVoice) {
      for (const name of preferred) {
        bestVoice = zhVoices.find(v => v.name.includes(name));
        if (bestVoice) break;
      }
    }
    
    if (!bestVoice) {
      bestVoice = voices.find(v => v.lang === lang) || voices.find(v => v.lang === 'zh-TW') || zhVoices[0];
    }
    
    if (bestVoice) utt.voice = bestVoice;

    window.speechSynthesis.speak(utt);
    return utt;
  },

  status() {
    const hasAndroid = !!(window.AndroidTTS && typeof window.AndroidTTS.speak === 'function');
    const hasBrowser = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
    const voices = hasBrowser ? window.speechSynthesis.getVoices() : [];
    const zhVoices = voices.filter(v => /^(zh|cmn)/i.test(v.lang || '') || /Chinese|Mandarin|Taiwan|Hong Kong/i.test(v.name || ''));
    return { hasAndroid, hasBrowser, voices: voices.length, zhVoices: zhVoices.length, available: hasAndroid || hasBrowser };
  },

  test(text = '\u4f60\u597d\uff0c\u6211\u6b63\u5728\u5b78\u4e2d\u6587\u3002') {
    return this.speak(text, 'zh-TW', 0.78);
  },

  ready(cb) {
    if (!window.speechSynthesis) { cb(); return; }
    if (window.speechSynthesis.getVoices().length) { cb(); return; }
    window.speechSynthesis.addEventListener('voiceschanged', cb, { once: true });
  },
};
window.TTS = TTS;
function showToast(message, ms = 2600) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = 'position:fixed;left:50%;bottom:86px;transform:translateX(-50%);z-index:99999;max-width:min(92vw,520px);padding:12px 16px;border-radius:14px;background:var(--text);color:var(--card-bg);box-shadow:var(--shadow-lg);font-weight:800;text-align:center;opacity:0;pointer-events:none;transition:opacity .2s ease';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { toast.style.opacity = '0'; }, ms);
}
window.showToast = showToast;

// Section
const Pinyin = {
  TONE_MAP: {
    a: ['\u0101','\u00e1','\u01ce','\u00e0','a'], e: ['\u0113','\u00e9','\u011b','\u00e8','e'],
    i: ['\u012b','\u00ed','\u01d0','\u00ec','i'], o: ['\u014d','\u00f3','\u01d2','\u00f2','o'],
    u: ['\u016b','\u00fa','\u01d4','\u00f9','u'], v: ['\u01d6','\u01d8','\u01da','\u01dc','\u00fc']
  },

  getTone(pinyin) {
    if (!pinyin) return 0;
    const p = String(pinyin).toLowerCase();
    if (/[\u0101\u0113\u012b\u014d\u016b\u01d6]/.test(p)) return 1;
    if (/[\u00e1\u00e9\u00ed\u00f3\u00fa\u01d8]/.test(p)) return 2;
    if (/[\u01ce\u011b\u01d0\u01d2\u01d4\u01da]/.test(p)) return 3;
    if (/[\u00e0\u00e8\u00ec\u00f2\u00f9\u01dc]/.test(p)) return 4;
    const numbered = p.match(/[1-5](?!\d)/);
    if (numbered) return Number(numbered[0]);
    return 5;
  },

  colorize(pinyin) {
    if (!App.state.settings.toneColors) return `<span class="pinyin">${pinyin}</span>`;
    const tone = this.getTone(pinyin);
    const cls = tone >= 1 && tone <= 5 ? `tone${tone}` : '';
    return `<span class="pinyin ${cls}">${pinyin}</span>`;
  },

  toneBase(pinyin) {
    const first = String(pinyin || '').trim().split(/\s+/)[0] || 'ma';
    return first.toLowerCase()
      .replace(/[\u0101\u00e1\u01ce\u00e0]/g, 'a').replace(/[\u0113\u00e9\u011b\u00e8]/g, 'e')
      .replace(/[\u012b\u00ed\u01d0\u00ec]/g, 'i').replace(/[\u014d\u00f3\u01d2\u00f2]/g, 'o')
      .replace(/[\u016b\u00fa\u01d4\u00f9]/g, 'u').replace(/[\u01d6\u01d8\u01da\u01dc\u00fc]/g, 'v')
      .replace(/[^a-zv]/g, '') || 'ma';
  },

  markSyllable(base, tone) {
    const raw = String(base || 'ma').toLowerCase().replace(/\u00fc/g, 'v');
    const t = Math.max(1, Math.min(4, Number(tone) || 1)) - 1;
    let vowel = '';
    if (raw.includes('a')) vowel = 'a';
    else if (raw.includes('e')) vowel = 'e';
    else if (raw.includes('ou')) vowel = 'o';
    else {
      const matches = [...raw.matchAll(/[aeiouv]/g)];
      vowel = matches.length ? matches[matches.length - 1][0] : '';
    }
    if (!vowel) return raw.replace(/v/g, '\u00fc');
    const idx = raw.indexOf(vowel);
    return (raw.slice(0, idx) + this.TONE_MAP[vowel][t] + raw.slice(idx + 1)).replace(/v/g, '\u00fc');
  },

  toneOptionsFor(pinyin, correctTone) {
    const base = this.toneBase(pinyin);
    const answerTone = Number(correctTone || this.getTone(pinyin));
    return [1, 2, 3, 4].map(tone => ({
      label: this.markSyllable(base, tone),
      pinyin: this.markSyllable(base, tone),
      tone,
      isCorrect: tone === answerTone,
      correct: tone === answerTone
    }));
  },

  numberedToMarked(s) {
    if (!s) return '';
    return String(s).replace(/([a-zA-Z\u00fc\u00dc]+)([1-5])/g, (_, syl, tone) => {
      const t = parseInt(tone, 10) - 1;
      if (t < 0 || t > 3) return syl.replace(/v/g, '\u00fc');
      return this.markSyllable(syl, t + 1);
    });
  }
};
window.Pinyin = Pinyin;

// Section
const PinyinAudio = {
  manifest: null,
  loading: null,

  async ensureManifest() {
    if (this.manifest) return this.manifest;
    if (!this.loading) {
      this.loading = API.get('pinyin_human_manifest').then(data => {
        this.manifest = data || { items: {} };
        return this.manifest;
      }).catch(() => {
        this.manifest = { items: {} };
        return this.manifest;
      });
    }
    return this.loading;
  },

  numberedAudioKeyFromPinyin(pinyin) {
    if (!pinyin || typeof Pinyin === 'undefined') return '';
    if (/\s/.test(String(pinyin).trim())) return '';
    const tone = Pinyin.getTone(pinyin);
    if (!tone || tone === 5) return '';
    return Pinyin.toneBase(pinyin) + tone;
  },

  normalizeKey(key) {
    const clean = String(key || '').toLowerCase().replace(/u:/g, 'v').replace(/\u00fc/g, 'v');
    return clean ? [clean, clean.includes('v') ? clean.replace(/v/g, 'uu') : ''].filter(Boolean) : [];
  },

  candidates(input = {}) {
    const item = typeof input === 'string' ? { audioKey: input } : (input || {});
    const keys = [item.audioKey, item.pinyinNumbered, item.pinyin_numbered, this.numberedAudioKeyFromPinyin(item.pinyin || item.py || item.syllable)];
    const toneMatch = String(item.audioKey || '').match(/^tone_([a-zv]+)_([1-5])$/i);
    if (toneMatch) keys.push(toneMatch[1].toLowerCase() + toneMatch[2]);
    return Array.from(new Set(keys.filter(Boolean).flatMap(key => this.normalizeKey(key))));
  },

  async src(input = {}) {
    const manifest = await this.ensureManifest();
    const items = manifest.items || {};
    const key = this.candidates(input).find(candidate => items[candidate]?.src);
    return key ? items[key].src : '';
  },

  async play(input = {}, fallbackText = '', options = {}) {
    const src = await this.src(input);
    if (src) {
      try {
        const audio = new Audio(src);
        await audio.play();
        return { source: 'human', src };
      } catch (err) {
        console.warn('Human pinyin audio failed, falling back to TTS:', err);
      }
    }
    const item = typeof input === 'string' ? {} : (input || {});
    const spoken = fallbackText || item.hanzi || item.traditional || item.audioText || item.audio_text || item.example || '';
    const hasHanzi = /[\u3400-\u9fff]/.test(spoken);
    if (spoken && hasHanzi && window.TTS && typeof TTS.speak === 'function') {
      TTS.speak(spoken, options.lang || 'zh-TW', options.rate || 0.72, options);
      return { source: 'tts', text: spoken };
    }
    if (window.showToast) showToast('No audio is available for this item.');
    return null;
  }
};
window.PinyinAudio = PinyinAudio;

// Section
const API = {
  base: 'data', // Relative to public/
  version: '206', // Match index.html version for consistency
  _cache: {}, // In-memory cache to prevent redundant JSON parsing lag

  async get(path) {
    // Determine the base path: default to 'data' unless explicitly pointing elsewhere
    const cleanPath = path.replace(/^\/+/, '');
    let url = (cleanPath.startsWith('books/') || cleanPath.startsWith('assets/')) ? cleanPath : `${this.base}/${cleanPath}`;
    if (!url.endsWith('.json')) url += '.json';
    
    // Check in-memory cache first (Lightning fast, zero parsing)
    if (this._cache[url]) {
        return this._cache[url];
    }

    // Use fixed version for SW caching performance
    const fetchUrl = `${url}?v=${this.version}`;
    
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`Fetch ${fetchUrl} failed: ${res.status}`);
    
    const data = await res.json();
    this._cache[url] = data; // Store parsed object
    return data;
  },

  // Helper to load scripts on demand
  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  },

  async getCharacters(params = {}) {
    // 1. If we have characters in state and no specific filters/search, return them
    if (App.state.characters && App.state.characters.length > 0) {
        if (Object.keys(params).length === 0 || (params.limit === 9999 && !params.search && !params.level)) {
            return { total: App.state.characters.length, data: App.state.characters };
        }
        
        // 2. Local filtering if characters are already preloaded
        let results = [...App.state.characters];
        const { level, category, search, limit = 50, offset = 0 } = params;
        if (level) results = results.filter(c => c.level === level.toLowerCase());
        if (category) results = results.filter(c => c.category === category.toLowerCase());
        if (search) {
            const q = search.trim().toLowerCase();
            results = results.filter(c => 
                c.hanzi.includes(q) || 
                (c.traditional && c.traditional.includes(q)) ||
                (c.definition && c.definition.toLowerCase().includes(q)) ||
                (c.pinyin && c.pinyin.toLowerCase().includes(q))
            );
        }
        return { total: results.length, data: results.slice(offset, offset + limit) };
    }

    // 3. Fallback to fetch if not preloaded (usually only on first visit/hard refresh)
    const result = await this.get('characters_all');
    return result;
  },

  async getCharacter(hanzi) {
    if (App.state.characters) {
        const char = App.state.characters.find(c => c.hanzi === hanzi || c.traditional === hanzi);
        if (char) return char;
    }
    const result = await this.getCharacters();
    return result.data.find(c => c.hanzi === hanzi || c.traditional === hanzi);
  },

  async getReadings() {
    const readings = await this.get('readings');
    return readings.map(r => ({
      id: r.id, title: r.title, genre: r.genre, difficulty: r.difficulty,
      char_count: r.text_zh ? r.text_zh.length : 0,
      question_count: r.questions ? r.questions.length : 0,
      description: r.description
    }));
  },

  async getReading(id) {
    const readings = await this.get('readings');
    const reading = readings.find(r => r.id === id);
    if (reading && !reading.tokens) {
        const vocab = await this.get('vocabulary');
        reading.tokens = this.annotateText(reading.text_zh, App.state.characters, vocab);
    }
    return reading;
  },

  async annotate(text) {
    const vocab = await this.get('vocabulary');
    const tokens = this.annotateText(text, App.state.characters, vocab);
    return { tokens };
  },

  async fetchURL(url) {
    throw new Error('URL fetching is not supported in the static version. Please copy-paste text instead.');
  },

  async getMockTests(type) {
    const tests = await this.get('mock-tests');
    let filtered = tests;
    if (type) filtered = tests.filter(t => t.type === type);
    return filtered.map(t => ({
      id: t.id, title: t.title, type: t.type, difficulty: t.difficulty,
      question_count: t.questions ? t.questions.length : 0,
      time_limit: t.time_limit
    }));
  },

  async getMockTest(id) {
    const tests = await this.get('mock-tests');
    return tests.find(t => t.id === id);
  },

  async getStats() {
    const characters = App.state.characters;
    const byLevel = { novice: 0, a1: 0, a2: 0, b1: 0 };
    (characters || []).forEach(c => { if (byLevel[c.level] !== undefined) byLevel[c.level]++; });
    return { total_characters: characters.length, by_level: byLevel, app_version: '206' };
  },

  annotateText(text, characters, vocab) {
    if (!text || !characters) return [];
    const charMap = {};
    characters.forEach(c => { charMap[c.hanzi] = c; if (c.traditional) charMap[c.traditional] = c; });
    const wordMap = {};
    if (vocab && vocab.sets) {
      vocab.sets.forEach(set => {
        (set.words || []).forEach(w => {
          if (w.word && w.word.length > 1) wordMap[w.word] = w;
        });
      });
    }
    const tokens = [];
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (!this.isChinese(ch)) {
        tokens.push({ hanzi: ch, pinyin: '', zhuyin: '', definition: '', type: 'punct' });
        i++; continue;
      }
      let matched = false;
      for (let len = Math.min(6, text.length - i); len > 1; len--) {
        const candidate = text.substring(i, i + len);
        if (wordMap[candidate]) {
          const w = wordMap[candidate];
          tokens.push({ hanzi: candidate, pinyin: w.pinyin || '', zhuyin: w.zhuyin || '', definition: w.definition || '', type: 'word' });
          i += len; matched = true; break;
        }
      }
      if (!matched) {
        const data = charMap[ch];
        if (data) {
          tokens.push({ hanzi: ch, pinyin: data.pinyin || '', zhuyin: data.zhuyin || '', definition: data.definition || '', type: 'char' });
        } else {
          tokens.push({ hanzi: ch, pinyin: '', zhuyin: '', definition: '', type: 'unknown' });
        }
        i++;
      }
    }
    return tokens;
  },

  isChinese(ch) {
    const code = ch.charCodeAt(0);
    return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf) || (code >= 0xf900 && code <= 0xfaff);
  }
};

// Section
window.Modal = {
  show(html) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = html;
    overlay.classList.remove('hidden');
    overlay.addEventListener('click', e => {
      if (e.target === overlay) this.hide();
    }, { once: true });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.hide();
    }, { once: true });
  },

  hide() {
    document.getElementById('modal-overlay').classList.add('hidden');
  },
};

const Modal = window.Modal;

// Section
function showWordDetail(word) {
  if (window.VocabularyModule && window.VocabularyModule.showDetail(word)) {
    // Success
  } else {
    showCharModal(word[0]); // Fallback to first character
  }
}

// Section
async function showCharModal(hanziOrObj) {
  let char;
  if (typeof hanziOrObj === 'object') {
    char = hanziOrObj;
  } else {
    try { 
      char = await API.getCharacter(hanziOrObj); 
      if (!char) throw new Error('Not found');
    }
    catch (e) { 
      console.warn('Character not found:', hanziOrObj);
      return; 
    }
  }

  const toneClass = `tone${Pinyin.getTone(char.pinyin)}`;
  const isSaved = App.state.progress.savedSet.includes(char.hanzi);
  const isLearned = App.state.progress.learnedChars.includes(char.hanzi);

  const exWords = (char.example_words || []).map(w => `
    <div class="example-word-item">
      <span class="ew-word">${w.word}</span>
      <span class="ew-pinyin">${w.pinyin || ''}</span>
      <span class="ew-def">${w.definition || ''}</span>
    </div>`).join('');

  const sentence = char.example_sentence || {};

  // Ensure modal is wide enough for the 2-column layout
  const modalContent = document.getElementById('modal-content');
  if (modalContent) modalContent.style.maxWidth = '800px';

  Modal.show(`
    <button class="modal-close" onclick="Modal.hide()" aria-label="Close">&times;</button>

    <div class="vd-layout" style="margin-top: 10px;">
      <!-- Left: Context & Explanation -->
      <div class="vd-left" style="text-align:left">
        <div class="vd-word-header" onclick="TTS.speak('${char.traditional || char.hanzi}')" style="cursor:pointer; display:inline-block; margin-bottom:16px">
          <div class="vd-hanzi" style="text-align:left; line-height:1">${char.traditional || char.hanzi}</div>
          <div style="display:flex; align-items:center; gap:8px; margin-top:8px">
            <span class="vd-pinyin tone-colors" style="margin-top:0">${Pinyin.colorize(char.pinyin || '')}</span>
            <span class="vd-audio-icon" aria-label="Audio">Audio</span>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
          <span class="badge ${char.tocfl_band === 'A2' ? 'badge-a2' : 'badge-b1'}">${char.tocfl_band || char.level || ''}</span>
          <span class="badge badge-gray">${char.category || ''}</span>
          <span class="badge badge-gray">${char.stroke_count || '?'} strokes</span>
          <span class="text-muted text-small" style="margin-left:auto">Rank #${char.frequency_rank || '?'}</span>
        </div>

        <div class="modal-section">
          <h4>Definition</h4>
          <p style="font-size:1rem;color:var(--text)">${char.definition || ''}</p>
        </div>

        ${char.example_words && char.example_words.length ? `
        <div class="modal-section">
          <h4>Example Words</h4>
          ${exWords}
        </div>` : ''}

        ${sentence.sentence ? `
        <div class="modal-section">
          <h4>Example Sentence</h4>
          <div class="sentence-block">
            <div class="sb-zh">${sentence.sentence}</div>
            <div class="sb-py">${sentence.pinyin || ''}</div>
            <div class="sb-en">${sentence.english || ''}</div>
          </div>
        </div>` : ''}

        <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
          <button class="btn ${isSaved ? 'btn-secondary' : 'btn-outline'}" id="modal-save-btn"
            onclick="toggleSaveChar('${char.hanzi}', this)">
            ${isSaved ? 'Saved' : 'Save'}
          </button>
          <button class="btn ${isLearned ? 'btn-secondary' : 'btn-gold'}" id="modal-learn-btn"
            onclick="markLearnedFromModal('${char.hanzi}', this)">
            ${isLearned ? 'Learned' : 'Mark Learned'}
          </button>
        </div>
      </div>

      <!-- Right: Interactive Drawing Canvas -->
      <div class="vd-right" style="display:flex; flex-direction:column;">
        <div class="vd-section" style="flex:1; display:flex; flex-direction:column; margin-bottom:0">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px">
            <div class="flex items-center gap-8">
              <select class="input input-sm writing-mode-select" style="width:auto; padding:2px 8px; height:28px; font-size:0.75rem" onchange="DrawingBoard.setMode(this.value)">
                <option value="animated">Animated</option>
                <option value="guided">Guided</option>
                <option value="freehand">Freehand</option>
                <option value="stroke-order">Stroke Order</option>
              </select>
              <div id="app-pen-controls" style="display:flex; align-items:center; gap:8px">
                <input type="range" min="1" max="15" value="4" style="width:60px" oninput="DrawingBoard.setPenWidth(this.value)">
                <button class="btn btn-sm ${DrawingBoard.getState().penOnly ? 'btn-primary' : 'btn-outline'} pen-toggle-btn" id="app-pen-toggle" onclick="DrawingBoard.togglePenOnly()" title="Ignore hand/finger touch, only draw with pen/stylus">Pen Only: ${DrawingBoard.getState().penOnly ? 'ON' : 'OFF'}</button>
                <button class="btn btn-sm ${DrawingBoard.getState().freehandGuide ? 'btn-outline' : 'btn-primary'} freehand-guide-toggle-btn" onclick="DrawingBoard.toggleFreehandGuide()" title="Show or hide the faint guide outline in freehand mode">Guide: ${DrawingBoard.getState().freehandGuide ? 'ON' : 'OFF'}</button>
              </div>
            </div>
            <div class="flex gap-8">
              <button class="btn btn-ghost btn-sm" onclick="App.animateStrokes()">Animate</button>
              <button class="btn btn-ghost btn-sm" onclick="App.clearCanvas()">Reset</button>
            </div>
          </div>
          <div class="canvas-container" style="flex:1; min-height:300px; background:var(--off-white); border:2px dashed var(--border); border-radius:var(--radius); position:relative; overflow:hidden; touch-action:none; display:flex; align-items:center; justify-content:center;">
            <div id="app-hanzi-writer" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;"></div>
            <canvas id="app-freehand-canvas" style="position:absolute; inset:0; width:100%; height:100%; cursor:crosshair; display:none"></canvas>
          </div>
        </div>
      </div>
    </div>
  `);

  setTimeout(() => {
    DrawingBoard.init('app-hanzi-writer', 'app-freehand-canvas', char.hanzi);
    
    // Toggle pen controls visibility based on mode
    const modeSelect = document.querySelector('.vd-right select');
    if (modeSelect) {
        modeSelect.addEventListener('change', (e) => {
            const controls = document.getElementById('app-pen-controls');
            if (controls) controls.style.display = e.target.value === 'freehand' ? 'flex' : 'none';
        });
    }
  }, 50);
}

App.clearCanvas = function() {
  DrawingBoard.reset();
};

App.animateStrokes = function() {
  DrawingBoard.animate();
};

App.initDrawingPad = function(hanzi) {
  DrawingBoard.init('app-hanzi-writer', 'app-freehand-canvas', hanzi);
};
function toggleSaveChar(hanzi, btn) {
  if (App.state.progress.savedSet.includes(hanzi)) {
    App.removeFromSaved(hanzi);
    btn.textContent = 'Save';
    btn.className = 'btn btn-outline';
  } else {
    App.addToSaved(hanzi);
    btn.textContent = 'Saved';
    btn.className = 'btn btn-secondary';
  }
}

function markLearnedFromModal(hanzi, btn) {
  App.markLearned(hanzi);
  btn.textContent = 'Learned';
  btn.className = 'btn btn-secondary';
  App.logActivity('Learned', `Marked ${hanzi} as learned`);
  updateStreakDisplay();
}

function resetAllProgress() {
  if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
    localStorage.removeItem('tocfl_progress');
    location.reload();
  }
}

// Section
const routes = {
  '/':                    { title: 'Dashboard',          render: renderDashboard,         route: 'dashboard' },
  '/masterplan':           { title: 'Masterplan',         render: renderMasterplanPage,   route: 'masterplan' },
  '/onboarding':          { title: 'Pinyin & Tones',     render: renderOnboarding,        route: 'onboarding' },
  '/pinyin-table':         { title: 'Pinyin Table',       render: renderPinyinTablePage,   route: 'pinyin-table' },
  '/beginner-launchpad':  { title: 'Beginner Launchpad', render: renderBeginnerLaunchpadPage, route: 'beginner-launchpad' },
  '/beginner-coach':      { title: 'Beginner Coach',     render: renderBeginnerCoachPage, route: 'beginner-coach' },
  '/learn':               { title: 'Learning Path',      render: renderLearnPath,         route: 'learn' },
  '/b1-coach':           { title: 'B1 Coach',           render: renderB1CoachPage,      route: 'b1-coach' },
  '/study-plan':         { title: 'Study Today',        render: renderStudyPlanPage,    route: 'study-plan' },
  '/mixed-recall':       { title: 'Mixed Recall',       render: renderMixedRecallPage,  route: 'mixed-recall' },
  '/sentence-builder':   { title: 'Sentence Builder',   render: renderSentenceBuilderPage, route: 'sentence-builder' },
  '/chapters':            { title: 'Chapters',           render: renderChaptersPage,      route: 'chapters' },
  '/playground':          { title: 'Beginner Playground', render: renderPlayground,       route: 'playground' },
  '/char-playground':     { title: 'Character Playground',render: renderCharPlayground,   route: 'char-playground' },
  '/scenarios':           { title: 'Everyday Scenarios', render: renderScenariosPage,     route: 'scenarios' },
  '/library':             { title: 'Character Library',  render: renderLibrary,           route: 'library' },
  '/vocabulary':          { title: 'Vocabulary Library', render: renderVocabLibrary,       route: 'vocabulary' },
  '/vocabulary-books':    { title: 'Course Books',       render: renderVocabularyBooks,    route: 'vocabulary-books' },
  '/grammar':             { title: 'Grammar Academy',    render: renderGrammarLibrary,     route: 'grammar' },
  '/flashcards':          { title: 'Flashcards',         render: renderFlashcardsPage,    route: 'flashcards' },
  '/dialogue':            { title: 'Dialogue Practice',  render: renderDialoguePage,      route: 'dialogue' },
  '/quiz/pronunciation':  { title: 'Pronunciation Quiz', render: renderPronunciationQuiz, route: 'quiz-pronunciation' },
  '/quiz/vocabulary':     { title: 'Vocabulary Quiz',    render: renderVocabQuiz,         route: 'quiz-vocabulary' },
  '/quiz/flash':          { title: 'Picture Flash Quiz', render: renderFlashQuizPage,     route: 'quiz-flash' },
  '/quiz/tones':          { title: 'Tone Training',      render: renderToneGame,          route: 'quiz-tones' },
  '/reading':             { title: 'Reading',            render: renderReadingPage,       route: 'reading' },
  '/mock-test/reading':   { title: 'Reading Mock Test',  render: renderMockReadingPage,   route: 'mock-reading' },
  '/mock-test/listening': { title: 'Listening Mock Test', render: renderMockListeningPage, route: 'mock-listening' },

  '/tocfl':               { title: 'TOCFL Exam Center', render: renderTOCFLPage,       route: 'tocfl' },
  '/tocfl-content':       { title: 'TOCFL Content',      render: renderTOCFLContentPage, route: 'tocfl-content' },
  '/exams':               { title: 'Monthly Exams',      render: renderExamsPage,         route: 'exams' },
  '/settings':            { title: 'Settings',           render: renderSettings,          route: 'settings' },
};

function navigate(path) {
  const raw = String(path || '/').trim();
  const withoutHash = raw.startsWith('#') ? raw.slice(1) : raw;
  const normalized = withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`;
  window.location.hash = '#' + normalized;
}

function resolveRoute(path) {
  const cleanPath = String(path || '/').split('?')[0];
  if (routes[cleanPath]) return routes[cleanPath];
  if (cleanPath.startsWith('/beginner-launchpad/')) return routes['/beginner-launchpad'];
  if (cleanPath.startsWith('/beginner-coach/')) return routes['/beginner-coach'];
  return routes['/'];
}

function getPath() {
  const hash = window.location.hash;
  if (!hash || hash === '#' || hash === '#/') return '/';
  return hash.replace('#', '') || '/';
}

let routerRenderToken = 0;

async function router() {
  const token = ++routerRenderToken;
  const path = getPath();
  const route = resolveRoute(path);
  closeMobileNav();

  // 1. Instant UI update (Top bar and active state)
  requestAnimationFrame(() => {
    if (token !== routerRenderToken) return;
    document.getElementById('topbar-title').textContent = route.title;
    updateSidebarActive(route.route);
    updateMobileSectionState(route.route);
  });

  const content = document.getElementById('page-content');
  
  // Clear previous page immediately for instant visual feedback
  content.innerHTML = '';
  
  // Show spinner only if the module takes more than 150ms to render *anything*
  const spinnerTimeout = setTimeout(() => {
    if (token === routerRenderToken && !content.innerHTML.trim()) {
      content.innerHTML = '<div class="spinner"></div>';
    }
  }, 150);

  try {
    // 2. Render the page
    await route.render(content);
    clearTimeout(spinnerTimeout);

    if (token !== routerRenderToken) return;
    
    // Double check path hasn't changed during async render
    if (resolveRoute(getPath()).route !== route.route) {
        router();
    }
  } catch (err) {
    clearTimeout(spinnerTimeout);
    if (token !== routerRenderToken) return;
    content.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">!</div>
        <h3>Something went wrong</h3>
        <p>${err.message}</p>
        <button class="btn btn-primary mt-8" onclick="location.reload()">Reload</button>
      </div>`;
    console.error('Route error:', err);
  }
}


window.addEventListener('hashchange', router);

function closeMobileNav() {
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('nav-scrim');
  const toggle = document.getElementById('mobile-menu-toggle');
  sidebar?.classList.remove('open');
  document.body.classList.remove('nav-open');
  if (scrim) scrim.hidden = true;
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

const mobileNavGroups = {
  start: ['dashboard', 'masterplan', 'b1-coach', 'study-plan', 'learn'],
  beginner: ['onboarding', 'pinyin-table', 'quiz-tones', 'quiz-pronunciation', 'beginner-launchpad', 'playground', 'quiz-flash', 'beginner-coach'],
  course: ['vocabulary-books', 'chapters', 'grammar', 'dialogue', 'reading', 'scenarios'],
  practice: ['flashcards', 'mixed-recall', 'sentence-builder', 'char-playground', 'library', 'vocabulary'],
  exams: ['tocfl', 'tocfl-content', 'exams', 'mock-reading', 'mock-listening', 'quiz-vocabulary']
};

function updateSidebarActive(routeName) {
  document.querySelectorAll('#sidebar .nav-item[data-route]').forEach(item => {
    item.classList.toggle('active', item.dataset.route === routeName);
  });
}

function updateMobileSectionState(routeName) {
  const activeGroup = Object.entries(mobileNavGroups).find(([, routes]) => routes.includes(routeName))?.[0] || 'start';
  document.querySelectorAll('.bottom-nav-menu').forEach(btn => btn.classList.toggle('active', btn.dataset.mobileMenu === activeGroup));
  document.querySelectorAll('.mobile-section-link').forEach(link => link.classList.toggle('active', link.dataset.route === routeName));
  closeMobileSectionTray();
}

function closeMobileSectionTray() {
  const bar = document.getElementById('mobile-section-bar');
  if (!bar) return;
  bar.hidden = true;
  bar.classList.remove('open');
  document.querySelectorAll('.bottom-nav-menu').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
}

function openMobileSection(section) {
  const bar = document.getElementById('mobile-section-bar');
  if (!bar) return;
  const sections = {
    start: [['/', 'dashboard', 'Dashboard'], ['/masterplan', 'masterplan', 'Masterplan'], ['/b1-coach', 'b1-coach', 'B1 Coach'], ['/study-plan', 'study-plan', 'Today'], ['/learn', 'learn', 'Path']],
    beginner: [['/onboarding', 'onboarding', 'Pinyin'], ['/pinyin-table', 'pinyin-table', 'Table'], ['/quiz/tones', 'quiz-tones', 'Tones'], ['/quiz/pronunciation', 'quiz-pronunciation', 'Pronunciation'], ['/beginner-launchpad', 'beginner-launchpad', 'Launchpad'], ['/playground', 'playground', 'Playground'], ['/quiz/flash', 'quiz-flash', 'Picture Quiz'], ['/beginner-coach', 'beginner-coach', 'Coach']],
    course: [['/vocabulary-books', 'vocabulary-books', 'Books'], ['/chapters', 'chapters', 'Chapters'], ['/grammar', 'grammar', 'Grammar'], ['/dialogue', 'dialogue', 'Dialogue'], ['/reading', 'reading', 'Reading'], ['/scenarios', 'scenarios', 'Scenarios']],
    practice: [['/flashcards', 'flashcards', 'Cards'], ['/mixed-recall', 'mixed-recall', 'Mixed'], ['/sentence-builder', 'sentence-builder', 'Sentences'], ['/char-playground', 'char-playground', 'Characters'], ['/library', 'library', 'Library'], ['/vocabulary', 'vocabulary', 'Words']],
    exams: [['/tocfl', 'tocfl', 'TOCFL'], ['/tocfl-content', 'tocfl-content', 'Native'], ['/exams', 'exams', 'Monthly'], ['/mock-test/reading', 'mock-reading', 'Reading Test'], ['/mock-test/listening', 'mock-listening', 'Listening Test'], ['/quiz/vocabulary', 'quiz-vocabulary', 'Vocab Quiz']]
  };
  const sectionIcons = {
    dashboard: 'dashboard', masterplan: 'route', 'b1-coach': 'route', 'beginner-coach': 'check', learn: 'map', onboarding: 'music', 'pinyin-table': 'vocabulary', chapters: 'book', 'beginner-launchpad': 'layers',
    'vocabulary-books': 'notebook', library: 'library', vocabulary: 'vocabulary', grammar: 'grammar', flashcards: 'flashcards',
    tocfl: 'target', 'tocfl-content': 'file', 'quiz-vocabulary': 'vocabulary', 'quiz-flash': 'flashcards', 'quiz-tones': 'target',
    'quiz-pronunciation': 'letters', exams: 'exam', reading: 'reading', dialogue: 'dialogue', 'mock-reading': 'file',
    'mock-listening': 'headphones', 'study-plan': 'check', 'mixed-recall': 'brain', 'sentence-builder': 'layers',
    playground: 'play', 'char-playground': 'puzzle', scenarios: 'scenarios'
  };
  const renderIcon = route => window.IconSystem?.svg(sectionIcons[route] || 'dashboard') || '';
  const currentRoute = resolveRoute(getPath()).route;
  bar.innerHTML = (sections[section] || sections.start)
    .map(([href, route, label]) => `<a class="mobile-section-link" data-route="${route}" href="#${href}">${renderIcon(route)}<span>${label}</span></a>`)
    .join('');
  const isOpenForSection = !bar.hidden && bar.dataset.section === section;
  if (isOpenForSection) {
    closeMobileSectionTray();
    return;
  }
  bar.dataset.section = section;
  bar.hidden = false;
  bar.classList.add('open');
  document.querySelectorAll('.bottom-nav-menu').forEach(btn => {
    const isActive = btn.dataset.mobileMenu === section;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-expanded', String(isActive));
  });
  document.querySelectorAll('.mobile-section-link').forEach(link => link.classList.toggle('active', link.dataset.route === currentRoute));
}

function setupMobileBottomNav() {
  let lastTouchActivation = 0;
  const activate = (btn, source = 'click') => {
    const section = btn?.dataset?.mobileMenu;
    if (!section) return;
    if (source === 'touch' || source === 'pointer-touch') lastTouchActivation = Date.now();
    openMobileSection(section);
  };
  document.querySelectorAll('.bottom-nav-menu').forEach(btn => {
    btn.addEventListener('pointerup', e => {
      if (e.pointerType === 'mouse') return;
      e.preventDefault();
      activate(btn, 'pointer-touch');
    }, { passive: false });
    btn.addEventListener('touchend', e => {
      if (Date.now() - lastTouchActivation < 450) return;
      e.preventDefault();
      activate(btn, 'touch');
    }, { passive: false });
    btn.addEventListener('click', e => {
      if (Date.now() - lastTouchActivation < 450) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      activate(btn, 'click');
    });
  });
  document.getElementById('mobile-section-bar')?.addEventListener('click', e => {
    const link = e.target.closest('.mobile-section-link');
    if (link) closeMobileSectionTray();
  });
  closeMobileSectionTray();
}
function toggleMobileNav() {
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('nav-scrim');
  const toggle = document.getElementById('mobile-menu-toggle');
  const isOpen = !sidebar?.classList.contains('open');
  sidebar?.classList.toggle('open', isOpen);
  document.body.classList.toggle('nav-open', isOpen);
  if (scrim) scrim.hidden = !isOpen;
  if (toggle) toggle.setAttribute('aria-expanded', String(isOpen));
}

// Section

// Section
async function renderDashboard(container) {
  const prog = App.state.progress;
  const chars = App.state.characters || [];
  const totalChars = chars.length || 0;
  const learned = (prog.learnedChars || []).length;
  const pct = totalChars > 0 ? Math.round((learned / totalChars) * 100) : 0;
  const daily = prog.dailyReviewed || 0;
  const goal = App.state.settings.dailyGoal || 10;
  const dailyPct = Math.min(100, Math.round((daily / goal) * 100));
  const srs = SRS.getStats();
  const dueToday = srs.due_today || 0;
  const weakCount = (prog.weakChars || []).length;
  const recentActivity = (prog.activityLog || []).slice(0, 4);
  const todayKeyValue = new Date().toDateString();
  const completedToday = localStorage.getItem('zhongwen_dashboard_done') === todayKeyValue;
  const lastExportRaw = localStorage.getItem('zhongwen_last_progress_export');
  const lastExportDays = lastExportRaw ? Math.floor((Date.now() - new Date(lastExportRaw).getTime()) / 86400000) : null;
  const backupLabel = lastExportDays == null ? 'No backup yet' : (lastExportDays === 0 ? 'Backed up today' : `${lastExportDays}d since backup`);

  const levelStats = ['novice','a1','a2','b1'].map(lvl => {
    const meta = { novice:['Novice','#27ae60'], a1:['A1','#2980b9'], a2:['A2','#e67e22'], b1:['B1','#8e44ad'] }[lvl];
    const total = chars.filter(c => c.level === lvl).length;
    const done = chars.filter(c => c.level === lvl && (prog.learnedChars || []).includes(c.hanzi)).length;
    return { lvl, name: meta[0], color: meta[1], total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }).filter(item => item.total > 0);

  let phase = { label:'Sound Foundation', title:'Start with sounds, not random tests', copy:'Build pinyin, tones, and listening confidence before you load many characters.', href:'#/onboarding', action:'Open Pinyin & Tones', next:'Then do 10 tone questions.' };
  if (dueToday > 0) phase = { label:'Review First', title:'Clear due memory before new content', copy:'SRS due cards are the fastest way to stop forgetting yesterday\'s work.', href:'#/learn', action:'Review Due Cards', next:'Then continue your current beginner lesson.' };
  else if (learned >= 25 && learned < 120) phase = { label:'Beginner Basics', title:'Continue Launchpad in order', copy:'Use Level 1-3 as the first course. Small lessons, real examples, then short checks.', href:'#/beginner-launchpad', action:'Continue Launchpad', next:'Finish one lesson before browsing.' };
  else if (learned >= 120 && learned < 500) phase = { label:'Daily Training', title:'Use Beginner Coach packs', copy:'Work through one structured pack: words, listening, speaking, writing, and recall.', href:'#/beginner-coach', action:'Open Daily Coach', next:'Complete one full pack.' };
  else if (learned >= 500) phase = { label:'Course + Exam Prep', title:'Move into books and TOCFL practice', copy:'Use course dialogues for input, active recall for memory, and TOCFL only as a test.', href:'#/vocabulary-books', action:'Open Course Books', next:'Do one book lesson, then mixed recall.' };

  const tasks = [
    { n:'01', title: dueToday ? 'Review due cards' : 'Sound warmup', text: dueToday ? `${dueToday} SRS cards due today` : '5 minutes of tones or pronunciation', href: dueToday ? '#/learn' : '#/quiz/tones' },
    { n:'02', title:'Main lesson', text: phase.next, href: phase.href },
    { n:'03', title:'Active recall', text:'Build or recall sentences without looking first', href:'#/sentence-builder' },
    { n:'04', title:'Output check', text:'Write, speak, or shadow one short answer', href:'#/beginner-coach' },
    { n:'05', title:'Backup progress', text: backupLabel, href:'#/settings' }
  ];
  const browseGroups = [
    ['Beginner', [['Pinyin & Tones','#/onboarding'], ['Beginner Launchpad','#/beginner-launchpad'], ['Beginner Playground','#/playground'], ['Picture Flash Quiz','#/quiz/flash'], ['Beginner Coach','#/beginner-coach']]],
    ['Course', [['Course Books','#/vocabulary-books'], ['Chapters','#/chapters'], ['Grammar Academy','#/grammar'], ['Dialogues','#/dialogue'], ['Reading','#/reading'], ['Scenarios','#/scenarios']]],
    ['Practice', [['Learning Path / SRS','#/learn'], ['Flashcards','#/flashcards'], ['Mixed Recall','#/mixed-recall'], ['Sentence Builder','#/sentence-builder'], ['Characters','#/library'], ['Vocabulary','#/vocabulary']]],
    ['Exams', [['TOCFL Exam Center','#/tocfl'], ['TOCFL Native Content','#/tocfl-content'], ['Monthly Exams','#/exams'], ['Reading Mock','#/mock-test/reading'], ['Listening Mock','#/mock-test/listening']]]
  ];

  container.innerHTML = `
    <div class="dash-command"><section class="dc-hero"><div class="dc-panel dc-main"><div class="dc-kicker">${phase.label}</div><h1>${phase.title}</h1><p>${phase.copy}</p><div class="dc-actions"><a class="btn btn-primary" href="${phase.href}">${phase.action}</a><a class="btn btn-outline" href="#/masterplan">View Masterplan</a><a class="btn btn-outline" href="#/settings">Sync Progress</a></div></div><aside class="dc-panel dc-focus ${completedToday ? 'dc-done' : ''}"><div class="dc-kicker">Today\'s finish line</div><div class="dc-ring" style="background:conic-gradient(var(--red) ${dailyPct}%, var(--off-white) 0)"><strong>${dailyPct}%</strong></div><p>${completedToday ? 'Marked complete for today. Keep the streak alive tomorrow.' : `${daily}/${goal} review items checked. Finish the five-step plan, then mark today complete.`}</p><button class="btn ${completedToday ? 'btn-outline' : 'btn-primary'}" type="button" onclick="completeDashboardFocus()">${completedToday ? 'Completed Today' : 'Mark Today Complete'}</button></aside></section>
    <section class="dc-grid">${tasks.map(task => `<a class="dc-panel dc-task" href="${task.href}"><span>${task.n}</span><strong>${task.title}</strong><small>${task.text}</small></a>`).join('')}</section>
    <section class="dc-metrics"><article class="dc-panel dc-metric"><strong>${learned}</strong><span>Characters learned</span><small>${pct}% of ${totalChars || 'loading'} total</small></article><article class="dc-panel dc-metric"><strong>${srs.total || 0}</strong><span>SRS queue</span><small>${srs.mature || 0} mature, ${dueToday} due</small></article><article class="dc-panel dc-metric"><strong>${weakCount}</strong><span>Weak areas</span><small>${weakCount ? 'Repair before new tests' : 'No weak areas logged yet'}</small></article><article class="dc-panel dc-metric"><strong>${prog.streak || 0}</strong><span>Day streak</span><small>Consistency beats cramming</small></article></section>
    <section class="dc-two"><article class="dc-panel dc-section"><h2>Learning order</h2><div class="dc-phases"><a class="dc-phase" href="#/onboarding"><b>0</b><span><strong>Sound foundation</strong><small>Pinyin, tones, pronunciation first.</small></span></a><a class="dc-phase" href="#/beginner-launchpad"><b>1</b><span><strong>Beginner Launchpad</strong><small>Survival words and first sentences.</small></span></a><a class="dc-phase" href="#/beginner-coach"><b>2</b><span><strong>Daily Coach packs</strong><small>Words, listening, writing, speaking.</small></span></a><a class="dc-phase" href="#/vocabulary-books"><b>3</b><span><strong>Course books</strong><small>Dialogues, grammar, controlled lessons.</small></span></a><a class="dc-phase" href="#/tocfl"><b>4</b><span><strong>Exam mode</strong><small>Test after input and recall feel stable.</small></span></a></div>${levelStats.length ? `<h2 style="margin-top:18px">Level progress</h2><div class="dc-phases">${levelStats.map(l => `<div class="dc-phase"><b style="color:${l.color}">${l.pct}%</b><span><strong>${l.name}</strong><small>${l.done}/${l.total} characters</small></span></div>`).join('')}</div>` : ''}</article>
    <article class="dc-panel dc-section"><h2>Browse without getting lost</h2><div class="dc-browse">${browseGroups.map(group => `<div class="dc-group"><h3>${group[0]}</h3><div class="dc-links">${group[1].map(link => `<a href="${link[1]}">${link[0]}</a>`).join('')}</div></div>`).join('')}</div><h2 style="margin-top:18px">Recent activity</h2><div class="dc-activity">${recentActivity.length ? recentActivity.map(a => `<div><span>${a.text}</span><small>${timeAgo(a.time)}</small></div>`).join('') : '<div><span>No activity yet. Start with the first action above.</span><small>Today</small></div>'}</div></article></section></div>`;

  updateStreakDisplay();
  updateTopbarBadge();
}

function completeDashboardFocus() {
  const key = new Date().toDateString();
  localStorage.setItem('zhongwen_dashboard_done', key);
  App.logActivity('check', 'Completed today\'s focus plan');
  renderDashboard(document.getElementById('page-content'));
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function updateStreakDisplay() {
  const el = document.getElementById('streak-count');
  if (el) el.textContent = App.state.progress.streak || 0;
}

// Section
let libraryState = {
  search: '', level: '', category: '', offset: 0, limit: 60,
  total: 0, data: [],
};

async function renderLibrary(container) {
  // Render skeleton immediately
  container.innerHTML = `
    <div class="page-header">
      <h2>Character Library</h2>
      <p>Browse all 1,443 TOCFL characters with pinyin, zhuyin & definitions.</p>
    </div>
    <div class="library-controls">
      <div class="search-box">
        <span class="search-icon">Search</span>
        <input type="text" class="input" id="lib-search" placeholder="Search hanzi, pinyin, or English..." value="${libraryState.search}">
      </div>
      <select class="input" id="lib-level" style="width:auto;min-width:100px">
        <option value="">All Levels</option>
        <option value="novice" ${libraryState.level==='novice'?'selected':''}>Novice</option>
        <option value="a1" ${libraryState.level==='a1'?'selected':''}>A1</option>
        <option value="a2" ${libraryState.level==='a2'?'selected':''}>A2</option>
        <option value="b1" ${libraryState.level==='b1'?'selected':''}>B1</option>
        <option value="b2" ${libraryState.level==='b2'?'selected':''}>B2</option>
        <option value="c1" ${libraryState.level==='c1'?'selected':''}>C1</option>
      </select>
      <select class="input" id="lib-category" style="width:auto;min-width:130px">
        <option value="">All Categories</option>
      </select>
      <button class="btn btn-ghost btn-sm" id="lib-reset">Reset</button>
    </div>
    <div id="lib-results-info" class="text-small text-muted mb-12"></div>
    <div class="char-grid" id="char-grid"><div class="spinner"></div></div>
    <div class="pagination" id="lib-pagination"></div>
  `;

  // Wire up controls
  let searchTimeout;
  document.getElementById('lib-search')?.addEventListener('input', e => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      libraryState.search = e.target.value;
      libraryState.offset = 0;
      loadLibraryPage();
    }, 300);
  });

  document.getElementById('lib-level')?.addEventListener('change', e => {
    libraryState.level = e.target.value;
    libraryState.offset = 0;
    loadLibraryPage();
  });

  document.getElementById('lib-category')?.addEventListener('change', e => {
    libraryState.category = e.target.value;
    libraryState.offset = 0;
    loadLibraryPage();
  });

  document.getElementById('lib-reset')?.addEventListener('click', () => {
    libraryState = { search: '', level: '', category: '', offset: 0, limit: 60, total: 0, data: [] };
    document.getElementById('lib-search').value = '';
    document.getElementById('lib-level').value = '';
    document.getElementById('lib-category').value = '';
    loadLibraryPage();
  });

  // Populate Categories from currently loaded character set
  const catSel = document.getElementById('lib-category');
  if (catSel && App.state.characters.length > 0) {
    const categories = [...new Set(App.state.characters.map(c => c.category).filter(Boolean))].sort();
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
      if (c === libraryState.category) opt.selected = true;
      catSel.appendChild(opt);
    });
  }

  await loadLibraryPage();
}

async function loadLibraryPage() {
  const grid = document.getElementById('char-grid');
  const info = document.getElementById('lib-results-info');
  if (!grid) return;

  grid.innerHTML = '<div class="spinner"></div>';

  try {
    const params = {
      limit: libraryState.limit,
      offset: libraryState.offset,
    };
    if (libraryState.search) params.search = libraryState.search;
    if (libraryState.level) params.level = libraryState.level;
    if (libraryState.category) params.category = libraryState.category;

    const result = await API.getCharacters(params);
    libraryState.total = result.total;
    libraryState.data = result.data;

    if (info) info.textContent = `Showing ${result.data.length} of ${result.total} characters`;

    if (!result.data.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">Search</div><h3>No characters found</h3><p>Try a different search term or filter.</p></div>`;
      renderPagination();
      return;
    }

    grid.innerHTML = result.data.map(c => {
      const isLearned = App.state.progress.learnedChars.includes(c.hanzi);
      const isWeak = App.state.progress.weakChars.includes(c.hanzi);
      const toneClass = Pinyin.getTone(c.pinyin) ? `tone${Pinyin.getTone(c.pinyin)}` : '';
      return `
        <div class="char-card ${isLearned ? 'learned' : ''} ${isWeak ? 'weak' : ''}"
             onclick="showCharModal(${JSON.stringify(c).replace(/"/g, '&quot;')})">
          <span class="char-badge card-badge">
            <span class="badge badge-${c.level || 'a2'}">${(c.level || '').toUpperCase()}</span>
          </span>
          <span class="char-hanzi">${c.traditional || c.hanzi}</span>
          <div class="char-pinyin tone-colors ${toneClass}" style="color:var(--tone${Pinyin.getTone(c.pinyin) || 1})">${c.pinyin || ''}</div>
          <div class="char-zhuyin">${c.zhuyin || ''}</div>
          <div class="char-def">${c.definition || ''}</div>
        </div>`;
    }).join('');

    renderPagination();
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">Warning</div><h3>Failed to load characters</h3><p>${err.message}</p></div>`;
  }
}

function renderPagination() {
  const container = document.getElementById('lib-pagination');
  if (!container) return;

  const { total, limit, offset } = libraryState;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit);

  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="libGoPage(${currentPage - 1})" ${currentPage === 0 ? 'disabled' : ''}>Prev</button>`;

  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    if (i === 0 || i === totalPages - 1 || (i >= currentPage - 2 && i <= currentPage + 2)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  pages.forEach(p => {
    if (p === '...') {
      html += `<span style="padding:6px 4px;color:var(--text-3)">...</span>`;
    } else {
      html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="libGoPage(${p})">${p + 1}</button>`;
    }
  });

  html += `<button class="page-btn" onclick="libGoPage(${currentPage + 1})" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>Next</button>`;

  container.innerHTML = html;
}

function libGoPage(page) {
  const totalPages = Math.ceil(libraryState.total / libraryState.limit);
  if (page < 0 || page >= totalPages) return;
  libraryState.offset = page * libraryState.limit;
  loadLibraryPage();
  document.getElementById('char-grid')?.scrollIntoView({ behavior: 'smooth' });
}

// Section


async function renderMasterplanPage(container) {
  await API.loadScript(`js/masterplan.js?v=${API.version}`);
  if (window.MasterplanModule) return MasterplanModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Masterplan Error</h3></div>';
}

function renderSettings(container) {
  const s = App.state.settings;
  const p = App.state.progress;
  const audio = TTS.status ? TTS.status() : { available:false, hasAndroid:false, hasBrowser:false, voices:0, zhVoices:0 };
  const lastExportRaw = localStorage.getItem('zhongwen_last_progress_export');
  const lastExportText = lastExportRaw ? new Date(lastExportRaw).toLocaleString() : 'Never exported on this device';
  const currentTheme = (s.theme === 'light' || !s.theme) ? 'red' : s.theme;

  container.innerHTML = `
    <div class="page-header">
      <h2>Settings</h2>
      <p>Customize your learning experience.</p>
    </div>
    <div style="max-width:600px">

      <div class="card mb-16">
        <div class="settings-section">
          <h3>Profile</h3>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Display Name</div>
            </div>
            <input type="text" class="input" id="set-name" value="${s.displayName || 'Learner'}" style="width:180px">
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Daily Character Goal</div>
              <div class="setting-desc">Characters to review per day</div>
            </div>
            <input type="number" class="input" id="set-goal" value="${s.dailyGoal || 10}" min="1" max="100" style="width:80px">
          </div>
        </div>
      </div>

      <div class="card mb-16">
        <div class="settings-section">
          <h3>Display</h3>
          <div class="setting-row" style="flex-direction:column; align-items:stretch; gap:10px">
            <div class="setting-info" style="margin-bottom:4px">
              <div class="setting-label">App Theme</div>
              <div class="setting-desc">Use the top-bar toggle for quick switching, or choose a mode here.</div>
            </div>
            <div class="theme-swatch-grid theme-mode-grid">
              <button type="button" class="theme-swatch ${currentTheme === 'dark' ? 'active' : ''}" data-theme-val="dark">
                <div class="swatch-dot swatch-dot-dark"></div>
                <span>Dark mode</span>
              </button>
              <button type="button" class="theme-swatch ${currentTheme !== 'dark' ? 'active' : ''}" data-theme-val="red">
                <div class="swatch-dot swatch-dot-red"></div>
                <span>White mode</span>
              </button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Chinese Font</div>
              <div class="setting-desc">Choose the site-wide Chinese reading font</div>
            </div>
            <select class="input" id="set-font-choice" style="width:180px">
              ${Object.entries(App.fontPresets).map(([key, preset]) => `<option value="${key}" ${s.fontChoice === key ? 'selected' : ''}>${preset.label}</option>`).join('')}
            </select>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Tone Colors</div>
              <div class="setting-desc">Color pinyin by tone: <span style="color:var(--tone1)">1st</span> <span style="color:var(--tone2)">2nd</span> <span style="color:var(--tone3)">3rd</span> <span style="color:var(--tone4)">4th</span></div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="set-tones" ${s.toneColors ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Annotation Mode</div>
              <div class="setting-desc">What to show above characters</div>
            </div>
            <div class="radio-group">
              ${['pinyin','zhuyin','both','none'].map(v => `
                <label class="radio-option">
                  <input type="radio" name="annotation" value="${v}" ${s.annotation === v ? 'checked' : ''}>
                  <label>${v.charAt(0).toUpperCase()+v.slice(1)}</label>
                </label>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="card mb-16">
        <div class="settings-section">
          <h3>Audio Diagnostics</h3>
          <p class="setting-desc mb-12">Use this before serious listening practice. Browser TTS varies by device; Android APK builds should use the native TTS bridge when available.</p>
          <div class="setting-row"><div class="setting-info"><div class="setting-label">Audio Engine</div><div class="setting-desc">${audio.hasAndroid ? 'Android native bridge active' : audio.hasBrowser ? 'Browser speech synthesis active' : 'No TTS engine detected'}</div></div><span class="badge ${audio.available ? 'badge-a2' : 'badge-red'}">${audio.available ? 'Ready' : 'Unavailable'}</span></div>
          <div class="setting-row"><div class="setting-info"><div class="setting-label">Chinese Voices</div><div class="setting-desc">${audio.zhVoices} Chinese voices found from ${audio.voices} total browser voices.</div></div></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
            <button class="btn btn-outline" onclick="TTS.test('\u4f60\u597d\uff0c\u6211\u6b63\u5728\u5b78\u4e2d\u6587\u3002')">Test Chinese Voice</button>
            <button class="btn btn-outline" onclick="TTS.test('\u5abd \u9ebb \u99ac \u7f75')">Test Tone Pair</button>
          </div>
        </div>
      </div>

      <div class="card mb-16">
        <div class="settings-section">
          <h3>Quiz</h3>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Default Difficulty</div>
            </div>
            <div class="radio-group">
              ${['A2','B1','Both'].map(v => `
                <label class="radio-option">
                  <input type="radio" name="difficulty" value="${v}" ${s.quizDifficulty === v ? 'checked' : ''}>
                  <label>${v}</label>
                </label>`).join('')}
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Show Pinyin in Quizzes</div>
              <div class="setting-desc">Display pinyin hints in audio/recognition quizzes</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="set-show-quiz-pinyin" ${s.showQuizPinyin !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Default Quiz Length</div>
              <div class="setting-desc">Used when opening pronunciation and vocabulary quizzes</div>
            </div>
            <select class="input" id="set-default-quiz-count" style="width:120px">
              ${[10,20,50,100].map(n => `<option value="${n}" ${Number(s.defaultQuizCount || 20) === n ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Unlock All Content</div>
              <div class="setting-desc">Always on in this static build so nothing is hidden</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="set-unlock-all" ${s.unlockAll ? 'checked' : ''} disabled>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="card mb-16">
        <div class="settings-section">
          <h3>Learning Guidance</h3>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Guided Beginner Mode</div>
              <div class="setting-desc">Dashboard and coach push you toward the next beginner task while every section remains open</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="set-guided-mode" ${s.guidedMode !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
            <a class="btn btn-outline" href="#/masterplan">Open Masterplan</a>
            <a class="btn btn-outline" href="#/beginner-coach">Open Daily Coach</a>
            <button class="btn btn-outline" type="button" onclick="localStorage.removeItem('zhongwen_dashboard_done'); showToast('Today marker cleared.');">Clear Today Marker</button>
          </div>
        </div>
      </div>

      <div class="card mb-16">
        <div class="settings-section">
          <h3>AI Chat (Beta)</h3>
          <p class="setting-desc mb-12">To use the Smart AI Chat, you need a free API key from <a href="https://aistudio.google.com/" target="_blank" style="color:var(--accent)">Google AI Studio</a>. This key is stored only in your browser.</p>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Gemini API Key</div>
            </div>
            <input type="password" class="input" id="set-gemini-key" value="${s.geminiKey || ''}" placeholder="Paste AI Key here..." style="width:220px">
          </div>
        </div>
      </div>

      <div class="card mb-16">
        <div class="settings-section">
          <h3>Progress</h3>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Learned Characters</div>
            </div>
            <span class="font-bold">${p.learnedChars.length}</span>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Saved Set</div>
            </div>
            <span class="font-bold">${p.savedSet.length}</span>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Weak Characters</div>
            </div>
            <span class="font-bold">${p.weakChars.length}</span>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Tests Completed</div>
            </div>
            <span class="font-bold">${(p.testHistory || []).length}</span>
          </div>
          <button class="btn btn-outline btn-error mt-12" onclick="resetAllProgress()">Delete All Progress</button>
        </div>
      </div>

      ${typeof isApk !== 'undefined' && isApk ? '' : `
      <div class="card mb-16">
        <div class="settings-section">
          <h3>Security</h3>
          <p class="setting-desc mb-12">This is a lightweight static-site lock for casual privacy. It asks again when the browser session is locked or closed.</p>
          <button class="btn btn-outline" onclick="lockApp()">Lock App Now</button>
        </div>
      </div>
      `}

      <div class="card mb-16">
        <div class="settings-section">
          <h3>Data Management</h3>
          <p class="setting-desc mb-8">Use one compact sync file for all progress in this app: main progress, SRS, Beginner Coach, B1 Coach, Launchpad, Grammar, Sentence Builder, and display settings. Private API keys are not exported.</p>
          <p class="setting-desc mb-16"><strong>Last backup:</strong> ${lastExportText}</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
            <button class="btn btn-outline" onclick="exportProgress()">Export to File</button>
            <button class="btn btn-outline" onclick="document.getElementById('import-file').click()">Import from File</button>
            <input type="file" id="import-file" accept=".json,.gz,.json.gz,application/json,application/gzip" style="display:none" onchange="importProgress(this)">
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
            <div class="setting-label">Manual Text Sync (Best for Mobile/APK)</div>
            <textarea id="sync-text-box" class="input" style="height:100px;font-family:monospace;font-size:0.75rem;padding:8px;background:var(--off-white);color:var(--text)" placeholder="Paste your exported progress JSON here to import, or click 'Copy JSON' to export..."></textarea>
            <div style="display:flex;gap:8px">
              <button class="btn btn-outline btn-sm" onclick="copyProgressText()">Copy JSON to Clipboard</button>
              <button class="btn btn-outline btn-sm" onclick="importProgressText()">Import from Text Box</button>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" id="set-save-btn">Save Settings</button>
        <button class="btn btn-ghost btn-error" id="set-reset-btn">Reset All Progress</button>
      </div>
      <div id="set-saved-msg" class="hidden" style="margin-top:10px;color:var(--tone2);font-weight:600">Settings saved and applied.</div>
    </div>
  `;

  // Attach theme swatch click listeners
  container.querySelectorAll('.theme-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      container.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const val = swatch.getAttribute('data-theme-val');
      App.applyTheme(val);
    });
  });

  document.getElementById('set-save-btn')?.addEventListener('click', () => {
    App.state.settings.displayName = document.getElementById('set-name').value || 'Learner';
    App.state.settings.dailyGoal = parseInt(document.getElementById('set-goal').value) || 10;
    
    const activeSwatch = container.querySelector('.theme-swatch.active');
    App.state.settings.theme = activeSwatch ? activeSwatch.getAttribute('data-theme-val') : 'red';
    
    App.state.settings.fontChoice = document.getElementById('set-font-choice')?.value || 'noto-sans';
    App.state.settings.toneColors = document.getElementById('set-tones').checked;
    App.state.settings.annotation = document.querySelector('input[name="annotation"]:checked')?.value || 'pinyin';
    App.state.settings.quizDifficulty = document.querySelector('input[name="difficulty"]:checked')?.value || 'A2';
    App.state.settings.showQuizPinyin = document.getElementById('set-show-quiz-pinyin').checked;
    App.state.settings.defaultQuizCount = parseInt(document.getElementById('set-default-quiz-count')?.value, 10) || 20;
    App.state.settings.guidedMode = document.getElementById('set-guided-mode')?.checked !== false;
    App.state.settings.unlockAll = true;
    App.state.settings.geminiKey = document.getElementById('set-gemini-key').value || '';
    localStorage.setItem('beginnerGuidedMode', App.state.settings.guidedMode ? '1' : '0');
    App.saveSettings();
    App.applyTheme(App.state.settings.theme);
    App.applyFontPreference(App.state.settings.fontChoice);
    const msg = document.getElementById('set-saved-msg');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 2000);
  });

  document.getElementById('set-reset-btn')?.addEventListener('click', () => {
    if (confirm('Reset ALL progress? This cannot be undone.')) {
      localStorage.removeItem('tocfl_progress');
      App.loadProgress();
      navigate('/');
    }
  });
}

// Section
// Unified progress sync: one small file for all app progress.
const ProgressSync = (() => {
  const VERSION = 1;
  const KEYS = [
    'tocfl_progress',
    'tocfl_srs_cards',
    'b1CoachProgress',
    'beginnerCoachState',
    'beginnerGuidedMode',
    'beginnerPackDisplay',
    'beginnerLaunchpadProgress',
    'grammarAcademyState',
    'sentenceBuilderLevel',
    'sentenceBuilderMode',
    'sentenceBuilderSessionSize'
  ];

  function empty(value) {
    if (value == null || value === '') return true;
    const v = String(value).trim();
    return v === '{}' || v === '[]' || v === 'null' || v === 'undefined';
  }

  function cleanSettings() {
    try {
      const raw = localStorage.getItem('tocfl_settings');
      if (!raw) return null;
      const settings = JSON.parse(raw);
      delete settings.geminiKey;
      return JSON.stringify(settings);
    } catch (_) {
      return null;
    }
  }

  function collect() {
    const data = {};
    KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (!empty(value)) data[key] = value;
    });
    const settings = cleanSettings();
    if (!empty(settings)) data.tocfl_settings = settings;
    return {
      type: 'zhongwen-all-progress',
      version: VERSION,
      appVersion: API.version,
      exportedAt: new Date().toISOString(),
      data
    };
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function toBlob(json) {
    if ('CompressionStream' in window) {
      try {
        const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
        return { blob: await new Response(stream).blob(), ext: 'json.gz' };
      } catch (_) {}
    }
    return { blob: new Blob([json], { type: 'application/json' }), ext: 'json' };
  }

  async function fileText(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 2));
    if (bytes[0] === 0x1f && bytes[1] === 0x8b && 'DecompressionStream' in window) {
      const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
      return await new Response(stream).text();
    }
    return new TextDecoder().decode(buffer);
  }

  async function exportAll() {
    const payload = collect();
    const count = Object.keys(payload.data).length;
    if (!count) return alert('No progress data to export yet.');
    const json = JSON.stringify(payload);
    const packed = await toBlob(json);
    download(packed.blob, `zhongwen-all-progress-${new Date().toISOString().slice(0, 10)}.${packed.ext}`);
  }

  async function importAll(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await fileText(file));
      if (parsed?.type !== 'zhongwen-all-progress' || !parsed.data) {
        throw new Error('This is not a Zhongwen all-progress file.');
      }
      const allowed = new Set([...KEYS, 'tocfl_settings']);
      const entries = Object.entries(parsed.data).filter(([key, value]) => allowed.has(key) && !empty(value));
      if (!entries.length) return alert('This progress file is empty.');
      if (!confirm(`Import ${entries.length} progress sections from this one sync file?`)) return;
      entries.forEach(([key, value]) => localStorage.setItem(key, String(value)));
      alert('Progress imported. The app will reload now.');
      window.location.reload();
    } catch (err) {
      alert(`Invalid all-progress file: ${err.message || err}`);
    }
  }

  async function importAllText(jsonText) {
    if (!jsonText || !jsonText.trim()) return alert('Please paste progress JSON data first.');
    try {
      const parsed = JSON.parse(jsonText.trim());
      if (parsed?.type !== 'zhongwen-all-progress' || !parsed.data) {
        throw new Error('This is not a Zhongwen all-progress data structure.');
      }
      const allowed = new Set([...KEYS, 'tocfl_settings']);
      const entries = Object.entries(parsed.data).filter(([key, value]) => allowed.has(key) && !empty(value));
      if (!entries.length) return alert('This progress data is empty.');
      if (!confirm(`Import ${entries.length} progress sections from this text?`)) return;
      entries.forEach(([key, value]) => localStorage.setItem(key, String(value)));
      alert('Progress imported. The app will reload now.');
      window.location.reload();
    } catch (err) {
      alert(`Invalid progress JSON data: ${err.message || err}`);
    }
  }

  return { collect, exportAll, importAll, importAllText };
})();

function markProgressExported() {
  localStorage.setItem('zhongwen_last_progress_export', new Date().toISOString());
}

function exportProgress() {
  ProgressSync.exportAll().then(markProgressExported).catch(err => console.error(err));
}

function importProgress(input) {
  const file = input?.files?.[0];
  ProgressSync.importAll(file).finally(() => { if (input) input.value = ''; });
}

function copyProgressText() {
  const payload = ProgressSync.collect();
  const json = JSON.stringify(payload);
  navigator.clipboard.writeText(json).then(() => {
    markProgressExported();
    alert('Progress JSON copied to clipboard. You can paste and save it anywhere.');
  }).catch(() => {
    const box = document.getElementById('sync-text-box');
    if (box) {
      box.value = json;
      box.select();
      markProgressExported();
      alert('Could not auto-copy to clipboard. The JSON text is now shown in the text box below. Please select and copy it manually.');
    }
  });
}

function importProgressText() {
  const text = document.getElementById('sync-text-box')?.value;
  ProgressSync.importAllText(text);
}

// ??? Stub renders (lazy-loaded) ?????????????????????????????
async function renderFlashcardsPage(container) {
  await API.loadScript(`js/flashcards.js?v=${API.version}`);
  if (window.FlashcardsModule) return window.FlashcardsModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Flashcards Module Error</h3></div>';
}

async function renderPronunciationQuiz(container) {
  await API.loadScript(`js/quiz.js?v=${API.version}`);
  if (window.QuizModule) return window.QuizModule.renderPronunciation(container);
  container.innerHTML = '<div class="empty-state"><h3>Quiz Module Error</h3></div>';
}

async function renderVocabQuiz(container) {
  await API.loadScript(`js/quiz.js?v=${API.version}`);
  if (window.QuizModule) return window.QuizModule.renderVocabulary(container);
  container.innerHTML = '<div class="empty-state"><h3>Quiz Module Error</h3></div>';
}

async function renderFlashQuizPage(container) {
  await API.loadScript(`js/flash-quiz.js?v=${API.version}`);
  if (window.FlashQuizModule) return window.FlashQuizModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Flash Quiz Module Error</h3></div>';
}

async function renderToneGame(container) {
  await API.loadScript(`js/tone-game.js?v=${API.version}`);
  if (typeof ToneGame !== 'undefined') return ToneGame.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Tone Game Error</h3></div>';
}

async function renderVocabLibrary(container) {
  await API.loadScript(`js/vocabulary.js?v=${API.version}`);
  if (window.VocabularyModule) return window.VocabularyModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Vocabulary Module Error</h3></div>';
}

async function renderVocabularyBooks(container) {
  await API.loadScript(`js/vocabulary_books.js?v=${API.version}`);
  if (window.VocabularyBooksModule) return window.VocabularyBooksModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Course Books Module Error</h3></div>';
}

async function renderGrammarLibrary(container) {
  await API.loadScript(`js/grammar.js?v=${API.version}`);
  if (typeof GrammarModule !== 'undefined') return GrammarModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Grammar Module Error</h3></div>';
}

async function renderReadingPage(container) {
  await API.loadScript(`js/reader.js?v=${API.version}`);
  if (typeof ReaderModule !== 'undefined') return ReaderModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Reader Module Error</h3></div>';
}

async function renderMockReadingPage(container) {
  await API.loadScript(`js/mock-test.js?v=${API.version}`);
  if (typeof MockTestModule !== 'undefined') return MockTestModule.renderReading(container);
  container.innerHTML = '<div class="empty-state"><h3>Mock Test Module Error</h3></div>';
}

async function renderMockListeningPage(container) {
  await API.loadScript(`js/mock-test.js?v=${API.version}`);
  if (typeof MockTestModule !== 'undefined') return MockTestModule.renderListening(container);
  container.innerHTML = '<div class="empty-state"><h3>Mock Test Module Error</h3></div>';
}

async function renderExamsPage(container) {
  await API.loadScript(`js/exam.js?v=${API.version}`);
  if (window.ExamModule) return ExamModule.renderHub(container);
  container.innerHTML = '<div class="empty-state"><h3>Exam Module Error</h3></div>';
}

// Section
function updateTopbarBadge() {
  const chars = App.state.characters;
  const learned = App.state.progress.learnedChars;
  const badge = document.getElementById('topbar-level');
  if (!badge || !chars.length) return;

  // Find highest level with any learned chars
  const levels = ['b1','a2','a1','novice'];
  let currentLevel = 'Novice';
  let badgeClass = 'badge-gray';
  for (const lvl of levels) {
    const lvlChars = chars.filter(c => c.level === lvl);
    const lvlLearned = lvlChars.filter(c => learned.includes(c.hanzi));
    if (lvlLearned.length > 0) {
      const map = { novice:'Novice', a1:'A1', a2:'A2', b1:'B1' };
      const clsMap = { novice:'badge-gray', a1:'badge-a2', a2:'badge-b1', b1:'badge-red' };
      currentLevel = map[lvl] || lvl.toUpperCase();
      badgeClass = clsMap[lvl] || 'badge-gray';
      break;
    }
  }
  badge.textContent = currentLevel;
  badge.className = 'badge ' + badgeClass;
}

// Section
async function renderOnboarding(container) {
  await API.loadScript(`js/onboarding.js?v=${API.version}`);
  if (typeof OnboardingModule !== 'undefined') return OnboardingModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Onboarding Module Error</h3></div>';
}

async function renderPinyinTablePage(container) {
  await API.loadScript(`js/pinyin-table.js?v=${API.version}`);
  if (window.PinyinTableModule) return window.PinyinTableModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Pinyin Table Module Error</h3></div>';
}

async function renderLearnPath(container) {
  await API.loadScript(`js/learn.js?v=${API.version}`);
  if (typeof LearnModule !== 'undefined') return LearnModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Learning Path Module Error</h3></div>';
}

async function renderChaptersPage(container) {
  await API.loadScript(`js/chapters.js?v=${API.version}`);
  if (typeof ChapterModule !== 'undefined') return ChapterModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Chapters Module Error</h3></div>';
}

async function renderPlayground(container) {
  await API.loadScript(`js/playground.js?v=${API.version}`);
  if (window.PlaygroundModule) return window.PlaygroundModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Playground Module Error</h3></div>';
}

async function renderCharPlayground(container) {
  await API.loadScript(`js/playground.js?v=${API.version}`);
  if (window.PlaygroundModule) return window.PlaygroundModule.renderCharPlayground(container);
  container.innerHTML = '<div class="empty-state"><h3>Playground Module Error</h3></div>';
}

async function renderScenariosPage(container) {
  await API.loadScript(`js/scenarios.js?v=${API.version}`);
  if (typeof ScenarioModule !== 'undefined') return ScenarioModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Scenarios Module Error</h3></div>';
}

async function renderDialoguePage(container) {
  await API.loadScript(`js/dialogue.js?v=${API.version}`);
  if (typeof DialogueModule !== 'undefined') return DialogueModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Dialogue Module Error</h3></div>';
}

// Section
async function boot() {
  App.loadSettings();
  App.loadProgress();

  // 1. Core UI setup (Sync tasks)
  document.getElementById('dark-mode-toggle')?.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || App.state.settings.theme || 'dark';
      const isDarkNow = currentTheme === 'dark';
      if (!isDarkNow) {
        App.state.settings.lastLightTheme = currentTheme;
        App.state.settings.theme = 'dark';
      } else {
        App.state.settings.theme = App.state.settings.lastLightTheme || 'red';
      }
      App.saveSettings();
      App.applyTheme(App.state.settings.theme);
    });

  document.getElementById('topbar-font-select')?.addEventListener('change', e => {
    App.state.settings.fontChoice = e.target.value || 'noto-sans';
    App.saveSettings();
    App.applyFontPreference(App.state.settings.fontChoice);
  });

  document.getElementById('mobile-menu-toggle')?.addEventListener('click', toggleMobileNav);
  setupMobileBottomNav();
  document.getElementById('nav-scrim')?.addEventListener('click', closeMobileNav);
  
  // Use event delegation for sidebar to avoid many listeners
  document.getElementById('sidebar')?.addEventListener('click', e => {
    if (e.target.closest('.nav-item')) closeMobileNav();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMobileNav();
  });

  // 2. Initial route - Render ASAP
  router();

  // 3. Deferred background tasks (Low priority)
  const runWhenIdle = window.requestIdleCallback || ((callback) => setTimeout(callback, 1));
  runWhenIdle(() => {
    // Unregister any existing service workers (Kill Switch)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
        }
      }).catch(console.error);
    }

    // Only preload the core character library needed for the dashboard stats.
    // We explicitly AVOID preloading the 1MB vocabulary file and 18 other JSON files here.
    // Loading 3MB of JSON in the background was freezing iPads and saturating mobile network connections,
    // which caused massive lag when users tried to navigate to lightweight pages like the Picture Quiz.
    setTimeout(async () => {
      try {
        const charResult = await API.getCharacters({ limit: 9999 }).catch(() => ({ data: [] }));
        App.state.characters = charResult.data || [];
        
        if (window.ExamModule) ExamModule.init();

        updateTopbarBadge();
        // If we are still on the dashboard, gracefully update it
        if (getPath() === '/') {
          const orbit = document.querySelector('.dash-progress-ring');
          if (orbit && orbit.classList.contains('skeleton')) {
              renderDashboard(document.getElementById('page-content'));
          }
        }
      } catch (err) {
        console.warn('Dashboard background load failed:', err.message);
      }
    }, 1000); // 1 second delay so initial navigation is strictly prioritized
  });
}

// Start lock gate when DOM is ready. App boot runs only after unlock.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AppLock.init());
} else {
  AppLock.init();
}


// Missing route renderers
async function renderBeginnerLaunchpadPage(container) {
  await API.loadScript(`js/beginner-launchpad.js?v=${API.version}`);
  if (window.BeginnerLaunchpadModule) return BeginnerLaunchpadModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Beginner Launchpad Error</h3></div>';
}

async function renderBeginnerCoachPage(container) {
  await API.loadScript(`js/beginner-coach.js?v=${API.version}`);
  if (window.BeginnerCoachModule) return BeginnerCoachModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Beginner Coach Error</h3></div>';
}

async function renderB1CoachPage(container) {
  await API.loadScript(`js/b1-coach.js?v=${API.version}`);
  if (window.B1CoachModule) return B1CoachModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>B1 Coach Error</h3></div>';
}

async function renderStudyPlanPage(container) {
  await API.loadScript(`js/study-plan.js?v=${API.version}`);
  if (window.StudyPlanModule) return StudyPlanModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Study Plan Error</h3></div>';
}

async function renderMixedRecallPage(container) {
  await API.loadScript(`js/mixed-recall.js?v=${API.version}`);
  if (window.MixedRecallModule) return MixedRecallModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Mixed Recall Error</h3></div>';
}

async function renderSentenceBuilderPage(container) {
  await API.loadScript(`js/sentence-builder.js?v=${API.version}`);
  if (window.SentenceBuilderModule) return SentenceBuilderModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>Sentence Builder Error</h3></div>';
}

async function renderTOCFLPage(container) {
  await API.loadScript(`js/tocfl.js?v=${API.version}`);
  if (window.TOCFLModule) return TOCFLModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>TOCFL Module Error</h3></div>';
}

async function renderTOCFLContentPage(container) {
  await API.loadScript(`js/tocfl-content.js?v=${API.version}`);
  if (window.TOCFLContentModule) return TOCFLContentModule.render(container);
  container.innerHTML = '<div class="empty-state"><h3>TOCFL Content Module Error</h3></div>';
}









