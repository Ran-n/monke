// -*- coding: utf-8 -*-
// ------------------------------------------------------------------------
//+ Authors: 	Ran#
//+ Created:	2026/02/28 16:42:15.000000
//+ Revised:	2026/03/16 10:22:52.231431
// ------------------------------------------------------------------------

// ==UserScript==
// @name         Hover Copy Image with OK
// @namespace    Violentmonkey Scripts
// @version      1.0.0
// @description  Hover over images to copy them to clipboard with OK feedback
// @author       Ran# <ran.hash@proton.me>
// @match        *://*/*
// @icon
// @grant        GM_addStyle
// @license      GPLv3
// @homepageURL  https://github.com/Ran-n/monke/blob/main/src/hover_img_copy.js
// @downloadURL  https://raw.githubusercontent.com/Ran-n/monke/main/src/hover_img_copy.js
// @updateURL    https://raw.githubusercontent.com/Ran-n/monke/main/src/hover_img_copy.js
// ==/UserScript==

(function () {
    'use strict';

    GM_addStyle(`
    .ic-wrap { position: relative; display: inline-block; }
    .ic-btn {
      position: absolute; top: 6px; right: 6px;
      display: none; align-items: center; justify-content: center;
      width: 28px; height: 28px;
      background: #fff; border: 1px solid #ccc; border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      cursor: pointer; z-index: 9999;
      transition: transform 120ms ease;
    }
    .ic-wrap:hover .ic-btn { display: flex; }
    .ic-btn:active { transform: scale(0.85); }
    .ic-btn svg { width: 16px; height: 16px; fill: #333; }
    .ic-ok {
      position: absolute; top: 6px; right: 40px;
      display: none; padding: 2px 8px;
      background: #28a745; color: #fff;
      border-radius: 6px; font-size: 12px; font-weight: 600;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      z-index: 10000;
    }
    .ic-ok.show { display: inline-block; }
  `);

    const ICON = `
    <svg viewBox="0 0 24 24">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14
               c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
    </svg>
  `;

    function wrapImage(img) {
        if (img.closest('.ic-wrap')) return;
        if (!img.parentNode) return;

        const wrap = document.createElement('span');
        wrap.className = 'ic-wrap';
        img.parentNode.insertBefore(wrap, img);
        wrap.appendChild(img);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ic-btn';
        btn.innerHTML = ICON;
        wrap.appendChild(btn);

        const ok = document.createElement('div');
        ok.className = 'ic-ok';
        ok.textContent = 'OK';
        wrap.appendChild(ok);

        btn.addEventListener('click', async () => {
            try {
                const blob = await imageToBlob(img);
                const success = await copyBlob(blob);
                if (success) {
                    ok.classList.add('show');
                    setTimeout(() => ok.classList.remove('show'), 1200);
                } else {
                    btn.style.background = '#f8d7da';
                    setTimeout(() => (btn.style.background = '#fff'), 1000);
                }
            } catch {
                btn.style.background = '#f8d7da';
                setTimeout(() => (btn.style.background = '#fff'), 1000);
            }
        });
    }

    function imageToBlob(img) {
        return new Promise((resolve, reject) => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            const ctx = c.getContext('2d');
            try {
                ctx.drawImage(img, 0, 0);
                c.toBlob(b => b ? resolve(b) : reject(), 'image/png');
            } catch (e) {
                reject(e);
            }
        });
    }

    async function copyBlob(blob) {
        // Modern API
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
            try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                return true;
            } catch {
                // fall through
            }
        }
        // Fallback: copy data URL as text (works in Firefox, but pastes as text in some apps)
        try {
            const dataUrl = await blobToDataURL(blob);
            await navigator.clipboard.writeText(dataUrl);
            return true;
        } catch {
            return false;
        }
    }

    function blobToDataURL(blob) {
        return new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.readAsDataURL(blob);
        });
    }

    const observer = new MutationObserver(() => {
        document.querySelectorAll('img').forEach(wrapImage);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('img').forEach(wrapImage);
})();
