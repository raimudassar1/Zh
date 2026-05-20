/* ═══════════════════════════════════════════════════════════════
   app.js — Core: Router, State, Dashboard, Library, Settings
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── Global State ─────────────────────────────────────────────────────────────
const App = {
  state: {
    characters: [],
    vocabulary: [],
    settings: {
      theme: 'light',
      traditional: true,
      autoPlay: true,
      unlockAll: false
    },
    progress: {
      learnedChars: [],
      weakChars: [],
      savedSet: [],
      chapters: {},
      scenarios: {},
      playground: {},
      playground_lessons: {},
      ccc_course: {},
      exams: {},
      streak: 0,
      totalReviewed: 0,
      dailyReviewed: 0,
      lastStudyDate: null,
      activityLog: [],
      srs: {},
      onboardingComplete: false,
      testHistory: []
    },
    loading: false
  },

  async init() {
    this.loadProgress();
    this.applyTheme(this.state.settings.theme);
  },

  loadProgress() {
    const saved = localStorage.getItem('tocfl_progress');
    const defaults = {
      learnedChars: [],
      weakChars: [],
      savedSet: [],
      chapters: {},
      scenarios: {},
      playground: {},
      playground_lessons: {},
      ccc_course: {},
      exams: {},
      streak: 0,
      totalReviewed: 0,
      dailyReviewed: 0,
      lastStudyDate: null,
      activityLog: [],
      srs: {},
      onboardingComplete: false,
      testHistory: []
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
    if (this.state.progress.lastStudyDate === today) return;
    
    const last = this.state.progress.lastStudyDate ? new Date(this.state.progress.lastStudyDate) : null;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (last && last.toDateString() === yesterday.toDateString()) {
      this.state.progress.streak++;
    } else if (!last || last.getTime() < yesterday.getTime()) {
      this.state.progress.streak = 1;
    }
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.state.settings.theme = theme;
    this.saveProgress();
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

// ─── TTS Utility ──────────────────────────────────────────────────────────────
const TTS = {
  // Voice cache
  _voice: null,

  async getBestVoice() {
    if (this._voice) return this._voice;
    const voices = window.speechSynthesis.getVoices();
    // Prioritize high-quality Taiwanese/Chinese voices
    this._voice = voices.find(v => v.lang === 'zh-TW' && (v.name.includes('Google') || v.name.includes('Microsoft'))) || 
                  voices.find(v => v.lang.startsWith('zh')) || 
                  voices[0];
    return this._voice;
  },

  async speak(text, lang = 'zh-TW', rate = 0.85, forceTTS = false) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    let processedText = text.trim();
    
    // Mapping for isolated pinyin/tones to ensure correct Hanzi pronunciation
    const pinyinMap = {
      'ā': '啊', 'á': '啊', 'ǎ': '啊', 'à': '啊',
      'ō': '喔', 'ó': '喔', 'ǒ': '喔', 'ò': '喔',
      'ē': '阿', 'é': '額', 'ě': '惡', 'è': '餓',
      'ī': '一', 'í': '移', 'ǐ': '已', 'ì': '意',
      'ū': '屋', 'ú': '無', 'ǔ': '五', 'ù': '物',
      'ǖ': '淤', 'ǘ': '魚', 'ǚ': '雨', 'ǜ': '預',
      'mā': '媽', 'má': '麻', 'mǎ': '馬', 'mà': '罵',
      'bā': '八', 'bá': '拔', 'bǎ': '把', 'bà': '爸',
    };

    if (pinyinMap[processedText]) {
      processedText = pinyinMap[processedText];
    }

    const utter = new SpeechSynthesisUtterance(processedText);
    utter.voice = await this.getBestVoice();
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = 1.0;
    
    window.speechSynthesis.speak(utter);
  },

  ready(cb) {
    if (window.speechSynthesis.getVoices().length) { cb(); return; }
    window.speechSynthesis.addEventListener('voiceschanged', cb, { once: true });
  }
};

// ─── Pinyin Utilities ─────────────────────────────────────────────────────────
const Pinyin = {
  TONE_MAP: {
    'a': ['ā','á','ǎ','à','a'], 'e': ['ē','é','ě','è','e'],
    'i': ['ī','í','ǐ','ì','i'], 'o': ['ō','ó','ǒ','ò','o'],
    'u': ['ū','ú','ǔ','ù','u'], 'v': ['ǖ','ǘ','ǚ','ǜ','ü'],
  },

  // Get tone number from pinyin with diacritics
  getTone(pinyin) {
    if (!pinyin) return 0;
    const p = pinyin.toLowerCase();
    if (/[āēīōūǖ]/.test(p)) return 1;
    if (/[áéíóúǘ]/.test(p)) return 2;
    if (/[ǎěǐǒǔǚ]/.test(p)) return 3;
    if (/[àèìòùǜ]/.test(p)) return 4;
    return 5; // neutral
  },

  // Strip tone marks from pinyin
  strip(pinyin) {
    if (!pinyin) return '';
    return pinyin.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ü/g, 'v');
  },

  // Add colors to pinyin string
  colorize(pinyin) {
    if (!pinyin) return '';
    return pinyin.split(' ').map(word => {
      const tone = this.getTone(word);
      return `<span class="tone${tone}">${word}</span>`;
    }).join(' ');
  }
};

// ─── API & Data Management ──────────────────────────────────────────────────
const API = {
  _cache: {},

  async get(url) {
    if (this._cache[url]) return this._cache[url];
    
    let path = url.startsWith('data/') ? url : `data/${url}`;
    if (!path.endsWith('.json')) path += '.json';
    
    // Cache buster for static local files
    path += `?v=${Date.now()}`;
    
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Fetch ${path} failed: ${res.status}`);
    const data = await res.json();
    this._cache[url] = data;
    return data;
  },

  async getCharacter(hanzi) {
    const chars = await this.get('characters_all');
    return chars.data.find(c => c.hanzi === hanzi || c.traditional === hanzi);
  },

  async getCharacters(options = {}) {
    const chars = await this.get('characters_all');
    let data = chars.data;
    if (options.level) data = data.filter(c => c.level === options.level);
    if (options.limit) data = data.slice(0, options.limit);
    return { data, total: data.length };
  },

  async getScenarios() {
    return await this.get('scenarios_content');
  },

  async getReadings() {
    const readings = await this.get('readings');
    return readings.map(r => ({
      ...r,
      level: r.level || 'Novice'
    }));
  },

  async getReading(id) {
    const readings = await this.get('readings');
    const reading = readings.find(r => r.id === id);
    if (!reading) throw new Error('Reading not found');
    return reading;
  },

  async getMockTests() {
    const tests = await this.get('mock-tests');
    return tests;
  },

  async getMockTest(id) {
    const tests = await this.get('mock-tests');
    const test = tests.find(t => t.id === id);
    if (!test) throw new Error('Mock test not found');
    return test;
  }
};

// ─── Router ───────────────────────────────────────────────────────────────────
function navigate(path) {
  window.location.hash = '#' + path;
}

function getPath() {
  const hash = window.location.hash;
  if (!hash || hash === '#' || hash === '#/') return '/';
  return hash.replace('#', '') || '/';
}

async function router() {
  const path = getPath();
  const content = document.getElementById('page-content');
  
  // Highlight active nav item
  document.querySelectorAll('.nav-item').forEach(el => {
    const route = el.dataset.route;
    el.classList.toggle('active', path === '/' + route || (path === '/' && route === 'dashboard'));
  });

  // Simple static routes
  const routes = {
    '/': { title: 'Learning Dashboard', render: renderDashboard },
    '/library': { title: 'Character Library', render: renderLibrary },
    '/vocabulary': { title: 'Vocabulary Library', render: renderVocabulary },
    '/learn': { title: 'Learning Path', render: renderLearningPath },
    '/flashcards': { title: 'SRS Flashcards', render: renderFlashcardsPage },
    '/quiz': { title: 'Quick Quiz', render: renderQuizPage },
    '/reader': { title: 'Reading Practice', render: renderReaderPage },
    '/scenarios': { title: 'Situational Scenarios', render: renderScenariosPage },
    '/grammar': { title: 'Grammar Library', render: renderGrammarPage },
    '/tone-game': { title: 'Tone Mastery Game', render: renderToneGame },
    '/playground': { title: 'Beginner Playground', render: renderPlayground },
    '/char-playground': { title: 'Character Playground', render: renderCharPlayground },
    '/exams': { title: 'Monthly Exams', render: renderExamsPage },
    '/onboarding': { title: 'Pinyin Trainer', render: renderOnboarding },
    '/mock-test': { title: 'Mock TOCFL Exams', render: renderMockTestsPage },
    '/mock-test/listening': { title: 'Listening Mock Test', render: renderMockListeningPage },
    '/settings': { title: 'Settings', render: renderSettings }
  };

  const route = routes[path] || routes['/'];
  document.getElementById('topbar-title').textContent = route.title;

  content.innerHTML = '<div class="spinner"></div>';

  try {
    await route.render(content);
  } catch (err) {
    console.error('Routing error:', err);
    content.innerHTML = `
      <div class="card error-box">
        <h3>Page Load Error</h3>
        <p>${err.message}</p>
        <button class="btn btn-primary" onclick="navigate('/')">Return Dashboard</button>
      </div>
    `;
  }
}

// ─── Module Render Stubs ──────────────────────────────────────────────────────
async function renderDashboard(container) {
  const p = App.state.progress;
  
  // Get quick stats
  const learnedCount = p.learnedChars.length;
  const srsStats = SRS.getStats();
  
  // Character of the Day (COTD)
  const allChars = App.state.characters;
  const seed = new Date().toDateString();
  let cotdIdx = 0;
  for (let i = 0; i < seed.length; i++) cotdIdx += seed.charCodeAt(i);
  const cotd = allChars[cotdIdx % allChars.length] || { hanzi: '學', pinyin: 'xué', definition: 'study; learn' };

  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- Welcome Hero -->
      <div class="card hero-card col-span-2">
        <div class="hero-flex">
          <div class="hero-main">
            <h1>Welcome back! 👋</h1>
            <p>You have <strong class="text-gold">${srsStats.due} cards</strong> to review today.</p>
            <div class="flex gap-12 mt-20">
              <button class="btn btn-primary btn-lg" onclick="navigate('/flashcards')">Start Review</button>
              <button class="btn btn-outline btn-lg" onclick="navigate('/learn')">Study New</button>
            </div>
          </div>
          <div class="hero-stats">
            <div class="streak-badge">
              <span class="streak-icon">🔥</span>
              <span class="streak-val">${p.streak}</span>
              <span class="streak-label">Day Streak</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Character of the Day -->
      <div class="card cotd-card">
        <h3>Character of the Day</h3>
        <div class="cotd-display" onclick="showCharModal('${cotd.hanzi}')">
          <div class="cotd-hanzi font-zh">${cotd.traditional || cotd.hanzi}</div>
          <div class="cotd-pinyin">${Pinyin.colorize(cotd.pinyin)}</div>
          <div class="cotd-def">${cotd.definition || ''}</div>
        </div>
      </div>

      <!-- Learning Progress -->
      <div class="card progress-summary">
        <h3>Mastery Progress</h3>
        <div class="prog-stats-grid">
          <div class="ps-item">
            <div class="ps-val">${learnedCount}</div>
            <div class="ps-label">Learned</div>
          </div>
          <div class="ps-item">
            <div class="ps-val">${srsStats.total}</div>
            <div class="ps-label">In SRS</div>
          </div>
          <div class="ps-item">
            <div class="ps-val">${p.testHistory.length}</div>
            <div class="ps-label">Tests</div>
          </div>
        </div>
        <div class="mt-24">
          <p class="text-small text-muted mb-4">Milestone: HSK 1 / TOCFL Novice</p>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(100, (learnedCount/150)*100)}%"></div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card recent-activity">
        <h3>Recent Activity</h3>
        <div class="activity-list">
          ${p.activityLog.length ? p.activityLog.map(a => `
            <div class="activity-item">
              <span class="activity-icon">${a.icon}</span>
              <div class="activity-info">
                <span class="activity-text">${a.text}</span>
                <span class="activity-time">${timeAgo(a.time)}</span>
              </div>
            </div>
          `).join('') : '<p class="text-center text-muted py-20">No activity yet. Start learning!</p>'}
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card quick-actions">
        <h3>Mastery Tracks</h3>
        <div class="qa-grid">
          <button class="qa-btn" onclick="navigate('/onboarding')">
            <span class="qa-icon">🎵</span>
            <span class="qa-label">Pinyin & Tones</span>
          </button>
          <button class="qa-btn" onclick="navigate('/char-playground')">
            <span class="qa-icon">🧩</span>
            <span class="qa-label">Radical Blocks</span>
          </button>
          <button class="qa-btn" onclick="navigate('/exams')">
            <span class="qa-icon">🎓</span>
            <span class="qa-label">Certifications</span>
          </button>
          <button class="qa-btn" onclick="navigate('/scenarios')">
            <span class="qa-icon">💬</span>
            <span class="qa-label">Scenarios</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderLibrary(container) {
  if (typeof LibraryModule !== 'undefined') return LibraryModule.render(container);
  container.innerHTML = '<div class="spinner"></div>';
}

function renderVocabulary(container) {
  if (typeof VocabularyModule !== 'undefined') return VocabularyModule.render(container);
  container.innerHTML = '<div class="spinner"></div>';
}

function renderLearningPath(container) {
  if (typeof LearnModule !== 'undefined') return LearnModule.render(container);
  container.innerHTML = '<div class="spinner"></div>';
}

function renderGrammarPage(container) {
  if (typeof GrammarModule !== 'undefined') return GrammarModule.render(container);
  container.innerHTML = '<div class="spinner"></div>';
}

function renderScenariosPage(container) {
  if (typeof ScenarioModule !== 'undefined') return ScenarioModule.render(container);
  container.innerHTML = '<div class="spinner"></div>';
}

function renderReaderPage(container) {
  if (typeof ReaderModule !== 'undefined') return ReaderModule.render(container);
  container.innerHTML = '<div class="spinner"></div>';
}

function renderMockTestsPage(container) {
  if (typeof MockTestModule !== 'undefined') return MockTestModule.render(container);
  container.innerHTML = '<div class="spinner"></div>';
}

function renderMockListeningPage(container) {
  if (typeof MockTestModule !== 'undefined') return MockTestModule.render(container);
}

function renderExamsPage(container) {
  if (window.ExamModule) return ExamModule.renderHub(container);
  container.innerHTML = '<div class="spinner"></div>';
}

function renderOnboarding(container) {
  if (typeof OnboardingModule !== 'undefined') return OnboardingModule.render(container);
  container.innerHTML = '<div class="spinner"></div>';
}

function renderToneGame(container) {
  if (typeof ToneGameModule !== 'undefined') return ToneGameModule.render(container);
  container.innerHTML = '<div class="spinner"></div>';
}

function renderPlayground(container) {
  if (typeof PlaygroundModule !== 'undefined') return PlaygroundModule.render(container);
  container.innerHTML = '<div class="spinner"></div>';
}

function renderCharPlayground(container) {
  if (typeof PlaygroundModule !== 'undefined') return PlaygroundModule.renderCharPlayground(container);
  container.innerHTML = '<div class="spinner"></div>';
}

function renderFlashcardsPage(container) {
  if (window.FlashcardsModule) return window.FlashcardsModule.render(container);
  container.innerHTML = '<div class="spinner"></div><p class="text-center text-muted mt-8">Loading flashcards…</p>';
}

function renderQuizPage(container) {
  if (typeof QuizModule !== 'undefined') return QuizModule.render(container);
  container.innerHTML = '<div class="spinner"></div>';
}

function renderSettings(container) {
  const s = App.state.settings;
  const p = App.state.progress;

  container.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto;">
      <div class="card mb-16">
        <div class="settings-section">
          <h3>Appearance</h3>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Dark Mode</div>
              <div class="setting-desc">Switch between light and dark themes</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="set-dark-mode" ${s.theme === 'dark' ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="card mb-16">
        <div class="settings-section">
          <h3>Content</h3>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Traditional Chinese</div>
              <div class="setting-desc">Prefer traditional characters over simplified</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="set-traditional" ${s.traditional ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Auto-play Audio</div>
              <div class="setting-desc">Automatically play character audio when studying</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="set-auto-play" ${s.autoPlay ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="card mb-16">
        <div class="settings-section">
          <h3>Account & Progress</h3>
          <div class="setting-row">
            <span>Characters Mastered</span>
            <span class="font-bold">${p.learnedChars.length}</span>
          </div>
          <div class="setting-row">
            <span>Current Streak</span>
            <span class="font-bold">${p.streak} days</span>
          </div>
          <div class="setting-row">
            <span>Mock Tests Taken</span>
            <span class="font-bold">${(p.testHistory || []).length}</span>
          </div>
        </div>
      </div>

      <div class="card mb-16">
        <div class="settings-section">
          <h3>Data Management</h3>
          <p class="setting-desc mb-16">Since this app runs locally in your browser, you can export your progress to a file to use on another device.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-outline" onclick="exportProgress()">📤 Export Progress</button>
            <button class="btn btn-outline" onclick="document.getElementById('import-file').click()">📥 Import Progress</button>
            <input type="file" id="import-file" style="display:none" onchange="importProgress(this)">
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" id="set-save-btn">Save Settings</button>
        <button class="btn btn-ghost btn-error" id="set-reset-btn">Reset All Progress</button>
      </div>
      <div id="set-saved-msg" class="hidden" style="margin-top:10px;color:var(--tone2);font-weight:600">✓ Settings saved!</div>
    </div>
  `;

  document.getElementById('set-save-btn')?.addEventListener('click', () => {
    const theme = document.getElementById('set-dark-mode').checked ? 'dark' : 'light';
    const traditional = document.getElementById('set-traditional').checked;
    const autoPlay = document.getElementById('set-auto-play').checked;

    App.applyTheme(theme);
    App.state.settings.traditional = traditional;
    App.state.settings.autoPlay = autoPlay;
    App.saveProgress();

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

// ─── Progress Management Utilities ───────────────────────────────────────────
function exportProgress() {
  const data = localStorage.getItem('tocfl_progress');
  if (!data) return alert("No progress data to export.");
  
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mandarin_progress_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importProgress(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (confirm('Importing progress will overwrite your current progress. Continue?')) {
        localStorage.setItem('tocfl_progress', JSON.stringify(data));
        window.location.reload();
      }
    } catch (err) {
      alert("Invalid progress file.");
    }
  };
  reader.readAsText(file);
}

// ─── Word/Character Detail Bridge ───────────────────────────────────────────
function showWordDetail(word) {
  if (window.VocabularyModule && window.VocabularyModule.showDetail(word)) {
    // Success
  } else {
    showCharModal(word[0]); // Fallback to first character
  }
}

// ─── Character Detail Modal ───────────────────────────────────────────────────
async function showCharModal(hanziOrObj) {
  let char = null;
  if (typeof hanziOrObj === 'string') {
    char = await API.getCharacter(hanziOrObj);
  } else {
    char = hanziOrObj;
  }
  
  if (!char) return;

  // Ensure consistent naming
  const hanzi = char.traditional || char.hanzi;
  
  // Prepare components HTML
  let compHTML = '';
  if (char.components && char.components.length > 0) {
    compHTML = `
      <div class="modal-section">
        <h4>Components</h4>
        <div class="comp-list">
          ${char.components.map(c => `<span class="comp-item" onclick="showCharModal('${c}')">${c}</span>`).join('')}
        </div>
        ${char.decomposition ? `<p class="text-small text-muted mt-8">${char.decomposition}</p>` : ''}
      </div>
    `;
  }

  Modal.show(`
    <button class="modal-close" onclick="Modal.hide()">✕</button>
    <div class="char-modal-content">
      <div class="char-modal-main">
        <div class="cm-char-side">
          <div class="cm-big-hanzi font-zh" onclick="TTS.speak('${hanzi}')">${hanzi}</div>
          <div class="cm-pinyin tone-colors">${Pinyin.colorize(char.pinyin)}</div>
          <button class="btn btn-outline btn-sm mt-16" onclick="TTS.speak('${hanzi}')">🔊 Play Audio</button>
        </div>
        <div class="cm-info-side">
          <div class="modal-section">
            <h4>Definition</h4>
            <p class="text-large">${char.definition}</p>
          </div>
          ${compHTML}
          <div class="modal-section">
            <h4>Example Words</h4>
            <div class="example-words-list">
              ${(char.example_words || []).map(w => `
                <div class="ex-word-item" onclick="showWordDetail('${w.word}')">
                  <span class="ew-zh font-zh">${w.word}</span>
                  <span class="ew-py">${w.pinyin}</span>
                  <span class="ew-def">${w.def}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="App.markLearned('${hanzi}'); Modal.hide();">Mark as Learned ✓</button>
        <button class="btn btn-outline" onclick="App.addToSaved('${hanzi}'); Modal.hide();">Save for Later</button>
      </div>
    </div>
  `);
}

// ─── Modal System ─────────────────────────────────────────────────────────────
const Modal = {
  show(content) {
    const overlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    if (!overlay || !modalContent) return;
    
    modalContent.innerHTML = content;
    overlay.classList.remove('hidden');
    overlay.onclick = (e) => { if (e.target === overlay) this.hide(); };
  },
  hide() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

// ─── Topbar level badge ──────────────────────────────────────────────────────
function updateTopbarBadge() {
  const chars = App.state.characters;
  const learned = App.state.progress.learnedChars;
  const badge = document.getElementById('topbar-level');
  if (!badge || !chars.length) return;

  const novice = chars.filter(c => c.level === 'Novice').length;
  const a1 = chars.filter(c => c.level === 'A1').length;
  
  const learnedCount = learned.length;
  let level = 'Beginner';
  if (learnedCount > 800) level = 'B1';
  else if (learnedCount > 500) level = 'A2';
  else if (learnedCount > 300) level = 'A1';
  else if (learnedCount > 50) level = 'Novice';
  
  badge.textContent = level;
}

// ─── Initialization ───────────────────────────────────────────────────────────
async function boot() {
  await App.init();
  
  // Global events
  window.addEventListener('hashchange', router);
  
  // Preload data
  try {
    const charResult = await API.get('characters_all');
    App.state.characters = charResult.data || [];
    
    const vocabResult = await API.get('vocabulary');
    App.state.vocabulary = vocabResult.sets || [];
    
    if (window.ExamModule) ExamModule.init();

    updateTopbarBadge();
  } catch (err) {
    console.warn('Could not preload curriculum data:', err.message);
  }

  // Run router
  router();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
