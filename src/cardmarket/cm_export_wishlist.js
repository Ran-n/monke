// ==UserScript==
// @name         Cardmarket export wants / wishlist
// @namespace    Violentmonkey Scripts
// @version      1.1
// @description  20/05/2025, 8:17:44 AM
// @author       Ran# <ran-n@tutanota.com>
// @match        https://www.cardmarket.com/*/*/Wants/*
// @exclude      https://www.cardmarket.com/*/*/Wants/*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cardmarket.com
// @grant        GM_setClipboard
// @license      GPLv3
// @homepageURL  https://github.com/Ran-n/monke/blob/main/src/cm_export_wishlist.js
// @downloadURL  https://github.com/Ran-n/monke/blob/main/src/cm_export_wishlist.js
// @updateURL    https://github.com/Ran-n/monke/blob/main/src/cm_export_wishlist.js
// ==/UserScript==

(function () {
    'use strict';

    const button = document.createElement('button')
    button.innerText = 'Export'
    button.classList.add('btn', 'btn-primary')
    button.style.marginLeft = '0.75rem'
    button.addEventListener('click', () => {
        const rows = [...document.querySelectorAll('#WantsListTable > .table td.name')].map(
            node => {
                const amount = node.closest('tr').querySelector('.amount').innerText
                const expansion = node.closest('tr').querySelector('.expansion').innerText.split('\n')[0]
                const name = node.innerText
                //if (name.match('\(V\.\\d\)')) {
                //    name = name.slice(0, -6) // remove (V.X) notation, usually incompatible
                //}
                return `[${expansion}] ${amount} ${name}`
            }
        )
        GM_setClipboard(rows.join('\n'), "text", () => alert('Cards copied to clipboard'))
    })

    document.querySelector('[href*="AddDeckList"]').insertAdjacentElement('afterend', button)

})();