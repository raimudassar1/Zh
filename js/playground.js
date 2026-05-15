/* ═══════════════════════════════════════════════════════════════
   playground.js — 3-Volume Contemporary Chinese Course
   ═══════════════════════════════════════════════════════════════ */

'use strict';

window.PlaygroundModule = (() => {

  let currentBookData = null;
  let currentCharData = null;
  let currentBookId = 1;
  let currentChapterId = null;

  async function init() {
    if (!currentCharData) {
      try {
        const res = await fetch('data/char_playground_content.json');
        currentCharData = await res.json();
      } catch (e) {
        console.error("Failed to load character playground data", e);
        currentCharData = [];
      }
    }
  }

  async function loadBook(bookId) {
    try {
      const res = await fetch(`data/book${bookId}_content.json`);
      currentBookData = await res.json();
      currentBookId = bookId;
    } catch (e) {
      console.error(`Failed to load Book ${bookId} data`, e);
      currentBookData = [];
    }
  }

  // ── Main Entry (Book Selection) ──────────────────────────────────────────

  async function render(container) {
    await init();
    container.innerHTML = `
      <div class="page-header">
        <h2>A Course in Contemporary Chinese</h2>
        <p>A comprehensive 3-volume curriculum for mastering Mandarin in Taiwan.</p>
      </div>
      
      <div class="pg-stages">
        <div class="pg-grid">
          <div class="pg-card" onclick="window.PlaygroundModule.openBook(1)">
            <div class="pg-card-icon">📘</div>
            <div class="pg-card-content">
              <h3>Book 1: Foundations</h3>
              <p>Survival greetings, family, shopping, and arrival in Taiwan.</p>
              <div class="pg-lesson-count">15 Chapters</div>
            </div>
          </div>
          <div class="pg-card" onclick="window.PlaygroundModule.openBook(2)">
            <div class="pg-card-icon">📗</div>
            <div class="pg-card-content">
              <h3>Book 2: Daily Life</h3>
              <p>Directions, transportation, work, and local customs.</p>
              <div class="pg-lesson-count">15 Chapters</div>
            </div>
          </div>
          <div class="pg-card" onclick="window.PlaygroundModule.openBook(3)">
            <div class="pg-card-icon">📙</div>
            <div class="pg-card-content">
              <h3>Book 3: Advanced Social</h3>
              <p>Culture, trends, society, and professional fluency.</p>
              <div class="pg-lesson-count">12 Chapters</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function openBook(bookId) {
    await loadBook(bookId);
    const container = document.getElementById('page-content');
    
    const bookTitles = {
      1: "A Course in Contemporary Chinese 1",
      2: "A Course in Contemporary Chinese 2",
      3: "A Course in Contemporary Chinese 3"
    };

    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-ghost btn-sm mb-12" onclick="window.PlaygroundModule.render(document.getElementById('page-content'))">← Back to Books</button>
        <h2>${bookTitles[bookId]}</h2>
        <p>Select a chapter to begin your deep-dive practice.</p>
      </div>
      
      <div class="pg-lessons-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
        ${currentBookData.map((ch, idx) => {
          const isDone = App.state.progress.ccc_course?.[ch.id];
          return `
            <div class="pg-lesson-item ${isDone ? 'done' : ''}" style="height:auto;flex-direction:column;align-items:flex-start;padding:24px" onclick="window.PlaygroundModule.startChapter('${ch.id}')">
              <div style="display:flex;width:100%;justify-content:space-between;align-items:center;margin-bottom:12px">
                <div class="pg-lesson-num" style="background:${isDone?'var(--tone2)':'var(--accent)'}">${isDone ? '✓' : ch.chapter}</div>
                <div class="pg-lesson-status" style="font-size:0.8rem;font-weight:700;color:${isDone?'var(--tone2)':'var(--text-3)'}">${isDone ? 'COMPLETED' : 'START →'}</div>
              </div>
              <div class="pg-lesson-info">
                <h4 class="font-zh" style="font-size:1.2rem;margin-bottom:4px">${ch.title}</h4>
                <p style="font-size:0.9rem;line-height:1.4">${ch.subtitle}</p>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  async function startChapter(chId) {
    const ch = currentBookData.find(c => c.id === chId);
    if (!ch) return;

    currentChapterId = chId;
    const container = document.getElementById('page-content');
    const showPinyin = App.state.settings.showQuizPinyin !== false;

    // Section 1: Vocabulary (Premium Grid)
    let vocabHTML = ch.vocab && ch.vocab.length ? `
      <section class="lesson-section">
        <h3 class="section-title">1. Vocabulary Focus</h3>
        <p class="text-muted mb-24">Tap words to see stroke animations, component breakdown, and examples.</p>
        <div class="vocab-grid-premium">
          ${ch.vocab.map(v => `
            <div class="vocab-card-premium" onclick="showWordDetail('${v.hanzi}')">
              <div class="v-hanzi">${v.hanzi}</div>
              <div class="v-pinyin ${showPinyin ? '' : 'hidden'}">${v.pinyin}</div>
              <div class="v-def">${v.definition}</div>
            </div>
          `).join('')}
        </div>
      </section>
    ` : '';

    // Section 2: Dialogues (Premium Block)
    let dialoguesHTML = ch.dialogues && ch.dialogues.length ? `
      <section class="lesson-section">
        <h3 class="section-title">2. Situational Dialogues</h3>
        <p class="text-muted mb-24">Build your conversation stamina. Click a line to hear the pronunciation.</p>
        ${ch.dialogues.map((d, dIdx) => `
          <div class="dialogue-block-premium">
            <h4 class="mb-20" style="color:var(--accent);border-bottom:1px solid var(--border);padding-bottom:10px">Conversation ${dIdx + 1}: ${d.title}</h4>
            <div style="display:flex;flex-direction:column;gap:4px">
              ${d.lines.map(line => `
                <div class="dialogue-line-premium" onclick="TTS.speak('${line.zh}')" style="cursor:pointer">
                  <div class="line-speaker-badge">${line.speaker}</div>
                  <div style="flex:1">
                    <div class="font-zh" style="font-size:1.3rem;font-weight:700;margin-bottom:4px;color:var(--text)">${line.zh}</div>
                    <div class="text-muted ${showPinyin ? '' : 'hidden'}" style="font-size:0.95rem;font-weight:600;color:var(--accent)">${line.py}</div>
                    <div class="color-text-2" style="font-size:0.9rem;margin-top:4px">${line.en}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </section>
    ` : '';

    // Section 3: Reading Comprehension
    let readingsHTML = ch.readings && ch.readings.length ? `
      <section class="lesson-section">
        <h3 class="section-title">3. Reading Mastery</h3>
        <p class="text-muted mb-24">Contextual repetition using the same characters in new stories.</p>
        ${ch.readings.map((r, rIdx) => `
          <div class="reading-block-wrapper mb-48">
            <h4 class="mb-16">Passage ${rIdx + 1}: ${r.title}</h4>
            <div class="reading-passage-premium">
              ${r.text}
            </div>
            <div class="questions-card card p-24" style="background:var(--off-white)">
              <h5 class="mb-16" style="text-transform:uppercase;letter-spacing:1px;font-size:0.8rem">Comprehension Check</h5>
              ${r.questions && r.questions.length ? r.questions.map((q, qIdx) => `
                <div class="q-item mb-20">
                  <div style="font-weight:700;margin-bottom:12px;font-size:1.1rem">Q: ${q.q}</div>
                  <div class="options-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    ${q.options.map(opt => `
                      <button class="btn btn-outline btn-sm" style="text-align:left;padding:12px;height:auto" onclick="window.PlaygroundModule.checkAnswer(this, '${opt}', '${q.answer}')">${opt}</button>
                    `).join('')}
                  </div>
                </div>
              `).join('') : '<p class="text-muted italic">No questions for this passage.</p>'}
            </div>
          </div>
        `).join('')}
      </section>
    ` : '';

    // Section 4: Listening Lab
    let listeningHTML = ch.listening && ch.listening.length ? `
      <section class="lesson-section">
        <h3 class="section-title">4. Listening Challenge</h3>
        <p class="text-muted mb-24">Listen to the instructor. Try to answer without looking at the transcript!</p>
        ${ch.listening.map((l, lIdx) => `
          <div class="listening-card-premium">
            <div style="font-size:3rem;margin-bottom:16px">🎧</div>
            <h4 class="mb-20" style="color:white">${l.title}</h4>
            <button class="btn btn-white btn-lg" style="color:var(--gold);font-weight:800;background:white" onclick="TTS.speak(\`${l.text}\`)">▶ Play Listening Session</button>
            <div class="mt-24">
               <button class="btn btn-outline btn-sm" style="color:white;border-color:white" onclick="this.nextElementSibling.classList.toggle('hidden')">👁 Toggle Transcript</button>
               <div class="card p-16 mt-16 hidden font-zh" style="background:rgba(255,255,255,0.1);text-align:left;color:white;line-height:2;border:none">
                 ${l.text}
               </div>
            </div>
          </div>
          <div class="card p-24 mb-48" style="border:1px solid var(--border)">
             ${l.questions && l.questions.length ? l.questions.map((q, qIdx) => `
                <div class="q-item mb-16">
                  <div style="font-weight:700;margin-bottom:8px">Q: ${q.q}</div>
                  <div class="options-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                    ${q.options.map(opt => `
                      <button class="btn btn-outline btn-sm" onclick="window.PlaygroundModule.checkAnswer(this, '${opt}', '${q.answer}')">${opt}</button>
                    `).join('')}
                  </div>
                </div>
              `).join('') : ''}
          </div>
        `).join('')}
      </section>
    ` : '';

    // Section 5: Assessment
    let quizHTML = ch.quizzes && ch.quizzes.length ? `
      <section class="lesson-section card p-32" style="background:var(--warm-white);border:2px solid var(--accent)">
        <h3 class="section-title">5. Final Mastery Check</h3>
        <p class="text-muted mb-32">Complete these challenges to finish the chapter.</p>
        <div class="quiz-list">
          ${ch.quizzes.map((q, qIdx) => `
            <div class="q-item mb-32">
              <div style="font-weight:800;margin-bottom:16px;font-size:1.1rem;color:var(--text)">${qIdx+1}. ${q.type === 'fill' ? 'Complete the sentence:' : q.question}</div>
              ${q.type === 'fill' ? `
                <div class="mb-16 font-zh" style="font-size:1.8rem;line-height:1.5">${q.sentence.replace('___', `<input type="text" class="input inline-input" style="width:120px;font-size:1.6rem" id="quiz-fill-${qIdx}">`)}</div>
                <button class="btn btn-primary" onclick="window.PlaygroundModule.checkFill(this, 'quiz-fill-${qIdx}', '${q.answer}')">Check Answer</button>
              ` : `
                <div class="options-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                  ${q.options.map(opt => `
                    <button class="btn btn-outline" style="padding:16px" onclick="window.PlaygroundModule.checkAnswer(this, '${opt}', '${q.answer}')">${opt}</button>
                  `).join('')}
                </div>
              `}
            </div>
          `).join('')}
        </div>
      </section>
    ` : '';

    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-ghost btn-sm mb-12" onclick="window.PlaygroundModule.openBook(${ch.book})">← Back to Chapters</button>
        <h2 class="font-zh" style="font-size:2.5rem">${ch.title}</h2>
        <p style="font-size:1.1rem;margin-top:8px">${ch.intro}</p>
      </div>

      <div class="lesson-container" style="max-width:1000px;margin:0 auto">
        ${vocabHTML}
        ${dialoguesHTML}
        ${readingsHTML}
        ${listeningHTML}
        ${quizHTML}

        <div class="text-center mt-60 mb-60">
           <div class="card p-40" style="background:var(--off-white);border:2px dashed var(--tone2)">
             <div style="font-size:4rem;margin-bottom:16px">🏆</div>
             <h2 class="mb-16">Chapter Mastered?</h2>
             <p class="mb-32 text-muted">Ready to save your progress and unlock the next challenge?</p>
             <button class="btn btn-success btn-lg" style="width:100%;max-width:400px;padding:24px;font-size:1.5rem" onclick="window.PlaygroundModule.markChapterComplete()">Finish Chapter ✓</button>
           </div>
        </div>
      </div>
    `;

    window.scrollTo(0,0);
  }

  function checkAnswer(btn, selected, correct) {
    if (selected === correct) {
      btn.className = 'btn btn-success btn-sm';
      App.logActivity('🎯', `Correct answer in CCC Course!`);
    } else {
      btn.className = 'btn btn-error btn-sm';
      btn.style.animation = 'shake 0.4s';
    }
  }

  function checkFill(btn, inputId, correct) {
    const input = document.getElementById(inputId);
    if (input.value.trim() === correct) {
      input.style.borderColor = 'var(--tone2)';
      btn.className = 'btn btn-success';
    } else {
      input.style.borderColor = 'var(--red)';
      btn.style.animation = 'shake 0.4s';
    }
  }

  function markChapterComplete() {
    if (!App.state.progress.ccc_course) App.state.progress.ccc_course = {};
    App.state.progress.ccc_course[currentChapterId] = true;
    App.saveProgress();
    App.logActivity('🏆', `Completed CCC Chapter: ${currentChapterId}`);
    openBook(currentBookId);
  }

  // ── Character Playground ───────────────────────────────────────────────────
  
  async function renderCharPlayground(container) {
    await init();
    container.innerHTML = `
      <div class="page-header">
        <h2>Character Playground</h2>
        <p>Master characters through their radical building blocks.</p>
      </div>

      <div class="cp-tabs">
        <button class="cp-tab active" onclick="window.PlaygroundModule.switchCPTab('blocks')">Radical Blocks</button>
        <button class="cp-tab" onclick="window.PlaygroundModule.switchCPTab('decomp')">Explorer</button>
        <button class="cp-tab" onclick="window.PlaygroundModule.switchCPTab('game')">Game</button>
      </div>

      <div id="cp-tab-content">
        ${renderBlocksTab()}
      </div>
    `;
  }

  function renderBlocksTab() {
    if (!currentCharData) return '<div class="spinner"></div>';
    return `
      <div class="cp-blocks-grid">
        ${currentCharData.map(block => `
          <div class="cp-block-card" style="border-top: 4px solid ${block.color}" onclick="window.PlaygroundModule.openRadicalBlock('${block.id}')">
            <div class="cp-block-icon">${block.icon}</div>
            <div class="cp-block-info">
              <h3>${block.title}</h3>
              <div class="text-zh">${block.titleZh}</div>
              <p>${block.subtitle}</p>
              <div class="cp-lesson-badges">
                ${block.lessons.map(l => `<span class="badge badge-outline">${l.radical}</span>`).join('')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function openRadicalBlock(id) {
    const block = currentCharData.find(b => b.id === id);
    if (!block) return;

    const container = document.getElementById('page-content');
    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-ghost btn-sm mb-12" onclick="window.PlaygroundModule.renderCharPlayground(document.getElementById('page-content'))">← Back</button>
        <h2>${block.title}</h2>
        <p>${block.subtitle}</p>
      </div>
      
      <div class="cp-lessons-list">
        ${block.lessons.map((lesson, idx) => `
          <div class="cp-lesson-card" onclick="window.PlaygroundModule.startRadicalLesson('${block.id}', '${lesson.id}')">
            <div class="cp-lesson-radical">${lesson.radical}</div>
            <div class="cp-lesson-info">
              <h4>${lesson.radical_meaning}</h4>
              <div class="text-muted text-small">${lesson.radical_pinyin} • ${lesson.stroke_count} strokes</div>
              <div class="cp-compounds-preview">
                ${lesson.compounds.slice(0, 5).map(c => `<span>${c.hanzi}</span>`).join('')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function startRadicalLesson(blockId, lessonId) {
    const block = currentCharData.find(b => b.id === blockId);
    const lesson = block.lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    currentLesson = lesson;
    currentStep = 0;
    renderRadicalStep();
  }

  function renderRadicalStep() {
    const lesson = currentLesson;
    const container = document.getElementById('page-content');
    
    if (currentStep === 0) {
      container.innerHTML = `
        <div class="cp-lesson-step">
          <div class="cp-radical-intro">
            <div class="cp-radical-big">${lesson.radical}</div>
            <div class="cp-radical-meta">${lesson.radical_pinyin} • ${lesson.radical_meaning}</div>
            ${lesson.variant_forms.length ? `<div class="cp-variants">Variants: ${lesson.variant_forms.join(', ')}</div>` : ''}
            <div class="cp-mnemonic card mt-24">
              <strong>Mnemonic:</strong> ${lesson.mnemonic}
            </div>
            <button class="btn btn-primary btn-lg mt-32" onclick="window.PlaygroundModule.nextRadicalStep()">Explore Compounds →</button>
          </div>
        </div>
      `;
    } else if (currentStep === 1) {
      container.innerHTML = `
        <div class="cp-lesson-step">
          <h3>Compounds containing 「${lesson.radical}」</h3>
          <p class="mb-24">See how the radical gives meaning to these characters.</p>
          <div class="cp-compounds-grid">
            ${lesson.compounds.map(c => `
              <div class="cp-compound-item card" onclick="showCharModal('${c.hanzi}')">
                <div class="cp-c-hanzi">${c.hanzi}</div>
                <div class="cp-c-meta">
                  <div class="cp-c-py">${c.pinyin}</div>
                  <div class="cp-c-def">${c.definition}</div>
                </div>
                <div class="cp-c-breakdown">${c.breakdown}</div>
              </div>
            `).join('')}
          </div>
          <button class="btn btn-primary btn-lg mt-32" onclick="window.PlaygroundModule.nextRadicalStep()">Start Drills →</button>
        </div>
      `;
    } else if (currentStep <= lesson.drills.length + 1) {
      const drillIdx = currentStep - 2;
      if (drillIdx >= lesson.drills.length) {
        renderRadicalCompletion();
        return;
      }
      renderRadicalDrill(lesson.drills[drillIdx]);
    }
  }

  function renderRadicalDrill(drill) {
    const container = document.getElementById('page-content');
    container.innerHTML = `
      <div class="pg-lesson-header">
        <div class="pg-step-meta">Drill ${currentStep - 1} / ${currentLesson.drills.length}</div>
      </div>
      <div class="cp-drill-container">
        <h3 class="mb-16">${drill.instruction || 'Identify the correct character'}</h3>
        ${renderDrillContent(drill)}
      </div>
    `;
  }

  function renderDrillContent(drill) {
    switch (drill.type) {
      case 'spot_radical':
        return `
          <div class="cp-spot-grid">
            ${drill.chars.map(c => `<button class="cp-block" onclick="window.PlaygroundModule.checkSpot('${c}', this)">${c}</button>`).join('')}
          </div>
          <button class="btn btn-primary mt-24" onclick="window.PlaygroundModule.verifySpot()">Check Answers</button>
        `;
      case 'meaning_match':
        return `
          <div class="pg-big-hanzi">${drill.hanzi}</div>
          <div class="pg-options-grid">
            ${drill.options.map(opt => `<button class="btn btn-outline pg-opt-btn" onclick="window.PlaygroundModule.checkRadicalAnswer('${opt}', '${drill.answer}', this)">${opt}</button>`).join('')}
          </div>
        `;
      case 'build_recognition':
        return `
          <div class="pg-quiz-q mb-24">${drill.prompt}</div>
          <div class="pg-options-grid">
            ${drill.options.map(opt => `<button class="btn btn-outline pg-opt-btn pg-hanzi-opt" onclick="window.PlaygroundModule.checkRadicalAnswer('${opt}', '${drill.answer}', this)">${opt}</button>`).join('')}
          </div>
        `;
      case 'sentence_fill':
        return `
          <div class="cp-sentence-q mb-24">${drill.sentence.replace('___', '<span class="blank">?</span>')}</div>
          <div class="pg-options-grid">
            ${drill.options.map(opt => `<button class="btn btn-outline pg-opt-btn" onclick="window.PlaygroundModule.checkRadicalAnswer('${opt}', '${drill.answer}', this)">${opt}</button>`).join('')}
          </div>
        `;
    }
  }

  window._cpSpotSelected = [];
  function checkSpot(char, btn) {
    if (btn.classList.contains('selected')) {
      btn.classList.remove('selected');
      window._cpSpotSelected = window._cpSpotSelected.filter(c => c !== char);
    } else {
      btn.classList.add('selected');
      window._cpSpotSelected.push(char);
    }
  }

  function verifySpot() {
    const drill = currentLesson.drills[currentStep - 2];
    const correct = drill.answers.sort().join(',');
    const selected = window._cpSpotSelected.sort().join(',');
    if (correct === selected) nextRadicalStep();
    else alert('Keep looking! Find all characters with the radical.');
  }

  function checkRadicalAnswer(sel, ans, btn) {
    if (sel === ans) {
      btn.classList.add('btn-success');
      setTimeout(() => nextRadicalStep(), 600);
    } else {
      btn.classList.add('btn-error');
      setTimeout(() => btn.classList.remove('btn-error'), 500);
    }
  }

  function nextRadicalStep() {
    currentStep++;
    renderRadicalStep();
  }

  function renderRadicalCompletion() {
    const container = document.getElementById('page-content');
    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-ghost btn-sm mb-12" onclick="window.PlaygroundModule.renderCharPlayground(document.getElementById('page-content'))">← Back to Character Playground</button>
        <div class="pg-done-icon text-center" style="font-size:3rem; margin-bottom: 20px;">🌟 Radical Mastered!</div>
      </div>
      <div class="cp-lesson-step" style="max-width:800px; margin: 0 auto; text-align: left;">
        <div class="cp-radical-intro mb-24">
          <div class="cp-radical-big text-center">${currentLesson.radical}</div>
          <div class="cp-radical-meta text-center">${currentLesson.radical_pinyin} • ${currentLesson.radical_meaning}</div>
        </div>
        <h3 class="mb-16">Compounds Review</h3>
        <div class="cp-compounds-grid">
          ${currentLesson.compounds.map(c => `
            <div class="cp-compound-item card" onclick="showCharModal('${c.hanzi}')">
              <div class="cp-c-hanzi">${c.hanzi}</div>
              <div class="cp-c-meta">
                <div class="cp-c-py">${c.pinyin}</div>
                <div class="cp-c-def">${c.definition}</div>
              </div>
              <div class="cp-c-breakdown">${c.breakdown}</div>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-primary btn-lg mt-32 w-full" onclick="window.PlaygroundModule.renderCharPlayground(document.getElementById('page-content'))">Continue to Next Radical →</button>
      </div>
    `;
  }

  function renderDecompTab() {
    return `
      <div class="cp-container">
        <div class="cp-search">
          <input type="text" class="input" id="cp-input" placeholder="Enter a character (e.g. 森, 好, 媽)...">
          <button class="btn btn-primary" onclick="window.PlaygroundModule.decompose()">Decompose</button>
        </div>
        <div id="cp-result" class="cp-result-area">
          <div class="empty-state"><p>Enter a character above to see its "building blocks".</p></div>
        </div>
        <div class="cp-basic-blocks mt-32">
          <h3>Common Building Blocks</h3>
          <div class="cp-block-grid">
            ${['人','口','木','水','火','土','日','月','心','手','女','子','門','纟'].map(c => `
              <div class="cp-block" onclick="window.PlaygroundModule.showCombinations('${c}')">${c}</div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderGameTab() {
    const FORMATIONS = App.state.characters.filter(c => c.components && c.components.length > 1 && c.components.join('') !== c.hanzi);
    if (!FORMATIONS.length) return `<div class="empty-state">No formation data available.</div>`;

    const challengeChar = FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];
    const challenge = {
      hanzi: challengeChar.hanzi,
      definition: challengeChar.definition,
      parts: challengeChar.components,
      result: challengeChar.hanzi
    };

    const pool = new Set(challenge.parts);
    while (pool.size < 8) {
      const randChar = FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];
      pool.add(randChar.components[0]);
    }
    const shuffledPool = Array.from(pool).sort(() => Math.random() - 0.5);

    window._cpGameTarget = challenge;
    window._cpGameSelected = [];

    return `
      <div class="cp-container cp-game-view">
        <div class="cp-game-header">
          <h3>Build the Character!</h3>
          <p>Select components for: <strong class="text-accent" style="font-size:1.5rem">「${challenge.hanzi}」</strong></p>
          <div class="text-muted text-small">Meaning: ${challenge.definition}</div>
        </div>
        <div class="cp-built-area" id="cp-game-built">Select components...</div>
        <div class="cp-game-pool">
          ${shuffledPool.map(p => `<button class="cp-block cp-game-block" onclick="window.PlaygroundModule.cpGameSelect('${p}', this)">${p}</button>`).join('')}
        </div>
        <div id="cp-game-feedback" class="quiz-feedback"></div>
        <div class="flex gap-12 justify-center mt-24">
          <button class="btn btn-primary" onclick="window.PlaygroundModule.cpGameCheck()">Check Formation</button>
          <button class="btn btn-ghost" onclick="window.PlaygroundModule.switchCPTab('game')">Next Character 🔄</button>
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
    if (tab === 'blocks') content.innerHTML = renderBlocksTab();
    else if (tab === 'decomp') content.innerHTML = renderDecompTab();
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
    const parts = charData.components || charData.radicals || [];
    resultArea.innerHTML = `
      <div class="cp-decomp-view">
        <div class="cp-main-char">
          <div class="cp-char-big">${char}</div>
          <div class="cp-char-meta">${charData.pinyin} • ${charData.definition}</div>
        </div>
        <div class="cp-arrow">⬇️ decomposes into</div>
        <div class="cp-parts">
          ${parts.length > 0 ? parts.map(c => `
            <div class="cp-part-item">
              <div class="cp-part-char">${c}</div>
              <div class="cp-part-label">${charData.radicals?.includes(c) ? 'Radical' : 'Component'}</div>
            </div>`).join('<div class="cp-part-plus">+</div>') 
          : `<div class="cp-part-item"><div class="cp-part-char">${char}</div><div class="cp-part-label">Base</div></div>`}
        </div>
        ${charData.mnemonic ? `<div class="cp-mnemonic mt-24"><strong>Mnemonic:</strong> ${charData.mnemonic}</div>` : ''}
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
    openBook,
    startChapter,
    markChapterComplete,
    checkAnswer,
    checkFill,
    decompose,
    showCombinations,
    switchCPTab,
    openRadicalBlock,
    startRadicalLesson,
    nextRadicalStep,
    checkSpot,
    verifySpot,
    checkRadicalAnswer,
    cpGameSelect,
    cpGameCheck
  };
})();
