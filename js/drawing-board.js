/**
 * drawing-board.js
 * A non-intrusive controller for HanziWriter and a freehand canvas.
 * Refactored to support multiple concurrent instances on the same page.
 */

window.DrawingBoard = (() => {
    let instances = {}; // Registry of active canvas instances indexed by canvasId
    let activeCanvasId = null; // Canvas ID last interacted with

    let state = {
        penOnly: false,
        freehandGuide: localStorage.getItem('zhongwen_freehand_guide') !== '0'
    };

    function isPalmTouch(e) {
        if (e.pointerType === 'touch') {
            if ((e.width && e.width > 35) || (e.height && e.height > 35)) {
                return true;
            }
        }
        return false;
    }

    function getContextFromEvent() {
        const target = window.event?.target;
        if (!target) return null;
        
        let current = target;
        while (current && current !== document.body) {
            const canvas = current.querySelector('canvas');
            if (canvas) {
                const writerTarget = current.querySelector('[id*="hanzi-writer"]') || current.querySelector('.canvas-writer');
                return { canvas, writerTarget, container: current };
            }
            current = current.parentElement;
        }
        return null;
    }

    function getActiveInstance() {
        const ctx = getContextFromEvent();
        if (ctx && ctx.canvas && instances[ctx.canvas.id]) {
            activeCanvasId = ctx.canvas.id;
            return instances[ctx.canvas.id];
        }
        if (activeCanvasId && instances[activeCanvasId]) {
            return instances[activeCanvasId];
        }
        const keys = Object.keys(instances);
        if (keys.length > 0) return instances[keys[0]];
        return null;
    }

    function fixPenInput() {
        state.penOnly = false;
        const inst = getActiveInstance();
        syncUI(inst);
        if (window.showToast) {
            showToast("Pen Only disabled. Touch drawing enabled. (Standard stylus fallback active)");
        } else {
            alert("Pen Only mode disabled so you can write. (Your stylus is registering as a touch/mouse device, so we enabled touch drawing)");
        }
    }

    function togglePenOnly() {
        state.penOnly = !state.penOnly;
        const inst = getActiveInstance();
        syncUI(inst);
    }

    function toggleFreehandGuide() {
        state.freehandGuide = !state.freehandGuide;
        localStorage.setItem('zhongwen_freehand_guide', state.freehandGuide ? '1' : '0');
        
        const inst = getActiveInstance();
        if (inst) {
            applyGuideVisibility(inst);
            syncUI(inst);
        }
    }

    function applyGuideVisibility(inst) {
        if (!inst || !inst.hw) return;
        if (inst.isExam) {
            if (typeof inst.hw.hideOutline === 'function') inst.hw.hideOutline();
            if (typeof inst.hw.hideCharacter === 'function') inst.hw.hideCharacter();
            return;
        }
        if (inst.mode === 'guided' || state.freehandGuide) {
            if (typeof inst.hw.showOutline === 'function') inst.hw.showOutline();
        } else {
            if (typeof inst.hw.hideOutline === 'function') inst.hw.hideOutline();
        }
        if (typeof inst.hw.hideCharacter === 'function') inst.hw.hideCharacter();
    }

    function syncUI(targetInst) {
        const inst = targetInst || getActiveInstance();
        if (!inst || !inst.canvas) return;

        // Scope DOM updates only to the container representing this writing board instance
        const container = inst.canvas.closest('.writing-task') || inst.canvas.closest('.canvas-container')?.parentElement || document;

        const modeSelects = container.querySelectorAll('select[onchange*="DrawingBoard.setMode"]');
        modeSelects.forEach(s => s.value = inst.mode);

        const penControls = [
            container.querySelector('#pen-controls'), 
            container.querySelector('#app-pen-controls'),
            container.querySelector('.canvas-controls')
        ];
        penControls.forEach(c => {
            if (c) c.style.display = (inst.mode === 'freehand' || inst.mode === 'guided') ? 'flex' : 'none';
        });

        // Update Pen Only buttons inside this specific container
        const penButtons = container.querySelectorAll('.pen-toggle-btn');
        penButtons.forEach(btn => {
            btn.className = state.penOnly ? 'btn btn-sm btn-primary pen-toggle-btn' : 'btn btn-sm btn-outline pen-toggle-btn';
            btn.textContent = state.penOnly ? '🖊️ Pen Only: ON' : '🖊️ Pen Only: OFF';
        });

        const widthSliders = container.querySelectorAll('input[oninput*="DrawingBoard.setPenWidth"]');
        widthSliders.forEach(s => s.value = inst.strokeWidth);

        const guideButtons = container.querySelectorAll('.freehand-guide-toggle-btn');
        guideButtons.forEach(btn => {
            btn.className = state.freehandGuide ? 'btn btn-sm btn-outline freehand-guide-toggle-btn' : 'btn btn-sm btn-primary freehand-guide-toggle-btn';
            btn.textContent = state.freehandGuide ? 'Guide: ON' : 'Guide: OFF';
            btn.setAttribute('aria-pressed', state.freehandGuide ? 'true' : 'false');
        });
    }

    // Capture-phase event handler to block non-pen inputs before HanziWriter gets them
    function handleCaptureEvent(e, inst) {
        if (state.penOnly && e.pointerType !== 'pen') {
            e.stopPropagation();
            e.preventDefault();
            return;
        }
        if (isPalmTouch(e)) {
            e.stopPropagation();
            e.preventDefault();
        }
    }

    function init(writerTargetId, canvasId, hanzi) {
        const writerTarget = document.getElementById(writerTargetId);
        const canvas = document.getElementById(canvasId);
        if (!writerTarget || !canvas) return;

        const isExam = canvasId.startsWith('writing-canvas-w_');
        // Initialize unique state mapping for this canvas ID
        instances[canvasId] = {
            canvasId: canvasId,
            writerTargetId: writerTargetId,
            canvas: canvas,
            writerTarget: writerTarget,
            ctx: canvas.getContext('2d'),
            hanzi: hanzi,
            hw: null,
            mode: isExam ? 'freehand' : 'guided',
            isExam: isExam,
            strokeWidth: 4,
            isDrawing: false,
            activePointerId: null,
            activeButtons: 0,
            lastPointerEventTime: 0,
            lastPos: null,
            points: [],
            frameId: null,
            buttonHandled: false,
            isEraserMode: false
        };

        const inst = instances[canvasId];
        activeCanvasId = canvasId;

        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        inst.strokeColor = theme === 'dark' ? '#e8e4df' : '#2C3E50';
        inst.outlineColor = theme === 'dark' ? '#333333' : '#EAEAEA';

        canvas.style.touchAction = 'none';
        writerTarget.style.touchAction = 'none';
        
        // Ensure canvas is correctly sized
        resizeCanvas(inst);

        // Initialize HanziWriter
        initHanziWriter(inst);

        // Canvas events (Freehand)
        canvas.onpointerdown = (e) => handlePointerDown(e, inst);
        canvas.onpointermove = (e) => handlePointerMove(e, inst);
        canvas.onpointerup = (e) => handlePointerUp(e, inst);
        canvas.onpointercancel = (e) => handlePointerUp(e, inst);
        
        if (canvas._captureHandler) {
            canvas.removeEventListener('lostpointercapture', canvas._captureHandler);
        }
        canvas._captureHandler = (e) => handleLostPointerCapture(e, inst);
        canvas.addEventListener('lostpointercapture', canvas._captureHandler);

        // Block touch events for Guided mode when Pen Only is enabled
        const container = writerTarget.parentElement;
        if (container) {
            if (container._captureHandler) {
                container.removeEventListener('pointerdown', container._captureHandler, true);
                container.removeEventListener('pointermove', container._captureHandler, true);
            }
            container._captureHandler = (e) => handleCaptureEvent(e, inst);
            container.addEventListener('pointerdown', container._captureHandler, true);
            container.addEventListener('pointermove', container._captureHandler, true);
        }

        // Auto-resize handling
        window.removeEventListener('resize', handleResize);
        window.addEventListener('resize', handleResize);
        window.removeEventListener('scratchpad:open', resetAllInteractionStates);
        window.removeEventListener('scratchpad:closed', resetAllInteractionStates);
        window.addEventListener('scratchpad:open', resetAllInteractionStates);
        window.addEventListener('scratchpad:closed', resetAllInteractionStates);
        
        // Initial visibility
        setMode(inst.mode, inst);
        syncUI(inst);
    }

    function ensureHanziWriter() {
        if (typeof HanziWriter !== 'undefined') return Promise.resolve();
        // Since hwLoading is global, it is safe to keep it as a promise on window/DrawingBoard
        if (window._hwLoadingPromise) return window._hwLoadingPromise;
        
        window._hwLoadingPromise = new Promise((resolve, reject) => {
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
        });
        return window._hwLoadingPromise;
    }

    function initHanziWriter(inst) {
        if (!inst.writerTarget) return;
        if (typeof HanziWriter === 'undefined') {
            inst.writerTarget.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-2)">Loading writing engine...</div>';
            ensureHanziWriter().then(() => initHanziWriter(inst)).catch(() => {
                inst.writerTarget.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-2)">Writing engine could not load. Freehand mode still works.</div>';
            });
            return;
        }
        inst.writerTarget.innerHTML = '';
        
        const rect = inst.writerTarget.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height) - 20;
        
        inst.hw = HanziWriter.create(inst.writerTarget.id, inst.hanzi, {
            width: size > 0 ? size : 280,
            height: size > 0 ? size : 280,
            padding: 10,
            showCharacter: false,
            showOutline: true,
            strokeAnimationSpeed: 1.5,
            delayBetweenStrokes: 50,
            strokeColor: inst.strokeColor,
            outlineColor: inst.outlineColor,
            highlightColor: '#C0392B',
            drawingColor: inst.strokeColor === '#e8e4df' ? '#ffffff' : '#000000',
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

        applyGuideVisibility(inst);

        if (inst.mode === 'guided') {
            inst.hw.quiz();
        }
    }

    function resizeCanvas(inst) {
        if (!inst.canvas) return;
        const rect = inst.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Match logical size to container
        inst.canvas.style.width = rect.width + 'px';
        inst.canvas.style.height = rect.height + 'px';
        
        // Match internal buffer to physical pixels for precision
        inst.canvas.width = rect.width * dpr;
        inst.canvas.height = rect.height * dpr;
        
        // Scale context to match logical coordinates
        inst.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        clearFreehand(inst);
    }

    function handleResize() {
        Object.values(instances).forEach(inst => {
            if (inst.canvas) resizeCanvas(inst);
        });
    }

    function setMode(mode, targetInst) {
        const inst = targetInst || getActiveInstance();
        if (!inst) return;
        
        inst.mode = mode;
        inst.buttonHandled = false;
        inst.isEraserMode = false;
        if (!inst.canvas) return;

        hideStrokeOrderPanel(inst);

        if (mode === 'guided') {
            inst.canvas.style.display = 'none';
            inst.canvas.style.pointerEvents = 'none';
            if (inst.hw) {
                inst.hw.cancelAnimation?.();
                inst.hw.hideCharacter?.();
                inst.hw.showOutline?.();
                inst.hw.quiz();
            }
        } else if (mode === 'freehand') {
            inst.canvas.style.display = 'block';
            inst.canvas.style.pointerEvents = 'auto';
            inst.canvas.style.zIndex = '10';
            if (inst.hw) {
                inst.hw.cancelQuiz();
                inst.hw.cancelAnimation?.();
                applyGuideVisibility(inst);
            }
        } else if (mode === 'stroke-order') {
            inst.canvas.style.display = 'none';
            inst.canvas.style.pointerEvents = 'none';
            if (inst.hw) {
                inst.hw.cancelQuiz();
                inst.hw.cancelAnimation?.();
                inst.hw.hideCharacter?.();
                inst.hw.showOutline?.();
            }
            showStrokeOrderMode(inst);
        } else if (mode === 'animated') {
            inst.canvas.style.display = 'none';
            inst.canvas.style.pointerEvents = 'none';
            playAnimatedCharacter(inst);
        }
        syncUI(inst);
    }

    function escapeAttr(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    function strokeStripHost(inst) {
        const canvasContainer = inst.canvas?.parentElement || inst.writerTarget?.parentElement;
        return canvasContainer?.parentElement || canvasContainer || null;
    }

    function upsertStrokePanel(inst) {
        const host = strokeStripHost(inst);
        if (!host) return null;
        let panel = Array.from(host.children).find(child => child.classList?.contains('drawing-stroke-strip'));
        if (!panel) {
            panel = document.createElement('div');
            panel.className = 'drawing-stroke-strip';
            const canvasContainer = inst.canvas?.parentElement || inst.writerTarget?.parentElement;
            if (canvasContainer && canvasContainer.parentElement === host) {
                canvasContainer.insertAdjacentElement('afterend', panel);
            } else {
                host.appendChild(panel);
            }
        }
        return panel;
    }

    function hideStrokeOrderPanel(inst) {
        const host = strokeStripHost(inst);
        const panel = host ? Array.from(host.children).find(child => child.classList?.contains('drawing-stroke-strip')) : null;
        if (panel) panel.hidden = true;
    }

    function strokePreviewSvg(inst, strokes, count) {
        const strokeColor = inst.strokeColor || '#1f2937';
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c0392b';
        const visible = strokes.slice(0, count);
        return `
            <svg viewBox="0 0 1024 1024" role="img" aria-label="${count} strokes shown">
                <g transform="translate(0,900) scale(1,-1)">
                    ${visible.map((path, index) => `<path d="${escapeAttr(path)}" fill="${index === count - 1 ? accentColor : strokeColor}" opacity="${index === count - 1 ? '1' : '0.45'}"></path>`).join('')}
                </g>
            </svg>`;
    }

    function renderStrokeOrder(inst, strokes, count = 1) {
        const panel = upsertStrokePanel(inst);
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
                <div class="drawing-stroke-preview">${strokePreviewSvg(inst, strokes, current)}</div>
                <div class="drawing-stroke-controls">
                    <div class="drawing-stroke-count"><strong>${current}</strong> / ${total} strokes</div>
                    <input type="range" min="1" max="${total}" value="${current}" oninput="DrawingBoard.setStrokeOrderStep(this.value)">
                </div>
            </div>`;
    }

    async function loadStrokeData(inst) {
        const url = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/' + encodeURIComponent(inst.hanzi) + '.json';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Fetch failed: ' + res.status);
        const charData = await res.json();
        return charData?.strokes || [];
    }

    async function showStrokeOrderMode(inst) {
        try {
            const strokes = await loadStrokeData(inst);
            renderStrokeOrder(inst, strokes, strokes.length);
        } catch (err) {
            console.warn('Stroke order display failed:', err);
            const panel = upsertStrokePanel(inst);
            if (panel) {
                panel.hidden = false;
                panel.innerHTML = '<div class="drawing-stroke-empty">Could not load stroke order for this character.</div>';
            }
        }
    }

    async function setStrokeOrderStep(value) {
        const inst = getActiveInstance();
        if (!inst) return;
        try {
            const strokes = await loadStrokeData(inst);
            renderStrokeOrder(inst, strokes, value);
        } catch (err) {
            console.warn('Stroke order slider failed:', err);
        }
    }

    function playAnimatedCharacter(inst) {
        if (!inst.hw) return;
        try {
            inst.hw.cancelQuiz();
            inst.hw.cancelAnimation?.();
            inst.hw.hideCharacter?.();
            inst.hw.showOutline?.();
            inst.hw.animateCharacter();
        } catch (err) {
            console.warn('Stroke animation failed:', err);
        }
    }

    function animate() {
        const inst = getActiveInstance();
        if (inst) setMode('animated', inst);
    }

    function reset() {
        const inst = getActiveInstance();
        if (inst) {
            clearFreehand(inst);
            initHanziWriter(inst);
        }
    }

    function clearFreehand(inst) {
        if (!inst || !inst.ctx) return;
        const dpr = window.devicePixelRatio || 1;
        inst.ctx.clearRect(0, 0, inst.canvas.width / dpr, inst.canvas.height / dpr);
    }

    function resetInteractionState(inst) {
        if (!inst) return;
        inst.isDrawing = false;
        inst.lastPos = null;
        const pointerId = inst.activePointerId;
        inst.activePointerId = null;
        inst.points = [];
        if (inst.frameId) { cancelAnimationFrame(inst.frameId); inst.frameId = null; }
        if (inst.canvas && pointerId != null) {
            try { inst.canvas.releasePointerCapture?.(pointerId); } catch(_) {}
        }
    }

    function resetAllInteractionStates() {
        Object.values(instances).forEach(resetInteractionState);
    }

    function handleGlobalPointerUp(e, inst) {
        if (e.pointerId === inst.activePointerId) {
            handlePointerUp(e, inst);
            window.removeEventListener('pointerup', inst._globalPointerUpHandler);
            window.removeEventListener('pointercancel', inst._globalPointerUpHandler);
        }
    }

    function handleLostPointerCapture(e, inst) {
        if (e.pointerId === inst.activePointerId) {
            inst.isDrawing = false;
            inst.activePointerId = null;
            window.removeEventListener('pointerup', inst._globalPointerUpHandler);
            window.removeEventListener('pointercancel', inst._globalPointerUpHandler);
        }
    }

    function getStylusAction() {
        return localStorage.getItem('zhongwen_stylus_button_action') || 'erase_hold';
    }

    function handleStylusButtonAction(e, inst) {
        if (e.pointerType !== 'pen') return false;
        const barrelPressed = (e.buttons & (2 | 4)) !== 0;
        if (!barrelPressed) return false;

        const action = getStylusAction();
        if (action === 'toggle_tool') {
            if (!inst.buttonHandled) {
                inst.buttonHandled = true;
                inst.isEraserMode = !inst.isEraserMode;
                if (window.showToast) {
                    showToast(inst.isEraserMode ? "Eraser mode active" : "Pen mode active");
                }
            }
            return true;
        } else if (action === 'clear') {
            if (!inst.buttonHandled) {
                inst.buttonHandled = true;
                clearFreehand(inst);
            }
            return true;
        } else if (action === 'disabled') {
            return true;
        }
        return false;
    }

    function handlePointerDown(e, inst) {
        if (inst.mode !== 'freehand') return;

        if (state.penOnly && e.pointerType !== 'pen') {
            return;
        }

        if (isPalmTouch(e)) {
            return;
        }

        activeCanvasId = inst.canvasId;

        // Stuck state recovery and multi-touch rejection
        if (inst.isDrawing) {
            const timeSinceLastEvent = Date.now() - inst.lastPointerEventTime;
            if (e.pointerType === 'pen' || e.pointerId === inst.activePointerId || timeSinceLastEvent > 500) {
                inst.isDrawing = false;
                inst.activePointerId = null;
                window.removeEventListener('pointerup', inst._globalPointerUpHandler);
                window.removeEventListener('pointercancel', inst._globalPointerUpHandler);
            } else {
                return;
            }
        }

        inst.isDrawing = true;
        inst.activePointerId = e.pointerId;
        inst.activeButtons = e.buttons;
        inst.buttonHandled = false;
        if (handleStylusButtonAction(e, inst)) {
            if (e.cancelable) e.preventDefault();
            return;
        }
        inst.lastPointerEventTime = Date.now();
        inst.lastPos = getPos(e, inst);
        
        try {
            inst.canvas.setPointerCapture(e.pointerId);
        } catch (_) {}

        inst.points = [inst.lastPos];

        inst.ctx.beginPath();
        inst.ctx.lineCap = 'round';
        inst.ctx.lineJoin = 'round';
        
        const action = getStylusAction();
        const isEraseHold = action === 'erase_hold';
        const barrelPressed = e.pointerType === 'pen' && (inst.activeButtons & (2 | 4)) !== 0;
        const tailPressed = e.pointerType === 'pen' && (inst.activeButtons & 32) !== 0;
        const useEraser = inst.isEraserMode || tailPressed || (isEraseHold && barrelPressed);
        if (useEraser) {
            inst.ctx.globalCompositeOperation = 'destination-out';
            inst.ctx.strokeStyle = 'rgba(0,0,0,1)';
            inst.ctx.lineWidth = Math.max(20, inst.strokeWidth * 3);
        } else {
            inst.ctx.globalCompositeOperation = 'source-over';
            inst.ctx.strokeStyle = inst.strokeColor;
            inst.ctx.lineWidth = inst.strokeWidth;
        }
        inst.ctx.moveTo(inst.lastPos.x, inst.lastPos.y);

        if (!inst.frameId) {
            inst.frameId = requestAnimationFrame(() => drawFrame(inst));
        }

        if (inst._globalPointerUpHandler) {
            window.removeEventListener('pointerup', inst._globalPointerUpHandler);
            window.removeEventListener('pointercancel', inst._globalPointerUpHandler);
        }
        inst._globalPointerUpHandler = (ev) => handleGlobalPointerUp(ev, inst);
        window.addEventListener('pointerup', inst._globalPointerUpHandler);
        window.addEventListener('pointercancel', inst._globalPointerUpHandler);

        if (e.cancelable) e.preventDefault();
    }

    function handlePointerMove(e, inst) {
        inst.activeButtons = e.buttons;
        if (handleStylusButtonAction(e, inst)) {
            if (inst.isDrawing && e.pointerId === inst.activePointerId) {
                inst.isDrawing = false;
                inst.activePointerId = null;
                window.removeEventListener('pointerup', inst._globalPointerUpHandler);
                window.removeEventListener('pointercancel', inst._globalPointerUpHandler);
            }
            if (e.cancelable) e.preventDefault();
            return;
        }

        const isMouse = e.pointerType === 'mouse';
        if (isMouse && inst.isDrawing && e.pointerId === inst.activePointerId && e.buttons === 0) {
            inst.isDrawing = false;
            inst.activePointerId = null;
            inst.activeButtons = 0;
            try {
                inst.canvas.releasePointerCapture(e.pointerId);
            } catch (_) {}
            window.removeEventListener('pointerup', inst._globalPointerUpHandler);
            window.removeEventListener('pointercancel', inst._globalPointerUpHandler);
            return;
        }

        if (!inst.isDrawing) return;
        if (e.pointerId !== inst.activePointerId) return;
        if (state.penOnly && e.pointerType !== 'pen') return;
        if (isPalmTouch(e)) return;

        inst.lastPointerEventTime = Date.now();

        if (e.getCoalescedEvents) {
            const events = e.getCoalescedEvents();
            for (const ev of events) {
                inst.points.push(getPos(ev, inst));
            }
        } else {
            inst.points.push(getPos(e, inst));
        }
    }

    function drawFrame(inst) {
        if (inst.points.length > 1) {
            inst.ctx.beginPath();
            
            const action = getStylusAction();
            const isEraseHold = action === 'erase_hold';
            const barrelPressed = (inst.activeButtons & (2 | 4)) !== 0;
            const tailPressed = (inst.activeButtons & 32) !== 0;
            const useEraser = inst.isEraserMode || tailPressed || (isEraseHold && barrelPressed);
            if (useEraser) {
                inst.ctx.globalCompositeOperation = 'destination-out';
                inst.ctx.strokeStyle = 'rgba(0,0,0,1)';
                inst.ctx.lineWidth = Math.max(20, inst.strokeWidth * 3);
            } else {
                inst.ctx.globalCompositeOperation = 'source-over';
                inst.ctx.strokeStyle = inst.strokeColor;
                inst.ctx.lineWidth = inst.strokeWidth;
            }
            
            inst.ctx.lineCap = 'round';
            inst.ctx.lineJoin = 'round';
            inst.ctx.moveTo(inst.lastPos.x, inst.lastPos.y);
            
            for (let i = 1; i < inst.points.length; i++) {
                inst.ctx.lineTo(inst.points[i].x, inst.points[i].y);
                inst.lastPos = inst.points[i];
            }
            inst.ctx.stroke();
            inst.points = [inst.lastPos];
        }
        
        if (inst.isDrawing) {
            inst.frameId = requestAnimationFrame(() => drawFrame(inst));
        } else {
            inst.frameId = null;
        }
    }

    function handlePointerUp(e, inst) {
        if (e.pointerId === inst.activePointerId) {
            if (inst.isDrawing) {
                const currentPos = getPos(e, inst);
                inst.points.push(currentPos);
                drawFrame(inst);
            }
            inst.isDrawing = false;
            inst.activePointerId = null;
            inst.activeButtons = 0;
            if (inst.canvas && e.pointerId) {
                try { inst.canvas.releasePointerCapture(e.pointerId); } catch(err) {}
            }
        }
        inst.buttonHandled = false;
    }

    function getPos(e, inst) {
        const rect = inst.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = inst.canvas.width / dpr;
        const logicalHeight = inst.canvas.height / dpr;
        const scaleX = rect.width ? logicalWidth / rect.width : 1;
        const scaleY = rect.height ? logicalHeight / rect.height : 1;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    function open(text) {
        if (!text) return;
        
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
                            <div id="pen-controls" style="display:flex; justify-content:flex-start; align-items:center; gap:15px; padding:0 4px; flex-wrap:wrap">
                                <button class="btn btn-sm ${state.penOnly ? 'btn-primary' : 'btn-outline'} pen-toggle-btn" onclick="DrawingBoard.togglePenOnly()" title="Ignore hand/finger touch, only draw with pen/stylus">
                                    ${state.penOnly ? 'Pen Only: ON' : 'Pen Only: OFF'}
                                </button>
                                <button class="btn btn-sm btn-error fix-pen-btn" onclick="DrawingBoard.fixPenInput()" title="Click if your pen/stylus is not drawing">Fix Pen 🛠️</button>
                                <button class="btn btn-sm btn-outline restart-stylus-btn" onclick="DrawingBoard.restartStylus()" title="Restart stylus pointer connection and listeners">Restart Stylus 🔄</button>
                                <button class="btn btn-sm ${state.freehandGuide ? 'btn-outline' : 'btn-primary'} freehand-guide-toggle-btn" onclick="DrawingBoard.toggleFreehandGuide()" title="Show or hide the faint guide outline in freehand mode">Guide: ${state.freehandGuide ? 'ON' : 'OFF'}</button>
                                <select id="db-stylus-action" class="input input-sm stylus-action-select" style="height:36px; background:var(--card-bg); color:var(--text); border-color:var(--border); font-size:0.75rem; font-weight:800; padding:0 8px;" onchange="DrawingBoard.setStylusAction(this.value)" title="Stylus Button Action">
                                    <option value="erase_hold">Stylus: Hold to Erase</option>
                                    <option value="toggle_tool">Stylus: Toggle Pen/Eraser</option>
                                    <option value="clear">Stylus: Click to Clear</option>
                                    <option value="disabled">Stylus: Button Disabled</option>
                                </select>
                                <div style="flex:1; display:flex; align-items:center; gap:8px">
                                    <span style="font-size:0.7rem; color:var(--text-3)">Size</span>
                                    <input type="range" min="1" max="15" value="${state.strokeWidth || 4}" oninput="DrawingBoard.setPenWidth(this.value)" style="flex:1; height:4px">
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
                const dbStylusSelect = document.getElementById('db-stylus-action');
                if (dbStylusSelect) {
                    dbStylusSelect.value = localStorage.getItem('zhongwen_stylus_button_action') || 'erase_hold';
                }
            }, 100);
        };
        
        window._nextChar = () => { if (currentIndex < characters.length - 1) { currentIndex++; renderModal(); } };
        window._prevChar = () => { if (currentIndex > 0) { currentIndex--; renderModal(); } };
        
        renderModal();
    }

    window.addEventListener('blur', () => {
        Object.values(instances).forEach(inst => {
            if (inst.isDrawing) {
                inst.isDrawing = false;
                inst.activePointerId = null;
                window.removeEventListener('pointerup', inst._globalPointerUpHandler);
                window.removeEventListener('pointercancel', inst._globalPointerUpHandler);
            }
        });
    });

    function handleGlobalKeyDown(e) {
        const inst = getActiveInstance();
        if (!inst || inst.mode !== 'freehand') return;
        
        if (e.key === 'PageUp' || e.key === 'PageDown' || e.code === 'PageUp' || e.code === 'PageDown') {
            e.preventDefault();
            e.stopPropagation();
            
            const isPageDown = e.key === 'PageDown' || e.code === 'PageDown';
            if (isPageDown) {
                if (!inst.buttonHandled) {
                    inst.buttonHandled = true;
                    inst.isEraserMode = !inst.isEraserMode;
                    if (window.showToast) {
                        showToast(inst.isEraserMode ? "Eraser mode active 🧹" : "Pen mode active 🖊️");
                    }
                }
            }
        }
    }

    function handleGlobalKeyUp(e) {
        const inst = getActiveInstance();
        if (!inst || inst.mode !== 'freehand') return;
        
        if (e.key === 'PageUp' || e.key === 'PageDown' || e.code === 'PageUp' || e.code === 'PageDown') {
            e.preventDefault();
            e.stopPropagation();
            inst.buttonHandled = false;
        }
    }

    function restartStylus(targetInst) {
        const inst = targetInst || getActiveInstance();
        if (!inst) return;

        inst.isDrawing = false;
        inst.activePointerId = null;
        inst.buttonHandled = false;
        inst.isEraserMode = false;
        inst.points = [];
        if (inst.frameId) {
            cancelAnimationFrame(inst.frameId);
            inst.frameId = null;
        }

        try {
            inst.canvas.releasePointerCapture(inst.activePointerId);
        } catch (_) {}

        inst.canvas.onpointerdown = null;
        inst.canvas.onpointermove = null;
        inst.canvas.onpointerup = null;
        inst.canvas.onpointercancel = null;

        inst.canvas.onpointerdown = (e) => handlePointerDown(e, inst);
        inst.canvas.onpointermove = (e) => handlePointerMove(e, inst);
        inst.canvas.onpointerup = (e) => handlePointerUp(e, inst);
        inst.canvas.onpointercancel = (e) => handlePointerUp(e, inst);

        if (window.showToast) {
            showToast("Stylus input restarted! Ready to write. 🖊️");
        } else {
            alert("Stylus input restarted!");
        }
    }

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    window.addEventListener('keyup', handleGlobalKeyUp, { capture: true });

    return {
        init,
        reset,
        animate,
        setMode,
        open,
        setPenOnly: (v) => { state.penOnly = v; },
        togglePenOnly,
        fixPenInput,
        restartStylus,
        toggleFreehandGuide,
        setStrokeOrderStep,
        setFreehandGuide: (v) => { 
            state.freehandGuide = !!v; 
            localStorage.setItem('zhongwen_freehand_guide', state.freehandGuide ? '1' : '0'); 
            Object.values(instances).forEach(applyGuideVisibility); 
            const inst = getActiveInstance();
            syncUI(inst); 
        },
        setPenWidth: (v) => { 
            const inst = getActiveInstance();
            if (inst) {
                inst.strokeWidth = parseInt(v) || 4;
                syncUI(inst);
            }
        },
        setStylusAction: (v) => {
            localStorage.setItem('zhongwen_stylus_button_action', v);
            const selects = document.querySelectorAll('#db-stylus-action, #sp-stylus-action');
            selects.forEach(s => s.value = v);
        },
        getState: () => state,
        getInstances: () => instances,
        getActiveInstance
    };
})();
