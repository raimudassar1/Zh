/* ═══════════════════════════════════════════════════════════════
   vocabulary_books.js — Vocabulary organized by Course Books (1-3)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

window.VocabularyBooksModule = (() => {
  let state = {
    book: 1,
    chapter: '01',
    data: null,
    loading: false
  };

  function injectStyles() {
    if (document.getElementById('vocabulary-books-styles')) return;
    const style = document.createElement('style');
    style.id = 'vocabulary-books-styles';
    style.textContent = `
      .vocab-row:hover { background-color: var(--off-white); }
      .vocab-table th { position: sticky; top: 0; z-index: 10; box-shadow: 0 1px 0 var(--border); }
      .lesson-btn { text-align: left; justify-content: flex-start; width: 100%; border-radius: 8px; transition: all 0.2s; }
      .lesson-btn.active { background: var(--accent); color: white; }
    `;
    document.head.appendChild(style);
  }

  async function loadBook(bookNum) {
    state.loading = true;
    injectStyles();
    const content = document.getElementById('vocabulary-books-content');
    if (content) content.innerHTML = '<div class="spinner"></div>';

    try {
      const resp = await fetch(`books/book${bookNum}/vocabulary_b${bookNum}.json`);
      if (!resp.ok) throw new Error(`Failed to load Book ${bookNum} data`);
      state.data = await resp.json();
      state.book = bookNum;

      // Extract unique chapters (lessons) from vocab_ids like "B1L01-I-01"
      const chapters = [...new Set(state.data.map(item => {
        const match = item.vocab_id.match(/L(\d+)/);
        return match ? match[1] : null;
      }))].filter(Boolean).sort();

      // If current chapter isn't in this book, pick the first one
      if (!chapters.includes(state.chapter)) {
        state.chapter = chapters[0];
      }

      state.loading = false;
      renderContent();
    } catch (err) {
      console.error(err);
      if (content) content.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
      state.loading = false;
    }
  }

  function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div style="font-size: 0.75rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 2px; font-weight: 700; margin-bottom: 8px;">Course Curriculum</div>
        <h2>Course Vocabulary</h2>
        <p>Master vocabulary from the standard course books (Dangdai), organized by lesson and section.</p>
      </div>

      <div class="library-controls mb-24" style="justify-content: flex-start; gap: 12px;">
        <div class="flex gap-8">
          <button class="btn ${state.book === 1 ? 'btn-primary' : 'btn-ghost'} book-tab" onclick="VocabularyBooksModule.switchBook(1)">Book 1</button>
          <button class="btn ${state.book === 2 ? 'btn-primary' : 'btn-ghost'} book-tab" onclick="VocabularyBooksModule.switchBook(2)">Book 2</button>
          <button class="btn ${state.book === 3 ? 'btn-primary' : 'btn-ghost'} book-tab" onclick="VocabularyBooksModule.switchBook(3)">Book 3</button>
        </div>
        <div style="margin-left: auto; display: flex; align-items: center; gap: 8px;">
          <span class="text-small text-muted" id="vocab-count-info"></span>
        </div>
      </div>

      <div id="vocabulary-books-content">
        <div class="spinner"></div>
      </div>
    `;

    loadBook(state.book);
  }

  function renderContent() {
    const container = document.getElementById('vocabulary-books-content');
    const countInfo = document.getElementById('vocab-count-info');
    if (!container || !state.data) return;

    // Get all chapters for the sidebar
    const chapters = [...new Set(state.data.map(item => {
      const match = item.vocab_id.match(/L(\d+)/);
      return match ? match[1] : null;
    }))].filter(Boolean).sort();

    // Filter items for current chapter
    const filtered = state.data.filter(item => item.vocab_id.includes(`L${state.chapter}`));
    
    if (countInfo) countInfo.textContent = `${filtered.length} words in Lesson ${parseInt(state.chapter)}`;

    container.innerHTML = `
      <div class="flex gap-24" style="align-items: flex-start; flex-wrap: wrap;">
        <!-- Left: Lesson Sidebar -->
        <div class="card" style="width: 180px; padding: 12px; flex-shrink: 0; position: sticky; top: 100px; max-height: calc(100vh - 150px); overflow-y: auto;">
          <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-3); margin-bottom: 12px; padding-left: 8px;">Lessons</h4>
          <div class="flex flex-direction-column gap-4">
            ${chapters.map(ch => `
              <button class="btn btn-sm ${state.chapter === ch ? 'btn-secondary' : 'btn-ghost'}" 
                      style="text-align: left; justify-content: flex-start; width: 100%;"
                      onclick="VocabularyBooksModule.switchChapter('${ch}')">
                Lesson ${parseInt(ch)}
              </button>
            `).join('')}
          </div>
        </div>
        
        <!-- Right: Vocabulary List -->
        <div class="vocab-table-container card" style="flex: 1; min-width: 300px; padding: 0; overflow: hidden;">
          <table class="vocab-table" style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
            <thead>
              <tr style="text-align: left; background: var(--off-white); border-bottom: 1px solid var(--border);">
                <th style="padding: 14px; width: 50px;">Audio</th>
                <th style="padding: 14px; width: 140px;">Word</th>
                <th style="padding: 14px; width: 140px;">Pinyin</th>
                <th style="padding: 14px; width: 80px;">Part</th>
                <th style="padding: 14px;">Definition</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(item => `
                <tr class="vocab-row" style="border-bottom: 1px solid var(--border); transition: background 0.2s;">
                  <td style="padding: 12px; text-align: center;">
                    <button class="btn btn-sm btn-icon btn-ghost" onclick="VocabularyBooksModule.play('${item.audio_file}', this)" title="Play Audio">🔊</button>
                  </td>
                  <td style="padding: 12px;">
                    <div class="vocab-hanzi" style="font-size: 1.3rem; font-weight: 700; color: var(--text); cursor: pointer;" onclick="showWordDetail('${item.traditional}')">${item.traditional}</div>
                    ${item.simplified !== item.traditional ? `<div class="text-muted" style="font-size: 0.8rem;">${item.simplified}</div>` : ''}
                  </td>
                  <td style="padding: 12px;">
                    <div class="tone-colors" style="font-weight: 500;">${Pinyin.colorize(item.pinyin)}</div>
                  </td>
                  <td style="padding: 12px;">
                    <span class="badge badge-gray" style="font-size: 0.7rem; opacity: 0.8;">${item.part_of_speech || '-'}</span>
                  </td>
                  <td style="padding: 12px; color: var(--text-2); line-height: 1.4;">${item.english}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${filtered.length === 0 ? '<div class="empty-state" style="padding: 40px;">No vocabulary found for this lesson.</div>' : ''}
        </div>
      </div>
    `;
  }

  return {
    render,
    switchBook(n) {
      if (state.loading) return;
      state.book = n;
      const tabs = document.querySelectorAll('.book-tab');
      tabs.forEach((t, i) => {
        t.classList.toggle('btn-primary', i + 1 === n);
        t.classList.toggle('btn-ghost', i + 1 !== n);
      });
      loadBook(n);
    },
    switchChapter(ch) {
      state.chapter = ch;
      renderContent();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    play(filename, btn) {
      if (!filename) return;
      const path = `books/book${state.book}/audio_b${state.book}/${filename}`;
      const audio = new Audio(path);
      
      if (btn) btn.textContent = '⌛';
      
      audio.play().then(() => {
        if (btn) btn.textContent = '🔊';
      }).catch(err => {
        console.error("Audio failed:", err);
        if (btn) btn.textContent = '❌';
        setTimeout(() => { if (btn) btn.textContent = '🔊'; }, 2000);
      });
    }
  };
})();
