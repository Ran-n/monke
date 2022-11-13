// ==UserScript==
// @name        2 ProxiTok Pls
// @namespace   Violentmonkey Scripts
// @match       https://vm.tiktok.com/*
// @match       https://www.tiktok.com/*
// @match       https://proxitok.pabloferreiro.es/*
// @grant       none
// @version     1.1
// @author      Ran# <ran-n@tutanota.com>
// @description 14/9/2022, 00:06:38 AM
// @homepageURL https://github.com/Ran-n/monke/blob/main/src/2_ProxiTok_Pls.js
// @downloadURL https://raw.githubusercontent.com/Ran-n/monke/main/src/2_ProxiTok_Pls.js
// ==/UserScript==

var cachos_lig = window.location.href.split('?')[0].split('/')
window.location.href = `https://proxitok.pabloferreiro.es/@placeholder/video/${cachos_lig[cachos_lig.length - 1]}`
