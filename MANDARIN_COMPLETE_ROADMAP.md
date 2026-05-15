# 🏯 Complete Mandarin Chinese Learning Roadmap
## Absolute Beginner → TOCFL B1 | Goal: Work at Micron / TSMC in Taiwan
### 6-Month Sprint Plan + Full Website Reorganization Guide

---

## 📊 CURRENT WEBSITE AUDIT FINDINGS

### What You Have (Good Foundation)
| Component | Status | Count | Gap |
|---|---|---|---|
| Characters | ✅ Good | 1,443 (Novice→B1) | Missing: components/decomposition field |
| Vocabulary Sets | ✅ Good | 50 sets, 1,400 words | Inconsistent level tags (A2 vs a2) |
| Chapters | ✅ Good | 30 chapters × 30 vocab | Missing: B1 chapters (21-30 are A2) |
| Beginner Playground | ⚠️ Exists | 20 groups × 5 lessons | Content is real but no clear entry point |
| Character Playground | ❌ Missing | `char-playground` route exists in nav | **NO DATA** — no char_playground_content.json |
| Readings | ⚠️ Sparse | 15 texts | Need 40+ graded texts (A1→B1) |
| Dialogues | Unknown | — | Needs full TOCFL-style conversation sets |
| Radicals/Components | ❌ Missing | 0/1,443 chars have components field | Critical for Character Playground |
| Taiwan-specific vocab | ❌ Missing | — | TSMC/Micron/tech/workplace terms |

### Core Problems Identified
1. **No clear START** — user lands on Dashboard with no "Day 1, start here" button
2. **No clear STRUCTURE** — Playground groups (pg1-pg20) don't map to chapter progression
3. **Character Playground has no data** — the JS module (`char-playground` route) loads but has nothing
4. **Level tag inconsistency** — mix of `A2` / `a2` / `B1` / `b1` breaks filtering
5. **No B1 chapters** — only 30 chapters going up to A2
6. **No Taiwan workplace/tech vocabulary** — critical for your TSMC/Micron goal
7. **No component/decomposition data** on characters — needed for Character Playground's "building block" feature

---

## 🗺️ 6-MONTH ROADMAP TO TOCFL B1

### Phase 1: Foundation (Weeks 1–4) — Novice Level
**Daily: 45–60 min | Weekly characters: 40–50**

| Week | Focus | Website Section | Characters | Vocab Sets |
|---|---|---|---|---|
| 1 | Tones + Pinyin mastery | Onboarding (Pinyin & Tones) | — | — |
| 2 | Basic characters 一二三人口 | Character Playground: Radicals Block 1 | 40 | Numbers, pronouns |
| 3 | Greetings + self-intro | Chapter 1, Playground pg2 | 50 | Ch1 greetings |
| 4 | Numbers + time + family | Chapters 2-3, Playground pg1 | 60 | Ch2-3 |

**Milestone:** Recognize 150 characters, say 50 sentences, pass Novice self-test.

---

### Phase 2: Survival Chinese (Weeks 5–10) — TOCFL A1
**Daily: 60 min | Weekly characters: 40–50**

| Week | Focus | Website Section | Cumulative Chars |
|---|---|---|---|
| 5 | Food & ordering | Chapter 4, Dialogue: Restaurant | 200 |
| 6 | Shopping, bargaining | Chapters 5, 17 | 250 |
| 7 | Directions in Taipei MRT | Chapter 6, Reading: MRT announcement | 300 |
| 8 | Time, schedules, weather | Chapters 7-8 | 370 |
| 9 | Health, body, pharmacy | Chapter 10 | 420 |
| 10 | At the bank, post office | Chapter 14, Scenario: banking | 480 |

**Milestone:** Handle real survival situations in Taiwan (ordering, directions, shopping). 480 characters.

---

### Phase 3: Elementary Communication (Weeks 11–18) — TOCFL A2
**Daily: 75 min | Weekly characters: 35–45**

| Week | Focus | Website Section |
|---|---|---|
| 11-12 | Work & career intro | Chapter 13 + new B1 workplace chapter |
| 13-14 | Social media, tech terms | Chapter 19 + Taiwan tech vocabulary |
| 15-16 | Business meeting phrases | Chapter 22 |
| 17-18 | Cultural differences + formal speech | Chapter 23 + reading practice |

