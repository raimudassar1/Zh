'use strict';

window.LearningModeModule = (() => {
  /* ─── Constants ─── */
  const STORE  = 'suyuan_v238';
  const PINKEY = 'suyuan_pinyin_v238';
  const MAX_HEARTS = 5;
  const XP_PER = 15;

  /* ─── Palette ─── */
  const C = {
    bg:     '#0d0d1a',
    bg2:    '#13132a',
    card:   '#1a1a35',
    card2:  '#21214a',
    border: '#2a2a55',
    purple: '#7c3aed',
    purpleL:'#9d5cf5',
    purpleD:'#5b21b6',
    green:  '#22c55e',
    greenD: '#16a34a',
    red:    '#ef4444',
    redD:   '#dc2626',
    gold:   '#f59e0b',
    goldD:  '#d97706',
    blue:   '#3b82f6',
    blueD:  '#1d4ed8',
    text:   '#f0eeff',
    textSub:'#9893b8',
    textDim:'#5a5680',
  };

  /* ─── State ─── */
  const state = {
    root: null,
    course: null,
    vocabBySection: null,
    units: [],
    sessions: [],
    loading: false,
    loadError: '',
    progress: loadProgress(),
    active: null,
    infoOpen: false,
    stepIndex: 0,
    selected: null,
    selectedMatch: null,
    matched: new Set(),
    answerTiles: [],
    answerTileIds: [],
    transcript: '',
    micState: 'idle',
    selectedSection: 1,
    showPinyin: localStorage.getItem(PINKEY) !== '0',
  };
  state.units = buildFallbackUnits();
  state.sessions = flattenSessions(state.units);

  /* ─── Persistence ─── */
  function loadProgress() {
    try {
      const p = JSON.parse(localStorage.getItem(STORE) || '{}');
      return { xp:p.xp||0, streak:p.streak||0, hearts:Number.isFinite(p.hearts)?p.hearts:MAX_HEARTS, done:p.done||{}, mistakes:p.mistakes||[], last:p.last||'' };
    } catch { return { xp:0, streak:0, hearts:MAX_HEARTS, done:{}, mistakes:[], last:'' }; }
  }
  function saveProgress() { localStorage.setItem(STORE, JSON.stringify(state.progress)); }

  /* ─── Content ─── */
  function item(zh,py,en,example,meta={}){ return {zh,py,en,example,...meta}; }
  function sent(zh,py,en){ return {zh,py,en}; }

  function buildFallbackUnits() {
    return [
      { id:'n01',icon:'👋',title:'Greetings',goal:'Say hello & polite phrases',
        words:[item('你好','nǐ hǎo','hello'),item('您好','nín hǎo','hello (formal)'),item('嗨','hāi','hi'),item('早安','zǎo ān','good morning'),item('晚安','wǎn ān','good night'),item('再見','zài jiàn','goodbye'),item('謝謝','xiè xie','thank you'),item('不客氣','bú kè qì','you\'re welcome'),item('對不起','duì bù qǐ','sorry'),item('沒關係','méi guān xì','it\'s okay')],
        sentences:[sent('你好，我是安娜','nǐ hǎo wǒ shì ān nà','Hello, I am Anna'),sent('老師，再見','lǎo shī zài jiàn','Goodbye, teacher'),sent('謝謝你','xiè xie nǐ','Thank you')]},
      { id:'n02',icon:'🙋',title:'Identity',goal:'Say who people are',
        words:[item('我','wǒ','I / me'),item('你','nǐ','you'),item('他','tā','he'),item('她','tā','she'),item('是','shì','am/is/are'),item('不是','bú shì','is not'),item('叫','jiào','be called'),item('名字','míng zì','name'),item('學生','xué shēng','student'),item('老師','lǎo shī','teacher')],
        sentences:[sent('我是學生','wǒ shì xué shēng','I am a student'),sent('她是老師','tā shì lǎo shī','She is a teacher'),sent('你叫什麼名字','nǐ jiào shén me míng zì','What is your name?')]},
      { id:'n03',icon:'👨‍👩‍👧',title:'Family',goal:'Name family members',
        words:[item('家','jiā','home/family'),item('爸爸','bà ba','dad'),item('媽媽','mā ma','mom'),item('哥哥','gē ge','older brother'),item('姐姐','jiě jie','older sister'),item('弟弟','dì di','younger brother'),item('妹妹','mèi mei','younger sister'),item('孩子','hái zi','child'),item('太太','tài tai','wife'),item('先生','xiān sheng','husband')],
        sentences:[sent('這是我的媽媽','zhè shì wǒ de mā ma','This is my mom'),sent('爸爸在家','bà ba zài jiā','Dad is at home'),sent('他是我的哥哥','tā shì wǒ de gē ge','He is my older brother')]},
      { id:'n04',icon:'👫',title:'People',goal:'Talk about friends',
        words:[item('朋友','péng yǒu','friend'),item('同學','tóng xué','classmate'),item('大家','dà jiā','everyone'),item('人','rén','person'),item('男生','nán shēng','boy'),item('女生','nǚ shēng','girl'),item('認識','rèn shi','to know'),item('高興','gāo xìng','happy'),item('一起','yì qǐ','together'),item('我們','wǒ men','we/us')],
        sentences:[sent('她是我的朋友','tā shì wǒ de péng yǒu','She is my friend'),sent('很高興認識你','hěn gāo xìng rèn shi nǐ','Nice to meet you'),sent('我們一起學中文','wǒ men yì qǐ xué zhōng wén','We study Chinese together')]},
      { id:'n05',icon:'❓',title:'Questions',goal:'Ask simple questions',
        words:[item('嗎','ma','question marker'),item('什麼','shén me','what'),item('誰','shéi','who'),item('哪','nǎ','which'),item('幾','jǐ','how many'),item('多少','duō shǎo','how much'),item('為什麼','wèi shén me','why'),item('請問','qǐng wèn','excuse me'),item('可以','kě yǐ','can/may'),item('不可以','bù kě yǐ','cannot')],
        sentences:[sent('這是什麼','zhè shì shén me','What is this?'),sent('他是誰','tā shì shéi','Who is he?'),sent('請問，可以嗎','qǐng wèn kě yǐ ma','Excuse me, is it okay?')]},
      { id:'n06',icon:'👆',title:'This & That',goal:'Point to things around you',
        words:[item('這','zhè','this'),item('那','nà','that'),item('這個','zhè ge','this one'),item('那個','nà ge','that one'),item('哪個','nǎ ge','which one'),item('這裡','zhè lǐ','here'),item('那裡','nà lǐ','there'),item('的','de','possessive'),item('也','yě','also'),item('都','dōu','all')],
        sentences:[sent('這是我的書','zhè shì wǒ de shū','This is my book'),sent('那個也是我的','nà ge yě shì wǒ de','That one is also mine'),sent('你在哪裡','nǐ zài nǎ lǐ','Where are you?')]},
      { id:'n07',icon:'🤲',title:'Have & Need',goal:'Talk about possessions',
        words:[item('有','yǒu','have'),item('沒有','méi yǒu','don\'t have'),item('要','yào','want/need'),item('想','xiǎng','would like'),item('給','gěi','give'),item('拿','ná','take'),item('用','yòng','use'),item('找','zhǎo','look for'),item('需要','xū yào','need'),item('東西','dōng xi','thing')],
        sentences:[sent('我沒有書','wǒ méi yǒu shū','I don\'t have a book'),sent('你有筆嗎','nǐ yǒu bǐ ma','Do you have a pen?'),sent('我需要這個','wǒ xū yào zhè ge','I need this one')]},
      { id:'n08',icon:'🔢',title:'Numbers 0–9',goal:'Recognize single digits',
        words:[item('零','líng','zero'),item('一','yī','one'),item('二','èr','two'),item('三','sān','three'),item('四','sì','four'),item('五','wǔ','five'),item('六','liù','six'),item('七','qī','seven'),item('八','bā','eight'),item('九','jiǔ','nine')],
        sentences:[sent('我有三本書','wǒ yǒu sān běn shū','I have three books'),sent('這是一','zhè shì yī','This is one'),sent('九不是六','jiǔ bú shì liù','Nine is not six')]},
      { id:'n09',icon:'🔟',title:'Numbers 10–99',goal:'Build larger numbers',
        words:[item('十','shí','ten'),item('十一','shí yī','eleven'),item('十二','shí èr','twelve'),item('二十','èr shí','twenty'),item('三十','sān shí','thirty'),item('四十','sì shí','forty'),item('五十','wǔ shí','fifty'),item('一百','yì bǎi','one hundred'),item('號碼','hào mǎ','number'),item('電話','diàn huà','phone')],
        sentences:[sent('我的電話號碼是多少','wǒ de diàn huà hào mǎ shì duō shǎo','What is my phone number?'),sent('這是二十','zhè shì èr shí','This is twenty'),sent('我有十一個朋友','wǒ yǒu shí yī ge péng yǒu','I have eleven friends')]},
      { id:'n10',icon:'🎂',title:'Age',goal:'Say and ask age',
        words:[item('歲','suì','years old'),item('今年','jīn nián','this year'),item('年','nián','year'),item('生日','shēng rì','birthday'),item('大','dà','big/old'),item('小','xiǎo','small/young'),item('幾歲','jǐ suì','how old'),item('年輕','nián qīng','young'),item('老','lǎo','old'),item('今天','jīn tiān','today')],
        sentences:[sent('你今年幾歲','nǐ jīn nián jǐ suì','How old are you?'),sent('我今年二十歲','wǒ jīn nián èr shí suì','I am twenty years old'),sent('今天是我的生日','jīn tiān shì wǒ de shēng rì','Today is my birthday')]},
      { id:'n11',icon:'📅',title:'Days',goal:'Talk about days of the week',
        words:[item('星期一','xīng qí yī','Monday'),item('星期二','xīng qí èr','Tuesday'),item('星期三','xīng qí sān','Wednesday'),item('星期四','xīng qí sì','Thursday'),item('星期五','xīng qí wǔ','Friday'),item('星期六','xīng qí liù','Saturday'),item('星期天','xīng qí tiān','Sunday'),item('昨天','zuó tiān','yesterday'),item('明天','míng tiān','tomorrow'),item('每天','měi tiān','every day')],
        sentences:[sent('今天是星期一','jīn tiān shì xīng qí yī','Today is Monday'),sent('明天是星期二','míng tiān shì xīng qí èr','Tomorrow is Tuesday'),sent('我每天學中文','wǒ měi tiān xué zhōng wén','I study Chinese every day')]},
      { id:'n12',icon:'⏰',title:'Time',goal:'Ask and tell the time',
        words:[item('現在','xiàn zài','now'),item('幾點','jǐ diǎn','what time'),item('點','diǎn','o\'clock'),item('分鐘','fēn zhōng','minute'),item('早上','zǎo shàng','morning'),item('中午','zhōng wǔ','noon'),item('下午','xià wǔ','afternoon'),item('晚上','wǎn shàng','evening'),item('半','bàn','half'),item('時間','shí jiān','time')],
        sentences:[sent('現在幾點','xiàn zài jǐ diǎn','What time is it?'),sent('現在三點半','xiàn zài sān diǎn bàn','It is three thirty'),sent('我晚上學中文','wǒ wǎn shàng xué zhōng wén','I study Chinese in the evening')]},
      { id:'n13',icon:'🏫',title:'Classroom',goal:'Name classroom objects',
        words:[item('書','shū','book'),item('筆','bǐ','pen'),item('紙','zhǐ','paper'),item('桌子','zhuō zi','table'),item('椅子','yǐ zi','chair'),item('教室','jiào shì','classroom'),item('學校','xué xiào','school'),item('黑板','hēi bǎn','blackboard'),item('課本','kè běn','textbook'),item('作業','zuò yè','homework')],
        sentences:[sent('書在桌子上','shū zài zhuō zi shàng','The book is on the table'),sent('我有一本課本','wǒ yǒu yì běn kè běn','I have one textbook'),sent('老師在教室','lǎo shī zài jiào shì','The teacher is in the classroom')]},
      { id:'n14',icon:'📖',title:'Study',goal:'Talk about studying',
        words:[item('學','xué','learn'),item('學習','xué xí','study'),item('中文','zhōng wén','Chinese'),item('英文','yīng wén','English'),item('說','shuō','speak'),item('聽','tīng','listen'),item('看','kàn','read/look'),item('寫','xiě','write'),item('讀','dú','read aloud'),item('練習','liàn xí','practice')],
        sentences:[sent('我學中文','wǒ xué zhōng wén','I learn Chinese'),sent('你會說英文嗎','nǐ huì shuō yīng wén ma','Can you speak English?'),sent('我每天練習','wǒ měi tiān liàn xí','I practice every day')]},
      { id:'n15',icon:'🍚',title:'Food Basics',goal:'Name common foods',
        words:[item('飯','fàn','rice/meal'),item('麵','miàn','noodles'),item('水果','shuǐ guǒ','fruit'),item('蘋果','píng guǒ','apple'),item('香蕉','xiāng jiāo','banana'),item('雞肉','jī ròu','chicken'),item('魚','yú','fish'),item('蛋','dàn','egg'),item('菜','cài','vegetable'),item('早餐','zǎo cān','breakfast')],
        sentences:[sent('我喜歡吃飯','wǒ xǐ huān chī fàn','I like eating rice'),sent('早餐有蛋','zǎo cān yǒu dàn','Breakfast has eggs'),sent('我想吃蘋果','wǒ xiǎng chī píng guǒ','I want to eat an apple')]},
    ];
  }

  /* ─── Session helpers ─── */
  const CLEAN_STARTER_WORDS = [
    item('你好','ni3 hao3','hello'), item('您好','nin2 hao3','hello (formal)'), item('早安','zao3 an1','good morning'), item('晚安','wan3 an1','good night'), item('再見','zai4 jian4','goodbye'),
    item('謝謝','xie4 xie5','thank you'), item('不客氣','bu2 ke4 qi4','you are welcome'), item('對不起','dui4 bu4 qi3','sorry'), item('沒關係','mei2 guan1 xi4','it is okay'), item('請問','qing3 wen4','excuse me'),
    item('我','wo3','I / me'), item('你','ni3','you'), item('他','ta1','he'), item('她','ta1','she'), item('是','shi4','am / is / are'),
    item('不是','bu2 shi4','is not'), item('叫','jiao4','be called'), item('名字','ming2 zi4','name'), item('學生','xue2 sheng1','student'), item('老師','lao3 shi1','teacher'),
    item('家','jia1','home / family'), item('爸爸','ba4 ba5','dad'), item('媽媽','ma1 ma5','mom'), item('朋友','peng2 you3','friend'), item('同學','tong2 xue2','classmate'),
    item('這','zhe4','this'), item('那','na4','that'), item('有','you3','have'), item('沒有','mei2 you3','do not have'), item('要','yao4','want / need'),
    item('一','yi1','one'), item('二','er4','two'), item('三','san1','three'), item('四','si4','four'), item('五','wu3','five'),
    item('六','liu4','six'), item('七','qi1','seven'), item('八','ba1','eight'), item('九','jiu3','nine'), item('十','shi2','ten'),
    item('今天','jin1 tian1','today'), item('明天','ming2 tian1','tomorrow'), item('現在','xian4 zai4','now'), item('幾點','ji3 dian3','what time'), item('早上','zao3 shang4','morning'),
    item('書','shu1','book'), item('筆','bi3','pen'), item('中文','zhong1 wen2','Chinese'), item('說','shuo1','speak'), item('聽','ting1','listen'),
    item('飯','fan4','rice / meal'), item('水','shui3','water'), item('茶','cha2','tea'), item('喜歡','xi3 huan1','like'), item('吃','chi1','eat')
  ];

  const SECTION_ICONS = ['★','拼','文','聽','說','✓'];

  async function loadCourseData(){
    if(state.course || state.loading) return;
    state.loading = true;
    state.loadError = '';
    try{
      const res = await fetch('data/learning_mode_course_structure.json', { cache:'no-store' });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const course = await res.json();
      state.vocabBySection = await loadVocabularyPayload();
      state.course = course;
      state.units = normalizeCourseUnits(course, state.vocabBySection);
      state.sessions = flattenSessions(state.units);
    }catch(err){
      console.warn('Learning Mode course structure failed to load:', err);
      state.loadError = 'Course structure failed to load. Showing fallback units.';
      state.units = buildFallbackUnits().map((unit, index) => ({
        ...unit,
        sectionNumber: 1,
        sectionLevel: 'Novice',
        unitNumber: index + 1
      }));
      state.sessions = flattenSessions(state.units);
    }finally{
      state.loading = false;
    }
  }

  async function loadVocabularyPayload(){
    try{
      const res = await fetch('data/vocabulary.json', { cache:'no-store' });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return buildVocabularySections(data);
    }catch(err){
      console.warn('Learning Mode vocabulary payload failed to load:', err);
      return null;
    }
  }

  function buildVocabularySections(data){
    const byLevel = {};
    (data.sets || []).forEach(set => {
      const level = String(set.level || 'misc').toLowerCase();
      (set.words || []).forEach(raw => {
        const word = normalizeVocabWord(raw, set);
        if(!word.zh || !word.en) return;
        if(!byLevel[level]) byLevel[level] = [];
        byLevel[level].push(word);
      });
    });
    Object.keys(byLevel).forEach(level => {
      const seen = new Set();
      byLevel[level] = byLevel[level].filter(word => {
        if(seen.has(word.zh)) return false;
        seen.add(word.zh);
        return true;
      });
    });
    const novice = byLevel.novice || [];
    const a1 = byLevel.a1 || [];
    const a2 = byLevel.a2 || [];
    const a2b1 = byLevel['a2/b1'] || [];
    const b1 = byLevel.b1 || [];
    return {
      1: novice.slice(0, 300),
      2: a1.slice(0, 300),
      3: a2.slice(0, 300),
      4: a2.slice(300, 590).concat(a2b1, b1).slice(0, 300)
    };
  }

  function normalizeVocabWord(raw, set){
    const zh = raw.word || raw.traditional || raw.hanzi || raw.zh || '';
    const py = raw.pinyin || raw.py || '';
    const en = raw.definition || raw.english || raw.en || '';
    const ex = raw.example_sentence || null;
    return item(String(zh).trim(), String(py).trim(), String(en).trim(), ex ? {
      zh: ex.sentence || ex.zh || '',
      py: ex.pinyin || ex.py || '',
      en: ex.english || ex.en || ''
    } : null, {
      source: set?.name || '',
      sourceId: set?.id || '',
      level: set?.level || ''
    });
  }

  function normalizeCourseUnits(course, vocabBySection){
    const units = [];
    (course.sections || []).forEach((section, sectionIndex) => {
      (section.units || []).forEach((unit, unitIndex) => {
        const words = seedWordsForUnit(sectionIndex, unitIndex, vocabBySection, unit);
        units.push({
          id: String(unit.unit_id || `S${sectionIndex+1}U${unitIndex+1}`),
          unit_id: String(unit.unit_id || `S${sectionIndex+1}U${unitIndex+1}`),
          sectionId: String(section.section_id || `S${sectionIndex+1}`),
          sectionNumber: sectionIndex + 1,
          sectionLevel: section.level || section.title || `Section ${sectionIndex+1}`,
          unitNumber: unitIndex + 1,
          icon: SECTION_ICONS[sectionIndex] || '★',
          title: unit.title || `Unit ${unitIndex+1}`,
          goal: unit.focus || unit.learning_goal || unit.title || 'Practice this unit.',
          words,
          sentences: seedSentencesForUnit(words)
        });
      });
    });
    return units.length ? units : buildFallbackUnits();
  }

  const TOPIC_HINTS = {
    greeting: ['greetings','hello','polite','goodbye','thank','sorry','taiwan'],
    identity: ['identity','name','profile','introducing','nationality','student','teacher'],
    family: ['family','father','mother','home','people'],
    number: ['numbers','counting','age','time','schedule'],
    food: ['food','eating','restaurant','drink','meal'],
    shopping: ['shopping','clothes','buy','money'],
    direction: ['directions','locations','where','there','here','place'],
    classroom: ['classroom','school','study','objects','help'],
    time: ['time','days','future','past','plans'],
    weather: ['weather','seasons'],
    hobby: ['hobbies','interests','like'],
    health: ['health','body','doctor'],
    sentence: ['sentences','grammar','comparisons','connecting','ideas']
  };

  function seedWordsForUnit(sectionIndex, unitIndex, vocabBySection, unit){
    const pool = vocabBySection?.[sectionIndex + 1] && vocabBySection[sectionIndex + 1].length >= 10
      ? vocabBySection[sectionIndex + 1]
      : CLEAN_STARTER_WORDS;
    const query = `${unit?.title || ''} ${unit?.focus || ''} ${unit?.theme || ''}`.toLowerCase();
    const topicTokens = topicKeywords(query);
    const scored = pool.map((word, index) => ({ word, index, score: scoreWordForUnit(word, topicTokens) }));
    const exact = scored.filter(row => row.score > 0).sort((a,b) => b.score - a.score || a.index - b.index).map(row => row.word);
    const start = (unitIndex * 10) % pool.length;
    const broad = [];
    for(let i=0; i<pool.length; i++) broad.push(pool[(start + i) % pool.length]);
    return uniqueWords(exact.slice(0, 4).concat(broad)).slice(0, 10);
  }

  function topicKeywords(text){
    const base = new Set(text.split(/[^a-z0-9]+/).filter(t => t.length > 2));
    Object.entries(TOPIC_HINTS).forEach(([key, values]) => {
      if(base.has(key) || values.some(v => text.includes(v))) values.forEach(v => base.add(v));
    });
    return [...base];
  }

  function scoreWordForUnit(word, tokens){
    const hay = `${word.en || ''} ${word.source || ''} ${word.example?.en || ''}`.toLowerCase();
    return tokens.reduce((sum, token) => sum + (hay.includes(token) ? 1 : 0), 0);
  }

  function uniqueWords(words){
    const seen = new Set();
    return words.filter(word => {
      if(!word?.zh || seen.has(word.zh)) return false;
      seen.add(word.zh);
      return true;
    });
  }

  function seedSentencesForUnit(words){
    const a = words[0] || item('你好','ni3 hao3','hello');
    const b = words[1] || item('謝謝','xie4 xie5','thank you');
    const c = words[2] || item('中文','zhong1 wen2','Chinese');
    const examples = words.map(w => w.example).filter(ex => ex?.zh && ex?.en).slice(0,3);
    if(examples.length >= 3) return examples.map(ex => sent(ex.zh, ex.py || '', ex.en));
    return [
      sent(`${a.zh}，我是學生`, `${a.py} wo3 shi4 xue2 sheng1`, `${a.en}. I am a student.`),
      sent(`這是${b.zh}`, `zhe4 shi4 ${b.py}`, `This is ${b.en}.`),
      sent(`我想練習${c.zh}`, `wo3 xiang3 lian4 xi2 ${c.py}`, `I want to practice ${c.en}.`)
    ];
  }

  function flattenSessions(units) {
    const out = [];
    units.forEach((u,ui) => { for(let s=1;s<=4;s++) out.push({id:u.id+'s'+s,unit:u,unitIndex:ui,session:s,index:out.length}); });
    return out;
  }
  const isDone    = id   => !!state.progress.done[id];
  const unlocked  = sess => true; // temporary open-map mode while the course UI is being reviewed
  const curSess   = ()   => state.sessions.find(s=>s.unit.sectionNumber===state.selectedSection&&!isDone(s.id)&&unlocked(s))||state.sessions.find(s=>s.unit.sectionNumber===state.selectedSection)||state.sessions[0];
  const unitDone  = u    => state.sessions.filter(s=>s.unit.id===u.id&&isDone(s.id)).length;

  function esc(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function shuffle(a){ return [...a].sort(()=>Math.random()-.5); }
  function choiceSet(correct,pool){ return shuffle([correct,...shuffle([...new Set(pool.filter(x=>x&&x!==correct))]).slice(0,3)]); }
  function sessLabel(n){ return ['Learn','Build','Listen','Review'][n-1]||'Practice'; }

  function zhTiles(text,words){
    const clean=text.replace(/[\s，。！？,.!?]/g,'');
    const vocab=[...new Set(words.map(w=>w.zh).filter(Boolean))].sort((a,b)=>b.length-a.length);
    const out=[];
    for(let i=0;i<clean.length;){ const hit=vocab.find(v=>clean.startsWith(v,i)); if(hit){out.push(hit);i+=hit.length;}else{out.push(clean[i]);i++;} }
    return out;
  }
  function enTiles(text){ return text.replace(/[?.!,]/g,'').split(/\s+/).filter(Boolean); }

  /* Zigzag x-positions (% from left) for sessions 1–4 per unit */
  const ZIG = [50, 70, 50, 30];

  /* ══ ENTRY ══ */
  async function render(root){
    state.root=root;
    injectStyles();
    bindRoot();
    renderLoading();
    await loadCourseData();
    renderHome();
  }

  function renderLoading(){
    state.root.innerHTML = `
<div class="el-home duo-map">
  <div class="el-loading-course">
    <div class="duo-avatar">${duoOwl('tiny')}</div>
    <strong>Loading course map</strong>
    <span>Preparing 180 structured units...</span>
  </div>
</div>`;
  }

  function bindRoot(){
    if(state.root._lmBound) return;
    state.root._lmBound=true;
    state.root.addEventListener('click',e=>{
      const el=e.target.closest('[data-act]');
      if(!el) return;
      const act=el.dataset.act;
      if(act==='open')        openSession(el.dataset.id);
      else if(act==='sectionInfo') openSectionInfo();
      else if(act==='closeInfo')   closeSectionInfo();
      else if(act==='next')   next();
      else if(act==='exit')   exitLesson();
      else if(act==='py')     togglePinyin();
      else if(act==='section') selectSection(+el.dataset.section);
      else if(act==='play')   playCurrent(el);
      else if(act==='choose') choose(+el.dataset.i);
      else if(act==='check')  checkChoice();
      else if(act==='match')  pickMatch(el.dataset.side,+el.dataset.i);
      else if(act==='tile')   addTile(+el.dataset.i);
      else if(act==='untile') removeTile(+el.dataset.i);
      else if(act==='checkTiles') checkTiles();
      else if(act==='mic')    startMic();
      else if(act==='complete') completeSession();
      else if(act==='reset')  resetAll();
    });
  }

  function renderHome(){
    const cur = curSess();
    const sectionUnits = state.units.filter(u => u.sectionNumber === cur.unit.sectionNumber);
    const sectionDone = sectionUnits.reduce((sum, unit) => sum + unitDone(unit), 0);
    const sectionTotal = Math.max(1, sectionUnits.length * 4);

    state.root.innerHTML = `
<div class="el-home duo-map">
  <header class="duo-topbar">
    <div class="duo-flag"><span class="duo-flag-cn" aria-label="Chinese course"></span></div>
    <div class="duo-score flame"><span>STREAK</span><b>${Math.max(0,state.progress.streak)}</b></div>
    <div class="duo-score gem"><span>XP</span><b>${Math.max(0,state.progress.xp)}</b></div>
    <div class="duo-avatar">${duoOwl('tiny')}</div>
  </header>

  <section class="duo-unit-banner">
    <div>
      <small>SECTION ${cur.unit.sectionNumber || 1}, UNIT ${cur.unit.unitNumber || cur.unitIndex + 1}</small>
      <h1>${esc(cur.unit.goal)}</h1>
      <span class="duo-section-progress">${sectionDone}/${sectionTotal} session checks</span>
    </div>
    <button data-act="sectionInfo" aria-label="Open section details"><span>Info</span></button>
  </section>

  ${state.infoOpen ? renderSectionInfo(cur.unit, sectionDone, sectionTotal) : ''}

  ${renderSectionTabs()}
  ${state.loadError ? `<div class="el-course-warning">${esc(state.loadError)}</div>` : ''}

  <main class="duo-path-wrap">
    ${buildPathHTML(cur)}
  </main>

  <footer class="duo-map-controls">
    <button class="${state.showPinyin?'active':''}" data-act="py"><span>Pinyin</span><b>${state.showPinyin ? 'On' : 'Off'}</b></button>
    <button data-act="reset"><span>Reset</span><b>Map</b></button>
  </footer>
</div>`;
  }

  function renderSectionInfo(unit, done, total){
    const sectionUnits = state.units.filter(u => u.sectionNumber === unit.sectionNumber);
    const first = sectionUnits[0];
    const last = sectionUnits[sectionUnits.length - 1];
    return `<section class="duo-section-card" aria-label="Section details">
      <div>
        <small>SECTION ${unit.sectionNumber}</small>
        <h2>${esc(unit.sectionLevel)}</h2>
        <p>${esc(first?.goal || unit.goal)}</p>
      </div>
      <dl>
        <div><dt>Units</dt><dd>${sectionUnits.length}</dd></div>
        <div><dt>Sessions</dt><dd>${total}</dd></div>
        <div><dt>Done</dt><dd>${done}</dd></div>
      </dl>
      <p class="duo-section-range">Starts with ${esc(first?.title || 'Unit 1')} and ends with ${esc(last?.title || 'checkpoint')}.</p>
      <button type="button" data-act="closeInfo">Close</button>
    </section>`;
  }

  function renderSectionTabs(){
    const sections = [...new Map(state.units.map(u => [u.sectionNumber, u.sectionLevel])).entries()];
    return `<nav class="duo-section-tabs" aria-label="Course sections">
      ${sections.map(([num, label]) => `<button data-act="section" data-section="${num}" class="${num===state.selectedSection?'active':''}"><b>${num}</b><span>${esc(label)}</span></button>`).join('')}
    </nav>`;
  }

  function buildPathHTML(cur){
    let html = '';
    const sessionIcons = ['1','2','3','4'];
    const visibleUnits = state.units.filter(unit => unit.sectionNumber === state.selectedSection);
    visibleUnits.forEach((u, ui) => {
      const sessions = state.sessions.filter(s=>s.unit.id===u.id);
      const count    = unitDone(u);
      const allDone  = count===4;
      const isCurUnit = sessions.some(s=>s.id===cur.id);

      if (ui > 0) {
        html += `<div class="duo-unit-divider ${isCurUnit?'active':''}"><span>UNIT ${ui+1}</span><b>${esc(u.title)}</b></div>`;
      }

      sessions.forEach((sess, si) => {
        const lock   = !unlocked(sess);
        const done_  = isDone(sess.id);
        const isCurS = sess.id===cur.id;
        const xPct   = ZIG[si] || 50;
        let nodeClass = 'el-node';
        let inner = '';
        if(done_){
          nodeClass += ' el-node-done';
          inner = `<span class="el-node-check">OK</span>`;
        } else if(isCurS){
          nodeClass += ' el-node-current';
          inner = `<span class="el-node-star">START</span>`;
        } else if(lock){
          nodeClass += ' el-node-lock';
          inner = `<span class="el-node-lock-ic">LOCK</span>`;
        } else {
          nodeClass += ' el-node-avail';
          inner = `<span class="el-node-ic">${sessionIcons[si]}</span>`;
        }
        const label = sessLabel(sess.session);
        const badge = isCurS ? `<div class="el-node-badge">START</div>` : '';
        const decor = si===0 ? `<div class="duo-path-decor owl right">${duoOwl('map')}</div><div class="duo-stars right"><span>*</span><span>*</span><span>*</span></div>` :
          si===1 ? `<div class="duo-chest ${done_?'open':'locked'}">BOX</div>` :
          si===2 ? `<div class="duo-path-decor owl left">${duoOwl('map wave')}</div><div class="duo-stars left"><span>*</span><span>*</span><span>*</span></div>` : '';
        html += `
<div class="el-node-row" style="--nx:${xPct}%">
  ${badge}
  ${decor}
  <button class="${nodeClass}" ${lock?'disabled':''} data-act="open" data-id="${esc(sess.id)}" aria-label="${esc(label)}">
    ${inner}
  </button>
  <div class="el-node-label">${esc(label)}</div>
</div>`;
      });

      if(ui < visibleUnits.length-1){
        html += `
<div class="el-node-row" style="--nx:50%">
  <div class="el-chest ${allDone?'open':'locked'}">${allDone?'DONE':'LOCK'}</div>
</div>`;
      }
    });
    return html;
  }

  function unitCard(u,idx){
    const sessions = state.sessions.filter(s=>s.unit.id===u.id);
    const count    = unitDone(u);
    const isCur    = sessions.some(s=>curSess().id===s.id);
    const allDone  = count===4;
    return `
<div class="el-unit ${isCur?'current':''} ${allDone?'all-done':''}">
  <div class="el-unit-head">
    <div class="el-unit-icon">${u.icon}</div>
    <div class="el-unit-info">
      <div class="el-unit-tag">${isCur?'▶ NOW':'UNIT'} ${idx+1}</div>
      <div class="el-unit-name">${esc(u.title)}</div>
      <div class="el-unit-goal">${esc(u.goal)}</div>
    </div>
    <div class="el-unit-count ${allDone?'done':''}">${count}/4</div>
  </div>
  <div class="el-unit-bar"><div style="width:${count*25}%"></div></div>
  <div class="el-sess-grid">
    ${sessions.map(s=>sessBtn(s)).join('')}
  </div>
  <div class="el-word-row">
    ${u.words.slice(0,8).map(w=>`<button class="el-word-chip" data-act="play" data-zh="${esc(w.zh)}">${esc(w.zh)}</button>`).join('')}
  </div>
</div>`;
  }

  function sessBtn(sess){
    const lock  = !unlocked(sess);
    const done_ = isDone(sess.id);
    const isCur = curSess().id===sess.id;
    const icons = ['★','▣','🔊','✦'];
    return `
<button class="el-sess ${isCur?'cur':''} ${done_?'done':''} ${lock?'locked':''} s${sess.session}"
  ${lock?'disabled':''} data-act="open" data-id="${esc(sess.id)}">
  <span class="el-sess-ic">${lock?'🔒':done_?'✓':icons[sess.session-1]}</span>
  <span class="el-sess-name">${sessLabel(sess.session)}</span>
</button>`;
  }

  /* ══════════════════════════
     SESSION BUILDER
  ══════════════════════════ */
  function openSession(id){
    const sess=state.sessions.find(s=>s.id===id);
    if(!sess||!unlocked(sess)) return;
    state.active=buildSteps(sess);
    state.stepIndex=0;
    resetStep();
    renderStep();
  }

  function buildSteps(sess){
    const words=sess.unit.words;
    const sentences=sess.unit.sentences.map(s=>({...s,zhTiles:zhTiles(s.zh,words),enTiles:enTiles(s.en)}));
    const all=[{type:'intro',sess}];
    const addSentenceSet=s=>all.push(
      {type:'sentEn',item:s,choices:choiceSet(s.en,sentences.map(x=>x.en).concat(words.map(x=>x.en)))},
      {type:'tilesZh',item:s,tiles:shuffle(s.zhTiles)},
      {type:'tilesEn',item:s,tiles:shuffle(s.enTiles)},
      {type:'speak',item:s}
    );
    if(sess.session===1){
      words.slice(0,5).forEach(w=>all.push({type:'card',item:w}));
      words.slice(0,2).forEach(w=>all.push({type:'hanzi',item:w}));
      words.slice(0,4).forEach(w=>all.push({type:'pinyin',item:w,choices:choiceSet(w.py,words.map(x=>x.py))}));
      words.slice(0,3).forEach(w=>all.push({type:'listen',item:w,choices:choiceSet(w.en,words.map(x=>x.en))}));
      all.push({type:'match',pairs:words.slice(0,5)});
      addSentenceSet(sentences[0]);
    } else if(sess.session===2){
      words.slice(5,10).forEach(w=>all.push({type:'card',item:w}));
      words.slice(5,7).forEach(w=>all.push({type:'hanzi',item:w}));
      words.slice(0,5).forEach(w=>all.push({type:'enZh',item:w,choices:choiceSet(w.zh,words.map(x=>x.zh))}));
      all.push({type:'match',pairs:words.slice(5,10)});
      words.slice(5,8).forEach(w=>all.push({type:'zhEn',item:w,choices:choiceSet(w.en,words.map(x=>x.en))}));
      addSentenceSet(sentences[1] || sentences[0]);
    } else if(sess.session===3){
      words.slice(0,10).forEach((w,i)=>{
        all.push(i%2===0
          ? {type:'zhEn',item:w,choices:choiceSet(w.en,words.map(x=>x.en))}
          : {type:'pinyin',item:w,choices:choiceSet(w.py,words.map(x=>x.py))});
      });
      all.push({type:'match',pairs:words.slice(2,7)});
      addSentenceSet(sentences[2] || sentences[0]);
    } else {
      words.slice(0,5).forEach(w=>all.push({type:'listen',item:w,choices:choiceSet(w.en,words.map(x=>x.en))}));
      words.slice(5,10).forEach(w=>all.push({type:'flash',item:w,choices:choiceSet(w.zh,words.map(x=>x.zh))}));
      words.slice(0,2).forEach(w=>all.push({type:'hanzi',item:w}));
      all.push({type:'match',pairs:words.slice(0,5)},{type:'match',pairs:words.slice(5,10)});
      sentences.forEach(addSentenceSet);
    }
    all.push({type:'done',sess});
    return {sess,steps:all,correct:0,wrong:0,start:Date.now()};
  }

  /* ══════════════════════════
     STEP RENDER
  ══════════════════════════ */
  function step(){ return state.active?.steps[state.stepIndex]; }
  function resetStep(){ state.selected=null; state.selectedMatch=null; state.matched=new Set(); state.answerTiles=[]; state.answerTileIds=[]; state.transcript=''; state.micState='idle'; }

  function renderStep(){
    const st=step();
    if(!st){ renderHome(); return; }
    const total=state.active.steps.length-1;
    const pct=Math.round(state.stepIndex/Math.max(1,total)*100);
    state.root.innerHTML=`
<div class="el-lesson">
  <header class="el-lesson-top">
    <button class="el-close-btn" data-act="exit" aria-label="Exit">✕</button>
    <div class="el-prog-track"><div class="el-prog-fill" style="width:${pct}%"></div></div>
    <div class="el-hearts-disp">
      ${[...Array(MAX_HEARTS)].map((_,i)=>`<span class="${i<state.progress.hearts?'heart-on':'heart-off'}">♥</span>`).join('')}
    </div>
  </header>
  <div class="el-ex-body">
    ${buildEx(st)}
  </div>
</div>`;
    if(st.type==='listen') setTimeout(()=>speak(st.item),280);
    if(st.type==='hanzi') setTimeout(()=>initHanziPractice(st),80);
  }

  function buildEx(st){
    if(st.type==='intro')  return introEx(st);
    if(st.type==='card')   return cardEx(st);
    if(st.type==='pinyin') return choiceEx('What sound does this make?',soundBtn(st.item),st.choices,st.item.py,'Listen then pick the pinyin.');
    if(st.type==='zhEn')   return choiceEx('What does this mean?',zhBig(st.item),st.choices,st.item.en,'Choose the English meaning.');
    if(st.type==='enZh'||st.type==='flash') return choiceEx(st.type==='flash'?'Pick the matching character':'Find the Chinese word',enPrompt(st.item.en),st.choices,st.item.zh,'chars','Match the Traditional Chinese.');
    if(st.type==='listen') return choiceEx('What does the audio say?',audioBtn(),st.choices,st.item.en,'','Tap the speaker then answer.');
    if(st.type==='sentEn') return choiceEx('What does this sentence mean?',zhSentence(st.item),st.choices,st.item.en,'Read then choose the meaning.');
    if(st.type==='hanzi')  return hanziEx(st);
    if(st.type==='match')  return matchEx(st);
    if(st.type==='tilesZh') return tilesEx(st,'zh');
    if(st.type==='tilesEn') return tilesEx(st,'en');
    if(st.type==='speak')  return speakEx(st);
    if(st.type==='done')   return doneEx(st);
    return '';
  }

  /* ── Intro ── */
  function introEx(st){
    return `
<div class="el-screen center">
  <div class="el-mascot-lg">${mascot('wave')}</div>
  <div class="el-kicker">SESSION ${st.sess.session} OF 4</div>
  <h2 class="el-title">${esc(st.sess.unit.title)}</h2>
  <p class="el-sub">${esc(st.sess.unit.goal)}</p>
  <div class="el-chip-grid">
    ${st.sess.unit.words.map(w=>`<button class="el-chip" data-act="play" data-zh="${esc(w.zh)}">${esc(w.zh)}</button>`).join('')}
  </div>
</div>
${foot('START','next')}`;
  }

  /* ── Card ── */
  function cardEx(st){
    return `
<div class="el-screen center">
  <div class="el-mascot-sm">${mascot('teach')}</div>
  <div class="el-kicker">NEW WORD</div>
  <div class="el-card-face">
    <button class="el-zh-big" data-act="play">${esc(st.item.zh)}</button>
    ${pyLine(st.item)}
    <div class="el-card-en">${esc(st.item.en)}</div>
    <div class="el-card-hint">Tap the character to hear it 🔊</div>
  </div>
</div>
${foot('GOT IT ✓','next')}`;
  }

  /* ── Choice ── */
  function hanziEx(st){
    const char = firstHanzi(st.item.zh);
    const id = `lm-hanzi-${state.stepIndex}`;
    return `
<div class="el-screen center">
  <div class="el-kicker">HANZI PRACTICE</div>
  <h2 class="el-title">Write ${esc(char)}</h2>
  <p class="el-sub">${esc(st.item.zh)} / ${state.showPinyin ? esc(st.item.py) + ' / ' : ''}${esc(st.item.en)}</p>
  <div class="el-hanzi-practice">
    <div id="${id}-writer" class="el-hanzi-writer"></div>
    <canvas id="${id}-canvas" class="el-hanzi-canvas"></canvas>
  </div>
  <div class="el-hanzi-actions">
    <button type="button" onclick="window.DrawingBoard?.animate?.()">Show Strokes</button>
    <button type="button" onclick="window.DrawingBoard?.reset?.()">Clear</button>
    <button type="button" data-act="play">Hear</button>
  </div>
</div>
${foot('I WROTE IT','next')}`;
  }

  function firstHanzi(text){
    return Array.from(String(text || '')).find(ch => /[\u3400-\u9fff]/.test(ch)) || String(text || '').charAt(0) || '字';
  }

  function initHanziPractice(st){
    const char = firstHanzi(st.item.zh);
    const id = `lm-hanzi-${state.stepIndex}`;
    try { window.DrawingBoard?.init?.(`${id}-writer`, `${id}-canvas`, char); } catch(err) { console.warn('Hanzi practice init failed:', err); }
  }

  function choiceEx(title,stimulus,opts,correct,mode,helper){
    if(typeof mode==='string'&&(mode===''||mode==='chars')){
      // mode is actually helper if passed as 3rd string arg
      if(arguments.length===5){ helper=mode; mode=''; }
    }
    const isChars=mode==='chars';
    return `
<div class="el-screen">
  <div class="el-kicker">${esc(helper||'Choose one answer')}</div>
  <h2 class="el-title">${esc(title)}</h2>
  <div class="el-stimulus">${stimulus}</div>
  <div class="el-opts ${isChars?'chars':''}">
    ${opts.map((o,i)=>`<button class="el-opt ${state.selected===i?'sel':''}" data-act="choose" data-i="${i}">${esc(o)}</button>`).join('')}
  </div>
</div>
${foot('CHECK','check',state.selected===null)}`;
  }

  /* ── Match ── */
  function matchEx(st){
    if(!st._right) st._right=shuffle(st.pairs);
    const allDone=state.matched.size>=st.pairs.length;
    return `
<div class="el-screen">
  <div class="el-kicker">TAP THE MATCHING WORD PAIR</div>
  <h2 class="el-title">Tap to match</h2>
  <div class="el-match">
    <div class="el-match-col">
      ${st.pairs.map((p,i)=>mBtn('zh',p,i)).join('')}
    </div>
    <div class="el-match-col">
      ${st._right.map((p,i)=>mBtn('en',p,i)).join('')}
    </div>
  </div>
</div>
${foot('CONTINUE','next',!allDone)}`;
  }

  function mBtn(side,p,i){
    const id=p.zh+'|'+p.en;
    const done_=state.matched.has(id);
    const sel=state.selectedMatch?.side===side&&state.selectedMatch?.id===id;
    return `<button class="el-mbtn ${sel?'sel':''} ${done_?'done':''}" data-act="match" data-side="${side}" data-i="${i}">
      ${side==='zh'?esc(p.zh)+(state.showPinyin?`<small>${esc(p.py)}</small>`:''):esc(p.en)}
    </button>`;
  }

  /* ── Tiles ── */
  function tilesEx(st,lang){
    const isZh=lang==='zh';
    const hint=isZh?'TRANSLATE THIS SENTENCE':'BUILD THE ENGLISH SENTENCE';
    const title=isZh?'Translate this sentence':'Build the English sentence';
    const prompt=isZh
      ? `<div class="el-tile-prompt-en">${esc(st.item.en)}</div>`
      : `<div class="el-tile-prompt-zh">${esc(st.item.zh)}${pyLine(st.item)}</div>`;
    return `
<div class="el-screen">
  <div class="el-kicker">${hint}</div>
  <h2 class="el-title">${title}</h2>
  <div class="el-tile-source">${prompt}</div>
  <div class="el-answer ${state.answerTiles.length?'has-tiles':''}">
    ${state.answerTiles.length
      ? state.answerTiles.map((t,i)=>`<button class="el-ans-tile" data-act="untile" data-i="${i}">${esc(t)}</button>`).join('')
      : '<span class="el-ans-ph">Tap tiles below</span>'}
  </div>
  <div class="el-tile-bank">
    ${st.tiles.map((t,i)=>`<button class="el-tile ${state.answerTileIds.includes(i)?'used':''}" ${state.answerTileIds.includes(i)?'disabled':''} data-act="tile" data-i="${i}">${esc(t)}</button>`).join('')}
  </div>
</div>
${foot('CHECK','checkTiles',!state.answerTiles.length)}`;
  }

  /* ── Speak ── */
  function speakEx(st){
    const listening=state.micState==='listening';
    return `
<div class="el-screen center">
  <div class="el-mascot-lg">${mascot(listening?'listen':'speak')}</div>
  <div class="el-kicker">SPEAK THIS SENTENCE</div>
  <h2 class="el-title">Say it aloud</h2>
  <div class="el-speak-card">
    <div class="el-zh-mid">${esc(st.item.zh)}</div>
    ${pyLine(st.item)}
    <div class="el-speak-en">${esc(st.item.en)}</div>
  </div>
  <button class="el-replay-btn" data-act="play">🔊 Replay Audio</button>
  <button class="el-mic-btn ${state.micState}" data-act="mic">
    ${listening?'🎙 Listening...':'🎤 Tap to Speak'}
  </button>
  ${state.transcript?`<div class="el-transcript">${esc(state.transcript)}</div>`:''}
</div>
<footer class="el-foot two">
  <button class="el-btn-secondary" data-act="next">SKIP</button>
  <button class="el-btn-primary" data-act="next">CONTINUE</button>
</footer>`;
  }

  /* ── Done ── */
  function doneEx(st){
    const perfect=!state.active.wrong;
    const acc=Math.round(state.active.correct/Math.max(1,state.active.correct+state.active.wrong)*100);
    const secs=Math.ceil((Date.now()-state.active.start)/1000);
    const xp=Math.max(XP_PER,state.active.correct);
    return `
<div class="el-screen center el-done-screen">
  <div class="el-mascot-xl">${mascot(perfect?'celebrate':'happy')}</div>
  <h1 class="el-done-title">${perfect?'Perfect! 🎉':'Lesson complete!'}</h1>
  <p class="el-sub">${perfect?'No mistakes — you\'re amazing!':'Keep practicing to improve.'}</p>
  <div class="el-results">
    <div class="el-res-card gold">
      <div class="el-res-val">+${xp}</div>
      <div class="el-res-lbl">XP</div>
    </div>
    <div class="el-res-card blue">
      <div class="el-res-val">${acc}%</div>
      <div class="el-res-lbl">Accuracy</div>
    </div>
    <div class="el-res-card purple">
      <div class="el-res-val">${secs}s</div>
      <div class="el-res-lbl">Time</div>
    </div>
  </div>
</div>
${foot('CLAIM XP 💎','complete')}`;
  }

  /* ── Shared UI atoms ── */
  function zhBig(item){ return `<button class="el-zh-big" data-act="play">${esc(item.zh)}</button>${pyLine(item)}`; }
  function soundBtn(item){ return `<button class="el-sound-btn" data-act="play">${esc(item.zh)}<small>${state.showPinyin?esc(item.py):''}</small></button>`; }
  function enPrompt(en){ return `<div class="el-en-prompt">${esc(en)}</div>`; }
  function zhSentence(item){ return `<div class="el-zh-sent">${esc(item.zh)}${state.showPinyin&&item.py?`<small class="el-py-sm">${esc(item.py)}</small>`:''}</div>`; }
  function audioBtn(){ return `<button class="el-audio-btn" data-act="play">🔊<span>TAP TO LISTEN</span></button>`; }
  function pyLine(item){ return state.showPinyin&&item.py?`<div class="el-py">${esc(item.py)}</div>`:''; }
  function foot(label,act,disabled=false){
    return `<footer class="el-foot"><button class="el-btn-primary" data-act="${act}" ${disabled?'disabled':''}>${label}</button></footer>`;
  }

  /* ══════════════════════════
     MASCOT — Purple teardrop
  ══════════════════════════ */
  function mascot(mood='idle'){
    const body={
      idle:'#7c3aed', happy:'#7c3aed', wave:'#7c3aed',
      teach:'#7c3aed', speak:'#7c3aed', listen:'#5b21b6',
      celebrate:'#7c3aed', review:'#9d5cf5',
    }[mood]||'#7c3aed';

    /* eye expressions */
    const eyeL={
      idle:'M22,30 a5,5 0 1,1 0,-.1',
      happy:'M19,32 Q22,26 25,32',
      wave:'M22,30 a5,5 0 1,1 0,-.1',
      celebrate:'M19,31 Q22,25 25,31',
      teach:'M22,30 a5,5 0 1,1 0,-.1',
      speak:'M22,30 a5,5 0 1,1 0,-.1',
      listen:'M19,31 Q22,27 25,31',
      review:'M19,32 Q22,28 25,32',
    }[mood]||'M22,30 a5,5 0 1,1 0,-.1';
    const eyeR={
      idle:'M46,30 a5,5 0 1,1 0,-.1',
      happy:'M43,32 Q46,26 49,32',
      wave:'M46,30 a5,5 0 1,1 0,-.1',
      celebrate:'M43,31 Q46,25 49,31',
      teach:'M46,30 a5,5 0 1,1 0,-.1',
      speak:'M46,30 a5,5 0 1,1 0,-.1',
      listen:'M43,31 Q46,27 49,31',
      review:'M43,32 Q46,28 49,32',
    }[mood]||'M46,30 a5,5 0 1,1 0,-.1';

    const blush=(mood==='celebrate'||mood==='happy')?'<ellipse cx="18" cy="42" rx="6" ry="4" fill="#ff80ab" opacity=".35"/><ellipse cx="50" cy="42" rx="6" ry="4" fill="#ff80ab" opacity=".35"/>':'';
    const mouth={
      idle:'M25,50 Q34,56 43,50',
      happy:'M23,50 Q34,60 45,50',
      wave:'M25,50 Q34,57 43,50',
      celebrate:'M22,50 Q34,62 46,50',
      teach:'M26,50 Q34,55 42,50',
      speak:'M27,52 Q34,46 41,52',
      listen:'M26,50 Q34,54 42,50',
      review:'M26,52 Q34,48 42,52',
    }[mood]||'M25,50 Q34,56 43,50';

    /* wave arm */
    const armR=mood==='wave'||mood==='celebrate'
      ? '<path d="M58,35 Q70,22 65,12" stroke="#9d5cf5" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="65" cy="10" r="4" fill="#c4b5fd"/>'
      : '';
    /* sparkles for celebrate */
    const sparkles=mood==='celebrate'
      ? '<text x="66" y="20" font-size="10">✦</text><text x="4" y="20" font-size="8">✦</text><text x="60" y="60" font-size="7">✦</text>'
      : '';

    const bounce=mood==='celebrate'||mood==='happy'||mood==='wave'?'style="animation:el-bounce 1.1s ease-in-out infinite"':'';

    return `<svg class="el-mascot-svg" ${bounce} viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <!-- Shadow -->
  <ellipse cx="40" cy="96" rx="18" ry="4" fill="rgba(0,0,0,.25)"/>
  <!-- Body: teardrop -->
  <path d="M40,8 C40,8 68,38 68,60 a28,28 0 1,1 -56,0 C12,38 40,8 40,8 Z" fill="${body}"/>
  <!-- Shine -->
  <ellipse cx="28" cy="30" rx="7" ry="10" fill="rgba(255,255,255,.18)" transform="rotate(-20,28,30)"/>
  <!-- Eye whites -->
  <circle cx="28" cy="44" r="10" fill="white"/>
  <circle cx="52" cy="44" r="10" fill="white"/>
  <!-- Pupils / expression -->
  <path d="${eyeL}" stroke="#1e1b4b" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <path d="${eyeR}" stroke="#1e1b4b" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <!-- Pupils dots (idle/normal) -->
  ${(mood==='idle'||mood==='teach'||mood==='speak'||mood==='wave')?'<circle cx="28" cy="44" r="4" fill="#1e1b4b"/><circle cx="52" cy="44" r="4" fill="#1e1b4b"/><circle cx="30" cy="42" r="1.5" fill="white"/><circle cx="54" cy="42" r="1.5" fill="white"/>':''}
  ${blush}
  <!-- Mouth -->
  <path d="${mouth}" stroke="#1e1b4b" stroke-width="3" stroke-linecap="round" fill="none"/>
  <!-- Arms -->
  <path d="M14,58 Q6,52 10,44" stroke="${body}" stroke-width="8" stroke-linecap="round" fill="none"/>
  ${armR||`<path d="M66,58 Q74,52 70,44" stroke="${body}" stroke-width="8" stroke-linecap="round" fill="none"/>`}
  <!-- Feet -->
  <ellipse cx="30" cy="92" rx="9" ry="5" fill="#5b21b6"/>
  <ellipse cx="50" cy="92" rx="9" ry="5" fill="#5b21b6"/>
  ${sparkles}
</svg>`;
  }

  /* ══════════════════════════
     HANDLERS
  ══════════════════════════ */
  function choose(i){ state.selected=i; renderStep(); }

  function checkChoice(){
    const st=step();
    const choice=st.choices[state.selected];
    let correct=st.item.en;
    if(st.type==='pinyin') correct=st.item.py;
    if(st.type==='enZh'||st.type==='flash') correct=st.item.zh;
    choice===correct ? good('Correct! 🎯',`${st.item.zh} = ${st.item.en}`) : bad('Incorrect 😅','Correct: '+correct,st.item);
  }

  function pickMatch(side,i){
    const st=step();
    const lst=side==='zh'?st.pairs:st._right;
    const itm=lst[i]; const id=itm.zh+'|'+itm.en;
    if(state.matched.has(id)) return;
    if(!state.selectedMatch||state.selectedMatch.side===side){
      state.selectedMatch={side,id};
      if(side==='zh') speak(itm);
      renderStep(); return;
    }
    if(state.selectedMatch.id===id){ state.matched.add(id); state.active.correct++; tone(true); }
    else { state.active.wrong++; lose(itm); tone(false); }
    state.selectedMatch=null; renderStep();
  }

  function addTile(i){ if(state.answerTileIds.includes(i)) return; state.answerTileIds.push(i); state.answerTiles.push(step().tiles[i]); renderStep(); }
  function removeTile(i){ state.answerTileIds.splice(i,1); state.answerTiles.splice(i,1); renderStep(); }

  function checkTiles(){
    const st=step();
    const answer=state.answerTiles.join(st.type==='tilesEn'?' ':'');
    const target=st.type==='tilesEn'?st.item.en.replace(/[?.!,]/g,''):st.item.zh.replace(/[\s，。！？,.!?]/g,'');
    answer===target ? good('Correct! 🎯',st.type==='tilesEn'?st.item.en:st.item.zh) : bad('Not quite 😅','Correct: '+target,st.item);
  }

  function good(t,b){ state.active.correct++; feedback(true,t,b); }
  function bad(t,b,item){ state.active.wrong++; lose(item); feedback(false,t,b); }
  function lose(item){ state.progress.hearts=Math.max(0,state.progress.hearts-1); state.progress.mistakes.unshift({...item,at:Date.now()}); state.progress.mistakes=state.progress.mistakes.slice(0,100); saveProgress(); }

  function feedback(ok,title,body_){
    closeFeedback(); tone(ok);
    const el=document.createElement('div');
    el.className='el-feedback '+(ok?'ok':'bad');
    el.innerHTML=`
<div class="el-fb-row">
  <div class="el-fb-mascot">${mascot(ok?'happy':'review')}</div>
  <div class="el-fb-text">
    <strong>${esc(title)}</strong>
    <span>${esc(body_)}</span>
  </div>
  <div class="el-fb-icon">${ok?'✓':'✕'}</div>
</div>
<button class="el-fb-btn">${ok?'CONTINUE':'GOT IT'}</button>`;
    el.addEventListener('click',e=>{ if(e.target.tagName==='BUTTON') next(); });
    document.body.appendChild(el);
  }

  function closeFeedback(){ document.querySelectorAll('.el-feedback').forEach(x=>x.remove()); }
  function next(){ closeFeedback(); state.stepIndex++; resetStep(); renderStep(); }

  function completeSession(){
    const s=state.active.sess;
    state.progress.done[s.id]={at:new Date().toISOString(),correct:state.active.correct,wrong:state.active.wrong};
    state.progress.xp+=Math.max(XP_PER,state.active.correct);
    const today=new Date().toISOString().slice(0,10);
    if(state.progress.last!==today){ state.progress.streak++; state.progress.last=today; }
    state.progress.hearts=Math.min(MAX_HEARTS,state.progress.hearts+1);
    saveProgress();
    state.active=null;
    renderHome();
  }

  function exitLesson(){ closeFeedback(); state.active=null; renderHome(); }
  function togglePinyin(){ state.showPinyin=!state.showPinyin; localStorage.setItem(PINKEY,state.showPinyin?'1':'0'); state.active?renderStep():renderHome(); }
  function openSectionInfo(){ state.infoOpen = true; renderHome(); }
  function closeSectionInfo(){ state.infoOpen = false; renderHome(); }
  function selectSection(n){ if(!Number.isFinite(n)) return; state.selectedSection=n; state.infoOpen=false; renderHome(); }
  function resetAll(){ if(!confirm('Reset all progress?')) return; localStorage.removeItem(STORE); state.progress=loadProgress(); renderHome(); }

  function playCurrent(el){
    if(el?.dataset?.zh){ speak({zh:el.dataset.zh}); return; }
    const st=step(); if(st?.item) speak(st.item);
  }
  function speak(item){
    try{
      if(window.TTS?.speak){ window.TTS.speak(item.zh,'zh-TW',0.75); return; }
      if(window.speechSynthesis&&window.SpeechSynthesisUtterance){
        speechSynthesis.cancel();
        const u=new SpeechSynthesisUtterance(item.zh); u.lang='zh-TW'; u.rate=0.78;
        speechSynthesis.speak(u);
      }
    }catch{}
  }
  function startMic(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ state.transcript='Speech recognition not available. Say it aloud then continue.'; state.micState='idle'; renderStep(); return; }
    const rec=new SR(); rec.lang='zh-TW'; rec.interimResults=false; rec.maxAlternatives=1;
    state.micState='listening'; state.transcript=''; renderStep();
    const t=setTimeout(()=>{try{rec.stop();}catch{}},8000);
    rec.onresult=e=>{clearTimeout(t);state.transcript=e.results?.[0]?.[0]?.transcript||'';state.micState='done';renderStep();};
    rec.onerror=()=>{clearTimeout(t);state.transcript='Could not hear. Try again or skip.';state.micState='idle';renderStep();};
    rec.onend=()=>{clearTimeout(t);if(state.micState==='listening'){state.micState='idle';state.transcript='No speech detected.';renderStep();}};
    try{rec.start();}catch{state.micState='idle';state.transcript='Mic could not start.';renderStep();}
  }
  function tone(ok){
    try{
      const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
      const c=new AC(),t=c.currentTime;
      (ok?[660,880]:[220,160]).forEach((f,i)=>{
        const o=c.createOscillator(),g=c.createGain();
        o.type=ok?'sine':'sawtooth'; o.frequency.value=f;
        g.gain.setValueAtTime(.001,t+i*.08);
        g.gain.exponentialRampToValueAtTime(.12,t+i*.08+.025);
        g.gain.exponentialRampToValueAtTime(.001,t+i*.08+.22);
        o.connect(g);g.connect(c.destination);
        o.start(t+i*.08);o.stop(t+i*.08+.28);
      });
      setTimeout(()=>c.close(),700);
    }catch{}
  }

  /* ══════════════════════════
     STYLES (dark purple theme)
  ══════════════════════════ */
  function duoOwl(extra=''){
    return `<span class="duo-owl ${esc(extra)}" aria-hidden="true">
      <i class="eye l"></i><i class="eye r"></i><b></b><em class="wing l"></em><em class="wing r"></em><strong></strong>
    </span>`;
  }

  function injectStyles(){
    if(document.getElementById('el-styles-v235')) return;
    const s=document.createElement('style');
    s.id='el-styles-v235';
    s.textContent=`
/* ── NAV CLEARANCE ── */
:root{
  --el-nav: calc(92px + env(safe-area-inset-bottom,0px));
  --el-font: 'Outfit','Inter',system-ui,sans-serif;
  --el-zh: var(--font-zh,'Noto Sans TC','PingFang TC',sans-serif);
}

/* ── PAGE OVERRIDE ── */
#page-content:has(.el-home),
#page-content:has(.el-lesson){
  padding:0!important;
  max-width:100%!important;
  background:#0d0d1a!important;
  color:#f0eeff!important;
}

/* ── HOME ── */
.el-home{
  font-family:var(--el-font);
  color:#f0eeff;
  background:#0d0d1a;
  min-height:100vh;
  max-width:430px;
  margin:0 auto;
  padding:0 0 calc(var(--el-nav) + 20px);
  box-sizing:border-box;
}

/* TOP BAR */
.el-top{
  display:grid;grid-template-columns:1fr auto 1fr;
  align-items:center;
  padding:14px 18px 10px;
  background:#0d0d1a;
  position:sticky;top:0;z-index:20;
  border-bottom:1px solid #1e1e40;
}
.el-stat{display:flex;align-items:center;gap:5px;font-size:.82rem;font-weight:800}
.el-stat:last-child{justify-content:flex-end}
.el-stat-num{color:#f0eeff;font-weight:900}
.el-flame{font-size:1.1rem}
.el-gem{font-size:1.1rem}
.el-logo{font-size:.9rem;font-weight:950;color:#c4b5fd;letter-spacing:-.01em;text-align:center}

/* HERO */
.el-hero{
  margin:14px 14px 10px;
  background:linear-gradient(135deg,#4c1d95 0%,#7c3aed 60%,#9d5cf5 100%);
  border-radius:24px;
  padding:18px 16px 16px;
  display:grid;grid-template-columns:90px 1fr;
  gap:12px;
  position:relative;overflow:hidden;
  box-shadow:0 8px 32px rgba(124,58,237,.4);
}
.el-hero::after{
  content:'中';
  position:absolute;right:-14px;top:-10px;
  font-family:var(--el-zh);
  font-size:7rem;font-weight:900;
  color:rgba(255,255,255,.06);
  line-height:1;pointer-events:none;
}
.el-hero-mascot{width:90px;height:90px;display:flex;align-items:flex-end;justify-content:center}
.el-mascot-svg{width:80px;height:auto}
.el-hero-text{display:flex;flex-direction:column;gap:4px;justify-content:center}
.el-hero-pill{
  background:rgba(255,255,255,.18);backdrop-filter:blur(4px);
  border-radius:99px;padding:3px 10px;font-size:.6rem;
  font-weight:950;letter-spacing:.1em;color:#e9d5ff;
  width:fit-content;
}
.el-hero h1{font-size:1.38rem;font-weight:950;color:#fff;margin:0;line-height:1.1}
.el-hero p{font-size:.76rem;font-weight:800;color:rgba(255,255,255,.8);margin:0;line-height:1.2}
.el-hero-btn{
  grid-column:1/-1;width:100%;
  border:0;border-radius:16px;
  background:#fff;color:#7c3aed;
  font-weight:950;font-size:.94rem;
  min-height:50px;cursor:pointer;
  font-family:var(--el-font);
  box-shadow:0 4px 0 rgba(0,0,0,.2);
  transition:transform .1s,box-shadow .1s;
}
.el-hero-btn:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.2)}

/* STATS ROW */
.el-stats-row{
  display:grid;grid-template-columns:1fr 1fr 1fr;
  gap:8px;margin:0 14px 10px;
}
.el-stat-box{
  background:#1a1a35;border:1px solid #2a2a55;border-radius:16px;
  padding:10px 8px;text-align:center;
}
.el-stat-box span{display:block;font-size:1.1rem;font-weight:950;color:#c4b5fd}
.el-stat-box small{display:block;font-size:.64rem;color:#5a5680;font-weight:800;margin-top:2px;text-transform:uppercase;letter-spacing:.06em}

/* OVERALL BAR */
.el-overall-bar{
  height:6px;border-radius:99px;
  background:#1a1a35;margin:0 14px 14px;overflow:hidden;
}
.el-overall-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#7c3aed,#c084fc);transition:width .7s}

/* SECTION LABEL */
.el-section-label{
  font-size:.64rem;font-weight:950;letter-spacing:.14em;
  color:#5a5680;padding:0 14px 8px;text-transform:uppercase;
}

/* PATH */
.el-path{padding:0 14px;display:grid;gap:12px}

/* UNIT CARD */
.el-unit{
  background:#13132a;border:1px solid #1e1e40;
  border-radius:22px;overflow:hidden;
}
.el-unit.current{border-color:#7c3aed;box-shadow:0 0 0 1px #7c3aed40}
.el-unit.all-done{border-color:#22c55e30;background:#0f1f17}
.el-unit-head{display:grid;grid-template-columns:46px 1fr 36px;gap:10px;align-items:center;padding:14px 14px 10px}
.el-unit-icon{width:44px;height:44px;background:#1e1e40;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem}
.el-unit-tag{font-size:.6rem;font-weight:950;letter-spacing:.1em;color:#7c3aed;margin-bottom:3px}
.el-unit.current .el-unit-tag{color:#c084fc}
.el-unit-name{font-size:1rem;font-weight:950;color:#f0eeff;line-height:1}
.el-unit-goal{font-size:.72rem;color:#5a5680;font-weight:800;margin-top:3px;line-height:1.2}
.el-unit-count{background:#1e1e40;color:#7c3aed;border-radius:99px;padding:5px 8px;font-size:.72rem;font-weight:950;text-align:center;white-space:nowrap}
.el-unit-count.done{background:#14532d;color:#22c55e}
.el-unit-bar{height:4px;background:#1e1e40;margin:0 14px 12px}
.el-unit-bar div{height:100%;border-radius:99px;background:linear-gradient(90deg,#7c3aed,#c084fc);transition:width .5s}
.el-unit.all-done .el-unit-bar div{background:linear-gradient(90deg,#16a34a,#22c55e)}

/* SESSION BUTTONS */
.el-sess-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:0 14px 12px}
.el-sess{
  background:#1a1a35;border:1.5px solid #2a2a55;
  border-radius:16px;padding:10px 10px 10px;
  display:flex;align-items:center;gap:8px;
  cursor:pointer;font-family:var(--el-font);color:#f0eeff;
  min-height:56px;transition:border-color .15s,background .15s;
  text-align:left;
}
.el-sess:active{background:#21214a}
.el-sess.cur{border-color:#7c3aed;background:#1e1045}
.el-sess.done .el-sess-ic{background:#22c55e;box-shadow:0 2px 0 #16a34a;color:#fff}
.el-sess:disabled,.el-sess.locked{opacity:.45;cursor:not-allowed}
.el-sess-ic{
  width:30px;height:30px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  font-size:.78rem;font-weight:950;color:#fff;
}
.el-sess.s1 .el-sess-ic{background:#7c3aed;box-shadow:0 2px 0 #5b21b6}
.el-sess.s2 .el-sess-ic{background:#3b82f6;box-shadow:0 2px 0 #1d4ed8}
.el-sess.s3 .el-sess-ic{background:#c084fc;box-shadow:0 2px 0 #9333ea}
.el-sess.s4 .el-sess-ic{background:#f59e0b;box-shadow:0 2px 0 #d97706}
.el-sess:disabled .el-sess-ic,.el-sess.locked .el-sess-ic{background:#2a2a55;box-shadow:0 2px 0 #1e1e40;color:#5a5680}
.el-sess-name{font-size:.82rem;font-weight:900}

/* WORD CHIPS */
.el-word-row{display:flex;gap:6px;flex-wrap:wrap;padding:0 14px 14px}
.el-word-chip{
  border:1px solid #2a2a55;border-radius:10px;
  background:#1a1a35;color:#c4b5fd;
  padding:5px 10px;font-size:.96rem;
  font-family:var(--el-zh);font-weight:900;cursor:pointer;
  transition:border-color .15s;
}
.el-word-chip:active{border-color:#7c3aed;background:#1e1045}

/* HOME FOOTER */
.el-home-footer{display:flex;gap:10px;padding:16px 14px 0}
.el-pill-btn{
  flex:1;min-height:44px;border:1.5px solid #2a2a55;
  border-radius:14px;background:#13132a;
  color:#9893b8;font-weight:900;font-size:.8rem;
  font-family:var(--el-font);cursor:pointer;transition:.15s;
}
.el-pill-btn.active{background:#4c1d95;border-color:#7c3aed;color:#e9d5ff}
.el-pill-btn.danger{color:#ef4444;border-color:#3f1212}
.el-pill-btn:active{opacity:.7}

/* ═══ LESSON ═══ */
.el-lesson{
  font-family:var(--el-font);
  background:#0d0d1a;color:#f0eeff;
  min-height:100vh;max-width:430px;
  margin:0 auto;display:flex;flex-direction:column;
  box-sizing:border-box;
}

/* LESSON TOP */
.el-lesson-top{
  display:grid;grid-template-columns:40px 1fr auto;
  align-items:center;gap:10px;
  padding:12px 16px 10px;
  position:sticky;top:0;z-index:20;
  background:#0d0d1a;border-bottom:1px solid #1e1e40;
}
.el-close-btn{
  border:0;background:#1a1a35;color:#9893b8;
  font-size:1rem;font-weight:900;cursor:pointer;
  border-radius:10px;width:34px;height:34px;
  display:flex;align-items:center;justify-content:center;
}
.el-close-btn:active{background:#2a2a55}
.el-prog-track{
  height:12px;border-radius:99px;
  background:#1a1a35;overflow:hidden;
}
.el-prog-fill{
  height:100%;border-radius:inherit;
  background:linear-gradient(90deg,#7c3aed,#c084fc);
  transition:width .5s cubic-bezier(.4,0,.2,1);
}
.el-hearts-disp{display:flex;gap:3px;align-items:center}
.heart-on{color:#ef4444;font-size:1rem}
.heart-off{color:#2a2a55;font-size:1rem}

/* EXERCISE BODY */
.el-ex-body{flex:1;display:flex;flex-direction:column}

/* SCREEN */
.el-screen{
  flex:1;display:flex;flex-direction:column;gap:14px;
  padding:18px 16px calc(var(--el-nav) + 85px);
}
.el-screen.center{align-items:center;text-align:center}

.el-kicker{
  font-size:.68rem;font-weight:950;letter-spacing:.1em;
  color:#7c3aed;text-transform:uppercase;
}
.el-title{
  margin:0;font-size:1.38rem;font-weight:950;
  color:#f0eeff;line-height:1.15;
}
.el-sub{color:#9893b8;font-weight:800;font-size:.88rem;line-height:1.35;margin:0}

/* MASCOT SIZES */
.el-mascot-lg{width:130px;height:120px;display:flex;align-items:flex-end;justify-content:center}
.el-mascot-sm{width:80px;height:74px;display:flex;align-items:flex-end;justify-content:center}
.el-mascot-xl{width:160px;height:150px;display:flex;align-items:flex-end;justify-content:center}
.el-mascot-lg .el-mascot-svg{width:110px}
.el-mascot-sm .el-mascot-svg{width:68px}
.el-mascot-xl .el-mascot-svg{width:140px}

/* INTRO CHIPS */
.el-chip-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;max-width:300px}
.el-chip{
  border:1.5px solid #2a2a55;border-radius:14px;
  background:#1a1a35;color:#c4b5fd;
  padding:10px 6px;font-size:1.12rem;
  font-family:var(--el-zh);font-weight:950;cursor:pointer;
}
.el-chip:active{border-color:#7c3aed;background:#1e1045}

/* CARD FACE */
.el-card-face{
  background:#1a1a35;border:1.5px solid #2a2a55;
  border-radius:24px;padding:24px;
  display:flex;flex-direction:column;align-items:center;gap:12px;
  width:100%;max-width:320px;box-sizing:border-box;
  box-shadow:0 8px 24px rgba(0,0,0,.4);
}
.el-zh-big{
  font-family:var(--el-zh);font-size:4.5rem;font-weight:900;
  border:0;background:transparent;color:#f0eeff;cursor:pointer;
  padding:0;line-height:1;letter-spacing:-.02em;
}
.el-zh-big:active{opacity:.7}
.el-card-en{font-size:1.1rem;font-weight:950;color:#f0eeff}
.el-card-hint{color:#5a5680;font-size:.76rem;font-weight:800}
.el-hanzi-practice{
  width:min(280px,78vw);
  aspect-ratio:1;
  position:relative;
  border-radius:22px;
  overflow:hidden;
  background:#f8fafc;
  border:2px solid #d9eef2;
  box-shadow:0 8px 0 #bfd6df;
  touch-action:none;
}
.el-hanzi-writer,
.el-hanzi-canvas{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
}
.el-hanzi-actions{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:8px;
  width:min(320px,88vw);
}
.el-hanzi-actions button{
  min-height:40px;
  border:0;
  border-radius:13px;
  background:#1a1a35;
  color:#c4b5fd;
  font-family:var(--el-font);
  font-size:.72rem;
  font-weight:950;
}
.el-py{font-size:.96rem;color:#7c3aed;font-weight:900;font-style:italic}

/* STIMULUS */
.el-stimulus{display:flex;justify-content:center;align-items:center;min-height:90px}
.el-en-prompt{
  background:#1a1a35;border:1.5px solid #2a2a55;border-radius:18px;
  padding:16px 20px;font-size:1.1rem;font-weight:950;
  color:#f0eeff;text-align:center;width:100%;max-width:300px;
}
.el-audio-btn{
  display:flex;flex-direction:column;align-items:center;gap:8px;
  width:130px;height:120px;border-radius:28px;
  background:#4c1d95;box-shadow:0 6px 0 #3b0764;
  color:#f0eeff;border:0;cursor:pointer;font-family:var(--el-font);
  font-size:2.4rem;padding-top:20px;
  transition:transform .1s;
}
.el-audio-btn span{font-size:.68rem;font-weight:950;letter-spacing:.06em;color:#c4b5fd}
.el-audio-btn:active{transform:scale(.95)}
.el-sound-btn{
  min-height:110px;width:160px;border:1.5px solid #7c3aed;border-radius:24px;
  background:#1e1045;color:#f0eeff;cursor:pointer;
  font-family:var(--el-zh);font-size:3rem;font-weight:900;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:8px;box-shadow:0 6px 0 #3b0764;padding:12px;
  transition:transform .1s;
}
.el-sound-btn:active{transform:scale(.95)}
.el-sound-btn small{font-family:var(--el-font);font-size:.78rem;color:#c4b5fd;font-style:italic;font-weight:800}
.el-zh-sent{
  background:#1a1a35;border:1.5px solid #2a2a55;border-radius:18px;
  padding:16px;font-family:var(--el-zh);font-size:1.5rem;font-weight:900;
  color:#f0eeff;text-align:center;width:100%;max-width:320px;
  display:flex;flex-direction:column;align-items:center;gap:6px;
}
.el-py-sm{font-family:var(--el-font);font-size:.78rem;color:#7c3aed;font-style:italic;font-weight:800}

/* OPTIONS */
.el-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}
.el-opt{
  min-height:80px;border:1.5px solid #2a2a55;border-radius:18px;
  background:#1a1a35;color:#f0eeff;font-weight:950;
  font-size:.9rem;cursor:pointer;font-family:var(--el-font);
  padding:10px 8px;line-height:1.3;
  transition:border-color .1s,background .1s,transform .08s;
}
.el-opt:active{transform:translateY(2px)}
.el-opts.chars .el-opt{font-family:var(--el-zh);font-size:1.6rem;min-height:110px}
.el-opt.sel{
  background:#1e1045;border-color:#7c3aed;color:#c4b5fd;
  box-shadow:0 0 0 2px rgba(124,58,237,.3);
}

/* MATCH */
.el-match{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}
.el-match-col{display:grid;gap:10px}
.el-mbtn{
  min-height:56px;border:1.5px solid #2a2a55;border-radius:16px;
  background:#1a1a35;color:#f0eeff;font-weight:950;
  font-family:var(--el-zh);font-size:.9rem;cursor:pointer;
  padding:8px 6px;line-height:1.3;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:3px;
  transition:border-color .1s,background .1s;
}
.el-mbtn small{font-family:var(--el-font);color:#5a5680;font-size:.64rem;font-style:italic}
.el-mbtn:active{background:#21214a}
.el-mbtn.sel{background:#1e1045;border-color:#7c3aed;color:#c4b5fd}
.el-mbtn.done{opacity:.28;pointer-events:none}

/* TILE SCREEN */
.el-tile-source{
  border:1.5px solid #2a2a55;border-radius:18px;
  background:#1a1a35;padding:14px;
  width:100%;box-sizing:border-box;
}
.el-tile-prompt-en{font-size:1rem;font-weight:950;color:#f0eeff}
.el-tile-prompt-zh{
  font-family:var(--el-zh);font-size:1.6rem;font-weight:900;
  color:#f0eeff;display:flex;flex-direction:column;align-items:center;gap:6px;
}
.el-answer{
  min-height:64px;border:1.5px dashed #2a2a55;border-radius:18px;
  background:#0d0d1a;padding:10px;display:flex;flex-wrap:wrap;
  gap:8px;align-content:flex-start;width:100%;box-sizing:border-box;
}
.el-answer.has-tiles{border-style:solid;border-color:#7c3aed30;background:#13132a}
.el-ans-ph{color:#2a2a55;font-weight:950;font-size:.86rem;align-self:center;margin:auto}
.el-ans-tile{
  border:1.5px solid #7c3aed;border-radius:12px;
  background:#1e1045;color:#c4b5fd;
  font-family:var(--el-zh);font-weight:950;
  padding:6px 12px;cursor:pointer;font-size:1rem;
  transition:opacity .1s;
}
.el-ans-tile:active{opacity:.6}
.el-tile-bank{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;width:100%}
.el-tile{
  border:1.5px solid #3b82f6;border-radius:12px;
  background:#1e3a8a;color:#bfdbfe;
  font-family:var(--el-zh);font-weight:950;
  padding:8px 14px;cursor:pointer;font-size:1rem;
  box-shadow:0 3px 0 #1e40af;transition:transform .08s;
}
.el-tile:active{transform:translateY(2px);box-shadow:0 1px 0 #1e40af}
.el-tile.used{opacity:.28;pointer-events:none;box-shadow:none}

/* SPEAK */
.el-speak-card{
  background:#1a1a35;border:1.5px solid #2a2a55;border-radius:20px;
  padding:18px;display:flex;flex-direction:column;align-items:center;gap:8px;
  width:100%;max-width:300px;
}
.el-zh-mid{font-family:var(--el-zh);font-size:2.4rem;font-weight:900;color:#f0eeff}
.el-speak-en{font-size:.9rem;font-weight:800;color:#9893b8}
.el-replay-btn{
  border:1.5px solid #2a2a55;border-radius:14px;
  background:#1a1a35;color:#c4b5fd;
  padding:10px 20px;font-weight:900;cursor:pointer;
  font-family:var(--el-font);font-size:.84rem;
}
.el-mic-btn{
  min-height:52px;border:0;border-radius:16px;
  background:linear-gradient(135deg,#7c3aed,#9d5cf5);
  color:#fff;font-weight:950;font-family:var(--el-font);
  font-size:.92rem;cursor:pointer;padding:0 24px;
  box-shadow:0 4px 0 #5b21b6;transition:transform .1s;
}
.el-mic-btn:active{transform:translateY(2px);box-shadow:0 2px 0 #5b21b6}
.el-mic-btn.listening{animation:el-pulse 1s ease-in-out infinite}
.el-transcript{
  color:#9893b8;font-size:.8rem;font-weight:800;
  font-style:italic;max-width:280px;text-align:center;
}

/* DONE */
.el-done-screen{justify-content:center}
.el-done-title{font-size:1.7rem;font-weight:950;color:#f0eeff;margin:0}
.el-results{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%;max-width:320px}
.el-res-card{
  border-radius:20px;padding:16px 10px;
  display:flex;flex-direction:column;align-items:center;gap:4px;
  border:1.5px solid transparent;
}
.el-res-card.gold{background:#1c1400;border-color:#f59e0b40}
.el-res-card.blue{background:#0f1e3a;border-color:#3b82f640}
.el-res-card.purple{background:#130d2e;border-color:#7c3aed40}
.el-res-val{font-size:1.5rem;font-weight:950}
.el-res-card.gold .el-res-val{color:#f59e0b}
.el-res-card.blue .el-res-val{color:#60a5fa}
.el-res-card.purple .el-res-val{color:#a78bfa}
.el-res-lbl{font-size:.64rem;color:#5a5680;font-weight:950;text-transform:uppercase;letter-spacing:.06em}

/* BUTTONS */
.el-btn-primary{
  width:100%;min-height:56px;border:0;border-radius:16px;
  background:linear-gradient(135deg,#7c3aed,#9d5cf5);color:#fff;
  box-shadow:0 4px 0 #5b21b6;
  font-weight:950;font-size:1rem;font-family:var(--el-font);
  cursor:pointer;transition:transform .1s,box-shadow .1s;
}
.el-btn-primary:active{transform:translateY(3px);box-shadow:0 1px 0 #5b21b6}
.el-btn-primary:disabled{background:#2a2a55;color:#5a5680;box-shadow:none;cursor:not-allowed}
.el-btn-secondary{
  width:100%;min-height:56px;border:0;border-radius:16px;
  background:#1a1a35;color:#9893b8;box-shadow:0 4px 0 #0d0d1a;
  font-weight:950;font-size:1rem;font-family:var(--el-font);cursor:pointer;
  transition:transform .1s;
}
.el-btn-secondary:active{transform:translateY(3px)}

/* FOOTER */
.el-foot{
  position:fixed;
  left:50%;transform:translateX(-50%);
  bottom:var(--el-nav);
  width:min(430px,100vw);
  box-sizing:border-box;
  padding:10px 16px 14px;
  background:linear-gradient(180deg,rgba(13,13,26,0),#0d0d1a 28%);
  z-index:9997;
}
.el-foot.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* FEEDBACK */
.el-feedback{
  position:fixed;left:50%;bottom:var(--el-nav);
  transform:translateX(-50%);
  width:min(430px,100vw);box-sizing:border-box;
  z-index:10000;
  padding:16px 16px 14px;
  border-radius:24px 24px 0 0;
  animation:el-slideup .22s cubic-bezier(.34,1.56,.64,1);
}
.el-feedback.ok{background:#052e16;border-top:2px solid #22c55e}
.el-feedback.bad{background:#2d0a0a;border-top:2px solid #ef4444}
.el-fb-row{display:grid;grid-template-columns:60px 1fr 32px;gap:10px;align-items:center;margin-bottom:12px}
.el-fb-row .el-mascot-svg{width:52px}
.el-fb-text strong{display:block;font-size:1rem;font-weight:950}
.el-feedback.ok .el-fb-text strong{color:#22c55e}
.el-feedback.bad .el-fb-text strong{color:#ef4444}
.el-fb-text span{font-size:.82rem;font-weight:800;color:#9893b8}
.el-fb-icon{
  font-size:1.4rem;font-weight:950;
  display:flex;align-items:center;justify-content:center;
}
.el-feedback.ok .el-fb-icon{color:#22c55e}
.el-feedback.bad .el-fb-icon{color:#ef4444}
.el-fb-btn{
  width:100%;min-height:52px;border:0;border-radius:14px;
  font-weight:950;font-size:.96rem;font-family:var(--el-font);
  cursor:pointer;
}
.el-feedback.ok .el-fb-btn{background:#22c55e;color:#052e16;box-shadow:0 4px 0 #16a34a}
.el-feedback.bad .el-fb-btn{background:#ef4444;color:#fff;box-shadow:0 4px 0 #dc2626}

/* ANIMATIONS */
@keyframes el-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes el-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes el-slideup{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}

/* DUOLINGO-STYLE MAP OVERRIDE */
.duo-map{
  --duo-bg:#101d23;
  --duo-green:#58cc02;
  --duo-green-dark:#3ba800;
  --duo-gold:#ffc800;
  --duo-blue:#1cb0f6;
  background:
    radial-gradient(circle at 18% 18%,rgba(88,204,2,.08),transparent 23%),
    linear-gradient(180deg,#122129 0%,#0f1c22 100%)!important;
  color:#f7fff8;
  min-height:100vh;
  padding:0 0 calc(var(--el-nav) + 18px);
  overflow:hidden auto;
  position:relative;
}
.duo-topbar{
  height:92px;
  display:grid;
  grid-template-columns:64px 1fr 1fr 58px;
  gap:12px;
  align-items:end;
  padding:18px 20px 10px;
  box-sizing:border-box;
  background:#101d23;
  position:sticky;
  top:0;
  z-index:30;
}
.duo-flag,.duo-score,.duo-avatar{
  min-height:48px;
  display:flex;
  align-items:center;
  justify-content:center;
}
.duo-flag{
  font-size:2rem;
  filter:drop-shadow(0 5px 0 rgba(0,0,0,.24));
}
.duo-flag-cn{
  width:54px;
  height:36px;
  border-radius:10px;
  background:#ef4444;
  border:4px solid #fff;
  box-shadow:0 5px 0 rgba(0,0,0,.22);
  position:relative;
  display:block;
}
.duo-flag-cn:before{
  content:'';
  position:absolute;
  left:8px;
  top:7px;
  width:11px;
  height:11px;
  background:#ffd43b;
  clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
}
.duo-flag-cn:after{
  content:'';
  position:absolute;
  left:24px;
  top:8px;
  width:4px;
  height:4px;
  border-radius:50%;
  background:#ffd43b;
  box-shadow:8px 4px 0 #ffd43b,2px 13px 0 #ffd43b,11px 15px 0 #ffd43b;
}
.duo-score{
  gap:9px;
  font-size:1.52rem;
  font-weight:950;
  letter-spacing:.04em;
}
.duo-score span{
  width:42px;
  height:42px;
  display:grid;
  place-items:center;
  border-radius:14px;
  background:#172b33;
  box-shadow:inset 0 -4px 0 rgba(0,0,0,.18),0 2px 0 rgba(255,255,255,.08);
  font-size:.58rem;
  font-weight:950;
}
.duo-score.flame b{color:#ffb020}
.duo-score.gem b{color:#3cc6ff}
.duo-avatar .duo-owl{transform:scale(.58)}
.duo-avatar .duo-owl{
  width:48px;
  height:48px;
  transform:none;
  border-radius:38% 38% 44% 44%;
  box-shadow:inset 0 -6px 0 rgba(0,0,0,.14),0 6px 0 rgba(0,0,0,.28);
}
.duo-avatar .duo-owl:before,
.duo-avatar .duo-owl:after{
  top:15px;
  width:15px;
  height:18px;
}
.duo-avatar .duo-owl:before{left:9px}
.duo-avatar .duo-owl:after{right:9px}
.duo-avatar .duo-owl .eye{
  top:22px;
  width:6px;
  height:9px;
}
.duo-avatar .duo-owl .eye.l{left:16px}
.duo-avatar .duo-owl .eye.r{right:16px}
.duo-avatar .duo-owl b{
  left:20px;
  top:31px;
  width:8px;
  height:7px;
}
.duo-avatar .duo-owl .wing{
  top:29px;
  width:12px;
  height:15px;
}
.duo-avatar .duo-owl strong{
  left:15px;
  right:15px;
  bottom:-5px;
  height:8px;
}
.duo-side-handle{
  position:fixed;
  left:-12px;
  top:112px;
  width:58px;
  height:118px;
  border:0;
  border-radius:0 24px 24px 0;
  background:linear-gradient(90deg,#3e4745,#18262c);
  color:#d6e1e3;
  font-size:4rem;
  line-height:1;
  z-index:35;
  box-shadow:0 12px 26px rgba(0,0,0,.35);
}
.duo-unit-banner{
  margin:8px 18px 20px;
  min-height:116px;
  display:grid;
  grid-template-columns:minmax(0,1fr) 74px;
  align-items:stretch;
  border-radius:22px;
  overflow:hidden;
  background:
    linear-gradient(135deg,rgba(255,255,255,.12) 0 18%,transparent 18% 42%,rgba(255,255,255,.08) 42% 60%,transparent 60%),
    var(--duo-green);
  box-shadow:0 7px 0 var(--duo-green-dark),0 18px 34px rgba(0,0,0,.28);
}
.duo-unit-banner>div{
  padding:18px 16px;
  min-width:0;
}
.duo-unit-banner small{
  display:block;
  color:rgba(255,255,255,.82);
  font-size:.92rem;
  font-weight:950;
  letter-spacing:.03em;
  margin-bottom:8px;
}
.duo-unit-banner h1{
  margin:0;
  color:#fff;
  font-size:clamp(1.18rem,5.3vw,1.46rem);
  line-height:1.18;
  font-weight:950;
  text-shadow:0 2px 0 rgba(0,0,0,.12);
}
.duo-section-progress{
  display:inline-block;
  margin-top:8px;
  color:rgba(255,255,255,.82);
  font-size:.72rem;
  font-weight:900;
}
.duo-unit-banner button{
  border:0;
  border-left:4px solid rgba(0,0,0,.12);
  background:rgba(0,0,0,.04);
  color:#fff;
  font-size:.86rem;
  font-weight:950;
  font-family:var(--el-font);
  display:grid;
  place-items:center;
  text-transform:uppercase;
  letter-spacing:.02em;
  overflow:hidden;
}
.duo-unit-banner button span{max-width:100%;overflow:hidden;text-overflow:ellipsis}
.duo-section-card{
  margin:-8px 18px 16px;
  padding:16px;
  border-radius:22px;
  background:#f7fff3;
  color:#172b33;
  box-shadow:0 8px 0 #cbe8bd,0 18px 30px rgba(0,0,0,.24);
  border:2px solid #dff4d5;
}
.duo-section-card small{
  color:#58a700;
  font-weight:950;
  letter-spacing:.08em;
}
.duo-section-card h2{
  margin:4px 0 6px;
  font-size:1.42rem;
  line-height:1.05;
}
.duo-section-card p{
  margin:0;
  color:#53636a;
  font-weight:800;
  line-height:1.35;
}
.duo-section-card dl{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:8px;
  margin:14px 0;
}
.duo-section-card dl div{
  border-radius:14px;
  background:#e9f7e3;
  padding:8px;
  text-align:center;
}
.duo-section-card dt{
  color:#58a700;
  font-size:.66rem;
  font-weight:950;
  text-transform:uppercase;
}
.duo-section-card dd{
  margin:2px 0 0;
  font-size:1.05rem;
  font-weight:950;
}
.duo-section-card .duo-section-range{
  font-size:.8rem;
}
.duo-section-card button{
  width:100%;
  min-height:42px;
  margin-top:12px;
  border:0;
  border-radius:14px;
  background:#58cc02;
  color:#fff;
  font-weight:950;
  box-shadow:0 4px 0 #3ba800;
}
.duo-section-tabs{
  display:flex;
  gap:8px;
  overflow-x:auto;
  padding:8px 18px 10px;
  scrollbar-width:none;
}
.duo-section-tabs::-webkit-scrollbar{display:none}
.duo-section-tabs button{
  min-width:78px;
  border:2px solid rgba(255,255,255,.1);
  border-radius:18px;
  background:rgba(255,255,255,.06);
  color:#d8e6de;
  padding:8px 10px;
  text-align:left;
  font-family:var(--el-font);
  box-shadow:0 4px 0 rgba(0,0,0,.18);
}
.duo-section-tabs button.active{
  background:#58cc02;
  color:#fff;
  border-color:#78e623;
  box-shadow:0 5px 0 #3ba800;
}
.duo-section-tabs b{display:block;font-size:1rem;line-height:1}
.duo-section-tabs span{display:block;margin-top:3px;font-size:.68rem;font-weight:900;white-space:nowrap}
.el-course-warning,
.el-loading-course{
  margin:18px;
  padding:16px;
  border-radius:18px;
  background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.1);
  color:#d8e6de;
  font-weight:900;
}
.el-loading-course{
  min-height:260px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:10px;
}
.el-loading-course span{color:#93a6a0;font-size:.84rem}
.duo-path-wrap{
  position:relative;
  min-height:1500px;
  padding:0 0 120px;
}
.duo-path-wrap:before{
  content:'';
  position:absolute;
  top:14px;
  bottom:20px;
  left:50%;
  width:10px;
  transform:translateX(-50%);
  border-radius:99px;
  background:linear-gradient(180deg,transparent,#27363c 4%,#27363c 96%,transparent);
  opacity:.72;
}
.duo-unit-divider{
  position:relative;
  z-index:2;
  margin:30px 72px 18px;
  padding:8px 12px;
  border-radius:16px;
  background:#172b33;
  border:2px solid #24383f;
  text-align:center;
}
.duo-unit-divider span{
  display:block;
  color:#58cc02;
  font-size:.68rem;
  font-weight:950;
  letter-spacing:.08em;
}
.duo-unit-divider b{
  display:block;
  color:#d9eef2;
  font-size:.9rem;
}
.el-path-section{display:none}
.el-node-row{
  position:relative;
  height:178px;
  --node-size:92px;
}
.el-node-row:has(.el-chest){
  height:134px;
}
.el-node{
  position:absolute;
  left:var(--nx);
  top:28px;
  width:var(--node-size);
  height:var(--node-size);
  transform:translateX(-50%);
  border:0;
  border-radius:50%;
  display:grid;
  place-items:center;
  font-family:var(--el-font);
  font-weight:950;
  color:#fff;
  z-index:5;
  cursor:pointer;
}
.el-node-current,.el-node-avail{
  background:
    radial-gradient(circle at 32% 26%,rgba(255,255,255,.28),transparent 18%),
    linear-gradient(135deg,#61db06,#46bd00);
  box-shadow:0 11px 0 #2f9300,0 18px 22px rgba(0,0,0,.32);
}
.el-node-done{
  background:
    radial-gradient(circle at 32% 26%,rgba(255,255,255,.28),transparent 18%),
    linear-gradient(135deg,#ffd94d,#f6b900);
  box-shadow:0 11px 0 #ca8e00,0 18px 22px rgba(0,0,0,.32);
}
.el-node-lock{
  background:linear-gradient(135deg,#d7e4eb,#adc5d0);
  box-shadow:0 9px 0 #7b98a6,0 16px 22px rgba(0,0,0,.28);
  color:#5d7682;
}
.el-node,
.el-chest,
.duo-chest{
  overflow:hidden;
}
.el-node span{
  font-size:1.42rem;
  line-height:1;
  text-shadow:0 2px 0 rgba(0,0,0,.14);
}
.el-node .el-node-star{
  max-width:68px;
  font-size:.76rem;
  letter-spacing:.01em;
}
.el-node .el-node-check,
.el-node .el-node-lock-ic{
  font-size:.74rem;
}
.el-node-badge{
  position:absolute;
  left:var(--nx);
  top:0;
  transform:translateX(-50%);
  z-index:9;
  background:#fff;
  color:#58cc02;
  border:3px solid #d9eef2;
  border-radius:12px;
  padding:3px 10px;
  font-size:.78rem;
  font-weight:950;
  box-shadow:0 4px 0 rgba(0,0,0,.18);
}
.el-node-label{
  position:absolute;
  left:var(--nx);
  top:126px;
  transform:translateX(-50%);
  width:118px;
  text-align:center;
  color:#abc2c9;
  font-size:.78rem;
  font-weight:950;
}
.el-chest,.duo-chest{
  position:absolute;
  left:var(--nx);
  top:20px;
  transform:translateX(-50%);
  width:96px;
  height:86px;
  display:grid;
  place-items:center;
  border-radius:18px;
  background:linear-gradient(180deg,#ffda2d 0 28%,#aa6500 28% 74%,#ffbd16 74%);
  border:8px solid #ffc800;
  box-shadow:0 10px 0 #53636a,0 18px 24px rgba(0,0,0,.32);
  font-size:.78rem;
  font-weight:950;
  color:#5b3a00;
  z-index:4;
}
.el-chest.locked,.duo-chest.locked{filter:saturate(.7);opacity:.92}
.duo-path-decor{
  position:absolute;
  top:2px;
  z-index:3;
  pointer-events:none;
}
.duo-path-decor.right{left:70%}
.duo-path-decor.left{left:20%}
.duo-path-decor .duo-owl{transform:scale(1.05)}
.duo-stars{
  position:absolute;
  display:flex;
  gap:8px;
  top:106px;
  color:#ffc800;
  font-size:1.8rem;
  filter:drop-shadow(0 4px 0 rgba(0,0,0,.2));
}
.duo-stars.right{left:70%}
.duo-stars.left{left:18%}
.duo-map-controls{
  position:fixed;
  right:22px;
  bottom:calc(var(--el-nav) + 18px);
  z-index:40;
  display:grid;
  gap:10px;
}
.duo-map-controls button{
  width:72px;
  min-height:58px;
  border-radius:18px;
  border:4px solid #31444c;
  background:#172b33;
  color:#1cb0f6;
  font-size:.72rem;
  font-weight:950;
  box-shadow:0 5px 0 rgba(0,0,0,.24);
  font-family:var(--el-font);
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:2px;
}
.duo-map-controls button span{font-size:.72rem;line-height:1}
.duo-map-controls button b{font-size:.64rem;line-height:1;color:#d8e6de}
.duo-map-controls button.active{
  color:#58cc02;
  border-color:#3f5b30;
}
.duo-owl{
  position:relative;
  display:inline-block;
  width:86px;
  height:86px;
  border-radius:36% 36% 44% 44%;
  background:#58cc02;
  box-shadow:inset 0 -10px 0 rgba(0,0,0,.14),0 9px 0 rgba(0,0,0,.28);
}
.duo-owl:before,.duo-owl:after{
  content:'';
  position:absolute;
  top:26px;
  width:26px;
  height:32px;
  border-radius:50%;
  background:#fff;
}
.duo-owl:before{left:16px}
.duo-owl:after{right:16px}
.duo-owl .eye{
  position:absolute;
  top:39px;
  width:10px;
  height:16px;
  border-radius:50%;
  background:#253238;
  z-index:2;
}
.duo-owl .eye.l{left:27px}
.duo-owl .eye.r{right:27px}
.duo-owl b{
  position:absolute;
  left:37px;
  top:55px;
  width:14px;
  height:12px;
  background:#ff9600;
  border-radius:50% 50% 60% 60%;
  z-index:3;
}
.duo-owl .wing{
  position:absolute;
  top:54px;
  width:22px;
  height:28px;
  border-radius:70% 35% 65% 35%;
  background:#46bd00;
}
.duo-owl .wing.l{left:-2px;transform:rotate(24deg)}
.duo-owl .wing.r{right:-2px;transform:rotate(-24deg)}
.duo-owl strong{
  position:absolute;
  left:27px;
  right:27px;
  bottom:-7px;
  height:14px;
  border-radius:99px;
  background:#ff9600;
}
.duo-owl.wave .wing.r{animation:duo-wave 1s ease-in-out infinite}
@keyframes duo-wave{0%,100%{transform:rotate(-24deg)}50%{transform:rotate(-78deg)}}

/* DUOLINGO MAP FINAL POLISH */
#main:has(.duo-map) #topbar{
  display:none!important;
}
#main:has(.el-lesson) #topbar{
  display:none!important;
}
#main:has(.duo-map){
  background:#101d23!important;
}
#main:has(.el-lesson){
  background:#0d0d1a!important;
}
body:has(.el-lesson) #bottom-nav{
  background:#fff!important;
  left:50%!important;
  right:auto!important;
  bottom:0!important;
  width:100%!important;
  max-width:430px!important;
  transform:translateX(-50%)!important;
  border-radius:22px 22px 0 0!important;
}
body:has(.el-lesson) .bottom-nav-inner{
  max-width:100%!important;
  margin:0 auto!important;
  background:transparent!important;
  backdrop-filter:none!important;
  box-shadow:none!important;
}
body:has(.el-lesson) #scratchpad-fab-btn{
  display:none!important;
}
html:has(.el-lesson),
body:has(.el-lesson){
  height:100dvh!important;
  overflow:hidden!important;
  overscroll-behavior:none!important;
}
body:has(.duo-map) #bottom-nav{
  background:#101d23!important;
  border-top:2px solid #263940!important;
  box-shadow:0 -8px 24px rgba(0,0,0,.28)!important;
  left:50%!important;
  right:auto!important;
  bottom:0!important;
  width:100%!important;
  transform:translateX(-50%)!important;
  border-radius:22px 22px 0 0!important;
}
body:has(.duo-map) .bottom-nav-inner{
  max-width:100%!important;
  margin:0 auto!important;
  background:transparent!important;
  backdrop-filter:none!important;
  box-shadow:none!important;
  padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px))!important;
}
body:has(.duo-map) .bottom-nav-item{
  color:#8fa1a8!important;
  font-weight:900!important;
  border-radius:16px!important;
}
body:has(.duo-map) .bottom-nav-item.active{
  color:#dff7ff!important;
  background:#172b33!important;
  outline:3px solid #28515f!important;
}
body:has(.duo-map) .bottom-nav-item.active .bn-icon,
body:has(.duo-map) .bottom-nav-menu.active .bn-icon{
  color:#dff7ff!important;
}
body:has(.duo-map) #scratchpad-fab-btn{
  display:none!important;
}
.duo-map{
  max-width:100%!important;
  width:100%!important;
  min-height:100dvh!important;
  isolation:isolate;
}
.duo-side-handle{
  display:none!important;
}
.duo-topbar{
  height:76px!important;
  grid-template-columns:62px 1fr 1fr 58px!important;
  padding:10px 18px 8px!important;
}
.duo-unit-banner{
  margin:8px 18px 22px!important;
  min-height:112px!important;
  border-radius:22px!important;
}
.duo-unit-banner h1{
  font-size:clamp(1.32rem,6vw,1.62rem)!important;
  max-width:100%;
}
.duo-path-wrap{
  min-height:1500px!important;
  padding-top:6px!important;
}
.duo-path-wrap:before{
  display:none!important;
}
.el-node-row{
  height:154px!important;
  overflow:visible!important;
}
.el-node-row:has(.el-chest){
  height:120px!important;
}
.el-node{
  --node-size:84px;
  top:20px!important;
  border:5px solid rgba(255,255,255,.12)!important;
}
.el-node-current{
  animation:duo-node-pop 1.9s ease-in-out infinite;
}
.el-node-badge{
  top:-6px!important;
  color:#58cc02!important;
  border-color:#dff7d1!important;
}
.el-node-label{
  top:112px!important;
  color:#d8e5e8!important;
  text-shadow:0 2px 0 rgba(0,0,0,.32);
}
.el-chest,.duo-chest{
  top:10px!important;
  width:84px!important;
  height:74px!important;
  border-radius:16px!important;
}
.duo-path-decor.right{left:69%!important}
.duo-path-decor.left{left:18%!important}
.duo-path-decor .duo-owl{transform:scale(.86)!important}
.duo-stars{
  top:94px!important;
  font-size:1.48rem!important;
  text-shadow:0 3px 0 #b97700;
}
.duo-stars.right{left:68%!important}
.duo-stars.left{left:17%!important}
.duo-map-controls{
  right:18px!important;
  bottom:calc(var(--el-nav) + 22px)!important;
}
.duo-map-controls button{
  width:66px!important;
  min-height:50px!important;
  border-radius:16px!important;
}
@keyframes duo-node-pop{
  0%,100%{transform:translateX(-50%) translateY(0) scale(1)}
  50%{transform:translateX(-50%) translateY(-5px) scale(1.035)}
}

@media(max-width:430px){
  .duo-side-handle{
    width:50px!important;
    height:104px!important;
    left:-18px!important;
    top:128px!important;
    font-size:3rem!important;
  }
  .duo-topbar{
    grid-template-columns:54px 1fr 1fr 50px!important;
    gap:8px!important;
    padding-left:14px!important;
    padding-right:14px!important;
  }
  .duo-score{
    gap:6px!important;
    font-size:1.22rem!important;
  }
  .duo-score span{
    width:36px!important;
    height:36px!important;
  }
  .duo-unit-banner{
    margin-left:14px!important;
    margin-right:14px!important;
    grid-template-columns:1fr 72px!important;
  }
  .duo-unit-banner>div{
    padding:18px 14px 18px 24px!important;
  }
  .duo-unit-banner small{
    font-size:.92rem!important;
  }
  .duo-unit-banner button{
    font-size:2.4rem!important;
  }
  .el-node{
    --node-size:78px;
  }
  .duo-path-decor .duo-owl{
    transform:scale(.86)!important;
  }
  .duo-stars{
    font-size:1.44rem!important;
    gap:5px!important;
  }
  .duo-map-controls button{
    width:46px!important;
    height:46px!important;
  }
}

/* RESPONSIVE */
@media(max-width:380px){
  :root{--el-nav:calc(90px + env(safe-area-inset-bottom,0px))}
  .el-home,.el-lesson{max-width:100%}
  .el-hero{grid-template-columns:76px 1fr}
  .el-hero-mascot{width:76px;height:76px}
  .el-opts{grid-template-columns:1fr}
  .el-results{grid-template-columns:1fr}
  .el-title{font-size:1.18rem}
  .el-foot.two{grid-template-columns:1fr}
  .el-zh-big{font-size:3.6rem}
}
@media(max-height:620px){
  .el-screen{padding-bottom:calc(var(--el-nav) + 70px)}
}

/* LESSON ONE-SCREEN FIT */
#page-content:has(.el-lesson){
  height:calc(100dvh - var(--mobile-nav-h, 68px) - env(safe-area-inset-bottom,0px))!important;
  min-height:0!important;
  overflow:hidden!important;
}
.el-lesson{
  height:calc(100dvh - var(--mobile-nav-h, 68px) - env(safe-area-inset-bottom,0px))!important;
  min-height:0!important;
  max-width:100%!important;
  overflow:hidden!important;
}
.el-lesson-top{
  flex:0 0 54px!important;
  padding:9px 14px 8px!important;
}
.el-ex-body{
  min-height:0!important;
  overflow:hidden!important;
}
.el-screen{
  min-height:0!important;
  overflow:hidden!important;
  padding:10px 16px 82px!important;
  gap:9px!important;
}
.el-screen.center{
  justify-content:flex-start!important;
}
.el-kicker{
  font-size:.62rem!important;
}
.el-title{
  font-size:clamp(1.08rem,5vw,1.32rem)!important;
}
.el-sub{
  font-size:.78rem!important;
}
.el-mascot-lg{
  width:90px!important;
  height:82px!important;
}
.el-mascot-lg .el-mascot-svg{
  width:82px!important;
}
.el-mascot-sm{
  width:60px!important;
  height:54px!important;
}
.el-mascot-sm .el-mascot-svg{
  width:54px!important;
}
.el-mascot-xl{
  width:112px!important;
  height:104px!important;
}
.el-mascot-xl .el-mascot-svg{
  width:98px!important;
}
.el-chip-grid{
  max-width:100%!important;
  gap:8px!important;
}
.el-chip{
  min-height:48px!important;
  padding:6px!important;
  font-size:clamp(1rem,6vw,1.18rem)!important;
}
.el-card-face{
  padding:18px!important;
}
.el-zh-big{
  font-size:clamp(3rem,17vw,4.2rem)!important;
}
.el-opts{
  gap:8px!important;
}
.el-opt{
  min-height:64px!important;
}
.el-opts.chars .el-opt{
  min-height:78px!important;
}
.el-match,
.el-match-col{
  gap:7px!important;
}
.el-mbtn{
  min-height:44px!important;
  font-size:.82rem!important;
}
.el-tile-source{
  padding:10px!important;
}
.el-answer{
  min-height:50px!important;
}
.el-tile-bank{
  gap:6px!important;
}
.el-tile,
.el-ans-tile{
  padding:6px 10px!important;
}
.el-speak-card{
  padding:12px!important;
}
.el-zh-mid{
  font-size:2rem!important;
}
.el-foot{
  bottom:calc(var(--mobile-nav-h, 68px) + env(safe-area-inset-bottom,0px))!important;
  width:min(430px,100vw)!important;
  padding:8px 16px 10px!important;
}
.el-btn-primary,
.el-btn-secondary{
  min-height:50px!important;
}
.el-feedback{
  bottom:calc(var(--mobile-nav-h, 68px) + env(safe-area-inset-bottom,0px))!important;
}
    `;
    document.head.appendChild(s);
  }

  /* ─── Public API ─── */
  return { render, exitLesson, unmount:closeFeedback, playCurrent, togglePinyin };
})();
