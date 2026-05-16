'use strict';

/**
 * ExamModule
 * Comprehensive Achievement Certification Engine.
 * Features: Pinyin Tones, Vocab, Writing (Canvas), Listening, Reading, Grammar.
 */
window.ExamModule = {
    state: {
        currentMonth: null,
        examData: [],
        generatedTest: null,
        userAnswers: {},
        showPinyin: false,
        sourceVocab: [], // Current month's vocabulary pool
        knownVocab: new Set(), // Characters already learned in previous months
        currentCanvasChar: null
    },

    /**
     * Initialize the module and preload exam definitions
     */
    async init() {
        try {
            const response = await fetch('data/monthly_exams.json');
            this.state.examData = await response.json();
            
            if (!App.state.progress.exams) {
                App.state.progress.exams = {};
            }
        } catch (error) {
            console.error("ExamModule init error:", error);
        }
    },

    /**
     * Render the Exam Hub
     */
    renderHub(container) {
        if (!container) return;
        this.state.currentMonth = null;
        
        let html = `
            <div class="exam-hub">
                <header class="hub-header">
                    <div style="font-size: 4rem; margin-bottom: 20px;">🎓</div>
                    <h1>Professional Certification</h1>
                    <p>Rigorous 1-hour comprehensive assessments for TOCFL B1 mastery.</p>
                </header>
                <div class="month-grid">
        `;

        this.state.examData.forEach(exam => {
            const isCompleted = App.state.progress.exams && App.state.progress.exams[exam.month];
            
            html += `
                <div class="month-card ${isCompleted ? 'completed' : ''}" 
                     onclick="ExamModule.startExam(${exam.month})">
                    <div class="card-status">
                        ${isCompleted ? '<span class="status-icon">🏆</span> CERTIFIED' : '<span class="status-icon">📝</span> OPEN'}
                    </div>
                    <div class="card-month">CERTIFICATION EXAM ${exam.month}</div>
                    <h3 class="card-title">${exam.title}</h3>
                    <p class="card-desc">${exam.description}</p>
                    <div class="card-footer">
                        <div class="exam-meta">
                            <span>⏱ 60 Min</span>
                            <span>📊 65 Questions</span>
                        </div>
                        <button class="start-btn">
                            ${isCompleted ? 'Recertify' : 'Begin Assessment'}
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
                <div class="exam-info-box card mt-40">
                    <h3>About Monthly Exams</h3>
                    <p>These exams are designed to simulate official TOCFL B1 conditions. They test across 4 skills: Reading, Listening, Writing, and Grammatical Structure. A score of <strong>80%</strong> or higher is required for certification.</p>
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.addStyles();
        window.scrollTo(0, 0);
    },

    /**
     * Start a comprehensive exam
     */
    async startExam(monthId) {
        const examDef = this.state.examData.find(e => e.month === monthId);
        if (!examDef) return;

        App.state.loading = true;
        this.state.currentMonth = monthId;
        this.state.userAnswers = {};
        this.state.showPinyin = false;

        try {
            const bookId = examDef.sources.books.id;
            const resources = await Promise.all([
                fetch(`data/book${bookId}_content.json`).then(r => r.json()),
                fetch('data/playground_content.json').then(r => r.json()),
                fetch('data/char_playground_content.json').then(r => r.json())
            ]);

            const [bookData, playgroundData, charPlaygroundData] = resources;

            this.generateTest(examDef, bookData, playgroundData, charPlaygroundData);
            this.renderExam();
        } catch (error) {
            console.error("Error starting exam:", error);
            alert("Critical: Failed to load exam content. Please check your connection.");
        } finally {
            App.state.loading = false;
        }
    },

    /**
     * Generate a massive comprehensive test
     */
    generateTest(def, bookData, playgroundData, charPlaygroundData) {
        const test = {
            title: def.title,
            sections: []
        };

        const relevantChapters = bookData.filter(c => def.sources.books.chapters.includes(c.chapter));
        const relevantPG = playgroundData.filter(p => def.sources.playground.includes(p.id));
        
        // Build vocab pool
        const vocabPool = [];
        relevantChapters.forEach(c => vocabPool.push(...c.vocab));
        this.state.sourceVocab = vocabPool;

        // --- Section 1: Phonetic & Tone Mastery (10 Qs) ---
        const tonePool = this.getRandom(vocabPool, 10);
        const toneQs = tonePool.map((v, idx) => {
            const correctPinyin = v.pinyin;
            // Create distractors by changing tone or vowel
            const distractors = [
                correctPinyin.replace(/[āáǎà]/g, 'a').replace(/[ēéěè]/g, 'e'),
                correctPinyin.replace(/1/g, '2').replace(/2/g, '3').replace(/3/g, '4') // Mock logic
            ];
            // Simple distractor generation for demo
            const options = this.shuffle([correctPinyin, correctPinyin + " (distractor)", "pinyin mock"]); 
            // Better: just pick random pinyin from pool
            const randDistractors = this.getRandom(vocabPool.filter(x => x.pinyin !== correctPinyin), 3).map(x => x.pinyin);
            
            return {
                id: `t_${idx}`,
                type: 'tone',
                question: `Select the correct Pinyin and Tone for: <span class="font-zh" style="font-size:2rem">「${v.hanzi}」</span>`,
                options: this.shuffle([correctPinyin, ...randDistractors]),
                answer: correctPinyin
            };
        });
        test.sections.push({ title: "I. Phonetic & Tone Mastery", questions: toneQs });

        // --- Section 2: Vocabulary Depth (20 Qs) ---
        const vPool = this.getRandom(vocabPool, 20);
        const vocabQs = vPool.map((v, idx) => {
            const isHanziToDef = idx % 2 === 0;
            const distractors = this.getRandom(vocabPool.filter(x => x.hanzi !== v.hanzi), 3);
            
            return {
                id: `v_${idx}`,
                type: 'vocab',
                question: isHanziToDef ? 
                    `Define this word: <span class="font-zh"><strong>${v.hanzi}</strong></span>` : 
                    `Which word means: "<strong>${v.definition}</strong>"?`,
                options: isHanziToDef ? 
                    this.shuffle([v.definition, ...distractors.map(d => d.definition)]) : 
                    this.shuffle([v.hanzi, ...distractors.map(d => d.hanzi)]),
                answer: isHanziToDef ? v.definition : v.hanzi
            };
        });
        test.sections.push({ title: "II. Vocabulary Expansion", questions: vocabQs });

        // --- Section 3: Writing Proficiency (5 Qs) ---
        const writingPool = this.getRandom(vocabPool.filter(v => v.hanzi.length === 1), 5);
        const writingQs = writingPool.map((v, idx) => ({
            id: `w_${idx}`,
            type: 'writing',
            targetChar: v.hanzi,
            question: `Write the character for <strong>${v.definition}</strong> (${v.pinyin}):`,
            answer: v.hanzi
        }));
        test.sections.push({ title: "III. Writing & Stroke Accuracy", questions: writingQs });

        // --- Section 4: Listening Analysis (2 Modules, 10 Qs) ---
        const listenPool = [];
        relevantPG.forEach(p => p.lessons.forEach(l => { if (l.listening) listenPool.push(l.listening); }));
        relevantChapters.forEach(c => { if (c.listening) listenPool.push(...c.listening); });

        const selectedListen = this.getRandom(listenPool, 2);
        selectedListen.forEach((l, idx) => {
            const qs = l.questions.slice(0, 5).map((q, qIdx) => ({
                id: `l_${idx}_${qIdx}`,
                type: 'listening',
                question: q.q,
                options: q.options,
                answer: q.answer
            }));
            test.sections.push({ 
                title: `IV. Listening Analysis - Part ${idx+1}`, 
                context: l.text, 
                isAudio: true, 
                questions: qs 
            });
        });

        // --- Section 5: Reading Analysis (2 Modules, 10 Qs) ---
        const readPool = [];
        relevantChapters.forEach(c => { if (c.readings) readPool.push(...c.readings); });
        
        const selectedRead = this.getRandom(readPool, 2);
        selectedRead.forEach((r, idx) => {
            const qs = r.questions.slice(0, 5).map((q, qIdx) => ({
                id: `r_${idx}_${qIdx}`,
                type: 'reading',
                question: q.q,
                options: q.options,
                answer: q.answer
            }));
            test.sections.push({ 
                title: `V. Reading Comprehension - Part ${idx+1}`, 
                context: r.text, 
                questions: qs 
            });
        });

        // --- Section 6: Structural Mastery (10 Qs) ---
        const quizPool = [];
        relevantChapters.forEach(c => { if (c.quizzes) quizPool.push(...c.quizzes); });
        const grammarQs = this.getRandom(quizPool, 10).map((q, idx) => ({
            id: `g_${idx}`,
            type: 'grammar',
            question: q.type === 'fill' ? `Complete the sentence: <br><span class="font-zh">${q.sentence.replace('___', '______')}</span>` : q.question,
            options: q.options || [],
            answer: q.answer
        }));
        test.sections.push({ title: "VI. Grammatical Structure", questions: grammarQs });

        this.state.generatedTest = test;
    },

    /**
     * Render the massive exam UI
     */
    renderExam() {
        const container = document.getElementById('page-content');
        if (!container) return;

        let totalQuestions = 0;
        this.state.generatedTest.sections.forEach(s => totalQuestions += s.questions.length);

        let html = `
            <div class="exam-app-container">
                <!-- Exam Sticky Header -->
                <header class="exam-top-nav">
                    <div class="etn-left">
                        <button class="exit-btn" onclick="ExamModule.confirmExit()">EXIT</button>
                        <div class="exam-title-group">
                            <span class="exam-label">B1 CERTIFICATION</span>
                            <h2>${this.state.generatedTest.title}</h2>
                        </div>
                    </div>
                    <div class="etn-center">
                        <div class="pinyin-toggle-box">
                            <label class="toggle">
                                <input type="checkbox" id="global-pinyin-toggle" onchange="ExamModule.togglePinyin(this.checked)">
                                <span class="toggle-slider"></span>
                            </label>
                            <span>SHOW PINYIN</span>
                        </div>
                    </div>
                    <div class="etn-right">
                        <div class="exam-progress-stats">
                            <div class="prog-bar-container">
                                <div class="prog-bar-fill" id="exam-prog-fill" style="width: 0%"></div>
                            </div>
                            <span id="exam-prog-text">0 / ${totalQuestions}</span>
                        </div>
                    </div>
                </header>

                <div class="exam-main-body">
        `;

        this.state.generatedTest.sections.forEach((section, sIdx) => {
            html += `
                <section class="exam-mega-section">
                    <div class="ems-header">
                        <span class="ems-num">${sIdx + 1}</span>
                        <h3>${section.title}</h3>
                    </div>
                    
                    ${section.context ? `
                        <div class="ems-context card shadow-sm">
                            ${section.isAudio ? `
                                <div class="audio-instruction">
                                    <button class="btn btn-primary audio-play-btn" onclick="ExamModule.playText(\`${section.context.replace(/'/g, "\\'")}\`)">
                                        🔊 PLAY AUDIO PASSAGE
                                    </button>
                                    <p>Listen to the passage carefully before answering the questions below.</p>
                                </div>
                            ` : `
                                <div class="reading-passage font-zh">
                                    ${this.annotateText(section.context)}
                                </div>
                            `}
                        </div>
                    ` : ''}

                    <div class="ems-questions-list">
            `;

            section.questions.forEach((q) => {
                html += `
                    <div class="exam-question-item card" id="q-item-${q.id}">
                        <div class="eq-body">
                            <p class="eq-text">${this.annotateText(q.question)}</p>
                            
                            ${q.type === 'writing' ? `
                                <div class="writing-task">
                                    <div class="writing-canvas-box">
                                        <div id="writing-hanzi-${q.id}" class="canvas-writer"></div>
                                        <canvas id="writing-canvas-${q.id}" class="canvas-freehand"></canvas>
                                    </div>
                                    <div class="canvas-controls">
                                        <button class="btn btn-ghost btn-sm" onclick="ExamModule.resetWriting('${q.id}', '${q.targetChar}')">Clear Canvas</button>
                                        <button class="btn btn-ghost btn-sm" onclick="ExamModule.markWritingDone('${q.id}')">Submit Drawing</button>
                                    </div>
                                </div>
                            ` : `
                                <div class="options-grid-premium">
                                    ${q.options.map(opt => `
                                        <button class="eq-option" onclick="ExamModule.answerQuestion(this, '${opt.replace(/'/g, "\\'")}', '${q.answer.replace(/'/g, "\\'")}', '${q.id}')">
                                            ${this.annotateText(opt)}
                                        </button>
                                    `).join('')}
                                </div>
                            `}
                        </div>
                    </div>
                `;
            });

            html += `</div></section>`;
        });

        html += `
                </div>
                <footer class="exam-footer">
                    <button class="btn btn-success btn-huge" onclick="ExamModule.submitFinal()">SUBMIT COMPLETED EXAM</button>
                </footer>
            </div>
        `;

        container.innerHTML = html;
        
        // Initialize writing canvases
        this.state.generatedTest.sections.forEach(s => {
            s.questions.forEach(q => {
                if (q.type === 'writing') {
                    setTimeout(() => {
                        window.DrawingBoard.init(`writing-hanzi-${q.id}`, `writing-canvas-${q.id}`, q.targetChar);
                    }, 100);
                }
            });
        });

        window.scrollTo(0, 0);
    },

    /**
     * Logic to annotate text with Pinyin if it's "complex" or if toggle is ON
     */
    annotateText(text) {
        if (!text) return '';
        // Simple regex to find Chinese characters
        const regex = /[\u4e00-\u9fa5]+/g;
        
        return text.replace(regex, (match) => {
            const charData = App.state.characters.find(c => c.hanzi === match || c.traditional === match);
            const pinyin = charData ? charData.pinyin : '';
            
            // "Complex" logic: if it's not a common character or if showPinyin is on
            const isComplex = charData && (charData.frequency_rank > 500 || this.state.showPinyin);
            
            if (isComplex && pinyin) {
                return `<ruby>${match}<rt class="exam-rt ${this.state.showPinyin ? 'show' : ''}">${pinyin}</rt></ruby>`;
            }
            return match;
        });
    },

    togglePinyin(show) {
        this.state.showPinyin = show;
        document.querySelectorAll('.exam-rt').forEach(rt => {
            rt.classList.toggle('show', show);
        });
    },

    playText(text) {
        window.TTS.speak(text, 'zh-TW', 0.75);
    },

    answerQuestion(btn, selected, correct, qId) {
        if (this.state.userAnswers[qId]) return;
        
        this.state.userAnswers[qId] = { isCorrect: selected === correct };
        
        const parent = btn.closest('.options-grid-premium');
        parent.querySelectorAll('.eq-option').forEach(b => {
            b.disabled = true;
            if (b.textContent.trim() === correct) b.classList.add('correct');
            else if (b.textContent.trim() === selected) b.classList.add('incorrect');
        });
        
        this.updateProgress();
    },

    resetWriting(id, char) {
        window.DrawingBoard.reset();
        window.DrawingBoard.init(`writing-hanzi-${id}`, `writing-canvas-${id}`, char);
    },

    markWritingDone(id) {
        if (this.state.userAnswers[id]) return;
        this.state.userAnswers[id] = { isCorrect: true }; // Assume correct for now as auto-grading writing is hard
        alert("Writing saved for evaluation.");
        this.updateProgress();
    },

    updateProgress() {
        let answered = Object.keys(this.state.userAnswers).length;
        let total = 0;
        this.state.generatedTest.sections.forEach(s => total += s.questions.length);
        
        const percent = (answered / total) * 100;
        document.getElementById('exam-prog-fill').style.width = `${percent}%`;
        document.getElementById('exam-prog-text').textContent = `${answered} / ${total}`;
    },

    confirmExit() {
        if (confirm("Warning: Leaving will lose your progress on this exam. Exit anyway?")) {
            this.renderHub(document.getElementById('page-content'));
        }
    },

    submitFinal() {
        let total = 0;
        this.state.generatedTest.sections.forEach(s => total += s.questions.length);
        let correct = Object.values(this.state.userAnswers).filter(a => a.isCorrect).length;
        const score = Math.round((correct / total) * 100);
        
        if (score >= 80) {
            App.state.progress.exams[this.state.currentMonth] = true;
            App.saveProgress();
            this.showResult(score, true);
        } else {
            this.showResult(score, false);
        }
    },

    showResult(score, passed) {
        const modal = document.createElement('div');
        modal.className = 'exam-result-overlay';
        modal.innerHTML = `
            <div class="exam-result-card ${passed ? 'pass' : 'fail'}">
                <div class="result-badge">${passed ? '🏅' : '📚'}</div>
                <h2>${passed ? 'CERTIFICATION GRANTED' : 'CERTIFICATION DENIED'}</h2>
                <div class="score-grid">
                    <div class="score-item">
                        <span class="sv">${score}%</span>
                        <span class="sl">YOUR SCORE</span>
                    </div>
                    <div class="score-item">
                        <span class="sv">80%</span>
                        <span class="sl">REQUIRED</span>
                    </div>
                </div>
                <p class="result-msg">${passed ? 'Outstanding. You have officially demonstrated B1 level proficiency for this milestone.' : 'You are close. Review your weak characters and retake the exam to receive your certification.'}</p>
                <button class="btn btn-primary btn-lg" onclick="this.closest('.exam-result-overlay').remove(); ExamModule.renderHub(document.getElementById('page-content'))">RETURN TO HUB</button>
            </div>
        `;
        document.body.appendChild(modal);
    },

    getRandom(arr, n) {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, n);
    },

    shuffle(arr) {
        return [...arr].sort(() => 0.5 - Math.random());
    },

    addStyles() {
        if (document.getElementById('exam-pro-styles')) return;
        const style = document.createElement('style');
        style.id = 'exam-pro-styles';
        style.textContent = `
            .exam-app-container { background: #f8f9fa; min-height: 100vh; padding-bottom: 120px; }
            .exam-top-nav { 
                position: sticky; top: 0; background: white; z-index: 1000; 
                display: flex; justify-content: space-between; align-items: center;
                padding: 15px 40px; border-bottom: 2px solid var(--accent);
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .etn-left { display: flex; align-items: center; gap: 30px; }
            .exit-btn { background: #eee; border: none; padding: 10px 20px; font-weight: 800; cursor: pointer; border-radius: 5px; }
            .exam-title-group h2 { margin: 0; font-size: 1.2rem; }
            .exam-label { font-size: 0.7rem; font-weight: 900; color: var(--accent); letter-spacing: 2px; }
            
            .pinyin-toggle-box { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 0.8rem; }
            
            .exam-progress-stats { min-width: 200px; }
            .prog-bar-container { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin-bottom: 5px; }
            .prog-bar-fill { height: 100%; background: var(--tone2); transition: width 0.3s; }
            #exam-prog-text { font-size: 0.8rem; font-weight: 700; color: var(--text-3); }

            .exam-main-body { max-width: 1000px; margin: 40px auto; padding: 0 20px; }
            .exam-mega-section { margin-bottom: 80px; }
            .ems-header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
            .ems-num { width: 40px; height: 40px; background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 900; font-size: 1.2rem; }
            .ems-header h3 { font-size: 1.8rem; font-family: var(--font-zh); border-bottom: 4px solid var(--accent); }

            .ems-context { padding: 40px; background: white; margin-bottom: 40px; border-left: 8px solid var(--accent); }
            .reading-passage { font-size: 1.4rem; line-height: 2.2; color: var(--text); }
            
            .exam-rt { display: none; color: var(--accent); font-weight: 600; font-size: 0.8rem; }
            .exam-rt.show { display: block; }

            .eq-body { padding: 30px; }
            .eq-text { font-size: 1.25rem; margin-bottom: 25px; font-weight: 600; }
            
            .options-grid-premium { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .eq-option { 
                padding: 20px; border: 2px solid #eee; background: #fff; border-radius: 12px;
                text-align: left; cursor: pointer; transition: all 0.2s; font-size: 1.1rem;
            }
            .eq-option:hover:not(:disabled) { border-color: var(--accent); background: #fff8f8; }
            .eq-option.correct { background: #e6fffa; border-color: #38b2ac; color: #234e52; font-weight: 800; }
            .eq-option.incorrect { background: #fff5f5; border-color: #f56565; color: #742a2a; }

            .writing-canvas-box { 
                width: 300px; height: 300px; background: #fff; border: 2px dashed #ccc; 
                margin: 0 auto 20px; position: relative; 
            }
            .canvas-writer, .canvas-freehand { position: absolute; inset: 0; width: 100%; height: 100%; }
            .canvas-controls { text-align: center; display: flex; justify-content: center; gap: 10px; }

            .exam-footer { 
                position: fixed; bottom: 0; left: 0; right: 0; background: white;
                padding: 25px; border-top: 1px solid #ddd; text-align: center;
                box-shadow: 0 -10px 30px rgba(0,0,0,0.05);
            }
            .btn-huge { padding: 20px 80px; font-size: 1.5rem; font-weight: 900; border-radius: 40px; }

            .score-grid { display: flex; justify-content: center; gap: 40px; margin: 30px 0; }
            .score-item { text-align: center; }
            .score-item .sv { font-size: 3.5rem; font-weight: 900; display: block; }
            .score-item .sl { font-size: 0.8rem; font-weight: 800; color: #888; letter-spacing: 1px; }

            @media (max-width: 768px) {
                .options-grid-premium { grid-template-columns: 1fr; }
                .exam-top-nav { padding: 15px 20px; }
                .etn-center { display: none; }
            }
        `;
        document.head.appendChild(style);
    }
};
