/* Multi-page scratchpad with IndexedDB persistence */
'use strict';

window.Scratchpad = (() => {
  const DB_NAME = 'zhongwen_scratchpad';
  const DB_VERSION = 1;
  const STORE = 'pages';
  const SAVE_DELAY = 850;

  const Storage = {
    db: null,
    available: 'indexedDB' in window,
    open() {
      if (!this.available) return Promise.reject(new Error('IndexedDB unavailable'));
      if (this.db) return Promise.resolve(this.db);
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const store = db.createObjectStore(STORE, { keyPath: 'id' });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        };
        req.onsuccess = () => { this.db = req.result; resolve(this.db); };
        req.onerror = () => reject(req.error || new Error('IndexedDB failed'));
      });
    },
    async allPages() {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
        req.onsuccess = () => resolve((req.result || []).sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))));
        req.onerror = () => reject(req.error);
      });
    },
    async put(page) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(page);
        tx.oncomplete = () => resolve(page);
        tx.onerror = () => reject(tx.error);
      });
    },
    async delete(id) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
  };

  const state = {
    isOpen: false,
    isDrawing: false,
    tool: 'pressure',
    penColor: '#171717',
    penSize: 6,
    eraserSize: 30,
    stylusOnly: false,
    lastPos: null,
    pages: [],
    currentPageId: null,
    dirty: false,
    saving: false,
    saveError: false,
    storageReady: false,
    lastSavedAt: null
  };

  let elements = {};
  let ctx = null;
  let activePointerId = null;
  let lastPointerEventTime = 0;
  let saveTimer = null;

  function now() { return new Date().toISOString(); }
  function uid() { return 'sp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); }
  function currentPage() { return state.pages.find(p => p.id === state.currentPageId) || null; }
  function pageIndex() { return Math.max(0, state.pages.findIndex(p => p.id === state.currentPageId)); }
  function esc(v) {
    return String(v || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function blankPage(title) {
    const t = now();
    return { id: uid(), title: title || ('Page ' + (state.pages.length + 1)), createdAt: t, updatedAt: t, width: 0, height: 0, imageBlob: null, thumbnailBlob: null };
  }

  function injectStyles() {
    if (document.getElementById('scratchpad-styles')) return;
    const style = document.createElement('style');
    style.id = 'scratchpad-styles';
    style.textContent = [
      '.scratchpad-fab{position:fixed;right:18px;bottom:85px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--red) 0%,var(--red-dark) 100%);color:#fff;border:none;box-shadow:0 4px 14px rgba(180,35,24,.4);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:999;transition:transform .2s,box-shadow .2s}.scratchpad-fab:hover{transform:scale(1.08)}.scratchpad-fab svg{width:24px;height:24px;fill:currentColor}',
      '.scratchpad-overlay{position:fixed;inset:0;background:var(--warm-white);z-index:10000;display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .22s ease-in-out}.scratchpad-overlay.open{opacity:1;pointer-events:auto}',
      '.scratchpad-header{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border);background:var(--card-bg);gap:12px;flex-wrap:wrap}.scratchpad-header-left{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.scratchpad-header-title{font-weight:800;font-size:1.05rem;color:var(--text)}.scratchpad-page-indicator{font-size:.82rem;font-weight:800;color:var(--text-2);padding:6px 10px;border:1px solid var(--border);border-radius:999px;background:var(--off-white)}.scratchpad-save-status{font-size:.78rem;font-weight:800;color:var(--text-3)}.scratchpad-save-status.error{color:var(--red)}.scratchpad-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.scratchpad-btn-group{display:flex;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden}.scratchpad-btn-group button{padding:6px 10px;font-size:.8rem;font-weight:800;background:var(--off-white);color:var(--text-2);border:none;cursor:pointer}.scratchpad-btn-group button.active{background:var(--accent);color:#fff}.scratchpad-palette{display:flex;gap:6px;align-items:center}.scratchpad-color-dot{width:22px;height:22px;border-radius:50%;border:2px solid transparent;cursor:pointer}.scratchpad-color-dot.active{border-color:var(--accent)}.scratchpad-slider-wrap{display:flex;align-items:center;gap:8px}.scratchpad-slider-label{font-size:.78rem;color:var(--text-3);min-width:60px}.scratchpad-slider{width:90px;height:4px}',
      '.scratchpad-pagebar{display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid var(--border);background:var(--card-bg);overflow-x:auto}.scratchpad-page-pill{display:inline-flex;align-items:center;gap:7px;min-width:max-content;padding:8px 11px;border:1px solid var(--border);border-radius:999px;background:var(--off-white);color:var(--text-2);font-weight:800;cursor:pointer}.scratchpad-page-pill.active{background:rgba(180,35,24,.1);border-color:var(--red);color:var(--red)}.scratchpad-page-pill small{font-size:.68rem;color:var(--text-3)}',
      '.scratchpad-storage-warning{display:none;padding:8px 16px;background:#fff3cd;color:#7a4b00;border-bottom:1px solid rgba(122,75,0,.25);font-weight:700}.scratchpad-storage-warning.show{display:block}.scratchpad-canvas-container{flex:1;position:relative;background-color:var(--warm-white);background-image:radial-gradient(var(--border) 1px,transparent 1px);background-size:24px 24px;overflow:hidden}.scratchpad-canvas{position:absolute;inset:0;width:100%;height:100%;cursor:crosshair;touch-action:none}.scratchpad-eraser-cursor{position:fixed;pointer-events:none;border:1px dashed rgba(180,35,24,.6);background:rgba(180,35,24,.08);border-radius:50%;display:none;z-index:11000;transform:translate(-50%,-50%)}',
      '@media(max-width:768px){.scratchpad-fab{bottom:95px;width:48px;height:48px}.scratchpad-header{padding:8px 10px}.scratchpad-toolbar{gap:7px}.scratchpad-btn-group button{padding:6px 8px}.scratchpad-pagebar{padding:8px 10px}.scratchpad-slider-wrap{display:none}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function buildUI() {
    injectStyles();
    const fab = document.createElement('button');
    fab.className = 'scratchpad-fab';
    fab.id = 'scratchpad-fab-btn';
    fab.title = 'Open Writing Pad';
    fab.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    fab.addEventListener('click', show);
    document.body.appendChild(fab);

    const overlay = document.createElement('div');
    overlay.className = 'scratchpad-overlay';
    overlay.id = 'scratchpad-draw-overlay';
    overlay.innerHTML =
      '<header class="scratchpad-header"><div class="scratchpad-header-left"><button class="btn btn-ghost btn-sm" id="scratchpad-back-btn" style="min-height:34px;padding:0 12px">Back</button><span class="scratchpad-header-title">Scratchpad</span><span class="scratchpad-page-indicator" id="sp-page-indicator">Page 1 / 1</span><span class="scratchpad-save-status" id="sp-save-status">Not saved yet</span></div><div class="scratchpad-toolbar"><div class="scratchpad-btn-group"><button id="sp-btn-prev">Previous</button><button id="sp-btn-next">Next</button><button id="sp-btn-add">Add Page</button></div><div class="scratchpad-btn-group"><button id="sp-btn-rename">Rename</button><button id="sp-btn-duplicate">Duplicate</button><button id="sp-btn-delete">Delete</button></div><div class="scratchpad-btn-group"><button id="sp-btn-pen">Pen</button><button id="sp-btn-pressure" class="active">Pressure</button><button id="sp-btn-eraser">Erase</button></div><div class="scratchpad-palette" id="sp-palette"><button class="scratchpad-color-dot active" data-color="#171717" style="background-color:#171717"></button><button class="scratchpad-color-dot" data-color="#B42318" style="background-color:#B42318"></button><button class="scratchpad-color-dot" data-color="#1F4E79" style="background-color:#1F4E79"></button><button class="scratchpad-color-dot" data-color="#2F8F71" style="background-color:#2F8F71"></button><button class="scratchpad-color-dot" data-color="#C98212" style="background-color:#C98212"></button></div><div class="scratchpad-slider-wrap"><span class="scratchpad-slider-label" id="sp-size-label">Size: 6px</span><input type="range" class="scratchpad-slider" id="sp-size-slider" min="1" max="40" value="6"></div><label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.8rem;font-weight:800;color:var(--text-2);user-select:none"><input type="checkbox" id="sp-stylus-only"> Stylus Only</label><button class="btn btn-ghost btn-sm" id="sp-btn-clear" style="min-height:34px">Clear Page</button></div></header><div class="scratchpad-pagebar" id="sp-pagebar"></div><div class="scratchpad-storage-warning" id="sp-storage-warning">Scratchpad is usable, but saving is unavailable in this browser.</div><div class="scratchpad-canvas-container" id="sp-canvas-container"><canvas class="scratchpad-canvas" id="scratchpad-canvas"></canvas></div><div class="scratchpad-eraser-cursor" id="sp-eraser-cursor"></div>';
    document.body.appendChild(overlay);

    elements = {
      fab,
      overlay,
      canvas: document.getElementById('scratchpad-canvas'),
      canvasContainer: document.getElementById('sp-canvas-container'),
      backBtn: document.getElementById('scratchpad-back-btn'),
      pageIndicator: document.getElementById('sp-page-indicator'),
      saveStatus: document.getElementById('sp-save-status'),
      pagebar: document.getElementById('sp-pagebar'),
      warning: document.getElementById('sp-storage-warning'),
      btnPrev: document.getElementById('sp-btn-prev'),
      btnNext: document.getElementById('sp-btn-next'),
      btnAdd: document.getElementById('sp-btn-add'),
      btnRename: document.getElementById('sp-btn-rename'),
      btnDuplicate: document.getElementById('sp-btn-duplicate'),
      btnDelete: document.getElementById('sp-btn-delete'),
      btnPen: document.getElementById('sp-btn-pen'),
      btnPressure: document.getElementById('sp-btn-pressure'),
      btnEraser: document.getElementById('sp-btn-eraser'),
      palette: document.getElementById('sp-palette'),
      sizeSlider: document.getElementById('sp-size-slider'),
      sizeLabel: document.getElementById('sp-size-label'),
      stylusToggle: document.getElementById('sp-stylus-only'),
      clearBtn: document.getElementById('sp-btn-clear'),
      eraserCursor: document.getElementById('sp-eraser-cursor')
    };
    ctx = elements.canvas.getContext('2d');

    elements.backBtn.addEventListener('click', hide);
    elements.btnPrev.addEventListener('click', () => gotoPage(pageIndex() - 1));
    elements.btnNext.addEventListener('click', () => gotoPage(pageIndex() + 1));
    elements.btnAdd.addEventListener('click', addPage);
    elements.btnRename.addEventListener('click', renamePage);
    elements.btnDuplicate.addEventListener('click', duplicatePage);
    elements.btnDelete.addEventListener('click', deletePage);
    elements.btnPen.addEventListener('click', () => setTool('pen'));
    elements.btnPressure.addEventListener('click', () => setTool('pressure'));
    elements.btnEraser.addEventListener('click', () => setTool('eraser'));
    elements.palette.addEventListener('click', e => {
      const dot = e.target.closest('.scratchpad-color-dot');
      if (!dot) return;
      document.querySelectorAll('.scratchpad-color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      setPenColor(dot.dataset.color);
    });
    elements.sizeSlider.addEventListener('input', e => {
      const val = parseInt(e.target.value, 10);
      if (state.tool === 'eraser') state.eraserSize = val;
      else state.penSize = val;
      elements.sizeLabel.textContent = 'Size: ' + val + 'px';
      updateEraserCursorSize();
    });
    elements.stylusToggle.addEventListener('change', e => { state.stylusOnly = e.target.checked; });
    elements.clearBtn.addEventListener('click', () => {
      if (confirm('Clear this scratchpad page?')) {
        clearCanvas();
        markDirty();
      }
    });
    elements.canvas.addEventListener('pointerdown', handlePointerDown);
    elements.canvas.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('blur', resetPointerState);
    elements.canvas.addEventListener('lostpointercapture', e => {
      if (e.pointerId === activePointerId) resetPointerState();
    });
    elements.canvas.addEventListener('pointerleave', () => { elements.eraserCursor.style.display = 'none'; });
    window.addEventListener('resize', () => {
      if (state.isOpen) {
        resizeCanvas();
        markDirty();
        scheduleSave();
      }
    });
  }

  async function ensurePages() {
    if (state.pages.length) return;
    try {
      state.pages = await Storage.allPages();
      state.storageReady = true;
    } catch (_) {
      state.storageReady = false;
      state.pages = [];
    }
    if (!state.pages.length) {
      const page = blankPage('Page 1');
      state.pages = [page];
      state.currentPageId = page.id;
      if (state.storageReady) Storage.put(page).catch(showStorageError);
    } else if (!state.currentPageId) {
      state.currentPageId = state.pages[0].id;
    }
  }

  function renderPages() {
    const idx = pageIndex();
    elements.pageIndicator.textContent = 'Page ' + (idx + 1) + ' / ' + Math.max(1, state.pages.length);
    elements.pagebar.innerHTML = state.pages.map((p, i) =>
      '<button class="scratchpad-page-pill ' + (p.id === state.currentPageId ? 'active' : '') + '" data-page-id="' + p.id + '"><small>' + (i + 1) + '</small>' + esc(p.title || ('Page ' + (i + 1))) + '</button>'
    ).join('');
    elements.pagebar.querySelectorAll('.scratchpad-page-pill').forEach(btn => {
      btn.addEventListener('click', () => gotoPage(state.pages.findIndex(p => p.id === btn.dataset.pageId)));
    });
    elements.btnPrev.disabled = idx <= 0;
    elements.btnNext.disabled = idx >= state.pages.length - 1;
    elements.btnDelete.disabled = state.pages.length <= 1;
    elements.warning.classList.toggle('show', !state.storageReady);
    updateSaveStatus();
  }

  function updateSaveStatus() {
    elements.saveStatus.classList.toggle('error', !!state.saveError);
    if (!state.storageReady) elements.saveStatus.textContent = 'Not saved';
    else if (state.saving) elements.saveStatus.textContent = 'Saving...';
    else if (state.saveError) elements.saveStatus.textContent = 'Save failed';
    else if (state.dirty) elements.saveStatus.textContent = 'Unsaved changes';
    else if (state.lastSavedAt) elements.saveStatus.textContent = 'Saved';
    else elements.saveStatus.textContent = 'Ready';
  }

  function canvasBlob(type = 'image/webp', quality = 0.86) {
    return new Promise(resolve => elements.canvas.toBlob(blob => resolve(blob), type, quality));
  }

  async function saveCurrentPage() {
    const page = currentPage();
    if (!page || !state.storageReady || state.saving) return;
    if (!state.dirty && page.imageBlob) return;
    state.saving = true;
    updateSaveStatus();
    try {
      const dpr = window.devicePixelRatio || 1;
      page.width = Math.round(elements.canvas.width / dpr);
      page.height = Math.round(elements.canvas.height / dpr);
      page.updatedAt = now();
      page.imageBlob = await canvasBlob('image/webp', 0.86) || await canvasBlob('image/png');
      await Storage.put(page);
      state.dirty = false;
      state.saveError = false;
      state.lastSavedAt = page.updatedAt;
    } catch (err) {
      showStorageError(err);
    } finally {
      state.saving = false;
      renderPages();
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveCurrentPage, SAVE_DELAY);
    updateSaveStatus();
  }
  function markDirty() {
    state.dirty = true;
    scheduleSave();
  }
  function showStorageError(err) {
    state.saveError = true;
    if (elements.warning) elements.warning.classList.add('show');
    console.warn('Scratchpad save failed:', err && err.message ? err.message : err);
    updateSaveStatus();
  }

  async function loadPageToCanvas(page) {
    clearCanvas(false);
    if (!page || !page.imageBlob) return;
    const url = URL.createObjectURL(page.imageBlob);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      const dpr = window.devicePixelRatio || 1;
      ctx.drawImage(img, 0, 0, elements.canvas.width / dpr, elements.canvas.height / dpr);
    } catch (err) {
      console.warn('Scratchpad page image failed to load:', err);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function gotoPage(index) {
    if (index < 0 || index >= state.pages.length || index === pageIndex()) return;
    clearTimeout(saveTimer);
    await saveCurrentPage();
    state.currentPageId = state.pages[index].id;
    state.dirty = false;
    resizeCanvas(false);
    await loadPageToCanvas(currentPage());
    renderPages();
  }
  async function addPage() {
    clearTimeout(saveTimer);
    await saveCurrentPage();
    const page = blankPage('Page ' + (state.pages.length + 1));
    state.pages.push(page);
    state.currentPageId = page.id;
    clearCanvas(false);
    state.dirty = true;
    renderPages();
    await saveCurrentPage();
  }
  async function renamePage() {
    const page = currentPage();
    if (!page) return;
    const title = prompt('Page name', page.title || 'Untitled');
    if (!title || !title.trim()) return;
    page.title = title.trim().slice(0, 40);
    page.updatedAt = now();
    if (state.storageReady) Storage.put(page).catch(showStorageError);
    renderPages();
  }
  async function duplicatePage() {
    clearTimeout(saveTimer);
    await saveCurrentPage();
    const source = currentPage();
    if (!source) return;
    const page = Object.assign({}, source, { id: uid(), title: (source.title || 'Page') + ' copy', createdAt: now(), updatedAt: now() });
    state.pages.splice(pageIndex() + 1, 0, page);
    state.currentPageId = page.id;
    resizeCanvas(false);
    await loadPageToCanvas(page);
    renderPages();
    if (state.storageReady) Storage.put(page).catch(showStorageError);
  }
  async function deletePage() {
    if (state.pages.length <= 1) return;
    const page = currentPage();
    if (!page || !confirm('Delete ' + (page.title || 'this page') + '?')) return;
    const idx = pageIndex();
    state.pages.splice(idx, 1);
    if (state.storageReady) Storage.delete(page.id).catch(showStorageError);
    state.currentPageId = state.pages[Math.min(idx, state.pages.length - 1)].id;
    resizeCanvas(false);
    await loadPageToCanvas(currentPage());
    state.dirty = false;
    renderPages();
  }

  function setTool(tool) {
    state.tool = tool;
    elements.btnPen.className = tool === 'pen' ? 'active' : '';
    elements.btnPressure.className = tool === 'pressure' ? 'active' : '';
    elements.btnEraser.className = tool === 'eraser' ? 'active' : '';
    elements.palette.style.opacity = tool !== 'eraser' ? '1' : '0.4';
    elements.palette.style.pointerEvents = tool !== 'eraser' ? 'auto' : 'none';
    if (tool === 'eraser') {
      elements.sizeSlider.value = state.eraserSize;
      elements.sizeLabel.textContent = 'Size: ' + state.eraserSize + 'px';
      updateEraserCursorSize();
    } else {
      elements.sizeSlider.value = state.penSize;
      elements.sizeLabel.textContent = 'Size: ' + state.penSize + 'px';
      elements.eraserCursor.style.display = 'none';
    }
  }
  function setPenColor(color) {
    state.penColor = color;
    if (state.tool === 'eraser') setTool('pressure');
  }
  function updateEraserCursorSize() {
    if (state.tool !== 'eraser') return;
    elements.eraserCursor.style.width = state.eraserSize + 'px';
    elements.eraserCursor.style.height = state.eraserSize + 'px';
  }
  function resetPointerState() {
    state.isDrawing = false;
    activePointerId = null;
  }
  function getPos(e) {
    const rect = elements.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const lw = elements.canvas.width / dpr;
    const lh = elements.canvas.height / dpr;
    return {
      x: (e.clientX - rect.left) * (rect.width ? lw / rect.width : 1),
      y: (e.clientY - rect.top) * (rect.height ? lh / rect.height : 1)
    };
  }
  function handlePointerDown(e) {
    if (!state.isOpen) return;
    if (state.stylusOnly && e.pointerType !== 'pen') return;
    if (state.isDrawing) {
      const stale = Date.now() - lastPointerEventTime > 500;
      if (e.pointerType === 'pen' || e.pointerId === activePointerId || stale) resetPointerState();
      else return;
    }
    state.isDrawing = true;
    activePointerId = e.pointerId;
    lastPointerEventTime = Date.now();
    state.lastPos = getPos(e);
    try { elements.canvas.setPointerCapture(e.pointerId); } catch (_) {}
    updateEraserCursor(e);
    if (e.cancelable) e.preventDefault();
  }
  function handlePointerMove(e) {
    if (!state.isOpen) return;
    updateEraserCursor(e);
    if (state.isDrawing && e.pointerId === activePointerId && (e.buttons & 1) === 0) {
      try { elements.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      resetPointerState();
      return;
    }
    if (!state.isDrawing || e.pointerId !== activePointerId) return;
    if (state.stylusOnly && e.pointerType !== 'pen') return;
    lastPointerEventTime = Date.now();
    const currentPos = getPos(e);
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (state.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = state.eraserSize;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = state.penColor;
      if (state.tool === 'pressure') {
        let pressure = e.pressure;
        if (e.pointerType === 'mouse' || e.pointerType === 'touch' || pressure === 0 || pressure === 0.5) pressure = 0.55;
        ctx.lineWidth = state.penSize * (0.22 + pressure * 1.35);
      } else {
        ctx.lineWidth = state.penSize;
      }
    }
    ctx.moveTo(state.lastPos.x, state.lastPos.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();
    state.lastPos = currentPos;
    markDirty();
    if (e.cancelable) e.preventDefault();
  }
  function handlePointerUp(e) {
    if (!state.isOpen && activePointerId == null) return;
    if (e.pointerId === activePointerId) {
      try { elements.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      resetPointerState();
      scheduleSave();
    }
  }
  function updateEraserCursor(e) {
    if (state.tool === 'eraser') {
      elements.eraserCursor.style.display = 'block';
      elements.eraserCursor.style.left = e.clientX + 'px';
      elements.eraserCursor.style.top = e.clientY + 'px';
    } else {
      elements.eraserCursor.style.display = 'none';
    }
  }
  function clearCanvas(shouldDirty = true) {
    if (!ctx || !elements.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, elements.canvas.width / dpr, elements.canvas.height / dpr);
    if (shouldDirty) markDirty();
  }
  function resizeCanvas(preserve = true) {
    if (!elements.canvas) return;
    const rect = elements.canvasContainer.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || Math.max(320, window.innerHeight - 120);
    const dpr = window.devicePixelRatio || 1;
    const temp = document.createElement('canvas');
    temp.width = elements.canvas.width;
    temp.height = elements.canvas.height;
    if (preserve && temp.width && temp.height) temp.getContext('2d').drawImage(elements.canvas, 0, 0);
    elements.canvas.style.width = width + 'px';
    elements.canvas.style.height = height + 'px';
    elements.canvas.width = Math.round(width * dpr);
    elements.canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (preserve && temp.width && temp.height) ctx.drawImage(temp, 0, 0, temp.width / dpr, temp.height / dpr);
  }

  async function show() {
    state.isOpen = true;
    resetPointerState();
    elements.overlay.classList.add('open');
    elements.overlay.style.pointerEvents = 'auto';
    elements.fab.style.display = 'none';
    document.body.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('scratchpad:open'));
    await ensurePages();
    resizeCanvas(false);
    await loadPageToCanvas(currentPage());
    renderPages();
  }
  async function hide() {
    if (activePointerId != null) {
      try { elements.canvas.releasePointerCapture(activePointerId); } catch (_) {}
    }
    clearTimeout(saveTimer);
    await saveCurrentPage();
    state.isOpen = false;
    resetPointerState();
    elements.overlay.classList.remove('open');
    elements.overlay.style.pointerEvents = 'none';
    elements.fab.style.display = 'flex';
    document.body.style.overflow = '';
    elements.eraserCursor.style.display = 'none';
    window.dispatchEvent(new CustomEvent('scratchpad:closed'));
  }
  function init() {
    if (document.getElementById('scratchpad-fab-btn')) return;
    buildUI();
  }

  return { init, show, hide, clearCanvas, setTool, setPenColor, saveCurrentPage, getState: () => state, storage: Storage };
})();

document.addEventListener('DOMContentLoaded', () => {
  window.Scratchpad.init();
});
