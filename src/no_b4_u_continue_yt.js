// -*- coding: utf-8 -*-
// ------------------------------------------------------------------------
//+ Authors: 	Ran#
//+ Created:	2022/02/10 22:25:22.000000
//+ Revised:	2026/03/16 10:22:52.231431
// ------------------------------------------------------------------------

// ==UserScript==
// @name         No "Before you continue to Youtube"
// @namespace    Violentmonkey Scripts
// @version      1.0
// @description  Removes the "Before you continue to YouTube" consent dialog
// @author       Ran# <ran.hash@proton.me>
// @match        https://www.youtube.com/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// @license      GPLv3
// @homepageURL  https://github.com/Ran-n/monke/blob/main/src/no_b4_u_continue_yt.js
// @downloadURL  https://raw.githubusercontent.com/Ran-n/monke/main/src/no_b4_u_continue_yt.js
// @updateURL    https://raw.githubusercontent.com/Ran-n/monke/main/src/no_b4_u_continue_yt.js
// ==/UserScript==

(function () {
    'use strict';

    document.getElementById('dialog')?.remove();
})();
