// -*- coding: utf-8 -*-
// ------------------------------------------------------------------------
//+ Authors: 	Ran#
//+ Created:	2022/09/14 00:06:38.000000
//+ Revised:	2026/03/12 09:05:36.431228
// ------------------------------------------------------------------------

// ==UserScript==
// @name         2 ProxiTok Pls
// @namespace    Violentmonkey Scripts
// @version      1.2
// @description  Redirects TikTok links to ProxiTok (defunct)
// @author       Ran# <ran.hash@proton.me>
// @match        https://vm.tiktok.com/*
// @match        https://www.tiktok.com/*
// @match        https://proxitok.pabloferreiro.es/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tiktok.com
// @grant        none
// @license      GPLv3
// @homepageURL  https://github.com/Ran-n/monke/blob/main/src_dead/2_ProxiTok_Pls.js
// @downloadURL  https://raw.githubusercontent.com/Ran-n/monke/main/src_dead/2_ProxiTok_Pls.js
// @updateURL    https://raw.githubusercontent.com/Ran-n/monke/main/src_dead/2_ProxiTok_Pls.js
// ==/UserScript==

if (window.location.href.includes('tiktok')) {
    var cachos_lig = window.location.href.split('?')[0].split('/')
    window.location.href = `https://proxitok.pabloferreiro.es/${cachos_lig.slice(cachos_lig.length-3, cachos_lig.length).join('/')}/`
}
