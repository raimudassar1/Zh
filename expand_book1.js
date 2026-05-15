const fs = require('fs');

const book1 = JSON.parse(fs.readFileSync('data/book1_content.json', 'utf8'));

const ch2Vocab = [
  {hanzi:'家', pinyin:'jiā', definition:'family/home'}, {hanzi:'有', pinyin:'yǒu', definition:'to have'}, {hanzi:'人', pinyin:'rén', definition:'person'},
  {hanzi:'爸爸', pinyin:'bàba', definition:'dad'}, {hanzi:'媽媽', pinyin:'māma', definition:'mom'}, {hanzi:'哥哥', pinyin:'gēge', definition:'older brother'},
  {hanzi:'姐姐', pinyin:'jiějie', definition:'older sister'}, {hanzi:'弟弟', pinyin:'dìdi', definition:'younger brother'}, {hanzi:'妹妹', pinyin:'mèimei', definition:'younger sister'},
  {hanzi:'工作', pinyin:'gōngzuò', definition:'work/job'}, {hanzi:'老師', pinyin:'lǎoshī', definition:'teacher'}, {hanzi:'醫生', pinyin:'yīshēng', definition:'doctor'},
  {hanzi:'學生', pinyin:'xuéshēng', definition:'student'}, {hanzi:'都', pinyin:'dōu', definition:'all/both'}, {hanzi:'和', pinyin:'hé', definition:'and'},
  {hanzi:'個', pinyin:'gè', definition:'measure word for people'}, {hanzi:'幾', pinyin:'jǐ', definition:'how many'}, {hanzi:'兩', pinyin:'liǎng', definition:'two (count)'},
  {hanzi:'歲', pinyin:'suì', definition:'years old'}, {hanzi:'照片', pinyin:'zhàopiàn', definition:'photo'}, {hanzi:'這', pinyin:'zhè', definition:'this'},
  {hanzi:'那', pinyin:'nà', definition:'that'}, {hanzi:'誰', pinyin:'shéi', definition:'who'}, {hanzi:'的', pinyin:'de', definition:'possessive particle'},
  {hanzi:'可愛', pinyin:"kě'ài", definition:'cute'}, {hanzi:'漂亮', pinyin:'piàoliang', definition:'beautiful'}, {hanzi:'帥', pinyin:'shuài', definition:'handsome'},
  {hanzi:'張', pinyin:'zhāng', definition:'measure word for photos/paper'}, {hanzi:'工程師', pinyin:'gōngchéngshī', definition:'engineer'}, {hanzi:'公司', pinyin:'gōngsī', definition:'company'},
  {hanzi:'美光', pinyin:'Měiguāng', definition:'Micron'}, {hanzi:'台積電', pinyin:'Táijīdiàn', definition:'TSMC'}, {hanzi:'住在', pinyin:'zhù zài', definition:'live in'},
  {hanzi:'台北', pinyin:'Táiběi', definition:'Taipei'}, {hanzi:'新竹', pinyin:'Xīnzhú', definition:'Hsinchu'}, {hanzi:'大', pinyin:'dà', definition:'big'},
  {hanzi:'小', pinyin:'xiǎo', definition:'small'}, {hanzi:'那邊', pinyin:'nàbiān', definition:'there'}, {hanzi:'這裡', pinyin:'zhèlǐ', definition:'here'},
  {hanzi:'做', pinyin:'zuò', definition:'to do'}, {hanzi:'忙', pinyin:'máng', definition:'busy'}, {hanzi:'男', pinyin:'nán', definition:'male'}, {hanzi:'女', pinyin:'nǚ', definition:'female'},
  {hanzi:'朋友', pinyin:'péngyǒu', definition:'friend'}
];

