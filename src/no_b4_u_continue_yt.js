// ==UserScript==
// @name        No "Before you continue to Youtube"
// @namespace   Violentmonkey Scripts
// @match       https://www.youtube.com/
// @grant       none
// @version     1.0
// @author      Ran# <ran-n@tutanota.com>
// @description 10/2/2022, 10:25:22 PM
// @homepageURL https://github.com/Ran-n/monke/blob/main/src/no_b4_u_continue_yt.js
// @downloadURL https://raw.githubusercontent.com/Ran-n/monke/main/src/no_b4_u_continue_yt.js
// ==/UserScript==

elto=document.getElementById("dialog");
elto.parentNode.removeChild(elto);
