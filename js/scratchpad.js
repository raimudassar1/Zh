/**
 * scratchpad.js
 * A self-contained, full-screen writing pad with pressure-sensitive drawing,
 * eraser size previews, palm rejection (stylus-only mode), and styling.
 */

'use strict';

window.Scratchpad = (() => {
    let state = {
        isOpen: false,
        isDrawing: false,
        tool: 'pressure', // pen | pressure | eraser
        penColor: '#171717',
        penSize: 6,
        eraserSize: 30,
        stylusOnly: false,
        lastPos: null
    };

    let elements = {};
    let ctx = null;
    let activePointerId = null;
    let lastPointerEventTime = 0;

    // Inject CSS styles dynamically
    function injectStyles() {
        if (document.getElementById('scratchpad-styles')) return;
        const style = document.createElement('style');
        style.id = 'scratchpad-styles';
        style.textContent = `
            /* Floating Action Button */
            .scratchpad-fab {
                position: fixed;
                right: 18px;
                bottom: 85px;
                width: 52px;
                height: 52px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--red) 0%, var(--red-dark) 100%);
                color: #ffffff;
                border: none;
                box-shadow: 0 4px 14px rgba(180, 35, 24, 0.4);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999;
                transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
            }
            .scratchpad-fab:hover {
                transform: scale(1.08);
                box-shadow: 0 6px 20px rgba(180, 35, 24, 0.5);
            }
            .scratchpad-fab:active {
                transform: scale(0.95);
            }
            .scratchpad-fab svg {
                width: 24px;
                height: 24px;
                fill: currentColor;
            }

            /* Overlay Screen */
            .scratchpad-overlay {
                position: fixed;
                inset: 0;
                background: var(--warm-white);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.22s ease-in-out;
            }
            .scratchpad-overlay.open {
                opacity: 1;
                pointer-events: auto;
            }

            /* Header Controls */
            .scratchpad-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 16px;
                border-bottom: 1px solid var(--border);
                background: var(--card-bg);
                gap: 12px;
                flex-wrap: wrap;
            }
            .scratchpad-header-left {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .scratchpad-header-title {
                font-weight: 700;
                font-size: 1.05rem;
                color: var(--text);
            }
            .scratchpad-toolbar {
                display: flex;
                align-items: center;
                gap: 14px;
                flex-wrap: wrap;
            }

            /* Button Groups */
            .scratchpad-btn-group {
                display: flex;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                overflow: hidden;
            }
            .scratchpad-btn-group button {
                padding: 6px 12px;
                font-size: 0.82rem;
                font-weight: 700;
                background: var(--off-white);
                color: var(--text-2);
                border: none;
                cursor: pointer;
                transition: all 0.15s;
            }
            .scratchpad-btn-group button.active {
                background: var(--accent);
                color: #ffffff;
            }

            /* Color Palette */
            .scratchpad-palette {
                display: flex;
                gap: 6px;
                align-items: center;
            }
            .scratchpad-color-dot {
                width: 22px;
                height: 22px;
                border-radius: 50%;
                border: 2px solid transparent;
                cursor: pointer;
                transition: transform 0.15s, border-color 0.15s;
            }
            .scratchpad-color-dot:hover {
                transform: scale(1.15);
            }
            .scratchpad-color-dot.active {
                border-color: var(--accent);
                transform: scale(1.1);
            }

            /* Slider */
            .scratchpad-slider-wrap {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .scratchpad-slider-label {
                font-size: 0.78rem;
                color: var(--text-3);
                min-width: 60px;
            }
            .scratchpad-slider {
                width: 90px;
                height: 4px;
                cursor: pointer;
            }

            /* Canvas Container with Dotted Paper Grid */
            .scratchpad-canvas-container {
                flex: 1;
                position: relative;
                background-color: var(--warm-white);
                background-image: radial-gradient(var(--border) 1px, transparent 1px);
                background-size: 24px 24px;
                overflow: hidden;
            }
            .scratchpad-canvas {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                cursor: crosshair;
                touch-action: none;
            }

            /* Eraser Bounding Box Cursor */
            .scratchpad-eraser-cursor {
                position: fixed;
                pointer-events: none;
                border: 1px dashed rgba(180, 35, 24, 0.6);
                background: rgba(180, 35, 24, 0.08);
                border-radius: 50%;
                display: none;
                z-index: 11000;
                transform: translate(-50%, -50%);
            }

            /* Adjust FAB spacing when keyboard/navigation is up */
            @media (max-width: 768px) {
                .scratchpad-fab {
                    bottom: 95px;
                    width: 48px;
                    height: 48px;
                }
                .scratchpad-header {
                    padding: 8px 12px;
                }
                .scratchpad-toolbar {
                    gap: 8px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Build Floating Action Button and Overlay elements
    function buildUI() {
        injectStyles();

        // 1. Create Floating Button
        const fab = document.createElement('button');
        fab.className = 'scratchpad-fab';
        fab.id = 'scratchpad-fab-btn';
        fab.title = 'Open Writing Pad';
        fab.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
        `;
        fab.addEventListener('click', show);
        document.body.appendChild(fab);

        // 2. Create Overlay Screen
        const overlay = document.createElement('div');
        overlay.className = 'scratchpad-overlay';
        overlay.id = 'scratchpad-draw-overlay';
        
        overlay.innerHTML = `
            <header class="scratchpad-header">
                <div class="scratchpad-header-left">
                    <button class="btn btn-ghost btn-sm" id="scratchpad-back-btn" style="min-height:34px; padding:0 12px">← Back</button>
                    <span class="scratchpad-header-title">Scratchpad</span>
                </div>
                
                <div class="scratchpad-toolbar">
                    <!-- Tool Selector -->
                    <div class="scratchpad-btn-group">
                        <button id="sp-btn-pen">🖋️ Pen</button>
                        <button id="sp-btn-pressure" class="active">🎨 Pressure Pen</button>
                        <button id="sp-btn-eraser">🧽 Erase</button>
                    </div>

                    <!-- Colors -->
                    <div class="scratchpad-palette" id="sp-palette">
                        ${['#171717', '#B42318', '#1F4E79', '#2F8F71', '#C98212'].map((c, i) => `
                            <button class="scratchpad-color-dot ${i === 0 ? 'active' : ''}" data-color="${c}" style="background-color: ${c}"></button>
                        `).join('')}
                    </div>

                    <!-- Size -->
                    <div class="scratchpad-slider-wrap">
                        <span class="scratchpad-slider-label" id="sp-size-label">Size: 6px</span>
                        <input type="range" class="scratchpad-slider" id="sp-size-slider" min="1" max="40" value="6">
                    </div>

                    <!-- Stylus Toggle -->
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.8rem; font-weight:700; color:var(--text-2); user-select:none">
                        <input type="checkbox" id="sp-stylus-only"> Stylus Only
                    </label>

                    <!-- Clear -->
                    <button class="btn btn-ghost btn-sm" id="sp-btn-clear" style="min-height:34px;">Clear 🗑️</button>
                </div>
            </header>
            
            <div class="scratchpad-canvas-container" id="sp-canvas-container">
                <canvas class="scratchpad-canvas" id="scratchpad-canvas"></canvas>
            </div>
            
            <!-- Custom Eraser Bounding Circle -->
            <div class="scratchpad-eraser-cursor" id="sp-eraser-cursor"></div>
        `;
        document.body.appendChild(overlay);

        // Save element references
        elements = {
            fab,
            overlay,
            canvas: document.getElementById('scratchpad-canvas'),
            canvasContainer: document.getElementById('sp-canvas-container'),
            backBtn: document.getElementById('scratchpad-back-btn'),
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

        // Bind UI Events
        elements.backBtn.addEventListener('click', hide);
        elements.btnPen.addEventListener('click', () => setTool('pen'));
        elements.btnPressure.addEventListener('click', () => setTool('pressure'));
        elements.btnEraser.addEventListener('click', () => setTool('eraser'));
        
        elements.palette.addEventListener('click', e => {
            const dot = e.target.closest('.scratchpad-color-dot');
            if (dot) {
                document.querySelectorAll('.scratchpad-color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                setPenColor(dot.dataset.color);
            }
        });

        elements.sizeSlider.addEventListener('input', e => {
            const val = parseInt(e.target.value);
            if (state.tool === 'pen' || state.tool === 'pressure') {
                state.penSize = val;
                elements.sizeLabel.textContent = `Size: ${val}px`;
            } else {
                state.eraserSize = val;
                elements.sizeLabel.textContent = `Size: ${val}px`;
                updateEraserCursorSize();
            }
        });

        elements.stylusToggle.addEventListener('change', e => {
            state.stylusOnly = e.target.checked;
        });

        elements.clearBtn.addEventListener('click', () => {
            if (confirm('Clear scratchpad?')) {
                clearCanvas();
            }
        });

        // Canvas Drawing Events
        elements.canvas.addEventListener('pointerdown', handlePointerDown);
        elements.canvas.addEventListener('pointermove', handlePointerMove);
        
        // Listen globally to window for pointer release to prevent stuck states
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);

        // Reset drawing state if window/app loses focus (e.g. notifications/status bar pull-down)
        window.addEventListener('blur', () => {
            state.isDrawing = false;
            activePointerId = null;
        });

        // Reset drawing state if element pointer capture is lost
        elements.canvas.addEventListener('lostpointercapture', e => {
            if (e.pointerId === activePointerId) {
                state.isDrawing = false;
                activePointerId = null;
            }
        });

        // Hide eraser cursor when leaving canvas
        elements.canvas.addEventListener('pointerleave', () => {
            elements.eraserCursor.style.display = 'none';
        });

        // Window resize
        window.addEventListener('resize', () => {
            if (state.isOpen) resizeCanvas();
        });
    }

    function setTool(tool) {
        state.tool = tool;
        elements.btnPen.className = tool === 'pen' ? 'active' : '';
        elements.btnPressure.className = tool === 'pressure' ? 'active' : '';
        elements.btnEraser.className = tool === 'eraser' ? 'active' : '';

        // Disable/enable color picker
        elements.palette.style.opacity = tool !== 'eraser' ? '1' : '0.4';
        elements.palette.style.pointerEvents = tool !== 'eraser' ? 'auto' : 'none';

        // Load correct size settings
        if (tool === 'pen' || tool === 'pressure') {
            elements.sizeSlider.value = state.penSize;
            elements.sizeLabel.textContent = `Size: ${state.penSize}px`;
            elements.eraserCursor.style.display = 'none';
        } else {
            elements.sizeSlider.value = state.eraserSize;
            elements.sizeLabel.textContent = `Size: ${state.eraserSize}px`;
            updateEraserCursorSize();
        }
    }

    function setPenColor(color) {
        state.penColor = color;
        if (state.tool !== 'pen' && state.tool !== 'pressure') {
            setTool('pressure'); // default to pressure pen when color is changed
        }
    }

    function updateEraserCursorSize() {
        if (state.tool !== 'eraser') return;
        elements.eraserCursor.style.width = state.eraserSize + 'px';
        elements.eraserCursor.style.height = state.eraserSize + 'px';
    }

    // Canvas drawing coordinates helper
    function getPos(e) {
        const rect = elements.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = elements.canvas.width / dpr;
        const logicalHeight = elements.canvas.height / dpr;
        const scaleX = rect.width ? logicalWidth / rect.width : 1;
        const scaleY = rect.height ? logicalHeight / rect.height : 1;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    // Drawing handlers
    function handlePointerDown(e) {
        // Ignored touch check for palm rejection (stylus only)
        if (state.stylusOnly && e.pointerType !== 'pen') {
            return;
        }

        // Single touch drawing lock / stuck state recovery:
        if (state.isDrawing) {
            const timeSinceLastEvent = Date.now() - lastPointerEventTime;
            // Recover if:
            // 1. New stylus down event (only one stylus can draw at a time)
            // 2. Or same pointer ID is somehow down again
            // 3. Or last drawing event was more than 500ms ago (abandoned stroke)
            if (e.pointerType === 'pen' || e.pointerId === activePointerId || timeSinceLastEvent > 500) {
                state.isDrawing = false;
                activePointerId = null;
            } else {
                // Ignore other concurrent touches (palm rejection / multi-touch block)
                return;
            }
        }

        state.isDrawing = true;
        activePointerId = e.pointerId;
        lastPointerEventTime = Date.now();
        state.lastPos = getPos(e);
        
        try {
            elements.canvas.setPointerCapture(e.pointerId);
        } catch(_) {}

        updateEraserCursor(e);
        if (e.cancelable) e.preventDefault();
    }

    function handlePointerMove(e) {
        // Update eraser preview cursor
        updateEraserCursor(e);

        // Stuck state recovery: if we are supposed to be drawing, but get a hover/lifted event
        // (no buttons pressed) for the active pointer, clear the drawing state.
        if (state.isDrawing && e.pointerId === activePointerId && (e.buttons & 1) === 0) {
            state.isDrawing = false;
            activePointerId = null;
            try {
                elements.canvas.releasePointerCapture(e.pointerId);
            } catch(_) {}
            return;
        }

        if (!state.isDrawing) return;
        if (e.pointerId !== activePointerId) return;
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
                // Apply pressure sensitivity
                let pressure = e.pressure;
                if (e.pointerType === 'mouse' || e.pointerType === 'touch') {
                    pressure = 0.55;
                } else if (e.pointerType === 'pen') {
                    // fallbacks if pen driver doesn't report pressure correctly
                    if (pressure === 0 || pressure === 0.5) pressure = 0.55;
                }
                ctx.lineWidth = state.penSize * (0.22 + pressure * 1.35);
            } else {
                // Regular pen (constant size)
                ctx.lineWidth = state.penSize;
            }
        }

        ctx.moveTo(state.lastPos.x, state.lastPos.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();

        state.lastPos = currentPos;
        if (e.cancelable) e.preventDefault();
    }

    function handlePointerUp(e) {
        if (e.pointerId === activePointerId) {
            state.isDrawing = false;
            activePointerId = null;
            try {
                elements.canvas.releasePointerCapture(e.pointerId);
            } catch(_) {}
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

    function clearCanvas() {
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, elements.canvas.width / dpr, elements.canvas.height / dpr);
    }

    function resizeCanvas() {
        if (!elements.canvas) return;
        
        let rect = elements.canvasContainer.getBoundingClientRect();
        let width = rect.width;
        let height = rect.height;

        // Failsafe: if layout is hidden or size evaluates to 0, use window viewport size
        if (width <= 0 || height <= 0) {
            width = window.innerWidth;
            height = window.innerHeight - 56;
        }

        const dpr = window.devicePixelRatio || 1;
        
        // Save current contents
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = elements.canvas.width;
        tempCanvas.height = elements.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (elements.canvas.width > 0 && elements.canvas.height > 0) {
            tempCtx.drawImage(elements.canvas, 0, 0);
        }

        // Set backing store dimensions
        elements.canvas.style.width = width + 'px';
        elements.canvas.style.height = height + 'px';
        elements.canvas.width = width * dpr;
        elements.canvas.height = height * dpr;
        
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Redraw contents
        if (tempCanvas.width > 0 && tempCanvas.height > 0) {
            ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width / dpr, tempCanvas.height / dpr);
        }
    }

    function show() {
        state.isOpen = true;
        elements.overlay.classList.add('open');
        resizeCanvas();
        elements.fab.style.display = 'none'; // hide floating button when overlay is open
        document.body.style.overflow = 'hidden'; // prevent scrolling underneath
    }

    function hide() {
        state.isOpen = false;
        elements.overlay.classList.remove('open');
        elements.fab.style.display = 'flex'; // show floating button back
        document.body.style.overflow = '';
        elements.eraserCursor.style.display = 'none';
        activePointerId = null;
    }

    function init() {
        if (document.getElementById('scratchpad-fab-btn')) return; // already loaded
        buildUI();
    }

    return {
        init,
        show,
        hide,
        clearCanvas,
        setTool,
        setPenColor,
        getState: () => state
    };
})();

// Auto-initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.Scratchpad.init();
});