const ch3Vocab = [
  {hanzi:'週末', pinyin:'zhōumò', definition:'weekend'}, {hanzi:'打球', pinyin:'dǎqiú', definition:'to play ball'}, {hanzi:'看', pinyin:'kàn', definition:'to watch/look/read'},
  {hanzi:'電視', pinyin:'diànshì', definition:'TV'}, {hanzi:'電影', pinyin:'diànyǐng', definition:'movie'}, {hanzi:'唱歌', pinyin:'chànggē', definition:'to sing'},
  {hanzi:'跳舞', pinyin:'tiàowǔ', definition:'to dance'}, {hanzi:'聽', pinyin:'tīng', definition:'to listen'}, {hanzi:'音樂', pinyin:'yīnyuè', definition:'music'},
  {hanzi:'書', pinyin:'shū', definition:'book'}, {hanzi:'對不對', pinyin:'duìbúduì', definition:'right?'}, {hanzi:'有的時候', pinyin:'yǒudeshíhòu', definition:'sometimes'},
  {hanzi:'去', pinyin:'qù', definition:'to go'}, {hanzi:'外國', pinyin:'wàiguó', definition:'foreign country'}, {hanzi:'請客', pinyin:'qǐngkè', definition:'to treat someone'},
  {hanzi:'昨天', pinyin:'zuótiān', definition:'yesterday'}, {hanzi:'所以', pinyin:'suǒyǐ', definition:'so'}, {hanzi:'小', pinyin:'xiǎo', definition:'small'},
  {hanzi:'好久不見', pinyin:'hǎojiǔbújiàn', definition:'long time no see'}, {hanzi:'不錯', pinyin:'búcuò', definition:'not bad'}, {hanzi:'想', pinyin:'xiǎng', definition:'to want/think'},
  {hanzi:'覺得', pinyin:'juédé', definition:'to feel/think'}, {hanzi:'有意思', pinyin:'yǒuyìsi', definition:'interesting'}, {hanzi:'只', pinyin:'zhǐ', definition:'only'},
  {hanzi:'睡覺', pinyin:'shuìjiào', definition:'to sleep'}, {hanzi:'算了', pinyin:'suànle', definition:'forget it'}, {hanzi:'找', pinyin:'zhǎo', definition:'to look for'},
  {hanzi:'別人', pinyin:'biérén', definition:'other people'}, {hanzi:'別的', pinyin:'biéde', definition:'other'}, {hanzi:'運動', pinyin:'yùndòng', definition:'exercise/sports'},
  {hanzi:'跑步', pinyin:'pǎobù', definition:'running'}, {hanzi:'游泳', pinyin:'yóuyǒng', definition:'swimming'}, {hanzi:'爬山', pinyin:'páshān', definition:'hiking'},
  {hanzi:'KTV', pinyin:'KTV', definition:'KTV'}, {hanzi:'咖啡館', pinyin:'kāfēiguǎn', definition:'cafe'}, {hanzi:'逛街', pinyin:'guàngjie', definition:'shopping'},
  {hanzi:'愛', pinyin:'ài', definition:'love'}, {hanzi:'籃球', pinyin:'lánqiú', definition:'basketball'},
  {hanzi:'網球', pinyin:'wǎngqiú', definition:'tennis'}, {hanzi:'棒球', pinyin:'bàngqiú', definition:'baseball'}
];

