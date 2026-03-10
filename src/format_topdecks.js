// ==UserScript==
// @name        Format OPTCG TopDecks
// @namespace   Violentmonkey Scripts
// @version     4.4
// @description Reshape onepiecetopdecks.com deck pages to personal preference: kill sidebar, expand gallery, show card codes on images.
// @grant       GM_xmlhttpRequest
// @author      ran-n
// @match       https://onepiecetopdecks.com/deck-list/*
// @license     GPL-3.0-only; https://www.gnu.org/licenses/gpl-3.0.html
// @homepageURL https://github.com/Ran-n/monke/blob/main/src/format_topdecks.js
// @downloadURL https://raw.githubusercontent.com/Ran-n/monke/main/src/format_topdecks.js
// @updateURL   https://raw.githubusercontent.com/Ran-n/monke/main/src/format_topdecks.js
// ==/UserScript==

(function () {
    'use strict';

    // --- SVG icons (no hardcoded size — CSS controls dimensions) ---
    const IC_COPY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    const IC_IMG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    const IC_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    const IC_LOAD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="deck-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;

    // --- Fetch image as blob, bypassing CORS via GM_xmlhttpRequest ---
    function gmFetchBlob(url) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest !== 'undefined') {
                GM_xmlhttpRequest({
                    method: 'GET', url, responseType: 'blob',
                    onload: r => resolve(r.response),
                    onerror: reject,
                    ontimeout: reject,
                });
            } else {
                fetch(url).then(r => r.blob()).then(resolve).catch(reject);
            }
        });
    }

    function blobToImg(blob) {
        return new Promise(resolve => {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
            img.src = url;
        });
    }

    // --- Convert any image blob to PNG (clipboard only accepts PNG reliably) ---
    function blobToPng(blob) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext('2d').drawImage(img, 0, 0);
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img load failed')); };
            img.src = url;
        });
    }

    // --- Remove adblock banner ---
    function removeBanner() {
        document.querySelectorAll('div').forEach(el => {
            if (
                el.textContent.includes('ad or script blocking software is interfering') ||
                el.textContent.includes('Disable any ad or script blocking software')
            ) el.remove();
        });
    }

    // --- Lightbox ---
    function createLightbox() {
        const overlay = document.createElement('div');
        overlay.id = 'deck-lightbox';
        const img = document.createElement('img');
        overlay.appendChild(img);
        const close = () => { overlay.style.display = 'none'; };
        overlay.addEventListener('click', close);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
        document.body.appendChild(overlay);
        return { open(src) { img.src = src; overlay.style.display = 'flex'; } };
    }

    // --- Copy decklist as text (icon-only button) ---
    function createCopyButton(getText) {
        const btn = document.createElement('button');
        btn.className = 'deck-copy-btn';
        btn.innerHTML = IC_COPY;
        btn.title = 'Copy decklist';
        btn.addEventListener('click', () => {
            const text = getText();
            const orig = btn.innerHTML;
            const flash = () => {
                btn.innerHTML = IC_CHECK;
                setTimeout(() => { btn.innerHTML = orig; }, 1200);
            };
            const fallback = () => {
                const ta = Object.assign(document.createElement('textarea'), { value: text });
                ta.style.cssText = 'position:fixed;opacity:0';
                document.body.appendChild(ta);
                ta.focus(); ta.select();
                try { if (document.execCommand('copy')) flash(); else throw 0; }
                catch { alert('Copy failed, please copy manually.'); }
                document.body.removeChild(ta);
            };
            navigator.clipboard?.writeText(text).then(flash).catch(fallback) ?? fallback();
        });
        return btn;
    }

    // --- Render deck card grid onto a canvas and return a PNG blob ---
    async function renderDeckImage(columns) {
        const CARD_W = 150;
        const CARD_H = 210;
        const LABEL_H = 22;
        const GAP = 6;
        const PAD = 14;
        const PER_ROW = columns.length <= 8 ? 4 : columns.length <= 15 ? 5 : 6;

        const images = await Promise.all(columns.map(async col => {
            const imgEl = col.querySelector('img');
            if (!imgEl) return null;
            try { return await blobToImg(await fetch(imgEl.src).then(r => r.blob())); }
            catch { return null; }
        }));

        const numRows = Math.ceil(columns.length / PER_ROW);
        const W = PAD * 2 + PER_ROW * CARD_W + (PER_ROW - 1) * GAP;
        const H = PAD * 2 + numRows * (CARD_H + LABEL_H) + (numRows - 1) * GAP;

        const dpr = window.devicePixelRatio || 1;
        const canvas = document.createElement('canvas');
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#0f0f0f';
        ctx.fillRect(0, 0, W, H);

        const roundedRect = (x, y, w, h, r) => {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.arcTo(x + w, y, x + w, y + r, r);
            ctx.lineTo(x + w, y + h - r);
            ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
            ctx.lineTo(x + r, y + h);
            ctx.arcTo(x, y + h, x, y + h - r, r);
            ctx.lineTo(x, y + r);
            ctx.arcTo(x, y, x + r, y, r);
            ctx.closePath();
        };

        columns.forEach((col, i) => {
            const cIdx = i % PER_ROW;
            const rIdx = Math.floor(i / PER_ROW);
            const x = PAD + cIdx * (CARD_W + GAP);
            const y = PAD + rIdx * (CARD_H + LABEL_H + GAP);
            const img = images[i];

            ctx.save();
            roundedRect(x, y, CARD_W, CARD_H, 6);
            ctx.clip();
            if (img) {
                ctx.drawImage(img, x, y, CARD_W, CARD_H);
            } else {
                ctx.fillStyle = '#2a2a2a';
                ctx.fillRect(x, y, CARD_W, CARD_H);
            }
            ctx.restore();

            ctx.fillStyle = '#111';
            ctx.fillRect(x, y + CARD_H, CARD_W, LABEL_H);
            ctx.font = 'bold 11px monospace';
            ctx.fillStyle = '#d4d4d4';
            ctx.textAlign = 'center';
            ctx.fillText(col.querySelector('.deck-card-label')?.textContent || '', x + CARD_W / 2, y + CARD_H + LABEL_H - 6);
        });

        ctx.textAlign = 'left';
        return new Promise(resolve => canvas.toBlob(resolve));
    }

    // --- Copy deck grid as image (icon-only button) ---
    function createCopyAsImageButton(getColumns) {
        const btn = document.createElement('button');
        btn.className = 'deck-copy-btn';
        btn.innerHTML = IC_IMG;
        btn.title = 'Copy deck as image';
        btn.addEventListener('click', async () => {
            if (btn.disabled) return;
            btn.innerHTML = IC_LOAD;
            btn.disabled = true;
            let success = false;
            try {
                // Pass a Promise to ClipboardItem so clipboard.write() is called
                // immediately (preserving user activation), while rendering happens async.
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': renderDeckImage(getColumns()) })
                ]);
                success = true;
            } catch (err) {
                console.error('[topdecks] clipboard.write failed:', err);
                alert('Clipboard copy failed: ' + err);
            }
            btn.innerHTML = success ? IC_CHECK : IC_IMG;
            btn.disabled = false;
            if (success) setTimeout(() => { btn.innerHTML = IC_IMG; }, 1800);
        });
        return btn;
    }

    // --- Per-card copy button (top-right overlay, visible on hover) ---
    function addCardCopyButton(col, imgEl) {
        const btn = document.createElement('button');
        btn.className = 'deck-card-copy-btn';
        btn.innerHTML = IC_COPY;
        btn.title = 'Copy card image';
        btn.addEventListener('click', async e => {
            e.stopPropagation();
            const orig = btn.innerHTML;
            btn.innerHTML = IC_LOAD;
            try {
                const rawBlob = await gmFetchBlob(imgEl.src);
                const pngBlob = await blobToPng(rawBlob);
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
                btn.innerHTML = IC_CHECK;
                setTimeout(() => { btn.innerHTML = orig; }, 1200);
            } catch (err) {
                console.error('[topdecks] card copy failed:', err);
                btn.innerHTML = orig;
                alert('Copy failed — try right-clicking the image.');
            }
        });
        col.appendChild(btn);
    }

    // --- CSS ---
    function expandLayout() {
        const style = document.createElement('style');
        style.textContent = `
            /* Layout */
            #secondary, .widget-area, aside.sidebar, .sidebar-container { display: none !important; }
            #primary, .content-area, #content, main#main { width: 100% !important; max-width: 100% !important; float: none !important; }
            .site-content, #site-content, .content-area { padding-right: 0 !important; margin-right: 0 !important; }
            .entry-content { max-width: 100% !important; }

            /* Card column */
            .deck-grid-col {
                position: relative;
                border-radius: 8px;
                overflow: hidden;
                background: #111;
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            .deck-grid-col:hover {
                transform: scale(1.06);
                box-shadow: 0 6px 22px rgba(0,0,0,0.5);
                z-index: 10;
            }
            .deck-grid-col img { display: block; width: 100%; cursor: zoom-in; }

            /* Per-card copy button */
            .deck-card-copy-btn {
                position: absolute;
                top: 5px; right: 5px;
                width: 28px; height: 28px;
                display: flex; align-items: center; justify-content: center;
                background: rgba(0,0,0,0.55);
                backdrop-filter: blur(3px);
                color: #fff;
                border: none; border-radius: 6px;
                cursor: pointer; opacity: 0; padding: 0;
                transition: opacity 0.15s, background 0.15s;
            }
            .deck-card-copy-btn svg { width: 13px; height: 13px; }
            .deck-grid-col:hover .deck-card-copy-btn { opacity: 1; }
            .deck-card-copy-btn:hover { background: rgba(0,0,0,0.82); }

            /* Card label */
            .deck-card-label {
                font-family: ui-monospace, 'Cascadia Code', 'Fira Mono', monospace;
                font-size: 15px; font-weight: 700;
                text-align: center; padding: 5px 4px 4px;
                background: #111; color: #d4d4d4; letter-spacing: 0.4px;
            }

            /* Action button row */
            .deck-btn-row { display: flex; gap: 8px; align-items: center; margin: 8px 0; }
            .deck-copy-btn {
                display: inline-flex; align-items: center; justify-content: center;
                width: 34px; height: 34px;
                background: #1d6fcc; color: #fff;
                border: none; border-radius: 8px;
                cursor: pointer; padding: 0;
                transition: background 0.15s, transform 0.1s;
            }
            .deck-copy-btn svg { width: 16px; height: 16px; }
            .deck-copy-btn:hover { background: #1558a8; }
            .deck-copy-btn:active { transform: scale(0.93); }
            .deck-copy-btn:disabled { opacity: 0.6; cursor: default; }

            /* Spinner animation */
            @keyframes deck-spin { to { transform: rotate(360deg); } }
            .deck-spin { animation: deck-spin 0.9s linear infinite; transform-origin: center; }

            /* Decklist text box */
            .deck-text-section { margin-top: 20px; }
            .deck-text-header {
                font-size: 11px; font-weight: 700;
                text-transform: uppercase; letter-spacing: 1.2px;
                color: #999; margin-bottom: 6px;
                font-family: system-ui, sans-serif;
            }
            .deck-text-box {
                padding: 12px 16px;
                background: #f7f7f7; border: 1px solid #e0e0e0; border-radius: 8px;
                font-family: ui-monospace, 'Cascadia Code', 'Fira Mono', monospace;
                font-size: 12.5px; line-height: 1.65;
                white-space: pre-wrap; color: #2a2a2a;
            }

            /* Info banner */
            .deck-info-banner {
                display: inline-flex; flex-wrap: nowrap; gap: 0;
                background: #18181b; border-radius: 10px;
                margin-bottom: 18px; overflow: hidden;
                border: 1px solid #2e2e35;
            }
            .deck-info-item {
                display: flex; flex-direction: column; gap: 3px;
                padding: 10px 16px; flex: 0 0 auto;
            }
            .deck-info-item + .deck-info-item {
                border-left: 1px solid #2e2e35;
            }
            .deck-info-label {
                font-size: 9px; font-weight: 700;
                text-transform: uppercase; letter-spacing: 1px;
                color: #71717a; font-family: system-ui, sans-serif;
                white-space: nowrap;
            }
            .deck-info-value {
                font-size: 13px; font-weight: 600;
                color: #f4f4f5; font-family: system-ui, sans-serif;
                line-height: 1.3;
            }

            /* Lightbox */
            #deck-lightbox {
                display: none; position: fixed; inset: 0;
                background: rgba(0,0,0,0.88);
                z-index: 99999; align-items: center; justify-content: center; cursor: zoom-out;
            }
            #deck-lightbox img {
                max-width: 90vw; max-height: 90vh;
                border-radius: 12px; box-shadow: 0 8px 48px rgba(0,0,0,0.9);
            }
        `;
        document.head.appendChild(style);
    }

    // --- Collapse the non-content sidebar column using DOM traversal ---
    function collapsePageColumns() {
        const gallery = document.querySelector('#media-gallery');
        if (!gallery) return;
        // Walk up from the gallery looking for a flex/grid container with siblings
        let node = gallery.parentElement;
        while (node && node !== document.body) {
            const parent = node.parentElement;
            if (!parent || parent === document.body) break;
            const pStyle = getComputedStyle(parent);
            const kids = [...parent.children];
            if (kids.length >= 2 && (pStyle.display === 'flex' || pStyle.display === 'grid')) {
                // node is the content column — hide its siblings, expand to full width
                kids.forEach(k => { if (k !== node) k.style.display = 'none'; });
                Object.assign(node.style, { width: '100%', maxWidth: '100%', flex: '0 0 100%' });
                parent.style.display = 'block';
                // keep walking — there may be more nested flex containers above
            }
            node = parent;
        }
    }

    // --- Parse "NxCODE" lines from text decklist ---
    function parseDecklist(text) {
        return text.split('\n').reduce((acc, line) => {
            const m = line.match(/^(\d+)x([A-Z]{1,3}\d{2}-\d+)/i);
            if (m) acc.push({ count: +m[1], code: m[2].toUpperCase() });
            return acc;
        }, []);
    }

    // --- Replace xN label with styled badge ---
    function setColumnLabel(col, text) {
        const walker = document.createTreeWalker(col, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            if (/^\s*x\d+\s*$/i.test(node.textContent)) node.textContent = '';
        }
        for (const el of col.querySelectorAll('p, span, div, b, strong')) {
            if (/^\s*x\d+\s*$/i.test(el.textContent)) el.style.display = 'none';
        }
        const label = document.createElement('div');
        label.className = 'deck-card-label';
        label.textContent = text;
        col.appendChild(label);
    }

    // --- Rework .innerblocks-wrap: extract info, nuke cruft, return banner element ---
    // Returns a .deck-info-banner div (or null) to be injected into the gallery by the caller.
    function reworkTopInfo() {
        const allWraps = [...document.querySelectorAll('.innerblocks-wrap')];
        const galleryWrap = allWraps.find(w => w.querySelector('#media-gallery'));

        // Collect key-value pairs from ALL wraps (author/date/etc. may live in sibling blocks)
        const clean = s => s.replace(/\s+/g, ' ').trim();
        const items = [];
        const seen = new Set();
        allWraps.forEach(wrap => {
            wrap.innerHTML
                .replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/gi, ' ').replace(/<[^>]+>/g, '')
                .split('\n').forEach(line => {
                    const m = clean(line).match(/^([A-Za-z][A-Za-z /]{1,30}?)\s*:\s*(.{1,200})$/);
                    if (!m) return;
                    const key = clean(m[1]), val = clean(m[2]);
                    const keyLow = key.toLowerCase();
                    if (key && val && !seen.has(keyLow) && !/^total/.test(keyLow)) {
                        seen.add(keyLow);
                        items.push({ label: key, value: val });
                    }
                });
        });

        // Remove non-gallery wraps; if their parent becomes empty, remove that too
        allWraps.forEach(wrap => {
            if (wrap === galleryWrap) return;
            const parent = wrap.parentElement;
            wrap.remove();
            if (parent && parent !== document.body && parent.children.length === 0) parent.remove();
        });

        // Wipe galleryWrap and re-append only the gallery (banner goes into gallery below)
        if (galleryWrap) {
            const gallery = galleryWrap.querySelector('#media-gallery');
            galleryWrap.innerHTML = '';
            if (gallery) galleryWrap.appendChild(gallery);
        }

        if (items.length === 0) return null;

        const banner = document.createElement('div');
        banner.className = 'deck-info-banner';
        items.forEach(({ label, value }) => {
            const item = document.createElement('div');
            item.className = 'deck-info-item';
            const lbl = document.createElement('span'); lbl.className = 'deck-info-label'; lbl.textContent = label;
            const val = document.createElement('span'); val.className = 'deck-info-value'; val.textContent = value;
            item.appendChild(lbl); item.appendChild(val);
            banner.appendChild(item);
        });
        return banner;
    }

    // ======= MAIN =======

    removeBanner();
    new MutationObserver(removeBanner).observe(document.body, { childList: true, subtree: true });

    expandLayout();
    collapsePageColumns();

    const lightbox = createLightbox();

    document.getElementById('page')?.classList.remove('site');
    document.getElementById('masthead')?.classList.remove('site-header');
    document.querySelector('.post-thumbnail')?.remove();
    document.querySelector('.entry-header')?.remove();
    document.querySelector('.wp-block-code')?.remove();
    document.querySelector('.solid')?.remove();

    const infoBanner = reworkTopInfo();

    const gallery = document.getElementById('media-gallery');
    if (!gallery) return;

    const html = gallery.innerHTML;
    const splitIdx = html.indexOf('Decklist in text:');
    const imagesHtml = splitIdx !== -1 ? html.slice(0, splitIdx) : html;
    const rawText = splitIdx !== -1 ? html.slice(splitIdx + 'Decklist in text:'.length) : '';

    const textBelow = rawText
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .split('\n').map(l => l.trim()).filter(l => l && !/^total\b/i.test(l))
        .join('\n').replace(/\n{2,}/g, '\n');

    const deckEntries = parseDecklist(textBelow);

    const temp = document.createElement('div');
    temp.innerHTML = imagesHtml;
    const columns = Array.from(temp.querySelectorAll('.column'));

    columns.forEach((col, i) => {
        const entry = deckEntries[i];
        if (entry) setColumnLabel(col, `${entry.count}x${entry.code}`);
        col.classList.add('deck-grid-col');
        col.style.cssText = 'flex:0 1 150px;margin:0';

        const imgEl = col.querySelector('img');
        if (imgEl) {
            imgEl.addEventListener('click', e => {
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) { window.open(imgEl.src, '_blank'); return; }
                lightbox.open(imgEl.src);
            });
            imgEl.addEventListener('auxclick', e => {
                if (e.button === 1) { e.preventDefault(); window.open(imgEl.src, '_blank'); }
            });
            addCardCopyButton(col, imgEl);
        }
    });

    gallery.innerHTML = '';

    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:center';
    columns.forEach(col => grid.appendChild(col));

    const getText = () => textBelow;
    const getColumns = () => columns;

    const makeBtnRow = () => {
        const row = document.createElement('div');
        row.className = 'deck-btn-row';
        row.appendChild(createCopyButton(getText));
        row.appendChild(createCopyAsImageButton(getColumns));
        return row;
    };

    if (infoBanner) gallery.appendChild(infoBanner);
    gallery.appendChild(makeBtnRow());
    gallery.appendChild(grid);
    gallery.appendChild(makeBtnRow());

    const textSection = document.createElement('div');
    textSection.className = 'deck-text-section';
    const textHeader = document.createElement('div');
    textHeader.className = 'deck-text-header';
    textHeader.textContent = 'Decklist';
    const textDiv = document.createElement('div');
    textDiv.className = 'deck-text-box';
    textDiv.textContent = textBelow;
    textSection.appendChild(textHeader);
    textSection.appendChild(textDiv);
    gallery.appendChild(textSection);

})();
