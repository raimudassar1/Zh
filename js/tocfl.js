/* ═══════════════════════════════════════════════════════════════
   tocfl.js — TOCFL Exam Center
   Official-style preparation, part practice, and mock simulations
   ═══════════════════════════════════════════════════════════════ */

'use strict';

window.TOCFLModule = (() => {
  const officialSources = [
    { label: 'TOCFL official test categories', url: 'https://tocfl.edu.tw/tocfl/index.php/test/cat/list/3' },
    { label: 'TOCFL overseas listening/reading brochure', url: 'https://tocfl.edu.tw/OS/dm/TOCFL_En_DM.pdf' },
    { label: 'Official mock test resources', url: 'https://tocfl.edu.tw/tocfl/index.php/exam/test/page/19' }
  ];

  const bands = {
    novice: {
      label: 'Novice', chinese: '準備級', cefr: 'Pre-A1', vocab: '300-400 words', resultLow: 'Novice 1', resultHigh: 'Novice 2',
      listening: { questions: 25, minutes: 25, options: 3, parts: [{ name: 'Picture Description', count: 10 }, { name: 'Short Dialogue', count: 10 }, { name: 'Longer Short Dialogue', count: 5 }] },
      reading: { questions: 25, minutes: 25, options: 3, parts: [{ name: 'Word / Sentence Comprehension', count: 15 }, { name: 'Practical Reading', count: 10 }] },
      writing: { tasks: 'Website practice', minutes: 20, official: false },
      levels: ['novice']
    },
    bandA: {
      label: 'Band A', chinese: '入門基礎級', cefr: 'A1-A2', vocab: '500-1,000 words', resultLow: 'A1 / Level 1', resultHigh: 'A2 / Level 2',
      listening: { questions: 50, minutes: 60, options: 3, parts: [{ name: 'Picture Description', count: 10 }, { name: 'Single-round Dialogue', count: 15 }, { name: 'Multiple-round Dialogue', count: 15 }, { name: 'Dialogue', count: 10, options: 4 }] },
      reading: { questions: 50, minutes: 60, options: 4, parts: [{ name: 'Sentence Comprehension', count: 15 }, { name: 'Picture Description', count: 10 }, { name: 'Gap Filling', count: 10 }, { name: 'Paragraph Completion', count: 5 }, { name: 'Reading Comprehension', count: 10 }] },
      writing: { tasks: '9 tasks', minutes: 40, official: true },
      levels: ['a1', 'a2']
    },
    bandB: {
      label: 'Band B', chinese: '進階高階級', cefr: 'B1-B2', vocab: '2,500-5,000 words', resultLow: 'B1 / Level 3', resultHigh: 'B2 / Level 4',
      listening: { questions: 50, minutes: 60, options: 4, parts: [{ name: 'Dialogue', count: 30 }, { name: 'Monologue', count: 20 }] },
      reading: { questions: 50, minutes: 60, options: 4, parts: [{ name: 'Gap Filling', count: 15 }, { name: 'Reading Comprehension', count: 35 }] },
      writing: { tasks: '2 tasks', minutes: 100, official: true },
      levels: ['b1', 'b2']
    }
  };

  const state = {
    mode: 'plan',
    band: 'novice',
    skill: 'listening',
    examId: null,
    questions: [],
    current: 0,
    answers: {},
    submitted: false,
    timer: null,
    timeLeft: 0,
    data: null
  };

  async function render(container) {
    clearTimer();
    container.innerHTML = `
      <div class="tocfl-shell tocfl-exam-center">
        <section class="tocfl-hero tocfl-hero-pro">
          <div>
            <div class="tocfl-kicker">TOCFL Exam Center</div>
            <h2>Prepare, practice, then sit a real-feeling mock exam.</h2>
            <p>Built around official TOCFL band structure: Novice, Band A, and Band B. Use practice mode to train sections, then use Mock Exams for timed listening and reading simulations.</p>
          </div>
          <div class="tocfl-hero-steps" aria-label="TOCFL workflow">
            <span>1 Pick band</span><span>2 Train parts</span><span>3 Mock exam</span>
          </div>
        </section>

        <div class="tocfl-mode-bar tocfl-mode-bar-pro" role="tablist" aria-label="TOCFL mode">
          <button type="button" class="tocfl-mode active" data-mode="plan">Study Plan</button>
          <button type="button" class="tocfl-mode" data-mode="practice">Practice Parts</button>
          <button type="button" class="tocfl-mode" data-mode="exams">Mock Exams</button>
          <button type="button" class="tocfl-mode" data-mode="review">Review</button>
        </div>

        <div class="tocfl-band-grid tocfl-band-grid-pro">
          ${Object.entries(bands).map(([key, band]) => bandCard(key, band)).join('')}
        </div>

        <div id="tocfl-workspace" class="tocfl-workspace"><div class="spinner"></div></div>
      </div>`;

    bindShell(container);
    state.data = await loadData();
    renderWorkspace();
  }

  function bandCard(key, band) {
    return `
      <button type="button" class="tocfl-band-card ${key === state.band ? 'active' : ''}" data-band="${key}">
        <span>${band.label}</span>
        <strong>${band.chinese}</strong>
        <small>${band.cefr} · ${band.vocab}</small>
        <em>${band.listening.questions} L + ${band.reading.questions} R</em>
      </button>`;
  }

  function bindShell(container) {
    container.querySelectorAll('.tocfl-mode').forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        clearTimer();
        state.mode = btn.dataset.mode;
        state.questions = [];
        state.submitted = false;
        container.querySelectorAll('.tocfl-mode').forEach(b => b.classList.toggle('active', b === btn));
        renderWorkspace();
      });
    });
    container.querySelectorAll('.tocfl-band-card').forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        clearTimer();
        state.band = btn.dataset.band;
        state.questions = [];
        state.submitted = false;
        container.querySelectorAll('.tocfl-band-card').forEach(b => b.classList.toggle('active', b === btn));
        renderWorkspace();
      });
    });
  }

  async function loadData() {
    const [charsResult, vocabResult, readings, book1, book2, book3] = await Promise.all([
      API.getCharacters(),
      API.get('vocabulary').catch(() => []),
      API.get('readings').catch(() => []),
      API.get('book1_content').catch(() => null),
      API.get('book2_content').catch(() => null),
      API.get('book3_content').catch(() => null)
    ]);
    const characters = Array.isArray(charsResult) ? charsResult : (charsResult.data || []);
    const vocabulary = flattenVocabulary(vocabResult);
    const sentences = collectSentences(characters, readings, [book1, book2, book3]);
    const passages = collectReadingPassages(readings, [book1, book2, book3], sentences);
    return { characters, vocabulary, readings: readings || [], sentences, passages };
  }

  function flattenVocabulary(raw) {
    const out = [];
    const walk = value => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') {
        if (value.word || value.hanzi || value.traditional) out.push(value);
        Object.values(value).forEach(child => {
          if (Array.isArray(child) || (child && typeof child === 'object')) walk(child);
        });
      }
    };
    walk(raw);
    const seen = new Set();
    return out.filter(item => {
      const key = item.word || item.hanzi || item.traditional;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function collectSentences(characters, readings, books) {
    const rows = [];
    characters.forEach(c => {
      if (c.example_sentence?.sentence) rows.push({ zh: c.example_sentence.sentence, py: c.example_sentence.pinyin || '', en: c.example_sentence.english || c.definition || '', level: c.level || 'novice', source: 'character' });
    });
    (readings || []).forEach(r => {
      if (r.text_zh) rows.push({ zh: firstSentence(r.text_zh), py: '', en: r.title || r.description || '', level: (r.difficulty || 'a2').toLowerCase(), source: 'reading' });
    });
    (books || []).forEach((book, bookIndex) => {
      (book?.chapters || []).forEach(ch => {
        (ch.dialogues || []).forEach(d => (d.lines || []).forEach(line => {
          const zh = line.zh || line.chinese;
          if (zh) rows.push({ zh, py: line.pinyin || '', en: line.en || line.english || '', level: bookIndex === 0 ? 'a1' : bookIndex === 1 ? 'a2' : 'b1', source: 'book' });
        }));
      });
    });
    const seen = new Set();
    return rows.filter(row => row.zh && row.zh.length >= 3 && row.zh.length <= 120 && !seen.has(row.zh) && seen.add(row.zh));
  }
  function collectReadingPassages(readings, books, sentences) {
    const rows = [];
    (readings || []).forEach((r, idx) => {
      const zh = String(r.text_zh || r.zh || '').trim();
      if (zh) rows.push({
        passage: trimPassage(zh, 180),
        question: r.title ? `What is this text mainly about: ${r.title}?` : 'What is the main idea of this text?',
        answer: r.description || r.title || 'The main idea of the passage.',
        level: (r.difficulty || 'a2').toLowerCase(),
        source: 'reading'
      });
    });
    (books || []).forEach((book, bookIndex) => {
      (book?.chapters || []).forEach(ch => {
        (ch.dialogues || []).forEach((d, dIdx) => {
          const lines = (d.lines || []).map(line => ({ zh: line.zh || line.chinese || '', en: line.en || line.english || '' })).filter(line => line.zh);
          if (lines.length >= 2) {
            rows.push({
              passage: lines.slice(0, 5).map(line => line.zh).join('\n'),
              question: 'What are the speakers doing in this dialogue?',
              answer: lines.find(line => line.en)?.en || ch.title || d.title || 'They are having a conversation.',
              level: bookIndex === 0 ? 'a1' : bookIndex === 1 ? 'a2' : 'b1',
              source: 'book-dialogue'
            });
          }
        });
      });
    });
    (sentences || []).forEach((row, idx) => {
      if (idx % 3 === 0 && row.zh && row.en) rows.push({
        passage: row.zh,
        question: 'What does this sentence mean?',
        answer: row.en,
        level: row.level || 'novice',
        source: row.source || 'sentence'
      });
    });
    const seen = new Set();
    return rows.filter(row => row.passage && row.answer && !seen.has(row.passage) && seen.add(row.passage));
  }

  function trimPassage(text, maxChars) {
    const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxChars) return cleaned;
    const parts = cleaned.split(/(?<=[。！？!?])/).filter(Boolean);
    let out = '';
    for (const part of parts) {
      if ((out + part).length > maxChars && out) break;
      out += part;
    }
    return out || cleaned.slice(0, maxChars);
  }

  function firstSentence(text) {
    const first = String(text).split(/[。！？!?]/).filter(Boolean)[0]?.trim();
    return first ? `${first}。` : '';
  }

  function renderWorkspace() {
    const area = document.getElementById('tocfl-workspace');
    if (!area || !state.data) return;
    if (state.questions.length && !state.submitted) return renderQuestion(area);
    if (state.mode === 'review') return renderReview(area);
    if (state.mode === 'exams') return renderMockExams(area);
    if (state.mode === 'practice') return renderPractice(area);
    return renderPlan(area);
  }

  function renderPlan(area) {
    const band = bands[state.band];
    area.innerHTML = `
      <div class="tocfl-guidance-grid">
        <article class="tocfl-guidance-main tocfl-learning-plan">
          <h3>${band.label} Learning Order</h3>
          <p>${band.chinese} · ${band.cefr}. Use this as the spine of the app: learn content first, drill only the skill you are building, then test. Do not start from random quizzes.</p>
          <div class="tocfl-roadmap tocfl-roadmap-plain">
            ${planStep('1', 'Foundation', 'Beginner Launchpad + Pinyin/Tones', 'Learn sound, basic words, and sentence order before exam drills.')}
            ${planStep('2', 'Course Input', 'Course Books + Dialogue Practice', 'Read and listen to real chapter dialogues. Add unknown words to review.')}
            ${planStep('3', 'Skill Drills', 'Listening, Reading, Writing', `${band.label}: ${band.listening.questions} listening and ${band.reading.questions} reading question format.`)}
            ${planStep('4', 'Mock Exam', 'TOCFL Native Content + Mock Exams', 'Sit one timed block, review misses, then repeat the same band later.')}
          </div>
          <div class="tocfl-band-spec">
            ${roadStep('Listening format', `${band.listening.questions} questions`, `${band.listening.minutes} minutes`, band.listening.parts)}
            ${roadStep('Reading format', `${band.reading.questions} questions`, `${band.reading.minutes} minutes`, band.reading.parts)}
            ${roadStep('Writing practice', band.writing.tasks, `${band.writing.minutes} minutes`, [{ name: band.writing.official ? 'Official-style writing' : 'Website beginner writing practice', count: '' }])}
          </div>
        </article>
        <aside class="tocfl-guidance-side">
          <h4>What to do first</h4>
          <ol>
            <li>If you are below 300 words, use Beginner Launchpad before TOCFL.</li>
            <li>If you can read simple sentences, study Course Book 1 dialogues.</li>
            <li>Use Practice Parts only after learning the content.</li>
            <li>Use Mock Exams only to measure readiness.</li>
          </ol>
          <a class="btn btn-primary w-full" href="#/beginner-launchpad">Start foundations</a>
          <a class="btn btn-outline w-full" href="#/vocabulary-books">Study course content</a>
          <button type="button" class="btn btn-outline w-full" data-jump-mode="practice">Practice TOCFL parts</button>
          <button type="button" class="btn btn-outline w-full" data-jump-mode="exams">Mock exams</button>
        </aside>
      </div>      ${sourceNote()}`;
    bindJumpButtons(area);
  }

  function roadStep(title, count, time, parts) {
    return `<section><div><strong>${title}</strong><span>${count} · ${time}</span></div><p>${parts.map(p => `${p.name}${p.count ? ` (${p.count})` : ''}`).join(' → ')}</p></section>`;
  }

  function planStep(number, title, route, detail) {
    return `<section class="tocfl-plan-step"><span>${number}</span><div><strong>${title}</strong><em>${route}</em><p>${detail}</p></div></section>`;
  }

  function renderPractice(area) {
    const band = bands[state.band];
    area.innerHTML = `
      <div class="tocfl-spec-card tocfl-command-card">
        <div><h3>Practice Parts</h3><p>Short untimed drills. Use this before a full mock so mistakes turn into targeted review instead of surprise.</p></div>
        <div class="tocfl-spec-pills"><span>10 objective questions</span><span>Immediate review</span><span>TTS listening</span></div>
      </div>
      <div class="tocfl-skill-grid">
        ${skillCard('listening', band, false)}
        ${skillCard('reading', band, false)}
        ${skillCard('writing', band, false)}
        ${skillCard('mixed', band, false)}
      </div>`;
    area.querySelectorAll('[data-start-skill]').forEach(btn => btn.addEventListener('click', (event) => { event.preventDefault(); startSession(btn.dataset.startSkill, false); }));
  }

  function skillCard(skill, band, examMode) {
    const meta = skill === 'mixed'
      ? { title: 'Listening + Reading', desc: 'Mixed recall under exam-like switching pressure.', count: band.listening.questions + band.reading.questions, parts: ['Listening block', 'Reading block', 'Score report'] }
      : skill === 'writing'
        ? { title: 'Writing', desc: band.writing.official ? 'Prompt practice with model-answer review.' : 'Beginner writing drills for pre-A1 output.', count: band.writing.tasks, parts: ['Reorder', 'Complete', 'Short response'] }
        : { title: titleCase(skill), desc: `${band[skill].parts.length} TOCFL-style sections.`, count: band[skill].questions, parts: band[skill].parts.map(p => p.name) };
    return `
      <article class="tocfl-skill-card tocfl-skill-card-pro">
        <div class="tocfl-skill-top"><strong>${meta.title}</strong><span>${examMode ? meta.count : skill === 'writing' ? 6 : 10}</span></div>
        <p>${meta.desc}</p>
        <div class="tocfl-part-list">${meta.parts.slice(0, 5).map(p => `<span>${p}</span>`).join('')}</div>
        <button type="button" class="btn btn-primary w-full" data-start-skill="${skill}">${examMode ? 'Start exam block' : 'Practice this part'}</button>
      </article>`;
  }

  function renderMockExams(area) {
    const band = bands[state.band];
    const sets = makeExamSets(state.band);
    area.innerHTML = `
      <div class="tocfl-spec-card tocfl-command-card">
        <div>
          <h3>${band.label} Mock Exams</h3>
          <p>Five fixed simulation sets for this band. Each set keeps the official-style question counts and section order, then draws stable questions from your website curriculum.</p>
        </div>
        <div class="tocfl-spec-pills"><span>${band.listening.questions} listening</span><span>${band.reading.questions} reading</span><span>Timed exam room</span></div>
      </div>
      <div class="tocfl-exam-grid">
        ${sets.map(set => examSetCard(set, band)).join('')}
      </div>
      ${sourceNote()}`;
    area.querySelectorAll('[data-exam-skill]').forEach(btn => btn.addEventListener('click', (event) => { event.preventDefault(); startExam(btn.dataset.examId, btn.dataset.examSkill); }));
  }

  function makeExamSets(bandKey) {
    return Array.from({ length: 5 }, (_, idx) => ({ id: `${bandKey}-mock-${idx + 1}`, number: idx + 1, bandKey }));
  }

  function examSetCard(set, band) {
    return `
      <article class="tocfl-exam-card">
        <div class="tocfl-exam-card-head"><span>Mock ${set.number}</span><strong>${band.label}</strong></div>
        <p>Official-style section order with fixed generated questions. Use this like a real pre-test before exam day.</p>
        <div class="tocfl-exam-actions">
          <button type="button" class="btn btn-outline btn-sm" data-exam-id="${set.id}" data-exam-skill="listening">Listening</button>
          <button type="button" class="btn btn-outline btn-sm" data-exam-id="${set.id}" data-exam-skill="reading">Reading</button>
          <button type="button" class="btn btn-primary btn-sm" data-exam-id="${set.id}" data-exam-skill="mixed">Full L+R</button>
        </div>
      </article>`;
  }

  function sourceNote() {
    return `
      <div class="tocfl-source-note">
        <strong>Reference basis</strong>
        <span>Structure follows public TOCFL mock-test/brochure descriptions. Items here are generated from your curriculum instead of copying full official copyrighted exams.</span>
        <div>${officialSources.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`).join('')}</div>
      </div>`;
  }

  function bindJumpButtons(area) {
    area.querySelectorAll('[data-jump-mode]').forEach(btn => btn.addEventListener('click', (event) => {
      event.preventDefault();
      state.mode = btn.dataset.jumpMode;
      document.querySelectorAll('.tocfl-mode').forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode));
      renderWorkspace();
    }));
  }

  function startExam(examId, skill) {
    state.examId = examId;
    startSession(skill, true);
  }

  function startSession(skill, examMode) {
    clearTimer();
    state.skill = skill;
    state.current = 0;
    state.answers = {};
    state.submitted = false;
    const band = bands[state.band];
    const count = examMode
      ? (skill === 'mixed' ? band.listening.questions + band.reading.questions : skill === 'writing' ? 6 : band[skill].questions)
      : (skill === 'writing' ? 6 : 10);
    state.questions = buildQuestions(skill, count, examMode, state.examId || `${state.band}-${skill}-practice`);
    state.timeLeft = examMode ? examMinutes(skill, band) * 60 : 0;
    if (state.timeLeft) startTimer();
    renderQuestion(document.getElementById('tocfl-workspace'));
  }

  function examMinutes(skill, band) {
    if (skill === 'mixed') return band.listening.minutes + band.reading.minutes;
    if (skill === 'writing') return band.writing.minutes;
    return band[skill].minutes;
  }

  function buildQuestions(skill, count, examMode, seedText) {
    if (skill === 'mixed') {
      const band = bands[state.band];
      const listening = buildQuestions('listening', examMode ? band.listening.questions : Math.ceil(count / 2), examMode, `${seedText}-L`);
      const reading = buildQuestions('reading', examMode ? band.reading.questions : count - listening.length, examMode, `${seedText}-R`);
      return [...listening, ...reading].slice(0, count);
    }
    if (skill === 'writing') return buildWriting(count, seedText);
    const band = bands[state.band];
    if (skill === 'reading') return buildReading(count, seedText, band);
    const levels = band.levels;
    const sourceChars = state.data.characters.filter(c => levels.includes((c.level || '').toLowerCase()) || levels.includes((c.tocfl_band || '').toLowerCase()));
    const chars = seededShuffle(sourceChars.length ? sourceChars : state.data.characters, seedText).slice(0, count);
    const plan = sectionPlan(band[skill].parts, count);
    return chars.map((char, idx) => skill === 'listening' ? listeningItem(char, idx, plan[idx], band) : readingItem(char, idx, plan[idx], band));
  }

  function sectionPlan(parts, count) {
    const list = [];
    parts.forEach(part => {
      const n = Math.min(part.count, count - list.length);
      for (let i = 0; i < n; i++) list.push(part);
    });
    while (list.length < count) list.push(parts[parts.length - 1]);
    return list;
  }

  function listeningItem(char, idx, part, band) {
    const optionCount = part.options || band.listening.options || 3;
    const sentence = cleanSentence(char.example_sentence?.sentence) || sampleSentence(char);
    const sourceRow = { zh: sentence, py: char.example_sentence?.pinyin || char.pinyin || '', en: char.example_sentence?.english || char.definition || '' };
    const useMeaning = state.band === 'bandB' || part.name === 'Dialogue' || part.name === 'Monologue';
    const options = useMeaning
      ? makeListeningMeaningOptions(sourceRow, optionCount, `L${idx}-${char.hanzi}`)
      : makeListeningSentenceOptions(sourceRow, optionCount, `L${idx}-${char.hanzi}`);
    return {
      type: 'listening',
      section: part.name,
      prompt: useMeaning ? 'Listen and choose the meaning that matches the audio.' : 'Listen and choose the full Traditional Chinese sentence you heard.',
      audioText: sentence,
      options,
      answer: useMeaning ? sourceRow.en : sourceRow.zh,
      explanation: `${sourceRow.zh}${sourceRow.py ? ` · ${sourceRow.py}` : ''}${sourceRow.en ? ` · ${sourceRow.en}` : ''}`,
      sourceText: sentence
    };
  }
  function buildReading(count, seedText, band) {
    const levels = band.levels;
    const source = (state.data.passages || []).filter(row => levels.includes(String(row.level || '').toLowerCase()));
    const pool = seededShuffle(source.length ? source : (state.data.passages || []), seedText).slice(0, count);
    const plan = sectionPlan(band.reading.parts, count);
    return pool.map((row, idx) => readingPassageItem(row, idx, plan[idx], band, `${seedText}-R${idx}`));
  }

  function readingPassageItem(row, idx, part, band, seedText) {
    const optionCount = part.options || band.reading.options || 3;
    const isGap = part.name.includes('Gap');
    const gap = isGap ? makeGapPassage(row.passage) : null;
    const prompt = isGap
      ? `Read the passage and choose the best word for the blank.\n\n${gap.prompt}`
      : `Read the passage, then answer the question.\n\n${row.passage}\n\n${row.question || 'What is the best answer?'}`;
    const answer = isGap ? gap.answer : row.answer;
    const options = isGap ? makeGapOptions(gap.answer, optionCount, seedText) : makeReadingAnswerOptions(row, optionCount, seedText);
    return {
      type: 'reading',
      section: part.name,
      prompt,
      options,
      answer,
      explanation: `${row.passage}${row.answer ? ` · ${row.answer}` : ''}`
    };
  }

  function buildWriting(count, seedText) {
    return seededShuffle(state.data.sentences, seedText).slice(0, count).map((row, idx) => {
      const chars = row.zh.replace(/[。！？!?，,]/g, '').split('');
      return {
        type: 'writing',
        section: idx < 2 ? 'Rearrangement' : idx < 4 ? 'Dialogue Completion' : 'Short Response',
        prompt: idx < 2 ? 'Reorder these characters into a natural sentence.' : `Write the Chinese sentence for: ${row.en || row.py || 'the prompt'}`,
        tokens: idx < 2 ? seededShuffle(chars, `${seedText}-${idx}`).slice(0, 18) : [],
        answer: row.zh,
        explanation: row.py ? `${row.zh} · ${row.py}` : row.zh
      };
    });
  }

  function sampleSentence(char) {
    return char.example_sentence?.sentence || `請選出「${char.hanzi}」的意思。`;
  }

  function buildMiniPassage(char, idx) {
    const sentence = char.example_sentence?.sentence || `我今天學了${char.hanzi}這個詞。`;
    return idx % 2 ? `小明說：「${sentence}」` : sentence;
  }

  function makeReadingAnswerOptions(row, count, seedText) {
    const correct = row.answer || 'The passage gives this information.';
    const wrong = seededShuffle((state.data.passages || [])
      .filter(item => item.answer && item.answer !== correct)
      .map(item => item.answer), seedText)
      .slice(0, count - 1);
    return seededShuffle([correct, ...wrong], `${seedText}-reading-options`).map((text, i) => ({ id: String.fromCharCode(65 + i), text }));
  }

  function makeGapPassage(passage) {
    const candidates = String(passage || '').match(/[\u4e00-\u9fff]{1,4}/g) || [];
    const answer = candidates.find(w => w.length >= 2) || candidates[0] || '是';
    return { answer, prompt: String(passage || '').replace(answer, '＿＿') };
  }

  function makeGapOptions(answer, count, seedText) {
    const pool = seededShuffle((state.data.vocabulary || [])
      .map(v => v.word || v.hanzi || v.traditional)
      .filter(Boolean)
      .filter(word => word !== answer), seedText)
      .slice(0, count - 1);
    return seededShuffle([answer, ...pool], `${seedText}-gap-options`).map((text, i) => ({ id: String.fromCharCode(65 + i), text }));
  }
  function makeOptions(char, mode, count, seedText) {
    const correct = mode === 'hanzi' ? char.hanzi : char.definition;
    const pool = seededShuffle(state.data.characters.filter(c => c.hanzi !== char.hanzi && c.definition), `${seedText}-${char.hanzi}`);
    const wrong = pool.slice(0, count - 1).map(c => mode === 'hanzi' ? c.hanzi : c.definition);
    return seededShuffle([correct, ...wrong], `${seedText}-opts`).map((text, i) => ({ id: String.fromCharCode(65 + i), text }));
  }

  function cleanSentence(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.length > 80 ? firstSentence(text) : text;
  }

  function sentenceOptionPool(correctRow, seedText) {
    const rows = (state.data.sentences || [])
      .map(row => ({ zh: cleanSentence(row.zh), py: row.py || '', en: row.en || '' }))
      .filter(row => row.zh && row.zh !== correctRow.zh && row.zh.length >= 4 && row.zh.length <= 40);
    return seededShuffle(rows, seedText);
  }

  function makeListeningSentenceOptions(correctRow, count, seedText) {
    const wrong = sentenceOptionPool(correctRow, seedText).slice(0, count - 1).map(row => row.zh);
    return seededShuffle([correctRow.zh, ...wrong], `${seedText}-sentence-options`).map((text, i) => ({ id: String.fromCharCode(65 + i), text }));
  }

  function makeListeningMeaningOptions(correctRow, count, seedText) {
    const correct = correctRow.en || correctRow.zh;
    const wrong = sentenceOptionPool(correctRow, seedText).map(row => row.en || row.zh).filter(Boolean).slice(0, count - 1);
    return seededShuffle([correct, ...wrong], `${seedText}-meaning-options`).map((text, i) => ({ id: String.fromCharCode(65 + i), text }));
  }
  function renderQuestion(area) {
    const q = state.questions[state.current];
    if (!q) return renderWorkspace();
    const answered = state.answers[state.current];
    area.innerHTML = `
      <div class="tocfl-test-shell tocfl-exam-room">
        <div class="tocfl-test-top tocfl-exam-top">
          <button type="button" class="btn btn-ghost btn-sm" id="tocfl-exit">Exit</button>
          <div><strong>${bands[state.band].label}</strong><span>${titleCase(state.skill)} · ${q.section}</span></div>
          <div class="tocfl-timer">${state.timeLeft ? formatTime(state.timeLeft) : `${state.current + 1} / ${state.questions.length}`}</div>
        </div>
        <div class="tocfl-progress"><span style="width:${((state.current + 1) / state.questions.length) * 100}%"></span></div>
        <div class="tocfl-exam-layout">
          <aside class="tocfl-question-palette">${state.questions.map((item, idx) => `<button class="${idx === state.current ? 'active' : ''} ${state.answers[idx] ? 'answered' : ''}" data-jump="${idx}">${idx + 1}</button>`).join('')}</aside>
          <div class="tocfl-question-card">
            <div class="tocfl-section-label">${q.section}</div>
            ${q.type === 'listening' ? `<button class="tocfl-audio-btn" id="tocfl-play-audio">Play audio</button>` : ''}
            <div class="tocfl-prompt">${escapeHtml(q.prompt).replace(/\n/g, '<br>')}</div>
            ${q.tokens?.length ? `<div class="tocfl-token-bank">${q.tokens.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            ${q.type === 'writing' ? `<textarea class="tocfl-writing-input" id="tocfl-writing-answer" placeholder="Type your Chinese answer here">${escapeHtml(answered || '')}</textarea>` : optionsHtml(q, answered)}
            <div class="tocfl-question-actions">
              <button type="button" class="btn btn-ghost" id="tocfl-prev" ${state.current === 0 ? 'disabled' : ''}>Previous</button>
              <button type="button" class="btn btn-primary" id="tocfl-next">${state.current === state.questions.length - 1 ? 'Finish' : 'Next'}</button>
            </div>
          </div>
        </div>
      </div>`;
    bindQuestion(area, q);
  }

  function optionsHtml(q, answered) {
    return `<div class="tocfl-options">${q.options.map(opt => `
      <button type="button" class="tocfl-option ${answered === opt.text ? 'selected' : ''}" data-answer="${escapeAttr(opt.text)}">
        <span>${opt.id}</span><strong>${escapeHtml(opt.text)}</strong>
      </button>`).join('')}</div>`;
  }

  function bindQuestion(area, q) {
    area.querySelector('#tocfl-exit')?.addEventListener('click', () => { clearTimer(); state.questions = []; renderWorkspace(); });
    area.querySelector('#tocfl-play-audio')?.addEventListener('click', (event) => { event.preventDefault(); TTS?.speak(q.audioText); });
    area.querySelectorAll('.tocfl-option').forEach(btn => btn.addEventListener('click', () => {
      state.answers[state.current] = btn.dataset.answer;
      area.querySelectorAll('.tocfl-option').forEach(b => b.classList.toggle('selected', b === btn));
    }));
    area.querySelectorAll('[data-jump]').forEach(btn => btn.addEventListener('click', () => { saveWritingAnswer(q); state.current = Number(btn.dataset.jump); renderQuestion(area); }));
    area.querySelector('#tocfl-prev')?.addEventListener('click', () => { saveWritingAnswer(q); state.current--; renderQuestion(area); });
    area.querySelector('#tocfl-next')?.addEventListener('click', () => {
      saveWritingAnswer(q);
      if (state.current >= state.questions.length - 1) return finishSession(area);
      state.current++;
      renderQuestion(area);
    });
  }

  function saveWritingAnswer(q) {
    if (q.type === 'writing') state.answers[state.current] = document.getElementById('tocfl-writing-answer')?.value || '';
  }

  function finishSession(area) {
    clearTimer();
    state.submitted = true;
    const objective = state.questions.filter(q => q.type !== 'writing');
    const correct = objective.filter(q => normalize(state.answers[state.questions.indexOf(q)]) === normalize(q.answer)).length;
    const pct = objective.length ? Math.round((correct / objective.length) * 100) : 0;
    const result = classifyResult(state.band, pct);
    const history = App.state.progress.tocflHistory || [];
    history.unshift({ band: state.band, skill: state.skill, examId: state.examId, pct, correct, total: objective.length, result, date: new Date().toISOString() });
    App.state.progress.tocflHistory = history.slice(0, 30);
    App.saveProgress();

    area.innerHTML = `
      <div class="tocfl-result-card">
        <h3>${objective.length ? `${pct}%` : 'Writing practice complete'}</h3>
        <p>${objective.length ? `${correct} of ${objective.length} objective questions correct · ${result}` : 'Review your writing against the model answers below.'}</p>
        <div class="tocfl-result-actions"><button type="button" class="btn btn-primary" id="tocfl-back-home">Back to TOCFL Center</button><button type="button" class="btn btn-outline" id="tocfl-review-mode">Open Review</button></div>
        <div class="tocfl-review-list">${state.questions.slice(0, 30).map((q, idx) => reviewRow(q, idx)).join('')}</div>
      </div>`;
    area.querySelector('#tocfl-back-home')?.addEventListener('click', () => { state.questions = []; state.submitted = false; renderWorkspace(); });
    area.querySelector('#tocfl-review-mode')?.addEventListener('click', () => { state.questions = []; state.mode = 'review'; document.querySelectorAll('.tocfl-mode').forEach(b => b.classList.toggle('active', b.dataset.mode === 'review')); renderWorkspace(); });
  }

  function reviewRow(q, idx) {
    const given = state.answers[idx] || 'No answer';
    const ok = q.type === 'writing' ? null : normalize(given) === normalize(q.answer);
    return `<article class="tocfl-review-row ${ok === false ? 'missed' : ''}"><div><strong>${idx + 1}. ${q.section}</strong><span>${ok === null ? 'Model' : ok ? 'Correct' : 'Review'}</span></div><p>Your answer: ${escapeHtml(given)}</p><p>Answer: ${escapeHtml(q.answer)}</p><small>${escapeHtml(q.explanation || '')}</small></article>`;
  }

  function renderReview(area) {
    const history = App.state.progress.tocflHistory || [];
    area.innerHTML = `
      <div class="tocfl-spec-card tocfl-command-card"><div><h3>Review History</h3><p>Track mock exam attempts and identify whether misses come from listening, reading, or writing.</p></div></div>
      ${history.length ? `<div class="tocfl-history">${history.map(h => `<div class="tocfl-history-row"><strong>${bands[h.band]?.label || h.band}</strong><span>${h.skill}</span><span>${h.pct}%</span><small>${h.result}</small></div>`).join('')}</div>` : '<div class="empty-state"><div class="es-icon">TO</div><h3>No TOCFL attempts yet</h3><p>Run a practice or mock exam first.</p></div>'}`;
  }

  function classifyResult(band, pct) {
    if (band === 'novice') return pct >= 60 ? 'Novice 2 ready' : pct >= 40 ? 'Novice 1 ready' : 'Build more foundations';
    if (band === 'bandA') return pct >= 60 ? 'A2 / Level 2 range' : pct >= 40 ? 'A1 / Level 1 range' : 'No pass range';
    return pct >= 65 ? 'B2 / Level 4 range' : pct >= 45 ? 'B1 / Level 3 range' : 'No pass range';
  }

  function startTimer() {
    clearTimer();
    state.timer = setInterval(() => {
      state.timeLeft -= 1;
      const timer = document.querySelector('.tocfl-timer');
      if (timer) timer.textContent = formatTime(Math.max(0, state.timeLeft));
      if (state.timeLeft <= 0) finishSession(document.getElementById('tocfl-workspace'));
    }, 1000);
  }

  function clearTimer() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function seededShuffle(items, seedText) {
    const arr = [...items];
    let seed = hash(seedText || 'tocfl');
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function hash(text) {
    return String(text).split('').reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) >>> 0, 2166136261);
  }

  function titleCase(text) { return String(text).charAt(0).toUpperCase() + String(text).slice(1); }
  function normalize(text) { return String(text || '').trim().toLowerCase().replace(/[。！？!?，,\s]/g, ''); }
  function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }

  return { render };
})();




