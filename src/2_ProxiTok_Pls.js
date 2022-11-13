// ==UserScript==
// @name        2 ProxiTok Pls
// @namespace   Violentmonkey Scripts
// @match       https://vm.tiktok.com/*
// @match       https://www.tiktok.com/*
// @match       https://proxitok.pabloferreiro.es/*
// @grant       none
// @version     1.0
// @author      Ran# <ran-n@tutanota.com>
// @description 14/9/2022, 00:06:38 AM
// @homepageURL https://github.com/Ran-n/monke/blob/main/src/2_ProxiTok_Pls.js
// @downloadURL https://raw.githubusercontent.com/Ran-n/monke/main/src/2_ProxiTok_Pls.js
// ==/UserScript==

if (window.location.href.includes('www.tiktok.com')) {
    window.location.replace(window.location.href.replace('www.tiktok.com', 'https://proxitok.pabloferreiro.es/@placeholder/video/'));
} else if (window.location.href.includes('vm.tiktok.com')) {
    window.location.replace(window.location.href.replace('vm.tiktok.com', 'https://proxitok.pabloferreiro.es/@placeholder/video/'));
}
