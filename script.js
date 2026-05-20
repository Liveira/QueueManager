const WALLPAPER_URL = 'assets/wallpaper.jpg';
let audioCtx = null;

function playBeep(frequency = 880, duration = 0.08) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = frequency;
        gain.gain.value = 0.05;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (err) {
        // Audio might be blocked until user interaction.
    }
}

function runBootSequence() {
    const bootScreen = document.getElementById('bootScreen');
    const bootLines = document.getElementById('bootLines');
    if (!bootScreen || !bootLines) return;

    document.body.classList.add('booting');
    bootScreen.classList.remove('hidden');

    const lines = [
        'AURORA BIOS v2.7',
        'CPU: AURORA-CORE X8 3.6GHz',
        'MEM: 16384MB OK',
        'Video: AERO GLASS ADAPTER',
        'Initializing storage...',
        'Detecting devices [OK]',
        'Loading kernel modules...',
        'Mounting system volume...',
        'Starting graphics shell...',
        'Boot complete.'
    ];

    let index = 0;
    playBeep(740, 0.06);

    const timer = setInterval(() => {
        bootLines.textContent += lines[index] + '\n';
        index += 1;
        if (index >= lines.length) {
            clearInterval(timer);
            playBeep(980, 0.08);
            setTimeout(() => {
                bootScreen.classList.add('hidden');
                document.body.classList.remove('booting');
            }, 900);
        }
    }, 160);
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function hexToRgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const channels = [r, g, b].map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function extractDominantColors(img, count = 5) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, size, size);

    const data = ctx.getImageData(0, 0, size, size).data;
    const buckets = new Map();

    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < 200) continue;
        const r = data[i] >> 4;
        const g = data[i + 1] >> 4;
        const b = data[i + 2] >> 4;
        const key = (r << 8) | (g << 4) | b;
        buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    return Array.from(buckets.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([key]) => {
            const r = ((key >> 8) & 0x0f) * 17;
            const g = ((key >> 4) & 0x0f) * 17;
            const b = (key & 0x0f) * 17;
            return rgbToHex(r, g, b);
        });
}

function setPaletteVars(colors) {
    const fallback = ['#0b1f3b', '#1f6f9e', '#23c4d8', '#8ee4ff', '#e6f8ff'];
    const palette = fallback.map((color, i) => colors[i] || color);
    const root = document.documentElement;

    palette.forEach((color, i) => root.style.setProperty(`--pal-${i + 1}`, color));
    root.style.setProperty('--glass-main', hexToRgba(palette[2], 0.35));
    root.style.setProperty('--glass-strong', hexToRgba(palette[1], 0.45));

    const light = getLuminance(palette[4]) > 0.6;
    root.style.setProperty('--text-dark', light ? '#0a1a2c' : '#e8f6ff');
    root.style.setProperty('--text-light', light ? '#f8fcff' : '#ffffff');
}

function applyPaletteFromImage(url) {
    const img = new Image();
    img.onload = () => {
        const colors = extractDominantColors(img, 5);
        setPaletteVars(colors);
    };
    img.onerror = () => setPaletteVars([]);
    img.src = url;
}

class Desktop {
    constructor() {
        this.windowZIndex = 100;
        this.selectedIcon = null;
        this.paintApps = new Map();
        this.explorerApps = new Map();
        this.explorerData = this.buildExplorerData();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }

    buildExplorerData() {
        return {
            '/': [
                { name: 'Apps', type: 'folder', icon: '🧩' },
                { name: 'Files', type: 'folder', icon: '🗂️' },
                { name: 'Shortcuts', type: 'folder', icon: '⚡' },
                { name: 'Wallpaper.jpg', type: 'file', icon: '🖼️', file: WALLPAPER_URL }
            ],
            '/Apps': [
                { name: 'Aero Paint', type: 'app', icon: '🎨', app: 'paint' },
                { name: 'Explorer', type: 'app', icon: '📁', app: 'explorer' },
                { name: 'Internet', type: 'app', icon: '🌐', app: 'internet' }
            ],
            '/Shortcuts': [
                { name: 'Paint', type: 'app', icon: '🎨', app: 'paint' },
                { name: 'Explorer', type: 'app', icon: '📁', app: 'explorer' },
                { name: 'Notes', type: 'app', icon: '📝', app: 'notes' }
            ],
            '/Files': [
                { name: 'Documentos', type: 'folder', icon: '📄' },
                { name: 'Imagens', type: 'folder', icon: '🖼️' },
                { name: 'Readme.txt', type: 'file', icon: '📑', content: 'Aurora OS\n\nSistema visual inspirado no wallpaper.\n' }
            ],
            '/Files/Documentos': [
                { name: 'Notas.txt', type: 'file', icon: '📑', content: 'To-do:\n- Paint com camadas\n- Explorer funcional\n- BIOS boot\n' }
            ],
            '/Files/Imagens': [
                { name: 'Wallpaper.jpg', type: 'file', icon: '🖼️', file: WALLPAPER_URL }
            ]
        };
    }

