/**
 * drawing-board.js
 * A non-intrusive controller for HanziWriter and a freehand canvas.
 */

window.DrawingBoard = (() => {
    let state = {
        mode: 'guided', // animated | guided | freehand | stroke-order
        penOnly: false,
        freehandGuide: localStorage.getItem('zhongwen_freehand_guide') !== '0',
        strokeWidth: 4,
        hanzi: '',
        hw: null,
        canvas: null,
        ctx: null,
        isDrawing: false,
        activePointerId: null,
        lastPointerEventTime: 0,
        lastPos: null,
        container: null,
        writerTarget: null,
        theme: 'light',
        hwLoading: null
    };

    function togglePenOnly() {
        state.penOnly = !state.penOnly;
        syncUI();
    }

    function toggleFreehandGuide() {
        state.freehandGuide = !state.freehandGuide;
        localStorage.setItem('zhongwen_freehand_guide', state.freehandGuide ? '1' : '0');
        applyGuideVisibility();
        syncUI();
    }

    function applyGuideVisibility() {
        if (!state.hw) return;
        if (state.mode === 'guided' || state.freehandGuide) {
            if (typeof state.hw.showOutline === 'function') state.hw.showOutline();
        } else {
            if (typeof state.hw.hideOutline === 'function') state.hw.hideOutline();
        }
        if (typeof state.hw.hideCharacter === 'function') state.hw.hideCharacter();
    }

    function syncUI() {
        const modeSelects = document.querySelectorAll('select[onchange*="DrawingBoard.setMode"]');
        modeSelects.forEach(s => s.value = state.mode);

        const penControls = [document.getElementById('pen-controls'), document.getElementById('app-pen-controls')];
        penControls.forEach(c => {
            if (c) c.style.display = state.mode === 'freehand' ? 'flex' : 'none';
        });

        // Update all Pen Only buttons
        const penButtons = document.querySelectorAll('.pen-toggle-btn');
        penButtons.forEach(btn => {
            btn.className = state.penOnly ? 'btn btn-sm btn-primary pen-toggle-btn' : 'btn btn-sm btn-outline pen-toggle-btn';
            btn.textContent = state.penOnly ? '🖊️ Pen Only: ON' : '🖊️ Pen Only: OFF';
        });

        const widthSliders = document.querySelectorAll('input[oninput*="DrawingBoard.setPenWidth"]');
        widthSliders.forEach(s => s.value = state.strokeWidth);

        const guideButtons = document.querySelectorAll('.freehand-guide-toggle-btn');
        guideButtons.forEach(btn => {
            btn.className = state.freehandGuide ? 'btn btn-sm btn-outline freehand-guide-toggle-btn' : 'btn btn-sm btn-primary freehand-guide-toggle-btn';
            btn.textContent = state.freehandGuide ? 'Guide: ON' : 'Guide: OFF';
            btn.setAttribute('aria-pressed', state.freehandGuide ? 'true' : 'false');
        });
    }

    // Capture-phase event handler to block non-pen inputs before HanziWriter gets them
    function handleCaptureEvent(e) {
        if (state.penOnly && e.pointerType !== 'pen') {
            e.stopPropagation();
            e.preventDefault();
        }
    }

    function init(writerTargetId, canvasId, hanzi) {
        state.writerTarget = document.getElementById(writerTargetId);
        state.canvas = document.getElementById(canvasId);
        if (!state.writerTarget || !state.canvas) return;

        state.hanzi = hanzi;
        state.theme = document.documentElement.getAttribute('data-theme') || 'light';
        state.strokeColor = state.theme === 'dark' ? '#e8e4df' : '#2C3E50';
        state.outlineColor = state.theme === 'dark' ? '#333333' : '#EAEAEA';

        state.ctx = state.canvas.getContext('2d');
        state.canvas.style.touchAction = 'none';
        state.writerTarget.style.touchAction = 'none';
        
        // Ensure canvas is correctly sized
        resizeCanvas();

        // Initialize HanziWriter
        initHanziWriter();

        // Canvas events (Freehand)
        state.canvas.onpointerdown = handlePointerDown;
        state.canvas.onpointermove = handlePointerMove;
        state.canvas.onpointerup = handlePointerUp;
        state.canvas.onpointercancel = handlePointerUp;
        state.canvas.addEventListener('lostpointercapture', handleLostPointerCapture);

        // Block touch events for Guided mode when Pen Only is enabled
        const container = state.writerTarget.parentElement;
        if (container) {
            container.removeEventListener('pointerdown', handleCaptureEvent, true);
            container.removeEventListener('pointermove', handleCaptureEvent, true);
            container.addEventListener('pointerdown', handleCaptureEvent, true);
            container.addEventListener('pointermove', handleCaptureEvent, true);
        }

        // Auto-resize handling
        window.removeEventListener('resize', resizeCanvas);
        window.addEventListener('resize', resizeCanvas);
        window.removeEventListener('scratchpad:open', resetInteractionState);
        window.removeEventListener('scratchpad:closed', resetInteractionState);
        window.addEventListener('scratchpad:open', resetInteractionState);
        window.addEventListener('scratchpad:closed', resetInteractionState);
        
        // Synchronize UI
        syncUI();
        
        // Initial visibility
        setMode(state.mode);
    }

    function ensureHanziWriter() {
        if (typeof HanziWriter !== 'undefined') return Promise.resolve();
        if (state.hwLoading) return state.hwLoading;
        state.hwLoading = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[src*="hanzi-writer"]');
            if (existing) {
                existing.addEventListener('load', resolve, { once: true });
                existing.addEventListener('error', reject, { once: true });
                setTimeout(resolve, 2500);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js';
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        }).finally(() => { state.hwLoading = null; });
        return state.hwLoading;
    }

    function initHanziWriter() {
        if (!state.writerTarget) return;
        if (typeof HanziWriter === 'undefined') {
            state.writerTarget.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-2)">Loading writing engine...</div>';
            ensureHanziWriter().then(() => initHanziWriter()).catch(() => {
                state.writerTarget.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-2)">Writing engine could not load. Freehand mode still works.</div>';
            });
            return;
        }
        state.writerTarget.innerHTML = '';
        
        const rect = state.writerTarget.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height) - 20;
        
        state.hw = HanziWriter.create(state.writerTarget.id, state.hanzi, {
            width: size > 0 ? size : 280,
            height: size > 0 ? size : 280,
            padding: 10,
            showCharacter: false,
            showOutline: true,
            strokeAnimationSpeed: 1.5,
            delayBetweenStrokes: 50,
            strokeColor: state.strokeColor,
            outlineColor: state.outlineColor,
            highlightColor: '#C0392B',
            drawingWidth: 15,
            charDataLoader: function(char, onComplete, onFailure) {
                fetch('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/' + encodeURIComponent(char) + '.json')
                    .then(res => {
                        if (!res.ok) throw new Error('Status ' + res.status);
                        return res.json();
                    })
                    .then(data => onComplete(data))
                    .catch(err => {
                        console.error('Failed to load character data for ' + char, err);
                        if (onFailure) onFailure(err);
                    });
            }
        });

        applyGuideVisibility();

        if (state.mode === 'guided') {
            state.hw.quiz();
        }
    }

    function resizeCanvas() {
        if (!state.canvas) return;
        const rect = state.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Match logical size to container
        state.canvas.style.width = rect.width + 'px';
        state.canvas.style.height = rect.height + 'px';
        
        // Match internal buffer to physical pixels for precision
        state.canvas.width = rect.width * dpr;
        state.canvas.height = rect.height * dpr;
        
        // Scale context to match logical coordinates
        state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        clearFreehand();
    }

    function setMode(mode) {
        state.mode = mode;
        if (!state.canvas) return;

        hideStrokeOrderPanel();

        if (mode === 'guided') {
            state.canvas.style.display = 'none';
            state.canvas.style.pointerEvents = 'none';
            if (state.hw) {
                state.hw.cancelAnimation?.();
                state.hw.hideCharacter?.();
                state.hw.showOutline?.();
                state.hw.quiz();
            }
        } else if (mode === 'freehand') {
            state.canvas.style.display = 'block';
            state.canvas.style.pointerEvents = 'auto';
            state.canvas.style.zIndex = '10';
            if (state.hw) {
                state.hw.cancelQuiz();
                state.hw.cancelAnimation?.();
                applyGuideVisibility();
            }
        } else if (mode === 'stroke-order') {
            state.canvas.style.display = 'none';
            state.canvas.style.pointerEvents = 'none';
            if (state.hw) {
                state.hw.cancelQuiz();
                state.hw.cancelAnimation?.();
                state.hw.hideCharacter?.();
                state.hw.showOutline?.();
            }
            showStrokeOrderMode();
        } else if (mode === 'animated') {
            state.canvas.style.display = 'none';
            state.canvas.style.pointerEvents = 'none';
            playAnimatedCharacter();
        }
        syncUI();
    }

    function escapeAttr(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    function strokeStripHost() {
        const canvasContainer = state.canvas?.parentElement || state.writerTarget?.parentElement;
        return canvasContainer?.parentElement || canvasContainer || null;
    }

    function upsertStrokePanel() {
        const host = strokeStripHost();
        if (!host) return null;
        let panel = Array.from(host.children).find(child => child.classList?.contains('drawing-stroke-strip'));
        if (!panel) {
            panel = document.createElement('div');
            panel.className = 'drawing-stroke-strip';
            const canvasContainer = state.canvas?.parentElement || state.writerTarget?.parentElement;
            if (canvasContainer && canvasContainer.parentElement === host) {
                canvasContainer.insertAdjacentElement('afterend', panel);
            } else {
                host.appendChild(panel);
            }
        }
        return panel;
    }

    function hideStrokeOrderPanel() {
        const host = strokeStripHost();
        const panel = host ? Array.from(host.children).find(child => child.classList?.contains('drawing-stroke-strip')) : null;
        if (panel) panel.hidden = true;
    }

    function strokePreviewSvg(strokes, count) {
        const strokeColor = state.strokeColor || '#1f2937';
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c0392b';
        const visible = strokes.slice(0, count);
        return `
            <svg viewBox="0 0 1024 1024" role="img" aria-label="${count} strokes shown">
                <g transform="translate(0,900) scale(1,-1)">
                    ${visible.map((path, index) => `<path d="${escapeAttr(path)}" fill="${index === count - 1 ? accentColor : strokeColor}" opacity="${index === count - 1 ? '1' : '0.45'}"></path>`).join('')}
                </g>
            </svg>`;
    }

    function renderStrokeOrder(strokes, count = 1) {
        const panel = upsertStrokePanel();
        if (!panel) return;
        panel.hidden = false;
        if (!strokes.length) {
            panel.innerHTML = '<div class="drawing-stroke-empty">Stroke data is not available for this character.</div>';
            return;
        }
        const total = strokes.length;
        const current = Math.max(1, Math.min(Number(count) || 1, total));
        panel.innerHTML = `
            <div class="drawing-stroke-title">Stroke order</div>
            <div class="drawing-stroke-slider-layout">
                <div class="drawing-stroke-preview">${strokePreviewSvg(strokes, current)}</div>
                <div class="drawing-stroke-controls">
                    <div class="drawing-stroke-count"><strong>${current}</strong> / ${total} strokes</div>
                    <input type="range" min="1" max="${total}" value="${current}" oninput="DrawingBoard.setStrokeOrderStep(this.value)">
                    <p>Move the slider to reveal the character stroke by stroke.</p>
                </div>
            </div>`;
    }

    async function loadStrokeData() {
        const url = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/' + encodeURIComponent(state.hanzi) + '.json';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Fetch failed: ' + res.status);
        const charData = await res.json();
        return charData?.strokes || [];
    }

    async function showStrokeOrderMode() {
        try {
            const strokes = await loadStrokeData();
            renderStrokeOrder(strokes, strokes.length);
        } catch (err) {
            console.warn('Stroke order display failed:', err);
            const panel = upsertStrokePanel();
            if (panel) {
                panel.hidden = false;
                panel.innerHTML = '<div class="drawing-stroke-empty">Could not load stroke order for this character.</div>';
            }
        }
    }

    async function setStrokeOrderStep(value) {
        try {
            const strokes = await loadStrokeData();
            renderStrokeOrder(strokes, value);
        } catch (err) {
            console.warn('Stroke order slider failed:', err);
        }
    }

    function playAnimatedCharacter() {
        if (!state.hw) return;
        try {
            state.hw.cancelQuiz();
            state.hw.cancelAnimation?.();
            state.hw.hideCharacter?.();
            state.hw.showOutline?.();
            state.hw.animateCharacter();
        } catch (err) {
            console.warn('Stroke animation failed:', err);
        }
    }

    function animate() {
        setMode('animated');
    }

    function reset() {
        clearFreehand();
        initHanziWriter();
    }

    function clearFreehand() {
        if (!state.ctx) return;
        const dpr = window.devicePixelRatio || 1;
        state.ctx.clearRect(0, 0, state.canvas.width / dpr, state.canvas.height / dpr);
    }

    let frameId = null;
    let points = [];

    function resetInteractionState() {
        state.isDrawing = false;
        state.lastPos = null;
        const pointerId = state.activePointerId;
        state.activePointerId = null;
        points = [];
        if (frameId) { cancelAnimationFrame(frameId); frameId = null; }
        if (state.canvas) {
            if (pointerId != null) { try { state.canvas.releasePointerCapture?.(pointerId); } catch(_) {} }
        }
    }

    function handleGlobalPointerUp(e) {
        if (e.pointerId === state.activePointerId) {
            handlePointerUp(e);
            window.removeEventListener('pointerup', handleGlobalPointerUp);
            window.removeEventListener('pointercancel', handleGlobalPointerUp);
        }
    }

    function handleLostPointerCapture(e) {
        if (e.pointerId === state.activePointerId) {
            state.isDrawing = false;
            state.activePointerId = null;
            window.removeEventListener('pointerup', handleGlobalPointerUp);
            window.removeEventListener('pointercancel', handleGlobalPointerUp);
        }
    }

    function handlePointerDown(e) {
        if (state.mode !== 'freehand') return;

        // Pen-only check: if penOnly is enabled, only allow 'pen' pointer types
        if (state.penOnly && e.pointerType !== 'pen') {
            return;
        }

        // Stuck state recovery and multi-touch rejection
        if (state.isDrawing) {
            const timeSinceLastEvent = Date.now() - state.lastPointerEventTime;
            // Recover if:
            // 1. New stylus down event (only one stylus can draw at a time)
            // 2. Or same pointer ID is somehow down again
            // 3. Or last drawing event was more than 500ms ago (abandoned stroke)
            if (e.pointerType === 'pen' || e.pointerId === state.activePointerId || timeSinceLastEvent > 500) {
                state.isDrawing = false;
                state.activePointerId = null;
                window.removeEventListener('pointerup', handleGlobalPointerUp);
                window.removeEventListener('pointercancel', handleGlobalPointerUp);
            } else {
                // Ignore other concurrent touches (palm rejection / multi-touch block)
                return;
            }
        }

        state.isDrawing = true;
        state.activePointerId = e.pointerId;
        state.lastPointerEventTime = Date.now();
        state.lastPos = getPos(e);
        
        try {
            state.canvas.setPointerCapture(e.pointerId);
        } catch (_) {}

        points = [state.lastPos];

        state.ctx.beginPath();
        state.ctx.lineCap = 'round';
        state.ctx.lineJoin = 'round';
        state.ctx.strokeStyle = state.strokeColor;
        state.ctx.lineWidth = state.strokeWidth;
        state.ctx.moveTo(state.lastPos.x, state.lastPos.y);

        if (!frameId) {
            frameId = requestAnimationFrame(drawFrame);
        }

        // Bind global listeners to clean up when lifted
        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('pointercancel', handleGlobalPointerUp);

        // Prevent default touch behaviors like scrolling when drawing
        if (e.cancelable) e.preventDefault();
    }

    function handlePointerMove(e) {
        // Stuck state recovery: if we are supposed to be drawing, but get a hover/lifted event
        // (no buttons pressed) for the active pointer, clear the drawing state.
        if (state.isDrawing && e.pointerId === state.activePointerId && (e.buttons & 1) === 0) {
            state.isDrawing = false;
            state.activePointerId = null;
            try {
                state.canvas.releasePointerCapture(e.pointerId);
            } catch (_) {}
            window.removeEventListener('pointerup', handleGlobalPointerUp);
            window.removeEventListener('pointercancel', handleGlobalPointerUp);
            return;
        }

        if (!state.isDrawing) return;
        if (e.pointerId !== state.activePointerId) return;
        if (state.penOnly && e.pointerType !== 'pen') return;

        state.lastPointerEventTime = Date.now();

        // Use coalesced events for highest possible fidelity (sampling between frames)
        if (e.getCoalescedEvents) {
            const events = e.getCoalescedEvents();
            for (const ev of events) {
                points.push(getPos(ev));
            }
        } else {
            points.push(getPos(e));
        }
    }

    function drawFrame() {
        if (points.length > 1) {
            state.ctx.beginPath();
            state.ctx.lineWidth = state.strokeWidth;
            state.ctx.lineCap = 'round';
            state.ctx.lineJoin = 'round';
            state.ctx.strokeStyle = state.strokeColor;
            
            state.ctx.moveTo(state.lastPos.x, state.lastPos.y);
            
            for (let i = 1; i < points.length; i++) {
                state.ctx.lineTo(points[i].x, points[i].y);
                state.lastPos = points[i];
            }
            state.ctx.stroke();
            points = [state.lastPos];
        }
        
        if (state.isDrawing) {
            frameId = requestAnimationFrame(drawFrame);
        } else {
            frameId = null;
        }
    }

    function handlePointerUp(e) {
        if (e.pointerId === state.activePointerId) {
            if (state.isDrawing) {
                // Draw any remaining points
                const currentPos = getPos(e);
                points.push(currentPos);
                drawFrame();
            }
            state.isDrawing = false;
            state.activePointerId = null;
            if (state.canvas && e.pointerId) {
                try { state.canvas.releasePointerCapture(e.pointerId); } catch(err) {}
            }
        }
    }

    function getPos(e) {
        const rect = state.canvas.getBoundingClientRect();
        // Accounting for CSS transforms/scaling to fix the "above the pen" offset
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = state.canvas.width / dpr;
        const logicalHeight = state.canvas.height / dpr;
        const scaleX = rect.width ? logicalWidth / rect.width : 1;
        const scaleY = rect.height ? logicalHeight / rect.height : 1;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    function open(text) {
        if (!text) return;
        
        // Filter out non-Chinese characters for guided writing but keep track of indices
        const textArray = text.split('');
        const characters = [];
        textArray.forEach((char, index) => {
            const code = char.charCodeAt(0);
            if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)) {
                characters.push({ char, originalIndex: index });
            }
        });
        
        if (characters.length === 0) return;
        
        let currentIndex = 0;
        
        const renderModal = () => {
            const activeCharObj = characters[currentIndex];
            const Modal = window.Modal;
            if (!Modal) return;

            Modal.show(`
                <button class="modal-close" onclick="Modal.hide()">X</button>
                <div style="text-align:center; padding:10px">
                    <h3 style="margin-bottom:12px">Writing Practice</h3>
                    <div style="font-size:1.4rem; margin-bottom:24px; color:var(--text); font-family:var(--font-zh); letter-spacing:2px">
                        ${textArray.map((c, i) => {
                            const isActive = activeCharObj && activeCharObj.originalIndex === i;
                            return `<span style="${isActive ? 'color:var(--accent); font-weight:900; border-bottom:3px solid var(--accent); padding-bottom:2px' : ''}">${c}</span>`;
                        }).join('')}
                    </div>
                    
                    <div style="display:flex; flex-direction:column; align-items:center; gap:20px">
                        <div style="display:flex; flex-direction:column; width:100%; max-width:320px; gap:10px">
                            <div style="display:flex; justify-content:space-between; width:100%; gap:10px">
                                <select class="input input-sm writing-mode-select" style="width:auto; height:36px; background:var(--card-bg); color:var(--text); border-color:var(--border)" onchange="DrawingBoard.setMode(this.value)">
                                    <option value="animated">Animated</option>
                                    <option value="guided">Guided</option>
                                    <option value="freehand">Freehand</option>
                                    <option value="stroke-order">Stroke Order</option>
                                </select>
                                <div class="flex gap-8">
                                    <button class="btn btn-ghost btn-sm" onclick="DrawingBoard.animate()">Animate</button>
                                    <button class="btn btn-ghost btn-sm" onclick="DrawingBoard.reset()">Reset</button>
                                </div>
                            </div>
                            <div id="pen-controls" style="display:flex; justify-content:flex-start; align-items:center; gap:15px; padding:0 4px">
                                <button class="btn btn-sm ${state.penOnly ? 'btn-primary' : 'btn-outline'} pen-toggle-btn" onclick="DrawingBoard.togglePenOnly()" title="Ignore hand/finger touch, only draw with pen/stylus">
                                    ${state.penOnly ? 'Pen Only: ON' : 'Pen Only: OFF'}
                                </button>
                                <button class="btn btn-sm ${state.freehandGuide ? 'btn-outline' : 'btn-primary'} freehand-guide-toggle-btn" onclick="DrawingBoard.toggleFreehandGuide()" title="Show or hide the faint guide outline in freehand mode">Guide: ${state.freehandGuide ? 'ON' : 'OFF'}</button>
                                <div style="flex:1; display:flex; align-items:center; gap:8px">
                                    <span style="font-size:0.7rem; color:var(--text-3)">Size</span>
                                    <input type="range" min="1" max="15" value="${state.strokeWidth}" oninput="DrawingBoard.setPenWidth(this.value)" style="flex:1; height:4px">
                                </div>
                            </div>
                        </div>
                        
                        <div class="canvas-container" style="width:300px; height:300px; background:var(--off-white); border:2px dashed var(--border); border-radius:var(--radius); position:relative; overflow:hidden">
                            <div id="modal-hanzi-writer" style="width:100%; height:100%"></div>
                            <canvas id="modal-freehand-canvas" style="position:absolute; inset:0; width:100%; height:100%; cursor:crosshair; display:none"></canvas>
                        </div>
                        
                        <div style="display:flex; justify-content:space-between; width:100%; max-width:320px; align-items:center">
                            <button class="btn btn-secondary btn-sm" ${currentIndex === 0 ? 'disabled' : ''} onclick="window._prevChar()">Previous</button>
                            <div style="font-weight:700; color:var(--text-3)">${currentIndex + 1} / ${characters.length}</div>
                            <button class="btn btn-secondary btn-sm" ${currentIndex === characters.length - 1 ? 'disabled' : ''} onclick="window._nextChar()">Next</button>
                        </div>
                    </div>
                </div>
            `);
            
            setTimeout(() => {
                init('modal-hanzi-writer', 'modal-freehand-canvas', activeCharObj.char);
            }, 100);
        };
        
        window._nextChar = () => { if (currentIndex < characters.length - 1) { currentIndex++; renderModal(); } };
        window._prevChar = () => { if (currentIndex > 0) { currentIndex--; renderModal(); } };
        
        renderModal();
    }

    window.addEventListener('blur', () => {
        if (state.isDrawing) {
            state.isDrawing = false;
            state.activePointerId = null;
            window.removeEventListener('pointerup', handleGlobalPointerUp);
            window.removeEventListener('pointercancel', handleGlobalPointerUp);
        }
    });

    return {
        init,
        reset,
        animate,
        setMode,
        open,
        setPenOnly: (v) => { state.penOnly = v; },
        togglePenOnly,
        toggleFreehandGuide,
        setStrokeOrderStep,
        setFreehandGuide: (v) => { state.freehandGuide = !!v; localStorage.setItem('zhongwen_freehand_guide', state.freehandGuide ? '1' : '0'); applyGuideVisibility(); syncUI(); },
        setPenWidth: (v) => { state.strokeWidth = parseInt(v); },
        getState: () => state
    };
})();


