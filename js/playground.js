/* ═══════════════════════════════════════════════════════════════
   playground.js — Extreme Beginner & Character Playgrounds
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const PlaygroundModule = (() => {

  let playgroundData = null;
  let charPlaygroundData = null;
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
    if (!charPlaygroundData) {
      try {
        const res = await fetch('data/char_playground_content.json');
        charPlaygroundData = await res.json();
      } catch (e) {
        console.error("Failed to load character playground data", e);
        charPlaygroundData = [];
      }
    }
  }

  // ── Extreme Beginner Playground ──────────────────────────────────────────

  async function render(container) {
    await init();
    
    // Group by stage
    const stages = {};
    playgroundData.forEach(pg => {
      const s = pg.stage || 'other';
      if (!stages[s]) stages[s] = { label: pg.stage_label || 'Other', groups: [] };
      stages[s].groups.push(pg);
    });

    container.innerHTML = `
      <div class="page-header">
        <h2>Extreme Beginner Playground</h2>
        <p>Baby-style repetitive learning. Master the foundations through intense recognition drills.</p>
      </div>
      
      <div class="pg-stages">
        ${Object.keys(stages).map(sKey => `
          <div class="pg-stage-section">
            <h3 class="pg-stage-title">${stages[sKey].label}</h3>
            <div class="pg-grid">
              ${stages[sKey].groups.map(pg => {
                const completedCount = pg.lessons.filter(l => App.state.progress.playground?.[l.id]).length;
                const isDone = completedCount === pg.lessons.length;
                const isLocked = false; // All content unlocked for static page

                return `
                  <div class="pg-card ${isDone ? 'pg-complete' : ''}" onclick="PlaygroundModule.openPlayground('${pg.id}')">
                    <div class="pg-card-icon">${isDone ? '🏆' : '🎠'}</div>
                    <div class="pg-card-content">
                      <h3>${pg.title}</h3>
                      <p>${pg.entry_description || pg.subtitle}</p>
                      <div class="pg-lesson-count">${completedCount} / ${pg.lessons.length} Lessons</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
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
        ${pg.chapter_links && pg.chapter_links.length ? `<div class="text-small text-muted mt-4">Reinforces Chapters: ${pg.chapter_links.join(', ')}</div>` : ''}
      </div>
      
      <div class="pg-lessons-list">
        ${pg.lessons.map((lesson, idx) => {
          const isDone = App.state.progress.playground?.[lesson.id];
          return `
            <div class="pg-lesson-item ${isDone ? 'done' : ''}" onclick="PlaygroundModule.startLesson('${pg.id}', '${lesson.id}')">
              <div class="pg-lesson-num">${isDone ? '✓' : idx + 1}</div>
              <div class="pg-lesson-info">
                <h4>${lesson.title}</h4>
                <p>${lesson.dialogue ? lesson.dialogue.length : 0} Lines • Conversation Simulator</p>
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
    const container = document.getElementById('page-content');

    const dialogue = lesson.dialogue || [];
    
    // Dynamically extract all unique characters from the conversation
    const uniqueChars = new Set();
    dialogue.forEach(line => {
      const chars = line.zh.match(/[\u4e00-\u9fa5]/g) || [];
      chars.forEach(c => uniqueChars.add(c));
    });

    const vocabList = Array.from(uniqueChars).map(char => {
      const charData = App.state.characters.find(c => c.hanzi === char) || { hanzi: char, pinyin: '' };
      return charData;
    });

    let vocabHTML = '';
    if (vocabList.length > 0) {
      vocabHTML = `
        <div class="mb-32">
          <h3 class="mb-16">Vocabulary Focus (Unique Characters)</h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:12px">
            ${vocabList.map(v => `
              <div class="card text-center p-12" style="background:var(--off-white);cursor:pointer;border:1px solid var(--border);transition:all 0.2s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" onclick="showCharModal('${v.hanzi}')">
                <div class="font-zh color-accent" style="font-size:2.5rem;font-weight:900;line-height:1.2">${v.hanzi}</div>
                <div class="text-muted text-small mt-4">${v.pinyin}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    let dialogueHTML = '';
    if (dialogue.length > 0) {
      dialogueHTML = `
        <div class="mb-32">
          <h3 class="mb-16">Conversation Script</h3>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${dialogue.map((line, idx) => `
              <div class="card p-16" style="background:var(--card-bg);display:flex;gap:16px;align-items:flex-start;border-left:4px solid var(--accent)">
                <div class="badge badge-primary flex-shrink-0 mt-4" style="min-width:40px;text-align:center">${line.speaker}</div>
                <div style="flex:1">
                  <div class="font-zh" style="font-size:1.8rem;font-weight:700;cursor:pointer;margin-bottom:8px;transition:color 0.2s" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color=''" onclick="TTS.speak('${line.zh}')">🔊 ${line.zh}</div>
                  <div class="text-muted" style="font-size:1.1rem;margin-bottom:4px">${line.pinyin}</div>
                  <div class="color-text-2">${line.en}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-ghost btn-sm mb-12" onclick="PlaygroundModule.openPlayground('${pgId}')">← Back to Lessons</button>
        <h2>${lesson.title}</h2>
        <p>Review the unique characters first, then practice the full conversation.</p>
      </div>
      
      <div class="pg-lesson-content" style="max-width:800px;margin:0 auto">
        ${vocabHTML}
        ${dialogueHTML}
        
        <div class="text-center mt-32 mb-40">
          <button class="btn btn-primary btn-lg w-full" style="font-size:1.2rem;padding:20px" onclick="PlaygroundModule.markLessonComplete()">Mark Conversation as Completed ✓</button>
        </div>
      </div>
    `;
  }

  function markLessonComplete() {
    if (!App.state.progress.playground) App.state.progress.playground = {};
    App.state.progress.playground[currentLesson.id] = true;
    App.saveProgress();

    const items = currentLesson.dialogue || currentLesson.vocab || [];
    if (typeof SRS !== 'undefined') {
      items.forEach(v => {
        const targetStr = v.hanzi || v.zh;
        if (targetStr) SRS.review(targetStr, 'GOOD', 'novice');
      });
    }

    App.logActivity('🎯', `Completed Beginner Conversation: ${currentLesson.title}`);
    
    // Go back to the chapter view
    const pgId = currentLesson.id.split('_')[0];
    openPlayground(pgId);
  }

  // ─── Character Playground ───────────────────────────────────────────────────
  
  async function renderCharPlayground(container) {
    await init();
    container.innerHTML = `
      <div class="page-header">
        <h2>Character Playground</h2>
        <p>Master characters through their radical building blocks.</p>
      </div>

      <div class="cp-tabs">
        <button class="cp-tab active" onclick="PlaygroundModule.switchCPTab('blocks')">Radical Blocks</button>
        <button class="cp-tab" onclick="PlaygroundModule.switchCPTab('decomp')">Explorer</button>
        <button class="cp-tab" onclick="PlaygroundModule.switchCPTab('game')">Game</button>
      </div>

      <div id="cp-tab-content">
        ${renderBlocksTab()}
      </div>
    `;
  }

  function renderBlocksTab() {
    return `
      <div class="cp-blocks-grid">
        ${charPlaygroundData.map(block => `
          <div class="cp-block-card" style="border-top: 4px solid ${block.color}" onclick="PlaygroundModule.openRadicalBlock('${block.id}')">
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
    const block = charPlaygroundData.find(b => b.id === id);
    if (!block) return;

    const container = document.getElementById('page-content');
    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-ghost btn-sm mb-12" onclick="PlaygroundModule.renderCharPlayground(document.getElementById('page-content'))">← Back</button>
        <h2>${block.title}</h2>
        <p>${block.subtitle}</p>
      </div>
      
      <div class="cp-lessons-list">
        ${block.lessons.map((lesson, idx) => `
          <div class="cp-lesson-card" onclick="PlaygroundModule.startRadicalLesson('${block.id}', '${lesson.id}')">
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
    const block = charPlaygroundData.find(b => b.id === blockId);
    const lesson = block.lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    currentLesson = lesson;
    currentStep = 0;
    
    // Radical lessons follow a different flow:
    // 1. Radical Card (intro)
    // 2. Compounds explorer
    // 3. Drills
    
    renderRadicalStep();
  }

  function renderRadicalStep() {
    const lesson = currentLesson;
    const container = document.getElementById('page-content');
    
    // For simplicity, we'll implement a 3-part lesson: Intro -> Compounds -> Quiz
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
            <button class="btn btn-primary btn-lg mt-32" onclick="PlaygroundModule.nextRadicalStep()">Explore Compounds →</button>
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
          <button class="btn btn-primary btn-lg mt-32" onclick="PlaygroundModule.nextRadicalStep()">Start Drills →</button>
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
            ${drill.chars.map(c => `<button class="cp-block" onclick="PlaygroundModule.checkSpot('${c}', this)">${c}</button>`).join('')}
          </div>
          <button class="btn btn-primary mt-24" onclick="PlaygroundModule.verifySpot()">Check Answers</button>
        `;
      case 'meaning_match':
        return `
          <div class="pg-big-hanzi">${drill.hanzi}</div>
          <div class="pg-options-grid">
            ${drill.options.map(opt => `<button class="btn btn-outline pg-opt-btn" onclick="PlaygroundModule.checkRadicalAnswer('${opt}', '${drill.answer}', this)">${opt}</button>`).join('')}
          </div>
        `;
      case 'build_recognition':
        return `
          <div class="pg-quiz-q mb-24">${drill.prompt}</div>
          <div class="pg-options-grid">
            ${drill.options.map(opt => `<button class="btn btn-outline pg-opt-btn pg-hanzi-opt" onclick="PlaygroundModule.checkRadicalAnswer('${opt}', '${drill.answer}', this)">${opt}</button>`).join('')}
          </div>
        `;
      case 'sentence_fill':
        return `
          <div class="cp-sentence-q mb-24">${drill.sentence.replace('___', '<span class="blank">?</span>')}</div>
          <div class="pg-options-grid">
            ${drill.options.map(opt => `<button class="btn btn-outline pg-opt-btn" onclick="PlaygroundModule.checkRadicalAnswer('${opt}', '${drill.answer}', this)">${opt}</button>`).join('')}
          </div>
        `;
    }
  }

  // Helper for multi-select drills
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
    
    if (correct === selected) {
      nextRadicalStep();
    } else {
      alert('Keep looking! Find all characters with the radical.');
    }
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
        <button class="btn btn-ghost btn-sm mb-12" onclick="PlaygroundModule.renderCharPlayground(document.getElementById('page-content'))">← Back to Character Playground</button>
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
        <button class="btn btn-primary btn-lg mt-32 w-full" onclick="PlaygroundModule.renderCharPlayground(document.getElementById('page-content'))">Continue to Next Radical →</button>
      </div>
    `;
  }

  // ── Legacy / Explorer Support ──────────────────────────────────────────────

  function renderDecompTab() {
    return `
      <div class="cp-container">
        <div class="cp-search">
          <input type="text" class="input" id="cp-input" placeholder="Enter a character (e.g. 森, 好, 媽)...">
          <button class="btn btn-primary" onclick="PlaygroundModule.decompose()">Decompose</button>
        </div>
        <div id="cp-result" class="cp-result-area">
          <div class="empty-state"><p>Enter a character above to see its "building blocks".</p></div>
        </div>
        <div class="cp-basic-blocks mt-32">
          <h3>Common Building Blocks</h3>
          <div class="cp-block-grid">
            ${['人','口','木','水','火','土','日','月','心','手','女','子','門','纟'].map(c => `
              <div class="cp-block" onclick="PlaygroundModule.showCombinations('${c}')">${c}</div>
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

    // Generate pool of distractors
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
          ${shuffledPool.map(p => `<button class="cp-block cp-game-block" onclick="PlaygroundModule.cpGameSelect('${p}', this)">${p}</button>`).join('')}
        </div>
        <div id="cp-game-feedback" class="quiz-feedback"></div>
        <div class="flex gap-12 justify-center mt-24">
          <button class="btn btn-primary" onclick="PlaygroundModule.cpGameCheck()">Check Formation</button>
          <button class="btn btn-ghost" onclick="PlaygroundModule.switchCPTab('game')">Next Character 🔄</button>
        </div>
      </div>
    `;
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
          : `
            <div class="cp-part-item">
              <div class="cp-part-char">${char}</div>
              <div class="cp-part-label">Base Character</div>
            </div>
          `}
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
    openPlayground,
    startLesson,
    nextStep,
    checkAnswer,
    decompose,
    showCombinations,
    switchCPTab,
    openRadicalBlock,
    startRadicalLesson,
    nextRadicalStep,
    checkSpot,
    verifySpot,
    checkRadicalAnswer
  };
})();
