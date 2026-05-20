const canvasBox = document.getElementById('canvas-wrapper');
const listElement = document.getElementById('layers-list');
const palleteBox = document.getElementById('color-palette');
const cursorPreview = document.getElementById('cursor-preview');
const brushTypeSelect = document.getElementById('brush-type');
const thicknessRange = document.getElementById('thickness');
const thicknessNumber = document.getElementById('thickness-number');

let painting = false;
let currentTool = 'brush';
let inkColor = '#000000';
let strokeWidth = 10;
let brushType = 'classic';
let startup = true;
let activePointerId = null;
let lastPoint = null;
let lastPressure = 1;
let lastCursorPos = null;
let draggingIndex = null;

let layers = [];
let activeIdx = -1;
let layerIdCount = 0;

let stackUndo = [];
let stackRedo = [];

function registerState() {
    const data = layers.map(l => l.element.toDataURL());
    stackUndo.push(data);
    stackRedo = []; 
    if (stackUndo.length > 40) stackUndo.shift(); 
}

function applyState(stateData) {
    while (layers.length > stateData.length) {
        dropLayer(layers.length - 1, false);
    }
    while (layers.length < stateData.length) {
        buildLayer(false);
    }

    stateData.forEach((src, i) => {
        let img = new Image();
        img.src = src;
        img.onload = () => {
            const context = layers[i].ctx;
            context.clearRect(0, 0, layers[i].element.width, layers[i].element.height);
            context.drawImage(img, 0, 0);
        };
    });
    refreshLayersPanel();
}

function fireUndo() {
    if (stackUndo.length > 0) {
        const cur = layers.map(l => l.element.toDataURL());
        stackRedo.push(cur); 
        applyState(stackUndo.pop());
    }
}

function fireRedo() {
    if (stackRedo.length > 0) {
        const cur = layers.map(l => l.element.toDataURL());
        stackUndo.push(cur);
        applyState(stackRedo.pop());
    }
}

