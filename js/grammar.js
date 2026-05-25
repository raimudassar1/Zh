
'use strict';

window.GrammarModule = (() => {
  const STORAGE_KEY = 'grammarAcademyState';
  let data = null;
  const PRACTICE_VERSION = 3;
  let state = { level: 'beginner', unit: null, tab: 'learn', exampleFilter: 'all', showPinyin: false, showEnglish: true, answered: {}, builds: {}, practiceVersion: PRACTICE_VERSION };



  const PATTERN_TERMS = {
    S: ['Subject', 'who or what the sentence is about, such as \u6211, \u4f60, \u8001\u5e2b'],
    V: ['Verb', 'the action, such as \u5403, \u53bb, \u5b78, \u559c\u6b61'],
    O: ['Object', 'the thing/person receiving the action, such as \u98ef, \u4e2d\u6587, \u670b\u53cb'],
    N: ['Noun', 'a person, place, thing, role, or category'],
    Adj: ['Adjective', 'a describing word, such as \u5fd9, \u597d, \u8cb4, \u9ad8\u8208'],
    Time: ['Time', 'when it happens, such as \u4eca\u5929, \u660e\u5929, \u65e9\u4e0a'],
    Place: ['Place', 'where it happens, such as \u5b78\u6821, \u5bb6, \u9910\u5ef3'],
    Topic: ['Topic', 'the thing you are talking about before adding a comment'],
    Measure: ['Measure word', 'the counter used with numbers, such as \u500b, \u676f, \u672c'],
    Particle: ['Particle', 'a small grammar word like \u4e86, \u55ce, \u5462, \u7684']
  };

  function patternTokens(pattern) {
    const found = [];
    const raw = String(pattern || '');
    Object.keys(PATTERN_TERMS).forEach(key => {
      const re = new RegExp(`(^|[^A-Za-z])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z]|$)`);
      if (re.test(raw)) found.push(key);
    });
    if (raw.includes('\u662f')) found.push('\u662f');
    if (raw.includes('\u4e0d') || raw.includes('\u6c92')) found.push('\u4e0d/\u6c92');
    if (raw.includes('\u55ce') || raw.includes('\u5462')) found.push('\u55ce/\u5462');
    return [...new Set(found)];
  }

  function renderPattern(pattern) {
    const parts = String(pattern || '').split(/(S|V|O|N|Adj|Time|Place|Topic|Measure|Particle)/g);
    return parts.map(part => PATTERN_TERMS[part] ? `<abbr title="${esc(PATTERN_TERMS[part][0])}">${esc(part)}</abbr>` : esc(part)).join('');
  }

  function renderPatternKey(pattern) {
    const tokens = patternTokens(pattern);
    const extra = {
      '\u662f': ['\u662f', 'links a subject to identity/category: \u6211\u662f\u5b78\u751f'],
      '\u4e0d/\u6c92': ['\u4e0d / \u6c92', 'negative markers. \u4e0d for general not, \u6c92 for did not / do not have'],
      '\u55ce/\u5462': ['\u55ce / \u5462', 'question particles added near the end']
    };
    if (!tokens.length) return '';
    return `<div class="ga-pattern-key" aria-label="Pattern key">
      ${tokens.map(token => {
        const item = PATTERN_TERMS[token] || extra[token];
        if (!item) return '';
        return `<div class="ga-pattern-term"><b>${esc(token)}</b><span><strong>${esc(item[0])}</strong>${esc(item[1])}</span></div>`;
      }).join('')}
    </div>`;
  }

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function speak(text) {
    const value = String(text || '').trim();
    if (!value) return;
    if (typeof TTS !== 'undefined' && TTS?.speak) { TTS.speak(value, 'zh-TW', 0.78); return; }
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = 'zh-TW';
    utterance.rate = 0.78;
    window.speechSynthesis.speak(utterance);
  }

  function loadState() {
    try { state = { ...state, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')) }; } catch {}
    if (state.practiceVersion !== PRACTICE_VERSION) {
      state.answered = {};
      state.builds = {};
      state.practiceVersion = PRACTICE_VERSION;
      saveState();
    }
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  async function init() {
    if (data) return data;
    data = await API.get('grammar_academy');
    if (!state.unit) state.unit = data.levels[0]?.units[0]?.id || null;
    return data;
  }

  async function render(container) {
    loadState();
    try { await init(); } catch (err) {
      container.innerHTML = '<div class="empty-state"><h3>Grammar Academy could not load</h3><p>Please refresh the page.</p></div>';
      return;
    }
    const level = getLevel(state.level);
    if (!level.units.some(unit => unit.id === state.unit)) state.unit = level.units[0]?.id;
    saveState();
    const unit = getUnit(state.unit) || level.units[0];
    container.innerHTML = `
      <div class="grammar-academy">
        <section class="ga-hero ga-hero-compact">
          <div>
            <span class="ga-kicker">Grammar Academy</span>
            <h2>One pattern at a time</h2>
            <p>Choose a level, pick a pattern, then study a short focused section.</p>
          </div>
          <div class="ga-stats ga-stats-compact"><strong>${data.totals.examples}</strong><span>examples</span><strong>${data.totals.exercises}</strong><span>drills</span></div>
        </section>

        <section class="ga-course-picker">
          ${renderLevelSelector()}
          ${renderUnitRail(level)}
        </section>

        <main class="ga-main">
          ${renderUnit(unit)}
        </main>
      </div>`;
    bind(container);
  }

  function getLevel(id) { return data.levels.find(level => level.id === id) || data.levels[0]; }
  function getUnit(id) { return data.levels.flatMap(level => level.units).find(unit => unit.id === id); }

  function renderLevelSelector() {
    return `<div class="ga-levels">
      ${data.levels.map(level => `
        <button type="button" class="ga-level ${level.id === state.level ? 'active' : ''}" data-ga-action="level" data-level="${level.id}">
          <span>${esc(level.label)}</span>
          <small>${esc(level.goal)}</small>
        </button>`).join('')}
    </div>`;
  }

  function renderUnitList(level) {
    return `<div class="ga-unit-list">
      <div class="ga-side-title">Units</div>
      ${level.units.map((unit, index) => `
        <button type="button" class="ga-unit-link ${unit.id === state.unit ? 'active' : ''}" data-ga-action="unit" data-unit="${unit.id}">
          <span>${String(index + 1).padStart(2, '0')}</span>
          <strong>${esc(unit.title)}</strong>
          <small>${esc(unit.structure)}</small>
        </button>`).join('')}
    </div>`;
  }

  function renderUnitRail(level) {
    return `<div class="ga-unit-rail" aria-label="Grammar units">
      ${level.units.map((unit, index) => `
        <button type="button" class="ga-unit-pill ${unit.id === state.unit ? 'active' : ''}" data-ga-action="unit" data-unit="${unit.id}">
          <span>${String(index + 1).padStart(2, '0')}</span>
          <strong>${esc(unit.title.replace(/Basic |and /g, '').slice(0, 34))}</strong>
          <small>${renderPattern(unit.structure)}</small>
        </button>`).join('')}
    </div>`;
  }

  function renderUnit(unit) {
    return `<article class="ga-unit-page">
      <header class="ga-unit-head">
        <div>
          <span class="ga-kicker">${esc(getLevel(unit.level).label)}</span>
          <h3>${esc(unit.title)}</h3>
          <p>${esc(unit.meaning)}</p>
        </div>
        <button type="button" class="btn btn-ghost" data-ga-action="speak" data-text="${esc(unit.examples[0]?.zh || unit.structure)}">Hear Example</button>
      </header>

      <div class="ga-structure ga-structure-minimal">
        <div class="ga-pattern-line">
          <span>Core Pattern</span>
          <strong>${renderPattern(unit.structure)}</strong>
        </div>
        ${renderPatternKey(unit.structure)}
        <p>${esc(unit.coreExplanation)}</p>
      </div>

      <div class="ga-toolbar">
        ${['learn','examples','practice','reading','writing'].map(tab => `<button type="button" class="${state.tab === tab ? 'active' : ''}" data-ga-action="tab" data-tab="${tab}">${tab}</button>`).join('')}
        <div class="ga-display">
          <button type="button" class="${state.showPinyin ? 'active' : ''}" data-ga-action="toggle" data-key="showPinyin">Pinyin</button>
          <button type="button" class="${state.showEnglish ? 'active' : ''}" data-ga-action="toggle" data-key="showEnglish">English</button>
        </div>
      </div>

      <section class="ga-panel">
        ${renderPanel(unit)}
      </section>
    </article>`;
  }

  function renderPanel(unit) {
    if (state.tab === 'examples') return renderExamples(unit);
    if (state.tab === 'practice') return renderPractice(unit);
    if (state.tab === 'reading') return renderReading(unit);
    if (state.tab === 'writing') return renderWriting(unit);
    return renderLearn(unit);
  }

  function renderLearn(unit) {
    return `<div class="ga-focus-stack">
      <section class="ga-card-large ga-summary-card">
        <h4>What this pattern does</h4>
        <p>${esc(unit.coreExplanation)}</p>
      </section>
      <section class="ga-card-large ga-mini-examples">
        <h4>Two natural examples</h4>
        ${unit.examples.slice(0,2).map(renderExample).join('')}
      </section>
      <section class="ga-card-large ga-next-actions">
        <h4>Practice next</h4>
        <div>
          <button type="button" data-ga-action="tab" data-tab="examples">See more examples</button>
          <button type="button" data-ga-action="tab" data-tab="practice">Build sentences</button>
          <button type="button" data-ga-action="tab" data-tab="writing">Write your own</button>
        </div>
      </section>
      <section class="ga-card-large">
        <h4>Watch out for</h4>
        ${unit.commonMistakes.slice(0,3).map(item => `<div class="ga-mistake">${esc(item)}</div>`).join('')}
      </section>
    </div>`;
  }

  function renderExamples(unit) {
    const types = ['all', ...Array.from(new Set(unit.examples.map(ex => ex.type)))];
    const examples = state.exampleFilter === 'all' ? unit.examples : unit.examples.filter(ex => ex.type === state.exampleFilter);
    return `<div class="ga-examples-wrap">
      <div class="ga-example-filters">
        ${types.map(type => `<button type="button" class="${state.exampleFilter === type ? 'active' : ''}" data-ga-action="filter" data-filter="${esc(type)}">${esc(type)}</button>`).join('')}
      </div>
      <div class="ga-example-count">${examples.length} examples shown</div>
      <div class="ga-examples-list">${examples.map(renderExample).join('')}</div>
    </div>`;
  }

  function renderExample(ex) {
    return `<div class="ga-example">
      <div class="ga-example-top"><span>${esc(ex.type)}</span><button type="button" data-ga-action="speak" data-text="${esc(ex.zh)}">Play</button></div>
      <button type="button" class="ga-zh" data-ga-action="speak" data-text="${esc(ex.zh)}">${esc(ex.zh)}</button>
      ${state.showPinyin && ex.pinyin ? `<div class="ga-pinyin">${esc(ex.pinyin)}</div>` : ''}
      ${state.showEnglish ? `<div class="ga-english">${esc(ex.english)}</div>` : ''}
      <small>${esc(ex.note)}</small>
    </div>`;
  }

  function renderPractice(unit) {
    return `<div class="ga-practice-list">
      ${unit.exercises.map((ex, index) => renderExercise(ex, index)).join('')}
    </div>`;
  }

  function getBuildState(ex) {
    const key = ex.id;
    if (!state.builds) state.builds = {};
    if (!state.builds[key]) {
      const bank = shuffleForExercise(ex.tiles || [], ex.id).map((tile, index) => ({ id: `${key}-tile-${index}`, text: tile }));
      state.builds[key] = { bank, answer: [], checked: false, correct: false };
    }
    return state.builds[key];
  }

  function builtText(build) {
    return (build?.answer || []).map(tile => tile.text).join('');
  }

  function expectedText(ex) {
    return (ex.tiles || []).join('');
  }

  function shuffleForExercise(tiles, seedText) {
    const arr = [...(tiles || [])];
    let seed = String(seedText || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) || 1;
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = seed % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function renderExercise(ex, index) {
    const answered = state.answered?.[ex.id];
    const build = ex.tiles?.length ? getBuildState(ex) : null;
    const built = build ? builtText(build) : '';
    const correct = build ? built === expectedText(ex) : false;
    const target = ex.english || ex.prompt || 'Build the Chinese sentence.';
    const buildInstruction = build ? 'Use the tiles to make this Chinese sentence.' : ex.prompt;
    return `<section class="ga-exercise">
      <div class="ga-ex-head"><span>${String(index + 1).padStart(2, '0')}</span><strong>${esc(ex.type)}</strong></div>
      <div class="ga-practice-target">
        <span>English prompt</span>
        <strong>${esc(target)}</strong>
      </div>
      <p>${esc(buildInstruction)}</p>
      ${build ? `<div class="ga-builder-preview ga-builder-live">
        <div class="ga-build-target"><span>Your Chinese sentence</span><div class="ga-build-answer ${correct ? 'correct' : ''}">${build.answer.length ? build.answer.map(tile => `<button type="button" data-ga-action="build-move" data-exercise="${esc(ex.id)}" data-tile="${esc(tile.id)}" onclick="event.stopPropagation(); GrammarModule.moveBuildTile('${esc(ex.id)}', '${esc(tile.id)}')">${esc(tile.text)}</button>`).join('') : '<em>Tap tiles below to build your answer</em>'}</div></div>
        <div class="ga-build-target"><span>Available tiles</span><div class="ga-tiles">${build.bank.map(tile => `<button type="button" data-ga-action="build-move" data-exercise="${esc(ex.id)}" data-tile="${esc(tile.id)}" onclick="event.stopPropagation(); GrammarModule.moveBuildTile('${esc(ex.id)}', '${esc(tile.id)}')">${esc(tile.text)}</button>`).join('')}</div></div>
        ${build.checked ? `<div class="ga-build-feedback ${correct ? 'correct' : 'wrong'}">${correct ? 'Correct. Read the Chinese sentence aloud once.' : `Not yet. Your answer: ${esc(built || 'empty')}. Build from the English prompt, then compare word order with the model.`}</div>` : ''}
      </div>` : ''}
      <div class="ga-answer-row">
        <button type="button" class="btn btn-ghost btn-sm" data-ga-action="speak" data-text="${esc(ex.answer)}">Play Answer</button>
        ${build ? `<button type="button" class="btn btn-primary btn-sm" data-ga-action="build-check" data-exercise="${esc(ex.id)}">Check</button><button type="button" class="btn btn-ghost btn-sm" data-ga-action="build-reset" data-exercise="${esc(ex.id)}">Reset</button>` : ''}
        <button type="button" class="btn btn-ghost btn-sm" data-ga-action="answer" data-exercise="${esc(ex.id)}">Show Answer</button>
      </div>
      <div class="ga-answer ${answered ? '' : 'hidden'}">
        <strong>${esc(ex.answer)}</strong>
        ${state.showEnglish ? `<small>${esc(ex.english)}</small>` : ''}
        <em>${esc(ex.hint)}</em>
      </div>
    </section>`;
  }


  function renderReading(unit) {
    return `<div class="ga-reading">
      <section class="ga-card-large">
        <h4>${esc(unit.readingTask.title)}</h4>
        <p>${esc(unit.readingTask.instructions)}</p>
      </section>
      <section class="ga-reading-strip">
        ${unit.examples.slice(0,10).map(ex => `<button type="button" data-ga-action="speak" data-text="${esc(ex.zh)}">${esc(ex.zh)}</button>`).join('')}
      </section>
    </div>`;
  }

  function renderWriting(unit) {
    return `<div class="ga-writing">
      ${unit.writingPrompts.map((prompt, index) => `<section class="ga-writing-card"><span>Prompt ${index + 1}</span><p>${esc(prompt)}</p><textarea placeholder="Type your Chinese answer here..."></textarea></section>`).join('')}
    </div>`;
  }

  function moveBuildTile(exerciseId, tileId) {
    const unit = getUnit(state.unit);
    const ex = unit?.exercises?.find(item => item.id === exerciseId);
    if (!ex) return;
    const build = getBuildState(ex);
    let from = build.bank;
    let to = build.answer;
    let idx = from.findIndex(tile => tile.id === tileId);
    if (idx < 0) { from = build.answer; to = build.bank; idx = from.findIndex(tile => tile.id === tileId); }
    if (idx >= 0) {
      to.push(from.splice(idx, 1)[0]);
      build.checked = false;
      saveState();
      render(document.getElementById('page-content'));
    }
  }

  function bind(container) {
    container.querySelector('.grammar-academy')?.addEventListener('click', event => {
      const btn = event.target.closest('[data-ga-action]');
      if (!btn) return;
      const action = btn.dataset.gaAction;
      if (action === 'level') {
        state.level = btn.dataset.level || 'beginner';
        state.unit = getLevel(state.level).units[0]?.id;
        state.tab = 'learn';
        state.builds = {};
        saveState(); render(container);
      }
      if (action === 'unit') { state.unit = btn.dataset.unit; state.tab = 'learn'; state.builds = {}; saveState(); render(container); }
      if (action === 'tab') { state.tab = btn.dataset.tab || 'learn'; saveState(); render(container); }
      if (action === 'toggle') { state[btn.dataset.key] = !state[btn.dataset.key]; saveState(); render(container); }
      if (action === 'filter') { state.exampleFilter = btn.dataset.filter || 'all'; saveState(); render(container); }
      if (action === 'answer') { state.answered = { ...(state.answered || {}), [btn.dataset.exercise]: true }; saveState(); render(container); }
      if (action === 'build-move') { moveBuildTile(btn.dataset.exercise, btn.dataset.tile); }
      if (action === 'build-check') {
        const unit = getUnit(state.unit);
        const ex = unit?.exercises?.find(item => item.id === btn.dataset.exercise);
        if (!ex) return;
        const build = getBuildState(ex);
        build.checked = true;
        build.correct = builtText(build) === expectedText(ex);
        if (build.correct) state.answered = { ...(state.answered || {}), [ex.id]: true };
        saveState(); render(container);
      }
      if (action === 'build-reset') {
        const unit = getUnit(state.unit);
        const ex = unit?.exercises?.find(item => item.id === btn.dataset.exercise);
        if (!ex) return;
        state.builds = { ...(state.builds || {}) };
        delete state.builds[ex.id];
        saveState(); render(container);
      }
      if (action === 'speak') speak(btn.dataset.text || btn.textContent.trim());
    });
  }

  return { render, moveBuildTile };
})();
