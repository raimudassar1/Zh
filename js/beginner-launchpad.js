
'use strict';

window.BeginnerLaunchpadModule = (() => {
  const STORAGE_KEY = 'beginnerLaunchpadProgress';
  let data = null;
  let state = { lesson: 0, level: 'level-1', tab: 'learn', completed: [], completedByLevel: {}, displayByLevel: {}, score: 0, total: 0 };

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
  const lessonPath = (levelId, index) => {
    if (levelId === 'level-3') return `/beginner-launchpad/level-3/${String(index + 1).padStart(2, '0')}`;
    if (levelId === 'level-2') return `/beginner-launchpad/level-2/${String(index + 1).padStart(2, '0')}`;
    return `/beginner-launchpad/${String(index + 1).padStart(2, '0')}`;
  };
  const testPath = () => '/beginner-launchpad/level-3/test';

  function loadState() {
    try { state = { ...state, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')) }; } catch {}
    state.completed = Array.isArray(state.completed) ? state.completed : [];
    state.completedByLevel = state.completedByLevel && typeof state.completedByLevel === 'object' ? state.completedByLevel : {};
    state.displayByLevel = state.displayByLevel && typeof state.displayByLevel === 'object' ? state.displayByLevel : {};
    state.completedByLevel['level-1'] = Array.isArray(state.completedByLevel['level-1']) ? state.completedByLevel['level-1'] : state.completed;
    state.completedByLevel['level-2'] = Array.isArray(state.completedByLevel['level-2']) ? state.completedByLevel['level-2'] : [];
    state.completedByLevel['level-3'] = Array.isArray(state.completedByLevel['level-3']) ? state.completedByLevel['level-3'] : [];
    state.displayByLevel['level-1'] = state.displayByLevel['level-1'] || { pinyin: true, english: true };
    state.displayByLevel['level-2'] = state.displayByLevel['level-2'] || { pinyin: true, english: true };
    state.displayByLevel['level-3'] = state.displayByLevel['level-3'] || { pinyin: false, english: true };
  }

  function saveState() {
    state.completed = state.completedByLevel?.['level-1'] || [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async function ensureData() {
    if (data) return data;
    const [levelOneRes, levelTwoRes, levelThreeRes] = await Promise.all([
      fetch('data/beginner_launchpad.json', { cache: 'no-store' }),
      fetch('data/beginner_launchpad_level2.json', { cache: 'no-store' }),
      fetch('data/beginner_launchpad_level3.json', { cache: 'no-store' })
    ]);
    const levelOne = await levelOneRes.json();
    const levelTwo = await levelTwoRes.json();
    const levelThree = await levelThreeRes.json();
    data = {
      title: 'Beginner Launchpad',
      totalWords: (levelOne.totalWords || 0) + (levelTwo.totalWords || 0) + (levelThree.totalWords || 0),
      levels: [
        { id: 'level-1', label: 'Level 1', badge: 'First 100', kicker: 'Absolute beginner', desc: 'First exposure: short words, tiny stories, and survival dialogues.', ...levelOne },
        { id: 'level-2', label: 'Level 2', badge: 'Functional Missions', kicker: 'Use Chinese', desc: 'Real beginner situations: asking for help, ordering, shopping, transport, plans, feelings, and repair phrases.', ...levelTwo },
        { id: 'level-3', label: 'Level 3', badge: 'Novice prep', kicker: 'Scene missions', desc: 'Scene-based reading/listening missions with permanent pictures, matched vocabulary, no-pinyin stories, and a Novice challenge.', ...levelThree }
      ]
    };
    return data;
  }

  function getLevel(levelId = state.level || 'level-1') {
    return data.levels.find(level => level.id === levelId) || data.levels[0];
  }

  function getRouteState() {
    const hash = window.location.hash || '';
    if (hash.match(/#\/beginner-launchpad\/level-3\/test/)) return { levelId: 'level-3', lessonIndex: null, isTest: true };
    const levelThreeMatch = hash.match(/#\/beginner-launchpad\/level-3\/(\d+)/);
    if (levelThreeMatch) return { levelId: 'level-3', lessonIndex: clampLessonIndex('level-3', Number(levelThreeMatch[1]) - 1) };
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

  function getDisplay(levelId) {
    return state.displayByLevel[levelId] || { pinyin: levelId !== 'level-3', english: true };
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
    if (routeState.isTest) {
      state.level = 'level-3';
      saveState();
      container.innerHTML = `<div class="beginner-launchpad bl-focused">${renderNoviceTest(activeLevel)}</div>`;
      bind(container);
      return;
    }
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
    const activeLevel = getLevel(activeLevelId);
    return `
      <section class="bl-hero">
        <div>
          <div class="bl-kicker">Beginner Bridge Mode</div>
          <h2>Beginner Launchpad</h2>
          <p>Three beginner tracks with real jumps: Level 1 recognizes survival Chinese, Level 2 uses Chinese in everyday missions, and Level 3 trains no-pinyin scene reading before course books.</p>
          <div class="bl-actions">
            <a class="btn btn-primary" href="#${lessonPath(activeLevelId, activeIndex)}">Continue Current Track</a>
            <a class="btn btn-ghost" href="#${lessonPath('level-2', Math.max(0, getCompleted('level-2').length))}">Start Level 2</a>
            <a class="btn btn-ghost" href="#${lessonPath('level-3', Math.max(0, getCompleted('level-3').length))}">Start Level 3</a>
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
            <button type="button" class="bl-level-card ${level.id === activeLevelId ? 'active' : ''}" data-bl-action="select-level" data-level="${level.id}">
              <span>${esc(level.kicker)}</span>
              <strong>${esc(level.label)}</strong>
              <small>${esc(level.desc)}</small>
              <em>${getCompleted(level.id).length}/${level.lessons.length} done</em>
              ${level.id === 'level-3' ? `<b class="bl-level-test">${level.noviceTest?.questionCount || 0} question test</b>` : ''}
            </button>`).join('')}
        </div>
        <div class="bl-tier-block bl-tier-block-active">
          <div class="bl-tier-title">
            <span>${esc(activeLevel.badge)}</span>
            <strong>${esc(activeLevel.label)}</strong>
            <a class="btn btn-primary btn-sm" href="#${lessonPath(activeLevel.id, Math.max(0, Math.min(getCompleted(activeLevel.id).length, activeLevel.lessons.length - 1)))}">Start this level</a>
          </div>
          <div class="bl-map-grid">
            ${activeLevel.lessons.map((lesson, i) => renderMapCard(activeLevel, lesson, i, i === activeIndex)).join('')}
          </div>
        </div>
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
        ${level.id === 'level-3' ? `<a class="btn btn-primary bl-test-shortcut" href="#${testPath()}">Open Novice No-Pinyin Test</a>` : ''}
        ${renderLesson(level, lesson, index)}
      </main>`;
  }

  function renderLesson(level, lesson, index) {
    const completeText = level.id === 'level-3' ? 'Complete Level 3 Lesson' : level.id === 'level-2' ? 'Complete Level 2 Lesson' : 'Complete Lesson';
    const display = getDisplay(level.id);
    const hidePinyin = (level.hidePinyin || lesson.hidePinyin) && !display.pinyin;
    const showEnglish = display.english;
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

        ${lesson.image ? renderPicturePanel(lesson) : ''}

        ${renderDisplayControls(level, display)}

        <div class="bl-pattern-card ${level.id !== 'level-1' ? 'bl-pattern-bridge' : ''}">
          <span>${level.id === 'level-2' ? 'Bridge Pattern' : 'Pattern'}</span>
          <strong>${esc(lesson.pattern)}</strong>
          ${hidePinyin || !lesson.patternPinyin ? '' : `<em>${esc(lesson.patternPinyin)}</em>`}
        </div>

        <div class="bl-tabs" role="tablist" aria-label="Lesson sections">
          ${['learn','story','dialogue','exercise'].map(tab => `<button type="button" class="${(state.tab || 'learn') === tab ? 'active' : ''}" data-bl-action="tab" data-tab="${tab}">${tab}</button>`).join('')}
        </div>
        <div class="bl-panel">${renderPanel(level, lesson, index, completeText, hidePinyin, showEnglish)}</div>
      </article>`;
  }

  function renderDisplayControls(level, display) {
    return `<div class="bl-display-controls" aria-label="Display options">
      <span>Display</span>
      <button type="button" class="${display.pinyin ? 'active' : ''}" data-bl-action="toggle-display" data-display="pinyin">Pinyin</button>
      <button type="button" class="${display.english ? 'active' : ''}" data-bl-action="toggle-display" data-display="english">English</button>
      ${level.id === 'level-3' ? '<em>Level 3 starts without pinyin.</em>' : ''}
    </div>`;
  }

  function renderPanel(level, lesson, index, completeText, hidePinyin = false, showEnglish = true) {
    const tab = state.tab || 'learn';
    if (tab === 'story') return renderStory(lesson, hidePinyin, showEnglish);
    if (tab === 'dialogue') return renderDialogue(lesson, hidePinyin, showEnglish);
    if (tab === 'exercise') return renderExercise(level, lesson, index, completeText, hidePinyin, showEnglish);
    return renderLearn(lesson, hidePinyin, showEnglish);
  }

  function renderPicturePanel(lesson) {
    return `<section class="bl-picture-panel">
      <img src="${esc(lesson.image)}" alt="${esc(lesson.imageDescription || lesson.title)}" loading="lazy">
      <div><span>Picture Description</span><strong>${esc(lesson.imageDescription || '')}</strong><p>${esc(lesson.pictureTask || '')}</p></div>
    </section>`;
  }

  function renderLearn(lesson, hidePinyin = false, showEnglish = true) {
    return `<div class="bl-word-grid">
      ${lesson.words.map(w => `
        <button type="button" class="bl-word-card" data-bl-action="speak" data-text="${esc(w.zh)}">
          <span>${esc(w.zh)}</span>${hidePinyin || !w.pinyin ? '' : `<strong>${esc(w.pinyin)}</strong>`}${showEnglish ? `<em>${esc(w.english)}</em>` : ''}
        </button>`).join('')}
    </div>`;
  }

  function renderStory(lesson, hidePinyin = false, showEnglish = true) {
    return `<div class="bl-story-card">
      <div class="bl-story-toolbar"><strong>Mini Story</strong><button type="button" class="btn btn-ghost btn-sm" data-bl-action="speak-story">Play All</button></div>
      ${lesson.story.map(line => `
        <div class="bl-story-line">
          <button type="button" data-bl-action="speak" data-text="${esc(line.zh)}">${esc(line.zh)}</button>
          ${hidePinyin || !line.pinyin ? '' : `<span>${esc(line.pinyin)}</span>`}${showEnglish ? `<small>${esc(line.english)}</small>` : ''}
        </div>`).join('')}
    </div>`;
  }

  function renderDialogue(lesson, hidePinyin = false, showEnglish = true) {
    return `<div class="bl-dialogue-card">
      ${lesson.dialogue.map(line => `
        <div class="bl-dialogue-line speaker-${line.speaker}">
          <b>${esc(line.speaker)}</b>
          <button type="button" data-bl-action="speak" data-text="${esc(line.zh)}">${esc(line.zh)}</button>
          ${hidePinyin || !line.pinyin ? '' : `<span>${esc(line.pinyin)}</span>`}
          ${showEnglish ? `<small>${esc(line.english)}</small>` : ''}
        </div>`).join('')}
    </div>`;
  }

  function renderExercise(level, lesson, index, completeText, hidePinyin = false, showEnglish = true) {
    const word = lesson.words[0];
    const distractors = level.lessons.flatMap(l => l.words).filter(w => w.english !== word.english).slice(index + 3, index + 6).map(w => w.english);
    const options = [word.english, ...distractors].slice(0,4).sort(() => Math.random() - 0.5);
    const sentence = lesson.story[0];
    return `<div class="bl-exercise-card">
      <div class="bl-exercise-head"><span>${level.id === 'level-2' ? 'Bridge Check' : 'Micro Check'}</span><strong>${level.id === 'level-2' ? 'Can you understand the harder sentence?' : "Can you recognize today's key word?"}</strong></div>
      <button type="button" class="bl-exercise-prompt" data-bl-action="speak" data-text="${esc(word.zh)}">${esc(word.zh)}${hidePinyin || !word.pinyin ? '' : `<small>${esc(word.pinyin)}</small>`}</button>
      <div class="bl-answer-grid">
        ${options.map(opt => `<button type="button" data-bl-action="answer" data-answer="${esc(opt)}" data-correct="${esc(word.english)}">${esc(opt)}</button>`).join('')}
      </div>
      <div class="bl-sentence-check">
        <strong>Sentence meaning</strong>
        <p>${esc(sentence.zh)}</p>
        <small>${esc(sentence.pinyin)}</small>
        ${showEnglish ? `<em>${esc(sentence.english)}</em>` : ''}
      </div>
      <div id="bl-feedback" class="bl-feedback">Answer the word, then mark the lesson complete.</div>
      <button type="button" class="btn btn-primary" data-bl-action="complete" data-level="${level.id}" data-index="${index}">${esc(completeText)}</button>
    </div>`;
  }


  function renderNoviceTest(level) {
    const test = level.noviceTest || { questions: [] };
    return `
      <section class="bl-lesson-page-head">
        <a class="btn btn-ghost" href="#/beginner-launchpad">All Topics</a>
        <a class="btn btn-ghost" href="#${lessonPath('level-3', 0)}">Back to Level 3</a>
      </section>
      <main class="bl-focused-main bl-test-main">
        <article class="bl-lesson bl-test-card">
          <div class="bl-lesson-head">
            <div>
              <span class="bl-kicker">Novice readiness</span>
              <h3>${esc(test.title || 'Novice No-Pinyin Challenge')}</h3>
              <p>${esc(test.description || '')}</p>
            </div>
            <strong class="bl-test-count">${test.questions.length} questions</strong>
          </div>
          <div class="bl-test-sections">
            ${['Chinese to meaning','Reading','Listening','Tone listening','Meaning to Chinese'].map(skill => `<span>${skill}</span>`).join('')}
          </div>
          <div class="bl-test-list">
            ${test.questions.map((q, i) => renderTestQuestion(q, i)).join('')}
          </div>
        </article>
      </main>`;
  }

  function renderTestQuestion(q, index) {
    return `<section class="bl-test-question" data-question-id="${esc(q.id)}">
      <div class="bl-test-q-head"><span>${String(index + 1).padStart(3, '0')}</span><strong>${esc(q.skill || q.type)}</strong></div>
      <p>${esc(q.prompt)}</p>
      ${q.audioText ? `<button type="button" class="btn btn-ghost btn-sm" data-bl-action="speak" data-text="${esc(q.audioText)}">Play Audio</button>` : ''}
      <div class="bl-answer-grid">
        ${(q.options || []).map(opt => `<button type="button" data-bl-action="test-answer" data-answer="${esc(opt)}" data-correct="${esc(q.answer)}">${esc(opt)}</button>`).join('')}
      </div>
      <div class="bl-test-feedback" aria-live="polite"></div>
    </section>`;
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
      if (action === 'select-level') {
        state.level = btn.dataset.level || 'level-1';
        state.lesson = Math.max(0, Math.min(getCompleted(state.level).length, getLevel(state.level).lessons.length - 1));
        saveState();
        render(container);
      }
      if (action === 'toggle-display') {
        const key = btn.dataset.display;
        const display = getDisplay(state.level);
        display[key] = !display[key];
        state.displayByLevel[state.level] = display;
        saveState();
        render(container);
      }
      if (action === 'speak') speak(btn.dataset.text || btn.textContent.trim());
      if (action === 'speak-story') getLevel(state.level).lessons[state.lesson].story.forEach((line, i) => setTimeout(() => speak(line.zh), i * 1300));
      if (action === 'answer' || action === 'test-answer') {
        const ok = btn.dataset.answer === btn.dataset.correct;
        const fb = action === 'test-answer' ? btn.closest('.bl-test-question')?.querySelector('.bl-test-feedback') : container.querySelector('#bl-feedback');
        if (fb) fb.textContent = ok ? 'Correct.' : `Not yet. Correct answer: ${btn.dataset.correct}`;
        btn.classList.add(ok ? 'correct' : 'wrong');
      }
      if (action === 'complete') completeLesson(btn.dataset.level || state.level, Number(btn.dataset.index || state.lesson));
    });
  }

  return { render };
})();