**Milestone:** Introduce yourself at a Micron/TSMC job interview in Mandarin. 800 characters.

---

### Phase 4: Independent Use (Weeks 19–26) — TOCFL B1
**Daily: 90 min | Focus: fluency + TOCFL test prep**

| Week | Focus | Website Section |
|---|---|---|
| 19-20 | News & formal reading | Readings: news articles + mock tests |
| 21-22 | Semiconductor/tech vocabulary | New: Tech Workplace module |
| 23-24 | Complex grammar patterns | New: B1 Grammar chapters |
| 25 | TOCFL mock tests | Mock Reading + Mock Listening |
| 26 | Full review + weak spot drilling | SRS review queue |

**Milestone:** TOCFL B1 — hold 10-minute conversations, read workplace emails.

---

## 🧩 CHARACTER PLAYGROUND — Complete Redesign Plan

This is the most critical feature. It must teach characters as **building blocks** — the 214 Kangxi radicals combine into compound characters.

### Structure: 8 Radical Blocks

#### Block 1: The Body Radicals (人口手足目耳)
**Key insight:** These 7 radicals appear in 400+ everyday characters

| Radical | Meaning | Characters it builds |
|---|---|---|
| 人/亻 | person | 你他她們休信保做 |
| 口 | mouth | 吃喝唱叫問回國品 |
| 手/扌 | hand | 打拿找推拉接握 |
| 足/⻊ | foot | 跑跳跟路跌踢 |
| 目 | eye | 看眼睛睡瞧 |
| 耳 | ear | 聽聞 |

Each radical lesson includes:
1. **Radical card** — stroke order, meaning, pronunciation
2. **Recognition drill** — "spot the radical" in 10 compound characters
3. **Build it** — combine radical + phonetic to make words
4. **In the wild** — 5 example sentences from your chapter dialogues

#### Block 2: Nature Radicals (日月水火木土山)
日→明時晴暗 | 月→朋期明 | 水/氵→海河泳洗 | 火/灬→熱燒炒 | 木→樹桌椅 | 土→地坐城 | 山→出

#### Block 3: Motion Radicals (走車行)
走→起超趕 | 車→輛軌 | 行→街術衍

#### Block 4: Mind & Speech (心言)
心/忄→想念恨愛怕快 | 言/訁→說話請謝語

#### Block 5: Numbers & Measure (一二三四五六七八九十百千萬)
Pure recognition — these are also standalone characters.

#### Block 6: Food Radicals (食米禾)
食/飠→飯館飽餓 | 米→粉糕糖 | 禾→種秋科

#### Block 7: Structure Radicals (宀門广)
宀→家室宿安字 | 門→問間開關 | 广→床店庭

#### Block 8: Advanced Compounds
Teach the logic: Phonetic + Semantic = meaning clue + sound clue
Example: 清 = 氵(water) + 青(qīng sound) → clear water

### Character Playground Data File Required
Each lesson needs this JSON structure:
```json
{
  "id": "cpg1",
  "title": "Block 1: Body Radicals",
  "subtitle": "Master the 6 body radicals that build 400+ characters",
  "lessons": [
    {
      "id": "cpg1-l1",
      "radical": "人",
      "radical_pinyin": "rén",
      "radical_meaning": "person / people",
      "stroke_count": 2,
      "variant_forms": ["亻"],
      "mnemonic": "Two legs of a person walking — simple and human.",
      "compounds": [
        {
          "hanzi": "你",
          "pinyin": "nǐ",
          "definition": "you",
          "breakdown": "亻(person) + 尔(phonetic nǐ) = you, a person",
          "example": "你好！"
        }
      ],
      "drills": [
        { "type": "spot_radical", "chars": ["你","吃","他","口","人","休"], "answer": ["你","他","人","休"] },
        { "type": "build_word", "radical": "亻", "phonetic": "尓", "answer": "你" },
        { "type": "meaning_match", "hanzi": "休", "options": ["rest","eat","walk","sleep"], "answer": "rest" }
      ]
    }
  ]
}
```

---

## 📖 BEGINNER PLAYGROUND — Reorganization Plan

### Problem: No Clear Start/End
The 20 playground groups (pg1-pg20) are thematic but not progressive. A beginner doesn't know where to start.

