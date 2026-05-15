/* ═══════════════════════════════════════════════════════════════
   playground.js — Extreme Beginner & Character Playgrounds
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const PlaygroundModule = (() => {

  let playgroundData = null;
  let currentLesson = null;
  let currentStep = 0;
  let sessionVocab = [];

  async function init() {
    if (!playgroundData) {
      try {
        const res = await fetch('data/playground_content.json');
        playgroundData = await res.json();
      } catch (e) {
        console.error("Failed to load playground data", e);
        playgroundData = [];
      }
    }
  }

  async function render(container) {
    await init();
    container.innerHTML = `
      <div class="page-header">
        <h2>Extreme Beginner Playground</h2>
        <p>Baby-style repetitive learning. Master the foundations through intense recognition drills.</p>
      </div>
      
      <div class="pg-grid" id="pg-list">
        ${playgroundData.map(pg => {
          const completedCount = pg.lessons.filter(l => App.state.progress.playground?.[l.id]).length;
          const isDone = completedCount === pg.lessons.length;
          return `
            <div class="pg-card ${isDone ? 'pg-complete' : ''}" onclick="PlaygroundModule.openPlayground('${pg.id}')">
              <div class="pg-card-icon">${isDone ? '🏆' : '🎠'}</div>
              <div class="pg-card-content">
                <h3>${pg.title}</h3>
                <p>${pg.subtitle}</p>
                <div class="pg-lesson-count">${completedCount} / ${pg.lessons.length} Lessons</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function openPlayground(id) {
    const pg = playgroundData.find(p => p.id === id);
    if (!pg) return;

    const container = document.getElementById('page-content');
    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-ghost btn-sm mb-12" onclick="PlaygroundModule.render(document.getElementById('page-content'))">← Back</button>
        <h2>${pg.title}</h2>
        <p>${pg.subtitle}</p>
      </div>
      
      <div class="pg-lessons-list">
        ${pg.lessons.map((lesson, idx) => {
          const isDone = App.state.progress.playground?.[lesson.id];
          return `
            <div class="pg-lesson-item ${isDone ? 'done' : ''}" onclick="PlaygroundModule.startLesson('${pg.id}', '${lesson.id}')">
              <div class="pg-lesson-num">${isDone ? '✓' : idx + 1}</div>
              <div class="pg-lesson-info">
                <h4>${lesson.title}</h4>
                <p>${lesson.vocab.length} Words • 10x Repetition</p>
              </div>
              <div class="pg-lesson-status">${isDone ? 'Completed' : '➡️'}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function startLesson(pgId, lessonId) {
    const pg = playgroundData.find(p => p.id === pgId);
    const lesson = pg.lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    currentLesson = lesson;
    currentStep = 0;
    
    // Create a repetitive session
    sessionVocab = [];
    const baseVocab = lesson.vocab;
    const reps = lesson.repetition_factor || 10;

    // Sequence: 
    // 1. Learn (all)
    // 2. Repetitive drills (shuffled sets)
    // 3. Challenge Quiz (normal chapter style)

    // Phase 1: Direct Learning
    baseVocab.forEach(v => sessionVocab.push({ ...v, mode: 'learn' }));

    // Phase 2: Repetitive drills
    for (let i = 0; i < reps; i++) {
      const shuffled = [...baseVocab].sort(() => Math.random() - 0.5);
      shuffled.forEach(v => {
        // Alternating between recognition and audio
        const mode = Math.random() > 0.5 ? 'recog' : 'audio';
        sessionVocab.push({ ...v, mode });
      });
    }

    // Phase 3: Challenge Quiz
    // Mix of multiple choice and simple translation
    const quizCount = 10;
    for (let i = 0; i < quizCount; i++) {
      const v = baseVocab[Math.floor(Math.random() * baseVocab.length)];
      sessionVocab.push({ ...v, mode: 'quiz' });
    }

    renderLessonStep();
  }

  function renderLessonStep() {
    if (currentStep >= sessionVocab.length) {
      renderCompletion();
      return;
    }

    const item = sessionVocab[currentStep];
    const container = document.getElementById('page-content');
    const progress = Math.round((currentStep / sessionVocab.length) * 100);

    container.innerHTML = `
      <div class="pg-lesson-header">
        <div class="pg-progress-container">
          <div class="pg-progress-bar" style="width: ${progress}%"></div>
        </div>
        <div class="pg-step-meta">
          <span>${getPhaseLabel(item.mode)}</span>
          <span>Step ${currentStep + 1} / ${sessionVocab.length}</span>
        </div>
      </div>

      <div class="pg-drill-container">
        ${renderDrill(item)}
        ${item.mode === 'learn' ? VoicePractice.renderVoiceModule('pg-voice') : ''}
      </div>
    `;

    if (item.mode === 'learn') {
      setTimeout(() => TTS.speak(item.hanzi), 500);
    }
  }

  function getPhaseLabel(mode) {
    if (mode === 'learn') return '🌱 Phase 1: Learning';
    if (mode === 'quiz') return '🔥 Phase 3: Challenge';
    return '🔄 Phase 2: Repetition';
  }

  function renderDrill(item) {
    switch (item.mode) {
      case 'learn':
        return `
          <div class="pg-drill-learn">
            <div class="pg-big-hanzi" onclick="TTS.speak('${item.hanzi}')">${item.hanzi}</div>
            <div class="pg-big-pinyin">${item.pinyin}</div>
            <div class="pg-big-def">${item.definition}</div>
            <button class="btn btn-primary btn-lg mt-24" onclick="PlaygroundModule.nextStep()">Next Word</button>
          </div>
        `;
      case 'recog':
        const recogOpts = generateOptions(item);
        return `
          <div class="pg-drill-quiz">
            <div class="pg-quiz-q">What is the meaning?</div>
            <div class="pg-big-hanzi mb-24">${item.hanzi}</div>
            <div class="pg-options-grid">
              ${recogOpts.map(opt => `
                <button class="btn btn-outline pg-opt-btn" onclick="PlaygroundModule.checkAnswer('${opt.definition}', '${item.definition}', this)">
                  ${opt.definition}
                </button>
              `).join('')}
            </div>
          </div>
        `;
      case 'audio':
        const audioOpts = generateOptions(item);
        return `
          <div class="pg-drill-quiz">
            <div class="pg-quiz-q">Select the character you hear:</div>
            <div class="pg-audio-trigger mb-24" onclick="TTS.speak('${item.hanzi}')">🔊 Replay</div>
            <div class="pg-options-grid">
              ${audioOpts.map(opt => `
                <button class="btn btn-outline pg-opt-btn pg-hanzi-opt" onclick="PlaygroundModule.checkAnswer('${opt.hanzi}', '${item.hanzi}', this)">
                  ${opt.hanzi}
                </button>
              `).join('')}
            </div>
          </div>
        `;
      case 'quiz':
        const quizType = Math.random() > 0.5 ? 'mc' : 'trans';
        if (quizType === 'mc') {
          const mcOpts = generateOptions(item);
          return `
            <div class="pg-drill-quiz challenge">
              <div class="pg-quiz-label">Challenge: Multiple Choice</div>
              <div class="pg-big-hanzi mb-12">${item.hanzi}</div>
              <div class="pg-big-pinyin mb-24">${item.pinyin}</div>
              <div class="pg-options-grid">
                ${mcOpts.map(opt => `
                  <button class="btn btn-outline pg-opt-btn" onclick="PlaygroundModule.checkAnswer('${opt.definition}', '${item.definition}', this)">
                    ${opt.definition}
                  </button>
                `).join('')}
              </div>
            </div>
          `;
        } else {
          return `
            <div class="pg-drill-quiz challenge">
              <div class="pg-quiz-label">Challenge: Recognition</div>
              <div class="pg-big-pinyin mb-24">${item.pinyin}</div>
              <p class="mb-12">Meaning: <strong>${item.definition}</strong></p>
              <div class="pg-options-grid">
                ${generateOptions(item).map(opt => `
                  <button class="btn btn-outline pg-opt-btn pg-hanzi-opt" onclick="PlaygroundModule.checkAnswer('${opt.hanzi}', '${item.hanzi}', this)">
                    ${opt.hanzi}
                  </button>
                `).join('')}
              </div>
            </div>
          `;
        }
    }
  }

  function generateOptions(correctItem) {
    const others = currentLesson.vocab.filter(v => v.hanzi !== correctItem.hanzi);
    const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);
    shuffled.push(correctItem);
    return shuffled.sort(() => Math.random() - 0.5);
  }

  function checkAnswer(selected, correct, btn) {
    if (selected === correct) {
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-success');
      setTimeout(() => nextStep(), 600);
    } else {
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-error');
      // Shake effect
      btn.style.animation = 'shake 0.4s';
      setTimeout(() => {
        btn.style.animation = '';
        btn.classList.remove('btn-error');
        btn.classList.add('btn-outline');
      }, 400);
    }
  }

  function nextStep() {
    currentStep++;
    renderLessonStep();
  }

  function renderCompletion() {
    // Save progress
    if (!App.state.progress.playground) App.state.progress.playground = {};
    App.state.progress.playground[currentLesson.id] = true;
    App.saveProgress();

    // SRS Bridge: Add lesson vocab to SRS
    if (typeof SRS !== 'undefined') {
      currentLesson.vocab.forEach(v => {
        // We use a high quality to indicate initial mastery from the playground
        SRS.review(v.hanzi, 'GOOD', 'novice');
      });
    }

    const container = document.getElementById('page-content');
    container.innerHTML = `
      <div class="pg-completion">
        <div class="pg-done-icon">🎉</div>
        <h2>Lesson Complete!</h2>
        <p>You've repeated these characters enough to start building permanent memory.</p>
        <button class="btn btn-primary mt-24" onclick="PlaygroundModule.render(document.getElementById('page-content'))">Back to Playground</button>
      </div>
    `;
    App.logActivity('🎯', `Completed Beginner Playground lesson: ${currentLesson.title}`);
  }

  // ─── Character Playground ───────────────────────────────────────────────────
  
  const FORMATIONS = [
    { parts: ['人', '人'], result: '从', meaning: 'Follow' },
    { parts: ['从', '人'], result: '众', meaning: 'Crowd' },
    { parts: ['木', '木'], result: '林', meaning: 'Woods' },
    { parts: ['林', '木'], result: '森', meaning: 'Forest' },
    { parts: ['日', '月'], result: '明', meaning: 'Bright' },
    { parts: ['女', '子'], result: '好', meaning: 'Good' },
    { parts: ['口', '口'], result: '回', meaning: 'Return' },
    { parts: ['火', '火'], result: '炎', meaning: 'Flame' },
    { parts: ['火', '炎'], result: '焱', meaning: 'Blaze' },
    { parts: ['门', '口'], result: '问', meaning: 'Ask' },
    { parts: ['门', '日'], result: '间', meaning: 'Between' },
    { parts: ['门', '木'], result: '闲', meaning: 'Leisure' },
    { parts: ['纟', '工'], result: '红', meaning: 'Red' },
    { parts: ['氵', '青'], result: '清', meaning: 'Clear' },
    { parts: ['日', '生'], result: '星', meaning: 'Star' },
    { parts: ['目', '目'], result: '眏', meaning: 'To gaze' },
    { parts: ['手', '目'], result: '看', meaning: 'Watch/Look' },
    { parts: ['小', '大'], result: '尖', meaning: 'Sharp/Pointed' },
    { parts: ['不', '正'], result: '歪', meaning: 'Crooked' },
    { parts: ['白', '水'], result: '泉', meaning: 'Spring (water)' },
    { parts: ['山', '石'], result: '岩', meaning: 'Rock/Cliff' },
    { parts: ['田', '力'], result: '男', meaning: 'Man/Male' },
    { parts: ['人', '木'], result: '休', meaning: 'Rest' },
    { parts: ['口', '鸟'], result: '鸣', meaning: 'Chirp' },
    { parts: ['心', '亡'], result: '忘', meaning: 'Forget' },
    { parts: ['女', '家'], result: '安', meaning: 'Safe/Peace' },
    { parts: ['豕', '宀'], result: '家', meaning: 'Home/Pig under roof' },
    { parts: ['日', '免'], result: '晚', meaning: 'Evening' }
  ];

  async function renderCharPlayground(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Character Playground</h2>
        <p>Explore how basic components combine to form complex characters.</p>
      </div>

      <div class="cp-tabs">
        <button class="cp-tab active" onclick="PlaygroundModule.switchCPTab('decomp')">Decomposition</button>
        <button class="cp-tab" onclick="PlaygroundModule.switchCPTab('lab')">Formation Lab</button>
        <button class="cp-tab" onclick="PlaygroundModule.switchCPTab('game')">Formation Game</button>
      </div>

      <div id="cp-tab-content">
        ${renderDecompTab()}
      </div>
    `;
  }

  function renderDecompTab() {
    return `
      <div class="cp-container">
        <div class="cp-search">
          <input type="text" class="input" id="cp-input" placeholder="Enter a character (e.g. 森, 好, 媽)...">
          <button class="btn btn-primary" onclick="PlaygroundModule.decompose()">Decompose</button>
        </div>

        <div id="cp-result" class="cp-result-area">
          <div class="empty-state">
            <p>Enter a character above to see its "building blocks".</p>
          </div>
        </div>

        <div class="cp-basic-blocks mt-32">
          <h3>Common Building Blocks</h3>
          <div class="cp-block-grid">
            ${['人','口','木','水','火','土','日','月','心','手','女','子','门','纟'].map(c => `
              <div class="cp-block" onclick="PlaygroundModule.showCombinations('${c}')">${c}</div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderLabTab() {
    return `
      <div class="cp-container">
        <h3>Character Formation Lab</h3>
        <p class="text-muted mb-24">Watch how simple characters combine to create new meanings.</p>
        
        <div class="cp-lab-grid">
          ${FORMATIONS.map(f => `
            <div class="cp-lab-item">
              <div class="cp-lab-parts">
                ${f.parts.map(p => `<span class="cp-lab-part">${p}</span>`).join('<span class="cp-plus">+</span>')}
              </div>
              <div class="cp-lab-arrow">→</div>
              <div class="cp-lab-result" onclick="showCharModal('${f.result}')">
                <div class="cp-lr-char">${f.result}</div>
                <div class="cp-lr-mean">${f.meaning}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderGameTab() {
    const challenge = FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];
    const pool = new Set(challenge.parts);
    while (pool.size < 8) {
      pool.add(FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)].parts[0]);
    }
    const shuffledPool = Array.from(pool).sort(() => Math.random() - 0.5);
    window._cpGameTarget = challenge;
    window._cpGameSelected = [];

    return `
      <div class="cp-container cp-game-view">
        <div class="cp-game-header">
          <h3>Build the Character!</h3>
          <p>Select the components that form: <strong class="text-accent" style="font-size:1.5rem">「${challenge.result}」</strong></p>
          <div class="text-muted text-small">Meaning: ${challenge.meaning}</div>
        </div>
        <div class="cp-built-area" id="cp-game-built">
          <span class="text-muted">Select components below...</span>
        </div>
        <div class="cp-game-pool">
          ${shuffledPool.map(p => `<button class="cp-block cp-game-block" onclick="PlaygroundModule.cpGameSelect('${p}', this)">${p}</button>`).join('')}
        </div>
        <div id="cp-game-feedback" class="quiz-feedback"></div>
        <div class="flex gap-12 justify-center mt-24">
          <button class="btn btn-primary" onclick="PlaygroundModule.cpGameCheck()">Check Formation</button>
          <button class="btn btn-ghost" onclick="PlaygroundModule.switchCPTab('game')">New Character 🔄</button>
        </div>
      </div>
    `;
  }

  function cpGameSelect(part, btn) {
    if (btn.classList.contains('selected')) {
      btn.classList.remove('selected');
      window._cpGameSelected = window._cpGameSelected.filter(p => p !== part);
    } else {
      btn.classList.add('selected');
      window._cpGameSelected.push(part);
    }
    const area = document.getElementById('cp-game-built');
    if (area) {
      area.innerHTML = window._cpGameSelected.map(p => `<span class="cp-built-part">${p}</span>`).join(' + ') || '<span class="text-muted">Select components below...</span>';
    }
  }

  function cpGameCheck() {
    const target = window._cpGameTarget;
    const selected = [...window._cpGameSelected].sort();
    const correct = [...target.parts].sort();
    const feedback = document.getElementById('cp-game-feedback');
    const isCorrect = JSON.stringify(selected) === JSON.stringify(correct);
    feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'wrong'} show`;
    feedback.innerHTML = isCorrect ? `✓ Perfect! <strong>${target.parts.join(' + ')} = ${target.result}</strong>` : `✗ Not quite. Try again!`;
    if (isCorrect) App.logActivity('🧩', `Solved character puzzle: ${target.result}`);
  }

  function switchCPTab(tab) {
    const content = document.getElementById('cp-tab-content');
    const tabs = document.querySelectorAll('.cp-tab');
    tabs.forEach(t => t.classList.toggle('active', t.textContent.toLowerCase().includes(tab)));
    if (tab === 'decomp') content.innerHTML = renderDecompTab();
    else if (tab === 'lab') content.innerHTML = renderLabTab();
    else content.innerHTML = renderGameTab();
  }

  async function decompose() {
    const input = document.getElementById('cp-input').value.trim();
    if (!input) return;
    const char = input[0];
    const resultArea = document.getElementById('cp-result');
    resultArea.innerHTML = '<div class="spinner"></div>';
    const charData = await API.getCharacter(char);
    if (!charData) {
      resultArea.innerHTML = `<div class="empty-state"><p>Character not found in library.</p></div>`;
      return;
    }
    resultArea.innerHTML = `
      <div class="cp-decomp-view">
        <div class="cp-main-char">
          <div class="cp-char-big">${char}</div>
          <div class="cp-char-meta">${charData.pinyin} • ${charData.definition}</div>
        </div>
        <div class="cp-arrow">⬇️ decomposes into</div>
        <div class="cp-parts">
          ${(charData.radicals || []).map(r => `
            <div class="cp-part-item">
              <div class="cp-part-char">${r}</div>
              <div class="cp-part-label">Radical</div>
            </div>`).join('')}
          <div class="cp-part-plus">+</div>
          <div class="cp-part-item"><div class="cp-part-char">?</div><div class="cp-part-label">Other</div></div>
        </div>
      </div>`;
  }

  async function showCombinations(block) {
    const resultArea = document.getElementById('cp-result');
    resultArea.innerHTML = '<div class="spinner"></div>';
    const allChars = await API.getCharacters({ limit: 2000 });
    const combinations = allChars.data.filter(c => c.radicals && c.radicals.includes(block));
    resultArea.innerHTML = `
      <div class="cp-combos">
        <h3>Characters containing 「${block}」</h3>
        <div class="cp-combo-grid">
          ${combinations.slice(0, 24).map(c => `
            <div class="cp-combo-item" onclick="showCharModal('${c.hanzi}')">
              <div class="cp-combo-hanzi">${c.hanzi}</div>
              <div class="cp-combo-pinyin">${c.pinyin}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  return {
    render,
    renderCharPlayground,
    openPlayground,
    startLesson,
    nextStep,
    checkAnswer,
    decompose,
    showCombinations,
    switchCPTab,
    cpGameSelect,
    cpGameCheck
  };
})();
