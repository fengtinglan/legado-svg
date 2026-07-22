(() => {
    const STORAGE_KEY = 'customSvgUrl';
    const DEFAULT_URL = 'https://to-svg.com/zh';
    const COMPRESS_STORAGE_KEY = 'customCompressUrl';
    const DEFAULT_COMPRESS_URL = 'https://svg.wxeditor.com/tool/svg-compress';
    const BUBBLE_ICON_STORAGE_KEY = 'customBubbleIconUrl';
    const DEFAULT_BUBBLE_ICON_URL = 'https://icon.sucai999.com/s-%E6%B0%94%E6%B3%A1-1.html';

    const COLOR_REGEX = /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|rgb(a?)\([^\)]+\)|hsl(a?)\([^\)]+\)/g;
    const HALF_RATIO = 0.60, FULL_TRIGGER_RATIO = 0.85, CLOSE_RATIO = 0.30;

    let isFullscreen = false, windowHeight = window.innerHeight;
    let toolsOpen = false, currentInputMode = 'code', isSunnyMode = false;
    let currentPreviewCode = null;
    let keepModified = false;

    let originalTextFill = '#000000';
    let originalStrokeColor = '#000000';
    let originalFillColor = '#ffffff';
    let originalShapeFills = [];
    let originalShapeOpacities = [];
    let selectedTccolorIndices = [];
    let _backupSelectedTccolorIndices = [];

    const $ = id => document.getElementById(id);
    const input = $('codeInput'), resultDisplay = $('resultDisplay');
    const statsAndTools = $('statsAndTools'), colorCountSpan = $('colorCount');
    const selectedCountSpan = $('selectedCount'), replaceArea = $('replaceArea');
    const replaceInput = $('replaceInput'), replaceBtn = $('replaceBtn'), replaceStatus = $('replaceStatus');
    const toastContainer = document.querySelector('#toast-container');
    const uploadZone = $('uploadZone'), fileInput = $('fileInput');
    const imageUploadZone = $('imageUploadZone'), imageFileInput = $('imageFileInput');
    const codeTabBtn = $('codeTabBtn'), uploadTabBtn = $('uploadTabBtn'), imageTabBtn = $('imageTabBtn');
    const bubbleSection = $('bubbleSection'), bubblePreviewBox = $('bubblePreviewBox');
    const bubbleTitleText = $('bubbleTitleText');
    const textX = $('textX'), textY = $('textY'), textSize = $('textSize');
    const textFill = $('textFill'), textContent = $('textContent'), textFont = $('textFont'), textWeight = $('textWeight');
    const strokeWidth = $('strokeWidth'), strokeColorInput = $('strokeColorInput'), strokeColorPreview = $('strokeColorPreview'), strokeColorPicker = $('strokeColorPicker');
    const bgColor = $('bgColor'), applyBgColorBtn = $('applyBgColorBtn');
    const applyBubbleBtn = $('applyBubbleBtn'), exportBubbleBtn = $('exportBubbleBtn'), bubbleCodeOutput = $('bubbleCodeOutput');
    const convertReadingBtn = $('convertReadingBtn'), sunnyFormatBtn = $('sunnyFormatBtn');
    const strokeOpacityInput = $('strokeOpacity'), fillColorInput = $('fillColorInput'), fillOpacityInput = $('fillOpacity');
    const fillColorPreview = $('fillColorPreview'), fillColorPicker = $('fillColorPicker');
    const sunnyControls = document.querySelectorAll('.sunny-only');
    const rotateAngleInput = $('rotateAngle'), textRotateAngleInput = $('textRotateAngle');
    const exportModalOverlay = $('exportModalOverlay'), exportModalClose = $('exportModalClose');
    const exportCopyCodeBtn = $('exportCopyCodeBtn'), exportTxtBtn = $('exportTxtBtn'), exportSvgBtn = $('exportSvgBtn');
    const helpModalOverlay = $('helpModalOverlay'), helpModalClose = $('helpModalClose'), helpBtn = $('helpBtn');
    const changelogModalOverlay = $('changelogModalOverlay'), changelogModalClose = $('changelogModalClose'), changelogBtn = $('changelogBtn');
    const keepModifiedModalOverlay = $('keepModifiedModalOverlay');
    const keepModifiedModalClose = $('keepModifiedModalClose');
    const keepModifiedConfirmBtn = $('keepModifiedConfirmBtn');
    const keepModifiedCancelBtn = $('keepModifiedCancelBtn');
    const keepModifiedTable = $('keepModifiedTable');

    let tccolorModalOverlay, tccolorModal, tccolorCheckContainer, tccolorConfirmBtn, tccolorCancelBtn, tccolorCloseBtn;
    let isTccolorModalOpen = false;

    function createTccolorModal() {
        tccolorModalOverlay = document.createElement('div');
        tccolorModalOverlay.className = 'help-modal-overlay';
        tccolorModalOverlay.style.zIndex = '10005';
        document.body.appendChild(tccolorModalOverlay);

        tccolorModal = document.createElement('div');
        tccolorModal.className = 'help-modal';
        tccolorModal.style.maxWidth = '480px';
        tccolorModal.innerHTML = `
            <div class="help-modal-header">
                <h2>🎨 选择 $tccolor 形状</h2>
                <button class="help-modal-close" id="tccolorModalCloseBtn">&times;</button>
            </div>
            <div class="help-modal-body">
                <p style="margin-bottom:12px;">请至少选择一个形状区域使用 <strong>$tccolor</strong> 变量（勾选后预览图将显示斜线标记）：</p>
                <div id="tccolorCheckContainer" style="max-height: 100px; overflow-y: auto;"></div>
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">
                    <button id="tccolorSelectAllBtn" class="cp-btn-close" style="padding:8px 20px; background:#f1f5f9; color:#475569;">全选</button>
                    <button id="tccolorConfirmBtn" class="btn-apply" style="padding:8px 20px;">确认</button>
                    <button id="tccolorCancelBtn" class="cp-btn-close" style="padding:8px 20px; background:#f1f5f9; color:#475569;">取消</button>
                </div>
            </div>
        `;
        tccolorModalOverlay.appendChild(tccolorModal);

        tccolorCheckContainer = tccolorModal.querySelector('#tccolorCheckContainer');
        tccolorConfirmBtn = tccolorModal.querySelector('#tccolorConfirmBtn');
        tccolorCancelBtn = tccolorModal.querySelector('#tccolorCancelBtn');
        tccolorCloseBtn = tccolorModal.querySelector('#tccolorModalCloseBtn');

        tccolorConfirmBtn.addEventListener('click', onTccolorConfirm);
        tccolorCancelBtn.addEventListener('click', onTccolorCancel);
        tccolorCloseBtn.addEventListener('click', onTccolorCancel);
        tccolorModalOverlay.addEventListener('click', e => {
            if (e.target === tccolorModalOverlay) onTccolorCancel();
        });
    }

    function openTccolorModal() {
        const shapeCount = shapeFillInputs.length;
        if (shapeCount === 0) {
            showToast('没有可选的形状区域', 'error');
            return;
        }
        _backupSelectedTccolorIndices = [...selectedTccolorIndices];
        tccolorCheckContainer.innerHTML = '';
        for (let i = 0; i < shapeCount; i++) {
            const row = document.createElement('div');
            row.className = 'kv-row';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'tccolor-check-item';
            cb.value = i;
            cb.checked = selectedTccolorIndices.includes(i);
            const label = document.createElement('span');
            label.textContent = `区域 ${i + 1} (当前颜色: ${shapeFillInputs[i].value})`;
            row.appendChild(cb);
            row.appendChild(label);
            tccolorCheckContainer.appendChild(row);
            cb.addEventListener('change', () => {
                const allCbs = Array.from(tccolorCheckContainer.querySelectorAll('.tccolor-check-item'));
                selectedTccolorIndices = allCbs.filter(c => c.checked).map(c => parseInt(c.value));
                updateBubblePreview();
            });
        }

        const selectAllBtn = tccolorModal.querySelector('#tccolorSelectAllBtn');
        if (selectAllBtn) {
            selectAllBtn.onclick = () => {
                const allCbs = Array.from(tccolorCheckContainer.querySelectorAll('.tccolor-check-item'));
                const allChecked = allCbs.every(cb => cb.checked);
                allCbs.forEach(cb => { cb.checked = !allChecked; });
                selectedTccolorIndices = allChecked ? [] : allCbs.map(cb => parseInt(cb.value));
                selectAllBtn.textContent = allChecked ? '全选' : '取消全选';
                updateBubblePreview();
            };
        }

        isTccolorModalOpen = true;
        tccolorModalOverlay.classList.add('active');
    }

    function closeTccolorModal() {
        isTccolorModalOpen = false;
        tccolorModalOverlay.classList.remove('active');
    }

    function onTccolorConfirm() {
        const allCbs = Array.from(tccolorCheckContainer.querySelectorAll('.tccolor-check-item'));
        const checked = allCbs.filter(c => c.checked).map(c => parseInt(c.value));
        if (checked.length === 0) {
            showToast('请至少选择一个形状区域作为 $tccolor', 'error');
            return;
        }
        selectedTccolorIndices = checked;
        closeTccolorModal();
        showKeepModifiedModal();
    }

    function onTccolorCancel() {
        selectedTccolorIndices = [..._backupSelectedTccolorIndices];
        closeTccolorModal();
        updateBubblePreview();
    }

    createTccolorModal();

    const keepModifiedRow = $('keepModifiedRow');
    if (keepModifiedRow) keepModifiedRow.style.display = 'none';
    const keepModifiedBtn = $('keepModifiedBtn');
    if (keepModifiedBtn) {
        keepModifiedBtn.replaceWith(keepModifiedBtn.cloneNode(true));
    }

    let fillPerShapeContainer = $('fillPerShapeContainer');
    if (!fillPerShapeContainer) {
        fillPerShapeContainer = document.createElement('div');
        fillPerShapeContainer.id = 'fillPerShapeContainer';
        const bubbleControls = $('bubbleControls');
        if (bubbleControls) {
            const titles = bubbleControls.querySelectorAll('.control-section-title');
            let inserted = false;
            titles.forEach(title => {
                if (title.textContent.includes('填充颜色') && !inserted) {
                    title.after(fillPerShapeContainer);
                    inserted = true;
                }
            });
            if (!inserted) bubbleControls.appendChild(fillPerShapeContainer);
        }
    }
    fillPerShapeContainer.style.maxHeight = '300px';
    fillPerShapeContainer.style.overflowY = 'auto';

    let shapeFillInputs = [];
    let shapeFillOpacityInputs = [];

    $('compressBtn').addEventListener('click', openCompressModal);
    $('compressCustomLinkBtn').addEventListener('click', customCompressLink);
    $('bubbleIconBtn').addEventListener('click', openBubbleIconModal);
    $('bubbleIconCustomLinkBtn').addEventListener('click', customBubbleIconLink);

    const TEXT_EXTENSIONS = new Set(['svg','txt','html','htm','xml','css','js','json','md','ts','jsx','tsx','vue','svelte']);

    const colorPicker = {
        panel: null, overlay: null, svCanvas: null, svCtx: null, svCursor: null,
        hueBar: null, hueThumb: null, currentInput: null, copyBtn: null,
        targetPreview: null, targetInput: null, hue: 0, sat: 1, val: 1,
        active: false, draggingSv: false, draggingHue: false, independentMode: false,
        confirmBtn: null,
        init() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'color-picker-overlay';
            document.body.appendChild(this.overlay);
            this.overlay.addEventListener('click', () => this.close());

            this.panel = document.createElement('div');
            this.panel.className = 'color-picker-panel';
            this.panel.innerHTML = `
                <div class="cp-sv-box"><canvas></canvas><div class="cp-sv-cursor"></div></div>
                <div class="cp-hue-bar"><div class="cp-hue-thumb"></div></div>
                <div class="cp-current-color">
                    <span class="color-preview" id="cpPreview" style="background-color:#ff0000;"></span>
                    <input type="text" class="cp-current-input" value="#ff0000">
                    <button class="cp-copy-btn">复制</button>
                    <button class="cp-apply-btn" style="margin-left:4px; padding:10px 14px; background:#3b82f6; color:white; border:none; border-radius:12px; font-weight:600; cursor:pointer;">确定</button>
                </div>
                <div class="cp-presets">
                    <div class="cp-preset-swatch" style="background:#000000" data-color="#000000"></div>
                    <div class="cp-preset-swatch" style="background:#ffffff" data-color="#ffffff"></div>
                    <div class="cp-preset-swatch" style="background:#ef4444" data-color="#ef4444"></div>
                    <div class="cp-preset-swatch" style="background:#3b82f6" data-color="#3b82f6"></div>
                    <div class="cp-preset-swatch" style="background:#10b981" data-color="#10b981"></div>
                    <div class="cp-preset-swatch" style="background:#f59e0b" data-color="#f59e0b"></div>
                </div>
                <div class="cp-actions">
                    <button class="cp-btn-close">关闭</button>
                </div>
            `;
            document.body.appendChild(this.panel);

            this.svCanvas = this.panel.querySelector('canvas');
            this.svCtx = this.svCanvas.getContext('2d');
            this.svCursor = this.panel.querySelector('.cp-sv-cursor');
            this.hueBar = this.panel.querySelector('.cp-hue-bar');
            this.hueThumb = this.panel.querySelector('.cp-hue-thumb');
            this.currentInput = this.panel.querySelector('.cp-current-input');
            this.copyBtn = this.panel.querySelector('.cp-copy-btn');
            this.cpPreview = this.panel.querySelector('#cpPreview');
            this.confirmBtn = this.panel.querySelector('.cp-apply-btn');
            const presets = this.panel.querySelectorAll('.cp-preset-swatch');

            const svBox = this.panel.querySelector('.cp-sv-box');
            svBox.addEventListener('mousedown', e => this.startSv(e));
            svBox.addEventListener('touchstart', e => this.startSv(e), { passive: false });
            this.hueBar.addEventListener('mousedown', e => this.startHue(e));
            this.hueBar.addEventListener('touchstart', e => this.startHue(e), { passive: false });

            this.confirmBtn.addEventListener('click', () => {
                const hex = this.currentInput.value.trim();
                if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
                    let fullHex = hex;
                    if (hex.length === 4) {
                        fullHex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
                    }
                    this.currentInput.value = fullHex;
                    this.cpPreview.style.backgroundColor = fullHex;
                    const [r, g, b] = this.hexToRgb(fullHex);
                    const [h, s, v] = this.rgbToHsv(r, g, b);
                    this.hue = h;
                    this.sat = s;
                    this.val = v;
                    this.drawSv();
                    this.updateHueThumb();
                    this.applyColorToTarget();
                } else {
                    const curColor = this.getCurrentColor();
                    this.currentInput.value = curColor;
                    this.cpPreview.style.backgroundColor = curColor;
                    this.applyColorToTarget();
                }
            });

            presets.forEach(el => {
                el.addEventListener('click', e => {
                    e.stopPropagation();
                    const color = el.dataset.color;
                    if (this.targetInput && !this.independentMode) {
                        this.targetInput.value = color;
                        this.syncPreview();
                        if ([strokeColorInput, fillColorInput, bgColor].includes(this.targetInput) || this.targetInput.classList.contains('shape-fill-input')) {
                            updateBubblePreview();
                        }
                        updateVariableStyle(this.targetInput);
                        updateVariableLabel(this.targetInput);
                    }
                    this.currentInput.value = color;
                    this.cpPreview.style.backgroundColor = color;
                    this.applyColorToTarget();
                    this.close();
                });
            });

            this.copyBtn.addEventListener('click', e => {
                e.stopPropagation();
                const val = this.currentInput.value;
                copyText(val, `已复制颜色 ${val}`);
            });

            this.panel.querySelector('.cp-btn-close').addEventListener('click', () => this.close());

            document.addEventListener('mousemove', e => this.moveSv(e));
            document.addEventListener('mouseup', () => this.endSv());
            document.addEventListener('touchmove', e => this.moveSv(e), { passive: false });
            document.addEventListener('touchend', () => this.endSv());
            document.addEventListener('mousemove', e => this.moveHue(e));
            document.addEventListener('mouseup', () => this.endHue());
            document.addEventListener('touchmove', e => this.moveHue(e), { passive: false });
            document.addEventListener('touchend', () => this.endHue());

            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
        },
        resizeCanvas() { if (!this.svCanvas) return; const rect = this.svCanvas.parentElement.getBoundingClientRect(); const w = rect.width || 280; this.svCanvas.width = w; this.svCanvas.height = 200; this.drawSv(); },
        drawSv() { const ctx = this.svCtx, w = this.svCanvas.width, h = this.svCanvas.height; ctx.clearRect(0,0,w,h); ctx.fillStyle = `hsl(${this.hue},100%,50%)`; ctx.fillRect(0,0,w,h); const whiteGrad = ctx.createLinearGradient(0,0,w,0); whiteGrad.addColorStop(0,'white'); whiteGrad.addColorStop(1,'transparent'); ctx.fillStyle = whiteGrad; ctx.fillRect(0,0,w,h); const blackGrad = ctx.createLinearGradient(0,0,0,h); blackGrad.addColorStop(0,'transparent'); blackGrad.addColorStop(1,'black'); ctx.fillStyle = blackGrad; ctx.fillRect(0,0,w,h); this.updateSvCursor(); },
        updateSvCursor() { const w = this.svCanvas.width, h = this.svCanvas.height; const x = this.sat * w, y = (1-this.val) * h; this.svCursor.style.left = x+'px'; this.svCursor.style.top = y+'px'; },
        updateHueThumb() { const barWidth = this.hueBar.clientWidth; const x = (this.hue/360) * barWidth; this.hueThumb.style.left = x+'px'; },
        setHueFromPos(clientX) { const rect = this.hueBar.getBoundingClientRect(); const barWidth = rect.width; let x = clientX - rect.left; x = Math.max(0, Math.min(barWidth, x)); this.hue = (x/barWidth)*360; this.drawSv(); this.updateHueThumb(); this.applyColorToTarget(); },
        setSvFromPos(clientX, clientY) { const rect = this.svCanvas.parentElement.getBoundingClientRect(); const w = rect.width, h = rect.height; let x = clientX - rect.left, y = clientY - rect.top; x = Math.max(0, Math.min(w, x)); y = Math.max(0, Math.min(h, y)); this.sat = x/w; this.val = 1 - y/h; this.updateSvCursor(); this.applyColorToTarget(); },
        startSv(e) { e.preventDefault(); this.draggingSv = true; this.setSvFromPos(e.touches?e.touches[0].clientX:e.clientX, e.touches?e.touches[0].clientY:e.clientY); },
        moveSv(e) { if (!this.draggingSv) return; this.setSvFromPos(e.touches?e.touches[0].clientX:e.clientX, e.touches?e.touches[0].clientY:e.clientY); },
        endSv() { this.draggingSv = false; },
        startHue(e) { e.preventDefault(); this.draggingHue = true; this.setHueFromPos(e.touches?e.touches[0].clientX:e.clientX); },
        moveHue(e) { if (!this.draggingHue) return; this.setHueFromPos(e.touches?e.touches[0].clientX:e.clientX); },
        endHue() { this.draggingHue = false; },
        getCurrentColor() { const [r,g,b] = this.hsvToRgb(this.hue, this.sat, this.val); return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1); },
        hsvToRgb(h,s,v) { let r,g,b; const i=Math.floor(h/60), f=h/60-i; const p=v*(1-s), q=v*(1-f*s), t=v*(1-(1-f)*s); switch(i%6) { case 0: r=v;g=t;b=p; break; case 1: r=q;g=v;b=p; break; case 2: r=p;g=v;b=t; break; case 3: r=p;g=q;b=v; break; case 4: r=t;g=p;b=v; break; case 5: r=v;g=p;b=q; break; } return [Math.round(r*255),Math.round(g*255),Math.round(b*255)]; },
        applyColorToTarget() {
            const color = this.getCurrentColor();
            if (document.activeElement !== this.currentInput) {
                this.currentInput.value = color;
                this.cpPreview.style.backgroundColor = color;
            }
            if (!this.independentMode && this.targetInput) {
                this.targetInput.value = color;
                this.syncPreview();
                if ([strokeColorInput, fillColorInput, bgColor].includes(this.targetInput) || this.targetInput.classList.contains('shape-fill-input')) {
                    updateBubblePreview();
                }
                updateVariableStyle(this.targetInput);
                updateVariableLabel(this.targetInput);
            }
        },
        syncPreview() { if (this.targetPreview && this.targetInput) { const val = this.targetInput.value.trim(); if (/^#([0-9a-fA-F]{3,8})$/.test(val) || /^rgb/i.test(val) || /^hsl/i.test(val) || val==='transparent') this.targetPreview.style.backgroundColor = val; else this.targetPreview.style.backgroundColor = '#ccc'; } },
        open(previewEl, inputEl, independent = false) {
            this.targetPreview = previewEl; this.targetInput = inputEl; this.independentMode = independent;
            const color = (inputEl && !independent) ? inputEl.value.trim() : this.currentInput.value;
            if (/^#([0-9a-fA-F]{6})$/.test(color)) {
                const [r,g,b] = [parseInt(color.slice(1,3),16), parseInt(color.slice(3,5),16), parseInt(color.slice(5,7),16)];
                const hsv = this.rgbToHsv(r,g,b);
                this.hue = hsv[0]; this.sat = hsv[1]; this.val = hsv[2];
            } else { this.hue = 0; this.sat = 1; this.val = 1; }
            this.drawSv();
            this.updateHueThumb();
            const curColor = this.getCurrentColor();
            this.currentInput.value = curColor;
            this.cpPreview.style.backgroundColor = curColor;
            this.overlay.classList.add('active');
            this.panel.classList.add('active');
            this.active = true;
        },
        close() { this.overlay.classList.remove('active'); this.panel.classList.remove('active'); this.active = false; },
        hexToRgb(hex) { return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]; },
        rgbToHsv(r,g,b) { r/=255;g/=255;b/=255; const max=Math.max(r,g,b), min=Math.min(r,g,b); let h=0,s,v=max; const d=max-min; s=max===0?0:d/max; if(d!==0) { switch(max) { case r: h=((g-b)/d+(g<b?6:0))*60; break; case g: h=((b-r)/d+2)*60; break; case b: h=((r-g)/d+4)*60; break; } } return [h,s,v]; }
    };
    colorPicker.init();

    [strokeColorPicker, fillColorPicker, $('bgColorPicker'), $('replaceColorPicker')].forEach(p => { if(p) p.style.display='none'; });

    function bindColorPreview(preview, input) { if (!preview || !input) return; preview.addEventListener('click', e => { e.stopPropagation(); colorPicker.open(preview, input); }); }
    bindColorPreview($('replaceColorPreview'), replaceInput); bindColorPreview($('bgColorPreview'), bgColor);
    bindColorPreview(fillColorPreview, fillColorInput);
    bindColorPreview(textFillPreview, textFill);

    bindColorPreview(strokeColorPreview, strokeColorInput);

    const colorPickerToolBtn = $('colorPickerToolBtn');
    if (colorPickerToolBtn) { colorPickerToolBtn.addEventListener('click', () => { colorPicker.open(null, null, true); }); }

    function syncColorPreview(inputEl, previewEl, pickerEl) {
        const val = inputEl.value.trim();
        if (/^#([0-9a-fA-F]{3,8})$/.test(val) || /^rgb/i.test(val) || /^hsl/i.test(val) || val==='transparent') previewEl.style.backgroundColor = val;
        else if (val === '') previewEl.style.backgroundColor = 'transparent';
        else previewEl.style.backgroundColor = '#ccc';
    }

    function updateVariableStyle(inputEl) { if (!inputEl) return; if (isSunnyMode && inputEl.dataset.variable) inputEl.classList.add('variable-input'); else inputEl.classList.remove('variable-input'); }

    function updateVariableLabel(inputEl) {
        if (!inputEl) return;
        let labelEl = inputEl.parentNode.querySelector('.variable-label');
        if (!labelEl) {
            labelEl = document.createElement('span');
            labelEl.className = 'variable-label';
            inputEl.parentNode.appendChild(labelEl);
        }
        const varName = inputEl.dataset.variable;
        const val = inputEl.value.trim();
        if (isSunnyMode && varName) {
            labelEl.textContent = `变量: ${varName}`;
        } else if (val.match(COLOR_REGEX)) {
            labelEl.textContent = `颜色: ${val}`;
        } else {
            labelEl.textContent = '';
        }
    }

    [textFill, strokeColorInput, fillColorInput].forEach(el => { if (el) el.addEventListener('input', () => { updateVariableStyle(el); updateVariableLabel(el); updateBubblePreview(); }); });
    function initVariableLabels() { [textFill, strokeColorInput, fillColorInput].forEach(el => { if (el) { updateVariableStyle(el); updateVariableLabel(el); } }); }

    function parseColorToHexOpacity(str) {
        if (!str) return { hex: '#000000', opacity: 1 };
        str = str.trim();
        if (str === 'transparent') return { hex: '#000000', opacity: 0 };
        if (str === 'none' || str === 'currentColor' || str.startsWith('url(')) return { hex: str, opacity: 1 };
        let m = str.match(/^#([0-9a-fA-F]{8})$/);
        if (m) { const r=parseInt(m[1].substr(0,2),16), g=parseInt(m[1].substr(2,2),16), b=parseInt(m[1].substr(4,2),16), a=Math.round(parseInt(m[1].substr(6,2),16)/255*100)/100; return { hex: `#${m[1].substr(0,6)}`, opacity: a }; }
        m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (m) { const r=+m[1],g=+m[2],b=+m[3],a=m[4]!==undefined?+m[4]:1; return { hex: '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1), opacity: a }; }
        m = str.match(/hsla?\((\d+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*([\d.]+))?\)/);
        if (m) { const h=+m[1]/360,s=+m[2]/100,l=+m[3]/100,a=m[4]!==undefined?+m[4]:1; const [r,g,b]=hslToRgb(h,s,l); return { hex: '#'+((1<<24)+(Math.round(r*255)<<16)+(Math.round(g*255)<<8)+Math.round(b*255)).toString(16).slice(1), opacity: a }; }
        return { hex: str, opacity: 1 };
    }
    function hslToRgb(h,s,l) { let r,g,b; if(s===0) r=g=b=l; else { const hue2rgb=(p,q,t)=>{ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; }; const q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q; r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3); } return [r,g,b]; }
    function isValidColorString(val) { if(!val)return false; val=val.trim(); if(val==='none'||val==='currentColor'||val==='transparent'||val==='inherit')return true; if(val.startsWith('url(')||val.startsWith('var('))return false; return /^#([0-9a-fA-F]{3,8})$/.test(val)||/^rgb/i.test(val)||/^hsl/i.test(val); }
    function extractFirstValidColor(v) { if(!v)return '#000000'; if(isValidColorString(v))return v.trim(); const m=v.match(COLOR_REGEX); return m?m[0]:'#000000'; }
    function applyColorWithOpacity(shape, color, opacityAttr, fillOrStroke) { const p=parseColorToHexOpacity(color); shape.setAttribute(fillOrStroke, p.hex); if(opacityAttr) shape.setAttribute(opacityAttr, p.opacity); }

    function getShapeFillOpacity(shape) {
        const fillOpacityAttr = shape.getAttribute('fill-opacity');
        if (fillOpacityAttr !== null) return parseFloat(fillOpacityAttr) || 1;
        const fillVal = shape.getAttribute('fill');
        if (fillVal) {
            const parsed = parseColorToHexOpacity(fillVal);
            return parsed.opacity;
        }
        return 1;
    }

    function generateFillControls(shapes, originalFills = [], originalOpacities = []) {
        if (!fillPerShapeContainer) return;
        fillPerShapeContainer.innerHTML = '';
        shapeFillInputs = [];
        shapeFillOpacityInputs = [];
        shapes.forEach((shape, i) => {
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = '12px';

            const row1 = document.createElement('div');
            row1.className = 'control-row';
            const label = document.createElement('label');
            label.textContent = `区域 ${i+1}`;
            label.style.width = '70px';
            label.style.fontSize = '0.9rem';
            label.style.fontWeight = '500';
            const preview = document.createElement('span');
            preview.className = 'color-preview';
            const picker = document.createElement('input');
            picker.type = 'color'; picker.className = 'color-picker'; picker.style.display = 'none';
            const colorInput = document.createElement('input');
            colorInput.type = 'text'; colorInput.className = 'shape-fill-input'; colorInput.style.width = '100px'; colorInput.placeholder = '#ffffff';
            let curFill = originalFills[i] || shape.getAttribute('fill');
            colorInput.value = isValidColorString(curFill) ? curFill : '#ffffff';
            syncColorPreview(colorInput, preview, picker);
            bindColorPreview(preview, colorInput);
            colorInput.addEventListener('input', () => { syncColorPreview(colorInput, preview, picker); updateBubblePreview(); });

            row1.appendChild(label);
            row1.appendChild(preview);
            row1.appendChild(picker);
            row1.appendChild(colorInput);
            wrapper.appendChild(row1);

            const row2 = document.createElement('div');
            row2.className = 'control-row';
            const opacityLabel = document.createElement('label');
            opacityLabel.textContent = '透明';
            opacityLabel.style.width = '70px';
            opacityLabel.style.fontSize = '0.9rem';
            opacityLabel.style.fontWeight = '500';
            const opacityInput = document.createElement('input');
            opacityInput.type = 'number';
            opacityInput.className = 'shape-fill-opacity-input';
            opacityInput.step = '0.1';
            opacityInput.min = '0';
            opacityInput.max = '1';
            opacityInput.style.width = '100px';
            opacityInput.placeholder = '1';
            const curOpacity = originalOpacities[i] !== undefined ? originalOpacities[i] : getShapeFillOpacity(shape);
            opacityInput.value = curOpacity;
            opacityInput.addEventListener('input', updateBubblePreview);

            row2.appendChild(opacityLabel);
            row2.appendChild(opacityInput);
            wrapper.appendChild(row2);

            fillPerShapeContainer.appendChild(wrapper);
            shapeFillInputs.push(colorInput);
            shapeFillOpacityInputs.push(opacityInput);
        });
    }

    function getCompressUrl() { return localStorage.getItem(COMPRESS_STORAGE_KEY) || DEFAULT_COMPRESS_URL; }
    function setCompressUrl(url) { localStorage.setItem(COMPRESS_STORAGE_KEY, url); updateCompressLinkStatus(); }
    function updateCompressLinkStatus() { const url = getCompressUrl(); const linkEl = $('compressLinkStatus'); if (linkEl) { try { const p = new URL(url); linkEl.textContent = p.hostname.replace(/^www\./, ''); linkEl.title = url; } catch { linkEl.textContent = url.substring(0, 28) + '…'; linkEl.title = url; } } }
    function getSvgUrl() { return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL; }
    function setSvgUrl(url) { localStorage.setItem(STORAGE_KEY, url); updateLinkStatus(); }
    function updateLinkStatus() { const url = getSvgUrl(); const linkEl = $('linkStatus'); if (linkEl) { try { const p = new URL(url); linkEl.textContent = p.hostname.replace(/^www\./, ''); linkEl.title = url; } catch { linkEl.textContent = url.substring(0, 28) + '…'; linkEl.title = url; } } }
    function getBubbleIconUrl() { return localStorage.getItem(BUBBLE_ICON_STORAGE_KEY) || DEFAULT_BUBBLE_ICON_URL; }
    function setBubbleIconUrl(url) { localStorage.setItem(BUBBLE_ICON_STORAGE_KEY, url); updateBubbleIconLinkStatus(); }
    function updateBubbleIconLinkStatus() { const url = getBubbleIconUrl(); const linkEl = $('bubbleLinkStatus'); if (linkEl) { try { const p = new URL(url); linkEl.textContent = p.hostname.replace(/^www\./, ''); linkEl.title = url; } catch { linkEl.textContent = url.substring(0, 28) + '…'; linkEl.title = url; } } }

    function showToast(msg, type = 'success', dur = 3000) { const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'; const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.innerHTML = `<span class="toast-icon">${icon}</span> ${msg}`; toastContainer.appendChild(toast); const timer = setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); }, dur); toast.addEventListener('click', () => { clearTimeout(timer); toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); }); }
    function extractColors(text) { const matches = text.match(COLOR_REGEX); if (!matches) return []; const seen = new Set(); return matches.filter(c => { const u = c.toUpperCase(); if (seen.has(u)) return false; seen.add(u); return true; }); }
    function renderColors(colors) {
        resultDisplay.innerHTML = ''; if (!colors.length) { resultDisplay.innerHTML = '<div class="empty-state">未找到任何颜色</div>'; statsAndTools.classList.add('hidden'); replaceArea.classList.add('hidden'); return; }
        statsAndTools.classList.remove('hidden'); replaceArea.classList.remove('hidden'); colorCountSpan.textContent = colors.length;
        const grid = document.createElement('div'); grid.className = 'color-grid';
        colors.forEach(c => { const bg = c.startsWith('#') ? c : `#${c}`; const label = document.createElement('label'); label.className = 'color-item'; const cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'color-checkbox'; cb.value = c; cb.checked = true; const swatch = document.createElement('span'); swatch.className = 'color-swatch'; swatch.style.background = bg; const text = document.createElement('span'); text.className = 'color-label'; text.textContent = c; label.append(cb, swatch, text); grid.appendChild(label); });
        resultDisplay.appendChild(grid); updateSelectedCount(); replaceStatus.textContent = '勾选颜色，输入替换内容，点击按钮'; replaceStatus.style.color = '#64748b';
        grid.addEventListener('change', e => { if (e.target.classList.contains('color-checkbox')) { updateSelectedCount(); replaceStatus.textContent = ''; } });
    }
    function updateSelectedCount() { const checked = document.querySelectorAll('.color-checkbox:checked'); selectedCountSpan.textContent = `已选 ${checked.length} 个`; replaceBtn.disabled = (checked.length === 0); }
    function getSelectedColors() { return Array.from(document.querySelectorAll('.color-checkbox:checked')).map(cb => cb.value); }
    function copyText(text, okMsg, failMsg = '复制失败') { if (!text.trim()) { showToast('⚠️ 没有内容可复制', 'error'); return false; } const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px'; ta.style.top = '-9999px'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0, text.length); let success = false; try { success = document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); if (success) showToast(okMsg, 'success'); else showToast(failMsg, 'error'); return success; }
    function handleExtract() { renderColors(extractColors(input.value)); }
    function clearAll() { input.value = ''; renderColors([]); replaceStatus.textContent = ''; showToast('已清空', 'success'); }
    function copyCode() { if (!input.value.trim()) { showToast('输入框为空', 'error'); return; } copyText(input.value, '✅ 代码已复制'); }
    function copyColors() { const colors = getSelectedColors().length ? getSelectedColors() : Array.from(document.querySelectorAll('.color-checkbox')).map(cb => cb.value); if (!colors.length) { showToast('没有颜色可复制', 'error'); return; } copyText(colors.join('\n'), `✅ 已复制 ${colors.length} 个颜色`); }
    function performReplace() { const selected = getSelectedColors(); if (!selected.length) { showToast('请至少勾选一个颜色', 'error'); return; } const replaceText = replaceInput.value; if (!confirm(`确定将选中的 ${selected.length} 个颜色替换为「${replaceText||'(空)'}」吗？`)) { replaceStatus.textContent = '已取消'; replaceStatus.style.color = '#64748b'; return; } let newText = input.value; selected.forEach(c => { newText = newText.replace(new RegExp(c, 'gi'), replaceText); }); input.value = newText; replaceStatus.textContent = `✅ 成功替换 ${selected.length} 个颜色！`; replaceStatus.style.color = '#16a34a'; showToast(`✅ 成功替换 ${selected.length} 个颜色！`, 'success'); handleExtract(); }
    function previewSvg() { const code = input.value.trim(); if (!code) { showToast('输入框为空', 'error'); return; } let svg = code; if (!/<svg\b/i.test(svg)) svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">\n${svg}\n</svg>`; const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f8fafc;}svg{max-width:100%;max-height:100%;}</style></head><body>${svg}</body></html>`; const iframe = document.createElement('iframe'); iframe.srcdoc = html; $('modalBody').innerHTML = ''; $('modalBody').appendChild(iframe); $('svgModal').classList.add('active'); }
    function closeModal() { $('svgModal').classList.remove('active'); $('modalBody').innerHTML = '<div class="error-msg">已关闭</div>'; }
    function getHalfHeight() { return windowHeight * HALF_RATIO; }
    function getFullHeight() { return windowHeight; }
    function setUIMode(fullscreen, animate = true) { isFullscreen = fullscreen; const drawer = $('drawerContent'); if (!animate) drawer.style.transition = 'none'; if (fullscreen) { $('toSvgModal').classList.add('fullscreen-mode'); $('toSvgModalBody').style.overflow = 'auto'; } else { $('toSvgModal').classList.remove('fullscreen-mode'); $('toSvgModalBody').style.overflow = 'hidden'; } if (!animate) requestAnimationFrame(() => { drawer.style.transition = ''; }); }
    function openToSvgModal() { const url = getSvgUrl(); $('toSvgModalBody').querySelector('iframe').src = url; const half = getHalfHeight(); $('drawerContent').style.height = half + 'px'; setUIMode(false, false); $('toSvgModal').classList.add('active'); $('toSvgLoading').classList.remove('hidden'); $('toSvgModalBody').querySelector('iframe').onload = () => $('toSvgLoading').classList.add('hidden'); setTimeout(() => $('toSvgLoading').classList.add('hidden'), 10000); }
    function openCompressModal() { const url = getCompressUrl(); $('toSvgModalBody').querySelector('iframe').src = url; const half = getHalfHeight(); $('drawerContent').style.height = half + 'px'; setUIMode(false, false); $('toSvgModal').classList.add('active'); $('toSvgLoading').classList.remove('hidden'); $('toSvgModalBody').querySelector('iframe').onload = () => $('toSvgLoading').classList.add('hidden'); setTimeout(() => $('toSvgLoading').classList.add('hidden'), 10000); }
    function openBubbleIconModal() { const url = getBubbleIconUrl(); $('toSvgModalBody').querySelector('iframe').src = url; const half = getHalfHeight(); $('drawerContent').style.height = half + 'px'; setUIMode(false, false); $('toSvgModal').classList.add('active'); $('toSvgLoading').classList.remove('hidden'); $('toSvgModalBody').querySelector('iframe').onload = () => $('toSvgLoading').classList.add('hidden'); setTimeout(() => $('toSvgLoading').classList.add('hidden'), 10000); }
    function closeToSvgModal() { const modal = $('toSvgModal'); modal.classList.add('closing'); setTimeout(() => { modal.classList.remove('active', 'closing'); $('drawerContent').style.height = getHalfHeight() + 'px'; setUIMode(false, false); }, 300); }
    function customLink() { const current = getSvgUrl(); const newUrl = prompt('请输入图片转 SVG 服务的完整链接：', current); if (newUrl === null) return; const trimmed = newUrl.trim(); if (!trimmed) { showToast('链接不能为空', 'error'); return; } if (!/^https?:\/\//.test(trimmed)) { showToast('请输入有效链接', 'error'); return; } setSvgUrl(trimmed); showToast(`✅ 已切换至：${trimmed}`, 'success'); if ($('toSvgModal').classList.contains('active')) { const iframe = $('toSvgModalBody').querySelector('iframe'); iframe.src = trimmed; $('toSvgLoading').classList.remove('hidden'); iframe.onload = () => $('toSvgLoading').classList.add('hidden'); setTimeout(() => $('toSvgLoading').classList.add('hidden'), 10000); } }
    function customCompressLink() { const current = getCompressUrl(); const newUrl = prompt('请输入 SVG 压缩服务的完整链接：', current); if (newUrl === null) return; const trimmed = newUrl.trim(); if (!trimmed) { showToast('链接不能为空', 'error'); return; } if (!/^https?:\/\//.test(trimmed)) { showToast('请输入有效链接', 'error'); return; } setCompressUrl(trimmed); showToast(`✅ 已切换至：${trimmed}`, 'success'); if ($('toSvgModal').classList.contains('active')) { const iframe = $('toSvgModalBody').querySelector('iframe'); iframe.src = trimmed; $('toSvgLoading').classList.remove('hidden'); iframe.onload = () => $('toSvgLoading').classList.add('hidden'); setTimeout(() => $('toSvgLoading').classList.add('hidden'), 10000); } }
    function customBubbleIconLink() { const current = getBubbleIconUrl(); const newUrl = prompt('请输入气泡图标素材的完整链接：', current); if (newUrl === null) return; const trimmed = newUrl.trim(); if (!trimmed) { showToast('链接不能为空', 'error'); return; } if (!/^https?:\/\//.test(trimmed)) { showToast('请输入有效链接', 'error'); return; } setBubbleIconUrl(trimmed); showToast(`✅ 已切换至：${trimmed}`, 'success'); if ($('toSvgModal').classList.contains('active')) { const iframe = $('toSvgModalBody').querySelector('iframe'); iframe.src = trimmed; $('toSvgLoading').classList.remove('hidden'); iframe.onload = () => $('toSvgLoading').classList.add('hidden'); setTimeout(() => $('toSvgLoading').classList.add('hidden'), 10000); } }
    function toggleTools() { toolsOpen = !toolsOpen; const toolGroup = $('toolGroup'), toggleBtn = $('toolToggleBtn'); if (toolsOpen) { toolGroup.classList.add('stacked'); toggleBtn.classList.add('open'); } else { toolGroup.classList.remove('stacked'); toggleBtn.classList.remove('open'); } }
    function setInputMode(mode) { currentInputMode = mode; input.classList.add('hidden'); uploadZone.classList.add('hidden'); imageUploadZone.classList.add('hidden'); codeTabBtn.classList.remove('active'); uploadTabBtn.classList.remove('active'); imageTabBtn.classList.remove('active'); if (mode === 'code') { input.classList.remove('hidden'); codeTabBtn.classList.add('active'); input.focus(); } else if (mode === 'upload') { uploadZone.classList.remove('hidden'); uploadTabBtn.classList.add('active'); } else if (mode === 'image') { imageUploadZone.classList.remove('hidden'); imageTabBtn.classList.add('active'); } }
    codeTabBtn.addEventListener('click', () => setInputMode('code')); uploadTabBtn.addEventListener('click', () => setInputMode('upload')); imageTabBtn.addEventListener('click', () => setInputMode('image'));
    function getFileExtension(filename) { const lastDot = filename.lastIndexOf('.'); return lastDot === -1 ? '' : filename.substring(lastDot + 1).toLowerCase(); }
    function isTextFile(filename) { const ext = getFileExtension(filename); return !ext || TEXT_EXTENSIONS.has(ext); }
    function isImageFile(filename) { const ext = getFileExtension(filename); return new Set(['png','jpg','jpeg','gif','bmp','webp','ico','tiff','heic']).has(ext); }
    function readFileAndPopulate(file) { if (!file) return; const filename = file.name; if (isImageFile(filename)) { if (confirm(`「${filename}」看起来是图片，是否跳转到图片转SVG工具？`)) { fileInput.value = ''; openToSvgModal(); setInputMode('code'); return; } } if (currentInputMode === 'upload') uploadZone.classList.add('loading'); const reader = new FileReader(); reader.onload = function(e) { input.value = e.target.result; setInputMode('code'); uploadZone.classList.remove('loading'); fileInput.value = ''; showToast(`✅ 已读取：${filename}`, 'success', 2500); setTimeout(handleExtract, 150); }; reader.onerror = function() { uploadZone.classList.remove('loading'); fileInput.value = ''; showToast('❌ 文件读取失败', 'error'); setInputMode('code'); }; reader.readAsText(file); }
    fileInput.addEventListener('change', e => { if (e.target.files[0]) readFileAndPopulate(e.target.files[0]); });
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); if (currentInputMode === 'upload') uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', e => { e.preventDefault(); if (!uploadZone.contains(e.relatedTarget)) uploadZone.classList.remove('drag-over'); });
    uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('drag-over'); if (currentInputMode === 'upload' && e.dataTransfer.files[0]) readFileAndPopulate(e.dataTransfer.files[0]); });
    function loadImageAsBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
    function getImageDimensions(base64) { return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight }); img.onerror = reject; img.src = base64; }); }
    async function createImageBubble(base64) { try { const dims = await getImageDimensions(base64); const w = dims.width; const h = dims.height; const svgNS = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('xmlns', svgNS); svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('width', w); svg.setAttribute('height', h); const image = document.createElementNS(svgNS, 'image'); image.setAttribute('x', '0'); image.setAttribute('y', '0'); image.setAttribute('width', w); image.setAttribute('height', h); image.setAttribute('href', base64); svg.appendChild(image); const text = document.createElementNS(svgNS, 'text'); text.setAttribute('x', w / 2); text.setAttribute('y', h / 2 + 30); text.setAttribute('text-anchor', 'middle'); text.setAttribute('dy', '0.35em'); text.setAttribute('font-size', Math.max(16, Math.round(h / 10))); text.setAttribute('font-family', 'Arial, sans-serif'); text.setAttribute('font-weight', 'bold'); text.setAttribute('fill', '#d500ff'); text.textContent = '数量'; svg.appendChild(text); const serializer = new XMLSerializer(); return serializer.serializeToString(svg); } catch (err) { showToast('图片处理失败: ' + err.message, 'error'); return null; } }
    async function handleImageFile(file) { if (!file) return; imageUploadZone.classList.add('loading'); try { const base64 = await loadImageAsBase64(file); const svgCode = await createImageBubble(base64); if (svgCode) { input.value = svgCode; setInputMode('code'); imageUploadZone.classList.remove('loading'); imageFileInput.value = ''; handleExtract(); currentPreviewCode = svgCode; isSunnyMode = false; bubbleTitleText.textContent = '🎈 气泡预览'; openBubbleSection(); showToast('✅ 图片气泡已生成，可调整文本', 'success'); } else { imageUploadZone.classList.remove('loading'); } } catch (err) { imageUploadZone.classList.remove('loading'); imageFileInput.value = ''; showToast('图片处理失败: ' + err.message, 'error'); } }
    imageFileInput.addEventListener('change', e => { if (e.target.files[0]) handleImageFile(e.target.files[0]); });
    imageUploadZone.addEventListener('dragover', e => { e.preventDefault(); if (currentInputMode === 'image') imageUploadZone.classList.add('drag-over'); });
    imageUploadZone.addEventListener('dragleave', e => { e.preventDefault(); if (!imageUploadZone.contains(e.relatedTarget)) imageUploadZone.classList.remove('drag-over'); });
    imageUploadZone.addEventListener('drop', e => { e.preventDefault(); imageUploadZone.classList.remove('drag-over'); if (currentInputMode === 'image' && e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]); });
    function applyBackgroundColor() { if (!currentPreviewCode || !/<svg\b/i.test(currentPreviewCode)) { showToast('请先转换格式', 'error'); return; } const targetColor = bgColor.value.trim(); if (!targetColor) { showToast('请输入背景颜色', 'error'); return; } const parser = new DOMParser(); const doc = parser.parseFromString(currentPreviewCode, 'image/svg+xml'); if (doc.querySelector('parsererror')) { showToast('SVG 解析失败', 'error'); return; } const svg = doc.documentElement; let vb = svg.getAttribute('viewBox'); let x = 0, y = 0, w = 1153, h = 1024; if (vb) { const parts = vb.trim().split(/\s+/); if (parts.length === 4) { x = parseFloat(parts[0]); y = parseFloat(parts[1]); w = parseFloat(parts[2]); h = parseFloat(parts[3]); } } else { const wAttr = svg.getAttribute('width'), hAttr = svg.getAttribute('height'); w = wAttr ? parseFloat(wAttr) : w; h = hAttr ? parseFloat(hAttr) : h; } let bgEl = svg.querySelector('rect[data-bg="true"]'); if (!bgEl) { const shapes = svg.querySelectorAll('path, circle, ellipse, rect, line, polyline, polygon'); for (let p of shapes) { const d = p.getAttribute('d'); if (d && /^M\s*([\d.]+)\s+([\d.]+)\s*h\s*([\d.]+)\s*v\s*([\d.]+)\s*H\s*([\d.]+)\s*z$/i.test(d.trim())) { const m = d.trim().match(/^M\s*([\d.]+)\s+([\d.]+)\s*h\s*([\d.]+)\s*v\s*([\d.]+)\s*H\s*([\d.]+)\s*z$/i); if (m && Math.abs(parseFloat(m[1]) - x) < 1 && Math.abs(parseFloat(m[2]) - y) < 1 && Math.abs(parseFloat(m[3]) - w) < 1 && Math.abs(parseFloat(m[4]) - h) < 1) { bgEl = p; break; } } } if (!bgEl) { bgEl = doc.createElementNS('http://www.w3.org/2000/svg', 'rect'); bgEl.setAttribute('data-bg', 'true'); svg.insertBefore(bgEl, svg.firstChild); } } bgEl.setAttribute('x', x); bgEl.setAttribute('y', y); bgEl.setAttribute('width', w); bgEl.setAttribute('height', h); bgEl.setAttribute('fill', targetColor); if (bgEl.tagName !== 'rect') bgEl.setAttribute('stroke', 'none'); const serializer = new XMLSerializer(); currentPreviewCode = serializer.serializeToString(svg); updateBubblePreview(); showToast(`✅ 画布背景已设置为 ${targetColor}`, 'success'); }
    function setSunnyControlsVisibility(visible) { sunnyControls.forEach(el => { el.style.display = visible ? 'flex' : 'none'; }); }
    function syncStrokeColorPreview() { const val = strokeColorInput.value.trim(); if (/^#([0-9a-fA-F]{3,8})$/.test(val) || /^rgb/i.test(val) || /^hsl/i.test(val) || val === 'transparent') { strokeColorPreview.style.backgroundColor = val; } else if (val === '') { strokeColorPreview.style.backgroundColor = 'transparent'; } else { strokeColorPreview.style.backgroundColor = '#ccc'; } }

    function getColorBrightness(hexColor) {
        if (!/^#([0-9a-fA-F]{6})$/.test(hexColor)) return 128;
        const r = parseInt(hexColor.slice(1,3), 16);
        const g = parseInt(hexColor.slice(3,5), 16);
        const b = parseInt(hexColor.slice(5,7), 16);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function addStripePattern(svgEl) {
        let defs = svgEl.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svgEl.insertBefore(defs, svgEl.firstChild);
        }
        if (!defs.querySelector('#stripe-pattern')) {
            const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
            pattern.id = 'stripe-pattern';
            pattern.setAttribute('patternUnits', 'userSpaceOnUse');
            pattern.setAttribute('width', '4');
            pattern.setAttribute('height', '4');
            pattern.setAttribute('patternTransform', 'rotate(45)');
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', '4');
            rect.setAttribute('height', '4');
            rect.setAttribute('fill', 'transparent');
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', '0');
            line.setAttribute('x2', '0');
            line.setAttribute('y2', '4');
            line.setAttribute('stroke', 'currentColor');
            line.setAttribute('stroke-width', '1.5');
            pattern.appendChild(rect);
            pattern.appendChild(line);
            defs.appendChild(pattern);
        }
    }

    // ★★★ 修复后的 updateBubblePreview：不修改 width/height，只补 viewBox ★★★
    function updateBubblePreview() {
        const code = currentPreviewCode;
        if (!code || !/<svg\b/i.test(code)) {
            bubblePreviewBox.innerHTML = '<span style="color:#94a3b8;">请先转换格式</span>';
            return;
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(code, 'image/svg+xml');
        if (doc.querySelector('parsererror')) {
            bubblePreviewBox.innerHTML = '<span style="color:#dc2626;">SVG解析错误</span>';
            return;
        }
        const previewDoc = parser.parseFromString(code, 'image/svg+xml');
        const svgEl = previewDoc.documentElement;

        // 只确保有 viewBox，不覆盖 width/height（交给 CSS 的 max-width/max-height）
        if (!svgEl.getAttribute('viewBox')) {
            const w = parseFloat(svgEl.getAttribute('width')) || 1153;
            const h = parseFloat(svgEl.getAttribute('height')) || 1024;
            svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
        }
        svgEl.removeAttribute('preserveAspectRatio'); // 清理可能遗留的属性，让浏览器自行处理

        const shapes = previewDoc.querySelectorAll('path, circle, ellipse, rect, line, polyline, polygon');
        const rotateAngle = parseFloat(rotateAngleInput.value) || 0;
        const strokeColorVal = strokeColorInput.value.trim();

        if (isTccolorModalOpen && selectedTccolorIndices.length > 0) {
            addStripePattern(svgEl);
        } else {
            const defs = svgEl.querySelector('defs');
            if (defs) {
                const pattern = defs.querySelector('#stripe-pattern');
                if (pattern) pattern.remove();
                if (!defs.hasChildNodes()) defs.remove();
            }
        }

        shapes.forEach((shape, i) => {
            shape.setAttribute('stroke-width', strokeWidth.value);
            if (!isSunnyMode) {
                applyColorWithOpacity(shape, strokeColorVal, 'stroke-opacity', 'stroke');
            } else {
                const useStroke = (strokeColorInput.dataset.variable && strokeColorVal === originalStrokeColor) ? originalStrokeColor : strokeColorVal;
                applyColorWithOpacity(shape, useStroke, 'stroke-opacity', 'stroke');
                let fillVal = (shapeFillInputs[i] && shapeFillInputs[i].value.trim()) ? shapeFillInputs[i].value.trim() : fillColorInput.value.trim();
                applyColorWithOpacity(shape, fillVal, null, 'fill');
                shape.setAttribute('fill-opacity', shapeFillOpacityInputs[i] ? shapeFillOpacityInputs[i].value : fillOpacityInput.value);
            }
            if (!isSunnyMode && shapeFillInputs[i]) {
                const fillVal = shapeFillInputs[i].value.trim();
                if (fillVal) {
                    let opacityVal = fillOpacityInput.value;
                    if (shapeFillOpacityInputs[i] && shapeFillOpacityInputs[i].value.trim() !== '') {
                        opacityVal = shapeFillOpacityInputs[i].value;
                    }
                    shape.setAttribute('fill-opacity', opacityVal);
                    applyColorWithOpacity(shape, fillVal, null, 'fill');
                }
            }

            const nextSibling = shape.nextElementSibling;
            if (nextSibling && nextSibling.dataset.stripe === 'true') {
                nextSibling.remove();
            }

            if (isTccolorModalOpen && selectedTccolorIndices.includes(i)) {
                const clone = shape.cloneNode(true);
                clone.dataset.stripe = 'true';
                clone.setAttribute('fill', 'url(#stripe-pattern)');
                clone.setAttribute('fill-opacity', '0.6');
                clone.setAttribute('stroke', 'none');
                clone.removeAttribute('stroke-width');
                clone.removeAttribute('stroke-opacity');
                clone.removeAttribute('transform');

                const currentColor = shapeFillInputs[i].value.trim() || '#ffffff';
                const brightness = getColorBrightness(currentColor);
                const stripeColor = brightness > 128 ? 'black' : 'white';
                clone.style.color = stripeColor;
                clone.setAttribute('color', stripeColor);

                shape.parentNode.insertBefore(clone, shape.nextSibling);
            }

            if (rotateAngle !== 0) {
                const vb = svgEl.getAttribute('viewBox') || '0 0 1153 1024';
                const vbParts = vb.trim().split(/\s+/);
                const cx = parseFloat(vbParts[0]) + parseFloat(vbParts[2]) / 2, cy = parseFloat(vbParts[1]) + parseFloat(vbParts[3]) / 2;
                const existingTransform = shape.getAttribute('transform') || '';
                const newTransform = `rotate(${rotateAngle} ${cx} ${cy})`;
                shape.setAttribute('transform', existingTransform ? `${existingTransform} ${newTransform}` : newTransform);
            } else {
                const existingTransform = shape.getAttribute('transform') || '';
                const cleanedTransform = existingTransform.replace(/rotate\([^)]+\)/g, '').trim();
                if (cleanedTransform) shape.setAttribute('transform', cleanedTransform);
                else shape.removeAttribute('transform');
            }
        });

        const textEl = previewDoc.querySelector('text');
        const textRotateAngle = parseFloat(textRotateAngleInput.value) || 0;
        if (textEl) {
            textEl.setAttribute('x', textX.value); textEl.setAttribute('y', textY.value);
            textEl.setAttribute('font-size', textSize.value); textEl.setAttribute('font-family', textFont.value);
            textEl.setAttribute('font-weight', textWeight.value);
            textEl.setAttribute('text-anchor', 'middle');
            textEl.setAttribute('dy', '0.35em');
            let useColor = textFill.value.trim();
            if (isSunnyMode && textFill.dataset.variable && useColor === originalTextFill) useColor = originalTextFill;
            else if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(useColor) && !/^rgb/i.test(useColor) && !/^hsl/i.test(useColor) && useColor !== 'transparent') useColor = '#000000';
            applyColorWithOpacity(textEl, useColor, null, 'fill');
            textEl.textContent = textContent.value || '927';
            if (textRotateAngle !== 0) {
                const existingTransform = textEl.getAttribute('transform') || '';
                const newTransform = `rotate(${textRotateAngle} ${textX.value} ${textY.value})`;
                textEl.setAttribute('transform', existingTransform ? `${existingTransform} ${newTransform}` : newTransform);
            } else {
                const existingTransform = textEl.getAttribute('transform') || '';
                const cleanedTransform = existingTransform.replace(/rotate\([^)]+\)/g, '').trim();
                if (cleanedTransform) textEl.setAttribute('transform', cleanedTransform);
                else textEl.removeAttribute('transform');
            }
        }
        const serializer = new XMLSerializer();
        bubblePreviewBox.innerHTML = serializer.serializeToString(previewDoc.documentElement);

        // 确保关闭按钮存在
        let closeBtn = bubblePreviewBox.querySelector('#closePinBtn');
        if (!closeBtn) {
            closeBtn = document.createElement('button');
            closeBtn.id = 'closePinBtn';
            closeBtn.className = 'close-pin-btn';
            closeBtn.title = '解除固定';
            closeBtn.textContent = '✕';
            bubblePreviewBox.appendChild(closeBtn);
        }
        closeBtn.style.display = isPreviewPinned ? 'flex' : 'none';
    }

    function openBubbleSection() {
        if (!currentPreviewCode || !/<svg\b/i.test(currentPreviewCode)) { showToast('请先转换格式', 'error'); return; }
        const parser = new DOMParser(); const doc = parser.parseFromString(currentPreviewCode, 'image/svg+xml');
        if (doc.querySelector('parsererror')) { showToast('SVG 解析失败', 'error'); return; }
        const svg = doc.documentElement;
        const textEl = svg.querySelector('text');
        const textInfo = (() => {
            if (textEl) return { x: textEl.getAttribute('x')||'0', y: textEl.getAttribute('y')||'0', fontSize: textEl.getAttribute('font-size')||'16', fill: textEl.getAttribute('fill')||'#000', content: textEl.textContent||'', fontFamily: textEl.getAttribute('font-family')||'sans-serif', weight: textEl.getAttribute('font-weight')||'bold' };
            return null;
        })();
        if (textInfo) {
            textX.value = textInfo.x; textY.value = textInfo.y; textSize.value = textInfo.fontSize;
            if (textInfo.fill && !/^#([0-9a-fA-F]{3,8})$/.test(textInfo.fill) && !/^rgb/i.test(textInfo.fill) && !/^hsl/i.test(textInfo.fill)) {
                textFill.value = originalTextFill;
            } else {
                textFill.value = textInfo.fill;
                originalTextFill = extractFirstValidColor(textInfo.fill);
            }
            if (isSunnyMode) {
                textFill.dataset.variable = '$fontcolor';
            } else {
                delete textFill.dataset.variable;
            }
            textContent.value = '927'; textFont.value = textInfo.fontFamily; textWeight.value = textInfo.weight;
        } else {
            textX.value = isSunnyMode ? '13.5' : '550'; textY.value = isSunnyMode ? '12' : '630'; textSize.value = isSunnyMode ? '10' : '400';
            originalTextFill = '#000000';
            textFill.value = isSunnyMode ? '#000000' : '字';
            if (isSunnyMode) textFill.dataset.variable = '$fontcolor'; else delete textFill.dataset.variable;
            textContent.value = '927'; textFont.value = 'Arial, sans-serif'; textWeight.value = '500';
        }

        const shapes = svg.querySelectorAll('path, circle, ellipse, rect, line, polyline, polygon');
        const firstShape = shapes[0];
        strokeWidth.value = firstShape ? (firstShape.getAttribute('stroke-width') || (isSunnyMode ? '1' : '6')) : (isSunnyMode ? '1' : '6');

        if (isSunnyMode) {
            if (!originalStrokeColor || originalStrokeColor === '#000000') {
                originalStrokeColor = '#000000';
                for (let s of shapes) { let v = s.getAttribute('stroke'); let c = extractFirstValidColor(v); if (c !== '#000000' || (v && isValidColorString(v))) { originalStrokeColor = c; break; } }
            }
            strokeColorInput.value = originalStrokeColor;
            strokeColorInput.dataset.variable = '$color';
            if (!originalFillColor || originalFillColor === '#ffffff') {
                originalFillColor = '#ffffff';
                for (let s of shapes) { let v = s.getAttribute('fill'); let c = extractFirstValidColor(v); if (c !== '#ffffff' || (v && isValidColorString(v))) { originalFillColor = c; break; } }
            }
            fillColorInput.value = originalFillColor;
            fillColorInput.dataset.variable = '$tccolor';
        } else {
            originalStrokeColor = '#000000';
            for (let s of shapes) { let v = s.getAttribute('stroke'); let c = extractFirstValidColor(v); if (c !== '#000000' || (v && isValidColorString(v))) { originalStrokeColor = c; break; } }
            strokeColorInput.value = originalStrokeColor;
            delete strokeColorInput.dataset.variable;
            originalFillColor = '#ffffff';
            for (let s of shapes) { let v = s.getAttribute('fill'); let c = extractFirstValidColor(v); if (c !== '#ffffff' || (v && isValidColorString(v))) { originalFillColor = c; break; } }
            fillColorInput.value = originalFillColor;
            delete fillColorInput.dataset.variable;
        }
        strokeOpacityInput.value = firstShape ? (firstShape.getAttribute('stroke-opacity') || '1') : '1';
        fillOpacityInput.value = firstShape ? (firstShape.getAttribute('fill-opacity') || '1') : '1';
        syncStrokeColorPreview(); syncColorPreview(fillColorInput, fillColorPreview, fillColorPicker);

        generateFillControls(shapes, originalShapeFills, originalShapeOpacities);

        const fillTitle = fillPerShapeContainer?.previousElementSibling;
        if (fillTitle && fillTitle.classList.contains('control-section-title')) { fillTitle.style.display = ''; }
        if (fillPerShapeContainer) { fillPerShapeContainer.style.display = ''; }
        setSunnyControlsVisibility(isSunnyMode);

        rotateAngleInput.value = 0; textRotateAngleInput.value = 0; bgColor.value = 'transparent';
        syncColorPreview(bgColor, $('bgColorPreview'), $('bgColorPicker'));
        initVariableLabels();

        if (keepModifiedRow) keepModifiedRow.style.display = 'none';
        keepModified = false;

        bubbleSection.classList.remove('hidden');
        updateBubblePreview();
        applyPin();
    }

    function closeBubbleSection() { bubbleSection.classList.add('hidden'); bubbleCodeOutput.classList.remove('show'); }

    function generateBubbleSvg() {
        const code = currentPreviewCode;
        if (!code || !/<svg\b/i.test(code)) return null;
        const parser = new DOMParser(); const doc = parser.parseFromString(code, 'image/svg+xml');
        if (doc.querySelector('parsererror')) return null;
        const textEl = doc.querySelector('text');
        if (textEl) {
            textEl.setAttribute('x', textX.value); textEl.setAttribute('y', textY.value); textEl.setAttribute('font-size', textSize.value);
            textEl.setAttribute('font-family', textFont.value); textEl.setAttribute('font-weight', textWeight.value);
            if (isSunnyMode) {
                if (!keepModified && textFill.dataset.variable) textEl.setAttribute('fill', textFill.dataset.variable);
                else applyColorWithOpacity(textEl, textFill.value, null, 'fill');
                if (!keepModified) textEl.textContent = '$displayText';
                else textEl.textContent = textContent.value || '927';
            } else {
                applyColorWithOpacity(textEl, textFill.value, null, 'fill');
                textEl.textContent = '数量';
            }
            textEl.setAttribute('text-anchor', 'middle');
            textEl.setAttribute('dy', '0.35em');
            const textRotateAngle = parseFloat(textRotateAngleInput.value) || 0;
            if (textRotateAngle !== 0) { const existingTransform = textEl.getAttribute('transform') || ''; const newTransform = `rotate(${textRotateAngle} ${textX.value} ${textY.value})`; textEl.setAttribute('transform', existingTransform ? `${existingTransform} ${newTransform}` : newTransform); }
        }
        const shapes = doc.querySelectorAll('path, circle, ellipse, rect, line, polyline, polygon');
        shapes.forEach((shape, i) => {
            shape.setAttribute('stroke-width', strokeWidth.value);
            if (isSunnyMode) {
                if (!keepModified) { shape.setAttribute('stroke', strokeColorInput.dataset.variable || '$color'); }
                else { applyColorWithOpacity(shape, strokeColorInput.value, 'stroke-opacity', 'stroke'); }
                shape.setAttribute('stroke-opacity', strokeOpacityInput.value);

                const isTccolor = selectedTccolorIndices.includes(i);
                if (isTccolor) {
                    if (!keepModified) shape.setAttribute('fill', '$tccolor');
                    else {
                        const fillVal = shapeFillInputs[i].value.trim() || fillColorInput.value.trim();
                        applyColorWithOpacity(shape, fillVal, 'fill-opacity', 'fill');
                    }
                } else {
                    const fillVal = shapeFillInputs[i].value.trim() || fillColorInput.value.trim();
                    applyColorWithOpacity(shape, fillVal, 'fill-opacity', 'fill');
                }
                shape.setAttribute('fill-opacity', shapeFillOpacityInputs[i] ? shapeFillOpacityInputs[i].value : fillOpacityInput.value);
            } else {
                applyColorWithOpacity(shape, strokeColorInput.value, 'stroke-opacity', 'stroke');
                if (shapeFillInputs[i]) {
                    const fillVal = shapeFillInputs[i].value.trim();
                    if (fillVal) {
                        let opacityVal = fillOpacityInput.value;
                        if (shapeFillOpacityInputs[i] && shapeFillOpacityInputs[i].value.trim() !== '') {
                            opacityVal = shapeFillOpacityInputs[i].value;
                        }
                        shape.setAttribute('fill-opacity', opacityVal);
                        applyColorWithOpacity(shape, fillVal, null, 'fill');
                    }
                }
            }
            const rotateAngle = parseFloat(rotateAngleInput.value) || 0;
            if (rotateAngle !== 0) {
                const vb = doc.documentElement.getAttribute('viewBox') || '0 0 1153 1024';
                const vbParts = vb.trim().split(/\s+/);
                const cx = parseFloat(vbParts[0]) + parseFloat(vbParts[2]) / 2, cy = parseFloat(vbParts[1]) + parseFloat(vbParts[3]) / 2;
                const existingTransform = shape.getAttribute('transform') || '';
                const newTransform = `rotate(${rotateAngle} ${cx} ${cy})`;
                shape.setAttribute('transform', existingTransform ? `${existingTransform} ${newTransform}` : newTransform);
            } else {
                const existingTransform = shape.getAttribute('transform') || '';
                const cleanedTransform = existingTransform.replace(/rotate\([^)]+\)/g, '').trim();
                if (cleanedTransform) shape.setAttribute('transform', cleanedTransform);
                else shape.removeAttribute('transform');
            }
        });
        const serializer = new XMLSerializer(); return serializer.serializeToString(doc.documentElement);
    }

    function showKeepModifiedModal() {
        const variables = [];
        if (isSunnyMode) {
            if (textFill.dataset.variable) variables.push({ var: textFill.dataset.variable, value: textFill.value });
            if (strokeColorInput.dataset.variable) variables.push({ var: strokeColorInput.dataset.variable, value: strokeColorInput.value });
            if (selectedTccolorIndices.length > 0) {
                const tccolorValue = shapeFillInputs[selectedTccolorIndices[0]].value.trim() || originalFillColor;
                variables.push({ var: '$tccolor', value: tccolorValue });
            }
        }
        keepModifiedTable.innerHTML = variables.map(m => `<div class="kv-row"><span class="kv-var">${m.var}</span><span class="kv-val">${m.value}</span></div>`).join('');
        keepModifiedModalOverlay.classList.add('active');
    }

    function closeKeepModifiedModal() { keepModifiedModalOverlay.classList.remove('active'); }

    function doExportBubble() {
        const svgCode = generateBubbleSvg();
        if (!svgCode) { showToast('没有可导出的代码', 'error'); return; }
        bubbleCodeOutput.textContent = svgCode;
        bubbleCodeOutput.classList.add('show');
        exportModalOverlay._svgCode = svgCode;
        exportModalOverlay.classList.add('active');
    }

    function openExportModal() {
        if (isSunnyMode) {
            openTccolorModal();
            return;
        }
        doExportBubble();
    }

    keepModifiedConfirmBtn.addEventListener('click', () => {
        keepModified = true;
        closeKeepModifiedModal();
        doExportBubble();
    });
    keepModifiedCancelBtn.addEventListener('click', () => {
        keepModified = false;
        closeKeepModifiedModal();
        doExportBubble();
    });
    keepModifiedModalClose.addEventListener('click', () => {
        keepModified = false;
        closeKeepModifiedModal();
        doExportBubble();
    });
    keepModifiedModalOverlay.addEventListener('click', e => {
        if (e.target === keepModifiedModalOverlay) {
            keepModified = false;
            closeKeepModifiedModal();
            doExportBubble();
        }
    });

    function closeExportModal() { exportModalOverlay.classList.remove('active'); delete exportModalOverlay._svgCode; }
    function exportCopyCode() { const svgCode = exportModalOverlay._svgCode || generateBubbleSvg(); if (!svgCode) { showToast('没有可复制的代码', 'error'); return; } copyText(svgCode, '✅ 气泡代码已复制到剪贴板'); closeExportModal(); }
    function exportAsTxt() { const svgCode = exportModalOverlay._svgCode || generateBubbleSvg(); if (!svgCode) { showToast('没有可导出的代码', 'error'); return; } triggerDownload(svgCode, 'bubble-export.txt', 'text/plain;charset=utf-8'); showToast('✅ TXT 文件已开始下载', 'success'); closeExportModal(); }
    function exportAsSvg() { const svgCode = exportModalOverlay._svgCode || generateBubbleSvg(); if (!svgCode) { showToast('没有可导出的代码', 'error'); return; } triggerDownload(svgCode, 'bubble-export.svg', 'image/svg+xml;charset=utf-8'); showToast('✅ SVG 文件已开始下载', 'success'); closeExportModal(); }
    function triggerDownload(content, filename, mimeType) { const blob = new Blob([content], { type: mimeType }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.style.display = 'none'; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300); }

    exportBubbleBtn.addEventListener('click', openExportModal);
    exportModalClose.addEventListener('click', closeExportModal);
    exportModalOverlay.addEventListener('click', e => { if (e.target === exportModalOverlay) closeExportModal(); });
    exportCopyCodeBtn.addEventListener('click', exportCopyCode);
    exportTxtBtn.addEventListener('click', exportAsTxt);
    exportSvgBtn.addEventListener('click', exportAsSvg);

    function convertToReadingFormat() {
        isSunnyMode = false; keepModified = false;
        [textFill, strokeColorInput, fillColorInput].forEach(el => { delete el.dataset.variable; el.classList.remove('variable-input'); });
        const code = input.value.trim();
        if (!code || !/<svg\b/i.test(code)) { showToast('请先输入有效的 SVG 代码', 'error'); return; }
        const parser = new DOMParser(); const doc = parser.parseFromString(code, 'image/svg+xml');
        if (doc.querySelector('parsererror')) { showToast('SVG 解析失败', 'error'); return; }
        const svg = doc.documentElement;
        let vb = svg.getAttribute('viewBox');
        let minX = 0, minY = 0, width = 1153, height = 1024;
        if (vb) { const parts = vb.trim().split(/\s+/); if (parts.length === 4) { minX = parseFloat(parts[0]); minY = parseFloat(parts[1]); width = parseFloat(parts[2]); height = parseFloat(parts[3]); } }
        else { const wAttr = svg.getAttribute('width'), hAttr = svg.getAttribute('height'); width = wAttr ? parseFloat(wAttr) : width; height = hAttr ? parseFloat(hAttr) : height; }
        const imageEl = svg.querySelector('image');
        if (imageEl) { imageEl.setAttribute('x', minX); imageEl.setAttribute('y', minY); imageEl.setAttribute('width', width); imageEl.setAttribute('height', height); }
        const cx = minX + width / 2, cy = minY + height / 2;
        let textEl = svg.querySelector('text');
        if (!textEl) { textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text'); svg.appendChild(textEl); }
        originalTextFill = textEl ? extractFirstValidColor(textEl.getAttribute('fill')) : '#000000';
        textEl.setAttribute('x', cx); textEl.setAttribute('y', cy); textEl.setAttribute('text-anchor', 'middle'); textEl.setAttribute('dy', '0.35em');
        if (!textEl.getAttribute('font-size')) textEl.setAttribute('font-size', '42');
        textEl.setAttribute('fill', '字'); textEl.setAttribute('font-weight', 'bold'); textEl.textContent = '数量';
        const serializer = new XMLSerializer(); currentPreviewCode = serializer.serializeToString(svg);

        const shapes = svg.querySelectorAll('path, circle, ellipse, rect, line, polyline, polygon');
        originalShapeFills = Array.from(shapes).map(s => extractFirstValidColor(s.getAttribute('fill')));
        originalShapeOpacities = Array.from(shapes).map(s => getShapeFillOpacity(s));

        bubbleTitleText.textContent = '📐 晋江气泡预览';
        openBubbleSection(); showToast('✅ 已转换为晋江格式，可微调后导出', 'success');
    }

    function handleSunnyFormat() {
        isSunnyMode = true; keepModified = false;
        const code = input.value.trim();
        if (!code || !/<svg\b/i.test(code)) { showToast('请先输入有效的 SVG 代码', 'error'); return; }
        const parser = new DOMParser(); const doc = parser.parseFromString(code, 'image/svg+xml');
        if (doc.querySelector('parsererror')) { showToast('SVG 解析失败', 'error'); return; }
        const svg = doc.documentElement;
        const vb = svg.getAttribute('viewBox') || '0 0 1153 1024'; const vbParts = vb.trim().split(/\s+/);
        const centerX = parseFloat(vbParts[0]) + parseFloat(vbParts[2]) / 2; const centerY = parseFloat(vbParts[1]) + parseFloat(vbParts[3]) / 2;
        const shapes = svg.querySelectorAll('path, circle, ellipse, rect, line, polyline, polygon');
        const textEl = svg.querySelector('text');

        originalTextFill = textEl ? extractFirstValidColor(textEl.getAttribute('fill')) : '#000000';
        originalStrokeColor = '#000000'; for (let s of shapes) { let v = s.getAttribute('stroke'); let c = extractFirstValidColor(v); if (c !== '#000000' || (v && isValidColorString(v))) { originalStrokeColor = c; break; } }
        originalFillColor = '#ffffff'; for (let s of shapes) { let v = s.getAttribute('fill'); let c = extractFirstValidColor(v); if (c !== '#ffffff' || (v && isValidColorString(v))) { originalFillColor = c; break; } }

        originalShapeFills = Array.from(shapes).map(s => extractFirstValidColor(s.getAttribute('fill')));
        originalShapeOpacities = Array.from(shapes).map(s => getShapeFillOpacity(s));

        shapes.forEach(p => {
            const stroke = p.getAttribute('stroke'); if (stroke && stroke !== 'none' && stroke !== 'currentColor' && !/^\$/.test(stroke)) p.setAttribute('stroke', '$color');
            const fill = p.getAttribute('fill'); if (fill && fill !== 'none' && fill !== 'currentColor' && !/^\$/.test(fill)) p.setAttribute('fill', '$tccolor');
            const style = p.getAttribute('style'); if (style) p.setAttribute('style', style.replace(/stroke:\s*[^;]+;?/g, 'stroke: $color;').replace(/fill:\s*[^;]+;?/g, 'fill: $tccolor;'));
        });
        if (textEl) { textEl.setAttribute('fill', '$fontcolor'); textEl.textContent = '$displayText'; textEl.setAttribute('x', centerX); textEl.setAttribute('y', centerY); textEl.setAttribute('text-anchor', 'middle'); textEl.setAttribute('dy', '0.35em'); }
        else { const newText = doc.createElementNS('http://www.w3.org/2000/svg', 'text'); newText.setAttribute('x', centerX); newText.setAttribute('y', centerY); newText.setAttribute('fill', '$fontcolor'); newText.setAttribute('font-family', 'Arial, sans-serif'); newText.setAttribute('font-size', '10'); newText.setAttribute('font-weight', '500'); newText.textContent = '$displayText'; newText.setAttribute('text-anchor', 'middle'); newText.setAttribute('dy', '0.35em'); svg.appendChild(newText); }
        const serializer = new XMLSerializer(); currentPreviewCode = serializer.serializeToString(svg);
        bubbleTitleText.textContent = '☀️ 晴天气泡预览';

        textX.value = centerX; textY.value = centerY; textSize.value = textEl ? (textEl.getAttribute('font-size') || '10') : '10';
        textFill.value = originalTextFill; textFill.dataset.variable = '$fontcolor';
        textContent.value = '927'; textFont.value = textEl ? (textEl.getAttribute('font-family') || 'Arial') : 'Arial'; textWeight.value = textEl ? (textEl.getAttribute('font-weight') || '500') : '500';
        if (shapes.length > 0) { strokeWidth.value = shapes[0].getAttribute('stroke-width') || '1'; strokeOpacityInput.value = shapes[0].getAttribute('stroke-opacity') || '1'; fillOpacityInput.value = shapes[0].getAttribute('fill-opacity') || '1'; }
        else { strokeWidth.value = '1'; strokeOpacityInput.value = '1'; fillOpacityInput.value = '1'; }
        strokeColorInput.value = originalStrokeColor; strokeColorInput.dataset.variable = '$color';
        fillColorInput.value = originalFillColor; fillColorInput.dataset.variable = '$tccolor';
        syncStrokeColorPreview(); syncColorPreview(fillColorInput, fillColorPreview, fillColorPicker);

        generateFillControls(shapes, originalShapeFills, originalShapeOpacities);
        const fillTitle = fillPerShapeContainer?.previousElementSibling;
        if (fillTitle && fillTitle.classList.contains('control-section-title')) { fillTitle.style.display = ''; }
        if (fillPerShapeContainer) { fillPerShapeContainer.style.display = ''; }
        setSunnyControlsVisibility(true);
        if (keepModifiedRow) keepModifiedRow.style.display = 'none';
        keepModified = false;
        selectedTccolorIndices = [0];

        initVariableLabels();
        bubbleSection.classList.remove('hidden');
        updateBubblePreview();
        applyPin();
        showToast('☀️ 已转为晴天格式', 'success');
    }

    applyBgColorBtn.addEventListener('click', applyBackgroundColor); convertReadingBtn.addEventListener('click', convertToReadingFormat); sunnyFormatBtn.addEventListener('click', handleSunnyFormat); $('closeBubbleBtn').addEventListener('click', closeBubbleSection); applyBubbleBtn.addEventListener('click', updateBubblePreview);
    strokeColorInput.addEventListener('input', () => { syncStrokeColorPreview(); updateBubblePreview(); updateVariableStyle(strokeColorInput); updateVariableLabel(strokeColorInput); });
    strokeColorPreview.addEventListener('click', (e) => { e.stopPropagation(); colorPicker.open(strokeColorPreview, strokeColorInput); });
    fillColorInput.addEventListener('input', () => { syncColorPreview(fillColorInput, fillColorPreview, fillColorPicker); updateBubblePreview(); updateVariableStyle(fillColorInput); updateVariableLabel(fillColorInput); });
    textFill.addEventListener('input', () => { syncColorPreview(textFill, textFillPreview, textFillPicker);
    updateBubblePreview(); updateVariableStyle(textFill); updateVariableLabel(textFill); });
    [textX, textY, textSize, textContent, textFont, textWeight, strokeWidth, rotateAngleInput, textRotateAngleInput].forEach(el => { el.addEventListener('input', updateBubblePreview); });
    strokeOpacityInput.addEventListener('input', updateBubblePreview); fillOpacityInput.addEventListener('input', updateBubblePreview);
    bgColor.addEventListener('input', () => syncColorPreview(bgColor, $('bgColorPreview'), $('bgColorPicker')));
    replaceInput.addEventListener('input', () => syncColorPreview(replaceInput, $('replaceColorPreview'), $('replaceColorPicker')));

    const pinPreviewBtn = $('pinPreviewBtn'); let isPreviewPinned = false; let savedBoxStyle = {}; let visualViewportHandler = null;
    function updateFixedPosition() { if (!isPreviewPinned) return; const vv = window.visualViewport; if (!vv) { bubblePreviewBox.style.top = '60px'; return; } const top = vv.offsetTop + 60; bubblePreviewBox.style.top = top + 'px'; }
    function restorePreviewPosition() { if (visualViewportHandler && window.visualViewport) { window.visualViewport.removeEventListener('resize', visualViewportHandler); window.visualViewport.removeEventListener('scroll', visualViewportHandler); visualViewportHandler = null; } bubblePreviewBox.style.transition = savedBoxStyle.transition || ''; bubblePreviewBox.style.position = savedBoxStyle.position || 'sticky'; bubblePreviewBox.style.top = savedBoxStyle.top || '10px'; bubblePreviewBox.style.left = savedBoxStyle.left || 'auto'; bubblePreviewBox.style.right = savedBoxStyle.right || 'auto'; bubblePreviewBox.style.zIndex = savedBoxStyle.zIndex || '5'; bubblePreviewBox.style.boxShadow = ''; pinPreviewBtn.textContent = '📌 固定'; isPreviewPinned = false; const btn = document.querySelector('#closePinBtn'); if (btn) btn.style.display = 'none'; }
    function applyPin() { if (isPreviewPinned) return; savedBoxStyle.position = bubblePreviewBox.style.position; savedBoxStyle.top = bubblePreviewBox.style.top; savedBoxStyle.left = bubblePreviewBox.style.left; savedBoxStyle.right = bubblePreviewBox.style.right; savedBoxStyle.zIndex = bubblePreviewBox.style.zIndex; savedBoxStyle.transition = bubblePreviewBox.style.transition; bubblePreviewBox.style.transition = 'none'; bubblePreviewBox.style.position = 'fixed'; bubblePreviewBox.style.left = 'auto'; bubblePreviewBox.style.right = '20px'; bubblePreviewBox.style.zIndex = '100'; bubblePreviewBox.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)'; if (window.visualViewport) { updateFixedPosition(); } else { bubblePreviewBox.style.top = '60px'; } requestAnimationFrame(() => { bubblePreviewBox.style.transition = 'top 0.3s ease, right 0.3s ease'; }); if (window.visualViewport) { visualViewportHandler = () => updateFixedPosition(); window.visualViewport.addEventListener('resize', visualViewportHandler); window.visualViewport.addEventListener('scroll', visualViewportHandler); } pinPreviewBtn.textContent = '🔓 解除固定'; isPreviewPinned = true; const btn = document.querySelector('#closePinBtn'); if (btn) btn.style.display = 'flex'; }
    pinPreviewBtn.addEventListener('click', () => { if (!isPreviewPinned) { applyPin(); } else { restorePreviewPosition(); } });
    bubblePreviewBox.addEventListener('click', (e) => { if (e.target.id === 'closePinBtn') { e.stopPropagation(); if (isPreviewPinned) { restorePreviewPosition(); } } });
    $('extractBtn').addEventListener('click', handleExtract); $('clearBtn').addEventListener('click', clearAll); $('copyCodeBtn').addEventListener('click', copyCode); $('copyColorBtn').addEventListener('click', copyColors); $('previewSvgBtn').addEventListener('click', previewSvg); $('selectAllBtn').addEventListener('click', () => { document.querySelectorAll('.color-checkbox').forEach(cb => cb.checked = true); updateSelectedCount(); }); $('deselectAllBtn').addEventListener('click', () => { document.querySelectorAll('.color-checkbox').forEach(cb => cb.checked = false); updateSelectedCount(); }); $('replaceBtn').addEventListener('click', performReplace); $('toSvgBtn').addEventListener('click', openToSvgModal); $('customLinkBtn').addEventListener('click', customLink); $('toolToggleBtn').addEventListener('click', toggleTools); $('closeModalBtn').addEventListener('click', closeModal); $('svgModal').addEventListener('click', e => { if (e.target === $('svgModal')) closeModal(); }); $('toSvgModal').addEventListener('click', e => { if (e.target === $('toSvgModal')) closeToSvgModal(); });
    let dragStartY, dragStartHeight, isDragging = false;
    function getClientY(e) { return e.touches ? e.touches[0].clientY : e.clientY; }
    function onDragStart(e) { if (!$('toSvgModal').classList.contains('active')) return; if (e.target.closest('.upload-zone') || e.target.closest('textarea')) return; e.preventDefault(); dragStartY = getClientY(e); dragStartHeight = parseFloat($('drawerContent').style.height) || getHalfHeight(); isDragging = true; $('drawerContent').classList.add('dragging'); $('drawerContent').style.transition = 'none'; document.body.style.userSelect = 'none'; }
    function onDragMove(e) { if (!isDragging) return; e.preventDefault(); const delta = getClientY(e) - dragStartY; let newHeight = dragStartHeight - delta; newHeight = Math.max(20, newHeight); $('drawerContent').style.height = newHeight + 'px'; }
    function onDragEnd() { if (!isDragging) return; isDragging = false; $('drawerContent').classList.remove('dragging'); document.body.style.userSelect = ''; $('drawerContent').style.transition = ''; const finalHeight = parseFloat($('drawerContent').style.height) || getHalfHeight(); const ratio = finalHeight / windowHeight; if (ratio < CLOSE_RATIO) { closeToSvgModal(); return; } if (ratio >= FULL_TRIGGER_RATIO) { $('drawerContent').style.height = getFullHeight() + 'px'; setUIMode(true, true); return; } $('drawerContent').style.height = finalHeight + 'px'; setUIMode(false, true); }
    const handle = $('drawerHandle'); handle.addEventListener('touchstart', onDragStart, { passive: false }); handle.addEventListener('mousedown', onDragStart); document.addEventListener('touchmove', onDragMove, { passive: false }); document.addEventListener('mousemove', onDragMove); document.addEventListener('touchend', onDragEnd); document.addEventListener('mouseup', onDragEnd); handle.addEventListener('dragstart', e => e.preventDefault());
    window.addEventListener('resize', () => { windowHeight = window.innerHeight; if (!$('toSvgModal').classList.contains('active')) return; if (isFullscreen) $('drawerContent').style.height = getFullHeight() + 'px'; else $('drawerContent').style.height = getHalfHeight() + 'px'; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (changelogModalOverlay.classList.contains('active')) { changelogModalOverlay.classList.remove('active'); } if (exportModalOverlay.classList.contains('active')) { closeExportModal(); } if (helpModalOverlay.classList.contains('active')) { helpModalOverlay.classList.remove('active'); } if (keepModifiedModalOverlay && keepModifiedModalOverlay.classList.contains('active')) { keepModified = false; closeKeepModifiedModal(); doExportBubble(); } if (tccolorModalOverlay && tccolorModalOverlay.classList.contains('active')) { onTccolorCancel(); } if ($('svgModal').classList.contains('active')) closeModal(); if ($('toSvgModal').classList.contains('active')) closeToSvgModal(); if (toolsOpen) toggleTools(); if (!bubbleSection.classList.contains('hidden')) closeBubbleSection(); if (colorPicker.active) colorPicker.close(); } if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && document.activeElement === input) { e.preventDefault(); handleExtract(); } });
    replaceInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); performReplace(); } });
    helpBtn.addEventListener('click', () => { helpModalOverlay.classList.add('active'); }); helpModalClose.addEventListener('click', () => { helpModalOverlay.classList.remove('active'); }); helpModalOverlay.addEventListener('click', e => { if (e.target === helpModalOverlay) helpModalOverlay.classList.remove('active'); });
    changelogBtn.addEventListener('click', () => { changelogModalOverlay.classList.add('active'); }); changelogModalClose.addEventListener('click', () => { changelogModalOverlay.classList.remove('active'); }); changelogModalOverlay.addEventListener('click', e => { if (e.target === changelogModalOverlay) changelogModalOverlay.classList.remove('active'); });
    updateLinkStatus(); updateCompressLinkStatus(); updateBubbleIconLinkStatus();
    input.value = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12.4 19a4.2 4.2 0 0 1-1.57-.298L7 21v-3.134a2.668 2.668 0 0 1-1.795-3.773A4.8 4.8 0 0 1 8.113 5.16a5.335 5.335 0 0 1 9.194 1.078a5.333 5.333 0 0 1 3.404 8.771M16 19h6"/></svg>`;
    setInputMode('code');
    setTimeout(handleExtract, 50);

    const btnTop = document.getElementById('btn-to-top');
    const btnBottom = document.getElementById('btn-to-bottom');
    function highlightButton(btn) { btn.classList.add('highlight'); setTimeout(() => btn.classList.remove('highlight'), 400); }
    btnTop.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); highlightButton(btnTop); });
    btnBottom.addEventListener('click', () => { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); highlightButton(btnBottom); });
})();