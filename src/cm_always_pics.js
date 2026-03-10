// ==UserScript==
// @name         Cardmarket Always Pictures
// @namespace    Violentmonkey Scripts
// @version      1.0.0
// @description  126/11/2024, 11:03:22 AM
// @author       Ran# <ran-n@tutanota.com>
// @match        https://www.cardmarket.com/*/*/Products/Search*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cardmarket.com
// @grant        none
// @license      GPLv3
// @homepageURL  https://github.com/Ran-n/monke/blob/main/src/cm_always_pics.js
// @downloadURL  https://raw.githubusercontent.com/Ran-n/monke/main/src/cm_always_pics.js
// @updateURL    https://raw.githubusercontent.com/Ran-n/monke/main/src/cm_always_pics.js
// ==/UserScript==

const link = new URLSearchParams(window.location.search);
if (link.get('mode') !== 'gallery') {
    link.set('mode', 'gallery');
    window.location.search = link.toString();
    console.log('DEBUG:: grided')
}
