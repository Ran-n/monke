// -*- coding: utf-8 -*-
// ------------------------------------------------------------------------
//+ Authors: 	Ran#
//+ Created:	2024/11/26 11:03:22.000000
//+ Revised:	2026/03/12 09:05:36.431228
// ------------------------------------------------------------------------

// ==UserScript==
// @name         Cardmarket Always Pictures
// @namespace    Violentmonkey Scripts
// @version      1.0.0
// @description  Always switches CardMarket product search to gallery/picture mode
// @author       Ran# <ran.hash@proton.me>
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