### Solution: Add a Learning Path Overlay

Map playground groups to chapters and levels:

| Stage | Playgrounds | Maps to Chapters | Level |
|---|---|---|---|
| **Start Here** | pg1 (Numbers), pg2 (Identity) | Ch1, Ch2, Ch3 | Novice Week 1-2 |
| **Daily Life** | pg6 (Objects), pg7 (Food), pg8 (Time) | Ch4, Ch7, Ch8 | Novice Week 3-4 |
| **People & Places** | pg3 (Body), pg14 (Travel), pg15 (Directions) | Ch6, Ch10 | A1 |
| **Work & Study** | pg12 (School), pg13 (Work) | Ch13, Ch16 | A1-A2 |
| **Social** | pg19 (Socializing), pg16-17 (Adjectives) | Ch9, Ch11 | A2 |
| **Grammar & Review** | pg18 (Grammar), pg20 (Review) | All | B1 |

### New Field Needed in playground_content.json
```json
{
  "id": "pg1",
  "stage": "start-here",
  "stage_label": "🟢 Start Here — Week 1",
  "recommended_week": 2,
  "prerequisite": null,
  "chapter_link": [1, 2]
}
```

---

## 🏭 TAIWAN WORKPLACE / TECH VOCABULARY MODULE (New)

Critical for your TSMC/Micron goal. Needs to be added as Chapter 31-35:

### Chapter 31: Semiconductor Industry Basics (半導體產業)
| Word | Pinyin | Definition |
|---|---|---|
| 半導體 | bàndǎotǐ | semiconductor |
| 晶圓 | jīngyuán | wafer |
| 製程 | zhìchéng | process node / fabrication process |
| 良率 | liánglǜ | yield rate |
| 工程師 | gōngchéngshī | engineer |
| 廠長 | chǎngzhǎng | plant manager |
| 無塵室 | wúchénshì | cleanroom |
| 輪班 | lúnbān | shift rotation |
| 加班 | jiābān | overtime |
| 安全規定 | ānquán guīdìng | safety regulations |

### Chapter 32: Office & Workplace Communication
Meeting vocab, email phrases, reporting issues, asking for help politely.

### Chapter 33: Daily Life in Taiwan (Hsinchu/Taichung)
Renting near science park, 7-Eleven survival, healthcare (NHI), scooter vocabulary.

### Chapter 34: HR & Contract Chinese
Contract terms, pay slip vocab, vacation requests, performance review.

### Chapter 35: Technical English Loanwords in Mandarin
How Taiwanese engineers mix English + Mandarin: "開meeting", "project的deadline", etc.

---

## 🔧 COMPLETE FILE STRUCTURE CHANGES REQUIRED

```
data/
├── characters_all.json          ← ADD: components[], decomposition string per char
├── vocabulary.json              ← FIX: normalize all levels to lowercase (a1/a2/b1/novice)
├── chapters_content.json        ← ADD: chapters 31-35 (workplace/tech)
├── playground_content.json      ← ADD: stage/prerequisite/chapter_link fields per group
├── char_playground_content.json ← CREATE NEW: 8 radical blocks × 6 lessons each
├── readings.json                ← EXPAND: from 15 → 45 graded readings (A1-B1)
├── dialogues.json               ← EXPAND: add workplace dialogues
├── scenarios_content.json       ← ADD: TSMC onboarding, lab safety, HR office scenarios
└── b1_grammar.json              ← CREATE NEW: B1 grammar patterns with examples
```

---

## 🤖 CLAUDE CODE COMMAND — Auto-Generate All Missing Content

Save this as `generate_content.md` in your project root and run with Claude Code.

---

### COMMAND FOR CLAUDE CODE (copy entire block below)

