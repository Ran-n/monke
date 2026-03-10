// ==UserScript==
// @name         CardMarket PriceBox
// @namespace    Violentmonkey Scripts
// @version      1.2.0
// @description  26/11/2025, 11:03:22 AM
// @description  Floating draggable widget showing min price from World and Spain, always aligned with Price Trend row but placed in the empty right margin area (night mode, dual-language Spain detection, toggleable)
// @author       Ran# <ran-n@tutanota.com>
// @match        https://www.cardmarket.com/es/*/Products/Singles/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cardmarket.com
// @grant        none
// @license      GPLv3
// @homepageURL  https://github.com/Ran-n/monke/blob/main/src/cardmarket/cm_pricebox.js
// @downloadURL  https://raw.githubusercontent.com/Ran-n/monke/main/src/cardmarket/cm_pricebox.js
// @updateURL    https://raw.githubusercontent.com/Ran-n/monke/main/src/cardmarket/cm_pricebox.js
// ==/UserScript==

// TODO: Show item count too global and perWorld? Would have to load all the elements

(function () {
    'use strict';

    const SYMBOL_MONEY = '€';
    const WINDOW_SCALE = 0.9;
    const WINDOW_HEIGHT_OFFSET = 57;
    const WINDOW_WIDTH_OFFSET = 165;
    const WIDGET_VISIBILITY_STORAGE_VAR = "OPTCG_CM_PRICEBOX_VISIBILITY";

    const COUNTRIES = [
        { flag: "🌍", key: "minWorld", color: "#90ee90", label: "World", labelES: "World" },
        { flag: "🇪🇸", key: "minSpain", color: "#87cefa", label: "Spain", labelES: "España" },
        { flag: "🇩🇪", key: "minGermany", color: "#87cefa", label: "Germany", labelES: "Alemania" },
        { flag: "🇵🇹", key: "minPortugal", color: "#87cefa", label: "Portugal", labelES: "Portugal" },
        { flag: "🇫🇷", key: "minFrance", color: "#87cefa", label: "France", labelES: "Francia" },
        { flag: "🇮🇹", key: "minItaly", color: "#87cefa", label: "Italy", labelES: "Italia" }
    ];

    const ICONS = {
        refresh: "↻",
        refreshing: "⟳",
        copy: "📷",
        ok: "✔️",
        ko: "❌",
        eyeOpen: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#eee" viewBox="0 0 24 24"><path d="M12 5c-7.633 0-11 7-11 7s3.367 7 11 7 11-7 11-7-3.367-7-11-7zm0 12c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5zm0-8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"/></svg>`,
        eyeSlash: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#eee" viewBox="0 0 24 24"><path d="M12 5c-7.633 0-11 7-11 7s3.367 7 11 7 11-7 11-7-3.367-7-11-7zm0 12c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5zm0-8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"/><line x1="4" y1="20" x2="20" y2="4" stroke="#eee" stroke-width="2"/></svg>`
    };

    function getUserNCredit() {
        const container = document.querySelector('#totalCreditMainNav')?.parentElement;
        const name = container?.querySelector('.d-none.d-lg-block')?.textContent.trim();
        const credit = container?.querySelector('#totalCreditMainNav')?.textContent.trim();
        return { name, credit };
    }

    function getSellerName(rowElement) {
        if (!rowElement) return null;
        const sellerLink = rowElement.querySelector('.seller-name a');
        return sellerLink?.textContent.trim() || null;
    }

    const waitForRows = () => new Promise(resolve => {
        const check = () => {
            const nodeList = document.querySelectorAll('.article-row');
            if (nodeList.length > 0) {
                const rows = Array.from(nodeList);
                const { name: ownerName } = getUserNCredit();
                const firstRowName = getSellerName(rows[0]);

                if (firstRowName === ownerName) {
                    rows.splice(0, 1); // remove from array only, DOM remains unchanged
                }

                setTimeout(() => resolve(rows), 600);
            } else {
                setTimeout(check, 400);
            }
        };

        check();
    });

    const _extractPrice = (row) => {
        const span = row.querySelector('.price-container span');
        if (!span) return 'N/A';
        const raw = span.textContent.trim().replace(',', '.').replace(SYMBOL_MONEY, '');
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
        ...extractMinimumPricesByCountry(rows)
    });

    const getProductNameParts = () => {
        const h1 = document.querySelector('h1');
        const main = h1?.childNodes[0]?.textContent?.trim() || 'Product';
        const sub = h1?.querySelector('span.h4.text-muted')?.textContent?.trim() || '';
        return { mainTitle: main, subtitle: sub };
    };

    const findPriceTrendDd = () => {
        const dl = document.querySelector('dl.labeled');
        const dts = Array.from(dl?.querySelectorAll('dt') || []);
        const dds = Array.from(dl?.querySelectorAll('dd') || []);
        for (let i = 0; i < dts.length; i++) {
            const label = dts[i].textContent.trim();
            if (label === 'Price Trend' || label === 'Tendencia de precio') return dds[i];
        }
        return null;
    };

    const styleButton = (btn) => {
        Object.assign(btn.style, {
            background: '#333',
            color: '#eee',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '0',
            cursor: 'pointer',
            fontSize: '14px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });
    };

    const isLoadMoreActive = () => {
        const btn = document.querySelector('#loadMoreButton');
        if (!btn) return false;
        const style = window.getComputedStyle(btn);
        const hidden = style.display === 'none' || style.visibility === 'hidden' || btn.offsetParent === null;
        const disabled = btn.disabled || btn.getAttribute('disabled') !== null || btn.classList.contains('disabled');
        return !(hidden || disabled);
    };

    const createFloatingWidget = (prices) => {
        const { mainTitle, subtitle } = getProductNameParts();

        const widget = document.createElement('div');
        Object.assign(widget.style, {
            position: 'absolute',
            zIndex: '9999',
            background: '#1e1e1e',
            border: '1px solid #444',
            borderRadius: '6px',
            padding: '8px 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            fontSize: '13px',
            lineHeight: '1.4',
            fontFamily: 'Arial, sans-serif',
            color: '#f0f0f0',
            maxWidth: '180px',
            wordWrap: 'break-word',
            transform: `scale(${WINDOW_SCALE})`,
            transformOrigin: 'top left'
        });

        const toggleButton = document.createElement('button');
        toggleButton.innerHTML = ICONS.eyeOpen;
        styleButton(toggleButton);

        const refreshButton = document.createElement('button');
        refreshButton.innerHTML = ICONS.refresh;
        refreshButton.title = "Refresh prices";
        styleButton(refreshButton);
        refreshButton.style.marginLeft = '6px';

        // New: Copy Info button (renders widget info as image and copies to clipboard)
        const copyInfoButton = document.createElement('button');
        copyInfoButton.textContent = ICONS.copy;
        copyInfoButton.title = 'Copy info as image';
        styleButton(copyInfoButton);
        copyInfoButton.style.marginLeft = '6px';
        copyInfoButton.style.width = '28px';
        copyInfoButton.style.height = '28px';
        copyInfoButton.style.fontWeight = '700';
        copyInfoButton.style.fontSize = '12px';
        copyInfoButton.style.lineHeight = '1';
        copyInfoButton.style.display = 'inline-flex';
        copyInfoButton.style.alignItems = 'center';
        copyInfoButton.style.justifyContent = 'center';

        const headerBar = document.createElement('div');
        headerBar.style.display = 'flex';
        headerBar.style.alignItems = 'center';
        headerBar.appendChild(toggleButton);
        headerBar.appendChild(refreshButton);
        headerBar.appendChild(copyInfoButton);

        const content = document.createElement('div');
        content.className = 'widget-content';
        content.style.marginTop = '4px';

        // Clipboard text helper (reuse/ensure present)
        async function copyTextToClipboard(text) {
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                    return true;
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    ta.setAttribute('readonly', '');
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    const ok = document.execCommand('copy');
                    ta.remove();
                    return !!ok;
                }
            } catch (e) {
                return false;
            }
        }

        // Helper: convert HTML string to PNG Blob by rendering it inside an SVG foreignObject then drawing to canvas
        async function copyHtmlToPngBlob(html, width, height, scale = 2) {
            const cssReset = `
        body,html { margin:0; padding:0; }
        * { box-sizing: border-box; font-family: Arial, sans-serif; }
      `;
            const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width)}" height="${Math.round(height)}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              <style>${cssReset}</style>
              ${html}
            </div>
          </foreignObject>
        </svg>
      `;
            const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            try {
                const img = await new Promise((resolve, reject) => {
                    const i = new Image();
                    i.onload = () => resolve(i);
                    i.onerror = () => reject(new Error('SVG to Image load failed'));
                    i.src = url;
                });
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(width * scale);
                canvas.height = Math.round(height * scale);
                const ctx = canvas.getContext('2d');
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0, width, height);
                URL.revokeObjectURL(url);
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                return blob;
            } finally {
                URL.revokeObjectURL(url);
            }
        }

        // Helper: write blob to clipboard if supported
        async function copyBlobToClipboard(blob) {
            if (!blob) return false;
            try {
                if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
                    const item = new ClipboardItem({ [blob.type]: blob });
                    await navigator.clipboard.write([item]);
                    return true;
                }
                return false;
            } catch (e) {
                return false;
            }
        }

        // Build payload from current rendered content and prices object
        function buildWidgetInfo(pObj) {
            const now = new Date().toISOString();
            const payload = {
                product: {
                    title: mainTitle,
                    subtitle: subtitle || null
                },
                pageUrl: location.href,
                prices: Object.assign({}, pObj),
                generatedAt: now
            };
            return payload;
        }

        const savedState = localStorage.getItem(WIDGET_VISIBILITY_STORAGE_VAR);
        const isVisible = savedState === null || savedState === 'visible';

        content.style.display = isVisible ? 'block' : 'none';
        toggleButton.innerHTML = isVisible ? ICONS.eyeOpen : ICONS.eyeSlash;

        if (refreshButton.dataset.permaHidden !== "true") {
            refreshButton.style.display = isVisible ? 'inline-flex' : 'none';
        }

        copyInfoButton.style.display = isVisible ? 'inline-flex' : 'none';


        const renderContent = (p) => {
            const numericValues = COUNTRIES.map(c => parseFloat(p[c.key])).filter(v => !isNaN(v));
            const minVal = numericValues.length ? Math.min(...numericValues) : 0;

            const getColorForPct = (pct) => {
                if (pct <= 0) return "#aaa";
                const clamped = Math.min(pct, 200);
                const stops = [
                    { pct: 0, r: 170, g: 170, b: 170 },
                    { pct: 100, r: 255, g: 165, b: 0 },
                    { pct: 200, r: 255, g: 0, b: 0 }
                ];
                let start = stops[0], end = stops[1];
                if (clamped > 100) { start = stops[1]; end = stops[2]; }
                const t = (clamped - start.pct) / (end.pct - start.pct);
                const r = Math.round(start.r + (end.r - start.r) * t);
                const g = Math.round(start.g + (end.g - start.g) * t);
                const b = Math.round(start.b + (end.b - start.b) * t);
                return `rgb(${r},${g},${b})`;
            };

            const gridHTML = COUNTRIES.map((c) => {
                const val = parseFloat(p[c.key]);
                let pctText = '';
                let pctColor = '#aaa';
                if (!isNaN(val) && minVal > 0 && c.label !== "World") {
                    const diff = ((val - minVal) / minVal) * 100;
                    pctText = `+${diff.toFixed(2)}%`;
                    pctColor = getColorForPct(diff);
                }
                return `
          <div style="display:flex;flex-direction:column;align-items:flex-start;">
            <span style="display:inline-flex;align-items:center;gap:4px;color:#888;">
              ${c.flag} <span style="color:${c.color}">${p[c.key]}</span><span>${SYMBOL_MONEY}</span>
            </span>
            ${pctText ? `<span style="color:${pctColor};font-size:12px;margin-left:20px;">(${pctText})</span>` : ''}
          </div>
        `;
            }).join("");

            content.innerHTML = `
        <div style="margin-bottom: 6px;">
          <div><strong style="color:#ccc">${mainTitle}</strong></div>
          ${subtitle ? `<div style="color:#777; font-size:12px; margin-top:2px;">${subtitle}</div>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${gridHTML}
        </div>
      `;
        };

        renderContent(prices);

        toggleButton.onclick = () => {
            const isHidden = content.style.display === 'none';
            const newState = isHidden ? 'visible' : 'hidden';

            content.style.display = isHidden ? 'block' : 'none';
            toggleButton.innerHTML = isHidden ? ICONS.eyeOpen : ICONS.eyeSlash;

            if (refreshButton.dataset.permaHidden !== "true") {
                refreshButton.style.display = isHidden ? 'inline-flex' : 'none';
            }

            copyInfoButton.style.display = isHidden ? 'inline-flex' : 'none';

            // Save state to localStorage
            localStorage.setItem(WIDGET_VISIBILITY_STORAGE_VAR, newState);
        };



        if (!isLoadMoreActive()) {
            refreshButton.style.display = 'none';
            refreshButton.dataset.permaHidden = "true";
        }

        refreshButton.onclick = async () => {
            if (!isLoadMoreActive()) {
                refreshButton.style.display = 'none';
                refreshButton.dataset.permaHidden = "true";
                return;
            }

            refreshButton.disabled = true;
            refreshButton.textContent = ICONS.refreshing;
            refreshButton.style.opacity = '0.6';

            const rows = await waitForRows();
            const newPrices = extractPrices(rows);
            renderContent(newPrices);

            const loadMore = document.querySelector('#loadMoreButton');
            if (loadMore) loadMore.click();

            refreshButton.disabled = false;
            refreshButton.textContent = ICONS.refresh;
            refreshButton.style.opacity = '1';

            setTimeout(() => {
                if (!isLoadMoreActive()) {
                    refreshButton.style.display = 'none';
                    refreshButton.dataset.permaHidden = "true";
                }
            }, 250);
        };

        // Copy Info handler: render widget snapshot as PNG and copy to clipboard, fallback to JSON text
        copyInfoButton.onclick = async () => {
            copyInfoButton.disabled = true;
            try {
                const rows = await waitForRows();
                const latestPrices = extractPrices(rows);
                const payload = buildWidgetInfo(latestPrices);

                const titleEsc = String(payload.product.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const subtitleEsc = payload.product.subtitle ? String(payload.product.subtitle).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
                const now = new Date(payload.generatedAt).toLocaleString();

                const rowsHtml = COUNTRIES.map(c => {
                    const v = payload.prices[c.key];
                    const display = (v === undefined || v === null) ? 'N/A' : v;
                    return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;">
              <div style="display:flex;align-items:center;gap:6px;font-size:14px;">
                <span style="font-size:16px;">${c.flag}</span>
                <span style="color:${c.color};font-weight:600;">${display}${SYMBOL_MONEY}</span>
              </div>
              <div style="font-size:12px;color:#888;">${c.label}</div>
            </div>
          `;
                }).join('');

                const htmlFragment = `
          <div style="background:#1e1e1e;color:#f0f0f0;padding:12px;border-radius:8px;border:1px solid #444;width:320px;">
            <div style="font-size:16px;font-weight:700;color:#ddd;margin-bottom:6px;">${titleEsc}</div>
            ${subtitleEsc ? `<div style="font-size:12px;color:#bbb;margin-bottom:8px;">${subtitleEsc}</div>` : ''}
            <div style="padding:6px 0;border-top:1px solid rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.03);margin-bottom:8px;">
              ${rowsHtml}
            </div>
            <div style="font-size:11px;color:#999;padding-top:8px;">
              <div style="margin-bottom:6px;">${now}</div>
              <div style="word-break:break-word;">${location.href}</div>
            </div>
          </div>
        `;

                const width = 320;
                const measure = document.createElement('div');
                measure.style.position = 'fixed';
                measure.style.left = '-9999px';
                measure.style.top = '-9999px';
                measure.innerHTML = htmlFragment;
                document.body.appendChild(measure);
                const height = Math.max(60, measure.getBoundingClientRect().height);
                measure.remove();

                const pngBlob = await copyHtmlToPngBlob(htmlFragment, width, height, 2);
                const ok = await copyBlobToClipboard(pngBlob);
                copyInfoButton.textContent = ok ? ICONS.ok : ICONS.ko;
                if (!ok) {
                    // fallback copy textual JSON
                    await copyTextToClipboard(JSON.stringify(payload));
                }
            } catch (err) {
                // fallback: copy textual JSON if image creation/writing failed
                try { await copyTextToClipboard(JSON.stringify(buildWidgetInfo(prices))); } catch (e) { }
                copyInfoButton.textContent = ICONS.ko;
            } finally {
                setTimeout(() => {
                    copyInfoButton.textContent = ICONS.copy;
                    copyInfoButton.disabled = false;
                }, 1200);
            }
        };

        widget.appendChild(headerBar);
        widget.appendChild(content);
        document.body.appendChild(widget);

        const updatePosition = () => {
            const trendDd = findPriceTrendDd();
            if (trendDd) {
                const rect = trendDd.getBoundingClientRect();
                widget.style.top = `${window.scrollY + rect.top - WINDOW_HEIGHT_OFFSET}px`;
                widget.style.left = `${window.scrollX + rect.right - WINDOW_WIDTH_OFFSET}px`;
            }
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition);
        window.addEventListener('resize', updatePosition);
    };

    waitForRows().then(rows => {
        const prices = extractPrices(rows);
        createFloatingWidget(prices);
    });
})();
