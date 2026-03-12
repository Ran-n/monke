// -*- coding: utf-8 -*-
// ------------------------------------------------------------------------
//+ Authors: 	Ran#
//+ Created:	2022/09/11 11:26:12.000000
//+ Revised:	2026/03/12 09:05:36.431228
// ------------------------------------------------------------------------

// ==UserScript==
// @name         2 Nitter Pls
// @namespace    Violentmonkey Scripts
// @version      1.1.1
// @description  Redirects Twitter links to Nitter for privacy
// @author       Ran# <ran.hash@proton.me>
// @match        https://twitter.com/*
// @match        https://nitter.*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitter.com
// @grant        none
// @license      GPLv3
// @homepageURL  https://github.com/Ran-n/monke/blob/main/src/2_Nitter_Pls.js
// @downloadURL  https://raw.githubusercontent.com/Ran-n/monke/main/src/2_Nitter_Pls.js
// @updateURL    https://raw.githubusercontent.com/Ran-n/monke/main/src/2_Nitter_Pls.js
// ==/UserScript==

if (window.location.href.includes('twitter.com')) {
    window.location.replace(window.location.href.replace('twitter.com', 'nitter.net'));
}