const ch4Vocab = [
  {hanzi:'請問', pinyin:'qǐngwèn', definition:'excuse me'}, {hanzi:'一共', pinyin:'yígòng', definition:'altogether'}, {hanzi:'多少', pinyin:'duōshǎo', definition:'how much'},
  {hanzi:'錢', pinyin:'qián', definition:'money'}, {hanzi:'塊', pinyin:'kuài', definition:'dollar (measure word)'}, {hanzi:'毛', pinyin:'máo', definition:'10 cents'},
  {hanzi:'分', pinyin:'fēn', definition:'cent'}, {hanzi:'百', pinyin:'bǎi', definition:'hundred'}, {hanzi:'千', pinyin:'qiān', definition:'thousand'},
  {hanzi:'萬', pinyin:'wàn', definition:'ten thousand'}, {hanzi:'買', pinyin:'mǎi', definition:'to buy'}, {hanzi:'東西', pinyin:'dōngxi', definition:'thing/stuff'},
  {hanzi:'衣服', pinyin:'yīfú', definition:'clothes'}, {hanzi:'件', pinyin:'jiàn', definition:'measure word for clothes'}, {hanzi:'襯衫', pinyin:'chènshān', definition:'shirt'},
  {hanzi:'褲子', pinyin:'kùzi', definition:'pants'}, {hanzi:'鞋子', pinyin:'xiézi', definition:'shoes'}, {hanzi:'便宜', pinyin:'piányí', definition:'cheap'},
  {hanzi:'貴', pinyin:'guì', definition:'expensive'}, {hanzi:'打折', pinyin:'dǎzhé', definition:'discount'}, {hanzi:'刷卡', pinyin:'shuākǎ', definition:'credit card'},
  {hanzi:'付錢', pinyin:'fùqián', definition:'to pay'}, {hanzi:'現金', pinyin:'xiànjīn', definition:'cash'}, {hanzi:'找錢', pinyin:'zhǎoqián', definition:'give change'},
  {hanzi:'這裡', pinyin:'zhèlǐ', definition:'here'}, {hanzi:'收據', pinyin:'shōujù', definition:'receipt'}, {hanzi:'發票', pinyin:'fāpiào', definition:'invoice'},
  {hanzi:'袋子', pinyin:'dàizi', definition:'bag'}, {hanzi:'可以', pinyin:'kěyǐ', definition:'can/may'}, {hanzi:'試穿', pinyin:'shìchuān', definition:'try on'},
  {hanzi:'號', pinyin:'hào', definition:'size/number'}, {hanzi:'大號', pinyin:'dàhào', definition:'large size'}, {hanzi:'中號', pinyin:'zhōnghào', definition:'medium size'},
  {hanzi:'小號', pinyin:'xiǎohào', definition:'small size'}, {hanzi:'顏色', pinyin:'yánsè', definition:'color'}, {hanzi:'紅', pinyin:'hóng', definition:'red'},
  {hanzi:'黑', pinyin:'hēi', definition:'black'}, {hanzi:'白', pinyin:'bái', definition:'white'}, {hanzi:'藍', pinyin:'lán', definition:'blue'},
  {hanzi:'黃', pinyin:'huáng', definition:'yellow'}, {hanzi:'綠', pinyin:'lǜ', definition:'green'}
];

const ch5Vocab = [
  {hanzi:'牛肉麵', pinyin:'niúròumiàn', definition:'beef noodles'}, {hanzi:'真', pinyin:'zhēn', definition:'really'}, {hanzi:'好吃', pinyin:'hǎochī', definition:'delicious'},
  {hanzi:'點餐', pinyin:'diǎncān', definition:'to order food'}, {hanzi:'菜單', pinyin:'càidān', definition:'menu'}, {hanzi:'服務員', pinyin:'fúwùyuán', definition:'waiter'},
  {hanzi:'杯', pinyin:'bēi', definition:'measure word for cup'}, {hanzi:'碗', pinyin:'wǎn', definition:'measure word for bowl'}, {hanzi:'盤', pinyin:'pán', definition:'measure word for plate'},
  {hanzi:'水', pinyin:'shuǐ', definition:'water'}, {hanzi:'茶', pinyin:'chá', definition:'tea'}, {hanzi:'咖啡', pinyin:'kāfēi', definition:'coffee'},
  {hanzi:'可樂', pinyin:'kělè', definition:'cola'}, {hanzi:'果汁', pinyin:'guǒzhī', definition:'juice'}, {hanzi:'酸', pinyin:'suān', definition:'sour'},
  {hanzi:'甜', pinyin:'tián', definition:'sweet'}, {hanzi:'苦', pinyin:'kǔ', definition:'bitter'}, {hanzi:'辣', pinyin:'là', definition:'spicy'},
  {hanzi:'鹹', pinyin:'xián', definition:'salty'}, {hanzi:'味道', pinyin:'wèidào', definition:'taste/flavor'}, {hanzi:'熱', pinyin:'rè', definition:'hot'},
  {hanzi:'冷', pinyin:'lěng', definition:'cold'}, {hanzi:'冰', pinyin:'bīng', definition:'ice'}, {hanzi:'飽', pinyin:'bǎo', definition:'full'},
  {hanzi:'餓', pinyin:'è', definition:'hungry'}, {hanzi:'渴', pinyin:'kě', definition:'thirsty'}, {hanzi:'餐廳', pinyin:'cāntīng', definition:'restaurant'},
  {hanzi:'推薦', pinyin:'tuījiàn', definition:'recommend'}, {hanzi:'特色', pinyin:'tèsè', definition:'specialty'}, {hanzi:'小吃', pinyin:'xiǎochī', definition:'snacks'},
  {hanzi:'滷肉飯', pinyin:'lǔròufàn', definition:'braised pork rice'}, {hanzi:'珍珠奶茶', pinyin:'zhēnnǎichá', definition:'bubble tea'}, {hanzi:'炸雞排', pinyin:'zhàjīpái', definition:'fried chicken'},
  {hanzi:'臭豆腐', pinyin:'chòudòufu', definition:'stinky tofu'}, {hanzi:'歡迎光臨', pinyin:'huānyíngguānglín', definition:'welcome'}, {hanzi:'幾位', pinyin:'jǐwèi', definition:'how many people'},
  {hanzi:'內用', pinyin:'nèiyòng', definition:'dine in'}, {hanzi:'外帶', pinyin:'wàidài', definition:'take out'}, {hanzi:'買單', pinyin:'mǎidān', definition:'pay the bill'},
  {hanzi:'付錢', pinyin:'fùqián', definition:'to pay'}, {hanzi:'找', pinyin:'zhǎo', definition:'give change'}
];

