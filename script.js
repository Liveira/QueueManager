// Desktop Configuration
class Desktop {
    constructor() {
        this.windows = new Map();
        this.windowZIndex = 100;
        this.draggedWindow = null;
        this.resizedWindow = null;
        this.selectedIcon = null;
        this.openedApps = new Map();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        
        // Sample files in system
        this.fileSystem = {
            'Meu Computador': {
                'Disco Local (C:)': {
                    'Documentos': ['Relatório.txt', 'Notas.txt', 'Projeto.txt'],
                    'Downloads': ['Arquivo.zip', 'Imagem.jpg'],
                    'Música': ['Musica1.mp3', 'Musica2.mp3'],
                },
                'Disco Local (D:)': {
                    'Vídeos': ['Video1.mp4', 'Video2.mp4'],
                },
            },
        };
    }

    setupEventListeners() {
        // Desktop Icons
        document.querySelectorAll('.desktop-icon').forEach(icon => {
            icon.addEventListener('click', (e) => this.onIconClick(e, icon));
            icon.addEventListener('dblclick', (e) => this.onIconDoubleClick(e, icon));
        });

        // Start Button
        document.getElementById('startBtn').addEventListener('click', () => this.toggleStartMenu());

        // Start Menu Items
        document.querySelectorAll('.start-menu-item:not(.shutdown-item)').forEach(item => {
            item.addEventListener('click', (e) => this.handleStartMenuClick(e, item));
        });

        document.querySelector('.shutdown-item').addEventListener('click', () => this.shutdown());

        // Close Start Menu on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.start-button') && !e.target.closest('.start-menu')) {
                this.closeStartMenu();
            }
        });

        // Desktop Click
        document.getElementById('desktop').addEventListener('click', (e) => {
            if (e.target.id === 'desktop') {
                this.deselectIcon();
            }
        });
    }

    onIconClick(e, icon) {
        e.stopPropagation();
        this.selectIcon(icon);
    }

    onIconDoubleClick(e, icon) {
        e.stopPropagation();
        const appType = icon.dataset.app;
        this.launchApp(appType);
    }

    selectIcon(icon) {
        if (this.selectedIcon) {
            this.selectedIcon.classList.remove('selected');
        }
        icon.classList.add('selected');
        this.selectedIcon = icon;
    }

    deselectIcon() {
        if (this.selectedIcon) {
            this.selectedIcon.classList.remove('selected');
            this.selectedIcon = null;
        }
    }

    toggleStartMenu() {
        const menu = document.getElementById('startMenu');
        menu.classList.toggle('hidden');
    }

    closeStartMenu() {
        document.getElementById('startMenu').classList.add('hidden');
    }

    handleStartMenuClick(e, item) {
        const text = item.textContent.trim();
        // Could extend this to open folders
        this.closeStartMenu();
    }

    shutdown() {
        if (confirm('Tem certeza que deseja desligar o computador?')) {
            document.body.style.opacity = '0';
            setTimeout(() => {
                alert('Computador desligado com sucesso!');
                document.body.style.opacity = '1';
            }, 500);
        }
    }

    launchApp(appType) {
        let windowId = `${appType}-${Date.now()}`;
        
        switch (appType) {
            case 'computer':
                this.openComputerWindow();
                break;
            case 'notepad':
                this.openNotepadWindow();
                break;
            case 'explorer':
                this.openExplorerWindow();
                break;
            case 'calculator':
                this.openCalculatorWindow();
                break;
            case 'internet':
                this.openInternetWindow();
                break;
            case 'recycle':
                this.openRecycleWindow();
                break;
        }
    }

    openComputerWindow() {
        const content = `
            <div class="explorer-content">
                <div class="file-grid">
                    <div class="file-item" data-type="drive">
                        <div class="file-icon">💾</div>
                        <div class="file-name">Disco Local (C:)</div>
                    </div>
                    <div class="file-item" data-type="drive">
                        <div class="file-icon">💾</div>
                        <div class="file-name">Disco Local (D:)</div>
                    </div>
                    <div class="file-item" data-type="drive">
                        <div class="file-icon">📀</div>
                        <div class="file-name">Drive de DVD</div>
                    </div>
                </div>
            </div>
        `;
        
        const win = this.createWindow('Computador', content, 600, 400, '💻');
        
        win.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('dblclick', () => {
                const name = item.querySelector('.file-name').textContent;
                if (item.dataset.type === 'drive') {
                    this.openDriveWindow(name);
                }
            });
        });
    }

    openDriveWindow(driveName) {
        const structure = this.fileSystem['Meu Computador'][driveName] || {};
        
        let html = '<div class="explorer-sidebar">';
        html += '<div class="explorer-navigation">';
        html += '<div class="explorer-nav-item selected">📁 ' + driveName + '</div>';
        
        Object.keys(structure).forEach(folder => {
            html += `<div class="explorer-nav-item" data-folder="${folder}">📁 ${folder}</div>`;
        });
        
        html += '</div><div class="explorer-content">';
        html += '<div class="file-grid" id="folderContent">';
        
        const firstFolder = Object.keys(structure)[0];
        if (firstFolder) {
            structure[firstFolder].forEach(file => {
                html += `<div class="file-item" data-file="${file}">
                    <div class="file-icon">${this.getFileIcon(file)}</div>
                    <div class="file-name">${file}</div>
                </div>`;
            });
        }
        
        html += '</div></div></div>';
        
        const win = this.createWindow(driveName, html, 700, 450, '📂');
        
        win.querySelectorAll('.explorer-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                win.querySelectorAll('.explorer-nav-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                
                const folder = item.dataset.folder;
                if (folder) {
                    const content = win.querySelector('#folderContent');
                    content.innerHTML = '';
                    
                    structure[folder].forEach(file => {
                        const fileDiv = document.createElement('div');
                        fileDiv.className = 'file-item';
                        fileDiv.dataset.file = file;
                        fileDiv.innerHTML = `
                            <div class="file-icon">${this.getFileIcon(file)}</div>
                            <div class="file-name">${file}</div>
                        `;
                        
                        fileDiv.addEventListener('dblclick', () => this.openFile(file));
                        content.appendChild(fileDiv);
                    });
                }
            });
        });
        
        win.querySelectorAll('.file-item[data-file]').forEach(item => {
            item.addEventListener('dblclick', () => {
                this.openFile(item.dataset.file);
            });
        });
    }

    openFile(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        
        if (['txt', 'log', 'ini', 'cfg'].includes(ext)) {
            this.openNotepadWithFile(fileName);
        } else if (['jpg', 'png', 'gif', 'bmp'].includes(ext)) {
            this.openImageWindow(fileName);
        } else if (['mp3', 'wav', 'flac'].includes(ext)) {
            this.openMediaWindow(fileName, 'áudio');
        } else if (['mp4', 'avi', 'mkv'].includes(ext)) {
            this.openMediaWindow(fileName, 'vídeo');
        } else if (['zip', 'rar', '7z'].includes(ext)) {
            this.openArchiveWindow(fileName);
        } else {
            alert(`Não há programa padrão associado para abrir: ${fileName}`);
        }
    }

    openNotepadWithFile(fileName) {
        const content = `
            <textarea class="notepad-textarea" placeholder="Arquivo: ${fileName}">${fileName} - Conteúdo de exemplo para demonstrar a funcionalidade do Bloco de Notas no Windows 7 Aero.\n\nVocê pode editar este arquivo e qualquer outro arquivo de texto!</textarea>
        `;
        
        this.createWindow(`Bloco de Notas - ${fileName}`, content, 500, 400, '📝');
        
        setTimeout(() => {
            const textarea = document.querySelector('.notepad-textarea');
            if (textarea) textarea.focus();
        }, 100);
    }

    openNotepadWindow() {
        const content = `
            <textarea class="notepad-textarea" placeholder="Digite aqui..."></textarea>
        `;
        
        this.createWindow('Bloco de Notas', content, 500, 400, '📝');
        
        setTimeout(() => {
            const textarea = document.querySelector('.notepad-textarea');
            if (textarea) textarea.focus();
        }, 100);
    }

    openExplorerWindow() {
        const content = `
            <div class="explorer-sidebar">
                <div class="explorer-navigation">
                    <div class="explorer-nav-item selected">📁 Documentos</div>
                    <div class="explorer-nav-item">📁 Imagens</div>
                    <div class="explorer-nav-item">📁 Vídeos</div>
                    <div class="explorer-nav-item">📁 Música</div>
                    <div class="explorer-nav-item">📁 Downloads</div>
                    <div class="explorer-nav-item">💻 Meu Computador</div>
                </div>
                <div class="explorer-content">
                    <div class="file-grid">
                        <div class="file-item" data-type="folder">
                            <div class="file-icon">📁</div>
                            <div class="file-name">Projetos</div>
                        </div>
                        <div class="file-item" data-type="file">
                            <div class="file-icon">📄</div>
                            <div class="file-name">Relatório.txt</div>
                        </div>
                        <div class="file-item" data-type="file">
                            <div class="file-icon">📄</div>
                            <div class="file-name">Notas.txt</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.createWindow('Explorador de Arquivos', content, 650, 450, '📂');
    }

    openCalculatorWindow() {
        const content = `
            <div style="padding: 15px; background: white; height: 100%; display: flex; flex-direction: column;">
                <input type="text" id="calcDisplay" style="
                    width: 100%;
                    padding: 10px;
                    font-size: 20px;
                    border: 1px inset #999;
                    background: white;
                    color: #000;
                    text-align: right;
                    margin-bottom: 15px;
                    font-family: Arial, sans-serif;
                " readonly value="0">
                
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; flex: 1;">
                    <button data-key="C" style="grid-column: span 2;">CE</button>
                    <button data-key="/">÷</button>
                    <button data-key="*">×</button>
                    
                    <button data-key="7">7</button>
                    <button data-key="8">8</button>
                    <button data-key="9">9</button>
                    <button data-key="-">-</button>
                    
                    <button data-key="4">4</button>
                    <button data-key="5">5</button>
                    <button data-key="6">6</button>
                    <button data-key="+">+</button>
                    
                    <button data-key="1">1</button>
                    <button data-key="2">2</button>
                    <button data-key="3">3</button>
                    <button data-key="=">=</button>
                    
                    <button data-key="0" style="grid-column: span 2;">0</button>
                    <button data-key=".">.</button>
                </div>
            </div>
        `;
        
        const win = this.createWindow('Calculadora', content, 280, 320, '🧮');
        this.setupCalculator(win);
    }

    setupCalculator(win) {
        const display = win.querySelector('#calcDisplay');
        const buttons = win.querySelectorAll('button');
        
        let current = '0';
        let operator = null;
        let previous = null;
        
        buttons.forEach(btn => {
            btn.style.cssText = `
                padding: 10px;
                font-size: 14px;
                cursor: pointer;
                background: linear-gradient(to bottom, #f0f0f0, #d9d9d9);
                border: 1px outset #999;
                border-radius: 2px;
                font-weight: bold;
                transition: all 0.1s;
            `;
            
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                
                if (key === 'C') {
                    current = '0';
                    operator = null;
                    previous = null;
                } else if (key === '=') {
                    if (operator && previous !== null) {
                        const result = this.calculate(previous, current, operator);
                        current = String(result);
                        operator = null;
                        previous = null;
                    }
                } else if (['+', '-', '/', '*'].includes(key)) {
                    if (operator && previous !== null) {
                        current = String(this.calculate(previous, current, operator));
                    }
                    operator = key;
                    previous = current;
                    current = '0';
                } else {
                    if (key === '.' && current.includes('.')) return;
                    current = current === '0' && key !== '.' ? key : current + key;
                }
                
                display.value = current;
            });
        });
    }

    calculate(a, b, op) {
        a = parseFloat(a);
        b = parseFloat(b);
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return a / b;
            default: return b;
        }
    }

    openImageWindow(fileName) {
        const content = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #fff;">
                <div style="text-align: center;">
                    <div style="font-size: 80px; margin-bottom: 15px;">🖼️</div>
                    <div style="font-size: 12px; color: #666;">Pré-visualização: ${fileName}</div>
                    <div style="font-size: 11px; color: #999; margin-top: 5px;">[Imagem de exemplo]</div>
                </div>
            </div>
        `;
        
        this.createWindow(`Visualizador de Imagens - ${fileName}`, content, 500, 400, '🖼️');
    }

    openMediaWindow(fileName, type) {
        const icon = type === 'áudio' ? '🎵' : '🎬';
        const content = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: linear-gradient(to bottom, #f5f5f5, #e5e5e5); padding: 20px;">
                <div style="font-size: 60px; margin-bottom: 15px;">${icon}</div>
                <div style="font-size: 14px; margin-bottom: 20px; font-weight: bold;">${fileName}</div>
                <div style="width: 100%; max-width: 300px; background: #ddd; border: 1px solid #999; border-radius: 3px; height: 30px; margin-bottom: 15px; display: flex; align-items: center; padding: 0 5px;">
                    <div style="height: 4px; width: 40%; background: #0066cc; border-radius: 2px;"></div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button style="padding: 5px 15px; background: linear-gradient(to bottom, #f0f0f0, #d9d9d9); border: 1px outset #999; border-radius: 2px; cursor: pointer; font-size: 12px;">▶ Reproduzir</button>
                    <button style="padding: 5px 15px; background: linear-gradient(to bottom, #f0f0f0, #d9d9d9); border: 1px outset #999; border-radius: 2px; cursor: pointer; font-size: 12px;">⏸ Pausar</button>
                </div>
            </div>
        `;
        
        this.createWindow(`${type.charAt(0).toUpperCase() + type.slice(1)} - ${fileName}`, content, 480, 360, icon);
    }

    openArchiveWindow(fileName) {
        const content = `
            <div style="padding: 15px;">
                <div style="font-size: 12px; margin-bottom: 15px;">
                    <strong>Arquivo:</strong> ${fileName}
                </div>
                <div style="background: white; border: 1px solid #ccc; border-radius: 3px; padding: 10px; margin-bottom: 15px;">
                    <div style="font-size: 11px; margin-bottom: 10px; color: #666;">Conteúdo do arquivo:</div>
                    <div style="font-size: 11px; line-height: 1.6;">
                        📄 documento.txt (5 KB)<br>
                        🖼️ imagem.jpg (250 KB)<br>
                        📹 video.mp4 (1.2 GB)<br>
                        📁 pasta_projeto/<br>
                        &nbsp;&nbsp;📄 projeto.doc (50 KB)<br>
                        &nbsp;&nbsp;📄 notas.txt (2 KB)
                    </div>
                </div>
                <button style="padding: 8px 20px; background: linear-gradient(to bottom, #f0f0f0, #d9d9d9); border: 1px outset #999; border-radius: 2px; cursor: pointer; font-size: 12px;">Extrair Tudo...</button>
            </div>
        `;
        
        this.createWindow(`Winrar - ${fileName}`, content, 400, 350, '📦');
    }

    openRecycleWindow() {
        const content = `
            <div style="padding: 15px; text-align: center; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="font-size: 60px; margin-bottom: 15px;">🗑️</div>
                <div style="font-size: 14px; margin-bottom: 10px; font-weight: bold;">Lixeira</div>
                <div style="font-size: 12px; color: #666; margin-bottom: 20px;">A lixeira está vazia</div>
                <div style="font-size: 11px; color: #999;">Objetos que você excluir aparecerão aqui.</div>
            </div>
        `;
        
        this.createWindow('Lixeira', content, 400, 300, '🗑️');
    }

    openInternetWindow() {
        const content = `
            <div style="display: flex; flex-direction: column; height: 100%; background: white;">
                <div style="background: linear-gradient(to bottom, #f0f0f0, #e5e5e5); padding: 8px; border-bottom: 1px solid #999; display: flex; gap: 5px;">
                    <button style="padding: 4px 8px; background: linear-gradient(to bottom, #f0f0f0, #d9d9d9); border: 1px outset #999; border-radius: 2px; cursor: pointer; font-size: 11px;">← Voltar</button>
                    <button style="padding: 4px 8px; background: linear-gradient(to bottom, #f0f0f0, #d9d9d9); border: 1px outset #999; border-radius: 2px; cursor: pointer; font-size: 11px;">Avançar →</button>
                    <button style="padding: 4px 8px; background: linear-gradient(to bottom, #f0f0f0, #d9d9d9); border: 1px outset #999; border-radius: 2px; cursor: pointer; font-size: 11px;">🔄 Atualizar</button>
                    <input type="text" style="flex: 1; padding: 4px 8px; border: 1px inset #999; border-radius: 2px; font-size: 11px;" value="about:blank" readonly>
                </div>
                <div style="flex: 1; padding: 20px; overflow: auto;">
                    <div style="text-align: center; color: #666;">
                        <div style="font-size: 14px; margin-bottom: 10px;">🌐 Internet Explorer</div>
                        <div style="font-size: 12px;">Bem-vindo ao Internet Explorer!</div>
                        <div style="font-size: 11px; margin-top: 15px; color: #999;">Esta é uma simulação do Windows 7 Aero. A navegação real não está disponível.</div>
                    </div>
                </div>
            </div>
        `;
        
        this.createWindow('Internet Explorer', content, 700, 500, '🌐');
    }

    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        
        const icons = {
            'txt': '📄',
            'doc': '📄',
            'pdf': '📕',
            'jpg': '🖼️',
            'png': '🖼️',
            'gif': '🖼️',
            'zip': '📦',
            'rar': '📦',
            '7z': '📦',
            'mp3': '🎵',
            'wav': '🎵',
            'flac': '🎵',
            'mp4': '🎬',
            'avi': '🎬',
            'mkv': '🎬',
            'exe': '⚙️',
            'msi': '💾',
        };
        
        return icons[ext] || '📋';
    }

    createWindow(title, content, width = 500, height = 400, icon = '📁') {
        const windowId = `window-${Date.now()}`;
        
        const windowEl = document.createElement('div');
        windowEl.className = 'window resizable';
        windowEl.id = windowId;
        windowEl.style.width = width + 'px';
        windowEl.style.height = height + 'px';
        windowEl.style.left = (50 + Math.random() * 100) + 'px';
        windowEl.style.top = (50 + Math.random() * 100) + 'px';
        
        windowEl.innerHTML = `
            <div class="window-title-bar">
                <div class="window-title">
                    <div class="window-title-bar-icon">${icon}</div>
                    <span>${title}</span>
                </div>
                <div class="window-controls">
                    <button class="window-control-btn window-minimize-btn" title="Minimizar">_</button>
                    <button class="window-control-btn window-maximize-btn" title="Maximizar">□</button>
                    <button class="window-control-btn window-close-btn" title="Fechar">✕</button>
                </div>
            </div>
            <div class="window-content">
                ${content}
            </div>
        `;
        
        document.getElementById('windowsContainer').appendChild(windowEl);
        
        // Setup Window Events
        this.setupWindowEvents(windowEl, title, icon);
        
        // Add to taskbar
        this.addToTaskbar(windowId, title, icon);
        
        // Focus window
        this.focusWindow(windowEl);
        
        return windowEl;
    }

    setupWindowEvents(windowEl, title, icon) {
        const titleBar = windowEl.querySelector('.window-title-bar');
        const closeBtn = windowEl.querySelector('.window-close-btn');
        const minimizeBtn = windowEl.querySelector('.window-minimize-btn');
        const maximizeBtn = windowEl.querySelector('.window-maximize-btn');
        
        let isDragging = false;
        let offset = { x: 0, y: 0 };
        
        titleBar.addEventListener('mousedown', (e) => {
            if (e.target === titleBar || e.target.closest('.window-title')) {
                isDragging = true;
                const rect = windowEl.getBoundingClientRect();
                offset.x = e.clientX - rect.left;
                offset.y = e.clientY - rect.top;
                this.focusWindow(windowEl);
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                windowEl.style.left = (e.clientX - offset.x) + 'px';
                windowEl.style.top = (e.clientY - offset.y) + 'px';
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // Resize
        let isResizing = false;
        windowEl.addEventListener('mousedown', (e) => {
            if (e.offsetX > windowEl.offsetWidth - 15 && e.offsetY > windowEl.offsetHeight - 15) {
                isResizing = true;
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isResizing) {
                windowEl.style.width = (e.clientX - windowEl.getBoundingClientRect().left) + 'px';
                windowEl.style.height = (e.clientY - windowEl.getBoundingClientRect().top) + 'px';
            }
        });
        
        document.addEventListener('mouseup', () => {
            isResizing = false;
        });
        
        // Buttons
        closeBtn.addEventListener('click', () => this.closeWindow(windowEl));
        minimizeBtn.addEventListener('click', () => this.minimizeWindow(windowEl));
        maximizeBtn.addEventListener('click', () => this.maximizeWindow(windowEl));
        
        // Focus on click
        windowEl.addEventListener('mousedown', () => this.focusWindow(windowEl));
    }

    focusWindow(windowEl) {
        document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
        windowEl.classList.add('focused');
        windowEl.style.zIndex = ++this.windowZIndex;
    }

    closeWindow(windowEl) {
        const taskbarBtn = document.querySelector(`[data-window-id="${windowEl.id}"]`);
        if (taskbarBtn) taskbarBtn.remove();
        windowEl.style.animation = 'popIn 0.2s ease reverse';
        setTimeout(() => windowEl.remove(), 200);
    }

    minimizeWindow(windowEl) {
        windowEl.style.display = 'none';
        const taskbarBtn = document.querySelector(`[data-window-id="${windowEl.id}"]`);
        if (taskbarBtn) taskbarBtn.classList.add('minimized');
    }

    maximizeWindow(windowEl) {
        if (windowEl.classList.contains('maximized')) {
            windowEl.classList.remove('maximized');
            windowEl.style.width = '';
            windowEl.style.height = '';
            windowEl.style.left = '';
            windowEl.style.top = '';
        } else {
            windowEl.classList.add('maximized');
            windowEl.style.width = '100%';
            windowEl.style.height = 'calc(100% - 80px)';
            windowEl.style.left = '0';
            windowEl.style.top = '0';
        }
    }

    addToTaskbar(windowId, title, icon) {
        const taskbarMiddle = document.getElementById('taskbarMiddle');
        
        const btn = document.createElement('div');
        btn.className = 'taskbar-item active';
        btn.dataset.windowId = windowId;
        btn.innerHTML = `${icon} ${title}`;
        
        btn.addEventListener('click', () => {
            const windowEl = document.getElementById(windowId);
            if (windowEl.style.display === 'none') {
                windowEl.style.display = '';
                btn.classList.remove('minimized');
            } else {
                this.minimizeWindow(windowEl);
            }
        });
        
        taskbarMiddle.appendChild(btn);
    }

    updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('clock').textContent = `${hours}:${minutes}`;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    new Desktop();
});