window.addEventListener('keydown', e => {
    const target = e.target;
    const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
    if (target && (target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select')) return;
    if (e.ctrlKey && e.key.toLowerCase() === 'z') { 
        e.preventDefault(); 
        fireUndo(); 
    }
    if (e.ctrlKey && (e.key.toLowerCase() === 'y' || e.code === 'KeyY' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { 
        e.preventDefault(); 
        fireRedo(); 
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === 'e') {
        swapTool('eraser');
    }
    if (key === 'p') {
        swapTool('brush');
    }
});

function buildLayer(save = true) {
    layerIdCount++;
    const canvas = document.createElement('canvas');
    canvas.id = `lyr-${layerIdCount}`;
    canvas.width = canvasBox.clientWidth;
    canvas.height = canvasBox.clientHeight;

    const ctx = canvas.getContext('2d');
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    layers.push({
        element: canvas,
        ctx: ctx,
        id: layerIdCount,
        label: `Layer ${layerIdCount}`
    });
    
    canvasBox.appendChild(canvas);

    if (startup && layers.length === 1) bindInteractions(canvasBox);
    if (save && !startup) registerState();
    
    refreshLayersPanel();
    focusLayer(layers.length - 1); 
}

function focusLayer(i) {
    if (i >= 0 && i < layers.length) {
        activeIdx = i;
        refreshLayersPanel();
        swapTool(currentTool); 
    }
}

function dropLayer(i, save = true) {
    if (layers.length <= 1) return; 
    if (save) registerState();

    canvasBox.removeChild(layers[i].element);
    layers.splice(i, 1);

    if (activeIdx >= layers.length) activeIdx = layers.length - 1;
    refreshLayersPanel();
}

function shiftLayerUp() {
    if (activeIdx === -1 || activeIdx >= layers.length - 1) return;
    registerState(); 
    
    const target = layers[activeIdx];
    layers[activeIdx] = layers[activeIdx + 1];
    layers[activeIdx + 1] = target;
    
    layers.forEach(l => canvasBox.appendChild(l.element));
    activeIdx++;
    refreshLayersPanel();
}

function shiftLayerDown() {
    if (activeIdx <= 0) return; 
    registerState(); 
    
    const target = layers[activeIdx];
    layers[activeIdx] = layers[activeIdx - 1];
    layers[activeIdx - 1] = target;
    
    layers.forEach(l => canvasBox.appendChild(l.element));
    activeIdx--;
    refreshLayersPanel();
}

function moveLayer(from, to) {
    if (from === to) return;
    if (from < 0 || to < 0 || from >= layers.length || to >= layers.length) return;
    registerState();
    const item = layers.splice(from, 1)[0];
    const insertAt = to;
    layers.splice(insertAt, 0, item);
    layers.forEach(l => canvasBox.appendChild(l.element));
    activeIdx = insertAt;
    refreshLayersPanel();
}

function clearLayerDragClasses() {
    listElement.querySelectorAll('.layer-item').forEach(el => {
        el.classList.remove('drag-over');
        el.classList.remove('dragging');
    });
}

function handleLayerDragStart(e) {
    draggingIndex = Number(e.currentTarget.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(draggingIndex));
    e.currentTarget.classList.add('dragging');
}

function handleLayerDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleLayerDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleLayerDrop(e) {
    e.preventDefault();
    const from = Number.isFinite(draggingIndex) ? draggingIndex : Number(e.dataTransfer.getData('text/plain'));
    const to = Number(e.currentTarget.dataset.index);
    clearLayerDragClasses();
    draggingIndex = null;
    if (!Number.isFinite(from) || !Number.isFinite(to)) return;
    moveLayer(from, to);
}

function handleLayerDragEnd() {
    clearLayerDragClasses();
    draggingIndex = null;
}

function refreshLayersPanel() {
    listElement.innerHTML = '';
    layers.forEach((l, i) => {
        const div = document.createElement('div');
        div.className = `layer-item ${i === activeIdx ? 'active' : ''}`;
        div.draggable = true;
        div.dataset.index = i;
        div.innerHTML = `<span>${l.label}</span>`;
        div.addEventListener('click', () => focusLayer(i));
        div.addEventListener('dragstart', handleLayerDragStart);
        div.addEventListener('dragover', handleLayerDragOver);
        div.addEventListener('dragleave', handleLayerDragLeave);
        div.addEventListener('drop', handleLayerDrop);
        div.addEventListener('dragend', handleLayerDragEnd);
        listElement.appendChild(div);
    });
}

const fallbackColors = ['#0d0f14', '#1b2a4a', '#243f7a', '#2b6fa6', '#3c8dd1', '#6aa6d9', '#9ac2e8', '#d9e7f5', '#46304f', '#7a4c7e', '#b96aa4', '#d78bbd', '#5b4b3a', '#8c6f52', '#b69b7a', '#d4c1a1'];

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
    const toHex = v => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function colorDistance(a, b) {
    const c1 = hexToRgb(a);
    const c2 = hexToRgb(b);
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getWallpaperUrl() {
    const style = getComputedStyle(document.body, '::before');
    const bg = style.backgroundImage || '';
    const match = bg.match(/url\(["']?(.*?)["']?\)/i);
    return match ? match[1] : null;
}

function extractPalette(url, count) {
    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const size = 80;
            const c = document.createElement('canvas');
            c.width = size;
            c.height = size;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, size, size);
            let data;
            try {
                data = ctx.getImageData(0, 0, size, size).data;
            } catch (e) {
                resolve(null);
                return;
            }
            const freq = new Map();
            for (let i = 0; i < data.length; i += 4) {
                const a = data[i + 3];
                if (a < 200) continue;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const sat = max === 0 ? 0 : (max - min) / max;
                const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
                const weight = sat > 0.25 ? 3 : 1;
                freq.set(key, (freq.get(key) || 0) + weight);
            }
            const sorted = [...freq.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([key]) => {
                    const r = ((key >> 8) & 15) * 17;
                    const g = ((key >> 4) & 15) * 17;
                    const b = (key & 15) * 17;
                    return rgbToHex(r, g, b);
                });
            const picked = [];
            const minDist = 32;
            for (const cHex of sorted) {
                if (picked.some(p => colorDistance(p, cHex) < minDist)) continue;
                picked.push(cHex);
                if (picked.length >= count) break;
            }
            if (picked.length < count) {
                const fill = fallbackColors.filter(c => !picked.includes(c));
                picked.push(...fill.slice(0, count - picked.length));
            }
            resolve(picked);
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

function renderPalette(colors) {
    palleteBox.innerHTML = '';
    const list = (colors && colors.length ? colors : fallbackColors).map(c => c.toLowerCase());
    const unique = [];
    list.forEach(c => {
        if (!unique.includes(c)) unique.push(c);
    });
    if (!unique.includes(inkColor.toLowerCase())) inkColor = unique[0];
    document.getElementById('custom-color').value = inkColor;
    unique.forEach(c => {
        const box = document.createElement('div');
        box.className = 'color-swatch';
        box.style.backgroundColor = c;
        if (c === inkColor.toLowerCase()) box.classList.add('active');
        box.addEventListener('click', () => pickColor(c, box));
        palleteBox.appendChild(box);
    });
    updateCursorStyle();
}

function initPalette() {
    renderPalette(fallbackColors);
    const url = getWallpaperUrl();
    if (!url) return;
    extractPalette(url, 16).then(colors => {
        if (colors && colors.length) renderPalette(colors);
    });
}

function clampThickness(val) {
    const min = Number(thicknessRange.min) || 1;
    const max = Number(thicknessRange.max) || 100;
    return Math.min(max, Math.max(min, val));
}

function setThickness(val, syncNumber = true) {
    const next = clampThickness(val);
    strokeWidth = next;
    thicknessRange.value = next;
    if (syncNumber) thicknessNumber.value = next.toFixed(1);
    refreshCursorPreview();
}

function swapTool(t) {
    currentTool = t;
    document.querySelectorAll('.tool-section .btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${t}`).classList.add('active');
    
    if (activeIdx !== -1) {
        layers[activeIdx].ctx.globalCompositeOperation = (t === 'eraser') ? 'destination-out' : 'source-over';
    }
    updateCursorStyle();
}

function pickColor(c, element) {
    inkColor = c.toLowerCase();
    swapTool('brush');
    document.getElementById('custom-color').value = c;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    if (element) element.classList.add('active');
}

function updateCursorStyle() {
    cursorPreview.classList.toggle('eraser', currentTool === 'eraser');
    cursorPreview.style.borderColor = currentTool === 'eraser' ? '#000000' : inkColor;
}

function getPreviewPressure(e) {
    if (e.pointerType === 'pen') {
        const p = typeof e.pressure === 'number' ? e.pressure : 0;
        if (p > 0) lastPressure = p;
        if (!lastPressure || lastPressure < 0.1) lastPressure = 0.25;
        return lastPressure;
    }
    lastPressure = 1;
    return 1;
}

function getDrawPressure(e) {
    if (e.pointerType === 'pen' && typeof e.pressure === 'number') {
        return Math.max(0.05, e.pressure);
    }
    return 1;
}

function updateCursorPreview(e) {
    const p = getPointer(canvasBox, e);
    lastCursorPos = p;
    const pressure = getPreviewPressure(e);
    const size = Math.max(4, strokeWidth * pressure);
    cursorPreview.style.width = `${size}px`;
    cursorPreview.style.height = `${size}px`;
    cursorPreview.style.left = `${p.x}px`;
    cursorPreview.style.top = `${p.y}px`;
    updateCursorStyle();
    cursorPreview.style.display = 'block';
    canvasBox.classList.add('cursor-active');
}

function refreshCursorPreview() {
    if (!lastCursorPos) return;
    const size = Math.max(4, strokeWidth * lastPressure);
    cursorPreview.style.width = `${size}px`;
    cursorPreview.style.height = `${size}px`;
    cursorPreview.style.left = `${lastCursorPos.x}px`;
    cursorPreview.style.top = `${lastCursorPos.y}px`;
    updateCursorStyle();
}

function hideCursorPreview() {
    cursorPreview.style.display = 'none';
    canvasBox.classList.remove('cursor-active');
    lastCursorPos = null;
}

function applyBrushStyle(ctx, width) {
    ctx.globalCompositeOperation = (currentTool === 'eraser') ? 'destination-out' : 'source-over';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 1;
    if (currentTool === 'brush') {
        if (brushType === 'marker') {
            ctx.globalAlpha = 0.45;
            ctx.lineCap = 'square';
        } else if (brushType === 'spray') {
            ctx.globalAlpha = 0.7;
        }
    }
}

function drawSpray(ctx, from, to, width) {
    const radius = Math.max(2, width * 0.5);
    const density = Math.max(8, Math.round(width * 1.2));
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.floor(dist / 3));
    ctx.fillStyle = inkColor;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = from.x + dx * t;
        const y = from.y + dy * t;
        for (let j = 0; j < density; j++) {
            const ang = Math.random() * Math.PI * 2;
            const r = Math.random() * radius;
            ctx.fillRect(x + Math.cos(ang) * r, y + Math.sin(ang) * r, 1, 1);
        }
    }
}

function getPointer(el, e) {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function handlePointerEnter(e) {
    updateCursorPreview(e);
}

function handlePointerLeave() {
    hideCursorPreview();
}

function bindInteractions(el) {
    el.addEventListener('pointerdown', initiateStroke);
    el.addEventListener('pointermove', computeStroke);
    el.addEventListener('pointerup', finalizeStroke);
    el.addEventListener('pointercancel', finalizeStroke);
    el.addEventListener('pointerenter', handlePointerEnter);
    el.addEventListener('pointerleave', handlePointerLeave);
}

function initiateStroke(e) {
    if (activeIdx === -1) return;
    if (!e.isPrimary) return;
    if (e.button !== undefined && e.button !== 0) return;
    registerState(); 
    painting = true;
    activePointerId = e.pointerId;
    canvasBox.setPointerCapture(e.pointerId);
    const ctx = layers[activeIdx].ctx;
    const p = getPointer(canvasBox, e);
    lastPoint = p;
    lastPressure = getPreviewPressure(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    applyBrushStyle(ctx, strokeWidth);
    computeStroke(e);
}

function computeStroke(e) {
    if (activeIdx === -1) return;
    updateCursorPreview(e);
    if (!painting || activePointerId !== e.pointerId) return;
    if (e.cancelable) e.preventDefault();

    const ctx = layers[activeIdx].ctx;
    const p = getPointer(canvasBox, e);
    const pressure = getDrawPressure(e);
    const width = Math.max(1, strokeWidth * pressure);

    applyBrushStyle(ctx, width);

    if (currentTool === 'brush' && brushType === 'spray') {
        drawSpray(ctx, lastPoint || p, p, width);
    } else {
        ctx.lineWidth = width;
        ctx.strokeStyle = (currentTool === 'eraser') ? 'rgba(0,0,0,1)' : inkColor;
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    }
    lastPoint = p;
}

function finalizeStroke(e) {
    if (painting && activeIdx !== -1) {
        layers[activeIdx].ctx.closePath();
        painting = false;
    }
    if (activePointerId !== null) {
        try {
            canvasBox.releasePointerCapture(activePointerId);
        } catch (err) {
        }
    }
    activePointerId = null;
    lastPoint = null;
}

function adjustDimensions() {
    if (startup) {
        buildLayer(false); 
        stackUndo = [[layers[0].element.toDataURL()]]; 
        startup = false;
    } else {
        const snap = layers.map(l => l.element.toDataURL());
        layers.forEach(l => {
            l.element.width = canvasBox.clientWidth;
            l.element.height = canvasBox.clientHeight;
        });
        applyState(snap);
    }
}

window.addEventListener('resize', adjustDimensions);
window.addEventListener('load', adjustDimensions);
initPalette();

document.getElementById('btn-add-layer').addEventListener('click', () => buildLayer(true));
document.getElementById('btn-rm-layer').addEventListener('click', () => {
    if (confirm(`Deseja remover a "${layers[activeIdx].label}"?`)) dropLayer(activeIdx, true);
});
document.getElementById('btn-up-layer').addEventListener('click', shiftLayerUp);
document.getElementById('btn-down-layer').addEventListener('click', shiftLayerDown);

document.getElementById('btn-brush').addEventListener('click', () => swapTool('brush'));
document.getElementById('btn-eraser').addEventListener('click', () => swapTool('eraser'));

brushTypeSelect.addEventListener('change', e => brushType = e.target.value);

thicknessRange.addEventListener('input', e => {
    setThickness(Number(e.target.value));
});
thicknessNumber.addEventListener('input', e => {
    const raw = Number(e.target.value);
    if (!Number.isFinite(raw)) return;
    setThickness(raw, false);
});
thicknessNumber.addEventListener('change', e => {
    const raw = Number(e.target.value);
    if (!Number.isFinite(raw)) {
        setThickness(strokeWidth);
        return;
    }
    setThickness(raw);
});
setThickness(strokeWidth);
document.getElementById('custom-color').addEventListener('input', e => pickColor(e.target.value, null));

document.getElementById('btn-undo').addEventListener('click', fireUndo);
document.getElementById('btn-redo').addEventListener('click', fireRedo);

document.getElementById('btn-clear').addEventListener('click', () => {
    if (activeIdx === -1) return;
    if (confirm('Want to clear the current layer?')) {
        registerState();
        const l = layers[activeIdx];
        l.ctx.clearRect(0, 0, l.element.width, l.element.height);
    }
});

document.getElementById('btn-save').addEventListener('click', () => {
    if (layers.length === 0) return;
    const tmp = document.createElement('canvas');
    tmp.width = layers[0].element.width;
    tmp.height = layers[0].element.height;
    const tCtx = tmp.getContext('2d'); 
    
    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(0, 0, tmp.width, tmp.height);
    layers.forEach(l => tCtx.drawImage(l.element, 0, 0));

    const a = document.createElement('a');
    a.download = 'newimage.png';
    a.href = tmp.toDataURL('image/png');
    a.click();
});