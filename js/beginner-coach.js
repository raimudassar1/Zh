/* Beginner Daily Coach - guided beginner training without locking content */
'use strict';

window.BeginnerCoachModule = (() => {
  const KEY = 'beginnerCoachState';
  const SETTINGS_KEY = 'beginnerGuidedMode';
  const PACK_DISPLAY_KEY = 'beginnerPackDisplay';
  const WORDS_PER_PACK = 30;
  const STRUCTURED_PACKS = 180;

  const CORE = [
    { zh:'\u4f60\u597d', py:'ni3 hao3', en:'hello' },
    { zh:'\u8acb\u554f', py:'qing3 wen4', en:'excuse me / may I ask' },
    { zh:'\u6211\u662f\u5b78\u751f', py:'wo3 shi4 xue2 sheng1', en:'I am a student' },
    { zh:'\u6211\u53eb\u738b\u958b\u6587', py:'wo3 jiao4 Wang2 Kai1wen2', en:'My name is Wang Kaiwen' },
    { zh:'\u6211\u60f3\u559d\u6c34', py:'wo3 xiang3 he1 shui3', en:'I want to drink water' },
    { zh:'\u4eca\u5929\u5f88\u5fd9', py:'jin1 tian1 hen3 mang2', en:'Today is busy' },
    { zh:'\u6211\u559c\u6b61\u53f0\u7063', py:'wo3 xi3 huan1 Tai2wan1', en:'I like Taiwan' },
    { zh:'\u9019\u500b\u591a\u5c11\u9322', py:'zhe4 ge5 duo1 shao3 qian2', en:'How much is this?' }
  ];

  const MISSIONS = [
    { title:'Sound first', focus:'Pinyin, tones, and clear mouth habits', route:'#/onboarding', routeLabel:'Open Pinyin Lab' },
    { title:'First words', focus:'Picture flash quiz and survival nouns', route:'#/quiz/flash', routeLabel:'Open Picture Quiz' },
    { title:'Tiny dialogues', focus:'Greet, introduce yourself, answer yes/no', route:'#/beginner-launchpad', routeLabel:'Open Launchpad' },
    { title:'Sentence order', focus:'Build short SVO and question sentences', route:'#/sentence-builder', routeLabel:'Open Builder' },
    { title:'Listening repeat', focus:'Hear, shadow, then answer from memory', route:'#/dialogue', routeLabel:'Open Dialogues' },
    { title:'Writing check', focus:'Write 3 short useful sentences from memory', route:'#/beginner-coach', routeLabel:'Write Here' },
    { title:'Strict review', focus:'Mixed recall: no notes, no browsing', route:'#/mixed-recall', routeLabel:'Open Mixed Recall' }
  ];

  const STATIC_WRITING = [
    { id:'intro', prompt:'Write: My name is ___, I am a student.', answer:'\u6211\u53eb___\uff0c\u6211\u662f\u5b78\u751f\u3002', checks:['Uses \u6211\u53eb for name','Uses \u6211\u662f for identity','Ends with a complete sentence'] },
    { id:'want', prompt:'Write: I want to drink water.', answer:'\u6211\u60f3\u559d\u6c34\u3002', checks:['Uses \u60f3 before the action','Uses a verb after \u60f3','Includes the object \u6c34'] },
    { id:'like', prompt:'Write: I like Taiwan very much.', answer:'\u6211\u5f88\u559c\u6b61\u53f0\u7063\u3002', checks:['Uses \u559c\u6b61','Places \u5f88 before the stative verb','Keeps topic after the verb'] },
    { id:'price', prompt:'Write: How much is this?', answer:'\u9019\u500b\u591a\u5c11\u9322\uff1f', checks:['Starts with \u9019\u500b','Uses \u591a\u5c11\u9322 as the price question','Uses a question mark'] }
  ];

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }

  function jsString(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ');
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function todayIndex() {
    return Math.floor(Date.now() / 86400000) % MISSIONS.length;
  }

  function routePackCursor() {
    const match = String(window.location.hash || '').match(/#\/beginner-coach\/pack\/(\d+)/);
    if (!match) return null;
    return Math.max(0, Math.min(999, parseInt(match[1], 10) - 1));
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (_) { return {}; }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function ensureCoachState() {
    const state = load();
    const day = todayKey();
    if (!state.startedAt) state.startedAt = day;
    if (!Number.isFinite(state.cursor)) state.cursor = Math.max(0, Math.floor(Date.now() / 86400000) % 37);
    if (!Array.isArray(state.previousCursors)) state.previousCursors = [];
    if (state.activeDate && state.activeDate !== day) {
      state.previousCursors.push(state.cursor);
      state.cursor += 1;
      state[day] = { done: [] };
    }
    state.activeDate = day;
    save(state);
    return state;
  }

  function applyRoutePack(state) {
    const forced = routePackCursor();
    if (forced === null) return state;
    if (forced !== state.cursor) state.previousCursors.push(state.cursor);
    state.cursor = forced;
    state[todayKey()] = state[todayKey()] || { done: [] };
    state[todayKey()].manualPack = forced + 1;
    save(state);
    return state;
  }

  function guidedOn() {
    return localStorage.getItem(SETTINGS_KEY) !== 'off';
  }

  function packDisplay() {
    try {
      return { showPinyin: true, showEnglish: true, ...JSON.parse(localStorage.getItem(PACK_DISPLAY_KEY) || '{}') };
    } catch (_) {
      return { showPinyin: true, showEnglish: true };
    }
  }

  function setPackDisplay(key, value) {
    const display = packDisplay();
    display[key] = !!value;
    localStorage.setItem(PACK_DISPLAY_KEY, JSON.stringify(display));
    render(document.getElementById('page-content'));
  }

  function setGuided(enabled) {
    localStorage.setItem(SETTINGS_KEY, enabled ? 'on' : 'off');
    render(document.getElementById('page-content'));
  }

  function refreshContent() {
    const state = ensureCoachState();
    state.previousCursors.push(state.cursor);
    state.cursor += 1;
    state[todayKey()] = state[todayKey()] || { done: [] };
    state[todayKey()].refreshedAt = new Date().toISOString();
    save(state);
    render(document.getElementById('page-content'));
  }

  function previousContent() {
    const state = ensureCoachState();
    if (!state.previousCursors.length) return;
    state.cursor = state.previousCursors.pop();
    save(state);
    render(document.getElementById('page-content'));
  }

  function setPackCursor(cursor, remember = true) {
    const state = ensureCoachState();
    const next = Math.max(0, Math.min(499, Number(cursor) || 0));
    if (remember && next !== state.cursor) state.previousCursors.push(state.cursor);
    state.cursor = next;
    state[todayKey()] = state[todayKey()] || { done: [] };
    state[todayKey()].manualPack = next + 1;
    save(state);
    render(document.getElementById('page-content'));
  }

  function firstPack() {
    setPackCursor(0);
  }

  function nextPack() {
    const state = ensureCoachState();
    setPackCursor((state.cursor || 0) + 1);
  }

  function backOnePack() {
    const state = ensureCoachState();
    setPackCursor(Math.max(0, (state.cursor || 0) - 1));
  }

  function jumpToPack(value) {
    const packNumber = Math.max(1, Math.min(500, parseInt(value, 10) || 1));
    setPackCursor(packNumber - 1);
  }

  function markDone(id) {
    const state = ensureCoachState();
    const day = todayKey();
    state[day] = state[day] || { done: [] };
    if (!state[day].done.includes(id)) state[day].done.push(id);
    save(state);
    render(document.getElementById('page-content'));
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function deterministicShuffle(items, seedText) {
    const rand = rng(hashString(seedText));
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async function ensureLearningData() {
    if (!App.state.characters?.length) {
      try {
        const result = await API.getCharacters({ limit: 9999 });
        App.state.characters = result.data || [];
      } catch (err) {
        console.warn('Beginner coach character load failed:', err.message);
      }
    }
    if (!App.state.beginnerCoachVocab) {
      try {
        const resp = await fetch('data/vocabulary.json');
        if (resp.ok) {
          const json = await resp.json();
          App.state.beginnerCoachVocab = json.sets || [];
        }
      } catch (err) {
        console.warn('Failed to load vocabulary.json:', err);
      }
    }
    if (!App.state.beginnerCoachScenarios) {
      try {
        const resp = await fetch('data/scenarios_content.json');
        if (resp.ok) {
          App.state.beginnerCoachScenarios = await resp.json() || [];
        }
      } catch (err) {
        console.warn('Failed to load scenarios_content.json:', err);
      }
    }
    if (!App.state.beginnerBookWords) {
      const all = [];
      for (const book of [1, 2, 3]) {
        try {
          const resp = await fetch(`books/book${book}/vocabulary_b${book}.json`);
          if (resp.ok) {
            const json = await resp.json();
            json.forEach(item => all.push({
              hanzi: item.traditional || item.hanzi || item.word,
              pinyin: item.pinyin || '',
              definition: item.english || item.definition || '',
              level: book === 1 ? 'novice' : book === 2 ? 'a1' : 'a2',
              source: `Book ${book}`
            }));
          }
        } catch (_) {}
      }
      App.state.beginnerBookWords = all;
    }
    if (!App.state.beginnerLaunchpadLessons) {
      const allLessons = [];
      const files = ['beginner_launchpad.json', 'beginner_launchpad_level2.json', 'beginner_launchpad_level3.json'];
      for (const file of files) {
        try {
          const resp = await fetch(`data/${file}`);
          if (resp.ok) {
            const json = await resp.json();
            if (json.lessons) {
              allLessons.push(...json.lessons);
            }
          }
        } catch (err) {
          console.warn(`Failed to load ${file}:`, err);
        }
      }
      App.state.beginnerLaunchpadLessons = allLessons;
    }
  }

  function getPackTheme(cursor) {
    const vocab = App.state.beginnerCoachVocab || [];
    const scens = App.state.beginnerCoachScenarios || [];
    
    let targetLevels = ['novice'];
    if (cursor >= 20 && cursor < 40) targetLevels = ['novice', 'a1'];
    else if (cursor >= 40 && cursor < 80) targetLevels = ['a1'];
    else if (cursor >= 80 && cursor < 120) targetLevels = ['a1', 'a2'];
    else if (cursor >= 120 && cursor < 160) targetLevels = ['a2'];
    else if (cursor >= 160) targetLevels = ['b1', 'a2/b1', 'a2']; // Fallback to A2 if B1 runs out

    const validVocabSets = vocab.filter(v => targetLevels.includes(v.level));
    const vocabSet = validVocabSets.length > 0 ? validVocabSets[cursor % validVocabSets.length] : vocab[cursor % vocab.length];

    const allScenarios = [];
    scens.forEach(mod => {
      (mod.scenarios || []).forEach(scen => {
        allScenarios.push({ module: mod, scenario: scen });
      });
    });
    
    // Ensure the scenario rotates every single pack
    const scenarioData = allScenarios.length > 0 ? allScenarios[cursor % allScenarios.length] : {};

    return {
      vocabSet,
      scenarioModule: scenarioData.module,
      scenario: scenarioData.scenario,
      stage: vocabSet ? `${vocabSet.name} (${vocabSet.level.toUpperCase()})` : 'Mixed'
    };
  }

  function normalizeWord(raw) {
    const hanzi = raw.traditional || raw.hanzi || raw.word || '';
    const definition = raw.definition || raw.english || raw.meaning || '';
    if (!hanzi || !definition) return null;
    return {
      hanzi,
      pinyin: raw.pinyin || '',
      definition,
      level: String(raw.level || '').toLowerCase(),
      category: raw.category || raw.source || 'Core',
      source: raw.source || raw.category || 'Library'
    };
  }

  function isBookWord(item) {
    return String(item.source || '').toLowerCase().includes('book');
  }

  function easyScore(item) {
    const def = String(item.definition || '').toLowerCase();
    let score = 0;
    score += String(item.hanzi || '').length * 8;
    score += Math.min(30, def.length / 3);
    if (def.includes(';')) score += 8;
    if (/formal|surname|lunar|idiom|literary|classifier|measure word|abstract|administrative/.test(def)) score += 18;
    if (/hello|water|tea|food|rice|money|person|friend|student|teacher|eat|drink|go|come|like|want|home|school|today|tomorrow|number|one|two|three|good|big|small/.test(def)) score -= 12;
    if (String(item.level || '').includes('novice')) score -= 8;
    return score;
  }

  function preparePool(all, levels, options = {}) {
    const wanted = levels.map(x => String(x).toLowerCase());
    const includeBooks = !!options.includeBooks;
    const basicOnly = !!options.basicOnly;
    return all.filter(item => {
      const level = String(item.level || '').toLowerCase();
      const source = String(item.source || '').toLowerCase();
      const def = String(item.definition || '').toLowerCase();
      if (!includeBooks && isBookWord(item)) return false;
      if (basicOnly && /phonetic|component|prefix|ordinal|formal|surname|classifier|radical|tone|literary|archaic/.test(def)) return false;
      return wanted.some(w => level.includes(w) || source.includes(w));
    }).sort((a, b) => easyScore(a) - easyScore(b));
  }

  function takeCycled(pool, cursor, phaseStart, seed, count = WORDS_PER_PACK) {
    if (!pool.length) return [];
    const ordered = deterministicShuffle(pool, seed).sort((a, b) => easyScore(a) - easyScore(b));
    const start = Math.max(0, cursor - phaseStart) * count;
    const out = [];
    for (let i = 0; i < count; i++) out.push(ordered[(start + i) % ordered.length]);
    return out;
  }

  function combinePacks(parts, fallback, cursor) {
    const seen = new Set();
    const out = [];
    parts.flat().forEach(item => {
      const key = item.hanzi + '|' + item.definition;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    });
    const fill = takeCycled(fallback, cursor, 0, `fallback-${cursor}`, WORDS_PER_PACK * 2);
    fill.forEach(item => {
      const key = item.hanzi + '|' + item.definition;
      if (out.length < WORDS_PER_PACK && !seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    });
    return out.slice(0, WORDS_PER_PACK);
  }

  function buildWordBank(cursor) {
    const theme = getPackTheme(cursor);
    const vocabSet = theme.vocabSet;
    const allChars = (App.state.characters || []).map(c => ({
      hanzi: c.traditional || c.hanzi || '',
      pinyin: c.pinyin || '',
      definition: c.english || c.definition || '',
      level: 'novice',
      source: 'Characters'
    })).filter(c => c.hanzi);

    const pack = [];
    const seen = new Set();

    const add = (item) => {
      const key = item.hanzi;
      if (!seen.has(key)) {
        seen.add(key);
        pack.push(item);
        return true;
      }
      return false;
    };

    // 1. 60% Target Words from Theme (18 words)
    if (vocabSet && vocabSet.words) {
      const pool = deterministicShuffle(vocabSet.words, `theme-words-${cursor}`);
      pool.forEach(w => {
        if (pack.length < 18) {
          add({
            hanzi: w.word || w.hanzi,
            pinyin: w.pinyin,
            definition: w.definition || w.english,
            level: vocabSet.level || 'novice',
            source: vocabSet.name
          });
        }
      });
    }

    // 2. 30% Characters (9 chars)
    const charPool = deterministicShuffle(allChars, `theme-chars-${cursor}`);
    charPool.forEach(c => {
      if (pack.length < 27) add(c);
    });

    // 3. 10% Mixed/Review (3 items)
    const reviewPool = deterministicShuffle([...(App.state.beginnerBookWords || []), ...allChars], `review-${cursor}`);
    reviewPool.forEach(r => {
      if (pack.length < 30) add(r);
    });

    const stage = vocabSet ? `${vocabSet.name} (${vocabSet.level})` : 'Mixed Foundation';
    return { pack, stage };
  }

  function dailyWritingTasks(pack, cursor) {
    const theme = getPackTheme(cursor);
    const tasks = [];

    // Progressive TOCFL-Style Difficulty
    if (cursor < 30) {
      // Novice: Sentence Completion / Gap Fill
      const pool = theme.vocabSet?.words || [];
      const targets = deterministicShuffle(pool.filter(w => w.example_sentence), `writing-novice-${cursor}`).slice(0, 3);
      targets.forEach((w, i) => {
        const sentence = w.example_sentence.sentence;
        const english = w.example_sentence.english;
        const gap = sentence.replace(w.word, '____');
        tasks.push({
          id: `write-gap-${i}`,
          prompt: `TOCFL Gap Fill: Complete the sentence for "${english}"\n${gap}`,
          answer: sentence,
          checks: [`Uses the word "${w.word}"`, 'Correct character stroke order', 'Correct punctuation']
        });
      });
    } else if (cursor < 80) {
      // A1 Bridge: Contextual Response
      const lines = theme.scenario?.subConversations?.[0]?.dialogue || [];
      if (lines.length >= 2) {
        tasks.push({
          id: 'write-context-1',
          prompt: `TOCFL Reading: Reply to this person in one full sentence:\n"${lines[0].zh}" (${lines[0].en})`,
          answer: lines[1].zh,
          checks: ['Natural response', 'Uses correct grammar', 'Matches the context']
        });
      }
      // Add a word-based sentence building task
      const word = pack[0];
      if (word) {
        tasks.push({
          id: 'write-build-1',
          prompt: `Write a natural sentence using "${word.hanzi}" (${word.definition}) based on today's theme.`,
          answer: theme.vocabSet?.words?.find(w => w.word === word.hanzi)?.example_sentence?.sentence || `\u6211\u559c\u6b61${word.hanzi}\u3002`,
          checks: [`Includes ${word.hanzi}`, 'Uses a complete sentence structure']
        });
      }
    } else {
      // A2 Core: Situation Description
      tasks.push({
        id: 'write-desc-1',
        prompt: `TOCFL Situation: Describe this scene in 2 sentences:\n"${theme.scenario?.description || theme.vocabSet?.name}"`,
        answer: theme.scenario?.subConversations?.[0]?.dialogue?.map(d => d.zh).join('\uff0c') || '',
        checks: ['Coherent description', 'Uses A2-level vocabulary', 'Correct complex sentence structure']
      });
    }

    // Add Open-Ended Scenario Description from Pack 60 (cursor 59) onwards
    if (cursor >= 59) {
      const vocab1 = pack[0]?.hanzi || '';
      const vocab2 = pack[1]?.hanzi || '';
      tasks.push({
        id: 'write-open-1',
        prompt: `Open Expression: Describe the scene "${theme.scenario?.title || "Today's Topic"}" in your own words. Try to use "${vocab1}" and "${vocab2}".`,
        answer: `This is an open-ended task. Try to write at least two full sentences related to the topic using the suggested vocabulary.`,
        checks: ['Relevant to the scenario', `Uses ${vocab1}`, `Uses ${vocab2}`, 'Proper Chinese sentence structure']
      });
    }

    if (tasks.length === 0) tasks.push(...STATIC_WRITING.slice(0, 3));
    return tasks;
  }

  function dailySpeakingTasks(pack, cursor) {
    const theme = getPackTheme(cursor);
    const tasks = [];
    
    // Pull from high-quality example sentences, ensuring they exist
    if (theme.vocabSet?.words) {
      const wordsWithExamples = theme.vocabSet.words.filter(w => w.example_sentence && w.example_sentence.sentence);
      const examples = deterministicShuffle(wordsWithExamples, `speaking-${cursor}`).slice(0, 3);
      examples.forEach((w, i) => {
        tasks.push({ id: `speak-vocab-${i}`, text: w.example_sentence.sentence, audio: `vocab-${i}` });
      });
    }

    // Pull from scenario dialogue
    if (theme.scenario?.subConversations?.[0]?.dialogue) {
      theme.scenario.subConversations[0].dialogue.slice(0, 2).forEach((d, i) => {
        tasks.push({ id: `speak-scen-${i}`, text: d.zh, audio: `scen-${i}` });
      });
    }

    // Fallback or padding using pack words if we don't have enough full sentences
    let fallbackIndex = 0;
    while (tasks.length < 5 && fallbackIndex < pack.length) {
      const w = pack[fallbackIndex++];
      if (w && w.hanzi) {
        tasks.push({ id: `speak-fallback-${fallbackIndex}`, text: w.hanzi, audio: `word-${fallbackIndex}` });
      }
    }

    return tasks;
  }

  function scoreWriting(input, answer) {
    const clean = String(input || '').replace(/[\s\u3000\u3002\uff0c\uff01\uff1f,.!?]/g, '');
    const target = String(answer || '').replace(/[_\s\u3000\u3002\uff0c\uff01\uff1f,.!?]/g, '');
    if (!clean) return 0;
    const needed = Array.from(new Set(target.split(''))).filter(Boolean);
    const hits = needed.filter(ch => clean.includes(ch)).length;
    return Math.round((hits / Math.max(1, needed.length)) * 100);
  }

  function currentWritingTasks() {
    const state = ensureCoachState();
    const { pack } = buildWordBank(state.cursor);
    return dailyWritingTasks(pack, state.cursor);
  }

  function currentSpeakingTasks() {
    const state = ensureCoachState();
    const { pack } = buildWordBank(state.cursor);
    return dailySpeakingTasks(pack, state.cursor);
  }

  function checkWriting(id) {
    const item = currentWritingTasks().find(x => x.id === id);
    const input = document.getElementById(`bc-write-${id}`)?.value || '';
    const result = document.getElementById(`bc-result-${id}`);
    if (!item || !result) return;
    const pct = scoreWriting(input, item.answer);
    const tone = pct >= 80 ? 'good' : pct >= 45 ? 'almost' : 'review';
    result.innerHTML = `<div class="bc-writing-result ${tone}"><strong>${pct}% match</strong><span>Model: ${esc(item.answer)}</span><ul>${item.checks.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>`;
  }

  function checkScenarioAnswer(answer, selected, resId) {
    const res = document.getElementById(resId);
    if (!res) return;
    const correct = answer === selected;
    res.innerHTML = `<div class="bc-scenario-feedback ${correct ? 'good' : 'review'}">${correct ? 'Correct!' : 'Try again.'}</div>`;
  }

  function renderScenario(theme) {
    const scen = theme.scenario;
    const mod = theme.scenarioModule;
    if (!scen) return '';
    
    const dialogue = scen.subConversations?.[0]?.dialogue || [];
    const quiz = scen.quiz || [];

    return `<section class="bc-panel bc-scenario">
      <div class="bc-section-head"><span>TOCFL Reading & Listening Practice</span><strong>${esc(scen.title)}</strong></div>
      <div class="bc-scenario-content">
        <div class="bc-scenario-visual">
          <div class="bc-scenario-placeholder" style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); width: 100%; height: 160px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 3rem;">🖼️</div>
        </div>
        <div class="bc-scenario-details">
          <p class="bc-scenario-desc"><strong>Background:</strong> ${esc(scen.description)}</p>
          <div class="bc-scenario-dialogue">
            <strong>Dialogue:</strong>
            <ul class="bc-dialogue-list">
              ${dialogue.map(d => `<li><strong>${d.speaker}:</strong> ${esc(d.zh)} <small>(${esc(d.en)})</small></li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
      <div class="bc-scenario-questions">
        <div class="bc-question-header">TOCFL Comprehension Quiz</div>
        ${quiz.slice(0, 3).map((q, i) => `
          <div class="bc-scenario-q">
            <strong>Q${i+1}: ${esc(q.question)}</strong>
            <div class="bc-scenario-options">
              ${(q.options || []).map((opt, optIdx) => `<button type="button" class="btn btn-outline btn-sm" onclick="BeginnerCoachModule.checkScenarioAnswer('${q.answer}', '${optIdx}', 'bc-scenario-res-${i}')">${esc(opt)}</button>`).join('')}
            </div>
            <div id="bc-scenario-res-${i}"></div>
          </div>
        `).join('')}
      </div>
    </section>`;
  }

  function renderSurvival(theme) {
    const items = theme.scenario?.subConversations?.[0]?.dialogue?.slice(0, 8) || CORE;
    return `<section class="bc-panel">
      <div class="bc-section-head"><span>Core survival phrases</span><strong>Tap to hear</strong></div>
      <div class="bc-core-grid">${items.map(w => {
        const zh = w.zh;
        const py = w.py || w.pinyin || '';
        const en = w.en || w.english || '';
        return `<button type="button" onclick="BeginnerCoachModule.playPrompt('${jsString(zh)}', 'core-${en.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}')"><strong>${esc(zh)}</strong><span>${esc(py)}</span><small>${esc(en)}</small></button>`;
      }).join('')}</div>
    </section>`;
  }

  function playPrompt(text, file) {
    const path = `audio/human/beginner/${file}.mp3`;
    const audio = new Audio(path);
    let settled = false;
    audio.addEventListener('canplaythrough', () => { if (!settled) { settled = true; audio.play().catch(() => TTS.speak(text)); } }, { once:true });
    audio.addEventListener('error', () => { if (!settled) { settled = true; TTS.speak(text); } }, { once:true });
    audio.load();
  }

  function startSpeechCheck(id) {
    const item = currentSpeakingTasks().find(x => x.id === id);
    const result = document.getElementById(`bc-speech-${id}`);
    if (!item || !result) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      result.innerHTML = '<div class="bc-speech-result review"><strong>Speech check is not available in this browser.</strong><span>Use Play Teacher, repeat aloud, then tap Done after 3 clean repeats.</span></div>';
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'zh-TW';
    rec.interimResults = false;
    result.innerHTML = '<div class="bc-speech-result almost"><strong>Listening...</strong><span>Say the phrase clearly once.</span></div>';
    rec.onresult = event => {
      const heard = event.results?.[0]?.[0]?.transcript || '';
      const pct = scoreWriting(heard, item.text);
      const tone = pct >= 80 ? 'good' : pct >= 45 ? 'almost' : 'review';
      result.innerHTML = `<div class="bc-speech-result ${tone}"><strong>${pct}% heard</strong><span>You said: ${esc(heard)}</span><small>Target: ${esc(item.text)}</small></div>`;
    };
    rec.onerror = () => {
      result.innerHTML = '<div class="bc-speech-result review"><strong>Could not hear clearly.</strong><span>Try again, or use manual repeat mode.</span></div>';
    };
    rec.start();
  }

  function exportState() {
    const blob = new Blob([JSON.stringify({ beginnerCoach: load(), guidedMode: guidedOn(), exportedAt: new Date().toISOString() }, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'beginner-coach-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function renderMissionCards(state, dayKey) {
    const done = new Set(state[dayKey]?.done || []);
    return MISSIONS.map((m, i) => {
      const active = i === todayIndex();
      const id = `mission-${i}`;
      return `<article class="bc-mission ${active ? 'active' : ''} ${done.has(id) ? 'done' : ''}">
        <span>${String(i + 1).padStart(2, '0')}</span>
        <div><strong>${esc(m.title)}</strong><small>${esc(m.focus)}</small></div>
        <a href="${m.route}">${esc(m.routeLabel)}</a>
        <button type="button" onclick="BeginnerCoachModule.markDone('${id}')">Done</button>
      </article>`;
    }).join('');
  }

  function renderDailyPack(pack, state, stage) {
    const hasPrevious = state.previousCursors?.length > 0;
    const display = packDisplay();
    return `<section class="bc-panel bc-daily-pack">
      <div class="bc-section-head bc-pack-head">
        <div><span>Today\'s content pack</span><strong>${WORDS_PER_PACK} words - ${esc(stage)}</strong></div>
        <div class="bc-pack-actions">
          <a class="btn btn-outline btn-sm" href="#/beginner-coach/pack/1">First Pack</a>
          <a class="btn btn-outline btn-sm ${state.cursor <= 0 ? 'disabled' : ''}" href="#/beginner-coach/pack/${Math.max(1, state.cursor)}">Back One</a>
          ${hasPrevious ? `<a class="btn btn-outline btn-sm" href="#/beginner-coach/pack/${state.previousCursors[state.previousCursors.length - 1] + 1}">Previous Content</a>` : `<button class="btn btn-outline btn-sm" type="button" disabled>Previous Content</button>`}
          <a class="btn btn-outline btn-sm" href="#/beginner-coach/pack/${state.cursor + 2}">Next Pack</a>
          <a class="btn btn-primary btn-sm" href="#/beginner-coach/pack/${state.cursor + 2}">Refresh Content</a>
        </div>
      </div>
      <div class="bc-pack-jump">
        <label for="bc-pack-jump-input">Browse pack</label>
        <input id="bc-pack-jump-input" type="number" min="1" max="500" value="${state.cursor + 1}" inputmode="numeric">
        <button class="btn btn-outline btn-sm" type="button" data-pack-action="jump">Go</button>
      </div>
      <div class="bc-pack-display-controls">
        <span>Show</span>
        <label><input type="checkbox" ${display.showPinyin ? 'checked' : ''} onchange="BeginnerCoachModule.setPackDisplay('showPinyin', this.checked)"> Pinyin</label>
        <label><input type="checkbox" ${display.showEnglish ? 'checked' : ''} onchange="BeginnerCoachModule.setPackDisplay('showEnglish', this.checked)"> English</label>
      </div>
      <p class="bc-pack-note">This pack stays the same until tomorrow or until you refresh it. Use First/Back/Next/Go to browse packs for testing. Previous restores the last pack you left.</p>
      <div class="bc-word-grid">${pack.map((w, i) => `<button type="button" onclick="BeginnerCoachModule.playPrompt('${jsString(w.hanzi)}', 'pack-${state.cursor}-${i}')"><span>${String(i + 1).padStart(2, '0')}</span><strong>${esc(w.hanzi)}</strong>${display.showPinyin ? `<em>${esc(w.pinyin)}</em>` : ''}${display.showEnglish ? `<small>${esc(w.definition)}</small>` : ''}</button>`).join('')}</div>
    </section>`;
  }

  function renderWriting(tasks) {
    return tasks.map(item => `<article class="bc-practice-card">
      <div class="bc-practice-head"><span>Writing self-check</span><button type="button" onclick="TTS.speak('${jsString(item.answer)}')">Hear model</button></div>
      <strong>${esc(item.prompt)}</strong>
      <textarea id="bc-write-${item.id}" placeholder="Type your Chinese answer here"></textarea>
      <button class="btn btn-primary btn-sm" type="button" onclick="BeginnerCoachModule.checkWriting('${item.id}')">Check My Answer</button>
      <div id="bc-result-${item.id}"></div>
    </article>`).join('');
  }

  function renderSpeaking(tasks) {
    return tasks.map(item => `<article class="bc-practice-card">
      <div class="bc-practice-head"><span>Speaking repeat</span><button type="button" onclick="BeginnerCoachModule.playPrompt('${jsString(item.text)}', '${jsString(item.audio)}')">Play Teacher</button></div>
      <strong class="bc-phrase">${esc(item.text)}</strong>
      <div class="bc-repeat-actions">
        <button class="btn btn-primary btn-sm" type="button" onclick="BeginnerCoachModule.startSpeechCheck('${item.id}')">Check Speech</button>
        <button class="btn btn-outline btn-sm" type="button" onclick="BeginnerCoachModule.markDone('speak-${item.id}')">3 Clean Repeats Done</button>
      </div>
      <div id="bc-speech-${item.id}"></div>
    </article>`).join('');
  }



  function wirePackControls(container) {
    const bind = (action, fn) => {
      container.querySelector(`[data-pack-action="${action}"]`)?.addEventListener('click', event => {
        event.preventDefault();
        if (event.currentTarget.disabled) return;
        fn();
      });
    };
    bind('first', firstPack);
    bind('back', backOnePack);
    bind('previous', previousContent);
    bind('next', nextPack);
    bind('refresh', refreshContent);
    bind('jump', () => jumpToPack(container.querySelector('#bc-pack-jump-input')?.value));
  }

  async function render(container) {
    container.innerHTML = '<div class="spinner"></div>';
    await ensureLearningData();
    const state = applyRoutePack(ensureCoachState());
    const dayKey = todayKey();
    const doneCount = state[dayKey]?.done?.length || 0;
    const mission = MISSIONS[todayIndex()];
    const theme = getPackTheme(state.cursor);
    const { pack, stage } = buildWordBank(state.cursor);
    const writingTasks = dailyWritingTasks(pack, state.cursor);
    const speakingTasks = dailySpeakingTasks(pack, state.cursor);
    container.innerHTML = `<div class="beginner-coach-page">
      <section class="bc-hero">
        <div>
          <div class="bc-kicker">Beginner Daily Coach</div>
          <h2>Do exactly this today</h2>
          <p>A guided beginner path with a fresh 30-word daily pack, writing, speaking, and review. All app content stays open; the coach only tells you what to do next.</p>
          <div class="bc-hero-actions">
            <a class="btn btn-primary" href="${mission.route}">Start Today: ${esc(mission.title)}</a>
            <button class="btn btn-outline" type="button" onclick="BeginnerCoachModule.exportState()">Export Progress</button>
          </div>
        </div>
        <aside class="bc-guided-toggle">
          <span>Guided Mode</span>
          <strong>${guidedOn() ? 'On' : 'Off'}</strong>
          <p>${guidedOn() ? 'Dashboard and coach point you to the next best beginner task.' : 'Nothing is hidden. Browse any page normally.'}</p>
          <button type="button" onclick="BeginnerCoachModule.setGuided(${guidedOn() ? 'false' : 'true'})">Turn ${guidedOn() ? 'Off' : 'On'}</button>
        </aside>
      </section>

      <section class="bc-status-row">
        <article><span>Today</span><strong>${doneCount}</strong><small>items checked off</small></article>
        <article><span>Daily word load</span><strong>${pack.length}</strong><small>new/review words in this pack</small></article>
        <article><span>Pack number</span><strong>${state.cursor + 1}${state.cursor < STRUCTURED_PACKS ? ` / ${STRUCTURED_PACKS}` : ''}</strong><small>${state.cursor < STRUCTURED_PACKS ? 'structured path' : 'random mixed review'}</small></article>
      </section>

      ${renderDailyPack(pack, state, stage)}

      <section class="bc-panel">
        <div class="bc-section-head"><span>7-day beginner loop</span><strong>${esc(mission.title)}</strong></div>
        <div class="bc-mission-list">${renderMissionCards(state, dayKey)}</div>
      </section>

      ${renderScenario(theme)}

      <section class="bc-two-col">
        <div class="bc-panel">
          <div class="bc-section-head"><span>Writing</span><strong>Daily self-check tasks</strong></div>
          <div class="bc-practice-list">${renderWriting(writingTasks)}</div>
        </div>
        <div class="bc-panel">
          <div class="bc-section-head"><span>Speaking</span><strong>Pack repeat mode</strong></div>
          <div class="bc-practice-list">${renderSpeaking(speakingTasks)}</div>
        </div>
      </section>

      ${renderSurvival(theme)}
    </div>`;
    wirePackControls(container);
  }

  return { render, setGuided, markDone, checkWriting, startSpeechCheck, playPrompt, exportState, guidedOn, refreshContent, previousContent, firstPack, nextPack, backOnePack, jumpToPack, setPackDisplay, checkScenarioAnswer };
})();
