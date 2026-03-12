// -*- coding: utf-8 -*-
// ------------------------------------------------------------------------
//+ Authors: 	Ran#
//+ Created:	2025/11/26 11:03:22.000000
//+ Revised:	2026/03/12 09:05:36.431228
// ------------------------------------------------------------------------

// ==UserScript==
// @name         CardMarket PriceBox
// @namespace    Violentmonkey Scripts
// @version      1.3.1
// @description  Floating draggable widget showing min price from World and Spain, always aligned with Price Trend row but placed in the empty right margin area (night mode, dual-language Spain detection, toggleable)
// @author       Ran# <ran.hash@proton.me>
// @match        https://www.cardmarket.com/es/*/Products/Singles/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cardmarket.com
// @grant        none
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

    async function copyHtmlToPngBlob(html, width, height, scale = 2) {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width)}" height="${Math.round(height)}">
              <foreignObject width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml">
                  <style>body,html{margin:0;padding:0;}*{box-sizing:border-box;font-family:Arial,sans-serif;}</style>
                  ${html}
                </div>
              </foreignObject>
            </svg>`;
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
        try {
            const img = await new Promise((resolve, reject) => {
                const i = new Image();
                i.onload = () => resolve(i);
                i.onerror = () => reject(new Error('SVG load failed'));
                i.src = url;
            });
            const canvas = document.createElement('canvas');
            canvas.width  = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            const ctx = canvas.getContext('2d');
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0, width, height);
            return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    async function copyBlobToClipboard(blob) {
        if (!blob) return false;
        try {
            if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
                await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

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
        const toggleBtn  = makeButton(ICONS.eyeOpen, 'Toggle visibility');
        const refreshBtn = makeButton(ICONS.refresh,  'Refresh prices');
        const copyBtn    = makeButton(ICONS.copy,     'Copy info as image');
        refreshBtn.style.marginLeft = '6px';
        copyBtn.style.marginLeft    = '6px';

        const headerBar = document.createElement('div');
        Object.assign(headerBar.style, { display: 'flex', alignItems: 'center' });
        headerBar.append(toggleBtn, refreshBtn, copyBtn);

        const content = document.createElement('div');
        content.className = 'widget-content';
        content.style.marginTop = '4px';

        // ── Render content ──────────────────────────────────────────────────

        const renderContent = (p) => {
            const numericValues = COUNTRIES.map(c => parseFloat(p[c.key])).filter(v => !isNaN(v));
            const minVal = numericValues.length ? Math.min(...numericValues) : 0;

            // Single-column list — each row is fully inline (white-space:nowrap)
            // so no price/percentage ever wraps or gets clipped. The widget
            // auto-sizes to the widest row via width:max-content on the shell.
            const rowsHTML = COUNTRIES.map((c) => {
                const val = parseFloat(p[c.key]);
                let pctHtml = '';
                if (!isNaN(val) && minVal > 0 && c.label !== 'World') {
                    const diff = ((val - minVal) / minVal) * 100;
                    pctHtml = `<span style="color:${getColorForPct(diff)};font-size:11px;margin-left:6px;">(+${diff.toFixed(2)}%)</span>`;
                }
                return `
                    <div style="display:flex;align-items:center;white-space:nowrap;">
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
                <div style="display:flex;flex-direction:column;gap:3px;">${rowsHTML}</div>`;
        };

        // ── Visibility state ────────────────────────────────────────────────

        const savedState = localStorage.getItem(WIDGET_VISIBILITY_KEY);
        const isVisible  = savedState === null || savedState === 'visible';

        const applyVisibility = (visible) => {
            content.style.display    = visible ? 'block'       : 'none';
            toggleBtn.innerHTML      = visible ? ICONS.eyeOpen : ICONS.eyeSlash;
            copyBtn.style.display    = visible ? 'flex'        : 'none';
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

        // ── Copy as image ───────────────────────────────────────────────────

        const buildPayload = (p) => ({
            product:     { title: mainTitle, subtitle: subtitle || null },
            pageUrl:     location.href,
            prices:      { ...p },
            generatedAt: new Date().toISOString(),
        });

        const escHtml = (s) => String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        copyBtn.onclick = async () => {
            copyBtn.disabled = true;
            try {
                const rows = await waitForRows();
                const payload = buildPayload(extractPrices(rows));
                const now = new Date(payload.generatedAt).toLocaleString();

                const rowsHtml = COUNTRIES.map(c => {
                    const v = payload.prices[c.key] ?? 'N/A';
                    const imgOrEmoji = c.flagCode
                        ? `<img src="https://flagcdn.com/16x12/${c.flagCode}.png" width="16" height="12">`
                        : c.flagEmoji;
                    return `
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;">
                          <div style="display:flex;align-items:center;gap:6px;font-size:14px;">
                            <span style="font-size:16px;">${imgOrEmoji}</span>
                            <span style="color:${c.color};font-weight:600;">${v}${SYMBOL_MONEY}</span>
                          </div>
                          <div style="font-size:12px;color:#888;">${c.label}</div>
                        </div>`;
                }).join('');

                const htmlFragment = `
                    <div style="background:#1e1e1e;color:#f0f0f0;padding:12px;border-radius:8px;border:1px solid #444;width:320px;">
                      <div style="font-size:16px;font-weight:700;color:#ddd;margin-bottom:6px;">${escHtml(payload.product.title)}</div>
                      ${payload.product.subtitle ? `<div style="font-size:12px;color:#bbb;margin-bottom:8px;">${escHtml(payload.product.subtitle)}</div>` : ''}
                      <div style="padding:6px 0;border-top:1px solid rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.03);margin-bottom:8px;">${rowsHtml}</div>
                      <div style="font-size:11px;color:#999;padding-top:8px;">
                        <div style="margin-bottom:6px;">${now}</div>
                        <div style="word-break:break-word;">${location.href}</div>
                      </div>
                    </div>`;

                const probe = document.createElement('div');
                Object.assign(probe.style, { position: 'fixed', left: '-9999px', top: '-9999px' });
                probe.innerHTML = htmlFragment;
                document.body.appendChild(probe);
                const height = Math.max(60, probe.getBoundingClientRect().height);
                probe.remove();

                const blob = await copyHtmlToPngBlob(htmlFragment, 320, height, 2);
                const ok   = await copyBlobToClipboard(blob);
                copyBtn.textContent = ok ? ICONS.ok : ICONS.ko;
                if (!ok) await copyTextToClipboard(JSON.stringify(payload));

            } catch {
                try { await copyTextToClipboard(JSON.stringify(buildPayload(prices))); } catch { }
                copyBtn.textContent = ICONS.ko;
            } finally {
                setTimeout(() => { copyBtn.textContent = ICONS.copy; copyBtn.disabled = false; }, 1200);
            }
        };

        // ── Positioning ─────────────────────────────────────────────────────

        widget.append(headerBar, content);
        document.body.appendChild(widget);

        const updatePosition = () => {
            const dd = findPriceTrendDd();
            if (!dd) return;
            const rect = dd.getBoundingClientRect();
            widget.style.top  = `${window.scrollY + rect.top  - WINDOW_HEIGHT_OFFSET}px`;
            widget.style.left = `${window.scrollX + rect.right - WINDOW_WIDTH_OFFSET}px`;
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition);
        window.addEventListener('resize', updatePosition);
    };

    // ─── Entry point ──────────────────────────────────────────────────────────

    waitForRows().then(rows => createFloatingWidget(extractPrices(rows)));
})();