    setupEventListeners() {
        document.querySelectorAll('.desktop-icon').forEach((icon) => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.selectedIcon) this.selectedIcon.classList.remove('selected');
                icon.classList.add('selected');
                this.selectedIcon = icon;
            });

            icon.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const appType = icon.dataset.app;
                this.launchApp(appType);
            });
        });

        document.querySelectorAll('.ql-icon[data-app]').forEach((icon) => {
            icon.addEventListener('click', () => {
                this.launchApp(icon.dataset.app);
            });
        });

        document.querySelectorAll('.start-menu-item[data-app]').forEach((item) => {
            item.addEventListener('click', () => {
                const appType = item.dataset.app;
                this.launchApp(appType);
                document.getElementById('startMenu').classList.add('hidden');
            });
        });

        document.getElementById('startBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('startMenu').classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#startBtn') && !e.target.closest('#startMenu')) {
                document.getElementById('startMenu').classList.add('hidden');
            }
            if (e.target.closest('#desktop') && !e.target.closest('.desktop-icon')) {
                if (this.selectedIcon) {
                    this.selectedIcon.classList.remove('selected');
                    this.selectedIcon = null;
                }
            }
        });

        document.querySelector('.shutdown-item').addEventListener('click', () => {
            document.body.innerHTML = '<div style="background:black;color:white;height:100vh;display:flex;align-items:center;justify-content:center;font-size:24px;">Encerrando...</div>';
            setTimeout(() => {
                document.body.innerHTML = '';
            }, 2000);
        });
    }

    launchApp(appType) {
        if (appType === 'computer') {
            this.createWindow('Meu Computador', '💻', '<div style="padding:20px;">Disco Local (C:)<br>Disco Local (D:)</div>');
        } else if (appType === 'recycle') {
            this.createWindow('Lixeira', '🗑️', '<div style="padding:20px;text-align:center;color:#666;">A lixeira esta vazia</div>');
        } else if (appType === 'internet') {
            this.createWindow('Internet Explorer', '🌐', '<div class="browser" style="height:100%; display:flex; flex-direction:column;"><div style="background:#eef; border-bottom:1px solid #ccc; padding:5px;"><input type="text" value="about:blank" style="width:100%;"></div><div style="padding:20px; text-align:center;">Navegacao simulada.</div></div>');
        } else if (appType === 'explorer') {
            this.createExplorerWindow();
        } else if (appType === 'paint') {
            this.createPaintWindow();
        } else if (appType === 'notes') {
            this.createWindow('Bloco de Notas', '📝', '<textarea style="width:100%;height:100%;border:none;outline:none;padding:12px;font-family:inherit;font-size:13px;">Novo documento...</textarea>');
        } else if (appType === 'calc') {
            this.createWindow('Calculadora', '🧮', '<div style="padding:20px;">Calculadora simples em breve.</div>', 260, 320);
        } else if (appType === 'settings') {
            this.createWindow('Painel de Controle', '⚙️', '<div style="padding:20px;">Configurações do sistema.</div>');
        } else {
            this.createWindow(appType, '📄', '<div style="padding:20px;">Aplicativo generico</div>');
        }
    }

    createExplorerWindow() {
        const windowId = `win-${Date.now()}`;
        const content = `
            <div class="explorer" data-explorer="${windowId}">
                <div class="explorer-toolbar">
                    <button class="explorer-btn explorer-back">Back</button>
                    <div class="explorer-path"></div>
                </div>
                <div class="explorer-body">
                    <div class="explorer-sidebar">
                        <div><strong>Favoritos</strong></div>
                        <div>Inicio</div>
                        <div>Apps</div>
                        <div>Arquivos</div>
                    </div>
                    <div class="explorer-list"></div>
                </div>
            </div>
        `;
        const win = this.createWindow('Explorer', '📁', content, 760, 500, windowId);
        this.initExplorer(win, windowId);
    }

    createPaintWindow() {
        const windowId = `win-${Date.now()}`;
        const content = `
            <div class="paint-app" data-paint="${windowId}">
                <div class="paint-toolbar">
                    <button class="paint-tool active" data-tool="brush">Brush</button>
                    <button class="paint-tool" data-tool="eraser">Eraser</button>
                    <button class="paint-tool" data-tool="line">Line</button>
                    <button class="paint-tool" data-tool="rect">Rect</button>
                    <button class="paint-tool" data-tool="circle">Circle</button>
                    <label>Color <input class="paint-color" type="color" value="#21d4ff"></label>
                    <label>Size <input class="paint-size" type="range" min="1" max="30" value="6"></label>
                    <label><input class="paint-fill-toggle" type="checkbox" checked> Fill</label>
                    <button class="paint-tool paint-undo">Undo</button>
                    <button class="paint-tool paint-clear">Clear</button>
                    <button class="paint-tool paint-save">Save PNG</button>
                    <span class="paint-status">Layer 1</span>
                </div>
                <div class="paint-workspace">
                    <div class="paint-canvas-stack">
                        <canvas class="paint-layer" data-layer="0"></canvas>
                        <canvas class="paint-layer" data-layer="1"></canvas>
                        <canvas class="paint-layer" data-layer="2"></canvas>
                        <canvas class="paint-preview"></canvas>
                    </div>
                    <div class="paint-layers">
                        <div><strong>Layers</strong></div>
                        <div class="layer-row">
                            <input type="radio" name="layer-${windowId}" value="0" checked>
                            <span>Layer 1</span>
                            <input class="layer-visible" type="checkbox" data-layer="0" checked>
                        </div>
                        <div class="layer-row">
                            <input type="radio" name="layer-${windowId}" value="1">
                            <span>Layer 2</span>
                            <input class="layer-visible" type="checkbox" data-layer="1" checked>
                        </div>
                        <div class="layer-row">
                            <input type="radio" name="layer-${windowId}" value="2">
                            <span>Layer 3</span>
                            <input class="layer-visible" type="checkbox" data-layer="2" checked>
                        </div>
                    </div>
                </div>
            </div>
        `;
        const win = this.createWindow('Aero Paint', '🎨', content, 840, 560, windowId);
        this.initPaintApp(win, windowId);
    }

    createWindow(title, icon, content, width = 600, height = 450, forcedId = null) {
        const windowId = forcedId || `win-${Date.now()}`;
        const win = document.createElement('div');
        win.className = 'window focused';
        win.id = windowId;
        win.style.width = width + 'px';
        win.style.height = height + 'px';
        win.style.left = (Math.random() * 120 + 40) + 'px';
        win.style.top = (Math.random() * 80 + 40) + 'px';
        win.style.zIndex = ++this.windowZIndex;

        win.innerHTML = `
            <div class="window-title-bar">
                <div class="window-title">
                    <span class="window-title-bar-icon">${icon}</span>
                    <span>${title}</span>
                </div>
                <div class="window-controls">
                    <button class="window-control-btn window-minimize-btn" title="Minimizar">_</button>
                    <button class="window-control-btn window-maximize-btn" title="Maximizar">□</button>
                    <button class="window-control-btn window-close-btn" title="Fechar">✕</button>
                </div>
            </div>
            <div class="window-content-wrapper">
                <div class="window-content">
                    ${content}
                </div>
            </div>
        `;

        document.getElementById('windowsContainer').appendChild(win);
        this.setupWindowEvents(win, windowId, title, icon);
        this.addToTaskbar(windowId, title, icon);

        document.querySelectorAll('.window').forEach((w) => w !== win && w.classList.remove('focused'));
        return win;
    }

    setupWindowEvents(win, id) {
        const titleBar = win.querySelector('.window-title-bar');

        win.addEventListener('mousedown', () => {
            document.querySelectorAll('.window').forEach((w) => w.classList.remove('focused'));
            win.classList.add('focused');
            win.style.zIndex = ++this.windowZIndex;
            document.querySelectorAll('.taskbar-item').forEach((t) => t.classList.remove('active'));
            const tbItem = document.querySelector(`[data-winid="${id}"]`);
            if (tbItem) tbItem.classList.add('active');
        });

        let isDragging = false;
        let diffX = 0;
        let diffY = 0;

        titleBar.addEventListener('mousedown', (e) => {
            if (e.target.closest('.window-controls')) return;
            isDragging = true;
            diffX = e.clientX - win.offsetLeft;
            diffY = e.clientY - win.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging && !win.classList.contains('maximized')) {
                win.style.left = (e.clientX - diffX) + 'px';
                win.style.top = (e.clientY - diffY) + 'px';
            }
        });

        document.addEventListener('mouseup', () => (isDragging = false));

        win.querySelector('.window-close-btn').addEventListener('click', () => {
            win.remove();
            const tbItem = document.querySelector(`[data-winid="${id}"]`);
            if (tbItem) tbItem.remove();
            this.paintApps.delete(id);
            this.explorerApps.delete(id);
        });

        win.querySelector('.window-maximize-btn').addEventListener('click', () => {
            win.classList.toggle('maximized');
            if (win.classList.contains('maximized')) {
                win.dataset.prevWidth = win.style.width;
                win.dataset.prevHeight = win.style.height;
                win.dataset.prevLeft = win.style.left;
                win.dataset.prevTop = win.style.top;
                win.style.width = '100%';
                win.style.height = '100%';
                win.style.left = '0';
                win.style.top = '0';
            } else {
                win.style.width = win.dataset.prevWidth;
                win.style.height = win.dataset.prevHeight;
                win.style.left = win.dataset.prevLeft;
                win.style.top = win.dataset.prevTop;
            }
        });

        win.querySelector('.window-minimize-btn').addEventListener('click', () => {
            win.style.display = 'none';
            win.classList.remove('focused');
            const tbItem = document.querySelector(`[data-winid="${id}"]`);
            if (tbItem) tbItem.classList.remove('active');
        });
    }

    addToTaskbar(id, title, icon) {
        const tb = document.getElementById('taskbarMiddle');
        const item = document.createElement('div');
        item.className = 'taskbar-item active';
        item.dataset.winid = id;
        item.innerHTML = `<span>${icon}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</span>`;

        document.querySelectorAll('.taskbar-item').forEach((t) => t.classList.remove('active'));

        item.addEventListener('click', () => {
            const win = document.getElementById(id);
            if (!win) return;

            if (win.style.display === 'none') {
                win.style.display = 'flex';
                document.querySelectorAll('.window').forEach((w) => w.classList.remove('focused'));
                win.classList.add('focused');
                win.style.zIndex = ++this.windowZIndex;
                document.querySelectorAll('.taskbar-item').forEach((t) => t.classList.remove('active'));
                item.classList.add('active');
            } else if (win.classList.contains('focused')) {
                win.style.display = 'none';
                win.classList.remove('focused');
                item.classList.remove('active');
            } else {
                document.querySelectorAll('.window').forEach((w) => w.classList.remove('focused'));
                win.classList.add('focused');
                win.style.zIndex = ++this.windowZIndex;
                document.querySelectorAll('.taskbar-item').forEach((t) => t.classList.remove('active'));
                item.classList.add('active');
            }
        });
        tb.appendChild(item);
    }

    initExplorer(win, windowId) {
        const explorer = win.querySelector(`[data-explorer="${windowId}"]`);
        if (!explorer) return;
        const list = explorer.querySelector('.explorer-list');
        const pathLabel = explorer.querySelector('.explorer-path');
        const backBtn = explorer.querySelector('.explorer-back');

        let currentPath = '/';

        const render = () => {
            const items = this.explorerData[currentPath] || [];
            pathLabel.textContent = currentPath;
            list.innerHTML = items
                .map((item) => `
                    <div class="explorer-item" data-type="${item.type}" data-name="${item.name}" data-app="${item.app || ''}">
                        <span class="explorer-icon">${item.icon || '📄'}</span>
                        <span class="explorer-label">${item.name}</span>
                    </div>
                `)
                .join('');
        };

        const openItem = (item) => {
            const type = item.dataset.type;
            const name = item.dataset.name;
            if (type === 'folder') {
                const nextPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
                if (this.explorerData[nextPath]) {
                    currentPath = nextPath;
                    render();
                }
                return;
            }
            if (type === 'app') {
                this.launchApp(item.dataset.app);
                return;
            }
            if (type === 'file') {
                const file = (this.explorerData[currentPath] || []).find((entry) => entry.name === name);
                if (!file) return;
                if (file.file) {
                    this.createWindow(name, '🖼️', `<div style="padding:10px;height:100%;"><img src="${file.file}" alt="${name}" style="max-width:100%;max-height:100%;border-radius:8px;"></div>`, 520, 420);
                } else {
                    const content = file.content || 'Arquivo vazio.';
                    this.createWindow(name, '📑', `<pre style="padding:14px;white-space:pre-wrap;">${content}</pre>`, 420, 360);
                }
            }
        };

        list.addEventListener('dblclick', (e) => {
            const item = e.target.closest('.explorer-item');
            if (!item) return;
            openItem(item);
        });

        backBtn.addEventListener('click', () => {
            if (currentPath === '/') return;
            const parts = currentPath.split('/').filter(Boolean);
            parts.pop();
            currentPath = '/' + parts.join('/');
            if (currentPath === '') currentPath = '/';
            render();
        });

        render();
        this.explorerApps.set(windowId, { path: currentPath });
    }

    initPaintApp(win, windowId) {
        const app = win.querySelector(`[data-paint="${windowId}"]`);
        if (!app) return;

        const toolButtons = app.querySelectorAll('.paint-tool[data-tool]');
        const colorInput = app.querySelector('.paint-color');
        const sizeInput = app.querySelector('.paint-size');
        const fillToggle = app.querySelector('.paint-fill-toggle');
        const undoBtn = app.querySelector('.paint-undo');
        const clearBtn = app.querySelector('.paint-clear');
        const saveBtn = app.querySelector('.paint-save');
        const statusLabel = app.querySelector('.paint-status');
        const stack = app.querySelector('.paint-canvas-stack');
        const preview = app.querySelector('.paint-preview');
        const layers = Array.from(app.querySelectorAll('.paint-layer'));
        const layerRadios = app.querySelectorAll(`input[name="layer-${windowId}"]`);
        const layerVisibility = app.querySelectorAll('.layer-visible');

        const state = {
            tool: 'brush',
            color: colorInput.value,
            size: parseInt(sizeInput.value, 10),
            fill: fillToggle.checked,
            activeLayer: 0,
            drawing: false,
            start: { x: 0, y: 0 },
            last: { x: 0, y: 0 },
            history: [[], [], []]
        };

        const ctxs = layers.map((canvas) => canvas.getContext('2d'));
        const previewCtx = preview.getContext('2d');

        const resizeLayer = (canvas, ctx, width, height) => {
            if (canvas.width === width && canvas.height === height) return;
            const temp = document.createElement('canvas');
            temp.width = canvas.width;
            temp.height = canvas.height;
            const tctx = temp.getContext('2d');
            tctx.drawImage(canvas, 0, 0);
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(temp, 0, 0, width, height);
        };

        const resizeCanvases = () => {
            const width = stack.clientWidth;
            const height = stack.clientHeight;
            if (!width || !height) return;
            layers.forEach((canvas, index) => resizeLayer(canvas, ctxs[index], width, height));
            resizeLayer(preview, previewCtx, width, height);
        };

        const observer = new ResizeObserver(resizeCanvases);
        observer.observe(stack);
        resizeCanvases();

        const setActiveTool = (tool) => {
            state.tool = tool;
            toolButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tool === tool));
        };

        const getPosition = (event) => {
            const rect = stack.getBoundingClientRect();
            return {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
        };

        const pushHistory = () => {
            const ctx = ctxs[state.activeLayer];
            const snapshot = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            const bucket = state.history[state.activeLayer];
            bucket.push(snapshot);
            if (bucket.length > 30) bucket.shift();
        };

        const drawLine = (ctx, from, to, erase = false) => {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = state.size;
            ctx.strokeStyle = state.color;
            ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
            ctx.restore();
        };

        const drawShape = (ctx, shape, start, end, commit = false) => {
            ctx.save();
            ctx.lineWidth = state.size;
            ctx.strokeStyle = state.color;
            ctx.fillStyle = state.color;
            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();

            if (shape === 'line') {
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
            } else if (shape === 'rect') {
                const x = Math.min(start.x, end.x);
                const y = Math.min(start.y, end.y);
                const w = Math.abs(end.x - start.x);
                const h = Math.abs(end.y - start.y);
                ctx.rect(x, y, w, h);
            } else if (shape === 'circle') {
                const radius = Math.hypot(end.x - start.x, end.y - start.y);
                ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
            }

            if (state.fill && (shape === 'rect' || shape === 'circle')) ctx.fill();
            ctx.stroke();
            ctx.restore();
        };

        preview.addEventListener('pointerdown', (e) => {
            preview.setPointerCapture(e.pointerId);
            const pos = getPosition(e);
            state.drawing = true;
            state.start = pos;
            state.last = pos;
            pushHistory();

            if (state.tool === 'brush') {
                drawLine(ctxs[state.activeLayer], pos, pos);
            }
            if (state.tool === 'eraser') {
                drawLine(ctxs[state.activeLayer], pos, pos, true);
            }
        });

        preview.addEventListener('pointermove', (e) => {
            if (!state.drawing) return;
            const pos = getPosition(e);
            if (state.tool === 'brush') {
                drawLine(ctxs[state.activeLayer], state.last, pos);
                state.last = pos;
                return;
            }
            if (state.tool === 'eraser') {
                drawLine(ctxs[state.activeLayer], state.last, pos, true);
                state.last = pos;
                return;
            }

            previewCtx.clearRect(0, 0, preview.width, preview.height);
            drawShape(previewCtx, state.tool, state.start, pos);
        });

        preview.addEventListener('pointerup', (e) => {
            if (!state.drawing) return;
            const pos = getPosition(e);
            if (['line', 'rect', 'circle'].includes(state.tool)) {
                drawShape(ctxs[state.activeLayer], state.tool, state.start, pos, true);
                previewCtx.clearRect(0, 0, preview.width, preview.height);
            }
            state.drawing = false;
        });

        preview.addEventListener('pointercancel', () => {
            state.drawing = false;
            previewCtx.clearRect(0, 0, preview.width, preview.height);
        });

        preview.addEventListener('pointerleave', () => {
            if (!state.drawing) return;
            state.drawing = false;
            previewCtx.clearRect(0, 0, preview.width, preview.height);
        });

        toolButtons.forEach((btn) => {
            btn.addEventListener('click', () => setActiveTool(btn.dataset.tool));
        });

        colorInput.addEventListener('change', () => {
            state.color = colorInput.value;
        });

        sizeInput.addEventListener('input', () => {
            state.size = parseInt(sizeInput.value, 10);
        });

        fillToggle.addEventListener('change', () => {
            state.fill = fillToggle.checked;
        });

        undoBtn.addEventListener('click', () => {
            const history = state.history[state.activeLayer];
            if (!history.length) return;
            const snapshot = history.pop();
            ctxs[state.activeLayer].putImageData(snapshot, 0, 0);
        });

        clearBtn.addEventListener('click', () => {
            pushHistory();
            ctxs[state.activeLayer].clearRect(0, 0, ctxs[state.activeLayer].canvas.width, ctxs[state.activeLayer].canvas.height);
        });

        saveBtn.addEventListener('click', () => {
            const width = ctxs[0].canvas.width;
            const height = ctxs[0].canvas.height;
            const merged = document.createElement('canvas');
            merged.width = width;
            merged.height = height;
            const mctx = merged.getContext('2d');
            layers.forEach((canvas) => {
                if (canvas.style.display === 'none') return;
                mctx.drawImage(canvas, 0, 0);
            });
            const link = document.createElement('a');
            link.download = 'paint.png';
            link.href = merged.toDataURL('image/png');
            link.click();
        });

        layerRadios.forEach((radio) => {
            radio.addEventListener('change', () => {
                if (!radio.checked) return;
                state.activeLayer = parseInt(radio.value, 10);
                statusLabel.textContent = `Layer ${state.activeLayer + 1}`;
            });
        });

        layerVisibility.forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                const index = parseInt(checkbox.dataset.layer, 10);
                layers[index].style.display = checkbox.checked ? 'block' : 'none';
            });
        });

        this.paintApps.set(windowId, { state });
    }

    updateClock() {
        const d = new Date();
        const hrs = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        document.getElementById('clock').innerText = `${hrs}:${mins}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    applyPaletteFromImage(WALLPAPER_URL);
    runBootSequence();
    new Desktop();
});