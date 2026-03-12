// -*- coding: utf-8 -*-
// ------------------------------------------------------------------------
//+ Authors: 	Ran#
//+ Created:	2024/11/26 11:39:41.000000
//+ Revised:	2026/03/12 09:05:36.431228
// ------------------------------------------------------------------------

// ==UserScript==
// @name         Cardmarket Cool Filter
// @namespace    Violentmonkey Scripts
// @version      1.0.0
// @description  Auto-applies seller reputation and language filters on CardMarket singles pages
// @author       Ran# <ran.hash@proton.me>
// @match        https://www.cardmarket.com/*/*/Products/Singles/*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cardmarket.com
// @grant        none
// @license      GPLv3
// @homepageURL  https://github.com/Ran-n/monke/blob/main/src/cm_cool_filter.js
// @downloadURL  https://raw.githubusercontent.com/Ran-n/monke/main/src/cm_cool_filter.js
// @updateURL    https://raw.githubusercontent.com/Ran-n/monke/main/src/cm_cool_filter.js
// ==/UserScript==

// https://www.cardmarket.com/en/OnePiece/Products/Singles/Paramount-War/Nami-OP02-036-V1?sellerReputation=3&language=1
const link = new URLSearchParams(window.location.search);
if (link.get('sellerReputation') !== '3' || link.get('language') !== '1') {
    link.set('sellerReputation', '3');
    link.set('language', '1');
    window.location.search = link.toString();
    console.log('DEBUG:: filtered')
}