const fs = require('fs');

// 1. Generate Coherent Beginner Playground Content
const pgStages = [
  { s: 'start-here', sl: '🟢 Week 1-4 — Survival Mandarin' },
  { s: 'daily-life', sl: '🟡 Week 5-8 — Daily Life in Taiwan' },
  { s: 'work-study', sl: '🟠 Week 9-12 — Work & Study' },
  { s: 'social', sl: '🟣 Week 13-16 — Socializing & Fluency' }
];

const storyTemplates = [
  {
    title: "Arrival at Taoyuan Airport",
    dialogue: [
      { speaker: "你", zh: "你好，請問計程車在哪裡？", pinyin: "Nǐ hǎo, qǐngwèn jìchéngchē zài nǎlǐ?", en: "Hello, excuse me, where are the taxis?" },
      { speaker: "路人", zh: "計程車在外面，往右走。", pinyin: "Jìchéngchē zài wàimiàn, wǎng yòu zǒu.", en: "Taxis are outside, walk to the right." },
      { speaker: "你", zh: "謝謝你。", pinyin: "Xièxiè nǐ.", en: "Thank you." },
      { speaker: "司機", zh: "你要去哪裡？", pinyin: "Nǐ yào qù nǎlǐ?", en: "Where do you want to go?" },
      { speaker: "你", zh: "我要去新竹科學園區。", pinyin: "Wǒ yào qù Xīnzhú Kēxué Yuánqū.", en: "I want to go to Hsinchu Science Park." },
      { speaker: "司機", zh: "好的，大約一個小時。", pinyin: "Hǎo de, dàyuē yīgè xiǎoshí.", en: "Okay, about one hour." }
    ]
  },
  {
    title: "First Day at the Office",
    dialogue: [
      { speaker: "主管", zh: "歡迎來到我們公司。", pinyin: "Huānyíng lái dào wǒmen gōngsī.", en: "Welcome to our company." },
      { speaker: "你", zh: "很高興認識大家。", pinyin: "Hěn gāoxìng rènshì dàjiā.", en: "Nice to meet everyone." },
      { speaker: "同事", zh: "這是你的電腦和密碼。", pinyin: "Zhè shì nǐ de diànnǎo hé mìmǎ.", en: "This is your computer and password." },
      { speaker: "你", zh: "謝謝，請問會議室在哪裡？", pinyin: "Xièxiè, qǐngwèn huìyìshì zài nǎlǐ?", en: "Thanks, where is the meeting room?" },
      { speaker: "同事", zh: "會議室在二樓。", pinyin: "Huìyìshì zài èr lóu.", en: "The meeting room is on the second floor." }
    ]
  },
  {
    title: "Ordering Lunch at a Restaurant",
    dialogue: [
      { speaker: "店員", zh: "歡迎光臨，幾位？", pinyin: "Huānyíng guānglín, jǐ wèi?", en: "Welcome, how many people?" },
      { speaker: "你", zh: "一位，謝謝。", pinyin: "Yī wèi, xièxiè.", en: "One person, thank you." },
      { speaker: "店員", zh: "這是菜單。想吃什麼？", pinyin: "Zhè shì càidān. Xiǎng chī shénme?", en: "This is the menu. What do you want to eat?" },
      { speaker: "你", zh: "我要一碗牛肉麵。", pinyin: "Wǒ yào yī wǎn niúròu miàn.", en: "I want a bowl of beef noodle soup." },
      { speaker: "店員", zh: "好的，請等一下。", pinyin: "Hǎo de, qǐng děng yīxià.", en: "Okay, please wait a moment." }
    ]
  },
  {
    title: "Renting an Apartment",
    dialogue: [
      { speaker: "你", zh: "你好，我想看這間套房。", pinyin: "Nǐ hǎo, wǒ xiǎng kàn zhè jiān tàofáng.", en: "Hello, I want to see this studio apartment." },
      { speaker: "房東", zh: "沒問題，裡面很乾淨。", pinyin: "Méi wèntí, lǐmiàn hěn gānjìng.", en: "No problem, it's very clean inside." },
      { speaker: "你", zh: "租金一個月多少錢？", pinyin: "Zūjīn yīgè yuè duōshǎo qián?", en: "How much is the rent per month?" },
      { speaker: "房東", zh: "一個月一萬五千元。", pinyin: "Yīgè yuè yī wàn wǔqiān yuán.", en: "15,000 NTD per month." },
      { speaker: "你", zh: "包含水電費嗎？", pinyin: "Bāohán shuǐdiànfèi ma?", en: "Does it include utilities?" },
      { speaker: "房東", zh: "包水，不包電。", pinyin: "Bāo shuǐ, bù bāo diàn.", en: "Includes water, but not electricity." }
    ]
  },
  {
    title: "Going to a Night Market",
    dialogue: [
      { speaker: "朋友", zh: "我們去逛夜市吧！", pinyin: "Wǒmen qù guàng yèshì ba!", en: "Let's go to the night market!" },
      { speaker: "你", zh: "好啊，我想吃臭豆腐。", pinyin: "Hǎo a, wǒ xiǎng chī chòudòufu.", en: "Sure, I want to eat stinky tofu." },
      { speaker: "朋友", zh: "那家店的雞排也很好吃。", pinyin: "Nà jiā diàn de jīpái yě hěn hǎochī.", en: "That shop's chicken fillet is also very good." },
      { speaker: "你", zh: "太棒了，我們現在就去。", pinyin: "Tài bàng le, wǒmen xiànzài jiù qù.", en: "Awesome, let's go now." }
    ]
  }
];

