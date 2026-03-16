// -*- coding: utf-8 -*-
// ------------------------------------------------------------------------
//+ Authors: 	Ran#
//+ Created:	2024/11/26 11:39:41.000000
//+ Revised:	2026/03/16 10:22:52.231431
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

(function () {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    if (params.get('sellerReputation') !== '3' || params.get('language') !== '1') {
        params.set('sellerReputation', '3');
        params.set('language', '1');
        window.location.search = params.toString();
    }
})();