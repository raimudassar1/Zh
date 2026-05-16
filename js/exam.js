'use strict';

/**
 * ExamModule
 * Handles monthly certification exams with dynamic question generation.
 */
window.ExamModule = {
    state: {
        currentMonth: null,
        examData: [],
        generatedTest: null,
        userAnswers: {}
    },

    /**
     * Initialize the module and preload exam definitions
     */
    async init() {
        try {
            const response = await fetch('data/monthly_exams.json');
            this.state.examData = await response.json();
            
            // Ensure progress object exists
            if (!App.state.progress.exams) {
                App.state.progress.exams = {};
            }
        } catch (error) {
            console.error("ExamModule init error:", error);
        }
    },

    /**
     * Render the Exam Hub (selection grid)
     */
    renderHub(container) {
        if (!container) return;
        this.state.currentMonth = null;
        
        let html = `
            <div class="exam-hub">
                <header class="hub-header">
                    <h1>Monthly Achievement Exams</h1>
                    <p>Demonstrate your mastery and unlock professional certifications.</p>
                </header>
                <div class="month-grid">
        `;

        this.state.examData.forEach(exam => {
            const isCompleted = App.state.progress.exams && App.state.progress.exams[exam.month];
            
            html += `
                <div class="month-card ${isCompleted ? 'completed' : ''}" 
                     onclick="ExamModule.startExam(${exam.month})">
                    <div class="card-status">
                        ${isCompleted ? '<span class="status-icon">✅</span> Passed' : '<span class="status-icon">📖</span> Available'}
                    </div>
                    <div class="card-month">Month ${exam.month}</div>
                    <h3 class="card-title">${exam.title}</h3>
                    <p class="card-desc">${exam.description}</p>
                    <div class="card-footer">
                        <button class="start-btn">
                            ${isCompleted ? 'Retake Exam' : 'Start Exam'}
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.addStyles();
        window.scrollTo(0, 0);
    },

    /**
     * Start an exam for a specific month
     */
    async startExam(monthId) {
        const examDef = this.state.examData.find(e => e.month === monthId);
        if (!examDef) return;

        App.state.loading = true;
        this.state.currentMonth = monthId;
        this.state.userAnswers = {};

        try {
            // Fetch required files dynamically
            const bookId = examDef.sources.books.id;
            const resources = await Promise.all([
                fetch(`data/book${bookId}_content.json`).then(r => r.json()),
                fetch(`data/playground_content.json`).then(r => r.json()),
                fetch(`data/char_playground_content.json`).then(r => r.json())
            ]);

            const [bookData, playgroundData, charPlaygroundData] = resources;

            // Generate the dynamic test
            this.generateTest(examDef, bookData, playgroundData, charPlaygroundData);
            this.renderExam();
        } catch (error) {
            console.error("Error starting exam:", error);
            alert("Failed to load exam data. Please try again.");
        } finally {
            App.state.loading = false;
        }
    },

    /**
     * Compile questions based on the exam definition and sources
     */
    generateTest(def, bookData, playgroundData, charPlaygroundData) {
        const test = {
            title: def.title,
            sections: []
        };

        const relevantChapters = bookData.filter(c => def.sources.books.chapters.includes(c.chapter));
        const relevantPG = playgroundData.filter(p => def.sources.playground.includes(p.id));

        // --- Section 1: Vocabulary (10 Qs) ---
        const allVocab = [];
        relevantChapters.forEach(c => allVocab.push(...c.vocab));
        // Also pull from radical compounds if needed
        if (def.sources.radicals) {
            charPlaygroundData.forEach(block => {
                if (def.sources.radicals.includes(parseInt(block.id.replace('cpg', '')))) {
                    block.lessons.forEach(l => allVocab.push(...l.compounds));
                }
            });
        }

        const selectedVocab = this.getRandom(allVocab, 10);
        const vocabQs = selectedVocab.map((v, idx) => {
            const distractors = this.getRandom(allVocab.filter(x => x.hanzi !== v.hanzi), 3);
            const options = this.shuffle([v.definition, ...distractors.map(d => d.definition)]);
            return {
                id: `v_${idx}`,
                type: 'vocab',
                question: `What is the definition of "<strong>${v.hanzi}</strong>"?`,
                options: options,
                answer: v.definition
            };
        });
        test.sections.push({ title: "Section 1: Vocabulary Mastery", questions: vocabQs });

        // --- Section 2: Reading (1 Q) ---
        const allReadings = [];
        relevantChapters.forEach(c => {
            if (c.readings) allReadings.push(...c.readings);
        });
        const selectedReading = this.getRandom(allReadings, 1)[0];
        if (selectedReading) {
            const readingQs = selectedReading.questions.map((q, idx) => ({
                id: `r_${idx}`,
                type: 'reading',
                question: q.q,
                options: q.options,
                answer: q.answer
            }));
            test.sections.push({ 
                title: "Section 2: Reading Comprehension", 
                context: selectedReading.text,
                questions: readingQs 
            });
        }

        // --- Section 3: Listening (1 Q) ---
        const allListening = [];
        relevantPG.forEach(p => {
            p.lessons.forEach(l => {
                if (l.listening) allListening.push(l.listening);
            });
        });
        // Include book-based listening if available
        relevantChapters.forEach(c => {
            if (c.listening) allListening.push(...c.listening);
        });

        const selectedListening = this.getRandom(allListening, 1)[0];
        if (selectedListening) {
            const listeningQs = selectedListening.questions.map((q, idx) => ({
                id: `l_${idx}`,
                type: 'listening',
                question: q.q,
                options: q.options,
                answer: q.answer
            }));
            test.sections.push({ 
                title: "Section 3: Listening Comprehension", 
                context: selectedListening.text,
                isAudio: true,
                questions: listeningQs 
            });
        }

        // --- Section 4: Grammar (5 Qs) ---
        const allQuizzes = [];
        relevantChapters.forEach(c => {
            if (c.quizzes) allQuizzes.push(...c.quizzes);
        });
        const selectedQuizzes = this.getRandom(allQuizzes, 5);
        const grammarQs = selectedQuizzes.map((q, idx) => ({
            id: `g_${idx}`,
            type: 'grammar',
            question: q.question,
            options: q.options,
            answer: q.answer
        }));
        test.sections.push({ title: "Section 4: Grammar & Structure", questions: grammarQs });

        this.state.generatedTest = test;
    },

    /**
     * Display the compiled test
     */
    renderExam() {
        const container = document.getElementById('page-content');
        if (!container) return;

        let totalQuestions = 0;
        this.state.generatedTest.sections.forEach(s => totalQuestions += s.questions.length);

        let html = `
            <div class="exam-container">
                <header class="exam-header">
                    <button class="back-btn" onclick="ExamModule.renderHub(document.getElementById('page-content'))">← Exit Exam</button>
                    <div class="exam-info">
                        <h2>${this.state.generatedTest.title}</h2>
                        <div class="exam-progress-wrapper">
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" id="exam-progress" style="width: 0%"></div>
                            </div>
                            <span id="progress-text">0 / ${totalQuestions} answered</span>
                        </div>
                    </div>
                </header>
                <div class="exam-body">
        `;

        this.state.generatedTest.sections.forEach((section, sIdx) => {
            html += `
                <section class="exam-section">
                    <h3 class="section-title">${section.title}</h3>
                    ${section.context ? `
                        <div class="section-context">
                            ${section.isAudio ? `
                                <div class="audio-panel">
                                    <button class="btn btn-primary audio-btn" onclick="ExamModule.playText('${section.context.replace(/'/g, "\\'")}')">
                                        <span class="icon">🔊</span> Listen to Audio Clip
                                    </button>
                                    <p class="audio-hint">Click to play the passage. You can listen as many times as needed.</p>
                                </div>
                            ` : `
                                <div class="reading-panel">
                                    <p class="reading-text">${section.context}</p>
                                </div>
                            `}
                        </div>
                    ` : ''}
                    <div class="questions-grid">
            `;

            section.questions.forEach((q, qIdx) => {
                html += `
                    <div class="question-card" id="q-card-${q.id}">
                        <div class="q-header">
                            <span class="q-number">Question ${qIdx + 1}</span>
                        </div>
                        <p class="question-text">${q.question}</p>
                        <div class="options-list">
                            ${q.options.map(opt => `
                                <button class="option-item" onclick="ExamModule.checkAnswer(this, '${opt.replace(/'/g, "\\'")}', '${q.answer.replace(/'/g, "\\'")}', '${q.id}')">
                                    ${opt}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </section>
            `;
        });

        html += `
                </div>
                <footer class="exam-actions">
                    <button id="submit-exam-btn" class="btn btn-success submit-final-btn" onclick="ExamModule.submitExam()">
                        Submit Exam for Certification
                    </button>
                </footer>
            </div>
        `;

        container.innerHTML = html;
        window.scrollTo(0, 0);
    },

    /**
     * Use TTS to play audio for listening sections
     */
    playText(text) {
        if (window.TTS) {
            window.TTS.speak(text, 'zh-TW', 0.8);
        } else if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-TW';
            utterance.rate = 0.8;
            window.speechSynthesis.speak(utterance);
        }
    },

    /**
     * Handle option selection and provide immediate feedback
     */
    checkAnswer(btn, selected, correct, qId) {
        if (this.state.userAnswers[qId]) return;

        this.state.userAnswers[qId] = {
            selected,
            correct,
            isCorrect: selected === correct
        };

        const card = document.getElementById(`q-card-${qId}`);
        const buttons = card.querySelectorAll('.option-item');
        
        buttons.forEach(b => {
            b.disabled = true;
            if (b.textContent.trim() === correct) {
                b.classList.add('correct');
            } else if (b.textContent.trim() === selected && selected !== correct) {
                b.classList.add('incorrect');
            }
        });

        this.updateProgress();
    },

    /**
     * Update the progress bar as user answers questions
     */
    updateProgress() {
        let answered = Object.keys(this.state.userAnswers).length;
        let total = 0;
        this.state.generatedTest.sections.forEach(s => total += s.questions.length);
        
        const percent = (answered / total) * 100;
        const bar = document.getElementById('exam-progress');
        const text = document.getElementById('progress-text');
        
        if (bar) bar.style.width = `${percent}%`;
        if (text) text.textContent = `${answered} / ${total} answered`;
    },

    /**
     * Final score calculation and progress update
     */
    submitExam() {
        let total = 0;
        this.state.generatedTest.sections.forEach(s => total += s.questions.length);
        let answered = Object.keys(this.state.userAnswers).length;

        if (answered < total) {
            if (!confirm(`Attention: You have only answered ${answered} out of ${total} questions. Submitting now will count missing answers as incorrect. Continue?`)) return;
        }

        let correctCount = 0;
        Object.values(this.state.userAnswers).forEach(a => {
            if (a.isCorrect) correctCount++;
        });

        const score = Math.round((correctCount / total) * 100);
        const passed = score >= 80;

        if (passed) {
            if (!App.state.progress.exams) App.state.progress.exams = {};
            App.state.progress.exams[this.state.currentMonth] = true;
            App.logActivity('🏆', `Passed Month ${this.state.currentMonth} Achievement Exam (${score}%)`);
            App.saveProgress();
        }

        this.showResultModal(score, passed);
    },

    /**
     * Show result overlay
     */
    showResultModal(score, passed) {
        const modal = document.createElement('div');
        modal.className = 'exam-result-overlay';
        modal.innerHTML = `
            <div class="exam-result-card ${passed ? 'pass' : 'fail'}">
                <div class="result-badge">${passed ? '🎊' : '📉'}</div>
                <h2>${passed ? 'Exam Passed!' : 'Try Again'}</h2>
                <div class="score-display">
                    <span class="score-val">${score}%</span>
                    <span class="score-label">Final Score</span>
                </div>
                <p class="result-msg">
                    ${passed ? 
                        `Congratulations! You've demonstrated B1 level proficiency for Month ${this.state.currentMonth}. Your certification has been added to your profile.` : 
                        `You needed 80% to pass this certification. Review the chapters for Month ${this.state.currentMonth} and try again when you're ready.`}
                </p>
                <div class="result-actions">
                    <button class="btn btn-primary" onclick="this.closest('.exam-result-overlay').remove(); ExamModule.renderHub(document.getElementById('page-content'))">
                        Return to Hub
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // --- Utilities ---

    getRandom(arr, n) {
        if (!arr || arr.length === 0) return [];
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, n);
    },

    shuffle(arr) {
        return [...arr].sort(() => 0.5 - Math.random());
    },

    addStyles() {
        if (document.getElementById('exam-module-styles')) return;
        const style = document.createElement('style');
        style.id = 'exam-module-styles';
        style.textContent = `
            .exam-hub { padding: 40px 20px; max-width: 1100px; margin: 0 auto; }
            .hub-header { text-align: center; margin-bottom: 50px; }
            .hub-header h1 { font-family: var(--font-zh); font-size: 2.8rem; color: var(--accent); margin-bottom: 10px; }
            .hub-header p { color: var(--text-2); font-size: 1.1rem; }
            
            .month-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; }
            
            .month-card { 
                background: var(--card-bg); 
                border-radius: var(--radius); 
                padding: 25px; 
                display: flex;
                flex-direction: column;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
                position: relative;
                box-shadow: var(--shadow);
                border: 1px solid var(--border);
            }
            .month-card:hover { transform: translateY(-8px); box-shadow: var(--shadow-lg); border-color: var(--accent); }
            .month-card.locked { opacity: 0.6; filter: grayscale(0.5); cursor: not-allowed; }
            .month-card.completed { border-left: 5px solid #27ae60; }
            
            .card-status { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; color: var(--text-3); display: flex; align-items: center; gap: 8px; }
            .card-month { font-size: 0.9rem; color: var(--accent); font-weight: 800; letter-spacing: 1px; }
            .card-title { font-size: 1.4rem; margin: 10px 0; font-family: var(--font-zh); }
            .card-desc { font-size: 0.95rem; color: var(--text-2); line-height: 1.5; margin-bottom: 20px; flex-grow: 1; }
            
            .start-btn { 
                width: 100%; 
                padding: 12px; 
                border-radius: var(--radius-sm); 
                border: none; 
                background: var(--accent); 
                color: white; 
                font-weight: 700;
                cursor: pointer;
                transition: background 0.2s;
            }
            .start-btn:hover:not(:disabled) { background: var(--red-dark); }
            .start-btn:disabled { background: var(--text-3); cursor: not-allowed; }
            
            .exam-container { max-width: 900px; margin: 0 auto; padding: 30px 20px 100px; }
            .exam-header { 
                display: flex; 
                align-items: center; 
                gap: 20px; 
                margin-bottom: 40px; 
                position: sticky; 
                top: 0; 
                background: var(--warm-white); 
                padding: 15px 0; 
                z-index: 100;
                border-bottom: 1px solid var(--border);
            }
            .back-btn { padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border); background: var(--card-bg); cursor: pointer; font-weight: 600; }
            .exam-info { flex-grow: 1; }
            .exam-info h2 { font-size: 1.6rem; margin-bottom: 8px; }
            .exam-progress-wrapper { display: flex; align-items: center; gap: 15px; }
            .progress-bar-bg { flex-grow: 1; height: 10px; background: var(--off-white); border-radius: 5px; overflow: hidden; border: 1px solid var(--border); }
            .progress-bar-fill { height: 100%; background: var(--accent); transition: width 0.4s ease; }
            #progress-text { font-size: 0.85rem; color: var(--text-2); min-width: 120px; font-weight: 600; }
            
            .exam-section { margin-bottom: 60px; }
            .section-title { font-size: 1.8rem; color: var(--accent); border-bottom: 3px solid var(--accent); padding-bottom: 10px; margin-bottom: 25px; font-family: var(--font-zh); }
            .section-context { background: var(--card-bg); padding: 30px; border-radius: var(--radius); margin-bottom: 30px; box-shadow: var(--shadow); border: 1px solid var(--border); border-left: 6px solid var(--accent); }
            .reading-text { font-size: 1.3rem; line-height: 2; color: var(--text); font-family: var(--font-zh); white-space: pre-wrap; }
            
            .audio-panel { text-align: center; padding: 20px; }
            .audio-btn { padding: 15px 30px; font-size: 1.1rem; border-radius: 30px; display: inline-flex; align-items: center; gap: 10px; }
            .audio-hint { margin-top: 15px; font-size: 0.9rem; color: var(--text-3); font-style: italic; }
            
            .question-card { background: var(--card-bg); padding: 25px; border-radius: var(--radius); margin-bottom: 25px; box-shadow: var(--shadow); border: 1px solid var(--border); }
            .q-header { margin-bottom: 15px; }
            .q-number { font-size: 0.85rem; font-weight: 800; color: var(--accent); text-transform: uppercase; letter-spacing: 1px; }
            .question-text { font-size: 1.2rem; margin-bottom: 20px; line-height: 1.4; color: var(--text); }
            .options-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            
            .option-item { 
                padding: 15px 20px; 
                border-radius: var(--radius-sm); 
                border: 1px solid var(--border); 
                background: var(--off-white); 
                cursor: pointer; 
                text-align: left;
                transition: all 0.2s;
                font-size: 1rem;
                font-family: var(--font-ui);
            }
            .option-item:hover:not(:disabled) { background: #fdf2f2; border-color: var(--accent); }
            .option-item.correct { background: #e6fffa; border-color: #38b2ac; color: #234e52; font-weight: 700; }
            .option-item.incorrect { background: #fff5f5; border-color: #f56565; color: #742a2a; }
            
            .exam-actions { position: fixed; bottom: 0; left: 0; right: 0; background: white; padding: 20px; border-top: 1px solid var(--border); display: flex; justify-content: center; box-shadow: 0 -4px 20px rgba(0,0,0,0.1); z-index: 100; }
            .submit-final-btn { max-width: 500px; width: 100%; padding: 18px; font-size: 1.3rem; border-radius: 12px; background: #27ae60; color: white; border: none; font-weight: 800; cursor: pointer; }
            
            .exam-result-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; backdrop-filter: blur(5px); }
            .exam-result-card { background: var(--card-bg); padding: 50px; border-radius: 30px; max-width: 550px; width: 100%; text-align: center; box-shadow: var(--shadow-lg); border: 10px solid transparent; }
            .exam-result-card.pass { border-color: #27ae60; }
            .exam-result-card.fail { border-color: var(--accent); }
            .result-badge { font-size: 5rem; margin-bottom: 20px; }
            .score-display { margin: 25px 0; }
            .score-val { font-size: 4rem; font-weight: 900; display: block; color: var(--text); }
            .score-label { font-size: 1.1rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 2px; }
            .result-msg { font-size: 1.1rem; line-height: 1.6; color: var(--text-2); margin-bottom: 35px; }
            
            @media (max-width: 768px) {
                .options-list { grid-template-columns: 1fr; }
                .hub-header h1 { font-size: 2rem; }
                .month-grid { grid-template-columns: 1fr; }
            }
        `;
        document.head.appendChild(style);
    }
};
