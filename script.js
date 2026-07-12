// ========== JS 部分 ==========
(() => {
    const STORAGE_KEY = 'customSvgUrl';
    const DEFAULT_URL = 'https://to-svg.com/zh';
    const COLOR_REGEX = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
    const HALF_RATIO = 0.60,
        FULL_TRIGGER_RATIO = 0.85,
        CLOSE_RATIO = 0.30;

    let isFullscreen = false,
        windowHeight = window.innerHeight;
    let toolsOpen = false;
    let currentInputMode = 'code';
    let isSunnyMode = false;

    let currentPreviewCode = null;

    const COMPRESS_STORAGE_KEY = 'customCompressUrl';
    const DEFAULT_COMPRESS_URL = 'https://svg.wxeditor.com/tool/svg-compress';
    const $ = id => document.getElementById(id);
    const input = $('codeInput'),
        resultDisplay = $('resultDisplay');
    const statsAndTools = $('statsAndTools'),
        colorCountSpan = $('colorCount');
    const selectedCountSpan = $('selectedCount'),
        replaceArea = $('replaceArea');
    const replaceInput = $('replaceInput'),
        replaceBtn = $('replaceBtn');
    const replaceStatus = $('replaceStatus');
    const toastContainer = document.querySelector('#toast-container');
    const uploadZone = $('uploadZone'),
        fileInput = $('fileInput');
    const imageUploadZone = $('imageUploadZone'),
        imageFileInput = $('imageFileInput');
    const codeTabBtn = $('codeTabBtn'),
        uploadTabBtn = $('uploadTabBtn'),
        imageTabBtn = $('imageTabBtn');
    const bubbleSection = $('bubbleSection'),
        bubblePreviewBox = $('bubblePreviewBox');
    const bubbleTitle = $('bubbleTitle');
    const textX = $('textX'),
        textY = $('textY'),
        textSize = $('textSize');
    const textFill = $('textFill'),
        textContent = $('textContent'),
        textFont = $('textFont'),
        textWeight = $('textWeight');
    const strokeWidth = $('strokeWidth');
    const bgColor = $('bgColor'),
        applyBgColorBtn = $('applyBgColorBtn');
    const applyBubbleBtn = $('applyBubbleBtn'),
        exportBubbleBtn = $('exportBubbleBtn');
    const bubbleCodeOutput = $('bubbleCodeOutput');
    const convertReadingBtn = $('convertReadingBtn');
    const sunnyFormatBtn = $('sunnyFormatBtn');
    const helpModalOverlay = $('helpModalOverlay');
    const helpModalClose = $('helpModalClose');
    const helpBtn = $('helpBtn');

    const changelogModalOverlay = $('changelogModalOverlay');
    const changelogModalClose = $('changelogModalClose');
    const changelogBtn = $('changelogBtn');

    const strokeOpacityInput = $('strokeOpacity');
    const fillColorInput = $('fillColorInput');
    const fillOpacityInput = $('fillOpacity');
    const fillColorPreview = $('fillColorPreview');
    const fillColorPicker = $('fillColorPicker');
    const sunnyControls = document.querySelectorAll('.sunny-only');

    const exportModalOverlay = $('exportModalOverlay');
    const exportModalClose = $('exportModalClose');
    const exportCopyCodeBtn = $('exportCopyCodeBtn');
    const exportTxtBtn = $('exportTxtBtn');
    const exportSvgBtn = $('exportSvgBtn');

    $('compressBtn').addEventListener('click', openCompressModal);
    $('compressCustomLinkBtn').addEventListener('click', customCompressLink);

    const TEXT_EXTENSIONS = new Set(['svg', 'txt', 'html', 'htm', 'xml', 'css', 'js', 'json', 'md', 'ts', 'jsx',
        'tsx', 'vue', 'svelte'
    ]);

    // ====== 完整的工具函数 ======
    function getCompressUrl() { return localStorage.getItem(COMPRESS_STORAGE_KEY) || DEFAULT_COMPRESS_URL; }
    function setCompressUrl(url) { localStorage.setItem(COMPRESS_STORAGE_KEY, url); updateCompressLinkStatus(); }
    function updateCompressLinkStatus() { const url = getCompressUrl(); const linkEl = $('compressLinkStatus'); try { const p = new URL(url); linkEl.textContent = p.hostname.replace(/^www\./, ''); linkEl.title = url; } catch { linkEl.textContent = url.substring(0, 28) + '…'; linkEl.title = url; } }
    function getSvgUrl() { return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL; }
    function setSvgUrl(url) { localStorage.setItem(STORAGE_KEY, url); updateLinkStatus(); }
    function updateLinkStatus() { const url = getSvgUrl(); const linkEl = $('linkStatus'); try { const p = new URL(url); linkEl.textContent = p.hostname.replace(/^www\./, ''); linkEl.title = url; } catch { linkEl.textContent = url.substring(0, 28) + '…'; linkEl.title = url; } }
    function showToast(msg, type = 'success', dur = 3000) { const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'; const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.innerHTML = `<span class="toast-icon">${icon}</span> ${msg}`; toastContainer.appendChild(toast); const timer = setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); }, dur); toast.addEventListener('click', () => { clearTimeout(timer); toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); }); }
    function extractColors(text) { const matches = text.match(COLOR_REGEX); if (!matches) return []; const seen = new Set(); return matches.filter(c => { const u = c.toUpperCase(); if (seen.has(u)) return false; seen.add(u); return true; }); }
    function renderColors(colors) {
        resultDisplay.innerHTML = '';
        if (!colors.length) {
            resultDisplay.innerHTML = '<div class="empty-state">未找到任何颜色</div>';
            statsAndTools.classList.add('hidden'); replaceArea.classList.add('hidden');
            return;
        }
        statsAndTools.classList.remove('hidden'); replaceArea.classList.remove('hidden');
        colorCountSpan.textContent = colors.length;
        const grid = document.createElement('div'); grid.className = 'color-grid';
        colors.forEach(c => {
            const bg = c.startsWith('#') ? c : `#${c}`;
            const label = document.createElement('label'); label.className = 'color-item';
            const cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'color-checkbox'; cb.value = c; cb.checked = true;
            const swatch = document.createElement('span'); swatch.className = 'color-swatch'; swatch.style.background = bg;
            const text = document.createElement('span'); text.className = 'color-label'; text.textContent = c;
            label.append(cb, swatch, text);
            grid.appendChild(label);
        });
        resultDisplay.appendChild(grid);
        updateSelectedCount();
        replaceStatus.textContent = '勾选颜色，输入替换内容，点击按钮'; replaceStatus.style.color = '#64748b';
        grid.addEventListener('change', e => { if (e.target.classList.contains('color-checkbox')) { updateSelectedCount(); replaceStatus.textContent = ''; } });
    }
    function updateSelectedCount() { const checked = document.querySelectorAll('.color-checkbox:checked'); selectedCountSpan.textContent = `已选 ${checked.length} 个`; replaceBtn.disabled = (checked.length === 0); }
    function getSelectedColors() { return Array.from(document.querySelectorAll('.color-checkbox:checked')).map(cb => cb.value); }
    function copyText(text, okMsg, failMsg = '复制失败') {
        if (!text.trim()) { showToast('⚠️ 没有内容可复制', 'error'); return false; }
        const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px'; ta.style.top = '-9999px'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0, text.length);
        let success = false;
        try { success = document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        if (success) showToast(okMsg, 'success'); else showToast(failMsg, 'error');
        return success;
    }
    function handleExtract() { renderColors(extractColors(input.value)); }
    function clearAll() { input.value = ''; renderColors([]); replaceStatus.textContent = ''; showToast('已清空', 'success'); }
    function copyCode() { if (!input.value.trim()) { showToast('输入框为空', 'error'); return; } copyText(input.value, '✅ 代码已复制'); }
    function copyColors() {
        const colors = getSelectedColors().length ? getSelectedColors() : Array.from(document.querySelectorAll('.color-checkbox')).map(cb => cb.value);
        if (!colors.length) { showToast('没有颜色可复制', 'error'); return; }
        copyText(colors.join('\n'), `✅ 已复制 ${colors.length} 个颜色`);
    }
    function performReplace() {
        const selected = getSelectedColors();
        if (!selected.length) { showToast('请至少勾选一个颜色', 'error'); return; }
        const replaceText = replaceInput.value;
        if (!confirm(`确定将选中的 ${selected.length} 个颜色替换为「${replaceText||'(空)'}」吗？`)) {
            replaceStatus.textContent = '已取消'; replaceStatus.style.color = '#64748b'; return;
        }
        let newText = input.value;
        selected.forEach(c => { newText = newText.replace(new RegExp(c, 'gi'), replaceText); });
        input.value = newText;
        replaceStatus.textContent = `✅ 成功替换 ${selected.length} 个颜色！`; replaceStatus.style.color = '#16a34a';
        showToast(`✅ 成功替换 ${selected.length} 个颜色！`, 'success');
        handleExtract();
    }
    function previewSvg() {
        const code = input.value.trim();
        if (!code) { showToast('输入框为空', 'error'); return; }
        let svg = code;
        if (!/<svg\b/i.test(svg)) svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">\n${svg}\n</svg>`;
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f8fafc;}svg{max-width:100%;max-height:100%;}</style></head><body>${svg}</body></html>`;
        const iframe = document.createElement('iframe'); iframe.srcdoc = html;
        $('modalBody').innerHTML = ''; $('modalBody').appendChild(iframe);
        $('svgModal').classList.add('active');
    }
    function closeModal() { $('svgModal').classList.remove('active'); $('modalBody').innerHTML = '<div class="error-msg">已关闭</div>'; }
    function getHalfHeight() { return windowHeight * HALF_RATIO; }
    function getFullHeight() { return windowHeight; }
    function setUIMode(fullscreen, animate = true) {
        isFullscreen = fullscreen;
        const drawer = $('drawerContent');
        if (!animate) drawer.style.transition = 'none';
        if (fullscreen) { $('toSvgModal').classList.add('fullscreen-mode'); $('toSvgModalBody').style.overflow = 'auto'; }
        else { $('toSvgModal').classList.remove('fullscreen-mode'); $('toSvgModalBody').style.overflow = 'hidden'; }
        if (!animate) requestAnimationFrame(() => { drawer.style.transition = ''; });
    }
    function openToSvgModal() {
        const url = getSvgUrl(); $('toSvgModalBody').querySelector('iframe').src = url;
        const half = getHalfHeight(); $('drawerContent').style.height = half + 'px';
        setUIMode(false, false); $('toSvgModal').classList.add('active');
        $('toSvgLoading').classList.remove('hidden');
        $('toSvgModalBody').querySelector('iframe').onload = () => $('toSvgLoading').classList.add('hidden');
        setTimeout(() => $('toSvgLoading').classList.add('hidden'), 10000);
    }
    function openCompressModal() {
        const url = getCompressUrl(); $('toSvgModalBody').querySelector('iframe').src = url;
        const half = getHalfHeight(); $('drawerContent').style.height = half + 'px';
        setUIMode(false, false); $('toSvgModal').classList.add('active');
        $('toSvgLoading').classList.remove('hidden');
        $('toSvgModalBody').querySelector('iframe').onload = () => $('toSvgLoading').classList.add('hidden');
        setTimeout(() => $('toSvgLoading').classList.add('hidden'), 10000);
    }
    function closeToSvgModal() {
        const modal = $('toSvgModal'); modal.classList.add('closing');
        setTimeout(() => { modal.classList.remove('active', 'closing'); $('drawerContent').style.height = getHalfHeight() + 'px'; setUIMode(false, false); }, 300);
    }
    function customLink() {
        const current = getSvgUrl();
        const newUrl = prompt('请输入图片转 SVG 服务的完整链接：', current);
        if (newUrl === null) return;
        const trimmed = newUrl.trim();
        if (!trimmed) { showToast('链接不能为空', 'error'); return; }
        if (!/^https?:\/\//.test(trimmed)) { showToast('请输入有效链接', 'error'); return; }
        setSvgUrl(trimmed); showToast(`✅ 已切换至：${trimmed}`, 'success');
        if ($('toSvgModal').classList.contains('active')) {
            const iframe = $('toSvgModalBody').querySelector('iframe'); iframe.src = trimmed;
            $('toSvgLoading').classList.remove('hidden');
            iframe.onload = () => $('toSvgLoading').classList.add('hidden');
            setTimeout(() => $('toSvgLoading').classList.add('hidden'), 10000);
        }
    }
    function customCompressLink() {
        const current = getCompressUrl();
        const newUrl = prompt('请输入 SVG 压缩服务的完整链接：', current);
        if (newUrl === null) return;
        const trimmed = newUrl.trim();
        if (!trimmed) { showToast('链接不能为空', 'error'); return; }
        if (!/^https?:\/\//.test(trimmed)) { showToast('请输入有效链接', 'error'); return; }
        setCompressUrl(trimmed); showToast(`✅ 已切换至：${trimmed}`, 'success');
        if ($('toSvgModal').classList.contains('active')) {
            const iframe = $('toSvgModalBody').querySelector('iframe'); iframe.src = trimmed;
            $('toSvgLoading').classList.remove('hidden');
            iframe.onload = () => $('toSvgLoading').classList.add('hidden');
            setTimeout(() => $('toSvgLoading').classList.add('hidden'), 10000);
        }
    }
    function toggleTools() {
        toolsOpen = !toolsOpen;
        const toolGroup = $('toolGroup'), toggleBtn = $('toolToggleBtn');
        if (toolsOpen) { toolGroup.classList.add('stacked'); toggleBtn.classList.add('open'); }
        else { toolGroup.classList.remove('stacked'); toggleBtn.classList.remove('open'); }
    }
    function setInputMode(mode) {
        currentInputMode = mode;
        input.classList.add('hidden'); uploadZone.classList.add('hidden'); imageUploadZone.classList.add('hidden');
        codeTabBtn.classList.remove('active'); uploadTabBtn.classList.remove('active'); imageTabBtn.classList.remove('active');
        if (mode === 'code') { input.classList.remove('hidden'); codeTabBtn.classList.add('active'); input.focus(); }
        else if (mode === 'upload') { uploadZone.classList.remove('hidden'); uploadTabBtn.classList.add('active'); }
        else if (mode === 'image') { imageUploadZone.classList.remove('hidden'); imageTabBtn.classList.add('active'); }
    }
    codeTabBtn.addEventListener('click', () => setInputMode('code'));
    uploadTabBtn.addEventListener('click', () => setInputMode('upload'));
    imageTabBtn.addEventListener('click', () => setInputMode('image'));

    function getFileExtension(filename) { const lastDot = filename.lastIndexOf('.'); return lastDot === -1 ? '' : filename.substring(lastDot + 1).toLowerCase(); }
    function isTextFile(filename) { const ext = getFileExtension(filename); return !ext || TEXT_EXTENSIONS.has(ext); }
    function isImageFile(filename) { const ext = getFileExtension(filename); return new Set(['png','jpg','jpeg','gif','bmp','webp','ico','tiff','heic']).has(ext); }
    function readFileAndPopulate(file) {
        if (!file) return;
        const filename = file.name;
        if (isImageFile(filename)) {
            if (confirm(`「${filename}」看起来是图片，是否跳转到图片转SVG工具？`)) {
                fileInput.value = ''; openToSvgModal(); setInputMode('code'); return;
            }
        }
        if (currentInputMode === 'upload') uploadZone.classList.add('loading');
        const reader = new FileReader();
        reader.onload = function(e) {
            input.value = e.target.result; setInputMode('code'); uploadZone.classList.remove('loading'); fileInput.value = '';
            showToast(`✅ 已读取：${filename}`, 'success', 2500); setTimeout(handleExtract, 150);
        };
        reader.onerror = function() { uploadZone.classList.remove('loading'); fileInput.value = ''; showToast('❌ 文件读取失败', 'error'); setInputMode('code'); };
        reader.readAsText(file);
    }
    fileInput.addEventListener('change', e => { if (e.target.files[0]) readFileAndPopulate(e.target.files[0]); });
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); if (currentInputMode === 'upload') uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', e => { e.preventDefault(); if (!uploadZone.contains(e.relatedTarget)) uploadZone.classList.remove('drag-over'); });
    uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('drag-over'); if (currentInputMode === 'upload' && e.dataTransfer.files[0]) readFileAndPopulate(e.dataTransfer.files[0]); });

    function loadImageAsBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
    function getImageDimensions(base64) { return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight }); img.onerror = reject; img.src = base64; }); }

    async function createImageBubble(base64) {
        try {
            const dims = await getImageDimensions(base64); const w = dims.width; const h = dims.height;
            const svgNS = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(svgNS, 'svg');
            svg.setAttribute('xmlns', svgNS); svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('width', w); svg.setAttribute('height', h);
            const image = document.createElementNS(svgNS, 'image'); image.setAttribute('x', '0'); image.setAttribute('y', '0'); image.setAttribute('width', w); image.setAttribute('height', h); image.setAttribute('href', base64);
            svg.appendChild(image);
            const text = document.createElementNS(svgNS, 'text'); text.setAttribute('x', w / 2); text.setAttribute('y', h / 2 + 30); text.setAttribute('text-anchor', 'middle'); text.setAttribute('dominant-baseline', 'middle'); text.setAttribute('font-size', Math.max(16, Math.round(h / 10))); text.setAttribute('font-family', 'Arial, sans-serif'); text.setAttribute('font-weight', 'bold'); text.setAttribute('fill', '#d500ff'); text.textContent = '数量';
            svg.appendChild(text);
            const serializer = new XMLSerializer(); return serializer.serializeToString(svg);
        } catch (err) { showToast('图片处理失败: ' + err.message, 'error'); return null; }
    }

    async function handleImageFile(file) {
        if (!file) return;
        imageUploadZone.classList.add('loading');
        try {
            const base64 = await loadImageAsBase64(file); const svgCode = await createImageBubble(base64);
            if (svgCode) {
                input.value = svgCode; setInputMode('code'); imageUploadZone.classList.remove('loading'); imageFileInput.value = '';
                handleExtract(); currentPreviewCode = svgCode; isSunnyMode = false; bubbleTitle.textContent = '🎈 气泡预览';
                openBubbleSection(); showToast('✅ 图片气泡已生成，可调整文本', 'success');
            } else { imageUploadZone.classList.remove('loading'); }
        } catch (err) { imageUploadZone.classList.remove('loading'); imageFileInput.value = ''; showToast('图片处理失败: ' + err.message, 'error'); }
    }
    imageFileInput.addEventListener('change', e => { if (e.target.files[0]) handleImageFile(e.target.files[0]); });
    imageUploadZone.addEventListener('dragover', e => { e.preventDefault(); if (currentInputMode === 'image') imageUploadZone.classList.add('drag-over'); });
    imageUploadZone.addEventListener('dragleave', e => { e.preventDefault(); if (!imageUploadZone.contains(e.relatedTarget)) imageUploadZone.classList.remove('drag-over'); });
    imageUploadZone.addEventListener('drop', e => { e.preventDefault(); imageUploadZone.classList.remove('drag-over'); if (currentInputMode === 'image' && e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]); });

    function applyBackgroundColor() {
        if (!currentPreviewCode || !/<svg\b/i.test(currentPreviewCode)) { showToast('请先转换格式', 'error'); return; }
        const targetColor = bgColor.value.trim(); if (!targetColor) { showToast('请输入背景颜色', 'error'); return; }
        const parser = new DOMParser(); const doc = parser.parseFromString(currentPreviewCode, 'image/svg+xml');
        if (doc.querySelector('parsererror')) { showToast('SVG 解析失败', 'error'); return; }
        const svg = doc.documentElement; let vb = svg.getAttribute('viewBox');
        let x = 0, y = 0, w = 1153, h = 1024;
        if (vb) { const parts = vb.trim().split(/\s+/); if (parts.length === 4) { x = parseFloat(parts[0]); y = parseFloat(parts[1]); w = parseFloat(parts[2]); h = parseFloat(parts[3]); } }
        else { const wAttr = svg.getAttribute('width'), hAttr = svg.getAttribute('height'); w = wAttr ? parseFloat(wAttr) : w; h = hAttr ? parseFloat(hAttr) : h; }
        let bgEl = svg.querySelector('rect[data-bg="true"]');
        if (!bgEl) {
            const paths = svg.querySelectorAll('path');
            for (let p of paths) {
                const d = p.getAttribute('d');
                if (d && /^M\s*([\d.]+)\s+([\d.]+)\s*h\s*([\d.]+)\s*v\s*([\d.]+)\s*H\s*([\d.]+)\s*z$/i.test(d.trim())) {
                    const m = d.trim().match(/^M\s*([\d.]+)\s+([\d.]+)\s*h\s*([\d.]+)\s*v\s*([\d.]+)\s*H\s*([\d.]+)\s*z$/i);
                    if (m && Math.abs(parseFloat(m[1]) - x) < 1 && Math.abs(parseFloat(m[2]) - y) < 1 && Math.abs(parseFloat(m[3]) - w) < 1 && Math.abs(parseFloat(m[4]) - h) < 1) { bgEl = p; break; }
                }
            }
            if (!bgEl) { bgEl = doc.createElementNS('http://www.w3.org/2000/svg', 'rect'); bgEl.setAttribute('data-bg', 'true'); svg.insertBefore(bgEl, svg.firstChild); }
        }
        bgEl.setAttribute('x', x); bgEl.setAttribute('y', y); bgEl.setAttribute('width', w); bgEl.setAttribute('height', h); bgEl.setAttribute('fill', targetColor);
        if (bgEl.tagName === 'path') bgEl.setAttribute('stroke', 'none');
        const serializer = new XMLSerializer(); currentPreviewCode = serializer.serializeToString(svg);
        updateBubblePreview(); showToast(`✅ 画布背景已设置为 ${targetColor}`, 'success');
    }

    function setSunnyControlsVisibility(visible) { sunnyControls.forEach(el => { el.style.display = visible ? 'flex' : 'none'; }); }

    function updateBubblePreview() {
        const code = currentPreviewCode;
        if (!code || !/<svg\b/i.test(code)) { bubblePreviewBox.innerHTML = '<span style="color:#94a3b8;">请先转换格式</span>'; return; }
        const parser = new DOMParser(); const doc = parser.parseFromString(code, 'image/svg+xml');
        if (doc.querySelector('parsererror')) { bubblePreviewBox.innerHTML = '<span style="color:#dc2626;">SVG解析错误</span>'; return; }
        const previewDoc = parser.parseFromString(code, 'image/svg+xml');
        const paths = previewDoc.querySelectorAll('path'); const firstPath = paths[0];
        if (firstPath) {
            firstPath.setAttribute('stroke-width', strokeWidth.value);
            if (isSunnyMode) {
                firstPath.setAttribute('stroke-opacity', strokeOpacityInput.value);
                firstPath.setAttribute('fill-opacity', fillOpacityInput.value);
                firstPath.setAttribute('fill', fillColorInput.value || '#ffffff');
                firstPath.setAttribute('stroke', '#000000');
            }
        }
        const textEl = previewDoc.querySelector('text');
        if (textEl) {
            textEl.setAttribute('x', textX.value); textEl.setAttribute('y', textY.value); textEl.setAttribute('font-size', textSize.value);
            textEl.setAttribute('font-family', textFont.value); textEl.setAttribute('font-weight', textWeight.value);
            if (isSunnyMode) { textEl.setAttribute('text-anchor', 'middle'); textEl.setAttribute('dominant-baseline', 'middle'); }
            let useColor = textFill.value.trim();
            if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(useColor) && !/^rgb/i.test(useColor) && !/^hsl/i.test(useColor) && useColor !== 'transparent') { useColor = '#000000'; }
            textEl.setAttribute('fill', useColor); textEl.setAttribute('style', `fill: ${useColor}; opacity: 1;`);
            textEl.textContent = textContent.value || '927';
        }
        const serializer = new XMLSerializer(); bubblePreviewBox.innerHTML = serializer.serializeToString(previewDoc.documentElement);
    }

    function openBubbleSection() {
        if (!currentPreviewCode || !/<svg\b/i.test(currentPreviewCode)) { showToast('请先转换格式', 'error'); return; }
        const parser = new DOMParser(); const doc = parser.parseFromString(currentPreviewCode, 'image/svg+xml');
        if (doc.querySelector('parsererror')) { showToast('SVG 解析失败', 'error'); return; }
        const svg = doc.documentElement;
        const textEl = svg.querySelector('text');
        const textInfo = (() => {
            if (textEl) return {
                x: textEl.getAttribute('x') || '0', y: textEl.getAttribute('y') || '0',
                fontSize: textEl.getAttribute('font-size') || '16', fill: textEl.getAttribute('fill') || '#000',
                content: textEl.textContent || '', fontFamily: textEl.getAttribute('font-family') || 'sans-serif',
                weight: textEl.getAttribute('font-weight') || 'bold'
            };
            return null;
        })();
        if (textInfo) {
            textX.value = textInfo.x; textY.value = textInfo.y; textSize.value = textInfo.fontSize; textFill.value = textInfo.fill;
            textContent.value = '927'; textFont.value = textInfo.fontFamily; textWeight.value = textInfo.weight;
        } else {
            textX.value = isSunnyMode ? '13.5' : '550'; textY.value = isSunnyMode ? '12' : '630'; textSize.value = isSunnyMode ? '10' : '400';
            textFill.value = isSunnyMode ? '#000000' : '字'; textContent.value = '927'; textFont.value = 'Arial, sans-serif'; textWeight.value = '500';
        }
        const firstPath = svg.querySelector('path');
        strokeWidth.value = firstPath ? (firstPath.getAttribute('stroke-width') || (isSunnyMode ? '1' : '6')) : (isSunnyMode ? '1' : '6');
        if (isSunnyMode && firstPath) {
            strokeOpacityInput.value = firstPath.getAttribute('stroke-opacity') || '1';
            let fillVal = firstPath.getAttribute('fill');
            if (!fillVal || fillVal === 'none' || fillVal === 'currentColor' || fillVal.startsWith('$')) fillVal = '#ffffff';
            fillColorInput.value = fillVal; fillOpacityInput.value = firstPath.getAttribute('fill-opacity') || '1';
            syncColorPreview(fillColorInput, fillColorPreview, fillColorPicker);
        }
        bgColor.value = 'transparent';
        setSunnyControlsVisibility(isSunnyMode);
        bubbleSection.classList.remove('hidden'); updateBubblePreview();
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
            textEl.setAttribute('font-family', textFont.value); const fillVal = textEl.getAttribute('fill') || '';
            if (!fillVal.startsWith('$')) textEl.setAttribute('fill', textFill.value);
            textEl.setAttribute('font-weight', textWeight.value);
            if (!textEl.textContent.startsWith('$')) textEl.textContent = textContent.value;
            const style = textEl.getAttribute('style');
            if (style) { textEl.setAttribute('style', fillVal.startsWith('$') ? style.replace(/fill:\s*[^;]+;?/g, 'fill: $fontcolor;') : style.replace(/fill:\s*[^;]+;?/g, `fill: ${textFill.value};`)); }
            if (isSunnyMode) { textEl.setAttribute('text-anchor', 'middle'); textEl.setAttribute('dominant-baseline', 'middle'); }
        }
        const paths = doc.querySelectorAll('path');
        if (paths.length > 0) {
            const firstPath = paths[0]; firstPath.setAttribute('stroke-width', strokeWidth.value);
            if (isSunnyMode) {
                firstPath.setAttribute('stroke', '$color'); firstPath.setAttribute('fill', '$tccolor');
                firstPath.setAttribute('stroke-opacity', strokeOpacityInput.value); firstPath.setAttribute('fill-opacity', fillOpacityInput.value);
                const style = firstPath.getAttribute('style');
                if (style) firstPath.setAttribute('style', style.replace(/stroke:\s*[^;]+;?/g, 'stroke: $color;').replace(/fill:\s*[^;]+;?/g, 'fill: $tccolor;'));
            }
        }
        const serializer = new XMLSerializer(); return serializer.serializeToString(doc.documentElement);
    }

    function openExportModal() {
        const svgCode = generateBubbleSvg(); if (!svgCode) { showToast('没有可导出的代码', 'error'); return; }
        bubbleCodeOutput.textContent = svgCode; bubbleCodeOutput.classList.add('show');
        exportModalOverlay._svgCode = svgCode; exportModalOverlay.classList.add('active');
    }
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

    // 晋江格式
    function convertToReadingFormat() {
        isSunnyMode = false;
        const code = input.value.trim();
        if (!code || !/<svg\b/i.test(code)) { showToast('请先输入有效的 SVG 代码', 'error'); return; }
        const parser = new DOMParser(); const doc = parser.parseFromString(code, 'image/svg+xml');
        if (doc.querySelector('parsererror')) { showToast('SVG 解析失败', 'error'); return; }
        const svg = doc.documentElement; let vb = svg.getAttribute('viewBox');
        let minX = 0, minY = 0, width = 1153, height = 1024;
        if (vb) { const parts = vb.trim().split(/\s+/); if (parts.length === 4) { minX = parseFloat(parts[0]); minY = parseFloat(parts[1]); width = parseFloat(parts[2]); height = parseFloat(parts[3]); } }
        else { const wAttr = svg.getAttribute('width'), hAttr = svg.getAttribute('height'); width = wAttr ? parseFloat(wAttr) : width; height = hAttr ? parseFloat(hAttr) : height; }
        const imageEl = svg.querySelector('image');
        if (imageEl) { imageEl.setAttribute('x', minX); imageEl.setAttribute('y', minY); imageEl.setAttribute('width', width); imageEl.setAttribute('height', height); }
        const cx = minX + width / 2, cy = minY + height / 2;
        let textEl = svg.querySelector('text');
        if (!textEl) { textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text'); svg.appendChild(textEl); }
        textEl.setAttribute('x', cx); textEl.setAttribute('y', cy); textEl.setAttribute('text-anchor', 'middle'); textEl.setAttribute('dominant-baseline', 'middle');
        if (!textEl.getAttribute('font-size')) textEl.setAttribute('font-size', '42');
        textEl.setAttribute('fill', '字'); textEl.setAttribute('font-weight', 'bold'); textEl.textContent = '数量';
        const serializer = new XMLSerializer(); currentPreviewCode = serializer.serializeToString(svg);
        bubbleTitle.textContent = '📐 晋江气泡预览';
        openBubbleSection(); showToast('✅ 已转换为晋江格式，可微调后导出', 'success');
    }

    // 晴天格式
    function handleSunnyFormat() {
        isSunnyMode = true;
        const code = input.value.trim();
        if (!code || !/<svg\b/i.test(code)) { showToast('请先输入有效的 SVG 代码', 'error'); return; }
        const parser = new DOMParser(); const doc = parser.parseFromString(code, 'image/svg+xml');
        if (doc.querySelector('parsererror')) { showToast('SVG 解析失败', 'error'); return; }
        const svg = doc.documentElement;
        const vb = svg.getAttribute('viewBox') || '0 0 1153 1024'; const vbParts = vb.trim().split(/\s+/);
        const centerX = parseFloat(vbParts[0]) + parseFloat(vbParts[2]) / 2; const centerY = parseFloat(vbParts[1]) + parseFloat(vbParts[3]) / 2;
        const paths = svg.querySelectorAll('path');
        paths.forEach(p => {
            const stroke = p.getAttribute('stroke'); if (stroke && stroke !== 'none' && stroke !== 'currentColor' && !/^\$/.test(stroke)) p.setAttribute('stroke', '$color');
            const fill = p.getAttribute('fill'); if (fill && fill !== 'none' && fill !== 'currentColor' && !/^\$/.test(fill)) p.setAttribute('fill', '$tccolor');
            const style = p.getAttribute('style'); if (style) p.setAttribute('style', style.replace(/stroke:\s*[^;]+;?/g, 'stroke: $color;').replace(/fill:\s*[^;]+;?/g, 'fill: $tccolor;'));
        });
        const textEl = svg.querySelector('text');
        let origFill = '#000000', origFontSize = '10', origFontFamily = 'Arial', origWeight = '500';
        if (textEl) {
            origFill = textEl.getAttribute('fill') || origFill; origFontSize = textEl.getAttribute('font-size') || origFontSize;
            origFontFamily = textEl.getAttribute('font-family') || origFontFamily; origWeight = textEl.getAttribute('font-weight') || origWeight;
            textEl.setAttribute('fill', '$fontcolor'); textEl.textContent = '$displayText';
            textEl.setAttribute('x', centerX); textEl.setAttribute('y', centerY);
            textEl.setAttribute('text-anchor', 'middle'); textEl.setAttribute('dominant-baseline', 'middle');
            const style = textEl.getAttribute('style'); if (style) textEl.setAttribute('style', style.replace(/fill:\s*[^;]+;?/g, 'fill: $fontcolor;'));
        } else {
            const newText = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
            newText.setAttribute('x', centerX); newText.setAttribute('y', centerY); newText.setAttribute('fill', '$fontcolor');
            newText.setAttribute('font-family', 'Arial, sans-serif'); newText.setAttribute('font-size', '10'); newText.setAttribute('font-weight', '500');
            newText.textContent = '$displayText'; newText.setAttribute('text-anchor', 'middle'); newText.setAttribute('dominant-baseline', 'middle');
            svg.appendChild(newText);
        }
        const serializer = new XMLSerializer(); currentPreviewCode = serializer.serializeToString(svg);
        bubbleTitle.textContent = '☀️ 晴天气泡预览';
        textX.value = centerX; textY.value = centerY; textSize.value = origFontSize; textFill.value = origFill;
        textContent.value = '927'; textFont.value = origFontFamily; textWeight.value = origWeight;
        if (paths.length > 0) {
            const firstPath = paths[0]; strokeWidth.value = firstPath.getAttribute('stroke-width') || '1';
            strokeOpacityInput.value = firstPath.getAttribute('stroke-opacity') || '1';
            let fillVal = firstPath.getAttribute('fill'); if (!fillVal || fillVal === 'none' || fillVal.startsWith('$')) fillVal = '#ffffff';
            fillColorInput.value = fillVal; fillOpacityInput.value = firstPath.getAttribute('fill-opacity') || '1';
            syncColorPreview(fillColorInput, fillColorPreview, fillColorPicker);
        }
        setSunnyControlsVisibility(true); bubbleSection.classList.remove('hidden'); updateBubblePreview();
        showToast('☀️ 已转为晴天格式（颜色已替换为变量）', 'success');
    }

    applyBgColorBtn.addEventListener('click', applyBackgroundColor);
    convertReadingBtn.addEventListener('click', convertToReadingFormat);
    sunnyFormatBtn.addEventListener('click', handleSunnyFormat);
    $('closeBubbleBtn').addEventListener('click', closeBubbleSection);
    applyBubbleBtn.addEventListener('click', updateBubblePreview);
    [textX, textY, textSize, textFill, textContent, textFont, textWeight, strokeWidth].forEach(el => { el.addEventListener('input', updateBubblePreview); });
    strokeOpacityInput.addEventListener('input', updateBubblePreview);
    fillColorInput.addEventListener('input', updateBubblePreview);
    fillOpacityInput.addEventListener('input', updateBubblePreview);

    $('extractBtn').addEventListener('click', handleExtract);
    $('clearBtn').addEventListener('click', clearAll);
    $('copyCodeBtn').addEventListener('click', copyCode);
    $('copyColorBtn').addEventListener('click', copyColors);
    $('previewSvgBtn').addEventListener('click', previewSvg);
    $('selectAllBtn').addEventListener('click', () => { document.querySelectorAll('.color-checkbox').forEach(cb => cb.checked = true); updateSelectedCount(); });
    $('deselectAllBtn').addEventListener('click', () => { document.querySelectorAll('.color-checkbox').forEach(cb => cb.checked = false); updateSelectedCount(); });
    $('replaceBtn').addEventListener('click', performReplace);
    $('toSvgBtn').addEventListener('click', openToSvgModal);
    $('customLinkBtn').addEventListener('click', customLink);
    $('toolToggleBtn').addEventListener('click', toggleTools);
    $('closeModalBtn').addEventListener('click', closeModal);
    $('svgModal').addEventListener('click', e => { if (e.target === $('svgModal')) closeModal(); });
    $('toSvgModal').addEventListener('click', e => { if (e.target === $('toSvgModal')) closeToSvgModal(); });

    // 拖拽逻辑
    let dragStartY, dragStartHeight, isDragging = false;
    function getClientY(e) { return e.touches ? e.touches[0].clientY : e.clientY; }
    function onDragStart(e) {
        if (!$('toSvgModal').classList.contains('active')) return;
        if (e.target.closest('.upload-zone') || e.target.closest('textarea')) return;
        e.preventDefault(); dragStartY = getClientY(e); dragStartHeight = parseFloat($('drawerContent').style.height) || getHalfHeight();
        isDragging = true; $('drawerContent').classList.add('dragging'); $('drawerContent').style.transition = 'none'; document.body.style.userSelect = 'none';
    }
    function onDragMove(e) {
        if (!isDragging) return;
        e.preventDefault(); const delta = getClientY(e) - dragStartY; let newHeight = dragStartHeight - delta;
        newHeight = Math.max(20, newHeight); $('drawerContent').style.height = newHeight + 'px';
    }
    function onDragEnd() {
        if (!isDragging) return;
        isDragging = false; $('drawerContent').classList.remove('dragging'); document.body.style.userSelect = ''; $('drawerContent').style.transition = '';
        const finalHeight = parseFloat($('drawerContent').style.height) || getHalfHeight(); const ratio = finalHeight / windowHeight;
        if (ratio < CLOSE_RATIO) { closeToSvgModal(); return; }
        if (ratio >= FULL_TRIGGER_RATIO) { $('drawerContent').style.height = getFullHeight() + 'px'; setUIMode(true, true); return; }
        $('drawerContent').style.height = finalHeight + 'px'; setUIMode(false, true);
    }
    const handle = $('drawerHandle');
    handle.addEventListener('touchstart', onDragStart, { passive: false }); handle.addEventListener('mousedown', onDragStart);
    document.addEventListener('touchmove', onDragMove, { passive: false }); document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchend', onDragEnd); document.addEventListener('mouseup', onDragEnd);
    handle.addEventListener('dragstart', e => e.preventDefault());

    window.addEventListener('resize', () => {
        windowHeight = window.innerHeight;
        if (!$('toSvgModal').classList.contains('active')) return;
        if (isFullscreen) $('drawerContent').style.height = getFullHeight() + 'px';
        else $('drawerContent').style.height = getHalfHeight() + 'px';
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (changelogModalOverlay.classList.contains('active')) { changelogModalOverlay.classList.remove('active'); }
            if (exportModalOverlay.classList.contains('active')) { closeExportModal(); }
            if (helpModalOverlay.classList.contains('active')) { helpModalOverlay.classList.remove('active'); }
            if ($('svgModal').classList.contains('active')) closeModal();
            if ($('toSvgModal').classList.contains('active')) closeToSvgModal();
            if (toolsOpen) toggleTools();
            if (!bubbleSection.classList.contains('hidden')) closeBubbleSection();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && document.activeElement === input) { e.preventDefault(); handleExtract(); }
    });
    replaceInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); performReplace(); } });

    helpBtn.addEventListener('click', () => { helpModalOverlay.classList.add('active'); });
    helpModalClose.addEventListener('click', () => { helpModalOverlay.classList.remove('active'); });
    helpModalOverlay.addEventListener('click', e => { if (e.target === helpModalOverlay) helpModalOverlay.classList.remove('active'); });

    changelogBtn.addEventListener('click', () => { changelogModalOverlay.classList.add('active'); });
    changelogModalClose.addEventListener('click', () => { changelogModalOverlay.classList.remove('active'); });
    changelogModalOverlay.addEventListener('click', e => { if (e.target === changelogModalOverlay) changelogModalOverlay.classList.remove('active'); });

    // 颜色预览同步
    function syncColorPreview(inputEl, previewEl, pickerEl) {
        const val = inputEl.value.trim();
        if (/^#[0-9a-fA-F]{3,8}$/.test(val) || /^rgb/i.test(val) || /^hsl/i.test(val) || val === 'transparent') {
            previewEl.style.backgroundColor = val;
        } else if (val === '') { previewEl.style.backgroundColor = 'transparent'; }
        else { previewEl.style.backgroundColor = '#ccc'; }
        if (pickerEl && /^#[0-9a-fA-F]{6}$/.test(val)) { pickerEl.value = val; }
    }

    const bgColorPreview = document.getElementById('bgColorPreview'); const bgColorPicker = document.getElementById('bgColorPicker');
    bgColorPreview.setAttribute('data-clickable', 'true'); bgColorPreview.addEventListener('click', () => bgColorPicker.click());
    bgColor.addEventListener('input', () => syncColorPreview(bgColor, bgColorPreview, bgColorPicker));
    bgColorPicker.addEventListener('input', () => { bgColor.value = bgColorPicker.value; syncColorPreview(bgColor, bgColorPreview, bgColorPicker); });
    syncColorPreview(bgColor, bgColorPreview, bgColorPicker);

    const replaceColorPreview = document.getElementById('replaceColorPreview'); const replaceColorPicker = document.getElementById('replaceColorPicker');
    replaceColorPreview.setAttribute('data-clickable', 'true'); replaceColorPreview.addEventListener('click', () => replaceColorPicker.click());
    replaceInput.addEventListener('input', () => syncColorPreview(replaceInput, replaceColorPreview, replaceColorPicker));
    replaceColorPicker.addEventListener('input', () => { replaceInput.value = replaceColorPicker.value; syncColorPreview(replaceInput, replaceColorPreview, replaceColorPicker); });
    syncColorPreview(replaceInput, replaceColorPreview, replaceColorPicker);

    fillColorPreview.setAttribute('data-clickable', 'true'); fillColorPreview.addEventListener('click', () => fillColorPicker.click());
    fillColorInput.addEventListener('input', () => { syncColorPreview(fillColorInput, fillColorPreview, fillColorPicker); updateBubblePreview(); });
    fillColorPicker.addEventListener('input', () => { fillColorInput.value = fillColorPicker.value; syncColorPreview(fillColorInput, fillColorPreview, fillColorPicker); updateBubblePreview(); });
    syncColorPreview(fillColorInput, fillColorPreview, fillColorPicker);

    updateLinkStatus(); updateCompressLinkStatus();
    input.value = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" data-swindex="0" d="M12.4 19a4.2 4.2 0 0 1-1.57-.298L7 21v-3.134a2.668 2.668 0 0 1-1.795-3.773A4.8 4.8 0 0 1 8.113 5.16a5.335 5.335 0 0 1 9.194 1.078a5.333 5.333 0 0 1 3.404 8.771M16 19h6"/></svg>`;
    setInputMode('code');
    setTimeout(handleExtract, 50);
})();