```
claude --model claude-sonnet-4-20250514 \
  --max-tokens 8192 \
  --system "You are a professional Mandarin Chinese curriculum developer specializing in TOCFL exam preparation and Traditional Chinese characters. You produce valid JSON only, no markdown, no commentary. All Chinese text must use Traditional Chinese characters (繁體字). All pinyin must include tone marks." \
  "$(cat << 'PROMPT'
Read all files in data/ directory of this project. Then perform ALL of the following tasks in sequence:

TASK 1 — Fix level normalization in data/vocabulary.json:
Replace all occurrences of level 'A1' → 'a1', 'A2' → 'a2', 'B1' → 'b1'. Output the complete corrected file.

TASK 2 — Add components field to data/characters_all.json:
For every character in data.[], add a new field:
  "components": ["radical1", "phonetic_component", ...] — list of meaningful component parts
  "decomposition": "radical(meaning) + component(phonetic hint) = character meaning"
  "related_chars": ["char1","char2"] — 3-5 characters that share the same radical
Example: 你 → components: ["亻","尔"], decomposition: "亻(person) + 尔(phonetic nǐ) = you", related_chars: ["他","她","們","休"]
Output the full updated file.

TASK 3 — Create data/char_playground_content.json:
Create 8 radical blocks. Each block has 6 lessons. Each lesson covers one major radical.
Structure per lesson:
{
  "id": "cpg{block}-l{lesson}",
  "radical": "字",
  "radical_pinyin": "...",
  "radical_meaning": "...",
  "stroke_count": N,
  "variant_forms": ["..."],
  "mnemonic": "...",
  "frequency": "appears in X of the top 1000 characters",
  "compounds": [ { "hanzi":"", "pinyin":"", "definition":"", "breakdown":"", "example_sentence":"", "example_pinyin":"" } × 8 items ],
  "drills": [
    { "type": "spot_radical", "instruction": "Tap all characters containing 亻", "chars": [...10 chars...], "answers": [...] },
    { "type": "meaning_match", "hanzi": "X", "options": ["a","b","c","d"], "answer": "a" },
    { "type": "build_recognition", "prompt": "Which character means 'rest'?", "options": ["休","体","作","做"], "answer": "休" },
    { "type": "sentence_fill", "sentence": "___好，我是台灣人。", "options": ["你","吃","走","買"], "answer": "你" }
  ]
}
Blocks to create:
Block 1 (cpg1): 人亻 口 手扌 足⻊ 目 耳
Block 2 (cpg2): 日 月 水氵 火灬 木 土
Block 3 (cpg3): 心忄 言訁 走 車 行 門
Block 4 (cpg4): 食飠 米 禾 田 山 石
Block 5 (cpg5): 宀 广 囗 巾 糸糹 衣衤
Block 6 (cpg6): 金釒 革 竹 虫 魚 鳥
Block 7 (cpg7): Numbers as radicals: 一 二 三 四五六七八九十百千萬
Block 8 (cpg8): Advanced compound logic — semantic+phonetic combos

TASK 4 — Add chapters 31-35 to data/chapters_content.json:
Chapter 31: 半導體職場入門 (Semiconductor Workplace Intro), level: b1
Chapter 32: 辦公室溝通 (Office Communication), level: b1
Chapter 33: 在台灣生活 (Living in Taiwan), level: a2
Chapter 34: 人事與合約 (HR & Contracts), level: b1
Chapter 35: 台式英文借詞 (Taiwanese English Loanwords), level: b1
Each chapter: 30 vocab items with full structure (hanzi, pinyin, definition, example_sentence{sentence,pinyin,english}, example_words[])

TASK 5 — Update data/playground_content.json:
Add these fields to each of the 20 playground groups (pg1-pg20):
  "stage": one of ["start-here", "daily-life", "people-places", "work-study", "social", "grammar-review"]
  "stage_label": human-readable label with emoji
  "recommended_week": integer (1-24)
  "prerequisite": null or "pg{N}"
  "chapter_links": [list of chapter ids this playground reinforces]
  "entry_description": 1 sentence explaining what to do first

TASK 6 — Expand data/readings.json from 15 to 45 texts:
Add 30 new graded reading passages:
- 10 at A1 level: short signs, menus, tickets, product labels (Taiwan context)
- 10 at A2 level: short news summaries, workplace notices, apartment rental ads
- 10 at B1 level: semiconductor news article, TSMC press release summary, science park life
Each reading: { id, title, genre, difficulty, description, text_zh, text_pinyin (interlinear), comprehension_questions: [{q,options,answer}×5], vocabulary_focus: [5 key words] }

TASK 7 — Create data/b1_grammar.json:
30 B1-level grammar patterns, each with:
{ "id": "g{N}", "pattern": "V + 著 + VP", "meaning": "...", "level": "b1",
  "examples": [ {"zh":"", "pinyin":"", "english":""} × 4 ],
  "common_mistakes": "...", "taiwan_usage_note": "..." }

Output each task as a separate clearly labeled JSON file. Start each file with a comment line: // TASK N: filename
PROMPT
)"
```

