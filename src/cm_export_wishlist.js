// -*- coding: utf-8 -*-
// ------------------------------------------------------------------------
//+ Authors: 	Ran#
//+ Created:	2025/05/20 08:17:44.000000
//+ Revised:	2026/03/16 10:22:52.231431
// ------------------------------------------------------------------------

// ==UserScript==
// @name         Cardmarket export wants / wishlist
// @namespace    Violentmonkey Scripts
// @version      1.1
// @description  Exports CardMarket wishlist/wants list to clipboard as formatted text
// @author       Ran# <ran.hash@proton.me>
// @match        https://www.cardmarket.com/*/*/Wants/*
// @exclude      https://www.cardmarket.com/*/*/Wants/*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cardmarket.com
// @grant        GM_setClipboard
// @license      GPLv3
// @homepageURL  https://github.com/Ran-n/monke/blob/main/src/cm_export_wishlist.js
// @downloadURL  https://raw.githubusercontent.com/Ran-n/monke/main/src/cm_export_wishlist.js
// @updateURL    https://raw.githubusercontent.com/Ran-n/monke/main/src/cm_export_wishlist.js
// ==/UserScript==

(function () {
    'use strict';

    const button = document.createElement('button');
    button.textContent = 'Export';
    button.classList.add('btn', 'btn-primary');
    button.style.marginLeft = '0.75rem';
    button.addEventListener('click', () => {
        const rows = [...document.querySelectorAll('#WantsListTable > .table td.name')].map(node => {
            const amount    = node.closest('tr').querySelector('.amount').textContent;
            const expansion = node.closest('tr').querySelector('.expansion').textContent.split('\n')[0];
            const name      = node.textContent;
            return `[${expansion}] ${amount} ${name}`;
        });
        GM_setClipboard(rows.join('\n'), 'text', () => alert('Cards copied to clipboard'));
    });

    document.querySelector('[href*="AddDeckList"]').insertAdjacentElement('afterend', button);

})();