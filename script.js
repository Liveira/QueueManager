class Desktop {
    constructor() {
        this.windowZIndex = 100;
        this.selectedIcon = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        
        // Mock file system
        this.fileSystem = {
            'Meu Computador': ['C:', 'D:']
        };
    }

    setupEventListeners() {
        // Desktop Icons
        document.querySelectorAll('.desktop-icon').forEach(icon => {
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

        // Start Button
        document.getElementById('startBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('startMenu').classList.toggle('hidden');
        });

        // Click outside closes start menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#startBtn') && !e.target.closest('#startMenu')) {
                document.getElementById('startMenu').classList.add('hidden');
            }
            if (e.target.id === 'desktop') {
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
        if (appType === 'computer') this.createWindow('Meu Computador', '💻', '<div style="padding:20px;">Disco Local (C:)<br>Disco Local (D:)</div>');
        else if (appType === 'recycle') this.createWindow('Lixeira', '🗑️', '<div style="padding:20px;text-align:center;color:#666;">A lixeira está vazia</div>');
        else if (appType === 'internet') this.createWindow('Internet Explorer', '🌐', '<div class="browser" style="height:100%; display:flex; flex-direction:column;"><div style="background:#eef; border-bottom:1px solid #ccc; padding:5px;"><input type="text" value="about:blank" style="width:100%;"></div><div style="padding:20px; text-align:center;">Navegação simulada.</div></div>');
        else if (appType === 'explorer') this.createWindow('Bibliotecas', '📁', '<div style="padding:20px;">Documentos<br>Imagens<br>Músicas</div>');
        else this.createWindow(appType, '📄', '<div style="padding:20px;">Aplicativo genérico</div>');
    }

    createWindow(title, icon, content, width = 600, height = 450) {
        const windowId = `win-${Date.now()}`;
        const win = document.createElement('div');
        win.className = 'window focused';
        win.id = windowId;
        win.style.width = width + 'px';
        win.style.height = height + 'px';
        win.style.left = (Math.random() * 100 + 50) + 'px';
        win.style.top = (Math.random() * 50 + 50) + 'px';
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
        
        document.querySelectorAll('.window').forEach(w => w !== win && w.classList.remove('focused'));
    }

    setupWindowEvents(win, id, title, icon) {
        const titleBar = win.querySelector('.window-title-bar');
        
        win.addEventListener('mousedown', () => {
            document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
            win.classList.add('focused');
            win.style.zIndex = ++this.windowZIndex;
            document.querySelectorAll('.taskbar-item').forEach(t => t.classList.remove('active'));
            const tbItem = document.querySelector(`[data-winid="${id}"]`);
            if (tbItem) tbItem.classList.add('active');
        });

        // Dragging
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

        document.addEventListener('mouseup', () => isDragging = false);

        // Controls
        win.querySelector('.window-close-btn').addEventListener('click', () => {
            win.remove();
            const tbItem = document.querySelector(`[data-winid="${id}"]`);
            if (tbItem) tbItem.remove();
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
        
        document.querySelectorAll('.taskbar-item').forEach(t => t.classList.remove('active'));
        
        item.addEventListener('click', () => {
            const win = document.getElementById(id);
            if (!win) return;

            if (win.style.display === 'none') {
                win.style.display = 'flex';
                // focus
                document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
                win.classList.add('focused');
                win.style.zIndex = ++this.windowZIndex;
                document.querySelectorAll('.taskbar-item').forEach(t => t.classList.remove('active'));
                item.classList.add('active');
            } else if (win.classList.contains('focused')) {
                win.style.display = 'none';
                win.classList.remove('focused');
                item.classList.remove('active');
            } else {
                document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
                win.classList.add('focused');
                win.style.zIndex = ++this.windowZIndex;
                document.querySelectorAll('.taskbar-item').forEach(t => t.classList.remove('active'));
                item.classList.add('active');
            }
        });
        tb.appendChild(item);
    }

    updateClock() {
        const d = new Date();
        const hrs = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        document.getElementById('clock').innerText = `${hrs}:${mins}`;
    }
}

document.addEventListener('DOMContentLoaded', () => new Desktop());