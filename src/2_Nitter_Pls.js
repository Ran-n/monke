// ==UserScript==
// @name        2 Nitter Pls
// @namespace   Violentmonkey Scripts
// @match       https://twitter.com/*
// @match       https://nitter.*/*
// @grant       none
// @version     1.1.1
// @author      Ran# <ran-n@tutanota.com>
// @description 11/9/2022, 11:26:12 AM
// @homepageURL https://github.com/Ran-n/monke/blob/main/src/2_Nitter_Pls.js
// @downloadURL https://raw.githubusercontent.com/Ran-n/monke/main/src/2_Nitter_Pls.js
// ==/UserScript==

if (window.location.href.includes('twitter.com')) {
    window.location.replace(window.location.href.replace('twitter.com', 'nitter.net'));
}
