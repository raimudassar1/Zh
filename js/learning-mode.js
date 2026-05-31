/* ═══════════════════════════════════════════════════════════════
   learning-mode.js — Duolingo-Style Practice & Spaced Repetition
   Phone-first full-screen layout. Runs completely client-side.
   ═══════════════════════════════════════════════════════════════ */

'use strict';

window.LearningModeModule = (() => {

  // ── Traditional-to-Simplified Translation Map ──
  const TRAD_TO_SIMP = {
    '謝':'谢','興':'兴','認':'认','識':'识','師':'师','學':'学','國':'国','們':'们',
    '邊':'边','點':'点','麗':'丽','麼':'么','歡':'欢','樣':'样','聽':'听','語':'语',
    '氣':'气','幾':'几','錢':'钱','買':'买','賣':'卖','醫':'医','寫':'写','乾':'干',
    '開':'开','關':'关','說':'说','話':'话','讀':'读','書':'书','車':'车','會':'会',
    '辦':'办','鐘':'钟','媽':'妈','個':'个','兩':'两','這':'这','誰':'谁','東':'东',
    '問':'问','請':'请','來':'来','對':'对','過':'过','時':'时','間':'间','後':'后',
    '禮':'礼','兒':'儿','紅':'红','藍':'蓝','黃':'黄','歲':'岁','愛':'爱','熱':'热',
    '飯':'饭','館':'馆','麵':'面','雞':'鸡','鴨':'鸭','豬':'猪','貓':'猫','馬':'马',
    '頭':'头','臉':'脸','腳':'脚','發':'发','電':'电','腦':'脑','機':'机','鐵':'铁'
  };

  function toSimplified(str) {
    if (!str) return '';
    return str.split('').map(c => TRAD_TO_SIMP[c] || c).join('');
  }

  // ── Seed Words Corpus ──
  const SEED_WORDS = [
    { id:'seed_1', term:'你好', meaning:'hello', level:'A1', semanticGroup:'Greetings', partOfSpeech:'interjection', useTTS:true, setId:'ch1', setName:'Chapter 1: Greetings', exampleSentences:['你好，很高興認識你。','老師，您好。','你好嗎？我很好。'] },
    { id:'seed_2', term:'謝謝', meaning:'thank you', level:'A1', semanticGroup:'Greetings', partOfSpeech:'verb', useTTS:true, setId:'ch1', setName:'Chapter 1: Greetings', exampleSentences:['謝謝你的幫助。','不用客氣，謝謝。','謝謝你請我吃飯。'] },
    { id:'seed_3', term:'老師', meaning:'teacher', level:'A1', semanticGroup:'Greetings', partOfSpeech:'noun', useTTS:true, setId:'ch1', setName:'Chapter 1: Greetings', exampleSentences:['我的中文老師很好。','老師，請問這個字怎麼寫？','這位是我們的英文老師。'] },
    { id:'seed_4', term:'學生', meaning:'student', level:'A1', semanticGroup:'Greetings', partOfSpeech:'noun', useTTS:true, setId:'ch1', setName:'Chapter 1: Greetings', exampleSentences:['這個學校有很多學生。','我是中文系的學生。','學生們都在教室裡上課。'] },
    { id:'seed_5', term:'朋友', meaning:'friend', level:'A1', semanticGroup:'Greetings', partOfSpeech:'noun', useTTS:true, setId:'ch1', setName:'Chapter 1: Greetings', exampleSentences:['週末我和朋友一起去看電影。','他是我的好朋友。','我們是很多年的朋友。'] },
    { id:'seed_6', term:'學校', meaning:'school', level:'A1', semanticGroup:'Greetings', partOfSpeech:'noun', useTTS:true, setId:'ch1', setName:'Chapter 1: Greetings', exampleSentences:['我們學校很大。','我每天走路去學校。','學校的圖書館有很多書。'] },
    { id:'seed_7', term:'教室', meaning:'classroom', level:'A1', semanticGroup:'Greetings', partOfSpeech:'noun', useTTS:true, setId:'ch1', setName:'Chapter 1: Greetings', exampleSentences:['學生們都在教室裡上課。','我們的教室很乾淨。','教室裡有黑板和桌子。'] },
    { id:'seed_8', term:'中文', meaning:'Chinese language', level:'A1', semanticGroup:'Greetings', partOfSpeech:'noun', useTTS:true, setId:'ch1', setName:'Chapter 1: Greetings', exampleSentences:['我正在學習中文。','說中文很有意思。','我的中文老師是台灣人。'] },
    { id:'seed_9', term:'蘋果', meaning:'apple', level:'A1', semanticGroup:'Food', partOfSpeech:'noun', useTTS:true, setId:'ch2', setName:'Chapter 2: Food & Drinks', exampleSentences:['我每天早上吃一個蘋果。','這個蘋果多少錢？','我喜歡紅色的蘋果。'] },
    { id:'seed_10', term:'香蕉', meaning:'banana', level:'A1', semanticGroup:'Food', partOfSpeech:'noun', useTTS:true, setId:'ch2', setName:'Chapter 2: Food & Drinks', exampleSentences:['這根香蕉很甜。','猴子最喜歡吃香蕉。','媽媽今天買了一包香蕉。'] },
    { id:'seed_11', term:'爸爸', meaning:'father', level:'A1', semanticGroup:'Family', partOfSpeech:'noun', useTTS:true, setId:'ch3', setName:'Chapter 3: Family Members', exampleSentences:['爸爸每天開車去上班。','我的爸爸是醫生。','爸爸喜歡喝熱茶。'] },
    { id:'seed_12', term:'媽媽', meaning:'mother', level:'A1', semanticGroup:'Family', partOfSpeech:'noun', useTTS:true, setId:'ch3', setName:'Chapter 3: Family Members', exampleSentences:['媽媽做的菜很好吃。','媽媽今天去市場買菜。','我愛我的媽媽。'] },
    { id:'seed_13', term:'哥哥', meaning:'older brother', level:'A1', semanticGroup:'Family', partOfSpeech:'noun', useTTS:true, setId:'ch3', setName:'Chapter 3: Family Members', exampleSentences:['哥哥比我大三歲。','我的哥哥在電腦公司上班。','哥哥很高，弟弟很矮。'] },
    { id:'seed_14', term:'姐姐', meaning:'older sister', level:'A1', semanticGroup:'Family', partOfSpeech:'noun', useTTS:true, setId:'ch3', setName:'Chapter 3: Family Members', exampleSentences:['我姐姐在大學讀書。','姐姐唱歌唱得很好聽。','姐姐買了一件新衣服。'] },
    { id:'seed_15', term:'弟弟', meaning:'younger brother', level:'A1', semanticGroup:'Family', partOfSpeech:'noun', useTTS:true, setId:'ch3', setName:'Chapter 3: Family Members', exampleSentences:['弟弟很喜歡踢足球。','弟弟今年十歲，上小學。','我和弟弟一起玩遊戲。'] },
    { id:'seed_16', term:'星期', meaning:'week', level:'A1', semanticGroup:'Time', partOfSpeech:'noun', useTTS:true, setId:'ch4', setName:'Chapter 4: Time Expressions', exampleSentences:['這個星期天天氣很好。','下個星期我們要考試。','星期一我要去台北工作。'] },
    { id:'seed_17', term:'時間', meaning:'time', level:'A1', semanticGroup:'Time', partOfSpeech:'noun', useTTS:true, setId:'ch4', setName:'Chapter 4: Time Expressions', exampleSentences:['你今天有時間嗎？','時間過得真快。','我沒有時間去看電影。'] },
    { id:'seed_18', term:'天氣', meaning:'weather', level:'A1', semanticGroup:'Nature', partOfSpeech:'noun', useTTS:true, setId:'ch5', setName:'Chapter 5: Weather & Nature', exampleSentences:['今天天氣很好，我很高興。','明天的天氣怎麼樣？','這幾天天氣非常冷。'] },
    { id:'seed_19', term:'醫生', meaning:'doctor', level:'A1', semanticGroup:'Work', partOfSpeech:'noun', useTTS:true, setId:'ch6', setName:'Chapter 6: Occupations', exampleSentences:['我的爸爸是醫生。','生病了就要去看醫生。','醫生說要多喝水、多休息。'] },
    { id:'seed_20', term:'醫院', meaning:'hospital', level:'A1', semanticGroup:'Work', partOfSpeech:'noun', useTTS:true, setId:'ch6', setName:'Chapter 6: Occupations', exampleSentences:['這家醫院在火車站旁邊。','他在那家醫院工作。','我們去醫院看朋友。'] }
  ];

  // ── Persistence Keys ──
  const USER_STATE_KEY = 'tocfl_duolingo_srs';
  const CHECKPOINT_KEY = 'tocfl_duolingo_checkpoint';

  // ── Duolingo Section Hierarchy ──
  const SECTIONS = [
    { id:'sec_novice',       name:'Section 1: Novice',       subtitle:'Basic Greetings, Numbers & Family',           levels:['NOVICE'],          requiredXP:0    },
    { id:'sec_elementary',   name:'Section 2: Elementary',   subtitle:'Daily Interactions, Restaurants & Work',       levels:['A1'],              requiredXP:1000 },
    { id:'sec_intermediate', name:'Section 3: Intermediate', subtitle:'Hobbies, Shopping & Transportation',           levels:['A2','A2/B1'],      requiredXP:2500 },
    { id:'sec_advanced',     name:'Section 4: Advanced',     subtitle:'Business, Tech & TOCFL Mastery',               levels:['B1','B1/B2','B2'], requiredXP:5000 }
  ];

  // ── Question type config ──
  const QUESTION_TYPE_META = {
    multiple_choice: { icon:'🧠', label:'Translate this word',   color:'#3b82f6' },
    listening:       { icon:'🎧', label:'What do you hear?',     color:'#8b5cf6' },
    fill_blank:      { icon:'✏️',  label:'Fill in the blank',    color:'#f59e0b' },
    tile_assembly:   { icon:'🧩', label:'Arrange the sentence',  color:'#10b981' },
    speaking:        { icon:'🎙️', label:'Say this aloud',        color:'#ef4444' }
  };

  // ── Web Audio Sound Generator ──
  class SoundEngine {
    constructor() { this.ctx = null; this.voices = []; this.initVoices(); }
    initCtx() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
    }
    initVoices() {
      if (!window.speechSynthesis) return;
      const load = () => { this.voices = window.speechSynthesis.getVoices(); };
      load();
      window.speechSynthesis.addEventListener('voiceschanged', load);
    }
    playTone(freq, type, duration, delay = 0) {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'suspended') return;
      setTimeout(() => {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
          gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
          osc.connect(gain); gain.connect(this.ctx.destination);
          osc.start(); osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
      }, delay);
    }
    playCorrect()  { this.playTone(587.33, 'sine', 0.15); }
    playWrong()    { this.playTone(120, 'sawtooth', 0.20); }
    playStreak()   { this.playTone(523.25,'sine',0.15,0); this.playTone(659.25,'sine',0.15,100); this.playTone(783.99,'sine',0.15,200); }
    playLevelUp()  { this.playTone(523.25,'sine',0.20,0); this.playTone(659.25,'sine',0.20,100); this.playTone(783.99,'sine',0.20,200); this.playTone(1046.50,'sine',0.50,300); }
    playCardFlip() {
      this.initCtx();
      if (!this.ctx || this.ctx.state === 'suspended') return;
      try {
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.05);
      } catch(e) {}
    }
    async speakWord(term) {
      const cleanTerm = typeof term === 'object' ? term.term : term;
      const audioPath = typeof term === 'object' ? term.audioPath : null;
      if (audioPath) {
        try { const audio = new Audio(audioPath); await audio.play(); return; } catch (e) {}
      }
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      window.speechSynthesis.cancel();
      const ut = new SpeechSynthesisUtterance(cleanTerm);
      ut.rate = 0.82;
      let list = window.speechSynthesis.getVoices();
      if (!list.length) list = this.voices;
      let voice = list.find(v => v.lang && (v.lang.toLowerCase()==='zh-tw'||v.lang.toLowerCase()==='zh_tw'));
      if (!voice) voice = list.find(v => v.lang && v.lang.toLowerCase().startsWith('zh-'));
      if (!voice) voice = list.find(v => v.lang && v.lang.toLowerCase().startsWith('zh'));
      if (voice) { ut.voice = voice; ut.lang = voice.lang; } else { ut.lang = 'zh-CN'; }
      return new Promise(resolve => {
        ut.onend = resolve;
        ut.onerror = () => { window.showToast?.(`🔊 Audio unavailable: ${cleanTerm}`); resolve(); };
        window.speechSynthesis.speak(ut);
      });
    }
  }
  const sound = new SoundEngine();

  // ── Pronunciation Fuzzy Matcher ──
  function levenshtein(a, b) {
    const tmp = []; let i, j;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    for (i = 0; i <= a.length; i++) tmp[i] = [i];
    for (j = 0; j <= b.length; j++) tmp[0][j] = j;
    for (i = 1; i <= a.length; i++)
      for (j = 1; j <= b.length; j++)
        tmp[i][j] = Math.min(tmp[i-1][j]+1, tmp[i][j-1]+1, tmp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    return tmp[a.length][b.length];
  }

  function checkPronunciation(expected, transcript) {
    const normExp = toSimplified(expected).trim();
    const normTrans = toSimplified(transcript).trim();
    const dist = levenshtein(normExp, normTrans);
    return dist <= Math.ceil(normExp.length * 0.25);
  }

  // ── SRS Calculator ──
  function updateSRS(wordState, wasCorrect, isHintUsed = false) {
    const s = { ...wordState };
    const q = wasCorrect ? (isHintUsed ? 4 : 5) : 2;
    s.lastQuestionType = wordState.currentQuestionType || null;
    if (!wasCorrect) {
      s.interval = 1;
      s.incorrectCount = (wordState.incorrectCount || 0) + 1;
    } else {
      s.correctCount = (wordState.correctCount || 0) + 1;
      if (wordState.interval <= 1) s.interval = 1;
      else if (wordState.interval === 2) s.interval = 6;
      else s.interval = Math.round(wordState.interval * wordState.easeFactor);
    }
    s.easeFactor = Math.max(1.3, wordState.easeFactor + (0.1 - (5 - q) * (0.08 + (5-q)*0.02)));
    const d = new Date(); d.setDate(d.getDate() + s.interval);
    s.nextReviewDate = d.toISOString();
    if (s.correctCount >= 5) s.status = 'mastered';
    else if (s.correctCount >= 3) s.status = 'familiar';
    else if (s.correctCount >= 1) s.status = 'learning';
    else s.status = 'new';
    const unlocked = ['multiple_choice'];
    if (s.correctCount >= 1) { unlocked.push('listening'); unlocked.push('fill_blank'); }
    if (s.correctCount >= 3) { unlocked.push('tile_assembly'); }
    if (s.correctCount >= 5) { unlocked.push('speaking'); }
    s.unlockedQuestionTypes = unlocked;
    return s;
  }

  // ── Sentence Segmenter ──
  function segmentSentence(sentence, lexicon) {
    const clean = sentence.replace(/[\s，。！？,.!?]/g,'').trim();
    const tiles = []; let i = 0;
    const sorted = [...lexicon].sort((a,b) => b.length - a.length);
    while (i < clean.length) {
      let matched = false;
      for (const word of sorted) {
        if (word && clean.startsWith(word, i)) { tiles.push(word); i += word.length; matched = true; break; }
      }
      if (!matched) { tiles.push(clean[i]); i++; }
    }
    return tiles;
  }

  // ── Question Factory ──
  function makeQuestion(type, word, allWords, lexicon) {
    const sameGroup = allWords.filter(w => w.semanticGroup === word.semanticGroup && w.term !== word.term);
    const pickDistractors = (prop) => {
      const list = [...sameGroup];
      while (list.length < 3) {
        const fb = allWords[Math.floor(Math.random() * allWords.length)];
        if (fb.term !== word.term && !list.includes(fb)) list.push(fb);
      }
      for (let i = list.length-1; i > 0; i--) {
        const j = Math.floor(Math.random()*(i+1)); [list[i],list[j]] = [list[j],list[i]];
      }
      return list.slice(0,3).map(w => w[prop]);
    };

    if (type === 'multiple_choice') {
      const choices = [word.meaning, ...pickDistractors('meaning')].sort(() => Math.random()-0.5);
      return { type, word, prompt:word.term, choices, correctAnswer:word.meaning, explanation:word.exampleSentences[0]||`${word.term} means ${word.meaning}.` };
    }
    if (type === 'listening') {
      const choices = [word.meaning, ...pickDistractors('meaning')].sort(() => Math.random()-0.5);
      return { type, word, prompt:'[tap speaker to hear]', choices, correctAnswer:word.meaning, explanation:word.exampleSentences[0]||`${word.term} means ${word.meaning}.` };
    }
    if (type === 'fill_blank') {
      const sent = word.exampleSentences[Math.floor(Math.random()*word.exampleSentences.length)] || `${word.term}在教室裡面。`;
      const prompt = sent.replace(word.term,' ______ ');
      const choices = [word.term, ...pickDistractors('term')].sort(() => Math.random()-0.5).slice(0,4);
      return { type, word, prompt, choices, correctAnswer:word.term, explanation:sent };
    }
    if (type === 'tile_assembly') {
      let sentence = word.exampleSentences[Math.floor(Math.random()*word.exampleSentences.length)] || `${word.term}在教室裡面。`;
      let tiles = segmentSentence(sentence, lexicon);
      if (tiles.length < 3) {
        for (const s of word.exampleSentences) {
          const trial = segmentSentence(s, lexicon);
          if (trial.length >= 3 && trial.length <= 8) { sentence = s; tiles = trial; break; }
        }
      }
      if (tiles.length < 3) tiles.push('。');
      else if (tiles.length > 8) { tiles = tiles.slice(0,8); sentence = tiles.join(''); }
      return { type, word, prompt:sentence.replace(/[\s，。！？,.!?]/g,''), tiles:[...tiles].sort(() => Math.random()-0.5), correctAnswer:sentence.replace(/[\s，。！？,.!?]/g,''), explanation:sentence };
    }
    if (type === 'speaking') {
      return { type, word, prompt:`Say: "${word.term}"`, correctAnswer:word.term, explanation:word.exampleSentences[0]||`${word.term} — ${word.meaning}` };
    }
  }

  // ── Session Builder ──
  function buildSession(allWords, userStates, sessionSize = 15) {
    const today = new Date();
    let dueWords = allWords.filter(w => {
      const s = userStates.find(us => us.wordId === w.id);
      if (!s || s.status === 'new') return false;
      return new Date(s.nextReviewDate) <= today;
    });
    let sessionWords = [...dueWords];
    if (sessionWords.length < sessionSize) {
      const newPool = allWords.filter(w => { const s = userStates.find(us => us.wordId === w.id); return !s || s.status === 'new'; });
      const lvMap = {'A1':1,'A2':2,'B1':3,'B2':4,'C1':5,'C2':6};
      newPool.sort((a,b) => (lvMap[a.level]||99)-(lvMap[b.level]||99));
      for (const w of newPool) { if (sessionWords.length >= sessionSize) break; if (!sessionWords.includes(w)) sessionWords.push(w); }
    }
    if (sessionWords.length < sessionSize) {
      for (const w of allWords) { if (sessionWords.length >= sessionSize) break; if (!sessionWords.includes(w)) sessionWords.push(w); }
    }
    sessionWords = sessionWords.slice(0, sessionSize);
    sessionWords.sort(() => Math.random()-0.5);
    const lexicon = allWords.map(w => w.term);
    const questionQueue = sessionWords.map(word => {
      const ws = userStates.find(s => s.wordId === word.id) || createDefaultState(word.id);
      const types = ws.unlockedQuestionTypes || ['multiple_choice'];
      const filtered = types.filter(t => t !== ws.lastQuestionType);
      const pool = filtered.length ? filtered : types;
      const chosenType = pool[Math.floor(Math.random()*pool.length)];
      ws.currentQuestionType = chosenType;
      return makeQuestion(chosenType, word, allWords, lexicon);
    });
    return { id:'session_'+Date.now(), words:sessionWords, questionQueue, currentIndex:0, xpEarned:0, correctStreak:0, totalCorrect:0, totalWrong:0, startedAt:new Date().toISOString() };
  }

  // ── Persistence Layer ──
  function createDefaultState(wordId) {
    return { wordId, userId:'default_user', status:'new', easeFactor:2.5, interval:1, nextReviewDate:new Date().toISOString(), correctCount:0, incorrectCount:0, lastQuestionType:null, unlockedQuestionTypes:['multiple_choice'] };
  }
  function loadUserWordStates(allWords) {
    try {
      const raw = localStorage.getItem(USER_STATE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        return allWords.map(w => { let s = parsed[w.id]; return (s && s.wordId) ? s : createDefaultState(w.id); });
      }
    } catch(e) { console.warn('SRS state corrupt, resetting.', e); }
    return allWords.map(w => createDefaultState(w.id));
  }
  function saveUserWordStates(states) {
    try { const m = {}; states.forEach(s => { m[s.wordId] = s; }); localStorage.setItem(USER_STATE_KEY, JSON.stringify(m)); } catch(e) {}
  }
  function saveCheckpoint(session, states) {
    try { const d = {session, states, time:Date.now()}; localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(d)); sessionStorage.setItem(CHECKPOINT_KEY, JSON.stringify(d)); } catch(e) {}
  }
  function clearCheckpoint() { localStorage.removeItem(CHECKPOINT_KEY); sessionStorage.removeItem(CHECKPOINT_KEY); }
  function recoverCheckpoint() {
    try {
      const raw = localStorage.getItem(CHECKPOINT_KEY) || sessionStorage.getItem(CHECKPOINT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.session || !parsed?.states) return null;
      if (Date.now() - parsed.time > 30*60*1000) { clearCheckpoint(); return null; }
      return parsed;
    } catch(e) { return null; }
  }

  function getLevelIdFromXP(xp) {
    if (xp >= 4200) return 5; if (xp >= 2400) return 4;
    if (xp >= 1200) return 3; if (xp >= 500) return 2; return 1;
  }

  // ── Mascot HTML by question type ──
  function getMascotHTML(qType, subState) {
    // Returns inline Lottie container + emoji fallback for the question card header
    const mascotContainerId = 'lottie-mascot-inline';

    let emoji = '🦆'; // default mascot
    if (qType === 'listening')       emoji = '🎧';
    else if (qType === 'speaking')   emoji = '🎙️';
    else if (qType === 'tile_assembly') emoji = '🧩';
    else if (qType === 'fill_blank') emoji = '✏️';
    else if (qType === 'multiple_choice') emoji = '🤔';

    // Emoji fallback sizes
    return `
      <div class="duo-mascot-row">
        <div id="${mascotContainerId}" class="duo-mascot-lottie"></div>
        <span class="duo-mascot-emoji" aria-hidden="true">${emoji}</span>
      </div>
    `;
  }

  // ── Inline mascot animation using AnimRegistry ──
  function playInlineMascot(qType, wasCorrect = null) {
    const id = 'lottie-mascot-inline';
    if (!window.AnimRegistry) return;

    let key = 'mascot_thinking';
    if (wasCorrect === true)  key = 'mascot_happy';
    else if (wasCorrect === false) key = 'mascot_sad';
    else if (qType === 'listening')       key = 'mascot_idle';
    else if (qType === 'speaking')        key = 'mascot_encouraging';
    else if (qType === 'multiple_choice') key = 'mascot_thinking';
    else if (qType === 'fill_blank')      key = 'mascot_thinking';
    else if (qType === 'tile_assembly')   key = 'mascot_idle';

    AnimRegistry.play(key, id, { loop: wasCorrect === null });
  }

  // ── Confetti ──
  function triggerConfetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#f43f5e','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899'];
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('div');
      p.style.cssText = `position:fixed;top:-10px;left:${Math.random()*100}%;width:8px;height:8px;border-radius:50%;background:${colors[i%colors.length]};pointer-events:none;z-index:9999;animation:confettiFall ${1+Math.random()*0.8}s ${Math.random()*0.4}s linear forwards;`;
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }

  // ── Speech-to-Text ──
  class SpeechBridge {
    constructor() {
      this.recognition = null; this.active = false;
      const RC = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (RC) { this.recognition = new RC(); this.recognition.lang = 'zh-TW'; this.recognition.interimResults = false; this.recognition.maxAlternatives = 1; }
    }
    start(onResult, onError, onEnd) {
      if (!this.recognition) { onError('unavailable'); return; }
      this.active = true;
      this.recognition.onresult = e => onResult(e.results[0][0].transcript);
      this.recognition.onerror = e => onError(e.error);
      this.recognition.onend = () => { this.active = false; onEnd(); };
      this.recognition.start();
    }
    stop() { if (this.recognition && this.active) this.recognition.stop(); }
  }
  const speech = new SpeechBridge();

  // ── Global State ──
  let state = {
    userId:'default_user', words:[], userStates:[], session:null,
    currentQuestion:null, selectedChoice:null, tappedTiles:[],
    sttSubState:'idle', sttTranscript:'',
    hearts:3, streak:0, startTime:0,
    uiState:'PATH_MAP', activeChapterId:null, activeSectionId:null,
    container:null, feedbackVisible:false
  };

  function getChapters() {
    const map = new Map();
    state.words.forEach(w => {
      if (!map.has(w.setId)) map.set(w.setId, { id:w.setId, name:w.setName||w.semanticGroup||'Vocabulary Set', semanticGroup:w.semanticGroup||'General', level:w.level||'A1', words:[] });
      map.get(w.setId).words.push(w);
    });
    return Array.from(map.values());
  }

  // ── CSS Injection ──
  function injectStyles() {
    if (document.getElementById('duolingo-styles')) return;
    const style = document.createElement('style');
    style.id = 'duolingo-styles';
    style.textContent = `
      /* ── Base layout — full-screen phone ── */
      .duo-layout {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        background: var(--body-bg, #0f172a);
        color: var(--text, #f8fafc);
        font-family: 'Outfit', 'Inter', sans-serif;
        overflow: hidden;
        z-index: 100;
      }

      /* ── Top bar ── */
      .duo-topbar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px 8px;
        flex-shrink: 0;
      }
      .duo-topbar-exit {
        width: 36px; height: 36px;
        border-radius: 50%;
        border: none;
        background: rgba(255,255,255,0.06);
        color: var(--text-2, #94a3b8);
        font-size: 1.1rem;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: background 0.15s;
      }
      .duo-topbar-exit:active { background: rgba(255,255,255,0.12); }
      .duo-progress-bar {
        flex: 1;
        height: 14px;
        background: rgba(255,255,255,0.08);
        border-radius: 99px;
        overflow: hidden;
        position: relative;
      }
      .duo-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #34d399);
        border-radius: 99px;
        transition: width 0.4s cubic-bezier(0.4,0,0.2,1);
        will-change: width;
      }
      .duo-stats-row {
        display: flex; align-items: center; gap: 10px;
        flex-shrink: 0;
      }
      .duo-stat-chip {
        display: flex; align-items: center; gap: 4px;
        font-weight: 800; font-size: 0.95rem;
      }
      .duo-heart-icon { color: #ef4444; font-size: 1.1rem; }
      .duo-streak-icon { color: #f59e0b; font-size: 1.1rem; }

      /* ── Question area — scrollable middle ── */
      .duo-question-area {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
        padding: 0 16px 8px;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }
      .duo-question-area::-webkit-scrollbar { display: none; }

      /* ── Question type label row ── */
      .duo-qtype-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 4px 0 10px;
        flex-shrink: 0;
      }
      .duo-qtype-chip {
        display: flex; align-items: center; gap: 6px;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 0.82rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }

      /* ── Mascot row — centered above prompt ── */
      .duo-mascot-row {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        margin: 4px 0 8px;
        min-height: 80px;
      }
      .duo-mascot-lottie {
        width: 88px;
        height: 88px;
        position: absolute;
        display: none;
      }
      .duo-mascot-emoji {
        font-size: 3.5rem;
        line-height: 1;
        animation: mascotBob 2s ease-in-out infinite;
        display: block;
      }
      @keyframes mascotBob {
        0%, 100% { transform: translateY(0); }
        50%       { transform: translateY(-6px); }
      }
      .duo-mascot-emoji.celebrating {
        animation: mascotCelebrate 0.5s ease;
      }
      @keyframes mascotCelebrate {
        0%  { transform: scale(1) rotate(0deg); }
        30% { transform: scale(1.3) rotate(-8deg); }
        60% { transform: scale(1.2) rotate(8deg); }
        100%{ transform: scale(1) rotate(0deg); }
      }
      .duo-mascot-emoji.sad {
        animation: mascotShake 0.4s ease;
      }
      @keyframes mascotShake {
        0%,100% { transform: translateX(0); }
        20%,60% { transform: translateX(-5px); }
        40%,80% { transform: translateX(5px); }
      }

      /* ── Prompt (Chinese character) ── */
      .duo-prompt-main {
        font-family: var(--font-zh, 'Noto Sans TC', serif);
        font-size: 3rem;
        font-weight: 900;
        text-align: center;
        line-height: 1.15;
        margin: 4px 0 6px;
        color: var(--text-1, #f8fafc);
        word-break: break-all;
      }
      .duo-prompt-pinyin {
        text-align: center;
        font-size: 0.95rem;
        color: #64748b;
        margin-bottom: 4px;
        font-style: italic;
      }
      .duo-prompt-sub {
        text-align: center;
        font-size: 1rem;
        color: var(--text-2, #94a3b8);
        margin-bottom: 16px;
        font-style: italic;
      }

      /* ── Audio button (listening question) ── */
      .duo-audio-big {
        width: 86px; height: 86px;
        border-radius: 50%;
        background: linear-gradient(135deg, #8b5cf6, #6d28d9);
        color: #fff;
        font-size: 2.4rem;
        border: none;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        margin: 8px auto 12px;
        box-shadow: 0 6px 24px rgba(139,92,246,0.45);
        transition: transform 0.12s, box-shadow 0.12s;
        position: relative;
        flex-shrink: 0;
      }
      .duo-audio-big:active { transform: scale(0.93); box-shadow: 0 2px 8px rgba(139,92,246,0.4); }
      .duo-audio-big.playing::after {
        content: '';
        position: absolute; inset: -8px;
        border-radius: 50%;
        border: 3px solid rgba(139,92,246,0.4);
        animation: audioRipple 1s ease-out infinite;
      }
      @keyframes audioRipple {
        0%   { opacity:1; transform:scale(1); }
        100% { opacity:0; transform:scale(1.5); }
      }

      /* ── Answer options ── */
      .duo-options {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        margin-top: 4px;
      }
      .duo-option-btn {
        min-height: 58px;
        width: 100%;
        border: 2.5px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.03);
        color: var(--text, #f8fafc);
        border-radius: 16px;
        font-size: 1.05rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 0 18px;
        gap: 10px;
        text-align: left;
        transition: all 0.15s;
        position: relative;
        overflow: hidden;
      }
      .duo-option-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: transparent;
        transition: background 0.15s;
      }
      .duo-option-btn:active::before { background: rgba(255,255,255,0.05); }
      .duo-option-letter {
        width: 28px; height: 28px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.15);
        display: flex; align-items: center; justify-content: center;
        font-size: 0.78rem;
        font-weight: 800;
        flex-shrink: 0;
        color: var(--text-2, #94a3b8);
      }
      .duo-option-btn.selected {
        border-color: #3b82f6;
        background: rgba(59,130,246,0.1);
      }
      .duo-option-btn.selected .duo-option-letter {
        background: #3b82f6;
        border-color: #3b82f6;
        color: #fff;
      }
      .duo-option-btn.correct {
        border-color: #22c55e;
        background: rgba(34,197,94,0.12);
        color: #22c55e;
        animation: optionCorrect 0.35s ease;
      }
      .duo-option-btn.correct .duo-option-letter {
        background: #22c55e; border-color: #22c55e; color: #fff;
      }
      .duo-option-btn.wrong {
        border-color: #ef4444;
        background: rgba(239,68,68,0.12);
        color: #ef4444;
        animation: optionWrong 0.35s ease;
      }
      .duo-option-btn.wrong .duo-option-letter {
        background: #ef4444; border-color: #ef4444; color: #fff;
      }
      .duo-option-btn.dimmed { opacity: 0.35; pointer-events: none; }
      @keyframes optionCorrect {
        0%  { transform: scale(1); }
        40% { transform: scale(1.03); }
        100%{ transform: scale(1); }
      }
      @keyframes optionWrong {
        0%,100% { transform: translateX(0); }
        20%,60% { transform: translateX(-6px); }
        40%,80% { transform: translateX(6px); }
      }

      /* ── Tile Assembly ── */
      .duo-tile-section { width: 100%; margin-top: 4px; }
      .duo-tile-answer-zone {
        min-height: 64px;
        border-bottom: 2.5px dashed rgba(255,255,255,0.12);
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 8px 0 10px;
        margin-bottom: 14px;
        align-content: flex-start;
      }
      .duo-tile-bank {
        display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
      }
      .duo-tile {
        min-height: 48px;
        padding: 0 16px;
        background: var(--card-bg, #1e293b);
        border: 2.5px solid rgba(255,255,255,0.12);
        border-radius: 14px;
        color: var(--text, #f8fafc);
        font-family: var(--font-zh, 'Noto Sans TC', serif);
        font-size: 1.15rem;
        font-weight: 700;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 3px 6px rgba(0,0,0,0.15), 0 3px 0 rgba(0,0,0,0.25);
        transition: transform 0.12s, box-shadow 0.12s;
        user-select: none;
      }
      .duo-tile:active { transform: scale(0.94); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .duo-tile.tapped { opacity: 0.12; pointer-events: none; box-shadow: none; }
      .duo-tile.in-zone {
        background: rgba(59,130,246,0.12);
        border-color: rgba(59,130,246,0.5);
        box-shadow: 0 2px 0 rgba(59,130,246,0.3);
      }
      .duo-tile-hint { font-size: 0.78rem; color: #64748b; text-align: center; margin-bottom: 6px; }

      /* ── Speaking UI ── */
      .duo-mic-btn {
        width: 90px; height: 90px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, #ef4444, #b91c1c);
        color: #fff; font-size: 2.5rem;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        margin: 10px auto 8px;
        box-shadow: 0 6px 24px rgba(239,68,68,0.45);
        transition: transform 0.12s;
        position: relative;
        flex-shrink: 0;
      }
      .duo-mic-btn.pulsing::before {
        content: '';
        position: absolute; inset: -10px;
        border-radius: 50%;
        border: 3px solid rgba(239,68,68,0.45);
        animation: micPulse 1.2s ease-out infinite;
      }
      .duo-mic-btn.pulsing::after {
        content: '';
        position: absolute; inset: -20px;
        border-radius: 50%;
        border: 2px solid rgba(239,68,68,0.2);
        animation: micPulse 1.2s ease-out 0.3s infinite;
      }
      @keyframes micPulse {
        0%   { opacity:1; transform:scale(1); }
        100% { opacity:0; transform:scale(1.4); }
      }
      .duo-mic-status {
        text-align: center;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-2, #94a3b8);
        min-height: 24px;
        margin-bottom: 4px;
      }
      .duo-speaking-target {
        font-family: var(--font-zh, 'Noto Sans TC', serif);
        font-size: 2.6rem;
        font-weight: 900;
        text-align: center;
        margin: 4px 0 2px;
      }
      .duo-speaking-hear {
        text-align: center;
        color: #8b5cf6;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        margin-bottom: 8px;
        display: flex; align-items: center; justify-content: center; gap: 6px;
      }
      .duo-speaking-hear:active { opacity: 0.7; }

      /* ── Bottom action area (fixed, never scrolls) ── */
      .duo-bottom-area {
        flex-shrink: 0;
        padding: 0 16px 0;
        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
      }

      /* ── Feedback panel (slides up from bottom) ── */
      .duo-feedback-panel {
        border-radius: 20px 20px 0 0;
        padding: 16px 16px 4px;
        margin: 0 -16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
        will-change: transform;
      }
      .duo-feedback-panel.correct {
        background: rgba(22,163,74,0.12);
        border-top: 3px solid #22c55e;
      }
      .duo-feedback-panel.wrong {
        background: rgba(220,38,38,0.1);
        border-top: 3px solid #ef4444;
      }
      .duo-feedback-header {
        display: flex; align-items: center; gap: 10px;
      }
      .duo-feedback-icon {
        width: 36px; height: 36px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.3rem;
        flex-shrink: 0;
      }
      .correct .duo-feedback-icon { background: rgba(34,197,94,0.15); }
      .wrong  .duo-feedback-icon { background: rgba(239,68,68,0.15); }
      .duo-feedback-title {
        font-size: 1.05rem;
        font-weight: 800;
      }
      .correct .duo-feedback-title { color: #22c55e; }
      .wrong  .duo-feedback-title  { color: #ef4444; }
      .duo-feedback-explanation {
        font-family: var(--font-zh, 'Noto Sans TC', serif);
        font-size: 1rem;
        color: var(--text-2, #cbd5e1);
        line-height: 1.5;
        padding-left: 46px;
        margin-top: -4px;
      }

      /* ── Primary CTA buttons ── */
      .duo-btn-check {
        width: 100%;
        min-height: 54px;
        border-radius: 16px;
        border: none;
        font-size: 1.05rem;
        font-weight: 800;
        cursor: pointer;
        letter-spacing: 0.5px;
        transition: transform 0.1s, box-shadow 0.1s;
      }
      .duo-btn-check:active { transform: translateY(2px); box-shadow: none !important; }
      .duo-btn-check.active-check {
        background: #10b981;
        color: #fff;
        box-shadow: 0 4px 0 #059669, 0 6px 16px rgba(16,185,129,0.35);
      }
      .duo-btn-check.correct-btn {
        background: #22c55e;
        color: #fff;
        box-shadow: 0 4px 0 #15803d, 0 6px 16px rgba(34,197,94,0.35);
      }
      .duo-btn-check.wrong-btn {
        background: #ef4444;
        color: #fff;
        box-shadow: 0 4px 0 #b91c1c, 0 6px 16px rgba(239,68,68,0.35);
      }
      .duo-btn-check:disabled {
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.3);
        cursor: not-allowed;
        box-shadow: none;
      }

      /* ── XP gain micro-badge ── */
      .duo-xp-badge {
        position: fixed;
        top: 60px;
        right: 16px;
        background: #f59e0b;
        color: #fff;
        font-weight: 900;
        font-size: 0.85rem;
        padding: 4px 10px;
        border-radius: 20px;
        z-index: 9000;
        pointer-events: none;
        animation: xpBadgePop 0.9s ease forwards;
      }
      @keyframes xpBadgePop {
        0%   { opacity:0; transform: translateY(8px) scale(0.7); }
        30%  { opacity:1; transform: translateY(0) scale(1.1); }
        70%  { opacity:1; transform: translateY(-4px) scale(1); }
        100% { opacity:0; transform: translateY(-16px) scale(0.9); }
      }

      /* ── Streak banner ── */
      .duo-streak-banner {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #fff;
        font-weight: 900;
        font-size: 1.3rem;
        padding: 16px 32px;
        border-radius: 24px;
        z-index: 9000;
        pointer-events: none;
        text-align: center;
        box-shadow: 0 10px 40px rgba(245,158,11,0.5);
        animation: streakPop 1.4s ease forwards;
      }
      @keyframes streakPop {
        0%  { transform: translate(-50%,-50%) scale(0); opacity:0; }
        25% { transform: translate(-50%,-50%) scale(1.1); opacity:1; }
        70% { transform: translate(-50%,-50%) scale(1); opacity:1; }
        100%{ transform: translate(-50%,-50%) scale(0.8); opacity:0; }
      }

      /* ── Screen flash overlay ── */
      .duo-flash {
        position: fixed; inset: 0;
        pointer-events: none; z-index: 8000;
        animation: screenFlash 0.3s ease forwards;
      }
      @keyframes screenFlash {
        0%   { opacity: 1; }
        100% { opacity: 0; }
      }

      /* ── Path Map UI ── */
      .duo-path-layout {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        background: var(--body-bg, #0f172a);
        color: var(--text, #f8fafc);
        font-family: 'Outfit', 'Inter', sans-serif;
        overflow: hidden;
        z-index: 100;
      }
      .duo-path-topbar {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 16px 8px;
        flex-shrink: 0;
      }
      .duo-section-tabs {
        display: flex; gap: 6px; overflow-x: auto; padding: 0 16px 8px;
        scrollbar-width: none; flex-shrink: 0;
      }
      .duo-section-tabs::-webkit-scrollbar { display: none; }
      .duo-section-tab {
        padding: 7px 14px;
        border-radius: 14px;
        border: 2px solid transparent;
        background: rgba(255,255,255,0.05);
        color: var(--text-2, #cbd5e1);
        font-weight: 700; font-size: 0.8rem;
        white-space: nowrap; cursor: pointer;
        transition: all 0.18s;
        display: flex; align-items: center; gap: 5px;
        flex-shrink: 0;
      }
      .duo-section-tab.active { background: rgba(59,130,246,0.15); border-color: #3b82f6; color: #3b82f6; }
      .duo-section-tab.locked { opacity: 0.5; cursor: not-allowed; }
      .duo-section-banner {
        margin: 0 16px 14px;
        padding: 14px 18px;
        border-radius: 18px;
        color: #fff;
        flex-shrink: 0;
      }
      .duo-section-banner.sec_novice       { background: linear-gradient(135deg,#10b981,#059669); }
      .duo-section-banner.sec_elementary   { background: linear-gradient(135deg,#3b82f6,#1d4ed8); }
      .duo-section-banner.sec_intermediate { background: linear-gradient(135deg,#8b5cf6,#6d28d9); }
      .duo-section-banner.sec_advanced     { background: linear-gradient(135deg,#f59e0b,#d97706); }
      .duo-path-scroll {
        flex: 1; overflow-y: auto; overflow-x: hidden;
        padding: 0 20px 20px;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        display: flex; flex-direction: column; align-items: center; gap: 28px;
      }
      .duo-path-scroll::-webkit-scrollbar { display: none; }
      .duo-node-wrapper {
        display: flex; flex-direction: column; align-items: center;
        position: relative; width: 100%;
      }
      .duo-node-wrapper.offset-left  { transform: translateX(-44px); }
      .duo-node-wrapper.offset-right { transform: translateX(44px); }
      .duo-node-btn {
        width: 80px; height: 80px;
        border-radius: 50%; border: none;
        background: var(--card-bg, #1e293b);
        box-shadow: 0 8px 0 #0c1524, 0 12px 20px rgba(0,0,0,0.35);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.9rem; cursor: pointer;
        transition: transform 0.12s, box-shadow 0.12s;
        position: relative;
      }
      .duo-node-btn:active:not(.locked) {
        transform: translateY(5px);
        box-shadow: 0 3px 0 #0c1524, 0 5px 10px rgba(0,0,0,0.25);
      }
      .duo-node-btn.locked {
        background: #1e293b; cursor: not-allowed;
        box-shadow: 0 6px 0 #0c1524;
      }
      .duo-node-btn.locked::after {
        content: '🔒'; font-size: 0.9rem;
        position: absolute; bottom: -3px; right: -3px;
        background: #334155; border: 2px solid #0f172a;
        width: 22px; height: 22px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
      }
      .duo-node-ring {
        position: absolute; top: -9px; left: -9px;
        width: 98px; height: 98px;
        transform: rotate(-90deg);
        pointer-events: none;
      }
      .duo-node-label {
        margin-top: 12px;
        font-weight: 800; font-size: 0.88rem;
        color: var(--text-2, #cbd5e1);
        text-align: center; max-width: 130px; line-height: 1.25;
      }
      .duo-node-xp-label {
        font-size: 0.72rem; color: #64748b;
        font-weight: 600; margin-top: 3px;
        text-align: center;
      }

      /* ── Chapter drawer ── */
      .duo-drawer-backdrop {
        position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 1990;
      }
      .duo-drawer {
        position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
        width: 100%; max-width: 430px;
        background: var(--card-bg, #1e293b);
        border-radius: 28px 28px 0 0;
        padding: 24px 20px;
        padding-bottom: calc(env(safe-area-inset-bottom,0px) + 20px);
        box-sizing: border-box;
        box-shadow: 0 -12px 48px rgba(0,0,0,0.55);
        z-index: 2000;
        animation: slideUp 0.24s cubic-bezier(0.4,0,0.2,1);
      }
      @keyframes slideUp { from { transform:translate(-50%,100%); } to { transform:translate(-50%,0); } }
      .duo-drawer-handle {
        width: 36px; height: 4px;
        background: rgba(255,255,255,0.15);
        border-radius: 2px; margin: 0 auto 18px;
      }
      .duo-word-pills {
        display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px;
      }
      .duo-word-pill {
        padding: 4px 10px;
        border-radius: 10px;
        background: rgba(255,255,255,0.07);
        font-family: var(--font-zh, 'Noto Sans TC', serif);
        font-size: 0.9rem; color: var(--text-2, #cbd5e1);
      }
      .duo-word-pill.learned {
        background: rgba(34,197,94,0.12);
        color: #22c55e;
        border: 1px solid rgba(34,197,94,0.2);
      }
      .duo-drawer-cta {
        display: flex; gap: 10px; margin-top: 4px;
      }
      .duo-btn-primary {
        flex: 1;
        min-height: 52px;
        border-radius: 16px;
        background: #10b981;
        color: #fff;
        font-size: 1.05rem; font-weight: 800;
        border: none; cursor: pointer;
        box-shadow: 0 4px 0 #059669, 0 6px 16px rgba(16,185,129,0.35);
        transition: transform 0.1s, box-shadow 0.1s;
      }
      .duo-btn-primary:active { transform: translateY(3px); box-shadow: 0 1px 0 #059669; }
      .duo-btn-outline {
        min-height: 52px;
        padding: 0 20px;
        border-radius: 16px;
        background: transparent;
        color: var(--text-2, #cbd5e1);
        font-size: 1rem; font-weight: 700;
        border: 2px solid rgba(255,255,255,0.12);
        cursor: pointer;
        transition: background 0.15s;
      }
      .duo-btn-outline:active { background: rgba(255,255,255,0.05); }

      /* ── Session complete & out of hearts ── */
      .duo-end-layout {
        position: fixed; inset: 0;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 20px;
        background: var(--body-bg, #0f172a);
        z-index: 100; overflow-y: auto;
      }
      .duo-end-card {
        width: 100%; max-width: 390px;
        background: var(--card-bg, #1e293b);
        border-radius: 24px;
        padding: 28px 24px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      }
      .duo-end-trophy { font-size: 4.5rem; line-height: 1; margin-bottom: 12px; }
      .duo-end-title  { font-size: 1.8rem; font-weight: 900; margin-bottom: 4px; }
      .duo-end-sub    { font-size: 0.95rem; color: var(--text-2,#94a3b8); margin-bottom: 20px; }
      .duo-end-stats  { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 20px; }
      .duo-end-stat   { background: rgba(255,255,255,0.04); border-radius: 14px; padding: 12px 8px; border: 1.5px solid rgba(255,255,255,0.06); }
      .duo-end-stat-val { font-size: 1.3rem; font-weight: 900; }
      .duo-end-stat-label { font-size: 0.65rem; color: #64748b; text-transform: uppercase; font-weight: 800; margin-top: 3px; }
      .duo-end-actions { display: flex; flex-direction: column; gap: 10px; }

      /* ── Confetti ── */
      @keyframes confettiFall {
        0%   { transform: translateY(-10px) rotate(0deg); opacity:1; }
        100% { transform: translateY(110vh) rotate(720deg); opacity:0; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Preload animations ──
  async function initAnimations() {
    if (!window.AnimRegistry) return;
    const critical = ['correct_answer','wrong_answer','mascot_idle','mascot_thinking','mascot_happy','mascot_sad','mascot_encouraging'];
    await Promise.all(critical.map(k => AnimRegistry.load(k)));
    playInlineMascot(state.currentQuestion?.type ?? 'multiple_choice');
    setTimeout(() => {
      ['streak_3','streak_5','xp_gain','level_up','session_complete','out_of_hearts','new_word','listening_audio','speaking_mic'].forEach(k => AnimRegistry.load(k));
    }, 1500);
  }

  // ── UI Flash ──
  function flashScreen(color) {
    const el = document.createElement('div');
    el.className = 'duo-flash';
    el.style.background = color;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  // ── XP Pop ──
  function showXPBadge(amount) {
    const el = document.createElement('div');
    el.className = 'duo-xp-badge';
    el.textContent = `+${amount} XP`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  // ── Streak Banner ──
  function showStreakBanner(n) {
    const el = document.createElement('div');
    el.className = 'duo-streak-banner';
    el.innerHTML = `🔥 ${n} in a row!<br><span style="font-size:0.75rem;opacity:0.85;font-weight:600;">Keep going!</span>`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  // ── Route Renderer ──
  async function render(container) {
    state.container = container;
    injectStyles();

    if (!App.state.vocabulary || !Array.isArray(App.state.vocabulary)) {
      container.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:var(--body-bg,#0f172a);color:#fff;"><div class="spinner"></div><p style="margin-top:16px;font-weight:600;">Loading vocabulary...</p></div>`;
      try {
        const r = await API.get('vocabulary');
        App.state.vocabulary = Array.isArray(r) ? r : (r.sets || []);
      } catch(e) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#fff;"><p>⚠️ Failed to load vocabulary.</p><button onclick="location.reload()" style="margin-top:16px;padding:12px 24px;border-radius:12px;background:#3b82f6;color:#fff;border:none;font-weight:700;cursor:pointer;">Retry</button></div>`;
        return;
      }
    }

    const uniqueMap = new Map();
    App.state.vocabulary.forEach(set => {
      if (!set.words) return;
      set.words.forEach(w => {
        if (w.word && !uniqueMap.has(w.word)) {
          uniqueMap.set(w.word, {
            id:'w_'+w.word, term:w.word, pinyin:w.pinyin||'', meaning:w.definition||'',
            level:set.level?set.level.toUpperCase():'A1', setId:set.id, setName:set.name,
            semanticGroup:set.name?set.name.replace(/Chapter \d+:\s*/,''):'General',
            exampleSentences:[w.example_sentence?.sentence,...(w.example_words?.map(ew=>`${w.word}${ew.word}`)||[])].filter(Boolean),
            useTTS:true, partOfSpeech:'noun'
          });
        }
      });
    });

    state.words = Array.from(uniqueMap.values());
    if (!state.words.length) state.words = [...SEED_WORDS];

    const badge = document.getElementById('duolingo-nav-badge');
    if (badge && localStorage.getItem('tocfl_duolingo_seen') === 'true') badge.remove();

    state.userStates = loadUserWordStates(state.words);

    const totalXP = App.state.progress?.xpTotal || 0;
    let savedSec = localStorage.getItem('tocfl_duolingo_active_section');
    let activeSec = SECTIONS.find(s => s.id === savedSec);
    if (!activeSec || totalXP < activeSec.requiredXP) {
      const unlocked = SECTIONS.filter(s => totalXP >= s.requiredXP);
      activeSec = unlocked[unlocked.length-1] || SECTIONS[0];
    }
    state.activeSectionId = activeSec.id;

    const cp = recoverCheckpoint();
    if (cp) {
      if (confirm('Continue your previous session?')) {
        state.session = cp.session;
        state.userStates = cp.states;
        state.hearts = 3; state.streak = 0;
        state.startTime = Date.now();
        state.uiState = 'SHOWING_QUESTION';
        await initAnimations();
        showQuestion();
        return;
      } else { clearCheckpoint(); }
    }
    showPathMap();
  }

  // ── PATH MAP ──
  function showPathMap() {
    state.uiState = 'PATH_MAP';
    state.activeChapterId = null;
    renderPathUI();
  }

  function renderPathUI() {
    const totalXP = App.state.progress?.xpTotal || 0;
    const chapters = getChapters();
    const activeSec = SECTIONS.find(s => s.id === state.activeSectionId) || SECTIONS[0];

    const sectionChapters = chapters.map((ch,gi) => ({...ch,globalIndex:gi})).filter(ch => {
      const lvl = ch.level.toUpperCase();
      if (activeSec.id === 'sec_advanced') return !['NOVICE','A1','A2','A2/B1'].includes(lvl);
      return activeSec.levels.includes(lvl);
    });

    const progressPct = Math.min(100, Math.round((totalXP/5000)*100));
    const iconMap = {'Greetings':'💬','Food & Drinks':'🍎','Family Members':'👪','Time Expressions':'🕒','Weather & Nature':'☀️','Occupations':'💼','Food & Dining':'🍜','Transportation':'🚗','Shopping':'🛍️','Weather':'☁️','Health & Body':'🏥','School & Study':'🏫','Directions & Places':'🗺️','Work & Careers':'💼','Hobbies & Leisure':'🎮','Measure Words (量詞)':'📐'};

    const tabsHtml = SECTIONS.map(sec => {
      const unlocked = totalXP >= sec.requiredXP;
      const active = sec.id === state.activeSectionId;
      return `<button class="duo-section-tab ${active?'active':''} ${unlocked?'':'locked'}" onclick="LearningModeModule.clickSectionTab('${sec.id}')">
        ${unlocked?'':'🔒 '}${sec.name.replace('Section ','Sec ')}
      </button>`;
    }).join('');

    const nodesHtml = sectionChapters.map((ch, idx) => {
      const xpReq = ch.globalIndex * 150;
      const isUnlocked = totalXP >= xpReq;
      const total = ch.words.length;
      const learned = ch.words.filter(w => { const s = state.userStates.find(us => us.wordId===w.id); return s && s.correctCount >= 1; }).length;
      const pct = total > 0 ? Math.round((learned/total)*100) : 0;
      const r = 40; const circ = 2*Math.PI*r;
      const offset = circ - (pct/100)*circ;
      let align = '';
      if (idx%4===1) align='offset-left'; else if (idx%4===3) align='offset-right';
      const icon = iconMap[ch.semanticGroup] || ch.words[0]?.term[0] || '學';
      const shortName = ch.name.replace(/^Chapter \d+:\s*/,'');

      return `
        <div class="duo-node-wrapper ${align}">
          <button class="duo-node-btn ${isUnlocked?'':'locked'}" onclick="LearningModeModule.clickPathNode('${ch.id}',${isUnlocked})" aria-label="Study ${ch.name}">
            ${isUnlocked?`<svg class="duo-node-ring"><circle cx="49" cy="49" r="${r}" stroke="rgba(255,255,255,0.07)" stroke-width="7" fill="none"/><circle cx="49" cy="49" r="${r}" stroke="#f59e0b" stroke-width="7" fill="none" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"/></svg>`:''}
            <span style="font-family:var(--font-zh);font-size:1.8rem;z-index:2;position:relative;">${isUnlocked?icon:''}</span>
          </button>
          <div class="duo-node-label">${shortName}</div>
          ${isUnlocked?`<div class="duo-node-xp-label">${learned}/${total} words${pct===100?' ✓':''}</div>`:''}
        </div>
      `;
    }).join('');

    // Drawer HTML
    let drawerHtml = '';
    if (state.activeChapterId) {
      const ch = chapters.find(c => c.id === state.activeChapterId);
      if (ch) {
        const learned = ch.words.filter(w => { const s = state.userStates.find(us => us.wordId===w.id); return s && s.correctCount >= 1; }).length;
        const pillsHtml = ch.words.slice(0,12).map(w => {
          const s = state.userStates.find(us => us.wordId===w.id);
          const done = s && s.correctCount >= 1;
          return `<span class="duo-word-pill ${done?'learned':''}" title="${w.meaning}">${w.term}</span>`;
        }).join('') + (ch.words.length > 12 ? `<span class="duo-word-pill">+${ch.words.length-12} more</span>` : '');

        drawerHtml = `
          <div class="duo-drawer-backdrop" onclick="LearningModeModule.closeDrawer()"></div>
          <div class="duo-drawer">
            <div class="duo-drawer-handle"></div>
            <h3 style="font-size:1.3rem;font-weight:900;margin:0 0 4px;">${ch.name}</h3>
            <p style="color:#64748b;font-size:0.88rem;margin:0 0 14px;">${learned} of ${ch.words.length} words practiced</p>
            <div class="duo-word-pills">${pillsHtml}</div>
            <div class="duo-drawer-cta">
              <button class="duo-btn-primary" onclick="LearningModeModule.startChapterSession('${ch.id}')">Start Lesson</button>
              <button class="duo-btn-outline" onclick="LearningModeModule.closeDrawer()">Cancel</button>
            </div>
          </div>
        `;
      }
    }

    state.container.innerHTML = `
      <div class="duo-path-layout">
        <div class="duo-path-topbar">
          <a class="duo-topbar-exit" href="#/" aria-label="Home" style="text-decoration:none;color:var(--text-2);">🏠</a>
          <div class="duo-progress-bar" style="height:12px;">
            <div class="duo-progress-fill" style="width:${progressPct}%;background:linear-gradient(90deg,#f59e0b,#fbbf24);"></div>
          </div>
          <div class="duo-stats-row">
            <div class="duo-stat-chip"><span style="color:#f59e0b;">⭐</span><span>${totalXP}</span></div>
            <div class="duo-stat-chip"><span class="duo-streak-icon">🔥</span><span>${App.state.progress?.streak||0}</span></div>
          </div>
        </div>
        <div class="duo-section-tabs">${tabsHtml}</div>
        <div class="duo-section-banner ${activeSec.id}">
          <div style="font-size:1.15rem;font-weight:900;">${activeSec.name}</div>
          <div style="font-size:0.82rem;opacity:0.9;margin-top:3px;">${activeSec.subtitle}</div>
        </div>
        <div class="duo-path-scroll">
          ${nodesHtml || '<p style="text-align:center;opacity:0.5;padding:32px 0;">No chapters yet in this section.</p>'}
        </div>
        ${drawerHtml}
      </div>
    `;
  }

  // ── SESSION ──
  function startSessionForChapter(chapterId) {
    const words = state.words.filter(w => w.setId === chapterId);
    state.session = buildSession(words, state.userStates, Math.min(15, Math.max(5, words.length)));
    state.hearts = 3; state.streak = 0;
    state.startTime = Date.now();
    state.uiState = 'SHOWING_QUESTION';
    initAnimations();
    showQuestion();
  }

  function showQuestion() {
    state.uiState = 'SHOWING_QUESTION';
    state.selectedChoice = null;
    state.tappedTiles = [];
    state.sttSubState = 'idle';
    state.sttTranscript = '';
    state.feedbackVisible = false;

    if (state.session.currentIndex >= state.session.questionQueue.length) {
      finishSession(); return;
    }

    state.currentQuestion = state.session.questionQueue[state.session.currentIndex];
    sound.playCardFlip();
    renderUI();
    setTimeout(() => playInlineMascot(state.currentQuestion.type), 100);

    if (state.currentQuestion.type === 'listening') {
      setTimeout(() => playAudio(), 600);
    }
  }

  // ── RENDER QUESTION UI ──
  function renderUI() {
    const q = state.currentQuestion;
    const progressPct = Math.round((state.session.currentIndex / state.session.questionQueue.length) * 100);
    const meta = QUESTION_TYPE_META[q.type] || QUESTION_TYPE_META.multiple_choice;
    const isRevealing = state.uiState === 'REVEALING';
    const isCorrect = isRevealing ? isAnswerCorrect() : null;

    // Hearts HTML
    const heartsHtml = [0,1,2].map(i => `<span class="duo-heart-icon">${i < state.hearts ? '❤️' : '🖤'}</span>`).join('');
    const streakHtml = state.streak >= 2 ? `<span class="duo-stat-chip"><span class="duo-streak-icon">🔥</span><span>${state.streak}</span></span>` : '';

    // Question content
    let contentHtml = '';

    if (q.type === 'multiple_choice') {
      contentHtml = `
        ${getMascotHTML(q.type)}
        <div class="duo-prompt-main">${q.prompt}</div>
        ${q.word.pinyin ? `<div class="duo-prompt-pinyin">${q.word.pinyin}</div>` : ''}
        <div class="duo-prompt-sub">What does this mean?</div>
        <div class="duo-options">
          ${q.choices.map((choice, i) => {
            let cls = '';
            if (isRevealing) {
              if (choice === q.correctAnswer) cls = 'correct';
              else if (choice === state.selectedChoice) cls = 'wrong';
              else cls = 'dimmed';
            } else if (state.selectedChoice === choice) cls = 'selected';
            const letters = 'ABCD';
            return `<button class="duo-option-btn ${cls}" onclick="LearningModeModule.selectChoice('${choice.replace(/'/g,"\\'")}') " ${isRevealing?'disabled':''}>
              <span class="duo-option-letter">${letters[i]}</span>
              <span>${choice}</span>
            </button>`;
          }).join('')}
        </div>
      `;
    }

    else if (q.type === 'listening') {
      contentHtml = `
        ${getMascotHTML(q.type)}
        <div style="text-align:center;color:var(--text-2,#94a3b8);font-size:0.9rem;margin-bottom:4px;">Listen and choose the meaning</div>
        <button class="duo-audio-big ${state.uiState==='PLAYING_AUDIO'?'playing':''}" onclick="LearningModeModule.playAudio()" id="duo-audio-btn" aria-label="Play audio">🔊</button>
        <div style="text-align:center;font-size:0.78rem;color:#64748b;margin-bottom:10px;">Tap to play again</div>
        <div class="duo-options">
          ${q.choices.map((choice, i) => {
            let cls = '';
            if (isRevealing) {
              if (choice === q.correctAnswer) cls = 'correct';
              else if (choice === state.selectedChoice) cls = 'wrong';
              else cls = 'dimmed';
            } else if (state.selectedChoice === choice) cls = 'selected';
            const letters = 'ABCD';
            return `<button class="duo-option-btn ${cls}" onclick="LearningModeModule.selectChoice('${choice.replace(/'/g,"\\'")}') " ${isRevealing?'disabled':''}>
              <span class="duo-option-letter">${letters[i]}</span>
              <span>${choice}</span>
            </button>`;
          }).join('')}
        </div>
      `;
    }

    else if (q.type === 'fill_blank') {
      contentHtml = `
        ${getMascotHTML(q.type)}
        <div class="duo-prompt-main" style="font-size:1.6rem;line-height:1.4;">${q.prompt}</div>
        <div class="duo-prompt-sub">Choose the missing word</div>
        <div class="duo-options">
          ${q.choices.map((choice, i) => {
            let cls = '';
            if (isRevealing) {
              if (choice === q.correctAnswer) cls = 'correct';
              else if (choice === state.selectedChoice) cls = 'wrong';
              else cls = 'dimmed';
            } else if (state.selectedChoice === choice) cls = 'selected';
            const letters = 'ABCD';
            return `<button class="duo-option-btn ${cls}" style="font-family:var(--font-zh);font-size:1.15rem;" onclick="LearningModeModule.selectChoice('${choice.replace(/'/g,"\\'")}') " ${isRevealing?'disabled':''}>
              <span class="duo-option-letter">${letters[i]}</span>
              <span>${choice}</span>
            </button>`;
          }).join('')}
        </div>
      `;
    }

    else if (q.type === 'tile_assembly') {
      const selectedHtml = state.tappedTiles.map(idx =>
        `<button class="duo-tile in-zone" onclick="LearningModeModule.removeTile(${idx})" ${isRevealing?'disabled':''}>${q.tiles[idx]}</button>`
      ).join('');
      const bankHtml = q.tiles.map((tile, i) => {
        const tapped = state.tappedTiles.includes(i);
        return `<button class="duo-tile ${tapped?'tapped':''}" onclick="LearningModeModule.tapTile(${i})" ${(tapped||isRevealing)?'disabled':''}>${tile}</button>`;
      }).join('');

      contentHtml = `
        ${getMascotHTML(q.type)}
        <div class="duo-prompt-main" style="font-size:1.15rem;color:var(--text-2,#94a3b8);">${q.word.meaning}</div>
        <div class="duo-prompt-sub">Tap words to build the sentence</div>
        <div class="duo-tile-section">
          <div class="duo-tile-hint">Your answer:</div>
          <div class="duo-tile-answer-zone">${selectedHtml}</div>
          <div class="duo-tile-bank">${bankHtml}</div>
        </div>
      `;
    }

    else if (q.type === 'speaking') {
      let micStatus = 'Tap the mic to speak';
      let micClass = '';
      let btnDisabled = isRevealing;
      if (state.sttSubState === 'permission_requested') micStatus = 'Requesting mic access...';
      else if (state.sttSubState === 'recording') { micStatus = 'Listening... speak clearly'; micClass = 'pulsing'; }
      else if (state.sttSubState === 'processing') micStatus = 'Processing...';
      else if (state.sttSubState === 'result') micStatus = `Heard: "${state.sttTranscript || '?'}"`;

      contentHtml = `
        ${getMascotHTML(q.type)}
        <div class="duo-speaking-target">${q.word.term}</div>
        <div class="duo-prompt-sub">${q.word.meaning}</div>
        <div class="duo-speaking-hear" onclick="LearningModeModule.playAudio()">🔊 Hear pronunciation</div>
        <button class="duo-mic-btn ${micClass}" onclick="LearningModeModule.toggleSTT()" ${btnDisabled?'disabled':''}>🎙️</button>
        <div class="duo-mic-status">${micStatus}</div>
      `;
    }

    // Footer: feedback panel + CTA
    let footerHtml = '';
    if (isRevealing) {
      const ic = isCorrect ? '✓' : '✗';
      const title = isCorrect ? 'Correct! Great job.' : 'Incorrect';
      const panelCls = isCorrect ? 'correct' : 'wrong';
      const btnCls = isCorrect ? 'correct-btn' : 'wrong-btn';
      footerHtml = `
        <div class="duo-feedback-panel ${panelCls}">
          <div class="duo-feedback-header">
            <div class="duo-feedback-icon">${isCorrect ? '✅' : '❌'}</div>
            <div class="duo-feedback-title">${title}</div>
          </div>
          <div class="duo-feedback-explanation">${q.explanation}</div>
          <button class="duo-btn-check ${btnCls}" style="margin-top:10px;" onclick="LearningModeModule.advance()">Continue</button>
        </div>
      `;
    } else {
      let disabled = true;
      if (q.type === 'multiple_choice' || q.type === 'listening' || q.type === 'fill_blank') disabled = state.selectedChoice === null;
      else if (q.type === 'tile_assembly') disabled = state.tappedTiles.length === 0;
      else if (q.type === 'speaking') disabled = state.sttSubState !== 'result';
      footerHtml = `<button class="duo-btn-check ${disabled?'':'active-check'}" onclick="LearningModeModule.checkAnswer()" ${disabled?'disabled':''}>Check Answer</button>`;
    }

    state.container.innerHTML = `
      <div class="duo-layout">
        <div class="duo-topbar">
          <button class="duo-topbar-exit" onclick="LearningModeModule.quitSession()" aria-label="Exit session">✕</button>
          <div class="duo-progress-bar">
            <div class="duo-progress-fill" style="width:${progressPct}%"></div>
          </div>
          <div class="duo-stats-row">
            ${streakHtml}
            <div class="duo-stat-chip">${heartsHtml}</div>
          </div>
        </div>

        <div class="duo-qtype-row">
          <div class="duo-qtype-chip" style="background:${meta.color}22;color:${meta.color};">
            <span>${meta.icon}</span><span>${meta.label}</span>
          </div>
          <div style="flex:1;"></div>
          <span style="font-size:0.8rem;color:#64748b;font-weight:700;">${state.session.currentIndex+1}/${state.session.questionQueue.length}</span>
        </div>

        <div class="duo-question-area">
          ${contentHtml}
        </div>

        <div class="duo-bottom-area">
          ${footerHtml}
        </div>
      </div>
    `;

    // Re-init inline mascot lottie after render
    if (window.AnimRegistry) {
      setTimeout(() => {
        const key = isRevealing
          ? (isCorrect ? 'mascot_happy' : 'mascot_sad')
          : (() => {
              if (q.type==='listening') return 'mascot_idle';
              if (q.type==='speaking') return 'mascot_encouraging';
              return 'mascot_thinking';
            })();
        AnimRegistry.play(key, 'lottie-mascot-inline', { loop: true }).then(instance => {
          if (instance) {
            const emoji = state.container.querySelector('.duo-mascot-emoji');
            if (emoji) emoji.style.display = 'none';
          }
        });
      }, 80);
    }
  }

  // ── Answer evaluation ──
  function isAnswerCorrect() {
    const q = state.currentQuestion;
    if (q.type === 'multiple_choice' || q.type === 'listening' || q.type === 'fill_blank') return state.selectedChoice === q.correctAnswer;
    if (q.type === 'tile_assembly') {
      const userStr = state.tappedTiles.map(i => q.tiles[i]).join('').replace(/[\s，。！？,.!?]/g,'');
      return userStr === q.correctAnswer;
    }
    if (q.type === 'speaking') return checkPronunciation(q.correctAnswer, state.sttTranscript);
    return false;
  }

  // ── Check Answer ──
  function checkAnswer() {
    if (state.uiState === 'REVEALING') return;
    speech.stop();
    state.uiState = 'REVEALING';

    const isCorrect = isAnswerCorrect();
    const q = state.currentQuestion;

    // Visual feedback
    flashScreen(isCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.14)');
    if (!isCorrect && navigator.vibrate) navigator.vibrate([60,40,60]);

    if (isCorrect) {
      state.streak++;
      state.session.totalCorrect++;
      sound.playCorrect();
      showXPBadge(10);

      if (state.streak === 3 || state.streak === 5 || (state.streak >= 10 && state.streak % 5 === 0)) {
        setTimeout(() => { showStreakBanner(state.streak); sound.playStreak(); }, 200);
      }

      const wIdx = state.userStates.findIndex(s => s.wordId === q.word.id);
      if (wIdx >= 0) state.userStates[wIdx] = updateSRS(state.userStates[wIdx], true);
    } else {
      state.streak = 0;
      state.session.totalWrong++;
      state.hearts--;
      sound.playWrong();
      const wIdx = state.userStates.findIndex(s => s.wordId === q.word.id);
      if (wIdx >= 0) state.userStates[wIdx] = updateSRS(state.userStates[wIdx], false);
    }

    renderUI();

    // Auto-checkpoint every 5 questions
    const total = state.session.totalCorrect + state.session.totalWrong;
    if (total % 5 === 0) saveCheckpoint(state.session, state.userStates);

    // Auto-advance on correct after 1.4s
    if (isCorrect) {
      setTimeout(() => { if (state.uiState === 'REVEALING') advance(); }, 1400);
    }
  }

  function advance() {
    if (state.hearts <= 0) {
      state.uiState = 'OUT_OF_HEARTS';
      renderOutOfHearts();
      sound.playWrong();
      return;
    }
    state.session.currentIndex++;
    showQuestion();
  }

  function quitSession() {
    if (confirm('Quit session? Your progress will be saved.')) {
      saveCheckpoint(state.session, state.userStates);
      speech.stop();
      showPathMap();
    }
  }

  // ── Interaction handlers ──
  function selectChoice(choice) {
    if (state.uiState === 'REVEALING') return;
    state.selectedChoice = choice;
    state.uiState = 'ANSWER_SELECTED';
    renderUI();
  }

  function tapTile(index) {
    if (state.uiState === 'REVEALING') return;
    if (!state.tappedTiles.includes(index)) { state.tappedTiles.push(index); renderUI(); }
  }

  function removeTile(index) {
    if (state.uiState === 'REVEALING') return;
    state.tappedTiles = state.tappedTiles.filter(i => i !== index);
    renderUI();
  }

  function playAudio() {
    if (state.currentQuestion?.word) {
      const btn = document.getElementById('duo-audio-btn');
      if (btn) btn.classList.add('playing');
      sound.speakWord(state.currentQuestion.word).then(() => {
        const b = document.getElementById('duo-audio-btn');
        if (b) b.classList.remove('playing');
      });
    }
  }

  function toggleSTT() {
    if (state.sttSubState === 'recording') {
      speech.stop(); return;
    }
    state.sttSubState = 'permission_requested';
    renderUI();

    let maxTimer;
    speech.start(
      transcript => {
        clearTimeout(maxTimer);
        state.sttTranscript = transcript;
        state.sttSubState = 'result';
        renderUI();
      },
      err => {
        clearTimeout(maxTimer);
        console.warn('STT error:', err);
        state.sttSubState = 'result';
        state.sttTranscript = '';
        renderUI();
      },
      () => { clearTimeout(maxTimer); }
    );
    state.sttSubState = 'recording';
    renderUI();
    maxTimer = setTimeout(() => { speech.stop(); state.sttSubState = 'result'; state.sttTranscript = ''; renderUI(); }, 8000);
  }

  // ── Session end screens ──
  function finishSession() {
    clearCheckpoint();
    localStorage.setItem('tocfl_duolingo_seen', 'true');
    saveUserWordStates(state.userStates);

    const total = state.session.totalCorrect + state.session.totalWrong;
    const accuracy = total > 0 ? Math.round((state.session.totalCorrect/total)*100) : 100;
    const elapsed = Math.round((Date.now() - state.startTime)/1000);
    const mm = Math.floor(elapsed/60), ss = elapsed%60;
    const baseXP = state.session.totalCorrect * 10;
    const xpTotal = baseXP + 100;

    const xpBefore = App.state.progress?.xpTotal || 0;
    const lvBefore = getLevelIdFromXP(xpBefore);
    if (App.state.progress) { App.state.progress.xpTotal = xpBefore + xpTotal; App.saveProgress?.(); }
    const xpAfter = App.state.progress?.xpTotal || 0;
    const lvAfter = getLevelIdFromXP(xpAfter);

    state.uiState = 'SESSION_COMPLETE';

    const lvNames = ['','Beginner','Elementary','Intermediate','Advanced','Master'];
    const lvColors = ['','#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444'];

    state.container.innerHTML = `
      <div class="duo-end-layout">
        <div class="duo-end-card">
          <div class="duo-end-trophy">🏆</div>
          <div class="duo-end-title">Session Complete!</div>
          <div class="duo-end-sub">Amazing work — keep the streak going!</div>
          <div class="duo-end-stats">
            <div class="duo-end-stat">
              <div class="duo-end-stat-val" style="color:#f59e0b">+${xpTotal}</div>
              <div class="duo-end-stat-label">XP Earned</div>
            </div>
            <div class="duo-end-stat">
              <div class="duo-end-stat-val" style="color:#10b981">${accuracy}%</div>
              <div class="duo-end-stat-label">Accuracy</div>
            </div>
            <div class="duo-end-stat">
              <div class="duo-end-stat-val" style="color:#3b82f6">${mm}:${String(ss).padStart(2,'0')}</div>
              <div class="duo-end-stat-label">Duration</div>
            </div>
          </div>
          <div style="background:rgba(255,255,255,0.04);border-radius:16px;padding:14px 16px;text-align:left;margin-bottom:20px;border:1.5px solid rgba(255,255,255,0.06);">
            <div style="font-size:0.72rem;color:${lvColors[lvAfter]};text-transform:uppercase;font-weight:800;letter-spacing:0.5px;">Current Level</div>
            <div style="font-size:1.2rem;font-weight:900;margin-top:3px;">Level ${lvAfter}: ${lvNames[lvAfter]}</div>
            <div style="font-size:0.8rem;color:#64748b;margin-top:2px;">Total: ${xpAfter} XP</div>
          </div>
          ${lvAfter > lvBefore ? `<div style="background:linear-gradient(135deg,#f59e0b22,#d9770622);border:1.5px solid #f59e0b44;border-radius:14px;padding:12px 16px;margin-bottom:16px;text-align:center;"><div style="font-size:1.5rem;">🎉</div><div style="font-weight:800;color:#f59e0b;">Level Up! You reached ${lvNames[lvAfter]}!</div></div>` : ''}
          <div class="duo-end-actions">
            <button class="duo-btn-primary" style="width:100%;" onclick="LearningModeModule.showPathMap()">Keep Learning</button>
            <button class="duo-btn-outline" style="width:100%;" onclick="LearningModeModule.restartSession()">Practice Again</button>
          </div>
        </div>
      </div>
    `;

    sound.playLevelUp();
    setTimeout(triggerConfetti, 150);
  }

  function renderOutOfHearts() {
    clearCheckpoint();
    state.container.innerHTML = `
      <div class="duo-end-layout">
        <div class="duo-end-card">
          <div class="duo-end-trophy">💔</div>
          <div class="duo-end-title">Out of Hearts</div>
          <div class="duo-end-sub">Don't worry — every mistake is a lesson. Try again!</div>
          <div class="duo-end-stats">
            <div class="duo-end-stat">
              <div class="duo-end-stat-val" style="color:#10b981">${state.session.totalCorrect}</div>
              <div class="duo-end-stat-label">Correct</div>
            </div>
            <div class="duo-end-stat">
              <div class="duo-end-stat-val" style="color:#ef4444">${state.session.totalWrong}</div>
              <div class="duo-end-stat-label">Incorrect</div>
            </div>
            <div class="duo-end-stat">
              <div class="duo-end-stat-val" style="color:#f59e0b">+${state.session.totalCorrect*8}</div>
              <div class="duo-end-stat-label">XP Saved</div>
            </div>
          </div>
          <div class="duo-end-actions">
            <button class="duo-btn-primary" style="width:100%;" onclick="LearningModeModule.restartSession()">Try Again</button>
            <button class="duo-btn-outline" style="width:100%;" onclick="LearningModeModule.showPathMap()">Back to Map</button>
          </div>
        </div>
      </div>
    `;
  }

  // ── SRS Self-tests ──
  function runSelfTests() {
    let s, sn;
    s = createDefaultState('t1'); sn = updateSRS(s, true, false);
    console.assert(sn.interval === 1, 'SRS T1: interval must be 1');
    console.assert(Math.abs(sn.easeFactor-2.6) < 0.01, 'SRS T1: easeFactor must be 2.6');
    s = createDefaultState('t2'); sn = updateSRS(s, true, true);
    console.assert(Math.abs(sn.easeFactor-2.5) < 0.01, 'SRS T2: easeFactor must be 2.5');
    s = createDefaultState('t3'); sn = updateSRS(s, false);
    console.assert(sn.interval === 1, 'SRS T3: interval must be 1');
    console.assert(Math.abs(sn.easeFactor-2.18) < 0.01, 'SRS T3: easeFactor must be 2.18');
    console.log('✅ SRS self-tests passed.');
  }
  runSelfTests();

  return {
    render,
    selectChoice,
    tapTile,
    removeTile,
    playAudio,
    toggleSTT,
    checkAnswer,
    advance,
    quitSession,
    showPathMap,
    clickPathNode(chapterId, isUnlocked) {
      if (!isUnlocked) {
        const totalXP = App.state.progress?.xpTotal || 0;
        const ch = getChapters().find(c => c.id === chapterId);
        const req = (getChapters().findIndex(c => c.id === chapterId)) * 150;
        window.showToast?.(`🔒 Earn ${Math.max(0,req-totalXP)} more XP to unlock.`);
        return;
      }
      state.activeChapterId = chapterId;
      renderPathUI();
    },
    clickSectionTab(sectionId) {
      const sec = SECTIONS.find(s => s.id === sectionId);
      const totalXP = App.state.progress?.xpTotal || 0;
      if (totalXP < sec.requiredXP) {
        window.showToast?.(`🔒 Earn ${sec.requiredXP - totalXP} more XP to unlock this section.`);
        return;
      }
      state.activeSectionId = sectionId;
      localStorage.setItem('tocfl_duolingo_active_section', sectionId);
      state.activeChapterId = null;
      renderPathUI();
    },
    closeDrawer() { state.activeChapterId = null; renderPathUI(); },
    startChapterSession(chapterId) { startSessionForChapter(chapterId); },
    restartSession() {
      clearCheckpoint();
      if (state.session?.words?.length) {
        startSessionForChapter(state.session.words[0].setId);
      } else {
        showPathMap();
      }
    },
    unmount() {
      if (window.AnimRegistry) AnimRegistry.stopAll();
      speech.stop();
    }
  };
})();
