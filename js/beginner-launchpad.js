
'use strict';

window.BeginnerLaunchpadModule = (() => {
  const STORAGE_KEY = 'beginnerLaunchpadProgress';
  let data = null;
  let state = { lesson: 0, level: 'level-1', tab: 'learn', completed: [], completedByLevel: {}, score: 0, total: 0 };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const speak = text => { if (window.TTS) TTS.speak(text, 'zh-TW', 0.78); };
  const lessonPath = (levelId, index) => levelId === 'level-2'
    ? `/beginner-launchpad/level-2/${String(index + 1).padStart(2, '0')}`
    : `/beginner-launchpad/${String(index + 1).padStart(2, '0')}`;

  function loadState() {
    try { state = { ...state, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')) }; } catch {}
    state.completed = Array.isArray(state.completed) ? state.completed : [];
    state.completedByLevel = state.completedByLevel && typeof state.completedByLevel === 'object' ? state.completedByLevel : {};
    state.completedByLevel['level-1'] = Array.isArray(state.completedByLevel['level-1']) ? state.completedByLevel['level-1'] : state.completed;
    state.completedByLevel['level-2'] = Array.isArray(state.completedByLevel['level-2']) ? state.completedByLevel['level-2'] : [];
  }

  function saveState() {
    state.completed = state.completedByLevel?.['level-1'] || [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async function ensureData() {
    if (data) return data;
    const [levelOneRes, levelTwoRes] = await Promise.all([
      fetch('data/beginner_launchpad.json', { cache: 'no-store' }),
      fetch('data/beginner_launchpad_level2.json', { cache: 'no-store' })
    ]);
    const levelOne = await levelOneRes.json();
    const levelTwo = await levelTwoRes.json();
    data = {
      title: 'Beginner Launchpad',
      totalWords: (levelOne.totalWords || 0) + (levelTwo.totalWords || 0),
      levels: [
        { id: 'level-1', label: 'Level 1', badge: 'First 100', kicker: 'Absolute beginner', desc: 'First exposure: short words, tiny stories, and survival dialogues.', ...levelOne },
        { id: 'level-2', label: 'Level 2', badge: 'Bridge to books', kicker: 'Harder beginner', desc: 'Same topics, but longer sentences, connectors, reasons, and book-ready dialogue.', ...levelTwo }
      ]
    };
    return data;
  }

  function getLevel(levelId = state.level || 'level-1') {
    return data.levels.find(level => level.id === levelId) || data.levels[0];
  }

  function getRouteState() {
    const hash = window.location.hash || '';
    const levelTwoMatch = hash.match(/#\/beginner-launchpad\/level-2\/(\d+)/);
    if (levelTwoMatch) return { levelId: 'level-2', lessonIndex: clampLessonIndex('level-2', Number(levelTwoMatch[1]) - 1) };
    const levelOneMatch = hash.match(/#\/beginner-launchpad\/(\d+)/);
    if (levelOneMatch) return { levelId: 'level-1', lessonIndex: clampLessonIndex('level-1', Number(levelOneMatch[1]) - 1) };
    return { levelId: state.level || 'level-1', lessonIndex: null };
  }

  function clampLessonIndex(levelId, index) {
    const level = getLevel(levelId);
    const safe = Math.max(0, Math.min(index, level.lessons.length - 1));
    return Number.isFinite(safe) ? safe : 0;
  }

  function getCompleted(levelId) {
    return state.completedByLevel[levelId] || [];
  }

  function completeLesson(levelId, index) {
    const completed = getCompleted(levelId);
    if (!completed.includes(index)) completed.push(index);
    state.completedByLevel[levelId] = completed;
    state.level = levelId;
    state.lesson = Math.min(index + 1, getLevel(levelId).lessons.length - 1);
    saveState();
    const nextIndex = index < getLevel(levelId).lessons.length - 1 ? index + 1 : index;
    const targetHash = '#' + lessonPath(levelId, nextIndex);
    if (window.location.hash === targetHash) {
      render(document.getElementById('page-content'));
    } else {
      window.location.hash = targetHash;
    }
  }

  async function render(container) {
    loadState();
    try { await ensureData(); } catch (e) {
      container.innerHTML = '<div class="empty-state"><h3>Beginner Launchpad could not load</h3><p>Please refresh the page.</p></div>';
      return;
    }

    const routeState = getRouteState();
    const isLessonPage = routeState.lessonIndex !== null;
    const activeLevel = getLevel(routeState.levelId);
    const activeIndex = isLessonPage ? routeState.lessonIndex : clampLessonIndex(activeLevel.id, state.lesson || 0);
    state.level = activeLevel.id;
    state.lesson = activeIndex;
    saveState();

    container.innerHTML = `
      <div class="beginner-launchpad ${isLessonPage ? 'bl-focused' : 'bl-index'}">
        ${isLessonPage ? renderFocusedLesson(activeLevel, activeIndex) : renderLaunchpadIndex(activeLevel.id, activeIndex)}
      </div>`;
    bind(container);
  }

  function renderLaunchpadIndex(activeLevelId, activeIndex) {
    const totalLessons = data.levels.reduce((sum, level) => sum + level.lessons.length, 0);
    const totalCompleted = data.levels.reduce((sum, level) => sum + getCompleted(level.id).length, 0);
    return `
      <section class="bl-hero">
        <div>
          <div class="bl-kicker">Beginner Bridge Mode</div>
          <h2>Beginner Launchpad</h2>
          <p>Two clean beginner tracks before the course books. Level 1 gives first exposure. Level 2 repeats the same topics with longer sentences, connectors, and practical dialogues.</p>
          <div class="bl-actions">
            <a class="btn btn-primary" href="#${lessonPath(activeLevelId, activeIndex)}">Continue Current Track</a>
            <a class="btn btn-ghost" href="#${lessonPath('level-2', Math.max(0, getCompleted('level-2').length))}">Start Level 2</a>
          </div>
        </div>
        <div class="bl-progress-card">
          <span>Total Launchpad Progress</span>
          <strong>${totalCompleted}/${totalLessons}</strong>
          <div class="bl-progress"><i style="width:${Math.round((totalCompleted / totalLessons) * 100)}%"></i></div>
          <small>${data.totalWords} beginner bridge words - from zero to book-ready</small>
        </div>
      </section>

      <section class="bl-index-shell" aria-label="Beginner lesson map">
        <div class="bl-section-head">
          <div>
            <span class="bl-kicker">Choose a track</span>
            <h3>Beginner lesson map</h3>
          </div>
          <small>${totalCompleted} completed</small>
        </div>
        <div class="bl-level-switch">
          ${data.levels.map(level => `
            <a class="bl-level-card ${level.id === activeLevelId ? 'active' : ''}" href="#${lessonPath(level.id, Math.max(0, Math.min(getCompleted(level.id).length, level.lessons.length - 1)))}">
              <span>${esc(level.kicker)}</span>
              <strong>${esc(level.label)}</strong>
              <small>${esc(level.desc)}</small>
              <em>${getCompleted(level.id).length}/${level.lessons.length} done</em>
            </a>`).join('')}
        </div>
        ${data.levels.map(level => `
          <div class="bl-tier-block">
            <div class="bl-tier-title">
              <span>${esc(level.badge)}</span>
              <strong>${esc(level.label)}</strong>
            </div>
            <div class="bl-map-grid">
              ${level.lessons.map((lesson, i) => renderMapCard(level, lesson, i, level.id === activeLevelId && i === activeIndex)).join('')}
            </div>
          </div>`).join('')}
      </section>`;
  }

  function renderMapCard(level, lesson, index, active) {
    const completed = getCompleted(level.id);
    return `
      <a class="bl-topic-card ${active ? 'active' : ''} ${completed.includes(index) ? 'done' : ''}" href="#${lessonPath(level.id, index)}">
        <span>${String(index + 1).padStart(2, '0')}</span>
        <div>
          <strong>${esc(lesson.title)}</strong>
          <small>${esc(lesson.canDo)}</small>
        </div>
        <em>${completed.includes(index) ? 'Done' : 'Open'}</em>
      </a>`;
  }

  function renderFocusedLesson(level, index) {
    const lesson = level.lessons[index];
    const prev = index > 0 ? `<a class="btn btn-ghost" href="#${lessonPath(level.id, index - 1)}">Previous</a>` : '';
    const next = index < level.lessons.length - 1 ? `<a class="btn btn-ghost" href="#${lessonPath(level.id, index + 1)}">Next</a>` : '';
    return `
      <section class="bl-lesson-page-head">
        <a class="btn btn-ghost" href="#/beginner-launchpad">All Topics</a>
        <div class="bl-lesson-nav">${prev}${next}</div>
      </section>
      <main class="bl-focused-main">
        ${renderLesson(level, lesson, index)}
      </main>`;
  }

  function renderLesson(level, lesson, index) {
    const completeText = level.id === 'level-2' ? 'Complete Level 2 Lesson' : 'Complete Lesson';
    return `
      <article class="bl-lesson">
        <div class="bl-lesson-head">
          <div>
            <span class="bl-kicker">${esc(level.label)} - Lesson ${lesson.number}</span>
            <h3>${esc(lesson.title)}</h3>
            <p>${esc(lesson.canDo)}</p>
          </div>
          <button type="button" class="btn btn-ghost" data-bl-action="speak" data-text="${esc(lesson.pattern)}">Hear Pattern</button>
        </div>

        <div class="bl-pattern-card ${level.id === 'level-2' ? 'bl-pattern-bridge' : ''}">
          <span>${level.id === 'level-2' ? 'Bridge Pattern' : 'Pattern'}</span>
          <strong>${esc(lesson.pattern)}</strong>
          <em>${esc(lesson.patternPinyin)}</em>
        </div>

        <div class="bl-tabs" role="tablist" aria-label="Lesson sections">
          ${['learn','story','dialogue','exercise'].map(tab => `<button type="button" class="${(state.tab || 'learn') === tab ? 'active' : ''}" data-bl-action="tab" data-tab="${tab}">${tab}</button>`).join('')}
        </div>
        <div class="bl-panel">${renderPanel(level, lesson, index, completeText)}</div>
      </article>`;
  }

  function renderPanel(level, lesson, index, completeText) {
    const tab = state.tab || 'learn';
    if (tab === 'story') return renderStory(lesson);
    if (tab === 'dialogue') return renderDialogue(lesson);
    if (tab === 'exercise') return renderExercise(level, lesson, index, completeText);
    return renderLearn(lesson);
  }

  function renderLearn(lesson) {
    return `<div class="bl-word-grid">
      ${lesson.words.map(w => `
        <button type="button" class="bl-word-card" data-bl-action="speak" data-text="${esc(w.zh)}">
          <span>${esc(w.zh)}</span><strong>${esc(w.pinyin)}</strong><em>${esc(w.english)}</em>
        </button>`).join('')}
    </div>`;
  }

  function renderStory(lesson) {
    return `<div class="bl-story-card">
      <div class="bl-story-toolbar"><strong>Mini Story</strong><button type="button" class="btn btn-ghost btn-sm" data-bl-action="speak-story">Play All</button></div>
      ${lesson.story.map(line => `
        <div class="bl-story-line">
          <button type="button" data-bl-action="speak" data-text="${esc(line.zh)}">${esc(line.zh)}</button>
          <span>${esc(line.pinyin)}</span><small>${esc(line.english)}</small>
        </div>`).join('')}
    </div>`;
  }

  function renderDialogue(lesson) {
    return `<div class="bl-dialogue-card">
      ${lesson.dialogue.map(line => `
        <div class="bl-dialogue-line speaker-${line.speaker}">
          <b>${esc(line.speaker)}</b>
          <button type="button" data-bl-action="speak" data-text="${esc(line.zh)}">${esc(line.zh)}</button>
          <span>${esc(line.pinyin)}</span>
          <small>${esc(line.english)}</small>
        </div>`).join('')}
    </div>`;
  }

  function renderExercise(level, lesson, index, completeText) {
    const word = lesson.words[0];
    const distractors = level.lessons.flatMap(l => l.words).filter(w => w.english !== word.english).slice(index + 3, index + 6).map(w => w.english);
    const options = [word.english, ...distractors].slice(0,4).sort(() => Math.random() - 0.5);
    const sentence = lesson.story[0];
    return `<div class="bl-exercise-card">
      <div class="bl-exercise-head"><span>${level.id === 'level-2' ? 'Bridge Check' : 'Micro Check'}</span><strong>${level.id === 'level-2' ? 'Can you understand the harder sentence?' : "Can you recognize today's key word?"}</strong></div>
      <button type="button" class="bl-exercise-prompt" data-bl-action="speak" data-text="${esc(word.zh)}">${esc(word.zh)}<small>${esc(word.pinyin)}</small></button>
      <div class="bl-answer-grid">
        ${options.map(opt => `<button type="button" data-bl-action="answer" data-answer="${esc(opt)}" data-correct="${esc(word.english)}">${esc(opt)}</button>`).join('')}
      </div>
      <div class="bl-sentence-check">
        <strong>Sentence meaning</strong>
        <p>${esc(sentence.zh)}</p>
        <small>${esc(sentence.pinyin)}</small>
        <em>${esc(sentence.english)}</em>
      </div>
      <div id="bl-feedback" class="bl-feedback">Answer the word, then mark the lesson complete.</div>
      <button type="button" class="btn btn-primary" data-bl-action="complete" data-level="${level.id}" data-index="${index}">${esc(completeText)}</button>
    </div>`;
  }

  function bind(container) {
    container.querySelector('.beginner-launchpad')?.addEventListener('click', event => {
      const btn = event.target.closest('[data-bl-action]');
      if (!btn) return;
      const action = btn.dataset.blAction;
      const routeState = getRouteState();
      state.level = routeState.levelId;
      if (routeState.lessonIndex !== null) state.lesson = routeState.lessonIndex;
      if (action === 'tab') { state.tab = btn.dataset.tab || 'learn'; saveState(); render(container); }
      if (action === 'speak') speak(btn.dataset.text || btn.textContent.trim());
      if (action === 'speak-story') getLevel(state.level).lessons[state.lesson].story.forEach((line, i) => setTimeout(() => speak(line.zh), i * 1300));
      if (action === 'answer') {
        const ok = btn.dataset.answer === btn.dataset.correct;
        const fb = container.querySelector('#bl-feedback');
        if (fb) fb.textContent = ok ? 'Correct. Good, now read the sentence aloud.' : `Not yet. Correct answer: ${btn.dataset.correct}`;
        btn.classList.add(ok ? 'correct' : 'wrong');
      }
      if (action === 'complete') completeLesson(btn.dataset.level || state.level, Number(btn.dataset.index || state.lesson));
    });
  }

  return { render };
})();
