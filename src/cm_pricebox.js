// -*- coding: utf-8 -*-
// ------------------------------------------------------------------------
//+ Authors: 	Ran#
//+ Created:	2025/11/26 11:03:22.000000
//+ Revised:	2026/03/12 12:46:06.500373
// ------------------------------------------------------------------------

// ==UserScript==
// @name         CardMarket PriceBox
// @namespace    Violentmonkey Scripts
// @version      1.7.8
// @description  Floating draggable widget showing min price from World and Spain, always aligned with Price Trend row but placed in the empty right margin area (night mode, dual-language Spain detection, toggleable, copy-as-image includes card art)
// @author       Ran# <ran.hash@proton.me>
// @match        https://www.cardmarket.com/es/*/Products/Singles/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cardmarket.com
// @grant        GM_xmlhttpRequest
// @connect      product-images.s3.cardmarket.com
// @license      GPLv3
// @homepageURL  https://github.com/Ran-n/monke/blob/main/src/cm_pricebox.js
// @downloadURL  https://raw.githubusercontent.com/Ran-n/monke/main/src/cm_pricebox.js
// @updateURL    https://raw.githubusercontent.com/Ran-n/monke/main/src/cm_pricebox.js
// ==/UserScript==

(function () {
    'use strict';

    // ─── Constants ────────────────────────────────────────────────────────────

    const SYMBOL_MONEY = '€';
    const WINDOW_SCALE = 0.9;
    const WINDOW_HEIGHT_OFFSET = 57;
    const WINDOW_WIDTH_OFFSET = 165;
    const WIDGET_VISIBILITY_KEY = 'OPTCG_CM_PRICEBOX_VISIBILITY';
    const WIDGET_POSITION_KEY   = 'OPTCG_CM_PRICEBOX_POS';

    // flagCode: ISO 3166-1 alpha-2 for flagcdn.com; omit for emoji-only entries
    const COUNTRIES = [
        { flagEmoji: '🌍',  key: 'minWorld',   color: '#90ee90', label: 'World',   labelES: 'World'    },
        { flagCode:  'es',  key: 'minSpain',   color: '#87cefa', label: 'Spain',   labelES: 'España'   },
        { flagCode:  'de',  key: 'minGermany', color: '#87cefa', label: 'Germany', labelES: 'Alemania' },
        { flagCode:  'pt',  key: 'minPortugal',color: '#87cefa', label: 'Portugal',labelES: 'Portugal' },
        { flagCode:  'fr',  key: 'minFrance',  color: '#87cefa', label: 'France',  labelES: 'Francia'  },
        { flagCode:  'it',  key: 'minItaly',   color: '#87cefa', label: 'Italy',   labelES: 'Italia'   },
    ];

    const ICONS = {
        refresh:    '↻',
        refreshing: '⟳',
        copyTxt:    '📋',
        copy:       '📷',
        ok:         '✔️',
        ko:         '❌',
        eyeOpen:  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#eee" viewBox="0 0 24 24"><path d="M12 5c-7.633 0-11 7-11 7s3.367 7 11 7 11-7 11-7-3.367-7-11-7zm0 12c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5zm0-8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"/></svg>`,
        eyeSlash: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#eee" viewBox="0 0 24 24"><path d="M12 5c-7.633 0-11 7-11 7s3.367 7 11 7 11-7 11-7-3.367-7-11-7zm0 12c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5zm0-8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"/><line x1="4" y1="20" x2="20" y2="4" stroke="#eee" stroke-width="2"/></svg>`,
    };

    // ─── Flag rendering ────────────────────────────────────────────────────────

    // Use flagcdn.com images for country flags so they render correctly in
    // Chromium on Windows (which doesn't support Regional Indicator emoji pairs).
    const flagHtml = (country) =>
        country.flagCode
            ? `<img src="https://flagcdn.com/16x12/${country.flagCode}.png" width="16" height="12" style="vertical-align:middle;">`
            : `<span style="vertical-align:middle;">${country.flagEmoji}</span>`;

    // Pre-fetch flag images as base64 data URLs so SVG foreignObject can embed
    // them (Chromium blocks external URLs in SVG blob contexts).
    const _flagDataUrlCache = {};
    const getFlagDataUrl = async (code) => {
        if (_flagDataUrlCache[code]) return _flagDataUrlCache[code];
        try {
            const resp = await fetch(`https://flagcdn.com/16x12/${code}.png`);
            const blob = await resp.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => { _flagDataUrlCache[code] = reader.result; resolve(reader.result); };
                reader.readAsDataURL(blob);
            });
        } catch { return null; }
    };

    // Load the main card image via GM_xmlhttpRequest (bypasses CORS on S3 origin)
    // then create an object URL so the canvas doesn't get tainted.
    // Try multiple selectors; always require an S3 URL (never the placeholder).
    const getCardImage = () => {
        const S3 = 'product-images.s3.cardmarket.com';
        const els = [
            document.querySelector(`img.is-front:not(.lazy)`),  // current slide (already loaded)
            document.querySelector('img.is-front'),
            document.querySelector(`img[data-echo*="${S3}"]`),
            document.querySelector(`img[src*="${S3}"]`),
        ];
        let src = null;
        for (const el of els) {
            if (!el) continue;
            const s = el.dataset.echo || el.src;
            if (s?.includes(S3)) { src = s; break; }
        }
        if (!src) return Promise.resolve(null);
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET', url: src, responseType: 'blob',
                onload: (resp) => {
                    const url = URL.createObjectURL(resp.response);
                    const img = new Image();
                    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
                    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
                    img.src = url;
                },
                onerror: () => resolve(null),
            });
        });
    };

    // ─── Price extraction ──────────────────────────────────────────────────────

    // European locale: thousands separator = '.' decimal separator = ','
    // e.g. "1.500,00 €" must parse to 1500.00, not 1.50
    const _extractPrice = (row) => {
        const span = row.querySelector('.price-container span');
        if (!span) return 'N/A';
        const raw = span.textContent.trim()
            .replace(SYMBOL_MONEY, '')
            .trim()
            .replace(/\./g, '')   // strip thousands-separator dots
            .replace(',', '.');   // replace decimal comma with dot
        const price = parseFloat(raw);
        return isNaN(price) ? 'N/A' : price.toFixed(2);
    };

    const extractMinimumPriceWorld = (rows) => _extractPrice(rows[0]);

    const extractMinimumPricesByCountry = (rows) => {
        const prices = {};
        const found = new Set();

        for (const row of rows) {
            for (const { key, label, labelES } of COUNTRIES) {
                if (key === 'minWorld' || found.has(key)) continue;

                const icons = row.querySelectorAll('.icon[aria-label]');
                const match = Array.from(icons).some(el => {
                    const text = el.getAttribute('aria-label');
                    return text === `Item location: ${label}` || text === `Ubicación del artículo: ${labelES}`;
                });

                if (match) {
                    const price = _extractPrice(row);
                    if (price !== 'N/A') {
                        prices[key] = price;
                        found.add(key);
                    }
                }
            }
            if (found.size >= COUNTRIES.length - 1) break;
        }

        for (const { key } of COUNTRIES) {
            if (key !== 'minWorld' && !(key in prices)) prices[key] = 'N/A';
        }

        return prices;
    };

    const extractPrices = (rows) => ({
        minWorld: extractMinimumPriceWorld(rows),
        ...extractMinimumPricesByCountry(rows),
    });

    // ─── DOM helpers ──────────────────────────────────────────────────────────

    const getUserNCredit = () => {
        const container = document.querySelector('#totalCreditMainNav')?.parentElement;
        return {
            name:   container?.querySelector('.d-none.d-lg-block')?.textContent.trim(),
            credit: container?.querySelector('#totalCreditMainNav')?.textContent.trim(),
        };
    };

    const getSellerName = (row) =>
        row?.querySelector('.seller-name a')?.textContent.trim() ?? null;

    const getProductNameParts = () => {
        const h1 = document.querySelector('h1');
        return {
            mainTitle: h1?.childNodes[0]?.textContent?.trim() ?? 'Product',
            subtitle:  h1?.querySelector('span.h4.text-muted')?.textContent?.trim() ?? '',
        };
    };

    const findPriceTrendDd = () => {
        const dl = document.querySelector('dl.labeled');
        const dts = Array.from(dl?.querySelectorAll('dt') ?? []);
        const dds = Array.from(dl?.querySelectorAll('dd') ?? []);
        for (let i = 0; i < dts.length; i++) {
            const label = dts[i].textContent.trim();
            if (label === 'Price Trend' || label === 'Tendencia de precio') return dds[i];
        }
        return null;
    };

    const isLoadMoreActive = () => {
        const btn = document.querySelector('#loadMoreButton');
        if (!btn) return false;
        const style = window.getComputedStyle(btn);
        const hidden = style.display === 'none' || style.visibility === 'hidden' || btn.offsetParent === null;
        const disabled = btn.disabled || btn.getAttribute('disabled') !== null || btn.classList.contains('disabled');
        return !(hidden || disabled);
    };

    const waitForRows = () => new Promise(resolve => {
        const check = () => {
            const nodeList = document.querySelectorAll('.article-row');
            if (nodeList.length > 0) {
                const rows = Array.from(nodeList);
                const { name: ownerName } = getUserNCredit();
                if (getSellerName(rows[0]) === ownerName) rows.splice(0, 1);
                setTimeout(() => resolve(rows), 600);
            } else {
                setTimeout(check, 400);
            }
        };
        check();
    });

    // ─── Clipboard helpers ────────────────────────────────────────────────────

    async function copyTextToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            return false;
        }
    }

    // Draw prices directly to a canvas (avoids SVG foreignObject which is
    // unreliable in Chromium and Firefox for HTML-with-images rendering).
    async function drawPricesToCanvas(p, title, sub, cardImg) {
        const PAD = 14, W = 320, SCALE = 2, FONT = 'Arial';
        const LINE_H = 20, ROW_H = 22, DIV_H = 9;
        const CARD_MAX_W = W - PAD * 2, CARD_MAX_H = 200;
        const now = new Date().toLocaleString();
        const url = location.href;

        // Load flag images from cached data URLs
        const flagImgs = await Promise.all(COUNTRIES.map(async (c) => {
            if (!c.flagCode) return null;
            const dataUrl = await getFlagDataUrl(c.flagCode);
            if (!dataUrl) return null;
            return new Promise((res) => {
                const img = new Image();
                img.onload = () => res(img);
                img.onerror = () => res(null);
                img.src = dataUrl;
            });
        }));

        // Compute card image draw dimensions (preserve aspect ratio)
        let cardDrawW = 0, cardDrawH = 0;
        if (cardImg) {
            const ratio = cardImg.naturalWidth / cardImg.naturalHeight;
            cardDrawH = Math.min(CARD_MAX_H, cardImg.naturalHeight);
            cardDrawW = cardDrawH * ratio;
            if (cardDrawW > CARD_MAX_W) { cardDrawW = CARD_MAX_W; cardDrawH = cardDrawW / ratio; }
        }
        const cardSectionH = cardImg ? cardDrawH + DIV_H + 8 : 0;

        const numericValues = COUNTRIES.map(c => parseFloat(p[c.key])).filter(v => !isNaN(v));
        const minVal = numericValues.length ? Math.min(...numericValues) : 0;

        // Measure URL wrapping before creating the canvas
        const measureCtx = document.createElement('canvas').getContext('2d');
        measureCtx.font = `11px ${FONT}`;
        const maxLineW = W - PAD * 2;
        let urlLineCount = 1, urlLine = '';
        for (const ch of url) {
            if (measureCtx.measureText(urlLine + ch).width > maxLineW) { urlLineCount++; urlLine = ch; }
            else urlLine += ch;
        }

        const totalH = PAD + LINE_H + (sub ? LINE_H : 0) + DIV_H
            + cardSectionH
            + COUNTRIES.length * ROW_H + DIV_H + LINE_H + urlLineCount * LINE_H + PAD;

        const canvas = document.createElement('canvas');
        canvas.width  = W * SCALE;
        canvas.height = totalH * SCALE;
        const ctx = canvas.getContext('2d');
        ctx.scale(SCALE, SCALE);

        // Background + border
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, W, totalH);
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, W - 1, totalH - 1);

        let y = PAD;
        const drawDivider = () => {
            y += 4;
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
            y += 5;
        };

        // Title
        ctx.font = `bold 15px ${FONT}`; ctx.fillStyle = '#dddddd';
        ctx.fillText(title, PAD, y + 15); y += LINE_H;

        // Subtitle
        if (sub) {
            ctx.font = `12px ${FONT}`; ctx.fillStyle = '#bbbbbb';
            ctx.fillText(sub, PAD, y + 12); y += LINE_H;
        }

        drawDivider();

        // Card image (centered)
        if (cardImg) {
            const imgX = PAD + (CARD_MAX_W - cardDrawW) / 2;
            ctx.drawImage(cardImg, imgX, y + 4, cardDrawW, cardDrawH);
            y += cardDrawH + 8;
            drawDivider();
        }

        // Country rows
        for (let i = 0; i < COUNTRIES.length; i++) {
            const c = COUNTRIES[i];
            const val = parseFloat(p[c.key]);
            const price = p[c.key] ?? 'N/A';
            let pctText = '', pctColor = '#aaa';
            if (!isNaN(val) && minVal > 0 && c.label !== 'World') {
                const diff = ((val - minVal) / minVal) * 100;
                pctText = `(+${diff.toFixed(2)}%)`;
                pctColor = getColorForPct(diff);
            }

            const midY = y + ROW_H / 2;
            let x = PAD;

            if (flagImgs[i]) { ctx.drawImage(flagImgs[i], x, midY - 6, 16, 12); }
            else { ctx.font = `13px ${FONT}`; ctx.fillStyle = '#888'; ctx.fillText(c.flagEmoji || '', x, midY + 5); }
            x += 22;

            const priceStr = `${price}${SYMBOL_MONEY}`;
            ctx.font = `bold 13px ${FONT}`; ctx.fillStyle = c.color;
            ctx.fillText(priceStr, x, midY + 5); x += ctx.measureText(priceStr).width + 8;

            ctx.font = `13px ${FONT}`; ctx.fillStyle = '#888888';
            ctx.fillText(c.label, x, midY + 5); x += ctx.measureText(c.label).width + 8;

            if (pctText) { ctx.font = `11px ${FONT}`; ctx.fillStyle = pctColor; ctx.fillText(pctText, x, midY + 5); }

            y += ROW_H;
        }

        drawDivider();

        // Timestamp
        ctx.font = `11px ${FONT}`; ctx.fillStyle = '#999999';
        ctx.fillText(now, PAD, y + 11); y += LINE_H;

        // URL (wrapped)
        ctx.font = `11px ${FONT}`; ctx.fillStyle = '#999999';
        let line = '';
        for (const ch of url) {
            if (ctx.measureText(line + ch).width > maxLineW) { ctx.fillText(line, PAD, y + 11); y += LINE_H; line = ch; }
            else line += ch;
        }
        if (line) ctx.fillText(line, PAD, y + 11);

        return canvas;
    }

    // ─── Widget placement ─────────────────────────────────────────────────────

    // Try to insert the widget inline in the page flow, directly above the
    // article/offers table. Returns true if successful.
    const tryInsertInline = (widget) => {
        const table = document.querySelector('.article-row')?.closest('table');
        if (!table) return false;
        const insertBefore = table.closest('section, .table-responsive') ?? table.parentElement;
        if (!insertBefore?.parentElement) return false;

        Object.assign(widget.style, {
            position: 'relative', zIndex: '', transform: '', transformOrigin: '',
            width: '100%', maxWidth: '', marginBottom: '12px', cursor: '',
        });
        insertBefore.parentElement.insertBefore(widget, insertBefore);
        return true;
    };

    // Make the widget draggable (used as fallback when inline insertion fails).
    // Saves and restores position via localStorage.
    const enableDrag = (widget) => {
        const saved = JSON.parse(localStorage.getItem(WIDGET_POSITION_KEY) || 'null');
        if (saved) { widget.style.top = `${saved.top}px`; widget.style.left = `${saved.left}px`; }

        widget.style.cursor = 'grab';
        let dragging = false, ox = 0, oy = 0;

        widget.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            dragging = true;
            ox = e.clientX - widget.getBoundingClientRect().left;
            oy = e.clientY - widget.getBoundingClientRect().top;
            widget.style.cursor = 'grabbing';
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            widget.style.left = `${window.scrollX + e.clientX - ox}px`;
            widget.style.top  = `${window.scrollY + e.clientY - oy}px`;
        });
        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            widget.style.cursor = 'grab';
            localStorage.setItem(WIDGET_POSITION_KEY, JSON.stringify({
                top:  parseInt(widget.style.top),
                left: parseInt(widget.style.left),
            }));
        });
    };

    // ─── Colour helper ────────────────────────────────────────────────────────

    const getColorForPct = (pct) => {
        if (pct <= 0) return '#aaa';
        const clamped = Math.min(pct, 200);
        const stops = [
            { pct: 0,   r: 170, g: 170, b: 170 },
            { pct: 100, r: 255, g: 165, b: 0   },
            { pct: 200, r: 255, g: 0,   b: 0   },
        ];
        const [start, end] = clamped > 100 ? [stops[1], stops[2]] : [stops[0], stops[1]];
        const t = (clamped - start.pct) / (end.pct - start.pct);
        const lerp = (a, b) => Math.round(a + (b - a) * t);
        return `rgb(${lerp(start.r, end.r)},${lerp(start.g, end.g)},${lerp(start.b, end.b)})`;
    };

    // ─── Button factory ───────────────────────────────────────────────────────

    const makeButton = (innerHTML, title = '') => {
        const btn = document.createElement('button');
        btn.innerHTML = innerHTML;
        btn.title = title;
        Object.assign(btn.style, {
            background: '#333', color: '#eee', border: '1px solid #555',
            borderRadius: '4px', padding: '0', cursor: 'pointer',
            fontSize: '14px', width: '28px', height: '28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: '0',
        });
        return btn;
    };

    // ─── Widget ───────────────────────────────────────────────────────────────

    const createFloatingWidget = (prices) => {
        const { mainTitle, subtitle } = getProductNameParts();

        // Outer shell — width:max-content so price rows never clip,
        // capped at 300px so very long titles don't blow up the layout.
        const widget = document.createElement('div');
        Object.assign(widget.style, {
            position:        'absolute',
            zIndex:          '9999',
            background:      '#1e1e1e',
            border:          '1px solid #444',
            borderRadius:    '6px',
            padding:         '8px 10px',
            boxShadow:       '0 2px 8px rgba(0,0,0,0.4)',
            fontSize:        '13px',
            lineHeight:      '1.4',
            fontFamily:      'Arial, sans-serif',
            color:           '#f0f0f0',
            width:           'max-content',
            maxWidth:        '300px',
            transform:       `scale(${WINDOW_SCALE})`,
            transformOrigin: 'top left',
        });

        // Buttons
        const toggleBtn   = makeButton(ICONS.eyeOpen, 'Toggle visibility');
        const refreshBtn  = makeButton(ICONS.refresh,  'Refresh prices');
        const copyTxtBtn  = makeButton(ICONS.copyTxt,  'Copy info as text');
        const copyBtn     = makeButton(ICONS.copy,     'Copy info as image');
        refreshBtn.style.marginLeft = '6px';
        copyTxtBtn.style.marginLeft = '6px';
        copyBtn.style.marginLeft    = '6px';

        const headerBar = document.createElement('div');
        Object.assign(headerBar.style, { display: 'flex', alignItems: 'center' });
        headerBar.append(toggleBtn, refreshBtn, copyTxtBtn, copyBtn);

        const content = document.createElement('div');
        content.className = 'widget-content';
        content.style.marginTop = '4px';

        // ── Render content ──────────────────────────────────────────────────

        const renderContent = (p) => {
            const numericValues = COUNTRIES.map(c => parseFloat(p[c.key])).filter(v => !isNaN(v));
            const minVal = numericValues.length ? Math.min(...numericValues) : 0;

            // 2-column grid; each cell stacks the price on top and % below.
            const cellsHTML = COUNTRIES.map((c) => {
                const val = parseFloat(p[c.key]);
                let pctHtml = '';
                if (!isNaN(val) && minVal > 0 && c.label !== 'World') {
                    const diff = ((val - minVal) / minVal) * 100;
                    pctHtml = `<div style="color:${getColorForPct(diff)};font-size:11px;margin-top:1px;">(+${diff.toFixed(2)}%)</div>`;
                }
                return `
                    <div style="white-space:nowrap;">
                      <span style="display:inline-flex;align-items:center;gap:4px;color:#888;">
                        ${flagHtml(c)}&nbsp;<span style="color:${c.color};">${p[c.key]}</span><span>${SYMBOL_MONEY}</span>
                      </span>
                      ${pctHtml}
                    </div>`;
            }).join('');

            content.innerHTML = `
                <div style="margin-bottom:6px;max-width:280px;word-break:break-word;">
                  <div><strong style="color:#ccc">${mainTitle}</strong></div>
                  ${subtitle ? `<div style="color:#777;font-size:12px;margin-top:2px;">${subtitle}</div>` : ''}
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;">${cellsHTML}</div>`;
        };

        // ── Visibility state ────────────────────────────────────────────────

        const savedState = localStorage.getItem(WIDGET_VISIBILITY_KEY);
        const isVisible  = savedState === null || savedState === 'visible';

        const applyVisibility = (visible) => {
            content.style.display       = visible ? 'block'       : 'none';
            toggleBtn.innerHTML         = visible ? ICONS.eyeOpen : ICONS.eyeSlash;
            copyTxtBtn.style.display    = visible ? 'flex'        : 'none';
            copyBtn.style.display       = visible ? 'flex'        : 'none';
            if (refreshBtn.dataset.permaHidden !== 'true')
                refreshBtn.style.display = visible ? 'flex' : 'none';
        };

        applyVisibility(isVisible);
        renderContent(prices);

        // ── Toggle ──────────────────────────────────────────────────────────

        toggleBtn.onclick = () => {
            const nowVisible = content.style.display === 'none';
            applyVisibility(nowVisible);
            localStorage.setItem(WIDGET_VISIBILITY_KEY, nowVisible ? 'visible' : 'hidden');
        };

        // ── Refresh ─────────────────────────────────────────────────────────

        const hideRefreshIfDone = () => {
            if (!isLoadMoreActive()) {
                refreshBtn.style.display    = 'none';
                refreshBtn.dataset.permaHidden = 'true';
            }
        };

        hideRefreshIfDone();

        refreshBtn.onclick = async () => {
            if (!isLoadMoreActive()) { hideRefreshIfDone(); return; }

            refreshBtn.disabled = true;
            refreshBtn.innerHTML = ICONS.refreshing;
            refreshBtn.style.opacity = '0.6';

            const rows = await waitForRows();
            renderContent(extractPrices(rows));

            document.querySelector('#loadMoreButton')?.click();

            refreshBtn.disabled = false;
            refreshBtn.innerHTML = ICONS.refresh;
            refreshBtn.style.opacity = '1';
            setTimeout(hideRefreshIfDone, 250);
        };

        // ── Copy as text ────────────────────────────────────────────────────

        copyTxtBtn.onclick = async () => {
            copyTxtBtn.disabled = true;
            try {
                const rows = await waitForRows();
                const p = extractPrices(rows);
                const numericValues = COUNTRIES.map(c => parseFloat(p[c.key])).filter(v => !isNaN(v));
                const minVal = numericValues.length ? Math.min(...numericValues) : 0;

                const lines = [
                    mainTitle,
                    ...(subtitle ? [subtitle] : []),
                    '',
                    ...COUNTRIES.map(c => {
                        const val = parseFloat(p[c.key]);
                        let pct = '';
                        if (!isNaN(val) && minVal > 0 && c.label !== 'World') {
                            const diff = ((val - minVal) / minVal) * 100;
                            pct = ` (+${diff.toFixed(2)}%)`;
                        }
                        return `${c.label}: ${p[c.key]}${SYMBOL_MONEY}${pct}`;
                    }),
                    '',
                    location.href,
                ];
                const ok = await copyTextToClipboard(lines.join('\n'));
                copyTxtBtn.textContent = ok ? ICONS.ok : ICONS.ko;
            } catch {
                copyTxtBtn.textContent = ICONS.ko;
            } finally {
                setTimeout(() => { copyTxtBtn.innerHTML = ICONS.copyTxt; copyTxtBtn.disabled = false; }, 1200);
            }
        };

        // ── Copy as image ───────────────────────────────────────────────────

        copyBtn.onclick = async () => {
            copyBtn.disabled = true;
            try {
                // Build the blob asynchronously but pass the Promise directly to
                // ClipboardItem so clipboard.write() is called within the user
                // gesture — avoids gesture-expiry errors from the async delays.
                const blobPromise = (async () => {
                    const [rows, cardImg] = await Promise.all([waitForRows(), getCardImage()]);
                    const p = extractPrices(rows);
                    const canvas = await drawPricesToCanvas(p, mainTitle, subtitle, cardImg);
                    return new Promise(res => canvas.toBlob(res, 'image/png'));
                })();
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
                copyBtn.textContent = ICONS.ok;
            } catch (e) {
                console.error('[PriceBox] copy as image failed:', e);
                copyBtn.textContent = ICONS.ko;
            } finally {
                setTimeout(() => { copyBtn.innerHTML = ICONS.copy; copyBtn.disabled = false; }, 1200);
            }
        };

        // ── Positioning ─────────────────────────────────────────────────────

        widget.append(headerBar, content);
        document.body.appendChild(widget);

        if (!tryInsertInline(widget)) {
            // Inline insertion failed — use draggable floating widget.
            // Set a sensible default position if none is saved.
            if (!localStorage.getItem(WIDGET_POSITION_KEY)) {
                const dd = findPriceTrendDd();
                if (dd) {
                    const rect = dd.getBoundingClientRect();
                    widget.style.top  = `${window.scrollY + rect.top  - WINDOW_HEIGHT_OFFSET}px`;
                    widget.style.left = `${window.scrollX + rect.right - WINDOW_WIDTH_OFFSET}px`;
                }
            }
            enableDrag(widget);
        }
    };

    // ─── Entry point ──────────────────────────────────────────────────────────

    waitForRows().then(rows => createFloatingWidget(extractPrices(rows)));
})();