---

### ALTERNATIVE: GEMINI CLI COMMAND

```bash
gemini -p "$(cat generate_prompt.txt)" \
  --model gemini-2.5-pro \
  --output-format json
```

Where `generate_prompt.txt` contains the same prompt as above.

---

### RECOMMENDED: Run as Claude Code Multi-Step Session

```bash
# Step 1: Install Claude Code if not already installed
npm install -g @anthropic-ai/claude-code

# Step 2: Navigate to your project
cd /path/to/your/github-pages-project

# Step 3: Run the full content generation
claude "Read the existing data/ JSON files to understand the current structure and content quality. Then:

1. Create data/char_playground_content.json with 8 radical blocks × 6 lessons each. 
   Follow the exact JSON schema in MANDARIN_COMPLETE_ROADMAP.md.
   Include: radical, variants, mnemonic, 8 compound characters per lesson with breakdown, 4 drill types.

2. Add missing 'components' and 'decomposition' fields to every entry in data/characters_all.json.

3. Add chapters 31-35 (workplace + Taiwan life) to data/chapters_content.json with 30 vocab items each.

4. Fix level tag inconsistency in data/vocabulary.json (normalize to lowercase).

5. Add stage/progression metadata to data/playground_content.json.

6. Expand data/readings.json from 15 to 45 graded texts (A1 to B1, Taiwan-focused).

7. Create data/b1_grammar.json with 30 grammar patterns.

Use Traditional Chinese characters throughout. Ensure all pinyin has tone marks.
Validate that all JSON is syntactically correct before writing files."
```

---

## 📋 IMPLEMENTATION PRIORITY ORDER

### Week 1 (Critical — Do First)
- [ ] Fix level tag normalization (`A2` → `a2` etc.)
- [ ] Create `data/char_playground_content.json` (Block 1-2 at minimum)
- [ ] Add `stage` + `entry_description` to playground groups
- [ ] Add "Start Here" button on Dashboard pointing to Onboarding → pg1 → Chapter 1

### Week 2 (High Priority)
- [ ] Add `components` + `decomposition` to all 1,443 characters
- [ ] Add chapters 31-35 (workplace vocab)
- [ ] Expand readings to 30 texts

### Week 3 (Enhancement)
- [ ] Create `b1_grammar.json`
- [ ] Add TSMC/semiconductor scenario to scenarios_content.json
- [ ] Add Taiwan life scenario (Hsinchu Science Park area)

### Week 4 (Polish)
- [ ] Connect Character Playground JS to new `char_playground_content.json`
- [ ] Add progress gating: Playground groups unlock sequentially
- [ ] Add "Path complete" celebration screen

---

## 🎯 YOUR PERSONAL STUDY SCHEDULE (Taiwan / Micron / TSMC Track)

```
MONDAY    — Character Playground (30 min) + SRS review (20 min)
TUESDAY   — Chapter study (30 min) + Dialogue practice (20 min)
WEDNESDAY — Beginner Playground drill (30 min) + Reading (20 min)
THURSDAY  — Scenario practice (30 min) + Mock quiz (20 min)
FRIDAY    — Workplace vocab chapter (30 min) + Flashcards (20 min)
SATURDAY  — Full mock test (60 min) + Review weak cards (30 min)
SUNDAY    — Light review (20 min) + Plan next week
```

**Weekly vocab target:** 40-50 new words  
**Weekly character target:** 30-40 new characters  
**6-month total:** ~1,200 characters, ~1,400 words = TOCFL B1 ✅

---

## 🏆 SUCCESS METRICS FOR EACH LEVEL

| Level | Characters | Vocab | Can Do |
|---|---|---|---|
| Novice (now–Month 1) | 300 | 300 | Survive Day 1 in Taiwan |
| A1 (Month 2) | 600 | 600 | Order food, ask directions, shop |
| A2 (Month 3-4) | 1,000 | 1,000 | Have 5-min conversation, read signs |
| B1 (Month 5-6) | 1,443 | 1,400 | Job interview intro, read work emails |

---

*Generated by Claude analysis of your website files. Last updated: May 2026.*
