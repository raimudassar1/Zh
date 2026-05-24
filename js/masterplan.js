/* Masterplan Dashboard - complete content roadmap */
'use strict';

window.MasterplanModule = (() => {
  const phases = [
    {
      id: 'sound',
      number: '0',
      title: 'Sound Foundation',
      subtitle: 'Hear tones before chasing characters.',
      level: 'Day 1-14',
      time: '25-35 min/day',
      goal: 'Build reliable pinyin, tone, and pronunciation recognition so listening is not guesswork later.',
      open: [['Pinyin & Tones', '#/onboarding'], ['Pronunciation Quiz', '#/quiz/pronunciation'], ['Tone Training', '#/quiz/tones']],
      target: '80%+ on same-syllable tone drills and comfortable initials/finals recognition.',
      move: 'Move on when you can hear ma tone pairs and common initials without checking the answer first.'
    },
    {
      id: 'launchpad',
      number: '1',
      title: 'Beginner Basics',
      subtitle: 'Tiny lessons, first words, first sentences.',
      level: 'Pre-A1',
      time: '35-50 min/day',
      goal: 'Learn survival words, greetings, numbers, family, food, likes, and simple sentence order.',
      open: [['Beginner Launchpad L1-L3', '#/beginner-launchpad'], ['Picture Flash Quiz', '#/quiz/flash'], ['Character Playground', '#/char-playground']],
      target: 'Finish Launchpad levels 1-3, recognize the first 100-150 words, and write basic characters from memory.',
      move: 'Move on when you can understand simple greetings and build short S + V + O sentences.'
    },
    {
      id: 'coach',
      number: '2',
      title: 'Daily Coach Packs',
      subtitle: 'Structured daily work without locking content.',
      level: 'Novice to A2',
      time: '45-70 min/day',
      goal: 'Use the 180-pack path for daily vocabulary, listening, writing, speaking, and review.',
      open: [['Beginner Daily Coach', '#/beginner-coach'], ['Study Today', '#/study-plan'], ['Mixed Recall', '#/mixed-recall']],
      target: 'Complete packs in order, keep at least 30 words/day in rotation, and refresh only after finishing a pack.',
      move: 'Move on in parallel once coach content feels easy and you can answer without pinyin most of the time.'
    },
    {
      id: 'books',
      number: '3',
      title: 'Course Books',
      subtitle: 'Book 1 is the controlled curriculum spine.',
      level: 'A1 to A2',
      time: '45-60 min/session',
      goal: 'Turn dialogues and textbook vocabulary into stable reading/listening/writing knowledge.',
      open: [['Course Books', '#/vocabulary-books'], ['Chapters', '#/chapters'], ['Grammar Academy', '#/grammar']],
      target: 'Finish Book 1 lessons with dialogue comprehension, vocabulary recall, and grammar examples.',
      move: 'Move on when you can summarize each lesson dialogue and use its grammar in your own sentence.'
    },
    {
      id: 'recall',
      number: '4',
      title: 'Active Recall System',
      subtitle: 'Make memory work under pressure.',
      level: 'All levels',
      time: '20-35 min/day',
      goal: 'Use SRS, mixed recall, sentence builder, and flashcards to prevent passive recognition only.',
      open: [['Learning Path / SRS', '#/learn'], ['Sentence Builder', '#/sentence-builder'], ['Flashcards', '#/flashcards']],
      target: 'Clear SRS due cards, repair weak areas, and complete mixed recall after each learning block.',
      move: 'This phase never ends; it runs beside every other phase.'
    },
    {
      id: 'expansion',
      number: '5',
      title: 'Reading + Listening Expansion',
      subtitle: 'Bridge from lesson language to real context.',
      level: 'A2 to B1 prep',
      time: '40-70 min/session',
      goal: 'Practice longer scenarios, dialogues, reading passages, and native TOCFL material.',
      open: [['Scenarios', '#/scenarios'], ['Dialogue Practice', '#/dialogue'], ['Reading', '#/reading'], ['TOCFL Native Content', '#/tocfl-content']],
      target: 'Understand short practical texts, answer detail questions, and follow multi-line conversations.',
      move: 'Move on when short readings feel like meaning-first reading, not character-by-character decoding.'
    },
    {
      id: 'exam',
      number: '6',
      title: 'Exam Mode',
      subtitle: 'Strict practice for TOCFL readiness.',
      level: 'A2 to B1',
      time: '60-120 min/session',
      goal: 'Use timed tests, native content, monthly exams, and mock simulations to check readiness honestly.',
      open: [['TOCFL Exam Center', '#/tocfl'], ['Monthly Exams', '#/exams'], ['Reading Mock Test', '#/mock-test/reading'], ['Listening Mock Test', '#/mock-test/listening']],
      target: 'Track score trends, review every wrong answer, and repeat weak sections before full simulations.',
      move: 'Sit longer mocks only after daily coach, books, recall, and expansion scores are stable.'
    }
  ];

  function icon(name) {
    return window.IconSystem?.svg(name) || '';
  }
  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function linkList(items) {
    return items.map(([label, href]) => '<a class="mp-link" href="' + href + '">' + esc(label) + '</a>').join('');
  }

  function injectStyles() {
    if (document.getElementById('masterplan-styles')) return;
    const style = document.createElement('style');
    style.id = 'masterplan-styles';
    style.textContent = [
      '.masterplan-page{max-width:1180px;margin:0 auto;padding:24px}.mp-hero{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(260px,.55fr);gap:18px;align-items:stretch;margin-bottom:20px}.mp-hero-main,.mp-hero-card,.mp-phase,.mp-rule{background:var(--card-bg);border:1px solid var(--border);border-radius:24px;box-shadow:var(--shadow-sm)}.mp-hero-main{padding:30px;background:linear-gradient(135deg,rgba(180,35,24,.1),rgba(31,78,121,.08));position:relative;overflow:hidden}.mp-kicker{font-size:.78rem;letter-spacing:.18em;text-transform:uppercase;color:var(--red);font-weight:900}.mp-hero h1{font-size:clamp(2rem,5vw,4.2rem);line-height:1;margin:10px 0 12px;color:var(--text)}.mp-hero p{font-size:1.08rem;color:var(--text-2);max-width:720px}.mp-hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}.mp-hero-card{padding:24px;display:grid;align-content:center;gap:10px}.mp-hero-card strong{font-size:2.4rem;color:var(--red)}.mp-hero-card span{color:var(--text-2);font-weight:800}',
      '.mp-rules{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}.mp-rule{padding:18px}.mp-rule svg{width:24px;height:24px;color:var(--red);margin-bottom:10px}.mp-rule strong{display:block;color:var(--text);margin-bottom:6px}.mp-rule p{color:var(--text-2);font-size:.95rem;margin:0}.mp-timeline{display:grid;gap:14px}.mp-phase{display:grid;grid-template-columns:86px minmax(0,1fr);gap:18px;padding:18px}.mp-number{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;background:rgba(180,35,24,.1);color:var(--red);font-size:1.8rem;font-weight:900}.mp-phase h2{margin:0 0 4px;color:var(--text);font-size:1.45rem}.mp-phase-sub{color:var(--text-3);font-weight:800;margin-bottom:12px}.mp-meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.mp-meta span{padding:6px 10px;border-radius:999px;background:var(--off-white);color:var(--text-2);font-weight:800;font-size:.82rem}',
      '.mp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.mp-cell{background:var(--off-white);border:1px solid var(--border);border-radius:16px;padding:12px}.mp-cell label{display:block;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--text-3);font-weight:900;margin-bottom:6px}.mp-cell p{margin:0;color:var(--text-2);font-size:.95rem}.mp-links{display:flex;gap:8px;flex-wrap:wrap}.mp-link{display:inline-flex;align-items:center;min-height:34px;padding:7px 11px;border:1px solid var(--border);border-radius:999px;background:var(--card-bg);color:var(--text);font-weight:800;text-decoration:none}.mp-link:hover{border-color:var(--red);color:var(--red)}',
      '@media(max-width:900px){.masterplan-page{padding:16px}.mp-hero{grid-template-columns:1fr}.mp-rules{grid-template-columns:1fr}.mp-phase{grid-template-columns:1fr}.mp-grid{grid-template-columns:1fr}.mp-number{width:54px;height:54px}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function phaseCard(phase) {
    return '<article class="mp-phase" id="phase-' + phase.id + '">' +
      '<div class="mp-number">' + esc(phase.number) + '</div>' +
      '<div><div class="mp-kicker">Phase ' + esc(phase.number) + '</div>' +
      '<h2>' + esc(phase.title) + '</h2>' +
      '<div class="mp-phase-sub">' + esc(phase.subtitle) + '</div>' +
      '<div class="mp-meta"><span>' + esc(phase.level) + '</span><span>' + esc(phase.time) + '</span></div>' +
      '<div class="mp-grid">' +
      '<div class="mp-cell"><label>Goal</label><p>' + esc(phase.goal) + '</p></div>' +
      '<div class="mp-cell"><label>Open</label><div class="mp-links">' + linkList(phase.open) + '</div></div>' +
      '<div class="mp-cell"><label>Completion Target</label><p>' + esc(phase.target) + '</p></div>' +
      '<div class="mp-cell"><label>Move On When</label><p>' + esc(phase.move) + '</p></div>' +
      '</div></div></article>';
  }

  function render(container) {
    injectStyles();
    container.innerHTML = '<div class="masterplan-page">' +
      '<section class="mp-hero"><div class="mp-hero-main">' +
      '<div class="mp-kicker">Masterplan</div><h1>One clear route through everything.</h1>' +
      '<p>This is the app map: use it to decide what to study first, what to repeat daily, and when to shift from beginner material into TOCFL-style testing. Nothing is locked; the plan simply gives the content a sane order.</p>' +
      '<div class="mp-hero-actions"><a class="btn btn-primary" href="#/beginner-launchpad">Start at Beginner Basics</a><a class="btn btn-outline" href="#/b1-coach">Open 180-Day Coach</a><a class="btn btn-outline" href="#/settings">Sync Progress</a></div>' +
      '</div><aside class="mp-hero-card"><span>Total route</span><strong>7 phases</strong><p class="text-muted">Sound, beginner basics, coach packs, books, recall, expansion, exam mode.</p></aside></section>' +
      '<section class="mp-rules">' +
      '<article class="mp-rule">' + icon('route') + '<strong>Use order, not locks</strong><p>All sections stay open. The route prevents content from drowning into one big pile.</p></article>' +
      '<article class="mp-rule">' + icon('check') + '<strong>Daily recall wins</strong><p>Every phase still needs SRS, mixed recall, and sentence output.</p></article>' +
      '<article class="mp-rule">' + icon('target') + '<strong>Test only after input</strong><p>TOCFL simulation is a readiness check, not the first learning source.</p></article>' +
      '</section><main class="mp-timeline">' + phases.map(phaseCard).join('') + '</main></div>';
  }

  return { render };
})();
