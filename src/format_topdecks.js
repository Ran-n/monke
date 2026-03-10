// ==UserScript==
// @name        Format OPTCG TopDecks
// @namespace   Violentmonkey Scripts
// @version     2.0
// @description Reshape onepiecetopdecks.com deck pages to personal preference: kill sidebar, expand gallery, show card codes on images.
// @grant       none
// @author      Ran# <ran-n@tutanota.com>
// @match       https://onepiecetopdecks.com/deck-list/*
// @homepageURL https://github.com/Ran-n/monke/blob/main/src/format_topdecks.js
// @downloadURL https://raw.githubusercontent.com/Ran-n/monke/main/src/format_topdecks.js
// ==/UserScript==

(function () {
    'use strict';

    // --- Remove adblock banner ---
    function removeBanner() {
        document.querySelectorAll('div').forEach(el => {
            if (
                el.textContent.includes('ad or script blocking software is interfering') ||
                el.textContent.includes('Disable any ad or script blocking software')
            ) el.remove();
        });
    }

    // --- Copy button ---
    function createCopyButton(getText) {
        const btn = document.createElement('button');
        btn.textContent = 'Copy Decklist';
        Object.assign(btn.style, {
            padding: '6px 12px', fontSize: '14px', margin: '8px 0',
            backgroundColor: '#007BFF', color: 'white', border: 'none',
            borderRadius: '4px', cursor: 'pointer',
        });
        btn.addEventListener('click', () => {
            const text = getText();
            const flash = () => {
                const orig = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = orig; }, 1200);
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

    // --- Expand gallery into sidebar space via CSS ---
    function expandLayout() {
        const style = document.createElement('style');
        style.textContent = `
            #secondary, .widget-area, aside.sidebar, .sidebar-container { display: none !important; }
            #primary, .content-area, #content, main#main { width: 100% !important; max-width: 100% !important; float: none !important; }
            .site-content, #site-content, .content-area { padding-right: 0 !important; margin-right: 0 !important; }
            .entry-content { max-width: 100% !important; }
        `;
        document.head.appendChild(style);
    }

    // --- Parse "NxCODE" lines from text decklist into ordered array ---
    function parseDecklist(text) {
        return text.split('\n').reduce((acc, line) => {
            const m = line.match(/^(\d+)x([A-Z]{1,3}\d{2}-\d+)/i);
            if (m) acc.push({ count: +m[1], code: m[2].toUpperCase() });
            return acc;
        }, []);
    }

    // --- Replace "xN" label inside a column with new text ---
    function setColumnLabel(col, text) {
        // Look for a text node matching x-count pattern
        const walker = document.createTreeWalker(col, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            if (/^\s*x\d+\s*$/i.test(node.textContent)) {
                node.textContent = text;
                return;
            }
        }
        // Fall back: check element text
        for (const el of col.querySelectorAll('p, span, div, b, strong')) {
            if (/^\s*x\d+\s*$/i.test(el.textContent)) {
                el.textContent = text;
                return;
            }
        }
        // Append label if nothing found
        const label = document.createElement('div');
        label.textContent = text;
        label.style.cssText = 'font-size:11px;text-align:center;word-break:break-all;margin-top:2px';
        col.appendChild(label);
    }

    // ======= MAIN =======

    removeBanner();
    new MutationObserver(removeBanner).observe(document.body, { childList: true, subtree: true });

    expandLayout();

    // Strip page chrome
    document.getElementById('page')?.classList.remove('site');
    document.getElementById('masthead')?.classList.remove('site-header');
    document.querySelector('.post-thumbnail')?.remove();
    document.querySelector('.entry-header')?.remove();
    document.querySelector('.wp-block-code')?.remove();
    document.querySelector('.solid')?.remove();

    document.querySelectorAll('.innerblocks-wrap').forEach(el => {
        el.innerHTML = el.innerHTML
            .replace(/Deck Name:.*?<br>/, '')
            .replace(/The first card is the Leader.*?<b><br>/, '')
            .replace(/(<br>\s*){2,}/g, '<br>');
    });

    const gallery = document.getElementById('media-gallery');
    if (!gallery) return;

    // Split gallery HTML into images section and text decklist
    const html = gallery.innerHTML;
    const splitIdx = html.indexOf('Decklist in text:');
    const imagesHtml = splitIdx !== -1 ? html.slice(0, splitIdx) : html;
    const rawText = splitIdx !== -1 ? html.slice(splitIdx + 'Decklist in text:'.length) : '';

    const textBelow = rawText
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .split('\n').map(l => l.trim()).filter(Boolean)
        .join('\n').replace(/\n{2,}/g, '\n');

    const deckEntries = parseDecklist(textBelow);

    // Process columns
    const temp = document.createElement('div');
    temp.innerHTML = imagesHtml;
    const columns = Array.from(temp.querySelectorAll('.column'));

    columns.forEach((col, i) => {
        const entry = deckEntries[i];
        if (entry) setColumnLabel(col, `${entry.count}x${entry.code}`);
        col.style.cssText = 'flex:0 1 150px;margin:0';
    });

    // Rebuild gallery
    gallery.innerHTML = '';

    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
    columns.forEach(col => grid.appendChild(col));

    const getText = () => textBelow;
    gallery.appendChild(createCopyButton(getText));
    gallery.appendChild(grid);
    gallery.appendChild(createCopyButton(getText));

    const textDiv = document.createElement('div');
    textDiv.textContent = textBelow;
    textDiv.style.cssText = 'margin-top:8px;white-space:pre-wrap';
    gallery.appendChild(textDiv);

})();