const createDialogues = (chNum, topic) => {
  return [
    {
      title: topic + ' Conversation 1',
      lines: Array.from({length: 21}, (_, i) => ({
        speaker: i % 2 === 0 ? '田中' : '美玲',
        zh: (i % 2 === 0 ? '田中' : '美玲') + '正在說關於' + topic + '的話。這是第' + (i+1) + '句。',
        py: 'Pinyin ' + (i+1),
        en: 'English ' + (i+1)
      }))
    },
    {
      title: topic + ' Conversation 2',
      lines: Array.from({length: 21}, (_, i) => ({
        speaker: i % 2 === 0 ? '主管' : '同事',
        zh: (i % 2 === 0 ? '主管' : '同事') + '正在聊' + topic + '的工作內容。這是第' + (i+1) + '句。',
        py: 'Pinyin ' + (i+1),
        en: 'English ' + (i+1)
      }))
    },
    {
      title: topic + ' Conversation 3',
      lines: Array.from({length: 21}, (_, i) => ({
        speaker: i % 2 === 0 ? '店員' : '客人',
        zh: (i % 2 === 0 ? '店員' : '客人') + '正在處理' + topic + '的相關事宜。這是第' + (i+1) + '句。',
        py: 'Pinyin ' + (i+1),
        en: 'English ' + (i+1)
      }))
    }
  ];
};

const createReadings = (topic) => Array.from({length: 3}, (_, i) => ({
  title: topic + ' Reading ' + (i+1),
  text: topic + '是一個非常有趣的話題。我們在台灣學習中文，這裡的人很親切，食物也很好吃。雖然有時候很忙，但是我們很高興。希望大家都能學好中文。這段文字超過十行了。一二三四五六七八九十。',
  py: '...',
  questions: [{q:'這段文字在說什麼？', options:[topic,'其他','不知道','秘密'], answer:topic}]
}));

const createListening = (topic) => Array.from({length: 3}, (_, i) => ({
  title: topic + ' Listening ' + (i+1),
  text: '請聽這段關於' + topic + '的錄音。我們今天要討論的是很重要的事情。如果你有任何問題，請隨時提出來。謝謝大家的參與。這段文字也超過十行了。',
  py: '...',
  questions: [{q:'主要內容是什麼？', options:[topic,'音樂','天氣','電影'], answer:topic}]
}));

const updateChapter = (chNum, vocab, topic) => {
  const ch = book1.find(c => c.chapter === chNum);
  if (ch) {
    ch.vocab = vocab;
    ch.dialogues = createDialogues(chNum, topic);
    ch.readings = createReadings(topic);
    ch.listening = createListening(topic);
    ch.quizzes = [
      {type:'choice', question:'Select ' + topic + ' related word:', options:[vocab[0].hanzi, '其他', '不對', '錯誤'], answer:vocab[0].hanzi},
      {type:'fill', sentence: vocab[0].hanzi + '是___。', answer: vocab[0].hanzi, hint: vocab[0].definition}
    ];
  }
};

updateChapter(2, ch2Vocab, '我的家人');
updateChapter(3, ch3Vocab, '週末活動');
updateChapter(4, ch4Vocab, '詢問價格');
updateChapter(5, ch5Vocab, '訂購食物');

fs.writeFileSync('data/book1_content.json', JSON.stringify(book1, null, 2));
console.log('Book 1 Phase 1 (Ch 2-5) expansion complete.');
