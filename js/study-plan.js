// Daily Smart Study Plan - 180 day deterministic planner
'use strict';

window.StudyPlanModule = (() => {
  const STORE_VERSION = 10;
  const TOTAL_DAYS = 180;
  const PLAN_KEY = 'studyPlanV10';
  const MONTH_COUNT = 6;
  const DAYS_PER_MONTH = 30;
  const WEEKS_PER_MONTH = 4;

  const ROUTES = {
    coach: '#/beginner-coach',
    launchpad: '#/beginner-launchpad',
    pinyin: '#/onboarding',
    pinyinTable: '#/pinyin-table',
    srs: '#/learn',
    mixed: '#/mixed-recall',
    sentence: '#/sentence-builder',
    grammar: '#/grammar',
    books: '#/vocabulary-books',
    dialogue: '#/dialogue',
    scenarios: '#/scenarios',
    reading: '#/reading',
    tocfl: '#/tocfl-content',
    tocflExam: '#/tocfl',
    exams: '#/exams',
    mockReading: '#/mock-test/reading',
    mockListening: '#/mock-test/listening',
    vocabQuiz: '#/quiz/vocabulary',
    pronQuiz: '#/quiz/pronunciation',
    flashQuiz: '#/quiz/flash',
    toneQuiz: '#/quiz/tones',
    flashcards: '#/flashcards',
    vocabulary: '#/vocabulary',
    library: '#/library',
    playground: '#/playground',
    charPlayground: '#/char-playground',
    chapters: '#/chapters'
  };

  const STUDY_ROTATION = [
    'coach', 'srs', 'sound', 'course', 'sentence', 'quiz',
    'coach', 'vocabulary', 'grammar', 'dialogue', 'flashcards', 'quiz',
    'coach', 'sound', 'bookQuiz', 'scenario', 'sentence', 'mixed',
    'coach', 'picture', 'grammar', 'character', 'reading', 'quiz',
    'coach', 'vocabulary', 'course', 'playground', 'tocfl', 'mixed'
  ];

  let catalog = null;

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function localDateKey(date = new Date()) {
    const d = new Date(date);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function addDays(dateKey, days) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    return localDateKey(date);
  }

  function daysBetween(startKey, endKey) {
    const [sy, sm, sd] = startKey.split('-').map(Number);
    const [ey, em, ed] = endKey.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    return Math.max(0, Math.floor((end - start) / 86400000));
  }

  function clampDay(day) {
    return Math.max(1, Math.min(TOTAL_DAYS, Number(day) || 1));
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function ensurePlan() {
    const p = App.state.progress;
    const today = localDateKey();
    if (!p[PLAN_KEY] || p[PLAN_KEY].version !== STORE_VERSION) {
      p[PLAN_KEY] = {
        version: STORE_VERSION,
        startDate: today,
        selectedDay: 1,
        selectedMonth: 1,
        completedByDay: {},
        completedDays: [],
        skippedByDay: {},
        refreshOffsets: {},
        refreshHistory: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      App.saveProgress();
    }
    const plan = p[PLAN_KEY];
    const calendarDay = clampDay(daysBetween(plan.startDate, today) + 1);
    if (!plan.selectedDay) plan.selectedDay = calendarDay;
    plan.selectedDay = clampDay(plan.selectedDay);
    plan.selectedMonth = monthForDay(plan.selectedDay);
    plan.completedByDay ||= {};
    plan.completedDays ||= [];
    plan.skippedByDay ||= {};
    plan.refreshOffsets ||= {};
    plan.refreshHistory ||= [];
    return plan;
  }

  function savePlan() {
    const plan = ensurePlan();
    plan.updatedAt = new Date().toISOString();
    App.saveProgress();
  }

  function dayCompletedTasks(day) {
    const plan = ensurePlan();
    return plan.completedByDay[String(day)] || [];
  }

  function isTaskDone(day, taskId) {
    return dayCompletedTasks(day).includes(taskId);
  }

  function currentDayNumber() {
    return ensurePlan().selectedDay;
  }

  function monthForDay(day) {
    return Math.min(MONTH_COUNT, Math.floor((clampDay(day) - 1) / DAYS_PER_MONTH) + 1);
  }

  function setMonth(month) {
    const plan = ensurePlan();
    const m = Math.max(1, Math.min(MONTH_COUNT, Number(month) || 1));
    plan.selectedMonth = m;
    plan.selectedDay = (m - 1) * DAYS_PER_MONTH + 1;
    savePlan();
    render(document.getElementById('page-content'));
  }

  function setWeek(month, week) {
    const m = Math.max(1, Math.min(MONTH_COUNT, Number(month) || 1));
    const w = Math.max(1, Math.min(WEEKS_PER_MONTH, Number(week) || 1));
    setDay((m - 1) * DAYS_PER_MONTH + ((w - 1) * 7) + 1);
  }

  function setDay(day) {
    const plan = ensurePlan();
    plan.selectedDay = clampDay(day);
    plan.selectedMonth = monthForDay(plan.selectedDay);
    savePlan();
    render(document.getElementById('page-content'));
  }

  function markDone(taskId) {
    const plan = ensurePlan();
    const day = String(plan.selectedDay);
    const dayPlan = getDayPlan(plan.selectedDay);
    plan.completedByDay[day] ||= [];
    if (!plan.completedByDay[day].includes(taskId)) plan.completedByDay[day].push(taskId);
    if (plan.completedByDay[day].length >= dayPlan.tasks.length && !plan.completedDays.includes(Number(day))) {
      plan.completedDays.push(Number(day));
      App.logActivity('Study', `Completed Study Plan Day ${day}`);
    }
    savePlan();
    render(document.getElementById('page-content'));
  }

  function markDayComplete() {
    const day = currentDayNumber();
    const tasks = getDayPlan(day).tasks.map(t => t.id);
    const plan = ensurePlan();
    plan.completedByDay[String(day)] = Array.from(new Set([...(plan.completedByDay[String(day)] || []), ...tasks]));
    if (!plan.completedDays.includes(day)) plan.completedDays.push(day);
    savePlan();
    render(document.getElementById('page-content'));
  }

  function skipTask(taskId) {
    const plan = ensurePlan();
    const day = String(plan.selectedDay);
    plan.skippedByDay[day] ||= [];
    if (!plan.skippedByDay[day].includes(taskId)) plan.skippedByDay[day].push(taskId);
    markDone(taskId);
  }

  function resetPlan() {
    if (!confirm('Reset the 180-day study plan memory? Your learned cards and other progress stay untouched.')) return;
    delete App.state.progress[PLAN_KEY];
    ensurePlan();
    savePlan();
    render(document.getElementById('page-content'));
  }

  function goToToday() {
    const plan = ensurePlan();
    const today = clampDay(daysBetween(plan.startDate, localDateKey()) + 1);
    plan.selectedDay = today;
    plan.selectedMonth = monthForDay(today);
    savePlan();
    render(document.getElementById('page-content'));
  }

  function refreshToday() {
    render(document.getElementById('page-content'));
  }

  function pick(list, index, fallback = null) {
    if (!list || !list.length) return fallback;
    return list[((index % list.length) + list.length) % list.length];
  }

  function occurrenceIndex(day, includeFn, kindFn, wantedKind) {
    let count = 0;
    for (let d = 1; d < day; d++) {
      if (!includeFn(d)) continue;
      if (kindFn && kindFn(d) !== wantedKind) continue;
      count++;
    }
    return count;
  }

  function isMemoryVocabScheduled(d) {
    if (weekType(d) === 'checkpoint') return false;
    if (d <= 28) return false;
    if (memoryKind(d) !== 'vocabulary') return false;
    if (weekType(d) === 'study') {
      return (d - 1) % 2 === 0;
    }
    return true; // review days always run memoryTask
  }

  function vocabOccurrenceIndex(day) {
    let count = 0;
    for (let d = 1; d < day; d++) {
      if (isMemoryVocabScheduled(d)) count++;
      if (d > 28 && weekType(d) === 'study' && skillKind(d) === 'vocabulary') count++;
    }
    return count;
  }

  function phaseForDay(day) {
    if (day <= 30) return { id: 'foundation', label: 'Month 1 Foundation', goal: 'Pinyin, tones, survival words, and reliable daily habits.' };
    if (day <= 60) return { id: 'book1', label: 'Month 2 Book 1', goal: 'Finish Book 1 foundations with grammar, vocabulary, and sentence output.' };
    if (day <= 90) return { id: 'book2', label: 'Month 3 Book 2', goal: 'Move through Book 2 and start longer dialogues, scenarios, and reading.' };
    if (day <= 120) return { id: 'a2', label: 'Month 4 A2 Build', goal: 'Strengthen reading, listening, grammar range, and active recall.' };
    if (day <= 150) return { id: 'tocfl', label: 'Month 5 TOCFL Bridge', goal: 'Use native-style TOCFL content, mock tests, and timed checks.' };
    return { id: 'b1', label: 'Month 6 B1 Bridge', goal: 'Consolidate every section with weekly exams and output practice.' };
  }

  function weekType(day) {
    const pos = ((day - 1) % 7) + 1;
    if (pos === 7) return 'checkpoint';
    if (pos === 6) return 'review';
    return 'study';
  }

  function routeWithParams(route, params = {}) {
    const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
    if (!entries.length) return route;
    return route + '?' + entries.map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value))).join('&');
  }

  function itemLabel(item, fallback) {
    return item?.title || item?.name || item?.label || item?.id || fallback;
  }

  function countNested(list, key) {
    return (list || []).reduce((sum, item) => sum + (Array.isArray(item?.[key]) ? item[key].length : 0), 0);
  }

  function flattenGrammar(data) {
    const out = [];
    (data?.levels || []).forEach(level => {
      (level.units || []).forEach(unit => out.push({
        id: unit.id,
        title: unit.title,
        level: level.label || level.id,
        levelId: level.id,
        route: routeWithParams(ROUTES.grammar, { level: level.id, unit: unit.id, tab: 'learn' })
      }));
    });
    return out;
  }

  function flattenSentence(data) {
    return (data?.levels || []).map(level => ({
      id: level.id,
      title: level.title,
      detail: `${level.sentences?.length || level.targetCount || 0} sentence prompts`,
      route: routeWithParams(ROUTES.sentence, { level: level.id, mode: 'curriculum', size: 20 })
    }));
  }

  function flattenTocfl(data) {
    const out = [];
    (data?.levels || []).forEach(level => {
      (level.sections || []).forEach(section => out.push({
        id: section.id,
        title: `${level.title} - ${section.title}`,
        levelKey: level.key,
        skill: section.skill,
        count: section.questionCount,
        route: routeWithParams(ROUTES.tocfl, { level: level.key, section: section.id, mode: 'test' })
      }));
    });
    return out;
  }

  function flattenBooks(book1, book2) {
    return []
      .concat((book1 || []).map(ch => ({ ...ch, route: routeWithParams(ROUTES.books, { book: 1, chapter: ch.chapter }), bookLabel: 'Book 1' })))
      .concat((book2 || []).map(ch => ({ ...ch, route: routeWithParams(ROUTES.books, { book: 2, chapter: ch.chapter }), bookLabel: 'Book 2' })));
  }

  function flattenVocabulary(data) {
    const sets = Array.isArray(data?.sets) ? data.sets : Object.values(data?.sets || {});
    return sets.map((set, index) => ({
      id: set.id || String(index + 1),
      title: set.title || set.name || set.id || `Set ${index + 1}`,
      level: String(set.level || 'novice').toLowerCase(),
      count: set.items?.length || set.words?.length || set.vocabulary?.length || 0,
      route: routeWithParams(ROUTES.vocabulary, { set: set.id || String(index + 1) })
    }));
  }

  function flattenPictureCategories(data) {
    return Object.entries(data?.categories || {}).map(([id, items]) => ({
      id,
      title: id,
      count: Array.isArray(items) ? items.length : 0,
      route: routeWithParams(ROUTES.flashQuiz, { category: id })
    }));
  }

  function flattenCharacterPlayground(data) {
    return (data || []).map(section => ({
      id: section.id,
      title: section.title,
      count: section.lessons?.length || 0,
      route: routeWithParams(ROUTES.charPlayground, { section: section.id })
    }));
  }

  function flattenPlayground(data) {
    return (data || []).map(section => ({
      id: section.id,
      title: section.title,
      count: section.lessons?.length || 0,
      route: routeWithParams(ROUTES.playground, { section: section.id })
    }));
  }

  function flattenLaunchpad(levelOne, levelTwo, levelThree) {
    const configs = [
      { id: 'level-1', label: 'Launchpad Level 1', data: levelOne, prefix: '#/beginner-launchpad' },
      { id: 'level-2', label: 'Launchpad Level 2', data: levelTwo, prefix: '#/beginner-launchpad/level-2' },
      { id: 'level-3', label: 'Launchpad Level 3', data: levelThree, prefix: '#/beginner-launchpad/level-3' }
    ];
    return configs.flatMap(config => (config.data?.lessons || []).map((lesson, index) => ({
      id: lesson.id || `${config.id}-${index + 1}`,
      title: `${config.label}: ${lesson.title || 'Lesson ' + (index + 1)}`,
      levelId: config.id,
      levelLabel: config.label,
      number: index + 1,
      detail: lesson.canDo || lesson.pattern || 'Beginner Launchpad lesson',
      route: `${config.prefix}/${String(index + 1).padStart(2, '0')}`
    })));
  }

  function difficultyForDay(day) {
    if (day <= 45) return 'novice';
    if (day <= 90) return 'a1';
    if (day <= 150) return 'a2';
    return 'b1';
  }

  function vocabQuizRoute(day) {
    return routeWithParams(ROUTES.vocabQuiz, { source: 'level', level: difficultyForDay(day) });
  }

  function pronunciationQuizRoute(day) {
    return routeWithParams(ROUTES.pronQuiz, { source: 'level', level: difficultyForDay(day) });
  }

  function grammarForDay(cat, index, day) {
    const allowed = day <= 30 ? ['beginner'] : day <= 90 ? ['beginner', 'novice'] : ['beginner', 'novice', 'bridge'];
    return pick((cat.grammar || []).filter(g => allowed.includes(g.levelId)), index) || pick(cat.grammar, index);
  }

  function sentenceForDay(cat, index, day) {
    const allowed = day <= 45 ? ['novice_1', 'novice_2'] : day <= 90 ? ['novice_1', 'novice_2', 'a1_1', 'a1_2'] : ['novice_1', 'novice_2', 'a1_1', 'a1_2', 'a2_1', 'a2_2'];
    return pick((cat.sentence || []).filter(s => allowed.includes(s.id)), index) || pick(cat.sentence, index);
  }

  function vocabForDay(cat, index, day) {
    return cat.vocabulary[index % cat.vocabulary.length];
  }

  function bookForDay(cat, index, day) {
    if (day <= 30) {
      const preview = Math.floor((day - 1) / 6);
      return pick((cat.books || []).filter(b => b.bookLabel === 'Book 1'), preview);
    }
    if (day <= 75) {
      const chapter = Math.floor((day - 31) / 3);
      return pick((cat.books || []).filter(b => b.bookLabel === 'Book 1'), chapter);
    }
    if (day <= 120) {
      const chapter = Math.floor((day - 76) / 3);
      return pick((cat.books || []).filter(b => b.bookLabel === 'Book 2'), chapter);
    }
    const review = Math.floor((day - 121) / 3);
    return pick(cat.books, review);
  }

  function launchpadSequenceIndex(day) {
    let count = 0;
    for (let d = 1; d <= day; d++) {
      if (d <= 28 && weekType(d) === 'study') count++;
    }
    return Math.max(0, count - 1) * 3;
  }

  function launchpadBundleForDay(cat, index, day) {
    const sequence = launchpadSequenceIndex(day);
    return (cat.launchpad || []).slice(sequence, sequence + 3);
  }

  function launchpadForDay(cat, index, day) {
    return launchpadBundleForDay(cat, index, day)[0] || pick(cat.launchpad, index);
  }

  async function loadCatalog() {
    if (catalog) return catalog;
    const safe = async (path, fallback) => {
      try { return await API.get(path); } catch (_) { return fallback; }
    };
    const [
      coach, sentence, grammar, scenarios, readings, tocfl, monthly, mocks,
      book1, book2, dialogues, vocabulary, pictureFlash, pinyinFull,
      charPlayground, playground, launchpad1, launchpad2, launchpad3
    ] = await Promise.all([
      safe('beginner_coach_content', []),
      safe('sentence_builder_levels', { levels: [] }),
      safe('grammar_academy', { levels: [] }),
      safe('scenarios_content', []),
      safe('readings', []),
      safe('tocfl_native_bank', { levels: [] }),
      safe('monthly_exams', []),
      safe('mock-tests', []),
      safe('book1_content', []),
      safe('book2_content', []),
      safe('dialogues', []),
      safe('vocabulary', { sets: {} }),
      safe('picture_flashcards', { categories: [] }),
      safe('pinyin_mastery_full', { counts: {}, stages: [] }),
      safe('char_playground_content', []),
      safe('playground_content', []),
      safe('beginner_launchpad', { lessons: [] }),
      safe('beginner_launchpad_level2', { lessons: [] }),
      safe('beginner_launchpad_level3', { lessons: [] })
    ]);
    const books = flattenBooks(book1, book2);
    const grammarFlat = flattenGrammar(grammar);
    const sentenceFlat = flattenSentence(sentence);
    const tocflFlat = flattenTocfl(tocfl);
    const vocabFlat = flattenVocabulary(vocabulary);
    const levelOrder = { novice: 1, a1: 2, a2: 3, b1: 4, 'a2/b1': 5 };
    vocabFlat.sort((a, b) => {
      const la = levelOrder[a.level] || 99;
      const lb = levelOrder[b.level] || 99;
      return la - lb;
    });
    const pictureFlat = flattenPictureCategories(pictureFlash);
    const charPlay = flattenCharacterPlayground(charPlayground);
    const play = flattenPlayground(playground);
    const launchpad = flattenLaunchpad(launchpad1, launchpad2, launchpad3);
    catalog = {
      coach,
      sentence: sentenceFlat,
      grammar: grammarFlat,
      scenarios,
      readings,
      tocfl: tocflFlat,
      monthly,
      mocks,
      books,
      book1,
      book2,
      dialogues,
      vocabulary: vocabFlat,
      pictureFlash: pictureFlat,
      pinyinFull,
      charPlayground: charPlay,
      playground: play,
      launchpad,
      counts: {
        coach: coach.length,
        book1: book1.length,
        book2: book2.length,
        books: books.length,
        bookQuizzes: countNested(books, 'quizzes'),
        sentence: sentenceFlat.length,
        grammar: grammar.totals?.units || grammarFlat.length,
        scenarios: scenarios.length,
        scenarioLessons: countNested(scenarios, 'scenarios'),
        readings: readings.length,
        tocfl: tocflFlat.length,
        tocflQuestions: tocfl?.stats?.questions || tocflFlat.reduce((sum, s) => sum + (s.count || 0), 0),
        monthly: monthly.length,
        mocks: mocks.length,
        dialogues: dialogues.length,
        vocabularySets: vocabFlat.length,
        pictureFlash: pictureFlat.length,
        pinyinStages: pinyinFull?.stages?.length || 0,
        pinyinToneSyllables: pinyinFull?.toneSyllables?.length || pinyinFull?.counts?.toneSyllables || 0,
        charPlayground: charPlay.length,
        playground: play.length,
        launchpad: launchpad.length,
        launchpad1: launchpad1.lessons?.length || 0,
        launchpad2: launchpad2.lessons?.length || 0,
        launchpad3: launchpad3.lessons?.length || 0
      }
    };
    return catalog;
  }

  function task(id, skill, minutes, title, detail, route, action = 'Open', meta = '') {
    return { id, skill, minutes, title, detail, route, action, meta };
  }

  function coreTask(cat, day, index, phase) {
    const pack = pick(cat.coach, index, { pack_number: day, title: `Beginner Coach Pack ${day}`, topic: 'Daily Chinese' });
    return task('coach', 'Main Course', 22, `Beginner Coach Pack ${pack?.pack_number || day}`, `${pack?.title || ''} ${pack?.topic ? '- ' + pack.topic : ''}`.trim(), `#/beginner-coach/pack/${pack?.pack_number || day}`, 'Open Pack', pack?.level || phase.label);
  }

  function soundTask(cat, day, index) {
    const stage = day <= 20 ? 'core80' : day <= 60 ? 'core250' : 'all';
    const choices = [
      task('pinyin', 'Sound', 12, 'Pinyin and tones lab', 'Use local human audio first, then only fallback where files are missing.', ROUTES.pinyin, 'Human Lab'),
      task('pinyin-table', 'Sound', 12, `Pinyin table stage: ${stage}`, 'Listen and repeat whole syllables with tones before moving on.', routeWithParams(ROUTES.pinyinTable, { stage }), 'Pinyin Table'),
      task('tone-quiz', 'Tone Test', 10, 'Tone Training', 'Identify tones from the quiz bank and repair missed sound patterns.', ROUTES.toneQuiz, 'Tone Quiz'),
      task('pronunciation', 'Pronunciation', 10, 'Pronunciation Quiz', 'Test syllables and tones using the app audio priority path.', ROUTES.pronQuiz, 'Pronunciation')
    ];
    return pick(choices, index);
  }

  function memoryKind(day) {
    const sequence = ['srs', 'vocabulary', 'flashcards', 'vocabulary', 'vocabulary'];
    const idx = occurrenceIndex(day, d => weekType(d) !== 'checkpoint' && d > 28);
    return pick(sequence, idx);
  }

  function memoryTask(cat, index, day) {
    const kind = memoryKind(day);
    const kindIndex = occurrenceIndex(day, d => weekType(d) !== 'checkpoint' && d > 28, memoryKind, kind);
    const vocabIndex = vocabOccurrenceIndex(day);
    const vocab = vocabForDay(cat, vocabIndex, day);
    if (kind === 'vocabulary') return task('vocabulary', 'Vocabulary', 12, vocab ? `Vocabulary group: ${vocab.title}` : 'Vocabulary thematic groups', vocab ? `${vocab.count || 0} items from the vocabulary library.` : 'Study one thematic group from the vocabulary library.', vocab?.route || ROUTES.vocabulary, 'Vocabulary');
    if (kind === 'flashcards') return task('flashcards', 'Memory', 10, 'Flashcards', 'Review active cards and mark weak characters for later repair.', ROUTES.flashcards, 'Flashcards');
    if (kind === 'vocab-quiz') return task('vocab-quiz', 'Vocabulary Test', 10, `${difficultyForDay(day).toUpperCase()} Vocabulary Quiz`, 'Check recall at today\'s planned level only.', vocabQuizRoute(day), 'Vocab Quiz');
    return task('srs', 'Memory', 8, 'Review memory cards', 'Clear due cards or add a small new-card batch.', ROUTES.srs, 'Open SRS');
  }

  function skillKind(day) {
    const sequence = day <= 60
      ? ['vocabulary', 'grammar', 'sentence', 'vocabulary']
      : ['vocabulary', 'grammar', 'sentence', 'vocabulary', 'grammar', 'sentence'];
    const idx = occurrenceIndex(day, d => weekType(d) === 'study' && d > 28);
    return pick(sequence, idx);
  }

  function skillTask(cat, day) {
    const kind = skillKind(day);
    const kindIndex = occurrenceIndex(day, d => weekType(d) === 'study' && d > 28, skillKind, kind);
    if (kind === 'grammar') {
      const grammar = grammarForDay(cat, kindIndex, day);
      return task('grammar', 'Grammar', 12, itemLabel(grammar, 'Grammar Academy'), grammar?.level || 'Study one Grammar Academy unit.', grammar?.route || ROUTES.grammar, 'Grammar');
    }
    if (kind === 'sentence') {
      const sentence = sentenceForDay(cat, kindIndex, day);
      return task('sentence', 'Output', 12, itemLabel(sentence, 'Sentence Builder'), sentence?.detail || 'Build sentences from the app prompts.', sentence?.route || ROUTES.sentence, 'Build');
    }
    const index = day - 1;
    const memoryVocabActive = (index % 2 === 0) && (memoryKind(day) === 'vocabulary');
    const vocabIndex = vocabOccurrenceIndex(day) + (memoryVocabActive ? 1 : 0);
    const vocab = vocabForDay(cat, vocabIndex, day);
    return task('vocabulary', 'Vocabulary', 12, vocab ? `Vocabulary group: ${vocab.title}` : 'Vocabulary thematic groups', vocab ? `${vocab.count || 0} items from the vocabulary library.` : 'Study one thematic group from the vocabulary library.', vocab?.route || ROUTES.vocabulary, 'Vocabulary');
  }

  function launchpadTask(cat, index, day) {
    const lessons = launchpadBundleForDay(cat, index, day);
    const first = lessons[0];
    const last = lessons[lessons.length - 1];
    const sameLevel = lessons.every(lesson => lesson.levelId === first?.levelId);
    const title = lessons.length > 1
      ? (sameLevel ? `${first.levelLabel}: Lessons ${first.number}-${last.number}` : `Beginner Launchpad: Lessons ${first.levelLabel.replace('Launchpad ', '')} #${first.number} - ${last.levelLabel.replace('Launchpad ', '')} #${last.number}`)
      : itemLabel(first, 'Beginner Launchpad');
    const detail = lessons.length > 1
      ? lessons.map(lesson => `${lesson.levelLabel.replace('Launchpad ', '')} #${lesson.number}: ${lesson.title.replace(/^.*?:\s*/, '')}`).join(' / ')
      : (first?.detail || 'Work through the correct beginner launchpad level.');
    return task('launchpad', 'Beginner Track', 24, title, detail, first?.route || ROUTES.launchpad, 'Start 3 Lessons', sameLevel ? first?.levelLabel || '' : 'L1-L3');
  }

  function courseTask(cat, index, day) {
    const book = bookForDay(cat, index, day);
    const grammar = grammarForDay(cat, index, day);
    const sentence = sentenceForDay(cat, index, day);
    if (day <= 30) {
      const choices = [
        task('grammar', 'Grammar', 12, itemLabel(grammar, 'Beginner Grammar'), grammar?.level || 'Study one beginner grammar unit.', grammar?.route || ROUTES.grammar, 'Grammar'),
        task('sentence', 'Output', 12, itemLabel(sentence, 'Novice Sentence Builder'), sentence?.detail || 'Build beginner sentences from existing prompts.', sentence?.route || ROUTES.sentence, 'Build'),
        task('course-preview', 'Course Preview', 12, book ? `${book.bookLabel} Lesson ${book.chapter}: ${book.title}` : 'Book 1 preview', 'Light Book 1 preview only. Full course pace starts after the Launchpad foundation.', book?.route || ROUTES.books, 'Preview')
      ];
      return pick(choices, index);
    }
    const cycle = (day - 31) % 3;
    if (cycle === 2) return task('book-quiz', 'Course Quiz', 12, book ? `${book.bookLabel} Lesson ${book.chapter} quiz` : 'Course book quiz', 'Use this day for the chapter quiz and repair.', book?.route || ROUTES.books, 'Chapter Quiz');
    if (cycle === 1) return task('course-book', 'Course', 18, book ? `${book.bookLabel} Lesson ${book.chapter}: practice` : 'Course practice', 'Second pass: listening, dialogue, vocabulary, and example sentences for the same chapter.', book?.route || ROUTES.books, 'Practice');
    return task('course-book', 'Course', 18, book ? `${book.bookLabel} Lesson ${book.chapter}: ${book.title}` : 'Course Books', book?.intro || 'Study one Book 1 or Book 2 lesson. One chapter is paced across about three days.', book?.route || ROUTES.books, 'Course');
  }

  function contextKind(day) {
    const sequence = day <= 60
      ? ['dialogue', 'reading', 'playground', 'char-play', 'scenario', 'reading']
      : ['reading', 'scenario', 'playground', 'dialogue', 'reading', 'char-play'];
    const idx = occurrenceIndex(day, d => weekType(d) !== 'checkpoint');
    return pick(sequence, idx);
  }

  function contextTask(cat, index, day) {
    const kind = contextKind(day);
    const kindIndex = occurrenceIndex(day, d => weekType(d) !== 'checkpoint', contextKind, kind);
    const dialogue = pick(cat.dialogues, kindIndex);
    const scenario = pick(cat.scenarios, kindIndex);
    const reading = pick(cat.readings, kindIndex);
    const charPlay = pick(cat.charPlayground, kindIndex);
    const play = pick(cat.playground, kindIndex);
    if (kind === 'dialogue') return task('dialogue', 'Dialogue', 15, itemLabel(dialogue, 'Dialogue Practice'), dialogue?.scene || 'Listen, shadow, and speak one dialogue.', ROUTES.dialogue, 'Dialogue');
    if (kind === 'scenario') return task('scenario', 'Scenario', 15, itemLabel(scenario, 'Everyday Scenario'), scenario?.description || 'Practice one everyday scenario module.', ROUTES.scenarios, 'Scenario');
    if (kind === 'char-play') return task('char-play', 'Characters', 12, itemLabel(charPlay, 'Character Playground'), `${charPlay?.count || 0} lessons from character playground.`, charPlay?.route || ROUTES.charPlayground, 'Characters');
    if (kind === 'playground') return task('playground', 'Launchpad', 12, itemLabel(play, 'Beginner Playground'), `${play?.count || 0} lessons from the beginner playground.`, play?.route || ROUTES.playground, 'Playground');
    return task('reading', 'Reading', 15, itemLabel(reading, 'Reading Practice'), reading?.description || 'Read one passage and answer its questions.', ROUTES.reading, 'Read');
  }

  function testKind(day) {
    const sequence = day <= 45
      ? ['mixed', 'picture', 'vocab-quiz', 'sound-test']
      : day <= 90
        ? ['mixed', 'picture', 'vocab-quiz', 'sound-test', 'picture']
        : day <= 120
          ? ['tocfl', 'mock', 'monthly', 'picture', 'vocab-quiz', 'mixed']
          : ['tocfl', 'mock', 'monthly', 'tocfl', 'picture', 'vocab-quiz', 'mixed'];
    return pick(sequence, day - 1);
  }

  function testTask(cat, index, day) {
    const kind = testKind(day);
    const kindIndex = occurrenceIndex(day, () => true, testKind, kind);
    const tocfl = pick(cat.tocfl, kindIndex);
    const mock = pick(cat.mocks, kindIndex);
    const monthly = pick(cat.monthly, kindIndex);
    const picture = pick(cat.pictureFlash, kindIndex);
    if (kind === 'picture') return task('picture-flash', 'Picture Test', 10, picture ? `Picture Flash Quiz: ${picture.title}` : 'Picture Flash Quiz', picture ? `${picture.count || 0} visual cards in this category.` : 'Use the picture flash quiz.', picture?.route || ROUTES.flashQuiz, 'Picture Quiz');
    if (kind === 'vocab-quiz') return task('vocab-quiz', 'Vocabulary Test', 10, `${difficultyForDay(day).toUpperCase()} Vocabulary Quiz`, 'Quiz only the current planned level.', vocabQuizRoute(day), 'Vocab Quiz');
    if (kind === 'sound-test') return task('sound-test', 'Sound Test', 10, 'Tone or pronunciation check', 'Retest beginner sound work before hard content.', kindIndex % 2 ? pronunciationQuizRoute(day) : ROUTES.toneQuiz, 'Sound Test');
    if (kind === 'tocfl') return task('tocfl', 'TOCFL', 18, itemLabel(tocfl, 'TOCFL native item set'), `${tocfl?.skill || 'listening/reading'} practice from the existing bank.`, tocfl?.route || ROUTES.tocfl, 'TOCFL');
    if (kind === 'mock') return task('mock-reading', 'Mock Test', 20, itemLabel(mock, 'Reading mock test'), mock?.difficulty || 'Use an available reading/listening mock test.', mock?.type === 'listening' ? ROUTES.mockListening : ROUTES.mockReading, 'Mock');
    if (kind === 'monthly') return task('monthly', 'Monthly Test', 20, itemLabel(monthly, 'Monthly exam'), monthly?.description || 'Use the monthly exam plan.', ROUTES.exams, 'Exam');
    return task('mixed', 'Recall', 12, 'Mixed Recall', 'End with active recall so misses feed the weakness engine.', ROUTES.mixed, 'Recall');
  }

  function uniqueTasks(tasks) {
    const seen = new Set();
    const out = [];
    tasks.forEach((item, idx) => {
      const signature = [item.title, item.route, item.skill].join('|');
      if (seen.has(signature)) return;
      seen.add(signature);
      let id = item.id;
      while (out.some(existing => existing.id === id)) id = `${item.id}-${idx + 1}`;
      out.push({ ...item, id });
    });
    return out;
  }

  function learnedSummary(cat, startDay, endDay) {
    const packs = [];
    const books = [];
    const grammar = [];
    const sentence = [];
    const context = [];
    for (let day = startDay; day <= endDay; day++) {
      const idx = day - 1;
      const pack = pick(cat.coach, idx);
      const book = day <= 30 ? launchpadForDay(cat, idx, day) : bookForDay(cat, Math.floor(idx / 2), day);
      const gram = grammarForDay(cat, Math.floor(idx / 2), day);
      const sent = sentenceForDay(cat, Math.floor(idx / 3), day);
      const ctx = pick([pick(cat.dialogues, idx), pick(cat.scenarios, idx), pick(cat.readings, idx)].filter(Boolean), day);
      if (pack) packs.push(`Pack ${pack.pack_number || day}`);
      if (book) books.push(book.bookLabel ? `${book.bookLabel} ${book.chapter}` : itemLabel(book, 'Launchpad'));
      if (gram) grammar.push(gram.title);
      if (sent) sentence.push(sent.title);
      if (ctx) context.push(ctx.title);
    }
    const fmt = list => Array.from(new Set(list)).slice(0, 6).join(', ') || 'recent items';
    return { packs: fmt(packs), books: fmt(books), grammar: fmt(grammar), sentence: fmt(sentence), context: fmt(context) };
  }

  function getDayPlan(day = currentDayNumber()) {
    const cat = catalog || {};
    const plan = ensurePlan();
    const offset = 0;
    const index = day - 1;
    const phase = phaseForDay(day);
    const type = weekType(day);
    const week = Math.ceil(day / 7);
    const month = monthForDay(day);
    const weekInMonth = Math.min(WEEKS_PER_MONTH, Math.floor(((day - 1) % DAYS_PER_MONTH) / 7) + 1);
    const pack = pick(cat.coach, index, { pack_number: day, title: `Beginner Coach Pack ${day}`, topic: 'Daily Chinese' });
    const title = type === 'checkpoint'
      ? `Day ${day}: Week ${week} checkpoint`
      : type === 'review'
        ? `Day ${day}: Review Days ${Math.max(1, day - 5)}-${day - 1}`
        : `Day ${day}: ${pack?.topic || pack?.title || 'Daily study'}`;

    let tasks = [];
    if (type === 'checkpoint') {
      const startDay = Math.max(1, day - 6);
      const learned = learnedSummary(cat, startDay, day - 1);
      tasks = [
        coreTask(cat, day, index, phase),
        task('week-recall', 'Week Review', 15, `Review Days ${startDay}-${day - 1}`, `Packs: ${learned.packs}. Beginner/course track: ${learned.books}.`, ROUTES.mixed, 'Review'),
        task('week-flashcards', 'Memory', 12, 'Flashcards and weak cards', 'Clear all due cards and repair weak characters from this week.', ROUTES.flashcards, 'Flashcards'),
        task('week-sound', 'Sound Check', 10, 'Tone and pronunciation check', 'Retest pinyin, tones, and pronunciation from the last six days at the planned level.', index % 2 ? pronunciationQuizRoute(day) : ROUTES.toneQuiz, 'Sound Test'),
        task('week-output', 'Output Check', 15, `Sentence and grammar review`, `Sentence: ${learned.sentence}. Grammar: ${learned.grammar}.`, ROUTES.sentence, 'Output'),
        task('week-context', 'Context Review', 15, `Dialogue, scenario, and reading review`, `Revisit: ${learned.context}.`, ROUTES.dialogue, 'Context'),
        testTask(cat, Math.floor(index / 2), day)
      ];
    } else if (type === 'review') {
      tasks = [
        coreTask(cat, day, index, phase),
        memoryTask(cat, index, day),
        soundTask(cat, day, index),
        courseTask(cat, Math.floor(index / 2), day),
        contextTask(cat, index, day),
        testTask(cat, index, day),
        task('repair', 'Repair', 12, 'Mixed Recall repair', 'Use missed answers from the week before adding new content.', ROUTES.mixed, 'Repair')
      ];
    } else {
      const rotationOffset = STUDY_ROTATION.indexOf(STUDY_ROTATION[index % STUDY_ROTATION.length]);
      tasks = [
        coreTask(cat, day, index, phase),
        day <= 28 ? launchpadTask(cat, index, day) : (index % 2 === 0 ? memoryTask(cat, index, day) : soundTask(cat, day, index)),
        courseTask(cat, Math.floor(index / 2), day),
        contextTask(cat, index + rotationOffset, day),
        testTask(cat, index, day),
        day > 28 ? skillTask(cat, day) : (index % 3 === 0 ? soundTask(cat, day, index + 1) : memoryTask(cat, index + 1, day))
      ];
    }

    return {
      day,
      date: addDays(plan.startDate, day - 1),
      week,
      weekInMonth,
      month,
      phase,
      type,
      title,
      focus: type === 'checkpoint' ? 'Review and test everything learned in the last six days.' : type === 'review' ? 'Repair weak areas before the weekly checkpoint.' : phase.goal,
      pack,
      tasks: uniqueTasks(tasks),
      offset
    };
  }

  function overallPct() {
    const plan = ensurePlan();
    return Math.round(((plan.completedDays || []).length / TOTAL_DAYS) * 100);
  }

  function todayPct(day) {
    const dayPlan = getDayPlan(day);
    const total = Math.max(1, dayPlan.tasks.length);
    return Math.round((dayCompletedTasks(day).length / total) * 100);
  }

  function renderTaskCard(dayPlan, item) {
    const checked = isTaskDone(dayPlan.day, item.id);
    const skipped = (ensurePlan().skippedByDay[String(dayPlan.day)] || []).includes(item.id);
    return `
      <article class="study-task ${checked ? 'complete' : ''}">
        <div class="study-task-check">${checked ? (window.IconSystem ? window.IconSystem.svg('check') : 'Done') : ''}</div>
        <div class="study-task-main">
          <div class="study-task-kicker">${esc(item.skill)} - ${esc(item.minutes)} min${item.meta ? ' - ' + esc(item.meta) : ''}</div>
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.detail)}</p>
          ${skipped ? '<p class="text-small text-muted">Skipped and carried forward in memory.</p>' : ''}
          <div class="study-task-actions">
            <a class="btn btn-primary btn-sm" href="${esc(item.route)}">${esc(item.action)}</a>
            <button class="btn btn-ghost btn-sm" onclick="StudyPlanModule.markDone('${esc(item.id)}')">${checked ? 'Done' : 'Mark Done'}</button>
            <button class="btn btn-ghost btn-sm" onclick="StudyPlanModule.skipTask('${esc(item.id)}')">Skip Carry</button>
          </div>
        </div>
      </article>`;
  }

  function renderCoverage(cat) {
    const counts = cat.counts || {};
    const rows = [
      ['Beginner Coach', `${counts.coach || 0}/180 packs scheduled, one pack per day`],
      ['Beginner Launchpad', `${counts.launchpad1 || 0} Level 1 + ${counts.launchpad2 || 0} Level 2 + ${counts.launchpad3 || 0} Level 3 lessons, bundled 3 per study day`],
      ['Books 1 and 2', `${counts.book1 || 0} Book 1 + ${counts.book2 || 0} Book 2 chapters, ${counts.bookQuizzes || 0} chapter quizzes`],
      ['Pinyin and tones', `${counts.pinyinStages || 0} stages, ${counts.pinyinToneSyllables || 0} tone syllables, pronunciation and tone quizzes`],
      ['Vocabulary', `${counts.vocabularySets || 0} thematic sets, vocabulary quiz, SRS, flashcards`],
      ['Grammar and sentences', `${counts.grammar || 0} grammar units, ${counts.sentence || 0} sentence builder levels`],
      ['Dialogue and scenarios', `${counts.dialogues || 0} dialogues, ${counts.scenarios || 0} scenario groups, ${counts.scenarioLessons || 0} scenario lessons`],
      ['Reading and characters', `${counts.readings || 0} readings, ${counts.charPlayground || 0} character playground groups, character library`],
      ['Visual and exams', `${counts.pictureFlash || 0} picture flash groups, ${counts.tocfl || 0} TOCFL sections, ${counts.mocks || 0} mocks, ${counts.monthly || 0} monthly exams`]
    ];
    return `<section class="study-plan-coverage">
      <h3>All app content accounted for</h3>
      <div>${rows.map(([a, b]) => `<span><strong>${esc(a)}</strong><small>${esc(b)}</small></span>`).join('')}</div>
    </section>`;
  }

  function renderMonthSelector(day) {
    const currentMonth = monthForDay(day);
    const monthLabels = ['Sound', 'Book 1', 'Book 2', 'A2 Build', 'TOCFL', 'B1 Bridge'];
    const weekLabels = ['One', 'Two', 'Three', 'Four'];
    return `<section class="study-month-board" aria-label="Six month study map">
      <div class="study-map-head">
        <div>
          <span>Roadmap</span>
          <strong>6 months / 180 days</strong>
        </div>
        <small>Month ${currentMonth}</small>
      </div>
      <div class="study-month-tabs">
        ${Array.from({ length: MONTH_COUNT }, (_, i) => i + 1).map(month => `
          <button type="button" class="${month === currentMonth ? 'active' : ''}" onclick="StudyPlanModule.setMonth(${month})" aria-label="Open month ${month}">
            <span>Month</span><strong>${month}</strong><small>${esc(monthLabels[month - 1])}</small>
          </button>`).join('')}
      </div>
      <div class="study-week-row">
        <span>Weeks</span>
        <div class="study-week-circles">
          ${Array.from({ length: WEEKS_PER_MONTH }, (_, i) => i + 1).map(week => {
            const startDay = (currentMonth - 1) * DAYS_PER_MONTH + ((week - 1) * 7) + 1;
            const endDay = Math.min(TOTAL_DAYS, startDay + 6);
            const active = day >= startDay && day <= endDay;
            return `<button type="button" class="${active ? 'active' : ''}" title="Days ${startDay}-${endDay}" onclick="StudyPlanModule.setWeek(${currentMonth}, ${week})" aria-label="Open week ${weekLabels[week - 1]}, days ${startDay} to ${endDay}">${weekLabels[week - 1]}</button>`;
          }).join('')}
        </div>
      </div>
    </section>`;
  }

  function renderWeekStrip(day) {
    const start = Math.floor((day - 1) / 7) * 7 + 1;
    const days = Array.from({ length: 7 }, (_, i) => start + i).filter(d => d <= TOTAL_DAYS);
    return `<nav class="study-week-strip compact" aria-label="Current study week">
      ${days.map(d => {
        const plan = getDayPlan(d);
        const p = todayPct(d);
        return `<button type="button" class="${d === day ? 'active' : ''} ${p >= 100 ? 'done' : ''}" title="Day ${d}: ${esc(plan.type)}" onclick="StudyPlanModule.setDay(${d})">
          <strong>${((d - 1) % 7) + 1}</strong>
        </button>`;
      }).join('')}
    </nav>`;
  }

  async function render(container) {
    ensurePlan();
    container.innerHTML = '<div class="spinner"></div>';
    const cat = await loadCatalog();
    const day = currentDayNumber();
    const dayPlan = getDayPlan(day);
    const p = todayPct(day);
    const plan = ensurePlan();
    const calendarDay = clampDay(daysBetween(plan.startDate, localDateKey()) + 1);
    const completed = dayCompletedTasks(day).length;

    container.innerHTML = `
      <div class="study-plan-page study-plan-v2">
        <section class="study-plan-hero">
          <div>
            <div class="study-plan-kicker">180-day complete app plan</div>
            <h2>${esc(dayPlan.title)}</h2>
            <p>${esc(dayPlan.focus)}</p>
            <div class="study-plan-meta">
              <span>${esc(dayPlan.phase.label)}</span>
              <span>Month ${dayPlan.month}</span>
              <span>Week ${dayPlan.weekInMonth}</span>
              <span>${esc(dayPlan.date)}</span>
              <span>Calendar day ${calendarDay}</span>
            </div>
          </div>
          <div class="study-plan-meter">
            <strong>${p}%</strong>
            <span>${completed}/${dayPlan.tasks.length} tasks today</span>
            <small>${overallPct()}% of 180 days</small>
          </div>
        </section>

        <div class="study-progress-bar"><div style="width:${p}%"></div></div>

        ${renderMonthSelector(day)}
        ${renderWeekStrip(day)}

        <section class="study-plan-controls">
          <button class="btn btn-ghost btn-sm" onclick="StudyPlanModule.setDay(${day - 1})" ${day <= 1 ? 'disabled' : ''}>Previous Day</button>
          <button class="btn btn-primary btn-sm" onclick="StudyPlanModule.goToToday()">Today</button>
          <button class="btn btn-ghost btn-sm" onclick="StudyPlanModule.setDay(${day + 1})" ${day >= TOTAL_DAYS ? 'disabled' : ''}>Next Day</button>
          <button class="btn btn-outline btn-sm" onclick="StudyPlanModule.markDayComplete()">Mark Day Complete</button>
          <button class="btn btn-ghost btn-sm" onclick="StudyPlanModule.resetPlan()">Reset Plan</button>
        </section>

        <div class="study-plan-weakness-slot">${window.WeaknessEngine ? WeaknessEngine.renderSummaryCard() : ''}</div>

        <section class="study-task-list">
          ${dayPlan.tasks.map(item => renderTaskCard(dayPlan, item)).join('')}
        </section>

        ${day === 1 ? renderCoverage(cat) : ''}
      </div>`;
  }

  return {
    render,
    markDone,
    markDayComplete,
    skipTask,
    setDay,
    setMonth,
    setWeek,
    goToToday,
    refreshToday,
    resetPlan
  };
})();