/* ═══════════════════════════════════════════════════════════════
   tone-game.js — Interactive Mandarin Tone Training Game
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const ToneGame = (() => {

  const TONES = [
    { num: 1, name: 'First Tone (High Level)', symbol: '\u0101', desc: 'Flat, high pitch like a robot.' },
    { num: 2, name: 'Second Tone (Rising)', symbol: '\u00e1', desc: 'Starts mid, rises high like a question.' },
    { num: 3, name: 'Third Tone (Falling-Rising)', symbol: '\u01ce', desc: 'Starts mid, dips low, then rises.' },
    { num: 4, name: 'Fourth Tone (Falling)', symbol: '\u00e0', desc: 'Starts high, drops sharply like a command.' }
  ];

  const BASE_GAME_DATA = [
    { syllable: 'm\u0101', tone: 1, char: '\u5abd' }, { syllable: 'm\u00e1', tone: 2, char: '\u9ebb' }, { syllable: 'm\u01ce', tone: 3, char: '\u99ac' }, { syllable: 'm\u00e0', tone: 4, char: '\u7f75' },
    { syllable: 'b\u0101', tone: 1, char: '\u516b' }, { syllable: 'b\u00e1', tone: 2, char: '\u62d4' }, { syllable: 'b\u01ce', tone: 3, char: '\u628a' }, { syllable: 'b\u00e0', tone: 4, char: '\u7238' },
    { syllable: 't\u0101ng', tone: 1, char: '\u6e6f' }, { syllable: 't\u00e1ng', tone: 2, char: '\u7cd6' }, { syllable: 't\u01ceng', tone: 3, char: '\u8eba' }, { syllable: 't\u00e0ng', tone: 4, char: '\u71d9' },
    { syllable: 'sh\u016b', tone: 1, char: '\u66f8' }, { syllable: 'sh\u00fa', tone: 2, char: '\u719f' }, { syllable: 'sh\u01d4', tone: 3, char: '\u6578' }, { syllable: 'sh\u00f9', tone: 4, char: '\u6a39' }
  ];

  let currentState = {
    score: 0,
    total: 0,
    currentTarget: null
  };

  let cachedGameData = null;
  let masteryToneSyllables = null;

  async function ensureLibraryData() {
    if (typeof API !== 'undefined' && API.get && !masteryToneSyllables) {
      try {
        const bank = await API.get('pinyin_mastery_full');
        masteryToneSyllables = Array.isArray(bank?.toneSyllables) ? bank.toneSyllables : [];
      } catch {}
    }
    const hasChars = typeof App !== 'undefined' && App.state && Array.isArray(App.state.characters) && App.state.characters.length > 0;
    if (hasChars) return;
    if (typeof API === 'undefined' || !API.get) return;
    try {
      const payload = await API.get('characters_all');
      const rows = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.data) ? payload.data : []);
      if (rows.length && typeof App !== 'undefined' && App.state) {
        App.state.characters = rows;
        cachedGameData = null;
      }
    } catch (err) {
      console.warn('Tone training could not load character library', err);
    }
  }

  function charLabel(item) {
    return item.traditional || item.hanzi || item.char || '';
  }

  function getGameData() {
    if (cachedGameData) return cachedGameData;
    const seen = new Set();
    const add = (out, item) => {
      const char = charLabel(item);
      const syllable = String(item.pinyin || item.syllable || '').trim();
      if (!char || !syllable || syllable.includes(' ')) return;
      const tone = item.tone || (typeof Pinyin !== 'undefined' && Pinyin.getTone ? Pinyin.getTone(syllable) : 0);
      if (!tone || tone === 5) return;
      const key = `${char}|${syllable}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ syllable, tone, char });
    };

    const out = [];
    BASE_GAME_DATA.forEach(item => add(out, item));
    if (Array.isArray(masteryToneSyllables) && masteryToneSyllables.length) {
      masteryToneSyllables.forEach(item => add(out, {
        syllable: item.pinyin,
        tone: item.tone,
        char: item.hanzi
      }));
    }
    const library = (typeof App !== 'undefined' && App.state && Array.isArray(App.state.characters)) ? App.state.characters : [];
    library.forEach(item => {
      const char = charLabel(item);
      if (char.length === 1) add(out, item);
    });
    cachedGameData = out.length ? out : BASE_GAME_DATA;
    return cachedGameData;
  }


  async function render(container) {
    await ensureLibraryData();
    container.innerHTML = `
      <div class="page-header">
        <h2>Tone Training Game</h2>
        <p>Train your ear to distinguish the four Mandarin tones.</p>
      </div>

      <div class="tone-game-container">
        <div class="tone-guide-grid mb-32">
          ${TONES.map(t => `
            <div class="tone-guide-card tone${t.num}">
              <div class="tg-num">${t.num}</div>
              <div class="tg-sym">${t.symbol}</div>
              <div class="tg-name">${t.name}</div>
            </div>
          `).join('')}
        </div>

        <div class="card p-32 text-center shadow-lg" style="background:var(--off-white); border:2px solid var(--border)">
          <div class="tone-score mb-16">Score: <strong>${currentState.score} / ${currentState.total}</strong></div>
          <h3 class="mb-8">Listen and Identify the Tone</h3>
          <div class="text-small text-muted mb-24">Training set: ${getGameData().length} tone items from your character library</div>
          
          <button class="btn btn-gold btn-lg pulse-animation" id="tone-play-btn" onclick="ToneGame.playTarget()">
${window.IconSystem ? window.IconSystem.svg('volume') : ''}<span>Play Sound</span>
          </button>

          <div class="tone-options-grid mt-32" id="tone-options-grid"></div>

          <div id="tone-feedback" class="quiz-feedback mt-24"></div>
          
          <button class="btn btn-primary mt-24 hidden" id="tone-next-btn" onclick="ToneGame.nextRound()">
            Next Round</button>
        </div>
      </div>
    `;
    nextRound();
  }

  function renderToneOptions() {
    const grid = document.getElementById('tone-options-grid');
    if (!grid || !currentState.currentTarget) return;
    const options = Pinyin.toneOptionsFor(currentState.currentTarget.syllable, currentState.currentTarget.tone);
    grid.innerHTML = options.map(opt => `
      <button class="btn btn-outline tone-btn tone${opt.tone}" onclick="ToneGame.guess(${opt.tone}, this)">
        <span class="tone-option-pinyin">${opt.label}</span>
      </button>
    `).join('');
  }

  function nextRound() {
    const gameData = getGameData();
    currentState.currentTarget = gameData[Math.floor(Math.random() * gameData.length)];
    renderToneOptions();
    document.getElementById('tone-next-btn').classList.add('hidden');
    document.getElementById('tone-feedback').classList.remove('show');
    document.querySelectorAll('.tone-btn').forEach(b => {
      b.classList.remove('btn-success', 'btn-error');
      b.classList.add('btn-outline');
      b.disabled = false;
    });
    setTimeout(() => playTarget(), 500);
  }

  async function playTarget() {
    if (!currentState.currentTarget) return;
    const target = currentState.currentTarget;
    if (window.PinyinAudio) {
      await PinyinAudio.play(
        { pinyin: target.syllable, syllable: target.syllable, hanzi: target.char },
        target.char || '',
        { rate: 0.72 }
      );
      return;
    }
    if (target.char) TTS.speak(target.char, 'zh-TW', 0.78);
  }

  function guess(num, btn) {
    currentState.total++;
    const isCorrect = num === currentState.currentTarget.tone;
    const feedback = document.getElementById('tone-feedback');

    const correctTone = currentState.currentTarget.tone;
    const correctBtn = Array.from(document.querySelectorAll('.tone-btn')).find(b => {
      const handler = b.getAttribute('onclick') || '';
      return handler.includes(`guess(${correctTone}`);
    });

    if (isCorrect) {
      currentState.score++;
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-success');
      feedback.className = 'quiz-feedback correct show';
      feedback.innerHTML = `Correct. ${currentState.currentTarget.char} is <strong>${currentState.currentTarget.syllable}</strong>, tone ${num}.`;
      App.logActivity('Tone', `Mastered tone ${num} for ${currentState.currentTarget.syllable}`);
    } else {
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-error');
      if (correctBtn) {
        correctBtn.classList.remove('btn-outline');
        correctBtn.classList.add('btn-success', 'tone-correct-answer');
      }
      feedback.className = 'quiz-feedback wrong show';
      feedback.innerHTML = `Not quite. Correct answer: <strong>${currentState.currentTarget.char}</strong> is <strong>${currentState.currentTarget.syllable}</strong>, tone ${correctTone}. Tap Play Sound again and compare it with your choice.`;
      if (window.WeaknessEngine) WeaknessEngine.record('tone', { item: currentState.currentTarget.syllable, label: 'Tone ' + currentState.currentTarget.tone, type: 'tone-miss' });
    }

    document.querySelectorAll('.tone-btn').forEach(b => b.disabled = true);
    document.getElementById('tone-next-btn').classList.remove('hidden');
    updateScore();
  }

  function updateScore() {
    const scoreEl = document.querySelector('.tone-score');
    if (scoreEl) scoreEl.innerHTML = `Score: <strong>${currentState.score} / ${currentState.total}</strong>`;
  }

  return { render, playTarget, guess, nextRound };

})();