const pgData = [];
let chapterCount = 1;
for (let sIdx = 0; sIdx < pgStages.length; sIdx++) {
  const stage = pgStages[sIdx];
  for (let i = 0; i < 5; i++) {
    const chapter = {
      id: 'pg' + chapterCount,
      title: 'Chapter ' + chapterCount + ': ' + stage.sl.split('— ')[1],
      subtitle: 'Real-world conversational practice',
      stage: stage.s,
      stage_label: stage.sl,
      lessons: []
    };

    for (let j = 1; j <= 5; j++) {
      const template = storyTemplates[(chapterCount + j) % storyTemplates.length];
      
      // Extract unique vocab from the dialogue
      const vocabMap = {};
      template.dialogue.forEach(line => {
        const chars = line.zh.match(/[\u4e00-\u9fa5]/g) || [];
        chars.forEach(c => {
          if (!vocabMap[c]) {
            vocabMap[c] = {
              hanzi: c,
              pinyin: "", // placeholder, would need dict lookup for real accuracy
              definition: "Character " + c
            };
          }
        });
      });

      chapter.lessons.push({
        id: chapter.id + '_l' + j,
        title: template.title + ' (Part ' + j + ')',
        vocab: Object.values(vocabMap),
        dialogue: template.dialogue
      });
    }
    pgData.push(chapter);
    chapterCount++;
  }
}
fs.writeFileSync('data/playground_content.json', JSON.stringify(pgData, null, 2));

// 2. Fix Character Playground (Formation Game Data)
const charPgData = [
  {
    "id": "cpg1",
    "title": "Block 1: Human Body",
    "titleZh": "第一組：人體",
    "subtitle": "Radicals derived from the human body.",
    "icon": "🧍",
    "color": "#e74c3c",
    "lessons": [
      {
        "id": "cpg1-l1",
        "radical": "人",
        "radical_pinyin": "rén",
        "radical_meaning": "person",
        "stroke_count": 2,
        "variant_forms": ["亻"],
        "mnemonic": "Two legs walking.",
        "compounds": [
          { "hanzi": "休", "pinyin": "xiū", "definition": "rest", "breakdown": "亻 + 木", "parts": ["亻", "木"], "result": "休", "meaning": "rest" },
          { "hanzi": "做", "pinyin": "zuò", "definition": "do", "breakdown": "亻 + 故", "parts": ["亻", "故"], "result": "做", "meaning": "do" },
          { "hanzi": "信", "pinyin": "xìn", "definition": "trust", "breakdown": "亻 + 言", "parts": ["亻", "言"], "result": "信", "meaning": "trust" }
        ]
      }
    ]
  },
  {
    "id": "cpg2",
    "title": "Block 2: Nature",
    "titleZh": "第二組：自然",
    "subtitle": "Sun, Moon, Water, Trees.",
    "icon": "🏔️",
    "color": "#27ae60",
    "lessons": [
      {
        "id": "cpg2-l1",
        "radical": "水",
        "radical_pinyin": "shuǐ",
        "radical_meaning": "water",
        "stroke_count": 4,
        "variant_forms": ["氵"],
        "mnemonic": "Flowing water.",
        "compounds": [
          { "hanzi": "清", "pinyin": "qīng", "definition": "clear", "breakdown": "氵 + 青", "parts": ["氵", "青"], "result": "清", "meaning": "clear" },
          { "hanzi": "海", "pinyin": "hǎi", "definition": "sea", "breakdown": "氵 + 每", "parts": ["氵", "每"], "result": "海", "meaning": "sea" },
          { "hanzi": "洗", "pinyin": "xǐ", "definition": "wash", "breakdown": "氵 + 先", "parts": ["氵", "先"], "result": "洗", "meaning": "wash" }
        ]
      }
    ]
  },
  {
    "id": "cpg3",
    "title": "Block 3: Speech & Mind",
    "titleZh": "第三組：言與心",
    "subtitle": "Words and thoughts.",
    "icon": "🧠",
    "color": "#9b59b6",
    "lessons": [
      {
        "id": "cpg3-l1",
        "radical": "言",
        "radical_pinyin": "yán",
        "radical_meaning": "speech",
        "stroke_count": 7,
        "variant_forms": [],
        "mnemonic": "Words from mouth.",
        "compounds": [
          { "hanzi": "請", "pinyin": "qǐng", "definition": "please", "breakdown": "言 + 青", "parts": ["言", "青"], "result": "請", "meaning": "please" },
          { "hanzi": "說", "pinyin": "shuō", "definition": "speak", "breakdown": "言 + 兌", "parts": ["言", "兌"], "result": "說", "meaning": "speak" },
          { "hanzi": "話", "pinyin": "huà", "definition": "word", "breakdown": "言 + 舌", "parts": ["言", "舌"], "result": "話", "meaning": "word" }
        ]
      }
    ]
  }
];
fs.writeFileSync('data/char_playground_content.json', JSON.stringify(charPgData, null, 2));

// 3. Update Library & Vocab
const charsAll = JSON.parse(fs.readFileSync('data/characters_all.json', 'utf8'));
const vocabAll = JSON.parse(fs.readFileSync('data/vocabulary.json', 'utf8'));

// We ensure some words exist
const newWords = ["計程車", "密碼", "牛肉麵", "租金", "臭豆腐"];
newWords.forEach(w => {
  let found = false;
  vocabAll.sets.forEach(s => { if(s.words && s.words.find(v => v.word === w)) found = true; });
  if(!found) {
    if(vocabAll.sets[0]) vocabAll.sets[0].words.push({ word: w, pinyin: "...", definition: "Added from Playground" });
  }
});
fs.writeFileSync('data/vocabulary.json', JSON.stringify(vocabAll, null, 2));

console.log("Data generated successfully.");
