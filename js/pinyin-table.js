'use strict';

window.PinyinTableModule = (() => {
  const state = {
    stage: 'core80',
    page: 1,
    pageSize: 30,
    rows: [],
    bank: null,
    manifest: null
  };

  const stageOrder = ['core80', 'core250', 'common600', 'full'];

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function pinyinBase(item) {
    const numbered = String(item?.pinyinNumbered || '').trim();
    if (numbered) return numbered.replace(/[1-5]/g, '').replace(/u:/g, '\u00fc').replace(/v/g, '\u00fc');
    const initial = String(item?.initial || '');
    const final = String(item?.final || '');
    if (initial || final) return (initial + final).replace(/u:/g, '\u00fc').replace(/v/g, '\u00fc');
    return String(item?.pinyin || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/u:/g, '\u00fc').replace(/v/g, '\u00fc');
  }

  function numberedAudioKeyFromPinyin(pinyin) {
    if (!pinyin || typeof Pinyin === 'undefined') return '';
    if (/\s/.test(String(pinyin).trim())) return '';
    const tone = Pinyin.getTone(pinyin);
    if (!tone || tone === 5) return '';
    return Pinyin.toneBase(pinyin) + tone;
  }

  function normalizeAudioKey(key) {
    const clean = String(key || '').toLowerCase().replace(/u:/g, 'v').replace(/\u00fc/g, 'v');
    return clean ? [clean, clean.includes('v') ? clean.replace(/v/g, 'uu') : ''].filter(Boolean) : [];
  }

  function audioCandidates(itemOrBase, tone = null) {
    const keys = [];
    if (typeof itemOrBase === 'string') {
      if (itemOrBase && tone) keys.push(String(itemOrBase).replace(/\u00fc/g, 'v') + String(tone));
    } else if (itemOrBase) {
      keys.push(itemOrBase.audioKey, itemOrBase.pinyinNumbered, numberedAudioKeyFromPinyin(itemOrBase.pinyin));
    }
    return Array.from(new Set(keys.filter(Boolean).flatMap(normalizeAudioKey)));
  }

  function humanAudioSrc(itemOrBase, tone = null) {
    const manifestItems = state.manifest?.items || {};
    const key = audioCandidates(itemOrBase, tone).find(candidate => manifestItems[candidate]?.src);
    return key ? manifestItems[key].src : '';
  }

  async function playHumanAudio(src) {
    if (!src) return false;
    try {
      const audio = new Audio(src);
      await audio.play();
      return true;
    } catch (err) {
      console.warn('Human pinyin audio failed, falling back when possible:', err);
      return false;
    }
  }

  function stageAllows(item) {
    if (!item?.stage) return true;
    if (state.stage === 'core80') return item.stage === 'core80';
    if (state.stage === 'core250') return item.stage === 'core80' || item.stage === 'core250';
    if (state.stage === 'common600') return item.stage === 'core80' || item.stage === 'core250' || item.stage === 'common600';
    return true;
  }

  function stageLabel(id = state.stage) {
    return (state.bank?.stages || []).find(stage => stage.id === id)?.label || id;
  }

  function buildRows() {
    const rows = new Map();
    (state.bank?.focused || []).filter(stageAllows).forEach(item => {
      const base = pinyinBase(item);
      if (!base) return;
      if (!rows.has(base)) rows.set(base, { base, tones: new Map(), examples: [] });
      const row = rows.get(base);
      const tone = Number(item.tone || String(item.answer || '').replace('tone', '')) || Pinyin.getTone(item.pinyin);
      if (tone) row.tones.set(tone, item);
      const exampleKey = `${item.hanzi}|${item.pinyin}`;
      if (row.examples.length < 3 && !row.examples.some(entry => `${entry.hanzi}|${entry.pinyin}` === exampleKey)) row.examples.push(item);
    });
    state.rows = [...rows.values()].sort((a, b) => a.base.localeCompare(b.base));
    const maxPage = Math.max(1, Math.ceil(state.rows.length / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), maxPage);
  }

  async function playItem(id) {
    const item = (state.bank?.focused || []).find(entry => entry.id === id);
    if (!item) return;
    if (await playHumanAudio(humanAudioSrc(item))) return;
    if (window.PinyinAudio) { await PinyinAudio.play(item, item.hanzi || item.audioText || item.pinyin, { rate: 0.72 }); return; }
    if (window.showToast) window.showToast('Missing local human audio for ' + (item.pinyinNumbered || item.audioKey || item.pinyin || 'this syllable') + '.');
  }

  async function playGenerated(base, tone) {
    const src = humanAudioSrc(base, Number(tone));
    if (await playHumanAudio(src)) return;
    const pinyin = Pinyin.markSyllable(base, Number(tone));
    if (window.PinyinAudio) { await PinyinAudio.play({ pinyin, pinyinNumbered: String(base).replace(/\u00fc/g, 'v') + String(tone) }, pinyin, { rate: 0.72 }); return; }
    if (window.showToast) window.showToast('Human audio is missing for ' + pinyin + '.');
  }

  function renderToneChip(row, tone) {
    const item = row.tones.get(tone);
    const target = item || row.base;
    const src = item ? humanAudioSrc(item) : humanAudioSrc(row.base, tone);
    const missing = src ? '' : ' missing-audio';
    const title = src ? 'Play local human audio' : 'Missing local MP3; will use safe TTS fallback when available';
    if (item) return `<button type="button" class="pt-tone-chip tone${tone}${missing}" data-pt-action="play-item" data-id="${esc(item.id)}" title="${title}">${esc(item.pinyin)}</button>`;
    return `<button type="button" class="pt-tone-chip generated tone${tone}${missing}" data-pt-action="play-generated" data-base="${esc(row.base)}" data-tone="${tone}" title="${title}">${esc(Pinyin.markSyllable(row.base, tone))}</button>`;
  }

  function renderExampleChip(item) {
    const src = humanAudioSrc(item);
    const missing = src ? '' : ' missing-audio';
    const title = src ? 'Play local human audio' : 'Missing local MP3; will use safe TTS fallback when available';
    return `<button type="button" class="pt-example-chip${missing}" data-pt-action="play-item" data-id="${esc(item.id)}" title="${title}"><span>${esc(item.hanzi || item.pinyin)}</span><small>${esc(item.meaning || 'listen and repeat')}</small></button>`;
  }

  function renderRows() {
    const list = document.getElementById('pt-list');
    const summary = document.getElementById('pt-summary');
    const pageLabel = document.getElementById('pt-page-label');
    const pageLabelBottom = document.getElementById('pt-page-label-bottom');
    if (!list) return;
    buildRows();
    const totalPages = Math.max(1, Math.ceil(state.rows.length / state.pageSize));
    const start = (state.page - 1) * state.pageSize;
    const rows = state.rows.slice(start, start + state.pageSize);
    if (summary) {
      const visibleItems = (state.bank?.focused || []).filter(stageAllows);
      const renderedKeys = Array.from(new Set(state.rows.flatMap(row => [1, 2, 3, 4].map(tone => String(row.base).replace(/\u00fc/g, 'v') + tone))));
      const mappedKeys = renderedKeys.filter(key => humanAudioSrc({ audioKey: key }));
      const missing = renderedKeys.length - mappedKeys.length;
      summary.textContent = stageLabel() + ' - ' + state.rows.length + ' base syllables - ' + visibleItems.length + ' tone items - ' + mappedKeys.length + '/' + renderedKeys.length + ' rendered chips use human audio' + (missing ? ' - ' + missing + ' missing local MP3' : '');
    }
    const pageText = `Page ${state.page} / ${totalPages}`;
    if (pageLabel) pageLabel.textContent = pageText;
    if (pageLabelBottom) pageLabelBottom.textContent = pageText;
    list.innerHTML = rows.map(row => `
      <article class="pt-row">
        <div class="pt-base">${esc(row.base)}</div>
        <div class="pt-tones">${[1, 2, 3, 4].map(tone => renderToneChip(row, tone)).join('')}</div>
        <div class="pt-examples">${row.examples.length ? row.examples.map(renderExampleChip).join('') : '<span class="pt-empty">No app example yet</span>'}</div>
      </article>
    `).join('');
    document.querySelectorAll('[data-pt-stage]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.ptStage === state.stage);
      btn.textContent = stageLabel(btn.dataset.ptStage);
    });
    document.querySelectorAll('[data-pt-nav="prev"]').forEach(btn => btn.disabled = state.page <= 1);
    document.querySelectorAll('[data-pt-nav="next"]').forEach(btn => btn.disabled = state.page >= totalPages);
  }

  function bind(root) {
    if (!root || root.dataset.bound === 'true') return;
    root.dataset.bound = 'true';
    root.addEventListener('click', event => {
      const btn = event.target.closest('[data-pt-action], [data-pt-stage], [data-pt-nav]');
      if (!btn || !root.contains(btn)) return;
      event.preventDefault();
      if (btn.dataset.ptStage) {
        state.stage = btn.dataset.ptStage;
        state.page = 1;
        renderRows();
        return;
      }
      if (btn.dataset.ptNav === 'prev') {
        state.page -= 1;
        renderRows();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (btn.dataset.ptNav === 'next') {
        state.page += 1;
        renderRows();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (btn.dataset.ptAction === 'play-item') playItem(btn.dataset.id || '');
      if (btn.dataset.ptAction === 'play-generated') playGenerated(btn.dataset.base || '', btn.dataset.tone || '');
    });
  }

  async function render(container) {
    container.innerHTML = `
      <div class="pinyin-table-page">
        <section class="pt-hero">
          <div>
            <span class="ob-kicker">Pinyin Syllable Table</span>
            <h2>Staged listening table</h2>
            <p>Browse 30 base syllables at a time. Tap any tone to hear it and repeat aloud.</p>
          </div>
          <a class="btn btn-ghost" href="#/onboarding">Back to Pinyin Lab</a>
        </section>
        <section class="pt-controls" aria-label="Pinyin table controls">
          ${stageOrder.map(stage => `<button type="button" data-pt-stage="${stage}" class="${stage === state.stage ? 'active' : ''}">${esc(stageLabel(stage))}</button>`).join('')}
        </section>
        <section class="pt-panel">
          <div class="pt-panel-head">
            <strong id="pt-summary">Loading...</strong>
            <div class="pt-pager">
              <button type="button" data-pt-nav="prev">Previous</button>
              <span id="pt-page-label">Page 1 / 1</span>
              <button type="button" data-pt-nav="next">Next</button>
            </div>
          </div>
          <div class="pt-list-head"><span>Base</span><span>Tones</span><span>Examples</span></div>
          <div id="pt-list" class="pt-list"><div class="empty-state">Loading pinyin table...</div></div>
          <div class="pt-pager pt-pager-bottom">
            <button type="button" data-pt-nav="prev">Previous</button>
            <span id="pt-page-label-bottom"></span>
            <button type="button" data-pt-nav="next">Next</button>
          </div>
        </section>
      </div>`;
    const [bank, manifest] = await Promise.all([
      API.get('pinyin_mastery_full'),
      API.get('pinyin_human_manifest').catch(() => null)
    ]);
    state.bank = bank;
    state.manifest = manifest;
    bind(container.querySelector('.pinyin-table-page'));
    renderRows();
  }

  return { render };
})();
