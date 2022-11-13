// ==UserScript==
// @name        2 Bibliogram Pls
// @namespace   Violentmonkey Scripts
// @match       https://instagram.com/*
// @match       https://bibliogram.org/*
// @grant       none
// @version     1.0
// @author      Ran# <ran-n@tutanota.com>
// @description 13/9/2022, 23:59:50 AM
// @homepageURL https://github.com/Ran-n/monke/blob/main/src/2_Bibliogram_Pls.js
// @downloadURL https://raw.githubusercontent.com/Ran-n/monke/main/src/2_Bibliogram_Pls.js
// ==/UserScript==

if (window.location.href.includes('instagram.com')) {
    window.location.replace(window.location.href.replace('instagram.com', 'bibliogram.org'));
}
