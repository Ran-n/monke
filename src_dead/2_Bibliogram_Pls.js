// -*- coding: utf-8 -*-
// ------------------------------------------------------------------------
//+ Authors: 	Ran#
//+ Created:	2022/09/13 23:59:50.000000
//+ Revised:	2026/03/12 09:05:36.431228
// ------------------------------------------------------------------------

// ==UserScript==
// @name         2 Bibliogram Pls
// @namespace    Violentmonkey Scripts
// @version      1.0.2
// @description  Redirects Instagram links to Bibliogram (defunct)
// @author       Ran# <ran.hash@proton.me>
// @match        https://www.instagram.com/*
// @match        https://instagram.com/*
// @match        https://bibliogram.org/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=instagram.com
// @grant        none
// @license      GPLv3
// @homepageURL  https://github.com/Ran-n/monke/blob/main/src_dead/2_Bibliogram_Pls.js
// @downloadURL  https://raw.githubusercontent.com/Ran-n/monke/main/src_dead/2_Bibliogram_Pls.js
// @updateURL    https://raw.githubusercontent.com/Ran-n/monke/main/src_dead/2_Bibliogram_Pls.js
// ==/UserScript==

if (window.location.href.includes('www.instagram.com')) {
    window.location.replace(window.location.href.replace('www.instagram.com', 'bibliogram.org'));
} else if (window.location.href.includes('instagram.com')) {
    window.location.replace(window.location.href.replace('instagram.com', 'bibliogram.org'));
}
